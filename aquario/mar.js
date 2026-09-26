'use strict';
// fundo do mar: céu, água com raios de luz, areia, corais, algas que balançam, bolhas,
// ondinhas na superfície, o baú do tesouro e o barquinho do gatinho pescador.

let S = 0, surfaceY = 0, floorY = 0, seaBg = null;
let bubbles = [], weeds = [], ripples = [];
const chest = { x: 0, y: 0, w: 0, openAt: -99 };
const rock = { x: 0, top: 0, w: 0 };
const boat = { x: 0, rockAt: -99 };
const CHEST_OPEN = 2.6;
const WEED_SPOTS = [.05, .27, .49, .63, .95];

function layoutSea() {
  const portrait = H > W;
  S = Math.min(Math.min(W, H) * .14, 90);
  surfaceY = Math.max(meter.y + 44, H * (portrait ? .17 : .21));
  floorY = H * (portrait ? .85 : .84);
  chest.w = S * 1.15; chest.x = W * .84; chest.y = floorY + (H - floorY) * .32;
  rock.w = S * 1.7; rock.x = W * .14; rock.top = floorY - S * .45;
  weeds = WEED_SPOTS.map((fx, i) => ({
    x: W * fx, h: S * (1.5 + (i * 7 % 5) * .32), phase: i * 1.7,
    color: i % 2 ? '#3fae5a' : '#5fc46a', wiggleAt: weeds[i]?.wiggleAt ?? -99,
  }));
  boat.x = Math.min(Math.max(boat.x || W / 2, S * 1.4), boatMaxX());
  if (hook.x) boat.x = boatGoal();
  seaBg = buildSea();
}

// área onde os peixes nadam
const waterBox = () => ({ x0: S * .9, x1: W - S * .9, y0: surfaceY + S * .75, y1: floorY - S * .7 });

// ---------- cenário parado (desenhado uma vez) ----------
function buildSea() {
  const [c, g] = layer(W, H);
  const sky = g.createLinearGradient(0, 0, 0, surfaceY);
  sky.addColorStop(0, '#8fd8ff'); sky.addColorStop(1, '#dff5ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, surfaceY);
  const cs = Math.min(S, surfaceY * .45);
  cloud(g, W * .84, surfaceY * .5, cs); cloud(g, W * .16, surfaceY * .6, cs * .75);
  const water = g.createLinearGradient(0, surfaceY, 0, H);
  water.addColorStop(0, '#5fd3f2'); water.addColorStop(.5, '#2f9fdc'); water.addColorStop(1, '#1d5fae');
  g.fillStyle = water; g.fillRect(0, surfaceY, W, H - surfaceY);
  // morros azulados lá no fundo
  g.fillStyle = 'rgb(20 70 140 / .25)';
  g.beginPath(); g.moveTo(0, floorY);
  for (let x = 0; x <= W; x += 10) g.lineTo(x, floorY - S * (.9 + .5 * Math.sin(x / W * 7 + 1) + .3 * Math.sin(x / W * 17)));
  g.lineTo(W, floorY); g.fill();
  coral(g, W * .4, floorY + 4, S * 1.1, '#ff7aa8');
  coral(g, W * .72, floorY + 4, S * .9, '#ffa24d');
  fanCoral(g, W * .56, floorY + 4, S * 1.2, '#b77cff');
  // areia com ondinhas, pedrinhas e conchas
  const sand = g.createLinearGradient(0, floorY, 0, H);
  sand.addColorStop(0, '#f7e2a6'); sand.addColorStop(1, '#e5bd72');
  g.fillStyle = sand;
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) g.lineTo(x, floorY + Math.sin(x / W * 9) * S * .08);
  g.lineTo(W, H); g.fill();
  for (let i = 0; i < 40; i++) {
    g.fillStyle = pick(['#d9ad62', '#c99a52', '#fff1c8', '#e0b2a0']);
    circle(g, rand(0, W), rand(floorY + S * .15, H), rand(1.5, 4)); g.fill();
  }
  for (const [fx, fy, hue] of [[.33, .5, 20], [.67, .75, 340], [.93, .55, 40]]) shell(g, W * fx, floorY + (H - floorY) * fy, S * .22, hue);
  // pedra do polvo
  g.fillStyle = '#7d8fb0';
  g.beginPath(); g.ellipse(rock.x, floorY + S * .1, rock.w / 2, S * .55, 0, Math.PI, TAU); g.fill();
  g.fillStyle = '#95a7c6';
  g.beginPath(); g.ellipse(rock.x - rock.w * .12, floorY - S * .15, rock.w * .28, S * .18, -.2, 0, TAU); g.fill();
  return c;
}

function cloud(g, x, y, s) {
  g.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-.45, .1, .32], [0, -.1, .45], [.45, .08, .35]]) { circle(g, x + dx * s, y + dy * s, r * s); g.fill(); }
  g.beginPath(); g.roundRect?.(x - s * .75, y, s * 1.5, s * .38, s * .19); g.fill();
}

function coral(g, x, y, s, color) {
  g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = s * .16;
  const branch = (bx, by, a, len, depth) => {
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
    if (depth) { branch(ex, ey, a - .45, len * .7, depth - 1); branch(ex, ey, a + .4, len * .7, depth - 1); }
    else { g.fillStyle = color; circle(g, ex, ey, s * .1); g.fill(); }
  };
  branch(x, y, -Math.PI / 2, s * .45, 2);
}

function fanCoral(g, x, y, s, color) {
  g.fillStyle = color; g.globalAlpha = .75;
  g.beginPath(); g.moveTo(x, y); g.arc(x, y - s * .15, s * .55, Math.PI * 1.1, Math.PI * 1.9); g.closePath(); g.fill();
  g.globalAlpha = 1; g.strokeStyle = 'rgb(255 255 255 / .35)'; g.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.15 + i * .11);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * s * .6, y - s * .15 + Math.sin(a) * s * .6); g.stroke();
  }
}

function shell(g, x, y, s, hue) {
  g.fillStyle = `hsl(${hue} 80% 82%)`;
  g.beginPath(); g.moveTo(x, y + s * .35); g.arc(x, y, s * .5, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
  g.strokeStyle = `hsl(${hue} 60% 65%)`; g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) { const a = Math.PI * (1.12 + i * .19); g.beginPath(); g.moveTo(x, y + s * .35); g.lineTo(x + Math.cos(a) * s * .48, y + Math.sin(a) * s * .48); g.stroke(); }
}

// ---------- coisas que mexem ----------
function drawRays(t) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const x = W * (.15 + i * .25) + Math.sin(t * .3 + i) * S * .5, a = .06 + .04 * Math.sin(t * .7 + i * 2);
    const g = ctx.createLinearGradient(0, surfaceY, 0, floorY);
    g.addColorStop(0, `rgb(255 255 255 / ${a})`); g.addColorStop(1, 'rgb(255 255 255 / 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - S * .3, surfaceY); ctx.lineTo(x + S * .3, surfaceY); ctx.lineTo(x + S * 1.4, floorY); ctx.lineTo(x + S * .2, floorY); ctx.fill();
  }
  ctx.restore();
}

function drawWeeds(t) {
  for (const w of weeds) {
    const hit = Math.max(0, 1 - (clock - w.wiggleAt) / 1.2), n = 7;
    ctx.strokeStyle = w.color; ctx.lineWidth = S * .17; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(w.x + side * S * .08, floorY + 6);
      for (let k = 1; k <= n; k++) {
        const f = k / n, sway = Math.sin(t * 1.3 + w.phase + f * 2.2 + side) * S * (.18 + hit * .5 * Math.sin(clock * 14)) * f;
        ctx.lineTo(w.x + side * S * .08 + sway, floorY + 6 - w.h * f * (side > 0 ? .8 : 1));
      }
      ctx.stroke();
    }
  }
}

function tapWeed(x, y) {
  const w = weeds.find(w => Math.abs(x - w.x) < S * .5 && y > floorY - w.h && y < floorY + S * .3);
  if (!w) return false;
  w.wiggleAt = clock; sfx.whoosh();
  for (let i = 0; i < 4; i++) addBubble(w.x + rand(-S * .3, S * .3), floorY - w.h * rand(.2, .9));
  return true;
}

function addBubble(x, y, r = S * rand(.07, .15)) {
  if (bubbles.length < 70) bubbles.push({ x, y, r, vy: -S * rand(.9, 1.6), ph: rand(0, TAU), t: 0 });
}

function updateBubbles(dt) {
  for (const b of bubbles) { b.t += dt; b.y += b.vy * dt; b.x += Math.sin(b.t * 3 + b.ph) * S * .35 * dt; }
  bubbles = bubbles.filter(b => b.y - b.r > surfaceY);
  if (Math.random() < dt * .7) { const w = pick(weeds); addBubble(w.x, floorY - w.h * rand(.1, .6)); }
  for (const r of ripples) r.t += dt;
  ripples = ripples.filter(r => r.t < 1.2);
}

function drawBubbles() {
  ctx.lineWidth = 1.6;
  for (const b of bubbles) {
    ctx.strokeStyle = 'rgb(255 255 255 / .8)'; ctx.fillStyle = 'rgb(255 255 255 / .14)';
    circle(ctx, b.x, b.y, b.r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgb(255 255 255 / .85)'; circle(ctx, b.x - b.r * .35, b.y - b.r * .35, b.r * .25); ctx.fill();
  }
}

function tapBubble(x, y) {
  const i = bubbles.findIndex(b => Math.hypot(b.x - x, b.y - y) < b.r + S * .25);
  if (i < 0) return false;
  const b = bubbles.splice(i, 1)[0];
  sfx.pop(); ring(b.x, b.y, b.r * 1.5); burst(b.x, b.y, b.r, 190, 6);
  return true;
}

// tchibum: gotas, ondinha e barulho
function splashAt(x) {
  sfx.splash(); ripples.push({ x, t: 0 });
  burst(x, surfaceY, S * .35, 195, 12);
}

function drawSurface(t) {
  ctx.fillStyle = 'rgb(255 255 255 / .25)';
  ctx.beginPath(); ctx.moveTo(0, surfaceY - 2);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, surfaceY + Math.sin(x / (S * 1.1) + t * 2) * S * .05);
  ctx.lineTo(W, surfaceY + S * .22); ctx.lineTo(0, surfaceY + S * .22); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, surfaceY + Math.sin(x / (S * 1.1) + t * 2) * S * .05);
  ctx.stroke();
  for (const r of ripples) {
    const k = r.t / 1.2;
    ctx.strokeStyle = `rgb(255 255 255 / ${.8 * (1 - k)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(r.x, surfaceY + 2, S * (.3 + k * 1.2), S * (.06 + k * .15), 0, 0, TAU); ctx.stroke();
  }
}

// ---------- baú ----------
function chestOpen() {
  const e = clock - chest.openAt;
  if (e < 0 || e > CHEST_OPEN) return 0;
  return Math.min(e / .25, 1, (CHEST_OPEN - e) / .4);
}

function drawChest(t) {
  const { x, y, w } = chest, h = w * .55, open = chestOpen();
  ctx.fillStyle = 'rgb(0 0 0 / .15)'; ctx.beginPath(); ctx.ellipse(x, y + 3, w * .6, w * .08, 0, 0, TAU); ctx.fill();
  if (open > 0) {   // brilho do tesouro
    ctx.fillStyle = `rgb(255 225 110 / ${.45 * open})`; circle(ctx, x, y - h, w * (.6 + .08 * Math.sin(t * 8))); ctx.fill();
    ctx.fillStyle = '#ffd23b'; for (const dx of [-.28, -.1, .1, .28]) { circle(ctx, x + dx * w, y - h - w * .04 * open, w * .1); ctx.fill(); }
    ctx.fillStyle = '#fff'; circle(ctx, x, y - h - w * .12 * open, w * .12); ctx.fill();
    ctx.fillStyle = 'rgb(255 200 230 / .8)'; circle(ctx, x - w * .03, y - h - w * .15 * open, w * .05); ctx.fill();
  }
  ctx.fillStyle = '#a0612e'; ctx.beginPath(); ctx.roundRect?.(x - w / 2, y - h, w, h, w * .06); ctx.fill();
  ctx.fillStyle = '#ffc93c';
  for (const dx of [-.36, .3]) ctx.fillRect(x + dx * w, y - h, w * .07, h);
  ctx.fillStyle = 'rgb(0 0 0 / .15)'; ctx.fillRect(x - w / 2, y - h * .45, w, h * .08);
  // tampa gira na dobradiça de trás
  ctx.save(); ctx.translate(x - w / 2, y - h); ctx.rotate(-open * 1.1);
  ctx.fillStyle = '#b8743a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h * .2);
  ctx.quadraticCurveTo(w / 2, -h * .95, w, -h * .2); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc93c'; ctx.fillRect(w * .14, -h * .55, w * .07, h * .55); ctx.fillRect(w * .8, -h * .45, w * .07, h * .45);
  ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.roundRect?.(w * .44, -h * .12, w * .12, h * .2, 3); ctx.fill();
  ctx.restore();
}

function hitChest(x, y) { return Math.abs(x - chest.x) < chest.w * .7 && y > chest.y - chest.w * .9 && y < chest.y + S * .2; }

function openChest() {
  if (chestOpen() > 0) return;
  chest.openAt = clock;
  sfx.chime();
  setTimeout(() => sfx.bell(1046.5), 180);
  burst(chest.x, chest.y - chest.w * .6, S * .4, 45, 16);
  for (let i = 0; i < 8; i++) addBubble(chest.x + rand(-chest.w * .3, chest.w * .3), chest.y - chest.w * .5, S * rand(.08, .18));
}

// ---------- barquinho ----------
const ROD = 1.3;   // ponta da vara, em S, à direita do barco (peixe pendurado fica fora do casco)
const boatMaxX = () => W - S * (ROD + .5);

// onde o barco quer ficar: embaixo do anzol, mas sem esconder as estrelas do placar (tela deitada)
function boatGoal() {
  const x = Math.min(Math.max(hook.x - S * ROD, S * 1.4), boatMaxX());
  if (surfaceY - S * 1.2 > meter.y + 30) return x;
  const first = meterSlot(0), lo = first.x - first.gap - S * (ROD + .4), hi = meterSlot(meter.size - 1).x + first.gap + S;
  if (x < lo || x > hi) return x;
  return x - lo < hi - x ? lo : Math.min(hi, boatMaxX());
}
function rodTip() { return [boat.x + S * ROD, surfaceY - S * 1.2 + boatBob()]; }
function boatBob() { return Math.sin(clock * 1.6) * S * .05 + Math.sin((clock - boat.rockAt) * 12) * Math.max(0, 1 - (clock - boat.rockAt)) * S * .08; }

function drawBoat() {
  const x = boat.x, y = surfaceY + boatBob(), w = S * 2, h = S * .55;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(clock * 1.3) * .04);
  // vara
  ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = S * .06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(S * .2, -h * .9); ctx.lineTo(S * ROD, -S * 1.2); ctx.stroke();
  // pescador
  const size = Math.round(S * .9 / 4) * 4;
  ctx.drawImage(emojiSprite('🐱', size), -S * .15 - size / 2, -h * .6 - size * .85, size, size);
  // casco
  ctx.fillStyle = '#ff6b5a';
  ctx.beginPath(); ctx.moveTo(-w / 2, -h * .7); ctx.lineTo(w / 2, -h * .7); ctx.quadraticCurveTo(w * .42, h * .45, w * .25, h * .45);
  ctx.lineTo(-w * .25, h * .45); ctx.quadraticCurveTo(-w * .42, h * .45, -w / 2, -h * .7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-w * .46, -h * .45, w * .92, h * .16);
  ctx.fillStyle = '#c94a3d'; ctx.fillRect(-w / 2, -h * .75, w, h * .12);
  ctx.restore();
}

function hitBoat(x, y) { return Math.abs(x - boat.x) < S * 1.1 && y > surfaceY - S * 1.1 && y < surfaceY + S * .4; }
