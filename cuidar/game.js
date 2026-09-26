'use strict';
// Cuidar da bebê: ela pede mamá, papinha, banho, fralda, dentinho, dodói, agasalho, soninho, brincar,
// colo, roupinha nova ou passeio; tudo no quarto também responde ao toque

loadVoices([
  'vamos', 'fome', 'sono', 'banho', 'brincar', 'delicia', 'limpinha', 'dormiu', 'bomdia', 'esfrega', 'muito-bem',
  'papinha', 'aviao', 'acabou', 'fralda', 'tira', 'lenco', 'fralda-nova', 'dentinho', 'escova', 'brilhante',
  'dodoi', 'curativo', 'beijinho', 'sarou', 'frio', 'agasalha', 'gorro', 'cachecol', 'cobertor', 'quentinha',
  'colo', 'adora-colo', 'quer-roupa', 'roupa', 'linda', 'lindissima', 'passear', 'parque', 'balanco', 'escorrega',
  'patos', 'casa', 'cade', 'achou',
  'b-nham', 'b-ri', 'b-boceja', 'b-mama', 'b-oba', 'b-bomdia', 'b-eba', 'b-papa', 'b-bua', 'b-brr', 'b-colo',
  'b-atchim', 'b-mua', 'b-hmm', 'b-uii',
]);

const NEEDS = {
  fome: { icon: '🍼', line: 'fome', text: 'A bebê está com fome!', baby: ['b-mama', 'Mamá!'] },
  papinha: { icon: '🥣', line: 'papinha', text: 'A bebê quer papinha!', baby: ['b-papa', 'Papá!'] },
  banho: { icon: '🛁', line: 'banho', text: 'A bebê está sujinha! Hora do banho!', show: L => { L.dirty = 1; } },
  fralda: { icon: 'fralda', line: 'fralda', text: 'Ih, que cheirinho! Vamos trocar a fralda?', show: L => { L.stinky = true; } },
  dentinho: { icon: '🪥', line: 'dentinho', text: 'Hora de escovar os dentinhos!' },
  dodoi: { icon: '🩹', line: 'dodoi', text: 'Ai! A bebê se machucou! Vamos cuidar do dodói?', baby: ['b-bua', 'Buáá!'], show: L => { L.crying = L.bump = true; } },
  frio: { icon: '🧣', line: 'frio', text: 'Brrr! A bebê está com frio!', baby: ['b-brr', 'Brrr!'], show: L => { L.cold = true; } },
  sono: { icon: '🌙', line: 'sono', text: 'A bebê está com soninho...', show: L => { L.sleepy = true; } },
  brincar: { icon: '🎈', line: 'brincar', text: 'A bebê quer brincar!' },
  colo: { icon: '🤗', line: 'colo', text: 'A bebê quer colo! Balança ela devagarinho.', baby: ['b-colo', 'Colo!'], show: L => { L.reach = true; } },
  roupa: { icon: '👗', line: 'quer-roupa', text: 'A bebê quer trocar de roupa!' },
  passeio: { icon: '🛝', line: 'passear', text: 'A bebê quer passear no parquinho!' },
};
const NEED_REPEAT = 14;          // segundos até lembrar de novo o que a bebê quer
const HINT_AFTER = 6;            // ...e até a mãozinha apontar o botão
const NO_REPEAT = 4;             // não repete os últimos pedidos
const DRAG_START = 12;

let mode = 'idle', modeAt = 0;
let need = null, needAt = 0, needSaidAt = 0, nextNeedAt = 0, recent = [];
let night = 0, hearts = [], frameDt = 0, pressing = null, bandageUntil = 0, warmUntil = 0;

const tools = document.querySelector('.tools');
const buttons = [...tools.querySelectorAll('button')];
const sleepBtn = buttons.find(b => b.dataset.care === 'sono');

meter.size = 4;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  confettiRain();
  heartBurst(baby.x, baby.y, 14);
  say('muito-bem', 'Muito bem! Você cuida muito bem da bebê!', true);
};

function heartBurst(x, y, n) {
  for (let i = 0; i < n; i++) {
    hearts.push({ x: x + rand(-baby.s, baby.s), y: y + rand(-baby.s * .5, baby.s * .3), vy: -rand(40, 90), vx: rand(-25, 25), r: rand(8, 15), t: 0, life: rand(1.2, 1.8) });
  }
}

// ---------- pedidos ----------
function sayNeed() {
  const n = NEEDS[need];
  say(n.line, n.text);
  if (n.baby) say(n.baby[0], n.baby[1], true);
}

function updateNeeds() {
  if (mode !== 'idle') return;
  if (!need && clock > nextNeedAt) {
    need = pick(Object.keys(NEEDS).filter(k => !recent.includes(k)));
    needAt = needSaidAt = clock;
    sayNeed();
  } else if (need && clock - needSaidAt > NEED_REPEAT) {
    needSaidAt = clock;
    sayNeed();
  }
  const idle = clock - Math.max(needAt, lastTap);
  for (const b of buttons) {
    b.classList.toggle('wanted', b.dataset.care === need);
    b.classList.toggle('hint', b.dataset.care === need && idle > HINT_AFTER);
  }
}

// cuidou do que ela pediu: estrela no medidor
function reward(kind) {
  recent = [kind, ...recent.filter(k => k !== kind)].slice(0, NO_REPEAT);
  if (need !== kind) return;
  need = null;
  launchStar(baby.x, baby.y - baby.s);
  heartBurst(baby.x, baby.y, 8);
  nextNeedAt = clock + rand(8, 14);
}

function done(kind) {
  reward(kind);
  if (!need) nextNeedAt = Math.max(nextNeedAt, clock + rand(8, 14));
  setMode('idle');
}

function setMode(m) {
  if (m !== mode) CARES[mode]?.end?.();
  mode = m; modeAt = clock;
  tools.classList.toggle('busy', m !== 'idle' && m !== 'sono');
  tools.classList.toggle('on', started && m !== 'roupa' && m !== 'passeio');
  for (const b of buttons) if (m !== 'idle') b.classList.remove('wanted', 'hint');
  sleepBtn.textContent = m === 'sono' ? '☀️' : '🌙';
  sleepBtn.setAttribute('aria-label', m === 'sono' ? 'Acordar' : 'Dormir');
}

function startCare(kind) {
  if (kind === 'sono' && mode === 'sono') return CARES.sono.wake();
  if (!CARES[kind] || kind === mode || mode === 'roupa' || mode === 'passeio') return;
  if (mode !== 'idle') setMode('idle');   // enjoou no meio: troca direto pro outro cuidado
  sfx.bell(880);
  endRock();
  baby.poke = null; baby.lookX = baby.lookY = 0;
  if (kind === 'banho' || kind === 'roupa') warmUntil = 0;
  setMode(kind);
  CARES[kind].start();
}

for (const b of buttons) {
  b.addEventListener('click', () => {
    if (!started) return;
    sfx.resume();
    lastTap = clock;
    startCare(b.dataset.care);
  });
}

// como a bebê está: pedido pendente, cuidado em andamento e coisas que ficam (curativo, gorro)
function dressLook() {
  look = { ...LOOK0 };
  if (clock < bandageUntil) look.bandage = look.bump = true;
  if (clock < warmUntil) look.gorro = look.scarf = true;
  if (need && mode !== need) NEEDS[need].show?.(look);
  CARES[mode]?.look?.(look);
}

// ---------- toques ----------
function onTap(x, y) {
  pressing = { x, y, moved: false, part: null };
  if (mode === 'idle') {
    const part = babyPart(x, y);
    if (part) { pressing.part = part; return; }   // toque ou colo? decide no mover/soltar
    if (tapRoom(x, y)) return;
    sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
    return;
  }
  CARES[mode].tap?.(x, y);
}

function onMove(x, y) {
  if (!pressing) return;
  if (mode === 'idle' && pressing.part) {
    if (!pressing.moved && Math.abs(x - pressing.x) > DRAG_START) { pressing.moved = true; startRock(pressing.x); }
    if (pressing.moved) moveRock(x);
    return;
  }
  CARES[mode]?.move?.(x, y);
}

function onUp() {
  if (pressing?.part && !pressing.moved && mode === 'idle') {
    if (look.crying) { sfx.chime(); heartBurst(pressing.x, pressing.y, 3); }   // chorando: toque vira carinho
    else pokeBaby(pressing.part, pressing.x, pressing.y);
  }
  endRock();
  CARES[mode]?.up?.();
  pressing = null;
}

function onCancel() { endRock(); CARES[mode]?.up?.(); pressing = null; }

// ---------- desenho ----------
function drawThought(t) {
  if (!need || mode !== 'idle' || place !== 'casa') return;
  const { x, y, s } = baby, bob = Math.sin(t * 2.5) * s * .05;
  const k = easeOutBack(Math.min((clock - needAt) / .4, 1));
  const cx = x + s * 1.35, cy = y - s * 1.25 + bob, r = s * .62 * k;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgb(80 40 120 / .2)'; ctx.shadowBlur = 12;
  circle(ctx, x + s * .75, y - s * .55, s * .09 * k); ctx.fill();
  circle(ctx, x + s * .95, y - s * .8, s * .14 * k); ctx.fill();
  for (const [dx, dy, rr] of [[-.5, .1, .6], [.5, .1, .6], [0, -.35, .65], [0, .35, .6]]) { circle(ctx, cx + dx * r, cy + dy * r, rr * r); ctx.fill(); }
  ctx.shadowBlur = 0;
  const icon = NEEDS[need].icon;
  if (icon === 'fralda') { drawDiaper(ctx, cx, cy - r * .1, r * .9, 'clean'); return; }
  const size = Math.round(r * 1.5 / 10) * 10;
  if (size > 0) ctx.drawImage(emojiSprite(icon, size), cx - size / 2, cy - size / 2, size, size);
}

function drawHearts(dt) {
  for (const h of hearts) { h.t += dt; h.x += h.vx * dt; h.y += h.vy * dt; }
  hearts = hearts.filter(h => h.t < h.life);
  for (const h of hearts) {
    const k = easeOutBack(Math.min(h.t / .3, 1));
    ctx.globalAlpha = 1 - h.t / h.life;
    ctx.fillStyle = '#ff6fa8';
    heartPath(ctx, h.x, h.y, h.r * k); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  baby.hs = Math.min(W * .25, H * .14, 130);
  baby.hx = W / 2;
  baby.hy = H * .43;
  if (place === 'casa') { baby.x = baby.hx; baby.y = baby.hy; baby.s = baby.hs; }
  room = buildRoom();
  placeRoomThings();
  if (!closet.childElementCount) buildCloset();   // ícones têm tamanho fixo: não refaz a cada resize (Safari dispara ao esconder a barra)
  if (place === 'parque') { geo = parkGeo(); parkLayer = buildPark(); }
}

function update(dt, t) {
  frameDt = dt;
  if (clock - baby.blinkAt > 3 + Math.random() * 40) baby.blinkAt = clock;
  if (started && place === 'casa') updateNeeds();
  CARES[mode]?.update?.(dt, t);
  if (mode !== 'sono') night += (0 - night) * Math.min(dt * 1.5, 1);
  updateFade();
  if (place === 'casa') {
    updateRock(dt);
    updateToys(dt, ['idle', 'sono', 'brincar', 'banho', 'dentinho'].includes(mode));
    const [tx, ty] = mode === 'roupa' ? closetPose() : [baby.hx, baby.hy];
    baby.x += (tx - baby.x) * Math.min(dt * 6, 1);
    baby.y += (ty - baby.y) * Math.min(dt * 6, 1);
  }
  dressLook();
  updateMeter(dt);
}

function render(t) {
  if (place === 'parque') drawPark(t);
  else {
    drawRoom(t, need === 'frio' || mode === 'frio' || clock < warmUntil);
    drawMobile(frameDt, t);
    CARES[mode]?.drawBack?.(t);
    drawBaby(t);
    drawStink(t);
    drawHoldingArms();
    CARES[mode]?.drawFront?.(t);
    drawThought(t);
    drawColoHint(t);
    drawNight(t);
    CARES[mode]?.drawOver?.(t);
  }
  drawKisses(frameDt);
  drawHearts(frameDt);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
  drawFade();
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel,
  onStart: () => {
    tools.classList.add('on');
    nextNeedAt = clock + 4;
    say('vamos', 'Vamos cuidar da bebê?');
  },
});
