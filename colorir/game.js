'use strict';
// Colorir mágico: escolhe um desenho na galeria, pinta o quanto quiser e volta pra escolher outro (tudo fica
// guardado). Desenho todo pintado sai do papel e ganha vida num cenário.

const COLORS = [
  { key: 'vermelho', label: 'Vermelho', c: '#ff4d4d', hue: 0 },
  { key: 'laranja', label: 'Laranja', c: '#ff9a3c', hue: 30 },
  { key: 'amarelo', label: 'Amarelo', c: '#ffd93b', hue: 50 },
  { key: 'verde', label: 'Verde', c: '#5cd65c', hue: 120 },
  { key: 'azul', label: 'Azul', c: '#4da6ff', hue: 210 },
  { key: 'roxo', label: 'Roxo', c: '#a066ff', hue: 270 },
  { key: 'rosa', label: 'Rosa', c: '#ff7ac8', hue: 320 },
  { key: 'marrom', label: 'Marrom', c: '#a0673f', hue: 25 },
  { key: 'arco', label: 'Arco-íris', rainbow: true, hue: 0 },
];
const RAINBOW = ['#ff4d4d', '#ff9a3c', '#ffd93b', '#5cd65c', '#4da6ff', '#a066ff'];
const LINE = 3.2;                  // contorno, em unidades do desenho (200 x 200)
const SPREAD = .45;                // segundos pra tinta se espalhar
const OPEN_TIME = .35;             // zoom do cartão da galeria até a folha
const MAGIC_IN = 1.1;              // brilho antes de ganhar vida
const ALIVE_TIME = 8;              // quanto tempo o desenho fica vivo
const HINT_AFTER = 7, REPEAT_AFTER = 16;
const SAVE_KEY = 'colorir-pinturas-v1';

loadVoices([...COLORS.map(c => c.key), ...ARTS.map(a => a.line),
  'vamos', 'escolha', 'lindo', 'isso', 'muito-bem', 'ajuda', 'artista', 'magica']);

const hitCtx = document.createElement('canvas').getContext('2d');
let view = 'gallery', viewAt = -99, openFrom = null, aliveAt = -99, flashAt = -99;
let bg = null, art = null, fills = [], wasDone = false, selected = 0, frameDt = 0;
let box = { x: 0, y: 0, s: 0 }, doneAt = -99, paintedCount = 0, hintAt = 0, saidAt = 0;
const saved = loadSaved();
const tray = document.querySelector('.tray'), gallery = document.querySelector('.gallery');
const backBtn = document.querySelector('.back'), magicBtn = document.querySelector('.magic');

meter.size = 3;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  confettiRain();
  say('artista', 'Uau! Você é uma artista!', true);
};

// ---------- preparo de um desenho ----------
function toPath(sh) {
  if (!sh.c) return new Path2D(sh.d);
  const p = new Path2D();
  p.arc(sh.c[0], sh.c[1], sh.c[2], 0, TAU);
  return p;
}

// amostra uma grade: de cada parte, a caixa (pro arco-íris) e um ponto visível (pra mãozinha e pra girar)
function prepare(a) {
  if (a.ready) return;
  for (const sh of a.shapes) sh.path = toPath(sh);
  const pts = a.shapes.map(() => []);
  for (let y = 1; y < 200; y += 4) {
    for (let x = 1; x < 200; x += 4) {
      for (let i = a.shapes.length - 1; i >= 0; i--) {
        if (a.shapes[i].line || !hitCtx.isPointInPath(a.shapes[i].path, x, y)) continue;
        pts[i].push([x, y]);
        break;
      }
    }
  }
  a.shapes.forEach((sh, i) => {
    const p = pts[i];
    if (!p.length) { sh.spot = sh.c ? sh.c.slice(0, 2) : [100, 100]; sh.bbox = [80, 80, 120, 120]; return; }
    const mx = p.reduce((s, q) => s + q[0], 0) / p.length, my = p.reduce((s, q) => s + q[1], 0) / p.length;
    sh.spot = p.reduce((b, q) => Math.hypot(q[0] - mx, q[1] - my) < Math.hypot(b[0] - mx, b[1] - my) ? q : b);
    sh.bbox = [Math.min(...p.map(q => q[0])), Math.min(...p.map(q => q[1])), Math.max(...p.map(q => q[0])), Math.max(...p.map(q => q[1]))];
  });
  a.ready = true;
}

const paintable = sh => !sh.line && !sh.fixed;
const isDone = (a, colors) => a.shapes.every((sh, i) => !paintable(sh) || colors[i] !== null);

// ---------- guardar as pinturas ----------
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}

// o que veio do armazenamento pode estar velho ou estragado: só aceita índice de cor válido
function colorsFor(a) {
  const s = saved[a.line];
  const ok = Array.isArray(s) && s.length === a.shapes.length;
  return a.shapes.map((_, i) => (ok && Number.isInteger(s[i]) && s[i] >= 0 && s[i] < COLORS.length ? s[i] : null));
}

function save() {
  saved[art.line] = fills.map(f => f.color);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* modo privado: fica só nesta visita */ }
}

// ---------- desenhar uma parte ----------
function paintFor(g, sh, color) {
  if (color === null) return '#fff';
  const col = COLORS[color];
  if (!col.rainbow) return col.c;
  const [x0, , x1] = sh.bbox, grad = g.createLinearGradient(x0 - 2, 0, x1 + 2, 0);
  RAINBOW.forEach((c, i) => grad.addColorStop(i / (RAINBOW.length - 1), c));
  return grad;
}

function drawShape(g, sh, f) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = LINE; g.strokeStyle = INK;
  if (sh.line) { g.stroke(sh.path); return; }
  const p = (clock - f.at) / SPREAD;
  g.fillStyle = sh.fixed || paintFor(g, sh, p < 1 ? f.from : f.color);
  g.fill(sh.path);
  if (p < 1) {
    // a tinta nova cresce a partir do dedo, presa dentro da parte tocada
    const [x0, y0, x1, y1] = sh.bbox, far = Math.hypot(Math.max(f.x - x0, x1 - f.x), Math.max(f.y - y0, y1 - f.y)) + 6;
    g.save();
    g.clip(sh.path);
    g.fillStyle = paintFor(g, sh, f.color);
    circle(g, f.x, f.y, far * (1 - (1 - p) ** 3));
    g.fill();
    g.restore();
  }
  if (!sh.bare) g.stroke(sh.path);
}

// ---------- galeria ----------
function buildGallery() {
  gallery.replaceChildren(...ARTS.map((a, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card';
    b.setAttribute('aria-label', a.text);
    b.style.setProperty('--i', i);
    b.style.setProperty('--r', `${(noiseAt(i + 7) - .5) * 4}deg`);
    b.append(document.createElement('canvas'));
    b.addEventListener('click', () => {
      if (!started) return;
      sfx.resume();
      lastTap = clock;
      openArt(i, b);
    });
    return b;
  }));
}

function drawThumb(card, a) {
  prepare(a);
  const size = card.clientWidth || 150, c = card.firstChild, g = c.getContext('2d'), k = size / 200 * .86;
  c.width = c.height = Math.round(size * DPR);
  g.setTransform(DPR * k, 0, 0, DPR * k, DPR * size * .07, DPR * size * .07);
  const colors = colorsFor(a);
  a.shapes.forEach((sh, i) => drawShape(g, sh, { color: colors[i], at: -99 }));
  card.classList.toggle('done', isDone(a, colors));
}

function showGallery() {
  view = 'gallery'; viewAt = clock; art = null;
  tray.classList.remove('on');
  backBtn.hidden = magicBtn.hidden = true;
  gallery.classList.add('on');
  [...gallery.children].forEach((card, i) => drawThumb(card, ARTS[i]));
  resetAlive();
}

function openArt(i, card) {
  if (view !== 'gallery') return;
  art = ARTS[i];
  prepare(art);
  fills = colorsFor(art).map(color => ({ color, from: null, at: -99, x: 0, y: 0 }));
  wasDone = isDone(art, colorsFor(art));
  const r = card.getBoundingClientRect();
  openFrom = { x: r.left + r.width * .07, y: r.top + r.width * .07, s: r.width * .86 };
  view = 'art'; viewAt = clock; doneAt = -99; paintedCount = 0; hintAt = saidAt = clock;
  gallery.classList.remove('on');
  tray.classList.add('on');
  backBtn.hidden = false; backBtn.classList.remove('pulse');
  magicBtn.hidden = !wasDone;
  sfx.whoosh();
  say(art.line, art.text);
}

function backToGallery() {
  if (view === 'gallery') return;
  save();
  sfx.whoosh();
  say('escolha', 'Escolha um desenho!');
  showGallery();
}

// ---------- pintar ----------
function paintAt(x, y) {
  if (view !== 'art' || clock - viewAt < OPEN_TIME) return false;
  const k = box.s / 200, px = (x - box.x) / k, py = (y - box.y) / k;
  for (let i = art.shapes.length - 1; i >= 0; i--) {
    const sh = art.shapes[i];
    if (sh.line || !hitCtx.isPointInPath(sh.path, px, py)) continue;
    if (sh.fixed) return true;          // olhinho: toque engolido, não pinta o que está atrás
    const f = fills[i], col = COLORS[selected];
    if (f.color === selected && !col.rainbow) return true;
    Object.assign(f, { from: f.color, color: selected, at: clock, x: px, y: py });
    sfx.bell(523.25 * 2 ** (MAJOR[selected % 8] / 12));
    if (col.rainbow) setTimeout(() => sfx.bell(523.25 * 2 ** (MAJOR[4] / 12) * 2), 120);
    burst(x, y, R * .3, col.rainbow ? rand(0, 360) : col.hue, 10);
    ring(x, y, R * .35);
    save();
    paintedCount++;
    const done = isDone(art, fills.map(f => f.color));
    if (paintedCount % 6 === 0 && !done) say(pick(['isso', 'muito-bem']), 'Muito bem!');
    if (done && !wasDone) finish();
    return true;
  }
  return false;
}

function finish() {
  wasDone = true; doneAt = clock;
  say('lindo', 'Que lindo! Ficou muito bonito!');
  launchStar(box.x + box.s / 2, box.y + box.s / 2);
  for (let i = 0; i < 5; i++) setTimeout(() => burst(box.x + rand(0, box.s), box.y + rand(0, box.s), R * .4, rand(0, 360), 12), i * 160);
  const current = art;
  setTimeout(() => { if (view === 'art' && art === current) startAlive(); }, 1600);
}

// ---------- ganhar vida ----------
function startAlive() {
  view = 'alive'; aliveAt = clock;
  tray.classList.remove('on');
  magicBtn.hidden = true;
  resetAlive();
  [0, 2, 4, 5, 7, 9, 12, 14, 16].forEach((s, i) => setTimeout(() => sfx.bell(523.25 * 2 ** (s / 12)), i * 70));
  setTimeout(() => sfx.chime(), 700);
  setTimeout(() => { if (view === 'alive') say('magica', 'Uau! Olha só, ganhou vida!'); }, MAGIC_IN * 1000);
}

function endAlive() {
  view = 'art'; viewAt = clock - OPEN_TIME; flashAt = clock; openFrom = null;
  tray.classList.add('on');
  magicBtn.hidden = false;
  backBtn.classList.add('pulse');   // sugere escolher outro desenho
  resetAlive();
}

// flash branco que esconde a troca entre a folha e o cenário
function flashAlpha() {
  if (view === 'alive') {
    const T = clock - aliveAt;
    if (T < MAGIC_IN) return (T / MAGIC_IN) ** 3;
    if (T < MAGIC_IN + .5) return 1 - (T - MAGIC_IN) / .5;
    const end = MAGIC_IN + ALIVE_TIME;
    return T > end - .4 ? clamp01((T - end + .4) / .4) : 0;
  }
  return 1 - clamp01((clock - flashAt) / .45);
}

// ---------- paleta ----------
function selectColor(i) {
  selected = i;
  [...tray.children].forEach((b, j) => b.classList.toggle('on', j === i));
  sfx.bell(523.25 * 2 ** (MAJOR[i % 8] / 12));
  say(COLORS[i].key, COLORS[i].label + '!');
}

function buildTray() {
  tray.replaceChildren(...COLORS.map((col, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', col.label);
    if (col.rainbow) b.classList.add('rainbow');
    else b.style.setProperty('--c', col.c);
    b.addEventListener('click', () => {
      if (!started) return;
      sfx.resume();
      lastTap = clock;
      selectColor(i);
    });
    return b;
  }));
  tray.children[selected].classList.add('on');
}

// ---------- toques ----------
function onTap(x, y) {
  if (paintAt(x, y)) return;
  if (view === 'alive') { sfx.bell(); burst(x, y, R * .3, rand(0, 360), 10); ring(x, y, R * .3); return; }
  sparkle(x, y); burst(x, y, R * .2, rand(0, 360), 5);
}

let lastDrag = 0;
function onMove(x, y) {
  // arrastar o dedo também pinta, mas devagar pra não virar um borrão de notas
  if (clock - lastDrag > .12) { lastDrag = clock; paintAt(x, y); }
}

backBtn.addEventListener('click', () => { if (started) { sfx.resume(); lastTap = clock; backToGallery(); } });
magicBtn.addEventListener('click', () => { if (started && view === 'art') { sfx.resume(); lastTap = clock; startAlive(); } });

// ---------- folha ----------
function sheetRect() {
  if (!openFrom) return box;
  const e = 1 - (1 - clamp01((clock - viewAt) / OPEN_TIME)) ** 3;
  return { x: openFrom.x + (box.x - openFrom.x) * e, y: openFrom.y + (box.y - openFrom.y) * e, s: openFrom.s + (box.s - openFrom.s) * e };
}

function drawPaper(r) {
  const pad = r.s * .06, s = r.s + pad * 2;
  ctx.save();
  ctx.translate(r.x - pad + s / 2, r.y - pad + s / 2); ctx.rotate(-.015); ctx.translate(-s / 2, -s / 2);
  ctx.shadowColor = 'rgb(30 70 60 / .22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath(); ctx.roundRect?.(0, 0, s, s, s * .04); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgb(255 222 120 / .75)';
  for (const [tx, rot] of [[s * .08, -.6], [s * .92, .6]]) {
    ctx.save(); ctx.translate(tx, -s * .01); ctx.rotate(rot); ctx.fillRect(-s * .09, -s * .025, s * .18, s * .05); ctx.restore();
  }
  ctx.restore();
}

function drawSheet(t) {
  const r = sheetRect();
  drawPaper(r);
  const joy = doneAt > 0 ? Math.sin(clamp01((clock - doneAt) / .8) * Math.PI) * .06 : 0;
  ctx.save();
  ctx.translate(r.x + r.s / 2, r.y + r.s / 2);
  if (wasDone) ctx.rotate(Math.sin(t * 2) * .015);
  ctx.scale(r.s / 200 * (1 + joy), r.s / 200 * (1 + joy));
  ctx.translate(-100, -100);
  art.shapes.forEach((sh, i) => drawShape(ctx, sh, fills[i]));
  ctx.restore();
  // antes de ganhar vida: brilhinhos rodando em volta da folha
  if (view === 'alive') {
    const a = clock * 6;
    for (let i = 0; i < 3; i++) sparkle(r.x + r.s / 2 + Math.cos(a + i * 2.1) * r.s * .6, r.y + r.s / 2 + Math.sin(a + i * 2.1) * r.s * .6);
  }
}

function drawAlive() {
  const t = clock - aliveAt - MAGIC_IN, scene = art.alive.scene;
  SCENES[scene](t);
  const m = drawAliveArt(art, fills, t);
  emitAlive(art, t, m);
  SCENE_FRONT[scene]?.(t);
  drawAlivePts(frameDt);
}

function buildBg() {
  const [c, g] = layer(W, H);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#dff7ee'); grad.addColorStop(1, '#e9f0ff');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // respingos de tinta bem clarinhos no fundo
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `hsl(${rand(0, 360)} 90% 70% / .16)`;
    const x = rand(0, W), y = rand(0, H), r = rand(8, 34);
    circle(g, x, y, r); g.fill();
    for (let j = 0; j < 4; j++) { circle(g, x + rand(-r * 1.8, r * 1.8), y + rand(-r * 1.8, r * 1.8), r * rand(.1, .25)); g.fill(); }
  }
  return c;
}

function drawHint(t) {
  if (view !== 'art' || clock - Math.max(hintAt, lastTap) < HINT_AFTER) return;
  const sh = art.shapes.find((s, i) => paintable(s) && fills[i].color === null);
  if (!sh) return;
  const k = box.s / 200, size = Math.round(R * .7 / 4) * 4, bob = Math.abs(Math.sin(t * 4)) * size * .25;
  ctx.drawImage(emojiSprite('👆', size), box.x + sh.spot[0] * k - size * .4, box.y + sh.spot[1] * k + size * .1 + bob, size, size);
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  const r = tray.getBoundingClientRect(), portrait = H >= W, top = 76;
  const availW = portrait ? W - 40 : r.left - 40, availH = portrait ? r.top - top - 24 : H - top - 20;
  box.s = Math.max(120, Math.min(availW, availH));
  box.x = portrait ? (W - box.s) / 2 : 20 + (availW - box.s) / 2;
  box.y = top + (availH - box.s) / 2;
  magicBtn.style.left = `${portrait ? Math.min(W - 86, box.x + box.s - 30) : box.x + box.s + (r.left - box.x - box.s - 76) / 2}px`;
  magicBtn.style.top = `${portrait ? box.y + box.s - 40 : box.y + box.s / 2 - 38}px`;
  bg = buildBg();
  if (view === 'gallery' && started) [...gallery.children].forEach((card, i) => drawThumb(card, ARTS[i]));
}

function update(dt) {
  frameDt = dt;
  if (view === 'alive' && clock - aliveAt > MAGIC_IN + ALIVE_TIME) endAlive();
  const idle = clock - Math.max(hintAt, lastTap);
  if (view === 'art' && idle > REPEAT_AFTER && clock - saidAt > REPEAT_AFTER && !isDone(art, fills.map(f => f.color))) {
    saidAt = clock;
    say('ajuda', 'Toque no desenho pra pintar!');
  }
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(bg, 0, 0, W, H);
  if (view === 'alive' && clock - aliveAt >= MAGIC_IN) drawAlive();
  else if (art && view !== 'gallery') drawSheet(t);
  drawHint(t);
  const flash = view === 'gallery' ? 0 : flashAlpha();
  if (flash > 0) { ctx.fillStyle = `rgb(255 255 255 / ${flash})`; ctx.fillRect(0, 0, W, H); }
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

buildTray();
buildGallery();
boot({
  resize, update, render, onTap, onMove,
  onStart: () => {
    showGallery();
    say('vamos', 'Vamos colorir? Escolha um desenho!');
  },
});
