'use strict';
// Sorveteria: um bichinho chega e mostra o pedido num balão. A criança escolhe casquinha ou copinho,
// toca nos potes (a bola voa e empilha), enfeita e toca o sininho. O bichinho come, agradece
// e paga com uma estrela. Nunca tem erro: sabor diferente do pedido também vale.

const FLAVOR_IDS = Object.keys(FLAVORS);
const HINT_AFTER = 6, REPEAT_AFTER = 14, AUTO_DELIVER = 3, SCOOP_FLY = .45, DELIVER_TIME = .8, EAT_TIME = 3.4, THANKS_TIME = 2.2;

loadVoices(['vamos', 'base', 'b-cone', 'b-cup', 'enfeitar', 'sininho', 'pronto', 'parabens',
  'c-oi', 'c-obrigado', 'c-jeitinho', 'c-oba', 'c-tchau',
  ...CUSTOMERS.map(c => 'quer-' + c.id), ...FLAVOR_IDS.flatMap(f => ['f-' + f, 'e-' + f]), ...TOPPINGS.map(t => 't-' + t)]);

let phase = 'idle', phaseAt = 0, actedAt = 0, saidAt = 0, order = [], cream = null, flying = [], toolsNow = [];
let served = 0, nextGuestAt = 0, queue = [], frameDt = 0, lastOba = -99, deliverAt = 0;

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare(); navigator.vibrate?.([30, 60, 30]); confettiRain();
  guest.hopAt = clock;
  say('parabens', 'Você é uma ótima sorveteira! Parabéns!', true);
};

const newCream = () => ({ base: null, scoops: [], sauce: null, sauceAt: 0, sprinkles: false, cherry: false, wafer: false, tops: 0 });

// ---------- fluxo ----------
function nextGuest() {
  if (!queue.length) queue = [...CUSTOMERS].sort(() => Math.random() - .5);
  const n = served < 1 ? 1 : served < 3 ? 2 : pick([1, 2, 2, 3, 3]);
  order = [...FLAVOR_IDS].sort(() => Math.random() - .5).slice(0, n);
  cream = newCream();
  setPhase('arrive');
  guestArrive(queue.pop());
}

function guestArrived() {
  say('c-oi', 'Oi! Eu quero sorvete!');
  setPhase('base');
  say('base', 'Casquinha ou copinho?', true);
}

function guestGone() {
  cream = null; order = [];
  setPhase('idle');
  nextGuestAt = clock + 1;
}

function setPhase(p) {
  phase = p; phaseAt = actedAt = saidAt = clock;
  toolsNow = p === 'base' ? ['cone', 'cup'] : p === 'scoops' ? FLAVOR_IDS : p === 'top' ? [...TOPPINGS, 'sino'] : [];
}

function sayOrder(queued) {
  say('quer-' + guest.c.id, `${guest.c.name} quer sorvete de...`, queued);
  order.forEach((f, i) => say((i ? 'e-' : 'f-') + f, (i ? 'E ' : '') + FLAVORS[f].name + '!', true));
}

function remind() {
  if (clock - Math.max(actedAt, saidAt) < REPEAT_AFTER) return;
  saidAt = clock;
  if (phase === 'base') say('base', 'Casquinha ou copinho?');
  else if (phase === 'scoops') sayOrder(false);
  else if (phase === 'top') say('sininho', 'Toca o sininho pra entregar!');
}

function deliver() {
  if (phase !== 'top') return;
  setPhase('deliver'); deliverAt = clock;
  sfx.bell(1318.5); setTimeout(() => sfx.bell(1568), 140);
  say('pronto', 'Ficou lindo!');
}

function updateFlow() {
  if (!started) return;
  updateGuest();
  if (phase === 'idle' && clock > nextGuestAt) nextGuest();
  if (['base', 'scoops', 'top'].includes(phase)) remind();
  if (phase === 'top' && cream.tops >= AUTO_DELIVER && clock - actedAt > 1.2 && !flying.length) deliver();
  if (phase === 'deliver' && clock - phaseAt > DELIVER_TIME) { setPhase('eat'); guest.state = 'eat'; }
  if (phase === 'eat') eatStep();
  if (phase === 'thanks' && clock - phaseAt > THANKS_TIME) {
    setPhase('bye'); guest.state = 'out'; guest.at = clock;
    say('c-tchau', 'Tchau, tchau!'); sfx.whoosh();
  }
}

// mordidas: uma por bola, com farelinho e nham
function eatStep() {
  const p = (clock - phaseAt) / EAT_TIME, n = cream.scoops.length, bites = Math.floor(p * (n + 1));
  if (bites > (cream.bites || 0)) {
    cream.bites = bites; sfx.gulp();
    const [x, y] = heldPos();
    burst(x, y - L.U * .6, L.U * .25, 30, 6);
  }
  if (p < 1) return;
  const exact = order.every((f, i) => cream.scoops[i]?.f === f);
  setPhase('thanks'); guest.state = 'happy'; guest.hopAt = clock;
  if (exact) say('c-jeitinho', 'Do jeitinho que eu queria!'); else say('c-obrigado', 'Hummm! Que delícia! Obrigado!');
  const [hx, hy] = headPos();
  burst(hx, hy, L.headS * .4, 330, 18);
  launchStar(hx, hy);
  served++;
}

// ---------- ferramentas no freezer ----------
function toolSlots() {
  const n = toolsNow.length, t = L.tools;
  const cols = L.portrait ? Math.min(n, 3) : n <= 2 ? 1 : 2, rows = Math.ceil(n / cols);
  const cw = t.w / cols, ch = t.h / rows, size = Math.min(cw, ch) * .72;
  return toolsNow.map((id, i) => ({ id, x: t.x + cw * (i % cols + .5), y: t.y + ch * (Math.floor(i / cols) + .5), size }));
}

function hintTool() {
  if (phase === 'base') return 'cone';
  if (phase === 'scoops') return order[cream.scoops.length + flying.length];
  if (phase === 'top') return cream.tops ? 'sino' : 'cereja';
  return null;
}

function drawTools(t) {
  const hint = clock - actedAt > HINT_AFTER ? hintTool() : null;
  for (const [i, s] of toolSlots().entries()) {
    const k = easeOutBack(Math.min(Math.max((clock - phaseAt - i * .06) / .35, 0), 1)), size = s.size * k;
    if (size <= 1) continue;
    const bounce = pulseAt(toolTaps[s.id] ?? -99, .3) * size * .12;
    if (FLAVORS[s.id]) drawTub(ctx, s.x, s.y - bounce, size * 1.2, FLAVORS[s.id], t, s.id === hint);
    else if (s.id === 'sino') drawBell(s.x, s.y - bounce, size, t, s.id === hint || cream.tops > 0);
    else drawToolIcon(ctx, s.id, s.x, s.y - bounce, size, t, s.id === hint);
    if (s.id === hint) {
      const hs = Math.round(size * .55 / 4) * 4;
      ctx.drawImage(emojiSprite('👆', hs), s.x - hs * .45, s.y + size * .3 + Math.abs(Math.sin(t * 4)) * size * .12, hs, hs);
    }
  }
}

const toolTaps = {};

function drawBell(x, y, s, t, glow) {
  if (glow) { ctx.fillStyle = `rgb(255 240 150 / ${.3 + .25 * Math.sin(t * 6)})`; circle(ctx, x, y, s * .62); ctx.fill(); }
  const size = Math.round(s * .9 / 4) * 4;
  ctx.save(); ctx.translate(x, y); ctx.rotate(glow ? Math.sin(t * 10) * .08 : 0);
  ctx.drawImage(emojiSprite('🛎️', size), -size / 2, -size / 2, size, size);
  ctx.restore();
}

function useTool(s) {
  actedAt = clock; toolTaps[s.id] = clock;
  if (phase === 'base') {
    cream.base = s.id; sfx.pop();
    say('b-' + s.id, s.id === 'cone' ? 'Casquinha!' : 'Copinho!');
    burst(L.holder[0], L.holder[1] - L.U * .5, L.U * .4, 45, 12);
    setPhase('scoops');
    setTimeout(() => { if (phase === 'scoops') sayOrder(true); }, 300);
    return;
  }
  if (phase === 'scoops') {
    say('f-' + s.id, FLAVORS[s.id].name + '!');
    if (cream.scoops.length + flying.length >= order.length) { sfx.boing(); return; }
    flying.push({ kind: 'scoop', id: s.id, x0: s.x, y0: s.y - s.size * .2, at: clock, i: cream.scoops.length + flying.length });
    sfx.whoosh();
    return;
  }
  if (phase === 'top') {
    if (s.id === 'sino') { deliver(); return; }
    say('t-' + s.id, TOPPING_TEXT[s.id]);
    flying.push({ kind: 'top', id: s.id, x0: s.x, y0: s.y, at: clock });
    sfx.whoosh();
  }
}

function flyPos(f) {
  const p = Math.min((clock - f.at) / SCOOP_FLY, 1), e = 1 - (1 - p) ** 2;
  const [hx, hy] = L.holder, u = L.U;
  const [tx, ty] = f.kind === 'scoop' ? [hx, hy + scoopCenter(cream, u, f.i)[1]] : [hx, hy + creamTop(cream, u)];
  return [f.x0 + (tx - f.x0) * e, f.y0 + (ty - f.y0) * e - Math.sin(p * Math.PI) * u * 1.2, p];
}

function updateFlying() {
  flying = flying.filter(f => {
    if (clock - f.at < SCOOP_FLY) return true;
    land(f);
    return false;
  });
}

function land(f) {
  const [x, y] = flyPos(f);
  if (f.kind === 'scoop') {
    cream.scoops.push({ f: f.id, at: clock });
    sfx.pop(); setTimeout(() => sfx.boing(), 60);
    burst(x, y, L.U * .3, f.id === 'menta' ? 150 : 330, 8);
    if (order[f.i] === f.id) { ring(x, y, L.U * .6); sfx.bell(PENTATONIC[f.i + 2]); }
    if (cream.scoops.length === order.length) setTimeout(() => {
      if (phase !== 'scoops') return;
      setPhase('top'); say('enfeitar', 'Agora vamos enfeitar!');
    }, 700);
    return;
  }
  const had = { 'calda-choc': !!cream.sauce, 'calda-morango': !!cream.sauce, granulado: cream.sprinkles, cereja: cream.cherry, biscoito: cream.wafer }[f.id];
  if (f.id.startsWith('calda')) { cream.sauce = f.id; cream.sauceAt = clock; sfx.splash(); }
  else if (f.id === 'granulado') { cream.sprinkles = true; sfx.brush(); setTimeout(() => sfx.brush(), 90); }
  else if (f.id === 'cereja') { cream.cherry = true; sfx.pop(); }
  else { cream.wafer = true; sfx.pop(); }
  if (!had) cream.tops++;
  for (let i = 0; i < 6; i++) sparkle(x + rand(-L.U * .4, L.U * .4), y + rand(-L.U * .2, L.U * .3));
}

function drawFlying(t) {
  for (const f of flying) {
    const [x, y, p] = flyPos(f);
    if (f.kind === 'scoop') drawScoop(ctx, x, y, L.U * SCOOP_R * (.7 + .3 * p), FLAVORS[f.id]);
    else drawToolIcon(ctx, f.id, x, y, L.U * .9, t, false);
  }
}

// ---------- sorvete no balcão e na mão do bichinho ----------
// o bichinho segura o sorvete do lado da boca
function heldPos() {
  const [hx, hy] = headPos();
  return [hx - L.headS * .45, hy + L.headS * .62];
}

function drawCream(t) {
  if (!cream) return;
  const [hx, hy] = L.holder;
  if (phase === 'deliver' || phase === 'eat') {
    const p = phase === 'deliver' ? Math.min((clock - deliverAt) / DELIVER_TIME, 1) : 1, e = 1 - (1 - p) ** 2;
    const [tx, ty] = heldPos(), k = 1 - .3 * e;
    const x = hx + (tx - hx) * e, y = hy + (ty - hy) * e - Math.sin(p * Math.PI) * L.U;
    const eaten = phase === 'eat' ? Math.min((clock - phaseAt) / EAT_TIME, 1) : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    drawIceCream(ctx, 0, 0, L.U, cream, t, eaten);
    ctx.restore();
    if (phase === 'eat') drawPaws([x, y - L.U * .55 * k]);
    return;
  }
  if (!cream.base) {   // pratinho esperando
    ctx.fillStyle = 'rgb(255 255 255 / .7)'; ctx.beginPath(); ctx.ellipse(hx, hy + 2, L.U * .45, L.U * .1, 0, 0, TAU); ctx.fill();
    return;
  }
  const wob = pulseAt(cream.wobAt ?? -99, .5);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.sin(clock * 20) * wob * .06);
  drawIceCream(ctx, 0, 0, L.U, cream, t);
  ctx.restore();
}

// ---------- toques ----------
function onTap(x, y) {
  const tool = ['base', 'scoops', 'top'].includes(phase) && toolSlots().find(s => Math.hypot(x - s.x, y - s.y) < s.size * .6);
  if (tool) { useTool(tool); return; }
  if (hitGuest(x, y)) {
    guest.hopAt = clock; sfx.giggle();
    if (clock - lastOba > 3) { lastOba = clock; say('c-oba', 'Oba!'); }
    return;
  }
  if (cream && Math.abs(x - L.holder[0]) < L.U * .7 && y < L.holder[1] && y > L.holder[1] + creamTop(cream, L.U) - L.U * .3) {
    cream.wobAt = clock; sfx.boing(); return;
  }
  if (y < L.awning + 10) { sfx.bell(); burst(x, y, L.U * .3, 330, 8); return; }
  sfx.pop(); ring(x, y, L.U * .25);
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  measureMeter();
  layoutShop();
}

function update(dt) {
  frameDt = dt;
  updateFlow();
  updateFlying();
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(shopBack, 0, 0, W, H);
  drawGuest();
  ctx.drawImage(shopFront, 0, 0, W, H);
  if (phase !== 'eat') drawPaws(null);
  drawCream(t);
  drawTools(t);
  drawFlying(t);
  drawBubble(['base', 'scoops'].includes(phase) ? order : null, cream?.scoops ?? [], t, clock - actedAt > HINT_AFTER && phase === 'scoops' ? cream.scoops.length + flying.length : -1);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap,
  onStart: () => {
    say('vamos', 'Vamos abrir a sorveteria!');
    nextGuestAt = clock + 1.5;
  },
});
