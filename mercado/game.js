'use strict';
// Mercadinho: a lista mostra o que comprar. Toca no produto da prateleira e ele voa pro carrinho
// (qualquer um vale; os da lista ganham ✓). Com tudo da lista, o carrinho vai pro caixa:
// cada toque passa um item no leitor (bip! e a contagem), depois paga com três moedinhas.

const HINT_AFTER = 6, REPEAT_AFTER = 14, LIST_N = 3, COINS = 3, FLY = .55;

const VOZ = {
  vamos: 'Vamos fazer compras no mercadinho!',
  lista: 'Na lista tem...',
  isso: 'Isso! Tá na lista!',
  tudo: 'Pegamos tudo! Vamos pro caixa!',
  caixa: 'Toque no carrinho pra passar as compras!',
  pagar: 'Agora paga com as moedinhas!',
  nova: 'Vamos fazer mais compras?',
  ...Object.fromEntries(PRODUCTS.flatMap(p => [['t-' + p.id, p.name + '!'], ['e-' + p.id, 'E ' + p.name.toLowerCase() + '!']])),
  ...Object.fromEntries(['Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez'].map((n, i) => ['n' + (i + 1), n + '!'])),
};
const VOZ_B = { 'c-oi': 'Oi! Pode passar as compras!', 'c-obrigado': 'Obrigado! Volte sempre!', 'c-oba': 'Oba!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let phase = 'intro', phaseAt = 0, lastAct = 0, lastSaid = 0, trip = 0;
let list = { items: [], got: [], gotAt: [] }, cart = [], flyers = [], cartBumpAt = -9, bag = false;
let scanned = 0, bagN = 0, bagBumpAt = -9, flashAt = -9, drawerAt = -1, paid = 0, coins = [], cashHopAt = -9, lastOba = -99, lastIsso = -99;

meter.size = LIST_N + 1;
meter.onFull = () => { sfx.fanfare(); confettiRain(90); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const setPhase = p => { phase = p; phaseAt = lastAct = clock; };
const cashier = () => CASHIERS[trip % CASHIERS.length];

// ---------- lista e compras ----------
function newList() {
  const ids = [...PRODUCTS].sort(() => Math.random() - .5).slice(0, LIST_N).map(p => p.id);
  list = { items: ids, got: ids.map(() => false), gotAt: ids.map(() => 0) };
}

function sayList(queued) {
  talk('lista', queued);
  list.items.forEach((id, i) => say((i ? 'e-' : 't-') + id, VOZ[(i ? 'e-' : 't-') + id], true));
}

function cartPos() {
  const k = panK(), [ax, ay] = L.cart, [cx, cy] = L.cartC;
  return [ax + (W + cx - ax) * k, ay + (cy - ay) * k];
}

function take(slot) {
  if (clock - slot.takenAt < RESTOCK) return;
  slot.takenAt = clock; lastAct = clock;
  const [cx, cy] = cartPos(), [tx, ty] = cartSlot(Math.min(cart.length, CART_MAX - 1), cx, cy, L.cartW);
  flyers.push({ e: slot.p.e, id: slot.p.id, x0: slot.x, y0: slot.y - L.item * .45, tx, ty, at: clock, dur: FLY, kind: 'cart' });
  sfx.whoosh(); sfx.pop();
  talk('t-' + slot.p.id);
}

function intoCart(f) {
  cart = [...cart, f.id].slice(-CART_MAX); cartBumpAt = clock; sfx.boing();
  const i = list.items.findIndex((id, k) => id === f.id && !list.got[k]);
  if (i < 0) return;
  list.got[i] = true; list.gotAt[i] = clock;
  const { x, y, w, h } = L.list;
  launchStar(x + w / 2, y + h * (.2 + i * .27)); sfx.chime(); ring(x + w / 2, y + h / 2, w * .6);
  if (list.got.every(Boolean)) {
    setPhase('pronto'); talk('tudo', true);
    setTimeout(() => { setPhase('toCaixa'); panTo(W); sfx.whoosh(); }, 2200);
  } else if (clock - lastIsso > 3) { lastIsso = clock; talk('isso', true); }
}

// ---------- caixa ----------
function scanNext() {
  if (!cart.length || flyers.some(f => f.kind === 'scan' && clock - f.at < f.dur * .6)) return;
  lastAct = clock;
  const id = cart[0], [cx, cy] = cartPos(), [sx, sy] = cartSlot(0, cx, cy, L.cartW);
  cart = cart.slice(1); cartBumpAt = clock;
  flyers.push({ e: byId(id).e, id, x0: sx, y0: sy, tx: W + L.scanner[0], ty: L.scanner[1] - L.item * .45, at: clock, dur: .5, kind: 'scan' });
  sfx.whoosh();
}

function beep(f) {
  flashAt = clock; scanned++;
  sfx.bell(1760); setTimeout(() => sfx.click(), 60);
  talk('n' + Math.min(scanned, 10));
  flyers.push({ e: f.e, id: f.id, x0: f.tx, y0: f.ty, tx: W + L.bag[0], ty: L.bag[1] - L.item * .9, at: clock + .15, dur: .45, kind: 'bag' });
}

function intoBag() {
  bagN++; bagBumpAt = clock; sfx.pop();
  if (!cart.length && !flyers.some(f => f.kind !== 'bag' || clock < f.at)) setTimeout(startPaying, 600);
}

function startPaying() {
  if (phase !== 'caixa') return;
  setPhase('pagar'); paid = 0;
  coins = Array.from({ length: COINS }, (_, i) => ({ i, gone: false }));
  talk('pagar');
}

function payCoin(c) {
  c.gone = true; lastAct = clock;
  const [x, y] = coinSpot(c.i);
  flyers.push({ coin: true, x0: W + x, y0: y, tx: W + L.register[0], ty: L.register[1] - L.item * .2, at: clock, dur: .5, kind: 'coin' });
  sfx.whoosh();
}

function coinIn() {
  paid++; sfx.bell(2093); setTimeout(() => sfx.bell(2637), 90);
  talk('n' + paid);
  if (paid < COINS) return;
  setPhase('pago'); drawerAt = clock + .4;
  setTimeout(() => { sfx.chime(); launchStar(L.register[0], L.register[1] - L.item); }, 500);
  setTimeout(() => { cashHopAt = clock; talk('c-obrigado'); }, 1300);
  setTimeout(goBack, 4200);
}

function goBack() {
  bag = true; setPhase('volta'); panTo(0); sfx.whoosh();
  setTimeout(() => {
    const [x, y] = cartPos();
    burst(x, y - L.cartW * .5, L.cartW * .3, 45, 14); sfx.pop();
    bag = false; cart = []; trip++;
    scanned = 0; bagN = 0; drawerAt = -1; coins = [];
    newList(); setPhase('compras');
    talk('nova'); sayList(true);
  }, cam.dur * 1000 + 200);
}

// ---------- voos ----------
function updateFlyers() {
  const done = flyers.filter(f => clock - f.at >= f.dur);
  flyers = flyers.filter(f => clock - f.at < f.dur);
  for (const f of done) {
    if (f.kind === 'cart') intoCart(f);
    else if (f.kind === 'scan') beep(f);
    else if (f.kind === 'bag') intoBag();
    else if (f.kind === 'coin') coinIn();
  }
}

function drawFlyers(t) {
  for (const f of flyers) {
    const k = Math.min(Math.max((clock - f.at) / f.dur, 0), 1), e = k * k * (3 - 2 * k);
    const x = f.x0 + (f.tx - f.x0) * e, y = f.y0 + (f.ty - f.y0) * e - Math.sin(k * Math.PI) * L.item * .9;
    if (f.coin) drawCoin(x, y, L.item * .55, t * 10);
    else emojiAt(ctx, f.e, x, y, L.item * (1 - k * .3), k * 4);
  }
}

// ---------- toques ----------
function slotAt(x, y) {
  const cw = L.shelf.w / COLS;
  return slots.find(s => Math.abs(x - s.x) < cw * .48 && y < s.y + L.item * .15 && y > s.y - L.item * 1.15);
}

function hitCart(x, y) {
  const [cx, cy] = cartPos(), w = L.cartW;
  return x > cx - w * .5 && x < cx + w * .6 && y > cy - w * .75 && y < cy + 10;
}

function onTap(sx, sy) {
  const x = sx + cam.x, y = sy;
  if (phase === 'compras') {
    const s = slotAt(x, y);
    if (s) { take(s); return; }
    const { x: lx, y: ly, w, h } = L.list;
    if (x > lx && x < lx + w && y > ly && y < ly + h) { sayList(false); lastAct = clock; return; }
  }
  if (phase === 'caixa' && (hitCart(x, y) || Math.abs(x - W - L.scanner[0]) < L.item && Math.abs(y - L.scanner[1]) < L.item)) { scanNext(); return; }
  if (phase === 'pagar') {
    const c = coins.find(c => !c.gone && Math.hypot(x - W - coinSpot(c.i)[0], y - coinSpot(c.i)[1]) < L.item * .55);
    if (c) { payCoin(c); return; }
  }
  if (hitCart(x, y)) { cartBumpAt = clock; sfx.boing(); return; }
  if (cam.x > W * .5 && Math.hypot(x - W - L.cashier[0], y - L.cashier[1]) < L.headS * .6) {
    cashHopAt = clock; sfx.giggle();
    if (clock - lastOba > 3) { lastOba = clock; talk('c-oba'); }
    return;
  }
  sfx.pop(); ring(sx, sy, L.item * .3);
}

// ---------- dica ----------
function hintTarget() {
  if (phase === 'compras') {
    const i = list.got.findIndex(g => !g), s = i >= 0 && slots.find(s => s.p.id === list.items[i]);
    return s ? [s.x, s.y - L.item * .1] : null;
  }
  if (phase === 'caixa') { const [x, y] = cartPos(); return [x - cam.x, y - L.cartW * .3]; }
  if (phase === 'pagar') { const c = coins.find(c => !c.gone); return c ? coinSpot(c.i) : null; }
  return null;
}

function drawHint(t) {
  if (!['compras', 'caixa', 'pagar'].includes(phase) || clock - lastAct < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  const s = Math.max(L.item * .7, 40);
  emojiAt(ctx, '👆', h[0] + s * .1, h[1] + s * .55 + Math.abs(Math.sin(t * 4)) * s * .25, s);
}

function remind() {
  if (clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  if (phase === 'compras') sayList(false);
  else if (phase === 'caixa') talk('caixa');
  else if (phase === 'pagar') talk('pagar');
}

// ---------- ciclo ----------
function update(dt) {
  updateCam();
  if (started) {
    updateFlyers();
    if (phase === 'toCaixa' && clock - phaseAt > cam.dur) {
      setPhase('caixa'); cashHopAt = clock;
      talk('c-oi'); talk('caixa', true);
    }
    remind();
  }
  updateMeter(dt);
}

function drawAisle(t) {
  ctx.drawImage(aisleLayer, 0, 0, W, H);
  const hint = phase === 'compras' && clock - lastAct > HINT_AFTER ? list.items[list.got.findIndex(g => !g)] : null;
  for (const s of slots) {
    const back = clock - s.takenAt - RESTOCK;
    if (back < 0) continue;
    const k = easeOutBack(Math.min(back / .35, 1)), pulse = s.p.id === hint ? 1 + .12 * Math.sin(t * 8) : 1;
    emojiAt(ctx, s.p.e, s.x, s.y - L.item * .45 * k, L.item * k * pulse, Math.sin(t * 1.5 + s.x) * .03);
  }
  drawList(list, t, list.items.indexOf(hint));
}

function drawCheckout(t) {
  ctx.save(); ctx.translate(W, 0);
  ctx.drawImage(checkLayer, 0, 0, W, H);
  drawCashier(0, cashier(), t, cashHopAt);
  drawCounterFront();
  drawRegister(0, scanned, drawerAt);
  drawScanner(0, flashAt);
  drawBag(0, bagN, bagBumpAt);
  if (phase === 'pagar' || phase === 'pago') {
    drawPurse(0);
    for (const c of coins) if (!c.gone) { const [x, y] = coinSpot(c.i); drawCoin(x, y + Math.sin(t * 3 + c.i) * 3, L.item * .6, Math.sin(t * 2 + c.i) * .4); }
  }
  ctx.restore();
}

function render(t) {
  ctx.save(); ctx.translate(-cam.x, 0);
  if (cam.x < W) drawAisle(t);
  if (cam.x > 0) drawCheckout(t);
  const [cx, cy] = cartPos(), bump = pulseAt(cartBumpAt, .3) * Math.sin(t * 40) * 3;
  drawCart(cx, cy, L.cartW, cart, cam.x / (L.cartW * .05), bump, bag);
  drawFlyers(t);
  ctx.restore();
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
}

function resize() {
  const scene = panK() > .5 ? 1 : 0;
  fitCanvas();
  measureMeter();
  layoutShop();
  cam.x = cam.from = cam.to = scene * W;
}

boot({
  resize, update, render, onTap,
  onAmbient: () => {},   // dentro do mercado: sem passarinho
  onStart() {
    newList(); setPhase('compras');
    talk('vamos'); sayList(true);
  },
});
