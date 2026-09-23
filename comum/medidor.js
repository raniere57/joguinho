'use strict';
// medidor de estrelas no topo: cada acerto manda uma estrela voando até ele;
// cheio, chama meter.onFull (a festa) e esvazia um pouco depois

const FLY_TIME = .7;
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];   // cada estrela toca a próxima nota da escala
const meter = { size: 10, lit: 0, flyers: [], born: [], fullAt: 0, y: 40, onFull() {} };

function meterSlot(i) {
  // cabe entre a casinha (esq.) e o sol (dir.)
  const gap = Math.min(meter.size <= 5 ? 38 : 26, (W - 176) / (meter.size + .5));
  return { x: W / 2 - 4 + (i - (meter.size - 1) / 2) * gap, y: meter.y, gap };
}

function measureMeter() {
  const r = document.getElementById('home').getBoundingClientRect();
  meter.y = r.top + r.height / 2;
}

function launchStar(x, y) { meter.flyers.push({ x0: x, y0: y, x, y, t: 0, dir: x < W / 2 ? 1 : -1 }); }

function emptyMeter() {
  for (let i = 0; i < meter.size; i++) { const p = meterSlot(i); burst(p.x, p.y, R * .25, 45, 5); }
  meter.lit = 0;
}

function updateMeter(dt) {
  meter.flyers.forEach((f, i) => {
    f.t += dt;
    const p = Math.min(f.t / FLY_TIME, 1), e = p * p * (3 - 2 * p);
    const to = meterSlot((meter.lit + i) % meter.size);
    f.x = f.x0 + (to.x - f.x0) * e + Math.sin(p * Math.PI) * R * .8 * f.dir;
    f.y = f.y0 + (to.y - f.y0) * e;
    if (Math.random() < .6) sparkle(f.x, f.y);
  });
  // cheio fica brilhando um pouco antes de esvaziar; nunca passa do tamanho (dois dedos ao mesmo tempo)
  if (meter.lit >= meter.size && clock - meter.fullAt > 1.6) emptyMeter();
  while (meter.flyers.length && meter.flyers[0].t >= FLY_TIME) {
    meter.flyers.shift();
    if (meter.lit >= meter.size) emptyMeter();
    sfx.bell(523.25 * 2 ** (MAJOR[meter.lit] / 12));
    meter.born[meter.lit] = clock;
    meter.lit++;
    if (meter.lit === meter.size) { meter.fullAt = clock; meter.onFull(); }
  }
}

function drawMeter() {
  const first = meterSlot(0), w = first.gap * meter.size + 12, h = Math.max(36, first.gap * 1.5);
  ctx.fillStyle = 'rgb(255 255 255 / .28)';
  ctx.strokeStyle = 'rgb(255 255 255 / .7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect?.(first.x - first.gap / 2 - 6, meter.y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < meter.size; i++) {
    const { x, y, gap } = meterSlot(i);
    if (i < meter.lit) {
      const wave = meter.lit >= meter.size ? 1 + .25 * Math.sin(clock * 12 - i * .7) : 1;
      const k = easeOutBack(Math.min((clock - meter.born[i]) / .3, 1)), r = Math.min(gap * .5, 15) * k * wave;
      ctx.fillStyle = '#e08c00'; star(ctx, x, y + 1.5, r, -Math.PI / 2);
      ctx.fillStyle = '#ffd23f'; star(ctx, x, y, r, -Math.PI / 2);
    } else {
      ctx.fillStyle = 'rgb(255 255 255 / .75)'; circle(ctx, x, y, Math.min(gap * .16, 5)); ctx.fill();
    }
  }
  for (const f of meter.flyers) {
    ctx.fillStyle = '#ffd23f'; star(ctx, f.x, f.y, 13, f.t * 8);
  }
}
