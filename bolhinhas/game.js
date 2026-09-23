'use strict';

// ---------- conteúdo ----------
// [emoji, arquivo em voz/, texto (usado só se o áudio falhar)]
const ANIMALS = [
  ['🐶', 'cachorro', 'O cachorrinho! Au, au!'], ['🐱', 'gato', 'O gatinho! Miau!'],
  ['🐮', 'vaca', 'A vaquinha! Muuu!'], ['🐷', 'porco', 'O porquinho! Óinc, óinc!'],
  ['🐸', 'sapo', 'O sapinho! Croac, croac!'], ['🦁', 'leao', 'O leão! Roaaar!'],
  ['🐵', 'macaco', 'O macaquinho! Uh, uh, ah, ah!'], ['🐰', 'coelho', 'O coelhinho! Pula, pula!'],
  ['🐔', 'galinha', 'A galinha! Có, có, có!'], ['🦆', 'pato', 'O patinho! Quá, quá!'],
  ['🐘', 'elefante', 'O elefante! Que grandão!'], ['🐴', 'cavalo', 'O cavalinho! Iiirrí!'],
  ['🐑', 'ovelha', 'A ovelhinha! Méé!'], ['🐟', 'peixe', 'O peixinho! Glub, glub!'],
  ['🐻', 'urso', 'O ursinho! Que fofinho!'], ['🐯', 'tigre', 'O tigre! Roaaar!'],
  ['🦒', 'girafa', 'A girafa! Que pescoção!'], ['🐢', 'tartaruga', 'A tartaruga! Devagarinho!'],
];
const LINES = ['vamos', 'muito-bem', ...ANIMALS.map(a => a[1])];
// baixa as falas já no carregamento; decodifica quando o áudio for liberado pelo toque
const voiceFiles = new Map(LINES.map(n => [n, fetch(`voz/${n}.mp3`).then(r => {
  if (!r.ok) throw new Error(n);
  return r.arrayBuffer();
})]));
voiceFiles.forEach(p => p.catch(() => {}));

// ---------- ajustes ----------
const MAX_BUBBLES = 6;
const CELEBRATE_EVERY = 10;
const RISE_SPEED = 0.1;       // fração da altura da tela por segundo
const HIT_SLOP = 1.25;        // área de toque maior que a bolha: dedinho não é preciso
const HUES = 12;
const FREED_LIFE = 1.4;
const HINT_AFTER = 5;         // segundos sem tocar até a mãozinha aparecer
const FLY_TIME = .7;          // estrela voando da bolha até o medidor
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];   // cada estrela toca a próxima nota da escala
const RING_LIFE = 0.35;
const MAX_PARTICLES = 400;
const TAU = Math.PI * 2;
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
const RAINBOW = ['#ff4d4d', '#ff9f1c', '#ffe03a', '#5ad16e', '#3fa9ff', '#8a6cff'];
const RAINBOW_LIFE = 3.2;
const CONFETTI_COLORS = ['#ff5fa8', '#ffc930', '#5ad16e', '#4fb4ff', '#b77cff', '#ff8a3d'];

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W, H, R, DPR, SPR;        // SPR = raio de referência dos sprites
let scene;
let bubbleSprites = [];
const emojiSprites = new Map();
let bubbles = [], particles = [], freed = [], rings = [], confetti = [];
let lit = 0, flyers = [], slotBorn = [], started = false, clock = 0, fullAt = 0, rainbowAt = -99, lastTap = 0;

const pick = a => a[Math.random() * a.length | 0];
const rand = (a, b) => a + Math.random() * (b - a);
const easeOutBack = x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

// canvas fora da tela, já na densidade do aparelho; desenhar nele uma vez e só copiar por frame
function layer(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
  c.w = w; c.h = h;
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  return [c, g];
}

function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }

function star(g, x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}

// ---------- cenário ----------
function hill(g, base, amp, colors, freq, phase) {
  const y = x => base + Math.sin(x / W * TAU * freq + phase) * amp;
  const grad = g.createLinearGradient(0, base - amp, 0, H);
  grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, y(x));
  g.lineTo(W, H); g.fillStyle = grad; g.fill();
  g.beginPath();
  for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, y(x) + 2);
  g.lineWidth = 3; g.strokeStyle = 'rgb(255 255 255 / .35)'; g.stroke();
  return y;
}

function flowers(g, surface) {
  const n = Math.round(W / 40), s = Math.min(W, H) * 0.014;
  for (let i = 0; i < n; i++) {
    const x = (i + Math.random()) * W / n, y = surface(x) + rand(s * 3, H - surface(x) - s * 2);
    g.fillStyle = pick(['#fff', '#ffe2f0', '#fff3a8']);
    for (let p = 0; p < 5; p++) circle(g, x + Math.cos(p * TAU / 5) * s, y + Math.sin(p * TAU / 5) * s, s * 0.75), g.fill();
    g.fillStyle = '#ffb020'; circle(g, x, y, s * 0.6); g.fill();
  }
}

function buildSun(r) {
  const s = r * 1.9, [c, g] = layer(s * 2, s * 2);
  g.translate(s, s);
  const glow = g.createRadialGradient(0, 0, r * 0.8, 0, 0, s);
  glow.addColorStop(0, 'rgb(255 240 150 / .7)'); glow.addColorStop(1, 'rgb(255 240 150 / 0)');
  g.fillStyle = glow; g.fillRect(-s, -s, s * 2, s * 2);
  const disk = g.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r);
  disk.addColorStop(0, '#fff8b8'); disk.addColorStop(1, '#ffc727');
  g.fillStyle = disk; circle(g, 0, 0, r); g.fill();
  g.fillStyle = 'rgb(255 110 110 / .45)';
  circle(g, -r * .52, r * .2, r * .14); g.fill();
  circle(g, r * .52, r * .2, r * .14); g.fill();
  g.fillStyle = '#7a4a00';
  g.beginPath(); g.ellipse(-r * .3, -r * .12, r * .08, r * .12, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(r * .3, -r * .12, r * .08, r * .12, 0, 0, TAU); g.fill();
  g.lineWidth = r * .08; g.lineCap = 'round'; g.strokeStyle = '#7a4a00';
  g.beginPath(); g.arc(0, r * .1, r * .32, .18 * Math.PI, .82 * Math.PI); g.stroke();
  return c;
}

function buildRays(r) {
  const s = r * 1.9, [c, g] = layer(s * 2, s * 2);
  g.translate(s, s);
  g.lineCap = 'round'; g.strokeStyle = 'rgb(255 210 60 / .9)'; g.lineWidth = r * .15;
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12, len = i % 2 ? 1.42 : 1.6;
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
    g.lineTo(Math.cos(a) * r * len, Math.sin(a) * r * len);
    g.stroke();
  }
  return c;
}

const PUFFS = [[.22, .40, .16], [.42, .30, .22], [.64, .36, .18], [.80, .44, .13], [.50, .44, .16]];
function buildCloud(w) {
  const [c, g] = layer(w, w * .64);
  g.fillStyle = '#d3e9fc';
  for (const [x, y, r] of PUFFS) { circle(g, x * w, (y + .03) * w, r * w); g.fill(); }
  g.fillStyle = '#fff';
  for (const [x, y, r] of PUFFS) { circle(g, x * w, y * w, r * w); g.fill(); }
  return c;
}

function buildScene() {
  // céu e morros em camadas separadas: o arco-íris nasce atrás dos morros
  const [bg, sg] = layer(W, H), [hills, g] = layer(W, H);
  const sky = sg.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#5ab8ff'); sky.addColorStop(.55, '#aee0ff'); sky.addColorStop(1, '#fff1c9');
  sg.fillStyle = sky; sg.fillRect(0, 0, W, H);
  hill(g, H * .80, H * .035, ['#b5ec8c', '#86d063'], 1.2, .6);
  flowers(g, hill(g, H * .87, H * .03, ['#7fd35a', '#4caf3c'], .8, 2.4));

  const m = Math.min(W, H), sunR = Math.min(m * .09, 64);
  scene = {
    bg, hills, sunR, sunX: W - sunR * 1.15, sunY: sunR * 1.35,
    sun: buildSun(sunR), rays: buildRays(sunR),
    clouds: Array.from({ length: 4 }, (_, i) => {
      const depth = rand(.55, 1), sprite = buildCloud(m * .55 * depth);
      return { sprite, x: rand(-sprite.w, W), y: H * (.06 + i * .1) + rand(0, H * .05), speed: 14 * depth, alpha: .55 + .45 * depth };
    }),
  };
}

// ---------- bolha e bichinho ----------
function buildBubble(hue) {
  const s = SPR, half = s * 1.04, [c, g] = layer(half * 2, half * 2);
  g.translate(half, half);
  const body = g.createRadialGradient(0, 0, 0, 0, 0, s);
  body.addColorStop(0, `hsl(${hue} 100% 90% / .05)`);
  body.addColorStop(.72, `hsl(${hue} 100% 82% / .12)`);
  body.addColorStop(.93, `hsl(${hue} 100% 68% / .5)`);
  body.addColorStop(1, `hsl(${hue} 100% 96% / .95)`);
  g.fillStyle = body; circle(g, 0, 0, s); g.fill();

  if (g.createConicGradient) {   // brilho de arco-íris na borda, como bolha de sabão
    const con = g.createConicGradient(0, 0, 0);
    [0, 70, 150, 230, 300, 360].forEach((d, i, a) => con.addColorStop(i / (a.length - 1), `hsl(${hue + d} 100% 72% / .5)`));
    g.lineWidth = s * .09; g.strokeStyle = con;
    circle(g, 0, 0, s * .945); g.stroke();
  }
  g.lineWidth = Math.max(1.5, s * .025); g.strokeStyle = 'rgb(255 255 255 / .9)';
  circle(g, 0, 0, s * .985); g.stroke();

  g.lineCap = 'round';
  g.lineWidth = s * .09; g.strokeStyle = 'rgb(255 255 255 / .8)';
  g.beginPath(); g.arc(0, 0, s * .76, 1.1 * Math.PI, 1.38 * Math.PI); g.stroke();
  g.fillStyle = 'rgb(255 255 255 / .95)';
  circle(g, s * -.18, s * -.72, s * .055); g.fill();
  g.lineWidth = s * .045; g.strokeStyle = 'rgb(255 255 255 / .4)';
  g.beginPath(); g.arc(0, 0, s * .8, .12 * Math.PI, .38 * Math.PI); g.stroke();
  c.half = half;
  return c;
}

function emojiSprite(e) {
  let c = emojiSprites.get(e);
  if (c) return c;
  const size = SPR * 1.66;   // bicho ocupa ~65% da bolha
  let g;
  [c, g] = layer(size, size);
  g.font = `${size * .78}px ${EMOJI_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
  g.shadowColor = 'rgb(20 40 90 / .25)'; g.shadowBlur = size * .05; g.shadowOffsetY = size * .025;
  g.fillText(e, size / 2, size * .54);
  emojiSprites.set(e, c);
  return c;
}

function resize() {
  const oldR = R, oldW = W, oldH = H;
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  R = Math.min(Math.min(W, H) * .15, 120);
  SPR = R * 1.15;
  if (oldR) for (const b of bubbles) {
    b.r *= R / oldR; b.sway *= R / oldR; b.baseX *= W / oldW; b.y *= H / oldH;
  }
  buildScene();
  bubbleSprites = Array.from({ length: HUES }, (_, i) => buildBubble(i * 360 / HUES));
  emojiSprites.clear();
  for (const [e] of ANIMALS) emojiSprite(e);
}

// ---------- som ----------
const sfx = (() => {
  let ac, out, noise, voiceOut, ambientOut, voiceSrc = null, voiceEnd = 0, voiceTurn = 0;
  const decoded = new Map();
  function env(node, t, peak, dur, attack = .005) {
    const g = ac.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    node.connect(g).connect(out);
  }
  function osc(type, f0, f1, t, dur, peak) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6);
    env(o, t, peak, dur);
    o.start(t); o.stop(t + dur + .02);
  }
  const s = {
    init() {
      // iPhone: sem isso o som some quando a chave lateral está no silencioso
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ac.createDynamicsCompressor();
      out = ac.createGain(); out.gain.value = .9;
      out.connect(comp).connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * .1, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      voiceOut = ac.createGain(); voiceOut.gain.value = 1.1; voiceOut.connect(comp);
      ambientOut = ac.createGain(); ambientOut.gain.value = .0001; ambientOut.connect(out);
    },
    speak(line, queue) {
      if (!ac || !voiceFiles.has(line)) return Promise.reject(new Error('sem áudio'));
      if (!decoded.has(line)) decoded.set(line, voiceFiles.get(line).then(b => ac.decodeAudioData(b)));
      const turn = queue ? voiceTurn : ++voiceTurn;
      return decoded.get(line).then(buf => {
        if (turn !== voiceTurn) return;   // outra fala mais nova já pediu a vez
        const t = ac.currentTime;
        if (!queue) { try { voiceSrc?.stop(); } catch { /* já tinha parado */ } }
        const at = queue ? Math.max(t, voiceEnd) : t;
        voiceSrc = ac.createBufferSource();
        voiceSrc.buffer = buf; voiceSrc.connect(voiceOut); voiceSrc.start(at);
        voiceEnd = at + buf.duration;
      });
    },
    // brisa: ruído bem grave e baixinho que respira devagar
    startAmbient() {
      const wind = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
      const len = ac.sampleRate * 6, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const fade = ac.sampleRate * .3;   // pontas suaves: sem "tec" quando o loop recomeça
      for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[len - 1 - i] *= i / fade; }
      wind.buffer = buf; wind.loop = true;
      lp.type = 'lowpass'; lp.frequency.value = 420;
      g.gain.value = .05;
      const lfo = ac.createOscillator(), depth = ac.createGain();
      lfo.frequency.value = .07; depth.gain.value = .035;
      lfo.connect(depth).connect(g.gain);
      wind.connect(lp).connect(g).connect(ambientOut);
      wind.start(); lfo.start();
      ambientOut.gain.setTargetAtTime(1, ac.currentTime, 1.5);   // entra devagar
    },
    // passarinho: 2 a 4 piados curtos, do lado da tela onde ele está
    chirp(pan = rand(-.8, .8)) {
      if (!ac) return;
      const p = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
      if (p.pan) p.pan.value = pan;
      p.connect(ambientOut);
      const base = rand(2600, 3800), n = 2 + (Math.random() * 3 | 0);
      let t = ac.currentTime + .05;
      for (let i = 0; i < n; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), up = Math.random() < .5;
        o.frequency.setValueAtTime(base * (up ? .8 : 1.15), t);
        o.frequency.exponentialRampToValueAtTime(base * (up ? 1.2 : .85), t + .07);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.05, t + .012);
        g.gain.exponentialRampToValueAtTime(.0001, t + .09);
        o.connect(g).connect(p);
        o.start(t); o.stop(t + .1);
        t += rand(.11, .17);
      }
    },
    // sininho de vento: 2 ou 3 notas agudas e bem baixinhas
    chime() {
      if (!ac) return;
      const t = ac.currentTime;
      for (let i = 0, n = 2 + (Math.random() * 2 | 0); i < n; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), at = t + i * rand(.25, .45);
        o.frequency.value = pick(PENTATONIC) * 2;
        g.gain.setValueAtTime(.0001, at);
        g.gain.exponentialRampToValueAtTime(.018, at + .01);
        g.gain.exponentialRampToValueAtTime(.0001, at + 2.2);
        o.connect(g).connect(ambientOut);
        o.start(at); o.stop(at + 2.3);
      }
    },
    resume() { if (ac && ac.state !== 'running') ac.resume(); },
    suspend() { ac?.suspend(); },
    pop() {
      if (!ac) return;
      const t = ac.currentTime, f = rand(330, 480);
      osc('sine', f, f * 3.2, t, .14, .5);
      const n = ac.createBufferSource(), bp = ac.createBiquadFilter();
      n.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .8;
      n.connect(bp); env(bp, t, .3, .05, .001);
      n.start(t); n.stop(t + .08);
    },
    bell(f = pick(PENTATONIC)) {
      if (!ac) return;
      const t = ac.currentTime;
      osc('sine', f, 0, t, .9, .2);
      osc('sine', f * 2, 0, t, .45, .06);
      osc('triangle', f * 3, 0, t, .15, .03);
    },
    fanfare() {
      [0, 4, 7, 12, 16].forEach((semi, i) => setTimeout(() => s.bell(523.25 * 2 ** (semi / 12)), i * 110));
    },
  };
  return s;
})();

function say(line, text, queue = false) {
  sfx.speak(line, queue).catch(() => sayRobot(text, queue));
}

// plano B: voz do sistema, se o áudio gravado não carregar
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'pt-BR') || vs.find(v => v.lang.startsWith('pt')) || null;
}
function sayRobot(text, queue) {
  if (!('speechSynthesis' in window)) return;
  if (!queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR'; u.rate = .9; u.pitch = 1.3;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

// ---------- jogo ----------
function spawn() {
  const pool = ANIMALS.filter(([e]) => !bubbles.some(b => b.emoji === e));
  const [emoji, voz, name] = pick(pool);
  const r = R * rand(.9, 1.1), sway = R * .2;
  const lo = r + sway, hi = W - r - sway;
  // sorteia posições e fica com a mais longe das bolhas que já estão subindo
  const gap = x => Math.min(Infinity, ...bubbles.map(b => Math.hypot(x - b.x, H - b.y)));
  const x = hi <= lo ? W / 2 : Array.from({ length: 6 }, () => rand(lo, hi)).reduce((a, c) => gap(c) > gap(a) ? c : a);
  bubbles.push({ baseX: x, x, y: H + r, r, sway, hue: Math.random() * HUES | 0, phase: rand(0, TAU), emoji, voz, name });
}

function addParticle(p) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(p);
}

function burst(x, y, r, hue, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = r * rand(2, 4.5), isStar = i % 3 === 0;
    addParticle({
      x: x + Math.cos(a) * r * .8, y: y + Math.sin(a) * r * .8,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - r,
      life: 1, decay: rand(1.2, 1.8), size: r * (isStar ? rand(.1, .16) : rand(.04, .08)),
      color: isStar ? `hsl(${hue + rand(-40, 40)} 100% 62%)` : `hsl(${hue} 100% 78%)`,
      star: isStar, rot: rand(0, TAU), vr: rand(-6, 6),
    });
  }
}

function popBubble(b) {
  sfx.pop();
  navigator.vibrate?.(15);
  rings.push({ x: b.x, y: b.y, r: b.r, t: 0 });
  burst(b.x, b.y, b.r, b.hue * 360 / HUES, 22);
  freed.push({ x: Math.min(Math.max(b.x, b.r * 1.3), W - b.r * 1.3), y: b.y, r: b.r, emoji: b.emoji, t: 0 });
  flyers.push({ x0: b.x, y0: b.y, t: 0, dir: b.x < W / 2 ? 1 : -1 });
  say(b.voz, b.name);
}

function tapSky(x, y) {
  sfx.bell();
  rings.push({ x, y, r: R * .35, t: 0 });
  burst(x, y, R * .3, rand(0, 360), 7);
}

function celebrate() {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  rainbowAt = clock;
  say('muito-bem', 'Muito bem! Parabéns!', true);

  for (let i = 0; i < 140; i++) {
    confetti.push({
      x: rand(0, W), y: rand(-H * .5, -10), vy: rand(H * .25, H * .45), phase: rand(0, TAU),
      w: rand(10, 18), h: rand(7, 11), rot: rand(0, TAU), vr: rand(-5, 5), color: pick(CONFETTI_COLORS),
    });
  }
}

function hit(x, y) {
  let best = -1, bestD = Infinity;
  bubbles.forEach((b, i) => {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d < b.r * HIT_SLOP && d < bestD) { best = i; bestD = d; }
  });
  const bird = birds.find(b => Math.hypot(x - b.x, y - b.y) < b.s * 2.4);
  if (best < 0 && bird) {
    sfx.chirp(bird.x / W * 2 - 1);
    burst(bird.x, bird.y, bird.s, 50, 8);
    return;
  }
  if (best < 0) return tapSky(x, y);
  popBubble(bubbles.splice(best, 1)[0]);
}

// ---------- vida no céu: passarinhos, piados e sininhos de vez em quando ----------
const BIRD_COLORS = [['#4fb4ff', '#2b8ae0'], ['#ff8fb8', '#ee5c96'], ['#ffd23f', '#eea600']];
let birds = [];

function scheduleAmbient() {
  setTimeout(() => {
    if (!document.hidden) {
      const r = Math.random();
      if (r < .45) spawnBird();
      else if (r < .8) sfx.chirp();
      else sfx.chime();
    }
    scheduleAmbient();
  }, rand(4000, 9000));
}

function spawnBird() {
  const dir = Math.random() < .5 ? 1 : -1, s = R * rand(.3, .38), [body, wing] = pick(BIRD_COLORS);
  birds.push({ x: dir > 0 ? -s * 2 : W + s * 2, y: H * rand(.14, .45), dir, s, body, wing,
    speed: W * rand(.08, .12), phase: rand(0, TAU), sang: false });
}

function updateBirds(dt) {
  for (const b of birds) {
    b.x += b.dir * b.speed * dt;
    const into = b.dir > 0 ? b.x / W : 1 - b.x / W;
    if (!b.sang && into > .3) { b.sang = true; sfx.chirp(b.x / W * 2 - 1); }
  }
  birds = birds.filter(b => b.x > -b.s * 3 && b.x < W + b.s * 3);
}

function drawBird(b, t) {
  const s = b.s, flap = Math.sin(t * 10 + b.phase);
  ctx.save();
  ctx.translate(b.x, b.y + Math.sin(t * 3 + b.phase) * s * .4);
  ctx.scale(b.dir, 1);
  ctx.fillStyle = b.body;
  ctx.beginPath(); ctx.moveTo(-s * .7, -s * .1); ctx.lineTo(-s * 1.45, -s * .55); ctx.lineTo(-s * 1.35, s * .25); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * .8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .55)';
  ctx.beginPath(); ctx.ellipse(s * .15, s * .32, s * .55, s * .34, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffa41b';
  ctx.beginPath(); ctx.moveTo(s * .88, -s * .12); ctx.lineTo(s * 1.35, s * .04); ctx.lineTo(s * .88, s * .22); ctx.fill();
  ctx.fillStyle = '#2b2140'; circle(ctx, s * .45, -s * .24, s * .13); ctx.fill();
  ctx.fillStyle = '#fff'; circle(ctx, s * .5, -s * .29, s * .05); ctx.fill();
  ctx.fillStyle = b.wing;
  ctx.translate(-s * .1, -s * .1); ctx.rotate(-.35 - flap * .8);
  ctx.beginPath(); ctx.ellipse(-s * .4, 0, s * .62, s * .3, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------- medidor de estrelas ----------
function slotPos(i) {
  // cabe entre a casinha (esq.) e o sol (dir.)
  const gap = Math.min(26, (W - 176) / (CELEBRATE_EVERY + .5));
  return { x: W / 2 - 4 + (i - (CELEBRATE_EVERY - 1) / 2) * gap, y: meterY, gap };
}
let meterY = 40;
function measureMeter() {
  const r = home.getBoundingClientRect();
  meterY = r.top + r.height / 2;
}

function emptyMeter() {
  for (let i = 0; i < CELEBRATE_EVERY; i++) { const p = slotPos(i); burst(p.x, p.y, R * .25, 45, 5); }
  lit = 0;
}

function updateFlyers(dt) {
  flyers.forEach((f, i) => {
    f.t += dt;
    const p = Math.min(f.t / FLY_TIME, 1), e = p * p * (3 - 2 * p);
    const to = slotPos((lit + i) % CELEBRATE_EVERY);
    f.x = f.x0 + (to.x - f.x0) * e + Math.sin(p * Math.PI) * R * .8 * f.dir;
    f.y = f.y0 + (to.y - f.y0) * e;
    if (Math.random() < .6) addParticle({
      x: f.x, y: f.y, vx: rand(-20, 20), vy: rand(-20, 20), life: .6, decay: 2.2,
      size: rand(2, 4), color: '#fff6b0', star: false, rot: 0, vr: 0,
    });
  });
  // medidor cheio fica brilhando um pouco antes de esvaziar
  if (lit >= CELEBRATE_EVERY && clock - fullAt > 1.6) emptyMeter();
  while (flyers.length && flyers[0].t >= FLY_TIME) {
    flyers.shift();
    if (lit >= CELEBRATE_EVERY) emptyMeter();
    sfx.bell(523.25 * 2 ** (MAJOR[lit] / 12));
    slotBorn[lit] = clock;
    lit++;
    if (lit === CELEBRATE_EVERY) { fullAt = clock; celebrate(); }
  }
}

function drawMeter() {
  const first = slotPos(0), w = first.gap * CELEBRATE_EVERY + 12, h = Math.max(36, first.gap * 1.5);
  ctx.fillStyle = 'rgb(255 255 255 / .28)';
  ctx.strokeStyle = 'rgb(255 255 255 / .7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect?.(first.x - first.gap / 2 - 6, meterY - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < CELEBRATE_EVERY; i++) {
    const { x, y, gap } = slotPos(i);
    if (i < lit) {
      const wave = lit >= CELEBRATE_EVERY ? 1 + .25 * Math.sin(clock * 12 - i * .7) : 1;
      const k = easeOutBack(Math.min((clock - slotBorn[i]) / .3, 1)), r = gap * .5 * k * wave;
      ctx.fillStyle = '#e08c00'; star(ctx, x, y + 1.5, r, -Math.PI / 2);
      ctx.fillStyle = '#ffd23f'; star(ctx, x, y, r, -Math.PI / 2);
    } else {
      ctx.fillStyle = 'rgb(255 255 255 / .75)'; circle(ctx, x, y, gap * .16); ctx.fill();
    }
  }
  for (const f of flyers) {
    ctx.fillStyle = '#ffd23f'; star(ctx, f.x, f.y, 13, f.t * 8);
  }
}

// ---------- loop ----------
function update(dt, t) {
  for (const c of scene.clouds) {
    c.x += c.speed * dt;
    if (c.x > W) c.x = -c.sprite.w;
  }

  if (bubbles.length < MAX_BUBBLES && bubbles.every(b => b.y < H - R * .5)) spawn();
  for (const b of bubbles) {
    b.y -= H * RISE_SPEED * dt;
    b.x = b.baseX + Math.sin(t * .9 + b.phase) * b.sway;
  }
  bubbles = bubbles.filter(b => b.y > -b.r * 1.2);

  for (const r of rings) r.t += dt;
  rings = rings.filter(r => r.t < RING_LIFE);
  updateFlyers(dt);
  updateBirds(dt);
  for (const f of freed) f.t += dt;
  freed = freed.filter(f => f.t < FREED_LIFE);

  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += R * 6 * dt;
    p.rot += p.vr * dt; p.life -= p.decay * dt;
  }
  particles = particles.filter(p => p.life > 0);

  for (const c of confetti) {
    c.y += c.vy * dt; c.x += Math.sin(t * 3 + c.phase) * 40 * dt; c.rot += c.vr * dt;
  }
  confetti = confetti.filter(c => c.y < H + 20);
}

function drawBubble(b, t) {
  const k = b.r / SPR, sq = Math.sin(t * 2.4 + b.phase) * .035;
  const e = emojiSprite(b.emoji), es = e.w * k;
  const s = bubbleSprites[b.hue], bs = s.half * k;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(1 + sq, 1 - sq);
  ctx.rotate(Math.sin(t * 1.3 + b.phase) * .12);
  ctx.drawImage(e, -es / 2, -es / 2, es, es);
  ctx.drawImage(s, -bs, -bs, bs * 2, bs * 2);
  ctx.restore();
}

function drawRainbow() {
  const age = clock - rainbowAt;
  if (age > RAINBOW_LIFE) return;
  const reveal = Math.min(age / 1.1, 1), e = 1 - (1 - reveal) ** 3;
  const band = Math.min(W, H) * .045, r0 = Math.min(W * .62, H * .55);
  ctx.globalAlpha = age > RAINBOW_LIFE - .7 ? (RAINBOW_LIFE - age) / .7 : .9;
  ctx.lineWidth = band + 1;
  RAINBOW.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(W / 2, H * .82, r0 - i * band, Math.PI, Math.PI + Math.PI * e);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// mãozinha mostrando o que fazer quando a criança fica um tempo sem tocar
function drawHint() {
  const idle = clock - lastTap - HINT_AFTER;
  if (idle < 0) return;
  const b = bubbles.find(b => b.y < H * .75 && b.y > H * .25);
  if (!b) return;
  const hand = emojiSprite('👆'), size = hand.w * .7;
  const tap = Math.abs(Math.sin(clock * 4)) * b.r * .25;
  ctx.globalAlpha = Math.min(idle * 2, 1);
  ctx.drawImage(hand, b.x - size * .38, b.y + b.r * .55 + tap, size, size);
  ctx.globalAlpha = 1;
}

function drawFreed(f) {
  const p = f.t / FREED_LIFE;
  const grow = 1 + .35 * easeOutBack(Math.min(f.t / .35, 1));
  const shrink = p > .75 ? 1 - (p - .75) / .25 : 1;
  const hop = Math.abs(Math.sin(f.t * Math.PI * 2.2)) * f.r * .35 * (1 - p);
  const e = emojiSprite(f.emoji), size = e.w * (f.r / SPR) * grow * shrink;
  ctx.save();
  ctx.globalAlpha = p > .8 ? (1 - p) / .2 : 1;
  ctx.translate(f.x, f.y - hop);
  ctx.rotate(Math.sin(f.t * 14) * .18 * (1 - p));
  ctx.drawImage(e, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function render(t) {
  const sc = scene;
  ctx.drawImage(sc.bg, 0, 0, W, H);

  for (const c of sc.clouds) {
    ctx.globalAlpha = c.alpha;
    ctx.drawImage(c.sprite, c.x, c.y, c.sprite.w, c.sprite.h);
  }
  ctx.globalAlpha = 1;
  for (const b of birds) drawBird(b, t);

  const rs = sc.rays.w;
  ctx.save();
  ctx.translate(sc.sunX, sc.sunY);
  ctx.rotate(t * .15);
  ctx.drawImage(sc.rays, -rs / 2, -rs / 2, rs, rs);
  ctx.restore();
  ctx.drawImage(sc.sun, sc.sunX - rs / 2, sc.sunY - rs / 2, rs, rs);

  drawRainbow();
  for (const b of bubbles) drawBubble(b, t);
  ctx.drawImage(sc.hills, 0, 0, W, H);   // bolhas nascem de trás dos morros

  ctx.strokeStyle = '#fff';
  for (const r of rings) {
    const p = r.t / RING_LIFE;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = r.r * .12 * (1 - p);
    circle(ctx, r.x, r.y, r.r * (1 + .5 * p)); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const f of freed) drawFreed(f);
  if (started) { drawMeter(); drawHint(); }

  for (const p of particles) {
    ctx.globalAlpha = Math.min(p.life * 1.5, 1);
    ctx.fillStyle = p.color;
    if (p.star) star(ctx, p.x, p.y, p.size, p.rot);
    else { circle(ctx, p.x, p.y, p.size); ctx.fill(); }
  }
  ctx.globalAlpha = 1;

  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 1.3)));
    ctx.restore();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min((now - last) / 1000, .05));   // rAF pode vir com horário anterior ao do script
  last = now;
  clock = now / 1000;
  update(dt, clock);
  render(clock);
  requestAnimationFrame(frame);
}

// ---------- entrada ----------
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!started) return;
  sfx.resume();
  lastTap = clock;
  hit(e.clientX, e.clientY);
});
// iOS só destrava o áudio no fim do toque, não no começo
canvas.addEventListener('pointerup', () => sfx.resume());
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resize(); measureMeter(); }, 120);
});

let wakeLock = null;
const keepAwake = () => navigator.wakeLock?.request('screen').then(l => { wakeLock = l; }).catch(() => {});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { sfx.suspend(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  else if (started) { sfx.resume(); keepAwake(); }
});

const startBtn = document.getElementById('start');
startBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  startBtn.classList.add('gone');
  setTimeout(() => startBtn.remove(), 400);
  sfx.init();
  sfx.startAmbient();
  scheduleAmbient();
  sfx.pop();
  lastTap = clock;
  rings.push({ x: W / 2, y: H / 2, r: Math.min(W, H) * .23, t: 0 });
  burst(W / 2, H / 2, Math.min(W, H) * .2, 330, 30);
  const root = document.documentElement;   // iPad aceita; iPhone só em tela cheia pela Tela de Início
  (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root)?.catch?.(() => {});
  keepAwake();
  say('vamos', 'Vamos estourar as bolhinhas?');
});

// segurar 1s pra voltar ao menu: toque rápido da criança não sai do jogo
const home = document.getElementById('home');
let holdTimer;
home.addEventListener('pointerdown', () => {
  home.classList.add('holding');
  holdTimer = setTimeout(() => { location.href = '../'; }, 1000);
});
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
  home.addEventListener(ev, () => { clearTimeout(holdTimer); home.classList.remove('holding'); });
}

resize();
measureMeter();
requestAnimationFrame(frame);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js').catch(() => {});
