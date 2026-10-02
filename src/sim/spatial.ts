// Hash espacial simple para consultas por radio.
import type { Entity } from './entity';

export class SpatialHash {
  readonly cell: number;
  readonly cw: number;
  readonly ch: number;
  private cells: Entity[][];

  constructor(w: number, h: number, cell = 4) {
    this.cell = cell;
    this.cw = Math.ceil(w / cell) + 1;
    this.ch = Math.ceil(h / cell) + 1;
    this.cells = new Array(this.cw * this.ch);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }

  clear() {
    for (const c of this.cells) c.length = 0;
  }

  private key(x: number, y: number): number {
    const cx = Math.max(0, Math.min(this.cw - 1, Math.floor(x / this.cell)));
    const cy = Math.max(0, Math.min(this.ch - 1, Math.floor(y / this.cell)));
    return cy * this.cw + cx;
  }

  insert(e: Entity) {
    this.cells[this.key(e.x, e.y)].push(e);
  }

  remove(e: Entity) {
    const c = this.cells[this.key(e.x, e.y)];
    const i = c.indexOf(e);
    if (i >= 0) c.splice(i, 1);
  }

  /** Recorre las entidades dentro del radio (aprox. por celdas + comprobación exacta) */
  query(x: number, y: number, r: number, out: Entity[]): Entity[] {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r) / c)), x1 = Math.min(this.cw - 1, Math.floor((x + r) / c));
    const y0 = Math.max(0, Math.floor((y - r) / c)), y1 = Math.min(this.ch - 1, Math.floor((y + r) / c));
    const r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = this.cells[cy * this.cw + cx];
        for (let k = 0; k < cell.length; k++) {
          const e = cell[k];
          const ex = e.x - x, ey = e.y - y;
          const rr = r + (e.bd ? e.size * 0.7 : 0);
          if (ex * ex + ey * ey <= (e.bd ? rr * rr : r2)) out.push(e);
        }
      }
    }
    return out;
  }
}
