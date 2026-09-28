'use strict';
// a pizzaria: toldo, parede de azulejo, forno de tijolinho com fogo, balcão de madeira
// e o cliente bichinho que espera do lado, com o pedido num balão.

const CUSTOMERS = [
  { id: 'urso', e: '🐻', name: 'O ursinho', paw: '#a0673a', shirt: '#4fb4ff' },
  { id: 'coelho', e: '🐰', name: 'A coelhinha', paw: '#f6e9ea', shirt: '#ff8fc8' },
  { id: 'gato', e: '🐱', name: 'O gatinho', paw: '#f5b041', shirt: '#5ad16e' },
  { id: 'cachorro', e: '🐶', name: 'O cachorrinho', paw: '#d9a066', shirt: '#ffd23b' },
  { id: 'panda', e: '🐼', name: 'O panda', paw: '#3a3a46', shirt: '#ff8a3d' },
  { id: 'sapo', e: '🐸', name: 'O sapinho', paw: '#7fcf5a', shirt: '#b77cff' },
  { id: 'leao', e: '🦁', name: 'O leãozinho', paw: '#e9a83a', shirt: '#3fc4b8' },
  { id: 'porco', e: '🐷', name: 'O porquinho', paw: '#ffb3c6', shirt: '#4fb4ff' },
  { id: 'macaco', e: '🐵', name: 'O macaquinho', paw: '#a0673a', shirt: '#ff5a5f' },
];
const WALK_TIME = 1.3;

let L = {}, backLayer = null, frontLayer = null;
const guest = { c: CUSTOMERS[0], state: 'away', at: 0, hopAt: -99, eatAt: -99, x: 0 };

function layoutKitchen() {
  const port = H > W;
  const awning = port ? Math.max(meter.y + 30, H * .085) : H * .09;   // deitado: estrelinhas por cima do toldo
  const counterY = H * .5;
  const headS = port ? Math.min(W * .3, H * .14) : Math.min(H * .3, W * .14);
  const ow = port ? W * .44 : W * .15;
  L = {
    port, awning, counterY, headS,
    PR: port ? Math.min(W * .36, H * .17) : Math.min(H * .25, W * .2),
    pz: port ? [W * .5, H * .665] : [W * .5, H * .64],
    custX: port ? W * .75 : W * .86,
    oven: { x: port ? W * .27 : W * .12, base: counterY, w: ow, h: ow * .82 },
    tray: port ? { x: W * .04, y: H * .855, w: W * .92, h: H * .115 } : { x: W * .02, y: H * .57, w: W * .27, h: H * .38 },
  };
  const o = L.oven;
  o.mouth = { x: o.x, y: o.base - o.h * .02, w: o.w * .56, h: o.h * .5 };
  const headTop = counterY - headS * 1.12, br = headS * (port ? .56 : .5);
  L.bubble = port ? [L.custX - W * .03, headTop - br - headS * .15, br] : [W * .67, H * .3, br];
  backLayer = buildBack();
  frontLayer = buildFront();
}

// ---------- cenário parado ----------
function buildBack() {
  const [c, g] = layer(W, H), { awning, counterY } = L;
  g.fillStyle = '#fff4e2'; g.fillRect(0, 0, W, counterY);
  g.strokeStyle = 'rgb(220 180 140 / .35)'; g.lineWidth = 1.5;
  const tile = Math.max(26, W / 14);
  for (let y = awning; y < counterY; y += tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += tile) { g.beginPath(); g.moveTo(x, awning); g.lineTo(x, counterY); g.stroke(); }
  // faixa xadrez na parede
  const by = counterY - tile * 1.1;
  for (let x = 0, i = 0; x < W; x += tile / 2, i++) { g.fillStyle = i % 2 ? '#fff' : '#ff8a7a'; g.fillRect(x, by, tile / 2, tile / 4); }
  drawOvenBody(g);
  // toldo verde e vermelho com babado
  const n = Math.max(8, Math.round(W / 48)), sw = W / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fff' : (i % 4 ? '#ff5a4f' : '#4fbf5a'); g.fillRect(i * sw, 0, sw, awning); }
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#fff' : (i % 4 ? '#ff5a4f' : '#4fbf5a');
    g.beginPath(); g.arc(i * sw + sw / 2, awning, sw / 2, 0, Math.PI); g.fill();
  }
  g.fillStyle = 'rgb(0 0 0 / .06)'; g.fillRect(0, awning - 6, W, 6);
  return c;
}

function drawOvenBody(g) {
  const o = L.oven, x0 = o.x - o.w / 2, top = o.base - o.h, m = o.mouth;
  if (L.port) {   // chaminé
    g.fillStyle = '#9a5a44'; g.fillRect(o.x + o.w * .12, top - o.h * .28, o.w * .16, o.h * .4);
    g.fillStyle = '#7d4634'; g.fillRect(o.x + o.w * .1, top - o.h * .3, o.w * .2, o.h * .07);
  }
  g.fillStyle = '#c85a3e';
  g.beginPath(); g.moveTo(x0, o.base); g.lineTo(x0, top + o.h * .5);
  g.quadraticCurveTo(x0, top, o.x, top); g.quadraticCurveTo(x0 + o.w, top, x0 + o.w, top + o.h * .5); g.lineTo(x0 + o.w, o.base); g.fill();
  g.save(); g.clip();
  const bh = o.h / 9, bw = o.w / 6;
  g.strokeStyle = 'rgb(255 220 190 / .45)'; g.lineWidth = 2;
  for (let r = 0; r < 10; r++) {
    const y = o.base - r * bh;
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + o.w, y); g.stroke();
    for (let x = x0 + (r % 2) * bw / 2; x < x0 + o.w; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - bh); g.stroke(); }
  }
  g.fillStyle = 'rgb(255 255 255 / .12)'; g.beginPath(); g.ellipse(o.x - o.w * .2, top + o.h * .25, o.w * .22, o.h * .1, -.4, 0, TAU); g.fill();
  g.restore();
  // boca do forno (escura) com arco de tijolo claro
  g.fillStyle = '#f0b48a'; ovenMouthPath(g, m, m.w * .08); g.fill();
  g.fillStyle = '#2a1410'; ovenMouthPath(g, m, 0); g.fill();
  // placa
  const sy = top - (L.port ? o.h * .12 : o.h * .1);
  g.font = `800 ${Math.round(o.w * .13)}px ui-rounded, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (L.port) { g.fillStyle = '#ff5a4f'; g.fillText('PIZZA', o.x - o.w * .15, sy); }
}

function ovenMouthPath(g, m, pad) {
  const x0 = m.x - m.w / 2 - pad, x1 = m.x + m.w / 2 + pad, y1 = m.y, top = m.y - m.h - pad;
  g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, top + m.h * .45); g.quadraticCurveTo(x0, top, m.x, top);
  g.quadraticCurveTo(x1, top, x1, top + m.h * .45); g.lineTo(x1, y1); g.closePath();
}

function buildFront() {
  const [c, g] = layer(W, H), y = L.counterY;
  g.fillStyle = '#e7b27a'; g.fillRect(0, y, W, H - y);   // tampo de madeira visto de cima
  g.strokeStyle = 'rgb(160 100 50 / .22)'; g.lineWidth = 2;
  const plank = Math.max(40, H * .07);
  for (let py = y + plank; py < H; py += plank) { g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.stroke(); }
  g.fillStyle = '#c98a4f'; g.fillRect(0, y - 3, W, 10);
  g.fillStyle = 'rgb(255 255 255 / .45)'; g.fillRect(0, y - 3, W, 3);
  // tábua redonda da pizza
  const [px, py] = L.pz, R = L.PR;
  g.fillStyle = 'rgb(90 50 20 / .18)'; circle(g, px + 4, py + 7, R * 1.12); g.fill();
  g.fillStyle = '#c98a4b'; circle(g, px, py, R * 1.12); g.fill();
  g.fillStyle = '#d9a064'; circle(g, px, py, R * 1.06); g.fill();
  g.strokeStyle = 'rgb(160 100 50 / .25)'; g.lineWidth = 2;
  for (const k of [.4, .7]) { circle(g, px, py, R * k); g.stroke(); }
  // bandeja das ferramentas
  const t = L.tray;
  g.fillStyle = 'rgb(90 50 20 / .15)'; g.beginPath(); g.roundRect(t.x + 3, t.y + 5, t.w, t.h, 20); g.fill();
  g.fillStyle = '#fff8ec'; g.beginPath(); g.roundRect(t.x, t.y, t.w, t.h, 20); g.fill();
  return c;
}

// ---------- fogo (anima por cima da boca do forno) ----------
function drawFire(t, boost) {
  const m = L.oven.mouth, s = m.w * (.55 + boost * .25);
  ctx.save(); ovenMouthPath(ctx, m, 0); ctx.clip();
  const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.w * .8);
  glow.addColorStop(0, `rgb(255 150 50 / ${.55 + boost * .3})`); glow.addColorStop(1, 'rgb(255 120 40 / 0)');
  ctx.fillStyle = glow; ctx.fillRect(m.x - m.w, m.y - m.h, m.w * 2, m.h);
  for (const [dx, k, col] of [[-.25, .8, '#ff6a2a'], [.22, .75, '#ff6a2a'], [0, 1, '#ff8c2a'], [-.1, .6, '#ffd23b'], [.12, .55, '#ffd23b']]) {
    const h = s * k * (.8 + .2 * Math.sin(t * 9 + dx * 20)), w = s * .22 * k, x = m.x + dx * m.w;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, m.y);
    ctx.quadraticCurveTo(x - w * 1.1, m.y - h * .5, x + Math.sin(t * 7 + dx * 9) * w * .6, m.y - h);
    ctx.quadraticCurveTo(x + w * 1.1, m.y - h * .5, x + w, m.y); ctx.fill();
  }
  ctx.restore();
}

// relógio do forno: enche enquanto assa
function drawOvenTimer(k, t) {
  const o = L.oven, r = o.w * .1, x = o.x + o.w * .36, y = o.base - o.h * .78;
  ctx.fillStyle = '#fff'; circle(ctx, x, y, r * 1.15); ctx.fill();
  ctx.fillStyle = '#ffd23b'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.fill();
  ctx.strokeStyle = '#c85a3e'; ctx.lineWidth = r * .15; circle(ctx, x, y, r * 1.1); ctx.stroke();
  if (k >= 1) { ctx.globalAlpha = .5 + .5 * Math.sin(t * 12); emojiAt(ctx, '✨', x, y - r * 1.8, r * 1.6); ctx.globalAlpha = 1; }
}

function hitOven(x, y) {
  const o = L.oven;
  return Math.abs(x - o.x) < o.w * .55 && y > o.base - o.h * 1.05 && y < o.base + L.PR * .2;
}

// ---------- cliente ----------
function guestArrive(c) { Object.assign(guest, { c, state: 'in', at: clock, x: W + L.headS }); }

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

const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

function headPos() {
  const walking = guest.state === 'in' || guest.state === 'out';
  const hop = walking ? Math.abs(Math.sin((clock - guest.at) * 9)) * L.headS * .08 : pulseAt(guest.hopAt, .45) * L.headS * .25;
  return [guest.x, L.counterY - L.headS * .62 - hop + Math.sin(clock * 2) * L.headS * .015];
}
const mouthPos = () => { const [x, y] = headPos(); return [x - L.headS * .05, y + L.headS * .22]; };

function drawGuest() {
  if (guest.state === 'away') return;
  const [x, y] = headPos(), s = L.headS, c = guest.c;
  ctx.fillStyle = c.shirt;
  ctx.beginPath(); ctx.roundRect(x - s * .42, y + s * .3, s * .84, s * .8, s * .3); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; circle(ctx, x, y + s * .55, s * .06); ctx.fill(); circle(ctx, x, y + s * .75, s * .06); ctx.fill();
  const size = Math.round(s / 4) * 4, chew = pulseAt(guest.eatAt, .8);
  ctx.save(); ctx.translate(x, y); ctx.rotate(chew ? Math.sin(clock * 18) * .06 : Math.sin(clock * 1.3) * .04);
  ctx.scale(1 + chew * .05, 1 - chew * .05);
  ctx.drawImage(emojiSprite(c.e, size), -size / 2, -size / 2, size, size);
  ctx.restore();
  // guardanapo no pescoço enquanto espera a pizza
  if (guest.state === 'wait' || guest.state === 'happy') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - s * .2, y + s * .36); ctx.lineTo(x + s * .2, y + s * .36); ctx.lineTo(x, y + s * .62); ctx.fill();
    ctx.fillStyle = '#ff5a4f'; for (const d of [-1, 1]) { circle(ctx, x + d * s * .07, y + s * .44, s * .03); ctx.fill(); }
  }
}

function drawPaws() {
  if (guest.state === 'away') return;
  const [x] = headPos(), s = L.headS;
  ctx.fillStyle = guest.c.paw; ctx.strokeStyle = 'rgb(0 0 0 / .12)'; ctx.lineWidth = 2;
  for (const d of [-1, 1]) { circle(ctx, x + d * s * .3, L.counterY + 2, s * .11); ctx.fill(); ctx.stroke(); }
}

function hitGuest(x, y) {
  if (guest.state === 'away') return false;
  const [gx, gy] = headPos();
  return Math.hypot(x - gx, y - gy) < L.headS * .6;
}

// ---------- balão do pedido: uma pizzinha com as coberturas pedidas ----------
function drawOrderBubble(order, have, t, hintId) {
  if (guest.state !== 'wait' || !order.length) return;
  const [bx, by, r] = L.bubble, [hx, hy] = headPos();
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgb(90 50 20 / .2)'; ctx.shadowBlur = 12;
  circle(ctx, bx, by, r); ctx.fill();
  const tx = hx + (bx - hx) * .55, ty = hy - L.headS * .55 + (by + r - hy + L.headS * .55) * .35;
  circle(ctx, tx, ty, r * .12); ctx.fill();
  ctx.shadowBlur = 0;
  const pr = r * .78;
  ctx.fillStyle = '#e0a050'; circle(ctx, bx, by, pr); ctx.fill();
  ctx.fillStyle = '#d93a2b'; circle(ctx, bx, by, pr * .86); ctx.fill();
  ctx.fillStyle = '#fff3cf'; circle(ctx, bx, by, pr * .78); ctx.fill();
  const spots = order.length === 1 ? [[[-.3, -.3], [.35, -.1], [-.1, .35], [.3, .35]]]
    : order.length === 2 ? [[[-.4, -.2], [-.2, .35]], [[.35, -.3], [.3, .3]]]
    : [[[-.35, -.3]], [[.35, -.2]], [[0, .38]]];
  order.forEach((id, i) => {
    const pulse = id === hintId ? 1 + .18 * Math.sin(t * 8) : 1;
    for (const [dx, dy] of spots[i]) drawTop(ctx, id, bx + dx * pr, by + dy * pr, pr * .5 * pulse, dx * 3);
    if (have.includes(id)) {
      const [cx, cy] = spots[i][0], x = bx + cx * pr + pr * .28, y = by + cy * pr - pr * .22, u = pr * .5;
      ctx.fillStyle = '#4caf3c'; circle(ctx, x, y, u * .32); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = u * .1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - u * .14, y); ctx.lineTo(x - u * .03, y + u * .11); ctx.lineTo(x + u * .15, y - u * .12); ctx.stroke();
    }
  });
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
