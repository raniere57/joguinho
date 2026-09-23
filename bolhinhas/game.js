'use strict';
// Bolhinhas: bolhas com bichinhos sobem; tocar estoura, o bicho pula e fala

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
loadVoices(['vamos', 'muito-bem', ...ANIMALS.map(a => a[1])]);

const MAX_BUBBLES = 6;
const RISE_SPEED = .1;        // fração da altura da tela por segundo
const HIT_SLOP = 1.25;        // área de toque maior que a bolha: dedinho não é preciso
const HUES = 12;
const FREED_LIFE = 1.4;
const HINT_AFTER = 5;         // segundos sem tocar até a mãozinha aparecer

let SPR = 0;                  // raio de referência dos sprites de bolha
let bubbleSprites = [], bubbles = [], freed = [];
const emojiSize = () => SPR * 1.66;   // bicho ocupa ~65% da bolha

meter.size = 10;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  startRainbow();
  confettiRain();
  say('muito-bem', 'Muito bem! Parabéns!', true);
};

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

function resize() {
  const old = fitCanvas();
  SPR = R * 1.15;
  if (old.R) for (const b of bubbles) {
    b.r *= R / old.R; b.sway *= R / old.R; b.baseX *= W / old.W; b.y *= H / old.H;
  }
  buildSky(.8);
  bubbleSprites = Array.from({ length: HUES }, (_, i) => buildBubble(i * 360 / HUES));
  for (const [e] of ANIMALS) emojiSprite(e, emojiSize());
}

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

function popBubble(b) {
  sfx.pop();
  navigator.vibrate?.(15);
  ring(b.x, b.y, b.r);
  burst(b.x, b.y, b.r, b.hue * 360 / HUES, 22);
  freed.push({ x: Math.min(Math.max(b.x, b.r * 1.3), W - b.r * 1.3), y: b.y, r: b.r, emoji: b.emoji, t: 0 });
  launchStar(b.x, b.y);
  say(b.voz, b.name);
}

function onTap(x, y) {
  let best = -1, bestD = Infinity;
  bubbles.forEach((b, i) => {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d < b.r * HIT_SLOP && d < bestD) { best = i; bestD = d; }
  });
  if (best >= 0) return popBubble(bubbles.splice(best, 1)[0]);
  if (tapBird(x, y)) return;
  sfx.bell();
  ring(x, y, R * .35);
  burst(x, y, R * .3, rand(0, 360), 7);
}

function update(dt, t) {
  updateSky(dt);
  if (bubbles.length < MAX_BUBBLES && bubbles.every(b => b.y < H - R * .5)) spawn();
  for (const b of bubbles) {
    b.y -= H * RISE_SPEED * dt;
    b.x = b.baseX + Math.sin(t * .9 + b.phase) * b.sway;
  }
  bubbles = bubbles.filter(b => b.y > -b.r * 1.2);
  updateMeter(dt);
  for (const f of freed) f.t += dt;
  freed = freed.filter(f => f.t < FREED_LIFE);
}

function drawBubble(b, t) {
  const k = b.r / SPR, sq = Math.sin(t * 2.4 + b.phase) * .035;
  const e = emojiSprite(b.emoji, emojiSize()), es = e.w * k;
  const s = bubbleSprites[b.hue], bs = s.half * k;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(1 + sq, 1 - sq);
  ctx.rotate(Math.sin(t * 1.3 + b.phase) * .12);
  ctx.drawImage(e, -es / 2, -es / 2, es, es);
  ctx.drawImage(s, -bs, -bs, bs * 2, bs * 2);
  ctx.restore();
}

// mãozinha mostrando o que fazer quando a criança fica um tempo sem tocar
function drawHint() {
  const idle = clock - lastTap - HINT_AFTER;
  if (idle < 0) return;
  const b = bubbles.find(b => b.y < H * .75 && b.y > H * .25);
  if (!b) return;
  const size = SPR * 1.16, hand = emojiSprite('👆', size);
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
  const e = emojiSprite(f.emoji, emojiSize()), size = e.w * (f.r / SPR) * grow * shrink;
  ctx.save();
  ctx.globalAlpha = p > .8 ? (1 - p) / .2 : 1;
  ctx.translate(f.x, f.y - hop);
  ctx.rotate(Math.sin(f.t * 14) * .18 * (1 - p));
  ctx.drawImage(e, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function render(t) {
  drawSkyBack(t);
  drawRainbow();
  for (const b of bubbles) drawBubble(b, t);
  drawHills();   // bolhas nascem de trás dos morros
  drawRings();
  for (const f of freed) drawFreed(f);
  if (started) { drawMeter(); drawHint(); }
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap, onBird: spawnBird,
  onStart: () => say('vamos', 'Vamos estourar as bolhinhas?'),
});
