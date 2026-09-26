'use strict';
// a bebê: desenho (roupinha, humor e estados como sujinha, chorando, com frio) e o que ela faz
// quando a criança toca em cada parte dela (nariz espirra, barriga faz cócegas, pezinho chuta...)

const SKIN = ['#ffe0c4', '#f3bf95'], HAIR = '#6b4226';
// roupinhas: cores do macacão e o desenho na barriga
const SUITS = [
  { c: ['#ffd1e6', '#ffa8cf'], mark: 'heart' },
  { c: ['#cfe8ff', '#9ccaff'], mark: 'star' },
  { c: ['#d4f7e6', '#9fe6c2'], mark: 'duck' },
  { c: ['#fff3b0', '#ffe066'], mark: 'flower' },
  { c: ['#e6d6ff', '#c3a5ff'], mark: 'cloud' },
  { c: ['#ffd6cc', '#ff9f8a'], mark: 'dots' },
];
const HEADS = ['laco', 'chapeu', 'coroa', 'coelho', 'flor', 'bone'];
const SHOES = [null, '#ff6fa8', '#4fb4ff', '#ffc930', '#5ad16e', '#b77cff'];
const POKE_TIME = { nariz: 1.1, boca: .9, bochecha: .8, pe: .9, mao: 1.1, barriga: 1.2, cabeca: 1.4, rosto: .9 };
const LAUGH_PARTS = ['bochecha', 'pe', 'mao', 'barriga', 'rosto'];

const baby = { x: 0, y: 0, s: 0, hx: 0, hy: 0, hs: 0, rot: 0, laughAt: -99, blinkAt: 0, lookX: 0, lookY: 0, armsUp: 0, poke: null };
// como a bebê está agora: montado a cada quadro pelo jogo (pedido pendente + cuidado em andamento)
const LOOK0 = {
  dirty: 0, stinky: false, crying: false, sniff: false, cold: false, bump: false, bandage: false, bib: false,
  diaper: null, gorro: false, scarf: false, blanket: 0, peek: 0, sleepy: false, reach: false, food: 0,
  eyes: null, mouth: null, teethShine: false,
};
let look = { ...LOOK0 };

// ---------- roupa salva no aparelho ----------
const OUTFIT_KEY = 'bebe-roupa-v1';
function loadOutfit() {
  const fallback = { suit: 0, head: 'laco', shoes: 0 };
  try {
    const o = JSON.parse(localStorage.getItem(OUTFIT_KEY));
    if (!o) return fallback;
    return {
      suit: Number.isInteger(o.suit) && SUITS[o.suit] ? o.suit : 0,
      head: HEADS.includes(o.head) ? o.head : 'laco',
      shoes: Number.isInteger(o.shoes) && o.shoes >= 0 && o.shoes < SHOES.length ? o.shoes : 0,
    };
  } catch { return fallback; }
}
function saveOutfit() {
  try { localStorage.setItem(OUTFIT_KEY, JSON.stringify(outfit)); } catch { /* sem espaço ou bloqueado: só não guarda */ }
}
let outfit = loadOutfit();

// ---------- toques no corpo ----------
function babyPart(x, y) {
  const { x: bx, y: by, s } = baby, lx = (x - bx) / s, ly = (y - by) / s;
  const near = (px, py, r) => Math.hypot(lx - px, ly - py) < r;
  if (near(0, .2, .17)) return 'nariz';
  if (near(0, .46, .2)) return 'boca';
  if (near(-.58, .3, .28) || near(.58, .3, .28)) return 'bochecha';
  if (near(-.45, 2.02, .36) || near(.45, 2.02, .36)) return 'pe';
  if (near(-.38, 1.53, .24) || near(.38, 1.53, .24)) return 'mao';
  if (near(0, 1.3, .85)) return 'barriga';
  if (Math.hypot(lx, ly) < 1.25) return ly < -.35 ? 'cabeca' : 'rosto';
  return null;
}

function pokeAge(part) { const p = baby.poke; return p && p.part === part && clock - p.at < POKE_TIME[part] ? clock - p.at : -1; }

function pokeBaby(part, x, y) {
  baby.poke = { part, side: Math.sign(x - baby.x) || 1, at: clock };
  const pan = (baby.x / W) * 2 - 1, { s } = baby;
  switch (part) {
    case 'nariz':
      say('b-atchim', 'Atchim!');
      setTimeout(() => { if (baby.poke?.part === 'nariz') burst(baby.x, baby.y + s * .3, s * .25, 195, 12); }, 380);
      break;
    case 'boca':
      say('b-mua', 'Muá!');
      heartBurst(baby.x, baby.y + s * .3, 3);
      kisses.push({ x: baby.x, y: baby.y + s * .45, t: 0 });
      break;
    case 'bochecha': sfx.squeak(); sfx.giggle(pan); break;
    case 'pe': sfx.giggle(pan); if (Math.random() < .5) say('b-ri', 'Hihihi!'); break;
    case 'mao': sfx.clap(3); if (Math.random() < .5) say('b-eba', 'Ebaaa!'); break;
    case 'barriga': baby.laughAt = clock; sfx.giggle(pan); say('b-ri', 'Hihihi!'); break;
    case 'cabeca': say('b-hmm', 'Hummm!'); heartBurst(baby.x, baby.y - s * .8, 4); break;
    default: baby.laughAt = clock; sfx.giggle(pan); heartBurst(x, y, 3);
  }
}

// ---------- humor → olhos e boca ----------
function face(t) {
  if (look.eyes) return [look.eyes, look.mouth || 'smile'];
  if (mode === 'sono') return night > .6 ? ['sleep', 'o'] : ['sleepy', 'o'];
  const p = baby.poke, pt = p ? clock - p.at : 99;
  if (p && pt < POKE_TIME[p.part]) {
    if (p.part === 'nariz') return pt < .38 ? ['squeeze', 'o'] : ['squeeze', 'open'];
    if (p.part === 'boca') return ['happy', 'kiss'];
    if (p.part === 'cabeca') return ['happy', 'smile'];
    return ['happy', 'laugh'];
  }
  if (look.crying) return ['squeeze', 'cry'];
  if (clock - baby.laughAt < 1.2) return ['happy', 'laugh'];
  if (look.sniff) return ['open', 'pout'];
  if (look.cold) return ['open', 'chatter'];
  if (look.sleepy) return (t % 5) < 1.3 ? ['sleep', 'yawn'] : ['drowsy', 'pout'];
  if (look.mouth) return ['open', look.mouth];
  if (need && mode === 'idle') return ['open', 'pout'];
  return ['open', 'smile'];
}

function eye(x, y, s, kind, blink) {
  ctx.strokeStyle = '#3b2a55'; ctx.fillStyle = '#3b2a55'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * .07;
  if (kind === 'happy') { ctx.beginPath(); ctx.arc(x, y + s * .05, s * .12, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); return; }
  if (kind === 'sleep' || kind === 'sleepy') { ctx.beginPath(); ctx.arc(x, y - s * .02, s * .12, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); return; }
  if (kind === 'squeeze') {
    const d = x < 0 ? 1 : -1;   // > <
    ctx.beginPath(); ctx.moveTo(x - d * s * .1, y - s * .08); ctx.lineTo(x + d * s * .08, y); ctx.lineTo(x - d * s * .1, y + s * .08); ctx.stroke();
    return;
  }
  const lx = baby.lookX * s * .04, ly = baby.lookY * s * .03, big = kind === 'wide' ? 1.2 : 1;
  const lid = kind === 'drowsy' ? .5 : 1;
  ctx.beginPath(); ctx.ellipse(x + lx, y + ly + (1 - lid) * s * .06, s * .11 * big, s * .15 * big * blink * lid, 0, 0, TAU); ctx.fill();
  if (kind === 'drowsy') { ctx.beginPath(); ctx.moveTo(x - s * .14, y - s * .02); ctx.lineTo(x + s * .14, y - s * .02); ctx.stroke(); }
  if (blink > .5 && lid === 1) {
    ctx.fillStyle = '#fff';
    circle(ctx, x + lx + s * .04, y + ly - s * .05, s * .04 * big); ctx.fill();
    circle(ctx, x + lx - s * .03, y + ly + s * .05, s * .018); ctx.fill();
  }
}

function teeth(y, s) {
  ctx.fillStyle = '#fff';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect?.(side * s * .025 - (side < 0 ? s * .06 : 0), y, s * .06, s * .06, s * .015); ctx.fill(); }
  if (look.teethShine) for (const side of [-1, 1]) sparkleAt(side * s * .03, y + s * .03, s * .07 * (1 + .4 * Math.sin(clock * 12 + side)));
}

function sparkleAt(x, y, r) {
  ctx.fillStyle = '#fffbd0';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
}

function mouth(s, kind, t) {
  ctx.strokeStyle = '#a3485f'; ctx.fillStyle = '#c24d6a'; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
  const y = s * .45;
  switch (kind) {
    case 'smile': ctx.beginPath(); ctx.arc(0, y - s * .1, s * .16, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); break;
    case 'laugh':
      ctx.beginPath(); ctx.arc(0, y - s * .06, s * .17, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.ellipse(0, y + s * .06, s * .08, s * .04, 0, 0, TAU); ctx.fill();
      break;
    case 'teeth':
      ctx.beginPath(); ctx.arc(0, y - s * .08, s * .19, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.ellipse(0, y + s * .05, s * .09, s * .045, 0, 0, TAU); ctx.fill();
      teeth(y - s * .08, s);
      break;
    case 'pout': ctx.beginPath(); ctx.arc(0, y + s * .1, s * .1, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); break;
    case 'cry':
      ctx.beginPath(); ctx.ellipse(0, y + s * .02, s * .15, s * (.11 + .02 * Math.sin(t * 9)), 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, y + s * .02, s * .15, s * .05, 0, 0, Math.PI); ctx.fill();
      break;
    case 'suck': { const k = 1 + .25 * Math.sin(t * 14); ctx.beginPath(); ctx.ellipse(0, y, s * .07 * k, s * .07, 0, 0, TAU); ctx.fill(); break; }
    case 'wide': ctx.beginPath(); ctx.ellipse(0, y, s * .14, s * .15, 0, 0, TAU); ctx.fill(); break;
    case 'yawn': ctx.beginPath(); ctx.ellipse(0, y + s * .02, s * .1, s * .15, 0, 0, TAU); ctx.fill(); break;
    case 'open': ctx.beginPath(); ctx.ellipse(0, y, s * .11, s * .1, 0, 0, TAU); ctx.fill(); break;
    case 'chew': {
      const k = Math.sin(t * 16);
      ctx.beginPath(); ctx.moveTo(-s * .1, y); ctx.quadraticCurveTo(0, y + s * .05 * k, s * .1, y); ctx.stroke();
      break;
    }
    case 'chatter': {
      const k = Math.abs(Math.sin(t * 30));
      ctx.fillStyle = '#c24d6a'; ctx.beginPath(); ctx.roundRect?.(-s * .12, y - s * .03, s * .24, s * (.05 + .05 * k), s * .03); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-s * .1, y - s * .03, s * .2, s * .03);
      break;
    }
    case 'kiss':
      ctx.fillStyle = '#e8577a'; ctx.beginPath(); ctx.ellipse(0, y, s * .07, s * .06, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff9fb8'; circle(ctx, -s * .02, y - s * .02, s * .02); ctx.fill();
      break;
    default: ctx.beginPath(); ctx.ellipse(0, y, s * .05, s * .06, 0, 0, TAU); ctx.fill();
  }
}

// ---------- corpinho ----------
function drawMark(g, mark, s) {
  const y = -s * .05;
  switch (mark) {
    case 'heart': g.fillStyle = '#fff'; heartPath(g, 0, y, s * .22); g.fill(); break;
    case 'star': g.fillStyle = '#ffe066'; star(g, 0, y, s * .27, -Math.PI / 2); g.fillStyle = '#fff'; star(g, 0, y, s * .12, -Math.PI / 2); break;
    case 'duck':
      g.fillStyle = '#ffd23b';
      g.beginPath(); g.ellipse(-s * .04, y + s * .06, s * .22, s * .14, 0, 0, TAU); g.fill();
      circle(g, s * .12, y - s * .1, s * .11); g.fill();
      g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(s * .21, y - s * .12); g.lineTo(s * .32, y - s * .08); g.lineTo(s * .21, y - s * .05); g.fill();
      g.fillStyle = '#3b2a55'; circle(g, s * .14, y - s * .13, s * .022); g.fill();
      break;
    case 'flower':
      g.fillStyle = '#ff8fc0';
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; circle(g, Math.cos(a) * s * .14, y + Math.sin(a) * s * .14, s * .1); g.fill(); }
      g.fillStyle = '#fff'; circle(g, 0, y, s * .08); g.fill();
      break;
    case 'cloud':
      g.fillStyle = '#fff';
      for (const [dx, dy, r] of [[-.14, .03, .1], [0, -.05, .14], [.14, .03, .1], [0, .06, .1]]) { circle(g, dx * s, y + dy * s, r * s); g.fill(); }
      break;
    case 'dots':
      g.save(); g.beginPath(); g.ellipse(0, 0, s * .82, s * .78, 0, 0, TAU); g.clip();
      g.fillStyle = 'rgb(255 255 255 / .85)';
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { circle(g, (i + (j % 2) * .5) * s * .26, j * s * .24, s * .055); g.fill(); }
      g.restore();
      break;
  }
}

function drawFoot(g, s, shoe) {
  g.fillStyle = SKIN[0];
  g.beginPath(); g.ellipse(0, 0, s * .26, s * .2, 0, 0, TAU); g.fill();
  if (!shoe) {
    g.fillStyle = SKIN[1];
    for (let i = 0; i < 4; i++) { circle(g, -s * .12 + i * s * .08, -s * .14, s * .035); g.fill(); }
    return;
  }
  g.fillStyle = shoe;
  g.beginPath(); g.ellipse(0, s * .02, s * .28, s * .21, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(0, -s * .13, s * .2, s * .07, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .5)'; circle(g, -s * .1, s * .02, s * .05); g.fill();
}

function drawBody(s, t, breathe) {
  const suit = SUITS[outfit.suit], tickle = pokeAge('barriga') >= 0 ? Math.sin(t * 30) * .06 : 0;
  ctx.save();
  ctx.translate(0, s * 1.3); ctx.rotate(tickle); ctx.scale(1, breathe);
  for (const side of [-1, 1]) {
    const pa = pokeAge('pe'), kick = pa >= 0 && baby.poke.side === side ? Math.sin(pa / POKE_TIME.pe * Math.PI) : 0;
    ctx.save();
    ctx.translate(side * s * .45, s * .72 - kick * s * .25); ctx.rotate(side * (.3 + kick * .5 + (kick ? Math.sin(t * 25) * .15 : 0)));
    drawFoot(ctx, s, SHOES[outfit.shoes]);
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, -s * .8, 0, s * .8);
  g.addColorStop(0, suit.c[0]); g.addColorStop(1, suit.c[1]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, s * .82, s * .78, 0, 0, TAU); ctx.fill();
  drawMark(ctx, suit.mark, s);
  if (look.dirty) {
    ctx.fillStyle = `rgb(140 95 60 / ${.45 * look.dirty})`;
    for (const [dx, dy, r] of [[-.35, .15, .13], [.4, .38, .1], [.1, .5, .08]]) { circle(ctx, dx * s, dy * s, r * s); ctx.fill(); }
  }
  if (look.diaper) drawDiaper(ctx, 0, s * .52, s * .9, look.diaper);
  if (look.bib) drawBib(s);
  if (look.blanket) drawBlanket(s, look.blanket);
  if (look.scarf) drawScarf(s, t);
  ctx.restore();
}

// fralda vista de frente; dirty = amarelada com manchinha
function drawDiaper(g, x, y, s, kind, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = kind === 'dirty' ? '#f4e7b8' : '#fff';
  g.strokeStyle = kind === 'dirty' ? '#d9c37e' : '#bfe3ff'; g.lineWidth = s * .04;
  g.beginPath();
  g.moveTo(-s * .62, -s * .22);
  g.quadraticCurveTo(-s * .55, s * .2, -s * .2, s * .38);
  g.quadraticCurveTo(0, s * .45, s * .2, s * .38);
  g.quadraticCurveTo(s * .55, s * .2, s * .62, -s * .22);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = kind === 'dirty' ? '#c9a24c' : '#8fd0ff';
  for (const side of [-1, 1]) { g.beginPath(); g.roundRect?.(side * s * .62 - s * .09, -s * .24, s * .18, s * .12, s * .04); g.fill(); }
  if (kind === 'dirty') { g.fillStyle = 'rgb(150 110 40 / .45)'; g.beginPath(); g.ellipse(0, s * .18, s * .16, s * .1, 0, 0, TAU); g.fill(); }
  else { g.fillStyle = '#ffd1e6'; star(g, 0, s * .08, s * .09, -Math.PI / 2); }
  g.restore();
}

function drawBib(s) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ff9fc6'; ctx.lineWidth = s * .05;
  ctx.beginPath(); ctx.ellipse(0, -s * .4, s * .46, s * .36, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff9fc6'; heartPath(ctx, 0, -s * .38, s * .12); ctx.fill();
  if (look.food) {
    ctx.fillStyle = '#ff9a3d';
    for (let i = 0; i < look.food; i++) { circle(ctx, (noise01(i) - .5) * s * .6, -s * .3 + noise01(i + 7) * s * .2, s * .04); ctx.fill(); }
  }
}

function drawBlanket(s, k) {
  const e = easeOutBack(clamp01(k));
  ctx.save(); ctx.translate(0, (1 - e) * s * 1.2); ctx.globalAlpha = clamp01(k * 2);
  ctx.fillStyle = '#9fd4ff';
  ctx.beginPath(); ctx.roundRect?.(-s * 1.05, -s * .05, s * 2.1, s * 1.05, s * .25); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) star(ctx, -s * .8 + i * s * .4, s * .3 + j * s * .38, s * .06, 0);
  ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.roundRect?.(-s * 1.05, -s * .1, s * 2.1, s * .22, s * .1); ctx.fill();
  ctx.restore();
}

function drawScarf(s, t) {
  ctx.fillStyle = '#ff5f5f';
  ctx.beginPath(); ctx.ellipse(0, -s * .66, s * .6, s * .17, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(s * .3, -s * .6); ctx.rotate(-.12 + Math.sin(t * 2) * .05);
  ctx.beginPath(); ctx.roundRect?.(-s * .1, 0, s * .2, s * .55, s * .05); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const y of [.15, .35]) ctx.fillRect(-s * .1, y * s, s * .2, s * .06);
  ctx.restore();
  ctx.fillStyle = '#fff';
  for (const x of [-.35, 0, .35]) ctx.fillRect(x * s - s * .04, -s * .8, s * .08, s * .28);
}

// ---------- cabeça ----------
function drawHair(s) {
  ctx.fillStyle = HAIR;
  for (const [hx, hy, hr] of [[-.45, -.78, .3], [-.12, -.92, .32], [.25, -.88, .3], [.55, -.7, .24], [-.7, -.55, .2]]) { circle(ctx, hx * s, hy * s, hr * s); ctx.fill(); }
  ctx.strokeStyle = HAIR; ctx.lineWidth = s * .07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-s * .02, -s * 1.08, s * .14, .9 * Math.PI, 2.6 * Math.PI); ctx.stroke();
}

// enfeites de cabeça, desenhados com a cabeça na origem (raio s); também usados nos botões do guarda-roupa
const HEAD_ITEMS = {
  laco(g, s) {
    g.fillStyle = '#ff5fa8';
    g.save(); g.translate(s * .6, -s * .78); g.rotate(.4);
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(d * s * .28, -s * .16); g.lineTo(d * s * .28, s * .16); g.fill(); }
    g.fillStyle = '#ff8fc0'; circle(g, 0, 0, s * .09); g.fill();
    g.restore();
  },
  chapeu(g, s) {
    g.fillStyle = '#f3d27a'; g.strokeStyle = '#d9b04f'; g.lineWidth = s * .04;
    g.beginPath(); g.ellipse(0, -s * .68, s * 1.25, s * .26, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -s * .72, s * .7, s * .56, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#ff7fb6'; g.fillRect(-s * .7, -s * .86, s * 1.4, s * .14);
    g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; circle(g, s * .5 + Math.cos(a) * s * .08, -s * .8 + Math.sin(a) * s * .08, s * .06); g.fill(); }
    g.fillStyle = '#ffd23b'; circle(g, s * .5, -s * .8, s * .05); g.fill();
  },
  coroa(g, s) {
    g.save(); g.translate(0, -s * .95); g.rotate(-.08);
    g.fillStyle = '#ffcf3a'; g.strokeStyle = '#e0a800'; g.lineWidth = s * .03; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-s * .45, s * .12); g.lineTo(-s * .5, -s * .32); g.lineTo(-s * .22, -s * .08); g.lineTo(0, -s * .42);
    g.lineTo(s * .22, -s * .08); g.lineTo(s * .5, -s * .32); g.lineTo(s * .45, s * .12); g.closePath(); g.fill(); g.stroke();
    for (const [x, c] of [[-.25, '#ff5f7e'], [0, '#4fb4ff'], [.25, '#5ad16e']]) { g.fillStyle = c; circle(g, x * s, s * .02, s * .06); g.fill(); }
    g.fillStyle = '#fff'; for (const x of [-.5, 0, .5]) { circle(g, x * s, (x ? -.34 : -.44) * s, s * .05); g.fill(); }
    g.restore();
  },
  coelho(g, s, t) {
    for (const d of [-1, 1]) {
      g.save(); g.translate(d * s * .36, -s * .95); g.rotate(d * (.22 + Math.sin(t * 3 + d) * .06));
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -s * .38, s * .16, s * .45, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffc2dc'; g.beginPath(); g.ellipse(0, -s * .36, s * .08, s * .32, 0, 0, TAU); g.fill();
      g.restore();
    }
    g.strokeStyle = '#ff9fc6'; g.lineWidth = s * .1; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, s * .98, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
  },
  flor(g, s) {
    g.save(); g.translate(s * .6, -s * .72);
    g.fillStyle = '#ff8fc0';
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + .3; circle(g, Math.cos(a) * s * .15, Math.sin(a) * s * .15, s * .12); g.fill(); }
    g.fillStyle = '#ffd23b'; circle(g, 0, 0, s * .1); g.fill();
    g.restore();
  },
  bone(g, s) {
    g.fillStyle = '#4fb4ff';
    g.beginPath(); g.ellipse(0, -s * .52, s * .92, s * .68, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#2f8fdc'; g.beginPath(); g.ellipse(0, -s * .5, s * .95, s * .16, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#fff'; circle(g, 0, -s * 1.18, s * .08); g.fill();
    g.fillStyle = '#ffe066'; star(g, 0, -s * .82, s * .16, -Math.PI / 2);
  },
  gorro(g, s) {
    g.fillStyle = '#ff5f5f';
    g.beginPath(); g.ellipse(0, -s * .45, s * .96, s * .78, 0, Math.PI, 0); g.fill();
    g.strokeStyle = 'rgb(255 255 255 / .35)'; g.lineWidth = s * .05;
    for (const x of [-.5, -.17, .17, .5]) { g.beginPath(); g.moveTo(x * s, -s * .5); g.lineTo(x * s * .7, -s * 1.1); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(-s * 1, -s * .6, s * 2, s * .26, s * .13); g.fill();
    circle(g, 0, -s * 1.28, s * .2); g.fill();
  },
};
function drawHeadItem(g, kind, s, t = 0) { HEAD_ITEMS[kind]?.(g, s, t); }

function drawFaceBits(s, t) {
  // bochechas (vermelhinhas de frio), nariz
  ctx.fillStyle = look.cold ? 'rgb(255 90 110 / .5)' : `rgb(255 120 140 / ${pokeAge('bochecha') >= 0 ? .6 : .35})`;
  circle(ctx, -s * .58, s * .3, s * .17); ctx.fill();
  circle(ctx, s * .58, s * .3, s * .17); ctx.fill();
  ctx.fillStyle = look.cold ? '#ff8a9a' : 'rgb(200 120 90 / .5)'; circle(ctx, 0, s * .2, s * (look.cold ? .07 : .05)); ctx.fill();
  if (look.dirty) {
    ctx.fillStyle = `rgb(140 95 60 / ${.4 * look.dirty})`;
    circle(ctx, -s * .45, s * .5, s * .11); ctx.fill(); circle(ctx, s * .3, -s * .38, s * .08); ctx.fill();
  }
  if (look.food) {
    ctx.fillStyle = '#ff9a3d';
    circle(ctx, s * .2, s * .58, s * .045); ctx.fill();
    if (look.food > 2) { circle(ctx, -s * .28, s * .52, s * .035); ctx.fill(); }
  }
  // dodói na testa e o curativo
  if (look.bump && !look.bandage) {
    ctx.fillStyle = '#ff7a7a'; ctx.beginPath(); ctx.ellipse(-s * .38, -s * .42, s * .13, s * .1, -.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb0b0'; ctx.beginPath(); ctx.ellipse(-s * .4, -s * .45, s * .05, s * .035, -.3, 0, TAU); ctx.fill();
  }
  if (look.bandage) drawBandage(ctx, -s * .38, -s * .42, s);
}

function drawBandage(g, x, y, s, k = 1) {
  g.save(); g.translate(x, y); g.rotate(-.5); g.scale(k, k);
  g.fillStyle = '#f3c48e'; g.beginPath(); g.roundRect?.(-s * .24, -s * .08, s * .48, s * .16, s * .08); g.fill();
  g.fillStyle = '#ffe2c2'; g.fillRect(-s * .07, -s * .07, s * .14, s * .14);
  g.fillStyle = 'rgb(180 120 70 / .5)';
  for (const dx of [-.17, -.12, .12, .17]) { circle(g, dx * s, 0, s * .012); g.fill(); }
  g.restore();
}

function drawTears(s, t) {
  ctx.fillStyle = 'rgb(120 190 255 / .85)';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const p = (t * 1.3 + i * .5 + (side > 0 ? .25 : 0)) % 1;
      const x = side * s * (.42 + p * .1), y = s * (.18 + p * .55);
      ctx.globalAlpha = 1 - p;
      ctx.beginPath(); ctx.moveTo(x, y - s * .07); ctx.quadraticCurveTo(x + s * .05, y + s * .02, x, y + s * .04); ctx.quadraticCurveTo(x - s * .05, y + s * .02, x, y - s * .07); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawHead(s, t, eyes, lips) {
  for (const side of [-1, 1]) { ctx.fillStyle = SKIN[1]; circle(ctx, side * s * .95, s * .05, s * .2); ctx.fill(); }
  const squish = pokeAge('bochecha') >= 0 ? 1 - Math.sin(pokeAge('bochecha') / POKE_TIME.bochecha * Math.PI) * .07 : 1;
  ctx.save(); ctx.scale(squish, 1 / squish);
  const skin = ctx.createRadialGradient(-s * .3, -s * .35, s * .1, 0, 0, s);
  skin.addColorStop(0, SKIN[0]); skin.addColorStop(1, SKIN[1]);
  ctx.fillStyle = skin; circle(ctx, 0, 0, s); ctx.fill();
  drawFaceBits(s, t);
  drawHair(s);
  drawHeadItem(ctx, look.gorro ? 'gorro' : outfit.head, s, t);
  const since = clock - baby.blinkAt, blink = since < .15 ? Math.abs(since / .075 - 1) : 1;
  eye(-s * .36, s * .02, s, eyes, Math.max(blink, .08));
  eye(s * .36, s * .02, s, eyes, Math.max(blink, .08));
  ctx.save(); mouth(s, lips, t); ctx.restore();
  if (look.crying || look.sniff) drawTears(s, t);
  ctx.restore();
}

// ---------- bracinhos: do ombro até onde a mão tem que estar ----------
function handAt(side, s, t, laughing) {
  const sx = side * s * .7, sy = s * .95;
  if (look.peek > 0) {
    const rest = restHand(side, s, t, laughing), k = look.peek;
    return [rest[0] + (side * s * .36 - rest[0]) * k, rest[1] + (s * .04 - rest[1]) * k];
  }
  const pa = pokeAge('mao');
  if (pa >= 0) {
    const k = Math.min(pa / .15, 1, (POKE_TIME.mao - pa) / .15);
    const open = Math.abs(Math.cos(pa * Math.PI * 2.8));
    const rest = restHand(side, s, t, laughing);
    return [rest[0] + (side * s * (.08 + open * .2) - rest[0]) * k, rest[1] + (s * 1.12 - rest[1]) * k];
  }
  if (look.reach) { const w = Math.sin(t * 5 + side) * .1; return [sx + side * s * .15, sy - s * (.62 + w)]; }
  return restHand(side, s, t, laughing);
}

function restHand(side, s, t, laughing) {
  const wave = baby.armsUp > 0 ? baby.armsUp : laughing ? .5 + .5 * Math.sin(t * 16) : Math.sin(t * 1.4) * .15;
  const a = .5 + wave * 1.6, L = s * .66;
  return [side * (s * .7 - L * Math.sin(a)), s * .95 + L * Math.cos(a)];
}

function drawArms(s, t, laughing) {
  const suit = SUITS[outfit.suit];
  for (const side of [-1, 1]) {
    const [hx, hy] = handAt(side, s, t, laughing);
    ctx.strokeStyle = suit.c[0]; ctx.lineWidth = s * .36; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * s * .68, s * .98); ctx.lineTo(hx - (hx - side * s * .68) * .18, hy - (hy - s * .98) * .18); ctx.stroke();
    ctx.fillStyle = SKIN[0]; circle(ctx, hx, hy, s * .16); ctx.fill();
  }
}

function drawBaby(t) {
  const { x, y, s } = baby, [eyes, lips] = face(t);
  const p = baby.poke, pt = p ? clock - p.at : 99;
  const laughing = clock - baby.laughAt < 1.2 || (p && pt < POKE_TIME[p.part] && LAUGH_PARTS.includes(p.part));
  const bounce = laughing ? Math.abs(Math.sin(t * 12)) * s * .06 : 0;
  const shiver = look.cold ? Math.sin(t * 55) * s * .018 : 0;
  const sneeze = p?.part === 'nariz' && pt > .35 && pt < .75 ? Math.sin((pt - .35) / .4 * Math.PI) : 0;
  const breathe = 1 + Math.sin(t * (mode === 'sono' ? 1.6 : 2.4)) * .018;
  let tilt = mode === 'sono' ? .18 * night : Math.sin(t * .8) * .05 + (laughing ? Math.sin(t * 14) * .06 : 0);
  if (p?.part === 'cabeca' && pt < POKE_TIME.cabeca) tilt += Math.sin(pt * 5) * .12;
  if (look.crying) tilt += Math.sin(t * 7) * .04;
  ctx.save();
  ctx.translate(x + shiver, y - bounce);
  if (baby.rot) { ctx.translate(0, s * 1.3); ctx.rotate(baby.rot); ctx.translate(0, -s * 1.3); }
  drawBody(s, t, breathe);
  ctx.save(); ctx.translate(0, sneeze * s * .1); ctx.rotate(tilt); drawHead(s, t, eyes, lips); ctx.restore();
  drawArms(s, t, laughing);
  ctx.restore();
}

// cheirinho de fralda suja: ondinhas verdes subindo
function drawStink(t) {
  if (!look.stinky) return;
  const { x, y, s } = baby;
  ctx.strokeStyle = 'rgb(120 190 80 / .7)'; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const p = (t * .5 + i / 3) % 1, bx = x + (i - 1) * s * .8, by = y + s * 1.9 - p * s * 1.4;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) { const yy = by - k * s * .07; ctx.lineTo(bx + Math.sin(k * .9 + t * 4 + i) * s * .1, yy); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// beijinho que sai voando da boca
let kisses = [];
function drawKisses(dt) {
  for (const k of kisses) k.t += dt;
  kisses = kisses.filter(k => k.t < 1.2);
  for (const k of kisses) {
    const size = Math.round(baby.s * .6 * easeOutBack(Math.min(k.t / .3, 1)) / 4) * 4;
    if (size <= 0) continue;
    ctx.globalAlpha = 1 - k.t / 1.2;
    ctx.drawImage(emojiSprite('💋', size), k.x - size / 2 + k.t * baby.s * .6, k.y - size / 2 - k.t * baby.s * 1.2, size, size);
  }
  ctx.globalAlpha = 1;
}

function heartPath(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * .9);
  g.bezierCurveTo(x - r * 1.4, y - r * .1, x - r * .6, y - r * 1.1, x, y - r * .4);
  g.bezierCurveTo(x + r * .6, y - r * 1.1, x + r * 1.4, y - r * .1, x, y + r * .9);
}

const clamp01 = v => Math.min(Math.max(v, 0), 1);
const noise01 = i => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
