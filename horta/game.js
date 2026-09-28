'use strict';
// Horta: planta a sementinha, rega, o sol faz crescer, colhe e dá pro bichinho que está com fome.
// Tocar na nuvem faz chover (rega tudo), tocar no sol esquenta todas; borboletas e minhoca pra brincar.

const HINT_AFTER = 6, REPEAT_AFTER = 15, TALK_GAP = 2.4;

const VOZ = {
  intro: 'Vamos cuidar da horta! Toque na terra pra plantar uma sementinha.',
  plantou: 'Plantou! Agora ela quer água.',
  sede: 'A plantinha está com sede! Toque nela pra regar.',
  quersol: 'Agora ela quer sol! Toque no sol.',
  agua: 'Que água fresquinha!',
  solzinho: 'O solzinho esquenta a plantinha!',
  cresceu: 'Olha! Cresceu!',
  flor: 'Nasceu uma florzinha!',
  pronta: 'Está pronta! Pode colher!',
  cesta: 'Vai pra cestinha!',
  chuva: 'Choveu! A horta ficou molhadinha!',
  borboleta: 'Uma borboleta!',
  festa: 'Que horta linda! Parabéns!',
  plantar: 'Toque na terra pra plantar!',
  ...Object.fromEntries(CROP_IDS.map(c => ['h-' + c, CROPS[c].name])),
  ...Object.fromEntries(VISITORS.map(v => ['a-' + v.id, v.text])),
};
const VOZ_B = { nham: 'Nham, nham! Que gostoso! Obrigado!', minhoca: 'Hi hi! Oi, eu sou a minhoca!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let saidAt = -99, saidOnce = new Set(), repeatAt = 0, lastButterflyTalk = -99, lastWormTalk = -99;

meter.size = 5;
meter.onFull = () => {
  confettiRain(); startRainbow(); sfx.fanfare();
  talk('festa', true);
  for (const b of butterflies) { b.sitUntil = 0; b.fast = clock + 2.5; }
};

// fala sem atropelar: se acabou de falar, só fala o que é importante
function talk(line, force = false, queue = false) {
  if (!force && clock - saidAt < TALK_GAP) return;
  saidAt = clock; saidOnce.add(line);
  say(line, VOZ[line] || VOZ_B[line], queue);
}

// ---------- ganchos chamados pela horta e pelos bichos ----------
function onGrew(p) {
  if (p.stage === RIPE) talk('pronta', true);
  else if (p.stage === 3) talk(p.crop === 'girassol' || p.crop === 'milho' ? 'cresceu' : 'flor');
  else if (!saidOnce.has('quersol') && p.stage === 1) setTimeout(() => talk('quersol', true), 900);
  else if (!saidOnce.has('sede') && p.stage === 2) setTimeout(() => talk('sede', true), 900);
  else talk('cresceu');
}

function onVisitorArrived(v) {
  talk('a-' + v.d.id, true, true);
  // já tem na cestinha? entrega de lá
  const i = basket.lastIndexOf(v.d.want);
  if (i >= 0) setTimeout(() => {
    if (visitor !== v || v.state !== 'wait') return;
    basket = basket.filter((_, k) => k !== i);
    flyCrop(v.d.want, L.basket.x, L.basket.y - L.s * .6, 'visitor');
    v.state = 'coming';
  }, 2600);
}
function onVisitorTapped(v) { talk('a-' + v.d.id); }
function onVisitorFed() { setTimeout(() => say('nham', VOZ_B.nham), 300); saidAt = clock + 1; }
function onButterfly() { if (clock - lastButterflyTalk > 10) { lastButterflyTalk = clock; talk('borboleta'); } }
function onWorm() { if (clock - lastWormTalk > 12) { lastWormTalk = clock; talk('minhoca', true); } }

// ---------- escolhas ----------
function chooseCrop() {
  const growing = plots.filter(p => p.crop).map(p => p.crop), want = visitor?.d.want;
  if (want && !growing.includes(want) && !basket.includes(want)) return want;
  const free = CROP_IDS.filter(c => !growing.includes(c));
  return pick(free.length ? free : CROP_IDS);
}

function harvest(p) {
  const crop = p.crop, x = p.x, y = plantTop(p) + L.s * .3;
  p.crop = null; p.stage = -1; p.grewAt = clock;
  sfx.pop(); sfx.whoosh();
  burst(p.x, p.y - L.s * .1, L.s * .4, 30, 10);
  talk('h-' + crop, true);
  if (visitorWaiting() && visitor.d.want === crop) { visitor.state = 'coming'; flyCrop(crop, x, y, 'visitor'); }
  else {
    flyCrop(crop, x, y, 'basket');
    if (!saidOnce.has('cesta')) setTimeout(() => talk('cesta', true), 900);
  }
}

// ---------- toques ----------
function tapPlot(p) {
  const need = needOf(p);
  if (!p.crop) {
    plant(p, chooseCrop());
    if (!saidOnce.has('plantou')) talk('plantou', true);
  } else if (isRipe(p)) harvest(p);
  else if (need === 'agua') { startGrow(p, 'agua'); sfx.spray(); setTimeout(() => talk('agua'), 300); }
  else if (need === 'sol') { shine(p); }
  else { sfx.squeak(); sparkle(p.x, p.y - L.s * .3); }
}

function shine(p, delay = 0) {
  startGrow(p, 'sol', delay);
  sunTapAt = clock; sfx.chime();
  if (!delay) setTimeout(() => talk('solzinho'), 300);
}

function tapSun(x, y) {
  if (Math.hypot(x - sky.sunX, y - sky.sunY) > sky.sunR * 1.6) return false;
  const want = plots.filter(p => needOf(p) === 'sol');
  sunTapAt = clock;
  if (want.length) { want.forEach((p, i) => shine(p, i * .2)); talk('solzinho'); }
  else { sfx.boing(); burst(sky.sunX, sky.sunY, sky.sunR, 50, 10); }
  return true;
}

function tapCloud(x, y) {
  const c = sky.clouds.find(c => x > c.x && x < c.x + c.sprite.w && y > c.y && y < c.y + c.sprite.h * .8);
  if (!c) return false;
  if (!rain) { startRain(c); setTimeout(() => talk('chuva', true), 600); }
  return true;
}

function onTap(x, y) {
  // planta esperando alguma coisa ganha da borboleta pousada nela
  if (tapWorm(x, y)) return;
  const p = plotAt(x, y);
  if (p && (!p.crop || isRipe(p) || needOf(p))) { shooButterflies(p.x, plantTop(p)); tapPlot(p); return; }
  if (tapButterfly(x, y) || tapVisitor(x, y) || tapBasket(x, y)) return;
  if (p) { tapPlot(p); return; }
  if (tapSun(x, y) || tapCloud(x, y) || tapBird(x, y)) return;
  sfx.blub(); burst(x, y, L.s * .2, rand(80, 140), 6);
}

// ---------- dica: dedinho aponta o que dá pra fazer ----------
function hintTarget() {
  if (rain || plots.some(p => p.busy) || flyers.length) return null;
  const s = L.s, ripe = plots.find(isRipe);
  if (ripe) return { x: ripe.x, y: ripe.y + s * .6, line: 'pronta' };
  const water = plots.find(p => needOf(p) === 'agua');
  if (water) return { x: water.x, y: water.y + s * .6, line: 'sede' };
  if (plots.some(p => needOf(p) === 'sol')) return { x: sky.sunX, y: sky.sunY + sky.sunR * 1.9, line: 'quersol' };
  const empty = plots.find(p => !p.crop);
  if (empty) return { x: empty.x, y: empty.y + s * .6, line: 'plantar' };
  return null;
}

function drawHint(t) {
  const idle = clock - lastTap;
  if (idle < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  if (idle > REPEAT_AFTER && clock - repeatAt > REPEAT_AFTER) { repeatAt = clock; talk(h.line, true); }
  const bob = Math.abs(Math.sin(t * 4)) * L.s * .15;
  ctx.globalAlpha = Math.min((idle - HINT_AFTER) / .4, 1);
  emojiAt(ctx, '👆', h.x + L.s * .08, h.y + bob, L.s * .6);
  ctx.globalAlpha = 1;
}

// ---------- ciclo ----------
function resize() {
  fitCanvas();
  layoutGarden();
  buildSky(L.ground);
  buildBed();
  if (!butterflies.length) makeButterflies();
  for (const b of butterflies) { b.x = Math.min(b.x, W - 10); b.y = Math.min(b.y, H * .7); b.goal = butterflyGoal(b); }
  worm = null;
}

function update(dt) {
  updateSky(dt);
  updatePlots();
  updateVisitor();
  updateFlyers();
  updateButterflies(dt);
  updateWorm();
  updateMeter(dt);
}

function render(t) {
  drawSkyBack(t);
  drawRainbow();
  drawHills();
  drawSunGlow();
  drawGarden(t);
  drawWorm(t);
  drawBasket(t);
  drawVisitor(t);
  drawFlyers();
  drawRain();
  for (const b of butterflies) drawButterfly(b, t);
  drawFloaters();
  drawRings();
  drawParticles();
  if (started) drawHint(t);
  drawMeter();
  drawConfetti();
}

boot({
  resize, update, render, onTap,
  onBird: spawnBird,
  onStart() {
    nextWormAt = clock + 8;
    talk('intro', true);
    setTimeout(nextVisitor, 3800);
  },
});
