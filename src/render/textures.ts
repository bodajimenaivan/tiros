// Texturas procedurales generadas en canvas: detalle de terreno por bioma, sprites de partículas, ruido de agua.
import * as THREE from 'three';
import { Noise2D } from '../core/noise';
import { RNG } from '../core/rng';

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

function toTexture(c: HTMLCanvasElement, srgb = false, repeat = true): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Ruido "tileable" sumando octavas con periodo entero */
function tileNoise(n: Noise2D, x: number, y: number, period: number, oct: number): number {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < oct; o++) {
    const p = period * f;
    const u = (x / 512) * p, v = (y / 512) * p;
    // mezcla bilineal de 4 muestras periódicas
    const a = n.noise(u, v), b = n.noise(u - p, v), c = n.noise(u, v - p), d = n.noise(u - p, v - p);
    const fx = u / p, fy = v / p;
    const val = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
    sum += val * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export type DetailKind = 'sand' | 'grass' | 'snow' | 'rock' | 'mud' | 'metal' | 'ash' | 'salt' | 'gravel' | 'path' | 'moss' | 'fungal';

/** Textura de detalle en escala de grises (R = luminancia, G = altura para relieve) */
export function detailTexture(kind: DetailKind, seed = 1): THREE.Texture {
  const S = 512;
  const [c, g] = canvas(S);
  const img = g.createImageData(S, S);
  const n = new Noise2D(seed * 13 + kind.length * 7);
  const n2 = new Noise2D(seed * 29 + 3);
  const rng = new RNG(seed * 31 + 9);
  const d = img.data;
  // diagrama de Voronoi para roca
  const cells: [number, number][] = [];
  for (let i = 0; i < 40; i++) cells.push([rng.next() * S, rng.next() * S]);
  const vor = (x: number, y: number) => {
    let d1 = 1e9, d2 = 1e9;
    for (const [cx, cy] of cells) {
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const dx = x - (cx + ox * S), dy = y - (cy + oy * S);
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
          } else if (dd < d2) d2 = dd;
        }
    }
    return Math.sqrt(d2) - Math.sqrt(d1);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0.5;
      const big = tileNoise(n, x, y, 4, 3);
      const fine = tileNoise(n2, x, y, 32, 3);
      switch (kind) {
        case 'sand': {
          const ripple = Math.sin((y + tileNoise(n, x, y, 3, 2) * 60) * 0.12) * 0.5 + 0.5;
          v = 0.55 + big * 0.12 + ripple * 0.12 + fine * 0.08 + (rng.next() - 0.5) * 0.06;
          break;
        }
        case 'grass': {
          const blades = (rng.next() - 0.5) * 0.25 + fine * 0.15;
          v = 0.5 + big * 0.15 + blades + tileNoise(n2, x, y, 8, 2) * 0.1;
          break;
        }
        case 'moss': {
          v = 0.5 + big * 0.2 + fine * 0.15 + (rng.next() - 0.5) * 0.15;
          break;
        }
        case 'fungal': {
          const spots = Math.max(0, tileNoise(n, x, y, 12, 1) - 0.25) * 2.5;
          v = 0.5 + big * 0.15 + fine * 0.1 + spots * 0.3 + (rng.next() - 0.5) * 0.08;
          break;
        }
        case 'snow': {
          v = 0.75 + big * 0.1 + fine * 0.05 + (rng.next() < 0.004 ? 0.25 : 0);
          break;
        }
        case 'rock': {
          const vv = Math.min(1, vor(x, y) / 14);
          v = 0.35 + vv * 0.35 + big * 0.15 + fine * 0.12 + (rng.next() - 0.5) * 0.08;
          if (vv < 0.12) v *= 0.55;
          break;
        }
        case 'gravel': {
          const vv = Math.min(1, vor(x * 3 % S, y * 3 % S) / 10);
          v = 0.45 + vv * 0.25 + fine * 0.12 + (rng.next() - 0.5) * 0.1;
          break;
        }
        case 'mud': {
          v = 0.45 + big * 0.2 + fine * 0.1 + Math.max(0, tileNoise(n2, x, y, 6, 2)) * 0.2;
          break;
        }
        case 'ash': {
          v = 0.4 + big * 0.18 + fine * 0.14 + (rng.next() - 0.5) * 0.1;
          const crack = Math.min(1, vor(x, y) / 6);
          if (crack < 0.15) v *= 0.5;
          break;
        }
        case 'salt': {
          const crack = Math.min(1, vor(x, y) / 5);
          v = 0.8 + big * 0.08 + fine * 0.05;
          if (crack < 0.18) v = 0.55;
          break;
        }
        case 'metal': {
          const gx = x % 128, gy = y % 128;
          const seam = gx < 3 || gy < 3 ? 0.25 : 0;
          const rivet = (gx - 10) ** 2 + (gy - 10) ** 2 < 9 || (gx - 118) ** 2 + (gy - 10) ** 2 < 9 ? 0.2 : 0;
          const panel = ((Math.floor(x / 128) + Math.floor(y / 128) * 3) % 4) * 0.04;
          v = 0.55 + panel - seam + rivet + fine * 0.08 + big * 0.06 + (rng.next() - 0.5) * 0.04;
          break;
        }
        case 'path': {
          v = 0.5 + big * 0.15 + fine * 0.12 + (rng.next() - 0.5) * 0.12;
          break;
        }
      }
      v = Math.max(0, Math.min(1, v));
      const i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = Math.round(v * 255);
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(c);
}

/** Textura de ruido RGB para olas / lava (tileable) */
export function noiseTexture(seed = 3, period = 8): THREE.Texture {
  const S = 256;
  const [c, g] = canvas(S);
  const img = g.createImageData(S, S);
  const n1 = new Noise2D(seed), n2 = new Noise2D(seed + 1), n3 = new Noise2D(seed + 2);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const sx = x * 2, sy = y * 2;
      img.data[i] = Math.round((tileNoise(n1, sx, sy, period, 4) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((tileNoise(n2, sx, sy, period, 4) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((tileNoise(n3, sx, sy, period * 2, 3) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = toTexture(c);
  return t;
}

/** Sprite radial suave para partículas brillantes */
export function glowSprite(): THREE.Texture {
  const S = 64;
  const [c, g] = canvas(S);
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  return toTexture(c, false, false);
}

/** Sprite de humo con textura irregular */
export function smokeSprite(): THREE.Texture {
  const S = 128;
  const [c, g] = canvas(S);
  const img = g.createImageData(S, S);
  const n = new Noise2D(77);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2);
      const r = Math.sqrt(dx * dx + dy * dy);
      const nn = n.fbm(x * 0.05, y * 0.05, 4) * 0.5 + 0.5;
      let a = Math.max(0, 1 - r) * (0.55 + nn * 0.6);
      a = Math.min(1, a * 1.4) * Math.max(0, 1 - r * r);
      const i = (y * S + x) * 4;
      const l = 200 + nn * 55;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = l;
      img.data[i + 3] = Math.round(a * 255);
    }
  g.putImageData(img, 0, 0);
  return toTexture(c, false, false);
}

/** Anillo para ondas expansivas / selección */
export function ringSprite(): THREE.Texture {
  const S = 128;
  const [c, g] = canvas(S);
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.75, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.85, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  return toTexture(c, false, false);
}

/** Destello en forma de estrella (fogonazos) */
export function flareSprite(): THREE.Texture {
  const S = 128;
  const [c, g] = canvas(S);
  g.translate(S / 2, S / 2);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.2, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(-S / 2, -S / 2, S, S);
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    g.rotate(Math.PI / 4);
    const lg = g.createLinearGradient(-S / 2, 0, S / 2, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.fillRect(-S / 2, -1.5, S, 3);
  }
  return toTexture(c, false, false);
}
