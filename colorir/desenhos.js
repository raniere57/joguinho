'use strict';
// desenhos pra colorir, em 200 x 200.
// forma: c = círculo [x, y, r] ou d = caminho SVG; fixed = cor fixa (não pinta); bare = sem contorno; line = só traço;
// tag = nome da parte que se mexe quando o desenho "ganha vida" (hide = some; stay = fica parada no lugar).
// alive: scene (cenário), move(t) = onde o desenho vai {x, y, s, rot, flip, pivot}, parts = mexidas por tag,
// emit = de onde saem fumacinha, bolhas, brilhos...

const INK = '#3a2e4a';
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
const starD = (cx, cy, r) => 'M' + Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
  return `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
}).join(' L') + ' Z';
const heartD = (cx, cy, r) => `M${cx} ${cy + r * .9} C${cx - r * 1.4} ${cy + r * .05} ${cx - r * 1.05} ${cy - r * 1.05} ${cx} ${cy - r * .38} ` +
  `C${cx + r * 1.05} ${cy - r * 1.05} ${cx + r * 1.4} ${cy + r * .05} ${cx} ${cy + r * .9} Z`;
const cloudD = (cx, cy, s) => `M${cx - 30 * s} ${cy + 10 * s} A${12 * s} ${12 * s} 0 0 1 ${cx - 22 * s} ${cy - 8 * s} ` +
  `A${16 * s} ${16 * s} 0 0 1 ${cx + 6 * s} ${cy - 16 * s} A${15 * s} ${15 * s} 0 0 1 ${cx + 30 * s} ${cy - 2 * s} ` +
  `A${11 * s} ${11 * s} 0 0 1 ${cx + 28 * s} ${cy + 10 * s} Z`;
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const bounce = x => {   // easeOutBounce
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375;
  return n * (x -= 2.625 / d) * x + .984375;
};
const ground = () => H * .78;
const center = () => ({ x: W / 2, y: H * .47 });
const rayD = i => {
  const a = i * Math.PI / 4, tip = [100 + Math.cos(a) * 94, 100 + Math.sin(a) * 94];
  const b1 = [100 + Math.cos(a - .3) * 50, 100 + Math.sin(a - .3) * 50], b2 = [100 + Math.cos(a + .3) * 50, 100 + Math.sin(a + .3) * 50];
  return `M${b1[0]} ${b1[1]} L${tip[0]} ${tip[1]} L${b2[0]} ${b2[1]} Z`;
};
// vai e volta de um lado pro outro, virando pro lado que anda
const wander = (t, speed, spanX) => ({ x: W / 2 + Math.sin(t * speed) * W * spanX, flip: Math.cos(t * speed) < 0 ? -1 : 1 });
// passa pela tela da esquerda pra direita e recomeça
const drive = (t, speed) => -W * .45 + (t * W * speed) % (W * 1.9);

const ARTS = [
  { line: 'peixinho', text: 'Um peixinho!', shapes: [
    { c: [38, 42, 11], tag: 'bubble' }, { c: [22, 74, 7], tag: 'bubble' }, { c: [52, 18, 6], tag: 'bubble' },
    { d: 'M62 100 L18 58 Q32 100 18 142 Z', tag: 'tail' },
    { d: 'M88 64 Q110 18 150 66 Z' }, { d: 'M100 138 Q114 170 138 136 Z' },
    { d: ell(110, 100, 60, 42) },
    { d: 'M95 61 Q82 100 95 139 L112 141 Q99 100 112 59 Z' },
    { c: [145, 90, 11], fixed: '#fff' }, { c: [148, 90, 5], fixed: INK, bare: true },
    { d: 'M163 110 Q156 118 148 113', line: true },
  ], alive: {
    scene: 'sea',
    move: t => ({ ...wander(t, .8, .26), y: H * .48 + Math.sin(t * 1.6) * H * .05, rot: Math.sin(t * 1.6) * .08 }),
    parts: {
      tail: t => ({ rot: Math.sin(t * 12) * .22, px: 62, py: 100 }),
      bubble: (t, sh) => { const k = (t * .6 + sh.c[1] / 80) % 1; return { dy: -k * 50, a: 1 - k }; },
    },
    emit: [{ every: .5, at: [168, 108], kind: 'bubble' }],
  } },
  { line: 'casinha', text: 'Uma casinha!', shapes: [
    { c: [165, 34, 20], tag: 'sun' },
    { d: cloudD(45, 58, .9), tag: 'cloud' },
    { d: 'M0 168 H200 V200 H0 Z' },
    { d: 'M122 40 H142 V82 H122 Z' },
    { d: 'M40 90 H160 V170 H40 Z' },
    { d: 'M26 96 L100 34 L174 96 Z' },
    { d: 'M88 170 V134 A12 12 0 0 1 112 134 V170 Z' },
    { d: 'M52 108 H78 V134 H52 Z', tag: 'window' }, { d: 'M122 108 H148 V134 H122 Z', tag: 'window' },
    { d: 'M65 108 V134 M52 121 H78 M135 108 V134 M122 121 H148', line: true },
    { c: [106, 152, 2.6], fixed: INK, bare: true },
  ], alive: {
    scene: 'sky',
    move: t => ({ ...center(), s: .95 + easeOutBack(clamp01(t / .8)) * .05 }),
    parts: {
      sun: t => ({ dy: Math.max(0, 1 - t / 2) * 60, rot: t * .4 }),
      cloud: t => ({ dx: Math.sin(t * .6) * 30 }),
      window: t => ({ sx: 1 + Math.max(0, Math.sin(t * 3)) * .08, sy: 1 + Math.max(0, Math.sin(t * 3)) * .08 }),
    },
    emit: [{ every: .45, at: [132, 36], kind: 'smoke' }],
  } },
  { line: 'flor', text: 'Uma flor!', shapes: [
    { d: 'M95 88 H105 V145 H95 Z' },
    { d: 'M97 128 Q66 100 58 120 Q72 144 97 136 Z', tag: 'leafL' },
    { d: 'M103 112 Q136 84 144 104 Q128 128 103 120 Z', tag: 'leafR' },
    ...[0, 1, 2, 3, 4, 5].map(i => ({ c: [100 + Math.cos(i * Math.PI / 3) * 27, 68 + Math.sin(i * Math.PI / 3) * 27, 19], tag: 'petal' })),
    { c: [100, 68, 16] },
    { d: 'M70 152 H130 L122 196 H78 Z' },
    { d: 'M62 140 H138 V157 H62 Z' },
  ], alive: {
    scene: 'garden',
    move: t => ({ x: W / 2, y: ground(), s: easeOutBack(clamp01(t / 1.2)), rot: Math.sin(t * 1.5) * .05, pivot: [100, 196] }),
    parts: {
      petal: t => ({ rot: t * .7, px: 100, py: 68 }),
      leafL: t => ({ rot: Math.sin(t * 3) * .15, px: 97, py: 132 }),
      leafR: t => ({ rot: -Math.sin(t * 3) * .15, px: 103, py: 116 }),
    },
    emit: [{ every: .6, at: [100, 50], kind: 'sparkle' }],
  } },
  { line: 'borboleta', text: 'Uma borboleta!', shapes: [
    { d: 'M96 44 Q86 20 76 18 M104 44 Q114 20 124 18', line: true },
    { c: [75, 18, 5], fixed: INK, bare: true }, { c: [125, 18, 5], fixed: INK, bare: true },
    { d: 'M95 90 C60 18 8 38 24 86 C34 112 80 110 95 100 Z', tag: 'wing' },
    { d: 'M105 90 C140 18 192 38 176 86 C166 112 120 110 105 100 Z', tag: 'wing' },
    { d: 'M95 108 C60 104 28 130 44 162 C60 184 90 152 95 122 Z', tag: 'wing' },
    { d: 'M105 108 C140 104 172 130 156 162 C140 184 110 152 105 122 Z', tag: 'wing' },
    { c: [55, 72, 12], tag: 'wing' }, { c: [145, 72, 12], tag: 'wing' }, { c: [64, 142, 9], tag: 'wing' }, { c: [136, 142, 9], tag: 'wing' },
    { d: ell(100, 106, 9, 44) },
    { c: [100, 55, 13] },
    { c: [95.5, 53, 2.2], fixed: INK, bare: true }, { c: [104.5, 53, 2.2], fixed: INK, bare: true },
    { d: 'M95 59 Q100 63 105 59', line: true },
  ], alive: {
    scene: 'garden',
    move: t => ({ x: W / 2 + Math.sin(t * .7) * W * .25, y: H * .42 + Math.sin(t * 1.4) * H * .1, rot: Math.cos(t * .7) * .15, s: .8 }),
    parts: { wing: t => ({ sx: .3 + .7 * Math.abs(Math.cos(t * 9)), px: 100, py: 100 }) },
    emit: [{ every: .25, at: [100, 150], kind: 'sparkle' }],
  } },
  { line: 'sorvete', text: 'Um sorvete!', shapes: [
    { d: starD(38, 54, 18), tag: 'star' }, { d: starD(164, 150, 16), tag: 'star' },
    { d: 'M68 112 L100 192 L132 112 Z' },
    { c: [100, 64, 29] },
    { d: 'M60 114 Q58 82 100 80 Q142 82 140 114 Q130 105 120 114 Q110 105 100 114 Q90 105 80 114 Q70 105 60 114 Z' },
    { d: 'M100 36 Q103 20 116 14', line: true, tag: 'cherry' },
    { c: [100, 34, 10], tag: 'cherry' },
  ], alive: {
    scene: 'party',
    move: t => ({ x: W / 2, y: H * .5 - Math.abs(Math.sin(t * 3)) * H * .05, rot: Math.sin(t * 3) * .08 }),
    parts: {
      cherry: t => ({ dy: -Math.abs(Math.sin(t * 6)) * 8 }),
      star: (t, sh, i) => ({ rot: t * 2, sx: 1 + Math.sin(t * 5 + i) * .2, sy: 1 + Math.sin(t * 5 + i) * .2 }),
    },
    emit: [{ every: .4, at: [100, 70], kind: 'heart' }],
  } },
  { line: 'carrinho', text: 'Um carrinho!', shapes: [
    { d: 'M0 170 H200 V192 H0 Z', tag: 'hide' },
    { d: 'M20 140 Q20 115 45 112 L60 112 L75 86 Q80 78 90 78 H130 Q140 78 146 86 L160 112 H170 Q186 114 186 136 V150 H20 Z', tag: 'body' },
    { d: 'M80 88 Q82 86 86 86 H106 V112 H70 Z', tag: 'body' },
    { d: 'M114 86 H134 Q138 86 140 90 L150 112 H114 Z', tag: 'body' },
    { d: 'M110 114 V146', line: true, tag: 'body' },
    { c: [56, 152, 20] }, { c: [150, 152, 20] },
    { c: [56, 152, 8] }, { c: [150, 152, 8] },
    { c: [178, 128, 6], tag: 'body' },
  ], alive: {
    scene: 'road',
    move: t => ({ x: drive(t, .3), y: H * .7, s: .75, pivot: [100, 172] }),
    parts: { body: t => ({ dy: Math.sin(t * 18) * 1.5 }) },
    emit: [{ every: .3, at: [18, 145], kind: 'smoke' }],
  } },
  { line: 'sol', text: 'Um sol!', shapes: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ d: rayD(i), tag: 'ray' })),
    { c: [100, 100, 55], tag: 'face' },
    { c: [72, 114, 9], tag: 'face' }, { c: [128, 114, 9], tag: 'face' },
    { c: [82, 92, 5], fixed: INK, bare: true, tag: 'face' }, { c: [118, 92, 5], fixed: INK, bare: true, tag: 'face' },
    { d: 'M80 116 Q100 134 120 116', line: true, tag: 'face' },
  ], alive: {
    scene: 'sky',
    move: t => ({ x: W / 2, y: H * .45 + (1 - easeOutBack(clamp01(t / 1.6))) * H * .45, s: .9 }),
    parts: {
      ray: t => ({ rot: t * .6, px: 100, py: 100 }),
      face: t => ({ sx: 1 + Math.sin(t * 3) * .03, sy: 1 + Math.sin(t * 3) * .03, px: 100, py: 100 }),
    },
    emit: [{ every: .35, at: t => [100 + Math.cos(t * 2) * 90, 100 + Math.sin(t * 2) * 90], kind: 'sparkle' }],
  } },
  { line: 'arcoiris', text: 'Um arco-íris!', shapes: [
    ...[0, 1, 2, 3, 4].map(k => {
      const Ro = 90 - 14 * k, Ri = Ro - 14;
      return { d: `M${100 - Ro} 150 A${Ro} ${Ro} 0 0 1 ${100 + Ro} 150 L${100 + Ri} 150 A${Ri} ${Ri} 0 0 0 ${100 - Ri} 150 Z`, tag: 'band' + k };
    }),
    { d: cloudD(26, 150, 1), tag: 'cloudL' }, { d: cloudD(174, 150, 1), tag: 'cloudR' },
    { c: [60, 180, 5] }, { c: [80, 188, 5] }, { c: [120, 184, 5] }, { c: [145, 190, 5] },
  ], alive: {
    scene: 'sky',
    move: t => ({ x: W / 2, y: H * .48, s: 1.05 }),
    parts: {
      ...Object.fromEntries([0, 1, 2, 3, 4].map(k => ['band' + k, t => {
        const e = easeOutBack(clamp01((t - k * .25) / .6));
        return { sx: e, sy: e, px: 100, py: 150 };
      }])),
      cloudL: t => ({ dx: Math.sin(t) * 6 }),
      cloudR: t => ({ dx: -Math.sin(t) * 6 }),
    },
    emit: [{ every: .2, at: t => [100 + Math.cos(Math.PI + (t * .8) % Math.PI) * 76, 150 + Math.sin(Math.PI + (t * .8) % Math.PI) * 76], kind: 'sparkle' }],
  } },
  { line: 'baloes', text: 'Balões!', shapes: [
    { d: 'M62 108 Q74 150 100 176 M138 104 Q126 150 100 176 M100 136 L100 176', line: true },
    { d: ell(62, 70, 30, 38) }, { d: ell(138, 66, 30, 38) },
    { d: ell(100, 96, 32, 40) },
    { c: [52, 56, 6], fixed: '#fff', bare: true }, { c: [128, 52, 6], fixed: '#fff', bare: true }, { c: [89, 80, 7], fixed: '#fff', bare: true },
    { d: 'M100 176 L80 164 L80 188 Z' }, { d: 'M100 176 L120 164 L120 188 Z' },
    { c: [100, 176, 6] },
  ], alive: {
    scene: 'sky',
    move: t => ({ x: W / 2 + Math.sin(t) * W * .05, y: H * .55 - t * H * .06, rot: Math.sin(t * 1.3) * .06 }),
    emit: [{ every: .5, at: [100, 60], kind: 'sparkle' }],
  } },
  { line: 'coracao', text: 'Um coração!', shapes: [
    { d: heartD(32, 42, 16), tag: 'mini' }, { d: heartD(168, 46, 16), tag: 'mini' },
    { d: heartD(34, 162, 14), tag: 'mini' }, { d: heartD(166, 166, 14), tag: 'mini' },
    { d: heartD(100, 104, 64) },
    { d: heartD(100, 100, 30) },
  ], alive: {
    scene: 'party',
    move: t => {
      const b = (t * 1.1) % 1, beat = b < .15 ? Math.sin(b / .15 * Math.PI) * .12 : b < .32 ? Math.sin((b - .15) / .17 * Math.PI) * .07 : 0;
      return { ...center(), s: 1 + beat };
    },
    parts: { mini: (t, sh, i) => ({ dy: Math.sin(t * 2 + i) * 8, rot: Math.sin(t * 3 + i) * .2 }) },
    emit: [{ every: .3, at: [100, 100], kind: 'heart' }],
  } },
  { line: 'gatinho', text: 'Um gatinho!', shapes: [
    { d: 'M48 80 L55 22 L94 56 Z', tag: 'earL' }, { d: 'M152 80 L145 22 L106 56 Z', tag: 'earR' },
    { d: 'M60 66 L63 38 L83 56 Z', tag: 'earL' }, { d: 'M140 66 L137 38 L117 56 Z', tag: 'earR' },
    { d: ell(100, 106, 64, 56) },
    { d: ell(100, 130, 26, 18) },
    { c: [75, 98, 12] }, { c: [125, 98, 12] },
    { d: ell(75, 98, 4, 8), fixed: INK, bare: true, tag: 'pupil' }, { d: ell(125, 98, 4, 8), fixed: INK, bare: true, tag: 'pupil' },
    { d: 'M93 118 L107 118 L100 126 Z' },
    { d: 'M100 126 Q100 136 90 138 M100 126 Q100 136 110 138', line: true },
    { d: 'M62 124 L26 116 M62 132 L26 136 M138 124 L174 116 M138 132 L174 136', line: true, tag: 'whisker' },
  ], alive: {
    scene: 'garden',
    move: t => ({ x: W / 2, y: H * .5 - Math.max(0, Math.sin(t * 2.2)) * 14, rot: Math.sin(t * 1.5) * .1 }),
    parts: {
      earL: t => ({ rot: t % 2.4 < .25 ? -.25 : 0, px: 70, py: 70 }),
      earR: t => ({ rot: (t + 1.2) % 2.4 < .25 ? .25 : 0, px: 130, py: 70 }),
      pupil: t => ({ sy: t % 3 < .15 ? .1 : 1 }),
      whisker: t => ({ dy: Math.sin(t * 8) * 1.2 }),
    },
    emit: [{ every: .7, at: [100, 50], kind: 'heart' }],
  } },
  { line: 'ursinho', text: 'Um ursinho!', shapes: [
    { c: [50, 50, 24], tag: 'earL' }, { c: [150, 50, 24], tag: 'earR' },
    { c: [50, 50, 12], tag: 'earL' }, { c: [150, 50, 12], tag: 'earR' },
    { c: [100, 104, 64] },
    { c: [62, 124, 9] }, { c: [138, 124, 9] },
    { d: ell(100, 128, 28, 21) },
    { d: ell(100, 118, 10, 7) },
    { c: [78, 94, 6], fixed: INK, bare: true }, { c: [122, 94, 6], fixed: INK, bare: true },
    { d: 'M100 125 V134 M100 134 Q92 142 86 136 M100 134 Q108 142 114 136', line: true },
    { d: 'M100 178 L72 164 L72 192 Z' }, { d: 'M100 178 L128 164 L128 192 Z' },
    { c: [100, 178, 8] },
  ], alive: {
    scene: 'party',
    move: t => ({ x: W / 2, y: H * .5 - Math.abs(Math.sin(t * 4)) * 20, rot: Math.sin(t * 4) * .12 }),
    parts: {
      earL: t => ({ rot: Math.sin(t * 8) * .12, px: 60, py: 62 }),
      earR: t => ({ rot: -Math.sin(t * 8) * .12, px: 140, py: 62 }),
    },
    emit: [{ every: .4, at: t => [Math.sin(t) > 0 ? 30 : 170, 90], kind: 'note' }],
  } },
  { line: 'barquinho', text: 'Um barquinho!', shapes: [
    { c: [165, 35, 18], tag: 'hide' },
    { d: 'M97 30 H103 V130 H97 Z' },
    { d: 'M103 30 L125 37 L103 44 Z', tag: 'flag' },
    { d: 'M106 42 L106 120 L166 120 Z' },
    { d: 'M94 56 L94 120 L48 120 Z' },
    { d: 'M30 128 H170 L150 164 H50 Z' },
    { c: [70, 144, 6] }, { c: [100, 144, 6] }, { c: [130, 144, 6] },
    { d: 'M0 160 Q25 150 50 160 T100 160 T150 160 T200 160 V200 H0 Z', tag: 'hide' },
  ], alive: {
    scene: 'boat',
    move: t => ({ x: W / 2 + Math.sin(t * .5) * W * .18, y: H * .64 + Math.sin(t * 2) * 5, rot: Math.sin(t * 2) * .07, s: .85, pivot: [100, 160] }),
    parts: { flag: t => ({ sx: 1 + Math.sin(t * 10) * .18, px: 103, py: 37 }) },
  } },
  { line: 'foguete', text: 'Um foguete!', shapes: [
    { d: starD(32, 40, 11), tag: 'stay' }, { d: starD(170, 60, 10), tag: 'stay' }, { d: starD(38, 150, 10), tag: 'stay' },
    { d: 'M85 158 Q100 200 115 158 Z', tag: 'flame' },
    { d: 'M78 118 L52 160 L80 150 Z' }, { d: 'M122 118 L148 160 L120 150 Z' },
    { d: 'M100 20 C130 45 128 110 122 155 H78 C72 110 70 45 100 20 Z' },
    { d: 'M100 20 C112 30 118 40 120 52 H80 C82 40 88 30 100 20 Z' },
    { d: 'M96 128 H104 V162 H96 Z' },
    { c: [100, 86, 17] }, { c: [100, 86, 11] },
  ], alive: {
    scene: 'space',
    still: () => ({ ...center(), s: .9 }),
    move: t => {
      let y = H * .47;
      if (t > 1 && t < 3.4) y -= ((t - 1) / 2.4) ** 2 * H * .95;
      else if (t >= 3.4) y = H * 1.4 - easeOutBack(clamp01((t - 3.4) / 2)) * H * .93;
      return { x: W / 2 + (t < 1 ? Math.sin(t * 60) * 3 : 0), y, s: .9 };
    },
    parts: { flame: t => ({ sy: 1 + Math.abs(Math.sin(t * 25)) * .4, sx: 1 + Math.sin(t * 31) * .1, px: 100, py: 158 }) },
    emit: [{ every: .08, at: [100, 190], kind: 'smoke' }],
  } },
  { line: 'maca', text: 'Uma maçã!', shapes: [
    { d: 'M100 60 C60 35 20 70 35 120 C45 160 75 180 100 165 C125 180 155 160 165 120 C180 70 140 35 100 60 Z' },
    { d: 'M97 62 Q95 40 88 28 L94 26 Q102 40 103 62 Z' },
    { d: 'M103 45 Q125 20 150 30 Q130 55 103 45 Z', tag: 'leaf' },
    { d: ell(62, 96, 9, 18), fixed: '#fff', bare: true },
    { d: 'M30 178 Q34 160 42 150 M54 184 Q52 164 42 150', line: true, tag: 'stay' },
    { c: [30, 180, 11], tag: 'stay' }, { c: [54, 186, 11], tag: 'stay' },
  ], alive: {
    scene: 'garden',
    still: () => ({ x: W / 2, y: ground(), pivot: [100, 175] }),
    move: t => ({ x: W / 2, y: ground() - (1 - bounce(clamp01(t / 1.3))) * H * .6, rot: t > 1.3 ? Math.sin(t * 3) * .05 : 0, pivot: [100, 175] }),
    parts: { leaf: t => ({ rot: Math.sin(t * 4) * .18, px: 103, py: 45 }) },
    emit: [{ every: .6, at: [100, 40], kind: 'sparkle' }],
  } },
  { line: 'arvore', text: 'Uma árvore!', shapes: [
    { d: 'M0 172 Q100 152 200 172 V200 H0 Z', tag: 'hide' },
    { d: 'M88 110 H112 L118 176 H82 Z' },
    { c: [66, 90, 34] }, { c: [134, 90, 34] }, { c: [100, 58, 40] }, { c: [100, 106, 32] },
    { c: [74, 74, 8], tag: 'fruit' }, { c: [128, 100, 8], tag: 'fruit' }, { c: [104, 42, 8], tag: 'fruit' }, { c: [86, 112, 8], tag: 'fruit' },
  ], alive: {
    scene: 'garden',
    move: t => ({ x: W / 2, y: ground(), rot: Math.sin(t * 1.2) * .03, s: 1.05, pivot: [100, 176] }),
    parts: {
      fruit: (t, sh, i) => {
        const d = 1.2 + (i % 4) * .9, drop = 168 - sh.c[1];
        return { dy: drop * bounce(clamp01((t - d) / .9)) };
      },
    },
  } },
  { line: 'pintinho', text: 'Um pintinho!', shapes: [
    { d: 'M0 176 H200 V200 H0 Z', tag: 'hide' },
    { c: [100, 122, 45] },
    { d: ell(76, 120, 15, 22), tag: 'wing' },
    { c: [100, 70, 30] },
    { d: 'M96 42 Q98 26 106 36 Q110 26 114 40 Z' },
    { d: 'M124 66 L144 72 L124 80 Z' },
    { c: [113, 62, 4.5], fixed: INK, bare: true },
    { c: [116, 78, 5] },
    { d: 'M48 130 L62 116 L76 132 L90 116 L104 132 L118 116 L132 132 L146 116 L154 130 C156 180 46 180 48 130 Z', tag: 'stay' },
  ], alive: {
    scene: 'garden',
    still: () => ({ x: W / 2, y: ground(), pivot: [100, 172] }),
    move: t => ({ ...wander(t, .8, .22), y: ground() - Math.abs(Math.sin(t * 5)) * 22, pivot: [100, 172] }),
    parts: { wing: t => ({ rot: Math.sin(t * 14) * .35, px: 84, py: 106 }) },
    emit: [{ every: .6, at: [120, 40], kind: 'note' }],
  } },
  { line: 'tartaruga', text: 'Uma tartaruga!', shapes: [
    { d: 'M36 126 L16 136 L36 140 Z' },
    { d: ell(56, 146, 16, 12), tag: 'legA' }, { d: ell(144, 146, 16, 12), tag: 'legB' },
    { c: [170, 112, 20], tag: 'head' },
    { d: 'M35 136 C35 66 165 66 165 136 Z' },
    { d: 'M28 128 H172 Q176 128 176 134 V138 Q176 144 170 144 H30 Q24 144 24 138 V134 Q24 128 28 128 Z' },
    { c: [100, 104, 16] }, { c: [68, 118, 10] }, { c: [132, 118, 10] }, { c: [80, 86, 9] }, { c: [120, 86, 9] },
    { c: [177, 106, 3.5], fixed: INK, bare: true, tag: 'head' },
    { d: 'M172 120 Q180 123 186 116', line: true, tag: 'head' },
  ], alive: {
    scene: 'garden',
    move: t => ({ x: W * .25 + t * W * .07, y: ground(), s: .9, pivot: [100, 158] }),
    parts: {
      legA: t => ({ dy: -Math.max(0, Math.sin(t * 4)) * 7 }),
      legB: t => ({ dy: -Math.max(0, -Math.sin(t * 4)) * 7 }),
      head: t => ({ dx: Math.sin(t * 2) * 4, dy: Math.sin(t * 4) * 2 }),
    },
    emit: [{ every: .9, at: [100, 60], kind: 'heart' }],
  } },
  { line: 'joaninha', text: 'Uma joaninha!', shapes: [
    { d: 'M18 178 Q96 70 186 36 Q164 156 18 178 Z', tag: 'stay' },
    { d: 'M92 44 Q84 28 76 26 M108 44 Q116 28 124 26', line: true },
    { c: [76, 26, 4], fixed: INK, bare: true }, { c: [124, 26, 4], fixed: INK, bare: true },
    { c: [100, 62, 22] },
    { c: [92, 56, 5], fixed: '#fff' }, { c: [108, 56, 5], fixed: '#fff' },
    { c: [100, 112, 46], fixed: INK, bare: true },
    { d: 'M100 62 A50 50 0 0 0 100 162 Z', tag: 'wingL' }, { d: 'M100 62 A50 50 0 0 1 100 162 Z', tag: 'wingR' },
    { c: [78, 96, 9], tag: 'wingL' }, { c: [72, 132, 8], tag: 'wingL' }, { c: [122, 96, 9], tag: 'wingR' }, { c: [128, 132, 8], tag: 'wingR' },
  ], alive: {
    scene: 'garden',
    still: center,
    move: t => {
      const f = clamp01((t - 1.2) / .6), a = (t - 1.2) * .9;
      return { x: W / 2 + (t > 1.2 ? Math.sin(a) * W * .25 : 0), y: H * .47 - f * H * .14 + (t > 1.2 ? Math.sin(a * 2) * H * .06 : 0), s: 1 - f * .25, rot: t > 1.2 ? Math.cos(a) * .2 : 0 };
    },
    parts: {
      wingL: t => ({ rot: -clamp01((t - 1) / .4) * (.5 + Math.sin(t * 30) * .12), px: 100, py: 64 }),
      wingR: t => ({ rot: clamp01((t - 1) / .4) * (.5 + Math.sin(t * 30) * .12), px: 100, py: 64 }),
    },
  } },
  { line: 'coroa', text: 'Uma coroa!', shapes: [
    { d: 'M30 150 L40 60 L70 100 L100 44 L130 100 L160 60 L170 150 Z' },
    { d: 'M100 78 L114 100 L100 122 L86 100 Z', tag: 'jewel' },
    { d: 'M28 140 H172 V166 H28 Z' },
    { c: [40, 58, 8], tag: 'jewel' }, { c: [100, 42, 9], tag: 'jewel' }, { c: [160, 58, 8], tag: 'jewel' },
    { c: [60, 153, 7], tag: 'jewel' }, { c: [100, 153, 9], tag: 'jewel' }, { c: [140, 153, 7], tag: 'jewel' },
  ], alive: {
    scene: 'party',
    move: t => ({ ...center(), y: H * .47 + Math.sin(t * 1.5) * 12, rot: Math.sin(t) * .06, s: easeOutBack(clamp01(t / .8)) }),
    parts: { jewel: (t, sh, i) => { const k = 1 + Math.max(0, Math.sin(t * 4 + i * 1.3)) * .3; return { sx: k, sy: k }; } },
    emit: [{ every: .15, at: t => [30 + (t * 97) % 140, 50 + (t * 53) % 110], kind: 'sparkle' }],
  } },
  { line: 'bolinho', text: 'Um bolinho!', shapes: [
    { d: 'M50 116 H150 L135 186 H65 Z' },
    { d: 'M76 116 L82 186 M100 116 V186 M124 116 L118 186', line: true },
    { d: 'M44 118 C28 110 38 84 60 88 C54 64 82 54 96 68 C100 44 132 50 128 72 C150 64 168 92 152 104 C166 116 150 128 140 118 Z' },
    { c: [70, 100, 5], tag: 'candy' }, { c: [95, 88, 5], tag: 'candy' }, { c: [126, 94, 5], tag: 'candy' }, { c: [110, 108, 5], tag: 'candy' },
    { d: 'M110 42 Q112 28 124 22', line: true, tag: 'cherry' },
    { c: [110, 50, 12], tag: 'cherry' },
  ], alive: {
    scene: 'party',
    move: t => {
      const hop = Math.abs(Math.sin(t * 3.5));
      return { x: W / 2, y: H * .56 - hop * H * .06, s: 1 + (1 - hop) * .04, pivot: [100, 186] };
    },
    parts: {
      cherry: t => ({ dy: -Math.abs(Math.sin(t * 7)) * 10 }),
      candy: (t, sh, i) => { const k = 1 + Math.max(0, Math.sin(t * 6 + i)) * .5; return { sx: k, sy: k }; },
    },
    emit: [{ every: .35, at: [110, 40], kind: 'sparkle' }],
  } },
  { line: 'lua', text: 'A lua e as estrelas!', shapes: [
    { d: starD(160, 42, 17), tag: 'star' }, { d: starD(166, 122, 12), tag: 'star' },
    { d: starD(132, 172, 10), tag: 'star' }, { d: starD(36, 172, 13), tag: 'star' }, { d: starD(30, 30, 9), tag: 'star' },
    { c: [86, 96, 56] },
    { c: [66, 74, 9] }, { c: [108, 122, 7] }, { c: [58, 128, 6] },
    { d: 'M62 96 Q70 102 78 96 M94 96 Q102 102 110 96', line: true },
    { d: 'M72 114 Q86 124 100 114', line: true },
  ], alive: {
    scene: 'night',
    move: t => ({ ...center(), y: H * .47 + Math.sin(t * 1.2) * 10, rot: Math.sin(t * .8) * .05 }),
    parts: { star: (t, sh, i) => { const k = 1 + Math.sin(t * 4 + i * 1.7) * .25; return { sx: k, sy: k, rot: Math.sin(t + i) * .3 }; } },
    emit: [{ every: .5, at: t => [20 + (t * 71) % 160, 20 + (t * 37) % 60], kind: 'sparkle' }],
  } },
  { line: 'trem', text: 'Um trem!', shapes: [
    { d: 'M0 172 H200', line: true, tag: 'hide' },
    { c: [134, 52, 10], tag: 'smoke' }, { c: [150, 36, 13], tag: 'smoke' }, { c: [172, 22, 15], tag: 'smoke' },
    { d: 'M114 80 H130 V112 H114 Z' },
    { d: 'M108 70 H136 V82 H108 Z' },
    { d: 'M20 90 H82 V152 H20 Z', tag: 'body' },
    { d: 'M14 80 H88 V94 H14 Z', tag: 'body' },
    { d: 'M34 102 H68 V124 H34 Z', tag: 'body' },
    { d: 'M82 108 H150 V152 H82 Z', tag: 'body' },
    { d: 'M150 128 L172 152 H150 Z', tag: 'body' },
    { c: [40, 156, 15] }, { c: [72, 156, 15] }, { c: [106, 160, 11] }, { c: [132, 160, 11] },
  ], alive: {
    scene: 'road',
    move: t => ({ x: drive(t, .26), y: H * .7, s: .8, pivot: [100, 172] }),
    parts: {
      body: t => ({ dy: Math.sin(t * 16) * 1.2 }),
      smoke: (t, sh, i) => { const k = (t * .8 + i * .33) % 1; return { dy: -k * 30, dx: -k * 10, a: 1 - k }; },
    },
    emit: [{ every: .25, at: [122, 68], kind: 'smoke' }],
  } },
];
