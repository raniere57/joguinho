'use strict';
// o cliente (cabeça do bichinho do jogo de dormir, de capa) e o cabelo: mechas que saem da franja.
// Cada mecha tem tamanho, bagunça, volume, cachinho e cor; a escova arruma, a tesoura corta
// onde tocar (o pedaço cai), o secador dá volume e cachos, o pincel pinta.

const TUFTS = 11, SEG = 11, MIN_LEN = .35;
const NATURAL = { urso: '#6b3f22', coelho: '#f2c86b', gato: '#d8691f', panda: '#34343f' };

const client = { b: BICHOS[0], v: newLook(), hopAt: -9, tufts: [], cap: '#6b3f22', trinkets: [], squintUntil: 0 };
let fallen = [];

function newClient(b) {
  const color = NATURAL[b.id];
  Object.assign(client, {
    b, v: newLook(), hopAt: clock, cap: color, trinkets: [], squintUntil: 0,
    tufts: Array.from({ length: TUFTS }, (_, i) => ({
      i, th: -Math.PI * (.95 - .9 * i / (TUFTS - 1)), len: rand(1.2, 1.5),
      mess: rand(.75, 1), messA: (i % 2 ? 1 : -1) * rand(.4, 1), color, painted: false, vol: 0, curl: 0, snipAt: -9, blowAt: -9,
    })),
  });
  fallen = [];
}

function headNow() {
  const [x, y] = L.head, hop = pulseAt(client.hopAt, .45) * L.r * .3;
  return [x, y - hop + Math.sin(clock * 1.6) * L.r * .02];
}

// ---------- geometria das mechas ----------
function tuftPts(tf, hx, hy) {
  const r = L.r, cy = hy - r * .25;
  const sway = Math.sin(clock * 18 + tf.i) * .18 * pulseAt(tf.blowAt, .5) + Math.sin(clock * 1.3 + tf.i) * .03;
  const a = tf.th + tf.mess * tf.messA * .9 + sway;
  const x0 = hx + Math.cos(tf.th) * r * .8, y0 = cy + Math.sin(tf.th) * r * .78;
  const ca = Math.cos(a), sa = Math.sin(a), droop = .55 * (.35 + .65 * Math.abs(Math.cos(tf.th))) * (1 - tf.vol * .6);
  const pts = [];
  for (let k = 0; k < SEG; k++) {
    const u = k / (SEG - 1), s = u * tf.len * r * (1 - .25 * u);
    const wig = Math.sin(u * 9 + tf.i * 2) * tf.mess * r * .13 * u + Math.sin(u * tf.len * 15) * tf.curl * r * .14 * Math.sqrt(u);
    pts.push([x0 + ca * s - sa * wig, y0 + sa * s + ca * wig + r * (tf.len * u) ** 2 * droop]);
  }
  return pts;
}

const tuftW = tf => L.r * (.4 + tf.vol * .14) * (1 - tf.mess * .25);

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(c * k);
  return `rgb(${f(n >> 16)} ${f(n >> 8 & 255)} ${f(n & 255)})`;
}

function strokePts(pts, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  ctx.stroke();
}

function drawTufts(hx, hy) {
  const all = client.tufts.map(tf => [tf, tuftPts(tf, hx, hy)]);
  for (const [tf, p] of all) strokePts(p, tuftW(tf) + L.r * .07, shade(tf.color, .72));
  for (const [tf, p] of all) {
    strokePts(p, tuftW(tf), tf.color);
    if (tf.curl > .3) for (let k = 2; k < SEG; k += 2) { ctx.fillStyle = tf.color; circle(ctx, p[k][0], p[k][1], tuftW(tf) * (.5 + tf.curl * .15)); ctx.fill(); }
  }
}

// franjinha por cima da cabeça: cada pedaço com a cor da mecha de onde sai
function drawCap(hx, hy) {
  const r = L.r, cy = hy - r * .25, ts = client.tufts, mid = ts[Math.floor(ts.length / 2)].color;
  const near = x => ts.reduce((a, b) => Math.abs(Math.cos(b.th) * .8 - x) < Math.abs(Math.cos(a.th) * .8 - x) ? b : a);
  ctx.fillStyle = shade(mid, .72); ctx.beginPath(); ctx.ellipse(hx, cy - r * .03, r * .84, r * .82, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = mid; ctx.beginPath(); ctx.ellipse(hx, cy, r * .8, r * .78, 0, Math.PI, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(hx - r * 2, cy - r * 2, r * 4, r * 2.08); ctx.clip();
  for (const tf of ts) { ctx.fillStyle = tf.color; circle(ctx, hx + Math.cos(tf.th) * r * .6, cy + Math.sin(tf.th) * r * .56, r * .3); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 5; i++) { const x = -.6 + i * .3; ctx.fillStyle = near(x).color; circle(ctx, hx + x * r, cy + r * .02, r * .17); ctx.fill(); }
  ctx.fillStyle = 'rgb(255 255 255 / .3)'; ctx.beginPath(); ctx.ellipse(hx - r * .3, cy - r * .5, r * .22, r * .09, -.5, 0, TAU); ctx.fill();
}

// ---------- o cliente inteiro ----------
function drawClient(t) {
  const [hx, hy] = headNow(), r = L.r, v = client.v;
  drawCape(hx, hy, client.b.day);
  drawTufts(hx, hy);
  v.blink = (t % 3.4) < .12 ? .1 : 1;
  v.eyes = clock < client.squintUntil ? 'closed' : 'open';
  drawHead(ctx, hx, hy, r, client.b, v, t, Math.sin(t * 1.1) * .03);
  drawCap(hx, hy);
  for (const id of client.trinkets) {
    const tk = TRINKETS.find(k => k.id === id);
    emojiAt(ctx, tk.e, hx + tk.at[0] * r, hy + tk.at[1] * r, tk.s * r, tk.id === 'oculos' ? 0 : Math.sin(t * 2 + tk.at[0]) * .08);
  }
}

// ---------- mexendo no cabelo ----------
function onFace(x, y) {
  const [hx, hy] = headNow();
  return Math.hypot(x - hx, y - hy) < L.r * .95 && y > hy - L.r * .2;
}

// mecha mais perto do dedo (e em que ponto dela, u de 0 a 1)
function hitTuft(x, y, slack = 0) {
  if (onFace(x, y)) return null;
  const [hx, hy] = headNow();
  let best = null;
  for (const tf of client.tufts) {
    const p = tuftPts(tf, hx, hy);
    p.forEach(([px, py], k) => {
      const d = Math.hypot(x - px, y - py);
      if (d < tuftW(tf) * .75 + L.r * .15 + slack && (!best || d < best.d)) best = { tf, u: k / (SEG - 1), d };
    });
  }
  return best;
}

function nearTufts(x, y, rad) {
  const [hx, hy] = headNow();
  return client.tufts.filter(tf => tuftPts(tf, hx, hy).some(([px, py]) => Math.hypot(x - px, y - py) < rad));
}

function brushAt(x, y, amount) {
  const hit = nearTufts(x, y, L.r * .6).filter(tf => tf.mess > 0);
  for (const tf of hit) { tf.mess = Math.max(0, tf.mess - amount); tf.blowAt = clock - .25; }
  return hit.length;
}

function cutAt(x, y) {
  const h = hitTuft(x, y);
  if (!h) return null;
  const { tf } = h, newLen = Math.max(MIN_LEN, tf.len * Math.max(h.u, .25));
  if (tf.len - newLen < .15) return null;
  const [hx, hy] = headNow(), p = tuftPts(tf, hx, hy), from = Math.floor((newLen / tf.len) * (SEG - 1));
  fallen.push({ pts: p.slice(from), color: tf.color, w: tuftW(tf), at: clock, dy: 0, vy: -L.r * .8, vx: rand(-1, 1) * L.r * .5, rot: 0, vr: rand(-3, 3) });
  tf.len = newLen; tf.snipAt = clock;
  return tf;
}

function dryAt(x, y, dt) {
  const hit = nearTufts(x, y, L.r * 1.3);
  for (const tf of hit) { tf.vol = Math.min(1, tf.vol + dt * .6); tf.curl = Math.min(1, tf.curl + dt * .45); tf.mess = Math.max(0, tf.mess - dt); tf.blowAt = clock - .25; }
  return hit.length;
}

function paintAt(x, y, color) {
  const h = hitTuft(x, y, L.r * .1);
  if (!h || h.tf.color === color) return null;
  h.tf.color = color; h.tf.painted = true; client.cap = color;
  return h.tf;
}

// pedaços cortados caindo
function updateFallen(dt) {
  for (const f of fallen) { f.vy += L.r * 9 * dt; f.dy += f.vy * dt; f.rot += f.vr * dt; }
  fallen = fallen.filter(f => clock - f.at < 1.4);
}

function drawFallen() {
  for (const f of fallen) {
    const [cx, cy] = f.pts[0], k = clock - f.at;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k / 1.4);
    ctx.translate(cx + f.vx * k, cy + f.dy); ctx.rotate(f.rot); ctx.translate(-cx, -cy);
    strokePts(f.pts, f.w + L.r * .07, shade(f.color, .72)); strokePts(f.pts, f.w, f.color);
    ctx.restore();
  }
}

// foto quadradinha do cliente, tirada do próprio canvas
function snapshot() {
  const [hx, hy] = headNow(), r = L.r, s = r * 4.8, out = document.createElement('canvas');
  out.width = out.height = 200;
  const g = out.getContext('2d');
  g.fillStyle = '#e9f8ff'; g.fillRect(0, 0, 200, 200);
  g.drawImage(canvas, (hx - s / 2) * DPR, (hy - r * .6 - s / 2) * DPR, s * DPR, s * DPR, 0, 0, 200, 200);
  return out;
}
