'use strict';
// Bolo de aniversário: escolhe a massa, a cobertura, enfeita, põe velinhas, canta, assopra e come

loadVoices(['vamos', 'massa', 'chocolate', 'morango', 'baunilha', 'alto', 'cobertura', 'rosa', 'azul', 'amarelo',
  'verde', 'roxo', 'enfeitar', 'lindo', 'velas', 'n1', 'n2', 'n3', 'n4', 'n5', 'cantar', 'assopra', 'eba', 'comer',
  'nham', 'denovo']);

const FLAVORS = {
  chocolate: { icon: '🍫', side: ['#9a6140', '#6b3e25'], top: '#b07650', hue: 25, label: 'Chocolate' },
  morango: { icon: '🍓', side: ['#ffb3c7', '#e8708f'], top: '#ffc9d6', hue: 345, label: 'Morango' },
  baunilha: { icon: '🍦', side: ['#ffe8b0', '#e9bb62'], top: '#fff2cc', hue: 45, label: 'Baunilha' },
};
const ICINGS = { rosa: '#ff8ec3', azul: '#7fcaff', amarelo: '#ffd94a', verde: '#86dd8a', roxo: '#c29cff' };
const ICING_NAMES = { rosa: 'Rosa', azul: 'Azul', amarelo: 'Amarelo', verde: 'Verde', roxo: 'Roxo' };
const TOPPINGS = ['🍓', '🍒', '⭐', '🍬', '✨'];          // ✨ = granulado colorido
const SPRINKLE_COLORS = ['#ff5f7e', '#ffc930', '#4fb4ff', '#5ad16e', '#b77cff', '#fff'];
const CANDLE_COLORS = ['#ff7eb6', '#6cc6ff', '#ffd24a', '#8be08b', '#c29cff'];
const NUMBERS = ['Uma', 'Duas', 'Três', 'Quatro', 'Cinco'];
// "Parabéns a você" (melodia de domínio público) na caixinha de música
const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;
const BIRTHDAY = [[G4, .75], [G4, .25], [A4, 1], [G4, 1], [C5, 1], [B4, 2], [G4, .75], [G4, .25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
  [G4, .75], [G4, .25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2], [F5, .75], [F5, .25], [E5, 1], [C5, 1], [D5, 1], [C5, 3]];
const LAYERS = 3, TOPPING_GOAL = 10, MAX_TOPPINGS = 30, MAX_CANDLES = 5, BITES = 7;
const HINT_AFTER = 6;         // segundos parada até a mãozinha aparecer
const REPEAT_AFTER = 13;      // ...e até a tia repetir o que fazer
const CANDLE_WAIT = 4;        // sem pôr mais velinhas por esse tempo = hora de acender
const BLOW_LEVEL = .12;       // volume do microfone que conta como sopro
const BLOW_HOLD = .18;        // ...sustentado por esse tempo (fala e barulho curto não apagam)
const MIC_GRACE = 1.5;        // não escuta enquanto a tia fala "assopra"
const STAGE_LINE = {
  massa: ['massa', 'Escolha o sabor do bolo!'],
  cobertura: ['cobertura', 'Agora, a cobertura! Qual cor?'],
  enfeite: ['enfeitar', 'Hora de enfeitar! Toque no bolo!'],
  velas: ['velas', 'Agora, as velinhas! Toque no bolo!'],
  cantar: ['cantar', 'Vamos cantar parabéns!'],
  assoprar: ['assopra', 'Agora, assopra as velinhas! Fuuuu!'],
  festa: ['eba', 'Ebaaa! Parabéns!'],
  comer: ['comer', 'Hummm! Vamos comer o bolo?'],
};

let wall = null, table = null, tableY = 0;
let stage = 'intro', stageAt = 0, saidAt = 0, pending = null;
const cake = { x: 0, base: 0, w: 0, lh: 0, layers: [], icing: null, icingAt: 0, drips: [], toppings: [], candles: [], eaten: 0, baked: null, bakedG: null };
let friends = [], smoke = [], notes = [];
let wind = 0, blowTime = 0, lastBlowOut = 0;
let dark = 0, song = null, songEndsAt = 0, pickedTopping = TOPPINGS[0], lastPlace = 0, lastCandleAt = 0, frameDt = 0;
const tray = document.querySelector('.tray');

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  confettiRain();
};

// ---------- sala de festa ----------
function buildWall() {
  const [c, g] = layer(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffe0cf'); bg.addColorStop(1, '#fff3ea');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgb(255 255 255 / .35)';
  const stripe = Math.max(28, W / 14);
  for (let x = 0; x < W; x += stripe * 2) g.fillRect(x, 0, stripe, H);
  const r = Math.min(W, H) * .07, y = Math.max(H * .26, drawBunting(g) + r * 1.4);   // balões logo abaixo do varal
  for (const [x, dy, color] of [[W * .1, .08, '#ff8ec3'], [W * .2, .04, '#7fcaff'], [W * .13, 0, '#ffd94a'],
    [W * .9, .08, '#86dd8a'], [W * .8, .04, '#c29cff'], [W * .87, 0, '#ff9f5a']]) drawWallBalloon(g, x, y + dy * H, r, color);
  return c;
}

// varal de bandeirinhas escrito PARABÉNS
function drawBunting(g) {
  const letters = [...'PARABÉNS'], n = letters.length, y0 = Math.max(H * .12, 92), sag = H * .05;
  const at = u => ({ x: -10 + (W + 20) * u, y: y0 + Math.sin(u * Math.PI) * sag });
  g.strokeStyle = '#c9937a'; g.lineWidth = 2;
  g.beginPath();
  for (let u = 0; u <= 1.001; u += .05) { const p = at(u); u ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
  g.stroke();
  const fw = Math.min(W / (n + 1.5), 64), fh = fw * 1.15;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${fw * .5}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  letters.forEach((ch, i) => {
    const p = at((i + 1) / (n + 1));
    g.fillStyle = CANDLE_COLORS[i % CANDLE_COLORS.length];
    g.beginPath(); g.moveTo(p.x - fw / 2, p.y); g.lineTo(p.x + fw / 2, p.y); g.lineTo(p.x, p.y + fh); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.fillText(ch, p.x, p.y + fh * .32);
  });
  return y0 + sag + fh;
}

function drawWallBalloon(g, x, y, r, color) {
  g.strokeStyle = 'rgb(150 100 80 / .5)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x, y + r * 1.1); g.quadraticCurveTo(x - r * .4, y + r * 2.2, x, y + r * 3.2); g.stroke();
  const grad = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.2);
  grad.addColorStop(0, '#fff'); grad.addColorStop(.3, color); grad.addColorStop(1, color);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(x, y, r * .9, r * 1.1, 0, 0, TAU); g.fill();
}

// mesa com toalha de bolinhas: fica na frente dos amigos, que espiam por trás
function buildTable() {
  const [c, g] = layer(W, H);
  g.fillStyle = '#fff';
  g.fillRect(0, tableY, W, H - tableY);
  g.fillStyle = 'rgb(255 140 170 / .25)';
  const step = Math.max(34, W / 10);
  for (let y = tableY + step * .5, row = 0; y < H; y += step, row++) {
    for (let x = (row % 2) * step / 2; x < W + step; x += step) { circle(g, x, y, step * .14); g.fill(); }
  }
  g.fillStyle = 'rgb(200 120 100 / .15)'; g.fillRect(0, tableY, W, 4);
  return c;
}

// ---------- etapas ----------
function later(s, delay) { pending = { stage: s, at: clock + delay }; setTray([]); }

function goTo(s) {
  stage = s; stageAt = saidAt = clock;
  if (s === 'assoprar') mic.start(); else mic.stop();
  if (STAGE_LINE[s]) say(...STAGE_LINE[s], true);
  if (['cobertura', 'enfeite', 'velas', 'acender', 'festa'].includes(s)) {
    launchStar(cake.x, cake.base - cake.lh * LAYERS);
    hopAll();
  }
  if (s === 'massa') setTray(Object.entries(FLAVORS).map(([k, f]) => ({ label: f.label, text: f.icon, color: f.side[0], pick: () => addLayer(k) })));
  else if (s === 'cobertura') setTray(Object.entries(ICINGS).map(([k, color]) => ({ label: ICING_NAMES[k], color, pick: () => pourIcing(k) })));
  else if (s === 'enfeite') setTray(TOPPINGS.map(e => ({ label: 'Enfeite', text: e, pick: b => chooseTopping(e, b) })));
  else if (s === 'velas') setTray([{ label: 'Velinha', text: '🕯️', pick: addCandle }]);
  else setTray([]);
  if (s === 'enfeite') tray.firstChild.classList.add('on');
  if (s === 'festa') { sfx.clap(8); later('comer', 4); }
  if (s === 'comer') { cake.candles = []; bake(); }
}

function setTray(items) {
  tray.replaceChildren(...items.map(({ label, text = '', color, pick: onPick }, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', label);
    b.style.setProperty('--i', i);
    if (color) b.style.setProperty('--c', color);
    b.addEventListener('click', () => {
      if (!started) return;
      sfx.resume();
      lastTap = clock;
      onPick(b);
    });
    return b;
  }));
  tray.classList.toggle('on', items.length > 0);
}

function newCake() {
  Object.assign(cake, { layers: [], icing: null, drips: [], toppings: [], candles: [], eaten: 0, baked: null, bakedG: null });
  goTo('massa');
}

function addLayer(k) {
  if (stage !== 'massa' || pending || cake.layers.length >= LAYERS) return;
  cake.layers.push({ flavor: k, born: clock });
  say(k, FLAVORS[k].label + '!');
  sfx.whoosh();
  setTimeout(() => { sfx.pop(); const b = layerBox(cake.layers.length - 1); burst(cake.x, b.y + b.h, cake.w * .2, FLAVORS[k].hue, 10); }, 380);
  if (cake.layers.length === LAYERS) { say('alto', 'Uau! Que bolo alto!', true); later('cobertura', 2.4); }
}

function pourIcing(k) {
  if (stage !== 'cobertura' || cake.icing) return;
  cake.icing = k; cake.icingAt = clock;
  cake.drips = cake.layers.map(() => Array.from({ length: 6 }, () => ({ u: rand(-.95, .95), len: rand(.2, .6) })));
  say(k, ICING_NAMES[k] + '!');
  sfx.splash();
  later('enfeite', 2.6);
}

function chooseTopping(e, b) {
  pickedTopping = e;
  for (const other of tray.children) other.classList.toggle('on', other === b);
  // tocar no botão também enfeita: bom pra quem ainda não sabe que é pra tocar no bolo
  const i = Math.random() * cake.layers.length | 0, box = layerBox(i);
  placeTopping(box.x + box.w * rand(.15, .85), box.y + box.h * rand(.25, .75), e);
}

function placeTopping(x, y, e) {
  if (stage !== 'enfeite' || cake.toppings.length >= MAX_TOPPINGS) return;
  lastPlace = clock;
  cake.toppings.push({ dx: (x - cake.x) / cake.w, dy: (y - cake.base) / cake.w, e, born: clock, rot: rand(-.4, .4), seed: Math.random() });
  sfx.bell(pick(PENTATONIC));
  burst(x, y, cake.w * .06, rand(0, 360), 5);
  if (cake.toppings.length === TOPPING_GOAL) { say('lindo', 'Que bolo lindo!'); later('velas', 2.4); }
}

function addCandle() {
  if (stage !== 'velas' || pending || cake.candles.length >= MAX_CANDLES) return;
  lastCandleAt = clock;
  cake.candles.push({ x: cake.x, born: clock, lit: false, out: false, color: CANDLE_COLORS[cake.candles.length] });
  const n = cake.candles.length;
  say('n' + n, NUMBERS[n - 1] + '!');
  sfx.bell(523.25 * 2 ** ([0, 2, 4, 5, 7][n - 1] / 12));
  if (n === MAX_CANDLES) later('acender', 1.4);
}

function updateLighting() {
  const n = cake.candles.length, k = Math.floor((clock - stageAt - .5) / .4) + 1;
  cake.candles.forEach((c, i) => {
    if (i < k && !c.lit) { c.lit = true; sfx.bell(784 * 2 ** (i * 2 / 12)); burst(c.fx ?? cake.x, c.fy ?? cake.base, cake.w * .05, 45, 6); }
  });
  if (clock - stageAt > .5 + n * .4 + .6) goTo('cantar');
}

function updateSinging() {
  if (!song && clock - stageAt > 1.9) {
    song = sfx.musicBox(BIRTHDAY, .42);
    songEndsAt = clock + .1 + song.duration;
  }
  if (song && Math.random() < frameDt * 3) {
    const f = pick(friends);
    notes.push({ x: f.x + rand(-f.s * .3, f.s * .3), y: f.y - f.s * .6, t: 0, e: pick(['🎵', '🎶']) });
  }
  if (song && clock > songEndsAt + .3) { song = null; goTo('assoprar'); }
}

function blowAt(x, y) {
  putOut(cake.candles.filter(c => !c.out && Math.hypot(x - c.fx, y - c.fy) < cake.w * .2));
}

function putOut(list) {
  if (stage !== 'assoprar' || !list.length) return;
  for (const c of list) {
    c.out = true;
    for (let i = 0; i < 6; i++) smoke.push({ x: c.fx, y: c.fy, t: -i * .08, vx: rand(-15, 15), r: cake.w * rand(.03, .05) });
  }
  sfx.whoosh();
  if (cake.candles.every(c => c.out)) goTo('festa');
}

// microfone: assoprar de verdade apaga as velinhas (tocar nas chamas continua valendo).
// Só fica ligado durante o "assoprar": no iPhone o microfone aberto muda o jeito do som sair.
const mic = {
  stream: null, analyser: null, buf: null, denied: false,
  async start() {
    if (this.stream || this.denied || !navigator.mediaDevices?.getUserMedia || !sfx.ctx) return;
    setSession('play-and-record');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      if (stage !== 'assoprar') { stream.getTracks().forEach(t => t.stop()); setSession('playback'); return; }
      this.stream = stream;
      this.analyser = sfx.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      sfx.ctx.createMediaStreamSource(stream).connect(this.analyser);
      this.buf = new Float32Array(this.analyser.fftSize);
      sfx.resume();
    } catch {
      this.denied = true;   // negou ou não tem microfone: fica só no toque, sem perguntar de novo
      setSession('playback');
    }
  },
  stop() {
    if (!this.stream) return;
    this.stream.getTracks().forEach(t => t.stop());
    this.stream = this.analyser = null;
    setSession('playback');
  },
  // volume (RMS) do que o microfone está ouvindo agora, 0..1
  level() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    return Math.sqrt(sum / this.buf.length);
  },
};
function setSession(type) { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch { /* iOS antigo */ } }

// sopro = barulho forte e contínuo; cada pedacinho de sopro apaga mais uma velinha
function updateBlowing(dt) {
  const lvl = clock - stageAt > MIC_GRACE ? mic.level() : 0;
  wind += (Math.min(lvl / BLOW_LEVEL, 1.5) - wind) * Math.min(dt * 12, 1);
  blowTime = lvl > BLOW_LEVEL ? blowTime + dt : Math.max(0, blowTime - dt * 2);
  if (blowTime > BLOW_HOLD && clock - lastBlowOut > .2) {
    lastBlowOut = clock;
    const lit = cake.candles.filter(c => !c.out);
    if (lit.length) putOut([pick(lit)]);
  }
}

function bite() {
  if (cake.eaten >= BITES || pending) return;
  cake.eaten++;
  eraseBites(cake.bakedG);
  const left = cake.x - cake.w / 2, cut = left + cake.w * (1 - cake.eaten / BITES), top = cake.layers[cake.layers.length - 1];
  burst(cut, cake.base - cake.lh, cake.w * .15, FLAVORS[top.flavor].hue, 14);
  sfx.gulp();
  if (cake.eaten === 1 || cake.eaten === 4) say('nham', 'Nham, nham! Que gostoso!');
  if (cake.eaten === BITES) { say('denovo', 'Acabou! Vamos fazer outro bolo?', true); hopAll(); later('massa-nova', 3); }
}

// ---------- amigos da festa ----------
function hopAll() { friends.forEach((f, i) => { f.hopAt = clock + i * .12; }); }

function tapFriend(x, y) {
  const f = friends.find(f => Math.hypot(x - f.x, y - f.y) < f.s * .55);
  if (!f) return false;
  f.hopAt = clock;
  sfx.giggle((f.x / W) * 2 - 1);
  burst(f.x, f.y - f.s * .3, f.s * .2, rand(0, 360), 6);
  return true;
}

function drawFriend(f, t) {
  const hop = Math.max(0, Math.sin(Math.min((clock - f.hopAt) / .45, 1) * Math.PI)) * f.s * .35;
  const sway = song ? Math.sin(t * Math.PI / .42 / 2 + f.x) * .15 : Math.sin(t * 1.5 + f.x) * .04;
  const size = Math.round(f.s / 4) * 4;
  ctx.save();
  ctx.translate(f.x, f.y - hop);
  ctx.rotate(sway);
  ctx.drawImage(emojiSprite(f.e, size), -size / 2, -size / 2, size, size);
  // chapeuzinho de festa
  const s = f.s;
  ctx.fillStyle = f.hat;
  ctx.beginPath(); ctx.moveTo(-s * .2, -s * .3); ctx.lineTo(s * .18, -s * .34); ctx.lineTo(s * .02, -s * .82); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .6)';
  ctx.beginPath(); ctx.moveTo(-s * .12, -s * .47); ctx.lineTo(s * .12, -s * .5); ctx.lineTo(s * .09, -s * .58); ctx.lineTo(-s * .08, -s * .56); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, s * .02, -s * .84, s * .06); ctx.fill();
  ctx.restore();
}

// ---------- bolo ----------
function layerBox(i) {
  const w = cake.w * (1 - i * .16);
  return { x: cake.x - w / 2, y: cake.base - (i + 1) * cake.lh, w, h: cake.lh };
}

function drawLayer(g, b, F) {
  const rx = b.w / 2, ry = b.w * .13, cx = b.x + rx;
  const side = g.createLinearGradient(b.x, 0, b.x + b.w, 0);
  side.addColorStop(0, F.side[1]); side.addColorStop(.3, F.side[0]); side.addColorStop(.7, F.side[0]); side.addColorStop(1, F.side[1]);
  g.fillStyle = side;
  g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x, b.y + b.h);
  g.ellipse(cx, b.y + b.h, rx, ry, 0, Math.PI, 0, true);
  g.lineTo(b.x + b.w, b.y); g.closePath(); g.fill();
  g.strokeStyle = 'rgb(255 255 255 / .7)'; g.lineWidth = b.h * .09;
  g.beginPath(); g.ellipse(cx, b.y + b.h * .55, rx, ry, 0, Math.PI, 0, true); g.stroke();
  g.fillStyle = F.top;
  g.beginPath(); g.ellipse(cx, b.y, rx, ry, 0, 0, TAU); g.fill();
}

// cobertura escorrendo: topo inteiro + pingos que crescem com f (0..1)
function drawIcing(g, b, color, drips, f) {
  const rx = b.w / 2 * 1.02, ry = b.w * .135, cx = b.x + b.w / 2, N = 48;
  g.globalAlpha = Math.min(f * 4, 1);
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(cx, b.y, rx, ry, 0, Math.PI, 0);
  for (let k = N; k >= 0; k--) {
    const u = k / N * 2 - 1;
    let d = b.h * .12;
    for (const dr of drips) { const du = Math.abs(u - dr.u); if (du < .14) d += (Math.cos(Math.PI * du / .14) + 1) / 2 * dr.len * b.h; }
    g.lineTo(cx + u * rx, b.y + ry * Math.sqrt(Math.max(0, 1 - u * u)) + d * Math.min(f, 1));
  }
  g.closePath(); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .35)';
  g.beginPath(); g.ellipse(cx - rx * .3, b.y - ry * .25, rx * .3, ry * .3, 0, 0, TAU); g.fill();
  g.globalAlpha = 1;
}

function drawTopping(g, tp) {
  const x = cake.x + tp.dx * cake.w, y = cake.base + tp.dy * cake.w;
  const k = easeOutBack(Math.min((clock - tp.born) / .3, 1)), ts = cake.w * .16 * k;
  if (ts <= 0) return;
  if (tp.e !== '✨') {
    const size = Math.round(cake.w * .16 / 4) * 4;
    g.save(); g.translate(x, y); g.rotate(tp.rot); g.scale(k, k);
    g.drawImage(emojiSprite(tp.e, size), -size / 2, -size / 2, size, size);
    g.restore();
    return;
  }
  for (let j = 0; j < 8; j++) {
    const a = tp.seed * TAU + j * 2.4, d = ts * .45 * ((j * 37 % 10) / 10 + .1);
    g.save(); g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); g.rotate(a * 1.7);
    g.fillStyle = SPRINKLE_COLORS[(j + tp.seed * 6 | 0) % SPRINKLE_COLORS.length];
    g.beginPath(); g.roundRect?.(-ts * .1, -ts * .03, ts * .2, ts * .06, ts * .03); g.fill();
    g.restore();
  }
}

function drawCake(g) {
  cake.layers.forEach((L, i) => {
    const e = Math.min((clock - L.born) / .45, 1), drop = (1 - easeOutBack(e)) * H * .6;
    const b = layerBox(i);
    b.y -= drop;
    drawLayer(g, b, FLAVORS[L.flavor]);
    if (cake.icing) {
      const f = (clock - cake.icingAt - (cake.layers.length - 1 - i) * .3) / 1.1;
      if (f > 0) drawIcing(g, b, ICINGS[cake.icing], cake.drips[i], f);
    }
  });
  for (const tp of cake.toppings) drawTopping(g, tp);
}

function drawStand() {
  const rx = cake.w * .62, ry = cake.w * .12, stem = tableY - cake.base;
  ctx.fillStyle = 'rgb(160 90 70 / .15)';
  ctx.beginPath(); ctx.ellipse(cake.x, tableY + 4, rx * .7, ry * .6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f4eee9';
  ctx.beginPath(); ctx.moveTo(cake.x - rx * .18, cake.base); ctx.lineTo(cake.x - rx * .3, tableY); ctx.lineTo(cake.x + rx * .3, tableY); ctx.lineTo(cake.x + rx * .18, cake.base); ctx.fill();
  if (stem > 0) { ctx.beginPath(); ctx.ellipse(cake.x, tableY, rx * .3, ry * .35, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(cake.x, cake.base, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e8ddd5'; ctx.lineWidth = 2; ctx.stroke();
}

// bolo pronto vira imagem: aí as mordidas apagam pedaços dela
function bake() {
  const [c, g] = layer(W, H);
  drawCake(g);
  cake.baked = c; cake.bakedG = g;
  if (cake.eaten) eraseBites(g);
}

function eraseBites(g) {
  const left = cake.x - cake.w / 2 - 6, span = cake.w + 12, cut = left + span * (1 - cake.eaten / BITES), r = cake.w * .08;
  const top = cake.base - cake.lh * LAYERS - cake.w * .3, bottom = cake.base + cake.w * .2;
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  g.fillRect(cut, top, W, bottom - top);
  for (let y = top, i = 0; y < bottom + r; y += r * 1.5, i++) { circle(g, cut - (i % 2) * r * .25, y, r); g.fill(); }
  g.restore();
}

function candleTop(i, n) {
  const top = layerBox(cake.layers.length - 1), spacing = Math.min(top.w * .78 / n, cake.w * .15);
  return { x: cake.x + (i - (n - 1) / 2) * spacing, y: top.y + top.w * .13 * (i % 2 ? -.25 : .2) };
}

function drawCandles() {
  const n = cake.candles.length, cw = cake.w * .05;
  cake.candles.forEach((c, i) => {
    const to = candleTop(i, n);
    c.x += (to.x - c.x) * Math.min(frameDt * 10, 1);
    const k = easeOutBack(Math.min((clock - c.born) / .35, 1)), ch = cake.w * .22 * k;
    if (ch <= 0) return;
    const x = c.x, base = to.y, topY = base - ch;
    ctx.save();
    ctx.beginPath(); ctx.roundRect?.(x - cw / 2, topY, cw, ch, cw * .3); ctx.fillStyle = c.color; ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgb(255 255 255 / .65)';
    for (let y = topY - cw; y < base; y += cw * 1.4) { ctx.beginPath(); ctx.moveTo(x - cw, y + cw * .8); ctx.lineTo(x + cw, y); ctx.lineTo(x + cw, y + cw * .45); ctx.lineTo(x - cw, y + cw * 1.25); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#5b4636'; ctx.lineWidth = Math.max(1.5, cw * .15);
    ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, topY - cw * .5); ctx.stroke();
    c.fx = x; c.fy = topY - cw * 1.3;
  });
}

function drawFlames(t) {
  const cw = cake.w * .05;
  cake.candles.forEach((c, i) => {
    if (!c.lit || c.out || c.fx === undefined) return;
    const fl = 1 + Math.sin(t * 19 + i) * .08 + Math.sin(t * 31 + i * 2) * .05, fh = cw * 2 * fl, fw = cw * .75;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(c.fx, c.fy, 0, c.fx, c.fy, cake.w * .7);
    glow.addColorStop(0, `rgb(255 190 90 / ${.35 * dark})`); glow.addColorStop(1, 'rgb(255 190 90 / 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(c.fx - cake.w * .7, c.fy - cake.w * .7, cake.w * 1.4, cake.w * 1.4);
    ctx.restore();
    const g = ctx.createRadialGradient(c.fx, c.fy + fh * .25, 0, c.fx, c.fy, fh);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(.4, '#ffd23c'); g.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = g;
    ctx.beginPath();
    const lean = wind * fh * (.5 + Math.sin(t * 40 + i) * .15);   // a chama deita com o sopro
    ctx.moveTo(c.fx + lean, c.fy - fh * .75 + Math.sin(t * 13 + i) * cw * .15);
    ctx.quadraticCurveTo(c.fx + fw, c.fy, c.fx, c.fy + fh * .3);
    ctx.quadraticCurveTo(c.fx - fw, c.fy, c.fx + lean, c.fy - fh * .75 + Math.sin(t * 13 + i) * cw * .15);
    ctx.fill();
  });
}

function hitCake(x, y) {
  return cake.layers.some((_, i) => {
    const b = layerBox(i), ry = b.w * .13;
    return x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - ry - 20 && y < b.y + b.h + ry;
  });
}

// ---------- toques ----------
function onTap(x, y) {
  if (tapFriend(x, y)) return;
  if (stage === 'enfeite' && hitCake(x, y)) return placeTopping(x, y, pickedTopping);
  if (stage === 'velas' && hitCake(x, y)) return addCandle();
  if (stage === 'assoprar') return blowAt(x, y);
  if (stage === 'comer') return bite();
  if (stage === 'cantar') { burst(x, y, R * .25, rand(0, 360), 6); return; }
  sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
}

function onMove(x, y) {
  if (stage === 'assoprar') blowAt(x, y);
  else if (stage === 'enfeite' && clock - lastPlace > .2 && hitCake(x, y)) placeTopping(x, y, pickedTopping);
}

// ---------- ajuda: mãozinha e fala repetida ----------
function hintTarget() {
  if (stage === 'enfeite' || stage === 'velas' || stage === 'comer') return { x: cake.x, y: cake.base - cake.lh * 1.5 };
  if (stage === 'assoprar') { const c = cake.candles.find(c => !c.out); return c && { x: c.fx, y: c.fy }; }
  return null;
}

function updateHelp() {
  if (pending || !started) return;
  const idle = clock - Math.max(stageAt, lastTap);
  if (STAGE_LINE[stage] && idle > REPEAT_AFTER && clock - saidAt > REPEAT_AFTER) { saidAt = clock; say(...STAGE_LINE[stage]); }
  const trayHint = idle > HINT_AFTER && (stage === 'massa' || stage === 'cobertura');
  tray.firstChild?.classList.toggle('hint', trayHint);
}

function drawHint(t) {
  if (pending || clock - Math.max(stageAt, lastTap) < HINT_AFTER) return;
  const p = hintTarget();
  if (!p) return;
  const size = Math.round(R * .7 / 4) * 4, bob = Math.abs(Math.sin(t * 4)) * size * .25;
  ctx.drawImage(emojiSprite('👆', size), p.x - size * .4, p.y + size * .3 + bob, size, size);
}

// ---------- fumacinha e notas ----------
function drawSmokeAndNotes(dt) {
  for (const s of smoke) { s.t += dt; s.x += s.vx * dt; s.y -= 40 * dt; }
  smoke = smoke.filter(s => s.t < 1.4);
  for (const s of smoke) {
    if (s.t < 0) continue;
    ctx.fillStyle = `rgb(200 200 210 / ${.5 * (1 - s.t / 1.4)})`;
    circle(ctx, s.x, s.y, s.r * (1 + s.t * 1.5)); ctx.fill();
  }
  for (const n of notes) { n.t += dt; n.y -= 50 * dt; n.x += Math.sin(n.t * 4) * 20 * dt; }
  notes = notes.filter(n => n.t < 1.6);
  const size = Math.round(R * .4 / 4) * 4;
  for (const n of notes) {
    ctx.globalAlpha = 1 - n.t / 1.6;
    ctx.drawImage(emojiSprite(n.e, size), n.x - size / 2, n.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  tableY = H * .76;
  cake.w = Math.min(W * .56, H * .42, 340);
  cake.lh = cake.w * .26;
  cake.x = W / 2;
  cake.base = tableY - cake.w * .12;
  const s = Math.min(W * .21, H * .16, 110);
  const spots = W > H ? [[.1, '🐶'], [.26, '🐱'], [.74, '🐻'], [.9, '🐰']] : [[.11, '🐶'], [.89, '🐰']];
  friends = spots.map(([u, e], i) => ({ x: W * u, y: tableY - s * .4, s, e, hat: CANDLE_COLORS[(i * 2) % CANDLE_COLORS.length], hopAt: -9 }));
  wall = buildWall();
  table = buildTable();
  if (cake.baked) bake();
}

function update(dt) {
  frameDt = dt;
  if (pending && clock >= pending.at) {
    const s = pending.stage;
    pending = null;
    if (s === 'massa-nova') newCake(); else goTo(s);
  }
  if (stage === 'velas' && !pending && cake.candles.length && clock - lastCandleAt > CANDLE_WAIT) later('acender', 0);
  else if (stage === 'acender') updateLighting();
  else if (stage === 'cantar') updateSinging();
  else if (stage === 'assoprar') updateBlowing(dt);
  if (stage !== 'assoprar') wind = 0;
  const night = stage === 'acender' || stage === 'cantar' || stage === 'assoprar';
  dark += ((night ? 1 : 0) - dark) * Math.min(dt * 2, 1);
  updateHelp();
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(wall, 0, 0, W, H);
  for (const f of friends) drawFriend(f, t);
  ctx.drawImage(table, 0, 0, W, H);
  drawStand();
  if (cake.baked) ctx.drawImage(cake.baked, 0, 0, W, H);
  else drawCake(ctx);
  drawCandles();
  if (dark > .01) { ctx.fillStyle = `rgb(30 20 70 / ${.6 * dark})`; ctx.fillRect(0, 0, W, H); }
  drawFlames(t);
  drawSmokeAndNotes(frameDt);
  drawHint(t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap, onMove,
  onStart: () => {
    say('vamos', 'Vamos fazer um bolo de aniversário?');
    goTo('massa');
  },
});
