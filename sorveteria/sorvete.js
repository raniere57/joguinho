'use strict';
// o sorvete e as ferramentas do balcão: casquinha, copinho, bolas de sabor, caldas, granulado,
// cereja e biscoito. Tudo desenhado em vetor, apoiado no balcão em (x, y), u = tamanho base.

const FLAVORS = {
  morango: { name: 'Morango', c: '#ff9ec2', d: '#f06e9e' },
  chocolate: { name: 'Chocolate', c: '#9a6440', d: '#6b3f25' },
  baunilha: { name: 'Baunilha', c: '#fff1c9', d: '#ecd08a' },
  menta: { name: 'Menta', c: '#9be8c8', d: '#52c795', chips: true },
  uva: { name: 'Uva', c: '#c79bff', d: '#9a6cf0' },
  manga: { name: 'Manga', c: '#ffc34d', d: '#f0a020' },
};
const TOPPINGS = ['calda-choc', 'calda-morango', 'granulado', 'cereja', 'biscoito'];
const TOPPING_TEXT = { 'calda-choc': 'Calda de chocolate!', 'calda-morango': 'Calda de morango!', granulado: 'Granulado!', cereja: 'Cerejinha!', biscoito: 'Biscoito!' };
const SAUCE = { 'calda-choc': '#5a3420', 'calda-morango': '#e8456f' };
const SPRINKLE_COLORS = ['#ff5a5f', '#ffd23b', '#4fb4ff', '#5ad16e', '#b77cff', '#fff'];
const SCOOP_R = .46, SCOOP_STEP = 1.12;

// ---------- sorvete montado ----------
// c = { base, scoops: [{ f, at }], sauce, sauceAt, sprinkles, cherry, wafer }
function containerTop(c, u) { return c.base === 'cup' ? -u * .6 : -u * 1.12; }
function scoopCenter(c, u, i) { const r = u * SCOOP_R; return [0, containerTop(c, u) - r * .25 - i * r * SCOOP_STEP]; }
function creamTop(c, u) {
  const n = c.scoops.length;
  return n ? scoopCenter(c, u, n - 1)[1] - u * SCOOP_R : containerTop(c, u);
}

function drawIceCream(g, x, y, u, c, t, eaten = 0) {
  g.save(); g.translate(x, y);
  if (c.base === 'cone') drawCone(g, u);
  else if (c.base === 'cup') drawCup(g, u, false);
  const shown = Math.ceil(c.scoops.length * (1 - eaten) - 1e-6);
  const r = u * SCOOP_R;
  for (let i = 0; i < shown; i++) {
    const s = c.scoops[i], k = landing(s.at), [sx, sy] = scoopCenter(c, u, i);
    const bite = eaten > 0 && i === shown - 1 ? (c.scoops.length * (1 - eaten)) % 1 || 1 : 1;
    drawScoop(g, sx, sy + r * (1 - k.sy) * .5, r, FLAVORS[s.f], k.sx, k.sy, bite, i);
  }
  if (c.base === 'cup') drawCup(g, u, true);   // borda do copinho na frente da primeira bola
  if (!eaten && shown) drawToppings(g, c, u, t);
  g.restore();
}

// bola que acabou de cair amassa e volta
function landing(at) {
  const p = (clock - at) / .35;
  if (p < 0 || p >= 1) return { sx: 1, sy: 1 };
  const w = Math.sin(p * Math.PI) * (1 - p) * .5;
  return { sx: 1 + w, sy: 1 - w };
}

function drawCone(g, u) {
  const h = u * 1.12, w = u * .95;
  g.fillStyle = '#b8c4d4'; g.beginPath(); g.ellipse(0, 0, u * .32, u * .07, 0, 0, TAU); g.fill();   // suporte
  g.fillRect(-u * .04, -u * .45, u * .08, u * .45);
  g.fillStyle = '#e8a35a';
  g.beginPath(); g.moveTo(-w / 2, -h); g.lineTo(w / 2, -h); g.lineTo(0, -u * .05); g.closePath(); g.fill();
  g.save(); g.clip();
  g.strokeStyle = '#c97e36'; g.lineWidth = u * .03;
  for (let k = -6; k <= 6; k++) {
    g.beginPath(); g.moveTo(k * u * .14 - u * .6, -h); g.lineTo(k * u * .14 + u * .6, 0); g.stroke();
    g.beginPath(); g.moveTo(k * u * .14 + u * .6, -h); g.lineTo(k * u * .14 - u * .6, 0); g.stroke();
  }
  g.restore();
  g.fillStyle = '#d98f45'; g.beginPath(); g.roundRect?.(-w / 2 - u * .03, -h - u * .06, w + u * .06, u * .12, u * .05); g.fill();
  g.fillStyle = '#b8c4d4'; g.beginPath(); g.roundRect?.(-u * .25, -u * .5, u * .5, u * .07, u * .03); g.fill();   // anel do suporte
}

// o copinho é desenhado em duas partes: fundo antes das bolas, frente depois
function drawCup(g, u, front) {
  const top = -u * .72, tw = u * 1.15, bw = u * .78;
  if (!front) {
    g.fillStyle = '#ff7aa8';
    g.beginPath(); g.moveTo(-tw / 2, top); g.lineTo(tw / 2, top); g.lineTo(bw / 2, 0); g.lineTo(-bw / 2, 0); g.closePath(); g.fill();
    g.save(); g.clip();
    g.fillStyle = '#fff';
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * u * .2 - u * .05, top); g.lineTo(k * u * .2 + u * .05, top); g.lineTo(k * u * .14 + u * .035, 0); g.lineTo(k * u * .14 - u * .035, 0); g.fill(); }
    g.restore();
    return;
  }
  g.fillStyle = '#ff5f93'; g.beginPath(); g.roundRect?.(-tw / 2 - u * .04, top - u * .06, tw + u * .08, u * .13, u * .06); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .45)'; g.fillRect(-tw * .4, top - u * .03, tw * .3, u * .03);
}

function drawScoop(g, x, y, r, fl, sx = 1, sy = 1, bite = 1, seed = 0) {
  g.save(); g.translate(x, y); g.scale(sx, sy);
  if (bite < 1) {   // mordida: corta o alto da bola
    g.beginPath(); g.rect(-r * 1.4, -r * 1.4 + r * 2.2 * (1 - bite), r * 2.8, r * 3); g.clip();
  }
  g.fillStyle = fl.d;
  for (let k = -2; k <= 2; k++) { circle(g, k * r * .42, r * .62, r * .26); g.fill(); }   // babadinho de baixo
  g.fillStyle = fl.c;
  circle(g, 0, 0, r); g.fill();
  for (let k = -2; k <= 2; k++) { circle(g, k * r * .42, r * .5, r * .24); g.fill(); }
  if (fl.chips) {
    g.fillStyle = '#5a3420';
    for (const [px, py] of [[-.4, -.2], [.3, -.45], [.1, .15], [-.1, -.55], [.5, .05]]) { g.beginPath(); g.ellipse(px * r, py * r, r * .07, r * .05, seed + px, 0, TAU); g.fill(); }
  }
  g.fillStyle = 'rgb(255 255 255 / .45)'; g.beginPath(); g.ellipse(-r * .35, -r * .45, r * .28, r * .14, -.6, 0, TAU); g.fill();
  if (bite < 1) {   // marquinha dos dentes
    g.fillStyle = fl.d;
    for (let k = -2; k <= 2; k++) { circle(g, k * r * .4, -r * 1.4 + r * 2.2 * (1 - bite), r * .16); g.fill(); }
  }
  g.restore();
}

function drawToppings(g, c, u, t) {
  const n = c.scoops.length, r = u * SCOOP_R, [tx, ty] = scoopCenter(c, u, n - 1);
  if (c.sauce) {
    const k = Math.min((clock - c.sauceAt) / .5, 1);
    g.fillStyle = SAUCE[c.sauce];
    g.beginPath(); g.arc(tx, ty, r * 1.02, Math.PI * 1.02, TAU * .99);
    for (let i = 6; i >= 0; i--) {   // escorridos
      const a = Math.PI * (1 + i / 6), len = (i % 2 ? .35 : .15) * k;
      g.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r * .15 + r * len);
    }
    g.fill();
    g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.ellipse(tx - r * .3, ty - r * .6, r * .2, r * .07, -.4, 0, TAU); g.fill();
  }
  if (c.sprinkles) {
    for (let i = 0; i < n; i++) {
      const [sx, sy] = scoopCenter(c, u, i);
      for (let k = 0; k < 9; k++) {
        const a = k * 2.4 + i, d = ((k * 37 + i * 11) % 10) / 10 * r * .8;
        g.save(); g.translate(sx + Math.cos(a) * d, sy + Math.sin(a) * d * .85 - r * .1); g.rotate(a * 3);
        g.fillStyle = SPRINKLE_COLORS[(k + i) % SPRINKLE_COLORS.length]; g.fillRect(-u * .035, -u * .012, u * .07, u * .024);
        g.restore();
      }
    }
  }
  if (c.wafer) {
    g.save(); g.translate(tx + r * .35, ty - r * .55); g.rotate(.35);
    g.fillStyle = '#e8a35a'; g.fillRect(-u * .07, -u * .5, u * .14, u * .55);
    g.strokeStyle = '#c97e36'; g.lineWidth = u * .015;
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(-u * .07, -u * .5 + k * u * .11); g.lineTo(u * .07, -u * .5 + k * u * .11); g.stroke(); }
    g.restore();
  }
  if (c.cherry) drawCherry(g, tx, ty - r * 1.05, u * .16, t);
}

function drawCherry(g, x, y, r, t = 0) {
  g.strokeStyle = '#3f8a3a'; g.lineWidth = r * .22; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y - r * .6); g.quadraticCurveTo(x + r * .2, y - r * 1.6, x + r * .9, y - r * 1.9 + Math.sin(t * 3) * r * .1); g.stroke();
  g.fillStyle = '#e8203c'; circle(g, x, y, r); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .6)'; circle(g, x - r * .35, y - r * .3, r * .28); g.fill();
}

// ---------- ferramentas ----------
// pote de sorvete visto de cima/frente, com a cor do sabor
function drawTub(g, x, y, s, fl, t, glow) {
  if (glow) { g.fillStyle = `rgb(255 240 150 / ${.35 + .25 * Math.sin(t * 6)})`; circle(g, x, y, s * .72); g.fill(); }
  g.fillStyle = '#e4ebf3'; g.beginPath(); g.roundRect?.(x - s * .46, y - s * .12, s * .92, s * .48, s * .12); g.fill();
  g.fillStyle = '#c8d3e0'; g.fillRect(x - s * .46, y + s * .06, s * .92, s * .04);
  g.fillStyle = fl.d; g.beginPath(); g.ellipse(x, y - s * .12, s * .46, s * .16, 0, 0, TAU); g.fill();
  g.fillStyle = fl.c;
  g.beginPath(); g.ellipse(x, y - s * .15, s * .42, s * .13, 0, 0, TAU); g.fill();
  for (const [dx, dy, r] of [[-.18, -.2, .14], [.1, -.25, .17], [.26, -.16, .1]]) { circle(g, x + dx * s, y + dy * s, r * s); g.fill(); }
  if (fl.chips) { g.fillStyle = '#5a3420'; for (const [dx, dy] of [[-.2, -.25], [.08, -.33], [.2, -.2]]) { circle(g, x + dx * s, y + dy * s, s * .025); g.fill(); } }
  g.fillStyle = 'rgb(255 255 255 / .5)'; g.beginPath(); g.ellipse(x - s * .05, y - s * .32, s * .1, s * .04, -.3, 0, TAU); g.fill();
  g.fillStyle = fl.c; circle(g, x, y + s * .2, s * .1); g.fill();   // etiqueta com a cor
  g.strokeStyle = '#fff'; g.lineWidth = s * .03; g.stroke();
}

function drawToolIcon(g, id, x, y, s, t, glow) {
  if (glow) { g.fillStyle = `rgb(255 240 150 / ${.35 + .25 * Math.sin(t * 6)})`; circle(g, x, y, s * .62); g.fill(); }
  g.save(); g.translate(x, y);
  if (id !== 'cone' && id !== 'cup') s *= 1.45;   // enfeites são finos: desenha maior pra caber o dedinho
  switch (id) {
    case 'cone': g.translate(0, s * .42); drawCone(g, s * .72); break;
    case 'cup': g.translate(0, s * .3); drawCup(g, s * .7, false); drawCup(g, s * .7, true); break;
    case 'calda-choc': case 'calda-morango': bottle(g, s, SAUCE[id]); break;
    case 'granulado': shaker(g, s); break;
    case 'cereja': drawCherry(g, -s * .05, s * .1, s * .2, t); break;
    case 'biscoito':
      g.rotate(.35); g.fillStyle = '#e8a35a'; g.fillRect(-s * .1, -s * .38, s * .2, s * .76);
      g.strokeStyle = '#c97e36'; g.lineWidth = s * .02;
      for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(-s * .1, -s * .38 + k * s * .108); g.lineTo(s * .1, -s * .38 + k * s * .108); g.stroke(); }
      break;
  }
  g.restore();
}

function bottle(g, s, color) {
  g.fillStyle = color; g.beginPath(); g.roundRect?.(-s * .17, -s * .15, s * .34, s * .5, s * .08); g.fill();
  g.beginPath(); g.moveTo(-s * .1, -s * .15); g.lineTo(-s * .05, -s * .32); g.lineTo(s * .05, -s * .32); g.lineTo(s * .1, -s * .15); g.fill();
  g.fillStyle = '#fff'; g.fillRect(-s * .03, -s * .42, s * .06, s * .1);
  g.fillStyle = 'rgb(255 255 255 / .85)'; g.beginPath(); g.roundRect?.(-s * .12, 0, s * .24, s * .16, s * .04); g.fill();
  g.fillStyle = color; circle(g, 0, s * .08, s * .045); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .3)'; g.fillRect(-s * .13, -s * .1, s * .05, s * .35);
}

function shaker(g, s) {
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(-s * .16, -s * .2, s * .32, s * .52, s * .08); g.fill();
  g.fillStyle = '#ffd23b'; g.beginPath(); g.roundRect?.(-s * .18, -s * .32, s * .36, s * .14, s * .05); g.fill();
  g.fillStyle = '#e0a800'; for (const dx of [-.08, 0, .08]) { circle(g, dx * s, -s * .25, s * .018); g.fill(); }
  for (let k = 0; k < 14; k++) {
    g.fillStyle = SPRINKLE_COLORS[k % SPRINKLE_COLORS.length];
    g.save(); g.translate(((k * 37) % 20 - 10) / 10 * s * .1, -s * .1 + ((k * 13) % 10) / 10 * s * .36); g.rotate(k);
    g.fillRect(-s * .03, -s * .01, s * .06, s * .02); g.restore();
  }
}
