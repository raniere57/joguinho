'use strict';
// os passos da hora de dormir. Cada passo tem start, tap, move, up, update, draw (no mundo),
// drawTop (na tela, por cima do zoom) e hint (onde a mãozinha aponta quando a criança para).

const STEPS = ['brinquedos', 'pijama', 'dentes', 'historia', 'boanoite', 'luz'];
const STEP_TEXT = {
  brinquedos: 'Primeiro, vamos guardar os brinquedos na caixa!',
  pijama: 'Agora vamos vestir o pijama!',
  dentes: 'Hora de escovar os dentinhos!',
  historia: 'Agora pra caminha! Vamos ler uma historinha.',
  boanoite: 'Vamos dar boa noite pra todo mundo!',
  luz: 'Agora apaga a luz do abajur!',
};
const DONE_TEXT = {
  brinquedos: ['guardou', 'Guardou tudo! Muito bem!'], pijama: ['ficou', 'Que pijama lindo!'],
  dentes: ['limpinhos', 'Dentinhos limpinhos!'], boanoite: ['todos', 'Todo mundo já está dormindo!'],
};
const PAGES = [
  'Era uma vez uma estrelinha que morava lá no céu.',
  'Toda noite, ela brincava com a lua.',
  'Até que a estrelinha bocejou: aaah... que soninho!',
  'Então ela deitou numa nuvem bem fofinha e dormiu. Fim!',
];
const NIGHT_FRIENDS = { lua: 'Boa noite, lua!', estrelas: 'Boa noite, estrelinhas!', coruja: 'Boa noite, corujinha!', pelucia: 'Boa noite, ursinho de pelúcia!' };
const TOYS = ['⚽', '🚗', '🦆', '🧩', '🪀'];
const CLOTHES = ['blusa', 'calca', 'touca'];
const TOY_SPOTS = {
  portrait: [[.33, .765], [.4, .845], [.83, .775], [.94, .83], [.78, .865]],
  landscape: [[.23, .93], [.3, .74], [.4, .83], [.48, .93], [.76, .9]],
};
const FLY = .6, BRUSH_WORK = 11, TWINKLE = [[523.25, 1], [523.25, 1], [783.99, 1], [783.99, 1], [880, 1], [880, 1], [783.99, 2],
  [698.46, 1], [698.46, 1], [659.25, 1], [659.25, 1], [587.33, 1], [587.33, 1], [523.25, 2]];

const hero = { b: BICHOS[0], v: newLook(), pose: 'stand', hopAt: -99, blinkAt: 0 };
let items = [], grab = null, brush = null, foam = [], scrub = 0, book = null, lullaby = null, allAsleepAt = 0;

// ---------- itens que voam pra um alvo (brinquedo pra caixa, roupa pro bichinho) ----------
function itemSize() { return R0 * 1.15; }
function heroTarget(id) {
  const [hx, hy] = headCenter(spot.x, spot.y, R0);
  return id === 'touca' ? [hx, hy - R0 * .7] : id === 'calca' ? [spot.x, spot.y - R0 * .7] : [spot.x, spot.y - R0 * 1.3];
}
function targetOf(it) { return it.kind === 'toy' ? boxMouth() : heroTarget(it.id); }
function itemPos(it) {
  if (it.state !== 'fly') return [it.x, it.y];
  const p = Math.min((clock - it.at) / FLY, 1), [tx, ty] = targetOf(it), e = p * p * (3 - 2 * p);
  return [it.x0 + (tx - it.x0) * e, it.y0 + (ty - it.y0) * e - Math.sin(p * Math.PI) * R0 * 2];
}
function sendItem(it) {
  [it.x0, it.y0] = [it.x, it.y]; it.state = 'fly'; it.at = clock;
  sfx.whoosh(); lastAct = clock;
}
function itemAt(x, y) {
  return items.filter(it => it.state === 'floor').find(it => Math.hypot(x - it.x, y - (it.y - itemSize() * .35)) < itemSize() * .7);
}
function updateItems(onLand) {
  for (const it of items) if (it.state === 'fly' && clock - it.at >= FLY) { it.state = 'in'; onLand(it); }
}
function drawItems(t) {
  for (const it of items) {
    if (it.state === 'in') continue;
    const [x, y] = itemPos(it), s = itemSize(), flying = it.state === 'fly', wig = it.state === 'floor' ? Math.sin(t * 2 + it.x) * .06 : 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(flying ? (clock - it.at) * 8 : wig);
    if (flying) ctx.scale(1 - (clock - it.at) / FLY * .4, 1 - (clock - it.at) / FLY * .4);
    if (it.kind === 'toy') { const sz = Math.round(s / 4) * 4; ctx.drawImage(emojiSprite(it.id, sz), -sz / 2, -sz * .85, sz, sz); }
    else drawCloth(ctx, it.id, 0, -s * .4, s);
    ctx.restore();
  }
}
function grabTap(x, y) {
  const it = itemAt(x, y);
  if (!it) return false;
  grab = { it, sx: x, sy: y, moved: false };
  return true;
}
function grabMove(x, y) {
  if (!grab) return;
  if (Math.hypot(x - grab.sx, y - grab.sy) > 12) grab.moved = true;
  if (grab.moved) { grab.it.x = x; grab.it.y = y + itemSize() * .35; }
}
function grabUp(dropNear) {
  if (!grab) return;
  const it = grab.it, [tx, ty] = targetOf(it);
  if (!grab.moved || Math.hypot(it.x - tx, it.y - ty) < dropNear) sendItem(it);   // tocar também manda sozinho
  else it.y = Math.max(it.y, floorY + itemSize() * .6);
  grab = null;
}

function drawCloth(g, id, x, y, s) {
  g.save(); g.translate(x, y);
  g.fillStyle = PJ.c;
  if (id === 'blusa') {
    g.beginPath(); g.moveTo(-s * .2, -s * .38); g.lineTo(-s * .48, -s * .2); g.lineTo(-s * .38, s * .02); g.lineTo(-s * .26, -s * .06);
    g.lineTo(-s * .26, s * .38); g.lineTo(s * .26, s * .38); g.lineTo(s * .26, -s * .06); g.lineTo(s * .38, s * .02); g.lineTo(s * .48, -s * .2);
    g.lineTo(s * .2, -s * .38); g.quadraticCurveTo(0, -s * .22, -s * .2, -s * .38); g.fill();
    dots(g, 0, s * .08, s * .2, s * .22);
  } else if (id === 'calca') {
    g.beginPath(); g.moveTo(-s * .28, -s * .38); g.lineTo(s * .28, -s * .38); g.lineTo(s * .32, s * .4); g.lineTo(s * .06, s * .4);
    g.lineTo(0, -s * .05); g.lineTo(-s * .06, s * .4); g.lineTo(-s * .32, s * .4); g.closePath(); g.fill();
    g.fillStyle = PJ.d; g.fillRect(-s * .28, -s * .38, s * .56, s * .08);
    dots(g, 0, s * .05, s * .22, s * .2);
  } else {
    g.translate(0, s * .25); nightcap(g, s * .42, clock);
  }
  g.restore();
}

// ---------- passos ----------
const STEP_DEFS = {
  brinquedos: {
    start() {
      const spots = TOY_SPOTS[H > W ? 'portrait' : 'landscape'];
      items = TOYS.map((e, i) => ({ kind: 'toy', id: e, x: W * spots[i][0], y: H * spots[i][1], state: 'floor' }));
    },
    tap: (x, y) => grabTap(x, y),
    move: grabMove,
    up: () => grabUp(box.w * .8),
    update() {
      updateItems(() => { boxLid.at = clock; sfx.pop(); burst(...boxMouth(), R0 * .3, 200, 8); });
      if (items.every(it => it.state === 'in')) stepDone();
    },
    draw: drawItems,
    hint() { const it = items.find(it => it.state === 'floor'); return it && [it.x, it.y - itemSize() * .3]; },
  },
  pijama: {
    start() {
      items = CLOTHES.map((id, i) => ({ kind: 'cloth', id, x: bed.x + bed.w * (.25 + i * .22), y: bed.top + R0 * .1, state: 'floor' }));
    },
    tap: (x, y) => grabTap(x, y),
    move: grabMove,
    up: () => grabUp(R0 * 2),
    update() {
      updateItems(it => {
        if (it.id === 'blusa') hero.v.top = 'pj'; else if (it.id === 'calca') hero.v.bottom = 'pj'; else hero.v.hat = true;
        sfx.pop(); sfx.chime(); hero.hopAt = clock;
        burst(...targetOf(it), R0 * .5, 200, 14);
      });
      if (items.every(it => it.state === 'in')) stepDone();
    },
    draw: drawItems,
    hint() { const it = items.find(it => it.state === 'floor'); return it && [it.x, it.y - itemSize() * .3]; },
  },
  dentes: {
    start() {
      scrub = 0; foam = []; brush = null;
      hero.v.mouth = 'teeth';
      say('b-ahh', 'Ahhh!', true);
    },
    tap(x, y) { brush = { x, y }; scrubAt(x, y, 0); return true; },
    move(x, y) { if (!brush) return; const d = Math.hypot(x - brush.x, y - brush.y); brush.x = x; brush.y = y; scrubAt(x, y, d); },
    up() { brush = null; },
    update() { if (scrub >= 1 && hero.v.mouth === 'teeth') { hero.v.mouth = 'smile'; foam = []; stepDone(); } },
    draw(t) {   // espuminha na boca (mundo)
      const [mx, my] = mouthCenter(spot.x, spot.y, R0);
      for (const f of foam) { ctx.fillStyle = 'rgb(255 255 255 / .92)'; circle(ctx, mx + f.dx * R0, my + f.dy * R0, f.r * R0 * (1 + Math.sin(t * 5 + f.dx * 9) * .08)); ctx.fill(); }
    },
    drawTop(t) {
      const [mx, my] = toScreen(...mouthCenter(spot.x, spot.y, R0)), z = cam.z;
      const [bx, by] = brush ? [brush.x, brush.y] : [mx + R0 * z * 1.2, my + R0 * z * .3 + Math.sin(t * 3) * 6];
      drawToothbrush(bx, by, R0 * z * .5, brush ? Math.sin(t * 25) * .2 : -.3);
      if (scrub > 0 && scrub < 1) {   // barrinha de brilho
        ctx.fillStyle = 'rgb(255 255 255 / .6)'; ctx.fillRect(mx - R0 * z * .6, my + R0 * z * .75, R0 * z * 1.2, 8);
        ctx.fillStyle = '#5ad16e'; ctx.fillRect(mx - R0 * z * .6, my + R0 * z * .75, R0 * z * 1.2 * scrub, 8);
      }
    },
    hint() { return brush ? null : toScreen(...mouthCenter(spot.x, spot.y, R0)); },
    screenHint: true,
  },
  historia: {
    start() { hero.pose = 'hop'; hero.hopAt = clock; book = null; sfx.boing(); },
    tap() {
      if (!book || clock - book.pageAt < 1.3 || book.closeAt) return true;
      if (book.page >= PAGES.length - 1) { book.closeAt = clock; sfx.whoosh(); setTimeout(stepDone, 500); return true; }
      book.page++; book.pageAt = clock; book.turnAt = clock; sfx.whoosh();
      say('pag' + (book.page + 1), PAGES[book.page]);
      return true;
    },
    update() {
      if (hero.pose === 'hop' && clock - hero.hopAt > .9) { hero.pose = 'bed'; sfx.pop(); }
      if (hero.pose === 'bed' && !book && clock - hero.hopAt > 1.4) {
        book = { page: 0, at: clock, pageAt: clock, turnAt: -99, closeAt: 0 };
        say('pag1', PAGES[0], true);
      }
      if (book) lastAct = Math.max(lastAct, book.pageAt);   // enquanto lê, não repete a instrução
    },
    drawTop: drawBook,
    hint() { return book && !book.closeAt && clock - book.pageAt > 5 ? [W / 2 + bookSize()[0] * .38, H / 2 + bookSize()[1] * .3] : null; },
    screenHint: true,
  },
  boanoite: {
    start() {},
    tap(x, y) {
      const id = friendAt(x, y);
      if (!id) return false;
      nod[id] = clock; lastAct = clock;
      if (!asleep[id]) { asleep[id] = true; say('bn-' + id, NIGHT_FRIENDS[id]); if (Object.values(asleep).every(Boolean)) allAsleepAt = clock; }
      if (id === 'coruja') sfx.hoot(); else if (id === 'lua') sfx.chime(); else if (id === 'estrelas') sfx.fanfare(); else sfx.giggle();
      return true;
    },
    update() { if (Object.values(asleep).every(Boolean) && clock - allAsleepAt > 1.8) stepDone(); },
    hint() {
      const id = Object.keys(asleep).find(k => !asleep[k]);
      if (!id) return null;
      return id === 'lua' ? moonPos() : id === 'coruja' ? owlPos() : id === 'pelucia' ? [pelPos()[0], pelPos()[1] - R0 * .5] : [win.x + win.w * .35, win.y + win.h * .12];
    },
  },
  luz: {
    start() { lamp.on = true; },
    tap(x, y) {
      if (!hitLamp(x, y) || !lamp.on) return false;
      lamp.on = false; lamp.tapAt = clock; sfx.click();
      hero.v.eyes = 'sleepy'; say('b-bocejo', 'Aaaah... que soninho...'); hero.v.mouth = 'yawn';
      setTimeout(() => { hero.v.mouth = 'smile'; hero.v.eyes = 'closed'; }, 2200);
      setTimeout(() => { lullaby = sfx.musicBox(TWINKLE, .55); }, 1200);
      stepDone();
      return true;
    },
    hint() { const [x, y] = lampPos(); return lamp.on ? [x, y - R0 * .9] : null; },
  },
};

function scrubAt(x, y, d) {
  const [mx, my] = toScreen(...mouthCenter(spot.x, spot.y, R0)), z = cam.z;
  if (Math.hypot(x - mx, y - my) > R0 * z * .9 || scrub >= 1) return;
  scrub = Math.min(1, scrub + (d + 4) / (R0 * z * BRUSH_WORK));
  lastAct = clock;
  if (clock - (brush?.soundAt ?? -99) > .12) { sfx.brush(); if (brush) brush.soundAt = clock; }
  if (foam.length < 26 && Math.random() < .5) foam.push({ dx: rand(-.4, .4), dy: rand(.25, .75), r: rand(.06, .12) });
}

function drawToothbrush(x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.6 + rot);
  ctx.fillStyle = '#ff7aa8'; ctx.beginPath(); ctx.roundRect?.(s * .1, -s * .1, s * 1.6, s * .2, s * .1); ctx.fill();
  ctx.fillStyle = '#4fb4ff'; ctx.beginPath(); ctx.roundRect?.(-s * .35, -s * .14, s * .5, s * .22, s * .06); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) ctx.fillRect(-s * .32 + i * s * .09, -s * .38, s * .06, s * .26);
  ctx.fillStyle = 'rgb(255 255 255 / .9)'; circle(ctx, -s * .1, -s * .42, s * .1); ctx.fill();
  ctx.restore();
}

// ---------- boa noite ----------
function friendAt(x, y) {
  const [mx, my] = moonPos(), [ox, oy] = owlPos(), [px, py] = pelPos(), s = Math.min(win.w, win.h);
  if (Math.hypot(x - mx, y - my) < s * .26) return 'lua';
  if (Math.hypot(x - ox, y - (oy - s * .1)) < s * .22) return 'coruja';
  if (Math.hypot(x - px, y - (py - R0 * .5)) < R0 * .9) return 'pelucia';
  if (x > win.x && x < win.x + win.w && y > win.y && y < win.y + win.h) return 'estrelas';
  return null;
}

function drawFriendGlow(t) {
  if (STEPS[stepI] !== 'boanoite') return;
  for (const id of Object.keys(asleep)) {
    if (asleep[id]) continue;
    const [x, y] = id === 'lua' ? moonPos() : id === 'coruja' ? owlPos() : id === 'pelucia' ? [pelPos()[0], pelPos()[1] - R0 * .5] : [win.x + win.w * .35, win.y + win.h * .12];
    ctx.strokeStyle = `rgb(255 245 170 / ${.5 + .4 * Math.sin(t * 4)})`; ctx.lineWidth = 3;
    circle(ctx, x, y - (id === 'coruja' ? Math.min(win.w, win.h) * .1 : 0), R0 * .7); ctx.stroke();
  }
}

// ---------- livro da historinha ----------
function bookSize() {
  const w = Math.min(W * .92, H * (H > W ? .52 : 1.25));
  return [w, w * (H > W ? .78 : .6)];
}

function drawBook(t) {
  if (!book) return;
  const open = Math.min((clock - book.at) / .5, 1) * (book.closeAt ? Math.max(0, 1 - (clock - book.closeAt) / .4) : 1);
  if (open <= 0) return;
  const [bw, bh] = bookSize(), x = W / 2, y = H / 2;
  ctx.fillStyle = `rgb(20 20 50 / ${.35 * open})`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(x, y); ctx.scale(open, open);
  ctx.fillStyle = '#b05a7a'; ctx.beginPath(); ctx.roundRect?.(-bw / 2 - 10, -bh / 2 - 10, bw + 20, bh + 20, 18); ctx.fill();
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect?.(-bw / 2, -bh / 2, bw, bh, 12); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect?.(-bw / 2 + 12, -bh / 2 + 12, bw - 24, bh - 24, 10); ctx.clip();
  drawPage(book.page, 0, 0, bw - 24, bh - 24, t);
  ctx.restore();
  ctx.fillStyle = 'rgb(0 0 0 / .08)'; ctx.fillRect(-3, -bh / 2, 6, bh);   // lombada
  const turn = (clock - book.turnAt) / .5;
  if (turn >= 0 && turn < 1) {   // folha virando
    ctx.save(); ctx.scale(1 - turn * 2, 1);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, -bh / 2, bw / 2, bh);
    ctx.fillStyle = `rgb(0 0 0 / ${.1 * Math.sin(turn * Math.PI)})`; ctx.fillRect(0, -bh / 2, bw / 2, bh);
    ctx.restore();
  }
  for (let i = 0; i < PAGES.length; i++) {   // bolinhas das páginas
    ctx.fillStyle = i === book.page ? '#b05a7a' : 'rgb(176 90 122 / .3)'; circle(ctx, (i - (PAGES.length - 1) / 2) * 16, bh / 2 - 16, 5); ctx.fill();
  }
  ctx.restore();
}

function drawPage(i, x, y, w, h, t) {
  const sky = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  sky.addColorStop(0, '#2a3a7a'); sky.addColorStop(1, '#5a5aa8');
  ctx.fillStyle = sky; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgb(255 245 180 / .7)';
  for (let k = 0; k < 14; k++) star(ctx, -w / 2 + ((k * 53) % 97) / 97 * w, -h / 2 + ((k * 31) % 61) / 61 * h * .8, 2.5 + (k % 3), -Math.PI / 2);
  const s = Math.min(w, h);
  if (i === 0) happyStar(x, y - s * .05 + Math.sin(t * 2) * s * .03, s * .22, 'open', t);
  if (i === 1) {
    drawMoon(ctx, x - w * .18, y - s * .05, s * .2, false, t);
    happyStar(x + w * .2 + Math.cos(t * 2) * s * .05, y - s * .1 + Math.sin(t * 4) * s * .08, s * .13, 'open', t);
  }
  if (i === 2) happyStar(x, y, s * .24, 'yawn', t);
  if (i === 3) {
    ctx.fillStyle = '#fff';
    for (const [dx, dy, r] of [[-.22, .12, .14], [0, .05, .2], [.22, .12, .14], [0, .18, .16]]) { circle(ctx, x + dx * w * .8, y + dy * s, r * s); ctx.fill(); }
    happyStar(x, y - s * .12, s * .16, 'closed', t);
    zzzAt(x + s * .2, y - s * .25, s * .12, t);
  }
}

function happyStar(x, y, r, mood, t) {
  const glow = ctx.createRadialGradient(x, y, r * .3, x, y, r * 1.6);
  glow.addColorStop(0, 'rgb(255 235 140 / .55)'); glow.addColorStop(1, 'rgb(255 235 140 / 0)');
  ctx.fillStyle = glow; circle(ctx, x, y, r * 1.6); ctx.fill();
  ctx.fillStyle = '#ffd23b'; star(ctx, x, y, r, -Math.PI / 2 + Math.sin(t * 2) * .08);
  ctx.save(); ctx.translate(x, y + r * .1);
  ctx.strokeStyle = '#6b4a1a'; ctx.fillStyle = '#6b4a1a'; ctx.lineWidth = r * .07; ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    if (mood === 'closed') { ctx.beginPath(); ctx.arc(d * r * .2, -r * .08, r * .09, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); }
    else { circle(ctx, d * r * .2, -r * .08, r * .07); ctx.fill(); }
  }
  if (mood === 'yawn') { ctx.fillStyle = '#7a2438'; ctx.beginPath(); ctx.ellipse(0, r * .15, r * .09, r * .13, 0, 0, TAU); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, r * .08, r * .1, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = 'rgb(255 120 150 / .5)'; for (const d of [-1, 1]) { circle(ctx, d * r * .33, r * .08, r * .07); ctx.fill(); }
  ctx.restore();
}
