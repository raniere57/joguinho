'use strict';
// mundo da fazenda: mais largo que a tela (a criança arrasta pro lado). Aqui ficam o chão, o celeiro, o moinho,
// a macieira, a horta, o trator, o sol que vira lua e as nuvens que chovem.

const HORIZON = .4;                  // onde o céu encontra os morros (fração da altura)
const WORLD_PORTRAIT = 2.6, WORLD_LANDSCAPE = 1.45;
// posições em fração da largura do mundo (x) e da altura da tela (y)
const SPOT = {
  barn: [.12, .52], doghouse: [.335, .6], nest: [.13, .775], flowersA: [.04, .9], flowersB: [.5, .93],
  windmill: [.47, .455], fence: [.36, .69, .565], pond: [.61, .845, .075, .055], mud: [.705, .805, .05, .022],
  tree: [.79, .63], tractor: [.93, .5], plots: [.86, .915, .97], plotY: .92,
};
const APPLES = [[-.5, -.9], [.4, -1.1], [.05, -.5], [.6, -.55], [-.3, -1.35]];
const RAIN_TIME = 3;

let worldW = 0, camX = 0, S = 60;
let land = null, sunSprite = null, raysSprite = null, sunR = 40;
let fluff = [], drops = [], night = 0, isNight = false, sunTapAt = -99, moonTapAt = -99;
let mill = { a: 0, boost: 0 }, tree = { shakeAt: -9, apples: 5, regrowAt: 0 }, fallen = [];
let barnState = { openAt: -99 }, tractorState = { driveAt: -99, x: 0 }, plots = [];
const clamp01 = v => Math.min(Math.max(v, 0), 1);
const wX = f => f * worldW;

// ---------- chão (uma imagem só, do tamanho do mundo) ----------
function wavy(g, base, amp, colors, cycles, phase) {
  const grad = g.createLinearGradient(0, base - amp, 0, H);
  grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= worldW + 8; x += 8) g.lineTo(x, base + Math.sin(x / worldW * TAU * cycles + phase) * amp);
  g.lineTo(worldW, H); g.fillStyle = grad; g.fill();
  g.beginPath();
  for (let x = 0; x <= worldW + 8; x += 8) g.lineTo(x, base + Math.sin(x / worldW * TAU * cycles + phase) * amp + 2);
  g.lineWidth = 3; g.strokeStyle = 'rgb(255 255 255 / .35)'; g.stroke();
}

function buildLand() {
  const [c, g] = layer(worldW, H);
  wavy(g, H * HORIZON, H * .03, ['#b5ec8c', '#86d063'], 3.2, .6);
  wavy(g, H * (HORIZON + .065), H * .022, ['#8fdc62', '#5bb846'], 2.2, 2.1);
  drawPath(g);
  for (let i = 0; i < worldW / 26; i++) {           // florzinhas espalhadas
    const x = rand(0, worldW), y = rand(H * .55, H);
    g.fillStyle = pick(['#fff', '#ffe2f0', '#fff3a8']);
    for (let p = 0; p < 5; p++) { circle(g, x + Math.cos(p * TAU / 5) * 4, y + Math.sin(p * TAU / 5) * 4, 3); g.fill(); }
    g.fillStyle = '#ffb020'; circle(g, x, y, 2.4); g.fill();
  }
  drawFence(g);
  drawPondBase(g);
  drawMud(g);
  drawNest(g);
  drawDoghouse(g);
  for (const k of ['flowersA', 'flowersB']) drawFlowerPatch(g, wX(SPOT[k][0]), H * SPOT[k][1]);
  return c;
}

// caminho de terra ligando o celeiro à horta
function drawPath(g) {
  g.lineCap = 'round';
  for (const [w, color] of [[S * .7, '#d9b77a'], [S * .45, '#ecd19b']]) {
    g.strokeStyle = color; g.lineWidth = w;
    g.beginPath(); g.moveTo(wX(.12), H * .56);
    g.bezierCurveTo(wX(.3), H * .9, wX(.55), H * .6, wX(.72), H * .72);
    g.bezierCurveTo(wX(.82), H * .78, wX(.88), H * .84, wX(.92), H * .86);
    g.stroke();
  }
}

function drawFence(g) {
  const [a, b, fy] = SPOT.fence, y = H * fy, h = S * .55;
  g.fillStyle = '#c98b4f'; g.strokeStyle = '#8a5a2e'; g.lineWidth = 1.5;
  for (const dy of [.22, .62]) g.fillRect(wX(a), y - h + h * dy, wX(b) - wX(a), h * .14);
  for (let x = wX(a); x <= wX(b) + 1; x += S * .8) { g.beginPath(); g.roundRect?.(x - 4, y - h, 8, h + 4, 3); g.fill(); g.stroke(); }
}

function drawPondBase(g) {
  const [x, y, rx, ry] = SPOT.pond, px = wX(x), py = H * y, a = wX(rx), b = H * ry;
  g.fillStyle = '#6cc36a';
  g.beginPath(); g.ellipse(px, py + 4, a + 8, b + 8, 0, 0, TAU); g.fill();
  const grad = g.createRadialGradient(px - a * .3, py - b * .4, 4, px, py, a);
  grad.addColorStop(0, '#bfeaff'); grad.addColorStop(1, '#4aa8e8');
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(px, py, a, b, 0, 0, TAU); g.fill();
  g.fillStyle = '#4fae4a';                            // taboas na beirada
  for (const dx of [-1.05, -.95, 1.02]) { g.fillRect(px + dx * a, py - b - S * .5, 3, S * .6); g.fillStyle = '#8a5a35'; g.fillRect(px + dx * a - 2, py - b - S * .55, 7, S * .2); g.fillStyle = '#4fae4a'; }
}

// vitórias-régias onde o sapo pula
function lilyPads() {
  const [x, y, rx, ry] = SPOT.pond;
  return [[wX(x) - wX(rx) * .45, H * y + H * ry * .25], [wX(x) + wX(rx) * .5, H * y - H * ry * .1]];
}

function drawMud(g) {
  const [x, y, rx, ry] = SPOT.mud;
  g.fillStyle = '#8a5a35';
  g.beginPath(); g.ellipse(wX(x), H * y, wX(rx), H * ry, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .18)';
  g.beginPath(); g.ellipse(wX(x) - wX(rx) * .3, H * y - H * ry * .3, wX(rx) * .3, H * ry * .3, 0, 0, TAU); g.fill();
}

function drawNest(g) {
  const x = wX(SPOT.nest[0]), y = H * SPOT.nest[1];
  g.fillStyle = '#c8954a';
  g.beginPath(); g.ellipse(x, y, S * .75, S * .22, 0, 0, TAU); g.fill();
  g.strokeStyle = '#9b6a2c'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const a = -S * .6 + i * S * .15; g.beginPath(); g.moveTo(x + a, y - S * .12); g.lineTo(x + a + S * .2, y + S * .1); g.stroke(); }
}

function drawDoghouse(g) {
  const x = wX(SPOT.doghouse[0]), y = H * SPOT.doghouse[1], w = S * 1.1, h = S * .8;
  g.fillStyle = '#4fa3e8'; g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle = '#e8574d';
  g.beginPath(); g.moveTo(x - w * .62, y - h + 2); g.lineTo(x, y - h - w * .45); g.lineTo(x + w * .62, y - h + 2); g.fill();
  g.fillStyle = '#2a3350';
  g.beginPath(); g.moveTo(x - w * .2, y); g.lineTo(x - w * .2, y - h * .45); g.arc(x, y - h * .45, w * .2, Math.PI, 0); g.lineTo(x + w * .2, y); g.fill();
}

function flowerSpots() { return ['flowersA', 'flowersB'].map(k => [wX(SPOT[k][0]), H * SPOT[k][1]]); }
function drawFlowerPatch(g, x, y) {
  for (let i = 0; i < 7; i++) {
    const fx = x + (i - 3) * S * .28, fy = y + (i % 2) * S * .15;
    g.strokeStyle = '#3f9a3a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(fx, fy + S * .2); g.lineTo(fx, fy); g.stroke();
    g.fillStyle = ['#ff5f7e', '#ffc930', '#b77cff', '#4fb4ff'][i % 4];
    for (let p = 0; p < 5; p++) { circle(g, fx + Math.cos(p * TAU / 5) * S * .09, fy + Math.sin(p * TAU / 5) * S * .09, S * .075); g.fill(); }
    g.fillStyle = '#fff5b0'; circle(g, fx, fy, S * .05); g.fill();
  }
}

// ---------- celeiro, com portas que abrem pro cavalo ----------
function barnBox() { const w = S * (H > W ? 2.9 : 2.2); return { x: wX(SPOT.barn[0]), y: H * SPOT.barn[1], w, h: w * .7 }; }
function barnOpen() {
  const age = clock - barnState.openAt;
  if (age > GALLOP_TIME + .8) return 0;
  return age < .4 ? age / .4 : age > GALLOP_TIME + .4 ? 1 - (age - GALLOP_TIME - .4) / .4 : 1;
}
function loftSpot() { const b = barnBox(); return [b.x, b.y - b.h - b.w * .02]; }

function drawBarn() {
  const { x, y, w, h } = barnBox(), open = barnOpen();
  ctx.fillStyle = '#d9433b'; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = 'rgb(0 0 0 / .06)';
  for (let i = 1; i < 8; i++) ctx.fillRect(x - w / 2 + i * w / 8, y - h, 2, h);
  const roof = [[x - w * .6, y - h + 2], [x - w * .38, y - h - w * .34], [x + w * .38, y - h - w * .34], [x + w * .6, y - h + 2]];
  ctx.fillStyle = '#a8302a';
  ctx.beginPath(); roof.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, w * .025); ctx.lineJoin = 'round';
  ctx.beginPath(); roof.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  // janelinha do sótão (o gato mora aqui)
  ctx.fillStyle = '#4a2418';
  ctx.beginPath(); ctx.roundRect?.(x - w * .12, y - h - w * .22, w * .24, w * .2, w * .04); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  const dw = w * .44, dh = h * .7, dx = x - dw / 2, dy = y - dh;
  ctx.fillStyle = '#4a2418'; ctx.fillRect(dx, dy, dw, dh);
  if (open > 0 && clock - barnState.openAt < .9) drawSprite('🐴', x, y, S * 1.3 * easeOutBack(clamp01(open)), false);
  for (const side of [-1, 1]) {
    const pw = dw / 2 * (1 - open * .85), px = side < 0 ? dx : dx + dw - pw;
    ctx.fillStyle = '#e8574d'; ctx.fillRect(px, dy, pw, dh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, w * .02);
    ctx.strokeRect(px, dy, pw, dh);
    ctx.beginPath(); ctx.moveTo(px, dy); ctx.lineTo(px + pw, dy + dh); ctx.moveTo(px + pw, dy); ctx.lineTo(px, dy + dh); ctx.stroke();
  }
}

// ---------- moinho que gira mais rápido quando toca ----------
function millBox() { return { x: wX(SPOT.windmill[0]), y: H * SPOT.windmill[1], h: S * (H > W ? 2.6 : 1.9) }; }
function drawMill(dt) {
  const { x, y, h } = millBox(), w = h * .36;
  mill.boost = Math.max(0, mill.boost - dt * 1.2);
  mill.a += (.5 + mill.boost * 4) * dt;
  ctx.fillStyle = '#f4ead8';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * .32, y - h); ctx.lineTo(x + w * .32, y - h); ctx.lineTo(x + w / 2, y); ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.moveTo(x - w * .45, y - h + 2); ctx.lineTo(x, y - h - w * .5); ctx.lineTo(x + w * .45, y - h + 2); ctx.fill();
  ctx.fillStyle = '#8a5a35'; ctx.fillRect(x - w * .13, y - h * .3, w * .26, h * .3);
  const hx = x, hy = y - h * .95;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(mill.a);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#b08a60'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(w * .08, -w * .15, h * .5, w * .3); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#6b4a2a'; circle(ctx, 0, 0, w * .12); ctx.fill();
  ctx.restore();
}

// ---------- macieira: balança e derruba maçã ----------
function treeBox() { return { x: wX(SPOT.tree[0]), y: H * SPOT.tree[1], r: S * 1.15 }; }
function drawTree(t) {
  const { x, y, r } = treeBox(), shake = clock - tree.shakeAt < .6 ? Math.sin((clock - tree.shakeAt) * 40) * .06 : Math.sin(t * .8) * .01;
  if (tree.apples < APPLES.length && clock > tree.regrowAt) { tree.apples++; tree.regrowAt = clock + 6; }
  ctx.fillStyle = '#8a5a35';
  ctx.beginPath(); ctx.moveTo(x - r * .18, y); ctx.lineTo(x - r * .12, y - r * 1.1); ctx.lineTo(x + r * .12, y - r * 1.1); ctx.lineTo(x + r * .18, y); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(shake); ctx.translate(-x, -y);
  ctx.fillStyle = '#4fb248';
  for (const [dx, dy, k] of [[-.55, -1.1, .7], [.55, -1.1, .7], [0, -1.55, .8], [0, -.9, .75]]) { circle(ctx, x + dx * r, y + dy * r - r * .3, r * k); ctx.fill(); }
  ctx.fillStyle = '#e83a3a';
  for (let i = 0; i < tree.apples; i++) {
    const [dx, dy] = APPLES[i];
    circle(ctx, x + dx * r, y + dy * r - r * .3, r * .13); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .5)'; circle(ctx, x + dx * r - r * .04, y + dy * r - r * .34, r * .04); ctx.fill(); ctx.fillStyle = '#e83a3a';
  }
  ctx.restore();
}

function shakeTree() {
  tree.shakeAt = clock;
  sfx.whoosh();
  if (!tree.apples) return false;
  tree.apples--;
  tree.regrowAt = clock + 6;
  const { x, y, r } = treeBox(), [dx, dy] = APPLES[tree.apples];
  fallen.push({ x: x + dx * r, y0: y + dy * r - r * .3, y1: y + S * .5 + rand(0, S * .3), t: 0, rollX: rand(-1, 1) * S * .6 });
  return true;
}

function drawFallen(dt) {
  for (const f of fallen) {
    f.t += dt;
    const p = clamp01(f.t / .7), b = (x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; return n * (x -= 2.625 / d) * x + .984375; })(p);
    f.cx = f.x + f.rollX * p; f.cy = f.y0 + (f.y1 - f.y0) * b;
    drawSprite('🍎', f.cx, f.cy + S * .2, S * .45, false, p * 4);
  }
}

// ---------- horta: 0 terra, 1 broto, 2 folhas, 3 cenoura pronta ----------
function buildPlots() { return SPOT.plots.map((x, i) => ({ x: wX(x), y: H * SPOT.plotY, stage: plots[i]?.stage ?? 1, at: -9 })); }
function drawPlot(p, t) {
  const rx = Math.min(worldW * .03, S * .75);
  ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, S * .22, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#946038'; ctx.beginPath(); ctx.ellipse(p.x, p.y - S * .04, rx * .8, S * .13, 0, 0, TAU); ctx.fill();
  if (!p.stage) return;
  const k = easeOutBack(clamp01((clock - p.at) / .4)), sway = Math.sin(t * 2 + p.x) * .08;
  if (p.stage === 3) { drawSprite('🥕', p.x, p.y + S * .15, S * .8 * k, false, Math.PI * .85 + sway); return; }
  drawSprite(p.stage === 1 ? '🌱' : '🌿', p.x, p.y, S * (p.stage === 1 ? .5 : .7) * k, false, sway);
}

function growPlot(p) {
  if (p.stage >= 3) return false;
  p.stage++; p.at = clock;
  burst(p.x - camX, p.y, S * .3, 100, 8);
  return true;
}

// ---------- trator ----------
const DRIVE_TIME = 7;
function drawTractor(t) {
  const age = clock - tractorState.driveAt, home = wX(SPOT.tractor[0]), y = H * SPOT.tractor[1];
  let x = home, dir = false;
  if (age < DRIVE_TIME) {
    const p = age / DRIVE_TIME, far = wX(.05);
    const go = p < .5 ? p * 2 : 2 - p * 2, e = go * go * (3 - 2 * go);
    x = home + (far - home) * e; dir = p >= .5;
    if (Math.random() < frameDt * 5) puffs.push({ x: x + (dir ? -1 : 1) * S * .3, y: y - S * .9, t: 0 });
  }
  tractorState.x = x;
  shadowAt(x, y, S * .5);
  drawSprite('🚜', x, y + (age < DRIVE_TIME ? Math.sin(t * 25) * 1.5 : 0), S * 1.15, dir);
}

// ---------- céu: sol que vira lua, nuvens que chovem ----------
function sunPos() { return { x: W - sunR * 1.4, y: sunR * 1.6 + Math.max(0, (visualViewport?.offsetTop || 0)) }; }

function buildSkyBits() {
  sunR = Math.min(Math.min(W, H) * .09, 60);
  sunSprite = buildSun(sunR); raysSprite = buildRays(sunR);
  const span = W + (worldW - W) * .3 + W * .5;
  if (!fluff.length) {
    fluff = Array.from({ length: 5 }, (_, i) => {
      const sprite = buildCloud(Math.min(W, H) * rand(.32, .45));
      return { sprite, x: (i / 5) * span, y: H * HORIZON * rand(.12, .6), speed: rand(6, 12), rainUntil: -9, wet: false };
    });
  }
}

function cloudScreenX(c) { return c.x - camX * .3; }

function updateFarmSky(dt) {
  const span = W + (worldW - W) * .3 + W * .5;
  for (const c of fluff) {
    c.x += c.speed * dt;
    if (c.x > span) c.x -= span + c.sprite.w;
    if (c.rise) { c.y += (c.rise - c.y) * Math.min(dt * 1.5, 1); c.scale = Math.min(1, (c.scale || .3) + dt * .5); }
    if (clock < c.rainUntil && Math.random() < .8) {
      const sx = cloudScreenX(c);
      drops.push({ x: sx + rand(c.sprite.w * .15, c.sprite.w * .85) + camX, y: c.y + c.sprite.h * .7, vy: H * .9 });
    }
  }
  for (const d of drops) d.y += d.vy * dt;
  drops = drops.filter(d => d.y < H);
  for (const p of puffs) { p.t += dt; p.y -= 25 * dt; }
  puffs = puffs.filter(p => p.t < 1.2);
  night += ((isNight ? 1 : 0) - night) * Math.min(dt * 1.2, 1);
}

// nuvem tocada chove em cima do que estiver embaixo dela
function tapCloud(x, y) {
  const c = fluff.find(c => { const sx = cloudScreenX(c), k = c.scale || 1; return x > sx && x < sx + c.sprite.w * k && y > c.y && y < c.y + c.sprite.h * k; });
  if (!c) return false;
  c.rainUntil = clock + RAIN_TIME;
  sfx.splash();
  const sx = cloudScreenX(c) + camX;
  let grew = false;
  for (const p of plots) if (p.x > sx - S * .5 && p.x < sx + c.sprite.w + S * .5) grew = growPlot(p) || grew;
  return { grew };
}

let puffs = [];
function drawFarmSky(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H * HORIZON);
  g.addColorStop(0, '#5ab8ff'); g.addColorStop(.7, '#aee0ff'); g.addColorStop(1, '#fff1c9');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (night > .01) {
    const n = ctx.createLinearGradient(0, 0, 0, H * HORIZON);
    n.addColorStop(0, '#0e1a4f'); n.addColorStop(1, '#3a3f8f');
    ctx.globalAlpha = night; ctx.fillStyle = n; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgb(255 250 210 / ${night * (.4 + .6 * Math.abs(Math.sin(t * 2 + i)))})`;
      circle(ctx, (Math.sin(i * 91.7) * .5 + .5) * W, (Math.sin(i * 37.3) * .5 + .5) * H * HORIZON * .9, 1.2 + (i % 3) * .6); ctx.fill();
    }
  }
  // sol desce atrás dos morros e a lua sobe (e vice-versa)
  const { x, y } = sunPos(), dip = H * .62;
  const laugh = clock - sunTapAt < 1.3 ? clock - sunTapAt : 0, rs = raysSprite.w;
  const sy = y + night * dip;
  ctx.save(); ctx.translate(x, sy); ctx.rotate(t * .15 + laugh * 6); ctx.drawImage(raysSprite, -rs / 2, -rs / 2, rs, rs); ctx.restore();
  const k = 1 + Math.sin(laugh * 12) * .08 * (laugh > 0);
  ctx.drawImage(sunSprite, x - rs / 2 * k, sy - rs / 2 * k, rs * k, rs * k);
  const my = y + (1 - night) * dip, mk = 1 + (clock - moonTapAt < .6 ? Math.sin((clock - moonTapAt) * 20) * .08 : 0);
  ctx.fillStyle = 'rgb(255 250 220 / .25)'; circle(ctx, x, my, sunR * 1.6 * mk); ctx.fill();
  ctx.fillStyle = '#fff6cc'; circle(ctx, x, my, sunR * mk); ctx.fill();
  ctx.fillStyle = '#e8dca6';
  for (const [dx, dy, r] of [[-.3, -.2, .2], [.25, .25, .14], [.35, -.35, .1]]) { circle(ctx, x + dx * sunR, my + dy * sunR, r * sunR); ctx.fill(); }
  for (const c of fluff) {
    const k2 = c.scale || 1;
    ctx.globalAlpha = .9 - night * .4;
    ctx.drawImage(c.sprite, cloudScreenX(c), c.y, c.sprite.w * k2, c.sprite.h * k2);
  }
  ctx.globalAlpha = 1;
}

function drawRain() {
  ctx.strokeStyle = 'rgb(120 180 255 / .8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const d of drops) { ctx.moveTo(d.x - camX, d.y); ctx.lineTo(d.x - camX, d.y + 10); }
  ctx.stroke();
  for (const p of puffs) { ctx.fillStyle = `rgb(220 220 230 / ${.7 * (1 - p.t / 1.2)})`; circle(ctx, p.x - camX, p.y, S * .12 * (1 + p.t * 2)); ctx.fill(); }
}

// chão escurece de noite (o céu já escureceu antes)
function drawNightTint() {
  if (night < .01) return;
  ctx.fillStyle = `rgb(20 24 70 / ${.45 * night})`;
  ctx.fillRect(0, H * HORIZON - H * .04, W, H);
}
