'use strict';
// "ganhou vida": o desenho pintado sai do papel e se mexe num cenário (mar, céu, jardim, estrada...)

const noiseAt = i => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
let alivePts = [], emitClock = [];

// ---------- cenários ----------
function skyGradient(top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function puff(x, y, s, color = '#fff') {
  ctx.fillStyle = color;
  for (const [dx, dy, r] of [[-.9, .2, .55], [-.3, -.25, .75], [.45, -.1, .65], [.95, .25, .45], [0, .3, .6]]) { circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
}

function drawClouds(t, n = 3) {
  for (let i = 0; i < n; i++) {
    const s = Math.min(W, H) * (.07 + noiseAt(i + 3) * .05), span = W + s * 6;
    const x = ((noiseAt(i) * span + t * (12 + i * 6)) % span) - s * 3;
    puff(x, H * (.1 + noiseAt(i + 9) * .22), s, 'rgb(255 255 255 / .9)');
  }
}

function drawGrass(y, color = '#7fd46b', dark = '#5fbd52') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, y);
  ctx.bezierCurveTo(W * .3, y - H * .05, W * .7, y + H * .04, W, y - H * .02);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = dark;
  for (let i = 0; i < 18; i++) {
    const x = noiseAt(i + 40) * W, yy = y + H * .04 + noiseAt(i + 60) * (H - y) * .8;
    ctx.beginPath(); ctx.ellipse(x, yy, 6, 2.5, 0, 0, TAU); ctx.fill();
  }
}

const SCENES = {
  sea(t) {
    skyGradient('#7fdcff', '#1c6fb8');
    ctx.fillStyle = 'rgb(255 255 255 / .08)';
    for (let i = 0; i < 4; i++) {
      const x = W * (.15 + i * .25) + Math.sin(t * .5 + i) * 20;
      ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 20, 0); ctx.lineTo(x + 90, H); ctx.lineTo(x + 30, H); ctx.fill();
    }
    ctx.fillStyle = '#f3dca0';
    ctx.beginPath(); ctx.ellipse(W / 2, H * 1.02, W * .9, H * .12, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3fbf7a'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(6, W * .018);
    for (let i = 0; i < 6; i++) {
      const x = W * (.06 + i * .18 + noiseAt(i) * .05), h = H * (.14 + noiseAt(i + 5) * .14);
      ctx.beginPath(); ctx.moveTo(x, H);
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(t * 2 + i + k * .8) * 10 * k / 6, H - h * k / 6);
      ctx.stroke();
    }
  },
  sky(t) { skyGradient('#6fc3ff', '#e6f6ff'); drawClouds(t); },
  garden(t) {
    skyGradient('#8fd3ff', '#eaf8ff');
    ctx.fillStyle = '#ffe36b'; circle(ctx, W * .85, H * .12, Math.min(W, H) * .07); ctx.fill();
    drawClouds(t, 2);
    drawGrass(ground() - H * .02);
    for (let i = 0; i < 10; i++) {
      const x = noiseAt(i + 80) * W, y = ground() + H * .03 + noiseAt(i + 90) * H * .15;
      ctx.fillStyle = ['#ff7ac8', '#ffd93b', '#fff', '#a066ff'][i % 4];
      for (let p = 0; p < 5; p++) { circle(ctx, x + Math.cos(p * 1.26) * 5, y + Math.sin(p * 1.26) * 5, 4); ctx.fill(); }
      ctx.fillStyle = '#ffb000'; circle(ctx, x, y, 3); ctx.fill();
    }
  },
  road(t) {
    skyGradient('#7fcbff', '#e8f7ff');
    drawClouds(t, 3);
    const y = H * .7;
    drawGrass(y - H * .06);
    ctx.fillStyle = '#6d6f7d'; ctx.fillRect(0, y - H * .01, W, H * .09);
    ctx.fillStyle = '#fff';
    const dash = 34, off = (t * 40) % (dash * 2);
    for (let x = -off; x < W; x += dash * 2) ctx.fillRect(x, y + H * .03, dash, 4);
  },
  party(t) {
    skyGradient('#ffd6ec', '#e3d4ff');
    for (let i = 0; i < 26; i++) {
      const x = noiseAt(i) * W, y = (noiseAt(i + 30) * H + t * (20 + noiseAt(i + 7) * 30)) % (H + 20) - 10;
      ctx.fillStyle = `hsl(${noiseAt(i + 50) * 360} 90% 70% / .7)`;
      ctx.save(); ctx.translate(x + Math.sin(t * 2 + i) * 10, y); ctx.rotate(t * 2 + i);
      ctx.fillRect(-5, -3, 10, 6); ctx.restore();
    }
  },
  night(t) {
    skyGradient('#0e1a4f', '#3a3f8f');
    for (let i = 0; i < 50; i++) {
      ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * (1 + noiseAt(i + 3) * 2) + i));
      ctx.fillStyle = '#fff8d0';
      circle(ctx, noiseAt(i) * W, noiseAt(i + 100) * H * .9, 1 + noiseAt(i + 200) * 1.8); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  space(t) {
    skyGradient('#060a24', '#241a5a');
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      const sp = 30 + noiseAt(i + 5) * 120, y = (noiseAt(i + 70) * H + t * sp) % H;
      ctx.globalAlpha = .4 + noiseAt(i + 9) * .6;
      ctx.fillRect(noiseAt(i) * W, y, 1.6, 1.6 + sp / 40);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff9fd0'; circle(ctx, W * .82, H * .2, Math.min(W, H) * .08); ctx.fill();
    ctx.strokeStyle = 'rgb(255 255 255 / .6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(W * .82, H * .2, Math.min(W, H) * .13, Math.min(W, H) * .03, -.3, 0, TAU); ctx.stroke();
  },
  boat(t) {
    skyGradient('#7fcbff', '#e8f7ff');
    ctx.fillStyle = '#ffe36b'; circle(ctx, W * .82, H * .14, Math.min(W, H) * .08); ctx.fill();
    drawClouds(t, 2);
    waves(t, H * .62, '#3aa3e8', 0);
  },
};

function waves(t, y, color, phase) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, y + Math.sin(x / 40 + t * 2 + phase) * 7);
  ctx.lineTo(W, H); ctx.fill();
}

// o que fica na frente do desenho
const SCENE_FRONT = { boat(t) { waves(t, H * .67, 'rgb(40 140 220 / .85)', 2); } };

// ---------- desenho vivo ----------
function stageSize() { return Math.min(W * .78, H * .5); }

function fullMove(m) {
  const S = stageSize();
  return { x: m.x, y: m.y, k: S / 200 * (m.s ?? 1), rot: m.rot || 0, flip: m.flip || 1, pivot: m.pivot || [100, 100] };
}

function applyMove(g, m) {
  g.translate(m.x, m.y); g.rotate(m.rot); g.scale(m.k * m.flip, m.k); g.translate(-m.pivot[0], -m.pivot[1]);
}

function toScreen(m, [px, py]) {
  const dx = (px - m.pivot[0]) * m.k * m.flip, dy = (py - m.pivot[1]) * m.k, c = Math.cos(m.rot), s = Math.sin(m.rot);
  return [m.x + dx * c - dy * s, m.y + dx * s + dy * c];
}

function shapeCenter(sh) { return sh.c ? [sh.c[0], sh.c[1]] : sh.spot || [100, 100]; }

function drawAliveArt(a, fl, t) {
  const al = a.alive, m = fullMove(al.move(t)), still = fullMove((al.still || (() => al.move(0)))());
  a.shapes.forEach((sh, i) => {
    if (sh.tag === 'hide') return;
    ctx.save();
    applyMove(ctx, sh.tag === 'stay' ? still : m);
    const fn = al.parts?.[sh.tag];
    if (fn) {
      const p = fn(t, sh, i), [cx, cy] = [p.px ?? shapeCenter(sh)[0], p.py ?? shapeCenter(sh)[1]];
      ctx.translate((p.dx || 0) + cx, (p.dy || 0) + cy);
      ctx.rotate(p.rot || 0);
      ctx.scale(p.sx ?? 1, p.sy ?? 1);
      ctx.translate(-cx, -cy);
      if (p.a !== undefined) ctx.globalAlpha = clamp01(p.a);
    }
    drawShape(ctx, sh, fl[i], 1);
    ctx.restore();
  });
  return m;
}

// fumacinha, bolhas, coraçõezinhos e notas que saem do desenho
function emitAlive(a, t, m) {
  (a.alive.emit || []).forEach((e, j) => {
    if (t - (emitClock[j] ?? -9) < e.every) return;
    emitClock[j] = t;
    const [x, y] = toScreen(m, typeof e.at === 'function' ? e.at(t) : e.at);
    if (e.kind === 'sparkle') { sparkle(x, y); burst(x, y, R * .12, rand(0, 360), 3); return; }
    alivePts.push({ x, y, kind: e.kind, t: 0, life: e.kind === 'smoke' ? 1.4 : 2, vx: rand(-12, 12), r: m.k * rand(6, 10) });
  });
}

function drawAlivePts(dt) {
  for (const p of alivePts) { p.t += dt; p.x += p.vx * dt; p.y -= (p.kind === 'smoke' ? 30 : 45) * dt; }
  alivePts = alivePts.filter(p => p.t < p.life);
  for (const p of alivePts) {
    const k = p.t / p.life;
    ctx.globalAlpha = 1 - k;
    if (p.kind === 'smoke') { ctx.fillStyle = 'rgb(235 235 245 / .8)'; circle(ctx, p.x, p.y, p.r * (1 + k * 2)); ctx.fill(); }
    else if (p.kind === 'bubble') {
      ctx.strokeStyle = 'rgb(255 255 255 / .9)'; ctx.lineWidth = 2;
      circle(ctx, p.x + Math.sin(p.t * 6) * 4, p.y, p.r * .6); ctx.stroke();
    } else {
      const size = Math.round(R * .45 / 4) * 4;
      ctx.drawImage(emojiSprite(p.kind === 'heart' ? '💖' : '🎵', size), p.x - size / 2 + Math.sin(p.t * 4) * 6, p.y - size / 2, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

function resetAlive() { alivePts = []; emitClock = []; }
