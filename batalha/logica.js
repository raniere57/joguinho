// regras da batalha, em coordenadas (u, v). Não desenha nada: avisa os acontecimentos por fx.emit(...)
// pra quem cuida do 3D, do som e do HUD.
import { GATE_V, BELT_U, BELT_W, WALL } from './mundo.js';

export const RED_COLS = 38, RED_ROWS = 110, RED_DV = .0085, UNIT_SPEED = .42, CAP = 480, MAX_CANNONS = 16, BELT_SPACING = .036;
const FIRE_RATE = 1.6;

// gates: portões na linha do GATE_V. c = centro, half = meia largura (em u), amp/spd = vai e vem.
// O primeiro que cobre o soldado vale; "÷" ocupando a largura toda fica atrás do "x" que anda.
const G = (val, half = 1, amp = 0, spd = 0) => ({ op: 'x', val, c: 0, half, amp, spd });
const D = val => ({ op: '/', val, c: 0, half: 1, amp: 0, spd: 0 });
export const LEVELS = [
  { army: 9000, speed: .009, gates: [G(99)], piles: [5, 150], belt1: 6, belt99: 4, boss: 9000, bossAt: .55, bossSpeed: .017 },
  { army: 13000, speed: .0095, gates: [G(80, .55, .42, .6)], piles: [8, 220], belt1: 4, belt99: 4, boss: 9000, bossAt: .5, bossSpeed: .019 },
  { army: 15000, speed: .0095, gates: [G(70, .5, .5, .55), D(2)], piles: [12, 300], belt1: 3, belt99: 5, boss: 11000, bossAt: .45, bossSpeed: .021 },
  { army: 18000, speed: .01, gates: [G(60, .45, .55, .75), D(2)], piles: [16, 400], belt1: 3, belt99: 5, boss: 14000, bossAt: .42, bossSpeed: .023 },
  { army: 22000, speed: .0105, gates: [G(55, .4, .6, .95), D(3)], piles: [20, 520], belt1: 3, belt99: 6, boss: 11000, bossAt: .4, bossSpeed: .023 },
];
export const levelCfg = n => {
  if (n < LEVELS.length) return LEVELS[n];
  const b = LEVELS[LEVELS.length - 1], k = n - LEVELS.length + 1;
  return { ...b, army: Math.round(b.army * (1 + .14 * k)), speed: b.speed + .0004 * k, piles: [20 + 4 * k, 520 + 60 * k], gates: [G(Math.max(30, 55 - 3 * k), Math.max(.26, .36 - .02 * k), .64 + .03 * k, 1.05 + .08 * k), D(Math.min(5, 3 + (k >> 1)))], boss: Math.round(b.boss * (1 + .15 * k)), bossSpeed: b.bossSpeed + .001 * k };
};

const handlers = {};
export const fx = { on(ev, fn) { handlers[ev] = fn; }, emit(ev, ...a) { handlers[ev]?.(...a); } };

export const S = { phase: 'intro', phaseAt: 0, level: 0, cfg: LEVELS[0], gates: [], red: null, units: [], player: null, piles: [], belts: [], boss: null, time: 0, closest: 1, stars: 0 };
const now = () => S.time;
export const setPhase = p => { S.phase = p; S.phaseAt = now(); };

// ---------- exército vermelho ----------
export const colU = c => -1 + (c + .5) * 2 / RED_COLS;
const colOf = u => Math.max(0, Math.min(RED_COLS - 1, Math.floor((u + 1) / 2 * RED_COLS)));
export const rowsOf = c => Math.ceil(S.red.cols[c] / S.red.per - .01);
export const frontV = c => S.red.back - rowsOf(c) * RED_DV + RED_DV * .5;
export const redAlive = () => S.red.total - S.red.killed;

function newArmy(n, front, speed) {
  const w = Array.from({ length: RED_COLS }, (_, c) => 1 + .12 * Math.sin(c * 1.7) + .08 * Math.sin(c * .6 + 1));
  const sum = w.reduce((a, b) => a + b, 0), cols = w.map(x => n * x / sum);
  S.red = { cols, back: front + RED_ROWS * RED_DV, speed, total: n, killed: 0, per: Math.max(1, Math.max(...cols) / RED_ROWS) };
  S.units = [];
}

// o vermelho se reorganiza: a massa toda puxa pra média e os vizinhos fecham buracos
function settleRed(dt) {
  const r = S.red, mean = r.cols.reduce((a, b) => a + b, 0) / RED_COLS, g = Math.min(1, dt * .9), k = Math.min(.5, dt * 2.5);
  r.cols = r.cols.map(a => a + (mean - a) * g);
  for (let pass = 0; pass < 2; pass++) for (let c = pass; c < RED_COLS - 1; c += 2) {
    const d = (r.cols[c] - r.cols[c + 1]) * .5 * k; r.cols[c] -= d; r.cols[c + 1] += d;
  }
}

export function redLowest() {
  let m = 9;
  S.red.cols.forEach((a, c) => { if (a > .5) m = Math.min(m, frontV(c)); });
  return m;
}

// ---------- azul ----------
export function spawnUnit(u, v, s, opts = {}) {
  if (S.units.length >= CAP) { const o = S.units[(Math.random() * S.units.length) | 0]; o.s += s; return; }
  S.units.push({ u, v, s, du: opts.du || 0, gated: !!opts.gated, ice: opts.ice || 0, id: Math.random() * 1000, born: now(), leap: opts.leap || 0 });
}

function multiply(un, mult) {
  const total = un.s * mult, k = Math.max(1, Math.min(36, Math.round(total), CAP - S.units.length + 1));
  un.s = total / k; un.gated = true; un.ice = now() + .9; un.du = rand(-.3, .3);
  for (let i = 1; i < k; i++) {
    const u = Math.max(-.95, Math.min(.95, un.u + (i / k - .5) * .9 + rand(-.05, .05)));
    spawnUnit(u, un.v + rand(0, .035), total / k, { du: rand(-.2, .2), gated: true, ice: now() + .9 });
  }
  fx.emit('gate', un.u, S.gates.find(g => g.op === 'x'));
}

function updateUnits(dt) {
  const r = S.red; let killed = 0;
  for (const un of S.units) {
    const prev = un.v, inLane = Math.abs(un.u) <= 1, c = colOf(un.u), a = inLane ? r.cols[c] : 0, fv = frontV(c);
    if (a > .01 && un.v >= fv - .004) {   // na briga: 1 por 1
      const k = Math.min(un.s, a, Math.max(14, un.s * 3) * dt);
      un.s -= k; r.cols[c] -= k; r.killed += k; killed += k;
      if (Math.random() < dt * 7) fx.emit('clash', un.u, fv);
      continue;
    }
    un.v += UNIT_SPEED * dt;
    const lim = un.v > GATE_V - .02 && Math.abs(un.u) < WALL[1] ? .96 : BELT_U + BELT_W / 2;
    un.u = Math.max(-lim, Math.min(lim, un.u + un.du * dt)); un.du *= Math.pow(.25, dt);
    if (prev < GATE_V - .02 && un.v >= GATE_V - .02) {
      if (Math.abs(un.u) > WALL[0] && Math.abs(un.u) < WALL[1]) un.u = Math.sign(un.u) * .96;
      if (hitPile(un)) { un.s = 0; continue; }
    }
    if (!un.gated && prev < GATE_V && un.v >= GATE_V && Math.abs(un.u) <= 1) {
      const g = S.gates.find(g => Math.abs(un.u - g.c) <= g.half);
      if (g?.op === 'x') multiply(un, g.val);
      else if (g) { un.s /= g.val; un.gated = true; fx.emit('gateBad', un.u, g); }
    }
    if (hitBoss(un)) { un.s = 0; continue; }
    if (un.v > 1.25) un.s = 0;
  }
  S.units = S.units.filter(un => un.s > .02);
  if (killed > 0) fx.emit('killed', killed);
}

// ---------- fase ----------
// os capitães ganhos continuam na fase seguinte; repetir a fase volta com os que você tinha no começo dela
export function startLevel(n) {
  if (n !== S.level || !S.startN) S.startN = n === 0 ? 1 : Math.max(S.startN || 1, S.player?.n || 1);
  S.level = n; S.cfg = levelCfg(n);
  newArmy(S.cfg.army, .32, S.cfg.speed);
  S.player = { u: 0, target: 0, n: S.startN, gat: false, fireAcc: 0, recoil: [] };
  S.piles = [
    { side: -1, u0: -BELT_U - BELT_W / 2 - .02, u1: -WALL[0], hp: S.cfg.piles[0], max: S.cfg.piles[0], hitAt: -9, broken: false, brokeAt: 0, reward: 'cannon' },
    { side: 1, u0: WALL[0], u1: BELT_U + BELT_W / 2 + .02, hp: S.cfg.piles[1], max: S.cfg.piles[1], hitAt: -9, broken: false, brokeAt: 0, reward: 'gatling' },
  ];
  S.belts = [{ side: -1, kind: 'tile1', pending: 0, offset: 0, started: false }, { side: 1, kind: 'tile99', pending: 0, offset: 0, started: false }];
  S.boss = null; S.closest = 1; S.stars = 0;
  S.gates = S.cfg.gates.map(g => ({ ...g, ph: Math.random() * 6 }));
  setPhase('intro');
  fx.emit('level', n);
}

// ---------- canhões ----------
export function cannonSpots() {
  const out = [], { n, u } = S.player;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 4), inRow = Math.min(4, n - row * 4), col = i % 4;
    out.push([u + (col - (inRow - 1) / 2) * .24 + (row % 2) * .06, -.01 - row * .05]);
  }
  return out;
}
export const clusterHalf = () => (Math.min(4, S.player.n) - 1) / 2 * .24 + (S.player.n > 4 ? .06 : 0);

function fireCannons(dt) {
  const p = S.player, rate = Math.min(36, FIRE_RATE * (p.gat ? 2.4 : 1) * p.n);
  p.fireAcc += rate * dt;
  const spots = cannonSpots();
  while (p.fireAcc >= 1) {
    p.fireAcc -= 1;
    const i = (Math.random() * spots.length) | 0, [u, v] = spots[i];
    spawnUnit(u + rand(-.02, .02), v + .05, 1, { leap: 1 });
    p.recoil[i] = now();
    fx.emit('fire', i, u, v);
  }
}

// ---------- montes e esteiras ----------
function hitPile(un) {
  const p = S.piles.find(p => !p.broken && un.u >= p.u0 && un.u <= p.u1);
  if (!p) return false;
  p.hp -= un.s; p.hitAt = now();
  fx.emit('pileHit', p, un.u);
  if (p.hp <= 0) breakPile(p);
  return true;
}

function breakPile(p) {
  p.broken = true; p.hp = 0; p.brokeAt = now();
  S.belts[p.side < 0 ? 0 : 1].started = true;
  if (p.reward === 'cannon') { S.belts[0].pending += S.cfg.belt1; p.regenAt = now() + 12; }
  else { S.player.gat = true; S.belts[1].pending += S.cfg.belt99; }
  fx.emit('pileBreak', p);
}

function updateBelts(dt) {
  for (const b of S.belts) {
    if (b.pending <= 0) continue;
    b.offset += .4 * dt;
    if (b.offset >= BELT_SPACING) { b.offset -= BELT_SPACING; b.pending--; deliver(b); }
  }
  for (const p of S.piles) if (p.broken && p.regenAt && now() >= p.regenAt) { p.regenAt = 0; p.max = Math.round(p.max * 3); p.hp = p.max; p.broken = false; fx.emit('pileRegen', p); }
}

function deliver(b) {
  if (b.kind === 'tile1') { if (S.player.n < MAX_CANNONS) S.player.n++; }
  else for (let i = 0; i < 12; i++) spawnUnit(S.player.u + rand(-.3, .3), .03 + rand(0, .05), 99 / 12, { du: rand(-.2, .2), gated: true, ice: now() + .8 });
  fx.emit('deliver', b);
}

// ---------- chefão ----------
function updateBoss(dt) {
  const r = S.red;
  if (!S.boss) {
    if (r.killed >= r.total * S.cfg.bossAt || redAlive() < 1) {
      S.boss = { bornAt: now(), u: 0, v: .66, hp: S.cfg.boss, max: S.cfg.boss, hitAt: -9, dead: false, deadAt: 0, walk: 0, swingAt: now() + 1, sweepAt: 0 };
      fx.emit('boss', S.boss);
    }
    return;
  }
  const b = S.boss;
  if (b.dead) return;
  b.v -= S.cfg.bossSpeed * dt; b.walk += dt * 6;
  b.u += (Math.max(-.5, Math.min(.5, S.player.u)) - b.u) * dt * .3;
  if (now() - b.swingAt > 2.4) { b.swingAt = now(); b.sweepAt = now() + .45; }
  if (b.sweepAt && now() >= b.sweepAt) {   // golpe de lança: derruba os azuis da frente
    b.sweepAt = 0;
    const hit = S.units.filter(un => Math.abs(un.u - b.u) < .6 && un.v > b.v - .14 && un.v < b.v + .06);
    S.units = S.units.filter(un => !hit.includes(un));
    fx.emit('sweep', b, hit.length, hit);
  }
}

function hitBoss(un) {
  const b = S.boss;
  if (!b || b.dead || Math.abs(un.u - b.u) > .36 || un.v < b.v - .02) return false;
  b.hp -= un.s;
  if (now() - b.hitAt > .3) { b.hitAt = now(); fx.emit('bossHit', b, un.u); }
  if (b.hp <= 0) { b.dead = true; b.deadAt = now(); b.hp = 0; fx.emit('bossDie', b); }
  return true;
}

// ---------- passo da simulação ----------
export function step(dt) {
  S.time += dt;
  const p = S.player;
  const lim = 1.6 - clusterHalf();
  p.target = Math.max(-lim, Math.min(lim, p.target));
  p.u += (p.target - p.u) * Math.min(1, dt * 14);
  if (S.phase === 'intro' && now() - S.phaseAt > 1.8) { setPhase('play'); fx.emit('play'); }
  for (const g of S.gates) if (g.amp) g.c = Math.sin(now() * g.spd + g.ph) * g.amp;
  if (S.phase !== 'play') return;
  fireCannons(dt);
  S.red.back -= S.red.speed * dt;
  updateUnits(dt);
  settleRed(dt); updateBelts(dt); updateBoss(dt);
  const b = S.boss;
  S.closest = Math.min(S.closest, redLowest(), b && !b.dead ? b.v : 9);
  if (redLowest() <= .03 || (b && !b.dead && b.v <= .07)) { setPhase('lose'); fx.emit('lose'); }
  else if (redAlive() < 1 && b && b.dead && now() - b.deadAt > 1.6) { S.stars = S.closest > .45 ? 3 : S.closest > .25 ? 2 : 1; setPhase('win'); fx.emit('win'); }
}
