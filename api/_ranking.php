<?php
/* Ranking das cidades mais pesquisadas por todos os visitantes.
   Guarda só o nome da cidade e um contador, sem nenhum dado de quem pesquisou.

   Armazenamento (escolhido automaticamente pelas variáveis de ambiente):
   1. Upstash REST  — UPSTASH_REDIS_REST_URL/TOKEN ou KV_REST_API_URL/TOKEN
   2. Redis por TCP — REDIS_URL (redis:// ou rediss://), ex.: Redis Cloud da Vercel
   3. Arquivo local — data/ranking.json (XAMPP / php -S)
   As funções da Vercel não têm disco permanente, então lá só valem as opções 1 e 2.

   Qualquer falha aqui é ignorada: o ranking nunca pode derrubar a consulta do clima. */

const RANKING_CHAVE = "clima:ranking";

/* ---------- 1. Upstash: API REST ---------- */
function rankingUpstash(): ?array {
    $url   = getenv("UPSTASH_REDIS_REST_URL") ?: getenv("KV_REST_API_URL");
    $token = getenv("UPSTASH_REDIS_REST_TOKEN") ?: getenv("KV_REST_API_TOKEN");
    return $url && $token ? [rtrim($url, "/"), $token] : null;
}

function upstashComando(array $comando) {
    [$url, $token] = rankingUpstash();
    $contexto = stream_context_create(["http" => [
        "method"        => "POST",
        "header"        => "Authorization: Bearer $token\r\nContent-Type: application/json\r\n",
        "content"       => json_encode($comando),
        "timeout"       => 2,
        "ignore_errors" => true,
    ]]);
    $resposta = @file_get_contents($url, false, $contexto);
    $json = $resposta === false ? null : json_decode($resposta, true);
    return $json["result"] ?? null;
}

/* ---------- 2. Redis por TCP: protocolo nativo (RESP) ---------- */
function redisTcpComando(array $comando) {
    static $conexao = null;   // reaproveita a conexão dentro da mesma requisição

    if ($conexao === null) {
        $partes = parse_url(getenv("REDIS_URL"));
        $tls    = ($partes["scheme"] ?? "") === "rediss";
        $alvo   = ($tls ? "tls://" : "tcp://") . $partes["host"] . ":" . ($partes["port"] ?? 6379);

        $conexao = @stream_socket_client($alvo, $errno, $erro, 2);
        if (!$conexao) {
            $conexao = false;
            return null;
        }
        stream_set_timeout($conexao, 2);

        if (isset($partes["pass"])) {
            $usuario = $partes["user"] ?? "";
            $auth = $usuario !== ""
                ? ["AUTH", urldecode($usuario), urldecode($partes["pass"])]
                : ["AUTH", urldecode($partes["pass"])];
            redisEnviar($conexao, $auth);
        }
    }

    return $conexao ? redisEnviar($conexao, $comando) : null;
}

/* Envia um comando no formato RESP: *<n>\r\n$<tamanho>\r\n<argumento>\r\n... */
function redisEnviar($conexao, array $comando) {
    $mensagem = "*" . count($comando) . "\r\n";
    foreach ($comando as $argumento) {
        $argumento = (string)$argumento;
        $mensagem .= "$" . strlen($argumento) . "\r\n" . $argumento . "\r\n";
    }
    fwrite($conexao, $mensagem);
    return redisLer($conexao);
}

/* Lê uma resposta RESP: + texto, - erro, : inteiro, $ string, * lista */
function redisLer($conexao) {
    $linha = fgets($conexao);
    if ($linha === false) {
        return null;
    }
    $tipo  = $linha[0];
    $valor = substr($linha, 1, -2);

    switch ($tipo) {
        case "+":
            return $valor;
        case "-":
            throw new RuntimeException("Redis: " . $valor);
        case ":":
            return (int)$valor;
        case "$":
            if ($valor === "-1") {
                return null;
            }
            $tamanho = (int)$valor;
            $dado = "";
            while (strlen($dado) < $tamanho + 2) {   // + \r\n final
                $parte = fread($conexao, $tamanho + 2 - strlen($dado));
                if ($parte === false || $parte === "") {
                    return null;
                }
                $dado .= $parte;
            }
            return substr($dado, 0, $tamanho);
        case "*":
            if ($valor === "-1") {
                return null;
            }
            $itens = [];
            for ($i = 0, $n = (int)$valor; $i < $n; $i++) {
                $itens[] = redisLer($conexao);
            }
            return $itens;
    }
    return null;
}

/* ---------- Escolha do armazenamento ---------- */
function redisDisponivel(): bool {
    return rankingUpstash() !== null || (bool)getenv("REDIS_URL");
}

function redis(array $comando) {
    return rankingUpstash() ? upstashComando($comando) : redisTcpComando($comando);
}

/* ---------- 3. Arquivo local ---------- */
function arquivoRanking(): string {
    return __DIR__ . "/../data/ranking.json";
}

/* ---------- API do ranking ---------- */

/* Soma +1 para a cidade */
function rankingRegistrar(string $cidade): void {
    try {
        if (redisDisponivel()) {
            redis(["ZINCRBY", RANKING_CHAVE, "1", $cidade]);
            return;
        }
        if (getenv("VERCEL")) {
            return;   // sem Redis na Vercel: não há onde guardar de forma permanente
        }

        $arquivo = arquivoRanking();
        @mkdir(dirname($arquivo), 0777, true);
        $fp = @fopen($arquivo, "c+");
        if (!$fp) {
            return;
        }
        flock($fp, LOCK_EX);   // duas pesquisas ao mesmo tempo não se sobrescrevem
        $dados = json_decode(stream_get_contents($fp), true) ?: [];
        $dados[$cidade] = ($dados[$cidade] ?? 0) + 1;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($dados, JSON_UNESCAPED_UNICODE));
        flock($fp, LOCK_UN);
        fclose($fp);
    } catch (Throwable $e) {
        // ranking é opcional
    }
}

/* As N cidades mais pesquisadas: [["cidade" => "Recife", "total" => 12], ...] */
function rankingTop(int $n = 5): array {
    try {
        if (redisDisponivel()) {
            $r = redis(["ZREVRANGE", RANKING_CHAVE, "0", (string)($n - 1), "WITHSCORES"]) ?? [];
            $top = [];
            for ($i = 0; $i + 1 < count($r); $i += 2) {
                $top[] = ["cidade" => $r[$i], "total" => (int)$r[$i + 1]];
            }
            return $top;
        }
        if (getenv("VERCEL") || !is_file(arquivoRanking())) {
            return [];
        }

        $dados = json_decode(file_get_contents(arquivoRanking()), true) ?: [];
        arsort($dados);
        $top = [];
        foreach (array_slice($dados, 0, $n, true) as $cidade => $total) {
            $top[] = ["cidade" => $cidade, "total" => (int)$total];
        }
        return $top;
    } catch (Throwable $e) {
        return [];
    }
}
