'use strict';
// o camarim: parede com moldura de luzinhas, penteadeira, e a bandeja com as ferramentas
// (sombra, batom, blush, rímel, purpurina, adesivos e esponja) e as cores de cada uma.

const TOOLS = ['sombra', 'batom', 'blush', 'rimel', 'glitter', 'adesivo', 'esponja'];
const COLORS = {
  sombra: [['roxo', '#a77bff'], ['azul', '#4fb4ff'], ['verde', '#5fd068'], ['rosa', '#ff7eb6'], ['dourado', '#ffc93c'], ['laranja', '#ff9f45']],
  batom: [['vermelho', '#ff3b5c'], ['rosa', '#ff6fae'], ['roxo', '#9b5cff'], ['laranja', '#ff8a3d'], ['azul', '#3fa9ff'], ['dourado', '#e8b100']],
  blush: [['rosa', '#ff7eb6'], ['pessego', '#ffa77a'], ['lilas', '#c9a2ff']],
};
const STICKERS = ['❤️', '⭐', '🦋', '🌸', '🌈', '🌙'];

let L = {}, roomLayer = null;

function layoutRoom() {
  const port = H > W;
  if (port) {
    const r = Math.min(W * .3, H * .15);
    L = { port, r, face: [W * .5, H * .39], table: H * .62, tools: { x: W * .03, y: H * .835, w: W * .94, h: H * .125, cols: 7 }, pal: { x: W * .06, y: H * .735, w: W * .88, h: H * .085, cols: 6 } };
  } else {
    const r = H * .24;
    L = { port, r, face: [W * .31, H * .55], table: H * .88, tools: { x: W * .6, y: H * .1, w: W * .37, h: H * .46, cols: 4 }, pal: { x: W * .62, y: H * .62, w: W * .33, h: H * .32, cols: 3 } };
  }
  roomLayer = buildRoom();
}

function gridSlots(rect, n) {
  const cols = Math.min(rect.cols, n), rows = Math.ceil(n / cols), cw = rect.w / cols, ch = rect.h / rows;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), off = (cols - inRow) * cw / 2;
    return { i, x: rect.x + off + cw * (i % cols + .5), y: rect.y + ch * (row + .5), s: Math.min(cw, ch) * .9 };
  });
}
const toolSlots = () => gridSlots(L.tools, TOOLS.length);

function frameRect() {
  const [fx, fy] = L.face, r = L.r, fw = Math.min(r * 3.3, W * .9), y0 = Math.max(fy - r * 2.05, H * (L.port ? .09 : .17));
  return [fw, L.table - y0 - r * .1, fx - fw / 2, y0];
}

function buildRoom() {
  const [c, g] = layer(W, H), r = L.r;
  const wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#ffe3f1'); wall.addColorStop(1, '#f3d6ff');
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgb(255 255 255 / .35)';   // listrinhas
  for (let x = 0; x < W; x += 34) g.fillRect(x, 0, 12, L.table);
  // moldura de camarim com luzinhas atrás da amiga
  const [fw, fh, x0, y0] = frameRect();
  g.fillStyle = '#ffd36b'; g.beginPath(); g.roundRect(x0 - r * .14, y0 - r * .14, fw + r * .28, fh + r * .28, r * .35); g.fill();
  const glass = g.createLinearGradient(x0, y0, x0 + fw, y0 + fh);
  glass.addColorStop(0, '#f4fbff'); glass.addColorStop(1, '#d4ecfb');
  g.fillStyle = glass; g.beginPath(); g.roundRect(x0, y0, fw, fh, r * .28); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .7)';
  g.beginPath(); g.moveTo(x0 + fw * .1, y0 + fh * .05); g.lineTo(x0 + fw * .28, y0 + fh * .05); g.lineTo(x0 + fw * .1, y0 + fh * .25); g.fill();
  // penteadeira
  g.fillStyle = '#fff'; g.fillRect(0, L.table, W, H - L.table);
  g.fillStyle = '#ffc6de'; g.fillRect(0, L.table, W, Math.max(8, r * .08));
  g.fillStyle = 'rgb(200 120 170 / .15)'; g.fillRect(0, L.table + Math.max(8, r * .08), W, 6);
  return c;
}

// luzinhas da moldura (piscam em onda)
function drawBulbs(t) {
  const r = L.r, [fw, fh, fx0, fy0] = frameRect(), x0 = fx0 - r * .07, y0 = fy0 - r * .07;
  const W2 = fw + r * .14, H2 = fh + r * .14, n = 7, m = 8, pts = [];
  for (let i = 0; i <= n; i++) pts.push([x0 + W2 * i / n, y0]);
  for (let i = 1; i <= m; i++) { pts.push([x0, y0 + H2 * i / m]); pts.push([x0 + W2, y0 + H2 * i / m]); }
  pts.forEach(([x, y], i) => {
    const on = .6 + .4 * Math.sin(t * 3 - i * .7);
    ctx.fillStyle = `rgb(255 247 200 / ${on * .5})`; circle(ctx, x, y, r * .14); ctx.fill();
    ctx.fillStyle = `rgb(255 ${240 + on * 15} ${190 + on * 40})`; circle(ctx, x, y, r * .07); ctx.fill();
  });
}

// ---------- ícones das ferramentas (centro x, y; s = tamanho) ----------
function drawToolIcon(g, id, x, y, s, color, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (id === 'sombra') {
    g.fillStyle = '#3d3550'; g.beginPath(); g.roundRect(-s * .38, -s * .28, s * .76, s * .56, s * .12); g.fill();
    const pans = ['#a77bff', '#4fb4ff', '#ff7eb6', '#ffc93c'];
    pans.forEach((c, i) => { g.fillStyle = i === 0 && color ? color : c; circle(g, -s * .19 + (i % 2) * s * .38, -s * .12 + Math.floor(i / 2) * s * .25, s * .1); g.fill(); });
    g.fillStyle = 'rgb(255 255 255 / .35)'; circle(g, -s * .22, -s * .15, s * .03); g.fill();
  } else if (id === 'batom') {
    g.rotate(.35);
    g.fillStyle = '#e8b100'; g.beginPath(); g.roundRect(-s * .13, -s * .02, s * .26, s * .42, s * .05); g.fill();
    g.fillStyle = '#ffd84a'; g.fillRect(-s * .13, s * .1, s * .26, s * .05);
    g.fillStyle = '#d0d6de'; g.fillRect(-s * .1, -s * .14, s * .2, s * .13);
    g.fillStyle = color || '#ff3b5c'; g.beginPath(); g.moveTo(-s * .09, -s * .14); g.lineTo(-s * .09, -s * .3); g.lineTo(s * .09, -s * .42); g.lineTo(s * .09, -s * .14); g.fill();
    g.fillStyle = 'rgb(255 255 255 / .4)'; g.fillRect(-s * .06, -s * .3, s * .04, s * .14);
  } else if (id === 'blush') {
    g.rotate(-.5);
    g.fillStyle = '#c98a55'; g.beginPath(); g.roundRect(-s * .05, -s * .02, s * .1, s * .45, s * .05); g.fill();
    g.fillStyle = '#d0d6de'; g.fillRect(-s * .07, -s * .1, s * .14, s * .1);
    g.fillStyle = color || '#ff9ec8';
    g.beginPath(); g.moveTo(-s * .07, -s * .1); g.quadraticCurveTo(-s * .2, -s * .35, 0, -s * .46); g.quadraticCurveTo(s * .2, -s * .35, s * .07, -s * .1); g.fill();
    g.fillStyle = 'rgb(255 255 255 / .35)'; circle(g, -s * .04, -s * .3, s * .04); g.fill();
  } else if (id === 'rimel') {
    g.rotate(.5);
    g.fillStyle = '#ff7eb6'; g.beginPath(); g.roundRect(-s * .08, -s * .05, s * .16, s * .45, s * .06); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-s * .08, s * .1, s * .16, s * .04);
    g.fillStyle = '#3d3550'; g.fillRect(-s * .015, -s * .3, s * .03, s * .26);
    g.beginPath(); g.ellipse(0, -s * .36, s * .05, s * .1, 0, 0, TAU); g.fill();
    g.strokeStyle = '#3d3550'; g.lineWidth = Math.max(1, s * .02);
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-s * .08, -s * .36 + i * s * .025); g.lineTo(s * .08, -s * .36 + i * s * .025); g.stroke(); }
  } else if (id === 'glitter') {
    g.fillStyle = 'rgb(220 235 255 / .9)'; g.beginPath(); g.roundRect(-s * .18, -s * .2, s * .36, s * .52, s * .1); g.fill();
    g.fillStyle = '#b77cff'; g.beginPath(); g.roundRect(-s * .14, -s * .34, s * .28, s * .15, s * .05); g.fill();
    for (const [dx, dy, c] of [[-.07, .05, '#ffd23b'], [.07, .15, '#ff7eb6'], [0, .24, '#4fb4ff'], [-.06, .2, '#fff']]) { g.fillStyle = c; star(g, dx * s, dy * s, s * .05, 0); }
    g.fillStyle = '#ffd23b'; star(g, s * .28, -s * .3, s * .08, 0); star(g, -s * .3, -s * .12, s * .06, .5);
  } else if (id === 'adesivo') {
    g.fillStyle = '#fff'; g.strokeStyle = '#f0c6de'; g.lineWidth = Math.max(1.5, s * .03);
    g.beginPath(); g.roundRect(-s * .34, -s * .34, s * .68, s * .68, s * .1); g.fill(); g.stroke();
    emojiAt(g, '❤️', -s * .14, -s * .13, s * .3); emojiAt(g, '⭐', s * .15, -s * .12, s * .28);
    emojiAt(g, '🦋', -s * .13, s * .16, s * .28); emojiAt(g, '🌸', s * .15, s * .16, s * .28);
  } else if (id === 'esponja') {
    g.fillStyle = '#ffe066'; g.beginPath(); g.roundRect(-s * .32, -s * .22, s * .64, s * .44, s * .14); g.fill();
    g.fillStyle = '#f5c518'; for (const [dx, dy, k] of [[-.18, -.08, .05], [.05, -.1, .04], [.2, .05, .05], [-.05, .09, .04], [-.2, .1, .03]]) { circle(g, dx * s, dy * s, k * s); g.fill(); }
    g.fillStyle = '#8fd6ff'; for (const [dx, dy] of [[.3, -.3], [.38, -.16]]) { g.beginPath(); g.moveTo(dx * s, dy * s - s * .07); g.quadraticCurveTo(dx * s + s * .05, dy * s, dx * s, dy * s + s * .03); g.quadraticCurveTo(dx * s - s * .05, dy * s, dx * s, dy * s - s * .07); g.fill(); }
  }
  g.restore();
}

function drawSwatch(x, y, s, color, chosen, t) {
  const up = chosen ? s * .08 + Math.abs(Math.sin(t * 5)) * s * .05 : 0;
  ctx.fillStyle = 'rgb(120 60 120 / .15)'; circle(ctx, x, y + 3, s * .36); ctx.fill();
  ctx.fillStyle = '#fff'; circle(ctx, x, y - up, s * .36); ctx.fill();
  ctx.fillStyle = color; circle(ctx, x, y - up, s * .28); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .45)'; ctx.beginPath(); ctx.ellipse(x - s * .09, y - up - s * .1, s * .09, s * .05, -.6, 0, TAU); ctx.fill();
  if (chosen) { ctx.strokeStyle = color; ctx.lineWidth = 3; circle(ctx, x, y - up, s * .45); ctx.stroke(); }
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
