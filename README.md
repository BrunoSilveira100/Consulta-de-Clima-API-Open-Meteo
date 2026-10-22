<p align="center">
  <img src="assets/img/clima-icone.svg" width="72" alt="">
</p>

<h1 align="center">clima</h1>

<p align="center">
  Consulta de clima por cidade com previsão de 5 dias e notícias de meteorologia em tempo real.<br>
  PHP no back-end, HTML/CSS/JS puro no front-end, animações com GSAP.
</p>

<p align="center">
  <a href="https://clima-consulta.vercel.app"><b>Ver o site</b></a>
</p>

---

## Funcionalidades

- **Busca por cidade:** geocodificação e clima atual pela [Open-Meteo](https://open-meteo.com/), com temperatura, sensação térmica, umidade, vento e condição do céu.
- **Painel que reage ao clima:** a cor do card muda conforme o tempo (sol, noite, nublado, névoa, chuva, neve, tempestade), com partículas de chuva e neve e relâmpagos na tempestade.
- **Previsão de 5 dias:** barras de mínima e máxima numa escala comum, coloridas por temperatura.
- **Notícias de meteorologia:** últimas notícias em português pela [NewsData.io](https://newsdata.io/), atualizadas a cada 15 minutos.
- **Histórico da visita:** as consultas da sessão ficam numa tabela e somem ao fechar a aba. Sem banco de dados e sem rastreamento.
- **Tema claro e escuro:** a troca é animada e respeita a preferência do sistema.
- **Acessibilidade:** respeita `prefers-reduced-motion`, permite navegar pelo teclado (`/` foca a busca, `Esc` limpa) e funciona no celular.

## Estrutura

```
clima-app/
├── index.html              # estrutura da página
├── assets/
│   ├── css/estilos.css     # estilos e temas (claro/escuro e cores por clima)
│   ├── js/app.js           # busca, animações, previsão, notícias e histórico
│   └── img/                # logo e ícone
├── api/
│   ├── clima.php           # GET ?cidade=  → Open-Meteo (geocodificação + previsão)
│   ├── noticias.php        # GET           → NewsData.io (cache, limpeza e deduplicação)
│   └── _local.exemplo.php  # modelo do arquivo de chave local
├── docs/
│   ├── identidade-visual/  # conceitos de logo em SVG
│   └── postman/            # coleção para testar a API
└── vercel.json             # runtime PHP na Vercel
```

## Como rodar localmente

Requisitos: PHP 8+ com `allow_url_fopen` habilitado (já vem assim no XAMPP).

```bash
# 1. chave da NewsData.io (gratuita). O restante do site funciona sem ela.
cp api/_local.exemplo.php api/_local.php   # e coloque sua chave no arquivo

# 2. servidor embutido do PHP
php -S localhost:8000
```

Abra http://localhost:8000. Também funciona dentro do `htdocs` do XAMPP.

## API

| Rota | Descrição | Erros |
| --- | --- | --- |
| `GET /api/clima.php?cidade=Manaus` | Clima atual e previsão de 5 dias | `400` cidade vazia · `404` não encontrada · `502` Open-Meteo indisponível |
| `GET /api/noticias.php` | Até 6 notícias de meteorologia | `503` chave ausente · `502` NewsData.io indisponível e sem cache |

<details>
<summary>Exemplo de resposta de <code>/api/clima.php</code></summary>

```json
{
  "cidade": "Manaus",
  "latitude": -3.1019,
  "longitude": -60.025,
  "clima": {
    "temperatura_c": 29.4,
    "vento_kmh": 8.2,
    "codigo_clima": 2,
    "dia": true,
    "umidade": 74,
    "sensacao_c": 33.1
  },
  "previsao": [
    { "data": "2026-10-04", "temp_max": 32.1, "temp_min": 24.5, "codigo": 2 }
  ]
}
```
</details>

## Decisões técnicas

- **A chave da API nunca chega ao navegador.** O front chama `api/noticias.php`, e só o servidor fala com a NewsData.io. A chave fica em variável de ambiente (Vercel) ou num arquivo ignorado pelo Git (local).
- **Cache para respeitar a cota.** O plano gratuito da NewsData.io tem 200 créditos por dia. Com cache de 15 minutos, o site faz no máximo cerca de 96 chamadas por dia, não importa o número de visitas. Se a API falhar, o último cache é reaproveitado.
- **Qualidade dos dados.** Buscar "clima" no texto inteiro trazia política ("clima de eleição"). A busca usa termos de meteorologia só no título (`qInTitle`), e os artigos passam por deduplicação, remoção de HTML, validação de links (só `http(s)`) e normalização de datas.
- **Segurança no front.** Todo dado externo é inserido com `textContent`, nunca com `innerHTML`, o que evita XSS.

## Deploy

Publicado na Vercel com o runtime [`vercel-php`](https://github.com/vercel-community/php). Para publicar o seu, importe o repositório na Vercel e cadastre a variável de ambiente `NEWSDATA_API_KEY`.
