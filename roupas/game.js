'use strict';
// Lojinha de roupas: a amiga chega e escolhe o look. Abas embaixo (ou do lado): roupa, sapato,
// chapéu e acessório. Toca na peça e ela voa até a amiga. Com as quatro escolhidas aparece a
// estrela do desfile: cortina, holofote, passarela, plateia batendo palma e flash a cada toque.

const HINT_AFTER = 6, REPEAT_AFTER = 15, FLY = .5, WALK = 3.2, SHOW = 10;
const FRIENDS = [{ b: BICHOS[2], id: 'gato' }, { b: BICHOS[1], id: 'coelho' }, { b: BICHOS[3], id: 'panda' }, { b: BICHOS[0], id: 'urso' }];
const NAMES = { coelho: 'a coelhinha', gato: 'a gatinha', urso: 'a ursinha', panda: 'a pandinha' };
const cap = s => s[0].toUpperCase() + s.slice(1);

const VOZ = {
  vamos: 'Bem-vinda à lojinha de roupas!',
  ...Object.fromEntries(Object.entries(NAMES).map(([id, n]) => ['chega-' + id, `${cap(n)} quer um look novo!`])),
  'cat-roupa': 'Escolha uma roupa!', 'cat-sapato': 'Agora os sapatos!', 'cat-chapeu': 'Agora um chapéu!', 'cat-acessorio': 'Agora um acessório!',
  'i-vestido': 'Vestido rosa!', 'i-princesa': 'Vestido de princesa!', 'i-bailarina': 'Roupa de bailarina!', 'i-macacao': 'Macacão!', 'i-joaninha': 'Vestido de joaninha!', 'i-arcoiris': 'Vestido de arco-íris!',
  'i-tenis': 'Tênis!', 'i-botas': 'Botas!', 'i-sapatilha': 'Sapatilhas!', 'i-galochas': 'Galochas!', 'i-sandalia': 'Sandálias!', 'i-brilho': 'Sapatos de brilho!',
  'i-coroa': 'Coroa!', 'i-chapeu': 'Chapéu de sol!', 'i-laco': 'Laço!', 'i-flores': 'Coroa de flores!', 'i-bone': 'Boné!', 'i-estrela': 'Tiara de estrelas!',
  'i-bolsa': 'Bolsinha!', 'i-oculos': 'Óculos escuros!', 'i-colar': 'Colar de pérolas!', 'i-varinha': 'Varinha mágica!', 'i-guarda': 'Guarda-chuva!', 'i-balao': 'Balão!',
  pronta: 'Ficou linda! Pronta pro desfile!', botao: 'Toque na estrela pro desfile!',
  desfile: 'Começou o desfile! Toque pra tirar fotos!', aplausos: 'Que desfile lindo!',
};
const VOZ_B = { oba: 'Oba!', amei: 'Amei!', hihi: 'Hi hi!', olha: 'Olha eu!', obrigada: 'Obrigada!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let phase = 'intro', phaseAt = 0, lastAct = 0, lastSaid = 0, visit = 0, cat = 'roupa', friend = FRIENDS[0];
let look = {}, flyers = [], hopAt = -9, lastB = -99, starred = new Set(), flashAt = -9, clapAt = -9, advanceT = null, photos = 0;
const v = newLook();

meter.size = CATS.length + 1;
meter.onFull = () => { sfx.fanfare(); confettiRain(90); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const setPhase = p => { phase = p; phaseAt = lastAct = clock; };
const ready = () => CATS.every(c => look[c]);

// ---------- loja ----------
function arrive() {
  friend = FRIENDS[visit % FRIENDS.length];
  look = {}; flyers = []; starred = new Set(); cat = 'roupa';
  setPhase('loja'); hopAt = clock;
  sfx.whoosh();
  talk('chega-' + friend.id); talk('cat-roupa', true);
}

function wear(c, item, slot) {
  lastAct = clock;
  if (look[c] === item.id) { hopAt = clock; sfx.boing(); return; }
  flyers = [...flyers.filter(f => f.cat !== c), { cat: c, item, x0: slot.x, y0: slot.y, at: clock }];
  sfx.whoosh(); talk('i-' + item.id);
}

function landed(f) {
  look = { ...look, [f.cat]: f.item.id }; hopAt = clock;
  const [x, y] = dollCenter();
  sfx.chime(); burst(x, y, L.r * .7, 300, 12);
  if (!starred.has(f.cat)) {
    starred.add(f.cat); launchStar(x, y);
    clearTimeout(advanceT);
    advanceT = setTimeout(advance, 1400);
  } else if (Math.random() < .35 && clock - lastB > 3) { lastB = clock; talk(pick(['oba', 'amei']), true); }
}

// passa pra próxima aba vazia; com tudo escolhido chama o desfile
function advance() {
  if (phase !== 'loja') return;
  const next = CATS.find(c => !look[c]);
  if (next) { cat = next; sfx.pop(); talk('cat-' + next); return; }
  hopAt = clock; talk('pronta'); talk('botao', true);
}

function dollPose(x, y, r) {
  const acc = ACCS.find(a => a.id === look.acessorio);
  const arms = phase === 'desfile' ? { l: 'hip', r: acc?.hand || 'hip' } : { l: 'down', r: acc?.hand || 'down' };
  return pose(x, y, r, arms);
}

function dollCenter() { const [x, y] = L.feet; return [x, y - L.r * 1.8]; }

// ---------- desfile ----------
function startShow() {
  setPhase('desfile'); flyers = []; photos = 0;
  sfx.fanfare(); talk('desfile');
  clapAt = clock + WALK;
  setTimeout(() => sfx.clap(8), WALK * 1000);
  setTimeout(endShow, SHOW * 1000);
}

function endShow() {
  if (phase !== 'desfile') return;
  clapAt = clock; sfx.clap(12);
  talk('aplausos'); talk('obrigada', true);
  const [x, y] = showSpot();
  launchStar(x, y - L.r * 2);
  setPhase('fim');
  setTimeout(() => { visit++; arrive(); }, 4200);
}

// onde a amiga está na passarela e o tamanho dela
function showSpot() {
  const rw = runway(), k = Math.min((clock - phaseAt) / WALK, 1), e = k * k * (3 - 2 * k);
  const y = rw.backY + (rw.frontY - rw.backY - L.r * .4) * e, sway = phase === 'desfile' && k >= 1 ? Math.sin((clock - phaseAt - WALK) * 1.6) * (rw.frontW * .12) : 0;
  return [rw.cx + sway, y, .45 + .55 * e, k < 1];
}

function flash(x, y) {
  flashAt = clock; photos++; lastAct = clock;
  sfx.click(); sfx.bell(1568);
  hopAt = clock;
  for (let i = 0; i < 3; i++) addParticle({ x: x + rand(-30, 30), y: y + rand(-30, 30), vx: rand(-60, 60), vy: -rand(40, 120), life: 1, decay: 1.2, size: rand(4, 8), color: pick(['#fff6b0', '#ffffff', '#ffd1e8']), star: true, rot: 0, vr: rand(-4, 4) });
  if (photos % 3 === 1 && clock - lastB > 2.5) { lastB = clock; talk(pick(['olha', 'oba'])); }
}

// ---------- toques ----------
function onTap(x, y) {
  lastAct = clock;
  if (phase === 'desfile' || phase === 'fim') { flash(x, y); return; }
  if (phase !== 'loja') return;
  const tab = tabSlots().find(t => Math.abs(x - t.x) < t.w / 2 && Math.abs(y - t.y) < t.h / 2);
  if (tab) { if (tab.cat !== cat) { cat = tab.cat; sfx.pop(); } talk('cat-' + tab.cat); clearTimeout(advanceT); return; }
  const slot = itemSlots().find(s => Math.abs(x - s.x) < s.w / 2 && Math.abs(y - s.y) < s.h / 2);
  if (slot) { wear(cat, ITEMS[cat][slot.i], slot); return; }
  if (ready() && Math.hypot(x - L.go[0], y - L.go[1]) < L.goR * 1.3) { startShow(); return; }
  const [fx, fy] = L.feet;
  if (Math.abs(x - fx) < L.r * 1.2 && y < fy && y > fy - L.r * 3.8) {
    hopAt = clock; sfx.giggle();
    if (clock - lastB > 3) { lastB = clock; talk(pick(['hihi', 'oba'])); }
    return;
  }
  sfx.pop(); ring(x, y, L.r * .25);
}

// ---------- dica ----------
function hintTarget() {
  if (phase !== 'loja' || flyers.length) return null;
  if (ready()) return L.go;
  if (!look[cat]) { const s = itemSlots()[0]; return [s.x, s.y]; }
  const t = tabSlots().find(t => !look[t.cat]);
  return t ? [t.x, t.y] : null;
}

function drawHint(t) {
  if (clock - lastAct < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  const size = Math.round(Math.max(L.r * .8, 40) / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + size * .15 + Math.abs(Math.sin(t * 4)) * size * .3, size, size);
}

function remind() {
  if (phase !== 'loja' || clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  talk(ready() ? 'botao' : 'cat-' + (look[cat] ? CATS.find(c => !look[c]) : cat));
  lastAct = clock;
}

// ---------- desenho ----------
function drawTabsAndItems(t) {
  for (const tb of tabSlots()) {
    const on = tb.cat === cat, done = !!look[tb.cat];
    ctx.fillStyle = on ? '#ff7eb6' : '#ffe3f1'; ctx.beginPath(); ctx.roundRect(tb.x - tb.w / 2, tb.y - tb.h / 2, tb.w, tb.h, tb.h * .35); ctx.fill();
    emojiAt(ctx, CAT_ICON[tb.cat], tb.x, tb.y, Math.min(tb.h * .7, tb.w * .5) * (on ? 1.08 : 1));
    if (done) { ctx.fillStyle = '#ffc93c'; star(ctx, tb.x + tb.w * .36, tb.y - tb.h * .3, tb.h * .16, -Math.PI / 2); }
  }
  for (const s of itemSlots()) {
    const item = ITEMS[cat][s.i], on = look[cat] === item.id;
    ctx.fillStyle = on ? '#fff0f7' : '#f5edff'; ctx.beginPath(); ctx.roundRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 16); ctx.fill();
    if (on) { ctx.strokeStyle = '#ff7eb6'; ctx.lineWidth = 3; ctx.stroke(); }
    if (flyers.some(f => f.item === item)) continue;
    ctx.save(); ctx.beginPath(); ctx.roundRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 16); ctx.clip();
    drawThumb(ctx, cat, item, s.x, s.y, s.s, t);
    ctx.restore();
  }
}

function drawFlyers(t) {
  const [cx, cy] = dollCenter();
  for (const f of flyers) {
    const k = Math.min((clock - f.at) / FLY, 1), e = 1 - (1 - k) ** 3;
    const x = f.x0 + (cx - f.x0) * e, y = f.y0 + (cy - f.y0) * e - Math.sin(k * Math.PI) * L.r * 1.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate((1 - e) * 2); ctx.scale(1 - e * .3, 1 - e * .3);
    drawThumb(ctx, f.cat, f.item, 0, 0, itemSlots()[0].s, t);
    ctx.restore();
  }
}

function drawGo(t) {
  if (!ready() || phase !== 'loja') return;
  const [x, y] = L.go, s = L.goR * (1 + .08 * Math.sin(t * 5));
  ctx.fillStyle = 'rgb(255 210 60 / .35)'; circle(ctx, x, y, s * 1.35); ctx.fill();
  ctx.fillStyle = '#ffc93c'; star(ctx, x, y, s * 1.1, -Math.PI / 2 + Math.sin(t * 2) * .1);
  ctx.fillStyle = '#fff6b0'; star(ctx, x - s * .15, y - s * .15, s * .3, -Math.PI / 2);
}

function drawShop(t) {
  ctx.drawImage(shopLayer, 0, 0, W, H);
  const [fx, fy] = L.feet, hop = pulseAt(hopAt, .45) * L.r * .35;
  v.blink = (t % 3.3) < .12 ? .1 : 1; v.mouth = 'smile'; v.eyes = 'open';
  drawDoll(ctx, dollPose(fx, fy - hop, L.r), friend.b, v, look, t);
  drawGo(t);
  drawTabsAndItems(t);
  drawFlyers(t);
}

function drawShow(t) {
  ctx.drawImage(stageLayer, 0, 0, W, H);
  drawSpots(t);
  const [x, y, s, walking] = showSpot(), r = L.r * s * (L.port ? 1.25 : .9);
  const step = Math.sin((clock - phaseAt) * 9), lift = walking ? [Math.max(0, step) * r * .18, Math.max(0, -step) * r * .18] : [0, 0];
  const hop = pulseAt(hopAt, .4) * r * .3 + (walking ? Math.abs(step) * r * .05 : 0);
  ctx.fillStyle = 'rgb(0 0 0 / .25)'; ctx.beginPath(); ctx.ellipse(x, y, r * .9, r * .2, 0, 0, TAU); ctx.fill();
  v.blink = (t % 3.3) < .12 ? .1 : 1; v.mouth = 'smile';
  const P = pose(x, y - hop, r, dollPose(0, 0, 1).arms, lift);
  drawDoll(ctx, P, friend.b, v, look, t);
  drawCrowd(t, clapAt);
  const e = clock - flashAt;
  if (e < .35) { ctx.fillStyle = `rgb(255 255 255 / ${.7 * (1 - e / .35)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- ciclo ----------
function update(dt) {
  if (started) {
    for (const f of flyers.filter(f => clock - f.at >= FLY)) landed(f);
    flyers = flyers.filter(f => clock - f.at < FLY);
    remind();
  }
  updateMeter(dt);
}

function render(t) {
  if (phase === 'desfile' || phase === 'fim') drawShow(t); else drawShop(t);
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutShop();
}

boot({
  resize, update, render, onTap,
  onAmbient: () => {},   // dentro da loja: sem passarinho
  onStart() { talk('vamos'); setTimeout(arrive, 1300); },
});
