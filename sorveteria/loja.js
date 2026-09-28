'use strict';
// a sorveteria: toldo listrado, janela pra rua, balcão com o freezer dos sabores
// e os clientes bichinhos que chegam, pedem num balão e comem o sorvete.

const CUSTOMERS = [
  { id: 'urso', e: '🐻', name: 'O ursinho', paw: '#a0673a', shirt: '#4fb4ff' },
  { id: 'coelho', e: '🐰', name: 'A coelhinha', paw: '#f6e9ea', shirt: '#ff8fc8' },
  { id: 'gato', e: '🐱', name: 'O gatinho', paw: '#f5b041', shirt: '#5ad16e' },
  { id: 'cachorro', e: '🐶', name: 'O cachorrinho', paw: '#d9a066', shirt: '#ff5a5f' },
  { id: 'panda', e: '🐼', name: 'O panda', paw: '#3a3a46', shirt: '#ffd23b' },
  { id: 'sapo', e: '🐸', name: 'O sapinho', paw: '#7fcf5a', shirt: '#b77cff' },
  { id: 'raposa', e: '🦊', name: 'A raposinha', paw: '#f08a3a', shirt: '#3fc4b8' },
  { id: 'porco', e: '🐷', name: 'O porquinho', paw: '#ffb3c6', shirt: '#4fb4ff' },
  { id: 'macaco', e: '🐵', name: 'O macaquinho', paw: '#a0673a', shirt: '#ff9a3c' },
];
const WALK_TIME = 1.3;

let L = {}, shopBack = null, shopFront = null;
const guest = { c: CUSTOMERS[0], state: 'away', at: 0, hopAt: -99, x: 0 };

function layoutShop() {
  const portrait = H > W;
  const U = portrait ? Math.min(W * .24, H * .115) : Math.min(W * .12, H * .15);
  const awning = Math.max(meter.y + 34, H * (portrait ? .1 : .16));
  const counterY = H * (portrait ? .55 : .7);
  L = {
    portrait, U, awning, counterY, headS: U * (portrait ? 1.75 : 1.9),
    holder: [portrait ? W * .29 : W * .52, counterY],
    custX: portrait ? W * .72 : W * .8,
    tools: portrait
      ? { x: W * .04, y: counterY + H * .05, w: W * .92, h: H * .955 - counterY - H * .05 }
      : { x: W * .025, y: awning + H * .05, w: W * .34, h: H * .95 - awning - H * .05 },
  };
  L.bubble = [L.custX - (portrait ? W * .02 : 0), portrait ? awning + L.headS * .45 : awning + L.headS * .38];
  shopBack = buildBack();
  shopFront = buildFront();
}

// ---------- cenário parado ----------
function buildBack() {
  const [c, g] = layer(W, H);
  g.fillStyle = '#d7f3e8'; g.fillRect(0, 0, W, H);   // parede
  g.fillStyle = 'rgb(255 255 255 / .5)';
  for (let y = L.awning + 20; y < L.counterY; y += 34) for (let x = (y / 34 % 2) * 17; x < W; x += 34) { circle(g, x, y, 3); g.fill(); }
  // janela pra rua
  const wx = W * (L.portrait ? .06 : .4), ww = W * (L.portrait ? .88 : .56), wy = L.awning + H * .03, wh = L.counterY - wy - H * .015;
  const sky = g.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#8fd8ff'); sky.addColorStop(1, '#e6f8ff');
  g.fillStyle = sky; g.beginPath(); g.roundRect?.(wx, wy, ww, wh, 18); g.fill();
  g.save(); g.clip();
  g.fillStyle = '#fff';
  for (const [fx, fy, r] of [[.2, .22, .08], [.26, .18, .1], [.32, .23, .07], [.72, .3, .07], [.78, .26, .09]]) { circle(g, wx + ww * fx, wy + wh * fy, r * ww * .6); g.fill(); }
  g.fillStyle = '#9fe07a'; g.beginPath(); g.ellipse(wx + ww * .5, wy + wh * 1.05, ww * .8, wh * .35, 0, 0, TAU); g.fill();
  for (const fx of [.12, .88]) {   // arvorezinhas
    g.fillStyle = '#a0673a'; g.fillRect(wx + ww * fx - 4, wy + wh * .55, 8, wh * .3);
    g.fillStyle = '#5fc46a'; circle(g, wx + ww * fx, wy + wh * .5, wh * .16); g.fill();
    circle(g, wx + ww * fx - wh * .1, wy + wh * .58, wh * .11); g.fill(); circle(g, wx + ww * fx + wh * .1, wy + wh * .58, wh * .11); g.fill();
  }
  g.restore();
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.roundRect?.(wx, wy, ww, wh, 18); g.stroke();
  // toldo listrado com babado
  const n = Math.max(8, Math.round(W / 48)), sw = W / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fff' : '#ff7aa8'; g.fillRect(i * sw, 0, sw, L.awning); }
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#fff' : '#ff7aa8';
    g.beginPath(); g.arc(i * sw + sw / 2, L.awning, sw / 2, 0, Math.PI); g.fill();
  }
  g.fillStyle = 'rgb(0 0 0 / .06)'; g.fillRect(0, L.awning - 6, W, 6);
  return c;
}

function buildFront() {
  const [c, g] = layer(W, H);
  const y = L.counterY, top = L.U * .22;
  g.fillStyle = '#ffc1d8'; g.fillRect(0, y, W, H - y);   // frente do balcão
  g.fillStyle = 'rgb(255 255 255 / .35)';
  for (let x = 0; x < W; x += 44) g.fillRect(x + 6, y + top + 10, 30, H - y);
  g.fillStyle = '#f5d3a1'; g.fillRect(0, y - 4, W, top);   // tampo
  g.fillStyle = '#e8b877'; g.fillRect(0, y + top - 6, W, 6);
  g.fillStyle = 'rgb(255 255 255 / .5)'; g.fillRect(0, y - 4, W, 3);
  // freezer dos sabores, com vidro
  const t = L.tools;
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(t.x - 8, t.y - 8, t.w + 16, t.h + 16, 26); g.fill();
  g.fillStyle = '#dff1fb'; g.beginPath(); g.roundRect?.(t.x, t.y, t.w, t.h, 20); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .6)';
  g.beginPath(); g.moveTo(t.x + t.w * .08, t.y); g.lineTo(t.x + t.w * .2, t.y); g.lineTo(t.x + t.w * .05, t.y + t.h); g.lineTo(t.x, t.y + t.h * .85); g.closePath(); g.fill();
  return c;
}

// ---------- cliente ----------
function guestArrive(c) {
  Object.assign(guest, { c, state: 'in', at: clock, x: W + L.headS });
}

function updateGuest() {
  const e = clock - guest.at;
  if (guest.state === 'in') {
    const p = Math.min(e / WALK_TIME, 1);
    guest.x = W + L.headS + (L.custX - W - L.headS) * (1 - (1 - p) ** 2);
    if (p >= 1) { guest.state = 'wait'; guest.at = clock; guestArrived(); }
  } else if (guest.state === 'out') {
    guest.x = L.custX + (W + L.headS * 1.2 - L.custX) * Math.min(e / WALK_TIME, 1) ** 2;
    if (e > WALK_TIME) { guest.state = 'away'; guestGone(); }
  } else if (guest.state !== 'away') guest.x = L.custX;
}

function headPos() {
  const walking = guest.state === 'in' || guest.state === 'out';
  const hop = walking ? Math.abs(Math.sin((clock - guest.at) * 9)) * L.headS * .08 : pulseAt(guest.hopAt, .45) * L.headS * .25;
  const breathe = Math.sin(clock * 2) * L.headS * .015;
  return [guest.x, L.counterY - L.headS * .62 - hop + breathe];
}

const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

function drawGuest() {
  if (guest.state === 'away') return;
  const [x, y] = headPos(), s = L.headS, c = guest.c;
  ctx.fillStyle = c.shirt;   // corpinho (o balcão esconde a parte de baixo)
  ctx.beginPath(); ctx.roundRect?.(x - s * .42, y + s * .3, s * .84, s * .8, s * .3); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; circle(ctx, x, y + s * .55, s * .06); ctx.fill(); circle(ctx, x, y + s * .75, s * .06); ctx.fill();
  const size = Math.round(s / 4) * 4, tilt = guest.state === 'eat' ? -.18 + Math.sin(clock * 7) * .07 : Math.sin(clock * 1.3) * .04;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  ctx.drawImage(emojiSprite(c.e, size), -size / 2, -size / 2, size, size);
  ctx.restore();
}

// patinhas por cima do balcão (ou segurando o sorvete)
function drawPaws(holding) {
  if (guest.state === 'away') return;
  const [x] = headPos(), s = L.headS;
  ctx.fillStyle = guest.c.paw; ctx.strokeStyle = 'rgb(0 0 0 / .12)'; ctx.lineWidth = 2;
  const pts = holding ? [[holding[0] - s * .14, holding[1]], [holding[0] + s * .14, holding[1]]] : [[x - s * .3, L.counterY], [x + s * .3, L.counterY]];
  for (const [px, py] of pts) { circle(ctx, px, py, s * .11); ctx.fill(); ctx.stroke(); }
}

function hitGuest(x, y) {
  if (guest.state === 'away') return false;
  const [gx, gy] = headPos();
  return Math.hypot(x - gx, y - gy) < L.headS * .55;
}

// ---------- balão do pedido ----------
function drawBubble(order, done, t, hintI) {
  if (guest.state !== 'wait' || !order) return;
  const [bx, by] = L.bubble, [hx, hy] = headPos(), r = L.U * .72;
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgb(60 40 90 / .18)'; ctx.shadowBlur = 12;
  for (const [dx, dy, k] of [[-.55, .1, .62], [.55, .1, .62], [0, -.3, .7], [0, .35, .66], [-.3, -.1, .6], [.3, -.1, .6]]) { circle(ctx, bx + dx * r, by + dy * r, k * r); ctx.fill(); }
  circle(ctx, (bx + hx) / 2 - r * .5, (by + r + hy - L.headS * .4) / 2 + r * .1, r * .14); ctx.fill();
  ctx.shadowBlur = 0;
  // o sorvete pedido, pequenininho
  const u = r * .72, mini = { base: 'cone', scoops: order.map(f => ({ f, at: -99 })) };
  const baseY = by + r * .9 - (order.length - 1) * u * .18;
  ctx.save(); ctx.translate(bx, baseY);
  drawCone(ctx, u);
  order.forEach((f, i) => {
    const [sx, sy] = scoopCenter(mini, u, i), k = i === hintI ? 1 + .15 * Math.sin(t * 8) : 1;
    drawScoop(ctx, sx, sy, u * SCOOP_R * k, FLAVORS[f]);
    if (done[i]?.f === f) {   // já colocou esse sabor: tiquinho verde
      ctx.fillStyle = '#4caf3c'; circle(ctx, sx + u * .42, sy, u * .16); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = u * .06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx + u * .35, sy); ctx.lineTo(sx + u * .41, sy + u * .06); ctx.lineTo(sx + u * .5, sy - u * .07); ctx.stroke();
    }
  });
  ctx.restore();
}
