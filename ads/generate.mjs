/**
 * Gerador de criativos do Korta para Meta Ads.
 * SVG → PNG via sharp, compondo o logo oficial (public/logo.png).
 *
 * Rodar: node ads/generate.mjs
 * Saída: ads/out/*.png
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, "out");
const LOGO = path.join(ROOT, "public", "logo.png");
fs.mkdirSync(OUT, { recursive: true });

// ── Paleta Korta ──────────────────────────────────────────────
const C = {
  bg: "#0B132B",
  surf: "#1C2541",
  surf2: "#263159",
  gold: "#D4AF37",
  golds: "#E8C866",
  txt: "#F8FAFC",
  mut: "#94A3B8",
  green: "#005c4b",
  chatbg: "#0b141a",
};

// ── Helpers ───────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// quebra texto por largura aproximada
function wrap(text, fontSize, maxW, factor = 0.54) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  const fits = (s) => s.length * fontSize * factor <= maxW;
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (fits(t) || !cur) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const approxW = (s, fontSize, factor = 0.54) => s.length * fontSize * factor;

// bloco de linhas de texto (array de strings OU {t,fill})
function lines(x, y, arr, opts = {}) {
  const { size = 40, lh = size * 1.15, weight = 400, fill = C.txt, anchor = "start", spacing = 0 } = opts;
  return arr
    .map((item, i) => {
      const t = typeof item === "string" ? item : item.t;
      const f = typeof item === "string" ? fill : item.fill || fill;
      const ls = spacing ? `letter-spacing="${spacing}"` : "";
      return `<text x="${x}" y="${y + i * lh}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${f}" text-anchor="${anchor}" ${ls}>${esc(t)}</text>`;
    })
    .join("");
}

function rrect(x, y, w, h, r, fill, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" ${extra}/>`;
}

// pílula de CTA (auto-largura pelo label)
function ctaPill(cx, y, label, opts = {}) {
  const { size = 36, padX = 48, h = 92, bg = C.gold, fg = C.bg, align = "center" } = opts;
  const w = Math.ceil(approxW(label, size, 0.56)) + padX * 2;
  const x = align === "center" ? cx - w / 2 : cx;
  return (
    rrect(x, y, w, h, h / 2, bg) +
    `<text x="${x + w / 2}" y="${y + h / 2 + size * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="${fg}" text-anchor="middle">${esc(label)}</text>`
  );
}

function badge(x, y, label, opts = {}) {
  const { size = 26 } = opts;
  const w = Math.ceil(approxW(label, size, 0.6)) + 64;
  const h = 56;
  return (
    rrect(x, y, w, h, h / 2, "none", `stroke="${C.gold}" stroke-width="2" opacity="0.9"`) +
    `<circle cx="${x + 30}" cy="${y + h / 2}" r="7" fill="${C.gold}"/>` +
    `<text x="${x + 48}" y="${y + h / 2 + size * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="${C.gold}" letter-spacing="1.5">${esc(label)}</text>`
  );
}

// fundo padrão com gradiente + glows dourados
function bgLayer(w, h) {
  return `
    <defs>
      <linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B132B"/>
        <stop offset="1" stop-color="#060b1a"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${C.gold}" stop-opacity="0.16"/>
        <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bgg)"/>
    <ellipse cx="${w * 0.85}" cy="${h * 0.12}" rx="${w * 0.5}" ry="${w * 0.5}" fill="url(#glow)"/>
    <ellipse cx="${w * 0.1}" cy="${h * 0.95}" rx="${w * 0.45}" ry="${w * 0.45}" fill="url(#glow)"/>
  `;
}

// cabeçalho de marca: mark (composto depois) + wordmark
function brandHeader(x, y, markSize = 76) {
  const tx = x + markSize + 22;
  return {
    markBox: { left: x, top: y, size: markSize },
    svg: `<text x="${tx}" y="${y + markSize * 0.66}" font-family="Arial, Helvetica, sans-serif" font-size="${markSize * 0.62}" font-weight="800" fill="${C.txt}" letter-spacing="1">Korta</text>`,
  };
}

// chat estilo WhatsApp; retorna {svg, height}
function chatPanel(x, y, w, convo, opts = {}) {
  const { title = "Barbearia (Korta)" } = opts;
  const headH = 92;
  const padIn = 22;
  const bubbleMaxW = w - padIn * 2 - 90;
  const bSize = 30;
  const bLh = 40;
  let cy = y + headH + 24;
  let bubbles = "";
  for (const m of convo) {
    const right = m.side === "right";
    const wl = wrap(m.text, bSize, bubbleMaxW, 0.52);
    const tw = Math.min(bubbleMaxW, Math.max(...wl.map((l) => approxW(l, bSize, 0.52))));
    const bw = tw + 40;
    const bh = wl.length * bLh + 30;
    const bx = right ? x + w - padIn - bw : x + padIn;
    const fill = right ? C.green : C.surf;
    bubbles += rrect(bx, cy, bw, bh, 20, fill);
    bubbles += lines(bx + 20, cy + 38, wl, { size: bSize, lh: bLh, fill: C.txt });
    cy += bh + 18;
  }
  const totalH = cy - y + 10;
  const panel =
    rrect(x, y, w, totalH, 36, C.chatbg, `stroke="#ffffff" stroke-opacity="0.08"`) +
    rrect(x, y, w, headH, 36, C.surf) +
    rrect(x, y + headH - 24, w, 24, 0, C.surf) +
    `<circle cx="${x + 50}" cy="${y + headH / 2}" r="26" fill="${C.gold}" opacity="0.2"/>` +
    `<text x="${x + 50}" y="${y + headH / 2 + 9}" font-family="Arial" font-size="26" font-weight="800" fill="${C.gold}" text-anchor="middle">K</text>` +
    `<text x="${x + 92}" y="${y + headH / 2 - 2}" font-family="Arial" font-size="28" font-weight="700" fill="${C.txt}">${esc(title)}</text>` +
    `<text x="${x + 92}" y="${y + headH / 2 + 26}" font-family="Arial" font-size="22" fill="#34d399">online agora</text>` +
    bubbles;
  return { svg: panel, height: totalH };
}

// chip de estatística
function statChip(x, y, w, big, small) {
  const h = 150;
  return (
    rrect(x, y, w, h, 22, C.surf, `stroke="${C.gold}" stroke-width="1.5" stroke-opacity="0.25"`) +
    `<text x="${x + w / 2}" y="${y + 70}" font-family="Arial" font-size="48" font-weight="800" fill="${C.gold}" text-anchor="middle">${esc(big)}</text>` +
    lines(x + w / 2, y + 108, small.split("\n"), { size: 24, lh: 30, fill: C.mut, anchor: "middle" })
  );
}

function checkLine(x, y, text, size = 34) {
  return (
    `<circle cx="${x + 18}" cy="${y - size * 0.32}" r="20" fill="${C.gold}" opacity="0.18"/>` +
    `<path d="M${x + 9} ${y - size * 0.34} l7 7 l13 -15" stroke="${C.gold}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<text x="${x + 52}" y="${y}" font-family="Arial" font-size="${size}" font-weight="500" fill="${C.txt}">${esc(text)}</text>`
  );
}

function arrow(x, y, s = 40, color = C.gold) {
  return `<path d="M${x} ${y} l${s} 0 M${x + s - 14} ${y - 12} l14 12 l-14 12" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ── Render pipeline ───────────────────────────────────────────
async function render(name, w, h, inner, composites = []) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bgLayer(w, h)}${inner}</svg>`;
  let img = sharp(Buffer.from(svg));
  if (composites.length) img = img.composite(composites);
  await img.png().toFile(path.join(OUT, name));
  console.log("✓", name);
}

async function logoBuf(size) {
  return sharp(LOGO).resize(size, size).png().toBuffer();
}

// ══════════════════════════════════════════════════════════════
// CRIATIVOS
// ══════════════════════════════════════════════════════════════
async function main() {
  // ───────── FEED 1:1 (1080x1080) ─────────
  const W = 1080;
  const P = 96;

  // FEED 01 — HOOK
  {
    const hb = brandHeader(P, P, 72);
    const inner =
      hb.svg +
      badge(P, 230, "ATENDENTE DE IA · BARBEARIAS") +
      lines(P, 380, ["Sua barbearia", "atende sozinha", "no WhatsApp."], { size: 92, lh: 104, weight: 800 }) +
      lines(P, 380 + 3 * 104, [{ t: "24 horas por dia.", fill: C.gold }], { size: 92, lh: 104, weight: 800 }) +
      lines(P, 800, wrap("A IA responde os clientes, agenda os horários e lota sua agenda — enquanto você corta cabelo.", 34, W - 2 * P), { size: 34, lh: 46, fill: C.mut }) +
      ctaPill(P + 250, 940, "Teste grátis  ·  korta.ia.br", { align: "center" });
    await render("feed-01-hook.png", W, W, inner, [{ input: await logoBuf(72), top: P, left: P }]);
  }

  // FEED 02 — CHAT MOCKUP
  {
    const hb = brandHeader(P, P, 64);
    const chat = chatPanel(P, 360, W - 2 * P, [
      { side: "right", text: "Tem horário amanhã às 15h?" },
      { side: "left", text: "Tenho sim! Com Rafael ou João?" },
      { side: "right", text: "Tanto faz" },
      { side: "left", text: "Fechado com o Rafael, amanhã às 15h. Confirmo?" },
      { side: "right", text: "Confirma" },
      { side: "left", text: "Agendado! Te espero amanhã às 15h." },
    ]);
    const inner =
      hb.svg +
      lines(P, 250, ["Cliente manda. A IA responde.", { t: "Você só corta o cabelo.", fill: C.gold }], { size: 46, lh: 58, weight: 800 }) +
      chat.svg;
    await render("feed-02-chat.png", W, W, inner, [{ input: await logoBuf(64), top: P, left: P }]);
  }

  // FEED 03 — DOR + STATS
  {
    const hb = brandHeader(P, P, 64);
    const sw = (W - 2 * P - 2 * 24) / 3;
    const inner =
      hb.svg +
      lines(P, 300, ["Quantos clientes", { t: "você perde", fill: C.gold }, "por não responder?"], { size: 76, lh: 90, weight: 800 }) +
      lines(P, 590, wrap("Cliente chama às 22h, você vê de manhã — e ele já marcou em outra. A IA do Korta responde na hora.", 34, W - 2 * P), { size: 34, lh: 46, fill: C.mut }) +
      statChip(P, 740, sw, "24h", "atendendo") +
      statChip(P + sw + 24, 740, sw, "−50%", "faltas") +
      statChip(P + 2 * (sw + 24), 740, sw, "2 min", "pra ativar") +
      ctaPill(W / 2, 940, "korta.ia.br  ·  14 dias grátis");
    await render("feed-03-dor.png", W, W, inner, [{ input: await logoBuf(64), top: P, left: P }]);
  }

  // ───────── STORIES 9:16 (1080x1920) ─────────
  const H = 1920;

  // STORY 01 — HOOK
  {
    const inner =
      brandHeader(P, 150, 72).svg +
      badge(P, 520, "ATENDENTE DE IA · BARBEARIAS") +
      lines(P, 700, ["Sua barbearia", "atende sozinha", "no WhatsApp."], { size: 104, lh: 120, weight: 800 }) +
      lines(P, 700 + 3 * 120, [{ t: "24h por dia.", fill: C.gold }], { size: 104, lh: 120, weight: 800 }) +
      lines(P, 1320, wrap("A IA responde, agenda e lota sua agenda enquanto você corta cabelo.", 38, W - 2 * P), { size: 38, lh: 52, fill: C.mut }) +
      ctaPill(W / 2, 1640, "Comece grátis  ·  korta.ia.br");
    await render("story-01-hook.png", W, H, inner, [{ input: await logoBuf(72), top: 150, left: P }]);
  }

  // STORY 02 — CHAT
  {
    const chat = chatPanel(P, 760, W - 2 * P, [
      { side: "right", text: "Tem horário amanhã às 15h?" },
      { side: "left", text: "Tenho sim! Com Rafael ou João?" },
      { side: "right", text: "Tanto faz" },
      { side: "left", text: "Fechado, amanhã às 15h. Confirmo?" },
      { side: "right", text: "Confirma" },
      { side: "left", text: "Agendado! Te espero amanhã." },
    ]);
    const inner =
      brandHeader(P, 150, 64).svg +
      lines(P, 470, ["Cliente manda.", "A IA agenda.", { t: "Você corta.", fill: C.gold }], { size: 84, lh: 96, weight: 800 }) +
      chat.svg +
      ctaPill(W / 2, 1680, "korta.ia.br · 14 dias grátis");
    await render("story-02-chat.png", W, H, inner, [{ input: await logoBuf(64), top: 150, left: P }]);
  }

  // STORY 03 — OFERTA
  {
    const inner =
      brandHeader(P, 150, 64).svg +
      lines(W / 2, 560, ["14 DIAS"], { size: 150, lh: 160, weight: 800, fill: C.gold, anchor: "middle" }) +
      lines(W / 2, 720, ["GRÁTIS"], { size: 150, lh: 160, weight: 800, fill: C.gold, anchor: "middle" }) +
      lines(W / 2, 830, ["sem cartão de crédito"], { size: 40, fill: C.mut, anchor: "middle" }) +
      rrect(P, 1000, W - 2 * P, 440, 32, C.surf, `stroke="${C.gold}" stroke-width="1.5" stroke-opacity="0.3"`) +
      (() => {
        let y = 1090;
        const cl = (t) => checkLine(P + 60, (y += 90) - 90 + 40, t, 38);
        return (
          checkLine(P + 60, 1090, "Atendente de IA 24h no WhatsApp", 38) +
          checkLine(P + 60, 1090 + 95, "Agenda online + lembretes", 38) +
          checkLine(P + 60, 1090 + 190, "CRM e relatórios", 38) +
          checkLine(P + 60, 1090 + 285, "A partir de R$ 39,90/mês", 38)
        );
      })() +
      ctaPill(W / 2, 1620, "Comece agora  ·  korta.ia.br");
    await render("story-03-oferta.png", W, H, inner, [{ input: await logoBuf(64), top: 150, left: P }]);
  }

  // ───────── CARROSSEL (1080x1080 x5) ─────────
  const cBrand = () => brandHeader(P, P, 56).svg;
  const cLogo = async () => [{ input: await logoBuf(56), top: P, left: P }];

  // C1 — HOOK
  await render("carousel-1.png", W, W,
    cBrand() +
    lines(P, 470, ["A barbearia", "que atende", { t: "sozinha.", fill: C.gold }], { size: 100, lh: 112, weight: 800 }) +
    lines(P, 880, ["Veja como funciona"], { size: 36, fill: C.mut }) +
    arrow(P + 360, 868, 50),
    await cLogo());

  // C2 — DOR
  await render("carousel-2.png", W, W,
    cBrand() +
    lines(P, 360, ["Toda mensagem", "não respondida"], { size: 72, lh: 86, weight: 800 }) +
    lines(P, 360 + 2 * 86, [{ t: "vira corte na", fill: C.gold }, { t: "concorrência.", fill: C.gold }], { size: 72, lh: 86, weight: 800 }) +
    lines(P, 820, wrap("Cliente chama de madrugada, você responde de manhã — tarde demais.", 34, W - 2 * P), { size: 34, lh: 46, fill: C.mut }),
    await cLogo());

  // C3 — SOLUÇÃO (mini chat)
  {
    const chat = chatPanel(P, 380, W - 2 * P, [
      { side: "right", text: "Tem horário amanhã às 15h?" },
      { side: "left", text: "Tenho! Com Rafael ou João?" },
      { side: "right", text: "Tanto faz" },
      { side: "left", text: "Agendado, amanhã às 15h!" },
    ]);
    await render("carousel-3.png", W, W,
      cBrand() +
      lines(P, 270, ["A IA responde e agenda", { t: "em segundos. 24h.", fill: C.gold }], { size: 50, lh: 62, weight: 800 }) +
      chat.svg,
      await cLogo());
  }

  // C4 — O QUE VOCÊ GANHA
  await render("carousel-4.png", W, W,
    cBrand() +
    lines(P, 320, ["O que você ganha:"], { size: 64, weight: 800 }) +
    checkLine(P, 470, "Agenda online com link próprio", 40) +
    checkLine(P, 580, "Lembretes que cortam as faltas", 40) +
    checkLine(P, 690, "CRM: clientes inativos e aniversários", 40) +
    checkLine(P, 800, "Atendente de IA 24h no WhatsApp", 40) +
    checkLine(P, 910, "Relatórios de faturamento", 40),
    await cLogo());

  // C5 — CTA
  await render("carousel-5.png", W, W,
    cBrand() +
    lines(P, 380, ["Comece grátis", "por 14 dias."], { size: 88, lh: 100, weight: 800 }) +
    lines(P, 660, [{ t: "Sem cartão. Pronto em 2 minutos.", fill: C.mut }], { size: 36 }) +
    ctaPill(P, 780, "korta.ia.br/criar-loja", { align: "left" }) +
    lines(P, 980, ["A partir de R$ 39,90/mês"], { size: 32, fill: C.mut }),
    await cLogo());

  console.log("\nTodos os criativos gerados em ads/out/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
