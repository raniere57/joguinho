'use strict';
// Médico de bichinhos: chega um bichinho com febre, dodói no joelho ou resfriado.
// Toca na ferramenta da bandeja e ela vai até o paciente (qualquer uma funciona, com sua graça);
// as que ele precisa curam. Curado, ganha um adesivo de estrela e vai embora feliz.

const HINT_AFTER = 6, REPEAT_AFTER = 14, AILMENTS = ['febre', 'dodoi', 'gripe'];

const cap = s => s[0].toUpperCase() + s.slice(1);
const VOZ = {
  vamos: 'Bem-vinda ao consultório!',
  ...Object.fromEntries(BICHOS.map(b => ['chega-' + b.id, cap(b.name) + ' está dodói. Vamos cuidar?'])),
  'a-febre': 'Parece febre! Vamos medir com o termômetro.',
  'a-dodoi': 'Machucou o joelho! Vamos limpar com o algodão.',
  'a-gripe': 'Está resfriado! Vamos escutar o coração.',
  'p-termometro': 'Pega o termômetro!', 'p-remedio': 'Agora o remedinho!',
  'p-algodao': 'Limpa com o algodão!', 'p-curativo': 'Agora o curativo!',
  'p-estetoscopio': 'Escuta o coração!', 'p-lenco': 'Agora o lencinho!',
  'r-febre': 'Está quentinho! É febre.', 'r-normal': 'Temperatura boa!',
  'r-coracao': 'Tum, tum! Que coração forte!', 'r-limpo': 'Limpinho!',
  'r-curativo': 'Que curativo bonito!', 'r-lenco': 'Assoa o nariz! Fuuun!',
  curado: 'Sarou! Ganhou um adesivo!', parabens: 'Você é uma ótima doutora!',
};
const VOZ_B = { 'r-remedio': 'Hum, que gostoso!', obrigado: 'Obrigado, doutora!', atchim: 'Atchim!', ai: 'Ai, ai!', oba: 'Oba!' };
loadVoices([...Object.keys(VOZ), ...Object.keys(VOZ_B)]);

let lastAct = 0, lastSaid = 0, visits = Math.floor(Math.random() * 12), lastOba = -99;

meter.size = 5;
meter.onFull = () => { sfx.fanfare(); confettiRain(90); talk('parabens', true); };

const talk = (line, queued = false) => { lastSaid = clock; say(line, VOZ[line] || VOZ_B[line], queued); };

function nextPatient() {
  visits++;
  newPatient(BICHOS[visits % BICHOS.length], AILMENTS[visits % AILMENTS.length]);
}

function patientArrived() {
  lastAct = clock;
  talk('chega-' + pat.b.id);
  if (pat.ail === 'dodoi') talk('ai', true);
  talk('a-' + pat.ail, true);
}

function patientGone() { setTimeout(nextPatient, 500); }

function toolDone(id, needed) {
  lastAct = clock;
  if (id === 'termometro') talk(pat.ail === 'febre' ? 'r-febre' : 'r-normal');
  if (id === 'estetoscopio') talk('r-coracao');
  if (id === 'remedio') talk('r-remedio');
  if (id === 'algodao' && pat.wound && !pat.bandage) talk('r-limpo');
  if (id === 'curativo' && pat.bandage) talk('r-curativo');
  if (needed) { const [x, y] = spots().chest; ring(x, y, L.r); sfx.chime(); }
  if (isCured()) setTimeout(cure, 900);
  else talk('p-' + needNow(), true);
}

function cure() {
  if (pat.state !== 'wait') return;
  pat.state = 'cured'; pat.sticker = clock; pat.v.mouth = 'smile'; pat.hopAt = clock + .6;
  sfx.whoosh();
  setTimeout(() => {
    const [x, y] = spots().chest;
    sfx.chime(); burst(x, y, L.r * .4, 45, 16); launchStar(x, y);
  }, 600);
  talk('curado'); talk('obrigado', true);
  setTimeout(() => { pat.state = 'out'; pat.at = clock; sfx.whoosh(); }, 4200);
}

// ---------- toques ----------
function slotAt(x, y) {
  return toolSlots().find(s => Math.abs(x - s.x) < s.size * .62 && Math.abs(y - s.y) < s.size * .62);
}

function onTap(x, y) {
  const s = slotAt(x, y);
  if (s && useTool(s)) {
    lastAct = clock;
    if (s.id === 'lenco') talk('r-lenco');
    return;
  }
  if (hitPatient(x, y)) {
    pat.hopAt = clock; sfx.giggle((x / W - .5) * 1.4); lastAct = clock;
    if (clock - lastOba < 3) return;
    lastOba = clock;
    if (pat.state === 'cured' || pat.state === 'out') talk('oba');
    else if (pat.state === 'wait' && !act) {
      if (pat.ail === 'gripe' && pat.drip > .5) sneeze();
      else if (pat.ail === 'dodoi' && !pat.bandage) talk('ai');
    }
    return;
  }
  sfx.pop(); ring(x, y, L.r * .3);
}

// ---------- dica ----------
function hintSlot() {
  if (!started || pat.state !== 'wait' || act || clock - lastAct < HINT_AFTER) return null;
  return toolSlots().find(s => s.id === needNow());
}

function remind() {
  if (pat.state !== 'wait' || act || clock - Math.max(lastAct, lastSaid) < REPEAT_AFTER) return;
  talk('p-' + needNow());
}

function drawTray(t) {
  const hint = hintSlot();
  for (const s of toolSlots()) {
    if (act?.id === s.id) {
      ctx.globalAlpha = .18; drawTool(ctx, s.id, s.x, s.y, s.size); ctx.globalAlpha = 1;
      continue;
    }
    const k = s === hint ? 1 + .12 * Math.sin(t * 8) : 1;
    drawTool(ctx, s.id, s.x, s.y, s.size * k, Math.sin(t * 1.3 + s.x) * .04);
  }
  if (hint) {
    const z = Math.max(hint.size * .7, 40);
    emojiAt(ctx, '👆', hint.x + z * .1, hint.y + z * .55 + Math.abs(Math.sin(t * 4)) * z * .25, z);
  }
}

// ---------- ciclo ----------
function update(dt) {
  if (started) { updatePatient(); updateTool(); remind(); }
  updateMeter(dt);
}

function render(t) {
  ctx.drawImage(roomLayer, 0, 0, W, H);
  drawPatient(t);
  drawComplaint(t);
  drawTray(t);
  drawAct(t);
  drawFloaters();
  drawRings();
  drawParticles();
  if (started) drawMeter();
  drawConfetti();
}

function resize() {
  fitCanvas();
  measureMeter();
  layoutClinic();
}

boot({
  resize, update, render, onTap,
  onAmbient: () => {},   // dentro do consultório: sem passarinho
  onStart() { talk('vamos'); nextPatient(); },
});
