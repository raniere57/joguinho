'use strict';
// a amiga que vai ser maquiada: rosto grande desenhado aqui, com três camadas de pintura de verdade
// (blush no rosto todo, sombra nas pálpebras, batom só na boca), cílios que crescem com o rímel,
// purpurina e adesivos grudados. A esponja apaga tudo aos pouquinhos.

const FRIENDS = [
  { b: BICHOS[1], id: 'coelho', bow: '#ff6fae' }, { b: BICHOS[2], id: 'gato', bow: '#a77bff' },
  { b: BICHOS[0], id: 'urso', bow: '#4fb4ff' }, { b: BICHOS[3], id: 'panda', bow: '#ff5a8a' },
];
const GLITTER_COLORS = ['#fff6b0', '#ffd23b', '#ff9ed2', '#b9f2ff', '#ffffff', '#e0c3ff'];
const MAX_GLITTER = 160, MAX_STICKERS = 10;

const fr = { f: FRIENDS[0], lash: [0, 0], glitter: [], stickers: [], closedUntil: 0, hopAt: -9, mouth: 'smile', tilt: 0 };
let layers = null, layerS = 0, inkCanvas = null;

// ---------- camadas ----------
function makeLayer(S) {
  const [c, g] = layer(S, S);
  g.setTransform(DPR, 0, 0, DPR, S / 2 * DPR, S / 2 * DPR);   // origem no centro do rosto
  return { c, g };
}

function resetLayers() {
  layerS = L.r * 2.6;
  layers = { blush: makeLayer(layerS), sombra: makeLayer(layerS), batom: makeLayer(layerS) };
}

// na troca de tamanho de tela, a pintura acompanha o rosto
function rescaleLayers() {
  if (!layers) { resetLayers(); return; }
  const old = layers;
  resetLayers();
  for (const k of Object.keys(layers)) {
    const { g } = layers[k];
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(old[k].c, 0, 0, old[k].c.width, old[k].c.height, 0, 0, layers[k].c.width, layers[k].c.height);
    g.restore();
  }
}

function newFriend(f) {
  Object.assign(fr, { f, lash: [0, 0], glitter: [], stickers: [], closedUntil: 0, hopAt: clock, mouth: 'smile' });
  resetLayers();
}

// ---------- regiões (coordenadas locais em px, origem no centro do rosto) ----------
const EYE_X = .36, EYE_Y = -.05;
function lidsPath(g, r) {
  g.beginPath();
  for (const d of [-1, 1]) { g.moveTo(d * EYE_X * r + .24 * r, -.19 * r); g.ellipse(d * EYE_X * r, -.19 * r, .24 * r, .16 * r, 0, 0, TAU); }
}
function lipsPath(g, r) {
  g.beginPath();
  g.moveTo(-.21 * r, .52 * r);
  g.quadraticCurveTo(-.17 * r, .41 * r, -.08 * r, .42 * r); g.quadraticCurveTo(-.02 * r, .43 * r, 0, .46 * r);
  g.quadraticCurveTo(.02 * r, .43 * r, .08 * r, .42 * r); g.quadraticCurveTo(.17 * r, .41 * r, .21 * r, .52 * r);
  g.quadraticCurveTo(.12 * r, .69 * r, 0, .69 * r); g.quadraticCurveTo(-.12 * r, .69 * r, -.21 * r, .52 * r);
  g.closePath();
}
const inHead = (x, y) => Math.hypot(x, y) < L.r * .98;
const inLids = (x, y) => [-1, 1].some(d => ((x - d * EYE_X * L.r) / (.3 * L.r)) ** 2 + ((y + .17 * L.r) / (.22 * L.r)) ** 2 < 1);
const inLips = (x, y) => (x / (.28 * L.r)) ** 2 + ((y - .55 * L.r) / (.2 * L.r)) ** 2 < 1;
const nearEye = (x, y) => [-1, 1].findIndex(d => Math.hypot(x - d * EYE_X * L.r, y - EYE_Y * L.r) < L.r * .28);

// ---------- pintar e apagar ----------
function dab(g, x, y, rad, color, alpha) {
  const grd = g.createRadialGradient(x, y, 0, x, y, rad);
  grd.addColorStop(0, color); grd.addColorStop(.55, color); grd.addColorStop(1, 'rgb(255 255 255 / 0)');
  g.globalAlpha = alpha; g.fillStyle = grd; circle(g, x, y, rad); g.fill(); g.globalAlpha = 1;
}

const BRUSH = { sombra: [.1, .5], batom: [.08, .85], blush: [.16, .2] };

// pinta com a ferramenta num ponto local; devolve se caiu na região certa
function paintAt(tool, x, y, color) {
  const r = L.r, ok = tool === 'sombra' ? inLids(x, y) : tool === 'batom' ? inLips(x, y) : inHead(x, y);
  if (!ok) return false;
  const { g } = layers[tool], [k, a] = BRUSH[tool];
  g.save();
  if (tool === 'sombra') lidsPath(g, r); else if (tool === 'batom') lipsPath(g, r); else { g.beginPath(); g.arc(0, 0, r, 0, TAU); }
  g.clip();
  dab(g, x, y, k * r, color, a);
  g.restore();
  return true;
}

function eraseAt(x, y) {
  const r = L.r, rad = r * .22;
  for (const { g } of Object.values(layers)) {
    g.save(); g.globalCompositeOperation = 'destination-out';
    dab(g, x, y, rad, '#000', .55);
    g.restore();
  }
  const before = fr.glitter.length + fr.stickers.length;
  fr.glitter = fr.glitter.filter(p => Math.hypot(p.x * r - x, p.y * r - y) > rad);
  fr.stickers = fr.stickers.filter(s => Math.hypot(s.x * r - x, s.y * r - y) > rad * 1.1);
  const e = nearEye(x, y);
  if (e >= 0) fr.lash[e] = Math.max(0, fr.lash[e] - .08);
  return before - fr.glitter.length - fr.stickers.length;
}

function addGlitter(x, y) {
  const r = L.r;
  for (let i = 0; i < 4; i++) {
    const gx = x + rand(-.1, .1) * r, gy = y + rand(-.1, .1) * r;
    if (!inHead(gx, gy)) continue;
    fr.glitter.push({ x: gx / r, y: gy / r, c: pick(GLITTER_COLORS), ph: rand(0, TAU), s: rand(.6, 1.2) });
  }
  fr.glitter = fr.glitter.slice(-MAX_GLITTER);
}

function addSticker(e, x, y) {
  if (!inHead(x, y)) return false;
  fr.stickers = [...fr.stickers, { e, x: x / L.r, y: y / L.r, rot: rand(-.35, .35), at: clock }].slice(-MAX_STICKERS);
  return true;
}

// quanto de pintura ainda tem (pra saber quando o rosto está limpinho)
function inkAmount() {
  if (!inkCanvas) { inkCanvas = document.createElement('canvas'); inkCanvas.width = inkCanvas.height = 24; }
  const g = inkCanvas.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, 24, 24);
  for (const { c } of Object.values(layers)) g.drawImage(c, 0, 0, 24, 24);
  const d = g.getImageData(0, 0, 24, 24).data;
  let sum = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 12) sum += d[i];   // restinho quase invisível não conta
  return sum / 255;
}

// ---------- desenho ----------
function drawEars(g, r, b) {
  const earC = b.patches || b.fur;
  if (b.ear === 'long') {
    for (const d of [-1, 1]) {
      g.save(); g.translate(d * r * .4, -r * .75); g.rotate(d * .15 + Math.sin(clock * 1.5 + d) * .04);
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
}

function drawEye(g, r, d, closed, lash) {
  const ex = d * EYE_X * r, ey = EYE_Y * r, ink = '#2b2140';
  if (closed) {
    g.strokeStyle = ink; g.lineWidth = r * (.045 + .02 * lash); g.lineCap = 'round';
    g.beginPath(); g.arc(ex, ey - r * .03, r * .12, .12 * Math.PI, .88 * Math.PI); g.stroke();
  } else {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, r * .15, r * .17, 0, 0, TAU); g.fill();
    g.fillStyle = ink; g.beginPath(); g.ellipse(ex + d * r * .01, ey + r * .015, r * .11, r * .135, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; circle(g, ex + r * .04, ey - r * .04, r * .045); g.fill(); circle(g, ex - r * .035, ey + r * .06, r * .02); g.fill();
    g.strokeStyle = ink; g.lineWidth = r * (.02 + .03 * lash); g.lineCap = 'round';   // delineado
    g.beginPath(); g.ellipse(ex, ey, r * .15, r * .17, 0, 1.08 * Math.PI, 1.92 * Math.PI); g.stroke();
  }
  // cílios: crescem e engrossam com o rímel
  g.strokeStyle = ink; g.lineWidth = r * (.022 + .018 * lash); g.lineCap = 'round';
  const len = r * (.05 + .13 * lash), n = 3;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + d * (.45 + i * .38), bx = ex + Math.cos(a) * r * .15, by = ey + Math.sin(a) * r * (closed ? .06 : .17) - (closed ? r * .03 : 0);
    const tx = bx + Math.cos(a - d * .25) * len, ty = by + Math.sin(a - d * .25) * len - len * .2;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(a) * len * .6, by + Math.sin(a) * len * .6, tx, ty); g.stroke();
  }
}

function drawBow(g, r, color, b) {
  const [x, y, rot] = b.ear === 'long' ? [0, -r * .93, 0] : [-r * .48, -r * .82, -.45];
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = color;
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * r * .3, -r * .22, d * r * .3, 0); g.quadraticCurveTo(d * r * .3, r * .22, 0, 0); g.fill(); }
  g.fillStyle = 'rgb(255 255 255 / .35)'; for (const d of [-1, 1]) { circle(g, d * r * .2, -r * .05, r * .04); g.fill(); }
  g.fillStyle = color; circle(g, 0, 0, r * .08); g.fill();
  g.fillStyle = 'rgb(0 0 0 / .12)'; circle(g, 0, 0, r * .08); g.fill();
  g.restore();
}

// desenha a amiga com o centro do rosto em (x, y); s = escala (o espelho usa menor)
function drawFriend(x, y, s, t) {
  const r = L.r, b = fr.f.b, g = ctx, S = layerS;
  const blink = (t % 3.6) < .12, closed = clock < fr.closedUntil || blink;
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(fr.tilt);
  // ombros com blusinha
  g.fillStyle = b.patches || b.fur; g.beginPath(); g.ellipse(0, r * 1.55, r * 1.05, r * .75, 0, Math.PI, TAU); g.fill();
  g.fillStyle = fr.f.bow; g.beginPath(); g.ellipse(0, r * 1.75, r * 1.12, r * .72, 0, Math.PI, TAU); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .5)'; for (let i = -2; i <= 2; i++) { circle(g, i * r * .38, r * 1.35 + Math.abs(i) * r * .08, r * .06); g.fill(); }
  drawEars(g, r, b);
  g.fillStyle = b.fur; circle(g, 0, 0, r); g.fill();
  if (b.patches) { g.fillStyle = b.patches; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * r * .36, -r * .02, r * .25, r * .3, d * -.5, 0, TAU); g.fill(); } }
  g.fillStyle = b.patches ? '#fff' : b.inner; g.beginPath(); g.ellipse(0, r * .42, r * .45, r * .32, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255 120 150 / .3)'; for (const d of [-1, 1]) { circle(g, d * r * .62, r * .3, r * .13); g.fill(); }
  g.drawImage(layers.blush.c, -S / 2, -S / 2, S, S);
  g.drawImage(layers.sombra.c, -S / 2, -S / 2, S, S);
  for (const d of [-1, 1]) drawEye(g, r, d, closed, fr.lash[(d + 1) / 2]);
  g.fillStyle = '#3a2a2a'; g.beginPath(); g.ellipse(0, r * .24, r * .1, r * .07, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .5)'; circle(g, -r * .03, r * .22, r * .025); g.fill();
  g.fillStyle = 'rgb(226 120 145 / .35)'; lipsPath(g, r); g.fill();
  g.drawImage(layers.batom.c, -S / 2, -S / 2, S, S);
  drawMouth(g, r);
  for (const p of fr.glitter) {
    const tw = .7 + .5 * Math.sin(t * 4 + p.ph);
    g.fillStyle = 'rgb(255 255 255 / .6)'; star(g, p.x * r, p.y * r, r * .06 * p.s * tw, p.ph);
    g.fillStyle = p.c; star(g, p.x * r, p.y * r, r * .045 * p.s * tw, p.ph);
  }
  for (const st of fr.stickers) {
    const k = easeOutBack(Math.min((clock - st.at) / .3, 1));
    emojiAt(g, st.e, st.x * r, st.y * r, r * .3 * k, st.rot);
  }
  drawBow(g, r, fr.f.bow, b);
  g.restore();
}

function drawMouth(g, r) {
  g.strokeStyle = '#3a2a2a'; g.lineWidth = r * .035; g.lineCap = 'round';
  if (fr.mouth === 'o' || fr.mouth === 'kiss') {
    g.fillStyle = '#7a2438'; g.beginPath(); g.ellipse(0, r * .54, r * (fr.mouth === 'kiss' ? .05 : .08), r * (fr.mouth === 'kiss' ? .05 : .09), 0, 0, TAU); g.fill();
    return;
  }
  g.beginPath(); g.moveTo(-r * .17, r * .52); g.quadraticCurveTo(0, r * .6, r * .17, r * .52); g.stroke();
}
