// Ruido de valor 2D suavizado + fBm, determinista a partir de una semilla.
import { RNG } from './rng';

export class Noise2D {
  private perm: Uint8Array;
  private vals: Float32Array;
  constructor(seed: number) {
    const r = new RNG(seed);
    this.perm = new Uint8Array(512);
    this.vals = new Float32Array(256);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p.push(i);
      this.vals[i] = r.next() * 2 - 1;
    }
    r.shuffle(p);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  private v(ix: number, iy: number): number {
    return this.vals[this.perm[(this.perm[ix & 255] + iy) & 511] & 255];
  }
  noise(x: number, y: number): number {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = this.v(ix, iy), b = this.v(ix + 1, iy), c = this.v(ix, iy + 1), d = this.v(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  fbm(x: number, y: number, oct = 4, lac = 2, gain = 0.5): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * this.noise(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lac;
    }
    return sum / norm;
  }
  ridge(x: number, y: number, oct = 4): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      const n = 1 - Math.abs(this.noise(x * freq, y * freq));
      sum += amp * n * n;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }
}
