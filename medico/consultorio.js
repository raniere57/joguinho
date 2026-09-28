'use strict';
// o consultório: parede, maca, quadro com coraçãozinho, janela, tapetinho e a bandeja das ferramentas.
// As ferramentas são desenhadas em vetor (na bandeja e voando até o paciente).

const TOOLS = ['termometro', 'estetoscopio', 'remedio', 'algodao', 'curativo', 'lenco'];

let L = {}, roomLayer = null;

function layoutClinic() {
  const port = H > W;
  const r = port ? Math.min(W * .19, H * .085) : H * .15;
  L = port ? {
    port, r, feet: [W * .5, H * .72], floorY: H * .62,
    tray: { x: W * .04, y: H * .765, w: W * .92, h: H * .2 }, cols: 3,
    bubble: [W * .78, H * .3], sticker: [W * .2, H * .3],
  } : {
    port, r, feet: [W * .4, H * .9], floorY: H * .7,
    tray: { x: W * .66, y: H * .2, w: W * .31, h: H * .74 }, cols: 2,
    bubble: [W * .56, H * .28], sticker: [W * .14, H * .3],
  };
  roomLayer = buildRoom();
}

function toolSlots() {
  const { x, y, w, h } = L.tray, cols = L.cols, rows = Math.ceil(TOOLS.length / cols), cw = w / cols, ch = h / rows;
  const size = Math.min(cw * .8, ch * .92);
  return TOOLS.map((id, i) => ({ id, x: x + cw * (i % cols + .5), y: y + ch * (Math.floor(i / cols) + .5), size }));
}

function buildRoom() {
  const [c, g] = layer(W, H), { floorY, r } = L;
  g.fillStyle = '#dff7ef'; g.fillRect(0, 0, W, floorY);
  g.fillStyle = '#c6efe2'; for (let x = 0; x < W; x += 36) g.fillRect(x, 0, 18, floorY);   // listras
  g.fillStyle = '#fff'; g.fillRect(0, floorY - r * .5, W, r * .5);   // rodapé
  g.fillStyle = '#b6e3f5'; g.fillRect(0, floorY, W, H - floorY);
  g.fillStyle = 'rgb(255 255 255 / .35)';
  for (let y = floorY + 20; y < H; y += 40) for (let x = (y / 40 % 2) * 20; x < W; x += 40) g.fillRect(x, y, 20, 20);
  // janela
  const [wx, wy, ww, wh] = L.port ? [W * .06, H * .1, W * .3, H * .15] : [W * .03, H * .2, W * .15, H * .28];
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(wx - 6, wy - 6, ww + 12, wh + 12, 12); g.fill();
  const sky = g.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#7fcfff'); sky.addColorStop(1, '#dff4ff');
  g.fillStyle = sky; g.beginPath(); g.roundRect(wx, wy, ww, wh, 8); g.fill();
  g.fillStyle = '#9fe07a'; g.beginPath(); g.ellipse(wx + ww / 2, wy + wh, ww * .7, wh * .3, 0, Math.PI, TAU); g.fill();
  g.fillStyle = '#fff'; for (const [dx, dy, k] of [[.3, .3, .12], [.4, .26, .15], [.5, .31, .1]]) { circle(g, wx + ww * dx, wy + wh * dy, ww * k); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
  // quadro com cruz e coração
  const [px, py, ps] = L.port ? [W * .7, H * .15, W * .2] : [W * .26, H * .3, H * .2];
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(px - ps / 2, py - ps / 2, ps, ps, 12); g.fill();
  g.fillStyle = '#ff6b7a';
  g.beginPath(); g.roundRect(px - ps * .1, py - ps * .32, ps * .2, ps * .64, 4); g.fill();
  g.beginPath(); g.roundRect(px - ps * .32, py - ps * .1, ps * .64, ps * .2, 4); g.fill();
  // maca atrás do paciente
  const [fx, fy] = L.feet, mw = r * 4.2, mh = r * 1.1, my = fy - r * 1.7;
  g.fillStyle = '#9fb0bf'; for (const d of [-1, 1]) g.fillRect(fx + d * mw * .4 - 3, my, 6, fy - my - r * .2);
  g.fillStyle = '#7fc8ee'; g.beginPath(); g.roundRect(fx - mw / 2, my - mh * .4, mw, mh * .5, mh * .2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(fx - mw * .48, my - mh * .6, mw * .3, mh * .3, mh * .15); g.fill();
  // tapetinho
  g.fillStyle = '#ffd1e3'; g.beginPath(); g.ellipse(fx, fy, r * 1.6, r * .35, 0, 0, TAU); g.fill();
  // bandeja
  const t = L.tray;
  g.fillStyle = 'rgb(40 90 120 / .15)'; g.beginPath(); g.roundRect(t.x + 3, t.y + 5, t.w, t.h, 22); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(t.x, t.y, t.w, t.h, 22); g.fill();
  g.strokeStyle = '#bfe6f2'; g.lineWidth = 3; g.stroke();
  const pads = ['#ffe3e3', '#e3ecff', '#ffe3f1', '#e0f5ea', '#fff0d6', '#e3f6ff'];
  for (const [i, sl] of toolSlots().entries()) { g.fillStyle = pads[i]; circle(g, sl.x, sl.y, sl.size * .46); g.fill(); }
  return c;
}

// ---------- ferramentas (centro em x, y; s = tamanho) ----------
function drawTool(g, id, x, y, s, rot = 0, extra = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  switch (id) {
    case 'termometro': {
      g.fillStyle = '#fff'; g.strokeStyle = '#8fa2b3'; g.lineWidth = s * .04;
      g.beginPath(); g.roundRect(-s * .08, -s * .45, s * .16, s * .75, s * .08); g.fill(); g.stroke();
      g.fillStyle = '#ff4d4d'; circle(g, 0, s * .34, s * .13); g.fill();
      const h = s * (.15 + .5 * extra);
      g.fillRect(-s * .035, s * .3 - h, s * .07, h);
      g.fillStyle = '#8fa2b3'; for (let i = 0; i < 5; i++) g.fillRect(s * .03, -s * .35 + i * s * .12, s * .05, 2);
      break;
    }
    case 'estetoscopio': {
      g.strokeStyle = '#4a5a6a'; g.lineWidth = s * .07; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-s * .25, -s * .4); g.quadraticCurveTo(-s * .3, s * .05, 0, s * .1); g.quadraticCurveTo(s * .3, s * .05, s * .25, -s * .4); g.stroke();
      g.beginPath(); g.moveTo(0, s * .1); g.quadraticCurveTo(s * .05, s * .3, s * .22, s * .3); g.stroke();
      g.fillStyle = '#c9d3dc'; circle(g, s * .26, s * .3, s * .13); g.fill();
      g.fillStyle = '#8fa2b3'; circle(g, s * .26, s * .3, s * .07); g.fill();
      g.fillStyle = '#4a5a6a'; for (const d of [-1, 1]) { circle(g, d * s * .25, -s * .42, s * .05); g.fill(); }
      break;
    }
    case 'remedio': {
      g.fillStyle = '#ff8fc0'; g.beginPath(); g.roundRect(-s * .3, -s * .2, s * .32, s * .55, s * .08); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-s * .25, -s * .32, s * .22, s * .14, s * .04); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-s * .26, -s * .02, s * .24, s * .18, 3); g.fill();
      g.fillStyle = '#ff6b7a'; g.fillRect(-s * .19, s * .04, s * .1, s * .06);
      g.save(); g.translate(s * .18, s * .05); g.rotate(-.5);   // colherzinha
      g.fillStyle = '#c9d3dc'; g.fillRect(-s * .03, 0, s * .06, s * .38);
      g.beginPath(); g.ellipse(0, 0, s * .12, s * .08, 0, 0, TAU); g.fill();
      g.fillStyle = '#ff8fc0'; g.beginPath(); g.ellipse(0, 0, s * .09, s * .05, 0, 0, TAU); g.fill();
      g.restore();
      break;
    }
    case 'algodao': {
      g.fillStyle = '#e8eef3'; for (const [dx, dy, k] of [[-.18, .05, .2], [.18, .05, .2], [0, -.08, .24], [0, .12, .2]]) { circle(g, dx * s, dy * s + s * .03, k * s); g.fill(); }
      g.fillStyle = '#fff'; for (const [dx, dy, k] of [[-.18, .05, .2], [.18, .05, .2], [0, -.08, .24], [0, .12, .2]]) { circle(g, dx * s, dy * s, k * s); g.fill(); }
      break;
    }
    case 'curativo': {
      g.rotate(-.5);
      g.fillStyle = '#ffb3cf'; g.beginPath(); g.roundRect(-s * .45, -s * .14, s * .9, s * .28, s * .14); g.fill();
      g.fillStyle = '#fff3f8'; g.beginPath(); g.roundRect(-s * .15, -s * .1, s * .3, s * .2, s * .05); g.fill();
      g.fillStyle = '#ffd23b'; star(g, -s * .3, 0, s * .06, -Math.PI / 2); star(g, s * .3, 0, s * .06, -Math.PI / 2);
      g.fillStyle = 'rgb(255 255 255 / .6)'; for (let i = 0; i < 3; i++) { circle(g, -s * .06 + i * s * .06, 0, s * .015); g.fill(); }
      break;
    }
    case 'lenco': {
      g.fillStyle = '#8fd6ff'; g.beginPath(); g.roundRect(-s * .38, -s * .1, s * .76, s * .4, s * .06); g.fill();
      g.fillStyle = '#5ab4ff'; for (let i = 0; i < 3; i++) { circle(g, -s * .2 + i * s * .2, s * .12, s * .05); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-s * .15, -s * .1); g.quadraticCurveTo(-s * .2, -s * .45, 0, -s * .38);
      g.quadraticCurveTo(s * .22, -s * .45, s * .15, -s * .1); g.closePath(); g.fill();
      break;
    }
  }
  g.restore();
}

// adesivo de estrela (prêmio)
function drawSticker(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#fff'; star(g, 0, 0, s * .62, -Math.PI / 2);
  g.fillStyle = '#ffc01f'; star(g, 0, 0, s * .5, -Math.PI / 2);
  g.fillStyle = '#7a4a00'; for (const d of [-1, 1]) { circle(g, d * s * .1, -s * .02, s * .04); g.fill(); }
  g.strokeStyle = '#7a4a00'; g.lineWidth = s * .03; g.lineCap = 'round';
  g.beginPath(); g.arc(0, s * .03, s * .09, .2 * Math.PI, .8 * Math.PI); g.stroke();
  g.restore();
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}
const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };
