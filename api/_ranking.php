<?php
/* Ranking das cidades mais pesquisadas por todos os visitantes.
   Guarda só o nome da cidade e um contador, sem nenhum dado de quem pesquisou.

   Armazenamento:
   - Vercel: Redis da Upstash (variáveis criadas pela integração no painel da Vercel).
     As funções da Vercel não têm disco permanente, então arquivo não serve lá.
   - XAMPP / php -S: arquivo data/ranking.json no próprio projeto.

   Qualquer falha aqui é ignorada: o ranking nunca pode derrubar a consulta do clima. */

const RANKING_CHAVE = "clima:ranking";

/* URL e token do Redis, se a integração estiver ativa (aceita os dois padrões de nome) */
function rankingRedis(): ?array {
    $url   = getenv("UPSTASH_REDIS_REST_URL") ?: getenv("KV_REST_API_URL");
    $token = getenv("UPSTASH_REDIS_REST_TOKEN") ?: getenv("KV_REST_API_TOKEN");
    return $url && $token ? [rtrim($url, "/"), $token] : null;
}

/* Executa um comando no Redis pela API REST da Upstash */
function redisComando(array $comando) {
    [$url, $token] = rankingRedis();
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

function arquivoRanking(): string {
    return __DIR__ . "/../data/ranking.json";
}

/* Soma +1 para a cidade */
function rankingRegistrar(string $cidade): void {
    try {
        if (rankingRedis()) {
            redisComando(["ZINCRBY", RANKING_CHAVE, "1", $cidade]);
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
        if (rankingRedis()) {
            $r = redisComando(["ZREVRANGE", RANKING_CHAVE, "0", (string)($n - 1), "WITHSCORES"]) ?? [];
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
