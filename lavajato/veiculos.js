'use strict';
// veículos do lava-jato, de lado e olhando pra direita, com olhinhos no para-brisa.
// Coordenadas locais: origem no chão, no meio do veículo; u = largura; y negativo pra cima.
// Cada um tem body(g, u): o contorno da lataria (onde gruda lama, espuma e gotas)
// e paint(g, u, t, v): o desenho completo por cima.

// rp só acrescenta ao caminho (lataria feita de várias peças); rr começa um novo
function rp(g, x, y, w, h, r) { g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function rr(g, x, y, w, h, r) { g.beginPath(); rp(g, x, y, w, h, r); }

function wheel(g, x, y, r, spin) {
  g.fillStyle = '#2f2f3a'; circle(g, x, y, r); g.fill();
  g.fillStyle = '#c9ced8'; circle(g, x, y, r * .55); g.fill();
  g.strokeStyle = '#8f96a3'; g.lineWidth = r * .12; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = spin + i * TAU / 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5); g.stroke();
  }
  g.fillStyle = '#8f96a3'; circle(g, x, y, r * .15); g.fill();
}

// olhos no para-brisa: olham pro dedo, piscam; humor muda sobrancelha e boca
function eyes(g, cx, cy, w, v) {
  const r = w * .2, gap = w * .24;
  for (const d of [-1, 1]) {
    const x = cx + d * gap, open = v.blink;
    g.fillStyle = '#fff'; g.strokeStyle = '#2b2140'; g.lineWidth = r * .16;
    g.beginPath(); g.ellipse(x, cy, r, r * 1.2 * open, 0, 0, TAU); g.fill(); g.stroke();
    if (open > .3) {
      g.fillStyle = '#2b2140';
      circle(g, x + v.lookX * r * .35, cy + v.lookY * r * .3, r * .5); g.fill();
      g.fillStyle = '#fff'; circle(g, x + v.lookX * r * .35 + r * .18, cy + v.lookY * r * .3 - r * .2, r * .17); g.fill();
    }
    if (v.mood === 'dirty') {   // sobrancelha tristinha
      g.strokeStyle = '#2b2140'; g.lineWidth = r * .2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * .8, cy - r * 1.35 - d * r * .25); g.lineTo(x + r * .8, cy - r * 1.35 + d * r * .25); g.stroke();
    }
  }
}

function mouth(g, x, y, w, v) {
  g.strokeStyle = '#2b2140'; g.fillStyle = '#7a2438'; g.lineWidth = w * .07; g.lineCap = 'round';
  if (v.mood === 'dirty') {
    g.beginPath(); g.moveTo(x - w * .4, y); g.quadraticCurveTo(x - w * .2, y - w * .12, x, y); g.quadraticCurveTo(x + w * .2, y + w * .12, x + w * .4, y); g.stroke();
  } else if (v.mood === 'happy') {
    g.beginPath(); g.arc(x, y - w * .15, w * .42, .1 * Math.PI, .9 * Math.PI); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff8fa8'; g.beginPath(); g.ellipse(x, y + w * .12, w * .18, w * .08, 0, 0, TAU); g.fill();
  } else { g.beginPath(); g.arc(x, y - w * .2, w * .35, .2 * Math.PI, .8 * Math.PI); g.stroke(); }
}

function light(g, x, y, r, color, on) {
  if (on) { g.fillStyle = color === '#fff3a0' ? 'rgb(255 245 170 / .35)' : 'rgb(255 80 80 / .3)'; circle(g, x, y, r * 2.6); g.fill(); }
  g.fillStyle = color; circle(g, x, y, r); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .7)'; circle(g, x - r * .3, y - r * .3, r * .35); g.fill();
}

function shine(g, x, y, w, h) {   // reflexo da lataria
  g.fillStyle = 'rgb(255 255 255 / .28)';
  rr(g, x, y, w, h, h / 2); g.fill();
}

const VEHICLES = [
  {
    id: 'carro', name: 'o carrinho', ratio: .5, color: '#ff5a5f',
    wheels: u => [[-.3 * u, .1 * u], [.3 * u, .1 * u]],
    body(g, u) {
      rp(g, -.49 * u, -.3 * u, .98 * u, .21 * u, .08 * u);
      g.moveTo(-.33 * u, -.29 * u);
      g.bezierCurveTo(-.3 * u, -.47 * u, -.25 * u, -.49 * u, -.12 * u, -.49 * u);
      g.lineTo(.08 * u, -.49 * u);
      g.bezierCurveTo(.2 * u, -.49 * u, .26 * u, -.4 * u, .34 * u, -.29 * u);
      g.closePath();
    },
    paint(g, u, t, v) {
      g.fillStyle = this.color; g.beginPath(); this.body(g, u); g.fill();
      g.fillStyle = '#bfe8ff';
      g.beginPath(); g.moveTo(-.27 * u, -.31 * u); g.bezierCurveTo(-.25 * u, -.43 * u, -.2 * u, -.44 * u, -.13 * u, -.44 * u); g.lineTo(-.07 * u, -.44 * u); g.lineTo(-.07 * u, -.31 * u); g.fill();
      g.beginPath(); g.moveTo(-.03 * u, -.44 * u); g.lineTo(.08 * u, -.44 * u); g.bezierCurveTo(.17 * u, -.44 * u, .22 * u, -.38 * u, .27 * u, -.31 * u); g.lineTo(-.03 * u, -.31 * u); g.fill();
      eyes(g, .1 * u, -.375 * u, .16 * u, v);
      shine(g, -.4 * u, -.27 * u, .5 * u, .03 * u);
      g.strokeStyle = 'rgb(0 0 0 / .15)'; g.lineWidth = u * .006;
      g.beginPath(); g.moveTo(-.05 * u, -.29 * u); g.lineTo(-.05 * u, -.12 * u); g.stroke();
      g.fillStyle = 'rgb(0 0 0 / .2)'; rr(g, .02 * u, -.24 * u, .06 * u, .015 * u, .01 * u); g.fill();
      light(g, .45 * u, -.22 * u, .035 * u, '#fff3a0', v.lights);
      light(g, -.46 * u, -.22 * u, .025 * u, '#ff4d4d', v.lights);
      mouth(g, .41 * u, -.14 * u, .08 * u, v);
    },
  },
  {
    id: 'bombeiro', name: 'o caminhão de bombeiro', ratio: .52, color: '#e63b2e',
    wheels: u => [[-.33 * u, .1 * u], [-.12 * u, .1 * u], [.32 * u, .1 * u]],
    body(g, u) {
      rp(g, -.5 * u, -.32 * u, u, .23 * u, .03 * u);
      rp(g, .17 * u, -.5 * u, .32 * u, .22 * u, .06 * u);
    },
    paint(g, u, t, v) {
      g.fillStyle = this.color; g.beginPath(); this.body(g, u); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-.5 * u, -.2 * u, u, .025 * u);
      // escada no teto
      g.strokeStyle = '#c9ced8'; g.lineWidth = u * .014; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-.46 * u, -.36 * u); g.lineTo(.12 * u, -.36 * u); g.moveTo(-.46 * u, -.41 * u); g.lineTo(.12 * u, -.41 * u); g.stroke();
      for (let x = -.43; x < .12; x += .07) { g.beginPath(); g.moveTo(x * u, -.36 * u); g.lineTo(x * u, -.41 * u); g.stroke(); }
      g.strokeStyle = '#8f96a3'; g.beginPath(); g.moveTo(-.4 * u, -.32 * u); g.lineTo(-.4 * u, -.36 * u); g.moveTo(.05 * u, -.32 * u); g.lineTo(.05 * u, -.36 * u); g.stroke();
      // mangueira enrolada
      g.fillStyle = '#ffd23b'; circle(g, -.22 * u, -.26 * u, .045 * u); g.fill();
      g.fillStyle = '#e0a800'; circle(g, -.22 * u, -.26 * u, .02 * u); g.fill();
      // sirene
      const blink = v.siren && Math.sin(t * 20) > 0;
      g.fillStyle = blink ? '#4fb4ff' : '#1d6fd1'; rr(g, .26 * u, -.55 * u, .06 * u, .05 * u, .015 * u); g.fill();
      g.fillStyle = blink ? '#ff4d4d' : '#ff8f8f'; rr(g, .33 * u, -.55 * u, .06 * u, .05 * u, .015 * u); g.fill();
      if (v.siren) { g.fillStyle = `rgb(120 190 255 / ${blink ? .4 : .15})`; circle(g, .32 * u, -.53 * u, .1 * u); g.fill(); }
      g.fillStyle = '#bfe8ff'; rr(g, .26 * u, -.46 * u, .2 * u, .12 * u, .03 * u); g.fill();
      eyes(g, .36 * u, -.4 * u, .12 * u, v);
      shine(g, -.45 * u, -.3 * u, .55 * u, .025 * u);
      light(g, .47 * u, -.23 * u, .035 * u, '#fff3a0', v.lights);
      mouth(g, .43 * u, -.14 * u, .07 * u, v);
    },
  },
  {
    id: 'onibus', name: 'o ônibus escolar', ratio: .5, color: '#ffc93c',
    wheels: u => [[-.3 * u, .1 * u], [.32 * u, .1 * u]],
    body(g, u) { rp(g, -.5 * u, -.48 * u, u, .39 * u, .07 * u); },
    paint(g, u, t, v) {
      g.fillStyle = this.color; g.beginPath(); this.body(g, u); g.fill();
      g.fillStyle = '#2f2f3a'; g.fillRect(-.5 * u, -.2 * u, u, .025 * u);
      g.fillStyle = '#bfe8ff';
      for (let i = 0; i < 4; i++) { rr(g, (-.44 + i * .15) * u, -.42 * u, .12 * u, .11 * u, .02 * u); g.fill(); }
      rr(g, .2 * u, -.43 * u, .26 * u, .16 * u, .04 * u); g.fill();
      eyes(g, .33 * u, -.35 * u, .15 * u, v);
      // placa de pare, que abre quando toca
      g.save(); g.translate(-.05 * u, -.26 * u); g.rotate(-v.sign * 1.4);
      g.fillStyle = '#ff4d4d'; circle(g, 0, -.05 * u, .035 * u); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = u * .006; circle(g, 0, -.05 * u, .027 * u); g.stroke();
      g.restore();
      shine(g, -.45 * u, -.46 * u, .6 * u, .025 * u);
      light(g, .48 * u, -.15 * u, .03 * u, '#fff3a0', v.lights);
      light(g, -.48 * u, -.15 * u, .025 * u, '#ff4d4d', v.lights);
      mouth(g, .42 * u, -.13 * u, .07 * u, v);
    },
  },
  {
    id: 'trator', name: 'o trator', ratio: .66, color: '#4caf50',
    wheels: u => [[-.26 * u, .2 * u], [.3 * u, .11 * u]],
    body(g, u) {
      rp(g, -.14 * u, -.34 * u, .6 * u, .2 * u, .05 * u);
      rp(g, -.44 * u, -.64 * u, .36 * u, .44 * u, .05 * u);
    },
    paint(g, u, t, v) {
      g.fillStyle = this.color; g.beginPath(); this.body(g, u); g.fill();
      g.fillStyle = '#ffd23b'; rr(g, -.46 * u, -.68 * u, .4 * u, .06 * u, .03 * u); g.fill();
      g.fillStyle = '#bfe8ff'; rr(g, -.38 * u, -.58 * u, .24 * u, .2 * u, .03 * u); g.fill();
      eyes(g, -.26 * u, -.48 * u, .15 * u, v);
      // grade do motor e escapamento soltando fumaça
      g.strokeStyle = 'rgb(0 0 0 / .2)'; g.lineWidth = u * .01;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo((.3 + i * .04) * u, -.31 * u); g.lineTo((.3 + i * .04) * u, -.18 * u); g.stroke(); }
      g.fillStyle = '#5f6470'; rr(g, .12 * u, -.52 * u, .035 * u, .19 * u, .01 * u); g.fill();
      if (v.puffs) for (let i = 0; i < 3; i++) {
        const p = (t * .7 + i / 3) % 1;
        g.fillStyle = `rgb(220 220 230 / ${.6 * (1 - p)})`; circle(g, .14 * u + p * .08 * u, -.55 * u - p * .18 * u, (.025 + p * .04) * u); g.fill();
      }
      shine(g, -.1 * u, -.32 * u, .4 * u, .025 * u);
      light(g, .45 * u, -.26 * u, .03 * u, '#fff3a0', v.lights);
      mouth(g, .4 * u, -.19 * u, .07 * u, v);
    },
  },
  {
    id: 'sorvete', name: 'o caminhão de sorvete', ratio: .64, color: '#ff8fc8',
    wheels: u => [[-.3 * u, .1 * u], [.32 * u, .1 * u]],
    body(g, u) {
      rp(g, -.5 * u, -.46 * u, u, .37 * u, .06 * u);
    },
    paint(g, u, t, v) {
      // casquinha gigante no teto (balança quando toca)
      g.save(); g.translate(-.12 * u, -.46 * u); g.rotate(Math.sin(t * 3) * .03 + v.wobble * Math.sin(t * 18) * .15);
      g.fillStyle = '#e8a35a'; g.beginPath(); g.moveTo(-.06 * u, -.02 * u); g.lineTo(.06 * u, -.02 * u); g.lineTo(0, 0); g.fill();
      g.beginPath(); g.moveTo(-.06 * u, -.03 * u); g.lineTo(.06 * u, -.03 * u); g.lineTo(0, .01 * u); g.fill();
      g.fillStyle = '#ff6fa8'; circle(g, 0, -.1 * u, .075 * u); g.fill();
      g.fillStyle = '#fff5d6'; circle(g, 0, -.17 * u, .06 * u); g.fill();
      g.fillStyle = '#ff3b5c'; circle(g, 0, -.23 * u, .022 * u); g.fill();
      g.restore();
      g.fillStyle = this.color; g.beginPath(); this.body(g, u); g.fill();
      // janelinha de vender, com toldo listrado
      g.fillStyle = '#fff5d6'; rr(g, -.4 * u, -.36 * u, .45 * u, .16 * u, .02 * u); g.fill();
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#fff' : '#5ad16e'; g.fillRect((-.42 + i * .082) * u, -.42 * u, .082 * u, .05 * u); }
      g.fillStyle = '#b77cff'; circle(g, -.3 * u, -.28 * u, .03 * u); g.fill();
      g.fillStyle = '#ffd23b'; circle(g, -.2 * u, -.29 * u, .03 * u); g.fill();
      g.fillStyle = '#bfe8ff'; rr(g, .18 * u, -.42 * u, .28 * u, .16 * u, .04 * u); g.fill();
      eyes(g, .32 * u, -.34 * u, .15 * u, v);
      shine(g, -.45 * u, -.44 * u, .55 * u, .025 * u);
      light(g, .48 * u, -.15 * u, .03 * u, '#fff3a0', v.lights);
      mouth(g, .42 * u, -.13 * u, .07 * u, v);
    },
  },
];
