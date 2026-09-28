'use strict';
// o paciente (bichinho do jogo de dormir) com o que ele tem: febre (rosto vermelho e suor),
// dodói no joelho (arranhado e sujinho) ou resfriado (nariz escorrendo e atchim).
// Cada ferramenta voa da bandeja até o lugar certo, faz sua graça e aplica o efeito.

const AILS = {
  febre: { e: '🤒', need: ['termometro', 'remedio'] },
  dodoi: { e: '🤕', need: ['algodao', 'curativo'] },
  gripe: { e: '🤧', need: ['estetoscopio', 'lenco', 'remedio'] },
};
const TOOL_TIME = { termometro: 2.4, estetoscopio: 2.6, remedio: 1.9, algodao: 1.8, curativo: 1.1, lenco: 1.7 };
const FLY_IN = .45, WALK = 1.4;

const pat = { b: BICHOS[0], v: newLook(), ail: 'febre', x: 0, state: 'away', at: 0, done: [], fever: 0, dirt: 0, wound: false, bandage: false, drip: 0, sticker: -1, hopAt: -9, sneezeAt: -9, tempAt: -9 };
let act = null;   // ferramenta em uso: { id, at, from }

function newPatient(b, ail) {
  Object.assign(pat, {
    b, ail, v: newLook(), state: 'in', at: clock, x: -L.r * 2, done: [],
    fever: ail === 'febre' ? 1 : 0, dirt: ail === 'dodoi' ? 1 : 0, wound: ail === 'dodoi', bandage: false,
    drip: ail === 'gripe' ? 1 : 0, sticker: -1, tempAt: -9,
  });
}

const feet = () => [pat.x, L.feet[1]];
function spots() {
  const [x, y] = feet(), r = L.r, [hx, hy] = headCenter(x, y, r);
  return { head: [hx, hy], mouth: [hx, hy + r * .42], nose: [hx, hy + r * .22], chest: [x + r * .1, y - r * 1.4], knee: [x - r * .3, y - r * .42] };
}
const needNow = () => AILS[pat.ail].need.find(id => !pat.done.includes(id));
const isCured = () => AILS[pat.ail].need.every(id => pat.done.includes(id));

function updatePatient() {
  const e = clock - pat.at;
  if (pat.state === 'in') {
    const p = Math.min(e / WALK, 1);
    pat.x = -L.r * 2 + (L.feet[0] + L.r * 2) * (1 - (1 - p) ** 2);
    if (p >= 1) { pat.state = 'wait'; pat.at = clock; patientArrived(); }
  } else if (pat.state === 'out') {
    pat.x = L.feet[0] + (W + L.r * 2 - L.feet[0]) * Math.min(e / WALK, 1) ** 2;
    if (e > WALK) { pat.state = 'away'; patientGone(); }
  } else if (pat.state !== 'away') pat.x = L.feet[0];
  // resfriado espirra de vez em quando
  if (pat.state === 'wait' && pat.drip > .5 && !act && clock - pat.sneezeAt > 6 && clock - pat.at > 3) sneeze();
}

function sneeze() {
  pat.sneezeAt = clock;
  say('atchim', 'Atchim!');
  setTimeout(() => {
    sfx.blow(); sfx.boing();
    const [nx, ny] = spots().nose;
    for (let i = 0; i < 10; i++) addParticle({ x: nx, y: ny, vx: rand(-80, 80), vy: rand(-20, 60), life: .6, decay: 1.8, size: rand(2, 4), color: '#bfe6ff', star: false, rot: 0, vr: 0 });
  }, 450);
}

// ---------- ferramentas em ação ----------
function toolTarget(id) {
  const s = spots(), r = L.r;
  if (id === 'termometro') return [s.mouth[0] + r * .45, s.mouth[1] - r * .05, -1.2];
  if (id === 'estetoscopio') return [s.chest[0] - r * .1, s.chest[1] - r * .15, 0];
  if (id === 'remedio') return [s.mouth[0] + r * .55, s.mouth[1] + r * .1, 0];
  if (id === 'algodao') return [s.knee[0] + Math.sin(clock * 12) * r * .15, s.knee[1], 0];
  if (id === 'curativo') return [s.knee[0], s.knee[1], .5];
  return [s.nose[0], s.nose[1] + r * .15, 0];   // lenço
}

function useTool(slot) {
  if (act || pat.state !== 'wait') return false;
  act = { id: slot.id, at: clock, from: [slot.x, slot.y] };
  sfx.whoosh();
  if (slot.id === 'termometro' || slot.id === 'remedio') pat.v.mouth = 'o';
  if (slot.id === 'estetoscopio') for (let i = 0; i < 4; i++) setTimeout(heartbeat, (FLY_IN + .3 + i * .5) * 1000);
  if (slot.id === 'termometro') setTimeout(() => { pat.tempAt = clock; }, FLY_IN * 1000);
  if (slot.id === 'algodao') for (let i = 0; i < 3; i++) setTimeout(() => sfx.brush(), (FLY_IN + i * .35) * 1000);
  return true;
}

function heartbeat() {
  if (act?.id !== 'estetoscopio') return;
  sfx.boing(); setTimeout(() => sfx.pop(), 160);
  const [cx, cy] = spots().chest;
  floaters.push({ e: '💓', x: cx + L.r * .4, y: cy - L.r * .3, at: clock });
}

function updateTool() {
  if (!act || clock - act.at < FLY_IN + TOOL_TIME[act.id]) return;
  const id = act.id; act = null;
  pat.v.mouth = isCured() ? 'smile' : 'sad';
  applyTool(id);
}

function applyTool(id) {
  const s = spots(), r = L.r;
  if (id === 'remedio') { pat.fever = 0; pat.drip = Math.max(0, pat.drip - .5); sfx.gulp(); burst(s.mouth[0], s.mouth[1], r * .3, 330, 8); }
  if (id === 'algodao') { pat.dirt = 0; for (let i = 0; i < 6; i++) sparkle(s.knee[0] + rand(-r * .3, r * .3), s.knee[1] + rand(-r * .2, r * .2)); }
  if (id === 'curativo' && pat.wound) { pat.bandage = true; sfx.pop(); ring(s.knee[0], s.knee[1], r * .5); }
  if (id === 'lenco') { pat.drip = 0; sfx.blow(); setTimeout(() => sfx.blow(), 200); }
  if (id === 'termometro') { sfx.bell(1976); setTimeout(() => sfx.bell(1976), 180); }
  const needed = AILS[pat.ail].need.includes(id) && !pat.done.includes(id);
  if (needed) pat.done.push(id);
  toolDone(id, needed);
}

function drawAct(t) {
  if (!act) return;
  const k = Math.min((clock - act.at) / FLY_IN, 1), e = 1 - (1 - k) ** 3, [tx, ty, rot] = toolTarget(act.id);
  const x = act.from[0] + (tx - act.from[0]) * e, y = act.from[1] + (ty - act.from[1]) * e - Math.sin(k * Math.PI) * L.r;
  const size = L.r * 1.3, extra = act.id === 'termometro' ? Math.min(Math.max((clock - pat.tempAt) / 1.6, 0), 1) * (pat.ail === 'febre' ? 1 : .45) : 0;
  const lenco = act.id === 'lenco' ? Math.sin((clock - act.at) * 14) * L.r * .04 : 0;
  drawTool(ctx, act.id, x + lenco, y, size, rot * e, extra);
  if (act.id === 'termometro' && extra > .95 && pat.ail === 'febre') emojiAt(ctx, '🔥', x - L.r * .1, y - L.r * 1, L.r * .5);
}

// ---------- desenho do paciente ----------
function drawPatient(t) {
  if (pat.state === 'away') return;
  const [x, y] = feet(), r = L.r, v = pat.v, walking = pat.state === 'in' || pat.state === 'out';
  const hop = walking ? Math.abs(Math.sin((clock - pat.at) * 9)) * r * .15 : pulseAt(pat.hopAt, .45) * r * .45;
  v.blink = (t % 3.3) < .12 ? .1 : 1;
  v.arms = pat.state === 'cured' ? 'up' : walking && pat.state === 'out' ? 'wave' : 'down';
  if (pat.state === 'wait' && !act) v.mouth = isCured() ? 'smile' : 'sad';
  const sneezing = pulseAt(pat.sneezeAt + .35, .3);
  ctx.fillStyle = 'rgb(0 0 0 / .1)'; ctx.beginPath(); ctx.ellipse(x, y, r * .8, r * .18, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y - hop); ctx.rotate(sneezing * .15);
  drawBicho(ctx, 0, 0, r, pat.b, v, t);
  drawAilment(t);
  ctx.restore();
}

// tudo relativo aos pés (0, 0) — já está transladado
function drawAilment(t) {
  const r = L.r, hy = -r * 2.45;
  if (pat.fever > 0) {
    ctx.globalAlpha = pat.fever * .5; ctx.fillStyle = '#ff3b3b';
    for (const d of [-1, 1]) { circle(ctx, d * r * .58, hy + r * .3, r * .2); ctx.fill(); }
    ctx.globalAlpha = pat.fever * .8; ctx.strokeStyle = '#ff6b4a'; ctx.lineWidth = r * .06; ctx.lineCap = 'round';
    for (const d of [-1, 0, 1]) {   // calorzinho subindo da cabeça
      const x0 = d * r * .13, y0 = hy - r * 1.12 - ((t * .8 + d * .3 + 1) % 1) * r * .2;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let k = 1; k <= 4; k++) ctx.lineTo(x0 + (k % 2 ? r * .05 : -r * .05), y0 - k * r * .08);
      ctx.stroke();
    }
    ctx.globalAlpha = pat.fever;
    const dy = ((t * .6) % 1) * r * .3;
    ctx.fillStyle = '#8fd6ff'; ctx.beginPath(); ctx.moveTo(r * .82, hy - r * .4 + dy);
    ctx.quadraticCurveTo(r * .95, hy - r * .15 + dy, r * .82, hy - r * .1 + dy); ctx.quadraticCurveTo(r * .69, hy - r * .15 + dy, r * .82, hy - r * .4 + dy); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (pat.drip > 0) {
    const len = r * (.12 + .08 * Math.sin(t * 2.5));
    ctx.globalAlpha = pat.drip; ctx.fillStyle = '#bfe6ff';
    ctx.beginPath(); ctx.ellipse(r * .05, hy + r * .32 + len / 2, r * .045, len / 2 + r * .03, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(255 110 110 / .35)'; ctx.beginPath(); ctx.ellipse(0, hy + r * .22, r * .16, r * .11, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const kx = -r * .3, ky = -r * .42;
  if (pat.wound && !pat.bandage) {
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(kx, ky, r * .2, r * .14, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d93a3a'; ctx.lineWidth = Math.max(1, r * .025);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(kx - r * .13, ky + i * r * .05 - r * .03); ctx.lineTo(kx + r * .13, ky + i * r * .05 + r * .03); ctx.stroke(); }
    if (pat.dirt > 0) {
      ctx.globalAlpha = pat.dirt; ctx.fillStyle = '#8a5a34';
      for (const [dx, dy, k] of [[-.17, -.1, .08], [.15, .08, .07], [.02, .15, .06], [.2, -.12, .05], [-.2, .1, .05]]) { circle(ctx, kx + dx * r, ky + dy * r, k * r); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  if (pat.bandage) drawTool(ctx, 'curativo', kx, ky, r * .7, .5);
  if (pat.sticker >= 0) {
    const k = Math.min((clock - pat.sticker) / .6, 1), e = 1 - (1 - k) ** 3;
    const [sx, sy] = [L.sticker[0] - feet()[0], L.sticker[1] - L.feet[1]], tx = r * .2, ty = -r * 1.45;
    drawSticker(ctx, sx + (tx - sx) * e, sy + (ty - sy) * e - Math.sin(k * Math.PI) * r, r * (.9 - .4 * e), (1 - e) * 3);
  }
  // lágrima quando está dodói e ainda não sarou
  if (pat.state === 'wait' && !isCured() && pat.ail === 'dodoi' && !act) {
    const dy = ((t * .5) % 1) * r * .35;
    ctx.globalAlpha = 1 - dy / (r * .35); ctx.fillStyle = '#8fd6ff'; circle(ctx, -r * .38, hy + r * .1 + dy, r * .05); ctx.fill(); ctx.globalAlpha = 1;
  }
}

function hitPatient(x, y) {
  if (pat.state === 'away') return false;
  const [fx, fy] = feet();
  return Math.abs(x - fx) < L.r * 1.1 && y < fy && y > fy - L.r * 3.5;
}

// ---------- balão com o que ele tem ----------
function drawComplaint(t) {
  if (pat.state !== 'wait' || isCured()) return;
  const [bx, by] = L.bubble, r = L.r * .75, [hx, hy] = spots().head;
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgb(40 90 120 / .2)'; ctx.shadowBlur = 10;
  circle(ctx, bx, by, r); ctx.fill();
  circle(ctx, (bx + hx) / 2 + L.r * .2, (by + r + hy - L.r) / 2, r * .15); ctx.fill();
  ctx.shadowBlur = 0;
  emojiAt(ctx, AILS[pat.ail].e, bx, by, r * 1.35 * (1 + Math.sin(t * 3) * .04));
}

// corações e afins subindo
let floaters = [];
function drawFloaters() {
  for (const f of floaters) {
    const k = (clock - f.at) / 1;
    ctx.globalAlpha = Math.max(0, 1 - k);
    emojiAt(ctx, f.e, f.x, f.y - k * L.r * .8, L.r * (.45 + k * .2));
  }
  ctx.globalAlpha = 1;
  floaters = floaters.filter(f => clock - f.at < 1);
}
