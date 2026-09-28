'use strict';
// o bichinho na banheira (cabeça do jogo de dormir), a lama, a espuma da água, as bolhas
// que sobem e o xampu que vira penteado engraçado.

// penteados de espuma, em unidades do raio da cabeça: [dx, dy, raio]
const HAIR = {
  nuvem: [[-.5, -.8, .3], [-.2, -.97, .33], [.15, -.97, .33], [.48, -.8, .3], [0, -1.18, .3]],
  moicano: [[0, -.85, .3], [0, -1.15, .27], [0, -1.42, .24], [0, -1.66, .2], [.02, -1.86, .15]],
  unicornio: [[-.3, -.85, .25], [.3, -.85, .25], [0, -.95, .3], [.02, -1.25, .22], [.05, -1.5, .16], [.08, -1.7, .11], [.1, -1.85, .07]],
  coque: [[-.38, -.85, .25], [.38, -.85, .25], [0, -.97, .28], [0, -1.42, .42]],
  chifres: [[-.3, -.87, .26], [.3, -.87, .26], [-.58, -1.12, .2], [-.74, -1.36, .15], [-.82, -1.56, .1], [.58, -1.12, .2], [.74, -1.36, .15], [.82, -1.56, .1]],
  barba: [[-.35, -.88, .26], [.35, -.88, .26], [-.6, .45, .24], [-.35, .72, .28], [0, .84, .3], [.35, .72, .28], [.6, .45, .24]],
};
const HAIR_IDS = Object.keys(HAIR);
const MUD = [[-.45, -.45, .2], [.5, .1, .16], [-.1, .7, .14], [.3, -.6, .12]];
const MAX_BUBBLES = 40;

const kid = { b: BICHOS[0], v: newLook(), hopAt: -9, mud: 1, hair: null, hairAt: -9, oldHair: null, foam: 0, squintUntil: 0, wrapAt: -1, rubAt: -9 };
let mounds = [], bubbles = [];

// ---------- espuma da água ----------
function addMound(ux, uy, big = 1) {
  mounds.push({ ux, uy, s: L.r * rand(.35, .55) * big, at: clock, seed: rand(0, 9) });
  if (mounds.length > 40) mounds.shift();
}

function drawMounds(front, sink) {
  for (const m of mounds) {
    if ((m.uy > .1) !== front) continue;
    const k = easeOutBack(Math.min((clock - m.at) / .35, 1)) * (1 - sink), [x, y] = waterXY(m.ux, m.uy), s = m.s * k;
    if (s <= 1) continue;
    ctx.fillStyle = '#d7ecf7';
    for (let i = 0; i < 5; i++) { circle(ctx, x + (i - 2) * s * .42, y + s * .15 - Math.abs(i - 2) * -s * .05, s * (.55 - Math.abs(i - 2) * .08)); ctx.fill(); }
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) { circle(ctx, x + (i - 2) * s * .42, y - Math.abs(i - 2) * -s * .1 - s * .08, s * (.5 - Math.abs(i - 2) * .08)); ctx.fill(); }
    circle(ctx, x + Math.sin(m.seed) * s * .2, y - s * .45, s * .38); ctx.fill();
  }
}

// ---------- bolhas de sabão ----------
function spawnBubble(x, y, big = 1) {
  if (bubbles.length >= MAX_BUBBLES) bubbles.shift();
  bubbles.push({ x, y, r: L.r * rand(.14, .32) * big, vy: -L.r * rand(.35, .7), ph: rand(0, TAU), at: clock, hue: rand(0, 360) });
}

function updateBubbles(dt, rate) {
  if (mounds.length && Math.random() < dt * rate) { const m = pick(mounds); const [x, y] = waterXY(m.ux, m.uy); spawnBubble(x, y - m.s * .4); }
  for (const b of bubbles) { b.y += b.vy * dt; b.x += Math.sin(clock * 1.7 + b.ph) * L.r * .25 * dt; }
  bubbles = bubbles.filter(b => b.y > -b.r * 2 && clock - b.at < 9);
}

function popBubbleAt(x, y) {
  const i = bubbles.findIndex(b => Math.hypot(x - b.x, y - b.y) < b.r + L.r * .15);
  if (i < 0) return false;
  const b = bubbles[i];
  bubbles.splice(i, 1);
  sfx.pop(); ring(b.x, b.y, b.r); burst(b.x, b.y, b.r * .5, b.hue, 5);
  return true;
}

function drawBubbles() {
  for (const b of bubbles) {
    const grow = Math.min((clock - b.at) / .3, 1), r = b.r * grow;
    const g = ctx.createRadialGradient(b.x - r * .3, b.y - r * .3, r * .1, b.x, b.y, r);
    g.addColorStop(0, 'rgb(255 255 255 / .05)'); g.addColorStop(.75, `hsl(${b.hue} 90% 85% / .18)`); g.addColorStop(1, `hsl(${b.hue + 60} 90% 80% / .55)`);
    ctx.fillStyle = g; circle(ctx, b.x, b.y, r); ctx.fill();
    ctx.strokeStyle = 'rgb(255 255 255 / .7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgb(255 255 255 / .85)'; ctx.beginPath(); ctx.ellipse(b.x - r * .38, b.y - r * .4, r * .18, r * .1, -.7, 0, TAU); ctx.fill();
  }
}

// ---------- o bichinho ----------
function headNow() {
  const hop = pulseAt(kid.hopAt, .45) * L.r * .3, [x, y] = L.head;
  return [x, y - hop + Math.sin(clock * 1.8) * L.r * .03];
}

const onHead = (x, y) => { const [hx, hy] = headNow(); return Math.hypot(x - hx, y - hy + L.r * .2) < L.r * 1.25; };

function drawKidBody(t) {
  const [hx, hy] = headNow(), r = L.r, b = kid.b, fur = b.patches || b.fur;
  // ombros e barriguinha (a frente da banheira esconde o resto)
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(hx, hy + r * 1.5, r * .95, r * .85, 0, 0, TAU); ctx.fill();
  if (!b.patches) { ctx.fillStyle = b.inner; ctx.beginPath(); ctx.ellipse(hx, hy + r * 1.65, r * .55, r * .6, 0, 0, TAU); ctx.fill(); }
  const v = kid.v;
  v.blink = (t % 3.7) < .12 ? .1 : 1;
  v.eyes = clock < kid.squintUntil ? 'closed' : 'open';
  drawHead(ctx, hx, hy, r, b, v, t, Math.sin(t * 1.2) * .04 + pulseAt(kid.rubAt, .5) * Math.sin(t * 20) * .08);
  drawMud(hx, hy);
  drawHair(hx, hy);
}

function drawMud(hx, hy) {
  if (kid.mud <= 0) return;
  const r = L.r;
  ctx.globalAlpha = Math.min(1, kid.mud * 1.3); ctx.fillStyle = '#8a5a34';
  for (const [dx, dy, k] of MUD) {
    ctx.beginPath(); ctx.ellipse(hx + dx * r, hy + dy * r, k * r, k * r * .8, dx * 2, 0, TAU); ctx.fill();
    circle(ctx, hx + dx * r + k * r * .8, hy + dy * r - k * r * .3, k * r * .35); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// patinhas na borda da frente
function drawPaws() {
  const r = L.r, fur = kid.b.patches || kid.b.fur, y = L.rimY + L.ry * .92;
  ctx.fillStyle = fur; ctx.strokeStyle = 'rgb(0 0 0 / .1)'; ctx.lineWidth = 2;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(L.head[0] + d * r * 1.05, y, r * .24, r * .17, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
}

// ---------- xampu: penteados de espuma ----------
function setHair(id) {
  kid.oldHair = kid.hair; kid.hair = id; kid.hairAt = clock; kid.foam = 1;
}

function foamBlobs(g, pts, hx, hy, k) {
  const r = L.r;
  g.fillStyle = '#d7ecf7';
  for (const [dx, dy, s] of pts) { circle(g, hx + dx * r, hy + dy * r + s * r * .12, s * r * k); g.fill(); }
  g.fillStyle = '#fff';
  for (const [dx, dy, s] of pts) { circle(g, hx + dx * r, hy + dy * r, s * r * .92 * k); g.fill(); }
  g.fillStyle = 'rgb(180 220 255 / .6)';
  for (const [dx, dy, s] of pts) { circle(g, hx + (dx + s * .3) * r, hy + (dy - s * .3) * r, s * r * .15 * k); g.fill(); }
}

function drawHair(hx, hy) {
  if (!kid.hair || kid.foam <= 0) return;
  const p = Math.min((clock - kid.hairAt) / .35, 1), f = Math.min(1, kid.foam * 1.2);
  if (kid.oldHair && p < 1) foamBlobs(ctx, HAIR[kid.oldHair], hx, hy, (1 - p) * f);
  foamBlobs(ctx, HAIR[kid.hair], hx, hy, easeOutBack(p) * f);
}

// ---------- toalha enrolada (capuz) ----------
function drawWrap(t) {
  if (kid.wrapAt < 0) return;
  const k = Math.min((clock - kid.wrapAt) / .6, 1), [hx, hy] = headNow(), r = L.r;
  const [tx, ty] = L.towel, e = 1 - (1 - k) ** 3;
  const x = tx + (hx - tx) * e, y = ty + (hy - ty) * e - Math.sin(k * Math.PI) * r;
  const rub = pulseAt(kid.rubAt, .5) * Math.sin(t * 22) * r * .06;
  ctx.save(); ctx.translate(x + rub, y);
  ctx.fillStyle = '#ff9ec2';
  ctx.beginPath(); ctx.moveTo(-r * 1.25, r * 1.9); ctx.quadraticCurveTo(-r * 1.3, -r * 1.35, 0, -r * 1.3);
  ctx.quadraticCurveTo(r * 1.3, -r * 1.35, r * 1.25, r * 1.9); ctx.lineTo(r * .75, r * 1.9); ctx.quadraticCurveTo(r * .95, -r * .4, 0, -r * .95);
  ctx.quadraticCurveTo(-r * .95, -r * .4, -r * .75, r * 1.9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc6dc';
  for (const d of [-1, 1]) { circle(ctx, d * r * .55, -r * 1.12, r * .22); ctx.fill(); }   // orelhinhas do capuz
  ctx.fillStyle = '#ff9ec2'; ctx.beginPath(); ctx.ellipse(0, r * 1.5, r * 1.02, r * .9, 0, Math.PI * 1.05, Math.PI * 1.95, true); ctx.fill();   // enrolado no corpo
  ctx.fillStyle = '#ffc6dc'; ctx.fillRect(-r * .95, r * 1.25, r * 1.9, r * .12);
  ctx.fillStyle = 'rgb(255 255 255 / .55)'; for (let i = 0; i < 5; i++) { circle(ctx, -r * .7 + i * r * .35, r * 1.7 + (i % 2) * r * .15, r * .08); ctx.fill(); }
  ctx.restore();
}
