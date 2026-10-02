// Cobertura del suelo: hierba, juncos, matojos, flores y guijarros instanciados por bioma.
// Se mece con el viento, respeta la niebla de guerra y desaparece bajo los edificios.
import * as THREE from 'three';
import type { World } from '../sim/world';
import { T_GROUND, T_ALT, T_LOW, T_SHALLOW } from '../sim/map';
import { sharedUniforms } from './materials';
import { Noise2D } from '../core/noise';
import { RNG } from '../core/rng';

type CoverKind = 'grass' | 'tall' | 'tuft' | 'reed' | 'flower' | 'pebble' | 'shroom';

interface CoverLayer {
  kind: CoverKind;
  density: number; // instancias por tile
  colA: number;
  colB: number;
  size: number;
  patch?: number; // 0..1: cuánto se agrupa en manchas
  onLow?: boolean; // también en zonas bajas/orillas
}

const BIOME_COVER: Record<string, CoverLayer[]> = {
  forest: [
    { kind: 'grass', density: 1.5, colA: 0x2f5a1e, colB: 0x5c8a2e, size: 1, patch: 0.4 },
    { kind: 'tall', density: 0.25, colA: 0x355f22, colB: 0x6a9a3a, size: 1.1, patch: 0.7 },
    { kind: 'pebble', density: 0.05, colA: 0x5a5a50, colB: 0x7a786a, size: 1 },
  ],
  grassland: [
    { kind: 'grass', density: 2.1, colA: 0x4a8a2c, colB: 0x8ab84a, size: 1, patch: 0.35 },
    { kind: 'flower', density: 0.12, colA: 0xf0d040, colB: 0xe86aa0, size: 1, patch: 0.85 },
  ],
  jungle: [
    { kind: 'tall', density: 0.9, colA: 0x2a5a1c, colB: 0x5a9a30, size: 1.15, patch: 0.5 },
    { kind: 'grass', density: 0.9, colA: 0x2f6a22, colB: 0x6aa83a, size: 1, patch: 0.3 },
  ],
  tropical: [
    { kind: 'grass', density: 1.1, colA: 0x3a8a2c, colB: 0x9ac84a, size: 1, patch: 0.5 },
    { kind: 'flower', density: 0.05, colA: 0xff8a30, colB: 0xf04a6a, size: 1, patch: 0.8 },
  ],
  plains: [
    { kind: 'tall', density: 1.1, colA: 0x8a8a3a, colB: 0xc8b860, size: 1.2, patch: 0.45 },
    { kind: 'grass', density: 0.7, colA: 0x6a7a2e, colB: 0xa8a84a, size: 1, patch: 0.3 },
  ],
  swamp: [
    { kind: 'reed', density: 0.7, colA: 0x3a4a22, colB: 0x6a7a3a, size: 1.2, patch: 0.75, onLow: true },
    { kind: 'grass', density: 0.8, colA: 0x34421e, colB: 0x5a6a30, size: 1, patch: 0.4, onLow: true },
  ],
  fungal: [
    { kind: 'shroom', density: 0.35, colA: 0xe86a4a, colB: 0xf0b040, size: 1, patch: 0.75 },
    { kind: 'grass', density: 0.8, colA: 0x9a4a6a, colB: 0xd87a4a, size: 1, patch: 0.4 },
  ],
  desert: [
    { kind: 'tuft', density: 0.07, colA: 0x8a7a4a, colB: 0xb0a060, size: 1, patch: 0.6 },
    { kind: 'pebble', density: 0.16, colA: 0x9a7a52, colB: 0xc09a6a, size: 1, patch: 0.5 },
  ],
  redrock: [
    { kind: 'pebble', density: 0.28, colA: 0x7a3e26, colB: 0xa85e3a, size: 1, patch: 0.4 },
    { kind: 'tuft', density: 0.04, colA: 0x7a5a3a, colB: 0x9a7a4a, size: 0.9, patch: 0.7 },
  ],
  volcanic: [
    { kind: 'pebble', density: 0.3, colA: 0x1a1414, colB: 0x3a2a24, size: 1, patch: 0.4 },
  ],
  ice: [
    { kind: 'pebble', density: 0.08, colA: 0xb8d0e8, colB: 0xe8f4ff, size: 1.1, patch: 0.6 },
  ],
  salt: [
    { kind: 'pebble', density: 0.1, colA: 0xb8b8c0, colB: 0xf0f0f4, size: 1, patch: 0.6 },
    { kind: 'tuft', density: 0.03, colA: 0xa04a3a, colB: 0xd06a50, size: 0.8, patch: 0.8 },
  ],
  urban: [
    { kind: 'pebble', density: 0.12, colA: 0x4a4a4c, colB: 0x6a6a6e, size: 0.9, patch: 0.5 },
  ],
};

/** Geometría de una mata de hojas finas (triángulos inclinados) */
function bladeGeometry(blades: number, h: number, w: number, lean: number, spread: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + i * 0.7;
    const r = spread * (0.3 + ((i * 37) % 10) / 14);
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const hh = h * (0.7 + ((i * 53) % 10) / 25);
    const tx = bx + Math.cos(a) * lean * hh, tz = bz + Math.sin(a) * lean * hh;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, hh, tz);
    col.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15);
    for (let k = 0; k < 3; k++) nor.push(0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function flowerGeometry(): THREE.BufferGeometry {
  const stem = bladeGeometry(3, 0.28, 0.012, 0.15, 0.03);
  const head = new THREE.IcosahedronGeometry(0.06, 0);
  head.translate(0, 0.3, 0);
  const hc: number[] = [];
  for (let i = 0; i < head.attributes.position.count; i++) hc.push(1.6, 1.6, 1.6);
  head.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
  head.deleteAttribute('uv');
  // tallo verde: color fijo en el atributo (se multiplica por el color de instancia)
  return mergeSimple([stem, head]);
}

function shroomGeometry(): THREE.BufferGeometry {
  const stem = new THREE.CylinderGeometry(0.025, 0.035, 0.18, 5, 1, true).toNonIndexed();
  stem.translate(0, 0.09, 0);
  const sc: number[] = [];
  for (let i = 0; i < stem.attributes.position.count; i++) sc.push(1.4, 1.35, 1.2);
  stem.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  const cap = new THREE.SphereGeometry(0.1, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
  cap.scale(1, 0.6, 1);
  cap.translate(0, 0.17, 0);
  const cc: number[] = [];
  for (let i = 0; i < cap.attributes.position.count; i++) cc.push(1.1, 1.1, 1.1);
  cap.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  for (const g of [stem, cap]) g.deleteAttribute('uv');
  return mergeSimple([stem, cap]);
}

function pebbleGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.12, 0);
  g.scale(1.2, 0.55, 0.9);
  g.translate(0, 0.02, 0);
  g.deleteAttribute('uv');
  const c: number[] = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.75 + (p.getY(i) + 0.05) * 2.5;
    c.push(k, k, k);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

function mergeSimple(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    col.set(g.attributes.color.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

function geometryFor(kind: CoverKind): THREE.BufferGeometry {
  switch (kind) {
    case 'grass': return bladeGeometry(6, 0.3, 0.035, 0.35, 0.09);
    case 'tall': return bladeGeometry(7, 0.55, 0.04, 0.3, 0.12);
    case 'tuft': return bladeGeometry(9, 0.32, 0.025, 0.7, 0.05);
    case 'reed': return bladeGeometry(5, 0.8, 0.03, 0.12, 0.1);
    case 'flower': return flowerGeometry();
    case 'shroom': return shroomGeometry();
    case 'pebble': return pebbleGeometry();
  }
}

export class GroundCover {
  group = new THREE.Group();
  private w: World;
  private occData: Uint8Array;
  private occTex: THREE.DataTexture;
  private lastVersion = -1;
  private lastBuildingCount = -1;
  private materials: THREE.Material[] = [];

  constructor(w: World, fogTex: THREE.Texture, quality: 'low' | 'medium' | 'high' | 'ultra') {
    this.w = w;
    const N = w.map.w;
    this.occData = new Uint8Array(N * N);
    this.occTex = new THREE.DataTexture(this.occData, N, N, THREE.RedFormat);
    this.occTex.magFilter = THREE.NearestFilter;
    this.occTex.minFilter = THREE.NearestFilter;
    this.occTex.needsUpdate = true;
    const layers = BIOME_COVER[w.planet.biome] ?? BIOME_COVER.grassland;
    const qMul = quality === 'low' ? 0 : quality === 'medium' ? 0.55 : quality === 'high' ? 1 : 1.35;
    if (qMul <= 0) return;
    const rng = new RNG(w.setup.seed ^ 0x5eed);
    const noise = new Noise2D(w.setup.seed + 77);
    const m = w.map;
    const maxTotal = 60000;
    for (const L of layers) {
      const sway = L.kind !== 'pebble' && L.kind !== 'shroom';
      let count = Math.round(N * N * L.density * qMul);
      count = Math.min(count, Math.round(maxTotal * (L.density / layers.reduce((a, l) => a + l.density, 0))));
      if (count < 10) continue;
      const geo = geometryFor(L.kind);
      const mat = this.makeMaterial(fogTex, sway, L.kind === 'pebble' ? 0.95 : 0.8);
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      const ca = new THREE.Color(L.colA), cb = new THREE.Color(L.colB), c = new THREE.Color();
      const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      let placed = 0;
      const nScale = 0.06 + (L.patch ?? 0) * 0.04;
      for (let tries = 0; tries < count * 4 && placed < count; tries++) {
        const x = rng.range(1, N - 1), y = rng.range(1, N - 1);
        const t = m.terrain[Math.floor(y) * N + Math.floor(x)];
        if (!(t === T_GROUND || t === T_ALT || (L.onLow && (t === T_LOW || t === T_SHALLOW)) || (t === T_LOW && L.kind !== 'reed'))) continue;
        if (t === T_SHALLOW && L.kind !== 'reed') continue;
        if (m.slope && m.slope(Math.floor(x), Math.floor(y)) > 0.9) continue;
        const patch = L.patch ?? 0;
        if (patch > 0) {
          const nv = noise.fbm(x * nScale, y * nScale, 3) * 0.5 + 0.5;
          const k = Math.max(0, Math.min(1, (nv - 0.38) / 0.24));
          if (rng.next() > 1 - patch + patch * k * k) continue;
        }
        const h = m.heightAt(x, y);
        if (m.waterLevel > -50 && h < m.waterLevel - 0.05 && L.kind !== 'reed') continue;
        q.setFromAxisAngle(up, rng.next() * Math.PI * 2);
        const sc = L.size * (0.7 + rng.next() * 0.6);
        s.set(sc, sc * (0.8 + rng.next() * 0.5), sc);
        p.set(x, h - 0.02, y);
        mtx.compose(p, q, s);
        mesh.setMatrixAt(placed, mtx);
        c.copy(ca).lerp(cb, rng.next());
        mesh.setColorAt(placed, c);
        placed++;
      }
      mesh.count = placed;
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.renderOrder = 1;
      this.group.add(mesh);
    }
    this.update();
  }

  private makeMaterial(fogTex: THREE.Texture, sway: boolean, rough: number): THREE.Material {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    void rough;
    const occTex = this.occTex;
    const N = this.w.map.w;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sharedUniforms.uTime;
      shader.uniforms.tFog = { value: fogTex };
      shader.uniforms.tOcc = { value: occTex };
      shader.uniforms.uN = { value: N };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTime; uniform sampler2D tFog; uniform sampler2D tOcc; uniform float uN;
          varying float vFogK;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 ipos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec2 fuv = clamp(ipos.xz, 0.5, uN - 0.5) / uN;
          vec4 fg = texture2D(tFog, fuv);
          vFogK = mix(mix(0.0, 0.42, fg.g), 1.0, fg.r);
          float occ = texture2D(tOcc, ipos.xz / uN).r;
          if (occ > 0.5) transformed *= 0.0;
          ${sway ? `float sw = transformed.y * transformed.y * 0.9;
          transformed.x += sin(uTime * 1.7 + ipos.x * 0.45 + ipos.z * 0.2) * sw * 0.35;
          transformed.z += cos(uTime * 1.3 + ipos.z * 0.4 + ipos.x * 0.15) * sw * 0.25;` : ''}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying float vFogK;`)
        .replace('#include <dithering_fragment>', `gl_FragColor.rgb *= vFogK;
          #include <dithering_fragment>`);
    };
    mat.customProgramCacheKey = () => 'swCover' + (sway ? 1 : 0);
    this.materials.push(mat);
    return mat;
  }

  /** Oculta la cobertura bajo edificios (se recalcula cuando cambia el mapa) */
  update() {
    const w = this.w;
    if (!this.group.children.length) return;
    const n = w.buildings.length;
    if (w.map.version === this.lastVersion && n === this.lastBuildingCount) return;
    this.lastVersion = w.map.version;
    this.lastBuildingCount = n;
    const N = w.map.w;
    const d = this.occData;
    d.fill(0);
    for (const b of w.buildings) {
      if (!b.alive) continue;
      const sz = b.size;
      for (let y = b.ty; y < b.ty + sz; y++) for (let x = b.tx; x < b.tx + sz; x++) if (x >= 0 && y >= 0 && x < N && y < N) d[y * N + x] = 255;
    }
    this.occTex.needsUpdate = true;
  }

  dispose() {
    for (const c of this.group.children) (c as THREE.InstancedMesh).geometry.dispose();
    for (const m of this.materials) m.dispose();
    this.occTex.dispose();
  }
}
