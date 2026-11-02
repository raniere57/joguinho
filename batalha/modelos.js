// modelos 3D: soldadinhos instanciados (milhares num desenho só), canhão, metralhadora, portão,
// monte de neve com placa, ladrilhos das esteiras e o chefão cavaleiro.
import * as THREE from '../comum/vendor/three.module.min.js';
import { scene, canvasTex, strokeText, LW, BELT_W } from './mundo.js';

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const phong = (color, extra = {}) => new THREE.MeshPhongMaterial({ color, shininess: 60, specular: '#ffffff', ...extra });

// ---------- tropa: corpo + cabeça + sombrinha, instanciados ----------
export class Troop {
  constructor(max, body, head, opts = {}) {
    this.max = max; this.n = 0;
    const bodyGeo = new THREE.CylinderGeometry(.13, .17, .28, 8); bodyGeo.translate(0, .17, 0);
    const headGeo = new THREE.SphereGeometry(.14, 10, 8); headGeo.translate(0, .42, 0);
    const crestGeo = new THREE.ConeGeometry(.06, .11, 6); crestGeo.translate(0, .58, 0);
    const shGeo = new THREE.CircleGeometry(.24, 10); shGeo.rotateX(-Math.PI / 2); shGeo.translate(0, .01, 0);
    this.body = new THREE.InstancedMesh(bodyGeo, phong(body, { shininess: 25, specular: '#553333' }), max);
    this.head = new THREE.InstancedMesh(headGeo, phong(head, { shininess: 40, specular: '#664444' }), max);
    this.crest = new THREE.InstancedMesh(crestGeo, lam(opts.crest || head), max);
    this.shadow = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ color: '#334', transparent: true, opacity: .28, depthWrite: false }), max);
    for (const m of [this.body, this.head, this.crest, this.shadow]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
    this.body.castShadow = this.head.castShadow = !!opts.shadow;
    if (opts.tint) { this.color = new THREE.Color(); for (const m of [this.body, this.head]) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3); }
  }
  begin() { this.n = 0; }
  // x, z no mundo; s = escala; bob = pulinho; tint = cor multiplicada (só se a tropa aceita tinta)
  put(x, z, s = 1, bob = 0, tint) {
    if (this.n >= this.max) return;
    const i = this.n++, o = i * 16;
    for (const m of [this.body, this.head, this.crest]) {
      const a = m.instanceMatrix.array;
      a[o] = s; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0;
      a[o + 4] = 0; a[o + 5] = s; a[o + 6] = 0; a[o + 7] = 0;
      a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = s; a[o + 11] = 0;
      a[o + 12] = x; a[o + 13] = bob; a[o + 14] = z; a[o + 15] = 1;
    }
    const a = this.shadow.instanceMatrix.array;
    a[o] = s; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = s; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = 0; a[o + 14] = z; a[o + 15] = 1;
    if (tint && this.color) { this.body.instanceColor.setXYZ(i, tint[0], tint[1], tint[2]); this.head.instanceColor.setXYZ(i, tint[0], tint[1], tint[2]); }
  }
  end() {
    for (const m of [this.body, this.head, this.crest, this.shadow]) { m.count = this.n; m.instanceMatrix.needsUpdate = true; }
    if (this.color) { this.body.instanceColor.needsUpdate = true; this.head.instanceColor.needsUpdate = true; }
  }
}

// ---------- canhão ----------
const woodMat = lam('#9a6a3e'), woodDark = lam('#5a3a24'), metalBlue = phong('#3d82ea', { shininess: 90 }), metalDark = phong('#173f9a'), steel = phong('#c9d4e2', { shininess: 100 });
export function makeCannon(gat) {
  const g = new THREE.Group();
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(.9, .42, 1.1), woodMat); carriage.position.set(0, .45, .1);
  const wheelGeo = new THREE.CylinderGeometry(.38, .38, .16, 14); wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(.13, .13, .2, 8); hubGeo.rotateZ(Math.PI / 2);
  for (const d of [-1, 1]) {
    const w = new THREE.Mesh(wheelGeo, woodDark); w.position.set(d * .55, .38, .15);
    const h = new THREE.Mesh(hubGeo, steel); h.position.set(d * .6, .38, .15);
    g.add(w, h);
  }
  g.add(carriage);
  const barrels = new THREE.Group(); barrels.position.set(0, .75, 0); barrels.rotation.x = -.45;   // canos apontando pra frente e pra cima
  if (!gat) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.27, .33, 1.5, 16), metalBlue); b.rotation.x = -Math.PI / 2; b.position.z = -.45;
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(.29, .07, 8, 16), metalDark); muzzle.position.z = -1.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.33, .05, 6, 16), metalDark); ring.position.z = -.2;
    const back = new THREE.Mesh(new THREE.SphereGeometry(.33, 12, 8), metalBlue); back.position.z = .3;
    barrels.add(b, muzzle, ring, back);
  } else {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, b = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.7, 10), metalBlue);
      b.rotation.x = -Math.PI / 2; b.position.set(Math.cos(a) * .22, Math.sin(a) * .22, -.5); barrels.add(b);
    }
    for (const z of [-.2, -1.1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .14, 16), steel); r.rotation.x = Math.PI / 2; r.position.z = z; barrels.add(r); }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 8), metalDark); hub.position.z = .35; barrels.add(hub);
  }
  g.add(barrels); g.userData.barrels = barrels;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

// ---------- portão ----------
export function makeGate(label) {
  const g = new THREE.Group(), w = LW * 2, h = 2;
  const mat = new THREE.MeshPhongMaterial({ color: '#8b3dff', emissive: '#4a0fb0', emissiveIntensity: .55, shininess: 80 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.1), mat); slab.position.y = h / 2; slab.castShadow = true; g.add(slab);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, .1, 1.12), new THREE.MeshBasicMaterial({ color: '#b98cff' })); top.position.y = h + .02; g.add(top);
  const tex = canvasTex(512, 128, (c, W, H) => strokeText(c, label, W / 2, H / 2 + 4, 104, '#ffffff', '#3a0a7a', .22));
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
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
  const prize = makeCannon(reward === 'gatling'); prize.position.set(0, .2, 0); prize.scale.setScalar(1.25); g.add(prize);
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
