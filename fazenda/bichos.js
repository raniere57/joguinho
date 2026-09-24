'use strict';
// bichos da fazenda: cada um faz uma coisa típica quando a criança toca.
// Tudo em coordenadas do mundo (x cresce pra direita além da tela); a câmera desloca na hora de desenhar.

const GALLOP_TIME = 4.2;          // cavalo sai do celeiro, corre no pasto e volta
const HATCH_TIME = 4.5;           // ovo choca sozinho (tocar acelera)
const MAX_CHICKS = 5;
const ANIMALS = [
  { id: 'cachorro', e: '🐕', at: [.29, .665], size: .95, roam: .012, text: 'O cachorro faz: au, au!' },
  { id: 'vaca', e: '🐄', at: [.415, .665], size: 1.4, roam: .015, text: 'A vaca faz: muuuu!' },
  { id: 'ovelha', e: '🐑', at: [.55, .725], size: 1.1, roam: .015, text: 'A ovelha faz: méééé!' },
  { id: 'galo', e: '🐓', at: [.52, .565], size: .8, perch: true, text: 'O galo faz: cocoricó!' },
  { id: 'galinha', hen: true, at: [.22, .79], size: 1, roam: .015, text: 'A galinha faz: có, có, có! E botou um ovo!' },
  { id: 'pato', e: '🦆', pond: true, size: .8, text: 'O pato faz: quá, quá, quá!' },
  { id: 'sapo', e: '🐸', frog: true, size: .6, text: 'O sapo faz: croac, croac!' },
  { id: 'gato', e: '🐈', loft: true, size: .75, text: 'O gato faz: miau!' },
  { id: 'porco', e: '🐖', at: [.76, .8], size: 1.05, roam: .012, text: 'O porquinho faz: óinc, óinc!' },
  { id: 'coelho', e: '🐇', at: [.815, .87], size: .85, roam: .008, text: 'O coelho adora cenoura! Nhac, nhac!' },
];

let animals = [], eggs = [], chicks = [], shells = [], ball = null, horse = { at: -99 };
let items = [], hearty = [], zzz = [], wool = [], flyers = [], carrots = [];
const byId = id => animals.find(a => a.id === id);

// ---------- desenho básico ----------
// emoji apoiado pelo pé em (x, y); os bichos do emoji olham pra esquerda, faceRight vira
function drawSprite(e, x, y, size, faceRight = false, rot = 0, sx = 1, sy = 1) {
  const s = Math.round(size / 4) * 4;
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale((faceRight ? -1 : 1) * sx, sy);
  ctx.drawImage(emojiSprite(e, s), -s / 2, -s * .93, s, s);
  ctx.restore();
}

function shadowAt(x, y, r) {
  ctx.fillStyle = 'rgb(40 80 30 / .18)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .28, 0, 0, TAU); ctx.fill();
}

const pulse = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

function hearts(x, y, n, e = '💖') {
  for (let i = 0; i < n; i++) hearty.push({ e, x: x + rand(-S * .4, S * .4), y, vy: -rand(40, 80), t: 0, life: rand(1, 1.5) });
}

// ---------- montar ----------
function placeAnimals() {
  const old = animals;
  animals = ANIMALS.map((d, i) => {
    const prev = old.find(o => o.id === d.id) || {};
    let x = wX(d.at?.[0] ?? 0), y = H * (d.at?.[1] ?? 0);
    if (d.perch) y = H * SPOT.fence[2] - S * .5;
    if (d.loft) [x, y] = loftSpot();
    return { ...d, x, y, bx: x, by: y, s: S * d.size, faceRight: false, phase: i * 1.7, hopAt: prev.hopAt ?? -9,
      actAt: -99, act: null, wool: 1, pad: prev.pad ?? 0, angle: prev.angle ?? 0, taps: prev.taps ?? 0, munchAt: -99, flapAt: -99 };
  });
  chicks = chicks.map(c => ({ ...c, x: byId('galinha').x, y: byId('galinha').y }));
  eggs = eggs.map((e, i) => ({ ...e, ...nestSlot(i) }));
  ball = null;
}

function nestSlot(i) { return { x: wX(SPOT.nest[0]) + (i - 1) * S * .38, y: H * SPOT.nest[1] + S * .05 }; }

// ---------- o que cada bicho faz ao ser tocado ----------
function actAnimal(a) {
  a.hopAt = clock; a.taps++;
  const pan = ((a.x - camX) / W) * 2 - 1;
  switch (a.id) {
    case 'cachorro': throwBall(a); say('bolinha', 'Busca, cachorrinho!', true); break;
    case 'vaca':
      items.push({ e: '🥛', x: a.x + (a.faceRight ? 1 : -1) * a.s * .2, y: a.y - a.s * .7, t: 0 });
      sfx.bell(1046.5);
      if (a.taps % 3 === 0) say('leite', 'Leitinho fresquinho!', true);
      break;
    case 'ovelha': shear(a); break;
    case 'galo': a.flapAt = clock; for (let i = 0; i < 3; i++) setTimeout(() => hearts(a.x, a.y - a.s, 1, '🎵'), i * 200); break;
    case 'galinha': a.flapAt = clock; layEgg(); break;
    case 'pato': a.actAt = clock; a.act = 'dive'; sfx.splash(); ring(a.x - camX, a.y, a.s * .8); break;
    case 'sapo': a.actAt = clock; a.act = 'jump'; sfx.boing(); break;
    case 'gato': a.actAt = clock; hearts(a.x, a.y - a.s, 3); break;
    case 'porco': pigGo(a); break;
    case 'coelho': a.act = 'hop'; a.actAt = clock; a.hops = [0, 1, 2].map(() => a.bx + rand(-1.6, 1.6) * S); sfx.boing(); break;
  }
  sfx.giggle(pan);
  if (a.id !== 'cachorro' || a.taps === 1) say(a.id, a.text);
}

function throwBall(dog) {
  if (ball) return;
  const dir = dog.x > wX(.3) ? -1 : 1;
  ball = { x0: dog.x, y0: dog.y - dog.s * .5, x1: Math.min(Math.max(dog.x + dir * S * rand(2.5, 3.5), wX(.2)), wX(.4)), y1: dog.by + rand(-S * .1, S * .35), t: 0, held: false };
  sfx.whoosh();
}

// a lã sobe e vira nuvem
function shear(sheep) {
  sheep.wool = .45;
  for (let i = 0; i < 3; i++) wool.push({ x: sheep.x + rand(-sheep.s * .3, sheep.s * .3), y: sheep.y - sheep.s * .5, t: -i * .15, vx: rand(-20, 20) });
  sfx.whoosh();
  say('la', 'Olha! A lã virou nuvem!', true);
}

function pigGo(pig) {
  const apple = fallen.find(f => f.t > .7);
  pig.act = apple ? 'apple' : 'mud'; pig.actAt = clock; pig.target = apple || null; pig.splashed = false;
  if (!apple && pig.taps === 1) say('lama', 'O porquinho adora lama!', true);
}

function layEgg() {
  if (eggs.length >= 3 || eggs.length + chicks.length >= MAX_CHICKS) return;
  eggs.push({ ...nestSlot(eggs.length), born: clock, bonus: 0, wobbleAt: -9 });
  sfx.pop();
}

function tapEgg(egg) {
  egg.bonus += 1.1; egg.wobbleAt = clock;
  sfx.bell(880 + Math.random() * 300);
}

function feed(a, food) {
  items.push({ e: food, x: a.x, y: a.y - a.s * 1.6, t: 0, feeding: a });
  sfx.whoosh();
}

// ---------- movimento ----------
function updateAnimals(dt, t) {
  const sleeping = night > .5;
  for (const a of animals) {
    a.wool = Math.min(1, a.wool + dt * .08);
    if (a.pond) { swim(a, dt, t); continue; }
    if (a.frog) { frogMove(a); continue; }
    if (a.loft || a.perch) continue;
    let tx = a.bx + (sleeping ? 0 : Math.sin(t * .25 + a.phase) * wX(a.roam)), ty = a.by, speed = 2.5;
    if (a.id === 'cachorro' && ball) ({ tx, ty, speed } = dogTarget(a));
    if (a.id === 'porco' && a.act) ({ tx, ty, speed } = pigTarget(a, tx, ty));
    if (a.id === 'coelho' && a.act === 'hop') {
      const k = Math.floor((clock - a.actAt) / .5);
      if (k >= 3) a.act = null; else { tx = a.hops[k]; speed = 7; }
    }
    if (a.hen && !sleeping && Math.sin(t * 1.3 + a.phase) > .85) a.peck = 1; else a.peck = Math.max(0, (a.peck || 0) - dt * 4);
    const vx = (tx - a.x) * Math.min(dt * speed, 1);
    if (Math.abs(vx) > .08) a.faceRight = vx > 0;
    a.x += vx; a.y += (ty - a.y) * Math.min(dt * speed, 1);
  }
  const hen = byId('galinha');
  chicks.forEach((c, i) => {
    const side = hen.faceRight ? -1 : 1, tx = hen.x + side * S * (.6 + i * .42), ty = hen.y + S * .12 + (i % 2) * S * .14;
    const vx = (tx - c.x) * Math.min(dt * 2.5, 1);
    if (Math.abs(vx) > .05) c.faceRight = vx > 0;
    c.x += vx; c.y += (ty - c.y) * Math.min(dt * 2.5, 1);
  });
  hatchEggs();
  updateFeeding(dt);
}

function dogTarget(dog) {
  ball.t += frameDt;
  if (!ball.held && ball.t > .9 && Math.abs(dog.x - ball.x1) < S * .3) { ball.held = true; sfx.giggle(); }
  if (ball.held && Math.abs(dog.x - dog.bx) < 6) {
    ball = null; dog.wagAt = clock; hearts(dog.x, dog.y - dog.s, 4);
    return { tx: dog.bx, ty: dog.by, speed: 3 };
  }
  if (ball.held) return { tx: dog.bx, ty: dog.by, speed: 3 };
  return ball.t > .3 ? { tx: ball.x1, ty: ball.y1, speed: 3.5 } : { tx: dog.x, ty: dog.y, speed: 3 };
}

function pigTarget(pig, tx, ty) {
  const age = clock - pig.actAt;
  if (pig.act === 'apple') {
    const f = pig.target;
    if (!fallen.includes(f)) { pig.act = null; return { tx, ty, speed: 2.5 }; }
    if (Math.abs(pig.x - f.cx) < S * .35) {
      fallen = fallen.filter(o => o !== f);
      pig.act = null; pig.munchAt = clock; sfx.gulp(); hearts(pig.x, pig.y - pig.s, 5);
      say('adorou', 'Nham, nham! Adorou!', true);
    }
    return { tx: f.cx, ty: f.cy, speed: 3 };
  }
  if (age > 4) { pig.act = null; return { tx, ty, speed: 2.5 }; }
  const mx = wX(SPOT.mud[0]), my = H * SPOT.mud[1];
  if (!pig.splashed && Math.abs(pig.x - mx) < S * .3) {
    pig.splashed = true; pig.rollAt = clock;
    burst(pig.x - camX, pig.y, pig.s * .5, 25, 18);
    sfx.splash();
  }
  return { tx: mx, ty: my, speed: 3.5 };
}

function swim(a, dt, t) {
  const [px, py, rx, ry] = SPOT.pond, diving = a.act === 'dive' && clock - a.actAt < 1.3;
  if (a.act === 'dive' && !diving) {
    a.act = null; a.angle += Math.PI * .9;
    const x = wX(px) + Math.cos(a.angle) * wX(rx) * .5, y = H * py + Math.sin(a.angle) * H * ry * .4;
    ring(x - camX, y, a.s * .7); burst(x - camX, y, a.s * .3, 200, 10); sfx.splash();
  }
  if (!diving) a.angle += dt * (night > .5 ? .05 : .3);
  a.x = wX(px) + Math.cos(a.angle) * wX(rx) * .5;
  a.y = H * py + Math.sin(a.angle) * H * ry * .4;
  a.faceRight = -Math.sin(a.angle) > 0;
  a.hidden = diving;
}

function frogMove(a) {
  const pads = lilyPads(), age = clock - a.actAt;
  if (a.act === 'jump' && age >= .6) { a.act = null; a.pad = 1 - a.pad; ring(pads[a.pad][0] - camX, pads[a.pad][1], a.s * .6); }
  const from = pads[a.pad], to = pads[1 - a.pad];
  if (a.act === 'jump') {
    const p = age / .6;
    a.x = from[0] + (to[0] - from[0]) * p; a.y = from[1] + (to[1] - from[1]) * p - Math.sin(p * Math.PI) * S * 1.2;
    a.faceRight = to[0] > from[0];
  } else { a.x = from[0]; a.y = from[1]; }
}

function hatchEggs() {
  for (const egg of [...eggs]) {
    if ((clock - egg.born + egg.bonus) / HATCH_TIME < 1) continue;
    eggs = eggs.filter(e => e !== egg);
    chicks.push({ x: egg.x, y: egg.y, born: clock, hopAt: clock, faceRight: false });
    shells.push({ x: egg.x, y: egg.y - S * .3, t: 0 });
    burst(egg.x - camX, egg.y - S * .2, S * .4, 50, 14);
    sfx.chirp();
    say('pintinho', 'Nasceu um pintinho! Piu, piu!');
  }
}

// comida voa até o bicho, ele mastiga e fica feliz
function updateFeeding(dt) {
  for (const it of items) {
    it.t += dt;
    if (it.feeding && it.t > .7 && !it.done) {
      it.done = true;
      const a = it.feeding;
      a.munchAt = clock; sfx.gulp(); hearts(a.x, a.y - a.s, 6);
      say('adorou', 'Nham, nham! Adorou!', true);
    }
  }
  items = items.filter(it => it.t < (it.feeding ? .75 : 1.8));
  for (const c of carrots) {
    c.t += dt;
    if (c.t >= .8 && !c.done) {
      c.done = true;
      const b = byId('coelho');
      b.munchAt = clock; b.hopAt = clock; sfx.gulp(); hearts(b.x, b.y - b.s, 5);
      say('coelho', b.text, true);
    }
  }
  carrots = carrots.filter(c => c.t < .8);
}

// ---------- desenhar bichos ----------
function drawAnimal(a, t) {
  if (a.hidden) return;
  const h = pulse(a.hopAt, .45), munch = pulse(a.munchAt, 1) ? Math.sin((clock - a.munchAt) * 20) * .06 : 0;
  const sleeping = night > .5 && a.id !== 'galo';
  let rot = Math.sin(t * 2 + a.phase) * .03, lift = h * a.s * .35, size = a.s;
  if (a.id === 'cachorro' && clock - (a.wagAt || -9) < 1.5) rot = Math.sin(clock * 25) * .12;
  if (a.id === 'porco' && clock - (a.rollAt || -9) < 2.5) rot = Math.sin(clock * 9) * .6;
  if (a.id === 'gato') lift = pulse(a.actAt, .7) * a.s * .9;
  if (a.id === 'ovelha') size *= .8 + .2 * a.wool;
  if (a.id === 'galo') rot += pulse(a.flapAt, .8) * Math.sin(clock * 30) * .15;
  if (!a.pond && !a.frog && !a.loft && !a.perch) shadowAt(a.x, a.y, size * .38 * (1 - h * .3));
  if (a.hen) drawHen(a, t, lift);
  else drawSprite(a.e, a.x, a.y - lift, size, a.faceRight, rot, 1, (1 + munch) * (sleeping ? .95 : 1));
  if (a.id === 'cachorro' && ball?.held) drawSprite('🎾', a.x + (a.faceRight ? 1 : -1) * a.s * .42, a.y - a.s * .45, S * .35);
}

// galinha desenhada inteira (o emoji é só a cabeça), olhando pra direita; asa bate e cabeça bica o chão
function drawHen(a, t, lift) {
  const s = a.s, flap = pulse(a.flapAt, .8) ? Math.abs(Math.sin((clock - a.flapAt) * 18)) : 0, peck = a.peck || 0;
  ctx.save();
  ctx.translate(a.x, a.y - lift); ctx.scale(a.faceRight ? 1 : -1, 1);
  ctx.strokeStyle = '#f0a020'; ctx.lineWidth = Math.max(2, s * .05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * .1, -s * .2); ctx.lineTo(-s * .12, 0); ctx.lineTo(-s * .02, 0); ctx.moveTo(s * .08, -s * .2); ctx.lineTo(s * .1, 0); ctx.lineTo(s * .2, 0); ctx.stroke();
  ctx.fillStyle = '#7a3a18';
  for (const [dx, dy, r] of [[-.42, -.72, -.5], [-.48, -.6, -.9], [-.44, -.5, -1.2]]) { ctx.save(); ctx.translate(dx * s, dy * s); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, 0, s * .2, s * .07, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#e07a3c'; ctx.beginPath(); ctx.ellipse(-s * .02, -s * .45, s * .42, s * .3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f5a66a'; ctx.beginPath(); ctx.ellipse(s * .12, -s * .36, s * .22, s * .16, 0, 0, TAU); ctx.fill();
  // pescoço e cabeça (desce quando bica)
  const hx = s * (.3 + peck * .1), hy = -s * (.78 - peck * .38);
  ctx.fillStyle = '#e07a3c'; ctx.beginPath(); ctx.moveTo(s * .12, -s * .6); ctx.quadraticCurveTo(hx, hy + s * .1, hx - s * .05, hy); ctx.lineTo(s * .3, -s * .45); ctx.fill();
  ctx.fillStyle = '#e8454a';
  for (const dx of [-.06, 0, .06]) { circle(ctx, hx + dx * s, hy - s * .13, s * .055); ctx.fill(); }
  ctx.fillStyle = '#e8874c'; circle(ctx, hx, hy, s * .14); ctx.fill();
  ctx.fillStyle = '#ffc01f'; ctx.beginPath(); ctx.moveTo(hx + s * .12, hy - s * .03); ctx.lineTo(hx + s * .26, hy + s * .02); ctx.lineTo(hx + s * .12, hy + s * .06); ctx.fill();
  ctx.fillStyle = '#e8454a'; ctx.beginPath(); ctx.ellipse(hx + s * .1, hy + s * .11, s * .035, s * .06, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2b2140'; circle(ctx, hx + s * .05, hy - s * .03, s * .03); ctx.fill();
  // asa
  ctx.save(); ctx.translate(-s * .02, -s * .5); ctx.rotate(-flap * .9);
  ctx.fillStyle = '#b8582a'; ctx.beginPath(); ctx.ellipse(-s * .05, s * .06, s * .24, s * .13, -.2, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ovo balança cada vez mais, racha e sai o pintinho
function drawEgg(e, t) {
  const p = clamp01((clock - e.born + e.bonus) / HATCH_TIME), born = easeOutBack(clamp01((clock - e.born) / .35));
  const wob = Math.sin(t * (6 + p * 18)) * p * .25 + (clock - e.wobbleAt < .4 ? Math.sin((clock - e.wobbleAt) * 40) * .2 : 0);
  const w = S * .24 * born, h = S * .32 * born;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(wob);
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#d8c7a8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -h, w, h, 0, 0, TAU); ctx.fill(); ctx.stroke();
  const cracks = Math.floor(p * 4);
  if (cracks) {
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-w * .9, -h);
    for (let i = 1; i <= cracks * 2; i++) ctx.lineTo(-w * .9 + i * w * .23, -h + (i % 2 ? -h * .18 : h * .1));
    ctx.stroke();
  }
  ctx.restore();
}

function drawChick(c, t) {
  shadowAt(c.x, c.y, S * .17);
  const hop = pulse(c.hopAt, .4) + (Math.sin(t * 6 + c.born) > .9 ? .3 : 0);
  drawSprite(clock - c.born < 1.3 ? '🐣' : '🐥', c.x, c.y - hop * S * .25, S * .5, c.faceRight);
}

function drawHorse(t) {
  const age = clock - horse.at;
  if (age < .5 || age > GALLOP_TIME) return null;
  const p = (age - .5) / (GALLOP_TIME - .5), go = p < .5 ? p * 2 : 2 - p * 2, e = go * go * (3 - 2 * go);
  const b = barnBox(), x = b.x + (wX(.34) - b.x) * e, y = b.y + (H * .68 - b.y) * Math.sin(Math.min(go * 2, 1) * Math.PI / 2);
  const gal = Math.abs(Math.sin(t * 9)) * S * .18;
  shadowAt(x, y, S * .6);
  drawSprite('🐎', x, y - gal, S * 1.6, p < .5, Math.sin(t * 9) * .05);
  horse.x = x; horse.y = y;
  return { x, y };
}

function drawBits(dt, t) {
  for (const it of items) {
    const k = easeOutBack(Math.min(it.t / .3, 1));
    if (it.feeding) {
      const a = it.feeding, p = clamp01((it.t - .3) / .45);
      drawSprite(it.e, it.x + (a.x - it.x) * p, it.y + (a.y - a.s * .5 - it.y) * p, S * .7 * k * (1 - p * .4));
    } else {
      ctx.globalAlpha = Math.min(1, (1.8 - it.t) * 2);
      drawSprite(it.e, it.x, it.y - it.t * 30, S * .7 * k);
      ctx.globalAlpha = 1;
    }
  }
  if (ball && !ball.held) {
    const p = clamp01(ball.t / .7);
    drawSprite('🎾', ball.x0 + (ball.x1 - ball.x0) * p, ball.y0 + (ball.y1 - ball.y0) * p - Math.sin(p * Math.PI) * S * 1.5, S * .35, false, ball.t * 8);
  }
  for (const c of carrots) {
    const p = clamp01(c.t / .8);
    drawSprite('🥕', c.x0 + (c.x1 - c.x0) * p, c.y0 + (c.y1 - c.y0) * p - Math.sin(p * Math.PI) * H * .12, S * .6, false, p * 8);
  }
  for (const s of shells) { s.t += dt; }
  shells = shells.filter(s => s.t < .8);
  for (const s of shells) {
    ctx.globalAlpha = 1 - s.t / .8;
    ctx.fillStyle = '#fffaf0';
    for (const d of [-1, 1]) { circle(ctx, s.x + d * s.t * S * .8, s.y - Math.sin(s.t * 4) * S * .3 + s.t * S * .6, S * .1); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // lã subindo até virar nuvem
  for (const w of wool) { w.t += dt; w.x += w.vx * dt; w.y -= H * .18 * dt; }
  for (const w of wool.filter(w => w.y < H * HORIZON * .55 && !w.cloud)) {
    w.cloud = true;
    const sprite = buildCloud(Math.min(W, H) * .22);
    fluff.push({ sprite, x: w.x - camX + camX * .3 - sprite.w / 2, y: w.y, speed: rand(8, 14), rainUntil: -9, wool: true });
    if (fluff.filter(c => c.wool).length > 3) fluff.splice(fluff.findIndex(c => c.wool), 1);
  }
  wool = wool.filter(w => !w.cloud);
  ctx.fillStyle = '#fff';
  for (const w of wool) if (w.t > 0) for (const [dx, dy, r] of [[0, 0, .22], [-.2, .06, .15], [.2, .05, .16]]) { circle(ctx, w.x + dx * S, w.y + dy * S, r * S); ctx.fill(); }
  for (const h of hearty) { h.t += dt; h.y += h.vy * dt; }
  hearty = hearty.filter(h => h.t < h.life);
  for (const h of hearty) { ctx.globalAlpha = 1 - h.t / h.life; drawSprite(h.e, h.x, h.y, S * .35); }
  ctx.globalAlpha = 1;
  for (const f of flyers) { f.t += dt; f.x += Math.cos(f.t * .8 + f.seed) * 50 * dt + f.vx * dt; f.y -= 25 * dt - Math.sin(f.t * 5) * 30 * dt; }
  flyers = flyers.filter(f => f.t < 7);
  for (const f of flyers) drawSprite('🦋', f.x, f.y, S * .5, f.vx > 0, 0, .6 + .4 * Math.abs(Math.sin(f.t * 12)), 1);
  if (night > .8 && Math.random() < dt * 2) { const a = pick(animals.filter(a => !a.hidden)); zzz.push({ x: a.x, y: a.y - a.s * .9, t: 0 }); }
  for (const z of zzz) { z.t += dt; z.y -= 18 * dt; }
  zzz = zzz.filter(z => z.t < 2);
  ctx.font = `700 ${Math.round(S * .35)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center';
  for (const z of zzz) { ctx.fillStyle = `rgb(255 255 255 / ${1 - z.t / 2})`; ctx.fillText('z', z.x + Math.sin(z.t * 3) * 6, z.y); }
}

// ---------- passarinhos (da tela, não do mundo) ----------
function updateBirds(dt) {
  for (const b of birds) {
    b.x += b.dir * b.speed * dt;
    const into = b.dir > 0 ? b.x / W : 1 - b.x / W;
    if (!b.sang && into > .3) { b.sang = true; sfx.chirp(b.x / W * 2 - 1); }
  }
  birds = birds.filter(b => b.x > -b.s * 3 && b.x < W + b.s * 3);
}

// passarinho tocado dá uma cambalhota no ar e canta uma musiquinha
function tapFarmBird(x, y) {
  const b = birds.find(b => Math.hypot(x - b.x, y - b.y) < b.s * 3.5);
  if (!b) return false;
  b.loopAt = clock;
  [0, 4, 7, 12, 7].forEach((st, i) => setTimeout(() => sfx.bell(1046.5 * 2 ** (st / 12)), i * 110));
  for (let i = 0; i < 3; i++) setTimeout(() => hearts(b.x + camX, b.y, 1, '🎵'), i * 180);
  return true;
}

function drawBirds(t) {
  for (const b of birds) {
    const p = (clock - (b.loopAt ?? -9)) / 1.1;
    if (p >= 0 && p < 1) {
      const a = p * TAU, r = b.s * 3;
      drawBird({ ...b, x: b.x + Math.sin(a) * r * b.dir, y: b.y - (1 - Math.cos(a)) * r }, t);
    } else drawBird(b, t);
  }
}
