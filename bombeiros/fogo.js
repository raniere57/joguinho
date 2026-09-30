'use strict';
// o fogo nas janelas e no telhado, a fumaça que sobe e o jato d'água da mangueira até o dedo.

const FLAME_DRAIN = .75;   // quanto de fogo o jato apaga por segundo
let flames = [], smoke = [], jet = null;

function lightFires(ids) {
  const sp = houseSpots();
  flames = ids.map(id => ({ id, ...sp[id], s: 1, size: Math.min(sp[id].w, sp[id].h * 1.3) * 1.25, outAt: -1, hitAt: -9, seed: rand(0, 9) }));
}

const burning = () => flames.filter(f => f.s > 0);

function drawFlame(x, y, size, k, t, seed) {
  if (k <= 0) return;
  const s = size * (.35 + .65 * k);
  const layers = [['#ff5a2e', 1], ['#ff9f1c', .72], ['#ffe03a', .45]];
  layers.forEach(([c, m], i) => {
    const wob = Math.sin(t * 9 + seed + i) * s * .06, h = s * m * (1.1 + Math.sin(t * 11 + seed * 2 + i) * .08);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - s * m * .45, y);
    ctx.quadraticCurveTo(x - s * m * .55, y - h * .55, x + wob, y - h);
    ctx.quadraticCurveTo(x + s * m * .55, y - h * .55, x + s * m * .45, y);
    ctx.quadraticCurveTo(x, y + s * m * .25, x - s * m * .45, y);
    ctx.fill();
  });
  for (let i = 0; i < 2; i++) {   // linguinhas soltas
    const ph = (t * 1.5 + seed + i * .5) % 1;
    ctx.globalAlpha = 1 - ph; ctx.fillStyle = '#ff9f1c';
    circle(ctx, x + Math.sin(seed + i * 3) * s * .3, y - s * (1 + ph * .5), s * .08 * (1 - ph)); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFires(t) {
  for (const f of flames) {
    if (f.win && f.s > 0) {   // janela acesa por dentro
      ctx.fillStyle = `rgb(255 140 40 / ${.35 + .15 * Math.sin(t * 8 + f.seed)})`;
      if (f.round) { circle(ctx, f.x, f.y, f.w * .5); ctx.fill(); }
      else ctx.fillRect(f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
    }
    const shake = clock - f.hitAt < .15 ? Math.sin(t * 60) * f.size * .03 : 0;
    drawFlame(f.x + shake, f.y + f.h * .35, f.size, f.s, t, f.seed);
  }
}

// ---------- fumaça ----------
function puff(x, y, size, dark) {
  smoke.push({ x, y, s: size * rand(.6, 1), vx: rand(-.3, .3) * size, vy: -size * rand(.8, 1.3), at: clock, life: rand(1.6, 2.4), c: dark ? rand(90, 130) : rand(215, 240) });
  if (smoke.length > 70) smoke.shift();
}

function updateSmoke(dt, t) {
  for (const f of burning()) if (Math.random() < dt * 3 * f.s) puff(f.x + rand(-.2, .2) * f.size, f.y - f.size * .8, f.size * .35, true);
  for (const p of smoke) { p.x += (p.vx + Math.sin(t + p.at) * p.s * .3) * dt; p.y += p.vy * dt; }
  smoke = smoke.filter(p => clock - p.at < p.life);
}

function drawSmoke() {
  for (const p of smoke) {
    const k = (clock - p.at) / p.life;
    ctx.fillStyle = `rgb(${p.c} ${p.c} ${p.c + 8} / ${.45 * (1 - k)})`;
    circle(ctx, p.x, p.y, p.s * (1 + k * 1.5)); ctx.fill();
  }
}

// ---------- jato d'água ----------
function nozzle() {
  const [x, y] = L.stand, r = L.r;
  return [x - r * .9, y - r * 1.05];
}

// o jato vai do bico até o dedo fazendo um arco; apaga o fogo perto da ponta
function spray(x, y, dt) {
  jet = { x, y, at: clock };
  let hit = null;
  for (const f of burning()) {
    if (Math.hypot(x - f.x, y - (f.y - f.size * .1)) > f.size * .85 + L.r * .4) continue;
    f.s = Math.max(0, f.s - dt * FLAME_DRAIN); f.hitAt = clock; hit = f;
    if (Math.random() < dt * 14) puff(f.x + rand(-.3, .3) * f.size, f.y - f.size * .3, f.size * .3, false);
    if (f.s === 0) extinguish(f);
  }
  if (Math.random() < dt * 25) addParticle({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-60, 60), vy: rand(-80, 20), life: .5, decay: 2, size: rand(2, 4), color: pick(['#bfe6ff', '#8fd6ff', '#ffffff']), star: false, rot: 0, vr: 0 });
  return hit;
}

function extinguish(f) {
  f.outAt = clock;
  for (let i = 0; i < 8; i++) puff(f.x + rand(-.4, .4) * f.size, f.y - rand(0, .5) * f.size, f.size * .4, false);
  sfx.blow(); setTimeout(() => sfx.chime(), 150);
  fireOut(f);
}

function drawJet(t) {
  if (!jet || clock - jet.at > .08) return;
  const [nx, ny] = nozzle(), { x, y } = jet, mx = (nx + x) / 2, my = Math.min(ny, y) - Math.hypot(x - nx, y - ny) * .25;
  const wob = Math.sin(t * 40) * 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgb(90 180 255 / .85)'; ctx.lineWidth = L.r * .28;
  ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(mx + wob, my, x, y); ctx.stroke();
  ctx.strokeStyle = 'rgb(255 255 255 / .8)'; ctx.lineWidth = L.r * .1;
  ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(mx + wob, my, x, y); ctx.stroke();
  ctx.fillStyle = 'rgb(200 235 255 / .8)';
  for (let i = 0; i < 5; i++) { circle(ctx, x + Math.sin(t * 30 + i * 2) * L.r * .3, y + Math.cos(t * 27 + i) * L.r * .3, L.r * .1); ctx.fill(); }
}
