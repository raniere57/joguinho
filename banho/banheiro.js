'use strict';
// o banheiro: azulejo, janelinha, prateleira, banheira de pé com água, torneira, chuveirinho e toalha.
// A banheira é uma elipse (a boca) + corpo na frente; água e espuma ficam dentro da elipse.

let L = {}, roomLayer = null;
const water = { level: 0, goal: 0, pourUntil: 0 };

function layoutBath() {
  const port = H > W;
  const floorY = H * (port ? .74 : .8);
  const rx = port ? W * .44 : Math.min(W * .3, H * .62), cx = port ? W * .5 : W * .46;
  const rimY = H * (port ? .58 : .6), ry = rx * (port ? .27 : .2);
  const r = port ? Math.min(W * .15, H * .068) : H * .12;
  L = {
    port, floorY, cx, rimY, rx, ry, r,
    tubBot: floorY + H * (port ? .03 : .08),
    head: [cx - rx * .08, rimY - r * 1.02],
    faucet: [cx + rx * .9, rimY - ry * .35],
    bottle: [cx - rx * .86, rimY - ry * .15],
    hook: [cx - rx * .62, rimY - (port ? H * .22 : H * .4)],
    towel: port ? [W * .8, H * .2] : [W * .075, H * .5],
  };
  roomLayer = buildRoom();
}

// ponto da água (ux, uy em -1..1) → tela
const waterXY = (ux, uy) => [L.cx + ux * L.rx * .86, L.rimY + L.ry * .08 + uy * L.ry * .62];
const inWater = (x, y) => ((x - L.cx) / (L.rx * .9)) ** 2 + ((y - L.rimY - L.ry * .08) / (L.ry * .8)) ** 2 < 1;

// ---------- cenário parado ----------
function buildRoom() {
  const [c, g] = layer(W, H), { floorY } = L, tile = Math.max(30, Math.min(W, H) / 9);
  g.fillStyle = '#d4f0f6'; g.fillRect(0, 0, W, floorY);
  g.strokeStyle = 'rgb(255 255 255 / .8)'; g.lineWidth = 2;
  for (let y = floorY; y > 0; y -= tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += tile) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, floorY); g.stroke(); }
  g.fillStyle = '#9fdcea'; g.fillRect(0, floorY - tile * .35, W, tile * .35);   // faixa
  g.fillStyle = 'rgb(255 255 255 / .5)'; g.fillRect(0, floorY - tile * .35, W, 3);
  // chão xadrez
  const ft = tile * .9;
  for (let y = floorY, j = 0; y < H; y += ft, j++) for (let x = 0, i = 0; x < W; x += ft, i++) {
    g.fillStyle = (i + j) % 2 ? '#ffffff' : '#bfe6f2'; g.fillRect(x, y, ft, ft);
  }
  g.fillStyle = 'rgb(40 90 120 / .12)'; g.fillRect(0, floorY, W, 6);
  // janelinha redonda com céu
  const [wx, wy, wr] = L.port ? [W * .22, H * .2, W * .13] : [W * .12, H * .3, H * .13];
  g.fillStyle = '#fff'; circle(g, wx, wy, wr * 1.15); g.fill();
  const sky = g.createLinearGradient(0, wy - wr, 0, wy + wr);
  sky.addColorStop(0, '#6cc4ff'); sky.addColorStop(1, '#d7f1ff');
  g.fillStyle = sky; circle(g, wx, wy, wr); g.fill();
  g.save(); circle(g, wx, wy, wr); g.clip();
  g.fillStyle = '#fff';
  for (const [dx, dy, k] of [[-.3, .1, .3], [0, 0, .38], [.3, .12, .28]]) { circle(g, wx + dx * wr, wy + dy * wr, k * wr); g.fill(); }
  g.restore();
  g.strokeStyle = '#fff'; g.lineWidth = wr * .08;
  g.beginPath(); g.moveTo(wx - wr, wy); g.lineTo(wx + wr, wy); g.moveTo(wx, wy - wr); g.lineTo(wx, wy + wr); g.stroke();
  // prateleira com frasquinhos
  const [sx, sy] = L.port ? [W * .58, H * .13] : [W * .66, H * .28], sw = L.port ? W * .3 : W * .18;
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(sx - sw / 2, sy, sw, 8, 4); g.fill();
  g.fillStyle = 'rgb(40 90 120 / .12)'; g.fillRect(sx - sw / 2 + 4, sy + 8, sw - 8, 4);
  const bs = sw / 6;
  [['#ff9ec2', 1.1], ['#8fd6ff', .8], ['#ffd76b', 1], ['#b9a4ff', .7]].forEach(([col, k], i) => {
    const bx = sx - sw * .38 + i * sw * .25, h = bs * 1.5 * k;
    g.fillStyle = col; g.beginPath(); g.roundRect(bx - bs * .35, sy - h, bs * .7, h, bs * .2); g.fill();
    g.fillStyle = 'rgb(255 255 255 / .6)'; g.fillRect(bx - bs * .2, sy - h * .7, bs * .12, h * .45);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(bx - bs * .15, sy - h - bs * .25, bs * .3, bs * .28, 3); g.fill();
  });
  // tapetinho e barra da toalha
  g.fillStyle = '#ffb3cf'; g.beginPath(); g.roundRect(L.cx - L.rx * .55, L.tubBot + (H - L.tubBot) * .25, L.rx * 1.1, Math.max(14, (H - L.tubBot) * .3), 14); g.fill();
  const [tx, ty] = L.towel;
  g.strokeStyle = '#b8c6d2'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(tx - L.r * .9, ty); g.lineTo(tx + L.r * .9, ty); g.stroke();
  // ganchinho do chuveirinho
  const [hx, hy] = L.hook;
  g.fillStyle = '#b8c6d2'; g.beginPath(); g.roundRect(hx - 6, hy - 4, 12, 18, 5); g.fill();
  drawTubBack(g);
  return c;
}

function drawTubBack(g) {
  const { cx, rimY, rx, ry } = L;
  g.fillStyle = '#e9f3f8'; g.beginPath(); g.ellipse(cx, rimY, rx, ry, 0, 0, TAU); g.fill();
  g.fillStyle = '#cfe2ec'; g.beginPath(); g.ellipse(cx, rimY + ry * .06, rx * .92, ry * .8, 0, 0, TAU); g.fill();
}

// frente da banheira (por cima do bichinho e da água) com pezinhos dourados
function drawTubFront(g) {
  const { cx, rimY, rx, ry, tubBot } = L;
  for (const d of [-1, 1]) {
    g.fillStyle = '#e8b33a'; g.beginPath(); g.ellipse(cx + d * rx * .72, tubBot - 4, rx * .08, (tubBot - rimY) * .12, d * .3, 0, TAU); g.fill();
  }
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(cx - rx, rimY);
  g.bezierCurveTo(cx - rx, tubBot - (tubBot - rimY) * .1, cx - rx * .75, tubBot, cx - rx * .55, tubBot - 6);
  g.lineTo(cx + rx * .55, tubBot - 6);
  g.bezierCurveTo(cx + rx * .75, tubBot, cx + rx, tubBot - (tubBot - rimY) * .1, cx + rx, rimY);
  g.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI, false); g.fill();
  const shade = g.createLinearGradient(0, rimY + ry, 0, tubBot);
  shade.addColorStop(0, 'rgb(120 170 200 / 0)'); shade.addColorStop(1, 'rgb(120 170 200 / .28)');
  g.fillStyle = shade; g.fill();
  g.fillStyle = 'rgb(255 255 255 / .9)'; g.beginPath(); g.ellipse(cx - rx * .55, rimY + ry * 1.4, rx * .12, ry * .25, -.3, 0, TAU); g.fill();
  g.strokeStyle = '#dbe9f1'; g.lineWidth = Math.max(3, ry * .12);
  g.beginPath(); g.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI); g.stroke();
}

// ---------- água ----------
function updateWater(dt) {
  if (water.level < water.goal) water.level = Math.min(water.goal, water.level + dt * .45);
  if (water.level > water.goal) water.level = Math.max(water.goal, water.level - dt * .6);
}

// a frente da água passa por cima da barriga do bichinho
function drawWaterFront() {
  const k = water.level;
  if (k <= .01) return;
  const { cx, rimY, rx, ry } = L, s = .6 + .4 * k;
  ctx.globalAlpha = .85 * k; ctx.fillStyle = '#86d3f5';
  ctx.beginPath(); ctx.ellipse(cx, rimY + ry * .08, rx * .9 * s, ry * .78 * s, 0, 0, Math.PI); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawWater(t) {
  const k = water.level;
  if (k <= .01) return;
  const { cx, rimY, rx, ry } = L;
  ctx.globalAlpha = .35 + .5 * k;
  ctx.fillStyle = '#7fd0f5'; ctx.beginPath(); ctx.ellipse(cx, rimY + ry * .08, rx * .9 * (.6 + .4 * k), ry * .78 * (.6 + .4 * k), 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgb(255 255 255 / .55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const [x, y] = waterXY(-.6 + i * .4, -.3 + (i % 2) * .5), w = rx * .12;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + Math.sin(t * 2 + i) * 3 - 3, x + w, y); ctx.stroke();
  }
}

// ---------- torneira (bica aponta pra esquerda, pra dentro da banheira) ----------
function drawFaucet(t) {
  const [x, y] = L.faucet, s = L.r * 1.2;
  ctx.fillStyle = '#b8c6d2'; ctx.beginPath(); ctx.roundRect(x - s * .1, y - s * .95, s * .22, s * .95, s * .08); ctx.fill();
  ctx.strokeStyle = '#cfdbe4'; ctx.lineWidth = s * .2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - s * .85); ctx.quadraticCurveTo(x - s * .1, y - s * 1.15, x - s * .5, y - s * 1.05); ctx.lineTo(x - s * .55, y - s * .8); ctx.stroke();
  ctx.fillStyle = 'rgb(255 255 255 / .8)'; ctx.fillRect(x - s * .05, y - s * .8, s * .05, s * .6);
  for (const [d, col] of [[-1, '#ff6b6b'], [1, '#5ab4ff']]) {
    const hx = x + d * s * .35, hy = y - s * .55, spin = water.pourUntil > clock ? t * 6 : 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(spin);
    ctx.fillStyle = '#e6eef3'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, s * .2, s * .07, i * Math.PI / 2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = col; circle(ctx, 0, 0, s * .08); ctx.fill();
    ctx.restore();
  }
  if (water.pourUntil > clock) {   // jato caindo na banheira
    const sx = x - s * .55, sy = y - s * .75, ey = L.rimY + L.ry * .2;
    ctx.strokeStyle = 'rgb(120 200 255 / .8)'; ctx.lineWidth = s * .16;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - s * .1, (sy + ey) / 2, sx - s * .15 + Math.sin(t * 30) * 2, ey); ctx.stroke();
    if (Math.random() < .5) addParticle({ x: sx - s * .15, y: ey, vx: rand(-40, 40), vy: -rand(40, 90), life: .4, decay: 2.5, size: rand(2, 3.5), color: '#9fdcff', star: false, rot: 0, vr: 0 });
  }
}
const hitFaucet = (x, y) => Math.hypot(x - L.faucet[0] + L.r * .3, y - L.faucet[1] + L.r * .8) < L.r * 1.2;

// ---------- frasco de espuma (em cima da borda) ----------
function drawBottle(t, squeezeAt) {
  const [x, y] = L.bottle, s = L.r * .95, sq = pulseAt(squeezeAt, .35);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sq * -.5); ctx.scale(1 + sq * .15, 1 - sq * .12);
  ctx.fillStyle = '#ff8fc0'; ctx.beginPath(); ctx.roundRect(-s * .32, -s * 1.05, s * .64, s * 1.05, s * .2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-s * .14, -s * 1.3, s * .28, s * .3, s * .06); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .85)'; ctx.beginPath(); ctx.roundRect(-s * .22, -s * .75, s * .44, s * .42, s * .1); ctx.fill();
  for (const [dx, dy, rr] of [[-.06, -.58, .09], [.08, -.5, .07], [0, -.44, .05]]) { ctx.strokeStyle = '#8fc8ff'; ctx.lineWidth = 2; circle(ctx, dx * s, dy * s, rr * s); ctx.stroke(); }
  ctx.restore();
}
const hitBottle = (x, y) => Math.hypot(x - L.bottle[0], y - L.bottle[1] + L.r * .5) < L.r * .85;

// ---------- chuveirinho ----------
function drawShower(x, y, spraying) {
  const s = L.r * .8;
  ctx.strokeStyle = '#b8c6d2'; ctx.lineWidth = s * .12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(L.cx - L.rx * .75, L.rimY - L.ry * .2);
  ctx.bezierCurveTo(L.cx - L.rx * .95, L.rimY - L.ry * 2.5, x - s, y + s * 2, x, y + s * .3); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.35);
  ctx.fillStyle = '#cfdbe4'; ctx.beginPath(); ctx.roundRect(-s * .1, 0, s * .2, s * .7, s * .08); ctx.fill();
  ctx.fillStyle = '#e6eef3'; ctx.beginPath(); ctx.ellipse(0, 0, s * .42, s * .2, 0, Math.PI, TAU); ctx.lineTo(s * .42, s * .02); ctx.lineTo(-s * .42, s * .02); ctx.fill();
  ctx.fillStyle = '#8fa2b3'; for (let i = -2; i <= 2; i++) { circle(ctx, i * s * .14, -s * .06, s * .03); ctx.fill(); }
  ctx.restore();
  if (spraying) for (let i = 0; i < 3; i++) addParticle({ x: x + rand(-s * .3, s * .3), y: y + s * .05, vx: rand(-60, 20), vy: rand(200, 320), life: .5, decay: 1.8, size: rand(2, 3.5), color: '#8fd6ff', star: false, rot: 0, vr: 0 });
}

// ---------- toalha no varão (ou voando pro bichinho) ----------
function drawTowelOnRack(k) {
  if (k >= 1) return;
  const [tx, ty] = L.towel, w = L.r * 1.5, h = L.r * 1.8;
  ctx.globalAlpha = 1 - k;
  ctx.fillStyle = '#ff9ec2'; ctx.beginPath(); ctx.roundRect(tx - w / 2, ty - 4, w, h, [4, 4, 14, 14]); ctx.fill();
  ctx.fillStyle = '#ffc6dc'; ctx.fillRect(tx - w / 2, ty + h * .7, w, h * .1);
  ctx.fillStyle = 'rgb(255 255 255 / .5)'; for (let i = 0; i < 4; i++) { circle(ctx, tx - w * .3 + i * w * .2, ty + h * .4, w * .05); ctx.fill(); }
  ctx.globalAlpha = 1;
}
const hitTowel = (x, y) => Math.abs(x - L.towel[0]) < L.r * 1.1 && y > L.towel[1] - L.r * .4 && y < L.towel[1] + L.r * 2.1;

const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
