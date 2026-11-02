// Batalha na neve (3D): junta lógica, modelos, partículas, câmera, som e o HUD desenhado no canvas 2D
// por cima do WebGL.
import * as THREE from '../comum/vendor/three.module.min.js';
import { initWorld, resizeWorld, lowerQuality, renderer, scene, camera, baseCam, baseLook, wx, wz, LW, GATE_V, BELT_U, FONT } from './mundo.js';
import { Troop, makeCannon, makeGate, makePile, setPlate, makeTiles, makeBoss } from './modelos.js';
import { Particles } from './efeitos3d.js';
import { S, fx, startLevel, step, setPhase, colU, rowsOf, redAlive, cannonSpots, clusterHalf, RED_COLS, RED_DV, BELT_SPACING } from './logica.js';

const VOZ = {
  vamos: 'Arraste o dedo pra mirar o canhão!', canhao: 'Mais canhões!', super: 'Super canhão!',
  chefe: 'Cuidado! O chefão chegou!', vitoria: 'Vitória!', derrota: 'Ah, não! Tente de novo!',
};
loadVoices(Object.keys(VOZ));
const talk = line => say(line, VOZ[line]);
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOutCubic = k => 1 - (1 - k) ** 3;
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

initWorld();
const redTroop = new Troop(RED_COLS * 112, '#d8121c', '#ee2a2a', { crest: '#ffcf33' });
const blueTroop = new Troop(2600, '#1f62e0', '#3f86f7', { crest: '#ffffff', tint: true });
const smoke = new Particles(500), sparks = new Particles(400, { additive: true, core: .12 }), snowBits = new Particles(300, { core: .6 });
const tiles1 = makeTiles('#2a8af0', '#1a5cb8', '+1', 80), tiles99 = makeTiles('#ffc928', '#c98800', '+99', 80);
let gate = null, pileModels = [], cannons = [], cannonsGat = null, bossModel = null, ts = 1, slowUntil = 0, shake = 0, floats = [], dragged = false, button = null, lastPop = 0, lastBoom = 0, lastBrush = 0;
const ICE = [3.2, 1.9, 1.15], NORMAL = [1, 1, 1];

// ---------- montagem da fase ----------
function buildLevel() {
  if (gate) scene.remove(gate);
  gate = makeGate('x' + S.cfg.gate); gate.position.set(0, 0, wz(GATE_V)); scene.add(gate);
  pileModels.forEach(m => scene.remove(m));
  pileModels = S.piles.map(p => { const m = makePile(p.reward); m.position.set(wx(p.side * BELT_U), 0, wz(GATE_V) + .4); m.scale.setScalar(1.7); scene.add(m); setPlate(m, p.hp); return m; });
  if (bossModel) { scene.remove(bossModel); bossModel = null; }
  syncCannons(true);
}

function syncCannons(force) {
  const want = S.player.n, gat = S.player.gat;
  if (!force && cannons.length === want && cannonsGat === gat) return;
  cannons.forEach(c => scene.remove(c));
  cannons = Array.from({ length: want }, () => { const c = makeCannon(gat); scene.add(c); return c; });
  for (const c of cannons) c.userData.dead = 0;
  cannonsGat = gat;
}

// ---------- eventos da lógica ----------
const W3 = (u, v, y = 0) => new THREE.Vector3(wx(u), y, wz(v));
function puffAt(u, v, n = 1, size = .9, y = .35) {
  for (let i = 0; i < n; i++) smoke.add({ x: wx(u) + rand(-.25, .25), y: y + rand(0, .3), z: wz(v) + rand(-.2, .2), vx: rand(-.4, .4), vy: rand(.4, 1.2), vz: rand(-.4, .4), size: size * rand(.7, 1.2), grow: 1.2, life: 1, decay: rand(1.4, 2), drag: .04, color: [1, 1, 1], a: .85 });
}

fx.on('level', () => { buildLevel(); });
fx.on('play', () => { if (S.level === 0) talk('vamos'); });
fx.on('fire', (i, u, v) => {
  const c = cannons[i];
  if (c) { c.userData.recoil = S.time; const p = c.position; sparks.add({ x: p.x, y: 1.7, z: p.z - 1.6, size: 1.4, life: .25, decay: 4, color: [1, .85, .45] }); smoke.add({ x: p.x, y: 1.7, z: p.z - 1.7, vy: .6, vz: -.8, size: .8, grow: 1.6, life: .7, decay: 1.6, drag: .05, a: .6 }); }
  if (S.time - lastBoom > .07) { lastBoom = S.time; boom(.55); }
});
fx.on('clash', (u, v) => {
  puffAt(u, v, 1, .7, .3);
  if (Math.random() < .3) sparks.add({ x: wx(u), y: .5, z: wz(v), vx: rand(-1, 1), vy: rand(1, 2), size: .35, life: .3, decay: 3.5, color: [1, .9, .7] });
});
fx.on('killed', () => { if (S.time - lastPop > .07) { lastPop = S.time; sfx.pop(); } });
fx.on('gate', u => {
  gate.userData.flash = S.time;
  for (let i = 0; i < 6; i++) sparks.add({ x: wx(u) + rand(-1.2, 1.2), y: rand(.3, 1.3), z: wz(GATE_V) - .4, vx: rand(-1, 1), vy: rand(.5, 2), vz: -rand(.5, 2), size: rand(.3, .55), life: .6, decay: 2, color: [.75, .6, 1] });
});
fx.on('pileHit', (p, u) => {
  const m = pileModels[S.piles.indexOf(p)];
  for (let i = 0; i < 2; i++) snowBits.add({ x: wx(u) + rand(-.4, .4), y: rand(.6, 1.6), z: wz(GATE_V) + .6, vx: rand(-2.5, 2.5), vy: rand(2, 4.5), vz: rand(.5, 3), grav: 12, size: rand(.18, .35), life: 1, decay: 1.1, color: [1, 1, 1] });
  if (S.time - lastBrush > .1) { lastBrush = S.time; sfx.brush(); }
  if (m) setPlate(m, p.hp);
});
fx.on('pileBreak', p => {
  const m = pileModels[S.piles.indexOf(p)], x = wx(p.side * BELT_U), z = wz(GATE_V);
  for (let i = 0; i < 30; i++) snowBits.add({ x: x + rand(-1, 1), y: rand(.5, 2), z: z + rand(-.5, 1), vx: rand(-5, 5), vy: rand(3, 8), vz: rand(-1, 4), grav: 14, size: rand(.25, .5), life: 1.4, decay: .8 });
  for (let i = 0; i < 10; i++) smoke.add({ x: x + rand(-1, 1), y: rand(.3, 1.5), z: z + rand(-.5, .5), vx: rand(-1.5, 1.5), vy: rand(.5, 2), size: rand(1.5, 2.5), grow: 2, life: 1, decay: 1, drag: .05, a: .9 });
  for (let i = 0; i < 16; i++) sparks.add({ x, y: 1, z, vx: rand(-4, 4), vy: rand(2, 6), vz: rand(-2, 3), grav: 6, size: rand(.3, .6), life: .9, decay: 1.4, color: [1, .9, .5] });
  if (m) { setPlate(m, 0); m.userData.breakAt = S.time; }
  shake = Math.max(shake, .35); sfx.boing(); sfx.chime(); boom(1.2);
  if (p.reward === 'cannon') talk('canhao');
  else { talk('super'); addFloat('SUPER CANHÃO!', W3(S.player.u, 0, 2.5), '#9fe0ff', 1.3); }
});
fx.on('pileRegen', p => { const m = pileModels[S.piles.indexOf(p)]; if (m) { m.userData.breakAt = 0; m.userData.regenAt = S.time; setPlate(m, p.hp); } });
fx.on('deliver', b => {
  const pos = W3(b.side * BELT_U, 0, 1.2);
  addFloat(b.kind === 'tile1' ? '+1' : '+99', pos, b.kind === 'tile1' ? '#9fd4ff' : '#ffd23f', 1.1);
  for (let i = 0; i < 12; i++) sparks.add({ x: pos.x, y: .6, z: pos.z, vx: rand(-3, 3), vy: rand(2, 5), vz: rand(-2, 2), grav: 6, size: rand(.3, .5), life: .8, decay: 1.4, color: b.kind === 'tile1' ? [.5, .8, 1] : [1, .85, .3] });
  if (b.kind === 'tile1') sfx.bell(PENTATONIC[Math.min(6, S.player.n % 7)] * 2); else sfx.chime();
});
fx.on('boss', () => { talk('chefe'); sfx.honk(); setTimeout(() => sfx.honk(), 260); setTimeout(() => growl(1.3), 500); shake = .5; });
fx.on('bossHit', (b, u) => {
  for (let i = 0; i < 3; i++) sparks.add({ x: wx(u) + rand(-.4, .4), y: rand(1, 3.5), z: wz(b.v) + 1, vx: rand(-2, 2), vy: rand(1, 3), vz: rand(0, 2), size: rand(.3, .6), life: .4, decay: 2.5, color: [1, .6, .4] });
});
fx.on('sweep', (b, n) => {
  shake = Math.max(shake, .45); sfx.whoosh(); boom(1.5);
  const x = wx(b.u), z = wz(b.v) + 2.2;
  for (let i = 0; i < 14; i++) smoke.add({ x: x + rand(-3.5, 3.5), y: .3, z: z + rand(-1, 1), vx: rand(-2, 2), vy: rand(.3, 1), size: rand(1, 1.8), grow: 1.5, life: 1, decay: 1.3, drag: .06, a: .8 });
  for (let i = 0; i < Math.min(30, n); i++) snowBits.add({ x: x + rand(-3, 3), y: .4, z: z + rand(-1, 1), vx: rand(-3, 3), vy: rand(3, 6), vz: rand(-1, 2), grav: 12, size: .3, life: 1, decay: 1.2, color: [.35, .55, 1] });
});
fx.on('bossDie', b => {
  slowUntil = S.time + 1.1; shake = 1;
  const x = wx(b.u), z = wz(b.v);
  for (let i = 0; i < 40; i++) smoke.add({ x: x + rand(-2, 2), y: rand(.5, 5), z: z + rand(-1.5, 1.5), vx: rand(-3, 3), vy: rand(0, 3), vz: rand(-2, 2), size: rand(1.5, 3), grow: 2.5, life: 1.3, decay: .8, drag: .05, a: .9 });
  for (let i = 0; i < 60; i++) sparks.add({ x, y: 3, z, vx: rand(-8, 8), vy: rand(2, 10), vz: rand(-6, 6), grav: 9, size: rand(.3, .8), life: 1.5, decay: .9, color: pick([[1, .85, .3], [1, .4, .4], [.6, .8, 1], [1, 1, 1]]) });
  sfx.boing(); boom(2); setTimeout(() => sfx.clap(8), 300);
});
fx.on('win', () => { talk('vitoria'); sfx.fanfare(); confettiRain(160); });
fx.on('lose', () => {
  talk('derrota'); sfx.blow(); shake = 1; boom(2);
  for (const c of cannons) {   // os canhões vão pelos ares
    const p = c.position;
    for (let i = 0; i < 8; i++) smoke.add({ x: p.x + rand(-.6, .6), y: rand(.3, 1.5), z: p.z + rand(-.6, .6), vx: rand(-2, 2), vy: rand(1, 3), size: rand(1.2, 2.2), grow: 2, life: 1.4, decay: .7, drag: .04, color: [.45, .45, .5], a: .9 });
    for (let i = 0; i < 10; i++) sparks.add({ x: p.x, y: 1, z: p.z, vx: rand(-5, 5), vy: rand(3, 8), vz: rand(-4, 4), grav: 10, size: rand(.4, .8), life: 1, decay: 1.1, color: [1, .55, .2] });
    c.userData.dead = S.time; c.userData.spin = rand(-6, 6);
  }
});

function addFloat(txt, pos, color, size = 1) { floats.push({ txt, pos, color, size, born: S.time }); }

// ---------- sons sintetizados ----------
function boom(power = 1) {
  const ac = sfx.ctx;
  if (!ac) return;
  const t = ac.currentTime, dur = .16 + .1 * power, n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  n.buffer = buf;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900 * power, t); lp.frequency.exponentialRampToValueAtTime(110, t + dur);
  const g = ac.createGain(); g.gain.value = .2 * power;
  n.connect(lp).connect(g).connect(ac.destination); n.start(t);
}
function growl(power = 1) {
  const ac = sfx.ctx;
  if (!ac) return;
  const t = ac.currentTime, dur = 1.1, o = ac.createOscillator(), lfo = ac.createOscillator(), am = ac.createGain(), depth = ac.createGain(), lp = ac.createBiquadFilter(), out = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(130, t + .3); o.frequency.exponentialRampToValueAtTime(55, t + dur);
  lfo.frequency.value = 24; depth.gain.value = .45; am.gain.value = .55; lfo.connect(depth).connect(am.gain);
  lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 3;
  out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(.3 * power, t + .08); out.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(am).connect(lp).connect(out).connect(ac.destination);
  o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
}

// ---------- desenho 3D por quadro ----------
function drawArmies(t) {
  const r = S.red;
  redTroop.begin();
  for (let c = 0; c < RED_COLS; c++) {
    const rows = rowsOf(c);
    for (let k = 0; k < rows; k++) {
      const v = r.back - k * RED_DV + (hash(k, c) - .5) * RED_DV * .5;
      if (v > 1.08) continue;
      const x = wx(colU(c) + (hash(c, k) - .5) * .03), bob = Math.abs(Math.sin(t * 9 + c * 1.3 + k * .7)) * .05;
      redTroop.put(x, wz(v), 1, bob);
    }
  }
  redTroop.end();
  blueTroop.begin();
  const OFF = [[0, 0], [.26, .12], [-.26, .14], [.06, .3], [-.2, -.2], [.22, -.22]];
  for (const un of S.units) {
    const n = Math.min(6, Math.ceil(un.s / 1.5)), x = wx(un.u), z = wz(un.v), tint = S.time < un.ice ? ICE : NORMAL, bob = Math.abs(Math.sin(t * 14 + un.id)) * .06;
    for (let i = 0; i < n; i++) blueTroop.put(x + OFF[i][0], z + OFF[i][1], 1, bob, tint);
  }
  blueTroop.end();
}

function drawCannons() {
  syncCannons(false);
  const spots = cannonSpots();
  cannons.forEach((c, i) => {
    const [u, v] = spots[i], rc = clamp01(1 - (S.time - (c.userData.recoil || -9)) / .12);
    c.position.set(wx(u), 0, wz(v) + 1.2);
    if (c.userData.dead) { const e = S.time - c.userData.dead; c.position.y = Math.max(0, 6 * e - 9 * e * e); c.rotation.z = c.userData.spin * Math.min(e, .8); }
    c.userData.barrels.position.z = rc * .25;
    c.scale.setScalar(1.45 * (1 + .06 * rc));
  });
}

function drawBelts() {
  for (const [mesh, b] of [[tiles1, S.belts[0]], [tiles99, S.belts[1]]]) {
    let i = 0;
    const m = new THREE.Matrix4();
    for (let k = 0; k < 80; k++) {
      const v = -.3 + k * BELT_SPACING - b.offset;
      if (v > 1.12) break;
      if (v < GATE_V + .01 && !b.started) continue;
      m.makeTranslation(wx(b.side * BELT_U), .3, wz(v)); mesh.setMatrixAt(i++, m);
    }
    mesh.count = i; mesh.instanceMatrix.needsUpdate = true;
  }
}

function drawPiles(t) {
  S.piles.forEach((p, i) => {
    const m = pileModels[i];
    if (!m) return;
    const u = m.userData, k = clamp01(p.hp / p.max), hit = clamp01(1 - (S.time - p.hitAt) / .1);
    const regen = u.regenAt ? easeOutBack(clamp01((S.time - u.regenAt) / .5)) : 1;
    u.balls.forEach((b, j) => {
      const keep = j < Math.max(2, Math.round(u.balls.length * k));
      b.visible = !p.broken && keep;
      b.position.x = [0, -.65, .65, -.35, .35, 0, -.75, .78, 0][j] + rand(-1, 1) * hit * .05;
    });
    m.scale.setScalar(1.7 * (p.broken ? 1 : regen));
    // o prêmio pula pra fora quando o monte quebra
    const e = u.breakAt ? S.time - u.breakAt : -1;
    u.prize.visible = !p.broken || e < 1.2;
    u.prize.position.y = .2 + (e > 0 ? Math.sin(Math.min(1, e / 1.2) * Math.PI) * 3 : 0);
    u.prize.rotation.y = e > 0 ? e * 9 : Math.sin(t * 2) * .2;
  });
}

function drawGate(t) {
  const u = gate.userData, f = clamp01(1 - (S.time - (u.flash || -9)) / .15);
  u.mat.emissiveIntensity = .55 + f * .9;
  u.shine.position.x = ((t * .45) % 1.4 - .7) * u.w;
}

function drawBoss(t) {
  const b = S.boss;
  if (!b) return;
  if (!bossModel) { bossModel = makeBoss(); bossModel.scale.setScalar(1.9); scene.add(bossModel); }
  const m = bossModel, u = m.userData, rise = easeOutBack(clamp01((S.time - b.bornAt) / .8));
  m.position.set(wx(b.u), (1 - rise) * 8, wz(b.v));
  u.legs[0].rotation.x = Math.sin(b.walk) * .45; u.legs[1].rotation.x = -Math.sin(b.walk) * .45;
  u.body.position.y = 2.1 + Math.abs(Math.sin(b.walk)) * .08;
  const sw = b.sweepAt ? clamp01(1 - (b.sweepAt - S.time) / .45) : clamp01(1 - (S.time - b.swingAt - .45) / .5);
  u.arm.rotation.x = -.35 - Math.sin(sw * Math.PI * .5) * 1.5 * (b.sweepAt ? 1 : clamp01(1 - (S.time - b.swingAt - .45) / .5));
  const flash = clamp01(1 - (S.time - b.hitAt) / .09) * .5;
  for (const mat of u.mats) { mat.emissive.setRGB(flash, flash * .9, flash * .9); }
  if (b.dead) {
    const e = clamp01((S.time - b.deadAt) / 1.4);
    m.rotation.x = e * 1.3; m.position.y = -e * 1.5; m.scale.setScalar(1.9 * (1 - e * .4));
    if (e >= 1) m.visible = false;
  }
}

function updateCamera(dt) {
  shake = Math.max(0, shake - dt * 1.6);
  const s = shake * shake * .6, follow = S.player.u * LW * .12;
  let zoom = 0;
  const intro = S.phase === 'intro' ? 1 - easeOutCubic(clamp01((S.time - S.phaseAt) / 1.6)) : 0;
  if (S.boss && !S.boss.dead) zoom = -clamp01((S.time - S.boss.bornAt) / 1) * clamp01(1 - (S.time - S.boss.bornAt - 1.4) / 1) * 2.5;   // aproxima quando o chefão chega
  camera.position.set(baseCam.x + follow + rand(-s, s), baseCam.y + rand(-s, s) + zoom * .4 + intro * 22, baseCam.z + zoom - intro * 14);
  camera.lookAt(baseLook.x + follow * .6, baseLook.y, baseLook.z);
}

// ---------- HUD 2D ----------
const v3 = new THREE.Vector3();
function toScreen(p) { v3.copy(p).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H, v3.z < 1]; }
function bigText(txt, x, y, size, fill = '#fff', stroke = '#2a1650', lw = .2) {
  ctx.font = `900 ${Math.round(size)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * lw; ctx.strokeStyle = stroke; ctx.strokeText(txt, x, y);
  ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}
const unit = () => Math.min(W, H * .62);

function drawHud(t) {
  const y = Math.max(28, meter.y), h = Math.max(30, unit() * .085), label = `FASE ${S.level + 1}`;
  ctx.font = `900 ${Math.round(h * .5)}px ${FONT}`;
  const w = ctx.measureText(label).width + h * .9, x = W - w - 12;
  ctx.fillStyle = 'rgb(20 30 60 / .6)'; ctx.beginPath(); ctx.roundRect(x, y - h / 2, w, h, h / 2); ctx.fill();
  bigText(label, x + w / 2, y + 1, h * .5, '#fff', '#1a2440', .15);
  const bw = Math.min(W * .48, 260), bh = h * .42, bx = W / 2 - bw / 2;
  const b = S.boss, bossOn = b && !b.dead, k = bossOn ? clamp01(b.hp / b.max) : clamp01(redAlive() / S.red.total);
  const pop = bossOn ? easeOutBack(clamp01((S.time - b.bornAt) / .5)) : 1;
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(pop, pop); ctx.translate(-W / 2, -y);
  ctx.fillStyle = 'rgb(15 15 30 / .7)'; ctx.beginPath(); ctx.roundRect(bx - 3, y - bh / 2 - 3, bw + 6, bh + 6, (bh + 6) / 2); ctx.fill();
  const gr = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2); gr.addColorStop(0, '#ff6b6b'); gr.addColorStop(1, '#d4141f');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(bx, y - bh / 2, Math.max(bh, bw * k), bh, bh / 2); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; ctx.beginPath(); ctx.roundRect(bx + 3, y - bh / 2 + 2, Math.max(0, bw * k - 6), bh * .3, bh * .15); ctx.fill();
  if (bossOn) { bigText(String(Math.ceil(b.hp)), W / 2, y + bh * 1.6, bh * 1.5, '#fff', '#1a0a14', .18); drawSkull(bx - bh * .4, y, bh * 1.5); }
  else bigText(String(Math.floor(redAlive())), W / 2, y + bh * 1.6, bh * 1.1, '#ffd0d0', '#3a0a14', .2);
  ctx.restore();
  if (!dragged && S.phase === 'play') {   // dica: dedo arrastando
    const [px, py] = toScreen(W3(S.player.u + Math.sin(t * 2.5) * .45, -.06)), size = Math.round(unit() * .14 / 4) * 4;
    ctx.drawImage(emojiSprite('👆', size), px - size * .4, py, size, size);
  }
}

function drawSkull(x, y, s) {
  ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(x, y - s * .05, s * .45, 0, TAU); ctx.fill();
  ctx.fillRect(x - s * .25, y + s * .2, s * .5, s * .22);
  ctx.fillStyle = '#1a0a14'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * s * .17, y - s * .05, s * .11, 0, TAU); ctx.fill(); }
}

function drawFloats() {
  floats = floats.filter(f => S.time - f.born < 1.2);
  for (const f of floats) {
    const k = (S.time - f.born) / 1.2, [x, y] = toScreen(f.pos), pop = k < .15 ? easeOutBack(k / .15) : 1;
    ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
    bigText(f.txt, x, y - k * unit() * .12, unit() * .09 * f.size * pop, f.color, '#3a1a00', .22);
  }
  ctx.globalAlpha = 1;
}

function drawBanner(t) {
  const e = S.time - S.phaseAt, k = easeOutBack(clamp01(e / .45)), U = unit();
  if (S.phase === 'intro') {
    ctx.globalAlpha = e > 1.3 ? clamp01((1.8 - e) / .5) : 1;
    bigText(`FASE ${S.level + 1}`, W / 2, H * .4, U * .16 * k, '#fff', '#1a3a8a', .16);
    ctx.globalAlpha = 1; return;
  }
  button = null;
  if (S.phase !== 'win' && S.phase !== 'lose') return;
  ctx.fillStyle = `rgb(10 20 50 / ${.5 * clamp01(e / .4)})`; ctx.fillRect(0, 0, W, H);
  const cy = H * .38, R = U * .22 * k;
  if (S.phase === 'win') {
    for (let i = 0; i < 3; i++) {
      const on = i < S.stars, k2 = easeOutBack(clamp01((e - .3 - i * .25) / .35)), sx = W / 2 + (i - 1) * R * .95, sy = cy - R * (i === 1 ? 1 : .72), sr = R * (i === 1 ? .42 : .3) * (on ? k2 : 1);
      ctx.fillStyle = '#8a6a2a'; star(ctx, sx, sy + 3, sr, -Math.PI / 2);
      ctx.fillStyle = on ? '#ffd23f' : '#5a5a6a'; star(ctx, sx, sy, sr, -Math.PI / 2 + Math.sin(t * 3 + i) * .12 * (on ? 1 : 0));
    }
    bigText('VITÓRIA!', W / 2, cy + R * .1, U * .13 * k, '#ffd23f', '#7a3a00', .16);
  } else {
    shield(W / 2, cy - R * .35, R * .85);
    bigText('DERROTA', W / 2, cy + R * .75, U * .12 * k, '#fff', '#3a1020', .16);
  }
  if (e > .8) {
    const bw = U * .62, bh = U * .14, by = cy + R * 1.8;
    button = { x: W / 2, y: by, w: bw, h: bh };
    const pulse = 1 + .04 * Math.sin(t * 5);
    ctx.save(); ctx.translate(W / 2, by); ctx.scale(pulse, pulse);
    ctx.fillStyle = S.phase === 'win' ? '#2f9a45' : '#c4212a'; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2 + 5, bw, bh, bh * .3); ctx.fill();
    ctx.fillStyle = S.phase === 'win' ? '#5ad16e' : '#ff5b52'; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh * .3); ctx.fill();
    bigText(S.phase === 'win' ? 'PRÓXIMA ▶' : 'DE NOVO ↻', 0, 0, bh * .48, '#fff', 'rgb(0 0 0 / .35)', .12);
    ctx.restore();
  }
}

function shield(x, y, r) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#8e99a8'; ctx.beginPath(); ctx.moveTo(-r, -r * .8); ctx.lineTo(r, -r * .8); ctx.lineTo(r * .85, r * .2); ctx.quadraticCurveTo(0, r * 1.1, -r * .85, r * .2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9d2de'; ctx.beginPath(); ctx.moveTo(-r * .8, -r * .65); ctx.lineTo(r * .8, -r * .65); ctx.lineTo(r * .68, r * .15); ctx.quadraticCurveTo(0, r * .88, -r * .68, r * .15); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = r * .07; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-r * .1, -r * .65); ctx.lineTo(r * .08, -r * .25); ctx.lineTo(-r * .12, r * .1); ctx.lineTo(r * .1, r * .5); ctx.stroke();
  ctx.restore();
}

// ---------- toques ----------
let drag = null;
function pxPerU() { const [a] = toScreen(W3(0, 0)), [b] = toScreen(W3(1, 0)); return Math.max(20, b - a); }
function onTap(x, y) {
  if (button && Math.abs(x - button.x) < button.w / 2 && Math.abs(y - button.y) < button.h / 2) { sfx.pop(); startLevel(S.phase === 'win' ? S.level + 1 : S.level); return; }
  drag = { x, u: S.player.target };
}
function onMove(x) {
  if (!drag) return;
  dragged = true;
  S.player.target = drag.u + (x - drag.x) / pxPerU() * 1.1;
}
function onUp() { drag = null; }

// ---------- ciclo ----------
function update(dt) {
  if (!started) return;
  ts = S.time < slowUntil ? .3 : Math.min(1, ts + dt * 2);
  step(dt * ts);
}

let perf = { n: 0, sum: 0 };
function render(t) {
  const raw = t - (render.last || t), dt = Math.min(.05, raw); render.last = t;
  // celular sofrendo (quadros acima de ~24ms por 2s seguidos): baixa a qualidade uma vez
  if (started && raw > 0 && raw < .5) { perf.n++; perf.sum += raw; if (perf.n >= 120) { if (perf.sum / perf.n > .024) lowerQuality(); perf = { n: 0, sum: 0 }; } }
  drawArmies(t); drawCannons(); drawBelts(); drawPiles(t); drawGate(t); drawBoss(t); updateCamera(dt);
  for (const p of [smoke, sparks, snowBits]) p.update(dt * ts, renderer.domElement.height);
  renderer.render(scene, camera);
  ctx.clearRect(0, 0, W, H);
  drawRings(); drawParticles(); drawFloats();
  if (started) { drawHud(t); drawBanner(t); }
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  resizeWorld(W, H, DPR);
}

startLevel(0);
boot({ resize, update, render, onTap, onMove, onUp, onCancel: onUp, onAmbient: () => {}, onStart() { setPhase('intro'); } });
window.__game = { S, startLevel, fast(sec) { for (let i = 0; i < sec * 30; i++) step(1 / 30); }, get button() { return button; }, set dragged(v) { dragged = v; } };
