'use strict';
// Pizzaria: um bichinho chega e pede uma pizza (as coberturas aparecem no balão).
// A criança abre a massa, passa molho e queijo com o dedo, põe as coberturas, leva ao forno,
// corta e dá os pedaços pro bichinho. Nunca tem erro: cobertura diferente do pedido também vale.

const HINT_AFTER = 6, REPEAT_AFTER = 14, ROLLS = 5, COVER_DONE = .62, MOVE_TIME = .8, BAKE_TIME = 4.5;
const CUT_TIME = .45, SLICE_FLY = .6, THANKS_TIME = 2.4, AUTO_OVEN = 5;

const VOZ = {
  vamos: 'Vamos abrir a pizzaria!',
  massa: 'Aperte a massa pra abrir bem redondinha!',
  molho: 'Agora o molho de tomate! Passe o dedo na massa.',
  queijo: 'Agora o queijo! Espalha bastante!',
  cobertura: 'Agora as coberturas!',
  forno: 'Agora pro forno! Toque no forno.',
  assando: 'Está assando! Toque no fogo pra esquentar!',
  pronta: 'Plim! A pizza está pronta!',
  cortar: 'Vamos cortar! Toque na pizza.',
  comer: 'Agora dá um pedaço pro nosso amigo!',
  parabens: 'Você é uma ótima pizzaiola! Parabéns!',
  ...Object.fromEntries(CUSTOMERS.map(c => ['quer-' + c.id, `${c.name} quer pizza de...`])),
  ...Object.fromEntries(TOP_IDS.flatMap(id => [['t-' + id, TOPS[id].name + '!'], ['e-' + id, 'E ' + TOPS[id].name.toLowerCase() + '!']])),
};
const VOZ_B = {
  'c-oi': 'Oi! Eu quero uma pizza!', 'c-oba': 'Oba!', nham: 'Nham, nham!', 'c-tchau': 'Tchau, tchau!',
  'c-jeitinho': 'Do jeitinho que eu queria! Obrigado!', 'c-obrigado': 'Hummm! Que pizza gostosa! Obrigado!',
};
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let phase = 'idle', phaseAt = 0, actedAt = 0, saidAt = 0, nextGuestAt = 0, served = 0, queue = [];
let pz = newPizza(), order = [], jarTaps = 0, press = null, rollAt = -9, boostAt = -9, bakeK = 0;
let cutAt = -9, flyingSlices = [], autoFill = null, lastOba = -99, toolTaps = {};

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare(); confettiRain(); guest.hopAt = clock;
  say('parabens', VOZ.parabens, true);
};

const talk = (line, queued = false) => { saidAt = clock; say(line, VOZ[line] || VOZ_B[line], queued); };

// ---------- fluxo ----------
function setPhase(p) { phase = p; phaseAt = actedAt = clock; }

function nextGuest() {
  if (!queue.length) queue = [...CUSTOMERS].sort(() => Math.random() - .5);
  const n = served < 1 ? 1 : served < 3 ? 2 : pick([1, 2, 2, 3]);
  order = [...TOP_IDS].sort(() => Math.random() - .5).slice(0, n);
  setPhase('arrive');
  guestArrive(queue.pop());
}

function guestArrived() {
  talk('c-oi');
  setPhase('massa');
  talk('massa', true);
}

function guestGone() {
  pz = newPizza(); order = []; jarTaps = 0; flyingSlices = [];
  burst(L.pz[0], L.pz[1], L.PR * .4, 40, 10); sfx.pop();
  setPhase('idle'); nextGuestAt = clock + 1;
}

function sayOrder(queued) {
  talk('quer-' + guest.c.id, queued);
  order.forEach((id, i) => say((i ? 'e-' : 't-') + id, VOZ[(i ? 'e-' : 't-') + id], true));
}

function stepDone(next, line, delay = .8) {
  const [x, y] = L.pz;
  ring(x, y, L.PR * 1.1); sfx.chime();
  setPhase('pausa');
  setTimeout(() => {
    setPhase(next);
    if (next === 'cobertura') { talk('cobertura'); sayOrder(true); }
    else talk(line);
  }, delay * 1000);
}

function remind() {
  if (clock - Math.max(actedAt, saidAt) < REPEAT_AFTER) return;
  saidAt = clock;
  if (phase === 'cobertura') { if (placed().length) talk('forno'); else sayOrder(false); }
  else talk(phase);
}

const placed = () => [...new Set(pz.tops.map(t => t.id))];

// ---------- cada passo ----------
function roll() {
  if (pz.open >= 1) return;
  actedAt = rollAt = clock;
  pz.open = Math.min(1, pz.open + (1 - .42) / ROLLS);
  sfx.whoosh(); sfx.boing();
  if (pz.open >= 1) { burst(L.pz[0], L.pz[1], L.PR * .8, 40, 16); stepDone('molho', 'molho'); }
}

function paint(lx, ly, fromTap) {
  const d = Math.hypot(lx, ly);
  if (d > 1.05) return false;
  if (d > .78) { lx *= .78 / d; ly *= .78 / d; }
  const sauce = phase === 'molho', list = sauce ? pz.sauce : pz.cheese;
  if (!fromTap && press?.last && Math.hypot(lx - press.last[0], ly - press.last[1]) < PAINT_STEP) return true;
  if (press) press.last = [lx, ly];
  actedAt = clock;
  if (sauce) addSauce(pz, lx, ly); else addCheese(pz, lx, ly);
  if (fromTap || clock - (press?.soundAt ?? -9) > .12) { if (press) press.soundAt = clock; sauce ? sfx.blub(.12) : sfx.brush(); }
  if (!autoFill && coverage(list, sauce ? SPLAT_R * .95 : CHEESE_R) >= COVER_DONE) autoFill = { kind: phase, at: clock };
  return true;
}

// termina de cobrir sozinho quando já está quase tudo pintado
function updateAutoFill() {
  if (!autoFill || clock - autoFill.at < .07) return;
  autoFill.at = clock;
  const sauce = autoFill.kind === 'molho', list = sauce ? pz.sauce : pz.cheese, r = sauce ? SPLAT_R * .95 : CHEESE_R;
  if (coverage(list, r) < 1) { const [x, y] = emptySpot(list, r); sauce ? addSauce(pz, x, y) : addCheese(pz, x, y); return; }
  autoFill = null;
  if (sauce) pz.sauceFull = clock;
  if (sauce) stepDone('queijo', 'queijo'); else stepDone('cobertura');
}

function useJar(s) {
  jarTaps++; actedAt = clock;
  const pieces = addTops(pz, s.id), [cx, cy] = L.pz;
  say('t-' + s.id, VOZ['t-' + s.id]);
  sfx.pop(); setTimeout(() => sfx.pop(), 90); setTimeout(() => sfx.pop(), 180);
  for (const p of pieces) setTimeout(() => burst(cx + p.x * L.PR, cy + p.y * L.PR, L.PR * .08, 40, 3), (p.at - clock) * 1000 + 200);
  if (order.includes(s.id) && pieces.length) ring(cx, cy, L.PR * .3);
}

function toOven() {
  if (phase !== 'cobertura' || !pz.tops.length) return;
  setPhase('forno-in'); sfx.whoosh(); bakeK = 0;
}

function updateOven(dt) {
  if (phase === 'cobertura' && jarTaps >= AUTO_OVEN && clock - actedAt > 1.4) { toOven(); talk('forno'); }
  if (phase === 'forno-in' && clock - phaseAt > MOVE_TIME) { setPhase('assando'); talk('assando'); }
  if (phase === 'assando') {
    bakeK = Math.min(1, bakeK + dt / BAKE_TIME);
    pz.baked = bakeK;
    if (bakeK >= 1) { setPhase('pronta'); sfx.bell(1318.5); setTimeout(() => sfx.bell(1568), 150); talk('pronta'); }
  }
  if (phase === 'pronta' && clock - phaseAt > 1.1) { setPhase('forno-out'); sfx.whoosh(); }
  if (phase === 'forno-out' && clock - phaseAt > MOVE_TIME) { setPhase('cortar'); talk('cortar'); }
}

function stoke() {
  actedAt = boostAt = clock;
  bakeK = Math.min(1, bakeK + .12);
  sfx.blow();
  const m = L.oven.mouth;
  for (let i = 0; i < 6; i++) addParticle({ x: m.x + rand(-m.w * .3, m.w * .3), y: m.y - m.h * .3, vx: rand(-30, 30), vy: -rand(80, 160), life: .8, decay: 1.5, size: rand(2, 4), color: pick(['#ffd23b', '#ff8c2a']), star: false, rot: 0, vr: 0 });
}

function cut() {
  if (phase !== 'cortar' || clock - cutAt < CUT_TIME) return;
  actedAt = cutAt = clock; sfx.whoosh();
  setTimeout(() => {
    pz.cuts++; sfx.click();
    if (pz.cuts >= SLICES / 2) { setPhase('comer'); ring(L.pz[0], L.pz[1], L.PR * 1.1); setTimeout(() => talk('comer'), 200); }
  }, CUT_TIME * 1000);
}

function giveSlice(lx, ly) {
  const left = [...Array(SLICES).keys()].filter(i => !pz.eaten[i]);
  if (!left.length) return;
  const ang = (Math.atan2(ly, lx) + TAU) % TAU, near = i => Math.abs(((i + .5) * TAU / SLICES - ang + Math.PI * 3) % TAU - Math.PI);
  const i = left.sort((a, b) => near(a) - near(b))[0];
  pz.eaten[i] = true; actedAt = clock;
  flyingSlices.push({ i, at: clock });
  sfx.whoosh();
}

function updateSlices() {
  flyingSlices = flyingSlices.filter(f => {
    if (clock - f.at < SLICE_FLY) return true;
    guest.eatAt = clock; sfx.gulp(); setTimeout(() => sfx.gulp(), 250);
    const [mx, my] = mouthPos();
    burst(mx, my, L.headS * .25, 35, 8);
    if (pz.eaten.filter(Boolean).length % 2) talk('nham');
    if (pz.eaten.filter(Boolean).length === SLICES) setTimeout(thanks, 700);
    return false;
  });
}

function thanks() {
  if (phase !== 'comer') return;
  setPhase('thanks'); guest.state = 'happy'; guest.hopAt = clock;
  const exact = order.every(id => pz.tops.some(t => t.id === id));
  talk(exact ? 'c-jeitinho' : 'c-obrigado');
  const [hx, hy] = headPos();
  burst(hx, hy, L.headS * .4, 330, 18); launchStar(hx, hy);
  served++;
}

function updateFlow(dt) {
  if (!started) return;
  updateGuest();
  if (phase === 'idle' && clock > nextGuestAt) nextGuest();
  if (['massa', 'molho', 'queijo', 'cobertura', 'assando', 'cortar', 'comer'].includes(phase) && !autoFill) remind();
  updateAutoFill();
  updateOven(dt);
  updateSlices();
  if (phase === 'thanks' && clock - phaseAt > THANKS_TIME) {
    setPhase('bye'); guest.state = 'out'; guest.at = clock;
    talk('c-tchau'); sfx.whoosh();
  }
}

// ---------- ferramentas na bandeja ----------
function toolsNow() {
  if (phase === 'massa') return ['rolo'];
  if (phase === 'molho') return ['molho'];
  if (phase === 'queijo') return ['queijo'];
  if (phase === 'cobertura') return TOP_IDS;
  if (phase === 'cortar') return ['cortador'];
  return [];
}

function toolSlots() {
  const ids = toolsNow(), n = ids.length, t = L.tray;
  if (!n) return [];
  const cols = L.port ? n : n === 1 ? 1 : 3, rows = Math.ceil(n / cols);
  const cw = t.w / cols, ch = t.h / rows, size = Math.min(cw, ch) * (n === 1 ? .8 : .78);
  return ids.map((id, i) => ({ id, x: t.x + cw * (i % cols + .5), y: t.y + ch * (Math.floor(i / cols) + .5), size }));
}

function drawTool(s, t, hint) {
  const k = easeOutBack(Math.min(Math.max((clock - phaseAt) / .35, 0), 1)), size = s.size * k;
  if (size <= 1) return;
  const y = s.y - pulseAt(toolTaps[s.id] ?? -99, .3) * size * .15;
  if (hint) { ctx.fillStyle = `rgb(255 230 120 / ${.35 + .2 * Math.sin(t * 6)})`; circle(ctx, s.x, y, size * .56); ctx.fill(); }
  if (s.id === 'rolo') drawPin(ctx, s.x, y, size);
  else if (s.id === 'molho') drawBowl(ctx, s.x, y - size * .12, size * .95, '#d93a2b');
  else if (s.id === 'queijo') {
    drawBowl(ctx, s.x, y - size * .12, size * .95, '#ffd766');
    ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = size * .05; ctx.lineCap = 'round';
    for (const [dx, a] of [[-.15, .4], [.05, -.5], [.18, .9], [-.02, 1.6]]) { ctx.beginPath(); ctx.moveTo(s.x + dx * size, y - size * .2); ctx.lineTo(s.x + dx * size + Math.cos(a) * size * .1, y - size * .2 + Math.sin(a) * size * .05); ctx.stroke(); }
  } else if (s.id === 'cortador') drawCutter(ctx, s.x - size * .1, y + size * .1, size * .9, t);
  else {   // potinho de cobertura
    ctx.fillStyle = 'rgb(90 50 20 / .12)'; circle(ctx, s.x + 2, y + 4, size * .48); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, s.x, y, size * .48); ctx.fill();
    ctx.strokeStyle = order.includes(s.id) && phase === 'cobertura' ? '#ffb020' : '#f0dcc0'; ctx.lineWidth = size * .05; ctx.stroke();
    for (const [dx, dy, r] of [[-.15, -.1, .3], [.16, -.06, 1.8], [0, .17, 3.6]]) drawTop(ctx, s.id, s.x + dx * size, y + dy * size, size * .38, r);
  }
}

function useTool(s) {
  toolTaps[s.id] = clock;
  if (s.id === 'rolo') roll();
  else if (s.id === 'molho' || s.id === 'queijo') { if (!autoFill) paint(...emptySpot(s.id === 'molho' ? pz.sauce : pz.cheese, s.id === 'molho' ? SPLAT_R * .95 : CHEESE_R), true); }
  else if (s.id === 'cortador') cut();
  else useJar(s);
}

// ---------- dica ----------
function hintTarget() {
  const [cx, cy] = L.pz, R = L.PR;
  if (phase === 'massa') return [cx, cy + R * .2];
  if (phase === 'molho' || phase === 'queijo') {
    if (autoFill) return null;
    const [x, y] = emptySpot(phase === 'molho' ? pz.sauce : pz.cheese, .3);
    return [cx + x * R, cy + y * R];
  }
  if (phase === 'cobertura') {
    const want = order.find(id => !placed().includes(id));
    const slot = want && toolSlots().find(s => s.id === want);
    return slot ? [slot.x, slot.y + slot.size * .2] : [L.oven.x, L.oven.base - L.oven.h * .2];
  }
  if (phase === 'assando') return [L.oven.mouth.x, L.oven.mouth.y - L.oven.mouth.h * .2];
  if (phase === 'cortar' || phase === 'comer') return [cx, cy + R * .3];
  return null;
}

function drawHint(t) {
  if (clock - actedAt < HINT_AFTER || flyingSlices.length) return;
  const h = hintTarget();
  if (!h) return;
  const s = Math.max(L.PR * .45, 44);
  ctx.globalAlpha = Math.min((clock - actedAt - HINT_AFTER) / .4, 1);
  emojiAt(ctx, '👆', h[0] + s * .12, h[1] + s * .45 + Math.abs(Math.sin(t * 4)) * s * .25, s);
  ctx.globalAlpha = 1;
}

// ---------- toques ----------
const toLocal = (x, y) => [(x - L.pz[0]) / L.PR, (y - L.pz[1]) / L.PR];
const onPizza = (x, y) => Math.hypot(...toLocal(x, y)) < 1.12;

function onTap(x, y) {
  press = { x, y, dist: 0, last: null, soundAt: -9 };
  const tool = toolSlots().find(s => Math.hypot(x - s.x, y - s.y) < s.size * .6);
  if (tool) { useTool(tool); press = null; return; }
  if (hitGuest(x, y)) {
    guest.hopAt = clock; sfx.giggle();
    if (clock - lastOba > 3) { lastOba = clock; talk('c-oba'); }
    press = null; return;
  }
  if (hitOven(x, y)) {
    if (phase === 'cobertura' && pz.tops.length) toOven();
    else if (phase === 'assando') stoke();
    else { sfx.blow(); boostAt = clock; }
    press = null; return;
  }
  if (onPizza(x, y)) {
    const [lx, ly] = toLocal(x, y);
    if (phase === 'massa') { roll(); return; }
    if ((phase === 'molho' || phase === 'queijo') && !autoFill) { paint(lx, ly, true); return; }
    if (phase === 'cortar') { cut(); return; }
    if (phase === 'comer') { giveSlice(lx, ly); return; }
    if (phase === 'cobertura') { sfx.boing(); pz.wobAt = clock; return; }
  }
  press = null;
  sfx.pop(); ring(x, y, L.PR * .15);
}

function onMove(x, y) {
  if (!press) return;
  const d = Math.hypot(x - press.x, y - press.y);
  press.dist += d; press.x = x; press.y = y;
  if (phase === 'massa' && onPizza(x, y) && press.dist > L.PR * .9) { press.dist = 0; roll(); }
  if ((phase === 'molho' || phase === 'queijo') && !autoFill) paint(...toLocal(x, y), false);
}

const onUp = () => { press = null; };

// ---------- desenho ----------
function pizzaPose() {
  const [px, py] = L.pz, m = L.oven.mouth, inside = [m.x, m.y - m.h * .18, m.w * .44 / L.PR, .45];
  let k = 0;
  if (phase === 'forno-in') k = Math.min((clock - phaseAt) / MOVE_TIME, 1);
  else if (phase === 'assando' || phase === 'pronta') k = 1;
  else if (phase === 'forno-out') k = 1 - Math.min((clock - phaseAt) / MOVE_TIME, 1);
  const e = k * k * (3 - 2 * k), lift = Math.sin(k * Math.PI) * L.PR * .6;
  return { x: px + (inside[0] - px) * e, y: py + (inside[1] - py) * e - lift, s: 1 + (inside[2] - 1) * e, sy: 1 + (inside[3] - 1) * e, k };
}

function drawPizzaNow(t) {
  const p = pizzaPose(), sq = pulseAt(rollAt, .35) * .08, wob = pulseAt(pz.wobAt ?? -99, .4) * .05;
  const apart = phase === 'comer' || phase === 'thanks' ? Math.min((clock - phaseAt) / .4, 1) * .06 : 0;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s * (1 + sq + wob), p.s * p.sy * (1 - sq - wob));
  drawPizza(ctx, pz, L.PR, apart);
  ctx.restore();
  return p;
}

function drawRollingPin() {
  const k = (clock - rollAt) / .4;
  if (phase !== 'massa' && phase !== 'pausa' || k < 0 || k > 1) return;
  const [cx, cy] = L.pz, R = L.PR;
  drawPin(ctx, cx + (k * 2.4 - 1.2) * R, cy + Math.sin(k * Math.PI) * R * .1, R * 1.3, k * 1.5);
}

function drawCutting(t) {
  const k = (clock - cutAt) / CUT_TIME;
  if (k < 0 || k > 1 || phase !== 'cortar' && phase !== 'comer') return;
  const [cx, cy] = L.pz, R = L.PR, a = pz.cuts * Math.PI / 3, d = (k * 2 - 1) * R * 1.05;
  ctx.strokeStyle = 'rgb(140 70 20 / .5)'; ctx.lineWidth = Math.max(1.5, R * .015);
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.stroke();
  drawCutter(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * .45, t * 20);
}

function drawFlyingSlices() {
  const R = L.PR, [cx, cy] = L.pz, [mx, my] = mouthPos();
  for (const f of flyingSlices) {
    const k = Math.min((clock - f.at) / SLICE_FLY, 1), e = 1 - (1 - k) ** 2, mid = (f.i + .5) * TAU / SLICES, sc = 1 - .55 * e;
    const sx = cx + Math.cos(mid) * R * .6, sy = cy + Math.sin(mid) * R * .6;
    const x = sx + (mx - sx) * e, y = sy + (my - sy) * e - Math.sin(k * Math.PI) * R * .5;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-Math.cos(mid) * R * .6, -Math.sin(mid) * R * .6);
    drawSlice(ctx, pz, R, f.i, 0);
    ctx.restore();
  }
}

function render(t) {
  ctx.drawImage(backLayer, 0, 0, W, H);
  const hot = phase === 'assando' ? 1 : 0;
  drawFire(t, Math.max(pulseAt(boostAt, .6), hot * .3));
  drawGuest();
  const inOven = ['forno-in', 'assando', 'pronta', 'forno-out'].includes(phase);
  if (inOven) drawPizzaNow(t);
  ctx.drawImage(frontLayer, 0, 0, W, H);
  drawPaws();
  if (!inOven) drawPizzaNow(t);
  if (inOven || phase === 'cortar' && clock - phaseAt < .6) drawOvenTimer(bakeK, t);
  drawRollingPin();
  drawCutting(t);
  const hint = clock - actedAt > HINT_AFTER ? hintTarget() : null;
  const wantId = phase === 'cobertura' && hint ? order.find(id => !placed().includes(id)) : null;
  for (const s of toolSlots()) drawTool(s, t, s.id === wantId);
  if (['massa', 'molho', 'queijo', 'cobertura'].includes(phase) || phase === 'pausa' && pz.baked === 0) drawOrderBubble(order, placed(), t, wantId);
  drawFlyingSlices();
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeterBack(); drawMeter(); }
  drawConfetti();
}

// o toldo listrado some atrás das estrelinhas: um fundinho escuro ajuda
function drawMeterBack() {
  const a = meterSlot(0), b = meterSlot(meter.size - 1), h = Math.max(36, a.gap * 1.5) + 8;
  ctx.fillStyle = 'rgb(110 40 30 / .35)';
  ctx.beginPath(); ctx.roundRect(a.x - a.gap / 2 - 10, meter.y - h / 2, b.x - a.x + a.gap + 20, h, h / 2); ctx.fill();
}

// ---------- ciclo ----------
function resize() {
  fitCanvas();
  measureMeter();
  layoutKitchen();
}

function update(dt) {
  updateFlow(dt);
  updateMeter(dt);
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel: onUp,
  onStart() {
    talk('vamos');
    nextGuestAt = clock + 1.5;
  },
});
