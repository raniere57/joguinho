'use strict';
// Leãozinho: toca nele e ele faz RAAARW (juba estufa, boca enorme, a tela treme). De tempos em tempos
// ele pede alguma coisa num balãozinho: comida, água, pentear a juba, brincar de bola ou dormir.
// Toca no item certo da barra e ele fica feliz e ruge de alegria. A cada 5, os amigos da savana desfilam.

const HINT_AFTER = 6, REPEAT_AFTER = 15, FLY = .55, BITE = .35, LAP = .32, SLEEP = 5.5, ROAR = 1.1;

const VOZ = {
  vamos: 'Esse é o Leãozinho! Toque nele pra ouvir ele rugir!',
  'quer-fome': 'O leãozinho está com fome! Dê comida pra ele.', 'quer-sede': 'Ele está com sede! Dê água pra ele.',
  'quer-juba': 'A juba está bagunçada! Toque no pente ou esfregue a juba.', 'quer-bola': 'Ele quer brincar de bola!',
  'quer-sono': 'Ele está com soninho...', nao: 'Hmm, não é isso. Olhe o balãozinho!',
  chuta: 'Toque na bola pra jogar pro leãozinho!', bem: 'Muito bem! Ele adorou!', feliz: 'Ele ficou feliz!',
  bomdia: 'Bom dia, leãozinho!', festa: 'Os amigos da savana vieram ver o leãozinho!',
};
const VOZ_L = { raaar1: 'Raaaaarrr!', raaar2: 'Rrrrraaaaaaarrrw!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_L)]);

let phase = 'intro', lastAct = 0, lastSaid = 0, lastNo = -99, done = 0, need = null, lastNeed = null, needAt = 0, bubbleAt = -9;
let act = null, roarAt = -9, lastRoarVoice = -9, shakeAt = -9, pawAt = -9, petAt = -9, nightAt = -9, paradeAt = -9, hops = [];
let messy = Array(TUFTS).fill(false), comb = null, ball = null, lastPurr = 0, nextTimer = null;

meter.size = 5;
meter.onFull = () => { sfx.fanfare(); confettiRain(90); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_L[line], queued); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = k => k * k * (3 - 2 * k);
const mouthPos = () => [L.x, L.hy + headDip() + L.r * .6];
const sleeping = () => act?.kind === 'sono' && clock - act.at < SLEEP;

// ---------- rugido ----------
function roar(big = false) {
  if (clock - roarAt < .45) return;
  roarAt = clock;
  if (clock - lastRoarVoice > .8 || big) { lastRoarVoice = clock; talk(big ? 'raaar2' : pick(['raaar1', 'raaar2'])); growl(big ? 1.2 : 1); }
  const [mx, my] = mouthPos();
  ring(mx, my, L.r * .8); setTimeout(() => ring(mx, my, L.r * 1.4), 140); setTimeout(() => ring(mx, my, L.r * 2), 280);
  for (let i = 0; i < 10; i++) addParticle({ x: rand(0, W), y: rand(H * .1, H * sky.ground), vx: rand(-60, 60), vy: rand(-20, 30), life: 1.2, decay: .9, size: rand(3, 6), color: pick(['#7fb04a', '#5f8f36', '#e3c66e']), star: false, rot: 0, vr: 0 });
  for (const b of birds) b.speed *= 3;
}

// ---------- pedidos ----------
function nextNeed() {
  clearTimeout(nextTimer);
  const ids = ITEMS.map(it => it.id).filter(id => id !== lastNeed);
  need = lastNeed = pick(ids); needAt = bubbleAt = clock; phase = 'need'; lastAct = clock;
  sfx.pop();
  if (need === 'juba') { messy = Array(TUFTS).fill(true); sfx.boing(); }
  talk('quer-' + need);
}

function finishNeed() {
  act = null; need = null; comb = null; ball = null; phase = 'feliz'; done++;
  const [mx, my] = mouthPos();
  launchStar(mx, my - L.r);
  burst(L.bubble[0], L.bubble[1], L.r * .5, 330, 12);
  roarAt = -9; setTimeout(() => roar(true), 250);
  talk(pick(['bem', 'feliz']), true);
  if (done % meter.size === 0) {
    nextTimer = setTimeout(() => { paradeAt = clock; phase = 'festa'; talk('festa'); setTimeout(() => { roarAt = -9; roar(true); }, 2600); }, 2200);
    nextTimer = setTimeout(nextNeed, 2200 + PARADE_T * 1000);
  } else nextTimer = setTimeout(nextNeed, 3200);
}

function useItem(slot) {
  hops[slot.i] = clock; lastAct = clock;
  if (phase !== 'need' || act) { sfx.pop(); return; }
  if (slot.it.id !== need) {
    sfx.boing(); shakeAt = clock; bubbleAt = clock;
    if (clock - lastNo > 3) { lastNo = clock; talk('nao'); }
    return;
  }
  act = { kind: need, at: clock, x0: slot.x, y0: slot.y, step: 0 };
  sfx.whoosh();
  if (need === 'sede') sfx.splash();
  if (need === 'juba') comb = { auto: true };
  if (need === 'bola') { ball = { x: slot.x, y: slot.y, from: [slot.x, slot.y], to: L.ball0, at: clock, dur: .6, hits: 0, kicked: false }; setTimeout(() => { if (ball) talk('chuta'); }, 700); }
  if (need === 'sono') { nightAt = clock; sfx.hoot(); }
}

// ---------- atividades ----------
function headDip() {
  if (act?.kind === 'sede') { const e = clock - act.at; return L.r * .35 * ease(clamp01((e - .3) / .3)) * (1 - clamp01((e - 2.3) / .3)); }
  return 0;
}

const STEPS = {
  fome: [[FLY, bite], [FLY + BITE, bite], [FLY + BITE * 2, bite], [FLY + BITE * 3 + .1, () => { sfx.gulp(); finishNeed(); }]],
  sede: [.7, 1.02, 1.34, 1.66, 1.98].map(t => [t, lap]).concat([[2.7, finishNeed]]),
  sono: [[.5, () => sfx.blow()], [1.6, snore], [2.9, snore], [4.2, snore], [SLEEP, () => { sfx.chirp(); talk('bomdia'); }], [SLEEP + 1, finishNeed]],
};

function bite() {
  sfx.pop();
  const [mx, my] = mouthPos();
  for (let i = 0; i < 5; i++) addParticle({ x: mx + rand(-.2, .2) * L.r, y: my, vx: rand(-60, 60), vy: -rand(20, 80), life: 1, decay: 1.6, size: L.r * rand(.03, .06), color: pick(['#c8644a', '#f0b090', '#fff3d6']), star: false, rot: 0, vr: 0 });
}
function lap() {
  sfx.blub(.15);
  const [x, y] = L.bowl;
  for (let i = 0; i < 3; i++) addParticle({ x: x + rand(-.3, .3) * L.r, y: y - L.r * .1, vx: rand(-40, 40), vy: -rand(60, 120), life: .7, decay: 1.6, size: rand(2, 4), color: '#7cc8ff', star: false, rot: 0, vr: 0 });
}
function snore() { sfx.hoot(); zzz(); }
function zzz() {
  const [mx, my] = mouthPos();
  addParticle({ x: mx + L.r * .9, y: my - L.r * 1.2, vx: L.r * .5, vy: -L.r * 1.2, life: 1.6, decay: .7, size: L.r * .18, color: '#fff', star: true, rot: 0, vr: 0 });
}

function updateAct() {
  if (!act) return;
  const e = clock - act.at, steps = STEPS[act.kind];
  if (steps) while (act && act.step < steps.length && e >= steps[act.step][0]) steps[act.step++][1]();
  if (act?.kind === 'juba' && comb?.auto) {
    // o pente penteia sozinho um cacho por vez; o dedo também penteia (onMove)
    const i = messy.findIndex(m => m);
    if (i >= 0 && e > .5 + (TUFTS - messy.filter(m => m).length) * .45) tidy(i);
  }
  if (act?.kind === 'juba' && !messy.some(m => m)) finishNeed();
}

function tidy(i) {
  if (!messy[i]) return;
  messy = messy.map((m, j) => j === i ? false : m);
  sfx.brush();
  const a = tuftAngle(i), x = L.x + Math.cos(a) * L.r * 1.3, y = L.hy + Math.sin(a) * L.r * 1.3;
  sparkle(x, y); burst(x, y, L.r * .2, 40, 4);
}

function combPos() {
  if (!comb) return null;
  if (comb.x != null && clock - comb.movedAt < .6) return [comb.x, comb.y, -.4];
  const i = messy.findIndex(m => m), a = i >= 0 ? tuftAngle(i) : -Math.PI / 2, w = Math.sin(clock * 9) * .15;
  return [L.x + Math.cos(a + w) * L.r * 1.25, L.hy + Math.sin(a + w) * L.r * 1.25, a + Math.PI / 2];
}

function updateBall(dt) {
  if (!ball) return;
  const k = clamp01((clock - ball.at) / ball.dur);
  const [x0, y0] = ball.from, [x1, y1] = ball.to;
  ball.x = x0 + (x1 - x0) * ease(k); ball.y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * L.r * 1.1;
  if (k < 1) return;
  if (ball.kicked) {   // chegou na pata: o leão rebate
    ball.kicked = false; pawAt = clock; sfx.boing(); sfx.giggle();
    ball.hits++;
    Object.assign(ball, { from: ball.to, to: L.ball0, at: clock, dur: .55 });
    if (ball.hits >= 3) setTimeout(() => { if (act?.kind === 'bola') finishNeed(); }, 650);
  }
}

function kick() {
  if (!ball || ball.kicked || clock - ball.at < ball.dur) return false;
  sfx.pop(); ring(ball.x, ball.y, L.r * .3);
  Object.assign(ball, { from: [ball.x, ball.y], to: [L.x + L.r * .95, L.gy - L.r * .95], at: clock, dur: .45, kicked: true });
  return true;
}

// ---------- toques ----------
const onHead = (x, y) => Math.hypot(x - L.x, y - L.hy) < L.r * 1.45;
const onLion = (x, y) => onHead(x, y) || (Math.abs(x - L.x) < L.r * 1.1 && y > L.hy && y < L.gy + L.r * .1);

function onTap(x, y) {
  lastAct = clock;
  const slot = barSlots().find(s => Math.abs(x - s.x) < s.w / 2 && Math.abs(y - s.y) < s.h / 2);
  if (slot) { useItem(slot); return; }
  if (ball && Math.hypot(x - ball.x, y - ball.y) < L.r * .7 && kick()) return;
  if (tapBird(x, y)) return;
  if (onLion(x, y)) {
    if (sleeping()) { zzz(); sfx.hoot(); return; }
    if (act?.kind === 'juba' && onHead(x, y)) { brushAt(x, y); return; }
    if (act && act.kind !== 'bola') { petAt = clock; sfx.giggle(); return; }
    roar(); return;
  }
  sfx.pop(); ring(x, y, L.r * .25);
}

function brushAt(x, y) {
  messy.forEach((m, i) => {
    if (!m) return;
    const a = tuftAngle(i), tx = L.x + Math.cos(a) * L.r * 1.4, ty = L.hy + Math.sin(a) * L.r * 1.4;
    if (Math.hypot(x - tx, y - ty) < L.r * .5) tidy(i);
  });
}

function onMove(x, y) {
  if (!onHead(x, y)) return;
  lastAct = clock;
  if (need === 'juba' && phase === 'need') {
    if (!act) { act = { kind: 'juba', at: clock, step: 0 }; comb = { auto: false }; }
    Object.assign(comb, { x, y, movedAt: clock });
    brushAt(x, y);
    return;
  }
  if (!sleeping()) { petAt = clock; if (clock - lastPurr > .5) { lastPurr = clock; sfx.brush(); } }
}

// ---------- dica ----------
function hintTarget() {
  if (phase !== 'need') return null;
  if (ball && !ball.kicked && clock - ball.at > ball.dur) return [ball.x, ball.y];
  if (act) return null;
  const s = barSlots().find(s => s.it.id === need);
  return [s.x, s.y];
}

function drawHint(t) {
  if (clock - lastAct < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  const size = Math.round(Math.max(L.r * .6, 40) / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + size * .15 + Math.abs(Math.sin(t * 4)) * size * .3, size, size);
}

function remind() {
  if (phase !== 'need' || clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  talk(act?.kind === 'bola' ? 'chuta' : 'quer-' + need); bubbleAt = clock; lastAct = clock;
}

// ---------- desenho ----------
function lionState(t) {
  const e = act ? clock - act.at : 0, k = pulseAt(roarAt, ROAR);
  let eyes = 'open', mouthS = 'smile', tongue = 0;
  if (clock - petAt < .8 || phase === 'feliz') eyes = 'happy';
  if (act?.kind === 'fome' && e > FLY && e < FLY + BITE * 3) mouthS = ((e - FLY) % BITE) < BITE * .5 ? 'open' : 'smile';
  if (act?.kind === 'sede' && e > .6 && e < 2.2) tongue = Math.abs(Math.sin((e - .6) / LAP * Math.PI));
  if (act?.kind === 'sono') {
    if (e < 1.2) { mouthS = e > .3 ? 'yawn' : 'smile'; eyes = e > .6 ? 'closed' : 'open'; }
    else if (e < SLEEP) eyes = 'closed';
    else if (e < SLEEP + .8) mouthS = 'yawn';
  }
  if (need === 'sono' && !act) eyes = Math.sin(t * 2) > 0 ? 'closed' : 'open';
  return {
    x: L.x, hy: L.hy, r: L.r, roar: k, blink: (t % 3.6) < .12 ? .1 : 1, eyes, mouth: mouthS, tongue, messy,
    dip: headDip(), paw: pulseAt(pawAt, .45), shake: pulseAt(shakeAt, .6),
  };
}

function drawBubble(t) {
  if (!need || phase !== 'need' || act) return;
  const [x, y] = L.bubble, rr = L.r * (L.port ? .5 : .48), k = easeOutBack(clamp01((clock - needAt) / .4)) * (1 + .18 * pulseAt(bubbleAt, .45));
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.5) * rr * .06); ctx.scale(k, k);
  const d = L.port ? -1 : 1;   // rabinho apontando pro leão
  ctx.fillStyle = 'rgb(90 60 20 / .15)'; circle(ctx, 2, 4, rr); ctx.fill();
  ctx.fillStyle = '#fff'; circle(ctx, 0, 0, rr); ctx.fill();
  circle(ctx, d * rr * .75, rr * 1.0, rr * .2); ctx.fill(); circle(ctx, d * rr * 1.1, rr * 1.35, rr * .12); ctx.fill();
  const it = ITEMS.find(i => i.id === need);
  if (it.e) emojiAt(ctx, it.e, 0, 0, rr * 1.3); else drawComb(ctx, 0, 0, rr * 1.2, -.5);
  ctx.restore();
}

function drawActItems(t) {
  if (!act) return;
  const e = clock - act.at;
  if (act.kind === 'fome') {
    const [mx, my] = mouthPos();
    if (e < FLY) { const k = e / FLY, q = 1 - (1 - k) ** 3; emojiAt(ctx, '🍖', act.x0 + (mx - act.x0) * q, act.y0 + (my - act.y0) * q - Math.sin(k * Math.PI) * L.r, L.r * (.7 + .3 * q), (1 - q) * 3); }
    else { const left = 1 - Math.min(act.step, 3) / 3.4; emojiAt(ctx, '🍖', mx, my + L.r * .15, L.r * left, -.3); }
  }
  if (act.kind === 'sede') {
    const [bx, by] = L.bowl, k = easeOutBack(clamp01(e / .35)), level = 1 - clamp01((e - .7) / 1.6), w = L.r * .75 * k;
    if (e > 2.6) return;
    ctx.fillStyle = '#4fa4e8'; ctx.beginPath(); ctx.ellipse(bx, by, w, w * .3, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(bx - w, by - w * .2, w * 2, w * .2);
    ctx.fillStyle = '#7cc8ff'; ctx.beginPath(); ctx.ellipse(bx, by - w * .2, w, w * .26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(bx, by - w * .2, w * .82 * (.4 + .6 * level), w * .18 * (.4 + .6 * level), 0, 0, TAU); ctx.fill();
  }
  if (act.kind === 'juba') { const p = combPos(); if (p) drawComb(ctx, p[0], p[1], L.r * .7, p[2]); }
}

function drawBall() {
  if (!ball) return;
  const s = L.r * .55;
  ctx.fillStyle = 'rgb(120 80 20 / .2)'; ctx.beginPath(); ctx.ellipse(ball.x, L.gy, s * .45, s * .1, 0, 0, TAU); ctx.fill();
  emojiAt(ctx, '⚽', ball.x, ball.y, s, clock * 4);
}

function drawNight(t) {
  if (act?.kind !== 'sono') return;
  const e = clock - act.at, a = clamp01(e / .8) * (1 - clamp01((e - SLEEP) / .8));
  if (a <= 0) return;
  ctx.fillStyle = `rgb(20 24 70 / ${.55 * a})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  for (let i = 0; i < 40; i++) { ctx.fillStyle = '#fff6b0'; star(ctx, (i * 97.3) % W, (i * 53.7) % (H * sky.ground), 2 + (i % 3) * (1 + .4 * Math.sin(t * 3 + i)), 0); }
  emojiAt(ctx, '🌙', W * .2, H * .12, L.r * .9);
  ctx.globalAlpha = 1;
}

// ---------- ciclo ----------
function update(dt) {
  updateSky(dt);
  if (started) { updateAct(); updateBall(dt); remind(); }
  updateMeter(dt);
}

function render(t) {
  const k = pulseAt(roarAt, .5);
  ctx.save(); ctx.translate(Math.sin(t * 80) * k * 4, Math.cos(t * 70) * k * 3);   // a tela treme com o rugido
  drawSkyBack(t);
  drawParade(paradeAt, t);
  ctx.drawImage(groundLayer, 0, 0, W, H);
  drawLion(ctx, lionState(t), t);
  drawActItems(t);
  drawBall();
  drawNight(t);
  drawBubble(t);
  ctx.restore();
  drawBar(t, hops, phase === 'need' && !act && clock - lastAct > HINT_AFTER ? need : null);
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutSavana();
}

boot({
  resize, update, render, onTap, onMove,
  onBird: spawnBird,
  onStart() { talk('vamos'); setTimeout(() => { roarAt = -9; roar(true); }, 3200); nextTimer = setTimeout(nextNeed, 6500); },
});
