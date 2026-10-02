// A* sobre la rejilla de tiles con 8 direcciones, sin cortar esquinas,
// suavizado por línea de visión y caminos parciales hacia el punto más cercano.
import { GameMap, T_SHALLOW } from './map';

export interface PathOpts {
  goalRect?: { x0: number; y0: number; x1: number; y1: number }; // aceptar cualquier tile adyacente a este rectángulo
  canPassGate?: (gateId: number) => boolean;
  maxNodes?: number;
  ignoreOcc?: number; // id de entidad cuyo bloqueo se ignora (p.ej. objetivo)
}

export interface Waypoint {
  x: number;
  y: number;
}

const SQRT2 = Math.SQRT2;
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

export class Pathfinder {
  private map: GameMap;
  private g: Float32Array;
  private parent: Int32Array;
  private stamp: Uint32Array;
  private closed: Uint32Array;
  private gen = 1;
  private heap: Int32Array;
  private heapF: Float32Array;
  private heapSize = 0;
  nodesExpanded = 0;
  /** La última búsqueda se cortó por límite de nodos y devolvió un camino parcial */
  lastPartial = false;

  constructor(map: GameMap) {
    this.map = map;
    const n = map.w * map.h;
    this.g = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.heap = new Int32Array(n + 8);
    this.heapF = new Float32Array(n + 8);
  }

  private push(i: number, f: number) {
    let k = this.heapSize++;
    const H = this.heap, F = this.heapF;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (F[p] <= f) break;
      H[k] = H[p];
      F[k] = F[p];
      k = p;
    }
    H[k] = i;
    F[k] = f;
  }

  private pop(): number {
    const H = this.heap, F = this.heapF;
    const top = H[0];
    const n = --this.heapSize;
    if (n > 0) {
      const li = H[n], lf = F[n];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= n) break;
        if (c + 1 < n && F[c + 1] < F[c]) c++;
        if (F[c] >= lf) break;
        H[k] = H[c];
        F[k] = F[c];
        k = c;
      }
      H[k] = li;
      F[k] = lf;
    }
    return top;
  }

  isPassable(tx: number, ty: number, opts: PathOpts): boolean {
    const m = this.map;
    if (!m.inBounds(tx, ty)) return false;
    if (!m.terrainPassable(tx, ty)) return false;
    const i = ty * m.w + tx;
    const o = m.occ[i];
    if (o === 0) return true;
    if (opts.ignoreOcc && o === opts.ignoreOcc) return true;
    const gate = m.gateOcc[i];
    if (gate !== 0 && opts.canPassGate && opts.canPassGate(gate)) return true;
    return false;
  }

  private inGoal(tx: number, ty: number, gx: number, gy: number, opts: PathOpts): boolean {
    const r = opts.goalRect;
    if (r) return tx >= r.x0 - 1 && tx <= r.x1 + 1 && ty >= r.y0 - 1 && ty <= r.y1 + 1;
    return tx === gx && ty === gy;
  }

  find(sx: number, sy: number, gx: number, gy: number, opts: PathOpts = {}): Waypoint[] | null {
    const m = this.map;
    const W = m.w;
    let stx = Math.floor(sx), sty = Math.floor(sy);
    let gtx = Math.max(0, Math.min(m.w - 1, Math.floor(gx)));
    let gty = Math.max(0, Math.min(m.h - 1, Math.floor(gy)));
    stx = Math.max(0, Math.min(m.w - 1, stx));
    sty = Math.max(0, Math.min(m.h - 1, sty));

    // Si el destino no es transitable y no hay rectángulo objetivo, buscar el tile libre más cercano
    if (!opts.goalRect && !this.isPassable(gtx, gty, opts)) {
      const alt = this.nearestPassable(gtx, gty, opts, 6, stx, sty);
      if (alt) {
        gtx = alt.x;
        gty = alt.y;
      }
    }

    this.lastPartial = false;
    if (stx === gtx && sty === gty && !opts.goalRect) return [{ x: gx, y: gy }];
    if (opts.goalRect && this.inGoal(stx, sty, gtx, gty, opts)) return [];

    const maxNodes = opts.maxNodes ?? 9000;
    this.gen++;
    if (this.gen > 0xfffffff0) {
      this.stamp.fill(0);
      this.closed.fill(0);
      this.gen = 1;
    }
    const gen = this.gen;
    this.heapSize = 0;
    const start = sty * W + stx;
    this.g[start] = 0;
    this.parent[start] = -1;
    this.stamp[start] = gen;
    const hx = (x: number, y: number) => {
      let tx = gtx, ty = gty;
      const r = opts.goalRect;
      if (r) {
        tx = Math.max(r.x0, Math.min(r.x1, x));
        ty = Math.max(r.y0, Math.min(r.y1, y));
      }
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
    };
    this.push(start, hx(stx, sty));
    let best = start;
    let bestH = hx(stx, sty);
    let found = -1;
    let expanded = 0;
    while (this.heapSize > 0) {
      const cur = this.pop();
      if (this.closed[cur] === gen) continue;
      this.closed[cur] = gen;
      const cx = cur % W, cy = (cur / W) | 0;
      if (this.inGoal(cx, cy, gtx, gty, opts) && (opts.goalRect ? this.isPassable(cx, cy, opts) || cur === start : true)) {
        found = cur;
        break;
      }
      const h = hx(cx, cy);
      if (h < bestH) {
        bestH = h;
        best = cur;
      }
      if (++expanded > maxNodes) break;
      const gc = this.g[cur];
      for (let d = 0; d < 8; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (!this.isPassable(nx, ny, opts)) continue;
        if (d >= 4) {
          // sin cortar esquinas
          if (!this.isPassable(cx + DX[d], cy, opts) || !this.isPassable(cx, cy + DY[d], opts)) continue;
        }
        const ni = ny * W + nx;
        if (this.closed[ni] === gen) continue;
        let cost = d >= 4 ? SQRT2 : 1;
        if (m.terrain[ni] === T_SHALLOW) cost *= 1.6;
        const ng = gc + cost;
        if (this.stamp[ni] !== gen || ng < this.g[ni]) {
          this.stamp[ni] = gen;
          this.g[ni] = ng;
          this.parent[ni] = cur;
          // heurística ligeramente inflada: caminos casi óptimos expandiendo muchos menos nodos
          this.push(ni, ng + hx(nx, ny) * 1.2);
        }
      }
    }
    this.nodesExpanded += expanded;
    this.lastPartial = found < 0;
    const end = found >= 0 ? found : best;
    if (end === start) {
      return found >= 0 ? [] : null;
    }
    // reconstruir
    const tiles: number[] = [];
    let c = end;
    while (c !== -1) {
      tiles.push(c);
      c = this.parent[c];
    }
    tiles.reverse();
    const pts: Waypoint[] = tiles.map((t) => ({ x: (t % W) + 0.5, y: ((t / W) | 0) + 0.5 }));
    // destino exacto si se alcanzó el tile objetivo
    if (found >= 0 && !opts.goalRect) {
      pts[pts.length - 1] = { x: gx, y: gy };
      if (Math.floor(gx) !== gtx || Math.floor(gy) !== gty) pts[pts.length - 1] = { x: gtx + 0.5, y: gty + 0.5 };
    }
    return this.smooth({ x: sx, y: sy }, pts, opts);
  }

  /** Suaviza el camino eliminando puntos intermedios con línea de visión directa */
  private smooth(start: Waypoint, pts: Waypoint[], opts: PathOpts): Waypoint[] {
    if (pts.length <= 2) return pts.slice(1).length ? pts.slice(1) : pts;
    const out: Waypoint[] = [];
    let anchor = start;
    let i = 1;
    while (i < pts.length) {
      let j = pts.length - 1;
      // buscar el punto más lejano visible (limitado para rendimiento)
      const limit = Math.min(pts.length - 1, i + 24);
      j = limit;
      while (j > i && !this.lineClear(anchor.x, anchor.y, pts[j].x, pts[j].y, opts)) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  }

  /** Comprueba que todos los tiles tocados por el segmento sean transitables (con margen) */
  lineClear(x0: number, y0: number, x1: number, y1: number, opts: PathOpts): boolean {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const steps = Math.ceil(len * 3);
    if (steps === 0) return true;
    const nx = -dy / (len || 1) * 0.3, ny = dx / (len || 1) * 0.3;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x0 + dx * t, py = y0 + dy * t;
      if (!this.isPassable(Math.floor(px + nx), Math.floor(py + ny), opts)) return false;
      if (!this.isPassable(Math.floor(px - nx), Math.floor(py - ny), opts)) return false;
    }
    return true;
  }

  nearestPassable(tx: number, ty: number, opts: PathOpts, maxR: number, fromX?: number, fromY?: number): Waypoint | null {
    let best: Waypoint | null = null;
    let bestD = Infinity;
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = tx + dx, y = ty + dy;
          if (!this.isPassable(x, y, opts)) continue;
          let d = dx * dx + dy * dy;
          if (fromX !== undefined && fromY !== undefined) d += ((x - fromX) ** 2 + (y - fromY) ** 2) * 0.01;
          if (d < bestD) {
            bestD = d;
            best = { x, y };
          }
        }
      }
      if (best) return best;
    }
    return best;
  }
}
