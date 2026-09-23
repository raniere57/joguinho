'use strict';
// Cuidar da bebê: ela pede mamá, banho, soninho ou brincadeira; a criança cuida

loadVoices(['vamos', 'fome', 'sono', 'banho', 'brincar', 'delicia', 'limpinha', 'dormiu', 'bomdia', 'esfrega',
  'muito-bem', 'b-nham', 'b-ri', 'b-boceja', 'b-mama', 'b-oba', 'b-bomdia', 'b-eba']);

const NEEDS = {
  fome: { icon: '🍼', line: 'fome', text: 'A bebê está com fome!' },
  banho: { icon: '🛁', line: 'banho', text: 'A bebê está sujinha! Hora do banho!' },
  sono: { icon: '🌙', line: 'sono', text: 'A bebê está com soninho...' },
  brincar: { icon: '🎈', line: 'brincar', text: 'A bebê quer brincar!' },
};
// "Brilha, brilha, estrelinha" na caixinha de música
const C = 523.25, D = 587.33, E = 659.25, F = 698.46, G = 783.99, A = 880;
const TWINKLE = [[C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2], [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2]];
const SKIN = ['#ffe0c4', '#f3bf95'], HAIR = '#6b4226', ONESIE = ['#ffd1e6', '#ffa8cf'], BOW = '#ff5fa8';
const BALLOON_COLORS = ['#ff5f7e', '#ffc930', '#4fb4ff', '#5ad16e', '#b77cff'];
const FOAM_GOAL = 16;
const NEED_REPEAT = 14;          // segundos até lembrar de novo o que a bebê quer
const HINT_AFTER = 6;            // ...e até a mãozinha apontar o botão

let room = null, win = null;
let mode = 'idle', modeAt = 0;
let need = null, needAt = 0, needSaidAt = 0, nextNeedAt = 0, lastDone = null;
const baby = { x: 0, y: 0, s: 0, laughAt: -99, blinkAt: 0, lookX: 0, lookY: 0, armsUp: 0 };
let night = 0, song = null, songEndsAt = 0, zzz = [], twinkles = [];
let milk = 1, lastGulp = 0, bottleIn = 0, burpAt = -99;
let foam = [], tub = 0, rinsedAt = -99, lastSqueak = 0;
let balloons = [], popped = 0, spawned = 0;
let hearts = [];

const tools = document.querySelector('.tools');
const buttons = [...tools.querySelectorAll('button')];

meter.size = 4;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  confettiRain();
  heartBurst(baby.x, baby.y, 14);
  say('muito-bem', 'Muito bem! Você cuida muito bem da bebê!', true);
};

// ---------- quartinho ----------
function buildRoom() {
  const [c, g] = layer(W, H), floorY = H * .6;
  const wall = g.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, '#d9f0ff'); wall.addColorStop(1, '#eef8ff');
  g.fillStyle = wall; g.fillRect(0, 0, W, floorY);
  g.fillStyle = 'rgb(255 214 90 / .55)';
  const step = Math.max(46, W / 8);
  for (let y = step * .7, r = 0; y < floorY - 10; y += step, r++) {
    for (let x = (r % 2) * step / 2 + step / 3; x < W; x += step) star(g, x, y, step * .09, -Math.PI / 2);
  }
  // janela
  const ww = Math.min(W * .3, 170), wh = ww * 1.05, wx = W * .08, wy = H * .12;
  win = { x: wx, y: wy, w: ww, h: wh };
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(wx - 8, wy - 8, ww + 16, wh + 16, ww * .5); g.fill();
  const sky = g.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#5ab8ff'); sky.addColorStop(1, '#c7ecff');
  g.save(); g.beginPath(); g.roundRect?.(wx, wy, ww, wh, ww * .45); g.clip();
  g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = '#fff';
  for (const [x, y, r] of [[.35, .6, .14], [.52, .52, .18], [.68, .62, .13]]) { circle(g, wx + ww * x, wy + wh * y, ww * r); g.fill(); }
  g.restore();
  g.fillStyle = '#fff'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
  // rodapé, carpete e tapete
  g.fillStyle = '#fff'; g.fillRect(0, floorY - 4, W, 10);
  const carpet = g.createLinearGradient(0, floorY, 0, H);
  carpet.addColorStop(0, '#f6e3ff'); carpet.addColorStop(1, '#e7ccf7');
  g.fillStyle = carpet; g.fillRect(0, floorY + 6, W, H);
  g.fillStyle = '#ffd6e8';
  g.beginPath(); g.ellipse(baby.x, baby.y + baby.s * 2.15, baby.s * 2.6, baby.s * .75, 0, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.setLineDash([10, 9]);
  g.beginPath(); g.ellipse(baby.x, baby.y + baby.s * 2.15, baby.s * 2.35, baby.s * .6, 0, 0, TAU); g.stroke();
  g.setLineDash([]);
  // brinquedos no chão, nos cantos
  const toy = Math.min(W * .12, 60);
  g.font = `${toy}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.fillText('🧸', W * .1, floorY + toy * 1.3);
  g.fillText('🪀', W * .9, floorY + toy * 1.1);
  return c;
}

// ---------- a bebê ----------
// humor → olhos e boca
function face() {
  if (mode === 'sleep') return night > .6 ? ['sleep', 'o'] : ['sleepy', 'o'];
  if (clock - baby.laughAt < 1.2 || clock - rinsedAt < 2 || clock - burpAt < 1.2) return ['happy', 'laugh'];
  if (mode === 'feed' && bottleIn >= 1) return ['happy', 'suck'];
  if (mode === 'bath') return ['open', 'laugh'];
  if (need && mode === 'idle') return ['open', 'pout'];
  return ['open', 'smile'];
}

function eye(x, y, s, kind, blink) {
  ctx.strokeStyle = '#3b2a55'; ctx.fillStyle = '#3b2a55'; ctx.lineCap = 'round'; ctx.lineWidth = s * .07;
  if (kind === 'happy') { ctx.beginPath(); ctx.arc(x, y + s * .05, s * .12, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); return; }
  if (kind === 'sleep' || kind === 'sleepy') {
    ctx.beginPath(); ctx.arc(x, y - s * .02, s * .12, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
    return;
  }
  const lx = baby.lookX * s * .04, ly = baby.lookY * s * .03;
  ctx.beginPath(); ctx.ellipse(x + lx, y + ly, s * .11, s * .15 * blink, 0, 0, TAU); ctx.fill();
  if (blink > .5) {
    ctx.fillStyle = '#fff';
    circle(ctx, x + lx + s * .04, y + ly - s * .05, s * .04); ctx.fill();
    circle(ctx, x + lx - s * .03, y + ly + s * .05, s * .018); ctx.fill();
  }
}

function mouth(s, kind, t) {
  ctx.strokeStyle = '#a3485f'; ctx.fillStyle = '#c24d6a'; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
  const y = s * .45;
  if (kind === 'smile') { ctx.beginPath(); ctx.arc(0, y - s * .1, s * .16, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); }
  else if (kind === 'laugh') {
    ctx.beginPath(); ctx.arc(0, y - s * .06, s * .17, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.ellipse(0, y + s * .06, s * .08, s * .04, 0, 0, TAU); ctx.fill();
  } else if (kind === 'pout') {
    ctx.beginPath(); ctx.arc(0, y + s * .1, s * .1, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
  } else if (kind === 'suck') {
    const k = 1 + .25 * Math.sin(t * 14);
    ctx.beginPath(); ctx.ellipse(0, y, s * .07 * k, s * .07, 0, 0, TAU); ctx.fill();
  } else { ctx.beginPath(); ctx.ellipse(0, y, s * .05, s * .06, 0, 0, TAU); ctx.fill(); }
}

function drawBaby(t) {
  const { x, y, s } = baby, [eyes, lips] = face();
  const laughing = clock - baby.laughAt < 1.2;
  const bounce = laughing ? Math.abs(Math.sin(t * 12)) * s * .06 : 0;
  const breathe = 1 + Math.sin(t * (mode === 'sleep' ? 1.6 : 2.4)) * .018;
  const tilt = mode === 'sleep' ? .18 * night : Math.sin(t * .8) * .05 + (laughing ? Math.sin(t * 14) * .06 : 0);
  ctx.save();
  ctx.translate(x, y - bounce);

  // corpinho de macacão, bracinhos e pezinhos
  ctx.save();
  ctx.translate(0, s * 1.3); ctx.scale(1, breathe);
  const suit = ctx.createLinearGradient(0, -s * .8, 0, s * .8);
  suit.addColorStop(0, ONESIE[0]); suit.addColorStop(1, ONESIE[1]);
  for (const side of [-1, 1]) {
    ctx.fillStyle = SKIN[0];
    ctx.beginPath(); ctx.ellipse(side * s * .45, s * .72, s * .26, s * .2, side * .3, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = suit;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .82, s * .78, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  heartPath(ctx, 0, -s * .05, s * .22); ctx.fill();
  const wave = baby.armsUp > 0 ? baby.armsUp : laughing ? .5 + .5 * Math.sin(t * 16) : Math.sin(t * 1.4) * .15;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * s * .7, -s * .35);
    ctx.rotate(side * (.5 + wave * 1.6));
    ctx.fillStyle = ONESIE[0];
    ctx.beginPath(); ctx.ellipse(0, s * .3, s * .2, s * .38, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = SKIN[0]; circle(ctx, 0, s * .66, s * .16); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // cabeça
  ctx.rotate(tilt);
  for (const side of [-1, 1]) { ctx.fillStyle = SKIN[1]; circle(ctx, side * s * .95, s * .05, s * .2); ctx.fill(); }
  const skin = ctx.createRadialGradient(-s * .3, -s * .35, s * .1, 0, 0, s);
  skin.addColorStop(0, SKIN[0]); skin.addColorStop(1, SKIN[1]);
  ctx.fillStyle = skin; circle(ctx, 0, 0, s); ctx.fill();
  // cabelinho: cachinhos e um topete enrolado
  ctx.fillStyle = HAIR;
  for (const [hx, hy, hr] of [[-.45, -.78, .3], [-.12, -.92, .32], [.25, -.88, .3], [.55, -.7, .24], [-.7, -.55, .2]]) {
    circle(ctx, hx * s, hy * s, hr * s); ctx.fill();
  }
  ctx.strokeStyle = HAIR; ctx.lineWidth = s * .07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-s * .02, -s * 1.08, s * .14, .9 * Math.PI, 2.6 * Math.PI); ctx.stroke();
  // lacinho
  ctx.fillStyle = BOW;
  ctx.save(); ctx.translate(s * .6, -s * .78); ctx.rotate(.4);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * .28, -s * .16); ctx.lineTo(-s * .28, s * .16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * .28, -s * .16); ctx.lineTo(s * .28, s * .16); ctx.fill();
  ctx.fillStyle = '#ff8fc0'; circle(ctx, 0, 0, s * .09); ctx.fill();
  ctx.restore();
  // bochechas, nariz, olhos e boca
  ctx.fillStyle = 'rgb(255 120 140 / .35)';
  circle(ctx, -s * .58, s * .3, s * .17); ctx.fill();
  circle(ctx, s * .58, s * .3, s * .17); ctx.fill();
  ctx.fillStyle = 'rgb(200 120 90 / .5)'; circle(ctx, 0, s * .2, s * .05); ctx.fill();
  const since = clock - baby.blinkAt, blink = since < .15 ? Math.abs(since / .075 - 1) : 1;
  eye(-s * .36, s * .02, s, eyes, Math.max(blink, .08));
  eye(s * .36, s * .02, s, eyes, Math.max(blink, .08));
  ctx.save(); mouth(s, lips, t); ctx.restore();
  ctx.restore();
}

function heartPath(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * .9);
  g.bezierCurveTo(x - r * 1.4, y - r * .1, x - r * .6, y - r * 1.1, x, y - r * .4);
  g.bezierCurveTo(x + r * .6, y - r * 1.1, x + r * 1.4, y - r * .1, x, y + r * .9);
}

function heartBurst(x, y, n) {
  for (let i = 0; i < n; i++) {
    hearts.push({ x: x + rand(-baby.s, baby.s), y: y + rand(-baby.s * .5, baby.s * .3), vy: -rand(40, 90), vx: rand(-25, 25), r: rand(8, 15), t: 0, life: rand(1.2, 1.8) });
  }
}

// balãozinho de pensamento com o que ela quer
function drawThought(t) {
  if (!need || mode !== 'idle') return;
  const { x, y, s } = baby, bob = Math.sin(t * 2.5) * s * .05;
  const k = easeOutBack(Math.min((clock - needAt) / .4, 1));
  const cx = x + s * 1.35, cy = y - s * 1.25 + bob, r = s * .62 * k;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgb(80 40 120 / .2)'; ctx.shadowBlur = 12;
  circle(ctx, x + s * .75, y - s * .55, s * .09 * k); ctx.fill();
  circle(ctx, x + s * .95, y - s * .8, s * .14 * k); ctx.fill();
  for (const [dx, dy, rr] of [[-.5, .1, .6], [.5, .1, .6], [0, -.35, .65], [0, .35, .6]]) { circle(ctx, cx + dx * r, cy + dy * r, rr * r); ctx.fill(); }
  ctx.shadowBlur = 0;
  const size = Math.round(r * 1.5 / 10) * 10;
  if (size > 0) ctx.drawImage(emojiSprite(NEEDS[need].icon, size), cx - size / 2, cy - size / 2, size, size);
}

// ---------- pedidos ----------
function updateNeeds() {
  if (mode !== 'idle') return;
  if (!need && clock > nextNeedAt) {
    need = pick(Object.keys(NEEDS).filter(k => k !== lastDone));
    needAt = needSaidAt = clock;
    say(NEEDS[need].line, NEEDS[need].text);
    if (need === 'fome') say('b-mama', 'Mamá!', true);
  } else if (need && clock - needSaidAt > NEED_REPEAT) {
    needSaidAt = clock;
    say(NEEDS[need].line, NEEDS[need].text);
  }
  const idle = clock - Math.max(needAt, lastTap);
  for (const b of buttons) {
    b.classList.toggle('wanted', b.dataset.care === need);
    b.classList.toggle('hint', b.dataset.care === need && idle > HINT_AFTER);
  }
}

function done(kind) {
  lastDone = kind;
  if (need === kind) {
    need = null;
    launchStar(baby.x, baby.y - baby.s);
    heartBurst(baby.x, baby.y, 8);
  }
  nextNeedAt = clock + rand(8, 14);
  setMode('idle');
}

function setMode(m) {
  mode = m; modeAt = clock;
  tools.classList.toggle('busy', m !== 'idle' && m !== 'sleep');
  for (const b of buttons) if (m !== 'idle') b.classList.remove('wanted', 'hint');
  buttons[2].textContent = m === 'sleep' ? '☀️' : '🌙';
  buttons[2].setAttribute('aria-label', m === 'sleep' ? 'Acordar' : 'Dormir');
}

// ---------- cuidados ----------
function startCare(kind) {
  if (kind === 'sono' && mode === 'sleep') return wakeUp();
  if (mode !== 'idle') return;
  sfx.bell(880);
  if (kind === 'fome') {
    milk = 1; bottleIn = 0; lastGulp = clock + .6;
    setMode('feed');
  } else if (kind === 'banho') {
    foam = []; tub = 0; rinsedAt = -99;
    setMode('bath');
    say('esfrega', 'Esfrega, esfrega!');
  } else if (kind === 'sono') {
    zzz = []; twinkles = [];
    setMode('sleep');
    say('b-boceja', 'Aaaahhh...');
    song = null;
  } else if (kind === 'brincar') {
    balloons = []; popped = 0; spawned = 0;
    setMode('play');
    say('b-oba', 'Oba!');
  }
}

function gulp() {
  if (clock - lastGulp < .3 || milk <= 0) return;
  lastGulp = clock;
  milk = Math.max(0, milk - .2);
  sfx.gulp();
  heartBurst(baby.x + baby.s * .3, baby.y + baby.s * .4, 1);
  if (milk === .8) say('b-nham', 'Nham, nham, nham!');
}

function updateFeed() {
  const t = clock - modeAt;
  bottleIn = Math.min(t / .6, 1);
  if (milk > 0) {
    if (bottleIn >= 1 && clock - lastGulp > 1.1) gulp();
  } else if (burpAt < modeAt) {
    burpAt = clock + .5;
    setTimeout(() => { sfx.burp(); say('delicia', 'Que delícia!', true); }, 500);
  } else if (clock - burpAt > 1.6) done('fome');
}

function scrub(x, y) {
  const { x: bx, y: by, s } = baby;
  if (Math.hypot(x - bx, y - (by + s * .6)) > s * 2.2) return;
  if (foam.some(f => Math.hypot(f.x - x, f.y - y) < s * .2)) return;
  foam.push({ x, y, r: s * rand(.16, .26), born: clock });
  if (clock - lastSqueak > .08) { lastSqueak = clock; sfx.squeak(); }
  if (Math.random() < .12) { baby.laughAt = clock; sfx.giggle(); }
  if (foam.length === FOAM_GOAL) {
    rinsedAt = clock;
    sfx.splash();
    burst(bx, by, s, 200, 24);
    say('limpinha', 'Que cheirosa! Limpinha, limpinha!');
    say('b-eba', 'Ebaaa!', true);
  }
}

function updateBath() {
  const t = clock - modeAt;
  tub = rinsedAt > 0 ? Math.max(0, 1 - (clock - rinsedAt - 2.6) / .6) : Math.min(t / .6, 1);
  if (rinsedAt > 0 && clock - rinsedAt > 3.3) done('banho');
}

function updateSleep(dt) {
  const t = clock - modeAt;
  const waking = song && clock > songEndsAt;
  night += ((waking ? 0 : 1) - night) * Math.min(dt * 1.5, 1);
  if (!song && t > 1.4) {
    song = sfx.musicBox(TWINKLE, .6);
    songEndsAt = clock + song.duration + 1.5;
    say('dormiu', 'Shhh... a bebê dormiu.');
  }
  if (!waking && Math.random() < dt * .8) zzz.push({ x: baby.x + baby.s * .6, y: baby.y - baby.s * .6, t: 0, dir: rand(.5, 1) });
  if (waking && !baby.woke) {
    baby.woke = true;
    say('b-bomdia', 'Bom dia!');
    say('bomdia', 'Bom dia, bebê!', true);
  }
  baby.armsUp = waking ? Math.min((clock - songEndsAt) / .5, 1) * (1 - Math.max(0, clock - songEndsAt - 1.5)) : 0;
  if (waking && clock - songEndsAt > 2.4) { baby.woke = false; baby.armsUp = 0; done('sono'); }
}

function wakeUp() {
  song?.stop();
  songEndsAt = clock;
  if (!song) song = { stop() {} };
}

function spawnBalloon() {
  spawned++;
  const side = spawned % 2 ? -1 : 1, r = baby.s * rand(.55, .7);
  balloons.push({ x: baby.x + side * baby.s * rand(1.2, 2), y: H * .92, r, color: pick(BALLOON_COLORS), phase: rand(0, TAU), vy: H * rand(.09, .12) });
}

function updatePlay(dt) {
  if (balloons.length < 2 && spawned < 8 && popped < 3) spawnBalloon();
  for (const b of balloons) { b.y -= b.vy * dt; b.x += Math.sin(clock * 1.5 + b.phase) * 18 * dt; }
  balloons = balloons.filter(b => b.y > -b.r * 3);
  const near = balloons[0];
  if (near) { baby.lookX = Math.sign(near.x - baby.x); baby.lookY = Math.sign(near.y - baby.y); }
  if ((popped >= 3 || spawned >= 8) && !balloons.length) { baby.lookX = baby.lookY = 0; done('brincar'); }
}

function popBalloon(i) {
  const b = balloons.splice(i, 1)[0];
  popped++;
  sfx.pop();
  ring(b.x, b.y, b.r);
  burst(b.x, b.y, b.r, 0, 18);
  baby.laughAt = clock;
  say(popped % 2 ? 'b-ri' : 'b-oba', 'Hihihi!');
}

// ---------- toques ----------
function onTap(x, y) {
  if (mode === 'feed') return gulp();
  if (mode === 'bath') { for (let i = 0; i < 3; i++) scrub(x + rand(-20, 20), y + rand(-20, 20)); return; }
  if (mode === 'sleep') { twinkles.push({ x, y, t: 0 }); sfx.chime(); return; }
  if (mode === 'play') {
    const i = balloons.findIndex(b => Math.hypot(x - b.x, y - b.y) < b.r * 1.4);
    if (i >= 0) return popBalloon(i);
  }
  const { x: bx, y: by, s } = baby;
  if (Math.hypot(x - bx, y - (by + s * .5)) < s * 1.8) {
    baby.laughAt = clock;
    sfx.giggle((bx / W) * 2 - 1);
    heartBurst(x, y, 3);
    if (Math.random() < .5) say('b-ri', 'Hihihi!');
    return;
  }
  sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
}

function onMove(x, y) { if (mode === 'bath' && rinsedAt < 0) scrub(x, y); }

for (const b of buttons) {
  b.addEventListener('click', () => {
    if (!started) return;
    sfx.resume();
    lastTap = clock;
    startCare(b.dataset.care);
  });
}

// ---------- desenho dos cuidados ----------
function drawBottle(t) {
  if (mode !== 'feed') return;
  const out = milk <= 0 ? Math.min((clock - (burpAt - .5)) / .5, 1) : 0;
  const e = bottleIn * (1 - out), size = baby.s * 1.3;
  const tx = baby.x + baby.s * .75, ty = baby.y + baby.s * .55;
  const fx = W * .5, fy = H;
  const x = fx + (tx - fx) * e, y = fy + (ty - fy) * e + Math.sin(t * 14) * 2 * e;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-2.3);
  ctx.drawImage(emojiSprite('🍼', Math.round(size / 10) * 10), -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawTub() {
  if (mode !== 'bath' || tub <= 0) return;
  const { x, y, s } = baby, e = tub * tub * (3 - 2 * tub);
  const top = y + s * .95 + (1 - e) * H * .6, w = s * 2.5, h = s * 1.5;
  ctx.fillStyle = '#9ad8ff';
  ctx.beginPath(); ctx.ellipse(x, top, w * .96, s * .22, 0, 0, TAU); ctx.fill();
  const body = ctx.createLinearGradient(0, top, 0, top + h);
  body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#dfe9f5');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - w, top); ctx.lineTo(x + w, top);
  ctx.quadraticCurveTo(x + w, top + h, x + w * .6, top + h);
  ctx.lineTo(x - w * .6, top + h);
  ctx.quadraticCurveTo(x - w, top + h, x - w, top);
  ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - w, top); ctx.lineTo(x + w, top); ctx.stroke();
  ctx.fillStyle = '#ffc930';
  for (const side of [-1, 1]) { circle(ctx, x + side * w * .62, top + h + s * .08, s * .12); ctx.fill(); }
  // patinho aparece quando fica limpinha
  if (rinsedAt > 0) {
    const k = easeOutBack(Math.min((clock - rinsedAt) / .5, 1)), size = s * .9 * k;
    const bob = Math.sin(clock * 4) * s * .05;
    ctx.drawImage(emojiSprite('🦆', Math.round(s * .9 / 10) * 10), x + w * .45 - size / 2, top - size * .75 + bob, size, size);
  }
}

function drawFoam() {
  const fade = rinsedAt > 0 ? Math.max(0, 1 - (clock - rinsedAt) / .6) : 1;
  if (!fade || mode !== 'bath') return;
  for (const f of foam) {
    const k = easeOutBack(Math.min((clock - f.born) / .25, 1));
    ctx.globalAlpha = .92 * fade;
    ctx.fillStyle = '#fff'; circle(ctx, f.x, f.y, f.r * k); ctx.fill();
    ctx.fillStyle = 'rgb(180 225 255 / .7)'; circle(ctx, f.x + f.r * .25, f.y + f.r * .25, f.r * .45 * k); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, f.x - f.r * .3, f.y - f.r * .3, f.r * .18 * k); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNight(t) {
  if (night < .01) return;
  ctx.fillStyle = `rgb(24 22 70 / ${.62 * night})`;
  ctx.fillRect(0, 0, W, H);
  // lua e estrelas na janela
  ctx.globalAlpha = night;
  ctx.save(); ctx.beginPath(); ctx.roundRect?.(win.x, win.y, win.w, win.h, win.w * .45); ctx.clip();
  ctx.fillStyle = '#1d2a6b'; ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = '#fff7c2'; circle(ctx, win.x + win.w * .62, win.y + win.h * .35, win.w * .2); ctx.fill();
  ctx.fillStyle = '#1d2a6b'; circle(ctx, win.x + win.w * .7, win.y + win.h * .3, win.w * .17); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const [sx, sy] of [[.25, .25], [.3, .7], [.8, .75], [.5, .55]]) star(ctx, win.x + win.w * sx, win.y + win.h * sy, win.w * .04 * (1 + .3 * Math.sin(t * 3 + sx * 9)), 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSleepBits(dt, t) {
  for (const z of zzz) z.t += dt;
  zzz = zzz.filter(z => z.t < 3);
  ctx.font = `700 ${baby.s * .4}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const z of zzz) {
    ctx.globalAlpha = Math.min(z.t, 1) * (1 - z.t / 3);
    ctx.fillStyle = '#e8e4ff';
    ctx.fillText('z', z.x + Math.sin(z.t * 2) * baby.s * .3 * z.dir + z.t * baby.s * .3, z.y - z.t * baby.s * .7);
  }
  for (const s of twinkles) s.t += dt;
  twinkles = twinkles.filter(s => s.t < 1.5);
  for (const s of twinkles) {
    ctx.globalAlpha = 1 - s.t / 1.5;
    ctx.fillStyle = '#fff3a0';
    star(ctx, s.x, s.y - s.t * 20, 14 * easeOutBack(Math.min(s.t / .3, 1)), t);
  }
  ctx.globalAlpha = 1;
}

function drawBalloon(b, t) {
  const sway = Math.sin(t * 1.5 + b.phase) * .08;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(sway);
  ctx.strokeStyle = 'rgb(80 60 100 / .5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, b.r * 1.15);
  ctx.quadraticCurveTo(b.r * .3, b.r * 1.8, 0, b.r * 2.6); ctx.stroke();
  const g = ctx.createRadialGradient(-b.r * .35, -b.r * .45, b.r * .1, 0, 0, b.r * 1.2);
  g.addColorStop(0, '#fff'); g.addColorStop(.25, b.color); g.addColorStop(1, b.color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, b.r * .9, b.r * 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = b.color;
  ctx.beginPath(); ctx.moveTo(-b.r * .12, b.r * 1.18); ctx.lineTo(b.r * .12, b.r * 1.18); ctx.lineTo(0, b.r * 1.02); ctx.fill();
  ctx.restore();
}

function drawHearts(dt) {
  for (const h of hearts) { h.t += dt; h.x += h.vx * dt; h.y += h.vy * dt; }
  hearts = hearts.filter(h => h.t < h.life);
  for (const h of hearts) {
    const k = easeOutBack(Math.min(h.t / .3, 1));
    ctx.globalAlpha = 1 - h.t / h.life;
    ctx.fillStyle = '#ff6fa8';
    heartPath(ctx, h.x, h.y, h.r * k); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  baby.s = Math.min(W * .25, H * .14, 130);
  baby.x = W / 2;
  baby.y = H * .43;
  room = buildRoom();
}

let frameDt = 0;
function update(dt) {
  frameDt = dt;
  if (clock - baby.blinkAt > 3 + Math.random() * 40) baby.blinkAt = clock;
  if (started) updateNeeds();
  if (mode === 'feed') updateFeed();
  else if (mode === 'bath') updateBath();
  else if (mode === 'sleep') updateSleep(dt);
  else if (mode === 'play') updatePlay(dt);
  if (mode !== 'sleep') night += (0 - night) * Math.min(dt * 1.5, 1);
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(room, 0, 0, W, H);
  for (const b of balloons) if (b.y > baby.y) drawBalloon(b, t);
  drawBaby(t);
  drawTub();
  drawFoam();
  drawBottle(t);
  for (const b of balloons) if (b.y <= baby.y) drawBalloon(b, t);
  drawThought(t);
  drawNight(t);
  drawSleepBits(frameDt, t);
  drawHearts(frameDt);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap, onMove,
  onStart: () => {
    tools.classList.add('on');
    nextNeedAt = clock + 4;
    say('vamos', 'Vamos cuidar da bebê?');
  },
});
