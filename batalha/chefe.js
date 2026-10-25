'use strict';
// o chefão: cavaleiro gigante de armadura vermelha com espinhos, capacete prateado e lança listrada.
// Desenhado num canvas próprio pra poder piscar branco inteiro quando leva dano.

let bossCv = null, bossG = null;

function drawKnight(g, S, t, swing, walk) {
  const red = g.createLinearGradient(-S * .5, -S, S * .5, 0); red.addColorStop(0, '#ff5b52'); red.addColorStop(.5, '#d42126'); red.addColorStop(1, '#7c0b12');
  const steel = g.createLinearGradient(-S * .3, -S * 1.25, S * .3, -S * .8); steel.addColorStop(0, '#ffffff'); steel.addColorStop(.5, '#c9d2de'); steel.addColorStop(1, '#7d8898');
  const st = Math.sin(walk) * S * .04;
  g.fillStyle = 'rgb(0 0 0 / .28)'; g.beginPath(); g.ellipse(0, 0, S * .45, S * .1, 0, 0, TAU); g.fill();
  // pernas
  for (const d of [-1, 1]) {
    g.fillStyle = '#5a0a10'; g.beginPath(); g.roundRect(d * S * .17 - S * .1, -S * .32 - st * d, S * .2, S * .3, S * .06); g.fill();
    g.fillStyle = '#2a2a33'; g.beginPath(); g.ellipse(d * S * .17, -S * .03 - st * d, S * .13, S * .07, 0, 0, TAU); g.fill();
  }
  // escudo (braço esquerdo)
  g.save(); g.translate(-S * .45, -S * .55);
  g.fillStyle = red; circle(g, 0, 0, S * .24); g.fill();
  g.strokeStyle = '#3a3a44'; g.lineWidth = S * .04; g.stroke();
  g.fillStyle = '#2a2a33'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; spike(g, Math.cos(a) * S * .24, Math.sin(a) * S * .24, a, S * .08); }
  g.fillStyle = '#ffd23f'; circle(g, 0, 0, S * .06); g.fill();
  g.restore();
  // corpo
  g.fillStyle = red; g.beginPath(); g.ellipse(0, -S * .55, S * .34, S * .3, 0, 0, TAU); g.fill();
  g.fillStyle = '#2a2a33'; g.fillRect(-S * .3, -S * .4, S * .6, S * .06);
  g.fillStyle = '#ffd23f'; g.beginPath(); g.roundRect(-S * .05, -S * .41, S * .1, S * .08, S * .02); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.ellipse(-S * .13, -S * .66, S * .08, S * .13, -.4, 0, TAU); g.fill();
  // ombreiras com espinhos
  for (const d of [-1, 1]) {
    g.fillStyle = red; circle(g, d * S * .3, -S * .74, S * .15); g.fill();
    g.fillStyle = '#2a2a33'; for (const a of [-1.9, -1.2, -.5]) { const aa = d > 0 ? a : Math.PI - a; spike(g, d * S * .3 + Math.cos(aa) * S * .14, -S * .74 + Math.sin(aa) * S * .14, aa, S * .09); }
  }
  // cabeça: capacete prateado, viseira escura com olhos vermelhos e sorrisão
  g.fillStyle = steel; g.beginPath(); g.ellipse(0, -S * .98, S * .19, S * .21, 0, 0, TAU); g.fill();
  g.fillStyle = '#c4212a'; g.beginPath(); g.moveTo(-S * .03, -S * 1.18); g.quadraticCurveTo(S * .02, -S * 1.38, S * .14, -S * 1.32); g.quadraticCurveTo(S * .05, -S * 1.25, S * .04, -S * 1.17); g.fill();   // pluma
  g.fillStyle = '#1c1c26'; g.beginPath(); g.roundRect(-S * .14, -S * 1.02, S * .28, S * .14, S * .05); g.fill();
  g.fillStyle = '#ff3b3b'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * S * .065, -S * .97, S * .035, S * .022, d * .3, 0, TAU); g.fill(); }
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-S * .09, -S * .9); g.quadraticCurveTo(0, -S * .83, S * .09, -S * .9); g.quadraticCurveTo(0, -S * .87, -S * .09, -S * .9); g.fill();
  g.strokeStyle = 'rgb(80 90 110 / .6)'; g.lineWidth = S * .012;
  for (const x of [-.1, -.03, .04, .11]) { g.beginPath(); g.moveTo(x * S, -S * 1.1); g.lineTo(x * S, -S * 1.04); g.stroke(); }
  // braço direito com a lança listrada (gira no ataque)
  g.save(); g.translate(S * .38, -S * .62); g.rotate(-.5 + swing);
  g.fillStyle = red; circle(g, 0, 0, S * .1); g.fill();
  g.fillStyle = '#5a5a66'; g.fillRect(-S * .025, -S * .1, S * .05, S * .4);
  const L = S * .95;
  g.beginPath(); g.moveTo(-S * .1, -S * .08); g.lineTo(0, -L); g.lineTo(S * .1, -S * .08); g.closePath();
  g.fillStyle = '#e8edf3'; g.fill();
  g.save(); g.clip(); g.fillStyle = '#c4212a';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-S * .2, -S * .1 - i * L * .16); g.lineTo(S * .2, -S * .18 - i * L * .16); g.lineTo(S * .2, -S * .24 - i * L * .16); g.lineTo(-S * .2, -S * .16 - i * L * .16); g.fill(); }
  g.restore();
  g.fillStyle = '#2a2a33'; g.beginPath(); g.ellipse(0, -S * .08, S * .14, S * .05, 0, 0, TAU); g.fill();
  g.restore();
}

function spike(g, x, y, a, len) {
  g.beginPath(); g.moveTo(x + Math.cos(a + 1.57) * len * .35, y + Math.sin(a + 1.57) * len * .35);
  g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  g.lineTo(x + Math.cos(a - 1.57) * len * .35, y + Math.sin(a - 1.57) * len * .35); g.fill();
}

// boss: { u, v, hp, max, hitAt, dead, deadAt, walk, swingAt }
function drawBoss(b, t) {
  const [x, y, s] = proj(b.u, b.v), S = Math.min(P.wN, H * .3) * 1.5 * s, pad = S * .8;
  const w = Math.ceil(S * 2.2), h = Math.ceil(S * 1.65);
  if (!bossCv || bossCv.w < w || bossCv.h < h) [bossCv, bossG] = layer(w, h);
  const g = bossG;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, bossCv.w, bossCv.h);
  g.save(); g.translate(w / 2, h - S * .1);
  const swing = Math.sin(clamp01((clock - b.swingAt) / .6) * Math.PI) * 1.1;
  drawKnight(g, S, t, swing, b.walk);
  g.restore();
  const flash = clamp01(1 - (clock - b.hitAt) / .1);
  if (flash > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgb(255 255 255 / ${.6 * flash})`; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
  ctx.save();
  if (b.dead) { const k = clamp01((clock - b.deadAt) / 1.2); ctx.globalAlpha = 1 - k; ctx.translate(x, y); ctx.rotate(k * .9); ctx.translate(-x, -y); }
  ctx.drawImage(bossCv, 0, 0, w * DPR, h * DPR, x - w / 2, y - h + S * .1, w, h);
  ctx.restore();
  return pad;
}

// barra de vida do chefão no topo, no lugar da barra do exército
function drawBossBar(b, y) {
  const w = Math.min(W * .56, 280), h = Math.max(16, P.wN * .13), x = W / 2, k = clamp01(b.hp / b.max);
  const pop = easeOutBack(clamp01((clock - b.bornAt) / .5));
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgb(20 10 20 / .85)'; ctx.beginPath(); ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
  ctx.fillStyle = '#ff3340'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, Math.max(h, w * k), h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -h / 2 + 2, Math.max(0, w * k - 6), h * .3, h * .15); ctx.fill();
  bigText(ctx, String(Math.ceil(b.hp)), 0, h * 1.25, h * 1.3, '#fff', '#1a0a14', .18);
  emojiAt(ctx, '💀', -w / 2 - h * .2, 0, h * 1.6);
  ctx.restore();
}

function emojiAt(g, e, x, y, size) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.drawImage(emojiSprite(e, sz), x - sz / 2, y - sz / 2, sz, sz);
}
