'use strict';
// seis peixinhos, um de cada cor: nadam à toa, correm pra comidinha e mordem o anzol.
// Pescado, o peixe sobe pendurado, se mexe no ar e volta pra água com um tchibum.

const FISH = [
  { id: 'vermelho', body: '#ff5a5f', fin: '#d93a48', belly: '#ffb0a8', kind: 'round', pattern: 'spots' },
  { id: 'laranja', body: '#ff9a3c', fin: '#e0701a', belly: '#ffd2a0', kind: 'long', pattern: 'stripes' },
  { id: 'amarelo', body: '#ffd23b', fin: '#f0a000', belly: '#fff0a8', kind: 'tall', pattern: 'none' },
  { id: 'verde', body: '#5ad16e', fin: '#2f9e48', belly: '#c4f2c8', kind: 'long', pattern: 'spots' },
  { id: 'azul', body: '#4fb4ff', fin: '#2477c4', belly: '#c4e6ff', kind: 'round', pattern: 'stripes' },
  { id: 'rosa', body: '#ff8fc8', fin: '#e0609f', belly: '#ffd6ea', kind: 'tall', pattern: 'spots' },
];
const FISH_SHAPE = { round: [.4, .32], long: [.5, .24], tall: [.33, .34] };
const FOOD_COLORS = ['#ffb347', '#ff7a59', '#ffd23b', '#c98a4b'];
const REEL_TIME = 1, SHOW_TIME = 1.8, DOWN_TIME = .8, BITE_AGAIN = 7;
const HOOK_ACTIVE = 4;            // segundos depois de mexer no anzol em que os peixes ainda mordem

let fishes = [], food = [];
const hook = { x: 0, y: 0, state: 'water', fish: null, at: 0, touchedAt: -99, x0: 0, y0: 0 };

function fishSize(d) { return S * (d.kind === 'long' ? 1.4 : 1.2); }

function makeFishes() {
  const b = waterBox();
  fishes = FISH.map(d => ({
    d, x: rand(b.x0, b.x1), y: rand(b.y0, b.y1), vx: 0, vy: 0, dir: Math.random() < .5 ? -1 : 1, flip: 1,
    tx: 0, ty: 0, mode: 'swim', ph: rand(0, TAU), blinkAt: 0, mouth: 0, spinAt: -99, restUntil: 0, caughtAt: -99, s: fishSize(d),
  }));
  fishes.forEach(newGoal);
}

function newGoal(f) {
  const b = waterBox();
  f.tx = rand(b.x0, b.x1); f.ty = rand(b.y0, b.y1);
}

// depois de girar a tela: tudo volta pra dentro da água
function fitFishes() {
  const b = waterBox();
  for (const f of fishes) {
    f.s = fishSize(f.d);
    if (f.mode === 'swim') { f.x = Math.min(Math.max(f.x, b.x0), b.x1); f.y = Math.min(Math.max(f.y, b.y0), b.y1); newGoal(f); }
  }
  if (hook.state === 'water') placeHookIn(hook.x || W / 2, hook.y || (b.y0 + b.y1) / 2);
}

const mouthOf = f => [f.x + f.flip * f.s * FISH_SHAPE[f.d.kind][0] * .9, f.y];
const hookBusy = () => hook.state !== 'water';

// ---------- comidinha ----------
function dropFood(x, y) {
  for (let i = 0; i < 4; i++) food.push({ x: x + rand(-S * .35, S * .35), y: y + rand(-S * .2, S * .2), ph: rand(0, TAU), t: 0, c: pick(FOOD_COLORS), rest: 0 });
  if (food.length > 32) food.splice(0, food.length - 32);
  sfx.blub(.1); ring(x, y, S * .3);
}

function updateFood(dt) {
  for (const p of food) {
    p.t += dt;
    if (p.y < floorY - S * .05) { p.y += S * .4 * dt; p.x += Math.sin(p.t * 3 + p.ph) * S * .25 * dt; } else p.rest += dt;
  }
  food = food.filter(p => p.rest < 3);
}

function drawFood() {
  for (const p of food) {
    ctx.globalAlpha = Math.min(1, 3 - p.rest);
    ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 2 + p.ph);
    ctx.fillRect(-S * .05, -S * .035, S * .1, S * .07); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---------- nadar ----------
function updateFishes(dt) {
  for (const f of fishes) {
    f.mouth = Math.max(0, f.mouth - dt * 2.5);
    if (clock - f.blinkAt > 2 + Math.random() * 40) f.blinkAt = clock;
    if (f.mode === 'hook') { f.x = hook.x; f.y = hook.y + f.s * FISH_SHAPE[f.d.kind][0] * .95; continue; }
    if (f.mode === 'fly') { flyFish(f, dt); continue; }
    swimFish(f, dt);
  }
}

function fishGoal(f) {
  const [mx, my] = mouthOf(f);
  let best = null, bd = S * 6;
  for (const p of food) { const d = Math.hypot(p.x - mx, p.y - my); if (d < bd) { bd = d; best = p; } }
  if (best) return { x: best.x, y: best.y, fast: true, food: best };
  // pescando uma cor: só aquele peixe vem pro anzol (os outros não roubam a vez)
  const fishing = mission?.type === 'pesca', reach = !fishing ? S * 2 : mission.id === f.d.id ? S * 4 : 0;
  if (reach && !hookBusy() && clock - hook.touchedAt < HOOK_ACTIVE && clock - f.caughtAt > BITE_AGAIN && Math.hypot(hook.x - mx, hook.y - my) < reach) {
    return { x: hook.x, y: hook.y, fast: true, hook: true };
  }
  return { x: f.tx, y: f.ty, fast: false };
}

function swimFish(f, dt) {
  const goal = fishGoal(f), [mx, my] = mouthOf(f);
  const dx = goal.x - (goal.food || goal.hook ? mx : f.x), dy = goal.y - (goal.food || goal.hook ? my : f.y), dist = Math.hypot(dx, dy);
  const resting = !goal.fast && clock < f.restUntil;
  const sp = resting ? 0 : S * (goal.fast ? 2.3 : 1) * Math.min(1, dist / (S * .6));
  const want = dist > 1 ? [dx / dist * sp, dy / dist * sp] : [0, 0];
  const k = Math.min(dt * (goal.fast ? 3 : 1.5), 1);
  f.vx += (want[0] - f.vx) * k; f.vy += (want[1] - f.vy) * k;
  for (const o of fishes) {   // não ficar um em cima do outro
    if (o === f || o.mode !== 'swim') continue;
    const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy);
    if (od > 0 && od < S * .9) { f.vx += ox / od * S * 2 * dt; f.vy += oy / od * S * 2 * dt; }
  }
  f.x += f.vx * dt; f.y += f.vy * dt;
  const b = waterBox();
  f.x = Math.min(Math.max(f.x, b.x0 - S * .1), b.x1 + S * .1); f.y = Math.min(Math.max(f.y, b.y0 - S * .4), b.y1 + S * .3);
  if (Math.abs(f.vx) > S * .12) f.dir = Math.sign(f.vx);
  f.flip += (f.dir - f.flip) * Math.min(dt * 7, 1);
  f.fast = goal.fast;
  if (!goal.fast && dist < S * .5 && !resting) { newGoal(f); f.restUntil = clock + (Math.random() < .4 ? rand(.5, 2) : 0); }
  if (goal.food && dist < S * .3) eatFood(f, goal.food);
  if (goal.hook && dist < S * .35) biteHook(f);
}

function eatFood(f, p) {
  food.splice(food.indexOf(p), 1);
  f.mouth = 1; sfx.gulp();
  burst(p.x, p.y, S * .2, 45, 5);
  fishAte(f);
}

function tapFish(x, y) {
  const f = fishes.filter(f => f.mode === 'swim' && Math.hypot((x - f.x) / 1.2, y - f.y) < f.s * .5)
    .sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y))[0];
  if (!f) return null;
  f.spinAt = clock; f.mouth = .6; sfx.giggle(f.x / W * 2 - 1);
  const [mx, my] = mouthOf(f);
  for (let i = 0; i < 3; i++) addBubble(mx + f.dir * S * .1, my - i * S * .15, S * rand(.05, .1));
  f.vx = -f.dir * S * 1.5; newGoal(f);
  return f;
}

// ---------- anzol ----------
function placeHookIn(x, y) {
  const b = waterBox();
  hook.x = Math.min(Math.max(x, S * .6), W - S * .6);
  hook.y = Math.min(Math.max(y, surfaceY + S * .35), b.y1 + S * .3);
}

function hookRestY() { const b = waterBox(); return b.y0 + (b.y1 - b.y0) * .3; }

function biteHook(f) {
  f.mode = 'hook'; f.dir = 1; f.flip = 1;
  hook.state = 'reel'; hook.fish = f; hook.at = clock; hook.x0 = hook.x; hook.y0 = hook.y;
  sfx.boing(); ring(hook.x, hook.y, S * .5);
  hookGrabbed = false;
}

function updateHook(dt) {
  const ease = p => 1 - (1 - p) ** 3, [tx] = rodTip();
  if (hook.state === 'water') {
    if (!hookGrabbed) hook.y += Math.sin(clock * 1.6) * S * .06 * dt;
    boat.x += (boatGoal() - boat.x) * Math.min(dt * 1.4, 1);   // o barco acompanha o anzol
    return;
  }
  const e = clock - hook.at;
  if (hook.state === 'reel') {
    const p = Math.min(e / REEL_TIME, 1), before = hook.y;
    hook.x = hook.x0 + (tx - hook.x0) * ease(p);
    hook.y = hook.y0 + (surfaceY - S * 1.3 - hook.y0) * ease(p);
    if (before > surfaceY && hook.y <= surfaceY + hook.fish.s * .4) splashOnce();
    if (p >= 1) { hook.state = 'show'; hook.at = clock; fishCaught(hook.fish); }
  } else if (hook.state === 'show') {
    hook.x = tx; hook.y = surfaceY - S * 1.3 + Math.sin(clock * 3) * S * .05;
    if (Math.random() < .3) sparkle(hook.x + rand(-S * .4, S * .4), hook.y + rand(0, S));
    if (e > SHOW_TIME) releaseFish();
  } else if (hook.state === 'down') {
    const p = Math.min(e / DOWN_TIME, 1);
    hook.x = tx; hook.y = surfaceY - S * 1.3 + (hookRestY() - surfaceY + S * 1.3) * ease(p);
    if (p >= 1) hook.state = 'water';
  }
}

let splashedAt = -99;
function splashOnce() { if (clock - splashedAt > .6) { splashedAt = clock; splashAt(hook.x); } }

function releaseFish() {
  const f = hook.fish;
  f.mode = 'fly'; f.vx = S * rand(1.2, 2); f.vy = -S * 2.5; f.spinAt = clock; f.caughtAt = clock; f.dir = 1;
  hook.fish = null; hook.state = 'down'; hook.at = clock;
  sfx.whoosh();
}

function flyFish(f, dt) {
  const was = f.y;
  f.vy += S * 14 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
  if (was < surfaceY && f.y >= surfaceY) { splashAt(f.x); f.vy *= .25; }
  if (f.y > surfaceY + S * .8) { f.mode = 'swim'; f.vx *= .5; newGoal(f); }
}

function hitHook(x, y) { return hook.state === 'water' && Math.hypot(x - hook.x, y - hook.y) < S * .9; }

function drawLine() {
  const [tx, ty] = rodTip();
  ctx.strokeStyle = 'rgb(255 255 255 / .85)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo((tx + hook.x) / 2, Math.max(ty, hook.y) - S * .1, hook.x, hook.y - S * .12); ctx.stroke();
  if (hook.y > surfaceY + S * .3) {   // boia na superfície
    const t = Math.min(Math.max((surfaceY - ty) / (hook.y - ty), 0), 1), bx = tx + (hook.x - tx) * t, by = surfaceY + Math.sin(clock * 3) * S * .04;
    ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(bx, by, S * .11, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, S * .11, 0, Math.PI); ctx.fill();
  }
}

function drawHook(t) {
  const { x, y } = hook, glow = hookGrabbed || clock - hook.touchedAt < .3;
  if (hook.state === 'water') {   // minhoquinha
    ctx.strokeStyle = '#ff8fa8'; ctx.lineWidth = S * .08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - S * .1, y + S * .12);
    ctx.quadraticCurveTo(x - S * .02 + Math.sin(t * 6) * S * .05, y + S * .24, x + S * .08, y + S * .16); ctx.stroke();
  }
  if (glow) { ctx.fillStyle = 'rgb(255 255 255 / .25)'; circle(ctx, x, y + S * .05, S * .45); ctx.fill(); }
  ctx.strokeStyle = '#d7dde8'; ctx.lineWidth = S * .05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - S * .12); ctx.lineTo(x, y + S * .12); ctx.arc(x - S * .1, y + S * .12, S * .1, 0, Math.PI * .95); ctx.stroke();
}

// ---------- desenho ----------
function drawFishes(t) { for (const f of fishes) drawOneFish(f, t); }

function drawOneFish(f, t) {
  ctx.save(); ctx.translate(f.x, f.y);
  if (f.mode === 'hook') ctx.rotate(-Math.PI / 2 + Math.sin(t * 14) * .3);   // pendurado, de cabeça pra cima
  else {
    const spin = Math.min((clock - f.spinAt) / .7, 1);
    ctx.rotate(Math.atan2(f.vy, Math.abs(f.vx) + S) * .5 * f.dir + (spin >= 0 && spin < 1 ? spin * TAU * f.dir : 0));
    ctx.scale(Math.abs(f.flip) < .15 ? .15 * Math.sign(f.flip || 1) : f.flip, 1);
  }
  const since = clock - f.blinkAt;
  paintFish(ctx, f.d, f.s, t, f, since < .16 ? Math.max(.1, Math.abs(since / .08 - 1)) : 1);
  ctx.restore();
}

// peixinho olhando pra direita, centro em (0, 0), s = comprimento
function paintFish(g, d, s, t, f, blink) {
  const [rx, ry] = FISH_SHAPE[d.kind].map(k => k * s), wag = Math.sin(t * (f.fast || f.mode === 'hook' ? 18 : 8) + f.ph) * .35;
  g.save(); g.translate(-rx * .85, 0); g.rotate(wag);   // rabo
  g.fillStyle = d.fin; g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(-s * .18, -ry * 1.1, -s * .3, -ry * 1.05); g.quadraticCurveTo(-s * .22, 0, -s * .3, ry * 1.05); g.quadraticCurveTo(-s * .18, ry * 1.1, 0, 0);
  g.fill(); g.restore();
  g.fillStyle = d.fin;   // nadadeiras de cima (e de baixo, no alto)
  g.beginPath(); g.moveTo(-rx * .55, -ry * .7); g.quadraticCurveTo(-rx * .3, -ry * (d.kind === 'tall' ? 1.9 : 1.55), rx * .35, -ry * .8); g.fill();
  if (d.kind === 'tall') { g.beginPath(); g.moveTo(-rx * .55, ry * .7); g.quadraticCurveTo(-rx * .3, ry * 1.8, rx * .3, ry * .8); g.fill(); }
  g.fillStyle = d.body; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.save(); g.clip();
  g.fillStyle = d.belly; g.beginPath(); g.ellipse(rx * .1, ry * .8, rx * .95, ry * .55, 0, 0, TAU); g.fill();
  if (d.pattern === 'stripes') {
    for (const px of [-.45, .1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(px * rx, 0, rx * .13, ry * 1.2, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgb(40 30 60 / .35)'; g.lineWidth = s * .015; g.stroke();
    }
  } else if (d.pattern === 'spots') {
    g.fillStyle = 'rgb(255 255 255 / .4)';
    for (const [px, py, pr] of [[-.45, -.3, .08], [-.15, -.5, .05], [-.6, .15, .05], [-.25, 0, .065]]) { circle(g, px * rx, py * ry, pr * s); g.fill(); }
  }
  g.restore();
  g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.ellipse(-rx * .1, -ry * .55, rx * .45, ry * .13, -.1, 0, TAU); g.fill();
  g.save(); g.translate(-rx * .05, ry * .25); g.rotate(.5 + Math.sin(t * 6 + f.ph) * .35);   // nadadeira do lado
  g.fillStyle = d.fin; g.beginPath(); g.ellipse(-s * .06, 0, s * .09, s * .045, 0, 0, TAU); g.fill(); g.restore();
  const ex = rx * .45, ey = -ry * .2, er = s * .1;
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, er, er * blink, 0, 0, TAU); g.fill();
  if (blink > .3) {
    g.fillStyle = '#2b2140'; circle(g, ex + er * .28, ey, er * .6); g.fill();
    g.fillStyle = '#fff'; circle(g, ex + er * .42, ey - er * .25, er * .22); g.fill();
  }
  g.fillStyle = 'rgb(255 110 150 / .45)'; circle(g, rx * .5, ry * .35, s * .05); g.fill();
  g.strokeStyle = '#2b2140'; g.lineWidth = s * .025; g.lineCap = 'round';
  if (f.mouth > .05 || f.mode === 'hook') { g.fillStyle = '#7a2438'; circle(g, rx * .88, ry * .1, s * (.02 + .035 * Math.max(f.mouth, .5))); g.fill(); }
  else { g.beginPath(); g.arc(rx * .72, 0, s * .07, .25, 1.35); g.stroke(); }
}
