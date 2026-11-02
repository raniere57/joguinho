// partículas 3D num desenho só (pontos com textura macia): fumaça da briga, neve voando, faíscas.
import * as THREE from '../comum/vendor/three.module.min.js';
import { scene } from './mundo.js';

const VERT = `
attribute float size; attribute float alpha; attribute vec3 tint;
varying float vAlpha; varying vec3 vTint;
uniform float scale;
void main() {
  vAlpha = alpha; vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map; varying float vAlpha; varying vec3 vTint;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(vTint * t.rgb, t.a * vAlpha);
  if (gl_FragColor.a < .01) discard;
}`;

function softTex(core = .25) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  gr.addColorStop(0, '#fff'); gr.addColorStop(core, 'rgb(255 255 255 / .85)'); gr.addColorStop(1, 'rgb(255 255 255 / 0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

export class Particles {
  constructor(max, { additive = false, core = .25 } = {}) {
    this.max = max; this.list = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max); this.tint = new Float32Array(max * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: softTex(core) }, scale: { value: 300 } }, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false;
    scene.add(this.points);
  }
  add(p) { if (this.list.length >= this.max) this.list.shift(); this.list.push({ vx: 0, vy: 0, vz: 0, grav: 0, grow: 0, drag: 0, life: 1, decay: 1, size: 1, color: [1, 1, 1], ...p }); }
  update(dt, viewH) {
    this.mat.uniforms.scale.value = viewH * .9;
    for (const p of this.list) {
      p.vy -= p.grav * dt; const k = Math.pow(1 - p.drag, dt * 60);
      p.vx *= k; p.vz *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0 && p.grav) { p.y = 0; p.vy *= -.3; p.vx *= .6; p.vz *= .6; }
      p.size += p.grow * dt; p.life -= p.decay * dt;
    }
    this.list = this.list.filter(p => p.life > 0);
    this.list.forEach((p, i) => {
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.size[i] = p.size; this.alpha[i] = Math.min(1, p.life * 1.6) * (p.a ?? 1);
      this.tint[i * 3] = p.color[0]; this.tint[i * 3 + 1] = p.color[1]; this.tint[i * 3 + 2] = p.color[2];
    });
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.list.length);
    for (const a of ['position', 'size', 'alpha', 'tint']) geo.attributes[a].needsUpdate = true;
  }
}
