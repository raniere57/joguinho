'use strict';
// as plantas da horta, fase por fase: 0 semente, 1 brotinho, 2 plantinha, 3 com flor, 4 pronta pra colher.
// (x, y) = terra no meio do canteiro; s = tamanho base.

const CROPS = {
  cenoura: { e: '🥕', name: 'Uma cenoura!', leaf: '#4caf50' },
  tomate: { e: '🍅', name: 'Um tomate!', leaf: '#3f9e48' },
  morango: { e: '🍓', name: 'Um morango!', leaf: '#46a851' },
  girassol: { e: '🌻', name: 'Um girassol!', leaf: '#5aa83a' },
  abobora: { e: '🎃', name: 'Uma abóbora!', leaf: '#5fae46' },
  milho: { e: '🌽', name: 'Um milho!', leaf: '#6bb34a' },
};
const CROP_IDS = Object.keys(CROPS);
const RIPE = 4;

function leaf(g, x, y, len, w, a, color) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = color; g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(len * .5, -w, len, 0); g.quadraticCurveTo(len * .5, w, 0, 0); g.fill();
  g.strokeStyle = 'rgb(255 255 255 / .35)'; g.lineWidth = Math.max(1, w * .12);
  g.beginPath(); g.moveTo(len * .1, 0); g.lineTo(len * .85, 0); g.stroke();
  g.restore();
}

function emojiAt(g, e, x, y, size, rot = 0) {
  const sz = Math.max(4, Math.round(size / 4) * 4);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(emojiSprite(e, sz), -sz / 2, -sz / 2, sz, sz);
  g.restore();
}

// k = 0..1 do "pulinho" de quando acabou de crescer
function drawPlant(g, crop, stage, x, y, s, t, k = 1) {
  if (stage < 0) return;
  const c = CROPS[crop], sway = Math.sin(t * 1.6 + x * .05) * .06;
  g.save(); g.translate(x, y); g.scale(k, k); g.rotate(sway);
  if (stage === 0) {   // montinho com sementes
    g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(0, 0, s * .3, s * .12, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#f5deb3'; for (const dx of [-.12, 0, .12]) { g.beginPath(); g.ellipse(dx * s, -s * .06, s * .035, s * .022, dx * 5, 0, TAU); g.fill(); }
    g.restore(); return;
  }
  if (stage === 1) {   // brotinho
    g.strokeStyle = c.leaf; g.lineWidth = s * .05; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * .3); g.stroke();
    leaf(g, 0, -s * .28, s * .28, s * .12, -Math.PI * .85, c.leaf); leaf(g, 0, -s * .28, s * .28, s * .12, -Math.PI * .15, c.leaf);
    g.restore(); return;
  }
  const big = stage >= 3 ? 1.25 : 1;
  switch (crop) {
    case 'cenoura': {
      for (let i = 0; i < 5; i++) leaf(g, 0, -s * .02, s * .55 * big, s * .09, -Math.PI / 2 + (i - 2) * .28, c.leaf);
      // pronta: a cenoura aparece metade pra fora da terra
      if (stage >= RIPE) { g.save(); g.beginPath(); g.rect(-s, -s * 2, s * 2, s * 2.04); g.clip(); emojiAt(g, c.e, 0, -s * .2, s * .72, -Math.PI / 4); g.restore(); }
      break;
    }
    case 'tomate': case 'morango': case 'abobora': {
      const low = crop !== 'tomate';
      if (!low) { g.fillStyle = '#b07a4f'; g.fillRect(-s * .03, -s * 1.05 * big, s * .05, s * 1.05 * big); }   // estaca
      g.strokeStyle = c.leaf; g.lineWidth = s * .05; g.lineCap = 'round';
      const h = (low ? .35 : .85) * s * big;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * .08, -h * .5, 0, -h); g.stroke();
      const n = low ? 5 : 6;
      for (let i = 0; i < n; i++) {
        const yy = -h * (low ? .5 + (i % 2) * .4 : .2 + i * .14), a = (i % 2 ? -.15 : -.85) * Math.PI;
        leaf(g, 0, yy, s * (low ? .42 : .34) * big, s * .14, a + (low ? (i - 2) * .12 : 0), c.leaf);
      }
      if (stage === 3) {
        const flower = crop === 'morango' ? '#fff' : '#ffd23b';
        for (const [fx, fy] of (low ? [[-.25, -.3], [.22, -.4]] : [[-.2, -.5], [.2, -.75]])) flowerAt(g, fx * s, fy * s * big, s * .09, flower);
      }
      if (stage >= RIPE) {
        if (crop === 'abobora') emojiAt(g, c.e, s * .12, -s * .24, s * .8);
        else if (crop === 'morango') for (const [fx, fy] of [[-.3, -.15], [.05, -.1], [.3, -.2]]) emojiAt(g, c.e, fx * s, fy * s, s * .38);
        else for (const [fx, fy] of [[-.22, -.45], [.2, -.65], [-.12, -.85]]) emojiAt(g, c.e, fx * s, fy * s * big, s * .42);
      }
      break;
    }
    case 'girassol': {
      const h = s * (stage === 2 ? .7 : 1.3);
      g.strokeStyle = c.leaf; g.lineWidth = s * .07; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h); g.stroke();
      leaf(g, 0, -h * .35, s * .35, s * .15, -Math.PI * .85, c.leaf); leaf(g, 0, -h * .5, s * .35, s * .15, -Math.PI * .15, c.leaf);
      if (stage === 3) { g.fillStyle = '#6bb34a'; circle(g, 0, -h, s * .12); g.fill(); g.fillStyle = '#ffd23b'; circle(g, 0, -h - s * .05, s * .06); g.fill(); }
      if (stage >= RIPE) sunflower(g, 0, -h, s * .38, t);
      break;
    }
    case 'milho': {
      const h = s * (stage === 2 ? .65 : 1.2);
      g.strokeStyle = c.leaf; g.lineWidth = s * .08; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h); g.stroke();
      for (let i = 0; i < 4; i++) leaf(g, 0, -h * (.2 + i * .2), s * .45, s * .09, (i % 2 ? -.12 : -.88) * Math.PI, c.leaf);
      if (stage >= 3) { g.strokeStyle = '#e8c96a'; g.lineWidth = s * .03; for (const a of [-.3, 0, .3]) { g.beginPath(); g.moveTo(0, -h); g.lineTo(Math.sin(a) * s * .15, -h - s * .18); g.stroke(); } }
      if (stage >= RIPE) { emojiAt(g, c.e, s * .18, -h * .55, s * .5, .5); emojiAt(g, c.e, -s * .18, -h * .38, s * .45, -.5); }
      break;
    }
  }
  g.restore();
}

function flowerAt(g, x, y, r, color) {
  g.fillStyle = color;
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5; circle(g, x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7, r * .55); g.fill(); }
  g.fillStyle = '#ffb347'; circle(g, x, y, r * .45); g.fill();
}

function sunflower(g, x, y, r, t) {
  g.fillStyle = '#ffd23b';
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * .2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .75, y + Math.sin(a) * r * .75, r * .35, r * .15, a, 0, TAU); g.fill(); }
  g.fillStyle = '#8a5a2b'; circle(g, x, y, r * .55); g.fill();
  g.fillStyle = '#2b2140';
  for (const d of [-1, 1]) { circle(g, x + d * r * .2, y - r * .08, r * .07); g.fill(); }
  g.strokeStyle = '#2b2140'; g.lineWidth = r * .06; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y + r * .05, r * .2, .2 * Math.PI, .8 * Math.PI); g.stroke();
}

// altura da planta (pra saber onde o dedo pega nela)
function plantHeight(crop, stage, s) {
  if (stage < 2) return s * .4;
  if (crop === 'girassol') return s * (stage === 2 ? .8 : 1.7);
  if (crop === 'milho') return s * (stage === 2 ? .75 : 1.4);
  if (crop === 'tomate') return s * 1.2;
  return s * .7;
}
