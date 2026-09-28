'use strict';
// quem visita a horta: o bichinho com fome (pede um legume), borboletas, a minhoca e a cestinha da colheita

const VISITORS = [
  { id: 'coelho', e: '🐇', want: 'cenoura', text: 'Olha o coelho! Ele quer uma cenoura.' },
  { id: 'porco', e: '🐖', want: 'abobora', text: 'Oi, porquinho! Ele quer uma abóbora.' },
  { id: 'pintinho', e: '🐤', want: 'milho', text: 'O pintinho está com fome. Ele quer milho!' },
  { id: 'tartaruga', e: '🐢', want: 'morango', text: 'Olha a tartaruga! Ela quer um morango.' },
  { id: 'abelha', e: '🐝', want: 'girassol', fly: true, text: 'Bzzz! A abelhinha quer um girassol.' },
  { id: 'esquilo', e: '🐿️', want: 'tomate', text: 'Olha o esquilo! Ele quer um tomate.' },
];
const WALK_TIME = 1.6, EAT_TIME = 2, BF_COLORS = [['#ff7fbf', '#ffd0e8'], ['#ffa53d', '#ffe29a'], ['#7fa8ff', '#d2e2ff']];

let visitor = null, lastVisitor = null, basket = [], basketHopAt = -9, flyers = [], floaters = [];
let butterflies = [], worm = null, nextWormAt = Infinity;

// ---------- bichinho com fome ----------
function nextVisitor() {
  const growing = plots.filter(p => p.crop).sort((a, b) => b.stage - a.stage).map(p => p.crop);
  const pool = VISITORS.filter(v => v !== lastVisitor);
  const d = pool.find(v => v.want === growing[0]) || pool.find(v => growing.includes(v.want)) || pick(pool);
  visitor = { d, state: 'in', t0: clock, hopAt: -9, s: L.s * (d.fly ? .85 : 1.15) };
  lastVisitor = d;
}

function visitorPos() {
  const v = visitor, { x, y } = L.visitor, k = Math.min((clock - v.t0) / WALK_TIME, 1);
  const off = -v.s * 1.2 - x;   // de fora da tela, pela esquerda
  let vx = x;
  if (v.state === 'in') vx = x + off * (1 - k) ** 2;
  if (v.state === 'out') vx = x + off * k * k;
  const walking = (v.state === 'in' || v.state === 'out') && k < 1;
  const hop = walking ? Math.abs(Math.sin(k * Math.PI * 5)) * v.s * .15 : Math.max(0, Math.sin((clock - v.hopAt) / .4 * Math.PI)) * v.s * .25 * (clock - v.hopAt < .4);
  const fly = v.d.fly ? v.s * (.8 + Math.sin(clock * 3) * .12) : 0;
  return { x: vx, y: y - hop - fly, walking };
}
const mouthOf = () => { const p = visitorPos(); return [p.x + visitor.s * .25, p.y - visitor.s * .5]; };

function visitorWaiting() { return visitor && visitor.state === 'wait'; }

function updateVisitor() {
  const v = visitor;
  if (!v) return;
  const age = clock - v.t0;
  if (v.state === 'in' && age >= WALK_TIME) {
    v.state = 'wait'; v.t0 = clock;
    onVisitorArrived(v);
  } else if (v.state === 'eat' && age >= EAT_TIME) {
    launchStar(...mouthOf());
    v.state = 'out'; v.t0 = clock;
  } else if (v.state === 'out' && age >= WALK_TIME) {
    visitor = null;
    setTimeout(() => { if (!visitor) nextVisitor(); }, 1500);
  }
}

function feedVisitor() {
  visitor.state = 'eat'; visitor.t0 = clock;
  sfx.gulp(); setTimeout(() => sfx.gulp(), 350); setTimeout(() => sfx.burp?.(), 900);
  const [mx, my] = mouthOf();
  for (let i = 0; i < 4; i++) floaters.push({ e: '💖', x: mx + rand(-20, 20), y: my, t0: clock + i * .2 });
  burst(mx, my, L.s * .4, 340, 12);
  onVisitorFed(visitor);
}

function tapVisitor(x, y) {
  if (!visitor) return false;
  const p = visitorPos(), s = visitor.s;
  if (Math.abs(x - p.x) > s * .7 || y < p.y - s * 1.3 || y > p.y + s * .2) return false;
  visitor.hopAt = clock; sfx.boing();
  if (visitor.state === 'wait') onVisitorTapped(visitor);
  return true;
}

function drawVisitor(t) {
  const v = visitor;
  if (!v) return;
  const p = visitorPos(), s = v.s, eating = v.state === 'eat';
  const faceRight = v.state !== 'out';
  if (!v.d.fly) { ctx.fillStyle = 'rgb(40 80 30 / .2)'; ctx.beginPath(); ctx.ellipse(p.x, L.visitor.y, s * .45, s * .12, 0, 0, TAU); ctx.fill(); }
  const munch = eating ? 1 + Math.sin(clock * 22) * .08 : 1;
  const sz = Math.round(s / 4) * 4;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.rotate(p.walking ? Math.sin(t * 14) * .08 : 0);
  ctx.scale(faceRight ? -1 : 1, 1); ctx.scale(1 / munch, munch);
  ctx.drawImage(emojiSprite(v.d.e, sz), -sz / 2, -sz * .93, sz, sz);
  ctx.restore();
  if (v.state === 'wait') drawWish(p, s, t);
}

// balão de pensamento com o legume que ele quer
function drawWish(p, s, t) {
  const bx = p.x + s * .75, by = p.y - s * 1.35 + Math.sin(t * 2.5) * s * .05, r = s * .38;
  ctx.fillStyle = 'rgb(255 255 255 / .95)';
  circle(ctx, p.x + s * .3, p.y - s * .95, r * .14); ctx.fill();
  circle(ctx, p.x + s * .45, p.y - s * 1.08, r * .22); ctx.fill();
  circle(ctx, bx, by, r); ctx.fill();
  ctx.strokeStyle = 'rgb(120 180 90 / .5)'; ctx.lineWidth = 2; ctx.stroke();
  emojiAt(ctx, CROPS[visitor.d.want].e, bx, by, r * 1.4 * (1 + Math.sin(t * 4) * .06));
}

// ---------- legumes voando (pra boca do bicho ou pra cestinha) ----------
function flyCrop(crop, x, y, to) {
  const [tx, ty] = to === 'visitor' ? mouthOf() : [L.basket.x, L.basket.y - L.s * .45];
  flyers.push({ crop, x0: x, y0: y, tx, ty, t0: clock, dur: .85, to });
  sfx.whoosh();
}

function updateFlyers() {
  for (const f of flyers) {
    if (clock - f.t0 < f.dur) continue;
    f.done = true;
    if (f.to === 'visitor' && visitor) feedVisitor();
    else {
      basket = [...basket, f.crop].slice(-8); basketHopAt = clock; sfx.pop();
      burst(L.basket.x, L.basket.y - L.s * .4, L.s * .35, 45, 8);
      launchStar(L.basket.x, L.basket.y - L.s * .5);
    }
  }
  flyers = flyers.filter(f => !f.done);
}

function drawFlyers() {
  for (const f of flyers) {
    const k = Math.min((clock - f.t0) / f.dur, 1), e = k * k * (3 - 2 * k);
    const x = f.x0 + (f.tx - f.x0) * e, y = f.y0 + (f.ty - f.y0) * e - Math.sin(k * Math.PI) * L.s * 1.2;
    emojiAt(ctx, CROPS[f.crop].e, x, y, L.s * (.7 - k * .2), k * 6);
  }
}

// ---------- cestinha ----------
function tapBasket(x, y) {
  const { x: bx, y: by } = L.basket, s = L.s;
  if (Math.abs(x - bx) > s * .7 || y < by - s * .9 || y > by + s * .2) return false;
  basketHopAt = clock; sfx.pop();
  burst(bx, by - s * .4, s * .3, 45, 6);
  return true;
}

function drawBasket(t) {
  const { x, y } = L.basket, s = L.s, hop = Math.max(0, Math.sin(Math.min((clock - basketHopAt) / .35, 1) * Math.PI)) * s * .12;
  ctx.fillStyle = 'rgb(40 80 30 / .2)'; ctx.beginPath(); ctx.ellipse(x, y, s * .6, s * .13, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y - hop);
  basket.forEach((c, i) => emojiAt(ctx, CROPS[c].e, (i % 4 - 1.5) * s * .24, -s * .52 - (i >= 4) * s * .18, s * .42, (i % 3 - 1) * .3));
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = s * .07;
  ctx.beginPath(); ctx.arc(0, -s * .45, s * .42, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.fillStyle = '#c68a4c'; ctx.beginPath();
  ctx.moveTo(-s * .55, -s * .48); ctx.lineTo(s * .55, -s * .48); ctx.lineTo(s * .42, 0); ctx.lineTo(-s * .42, 0); ctx.fill();
  ctx.strokeStyle = '#a06a35'; ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) { const yy = -s * .48 + i * s * .12; ctx.beginPath(); ctx.moveTo(-s * (.55 - i * .035), yy); ctx.lineTo(s * (.55 - i * .035), yy); ctx.stroke(); }
  ctx.fillStyle = '#e0a868'; ctx.beginPath(); ctx.roundRect(-s * .6, -s * .56, s * 1.2, s * .12, s * .06); ctx.fill();
  ctx.restore();
}

// ---------- corações e bichinhos soltos ----------
function drawFloaters() {
  for (const f of floaters) {
    const k = (clock - f.t0) / 1.2;
    if (k < 0) continue;
    ctx.globalAlpha = Math.max(0, 1 - k);
    emojiAt(ctx, f.e, f.x + Math.sin(k * 6) * 8, f.y - k * L.s * 1.1, L.s * .35);
  }
  ctx.globalAlpha = 1;
  floaters = floaters.filter(f => clock - f.t0 < 1.2);
}

// ---------- borboletas ----------
function butterflyGoal(b) {
  const flowers = plots.filter(p => p.stage >= 3 && !p.busy);
  if (flowers.length && Math.random() < .5) {
    const p = pick(flowers);
    return { x: p.x + rand(-L.s * .2, L.s * .2), y: plantTop(p) + L.s * .15, perch: true };
  }
  return { x: rand(W * .08, W * .92), y: rand(H * .18, L.fenceY), perch: false };
}

function makeButterflies() {
  butterflies = BF_COLORS.map((col, i) => {
    const b = { col, x: rand(W * .1, W * .9), y: rand(H * .2, L.fenceY), phase: i * 2.1, sitUntil: 0, fast: 0 };
    return { ...b, goal: butterflyGoal(b) };
  });
}

function updateButterflies(dt) {
  for (const b of butterflies) {
    if (clock < b.sitUntil) continue;
    const dx = b.goal.x - b.x, dy = b.goal.y - b.y, d = Math.hypot(dx, dy), sp = L.s * (b.fast > clock ? 4 : 1.3);
    if (d < 4) {
      if (b.goal.perch) b.sitUntil = clock + rand(2, 4);
      b.goal = butterflyGoal(b);
      continue;
    }
    const step = Math.min(d, sp * dt);
    b.x += dx / d * step + Math.sin(clock * 3 + b.phase) * L.s * .6 * dt;
    b.y += dy / d * step + Math.cos(clock * 4.3 + b.phase) * L.s * .8 * dt;
    b.dir = dx > 0 ? 1 : -1;
  }
}

// quem estava pousado na planta que a criança mexeu sai voando
function shooButterflies(x, y) {
  for (const b of butterflies) {
    if (clock >= b.sitUntil || Math.hypot(x - b.x, y - b.y) > L.s * 1.2) continue;
    b.sitUntil = 0; b.fast = clock + 1;
    b.goal = { x: rand(W * .1, W * .9), y: rand(H * .15, H * .3), perch: false };
  }
}

function tapButterfly(x, y) {
  const b = butterflies.find(b => Math.hypot(x - b.x, y - b.y) < L.s * .5);
  if (!b) return false;
  b.sitUntil = 0; b.fast = clock + 1.2;
  b.goal = { x: rand(W * .1, W * .9), y: rand(H * .15, H * .3), perch: false };
  sfx.chime(); burst(b.x, b.y, L.s * .3, 300, 10);
  onButterfly();
  return true;
}

function drawButterfly(b, t) {
  const s = L.s * .3, sitting = clock < b.sitUntil;
  const flap = sitting ? .55 + Math.sin(t * 3 + b.phase) * .35 : Math.abs(Math.sin(t * (b.fast > clock ? 30 : 16) + b.phase));
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.dir || 1, 1); ctx.rotate(-.2);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side * (.25 + .75 * flap), 1);
    ctx.fillStyle = b.col[0];
    ctx.beginPath(); ctx.ellipse(s * .5, -s * .35, s * .55, s * .42, -.5, 0, TAU); ctx.fill();
    ctx.fillStyle = b.col[1];
    ctx.beginPath(); ctx.ellipse(s * .42, s * .28, s * .36, s * .28, .5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .7)'; circle(ctx, s * .55, -s * .38, s * .14); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#4a3350'; ctx.beginPath(); ctx.ellipse(0, 0, s * .1, s * .45, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4a3350'; ctx.lineWidth = Math.max(1, s * .05);
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -s * .4); ctx.quadraticCurveTo(side * s * .1, -s * .7, side * s * .25, -s * .75); ctx.stroke(); }
  ctx.restore();
}

// ---------- minhoca: sai da terra, dá tchau e volta ----------
function spawnWorm() {
  const { xs, s, plotY } = L;
  const spots = [[(xs[0] + xs[1]) / 2, plotY + s * .02], [(xs[1] + xs[2]) / 2, plotY + s * .02], [xs[0] - s * .55, plotY + s * .2], [xs[2] + s * .55, plotY + s * .2]];
  const [x, y] = pick(spots);
  worm = { x, y, t0: clock, stay: 4.5, tickleAt: -9 };
}

function wormRise() {
  const age = clock - worm.t0;
  if (age < .5) return age / .5;
  if (age < .5 + worm.stay) return 1;
  return Math.max(0, 1 - (age - .5 - worm.stay) / .5);
}

function updateWorm() {
  if (!worm && clock > nextWormAt) spawnWorm();
  if (worm && clock - worm.t0 > worm.stay + 1) { worm = null; nextWormAt = clock + rand(9, 16); }
}

function tapWorm(x, y) {
  if (!worm || wormRise() < .3) return false;
  const s = L.s;
  if (Math.abs(x - worm.x) > s * .4 || y < worm.y - s * .8 || y > worm.y + s * .2) return false;
  worm.tickleAt = clock; worm.stay = Math.max(worm.stay, clock - worm.t0 + 1.5);
  sfx.giggle(x / W * 2 - 1); sfx.squeak();
  floaters.push({ e: '💗', x: worm.x, y: worm.y - s * .6, t0: clock });
  onWorm();
  return true;
}

function drawWorm(t) {
  if (!worm) return;
  const s = L.s, k = wormRise(), len = s * .5 * k, tick = clock - worm.tickleAt < 1.2;
  ctx.fillStyle = '#3b2010'; ctx.beginPath(); ctx.ellipse(worm.x, worm.y, s * .16, s * .05, 0, 0, TAU); ctx.fill();
  if (k <= 0) return;
  const wig = tick ? 22 : 4, amp = s * (tick ? .09 : .05), r = s * .075;
  ctx.save();
  ctx.beginPath(); ctx.rect(worm.x - s, worm.y - s * 2, s * 2, s * 2); ctx.clip();   // entra na terra
  const pts = [];
  for (let i = 0; i <= 10; i++) { const f = i / 10; pts.push([worm.x + Math.sin(t * wig + f * 4) * amp * f, worm.y + s * .05 - len * f]); }
  ctx.fillStyle = '#e9859a';
  for (const [px, py] of pts) { circle(ctx, px, py, r); ctx.fill(); }
  ctx.fillStyle = '#f7a9b8';
  for (const [px, py] of pts.slice(2, 9)) { circle(ctx, px - r * .25, py, r * .45); ctx.fill(); }
  const [hx, hy] = pts[10];
  ctx.fillStyle = '#ef93a6'; circle(ctx, hx, hy, r * 1.35); ctx.fill();
  const blink = Math.sin(t * 1.3) > .96 || tick;
  ctx.fillStyle = '#2b2140'; ctx.strokeStyle = '#2b2140'; ctx.lineWidth = r * .22; ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    if (blink) { ctx.beginPath(); ctx.arc(hx + d * r * .45, hy - r * .15, r * .22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else { circle(ctx, hx + d * r * .45, hy - r * .2, r * .2); ctx.fill(); }
  }
  ctx.beginPath(); ctx.arc(hx, hy + r * .2, r * .4, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgb(255 90 120 / .45)';
  for (const d of [-1, 1]) { circle(ctx, hx + d * r * .85, hy + r * .25, r * .22); ctx.fill(); }
  ctx.restore();
}
