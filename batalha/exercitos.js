'use strict';
// os dois exércitos. O vermelho é um bloco de colunas (cada coluna guarda quantos soldados tem; a frente
// "morde" onde a briga acontece) que vem descendo. O azul são pelotões (s = quantos soldados cada um vale)
// que sobem dos canhões, se multiplicam no portão e trocam 1 por 1 com o vermelho.

const RED_COLS = 38, RED_ROWS = 56, UNIT_SPEED = .42, CAP = 480;
let red = { cols: [], back: 1.6, speed: .01, total: 0, killed: 0 }, units = [], puffs = [], floats = [];

function newArmy(n, front, speed) {
  const w = Array.from({ length: RED_COLS }, (_, c) => 1 + .12 * Math.sin(c * 1.7) + .08 * Math.sin(c * .6 + 1));
  const sum = w.reduce((a, b) => a + b, 0);
  const cols = w.map(x => n * x / sum);
  const per = Math.max(1, Math.max(...cols) / RED_ROWS), dv = .0143;   // cada bonequinho vale "per" soldados
  red = { cols, back: front + RED_ROWS * dv, speed, total: n, killed: 0, per, dv };
  units = []; puffs = []; floats = [];
}

const colU = c => -1 + (c + .5) * 2 / RED_COLS;
const colOf = u => Math.max(0, Math.min(RED_COLS - 1, Math.floor((u + 1) / 2 * RED_COLS)));
const rowsOf = c => Math.ceil(red.cols[c] / red.per - .01);
const frontV = c => red.back - rowsOf(c) * red.dv + red.dv * .5;
const redAlive = () => red.total - red.killed;
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

// o vermelho se espalha pros buracos: coluna mais cheia passa gente pra vizinha (a massa anda junta)
function settleRed(dt) {
  const mean = red.cols.reduce((a, b) => a + b, 0) / RED_COLS, g = Math.min(1, dt * .9), k = Math.min(.5, dt * 2.5);
  red.cols = red.cols.map(a => a + (mean - a) * g);   // a massa toda se reorganiza devagar
  for (let pass = 0; pass < 2; pass++) for (let c = pass; c < RED_COLS - 1; c += 2) {   // e os vizinhos fecham buracos
    const d = (red.cols[c] - red.cols[c + 1]) * .5 * k;
    red.cols[c] -= d; red.cols[c + 1] += d;
  }
}

// a frente mais próxima dos canhões (pra saber se perdeu)
function redLowest() {
  let m = 9;
  red.cols.forEach((a, c) => { if (a > .5) m = Math.min(m, frontV(c)); });
  return m;
}

// ---------- azul ----------
function spawnUnit(u, v, s, opts = {}) {
  if (units.length >= CAP) {   // lotado: o reforço entra num pelotão que já existe
    const o = units[(Math.random() * units.length) | 0]; o.s += s; return;
  }
  units.push({ u, v, s, du: opts.du || 0, gated: !!opts.gated, ice: opts.ice || 0, fight: 0 });
}

function multiply(un, mult) {
  const total = un.s * mult, k = Math.max(1, Math.min(36, Math.round(total), CAP - units.length + 1));
  un.s = total / k; un.gated = true; un.ice = clock + .9; un.du = rand(-.3, .3);
  for (let i = 1; i < k; i++) {
    const u = Math.max(-.95, Math.min(.95, un.u + (i / k - .5) * .9 + rand(-.05, .05)));
    spawnUnit(u, un.v + rand(0, .035), total / k, { du: rand(-.2, .2), gated: true, ice: clock + .9 });
  }
}

function puff(u, v, size = 1) {
  if (puffs.length > 120) puffs.shift();
  puffs.push({ u: u + rand(-.03, .03), v, size: size * rand(.8, 1.3), born: clock, rot: rand(0, TAU) });
}

function floatText(txt, x, y, color = '#ffd23f', size = 1) { floats.push({ txt, x, y, color, size, born: clock }); }

// avança os pelotões; hooks: gate(un) -> mult|0, pile(un, prevV) -> true se bateu, boss(un) -> true se bateu
function updateUnits(dt, hooks) {
  let killedNow = 0;
  for (const un of units) {
    const prev = un.v, inLane = Math.abs(un.u) <= 1, c = colOf(un.u), a = inLane ? red.cols[c] : 0;
    const fv0 = frontV(c);
    if (a > .01 && un.v >= fv0 - .004) {   // na briga: troca 1 por 1 com a coluna
      const k = Math.min(un.s, a, Math.max(14, un.s * 3) * dt);
      un.s -= k; red.cols[c] -= k; red.killed += k; killedNow += k; un.fight = clock;
      if (Math.random() < dt * 9) puff(un.u, fv0, .8);
      continue;
    }
    un.v += UNIT_SPEED * dt;
    const lim = un.v > GATE_V - .02 && Math.abs(un.u) < WALL[1] ? .96 : 1.42;
    un.u = Math.max(-lim, Math.min(lim, un.u + un.du * dt)); un.du *= Math.pow(.25, dt);
    if (prev < GATE_V - .02 && un.v >= GATE_V - .02) {
      if (Math.abs(un.u) > WALL[0] && Math.abs(un.u) < WALL[1]) un.u = Math.sign(un.u) * .96;   // bateu no muro: escorrega pro portão
      if (hooks.pile(un)) { un.s = 0; continue; }
    }
    if (!un.gated && prev < GATE_V && un.v >= GATE_V) { const m = hooks.gate(un); if (m) multiply(un, m); }
    if (hooks.boss(un)) { un.s = 0; continue; }
    if (un.v > 1.25) un.s = 0;
  }
  units = units.filter(un => un.s > .02);
  return killedNow;
}

// ---------- desenho ----------
function drawRed(t, vMin = -1, vMax = 1.14) {
  const rows = red.cols.map((_, c) => rowsOf(c)), maxRows = Math.max(0, ...rows), spr = SPR.red, base = 2 / RED_COLS * P.wN * 1.75;
  for (let k = 0; k < maxRows; k++) {
    const v0 = red.back - k * red.dv;
    if (v0 > vMax || v0 < vMin) continue;
    for (let c = 0; c < RED_COLS; c++) {
      if (k >= rows[c]) continue;
      const u = colU(c) + (hash(c, k) - .5) * .035, v = v0 + (hash(k, c) - .5) * red.dv * .5;
      const [x, y, s] = proj(u, v), sz = base * s, bob = Math.abs(Math.sin(t * 9 + c * 1.3 + k * .7)) * sz * .08;
      ctx.drawImage(spr, x - sz / 2, y - sz * .85 - bob, sz, sz);
    }
  }
}

const CLUSTER = [[0, 0], [.5, .2], [-.5, .25], [.1, .5], [-.35, -.25], [.4, -.3]];
function drawUnits(t, vMin = -9, vMax = 9) {
  for (const un of units) {
    if (un.v <= vMin || un.v > vMax) continue;
    const [x, y, s] = proj(un.u, un.v), sz = 2 / RED_COLS * P.wN * 1.9 * s, n = Math.min(4, Math.ceil(un.s / 2));
    const spr = clock < un.ice ? SPR.ice : SPR.blue, step = Math.sin(t * 16 + un.u * 30) * sz * .06;
    for (let i = n - 1; i >= 0; i--) {
      const [ox, oy] = CLUSTER[i];
      ctx.drawImage(spr, x + ox * sz * .7 - sz / 2, y + oy * sz * .5 - sz * .85 + step, sz, sz);
    }
  }
}

function drawPuffs() {
  puffs = puffs.filter(p => clock - p.born < .6);
  for (const p of puffs) {
    const k = (clock - p.born) / .6, [x, y, s] = proj(p.u, p.v), sz = P.unit * 2.2 * s * p.size * (.6 + k);
    ctx.globalAlpha = 1 - k;
    ctx.drawImage(SPR.puff, x - sz / 2, y - sz * .7, sz, sz);
  }
  ctx.globalAlpha = 1;
}

function drawFloats() {
  floats = floats.filter(f => clock - f.born < 1.1);
  for (const f of floats) {
    const k = (clock - f.born) / 1.1, pop = k < .15 ? easeOutBack(k / .15) : 1;
    ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
    bigText(ctx, f.txt, f.x, f.y - k * P.wN * .35, P.wN * .2 * f.size * pop, f.color, '#5a2a00', .22);
  }
  ctx.globalAlpha = 1;
}
