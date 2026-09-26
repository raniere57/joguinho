'use strict';
// o quartinho: parede, janela (passarinho, arco-íris, neve), móbile que gira e toca, ursinho e bola

const WINDOW_SHOWS = ['bird', 'rainbow', 'butterfly'];
let room = null, win = null, floorY = 0;
const mobile = { x: 0, y: 0, a: 0, boost: 0, song: null };
const teddy = { x: 0, y: 0, s: 0, hopAt: -99 };
const ball = { x: 0, y: 0, r: 0, homeX: 0, vx: 0, rot: 0, hopAt: -99 };
let toysK = 1;
let winShow = { kind: null, at: -99 }, winShowIdx = 0, snow = [];

function buildRoom() {
  const [c, g] = layer(W, H);
  floorY = H * .6;
  const wall = g.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, '#d9f0ff'); wall.addColorStop(1, '#eef8ff');
  g.fillStyle = wall; g.fillRect(0, 0, W, floorY);
  g.fillStyle = 'rgb(255 214 90 / .55)';
  const step = Math.max(46, W / 8);
  for (let y = step * .7, r = 0; y < floorY - 10; y += step, r++) {
    for (let x = (r % 2) * step / 2 + step / 3; x < W; x += step) star(g, x, y, step * .09, -Math.PI / 2);
  }
  // moldura da janela (o céu é desenhado ao vivo)
  const ww = Math.min(W * .3, 170), wh = ww * 1.05, wx = W * .08, wy = H * .12;
  win = { x: wx, y: wy, w: ww, h: wh };
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(wx - 8, wy - 8, ww + 16, wh + 16, ww * .5); g.fill();
  // rodapé, carpete e tapete
  g.fillStyle = '#fff'; g.fillRect(0, floorY - 4, W, 10);
  const carpet = g.createLinearGradient(0, floorY, 0, H);
  carpet.addColorStop(0, '#f6e3ff'); carpet.addColorStop(1, '#e7ccf7');
  g.fillStyle = carpet; g.fillRect(0, floorY + 6, W, H);
  const { hx, hy, hs } = baby;
  g.fillStyle = '#ffd6e8';
  g.beginPath(); g.ellipse(hx, hy + hs * 2.15, hs * 2.6, hs * .75, 0, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.setLineDash([10, 9]);
  g.beginPath(); g.ellipse(hx, hy + hs * 2.15, hs * 2.35, hs * .6, 0, 0, TAU); g.stroke();
  g.setLineDash([]);
  return c;
}

function placeRoomThings() {
  // brinquedos no chão, mas sempre acima da barra de botões
  const toy = Math.min(W * .12, 60), floor = Math.min(floorY + toy * 1.25, tools.offsetTop - 10);
  teddy.s = toy * 1.1; teddy.x = W * .12; teddy.y = floor;
  ball.r = toy * .42; ball.homeX = ball.x = W * .88; ball.y = floor - ball.r * .9; ball.vx = 0;
  mobile.x = Math.min(W * .8, W - baby.hs - 12); mobile.y = Math.max(H * .08, 58);   // no canto: longe da cabeça, do balão de pensamento e do medidor
}

// ---------- janela ----------
function drawWindow(t, snowy) {
  const { x, y, w, h } = win;
  ctx.save(); ctx.beginPath(); ctx.roundRect?.(x, y, w, h, w * .45); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  if (snowy) { sky.addColorStop(0, '#9fb8d6'); sky.addColorStop(1, '#e3edf7'); }
  else { sky.addColorStop(0, '#5ab8ff'); sky.addColorStop(1, '#c7ecff'); }
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  const age = clock - winShow.at;
  if (winShow.kind === 'rainbow' && age < 4) {
    ctx.globalAlpha = Math.min(age / .5, 1, (4 - age) / .6);
    ['#ff5f7e', '#ffa53b', '#ffe066', '#5ad16e', '#4fb4ff', '#b77cff'].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = w * .045;
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * .95, w * (.42 - i * .045), Math.PI, 0); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#fff';
  const drift = (t * 6) % (w * 1.4);
  for (const [cx, cy, r] of [[.35, .6, .14], [.52, .52, .18], [.68, .62, .13]]) {
    const xx = x + ((w * cx + drift) % (w * 1.4)) - w * .2;
    circle(ctx, xx, y + h * cy, w * r); ctx.fill();
  }
  if ((winShow.kind === 'bird' || winShow.kind === 'butterfly') && age < 3) {
    const size = Math.round(w * .3 / 4) * 4, px = x - size + (w + size * 2) * (age / 3);
    const py = y + h * .35 + Math.sin(age * (winShow.kind === 'bird' ? 6 : 9)) * h * .08;
    ctx.save(); ctx.translate(px, py); ctx.scale(-1, 1);
    ctx.drawImage(emojiSprite(winShow.kind === 'bird' ? '🐦' : '🦋', size), -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  if (snowy) {
    if (snow.length < 40) snow.push({ x: rand(0, 1), y: -.05, v: rand(.08, .16), r: rand(1.5, 3.5) });
    ctx.fillStyle = '#fff';
    for (const f of snow) { f.y += f.v * frameDt; circle(ctx, x + (f.x + Math.sin(t + f.r) * .03) * w, y + f.y * h, f.r); ctx.fill(); }
    snow = snow.filter(f => f.y < 1.05);
  } else snow = [];
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2 - 3, y, 6, h);
}

function tapWindow(x, y) {
  if (x < win.x || x > win.x + win.w || y < win.y || y > win.y + win.h) return false;
  winShow = { kind: WINDOW_SHOWS[winShowIdx++ % WINDOW_SHOWS.length], at: clock };
  if (winShow.kind === 'bird') sfx.chirp(-.7); else sfx.chime();
  baby.lookX = -1; baby.lookY = -1; baby.laughAt = clock;
  ring(x, y, R * .3);
  return true;
}

// ---------- móbile ----------
function mobileItem(kind, x, y, r) {
  switch (kind) {
    case 'star': ctx.fillStyle = '#ffd23b'; star(ctx, x, y, r, -Math.PI / 2); break;
    case 'heart': ctx.fillStyle = '#ff7fb6'; heartPath(ctx, x, y, r * .8); ctx.fill(); break;
    case 'cloud':
      ctx.fillStyle = '#fff';
      for (const [dx, dy, k] of [[-.45, .1, .45], [0, -.15, .6], [.45, .1, .45]]) { circle(ctx, x + dx * r, y + dy * r, k * r); ctx.fill(); }
      break;
    case 'balloon':
      ctx.fillStyle = '#4fb4ff'; ctx.beginPath(); ctx.ellipse(x, y, r * .6, r * .75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgb(255 255 255 / .6)'; circle(ctx, x - r * .2, y - r * .3, r * .15); ctx.fill();
      break;
  }
}

function drawMobile(dt, t) {
  const { x, y } = mobile, r = baby.hs * .75, drop = baby.hs * .45;
  mobile.boost = Math.max(0, mobile.boost - dt * .8);
  mobile.a += (.4 + mobile.boost * 3) * dt;
  ctx.strokeStyle = '#c9b7e6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke();
  ctx.strokeStyle = '#b89be0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .22, 0, 0, TAU); ctx.stroke();
  const items = ['star', 'heart', 'cloud', 'balloon'].map((kind, i) => {
    const a = mobile.a + i * Math.PI / 2;
    return { kind, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * .22, depth: Math.sin(a) };
  }).sort((p, q) => p.depth - q.depth);
  for (const it of items) {
    const k = .8 + it.depth * .2, sway = Math.sin(t * 2 + it.depth) * 2;
    ctx.strokeStyle = 'rgb(160 140 200 / .8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(it.x + sway, it.y + drop); ctx.stroke();
    mobileItem(it.kind, it.x + sway, it.y + drop + r * .25 * k, r * .3 * k);
  }
}

function tapMobile(x, y) {
  const r = baby.hs * .75;
  if (Math.abs(x - mobile.x) > r * 1.3 || y > mobile.y + baby.hs * 1.1 || y < mobile.y - r * .6) return false;
  mobile.boost = 1.5;
  mobile.song?.stop();
  mobile.song = sfx.musicBox(TWINKLE.slice(0, 7), .32);
  baby.lookX = Math.sign(mobile.x - baby.x); baby.lookY = -1; baby.laughAt = clock;
  heartBurst(mobile.x, mobile.y + baby.hs * .6, 3);
  return true;
}

// ---------- ursinho e bola ----------
function drawTeddy() {
  if (toysK < .02) return;
  ctx.globalAlpha = toysK;
  const h = pulse(teddy.hopAt, .6), size = Math.round(teddy.s / 4) * 4;
  ctx.fillStyle = 'rgb(120 60 140 / .15)';
  ctx.beginPath(); ctx.ellipse(teddy.x, teddy.y, teddy.s * .35 * (1 - h * .3), teddy.s * .08, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(teddy.x, teddy.y - h * teddy.s * .5); ctx.rotate(h * Math.sin((clock - teddy.hopAt) * 14) * .3);
  ctx.drawImage(emojiSprite('🧸', size), -size / 2, -size * .93, size, size);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function tapTeddy(x, y) {
  if (Math.hypot(x - teddy.x, y - (teddy.y - teddy.s * .45)) > teddy.s * .7) return false;
  teddy.hopAt = clock; sfx.boing();
  heartBurst(teddy.x, teddy.y - teddy.s, 4);
  baby.lookX = -1; baby.laughAt = clock; sfx.giggle(-.5);
  return true;
}

// cuidados que usam os cantos (lixeira, tigela, caixinha) escondem o ursinho e a bola
function updateToys(dt, show) {
  toysK += ((show ? 1 : 0) - toysK) * Math.min(dt * 5, 1);
  updateBall(dt);
}

function updateBall(dt) {
  if (Math.abs(ball.vx) < 4) {   // parou: volta devagar pro cantinho dela
    ball.vx = 0;
    ball.x += (ball.homeX - ball.x) * Math.min(dt * .8, 1);
  } else {
    ball.x += ball.vx * dt;
    ball.vx *= Math.pow(.45, dt);
    const lo = ball.r, hi = W - ball.r;
    if (ball.x < lo || ball.x > hi) { ball.x = Math.min(Math.max(ball.x, lo), hi); ball.vx *= -.8; ball.hopAt = clock; sfx.boing(); }
    baby.lookX = Math.sign(ball.x - baby.x);
  }
  ball.rot += (ball.vx / ball.r) * dt;
}

function drawBall() {
  if (toysK < .02) return;
  ctx.globalAlpha = toysK;
  const { x, r } = ball, h = pulse(ball.hopAt, .4), y = ball.y - h * r * 1.2;
  ctx.fillStyle = 'rgb(120 60 140 / .15)';
  ctx.beginPath(); ctx.ellipse(x, ball.y + r * .9, r * .9, r * .2, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ball.rot);
  ['#ff5f7e', '#ffe066', '#4fb4ff', '#fff', '#5ad16e', '#fff'].forEach((c, i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * TAU / 6, (i + 1) * TAU / 6); ctx.fill();
  });
  ctx.fillStyle = '#fff'; circle(ctx, 0, 0, r * .18); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgb(255 255 255 / .45)'; circle(ctx, x - r * .35, y - r * .4, r * .22); ctx.fill();
  ctx.globalAlpha = 1;
}

function tapBall(x, y) {
  if (Math.hypot(x - ball.x, y - ball.y) > ball.r * 1.6) return false;
  ball.vx = (x > ball.x ? -1 : 1) * W * rand(.7, .9);
  ball.hopAt = clock; sfx.boing();
  baby.laughAt = clock; sfx.giggle();
  return true;
}

function tapRoom(x, y) { return tapMobile(x, y) || tapWindow(x, y) || tapTeddy(x, y) || tapBall(x, y); }

function drawRoom(t, snowy) {
  ctx.drawImage(room, 0, 0, W, H);
  drawWindow(t, snowy);
  drawTeddy();
  drawBall();
}

function drawNight(t) {
  if (night < .01) return;
  ctx.fillStyle = `rgb(24 22 70 / ${.62 * night})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = night;
  ctx.save(); ctx.beginPath(); ctx.roundRect?.(win.x, win.y, win.w, win.h, win.w * .45); ctx.clip();
  ctx.fillStyle = '#1d2a6b'; ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = '#fff7c2'; circle(ctx, win.x + win.w * .62, win.y + win.h * .35, win.w * .2); ctx.fill();
  ctx.fillStyle = '#1d2a6b'; circle(ctx, win.x + win.w * .7, win.y + win.h * .3, win.w * .17); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const [sx, sy] of [[.25, .25], [.3, .7], [.8, .75], [.5, .55]]) star(ctx, win.x + win.w * sx, win.y + win.h * sy, win.w * .04 * (1 + .3 * Math.sin(t * 3 + sx * 9)), 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

const pulse = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
