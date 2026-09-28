'use strict';
// carrinho, lista de compras, moça do caixa, maquininha, leitor, sacola e moedinhas

const CASHIERS = [
  { e: '🐱', shirt: '#ff5a4f' }, { e: '🐶', shirt: '#4fb4ff' }, { e: '🐼', shirt: '#5ad16e' }, { e: '🐰', shirt: '#b77cff' },
];

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

// ---------- carrinho: (x, y) = chão entre as rodinhas ----------
function cartBasket(x, y, w) { return { x0: x - w * .42, x1: x + w * .38, top: y - w * .62, bot: y - w * .22 }; }

function cartSlot(i, x, y, w) {
  const b = cartBasket(x, y, w), row = Math.floor(i / 5), col = i % 5;
  return [b.x0 + (b.x1 - b.x0) * (col + .5) / 5, b.top + w * (.02 - row * .12) + (col % 2) * w * .03];
}

function drawCart(x, y, w, items, spin, rattle, bag) {
  const b = cartBasket(x, y, w), s = w * .19;
  ctx.save(); ctx.translate(rattle, 0);
  ctx.strokeStyle = '#8fa2b3'; ctx.lineWidth = w * .03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(b.x1, b.top - w * .02); ctx.lineTo(b.x1 + w * .12, b.top - w * .2); ctx.lineTo(b.x1 + w * .22, b.top - w * .2); ctx.stroke();   // alça
  ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.roundRect(b.x1 + w * .14, b.top - w * .25, w * .12, w * .08, w * .03); ctx.fill();
  // o que tem dentro aparece por cima da borda de trás
  if (bag) emojiAt(ctx, '🛍️', (b.x0 + b.x1) / 2, b.top - w * .08, w * .5);
  items.forEach((id, i) => { const [ix, iy] = cartSlot(i, x, y, w); emojiAt(ctx, byId(id).e, ix, iy, s * 1.3, (i % 3 - 1) * .2); });
  // cesto aramado
  ctx.fillStyle = 'rgb(200 225 240 / .55)';
  ctx.beginPath(); ctx.moveTo(b.x0 - w * .04, b.top); ctx.lineTo(b.x1 + w * .02, b.top); ctx.lineTo(b.x1 - w * .04, b.bot); ctx.lineTo(b.x0 + w * .04, b.bot); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8fa2b3'; ctx.lineWidth = w * .018; ctx.stroke();
  ctx.lineWidth = w * .01;
  for (let i = 1; i < 6; i++) { const f = i / 6; ctx.beginPath(); ctx.moveTo(b.x0 - w * .04 + (b.x1 - b.x0 + w * .06) * f, b.top); ctx.lineTo(b.x0 + w * .04 + (b.x1 - b.x0 - w * .08) * f, b.bot); ctx.stroke(); }
  for (let i = 1; i < 3; i++) { const yy = b.top + (b.bot - b.top) * i / 3; ctx.beginPath(); ctx.moveTo(b.x0 - w * .04 + w * .027 * i, yy); ctx.lineTo(b.x1 + w * .02 - w * .02 * i, yy); ctx.stroke(); }
  ctx.fillStyle = '#ff5a4f'; ctx.fillRect(b.x0, b.top - w * .01, b.x1 - b.x0, w * .025);
  // pernas e rodinhas
  ctx.strokeStyle = '#8fa2b3'; ctx.lineWidth = w * .02;
  ctx.beginPath(); ctx.moveTo(b.x0 + w * .06, b.bot); ctx.lineTo(b.x0 + w * .08, y - w * .06); ctx.moveTo(b.x1 - w * .06, b.bot); ctx.lineTo(b.x1 - w * .08, y - w * .06);
  ctx.moveTo(b.x0 + w * .06, y - w * .08); ctx.lineTo(b.x1 - w * .06, y - w * .08); ctx.stroke();
  for (const wx of [b.x0 + w * .08, b.x1 - w * .08]) {
    ctx.fillStyle = '#3d4a57'; circle(ctx, wx, y - w * .04, w * .045); ctx.fill();
    ctx.strokeStyle = '#9fb0bf'; ctx.lineWidth = w * .01;
    ctx.beginPath(); ctx.moveTo(wx, y - w * .04); ctx.lineTo(wx + Math.cos(spin) * w * .035, y - w * .04 + Math.sin(spin) * w * .035); ctx.stroke();
  }
  ctx.restore();
}

// ---------- lista de compras presa na prancheta ----------
function drawList(list, t, hintI) {
  const { x, y, w, h } = L.list, n = list.items.length;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-.03);
  ctx.fillStyle = 'rgb(90 60 20 / .15)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 4, -h / 2 + 6, w, h, 12); ctx.fill();
  ctx.fillStyle = '#c98a4b'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fffdf4'; ctx.beginPath(); ctx.roundRect(-w / 2 + w * .07, -h / 2 + h * .1, w * .86, h * .86, 6); ctx.fill();
  ctx.fillStyle = '#b8c6d2'; ctx.beginPath(); ctx.roundRect(-w * .2, -h / 2 - h * .02, w * .4, h * .08, 5); ctx.fill();
  const rowH = h * .8 / n, s = Math.min(rowH * .78, w * .5);
  list.items.forEach((id, i) => {
    const cy = -h / 2 + h * .15 + rowH * (i + .5), cx = -w * .1, pulse = i === hintI ? 1 + .15 * Math.sin(t * 8) : 1;
    ctx.globalAlpha = list.got[i] ? .45 : 1;
    emojiAt(ctx, byId(id).e, cx, cy, s * pulse);
    ctx.globalAlpha = 1;
    const bx = w * .3, bs = s * .36;
    ctx.strokeStyle = '#8fa2b3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx - bs / 2, cy - bs / 2, bs, bs, 4); ctx.stroke();
    if (list.got[i]) {
      const k = easeOutBack(Math.min((clock - list.gotAt[i]) / .3, 1));
      ctx.strokeStyle = '#4caf3c'; ctx.lineWidth = bs * .22 * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx - bs * .4, cy); ctx.lineTo(bx - bs * .05, cy + bs * .35); ctx.lineTo(bx + bs * .55, cy - bs * .55); ctx.stroke();
    }
  });
  ctx.restore();
}

// ---------- caixa: moça, maquininha, leitor, sacola ----------
function drawCashier(ox, who, t, hopAt) {
  const [x0, y0] = L.cashier, s = L.headS, x = ox + x0, hop = pulseAt(hopAt, .45) * s * .2;
  const y = y0 - hop + Math.sin(t * 2) * s * .015;
  ctx.fillStyle = who.shirt; ctx.beginPath(); ctx.roundRect(x - s * .45, y + s * .3, s * .9, L.counterY - y, s * .3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x + s * .08, y + s * .5, s * .28, s * .14, 4); ctx.fill();   // crachá
  ctx.fillStyle = who.shirt; ctx.fillRect(x + s * .12, y + s * .55, s * .2, s * .04);
  emojiAt(ctx, who.e, x, y, s, Math.sin(t * 1.3) * .04);
  ctx.fillStyle = who.shirt;   // bonezinho
  ctx.beginPath(); ctx.ellipse(x, y - s * .36, s * .34, s * .16, 0, Math.PI, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s * .26, y - s * .36, s * .22, s * .05, 0, 0, TAU); ctx.fill();
}

function drawRegister(ox, count, drawerAt) {
  const [x0, y] = L.register, s = L.item * 1.1, x = ox + x0;
  ctx.fillStyle = '#e6eef3'; ctx.beginPath(); ctx.roundRect(x - s * .6, y - s * .75, s * 1.2, s * .75, s * .12); ctx.fill();
  ctx.fillStyle = '#3d4a57'; ctx.beginPath(); ctx.roundRect(x - s * .45, y - s * 1.25, s * .9, s * .45, s * .08); ctx.fill();
  ctx.fillStyle = '#6dff9a'; ctx.font = `800 ${Math.round(s * .32)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(count), x, y - s * 1.02);
  ctx.fillStyle = '#b8c6d2';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { ctx.beginPath(); ctx.roundRect(x - s * .45 + c * s * .24, y - s * .62 + r * s * .2, s * .18, s * .13, 3); ctx.fill(); }
  const open = drawerAt > 0 ? Math.min((clock - drawerAt) / .3, 1) : 0;
  if (open > 0) {
    ctx.fillStyle = '#c9d3dc'; ctx.fillRect(x - s * .5, y - s * .1, s, s * .25 * open);
    ctx.fillStyle = '#ffd23b'; for (let i = 0; i < 3; i++) { circle(ctx, x - s * .25 + i * s * .25, y + s * .05 * open, s * .07); ctx.fill(); }
    // recibo saindo
    const k = Math.min((clock - drawerAt - .3) / .8, 1);
    if (k > 0) {
      ctx.fillStyle = '#fff'; ctx.fillRect(x + s * .15, y - s * 1.25 - s * .6 * k, s * .25, s * .6 * k);
      ctx.fillStyle = '#b8c6d2'; for (let i = 0; i < 4; i++) ctx.fillRect(x + s * .19, y - s * 1.2 - s * .6 * k + i * s * .1, s * .17, 2);
    }
  }
}

function drawScanner(ox, flashAt) {
  const [x0, y] = L.scanner, s = L.item, x = ox + x0, f = pulseAt(flashAt, .35);
  ctx.fillStyle = '#2b3440'; ctx.beginPath(); ctx.roundRect(x - s * .5, y - s * .08, s, s * .2, 5); ctx.fill();
  ctx.fillStyle = f ? `rgb(255 60 60 / ${.4 + f * .6})` : 'rgb(255 60 60 / .35)';
  ctx.beginPath(); ctx.roundRect(x - s * .4, y - s * .05, s * .8, s * .1, 4); ctx.fill();
  if (f) { ctx.fillStyle = `rgb(255 80 80 / ${f * .35})`; ctx.beginPath(); ctx.moveTo(x - s * .35, y); ctx.lineTo(x + s * .35, y); ctx.lineTo(x + s * .15, y - s * 1.2); ctx.lineTo(x - s * .15, y - s * 1.2); ctx.fill(); }
}

function drawBag(ox, n, bumpAt) {
  const [x0, y] = L.bag, s = L.item * 1.3, x = ox + x0, sq = pulseAt(bumpAt, .3) * .1;
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq, 1 - sq);
  ctx.fillStyle = '#e9c28f'; ctx.beginPath(); ctx.moveTo(-s * .45, 0); ctx.lineTo(-s * .38, -s * .9); ctx.lineTo(s * .38, -s * .9); ctx.lineTo(s * .45, 0); ctx.fill();
  ctx.fillStyle = '#d9ab70'; ctx.beginPath(); ctx.moveTo(-s * .38, -s * .9); ctx.lineTo(-s * .3, -s * .8); ctx.lineTo(s * .3, -s * .8); ctx.lineTo(s * .38, -s * .9); ctx.fill();
  ctx.strokeStyle = '#b8864a'; ctx.lineWidth = s * .05;
  ctx.beginPath(); ctx.arc(0, -s * .9, s * .18, Math.PI, TAU); ctx.stroke();
  ctx.fillStyle = '#ff5a4f'; circle(ctx, 0, -s * .45, s * .12); ctx.fill();
  if (n) { ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(s * .15)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, -s * .44); }
  ctx.restore();
}

// ---------- moedinhas no porta-moedas ----------
function coinSpot(i) { const [x, y] = L.purse, s = L.item; return [x + (i - 1) * s * .75, y - s * .55 - (i % 2) * s * .2]; }

function drawCoin(x, y, s, spin = 0) {
  const w = Math.abs(Math.cos(spin));
  ctx.fillStyle = '#e0a800'; ctx.beginPath(); ctx.ellipse(x, y + s * .05, s * .5 * Math.max(w, .15), s * .5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23b'; ctx.beginPath(); ctx.ellipse(x, y, s * .46 * Math.max(w, .12), s * .46, 0, 0, TAU); ctx.fill();
  if (w > .5) {
    ctx.strokeStyle = '#e0a800'; ctx.lineWidth = s * .05; ctx.beginPath(); ctx.ellipse(x, y, s * .34 * w, s * .34, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#c98a00'; star(ctx, x, y, s * .18 * w, -Math.PI / 2);
  }
}

function drawPurse(ox) {
  const [x0, y] = L.purse, s = L.item * 1.4, x = ox + x0;
  ctx.fillStyle = '#ff8fc0'; ctx.beginPath(); ctx.roundRect(x - s * .7, y - s * .35, s * 1.4, s * .6, s * .2); ctx.fill();
  ctx.fillStyle = '#ffb3d6'; ctx.beginPath(); ctx.roundRect(x - s * .7, y - s * .35, s * 1.4, s * .18, [s * .2, s * .2, 4, 4]); ctx.fill();
  ctx.fillStyle = '#ffd23b'; circle(ctx, x - s * .08, y - s * .38, s * .06); ctx.fill(); circle(ctx, x + s * .08, y - s * .38, s * .06); ctx.fill();
}
