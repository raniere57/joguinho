'use strict';
// a pizza: massa que abre, molho e queijo pintados com o dedo, coberturas, forno e fatias.
// Tudo em unidades do raio da pizza aberta (1 = borda), desenhado com a origem no centro.

const TOPS = {
  calabresa: { name: 'Calabresa' },
  cogumelo: { name: 'Cogumelo' },
  azeitona: { name: 'Azeitona' },
  milho: { name: 'Milho' },
  tomate: { name: 'Tomate' },
  manjericao: { name: 'Manjericão' },
};
const TOP_IDS = Object.keys(TOPS);
const SLICES = 6, SPLAT_R = .27, CHEESE_R = .26, PAINT_STEP = .16;

// pontos pra medir quanto da pizza já tem molho/queijo
const COVER_PTS = [[0, 0]];
for (const [r, n] of [[.25, 6], [.45, 10], [.62, 14], [.76, 18]]) for (let i = 0; i < n; i++) COVER_PTS.push([Math.cos(i * TAU / n) * r, Math.sin(i * TAU / n) * r]);

const newPizza = () => ({ open: .42, sauce: [], cheese: [], tops: [], baked: 0, cuts: 0, eaten: [], seed: rand(0, 100) });

function coverage(list, r) {
  return COVER_PTS.filter(([x, y]) => list.some(s => Math.hypot(x - s.x, y - s.y) < r)).length / COVER_PTS.length;
}
function emptySpot(list, r) {
  const free = COVER_PTS.filter(([x, y]) => !list.some(s => Math.hypot(x - s.x, y - s.y) < r));
  return free.length ? pick(free) : [rand(-.5, .5), rand(-.5, .5)];
}

function addSauce(pz, x, y) { pz.sauce.push({ x, y, r: SPLAT_R * rand(.9, 1.15), at: clock, seed: rand(0, 9) }); }
function addCheese(pz, x, y) {
  const shreds = Array.from({ length: 11 }, () => {
    const a = rand(0, TAU), d = Math.sqrt(Math.random()) * CHEESE_R;
    return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, a: rand(0, Math.PI), len: rand(.05, .09), light: Math.random() < .4 };
  });
  pz.cheese.push({ x, y, at: clock, shreds });
}
function addTops(pz, id, n = 3) {
  const out = [];
  for (let k = 0; k < n; k++) {
    let best = null;
    for (let tries = 0; tries < 12; tries++) {
      const a = rand(0, TAU), d = Math.sqrt(Math.random()) * .7, p = { x: Math.cos(a) * d, y: Math.sin(a) * d };
      const near = Math.min(9, ...pz.tops.map(t => Math.hypot(t.x - p.x, t.y - p.y)));
      if (!best || near > best.near) best = { ...p, near };
      if (near > .24) break;
    }
    const t = { id, x: best.x, y: best.y, rot: rand(0, TAU), at: clock + k * .08 };
    pz.tops.push(t); out.push(t);
  }
  return out;
}

const mix = (a, b, k) => {
  const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(' ')})`;
};
const grow = (at, len = .25) => easeOutBack(Math.min(Math.max((clock - at) / len, 0), 1));

// ---------- coberturas (vetor, pra ficar igual no pote, no balão e na pizza) ----------
function drawTop(g, id, x, y, s, rot = 0) {
  if (s <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot);
  switch (id) {
    case 'calabresa':
      g.fillStyle = '#a8262e'; circle(g, 0, 0, s * .5); g.fill();
      g.fillStyle = '#d23c43'; circle(g, 0, 0, s * .42); g.fill();
      g.fillStyle = '#ffb3a8';
      for (const [dx, dy] of [[-.15, -.12], [.14, -.05], [-.02, .18], [.2, .2], [-.22, .12]]) { circle(g, dx * s, dy * s, s * .05); g.fill(); }
      break;
    case 'cogumelo':
      g.fillStyle = '#f4e7d2'; g.strokeStyle = '#a07a52'; g.lineWidth = s * .06;
      g.beginPath(); g.moveTo(-s * .45, 0); g.quadraticCurveTo(-s * .45, -s * .45, 0, -s * .45); g.quadraticCurveTo(s * .45, -s * .45, s * .45, 0);
      g.lineTo(s * .16, 0); g.lineTo(s * .16, s * .38); g.quadraticCurveTo(0, s * .46, -s * .16, s * .38); g.lineTo(-s * .16, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgb(160 122 82 / .45)'; g.lineWidth = s * .04;
      g.beginPath(); g.moveTo(-s * .36, -s * .05); g.quadraticCurveTo(0, -s * .3, s * .36, -s * .05); g.stroke();
      break;
    case 'azeitona':
      g.fillStyle = '#2f2b33'; circle(g, 0, 0, s * .36); g.fill();
      g.fillStyle = '#7a3a2c'; circle(g, 0, 0, s * .15); g.fill();
      g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.ellipse(-s * .14, -s * .17, s * .1, s * .05, -.6, 0, TAU); g.fill();
      break;
    case 'milho':
      for (const [dx, dy] of [[-.2, -.1], [.18, -.14], [0, .16]]) {
        g.fillStyle = '#c77d0c'; g.beginPath(); g.roundRect(dx * s - s * .17, dy * s - s * .15, s * .34, s * .32, s * .13); g.fill();
        g.fillStyle = '#ffd84a'; g.beginPath(); g.roundRect(dx * s - s * .13, dy * s - s * .13, s * .26, s * .23, s * .1); g.fill();
      }
      break;
    case 'tomate':
      g.fillStyle = '#e8352b'; circle(g, 0, 0, s * .48); g.fill();
      g.fillStyle = '#ff7a64'; circle(g, 0, 0, s * .38); g.fill();
      g.fillStyle = '#e8352b';
      for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * TAU / 3); g.fillRect(-s * .03, 0, s * .06, s * .38); g.restore(); }
      g.fillStyle = '#ffd98a';
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + Math.PI / 3; g.beginPath(); g.ellipse(Math.cos(a) * s * .22, Math.sin(a) * s * .22, s * .07, s * .04, a, 0, TAU); g.fill(); }
      break;
    case 'manjericao':
      g.fillStyle = '#2f9a45'; g.beginPath(); g.moveTo(-s * .45, 0);
      g.quadraticCurveTo(0, -s * .38, s * .45, 0); g.quadraticCurveTo(0, s * .38, -s * .45, 0); g.fill();
      g.strokeStyle = 'rgb(255 255 255 / .45)'; g.lineWidth = s * .04;
      g.beginPath(); g.moveTo(-s * .35, 0); g.lineTo(s * .38, 0); g.stroke();
      break;
  }
  g.restore();
}

// ---------- a pizza inteira ----------
function blob(g, x, y, r, seed) {
  g.moveTo(x + r, y);
  for (let i = 1; i <= 14; i++) {
    const a = i * TAU / 14, rr = r * (1 + .1 * Math.sin(seed + i * 2.3));
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
}

function drawPizzaBody(g, pz, R) {
  const d = pz.open * R, b = pz.baked;
  // massa: bolinha no começo, depois disco com borda
  if (pz.open < .99) {
    const grad = g.createRadialGradient(-d * .3, -d * .35, d * .1, 0, 0, d);
    grad.addColorStop(0, '#fff4dc'); grad.addColorStop(1, '#efc98b');
    g.fillStyle = grad; circle(g, 0, 0, d); g.fill();
    return;
  }
  g.fillStyle = mix('e9b86e', 'c9782e', b); circle(g, 0, 0, d); g.fill();
  g.fillStyle = mix('f3cf8e', 'e0a050', b); circle(g, 0, 0, d * .95); g.fill();
  g.fillStyle = mix('fbe5b8', 'f3cf8e', b); circle(g, 0, 0, d * .86); g.fill();
  g.save(); circle(g, 0, 0, d * .87); g.clip();
  if (pz.sauce.length) {
    g.fillStyle = mix('d93a2b', 'b8321f', b);
    if (pz.sauceFull) { circle(g, 0, 0, d * .8 * grow(pz.sauceFull, .4)); g.fill(); }   // fecha os buraquinhos
    g.beginPath();
    for (const s of pz.sauce) blob(g, s.x * R, s.y * R, s.r * R * grow(s.at), s.seed);
    g.fill();
    g.fillStyle = 'rgb(255 140 110 / .35)'; g.beginPath();
    for (const s of pz.sauce) blob(g, s.x * R - s.r * R * .2, s.y * R - s.r * R * .25, s.r * R * .35 * grow(s.at), s.seed + 3);
    g.fill();
  }
  if (b > .3) {   // queijo derretido embaixo das tirinhas
    g.globalAlpha = Math.min((b - .3) / .5, 1); g.fillStyle = '#ffd766'; g.beginPath();
    for (const c of pz.cheese) blob(g, c.x * R, c.y * R, CHEESE_R * R * 1.05, c.at * 10);
    g.fill(); g.globalAlpha = 1;
  }
  g.lineCap = 'round'; g.lineWidth = R * .045;
  for (const light of [false, true]) {
    g.strokeStyle = light ? mix('fff1b0', 'ffe58a', b) : mix('ffdc5e', 'f7b733', b);
    g.beginPath();
    for (const c of pz.cheese) {
      const k = grow(c.at, .2);
      if (k <= 0) continue;
      for (const s of c.shreds) {
        if (s.light !== light) continue;
        const sx = (c.x + (s.x - c.x) * k) * R, sy = (c.y + (s.y - c.y) * k) * R, l = s.len * R;
        g.moveTo(sx - Math.cos(s.a) * l, sy - Math.sin(s.a) * l); g.lineTo(sx + Math.cos(s.a) * l, sy + Math.sin(s.a) * l);
      }
    }
    g.stroke();
  }
  if (b > .6) {   // pintinhas douradas do forno
    g.fillStyle = `rgb(190 110 30 / ${(b - .6) * .9})`;
    for (let i = 0; i < 9; i++) { const a = pz.seed + i * 2.4, r = .15 + (i % 4) * .17; circle(g, Math.cos(a) * r * R, Math.sin(a) * r * R, R * .035); g.fill(); }
  }
  g.restore();
  for (const t of pz.tops) drawTop(g, t.id, t.x * R, t.y * R, R * .3 * grow(t.at, .3), t.rot);
}

// com cortes: cada fatia se afasta um pouquinho; as comidas somem
function drawPizza(g, pz, R, apart = 0) {
  if (!pz.cuts || pz.cuts < SLICES / 2) {
    drawPizzaBody(g, pz, R);
    g.strokeStyle = 'rgb(140 70 20 / .45)'; g.lineWidth = Math.max(1.5, R * .015);
    for (let k = 0; k < pz.cuts; k++) {
      const a = k * Math.PI / 3;
      g.beginPath(); g.moveTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(-Math.cos(a) * R, -Math.sin(a) * R); g.stroke();
    }
    return;
  }
  for (let i = 0; i < SLICES; i++) if (!pz.eaten[i]) drawSlice(g, pz, R, i, apart);
}

function drawSlice(g, pz, R, i, apart) {
  const mid = (i + .5) * TAU / SLICES;
  g.save(); g.translate(Math.cos(mid) * R * apart, Math.sin(mid) * R * apart);
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 1.02, i * TAU / SLICES, (i + 1) * TAU / SLICES); g.closePath(); g.clip();
  drawPizzaBody(g, pz, R);
  g.restore();
}

// ---------- utensílios ----------
function drawPin(g, x, y, s, roll = 0) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#b87a45';
  for (const d of [-1, 1]) { g.beginPath(); g.roundRect(d > 0 ? s * .5 : -s * .78, -s * .07, s * .28, s * .14, s * .07); g.fill(); }
  g.fillStyle = '#e8b57a'; g.beginPath(); g.roundRect(-s * .52, -s * .15, s * 1.04, s * .3, s * .15); g.fill();
  g.strokeStyle = 'rgb(160 100 50 / .35)'; g.lineWidth = s * .02;
  for (let i = 0; i < 5; i++) { const xx = ((i * .22 + roll) % 1.04) - .52; g.beginPath(); g.moveTo(xx * s, -s * .13); g.lineTo(xx * s, s * .13); g.stroke(); }
  g.fillStyle = 'rgb(255 255 255 / .4)'; g.beginPath(); g.roundRect(-s * .45, -s * .11, s * .9, s * .06, s * .03); g.fill();
  g.restore();
}

function drawBowl(g, x, y, s, fill) {
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, s * .5, s * .2, 0, 0, TAU); g.fill();
  g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, s * .42, s * .15, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, s * .5, s * .2, 0, 0, Math.PI); g.lineTo(x - s * .38, y + s * .35);
  g.quadraticCurveTo(x, y + s * .45, x + s * .38, y + s * .35); g.closePath(); g.fill();
  g.fillStyle = '#e6eef6'; g.beginPath(); g.ellipse(x, y + s * .36, s * .3, s * .06, 0, 0, TAU); g.fill();
}

function drawCutter(g, x, y, s, spin) {
  g.save(); g.translate(x, y);
  g.strokeStyle = '#d0463a'; g.lineWidth = s * .14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(s * .55, -s * .55); g.stroke();
  g.fillStyle = '#c9d3dc'; circle(g, 0, 0, s * .32); g.fill();
  g.strokeStyle = '#8b98a5'; g.lineWidth = s * .03;
  for (let i = 0; i < 3; i++) { const a = spin + i * TAU / 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s * .3, Math.sin(a) * s * .3); g.stroke(); }
  g.fillStyle = '#6b7885'; circle(g, 0, 0, s * .07); g.fill();
  g.restore();
}
