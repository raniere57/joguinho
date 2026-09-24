'use strict';
// casca comum dos jogos: botão jogar, casinha (volta pro menu), loop, toques e tela acordada

let started = false, lastTap = 0, game = null, last = performance.now();

function frame(now) {
  const dt = Math.max(0, Math.min((now - last) / 1000, .05));   // rAF pode vir com horário anterior ao do script
  last = now;
  clock = now / 1000;
  game.update(dt, clock);
  updateEffects(dt, clock);
  game.render(clock);
  requestAnimationFrame(frame);
}

let wakeLock = null;
const keepAwake = () => navigator.wakeLock?.request('screen').then(l => { wakeLock = l; }).catch(() => {});

// game = { resize, update, render, onTap(x, y), onStart(), onBird?, onMove?(x, y), onUp?(x, y), onCancel?() }
function boot(g) {
  game = g;

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!started) return;
    sfx.resume();
    lastTap = clock;
    game.onTap(e.clientX, e.clientY);
  });
  // arrastar o dedo (esfregar, desenhar): só enquanto está encostado na tela
  canvas.addEventListener('pointermove', e => {
    if (!started || !game.onMove || (e.pointerType === 'mouse' && !e.buttons)) return;
    game.onMove(e.clientX, e.clientY);
  });
  // iOS só destrava o áudio no fim do toque, não no começo
  canvas.addEventListener('pointerup', e => {
    sfx.resume();
    if (started) game.onUp?.(e.clientX, e.clientY);
  });
  // iOS cancela o toque quando o sistema rouba o gesto (ex.: puxar da borda)
  canvas.addEventListener('pointercancel', () => { if (started) game.onCancel?.(); });
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { game.resize(); measureMeter(); }, 120);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { sfx.suspend(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    else if (started) { sfx.resume(); keepAwake(); }
  });

  const startBtn = document.getElementById('start');
  startBtn.addEventListener('click', () => {
    if (started) return;
    started = true;
    startBtn.classList.add('gone');
    setTimeout(() => startBtn.remove(), 400);
    sfx.init();
    sfx.startAmbient();
    scheduleAmbient(game.onBird);
    sfx.pop();
    lastTap = clock;
    ring(W / 2, H / 2, Math.min(W, H) * .23);
    burst(W / 2, H / 2, Math.min(W, H) * .2, 330, 30);
    const root = document.documentElement;   // iPad aceita; iPhone só em tela cheia pela Tela de Início
    (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root)?.catch?.(() => {});
    keepAwake();
    game.onStart();
  });

  // casinha: um toque volta pro menu
  document.getElementById('home').addEventListener('click', () => { location.href = '../'; });

  game.resize();
  measureMeter();
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js').catch(() => {});
}
