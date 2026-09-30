'use strict';
// a lojinha (parede, arara de roupas, espelho, tapete redondo) com as abas e as casinhas das peças,
// e a passarela do desfile (cortinas, holofotes e a plateia de bichinhos).

const CROWD = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊', '🐸', '🐨', '🐯', '🐷'];
let L = {}, shopLayer = null, stageLayer = null;

function layoutShop() {
  const port = H > W;
  L = port ? {
    port, r: Math.min(W * .19, H * .085), feet: [W * .47, H * .6], floor: H * .5,
    tabs: { x: W * .05, y: H * .625, w: W * .9, h: H * .075 }, grid: { x: W * .04, y: H * .71, w: W * .92, h: H * .27, cols: 3 },
    go: [W * .85, H * .42], goR: Math.min(W * .09, H * .045),
  } : {
    port, r: H * .16, feet: [W * .25, H * .93], floor: H * .78,
    tabs: { x: W * .5, y: H * .18, w: W * .46, h: H * .15 }, grid: { x: W * .5, y: H * .36, w: W * .46, h: H * .61, cols: 3 },
    go: [W * .42, H * .42], goR: H * .085,
  };
  shopLayer = buildShop();
  stageLayer = buildStage();
}

function tabSlots() {
  const { x, y, w, h } = L.tabs, cw = w / CATS.length;
  return CATS.map((c, i) => ({ cat: c, x: x + cw * (i + .5), y: y + h / 2, w: cw * .88, h }));
}

function itemSlots(n = 6) {
  const { x, y, w, h, cols } = L.grid, rows = Math.ceil(n / cols), cw = w / cols, ch = h / rows;
  return Array.from({ length: n }, (_, i) => ({ i, x: x + cw * (i % cols + .5), y: y + ch * (Math.floor(i / cols) + .5), w: cw * .9, h: ch * .88, s: Math.min(cw, ch) * .8 }));
}

function buildShop() {
  const [c, g] = layer(W, H), r = L.r, [fx, fy] = L.feet;
  g.fillStyle = '#fff0e6'; g.fillRect(0, 0, W, L.floor);
  g.fillStyle = '#ffe1d1';   // papel de parede de losangos
  for (let y = 0, j = 0; y < L.floor; y += 40, j++) for (let x = (j % 2) * 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 6, y); g.lineTo(x, y + 8); g.lineTo(x - 6, y); g.fill(); }
  // bandeirinhas
  const cols = ['#ff7eb6', '#ffd23b', '#4fb4ff', '#5fd068', '#a77bff'], top = H * (L.port ? .085 : .06);
  g.strokeStyle = '#d9b3c9'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, top); g.quadraticCurveTo(W / 2, top + H * .05, W, top); g.stroke();
  for (let i = 0; i < 14; i++) {
    const u = (i + .5) / 14, x = u * W, y = top + 2 * u * (1 - u) * H * .05;
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x, y + 20); g.fill();
  }
  // espelho grande em arco atrás da amiga
  const mw = r * 3.2, mh = r * 4.6, mx = fx - mw / 2, my = fy - r * 4.3;
  g.fillStyle = '#ffd36b'; g.beginPath(); g.roundRect(mx - 8, my - 8, mw + 16, mh + 8, [mw / 2 + 8, mw / 2 + 8, 8, 8]); g.fill();
  const gl = g.createLinearGradient(mx, my, mx + mw, my + mh); gl.addColorStop(0, '#f4fbff'); gl.addColorStop(1, '#cfe9fa');
  g.fillStyle = gl; g.beginPath(); g.roundRect(mx, my, mw, mh, [mw / 2, mw / 2, 4, 4]); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .7)'; g.beginPath(); g.moveTo(mx + mw * .18, my + mh * .2); g.lineTo(mx + mw * .35, my + mh * .12); g.lineTo(mx + mw * .18, my + mh * .45); g.fill();
  // arara com roupinhas penduradas (do lado que sobra)
  const side = L.port ? [[W * .04, W * .28]] : [[W * .02, W * .12]];
  for (const [ax, bx] of side) {
    const ay = L.port ? H * .2 : H * .2;
    g.strokeStyle = '#b9a6c9'; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, ay); g.stroke();
    g.beginPath(); g.moveTo(ax + 4, ay); g.lineTo(ax + 4, L.floor); g.moveTo(bx - 4, ay); g.lineTo(bx - 4, L.floor); g.stroke();
    const n = Math.max(2, Math.floor((bx - ax) / 26));
    for (let i = 0; i < n; i++) {
      const x = ax + (bx - ax) * (i + .5) / n, w = (bx - ax) / n * .8;
      g.fillStyle = cols[(i + 2) % cols.length];
      g.beginPath(); g.moveTo(x - w * .3, ay + 10); g.lineTo(x + w * .3, ay + 10); g.lineTo(x + w * .5, ay + 10 + w * 1.6); g.lineTo(x - w * .5, ay + 10 + w * 1.6); g.fill();
      g.strokeStyle = '#b9a6c9'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w * .25, ay + 10); g.lineTo(x, ay + 2); g.lineTo(x + w * .25, ay + 10); g.stroke();
    }
  }
  // chão de tacos e tapete redondo
  g.fillStyle = '#e8c9a8'; g.fillRect(0, L.floor, W, H - L.floor);
  g.strokeStyle = 'rgb(160 110 70 / .2)'; g.lineWidth = 2;
  for (let y = L.floor + 16; y < H; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#ffb3d4'; g.beginPath(); g.ellipse(fx, fy, r * 1.6, r * .38, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffd1e3'; g.beginPath(); g.ellipse(fx, fy, r * 1.3, r * .28, 0, 0, TAU); g.fill();
  // bandeja
  const gr = L.grid;
  const tr = { x: Math.min(L.tabs.x, gr.x) - 4, y: L.tabs.y - 6, w: Math.max(L.tabs.w, gr.w) + 8, h: gr.y + gr.h - L.tabs.y + 10 };
  g.fillStyle = 'rgb(120 60 120 / .12)'; g.beginPath(); g.roundRect(tr.x + 3, tr.y + 5, tr.w, tr.h, 24); g.fill();
  g.fillStyle = 'rgb(255 255 255 / .92)'; g.beginPath(); g.roundRect(tr.x, tr.y, tr.w, tr.h, 24); g.fill();
  return c;
}

// ---------- passarela ----------
function runway() {
  return L.port ? { backY: H * .36, frontY: H * .86, backW: W * .22, frontW: W * .9, cx: W / 2 }
    : { backY: H * .4, frontY: H * .9, backW: W * .16, frontW: W * .6, cx: W / 2 };
}

function buildStage() {
  const [c, g] = layer(W, H), rw = runway();
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1850'); bg.addColorStop(1, '#4a2477');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgb(255 255 255 / .6)';
  for (let i = 0; i < 60; i++) { circle(g, (i * 97.3) % W, (i * 53.7) % (H * .45), 1 + (i % 3) * .6); g.fill(); }
  // letreiro
  const s = Math.min(W, H) * .06;
  const sy = Math.max(H * .13, 66);
  g.fillStyle = '#ff4f9a'; g.beginPath(); g.roundRect(W / 2 - s * 3.4, sy, s * 6.8, s * 1.5, s * .5); g.fill();
  g.fillStyle = '#fff'; g.font = `800 ${Math.round(s * .85)}px ui-rounded, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('DESFILE', W / 2, sy + s * .78);
  // passarela
  g.fillStyle = '#ff9ec8';
  g.beginPath(); g.moveTo(rw.cx - rw.backW / 2, rw.backY); g.lineTo(rw.cx + rw.backW / 2, rw.backY); g.lineTo(rw.cx + rw.frontW / 2, rw.frontY); g.lineTo(rw.cx - rw.frontW / 2, rw.frontY); g.fill();
  g.fillStyle = '#ffc6de';
  g.beginPath(); g.moveTo(rw.cx - rw.backW * .3, rw.backY); g.lineTo(rw.cx + rw.backW * .3, rw.backY); g.lineTo(rw.cx + rw.frontW * .3, rw.frontY); g.lineTo(rw.cx - rw.frontW * .3, rw.frontY); g.fill();
  g.fillStyle = '#fff7c2';
  for (let i = 0; i <= 8; i++) {
    const k = i / 8, y = rw.backY + (rw.frontY - rw.backY) * k, w = rw.backW + (rw.frontW - rw.backW) * k;
    for (const d of [-1, 1]) { circle(g, rw.cx + d * w / 2, y, 2 + k * 4); g.fill(); }
  }
  // cortinas (a da direita é a da esquerda espelhada)
  for (const d of [-1, 1]) {
    const w = W * .16;
    g.save(); if (d > 0) { g.translate(W, 0); g.scale(-1, 1); }
    g.fillStyle = '#c4213f'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.quadraticCurveTo(w * .5, H * .45, w * .3, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = 'rgb(0 0 0 / .15)'; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(w * k / 4, 0); g.quadraticCurveTo(w * k / 8, H * .45, w * k / 4 * .3, H); g.stroke(); }
    g.fillStyle = '#ffd23b'; g.beginPath(); g.ellipse(w * .45, H * .5, w * .12, H * .015, 0, 0, TAU); g.fill();
    g.restore();
  }
  g.fillStyle = '#c4213f';
  for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(W * (i + .5) / 10, 0, W / 20, 0, Math.PI); g.fill(); }
  g.fillStyle = '#ffd23b'; g.fillRect(0, 0, W, 5);
  return c;
}

function drawSpots(t) {
  const rw = runway();
  for (const d of [-1, 1]) {
    const sx = W / 2 + d * W * .4, tx = rw.cx + Math.sin(t * .9 + d) * rw.frontW * .2;
    const grd = ctx.createLinearGradient(sx, 0, tx, rw.frontY);
    grd.addColorStop(0, 'rgb(255 250 210 / .35)'); grd.addColorStop(1, 'rgb(255 250 210 / 0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(sx - 10, 0); ctx.lineTo(sx + 10, 0); ctx.lineTo(tx + rw.frontW * .18, rw.frontY); ctx.lineTo(tx - rw.frontW * .18, rw.frontY); ctx.fill();
  }
}

function drawCrowd(t, clapAt) {
  const n = L.port ? 5 : 8, s = Math.min(W / n, H * .16), y = H - s * .35;
  for (let i = 0; i < n; i++) {
    const x = W * (i + .5) / n, jump = Math.abs(Math.sin(t * 6 + i * 1.3)) * s * .12 * (clock - clapAt < 1.5 ? 2 : 1);
    ctx.fillStyle = 'rgb(20 10 40 / .5)'; ctx.beginPath(); ctx.ellipse(x, H, s * .5, s * .35, 0, Math.PI, TAU); ctx.fill();
    emojiAt(ctx, CROWD[i % CROWD.length], x, y - jump, s * .9);
    if (clock - clapAt < 1.5 && Math.sin(t * 16 + i) > 0) emojiAt(ctx, '👏', x + s * .35, y - s * .45 - jump, s * .35);
  }
}
