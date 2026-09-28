'use strict';
// Hora de dormir: a rotina da noite de um bichinho, passo a passo (barra embaixo mostra onde está).
// Depois de apagar a luz toca a canção de ninar, ele dorme, amanhece e chega a vez do próximo bichinho.

const ZOOM = 2.1, HINT_AFTER = 6, REPEAT_AFTER = 14, SLEEP_TIME = 13, MORNING_TIME = 4.5, FADE = .6;

loadVoices(['bomdia', 'durma', 'b-ahh', 'b-bocejo', 'b-oba', ...BICHOS.map(b => 'noite-' + b.id), ...STEPS,
  ...Object.values(DONE_TEXT).map(d => d[0]), ...PAGES.map((_, i) => 'pag' + (i + 1)), ...Object.keys(NIGHT_FRIENDS).map(id => 'bn-' + id)]);

let stepI = 0, stepAt = 0, lastAct = 0, lastSaid = 0, stepEnding = false, nightI = 0;
let mode = 'intro', modeAt = 0, fadeAt = -99, frameDt = 0, pointer = null, lastOba = -99;
const cam = { k: 0, z: 1, fx: 0, fy: 0, cx: 0, cy: 0 };
const barEls = [...document.querySelectorAll('.steps span')];

meter.size = STEPS.length;
meter.onFull = () => {   // festa de dormir: sininho baixinho e estrelinhas
  sfx.chime();
  for (let i = 0; i < 30; i++) setTimeout(() => sparkle(rand(0, W), rand(0, floorY)), i * 60);
};

// ---------- câmera (zoom no rosto pra escovar os dentes) ----------
function updateCam(dt) {
  const want = mode === 'steps' && STEPS[stepI] === 'dentes' && scrub < 1 ? 1 : 0;
  cam.k += (want - cam.k) * Math.min(dt * 3, 1);
  [cam.fx, cam.fy] = mouthCenter(spot.x, spot.y, R0);
  cam.z = 1 + (ZOOM - 1) * cam.k;
  cam.cx = cam.fx + (W / 2 - cam.fx) * cam.k; cam.cy = cam.fy + (H * .45 - cam.fy) * cam.k;
}
const toScreen = (x, y) => [cam.cx + (x - cam.fx) * cam.z, cam.cy + (y - cam.fy) * cam.z];
const toWorld = (x, y) => [cam.fx + (x - cam.cx) / cam.z, cam.fy + (y - cam.cy) / cam.z];

// ---------- noite, passos, sono e manhã ----------
function startNight() {
  hero.b = BICHOS[nightI % BICHOS.length]; hero.v = newLook(); hero.pose = 'stand';
  for (const k of Object.keys(asleep)) asleep[k] = false;
  lamp.on = true; darkK = 0; dayK = 0; items = []; book = null; scrub = 0; foam = [];
  lullaby?.stop(); lullaby = null;
  mode = 'steps';
  say('noite-' + hero.b.id, `Está ficando de noite! Vamos preparar ${hero.b.name} pra dormir?`);
  startStep(0, true);
}

function startStep(i, queued) {
  stepI = i; stepAt = lastAct = lastSaid = clock; stepEnding = false;
  STEP_DEFS[STEPS[i]].start();
  barEls.forEach((el, k) => { el.classList.toggle('done', k < i); el.classList.toggle('now', k === i); });
  say(STEPS[i], STEP_TEXT[STEPS[i]], queued);
}

function stepDone() {
  if (stepEnding || mode !== 'steps') return;
  stepEnding = true;
  const name = STEPS[stepI], [hx, hy] = hero.pose === 'bed' ? bed.pillow : headCenter(spot.x, spot.y, R0);
  launchStar(...toScreen(hx, hy));
  barEls[stepI].classList.add('done'); barEls[stepI].classList.remove('now');
  if (DONE_TEXT[name]) say(...DONE_TEXT[name]);
  if (name === 'luz') { mode = 'sleep'; modeAt = clock; setTimeout(() => say('durma', 'Boa noite! Durma bem!', true), 900); return; }
  hero.hopAt = clock; sfx.chime();
  setTimeout(() => { if (mode === 'steps') startStep(stepI + 1); }, 1900);
}

function updateMode(dt) {
  if (!lamp.on && mode !== 'morning') darkK = Math.min(1, darkK + dt);
  if (mode === 'steps') {
    STEP_DEFS[STEPS[stepI]].update?.(dt);
    if (!stepEnding && clock - Math.max(lastAct, lastSaid) > REPEAT_AFTER) { lastSaid = clock; say(STEPS[stepI], STEP_TEXT[STEPS[stepI]]); }
  } else if (mode === 'sleep' && clock - modeAt > SLEEP_TIME) wakeUp();
  else if (mode === 'morning') {
    dayK = Math.min(1, dayK + dt * .6); darkK = Math.max(0, darkK - dt * .8);
    if (clock - modeAt > MORNING_TIME && fadeAt < modeAt) { fadeAt = clock; setTimeout(() => { nightI++; startNight(); }, FADE * 1000); }
  }
}

function wakeUp() {
  mode = 'morning'; modeAt = clock;
  lullaby?.stop(); lullaby = null;
  for (const k of Object.keys(asleep)) asleep[k] = false;
  hero.v.eyes = 'open'; hero.v.mouth = 'smile';
  sfx.chirp(); setTimeout(() => sfx.chirp(), 500);
  say('bomdia', 'Bom dia! Que noite gostosa!');
  barEls.forEach(el => el.classList.remove('now', 'done'));
}

// ---------- toques ----------
function stepDef() { return mode === 'steps' && !stepEnding ? STEP_DEFS[STEPS[stepI]] : null; }
const screenStep = () => ['dentes', 'historia'].includes(STEPS[stepI]);

function onTap(x, y) {
  pointer = [x, y];
  const [wx, wy] = toWorld(x, y), def = stepDef();
  if (def && (screenStep() ? def.tap(x, y) : def.tap(wx, wy))) return;
  if (mode === 'morning') { modeAt = Math.min(modeAt, clock - MORNING_TIME + .5); return; }
  if (mode === 'sleep') { sparkle(x, y); sparkle(x + 6, y - 4); sfx.bell(pick(PENTATONIC) / 2); return; }
  if (hitHero(wx, wy)) {
    hero.hopAt = clock; hero.waveAt = clock; sfx.giggle();
    if (clock - lastOba > 3) { lastOba = clock; say('b-oba', 'Oba!'); }
    return;
  }
  if (friendAt(wx, wy) === 'coruja') { nod.coruja = clock; sfx.hoot(); return; }
  if (Math.hypot(wx - box.x, wy - (box.y - box.w * .3)) < box.w * .6) { boxLid.at = clock; sfx.boing(); return; }
  if (hitLamp(wx, wy)) { lamp.tapAt = clock; sfx.click(); return; }
  sfx.pop(); ring(x, y, R0 * .4);
}

function onMove(x, y) {
  pointer = [x, y];
  const def = stepDef();
  if (!def?.move) return;
  if (screenStep()) def.move(x, y); else def.move(...toWorld(x, y));
}

function onUp() { stepDef()?.up?.(); }
function onCancel() { grab = null; brush = null; }

function hitHero(x, y) {
  if (hero.pose !== 'stand') return false;
  const [hx, hy] = headCenter(spot.x, spot.y, R0);
  return Math.abs(x - hx) < R0 * 1.2 && y > hy - R0 * 1.2 && y < spot.y;
}

barEls.forEach((el, i) => el.addEventListener('click', () => {
  if (!started || mode !== 'steps' || i !== stepI) return;
  sfx.resume(); lastSaid = clock; say(STEPS[i], STEP_TEXT[STEPS[i]]);
}));

// ---------- desenho ----------
function drawHero(t) {
  const v = hero.v, since = clock - hero.blinkAt;
  if (since > 3 + Math.random() * 30) hero.blinkAt = clock;
  v.blink = since < .16 ? Math.max(.1, Math.abs(since / .08 - 1)) : 1;
  if (pointer && mode === 'steps') {
    const [wx, wy] = toWorld(...pointer), [hx, hy] = headCenter(spot.x, spot.y, R0);
    v.look = [Math.max(-1, Math.min(1, (wx - hx) / (R0 * 3))), Math.max(-1, Math.min(1, (wy - hy) / (R0 * 3)))];
  }
  v.arms = clock - (hero.waveAt ?? -99) < 1.2 ? 'wave' : mode === 'morning' ? 'up' : 'down';
  if (hero.pose === 'bed') { drawInBed(ctx, hero.b, v, t); return; }
  drawBlanketBed();
  if (hero.pose === 'hop') {   // pulinho do tapete pra cama
    const p = Math.min((clock - hero.hopAt) / .9, 1), [px, py] = bed.pillow, k = 1 - p * .3;
    const x = spot.x + (px - spot.x) * p, y = spot.y + (py + R0 * 1.5 - spot.y) * p - Math.sin(p * Math.PI) * R0 * 2.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); drawBicho(ctx, 0, 0, R0, hero.b, v, t); ctx.restore();
    return;
  }
  const hop = pulseAt(hero.hopAt, .4) * R0 * .5;
  ctx.fillStyle = 'rgb(0 0 0 / .12)'; ctx.beginPath(); ctx.ellipse(spot.x, spot.y, R0 * .8, R0 * .18, 0, 0, TAU); ctx.fill();
  drawBicho(ctx, spot.x, spot.y - hop, R0, hero.b, v, t);
}

// cama vazia: travesseiro e cobertor esticado
function drawBlanketBed() {
  const [px, py] = bed.pillow;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(px, py, R0 * 1.05, R0 * .45, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8e0f5'; ctx.beginPath(); ctx.ellipse(px, py + R0 * .12, R0 * .9, R0 * .25, 0, 0, TAU); ctx.fill();
  drawBlanket(ctx, -R0 * .25);
}

function drawHint(t) {
  const def = stepDef();
  if (!def || clock - Math.max(lastAct, stepAt) < HINT_AFTER) return;
  const pt = def.hint?.();
  if (!pt) return;
  const [x, y] = def.screenHint ? pt : toScreen(...pt), size = Math.round(R0 * .9 / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), x - size * .45, y + R0 * .2 + Math.abs(Math.sin(t * 4)) * R0 * .3, size, size);
}

function drawFade() {
  const e = clock - fadeAt;
  if (e < 0 || e > FADE * 2) return;
  ctx.fillStyle = `rgb(40 30 80 / ${Math.sin(e / (FADE * 2) * Math.PI)})`; ctx.fillRect(0, 0, W, H);
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  measureMeter();
  layoutRoom();
  if (STEPS[stepI] === 'brinquedos' && items.length && mode === 'steps') {   // brinquedos no chão voltam pro lugar certo
    const spots = TOY_SPOTS[H > W ? 'portrait' : 'landscape'];
    items.forEach((it, i) => { if (it.state === 'floor') { it.x = W * spots[i][0]; it.y = H * spots[i][1]; } });
  }
  if (STEPS[stepI] === 'pijama' && mode === 'steps') items.forEach((it, i) => { if (it.state === 'floor') { it.x = bed.x + bed.w * (.25 + i * .22); it.y = bed.top + R0 * .1; } });
}

function update(dt) {
  frameDt = dt;
  updateCam(dt);
  if (started) updateMode(dt);
  updateMeter(dt);
}

function render(t) {
  ctx.save();
  ctx.translate(cam.cx, cam.cy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.fx, -cam.fy);
  drawSky(t);
  ctx.drawImage(roomBg, 0, 0, W, H);
  drawLamp(t);
  drawToyBox();
  drawHero(t);
  drawPelucia(t);
  STEP_DEFS[STEPS[stepI]].draw?.(t);
  drawFriendGlow(t);
  drawDark(t);
  if (mode === 'sleep' || (mode === 'steps' && hero.v.eyes === 'closed')) zzzAt(bed.pillow[0] - R0 * .3, bed.pillow[1] - R0 * 1.3, R0 * .45, t);
  ctx.restore();
  if (mode === 'steps') STEP_DEFS[STEPS[stepI]].drawTop?.(t);
  drawHint(t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawFade();
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel,
  onAmbient: () => {},   // quarto de noite: sem passarinho
  onStart: () => {
    document.querySelector('.steps').classList.add('on');
    startNight();
  },
});
