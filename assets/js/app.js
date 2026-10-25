const $ = s => document.querySelector(s);
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduzMovimento) gsap.globalTimeline.timeScale(50);

/* ---------- Códigos WMO -> descrição e grupo visual ---------- */
const DESCRICOES = {
    0: "Céu limpo", 1: "Predominantemente limpo", 2: "Parcialmente nublado", 3: "Nublado",
    45: "Nevoeiro", 48: "Nevoeiro com geada",
    51: "Garoa fraca", 53: "Garoa", 55: "Garoa forte", 56: "Garoa congelante", 57: "Garoa congelante forte",
    61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte", 66: "Chuva congelante", 67: "Chuva congelante forte",
    71: "Neve fraca", 73: "Neve", 75: "Neve forte", 77: "Grãos de neve",
    80: "Pancadas de chuva", 81: "Pancadas fortes", 82: "Pancadas violentas",
    85: "Pancadas de neve", 86: "Pancadas fortes de neve",
    95: "Trovoada", 96: "Trovoada com granizo", 99: "Trovoada com granizo forte"
};

function grupo(codigo) {
    if (codigo <= 1) return "limpo";
    if (codigo <= 3) return "nublado";
    if (codigo === 45 || codigo === 48) return "nevoa";
    if (codigo >= 95) return "tempestade";
    if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "neve";
    return "chuva";
}

const TEMAS = {
    limpo:      { "--sky-a": "#ffd27a", "--sky-b": "#ff8247", "--ink": "#2b1608", "--accent": "#d9481a", "--page": "#fbf3ea" },
    noite:      { "--sky-a": "#24356e", "--sky-b": "#0b1230", "--ink": "#f3eedd", "--accent": "#3f5bd1", "--page": "#eceef5" },
    nublado:    { "--sky-a": "#cfd8e0", "--sky-b": "#8e9daf", "--ink": "#1b2430", "--accent": "#3b5b7a", "--page": "#eef1f4" },
    nevoa:      { "--sky-a": "#e3ded4", "--sky-b": "#b4ada0", "--ink": "#2a2620", "--accent": "#7a6a4f", "--page": "#f3f1ec" },
    chuva:      { "--sky-a": "#4a7086", "--sky-b": "#1e3442", "--ink": "#e8f1f5", "--accent": "#1f7fa6", "--page": "#e9eff2" },
    neve:       { "--sky-a": "#f4f8fc", "--sky-b": "#c4d8ea", "--ink": "#13273a", "--accent": "#3a7cc2", "--page": "#f2f6fa" },
    tempestade: { "--sky-a": "#433a5c", "--sky-b": "#15111f", "--ink": "#f2ecff", "--accent": "#6a4fc9", "--page": "#eeecf3" },
    neutro:     { "--sky-a": "#e9e4da", "--sky-b": "#d6cfc1", "--ink": "#1d1b17", "--accent": "#d9541e", "--page": "#f6f3ee" }
};

/* No tema escuro, os céus claros (neutro, nublado, névoa, neve) ganham versões noturnas.
   Sol, noite, chuva e tempestade continuam iguais: o card do céu é o "conteúdo". */
const TEMAS_ESCURO = {
    neutro:  { "--sky-a": "#2a2723", "--sky-b": "#1c1a17", "--ink": "#ece6da", "--accent": "#e8642c" },
    nublado: { "--sky-a": "#4a5563", "--sky-b": "#262c35", "--ink": "#e8edf2", "--accent": "#4f7aa3" },
    nevoa:   { "--sky-a": "#4a463f", "--sky-b": "#27241f", "--ink": "#eee8dd", "--accent": "#9a8463" },
    neve:    { "--sky-a": "#3b5670", "--sky-b": "#1a2836", "--ink": "#eef5fb", "--accent": "#3a7cc2" }
};
let temaAtual = "neutro";
const modoEscuro = () => document.documentElement.dataset.tema === "escuro";
const temaPara = nome => ({ ...TEMAS[nome], ...(modoEscuro() ? TEMAS_ESCURO[nome] : {}) });

/* ---------- Ícones SVG (desenhados à mão, sem emoji) ---------- */
const NUVEM = '<path class="nuvem" d="M26 70h46a16 16 0 0 0 0-32 22 22 0 0 0-42-6 18 18 0 0 0-4 38z" fill="currentColor" opacity=".9"/>';
function icone(g, dia) {
    if (g === "limpo" && !dia)
        return '<svg viewBox="0 0 100 100"><path class="astro" d="M62 18a32 32 0 1 0 22 46A26 26 0 0 1 62 18z" fill="currentColor"/></svg>';
    if (g === "limpo") {
        let raios = "";
        for (let i = 0; i < 8; i++)
            raios += `<line x1="50" y1="8" x2="50" y2="20" transform="rotate(${i * 45} 50 50)"/>`;
        return '<svg viewBox="0 0 100 100"><g class="raios" stroke="currentColor" stroke-width="5" stroke-linecap="round">' +
               raios + '</g><circle class="astro" cx="50" cy="50" r="20" fill="currentColor"/></svg>';
    }
    if (g === "nevoa")
        return '<svg viewBox="0 0 100 100" stroke="currentColor" stroke-width="6" stroke-linecap="round">' +
               '<line class="linha" x1="14" y1="34" x2="74" y2="34"/><line class="linha" x1="26" y1="52" x2="86" y2="52"/>' +
               '<line class="linha" x1="14" y1="70" x2="64" y2="70"/></svg>';
    let extra = "";
    if (g === "chuva")
        extra = '<g stroke="currentColor" stroke-width="5" stroke-linecap="round"><line class="gota" x1="36" y1="80" x2="32" y2="92"/>' +
                '<line class="gota" x1="52" y1="80" x2="48" y2="92"/><line class="gota" x1="68" y1="80" x2="64" y2="92"/></g>';
    if (g === "neve")
        extra = '<g fill="currentColor"><circle class="gota" cx="36" cy="86" r="4"/><circle class="gota" cx="52" cy="90" r="4"/>' +
                '<circle class="gota" cx="68" cy="86" r="4"/></g>';
    if (g === "tempestade")
        extra = '<path class="raio" d="M54 66 42 86h12l-6 14 18-24H54l6-10z" fill="#f5c84b"/>';
    return '<svg viewBox="0 0 100 100">' + NUVEM + extra + '</svg>';
}

/* Cor da temperatura: azul (frio) -> laranja/vermelho (calor) */
function corTemp(t) {
    const p = Math.min(1, Math.max(0, (t + 5) / 45));
    return `hsl(${215 - p * 205} 75% 52%)`;
}

/* ---------- Partículas do céu (chuva / neve) ---------- */
const canvas = $("#particulas"), ctx = canvas.getContext("2d");
let particulas = [], modoParticula = null, proximoRaio = 0;

function redimensionar() {
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * devicePixelRatio;
    canvas.height = r.height * devicePixelRatio;
}
addEventListener("resize", redimensionar);
redimensionar();

function iniciarParticulas(modo) {
    modoParticula = reduzMovimento ? null : modo;
    particulas = [];
    if (!modoParticula) return;
    const qtd = modo === "neve" ? 70 : 110;
    for (let i = 0; i < qtd; i++)
        particulas.push({ x: Math.random(), y: Math.random(), v: .5 + Math.random() * .8, f: Math.random() * 6 });
}

function desenhar(t) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (modoParticula === "neve") {
        ctx.fillStyle = "rgba(255,255,255,.9)";
        for (const p of particulas) {
            p.y += p.v * .0018;
            if (p.y > 1.02) { p.y = -.02; p.x = Math.random(); }
            const x = p.x * w + Math.sin(t / 900 + p.f) * 12 * devicePixelRatio;
            ctx.beginPath();
            ctx.arc(x, p.y * h, (1.5 + p.v * 1.5) * devicePixelRatio, 0, 7);
            ctx.fill();
        }
    } else if (modoParticula) {
        ctx.strokeStyle = "rgba(220,235,245,.45)";
        ctx.lineWidth = 1.2 * devicePixelRatio;
        ctx.beginPath();
        for (const p of particulas) {
            p.y += p.v * .012;
            if (p.y > 1.05) { p.y = -.05; p.x = Math.random() * 1.1; }
            const x = p.x * w, y = p.y * h, len = (10 + p.v * 14) * devicePixelRatio;
            ctx.moveTo(x, y);
            ctx.lineTo(x - len * .25, y + len);
        }
        ctx.stroke();
        if (modoParticula === "tempestade" && t > proximoRaio) {
            proximoRaio = t + 5000 + Math.random() * 6000;
            gsap.timeline()
                .to("#flash", { opacity: .55, duration: .05 })
                .to("#flash", { opacity: 0, duration: .08 })
                .to("#flash", { opacity: .35, duration: .04 })
                .to("#flash", { opacity: 0, duration: .5, ease: "power2.out" });
        }
    }
    requestAnimationFrame(desenhar);
}
requestAnimationFrame(desenhar);

/* ---------- Barra de progresso da busca ---------- */
const progresso = {
    iniciar() {
        gsap.killTweensOf("#progresso");
        gsap.fromTo("#progresso", { scaleX: 0, opacity: 1 }, { scaleX: .75, duration: 1.4, ease: "power2.out" });
    },
    terminar() {
        return gsap.timeline()
            .to("#progresso", { scaleX: 1, duration: .2, ease: "power2.in" })
            .to("#progresso", { opacity: 0, duration: .25 });
    }
};

function mostrarErro(msg) {
    $("#erro").textContent = msg;
    gsap.fromTo("#form-busca", { x: 0 }, { keyframes: { x: [-10, 8, -5, 3, 0] }, duration: .4, ease: "power2.out" });
}

/* ---------- Consulta ---------- */
let ultimoId = null, accentAtual = "#d9541e";

/* Histórico só desta tela: fica na memória da página e some ao fechar
   ou recarregar a aba. Nada é gravado em banco. */
const historicoSessao = [];
let contadorSessao = 0;

async function consultar(cidade) {
    cidade = (cidade ?? $("#cidade").value).trim();
    if (cidade === "") { $("#cidade").focus(); return; }
    $("#cidade").value = cidade;
    $("#erro").textContent = "";

    const btn = $("#btn-consultar");
    btn.disabled = true;
    btn.classList.add("carregando");
    btn.querySelector(".rotulo").textContent = "Buscando";
    // o clique "afunda" o botão: é a causa visível da animação que vem depois
    gsap.fromTo(btn, { scale: .94 }, { scale: 1, duration: .5, ease: "back.out(1.7)" });
    progresso.iniciar();

    let resp, dados;
    try {
        resp = await fetch("api/clima.php?cidade=" + encodeURIComponent(cidade));
        dados = await resp.json();
    } catch (e) {
        dados = { erro: "Não foi possível falar com o servidor." };
        resp = { ok: false };
    }

    btn.disabled = false;
    btn.classList.remove("carregando");
    btn.querySelector(".rotulo").textContent = "Consultar";
    await progresso.terminar();

    if (!resp.ok) {
        mostrarErro(dados.erro || "A consulta falhou.");
        return;
    }

    // número da consulta nesta visita (aparece em "Registro nº" e na tabela)
    dados.id = ++contadorSessao;
    historicoSessao.unshift({
        id: dados.id,
        cidade: dados.cidade,
        temperatura: dados.clima.temperatura_c,
        velocidade_vento: dados.clima.vento_kmh,
        codigo_clima: dados.clima.codigo_clima,
        data_consulta: new Date().toISOString()
    });
    if (historicoSessao.length > 20) historicoSessao.pop();

    ultimoId = dados.id;
    revelar(dados);
    renderizarPrevisao(dados.previsao);
    carregarHistorico();
}

/* Troca o conteúdo do card do céu: o antigo sai pela esquerda acelerando
   e o novo entra pela direita já em movimento (mesma direção, mesma velocidade). */
function revelar(dados) {
    const palco = $("#palco");
    const c = dados.clima;
    const dia = c.dia !== false;
    const g = grupo(c.codigo_clima);
    temaAtual = g === "limpo" && !dia ? "noite" : g;
    const tema = temaPara(temaAtual);
    accentAtual = tema["--accent"];

    // a cena nova é montada fora do DOM e só entra no meio do corte
    const cena = document.createElement("div");
    cena.className = "cena";
    montar(cena, dados, g, dia);

    const tl = gsap.timeline();
    tl.to(document.documentElement, { ...tema, duration: .7, ease: "power2.inOut" }, 0);
    tl.to(palco, { x: -90, duration: .3, ease: "power4.in" }, 0)
      .to(palco, { opacity: 0, duration: .18, ease: "none" }, 0);

    tl.add(() => {
        palco.replaceChildren(cena);
        iniciarParticulas(g === "chuva" || g === "neve" || g === "tempestade" ? g : null);
    });
    tl.fromTo(palco, { x: 90, opacity: .35 }, { x: 0, opacity: 1, duration: .36, ease: "power4.out" });

    // nome da cidade entra letra por letra, de baixo, com intervalos encolhendo
    const letras = cena.querySelectorAll(".cidade span");
    gsap.set(letras, { y: 70, opacity: 0 });
    let t = tl.duration() - .3, gap = .05;
    letras.forEach(l => {
        tl.set(l, { opacity: 1 }, t);
        tl.to(l, { y: 0, duration: .2, ease: "power4.out" }, t);
        t += gap; gap *= .84;
    });

    // temperatura "contando" até o valor real
    const num = cena.querySelector(".temp .num");
    const alvo = { v: 0 };
    tl.to(alvo, {
        v: c.temperatura_c, duration: 1, ease: "power3.out",
        onUpdate: () => num.textContent = alvo.v.toFixed(1).replace(".", ",")
    }, t - .1);

    tl.from(cena.querySelector(".icone svg"), { scale: .5, rotation: -30, opacity: 0, duration: .6, ease: "back.out(1.6)", transformOrigin: "50% 50%" }, t);
    tl.from(cena.querySelectorAll(".icone .raios, .icone .gota, .icone .linha, .icone .raio"),
            { opacity: 0, y: -8, stagger: .06, duration: .3, ease: "power3.out", transformOrigin: "50% 50%" }, t + .25);
    tl.from(cena.querySelectorAll(".descricao, .metrica"),
            { y: 24, opacity: 0, stagger: .06, duration: .45, ease: "power4.out" }, t + .15);

    const btnLimpar = $("#btn-limpar");
    if (btnLimpar.hidden) {
        btnLimpar.hidden = false;
        gsap.from(btnLimpar, { x: 16, opacity: 0, duration: .35, ease: "power4.out" });
    }
}

/* ---------- Limpar: volta para a tela inicial ---------- */
const cenaInicial = $("#palco .vazio").cloneNode(true);

function ligarSugestoes(raiz) {
    raiz.querySelectorAll(".sugestoes button").forEach(b =>
        b.addEventListener("click", () => consultar(b.textContent)));
}

function limpar() {
    const btnLimpar = $("#btn-limpar");
    $("#cidade").value = "";
    $("#erro").textContent = "";
    if (btnLimpar.hidden) { $("#cidade").focus(); return; }   // já está na tela inicial

    ultimoId = null;
    temaAtual = "neutro";
    const neutro = temaPara("neutro");
    accentAtual = neutro["--accent"];
    btnLimpar.hidden = true;

    const palco = $("#palco");
    const cena = cenaInicial.cloneNode(true);
    ligarSugestoes(cena);

    const tl = gsap.timeline();
    tl.to(document.documentElement, { ...neutro, duration: .7, ease: "power2.inOut" }, 0);
    tl.to(palco, { x: -90, duration: .3, ease: "power4.in" }, 0)
      .to(palco, { opacity: 0, duration: .18, ease: "none" }, 0);
    tl.add(() => {
        palco.replaceChildren(cena);
        iniciarParticulas(null);
    });
    tl.fromTo(palco, { x: 90, opacity: .35 }, { x: 0, opacity: 1, duration: .36, ease: "power4.out" });
    tl.from(cena.children, { y: 40, opacity: 0, duration: .5, stagger: .08, ease: "power4.out" }, "<.05");

    const dias = document.querySelectorAll("#lista-previsao .dia");
    const placeholder = () => $("#lista-previsao").innerHTML = '<p class="placeholder">Sem dados ainda.</p>';
    if (dias.length)
        gsap.to(dias, { x: -30, opacity: 0, duration: .25, stagger: .04, ease: "power4.in", onComplete: placeholder });
    else
        placeholder();

    $("#cidade").focus();
}

function montar(palco, dados, g, dia) {
    const c = dados.clima;
    palco.appendChild($("#tpl-resultado").content.cloneNode(true));

    palco.querySelector(".coords").textContent =
        dados.latitude.toFixed(2) + "°, " + dados.longitude.toFixed(2) + "°";
    palco.querySelector(".icone").innerHTML = icone(g, dia);

    const cidade = palco.querySelector(".cidade");
    for (const ch of dados.cidade) {
        const s = document.createElement("span");
        s.textContent = ch === " " ? " " : ch;
        cidade.appendChild(s);
    }

    palco.querySelector(".descricao .txt").textContent = DESCRICOES[c.codigo_clima] || "Condição desconhecida";
    palco.querySelector(".descricao .cod").textContent = "WMO " + c.codigo_clima;
    palco.querySelector('[data-m="chuva"]').textContent = c.chuva_pct != null ? c.chuva_pct + "%" : "–";
    palco.querySelector('[data-m="vento"]').textContent = c.vento_kmh + " km/h";
    palco.querySelector('[data-m="umidade"]').textContent = c.umidade != null ? c.umidade + "%" : "–";
    palco.querySelector('[data-m="sensacao"]').textContent =
        c.sensacao_c != null ? c.sensacao_c.toFixed(1).replace(".", ",") + "°" : "–";
    palco.querySelector('[data-m="id"]').textContent = dados.id != null ? "#" + dados.id : "–";
}

/* ---------- Previsão: barras de mínima/máxima numa escala comum ---------- */
function renderizarPrevisao(previsao) {
    const lista = $("#lista-previsao");
    lista.replaceChildren();
    const menor = Math.min(...previsao.map(p => p.temp_min));
    const maior = Math.max(...previsao.map(p => p.temp_max));
    const escala = v => ((v - menor) / (maior - menor || 1)) * 100;

    previsao.forEach((p, i) => {
        const linha = document.createElement("div");
        linha.className = "dia";
        const nome = i === 0 ? "Hoje" :
            new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

        linha.innerHTML =
            '<span class="nome"></span><span class="mini"></span>' +
            '<span class="chuva" title="Chance de chuva"><svg viewBox="0 0 24 24"><path d="M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10z" fill="currentColor"/></svg><span></span></span>' +
            '<span class="min"></span><div class="trilho"><div class="faixa"></div></div><span class="max"></span>';
        linha.querySelector(".nome").textContent = nome;
        linha.querySelector(".mini").innerHTML = icone(grupo(p.codigo), true);
        linha.querySelector(".mini").title = DESCRICOES[p.codigo] || "";

        // chance de chuva do dia: destacada a partir de 50%
        const chuva = linha.querySelector(".chuva");
        chuva.querySelector("span").textContent = p.chuva_pct != null ? p.chuva_pct + "%" : "–";
        chuva.classList.toggle("alta", p.chuva_pct >= 50);
        linha.querySelector(".min").textContent = Math.round(p.temp_min) + "°";
        linha.querySelector(".max").textContent = Math.round(p.temp_max) + "°";

        const faixa = linha.querySelector(".faixa");
        faixa.style.left = escala(p.temp_min) + "%";
        faixa.style.width = Math.max(4, escala(p.temp_max) - escala(p.temp_min)) + "%";
        faixa.style.background = `linear-gradient(90deg, ${corTemp(p.temp_min)}, ${corTemp(p.temp_max)})`;
        linha.querySelector(".mini").style.color = corTemp(p.temp_max);
        lista.appendChild(linha);
    });

    gsap.from(lista.querySelectorAll(".dia"), { x: 40, opacity: 0, duration: .45, stagger: .07, ease: "power4.out", delay: .35 });
    gsap.from(lista.querySelectorAll(".faixa"), { scaleX: 0, duration: .7, stagger: .07, ease: "power3.out", delay: .55 });
}

/* ---------- Histórico ---------- */
function carregarHistorico() {
    const listaDados = historicoSessao;
    const corpo = $("#tabela tbody");
    corpo.replaceChildren();

    if (listaDados.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.className = "vazio-historico";
        td.textContent = "Suas consultas aparecem aqui enquanto esta página estiver aberta.";
        tr.appendChild(td);
        corpo.appendChild(tr);
        return;
    }

    listaDados.forEach(l => {
        const tr = document.createElement("tr");
        const temp = parseFloat(l.temperatura);
        const cel = (cls, txt) => {
            const td = document.createElement("td");
            if (cls) td.className = cls;
            td.textContent = txt;
            tr.appendChild(td);
            return td;
        };

        cel("id", "#" + l.id);
        cel("cid", l.cidade);
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = temp.toFixed(1).replace(".", ",") + "°";
        chip.style.setProperty("--c", corTemp(temp));
        cel("", "").appendChild(chip);
        cel("", l.velocidade_vento);
        cel("", (DESCRICOES[l.codigo_clima] || "–") + " (" + l.codigo_clima + ")");
        cel("data", new Date(l.data_consulta)
            .toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }));

        tr.addEventListener("click", () => {
            scrollTo({ top: 0, behavior: reduzMovimento ? "auto" : "smooth" });
            consultar(l.cidade);
        });
        corpo.appendChild(tr);
    });

    const linhas = corpo.querySelectorAll("tr");
    gsap.from(linhas, { y: 18, opacity: 0, duration: .4, stagger: { each: .035, ease: "power2.in" }, ease: "power4.out" });

    // destaca a consulta que acabou de entrar
    const nova = [...linhas].find(tr => tr.firstChild.textContent === "#" + ultimoId);
    if (nova) {
        gsap.fromTo(nova, { backgroundColor: accentAtual + "2e" },
            { backgroundColor: accentAtual + "00", duration: 2.2, delay: .6, ease: "power2.in", clearProps: "backgroundColor" });
    }
}

/* ---------- Eventos ---------- */
$("#form-busca").addEventListener("submit", e => { e.preventDefault(); consultar(); });
/* ---------- Tema claro / escuro ---------- */
const btnTema = $("#btn-tema");
const sincronizarBotaoTema = () => btnTema.setAttribute("aria-checked", modoEscuro());
sincronizarBotaoTema();

function aplicarTema(novo) {
    document.documentElement.dataset.tema = novo;
    try { localStorage.setItem("tema", novo); } catch (e) {}
    sincronizarBotaoTema();
    const tema = temaPara(temaAtual);
    accentAtual = tema["--accent"];
    return tema;
}

btnTema.addEventListener("click", () => {
    const novo = modoEscuro() ? "claro" : "escuro";

    // sem suporte a View Transitions: troca com as transições de cor do CSS
    if (!document.startViewTransition || reduzMovimento) {
        gsap.to(document.documentElement, { ...aplicarTema(novo), duration: .4, ease: "power2.inOut" });
        return;
    }

    // com suporte: o novo tema "vaza" num círculo a partir do botão
    const r = btnTema.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.classList.add("trocando-tema");
    const vt = document.startViewTransition(() => gsap.set(document.documentElement, aplicarTema(novo)));
    vt.ready.then(() => document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(.2, .8, .2, 1)", pseudoElement: "::view-transition-new(root)" }
    ));
    vt.finished.finally(() => document.documentElement.classList.remove("trocando-tema"));
});

ligarSugestoes(document);
$("#btn-limpar").addEventListener("click", limpar);
$(".marca").addEventListener("click", limpar);
addEventListener("keydown", e => {
    if (e.key === "Escape") limpar();
    if (e.key === "/" && document.activeElement !== $("#cidade")) {
        e.preventDefault();
        $("#cidade").focus();
    }
});

gsap.from(".vazio > *", { y: 40, opacity: 0, duration: .6, stagger: .08, ease: "power4.out" });
gsap.from(".sugestoes button", { y: 14, opacity: 0, duration: .4, stagger: .05, ease: "power4.out", delay: .3 });

/* ---------- Microinterações dos botões ---------- */
// ondulação que nasce no ponto exato do clique (delegação: vale também para
// os botões de sugestão recriados pelo "Limpar")
document.addEventListener("pointerdown", e => {
    const b = e.target.closest(".btn-principal, .limpar, .sugestoes button");
    if (!b || reduzMovimento) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const onda = document.createElement("span");
    onda.className = "onda";
    onda.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(onda);
    onda.addEventListener("animationend", () => onda.remove());
});

// botão principal "magnético": acompanha levemente o cursor (só com mouse)
if (!reduzMovimento && matchMedia("(pointer: fine)").matches) {
    const principal = $("#btn-consultar");
    const moverX = gsap.quickTo(principal, "x", { duration: .45, ease: "power3.out" });
    const moverY = gsap.quickTo(principal, "y", { duration: .45, ease: "power3.out" });
    principal.addEventListener("pointermove", e => {
        const r = principal.getBoundingClientRect();
        moverX((e.clientX - r.left - r.width / 2) * .22);
        moverY((e.clientY - r.top - r.height / 2) * .35);
    });
    principal.addEventListener("pointerleave", () => { moverX(0); moverY(0); });
}

/* ---------- Títulos de seção: sobem ao entrar na tela ---------- */
document.querySelectorAll(".titulo-secao").forEach(titulo => {
    gsap.set(titulo, { y: 28, opacity: 0 });
    const obs = new IntersectionObserver(entradas => {
        if (!entradas[0].isIntersecting) return;
        obs.disconnect();
        gsap.to(titulo, { y: 0, opacity: 1, duration: .75, ease: "power4.out" });
    }, { threshold: .6 });
    obs.observe(titulo);
});
carregarHistorico();

/* ---------- Notícias (NewsData.io via noticias.php, com cache no servidor) ---------- */
const tempoRelativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
function haQuanto(iso) {
    const minutos = Math.round((new Date(iso) - Date.now()) / 60000);
    if (Math.abs(minutos) < 60) return tempoRelativo.format(minutos, "minute");
    const horas = Math.round(minutos / 60);
    if (Math.abs(horas) < 24) return tempoRelativo.format(horas, "hour");
    return tempoRelativo.format(Math.round(horas / 24), "day");
}

async function carregarNoticias() {
    const lista = $("#lista-noticias");
    let dados;
    try {
        const resp = await fetch("api/noticias.php");
        dados = await resp.json();
        if (!resp.ok) throw new Error(dados.erro);
    } catch (e) {
        const aviso = document.createElement("p");
        aviso.className = "aviso";
        // mostra o motivo vindo do servidor (ex.: chave não configurada, cota esgotada)
        aviso.textContent = dados?.erro || "Não foi possível carregar as notícias agora.";
        lista.replaceChildren(aviso);
        return;
    }

    if (!dados.noticias.length) {
        const aviso = document.createElement("p");
        aviso.className = "aviso";
        aviso.textContent = "Nenhuma notícia sobre o clima no momento.";
        lista.replaceChildren(aviso);
        return;
    }

    const cards = dados.noticias.map(n => {
        const a = document.createElement("a");
        a.className = "noticia";
        a.href = n.link;                       // o servidor só devolve links http(s)
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const capa = document.createElement("div");
        capa.className = "capa";
        if (n.imagem) {
            const img = document.createElement("img");
            img.src = n.imagem;
            img.alt = "";
            img.loading = "lazy";
            img.referrerPolicy = "no-referrer";
            img.onerror = () => img.remove();  // imagem quebrada: fica o fundo do céu
            capa.appendChild(img);
        }

        const corpo = document.createElement("div");
        corpo.className = "corpo";
        const meta = document.createElement("div");
        meta.className = "meta";
        if (n.icone_fonte) {
            const ic = document.createElement("img");
            ic.src = n.icone_fonte;
            ic.alt = "";
            ic.referrerPolicy = "no-referrer";
            ic.onerror = () => ic.remove();
            meta.appendChild(ic);
        }
        const fonte = document.createElement("span");
        fonte.className = "fonte";
        fonte.textContent = [n.fonte, n.publicado_em && haQuanto(n.publicado_em)].filter(Boolean).join(" · ");
        meta.appendChild(fonte);

        const titulo = document.createElement("h4");
        titulo.textContent = n.titulo;
        corpo.append(meta, titulo);
        if (n.resumo) {
            const resumo = document.createElement("p");
            resumo.textContent = n.resumo;
            corpo.appendChild(resumo);
        }
        a.append(capa, corpo);
        return a;
    });

    lista.replaceChildren(...cards);
    $("#noticias-atualizado").textContent = "atualizado " + haQuanto(dados.atualizado_em);

    // os cards sobem em cascata quando a seção aparece na tela
    gsap.set(cards, { y: 40, opacity: 0 });
    const observador = new IntersectionObserver(entradas => {
        if (!entradas[0].isIntersecting) return;
        observador.disconnect();
        gsap.to(cards, { y: 0, opacity: 1, duration: .55, stagger: .07, ease: "power4.out" });
    }, { threshold: .15 });
    observador.observe(lista);
}

carregarNoticias();
setInterval(carregarNoticias, 15 * 60 * 1000);   // mesma janela do cache do servidor
