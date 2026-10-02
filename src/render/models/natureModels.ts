// Árboles, recursos, decoración y monumentos del paisaje para cada planeta.
import * as THREE from 'three';
import { MB, C, type ModelDef } from './builder';
import { RNG } from '../../core/rng';
import { SURF } from '../surface';

// ───────────── utilidades orgánicas ─────────────
function h3(ix: number, iy: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruido de valor 3D suave en [-1, 1] */
function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => h3(ix + dx, iy + dy, iz + dz, seed);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
/** Desplaza radialmente los vértices de una geometría centrada en el origen */
function displace(g: THREE.BufferGeometry, amp: number, freq: number, seed: number, flatBottom = -1e9) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * freq, v.y * freq, v.z * freq, seed) * 0.7 + noise3(v.x * freq * 2.3, v.y * freq * 2.3, v.z * freq * 2.3, seed + 7) * 0.3;
    v.multiplyScalar(1 + n * amp);
    if (v.y < flatBottom) v.y = flatBottom;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}
/** Esfera abultada (copas de árbol, arbustos) */
function lumpy(b: MB, r: number, x: number, y: number, z: number, color: number, seed: number, o: { sy?: number; amp?: number; seg?: number; mat?: number } = {}) {
  const seg = o.seg ?? 10;
  const g = displace(new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.65))), o.amp ?? 0.22, 1.6, seed);
  g.scale(r, r * (o.sy ?? 1), r);
  return b.mesh(g, x, y, z, color, { flat: false, mat: o.mat ?? SURF.leaves });
}
/** Roca facetada con ruido */
function rock(b: MB, r: number, x: number, y: number, z: number, color: number, seed: number, o: { sy?: number; detail?: number; mat?: number; em?: number } = {}) {
  const g = new THREE.IcosahedronGeometry(1, o.detail ?? 1);
  displace(g, 0.28, 1.3, seed, -0.35);
  g.scale(r, r * (o.sy ?? 0.75), r);
  return b.mesh(g, x, y, z, color, { mat: o.mat ?? SURF.rock, em: o.em });
}
/** Copa de árbol: racimo de bultos de follaje con variaciones de color */
function crown(b: MB, x: number, y: number, z: number, r: number, c1: number, c2: number, rng: RNG, n = 5, sy = 0.8) {
  lumpy(b, r * 0.72, x, y, z, c1, rng.int(0, 9999), { sy });
  for (let i = 0; i < n - 1; i++) {
    const a = (i / (n - 1)) * Math.PI * 2 + rng.range(0, 0.6);
    const d = r * rng.range(0.38, 0.58);
    lumpy(b, r * rng.range(0.45, 0.62), x + Math.cos(a) * d, y + rng.range(-0.25, 0.25) * r, z + Math.sin(a) * d, i % 2 ? c2 : c1, rng.int(0, 9999), { sy, seg: 9 });
  }
}
/** Tronco con raíces ensanchadas */
function trunkL(b: MB, h: number, r0: number, r1: number, color: number, lean = 0) {
  b.limb([0, -0.05, 0], [lean, h, 0], r0, r1, color, { mat: SURF.bark, seg: 9 });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.4;
    b.limb([Math.cos(a) * r0 * 0.4, r0 * 1.4, Math.sin(a) * r0 * 0.4], [Math.cos(a) * r0 * 1.9, -0.02, Math.sin(a) * r0 * 1.9], r0 * 0.38, r0 * 0.18, color, { mat: SURF.bark, seg: 6 });
  }
}
/** Capa cónica dentada de conífera */
function coniferLayer(b: MB, r: number, h: number, x: number, y: number, z: number, color: number, seed: number) {
  const g = new THREE.ConeGeometry(1, 1, 13, 3);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const rad = Math.hypot(v.x, v.z);
    if (rad > 1e-3) {
      const ang = Math.atan2(v.z, v.x);
      const j = 1 + noise3(Math.cos(ang) * 2.5, v.y * 2, Math.sin(ang) * 2.5, seed) * 0.25 + (Math.round(ang * 13 / (Math.PI * 2)) % 2 ? 0.12 : -0.06) * (0.5 - v.y);
      v.x *= j;
      v.z *= j;
      if (v.y < -0.45) v.y -= 0.12 * rad; // puntas caídas
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.scale(r, h, r);
  return b.mesh(g, x, y, z, color, { flat: false, mat: SURF.leaves });
}

export function buildTree(kind: string, variant: number, c1: number, c2: number): ModelDef {
  const b = new MB();
  const r = new RNG(variant * 977 + kind.length * 31);
  const v = (a: number, bb: number) => r.range(a, bb);
  b.part('body', 'static');
  const trunk = 0x5a3e28;
  switch (kind) {
    case 'redwood': {
      // secuoya de Endor: tronco altísimo y capas dentadas de follaje
      const h = v(3.4, 4.4);
      const tTop = h * 0.55 + 1.0;
      trunkL(b, tTop + 0.6, 0.34, 0.12, 0x6a3a22);
      b.part('leaves', 'static');
      for (let i = 0; i < 5; i++) coniferLayer(b, 1.05 - i * 0.17, 1.0, 0, h * 0.48 + i * 0.58, 0, i % 2 ? c1 : c2, r.int(0, 9999));
      break;
    }
    case 'fern_tree': {
      const h = v(1.4, 2);
      trunkL(b, h, 0.1, 0.07, trunk, v(-0.1, 0.1));
      b.part('leaves');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + v(0, 0.4);
        b.limb([0, h, 0], [Math.cos(a) * 0.8, h - 0.25, Math.sin(a) * 0.8], 0.09, 0.02, i % 2 ? c1 : c2, { mat: SURF.leaves, seg: 5, sx: 1 });
      }
      lumpy(b, 0.2, 0, h + 0.05, 0, c1, r.int(0, 999), { seg: 8 });
      break;
    }
    case 'wroshyr': {
      // wroshyr de Kashyyyk: tronco enorme y copas planas en pisos
      const h = v(3.6, 4.8);
      trunkL(b, h + 0.3, 0.42, 0.22, 0x6a4a2a);
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + v(0, 0.5);
        b.limb([0, h * (0.55 + i * 0.12), 0], [Math.cos(a) * 0.9, h * (0.62 + i * 0.12), Math.sin(a) * 0.9], 0.1, 0.05, 0x6a4a2a, { mat: SURF.bark, seg: 6 });
      }
      b.part('leaves');
      for (let i = 0; i < 3; i++) crown(b, 0, h * 0.62 + i * 0.75, 0, 1.15 - i * 0.22, i % 2 ? c1 : c2, c2, r, 5, 0.42);
      break;
    }
    case 'jungle_palm':
    case 'palm': {
      const h = v(1.8, 2.6);
      const lean = v(0.1, 0.3);
      // tronco curvado en tres tramos
      const tc = kind === 'palm' ? 0x8a6a40 : trunk;
      b.limb([0, -0.05, 0], [lean * 0.3, h * 0.4, 0], 0.12, 0.1, tc, { mat: SURF.bark, seg: 8 });
      b.limb([lean * 0.3, h * 0.4, 0], [lean * 0.7, h * 0.75, 0], 0.1, 0.085, tc, { mat: SURF.bark, seg: 8 });
      b.limb([lean * 0.7, h * 0.75, 0], [lean, h, 0], 0.085, 0.07, tc, { mat: SURF.bark, seg: 8 });
      b.part('leaves');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + v(0, 0.3);
        const mid: [number, number, number] = [lean + Math.cos(a) * 0.45, h + 0.15, Math.sin(a) * 0.45];
        b.limb([lean, h + 0.05, 0], mid, 0.035, 0.11, i % 2 ? c1 : c2, { mat: SURF.leaves, seg: 5 });
        b.limb(mid, [lean + Math.cos(a) * 1.0, h - 0.3, Math.sin(a) * 1.0], 0.11, 0.015, i % 2 ? c1 : c2, { mat: SURF.leaves, seg: 5 });
      }
      b.sphere(0.1, lean, h + 0.02, 0, 0x6a4a2a, { seg: 8, mat: SURF.bark });
      break;
    }
    case 'naboo_tree':
    case 'round_tree': {
      const h = v(1.1, 1.6);
      trunkL(b, h, 0.12, 0.07, trunk, v(-0.08, 0.08));
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + v(0, 0.6);
        b.limb([0, h * 0.7, 0], [Math.cos(a) * 0.35, h + 0.15, Math.sin(a) * 0.35], 0.05, 0.03, trunk, { mat: SURF.bark, seg: 6 });
      }
      b.part('leaves');
      crown(b, 0, h + 0.38, 0, v(0.75, 0.95), c1, c2, r, 6, 0.82);
      break;
    }
    case 'gnarltree':
    case 'swamp_tree': {
      // árbol retorcido de pantano con raíces aéreas y musgo colgante
      const h = v(1.8, 2.6);
      const pts: [number, number, number][] = [[0, -0.05, 0], [v(-0.15, 0.15), h * 0.35, v(-0.15, 0.15)], [v(-0.25, 0.25), h * 0.7, v(-0.25, 0.25)], [v(-0.15, 0.15), h, v(-0.15, 0.15)]];
      for (let i = 0; i < 3; i++) b.limb(pts[i], pts[i + 1], 0.3 - i * 0.07, 0.24 - i * 0.07, 0x4a3a2a, { mat: SURF.bark, seg: 8 });
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + v(0, 0.4);
        b.limb([Math.cos(a) * 0.1, 0.5, Math.sin(a) * 0.1], [Math.cos(a) * 0.65, -0.05, Math.sin(a) * 0.65], 0.07, 0.04, 0x4a3a2a, { mat: SURF.bark, seg: 6 });
      }
      b.part('leaves');
      crown(b, pts[3][0], h + 0.1, pts[3][2], 0.95, c1, c2, r, 5, 0.5);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + v(0, 0.5);
        b.limb([Math.cos(a) * 0.6, h - 0.05, Math.sin(a) * 0.6], [Math.cos(a) * 0.62, h - v(0.5, 0.9), Math.sin(a) * 0.62], 0.04, 0.015, c2, { mat: SURF.fur, seg: 5 });
      }
      break;
    }
    case 'mushroom': {
      const h = v(1.6, 2.6);
      const cr = v(0.7, 1.0);
      b.limb([0, -0.05, 0], [v(-0.1, 0.1), h, 0], 0.2, 0.12, 0xe8e0c0, { mat: SURF.skin, seg: 10 });
      b.part('leaves');
      b.lathe([[0.0, -0.08], [cr * 0.9, -0.12], [cr, 0.0], [cr * 0.85, cr * 0.25], [cr * 0.5, cr * 0.4], [0.0, cr * 0.45]], 0, h - 0.05, 0, c1, { seg: 16, mat: SURF.skin });
      b.sphere(0.06, 0.3, h + 0.25, 0.2, 0xfff0a0, { em: 1 });
      b.sphere(0.05, -0.3, h + 0.22, -0.1, 0xfff0a0, { em: 1 });
      break;
    }
    case 'tube_plant': {
      b.part('leaves');
      for (let i = 0; i < 5; i++) {
        const hh = v(0.8, 1.8);
        b.cyl(0.1, 0.13, hh, Math.cos(i * 1.3) * 0.25, hh / 2, Math.sin(i * 1.3) * 0.25, i % 2 ? c1 : c2, { seg: 7 });
        b.sphere(0.12, Math.cos(i * 1.3) * 0.25, hh, Math.sin(i * 1.3) * 0.25, 0xff70a0, { em: 0.6 });
      }
      break;
    }
    case 'ice_spire':
    case 'salt_crystal': {
      b.part('leaves');
      for (let i = 0; i < 4; i++) b.crystal(0.25, v(0.8, 1.8), Math.cos(i * 1.7) * 0.25, 0.5, Math.sin(i * 1.7) * 0.25, i % 2 ? c1 : c2, { rx: v(-0.3, 0.3), rz: v(-0.3, 0.3), em: kind === 'ice_spire' ? 0.15 : 0 });
      break;
    }
    case 'frozen_fungus': {
      b.cyl(0.15, 0.2, 0.9, 0, 0.45, 0, 0xa8b8c8, { seg: 7 });
      b.part('leaves');
      b.sphere(0.6, 0, 0.95, 0, c1, { sy: 0.45, seg: 9 });
      break;
    }
    case 'scrap':
    case 'scrap_pile':
    case 'pipe_cluster': {
      b.part('leaves');
      for (let i = 0; i < 5; i++) b.box(v(0.3, 0.7), v(0.2, 0.6), v(0.3, 0.6), v(-0.3, 0.3), v(0.1, 0.4), v(-0.3, 0.3), i % 2 ? c1 : c2, { ry: v(0, 3), rz: v(-0.5, 0.5) });
      if (kind === 'pipe_cluster') for (let i = 0; i < 3; i++) b.cyl(0.08, 0.08, v(1, 1.8), v(-0.3, 0.3), 0.7, v(-0.3, 0.3), 0x6a6a6a, { rz: v(-0.3, 0.3) });
      if (kind === 'scrap') b.cyl(0.25, 0.25, 0.9, 0, 0.5, 0, 0x8a8070, { rz: 0.9, seg: 8 });
      break;
    }
    case 'dead_tree': {
      const h = v(1.2, 1.8);
      trunkL(b, h, 0.12, 0.05, 0x6a5a48, v(-0.1, 0.1));
      b.part('leaves');
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6 + v(0, 0.5);
        const y0 = h * (0.5 + i * 0.12);
        const tip: [number, number, number] = [Math.cos(a) * 0.55, y0 + 0.4, Math.sin(a) * 0.55];
        b.limb([0, y0, 0], tip, 0.045, 0.02, 0x6a5a48, { mat: SURF.bark, seg: 5 });
        b.limb(tip, [tip[0] + Math.cos(a + 0.8) * 0.25, tip[1] + 0.2, tip[2] + Math.sin(a + 0.8) * 0.25], 0.02, 0.008, 0x6a5a48, { mat: SURF.bark, seg: 4 });
      }
      break;
    }
    case 'rock_spire':
    case 'obsidian': {
      b.part('leaves');
      const h = v(1.5, 2.8);
      const g1 = displace(new THREE.ConeGeometry(0.4, h, 7, 4), 0.18, 2.2, r.int(0, 999));
      b.mesh(g1, 0, h / 2, 0, c1, { mat: SURF.rock, rz: v(-0.1, 0.1) });
      const g2 = displace(new THREE.ConeGeometry(0.25, h * 0.6, 6, 3), 0.18, 2.5, r.int(0, 999));
      b.mesh(g2, 0.25, h * 0.3, 0.15, c2, { mat: SURF.rock });
      if (kind === 'obsidian') b.crystal(0.08, 0.3, 0.2, h * 0.5, 0.15, 0xff5a20, { em: 1.2 });
      break;
    }
    case 'geo_fungus': {
      b.part('leaves');
      for (let i = 0; i < 4; i++) {
        const hh = v(0.6, 1.4);
        b.cone(0.18, hh, Math.cos(i * 1.6) * 0.25, hh / 2, Math.sin(i * 1.6) * 0.25, i % 2 ? c1 : c2, { seg: 6 });
      }
      break;
    }
    default: {
      trunkL(b, 1.2, 0.12, 0.07, trunk);
      b.part('leaves');
      crown(b, 0, 1.45, 0, 0.7, c1, c2, r, 5);
    }
  }
  return b.build('tree:' + kind + ':' + variant);
}

export function buildResource(kind: string, variant: number, planetBiome: string): ModelDef {
  const b = new MB();
  const r = new RNG(variant * 131 + kind.length);
  b.part('body', 'static');
  switch (kind) {
    case 'bush': {
      const leaf = planetBiome === 'ice' ? 0x8aa0b0 : planetBiome === 'desert' || planetBiome === 'redrock' ? 0x8a8a4a : planetBiome === 'volcanic' ? 0x4a3a30 : 0x3a7a3a;
      const berry = planetBiome === 'ice' ? 0x9ad8ff : planetBiome === 'fungal' ? 0xff5aa0 : planetBiome === 'desert' ? 0xd86a2a : 0xd02a4a;
      lumpy(b, 0.42, 0, 0.3, 0, leaf, variant * 7 + 1, { sy: 0.75, seg: 10 });
      lumpy(b, 0.28, 0.2, 0.22, 0.15, leaf, variant * 7 + 2, { seg: 8 });
      lumpy(b, 0.24, -0.22, 0.2, -0.1, leaf, variant * 7 + 3, { seg: 8 });
      for (let i = 0; i < 9; i++) b.sphere(0.06, r.range(-0.35, 0.35), r.range(0.25, 0.55), r.range(-0.35, 0.35), berry, { seg: 5, em: planetBiome === 'ice' || planetBiome === 'fungal' ? 0.6 : 0.05 });
      break;
    }
    case 'nova': {
      rock(b, 0.36, 0, 0.12, 0, 0x5a6070, variant * 13 + 5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + r.range(0, 0.5);
        const h = r.range(0.4, 0.9);
        b.crystal(0.11, h, Math.cos(a) * 0.2, 0.3 + h * 0.4, Math.sin(a) * 0.2, i % 2 ? 0x3a9ae8 : 0x7ad0f8, { em: 0.35, rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 });
      }
      b.crystal(0.15, 1.1, 0, 0.7, 0, 0x9ae4ff, { em: 0.5 });
      break;
    }
    case 'ore': {
      const rock_ = planetBiome === 'ice' ? 0x8a98a8 : planetBiome === 'volcanic' ? 0x3a3030 : 0x7a6a5a;
      rock(b, 0.46, 0, 0.2, 0, rock_, variant * 11 + 1);
      rock(b, 0.3, 0.3, 0.12, 0.22, rock_, variant * 11 + 2);
      rock(b, 0.25, -0.27, 0.1, -0.25, rock_, variant * 11 + 3);
      // vetas de mineral brillante
      for (let i = 0; i < 6; i++) rock(b, 0.07, r.range(-0.3, 0.3), r.range(0.3, 0.55), r.range(-0.3, 0.3), 0xd8a050, variant * 17 + i, { sy: 0.6, detail: 0, mat: SURF.panel, em: 0.15 });
      break;
    }
    case 'carcass': {
      b.sphere(0.4, 0, 0.15, 0, 0x7a3a2a, { sy: 0.35, sx: 1.4, seg: 7 });
      for (let i = 0; i < 4; i++) b.box(0.05, 0.25, 0.05, -0.2 + i * 0.13, 0.25, 0, C.offwhite, { rz: 0.3 });
      break;
    }
    case 'holocron': {
      b.part('cube', 'spin', [0, 0.7, 0]);
      b.box(0.3, 0.3, 0.3, 0, 0.7, 0, 0x3a8aff, { em: 2.2, rx: 0.6, rz: 0.6 });
      b.box(0.36, 0.06, 0.06, 0, 0.7, 0, 0xffd860, { em: 1.6, rx: 0.6, rz: 0.6 });
      b.part('body');
      b.cyl(0.25, 0.32, 0.12, 0, 0.06, 0, 0x5a5a6a, { seg: 8 });
      b.torus(0.3, 0.03, 0, 0.14, 0, 0x6ab8ff, { rx: Math.PI / 2, em: 1.4 });
      break;
    }
  }
  return b.build('res:' + kind + ':' + variant + ':' + planetBiome);
}

export function buildDecor(kind: string, planetColor: number): ModelDef {
  const b = new MB();
  b.part('body', 'static');
  const r = new RNG(kind.length * 99 + 1);
  switch (kind) {
    case 'rock':
      rock(b, 0.38, 0, 0.1, 0, planetColor, 3);
      rock(b, 0.22, 0.32, 0.05, 0.12, planetColor, 4);
      break;
    case 'ice_rock':
      rock(b, 0.42, 0, 0.12, 0, 0xc8dcec, 5, { mat: SURF.glass });
      break;
    case 'obsidian_rock':
      rock(b, 0.38, 0, 0.12, 0, 0x1a1616, 6, { mat: SURF.glass });
      b.crystal(0.06, 0.2, 0.15, 0.25, 0, 0xff5a20, { em: 1.5 });
      break;
    case 'snow_mound':
      b.sphere(0.5, 0, 0, 0, 0xf4f8fc, { sy: 0.35, seg: 8 });
      break;
    case 'vaporator':
      b.cyl(0.08, 0.12, 1.4, 0, 0.7, 0, 0xc8c4b8, { seg: 8 });
      for (let i = 0; i < 3; i++) b.cyl(0.22, 0.22, 0.05, 0, 0.6 + i * 0.3, 0, 0xa8a498, { seg: 10 });
      b.box(0.1, 0.06, 0.1, 0, 1.42, 0, 0x8a8478);
      break;
    case 'bones':
      for (let i = 0; i < 5; i++) b.box(0.6, 0.06, 0.06, 0, 0.1 + i * 0.05, -0.2 + i * 0.1, C.offwhite, { rz: 0.8 + i * 0.1, ry: i * 0.3 });
      b.sphere(0.2, 0.4, 0.1, 0, C.offwhite, { sx: 1.3, sy: 0.7 });
      break;
    case 'fern':
      for (let i = 0; i < 6; i++) b.box(0.6, 0.03, 0.12, Math.cos(i) * 0.2, 0.15, Math.sin(i) * 0.2, 0x4a8a3a, { ry: i, rz: -0.5 });
      break;
    case 'log':
      b.cyl(0.12, 0.14, 1.2, 0, 0.12, 0, 0x5a3e28, { rz: Math.PI / 2, ry: 0.4, seg: 7 });
      break;
    case 'flowers':
      for (let i = 0; i < 8; i++) {
        b.cyl(0.01, 0.01, 0.2, Math.cos(i * 2.3) * 0.25, 0.1, Math.sin(i * 2.3) * 0.25, 0x4a8a3a);
        b.sphere(0.04, Math.cos(i * 2.3) * 0.25, 0.21, Math.sin(i * 2.3) * 0.25, [0xff6a8a, 0xffd84a, 0xd88aff][i % 3], { seg: 5 });
      }
      break;
    case 'column':
      b.cyl(0.15, 0.17, 1.4, 0, 0.7, 0, 0xe8dcc0, { seg: 10 });
      b.box(0.4, 0.1, 0.4, 0, 1.45, 0, 0xd8ccb0);
      break;
    case 'spire_small':
      b.cone(0.25, 1.0, 0, 0.5, 0, planetColor, { seg: 5 });
      break;
    case 'vent':
      b.cyl(0.2, 0.3, 0.3, 0, 0.15, 0, 0x2a2420, { seg: 8 });
      b.cyl(0.12, 0.12, 0.05, 0, 0.31, 0, 0xff6a20, { em: 1.5, seg: 8 });
      break;
    case 'ruin_block':
      b.box(0.6, 0.4, 0.5, 0, 0.2, 0, 0x8a8a7a, { ry: 0.3 });
      b.box(0.4, 0.3, 0.3, 0.2, 0.55, 0.1, 0x7a7a6a, { ry: 0.6 });
      break;
    case 'swamp_root':
      for (let i = 0; i < 4; i++) b.cyl(0.04, 0.07, 0.8, Math.cos(i * 1.6) * 0.2, 0.25, Math.sin(i * 1.6) * 0.2, 0x4a3a2a, { rx: Math.sin(i * 1.6) * 0.7, rz: -Math.cos(i * 1.6) * 0.7 });
      break;
    case 'crate':
      b.box(0.4, 0.4, 0.4, 0, 0.2, 0, 0x6a6a5a);
      b.box(0.3, 0.3, 0.3, 0.3, 0.15, 0.2, 0x5a5a4a, { ry: 0.5 });
      break;
    case 'antenna':
      b.cyl(0.03, 0.05, 1.6, 0, 0.8, 0, 0x5a5a5a);
      b.sphere(0.05, 0, 1.62, 0, 0xff3a2a, { em: 2 });
      break;
    case 'scrap_small':
      b.box(0.5, 0.2, 0.3, 0, 0.1, 0, 0x8a8a8a, { ry: 0.4, rz: 0.3 });
      break;
    case 'shell':
      b.sphere(0.15, 0, 0.05, 0, 0xf0d8c8, { sy: 0.4 });
      break;
    case 'glow_plant':
      for (let i = 0; i < 4; i++) {
        b.cyl(0.02, 0.03, 0.4, Math.cos(i * 1.7) * 0.15, 0.2, Math.sin(i * 1.7) * 0.15, 0x4a8a5a);
        b.sphere(0.07, Math.cos(i * 1.7) * 0.15, 0.42, Math.sin(i * 1.7) * 0.15, [0x5affd8, 0xff5ad8][i % 2], { em: 1.6, seg: 5 });
      }
      break;
    default:
      rock(b, 0.32, 0, 0.1, 0, planetColor, 9);
  }
  void r;
  return b.build('decor:' + kind);
}

/** Monumentos del paisaje (bloquean el paso). size en tiles. */
export function buildLandmark(kind: string, size: number, planetColor: number): ModelDef {
  const b = new MB();
  b.part('body', 'static');
  const S = size * 0.9;
  switch (kind) {
    case 'sandcrawler': {
      b.box(S, S * 0.35, S * 0.55, 0, S * 0.3, 0, 0x8a6a4a);
      b.wedge(S * 0.55, S * 0.25, S * 0.45, S * 0.3, S * 0.12, 0, 0x7a5a3a, { ry: Math.PI / 2 });
      b.box(S * 0.7, S * 0.2, S * 0.45, -S * 0.1, S * 0.58, 0, 0x7a5a3a);
      b.box(S * 0.9, S * 0.1, S * 0.6, 0, S * 0.08, 0, 0x3a3a3a);
      for (let i = 0; i < 4; i++) b.box(0.2, 0.2, 0.1, -S * 0.3 + i * S * 0.2, S * 0.55, S * 0.23, 0x2a2a2a);
      break;
    }
    case 'sarlacc': {
      b.cyl(S * 0.5, S * 0.3, 0.4, 0, 0, 0, planetColor, { seg: 16 });
      b.cyl(S * 0.25, S * 0.15, 0.42, 0, 0.02, 0, 0x5a2a1a, { seg: 12 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        b.cone(0.06, 0.5, Math.cos(a) * S * 0.25, 0.3, Math.sin(a) * S * 0.25, C.offwhite, { rx: Math.sin(a) * 0.6, rz: -Math.cos(a) * 0.6 });
      }
      break;
    }
    case 'mos_hut':
    case 'niima_outpost': {
      b.sphere(S * 0.4, 0, 0, 0, 0xd8c8a0, { sy: 0.8, seg: 12 });
      b.sphere(S * 0.25, S * 0.3, 0, S * 0.2, 0xd0c098, { sy: 0.8, seg: 10 });
      b.box(0.1, 0.5, 0.4, S * 0.4, 0.25, 0, 0x3a3020);
      b.cyl(0.05, 0.08, 1.2, -S * 0.2, 1.5, 0, 0x8a8478);
      break;
    }
    case 'echo_base':
    case 'rebel_hangar':
    case 'rebel_bunker_door': {
      b.sphere(S * 0.5, 0, 0, 0, kind === 'echo_base' ? 0xe8eef4 : planetColor, { sy: 0.45, seg: 16 });
      b.box(0.2, S * 0.25, S * 0.45, S * 0.45, S * 0.12, 0, 0x5a6a7a);
      b.box(0.22, 0.08, S * 0.45, S * 0.46, S * 0.26, 0, 0xffb040, { em: 1.3 });
      break;
    }
    case 'shield_dish':
    case 'ion_cannon': {
      b.cyl(S * 0.3, S * 0.35, 0.6, 0, 0.3, 0, 0x7a8088, { seg: 12 });
      if (kind === 'ion_cannon') {
        b.sphere(S * 0.3, 0, 1.0, 0, 0x8a9098, { seg: 14 });
        b.cyl(0.15, 0.2, S * 0.6, S * 0.2, 1.4, 0, 0x5a6068, { rz: Math.PI / 2 - 0.8 });
      } else {
        b.cyl(0.1, 0.12, 1.4, 0, 1.1, 0, 0x6a7078);
        b.cyl(S * 0.45, 0.1, 0.3, 0, 1.9, 0, 0xd0d4d8, { rx: -0.6, seg: 16 });
      }
      break;
    }
    case 'ewok_village':
    case 'wookiee_village': {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * S * 0.25, z = Math.sin(a) * S * 0.25;
        b.cyl(0.35, 0.5, 4.5, x, 2.25, z, 0x5a3a22, { seg: 8 });
        b.cyl(1.0, 1.0, 0.1, x, 2.0, z, 0x8a6a3a, { seg: 8 });
        b.cone(0.6, 0.6, x + 0.4, 2.35, z, 0x7a5a30, { seg: 7 });
        b.cone(1.6, 1.6, x, 4.6, z, kind === 'ewok_village' ? 0x2e5a22 : 0x3a7a2a, { seg: 7 });
        b.sphere(0.06, x + 0.5, 2.3, z, 0xffb040, { em: 2 });
      }
      break;
    }
    case 'bunker': {
      b.box(S * 0.6, 0.7, S * 0.5, 0, 0.35, 0, 0x6a6e6a);
      b.box(S * 0.65, 0.12, S * 0.55, 0, 0.75, 0, 0x5a5e5a);
      b.box(0.1, 0.45, 0.6, S * 0.31, 0.3, 0, 0x2a2a2a);
      b.sphere(0.06, S * 0.32, 0.65, 0.4, 0xff3a2a, { em: 2 });
      break;
    }
    case 'shield_generator': {
      b.box(S * 0.7, 0.4, S * 0.7, 0, 0.2, 0, 0x6a6e74);
      b.cyl(0.2, 0.3, 2.6, 0, 1.5, 0, 0x7a7e84, { seg: 8 });
      b.cyl(S * 0.5, S * 0.5, 0.15, 0, 2.9, 0, 0x8a8e94, { seg: 16, rx: 0.3 });
      b.sphere(0.12, 0, 3.0, 0, 0x6ac8ff, { em: 2 });
      break;
    }
    case 'theed_ruins':
    case 'jedi_ruin':
    case 'ruin_pyramid':
    case 'massassi_temple': {
      const stone = kind === 'theed_ruins' ? 0xe8dcc0 : 0x8a8a76;
      if (kind === 'massassi_temple' || kind === 'ruin_pyramid') {
        for (let i = 0; i < 4; i++) b.box(S * (1 - i * 0.22), 0.6, S * (1 - i * 0.22), 0, 0.3 + i * 0.6, 0, stone);
        b.box(0.1, 0.6, 0.6, S * 0.5, 0.3, 0, 0x2a2a2a);
      } else {
        for (let i = 0; i < 6; i++) b.cyl(0.15, 0.17, i % 2 ? 1.6 : 0.9, Math.cos(i) * S * 0.3, (i % 2 ? 1.6 : 0.9) / 2, Math.sin(i) * S * 0.3, stone, { seg: 10 });
        b.box(S * 0.7, 0.15, 0.4, 0, 1.65, S * 0.2, stone);
        b.box(S * 0.4, 0.4, S * 0.3, -S * 0.2, 0.2, -S * 0.2, stone, { ry: 0.5 });
        if (kind === 'theed_ruins') b.sphere(S * 0.25, S * 0.15, 0.6, -S * 0.1, 0x5a9a7a, { sy: 0.6, seg: 12 });
      }
      break;
    }
    case 'waterfall_rock':
    case 'gungan_statue': {
      b.dodeca(S * 0.4, 0, S * 0.25, 0, 0x7a8a7a, { sy: 1.2 });
      if (kind === 'gungan_statue') b.sphere(S * 0.25, 0, S * 0.75, 0, 0x8a9a8a, { sx: 1.4 });
      break;
    }
    case 'droid_foundry':
    case 'imperial_factory':
    case 'mining_facility':
    case 'lava_collector': {
      const col = kind === 'imperial_factory' ? 0x6a6e76 : kind === 'droid_foundry' ? 0x8a5a3a : 0x3a3434;
      b.box(S * 0.7, 1.4, S * 0.6, 0, 0.7, 0, col);
      for (let i = 0; i < 3; i++) b.cyl(0.18, 0.22, 2.5, -S * 0.25 + i * S * 0.25, 1.25, -S * 0.3, 0x4a4a4a, { seg: 8 });
      b.box(S * 0.72, 0.1, S * 0.62, 0, 1.0, 0, 0xff7a20, { em: 1 });
      if (kind === 'lava_collector') b.cone(0.5, 1.2, S * 0.3, 0.6, S * 0.3, 0x2a2020);
      break;
    }
    case 'hive_spire':
    case 'sith_spire':
    case 'arena': {
      if (kind === 'arena') {
        b.cyl(S * 0.5, S * 0.45, 1.6, 0, 0.8, 0, planetColor, { seg: 14 });
        b.cyl(S * 0.38, S * 0.38, 1.7, 0, 0.85, 0, 0x5a3a2a, { seg: 14 });
      } else {
        b.cone(S * 0.3, 4.5, 0, 2.25, 0, kind === 'sith_spire' ? 0x1a1414 : planetColor, { seg: 6 });
        b.cone(S * 0.18, 3.0, S * 0.25, 1.5, S * 0.15, kind === 'sith_spire' ? 0x2a2020 : planetColor, { seg: 6 });
        if (kind === 'sith_spire') b.sphere(0.2, 0, 3.6, 0, 0xff2a2a, { em: 2.5 });
      }
      break;
    }
    case 'kachirho_tree': {
      b.cyl(0.8, 1.2, 6.5, 0, 3.25, 0, 0x5a3a22, { seg: 10 });
      b.cyl(1.8, 1.8, 0.15, 0, 3.0, 0, 0x8a6a3a, { seg: 10 });
      b.sphere(2.2, 0, 7.0, 0, 0x3a7a2a, { seg: 10, sy: 0.6 });
      break;
    }
    case 'catamaran_dock':
    case 'landing_pad': {
      b.cyl(S * 0.45, S * 0.47, 0.25, 0, 0.12, 0, 0x6a6a6e, { seg: 16 });
      b.torus(S * 0.38, 0.05, 0, 0.27, 0, 0xffb040, { rx: Math.PI / 2, em: 1.4, seg: 24 });
      break;
    }
    case 'yoda_hut':
    case 'dark_cave': {
      b.sphere(S * 0.35, 0, 0, 0, kind === 'yoda_hut' ? 0x6a5a40 : 0x2a2a20, { sy: 0.7, seg: 10 });
      if (kind === 'yoda_hut') b.sphere(0.08, S * 0.33, 0.3, 0, 0xffb040, { em: 2 });
      else b.cyl(0.3, 1.2, 2.5, 0, 1.0, 0, 0x2a2420, { seg: 6 });
      break;
    }
    case 'xwing_wreck':
    case 'atat_wreck': {
      if (kind === 'atat_wreck') {
        b.box(S * 0.6, 0.9, 0.9, 0, 0.5, 0, 0x9a9a98, { rz: 0.25, rx: 0.4 });
        b.box(0.7, 0.45, 0.45, S * 0.4, 0.25, 0.3, 0x8a8a88, { rx: 0.5 });
        b.box(0.15, 1.8, 0.15, -S * 0.3, 0.3, -0.6, 0x7a7a78, { rz: 1.3 });
      } else {
        b.box(1.4, 0.2, 0.25, 0, 0.3, 0, 0xd8d4cc, { rz: 0.4 });
        b.box(0.35, 0.03, 0.9, -0.3, 0.2, 0.3, 0xd8d4cc, { rx: 0.3 });
      }
      break;
    }
    case 'star_destroyer_wreck': {
      b.wedge(S * 0.9, 1.4, S * 1.0, 0, -0.3, 0, 0x9a9890, { ry: Math.PI / 2 + 0.3, rz: 0.15 });
      b.box(S * 0.3, 0.9, 0.6, -S * 0.25, 0.9, 0, 0x8a8880, { ry: 0.3, rz: 0.15 });
      b.box(0.8, 0.3, 0.3, -S * 0.3, 1.5, 0, 0x7a7870, { ry: 0.3 });
      break;
    }
    case 'skyscraper':
    case 'senate_dome':
    case 'citadel_tower': {
      if (kind === 'senate_dome') {
        b.sphere(S * 0.45, 0, 0, 0, 0xb8b8b0, { sy: 0.5, seg: 16 });
      } else {
        b.box(S * 0.5, kind === 'citadel_tower' ? 6.5 : 5.0, S * 0.5, 0, kind === 'citadel_tower' ? 3.25 : 2.5, 0, 0x5a5e66);
        for (let i = 0; i < 8; i++) b.box(S * 0.51, 0.06, S * 0.51, 0, 0.5 + i * 0.6, 0, 0xffd890, { em: 0.8 });
        if (kind === 'citadel_tower') b.cyl(S * 0.35, S * 0.35, 0.3, 0, 6.6, 0, 0x6a6e76, { seg: 16 });
      }
      break;
    }
    case 'farm_dome': {
      b.sphere(S * 0.35, 0, 0, 0, 0xd8d0b8, { sy: 0.6, seg: 12 });
      b.cyl(0.06, 0.08, 1.4, S * 0.3, 0.7, 0, 0xc8c4b8);
      break;
    }
    case 'giant_flower': {
      b.cyl(0.25, 0.35, 2.5, 0, 1.25, 0, 0x4a8a3a, { seg: 8 });
      for (let i = 0; i < 6; i++) b.box(1.4, 0.06, 0.6, Math.cos(i) * 0.6, 2.5, Math.sin(i) * 0.6, 0xe8603a, { ry: -i, rz: -0.3 });
      b.sphere(0.35, 0, 2.6, 0, 0xffd84a, { em: 0.6 });
      break;
    }
    case 'trench': {
      b.box(S * 0.9, 0.4, 0.4, 0, 0.2, -S * 0.3, 0x8a7a72);
      b.box(S * 0.9, 0.4, 0.4, 0, 0.2, S * 0.3, 0x8a7a72);
      break;
    }
    default:
      b.dodeca(S * 0.4, 0, S * 0.2, 0, planetColor);
  }
  return b.build('land:' + kind + ':' + size);
}
