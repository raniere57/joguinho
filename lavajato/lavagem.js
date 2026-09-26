'use strict';
// a lavagem de um veículo: lama (apaga com a mangueira), espuma (esponja), enxágue e gotinhas (secador).
// Tudo em coordenadas locais do veículo (origem no chão, no meio). A lataria vira uma grade de
// células; cada passo termina quando o dedo já passou por quase todas.

const STEPS = ['agua', 'sabao', 'enxague', 'secar'];
const STEP_TEXT = {
  agua: 'Pega a mangueira! Passa o dedo pra tirar a lama!',
  sabao: 'Agora a espuma! Esfrega, esfrega!',
  enxague: 'Água de novo, pra tirar a espuma!',
  secar: 'Agora vamos secar!',
};
const COLS = 20, ROWS = 12;
const STEP_DONE = .8;            // fração da lataria que precisa ser tocada
const DROPS = 24;
const clamp01 = v => Math.min(Math.max(v, 0), 1);

const wash = { def: null, u: 0, lw: 0, lh: 0, ox: 0, oy: 0, mask: [], total: 0, mud: null, mudG: null, cells: new Set(), foam: [], drops: [], step: 0, clearAt: 0, progressAt: 0 };

// canvas da lataria: origem local (0, 0) fica em (ox, oy)
function washLayer() {
  const [c, g] = layer(wash.lw, wash.lh);
  g.translate(wash.ox, wash.oy);
  return [c, g];
}

function setupWash(def, u) {
  Object.assign(wash, { def, u, lw: Math.ceil(u * 1.04), lh: Math.ceil(u * (def.ratio + .04)), step: 0, clearAt: 0, foam: [], drops: [], cells: new Set(), progressAt: clock });
  wash.ox = wash.lw / 2; wash.oy = Math.ceil(u * (def.ratio + .02));
  // máscara: quais células caem em cima da lataria
  const [sil, sg] = washLayer();
  sg.fillStyle = '#000'; sg.beginPath(); def.body(sg, u); sg.fill();
  const data = sg.getImageData(0, 0, sil.width, sil.height).data;
  wash.mask = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const px = Math.floor((c + .5) / COLS * sil.width), py = Math.floor((r + .5) / ROWS * sil.height);
    if (data[(py * sil.width + px) * 4 + 3] > 128) wash.mask.push(r * COLS + c);
  }
  wash.total = wash.mask.length;
  // lama: manchas marrons só em cima da lataria
  [wash.mud, wash.mudG] = washLayer();
  const g = wash.mudG;
  for (let i = 0; i < 26; i++) {
    const [x, y] = cellCenter(pick(wash.mask)), r = u * rand(.035, .07);
    g.fillStyle = pick(['#8a5a35', '#7a4d2c', '#9b6a40']);
    for (let k = 0; k < 4; k++) { circle(g, x + rand(-r, r), y + rand(-r, r) * .7, r * rand(.5, 1)); g.fill(); }
    if (Math.random() < .5) { g.beginPath(); g.ellipse(x, y + r, r * .18, r * .9, 0, 0, TAU); g.fill(); }   // escorrido
  }
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#000'; g.beginPath(); def.body(g, u); g.fill();
  g.globalCompositeOperation = 'destination-out';
}

function cellCenter(i) {
  const c = i % COLS, r = Math.floor(i / COLS);
  return [(c + .5) / COLS * wash.lw - wash.ox, (r + .5) / ROWS * wash.lh - wash.oy];
}

function cellAt(x, y) {
  const c = Math.floor((x + wash.ox) / wash.lw * COLS), r = Math.floor((y + wash.oy) / wash.lh * ROWS);
  return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : -1;
}

function onBody(x, y) { const i = cellAt(x, y); return i >= 0 && wash.mask.includes(i); }

// marca as células perto do dedo; devolve quantas eram novas
function touchCells(x, y, rad) {
  let fresh = 0;
  for (const i of wash.mask) {
    const [cx, cy] = cellCenter(i);
    if (Math.hypot(cx - x, cy - y) < rad && !wash.cells.has(i)) { wash.cells.add(i); fresh++; }
  }
  if (fresh) wash.progressAt = clock;
  return fresh;
}

const stepName = () => STEPS[wash.step];
const washProgress = () => wash.total ? wash.cells.size / wash.total : 0;

// o dedo passou em (x, y) no veículo com a ferramenta do passo atual
function washAt(x, y) {
  if (wash.clearAt || wash.step >= STEPS.length) return;
  const u = wash.u, rad = u * .08;
  switch (stepName()) {
    case 'agua':
      wash.mudG.beginPath(); circle(wash.mudG, x, y, rad); wash.mudG.fill();
      touchCells(x, y, rad * 1.3);
      break;
    case 'sabao':
      if (onBody(x, y) && !wash.foam.some(f => Math.hypot(f.x - x, f.y - y) < u * .035)) wash.foam.push({ x, y, r: u * rand(.035, .06), born: clock });
      if (touchCells(x, y, rad * 1.2) && Math.random() < .3) floatBubble(x, y);
      break;
    case 'enxague': {
      const before = wash.foam.length;
      wash.foam = wash.foam.filter(f => Math.hypot(f.x - x, f.y - y) > rad);
      if (wash.foam.length < before) popAt(x, y);
      touchCells(x, y, rad * 1.3);
      break;
    }
    case 'secar': {
      const hit = wash.drops.filter(d => !d.gone && Math.hypot(d.x - x, d.y - y) < rad * 1.3);
      for (const d of hit) { d.gone = clock; popAt(d.x, d.y); }
      if (hit.length) wash.progressAt = clock;
      break;
    }
  }
  if (stepProgress() >= STEP_DONE) finishStep();
}

function stepProgress() {
  if (stepName() === 'secar') return wash.drops.filter(d => d.gone).length / wash.drops.length;
  return washProgress();
}

// passo quase pronto: o resto some sozinho e vem o próximo
function finishStep() {
  wash.clearAt = clock;
  const name = stepName();
  if (name === 'sabao') {   // completa a espuma onde faltou
    for (const i of wash.mask) if (!wash.cells.has(i)) { const [x, y] = cellCenter(i); wash.foam.push({ x, y, r: wash.u * rand(.035, .06), born: clock + rand(0, .3) }); }
  }
  if (name === 'enxague') for (const f of wash.foam) f.popAt = clock + rand(0, .4);
  if (name === 'secar') for (const d of wash.drops) if (!d.gone) d.gone = clock + rand(0, .3);
  sfx.bell(659 + wash.step * 130);
  stepDone(name);
}

function nextStep() {
  wash.step++; wash.clearAt = 0; wash.cells = new Set(); wash.progressAt = clock;
  if (stepName() === 'enxague') wash.mud = null;
  if (stepName() === 'secar') {
    wash.foam = [];
    wash.drops = Array.from({ length: DROPS }, () => { const [x, y] = cellCenter(pick(wash.mask)); return { x: x + rand(-8, 8), y: y + rand(-6, 6), r: wash.u * rand(.012, .02), gone: 0 }; });
  }
}

function updateWash() {
  if (!wash.clearAt || clock - wash.clearAt < .7) return;
  if (stepName() === 'enxague') wash.foam = [];
  nextStep();
  stepStarted(stepName());
}

// ---------- desenho (dentro do translate do veículo) ----------
function drawMud() {
  if (!wash.mud) return;
  const fade = stepName() === 'agua' && wash.clearAt ? clamp01(1 - (clock - wash.clearAt) / .6) : stepName() === 'agua' ? 1 : 0;
  if (!fade) return;
  ctx.globalAlpha = .92 * fade;
  ctx.drawImage(wash.mud, -wash.ox, -wash.oy, wash.lw, wash.lh);
  ctx.globalAlpha = 1;
}

function drawFoam() {
  for (const f of wash.foam) {
    let k = easeOutBack(clamp01((clock - f.born) / .25));
    if (f.popAt) k *= clamp01(1 - (clock - f.popAt) / .2);
    if (k <= 0) continue;
    ctx.fillStyle = '#fff'; circle(ctx, f.x, f.y, f.r * k); ctx.fill();
    ctx.fillStyle = 'rgb(190 225 255 / .75)'; circle(ctx, f.x + f.r * .25, f.y + f.r * .25, f.r * .45 * k); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, f.x - f.r * .3, f.y - f.r * .3, f.r * .18 * k); ctx.fill();
  }
}

function drawDrops(t) {
  for (const d of wash.drops) {
    const k = d.gone ? clamp01(1 - (clock - d.gone) / .25) : 1;
    if (k <= 0) continue;
    const y = d.y + Math.sin(t * 2 + d.x) * 1.5, r = d.r * k;
    ctx.fillStyle = 'rgb(140 205 255 / .85)';
    ctx.beginPath(); ctx.moveTo(d.x, y - r * 1.6); ctx.quadraticCurveTo(d.x + r * 1.1, y, d.x, y + r); ctx.quadraticCurveTo(d.x - r * 1.1, y, d.x, y - r * 1.6); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .8)'; circle(ctx, d.x - r * .3, y - r * .2, r * .3); ctx.fill();
  }
}
