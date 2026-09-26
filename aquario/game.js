'use strict';
// Aquário: fundo do mar com peixinhos e bichos que respondem ao toque. Tocar na água dá comidinha,
// arrastar o anzol pesca (e solta de volta). A tia pede missões: achar um bicho, pescar um
// peixinho de certa cor ou alimentar os peixes. Cinco estrelas chamam a baleia pra festa.

const COLORS = FISH.map(d => d.id);
const NAMES = { polvo: 'o polvo', tartaruga: 'a tartaruga', caranguejo: 'o caranguejo', estrela: 'a estrela-do-mar',
  'agua-viva': 'a água-viva', cavalo: 'o cavalo-marinho', bau: 'o baú do tesouro' };
const SHOUT = { polvo: 'O polvo!', tartaruga: 'A tartaruga!', caranguejo: 'O caranguejo!', estrela: 'A estrela-do-mar!',
  'agua-viva': 'A água-viva!', cavalo: 'O cavalo-marinho!', bau: 'Uau! Um tesouro!', baleia: 'A baleia!' };
const MISSION_REPEAT = 14, MISSION_HINT = 7, FOOD_GOAL = 5, NAME_GAP = 2.5;

loadVoices(['vamos', 'fome', 'nham', 'achou', 'isso', 'arrasta', 'parabens',
  ...Object.keys(NAMES).map(id => 'onde-' + id), ...Object.keys(SHOUT),
  ...COLORS.flatMap(c => ['pesca-' + c, 'pegou-' + c, 'peixe-' + c])]);

let frameDt = 0, hookGrabbed = false, grab = [0, 0], lastNameAt = -99;
let mission = null, nextMissionAt = 0, lastMission = null;

// o baú entra nas missões como se fosse um bicho
const chestThing = {
  id: 'bau',
  center() { return [chest.x, chest.y - chest.w * .4]; },
  hit: hitChest,
  tap: openChest,
};
const FINDABLE = [...CRITTERS.filter(c => c !== whale), chestThing];

meter.size = 5;
meter.onFull = () => {
  sfx.fanfare(); navigator.vibrate?.([30, 60, 30]); confettiRain();
  whale.come();
  fishes.forEach(f => { f.spinAt = clock + rand(0, .5); });
  say('parabens', 'Olha a baleia! Ela veio pra festa! Parabéns!', true);
};

// ---------- missões ----------
function newMission() {
  const r = Math.random();
  let type = r < .42 ? 'pesca' : r < .84 ? 'onde' : 'fome';
  if (type === 'fome' && lastMission === 'fome') type = 'onde';
  const pool = type === 'pesca' ? COLORS : type === 'onde' ? FINDABLE.map(c => c.id) : ['fome'];
  const id = pick(pool.filter(i => i !== lastMission));
  mission = { type, id, at: clock, saidAt: clock, eaten: 0, hinted: false };
  lastMission = id;
  sayMission();
}

function sayMission() {
  mission.saidAt = clock;
  const { type, id } = mission;
  if (type === 'onde') say('onde-' + id, `Onde está ${NAMES[id]}?`);
  else if (type === 'pesca') say('pesca-' + id, `Vamos pescar o peixinho ${id}!`);
  else say('fome', 'Os peixinhos estão com fome! Toca na água pra dar comidinha!');
}

function updateMission() {
  if (!started) return;
  if (!mission) { if (clock > nextMissionAt && !hookBusy() && !whale.active()) newMission(); return; }
  if (mission.id === 'tartaruga') turtle.start();   // a tartaruga aparece quando é procurada
  if (hookBusy()) { mission.saidAt = Math.max(mission.saidAt, clock - MISSION_REPEAT + 3); return; }
  if (clock - mission.saidAt > MISSION_REPEAT) sayMission();
  if (!mission.hinted && clock - mission.at > MISSION_HINT) {
    mission.hinted = true;
    if (mission.type === 'pesca') say('arrasta', 'Arrasta o anzol até o peixinho!');
  }
}

function completeMission(x, y) {
  launchStar(x, y);
  mission = null;
  nextMissionAt = clock + rand(7, 11);
}

function fishCaught(f) {
  sfx.chime(); burst(hook.x, hook.y + f.s * .4, S * .5, 50, 14);
  say('pegou-' + f.d.id, `Pegou o peixinho ${f.d.id}!`);
  if (mission?.type === 'pesca' && mission.id === f.d.id) {
    say('isso', 'Isso! Muito bem!', true);
    completeMission(hook.x, hook.y);
  }
}

function fishAte(f) {
  if (mission?.type !== 'fome' || ++mission.eaten < FOOD_GOAL) return;
  say('nham', 'Nham nham! Eles adoraram!');
  fishes.forEach(o => { o.spinAt = clock + rand(0, .4); });
  completeMission(f.x, f.y);
}

function shout(line, text) {
  if (clock - lastNameAt < NAME_GAP) return;
  lastNameAt = clock;
  say(line, text);
}

// ---------- toques ----------
function onTap(x, y) {
  if (hitHook(x, y)) {
    hookGrabbed = true; hook.touchedAt = clock; grab = [hook.x - x, hook.y - y];
    sfx.blub(.1);
    return;
  }
  if (hitBoat(x, y)) { boat.rockAt = clock; sfx.giggle(); burst(boat.x, surfaceY - S * .6, S * .4, 30, 8); return; }
  const f = tapFish(x, y);
  if (f) { shout('peixe-' + f.d.id, `O peixinho ${f.d.id}!`); return; }
  const c = [...CRITTERS, chestThing].find(c => c.hit(x, y));
  if (c) { tapCritter(c); return; }
  if (tapWeed(x, y) || tapBubble(x, y)) return;
  if (y > surfaceY + S * .2 && y < floorY) { dropFood(x, y); return; }
  if (y >= floorY) { sfx.brush(); burst(x, y, S * .3, 40, 8); return; }
  sfx.bell(); ring(x, y, S * .3); burst(x, y, S * .3, 200, 6);
}

function tapCritter(c) {
  c.tap();
  if (mission?.type === 'onde' && mission.id === c.id) {
    lastNameAt = clock;
    say(c.id, SHOUT[c.id]);
    say('achou', 'Achou! Muito bem!', true);
    const [cx, cy] = c.center();
    completeMission(cx, cy);
    return;
  }
  shout(c.id, SHOUT[c.id]);
}

function onMove(x, y) {
  if (!hookGrabbed || hook.state !== 'water') return;
  placeHookIn(x + grab[0], y + grab[1]);
  hook.touchedAt = clock;
}

function onUp() { if (hookGrabbed) hook.touchedAt = clock; hookGrabbed = false; }
function onCancel() { hookGrabbed = false; }

// ---------- dica: brilho no alvo e mãozinha ----------
function missionTarget() {
  if (!mission) return null;
  if (mission.type === 'onde') {
    const c = FINDABLE.find(c => c.id === mission.id);
    return c.id === 'tartaruga' && !turtle.active ? null : c.center();
  }
  if (mission.type === 'pesca') { const f = fishes.find(f => f.d.id === mission.id); return f.mode === 'swim' ? [f.x, f.y] : null; }
  const b = waterBox();
  return [W / 2, (b.y0 + b.y1) / 2];
}

function drawHint(t) {
  if (!mission || clock - mission.at < MISSION_HINT || hookBusy()) return;
  const tg = missionTarget();
  if (!tg) return;
  const [x, y] = tg, k = (t * 1.2) % 1;
  ctx.strokeStyle = `rgb(255 245 160 / ${1 - k})`; ctx.lineWidth = 4;
  circle(ctx, x, y, S * (.6 + k * .5)); ctx.stroke();
  const size = Math.round(S * .8 / 4) * 4;
  const bob = Math.abs(Math.sin(t * 4)) * S * .2;
  if (mission.type === 'pesca') {   // mãozinha levando o anzol até o peixe
    const p = (t * .5) % 1, e = Math.min(p / .7, 1);
    ctx.drawImage(emojiSprite('👆', size), hook.x + (x - hook.x) * e - size * .45, hook.y + (y - hook.y) * e + S * .2, size, size);
  } else if (y > H * .6) ctx.drawImage(emojiSprite('👇', size), x - size * .55, y - S * .45 - size - bob, size, size);   // alvo lá embaixo: mão por cima
  else ctx.drawImage(emojiSprite('👆', size), x - size * .45, y + S * .25 + bob, size, size);
}

// ---------- loop ----------
function resize() {
  fitCanvas();
  measureMeter();
  layoutSea();
  if (!fishes.length) { makeFishes(); placeHookIn(W * .55, hookRestY()); boat.x = boatGoal(); }
  else fitFishes();
  if (crab.x) crab.x = Math.min(Math.max(crab.x, W * .32), W * .7);
  if (jelly.x) jelly.x = Math.min(Math.max(jelly.x, W * .6), W * .88);
}

function update(dt) {
  frameDt = dt;
  updateBubbles(dt);
  updateFood(dt);
  updateFishes(dt);
  updateHook(dt);
  crab.update(dt); jelly.update(dt); turtle.update(dt);
  updateMission();
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(seaBg, 0, 0, W, H);
  drawRays(t);
  whale.draw(t);
  drawWeeds(t);
  drawChest(t);
  octo.draw(t); starfish.draw(t); crab.draw(t);
  seahorse.draw(t); jelly.draw(t); turtle.draw(t);
  drawFood();
  drawLine();
  drawHook(t);
  const inAir = f => f.mode === 'hook' || f.y < surfaceY;
  for (const f of fishes) if (!inAir(f)) drawOneFish(f, t);
  drawBubbles();
  drawSurface(t);
  drawBoat();
  for (const f of fishes) if (inAir(f)) drawOneFish(f, t);
  drawHint(t);
  drawRings();
  if (started) drawMeter();
  drawParticles();
  drawConfetti();
}

// barulhinho de bolha de vez em quando, no lugar dos passarinhos
function bubbleAmbient() {
  setTimeout(() => {
    if (!document.hidden) {
      sfx.blub(.05);
      const w = pick(weeds);
      for (let i = 0; i < 3; i++) addBubble(w.x + rand(-8, 8), floorY - w.h * rand(.3, .8));
    }
    bubbleAmbient();
  }, rand(2500, 6000));
}

boot({
  resize, update, render, onTap, onMove, onUp, onCancel,
  onAmbient: bubbleAmbient,
  onStart: () => {
    say('vamos', 'Vamos mergulhar no fundo do mar!');
    nextMissionAt = clock + 5;
  },
});
