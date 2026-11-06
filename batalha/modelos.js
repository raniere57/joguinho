// modelos 3D: soldadinhos instanciados (milhares num desenho só), canhão, metralhadora, portão,
// monte de neve com placa, ladrilhos das esteiras e o chefão cavaleiro.
import * as THREE from '../comum/vendor/three.module.min.js';
import { scene, canvasTex, strokeText, LW, BELT_W } from './mundo.js';

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const phong = (color, extra = {}) => new THREE.MeshPhongMaterial({ color, shininess: 60, specular: '#ffffff', ...extra });

// ---------- tropa: milhares de soldadinhos num desenho só ----------
// cada soldado é uma geometria única (pernas, corpo, cabeça, capacete, penacho, olhos) com cor por vértice;
// o passo das pernas e o balanço acontecem na placa de vídeo, a partir da fase de cada um.
function part(geo, color, leg = 0) {
  const g = geo.index ? geo : geo, n = g.attributes.position.count, c = new THREE.Color(color);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, i) => [c.r, c.g, c.b][i % 3]), 3));
  g.setAttribute('leg', new THREE.BufferAttribute(new Float32Array(n).fill(leg), 1));
  g.deleteAttribute('uv');
  return g;
}
export function merge(geos, names = ['position', 'normal', 'color', 'leg']) {
  const out = new THREE.BufferGeometry(), idx = [];
  for (const a of names) out.setAttribute(a, new THREE.BufferAttribute(new Float32Array(geos.reduce((n, g) => n + g.attributes[a].array.length, 0)), geos[0].attributes[a].itemSize));
  const at = Object.fromEntries(names.map(a => [a, 0]));
  let off = 0;
  for (const g of geos) {
    for (const a of names) { out.attributes[a].array.set(g.attributes[a].array, at[a]); at[a] += g.attributes[a].array.length; }
    if (g.index) for (const i of g.index.array) idx.push(i + off); else for (let i = 0; i < g.attributes.position.count; i++) idx.push(i + off);
    off += g.attributes.position.count;
  }
  out.setIndex(idx);
  return out;
}

// junta as malhas de cor sólida de cada grupo numa só (cor por vértice): bem menos desenhos por quadro
const bakedMat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: '#666666' });
export function bake(g) {
  const solid = g.children.filter(o => o.isMesh && !o.material.map && o.material.side !== THREE.DoubleSide && !o.material.transparent);
  if (solid.length > 1) {
    const geos = solid.map(o => {
      o.updateMatrix();
      const geo = (o.geometry.index ? o.geometry : o.geometry).clone().applyMatrix4(o.matrix), n = geo.attributes.position.count, c = o.material.color;
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, i) => [c.r, c.g, c.b][i % 3]), 3));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(k)) geo.deleteAttribute(k);
      return geo;
    });
    solid.forEach(o => g.remove(o));
    const m = new THREE.Mesh(merge(geos, ['position', 'normal', 'color']), bakedMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  g.children.filter(o => o.isGroup).forEach(bake);
  return g;
}
function soldierGeo(c, face) {
  const p = [
    part(new THREE.CylinderGeometry(.05, .045, .17, 4, 1, true).translate(-.065, .085, 0), c.leg, 1),
    part(new THREE.CylinderGeometry(.05, .045, .17, 4, 1, true).translate(.065, .085, 0), c.leg, -1),
    part(new THREE.CylinderGeometry(.1, .125, .26, 6).translate(0, .3, 0), c.body),
    part(new THREE.SphereGeometry(.125, 7, 5).translate(0, .5, 0), c.head),
    part(new THREE.SphereGeometry(.14, 7, 3, 0, Math.PI * 2, 0, Math.PI * .55).translate(0, .52, 0), c.helm),
    part(new THREE.BoxGeometry(.04, .07, .2).translate(0, .66, 0), c.crest),
  ];
  if (face > 0) for (const d of [-1, 1]) p.push(part(new THREE.BoxGeometry(.04, .05, .02).translate(d * .05, .51, .12), '#1a0a10'));
  return merge(p);
}
export class Troop {
  constructor(max, c, opts = {}) {
    this.max = max; this.n = 0;
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 35, specular: '#555555' });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float leg; attribute float phase; attribute float hop;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float st = sin(phase);
          transformed.z += leg * st * .07;
          transformed.y += leg == 0.0 ? abs(st) * .035 : max(0.0, leg * st) * .05;
          transformed.y += hop;`);
    };
    this.mesh = new THREE.InstancedMesh(soldierGeo(c, opts.face || 1), mat, max);
    this.phase = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.hop = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.mesh.geometry.setAttribute('phase', this.phase); this.mesh.geometry.setAttribute('hop', this.hop);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    const shGeo = new THREE.CircleGeometry(.2, 8); shGeo.rotateX(-Math.PI / 2); shGeo.translate(0, .01, 0);
    this.shadow = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ color: '#2a3040', transparent: true, opacity: .26, depthWrite: false }), max);
    for (const m of [this.mesh, this.shadow]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
    this.tinted = !!opts.tint;
  }
  begin() { this.n = 0; }
  // x, z no mundo; s = escala; ph = fase do passo; y = altura do pulo
  put(x, z, s = 1, ph = 0, tint, y = 0) {
    if (this.n >= this.max) return;
    const i = this.n++, o = i * 16;
    for (const m of [this.mesh, this.shadow]) {
      const a = m.instanceMatrix.array;
      a[o] = s; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = m === this.mesh ? s : 1; a[o + 6] = 0; a[o + 7] = 0;
      a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = s; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = 0; a[o + 14] = z; a[o + 15] = 1;
    }
    this.phase.array[i] = ph; this.hop.array[i] = y / s;
    if (this.tinted) this.mesh.instanceColor.setXYZ(i, ...(tint || ONE));
  }
  // soldado voando (matriz qualquer: gira no ar); sem sombra
  putMatrix(mat, tint) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.mesh.setMatrixAt(i, mat); this.shadow.setMatrixAt(i, ZERO);
    this.phase.array[i] = 0; this.hop.array[i] = 0;
    if (this.tinted) this.mesh.instanceColor.setXYZ(i, ...(tint || ONE));
  }
  end() {
    for (const m of [this.mesh, this.shadow]) { m.count = this.n; m.instanceMatrix.needsUpdate = true; }
    this.phase.needsUpdate = true; this.hop.needsUpdate = true;
    if (this.tinted) this.mesh.instanceColor.needsUpdate = true;
  }
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), ONE = [1, 1, 1];

// ---------- capitão: o herói que lança os soldados (azul; dourado quando vira super) ----------
export function makeHero(gold) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const C = gold
    ? { armor: '#ffc93c', dark: '#c98a12', trim: '#fff3b0', cape: '#d9262f', plume: '#ffffff', skin: '#2a5fd0' }
    : { armor: '#3f86f7', dark: '#1f4fb8', trim: '#ffd23f', cape: '#2449a8', plume: '#ff4a4a', skin: '#2a5fd0' };
  const armor = phong(C.armor, { shininess: 110 }), dark = phong(C.dark, { shininess: 60 }), trim = phong(C.trim, { shininess: 140 }), steel = phong('#dfe7f2', { shininess: 140 });
  // pernas
  const legs = [];
  for (const d of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(d * .2, .55, 0);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.13, .12, .45, 10), dark); l.position.y = -.25;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.24, .16, .36), lam('#3a2a22')); boot.position.set(0, -.48, -.05);
    leg.add(l, boot); legs.push(leg); body.add(leg);
  }
  // tronco, cinto e peitoral
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.36, .3, 4, 14), armor); torso.position.y = .95; body.add(torso);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.36, .06, 8, 20), lam('#5a3a24')); belt.rotation.x = Math.PI / 2; belt.position.y = .75; body.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(.16, .13, .06), trim); buckle.position.set(0, .75, -.38); body.add(buckle);
  // capa nas costas (é o que a câmera mais vê)
  const capeGeo = new THREE.PlaneGeometry(.56, .8, 4, 6), cp = capeGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), x = cp.getX(i); cp.setZ(i, (.4 - y) * .3 + Math.cos(x * 4) * .05); cp.setX(i, x * (1 + (.4 - y) * .4)); }
  capeGeo.computeVertexNormals();
  const cape = new THREE.Mesh(capeGeo, new THREE.MeshPhongMaterial({ color: C.cape, side: THREE.DoubleSide, shininess: 20 })); cape.position.set(0, .92, .36); body.add(cape);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(.1, 5), new THREE.MeshBasicMaterial({ color: C.trim, side: THREE.DoubleSide })); emblem.position.set(0, .98, .45); emblem.rotation.z = Math.PI / 2; body.add(emblem);
  // ombreiras
  for (const d of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), trim); sh.scale.set(1.1, .8, 1.1); sh.position.set(d * .4, 1.28, 0); body.add(sh); }
  // cabeça: capacete com viseira, penacho e (no dourado) coroa
  const head = new THREE.Group(); head.position.y = 1.62; body.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), steel); face.position.set(0, -.04, -.04); head.add(face);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 10, 0, Math.PI * 2, 0, Math.PI * .58), armor); helm.position.y = -.02; head.add(helm);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.36, .045, 8, 20), trim); band.rotation.x = Math.PI / 2; band.position.y = -.04; head.add(band);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.42, .1, .1), lam('#1b2236')); visor.position.set(0, .02, -.33); head.add(visor);
  const plume = new THREE.Mesh(new THREE.TorusGeometry(.3, .11, 8, 16, Math.PI * 1.15), lam(C.plume)); plume.rotation.y = Math.PI / 2; plume.rotation.z = -.15; plume.position.set(0, .24, .05); head.add(plume);
  if (gold) {
    const crown = new THREE.Group(); crown.position.y = .32; head.add(crown);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.24, .26, .12, 14, 1, true), trim); crown.add(ring);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, sp = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 6), trim); sp.position.set(Math.cos(a) * .25, .12, Math.sin(a) * .25); crown.add(sp); }
    plume.position.y = .36;
  }
  // braço do escudo (esquerdo) e braço da espada (direito)
  const shieldArm = new THREE.Group(); shieldArm.position.set(-.5, 1.15, 0); body.add(shieldArm);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .08, 18), armor); shield.rotation.z = Math.PI / 2; shield.position.set(-.1, -.25, -.05); shieldArm.add(shield);
  const sRim = new THREE.Mesh(new THREE.TorusGeometry(.34, .04, 6, 18), trim); sRim.rotation.y = Math.PI / 2; sRim.position.copy(shield.position); shieldArm.add(sRim);
  const sStar = new THREE.Mesh(new THREE.CircleGeometry(.14, 5), new THREE.MeshBasicMaterial({ color: C.trim, side: THREE.DoubleSide })); sStar.rotation.y = -Math.PI / 2; sStar.position.set(-.15, -.25, -.05); shieldArm.add(sStar);
  const swordArm = new THREE.Group(); swordArm.position.set(.5, 1.18, 0); body.add(swordArm);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .3, 3, 8), armor); arm.position.y = -.2; swordArm.add(arm);
  const sword = new THREE.Group(); sword.position.y = -.42; swordArm.add(sword);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.13, 1.1, .04), steel); blade.position.y = .65; sword.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.092, .2, 4), steel); tip.position.y = 1.3; tip.rotation.y = Math.PI / 4; sword.add(tip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(.32, .06, .08), trim); guard.position.y = .08; sword.add(guard);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .16, 6), lam('#5a3a24')); hilt.position.y = 0; sword.add(hilt);
  bake(g);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { body, legs, swordArm, shieldArm, head, cape };
  return g;
}

// ---------- portão ----------
export function makeGate(label, w = LW * 2, bad = false) {
  const g = new THREE.Group(), h = bad ? 1.5 : 2;
  const mat = new THREE.MeshPhongMaterial({ color: bad ? '#e8303a' : '#8b3dff', emissive: bad ? '#8a0a12' : '#4a0fb0', emissiveIntensity: .55, shininess: 80 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.1), mat); slab.position.y = h / 2; slab.castShadow = true; g.add(slab);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, .1, 1.12), new THREE.MeshBasicMaterial({ color: bad ? '#ff8f8f' : '#b98cff' })); top.position.y = h + .02; g.add(top);
  const reps = bad ? 4 : 1;   // o ÷ se repete na largura toda, pra aparecer dos dois lados do portão que anda
  const tex = canvasTex(512 * reps, 128, (c, W, H) => { for (let i = 0; i < reps; i++) strokeText(c, label, (i + .5) * W / reps, H / 2 + 4, 104, '#ffffff', bad ? '#6a0a12' : '#3a0a7a', .22); });
  const tw = bad ? w * .98 : Math.min(7.6, w * .95), txt = new THREE.Mesh(new THREE.PlaneGeometry(tw, (bad ? w / reps : tw) / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  txt.position.set(0, h / 2 + .02, .57); txt.renderOrder = 3; g.add(txt);
  g.rotation.x = -.6;   // deitado pra trás, de cara pra câmera
  // brilho correndo na frente
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(1.2, h), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .22, depthWrite: false }));
  shine.position.set(0, h / 2, .56); g.add(shine);
  g.userData = { mat, shine, w };
  return g;
}

// ---------- monte de neve com o prêmio dentro e a placa do número ----------
const snowMat = new THREE.MeshLambertMaterial({ color: '#f7fbff', emissive: '#c8d8ee', emissiveIntensity: .12 });
const BALLS = [[0, .55, 0, .75], [-.65, .45, .1, .6], [.65, .45, .05, .6], [-.35, 1.05, -.1, .55], [.35, 1.0, -.05, .55], [0, 1.45, 0, .45], [-.75, .9, .25, .42], [.78, .85, .2, .42], [0, .6, .55, .5]];
export function makePile(reward) {
  const g = new THREE.Group(), balls = [];
  const sph = new THREE.SphereGeometry(1, 14, 10);
  for (const [x, y, z, r] of BALLS) { const b = new THREE.Mesh(sph, snowMat); b.position.set(x, y, z); b.scale.setScalar(r); b.castShadow = true; balls.push(b); g.add(b); }
  const prize = makeHero(reward === 'gatling'); prize.position.set(0, .2, 0); prize.scale.setScalar(1.1); g.add(prize);
  const plateC = document.createElement('canvas'); plateC.width = 256; plateC.height = 96;
  const plateTex = new THREE.CanvasTexture(plateC); plateTex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(2.1, .8, .3), [lam('#3d4554'), lam('#3d4554'), lam('#5c6677'), lam('#3d4554'), new THREE.MeshBasicMaterial({ map: plateTex }), lam('#3d4554')]);
  plate.position.set(0, .45, 1.15); plate.rotation.x = -.35; plate.castShadow = true; g.add(plate);
  g.userData = { balls, prize, plateC, plateTex, shown: null };
  return g;
}
export function setPlate(pile, n) {
  const u = pile.userData, txt = String(Math.max(0, Math.ceil(n)));
  if (u.shown === txt) return;
  u.shown = txt;
  const g = u.plateC.getContext('2d'), W = u.plateC.width, H = u.plateC.height;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6f7a8b'); gr.addColorStop(1, '#4a5363');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  strokeText(g, txt, W / 2, H / 2 + 3, 70, '#ffffff', '#262c38', .16);
  u.plateTex.needsUpdate = true;
}

// ---------- ladrilhos das esteiras ----------
export function makeTiles(top, side, label, max) {
  const tex = canvasTex(256, 160, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.12, top); gr.addColorStop(1, top);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgb(0 0 0 / .15)'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
    strokeText(g, label, W / 2, H / 2 + 4, 92, '#ffffff', side, .2);
  });
  const sideM = lam(side), topM = new THREE.MeshLambertMaterial({ map: tex });
  const geo = new THREE.BoxGeometry(LW * BELT_W * .9, .36, 1.3);
  const mesh = new THREE.InstancedMesh(geo, [sideM, sideM, topM, sideM, sideM, sideM], max);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
  scene.add(mesh);
  return mesh;
}

// ---------- chefão ----------
export function makeBoss() {
  const g = new THREE.Group(), mats = [];
  const red = phong('#d91f27', { shininess: 70 }), redDark = phong('#7c0b12'), dark = phong('#2a2a33'), silver = phong('#dfe6ef', { shininess: 120 }), gold = phong('#ffcc33', { shininess: 120 });
  mats.push(red, redDark, dark, silver, gold);
  const legs = [];
  for (const d of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(d * .55, 1.2, 0);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, 1.1, 10), redDark); l.position.y = -.55;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.55, .35, .8), dark); boot.position.set(0, -1.05, -.12);
    leg.add(l, boot); legs.push(leg); g.add(leg);
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), red); body.scale.set(1.15, 1.05, .9); body.position.y = 2.1; g.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(1.02, .12, 8, 24), dark); belt.rotation.x = Math.PI / 2; belt.position.y = 1.55; belt.scale.set(1.05, .85, 1); g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(.32, .26, .12), gold); buckle.position.set(0, 1.55, -.88); g.add(buckle);
  const spike = new THREE.ConeGeometry(.13, .5, 8);
  for (const d of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.58, 16, 12), red); sh.position.set(d * 1.12, 2.75, 0); g.add(sh);
    for (const [ax, ay, az] of [[0, 1, 0], [d * .7, .7, 0], [d * .5, .6, -.6], [d * .5, .6, .6]]) {
      const s = new THREE.Mesh(spike, dark); const v = new THREE.Vector3(ax, ay, az).normalize();
      s.position.set(d * 1.12 + v.x * .58, 2.75 + v.y * .58, v.z * .58);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); g.add(s);
    }
  }
  // cabeça: capacete prateado com viseira, olhos vermelhos e sorrisão
  const head = new THREE.Group(); head.position.y = 3.45; g.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.68, 18, 14), silver); helm.scale.set(1, 1.08, 1); head.add(helm);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.05, .42, .3), dark); visor.position.set(0, -.02, -.55); head.add(visor);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
  for (const d of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), eyeMat); e.scale.set(1.4, .8, .5); e.position.set(d * .22, .04, -.71); head.add(e); }
  const grin = new THREE.Mesh(new THREE.BoxGeometry(.5, .07, .1), new THREE.MeshBasicMaterial({ color: '#ffffff' })); grin.position.set(0, -.15, -.7); head.add(grin);
  const plume = new THREE.Mesh(new THREE.ConeGeometry(.16, .8, 8), red); plume.position.set(0, .82, .15); plume.rotation.x = .5; head.add(plume);
  for (const x of [-.32, -.11, .11, .32]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.06, .2, .05), dark); sl.position.set(x, .35, -.6); head.add(sl); }
  // escudo com espinhos
  const shield = new THREE.Group(); shield.position.set(-1.55, 2.0, -.35); shield.rotation.y = .35; g.add(shield);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .2, 24), red); disc.rotation.x = Math.PI / 2; shield.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.95, .08, 8, 24), dark); rim.position.z = -.05; shield.add(rim);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), gold); boss.position.z = -.15; shield.add(boss);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, s = new THREE.Mesh(spike, dark), v = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    s.position.set(v.x * .95, v.y * .95, -.05); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); shield.add(s);
  }
  // braço com a lança listrada
  const arm = new THREE.Group(); arm.position.set(1.35, 2.35, -.1); g.add(arm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 10), red); arm.add(hand);
  const stripes = canvasTex(64, 256, (c, W, H) => { c.fillStyle = '#eef2f7'; c.fillRect(0, 0, W, H); c.fillStyle = '#d42126'; for (let y = 0; y < H; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + 20); c.lineTo(W, y + 44); c.lineTo(0, y + 24); c.fill(); } });
  const lanceMat = phong('#ffffff', { map: stripes, shininess: 90 }); mats.push(lanceMat);
  const lance = new THREE.Mesh(new THREE.ConeGeometry(.32, 4.2, 16), lanceMat); lance.position.y = 2.2; arm.add(lance);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .12, 16), dark); guard.position.y = .15; arm.add(guard);
  arm.rotation.x = -.35; arm.rotation.z = -.25;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.rotation.y = Math.PI;   // de frente pros canhões
  const root = new THREE.Group(); root.add(g);
  root.userData = { mats, legs, arm, head, body, inner: g };
  return root;
}
