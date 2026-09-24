'use strict';
// Fazendinha: toca nos bichos (cada um faz seu som), a galinha bota ovo e nasce pintinho, a horta dá cenoura
// pro coelho, o porquinho rola na lama, o cavalo sai do celeiro, o trator passeia e o sol vira lua

loadVoices(['vamos', 'vaca', 'porco', 'ovelha', 'galinha', 'galo', 'pato', 'cavalo', 'cachorro', 'coelho', 'ovo',
  'pintinho', 'broto', 'cenoura', 'leite', 'lama', 'trator', 'noite', 'dia', 'dormindo', 'muito-bem']);

// at = posição (fração da tela); roam = quanto passeia pros lados
const ANIMALS = [
  { id: 'cachorro', e: '🐕', at: [.13, .615], size: .9, roam: .03, text: 'O cachorro faz: au, au!' },
  { id: 'vaca', e: '🐄', at: [.5, .6], size: 1.3, roam: .04, text: 'A vaca faz: muuuu!' },
  { id: 'galo', e: '🐓', at: [.66, .535], size: .7, roam: 0, text: 'O galo faz: cocoricó!' },
  { id: 'ovelha', e: '🐑', at: [.24, .695], size: 1.05, roam: .04, text: 'A ovelha faz: méééé!' },
  { id: 'porco', e: '🐖', at: [.55, .745], size: 1, roam: .03, text: 'O porquinho faz: óinc, óinc!' },
  { id: 'galinha', e: '🐔', at: [.82, .8], size: .85, roam: .05, text: 'A galinha faz: có, có, có!' },
  { id: 'pato', e: '🦆', at: [.76, .625], size: .8, pond: true, text: 'O pato faz: quá, quá, quá!' },
  { id: 'coelho', e: '🐇', at: [.13, .885], size: .85, roam: .02, text: 'O coelho adora cenoura! Nhac, nhac!' },
];
const POND = [.76, .635, .19, .042];          // x, y, raio x (de W), raio y (de H)
const MUD = [.27, .775, .13, .024];
const PLOTS = [.4, .6, .8], PLOT_Y = .9;
const MAX_EGGS = 2, MAX_CHICKS = 4;
const DRIVE_TIME = 5;                         // volta do trator
const BARN_OPEN = 3.5;                        // cavalo fica pra fora esse tempo
const MILK_EVERY = 3, EGG_EVERY = 2;

let farm = null, animals = [], eggs = [], chicks = [], plots = [], carrots = [], zzz = [];
let S = 40, barn = null, tractor = null, night = 0, isNight = false, dayAt = -99, found = new Set(), frameDt = 0, lastSleepSay = -99;
const find = id => animals.find(a => a.id === id);

meter.size = 8;
meter.onFull = () => {
  sfx.fanfare();
  navigator.vibrate?.([30, 60, 30]);
  confettiRain();
  animals.forEach((a, i) => { a.hopAt = clock + i * .1; });
  say('muito-bem', 'Muito bem! Você cuida muito bem da fazendinha!', true);
  found.clear();                              // dá pra ganhar as estrelas de novo
};

// cada coisa nova descoberta vale uma estrela
function discover(id, x, y) {
  if (found.has(id)) return;
  found.add(id);
  launchStar(x, y);
}

// ---------- cenário da fazenda ----------
function buildFarm() {
  const [c, g] = layer(W, H);
  drawPond(g);
  drawMud(g);
  drawFence(g);
  for (const [x, y] of [[.05, .47], [.93, .56], [.35, .83], [.95, .94]]) drawBush(g, x * W, y * H, S * .5);
  return c;
}

function drawPond(g) {
  const [x, y, rx, ry] = POND;
  g.fillStyle = '#6cc36a';
  g.beginPath(); g.ellipse(x * W, y * H + 3, rx * W + 6, ry * H + 6, 0, 0, TAU); g.fill();
  const grad = g.createRadialGradient(x * W - rx * W * .3, y * H - ry * H * .4, 4, x * W, y * H, rx * W);
  grad.addColorStop(0, '#bfeaff'); grad.addColorStop(1, '#4aa8e8');
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(x * W, y * H, rx * W, ry * H, 0, 0, TAU); g.fill();
  g.fillStyle = '#5cc85a';
  for (const [dx, dy] of [[-.6, .2], [.55, -.1]]) { g.beginPath(); g.ellipse(x * W + dx * rx * W, y * H + dy * ry * H, S * .16, S * .07, 0, 0, TAU); g.fill(); }
}

function drawMud(g) {
  const [x, y, rx, ry] = MUD;
  g.fillStyle = '#8a5a35';
  g.beginPath(); g.ellipse(x * W, y * H, rx * W, ry * H, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .18)';
  g.beginPath(); g.ellipse(x * W - rx * W * .3, y * H - ry * H * .3, rx * W * .3, ry * H * .3, 0, 0, TAU); g.fill();
}

function drawFence(g) {
  const y = H * .555, h = S * .5, x0 = W * .4;
  g.fillStyle = '#c98b4f'; g.strokeStyle = '#8a5a2e'; g.lineWidth = 1.5;
  for (const dy of [.25, .65]) { g.fillRect(x0, y - h + h * dy, W - x0, h * .14); }
  for (let x = x0; x < W + 10; x += Math.max(34, W / 9)) {
    g.beginPath(); g.roundRect?.(x - 4, y - h, 8, h + 4, 3); g.fill(); g.stroke();
  }
}

function drawBush(g, x, y, r) {
  g.fillStyle = '#4fb248';
  for (const [dx, dy, k] of [[-.6, .1, .7], [0, -.2, .9], [.6, .1, .7]]) { circle(g, x + dx * r, y + dy * r, r * k); g.fill(); }
  g.fillStyle = '#ff6f91';
  for (const [dx, dy] of [[-.5, -.2], [.3, -.5], [.6, .2]]) { circle(g, x + dx * r, y + dy * r, r * .12); g.fill(); }
}

// celeiro vermelho com portas que abrem
function drawBarn(t) {
  const { x, y, w } = barn, h = w * .7, open = barnOpen();
  ctx.fillStyle = '#d9433b';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = '#a8302a';
  ctx.beginPath(); ctx.moveTo(x - w * .6, y - h + 2); ctx.lineTo(x - w * .38, y - h - w * .32); ctx.lineTo(x + w * .38, y - h - w * .32); ctx.lineTo(x + w * .6, y - h + 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, w * .03); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - w * .6, y - h + 2); ctx.lineTo(x - w * .38, y - h - w * .32); ctx.lineTo(x + w * .38, y - h - w * .32); ctx.lineTo(x + w * .6, y - h + 2); ctx.stroke();
  ctx.fillStyle = '#fff'; circle(ctx, x, y - h - w * .1, w * .09); ctx.fill();
  ctx.fillStyle = '#f2c14e'; circle(ctx, x, y - h - w * .1, w * .065); ctx.fill();
  // abertura escura, cavalo e as duas portas
  const dw = w * .44, dh = h * .66, dx = x - dw / 2, dy = y - dh;
  ctx.fillStyle = '#4a2418'; ctx.fillRect(dx, dy, dw, dh);
  if (open > 0) {
    const size = Math.round(S * 1.3 / 4) * 4, pop = easeOutBack(clamp01(open * 1.4));
    ctx.save(); ctx.beginPath(); ctx.rect(dx - dw, dy - dh, dw * 3, dh * 2); ctx.clip();
    ctx.drawImage(emojiSprite('🐴', size), x - size / 2, y - size * .9 * pop + size * .12, size, size);
    ctx.restore();
  }
  for (const side of [-1, 1]) {
    const pw = dw / 2 * (1 - open * .85), px = side < 0 ? dx : dx + dw - pw;
    ctx.fillStyle = '#e8574d'; ctx.fillRect(px, dy, pw, dh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, w * .02);
    ctx.strokeRect(px, dy, pw, dh);
    ctx.beginPath(); ctx.moveTo(px, dy); ctx.lineTo(px + pw, dy + dh); ctx.moveTo(px + pw, dy); ctx.lineTo(px, dy + dh); ctx.stroke();
  }
}

const clamp01 = v => Math.min(Math.max(v, 0), 1);
function barnOpen() {
  const age = clock - barn.openAt;
  if (age > BARN_OPEN + .4) return 0;
  return age < .4 ? age / .4 : age > BARN_OPEN ? 1 - (age - BARN_OPEN) / .4 : 1;
}

// ---------- bichos ----------
function hop(a) { a.hopAt = clock; }

function tapAnimal(a) {
  hop(a);
  if (night > .5 && a.id !== 'galo') {
    zzz.push({ x: a.x, y: a.y - a.s * .6, t: 0 });
    if (clock - lastSleepSay > 3) { lastSleepSay = clock; say('dormindo', 'Shhh... está dormindo.'); }
    return;
  }
  say(a.id, a.text);
  sfx.giggle((a.x / W) * 2 - 1);
  hearts(a.x, a.y - a.s * .5, 4);
  discover(a.id, a.x, a.y);
  a.taps = (a.taps || 0) + 1;
  if (a.id === 'vaca' && a.taps % MILK_EVERY === 0) popItem('🥛', a, 'leite', 'Leitinho fresquinho!');
  if (a.id === 'porco') a.mudAt = clock;
  if (a.id === 'galinha' && a.taps % EGG_EVERY === 0 && eggs.length < MAX_EGGS && chicks.length + eggs.length < MAX_CHICKS) layEgg(a);
  if (a.id === 'pato') ring(a.x, a.y + a.s * .2, a.s * .8);
}

// leitinho: sobe, brilha e some
let items = [];
function popItem(e, a, line, text) {
  items.push({ e, x: a.x, y: a.y - a.s * .6, t: 0 });
  say(line, text, true);
  sfx.bell(1046.5);
  discover(line, a.x, a.y);
}

function layEgg(hen) {
  eggs.push({ x: hen.x + rand(-S * .5, S * .5), y: hen.y + S * .3, cracks: 0, born: clock, wobbleAt: -9 });
  sfx.pop();
  say('ovo', 'Olha! A galinha botou um ovo!', true);
  discover('ovo', hen.x, hen.y);
}

function tapEgg(egg) {
  egg.cracks++;
  egg.wobbleAt = clock;
  sfx.bell(880 + egg.cracks * 200);
  if (egg.cracks < 3) return;
  eggs = eggs.filter(e => e !== egg);
  chicks.push({ x: egg.x, y: egg.y, born: clock, hopAt: clock });
  burst(egg.x, egg.y, S * .4, 50, 14);
  sfx.chirp();
  say('pintinho', 'Nasceu um pintinho! Piu, piu!');
  discover('pintinho', egg.x, egg.y);
}

function tapPlot(p) {
  if (p.stage < 2) {
    p.stage++; p.at = clock;
    sfx.bell(659 + p.stage * 200);
    burst(p.x, p.y, S * .3, 100, 8);
    if (p.stage === 1) say('broto', 'Olha, está crescendo!');
    return;
  }
  // colheu: a cenoura voa até o coelho
  p.stage = 0; p.at = clock;
  const bunny = find('coelho');
  carrots.push({ x0: p.x, y0: p.y - S * .3, x1: bunny.x, y1: bunny.y - bunny.s * .3, t: 0 });
  sfx.whoosh();
  say('cenoura', 'Uma cenoura! Vamos dar pro coelho?');
  discover('cenoura', p.x, p.y);
}

function tapTractor() {
  if (clock - tractor.driveAt < DRIVE_TIME) return;
  tractor.driveAt = clock;
  say('trator', 'Olha o trator! Vrum, vrum!');
  sfx.boing();
  discover('trator', tractor.x, tractor.y);
}

function tapBarn() {
  if (barnOpen() > 0) return;
  barn.openAt = clock;
  sfx.whoosh();
  setTimeout(() => { if (night < .5) say('cavalo', 'O cavalo faz: hiiiiiii!'); else say('dormindo', 'Shhh... está dormindo.'); }, 350);
  discover('cavalo', barn.x, barn.y - barn.w * .3);
}

function toggleNight() {
  isNight = !isNight;
  sfx.chime();
  if (isNight) { say('noite', 'Boa noite, fazendinha! Os bichinhos vão dormir.'); discover('noite', sky.sunX, sky.sunY); }
  else {
    dayAt = clock;
    hop(find('galo'));
    say('dia', 'Cocoricó! Bom dia, fazendinha!');
  }
}

// ---------- toques ----------
function onTap(x, y) {
  if (Math.hypot(x - sky.sunX, y - sky.sunY) < sky.sunR * 1.5) return toggleNight();
  if (tapBird(x, y)) return;
  const egg = eggs.find(e => Math.hypot(x - e.x, y - e.y) < S * .5);
  if (egg) return tapEgg(egg);
  const chick = chicks.find(c => Math.hypot(x - c.x, y - c.y) < S * .45);
  if (chick) { chick.hopAt = clock; sfx.chirp(); return; }
  // o bicho mais perto do dedo, dentro do tamanho dele
  const a = animals.filter(a => Math.hypot(x - a.x, y - (a.y - a.s * .3)) < a.s * .65)
    .sort((p, q) => Math.hypot(x - p.x, y - p.y) - Math.hypot(x - q.x, y - q.y))[0];
  if (a) return tapAnimal(a);
  if (Math.abs(x - tractor.x) < S * .7 && Math.abs(y - (tractor.y - S * .3)) < S * .6) return tapTractor();
  const p = plots.find(p => Math.abs(x - p.x) < W * .1 && Math.abs(y - p.y) < S * .7);
  if (p) return tapPlot(p);
  if (Math.abs(x - barn.x) < barn.w * .55 && y < barn.y && y > barn.y - barn.w * 1.05) return tapBarn();
  sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
}

// ---------- movimento ----------
function updateAnimals(dt, t) {
  for (const a of animals) {
    const still = night > .5;
    if (a.pond) {
      const [px, py, rx, ry] = POND, ang = t * .35 + a.phase;
      a.x = px * W + Math.cos(ang) * rx * W * .55;
      a.y = py * H + Math.sin(ang) * ry * H * .45;
      a.dir = -Math.sin(ang) > 0 ? 1 : -1;
      continue;
    }
    let tx = a.bx + (still ? 0 : Math.sin(t * .3 + a.phase) * W * a.roam), ty = a.by;
    if (a.id === 'porco' && clock - a.mudAt < 3) {
      tx = MUD[0] * W; ty = MUD[1] * H - a.s * .1;
      if (!a.splashed && Math.abs(a.x - tx) < S * .2) {
        a.splashed = true;
        burst(a.x, a.y, a.s * .5, 25, 16);
        sfx.splash();
        say('lama', 'O porquinho adora lama!', true);
        discover('lama', a.x, a.y);
      }
    } else a.splashed = false;
    const vx = (tx - a.x) * Math.min(dt * 3, 1);
    if (Math.abs(vx) > .05) a.dir = vx > 0 ? 1 : -1;
    a.x += vx; a.y += (ty - a.y) * Math.min(dt * 3, 1);
  }
  const hen = find('galinha');
  chicks.forEach((c, i) => {
    const tx = hen.x - hen.dir * S * (.55 + i * .45), ty = hen.y + S * .15 + (i % 2) * S * .12;
    c.x += (tx - c.x) * Math.min(dt * 2.5, 1); c.y += (ty - c.y) * Math.min(dt * 2.5, 1);
  });
  for (const c of carrots) {
    c.t += dt;
    if (c.t >= .8 && !c.eaten) {
      c.eaten = true;
      const bunny = find('coelho');
      hop(bunny);
      say('coelho', bunny.text, true);
      sfx.gulp();
      hearts(bunny.x, bunny.y - bunny.s * .5, 5);
      discover('coelho', bunny.x, bunny.y);
    }
  }
  carrots = carrots.filter(c => c.t < .8);
}

// ---------- desenho ----------
let hearty = [];
function hearts(x, y, n) {
  for (let i = 0; i < n; i++) hearty.push({ x: x + rand(-S * .4, S * .4), y, vy: -rand(40, 80), t: 0, life: rand(1, 1.5) });
}

function drawSprite(e, x, y, size, dir = -1, rot = 0, sy = 1) {
  const s = Math.round(size / 4) * 4;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(dir > 0 ? -1 : 1, sy);
  ctx.drawImage(emojiSprite(e, s), -s / 2, -s, s, s);
  ctx.restore();
}

function hopOf(a, len = .5) {
  const p = (clock - a.hopAt) / len;
  return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0;
}

function shadow(x, y, r) {
  ctx.fillStyle = 'rgb(40 80 30 / .18)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * .28, 0, 0, TAU); ctx.fill();
}

function drawAnimal(a, t) {
  const h = hopOf(a), bob = night > .5 ? Math.sin(t * 1.5 + a.phase) * .02 : 0;
  const rolling = a.id === 'porco' && clock - a.mudAt < 3 && a.splashed ? Math.sin(t * 8) * .5 : 0;
  if (!a.pond) shadow(a.x, a.y, a.s * .38 * (1 - h * .3));
  drawSprite(a.e, a.x, a.y - h * a.s * .45, a.s, a.dir, rolling + Math.sin(t * 2 + a.phase) * .03, 1 + bob);
}

function drawTractor(t) {
  const age = clock - tractor.driveAt, driving = age < DRIVE_TIME;
  let x = tractor.bx;
  if (driving) {
    const p = age / DRIVE_TIME, span = W + S * 3;
    x = ((tractor.bx + p * span + S * 1.5) % span) - S * 1.5;
    if (Math.random() < frameDt * 8) smoke.push({ x: x + S * .3, y: tractor.y - S * .8, t: 0 });
  }
  tractor.x = x;
  shadow(x, tractor.y, S * .45);
  drawSprite('🚜', x, tractor.y + (driving ? Math.sin(t * 25) * 1.5 : 0), S * 1.1, driving ? 1 : -1);
}

let smoke = [];
function drawBits(dt, t) {
  for (const s of smoke) { s.t += dt; s.y -= 25 * dt; s.x -= 10 * dt; }
  smoke = smoke.filter(s => s.t < 1.2);
  for (const s of smoke) { ctx.fillStyle = `rgb(220 220 230 / ${.7 * (1 - s.t / 1.2)})`; circle(ctx, s.x, s.y, S * .1 * (1 + s.t * 2)); ctx.fill(); }
  for (const h of hearty) { h.t += dt; h.y += h.vy * dt; }
  hearty = hearty.filter(h => h.t < h.life);
  for (const h of hearty) {
    ctx.globalAlpha = 1 - h.t / h.life;
    drawSprite('💖', h.x, h.y, S * .35, -1);
  }
  for (const it of items) { it.t += dt; it.y -= 30 * dt; }
  items = items.filter(it => it.t < 1.8);
  for (const it of items) {
    ctx.globalAlpha = Math.min(1, (1.8 - it.t) * 2);
    drawSprite(it.e, it.x, it.y, S * .8 * easeOutBack(Math.min(it.t / .3, 1)), -1);
  }
  ctx.globalAlpha = 1;
  // bichos dormindo soltam Zzz
  if (night > .8 && Math.random() < dt * 1.5) { const a = pick(animals); zzz.push({ x: a.x, y: a.y - a.s * .7, t: 0 }); }
  for (const z of zzz) { z.t += dt; z.y -= 18 * dt; }
  zzz = zzz.filter(z => z.t < 2);
  ctx.font = `700 ${Math.round(S * .35)}px ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const z of zzz) { ctx.fillStyle = `rgb(255 255 255 / ${1 - z.t / 2})`; ctx.fillText('z', z.x + Math.sin(z.t * 3) * 6, z.y); }
}

function drawPlot(p, t) {
  ctx.fillStyle = '#7a4a2a';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.min(W * .085, S * 1.1), S * .2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#946038';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - S * .04, Math.min(W * .07, S * .9), S * .12, 0, 0, TAU); ctx.fill();
  if (!p.stage) return;
  const k = easeOutBack(clamp01((clock - p.at) / .4)), sway = Math.sin(t * 2 + p.x) * .08;
  drawSprite(p.stage === 1 ? '🌱' : '🥕', p.x, p.y - S * .02, S * (p.stage === 1 ? .6 : .85) * k, -1, p.stage === 2 ? Math.PI + sway : sway);
}

function drawEgg(e, t) {
  const wob = clock - e.wobbleAt < .4 ? Math.sin((clock - e.wobbleAt) * 40) * .25 : Math.sin(t * 3 + e.born) * .05;
  const k = easeOutBack(clamp01((clock - e.born) / .35));
  drawSprite('🥚', e.x, e.y, S * .55 * k, -1, wob);
  if (e.cracks) {
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(e.x - S * .12, e.y - S * .3);
    for (let i = 1; i <= e.cracks * 2; i++) ctx.lineTo(e.x - S * .12 + i * S * .05, e.y - S * .3 + (i % 2 ? -S * .05 : S * .03));
    ctx.stroke();
  }
}

function drawCarrots() {
  for (const c of carrots) {
    const p = clamp01(c.t / .8), x = c.x0 + (c.x1 - c.x0) * p, y = c.y0 + (c.y1 - c.y0) * p - Math.sin(p * Math.PI) * H * .12;
    drawSprite('🥕', x, y, S * .7, -1, p * 8);
  }
}

// noite: céu escurece, lua no lugar do sol e estrelas piscando
function drawNight(t) {
  if (night < .01) return;
  ctx.fillStyle = `rgb(20 24 70 / ${.55 * night})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = night;
  for (let i = 0; i < 30; i++) {
    const x = (Math.sin(i * 91.7) * .5 + .5) * W, y = (Math.sin(i * 37.3) * .5 + .5) * H * .38;
    ctx.fillStyle = `rgb(255 250 210 / ${.5 + .5 * Math.abs(Math.sin(t * 2 + i))})`;
    circle(ctx, x, y, 1.2 + (i % 3) * .6); ctx.fill();
  }
  const r = sky.sunR;
  const glow = ctx.createRadialGradient(sky.sunX, sky.sunY, r * .5, sky.sunX, sky.sunY, r * 2);
  glow.addColorStop(0, 'rgb(255 250 220 / .35)'); glow.addColorStop(1, 'rgb(255 250 220 / 0)');
  ctx.fillStyle = glow; circle(ctx, sky.sunX, sky.sunY, r * 2); ctx.fill();
  ctx.fillStyle = '#fff6cc'; circle(ctx, sky.sunX, sky.sunY, r * 1.05); ctx.fill();
  ctx.fillStyle = '#e8dca6';
  for (const [dx, dy, k] of [[-.3, -.2, .2], [.25, .25, .14], [.35, -.35, .1]]) { circle(ctx, sky.sunX + dx * r, sky.sunY + dy * r, k * r); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  S = Math.min(W * .2, H * (W > H ? .17 : .13), 110);
  buildSky(.42);
  const bw = Math.min(W * .42, H * .24);
  barn = { x: W * .24, y: H * .54, w: bw, openAt: barn?.openAt ?? -99 };
  tractor = { bx: W * .86, x: W * .86, y: H * .475, driveAt: tractor?.driveAt ?? -99 };
  const old = animals;
  animals = ANIMALS.map((d, i) => {
    const prev = old.find(o => o.id === d.id);
    return { ...d, bx: d.at[0] * W, by: d.at[1] * H, x: d.at[0] * W, y: d.at[1] * H, s: S * d.size, dir: -1,
      phase: i * 1.7, hopAt: prev?.hopAt ?? -9, taps: prev?.taps ?? 0, mudAt: prev?.mudAt ?? -99 };
  });
  plots = PLOTS.map((x, i) => ({ x: x * W, y: PLOT_Y * H, stage: plots[i]?.stage ?? 0, at: plots[i]?.at ?? -9 }));
  eggs = []; chicks = chicks.map(c => ({ ...c, x: W * .8, y: H * .8 }));
  farm = buildFarm();
}

function update(dt, t) {
  frameDt = dt;
  updateSky(dt);
  updateAnimals(dt, t);
  night += ((isNight ? 1 : 0) - night) * Math.min(dt * 1.5, 1);
  updateMeter(dt);
}

function render(t) {
  drawSkyBack(t);
  drawHills();
  drawTractor(t);
  drawBarn(t);
  ctx.drawImage(farm, 0, 0, W, H);
  for (const p of plots) drawPlot(p, t);
  // quem está mais embaixo na tela fica na frente
  const things = [
    ...animals.map(a => ({ y: a.y, draw: () => drawAnimal(a, t) })),
    ...eggs.map(e => ({ y: e.y, draw: () => drawEgg(e, t) })),
    ...chicks.map(c => ({ y: c.y, draw: () => { shadow(c.x, c.y, S * .18); drawSprite(clock - c.born < 1.2 ? '🐣' : '🐥', c.x, c.y - hopOf(c, .4) * S * .3, S * .5, find('galinha').dir); } })),
  ].sort((a, b) => a.y - b.y);
  for (const th of things) th.draw();
  drawCarrots();
  drawNight(t);
  drawBits(frameDt, t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

boot({
  resize, update, render, onTap, onBird: spawnBird,
  onStart: () => { say('vamos', 'Vamos visitar a fazendinha? Toque nos bichinhos!'); },
});
