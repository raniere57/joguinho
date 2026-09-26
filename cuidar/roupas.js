'use strict';
// guarda-roupa: macacão, enfeite de cabeça e sapatinho; a escolha fica salva no aparelho

const closet = document.querySelector('.closet');
const CLOSET_LABELS = {
  suit: ['Macacão rosa de coração', 'Macacão azul de estrela', 'Macacão verde de patinho', 'Macacão amarelo de flor', 'Macacão lilás de nuvem', 'Macacão de bolinhas'],
  head: { laco: 'Laço', chapeu: 'Chapéu de sol', coroa: 'Coroa', coelho: 'Orelhinhas de coelho', flor: 'Flor', bone: 'Boné' },
  shoes: ['Descalça', 'Sapatinho rosa', 'Sapatinho azul', 'Sapatinho amarelo', 'Sapatinho verde', 'Sapatinho lilás'],
};
let closetPicks = 0;

function closetIcon(kind, value) {
  const css = 46, [c, g] = layer(css, css);
  g.translate(css / 2, css / 2);
  if (kind === 'suit') {
    const s = css * .5, suit = SUITS[value], grad = g.createLinearGradient(0, -s * .8, 0, s * .8);
    grad.addColorStop(0, suit.c[0]); grad.addColorStop(1, suit.c[1]);
    g.fillStyle = grad; g.beginPath(); g.ellipse(0, 0, s * .82, s * .78, 0, 0, TAU); g.fill();
    drawMark(g, suit.mark, s);
  } else if (kind === 'head') {
    const s = css * .26;
    g.translate(0, s * .9);
    g.fillStyle = SKIN[0]; circle(g, 0, 0, s); g.fill();
    drawHeadItem(g, value, s);
  } else {
    const s = css * .62;
    g.translate(0, s * .05);
    drawFoot(g, s, SHOES[value]);
  }
  // imagem em vez do canvas: o Safari às vezes não pinta canvas dentro de painel com blur
  const img = new Image(css, css);
  img.src = c.toDataURL();
  img.alt = '';
  return img;
}

function buildCloset() {
  closet.replaceChildren();
  const rows = [['suit', SUITS.map((_, i) => i)], ['head', HEADS], ['shoes', SHOES.map((_, i) => i)]];
  for (const [kind, values] of rows) {
    const row = document.createElement('div');
    row.className = 'row';
    for (const value of values) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.kind = kind; b.dataset.value = value;
      b.setAttribute('aria-label', CLOSET_LABELS[kind][value]);
      b.append(closetIcon(kind, value));
      b.addEventListener('click', () => pickOutfit(kind, value));
      row.append(b);
    }
    closet.append(row);
  }
  const ok = document.createElement('button');
  ok.type = 'button'; ok.className = 'ok'; ok.textContent = '✓'; ok.setAttribute('aria-label', 'Pronto');
  ok.addEventListener('click', closeCloset);
  closet.append(ok);
  markCloset();
}

function markCloset() {
  for (const b of closet.querySelectorAll('.row button')) {
    const v = b.dataset.kind === 'head' ? b.dataset.value : Number(b.dataset.value);
    b.classList.toggle('on', outfit[b.dataset.kind] === v);
  }
}

function pickOutfit(kind, value) {
  if (mode !== 'roupa') return;
  sfx.resume(); lastTap = clock;
  outfit = { ...outfit, [kind]: value };
  saveOutfit(); markCloset();
  sfx.pop();
  const y = { suit: baby.y + baby.s * 1.3, head: baby.y - baby.s * .9, shoes: baby.y + baby.s * 2.1 }[kind];
  burst(baby.x, y, baby.s * .6, pick([330, 50, 200, 280]), 16);
  baby.laughAt = clock;
  closetPicks++;
  if (closetPicks === 1 || Math.random() < .45) say(pick(['linda', 'linda', 'b-eba', 'b-oba']), 'Que linda!');
}

function closeCloset() {
  if (mode !== 'roupa') return;
  sfx.resume(); sfx.fanfare();
  heartBurst(baby.x, baby.y, 10);
  say('lindissima', 'Ficou lindíssima!');
  done('roupa');
}

// onde a bebê fica com o guarda-roupa aberto: acima dele (em pé) ou ao lado (deitado)
function closetPose() {
  const r = closet.getBoundingClientRect(), s = baby.hs;
  let x = baby.hx, y = baby.hy;
  if (H >= W) y = Math.min(y, r.top - s * 2.35);
  else x = Math.min(x, r.left - s * 1.4);
  return [x, Math.max(y, s * 1.6)];
}

CARES.roupa = {
  start() { warmUntil = 0; closetPicks = 0; markCloset(); closet.classList.add('on'); say('roupa', 'Vamos escolher uma roupinha?'); },
  end() { closet.classList.remove('on'); },
};
