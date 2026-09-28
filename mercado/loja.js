'use strict';
// o mercadinho: corredor com prateleiras (x de 0 a W) e o caixa ao lado (x de W a 2W).
// A câmera desliza entre os dois; o carrinho vai junto.

const PRODUCTS = [
  { id: 'maca', e: '🍎', name: 'Maçã' }, { id: 'banana', e: '🍌', name: 'Banana' },
  { id: 'uva', e: '🍇', name: 'Uva' }, { id: 'morango', e: '🍓', name: 'Morango' },
  { id: 'laranja', e: '🍊', name: 'Laranja' }, { id: 'melancia', e: '🍉', name: 'Melancia' },
  { id: 'pao', e: '🍞', name: 'Pão' }, { id: 'queijo', e: '🧀', name: 'Queijo' },
  { id: 'leite', e: '🥛', name: 'Leite' }, { id: 'ovo', e: '🥚', name: 'Ovo' },
  { id: 'biscoito', e: '🍪', name: 'Biscoito' }, { id: 'cenoura', e: '🥕', name: 'Cenoura' },
];
const byId = id => PRODUCTS.find(p => p.id === id);
const ROWS = 3, COLS = 4, CART_MAX = 10, RESTOCK = 1.2;

let L = {}, aisleLayer = null, checkLayer = null, slots = [];
const cam = { x: 0, from: 0, to: 0, at: -9, dur: 1.3 };

function layoutShop() {
  const port = H > W;
  L = port ? {
    port,
    shelf: { x: W * .04, y: H * .1, w: W * .92, h: H * .52 },
    cart: [W * .33, H * .925], cartW: W * .56,
    list: { x: W * .71, y: H * .67, w: W * .26, h: H * .25 },
    counterY: H * .6, cashier: [W * .66, H * .41], headS: Math.min(W * .28, H * .13),
    register: [W * .2, H * .6], scanner: [W * .43, H * .6], bag: [W * .87, H * .6],
    cartC: [W * .33, H * .925], purse: [W * .8, H * .86],
  } : {
    port,
    shelf: { x: W * .03, y: H * .14, w: W * .56, h: H * .82 },
    cart: [W * .84, H * .93], cartW: W * .24,
    list: { x: W * .615, y: H * .16, w: W * .12, h: H * .5 },
    counterY: H * .58, cashier: [W * .69, H * .32], headS: H * .25,
    register: [W * .4, H * .58], scanner: [W * .55, H * .58], bag: [W * .86, H * .58],
    cartC: [W * .14, H * .93], purse: [W * .88, H * .86],
  };
  const { shelf } = L, cw = shelf.w / COLS, rh = shelf.h / ROWS;
  L.item = Math.min(cw * .72, rh * .62);
  slots = PRODUCTS.map((p, i) => ({ p, x: shelf.x + cw * (i % COLS + .5), y: shelf.y + rh * (Math.floor(i / COLS) + 1) - rh * .12, takenAt: slots[i]?.takenAt ?? -9 }));
  aisleLayer = buildAisle();
  checkLayer = buildCheckout();
}

// ---------- corredor ----------
function buildAisle() {
  const [c, g] = layer(W, H), { shelf } = L, rh = shelf.h / ROWS;
  const wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#fff6e6'); wall.addColorStop(1, '#ffe9c9');
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffd9a8'; g.fillRect(0, H * (L.port ? .7 : .9), W, H);   // chão
  g.fillStyle = 'rgb(255 255 255 / .5)';
  for (let x = 0; x < W; x += 60) g.fillRect(x, H * (L.port ? .7 : .9), 2, H);
  // estante
  g.fillStyle = '#6fb6e8'; g.beginPath(); g.roundRect(shelf.x - 8, shelf.y - 16, shelf.w + 16, shelf.h + 24, 16); g.fill();
  g.fillStyle = '#e8f5ff'; g.beginPath(); g.roundRect(shelf.x, shelf.y - 8, shelf.w, shelf.h + 8, 10); g.fill();
  const colors = ['#ff8a7a', '#ffd35c', '#8fdc7a'];
  for (let r = 0; r < ROWS; r++) {
    const y = shelf.y + rh * (r + 1) - rh * .12;
    g.fillStyle = '#4a97cf'; g.fillRect(shelf.x, y, shelf.w, rh * .1);
    g.fillStyle = colors[r]; g.fillRect(shelf.x, y + rh * .02, shelf.w, rh * .06);
    for (let i = 0; i < COLS; i++) {   // plaquinha de preço
      const x = shelf.x + shelf.w / COLS * (i + .5);
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x - rh * .1, y + rh * .015, rh * .2, rh * .07, 3); g.fill();
      g.fillStyle = '#ff5a4f'; circle(g, x, y + rh * .05, rh * .018); g.fill();
    }
  }
  return c;
}

// ---------- caixa ----------
function buildCheckout() {
  const [c, g] = layer(W, H), y = L.counterY;
  const wall = g.createLinearGradient(0, 0, 0, y);
  wall.addColorStop(0, '#e9f7ff'); wall.addColorStop(1, '#d6efff');
  g.fillStyle = wall; g.fillRect(0, 0, W, y);
  // placa CAIXA
  const s = Math.min(W, H) * .07;
  g.fillStyle = '#ff5a4f'; g.beginPath(); g.roundRect(W * .08, H * .13, s * 3.6, s * 1.3, s * .3); g.fill();
  g.fillStyle = '#fff'; g.font = `800 ${Math.round(s * .75)}px ui-rounded, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CAIXA', W * .08 + s * 1.8, H * .13 + s * .68);
  g.fillStyle = '#ffd9a8'; g.fillRect(0, y, W, H - y);
  // toldo listrado lá em cima
  const n = Math.max(8, Math.round(W / 48)), sw = W / n, aw = H * .06;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#fff' : '#ffb020'; g.fillRect(i * sw, 0, sw, aw);
    g.beginPath(); g.arc(i * sw + sw / 2, aw, sw / 2, 0, Math.PI); g.fill();
  }
  return c;
}

function drawCounterFront() {
  const y = L.counterY, h = L.item * .55;
  ctx.fillStyle = '#9fd3f5'; ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = '#7fbfe8'; ctx.fillRect(0, y + h, W, 6);
  ctx.fillStyle = '#e6eef3'; ctx.fillRect(0, y - h * .2, W, h * .5);   // esteira
  ctx.fillStyle = '#3d4a57'; ctx.fillRect(0, y - h * .05, W, h * .3);
  ctx.strokeStyle = 'rgb(255 255 255 / .25)'; ctx.lineWidth = 2;
  for (let x = (clock * 30) % 24; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, y - h * .05); ctx.lineTo(x, y + h * .25); ctx.stroke(); }
  ctx.fillStyle = 'rgb(255 255 255 / .35)';
  for (let x = 0; x < W; x += 50) ctx.fillRect(x + 8, y + h + 18, 26, H);
}

// ---------- câmera ----------
function panTo(x) { Object.assign(cam, { from: cam.x, to: x, at: clock }); }
function updateCam() {
  const k = Math.min((clock - cam.at) / cam.dur, 1), e = k * k * (3 - 2 * k);
  cam.x = cam.from + (cam.to - cam.from) * e;
}
const panK = () => W ? cam.x / W : 0;
