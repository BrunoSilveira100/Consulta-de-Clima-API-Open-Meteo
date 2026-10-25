<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
require_once __DIR__ . "/_ranking.php";

/* Sem banco de dados: o histórico de consultas fica só na página aberta
   (memória do navegador). Esta API apenas consulta o clima. */

/* ---------- Rota: consultar o clima de uma cidade ---------- */
$cidade = trim($_GET["cidade"] ?? "");

if ($cidade === "") {
    http_response_code(400);
    echo json_encode(["erro" => "Informe o parâmetro 'cidade' na URL."]);
    exit;
}

/* 1) Geocodificação: nome da cidade -> latitude/longitude */
$geoUrl  = "https://geocoding-api.open-meteo.com/v1/search?name="
         . urlencode($cidade) . "&count=1&language=pt&format=json";
$geoJson = @file_get_contents($geoUrl);

if ($geoJson === false) {
    http_response_code(502);
    echo json_encode(["erro" => "Não foi possível acessar a API de geocodificação."]);
    exit;
}

$geo = json_decode($geoJson, true);

if (empty($geo["results"])) {
    http_response_code(404);
    echo json_encode(["erro" => "Cidade não encontrada: " . $cidade]);
    exit;
}

$nomeCidade = $geo["results"][0]["name"];
$lat        = $geo["results"][0]["latitude"];
$lon        = $geo["results"][0]["longitude"];

/* 2) Consulta da previsão na Open-Meteo (atual + próximos dias) */
$cliUrl  = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}"
         . "&current=temperature_2m,wind_speed_10m,weather_code,is_day,relative_humidity_2m,apparent_temperature,precipitation_probability"
         . "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max"
         . ",sunrise,sunset,precipitation_sum,precipitation_hours,wind_speed_10m_max,uv_index_max"
         . "&forecast_days=5&timezone=auto";
$cliJson = @file_get_contents($cliUrl);

if ($cliJson === false) {
    http_response_code(502);
    echo json_encode(["erro" => "Não foi possível acessar a API Open-Meteo."]);
    exit;
}

$clima   = json_decode($cliJson, true);
$temp    = $clima["current"]["temperature_2m"];
$vento   = $clima["current"]["wind_speed_10m"];
$codigo  = $clima["current"]["weather_code"];

/* monta a lista de previsão dos próximos dias */
$previsao = [];
for ($i = 0; $i < 5; $i++) {
    $previsao[] = [
        "data"     => $clima["daily"]["time"][$i],
        "temp_max" => $clima["daily"]["temperature_2m_max"][$i],
        "temp_min" => $clima["daily"]["temperature_2m_min"][$i],
        "codigo"   => $clima["daily"]["weather_code"][$i],
        "chuva_pct" => $clima["daily"]["precipitation_probability_max"][$i] ?? null,   // maior chance do dia
        // detalhes exibidos ao clicar no dia (horários já no fuso da cidade: timezone=auto)
        "nascer_sol"    => isset($clima["daily"]["sunrise"][$i]) ? substr($clima["daily"]["sunrise"][$i], 11, 5) : null,
        "por_sol"       => isset($clima["daily"]["sunset"][$i]) ? substr($clima["daily"]["sunset"][$i], 11, 5) : null,
        "chuva_mm"      => $clima["daily"]["precipitation_sum"][$i] ?? null,
        "chuva_horas"   => $clima["daily"]["precipitation_hours"][$i] ?? null,
        "vento_max_kmh" => $clima["daily"]["wind_speed_10m_max"][$i] ?? null,
        "uv_max"        => $clima["daily"]["uv_index_max"][$i] ?? null,
    ];
}

/* 3) Conta a pesquisa no ranking das mais pesquisadas. Usa o nome oficial
      da geocodificação, então "guaxupe" e "Guaxupé" somam na mesma cidade. */
rankingRegistrar($nomeCidade);

/* 4) Resposta em JSON */
echo json_encode([
    "cidade"    => $nomeCidade,
    "latitude"  => (float)$lat,
    "longitude" => (float)$lon,
    "clima"     => [
        "temperatura_c" => (float)$temp,
        "vento_kmh"     => (float)$vento,
        "codigo_clima"  => (int)$codigo,
        "dia"           => (bool)$clima["current"]["is_day"],
        "umidade"       => (int)$clima["current"]["relative_humidity_2m"],
        "sensacao_c"    => (float)$clima["current"]["apparent_temperature"],
        "chuva_pct"     => $clima["current"]["precipitation_probability"] ?? null,   // chance de chuva agora
    ],
    "previsao"  => $previsao,
]);