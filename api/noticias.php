<?php
/* Últimas notícias sobre clima (NewsData.io).
   O navegador chama este arquivo; só ele conhece a chave da API.
   A resposta fica em cache por 15 min para não estourar a cota do plano
   gratuito (200 créditos/dia, 1 crédito por chamada). */
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

const CACHE_TTL      = 900;                    // 15 minutos
const MAX_NOTICIAS   = 6;
/* Termos de meteorologia buscados só no TÍTULO: "clima OR tempestade" no texto
   inteiro trazia política e horóscopo ("clima de eleição"). Limite da API: 100 caracteres. */
const BUSCA          = 'chuva OR tempestade OR temporal OR "frente fria" OR "onda de calor" OR "previsão do tempo"';
const NEWSDATA_URL   = "https://newsdata.io/api/1/latest";

/* Chave: variável de ambiente (Vercel) ou arquivo local fora do Git (XAMPP) */
$chave = getenv("NEWSDATA_API_KEY");
if (!$chave && is_file(__DIR__ . "/_local.php")) {
    $local = require __DIR__ . "/_local.php";
    $chave = $local["NEWSDATA_API_KEY"] ?? "";
}

$arquivoCache = sys_get_temp_dir() . "/clima-noticias-cache.json";
$cache = is_file($arquivoCache) ? json_decode(file_get_contents($arquivoCache), true) : null;

/* 1) Cache ainda válido: responde sem gastar crédito */
if ($cache && time() - $cache["gerado_em"] < CACHE_TTL) {
    responder($cache, true);
}

if (!$chave) {
    http_response_code(503);
    echo json_encode(["erro" => "Notícias indisponíveis: a chave NEWSDATA_API_KEY não foi configurada."]);
    exit;
}

/* 2) Busca na NewsData.io */
$url = NEWSDATA_URL . "?" . http_build_query([
    "apikey"   => $chave,
    "qInTitle" => BUSCA,
    "language" => "pt",
]);
$contexto = stream_context_create(["http" => ["timeout" => 8, "ignore_errors" => true]]);
$bruto    = @file_get_contents($url, false, $contexto);
$json     = $bruto === false ? null : json_decode($bruto, true);

if (!$json || ($json["status"] ?? "") !== "success") {
    // API fora do ar, cota esgotada (429) ou chave inválida (401):
    // se houver uma resposta antiga, ela é melhor que nada
    if ($cache) {
        responder($cache, true);
    }
    http_response_code(502);
    $motivo = $json["results"]["message"] ?? "não foi possível acessar a NewsData.io";
    echo json_encode(["erro" => "Notícias indisponíveis: " . $motivo]);
    exit;
}

/* 3) Normalização e limpeza dos artigos */
$noticias = [];
$vistos   = [];
foreach ($json["results"] ?? [] as $artigo) {
    $titulo = limparTexto($artigo["title"] ?? "");
    $link   = urlSegura($artigo["link"] ?? "");
    if ($titulo === "" || $link === null) {
        continue;
    }

    // a mesma notícia costuma vir de vários portais: deduplica pelo título
    $chaveTitulo = mb_strtolower(preg_replace('/\W+/u', "", $titulo));
    if (isset($vistos[$chaveTitulo]) || !empty($artigo["duplicate"])) {
        continue;
    }
    $vistos[$chaveTitulo] = true;

    $resumo = limparTexto($artigo["description"] ?? "");
    if (mb_strlen($resumo) > 220) {
        $resumo = rtrim(mb_substr($resumo, 0, 217)) . "…";
    }

    // pubDate vem em UTC no formato "AAAA-MM-DD HH:MM:SS"
    $data = DateTime::createFromFormat("Y-m-d H:i:s", $artigo["pubDate"] ?? "", new DateTimeZone("UTC"));

    $noticias[] = [
        "titulo"       => $titulo,
        "resumo"       => $resumo,
        "link"         => $link,
        "fonte"        => limparTexto($artigo["source_name"] ?? $artigo["source_id"] ?? ""),
        "icone_fonte"  => urlSegura($artigo["source_icon"] ?? ""),
        "imagem"       => urlSegura($artigo["image_url"] ?? ""),
        "publicado_em" => $data ? $data->format(DATE_ATOM) : null,
    ];
}

usort($noticias, fn($a, $b) => strcmp($b["publicado_em"] ?? "", $a["publicado_em"] ?? ""));

$resultado = [
    "gerado_em" => time(),
    "noticias"  => array_slice($noticias, 0, MAX_NOTICIAS),
];
@file_put_contents($arquivoCache, json_encode($resultado));
responder($resultado, false);


function responder(array $dados, bool $doCache): void {
    echo json_encode([
        "atualizado_em" => gmdate(DATE_ATOM, $dados["gerado_em"]),
        "do_cache"      => $doCache,
        "noticias"      => $dados["noticias"],
    ]);
    exit;
}

function limparTexto(string $texto): string {
    $texto = html_entity_decode(strip_tags($texto), ENT_QUOTES | ENT_HTML5, "UTF-8");
    return trim(preg_replace('/\s+/u', " ", $texto));
}

/* aceita só http(s): evita links "javascript:" vindos de terceiros */
function urlSegura(?string $url): ?string {
    if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
        return null;
    }
    $esquema = strtolower(parse_url($url, PHP_URL_SCHEME) ?? "");
    return in_array($esquema, ["http", "https"], true) ? $url : null;
}
