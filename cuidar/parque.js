'use strict';
// passeio no parquinho: a bebê chega de carrinho; balanço, escorrega e patinhos no lago

const PARK_THINGS = ['balanco', 'escorrega', 'patos'];
const SWING_W = 2.3;                 // rad/s do balanço
const homeBtn = document.querySelector('.go-home');
let place = 'casa', parkLayer = null, geo = null;
const fade = { at: -99, fn: null, fired: true };
const park = { state: 'arrive', at: 0, fx: 0, fy: 0, hop: null, used: new Set(), rewarded: false, swingA: 0, swingPhase: 0, lastPush: -99, stroller: { x: 0, target: 0 }, ducks: [], crumbs: [], flies: [], sunSpinAt: -99, said: new Set() };

function fadeTo(fn) { Object.assign(fade, { at: clock, fn, fired: false }); }
function updateFade() { if (!fade.fired && clock - fade.at > .35) { fade.fired = true; fade.fn(); } }
function drawFade() {
  const a = clock - fade.at;
  if (a > .7) return;
  ctx.fillStyle = `rgb(255 255 255 / ${a < .35 ? a / .35 : 1 - (a - .35) / .35})`;
  ctx.fillRect(0, 0, W, H);
}

function parkGeo() {
  const portrait = H >= W, u = baby.hs, bs = u * .62, gy = H * (portrait ? .56 : .6);
  const prx = Math.min(W * .32, u * 2.6);
  return {
    u, bs, gy,
    swing: { x: W * (portrait ? .22 : .2), top: gy - u * 2.7, len: u * 1.9, half: u * .72 },
    slide: { ladderX: W * (portrait ? .64 : .7), top: gy - u * 2.3, endX: W * (portrait ? .93 : .9), endY: gy - u * .15 },
    pond: { x: W * .5, y: H * (portrait ? .83 : .87), rx: prx, ry: prx * .28 },
    home: { x: W * .5, y: H * .7 },
    sun: { x: W * .84, y: Math.max(H * .12, 90), r: u * .5 },
  };
}

// ---------- cenário parado ----------
function tree(g, x, y, r) {
  g.fillStyle = '#9a6a3f'; g.fillRect(x - r * .12, y - r * 1.1, r * .24, r * 1.1);
  g.fillStyle = '#5cbf52';
  for (const [dx, dy, k] of [[-.5, -1.2, .6], [.5, -1.2, .6], [0, -1.6, .7], [0, -1.05, .6]]) { circle(g, x + dx * r, y + dy * r, k * r); g.fill(); }
}

function buildPark() {
  const [c, g] = layer(W, H), { u, gy, swing, slide, pond, home, bs } = geo;
  const sky = g.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#7fcbff'); sky.addColorStop(1, '#dff4ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, gy);
  g.fillStyle = '#a8e08a';
  g.beginPath(); g.moveTo(0, gy);
  for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, gy - u * .5 - Math.sin(x / W * TAU * 1.3 + 1) * u * .35);
  g.lineTo(W, gy); g.fill();
  tree(g, W * .06, gy - u * .2, u * .8); tree(g, W * .45, gy - u * .45, u * .6); tree(g, W * .97, gy - u * .1, u * .7);
  const grass = g.createLinearGradient(0, gy, 0, H);
  grass.addColorStop(0, '#8fdc62'); grass.addColorStop(1, '#5bb846');
  g.fillStyle = grass; g.fillRect(0, gy - 2, W, H);
  for (let i = 0; i < 40; i++) {
    const x = noise01(i) * W, y = gy + noise01(i + 50) * (H - gy);
    g.fillStyle = ['#fff', '#ffe2f0', '#fff3a8'][i % 3];
    for (let p = 0; p < 5; p++) { circle(g, x + Math.cos(p * TAU / 5) * 4, y + Math.sin(p * TAU / 5) * 4, 3); g.fill(); }
    g.fillStyle = '#ffb020'; circle(g, x, y, 2.4); g.fill();
  }
  // lago
  g.fillStyle = '#6fc36a'; g.beginPath(); g.ellipse(pond.x, pond.y + 4, pond.rx + 10, pond.ry + 8, 0, 0, TAU); g.fill();
  g.fillStyle = '#5ab8f0'; g.beginPath(); g.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .35)'; g.beginPath(); g.ellipse(pond.x - pond.rx * .35, pond.y - pond.ry * .35, pond.rx * .3, pond.ry * .2, 0, 0, TAU); g.fill();
  // toalha de piquenique
  g.save(); g.translate(home.x, home.y); g.scale(1, .35);
  g.beginPath(); g.ellipse(0, 0, bs * 2.1, bs * 2.1, 0, 0, TAU); g.clip();
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { g.fillStyle = (i + j) % 2 ? '#ff7f8f' : '#fff'; g.fillRect(i * bs * .45, j * bs * .45, bs * .45, bs * .45); }
  g.restore();
  // estrutura do balanço
  g.strokeStyle = '#e8574d'; g.lineWidth = u * .16; g.lineCap = 'round';
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(swing.x + d * swing.half, gy); g.lineTo(swing.x + d * swing.half * .6, swing.top); g.stroke(); }
  g.strokeStyle = '#ffc930'; g.beginPath(); g.moveTo(swing.x - swing.half * .75, swing.top); g.lineTo(swing.x + swing.half * .75, swing.top); g.stroke();
  // escorrega: escada e rampa
  const lx = slide.ladderX;
  g.strokeStyle = '#4fb4ff'; g.lineWidth = u * .1;
  for (const d of [-.28, .28]) { g.beginPath(); g.moveTo(lx + d * u, gy); g.lineTo(lx + d * u, slide.top); g.stroke(); }
  g.lineWidth = u * .06;
  for (let y = slide.top + u * .3; y < gy; y += u * .38) { g.beginPath(); g.moveTo(lx - u * .28, y); g.lineTo(lx + u * .28, y); g.stroke(); }
  g.fillStyle = '#4fb4ff'; g.fillRect(lx - u * .38, slide.top - u * .08, u * .76, u * .16);
  g.strokeStyle = '#ffc930'; g.lineWidth = u * .22;
  g.beginPath(); g.moveTo(lx + u * .3, slide.top); g.quadraticCurveTo(slide.endX - u * .6, slide.top + u * .4, slide.endX, slide.endY); g.stroke();
  g.strokeStyle = 'rgb(255 255 255 / .5)'; g.lineWidth = u * .05;
  g.beginPath(); g.moveTo(lx + u * .3, slide.top - u * .05); g.quadraticCurveTo(slide.endX - u * .6, slide.top + u * .35, slide.endX, slide.endY - u * .05); g.stroke();
  return c;
}

function slidePoint(p) {
  const { slide, u } = geo, x0 = slide.ladderX + u * .3, y0 = slide.top, cx = slide.endX - u * .6, cy = slide.top + u * .4;
  const q = 1 - p;
  return [q * q * x0 + 2 * q * p * cx + p * p * slide.endX, q * q * y0 + 2 * q * p * cy + p * p * slide.endY];
}

function seatPos() {
  const { swing } = geo, th = park.swingA * Math.sin(park.swingPhase);
  return [swing.x + Math.sin(th) * swing.len, swing.top + Math.cos(th) * swing.len, th];
}

// ---------- entrar e sair ----------
function enterPark() {
  place = 'parque';
  geo = parkGeo();
  parkLayer = buildPark();
  const { pond, home, bs } = geo;
  Object.assign(park, { state: 'arrive', at: clock, hop: null, used: new Set(), rewarded: false, swingA: 0, lastPush: -99, crumbs: [] });
  park.stroller = { x: -bs * 3, target: home.x };
  park.ducks = [0, 2.1, 4.2].map(a => ({ a, x: pond.x, y: pond.y, faceRight: false, quackAt: -99 }));
  park.flies = [0, 1].map(i => ({ x: W * (.3 + i * .4), y: geo.gy - geo.u * (1 + i * .5), tx: 0, ty: 0, retarget: 0, phase: i * 2 }));
  [park.fx, park.fy] = strollerSeat();
  homeBtn.classList.add('on'); homeBtn.classList.remove('wanted');
  say('parque', 'Chegamos no parquinho!');
}

// o carrinho volta pra buscar a bebê na toalha
function leavePark() {
  if (['arrive', 'call', 'roll'].includes(park.state) || park.hop?.after === 'call' || park.hop?.after === 'roll') return;
  sfx.whoosh();
  park.stroller = { x: W + geo.bs * 3, target: geo.home.x };
  if (park.state === 'home') { park.state = 'call'; park.at = clock; }
  else hopTo(geo.home.x, geo.home.y, .6, 'call');
  homeBtn.classList.remove('on');
}

function exitPark() {
  place = 'casa'; parkLayer = null;
  baby.x = baby.hx; baby.y = baby.hy; baby.s = baby.hs; baby.rot = 0;
  setMode('idle');
}

homeBtn.addEventListener('click', () => { if (!started || place !== 'parque') return; sfx.resume(); lastTap = clock; leavePark(); });

// ---------- movimento da bebê ----------
function strollerSeat() { return [park.stroller.x, geo.home.y - geo.bs * .9]; }

function hopTo(x, y, dur, after) {
  park.hop = { x0: park.fx, y0: park.fy, x1: x, y1: y, at: clock, dur, after };
  park.state = 'hop';
}

function goSwing() {
  if (park.state === 'swing') { push(); return; }
  hopTo(...swingSpot(), .6, 'swing');
  sfx.boing();
}

function push() {
  park.swingA = Math.min(park.swingA + .25, .8);
  park.lastPush = clock; baby.laughAt = clock; sfx.whoosh();
}

function goSlide() {
  if (['climb', 'slide'].includes(park.state)) return;
  hopTo(geo.slide.ladderX, geo.gy, .55, 'climb');
}

function throwCrumbs() {
  const { pond } = geo;
  for (let i = 0; i < 5; i++) {
    const a = rand(0, TAU), k = rand(.2, .75);
    park.crumbs.push({ x0: baby.x, y0: baby.y + baby.s, x: pond.x + Math.cos(a) * pond.rx * k, y: pond.y + Math.sin(a) * pond.ry * k, t: -i * .08 });
  }
  sfx.whoosh(); baby.laughAt = clock;
  use('patos', 'Os patinhos vieram comer!');
}

function use(thing, text) {
  if (!park.said.has(thing) || Math.random() < .3) say(thing, text);
  park.said.add(thing);
  park.used.add(thing);
  if (!park.rewarded && PARK_THINGS.every(k => park.used.has(k))) {
    park.rewarded = true;
    reward('passeio');
    setTimeout(() => { say('casa', 'Vamos voltar pra casa?', true); homeBtn.classList.add('wanted'); }, 2500);
  }
}

function updateStroller(dt) {
  const st = park.stroller, d = st.target - st.x, step = W * .9 * dt;
  st.x = Math.abs(d) <= step ? st.target : st.x + Math.sign(d) * step;
}

// no balanço o bumbum fica no assento (o corpo gira junto com as cordas)
function swingSpot() {
  const [sx, sy, th] = seatPos(), d = geo.bs * .45;
  return [sx - Math.sin(th) * d, sy + Math.cos(th) * d];
}

function updateParkBaby(dt) {
  const { bs, home, slide } = geo, age = clock - park.at;
  updateStroller(dt);
  park.swingPhase += SWING_W * dt;
  park.swingA *= Math.pow(park.state === 'swing' ? .8 : .5, dt);
  switch (park.state) {
    case 'arrive':
      [park.fx, park.fy] = strollerSeat();
      if (park.stroller.x === park.stroller.target) { hopTo(home.x, home.y, .55, 'home'); park.stroller.target = W + bs * 4; }
      break;
    case 'home': park.fx = home.x; park.fy = home.y; break;   // acompanha a toalha se a tela girar
    case 'call':
      if (park.stroller.x === park.stroller.target) hopTo(...strollerSeat(), .5, 'roll');
      break;
    case 'hop': {
      const h = park.hop, p = clamp01((clock - h.at) / h.dur);
      park.fx = h.x0 + (h.x1 - h.x0) * p;
      park.fy = h.y0 + (h.y1 - h.y0) * p - Math.sin(p * Math.PI) * bs * 1.4;
      if (h.after === 'swing') [h.x1, h.y1] = swingSpot();
      if (p >= 1) {
        park.state = h.after; park.at = clock;
        if (h.after === 'roll') park.stroller.target = W + bs * 4;
        if (h.after === 'swing') { push(); use('balanco', 'Lá vai ela no balanço!'); }
        if (h.after === 'climb') use('escorrega', 'Escorrega, escorrega!');
      }
      break;
    }
    case 'swing': {
      [park.fx, park.fy] = swingSpot();
      if (park.swingA < .06 && clock - park.lastPush > 5) hopTo(home.x, home.y, .6, 'home');
      break;
    }
    case 'climb': {
      const p = clamp01(age / .9);
      park.fx = slide.ladderX; park.fy = geo.gy + (slide.top - geo.gy) * p + Math.abs(Math.sin(p * Math.PI * 4)) * bs * -.1;
      if (p >= 1) { park.state = 'slide'; park.at = clock; say('b-uii', 'Uiiii!'); sfx.whoosh(); }
      break;
    }
    case 'slide': {
      const p = clamp01(age / .9), e = p * p;
      [park.fx, park.fy] = slidePoint(e);
      if (p >= 1) { burst(park.fx, park.fy, bs, 50, 14); baby.laughAt = clock; hopTo(home.x, home.y, .7, 'home'); }
      break;
    }
    case 'roll':
      [park.fx, park.fy] = strollerSeat();
      if (park.stroller.x > W + bs * 3 && fade.fired) fadeTo(exitPark);
      break;
  }
  placeParkBaby();
}

// (fx, fy) é onde fica o bumbum; a cabeça vai acima, girando em volta da barriga
function placeParkBaby() {
  const { bs } = geo, rot = park.state === 'swing' ? seatPos()[2] : park.state === 'slide' ? -.35 : 0;
  baby.s = bs;
  baby.x = park.fx + Math.sin(rot) * bs * .9;
  baby.y = park.fy - Math.cos(rot) * bs * .9 - bs * 1.3;
  baby.rot = rot;
}

function updateDucks(dt) {
  const { pond } = geo;
  for (const c of park.crumbs) c.t += dt;
  for (const d of park.ducks) {
    const food = park.crumbs.filter(c => c.t > .6).sort((p, q) => Math.hypot(p.x - d.x, p.y - d.y) - Math.hypot(q.x - d.x, q.y - d.y))[0];
    let tx, ty;
    if (food) { tx = food.x; ty = food.y; }
    else { d.a += dt * .35; tx = pond.x + Math.cos(d.a) * pond.rx * .6; ty = pond.y + Math.sin(d.a) * pond.ry * .5; }
    const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy), sp = (food ? geo.u * 1.6 : geo.u * .5) * dt;
    if (dist > 1) { d.x += dx / dist * Math.min(sp, dist); d.y += dy / dist * Math.min(sp, dist); if (Math.abs(dx) > 2) d.faceRight = dx > 0; }
    if (food && dist < 6) {
      park.crumbs = park.crumbs.filter(c => c !== food);
      d.quackAt = clock; sfx.quack(); ring(d.x, d.y, geo.u * .3);
    }
  }
}

function updateFlies(dt, t) {
  for (const f of park.flies) {
    if (clock > f.retarget) { f.tx = rand(W * .1, W * .9); f.ty = rand(geo.gy - geo.u * 2.5, geo.gy + geo.u); f.retarget = clock + rand(2, 4); }
    const tx = f.toBaby > clock ? baby.x + Math.sin(t * 2 + f.phase) * baby.s : f.tx, ty = f.toBaby > clock ? baby.y - baby.s * 1.1 : f.ty;
    f.x += (tx - f.x) * Math.min(dt * 1.2, 1) + Math.sin(t * 3 + f.phase) * 20 * dt;
    f.y += (ty - f.y) * Math.min(dt * 1.2, 1) + Math.cos(t * 4 + f.phase) * 20 * dt;
  }
}

function updatePark(dt, t) {
  if (place !== 'parque') return;
  updateParkBaby(dt);
  updateDucks(dt);
  updateFlies(dt, t);
}

// ---------- toques ----------
function parkTap(x, y) {
  if (place !== 'parque' || ['arrive', 'call', 'roll'].includes(park.state) || ['call', 'roll'].includes(park.hop?.after)) return;
  const { swing, slide, pond, u, gy, sun } = geo;
  const fly = park.flies.find(f => near(x, y, f.x, f.y, u * .5));
  if (fly) { fly.toBaby = clock + 4; sfx.chime(); baby.laughAt = clock; return; }
  if (near(x, y, sun.x, sun.y, sun.r * 1.4)) { park.sunSpinAt = clock; sfx.chime(); ring(x, y, sun.r); return; }
  if (park.state === 'home') {
    const part = babyPart(x, y);
    if (part) { pokeBaby(part, x, y); return; }
  }
  if (Math.abs(x - swing.x) < swing.half + u * .4 && y > swing.top - u * .3 && y < gy + u * .2) { goSwing(); return; }
  if (x > slide.ladderX - u * .5 && x < slide.endX + u * .3 && y > slide.top - u * .5 && y < gy + u * .2) { goSlide(); return; }
  if (((x - pond.x) / (pond.rx + u * .3)) ** 2 + ((y - pond.y) / (pond.ry + u * .3)) ** 2 < 1) { throwCrumbs(); return; }
  sfx.bell(); ring(x, y, R * .3); burst(x, y, R * .3, rand(0, 360), 6);
}

// ---------- desenho ----------
function drawSun(t) {
  const { x, y, r } = geo.sun, spin = pulse(park.sunSpinAt, 1.2) * 3;
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * .2 + spin);
  ctx.fillStyle = '#ffe36b';
  for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(r * 1.15, -r * .12); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 1.15, r * .12); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#ffd23b'; circle(ctx, x, y, r); ctx.fill();
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = r * .08; ctx.lineCap = 'round';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(x + d * r * .35, y - r * .05, r * .12, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(x, y + r * .1, r * .35, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
}

function drawSwingSeat() {
  const { swing, u } = geo, [sx, sy] = seatPos();
  ctx.strokeStyle = '#8a8a9a'; ctx.lineWidth = 2.5;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(swing.x + d * u * .3, swing.top); ctx.lineTo(sx + d * u * .3, sy); ctx.stroke(); }
  ctx.fillStyle = '#9a6a3f'; ctx.beginPath(); ctx.roundRect?.(sx - u * .42, sy - u * .06, u * .84, u * .14, u * .05); ctx.fill();
}

function drawStroller(front) {
  const { bs, home } = geo, x = park.stroller.x, g = home.y;
  if (!front) {
    ctx.fillStyle = '#ff8fc0';
    ctx.beginPath(); ctx.moveTo(x - bs * 1.25, g - bs * 1.9); ctx.arc(x - bs * .2, g - bs * 1.9, bs * 1.05, Math.PI, 1.55 * Math.PI); ctx.lineTo(x - bs * .2, g - bs * 1.9); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = bs * .1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + bs * 1.05, g - bs * 1.8); ctx.lineTo(x + bs * 1.7, g - bs * 2.9); ctx.stroke();
    ctx.lineWidth = bs * .18; ctx.beginPath(); ctx.moveTo(x + bs * 1.6, g - bs * 2.95); ctx.lineTo(x + bs * 1.9, g - bs * 2.85); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ff6fa8';
  ctx.beginPath(); ctx.moveTo(x - bs * 1.25, g - bs * 1.9); ctx.lineTo(x + bs * 1.25, g - bs * 1.9);
  ctx.quadraticCurveTo(x + bs * 1.25, g - bs * .7, x, g - bs * .7); ctx.quadraticCurveTo(x - bs * 1.25, g - bs * .7, x - bs * 1.25, g - bs * 1.9); ctx.fill();
  ctx.fillStyle = '#fff'; heartPath(ctx, x, g - bs * 1.35, bs * .25); ctx.fill();
  const spin = park.stroller.x / (bs * .35);
  for (const d of [-1, 1]) {
    const wx = x + d * bs * .8, wy = g - bs * .35;
    ctx.fillStyle = '#444'; circle(ctx, wx, wy, bs * .35); ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const a = spin + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * bs * .28, wy - Math.sin(a) * bs * .28); ctx.lineTo(wx + Math.cos(a) * bs * .28, wy + Math.sin(a) * bs * .28); ctx.stroke(); }
  }
}

function drawDucks() {
  const size = Math.round(geo.u * .6 / 4) * 4;
  for (const c of park.crumbs) {
    const p = clamp01(c.t / .6);
    if (c.t < 0) continue;
    const x = c.x0 + (c.x - c.x0) * p, y = c.y0 + (c.y - c.y0) * p - Math.sin(p * Math.PI) * geo.u;
    ctx.fillStyle = '#d9a55b'; circle(ctx, x, y, 3.5); ctx.fill();
  }
  for (const d of park.ducks) {
    const bob = Math.sin(clock * 3 + d.a) * 2, q = pulse(d.quackAt, .4);
    ctx.save(); ctx.translate(d.x, d.y + bob - q * 6); ctx.scale(d.faceRight ? -1 : 1, 1);
    ctx.drawImage(emojiSprite('🦆', size), -size / 2, -size * .8, size, size);
    ctx.restore();
  }
}

function drawFlies(t) {
  const size = Math.round(geo.u * .45 / 4) * 4;
  for (const f of park.flies) {
    const flap = .35 + .65 * Math.abs(Math.sin(t * 12 + f.phase));
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(flap, 1);
    ctx.drawImage(emojiSprite('🦋', size), -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

function drawPark(t) {
  ctx.drawImage(parkLayer, 0, 0, W, H);
  drawSun(t);
  const onSwing = park.state === 'swing';
  if (!onSwing) drawSwingSeat();
  drawDucks();
  const stroller = park.stroller.x > -geo.bs * 3 && park.stroller.x < W + geo.bs * 3;
  if (stroller) drawStroller(false);
  drawBaby(t);
  if (stroller) drawStroller(true);
  if (onSwing) drawSwingSeat();
  drawFlies(t);
}

CARES.passeio = {
  start() { fadeTo(enterPark); },
  tap: parkTap,
  update: updatePark,
  look(L) {
    if (['slide', 'climb'].includes(park.state) || (park.state === 'swing' && park.swingA > .3)) { L.eyes = 'happy'; L.mouth = 'laugh'; }
  },
  end() { homeBtn.classList.remove('on', 'wanted'); },
};
