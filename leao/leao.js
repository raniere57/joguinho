'use strict';
// o leãozinho sentado, todo em vetor pra poder rugir (boca enorme, juba estufando), mastigar,
// lamber a água, dormir e ficar com a juba arrepiada. E o ronco do rugido sintetizado.

const MANE = '#c8641f', MANE_IN = '#e58a30', BODY = '#f2b24f', BELLY = '#fbdc9c', FACE = '#f7c966', MUZZLE = '#fff1d6';
const TUFTS = 10;
const tuftAngle = i => -Math.PI / 2 + (i - (TUFTS - 1) / 2) * .3;

// s: { x, hy, r, roar 0..1, blink, eyes 'open'|'closed'|'happy', mouth 'smile'|'open'|'yawn'|'tongue', tongue 0..1,
//      messy[], dip, paw 0..1 (pata direita levantada), shake 0..1 (balançar a cabeça) }
function drawLion(g, s, t) {
  const { x, r, roar: k } = s, gy = s.hy + r * 2.25;
  // cauda
  const tw = Math.sin(t * 2.2) * .4 + k * .6;
  g.strokeStyle = BODY; g.lineWidth = r * .14; g.lineCap = 'round';
  const ex = x + r * (1.35 + Math.sin(tw) * .25), ey = gy - r * (.7 + .45 * Math.cos(tw));
  g.beginPath(); g.moveTo(x + r * .5, gy - r * .25); g.quadraticCurveTo(x + r * 1.55, gy - r * .05, ex, ey); g.stroke();
  g.fillStyle = MANE; g.beginPath(); g.ellipse(ex, ey, r * .16, r * .2, tw, 0, TAU); g.fill();
  // corpo sentado
  g.fillStyle = BODY;
  for (const d of [-1, 1]) { g.beginPath(); g.ellipse(x + d * r * .62, gy - r * .32, r * .45, r * .36, 0, 0, TAU); g.fill(); }
  g.beginPath(); g.ellipse(x, gy - r * .95, r * .75, r * .92, 0, 0, TAU); g.fill();
  g.fillStyle = BELLY; g.beginPath(); g.ellipse(x, gy - r * .72, r * .42, r * .58, 0, 0, TAU); g.fill();
  // patas da frente (a direita pode levantar pra bater na bola)
  for (const d of [-1, 1]) {
    const up = d > 0 ? s.paw : 0, sx = x + d * r * .24, sy = gy - r * .95;
    const px = sx + (x + r * 1.05 - sx) * up, py = gy - r * .08 + (gy - r * .95 - (gy - r * .08)) * up;
    g.strokeStyle = BODY; g.lineWidth = r * .34;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(px, py); g.stroke();
    g.fillStyle = BODY; g.beginPath(); g.ellipse(px, py, r * .24, r * .15, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgb(150 90 30 / .45)'; g.lineWidth = r * .03;
    for (const o of [-.08, .08]) { g.beginPath(); g.moveTo(px + o * r, py - r * .02); g.lineTo(px + o * r, py + r * .12); g.stroke(); }
  }
  drawHead(g, s, t);
}

function drawHead(g, s, t) {
  const { r, roar: k } = s, shake = k > .2 ? Math.sin(t * 70) * r * .025 * k : 0;
  g.save(); g.translate(s.x + shake, s.hy + s.dip); g.rotate(Math.sin(t * 18) * .12 * s.shake + Math.sin(t * 1.1) * .03);
  g.scale(1 + .1 * k, 1 + .1 * k);
  // juba: duas voltas de cachinhos, estufa no rugido
  const mr = r * (1.02 + .14 * k);
  g.fillStyle = MANE;
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + Math.sin(t * 2 + i) * .02; circle(g, Math.cos(a) * mr, Math.sin(a) * mr * .95 + r * .05, r * .4); g.fill(); }
  g.fillStyle = MANE_IN;
  for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + .2; circle(g, Math.cos(a) * r * .86, Math.sin(a) * r * .82 + r * .05, r * .3); g.fill(); }
  // cachos arrepiados (juba bagunçada)
  s.messy.forEach((m, i) => {
    if (!m) return;
    const a = tuftAngle(i) + Math.sin(t * 3 + i) * .05, c = Math.cos(a), sn = Math.sin(a), px = -sn, py = c;
    g.fillStyle = i % 2 ? MANE : '#a9501a';
    g.beginPath();
    g.moveTo(c * r * 1.15 + px * r * .14, sn * r * 1.15 + py * r * .14);
    g.quadraticCurveTo(c * r * 1.55 + px * r * .25, sn * r * 1.55 + py * r * .25, c * r * 1.75 + px * r * (.12 + Math.sin(i * 2.3) * .15), sn * r * 1.75);
    g.lineTo(c * r * 1.15 - px * r * .14, sn * r * 1.15 - py * r * .14); g.fill();
  });
  // orelhas e rosto
  for (const d of [-1, 1]) {
    g.fillStyle = BODY; circle(g, d * r * .6, -r * .66, r * .25); g.fill();
    g.fillStyle = '#e9a07a'; circle(g, d * r * .6, -r * .64, r * .13); g.fill();
  }
  g.fillStyle = FACE; circle(g, 0, 0, r * .8); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .25)'; g.beginPath(); g.ellipse(-r * .25, -r * .38, r * .25, r * .14, -.4, 0, TAU); g.fill();
  eyes(g, s, t);
  // focinho, bigode e nariz
  g.fillStyle = MUZZLE;
  for (const d of [-1, 1]) { circle(g, d * r * .17, r * .3, r * .22); g.fill(); }
  g.fillStyle = 'rgb(140 90 50 / .55)';
  for (const d of [-1, 1]) for (const [ox, oy] of [[.12, .26], [.2, .33], [.1, .36]]) { circle(g, d * ox * r, oy * r, r * .025); g.fill(); }
  g.fillStyle = '#6a3a2a'; g.beginPath(); g.moveTo(-r * .13, r * .08); g.quadraticCurveTo(0, r * .03, r * .13, r * .08); g.lineTo(0, r * .23); g.closePath(); g.fill();
  mouth(g, s, t);
  g.fillStyle = 'rgb(255 110 110 / .35)'; for (const d of [-1, 1]) { circle(g, d * r * .5, r * .22, r * .12); g.fill(); }
  g.restore();
}

function eyes(g, s, t) {
  const { r } = s;
  g.strokeStyle = '#3a2418'; g.lineWidth = r * .07; g.lineCap = 'round';
  for (const d of [-1, 1]) {
    const ex = d * r * .32, ey = -r * .1;
    if (s.roar > .3) { g.beginPath(); g.moveTo(ex - d * r * .12, ey - r * .08); g.lineTo(ex + d * r * .06, ey); g.lineTo(ex - d * r * .12, ey + r * .08); g.stroke(); continue; }
    if (s.eyes === 'closed') { g.beginPath(); g.arc(ex, ey - r * .02, r * .1, .15 * Math.PI, .85 * Math.PI); g.stroke(); continue; }
    if (s.eyes === 'happy') { g.beginPath(); g.arc(ex, ey + r * .05, r * .1, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); continue; }
    g.fillStyle = '#3a2418'; g.beginPath(); g.ellipse(ex, ey, r * .1, r * .13 * s.blink, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; circle(g, ex + r * .035, ey - r * .05 * s.blink, r * .04); g.fill();
  }
}

function mouth(g, s, t) {
  const { r } = s, open = Math.max(s.roar, s.mouth === 'open' ? .55 : s.mouth === 'yawn' ? .7 : 0);
  if (open > .05) {
    const w = r * (.16 + .2 * open), h = r * (.1 + .28 * open), cy = r * .44 + h * .5;
    g.fillStyle = '#7a2438'; g.beginPath(); g.ellipse(0, cy, w, h, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff7f9a'; g.beginPath(); g.ellipse(0, cy + h * .45, w * .62, h * .42, 0, 0, TAU); g.fill();
    if (s.mouth !== 'yawn') {
      g.fillStyle = '#fff';
      for (const d of [-1, 1]) {
        g.beginPath(); g.moveTo(d * w * .55, cy - h * .82); g.lineTo(d * w * .3, cy - h * .85); g.lineTo(d * w * .42, cy - h * .35); g.fill();
        g.beginPath(); g.moveTo(d * w * .5, cy + h * .8); g.lineTo(d * w * .28, cy + h * .85); g.lineTo(d * w * .4, cy + h * .4); g.fill();
      }
    }
    return;
  }
  g.strokeStyle = '#6a3a2a'; g.lineWidth = r * .045; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, r * .23); g.lineTo(0, r * .36); g.stroke();
  for (const d of [-1, 1]) { g.beginPath(); g.arc(d * r * .1, r * .38, r * .1, d > 0 ? .1 * Math.PI : .1 * Math.PI, d > 0 ? .9 * Math.PI : .9 * Math.PI); g.stroke(); }
  if (s.tongue > 0) {
    g.fillStyle = '#ff7f9a'; g.beginPath(); g.roundRect(-r * .09, r * .4, r * .18, r * (.1 + .28 * s.tongue), r * .09); g.fill();
    g.strokeStyle = '#e8607e'; g.lineWidth = r * .02; g.beginPath(); g.moveTo(0, r * .43); g.lineTo(0, r * (.45 + .22 * s.tongue)); g.stroke();
  }
}

// ronco do rugido: dente-de-serra grave com tremor rápido + sopro de ruído, por baixo da voz
function growl(power = 1) {
  const ac = sfx.ctx;
  if (!ac) return;
  const t = ac.currentTime, dur = .8 + .35 * power, out = ac.createGain();
  out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(.28 * power, t + .07);
  out.gain.setValueAtTime(.28 * power, t + dur * .55); out.gain.exponentialRampToValueAtTime(.0001, t + dur);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + .25); lp.frequency.exponentialRampToValueAtTime(350, t + dur);
  lp.connect(out).connect(ac.destination);
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(120, t); o.frequency.linearRampToValueAtTime(170, t + .25); o.frequency.exponentialRampToValueAtTime(75, t + dur);
  const am = ac.createGain(); am.gain.value = .6;
  const lfo = ac.createOscillator(); lfo.frequency.value = 27; const depth = ac.createGain(); depth.gain.value = .4;
  lfo.connect(depth).connect(am.gain);
  o.connect(am).connect(lp);
  const n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = .8;
  const ng = ac.createGain(); ng.gain.value = .35;
  n.connect(bp).connect(ng).connect(lp);
  for (const s of [o, lfo, n]) { s.start(t); s.stop(t + dur + .05); }
}
