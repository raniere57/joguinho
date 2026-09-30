'use strict';
// Maquiagem: uma amiga chega no camarim. Escolhe a ferramenta embaixo (ou do lado) e pinta
// com o dedo: sombra nos olhos, batom na boca, blush nas bochechas, rímel nos cílios,
// purpurina e adesivos. Cada ferramenta nova vale uma estrela; com as seis ela se olha no
// espelho, adora e manda beijo. Depois lava o rosto com a esponja e chega a próxima amiga.

const MAKEUP = TOOLS.filter(t => t !== 'esponja');
const HINT_AFTER = 6, REPEAT_AFTER = 15, SLIDE = 1, USE_DABS = 7, USE_GLITTER = 12;
const NAMES = { coelho: 'a coelhinha', gato: 'a gatinha', urso: 'a ursinha', panda: 'a pandinha' };
const cap = s => s[0].toUpperCase() + s.slice(1);

const VOZ = {
  vamos: 'Bem-vinda ao camarim de maquiagem!',
  ...Object.fromEntries(Object.entries(NAMES).map(([id, n]) => ['chega-' + id, `${cap(n)} quer ficar linda! Vamos maquiar?`])),
  escolha: 'Escolha uma maquiagem!',
  't-sombra': 'Sombra! Passe o dedo em cima dos olhos.', 't-batom': 'Batom! Passe o dedo na boquinha.',
  't-blush': 'Blush! Passe nas bochechas.', 't-rimel': 'Rímel! Passe nos olhinhos.',
  't-glitter': 'Purpurina! Toque no rosto pra brilhar.', 't-adesivo': 'Adesivos! Escolha um e toque no rosto.',
  't-esponja': 'Esponja! Passe o dedo pra limpar.',
  'r-sombra': 'Que sombra bonita!', 'r-batom': 'Que batom lindo!', 'r-blush': 'Que bochechas rosadinhas!',
  'r-rimel': 'Que cílios grandes!', 'r-glitter': 'Tá brilhando!', 'r-adesivo': 'Que adesivo lindo!',
  ...Object.fromEntries(['rosa', 'vermelho', 'roxo', 'azul', 'verde', 'dourado', 'laranja'].map(c => ['c-' + c, cap(c) + '!'])),
  'c-lilas': 'Lilás!', 'c-pessego': 'Pêssego!',
  espelho: 'Pronto! Vamos ver no espelho?', linda: 'Ficou linda demais!',
  limpar: 'Agora vamos lavar o rostinho com a esponja pra próxima amiga!', limpinha: 'Limpinha!',
};
const VOZ_B = { uau: 'Uau! Eu tô linda!', obrigada: 'Obrigada! Tchau!', hihi: 'Hi hi! Faz cócegas!', muah: 'Muá!', oba: 'Oba!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let phase = 'intro', phaseAt = 0, lastAct = 0, lastSaid = 0, visit = 0, tool = null, slideAt = -9, slideDir = 0;
let press = null, lastSfx = 0, lastB = -99, lastWrong = -99, mirrorAt = -9, inkAt = 0, used = new Set(), counts = {}, floaters = [];
const pick6 = { sombra: 0, batom: 0, blush: 0 };
let stickerI = 0;

meter.size = MAKEUP.length;
meter.onFull = () => { sfx.fanfare(); confettiRain(90); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const setPhase = p => { phase = p; phaseAt = lastAct = clock; };
const act = () => { lastAct = clock; };
const canMakeup = () => phase === 'makeup' || phase === 'clean';

// ---------- amiga chegando e indo ----------
function arrive() {
  newFriend(FRIENDS[visit % FRIENDS.length]);
  used = new Set(); counts = {}; tool = null; floaters = [];
  slideAt = clock; slideDir = 1; setPhase('makeup');
  sfx.whoosh();
  talk('chega-' + fr.f.id); talk('escolha', true);
}

function leave() {
  setPhase('leave'); slideAt = clock; slideDir = -1; sfx.whoosh();
  setTimeout(() => { visit++; arrive(); }, SLIDE * 1000 + 300);
}

function faceXY() {
  const [x, y] = L.face, k = Math.min((clock - slideAt) / SLIDE, 1), e = 1 - (1 - k) ** 3;
  const off = slideDir > 0 ? (1 - e) * W * .9 : slideDir < 0 ? -e * W * .9 : 0;
  return [x + off, y - pulseAt(fr.hopAt, .45) * L.r * .15];
}

function toLocal(x, y) {
  const [fx, fy] = faceXY(), dx = x - fx, dy = y - fy, c = Math.cos(-fr.tilt), s = Math.sin(-fr.tilt);
  return [dx * c - dy * s, dx * s + dy * c];
}

// ---------- usar ferramentas ----------
function markUsed(t) {
  if (used.has(t) || !MAKEUP.includes(t) || phase !== 'makeup') return;
  used.add(t);
  const [fx, fy] = faceXY();
  launchStar(fx, fy - L.r * .5); sfx.chime();
  talk('r-' + t);
  if (used.size === MAKEUP.length) setTimeout(startMirror, 1600);
}

function count(t, n = 1) {
  counts[t] = (counts[t] || 0) + n;
  const need = t === 'glitter' ? USE_GLITTER : t === 'adesivo' ? 1 : t === 'rimel' ? 3 : USE_DABS;
  if (counts[t] >= need) markUsed(t);
}

// um toque ou um pedacinho de arrasto sobre o rosto
function applyAt(lx, ly, fromMove) {
  const r = L.r;
  if (tool === 'sombra' || tool === 'batom' || tool === 'blush') {
    const color = COLORS[tool][pick6[tool]][1], hit = paintAt(tool, lx, ly, color);
    if (!hit) return false;
    if (tool === 'sombra') fr.closedUntil = clock + .35;
    if (tool === 'batom') fr.mouth = 'kiss';
    count(tool); act();
    if (clock - lastSfx > .15) { lastSfx = clock; sfx.brush(); }
    return true;
  }
  if (tool === 'rimel') {
    const e = nearEye(lx, ly);
    if (e < 0) return false;
    if (!fromMove || Math.random() < .3) { fr.lash[e] = Math.min(1, fr.lash[e] + (fromMove ? .08 : .25)); count('rimel'); }
    act();
    if (clock - lastSfx > .15) { lastSfx = clock; sfx.brush(); }
    return true;
  }
  if (tool === 'glitter') {
    if (!inHead(lx, ly)) return false;
    if (fromMove && clock - lastSfx < .06) return true;
    addGlitter(lx, ly); count('glitter', 4); act();
    if (clock - lastSfx > .09) { lastSfx = clock; sfx.bell(pick(PENTATONIC) * 2); }
    return true;
  }
  if (tool === 'adesivo') {
    if (fromMove || !addSticker(STICKERS[stickerI], lx, ly)) return false;
    count('adesivo'); act(); sfx.pop();
    const [fx, fy] = faceXY();
    burst(fx + lx, fy + ly, r * .15, 320, 6);
    return true;
  }
  if (tool === 'esponja') {
    if (!inHead(lx, ly) && Math.hypot(lx, ly - r * 1.4) > r) return false;
    const gone = eraseAt(lx, ly); act();
    fr.closedUntil = clock + .3;
    if (gone) sfx.pop();
    if (clock - lastSfx > .2) { lastSfx = clock; sfx.blub(.2); }
    if (Math.random() < .5) { const [fx, fy] = faceXY(); addParticle({ x: fx + lx + rand(-10, 10), y: fy + ly, vx: rand(-40, 40), vy: -rand(20, 80), life: .7, decay: 1.5, size: rand(3, 7), color: 'rgb(220 240 255 / .9)', star: false, rot: 0, vr: 0 }); }
    return true;
  }
  return false;
}

// liga os pontos do arrasto pra pintura não sair pontilhada
function strokeTo(lx, ly) {
  const [px, py] = press.last, d = Math.hypot(lx - px, ly - py), step = L.r * .035, n = Math.min(40, Math.floor(d / step));
  for (let i = 1; i <= n; i++) applyAt(px + (lx - px) * i / n, py + (ly - py) * i / n, true);
  if (!n) applyAt(lx, ly, true);
  press.last = [lx, ly];
}

// ---------- espelho ----------
function startMirror() {
  if (phase !== 'makeup') return;
  setPhase('mirror'); mirrorAt = clock; tool = null; press = null;
  talk('espelho');
  setTimeout(() => { fr.mouth = 'o'; fr.hopAt = clock; talk('uau'); hearts(6); }, 1300);
  setTimeout(() => { fr.mouth = 'kiss'; talk('muah'); kiss(); }, 3600);
  setTimeout(() => { fr.mouth = 'smile'; talk('linda'); }, 4600);
  setTimeout(() => { setPhase('clean'); tool = 'esponja'; talk('limpar'); }, 7200);
}

function mirrorPose() {
  const e = clock - mirrorAt, [fx, fy] = faceXY(), r = L.r;
  const k = phase === 'mirror' ? Math.min(e / .7, 1) : phase === 'clean' ? Math.max(0, 1 - (clock - phaseAt) / .5) : 0;
  const ek = 1 - (1 - k) ** 3, tx = Math.min(fx + r * 1.35, W - r * .7), ty = fy + r * 1.05;
  return { x: tx, y: ty + (1 - ek) * H * .6, k };
}

function drawMirror(t) {
  const m = mirrorPose();
  if (m.k <= 0) return;
  const r = L.r, mr = r * .62;
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(-.25);
  ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.roundRect(-r * .1, mr * .9, r * .2, r * .8, r * .08); ctx.fill();
  ctx.fillStyle = '#ffd36b'; circle(ctx, 0, 0, mr * 1.14); ctx.fill();
  ctx.fillStyle = '#e9f8ff'; circle(ctx, 0, 0, mr); ctx.fill();
  ctx.save(); circle(ctx, 0, 0, mr); ctx.clip();
  ctx.rotate(.25);
  const tilt = fr.tilt; fr.tilt = 0;
  drawFriend(0, r * .12, .5, t);
  fr.tilt = tilt;
  ctx.restore();
  ctx.fillStyle = 'rgb(255 255 255 / .45)'; ctx.beginPath(); ctx.ellipse(-mr * .45, -mr * .45, mr * .12, mr * .3, .7, 0, TAU); ctx.fill();
  ctx.restore();
}

function hearts(n) {
  const [fx, fy] = faceXY();
  for (let i = 0; i < n; i++) floaters.push({ e: pick(['💖', '💕', '✨']), x: fx + rand(-1, 1) * L.r, y: fy - rand(0, .5) * L.r, at: clock + i * .15, vx: rand(-20, 20) });
}

function kiss() {
  const [fx, fy] = faceXY();
  floaters.push({ e: '💋', x: fx, y: fy + L.r * .5, at: clock, vx: L.r * .8, big: true });
  sfx.pop(); hearts(4);
}

function drawFloaters() {
  for (const f of floaters) {
    const k = (clock - f.at) / 1.6;
    if (k < 0) continue;
    ctx.globalAlpha = Math.max(0, 1 - k);
    emojiAt(ctx, f.e, f.x + f.vx * k, f.y - k * L.r * 1.2, L.r * (f.big ? .5 + k * .3 : .3));
  }
  ctx.globalAlpha = 1;
  floaters = floaters.filter(f => clock - f.at < 1.6);
}

// ---------- bandeja ----------
function palette() {
  if (COLORS[tool]) return gridSlots(L.pal, COLORS[tool].length).map(s => ({ ...s, color: COLORS[tool][s.i] }));
  if (tool === 'adesivo') return gridSlots(L.pal, STICKERS.length).map(s => ({ ...s, sticker: STICKERS[s.i] }));
  return [];
}

function hitSlot(slots, x, y) { return slots.find(s => Math.abs(x - s.x) < s.s * .55 && Math.abs(y - s.y) < s.s * .55); }

function drawTray(t) {
  const hintI = hintTool();
  for (const s of toolSlots()) {
    const id = TOOLS[s.i], on = tool === id, lift = on ? s.s * .1 : 0, pulse = hintI === id ? 1 + .1 * Math.sin(t * 8) : 1;
    ctx.fillStyle = 'rgb(150 70 130 / .15)'; ctx.beginPath(); ctx.roundRect(s.x - s.s * .46, s.y - s.s * .42 + 4, s.s * .92, s.s * .9, s.s * .24); ctx.fill();
    ctx.fillStyle = on ? '#fff6fb' : '#fff'; ctx.beginPath(); ctx.roundRect(s.x - s.s * .46, s.y - s.s * .46 - lift, s.s * .92, s.s * .9, s.s * .24); ctx.fill();
    if (on) { ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 3; ctx.stroke(); }
    drawToolIcon(ctx, id, s.x, s.y - lift, s.s * 1.05 * pulse, COLORS[id] ? COLORS[id][pick6[id]][1] : null);
    if (used.has(id)) { ctx.fillStyle = '#ffc93c'; star(ctx, s.x + s.s * .36, s.y - s.s * .36 - lift, s.s * .12, -Math.PI / 2); }
  }
  for (const p of palette()) {
    if (p.color) drawSwatch(p.x, p.y, Math.min(p.s, L.r * .55), p.color[1], pick6[tool] === p.i, t);
    else {
      const on = stickerI === p.i, z = Math.min(p.s, L.r * .5);
      if (on) { ctx.fillStyle = '#ffe3f1'; circle(ctx, p.x, p.y, z * .55); ctx.fill(); ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 3; ctx.stroke(); }
      emojiAt(ctx, p.sticker, p.x, p.y - (on ? Math.abs(Math.sin(t * 5)) * z * .08 : 0), z * .75);
    }
  }
}

function drawHeld() {
  if (!press || !press.onFace || !tool) return;
  const s = L.r * .75, id = tool;
  const off = { sombra: [s * .1, s * .25], batom: [s * .15, s * .3], blush: [s * .2, s * .3], rimel: [s * .15, s * .3], glitter: [0, -s * .45], adesivo: [0, 0], esponja: [0, 0] }[id];
  if (id === 'adesivo') return;
  drawToolIcon(ctx, id, press.x + off[0], press.y + off[1], s, COLORS[id] ? COLORS[id][pick6[id]][1] : null, id === 'glitter' ? Math.PI + Math.sin(clock * 20) * .3 : 0);
}

// ---------- toques ----------
function onTap(x, y) {
  act();
  const ts = hitSlot(toolSlots(), x, y);
  if (ts && canMakeup()) { chooseTool(TOOLS[ts.i]); return; }
  const ps = hitSlot(palette(), x, y);
  if (ps && canMakeup()) {
    if (ps.color) { pick6[tool] = ps.i; talk('c-' + ps.color[0]); sfx.blub(); }
    else { stickerI = ps.i; sfx.pop(); }
    return;
  }
  const [lx, ly] = toLocal(x, y);
  const onFace = Math.hypot(lx, ly) < L.r * 1.1 || Math.abs(lx) < L.r && ly > 0 && ly < L.r * 1.9;
  press = { x, y, last: [lx, ly], onFace };
  if (!onFace || !canMakeup()) { press.onFace = false; sfx.pop(); ring(x, y, L.r * .15); return; }
  if (!tool) { giggle(); if (clock - lastSaid > 2.5) talk('escolha', true); return; }
  if (!applyAt(lx, ly, false)) wrongSpot();
}

function onMove(x, y) {
  if (!press) return;
  press.x = x; press.y = y;
  if (!press.onFace || !tool || !canMakeup()) return;
  strokeTo(...toLocal(x, y));
}

function onUp() {
  press = null;
  if (fr.mouth === 'kiss' && phase !== 'mirror') fr.mouth = 'smile';
}

function chooseTool(id) {
  if (tool === id) { talk('t-' + id); return; }
  tool = id; sfx.pop(); talk('t-' + id);
}

function giggle() {
  fr.hopAt = clock; fr.closedUntil = clock + .4; sfx.giggle();
  if (clock - lastB > 3.5) { lastB = clock; talk(pick(['hihi', 'oba'])); }
}

// tocou fora do lugar da ferramenta: lembra onde é
function wrongSpot() {
  giggle();
  if (clock - lastWrong > 4) { lastWrong = clock; talk('t-' + tool); }
  lastAct = clock - HINT_AFTER;   // já mostra a mãozinha no lugar certo
}

// ---------- dica ----------
function hintTool() {
  if (phase !== 'makeup' || clock - lastAct < HINT_AFTER) return null;
  if (tool && !used.has(tool)) return null;
  return MAKEUP.find(t => !used.has(t));
}

function toolRegion(id) {
  const r = L.r;
  return { sombra: [EYE_X * r, -.2 * r], batom: [0, .55 * r], blush: [.6 * r, .3 * r], rimel: [EYE_X * r, -.05 * r], glitter: [-.3 * r, -.55 * r], adesivo: [-.55 * r, .3 * r], esponja: [0, 0] }[id];
}

function drawHint(t) {
  if (press || clock - lastAct < HINT_AFTER || !['makeup', 'clean'].includes(phase)) return;
  let h = null;
  const ht = hintTool();
  if (ht) { const s = toolSlots()[TOOLS.indexOf(ht)]; h = [s.x, s.y]; }
  else if (tool) { const [lx, ly] = toolRegion(tool), [fx, fy] = faceXY(); h = [fx + lx, fy + ly]; }
  if (!h) return;
  const size = Math.round(Math.max(L.r * .45, 40) / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + size * .1 + Math.abs(Math.sin(t * 4)) * size * .3, size, size);
}

function remind() {
  if (clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  if (phase === 'makeup') talk(tool && !used.has(tool) ? 't-' + tool : 'escolha');
  else if (phase === 'clean') talk('limpar');
  else return;
  lastAct = clock;
}

// rosto limpinho: tchau e vem a próxima
function checkClean() {
  if (phase !== 'clean' || clock - inkAt < .4 || clock - phaseAt < 1.5) return;
  inkAt = clock;
  if (inkAmount() > 6 || fr.glitter.length || fr.stickers.length || Math.max(...fr.lash) > .15) return;
  fr.lash = [0, 0];
  setPhase('bye'); fr.hopAt = clock; tool = null; press = null;
  const [fx, fy] = faceXY();
  burst(fx, fy, L.r * .5, 200, 16); sfx.chime();
  talk('limpinha'); talk('obrigada', true);
  setTimeout(leave, 3000);
}

// ---------- ciclo ----------
function update(dt) {
  fr.tilt += ((phase === 'mirror' ? .1 : 0) - fr.tilt) * Math.min(1, dt * 6);
  if (started) { remind(); checkClean(); }
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(roomLayer, 0, 0, W, H);
  drawBulbs(t);
  if (phase !== 'intro') { const [fx, fy] = faceXY(); drawFriend(fx, fy, 1, t); }
  drawMirror(t);
  drawTray(t);
  drawHeld();
  drawFloaters();
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutRoom();
  rescaleLayers();
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel: () => { press = null; },
  onAmbient: () => {},   // camarim: sem passarinho
  onStart() {
    talk('vamos');
    setTimeout(arrive, 1300);
  },
});
