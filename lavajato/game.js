'use strict';
// Lava-jato: chega um veículo sujinho; mangueira tira a lama, esponja faz espuma, água de novo,
// secador tira as gotas e ele sai brilhando. Buzina, farol, sirene e rodas também respondem ao toque.

loadVoices(['vamos', 'chegou-carro', 'chegou-bombeiro', 'chegou-onibus', 'chegou-trator', 'chegou-sorvete',
  'agua', 'sabao', 'enxague', 'secar', 'brilhando', 'tchau', 'parabens', 'v-obrigado', 'v-oba']);

const ARRIVE_TIME = 1.8, SHINE_TIME = 3.2;
const HINT_AFTER = 6, REPEAT_AFTER = 13;
const ICE_TUNE = [[784, 1], [659, 1], [784, 1], [880, 1], [784, 2], [659, 1], [587, 1], [523, 2]];
// pedaços que respondem ao toque, em frações da largura (coordenadas locais)
const PARTS = {
  carro: [['honk', .1, -.375, .12], ['light', .45, -.22, .06]],
  bombeiro: [['honk', .36, -.4, .1], ['siren', .32, -.53, .08], ['light', .47, -.23, .06]],
  onibus: [['honk', .33, -.35, .12], ['sign', -.05, -.3, .07], ['light', .48, -.15, .06]],
  trator: [['honk', -.26, -.48, .12], ['chimney', .14, -.5, .08], ['light', .45, -.26, .06]],
  sorvete: [['honk', .32, -.34, .12], ['cone', -.12, -.6, .12], ['light', .48, -.15, .06]],
};

let bg = null, groundY = 0, vi = 0, frameDt = 0, pressing = null, lastSound = 0, lastSaid = 0, puddle = 0;
let bubbles = [], spray = [];
const veh = { x: 0, state: 'in', at: 0, u: 0, spin: 0, spinBoost: 0, laughAt: -99, blinkAt: 0, bounceAt: -99, lightsAt: -99, sirenAt: -99, signAt: -99, wobbleAt: -99 };
const brushes = [{ side: -1, spinAt: -99, a: 0 }, { side: 1, spinAt: -99, a: 0 }];
const stepsEl = document.querySelector('.steps');
const stepEls = [...stepsEl.children];

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare(); navigator.vibrate?.([30, 60, 30]); confettiRain();
  say('parabens', 'Você lavou todos os carrinhos! Parabéns!', true);
};

const def = () => VEHICLES[vi % VEHICLES.length];
const scale = () => veh.u / wash.u;
const toLocal = (x, y) => [(x - veh.x) / scale(), (y - groundY - bounce()) / scale()];
const bounce = () => -pulse(veh.bounceAt, .35) * veh.u * .04;
const pulse = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

// ---------- cenário ----------
function vehicleSize(d) {
  const top = meter.y + 40;
  return Math.min(W * (H > W ? .94 : .86), (groundY - top) / d.ratio, 560);
}

function buildBay() {
  const [c, g] = layer(W, H);
  const wall = g.createLinearGradient(0, 0, 0, groundY);
  wall.addColorStop(0, '#cfeaff'); wall.addColorStop(1, '#e9f6ff');
  g.fillStyle = wall; g.fillRect(0, 0, W, groundY);
  g.strokeStyle = 'rgb(255 255 255 / .7)'; g.lineWidth = 2;
  const tile = Math.max(34, W / 12);
  for (let y = tile; y < groundY; y += tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = tile / 2; x < W; x += tile) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, groundY); g.stroke(); }
  // placa (só em pé, onde sobra céu em cima do carro)
  if (H > W) {
    const bw = W * .72, bh = Math.min(76, H * .085), bx = (W - bw) / 2, by = meter.y + 38;
    g.fillStyle = '#3fa9ff'; g.beginPath(); g.roundRect?.(bx, by, bw, bh, bh / 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#fff'; g.font = `800 ${bh * .48}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LAVA-JATO', W / 2, by + bh * .54);
    g.fillStyle = 'rgb(255 255 255 / .8)';
    for (const [dx, dy, r] of [[-.52, -.2, .16], [-.46, .35, .1], [.5, -.25, .13], [.55, .3, .09]]) { circle(g, W / 2 + dx * bw, by + bh / 2 + dy * bh, r * bh); g.fill(); }
  }
  // chão com faixa amarela e ralo
  const floor = g.createLinearGradient(0, groundY, 0, H);
  floor.addColorStop(0, '#aeb9c6'); floor.addColorStop(1, '#8f9bab');
  g.fillStyle = floor; g.fillRect(0, groundY, W, H - groundY);
  g.fillStyle = '#ffd23b';
  for (let x = 10; x < W; x += 60) g.fillRect(x, groundY + 6, 34, 6);
  g.fillStyle = '#6b7685'; g.beginPath(); g.roundRect?.(W / 2 - 34, groundY + (H - groundY) * .45, 68, 16, 8); g.fill();
  g.strokeStyle = '#8f9bab'; g.lineWidth = 2;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(W / 2 - 34 + i * 11.3, groundY + (H - groundY) * .45 + 2); g.lineTo(W / 2 - 34 + i * 11.3, groundY + (H - groundY) * .45 + 14); g.stroke(); }
  return c;
}

// rolos de escova nas laterais (giram quando toca)
function brushBox(b) {
  const w = Math.min(W * .09, 46), h = Math.min(H * .34, veh.u * .7);
  return { x: b.side < 0 ? w * .7 : W - w * .7, top: groundY - h, w, h };
}

function drawBrushes(dt) {
  for (const b of brushes) {
    const { x, top, w, h } = brushBox(b);
    b.a += (1 + pulse(b.spinAt, 1.5) * 14) * dt;
    ctx.fillStyle = '#6b7685'; ctx.fillRect(x - 3, top - 14, 6, h + 14);
    ctx.save(); ctx.beginPath(); ctx.roundRect?.(x - w / 2, top, w, h, w / 2); ctx.clip();
    ctx.fillStyle = b.side < 0 ? '#4fb4ff' : '#ff6fa8'; ctx.fillRect(x - w / 2, top, w, h);
    ctx.fillStyle = 'rgb(255 255 255 / .35)';
    const step = w * .6, off = (b.a * w) % step;
    for (let y = top - step + off; y < top + h; y += step) ctx.fillRect(x - w / 2, y, w, step * .35);
    ctx.fillStyle = 'rgb(0 0 0 / .12)'; ctx.fillRect(x + w * .2, top, w * .3, h);
    ctx.restore();
  }
}

function tapBrush(x, y) {
  const b = brushes.find(b => { const r = brushBox(b); return Math.abs(x - r.x) < r.w && y > r.top && y < groundY; });
  if (!b) return false;
  b.spinAt = clock; sfx.whoosh();
  return true;
}

// ---------- veículo ----------
function startVehicle() {
  const d = def();
  veh.u = vehicleSize(d);
  setupWash(d, veh.u);
  Object.assign(veh, { x: -veh.u * .7, state: 'in', at: clock, spinBoost: 0 });
  for (const el of stepEls) el.classList.remove('done', 'now');
  sfx.vroom();
}

function stepStarted(name) {
  stepEls.forEach((el, i) => el.classList.toggle('now', i === wash.step));
  if (!name) { shineVehicle(); return; }
  lastSaid = clock;
  say(name, STEP_TEXT[name], true);
}

function stepDone() {
  stepEls[wash.step].classList.add('done');
  stepEls[wash.step].classList.remove('now');
  veh.laughAt = clock; sfx.giggle();
  burst(veh.x, groundY - veh.u * def().ratio * .5, veh.u * .15, 190, 14);
}

function shineVehicle() {
  veh.state = 'shine'; veh.at = clock; veh.laughAt = clock;
  sfx.honk(); sfx.chime();
  launchStar(veh.x, groundY - veh.u * def().ratio);
  say('brilhando', 'Ficou brilhando! Muito bem!');
  say('v-obrigado', 'Obrigado!', true);
}

function updateVehicle(dt) {
  const age = clock - veh.at, d = def();
  const r0 = d.wheels(veh.u)[0][1];
  let vx = 0;
  if (veh.state === 'in') {
    const p = clamp01(age / ARRIVE_TIME), e = 1 - (1 - p) ** 3, nx = -veh.u * .7 + (W / 2 + veh.u * .7) * e;
    vx = (nx - veh.x) / Math.max(dt, 1e-3); veh.x = nx;
    if (p >= 1) {
      veh.state = 'wash'; veh.at = clock;
      say(`chegou-${d.id}`, `Chegou ${d.name}! Está todo sujinho!`);
      stepStarted(stepName());
    }
  } else if (veh.state === 'shine' && age > SHINE_TIME) {
    veh.state = 'out'; veh.at = clock; sfx.vroom(); sfx.honk();
    say('tchau', 'Tchau! Até logo!');
  } else if (veh.state === 'out') {
    vx = W * .9 * Math.min(age * 1.5, 1.4);
    veh.x += vx * dt;
    if (veh.x - veh.u * .7 > W) { vi++; startVehicle(); }
  }
  veh.spinBoost *= Math.pow(.2, dt);
  veh.spin += (vx / r0 + veh.spinBoost) * dt;
  if (clock - veh.blinkAt > 2.5 + Math.random() * 30) veh.blinkAt = clock;
  if (veh.state === 'wash') { updateWash(); remind(); }
  puddle = Math.max(0, puddle - dt * (stepName() === 'secar' || veh.state !== 'wash' ? .15 : .01));
}

// ficou parado: repete o que fazer
function remind() {
  if (wash.clearAt || pressing || clock - Math.max(wash.progressAt, lastSaid) < REPEAT_AFTER) return;
  lastSaid = clock;
  say(stepName(), STEP_TEXT[stepName()]);
}

function vehicleLook() {
  const d = def(), laughing = clock - veh.laughAt < 1;
  const since = clock - veh.blinkAt, blink = since < .16 ? Math.abs(since / .08 - 1) : 1;
  const mood = veh.state === 'shine' || veh.state === 'out' || laughing ? 'happy' : veh.state === 'wash' && wash.step === 0 && !wash.clearAt ? 'dirty' : 'ok';
  const tool = pressing ? [pressing.x, pressing.y] : null;
  const [ex, ey] = [veh.x, groundY - veh.u * d.ratio * .7];
  return {
    blink: Math.max(blink, .08), mood,
    lookX: tool ? Math.max(-1, Math.min(1, (tool[0] - ex) / (veh.u * .4))) : Math.sin(clock * .7) * .3,
    lookY: tool ? Math.max(-1, Math.min(1, (tool[1] - ey) / (veh.u * .3))) : 0,
    lights: clock - veh.lightsAt < 1.5 || veh.state === 'shine',
    siren: clock - veh.sirenAt < 2.2, sign: pulse(veh.signAt, 2), puffs: true, wobble: pulse(veh.wobbleAt, 1.2),
  };
}

function drawVehicle(t) {
  const d = def(), k = scale(), u = wash.u, v = vehicleLook();
  ctx.fillStyle = 'rgb(30 40 60 / .18)';
  ctx.beginPath(); ctx.ellipse(veh.x, groundY + 2, veh.u * .5, veh.u * .04, 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.translate(veh.x, groundY + bounce()); ctx.scale(k, k);
  d.paint(ctx, u, t, v);
  if (veh.state === 'wash' || veh.state === 'in') { drawMud(); drawFoam(); drawDrops(t); }
  for (const [x, r] of d.wheels(u)) wheel(ctx, x, -r, r, veh.spin);
  if (veh.state === 'shine') drawGlint(d, u);
  ctx.restore();
}

// brilho passando pela lataria limpinha
function drawGlint(d, u) {
  const p = ((clock - veh.at) / 1.2) % 1.6;
  ctx.save();
  ctx.beginPath(); d.body(ctx, u); ctx.clip();
  const x = -u * .7 + p * u * 1.4;
  const g = ctx.createLinearGradient(x - u * .12, 0, x + u * .12, 0);
  g.addColorStop(0, 'rgb(255 255 255 / 0)'); g.addColorStop(.5, 'rgb(255 255 255 / .75)'); g.addColorStop(1, 'rgb(255 255 255 / 0)');
  ctx.fillStyle = g; ctx.fillRect(x - u * .12, -u, u * .24, u);
  ctx.restore();
  if (Math.random() < .25) sparkle(veh.x + rand(-.45, .45) * veh.u, groundY - rand(.1, d.ratio) * veh.u);
}

function drawPuddle() {
  if (puddle < .01) return;
  const w = veh.u * (.35 + puddle * .35);
  ctx.fillStyle = `rgb(120 190 255 / ${.45 * Math.min(puddle * 2, 1)})`;
  ctx.beginPath(); ctx.ellipse(W / 2, groundY + veh.u * .05, w, veh.u * .045 * (1 + puddle), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)';
  ctx.beginPath(); ctx.ellipse(W / 2 - w * .4, groundY + veh.u * .04, w * .2, veh.u * .01, 0, 0, TAU); ctx.fill();
}

// ---------- ferramentas ----------
// ferramenta esperando: no chão em pé; deitado o chão é curto, fica do lado do veículo
function toolRest() {
  if (H > W) return [veh.x + veh.u * .32, groundY + (H - groundY) * .3];
  return [Math.min(veh.x + veh.u * .55 + 40, W - 50), groundY - 40];
}

function useTool(x, y) {
  if (veh.state !== 'wash' || wash.clearAt) return;
  const [lx, ly] = toLocal(x, y), name = stepName();
  washAt(lx, ly);
  if (clock - lastSound < .08) return;
  lastSound = clock;
  if (name === 'agua' || name === 'enxague') { sfx.spray(); puddle = Math.min(1, puddle + .012); }
  else if (name === 'sabao') { sfx.squeak(); if (Math.random() < .06) { veh.laughAt = clock; sfx.giggle(); } }
  else sfx.blow();
}

function nozzle(x, y) { return [x + veh.u * .12, y - veh.u * .16]; }

function drawTool(t) {
  if (veh.state !== 'wash' || !stepName()) return;
  const name = stepName(), active = !!pressing, [x, y] = active ? [pressing.x, pressing.y] : toolRest();
  const bob = active ? 0 : Math.sin(t * 4) * 4, s = veh.u;
  if (name === 'agua' || name === 'enxague') {
    const [nx, ny] = active ? nozzle(x, y) : [x, y + bob];
    ctx.strokeStyle = '#3fae4a'; ctx.lineWidth = s * .03; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(W + 10, H - 20); ctx.quadraticCurveTo(W * .8, H * .95, nx + s * .03, ny + s * .03); ctx.stroke();
    const a = active ? Math.atan2(y - ny, x - nx) : -2.3;
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(a);
    ctx.fillStyle = '#ffd23b'; ctx.beginPath(); ctx.roundRect?.(-s * .07, -s * .025, s * .08, s * .05, s * .015); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(s * .005, -s * .015, s * .03, s * .03);
    ctx.restore();
    if (active) {
      ctx.strokeStyle = 'rgb(140 205 255 / .7)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const jx = rand(-8, 8), jy = rand(-8, 8);
        ctx.beginPath(); ctx.moveTo(nx + Math.cos(a) * s * .04, ny + Math.sin(a) * s * .04); ctx.lineTo(x + jx, y + jy); ctx.stroke();
      }
      if (Math.random() < .6) spray.push({ x: x + rand(-10, 10), y, vx: rand(-60, 60), vy: rand(-120, -40), t: 0 });
    }
  } else if (name === 'sabao') {
    ctx.save(); ctx.translate(x, y + bob - (active ? s * .03 : 0)); ctx.rotate(active ? Math.sin(t * 20) * .15 : -.2);
    ctx.fillStyle = '#ffd23b'; ctx.beginPath(); ctx.roundRect?.(-s * .08, -s * .05, s * .16, s * .1, s * .03); ctx.fill();
    ctx.fillStyle = '#5ad16e'; ctx.beginPath(); ctx.roundRect?.(-s * .08, -s * .07, s * .16, s * .03, s * .012); ctx.fill();
    ctx.fillStyle = 'rgb(200 150 20 / .45)';
    for (const [dx, dy] of [[-.04, 0], [0, .02], [.04, -.01], [-.02, .03], [.03, .025]]) { circle(ctx, dx * s, dy * s, s * .008); ctx.fill(); }
    ctx.fillStyle = '#fff'; for (const dx of [-.05, 0, .05]) { circle(ctx, dx * s, -s * .075, s * .018); ctx.fill(); }
    ctx.restore();
  } else {
    const [bx, by] = active ? [x + s * .14, y - s * .12] : [x, y + bob];
    drawDryer(bx, by, active ? Math.atan2(y - by, x - bx) : Math.PI * .8, s * .09);
    if (active) {
      ctx.strokeStyle = 'rgb(255 255 255 / .8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const p = (t * 3 + i / 3) % 1, px = bx + (x - bx) * p, py = by + (y - by) * p;
        ctx.beginPath(); ctx.arc(px, py + (i - 1) * 10, 8, 0, Math.PI); ctx.stroke();
      }
    }
  }
  if (!active && clock - wash.progressAt > HINT_AFTER) {   // mãozinha mostrando pra passar o dedo
    const size = Math.round(s * .2 / 4) * 4, hx = veh.x + Math.sin(t * 2.2) * s * .3, hy = groundY - s * def().ratio * .45;
    ctx.drawImage(emojiSprite('👆', size), hx - size / 2, hy, size, size);
  }
}

// secador de cabelo: bico aponta pro ângulo a
function drawDryer(x, y, a, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const flip = Math.cos(a) < 0 ? -1 : 1;   // cabo sempre pra baixo
  ctx.fillStyle = '#e0508f'; ctx.beginPath(); ctx.roundRect?.(-r * .3, 0, r * .45, r * 1.1 * flip, r * .2); ctx.fill();
  ctx.fillStyle = '#ff7fb5'; circle(ctx, 0, 0, r * .6); ctx.fill();
  ctx.fillRect(0, -r * .35, r * 1.1, r * .7);
  ctx.fillStyle = '#c93d7a'; ctx.fillRect(r * .95, -r * .42, r * .25, r * .84);
  ctx.fillStyle = '#fff'; circle(ctx, 0, 0, r * .32); ctx.fill();
  ctx.strokeStyle = '#ff7fb5'; ctx.lineWidth = r * .08;
  for (let i = 0; i < 3; i++) { const b = clock * 18 + i * TAU / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(b) * r * .28, Math.sin(b) * r * .28); ctx.stroke(); }
  ctx.fillStyle = 'rgb(255 255 255 / .5)'; ctx.beginPath(); ctx.ellipse(r * .3, -r * .2, r * .45, r * .08, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawSpray(dt) {
  for (const p of spray) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
  spray = spray.filter(p => p.t < .5);
  ctx.fillStyle = 'rgb(140 205 255 / .8)';
  for (const p of spray) { circle(ctx, p.x, p.y, 2.5); ctx.fill(); }
}

// ---------- bolhinhas de sabão que sobem (tocar estoura) ----------
function floatBubble(lx, ly) {
  bubbles.push({ x: veh.x + lx * scale(), y: groundY + ly * scale(), r: rand(10, 22), vy: -rand(30, 60), t: 0, phase: rand(0, TAU), hue: rand(0, 360) });
}

function popAt(lx, ly) {
  const x = veh.x + lx * scale(), y = groundY + ly * scale();
  sparkle(x, y); if (Math.random() < .3) sfx.pop();
}

function drawBubbles(dt, t) {
  for (const b of bubbles) { b.t += dt; b.y += b.vy * dt; b.x += Math.sin(t * 2 + b.phase) * 20 * dt; }
  bubbles = bubbles.filter(b => b.t < 6 && b.y > -b.r);
  for (const b of bubbles) {
    ctx.strokeStyle = `hsl(${b.hue + t * 40} 90% 75% / .8)`; ctx.lineWidth = 2;
    circle(ctx, b.x, b.y, b.r); ctx.stroke();
    ctx.fillStyle = 'rgb(255 255 255 / .18)'; ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .8)'; circle(ctx, b.x - b.r * .35, b.y - b.r * .35, b.r * .2); ctx.fill();
  }
}

function popBubble(x, y) {
  const i = bubbles.findIndex(b => Math.hypot(b.x - x, b.y - y) < b.r + 14);
  if (i < 0) return false;
  const b = bubbles.splice(i, 1)[0];
  sfx.pop(); ring(b.x, b.y, b.r); burst(b.x, b.y, b.r, b.hue, 8);
  return true;
}

// ---------- toques ----------
function tapPart(x, y) {
  if (veh.state === 'in' || veh.state === 'out') return false;
  const d = def(), [lx, ly] = toLocal(x, y), u = wash.u;
  const part = PARTS[d.id].find(([, px, py, r]) => Math.hypot(lx - px * u, ly - py * u) < r * u * 1.3);
  const wheelHit = d.wheels(u).some(([wx, r]) => Math.hypot(lx - wx, ly + r) < r * 1.2);
  if (!part && !wheelHit) return false;
  if (!part) { veh.spinBoost = 25; sfx.boing(); return true; }
  switch (part[0]) {
    case 'honk': sfx.honk(); veh.bounceAt = clock; veh.laughAt = clock; if (Math.random() < .4) say('v-oba', 'Ebaaa!'); break;
    case 'light': veh.lightsAt = clock; sfx.bell(1175); break;
    case 'siren': veh.sirenAt = clock; sfx.siren(); break;
    case 'sign': veh.signAt = clock; sfx.pop(); break;
    case 'chimney': sfx.honk(); burst(x, y - 10, veh.u * .06, 0, 10); veh.bounceAt = clock; break;
    case 'cone': veh.wobbleAt = clock; sfx.musicBox(ICE_TUNE, .2); break;
  }
  return true;
}

function onTap(x, y) {
  // estourar bolha não impede de esfregar arrastando dali (só não conta como toque em peça)
  pressing = { x, y, sx: x, sy: y, moved: popBubble(x, y) };
  useTool(x, y);
}

function onMove(x, y) {
  if (!pressing) return;
  if (Math.hypot(x - pressing.sx, y - pressing.sy) > 12) pressing.moved = true;
  // passos pequenos pra não pular pedaço da lataria quando o dedo corre
  const dist = Math.hypot(x - pressing.x, y - pressing.y), n = Math.ceil(dist / (veh.u * .03));
  for (let i = 1; i <= n; i++) useTool(pressing.x + (x - pressing.x) * i / n, pressing.y + (y - pressing.y) * i / n);
  pressing.x = x; pressing.y = y;
}

function onUp() {
  if (pressing && !pressing.moved && !tapPart(pressing.sx, pressing.sy)) tapBrush(pressing.sx, pressing.sy);
  pressing = null;
}

function onCancel() { pressing = null; }

stepEls.forEach((el, i) => el.addEventListener('click', () => {
  if (!started || veh.state !== 'wash' || i !== wash.step) return;
  sfx.resume(); lastSaid = clock; say(stepName(), STEP_TEXT[stepName()]);
}));

// ---------- loop ----------
function resize() {
  fitCanvas();
  groundY = H * (H > W ? .66 : .74);
  measureMeter();
  bg = buildBay();
  if (!wash.def) startVehicle();
  veh.u = vehicleSize(def());
  if (veh.state === 'wash' || veh.state === 'shine') veh.x = W / 2;
}

function update(dt) {
  frameDt = dt;
  if (started) updateVehicle(dt);
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(bg, 0, 0, W, H);
  drawBrushes(frameDt);
  drawPuddle();
  drawVehicle(t);
  drawSpray(frameDt);
  drawTool(t);
  drawBubbles(frameDt, t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel,
  onStart: () => {
    stepsEl.classList.add('on');
    say('vamos', 'Vamos lavar os carrinhos?');
    startVehicle();
  },
});
