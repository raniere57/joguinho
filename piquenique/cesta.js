'use strict';
// o piquenique: grama e céu (comum/cenario.js), toalha xadrez em perspectiva, a cesta
// dos docinhos (coberta por um guardanapo até a hora do lanche), o bule, as xícaras e as borboletas.
// Os amigos sentam atrás da toalha, então quem se abaixa some atrás dela.

const FOODS = [
  { id: 'biscoito', e: '🍪', name: 'Biscoito', art: 'um biscoito' },
  { id: 'bolinho', e: '🧁', name: 'Bolinho', art: 'um bolinho' },
  { id: 'morango', e: '🍓', name: 'Morango', art: 'morango' },
  { id: 'sanduiche', e: '🥪', name: 'Sanduíche', art: 'um sanduíche' },
  { id: 'rosquinha', e: '🍩', name: 'Rosquinha', art: 'uma rosquinha' },
  { id: 'maca', e: '🍎', name: 'Maçã', art: 'uma maçã' },
  { id: 'banana', e: '🍌', name: 'Banana', art: 'uma banana' },
  { id: 'uva', e: '🍇', name: 'Uva', art: 'uva' },
  { id: 'melancia', e: '🍉', name: 'Melancia', art: 'melancia' },
  { id: 'bolo', e: '🍰', name: 'Bolo', art: 'um pedaço de bolo' },
];
const TEA = '#c47a3a';
const CUPS = [['#ff9ec8', '#e8609a'], ['#9fd4ff', '#4f9ee0'], ['#ffe07a', '#e8a91e'], ['#b8ecd0', '#3fb77e']];
const TOPS = ['#ff8fb8', '#8fd0ff', '#ffd66b', '#b99bff', '#8fe0a8'];
const WINGS = [['#ff8fc0', '#ffd1e6'], ['#7cc8ff', '#d4efff'], ['#ffc93c', '#fff1b8'], ['#b99bff', '#e4d8ff']];
let L = {}, front = null, flies = [];

function layoutPicnic() {
  const port = H > W, r = port ? Math.min(W * .115, H * .055) : Math.min(H * .1, W * .05);
  const hy = H * (port ? .47 : .49), top = hy + r * 1.45;
  L = port ? {
    port, r, hy, ground: .42, xs: [.18, .5, .82].map(k => W * k),
    cloth: { top, bot: H * .8, b0: W * .03, b1: W * .97, f0: -W * .06, f1: W * 1.06 },
    tray: { x: W * .03, y: H * .822, w: W * .94, h: H * .125, cols: 6 },
    pot: [W * .5, top + (H * .8 - top) * .74],
  } : {
    port, r, hy, ground: .45, xs: [.14, .38, .62].map(k => W * k),
    cloth: { top, bot: H * 1.05, b0: W * .01, b1: W * .75, f0: -W * .05, f1: W * .79 },
    tray: { x: W * .775, y: H * .44, w: W * .2, h: H * .53, cols: 2 },
    pot: [W * .5, H - r * .95],
  };
  L.toast = [L.xs[1], hy - r * 2.1];
  buildSky(L.ground);
  front = buildFront();
  if (!flies.length) flies = [0, 1].map(newFly);
}

const cupAt = i => [L.xs[i], L.cloth.top + L.r * 1.45];
const CUP_S = () => L.r * .46;

function traySlots() {
  const { x, y, w, h, cols } = L.tray, rows = Math.ceil(6 / cols), cw = w / cols, ch = h / rows;
  return Array.from({ length: 6 }, (_, i) => ({ i, x: x + cw * (i % cols + .5), y: y + ch * (Math.floor(i / cols) + .5), w: cw, h: ch, s: Math.min(cw, ch) * .78 }));
}

// ---------- fundo fixo: toalha e cesta ----------
function buildFront() {
  const [c, g] = layer(W, H), { top, bot, b0, b1, f0, f1 } = L.cloth, r = L.r;
  const X = (u, v) => (b0 + (b1 - b0) * u) * (1 - v) + (f0 + (f1 - f0) * u) * v, Y = v => top + (bot - top) * v;
  const quad = (u0, u1, v0, v1) => { g.beginPath(); g.moveTo(X(u0, v0), Y(v0)); g.lineTo(X(u1, v0), Y(v0)); g.lineTo(X(u1, v1), Y(v1)); g.lineTo(X(u0, v1), Y(v1)); g.closePath(); };
  g.save(); g.translate(0, r * .14); g.fillStyle = 'rgb(40 100 30 / .25)'; quad(0, 1, 0, 1); g.fill(); g.restore();
  g.fillStyle = '#fffaf5'; quad(0, 1, 0, 1); g.fill();
  // xadrez: faixas nas duas direções, o cruzamento fica mais escuro
  const nu = 12, nv = 7, dv = k => (k / nv) ** 1.35;
  g.fillStyle = 'rgb(238 72 92 / .45)';
  for (let j = 0; j < nu; j += 2) { quad(j / nu, (j + 1) / nu, 0, 1); g.fill(); }
  for (let k = 0; k < nv; k += 2) { quad(0, 1, dv(k), dv(k + 1)); g.fill(); }
  g.strokeStyle = 'rgb(255 255 255 / .8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0, 0), Y(0)); g.lineTo(X(1, 0), Y(0)); g.stroke();
  if (bot < H) { g.fillStyle = '#d9435c'; quad(0, 1, .965, 1); g.fill(); }
  buildBasket(g);
  return c;
}

function buildBasket(g) {
  const { x, y, w, h } = L.tray;
  g.fillStyle = 'rgb(60 40 20 / .22)'; g.beginPath(); g.roundRect(x + 3, y + 6, w, h, 18); g.fill();
  g.fillStyle = '#e3ad6e'; g.beginPath(); g.roundRect(x, y, w, h, 18); g.fill();
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 18); g.clip();
  g.strokeStyle = 'rgb(150 90 40 / .3)'; g.lineWidth = 3;   // palha trançada
  for (let yy = y + 9, j = 0; yy < y + h; yy += 11, j++) {
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
    for (let xx = x + (j % 2) * 9; xx < x + w; xx += 18) { g.beginPath(); g.moveTo(xx, yy - 11); g.lineTo(xx, yy); g.stroke(); }
  }
  g.restore();
  g.strokeStyle = '#b8743a'; g.lineWidth = 6; g.beginPath(); g.roundRect(x, y, w, h, 18); g.stroke();
  for (const s of traySlots()) {   // toalhinha rendada debaixo de cada docinho
    g.fillStyle = '#fff8ee';
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; circle(g, s.x + Math.cos(a) * s.s * .5, s.y + s.s * .12 + Math.sin(a) * s.s * .22, s.s * .1); g.fill(); }
    g.beginPath(); g.ellipse(s.x, s.y + s.s * .12, s.s * .5, s.s * .22, 0, 0, TAU); g.fill();
  }
}

// guardanapo cobrindo a cesta; lift de 0 (coberta) a 1 (voou)
function drawCover(lift) {
  const { x, y, w, h } = L.tray;
  ctx.save(); ctx.globalAlpha = 1 - lift;
  ctx.translate(x + w / 2, y + h / 2 - lift * h * .9); ctx.rotate(lift * .25);
  ctx.fillStyle = '#ff9ec2'; ctx.beginPath(); ctx.roundRect(-w / 2 - 5, -h / 2 - 6, w + 10, h + 12, 20); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .75)';
  for (let yy = -h / 2 + 12, j = 0; yy < h / 2; yy += 20, j++) for (let xx = -w / 2 + 10 + (j % 2) * 10; xx < w / 2; xx += 20) { circle(ctx, xx, yy, 3.5); ctx.fill(); }
  emojiAt(ctx, '🎀', 0, 0, Math.min(h, w) * .5);
  ctx.restore();
}

// ---------- bule ----------
// dir = 1 bico pra direita, -1 espelhado
function drawPot(g, x, y, s, tilt, dir = 1) {
  g.save(); g.translate(x, y); g.scale(dir, 1); g.rotate(tilt);
  g.fillStyle = '#ffc2dc';   // bico
  g.beginPath(); g.moveTo(s * .7, s * .05); g.quadraticCurveTo(s * 1.25, s * .05, s * 1.5, -s * .55); g.lineTo(s * 1.64, -s * .44); g.quadraticCurveTo(s * 1.35, s * .45, s * .75, s * .45); g.closePath(); g.fill();
  g.strokeStyle = '#ffc2dc'; g.lineWidth = s * .2; g.beginPath(); g.arc(-s * .95, -s * .05, s * .42, Math.PI * .45, Math.PI * 1.55); g.stroke();   // alça
  const grd = g.createRadialGradient(-s * .3, -s * .35, s * .1, 0, 0, s * 1.05);
  grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#ffb3d4');
  g.fillStyle = grd; g.beginPath(); g.ellipse(0, 0, s, s * .82, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff7eb6';
  for (const [dx, dy] of [[-.62, -.3], [.55, -.35], [-.7, .25], [.62, .3], [0, .62]]) { circle(g, dx * s, dy * s, s * .08); g.fill(); }
  g.fillStyle = '#ff6fa8'; g.beginPath(); g.ellipse(0, -s * .66, s * .56, s * .14, 0, 0, TAU); g.fill();   // tampa
  g.fillStyle = '#ffd1e6'; g.beginPath(); g.ellipse(0, -s * .72, s * .44, s * .22, 0, Math.PI, TAU); g.fill();
  g.fillStyle = '#ff6fa8'; circle(g, 0, -s * .98, s * .13); g.fill();
  g.fillStyle = '#5a3548';   // carinha
  for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * s * .24, -s * .1, s * .07, s * .1, 0, 0, TAU); g.fill(); }
  g.strokeStyle = '#5a3548'; g.lineWidth = s * .07; g.lineCap = 'round'; g.beginPath(); g.arc(0, s * .05, s * .17, .2 * Math.PI, .8 * Math.PI); g.stroke();
  g.fillStyle = 'rgb(255 120 150 / .5)'; for (const d of [-1, 1]) { circle(g, d * s * .45, s * .08, s * .1); g.fill(); }
  g.fillStyle = 'rgb(255 255 255 / .75)'; g.beginPath(); g.ellipse(-s * .55, -s * .38, s * .1, s * .18, .6, 0, TAU); g.fill();
  g.restore();
}
function potTip(x, y, s, tilt, dir = 1) { const lx = s * 1.57, ly = -s * .5, c = Math.cos(tilt), sn = Math.sin(tilt); return [x + dir * (lx * c - ly * sn), y + lx * sn + ly * c]; }

// ---------- xícaras ----------
function drawSaucer(g, x, y, s, col) {
  g.fillStyle = 'rgb(0 0 0 / .08)'; g.beginPath(); g.ellipse(x, y + s * .12, s * 1.42, s * .42, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, s * 1.35, s * .38, 0, 0, TAU); g.fill();
  g.strokeStyle = col[0]; g.lineWidth = s * .1; g.stroke();
  g.fillStyle = '#f3e8f0'; g.beginPath(); g.ellipse(x, y, s * .72, s * .18, 0, 0, TAU); g.fill();
}

// (x, y) = fundo da xícara; level de 0 a 1
function drawCup(g, x, y, s, level, col, tilt = 0, glow = 0) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  if (glow) { g.fillStyle = `rgb(255 225 110 / ${.5 * glow})`; circle(g, 0, -s * .6, s * 1.7); g.fill(); }
  g.strokeStyle = col[1]; g.lineWidth = s * .22; g.beginPath(); g.arc(s * .95, -s * .62, s * .3, -Math.PI * .5, Math.PI * .5); g.stroke();
  g.fillStyle = col[0]; g.beginPath(); g.moveTo(-s, -s * 1.15); g.lineTo(s, -s * 1.15);
  g.bezierCurveTo(s, -s * .3, s * .6, 0, 0, 0); g.bezierCurveTo(-s * .6, 0, -s, -s * .3, -s, -s * 1.15); g.fill();
  g.fillStyle = col[1]; heart(g, 0, -s * .55, s * .5);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -s * 1.15, s, s * .28, 0, 0, TAU); g.fill();
  g.fillStyle = '#f1e4ee'; g.beginPath(); g.ellipse(0, -s * 1.13, s * .86, s * .21, 0, 0, TAU); g.fill();
  if (level > .01) {
    const k = .5 + .5 * level;
    g.fillStyle = TEA; g.beginPath(); g.ellipse(0, -s * 1.13 + (1 - level) * s * .08, s * .86 * k, s * .21 * k, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.ellipse(-s * .3 * k, -s * 1.16, s * .18 * k, s * .05, 0, 0, TAU); g.fill();
  }
  g.restore();
}

function heart(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * .35);
  g.bezierCurveTo(x - s * .6, y - s * .1, x - s * .3, y - s * .6, x, y - s * .25);
  g.bezierCurveTo(x + s * .3, y - s * .6, x + s * .6, y - s * .1, x, y + s * .35); g.fill();
}

// fumacinha do chá quente; y = boca da xícara
function drawSteam(x, y, s, t, k) {
  ctx.strokeStyle = `rgb(255 255 255 / ${Math.min(.7, .6 * k)})`; ctx.lineWidth = s * .16; ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, yy = y - s * .2 - u * s * 1.7 * k, xx = x + d * s * .32 + Math.sin(t * 3 + u * 5 + d) * s * .22;
      if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
}

// ---------- balãozinho do pedido ----------
function drawWish(x, y, rr, food, t, scale) {
  if (scale <= 0) return;
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.5 + x) * rr * .06); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgb(90 60 120 / .15)'; circle(ctx, 2, 4, rr); ctx.fill();
  ctx.fillStyle = '#fff'; circle(ctx, 0, 0, rr); ctx.fill();
  circle(ctx, rr * .28, rr * 1.1, rr * .17); ctx.fill();
  circle(ctx, rr * .12, rr * 1.42, rr * .1); ctx.fill();
  emojiAt(ctx, food.e, 0, 0, rr * 1.4);
  ctx.restore();
}

// ---------- borboletas ----------
function newFly(i) { return { x: W * (.25 + i * .5), y: H * L.ground * .55, a: rand(0, TAU), c: WINGS[(i * 2 + (Math.random() * 2 | 0)) % WINGS.length], ph: rand(0, TAU), fastAt: -9 }; }

function updateFlies(dt) {
  const top = H * .16, bot = H * L.ground + L.r * .3, fast = f => clock - f.fastAt < 1.6;
  for (const f of flies) {
    const sp = L.r * (fast(f) ? 5 : 1.4);
    f.a += rand(-2.5, 2.5) * dt;
    if (f.x < W * .06 || f.x > W * .94 || f.y < top || f.y > bot) f.a = Math.atan2((top + bot) / 2 - f.y, W / 2 - f.x) + rand(-.4, .4);
    f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt * .7;
  }
}

function drawFly(f, t) {
  const s = L.r * .42, flap = .25 + .75 * Math.abs(Math.sin(t * (clock - f.fastAt < 1.6 ? 20 : 11) + f.ph)), bob = Math.sin(t * 4 + f.ph) * s * .3;
  ctx.save(); ctx.translate(f.x, f.y + bob); ctx.rotate(Math.cos(f.a) * .25);
  for (const d of [-1, 1]) {
    ctx.save(); ctx.scale(d * flap, 1);
    ctx.fillStyle = f.c[0]; ctx.beginPath(); ctx.ellipse(s * .55, -s * .35, s * .6, s * .45, -.5, 0, TAU); ctx.fill();
    ctx.fillStyle = f.c[1]; ctx.beginPath(); ctx.ellipse(s * .42, s * .3, s * .38, s * .3, .5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .7)'; circle(ctx, s * .62, -s * .42, s * .12); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#4a3350'; ctx.lineCap = 'round';
  ctx.lineWidth = s * .2; ctx.beginPath(); ctx.moveTo(0, -s * .4); ctx.lineTo(0, s * .5); ctx.stroke();
  ctx.lineWidth = s * .06;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -s * .4); ctx.lineTo(d * s * .25, -s * .8); ctx.stroke(); }
  ctx.restore();
}

function tapFly(x, y) {
  const f = flies.find(f => Math.hypot(x - f.x, y - f.y) < L.r * .9);
  if (!f) return false;
  f.fastAt = clock; f.a = Math.atan2(f.y - y, f.x - x);
  sfx.chime(); burst(f.x, f.y, L.r * .3, 300, 8);
  return true;
}
