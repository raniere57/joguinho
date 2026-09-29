'use strict';
// o salão: parede com papel de parede, chão xadrez, cadeira, capa do cliente, a bandejinha
// (tintas, enfeites ou câmera, conforme o passo) e o mural com as fotos dos clientes.

const PAINTS = [
  { id: 'rosa', c: '#ff7eb6' }, { id: 'roxo', c: '#a77bff' }, { id: 'azul', c: '#4fb4ff' },
  { id: 'verde', c: '#5fd068' }, { id: 'amarelo', c: '#ffd23b' }, { id: 'vermelho', c: '#ff5a4f' },
];
const TRINKETS = [
  { id: 'laco', e: '🎀', at: [-.62, -.78], s: .62 }, { id: 'coroa', e: '👑', at: [0, -1.3], s: .7 },
  { id: 'flor', e: '🌸', at: [.62, -.8], s: .5 }, { id: 'oculos', e: '🕶️', at: [0, -.08], s: .95 },
  { id: 'estrela', e: '⭐', at: [-.3, -1.1], s: .42 }, { id: 'borboleta', e: '🦋', at: [.38, -1.12], s: .48 },
];
const PHOTO_MAX = 4;

let L = {}, roomLayer = null, photos = [];

function layoutSalon() {
  const port = H > W;
  const r = port ? Math.min(W * .21, H * .095) : H * .14;
  L = port ? {
    port, r, head: [W * .5, H * .45], floorY: H * .7,
    tray: { x: W * .05, y: H * .755, w: W * .9, h: H * .12 }, cols: 6,
    photo: [[W * .11, H * .2], [W * .89, H * .2], [W * .11, H * .37], [W * .89, H * .37]], pw: W * .15,
  } : {
    port, r, head: [W * .38, H * .5], floorY: H * .78,
    tray: { x: W * .66, y: H * .14, w: W * .2, h: H * .76 }, cols: 2,
    photo: [[W * .1, H * .42], [W * .1, H * .75], [W * .575, H * .3], [W * .575, H * .68]], pw: H * .2,
  };
  roomLayer = buildSalon();
}

function traySlots(n) {
  const { x, y, w, h } = L.tray, cols = Math.min(L.cols, n), rows = Math.ceil(n / cols), cw = w / cols, ch = h / rows;
  const size = Math.min(cw, ch) * .82;
  return Array.from({ length: n }, (_, i) => ({ i, x: x + cw * (i % cols + .5), y: y + ch * (Math.floor(i / cols) + .5), size }));
}

function buildSalon() {
  const [c, g] = layer(W, H), { floorY, r } = L, [hx, hy] = L.head;
  g.fillStyle = '#fbe6f5'; g.fillRect(0, 0, W, floorY);
  g.fillStyle = '#f6d3ec';   // papel de parede de bolinhas e corações
  for (let y = 20, row = 0; y < floorY - 20; y += 44, row++) for (let x = (row % 2) * 22 + 11; x < W; x += 44) { circle(g, x, y, 5); g.fill(); }
  g.fillStyle = '#fff'; g.fillRect(0, floorY - r * .35, W, r * .35);   // rodapé
  const tile = Math.max(26, r * .55);   // chão xadrez de salão
  for (let y = floorY, j = 0; y < H; y += tile, j++) for (let x = 0, i = 0; x < W; x += tile, i++) {
    g.fillStyle = (i + j) % 2 ? '#ffffff' : '#e9d6f7'; g.fillRect(x, y, tile, tile);
  }
  // espelho redondo atrás do cliente, com luzinhas
  const mr = r * 2.15;
  g.fillStyle = '#ffd36b'; circle(g, hx, hy - r * .35, mr + r * .16); g.fill();
  const glass = g.createLinearGradient(hx - mr, hy - mr, hx + mr, hy + mr);
  glass.addColorStop(0, '#e9f8ff'); glass.addColorStop(1, '#bfe4f7');
  g.fillStyle = glass; circle(g, hx, hy - r * .35, mr); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .6)'; g.beginPath(); g.ellipse(hx - mr * .45, hy - r * .35 - mr * .45, mr * .12, mr * .3, .7, 0, TAU); g.fill();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    g.fillStyle = '#fff7c2'; circle(g, hx + Math.cos(a) * (mr + r * .16), hy - r * .35 + Math.sin(a) * (mr + r * .16), r * .09); g.fill();
  }
  // encosto da cadeira
  g.fillStyle = '#ff7eb6'; g.beginPath(); g.roundRect(hx - r * 1.35, hy + r * .5, r * 2.7, r * 2.6, r * .6); g.fill();
  g.fillStyle = '#ff9ec8'; g.beginPath(); g.roundRect(hx - r * 1.15, hy + r * .7, r * 2.3, r * 2.2, r * .5); g.fill();
  // bandeja
  const t = L.tray;
  g.fillStyle = 'rgb(120 60 120 / .15)'; g.beginPath(); g.roundRect(t.x + 3, t.y + 5, t.w, t.h, 22); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(t.x, t.y, t.w, t.h, 22); g.fill();
  g.strokeStyle = '#f3c9e6'; g.lineWidth = 3; g.stroke();
  return c;
}

// capa de salão por cima do corpo (só a cabeça aparece)
function drawCape(hx, hy, color) {
  const r = L.r, top = hy + r * .78, bot = L.port ? L.tray.y - 6 : H;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(hx - r * .5, top);
  ctx.quadraticCurveTo(hx - r * 1.5, top + r * .2, hx - r * 1.75, bot);
  ctx.lineTo(hx + r * 1.75, bot); ctx.quadraticCurveTo(hx + r * 1.5, top + r * .2, hx + r * .5, top); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .5)';
  for (let i = 0; i < 9; i++) { circle(ctx, hx + ((i * 37) % 7 - 3) * r * .4, top + r * .5 + (i % 3) * r * .7, r * .09); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(hx, top + r * .05, r * .62, r * .2, 0, 0, TAU); ctx.fill();   // golinha
}

// ---------- ferramentas (centro em x, y; s = tamanho) ----------
function drawTool(g, id, x, y, s, rot = 0, extra = null) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (id === 'escova') {
    g.fillStyle = '#ff7eb6'; g.beginPath(); g.roundRect(-s * .07, 0, s * .14, s * .5, s * .06); g.fill();
    g.fillStyle = '#ffb3d4'; g.beginPath(); g.roundRect(-s * .3, -s * .32, s * .6, s * .36, s * .12); g.fill();
    g.fillStyle = '#a0507a'; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { circle(g, -s * .2 + i * s * .1, -s * .22 + j * s * .14, s * .025); g.fill(); }
  } else if (id === 'tesoura') {
    const open = extra ?? .3;
    for (const d of [-1, 1]) {
      g.save(); g.rotate(d * open * .5);
      g.fillStyle = '#c9d3dc'; g.beginPath(); g.moveTo(-s * .03 * d, 0); g.lineTo(0, -s * .48); g.lineTo(s * .06 * d, 0); g.fill();
      g.strokeStyle = d > 0 ? '#ff7eb6' : '#a77bff'; g.lineWidth = s * .07;
      g.beginPath(); g.arc(d * s * .1, s * .2, s * .1, 0, TAU); g.stroke();
      g.restore();
    }
    g.fillStyle = '#8fa2b3'; circle(g, 0, 0, s * .04); g.fill();
  } else if (id === 'secador') {
    g.fillStyle = '#a77bff'; g.beginPath(); g.roundRect(-s * .08, -s * .02, s * .16, s * .46, s * .06); g.fill();
    g.beginPath(); g.roundRect(-s * .38, -s * .28, s * .58, s * .3, s * .14); g.fill();
    g.fillStyle = '#7e55d6'; g.beginPath(); g.roundRect(-s * .46, -s * .24, s * .12, s * .22, s * .04); g.fill();
    g.fillStyle = '#fff'; circle(g, s * .06, -s * .13, s * .08); g.fill();
  } else if (id === 'pincel') {
    g.fillStyle = '#c98a55'; g.beginPath(); g.roundRect(-s * .05, -s * .05, s * .1, s * .55, s * .05); g.fill();
    g.fillStyle = '#c9d3dc'; g.fillRect(-s * .07, -s * .15, s * .14, s * .12);
    g.fillStyle = extra || '#eee'; g.beginPath(); g.moveTo(-s * .08, -s * .15); g.quadraticCurveTo(-s * .08, -s * .4, 0, -s * .48); g.quadraticCurveTo(s * .08, -s * .4, s * .08, -s * .15); g.fill();
  } else if (id === 'camera') {
    g.fillStyle = '#4fb4ff'; g.beginPath(); g.roundRect(-s * .42, -s * .26, s * .84, s * .56, s * .12); g.fill();
    g.fillStyle = '#2f8fd8'; g.beginPath(); g.roundRect(-s * .2, -s * .36, s * .26, s * .14, s * .05); g.fill();
    g.fillStyle = '#fff'; circle(g, 0, s * .03, s * .2); g.fill();
    g.fillStyle = '#2b2140'; circle(g, 0, s * .03, s * .13); g.fill();
    g.fillStyle = '#fff'; circle(g, -s * .04, -s * .01, s * .04); g.fill();
    g.fillStyle = '#ffd23b'; circle(g, s * .3, -s * .15, s * .05); g.fill();
  }
  g.restore();
}

// potinho de tinta
function drawPot(x, y, s, color, chosen, t) {
  const up = chosen ? Math.abs(Math.sin(t * 5)) * s * .08 + s * .06 : 0;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e6d3ee'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - s * .32, y - s * .1 - up, s * .64, s * .42, s * .1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y - s * .1 - up, s * .32, s * .12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .5)'; ctx.beginPath(); ctx.ellipse(x - s * .1, y - s * .13 - up, s * .08, s * .03, 0, 0, TAU); ctx.fill();
  if (chosen) { ctx.strokeStyle = color; ctx.lineWidth = 4; circle(ctx, x, y, s * .52); ctx.stroke(); }
}

// ---------- mural de fotos ----------
function addPhoto(img) {
  photos = [{ img, at: clock }, ...photos].slice(0, PHOTO_MAX);
}

function drawPhotos(fromX, fromY, flying) {
  photos.forEach((p, i) => {
    const [tx, ty] = L.photo[i], k = Math.min((clock - p.at) / .8, 1), e = 1 - (1 - k) ** 3;
    if ((k < 1) !== flying) return;
    const x = fromX + (tx - fromX) * e, y = fromY + (ty - fromY) * e - Math.sin(k * Math.PI) * L.r;
    const w = L.pw * (1 + (1 - e) * 1.2), rot = (i % 2 ? .08 : -.08) + (1 - e) * 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = 'rgb(80 40 80 / .18)'; ctx.fillRect(-w / 2 + 3, -w / 2 + 4, w, w * 1.18);
    ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -w / 2, w, w * 1.18);
    ctx.drawImage(p.img, -w * .44, -w * .44, w * .88, w * .88);
    ctx.fillStyle = '#ff5a8a'; circle(ctx, 0, -w / 2 + 2, w * .06); ctx.fill();   // tachinha
    ctx.restore();
  });
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
