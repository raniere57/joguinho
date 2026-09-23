'use strict';
// base compartilhada pelos jogos: tela, utilitários e sprites

const TAU = Math.PI * 2;
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
const CONFETTI_COLORS = ['#ff5fa8', '#ffc930', '#5ad16e', '#4fb4ff', '#b77cff', '#ff8a3d'];

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, R = 0, DPR = 1;   // R = medida base dos jogos, proporcional à tela
let clock = 0;                      // segundos, relógio único de animação

const pick = a => a[Math.random() * a.length | 0];
const rand = (a, b) => a + Math.random() * (b - a);
const easeOutBack = x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

// canvas fora da tela, já na densidade do aparelho; desenhar nele uma vez e só copiar por frame
function layer(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
  c.w = w; c.h = h;
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  return [c, g];
}

function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); }

function star(g, x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}

// emoji desenhado uma vez num canvas próprio (fillText de emoji por frame é caro)
const emojiSprites = new Map();
function emojiSprite(e, size) {
  const key = e + size;
  let c = emojiSprites.get(key);
  if (c) return c;
  let g;
  [c, g] = layer(size, size);
  g.font = `${size * .78}px ${EMOJI_FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
  g.shadowColor = 'rgb(20 40 90 / .25)'; g.shadowBlur = size * .05; g.shadowOffsetY = size * .025;
  g.fillText(e, size / 2, size * .54);
  emojiSprites.set(key, c);
  return c;
}

// ajusta o canvas à tela; devolve a escala antiga pra quem precisar reposicionar coisas
function fitCanvas() {
  const old = { W, H, R };
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  R = Math.min(Math.min(W, H) * .15, 120);
  emojiSprites.clear();
  return old;
}
