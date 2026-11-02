// mundo 3D: renderer, câmera, luzes, neblina e o cenário fixo (neve, pinheiros, pista, muros, esteiras).
// A lógica do jogo continua em coordenadas (u, v): u de -1 a 1 entre os muros, v = 0 nos canhões e 1 lá
// no fundo. w(u, v) converte pro mundo: x = u * LW, z = -v * DEPTH.
import * as THREE from '../comum/vendor/three.module.min.js';

export const LW = 6.4, DEPTH = 40;
export const BELT_U = 1.37, BELT_W = .5, GATE_V = .22, WALL = [1, 1.1], OUTER = [1.64, 1.74];
export const wx = u => u * LW, wz = v => -v * DEPTH;

export let renderer, scene, camera;
const glCanvas = document.getElementById('gl');

export function initWorld() {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#c9def4');
  scene.fog = new THREE.Fog('#d4e4f5', 34, 78);
  camera = new THREE.PerspectiveCamera(48, 1, .5, 200);
  const hemi = new THREE.HemisphereLight('#e4efff', '#6f7f99', .95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  sun.position.set(-14, 26, 10); sun.target.position.set(0, 0, -16);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 26, bottom: -26, near: 5, far: 70 });
  sun.shadow.bias = -.0008; sun.shadow.normalBias = .02;
  scene.add(sun, sun.target);
  buildScenery();
}

export let quality = 1;   // 1 = cheio; 0 = celular fraco (menos pixels, sem sombras)
export function lowerQuality() {
  if (quality === 0) return false;
  quality = 0; renderer.shadowMap.enabled = false; renderer.setPixelRatio(Math.min(1.5, renderer.getPixelRatio()));
  scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  return true;
}
export function resizeWorld(W, H, dpr) {
  renderer.setPixelRatio(quality ? dpr : Math.min(1.5, dpr)); renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.fov = W < H ? 48 : 38;
  // câmera alta atrás dos canhões, olhando o corredor; recua até caber a largura toda (esteiras e montes)
  const look = new THREE.Vector3(0, 0, -12.5), dir = new THREE.Vector3(0, 1, .78).normalize();
  const hfov = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
  const dist = W < H ? Math.max(30, (OUTER[1] * LW + 1.2) / Math.tan(hfov / 2)) : 54;
  camera.position.copy(look).addScaledVector(dir, dist);
  camera.lookAt(look);
  camera.updateProjectionMatrix();
  scene.fog.near = dist * .85; scene.fog.far = dist * 2.4;
  baseCam.copy(camera.position); baseLook.copy(look);
}
export const baseCam = new THREE.Vector3(), baseLook = new THREE.Vector3();

// ---------- texturas desenhadas em canvas ----------
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

export const FONT = '"Arial Rounded MT Bold", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
export function strokeText(g, txt, x, y, size, fill, stroke, lw = .2) {
  g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size * lw; g.strokeStyle = stroke; g.strokeText(txt, x, y);
  g.fillStyle = fill; g.fillText(txt, x, y);
}

// ---------- cenário ----------
function buildScenery() {
  // neve com montinhos (vértices sacudidos)
  const snowGeo = new THREE.PlaneGeometry(140, 140, 70, 70);
  snowGeo.rotateX(-Math.PI / 2);
  const p = snowGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), edge = Math.max(0, Math.abs(x) - 12);
    p.setY(i, -.05 + Math.min(1, edge / 3) * (Math.sin(x * .45) * Math.cos(z * .37) * .8 + Math.sin(x * .13 + z * .21) * 1.4 + .6));
  }
  snowGeo.computeVertexNormals();
  const snow = new THREE.Mesh(snowGeo, new THREE.MeshLambertMaterial({ color: '#f4f8fd' }));
  snow.position.z = -25; snow.receiveShadow = true; scene.add(snow);

  // pista de pedra do corredor (só do portão pra frente) e chão aberto perto dos canhões
  const stone = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b9bfc9'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 200 + ((x * 7 + y * 13) % 5) * 3;
      g.fillStyle = `rgb(${v} ${v + 3} ${v + 9})`; g.fillRect(x * 64 + 1.5, y * 64 + 1.5, 61, 61);
    }
    g.fillStyle = 'rgb(255 255 255 / .18)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 8, 2);
  }, [6, 24]);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(LW * 2.2, DEPTH * 1.6), new THREE.MeshLambertMaterial({ map: stone }));
  lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0, wz(GATE_V) - DEPTH * .8); lane.receiveShadow = true; scene.add(lane);
  const openTex = stone.clone(); openTex.repeat.set(9, 5); openTex.needsUpdate = true;
  const open = new THREE.Mesh(new THREE.PlaneGeometry(wx(OUTER[1]) * 2, 22), new THREE.MeshLambertMaterial({ map: openTex, color: '#e6e9ef' }));
  open.rotation.x = -Math.PI / 2; open.position.set(0, .002, wz(GATE_V) + 11); open.receiveShadow = true; scene.add(open);

  // muros: bloco de pedra com rolo branco por cima
  const wallMat = new THREE.MeshLambertMaterial({ color: '#a8b1bf' }), capMat = new THREE.MeshLambertMaterial({ color: '#f3f6fa' });
  const wall = (x0, x1, z0, z1) => {
    const w = x1 - x0, len = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, .7, len), wallMat); b.position.set(cx, .35, cz);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(w * .55, w * .55, len, 12), capMat);
    cap.rotation.x = Math.PI / 2; cap.position.set(cx, .72, cz);
    b.castShadow = cap.castShadow = true; b.receiveShadow = cap.receiveShadow = true;
    scene.add(b, cap);
  };
  for (const d of [-1, 1]) {
    const a = [d * wx(WALL[0]), d * wx(WALL[1])].sort((m, n) => m - n), o = [d * wx(OUTER[0]), d * wx(OUTER[1])].sort((m, n) => m - n);
    wall(a[0], a[1], wz(GATE_V) - .6, -70);
    wall(o[0], o[1], 16, -70);
  }
  // esteiras: canaleta escura com roletes
  const beltMat = new THREE.MeshLambertMaterial({ color: '#3a4354' });
  for (const d of [-1, 1]) {
    const bx = d * wx(BELT_U), bw = wx(BELT_W);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.08, .16, 100), beltMat); tr.position.set(bx, .08, -34); tr.receiveShadow = true; scene.add(tr);
  }
  // pinheiros nevados (instanciados: cada parte é um desenho só pra todas as árvores)
  const spots = [];
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1, x = side * rand(13, 32), z = rand(-70, 14);
    spots.push([x, z, rand(.8, 1.5)]);
  }
  const parts = [
    [new THREE.CylinderGeometry(.18, .24, 1, 6), '#6b4a36', 0, .5],
    [new THREE.ConeGeometry(1.5, 1.9, 8), '#5f8188', 1.3, 1],
    [new THREE.ConeGeometry(1.15, 1.6, 8), '#678b92', 2.25, 1],
    [new THREE.ConeGeometry(.8, 1.3, 8), '#7097a0', 3.05, 1],
    [new THREE.ConeGeometry(.55, .8, 8), '#f6f9fc', 3.6, 1],
    [new THREE.ConeGeometry(1.2, .5, 8), '#f6f9fc', 2.05, 1],
  ];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (const [geo, color, y] of parts) {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), spots.length);
    spots.forEach(([x, z, s], i) => { m.compose(new THREE.Vector3(x, y * s, z), q, new THREE.Vector3(s, s, s)); mesh.setMatrixAt(i, m); });
    mesh.castShadow = true; scene.add(mesh);
  }
}
