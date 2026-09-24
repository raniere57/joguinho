'use strict';
// Colorir mágico: escolhe uma bolota de tinta e toca numa parte do desenho; a cor se espalha com brilho

loadVoices(['vamos', 'vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'roxo', 'rosa', 'marrom', 'arco',
  'peixinho', 'casinha', 'flor', 'borboleta', 'sorvete', 'carrinho', 'lindo', 'isso', 'muito-bem', 'ajuda', 'outro', 'artista']);

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
const INK = '#3a2e4a', LINE = 3.2;              // contorno, em unidades do desenho (200 x 200)
const SPREAD = .45;                             // segundos pra tinta se espalhar
const HINT_AFTER = 7, REPEAT_AFTER = 16;

// ---------- desenhos: 200 x 200; c = círculo, d = caminho SVG; fixed = não pinta; line = só traço ----------
const starPath = (cx, cy, r) => 'M' + Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
  return `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
}).join(' L') + ' Z';
const petals = [0, 1, 2, 3, 4, 5].map(i => ({ c: [100 + Math.cos(i * Math.PI / 3) * 27, 68 + Math.sin(i * Math.PI / 3) * 27, 19] }));

const ARTS = [
  { line: 'peixinho', text: 'Um peixinho!', shapes: [
    { c: [38, 42, 11] }, { c: [22, 74, 7] }, { c: [52, 18, 6] },
    { d: 'M62 100 L18 58 Q32 100 18 142 Z' },
    { d: 'M88 64 Q110 18 150 66 Z' }, { d: 'M100 138 Q114 170 138 136 Z' },
    { d: 'M50 100 A60 42 0 1 0 170 100 A60 42 0 1 0 50 100 Z' },
    { d: 'M95 61 Q82 100 95 139 L112 141 Q99 100 112 59 Z' },
    { c: [145, 90, 11], fixed: '#fff' }, { c: [148, 90, 5], fixed: INK, bare: true },
    { d: 'M163 110 Q156 118 148 113', line: true },
  ] },
  { line: 'casinha', text: 'Uma casinha!', shapes: [
    { c: [165, 34, 20] },
    { d: 'M22 58 A13 13 0 0 1 44 46 A12 12 0 0 1 66 52 A10 10 0 0 1 64 72 H24 A9 9 0 0 1 22 58 Z' },
    { d: 'M0 168 H200 V200 H0 Z' },
    { d: 'M122 40 H142 V82 H122 Z' },
    { d: 'M40 90 H160 V170 H40 Z' },
    { d: 'M26 96 L100 34 L174 96 Z' },
    { d: 'M88 170 V134 A12 12 0 0 1 112 134 V170 Z' },
    { d: 'M52 108 H78 V134 H52 Z' }, { d: 'M122 108 H148 V134 H122 Z' },
    { d: 'M65 108 V134 M52 121 H78 M135 108 V134 M122 121 H148', line: true },
    { c: [106, 152, 2.6], fixed: INK, bare: true },
  ] },
  { line: 'flor', text: 'Uma flor!', shapes: [
    { d: 'M95 88 H105 V145 H95 Z' },
    { d: 'M97 128 Q66 100 58 120 Q72 144 97 136 Z' },
    { d: 'M103 112 Q136 84 144 104 Q128 128 103 120 Z' },
    ...petals,
    { c: [100, 68, 16] },
    { d: 'M70 152 H130 L122 196 H78 Z' },
    { d: 'M62 140 H138 V157 H62 Z' },
  ] },
  { line: 'borboleta', text: 'Uma borboleta!', shapes: [
    { d: 'M96 44 Q86 20 76 18 M104 44 Q114 20 124 18', line: true },
    { c: [75, 18, 5], fixed: INK, bare: true }, { c: [125, 18, 5], fixed: INK, bare: true },
    { d: 'M95 90 C60 18 8 38 24 86 C34 112 80 110 95 100 Z' },
    { d: 'M105 90 C140 18 192 38 176 86 C166 112 120 110 105 100 Z' },
    { d: 'M95 108 C60 104 28 130 44 162 C60 184 90 152 95 122 Z' },
    { d: 'M105 108 C140 104 172 130 156 162 C140 184 110 152 105 122 Z' },
    { c: [55, 72, 12] }, { c: [145, 72, 12] }, { c: [64, 142, 9] }, { c: [136, 142, 9] },
    { d: 'M91 106 A9 44 0 1 0 109 106 A9 44 0 1 0 91 106 Z' },
    { c: [100, 55, 13] },
    { c: [95.5, 53, 2.2], fixed: INK, bare: true }, { c: [104.5, 53, 2.2], fixed: INK, bare: true },
    { d: 'M95 59 Q100 63 105 59', line: true },
  ] },
  { line: 'sorvete', text: 'Um sorvete!', shapes: [
    { d: starPath(38, 54, 18) }, { d: starPath(164, 150, 16) },
    { d: 'M68 112 L100 192 L132 112 Z' },
    { c: [100, 64, 29] },
    { d: 'M60 114 Q58 82 100 80 Q142 82 140 114 Q130 105 120 114 Q110 105 100 114 Q90 105 80 114 Q70 105 60 114 Z' },
    { d: 'M100 36 Q103 20 116 14', line: true },
    { c: [100, 34, 10] },
  ] },
  { line: 'carrinho', text: 'Um carrinho!', shapes: [
    { d: 'M0 170 H200 V192 H0 Z' },
    { d: 'M20 140 Q20 115 45 112 L60 112 L75 86 Q80 78 90 78 H130 Q140 78 146 86 L160 112 H170 Q186 114 186 136 V150 H20 Z' },
    { d: 'M80 88 Q82 86 86 86 H106 V112 H70 Z' },
    { d: 'M114 86 H134 Q138 86 140 90 L150 112 H114 Z' },
    { d: 'M110 114 V146', line: true },
    { c: [56, 152, 20] }, { c: [150, 152, 20] },
    { c: [56, 152, 8] }, { c: [150, 152, 8] },
    { c: [178, 128, 6] },
  ] },
];

const hitCtx = document.createElement('canvas').getContext('2d');
let bg = null, artIndex = 0, art = null, fills = [], selected = 0;
let box = { x: 0, y: 0, s: 0 }, doneAt = -99, leavingAt = -99, arrivingAt = -99, paintedCount = 0, hintAt = 0, saidAt = 0, frameDt = 0;
const tray = document.querySelector('.tray'), nextBtn = document.querySelector('.next');

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

// amostra uma grade pra saber, de cada parte pintável, a caixa (pro arco-íris) e um ponto visível (pra mãozinha)
function measure(a) {
  const pts = a.shapes.map(() => []);
  for (let y = 1; y < 200; y += 4) {
    for (let x = 1; x < 200; x += 4) {
      for (let i = a.shapes.length - 1; i >= 0; i--) {
        const sh = a.shapes[i];
        if (sh.line || !hitCtx.isPointInPath(sh.path, x, y)) continue;
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
}

function loadArt(i) {
  artIndex = i % ARTS.length;
  art = ARTS[artIndex];
  if (!art.ready) {
    for (const sh of art.shapes) sh.path = toPath(sh);
    measure(art);
    art.ready = true;
  }
  fills = art.shapes.map(() => ({ color: null, from: null, at: -99, x: 0, y: 0 }));
  doneAt = -99; paintedCount = 0; hintAt = clock;
  nextBtn.hidden = true;
}

const paintable = i => !art.shapes[i].line && !art.shapes[i].fixed;
const allPainted = () => fills.every((f, i) => !paintable(i) || f.color !== null);

// ---------- pintar ----------
function paintAt(x, y) {
  if (!art || clock - leavingAt < .8) return false;
  const k = box.s / 200, px = (x - box.x) / k, py = (y - box.y) / k;
  for (let i = art.shapes.length - 1; i >= 0; i--) {
    const sh = art.shapes[i];
    if (sh.line || !hitCtx.isPointInPath(sh.path, px, py)) continue;
    if (sh.fixed) return true;          // olhinho: toque engolido, não pinta o que está atrás
    const f = fills[i];
    if (f.color === selected && !COLORS[selected].rainbow) return true;
    Object.assign(f, { from: f.color, color: selected, at: clock, x: px, y: py });
    const col = COLORS[selected];
    sfx.bell(523.25 * 2 ** (MAJOR[selected % MAJOR.length] / 12));
    if (col.rainbow) setTimeout(() => sfx.bell(523.25 * 2 ** (MAJOR[4] / 12) * 2), 120);
    burst(x, y, R * .3, col.rainbow ? rand(0, 360) : col.hue, 10);
    ring(x, y, R * .35);
    paintedCount++;
    if (paintedCount % 6 === 0 && !allPainted()) say(pick(['isso', 'muito-bem']), 'Muito bem!');
    if (doneAt < 0 && allPainted()) finish();
    return true;
  }
  return false;
}

function finish() {
  doneAt = clock;
  say('lindo', 'Que lindo! Ficou muito bonito!');
  launchStar(box.x + box.s / 2, box.y + box.s / 2);
  for (let i = 0; i < 5; i++) setTimeout(() => burst(box.x + rand(0, box.s), box.y + rand(0, box.s), R * .4, rand(0, 360), 12), i * 160);
  setTimeout(() => {
    if (doneAt < 0) return;
    nextBtn.hidden = false;
    say('outro', 'Vamos pintar outro?', true);
  }, 1500);
}

function nextArt() {
  if (clock - leavingAt < .8) return;
  nextBtn.hidden = true;
  leavingAt = clock;
  sfx.whoosh();
  setTimeout(() => {
    loadArt(artIndex + 1);
    arrivingAt = clock;
    say(art.line, art.text);
  }, 380);
}

function selectColor(i) {
  selected = i;
  [...tray.children].forEach((b, j) => b.classList.toggle('on', j === i));
  sfx.bell(523.25 * 2 ** (MAJOR[i % MAJOR.length] / 12));
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
  sparkle(x, y); burst(x, y, R * .2, rand(0, 360), 5);
}

let lastDrag = 0;
function onMove(x, y) {
  // arrastar o dedo também pinta, mas devagar pra não virar um só borrão de notas
  if (clock - lastDrag > .12) { lastDrag = clock; paintAt(x, y); }
}

nextBtn.addEventListener('click', () => { sfx.resume(); lastTap = clock; nextArt(); });

// ---------- desenho na tela ----------
function paintFor(sh, color) {
  if (color === null) return '#fff';
  const col = COLORS[color];
  if (!col.rainbow) return col.c;
  const [x0, , x1] = sh.bbox, g = ctx.createLinearGradient(x0 - 2, 0, x1 + 2, 0);
  RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
  return g;
}

function drawArt(t) {
  const out = Math.min(Math.max((clock - leavingAt) / .38, 0), 1), inn = Math.min(Math.max((clock - arrivingAt) / .45, 0), 1);
  const leaving = clock - leavingAt < .38;
  const dx = leaving ? -out * out * W : (1 - easeOutBack(inn)) * W * .6;
  const joy = doneAt > 0 ? Math.sin(Math.min((clock - doneAt) / .8, 1) * Math.PI) * .06 : 0;
  const k = box.s / 200 * (1 + joy);
  ctx.save();
  ctx.translate(box.x + box.s / 2 + dx, box.y + box.s / 2);
  ctx.rotate(doneAt > 0 ? Math.sin(t * 2) * .015 : 0);
  ctx.scale(k, k);
  ctx.translate(-100, -100);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = LINE; ctx.strokeStyle = INK;
  art.shapes.forEach((sh, i) => {
    if (sh.line) { ctx.stroke(sh.path); return; }
    const f = fills[i], p = (clock - f.at) / SPREAD;
    ctx.fillStyle = sh.fixed || paintFor(sh, p < 1 ? f.from : f.color);
    ctx.fill(sh.path);
    if (p < 1) {
      // a tinta nova cresce a partir do dedo, presa dentro da parte tocada
      const [x0, y0, x1, y1] = sh.bbox, far = Math.hypot(Math.max(f.x - x0, x1 - f.x), Math.max(f.y - y0, y1 - f.y)) + 6;
      ctx.save();
      ctx.clip(sh.path);
      ctx.fillStyle = paintFor(sh, f.color);
      circle(ctx, f.x, f.y, far * (1 - (1 - p) ** 3));
      ctx.fill();
      ctx.restore();
    }
    if (!sh.bare) ctx.stroke(sh.path);
  });
  ctx.restore();
}

// folha de papel presa com fitinhas
function drawPaper() {
  const pad = box.s * .06, x = box.x - pad, y = box.y - pad, s = box.s + pad * 2;
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2); ctx.rotate(-.015); ctx.translate(-s / 2, -s / 2);
  ctx.shadowColor = 'rgb(30 70 60 / .22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath(); ctx.roundRect?.(0, 0, s, s, s * .04); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgb(255 222 120 / .75)';
  for (const [tx, ty, rot] of [[s * .08, -s * .01, -.6], [s * .92, -s * .01, .6]]) {
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot); ctx.fillRect(-s * .09, -s * .025, s * .18, s * .05); ctx.restore();
  }
  ctx.restore();
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
  if (!art || doneAt > 0 || clock - Math.max(hintAt, lastTap) < HINT_AFTER) return;
  const i = fills.findIndex((f, j) => paintable(j) && f.color === null);
  if (i < 0) return;
  const k = box.s / 200, [sx, sy] = art.shapes[i].spot;
  const size = Math.round(R * .7 / 4) * 4, bob = Math.abs(Math.sin(t * 4)) * size * .25;
  ctx.drawImage(emojiSprite('👆', size), box.x + sx * k - size * .4, box.y + sy * k + size * .1 + bob, size, size);
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  const r = tray.getBoundingClientRect(), portrait = H >= W, top = 76;
  const availW = portrait ? W - 40 : r.left - 40, availH = portrait ? r.top - top - 24 : H - top - 20;
  box.s = Math.max(120, Math.min(availW, availH));
  box.x = portrait ? (W - box.s) / 2 : 20 + (availW - box.s) / 2;
  box.y = top + (availH - box.s) / 2;
  // em pé: no canto de baixo da folha; deitado: ao lado da folha, entre ela e a paleta
  nextBtn.style.left = `${portrait ? Math.min(W - 86, box.x + box.s - 30) : box.x + box.s + (r.left - box.x - box.s - 76) / 2}px`;
  nextBtn.style.top = `${portrait ? box.y + box.s - 40 : box.y + box.s / 2 - 38}px`;
  bg = buildBg();
}

function update(dt) {
  frameDt = dt;
  const idle = clock - Math.max(hintAt, lastTap);
  if (started && art && doneAt < 0 && idle > REPEAT_AFTER && clock - saidAt > REPEAT_AFTER) { saidAt = clock; say('ajuda', 'Toque no desenho pra pintar!'); }
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(bg, 0, 0, W, H);
  drawPaper();
  if (art) drawArt(t);
  drawHint(t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

buildTray();
loadArt(0);
boot({
  resize, update, render, onTap, onMove,
  onStart: () => {
    tray.classList.add('on');
    hintAt = clock;
    say('vamos', 'Vamos colorir? Escolha uma cor e toque no desenho!');
    say(art.line, art.text, true);
  },
});
