'use strict';
// Fazendinha: fazenda larga pra explorar arrastando o dedo. A tia pede missões ("Onde está o sapo?",
// "O porquinho quer uma maçã!") e tudo na tela responde ao toque.

loadVoices(['vamos', 'vaca', 'porco', 'ovelha', 'galinha', 'galo', 'pato', 'cavalo', 'cachorro', 'coelho', 'gato', 'sapo',
  'pintinho', 'cenoura', 'leite', 'lama', 'trator', 'noite', 'dia', 'dormindo', 'muito-bem', 'achou', 'adorou', 'chuva',
  'maca', 'moinho', 'bolinha', 'la', 'arrasta',
  'onde-vaca', 'onde-porco', 'onde-ovelha', 'onde-galinha', 'onde-pato', 'onde-cachorro', 'onde-coelho', 'onde-gato',
  'onde-sapo', 'onde-galo', 'onde-cavalo',
  'fome-vaca', 'fome-ovelha', 'fome-coelho', 'fome-galinha', 'fome-porco', 'fome-cachorro']);

const FEEDS = { vaca: '🌾', ovelha: '🌾', coelho: '🥕', galinha: '🌽', porco: '🍎', cachorro: '🦴' };
const NAMES = { vaca: 'a vaca', porco: 'o porquinho', ovelha: 'a ovelha', galinha: 'a galinha', pato: 'o pato', cachorro: 'o cachorro',
  coelho: 'o coelho', gato: 'o gatinho', sapo: 'o sapo', galo: 'o galo', cavalo: 'o cavalo' };
const DRAG_START = 12;            // px que o dedo anda antes de virar arrasto (e não toque)
const MISSION_REPEAT = 14, MISSION_HINT = 7;

let press = null, vel = 0, camGoal = null, pannedOnce = false, frameDt = 0, lastSleepSay = -99;
let mission = null, nextMissionAt = 0, lastMission = null;

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  confettiRain();
  animals.forEach((a, i) => { a.hopAt = clock + i * .1; });
  say('muito-bem', 'Muito bem! Você cuida muito bem da fazendinha!', true);
};

const maxCam = () => Math.max(0, worldW - W);
const clampCam = x => Math.min(Math.max(x, 0), maxCam());

// ---------- missões ----------
function newMission() {
  const feed = Math.random() < .45;
  const pool = feed ? Object.keys(FEEDS) : Object.keys(NAMES);
  const id = pick(pool.filter(i => i !== lastMission));
  mission = { type: feed ? 'feed' : 'find', id, at: clock, saidAt: clock };
  lastMission = id;
  sayMission();
}

function sayMission() {
  mission.saidAt = clock;
  if (mission.type === 'find') say('onde-' + mission.id, `Onde está ${NAMES[mission.id]}?`);
  else say('fome-' + mission.id, `${NAMES[mission.id]} está com fome!`);
}

function missionTarget() {
  if (!mission) return null;
  if (mission.id === 'cavalo') { const b = barnBox(); return { x: b.x, y: b.y - b.h * .4 }; }
  const a = byId(mission.id);
  return a && { x: a.x, y: a.y - a.s * .5 };
}

function completeMission(x, y) {
  launchStar(x - camX, y);
  mission = null;
  nextMissionAt = clock + rand(9, 14);
}

// ---------- toques: arrastar move a câmera; toque sem arrastar age ----------
function onTap(x, y) { press = { x, y, cam: camX, moved: false, lastX: x, lastT: clock }; vel = 0; camGoal = null; }

function onMove(x) {
  if (!press) return;
  if (!press.moved && Math.abs(x - press.x) > DRAG_START) press.moved = true;
  if (!press.moved) return;
  camX = clampCam(press.cam - (x - press.x));
  const dt = Math.max(clock - press.lastT, 1 / 120);
  vel = vel * .5 + ((press.lastX - x) / dt) * .5;
  press.lastX = x; press.lastT = clock;
  pannedOnce = true;
}

function onUp() {
  if (press && !press.moved) handleTap(press.x, press.y);
  if (press && clock - press.lastT > .1) vel = 0;
  press = null;
}

function onCancel() { press = null; vel = 0; }

// setas na tela e rodinha do mouse/trackpad
function panBy(dx) {
  camGoal = clampCam((camGoal ?? camX) + dx);
  pannedOnce = true; vel = 0;
}
const panBtns = [...document.querySelectorAll('.pan')];
for (const b of panBtns) {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!started) return;
    sfx.resume(); sfx.whoosh(); lastTap = clock;
    panBy((b.classList.contains('left') ? -1 : 1) * W * .75);
  });
}
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (!started) return;
  camGoal = null; vel = 0; pannedOnce = true;
  camX = clampCam(camX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY));
}, { passive: false });

function showPanBtns() {
  const target = camGoal ?? camX, on = started && night < .5;
  panBtns[0].classList.toggle('show', on && target > 4);
  panBtns[1].classList.toggle('show', on && target < maxCam() - 4);
  panBtns[1].classList.toggle('nudge', !pannedOnce);
}

function handleTap(x, y) {
  lastTap = clock;
  if (tapSky(x, y)) return;
  if (tapArrow(x, y)) return;
  if (tapFarmBird(x, y)) return;
  const cloud = tapCloud(x, y);
  if (cloud) { if (cloud.grew) say('chuva', 'Choveu! A horta cresceu!'); return; }
  if (tapWorld(x + camX, y)) return;
  sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
}

function tapSky(x, y) {
  const { x: sx, y: sy } = sunPos();
  if (Math.hypot(x - sx, y - sy) > sunR * 1.6) return false;
  if (!isNight) {
    if (clock - sunTapAt < 1.5) return true;
    sunTapAt = clock;
    sfx.giggle(); burst(sx, sy, sunR, 45, 16);
    setTimeout(() => { isNight = true; say('noite', 'Boa noite, fazendinha! Os bichinhos vão dormir.'); }, 1200);
  } else wakeUp();
  return true;
}

function wakeUp() {
  moonTapAt = clock;
  isNight = false;
  sfx.chime();
  const galo = byId('galo');
  galo.flapAt = clock; galo.hopAt = clock;
  setTimeout(() => say('dia', 'Cocoricó! Bom dia, fazendinha!'), 600);
}

// seta na beirada da tela apontando pra missão: tocar leva a câmera até lá
function arrowInfo() {
  const tg = missionTarget();
  if (!tg || night > .5) return null;
  const sx = tg.x - camX;
  if (sx > S * .3 && sx < W - S * .3) return null;
  const right = sx >= W - S * .3;
  return { x: right ? W - S * .75 : S * .75, y: Math.min(Math.max(tg.y, H * .5), H * .85), right, tg };
}

function tapArrow(x, y) {
  const a = arrowInfo();
  if (!a || Math.hypot(x - a.x, y - a.y) > S * .8) return false;
  camGoal = clampCam(a.tg.x - W / 2);
  sfx.whoosh();
  return true;
}

function tapWorld(wx, y) {
  const near = (px, py, r) => Math.hypot(wx - px, y - py) < r;
  const egg = eggs.find(e => near(e.x, e.y - S * .3, S * .5));
  if (egg) { tapEgg(egg); return true; }
  const chick = chicks.find(c => near(c.x, c.y - S * .25, S * .45));
  if (chick) { chick.hopAt = clock; sfx.chirp(); return true; }
  if (horse.x !== undefined && clock - horse.at < GALLOP_TIME && near(horse.x, horse.y - S * .7, S)) {
    say('cavalo', 'O cavalo faz: hiiiiiii!');
    if (mission?.id === 'cavalo') { say('achou', 'Achou! Muito bem!', true); completeMission(horse.x, horse.y - S); }
    return true;
  }
  const a = animals.filter(a => !a.hidden && near(a.x, a.y - a.s * .45, a.s * .7))
    .sort((p, q) => Math.hypot(wx - p.x, y - p.y) - Math.hypot(wx - q.x, y - q.y))[0];
  if (a) { tapAnimal(a); return true; }
  return tapThing(wx, y, near);
}

function tapAnimal(a) {
  if (night > .5 && a.id !== 'galo') {
    a.hopAt = clock;
    zzz.push({ x: a.x, y: a.y - a.s * .8, t: 0 });
    if (clock - lastSleepSay > 3) { lastSleepSay = clock; say('dormindo', 'Shhh... está dormindo.'); }
    return;
  }
  if (a.id === 'galo' && isNight) { a.flapAt = clock; wakeUp(); return; }
  if (mission?.id === a.id) {
    const x = a.x, y = a.y - a.s;
    if (mission.type === 'feed') { a.hopAt = clock; feed(a, FEEDS[a.id]); completeMission(x, y); return; }
    completeMission(x, y);
    actAnimal(a);
    say('achou', 'Achou! Muito bem!', true);
    return;
  }
  actAnimal(a);
}

function tapThing(wx, y, near) {
  const plot = plots.find(p => Math.abs(wx - p.x) < S * .8 && Math.abs(y - p.y) < S * .6);
  if (plot) {
    if (plot.stage < 3) { growPlot(plot); sfx.bell(659 + plot.stage * 200); return true; }
    plot.stage = 0; plot.at = clock;
    const b = byId('coelho');
    carrots.push({ x0: plot.x, y0: plot.y - S * .3, x1: b.x, y1: b.y - b.s * .3, t: 0 });
    sfx.whoosh();
    say('cenoura', 'Uma cenoura! Vamos dar pro coelho?');
    return true;
  }
  if (fallen.some(f => near(f.cx, f.cy, S * .5))) { pigGo(byId('porco')); return true; }
  const tr = treeBox();
  if (near(tr.x, tr.y - tr.r * 1.5, tr.r * 1.3)) {
    if (shakeTree()) {
      say('maca', 'Caiu uma maçã!');
      setTimeout(() => { const pig = byId('porco'); if (!pig.act && night < .5) pigGo(pig); }, 1400);
    }
    return true;
  }
  const m = millBox();
  if (Math.abs(wx - m.x) < m.h * .55 && y < m.y && y > m.y - m.h * 1.5) {
    mill.boost = 3; sfx.whoosh();
    say('moinho', 'Olha o moinho girando!');
    return true;
  }
  const b = barnBox();
  if (Math.abs(wx - b.x) < b.w * .6 && y < b.y && y > b.y - b.h - b.w * .35) {
    if (barnOpen() > 0) return true;
    barnState.openAt = clock; horse.at = clock; sfx.whoosh();
    setTimeout(() => say(night > .5 ? 'dormindo' : 'cavalo', night > .5 ? 'Shhh... está dormindo.' : 'O cavalo faz: hiiiiiii!'), 600);
    if (mission?.id === 'cavalo') { say('achou', 'Achou! Muito bem!', true); completeMission(b.x, b.y - b.h); }
    return true;
  }
  if (Math.abs(wx - tractorState.x) < S * .8 && Math.abs(y - (H * SPOT.tractor[1] - S * .4)) < S * .7) {
    if (clock - tractorState.driveAt > DRIVE_TIME) { tractorState.driveAt = clock; sfx.boing(); say('trator', 'Olha o trator! Vrum, vrum!'); }
    return true;
  }
  if (near(wX(SPOT.doghouse[0]), H * SPOT.doghouse[1] - S * .5, S * .8)) { tapAnimal(byId('cachorro')); return true; }
  const fl = flowerSpots().find(([fx, fy]) => Math.abs(wx - fx) < S * 1.2 && Math.abs(y - fy) < S * .6);
  if (fl) { flyers.push({ x: wx, y: fl[1] - S * .3, t: 0, seed: rand(0, TAU), vx: rand(-30, 30) }); sfx.chime(); return true; }
  const [px, py, rx, ry] = SPOT.pond;
  if (((wx - wX(px)) / wX(rx)) ** 2 + ((y - H * py) / (H * ry)) ** 2 < 1.3) {
    ring(wx - camX, y, S * .6); sfx.splash();
    hearts(wx, y, 1, '🐟');
    return true;
  }
  return false;
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  const portrait = H >= W;
  S = Math.min(W * .21, H * (portrait ? .115 : .16), 110);
  worldW = Math.round(Math.max(W * 1.2, S * WORLD_IN_S));
  camX = clampCam(camX);
  sky = { ground: HORIZON };      // passarinho do cenário comum usa isso
  land = buildLand();
  buildSkyBits();
  plots = buildPlots();
  placeAnimals();
}

function update(dt, t) {
  frameDt = dt;
  if (!press) {
    if (camGoal !== null) { camX += (camGoal - camX) * Math.min(dt * 4, 1); if (Math.abs(camGoal - camX) < 1) camGoal = null; }
    else if (Math.abs(vel) > 5) { camX = clampCam(camX + vel * dt); vel *= Math.pow(.05, dt); }
  }
  showPanBtns();
  updateFarmSky(dt);
  updateBirds(dt);
  updateAnimals(dt, t);
  if (started && night < .5) {
    if (!mission && clock > nextMissionAt) newMission();
    else if (mission && clock - mission.saidAt > MISSION_REPEAT) sayMission();
  }
  if (started && !pannedOnce && clock - lastTap > 25) { pannedOnce = true; say('arrasta', 'Arraste pro lado pra ver mais da fazenda!', true); }
  updateMeter(dt);
}

function drawWorld(t) {
  ctx.save();
  ctx.translate(-camX, 0);
  drawMill(frameDt);
  ctx.drawImage(land, camX * DPR, 0, W * DPR, H * DPR, camX, 0, W, H);
  drawTractor(t);
  drawTree(t);
  drawBarn();
  for (const p of plots) drawPlot(p, t);
  drawFallen(frameDt);
  const things = [
    ...animals.map(a => ({ y: a.y, draw: () => drawAnimal(a, t) })),
    ...eggs.map(e => ({ y: e.y, draw: () => drawEgg(e, t) })),
    ...chicks.map(c => ({ y: c.y, draw: () => drawChick(c, t) })),
    { y: horse.y ?? 0, draw: () => drawHorse(t) },
  ].sort((a, b) => a.y - b.y);
  for (const th of things) th.draw();
  drawThought(t);
  drawBits(frameDt, t);
  ctx.restore();
}

// balão de pensamento com a comida que o bicho quer; na busca, brilho em volta depois de um tempo
function drawThought(t) {
  if (!mission || night > .5) return;
  const tg = missionTarget();
  if (!tg) return;
  if (mission.type === 'find') {
    if (clock - mission.at > MISSION_HINT && Math.random() < .3) sparkle(tg.x - camX + rand(-S * .6, S * .6), tg.y + rand(-S * .5, S * .5));
    return;
  }
  const a = byId(mission.id), bob = Math.sin(t * 2.5) * S * .06, k = easeOutBack(clamp01((clock - mission.at) / .4));
  const cx = a.x + a.s * .45, cy = a.y - a.s * 1.35 + bob, r = S * .42 * k;
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgb(40 80 30 / .25)'; ctx.shadowBlur = 10;
  circle(ctx, a.x + a.s * .15, a.y - a.s * .9, r * .18); ctx.fill();
  circle(ctx, a.x + a.s * .28, a.y - a.s * 1.05, r * .28); ctx.fill();
  circle(ctx, cx, cy, r); ctx.fill();
  ctx.shadowBlur = 0;
  drawSprite(FEEDS[mission.id], cx, cy + r * .55, r * 1.4);
}

function drawArrow(t) {
  const a = arrowInfo();
  if (!a) return;
  const bob = Math.sin(t * 6) * S * .12 * (a.right ? 1 : -1);
  ctx.fillStyle = 'rgb(255 255 255 / .85)';
  circle(ctx, a.x + bob, a.y, S * .5); ctx.fill();
  drawSprite('👉', a.x + bob, a.y + S * .3, S * .6, !a.right);
}

function render(t) {
  drawFarmSky(t);
  drawBirds(t);
  drawWorld(t);
  drawRain();
  drawNightTint();
  drawArrow(t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel, onBird: spawnBird,
  onStart: () => {
    say('vamos', 'Vamos visitar a fazendinha? Toque nos bichinhos!');
    nextMissionAt = clock + 6;
  },
});
