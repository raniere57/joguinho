'use strict';
// as roupas, sapatos, chapéus e acessórios, e a amiga vestida (corpo do bichinho do jogo de dormir,
// desenhado aqui por partes pra roupa ficar entre o corpo e os braços).
// Tudo em função da "pose": pés em (x, y), r = raio da cabeça.

const CATS = ['roupa', 'sapato', 'chapeu', 'acessorio'];
const CAT_ICON = { roupa: '👗', sapato: '👟', chapeu: '👑', acessorio: '👜' };

function pose(x, y, r, arms = { l: 'down', r: 'down' }, lift = [0, 0]) {
  const by = y - r * 1.2;
  const hand = (d, a) => a === 'up' ? [x + d * r * .95, by - r * 1.3] : a === 'hip' ? [x + d * r * .7, by + r * .15] : a === 'hold' ? [x + d * r * 1.02, by - r * .1] : [x + d * r * .88, by + r * .35];
  return { x, y, r, by, hx: x, hy: y - r * 2.45, lh: hand(-1, arms.l), rh: hand(1, arms.r), arms, lift, feet: [[x - r * .32, y - r * .08 - lift[0]], [x + r * .32, y - r * .08 - lift[1]]] };
}

// ---------- peças ----------
function skirt(g, P, top, hem, wTop, wHem, color, scallop) {
  const { x, r } = P;
  g.fillStyle = color; g.beginPath();
  g.moveTo(x - wTop * r, top); g.lineTo(x + wTop * r, top); g.lineTo(x + wHem * r, hem);
  if (scallop) { const n = 5, w = wHem * 2 * r / n; for (let i = n - 1; i >= 0; i--) g.arc(x - wHem * r + w * (i + .5), hem, w / 2, 0, Math.PI); }
  else g.lineTo(x - wHem * r, hem);
  g.lineTo(x - wHem * r, hem); g.closePath(); g.fill();
}
function bodice(g, P, color) { const { x, r, by } = P; g.fillStyle = color; g.beginPath(); g.roundRect(x - r * .56, by - r * .58, r * 1.12, r * .72, r * .25); g.fill(); }
function dots(g, P, color, top, hem, n = 7, k = .06) {
  const { x, r } = P; g.fillStyle = color;
  for (let i = 0; i < n; i++) { const u = (i * .618) % 1, v = (i * .37 + .2) % 1, yy = top + (hem - top) * v, w = .5 + v * .35; circle(g, x + (u * 2 - 1) * w * r, yy, r * k); g.fill(); }
}

const OUTFITS = [
  { id: 'vestido', sleeve: '#ff7eb6', draw(g, P) {
    const { x, r, by, y } = P;
    skirt(g, P, by, y - r * .35, .55, .95, '#ff7eb6', true); bodice(g, P, '#ff7eb6');
    dots(g, P, 'rgb(255 255 255 / .8)', by, y - r * .45);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, by - r * .55, r * .35, r * .13, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff4f9a'; g.fillRect(x - r * .58, by - r * .02, r * 1.16, r * .12);
  } },
  { id: 'princesa', sleeve: '#bfe3ff', puff: true, draw(g, P) {
    const { x, r, by, y } = P;
    skirt(g, P, by - r * .05, y - r * .06, .5, 1.1, '#9fd3ff', false);
    skirt(g, P, by - r * .05, y - r * .18, .45, .8, '#c9e8ff', true);
    bodice(g, P, '#9fd3ff');
    g.fillStyle = '#ffd23b'; for (let i = 0; i < 6; i++) star(g, x + ((i * .618) % 1 * 2 - 1) * .75 * r, by + r * .3 + (i % 3) * r * .3, r * .07, 0);
    g.fillStyle = '#ffd23b'; g.fillRect(x - r * .56, by - r * .06, r * 1.12, r * .1);
  } },
  { id: 'bailarina', sleeve: null, draw(g, P) {
    const { x, r, by } = P;
    bodice(g, P, '#d8b6ff');
    g.fillStyle = 'rgb(255 190 230 / .85)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x, by + r * .12 + k * r * .06, r * (1.05 - k * .1), r * (.22 - k * .03), 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgb(255 255 255 / .5)'; for (let i = 0; i < 8; i++) { circle(g, x - r * .9 + i * r * .26, by + r * .18, r * .04); g.fill(); }
    g.fillStyle = '#ff7eb6'; circle(g, x, by - r * .4, r * .08); g.fill();
  } },
  { id: 'macacao', sleeve: '#ffd84a', draw(g, P) {
    const { x, r, by, y } = P;
    bodice(g, P, '#ffd84a');
    g.fillStyle = '#4f86d6';
    for (const d of [-1, 1]) { g.beginPath(); g.roundRect(x + d * r * .3 - r * .22, by + r * .1, r * .44, y - r * .25 - by - r * .1, r * .1); g.fill(); }
    g.beginPath(); g.roundRect(x - r * .56, by - r * .3, r * 1.12, r * .7, r * .15); g.fill();
    g.fillStyle = '#3d6fb8'; g.beginPath(); g.roundRect(x - r * .2, by - r * .2, r * .4, r * .25, r * .05); g.fill();
    g.strokeStyle = '#4f86d6'; g.lineWidth = r * .1; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * r * .35, by - r * .3); g.lineTo(x + d * r * .3, by - r * .62); g.stroke(); }
    g.fillStyle = '#ffd23b'; for (const d of [-1, 1]) { circle(g, x + d * r * .35, by - r * .28, r * .05); g.fill(); }
  } },
  { id: 'joaninha', sleeve: null, draw(g, P) {
    const { x, r, by, y } = P;
    skirt(g, P, by, y - r * .38, .55, .92, '#ff4d4d', false); bodice(g, P, '#ff4d4d');
    g.strokeStyle = '#2b2140'; g.lineWidth = r * .05; g.beginPath(); g.moveTo(x, by - r * .5); g.lineTo(x, y - r * .4); g.stroke();
    dots(g, P, '#2b2140', by - r * .3, y - r * .5, 8, .09);
    g.fillStyle = '#2b2140'; g.beginPath(); g.ellipse(x, by - r * .56, r * .3, r * .1, 0, 0, TAU); g.fill();
  } },
  { id: 'arcoiris', sleeve: '#ff6b6b', draw(g, P) {
    const { x, r, by, y } = P, cols = ['#ff6b6b', '#ff9f45', '#ffd23b', '#5fd068', '#4fb4ff', '#a77bff'];
    g.save(); skirt(g, P, by - r * .58, y - r * .35, .56, .95, '#fff', true); g.clip();
    const top = by - r * .6, h = (y - r * .1 - top) / cols.length;
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(x - r * 1.2, top + i * h, r * 2.4, h + 1); });
    g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, by - r * .55, r * .33, r * .12, 0, 0, TAU); g.fill();
  } },
];

const SHOES = [
  { id: 'tenis', draw(g, [fx, fy], r, d) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(fx + d * r * .04, fy, r * .3, r * .16, 0, 0, TAU); g.fill(); g.fillStyle = '#ff7eb6'; g.fillRect(fx - r * .28 + d * r * .04, fy + r * .06, r * .56, r * .06); g.strokeStyle = '#4fb4ff'; g.lineWidth = r * .03; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(fx - r * .08 + i * r * .06, fy - r * .12); g.lineTo(fx - r * .04 + i * r * .06, fy - r * .04); g.stroke(); } } },
  { id: 'botas', draw(g, [fx, fy], r, d) { g.fillStyle = '#b07a4f'; g.beginPath(); g.roundRect(fx - r * .2, fy - r * .5, r * .4, r * .5, r * .08); g.fill(); g.beginPath(); g.ellipse(fx + d * r * .06, fy, r * .3, r * .15, 0, 0, TAU); g.fill(); g.fillStyle = '#8a5a34'; g.fillRect(fx - r * .22, fy - r * .52, r * .44, r * .1); g.fillStyle = '#fff3d6'; g.fillRect(fx - r * .22, fy - r * .56, r * .44, r * .06); } },
  { id: 'sapatilha', draw(g, [fx, fy], r, d) { g.strokeStyle = '#ff9ec8'; g.lineWidth = r * .04; g.beginPath(); g.moveTo(fx - r * .12, fy - r * .08); g.lineTo(fx + r * .1, fy - r * .38); g.moveTo(fx + r * .12, fy - r * .08); g.lineTo(fx - r * .1, fy - r * .38); g.stroke(); g.fillStyle = '#ffb3d4'; g.beginPath(); g.ellipse(fx + d * r * .04, fy, r * .28, r * .13, 0, 0, TAU); g.fill(); g.fillStyle = '#ff7eb6'; circle(g, fx + d * r * .12, fy - r * .07, r * .05); g.fill(); } },
  { id: 'galochas', draw(g, [fx, fy], r, d) { g.fillStyle = '#ffd23b'; g.beginPath(); g.roundRect(fx - r * .21, fy - r * .55, r * .42, r * .55, r * .1); g.fill(); g.beginPath(); g.ellipse(fx + d * r * .06, fy, r * .31, r * .16, 0, 0, TAU); g.fill(); g.fillStyle = '#ffb020'; g.fillRect(fx - r * .23, fy - r * .06, r * .46, r * .08); g.fillStyle = '#4fb4ff'; circle(g, fx, fy - r * .32, r * .07); g.fill(); } },
  { id: 'sandalia', draw(g, [fx, fy], r, d) { g.fillStyle = '#c98a55'; g.beginPath(); g.ellipse(fx + d * r * .04, fy + r * .04, r * .3, r * .1, 0, 0, TAU); g.fill(); g.strokeStyle = '#ff9f45'; g.lineWidth = r * .06; g.beginPath(); g.moveTo(fx - r * .18, fy - r * .02); g.quadraticCurveTo(fx, fy - r * .16, fx + r * .18, fy - r * .02); g.stroke(); emojiAt(g, '🌼', fx + d * r * .05, fy - r * .1, r * .2); } },
  { id: 'brilho', draw(g, [fx, fy], r, d, t = 0) { const grd = g.createLinearGradient(fx - r * .3, fy - r * .15, fx + r * .3, fy + r * .15); grd.addColorStop(0, '#e9eef5'); grd.addColorStop(.5, '#b9c4d4'); grd.addColorStop(1, '#f5f7fb'); g.fillStyle = grd; g.beginPath(); g.ellipse(fx + d * r * .04, fy, r * .3, r * .16, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; star(g, fx + d * r * .1, fy - r * .05, r * .06 * (1 + .4 * Math.sin(t * 6 + d)), 0); g.fillStyle = '#ff7eb6'; circle(g, fx - d * r * .08, fy - r * .06, r * .04); g.fill(); } },
];

const HATS = [
  { id: 'coroa', draw(g, hx, hy, r) { g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(hx - r * .45, hy - r * .78); g.lineTo(hx - r * .45, hy - r * 1.12); g.lineTo(hx - r * .22, hy - r * .95); g.lineTo(hx, hy - r * 1.25); g.lineTo(hx + r * .22, hy - r * .95); g.lineTo(hx + r * .45, hy - r * 1.12); g.lineTo(hx + r * .45, hy - r * .78); g.closePath(); g.fill(); g.fillStyle = '#ff4f9a'; circle(g, hx, hy - r * .88, r * .07); g.fill(); g.fillStyle = '#4fb4ff'; for (const d of [-1, 1]) { circle(g, hx + d * r * .28, hy - r * .86, r * .05); g.fill(); } } },
  { id: 'chapeu', draw(g, hx, hy, r) { g.fillStyle = '#f5d78a'; g.beginPath(); g.ellipse(hx, hy - r * .72, r * 1.25, r * .28, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(hx, hy - r * .85, r * .62, r * .42, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#ff7eb6'; g.fillRect(hx - r * .62, hy - r * .9, r * 1.24, r * .14); emojiAt(g, '🌸', hx + r * .5, hy - r * .88, r * .35); } },
  { id: 'laco', draw(g, hx, hy, r) { g.fillStyle = '#ff4f9a'; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(hx, hy - r * .95); g.quadraticCurveTo(hx + d * r * .55, hy - r * 1.4, hx + d * r * .55, hy - r * .95); g.quadraticCurveTo(hx + d * r * .55, hy - r * .6, hx, hy - r * .95); g.fill(); } g.fillStyle = '#e0337a'; circle(g, hx, hy - r * .95, r * .13); g.fill(); g.fillStyle = 'rgb(255 255 255 / .5)'; for (const d of [-1, 1]) { circle(g, hx + d * r * .32, hy - r * 1.08, r * .06); g.fill(); } } },
  { id: 'flores', draw(g, hx, hy, r) { g.strokeStyle = '#5fb04a'; g.lineWidth = r * .07; g.beginPath(); g.ellipse(hx, hy - r * .55, r * .92, r * .45, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); ['🌸', '🌼', '🌷', '🌸', '🌼'].forEach((e, i) => { const a = Math.PI * (1.12 + i * .19); emojiAt(g, e, hx + Math.cos(a) * r * .92, hy - r * .55 + Math.sin(a) * r * .45, r * .36); }); } },
  { id: 'bone', draw(g, hx, hy, r) { g.fillStyle = '#4fb4ff'; g.beginPath(); g.ellipse(hx, hy - r * .55, r * .95, r * .62, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#2f8fd8'; g.beginPath(); g.ellipse(hx + r * .55, hy - r * .55, r * .6, r * .14, -.1, 0, TAU); g.fill(); g.fillStyle = '#ffd23b'; star(g, hx - r * .1, hy - r * .85, r * .15, -Math.PI / 2); g.fillStyle = '#2f8fd8'; circle(g, hx, hy - r * 1.16, r * .07); g.fill(); } },
  { id: 'estrela', draw(g, hx, hy, r, t = 0) { g.strokeStyle = '#a77bff'; g.lineWidth = r * .07; g.beginPath(); g.ellipse(hx, hy - r * .5, r * .9, r * .5, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); for (const d of [-1, 1]) { const sx = hx + d * r * .35, sy = hy - r * 1.35 + Math.sin(t * 5 + d) * r * .06; g.strokeStyle = '#a77bff'; g.lineWidth = r * .04; g.beginPath(); g.moveTo(hx + d * r * .3, hy - r * .95); g.lineTo(sx, sy); g.stroke(); g.fillStyle = '#ffd23b'; star(g, sx, sy, r * .2, -Math.PI / 2); } } },
];

const ACCS = [
  { id: 'bolsa', hand: 'down', draw(g, P) { const [x, y] = P.rh, r = P.r; g.strokeStyle = '#e0337a'; g.lineWidth = r * .06; g.beginPath(); g.arc(x, y + r * .15, r * .18, Math.PI, TAU); g.stroke(); g.fillStyle = '#ff7eb6'; g.beginPath(); g.roundRect(x - r * .3, y + r * .15, r * .6, r * .42, r * .1); g.fill(); g.fillStyle = '#ffd23b'; circle(g, x, y + r * .28, r * .06); g.fill(); } },
  { id: 'oculos', hand: 'down', draw(g, P) { const { hx, hy, r } = P; g.fillStyle = 'rgb(40 30 60 / .85)'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(hx + d * r * .36, hy - r * .04, r * .22, r * .18, 0, 0, TAU); g.fill(); } g.strokeStyle = '#ff4f9a'; g.lineWidth = r * .06; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(hx + d * r * .36, hy - r * .04, r * .22, r * .18, 0, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(hx - r * .14, hy - r * .06); g.lineTo(hx + r * .14, hy - r * .06); g.stroke(); g.fillStyle = 'rgb(255 255 255 / .5)'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(hx + d * r * .36 - r * .07, hy - r * .1, r * .06, r * .04, -.5, 0, TAU); g.fill(); } } },
  { id: 'colar', hand: 'down', draw(g, P) { const { x, by, r } = P; for (let i = 0; i < 9; i++) { const a = Math.PI * (.15 + i * .0875); g.fillStyle = '#fff'; circle(g, x + Math.cos(a) * r * .38, by - r * .62 + Math.sin(a) * r * .32, r * .06); g.fill(); g.fillStyle = 'rgb(200 200 230 / .5)'; circle(g, x + Math.cos(a) * r * .38 + r * .015, by - r * .6 + Math.sin(a) * r * .32, r * .03); g.fill(); } g.fillStyle = '#ff7eb6'; g.beginPath(); g.moveTo(x, by - r * .18); g.bezierCurveTo(x - r * .14, by - r * .3, x - r * .08, by - r * .42, x, by - r * .32); g.bezierCurveTo(x + r * .08, by - r * .42, x + r * .14, by - r * .3, x, by - r * .18); g.fill(); } },
  { id: 'varinha', hand: 'hold', draw(g, P, t = 0) { const [x, y] = P.rh, r = P.r; g.strokeStyle = '#fff'; g.lineWidth = r * .07; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + r * .1); g.lineTo(x + r * .3, y - r * .6); g.stroke(); g.fillStyle = '#ffd23b'; star(g, x + r * .33, y - r * .7, r * .22, t * 2); g.fillStyle = '#fff6b0'; for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1; star(g, x + r * .33 + Math.cos(a) * r * .35, y - r * .7 + Math.sin(a) * r * .3, r * .05, 0); } } },
  { id: 'guarda', hand: 'up', draw(g, P) { const [x, y] = P.rh, r = P.r, cy = y - r * 1.2; g.strokeStyle = '#8a5a34'; g.lineWidth = r * .06; g.beginPath(); g.moveTo(x, y + r * .15); g.lineTo(x, cy); g.stroke(); const cols = ['#ff6b6b', '#fff', '#4fb4ff', '#fff', '#ffd23b', '#fff']; cols.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, cy - r * .1); g.arc(x, cy, r * .9, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); g.closePath(); g.fill(); }); g.fillStyle = '#8a5a34'; circle(g, x, cy - r * .92, r * .06); g.fill(); } },
  { id: 'balao', hand: 'hold', draw(g, P, t = 0) { const [x, y] = P.rh, r = P.r, bx = x + r * .45 + Math.sin(t * 1.5) * r * .08, byy = y - r * 1.6; g.strokeStyle = '#888'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + r * .3, y - r * .6, bx, byy + r * .38); g.stroke(); g.fillStyle = '#ff4f7a'; g.beginPath(); g.moveTo(bx, byy + r * .38); g.bezierCurveTo(bx - r * .6, byy - r * .05, bx - r * .3, byy - r * .5, bx, byy - r * .2); g.bezierCurveTo(bx + r * .3, byy - r * .5, bx + r * .6, byy - r * .05, bx, byy + r * .38); g.fill(); g.fillStyle = 'rgb(255 255 255 / .5)'; g.beginPath(); g.ellipse(bx - r * .18, byy - r * .15, r * .08, r * .12, -.5, 0, TAU); g.fill(); } },
];

const ITEMS = { roupa: OUTFITS, sapato: SHOES, chapeu: HATS, acessorio: ACCS };

// ---------- a amiga vestida ----------
function drawDoll(g, P, b, v, look, t) {
  const { x, r, by, y } = P, fur = b.patches || b.fur, outfit = OUTFITS.find(o => o.id === look.roupa);
  const shoe = SHOES.find(s => s.id === look.sapato), hat = HATS.find(h => h.id === look.chapeu), acc = ACCS.find(a => a.id === look.acessorio);
  // pernas e pés
  P.feet.forEach(([fx, fy], i) => {
    const d = i ? 1 : -1;
    g.fillStyle = b.fur; g.beginPath(); g.roundRect(fx - r * .02 * d - r * .2, fy - r * .62, r * .4, r * .62, r * .16); g.fill();
    if (shoe) shoe.draw(g, [fx, fy], r, d, t);
    else { g.fillStyle = b.fur; g.beginPath(); g.ellipse(fx, fy, r * .26, r * .14, 0, 0, TAU); g.fill(); g.fillStyle = b.patches || b.inner; g.beginPath(); g.ellipse(fx, fy + r * .02, r * .13, r * .07, 0, 0, TAU); g.fill(); }
  });
  // corpo
  g.fillStyle = fur; g.beginPath(); g.ellipse(x, by, r * .72, r * .68, 0, 0, TAU); g.fill();
  if (!b.patches) { g.fillStyle = b.inner; g.beginPath(); g.ellipse(x, by + r * .12, r * .45, r * .42, 0, 0, TAU); g.fill(); }
  if (outfit) outfit.draw(g, P, t);
  if (acc?.id === 'colar') acc.draw(g, P, t);
  // braços
  for (const [d, [hx, hy]] of [[-1, P.lh], [1, P.rh]]) {
    const sx = x + d * r * .52, sy = by - r * .38;
    g.lineCap = 'round'; g.lineWidth = r * .28;
    g.strokeStyle = outfit?.sleeve || fur; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (hx - sx) * .45, sy + (hy - sy) * .45); g.stroke();
    g.strokeStyle = fur; g.beginPath(); g.moveTo(sx + (hx - sx) * .45, sy + (hy - sy) * .45); g.lineTo(hx, hy); g.stroke();
    if (outfit?.puff) { g.fillStyle = outfit.sleeve; circle(g, sx, sy + r * .02, r * .22); g.fill(); }
  }
  if (acc && acc.id !== 'colar' && acc.id !== 'oculos') acc.draw(g, P, t);
  drawHead(g, P.hx, P.hy, r, b, v, t, 0);
  if (acc?.id === 'oculos') acc.draw(g, P, t);
  if (hat) hat.draw(g, P.hx, P.hy, r, t);
}

// miniatura de cada peça pra bandeja (centro x, y; s = tamanho da casinha)
function drawThumb(g, cat, item, x, y, s, t) {
  if (cat === 'roupa') {
    const r = s * .52, P = pose(x, y + r * 1.25, r);
    g.strokeStyle = '#b9a6c9'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - r * .5, P.by - r * .55); g.lineTo(x, P.by - r * .85); g.lineTo(x + r * .5, P.by - r * .55); g.stroke();   // cabide
    item.draw(g, P, t);
    if (item.sleeve) { g.fillStyle = item.sleeve; for (const d of [-1, 1]) { circle(g, x + d * r * .6, P.by - r * .38, r * .18); g.fill(); } }
  } else if (cat === 'sapato') {
    const r = s * .75;
    for (const d of [-1, 1]) item.draw(g, [x + d * r * .36, y + r * .25], r, d, t);
  } else if (cat === 'chapeu') {
    const r = s * .55;
    item.draw(g, x, y + r * 1, r, t);
  } else {
    const r = s * .55;
    if (item.id === 'oculos') item.draw(g, { hx: x, hy: y, r: r * 1.1 }, t);
    else if (item.id === 'colar') item.draw(g, { x, by: y + r * .75, r: r * 1.3 }, t);
    else if (item.id === 'guarda') item.draw(g, { rh: [x, y + r * .9], r: r * .9 }, t);
    else if (item.id === 'balao') item.draw(g, { rh: [x - r * .35, y + r * 1.1], r: r * 1.05 }, t);
    else if (item.id === 'varinha') item.draw(g, { rh: [x - r * .25, y + r * .5], r: r * 1.3 }, t);
    else item.draw(g, { rh: [x, y - r * .45], r: r * 1.4 }, t);
  }
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
