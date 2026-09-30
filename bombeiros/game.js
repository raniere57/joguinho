'use strict';
// Bombeiros: fogo na casinha! Segurar o dedo no fogo joga água da mangueira até apagar.
// Depois um bichinho fica preso lá em cima: toca na escada, ela sobe, o bombeiro busca
// o bichinho e desce com ele no colo. Cada missão vale uma estrela; depois vem outra casa.

const HINT_AFTER = 6, REPEAT_AFTER = 14, FADE = .6;
const PETS = [
  { id: 'gato', e: '🐱', som: 'miau' }, { id: 'cachorro', e: '🐶', som: 'au' },
  { id: 'coelho', e: '🐰', som: 'oba' }, { id: 'pintinho', e: '🐥', som: 'piu' },
];
const FIRE_SPOTS = ['upL', 'upR', 'loL', 'loR', 'attic', 'roof'];
const FIREMAN = { ...BICHOS[0], day: '#ffd23b' };
// linha do tempo do resgate (segundos): escada sobe, pula na escada, sobe, pega, desce, pula, escada desce
const T = { up: 1.1, hop: 1.5, climb: 2.9, grab: 3.4, down: 4.8, back: 5.2, rest: 6.2 };

const VOZ = {
  vamos: 'Os bombeiros chegaram!',
  fogo: 'Fogo na casinha! Segure o dedo no fogo pra apagar!',
  mais: 'Ainda tem fogo! Segure o dedo no fogo!',
  apagou: 'Apagou tudo! Muito bem!',
  'r-gato': 'O gatinho ficou preso lá em cima! Toque na escada!',
  'r-cachorro': 'O cachorrinho ficou preso lá em cima! Toque na escada!',
  'r-coelho': 'A coelhinha ficou presa lá em cima! Toque na escada!',
  'r-pintinho': 'O pintinho ficou preso lá em cima! Toque na escada!',
  escada: 'Toque na escada!', subindo: 'Sobe, bombeiro!', salvo: 'Salvou! Você é um herói!',
  nova: 'Olha lá! Mais um fogo! Vamos!',
};
const VOZ_B = { socorro: 'Socorro! Me ajuda!', obrigado: 'Obrigado, bombeiro!', oba: 'Oba!', miau: 'Miau!', au: 'Au au!', piu: 'Piu piu!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let phase = 'intro', phaseAt = 0, lastAct = 0, lastSaid = 0, mission = 0, fadeAt = -99;
let press = null, lastSpray = 0, sirenUntil = 0, lastSiren = -9, pet = null, rescueAt = -1, ffHopAt = -9, lastB = -99;
const ffLook = newLook();

meter.size = 5;
meter.onFull = () => { sfx.fanfare(); confettiRain(90); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const setPhase = p => { phase = p; phaseAt = lastAct = clock; };
const style = () => HOUSES[mission % HOUSES.length];

function siren() {
  if (clock - lastSiren < 2.4) return;
  lastSiren = clock; sirenUntil = clock + 2.4; sfx.siren();
}

// ---------- missão ----------
function startMission(first) {
  houseLayer = buildHouse(style());
  const n = Math.min(3 + Math.floor(mission / 2), 5);
  lightFires([...FIRE_SPOTS].sort(() => Math.random() - .5).slice(0, n));
  pet = null; rescueAt = -1; smoke = [];
  setPhase('apagar'); siren();
  talk(first ? 'fogo' : 'nova', first); if (!first) talk('fogo', true);
}

function fireOut() {
  lastAct = clock;
  if (phase !== 'apagar' || burning().length) return;
  setPhase('apagou'); talk('apagou');
  setTimeout(startRescue, 2200);
}

function startRescue() {
  const sp = houseSpots(), id = pick(['upL', 'upR', 'attic', 'roof']);
  pet = { ...PETS[mission % PETS.length], ...sp[id], spot: id, state: 'preso', at: clock, hopAt: -9 };
  setPhase('resgate'); sfx.pop();
  talk('socorro'); talk('r-' + pet.id, true);
}

function goRescue() {
  if (phase !== 'resgate') return;
  setPhase('subindo'); rescueAt = clock; press = null;
  sfx.whoosh(); talk('subindo');
  const at = [[T.up, () => sfx.click()], [T.hop, () => sfx.boing()], [T.grab, grabPet], [T.back, landed]];
  for (const [s, f] of at) setTimeout(f, s * 1000);
}

function grabPet() { pet.state = 'colo'; sfx.pop(); talk(pet.som); }

function landed() {
  pet.state = 'chao'; pet.hopAt = clock; ffHopAt = clock;
  const [x, y] = petXY();
  sfx.chime(); burst(x, y, L.r * .6, 50, 16); launchStar(x, y);
  setPhase('salvo');
  talk('obrigado'); talk('salvo', true);
  setTimeout(() => { fadeAt = clock; setTimeout(() => { mission++; startMission(false); }, FADE * 1000); }, 6000);
}

// ---------- resgate: poses ----------
const ease = k => { k = Math.min(Math.max(k, 0), 1); return k * k * (3 - 2 * k); };

function ladderTarget() {
  const [px, py] = L.pivot, tx = pet ? pet.x : px, ty = pet ? pet.y + pet.h * .35 : py;
  return { a: Math.atan2(ty - py, tx - px), len: Math.hypot(tx - px, ty - py) - L.r * .2 };
}

function ladderPose() {
  if (rescueAt < 0) return { a: -.03, len: L.restLen };
  const e = clock - rescueAt, k = e < T.back ? ease(e / T.up) : 1 - ease((e - T.back) / (T.rest - T.back)), tg = ladderTarget();
  return { a: -.03 + (tg.a + .03) * k, len: L.restLen + (tg.len - L.restLen) * k };
}

// posição dos pés do bombeiro e se está na escada
function firemanPose() {
  const [sx, sy] = L.stand;
  if (rescueAt < 0) return { x: sx, y: sy, on: false };
  const e = clock - rescueAt, lad = ladderPose(), ca = Math.cos(lad.a), sa = Math.sin(lad.a), [px, py] = L.pivot;
  const at = d => ({ x: px + ca * d, y: py + sa * d + L.r * .1, on: true });
  const top = lad.len - L.r * 1.2, base = L.r * .8;
  if (e < T.hop) return { x: sx, y: sy, on: false };
  if (e < T.climb) {
    const k = (e - T.hop) / (T.climb - T.hop);
    if (k < .25) { const q = ease(k / .25), b = at(base); return { x: sx + (b.x - sx) * q, y: sy + (b.y - sy) * q - Math.sin(q * Math.PI) * L.r * 1.2, on: q > .5 }; }
    return at(base + (top - base) * ease((k - .25) / .75));
  }
  if (e < T.grab) return at(top);
  if (e < T.down) return at(top - (top - base) * ease((e - T.grab) / (T.down - T.grab)));
  if (e < T.back) { const q = ease((e - T.down) / (T.back - T.down)), b = at(base); return { x: b.x + (sx - b.x) * q, y: b.y + (sy - b.y) * q - Math.sin(q * Math.PI) * L.r * 1.2, on: q < .5 }; }
  return { x: sx, y: sy, on: false };
}

function petXY() {
  if (!pet) return [0, 0];
  if (pet.state === 'preso') return [pet.x, pet.y + pet.h * .1 - Math.abs(Math.sin(clock * 4)) * pet.h * .12];
  const f = firemanPose(), s = f.on ? .8 : 1;
  if (pet.state === 'colo') return [f.x + L.r * .75 * s, f.y - L.r * 1.55 * s];
  const [sx, sy] = L.stand, hop = pulseAt(pet.hopAt, .5) * L.r * .8;
  return [sx - L.r * 1.6, sy - L.r * .7 - hop];
}

// ---------- desenho ----------
function drawFireman(t) {
  const f = firemanPose(), s = f.on ? .8 : 1, r = L.r * s, v = ffLook;
  const hop = f.on ? 0 : pulseAt(ffHopAt, .45) * r * .5;
  v.blink = (t % 3.1) < .12 ? .1 : 1;
  v.arms = f.on || phase === 'salvo' ? 'up' : 'down';
  v.mouth = phase === 'apagar' && jet && clock - jet.at < .1 ? 'o' : 'smile';
  if (!f.on) { ctx.fillStyle = 'rgb(0 0 0 / .15)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, r * .8, r * .16, 0, 0, TAU); ctx.fill(); }
  drawBicho(ctx, f.x, f.y - hop, r, FIREMAN, v, t);
  const [hx, hy] = headCenter(f.x, f.y - hop, r);
  drawHelmet(hx, hy, r);
}

function drawHose() {
  const { x, y, len: u } = L.truck, rx = x + u * .6, ry = y - u * .28, [nx, ny] = nozzle(), standing = rescueAt < 0 || clock - rescueAt > T.back || clock - rescueAt < T.hop;
  const ex = standing ? nx : L.stand[0] - L.r * .6, ey = standing ? ny : L.stand[1] - L.r * .1;
  for (const [c, w] of [['#c98f00', L.r * .22], ['#ffd23b', L.r * .15]]) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + u * .05, L.stand[1] + L.r * .2, (rx + ex) / 2, L.stand[1] - L.r * .05);
    ctx.quadraticCurveTo(ex - L.r * .3, L.stand[1], ex, ey); ctx.stroke();
  }
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(standing ? -2.4 : 0);   // bico da mangueira
  ctx.fillStyle = '#8f96a3'; ctx.beginPath(); ctx.roundRect(-L.r * .1, -L.r * .12, L.r * .45, L.r * .24, L.r * .06); ctx.fill();
  ctx.restore();
}

function drawPet(t) {
  if (!pet) return;
  const [x, y] = petXY(), size = pet.state === 'preso' ? pet.h * 1.15 : L.r * (pet.state === 'colo' ? 1.1 : 1.5);
  const pop = Math.min((clock - pet.at) / .3, 1);
  emojiAt(ctx, pet.e, x, y, size * easeOutBack(pop), pet.state === 'preso' ? Math.sin(t * 6) * .12 : 0);
  if (pet.state === 'preso') {   // bracinho acenando: balão de socorro
    const bx = x + size * .75, by = y - size * .75, br = size * .38;
    ctx.fillStyle = '#fff'; circle(ctx, bx, by, br); ctx.fill();
    emojiAt(ctx, '🆘', bx, by, br * 1.4);
  }
}

function hitPet(x, y) {
  if (!pet) return false;
  const [px, py] = petXY();
  return Math.hypot(x - px, y - py) < Math.max(L.r, pet.h) * .9;
}

function hitFireman(x, y) {
  const f = firemanPose();
  return !f.on && Math.abs(x - f.x) < L.r && y < f.y && y > f.y - L.r * 3.4;
}

function nearLadder(x, y) {
  const lad = ladderPose(), [px, py] = L.pivot, ca = Math.cos(lad.a), sa = Math.sin(lad.a);
  const d = (x - px) * ca + (y - py) * sa, off = Math.abs(-(x - px) * sa + (y - py) * ca);
  return d > -L.r && d < lad.len + L.r && off < L.r * .8;
}

// ---------- toques ----------
function onTap(x, y) {
  lastAct = clock;
  if (tapBird(x, y)) return;
  if (phase === 'resgate' && (hitTruck(x, y) || nearLadder(x, y) || hitPet(x, y))) { goRescue(); return; }
  if (hitTruck(x, y)) { siren(); return; }
  if (pet?.state === 'chao' && hitPet(x, y)) { pet.hopAt = clock; sfx.squeak(); if (clock - lastB > 2) { lastB = clock; talk(pet.som); } return; }
  if (phase !== 'apagar' && hitFireman(x, y)) { ffHopAt = clock; sfx.giggle(); if (clock - lastB > 3) { lastB = clock; talk('oba'); } return; }
  if (phase === 'subindo') { sfx.pop(); ring(x, y, L.r * .3); return; }
  press = { x, y };
}

function onMove(x, y) { if (press) { press.x = x; press.y = y; } }
function onUp() { press = null; }

// ---------- dica ----------
function hintTarget() {
  if (phase === 'apagar') { const f = burning()[0]; return f ? [f.x, f.y] : null; }
  if (phase === 'resgate') { const lad = ladderPose(); return [L.pivot[0] + Math.cos(lad.a) * lad.len * .5, L.pivot[1] - L.r * .2]; }
  return null;
}

function drawHint(t) {
  if (!['apagar', 'resgate'].includes(phase) || press || clock - lastAct < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  const size = Math.round(Math.max(L.r * 1.1, 40) / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + L.r * .2 + Math.abs(Math.sin(t * 4)) * L.r * .3, size, size);
}

function remind() {
  if (clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  if (phase === 'apagar') talk('mais');
  else if (phase === 'resgate') { talk('socorro'); talk('escada', true); }
  else return;
  lastAct = clock;
}

// ---------- ciclo ----------
function update(dt) {
  updateSky(dt);
  if (started) {
    if (press && phase !== 'subindo') {
      spray(press.x, press.y, dt);
      if (clock - lastSpray > .12) { lastSpray = clock; sfx.spray(); }
      lastAct = clock;
    }
    updateSmoke(dt, clock);
    remind();
  }
  updateMeter(dt);
}

function drawFade() {
  const e = clock - fadeAt;
  if (e < 0 || e > FADE * 2) return;
  ctx.fillStyle = `rgb(255 255 255 / ${Math.sin(e / (FADE * 2) * Math.PI)})`; ctx.fillRect(0, 0, W, H);
}

function render(t) {
  drawSkyBack(t);
  drawHills();
  ctx.drawImage(houseLayer, 0, 0, W, H);
  drawFires(t);
  drawSmoke();
  drawHose();
  drawTruck(t, clock < sirenUntil, ladderPose());
  drawFireman(t);
  drawPet(t);
  drawJet(t);
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
  drawFade();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutStreet();
  buildSky(L.ground);
  houseLayer = buildHouse(style());
  const sp = houseSpots();
  for (const f of flames) Object.assign(f, sp[f.id], { size: Math.min(sp[f.id].w, sp[f.id].h * 1.3) * 1.25 });
  if (pet) Object.assign(pet, sp[pet.spot]);
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel: () => { press = null; },
  onBird: spawnBird,
  onStart() {
    talk('vamos'); siren();
    setTimeout(() => startMission(true), 1500);
  },
});
