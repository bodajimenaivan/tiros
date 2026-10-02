// Efectos visuales: partículas, disparos láser, explosiones, relámpagos, escudos y clima.
import * as THREE from 'three';
import { glowSprite, smokeSprite, ringSprite, flareSprite } from './textures';

interface PSOpts {
  max: number;
  additive: boolean;
  texture: THREE.Texture;
  softness?: number;
}

/** Sistema de partículas CPU con quads instanciados orientados a cámara */
export class ParticleSystem {
  readonly max: number;
  count = 0;
  private px: Float32Array; private py: Float32Array; private pz: Float32Array;
  private vx: Float32Array; private vy: Float32Array; private vz: Float32Array;
  private life: Float32Array; private maxLife: Float32Array;
  private s0: Float32Array; private s1: Float32Array;
  private cr: Float32Array; private cg: Float32Array; private cb: Float32Array; private a0: Float32Array;
  private rot: Float32Array; private rotV: Float32Array; private drag: Float32Array; private grav: Float32Array;
  private stretch: Float32Array;
  private iPos: THREE.InstancedBufferAttribute;
  private iSize: THREE.InstancedBufferAttribute;
  private iCol: THREE.InstancedBufferAttribute;
  private iRot: THREE.InstancedBufferAttribute;
  private iVel: THREE.InstancedBufferAttribute;
  mesh: THREE.Mesh;

  constructor(o: PSOpts) {
    const n = (this.max = o.max);
    const f = () => new Float32Array(n);
    this.px = f(); this.py = f(); this.pz = f(); this.vx = f(); this.vy = f(); this.vz = f();
    this.life = f(); this.maxLife = f(); this.s0 = f(); this.s1 = f(); this.cr = f(); this.cg = f(); this.cb = f(); this.a0 = f();
    this.rot = f(); this.rotV = f(); this.drag = f(); this.grav = f(); this.stretch = f();
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute('position', quad.getAttribute('position'));
    geo.setAttribute('uv', quad.getAttribute('uv'));
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.iSize = new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iRot = new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.iVel = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos);
    geo.setAttribute('iSize', this.iSize);
    geo.setAttribute('iCol', this.iCol);
    geo.setAttribute('iRot', this.iRot);
    geo.setAttribute('iVel', this.iVel);
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: o.texture } },
      vertexShader: `
        attribute vec3 iPos; attribute float iSize; attribute vec4 iCol; attribute float iRot; attribute vec4 iVel;
        varying vec2 vUv; varying vec4 vCol;
        void main() {
          vUv = uv; vCol = iCol;
          vec4 mv = viewMatrix * vec4(iPos, 1.0);
          vec2 p = position.xy;
          if (iVel.w > 0.0) {
            // partícula estirada en la dirección de la velocidad (en pantalla)
            vec3 vv = (viewMatrix * vec4(iVel.xyz, 0.0)).xyz;
            vec2 dir = normalize(vv.xy + vec2(1e-5));
            vec2 nrm = vec2(-dir.y, dir.x);
            p = dir * position.y * (1.0 + iVel.w) + nrm * position.x;
          } else {
            float c = cos(iRot), s = sin(iRot);
            p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
          }
          mv.xy += p * iSize;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
        void main() {
          vec4 t = texture2D(map, vUv);
          gl_FragColor = vec4(vCol.rgb * t.rgb, vCol.a * t.a);
          if (gl_FragColor.a < 0.003) discard;
        }`,
      transparent: true,
      depthWrite: false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.additive ? 10 : 9;
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, s0: number, s1: number, r: number, g: number, b: number, a: number, opts?: { drag?: number; grav?: number; rotV?: number; stretch?: number }) {
    if (this.count >= this.max) return;
    const i = this.count++;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = 0; this.maxLife[i] = life;
    this.s0[i] = s0; this.s1[i] = s1;
    this.cr[i] = r; this.cg[i] = g; this.cb[i] = b; this.a0[i] = a;
    this.rot[i] = Math.random() * 6.28;
    this.rotV[i] = opts?.rotV ?? (Math.random() - 0.5) * 1.5;
    this.drag[i] = opts?.drag ?? 1.5;
    this.grav[i] = opts?.grav ?? 0;
    this.stretch[i] = opts?.stretch ?? 0;
  }

  update(dt: number) {
    let n = this.count;
    const P = this.iPos.array as Float32Array, S = this.iSize.array as Float32Array, Cc = this.iCol.array as Float32Array, R = this.iRot.array as Float32Array, V = this.iVel.array as Float32Array;
    for (let i = 0; i < n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        // eliminar intercambiando con el último
        n--;
        this.move(n, i);
        i--;
        continue;
      }
      const d = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= d; this.vy[i] *= d; this.vz[i] *= d;
      this.vy[i] -= this.grav[i] * dt;
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
      this.rot[i] += this.rotV[i] * dt;
    }
    this.count = n;
    for (let i = 0; i < n; i++) {
      const k = this.life[i] / this.maxLife[i];
      P[i * 3] = this.px[i]; P[i * 3 + 1] = this.py[i]; P[i * 3 + 2] = this.pz[i];
      S[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      const fade = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
      Cc[i * 4] = this.cr[i]; Cc[i * 4 + 1] = this.cg[i]; Cc[i * 4 + 2] = this.cb[i]; Cc[i * 4 + 3] = this.a0[i] * Math.max(0, fade);
      R[i] = this.rot[i];
      V[i * 4] = this.vx[i]; V[i * 4 + 1] = this.vy[i]; V[i * 4 + 2] = this.vz[i]; V[i * 4 + 3] = this.stretch[i];
    }
    (this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = n;
    this.iPos.needsUpdate = this.iSize.needsUpdate = this.iCol.needsUpdate = this.iRot.needsUpdate = this.iVel.needsUpdate = true;
  }

  private move(from: number, to: number) {
    const arrs = [this.px, this.py, this.pz, this.vx, this.vy, this.vz, this.life, this.maxLife, this.s0, this.s1, this.cr, this.cg, this.cb, this.a0, this.rot, this.rotV, this.drag, this.grav, this.stretch];
    for (const a of arrs) a[to] = a[from];
  }
}

const tmpC = new THREE.Color();

export class Effects {
  scene: THREE.Scene;
  add: ParticleSystem;
  alpha: ParticleSystem;
  flares: ParticleSystem;
  rings: ParticleSystem;
  bolts: THREE.InstancedMesh;
  balls: THREE.InstancedMesh;
  lights: { light: THREE.PointLight; life: number; max: number; i0: number }[] = [];
  lightning: THREE.LineSegments;
  private lightningSegs: { pts: number[]; life: number; color: THREE.Color }[] = [];
  shieldGroup: THREE.Group;
  shieldMat: THREE.ShaderMaterial;
  private shields: THREE.Mesh[] = [];
  private shieldUsed = 0;
  private boltCount = 0;
  private ballCount = 0;
  weather: { kind: 'snow' | 'ash' | 'dust' | 'rain' | 'none'; acc: number } = { kind: 'none', acc: 0 };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const glow = glowSprite();
    this.add = new ParticleSystem({ max: 6000, additive: true, texture: glow });
    this.alpha = new ParticleSystem({ max: 4000, additive: false, texture: smokeSprite() });
    this.flares = new ParticleSystem({ max: 400, additive: true, texture: flareSprite() });
    this.rings = new ParticleSystem({ max: 200, additive: true, texture: ringSprite() });
    scene.add(this.alpha.mesh, this.add.mesh, this.flares.mesh, this.rings.mesh);

    // disparos láser: cápsula alargada brillante
    const bg = new THREE.CylinderGeometry(0.03, 0.03, 1, 6, 1);
    bg.rotateZ(-Math.PI / 2); // a lo largo de X
    const bm = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.bolts = new THREE.InstancedMesh(bg, bm, 2048);
    this.bolts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(2048 * 3), 3);
    this.bolts.frustumCulled = false;
    this.bolts.count = 0;
    scene.add(this.bolts);
    const sg = new THREE.SphereGeometry(0.09, 8, 6);
    this.balls = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 512);
    this.balls.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(512 * 3), 3);
    this.balls.frustumCulled = false;
    this.balls.count = 0;
    scene.add(this.balls);

    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 12, 1.6);
      l.castShadow = false;
      scene.add(l);
      this.lights.push({ light: l, life: 0, max: 1, i0: 0 });
    }

    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4000 * 3), 3));
    lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(4000 * 3), 3));
    this.lightning = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.lightning.frustumCulled = false;
    scene.add(this.lightning);

    this.shieldGroup = new THREE.Group();
    scene.add(this.shieldGroup);
    this.shieldMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vN; varying vec3 vView; varying vec3 vW;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uTime; varying vec3 vN; varying vec3 vView; varying vec3 vW;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), vView)), 2.5);
          float hex = 0.5 + 0.5 * sin(vW.x * 6.0 + uTime) * sin(vW.z * 6.0 - uTime * 0.7) * sin(vW.y * 6.0);
          float a = f * 0.55 + hex * 0.05;
          gl_FragColor = vec4(vec3(0.35, 0.75, 1.0) * (0.6 + f * 1.4), a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }

  // ───────── disparos ─────────
  beginProjectiles() {
    this.boltCount = 0;
    this.ballCount = 0;
  }

  private mtx = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private sc = new THREE.Vector3();
  private xAxis = new THREE.Vector3(1, 0, 0);

  bolt(x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number, width: number, color: number, intensity = 4) {
    if (this.boltCount >= 2048) return;
    this.v1.set(dx, dy, dz);
    const l = this.v1.length();
    if (l < 1e-5) return;
    this.v1.divideScalar(l);
    this.q.setFromUnitVectors(this.xAxis, this.v1);
    this.sc.set(len, width, width);
    this.v2.set(x, y, z);
    this.mtx.compose(this.v2, this.q, this.sc);
    this.bolts.setMatrixAt(this.boltCount, this.mtx);
    tmpC.setHex(color).multiplyScalar(intensity);
    this.bolts.setColorAt(this.boltCount, tmpC);
    this.boltCount++;
  }

  ball(x: number, y: number, z: number, scale: number, color: number, intensity = 3) {
    if (this.ballCount >= 512) return;
    this.v2.set(x, y, z);
    this.q.identity();
    this.sc.set(scale, scale, scale);
    this.mtx.compose(this.v2, this.q, this.sc);
    this.balls.setMatrixAt(this.ballCount, this.mtx);
    tmpC.setHex(color).multiplyScalar(intensity);
    this.balls.setColorAt(this.ballCount, tmpC);
    this.ballCount++;
  }

  endProjectiles() {
    this.bolts.count = this.boltCount;
    this.bolts.instanceMatrix.needsUpdate = true;
    if (this.bolts.instanceColor) this.bolts.instanceColor.needsUpdate = true;
    this.balls.count = this.ballCount;
    this.balls.instanceMatrix.needsUpdate = true;
    if (this.balls.instanceColor) this.balls.instanceColor.needsUpdate = true;
  }

  // ───────── luces ─────────
  flashLight(x: number, y: number, z: number, color: number, intensity: number, life: number) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.life >= l.max) {
      best = l;
      break;
    }
    best.light.position.set(x, y, z);
    best.light.color.setHex(color);
    best.i0 = intensity;
    best.light.intensity = intensity;
    best.life = 0;
    best.max = life;
  }

  // ───────── efectos compuestos ─────────
  muzzle(x: number, y: number, z: number, color: number) {
    tmpC.setHex(color);
    this.add.spawn(x, y, z, 0, 0, 0, 0.09, 0.35, 0.15, tmpC.r * 2, tmpC.g * 2, tmpC.b * 2, 1);
  }

  sparks(x: number, y: number, z: number, color: number, n: number, speed = 3) {
    tmpC.setHex(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.add.spawn(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, 0.2 + Math.random() * 0.25, 0.08, 0.02, tmpC.r * 2.2, tmpC.g * 2.2, tmpC.b * 2.2, 1, { drag: 3, grav: 6, stretch: 2 });
    }
    this.add.spawn(x, y, z, 0, 0, 0, 0.12, 0.45, 0.2, tmpC.r * 1.6, tmpC.g * 1.6, tmpC.b * 1.6, 0.9);
  }

  explosion(x: number, y: number, z: number, size: number, opts: { debris?: boolean; ring?: boolean; light?: boolean; color?: number } = {}) {
    const s = size;
    const n = Math.round(10 + s * 14);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * s * 0.6;
      const up = Math.random() * 2.5 * s;
      const hot = Math.random();
      this.add.spawn(x + Math.cos(a) * r * 0.4, y + Math.random() * 0.3 * s, z + Math.sin(a) * r * 0.4, Math.cos(a) * r * 3, up, Math.sin(a) * r * 3,
        0.35 + Math.random() * 0.45, 0.4 * s + 0.2, 1.4 * s + 0.4, 2.6, 1.0 + hot * 0.8, 0.25 + hot * 0.2, 1, { drag: 2.5 });
    }
    // núcleo brillante
    this.add.spawn(x, y + 0.2, z, 0, 0.3, 0, 0.25, 0.6 * s + 0.3, 2.2 * s + 0.5, 3, 2.4, 1.4, 1);
    this.flares.spawn(x, y + 0.3, z, 0, 0, 0, 0.18, 1.8 * s + 0.6, 2.8 * s + 0.8, 2.5, 2.0, 1.4, 0.9, { rotV: 0 });
    // humo
    const m = Math.round(6 + s * 8);
    for (let i = 0; i < m; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * s * 0.8;
      const g = 0.12 + Math.random() * 0.12;
      this.alpha.spawn(x + Math.cos(a) * r * 0.5, y + 0.3 + Math.random() * s * 0.5, z + Math.sin(a) * r * 0.5, Math.cos(a) * r * 1.2, 0.6 + Math.random() * 1.2 * s, Math.sin(a) * r * 1.2,
        1.5 + Math.random() * 1.8, 0.6 * s + 0.4, 2.4 * s + 0.8, g, g * 0.95, g * 0.9, 0.75, { drag: 1.2, grav: -0.15 });
    }
    // chispas / restos
    if (opts.debris !== false) {
      for (let i = 0; i < 8 + s * 8; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5 * Math.sqrt(s);
        this.add.spawn(x, y + 0.2, z, Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp, 0.5 + Math.random() * 0.6, 0.09, 0.03, 2.6, 1.6, 0.6, 1, { drag: 0.8, grav: 12, stretch: 2.5 });
      }
    }
    if (opts.ring !== false && s > 0.7) this.rings.spawn(x, y + 0.15, z, 0, 0, 0, 0.45, 0.5, 4 * s, 1.8, 1.4, 1.0, 0.7, { rotV: 0 });
    if (opts.light !== false) this.flashLight(x, y + 1, z, 0xff8a3a, 6 + s * 10, 0.5 + s * 0.2);
  }

  smokePuff(x: number, y: number, z: number, dark: number, size: number) {
    const g = dark;
    this.alpha.spawn(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 2.5 + Math.random(), size * 0.5, size * 2.2, g, g, g, 0.55, { drag: 0.6, grav: -0.1 });
  }

  fire(x: number, y: number, z: number, size: number) {
    this.add.spawn(x + (Math.random() - 0.5) * size * 0.6, y, z + (Math.random() - 0.5) * size * 0.6, 0, 1.2 + Math.random(), 0, 0.4 + Math.random() * 0.3, size * 0.5, size * 0.15, 2.4, 1.1, 0.3, 0.9, { drag: 1 });
  }

  ring(x: number, y: number, z: number, r: number, color: number, life = 0.5) {
    tmpC.setHex(color);
    this.rings.spawn(x, y + 0.1, z, 0, 0, 0, life, 0.3, r * 2.2, tmpC.r * 1.8, tmpC.g * 1.8, tmpC.b * 1.8, 0.9, { rotV: 0 });
  }

  sparkle(x: number, y: number, z: number, color: number, n: number, radius: number) {
    tmpC.setHex(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      this.add.spawn(x + Math.cos(a) * r, y + Math.random() * 0.8, z + Math.sin(a) * r, 0, 0.8 + Math.random(), 0, 0.6 + Math.random() * 0.5, 0.12, 0.04, tmpC.r * 2, tmpC.g * 2, tmpC.b * 2, 1, { drag: 1 });
    }
  }

  dust(x: number, y: number, z: number, color: number, n: number, radius: number) {
    tmpC.setHex(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.alpha.spawn(x + Math.cos(a) * radius * 0.3, y + 0.1, z + Math.sin(a) * radius * 0.3, Math.cos(a) * radius * 2, 0.3 + Math.random() * 0.5, Math.sin(a) * radius * 2, 0.8 + Math.random() * 0.6, 0.3, 1.2, tmpC.r, tmpC.g, tmpC.b, 0.5, { drag: 2.5 });
    }
  }

  addLightning(pts: number[], color = 0x9ad8ff) {
    // crear zigzag entre puntos consecutivos
    this.lightningSegs.push({ pts, life: 0.35, color: new THREE.Color(color) });
  }

  // ───────── escudos ─────────
  beginShields() {
    this.shieldUsed = 0;
  }
  shield(x: number, y: number, z: number, r: number) {
    let m = this.shields[this.shieldUsed];
    if (!m) {
      m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), this.shieldMat);
      m.renderOrder = 8;
      this.shieldGroup.add(m);
      this.shields.push(m);
    }
    m.visible = true;
    m.position.set(x, y, z);
    m.scale.set(r, r * 0.75, r);
    this.shieldUsed++;
  }
  endShields() {
    for (let i = this.shieldUsed; i < this.shields.length; i++) this.shields[i].visible = false;
  }

  // ───────── clima ─────────
  setWeather(kind: 'snow' | 'ash' | 'dust' | 'rain' | 'none') {
    this.weather.kind = kind;
  }

  updateWeather(dt: number, cx: number, cz: number, span: number, groundY: number) {
    const k = this.weather.kind;
    if (k === 'none') return;
    const rate = k === 'rain' ? 260 : k === 'snow' ? 120 : k === 'ash' ? 70 : 30;
    this.weather.acc += dt * rate;
    while (this.weather.acc > 1) {
      this.weather.acc -= 1;
      const x = cx + (Math.random() - 0.5) * span * 2, z = cz + (Math.random() - 0.5) * span * 1.6;
      const y = groundY + 6 + Math.random() * 6;
      if (k === 'snow') this.alpha.spawn(x, y, z, 0.3, -1.2, 0.1, 6, 0.08, 0.08, 1, 1, 1, 0.85, { drag: 0, rotV: 0 });
      else if (k === 'ash') this.add.spawn(x, y, z, 0.2, -0.6, 0.2, 7, 0.06, 0.04, 1.2, 0.4, 0.1, 0.8, { drag: 0, rotV: 0 });
      else if (k === 'rain') this.add.spawn(x, y, z, 0.6, -14, 0.2, 0.8, 0.025, 0.025, 0.35, 0.4, 0.5, 0.5, { drag: 0, stretch: 8, rotV: 0 });
      else this.alpha.spawn(x, groundY + 0.5 + Math.random() * 1.5, z, 2.5, 0.1, 0.8, 3, 0.6, 1.8, 0.85, 0.72, 0.55, 0.12, { drag: 0, rotV: 0.3 });
    }
  }

  update(dt: number, time: number) {
    this.add.update(dt);
    this.alpha.update(dt);
    this.flares.update(dt);
    this.rings.update(dt);
    for (const l of this.lights) {
      if (l.life < l.max) {
        l.life += dt;
        l.light.intensity = l.i0 * Math.max(0, 1 - l.life / l.max);
      } else l.light.intensity = 0;
    }
    this.shieldMat.uniforms.uTime.value = time;
    // relámpagos
    const pos = this.lightning.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = this.lightning.geometry.getAttribute('color') as THREE.BufferAttribute;
    let v = 0;
    const max = 3990;
    this.lightningSegs = this.lightningSegs.filter((s) => (s.life -= dt) > 0);
    for (const s of this.lightningSegs) {
      const f = Math.min(1, s.life / 0.15) * (0.6 + Math.random() * 0.8);
      for (let i = 0; i + 5 < s.pts.length; i += 3) {
        // sistema sim -> render: x, y(map) -> x, z ; z -> y
        const ax = s.pts[i], az = s.pts[i + 1], ay = s.pts[i + 2];
        const bx = s.pts[i + 3], bz = s.pts[i + 4], by = s.pts[i + 5];
        const steps = 8;
        let px = ax, py = ay, pz = az;
        for (let k = 1; k <= steps && v < max; k++) {
          const t = k / steps;
          const jit = k === steps ? 0 : 0.25;
          const nx = ax + (bx - ax) * t + (Math.random() - 0.5) * jit;
          const ny = ay + (by - ay) * t + (Math.random() - 0.5) * jit;
          const nz = az + (bz - az) * t + (Math.random() - 0.5) * jit;
          pos.setXYZ(v, px, py, pz);
          col.setXYZ(v, s.color.r * 3 * f, s.color.g * 3 * f, s.color.b * 3 * f);
          v++;
          pos.setXYZ(v, nx, ny, nz);
          col.setXYZ(v, s.color.r * 3 * f, s.color.g * 3 * f, s.color.b * 3 * f);
          v++;
          px = nx; py = ny; pz = nz;
        }
      }
    }
    this.lightning.geometry.setDrawRange(0, v);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }
}
