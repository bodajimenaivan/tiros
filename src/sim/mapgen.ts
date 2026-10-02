// Generador procedural de mapas planetarios con reparto equilibrado de recursos.
import { RNG } from '../core/rng';
import { Noise2D } from '../core/noise';
import { GameMap, T_GROUND, T_ALT, T_HIGH, T_LOW, T_CLIFF, T_SHALLOW, T_DEEP, T_PATH } from './map';
import type { PlanetDef } from '../data/types';
import type { ResKind } from './entity';

export interface ResSpawn {
  kind: ResKind;
  x: number; // tile
  y: number;
  amount: number;
  variant: number;
}
export interface Decor {
  kind: string;
  x: number;
  y: number;
  rot: number;
  scale: number;
  block: boolean;
  size: number;
}
export interface MapGenResult {
  map: GameMap;
  starts: { x: number; y: number }[];
  resources: ResSpawn[];
  animals: { defId: string; x: number; y: number }[];
  holocrons: { x: number; y: number }[];
  decor: Decor[];
}

export const RES_AMOUNT = { tree: 125, bush: 125, nova: 550, ore: 400, carcass: 0 };

export function generateMap(planet: PlanetDef, N: number, teams: number[], seed: number): MapGenResult {
  const rng = new RNG(seed);
  const noise = new Noise2D(seed * 7 + 13);
  const noise2 = new Noise2D(seed * 31 + 5);
  const noise3 = new Noise2D(seed * 101 + 77);
  const map = new GameMap(N, N);
  const P = teams.length;
  const W1 = N + 1;

  // ───── Posiciones iniciales (compañeros de equipo juntos) ─────
  const order = teams.map((t, i) => ({ t: t === 0 ? 100 + i : t, i }));
  order.sort((a, b) => a.t - b.t || a.i - b.i);
  const starts: { x: number; y: number }[] = new Array(P);
  const rot = rng.next() * Math.PI * 2;
  const R = N * (P <= 2 ? 0.34 : 0.37);
  order.forEach((o, k) => {
    const a = rot + (k / P) * Math.PI * 2 + rng.range(-0.08, 0.08);
    const rr = R * rng.range(0.94, 1.02);
    starts[o.i] = { x: Math.round(N / 2 + Math.cos(a) * rr), y: Math.round(N / 2 + Math.sin(a) * rr) };
  });

  // ───── Alturas ─────
  const s = planet.heightScale;
  const amp = planet.heightAmp;
  for (let y = 0; y <= N; y++) {
    for (let x = 0; x <= N; x++) {
      let h = noise.fbm(x * s, y * s, 5) * amp;
      h += noise2.fbm(x * s * 3, y * s * 3, 3) * amp * 0.15;
      if (planet.biome === 'desert') h += Math.abs(noise3.noise(x * 0.09, y * 0.05)) * 0.5; // dunas
      if (planet.cliffs > 0) {
        const p = noise3.fbm(x * s * 1.4 + 50, y * s * 1.4 + 50, 3);
        const thr = 0.38 - planet.cliffs * 0.22;
        if (p > thr) h += 1.9 * Math.min(1, (p - thr) * 18);
      }
      map.heights[y * W1 + x] = h;
    }
  }
  // borde suave y aplanado de bases
  const startH = starts.map((st) => map.heights[st.y * W1 + st.x]);
  for (let y = 0; y <= N; y++) {
    for (let x = 0; x <= N; x++) {
      let h = map.heights[y * W1 + x];
      for (let i = 0; i < P; i++) {
        const d = Math.hypot(x - starts[i].x, y - starts[i].y);
        const flatR = 11, blendR = 18;
        const target = Math.max(startH[i], 0.4);
        if (d < flatR) h = target + (h - target) * 0.08;
        else if (d < blendR) {
          const t = (d - flatR) / (blendR - flatR);
          const sm = t * t * (3 - 2 * t);
          h = target + (h - target) * (0.08 + 0.92 * sm);
        }
      }
      map.heights[y * W1 + x] = h;
    }
  }

  // ───── Líquidos ─────
  const water = planet.water;
  let level = -999;
  if (water) {
    map.liquid = water.kind;
    // ríos
    const rivers = water.rivers ?? 0;
    for (let r = 0; r < rivers; r++) {
      const vertical = rng.chance(0.5);
      const off = rng.range(0.3, 0.7) * N;
      const freq = rng.range(0.02, 0.05);
      const ampR = rng.range(6, 14);
      const width = water.kind === 'lava' ? rng.range(2.2, 3.2) : rng.range(1.6, 2.6);
      for (let y = 0; y <= N; y++) {
        for (let x = 0; x <= N; x++) {
          const along = vertical ? y : x;
          const across = vertical ? x : y;
          const center = off + Math.sin(along * freq + r * 3) * ampR + noise2.noise(along * 0.05, r * 10) * 4;
          const d = Math.abs(across - center);
          if (d < width + 2) {
            const k = Math.max(0, 1 - d / (width + 2));
            map.heights[y * W1 + x] -= k * k * 3.2;
          }
        }
      }
    }
    // nivel del agua por percentil
    const hs = Array.from(map.heights).sort((a, b) => a - b);
    level = hs[Math.floor(hs.length * water.amount)] + 0.02;
    if (water.amount <= 0) level = hs[0] - 1;
    map.waterLevel = level;
    // mantener bases secas
    for (let y = 0; y <= N; y++) {
      for (let x = 0; x <= N; x++) {
        for (let i = 0; i < P; i++) {
          const d = Math.hypot(x - starts[i].x, y - starts[i].y);
          if (d < 15) {
            const k = 1 - d / 15;
            const idx = y * W1 + x;
            const minH = level + 0.35 * k + 0.05;
            if (map.heights[idx] < minH) map.heights[idx] = map.heights[idx] * (1 - k) + minH * k;
          }
        }
      }
    }
  } else {
    map.liquid = 'none';
    map.waterLevel = -999;
  }

  // ───── Clasificación de tiles ─────
  for (let ty = 0; ty < N; ty++) {
    for (let tx = 0; tx < N; tx++) {
      const i = ty * N + tx;
      const a = map.vh(tx, ty), b = map.vh(tx + 1, ty), c = map.vh(tx, ty + 1), d = map.vh(tx + 1, ty + 1);
      const avg = (a + b + c + d) / 4;
      const slope = Math.max(a, b, c, d) - Math.min(a, b, c, d);
      let t = T_GROUND;
      const n = noise2.fbm(tx * 0.08, ty * 0.08, 3);
      if (n > 0.18) t = T_ALT;
      if (avg > amp * 0.55 + 0.8) t = T_HIGH;
      if (water && avg < level + 0.35) t = T_LOW;
      if (slope > 1.05) t = T_CLIFF;
      if (water && avg < level) {
        if (water.kind === 'lava') t = T_DEEP;
        else if (water.kind === 'ice') t = T_SHALLOW;
        else if (water.kind === 'swamp') t = avg < level - 0.9 ? T_DEEP : T_SHALLOW;
        else t = avg < level - 0.3 ? T_DEEP : T_SHALLOW;
      }
      map.terrain[i] = t;
    }
  }

  // ───── Conectividad: unir todas las bases ─────
  const carve = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(len * 2);
    for (let k = 0; k <= steps; k++) {
      const px = x0 + ((x1 - x0) * k) / steps, py = y0 + ((y1 - y0) * k) / steps;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = Math.round(px) + dx, ty = Math.round(py) + dy;
          if (!map.inBounds(tx, ty)) continue;
          const i = ty * N + tx;
          const t = map.terrain[i];
          if (t === T_CLIFF || t === T_DEEP) {
            map.terrain[i] = water && water.kind !== 'lava' && avgTile(map, tx, ty) < level ? T_SHALLOW : T_PATH;
            if (map.terrain[i] === T_PATH && water && avgTile(map, tx, ty) < level + 0.1) raiseTile(map, tx, ty, level + 0.25);
            if (map.terrain[i] === T_PATH) smoothTile(map, tx, ty);
          }
        }
      }
    }
  };
  for (let iter = 0; iter < 12; iter++) {
    const reach = flood(map, starts[0].x, starts[0].y);
    let ok = true;
    for (let i = 1; i < P; i++) {
      if (!reach[starts[i].y * N + starts[i].x]) {
        ok = false;
        // unir con el punto alcanzable más cercano en dirección al centro
        carve(starts[i].x, starts[i].y, N / 2, N / 2);
        carve(starts[0].x, starts[0].y, N / 2, N / 2);
      }
    }
    if (ok) break;
    // re-clasificar pendientes tras suavizado
  }
  // puentes extra en ríos de lava / agua profunda para no depender de un único paso
  if (water && (water.rivers ?? 0) > 0) {
    for (let i = 0; i < P; i++) {
      const j = (i + 1) % P;
      if (i === j) continue;
      const mx = (starts[i].x + starts[j].x) / 2, my = (starts[i].y + starts[j].y) / 2;
      carve(starts[i].x, starts[i].y, mx, my);
      carve(starts[j].x, starts[j].y, mx, my);
    }
  }
  let reach = flood(map, starts[0].x, starts[0].y);

  // ───── Colocación de recursos ─────
  const resources: ResSpawn[] = [];
  const animals: { defId: string; x: number; y: number }[] = [];
  const decor: Decor[] = [];
  const holocrons: { x: number; y: number }[] = [];
  const reserved = new Uint8Array(N * N); // tiles ocupados en generación
  const occupy = (tx: number, ty: number) => {
    reserved[ty * N + tx] = 1;
  };
  const free = (tx: number, ty: number, allowSlope = false) => {
    if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) return false;
    const i = ty * N + tx;
    if (reserved[i] || !reach[i]) return false;
    const t = map.terrain[i];
    if (t === T_CLIFF || t === T_DEEP || t === T_SHALLOW) return false;
    if (!allowSlope && map.slope(tx, ty) > 0.8) return false;
    return true;
  };
  const nearStart = (tx: number, ty: number, r: number, except = -1) => {
    for (let i = 0; i < P; i++) {
      if (i === except) continue;
      if (Math.hypot(tx - starts[i].x, ty - starts[i].y) < r) return true;
    }
    return false;
  };

  // reservar huella del Centro de Mando y un anillo libre
  for (const st of starts) {
    for (let dy = -6; dy <= 6; dy++)
      for (let dx = -6; dx <= 6; dx++) {
        const tx = st.x + dx, ty = st.y + dy;
        if (map.inBounds(tx, ty) && dx * dx + dy * dy <= 30) {
          reserved[ty * N + tx] = 1;
          const t = map.terrain[ty * N + tx];
          if (t === T_CLIFF || t === T_DEEP || t === T_SHALLOW) map.terrain[ty * N + tx] = T_GROUND;
        }
      }
  }
  reach = flood(map, starts[0].x, starts[0].y);
  // liberar el anillo para edificios pero no para recursos
  const cluster = (cx: number, cy: number, count: number, kind: ResKind, amount: number, spread = 1.4): boolean => {
    // comprobar que el centro es razonable
    const placed: [number, number][] = [];
    const cand: [number, number][] = [[cx, cy]];
    let guard = 0;
    while (placed.length < count && guard++ < 400) {
      const base = cand.length ? cand[Math.floor(rng.next() * cand.length)] : [cx, cy];
      const ang = rng.next() * Math.PI * 2;
      const tx = Math.round(base[0] + Math.cos(ang) * spread * rng.next());
      const ty = Math.round(base[1] + Math.sin(ang) * spread * rng.next());
      if (placed.length === 0 && !(tx === cx && ty === cy)) continue;
      if (!free(tx, ty)) continue;
      if (Math.hypot(tx - cx, ty - cy) > 1 + Math.sqrt(count) * 1.1) continue;
      placed.push([tx, ty]);
      occupy(tx, ty);
      cand.push([tx, ty]);
    }
    for (const [tx, ty] of placed) resources.push({ kind, x: tx, y: ty, amount, variant: Math.floor(rng.next() * 4) });
    return placed.length >= Math.ceil(count * 0.6);
  };
  const areaFree = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!free(cx + dx, cy + dy)) return false;
    return true;
  };
  const placeNear = (i: number, minD: number, maxD: number, r: number, fn: (x: number, y: number) => boolean, avoidOthers = 12) => {
    const st = starts[i];
    for (let tries = 0; tries < 200; tries++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(minD, maxD);
      const x = Math.round(st.x + Math.cos(a) * d), y = Math.round(st.y + Math.sin(a) * d);
      if (!map.inBounds(x, y)) continue;
      if (nearStart(x, y, avoidOthers, i)) continue;
      if (!areaFree(x, y, r)) continue;
      if (fn(x, y)) return true;
    }
    // relajar
    for (let tries = 0; tries < 300; tries++) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(minD, maxD + 6);
      const x = Math.round(st.x + Math.cos(a) * d), y = Math.round(st.y + Math.sin(a) * d);
      if (!map.inBounds(x, y)) continue;
      if (!free(x, y)) continue;
      if (fn(x, y)) return true;
    }
    return false;
  };
  const forestBlob = (cx: number, cy: number, n: number, rad: number) => {
    let placed = 0;
    for (let k = 0; k < n * 4 && placed < n; k++) {
      const a = rng.next() * Math.PI * 2;
      const d = Math.sqrt(rng.next()) * rad;
      const tx = Math.round(cx + Math.cos(a) * d * 1.3), ty = Math.round(cy + Math.sin(a) * d);
      if (!free(tx, ty, true)) continue;
      if (nearStart(tx, ty, 8)) continue;
      occupy(tx, ty);
      resources.push({ kind: 'tree', x: tx, y: ty, amount: RES_AMOUNT.tree, variant: rng.next() < 0.7 ? 0 : 1 });
      placed++;
    }
    return placed;
  };

  const passiveAnimals = planet.animals.filter((a) => !['wampa', 'nexu', 'boarwolf', 'acklay'].includes(a));
  const aggressiveAnimals = planet.animals.filter((a) => ['wampa', 'nexu', 'boarwolf', 'acklay'].includes(a));
  const passive = passiveAnimals.length ? passiveAnimals : ['nerf'];

  for (let i = 0; i < P; i++) {
    // bayas
    placeNear(i, 7, 9, 1, (x, y) => cluster(x, y, 6, 'bush', RES_AMOUNT.bush, 1.2));
    // nova principal y secundaria
    placeNear(i, 10, 12.5, 1, (x, y) => cluster(x, y, 8, 'nova', RES_AMOUNT.nova, 1.3));
    placeNear(i, 16, 20, 1, (x, y) => cluster(x, y, 5, 'nova', RES_AMOUNT.nova, 1.2));
    placeNear(i, 22, 28, 1, (x, y) => cluster(x, y, 4, 'nova', RES_AMOUNT.nova, 1.1));
    // mineral
    placeNear(i, 11, 13.5, 1, (x, y) => cluster(x, y, 5, 'ore', RES_AMOUNT.ore, 1.2));
    placeNear(i, 17, 21, 1, (x, y) => cluster(x, y, 5, 'ore', RES_AMOUNT.ore, 1.1));
    // animales de caza
    for (let k = 0; k < 4; k++) {
      placeNear(i, 9, 15, 0, (x, y) => {
        animals.push({ defId: rng.pick(passive), x: x + 0.5, y: y + 0.5 });
        return true;
      });
    }
    // línea de bosque principal + bosquecillos
    placeNear(i, 12, 15, 2, (x, y) => forestBlob(x, y, 60, 5.2) > 35, 13);
    placeNear(i, 13, 18, 1, (x, y) => forestBlob(x, y, 22, 3) > 12, 12);
    placeNear(i, 14, 20, 1, (x, y) => forestBlob(x, y, 18, 2.6) > 10, 12);
    placeNear(i, 18, 24, 1, (x, y) => forestBlob(x, y, 26, 3.4) > 14, 12);
  }

  // ───── Bosques globales ─────
  const fd = planet.forest.density;
  const clusters = Math.round(planet.forest.clusters * (N / 128) ** 2 * 1.8);
  for (let c = 0; c < clusters; c++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = rng.int(4, N - 5), y = rng.int(4, N - 5);
      if (nearStart(x, y, 17)) continue;
      if (!free(x, y, true)) continue;
      forestBlob(x, y, Math.round(rng.range(20, 60) * (0.5 + fd)), rng.range(3, 6.5));
      break;
    }
  }
  // árboles dispersos
  const scattered = Math.round(N * N * 0.004 * fd);
  for (let k = 0; k < scattered; k++) {
    const x = rng.int(2, N - 3), y = rng.int(2, N - 3);
    if (nearStart(x, y, 14) || !free(x, y)) continue;
    occupy(x, y);
    resources.push({ kind: 'tree', x, y, amount: RES_AMOUNT.tree, variant: rng.next() < 0.5 ? 0 : 1 });
  }

  // ───── Recursos disputados en el centro ─────
  const extraPiles = Math.max(3, Math.round(P * 2.5));
  for (let k = 0; k < extraPiles; k++) {
    for (let tries = 0; tries < 60; tries++) {
      const a = rng.next() * Math.PI * 2, d = rng.range(0, N * 0.28);
      const x = Math.round(N / 2 + Math.cos(a) * d), y = Math.round(N / 2 + Math.sin(a) * d);
      if (nearStart(x, y, 20) || !areaFree(x, y, 1)) continue;
      cluster(x, y, rng.int(4, 6), k % 2 === 0 ? 'nova' : 'ore', k % 2 === 0 ? RES_AMOUNT.nova : RES_AMOUNT.ore, 1.2);
      break;
    }
  }
  // manadas extra y criaturas agresivas
  const herds = Math.round(P * 1.5 + N / 40);
  for (let k = 0; k < herds; k++) {
    for (let tries = 0; tries < 40; tries++) {
      const x = rng.int(4, N - 5), y = rng.int(4, N - 5);
      if (nearStart(x, y, 22) || !free(x, y)) continue;
      const kind = rng.pick(passive);
      const n = rng.int(2, 4);
      for (let j = 0; j < n; j++) animals.push({ defId: kind, x: x + 0.5 + rng.range(-1.5, 1.5), y: y + 0.5 + rng.range(-1.5, 1.5) });
      break;
    }
  }
  if (aggressiveAnimals.length) {
    const nAgg = Math.round(P * 1.2 + 1);
    for (let k = 0; k < nAgg; k++) {
      for (let tries = 0; tries < 40; tries++) {
        const x = rng.int(4, N - 5), y = rng.int(4, N - 5);
        if (nearStart(x, y, 24) || !free(x, y)) continue;
        animals.push({ defId: rng.pick(aggressiveAnimals), x: x + 0.5, y: y + 0.5 });
        break;
      }
    }
  }
  // bayas extra
  for (let k = 0; k < P; k++) {
    for (let tries = 0; tries < 40; tries++) {
      const x = rng.int(6, N - 7), y = rng.int(6, N - 7);
      if (nearStart(x, y, 22) || !areaFree(x, y, 1)) continue;
      cluster(x, y, 5, 'bush', RES_AMOUNT.bush, 1.2);
      break;
    }
  }

  // ───── Holocrones ─────
  const nHolo = Math.max(3, Math.min(7, P + 1));
  const holoSpots: { x: number; y: number }[] = [{ x: N / 2, y: N / 2 }];
  for (let k = 1; k < nHolo; k++) {
    const a = rot + ((k - 0.5) / (nHolo - 1)) * Math.PI * 2;
    holoSpots.push({ x: N / 2 + Math.cos(a) * N * 0.24, y: N / 2 + Math.sin(a) * N * 0.24 });
  }
  for (const h of holoSpots) {
    let done = false;
    for (let r = 0; r < 10 && !done; r++) {
      for (let tries = 0; tries < 20; tries++) {
        const x = Math.round(h.x + rng.range(-r, r)), y = Math.round(h.y + rng.range(-r, r));
        if (!free(x, y)) continue;
        occupy(x, y);
        holocrons.push({ x: x + 0.5, y: y + 0.5 });
        done = true;
        break;
      }
    }
  }

  // ───── Monumentos del paisaje (bloquean) ─────
  const nLand = Math.max(2, Math.round((N / 64) * 1.5));
  for (let k = 0; k < nLand; k++) {
    const kind = planet.landmarks[k % planet.landmarks.length];
    const size = landmarkSize(kind);
    for (let tries = 0; tries < 80; tries++) {
      const x = rng.int(size + 2, N - size - 3), y = rng.int(size + 2, N - size - 3);
      if (nearStart(x, y, 20)) continue;
      let ok = true;
      for (let dy = 0; dy < size && ok; dy++) for (let dx = 0; dx < size && ok; dx++) if (!free(x + dx, y + dy, true)) ok = false;
      if (!ok) continue;
      for (let dy = 0; dy < size; dy++)
        for (let dx = 0; dx < size; dx++) {
          occupy(x + dx, y + dy);
          map.occ[(y + dy) * N + x + dx] = -1;
        }
      decor.push({ kind, x: x + size / 2, y: y + size / 2, rot: rng.int(0, 3) * (Math.PI / 2) + rng.range(-0.2, 0.2), scale: 1, block: true, size });
      break;
    }
  }
  // decoración libre (no bloquea)
  const nDecor = Math.round(N * N / 55);
  for (let k = 0; k < nDecor; k++) {
    const x = rng.range(1, N - 1), y = rng.range(1, N - 1);
    const tx = Math.floor(x), ty = Math.floor(y);
    const t = map.terrain[ty * N + tx];
    if (t === T_DEEP || reserved[ty * N + tx]) continue;
    if (nearStart(tx, ty, 6)) continue;
    decor.push({ kind: rng.pick(planet.decor), x, y, rot: rng.next() * Math.PI * 2, scale: rng.range(0.6, 1.3), block: false, size: 0 });
  }

  // re-verificar conectividad tras landmarks; si rompieron algo, quitarlos
  const reach2 = flood(map, starts[0].x, starts[0].y);
  for (let i = 1; i < P; i++) {
    if (!reach2[starts[i].y * N + starts[i].x]) {
      for (let k = 0; k < N * N; k++) if (map.occ[k] === -1) map.occ[k] = 0;
      for (const d of decor) d.block = false;
      break;
    }
  }

  return { map, starts, resources, animals, holocrons, decor };
}

export function landmarkSize(kind: string): number {
  const big = ['star_destroyer_wreck', 'sandcrawler', 'echo_base', 'ewok_village', 'theed_ruins', 'droid_foundry', 'wookiee_village', 'kachirho_tree', 'massassi_temple', 'mining_facility', 'skyscraper', 'senate_dome', 'citadel_tower', 'imperial_factory', 'arena'];
  const mid = ['atat_wreck', 'shield_generator', 'hive_spire', 'ion_cannon', 'ruin_pyramid', 'rebel_hangar', 'dark_cave', 'xwing_wreck', 'landing_pad', 'niima_outpost', 'jedi_ruin', 'giant_flower', 'lava_collector', 'sith_spire', 'bunker', 'rebel_bunker_door', 'trench', 'catamaran_dock', 'farm_dome', 'sarlacc'];
  if (big.includes(kind)) return 6;
  if (mid.includes(kind)) return 4;
  return 3;
}

function avgTile(map: GameMap, tx: number, ty: number) {
  return (map.vh(tx, ty) + map.vh(tx + 1, ty) + map.vh(tx, ty + 1) + map.vh(tx + 1, ty + 1)) / 4;
}
function raiseTile(map: GameMap, tx: number, ty: number, h: number) {
  const W1 = map.w + 1;
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const i = (ty + dy) * W1 + tx + dx;
    if (map.heights[i] < h) map.heights[i] = h;
  }
}
function smoothTile(map: GameMap, tx: number, ty: number) {
  const W1 = map.w + 1;
  const avg = avgTile(map, tx, ty);
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const i = (ty + dy) * W1 + tx + dx;
    map.heights[i] = map.heights[i] * 0.3 + avg * 0.7;
  }
}

export function flood(map: GameMap, sx: number, sy: number): Uint8Array {
  const N = map.w;
  const out = new Uint8Array(map.w * map.h);
  const stack: number[] = [sy * N + sx];
  out[sy * N + sx] = 1;
  while (stack.length) {
    const c = stack.pop()!;
    const cx = c % N, cy = (c / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!map.inBounds(nx, ny)) continue;
      const ni = ny * N + nx;
      if (out[ni]) continue;
      const t = map.terrain[ni];
      if (t === T_CLIFF || t === T_DEEP || map.occ[ni] !== 0) continue;
      out[ni] = 1;
      stack.push(ni);
    }
  }
  return out;
}

export { T_GROUND, T_ALT, T_HIGH, T_LOW, T_CLIFF, T_SHALLOW, T_DEEP, T_PATH };
