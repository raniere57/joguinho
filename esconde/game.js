'use strict';
// Esconde-esconde do ursinho: ele se esconde atrás de uma coisa; tocar pra achar

loadVoices(['vamos', 'fecha', 'um', 'dois', 'tres', 'cade', 'aqui-nao-1', 'aqui-nao-2', 'aqui-nao-3',
  'achou-1', 'achou-2', 'muito-bem', 'de-novo', 'urso-achou', 'urso-achou-2', 'urso-ri', 'urso-ola']);

const BEAR = '🧸';
// esconderijos: onde o ursinho fica atrás (y relativo ao tamanho) e quão grande ele cabe
const SPOTS = {
  jardim: ['🌳', '🪨', '🛖', '🚗', '⛺', '🧺'],
  quarto: ['📦', '🎁', '🧺', '🎒', '🧳', '🪣'],
};
const FIT = { '⛺': [.12, .55], '🌳': [-.12, .55], '🧺': [.15, .5], '🎒': [.1, .5], '🚗': [.05, .5], '🧳': [.12, .5], '🪣': [.12, .48] };
const SURPRISES = ['🐱', '🦋', '⚽', '🐞', '🎈', '🐭', '🐤', '🍎', '🎀', '🐸'];
const SPOT_COUNT = [3, 3, 3, 4, 4, 4, 5];   // mais esconderijos conforme ela vai achando
const SWITCH_SCENE_EVERY = 2;
const COUNT_STEP = .95;                     // tempo de cada número (um, dois, três)
const LID_TIME = .7;
const FOUND_TIME = 3;
const HINT_AFTER = 5;                       // segundos sem achar até a primeira risadinha
const PEEK_AFTER = 9;                       // ...e até a orelhinha aparecer
const NUMBER_COLORS = ['#ff5fa8', '#3fa9ff', '#5ad16e'];

let sceneName = 'jardim', room = null;
let spots = [], bear = { spot: 0, peek: 0, foundAt: -99, x: 0, y: 0, size: 0 };
let surprises = [];
let phase = 'intro', phaseAt = 0, lids = 0, countShown = -1, round = 0, nextHintAt = 0, wrongLine = 0;
let partyUntil = 0;

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  if (sceneName === 'jardim') startRainbow();
  confettiRain();
  partyUntil = clock + 2;
  say('muito-bem', 'Muito bem! Parabéns!', true);
};

// ---------- quarto ----------
function buildRoom() {
  const [c, g] = layer(W, H), floorY = H * .42;
  g.fillStyle = '#ffe6f0'; g.fillRect(0, 0, W, floorY);
  g.fillStyle = 'rgb(255 255 255 / .7)';
  const dot = Math.max(28, W / 12);
  for (let y = dot / 2; y < floorY; y += dot) {
    for (let x = (y / dot % 2 ? dot / 2 : 0); x < W + dot; x += dot) { circle(g, x, y, dot * .12); g.fill(); }
  }
  // janela com céu
  const wx = W * .08, wy = H * .1, ww = Math.min(W * .36, 220), wh = Math.min(H * .19, ww * 1.1);
  const sky = g.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#5ab8ff'); sky.addColorStop(1, '#bfe8ff');
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(wx - 8, wy - 8, ww + 16, wh + 16, 14); g.fill();
  g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = '#fff';
  for (const [x, y, r] of [[.3, .55, .12], [.45, .45, .16], [.6, .55, .12]]) { circle(g, wx + ww * x, wy + wh * y, ww * r); g.fill(); }
  g.fillStyle = '#ffd23f'; circle(g, wx + ww * .82, wy + wh * .22, ww * .1); g.fill();
  g.fillStyle = '#fff'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh); g.fillRect(wx, wy + wh / 2 - 3, ww, 6);
  g.fillStyle = '#ff9ec8';
  g.beginPath(); g.moveTo(wx - 14, wy - 12); g.quadraticCurveTo(wx + ww * .22, wy + wh * .5, wx - 4, wy + wh + 16); g.lineTo(wx - 18, wy + wh + 16); g.fill();
  g.beginPath(); g.moveTo(wx + ww + 14, wy - 12); g.quadraticCurveTo(wx + ww * .78, wy + wh * .5, wx + ww + 4, wy + wh + 16); g.lineTo(wx + ww + 18, wy + wh + 16); g.fill();
  // quadrinho com estrela
  const pw = Math.min(W * .22, 130), px = W - pw - W * .1, py = H * .13;
  g.fillStyle = '#ffc930'; g.beginPath(); g.roundRect?.(px - 7, py - 7, pw + 14, pw * .8 + 14, 10); g.fill();
  g.fillStyle = '#fff8e6'; g.fillRect(px, py, pw, pw * .8);
  g.fillStyle = '#ff8a3d'; star(g, px + pw / 2, py + pw * .4, pw * .28, -Math.PI / 2);
  // rodapé e chão de tábuas
  g.fillStyle = '#fff'; g.fillRect(0, floorY - 4, W, 10);
  const wood = g.createLinearGradient(0, floorY, 0, H);
  wood.addColorStop(0, '#f3cf9f'); wood.addColorStop(1, '#dea56f');
  g.fillStyle = wood; g.fillRect(0, floorY + 6, W, H);
  g.strokeStyle = 'rgb(150 90 40 / .18)'; g.lineWidth = 2;
  const plank = Math.max(26, H * .045);
  for (let y = floorY + 6 + plank, i = 0; y < H; y += plank, i++) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (i % 2) * 90 + 40; x < W; x += 180) { g.beginPath(); g.moveTo(x, y - plank); g.lineTo(x, y); g.stroke(); }
  }
  // tapete redondo
  g.fillStyle = '#bfe6ff';
  g.beginPath(); g.ellipse(W / 2, H * .72, W * .46, H * .17, 0, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.setLineDash([10, 9]);
  g.beginPath(); g.ellipse(W / 2, H * .72, W * .42, H * .145, 0, 0, TAU); g.stroke();
  g.setLineDash([]);
  return c;
}

// ---------- esconderijos ----------
function layoutSpots(emojis) {
  const n = emojis.length, top = H * .45, bottom = H - Math.max(20, H * .04);
  const cols = H > W ? 2 : Math.min(n, 4), rows = Math.ceil(n / cols);
  const cellW = W / cols, cellH = (bottom - top) / rows;
  const size = Math.min(cellW * .95, cellH * 1.05, 240);
  return emojis.map((emoji, i) => {
    const r = i / cols | 0, c = i % cols, inRow = Math.min(cols, n - r * cols);
    const x = (c + .5 + (cols - inRow) / 2) * cellW + (r % 2 ? 1 : -1) * cellW * .06;
    const y = top + (r + .5) * cellH;
    const depth = .88 + .12 * (r + .5) / rows;
    return { emoji, x, y, size: size * depth, hopAt: -99, wiggleAt: -99, gone: false };
  });
}

function newRound() {
  if (round > 0 && round % SWITCH_SCENE_EVERY === 0) sceneName = sceneName === 'jardim' ? 'quarto' : 'jardim';
  const n = SPOT_COUNT[Math.min(round, SPOT_COUNT.length - 1)];
  const pool = [...SPOTS[sceneName]].sort(() => Math.random() - .5);
  spots = layoutSpots(pool.slice(0, n));
  bear.spot = Math.random() * n | 0;
  bear.peek = 0;
  bear.foundAt = -99;
  surprises = [];
}

function bearFit(s) {
  const [dy, k] = FIT[s.emoji] || [.1, .55];
  return { x: s.x, y: s.y + s.size * dy, size: s.size * k };
}

// ---------- fases: olá → fecha os olhos → 1, 2, 3 → cadê? → procurando → achou ----------
function setPhase(p) {
  phase = p; phaseAt = clock;
  if (p === 'close') say(round ? 'de-novo' : 'fecha', round ? 'De novo!' : 'Fecha os olhinhos!');
  if (p === 'close' && round) say('fecha', 'Fecha os olhinhos!', true);
  if (p === 'count') { countShown = -1; newRound(); }
  if (p === 'open') say('cade', 'Cadê o ursinho?');
  if (p === 'seek') nextHintAt = clock + HINT_AFTER;
}

function updatePhase(dt) {
  const t = clock - phaseAt;
  if (phase === 'hello' && t > 2.8) setPhase('close');
  else if (phase === 'close') {
    lids = Math.min(Math.max(t - .5, 0) / LID_TIME, 1);
    if (t > (round ? 2.3 : 1.5)) setPhase('count');   // espera o "fecha os olhinhos" terminar
  } else if (phase === 'count') {
    const i = t / COUNT_STEP | 0;
    if (i !== countShown && i >= 0 && i < 3) {
      countShown = i;
      say(['um', 'dois', 'tres'][i], ['Um', 'Dois', 'Três!'][i]);
      sfx.bell(523.25 * 2 ** ([0, 4, 7][i] / 12));
    }
    if (t > COUNT_STEP * 3 + .2) setPhase('open');
  } else if (phase === 'open') {
    lids = 1 - Math.min(t / LID_TIME, 1);
    if (t > LID_TIME) setPhase('seek');
  } else if (phase === 'seek') {
    seekHints();
  } else if (phase === 'found' && t > FOUND_TIME && clock > partyUntil) {
    round++;
    setPhase('close');
  }
  // orelhinha aparece aos poucos
  const idle = phase === 'seek' ? clock - Math.max(phaseAt, lastTap) : 0;
  const peekTarget = phase === 'seek' && (round === 0 || idle > PEEK_AFTER) ? .42 : 0;
  bear.peek += (peekTarget - bear.peek) * Math.min(dt * 3, 1);
}

// sem achar há um tempo: o esconderijo certo balança e dá risadinha
function seekHints() {
  if (clock < nextHintAt) return;
  const idle = clock - Math.max(phaseAt, lastTap);
  if (idle < HINT_AFTER) { nextHintAt = clock + HINT_AFTER - idle; return; }
  const s = spots[bear.spot];
  s.wiggleAt = clock;
  sfx.giggle(s.x / W * 2 - 1);
  if (Math.random() < .5) say('urso-ri', 'Hihihi!');
  nextHintAt = clock + 4;
}

// ---------- toques ----------
function onTap(x, y) {
  if (phase !== 'seek') {
    if (phase === 'found' || phase === 'hello') { sfx.bell(); burst(x, y, R * .3, rand(0, 360), 7); }
    return;
  }
  let best = -1, bestD = Infinity;
  spots.forEach((s, i) => {
    const dx = Math.abs(x - s.x), dy = Math.abs(y - s.y), d = Math.hypot(dx, dy);
    if (dx < s.size * .6 && dy < s.size * .6 && d < bestD) { best = i; bestD = d; }
  });
  if (best < 0) {
    if (sceneName === 'jardim' && tapBird(x, y)) return;
    sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
    return;
  }
  if (best === bear.spot) found(); else wrong(spots[best]);
}

function wrong(s) {
  s.hopAt = clock;
  sfx.boing();
  navigator.vibrate?.(10);
  const used = surprises.map(p => p.emoji);
  surprises.push({ emoji: pick(SURPRISES.filter(e => !used.includes(e))), x: s.x, y: s.y - s.size * .2, size: s.size * .55, t: 0 });
  wrongLine = wrongLine % 3 + 1;
  say(`aqui-nao-${wrongLine}`, 'Aqui não!');
}

function found() {
  const s = spots[bear.spot], b = bearFit(s);
  s.gone = true; s.goneAt = clock; s.dir = s.x < W / 2 ? -1 : 1;
  bear.foundAt = clock; bear.x = b.x; bear.y = b.y; bear.size = b.size;
  sfx.whoosh(); sfx.pop();
  setTimeout(() => sfx.fanfare(), 250);
  navigator.vibrate?.([20, 40, 20]);
  ring(b.x, b.y, s.size * .5);
  burst(b.x, b.y, s.size * .45, 40, 26);
  launchStar(b.x, b.y);
  say(pick(['achou-1', 'achou-2']), 'Achou!');
  say(pick(['urso-achou', 'urso-achou-2']), 'Aqui estou eu!', true);
  setPhase('found');
}

// ---------- desenho ----------
function drawSpot(s, t) {
  const hop = clock - s.hopAt < .45 ? Math.sin((clock - s.hopAt) / .45 * Math.PI) : 0;
  const wig = clock - s.wiggleAt < .7 ? Math.sin(clock * 28) * .13 * (1 - (clock - s.wiggleAt) / .7) : 0;
  const img = emojiSprite(s.emoji, Math.round(s.size / 10) * 10);
  ctx.save();
  if (s.gone) {
    const p = Math.min((clock - s.goneAt) / .7, 1);
    ctx.globalAlpha = 1 - p;
    ctx.translate(s.x + s.dir * W * .5 * p, s.y - Math.sin(p * Math.PI) * s.size * .6);
    ctx.rotate(s.dir * p * 2.5);
  } else {
    ctx.translate(s.x, s.y + s.size * .45 - hop * s.size * .3);
    ctx.rotate(wig);
    ctx.scale(1 + hop * .06, 1 - hop * .06);
    ctx.translate(0, -s.size * .45);
  }
  ctx.drawImage(img, -s.size / 2, -s.size / 2, s.size, s.size);
  ctx.restore();
}

function drawBear(x, y, size, t, jump) {
  const img = emojiSprite(BEAR, Math.round(size / 10) * 10);
  const bob = Math.abs(Math.sin(t * (jump ? 7 : 3))) * size * (jump ? .22 : .06);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate(Math.sin(t * (jump ? 9 : 2)) * (jump ? .18 : .06));
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawShadows() {
  ctx.fillStyle = sceneName === 'jardim' ? 'rgb(20 80 20 / .18)' : 'rgb(120 70 20 / .2)';
  for (const s of spots) {
    if (s.gone) continue;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + s.size * .36, s.size * .36, s.size * .08, 0, 0, TAU); ctx.fill();
  }
}

function drawScene(t) {
  drawShadows();
  const sorted = spots.map((s, i) => [s, i]).sort((a, b) => a[0].y - b[0].y);
  for (const [s, i] of sorted) {
    if (i === bear.spot && phase !== 'found' && phase !== 'count' && phase !== 'close' && bear.peek > .01) {
      const b = bearFit(s);
      drawBear(b.x, b.y - bear.peek * s.size, b.size, t, false);   // atrás do esconderijo
    }
    drawSpot(s, t);
  }
}

function drawFoundBear(t) {
  // sai do esconderijo e pula pro meio da tela, grandão
  const age = clock - bear.foundAt, p = Math.min(age / .8, 1), e = easeOutBack(p);
  const size = bear.size + (Math.min(W, H) * .5 - bear.size) * e;
  const x = bear.x + (W / 2 - bear.x) * e;
  const y = bear.y + (H * .6 - bear.y) * e - Math.sin(p * Math.PI) * H * .12;
  drawBear(x, y, size, t, p >= 1);
}

function drawIntroBear(t) {
  const size = Math.min(W, H) * .42;
  drawBear(W / 2, H * .34, size, t, false);
}

function drawLids() {
  if (lids <= 0) return;
  const e = lids * lids * (3 - 2 * lids), y = e * H * .55, bulge = H * .1 * e;
  const g = ctx.createLinearGradient(0, 0, 0, H * .6);
  g.addColorStop(0, '#2a1d45'); g.addColorStop(1, '#4b3775');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, y); ctx.quadraticCurveTo(W / 2, y + bulge * 2, 0, y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, H - y); ctx.quadraticCurveTo(W / 2, H - y - bulge * 2, 0, H - y); ctx.fill();
  if (e < 1) return;
  // olhinhos fechados com cílios
  const ex = Math.min(W, H) * .16, ey = H * .3, er = ex * .55;
  ctx.strokeStyle = '#ffd6ec'; ctx.lineWidth = er * .16; ctx.lineCap = 'round';
  for (const cx of [W / 2 - ex, W / 2 + ex]) {
    ctx.beginPath(); ctx.arc(cx, ey, er, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
    for (const a of [.3, .5, .7]) {
      const ax = cx + Math.cos(a * Math.PI) * er, ay = ey + Math.sin(a * Math.PI) * er;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(a * Math.PI) * er * .35, ay + Math.sin(a * Math.PI) * er * .35); ctx.stroke();
    }
  }
}

function drawCount() {
  if (phase !== 'count' || countShown < 0) return;
  const age = clock - phaseAt - countShown * COUNT_STEP, k = easeOutBack(Math.min(age / .35, 1));
  const size = Math.min(W, H) * .42 * k;
  ctx.font = `800 ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * .12; ctx.strokeStyle = '#fff';
  ctx.strokeText(countShown + 1, W / 2, H * .6);
  ctx.fillStyle = NUMBER_COLORS[countShown];
  ctx.fillText(countShown + 1, W / 2, H * .6);
}

function drawSurprises() {
  for (const p of surprises) {
    const k = easeOutBack(Math.min(p.t / .3, 1)), size = p.size * k;
    ctx.globalAlpha = p.t > 1 ? Math.max(0, 1 - (p.t - 1) / .4) : 1;
    ctx.drawImage(emojiSprite(p.emoji, Math.round(p.size / 10) * 10), p.x - size / 2, p.y - p.t * p.size * .9 - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  buildSky(.42);
  room = buildRoom();
  if (spots.length) {
    const fresh = layoutSpots(spots.map(s => s.emoji));
    spots.forEach((s, i) => Object.assign(s, { x: fresh[i].x, y: fresh[i].y, size: fresh[i].size }));
  } else newRound();
}

function update(dt) {
  if (sceneName === 'jardim') updateSky(dt);
  updatePhase(dt);
  updateMeter(dt);
  for (const p of surprises) p.t += dt;
  surprises = surprises.filter(p => p.t < 1.4);
}

function render(t) {
  if (sceneName === 'jardim') { drawSkyBack(t); drawRainbow(); drawHills(); }
  else ctx.drawImage(room, 0, 0, W, H);
  drawScene(t);
  drawSurprises();
  if (phase === 'intro' || phase === 'hello') drawIntroBear(t);
  if (phase === 'found') drawFoundBear(t);
  drawRings();
  drawLids();
  drawCount();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap,
  onBird: () => { if (sceneName === 'jardim') spawnBird(); },
  onStart: () => { say('vamos', 'Vamos brincar de esconde-esconde com o ursinho?'); setPhase('hello'); },
});
