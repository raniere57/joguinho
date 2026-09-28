'use strict';
// Banho de espuma: o bichinho brincou na lama. Enche a banheira, põe espuma, xampu (vira penteado
// engraçado), brinca com patinho, barco, baleia e bolhas, enxágua no chuveirinho e se enrola na toalha.
// A barra embaixo mostra o passo; depois do banho chega o próximo bichinho.

const STEPS = ['encher', 'espuma', 'xampu', 'brincar', 'enxaguar', 'toalha'];
const HINT_AFTER = 6, REPEAT_AFTER = 14, FOAM_DONE = 10, STYLES_DONE = 4, PLAY_DONE = 8, FADE = .6;

const cap = s => s[0].toUpperCase() + s.slice(1);
const VOZ = {
  vamos: 'Hora do banho!',
  encher: 'Toque na torneira pra encher a banheira!',
  espuma: 'Agora a espuma! Aperte o sabonete de bolhas.',
  xampu: 'Agora o xampu! Toque na cabeça.',
  brincar: 'Hora de brincar! Toque nos brinquedos e nas bolhas.',
  enxaguar: 'Agora vamos enxaguar! Passe o dedo com o chuveirinho.',
  toalha: 'Tudo limpinho! Agora toque na toalha.',
  cheiroso: 'Que cheirosinho! Banho tomado!',
  'h-nuvem': 'Que espuma cheirosa!', 'h-moicano': 'Que moicano!', 'h-unicornio': 'Virou um unicórnio!',
  'h-coque': 'Um coque de espuma!', 'h-chifres': 'Olha os chifrinhos!', 'h-barba': 'Que barba de espuma!',
  ...Object.fromEntries(BICHOS.map(b => ['sujo-' + b.id, `${cap(b.name)} brincou na lama! Vamos dar banho?`])),
};
const VOZ_B = { 'b-oba': 'Oba!', 'b-hihi': 'Hi hi hi! Faz cócegas!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let stepI = 0, stepAt = 0, lastAct = 0, lastSaid = 0, stepEnding = false, bathI = 0, mode = 'intro', modeAt = 0, fadeAt = -99;
let press = null, sprayUntil = 0, sprayAt = [0, 0], squeezeAt = -9, styleN = 0, playN = 0, sinkAt = -1, lastMound = 0, lastB = -99;
const barEls = [...document.querySelectorAll('.steps span')];

meter.size = STEPS.length;
meter.onFull = () => { sfx.fanfare(); confettiRain(80); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const act = () => { lastAct = clock; };

// ---------- banho, passos ----------
function startBath() {
  kid.b = BICHOS[bathI % BICHOS.length];
  Object.assign(kid, { v: newLook(), mud: 1, hair: null, oldHair: null, foam: 0, wrapAt: -1, hopAt: clock });
  Object.assign(water, { level: 0, goal: 0, pourUntil: 0 });
  mounds = []; toys = []; bubbles = []; sinkAt = -1; styleN = 0; playN = 0;
  mode = 'steps';
  talk('sujo-' + kid.b.id);
  startStep(0, true);
}

function startStep(i, queued) {
  stepI = i; stepAt = lastAct = lastSaid = clock; stepEnding = false;
  if (STEPS[i] === 'brincar') spawnToys();
  barEls.forEach((el, k) => { el.classList.toggle('done', k < i); el.classList.toggle('now', k === i); });
  talk(STEPS[i], queued);
}

function stepDone(delay = 1.2) {
  if (stepEnding || mode !== 'steps') return;
  stepEnding = true;
  const [hx, hy] = headNow();
  launchStar(hx, hy - L.r);
  barEls[stepI].classList.add('done'); barEls[stepI].classList.remove('now');
  kid.hopAt = clock; sfx.chime();
  if (STEPS[stepI] === 'toalha') { mode = 'fim'; modeAt = clock; talk('cheiroso'); return; }
  setTimeout(() => { if (mode === 'steps') startStep(stepI + 1); }, delay * 1000);
}

const step = () => mode === 'steps' && !stepEnding ? STEPS[stepI] : null;

// ---------- ações ----------
function pour() {
  water.goal = Math.min(1, water.goal + .34); water.pourUntil = clock + 1.1; act();
  sfx.splash(); setTimeout(() => sfx.splash(), 350); setTimeout(() => sfx.blub(), 700);
}

function squeeze() {
  squeezeAt = clock; act(); sfx.blow(); setTimeout(() => sfx.pop(), 150);
  const [bx, by] = L.bottle;
  for (let i = 0; i < 10; i++) addParticle({ x: bx + L.r * .1, y: by - L.r * 1.2, vx: rand(40, 140), vy: -rand(60, 160), life: .7, decay: 1.6, size: rand(3, 6), color: pick(['#ffffff', '#ffd1e6', '#d7ecf7']), star: false, rot: 0, vr: 0 });
  for (let i = 0; i < 3; i++) setTimeout(() => addMound(rand(-.85, .85), rand(-.7, .8)), 250 + i * 120);
}

function whisk(x, y) {   // mexer a água com o dedo faz mais espuma
  if (clock - lastMound < .15) return;
  lastMound = clock; act();
  addMound((x - L.cx) / (L.rx * .86), clamp((y - L.rimY - L.ry * .08) / (L.ry * .62), -.8, .8), .8);
  sfx.blub(.1);
}

function shampoo() {
  act(); kid.squintUntil = clock + .5; kid.hopAt = clock;
  const next = kid.hair ? HAIR_IDS[(HAIR_IDS.indexOf(kid.hair) + 1) % HAIR_IDS.length] : 'nuvem';
  setHair(next); styleN++;
  sfx.brush(); setTimeout(() => sfx.pop(), 120);
  const [hx, hy] = headNow();
  burst(hx, hy - L.r, L.r * .5, 200, 8);
  if (step() === 'xampu' || clock - lastSaid > 2) talk('h-' + next);
  if (step() === 'xampu' && styleN >= STYLES_DONE) stepDone(1.8);
}

function rinseAt(x, y, dt) {
  const [hx, hy] = headNow(), r = L.r;
  if (Math.abs(x - hx) > r * 1.4 || y < hy - r * 2.2 || y > hy + r * 1.6) return;
  kid.squintUntil = clock + .3;
  kid.foam = Math.max(0, kid.foam - dt * .8); kid.mud = Math.max(0, kid.mud - dt * .8);
  if (Math.random() < dt * 8) burst(hx + rand(-r, r), hy - r * .5, r * .2, 200, 2);
  if (step() === 'enxaguar' && kid.foam <= 0 && kid.mud <= 0) stepDone();
}

function towel() {
  if (sinkAt >= 0) return;
  act(); sinkAt = clock; water.goal = 0;
  sfx.gulp(); setTimeout(() => sfx.gulp(), 300); setTimeout(() => sfx.blub(), 650);
  setTimeout(() => { kid.wrapAt = clock; sfx.whoosh(); }, 1300);
  setTimeout(() => { kid.rubAt = clock; sfx.brush(); talk('b-hihi'); }, 2100);
  setTimeout(() => stepDone(), 3300);
}

// ---------- toques ----------
function onTap(x, y) {
  press = { x, y, toy: null, moved: 0, onHead: onHead(x, y) };
  const s = step();
  if (s === 'enxaguar') { sprayUntil = clock + .7; sprayAt = [x, y]; act(); popBubbleAt(x, y); return; }
  if (s === 'xampu' && press.onHead) { popBubbleAt(x, y); shampoo(); return; }   // no xampu a cabeça ganha das bolhas
  if (popBubbleAt(x, y)) { if (s === 'brincar') { playN++; act(); if (playN >= PLAY_DONE) stepDone(); } return; }
  const toy = toyAt(x, y);
  if (toy) { press.toy = toy; return; }   // decide no soltar: tocou = ação, arrastou = move
  if (s === 'encher' && (hitFaucet(x, y) || inWater(x, y))) { pour(); return; }
  if (s === 'espuma' && hitBottle(x, y)) { squeeze(); return; }
  if (s === 'espuma' && inWater(x, y)) { whisk(x, y); return; }
  if (s === 'toalha' && (hitTowel(x, y) || onHead(x, y))) { towel(); return; }
  if (hitFaucet(x, y)) { water.pourUntil = clock + .5; sfx.splash(); return; }
  if (hitBottle(x, y)) { squeezeAt = clock; sfx.blow(); return; }
  if (press.onHead) {
    if (s === 'xampu' || kid.hair && kid.foam > 0 && mode === 'steps') { shampoo(); return; }
    kid.hopAt = clock; sfx.giggle();
    if (clock - lastB > 3) { lastB = clock; talk('b-oba'); }
    return;
  }
  if (inWater(x, y) && water.level > .3) { sfx.blub(); spawnBubble(x, y - L.r * .3, .7); return; }
  sfx.pop(); ring(x, y, L.r * .3);
}

function onMove(x, y) {
  if (!press) return;
  press.moved += Math.hypot(x - press.x, y - press.y); press.x = x; press.y = y;
  const s = step();
  if (s === 'enxaguar') { sprayUntil = clock + .15; sprayAt = [x, y]; act(); return; }
  if (press.toy && press.moved > L.r * .2) { moveToy(press.toy, x, y); act(); return; }
  if (s === 'espuma' && inWater(x, y)) whisk(x, y);
  if (press.onHead && kid.hair && press.moved > L.r * .5) {   // esfregar a cabeça
    press.moved = 0; sfx.brush(); kid.squintUntil = clock + .3;
    const [hx, hy] = headNow(); sparkle(hx + rand(-L.r, L.r), hy - L.r);
  }
}

function onUp() {
  if (press?.toy && press.moved <= L.r * .2) {
    actToy(press.toy); act();
    if (step() === 'brincar' && ++playN >= PLAY_DONE) stepDone();
  }
  press = null;
}

barEls.forEach((el, i) => el.addEventListener('click', () => {
  if (!started || mode !== 'steps' || i !== stepI) return;
  sfx.resume(); talk(STEPS[i]);
}));

// ---------- dica ----------
function hintTarget() {
  const s = step(), [hx, hy] = headNow();
  if (s === 'encher') return [L.faucet[0] - L.r * .3, L.faucet[1] - L.r * .2];
  if (s === 'espuma') return [L.bottle[0], L.bottle[1] - L.r * .2];
  if (s === 'xampu') return [hx, hy + L.r * .2];
  if (s === 'brincar') { const t = toys[0]; return t ? toyXY(t) : null; }
  if (s === 'enxaguar') return [hx, hy + L.r * .2];
  if (s === 'toalha') return [L.towel[0], L.towel[1] + L.r * 1.4];
  return null;
}

function drawHint(t) {
  if (!step() || clock - Math.max(lastAct, stepAt) < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  const size = Math.round(L.r * .9 / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + L.r * .2 + Math.abs(Math.sin(t * 4)) * L.r * .3, size, size);
}

// ---------- ciclo ----------
function updateBath(dt) {
  if (!started) return;
  updateWater(dt);
  updateToys(dt);
  updateBubbles(dt, step() === 'brincar' ? 2.2 : mounds.length ? .8 : 0);
  const s = step();
  if (s === 'encher' && water.level >= .99) stepDone();
  if (s === 'espuma' && mounds.length >= FOAM_DONE) stepDone();
  if (press && s === 'enxaguar') sprayUntil = Math.max(sprayUntil, clock + .05);
  if (clock < sprayUntil) rinseAt(sprayAt[0], sprayAt[1], dt);
  if (s && clock - Math.max(lastAct, lastSaid) > REPEAT_AFTER) talk(s);
  if (mode === 'fim' && clock - modeAt > 3 && fadeAt < modeAt) {
    fadeAt = clock;
    setTimeout(() => { bathI++; startBath(); }, FADE * 1000);
  }
}

function showerPos() {
  if (step() === 'enxaguar' && clock < sprayUntil) return [sprayAt[0] + L.r * .2, sprayAt[1] - L.r * 1.5];
  return [L.hook[0], L.hook[1] + L.r * .5];
}

function drawFade() {
  const e = clock - fadeAt;
  if (e < 0 || e > FADE * 2) return;
  ctx.fillStyle = `rgb(200 235 250 / ${Math.sin(e / (FADE * 2) * Math.PI)})`; ctx.fillRect(0, 0, W, H);
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutBath();
}

function update(dt) {
  updateBath(dt);
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(roomLayer, 0, 0, W, H);
  const sink = sinkAt < 0 ? 0 : Math.min((clock - sinkAt) / 1.2, 1);
  drawWater(t);
  drawMounds(false, sink);
  drawKidBody(t);
  drawWaterFront();
  drawMounds(true, sink);
  drawToys(t, sink);
  drawTubFront(ctx);
  drawPaws();
  drawFaucet(t);
  drawBottle(t, squeezeAt);
  drawTowelOnRack(kid.wrapAt < 0 ? 0 : Math.min((clock - kid.wrapAt) / .2, 1));
  drawWrap(t);
  const [sx, sy] = showerPos();
  drawShower(sx, sy, clock < sprayUntil && step() === 'enxaguar');
  drawBubbles();
  drawFloaters();
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
  drawFade();
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel: () => { press = null; },
  onAmbient: () => {},   // banheiro: sem passarinho
  onStart: () => {
    document.querySelector('.steps').classList.add('on');
    talk('vamos');
    setTimeout(startBath, 1200);
  },
});
