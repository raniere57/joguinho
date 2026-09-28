'use strict';
// brinquedos que boiam: patinho (quá-quá e pula), barquinho (buzina e navega) e baleia (esguicha água).
// Posição na água em (ux, uy) de -1..1; dá pra arrastar.

const TOY_DEFS = {
  pato: { home: [-.72, .3] },
  barco: { home: [.68, -.1] },
  baleia: { home: [.5, .62] },
};
let toys = [];

function spawnToys() {
  toys = Object.entries(TOY_DEFS).map(([id, d], i) => ({ id, ux: d.home[0], uy: d.home[1], at: clock + i * .25, actAt: -9, sailTo: null }));
}

function toyXY(t) {
  const [x, y] = waterXY(t.ux, t.uy), bob = Math.sin(clock * 2.2 + t.ux * 5) * L.r * .05;
  return [x, y + bob];
}

function toyAt(x, y) {
  return toys.find(t => { const [tx, ty] = toyXY(t); return Math.hypot(x - tx, y - (ty - L.r * .3)) < L.r * .7; });
}

function actToy(t) {
  t.actAt = clock;
  const [x, y] = toyXY(t);
  if (t.id === 'pato') { sfx.squeak(); setTimeout(() => sfx.squeak(), 160); floaters.push({ e: '💛', x, y: y - L.r * .6, at: clock }); }
  if (t.id === 'barco') { sfx.honk(); t.sailTo = [t.ux > 0 ? -.72 : .68, clamp(-t.uy, -.6, .6)]; }
  if (t.id === 'baleia') {
    sfx.splash();
    for (let i = 0; i < 16; i++) addParticle({ x: x + L.r * .15, y: y - L.r * .45, vx: rand(-90, 90), vy: -rand(220, 380), life: .9, decay: 1.2, size: rand(2.5, 4.5), color: pick(['#8fd6ff', '#c8ecff', '#5ab4ff']), star: false, rot: 0, vr: 0 });
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function moveToy(t, x, y) {
  let ux = (x - L.cx) / (L.rx * .86), uy = (y - L.rimY - L.ry * .08) / (L.ry * .62);
  const d = Math.hypot(ux, uy);
  if (d > .95) { ux *= .95 / d; uy *= .95 / d; }
  t.ux = ux; t.uy = uy; t.sailTo = null;
}

function updateToys(dt) {
  for (const t of toys) {
    if (!t.sailTo) continue;
    const dx = t.sailTo[0] - t.ux, dy = t.sailTo[1] - t.uy, d = Math.hypot(dx, dy);
    if (d < .02) { t.sailTo = null; continue; }
    const step = Math.min(d, dt * .9);
    t.ux += dx / d * step; t.uy += dy / d * step;
  }
}

function drawToys(t, sink) {
  for (const toy of [...toys].sort((a, b) => a.uy - b.uy)) {
    const k = easeOutBack(Math.min(Math.max((clock - toy.at) / .4, 0), 1)) * (1 - sink);
    if (k <= .02) continue;
    const [x, y] = toyXY(toy), s = L.r * 1.1 * k, act = pulseAt(toy.actAt, .5);
    ctx.save(); ctx.translate(x, y - act * s * (toy.id === 'pato' ? .5 : .1));
    if (toy.id === 'pato') drawDuck(s, act, t);
    else if (toy.id === 'barco') drawBoat(s, t, toy.sailTo ? (toy.sailTo[0] > toy.ux ? 1 : -1) : 1);
    else drawWhale(s, act, t);
    ctx.restore();
  }
}

function drawDuck(s, act, t) {
  ctx.rotate(Math.sin(t * 2) * .06 + act * .3);
  ctx.fillStyle = '#ffd23b';
  ctx.beginPath(); ctx.ellipse(0, -s * .2, s * .5, s * .3, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * .45, -s * .3); ctx.lineTo(-s * .68, -s * .52); ctx.lineTo(-s * .38, -s * .42); ctx.fill();   // rabinho
  circle(ctx, s * .25, -s * .62, s * .26); ctx.fill();
  ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.ellipse(-s * .05, -s * .22, s * .22, s * .12, -.3, 0, TAU); ctx.fill();   // asinha
  ctx.fillStyle = '#ff8c2a'; ctx.beginPath(); ctx.ellipse(s * .5, -s * .56 + act * s * .02, s * .16, s * .07, .1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2b2140'; circle(ctx, s * .32, -s * .7, s * .05); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .6)'; ctx.beginPath(); ctx.ellipse(s * .15, -s * .78, s * .08, s * .04, -.5, 0, TAU); ctx.fill();
}

function drawBoat(s, t, dir) {
  ctx.scale(dir, 1); ctx.rotate(Math.sin(t * 2.5) * .08);
  ctx.fillStyle = '#ff5a4f';
  ctx.beginPath(); ctx.moveTo(-s * .6, -s * .25); ctx.lineTo(s * .6, -s * .25); ctx.lineTo(s * .4, 0); ctx.lineTo(-s * .45, 0); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-s * .6, -s * .25, s * 1.2, s * .07);
  ctx.fillStyle = '#8a5a34'; ctx.fillRect(-s * .03, -s * 1.05, s * .06, s * .8);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(s * .05, -s * 1); ctx.lineTo(s * .5, -s * .35); ctx.lineTo(s * .05, -s * .35); ctx.fill();
  ctx.fillStyle = '#5ab4ff'; ctx.beginPath(); ctx.moveTo(-s * .05, -s * .9); ctx.lineTo(-s * .4, -s * .35); ctx.lineTo(-s * .05, -s * .35); ctx.fill();
  ctx.fillStyle = '#ffd23b'; ctx.beginPath(); ctx.moveTo(s * .03, -s * 1.05); ctx.lineTo(s * .25, -s * .98); ctx.lineTo(s * .03, -s * .9); ctx.fill();
}

function drawWhale(s, act, t) {
  ctx.rotate(Math.sin(t * 1.8) * .05);
  ctx.fillStyle = '#5a9cff';
  ctx.beginPath(); ctx.ellipse(0, -s * .22, s * .58, s * .36, 0, Math.PI, TAU); ctx.lineTo(s * .58, -s * .05); ctx.lineTo(-s * .58, -s * .05); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * .5, -s * .2); ctx.quadraticCurveTo(-s * .8, -s * .35, -s * .85, -s * .6); ctx.quadraticCurveTo(-s * .65, -s * .45, -s * .55, -s * .5); ctx.fill();   // rabo
  ctx.fillStyle = '#bcd8ff'; ctx.beginPath(); ctx.ellipse(s * .1, -s * .1, s * .4, s * .1, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#2b2140'; circle(ctx, s * .3, -s * .35, s * .05); ctx.fill();
  ctx.strokeStyle = '#2b2140'; ctx.lineWidth = s * .03; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(s * .38, -s * .24, s * .08, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgb(255 120 150 / .5)'; circle(ctx, s * .42, -s * .22, s * .05); ctx.fill();
  if (act > 0) {   // esguicho
    ctx.fillStyle = 'rgb(140 210 255 / .85)';
    for (const [dx, h] of [[-.08, 1], [.08, .8], [0, 1.2]]) { ctx.beginPath(); ctx.ellipse(s * (.12 + dx), -s * (.55 + h * .4 * act), s * .07, s * .3 * act, dx * 3, 0, TAU); ctx.fill(); }
  }
}

// corações, notinhas: sobem e somem
let floaters = [];
function drawFloaters() {
  for (const f of floaters) {
    const k = (clock - f.at) / 1.2;
    ctx.globalAlpha = Math.max(0, 1 - k);
    const sz = Math.round(L.r * .5 / 4) * 4;
    ctx.drawImage(emojiSprite(f.e, sz), f.x - sz / 2 + Math.sin(k * 6) * 6, f.y - k * L.r - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
  floaters = floaters.filter(f => clock - f.at < 1.2);
}
