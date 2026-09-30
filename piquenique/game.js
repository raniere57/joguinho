'use strict';
// Piquenique: três amigos sentam na toalha. Primeiro o chá: toca na xícara (ou no amigo, ou no bule),
// o bule vem, serve, o amigo assopra e bebe. Depois cada um pede um docinho num balãozinho; toca no
// igual na cesta e ele voa pra boca: nham, nham. No fim, tim-tim com as xícaras e chegam outros amigos.

const HINT_AFTER = 6, REPEAT_AFTER = 15;
const POT_GO = .45, POUR = 1.2, POT_BACK = .45, POT_DONE = POT_GO + POUR + POT_BACK;
const BLOW = 2.2, SIP = 2.7, SIP_UP = .4, SIP_HOLD = .8, TEA_DONE = SIP + SIP_UP * 2 + SIP_HOLD;
const FLY = .55, BITE = .38;
const TOAST_UP = .6, TOAST_HOLD = .9, TOAST_DOWN = .5;
const HAT_IDS = ['coroa', 'chapeu', 'laco', 'flores', 'estrela'];

const VOZ = {
  vamos: 'Vamos fazer um piquenique!', chegaram: 'Chegaram mais amigos pro piquenique!',
  cha: 'Toque nas xícaras pra servir o chá!', doces: 'Agora os docinhos! Olhe o que cada um quer.',
  ninguem: 'Hmm, ninguém pediu esse. Olhe os balõezinhos!', brinde: 'Agora todo mundo junto: toque pra fazer tim-tim!',
  tchau: 'Que piquenique gostoso! Tchau, amigos!',
  ...Object.fromEntries(FOODS.map(f => ['f-' + f.id, f.name + '!'])),
};
const VOZ_B = {
  ...Object.fromEntries(FOODS.map(f => ['quero-' + f.id, `Eu quero ${f.art}!`])),
  hmm: 'Hmm, que delícia!', quente: 'Tá quentinho!', obrigada: 'Obrigada!', nham: 'Nham, nham, nham!',
  timtim: 'Tim-tim!', hihi: 'Hi hi!', oba: 'Oba!',
};
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let phase = 'intro', phaseAt = 0, lastAct = 0, lastSaid = 0, round = 0, lastB = -99, lastNo = -99;
let guests = [], pot = null, queue = [], tray = [], toastAt = -9, toastStep = 0, leaveAt = -9;

meter.size = 7;   // 3 chás + 3 docinhos + o brinde
meter.onFull = () => { sfx.fanfare(); confettiRain(90); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };
const setPhase = p => { phase = p; phaseAt = lastAct = clock; };
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = k => k * k * (3 - 2 * k);
const shuffle = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// ---------- amigos ----------
function newRound() {
  const hats = shuffle(HAT_IDS), tops = shuffle(TOPS);
  guests = [0, 1, 2].map(i => ({
    b: BICHOS[(round + i) % BICHOS.length], hat: hats[i], top: tops[i], cup: CUPS[(round + i) % CUPS.length], v: newLook(),
    riseAt: clock + i * .22, hopAt: -9, teaAt: null, teaStep: 0, blowAt: -9, wish: null, wishAt: 0, shown: false, bubbleAt: -9, eat: null, fed: false,
  }));
  pot = null; queue = []; tray = []; toastAt = -9; leaveAt = -9;
  guests.forEach((G, i) => setTimeout(() => { sfx.pop(); burst(L.xs[i], L.hy, L.r * .6, 320, 8); }, 150 + i * 220));
  setPhase('cha');
  if (round) talk('chegaram');
  talk('cha', true);
  round++;
}

function riseOf(G) {
  if (leaveAt > 0) return 1 - ease(clamp01((clock - leaveAt) / .5));
  const k = clamp01((clock - G.riseAt) / .6);
  return k <= 0 ? 0 : easeOutBack(k);
}
const headY = i => L.hy + (1 - riseOf(guests[i])) * L.r * 4.6 - pulseAt(guests[i].hopAt, .4) * L.r * .28;
const mouthAt = i => [L.xs[i], headY(i) + L.r * .45];
const bubbleAt = i => [L.xs[i], headY(i) - L.r * 2.45];

function tapGuest(i) {
  const G = guests[i];
  if (phase === 'cha' && serve(i)) return;
  if (phase === 'doces' && !G.fed && !G.eat && G.shown) {
    G.bubbleAt = G.hopAt = clock;
    if (clock - lastB > 2) { lastB = clock; talk('quero-' + G.wish.id); }
    return;
  }
  G.hopAt = clock; sfx.giggle(L.xs[i] / W * 2 - 1);
  if (clock - lastB > 3) { lastB = clock; talk(pick(['hihi', 'oba'])); }
}

// ---------- chá ----------
function serve(i) {
  const G = guests[i];
  if (G.teaAt != null || queue.includes(i) || riseOf(G) < .9) return false;
  if (pot) { queue.push(i); sfx.pop(); } else startPour(i);
  return true;
}

function startPour(i) {
  pot = { i, at: clock, blub: 0 };
  guests[i].teaAt = clock;
  sfx.whoosh();
}

function teaLevel(G) {
  if (G.teaAt == null) return 0;
  const e = clock - G.teaAt;
  if (e < POT_GO + POUR) return clamp01((e - POT_GO) / POUR);
  return 1 - clamp01((e - SIP - SIP_UP) / SIP_HOLD) * .5;
}

const TEA_STEPS = [
  [POT_GO + .05, () => sfx.splash()],
  [BLOW, (G, i) => {
    sfx.blow(); G.blowAt = clock;
    const [x, y] = cupAt(i);
    for (let k = 0; k < 6; k++) addParticle({ x: x + rand(-.2, .2) * L.r, y: y - L.r * .5, vx: rand(10, 60), vy: -rand(20, 60), life: .8, decay: 1.4, size: L.r * rand(.06, .1), color: 'rgb(255 255 255 / .8)', star: false, rot: 0, vr: 0 });
    if (Math.random() < .4 && clock - lastB > 3) { lastB = clock; talk('quente'); }
  }],
  [SIP + SIP_UP + .15, () => sfx.gulp()],
  [SIP + SIP_UP + .55, () => sfx.gulp()],
  [TEA_DONE, (G, i) => {
    G.hopAt = clock;
    const [x, y] = cupAt(i);
    launchStar(x, y - L.r * .6); burst(x, y - L.r * .5, L.r * .5, 30, 10);
    if (clock - lastB > 1.5) { lastB = clock; talk(pick(['hmm', 'hmm', 'obrigada']), true); }
    if (guests.every(g => g.teaStep >= TEA_STEPS.length)) setTimeout(startDoces, 1400);
  }],
];

function updateTea() {
  if (pot) {
    const e = clock - pot.at;
    if (e > POT_GO + .1 && e < POT_GO + POUR && clock - pot.blub > .15) { pot.blub = clock; sfx.blub(.1); }
    if (e >= POT_DONE) { pot = null; if (queue.length) startPour(queue.shift()); }
  }
  guests.forEach((G, i) => {
    if (G.teaAt == null) return;
    const e = clock - G.teaAt;
    while (G.teaStep < TEA_STEPS.length && e >= TEA_STEPS[G.teaStep][0]) TEA_STEPS[G.teaStep++][1](G, i);
  });
}

function potPose() {
  const [hx, hy] = L.pot, s = L.r * .95;
  if (!pot) return { x: hx, y: hy + Math.sin(clock * 2) * s * .04, tilt: 0, s, dir: 1 };
  const e = clock - pot.at, [cx, cy] = cupAt(pot.i), tilt = .8;
  const dir = potTip(0, 0, s, tilt)[0] + s * 1.4 > cx ? -1 : 1;   // sem espaço à esquerda: serve pelo outro lado
  const [tx, ty] = potTip(0, 0, s, tilt, dir);
  const ax = cx - tx, ay = cy - CUP_S() * 1.2 - L.r * .6 - ty;   // o bico fica bem em cima da xícara
  if (e < POT_GO) { const k = ease(e / POT_GO); return { x: hx + (ax - hx) * k, y: hy + (ay - hy) * k - Math.sin(k * Math.PI) * L.r * .6, tilt: tilt * .25 * k, s, dir }; }
  if (e < POT_GO + POUR) { const k = clamp01((e - POT_GO) / .2); return { x: ax, y: ay, tilt: tilt * (.25 + .75 * k), s, dir, pour: k >= 1 }; }
  const k = ease(clamp01((e - POT_GO - POUR) / POT_BACK));
  return { x: ax + (hx - ax) * k, y: ay + (hy - ay) * k - Math.sin(k * Math.PI) * L.r * .6, tilt: tilt * (1 - k), s, dir };
}

// onde está a xícara (fundo) e a inclinação: no pires, na boca bebendo ou no tim-tim
function cupPose(i) {
  const G = guests[i], [cx, cy] = cupAt(i);
  if (toastAt > 0) {
    const e = clock - toastAt, [tx, ty] = L.toast, d = i - 1;
    const k = e < TOAST_UP ? ease(e / TOAST_UP) : e < TOAST_UP + TOAST_HOLD ? 1 : 1 - ease(clamp01((e - TOAST_UP - TOAST_HOLD) / TOAST_DOWN));
    const h = e - TOAST_UP, wob = h > 0 && h < TOAST_HOLD ? Math.sin(h * 18) * .1 * (1 - h / TOAST_HOLD) : 0;
    const gx = tx + d * L.r * 1.05, gy = ty + Math.abs(d) * L.r * .12;
    return [cx + (gx - cx) * k, cy + (gy - cy) * k, (-d * .35 + wob) * k];
  }
  if (G.teaAt == null) return [cx, cy, 0];
  const e = clock - G.teaAt - SIP;
  if (e < 0 || e > SIP_UP * 2 + SIP_HOLD) return [cx, cy, 0];
  const [mx, my] = mouthAt(i), bx = mx + L.r * .33, by = my + L.r * .4;
  const k = e < SIP_UP ? ease(e / SIP_UP) : e < SIP_UP + SIP_HOLD ? 1 : 1 - ease((e - SIP_UP - SIP_HOLD) / SIP_UP);
  return [cx + (bx - cx) * k, cy + (by - cy) * k, -.55 * k];
}

// ---------- docinhos ----------
function startDoces() {
  if (phase !== 'cha') return;
  setPhase('doces');
  const wishes = shuffle(FOODS).slice(0, 3), extra = shuffle(FOODS.filter(f => !wishes.includes(f))).slice(0, 3);
  tray = shuffle([...wishes, ...extra]).map(f => ({ f, hopAt: -9 }));
  guests.forEach((G, i) => { G.wish = wishes[i]; G.wishAt = clock + 2.6 + i * 1.5; });
  sfx.whoosh(); talk('doces');
  wishes.forEach(f => talk('quero-' + f.id, true));
}

function feed(k) {
  const it = tray[k], s = traySlots()[k];
  it.hopAt = clock;
  const i = guests.findIndex(G => G.wish === it.f && !G.fed && !G.eat);
  if (i < 0) {
    sfx.boing();
    if (guests.some(G => G.wish === it.f)) return;   // quem pediu já está comendo
    if (clock - lastNo > 3) { lastNo = clock; talk('ninguem'); }
    guests.forEach(G => { if (!G.fed && G.shown) G.bubbleAt = clock; });
    return;
  }
  guests[i].eat = { f: it.f, at: clock, x0: s.x, y0: s.y, s0: s.s, step: 0 };
  sfx.whoosh(); talk('f-' + it.f.id);
}

function bite(G, i) {
  sfx.pop();
  const [mx, my] = mouthAt(i), r = L.r;
  for (let k = 0; k < 5; k++) addParticle({ x: mx + rand(-.25, .25) * r, y: my + r * .3, vx: rand(-50, 50), vy: -rand(10, 70), life: 1, decay: 1.6, size: r * rand(.04, .07), color: pick(['#e8b070', '#fff3d6', '#ffcf8a']), star: false, rot: 0, vr: 0 });
}

const EAT_STEPS = [
  [FLY, bite], [FLY + BITE, bite], [FLY + BITE * 2, bite],
  [FLY + BITE * 3, (G, i) => {
    sfx.gulp(); G.fed = true; G.hopAt = clock;
    const [bx, by] = bubbleAt(i), [mx, my] = mouthAt(i);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; addParticle({ x: bx, y: by, vx: Math.cos(a) * L.r * 2, vy: Math.sin(a) * L.r * 2 - L.r, life: 1, decay: 1.5, size: L.r * .1, color: pick(['#ff7eb6', '#ffb3d4', '#fff']), star: k % 2 === 0, rot: 0, vr: 3 }); }
    launchStar(mx, my);
    talk(pick(['nham', 'hmm', 'obrigada']), true);
    if (guests.every(g => g.fed)) setTimeout(startBrinde, 1500);
  }],
];

function updateDoces() {
  guests.forEach((G, i) => {
    if (G.wish && !G.shown && clock >= G.wishAt) { G.shown = true; G.bubbleAt = clock; sfx.pop(); }
    if (!G.eat || G.fed) return;
    const e = clock - G.eat.at;
    while (G.eat.step < EAT_STEPS.length && e >= EAT_STEPS[G.eat.step][0]) EAT_STEPS[G.eat.step++][1](G, i);
  });
}

// ---------- brinde e despedida ----------
function startBrinde() {
  if (phase !== 'doces') return;
  setPhase('brinde'); sfx.chime(); talk('brinde');
}

function startToast() {
  setPhase('toast'); toastAt = clock; toastStep = 0; sfx.whoosh();
}

const TOAST_STEPS = [
  [TOAST_UP, () => {
    sfx.bell(2093); setTimeout(() => sfx.bell(2637), 90); setTimeout(() => sfx.bell(3136), 180);
    burst(L.toast[0], L.toast[1] - CUP_S(), L.r * .8, 50, 18);
    talk('timtim');
    guests.forEach(G => { G.hopAt = clock; });
  }],
  [TOAST_UP + TOAST_HOLD + TOAST_DOWN, () => launchStar(L.toast[0], L.toast[1])],
  [2.7, () => { setPhase('tchau'); talk('tchau', true); }],
  [5.6, () => { leaveAt = clock; sfx.whoosh(); }],
  [6.3, newRound],
];

function updateToast() {
  if (toastAt < 0) return;
  while (toastAt > 0 && toastStep < TOAST_STEPS.length && clock - toastAt >= TOAST_STEPS[toastStep][0]) TOAST_STEPS[toastStep++][1]();
}

// ---------- toques ----------
function onTap(x, y) {
  lastAct = clock;
  if (tapBird(x, y) || tapFly(x, y)) return;
  if (phase === 'brinde') { startToast(); return; }
  if (phase === 'doces') {
    const k = traySlots().findIndex(s => Math.abs(x - s.x) < s.w / 2 && Math.abs(y - s.y) < s.h / 2);
    if (k >= 0 && tray[k]) { feed(k); return; }
  }
  if (phase === 'cha') {
    const ci = guests.findIndex((G, i) => { const [cx, cy] = cupAt(i); return Math.hypot(x - cx, y - cy + L.r * .25) < L.r * .65; });
    if (ci >= 0) { if (!serve(ci)) { guests[ci].hopAt = clock; sfx.boing(); } return; }
    const [px, py] = L.pot;
    if (!pot && Math.hypot(x - px, y - py) < L.r * 1.1) {
      const i = guests.findIndex((G, j) => G.teaAt == null && !queue.includes(j));
      if (i >= 0 && serve(i)) return;
    }
  }
  const gi = guests.findIndex((G, i) => {
    const [bx, by] = bubbleAt(i);
    return riseOf(G) > .9 && ((Math.abs(x - L.xs[i]) < L.r * 1.1 && y > headY(i) - L.r * 1.3 && y < L.cloth.top) || (G.shown && !G.fed && Math.hypot(x - bx, y - by) < L.r * .85));
  });
  if (gi >= 0) { tapGuest(gi); return; }
  sfx.pop(); ring(x, y, L.r * .3);
}

// ---------- dica ----------
function hintTarget() {
  if (phase === 'cha') {
    if (pot) return null;
    const i = guests.findIndex((G, j) => G.teaAt == null && !queue.includes(j));
    if (i < 0) return null;
    const [x, y] = cupAt(i); return [x, y - L.r * .3];
  }
  if (phase === 'doces') {
    if (guests.some(G => G.eat && !G.fed)) return null;
    const G = guests.find(G => G.shown && !G.fed);
    if (!G) return null;
    const s = traySlots()[tray.findIndex(it => it.f === G.wish)];
    return [s.x, s.y];
  }
  if (phase === 'brinde') { const [x, y] = cupAt(1); return [x, y - L.r * .3]; }
  return null;
}

function drawHint(t) {
  if (clock - lastAct < HINT_AFTER) return;
  const h = hintTarget();
  if (!h) return;
  const size = Math.round(Math.max(L.r * .9, 40) / 4) * 4;
  ctx.drawImage(emojiSprite('👆', size), h[0] - size * .45, h[1] + size * .15 + Math.abs(Math.sin(t * 4)) * size * .3, size, size);
}

function remind() {
  if (clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  if (phase === 'cha' && !pot) talk('cha');
  else if (phase === 'doces') {
    const G = guests.find(G => G.shown && !G.fed && !G.eat);
    if (!G) return;
    G.bubbleAt = clock; talk('quero-' + G.wish.id);
  } else if (phase === 'brinde') talk('brinde');
  else return;
  lastAct = clock;
}

// ---------- desenho ----------
function faceOf(G, i, t) {
  const v = G.v, te = G.teaAt == null ? -1 : clock - G.teaAt;
  v.blink = ((t + i * 1.3) % 3.4) < .12 ? .1 : 1; v.eyes = 'open'; v.mouth = 'smile';
  if (te > BLOW - .1 && te < BLOW + .5) v.mouth = 'o';
  if (te > SIP + SIP_UP * .5 && te < SIP + SIP_UP * 1.5 + SIP_HOLD) v.eyes = 'closed';
  if (G.eat && !G.fed) { const e = clock - G.eat.at; if (e > FLY) v.mouth = ((e - FLY) % BITE) < BITE * .5 ? 'o' : 'smile'; }
  const p = pot && potPose();
  v.look = p ? [Math.sign(p.x - L.xs[i]) * .8, .4] : [0, .5];
}

function drawGuest(G, i, t) {
  const r = L.r, x = L.xs[i], hy = headY(i), by = hy + r * 1.38;
  ctx.fillStyle = G.top; ctx.beginPath(); ctx.ellipse(x, by, r * .8, r * .74, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - r * .44, hy + r * .78); ctx.lineTo(x + r * .44, hy + r * .78); ctx.lineTo(x, hy + r * 1.52); ctx.closePath(); ctx.fill();   // guardanapo no pescoço
  ctx.strokeStyle = '#ff9ec8'; ctx.lineWidth = r * .06; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = '#ff9ec8'; circle(ctx, x, hy + r * 1.08, r * .07); ctx.fill();
  faceOf(G, i, t);
  ctx.save(); ctx.translate(x, hy); ctx.rotate(Math.sin(t * 1.3 + i * 2) * .04);
  drawHead(ctx, 0, 0, r, G.b, G.v, t, 0);
  HATS.find(h => h.id === G.hat)?.draw(ctx, 0, 0, r, t);
  ctx.restore();
}

function drawArms(G, i, t) {
  if (riseOf(G) < .97) return;
  const r = L.r, x = L.xs[i], hy = headY(i), top = L.cloth.top;
  for (const d of [-1, 1]) {
    const sx = x + d * r * .62, sy = hy + r * 1.05, wave = d > 0 && phase === 'tchau' && leaveAt < 0;
    const [ex, ey] = wave ? [x + r * 1.05, hy + r * .1 + Math.sin(t * 10 + i) * r * .18] : [x + d * r * .5, top + r * .14];
    ctx.strokeStyle = G.top; ctx.lineWidth = r * .26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = G.b.patches || G.b.fur; circle(ctx, ex, ey, r * .16); ctx.fill();
  }
}

function drawCups(t) {
  const s = CUP_S(), p = pot && potPose();
  guests.forEach((G, i) => {
    if (riseOf(G) < .5) return;
    const [sx, sy] = cupAt(i), lvl = teaLevel(G);
    drawSaucer(ctx, sx, sy, s, G.cup);
    const [x, y, rot] = cupPose(i), glow = phase === 'brinde' ? .6 + .4 * Math.sin(t * 5 + i) : 0;
    if (p?.pour && pot.i === i) {   // o chá caindo do bico
      const [tx, ty] = potTip(p.x, p.y, p.s, p.tilt, p.dir), ey = y - s * 1.1;
      ctx.strokeStyle = TEA; ctx.lineWidth = s * .24; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + p.dir * s * .15, (ty + ey) / 2, x + Math.sin(t * 20) * s * .04, ey); ctx.stroke();
    }
    drawCup(ctx, x, y, s, lvl, G.cup, rot, glow);
    if (lvl > .05 && rot === 0) drawSteam(x, y - s * 1.2, s, t + i * 2, clock - G.blowAt < .6 ? 1.6 : .8);
  });
}

function drawTray() {
  const slots = traySlots();
  tray.forEach((it, k) => {
    const s = slots[k], hop = pulseAt(it.hopAt, .35) * s.s * .25;
    emojiAt(ctx, it.f.e, s.x, s.y - hop, s.s);
  });
  const lift = phase === 'doces' ? ease(clamp01((clock - phaseAt) / .7)) : tray.length ? 1 : 0;
  if (lift < 1) drawCover(lift);
}

function drawEating() {
  guests.forEach((G, i) => {
    if (!G.eat || G.fed) return;
    const e = clock - G.eat.at, [mx, my] = mouthAt(i), r = L.r, tx = mx, ty = my + r * .3;
    if (e < FLY) {
      const k = e / FLY, q = 1 - (1 - k) ** 3;
      emojiAt(ctx, G.eat.f.e, G.eat.x0 + (tx - G.eat.x0) * q, G.eat.y0 + (ty - G.eat.y0) * q - Math.sin(k * Math.PI) * r * 1.5, G.eat.s0 + (r * 1.1 - G.eat.s0) * q, (1 - q) * 2);
      return;
    }
    const left = 1 - Math.min(G.eat.step, 3) / 3.4, squish = 1 - .15 * pulseAt(G.eat.at + FLY + (G.eat.step - 1) * BITE, .2);
    emojiAt(ctx, G.eat.f.e, tx, ty, r * 1.1 * left * squish);
  });
}

function drawWishes(t) {
  guests.forEach((G, i) => {
    if (!G.shown || G.fed) return;
    const [x, y] = bubbleAt(i), k = easeOutBack(clamp01((clock - G.wishAt) / .4));
    drawWish(x, y, L.r * (L.port ? .78 : .72), G.wish, t, k * (1 + .18 * pulseAt(G.bubbleAt, .45)));
  });
}

// ---------- ciclo ----------
function update(dt) {
  updateSky(dt);
  updateFlies(dt);
  if (started) { updateTea(); updateDoces(); updateToast(); remind(); }
  updateMeter(dt);
}

function render(t) {
  drawSkyBack(t);
  drawHills();
  for (const f of flies) drawFly(f, t);
  guests.forEach((G, i) => drawGuest(G, i, t));
  drawWishes(t);
  ctx.drawImage(front, 0, 0, W, H);
  drawTray();
  guests.forEach((G, i) => drawArms(G, i, t));
  drawCups(t);
  const p = potPose(); drawPot(ctx, p.x, p.y, p.s, p.tilt, p.dir);
  drawEating();
  drawRings();
  drawParticles();
  if (started) { drawHint(t); drawMeter(); }
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutPicnic();
}

boot({
  resize, update, render, onTap,
  onBird: spawnBird,
  onStart() { talk('vamos'); setTimeout(newRound, 1500); },
});
