'use strict';
// a horta: cerca, canteiro com 3 covinhas, regador, raio de sol e chuva.
// Cada planta pede água (fase par) ou sol (fase ímpar) pra subir de fase; na fase RIPE, é só colher.

const GROW_DUR = { agua: 1.25, sol: 1.2, chuva: .55 };
const NEED_DELAY = .7;        // depois de crescer, espera um pouquinho pra pedir de novo
const RAIN_TIME = 2.4;

let L = {}, plots = [], bedLayer = null, rain = null, sunTapAt = -99;

function layoutGarden() {
  const port = H > W;
  const s = port ? Math.min(W * .28, H * .12) : Math.min(H * .24, W * .12);
  const plotY = H * (port ? .7 : .8);
  const xs = (port ? [.19, .5, .81] : [.34, .5, .66]).map(f => W * f);
  L = {
    port, s, plotY, xs, ground: port ? .4 : .42,
    fenceY: plotY - s * (port ? 1.45 : 1.35),
    visitor: port ? { x: W * .2, y: H * .935 } : { x: W * .12, y: H * .9 },
    basket: port ? { x: W * .8, y: H * .93 } : { x: W * .88, y: H * .9 },
  };
  plots = xs.map((x, i) => ({ busy: null, crop: null, stage: -1, grewAt: -9, ...plots[i], i, x, y: plotY }));
}

// ---------- fundo fixo: cerca e canteiro de madeira ----------
function buildBed() {
  const [c, g] = layer(W, H), { s, xs, plotY, fenceY } = L;
  // cerquinha
  const pw = s * .16, gap = s * .32, ph = s * .6;
  g.fillStyle = '#e9d2a8';
  for (const ry of [.3, .72]) g.fillRect(0, fenceY - ph * ry, W, s * .08);
  for (let x = gap / 2; x < W + pw; x += gap) {
    g.fillStyle = '#c9a877'; g.beginPath(); g.roundRect(x - pw / 2 + 2, fenceY - ph + 2, pw, ph, [pw / 2, pw / 2, 2, 2]); g.fill();
    g.fillStyle = '#fff4dc'; g.beginPath(); g.roundRect(x - pw / 2, fenceY - ph, pw, ph, [pw / 2, pw / 2, 2, 2]); g.fill();
  }
  // canteiro: moldura de tábuas com terra dentro
  const x0 = xs[0] - s * .64, x1 = xs[2] + s * .64, top = plotY - s * .32, bot = plotY + s * .44;
  g.fillStyle = 'rgb(40 80 30 / .18)'; g.beginPath(); g.ellipse((x0 + x1) / 2, bot + s * .06, (x1 - x0) * .54, s * .16, 0, 0, TAU); g.fill();
  g.fillStyle = '#9a5f36'; g.beginPath(); g.roundRect(x0, top, x1 - x0, bot - top, s * .14); g.fill();
  g.fillStyle = '#c07a45'; g.beginPath(); g.roundRect(x0, top, x1 - x0, bot - top - s * .08, s * .14); g.fill();
  g.strokeStyle = 'rgb(90 50 20 / .35)'; g.lineWidth = 2;
  for (let x = x0 + s * .9; x < x1 - s * .3; x += s * .9) { g.beginPath(); g.moveTo(x, top + s * .05); g.lineTo(x, bot - s * .1); g.stroke(); }
  const inset = s * .1;
  g.fillStyle = '#6b3f22'; g.beginPath(); g.roundRect(x0 + inset, top + inset, x1 - x0 - inset * 2, bot - top - inset * 2.6, s * .08); g.fill();
  g.fillStyle = 'rgb(255 220 180 / .12)';
  for (let i = 0; i < 70; i++) { circle(g, rand(x0 + inset * 2, x1 - inset * 2), rand(top + inset * 2, bot - inset * 3), rand(1, 2.4)); g.fill(); }
  // montinhos de terra
  for (const x of xs) {
    g.fillStyle = '#5a3319'; g.beginPath(); g.ellipse(x, plotY + s * .04, s * .47, s * .17, 0, 0, TAU); g.fill();
    g.fillStyle = '#8b5a36'; g.beginPath(); g.ellipse(x, plotY, s * .45, s * .15, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgb(255 230 200 / .18)'; g.beginPath(); g.ellipse(x - s * .1, plotY - s * .05, s * .28, s * .05, 0, 0, TAU); g.fill();
  }
  bedLayer = c;
}

// ---------- estado de cada covinha ----------
function needOf(p) {
  if (!p.crop || p.busy || p.stage >= RIPE || clock - p.grewAt < NEED_DELAY) return null;
  return p.stage % 2 === 0 ? 'agua' : 'sol';
}
const isRipe = p => p.crop && p.stage >= RIPE && !p.busy;
const plantTop = p => p.y - plantHeight(p.crop, p.stage, L.s);

function plotAt(x, y) {
  const s = L.s;
  return plots.find(p => Math.abs(x - p.x) < s * .72 && y > plantTop(p) - s * .55 && y < p.y + s * .45);
}

function plant(p, crop) {
  p.crop = crop; p.stage = 0; p.grewAt = clock;
  sfx.pop(); setTimeout(() => sfx.brush(), 120);
  burst(p.x, p.y - L.s * .1, L.s * .35, 30, 10);
}

function startGrow(p, kind, delay = 0) { p.busy = { kind, t0: clock + delay }; }

function grow(p) {
  p.stage++; p.grewAt = clock; p.busy = null;
  sfx.bell(PENTATONIC[Math.min(p.stage + 1, 6)]); sfx.boing();
  burst(p.x, p.y - L.s * .4, L.s * .45, 110, 12);
  onGrew(p);   // game.js fala
}

function updatePlots() {
  for (const p of plots) {
    const b = p.busy;
    if (!b || clock < b.t0) continue;
    const k = (clock - b.t0) / GROW_DUR[b.kind];
    if (b.kind === 'agua' && k > .25 && k < .85 && Math.random() < .7) {
      const [sx, sy] = spoutTip(p, k);
      addParticle({ x: sx, y: sy, vx: rand(-15, 5), vy: rand(20, 60), life: .55, decay: 1.6, size: rand(2, 4), color: '#62c4ff', star: false, rot: 0, vr: 0 });
    }
    if (b.kind === 'sol' && Math.random() < .5) sparkle(p.x + rand(-L.s * .4, L.s * .4), plantTop(p) + rand(0, L.s * .6));
    if (k >= 1) grow(p);
  }
  if (rain) {
    const k = (clock - rain.t0) / RAIN_TIME;
    if (!rain.watered && k > .45) {
      rain.watered = true;
      plots.filter(p => needOf(p) === 'agua').forEach((p, i) => startGrow(p, 'chuva', i * .15));
    }
    if (k >= 1) rain = null;
  }
}

// ---------- regador ----------
function canPose(p, k) {
  const s = L.s, tilt = -.75 * Math.sin(Math.min(k / .25, 1) * Math.PI / 2) * (k > .85 ? Math.max(0, (1 - k) / .15) : 1);
  const lift = k < .15 ? (1 - k / .15) * s * .5 : 0;
  return { x: p.x + s * .62, y: Math.min(p.y - s * .75, plantTop(p) - s * .15) - lift, tilt, a: Math.min(k / .12, 1, (1.05 - k) / .12) };
}

function spoutTip(p, k) {
  const { x, y, tilt } = canPose(p, k), s = L.s * .9, lx = -s * .7, ly = -s * .28;
  return [x + lx * Math.cos(tilt) - ly * Math.sin(tilt), y + lx * Math.sin(tilt) + ly * Math.cos(tilt)];
}

function drawCan(g, x, y, s, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.lineCap = 'round';
  g.strokeStyle = '#2a9d8f'; g.lineWidth = s * .1;
  g.beginPath(); g.moveTo(-s * .2, s * .06); g.lineTo(-s * .64, -s * .24); g.stroke();
  g.fillStyle = '#2a9d8f'; g.beginPath(); g.ellipse(-s * .68, -s * .27, s * .07, s * .11, -.9, 0, TAU); g.fill();
  g.lineWidth = s * .08; g.beginPath(); g.arc(s * .05, -s * .24, s * .22, Math.PI * 1.1, Math.PI * 1.95); g.stroke();
  g.fillStyle = '#42c2b0'; g.beginPath(); g.roundRect(-s * .3, -s * .26, s * .6, s * .52, s * .12); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.roundRect(-s * .22, -s * .18, s * .1, s * .36, s * .05); g.fill();
  g.fillStyle = '#ffd23b'; circle(g, s * .07, s * .02, s * .09); g.fill();
  g.restore();
}

// ---------- raio de sol ----------
function drawBeam(p, k) {
  const a = Math.sin(Math.min(k, 1) * Math.PI), tx = p.x, ty = plantTop(p) + L.s * .3;
  const sx = sky.sunX, sy = sky.sunY, ang = Math.atan2(ty - sy, tx - sx), w = L.s * .55;
  const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
  const grad = ctx.createLinearGradient(sx, sy, tx, ty);
  grad.addColorStop(0, 'rgb(255 236 120 / .75)'); grad.addColorStop(1, 'rgb(255 236 120 / .25)');
  ctx.globalAlpha = a; ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(sx + nx * w * .25, sy + ny * w * .25); ctx.lineTo(tx + nx * w, ty + ny * w);
  ctx.lineTo(tx - nx * w, ty - ny * w); ctx.lineTo(sx - nx * w * .25, sy - ny * w * .25); ctx.fill();
  const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, w * 1.4);
  glow.addColorStop(0, 'rgb(255 240 150 / .6)'); glow.addColorStop(1, 'rgb(255 240 150 / 0)');
  ctx.fillStyle = glow; circle(ctx, tx, ty, w * 1.4); ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------- chuva ----------
function startRain(c) {
  rain = { t0: clock, x0: c.x, x1: c.x + c.sprite.w, y: c.y + c.sprite.h * .6, watered: false };
  sfx.splash(); setTimeout(() => sfx.splash(), 500); setTimeout(() => sfx.splash(), 1100);
}

function drawRain() {
  if (!rain) return;
  const k = (clock - rain.t0) / RAIN_TIME, a = Math.min(k / .1, 1, (1 - k) / .2);
  ctx.globalAlpha = a * .18; ctx.fillStyle = '#3a5a8a'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a; ctx.strokeStyle = 'rgb(120 190 255 / .85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const len = L.s * .25, fall = H * 1.3;
  ctx.beginPath();
  for (let i = 0; i < 120; i++) {
    const x = (i * .618034 % 1) * W, y0 = (i * .41421 % 1) * fall, y = rain.y + ((y0 + (clock - rain.t0) * H * 1.1) % fall);
    if (y > L.plotY + L.s * .5) continue;
    ctx.moveTo(x, y); ctx.lineTo(x - len * .25, y + len);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------- desenhar a horta ----------
function drawNeed(p, t) {
  const need = needOf(p);
  if (!need) return;
  const s = L.s, x = p.x + s * .05, y = plantTop(p) - s * .38 + Math.sin(t * 3 + p.i) * s * .05, r = s * .25;
  ctx.fillStyle = 'rgb(255 255 255 / .92)';
  circle(ctx, x, y, r); ctx.fill();
  circle(ctx, x - r * .45, y + r * 1.15, r * .18); ctx.fill();
  const k = Math.min((clock - p.grewAt - NEED_DELAY) / .3, 1);
  emojiAt(ctx, need === 'agua' ? '💧' : '☀️', x, y, r * 1.35 * easeOutBack(Math.max(0, k)));
}

function drawGarden(t) {
  ctx.drawImage(bedLayer, 0, 0, W, H);
  for (const p of plots) {
    const pop = easeOutBack(Math.min((clock - p.grewAt) / .45, 1));
    drawPlant(ctx, p.crop, p.stage, p.x, p.y - L.s * .04, L.s, t, .6 + .4 * pop);
    if (isRipe(p) && Math.random() < .08) sparkle(p.x + rand(-L.s * .5, L.s * .5), plantTop(p) + rand(0, L.s * .8));
  }
  for (const p of plots) {
    const b = p.busy;
    if (!b || clock < b.t0) continue;
    const k = (clock - b.t0) / GROW_DUR[b.kind];
    if (b.kind === 'sol') drawBeam(p, k);
    if (b.kind === 'agua') {
      const c = canPose(p, k);
      ctx.globalAlpha = Math.max(0, c.a); drawCan(ctx, c.x, c.y, L.s * .9, c.tilt); ctx.globalAlpha = 1;
    }
  }
  for (const p of plots) drawNeed(p, t);
}

function drawSunGlow() {
  const k = (clock - sunTapAt) / .6;
  if (k < 0 || k > 1) return;
  ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = sky.sunR * .15 * (1 - k);
  circle(ctx, sky.sunX, sky.sunY, sky.sunR * (1.1 + k * .8)); ctx.stroke();
  ctx.globalAlpha = 1;
}
