'use strict';
// bichinhos do fundo do mar: polvo na pedra, caranguejo andando de lado, estrela-do-mar,
// água-viva, cavalo-marinho, tartaruga que passa de vez em quando e a baleia da festa.
// Cada um tem id (missões "Onde está...?"), hit(x, y), center() e tap().

const OCTO_COLORS = ['#b77cff', '#ff7aa8', '#ff9a3c', '#3fc4b8'];
const TURTLE_EVERY = [14, 24], TURTLE_SPEED = .9, WHALE_TIME = 7;

// olhinhos com brilho e boquinha, pra todos os bichos
function face(g, x, y, s, smile = true, look = 0) {
  for (const d of [-1, 1]) {
    g.fillStyle = '#fff'; circle(g, x + d * s * .3, y, s * .2); g.fill();
    g.fillStyle = '#2b2140'; circle(g, x + d * s * .3 + look * s * .05, y + s * .02, s * .12); g.fill();
    g.fillStyle = '#fff'; circle(g, x + d * s * .3 + s * .05, y - s * .05, s * .045); g.fill();
  }
  g.fillStyle = 'rgb(255 110 150 / .5)';
  for (const d of [-1, 1]) { circle(g, x + d * s * .52, y + s * .25, s * .1); g.fill(); }
  g.strokeStyle = '#2b2140'; g.lineWidth = s * .07; g.lineCap = 'round';
  g.beginPath();
  if (smile) g.arc(x, y + s * .15, s * .18, .2 * Math.PI, .8 * Math.PI);
  else circle(g, x, y + s * .3, s * .08);
  g.stroke();
}

const since = at => clock - at;
const pulseOf = (at, len) => { const p = since(at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

// ---------- polvo ----------
const octo = {
  id: 'polvo', colorI: 0, happyAt: -99,
  center() { return [rock.x, rock.top - S * .75]; },
  hit(x, y) { const [cx, cy] = this.center(); return Math.hypot(x - cx, y - cy) < S * .95; },
  tap() {
    this.colorI = (this.colorI + 1) % OCTO_COLORS.length; this.happyAt = clock;
    sfx.giggle(); sfx.blub();
    const [cx, cy] = this.center();
    burst(cx, cy, S * .5, 280, 12);
    for (let i = 0; i < 5; i++) addBubble(cx + rand(-S * .4, S * .4), cy - S * .3);
  },
  draw(t) {
    const s = S * 1.3, [x] = this.center(), y = rock.top, happy = since(this.happyAt) < 1.5, color = OCTO_COLORS[this.colorI];
    const hop = pulseOf(this.happyAt, .5) * S * .25;
    ctx.strokeStyle = color; ctx.lineWidth = s * .13; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const bx = x + (i - 2.5) * s * .13, sw = Math.sin(t * (happy ? 9 : 2.2) + i * 1.3) * s * .08;
      const ex = x + (i - 2.5) * s * .26 + sw, ey = y + s * .05;
      ctx.beginPath(); ctx.moveTo(bx, y - s * .35 - hop);
      ctx.quadraticCurveTo(bx + sw, y - s * .1, ex, ey);
      ctx.arc(ex + (i < 3 ? -1 : 1) * s * .05, ey - s * .05, s * .05, Math.PI / 2, i < 3 ? Math.PI * 1.6 : -Math.PI * .6, i >= 3);
      ctx.stroke();
    }
    const hy = y - s * .62 - hop;
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, hy, s * .4, s * .44 * (1 + pulseOf(this.happyAt, .5) * .08), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .25)';
    for (const [dx, dy, r] of [[-.2, -.25, .07], [.15, -.3, .05], [.25, -.1, .04]]) { circle(ctx, x + dx * s, hy + dy * s, r * s); ctx.fill(); }
    face(ctx, x, hy + s * .05, s * .45, true, Math.sin(t * .8) * .8);
  },
};

// ---------- caranguejo ----------
const crab = {
  id: 'caranguejo', x: 0, dir: 1, hopAt: -99, pauseUntil: 0,
  y() { return floorY + (H - floorY) * .38; },
  center() { return [this.x, this.y() - S * .45]; },
  hit(x, y) { const [cx, cy] = this.center(); return Math.abs(x - cx) < S * .85 && Math.abs(y - cy) < S * .65; },
  tap() {
    this.hopAt = clock; this.pauseUntil = clock + 1.5;
    sfx.clap(2); sfx.giggle();
    const [cx, cy] = this.center(); burst(cx, cy, S * .4, 15, 10);
  },
  update(dt) {
    if (!this.x) this.x = W * .5;
    if (clock < this.pauseUntil) return;
    this.x += this.dir * S * .55 * dt;
    if (this.x > W * .7) this.dir = -1;
    if (this.x < W * .32) this.dir = 1;
    if (Math.random() < dt * .08) this.pauseUntil = clock + rand(1, 2.5);
  },
  draw(t) {
    const s = S * .95, x = this.x, walking = clock >= this.pauseUntil;
    const y = this.y() - pulseOf(this.hopAt, .45) * S * .5, by = y - s * .32;
    ctx.strokeStyle = '#e0503a'; ctx.lineWidth = s * .07; ctx.lineCap = 'round';
    for (const d of [-1, 1]) for (let i = 0; i < 3; i++) {   // perninhas
      const step = walking ? Math.sin(t * 12 + i * 2 + d) * s * .06 : 0;
      ctx.beginPath(); ctx.moveTo(x + d * s * .3, by + s * .05 + i * s * .05);
      ctx.lineTo(x + d * s * (.5 + i * .06) + step, y - s * .02); ctx.stroke();
    }
    const snap = since(this.hopAt) < 1.2 ? Math.abs(Math.sin(clock * 16)) : .3 + .2 * Math.sin(t * 2);
    for (const d of [-1, 1]) {   // bracinhos e pinças
      const cx = x + d * s * .58, cy = by - s * .38;
      ctx.beginPath(); ctx.moveTo(x + d * s * .3, by - s * .05); ctx.quadraticCurveTo(x + d * s * .55, by - s * .05, cx, cy + s * .1); ctx.stroke();
      ctx.fillStyle = '#ff6b4a';
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, s * .17, -Math.PI / 2 + snap * .6, -Math.PI / 2 - snap * .6 + TAU); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = s * .05;   // olhos na anteninha
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * s * .12, by - s * .15); ctx.lineTo(x + d * s * .16, by - s * .42); ctx.stroke(); }
    ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.ellipse(x, by, s * .42, s * .27, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .25)'; ctx.beginPath(); ctx.ellipse(x - s * .1, by - s * .13, s * .2, s * .06, 0, 0, TAU); ctx.fill();
    for (const d of [-1, 1]) {
      ctx.fillStyle = '#fff'; circle(ctx, x + d * s * .16, by - s * .45, s * .1); ctx.fill();
      ctx.fillStyle = '#2b2140'; circle(ctx, x + d * s * .16 + this.dir * s * .03, by - s * .44, s * .06); ctx.fill();
    }
    ctx.strokeStyle = '#2b2140'; ctx.lineWidth = s * .04;
    ctx.beginPath(); ctx.arc(x, by, s * .1, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
  },
};

// ---------- estrela-do-mar ----------
const starfish = {
  id: 'estrela', spinAt: -99,
  center() { return [W * .57, floorY + (H - floorY) * .58]; },
  hit(x, y) { const [cx, cy] = this.center(); return Math.hypot(x - cx, y - cy) < S * .7; },
  tap() {
    this.spinAt = clock; sfx.bell(1318.5); setTimeout(() => sfx.bell(1568), 120);
    const [cx, cy] = this.center(); burst(cx, cy, S * .45, 30, 14);
  },
  draw() {
    const [x, y0] = this.center(), s = S * .95, p = Math.min(since(this.spinAt) / .9, 1);
    const y = y0 - pulseOf(this.spinAt, .9) * S * .6, rot = -Math.PI / 2 + (1 - (1 - p) ** 3) * TAU;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#ffa24d'; ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5, b = a + TAU / 10;
      ctx.lineTo(Math.cos(a) * s * .5, Math.sin(a) * s * .5);
      ctx.quadraticCurveTo(Math.cos(b) * s * .12, Math.sin(b) * s * .12, Math.cos(a + TAU / 5) * s * .5, Math.sin(a + TAU / 5) * s * .5);
    }
    ctx.fill();
    ctx.fillStyle = 'rgb(255 240 200 / .7)';
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; circle(ctx, Math.cos(a) * s * .3, Math.sin(a) * s * .3, s * .035); ctx.fill(); }
    ctx.restore();
    face(ctx, x, y, s * .32);
  },
};

// ---------- água-viva ----------
const jelly = {
  id: 'agua-viva', x: 0, glowAt: -99, vx: 1,
  y() { const b = waterBox(); return b.y0 + (b.y1 - b.y0) * .22 + Math.sin(clock * 1.2) * S * .25 - pulseOf(this.glowAt, 1) * S * .9; },
  center() { return [this.x, this.y()]; },
  hit(x, y) { return Math.abs(x - this.x) < S * .6 && y > this.y() - S * .5 && y < this.y() + S * .9; },
  tap() { this.glowAt = clock; sfx.boing(); burst(this.x, this.y(), S * .45, 300, 12); },
  update(dt) {
    if (!this.x) this.x = W * .75;
    this.x += this.vx * S * .2 * dt;
    if (this.x > W * .88) this.vx = -1;
    if (this.x < W * .6) this.vx = 1;
  },
  draw(t) {
    const x = this.x, y = this.y(), s = S * 1.1, glow = Math.max(0, 1 - since(this.glowAt) / 1.8), squish = 1 + Math.sin(t * 2.4) * .06;
    ctx.strokeStyle = 'rgb(255 170 220 / .8)'; ctx.lineWidth = s * .045; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const bx = x + (i - 2) * s * .14;
      ctx.beginPath(); ctx.moveTo(bx, y);
      for (let k = 1; k <= 6; k++) ctx.lineTo(bx + Math.sin(t * 3 + i + k * .9) * s * .06, y + k * s * .12);
      ctx.stroke();
    }
    if (glow) { ctx.fillStyle = `rgb(255 200 240 / ${.5 * glow})`; circle(ctx, x, y - s * .15, s * (.6 + glow * .2)); ctx.fill(); }
    ctx.fillStyle = `rgb(${255} ${150 + glow * 60} ${210 + glow * 40} / .88)`;
    ctx.beginPath(); ctx.ellipse(x, y, s * .4 * squish, s * .38 / squish, 0, Math.PI, TAU);
    for (let i = 0; i <= 4; i++) ctx.quadraticCurveTo(x + s * (.4 - i * .2 - .1) * squish, y + s * .1, x + s * (.4 - (i + 1) * .2) * squish, y);
    ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .45)'; ctx.beginPath(); ctx.ellipse(x - s * .15, y - s * .25, s * .1, s * .06, -.5, 0, TAU); ctx.fill();
    face(ctx, x, y - s * .14, s * .38);
  },
};

// ---------- cavalo-marinho ----------
const seahorse = {
  id: 'cavalo', hopAt: -99,
  center() { return [W * .31, floorY - S * 1.9 + Math.sin(clock * 1.5) * S * .15 - pulseOf(this.hopAt, .6) * S * .7]; },
  hit(x, y) { const [cx, cy] = this.center(); return Math.abs(x - cx) < S * .6 && Math.abs(y - cy) < S * .9; },
  tap() {
    this.hopAt = clock; sfx.bell(784); setTimeout(() => sfx.bell(988), 110); setTimeout(() => sfx.bell(1175), 220);
    const [cx, cy] = this.center(); burst(cx, cy, S * .4, 50, 10);
  },
  draw(t) {
    const [x, y] = this.center(), s = S * 1.4, c = '#ffc44d', dark = '#f0a020';
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.5) * .06 + pulseOf(this.hopAt, .6) * .4);
    ctx.fillStyle = dark;   // barbatana das costas
    ctx.beginPath(); ctx.ellipse(-s * .2, -s * .02, s * .1, s * (.12 + .02 * Math.sin(t * 14)), -.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = s * .13;   // rabinho enrolado
    ctx.beginPath(); ctx.moveTo(-s * .02, s * .12); ctx.quadraticCurveTo(-s * .05, s * .38, s * .06, s * .42);
    ctx.arc(s * .06, s * .34, s * .08, Math.PI / 2, -Math.PI * .9, true); ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, s * .17, s * .24, .15, 0, TAU); ctx.fill();   // barriga
    ctx.fillStyle = '#ffe39a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(s * .07, -s * .12 + i * s * .08, s * .07, s * .025, .2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = c; circle(ctx, -s * .02, -s * .3, s * .15); ctx.fill();   // cabeça e focinho
    ctx.beginPath(); ctx.roundRect?.(0, -s * .34, s * .27, s * .09, s * .045); ctx.fill();
    ctx.fillStyle = dark; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * (.13 - i * .06), -s * .4); ctx.lineTo(-s * (.12 - i * .06), -s * .5); ctx.lineTo(-s * (.08 - i * .06), -s * .42); ctx.fill(); }
    ctx.fillStyle = '#fff'; circle(ctx, s * .02, -s * .33, s * .06); ctx.fill();
    ctx.fillStyle = '#2b2140'; circle(ctx, s * .035, -s * .33, s * .037); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, s * .045, -s * .345, s * .013); ctx.fill();
    ctx.fillStyle = 'rgb(255 110 150 / .5)'; circle(ctx, s * .06, -s * .25, s * .03); ctx.fill();
    ctx.restore();
  },
};

// ---------- tartaruga ----------
const turtle = {
  id: 'tartaruga', active: false, x: 0, dir: 1, nextAt: 8, happyAt: -99,
  y() { const b = waterBox(); return b.y0 + (b.y1 - b.y0) * .5 + Math.sin(clock * .9) * S * .2; },
  center() { return [this.x, this.y()]; },
  hit(x, y) { return this.active && Math.abs(x - this.x) < S * .95 && Math.abs(y - this.y()) < S * .65; },
  start() {
    if (this.active) return;
    this.active = true; this.dir = Math.random() < .5 ? 1 : -1; this.x = this.dir > 0 ? -S * 1.2 : W + S * 1.2;
  },
  tap() { this.happyAt = clock; sfx.giggle(); sfx.blub(); for (let i = 0; i < 4; i++) addBubble(this.x + this.dir * S * .6, this.y() - S * .2); },
  update(dt) {
    if (!this.active) { if (started && clock > this.nextAt) this.start(); return; }
    const slow = since(this.happyAt) < 1.2 ? .3 : 1;
    this.x += this.dir * S * TURTLE_SPEED * slow * dt;
    if (this.x < -S * 1.5 || this.x > W + S * 1.5) { this.active = false; this.nextAt = clock + rand(...TURTLE_EVERY); }
  },
  draw(t) {
    if (!this.active) return;
    const x = this.x, y = this.y(), s = S * 1.5, roll = pulseOf(this.happyAt, 1.2);
    ctx.save(); ctx.translate(x, y); ctx.scale(this.dir, 1); ctx.rotate(roll * .5);
    ctx.fillStyle = '#7fd08a';
    for (const [fx, fy, a] of [[.22, .12, .6], [-.22, .12, 2.4], [.2, -.12, -.5], [-.2, -.12, -2.6]]) {
      ctx.save(); ctx.translate(fx * s, fy * s); ctx.rotate(a + Math.sin(t * 4 + fx * 9) * .35);
      ctx.beginPath(); ctx.ellipse(s * .13, 0, s * .15, s * .055, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    circle(ctx, s * .38, -s * .02, s * .13); ctx.fill();   // cabeça
    ctx.fillStyle = '#3f9e56'; ctx.beginPath(); ctx.ellipse(0, 0, s * .32, s * .22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#62bf6f';
    for (const [hx, hy] of [[0, 0], [-.15, -.07], [.15, -.07], [-.15, .07], [.15, .07]]) { ctx.beginPath(); ctx.ellipse(hx * s, hy * s, s * .075, s * .055, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#fff'; circle(ctx, s * .42, -s * .06, s * .04); ctx.fill();
    ctx.fillStyle = '#2b2140'; circle(ctx, s * .43, -s * .06, s * .025); ctx.fill();
    ctx.strokeStyle = '#2b2140'; ctx.lineWidth = s * .015; ctx.beginPath(); ctx.arc(s * .42, 0, s * .05, .1 * Math.PI, .6 * Math.PI); ctx.stroke();
    ctx.restore();
  },
};

// ---------- baleia (só na festa) ----------
const whale = {
  id: 'baleia', at: -99,
  active() { return since(this.at) < WHALE_TIME; },
  center() { return this.pos(); },
  pos() {
    const p = since(this.at) / WHALE_TIME;
    return [-S * 3 + (W + S * 6) * p, surfaceY + S * 1.4 + Math.sin(p * 9) * S * .15];
  },
  hit(x, y) { if (!this.active()) return false; const [wx, wy] = this.pos(); return Math.abs(x - wx) < S * 2 && Math.abs(y - wy) < S; },
  tap() { const [wx, wy] = this.pos(); sfx.boing(); this.spoutAt = clock; burst(wx, wy - S, S * .6, 200, 16); },
  come() { this.at = clock; this.spoutAt = clock + WHALE_TIME * .45; },
  draw(t) {
    if (!this.active()) return;
    const [x, y] = this.pos(), s = S * 3.6;
    const sp = since(this.spoutAt);
    if (sp > 0 && sp < 1.3) {   // esguicho
      ctx.fillStyle = 'rgb(200 240 255 / .85)';
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .25, r = s * .12 * Math.min(sp * 3, 1); circle(ctx, x + s * .15 + Math.cos(a) * r * 1.5, y - s * .3 + Math.sin(a) * r * 2.4, s * .04); ctx.fill(); }
      ctx.fillRect(x + s * .14, y - s * .45 * Math.min(sp * 3, 1) - s * .2, s * .025, s * .45 * Math.min(sp * 3, 1));
    }
    ctx.fillStyle = '#3f7fd6';
    ctx.save(); ctx.translate(x - s * .45, y - s * .05); ctx.rotate(Math.sin(t * 3) * .2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-s * .1, -s * .05, -s * .2, -s * .18); ctx.quadraticCurveTo(-s * .1, -s * .02, -s * .06, 0);
    ctx.quadraticCurveTo(-s * .1, s * .02, -s * .2, s * .1); ctx.quadraticCurveTo(-s * .1, s * .05, 0, 0); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(x, y, s * .5, s * .24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#bfe0ff'; ctx.beginPath(); ctx.ellipse(x + s * .05, y + s * .12, s * .4, s * .1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2f6cc0'; ctx.save(); ctx.translate(x + s * .08, y + s * .1); ctx.rotate(.6 + Math.sin(t * 3) * .25);
    ctx.beginPath(); ctx.ellipse(0, s * .07, s * .04, s * .1, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; circle(ctx, x + s * .28, y - s * .05, s * .045); ctx.fill();
    ctx.fillStyle = '#2b2140'; circle(ctx, x + s * .29, y - s * .05, s * .028); ctx.fill();
    ctx.strokeStyle = '#2b2140'; ctx.lineWidth = s * .012; ctx.beginPath(); ctx.arc(x + s * .3, y + s * .02, s * .08, .1 * Math.PI, .55 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgb(255 110 150 / .5)'; circle(ctx, x + s * .33, y + s * .06, s * .03); ctx.fill();
  },
};

// da frente pra trás, na hora do toque
const CRITTERS = [whale, turtle, jelly, seahorse, crab, starfish, octo];
