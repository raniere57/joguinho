'use strict';
// Batalha na neve: arraste pra mexer o canhão. Ele atira soldadinhos azuis sem parar; quem passa no portão
// roxo se multiplica e vai brigar com o exército vermelho (1 por 1). Dos lados, montes de neve com número:
// o da esquerda solta a esteira de "+1" (mais canhões), o da direita vira metralhadora e solta "+99".
// Depois de um tanto do exército, vem o chefão. Se o vermelho (ou o chefão) chegar nos canhões, perdeu.

const LEVELS = [
  { army: 9000, speed: .009, gate: 99, piles: [5, 150], belt1: 6, belt99: 4, boss: 9000, bossAt: .55, bossSpeed: .017 },
  { army: 14000, speed: .010, gate: 80, piles: [6, 200], belt1: 6, belt99: 4, boss: 8000, bossAt: .5, bossSpeed: .02 },
  { army: 20000, speed: .011, gate: 60, piles: [8, 380], belt1: 7, belt99: 5, boss: 12000, bossAt: .45, bossSpeed: .023 },
  { army: 28000, speed: .012, gate: 50, piles: [10, 520], belt1: 7, belt99: 5, boss: 17000, bossAt: .4, bossSpeed: .026 },
  { army: 38000, speed: .013, gate: 40, piles: [12, 700], belt1: 8, belt99: 6, boss: 24000, bossAt: .35, bossSpeed: .03 },
];
const levelCfg = n => {
  if (n < LEVELS.length) return LEVELS[n];
  const b = LEVELS[LEVELS.length - 1], k = n - LEVELS.length + 1;
  return { ...b, army: Math.round(b.army * (1 + .3 * k)), speed: b.speed + .002 * k, boss: Math.round(b.boss * (1 + .3 * k)), bossSpeed: b.bossSpeed + .003 * k };
};
const FIRE_RATE = 1.6, MAX_CANNONS = 16, BELT_SPACING = .042;

const VOZ = {
  vamos: 'Arraste o dedo pra mirar o canhão!', canhao: 'Mais canhões!', super: 'Super canhão!',
  chefe: 'Cuidado! O chefão chegou!', vitoria: 'Vitória!', derrota: 'Ah, não! Tente de novo!',
};
loadVoices(Object.keys(VOZ));

let phase = 'intro', phaseAt = 0, level = 0, cfg = LEVELS[0];
let player = { u: 0, target: 0, n: 1, gat: false, fireAcc: 0, recoil: [] }, drag = null;
let shakeAt = -9, piles = [], belts = [], boss = null, gateFlash = -9, lastFire = 0, lastHitSnd = 0, lastPop = 0, button = null, dragged = false;

const talk = line => say(line, VOZ[line]);
const setPhase = p => { phase = p; phaseAt = clock; button = null; };
const clamp01 = x => Math.max(0, Math.min(1, x));

// ---------- fase ----------
function startLevel(n) {
  level = n; cfg = levelCfg(n);
  newArmy(cfg.army, .32, cfg.speed);
  player = { u: 0, target: 0, n: 1, gat: false, fireAcc: 0, recoil: [] };
  piles = [
    { side: -1, u0: -BELT_U - BELT_W / 2 - .02, u1: -WALL[0], hp: cfg.piles[0], max: cfg.piles[0], hitAt: -9, broken: false, reward: 'cannon' },
    { side: 1, u0: WALL[0], u1: BELT_U + BELT_W / 2 + .02, hp: cfg.piles[1], max: cfg.piles[1], hitAt: -9, broken: false, reward: 'gatling' },
  ];
  belts = [{ side: -1, kind: 'tile1', pending: 0, offset: 0, arriveAt: -9 }, { side: 1, kind: 'tile99', pending: 0, offset: 0, arriveAt: -9 }];
  boss = null;
  setPhase('intro');
}

// ---------- canhões ----------
function cannonSpots() {
  const out = [], n = player.n;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 4), inRow = Math.min(4, n - row * 4), col = i % 4;
    out.push([player.u + (col - (inRow - 1) / 2) * .16 + (row % 2) * .04, -.005 - row * .034]);
  }
  return out;
}

function fireCannons(dt) {
  const rate = Math.min(16, FIRE_RATE * (player.gat ? 2.4 : 1) * player.n);
  player.fireAcc += rate * dt;
  const spots = cannonSpots();
  while (player.fireAcc >= 1) {
    player.fireAcc -= 1;
    const i = (Math.random() * spots.length) | 0, [u, v] = spots[i];
    spawnUnit(u + rand(-.02, .02), v + .06, 1);
    player.recoil[i] = clock;
    if (clock - lastFire > .08) { lastFire = clock; boom(.6); }
  }
}

// ---------- montes de neve e esteiras ----------
function hitPile(un) {
  const p = piles.find(p => !p.broken && un.u >= p.u0 && un.u <= p.u1);
  if (!p) return false;
  p.hp -= un.s; p.hitAt = clock;
  const [x, y, s] = proj(un.u, GATE_V - .03);
  for (let i = 0; i < 3; i++) addParticle({ x, y: y - P.unit * s, vx: rand(-90, 90) * s, vy: -rand(80, 220) * s, life: 1, decay: 1.8, size: rand(1.5, 3.5) * s, color: pick(['#fff', '#e3ecf7', '#c9d8ea']), star: false, rot: 0, vr: 0 });
  if (clock - lastHitSnd > .12) { lastHitSnd = clock; sfx.brush(); }
  if (p.hp <= 0) breakPile(p);
  return true;
}

function breakPile(p) {
  p.broken = true; p.hp = 0;
  const [x, y, s] = proj((p.u0 + p.u1) / 2, GATE_V);
  burst(x, y - P.unit * 2 * s, P.unit * 3 * s, 200, 26);
  for (let i = 0; i < 6; i++) puff((p.u0 + p.u1) / 2 + rand(-.15, .15), GATE_V, 1.6);
  sfx.boing(); sfx.chime();
  belts[p.side < 0 ? 0 : 1].started = true;
  if (p.reward === 'cannon') { belts[0].pending += cfg.belt1; talk('canhao'); setTimeout(() => regenPile(p), 12000); }
  else { player.gat = true; belts[1].pending += cfg.belt99; talk('super'); floatText('SUPER!', P.cx, P.y0 - P.wN * .5, '#9fe0ff', 1.3); }
}

function regenPile(p) {
  if (phase !== 'play' || p.reward !== 'cannon') return;
  p.max = Math.round(p.max * 3); p.hp = p.max; p.broken = false;
}

function updateBelts(dt) {
  const spacing = BELT_SPACING;
  for (const b of belts) {
    if (b.pending <= 0) continue;
    b.offset += .45 * dt;
    if (b.offset >= spacing) { b.offset -= spacing; b.pending--; deliver(b); }
  }
}

function deliver(b) {
  b.arriveAt = clock;
  const [x, y] = proj(b.side * BELT_U, 0);
  if (b.kind === 'tile1') {
    if (player.n < MAX_CANNONS) player.n++;
    floatText('+1', x, y - P.unit * 2);
    sfx.bell(PENTATONIC[Math.min(6, player.n % 7)] * 2);
    burst(x, y, P.unit * 2, 45, 10);
  } else {
    floatText('+99', x, y - P.unit * 2);
    sfx.chime();
    for (let i = 0; i < 12; i++) spawnUnit(player.u + rand(-.3, .3), .03 + rand(0, .05), 99 / 12, { du: rand(-.2, .2), gated: true, ice: clock + .8 });
  }
}

// ---------- chefão ----------
function spawnBoss() {
  boss = { bornAt: clock, u: 0, v: .7, hp: cfg.boss, max: cfg.boss, hitAt: -9, dead: false, deadAt: 0, walk: 0, swingAt: clock, sweepAt: 0 };
  talk('chefe'); sfx.honk(); setTimeout(() => sfx.honk(), 260);
}

function hitBoss(un) {
  if (!boss || boss.dead || Math.abs(un.u - boss.u) > .36 || un.v < boss.v - .02) return false;
  boss.hp -= un.s; if (clock - boss.hitAt > .22) boss.hitAt = clock;
  if (Math.random() < .3) puff(un.u, boss.v, .7);
  if (boss.hp <= 0) killBoss();
  return true;
}

function killBoss() {
  boss.dead = true; boss.deadAt = clock; boss.hp = 0;
  const [x, y, s] = proj(boss.u, boss.v);
  for (let i = 0; i < 14; i++) puff(boss.u + rand(-.3, .3), boss.v + rand(0, .05), 2);
  burst(x, y - P.wN * .8 * s, P.wN * .5 * s, 30, 40);
  sfx.boing(); sfx.clap(6);
}

function updateBoss(dt) {
  if (!boss) { if (red.killed >= red.total * cfg.bossAt || redAlive() < 1) spawnBoss(); return; }
  if (boss.dead) return;
  boss.v -= cfg.bossSpeed * dt; boss.walk += dt * 7;
  boss.u += (Math.max(-.5, Math.min(.5, player.u)) - boss.u) * dt * .3;
  if (clock - boss.swingAt > 2.4) { boss.swingAt = clock; boss.sweepAt = clock + .3; }
  if (boss.sweepAt && clock >= boss.sweepAt) {   // golpe de lança: derruba os azuis da frente
    boss.sweepAt = 0; shakeAt = clock; sfx.whoosh(); boom(1.4);
    units = units.filter(un => {
      const hit = Math.abs(un.u - boss.u) < .6 && un.v > boss.v - .14 && un.v < boss.v + .06;
      if (hit && Math.random() < .3) puff(un.u, un.v, 1.2);
      return !hit;
    });
  }
}

// estrondo do canhão: ruído grave curtinho
function boom(power = 1) {
  const ac = sfx.ctx;
  if (!ac) return;
  const t = ac.currentTime, dur = .16 + .1 * power, n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  n.buffer = buf;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900 * power, t); lp.frequency.exponentialRampToValueAtTime(120, t + dur);
  const g = ac.createGain(); g.gain.value = .22 * power;
  n.connect(lp).connect(g).connect(ac.destination); n.start(t);
}

// ---------- partida ----------
function update(dt) {
  if (!started) return;
  if (phase === 'intro' && clock - phaseAt > 1.6) { setPhase('play'); if (level === 0) talk('vamos'); }
  if (phase === 'play' || phase === 'intro') {
    const lim = 1.42 - clusterHalf();
    player.target = Math.max(-lim, Math.min(lim, player.target));
    player.u += (player.target - player.u) * Math.min(1, dt * 14);
    if (phase === 'play') {
      fireCannons(dt);
      red.back -= red.speed * dt;
      const killed = updateUnits(dt, { gate: un => Math.abs(un.u) <= 1 ? (gateFlash = clock, cfg.gate) : 0, pile: hitPile, boss: hitBoss });
      if (killed > 0 && clock - lastPop > .07) { lastPop = clock; sfx.pop(); }
      settleRed(dt); updateBelts(dt); updateBoss(dt);
      if (redLowest() <= .03 || (boss && !boss.dead && boss.v <= .07)) lose();
      else if (redAlive() < 1 && boss && boss.dead && clock - boss.deadAt > 1.3) win();
    }
  }
}

function win() {
  setPhase('win'); talk('vitoria'); sfx.fanfare(); confettiRain(140);
}
function lose() {
  setPhase('lose'); talk('derrota'); sfx.blow();
  for (let i = 0; i < 10; i++) puff(player.u + rand(-.3, .3), rand(-.1, .1), 2);
}

// ---------- toques ----------
function onTap(x, y) {
  if (button && Math.abs(x - button.x) < button.w / 2 && Math.abs(y - button.y) < button.h / 2) {
    sfx.pop();
    startLevel(phase === 'win' ? level + 1 : level);
    return;
  }
  drag = { x, u: player.target };
}
function onMove(x) {
  if (!drag) return;
  dragged = true;
  const lim = 1.42 - clusterHalf();
  player.target = Math.max(-lim, Math.min(lim, drag.u + (x - drag.x) / P.wN * 1.15));
}
function onUp() { drag = null; }
// o grupo de canhões não pode sair da tela
function clusterHalf() { return (Math.min(4, player.n) - 1) / 2 * .16 + (player.n > 4 ? .04 : 0); }

// ---------- desenho ----------
function drawBelts(t) {
  const spacing = BELT_SPACING;
  for (const b of belts) {
    const spr = SPR[b.kind];
    for (let k = 40; k >= 0; k--) {
      const vv = -.25 + k * spacing - b.offset;
      if (vv > 1.3 || (vv < GATE_V - .02 && !b.started)) continue;
      const [x0] = proj(b.side * BELT_U - BELT_W * .5, vv), [x1, y] = proj(b.side * BELT_U + BELT_W * .5, vv);
      const w = (x1 - x0) * .9, h = w * .7;
      ctx.drawImage(spr, (x0 + x1) / 2 - w / 2, y - h * .6, w, h);
    }
    ctx.globalAlpha = 1;
    const k = clamp01(1 - (clock - b.arriveAt) / .4);
    if (k > 0) { const [x, y, s] = proj(b.side * BELT_U, 0); ctx.fillStyle = `rgb(255 240 150 / ${.6 * k})`; circle(ctx, x, y, P.unit * 3 * s * (1.5 - k * .5)); ctx.fill(); }
  }
}

function drawGate(t) {
  const half = 1, v0 = GATE_V, a = proj(-half, v0), b = proj(half, v0), c = proj(half, v0 + .03), d = proj(-half, v0 + .03);
  const th = P.wN * .2 * a[2], flash = clamp01(1 - (clock - gateFlash) / .15);
  ctx.fillStyle = 'rgb(60 0 120 / .25)'; ctx.beginPath(); ctx.ellipse((a[0] + b[0]) / 2, a[1] + th * .2, (b[0] - a[0]) * .55, th * .5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c38cff'; ctx.beginPath(); ctx.moveTo(d[0], d[1] - th); ctx.lineTo(c[0], c[1] - th); ctx.lineTo(b[0], b[1] - th); ctx.lineTo(a[0], a[1] - th); ctx.fill();
  const gr = ctx.createLinearGradient(0, a[1] - th, 0, a[1]); gr.addColorStop(0, flash > 0 ? '#d9b8ff' : '#9a4dff'); gr.addColorStop(1, '#6a1fd1');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(a[0], a[1] - th, b[0] - a[0], th, th * .25); ctx.fill();
  const sx = a[0] + ((t * .6) % 1.4 - .2) * (b[0] - a[0]);   // brilho correndo
  ctx.save(); ctx.beginPath(); ctx.roundRect(a[0], a[1] - th, b[0] - a[0], th, th * .25); ctx.clip();
  ctx.fillStyle = 'rgb(255 255 255 / .28)'; ctx.beginPath(); ctx.moveTo(sx, a[1] - th); ctx.lineTo(sx + th * .8, a[1] - th); ctx.lineTo(sx + th * .3, a[1]); ctx.lineTo(sx - th * .5, a[1]); ctx.fill();
  ctx.restore();
  bigText(ctx, 'x' + cfg.gate, (a[0] + b[0]) / 2, a[1] - th * .48, th * 1.05, '#fff', '#3a0a7a', .22);
}

function drawPile(p, t) {
  const uc = (p.u0 + p.u1) / 2, [x, y, s] = proj(uc, GATE_V - .01), R = P.wN * .27 * s;
  if (p.broken) { drawPlate(p, x, y + R * .1, R); return; }
  const sh = clamp01(1 - (clock - p.hitAt) / .1) * R * .06, k = .35 + .65 * clamp01(p.hp / p.max);
  ctx.drawImage(p.reward === 'cannon' ? SPR.cannon : SPR.gatling, x - R * .85, y - R * 1.75, R * 1.7, R * 1.7);   // o prêmio escondido
  const balls = [[0, -.55, 1], [-.55, -.45, .8], [.55, -.42, .8], [-.3, -1.05, .75], [.32, -1.02, .75], [0, -1.35, .62], [-.62, -.95, .55], [.65, -.9, .55]];
  const n = Math.max(2, Math.round(balls.length * k));
  for (let i = 0; i < n; i++) {
    const [bx, by, br] = balls[i], rr = R * br * (.75 + .25 * k);
    ctx.drawImage(SPR.ball, x + bx * R + rand(-sh, sh) - rr, y + by * R * (.7 + .3 * k) - rr, rr * 2, rr * 2);
  }
  drawPlate(p, x, y + R * .1, R);
}

function drawPlate(p, x, y, R) {
  const pw = R * 1.9, ph = R * .58;
  ctx.fillStyle = '#3d4554'; ctx.beginPath(); ctx.roundRect(x - pw / 2, y, pw, ph, ph * .22); ctx.fill();
  ctx.fillStyle = '#5c6677'; ctx.beginPath(); ctx.roundRect(x - pw / 2, y, pw, ph * .78, ph * .22); ctx.fill();
  bigText(ctx, String(Math.max(0, Math.ceil(p.hp))), x, y + ph * .4, ph * .72, '#fff', '#262c38', .18);
}

function drawCannons(t) {
  const spots = cannonSpots().map((p, i) => [...p, i]).sort((a, b) => b[1] - a[1]);
  for (const [u, v, i] of spots) {
    const [x, y, s] = proj(u, v), sz = P.wN * .5 * s, rc = clamp01(1 - (clock - (player.recoil[i] || -9)) / .12) * sz * .06;
    ctx.drawImage(player.gat ? SPR.gatling : SPR.cannon, x - sz / 2, y - sz * .82 + rc, sz, sz);
    const fl = clamp01(1 - (clock - (player.recoil[i] || -9)) / .09);
    if (fl > 0) { ctx.globalAlpha = fl; ctx.drawImage(SPR.puff, x - sz * .3, y - sz * 1.05, sz * .6, sz * .6); ctx.fillStyle = 'rgb(255 230 120 / .9)'; circle(ctx, x, y - sz * .72, sz * .1 * fl); ctx.fill(); ctx.globalAlpha = 1; }
  }
}

function drawHud(t) {
  const y = Math.max(28, meter.y), h = Math.max(30, P.wN * .2), label = `FASE ${level + 1}`;
  ctx.font = `900 ${Math.round(h * .5)}px ${FONT}`;
  const w = ctx.measureText(label).width + h * .9, x = W - w - 12;
  ctx.fillStyle = 'rgb(20 30 60 / .6)'; ctx.beginPath(); ctx.roundRect(x, y - h / 2, w, h, h / 2); ctx.fill();
  bigText(ctx, label, x + w / 2, y + 1, h * .5, '#fff', '#1a2440', .15);
  if (boss && !boss.dead) { drawBossBar(boss, y); return drawHint(t); }
  // quanto do exército vermelho ainda falta
  const bw = Math.min(W * .42, 220), bh = h * .34, bx = W / 2 - bw / 2, k = clamp01(redAlive() / red.total);
  ctx.fillStyle = 'rgb(20 30 60 / .55)'; ctx.beginPath(); ctx.roundRect(bx - 3, y - bh / 2 - 3, bw + 6, bh + 6, (bh + 6) / 2); ctx.fill();
  ctx.fillStyle = '#ff3b45'; ctx.beginPath(); ctx.roundRect(bx, y - bh / 2, Math.max(bh, bw * k), bh, bh / 2); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; ctx.beginPath(); ctx.roundRect(bx + 2, y - bh / 2 + 1.5, Math.max(0, bw * k - 4), bh * .35, bh * .2); ctx.fill();
  drawHint(t);
}

function drawHint(t) {
  if (!dragged && phase === 'play') {   // dica: dedo arrastando
    const k = Math.sin(t * 2.5), size = Math.round(P.wN * .3 / 4) * 4, [x, yy] = proj(player.u + k * .4, -.2);
    ctx.drawImage(emojiSprite('👆', size), x - size * .4, yy, size, size);
  }
}

function drawBanner(t) {
  const e = clock - phaseAt, k = easeOutBack(clamp01(e / .45));
  if (phase === 'intro') {
    ctx.globalAlpha = e > 1.2 ? clamp01((1.6 - e) / .4) : 1;
    bigText(ctx, `FASE ${level + 1}`, W / 2, H * .42, P.wN * .42 * k, '#fff', '#1a3a8a', .16);
    ctx.globalAlpha = 1; return;
  }
  if (phase !== 'win' && phase !== 'lose') return;
  ctx.fillStyle = `rgb(10 20 50 / ${.45 * clamp01(e / .4)})`; ctx.fillRect(0, 0, W, H);
  const cy = H * .4, R = P.wN * .55 * k;
  if (phase === 'win') {
    ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) star(ctx, W / 2 + (i - 1) * R * .9, cy - R * (i === 1 ? .95 : .7), R * (i === 1 ? .38 : .28), -Math.PI / 2 + Math.sin(t * 3 + i) * .1);
    bigText(ctx, 'VITÓRIA!', W / 2, cy, P.wN * .34 * k, '#ffd23f', '#7a3a00', .16);
  } else {
    shield(W / 2, cy - R * .3, R * .8);
    bigText(ctx, 'DERROTA', W / 2, cy + R * .7, P.wN * .3 * k, '#fff', '#3a1020', .16);
  }
  if (e > .8) {
    const bw = P.wN * 1.5, bh = P.wN * .34, by = cy + R * 1.6;
    button = { x: W / 2, y: by, w: bw, h: bh };
    const pulse = 1 + .04 * Math.sin(t * 5);
    ctx.save(); ctx.translate(W / 2, by); ctx.scale(pulse, pulse);
    ctx.fillStyle = phase === 'win' ? '#2f9a45' : '#c4212a'; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2 + 5, bw, bh, bh * .3); ctx.fill();
    ctx.fillStyle = phase === 'win' ? '#5ad16e' : '#ff5b52'; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh * .3); ctx.fill();
    bigText(ctx, phase === 'win' ? 'PRÓXIMA ▶' : 'DE NOVO ↻', 0, 0, bh * .48, '#fff', 'rgb(0 0 0 / .35)', .12);
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

function render(t) {
  const sk = clamp01(1 - (clock - shakeAt) / .35) * P.wN * .04;
  ctx.save(); ctx.translate(rand(-sk, sk), rand(-sk, sk));
  ctx.drawImage(fieldLayer, 0, 0, W, H);
  drawBelts(t);
  drawRed(t, GATE_V);
  const bv = boss ? boss.v : 9;
  drawUnits(t, Math.max(bv, GATE_V), 9);
  if (boss) drawBoss(boss, t);
  drawUnits(t, GATE_V, Math.max(bv, GATE_V));
  drawGate(t);
  for (const p of piles) drawPile(p, t);
  drawRed(t, -1, GATE_V);
  drawUnits(t, -9, GATE_V);
  drawCannons(t);
  drawPuffs();
  drawRings();
  drawParticles();
  drawFloats();
  ctx.restore();
  if (started) { drawHud(t); drawBanner(t); }
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutField();
}

startLevel(0);
boot({
  resize, update, render, onTap, onMove, onUp, onCancel: onUp,
  onAmbient: () => {},
  onStart() { setPhase('intro'); },
});
