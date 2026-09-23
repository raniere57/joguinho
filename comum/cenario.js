'use strict';
// cenário ao ar livre: céu, sol sorridente, nuvens, passarinhos, morros com flores e arco-íris

const RAINBOW = ['#ff4d4d', '#ff9f1c', '#ffe03a', '#5ad16e', '#3fa9ff', '#8a6cff'];
const RAINBOW_LIFE = 3.2;
const BIRD_COLORS = [['#4fb4ff', '#2b8ae0'], ['#ff8fb8', '#ee5c96'], ['#ffd23f', '#eea600']];
const PUFFS = [[.22, .40, .16], [.42, .30, .22], [.64, .36, .18], [.80, .44, .13], [.50, .44, .16]];

let sky = null, birds = [], rainbowAt = -99;

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

function flower(g, x, y, s) {
  g.fillStyle = pick(['#fff', '#ffe2f0', '#fff3a8']);
  for (let p = 0; p < 5; p++) { circle(g, x + Math.cos(p * TAU / 5) * s, y + Math.sin(p * TAU / 5) * s, s * .75); g.fill(); }
  g.fillStyle = '#ffb020'; circle(g, x, y, s * .6); g.fill();
}

function flowers(g, surface, density = 1) {
  const n = Math.round(W / 40 * density), s = Math.min(W, H) * .014;
  for (let i = 0; i < n; i++) {
    const x = (i + Math.random()) * W / n, y =surface(x) + rand(s * 3, H - surface(x) - s * 2);
    flower(g, x, y, s);
  }
}

function buildSun(r) {
  const s = r * 1.9, [c, g] = layer(s * 2, s * 2);
  g.translate(s, s);
  const glow = g.createRadialGradient(0, 0, r * .8, 0, 0, s);
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

function buildCloud(w) {
  const [c, g] = layer(w, w * .64);
  g.fillStyle = '#d3e9fc';
  for (const [x, y, r] of PUFFS) { circle(g, x * w, (y + .03) * w, r * w); g.fill(); }
  g.fillStyle = '#fff';
  for (const [x, y, r] of PUFFS) { circle(g, x * w, y * w, r * w); g.fill(); }
  return c;
}

// ground = onde começa o chão (fração da altura); céu e morros em camadas separadas
// pra que o arco-íris e as bolhas possam nascer atrás dos morros
function buildSky(ground = .8) {
  const [bg, sg] = layer(W, H), [hills, g] = layer(W, H);
  const grad = sg.createLinearGradient(0, 0, 0, H * ground);
  grad.addColorStop(0, '#5ab8ff'); grad.addColorStop(.7, '#aee0ff'); grad.addColorStop(1, '#fff1c9');
  sg.fillStyle = grad; sg.fillRect(0, 0, W, H);
  hill(g, H * ground, H * .035, ['#b5ec8c', '#86d063'], 1.2, .6);
  flowers(g, hill(g, H * (ground + .07), H * .03, ['#7fd35a', '#4caf3c'], .8, 2.4), (1 - ground) / .2);

  const m = Math.min(W, H), sunR = Math.min(m * .09, 64);
  sky = {
    bg, hills, ground, sunR, sunX: W - sunR * 1.15, sunY: sunR * 1.35,
    sun: buildSun(sunR), rays: buildRays(sunR),
    clouds: Array.from({ length: 4 }, (_, i) => {
      const depth = rand(.55, 1), sprite = buildCloud(m * .55 * depth);
      return { sprite, x: rand(-sprite.w, W), y: H * ground * (.08 + i * .19) + rand(0, H * .04), speed: 14 * depth, alpha: .55 + .45 * depth };
    }),
  };
}

function spawnBird() {
  const dir = Math.random() < .5 ? 1 : -1, s = R * rand(.3, .38), [body, wing] = pick(BIRD_COLORS);
  birds.push({ x: dir > 0 ? -s * 2 : W + s * 2, y: H * sky.ground * rand(.18, .55), dir, s, body, wing,
    speed: W * rand(.08, .12), phase: rand(0, TAU), sang: false });
}

// passarinho que a criança tocou: canta e solta estrelinhas
function tapBird(x, y) {
  const b = birds.find(b => Math.hypot(x - b.x, y - b.y) < b.s * 2.4);
  if (!b) return false;
  sfx.chirp(b.x / W * 2 - 1);
  burst(b.x, b.y, b.s, 50, 8);
  return true;
}

function updateSky(dt) {
  for (const c of sky.clouds) {
    c.x += c.speed * dt;
    if (c.x > W) c.x = -c.sprite.w;
  }
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

// fundo: céu, nuvens, passarinhos e sol
function drawSkyBack(t) {
  ctx.drawImage(sky.bg, 0, 0, W, H);
  for (const c of sky.clouds) {
    ctx.globalAlpha = c.alpha;
    ctx.drawImage(c.sprite, c.x, c.y, c.sprite.w, c.sprite.h);
  }
  ctx.globalAlpha = 1;
  for (const b of birds) drawBird(b, t);
  const rs = sky.rays.w;
  ctx.save();
  ctx.translate(sky.sunX, sky.sunY);
  ctx.rotate(t * .15);
  ctx.drawImage(sky.rays, -rs / 2, -rs / 2, rs, rs);
  ctx.restore();
  ctx.drawImage(sky.sun, sky.sunX - rs / 2, sky.sunY - rs / 2, rs, rs);
}

function drawHills() { ctx.drawImage(sky.hills, 0, 0, W, H); }

function startRainbow() { rainbowAt = clock; }

function drawRainbow(cy = H * (sky.ground + .02)) {
  const age = clock - rainbowAt;
  if (age > RAINBOW_LIFE) return;
  const reveal = Math.min(age / 1.1, 1), e = 1 - (1 - reveal) ** 3;
  const band = Math.min(W, H) * .045, r0 = Math.min(W * .62, cy * .67);
  ctx.globalAlpha = age > RAINBOW_LIFE - .7 ? (RAINBOW_LIFE - age) / .7 : .9;
  ctx.lineWidth = band + 1;
  RAINBOW.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(W / 2, cy, r0 - i * band, Math.PI, Math.PI + Math.PI * e);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}
