'use strict';
// Salão de beleza: o bichinho chega descabelado. Pentear com a escova, cortar com a tesoura
// (corta onde tocar), secar (dá volume e cachinhos), pintar com as tintas, pôr enfeites e tirar
// a foto, que vai pro mural. A barra embaixo mostra o passo; depois chega o próximo cliente.

const STEPS = ['pentear', 'cortar', 'secar', 'pintar', 'enfeitar', 'foto'];
const TOOL = { pentear: 'escova', cortar: 'tesoura', secar: 'secador', pintar: 'pincel', foto: 'camera' };
const HINT_AFTER = 6, REPEAT_AFTER = 14, SNIPS = 5, DRY_TIME = 2.5, PAINTED = 7, TRINKETS_DONE = 2, FADE = .6;

const VOZ = {
  vamos: 'Bem-vinda ao salão de beleza!',
  'chega-urso': 'O ursinho chegou todo descabelado!', 'chega-coelho': 'A coelhinha chegou toda descabelada!',
  'chega-gato': 'O gatinho chegou todo descabelado!', 'chega-panda': 'O panda chegou todo descabelado!',
  pentear: 'Vamos pentear! Passe a escova no cabelo.',
  cortar: 'Agora a tesoura! Toque no cabelo pra cortar.',
  secar: 'Agora o secador! Segure o dedo no cabelo.',
  pintar: 'Vamos pintar o cabelo! Escolha uma cor.',
  enfeitar: 'Agora os enfeites! Escolha um bem bonito.',
  foto: 'Ficou lindo! Toque na câmera pra tirar a foto!',
  xis: 'Diga xis!', mural: 'Olha a foto no mural!',
  'r-penteado': 'Penteadinho!', 'r-corte': 'Que corte lindo!', 'r-cachos': 'Que cachinhos!', 'r-cores': 'Que cabelo colorido!',
  'c-rosa': 'Rosa!', 'c-roxo': 'Roxo!', 'c-azul': 'Azul!', 'c-verde': 'Verde!', 'c-amarelo': 'Amarelo!', 'c-vermelho': 'Vermelho!',
  'e-laco': 'Um laço!', 'e-coroa': 'Uma coroa!', 'e-flor': 'Uma florzinha!', 'e-oculos': 'Óculos escuros!',
  'e-estrela': 'Uma estrelinha!', 'e-borboleta': 'Uma borboleta!',
};
const VOZ_B = { hihi: 'Hi hi! Faz cócegas!', oba: 'Oba!', obrigado: 'Obrigado! Adorei!', obrigada: 'Obrigada! Adorei!', uau: 'Uau!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let stepI = 0, stepAt = 0, lastAct = 0, lastSaid = 0, stepEnding = false, visit = 0, mode = 'intro', modeAt = 0, fadeAt = -99;
let press = null, paint = null, snips = 0, dryT = 0, lastSfx = 0, lastB = -99, flashAt = -9, wantPhoto = false, fliers = [];
const barEls = [...document.querySelectorAll('.steps span')];

meter.size = STEPS.length;
meter.onFull = () => { sfx.fanfare(); confettiRain(80); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const act = () => { lastAct = clock; };
const step = () => mode === 'steps' && !stepEnding ? STEPS[stepI] : null;

// ---------- cliente e passos ----------
function startVisit() {
  newClient(BICHOS[visit % BICHOS.length]);
  paint = null; snips = 0; dryT = 0; fliers = [];
  mode = 'steps';
  talk('chega-' + client.b.id);
  startStep(0, true);
}

function startStep(i, queued) {
  stepI = i; stepAt = lastAct = lastSaid = clock; stepEnding = false;
  barEls.forEach((el, k) => { el.classList.toggle('done', k < i); el.classList.toggle('now', k === i); });
  talk(STEPS[i], queued);
}

function stepDone(line, delay = 1.6) {
  if (stepEnding || mode !== 'steps') return;
  stepEnding = true;
  const [hx, hy] = headNow();
  launchStar(hx, hy - L.r);
  barEls[stepI].classList.add('done'); barEls[stepI].classList.remove('now');
  client.hopAt = clock; sfx.chime();
  if (line) talk(line);
  if (STEPS[stepI] === 'foto') { mode = 'fim'; modeAt = clock; return; }
  setTimeout(() => { if (mode === 'steps') startStep(stepI + 1, true); }, delay * 1000);
}

// ---------- ações ----------
function brush(x, y, amount) {
  if (!brushAt(x, y, amount)) return false;
  act(); client.squintUntil = clock + .25;
  if (clock - lastSfx > .18) { lastSfx = clock; sfx.brush(); sparkle(x + rand(-10, 10), y + rand(-10, 10)); }
  if (step() === 'pentear' && client.tufts.every(tf => tf.mess < .12)) {
    client.tufts.forEach(tf => { tf.mess = 0; });
    stepDone('r-penteado');
  }
  return true;
}

function snip(x, y) {
  const tf = cutAt(x, y);
  if (!tf) return false;
  act(); snips++;
  sfx.click(); setTimeout(() => sfx.click(), 90);
  if (step() === 'cortar' && snips >= SNIPS) stepDone('r-corte');
  return true;
}

function dry(dt) {
  if (!press) return;
  const n = dryAt(press.x, press.y, dt);
  const [hx, hy] = headNow();
  if (Math.random() < dt * 30) addParticle({ x: press.x, y: press.y, vx: (hx - press.x) * rand(1.5, 3), vy: (hy - L.r - press.y) * rand(1.5, 3), life: .5, decay: 2, size: rand(2, 4), color: pick(['#ffffff', '#e0d4ff', '#ffe0f0']), star: false, rot: 0, vr: 0 });
  if (clock - lastSfx > .3) { lastSfx = clock; sfx.blow(); }
  if (!n) return;
  act(); dryT += dt;
  if (step() === 'secar' && dryT >= DRY_TIME) stepDone('r-cachos');
}

function paintHair(x, y) {
  if (!paint) choosePaint(PAINTS[0], true);
  const tf = paintAt(x, y, paint.c);
  if (!tf) return false;
  act(); sfx.pop();
  burst(x, y, L.r * .25, colorHue(paint.c), 6);
  if (step() === 'pintar' && client.tufts.filter(t => t.painted).length >= PAINTED) stepDone('r-cores');
  return true;
}

const colorHue = c => ({ '#ff7eb6': 330, '#a77bff': 265, '#4fb4ff': 205, '#5fd068': 125, '#ffd23b': 48, '#ff5a4f': 5 })[c] ?? 300;

function choosePaint(p, quiet) {
  paint = p; act();
  if (!quiet) { sfx.blub(); talk('c-' + p.id); }
}

function toggleTrinket(tk, slot) {
  act();
  if (client.trinkets.includes(tk.id)) {
    client.trinkets = client.trinkets.filter(id => id !== tk.id);
    const [hx, hy] = headNow();
    burst(hx + tk.at[0] * L.r, hy + tk.at[1] * L.r, L.r * .3, 300, 6); sfx.pop();
    return;
  }
  if (fliers.some(f => f.id === tk.id)) return;
  fliers.push({ id: tk.id, e: tk.e, x0: slot.x, y0: slot.y, at: clock });
  sfx.whoosh(); talk('e-' + tk.id);
}

function updateFliers() {
  for (const f of fliers.filter(f => clock - f.at >= .55)) {
    const tk = TRINKETS.find(k => k.id === f.id), [hx, hy] = headNow();
    client.trinkets = [...client.trinkets, f.id]; client.hopAt = clock;
    sfx.chime(); burst(hx + tk.at[0] * L.r, hy + tk.at[1] * L.r, L.r * .3, 50, 10);
    if (step() === 'enfeitar' && client.trinkets.length >= TRINKETS_DONE) setTimeout(() => stepDone(null, 1), 900);
  }
  fliers = fliers.filter(f => clock - f.at < .55);
}

function takePhoto() {
  if (stepEnding || flashAt > stepAt) return;
  act(); talk('xis');
  flashAt = clock + 1;
  setTimeout(() => {
    sfx.click(); sfx.bell(1568); wantPhoto = true;
    client.hopAt = clock; client.v.mouth = 'teeth';
    setTimeout(() => { client.v.mouth = 'smile'; }, 900);
    stepDone(null);
    talk(client.b.name.startsWith('a ') ? 'obrigada' : 'obrigado', true);
    talk('mural', true);
  }, 1000);
}

// ---------- bandeja ----------
function trayItems() {
  const s = step() || (mode === 'fim' ? 'foto' : STEPS[stepI]);
  if (s === 'pintar') return traySlots(PAINTS.length).map(sl => ({ ...sl, paint: PAINTS[sl.i] }));
  if (s === 'enfeitar') return traySlots(TRINKETS.length).map(sl => ({ ...sl, trinket: TRINKETS[sl.i] }));
  const [one] = traySlots(1);
  return [{ ...one, tool: TOOL[s] }];
}

function trayAt(x, y) {
  return trayItems().find(it => Math.abs(x - it.x) < it.size * .6 && Math.abs(y - it.y) < it.size * .6);
}

function drawTray(t) {
  const s = step();
  for (const it of trayItems()) {
    const hint = hintItem() === it.i && it.tool === undefined;
    if (it.paint) drawPot(it.x, it.y, Math.min(it.size * 1.4, L.r * 1.1), it.paint.c, paint === it.paint, t);
    else if (it.trinket) {
      const on = client.trinkets.includes(it.trinket.id) || fliers.some(f => f.id === it.trinket.id);
      ctx.globalAlpha = on ? .35 : 1;
      emojiAt(ctx, it.trinket.e, it.x, it.y, Math.min(it.size * 1.05, L.r * .9) * (hint ? 1 + .1 * Math.sin(t * 8) : 1));
      ctx.globalAlpha = 1;
    } else if (it.tool && !(press && s && s !== 'foto')) {
      const big = it.size * 1.25, bob = Math.sin(t * 2) * it.size * .04;
      drawTool(ctx, it.tool, it.x, it.y + bob, Math.min(big, L.r * 1.6), Math.sin(t * 1.3) * .08, it.tool === 'pincel' ? paint?.c : null);
    }
  }
}

// ferramenta na mão (segue o dedo)
function drawHeldTool(t) {
  const s = step();
  if (!press || !s || !TOOL[s] || s === 'foto') return;
  const size = L.r * 1.3, id = TOOL[s];
  const open = id === 'tesoura' ? .15 + Math.abs(Math.sin((clock - press.at) * 10)) * .5 : null;
  const shake = id === 'secador' ? Math.sin(clock * 50) * 2 : 0;
  const [dx, dy, rot] = id === 'secador' ? [size * .35, size * .25, -.5] : id === 'escova' ? [0, size * .1, -.3] : id === 'tesoura' ? [0, size * .2, 0] : [size * .05, size * .4, .3];
  drawTool(ctx, id, press.x + dx + shake, press.y + dy, size, rot, id === 'pincel' ? paint?.c : open);
}

// ---------- toques ----------
function onTap(x, y) {
  press = { x, y, at: clock, moved: 0, lastCut: clock };
  const s = step(), it = trayAt(x, y);
  if (it) {
    press = null;
    if (it.paint && s === 'pintar') { choosePaint(it.paint); return; }
    if (it.trinket && s === 'enfeitar') { toggleTrinket(it.trinket, it); return; }
    if (it.tool === 'camera' && s === 'foto') { takePhoto(); return; }
    if (s) { talk(s); act(); }
    return;
  }
  if (s === 'pentear' && brush(x, y, .3)) return;
  if (s === 'cortar' && snip(x, y)) return;
  if (s === 'pintar' && paintHair(x, y)) return;
  if (s === 'secar') return;
  if (s === 'foto' && (onFace(x, y) || hitTuft(x, y))) { press = null; takePhoto(); return; }
  if (onFace(x, y) || hitTuft(x, y)) {
    client.hopAt = clock; client.squintUntil = clock + .3; sfx.giggle((x / W - .5) * 1.4);
    if (clock - lastB > 3.5) { lastB = clock; talk(pick(['hihi', 'oba', 'uau'])); }
    return;
  }
  sfx.pop(); ring(x, y, L.r * .3);
}

function onMove(x, y) {
  if (!press) return;
  const d = Math.hypot(x - press.x, y - press.y);
  press.moved += d; press.x = x; press.y = y;
  const s = step();
  if (s === 'pentear') brush(x, y, d / (L.r * 2.2));
  if (s === 'cortar' && clock - press.lastCut > .22 && snip(x, y)) press.lastCut = clock;
  if (s === 'pintar') paintHair(x, y);
}

function onUp() { press = null; }

barEls.forEach((el, i) => el.addEventListener('click', () => {
  if (!started || mode !== 'steps' || i !== stepI) return;
  sfx.resume(); talk(STEPS[i]);
}));

// ---------- dica ----------
function hintItem() {
  const s = step();
  if (!s || clock - Math.max(lastAct, stepAt) < HINT_AFTER) return null;
  if (s === 'pintar' && !paint) return 0;
  if (s === 'enfeitar') return TRINKETS.findIndex(tk => !client.trinkets.includes(tk.id));
  return null;
}

function hintTarget() {
  const s = step(), [hx, hy] = headNow();
  const mid = pickTuft => { if (!pickTuft) return null; const p = tuftPts(pickTuft, hx, hy)[Math.floor(SEG * .6)]; return p; };
  if (s === 'pentear') return mid([...client.tufts].sort((a, b) => b.mess - a.mess)[0]);
  if (s === 'cortar') return mid([...client.tufts].sort((a, b) => b.len - a.len)[0]);
  if (s === 'secar') return mid(client.tufts[Math.floor(TUFTS / 2)]);
  if (s === 'pintar') { if (!paint) return null; return mid(client.tufts.find(tf => !tf.painted)); }
  if (s === 'foto') { const [c] = traySlots(1); return [c.x, c.y]; }
  const i = TRINKETS.findIndex(tk => !client.trinkets.includes(tk.id));
  if (s === 'enfeitar' && i >= 0) { const sl = traySlots(TRINKETS.length)[i]; return [sl.x, sl.y]; }
  return null;
}

function drawHint(t) {
  const s = step();
  if (!s || press || clock - Math.max(lastAct, stepAt) < HINT_AFTER) return;
  const h = hintTarget() || (s === 'pintar' && !paint ? [traySlots(PAINTS.length)[0].x, traySlots(PAINTS.length)[0].y] : null);
  if (!h) return;
  const size = Math.round(L.r * .9 / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + L.r * .15 + Math.abs(Math.sin(t * 4)) * L.r * .3, size, size);
}

// ---------- ciclo ----------
function update(dt) {
  if (started) {
    updateFallen(dt);
    updateFliers();
    if (step() === 'secar') dry(dt);
    const s = step();
    if (s && clock - Math.max(lastAct, lastSaid) > REPEAT_AFTER) talk(s);
    if (mode === 'fim' && clock - modeAt > 4.5 && fadeAt < modeAt) {
      fadeAt = clock;
      setTimeout(() => { visit++; startVisit(); }, FADE * 1000);
    }
  }
  updateMeter(dt);
}

function drawFliers() {
  const [hx, hy] = headNow();
  for (const f of fliers) {
    const tk = TRINKETS.find(k => k.id === f.id), k = Math.min((clock - f.at) / .55, 1), e = 1 - (1 - k) ** 3;
    const tx = hx + tk.at[0] * L.r, ty = hy + tk.at[1] * L.r;
    emojiAt(ctx, f.e, f.x0 + (tx - f.x0) * e, f.y0 + (ty - f.y0) * e - Math.sin(k * Math.PI) * L.r, L.r * (tk.s + (1 - e) * .3), (1 - e) * 4);
  }
}

function drawFlash() {
  const e = clock - flashAt;
  if (e < 0 || e > .5) return;
  ctx.fillStyle = `rgb(255 255 255 / ${1 - e / .5})`; ctx.fillRect(0, 0, W, H);
}

function drawFade() {
  const e = clock - fadeAt;
  if (e < 0 || e > FADE * 2) return;
  ctx.fillStyle = `rgb(251 230 245 / ${Math.sin(e / (FADE * 2) * Math.PI)})`; ctx.fillRect(0, 0, W, H);
}

function render(t) {
  const [hx, hy] = headNow();
  ctx.drawImage(roomLayer, 0, 0, W, H);
  drawPhotos(hx, hy, false);
  drawClient(t);
  if (wantPhoto) { wantPhoto = false; addPhoto(snapshot()); }
  drawFallen();
  drawTray(t);
  drawFliers();
  drawHeldTool(t);
  drawPhotos(hx, hy, true);
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
  drawFlash();
  drawFade();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutSalon();
}

newClient(BICHOS[0]);

boot({
  resize, update, render, onTap, onMove, onUp, onCancel: () => { press = null; },
  onAmbient: () => {},   // dentro do salão: sem passarinho
  onStart: () => {
    document.querySelector('.steps').classList.add('on');
    talk('vamos');
    setTimeout(startVisit, 1200);
  },
});
