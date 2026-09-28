'use strict';
// o quarto: parede, chão, janela (céu de noite ou de dia, lua, estrelas e a corujinha no galho),
// cama, criado-mudo com abajur, pelúcia, caixa de brinquedos e o escuro quando apaga a luz.

let floorY = 0, R0 = 0, roomBg = null;
let win = {}, bed = {}, stand = {}, box = {}, spot = {}, picture = {};
let dayK = 0, darkK = 0;               // 0 = noite, 1 = dia; escuro do quarto com a luz apagada
const lamp = { on: true, tapAt: -99 };
const asleep = { lua: false, estrelas: false, coruja: false, pelucia: false };
const nod = { lua: -99, estrelas: -99, coruja: -99, pelucia: -99 };
const boxLid = { at: -99 };

function layoutRoom() {
  const p = H > W;
  floorY = H * (p ? .54 : .63);
  R0 = p ? Math.min(W * .14, H * .064) : Math.min(W * .06, H * .092);
  win = p ? { x: W * .06, y: H * .11, w: W * .46, h: H * .19 } : { x: W * .05, y: H * .14, w: W * .25, h: H * .34 };
  bed = p ? { x: W * .36, w: W * .58, top: floorY + H * .03, h: H * .085 } : { x: W * .46, w: W * .4, top: floorY + H * .03, h: H * .11 };
  bed.pillow = [bed.x + bed.w * .78, bed.top - R0 * .25];
  stand = p ? { x: W * .07, w: W * .19, top: floorY - H * .01, h: H * .09 } : { x: W * .31, w: W * .09, top: floorY - H * .02, h: H * .13 };
  picture = p ? { x: W * .62, y: H * .13, w: W * .3, h: H * .13 } : { x: W * .55, y: H * .12, w: W * .15, h: H * .22 };
  box = p ? { x: W * .17, y: H * .83, w: W * .27 } : { x: W * .1, y: H * .88, w: W * .13 };
  spot = p ? { x: W * .6, y: H * .865 } : { x: W * .6, y: H * .93 };   // onde o bichinho fica em pé
  roomBg = buildRoom();
}

// ---------- fundo parado ----------
function buildRoom() {
  const [c, g] = layer(W, H);
  const wall = g.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, '#c7b6f0'); wall.addColorStop(1, '#e3d8fa');
  g.fillStyle = wall; g.fillRect(0, 0, W, floorY);
  g.fillStyle = 'rgb(255 255 255 / .45)';   // papel de parede de estrelinhas
  for (let y = 30; y < floorY; y += 46) for (let x = (y / 46 % 2) * 23 + 10; x < W; x += 46) star(g, x, y, 4, -Math.PI / 2);
  g.fillStyle = '#fff'; g.fillRect(0, floorY - 8, W, 10);   // rodapé
  const floor = g.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, '#e2b47e'); floor.addColorStop(1, '#cf9a60');
  g.fillStyle = floor; g.fillRect(0, floorY + 2, W, H - floorY);
  g.strokeStyle = 'rgb(120 70 30 / .15)'; g.lineWidth = 2;
  for (let y = floorY + 26; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#ffb3cf';   // tapete
  g.beginPath(); g.ellipse(spot.x - W * .05, spot.y - R0 * .1, W * .3, R0 * .7, 0, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([6, 6]);
  g.beginPath(); g.ellipse(spot.x - W * .05, spot.y - R0 * .1, W * .27, R0 * .55, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  // buraco da janela (o céu é desenhado por baixo, e muda) + moldura e cortinas
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.roundRect?.(win.x, win.y, win.w, win.h, 12); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#fff'; g.lineWidth = 9; g.beginPath(); g.roundRect?.(win.x, win.y, win.w, win.h, 12); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(win.x + win.w / 2, win.y); g.lineTo(win.x + win.w / 2, win.y + win.h); g.stroke();
  g.fillStyle = '#ff9ec2';
  for (const side of [0, 1]) {
    const x = side ? win.x + win.w + 4 : win.x - 4, d = side ? 1 : -1;
    g.beginPath(); g.moveTo(x, win.y - 14);
    g.quadraticCurveTo(x - d * win.w * .12, win.y + win.h * .5, x + d * win.w * .02, win.y + win.h + 16);
    g.lineTo(x + d * win.w * .12, win.y + win.h + 16); g.quadraticCurveTo(x + d * win.w * .06, win.y + win.h * .5, x + d * win.w * .1, win.y - 14); g.fill();
  }
  g.fillStyle = '#b07a4f'; g.fillRect(win.x - 20, win.y - 18, win.w + 40, 7);
  drawBedFrame(g);
  drawNightstand(g);
  drawPicture(g);
  return c;
}

function drawBedFrame(g) {
  const { x, w, top, h } = bed;
  g.fillStyle = '#b07a4f';
  g.beginPath(); g.roundRect?.(x + w - w * .06, top - h * 1.6, w * .06, h * 2.8, 10); g.fill();   // cabeceira
  g.beginPath(); g.roundRect?.(x, top - h * .5, w * .05, h * 1.7, 8); g.fill();                   // pé da cama
  g.fillStyle = '#8f5f3a'; g.fillRect(x, top + h * .7, w, h * .35);
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(x + w * .03, top, w * .92, h * .75, 10); g.fill();   // colchão
}

// quadrinho do arco-íris na parede
function drawPicture(g) {
  const { x, y, w, h } = picture;
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect?.(x - 6, y - 6, w + 12, h + 12, 8); g.fill();
  g.fillStyle = '#e6f6ff'; g.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h * .85, r = Math.min(w * .42, h * .7);
  ['#ff5a5f', '#ffa24d', '#ffd23b', '#5ad16e', '#4fb4ff', '#b77cff'].forEach((c, i) => {
    g.strokeStyle = c; g.lineWidth = r * .1; g.beginPath(); g.arc(cx, cy, r - i * r * .1, Math.PI, TAU); g.stroke();
  });
  g.fillStyle = '#fff';
  for (const d of [-1, 1]) { circle(g, cx + d * r * .78, cy - r * .05, r * .16); g.fill(); circle(g, cx + d * r * .62, cy, r * .13); g.fill(); }
}

function drawNightstand(g) {
  const { x, w, top, h } = stand;
  g.fillStyle = '#f0c48a'; g.beginPath(); g.roundRect?.(x, top, w, h, 8); g.fill();
  g.fillStyle = '#d9a466'; g.fillRect(x + w * .1, top + h * .45, w * .8, 3);
  g.fillStyle = '#b07a4f'; circle(g, x + w / 2, top + h * .72, 4); g.fill();
}

// ---------- céu na janela ----------
function drawSky(t) {
  const night = ['#1d2a5c', '#3b4a8f'], day = ['#8fd8ff', '#e6f8ff'];
  const mix = (a, b) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), ch = s => Math.round(((pa >> s) & 255) * (1 - dayK) + ((pb >> s) & 255) * dayK); return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`; };
  ctx.save();
  ctx.beginPath(); ctx.roundRect?.(win.x, win.y, win.w, win.h, 12); ctx.clip();
  const sky = ctx.createLinearGradient(0, win.y, 0, win.y + win.h);
  sky.addColorStop(0, mix(night[0], day[0])); sky.addColorStop(1, mix(night[1], day[1]));
  ctx.fillStyle = sky; ctx.fillRect(win.x, win.y, win.w, win.h);
  const s = Math.min(win.w, win.h);
  if (dayK < 1) {
    ctx.globalAlpha = 1 - dayK;
    for (const [i, [fx, fy]] of starSpots().entries()) {
      const tw = asleep.estrelas ? .35 : .6 + .4 * Math.sin(t * 3 + i * 1.7), k = 1 + pulseAt(nod.estrelas - i * .08, .5) * .8;
      ctx.fillStyle = `rgb(255 245 180 / ${tw})`; star(ctx, win.x + fx * win.w, win.y + fy * win.h, s * .035 * k, -Math.PI / 2);
    }
    drawMoon(ctx, ...moonPos(), s * .16, asleep.lua, t);
    ctx.globalAlpha = 1;
  }
  if (dayK > 0) {
    ctx.globalAlpha = dayK;
    const sx = win.x + win.w * .7, sy = win.y + win.h * (.9 - dayK * .55);
    ctx.fillStyle = '#ffd23b'; circle(ctx, sx, sy, s * .14); ctx.fill();
    ctx.strokeStyle = '#ffd23b'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * .3; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * s * .19, sy + Math.sin(a) * s * .19); ctx.lineTo(sx + Math.cos(a) * s * .25, sy + Math.sin(a) * s * .25); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // galho com a corujinha
  ctx.strokeStyle = '#6b4a2f'; ctx.lineWidth = s * .05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(win.x - 5, win.y + win.h * .78); ctx.quadraticCurveTo(win.x + win.w * .25, win.y + win.h * .72, win.x + win.w * .45, win.y + win.h * .8); ctx.stroke();
  ctx.fillStyle = '#5fc46a'; ctx.beginPath(); ctx.ellipse(win.x + win.w * .4, win.y + win.h * .8, s * .06, s * .03, .4, 0, TAU); ctx.fill();
  drawOwl(ctx, ...owlPos(), s * .2, asleep.coruja || dayK > .5, t);
  ctx.restore();
}

const starSpots = () => [[.12, .15], [.35, .1], [.55, .3], [.8, .12], [.9, .45], [.2, .45], [.65, .55]];
function moonPos() { return [win.x + win.w * .72, win.y + win.h * .3]; }
function owlPos() { return [win.x + win.w * .22, win.y + win.h * .72 - pulseAt(nod.coruja, .5) * win.h * .06]; }

function drawMoon(g, x, y, r, sleeping, t) {
  g.fillStyle = 'rgb(255 245 180 / .25)'; circle(g, x, y, r * 1.5); g.fill();
  g.fillStyle = '#fff3b0'; circle(g, x, y, r); g.fill();
  g.fillStyle = '#f0dc86'; circle(g, x - r * .4, y - r * .35, r * .15); g.fill(); circle(g, x + r * .35, y + r * .4, r * .1); g.fill();
  sleepyFace(g, x, y + r * .05, r * .9, sleeping, t);
}

// carinha que dorme: olho fechado em arco e boquinha
function sleepyFace(g, x, y, r, sleeping, t) {
  g.strokeStyle = '#6b5a3a'; g.fillStyle = '#6b5a3a'; g.lineWidth = r * .09; g.lineCap = 'round';
  for (const d of [-1, 1]) {
    if (sleeping) { g.beginPath(); g.arc(x + d * r * .35, y - r * .1, r * .15, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
    else { circle(g, x + d * r * .35, y - r * .12, r * .1); g.fill(); }
  }
  g.fillStyle = 'rgb(255 140 160 / .45)';
  for (const d of [-1, 1]) { circle(g, x + d * r * .55, y + r * .15, r * .12); g.fill(); }
  g.beginPath(); g.arc(x, y + r * .15, r * .15, .15 * Math.PI, .85 * Math.PI); g.stroke();
}

function drawOwl(g, x, y, s, sleeping, t) {
  g.fillStyle = '#9a6a45'; g.beginPath(); g.ellipse(x, y - s * .45, s * .38, s * .48, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x - s * .32, y - s * .75); g.lineTo(x - s * .25, y - s * 1.02); g.lineTo(x - s * .1, y - s * .82); g.fill();
  g.beginPath(); g.moveTo(x + s * .32, y - s * .75); g.lineTo(x + s * .25, y - s * 1.02); g.lineTo(x + s * .1, y - s * .82); g.fill();
  g.fillStyle = '#e8c49a'; g.beginPath(); g.ellipse(x, y - s * .3, s * .24, s * .28, 0, 0, TAU); g.fill();
  for (const d of [-1, 1]) {
    g.fillStyle = '#fff'; circle(g, x + d * s * .15, y - s * .62, s * .13); g.fill();
    if (sleeping) { g.strokeStyle = '#3a2a1a'; g.lineWidth = s * .04; g.beginPath(); g.arc(x + d * s * .15, y - s * .64, s * .08, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
    else { g.fillStyle = '#2b2140'; circle(g, x + d * s * .15, y - s * .62, s * .07); g.fill(); g.fillStyle = '#fff'; circle(g, x + d * s * .17, y - s * .65, s * .025); g.fill(); }
  }
  g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(x - s * .05, y - s * .52); g.lineTo(x + s * .05, y - s * .52); g.lineTo(x, y - s * .43); g.fill();
  g.fillStyle = '#ffb347'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(x + d * s * .1, y + s * .02, s * .07, s * .03, 0, 0, TAU); g.fill(); }
}

// ---------- coisas do quarto que mudam ----------
function lampPos() { return [stand.x + stand.w * .35, stand.top]; }
function pelPos() { return [bed.x + bed.w * .14, bed.top]; }

function drawLamp(t) {
  const [x, y] = lampPos(), s = Math.min(stand.w * .9, R0 * 1.7), shake = pulseAt(lamp.tapAt, .3);
  if (lamp.on) {
    const glow = ctx.createRadialGradient(x, y - s * .75, 2, x, y - s * .75, s * 2.4);
    glow.addColorStop(0, 'rgb(255 230 150 / .55)'); glow.addColorStop(1, 'rgb(255 230 150 / 0)');
    ctx.fillStyle = glow; circle(ctx, x, y - s * .75, s * 2.4); ctx.fill();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(clock * 30) * shake * .06);
  ctx.fillStyle = '#b8c4d4'; ctx.fillRect(-s * .04, -s * .6, s * .08, s * .6);
  ctx.beginPath(); ctx.ellipse(0, -s * .02, s * .22, s * .06, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = lamp.on ? '#fff0b0' : '#e4d6f5';
  ctx.beginPath(); ctx.moveTo(-s * .2, -s * 1.02); ctx.lineTo(s * .2, -s * 1.02); ctx.lineTo(s * .36, -s * .55); ctx.lineTo(-s * .36, -s * .55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / .35)'; ctx.fillRect(-s * .12, -s * .98, s * .06, s * .38);
  ctx.restore();
}

function hitLamp(x, y) { const [lx, ly] = lampPos(), s = Math.min(stand.w * .9, R0 * 1.7); return Math.abs(x - lx) < s * .6 && y < ly + 10 && y > ly - s * 1.15; }

function drawPelucia(t) {
  const [x, y] = pelPos(), size = Math.round(R0 * 1.3 / 4) * 4, k = pulseAt(nod.pelucia, .5);
  ctx.save(); ctx.translate(x, y - k * R0 * .3); ctx.rotate(asleep.pelucia ? -.35 : Math.sin(t * 1.2) * .05);
  ctx.drawImage(emojiSprite('🧸', size), -size / 2, -size * .9, size, size);
  ctx.restore();
  if (asleep.pelucia) zzzAt(x + size * .3, y - size * .9, R0 * .3, t);
}

function drawToyBox() {
  const { x, y, w } = box, h = w * .55, lid = pulseAt(boxLid.at, .35);
  ctx.fillStyle = 'rgb(0 0 0 / .12)'; ctx.beginPath(); ctx.ellipse(x, y + 4, w * .55, w * .07, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4fb4ff'; ctx.beginPath(); ctx.roundRect?.(x - w / 2, y - h, w, h, w * .06); ctx.fill();
  ctx.fillStyle = '#ffd23b'; for (const [dx, c] of [[-.3, '#ffd23b'], [0, '#ff7aa8'], [.3, '#5ad16e']]) { ctx.fillStyle = c; star(ctx, x + dx * w, y - h * .45, w * .07, -Math.PI / 2); }
  ctx.save(); ctx.translate(x - w / 2, y - h); ctx.rotate(-1.9 - lid * .3);   // tampa aberta pra trás
  ctx.fillStyle = '#2f8fdb'; ctx.beginPath(); ctx.roundRect?.(0, -w * .08, w, w * .1, w * .04); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#2477c4'; ctx.fillRect(x - w / 2, y - h, w, h * .1);
}

function boxMouth() { return [box.x, box.y - box.w * .55]; }

function zzzAt(x, y, s, t) {
  ctx.fillStyle = '#fff'; ctx.font = `800 ${s}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const p = (t * .4 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.fillText('z', x + p * s * 1.5, y - p * s * 2.5);
  }
  ctx.globalAlpha = 1;
}

const pulseAt = (at, len) => { const p = (clock - at) / len; return p >= 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

// ---------- escuro e estrelinhas no teto ----------
function drawDark(t) {
  if (darkK <= 0) return;
  ctx.fillStyle = `rgb(12 16 52 / ${.62 * darkK})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = darkK;
  for (let i = 0; i < 22; i++) {   // luminária de estrelas girando
    const a = i * 2.4 + t * .08, rr = (i % 7 + 1) / 7;
    const x = W / 2 + Math.cos(a) * W * .55 * rr, y = floorY * .55 + Math.sin(a) * floorY * .5 * rr;
    ctx.fillStyle = `rgb(255 240 170 / ${.5 + .4 * Math.sin(t * 2 + i)})`; star(ctx, x, y, 3 + (i % 3) * 2, -Math.PI / 2);
  }
  const [lx, ly] = lampPos();
  const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, R0 * 1.2);
  glow.addColorStop(0, 'rgb(180 220 255 / .6)'); glow.addColorStop(1, 'rgb(180 220 255 / 0)');
  ctx.fillStyle = glow; circle(ctx, lx, ly, R0 * 1.2); ctx.fill();
  ctx.globalAlpha = 1;
}
