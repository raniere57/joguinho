'use strict';
// partículas, anéis de estouro e chuva de confete

const RING_LIFE = .35;
const MAX_PARTICLES = 400;
let particles = [], rings = [], confetti = [];

function addParticle(p) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(p);
}

function burst(x, y, r, hue, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = r * rand(2, 4.5), isStar = i % 3 === 0;
    addParticle({
      x: x + Math.cos(a) * r * .8, y: y + Math.sin(a) * r * .8,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - r,
      life: 1, decay: rand(1.2, 1.8), size: r * (isStar ? rand(.1, .16) : rand(.04, .08)),
      color: isStar ? `hsl(${hue + rand(-40, 40)} 100% 62%)` : `hsl(${hue} 100% 78%)`,
      star: isStar, rot: rand(0, TAU), vr: rand(-6, 6),
    });
  }
}

function sparkle(x, y) {
  addParticle({
    x, y, vx: rand(-20, 20), vy: rand(-20, 20), life: .6, decay: 2.2,
    size: rand(2, 4), color: '#fff6b0', star: false, rot: 0, vr: 0,
  });
}

function ring(x, y, r) { rings.push({ x, y, r, t: 0 }); }

function confettiRain(n = 140) {
  for (let i = 0; i < n; i++) {
    confetti.push({
      x: rand(0, W), y: rand(-H * .5, -10), vy: rand(H * .25, H * .45), phase: rand(0, TAU),
      w: rand(10, 18), h: rand(7, 11), rot: rand(0, TAU), vr: rand(-5, 5), color: pick(CONFETTI_COLORS),
    });
  }
}

function updateEffects(dt, t) {
  for (const r of rings) r.t += dt;
  rings = rings.filter(r => r.t < RING_LIFE);

  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += R * 6 * dt;
    p.rot += p.vr * dt; p.life -= p.decay * dt;
  }
  particles = particles.filter(p => p.life > 0);

  for (const c of confetti) {
    c.y += c.vy * dt; c.x += Math.sin(t * 3 + c.phase) * 40 * dt; c.rot += c.vr * dt;
  }
  confetti = confetti.filter(c => c.y < H + 20);
}

function drawRings() {
  ctx.strokeStyle = '#fff';
  for (const r of rings) {
    const p = r.t / RING_LIFE;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = r.r * .12 * (1 - p);
    circle(ctx, r.x, r.y, r.r * (1 + .5 * p)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(p.life * 1.5, 1);
    ctx.fillStyle = p.color;
    if (p.star) star(ctx, p.x, p.y, p.size, p.rot);
    else { circle(ctx, p.x, p.y, p.size); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

function drawConfetti() {
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 1.3)));
    ctx.restore();
  }
}
