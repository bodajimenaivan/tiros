// Mapa de tiles: alturas, tipo de terreno, ocupación y transitabilidad.

export const T_GROUND = 0;
export const T_ALT = 1;
export const T_HIGH = 2;
export const T_LOW = 3;
export const T_CLIFF = 4;
export const T_SHALLOW = 5;
export const T_DEEP = 6;
export const T_PATH = 7;

export class GameMap {
  readonly w: number;
  readonly h: number;
  /** Alturas por vértice (w+1)*(h+1) */
  readonly heights: Float32Array;
  /** Tipo de terreno por tile */
  readonly terrain: Uint8Array;
  /** Ocupación por entidad bloqueante (edificios, árboles, minas). 0 = libre */
  readonly occ: Int32Array;
  /** Ocupación por granjas (no bloquean el paso) */
  readonly farmOcc: Int32Array;
  /** Puertas: id de la entidad puerta (transitable para su dueño/aliados) */
  readonly gateOcc: Int32Array;
  waterLevel = -0.5;
  liquid: 'water' | 'lava' | 'swamp' | 'ice' | 'acid' | 'none' = 'none';
  /** Versión que cambia cuando cambia la transitabilidad (para invalidar caminos/render) */
  version = 0;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.heights = new Float32Array((w + 1) * (h + 1));
    this.terrain = new Uint8Array(w * h);
    this.occ = new Int32Array(w * h);
    this.farmOcc = new Int32Array(w * h);
    this.gateOcc = new Int32Array(w * h);
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
  }

  idx(tx: number, ty: number): number {
    return ty * this.w + tx;
  }

  vh(vx: number, vy: number): number {
    return this.heights[vy * (this.w + 1) + vx];
  }

  /** Altura interpolada en coordenadas continuas */
  heightAt(x: number, y: number): number {
    const fx = Math.max(0, Math.min(this.w - 0.001, x));
    const fy = Math.max(0, Math.min(this.h - 0.001, y));
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const dx = fx - ix, dy = fy - iy;
    const W = this.w + 1;
    const a = this.heights[iy * W + ix], b = this.heights[iy * W + ix + 1];
    const c = this.heights[(iy + 1) * W + ix], d = this.heights[(iy + 1) * W + ix + 1];
    return (a * (1 - dx) + b * dx) * (1 - dy) + (c * (1 - dx) + d * dx) * dy;
  }

  /** Altura del terreno visible (incluye el nivel del líquido) */
  surfaceAt(x: number, y: number): number {
    const h = this.heightAt(x, y);
    return this.liquid !== 'none' ? Math.max(h, this.waterLevel - 0.05) : h;
  }

  terrainPassable(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    const t = this.terrain[ty * this.w + tx];
    return t !== T_CLIFF && t !== T_DEEP;
  }

  /** Transitabilidad básica (terreno + obstáculos). Las puertas se resuelven en el pathfinder. */
  passable(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    const i = ty * this.w + tx;
    const t = this.terrain[i];
    return t !== T_CLIFF && t !== T_DEEP && this.occ[i] === 0;
  }

  /** ¿Se puede construir sobre este tile? */
  buildable(tx: number, ty: number, allowFarm = false): boolean {
    if (!this.inBounds(tx, ty)) return false;
    const i = ty * this.w + tx;
    const t = this.terrain[i];
    if (t === T_CLIFF || t === T_DEEP || t === T_SHALLOW) return false;
    if (this.occ[i] !== 0) return false;
    // orillas parcialmente sumergidas
    if (this.liquid !== 'none' && Math.min(this.vh(tx, ty), this.vh(tx + 1, ty), this.vh(tx, ty + 1), this.vh(tx + 1, ty + 1)) < this.waterLevel - 0.02) return false;
    if (!allowFarm && this.farmOcc[i] !== 0) return false;
    if (allowFarm && this.farmOcc[i] !== 0) return false;
    return true;
  }

  /** Pendiente máxima alrededor del tile (para evitar construir en laderas) */
  slope(tx: number, ty: number): number {
    const a = this.vh(tx, ty), b = this.vh(tx + 1, ty), c = this.vh(tx, ty + 1), d = this.vh(tx + 1, ty + 1);
    return Math.max(a, b, c, d) - Math.min(a, b, c, d);
  }
}
