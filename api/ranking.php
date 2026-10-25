<?php
/* GET api/ranking.php: as 5 cidades mais pesquisadas por todos os visitantes */
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-store");   // sempre fresco: ao voltar ao início, a pesquisa recém-feita já conta
require_once __DIR__ . "/_ranking.php";

echo json_encode(["cidades" => rankingTop(5)], JSON_UNESCAPED_UNICODE);
