'use strict';
// a rua: céu do cenário, calçada e asfalto, a casinha da missão (cores mudam a cada uma)
// e o caminhão de bombeiro, com a escada que gira e estica a partir do teto.

const HOUSES = [
  { wall: '#ffe3a3', roof: '#e8674f', door: '#8a5a34', trim: '#fff' },
  { wall: '#bfe6ff', roof: '#5a7fd6', door: '#e8674f', trim: '#fff' },
  { wall: '#ffd1e3', roof: '#b0507a', door: '#5fb04a', trim: '#fff' },
  { wall: '#d6f5c9', roof: '#4f9a4a', door: '#ffb020', trim: '#fff' },
];

let L = {}, houseLayer = null;

function layoutStreet() {
  const port = H > W;
  L = port ? {
    port, ground: .74, street: H * .83, r: Math.min(W * .1, H * .045),
    house: { x0: W * .36, x1: W * .96, top: H * .44, peak: H * .3, base: H * .81 },
    truck: { x: W * .02, y: H * .955, len: W * .6 }, stand: [W * .8, H * .975],
  } : {
    port, ground: .72, street: H * .84, r: H * .09,
    house: { x0: W * .44, x1: W * .74, top: H * .38, peak: H * .12, base: H * .83 },
    truck: { x: W * .02, y: H * .955, len: W * .34 }, stand: [W * .85, H * .975],
  };
  const t = L.truck;
  L.pivot = [t.x + t.len * .12, t.y - t.len * .41];
  L.restLen = t.len * .62;
}

// janelas e outros lugares da casa (onde pega fogo e onde o bichinho fica preso)
function houseSpots() {
  const { x0, x1, top, peak, base } = L.house, w = x1 - x0, h = base - top, cx = (x0 + x1) / 2;
  const ww = w * .24, wh = h * .25;
  return {
    upL: { x: x0 + w * .22, y: top + h * .3, w: ww, h: wh, win: true },
    upR: { x: x1 - w * .22, y: top + h * .3, w: ww, h: wh, win: true },
    loL: { x: x0 + w * .22, y: top + h * .72, w: ww, h: wh, win: true },
    loR: { x: x1 - w * .22, y: top + h * .72, w: ww, h: wh, win: true },
    attic: { x: cx, y: top - (top - peak) * .42, w: ww * .7, h: ww * .7, win: true, round: true },
    roof: { x: cx - w * .22, y: top - (top - peak) * .5, w: ww, h: wh, win: false },
  };
}

function buildHouse(style) {
  const [c, g] = layer(W, H), { x0, x1, top, peak, base } = L.house, w = x1 - x0, cx = (x0 + x1) / 2, sp = houseSpots();
  // calçada e rua
  g.fillStyle = '#d9d4cc'; g.fillRect(0, base - 4, W, L.street - base + 4);
  g.fillStyle = '#6e7480'; g.fillRect(0, L.street, W, H - L.street);
  g.fillStyle = '#ffe27a'; for (let x = 10; x < W; x += 60) g.fillRect(x, L.street + (H - L.street) * .55, 30, 5);
  // chaminé, parede e telhado
  g.fillStyle = '#b5584a'; g.fillRect(x1 - w * .28, peak + (top - peak) * .15, w * .1, (top - peak) * .6);
  g.fillStyle = style.wall; g.fillRect(x0, top, w, base - top);
  g.fillStyle = 'rgb(0 0 0 / .05)'; g.fillRect(x0, top, w * .08, base - top);
  g.fillStyle = style.roof; g.beginPath(); g.moveTo(x0 - w * .07, top + 4); g.lineTo(cx, peak); g.lineTo(x1 + w * .07, top + 4); g.closePath(); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .18)';
  for (let k = 1; k < 4; k++) { const y = peak + (top - peak) * k / 4, half = (w * .57) * k / 4; g.fillRect(cx - half, y, half * 2, 3); }
  // porta
  const dw = w * .2, dh = (base - top) * .33;
  g.fillStyle = style.door; g.beginPath(); g.roundRect(cx - dw / 2, base - dh, dw, dh, [dw * .5, dw * .5, 0, 0]); g.fill();
  g.fillStyle = '#ffd23b'; circle(g, cx + dw * .28, base - dh * .45, dw * .07); g.fill();
  // janelas (vidro; o fogo acende por cima)
  for (const s of Object.values(sp)) {
    if (!s.win) continue;
    g.fillStyle = style.trim;
    if (s.round) { circle(g, s.x, s.y, s.w * .62); g.fill(); g.fillStyle = '#9fd8f5'; circle(g, s.x, s.y, s.w * .5); g.fill(); continue; }
    g.beginPath(); g.roundRect(s.x - s.w * .6, s.y - s.h * .6, s.w * 1.2, s.h * 1.2, 6); g.fill();
    g.fillStyle = '#9fd8f5'; g.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    g.fillStyle = style.trim; g.fillRect(s.x - 2, s.y - s.h / 2, 4, s.h); g.fillRect(s.x - s.w / 2, s.y - 2, s.w, 4);
    g.fillStyle = style.roof; g.fillRect(s.x - s.w * .65, s.y + s.h * .6, s.w * 1.3, s.h * .12);   // floreira
  }
  return c;
}

// ---------- caminhão ----------
function drawTruck(t, sirenOn, ladder) {
  const { x, y, len: u } = L.truck, wy = y - u * .07;
  ctx.fillStyle = 'rgb(0 0 0 / .15)'; ctx.beginPath(); ctx.ellipse(x + u * .5, y, u * .52, u * .04, 0, 0, TAU); ctx.fill();
  // carroceria e cabine
  ctx.fillStyle = '#e63b2e';
  ctx.beginPath(); ctx.roundRect(x, y - u * .4, u * .74, u * .3, u * .03); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + u * .7, y - u * .36, u * .29, u * .26, [u * .08, u * .03, u * .03, u * .03]); ctx.fill();
  ctx.fillStyle = '#c92c21'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.roundRect(x + u * (.05 + i * .22), y - u * .34, u * .18, u * .13, u * .02); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y - u * .2, u * .99, u * .025);
  ctx.fillStyle = '#bfe8ff'; ctx.beginPath(); ctx.roundRect(x + u * .78, y - u * .32, u * .17, u * .1, [u * .05, u * .02, u * .02, u * .02]); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .6)'; ctx.fillRect(x + u * .8, y - u * .3, u * .03, u * .06);
  ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x + u * .94, y - u * .12, u * .07, u * .04);   // para-choque
  ctx.fillStyle = '#fff3a0'; circle(ctx, x + u * .97, y - u * .16, u * .02); ctx.fill();
  // carretel de mangueira
  ctx.fillStyle = '#ffd23b'; circle(ctx, x + u * .6, y - u * .28, u * .05); ctx.fill();
  ctx.fillStyle = '#e0a800'; circle(ctx, x + u * .6, y - u * .28, u * .022); ctx.fill();
  // sirene
  const blink = sirenOn && Math.sin(t * 20) > 0;
  ctx.fillStyle = blink ? '#4fb4ff' : '#1d6fd1'; ctx.beginPath(); ctx.roundRect(x + u * .76, y - u * .41, u * .07, u * .05, u * .015); ctx.fill();
  ctx.fillStyle = !blink && sirenOn ? '#ff4d4d' : '#ff8f8f'; ctx.beginPath(); ctx.roundRect(x + u * .84, y - u * .41, u * .07, u * .05, u * .015); ctx.fill();
  if (sirenOn) { ctx.fillStyle = `rgb(${blink ? '120 190 255' : '255 110 110'} / .3)`; circle(ctx, x + u * .835, y - u * .39, u * .12); ctx.fill(); }
  // rodas
  for (const wx of [x + u * .17, x + u * .82]) {
    ctx.fillStyle = '#2f2f3a'; circle(ctx, wx, wy, u * .075); ctx.fill();
    ctx.fillStyle = '#c9ced8'; circle(ctx, wx, wy, u * .04); ctx.fill();
  }
  // base da escada e a escada
  ctx.fillStyle = '#8f96a3'; ctx.beginPath(); ctx.roundRect(L.pivot[0] - u * .04, L.pivot[1] - u * .01, u * .08, u * .03, u * .01); ctx.fill();
  drawLadder(ladder.a, ladder.len);
}

function drawLadder(a, len) {
  const [px, py] = L.pivot, u = L.truck.len, gap = u * .035, ca = Math.cos(a), sa = Math.sin(a);
  ctx.save(); ctx.translate(px, py); ctx.rotate(a);
  ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = Math.max(3, u * .014); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -gap); ctx.lineTo(len, -gap); ctx.moveTo(0, gap); ctx.lineTo(len, gap); ctx.stroke();
  const step = u * .06;
  for (let d = step * .5; d < len; d += step) { ctx.beginPath(); ctx.moveTo(d, -gap); ctx.lineTo(d, gap); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = '#8f96a3'; circle(ctx, px, py, u * .02); ctx.fill();
  return [px + ca * len, py + sa * len];
}

function hitTruck(x, y) {
  const { x: tx, y: ty, len: u } = L.truck;
  return x > tx && x < tx + u && y > ty - u * .45 && y < ty;
}

// bombeiro: bicho com casaco amarelo e capacete vermelho
function drawHelmet(hx, hy, r) {
  ctx.fillStyle = '#e63b2e';
  ctx.beginPath(); ctx.ellipse(hx, hy - r * .55, r * .95, r * .62, 0, Math.PI, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx, hy - r * .5, r * 1.15, r * .16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23b'; star(ctx, hx, hy - r * .85, r * .2, -Math.PI / 2);
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; ctx.beginPath(); ctx.ellipse(hx - r * .4, hy - r * .85, r * .18, r * .08, -.5, 0, TAU); ctx.fill();
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
