'use strict';
// o bichinho que vai dormir, todo em vetor pra poder fechar os olhos, bocejar e abrir a boca pra escovar.
// Em pé: (x, y) é o meio dos pés; r = raio da cabeça. Na cama: só a cabeça no travesseiro e as mãozinhas.

const BICHOS = [
  { id: 'urso', name: 'o ursinho', fur: '#b07a4f', inner: '#e8c49a', ear: 'round', day: '#ff7a59' },
  { id: 'coelho', name: 'a coelhinha', fur: '#f4ecef', inner: '#ffc6d9', ear: 'long', day: '#b77cff' },
  { id: 'gato', name: 'o gatinho', fur: '#f5a54a', inner: '#ffe0b8', ear: 'pointy', day: '#4fb4ff' },
  { id: 'panda', name: 'o panda', fur: '#f7f7f7', inner: '#fff', ear: 'dark', day: '#5ad16e', patches: '#3a3a46' },
];
const PJ = { c: '#9fd4ff', d: '#6fb6f0', dot: '#ffe27a' };
const SHORTS = '#3f6fb5';

// estado visual: { top, bottom, hat, eyes: 'open'|'closed'|'sleepy', mouth: 'smile'|'o'|'yawn'|'teeth', arms: 'down'|'up'|'wave', blink, look }
function newLook() { return { top: 'day', bottom: 'day', hat: false, eyes: 'open', mouth: 'smile', arms: 'down', blink: 1, look: [0, 0] }; }

function headCenter(x, y, r) { return [x, y - r * 2.45]; }
function mouthCenter(x, y, r) { const [hx, hy] = headCenter(x, y, r); return [hx, hy + r * .42]; }

function drawBicho(g, x, y, r, b, v, t) {
  const bob = Math.sin(t * 2) * r * .03;
  // pernas e pezinhos
  for (const d of [-1, 1]) {
    g.fillStyle = v.bottom === 'pj' ? PJ.c : b.fur;
    g.beginPath(); g.roundRect?.(x + d * r * .3 - r * .2, y - r * .7, r * .4, r * .62, r * .16); g.fill();
    if (v.bottom === 'pj') dots(g, x + d * r * .3, y - r * .4, r * .2, r * .25);
    g.fillStyle = b.fur; g.beginPath(); g.ellipse(x + d * r * .32, y - r * .08, r * .26, r * .14, 0, 0, TAU); g.fill();
    g.fillStyle = b.patches || b.inner; g.beginPath(); g.ellipse(x + d * r * .32, y - r * .06, r * .13, r * .07, 0, 0, TAU); g.fill();
  }
  // corpo
  const by = y - r * 1.2 + bob;
  g.fillStyle = b.patches || b.fur; g.beginPath(); g.ellipse(x, by, r * .72, r * .68, 0, 0, TAU); g.fill();
  if (!b.patches) { g.fillStyle = b.inner; g.beginPath(); g.ellipse(x, by + r * .12, r * .45, r * .42, 0, 0, TAU); g.fill(); }
  // bermuda ou calça do pijama (parte de cima), depois a blusa
  g.save(); g.beginPath(); g.ellipse(x, by, r * .72, r * .68, 0, 0, TAU); g.clip();
  g.fillStyle = v.bottom === 'pj' ? PJ.c : SHORTS; g.fillRect(x - r, by + r * .2, r * 2, r);
  if (v.bottom === 'pj') dots(g, x, by + r * .45, r * .6, r * .25);
  g.fillStyle = v.top === 'pj' ? PJ.c : b.day; g.fillRect(x - r, by - r, r * 2, r * 1.22);
  if (v.top === 'pj') { dots(g, x, by - r * .35, r * .6, r * .5); g.fillStyle = PJ.d; g.fillRect(x - r, by + r * .12, r * 2, r * .1); }
  else { g.fillStyle = 'rgb(255 255 255 / .8)'; star(g, x, by - r * .25, r * .2, -Math.PI / 2); }
  g.restore();
  // braços
  const sleeve = v.top === 'pj' ? PJ.c : b.day;
  for (const d of [-1, 1]) {
    const sx = x + d * r * .55, sy = by - r * .35;
    const [hx, hy] = armEnd(v.arms, d, x, by, r, t);
    g.strokeStyle = sleeve; g.lineWidth = r * .3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (hx - sx) * .5, sy + (hy - sy) * .5); g.stroke();
    g.strokeStyle = b.patches || b.fur;
    g.beginPath(); g.moveTo(sx + (hx - sx) * .5, sy + (hy - sy) * .5); g.lineTo(hx, hy); g.stroke();
  }
  drawHead(g, ...headCenter(x, y + bob, r), r, b, v, t, 0);
}

function armEnd(arms, d, x, by, r, t) {
  if (arms === 'up') return [x + d * r * .95, by - r * 1.35];
  if (arms === 'wave' && d > 0) return [x + r * 1.05, by - r * .95 + Math.sin(t * 10) * r * .15];
  return [x + d * r * .85, by + r * .3];
}

function dots(g, cx, cy, rw, rh) {
  g.fillStyle = PJ.dot;
  for (let i = 0; i < 6; i++) star(g, cx + ((i * 37) % 11 / 11 - .5) * rw * 2, cy + ((i * 23) % 7 / 7 - .5) * rh * 2, rw * .12 + 1.5, -Math.PI / 2);
}

function drawHead(g, x, y, r, b, v, t, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  const earC = b.patches || b.fur;
  if (b.ear === 'long') {
    for (const d of [-1, 1]) {
      g.save(); g.translate(d * r * .4, -r * .75); g.rotate(d * .15 + Math.sin(t * 1.5 + d) * .04);
      g.fillStyle = b.fur; g.beginPath(); g.ellipse(0, -r * .55, r * .24, r * .62, 0, 0, TAU); g.fill();
      g.fillStyle = b.inner; g.beginPath(); g.ellipse(0, -r * .5, r * .12, r * .45, 0, 0, TAU); g.fill();
      g.restore();
    }
  } else if (b.ear === 'pointy') {
    for (const d of [-1, 1]) {
      g.fillStyle = b.fur; g.beginPath(); g.moveTo(d * r * .85, -r * .3); g.lineTo(d * r * .7, -r * 1.15); g.lineTo(d * r * .2, -r * .8); g.fill();
      g.fillStyle = b.inner; g.beginPath(); g.moveTo(d * r * .72, -r * .45); g.lineTo(d * r * .65, -r * .95); g.lineTo(d * r * .35, -r * .75); g.fill();
    }
  } else {
    for (const d of [-1, 1]) {
      g.fillStyle = earC; circle(g, d * r * .68, -r * .7, r * .32); g.fill();
      if (!b.patches) { g.fillStyle = b.inner; circle(g, d * r * .68, -r * .7, r * .17); g.fill(); }
    }
  }
  g.fillStyle = b.fur; circle(g, 0, 0, r); g.fill();
  if (b.patches) { g.fillStyle = b.patches; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * r * .36, -r * .02, r * .24, r * .3, d * -.5, 0, TAU); g.fill(); } }
  g.fillStyle = b.patches ? '#fff' : b.inner; g.beginPath(); g.ellipse(0, r * .38, r * .45, r * .34, 0, 0, TAU); g.fill();
  eyesOf(g, r, v, b);
  g.fillStyle = '#3a2a2a'; g.beginPath(); g.ellipse(0, r * .22, r * .12, r * .08, 0, 0, TAU); g.fill();   // nariz
  mouthOf(g, r, v);
  g.fillStyle = 'rgb(255 120 150 / .45)'; for (const d of [-1, 1]) { circle(g, d * r * .6, r * .3, r * .14); g.fill(); }
  if (v.hat) nightcap(g, r, t);
  g.restore();
}

function eyesOf(g, r, v, b) {
  const [lx, ly] = v.look;
  for (const d of [-1, 1]) {
    const ex = d * r * .36, ey = -r * .05;
    const closed = v.eyes === 'closed' || v.blink < .3;
    if (closed) {
      g.strokeStyle = b.patches ? '#fff' : '#2b2140'; g.lineWidth = r * .07; g.lineCap = 'round';
      g.beginPath(); g.arc(ex, ey - r * .03, r * .11, .15 * Math.PI, .85 * Math.PI); g.stroke();
      continue;
    }
    g.fillStyle = '#2b2140'; g.beginPath(); g.ellipse(ex + lx * r * .05, ey + ly * r * .04, r * .11, r * .14 * v.blink, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; circle(g, ex + lx * r * .05 + r * .04, ey + ly * r * .04 - r * .05, r * .04); g.fill();
    if (v.eyes === 'sleepy') {   // pálpebra caindo
      g.fillStyle = b.patches || b.fur; g.fillRect(ex - r * .15, ey - r * .2, r * .3, r * .17);
    }
  }
}

function mouthOf(g, r, v) {
  g.strokeStyle = '#3a2a2a'; g.lineWidth = r * .06; g.lineCap = 'round';
  if (v.mouth === 'smile') { g.beginPath(); g.arc(0, r * .32, r * .15, .2 * Math.PI, .8 * Math.PI); g.stroke(); return; }
  const w = v.mouth === 'teeth' ? r * .32 : v.mouth === 'yawn' ? r * .14 : r * .1;
  const h = v.mouth === 'teeth' ? r * .24 : v.mouth === 'yawn' ? r * .22 : r * .1;
  const cy = r * .5;
  g.fillStyle = '#7a2438'; g.beginPath(); g.ellipse(0, cy, w, h, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff8fa8'; g.beginPath(); g.ellipse(0, cy + h * .5, w * .6, h * .4, 0, 0, TAU); g.fill();
  if (v.mouth === 'teeth') {
    g.save(); g.beginPath(); g.ellipse(0, cy, w, h, 0, 0, TAU); g.clip();
    g.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.roundRect?.(i * w * .34 - w * .15, cy - h, w * .3, h * .45, 2); g.fill(); }
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.roundRect?.(i * w * .34 - w * .15, cy + h * .55, w * .3, h * .45, 2); g.fill(); }
    g.restore();
  }
}

function nightcap(g, r, t) {
  g.fillStyle = PJ.c;
  g.beginPath(); g.moveTo(-r * .85, -r * .45); g.quadraticCurveTo(-r * .5, -r * 1.35, r * .2, -r * 1.25);
  g.quadraticCurveTo(r * .9, -r * 1.3, r * 1.2, -r * .7 + Math.sin(t * 2) * r * .05); g.quadraticCurveTo(r * .6, -r * .95, r * .85, -r * .45); g.closePath(); g.fill();
  g.fillStyle = PJ.d; g.beginPath(); g.roundRect?.(-r * .9, -r * .58, r * 1.8, r * .2, r * .1); g.fill();
  g.fillStyle = '#fff'; circle(g, r * 1.2, -r * .68 + Math.sin(t * 2) * r * .05, r * .16); g.fill();
  g.fillStyle = PJ.dot; star(g, -r * .2, -r * .95, r * .1, -Math.PI / 2); star(g, r * .45, -r * .98, r * .08, -Math.PI / 2);
}

// ---------- na cama ----------
function drawInBed(g, b, v, t) {
  const [px, py] = bed.pillow, r = R0;
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(px, py, r * 1.05, r * .45, 0, 0, TAU); g.fill();   // travesseiro
  g.fillStyle = '#e8e0f5'; g.beginPath(); g.ellipse(px, py + r * .12, r * .9, r * .25, 0, 0, TAU); g.fill();
  const breathe = v.eyes === 'closed' ? Math.sin(t * 1.4) * r * .04 : 0;
  drawHead(g, px - r * .1, py - r * .45, r * .95, b, v, t, -.25);
  drawBlanket(g, breathe);
  g.fillStyle = b.patches || b.fur;   // mãozinhas pra fora do cobertor
  for (const d of [0, 1]) { circle(g, px - r * (.9 + d * .55), bed.top - r * .12 + breathe, r * .17); g.fill(); }
}

function drawBlanket(g, breathe = 0) {
  const { x, w, top } = bed, r = R0, bx = x + w * .06, bw = w * .68, y = top - r * .15 - breathe;
  g.fillStyle = '#ff9ec2';
  g.beginPath(); g.moveTo(bx, top + bed.h * .7); g.lineTo(bx, y + r * .1);
  g.quadraticCurveTo(bx + bw * .5, y - r * .45, bx + bw, y); g.lineTo(bx + bw + r * .1, top + bed.h * .7); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(bx + bw - r * .15, y - r * .05, r * .3, top + bed.h * .7 - y, r * .1); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .6)';
  for (let i = 0; i < 6; i++) { circle(g, bx + bw * (.12 + i * .15), top + bed.h * .25 + (i % 2) * r * .2, r * .07); g.fill(); }
}
