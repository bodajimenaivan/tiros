// Mundo de simulación: entidades, jugadores, tick fijo, niebla de guerra, victoria y API de órdenes.
import { RNG } from '../core/rng';
import type { BuildingDef, Cost, Era, PlanetDef, ResourceType, UnitDef } from '../data/types';
import { RESOURCE_TYPES } from '../data/types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { TECHS, ERA_REQ_BUILDINGS, ERA_NAMES } from '../data/techs';
import { CIVS } from '../data/civs';
import { planetDef } from '../data/planets';
import { GameMap, T_SHALLOW, T_DEEP, T_CLIFF } from './map';
import { Pathfinder, type PathOpts } from './pathfinding';
import { Entity, type Order, type QueueItem } from './entity';
import { Player, techAvailable } from './player';
import { SpatialHash } from './spatial';
import { generateMap, type Decor, RES_AMOUNT } from './mapgen';
import type { GameEvent, GameSetup, Projectile } from './types';
import { MAP_SIZES, START_RES } from './types';
import { updateUnit, separation, updateAnimal } from './behavior';
import { updateBuildingCombat, updateProjectiles, damageEntity } from './combat';

export const TICK = 1 / 20;
export const HOLOCRON_RATE = 0.45; // nova/s por holocrón

export class World {
  setup: GameSetup;
  planet: PlanetDef;
  map: GameMap;
  players: Player[] = [];
  entities = new Map<number, Entity>();
  units: Entity[] = [];
  buildings: Entity[] = [];
  resources: Entity[] = [];
  holocrons: Entity[] = [];
  corpses: Entity[] = [];
  decor: Decor[] = [];
  nextId = 1;
  time = 0;
  tickN = 0;
  rng: RNG;
  pf: Pathfinder;
  unitHash: SpatialHash;
  staticHash: SpatialHash;
  events: GameEvent[] = [];
  projectiles: Projectile[] = [];
  nextProjId = 1;
  pathQueue: Entity[] = [];
  pathBudget = 0;
  gameOver = false;
  winnerTeam = -1;
  winners: number[] = [];
  market: Record<'food' | 'carbon' | 'ore', number> = { food: 100, carbon: 100, ore: 130 };
  holocronHold = { team: -1, since: 0 };
  monumentHolder = 0;
  powerDirty = true;
  tmp: Entity[] = [];
  tmp2: Entity[] = [];
  /** callback opcional para IA */
  onTick: ((w: World) => void) | null = null;
  treatyUntil = 0;

  constructor(setup: GameSetup) {
    this.setup = setup;
    this.planet = planetDef(setup.planet);
    this.rng = new RNG(setup.seed ^ 0x5bd1e995);
    const N = MAP_SIZES[setup.size].tiles;
    const teams = setup.players.map((p) => p.team);
    const gen = generateMap(this.planet, N, teams, setup.seed);
    this.map = gen.map;
    this.decor = gen.decor;
    this.pf = new Pathfinder(this.map);
    this.unitHash = new SpatialHash(N, N, 4);
    this.staticHash = new SpatialHash(N, N, 4);
    this.treatyUntil = (setup.treaty ?? 0) * 60;

    // Gaia
    const gaia = new Player(0, 'Naturaleza', CIVS['rebels'], -1, 0, false);
    gaia.gaia = true;
    this.players.push(gaia);
    setup.players.forEach((ps, i) => {
      const civ = CIVS[ps.civ] ?? CIVS['empire'];
      const p = new Player(i + 1, ps.name, civ, ps.color, ps.team, ps.human);
      p.difficulty = ps.difficulty;
      p.popMax = setup.popMax;
      const sr = START_RES[setup.startRes].res;
      for (const r of RESOURCE_TYPES) p.res[r] = sr[r] + (ps.bonusRes?.[r] ?? 0);
      if (!p.human) {
        // dificultad: modificadores económicos de la IA
        const m = p.difficulty === 'easy' ? 0.8 : p.difficulty === 'extreme' ? 1.2 : 1;
        if (m !== 1) {
          p.addMods([
            { target: { player: true }, stat: 'gatherFood', mul: m },
            { target: { player: true }, stat: 'gatherCarbon', mul: m },
            { target: { player: true }, stat: 'gatherNova', mul: m },
            { target: { player: true }, stat: 'gatherOre', mul: m },
          ]);
        }
      }
      this.players.push(p);
    });
    // Diplomacia por equipos
    const n = this.players.length;
    for (const p of this.players) {
      p.diplo = new Array(n).fill('enemy');
      p.diplo[p.id] = 'ally';
      p.diplo[0] = 'neutral';
    }
    for (const a of this.players) {
      for (const b of this.players) {
        if (a.id === 0 || b.id === 0 || a.id === b.id) continue;
        if (a.team > 0 && a.team === b.team) a.diplo[b.id] = 'ally';
      }
    }
    // Bonus de equipo
    for (const a of this.players) {
      if (a.id === 0) continue;
      for (const b of this.players) {
        if (b.id === 0) continue;
        if (a.id === b.id || a.isAlly(b.id)) {
          const tb = b.civ.teamBonus.mods;
          if (tb && (a.id !== b.id || true)) a.addMods(tb);
        }
      }
    }
    // Niebla
    for (const p of this.players) {
      p.explored = new Uint8Array(N * N);
      p.visible = new Uint8Array(N * N);
      if (setup.reveal !== 'normal') p.explored.fill(1);
    }

    // Recursos
    for (const r of gen.resources) this.spawnResource(r.kind, r.x, r.y, r.amount, r.variant);
    for (const a of gen.animals) {
      const tx = Math.floor(a.x), ty = Math.floor(a.y);
      if (!this.map.passable(tx, ty)) continue;
      this.spawnUnit(a.defId, 0, a.x, a.y);
    }
    for (const h of gen.holocrons) {
      const e = new Entity(this.nextId++, 'holocron', 'holocron', 0, h.x, h.y);
      this.entities.set(e.id, e);
      this.holocrons.push(e);
    }

    // Jugadores: centro de mando + trabajadores + explorador
    setup.players.forEach((ps, i) => {
      const p = this.players[i + 1];
      const st = gen.starts[i];
      p.startX = st.x;
      p.startY = st.y;
      const cc = this.placeBuilding(p.id, 'command_center', st.x - 2, st.y - 2, true);
      if (cc) this.completeBuilding(cc, true);
      const nWorkers = setup.startRes === 'deathmatch' ? 6 : 4;
      for (let k = 0; k < nWorkers; k++) {
        const a = (k / nWorkers) * Math.PI * 2 + 0.6;
        this.spawnUnit('worker', p.id, st.x + Math.cos(a) * 3.2, st.y + Math.sin(a) * 3.2);
      }
      this.spawnUnit('scout', p.id, st.x + 3.5, st.y + 3.5);
      let bonusPop = 0;
      for (const bu of ps.bonusUnits ?? []) {
        for (let k = 0; k < bu.count; k++) {
          const a = this.rng.next() * Math.PI * 2;
          const d = 5 + this.rng.next() * 3;
          const spot = this.findFreeSpot(st.x + Math.cos(a) * d, st.y + Math.sin(a) * d, 4);
          if (spot) {
            this.spawnUnit(p.resolveUnit(bu.id), p.id, spot.x, spot.y);
            bonusPop++;
          }
        }
      }
      // campamento: refugios gratuitos para alojar las tropas iniciales
      for (let k = 0; k < Math.ceil(bonusPop / 5); k++) {
        for (let tries = 0; tries < 30; tries++) {
          const a = this.rng.next() * Math.PI * 2;
          const d = 6 + this.rng.next() * 4;
          const tx = Math.round(st.x + Math.cos(a) * d - 1), ty = Math.round(st.y + Math.sin(a) * d - 1);
          if (!this.canPlace(p.id, 'shelter', tx, ty, true)) continue;
          const sh = this.placeBuilding(p.id, 'shelter', tx, ty, true);
          if (sh) this.completeBuilding(sh, true);
          break;
        }
      }
      // era inicial
      if (setup.startEra > 1) {
        for (let e = 2; e <= setup.startEra; e++) this.advanceEra(p, e as Era, true);
      }
      p.stats.eraTimes = [0];
      // descubrir alrededor de la base
      this.recomputePop(p);
    });
    if (setup.reveal === 'all') for (const p of this.players) p.revealUntil = 1e9;
    this.updateFog(true);
  }

  // ─────────────────────────── Utilidades ───────────────────────────

  get N() {
    return this.map.w;
  }

  emit(e: GameEvent) {
    this.events.push(e);
  }

  msg(owner: number, text: string, color?: string) {
    this.emit({ t: 'msg', owner, text, color });
  }

  get(id: number): Entity | undefined {
    const e = this.entities.get(id);
    return e && e.alive ? e : undefined;
  }

  teamKey(pid: number): number {
    const p = this.players[pid];
    return p.team > 0 ? p.team : 100 + pid;
  }

  isEnemy(a: number, b: number): boolean {
    if (a === b) return false;
    if (a === 0 || b === 0) return false;
    if (this.time < this.treatyUntil) return false;
    return this.players[a].diplo[b] === 'enemy';
  }

  /** ¿Puede `e` atacar a `t`? */
  hostile(e: Entity, t: Entity): boolean {
    if (!t.alive || t.kind === 'resource' || t.kind === 'holocron' || t.garrisonedIn) return false;
    if (t.owner === 0) return !!t.ud && t.ud.cls === 'animal' && e.owner !== 0;
    if (e.owner === 0) return t.owner !== 0 && t.kind === 'unit';
    return this.isEnemy(e.owner, t.owner);
  }

  hostileOwner(owner: number, t: Entity): boolean {
    if (!t.alive || t.kind === 'resource' || t.kind === 'holocron') return false;
    if (t.owner === 0) return !!t.ud && t.ud.cls === 'animal';
    return this.isEnemy(owner, t.owner);
  }

  /** ¿Está la unidad en el anillo de tiles adyacente (o dentro) de la huella de t? */
  adjacent(e: Entity, t: Entity): boolean {
    const ux = Math.floor(e.x), uy = Math.floor(e.y);
    const x0 = t.kind === 'building' ? t.tx : Math.floor(t.x);
    const y0 = t.kind === 'building' ? t.ty : Math.floor(t.y);
    const sz = t.kind === 'building' ? t.size : 1;
    return ux >= x0 - 1 && ux <= x0 + sz && uy >= y0 - 1 && uy <= y0 + sz && this.distTo(e, t) < 1.2;
  }

  unitDefOf(e: Entity): UnitDef {
    return e.ud!;
  }

  /** Estadísticas efectivas */
  st(e: Entity) {
    return this.players[e.owner].stats_of(e.defId);
  }

  distTo(e: Entity, t: Entity): number {
    if (t.kind === 'building') {
      const x0 = t.tx, y0 = t.ty, x1 = t.tx + t.size, y1 = t.ty + t.size;
      const dx = Math.max(x0 - e.x, 0, e.x - x1);
      const dy = Math.max(y0 - e.y, 0, e.y - y1);
      return Math.hypot(dx, dy) - e.radius;
    }
    if (t.kind === 'resource') {
      const x0 = Math.floor(t.x), y0 = Math.floor(t.y);
      const dx = Math.max(x0 - e.x, 0, e.x - (x0 + 1));
      const dy = Math.max(y0 - e.y, 0, e.y - (y0 + 1));
      return Math.hypot(dx, dy) - e.radius;
    }
    return Math.hypot(t.x - e.x, t.y - e.y) - e.radius - t.radius;
  }

  // ─────────────────────────── Creación ───────────────────────────

  spawnResource(kind: Entity['resKind'], tx: number, ty: number, amount: number, variant = 0): Entity {
    const e = new Entity(this.nextId++, 'resource', kind!, 0, tx + 0.5, ty + 0.5);
    e.resKind = kind;
    e.resType = kind === 'tree' ? 'carbon' : kind === 'nova' ? 'nova' : kind === 'ore' ? 'ore' : 'food';
    e.amount = amount;
    e.hp = e.maxHp = amount;
    e.variant = variant;
    e.angle = this.rng.next() * Math.PI * 2;
    e.size = 1;
    e.tx = tx;
    e.ty = ty;
    this.entities.set(e.id, e);
    this.resources.push(e);
    if (kind !== 'carcass') this.map.occ[ty * this.map.w + tx] = e.id;
    this.staticHash.insert(e);
    return e;
  }

  spawnUnit(defId: string, owner: number, x: number, y: number): Entity {
    const ud = UNITS[defId];
    const e = new Entity(this.nextId++, 'unit', defId, owner, x, y);
    e.ud = ud;
    const p = this.players[owner];
    const s = p.stats_of(defId);
    e.hp = e.maxHp = s.hp;
    e.angle = this.rng.next() * Math.PI * 2;
    e.pangle = e.angle;
    e.homeX = x;
    e.homeY = y;
    e.createdAt = this.time;
    e.scanAt = this.time + this.rng.next() * 0.5;
    if (ud.air) e.flyZ = ud.flyHeight ?? 6;
    e.z = this.map.surfaceAt(x, y) + e.flyZ;
    if (ud.cls === 'worker' || ud.cls === 'jediMaster') e.stance = ud.cls === 'worker' ? 'passive' : 'defensive';
    this.entities.set(e.id, e);
    this.units.push(e);
    if (owner !== 0) {
      p.pop += ud.pop;
    }
    return e;
  }

  /** Comprueba si el edificio puede colocarse en (tx,ty) (esquina superior izquierda) */
  canPlace(pid: number, defId: string, tx: number, ty: number, ignoreFog = false): boolean {
    const bd = BUILDINGS[defId];
    if (!bd) return false;
    const sz = bd.size;
    const m = this.map;
    const p = this.players[pid];
    let hmin = 1e9, hmax = -1e9;
    for (let dy = 0; dy < sz; dy++) {
      for (let dx = 0; dx < sz; dx++) {
        const x = tx + dx, y = ty + dy;
        if (!m.inBounds(x, y)) return false;
        if (!m.buildable(x, y)) return false;
        if (!ignoreFog && p.explored && !p.explored[y * m.w + x] && pid !== 0) return false;
        for (const [vx, vy] of [[x, y], [x + 1, y + 1]]) {
          const h = m.vh(vx, vy);
          hmin = Math.min(hmin, h);
          hmax = Math.max(hmax, h);
        }
      }
    }
    if (hmax - hmin > (bd.wall ? 1.6 : 1.25)) return false;
    // las unidades bloquean (excepto propias, que se apartan)
    if (!bd.walkable) {
      this.unitHash.query(tx + sz / 2, ty + sz / 2, sz * 0.75, this.tmp2);
      for (const u of this.tmp2) {
        if (u.isAir || !u.alive) continue;
        if (u.owner !== pid && u.owner !== 0 && u.x > tx && u.x < tx + sz && u.y > ty && u.y < ty + sz) return false;
      }
    }
    return true;
  }

  placeBuilding(pid: number, defId: string, tx: number, ty: number, free = false): Entity | null {
    const bd = BUILDINGS[defId];
    const p = this.players[pid];
    if (!free) {
      if (!this.canPlace(pid, defId, tx, ty)) return null;
      const cost = p.stats_of(defId).cost;
      if (!p.canAfford(cost)) return null;
      if (bd.maxCount && this.buildings.filter((b) => b.owner === pid && b.defId === defId && b.alive).length >= bd.maxCount) return null;
      p.pay(cost);
    }
    const e = new Entity(this.nextId++, 'building', defId, pid, tx + bd.size / 2, ty + bd.size / 2);
    e.bd = bd;
    e.size = bd.size;
    e.tx = tx;
    e.ty = ty;
    const s = p.stats_of(defId);
    e.maxHp = s.hp;
    e.hp = Math.max(1, s.hp * 0.05);
    e.built = false;
    e.progress = 0;
    e.createdAt = this.time;
    e.angle = 0;
    this.entities.set(e.id, e);
    this.buildings.push(e);
    const m = this.map;
    for (let dy = 0; dy < bd.size; dy++) {
      for (let dx = 0; dx < bd.size; dx++) {
        const i = (ty + dy) * m.w + tx + dx;
        if (bd.walkable) m.farmOcc[i] = e.id;
        else m.occ[i] = e.id;
        if (bd.gate) m.gateOcc[i] = e.id;
      }
    }
    m.version++;
    this.staticHash.insert(e);
    // apartar unidades propias atrapadas
    if (!bd.walkable) {
      this.unitHash.query(e.x, e.y, bd.size, this.tmp2);
      for (const u of this.tmp2) {
        if (u.isAir) continue;
        if (u.x >= tx - 0.1 && u.x <= tx + bd.size + 0.1 && u.y >= ty - 0.1 && u.y <= ty + bd.size + 0.1) {
          const spot = this.findFreeSpot(u.x, u.y, 6);
          if (spot) {
            u.x = u.px = spot.x;
            u.y = u.py = spot.y;
            u.path = null;
          }
        }
      }
    }
    if (bd.farm) e.farmFood = 300 + p.eco('farmFood');
    this.emit({ t: 'placed', id: e.id, owner: pid, defId });
    return e;
  }

  completeBuilding(e: Entity, instant = false) {
    if (e.built && !instant) return;
    e.built = true;
    e.progress = 1;
    e.hp = instant ? e.maxHp : Math.max(e.hp, 1);
    if (instant) e.hp = e.maxHp;
    const p = this.players[e.owner];
    this.recomputePop(p);
    this.powerDirty = true;
    if (!instant) {
      p.stats.buildingsBuilt++;
      this.emit({ t: 'built', id: e.id, owner: e.owner, defId: e.defId });
    }
    if (e.bd!.monument) {
      e.monumentTimer = this.setup.monumentTime ?? 360;
      this.emit({ t: 'monument', owner: e.owner, started: true });
      for (const q of this.players) if (q.id) this.msg(q.id, `${p.name} ha completado ${p.civ.monumentName}. ¡Victoria en ${Math.round(e.monumentTimer / 60)} minutos si sigue en pie!`, '#ffd23d');
    }
  }

  recomputePop(p: Player) {
    let cap = 0;
    for (const b of this.buildings) {
      if (b.owner !== p.id || !b.alive || !b.built) continue;
      cap += b.bd!.pop ?? 0;
    }
    p.popCap = Math.min(p.popMax, cap);
  }

  /** Busca un punto libre cercano para colocar una unidad */
  findFreeSpot(x: number, y: number, maxR: number): { x: number; y: number } | null {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (this.map.passable(tx, ty) && this.map.farmOcc[ty * this.map.w + tx] === 0) {
      this.unitHash.query(x, y, 0.5, this.tmp2);
      if (this.tmp2.length < 2) return { x, y };
    }
    for (let r = 1; r <= maxR; r++) {
      const cands: { x: number; y: number }[] = [];
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const nx = tx + dx, ny = ty + dy;
          if (!this.map.passable(nx, ny)) continue;
          cands.push({ x: nx + 0.5 + this.rng.range(-0.25, 0.25), y: ny + 0.5 + this.rng.range(-0.25, 0.25) });
        }
      if (cands.length) {
        // preferir el menos poblado
        let best = cands[0], bestN = 99;
        for (const c of cands) {
          this.unitHash.query(c.x, c.y, 0.6, this.tmp2);
          if (this.tmp2.length < bestN) {
            bestN = this.tmp2.length;
            best = c;
          }
          if (bestN === 0) break;
        }
        return best;
      }
    }
    return null;
  }

  /** Punto de aparición alrededor de un edificio, preferentemente hacia el punto de reunión */
  spawnPointFor(b: Entity): { x: number; y: number } | null {
    const tx = b.tx, ty = b.ty, sz = b.size;
    const cands: { x: number; y: number; d: number }[] = [];
    const rx = b.rallyX >= 0 ? b.rallyX : b.x + sz, ry = b.rallyY >= 0 ? b.rallyY : b.y + sz;
    for (let r = 0; r < 4; r++) {
      for (let x = tx - 1 - r; x <= tx + sz + r; x++) {
        for (let y = ty - 1 - r; y <= ty + sz + r; y++) {
          const edge = x === tx - 1 - r || x === tx + sz + r || y === ty - 1 - r || y === ty + sz + r;
          if (!edge) continue;
          if (!this.map.passable(x, y)) continue;
          cands.push({ x: x + 0.5, y: y + 0.5, d: (x + 0.5 - rx) ** 2 + (y + 0.5 - ry) ** 2 });
        }
      }
      if (cands.length) break;
    }
    if (!cands.length) return null;
    cands.sort((a, b2) => a.d - b2.d);
    // elegir entre los mejores el menos poblado
    for (let k = 0; k < Math.min(6, cands.length); k++) {
      const c = cands[k];
      this.unitHash.query(c.x, c.y, 0.45, this.tmp2);
      if (this.tmp2.length === 0) return { x: c.x + this.rng.range(-0.2, 0.2), y: c.y + this.rng.range(-0.2, 0.2) };
    }
    const c = cands[Math.floor(this.rng.next() * Math.min(6, cands.length))];
    return { x: c.x + this.rng.range(-0.3, 0.3), y: c.y + this.rng.range(-0.3, 0.3) };
  }

  // ─────────────────────────── Destrucción ───────────────────────────

  removeEntity(e: Entity) {
    if (!e.alive) return;
    e.alive = false;
    e.deathTime = this.time;
    const m = this.map;
    if (e.kind === 'unit') {
      if (e.owner !== 0) this.players[e.owner].pop -= e.ud!.pop;
      if (e.holocronId) this.dropHolocron(e);
      this.corpses.push(e);
    } else if (e.kind === 'building') {
      for (let dy = 0; dy < e.size; dy++)
        for (let dx = 0; dx < e.size; dx++) {
          const i = (e.ty + dy) * m.w + e.tx + dx;
          if (m.occ[i] === e.id) m.occ[i] = 0;
          if (m.farmOcc[i] === e.id) m.farmOcc[i] = 0;
          if (m.gateOcc[i] === e.id) m.gateOcc[i] = 0;
        }
      m.version++;
      this.staticHash.remove(e);
      // reembolsar cola
      const p = this.players[e.owner];
      for (const q of e.prodQueue) {
        if (q.kind === 'tech') p.queuedTechs.delete(q.id);
        if (q.kind === 'unit' && q.progress > 0) p.popReserved -= UNITS[q.id].pop;
      }
      e.prodQueue = [];
      // holocrones guardados
      for (const hid of e.holocrons) {
        const h = this.entities.get(hid);
        if (h) {
          h.owner = 0;
          h.alive = true;
          const spot = this.findFreeSpot(e.x + this.rng.range(-2, 2), e.y + this.rng.range(-2, 2), 5) ?? { x: e.x, y: e.y };
          h.x = h.px = spot.x;
          h.y = h.py = spot.y;
          h.templeId = 0;
          h.carrierId = 0;
        }
      }
      e.holocrons = [];
      this.ungarrison(e, false);
      this.recomputePop(p);
      this.powerDirty = true;
      this.corpses.push(e);
    } else if (e.kind === 'resource') {
      const i = e.ty * m.w + e.tx;
      if (m.occ[i] === e.id) {
        m.occ[i] = 0;
        m.version++;
      }
      this.staticHash.remove(e);
    }
  }

  dropHolocron(carrier: Entity) {
    const h = this.entities.get(carrier.holocronId);
    carrier.holocronId = 0;
    if (!h) return;
    h.owner = 0;
    h.carrierId = 0;
    h.templeId = 0;
    h.alive = true;
    h.x = h.px = carrier.x;
    h.y = h.py = carrier.y;
    this.emit({ t: 'holocron', owner: carrier.owner, action: 'drop' });
  }

  // ─────────────────────────── Tick ───────────────────────────

  step() {
    if (this.gameOver) {
      this.time += TICK;
      return;
    }
    this.tickN++;
    this.time += TICK;
    const t = this.time;

    // hash espacial de unidades
    this.unitHash.clear();
    for (const u of this.units) if (u.alive && !u.garrisonedIn) this.unitHash.insert(u);

    // caminos pendientes (presupuesto por tick)
    this.processPathQueue();

    if (this.powerDirty || this.tickN % 40 === 0) this.updatePower();

    // unidades
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.alive) continue;
      u.px = u.x;
      u.py = u.y;
      u.pangle = u.angle;
      if (u.garrisonedIn) {
        if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + 0.6 * TICK);
        continue;
      }
      if (u.owner === 0) updateAnimal(this, u);
      else updateUnit(this, u);
    }
    separation(this);
    for (const u of this.units) {
      if (!u.alive || u.garrisonedIn) continue;
      u.z = this.map.surfaceAt(u.x, u.y) + u.flyZ;
      if (!u.isAir && this.map.terrain[Math.floor(u.y) * this.map.w + Math.floor(u.x)] === T_SHALLOW && this.map.liquid !== 'ice')
        u.z = Math.max(u.z, this.map.waterLevel - 0.25);
    }

    // edificios
    for (const b of this.buildings) {
      if (!b.alive) continue;
      if (b.built) {
        this.updateProduction(b);
        if (b.bd!.attack) updateBuildingCombat(this, b);
        if (b.monumentTimer > 0) {
          b.monumentTimer -= TICK;
          if (b.monumentTimer <= 0) this.declareVictory(this.teamKey(b.owner), `${this.players[b.owner].name} ha mantenido su Monumento en pie.`);
        }
        if (b.holocrons.length) {
          const p = this.players[b.owner];
          p.res.nova += b.holocrons.length * HOLOCRON_RATE * p.eco('holocronRate') * TICK;
        }
      }
      // fuego por daño (efecto visual)
      b.fireDamage = b.built ? 1 - b.hp / b.maxHp : 0;
    }

    updateProjectiles(this);

    // limpieza
    if (this.tickN % 20 === 0) this.cleanup();
    if (this.tickN % 10 === 0) this.updateFog(false);
    if (this.tickN % 20 === 5) this.checkVictory();
    if (this.tickN % 100 === 0) {
      for (const p of this.players) if (p.id) p.stats.timeline.push({ t, score: p.score(), pop: p.pop });
    }
    if (this.onTick) this.onTick(this);
  }

  cleanup() {
    const t = this.time;
    if (this.units.length > 64 && this.units.some((u) => !u.alive)) this.units = this.units.filter((u) => u.alive);
    if (this.buildings.some((b) => !b.alive)) this.buildings = this.buildings.filter((b) => b.alive);
    if (this.resources.some((r) => !r.alive)) this.resources = this.resources.filter((r) => r.alive);
    this.corpses = this.corpses.filter((c) => t - c.deathTime < 12);
    for (const [id, e] of this.entities) {
      if (!e.alive && e.kind !== 'holocron' && t - e.deathTime > 13) this.entities.delete(id);
    }
  }

  // ─────────────────────────── Caminos ───────────────────────────

  pathOpts(e: Entity, extra?: Partial<PathOpts>): PathOpts {
    const owner = e.owner;
    return {
      canPassGate: (gid) => {
        const g = this.entities.get(gid);
        return !!g && g.alive && g.built && this.players[g.owner].isAlly(owner);
      },
      ...extra,
    };
  }

  requestPath(e: Entity, x: number, y: number, goal?: Entity) {
    e.pathGoalX = x;
    e.pathGoalY = y;
    e.targetId = goal ? goal.id : e.targetId;
    if (e.isAir) {
      e.path = [{ x, y }];
      e.pathIdx = 0;
      e.pathPending = false;
      return;
    }
    // ruta directa si hay línea de visión y es corta
    const opts = this.pathOpts(e, goal ? this.goalOpts(goal) : undefined);
    const d = Math.hypot(x - e.x, y - e.y);
    if (!goal && d < 14 && this.pf.lineClear(e.x, e.y, x, y, opts) && this.map.passable(Math.floor(x), Math.floor(y))) {
      e.path = [{ x, y }];
      e.pathIdx = 0;
      e.pathPending = false;
      return;
    }
    (e as any)._goal = goal ? goal.id : 0;
    if (!e.pathPending) {
      e.pathPending = true;
      this.pathQueue.push(e);
    }
  }

  goalOpts(goal: Entity): Partial<PathOpts> {
    if (goal.kind === 'building') return { goalRect: { x0: goal.tx, y0: goal.ty, x1: goal.tx + goal.size - 1, y1: goal.ty + goal.size - 1 }, ignoreOcc: goal.bd?.walkable ? undefined : goal.id };
    if (goal.kind === 'resource') return { goalRect: { x0: goal.tx, y0: goal.ty, x1: goal.tx, y1: goal.ty } };
    return {};
  }

  // ── Regiones conectadas (para descartar destinos inalcanzables sin A*) ──
  regions: Int32Array | null = null;
  regionVersion = -1;
  regionTime = -99;

  ensureRegions() {
    const m = this.map;
    if (this.regions && (this.regionVersion === m.version || this.time - this.regionTime < 1)) return;
    this.regionVersion = m.version;
    this.regionTime = this.time;
    const N = m.w * m.h;
    const reg = this.regions ?? new Int32Array(N);
    reg.fill(0);
    let label = 0;
    const stack: number[] = [];
    const W = m.w;
    const pass = (i: number) => {
      const t = m.terrain[i];
      if (t === T_CLIFF || t === T_DEEP) return false;
      return m.occ[i] === 0 || m.gateOcc[i] !== 0;
    };
    for (let i = 0; i < N; i++) {
      if (reg[i] || !pass(i)) continue;
      label++;
      reg[i] = label;
      stack.push(i);
      while (stack.length) {
        const c = stack.pop()!;
        const cx = c % W, cy = (c / W) | 0;
        if (cx > 0 && !reg[c - 1] && pass(c - 1)) { reg[c - 1] = label; stack.push(c - 1); }
        if (cx < W - 1 && !reg[c + 1] && pass(c + 1)) { reg[c + 1] = label; stack.push(c + 1); }
        if (cy > 0 && !reg[c - W] && pass(c - W)) { reg[c - W] = label; stack.push(c - W); }
        if (cy < m.h - 1 && !reg[c + W] && pass(c + W)) { reg[c + W] = label; stack.push(c + W); }
      }
    }
    this.regions = reg;
  }

  regionAt(x: number, y: number): number {
    const m = this.map;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!m.inBounds(tx, ty)) return 0;
    const r = this.regions![ty * m.w + tx];
    if (r) return r;
    // casilla bloqueada: mirar vecinas
    for (let d = 1; d <= 2; d++)
      for (let dy = -d; dy <= d; dy++)
        for (let dx = -d; dx <= d; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (!m.inBounds(nx, ny)) continue;
          const rr = this.regions![ny * m.w + nx];
          if (rr) return rr;
        }
    return 0;
  }

  /** Ajusta el destino a la región del origen; null si es imposible */
  reachableGoal(e: Entity, gx: number, gy: number, goal?: Entity): { x: number; y: number } | null {
    this.ensureRegions();
    const reg = this.regions!;
    const m = this.map;
    const sr = this.regionAt(e.x, e.y);
    if (!sr) return { x: gx, y: gy };
    if (goal && (goal.kind === 'building' || goal.kind === 'resource')) {
      const x0 = goal.kind === 'building' ? goal.tx : Math.floor(goal.x);
      const y0 = goal.kind === 'building' ? goal.ty : Math.floor(goal.y);
      const sz = goal.kind === 'building' ? goal.size : 1;
      for (let y = y0 - 1; y <= y0 + sz; y++)
        for (let x = x0 - 1; x <= x0 + sz; x++) {
          if (!m.inBounds(x, y)) continue;
          if (reg[y * m.w + x] === sr) return { x: gx, y: gy };
        }
      return null;
    }
    const tx = Math.floor(gx), ty = Math.floor(gy);
    if (m.inBounds(tx, ty) && reg[ty * m.w + tx] === sr) return { x: gx, y: gy };
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (let r = 1; r <= 10 && !best; r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = tx + dx, y = ty + dy;
          if (!m.inBounds(x, y) || reg[y * m.w + x] !== sr) continue;
          const d = dx * dx + dy * dy;
          if (d < bd) {
            bd = d;
            best = { x: x + 0.5, y: y + 0.5 };
          }
        }
    }
    return best;
  }

  processPathQueue() {
    const budget = 20000;
    const start = this.pf.nodesExpanded;
    let n = 0;
    while (this.pathQueue.length && (this.pf.nodesExpanded - start < budget || n < 2)) {
      const e = this.pathQueue.shift()!;
      n++;
      if (!e.alive || !e.pathPending) continue;
      e.pathPending = false;
      const gid = (e as any)._goal as number;
      const goal = gid ? this.entities.get(gid) : undefined;
      const adj = this.reachableGoal(e, e.pathGoalX, e.pathGoalY, goal && goal.alive ? goal : undefined);
      if (!adj) {
        e.path = null;
        e.inGoal = false;
        e.stuckTime += 3;
        continue;
      }
      const opts = this.pathOpts(e, goal && goal.alive ? this.goalOpts(goal) : undefined);
      opts.maxNodes = 8000;
      const path = this.pf.find(e.x, e.y, adj.x, adj.y, opts);
      e.path = path;
      e.pathIdx = 0;
      e.inGoal = false;
      if (path && path.length === 0) {
        e.path = null;
        e.inGoal = true;
      }
      if (!path) e.stuckTime += 1;
    }
    void budget;
  }

  // ─────────────────────────── Energía ───────────────────────────

  updatePower() {
    this.powerDirty = false;
    const cores = this.buildings.filter((b) => b.alive && b.built && b.bd!.powerRadius);
    for (const b of this.buildings) {
      if (!b.alive || !b.bd!.needsPower) continue;
      let ok = false;
      for (const c of cores) {
        if (c.owner !== b.owner) continue;
        const r = this.players[c.owner].stats_of(c.defId).powerRadius;
        if (Math.hypot(c.x - b.x, c.y - b.y) <= r + b.size * 0.5) {
          ok = true;
          break;
        }
      }
      b.powered = ok;
    }
  }

  isPoweredAt(pid: number, x: number, y: number, size: number): boolean {
    for (const c of this.buildings) {
      if (!c.alive || !c.built || c.owner !== pid || !c.bd!.powerRadius) continue;
      const r = this.players[pid].stats_of(c.defId).powerRadius;
      if (Math.hypot(c.x - x, c.y - y) <= r + size * 0.5) return true;
    }
    return false;
  }

  /** ¿Está (x,y) protegido por un escudo del jugador? Devuelve el multiplicador de daño */
  shieldMul(e: Entity): number {
    let mul = 1;
    this.staticHash.query(e.x, e.y, 14, this.tmp2);
    for (const b of this.tmp2) {
      if (!b.alive || b.kind !== 'building' || !b.built || !b.bd!.shieldRadius) continue;
      if (!this.players[b.owner].isAlly(e.owner)) continue;
      const r = this.players[b.owner].stats_of(b.defId).shieldRadius;
      if (Math.hypot(b.x - e.x, b.y - e.y) <= r) {
        mul = Math.min(mul, 0.65);
        break;
      }
    }
    if (e.kind === 'unit') {
      this.unitHash.query(e.x, e.y, 7, this.tmp2);
      for (const f of this.tmp2) {
        if (!f.alive || !f.ud!.shieldAura || f.id === e.id) continue;
        if (!this.players[f.owner].isAlly(e.owner)) continue;
        const r = this.players[f.owner].stats_of(f.defId).shieldRadius;
        if (Math.hypot(f.x - e.x, f.y - e.y) <= r) {
          mul = Math.min(mul, 0.6);
          break;
        }
      }
    }
    return mul;
  }

  // ─────────────────────────── Producción ───────────────────────────

  trainOptions(b: Entity): string[] {
    const p = this.players[b.owner];
    const bd = b.bd!;
    let list: string[] = [];
    if (bd.id === 'fortress') {
      list = [p.civ.uniqueUnit, ...p.civ.heroes.filter((h) => UNITS[h].building === 'fortress')];
    } else if (bd.id === 'temple') {
      list = ['jedi_knight', 'jedi_master', ...p.civ.heroes.filter((h) => UNITS[h].building === 'temple')];
    } else list = bd.trains ?? [];
    return list.map((id) => p.resolveUnit(id)).filter((id) => !p.isDisabled(id));
  }

  canTrain(pid: number, unitId: string): { ok: boolean; reason?: string } {
    const p = this.players[pid];
    const ud = UNITS[unitId];
    if (!ud) return { ok: false, reason: 'Desconocido' };
    // la era requerida es la de la unidad base de la línea
    const baseEra = this.baseEraOf(unitId);
    if (p.era < baseEra) return { ok: false, reason: `Requiere ${ERA_NAMES[baseEra as Era]}` };
    if (ud.cls === 'hero') {
      const alive = this.units.some((u) => u.alive && u.owner === pid && u.defId === unitId);
      const queued = this.buildings.some((b) => b.alive && b.owner === pid && b.prodQueue.some((q) => q.id === unitId));
      if (alive || queued) return { ok: false, reason: 'Héroe ya en servicio' };
    }
    const cost = p.stats_of(unitId).cost;
    if (!p.canAfford(cost)) return { ok: false, reason: 'Recursos insuficientes' };
    return { ok: true };
  }

  baseEraOf(unitId: string): number {
    // buscar la unidad raíz de la línea de mejoras
    for (const t of Object.values(TECHS)) {
      if (!t.upgrade) continue;
      for (const [from, to] of t.upgrade) if (to === unitId) return this.baseEraOf(from);
    }
    return UNITS[unitId]?.era ?? 1;
  }

  queueTrain(b: Entity, unitId: string, count = 1): number {
    const p = this.players[b.owner];
    if (!b.alive || !b.built) return 0;
    if (!this.trainOptions(b).includes(unitId)) return 0;
    let n = 0;
    for (let i = 0; i < count; i++) {
      if (b.prodQueue.length >= 15) break;
      const c = this.canTrain(b.owner, unitId);
      if (!c.ok) break;
      const s = p.stats_of(unitId);
      const paid = p.pay(s.cost);
      b.prodQueue.push({ kind: 'unit', id: unitId, progress: 0, total: Math.max(1, s.trainTime), paid });
      n++;
    }
    return n;
  }

  researchOptions(b: Entity): string[] {
    const p = this.players[b.owner];
    const out: string[] = [];
    for (const t of Object.values(TECHS)) {
      if (t.building !== b.defId) continue;
      if (!techAvailable(p, t)) continue;
      if (p.techs.has(t.id) || p.queuedTechs.has(t.id)) continue;
      if (t.eraAdvance) {
        if (t.eraAdvance !== p.era + 1) continue;
      } else if (t.era > p.era) continue;
      if (t.requires && !t.requires.every((r) => p.techs.has(r))) continue;
      if (t.civ === undefined && t.upgrade && t.id.startsWith('elite_')) continue;
      out.push(t.id);
    }
    return out;
  }

  canResearch(pid: number, techId: string): { ok: boolean; reason?: string } {
    const p = this.players[pid];
    const t = TECHS[techId];
    if (t.eraAdvance) {
      const req = ERA_REQ_BUILDINGS[t.eraAdvance] ?? [];
      const have = new Set(this.buildings.filter((b) => b.alive && b.built && b.owner === pid && req.includes(b.defId)).map((b) => b.defId));
      if (have.size < 2) return { ok: false, reason: `Necesitas 2 edificios distintos: ${req.map((r) => BUILDINGS[r].name).join(', ')}` };
      if (this.buildings.some((b) => b.alive && b.owner === pid && b.prodQueue.some((q) => TECHS[q.id]?.eraAdvance))) return { ok: false, reason: 'Ya avanzando de era' };
    }
    if (!p.canAfford(p.techCost(t))) return { ok: false, reason: 'Recursos insuficientes' };
    return { ok: true };
  }

  queueResearch(b: Entity, techId: string): boolean {
    const p = this.players[b.owner];
    if (!b.alive || !b.built) return false;
    if (!this.researchOptions(b).includes(techId)) return false;
    if (!this.canResearch(b.owner, techId).ok) return false;
    const t = TECHS[techId];
    const paid = p.pay(p.techCost(t));
    p.queuedTechs.add(techId);
    b.prodQueue.push({ kind: 'tech', id: techId, progress: 0, total: t.time, paid });
    return true;
  }

  cancelQueue(b: Entity, index: number) {
    const q = b.prodQueue[index];
    if (!q) return;
    const p = this.players[b.owner];
    p.refund(q.paid);
    if (q.kind === 'tech') p.queuedTechs.delete(q.id);
    if (q.kind === 'unit' && q.progress > 0) p.popReserved -= UNITS[q.id].pop;
    b.prodQueue.splice(index, 1);
  }

  updateProduction(b: Entity) {
    const q = b.prodQueue[0];
    if (!q) return;
    const p = this.players[b.owner];
    let speed = 1;
    if (b.bd!.needsPower && !b.powered) speed *= 0.5;
    if (q.kind === 'unit') {
      const ud = UNITS[q.id];
      if (q.progress === 0) {
        if (p.pop + p.popReserved + ud.pop > p.popCap) {
          if (p.human && this.time - p.popWarnAt > 20) {
            p.popWarnAt = this.time;
            this.emit({ t: 'popCap', owner: p.id });
          }
          return;
        }
        q.progress = 0.0001;
        p.popReserved += ud.pop;
      }
      q.progress += TICK * speed;
      if (q.progress >= q.total) {
        // aparece
        const spot = this.spawnPointFor(b);
        if (!spot) return;
        b.prodQueue.shift();
        p.popReserved -= ud.pop;
        const u = this.spawnUnit(q.id, b.owner, spot.x, spot.y);
        p.stats.unitsTrained++;
        this.emit({ t: 'trained', id: u.id, owner: b.owner, defId: q.id });
        this.sendToRally(b, u);
      }
    } else {
      q.progress += TICK * speed;
      if (q.progress >= q.total) {
        b.prodQueue.shift();
        this.completeTech(p, q.id);
      }
    }
  }

  sendToRally(b: Entity, u: Entity) {
    if (b.rallyX < 0) {
      if (u.ud!.cls === 'worker') {
        // auto-asignar trabajador nuevo al recurso más cercano si el punto de reunión es un recurso
      }
      return;
    }
    const tgt = b.rallyTargetId ? this.get(b.rallyTargetId) : undefined;
    if (tgt && u.ud!.canGather && (tgt.kind === 'resource' || tgt.bd?.farm)) {
      this.issue(u, { type: 'gather', targetId: tgt.id }, false);
      return;
    }
    if (tgt && tgt.kind === 'building' && !tgt.built && u.ud!.canBuild && tgt.owner === u.owner) {
      this.issue(u, { type: 'build', targetId: tgt.id }, false);
      return;
    }
    this.issue(u, { type: 'move', x: b.rallyX, y: b.rallyY }, false);
  }

  completeTech(p: Player, techId: string) {
    const t = TECHS[techId];
    p.queuedTechs.delete(techId);
    p.techs.add(techId);
    p.stats.techs++;
    if (t.mods) p.addMods(t.mods);
    if (t.upgrade) {
      for (const [from, to] of t.upgrade) {
        p.upgrades.set(from, to);
        // transformar unidades existentes
        for (const u of this.units) {
          if (!u.alive || u.owner !== p.id || u.defId !== from) continue;
          const frac = u.hp / u.maxHp;
          u.defId = to;
          u.ud = UNITS[to];
          u.maxHp = p.stats_of(to).hp;
          u.hp = Math.max(1, frac * u.maxHp);
        }
        // colas en producción
        for (const b of this.buildings) {
          if (b.owner !== p.id) continue;
          for (const q of b.prodQueue) if (q.kind === 'unit' && q.id === from) q.id = to;
        }
      }
    }
    if (t.eraAdvance) this.advanceEra(p, t.eraAdvance, false);
    if (t.special === 'shareVision') {
      // revela los centros de mando enemigos
      for (const b of this.buildings) {
        if (!b.alive || b.defId !== 'command_center' || !p.isEnemy(b.owner)) continue;
        for (let dy = -4; dy <= 4; dy++)
          for (let dx = -4; dx <= 4; dx++) {
            const x = Math.floor(b.x) + dx, y = Math.floor(b.y) + dy;
            if (this.map.inBounds(x, y)) p.explored[y * this.map.w + x] = 1;
          }
      }
    }
    if (techId === 'spy_network') {
      p.revealUntil = this.time + 60;
      p.queuedTechs.delete(techId);
      p.techs.delete(techId); // se puede repetir
    }
    // actualizar PV máximos
    this.refreshMaxHp(p);
    this.emit({ t: 'research', owner: p.id, techId });
  }

  refreshMaxHp(p: Player) {
    for (const e of this.units) {
      if (!e.alive || e.owner !== p.id) continue;
      const m = p.stats_of(e.defId).hp;
      if (m !== e.maxHp) {
        e.hp = (e.hp / e.maxHp) * m;
        e.maxHp = m;
      }
    }
    for (const e of this.buildings) {
      if (!e.alive || e.owner !== p.id) continue;
      const m = p.stats_of(e.defId).hp;
      if (m !== e.maxHp) {
        e.hp = (e.hp / e.maxHp) * m;
        e.maxHp = m;
      }
    }
  }

  advanceEra(p: Player, era: Era, silent: boolean) {
    if (era <= p.era) return;
    p.era = era;
    p.techs.add('era_' + era);
    p.stats.eraTimes.push(this.time);
    if (!silent) {
      this.emit({ t: 'era', owner: p.id, era });
      for (const q of this.players) if (q.id) this.msg(q.id, `${p.name} ha avanzado a la ${ERA_NAMES[era]}.`, '#9fd8ff');
    }
  }

  // ─────────────────────────── Órdenes ───────────────────────────

  issue(e: Entity, o: Order, queue: boolean) {
    if (!e.alive || e.kind !== 'unit') return;
    if (queue && e.order) {
      e.queue.push(o);
      return;
    }
    e.queue = [];
    this.setOrder(e, o);
  }

  setOrder(e: Entity, o: Order | null) {
    // liberar granja / conversión
    if (e.autoFarm) {
      const f = this.entities.get(e.autoFarm);
      if (f && f.farmerId === e.id && !(o && o.type === 'gather' && o.targetId === f.id)) f.farmerId = 0;
      if (!(o && o.type === 'gather' && o.targetId === e.autoFarm)) e.autoFarm = 0;
    }
    e.order = o;
    e.path = null;
    e.pathPending = false;
    e.targetId = o?.targetId ?? 0;
    e.stuckTime = 0;
    e.convertProgress = 0;
    e.idleTime = 0;
    if (o && (o.type === 'move' || o.type === 'attackMove')) {
      e.homeX = o.x!;
      e.homeY = o.y!;
    }
  }

  nextOrder(e: Entity) {
    const n = e.queue.shift() ?? null;
    this.setOrder(e, n);
    if (!n) {
      e.homeX = e.x;
      e.homeY = e.y;
    }
  }

  /** Mueve un grupo en formación */
  commandMove(ids: number[], x: number, y: number, attackMove: boolean, queue: boolean) {
    const units = ids.map((id) => this.get(id)).filter((e): e is Entity => !!e && e.kind === 'unit');
    if (!units.length) return;
    const slots = this.formation(units, x, y);
    units.forEach((u, i) => {
      const s = slots[i];
      this.issue(u, { type: attackMove ? 'attackMove' : 'move', x: s.x, y: s.y }, queue);
    });
  }

  formation(units: Entity[], x: number, y: number): { x: number; y: number }[] {
    const n = units.length;
    if (n === 1) return [{ x, y }];
    let cx = 0, cy = 0;
    for (const u of units) {
      cx += u.x;
      cy += u.y;
    }
    cx /= n;
    cy /= n;
    const dir = Math.atan2(y - cy, x - cx);
    const avgR = units.reduce((a, u) => a + u.radius, 0) / n;
    const spacing = Math.max(0.75, avgR * 2.4);
    const cols = Math.ceil(Math.sqrt(n * 1.6));
    const rows = Math.ceil(n / cols);
    const slots: { x: number; y: number }[] = [];
    const fx = Math.cos(dir), fy = Math.sin(dir);
    const rx = -fy, ry = fx;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (slots.length >= n) break;
        const ox = (c - (cols - 1) / 2) * spacing;
        const oy = -(r - (rows - 1) / 2) * spacing;
        slots.push({ x: x + rx * ox + fx * oy, y: y + ry * ox + fy * oy });
      }
    }
    // unidades a distancia atrás, cuerpo a cuerpo delante: asignación voraz por proyección
    const proj = (u: Entity) => (u.x - cx) * rx + (u.y - cy) * ry;
    const sortedU = units.map((u, i) => ({ u, i, p: proj(u), front: (u.ud?.attack?.range ?? 0) < 2 ? 1 : 0 }));
    const out: { x: number; y: number }[] = new Array(n);
    // filas: delanteras primero para cuerpo a cuerpo
    const slotIdx = slots.map((s, i) => ({ s, i, depth: (s.x - x) * fx + (s.y - y) * fy, lat: (s.x - x) * rx + (s.y - y) * ry }));
    slotIdx.sort((a, b) => b.depth - a.depth || a.lat - b.lat);
    sortedU.sort((a, b) => b.front - a.front || a.p - b.p);
    // dentro de cada fila ordenar lateralmente
    const assigned: number[] = [];
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const rowSlots = slotIdx.slice(r * cols, (r + 1) * cols).sort((a, b) => a.lat - b.lat);
      const rowUnits = sortedU.slice(k, k + rowSlots.length).sort((a, b) => a.p - b.p);
      rowUnits.forEach((ru, j) => {
        out[ru.i] = rowSlots[j].s;
        assigned.push(ru.i);
      });
      k += rowSlots.length;
    }
    for (let i = 0; i < n; i++) if (!out[i]) out[i] = { x, y };
    return out;
  }

  commandAttack(ids: number[], targetId: number, queue: boolean) {
    for (const id of ids) {
      const e = this.get(id);
      if (!e || e.kind !== 'unit') continue;
      const t = this.get(targetId);
      if (!t) continue;
      if (e.ud!.convert && t.kind === 'unit' && this.isEnemy(e.owner, t.owner) && !(e.ud!.attack && e.ud!.cls === 'hero' && t.ud!.cls === 'hero')) {
        this.issue(e, { type: 'convert', targetId }, queue);
      } else this.issue(e, { type: 'attack', targetId }, queue);
    }
  }

  /** Orden contextual de clic derecho */
  commandSmart(pid: number, ids: number[], x: number, y: number, targetId: number, queue: boolean) {
    const tgt = targetId ? this.get(targetId) : undefined;
    const units = ids.map((id) => this.get(id)).filter((e): e is Entity => !!e && e.kind === 'unit' && e.owner === pid);
    const buildings = ids.map((id) => this.get(id)).filter((e): e is Entity => !!e && e.kind === 'building' && e.owner === pid);
    for (const b of buildings) {
      b.rallyX = x;
      b.rallyY = y;
      b.rallyTargetId = tgt ? tgt.id : 0;
    }
    if (!units.length) return;
    if (!tgt) {
      this.commandMove(units.map((u) => u.id), x, y, false, queue);
      return;
    }
    const movers: number[] = [];
    for (const u of units) {
      const ud = u.ud!;
      if (tgt.kind === 'holocron') {
        if (ud.carriesHolocron) this.issue(u, { type: 'pickup', targetId: tgt.id }, queue);
        else movers.push(u.id);
        continue;
      }
      if (tgt.kind === 'resource') {
        if (ud.canGather) this.issue(u, { type: 'gather', targetId: tgt.id }, queue);
        else movers.push(u.id);
        continue;
      }
      if (tgt.kind === 'unit' && tgt.owner === 0 && tgt.ud!.cls === 'animal') {
        if (ud.canGather) this.issue(u, { type: 'gather', targetId: tgt.id }, queue);
        else if (ud.attack) this.issue(u, { type: 'attack', targetId: tgt.id }, queue);
        continue;
      }
      if (tgt.owner === pid || this.players[pid].isAlly(tgt.owner)) {
        if (tgt.kind === 'building') {
          if (ud.canBuild && (!tgt.built || tgt.hp < tgt.maxHp) && tgt.owner === pid) {
            this.issue(u, { type: tgt.built ? 'repair' : 'build', targetId: tgt.id }, queue);
            continue;
          }
          if (ud.canGather && tgt.bd!.farm && tgt.built && tgt.owner === pid) {
            this.issue(u, { type: 'gather', targetId: tgt.id }, queue);
            continue;
          }
          if (ud.canGather && u.carry > 0 && tgt.bd!.dropsite?.includes(u.carryType!) && tgt.built) {
            this.issue(u, { type: 'returnRes', targetId: tgt.id }, queue);
            continue;
          }
          if (u.holocronId && tgt.bd!.temple && tgt.built && tgt.owner === pid) {
            this.issue(u, { type: 'deposit', targetId: tgt.id }, queue);
            continue;
          }
        }
        if (tgt.kind === 'unit' && ud.heal && tgt.hp < tgt.maxHp && tgt.id !== u.id) {
          this.issue(u, { type: 'heal', targetId: tgt.id }, queue);
          continue;
        }
        if (tgt.kind === 'unit' && tgt.id !== u.id) {
          this.issue(u, { type: 'follow', targetId: tgt.id }, queue);
          continue;
        }
        movers.push(u.id);
        continue;
      }
      // enemigo
      if (ud.convert && tgt.kind === 'unit' && tgt.ud!.cls !== 'hero' && tgt.ud!.cls !== 'jediMaster' && (!ud.attack || ud.cls === 'jediMaster')) {
        this.issue(u, { type: 'convert', targetId: tgt.id }, queue);
      } else if (ud.attack) {
        this.issue(u, { type: 'attack', targetId: tgt.id }, queue);
      } else movers.push(u.id);
    }
    if (movers.length) this.commandMove(movers, x, y, false, queue);
  }

  commandGarrison(ids: number[], buildingId: number) {
    const b = this.get(buildingId);
    if (!b) return;
    for (const id of ids) {
      const u = this.get(id);
      if (u && this.canGarrison(u, b)) this.issue(u, { type: 'garrison', targetId: b.id }, false);
    }
  }

  commandStop(ids: number[]) {
    for (const id of ids) {
      const e = this.get(id);
      if (!e) continue;
      if (e.kind === 'unit') {
        e.queue = [];
        this.setOrder(e, null);
        e.homeX = e.x;
        e.homeY = e.y;
      }
    }
  }

  /** Coloca un edificio y asigna constructores */
  commandBuild(pid: number, builderIds: number[], defId: string, tx: number, ty: number, queue: boolean): Entity | null {
    const b = this.placeBuilding(pid, defId, tx, ty);
    if (!b) return null;
    for (const id of builderIds) {
      const u = this.get(id);
      if (!u || !u.ud!.canBuild || u.owner !== pid) continue;
      this.issue(u, { type: 'build', targetId: b.id }, queue);
    }
    return b;
  }

  /** Construye una línea de muro entre dos tiles */
  commandWall(pid: number, builderIds: number[], x0: number, y0: number, x1: number, y1: number, queue: boolean): Entity[] {
    const tiles: [number, number][] = [];
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const n = Math.max(dx, dy);
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      tiles.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)]);
    }
    const placed: Entity[] = [];
    for (const [tx, ty] of tiles) {
      const b = this.placeBuilding(pid, 'wall', tx, ty);
      if (b) placed.push(b);
    }
    // asignar constructores en orden
    for (const id of builderIds) {
      const u = this.get(id);
      if (!u || !u.ud!.canBuild) continue;
      let first = true;
      for (const b of placed) {
        this.issue(u, { type: 'build', targetId: b.id }, queue || !first);
        first = false;
      }
    }
    return placed;
  }

  // ─────────────────────────── Guarnición ───────────────────────────

  garrisonSpace(b: Entity): number {
    return (b.bd?.garrison ?? 0) - b.garrison.length;
  }

  canGarrison(u: Entity, b: Entity): boolean {
    if (!b.alive || !b.built || b.kind !== 'building' || !b.bd!.garrison) return false;
    if (!this.players[b.owner].isAlly(u.owner) || b.owner !== u.owner) return false;
    if (!u.ud!.tags.includes('infantry')) return false;
    return this.garrisonSpace(b) > 0;
  }

  enterGarrison(u: Entity, b: Entity) {
    u.garrisonedIn = b.id;
    b.garrison.push(u.id);
    u.x = u.px = b.x;
    u.y = u.py = b.y;
    u.path = null;
    u.queue = [];
    u.order = null;
    if (u.holocronId) this.dropHolocron(u);
  }

  /** Expulsa a todos los guarnecidos. resume: los trabajadores vuelven a su tarea */
  ungarrison(b: Entity, resume = true) {
    const ids = b.garrison;
    b.garrison = [];
    for (const id of ids) {
      const u = this.entities.get(id);
      if (!u || !u.alive) continue;
      u.garrisonedIn = 0;
      const spot = this.spawnPointFor(b) ?? this.findFreeSpot(b.x + b.size, b.y + b.size, 6) ?? { x: b.x + b.size, y: b.y };
      u.x = u.px = spot.x;
      u.y = u.py = spot.y;
      u.homeX = u.x;
      u.homeY = u.y;
      if (resume && u.ud!.cls === 'worker' && u.lastResKind) {
        const kind = u.lastResKind === 'carcass' || u.lastResKind === 'bush' ? 'food' : u.lastResKind;
        const r = this.nearestResource(u.lastResX, u.lastResY, kind, 14, 0, u.owner);
        if (r) this.setOrder(u, { type: 'gather', targetId: r.id });
      } else if (resume && u.autoFarm && this.get(u.autoFarm)) this.setOrder(u, { type: 'gather', targetId: u.autoFarm });
      else if (b.rallyX >= 0 && u.ud!.cls !== 'worker') this.setOrder(u, { type: 'move', x: b.rallyX, y: b.rallyY });
    }
  }

  /** Toque de alarma: los trabajadores cercanos se refugian en edificios con guarnición */
  ringAlarm(pid: number, cx?: number, cy?: number, radius = 1e9) {
    const p = this.players[pid];
    const shelters = this.buildings.filter((b) => b.alive && b.built && b.owner === pid && b.bd!.garrison);
    if (!shelters.length) return 0;
    let n = 0;
    for (const u of this.units) {
      if (!u.alive || u.owner !== pid || u.ud!.cls !== 'worker' || u.garrisonedIn) continue;
      if (cx !== undefined && cy !== undefined && Math.hypot(u.x - cx, u.y - cy) > radius) continue;
      let best: Entity | null = null;
      let bd = 22;
      for (const b of shelters) {
        if (this.garrisonSpace(b) <= 0) continue;
        const d = Math.hypot(b.x - u.x, b.y - u.y);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (best) {
        this.issue(u, { type: 'garrison', targetId: best.id }, false);
        n++;
      }
    }
    p.alarm = true;
    return n;
  }

  releaseAlarm(pid: number, onlySafe = false) {
    for (const b of this.buildings) if (b.alive && b.owner === pid && b.garrison.length) {
      if (onlySafe && this.enemiesNear(pid, b.x, b.y, 12) > 0) continue;
      const workers = b.garrison.filter((id) => this.entities.get(id)?.ud?.cls === 'worker');
      if (!workers.length) continue;
      // expulsar solo trabajadores
      const keep = b.garrison.filter((id) => !workers.includes(id));
      b.garrison = workers;
      this.ungarrison(b, true);
      b.garrison = keep;
    }
    for (const u of this.units) if (u.alive && u.owner === pid && u.order?.type === 'garrison' && u.ud!.cls === 'worker') this.setOrder(u, null);
    this.players[pid].alarm = false;
  }

  enemiesNear(pid: number, x: number, y: number, r: number): number {
    this.unitHash.query(x, y, r, this.tmp2);
    let n = 0;
    for (const u of this.tmp2) if (u.alive && this.isEnemy(pid, u.owner) && u.ud!.attack && u.ud!.cls !== 'worker') n++;
    return n;
  }

  deleteEntity(pid: number, id: number) {
    const e = this.get(id);
    if (!e || e.owner !== pid) return;
    if (e.kind === 'building' && !e.built) {
      // reembolso parcial de cimientos
      const p = this.players[pid];
      const c = p.stats_of(e.defId).cost;
      for (const r of RESOURCE_TYPES) p.res[r] += Math.round((c[r] ?? 0) * (1 - e.progress));
    }
    damageEntity(this, e, e.hp + 1e6, null);
  }

  // ─────────────────────────── Mercado y tributos ───────────────────────────

  marketFee(pid: number): number {
    return 0.3 * this.players[pid].eco('tradeFee');
  }

  marketBuy(pid: number, res: 'food' | 'carbon' | 'ore'): boolean {
    const p = this.players[pid];
    const price = Math.round(this.market[res] * (1 + this.marketFee(pid)));
    if (p.res.nova < price) return false;
    p.res.nova -= price;
    p.res[res] += 100;
    this.market[res] = Math.min(9999, this.market[res] + 5);
    return true;
  }

  marketSell(pid: number, res: 'food' | 'carbon' | 'ore'): boolean {
    const p = this.players[pid];
    if (p.res[res] < 100) return false;
    const price = Math.round(this.market[res] * (1 - this.marketFee(pid)));
    p.res[res] -= 100;
    p.res.nova += price;
    this.market[res] = Math.max(20, this.market[res] - 5);
    return true;
  }

  hasSpaceport(pid: number) {
    return this.buildings.some((b) => b.alive && b.built && b.owner === pid && b.defId === 'spaceport');
  }

  tribute(from: number, to: number, res: ResourceType, amount: number): boolean {
    const p = this.players[from];
    if (p.res[res] < amount || amount <= 0) return false;
    const fee = this.marketFee(from);
    p.res[res] -= amount;
    this.players[to].res[res] += Math.floor(amount * (1 - fee));
    p.stats.tributeSent += amount;
    this.msg(to, `${p.name} te ha enviado ${Math.floor(amount * (1 - fee))} de ${resName(res)}.`, '#7dff9a');
    return true;
  }

  setDiplomacy(a: number, b: number, d: 'ally' | 'neutral' | 'enemy') {
    if (this.setup.lockedTeams) return;
    this.players[a].diplo[b] = d;
  }

  // ─────────────────────────── Niebla de guerra ───────────────────────────

  private circleCache = new Map<number, Int16Array>();
  circle(r: number): Int16Array {
    const key = Math.round(r * 2);
    let c = this.circleCache.get(key);
    if (c) return c;
    const rr = key / 2;
    const pts: number[] = [];
    const R = Math.ceil(rr);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= rr * rr + 0.5) pts.push(dx, dy);
    c = new Int16Array(pts);
    this.circleCache.set(key, c);
    return c;
  }

  updateFog(force: boolean) {
    const N = this.map.w;
    for (const p of this.players) {
      if (p.id === 0) continue;
      p.visible.fill(0);
    }
    const stamp = (p: Player, x: number, y: number, r: number) => {
      const c = this.circle(r);
      const cx = Math.floor(x), cy = Math.floor(y);
      const vis = p.visible, exp = p.explored;
      for (let k = 0; k < c.length; k += 2) {
        const tx = cx + c[k], ty = cy + c[k + 1];
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
        const i = ty * N + tx;
        vis[i] = 1;
        exp[i] = 1;
      }
    };
    // visión compartida con aliados
    const viewers: number[][] = this.players.map((p) => (p.id === 0 ? [] : this.players.filter((q) => q.id !== 0 && p.isAlly(q.id) && q.isAlly(p.id)).map((q) => q.id)));
    const owners = new Map<number, number[]>();
    for (const p of this.players) if (p.id) owners.set(p.id, viewers[p.id]);
    for (const e of this.units) {
      if (!e.alive || e.owner === 0) continue;
      const r = this.players[e.owner].stats_of(e.defId).los;
      for (const vid of owners.get(e.owner) ?? []) stamp(this.players[vid], e.x, e.y, r);
    }
    for (const e of this.buildings) {
      if (!e.alive || e.owner === 0) continue;
      const r = this.players[e.owner].stats_of(e.defId).los + e.size * 0.5;
      for (const vid of owners.get(e.owner) ?? []) stamp(this.players[vid], e.x, e.y, r);
    }
    for (const p of this.players) {
      if (p.id && p.revealUntil > this.time) {
        p.visible.fill(1);
        p.explored.fill(1);
      }
    }
    void force;
  }

  isVisibleTo(pid: number, x: number, y: number): boolean {
    const p = this.players[pid];
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!this.map.inBounds(tx, ty)) return false;
    return p.visible[ty * this.map.w + tx] === 1;
  }

  // ─────────────────────────── Victoria ───────────────────────────

  checkVictory() {
    // derrota
    for (const p of this.players) {
      if (p.id === 0 || p.defeated) continue;
      let alive = p.resigned ? 0 : 0;
      if (!p.resigned) {
        for (const u of this.units) if (u.alive && u.owner === p.id) {
          alive++;
          break;
        }
        if (!alive)
          for (const b of this.buildings)
            if (b.alive && b.owner === p.id && !b.bd!.wall && !b.bd!.farm && b.defId !== 'shelter' && b.defId !== 'turret' && b.defId !== 'aa_turret') {
              alive++;
              break;
            }
      }
      if (!alive) {
        p.defeated = true;
        this.emit({ t: 'defeated', owner: p.id });
        for (const q of this.players) if (q.id) this.msg(q.id, `${p.name} ha sido derrotado.`, '#ff6a5a');
        // destruir restos
        for (const e of [...this.units, ...this.buildings]) if (e.alive && e.owner === p.id) damageEntity(this, e, 1e9, null);
      }
    }
    const alive = this.players.filter((p) => p.id && !p.defeated);
    if (!alive.length) {
      this.declareVictory(-1, 'Nadie sobrevive.');
      return;
    }
    // ¿todos los supervivientes son aliados mutuos?
    let allAllied = true;
    for (const a of alive) for (const b of alive) if (a.id !== b.id && !(a.isAlly(b.id) && b.isAlly(a.id))) allAllied = false;
    if (allAllied) {
      this.declareVictory(this.teamKey(alive[0].id), 'Conquista total.');
      return;
    }
    // holocrones
    if (this.setup.victory === 'standard' && this.holocrons.length) {
      let team = -2;
      for (const h of this.holocrons) {
        if (!h.templeId) {
          team = -1;
          break;
        }
        const temple = this.get(h.templeId);
        if (!temple) {
          team = -1;
          break;
        }
        const tk = this.teamKey(temple.owner);
        if (team === -2) team = tk;
        else if (team !== tk) {
          team = -1;
          break;
        }
      }
      if (team >= 0) {
        if (this.holocronHold.team !== team) {
          this.holocronHold = { team, since: this.time };
          for (const q of this.players) if (q.id) this.msg(q.id, `¡Un bando controla todos los holocrones! Victoria en ${Math.round((this.setup.holocronTime ?? 300) / 60)} minutos.`, '#ffd23d');
        } else if (this.time - this.holocronHold.since >= (this.setup.holocronTime ?? 300)) {
          this.declareVictory(team, 'Control de todos los holocrones.');
        }
      } else this.holocronHold.team = -1;
    }
    // límite de tiempo
    if (this.setup.victory === 'score' && this.setup.timeLimit && this.time >= this.setup.timeLimit * 60) {
      let best = alive[0];
      for (const p of alive) if (p.score() > best.score()) best = p;
      this.declareVictory(this.teamKey(best.id), 'Mayor puntuación al acabar el tiempo.');
    }
  }

  declareVictory(team: number, reason: string) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.winnerTeam = team;
    this.winners = this.players.filter((p) => p.id && this.teamKey(p.id) === team).map((p) => p.id);
    this.emit({ t: 'gameOver', winnerTeam: team, winners: this.winners });
    this.msg(-1, reason, '#ffd23d');
  }

  // ─────────────────────────── Consultas ───────────────────────────

  idleWorkers(pid: number): Entity[] {
    return this.units.filter((u) => u.alive && u.owner === pid && u.ud!.cls === 'worker' && !u.order && u.idleTime > 0.5 && !u.garrisonedIn);
  }

  nearestDropsite(e: Entity, res: ResourceType): Entity | null {
    let best: Entity | null = null;
    let bd = Infinity;
    for (const b of this.buildings) {
      if (!b.alive || !b.built || b.owner !== e.owner || !b.bd!.dropsite?.includes(res)) continue;
      const d = Math.hypot(b.x - e.x, b.y - e.y) - b.size * 0.5;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  nearestResource(x: number, y: number, kind: Entity['resKind'] | 'food', maxD: number, exclude = 0, pid = 0): Entity | null {
    let best: Entity | null = null;
    let bd = maxD;
    this.staticHash.query(x, y, maxD, this.tmp);
    for (const r of this.tmp) {
      if (!r.alive || r.kind !== 'resource' || r.id === exclude || r.amount <= 0) continue;
      if (pid && r.unreachable & (1 << pid)) continue;
      if (kind === 'food' ? r.resType !== 'food' : r.resKind !== kind) continue;
      if (pid && this.players[pid].explored && !this.players[pid].explored[r.ty * this.map.w + r.tx]) continue;
      const d = Math.hypot(r.x - x, r.y - y) + r.gatherers * 0.6;
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  buildingsOf(pid: number, defId?: string): Entity[] {
    return this.buildings.filter((b) => b.alive && b.owner === pid && (!defId || b.defId === defId));
  }

  unitsOf(pid: number): Entity[] {
    return this.units.filter((u) => u.alive && u.owner === pid);
  }

  resourceAtTile(tx: number, ty: number): Entity | undefined {
    const id = this.map.occ[ty * this.map.w + tx];
    if (id > 0) return this.get(id);
    return undefined;
  }
}

export function resName(r: ResourceType): string {
  return r === 'food' ? 'alimento' : r === 'carbon' ? 'carbono' : r === 'nova' ? 'Nova' : 'mineral';
}

export function costText(c: Cost): string {
  const parts: string[] = [];
  for (const r of RESOURCE_TYPES) if (c[r]) parts.push(`${c[r]} ${resName(r)}`);
  return parts.join(', ');
}

export { RES_AMOUNT, T_SHALLOW, T_DEEP, T_CLIFF };
export type { BuildingDef, QueueItem };
