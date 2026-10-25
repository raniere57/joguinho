'use strict';
// o campo de batalha na neve, em perspectiva: corredor do meio com muros, esteiras dos dois lados,
// pinheiros nevados. Coordenadas do mundo: u de -1 (muro esquerdo) a 1 (muro direito); v = 0 na linha
// dos canhões até 1 no alto da tela (passa de 1 lá pra trás). proj(u, v) devolve [x, y, escala].

const FONT = '"Arial Rounded MT Bold", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
const BELT_U = 1.27, BELT_W = .32, GATE_V = .22, WALL = [1, 1.1], OUTER = [1.43, 1.53];
const RED = ['#e3262f', '#ff7a6b', '#8e0f17'], BLUE = ['#2f74e8', '#8cc4ff', '#173f9a'], ICE = ['#7fc0ff', '#e4f4ff', '#3d82dc'];
let P = {}, fieldLayer = null, SPR = {};

function layoutField() {
  const port = H > W;
  const wN = port ? Math.min(W * .3, H * .19) : Math.min(W * .19, H * .34);
  P = { port, cx: W / 2, y0: H * (port ? .8 : .84), y1: -H * .04, wN, wF: wN * .57, p: .8 };
  P.unit = P.wN * .11;   // tamanho de um soldadinho perto da câmera   // tamanho de um soldadinho perto da câmera
  buildSprites();
  fieldLayer = buildField();
}

const fv = v => v * (1 + P.p) / (1 + P.p * v);
function proj(u, v) {
  const f = fv(v), half = P.wN + (P.wF - P.wN) * f;
  return [P.cx + u * half, P.y0 - (P.y0 - P.y1) * f, half / P.wN];
}
// v da tela pro mundo (pra saber onde o dedo está)
function unproj(x, y) {
  const f = (P.y0 - y) / (P.y0 - P.y1), v = f / (1 + P.p - P.p * f), half = P.wN + (P.wF - P.wN) * f;
  return [(x - P.cx) / half, v];
}

function quad(g, u0, u1, v0, v1) {
  const a = proj(u0, v0), b = proj(u1, v0), c = proj(u1, v1), d = proj(u0, v1);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}

// ---------- fundo fixo ----------
function buildField() {
  const [c, g] = layer(W, H), vBot = -.6, vTop = 1.6;
  const snow = g.createLinearGradient(0, 0, 0, H); snow.addColorStop(0, '#e9f1fa'); snow.addColorStop(1, '#f6f9fd');
  g.fillStyle = snow; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgb(160 185 215 / .18)';   // montinhos de neve
  for (let i = 0; i < 40; i++) {
    const u = (i % 2 ? 1 : -1) * rand(1.65, 4), v = rand(-.4, 1.3), [x, y, s] = proj(u, v);
    g.beginPath(); g.ellipse(x, y, P.wN * .25 * s, P.wN * .06 * s, 0, 0, TAU); g.fill();
  }
  const trees = [];
  for (let i = 0; i < 26; i++) trees.push([(i % 2 ? 1 : -1) * rand(1.75, 3.2), rand(-.3, 1.4)]);
  trees.sort((a, b) => b[1] - a[1]).forEach(([u, v]) => { const [x, y, s] = proj(u, v); pine(g, x, y, P.wN * .2 * s); });
  // chão: corredor lá em cima, e embaixo do portão o chão abre de ponta a ponta
  const fl = g.createLinearGradient(0, proj(0, vTop)[1], 0, H);
  fl.addColorStop(0, '#b7bdc8'); fl.addColorStop(1, '#d8dce3');
  g.fillStyle = fl; quad(g, -WALL[1], WALL[1], GATE_V, vTop); g.fill();
  g.fillStyle = '#d3d8df'; quad(g, -OUTER[0], OUTER[0], vBot, GATE_V + .005); g.fill();
  g.strokeStyle = 'rgb(255 255 255 / .25)'; g.lineWidth = 1;
  for (let v = vBot; v < vTop; v += .05) { const w = v < GATE_V ? OUTER[0] : 1, p = proj(-w, v), q = proj(w, v); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
  // esteiras dos dois lados, de cima até embaixo
  for (const d of [-1, 1]) {
    const a = d * (BELT_U - BELT_W / 2), b = d * (BELT_U + BELT_W / 2), lo = Math.min(a, b), hi = Math.max(a, b);
    g.fillStyle = '#3f4859'; quad(g, lo, hi, GATE_V - .03, vTop); g.fill();
    g.fillStyle = 'rgb(0 0 0 / .25)'; quad(g, lo, lo + BELT_W * .08, GATE_V - .03, vTop); g.fill(); quad(g, hi - BELT_W * .08, hi, GATE_V - .03, vTop); g.fill();
    g.fillStyle = 'rgb(80 95 120 / .12)'; quad(g, lo, hi, vBot, GATE_V - .03); g.fill();   // trilho pintado no chão até os canhões
  }
  // muros: entre corredor e esteira (só do portão pra cima) e por fora das esteiras
  const wall = (u0, u1, va, vb) => {
    g.fillStyle = '#8f99a8'; quad(g, u0, u1, va, vb); g.fill();
    g.fillStyle = '#f1f4f8'; quad(g, u0 + (u1 - u0) * .12, u1 - (u1 - u0) * .12, va, vb); g.fill();
    g.fillStyle = 'rgb(120 130 150 / .3)';
    for (let v = va; v < vb; v += .045) { quad(g, u0, u1, v, v + .004); g.fill(); }
  };
  for (const d of [-1, 1]) {
    wall(d > 0 ? WALL[0] : -WALL[1], d > 0 ? WALL[1] : -WALL[0], GATE_V + .01, vTop);
    wall(d > 0 ? OUTER[0] : -OUTER[1], d > 0 ? OUTER[1] : -OUTER[0], vBot, vTop);
  }
  return c;
}

function pine(g, x, y, s) {
  g.fillStyle = 'rgb(90 110 140 / .2)'; g.beginPath(); g.ellipse(x, y, s * .55, s * .16, 0, 0, TAU); g.fill();
  g.fillStyle = '#6b4a36'; g.fillRect(x - s * .07, y - s * .35, s * .14, s * .35);
  for (let k = 0; k < 3; k++) {
    const by = y - s * (.25 + k * .38), w = s * (.62 - k * .15), h = s * .55;
    g.fillStyle = '#6f8e93'; g.beginPath(); g.moveTo(x - w, by); g.lineTo(x, by - h); g.lineTo(x + w, by); g.closePath(); g.fill();
    g.fillStyle = '#f4f8fc'; g.beginPath(); g.moveTo(x - w * .55, by - h * .45); g.lineTo(x, by - h); g.lineTo(x + w * .7, by - h * .38); g.lineTo(x + w * .2, by - h * .5); g.closePath(); g.fill();
  }
}

// ---------- sprites ----------
function buildSprites() {
  SPR = { red: soldierSprite(RED), blue: soldierSprite(BLUE), ice: soldierSprite(ICE), cannon: cannonSprite(false), gatling: cannonSprite(true),
    puff: puffSprite(), ball: ballSprite(), tile1: tileSprite('#2a8af0', '#1a5cb8', '+1'), tile99: tileSprite('#ffc928', '#d99300', '+99') };
}

function soldierSprite(c) {
  const S = 32, [cv, g] = layer(S, S);
  g.fillStyle = 'rgb(0 0 0 / .28)'; g.beginPath(); g.ellipse(16, 27.5, 10, 3.6, 0, 0, TAU); g.fill();
  let gr = g.createLinearGradient(6, 12, 26, 28); gr.addColorStop(0, c[1]); gr.addColorStop(.45, c[0]); gr.addColorStop(1, c[2]);
  g.fillStyle = gr; g.beginPath(); g.roundRect(6.5, 13, 19, 15, 7.5); g.fill();
  gr = g.createRadialGradient(13, 7, 1, 16, 10.5, 9); gr.addColorStop(0, c[1]); gr.addColorStop(.55, c[0]); gr.addColorStop(1, c[2]);
  g.fillStyle = gr; circle(g, 16, 10.5, 8); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .85)'; circle(g, 13, 7.3, 2.1); g.fill();
  g.strokeStyle = 'rgb(0 0 0 / .18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(9, 13); g.quadraticCurveTo(16, 16.5, 23, 13); g.stroke();
  return cv;
}

function cannonSprite(gat) {
  const S = 80, [cv, g] = layer(S, S);
  g.fillStyle = 'rgb(0 0 0 / .25)'; g.beginPath(); g.ellipse(40, 70, 30, 8, 0, 0, TAU); g.fill();
  for (const x of [17, 63]) {   // rodas
    g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(x, 58, 9, 12, 0, 0, TAU); g.fill();
    g.fillStyle = '#7a5a40'; g.beginPath(); g.ellipse(x, 58, 5, 7.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#c9a070'; circle(g, x, 58, 2.4); g.fill();
  }
  let gr = g.createLinearGradient(0, 40, 0, 70); gr.addColorStop(0, '#b98552'); gr.addColorStop(1, '#6e4426');
  g.fillStyle = gr; g.beginPath(); g.roundRect(22, 42, 36, 24, 6); g.fill();
  g.strokeStyle = 'rgb(60 30 10 / .4)'; g.lineWidth = 1.5; for (const y of [50, 58]) { g.beginPath(); g.moveTo(24, y); g.lineTo(56, y); g.stroke(); }
  const metal = (x0, x1) => { const m = g.createLinearGradient(x0, 0, x1, 0); m.addColorStop(0, '#9ed2ff'); m.addColorStop(.35, '#4b8ff0'); m.addColorStop(1, '#173f9a'); return m; };
  if (!gat) {
    g.fillStyle = metal(27, 53); g.beginPath(); g.roundRect(27, 10, 26, 44, 11); g.fill();
    g.fillStyle = 'rgb(10 30 90 / .35)'; for (const y of [22, 34, 44]) g.fillRect(27, y, 26, 3);
    g.fillStyle = '#7fb8ff'; g.beginPath(); g.ellipse(40, 12, 14, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#0d2a66'; g.beginPath(); g.ellipse(40, 12, 9, 4.5, 0, 0, TAU); g.fill();
  } else {
    const xs = [24, 33, 42, 51];   // canos de trás e da frente
    for (const [i, x] of xs.entries()) {
      const y0 = i % 2 ? 8 : 4;
      g.fillStyle = metal(x - 6, x + 6); g.beginPath(); g.roundRect(x - 6 + 3, y0, 12, 46 - y0, 6); g.fill();
      g.fillStyle = '#0d2a66'; g.beginPath(); g.ellipse(x + 3, y0 + 3, 5, 2.6, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#c9d6e6'; for (const y of [20, 36]) { g.beginPath(); g.roundRect(20, y, 40, 5, 2.5); g.fill(); }
  }
  g.fillStyle = 'rgb(255 255 255 / .55)'; g.beginPath(); g.roundRect(31, 16, 4, 22, 2); g.fill();
  return cv;
}

function puffSprite() {
  const S = 64, [cv, g] = layer(S, S), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgb(255 255 255 / .95)'); gr.addColorStop(.6, 'rgb(230 236 245 / .7)'); gr.addColorStop(1, 'rgb(220 228 240 / 0)');
  g.fillStyle = gr; circle(g, 32, 32, 30); g.fill();
  return cv;
}

function ballSprite() {
  const S = 48, [cv, g] = layer(S, S), gr = g.createRadialGradient(18, 16, 2, 24, 24, 22);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.6, '#eaf1fa'); gr.addColorStop(1, '#b7c8de');
  g.fillStyle = gr; circle(g, 24, 24, 21); g.fill();
  g.strokeStyle = 'rgb(140 160 190 / .5)'; g.lineWidth = 1.5;
  for (const a of [.5, 2.4, 4.2]) { g.beginPath(); g.arc(24, 24, 12, a, a + 1); g.stroke(); }
  return cv;
}

function tileSprite(top, side, txt) {
  const w = 80, h = 56, [cv, g] = layer(w, h);
  g.fillStyle = side; g.beginPath(); g.roundRect(3, 12, w - 6, h - 14, 8); g.fill();
  const gr = g.createLinearGradient(0, 2, 0, 40); gr.addColorStop(0, '#fff'); gr.addColorStop(.12, top); gr.addColorStop(1, top);
  g.fillStyle = gr; g.beginPath(); g.roundRect(3, 2, w - 6, 40, 8); g.fill();
  g.font = `900 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = side; g.lineJoin = 'round'; g.strokeText(txt, w / 2, 23);
  g.fillStyle = '#fff'; g.fillText(txt, w / 2, 23);
  return cv;
}

// texto grosso com contorno (números, portão, avisos)
function bigText(g, txt, x, y, size, fill = '#fff', stroke = '#2a1650', lw = .2) {
  g.font = `900 ${Math.round(size)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size * lw; g.strokeStyle = stroke; g.strokeText(txt, x, y);
  g.fillStyle = fill; g.fillText(txt, x, y);
}
