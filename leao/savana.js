'use strict';
// a savana: céu do comum/cenario.js, morros dourados com acácias, capim, a barra dos cuidados
// (comida, água, pente, bola, lua) e o desfile dos amigos da savana lá no fundo.

const ITEMS = [{ id: 'fome', e: '🍖' }, { id: 'sede', e: '💧' }, { id: 'juba' }, { id: 'bola', e: '⚽' }, { id: 'sono', e: '🌙' }];
const PARADE = ['🦒', '🐘', '🦓', '🦛', '🐒', '🦩', '🐆'], PARADE_T = 7;
let L = {}, groundLayer = null;

function layoutSavana() {
  const port = H > W;
  const r = port ? Math.min(W * .22, H * .11) : Math.min(H * .17, W * .1);
  const x = port ? W * .5 : W * .38, hy = H * (port ? .42 : .45);
  L = {
    port, r, x, hy, gy: hy + r * 2.25,
    bubble: port ? [x + r * 1.3, hy - r * 1.55] : [x - r * 1.75, hy - r * 1.1],
    bar: port ? { x: W * .04, y: H * .79, w: W * .92, h: H * .13, cols: 5 } : { x: W * .74, y: H * .2, w: W * .24, h: H * .76, cols: 2 },
  };
  L.ball0 = [x + r * 1.75, L.gy - r * .3];
  L.bowl = [x, L.gy + r * .1];
  buildSky(port ? .5 : .55);
  groundLayer = buildGround();
}

function barSlots() {
  const { x, y, w, h, cols } = L.bar, rows = Math.ceil(ITEMS.length / cols), cw = w / cols, ch = h / rows;
  return ITEMS.map((it, i) => ({ it, i, x: x + cw * (i % cols + .5), y: y + ch * (Math.floor(i / cols) + .5), w: cw, h: ch, s: Math.min(cw, ch) * .62 }));
}

function acacia(g, x, base, h) {
  g.strokeStyle = '#7a5230'; g.lineWidth = h * .07; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + h * .05, base - h * .5, x - h * .05, base - h * .8); g.stroke();
  g.lineWidth = h * .04;
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x, base - h * .55); g.lineTo(x + d * h * .3, base - h * .85); g.stroke(); }
  g.fillStyle = '#5f8f36';
  for (const [dx, dy, rx] of [[0, -.9, .55], [-.35, -.86, .35], [.38, -.87, .35]]) { g.beginPath(); g.ellipse(x + dx * h, base + dy * h, rx * h, h * .14, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#7fb04a';
  for (const [dx, dy, rx] of [[0, -.95, .42], [-.3, -.9, .22], [.32, -.92, .22]]) { g.beginPath(); g.ellipse(x + dx * h, base + dy * h, rx * h, h * .07, 0, 0, TAU); g.fill(); }
}

function buildGround() {
  const [c, g] = layer(W, H), gy0 = H * sky.ground, wave = (f, a, p) => x => gy0 + f + Math.sin(x / W * TAU * a + p) * H * .02;
  const far = wave(0, 1.3, .5);
  g.fillStyle = '#e3c66e'; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, far(x));
  g.lineTo(W, H); g.fill();
  const th = Math.min(W, H) * (L.port ? .3 : .34);
  for (const [k, s] of [[.12, 1], [.86, .8], [.62, .45]]) acacia(g, W * k, far(W * k) + 4, th * s);
  const near = wave(H * .07, .8, 2.2), grad = g.createLinearGradient(0, gy0, 0, H);
  grad.addColorStop(0, '#f2cf6c'); grad.addColorStop(1, '#d6a443');
  g.fillStyle = grad; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, near(x));
  g.lineTo(W, H); g.fill();
  g.lineWidth = 2; g.lineCap = 'round';   // capim
  for (let i = 0; i < W / 9; i++) {
    const x = rand(0, W), y = near(x) + rand(6, H - near(x)), h = rand(6, 14);
    g.strokeStyle = pick(['#c4922e', '#a9b543', '#d9ae4a']);
    for (const d of [-1, 0, 1]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + d * h * .4, y - h); g.stroke(); }
  }
  g.fillStyle = 'rgb(120 80 20 / .22)'; g.beginPath(); g.ellipse(L.x, L.gy, L.r * 1.35, L.r * .22, 0, 0, TAU); g.fill();
  return c;
}

function drawComb(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#ff7eb6'; g.beginPath(); g.roundRect(-s * .5, -s * .2, s, s * .18, s * .08); g.fill();
  for (let i = 0; i < 9; i++) { g.beginPath(); g.roundRect(-s * .46 + i * s * .11, -s * .06, s * .06, s * .3, s * .03); g.fill(); }
  g.fillStyle = 'rgb(255 255 255 / .6)'; g.fillRect(-s * .42, -s * .17, s * .6, s * .04);
  g.restore();
}

function drawBar(t, hops, glowId) {
  const { x, y, w, h } = L.bar;
  ctx.fillStyle = 'rgb(120 70 20 / .18)'; ctx.beginPath(); ctx.roundRect(x + 3, y + 5, w, h, 22); ctx.fill();
  ctx.fillStyle = 'rgb(255 248 228 / .94)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.fill();
  ctx.strokeStyle = '#d9a443'; ctx.lineWidth = 3; ctx.stroke();
  for (const s of barSlots()) {
    const hop = pulseAt(hops[s.i] || -9, .35) * s.s * .3;
    if (glowId === s.it.id) { ctx.fillStyle = `rgb(255 210 80 / ${.35 + .25 * Math.sin(t * 6)})`; circle(ctx, s.x, s.y, s.s * .75); ctx.fill(); }
    ctx.fillStyle = '#ffe9b8'; circle(ctx, s.x, s.y - hop, s.s * .62); ctx.fill();
    if (s.it.e) emojiAt(ctx, s.it.e, s.x, s.y - hop, s.s);
    else drawComb(ctx, s.x, s.y - hop, s.s * .95, -.5);
  }
}

// os amigos passeando no morro do fundo, da direita pra esquerda
function drawParade(at, t) {
  const e = clock - at;
  if (e < 0 || e > PARADE_T) return;
  const y = H * sky.ground + H * .03, s = L.r * 1.15;
  PARADE.forEach((a, i) => {
    const x = W + s - (e - i * .6) * (W + s * 2) / (PARADE_T - PARADE.length * .6);
    if (x < -s || x > W + s) return;
    emojiAt(ctx, a, x, y - Math.abs(Math.sin(t * 6 + i)) * s * .15, s);
  });
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
