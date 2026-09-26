'use strict';
// cada cuidado: start, update, tap/move/up, look (como a bebê fica) e desenhos atrás/na frente dela

// "Brilha, brilha, estrelinha" na caixinha de música
const NC = 523.25, ND = 587.33, NE = 659.25, NF = 698.46, NG = 783.99, NA = 880;
const TWINKLE = [[NC, 1], [NC, 1], [NG, 1], [NG, 1], [NA, 1], [NA, 1], [NG, 2], [NF, 1], [NF, 1], [NE, 1], [NE, 1], [ND, 1], [ND, 1], [NC, 2]];
const BALLOON_COLORS = ['#ff5f7e', '#ffc930', '#4fb4ff', '#5ad16e', '#b77cff'];
const FOAM_GOAL = 16, SPOON_BITES = 5, WIPES_GOAL = 9, BRUSH_GOAL = 16, KISSES_GOAL = 3, PEEK_ROUNDS = 3;
const SPOON_FLY = 1.1, SPOON_BACK = .45;
const ROCK_SWINGS = 8;

const CARES = {};
const near = (x, y, px, py, r) => Math.hypot(x - px, y - py) < r;
const mouthPos = () => [baby.x, baby.y + baby.s * .45];
// coisas ao lado da bebê (tigela, lixeira, fraldas, caixinha): perto dela, mas sem sair da tela
const besideX = (dir, half) => baby.x + dir * Math.min(baby.s * 1.85, (dir > 0 ? W - baby.x : baby.x) - half * baby.s - 6);

// ---------- mamadeira ----------
CARES.fome = {
  start() { this.milk = 1; this.in = 0; this.lastGulp = clock + .6; this.burpAt = -99; },
  gulp() {
    if (clock - this.lastGulp < .3 || this.milk <= 0 || this.in < 1) return;
    this.lastGulp = clock;
    this.milk = Math.max(0, this.milk - .2);
    sfx.gulp();
    heartBurst(baby.x + baby.s * .3, baby.y + baby.s * .4, 1);
    if (this.milk > .79 && this.milk < .81) say('b-nham', 'Nham, nham, nham!');
  },
  tap() { this.gulp(); },
  update() {
    this.in = Math.min((clock - modeAt) / .6, 1);
    if (this.milk > 0) { if (this.in >= 1 && clock - this.lastGulp > 1.1) this.gulp(); return; }
    if (this.burpAt < modeAt) {
      this.burpAt = clock + .5;
      setTimeout(() => { if (mode === 'fome') { sfx.burp(); say('delicia', 'Que delícia!', true); } }, 500);
    } else if (clock - this.burpAt > 1.6) done('fome');
  },
  look(L) {
    if (this.milk <= 0 && clock > this.burpAt) { L.eyes = 'happy'; L.mouth = 'laugh'; }
    else if (this.in >= 1) { L.eyes = 'happy'; L.mouth = 'suck'; }
  },
  drawFront(t) {
    const out = this.milk <= 0 ? clamp01((clock - (this.burpAt - .5)) / .5) : 0;
    const e = this.in * (1 - out), size = baby.s * 1.3;
    const tx = baby.x + baby.s * .75, ty = baby.y + baby.s * .55, fx = W * .5, fy = H;
    const x = fx + (tx - fx) * e, y = fy + (ty - fy) * e + Math.sin(t * 14) * 2 * e;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-2.3);
    ctx.drawImage(emojiSprite('🍼', Math.round(size / 10) * 10), -size / 2, -size / 2, size, size);
    ctx.restore();
  },
};

// ---------- papinha de colher: olha o aviãozinho! ----------
CARES.papinha = {
  start() { this.bites = 0; this.trip = null; this.ate = false; this.chewAt = -99; this.endAt = 0; this.said = false; },
  bowl() { return [besideX(1, .65), baby.y + baby.s * 2.1]; },
  tap() {
    if (this.trip !== null || this.bites >= SPOON_BITES) return;
    this.trip = clock; sfx.whoosh();
    if (!this.said) { this.said = true; say('aviao', 'Olha o aviãozinho! Vruuum!'); }
  },
  update() {
    if (this.trip !== null) {
      const a = clock - this.trip;
      if (a >= SPOON_FLY && !this.ate) {
        this.ate = true; this.bites++; this.chewAt = clock;
        sfx.gulp(); heartBurst(baby.x, baby.y + baby.s * .4, 2);
        if (this.bites === 1 || this.bites === 3) say('b-nham', 'Nham, nham, nham!');
      }
      if (a >= SPOON_FLY + SPOON_BACK) {
        this.trip = null; this.ate = false;
        if (this.bites >= SPOON_BITES) { this.endAt = clock; say('acabou', 'Comeu tudinho! Muito bem!', true); }
      }
    }
    if (this.endAt && clock - this.endAt > 2.4) done('papinha');
  },
  spoon(t) {
    const [bx, by] = this.bowl(), [mx, my] = mouthPos(), rest = [bx - baby.s * .05, by - baby.s * .35];
    if (this.trip === null) return { x: rest[0], y: rest[1] + Math.sin(t * 4) * 2, rot: -.4, full: false };
    const a = clock - this.trip;
    if (a < SPOON_FLY) {
      const p = a / SPOON_FLY, e = p * p * (3 - 2 * p);
      const x = rest[0] + (mx + baby.s * .1 - rest[0]) * e, y = rest[1] + (my - rest[1]) * e - Math.sin(p * Math.PI) * baby.s * 1.3;
      return { x: x + Math.sin(p * TAU * 2) * baby.s * .15, y, rot: -.4 + Math.sin(p * TAU * 2) * .5, full: true, flying: p };
    }
    const p = clamp01((a - SPOON_FLY) / SPOON_BACK);
    return { x: mx + baby.s * .1 + (rest[0] - mx - baby.s * .1) * p, y: my + (rest[1] - my) * p, rot: -.4, full: false };
  },
  look(L) {
    L.bib = true; L.food = this.bites;
    const sp = this.trip !== null && clock - this.trip < SPOON_FLY ? (clock - this.trip) / SPOON_FLY : 0;
    if (this.endAt) { L.eyes = 'happy'; L.mouth = 'laugh'; }
    else if (sp > .45) { L.eyes = 'wide'; L.mouth = 'wide'; }
    else if (clock - this.chewAt < .9) { L.eyes = 'happy'; L.mouth = 'chew'; }
  },
  drawFront(t) {
    const [bx, by] = this.bowl(), s = baby.s, left = 1 - this.bites / SPOON_BITES;
    ctx.fillStyle = 'rgb(120 60 140 / .15)'; ctx.beginPath(); ctx.ellipse(bx, by + s * .05, s * .6, s * .12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7fc8ff';
    ctx.beginPath(); ctx.moveTo(bx - s * .62, by - s * .45); ctx.quadraticCurveTo(bx - s * .55, by, bx, by); ctx.quadraticCurveTo(bx + s * .55, by, bx + s * .62, by - s * .45); ctx.fill();
    ctx.fillStyle = '#bfe4ff'; ctx.beginPath(); ctx.ellipse(bx, by - s * .45, s * .62, s * .14, 0, 0, TAU); ctx.fill();
    if (left > 0) { ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.ellipse(bx, by - s * .43, s * .5 * (.5 + left * .5), s * .1 * (.5 + left * .5), 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#fff'; heartPath(ctx, bx, by - s * .2, s * .1); ctx.fill();
    const sp = this.spoon(t);
    if (sp.flying && Math.random() < .5) sparkle(sp.x, sp.y);
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.rot);
    ctx.strokeStyle = '#c9d3de'; ctx.lineWidth = s * .08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * .1, 0); ctx.lineTo(s * .75, 0); ctx.stroke();
    ctx.fillStyle = '#dde5ee'; ctx.beginPath(); ctx.ellipse(0, 0, s * .16, s * .1, 0, 0, TAU); ctx.fill();
    if (sp.full) { ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.ellipse(0, -s * .02, s * .12, s * .07, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  },
};

// ---------- banho de espuma ----------
CARES.banho = {
  start() { this.foam = []; this.tub = 0; this.rinsedAt = -99; this.lastSqueak = 0; say('esfrega', 'Esfrega, esfrega!'); },
  scrub(x, y) {
    const { x: bx, y: by, s } = baby;
    if (this.rinsedAt > 0 || Math.hypot(x - bx, y - (by + s * .6)) > s * 2.2) return;
    if (this.foam.some(f => Math.hypot(f.x - x, f.y - y) < s * .2)) return;
    this.foam.push({ x, y, r: s * rand(.16, .26), born: clock });
    if (clock - this.lastSqueak > .08) { this.lastSqueak = clock; sfx.squeak(); }
    if (Math.random() < .12) { baby.laughAt = clock; sfx.giggle(); }
    if (this.foam.length === FOAM_GOAL) {
      this.rinsedAt = clock;
      sfx.splash(); burst(bx, by, s, 200, 24);
      say('limpinha', 'Que cheirosa! Limpinha, limpinha!');
      say('b-eba', 'Ebaaa!', true);
    }
  },
  tap(x, y) { for (let i = 0; i < 3; i++) this.scrub(x + rand(-20, 20), y + rand(-20, 20)); },
  move(x, y) { this.scrub(x, y); },
  update() {
    const t = clock - modeAt;
    this.tub = clamp01(this.rinsedAt > 0 ? 1 - (clock - this.rinsedAt - 2.6) / .6 : t / .6);
    if (this.rinsedAt > 0 && clock - this.rinsedAt > 3.3) done('banho');
  },
  look(L) {
    L.dirty = this.rinsedAt > 0 ? 0 : 1 - this.foam.length / FOAM_GOAL * .6;
    L.eyes = this.rinsedAt > 0 ? 'happy' : 'open'; L.mouth = 'laugh';
  },
  drawFront() {
    if (this.tub > 0) this.drawTub();
    const fade = this.rinsedAt > 0 ? Math.max(0, 1 - (clock - this.rinsedAt) / .6) : 1;
    if (!fade) return;
    for (const f of this.foam) {
      const k = easeOutBack(Math.min((clock - f.born) / .25, 1));
      ctx.globalAlpha = .92 * fade;
      ctx.fillStyle = '#fff'; circle(ctx, f.x, f.y, f.r * k); ctx.fill();
      ctx.fillStyle = 'rgb(180 225 255 / .7)'; circle(ctx, f.x + f.r * .25, f.y + f.r * .25, f.r * .45 * k); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, f.x - f.r * .3, f.y - f.r * .3, f.r * .18 * k); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  drawTub() {
    const { x, y, s } = baby, e = this.tub * this.tub * (3 - 2 * this.tub);
    const top = y + s * .95 + (1 - e) * H * .6, w = s * 2.5, h = s * 1.5;
    ctx.fillStyle = '#9ad8ff';
    ctx.beginPath(); ctx.ellipse(x, top, w * .96, s * .22, 0, 0, TAU); ctx.fill();
    const body = ctx.createLinearGradient(0, top, 0, top + h);
    body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#dfe9f5');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - w, top); ctx.lineTo(x + w, top);
    ctx.quadraticCurveTo(x + w, top + h, x + w * .6, top + h);
    ctx.lineTo(x - w * .6, top + h);
    ctx.quadraticCurveTo(x - w, top + h, x - w, top);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - w, top); ctx.lineTo(x + w, top); ctx.stroke();
    ctx.fillStyle = '#ffc930';
    for (const side of [-1, 1]) { circle(ctx, x + side * w * .62, top + h + s * .08, s * .12); ctx.fill(); }
    if (this.rinsedAt > 0) {   // patinho aparece quando fica limpinha
      const k = easeOutBack(Math.min((clock - this.rinsedAt) / .5, 1)), size = s * .9 * k, bob = Math.sin(clock * 4) * s * .05;
      ctx.drawImage(emojiSprite('🦆', Math.round(s * .9 / 10) * 10), x + w * .45 - size / 2, top - size * .75 + bob, size, size);
    }
  },
};

// ---------- trocar a fralda: tira a suja, limpa com lencinho, põe a nova ----------
CARES.fralda = {
  start() {
    Object.assign(this, { step: 0, at: clock, wipes: 0, lastWipe: 0, hand: null, saidWipe: false, binned: false, snapped: false });
    say('tira', 'Tira a fralda suja!');
  },
  bin() { return [besideX(-1, .45), baby.y + baby.s * 2.15]; },
  pile() { return [besideX(1, .35), baby.y + baby.s * 2.15]; },
  tap(x, y) {
    if (this.step === 0) { this.step = 1; this.at = clock; sfx.whoosh(); return; }
    this.hand = [x, y];
    if (this.step === 1) this.wipe(x, y);
  },
  move(x, y) { this.hand = [x, y]; if (this.step === 1) this.wipe(x, y); },
  up() { this.hand = null; },
  wipe(x, y) {
    if (clock - this.at < .7 || clock - this.lastWipe < .12) return;
    if (!near(x, y, baby.x, baby.y + baby.s * 1.5, baby.s * 1.3)) return;
    this.lastWipe = clock; this.wipes++;
    sfx.squeak(); sparkle(x, y); sparkle(x + rand(-10, 10), y + rand(-10, 10));
    if (this.wipes >= WIPES_GOAL) { this.step = 2; this.at = clock; sfx.whoosh(); }
  },
  update() {
    const a = clock - this.at;
    if (this.step === 1 && a > .55 && !this.binned) { this.binned = true; sfx.pop(); }
    if (this.step === 1 && a > .8 && !this.saidWipe) { this.saidWipe = true; say('lenco', 'Agora limpa com o lencinho!'); }
    if (this.step === 2 && a > .6 && !this.snapped) {
      this.snapped = true; sfx.bell(1046.5); baby.laughAt = clock;
      burst(baby.x, baby.y + baby.s * 1.7, baby.s * .6, 190, 16);
      say('fralda-nova', 'Fralda nova! Limpinha e cheirosa!');
    }
    if (this.step === 2 && a > 2.6) done('fralda');
  },
  look(L) {
    if (this.step === 0) { L.diaper = 'dirty'; L.stinky = true; L.mouth = 'pout'; }
    if (this.step === 2 && clock - this.at > .6) { L.diaper = clock - this.at < 2 ? 'clean' : null; L.eyes = 'happy'; L.mouth = 'laugh'; }
  },
  drawBack() {
    const [bx, by] = this.bin(), s = baby.s, lid = this.step === 1 && clock - this.at < .7 ? Math.sin(clamp01((clock - this.at) / .7) * Math.PI) : 0;
    ctx.fillStyle = '#8fd0b5'; ctx.beginPath(); ctx.moveTo(bx - s * .4, by - s * .7); ctx.lineTo(bx + s * .4, by - s * .7); ctx.lineTo(bx + s * .32, by); ctx.lineTo(bx - s * .32, by); ctx.fill();
    ctx.fillStyle = 'rgb(255 255 255 / .35)'; for (const d of [-.15, .15]) ctx.fillRect(bx + d * s - s * .03, by - s * .6, s * .06, s * .5);
    ctx.save(); ctx.translate(bx - s * .45, by - s * .72); ctx.rotate(-lid * 1.2);
    ctx.fillStyle = '#6fbf9c'; ctx.beginPath(); ctx.roundRect?.(0, -s * .1, s * .9, s * .12, s * .05); ctx.fill();
    ctx.restore();
    const [px, py] = this.pile();
    for (let i = 0; i < 3; i++) drawDiaper(ctx, px, py - s * .12 - i * s * .16, s * .5, 'clean', 1);
  },
  drawFront(t) {
    const a = clock - this.at, s = baby.s;
    if (this.step === 0) {   // fralda suja pisca pra ser tocada
      const k = .5 + .5 * Math.sin(t * 6);
      ctx.strokeStyle = `rgb(255 220 80 / ${.4 + .5 * k})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(baby.x, baby.y + s * 1.8, s * .85, s * .55, 0, 0, TAU); ctx.stroke();
    }
    if (this.step === 1 && a < .6) {   // voa pro lixo
      const p = a / .6, [bx, by] = this.bin(), sx = baby.x, sy = baby.y + s * 1.82;
      drawDiaper(ctx, sx + (bx - sx) * p, sy + (by - s * .8 - sy) * p - Math.sin(p * Math.PI) * s, s * .9, 'dirty', 1 - p * .5);
    }
    if (this.step === 1) {   // lencinho no dedo
      const [hx, hy] = this.hand || [baby.x + s * 1.2, baby.y + s * 1.2 + Math.sin(t * 3) * 3];
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(.2 + Math.sin(t * 8) * (this.hand ? .15 : .05));
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect?.(-s * .25, -s * .2, s * .5, s * .4, s * .08); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff'; for (const d of [-.1, 0, .1]) { circle(ctx, d * s, 0, s * .025); ctx.fill(); }
      ctx.restore();
    }
    if (this.step === 2 && a < .6) {   // fralda nova voando da pilha
      const p = a / .6, [px, py] = this.pile(), tx = baby.x, ty = baby.y + s * 1.72;
      drawDiaper(ctx, px + (tx - px) * p, py - s * .5 + (ty - py + s * .5) * p - Math.sin(p * Math.PI) * s, s * .9, 'clean', .5 + p * .5);
    }
  },
};

// ---------- escovar os dentinhos ----------
CARES.dentinho = {
  start() { this.strokes = 0; this.foam = []; this.shineAt = 0; this.last = 0; this.brush = null; say('escova', 'Escova, escova, escova os dentinhos!'); },
  scrub(x, y) {
    this.brush = [x, y];
    if (this.shineAt || clock - this.last < .07) return;
    const [mx, my] = mouthPos();
    if (!near(x, y, mx, my, baby.s * .85)) return;
    this.last = clock; this.strokes++;
    sfx.brush();
    if (this.foam.length < 14) this.foam.push({ x: rand(-.35, .35), y: rand(-.12, .2), r: rand(.05, .09), born: clock });
    if (this.strokes >= BRUSH_GOAL) {
      this.shineAt = clock; sfx.chime();
      burst(mx, my, baby.s * .4, 55, 14);
      say('brilhante', 'Que sorriso brilhante!');
    }
  },
  tap(x, y) { this.scrub(x, y); },
  move(x, y) { this.scrub(x, y); },
  up() { this.brush = null; },
  update() { if (this.shineAt && clock - this.shineAt > 2.6) done('dentinho'); },
  look(L) { L.eyes = this.shineAt ? 'happy' : 'open'; L.mouth = 'teeth'; L.teethShine = !!this.shineAt; },
  drawFront(t) {
    const s = baby.s, [mx, my] = mouthPos(), fade = this.shineAt ? clamp01(1 - (clock - this.shineAt) / .5) : 1;
    for (const f of this.foam) {
      const k = easeOutBack(Math.min((clock - f.born) / .2, 1));
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#fff'; circle(ctx, mx + f.x * s, my + f.y * s, f.r * s * k); ctx.fill();
      ctx.fillStyle = 'rgb(190 230 255 / .8)'; circle(ctx, mx + f.x * s + f.r * s * .3, my + f.y * s + f.r * s * .3, f.r * s * .4 * k); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.shineAt && clock - this.shineAt > .6) return;
    const [x, y] = this.brush || [baby.x + s * 1.3, baby.y + s * .9 + Math.sin(t * 4) * 4];
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.brush ? -.5 + Math.sin(t * 25) * .15 : -.5 + Math.sin(t * 3) * .1);
    ctx.fillStyle = '#4fb4ff'; ctx.beginPath(); ctx.roundRect?.(s * .15, -s * .07, s * .85, s * .14, s * .07); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect?.(-s * .2, -s * .08, s * .38, s * .16, s * .05); ctx.fill();
    ctx.fillStyle = '#9fe0ff'; for (let i = 0; i < 5; i++) ctx.fillRect(-s * .18 + i * s * .07, -s * .2, s * .04, s * .13);
    ctx.fillStyle = '#fff'; circle(ctx, -s * .05, -s * .22, s * .07); ctx.fill();
    ctx.restore();
  },
};

// ---------- dodói: curativo e beijinho ----------
CARES.dodoi = {
  start() { this.step = 0; this.at = clock; this.kisses = 0; this.flying = []; say('curativo', 'Coloca o curativo!'); },
  box() { return [besideX(1, .7), baby.y + baby.s * 1.9]; },
  spot() { return [baby.x - baby.s * .38, baby.y - baby.s * .42]; },
  tap(x, y) {
    if (this.step === 0) { this.step = 1; this.at = clock; sfx.whoosh(); return; }
    if (this.step !== 2) return;
    this.kisses++;
    this.flying.push({ x, y, t: 0 });
    sfx.pop();
    if (this.kisses >= KISSES_GOAL) {
      this.step = 3; this.at = clock;
      setTimeout(() => {
        if (mode !== 'dodoi') return;
        baby.laughAt = clock; heartBurst(baby.x, baby.y - baby.s * .4, 10);
        say('sarou', 'Pronto, sarou!'); say('b-eba', 'Ebaaa!', true);
      }, 600);
    }
  },
  update(dt) {
    for (const k of this.flying) k.t += dt;
    this.flying = this.flying.filter(k => k.t < .6);
    if (this.step === 1 && clock - this.at > .6) {
      this.step = 2; this.at = clock; bandageUntil = clock + 60;
      sfx.bell(880); sparkle(...this.spot());
      say('beijinho', 'Agora um beijinho pra sarar!');
    }
    if (this.step === 3 && clock - this.at > 2.8) done('dodoi');
  },
  look(L) {
    L.bump = true; L.bandage = this.step >= 2;
    if (this.step < 2) L.crying = true;
    else if (this.step === 2) L.sniff = true;
    else if (clock - this.at > .6) { L.eyes = 'happy'; L.mouth = 'laugh'; }
  },
  drawFront(t) {
    const s = baby.s;
    if (this.step === 0) {
      const [bx, by] = this.box(), k = 1 + Math.sin(t * 6) * .08;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect?.(bx - s * .5, by - s * .38, s, s * .7, s * .12); ctx.fill();
      ctx.fillStyle = '#ff5f6d'; ctx.fillRect(bx - s * .08, by - s * .26, s * .16, s * .46); ctx.fillRect(bx - s * .23, by - s * .11, s * .46, s * .16);
      drawBandage(ctx, bx, by - s * .6, s * 1.3, k);
    }
    if (this.step === 1) {
      const p = clamp01((clock - this.at) / .6), [bx, by] = this.box(), [sx, sy] = this.spot();
      drawBandage(ctx, bx + (sx - bx) * p, by - s * .6 + (sy - by + s * .6) * p - Math.sin(p * Math.PI) * s, s * (1.3 - p * .3));
    }
    const [sx, sy] = this.spot();
    for (const k of this.flying) {
      const p = k.t / .6, size = Math.round(s * .55 / 4) * 4;
      ctx.drawImage(emojiSprite('💋', size), k.x + (sx - k.x) * p - size / 2, k.y + (sy - k.y) * p - size / 2, size, size);
    }
  },
};

// ---------- frio: gorro, cachecol e cobertor ----------
const WARM_ITEMS = [['gorro', 'O gorro!'], ['cachecol', 'O cachecol!'], ['cobertor', 'E o cobertor!']];
CARES.frio = {
  start() { this.n = 0; this.at = []; this.warmAt = 0; say('agasalha', 'Vamos agasalhar a bebê!'); },
  tap() {
    if (this.n >= WARM_ITEMS.length) return;
    this.at[this.n] = clock;
    say(WARM_ITEMS[this.n][0], WARM_ITEMS[this.n][1]);
    sfx.bell(659 + this.n * 200);
    const y = [baby.y - baby.s * .9, baby.y + baby.s * .6, baby.y + baby.s * 1.8][this.n];
    burst(baby.x, y, baby.s * .5, 350, 12);
    this.n++;
    if (this.n === WARM_ITEMS.length) {
      this.warmAt = clock + .9;
      setTimeout(() => { if (mode === 'frio') { baby.laughAt = clock; heartBurst(baby.x, baby.y, 8); say('quentinha', 'Agora ela está quentinha!'); } }, 900);
    }
  },
  update() { if (this.warmAt && clock - this.warmAt > 2.4) { warmUntil = clock + 60; done('frio'); } },
  look(L) {
    L.cold = this.n < WARM_ITEMS.length;
    L.gorro = this.n >= 1; L.scarf = this.n >= 2;
    L.blanket = this.n >= 3 ? clamp01((clock - this.at[2]) / .5) : 0;
    if (this.warmAt && clock > this.warmAt) { L.eyes = 'happy'; L.mouth = 'laugh'; }
  },
  drawFront(t) {   // o próximo agasalho, esperando o toque
    if (this.n >= WARM_ITEMS.length) return;
    const s = baby.s, x = besideX(1, .6), y = baby.y + s * 1.2 + Math.sin(t * 3) * s * .06, k = 1 + Math.sin(t * 6) * .06;
    ctx.fillStyle = 'rgb(255 255 255 / .85)'; circle(ctx, x, y, s * .55 * k); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const kind = WARM_ITEMS[this.n][0];
    if (kind === 'gorro') { ctx.translate(0, s * .3); drawHeadItem(ctx, 'gorro', s * .38); }
    else if (kind === 'cachecol') {
      ctx.fillStyle = '#ff5f5f'; ctx.beginPath(); ctx.ellipse(0, -s * .1, s * .32, s * .1, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.roundRect?.(s * .05, -s * .1, s * .12, s * .35, s * .04); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(s * .05, s * .05, s * .12, s * .05);
    } else {
      ctx.fillStyle = '#9fd4ff'; ctx.beginPath(); ctx.roundRect?.(-s * .32, -s * .25, s * .64, s * .5, s * .1); ctx.fill();
      ctx.fillStyle = '#fff'; star(ctx, -s * .12, -s * .05, s * .06, 0); star(ctx, s * .12, s * .08, s * .06, 0);
    }
    ctx.restore();
  },
};

// ---------- soninho: caixinha de música, noite e zzz ----------
CARES.sono = {
  start() { this.zzz = []; this.twinkles = []; this.song = null; this.woke = false; say('b-boceja', 'Aaaahhh...'); },
  wake() { this.song?.stop(); this.songEndsAt = clock; if (!this.song) this.song = { stop() {} }; },
  end() { this.song?.stop(); baby.armsUp = 0; },
  tap(x, y) { this.twinkles.push({ x, y, t: 0 }); sfx.chime(); },
  update(dt) {
    const t = clock - modeAt, waking = this.song && clock > this.songEndsAt;
    night += ((waking ? 0 : 1) - night) * Math.min(dt * 1.5, 1);
    if (!this.song && t > 1.4) {
      this.song = sfx.musicBox(TWINKLE, .6);
      this.songEndsAt = clock + this.song.duration + 1.5;
      say('dormiu', 'Shhh... a bebê dormiu.');
    }
    if (!waking && Math.random() < dt * .8) this.zzz.push({ x: baby.x + baby.s * .6, y: baby.y - baby.s * .6, t: 0, dir: rand(.5, 1) });
    if (waking && !this.woke) { this.woke = true; say('b-bomdia', 'Bom dia!'); say('bomdia', 'Bom dia, bebê!', true); }
    baby.armsUp = waking ? Math.min((clock - this.songEndsAt) / .5, 1) * (1 - Math.max(0, clock - this.songEndsAt - 1.5)) : 0;
    if (waking && clock - this.songEndsAt > 2.4) { baby.armsUp = 0; done('sono'); }
  },
  drawOver(t) {
    for (const z of this.zzz) z.t += frameDt;
    this.zzz = this.zzz.filter(z => z.t < 3);
    ctx.font = `700 ${baby.s * .4}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const z of this.zzz) {
      ctx.globalAlpha = Math.min(z.t, 1) * (1 - z.t / 3);
      ctx.fillStyle = '#e8e4ff';
      ctx.fillText('z', z.x + Math.sin(z.t * 2) * baby.s * .3 * z.dir + z.t * baby.s * .3, z.y - z.t * baby.s * .7);
    }
    for (const s of this.twinkles) s.t += frameDt;
    this.twinkles = this.twinkles.filter(s => s.t < 1.5);
    for (const s of this.twinkles) {
      ctx.globalAlpha = 1 - s.t / 1.5;
      ctx.fillStyle = '#fff3a0';
      star(ctx, s.x, s.y - s.t * 20, 14 * easeOutBack(Math.min(s.t / .3, 1)), t);
    }
    ctx.globalAlpha = 1;
  },
};

// ---------- brincar: balões ou "cadê? achou!" (alterna) ----------
CARES.brincar = {
  round: 0,
  start() {
    this.kind = this.round++ % 2 ? 'esconde' : 'baloes';
    if (this.kind === 'baloes') { this.balloons = []; this.popped = 0; this.spawned = 0; say('b-oba', 'Oba!'); }
    else { this.found = 0; this.hideAt = clock + .3; this.foundAt = -99; this.endAt = 0; say('cade', 'Cadê a bebê?'); }
  },
  hidden() { return this.kind === 'esconde' && clock > this.hideAt && this.foundAt < this.hideAt; },
  tap(x, y) {
    if (this.kind === 'baloes') {
      const i = this.balloons.findIndex(b => Math.hypot(x - b.x, y - b.y) < b.r * 1.4);
      if (i >= 0) this.pop(i);
      return;
    }
    if (!this.hidden() || clock - this.hideAt < .4) return;
    this.foundAt = clock; this.found++;
    baby.laughAt = clock; sfx.giggle();
    say('achou', 'Achou!'); heartBurst(baby.x, baby.y, 5);
    if (this.found >= PEEK_ROUNDS) this.endAt = clock + 1.6;
    else { this.hideAt = clock + 1.9; setTimeout(() => { if (mode === 'brincar') say('cade', 'Cadê a bebê?'); }, 1900); }
  },
  pop(i) {
    const b = this.balloons.splice(i, 1)[0];
    this.popped++;
    sfx.pop(); ring(b.x, b.y, b.r); burst(b.x, b.y, b.r, 0, 18);
    baby.laughAt = clock;
    say(this.popped % 2 ? 'b-ri' : 'b-oba', 'Hihihi!');
  },
  update(dt) {
    if (this.kind === 'esconde') { if (this.endAt && clock > this.endAt) done('brincar'); return; }
    if (this.balloons.length < 2 && this.spawned < 8 && this.popped < 3) {
      this.spawned++;
      const side = this.spawned % 2 ? -1 : 1;
      this.balloons.push({ x: baby.x + side * baby.s * rand(1.2, 2), y: H * .92, r: baby.s * rand(.55, .7), color: pick(BALLOON_COLORS), phase: rand(0, TAU), vy: H * rand(.09, .12) });
    }
    for (const b of this.balloons) { b.y -= b.vy * dt; b.x += Math.sin(clock * 1.5 + b.phase) * 18 * dt; }
    this.balloons = this.balloons.filter(b => b.y > -b.r * 3);
    const nb = this.balloons[0];
    if (nb) { baby.lookX = Math.sign(nb.x - baby.x); baby.lookY = Math.sign(nb.y - baby.y); }
    if ((this.popped >= 3 || this.spawned >= 8) && !this.balloons.length) { baby.lookX = baby.lookY = 0; done('brincar'); }
  },
  look(L) {
    if (this.kind !== 'esconde') return;
    L.peek = this.hidden() ? clamp01((clock - this.hideAt) / .3) : 1 - clamp01((clock - this.foundAt) / .2);
    if (clock - this.foundAt < 1.2) { L.eyes = 'happy'; L.mouth = 'laugh'; }
  },
  drawBack(t) { if (this.kind === 'baloes') for (const b of this.balloons) if (b.y > baby.y) drawBalloon(b, t); },
  drawFront(t) { if (this.kind === 'baloes') for (const b of this.balloons) if (b.y <= baby.y) drawBalloon(b, t); },
};

function drawBalloon(b, t) {
  const sway = Math.sin(t * 1.5 + b.phase) * .08;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(sway);
  ctx.strokeStyle = 'rgb(80 60 100 / .5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, b.r * 1.15); ctx.quadraticCurveTo(b.r * .3, b.r * 1.8, 0, b.r * 2.6); ctx.stroke();
  const g = ctx.createRadialGradient(-b.r * .35, -b.r * .45, b.r * .1, 0, 0, b.r * 1.2);
  g.addColorStop(0, '#fff'); g.addColorStop(.25, b.color); g.addColorStop(1, b.color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, b.r * .9, b.r * 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = b.color;
  ctx.beginPath(); ctx.moveTo(-b.r * .12, b.r * 1.18); ctx.lineTo(b.r * .12, b.r * 1.18); ctx.lineTo(0, b.r * 1.02); ctx.fill();
  ctx.restore();
}

// ---------- colo: arrastar o dedo na bebê balança ela, e cada balanço toca uma nota ----------
const rock = { on: false, k: 0, x0: 0, lastX: 0, dir: 0, travel: 0, swings: 0, note: 0 };

function startRock(x) { Object.assign(rock, { on: true, x0: x, lastX: x, dir: 0, travel: 0 }); }

function moveRock(x) {
  const dx = x - rock.lastX, dir = Math.sign(dx);
  rock.lastX = x;
  if (!dir) return;
  if (dir !== rock.dir) {
    if (rock.travel > baby.s * .25) swing();
    rock.dir = dir; rock.travel = 0;
  }
  rock.travel += Math.abs(dx);
}

function swing() {
  const [f] = TWINKLE[rock.note++ % TWINKLE.length];
  sfx.bell(f);
  rock.swings++;
  heartBurst(baby.x, baby.y + baby.s, 1);
  if (rock.swings % ROCK_SWINGS) return;
  heartBurst(baby.x, baby.y, 8);
  baby.laughAt = clock;
  if (need === 'sono') { endRock(); startCare('sono'); return; }
  say('adora-colo', 'Ela adora colo!');
  if (need === 'colo') reward('colo');
}

function endRock() { rock.on = false; }

function updateRock(dt) {
  rock.k += ((rock.on ? 1 : 0) - rock.k) * Math.min(dt * 6, 1);
  const target = rock.on ? Math.max(-1, Math.min(1, (rock.lastX - rock.x0) / (baby.s * 2.2))) * .3 : 0;
  baby.rot += (target - baby.rot) * Math.min(dt * 8, 1);
}

// braços de quem segura a bebê no colo
function drawHoldingArms() {
  if (rock.k < .02) return;
  const { x, y, s } = baby, c = Math.cos(baby.rot), sn = Math.sin(baby.rot);
  const px = x, py = y + s * 1.3;
  ctx.globalAlpha = rock.k;
  for (const side of [-1, 1]) {
    const lx = side * s * .75, ly = s * .75, hx = px + lx * c - ly * sn, hy = py + lx * sn + ly * c;
    const ex = side < 0 ? -s * .5 : W + s * .5, ey = H + s * .3;
    ctx.strokeStyle = '#b8a4e8'; ctx.lineWidth = s * .4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(hx + side * s * .9, hy + s * 1.2, hx, hy); ctx.stroke();
    ctx.fillStyle = '#f0c9a6'; circle(ctx, hx, hy, s * .22); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// dica do colo: mãozinha balançando em cima da bebê
function drawColoHint(t) {
  if (need !== 'colo' || mode !== 'idle' || rock.on || clock - Math.max(needAt, lastTap) < HINT_AFTER) return;
  const size = Math.round(baby.s * .7 / 4) * 4, x = baby.x + Math.sin(t * 3) * baby.s * .9, y = baby.y + baby.s * 1.2;
  ctx.drawImage(emojiSprite('👆', size), x - size / 2, y, size, size);
}
