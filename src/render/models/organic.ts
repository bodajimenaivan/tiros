// Utilidades para formas orgánicas: ruido 3D, desplazamiento de vértices, bultos y rocas.
import * as THREE from 'three';
import { MB } from './builder';
import { SURF } from '../surface';

function h3(ix: number, iy: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruido de valor 3D suave en [-1, 1] */
export function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => h3(ix + dx, iy + dy, iz + dz, seed);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
/** Desplaza radialmente los vértices de una geometría centrada en el origen */
export function displace(g: THREE.BufferGeometry, amp: number, freq: number, seed: number, flatBottom = -1e9) {
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
export function lumpy(b: MB, r: number, x: number, y: number, z: number, color: number, seed: number, o: { sy?: number; amp?: number; seg?: number; mat?: number } = {}) {
  const seg = MB.lod ? 7 : o.seg ?? 9;
  const g = displace(new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.65))), o.amp ?? 0.22, 1.6, seed);
  g.scale(r, r * (o.sy ?? 1), r);
  return b.mesh(g, x, y, z, color, { flat: false, mat: o.mat ?? SURF.leaves });
}
/** Roca facetada con ruido */
export function rock(b: MB, r: number, x: number, y: number, z: number, color: number, seed: number, o: { sy?: number; detail?: number; mat?: number; em?: number } = {}) {
  const g = new THREE.IcosahedronGeometry(1, o.detail ?? 1);
  displace(g, 0.28, 1.3, seed, -0.35);
  g.scale(r, r * (o.sy ?? 0.75), r);
  return b.mesh(g, x, y, z, color, { mat: o.mat ?? SURF.rock, em: o.em });
}
