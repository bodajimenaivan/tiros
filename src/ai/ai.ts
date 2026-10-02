// Inteligencia artificial de jugadores: economía, construcción, investigación, ejército y estrategia.
import type { World } from '../sim/world';
import type { Entity } from '../sim/entity';
import type { Player, Difficulty } from '../sim/player';
import type { ResourceType, UnitClass, Era } from '../data/types';
import { RESOURCE_TYPES } from '../data/types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { TECHS, ERA_REQ_BUILDINGS } from '../data/techs';
import { techAvailable } from '../sim/player';

interface DiffParams {
  think: number;
  workers: number;
  firstAttack: number;
  attackSize: number;
  waveGrow: number;
  researchChance: number;
  retreat: boolean;
  knowsEnemy: boolean;
  maxProdPerType: number;
  turrets: number;
  useConversion: boolean;
  heroes: boolean;
  monument: boolean;
  market: boolean;
  reactDelay: number;
}

const DIFF: Record<Difficulty, DiffParams> = {
  easy: { think: 2.2, workers: 22, firstAttack: 1150, attackSize: 8, waveGrow: 3, researchChance: 0.35, retreat: false, knowsEnemy: false, maxProdPerType: 1, turrets: 0, useConversion: false, heroes: false, monument: false, market: false, reactDelay: 12 },
  normal: { think: 1.1, workers: 40, firstAttack: 760, attackSize: 14, waveGrow: 4, researchChance: 0.75, retreat: false, knowsEnemy: true, maxProdPerType: 2, turrets: 1, useConversion: true, heroes: true, monument: false, market: false, reactDelay: 5 },
  hard: { think: 0.7, workers: 66, firstAttack: 600, attackSize: 16, waveGrow: 5, researchChance: 1, retreat: true, knowsEnemy: true, maxProdPerType: 3, turrets: 2, useConversion: true, heroes: true, monument: true, market: true, reactDelay: 2 },
  extreme: { think: 0.45, workers: 78, firstAttack: 520, attackSize: 18, waveGrow: 6, researchChance: 1, retreat: true, knowsEnemy: true, maxProdPerType: 4, turrets: 3, useConversion: true, heroes: true, monument: true, market: true, reactDelay: 0.5 },
};

type GatherKind = 'food' | 'carbon' | 'nova' | 'ore';

/** Preferencias de composición por civilización (pesos base) */
const CIV_STYLE: Record<string, Partial<Record<UnitClass, number>>> = {
  empire: { trooper: 4, strikeMech: 3, assaultMech: 2.5, mechDestroyer: 1.5, grenadier: 1.5, unique: 3, artillery: 1, fighter: 1 },
  rebels: { trooper: 3, mounted: 2, fighter: 3, bomber: 1.5, unique: 3, strikeMech: 1.5, mechDestroyer: 1.5, jediKnight: 1 },
  republic: { trooper: 4, unique: 3, jediKnight: 2.5, strikeMech: 2, assaultMech: 2, grenadier: 1.5, artillery: 1 },
  cis: { trooper: 4, strikeMech: 3, assaultMech: 2, unique: 2, grenadier: 1.5, mechDestroyer: 1.5, fighter: 1.5 },
  tradefed: { trooper: 3, unique: 4, assaultMech: 3, strikeMech: 2, mechDestroyer: 1.5, artillery: 1 },
  naboo: { trooper: 3, mounted: 2.5, fighter: 3, unique: 3, strikeMech: 1.5, mechDestroyer: 1, grenadier: 1 },
  gungans: { trooper: 4, mounted: 3, grenadier: 2, unique: 2, artillery: 2, mechDestroyer: 1.5, aaTrooper: 1 },
  wookiees: { trooper: 4, unique: 4, grenadier: 1.5, mounted: 1.5, strikeMech: 1.5, jediKnight: 1, mechDestroyer: 1 },
};

const PROD_BUILDING: Partial<Record<UnitClass, string>> = {
  trooper: 'troop_center', grenadier: 'troop_center', aaTrooper: 'troop_center', mounted: 'troop_center',
  scout: 'mech_factory', strikeMech: 'mech_factory', mechDestroyer: 'mech_factory', assaultMech: 'mech_factory',
  pummel: 'heavy_weapons', artillery: 'heavy_weapons', aaMobile: 'heavy_weapons', fighter: 'airbase', bomber: 'airbase',
  jediKnight: 'temple', jediMaster: 'temple', unique: 'fortress',
};

const ECO_TECHS = ['worker_armor', 'forage_1', 'carbon_1', 'cargo_droids', 'farm_1', 'nova_1', 'ore_1', 'hunting', 'carbon_2', 'farm_2', 'nova_2', 'repulsor_carts', 'ore_2', 'carbon_3', 'farm_3', 'holonet'];
const MIL_TECHS = ['blaster_1', 'inf_armor_1', 'mech_armor_1', 'stims', 'sensors', 'blaster_2', 'inf_armor_2', 'mech_armor_2', 'mech_weapons_1', 'building_armor_1', 'targeting', 'repulsors', 'force_endurance', 'force_mastery', 'force_healing', 'afterburners', 'ballistics', 'blaster_3', 'inf_armor_3', 'mech_armor_3', 'mech_weapons_2', 'saber_forms', 'deflector_shields', 'turret_upgrade', 'power_1', 'conscription', 'cc_defense', 'holocron_study', 'building_armor_2'];

export class AIController {
  w: World;
  pid: number;
  p: Player;
  d: DiffParams;
  nextThink = 0;
  nextAttackAt: number;
  attacking = false;
  attackTarget: { x: number; y: number; pid: number } | null = null;
  wave = 0;
  baseX: number;
  baseY: number;
  rallyX: number;
  rallyY: number;
  enemySeen: Partial<Record<UnitClass, number>> = {};
  scoutPoints: { x: number; y: number }[] = [];
  scoutIdx = 0;
  lastBuildAt: Record<string, number> = {};
  defending = false;
  armyPeak = 0;
  armyGrowAt = 0;
  lastThreats: Entity[] = [];
  hopelessSince = 0;
  needSiegeAt = -999;
  blockedSince = 0;
  savingSince = 0;
  eraCooldownUntil = 0;
  defenders = new Set<number>();
  knownEnemyBuildings = new Map<number, { x: number; y: number; owner: number; defId: string }>();
  savingForEra = false;
  thinkCount = 0;
  holocronHunter = 0;
  lastTributeAsk = 0;
  alarmAt = 0;
  needDropsite = -99;

  constructor(w: World, pid: number) {
    this.w = w;
    this.pid = pid;
    this.p = w.players[pid];
    this.d = DIFF[this.p.difficulty];
    this.nextThink = w.rng.range(0.2, 1.5);
    this.nextAttackAt = this.d.firstAttack * w.rng.range(0.9, 1.15);
    this.baseX = this.p.startX;
    this.baseY = this.p.startY;
    const N = w.N;
    const cx = N / 2, cy = N / 2;
    const a = Math.atan2(cy - this.baseY, cx - this.baseX);
    this.rallyX = this.baseX + Math.cos(a) * 9;
    this.rallyY = this.baseY + Math.sin(a) * 9;
    // puntos de exploración
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2;
      this.scoutPoints.push({ x: cx + Math.cos(ang) * N * 0.33, y: cy + Math.sin(ang) * N * 0.33 });
    }
    this.scoutPoints.push({ x: cx, y: cy });
    w.rng.shuffle(this.scoutPoints);
    if (this.d.knowsEnemy) {
      for (const q of w.players) {
        if (!q.id || !this.p.isEnemy(q.id)) continue;
        this.knownEnemyBuildings.set(-q.id, { x: q.startX, y: q.startY, owner: q.id, defId: 'command_center' });
      }
    }
  }

  get time() {
    return this.w.time;
  }

  update() {
    if (this.p.defeated || this.w.gameOver) return;
    if (this.time < this.nextThink) return;
    this.nextThink = this.time + this.d.think * this.w.rng.range(0.85, 1.15);
    this.thinkCount++;
    try {
      this.think();
    } catch (err) {
      // la IA nunca debe romper la partida
      if ((globalThis as any).__AI_DEBUG) throw err;
      console.warn('IA error', err);
    }
  }

  // ─────────────────────────── Ciclo principal ───────────────────────────

  think() {
    const w = this.w;
    const units = w.unitsOf(this.pid);
    const workers = units.filter((u) => u.ud!.cls === 'worker');
    const military = units.filter((u) => u.ud!.cls !== 'worker' && u.ud!.cls !== 'scout' && u.ud!.cls !== 'jediMaster' && u.ud!.cls !== 'trader');
    const buildings = w.buildingsOf(this.pid);
    const ccs = buildings.filter((b) => b.defId === 'command_center' && b.built);
    if (ccs.length) {
      // base = CC más antiguo
      this.baseX = ccs[0].x;
      this.baseY = ccs[0].y;
    }
    if (this.considerResign(workers, military, buildings)) return;
    this.observe();
    this.updateGatherCounts();

    this.manageWorkers(workers, buildings);
    this.manageHousing(buildings);
    this.manageEra(buildings, workers);
    this.manageBuildings(buildings, workers);
    if (this.thinkCount % 2 === 0) this.manageResearch(buildings);
    this.manageProduction(buildings, military, workers);
    this.manageScout(units);
    this.manageArmy(military, units);
    this.manageHolocrons(units);
    if (this.p.difficulty !== 'easy' && this.thinkCount % 4 === 0) this.manageMarket(buildings);
    if (this.thinkCount % 6 === 0) this.manageRepairs(buildings, workers);
    if (this.thinkCount % 5 === 2) this.manageFoundations(buildings);
    if (this.thinkCount % 6 === 3) this.manageTrade(buildings);
  }

  /** Comercio: rutas de cargueros entre puertos espaciales (aliados primero) */
  manageTrade(buildings: Entity[]) {
    const w = this.w;
    const p = this.p;
    if (p.difficulty === 'easy' || p.era < 2) return;
    const ports = buildings.filter((b) => b.built && b.defId === 'spaceport');
    if (!ports.length) return;
    let best: { home: Entity; dest: Entity; gain: number } | null = null;
    for (const home of ports) {
      for (const dest of w.buildings) {
        if (!dest.alive || !dest.built || dest.defId !== 'spaceport' || dest === home) continue;
        if (dest.owner !== this.pid && !p.isAlly(dest.owner)) continue;
        if (this.dangerous(dest.x, dest.y) || this.dangerous(home.x, home.y)) continue;
        const g = w.tradeGain(home, dest, this.pid);
        if (g > (best?.gain ?? 0)) best = { home, dest, gain: g };
      }
    }
    if (!best || best.gain < 10) {
      // sin ruta rentable: un segundo puerto espacial junto a un centro de mando lejano
      if (p.era >= 3 && ports.length < 2 && p.res.carbon > 350 && this.time - (this.lastBuildAt.spaceport2 ?? -999) > 120) {
        let far: Entity | null = null;
        let fd = 0;
        for (const c of buildings) {
          if (!c.built || c.defId !== 'command_center') continue;
          const d = Math.hypot(c.x - ports[0].x, c.y - ports[0].y);
          if (d > fd) {
            fd = d;
            far = c;
          }
        }
        if (far && fd >= 24) {
          this.lastBuildAt.spaceport2 = this.time;
          const spot = this.findSpot('spaceport', far.x, far.y, 4, 11, false);
          if (spot) {
            const bs = this.pickBuilders(spot.x + 2, spot.y + 2, 2);
            if (bs.length) w.commandBuild(this.pid, bs.map((u) => u.id), 'spaceport', spot.x, spot.y, false);
          }
        }
      }
      return;
    }
    const traders = w.units.filter((u) => u.alive && u.owner === this.pid && u.ud!.cls === 'trader');
    // más cargueros cuando la Nova del mapa escasea
    const novaLeft = this.bestNode(this.baseX, this.baseY, 'nova', 60) !== null;
    const want = Math.min(p.era >= 3 ? (novaLeft ? 7 : 14) : 4, Math.floor(best.gain / 3));
    if (traders.length < want && p.pop < p.popCap - 2) {
      const port = best.home.prodQueue.length < 2 ? best.home : ports.find((b) => b.prodQueue.length < 2);
      const cost = p.stats_of('trader').cost;
      if (port && p.res.food >= (cost.food ?? 0) + 150 && p.res.carbon >= (cost.carbon ?? 0) + 120 && w.canTrain(this.pid, 'trader').ok) w.queueTrain(port, 'trader', 1);
    }
    for (const u of traders) {
      if (u.order) continue;
      w.issue(u, { type: 'trade', targetId: best.dest.id, resumeId: best.home.id }, false);
    }
  }

  /** Cimientos abandonados: reasignar constructores o eliminarlos si no se pueden terminar */
  manageFoundations(buildings: Entity[]) {
    const w = this.w;
    const building = new Map<number, number>();
    for (const u of w.units) {
      if (!u.alive || u.owner !== this.pid || u.ud!.cls !== 'worker') continue;
      const o = u.order;
      if (o && (o.type === 'build' || o.type === 'repair') && o.targetId) building.set(o.targetId, (building.get(o.targetId) ?? 0) + 1);
      for (const q of u.queue) if ((q.type === 'build' || q.type === 'repair') && q.targetId) building.set(q.targetId, (building.get(q.targetId) ?? 0) + 1);
    }
    let assigned = 0;
    for (const b of buildings) {
      if (b.built || b.bd!.farm || b.bd!.wall) continue;
      if (building.get(b.id)) continue;
      const age = this.time - (b.createdAt ?? 0);
      if (age < 20) continue;
      // sin progreso tras mucho tiempo: probablemente inaccesible -> eliminar y recuperar recursos
      if (age > 240 && b.progress <= 0) {
        w.deleteEntity(this.pid, b.id);
        continue;
      }
      if (assigned >= 2 || this.threatsNearBase().length) continue;
      const bs = this.pickBuilders(b.x, b.y, b.size >= 3 ? 2 : 1);
      for (const u of bs) w.issue(u, { type: 'build', targetId: b.id }, false);
      if (bs.length) assigned++;
    }
  }

  /** Rendición cuando la situación es desesperada (como la IA de AoE2) */
  considerResign(workers: Entity[], military: Entity[], buildings: Entity[]): boolean {
    const w = this.w;
    const p = this.p;
    if (p.difficulty === 'easy' || this.time < 1200 || this.thinkCount % 10 !== 0 || p.resigned || p.defeated) return false;
    const hasCC = buildings.some((b) => b.defId === 'command_center' && b.built);
    const canRebuild = workers.length >= 2 && p.canAfford(p.stats_of('command_center').cost);
    const producers = buildings.filter((b) => b.built && b.bd!.trains?.length && b.defId !== 'command_center').length;
    // fuerza del enemigo más fuerte
    let enemyArmy = 0;
    for (const q of w.players) {
      if (!q.id || !p.isEnemy(q.id) || q.defeated) continue;
      let n = 0;
      for (const u of w.units) if (u.alive && u.owner === q.id && u.ud!.cls !== 'worker' && u.ud!.cls !== 'trader') n++;
      enemyArmy = Math.max(enemyArmy, n);
    }
    // aliados vivos con fuerza: seguir luchando
    const allyAlive = w.players.some((q) => q.id && q.id !== this.pid && p.isAlly(q.id) && !q.defeated && !q.resigned);
    if (allyAlive) return false;
    const hopeless =
      (!hasCC && !canRebuild && workers.length < 5 && military.length < 4 && enemyArmy >= 15) ||
      (workers.length + military.length <= 3 && !canRebuild && producers === 0 && enemyArmy >= 10);
    if (!hopeless) {
      this.hopelessSince = 0;
      return false;
    }
    if (!this.hopelessSince) this.hopelessSince = this.time;
    if (this.time - this.hopelessSince < 45) return false;
    p.resigned = true;
    for (const q of w.players) if (q.id) w.msg(q.id, `${p.name} se rinde.`, '#ffb060');
    w.checkVictory();
    return true;
  }

  // ─────────────────────────── Percepción ───────────────────────────

  observe() {
    const w = this.w;
    const vis = this.p.visible;
    const N = w.N;
    if (this.thinkCount % 3 !== 0) return;
    const seen: Partial<Record<UnitClass, number>> = {};
    for (const u of w.units) {
      if (!u.alive || !this.p.isEnemy(u.owner)) continue;
      const i = Math.floor(u.y) * N + Math.floor(u.x);
      if (!vis[i] && this.p.difficulty !== 'extreme') continue;
      const c = u.ud!.cls;
      if (c === 'worker' || c === 'trader') continue;
      seen[c] = (seen[c] ?? 0) + 1;
    }
    // memoria con decaimiento
    for (const k in this.enemySeen) this.enemySeen[k as UnitClass]! *= 0.85;
    for (const k in seen) this.enemySeen[k as UnitClass] = Math.max(this.enemySeen[k as UnitClass] ?? 0, seen[k as UnitClass]!);
    for (const b of w.buildings) {
      if (!b.alive || !this.p.isEnemy(b.owner)) continue;
      const i = Math.floor(b.y) * N + Math.floor(b.x);
      if (vis[i] || this.p.explored[i]) this.knownEnemyBuildings.set(b.id, { x: b.x, y: b.y, owner: b.owner, defId: b.defId });
    }
    for (const [id, info] of this.knownEnemyBuildings) {
      if (id < 0) {
        // posición inicial: descartar si ya vimos que no hay nada
        const i = Math.floor(info.y) * N + Math.floor(info.x);
        if (vis[i] && !w.buildings.some((b) => b.alive && b.owner === info.owner && Math.hypot(b.x - info.x, b.y - info.y) < 6)) this.knownEnemyBuildings.delete(id);
        if (w.players[info.owner].defeated) this.knownEnemyBuildings.delete(id);
        continue;
      }
      const b = w.get(id);
      if (!b) this.knownEnemyBuildings.delete(id);
    }
  }

  updateGatherCounts() {
    if (this.thinkCount % 2 !== 0) return;
    for (const r of this.w.resources) r.gatherers = 0;
    for (const u of this.w.units) {
      if (!u.alive || u.ud!.cls !== 'worker' || !u.order) continue;
      const tid = u.order.type === 'gather' ? u.order.targetId : u.order.type === 'returnRes' ? u.order.resumeId : 0;
      if (!tid) continue;
      const r = this.w.entities.get(tid);
      if (r && r.kind === 'resource') r.gatherers++;
    }
  }

  // ─────────────────────────── Economía ───────────────────────────

  workerTask(u: Entity): GatherKind | 'build' | 'idle' | 'other' {
    const o = u.order;
    if (!o) return 'idle';
    if (o.type === 'build' || o.type === 'repair') return 'build';
    if (o.type === 'gather' || o.type === 'returnRes') {
      const id = o.type === 'gather' ? o.targetId : o.resumeId;
      const t = id ? this.w.entities.get(id) : undefined;
      if (t) {
        if (t.kind === 'building') return 'food';
        if (t.kind === 'unit') return 'food';
        if (t.resType) return t.resType as GatherKind;
      }
      if (u.carryType) return u.carryType as GatherKind;
      return 'other';
    }
    return 'other';
  }

  /** Unidad concreta (resuelta por mejoras) que representa una clase militar */
  classUnit(cls: UnitClass): string | null {
    const base: Partial<Record<UnitClass, string>> = {
      trooper: 'trooper', grenadier: 'grenadier', aaTrooper: 'aa_trooper', mounted: 'mounted_trooper', strikeMech: 'strike_mech', mechDestroyer: 'mech_destroyer',
      assaultMech: 'assault_mech', pummel: 'pummel', artillery: 'artillery', aaMobile: 'aa_mobile', fighter: 'fighter', bomber: 'bomber', jediKnight: 'jedi_knight',
      unique: this.p.civ.uniqueUnit,
    };
    const b = base[cls];
    if (!b || this.p.isDisabled(b)) return null;
    if (UNITS[b].era > this.p.era) return null;
    return this.p.resolveUnit(b);
  }

  desiredRatios(): Record<GatherKind, number> {
    const era = this.p.era;
    const p = this.p;
    const eco: Record<GatherKind, number> = era === 1 ? { food: 0.6, carbon: 0.4, nova: 0, ore: 0 } : era === 2 ? { food: 0.5, carbon: 0.34, nova: 0.12, ore: 0.04 } : { food: 0.48, carbon: 0.31, nova: 0.16, ore: 0.05 };
    // demanda militar según la composición deseada
    const mil: Record<GatherKind, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
    const weights = this.compositionWeights();
    for (const k in weights) {
      const id = this.classUnit(k as UnitClass);
      if (!id) continue;
      const c = p.stats_of(id).cost;
      const wgt = weights[k as UnitClass] ?? 0;
      for (const r of RESOURCE_TYPES) mil[r] += wgt * (c[r] ?? 0);
    }
    const ms = mil.food + mil.carbon + mil.nova + mil.ore || 1;
    for (const r of RESOURCE_TYPES) mil[r] /= ms;
    const milFrac = [0, 0.1, 0.4, 0.55, 0.6][era];
    const r: Record<GatherKind, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
    for (const k of RESOURCE_TYPES) r[k] = eco[k] * (1 - milFrac) + mil[k] * milFrac;
    const res = p.res;
    if (this.savingForEra) {
      const t = TECHS['era_' + (era + 1)];
      if (t) {
        if ((t.cost.nova ?? 0) > res.nova) r.nova += 0.1;
        if ((t.cost.food ?? 0) > res.food) r.food += 0.1;
      }
    }
    if (era >= 3 && !this.hasBuilding('fortress') && res.ore < 650) r.ore += 0.07;
    if (era >= 2 && res.ore < 150) r.ore += 0.02;
    // ajuste por existencias: penalizar lo que sobra y priorizar lo escaso
    for (const k of RESOURCE_TYPES) {
      const st = res[k];
      const f = st > 1500 ? 0.2 : st > 900 ? 0.45 : st > 500 ? 0.75 : era > 1 ? (st < 50 ? 1.8 : st < 150 ? 1.35 : 1) : 1;
      r[k] *= f;
    }
    const s = r.food + r.carbon + r.nova + r.ore || 1;
    for (const k of RESOURCE_TYPES) r[k] /= s;
    return r;
  }

  manageWorkers(workers: Entity[], buildings: Entity[]) {
    const counts: Record<string, number> = { food: 0, carbon: 0, nova: 0, ore: 0, build: 0, idle: 0, other: 0 };
    const byTask = new Map<string, Entity[]>();
    for (const u of workers) {
      const t = this.workerTask(u);
      counts[t]++;
      if (!byTask.has(t)) byTask.set(t, []);
      byTask.get(t)!.push(u);
    }
    const gatherers = workers.length - counts.build;
    const ratios = this.desiredRatios();
    const want: Record<GatherKind, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
    for (const k of RESOURCE_TYPES) want[k] = ratios[k] * gatherers;
    // asignar ociosos
    const idle = [...(byTask.get('idle') ?? []), ...(byTask.get('other') ?? []).filter((u) => !u.order || u.order.type === 'move')];
    for (const u of idle) {
      if (u.order && u.order.type !== 'move') continue;
      const kind = this.mostNeeded(counts, want);
      if (this.assignGather(u, kind)) {
        counts[kind]++;
      } else {
        // probar otro recurso
        for (const k of RESOURCE_TYPES) {
          if (k !== kind && this.assignGather(u, k)) {
            counts[k]++;
            break;
          }
        }
      }
    }
    // rebalanceo suave
    if (this.thinkCount % 4 === 0 && gatherers > 6) {
      let over: GatherKind | null = null, under: GatherKind | null = null;
      let maxO = 1.5, maxU = 1.5;
      for (const k of RESOURCE_TYPES) {
        const diff = counts[k] - want[k];
        if (diff > maxO) {
          maxO = diff;
          over = k;
        }
        if (-diff > maxU) {
          maxU = -diff;
          under = k;
        }
      }
      if (over && under) {
        const pool = (byTask.get(over) ?? []).filter((u) => u.carry < 3 && u.order?.type === 'gather');
        const u = pool[Math.floor(this.w.rng.next() * pool.length)];
        if (u && this.assignGather(u, under)) {
          counts[over]--;
          counts[under]++;
        }
      }
    }
    if (this.thinkCount % 2 === 0) this.manageFarms(want.food);
    // entrenar trabajadores
    // la economía tardía necesita más trabajadores (granjas + comercio), como en AoE2
    const lateMul = this.p.era >= 3 && this.p.difficulty !== 'easy' ? 1.25 : 1;
    const target = Math.min(Math.round(this.d.workers * lateMul), this.p.popMax * 0.5);
    const ccs = buildings.filter((b) => b.defId === 'command_center' && b.built);
    const queued = ccs.reduce((a, b) => a + b.prodQueue.filter((q) => q.id === 'worker').length, 0);
    const eraT = TECHS['era_' + (this.p.era + 1)];
    const nearEra = this.savingForEra && eraT && (eraT.cost.food ?? 0) > 0 && this.p.res.food >= (eraT.cost.food ?? 0) * 0.55 && this.p.res.food < (eraT.cost.food ?? 0);
    if (workers.length + queued < target && !nearEra) {
      for (const cc of ccs) {
        if (cc.prodQueue.length < 2 && !cc.prodQueue.some((q) => q.kind === 'tech' && TECHS[q.id].eraAdvance && q.progress > 0)) {
          this.w.queueTrain(cc, 'worker', 1);
        }
      }
    }
  }

  mostNeeded(counts: Record<string, number>, want: Record<GatherKind, number>): GatherKind {
    let best: GatherKind = 'food';
    let bestD = -1e9;
    for (const k of RESOURCE_TYPES) {
      const d = want[k] - counts[k];
      if (d > bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  }

  /** Asigna un trabajador a recolectar el tipo dado; puede ordenar construir un depósito */
  assignGather(u: Entity, kind: GatherKind): boolean {
    const w = this.w;
    if (kind === 'food') return this.assignFood(u);
    const resKind = kind === 'carbon' ? 'tree' : kind;
    const drops = w.buildings.filter((b) => b.alive && b.owner === this.pid && b.bd!.dropsite?.includes(kind));
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const d of drops) {
      const r = this.bestNode(d.x, d.y, resKind, 9);
      if (r) {
        const dd = Math.hypot(r.x - d.x, r.y - d.y) + r.gatherers * 1.5;
        if (dd < bestD) {
          bestD = dd;
          best = r;
        }
      }
    }
    if (best && bestD < 9) {
      w.issue(u, { type: 'gather', targetId: best.id }, false);
      best.gatherers++;
      return true;
    }
    // no hay recurso cerca de depósitos: construir depósito junto al recurso más cercano
    const far = this.bestNode(this.baseX, this.baseY, resKind, 40) ?? this.bestNode(this.baseX, this.baseY, resKind, 80);
    if (!far) return false;
    const dropDef = kind === 'carbon' ? 'carbon_center' : 'mining_center';
    const pending = w.buildings.some((b) => b.alive && b.owner === this.pid && b.defId === dropDef && !b.built && Math.hypot(b.x - far.x, b.y - far.y) < 10);
    if (!pending) this.needDropsite = this.time;
    if (!pending && this.p.canAfford(this.p.stats_of(dropDef).cost) && this.time - (this.lastBuildAt[dropDef + far.id] ?? -99) > 20) {
      const spot = this.findSpot(dropDef, far.x, far.y, 2, 6, true);
      if (spot) {
        const b = w.commandBuild(this.pid, [u.id], dropDef, spot.x, spot.y, false);
        if (b) {
          this.lastBuildAt[dropDef + far.id] = this.time;
          w.issue(u, { type: 'gather', targetId: far.id }, true);
          return true;
        }
      }
    }
    if (pending || drops.length) {
      w.issue(u, { type: 'gather', targetId: far.id }, false);
      return true;
    }
    return false;
  }

  foodDrops(): Entity[] {
    return this.w.buildings.filter((b) => b.alive && b.built && b.owner === this.pid && b.bd!.dropsite?.includes('food'));
  }

  /** Comida: bayas/cadáveres cercanos -> caza cercana -> granjas -> construir granja -> fuentes lejanas */
  assignFood(u: Entity): boolean {
    const w = this.w;
    const drops = this.foodDrops();
    const anchors = drops.length ? drops : [{ x: this.baseX, y: this.baseY } as Entity];
    // 1. fuentes naturales cerca de depósitos
    let best: Entity | null = null;
    let bestD = 9;
    for (const d of anchors) {
      const r = this.bestNode(d.x, d.y, 'food', 9);
      if (r) {
        const dd = Math.hypot(r.x - d.x, r.y - d.y) + r.gatherers;
        if (dd < bestD) {
          bestD = dd;
          best = r;
        }
      }
    }
    if (best) {
      w.issue(u, { type: 'gather', targetId: best.id }, false);
      best.gatherers++;
      return true;
    }
    // 2. caza cercana
    for (const d of anchors) {
      const animal = this.nearestHuntable(d.x, d.y, 13);
      if (animal) {
        w.issue(u, { type: 'gather', targetId: animal.id }, false);
        return true;
      }
    }
    // 3. granja libre
    const farm = w.buildings.find((b) => b.alive && b.owner === this.pid && b.bd!.farm && (!b.farmerId || !w.get(b.farmerId)));
    if (farm) {
      farm.farmerId = u.id;
      w.issue(u, { type: farm.built ? 'gather' : 'build', targetId: farm.id }, false);
      if (!farm.built) w.issue(u, { type: 'gather', targetId: farm.id }, true);
      return true;
    }
    // 4. construir granja
    if (this.p.res.carbon >= 60 && this.hasBuilding('food_center', true)) {
      const spot = this.farmSpot();
      if (spot) {
        const b = w.commandBuild(this.pid, [u.id], 'farm', spot.x, spot.y, false);
        if (b) {
          b.farmerId = u.id;
          w.issue(u, { type: 'gather', targetId: b.id }, true);
          return true;
        }
      }
    }
    if (!this.hasBuilding('food_center') && this.p.res.carbon >= 100) {
      this.tryBuild('food_center', [u]);
      return true;
    }
    // 5. fuentes lejanas
    const far = this.bestNode(this.baseX, this.baseY, 'food', 22);
    if (far) {
      w.issue(u, { type: 'gather', targetId: far.id }, false);
      far.gatherers++;
      return true;
    }
    const animal = this.nearestHuntable(this.baseX, this.baseY, 24);
    if (animal) {
      w.issue(u, { type: 'gather', targetId: animal.id }, false);
      return true;
    }
    return false;
  }

  /** Construye granjas por adelantado cuando se agotan las fuentes naturales */
  manageFarms(foodWorkersWanted: number) {
    const w = this.w;
    if (!this.hasBuilding('food_center', true)) return;
    if (this.p.res.carbon < 60) return;
    let natural = 0;
    const counted = new Set<number>();
    for (const d of this.foodDrops()) {
      w.staticHash.query(d.x, d.y, 9, w.tmp2);
      for (const r of w.tmp2) {
        if (!r.alive || r.kind !== 'resource' || r.resType !== 'food' || counted.has(r.id) || r.amount < 30) continue;
        counted.add(r.id);
        natural += r.resKind === 'carcass' ? 3 : 1.5;
      }
      for (const a of w.units) if (a.alive && a.owner === 0 && !a.ud!.attack && Math.hypot(a.x - d.x, a.y - d.y) < 13) natural += 1;
    }
    const farmList = w.buildings.filter((b) => b.alive && b.owner === this.pid && b.bd!.farm);
    const farms = farmList.length;
    const freeFarms = farmList.filter((b) => !b.farmerId || !w.get(b.farmerId)).length;
    const foodWorkers = w.units.filter((u) => u.alive && u.owner === this.pid && u.ud!.cls === 'worker' && this.workerTask(u) === 'food').length;
    if (freeFarms === 0 && farms + Math.min(natural, 14) < foodWorkersWanted && farms < foodWorkers + 1 && farms < 40) {
      const spot = this.farmSpot();
      if (!spot) return;
      // un trabajador de comida (o cualquiera) la construye y la trabaja
      const cands = w.units.filter((u) => u.alive && u.owner === this.pid && u.ud!.cls === 'worker' && u.carry < 5 && u.order?.type !== 'build');
      cands.sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y));
      const u = cands.find((c) => this.workerTask(c) === 'food') ?? cands[0];
      if (!u) return;
      const b = w.commandBuild(this.pid, [u.id], 'farm', spot.x, spot.y, false);
      if (b) {
        b.farmerId = u.id;
        w.issue(u, { type: 'gather', targetId: b.id }, true);
      }
    }
  }

  bestNode(x: number, y: number, kind: Entity['resKind'] | 'food', maxD: number): Entity | null {
    const w = this.w;
    let best: Entity | null = null;
    let bd = Infinity;
    w.staticHash.query(x, y, maxD, w.tmp);
    const exp = this.p.explored;
    for (const r of w.tmp) {
      if (!r.alive || r.kind !== 'resource' || r.amount <= 0) continue;
      if (r.unreachable & (1 << this.pid)) continue;
      if (kind === 'food' ? r.resType !== 'food' : r.resKind !== kind) continue;
      if (!exp[r.ty * w.N + r.tx] && this.p.difficulty !== 'extreme') continue;
      const cap = r.resKind === 'tree' ? 2 : r.resKind === 'bush' ? 2 : r.resKind === 'carcass' ? 5 : 3;
      if (r.gatherers >= cap) continue;
      // evitar recursos peligrosos (cerca de defensas enemigas)
      if (maxD > 20 && this.dangerous(r.x, r.y)) continue;
      const d = Math.hypot(r.x - x, r.y - y) + r.gatherers * 1.2;
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  /** ¿Hay una defensa o base enemiga conocida cerca de este punto? */
  dangerous(x: number, y: number): boolean {
    for (const [, info] of this.knownEnemyBuildings) {
      if (!this.p.isEnemy(info.owner)) continue;
      const def = BUILDINGS[info.defId];
      if (!def?.attack) continue;
      const r = (def.attack.range ?? 6) + 4;
      if (Math.abs(info.x - x) < r && Math.abs(info.y - y) < r && Math.hypot(info.x - x, info.y - y) < r) return true;
    }
    return false;
  }

  nearestHuntable(x: number, y: number, r: number): Entity | null {
    const w = this.w;
    let best: Entity | null = null;
    let bd = r;
    const hunters = new Map<number, number>();
    for (const u of w.units) if (u.alive && u.owner === this.pid && u.order?.type === 'gather' && u.order.targetId) hunters.set(u.order.targetId, (hunters.get(u.order.targetId) ?? 0) + 1);
    for (const u of w.units) {
      if (!u.alive || u.owner !== 0 || u.ud!.attack) continue;
      if (u.unreachable & (1 << this.pid)) continue;
      if ((hunters.get(u.id) ?? 0) >= 3) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d < bd) {
        bd = d;
        best = u;
      }
    }
    return best;
  }

  hasBuilding(defId: string, built = false): boolean {
    return this.w.buildings.some((b) => b.alive && b.owner === this.pid && b.defId === defId && (!built || b.built));
  }
  countBuilding(defId: string): number {
    let n = 0;
    for (const b of this.w.buildings) if (b.alive && b.owner === this.pid && b.defId === defId) n++;
    return n;
  }

  manageHousing(buildings: Entity[]) {
    const p = this.p;
    if (p.popCap >= p.popMax) return;
    const prodBuildings = buildings.filter((b) => b.bd!.trains && b.built).length;
    const pending = buildings.filter((b) => (b.defId === 'shelter' || b.defId === 'command_center') && !b.built).length;
    const margin = 3 + prodBuildings * 1.5 + (p.era - 1) * 2;
    if (p.popCap - p.pop - p.popReserved < margin && pending < (p.pop > 60 ? 3 : p.pop > 25 ? 2 : 1)) {
      if (p.res.carbon >= 30) this.tryBuild('shelter', undefined, true);
    }
  }

  manageEra(buildings: Entity[], workers: Entity[]) {
    const p = this.p;
    if (p.era >= 4) {
      this.savingForEra = false;
      return;
    }
    const next = (p.era + 1) as Era;
    const tech = TECHS['era_' + next];
    const advancing = buildings.some((b) => b.prodQueue.some((q) => TECHS[q.id]?.eraAdvance));
    if (advancing) {
      this.savingForEra = false;
      return;
    }
    const minWorkers = [0, 0, Math.min(this.d.workers * 0.55, 20), Math.min(this.d.workers * 0.75, 32), Math.min(this.d.workers * 0.9, 45)][next];
    const minTime = this.p.difficulty === 'easy' ? [0, 0, 600, 1300, 2100][next] : 0;
    if (workers.length < minWorkers || this.time < minTime) {
      this.savingForEra = false;
      return;
    }
    // requisitos de edificios
    const req = ERA_REQ_BUILDINGS[next] ?? [];
    const have = new Set(buildings.filter((b) => b.built && req.includes(b.defId)).map((b) => b.defId));
    if (have.size < 2) {
      this.savingForEra = false;
      // construir los que faltan
      for (const r of req) {
        if (have.size + this.pendingOf(r, req) >= 2) break;
        if (!this.hasBuilding(r) && BUILDINGS[r].era <= p.era && !p.isDisabled(r)) {
          this.tryBuild(r);
          break;
        }
      }
      return;
    }
    // no ahorrar indefinidamente si el recurso que falta no llega (p. ej. sin Nova en el mapa)
    if (this.time < this.eraCooldownUntil) {
      this.savingForEra = false;
      return;
    }
    if (!this.savingForEra) this.savingSince = this.time;
    if (this.time - this.savingSince > 240) {
      this.savingForEra = false;
      this.eraCooldownUntil = this.time + 150;
      return;
    }
    this.savingForEra = true;
    const cc = buildings.find((b) => b.defId === 'command_center' && b.built);
    if (cc && this.w.canResearch(this.pid, tech.id).ok) {
      // vaciar cola de trabajadores
      if (cc.prodQueue.length) {
        for (let i = cc.prodQueue.length - 1; i >= 0; i--) if (cc.prodQueue[i].progress === 0) this.w.cancelQueue(cc, i);
      }
      if (this.w.queueResearch(cc, tech.id)) this.savingForEra = false;
    }
  }

  pendingOf(r: string, req: string[]): number {
    void req;
    return this.w.buildings.some((b) => b.alive && b.owner === this.pid && b.defId === r && !b.built) ? 1 : 0;
  }

  /** Plan de edificios por era */
  manageBuildings(buildings: Entity[], workers: Entity[]) {
    const p = this.p;
    const era = p.era;
    const n = (id: string) => this.countBuilding(id);
    const want: [string, number][] = [];
    const wc = workers.length;
    want.push(['food_center', wc >= 6 ? 1 : 0]);
    want.push(['power_core', wc >= 9 ? 1 : 0]);
    want.push(['troop_center', wc >= 11 && this.p.difficulty !== 'easy' ? 1 : wc >= 16 ? 1 : 0]);
    if (era >= 2) {
      want.push(['mech_factory', 1]);
      want.push(['research_center', 1]);
      want.push(['troop_center', wc >= 22 ? Math.min(this.d.maxProdPerType, 2) : 1]);
      want.push(['power_core', 2]);
      if (this.d.turrets) want.push(['turret', Math.min(this.d.turrets, Math.floor(wc / 15))]);
      if (wc > 24) want.push(['spaceport', this.p.difficulty === 'easy' ? 0 : 1]);
    }
    if (era >= 3) {
      want.push(['temple', 1]);
      want.push(['heavy_weapons', 1]);
      if (!p.isDisabled('airbase')) want.push(['airbase', this.civWantsAir() ? Math.min(2, this.d.maxProdPerType) : 1]);
      want.push(['fortress', p.res.ore >= 600 ? 1 : n('fortress')]);
      want.push(['mech_factory', Math.min(this.d.maxProdPerType, 2)]);
      want.push(['shield_gen', this.p.difficulty === 'easy' ? 0 : 1]);
      want.push(['power_core', 3]);
      want.push(['aa_turret', this.enemyAir() > 3 ? 2 : 0]);
      want.push(['troop_center', Math.min(this.d.maxProdPerType, 3)]);
    }
    if (era >= 4) {
      want.push(['monument', this.d.monument && p.res.food > 900 && p.res.carbon > 900 && p.res.nova > 900 && p.res.ore > 900 ? 1 : n('monument')]);
      want.push(['fortress', 1]);
      want.push(['heavy_weapons', Math.min(this.d.maxProdPerType, 2)]);
    }
    // escalar la producción con la economía
    if (era >= 2) {
      const prodTarget = Math.min(10, 1 + Math.floor(wc / (this.p.difficulty === 'easy' ? 18 : 9)));
      const weights = this.compositionWeights();
      const share: Record<string, number> = {};
      let tot = 0;
      for (const k in weights) {
        const id = this.classUnit(k as UnitClass);
        if (!id) continue;
        const b = PROD_BUILDING[k as UnitClass];
        if (!b || p.isDisabled(b) || BUILDINGS[b].era > era) continue;
        share[b] = (share[b] ?? 0) + (weights[k as UnitClass] ?? 0);
        tot += weights[k as UnitClass] ?? 0;
      }
      const rich = p.res.food > 500 && p.res.carbon > 250;
      for (const b in share) {
        const want2 = Math.max(1, Math.round((share[b] / (tot || 1)) * prodTarget));
        const cap = b === 'fortress' ? 1 : this.d.maxProdPerType + (rich ? 1 : 0);
        want.push([b, Math.min(cap, want2)]);
      }
    }
    // segundo centro de mando (expansión) en dificultad alta
    if (era >= 2 && this.d.workers >= 50 && wc >= 35 && n('command_center') < 2 && p.res.carbon > 300 && p.res.ore > 120) want.push(['command_center', 2]);
    const resolved = new Map<string, number>();
    for (const [id, c] of want) resolved.set(id, Math.max(resolved.get(id) ?? 0, c));
    let built = 0;
    for (const [id, c] of resolved) {
      if (built >= 2) break;
      if (p.isDisabled(id)) continue;
      if (BUILDINGS[id].era > era) continue;
      if (n(id) >= c) continue;
      if (this.savingForEra && id !== 'shelter' && id !== 'power_core' && !(ERA_REQ_BUILDINGS[era + 1] ?? []).includes(id)) {
        // no gastar mientras se ahorra (salvo requisitos)
        if (!this.underAttack()) continue;
      }
      if (this.time - (this.lastBuildAt[id] ?? -99) < 15) continue;
      if (!p.canAfford(p.stats_of(id).cost)) continue;
      if (this.tryBuild(id)) built++;
    }
  }

  civWantsAir(): boolean {
    const s = CIV_STYLE[this.p.civ.id] ?? {};
    return (s.fighter ?? 0) >= 2;
  }

  enemyAir(): number {
    return (this.enemySeen.fighter ?? 0) + (this.enemySeen.bomber ?? 0) + (this.enemySeen.unique ?? 0) * (this.enemyHasAirUnique() ? 1 : 0);
  }
  enemyHasAirUnique(): boolean {
    return this.w.units.some((u) => u.alive && u.ud!.cls === 'unique' && u.isAir && this.p.isEnemy(u.owner));
  }

  /** Intenta construir un edificio cerca de la base con trabajadores cercanos */
  tryBuild(defId: string, builders?: Entity[], urgent = false): boolean {
    const w = this.w;
    const p = this.p;
    if (!p.canAfford(p.stats_of(defId).cost)) return false;
    let cx = this.baseX, cy = this.baseY, minR = 4, maxR = 16;
    const bd = BUILDINGS[defId];
    if (defId === 'shelter') {
      minR = 5;
      maxR = 14;
    }
    if (defId === 'food_center') {
      const bush = this.bestNode(this.baseX, this.baseY, 'bush', 16);
      if (bush) {
        cx = bush.x;
        cy = bush.y;
        minR = 2;
        maxR = 5;
      }
    }
    if (defId === 'turret' || defId === 'aa_turret') {
      cx = (this.baseX * 2 + this.rallyX) / 3;
      cy = (this.baseY * 2 + this.rallyY) / 3;
      minR = 3;
      maxR = 9;
    }
    if (defId === 'command_center') {
      // junto a un recurso de nova lejano
      const r = this.bestNode(this.baseX + (this.rallyX - this.baseX) * 0.5, this.baseY + (this.rallyY - this.baseY) * 0.5, 'nova', 40);
      if (r && Math.hypot(r.x - this.baseX, r.y - this.baseY) > 15) {
        cx = r.x;
        cy = r.y;
        minR = 4;
        maxR = 8;
      } else return false;
    }
    if (bd.needsPower) {
      // cerca de un núcleo de energía existente
      const cores = w.buildings.filter((b) => b.alive && b.owner === this.pid && b.defId === 'power_core');
      if (!cores.length) {
        if (!this.hasBuilding('power_core')) this.tryBuild('power_core');
        // construir igualmente cerca de la base (sin energía a mitad de velocidad)
      } else {
        const core = cores[Math.floor(w.rng.next() * cores.length)];
        cx = core.x;
        cy = core.y;
        minR = 2.5;
        maxR = p.stats_of('power_core').powerRadius - bd.size * 0.4;
      }
    }
    if (defId === 'power_core') {
      minR = 5;
      maxR = 12;
    }
    let spot = this.findSpot(defId, cx, cy, minR, maxR, false);
    // base saturada: ampliar el radio (refugios y edificios genéricos)
    if (!spot && !bd.needsPower && defId !== 'command_center') spot = this.findSpot(defId, this.baseX, this.baseY, maxR, maxR + 12, false);
    if (!spot && bd.needsPower) spot = this.findSpot(defId, this.baseX, this.baseY, 6, 24, false);
    if (!spot) {
      this.lastBuildAt[defId] = this.time;
      return false;
    }
    let bs = builders;
    if (!bs || !bs.length) {
      const need = bd.size >= 4 ? 3 : bd.size >= 3 ? 2 : 1;
      bs = this.pickBuilders(spot.x + bd.size / 2, spot.y + bd.size / 2, need + (urgent ? 0 : 0));
    }
    if (!bs.length) return false;
    const b = w.commandBuild(this.pid, bs.map((u) => u.id), defId, spot.x, spot.y, false);
    if (b) {
      this.lastBuildAt[defId] = this.time;
      // al terminar vuelven a su tarea anterior
      for (const u of bs) {
        if (u.queue.length === 0 && u.lastResKind) {
          /* afterBuild se encarga */
        }
      }
      return true;
    }
    return false;
  }

  pickBuilders(x: number, y: number, n: number): Entity[] {
    const ws = this.w.units.filter((u) => u.alive && u.owner === this.pid && u.ud!.cls === 'worker' && u.order?.type !== 'build' && u.carry < 6);
    ws.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    // preferir no quitar granjeros
    const pref = ws.filter((u) => !(u.order?.type === 'gather' && this.w.get(u.order.targetId!)?.bd?.farm));
    return (pref.length >= n ? pref : ws).slice(0, n);
  }

  /** Busca un hueco con margen para no bloquear caminos */
  findSpot(defId: string, cx: number, cy: number, minR: number, maxR: number, nearRes: boolean): { x: number; y: number } | null {
    const w = this.w;
    const bd = BUILDINGS[defId];
    const sz = bd.size;
    const m = w.map;
    const margin = bd.farm ? 0 : 1;
    const tries: { x: number; y: number; d: number }[] = [];
    for (let r = Math.max(0, minR); r <= maxR; r += 0.8) {
      const steps = Math.max(8, Math.round(r * 5));
      const off = w.rng.next() * Math.PI * 2;
      for (let k = 0; k < steps; k++) {
        const a = off + (k / steps) * Math.PI * 2;
        const tx = Math.round(cx + Math.cos(a) * r - sz / 2);
        const ty = Math.round(cy + Math.sin(a) * r - sz / 2);
        tries.push({ x: tx, y: ty, d: r });
      }
      if (tries.length > 700) break;
    }
    for (const t of tries) {
      if (!w.canPlace(this.pid, defId, t.x, t.y, true)) continue;
      // margen: no pegado a otros edificios (excepto granjas) ni bloqueando
      let ok = true;
      for (let dy = -margin; dy < sz + margin && ok; dy++) {
        for (let dx = -margin; dx < sz + margin && ok; dx++) {
          if (dx >= 0 && dy >= 0 && dx < sz && dy < sz) continue;
          const x = t.x + dx, y = t.y + dy;
          if (!m.inBounds(x, y)) {
            ok = false;
            continue;
          }
          const o = m.occ[y * m.w + x];
          if (o > 0) {
            const e = w.entities.get(o);
            if (e && e.kind === 'building') ok = false;
            else if (e && e.kind === 'resource' && !nearRes && !bd.farm && (dx === -1 || dy === -1 || dx === sz || dy === sz) && defId !== 'shelter') ok = !(e.resKind === 'nova' || e.resKind === 'ore' || e.resKind === 'bush');
          }
          if (o === -1) ok = false;
          if (bd.farm) continue;
          if (m.farmOcc[y * m.w + x] && !bd.farm) {
            /* las granjas se pueden rodear */
          }
        }
      }
      if (!ok) continue;
      // no construir justo encima de recursos de la base (bayas, nova)
      if (!nearRes && !bd.farm && defId !== 'food_center') {
        let blockRes = false;
        w.staticHash.query(t.x + sz / 2, t.y + sz / 2, sz / 2 + 1.5, w.tmp2);
        for (const r of w.tmp2) if (r.kind === 'resource' && (r.resKind === 'nova' || r.resKind === 'ore' || r.resKind === 'bush')) blockRes = true;
        if (blockRes) continue;
      }
      return { x: t.x, y: t.y };
    }
    return null;
  }

  farmSpot(): { x: number; y: number } | null {
    const anchors = this.w.buildings.filter((b) => b.alive && b.owner === this.pid && (b.defId === 'command_center' || b.defId === 'food_center') && b.built);
    for (const a of anchors) {
      const s = this.findSpot('farm', a.x, a.y, a.size / 2 + 1.5, a.size / 2 + 6, false);
      if (s) return s;
    }
    return this.findSpot('farm', this.baseX, this.baseY, 4, 14, false);
  }

  // ─────────────────────────── Investigación ───────────────────────────

  manageResearch(buildings: Entity[]) {
    if (this.savingForEra && !this.underAttack()) return;
    const p = this.p;
    const rng = this.w.rng;
    // reserva para unidades
    const reserve = this.p.era >= 3 ? 250 : 120;
    const eco = ECO_TECHS;
    const mil = MIL_TECHS;
    const tryList = (list: string[]) => {
      for (const id of list) {
        const t = TECHS[id];
        if (!t || p.techs.has(id) || p.queuedTechs.has(id)) continue;
        if (!techAvailable(p, t) || t.era > p.era) continue;
        if (t.requires && !t.requires.every((r) => p.techs.has(r))) continue;
        const b = buildings.find((bb) => bb.built && bb.defId === t.building && bb.prodQueue.length === 0);
        if (!b) continue;
        const c = p.techCost(t);
        let ok = true;
        for (const r of RESOURCE_TYPES) {
          const cr = c[r] ?? 0;
          if (cr > 0 && cr > p.res[r] - (r === 'food' || r === 'nova' ? reserve * 0.5 : 0)) ok = false;
        }
        if (!ok) continue;
        if (rng.next() > this.d.researchChance) continue;
        if (this.w.queueResearch(b, id)) return true;
      }
      return false;
    };
    tryList(eco);
    if (p.era >= 2) tryList(mil);
    // mejoras de línea para lo que usamos
    const lineUps = Object.values(TECHS).filter((t) => t.upgrade && t.era <= p.era && (!t.civ || t.civ === p.civ.id)).map((t) => t.id);
    const used = new Set(this.w.units.filter((u) => u.alive && u.owner === this.pid).map((u) => u.defId));
    const useful = lineUps.filter((id) => TECHS[id].upgrade!.some(([from]) => used.has(from)));
    tryList(useful);
    // tecnologías únicas
    if (p.era >= 3) tryList(p.civ.uniqueTechs);
  }

  // ─────────────────────────── Producción militar ───────────────────────────

  compositionWeights(): Partial<Record<UnitClass, number>> {
    const base = { ...(CIV_STYLE[this.p.civ.id] ?? { trooper: 3 }) };
    const e = this.enemySeen;
    const tot = Object.values(e).reduce((a, b) => a + (b ?? 0), 0) + 0.01;
    const f = (c: UnitClass) => (e[c] ?? 0) / tot;
    const add = (c: UnitClass, v: number) => (base[c] = (base[c] ?? 0) + v);
    // contrarrestar
    const infantry = f('trooper') + f('grenadier') + f('aaTrooper');
    const mechs = f('strikeMech') + f('assaultMech') + f('mechDestroyer') + f('pummel') + f('aaMobile');
    const mounted = f('mounted') + f('scout');
    const air = this.enemyAir() / tot;
    const heavy = f('artillery') + f('pummel');
    const jedi = f('jediKnight') + f('hero');
    add('grenadier', infantry * 4);
    add('strikeMech', infantry * 3);
    add('mounted', infantry * 2 + heavy * 3);
    add('mechDestroyer', mechs * 6 + mounted * 4);
    add('jediKnight', mechs * 2);
    add('trooper', mounted * 1 + heavy * 2);
    add('grenadier', jedi * 3);
    add('aaTrooper', air * 6);
    add('aaMobile', air * 5);
    add('fighter', air * 4);
    // asedio en ataques a partir de la era 3
    if (this.p.era >= 3) {
      let defs = 0;
      for (const [, info] of this.knownEnemyBuildings) {
        if (info.defId === 'fortress') defs += 2;
        else if (info.defId === 'turret' || info.defId === 'command_center' || info.defId === 'aa_turret') defs += 1;
      }
      let forts = 0;
      for (const [, info] of this.knownEnemyBuildings) if (info.defId === 'fortress') forts++;
      const sumW = Object.values(base).reduce((a, b) => a + (b ?? 0), 0);
      add('pummel', sumW * Math.min(0.2, 0.06 + defs * 0.012));
      add('artillery', sumW * Math.min(0.24, 0.04 + defs * 0.008 + forts * 0.07));
      // bloqueados por defensas: asedio prioritario
      if (this.time - this.needSiegeAt < 120) {
        add('artillery', sumW * 0.3);
        add('pummel', sumW * 0.25);
      }
    }
    return base;
  }

  manageProduction(buildings: Entity[], military: Entity[], workers: Entity[]) {
    const p = this.p;
    if (this.savingForEra && !this.underAttack()) {
      // solo un mínimo de defensa
      if (military.length > 4 + this.p.era * 2) return;
    }
    if (workers.length < 8 && !this.underAttack()) return;
    if (this.p.era === 1 && !this.underAttack() && (workers.length < 22 || this.p.res.food < 350 || this.savingForEra)) return;
    const weights = this.compositionWeights();
    const counts: Partial<Record<UnitClass, number>> = {};
    for (const u of military) counts[u.ud!.cls] = (counts[u.ud!.cls] ?? 0) + 1;
    const totalW = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
    const total = military.length + 1;
    const reserve: Record<ResourceType, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
    if (p.era >= 3 && !this.hasBuilding('fortress')) reserve.ore = 650;
    if (this.time - this.needDropsite < 30) reserve.carbon = 110;
    // reservar para granjas cuando la comida escasea
    if (p.res.food < 150) reserve.carbon = Math.max(reserve.carbon, 120);
    for (const b of buildings) {
      if (!b.built || !b.bd!.trains || b.defId === 'command_center') continue;
      if (b.prodQueue.length >= 2) continue;
      const opts = this.w.trainOptions(b);
      let best: string | null = null;
      let bestScore = -1e9;
      for (const id of opts) {
        const ud = UNITS[id];
        if (ud.cls === 'hero') continue;
        if (ud.cls === 'jediMaster') {
          const masters = this.w.units.filter((u) => u.alive && u.owner === this.pid && u.ud!.cls === 'jediMaster').length;
          if (masters >= (this.d.useConversion ? 3 : 1)) continue;
          if (!this.w.canTrain(this.pid, id).ok) continue;
          const sc = 0.4 - masters * 0.2;
          if (sc > bestScore) {
            bestScore = sc;
            best = id;
          }
          continue;
        }
        if (ud.cls === 'scout') continue;
        const c = this.w.canTrain(this.pid, id);
        if (!c.ok) continue;
        const cost = p.stats_of(id).cost;
        let affordable = true;
        for (const r of RESOURCE_TYPES) {
          const c = cost[r] ?? 0;
          if (c > 0 && c > p.res[r] - reserve[r]) affordable = false;
        }
        if (!affordable) continue;
        const wgt = (weights[ud.cls] ?? 0) / totalW;
        const have = (counts[ud.cls] ?? 0) / total;
        const sc = wgt - have + this.w.rng.next() * 0.05;
        if (wgt <= 0) continue;
        if (sc > bestScore) {
          bestScore = sc;
          best = id;
        }
      }
      if (best) {
        if (this.w.queueTrain(b, best, 1)) counts[UNITS[best].cls] = (counts[UNITS[best].cls] ?? 0) + 1;
      }
      // punto de reunión
      b.rallyX = this.rallyX;
      b.rallyY = this.rallyY;
    }
    // héroes
    if (this.d.heroes && p.era >= 3 && this.thinkCount % 5 === 0) {
      for (const h of p.civ.heroes) {
        const ud = UNITS[h];
        const bld = buildings.find((b) => b.built && b.defId === ud.building && b.prodQueue.length < 2);
        if (!bld) continue;
        if (!this.w.canTrain(this.pid, h).ok) continue;
        const dead = p.heroDead[h] ?? -999;
        if (this.time - dead < 180) continue;
        const cost = p.stats_of(h).cost;
        if ((cost.nova ?? 0) + 300 > p.res.nova || (cost.food ?? 0) + 200 > p.res.food) continue;
        this.w.queueTrain(bld, h, 1);
        break;
      }
    }
  }

  // ─────────────────────────── Exploración ───────────────────────────

  manageScout(units: Entity[]) {
    const scouts = units.filter((u) => u.ud!.cls === 'scout');
    for (const s of scouts) {
      s.stance = 'passive';
      if (s.order) continue;
      const pt = this.scoutPoints[this.scoutIdx++ % this.scoutPoints.length];
      this.w.issue(s, { type: 'move', x: pt.x, y: pt.y }, false);
    }
  }

  // ─────────────────────────── Ejército ───────────────────────────

  underAttack(): boolean {
    return this.time - this.p.lastAttackedAt < 8;
  }

  threatsNearBase(): Entity[] {
    const w = this.w;
    const out: Entity[] = [];
    // solo el núcleo de la base: cerca de un centro de mando o edificios importantes
    const ccs = w.buildings.filter((b) => b.alive && b.owner === this.pid && b.defId === 'command_center');
    const anchors = ccs.length ? ccs : [{ x: this.baseX, y: this.baseY } as Entity];
    const myB = w.buildings.filter((b) => {
      if (!b.alive || b.owner !== this.pid || b.bd!.wall) return false;
      for (const a of anchors) if (Math.abs(a.x - b.x) < 22 && Math.abs(a.y - b.y) < 22) return true;
      return b.defId === 'fortress' || b.defId === 'temple' || b.defId === 'monument';
    });
    for (const u of w.units) {
      if (!u.alive || !this.p.isEnemy(u.owner) || u.ud!.cls === 'scout' || u.garrisonedIn) continue;
      for (const b of myB) {
        if (Math.abs(u.x - b.x) < 12 && Math.abs(u.y - b.y) < 12) {
          out.push(u);
          break;
        }
      }
    }
    return out;
  }

  strength(us: Entity[]): number {
    let s = 0;
    for (const u of us) {
      const st = this.w.players[u.owner].stats_of(u.defId);
      s += (st.hp / 50) * (1 + st.damage / 8) * (u.hp / u.maxHp);
    }
    return s;
  }

  manageArmy(military: Entity[], all: Entity[]) {
    const w = this.w;
    if (!military.length) {
      this.attacking = false;
    }
    // defensa (las amenazas se recalculan cada dos ciclos y se recuerdan entre medias)
    if (this.thinkCount % 2 === 0) this.lastThreats = this.threatsNearBase();
    const threats = this.lastThreats.filter((u) => u.alive);
    if (threats.length) {
      const tStr = this.strength(threats);
      const cx = threats.reduce((a, u) => a + u.x, 0) / threats.length;
      const cy = threats.reduce((a, u) => a + u.y, 0) / threats.length;
      const defenders = military.filter((u) => Math.hypot(u.x - cx, u.y - cy) < 40 || this.defenders.has(u.id));
      const dStr = this.strength(defenders);
      if (!this.defending) {
        this.defending = true;
      }
      for (const u of defenders) {
        const o = u.order;
        if (o?.type === 'attack' || o?.type === 'convert' || o?.type === 'heal' || o?.type === 'ability') continue;
        if (u.targetId && w.get(u.targetId)?.alive) continue; // ya combatiendo
        if (o?.type === 'attackMove' && Math.hypot((o.x ?? 0) - cx, (o.y ?? 0) - cy) < 9) continue;
        w.issue(u, { type: 'attackMove', x: cx, y: cy }, false);
        this.defenders.add(u.id);
      }
      // si es grave y el ejército está lejos atacando, retirarlo
      if (this.attacking && dStr < tStr * 0.8 && this.d.retreat) {
        this.attacking = false;
        for (const u of military) w.issue(u, { type: 'attackMove', x: cx, y: cy }, false);
      }
      // toque de alarma si el ataque supera a los defensores
      const threatMil = threats.filter((u) => u.ud!.attack && u.ud!.cls !== 'worker');
      if (this.p.difficulty !== 'easy' && threatMil.length >= 3 && dStr < tStr * 0.7) {
        w.ringAlarm(this.pid, cx, cy, 11);
        this.alarmAt = this.time;
      }
      // liberar a los refugiados de edificios ya seguros
      if (this.p.alarm && this.time - this.alarmAt > 8) w.releaseAlarm(this.pid, true);
      // trabajadores se defienden en casos extremos contra pocas unidades
      if (dStr < tStr * 0.5 && threats.length <= 3 && this.p.difficulty !== 'easy' && !this.p.alarm) {
        const nearW = all.filter((u) => u.ud!.cls === 'worker' && Math.hypot(u.x - cx, u.y - cy) < 8);
        for (const u of nearW.slice(0, 6)) w.issue(u, { type: 'attack', targetId: threats[0].id }, false);
      }
      return;
    }
    if (this.p.alarm && this.time - this.alarmAt > 6) w.releaseAlarm(this.pid, true);
    if (this.defending) {
      this.defending = false;
      // los defensores vuelven al punto de reunión (salvo que estemos atacando)
      if (!this.attacking) {
        for (const u of military) if (this.defenders.has(u.id) && (!u.order || u.order.type === 'attackMove')) w.issue(u, { type: 'move', x: this.rallyX + w.rng.range(-3, 3), y: this.rallyY + w.rng.range(-3, 3) }, false);
      }
      this.defenders.clear();
      // trabajadores vuelven a trabajar
      for (const u of all) if (u.ud!.cls === 'worker' && u.order?.type === 'attack') w.setOrder(u, null);
    }

    // conversión con maestros
    if (this.d.useConversion) {
      const masters = all.filter((u) => u.ud!.cls === 'jediMaster' && (!u.order || u.order.type === 'move' || u.order.type === 'follow' || u.order.type === 'heal'));
      for (const m of masters) {
        const out = w.tmp;
        w.unitHash.query(m.x, m.y, 10, out);
        let best: Entity | null = null;
        let bv = 0;
        for (const t of out) {
          if (!t.alive || !this.p.isEnemy(t.owner) || t.ud!.cls === 'hero' || t.ud!.cls === 'jediMaster' || t.ud!.cls === 'worker') continue;
          const v = (t.ud!.cost.nova ?? 0) + (t.ud!.cost.carbon ?? 0) * 0.5;
          if (v > bv) {
            bv = v;
            best = t;
          }
        }
        if (best && bv > 60) w.issue(m, { type: 'convert', targetId: best.id }, false);
        else if (!m.order && this.attacking && military.length) {
          const lead = military[Math.floor(w.rng.next() * military.length)];
          w.issue(m, { type: 'follow', targetId: lead.id }, false);
        }
      }
    }

    // ataques
    const armySize = military.length;
    const needed = Math.min(42, this.d.attackSize + this.wave * this.d.waveGrow);
    const treaty = this.time < this.w.treatyUntil;
    // seguimiento del crecimiento del ejército: si se estanca, atacar con lo que hay
    if (armySize > this.armyPeak) {
      this.armyPeak = armySize;
      this.armyGrowAt = this.time;
    }
    const stagnant = this.time - this.armyGrowAt > 80 && armySize >= Math.max(6, needed * 0.45);
    let enemyMil = 0;
    for (const k in this.enemySeen) if (k !== 'worker') enemyMil += this.enemySeen[k as UnitClass] ?? 0;
    const dominant = this.time > 1500 && armySize >= 12 && enemyMil < armySize * 0.3;
    if (!this.attacking) {
      // agrupar en el punto de reunión
      if (this.thinkCount % 4 === 0) {
        for (const u of military) {
          if (u.order) continue;
          if (Math.hypot(u.x - this.rallyX, u.y - this.rallyY) > 7) w.issue(u, { type: 'move', x: this.rallyX + w.rng.range(-3, 3), y: this.rallyY + w.rng.range(-3, 3) }, false);
        }
      }
      const popFull = this.p.pop >= this.p.popCap - 2 && armySize >= 6;
      if (!treaty && this.time >= this.nextAttackAt && (armySize >= needed || popFull || stagnant || dominant) && armySize >= 4) {
        this.armyPeak = 0;
        this.armyGrowAt = this.time;
        const tgt = this.chooseTarget();
        if (tgt) {
          this.attacking = true;
          this.attackTarget = tgt;
          this.wave++;
          for (const u of military) this.sendToAttack(u, tgt);
          // aliados humanos: aviso
          for (const q of w.players) if (q.id && q.human && q.isAlly(this.pid) && q.id !== this.pid) w.msg(q.id, `${this.p.name}: ¡Lanzo un ataque contra ${w.players[tgt.pid].name}!`, '#9fd8ff');
        }
      }
    } else {
      // seguimiento del ataque
      const engaged = military.filter((u) => u.order);
      const str = this.strength(military);
      if (this.d.retreat && armySize < Math.max(3, needed * 0.25) && this.thinkCount % 3 === 0) {
        // retirada
        this.attacking = false;
        this.nextAttackAt = this.time + 90;
        for (const u of military) w.issue(u, { type: 'move', x: this.rallyX, y: this.rallyY }, false);
        return;
      }
      if (!armySize) {
        this.attacking = false;
        this.nextAttackAt = this.time + 60;
        return;
      }
      void str;
      // unidades sin orden: siguiente objetivo
      const idle = military.filter((u) => !u.order);
      // limpieza: el enemigo apenas tiene ejército -> repartirse entre sus edificios
      if (idle.length && enemyMil < 3 && this.knownEnemyBuildings.size) {
        const load = new Map<number, number>();
        for (const u of military) if (u.order?.type === 'attack' && u.order.targetId) load.set(u.order.targetId, (load.get(u.order.targetId) ?? 0) + 1);
        const cands: Entity[] = [];
        for (const [id] of this.knownEnemyBuildings) {
          const b = w.get(id);
          if (b && b.alive && b.kind === 'building' && !b.bd!.wall && this.p.isEnemy(b.owner)) cands.push(b);
        }
        if (cands.length) {
          // zonas cubiertas por defensas enemigas
          const defs = cands.filter((b) => b.bd!.attack && (b.defId === 'turret' || b.defId === 'fortress' || b.defId === 'command_center'));
          const covered = (b: Entity) => {
            for (const d of defs) {
              const r = w.players[d.owner].stats_of(d.defId).range + 3.5;
              if (d !== b && Math.hypot(d.x - b.x, d.y - b.y) < r + b.size * 0.5) return true;
            }
            return false;
          };
          let blocked = 0;
          for (const u of idle) {
            const c = u.ud!.cls;
            const siegeU = c === 'pummel' || c === 'artillery' || c === 'bomber' || c === 'assaultMech' || c === 'grenadier';
            let best: Entity | null = null;
            let bdist = Infinity;
            for (const b of cands) {
              const isDef = defs.includes(b);
              if (!siegeU && (isDef || covered(b))) continue;
              const l = load.get(b.id) ?? 0;
              let d = Math.hypot(b.x - u.x, b.y - u.y) + l * 6 + (b.bd!.farm || b.defId === 'shelter' ? 8 : 0);
              if (siegeU && isDef) d -= 25;
              if (d < bdist) {
                bdist = d;
                best = b;
              }
            }
            if (best) {
              w.issue(u, { type: 'attack', targetId: best.id }, false);
              load.set(best.id, (load.get(best.id) ?? 0) + 1);
            } else blocked++;
          }
          if (blocked) {
            // solo quedan objetivos defendidos: esperar al asedio fuera de alcance...
            if (!this.blockedSince) this.blockedSince = this.time;
            this.needSiegeAt = this.time;
            const army = military.length;
            // ...pero si el asedio no llega, concentrar todo el fuego en la defensa más débil
            const weak = defs
              .filter((d) => d.defId !== 'fortress' || army >= 45)
              .sort((a, b) => a.hp - b.hp)[0];
            if (weak && this.time - this.blockedSince > 100 && army >= 15) {
              for (const u of military) if (!u.order || u.order.type === 'move') w.issue(u, { type: 'attack', targetId: weak.id }, false);
            } else {
              for (const u of idle) if (!u.order) w.issue(u, { type: 'move', x: this.rallyX + w.rng.range(-3, 3), y: this.rallyY + w.rng.range(-3, 3) }, false);
            }
          } else this.blockedSince = 0;
          return;
        }
      }
      if (idle.length) {
        const tgt = this.chooseTarget(military);
        if (!tgt) {
          this.attacking = false;
          this.nextAttackAt = this.time + 30;
          return;
        }
        this.attackTarget = tgt;
        for (const u of idle) this.sendToAttack(u, tgt);
      }
      // refuerzos desde la base
      if (this.thinkCount % 8 === 0 && this.attackTarget) {
        for (const u of military) {
          if (!u.order && Math.hypot(u.x - this.rallyX, u.y - this.rallyY) < 10) this.sendToAttack(u, this.attackTarget);
        }
      }
      void engaged;
    }
  }

  sendToAttack(u: Entity, tgt: { x: number; y: number; pid: number }) {
    const w = this.w;
    const cls = u.ud!.cls;
    if (cls === 'pummel' || cls === 'artillery' || cls === 'bomber') {
      // ir directamente contra edificios (primero las defensas)
      const b = this.nearestEnemyBuilding(u.x, u.y, tgt.pid, tgt.x, tgt.y, true) ?? this.nearestEnemyBuilding(u.x, u.y, tgt.pid, tgt.x, tgt.y);
      if (b) {
        w.issue(u, { type: 'attack', targetId: b.id }, false);
        return;
      }
    }
    w.issue(u, { type: 'attackMove', x: tgt.x + w.rng.range(-2, 2), y: tgt.y + w.rng.range(-2, 2) }, false);
  }

  nearestEnemyBuilding(x: number, y: number, pid: number, tx: number, ty: number, defensesOnly = false): Entity | null {
    let best: Entity | null = null;
    let bd = Infinity;
    for (const b of this.w.buildings) {
      if (!b.alive || b.owner !== pid || b.bd!.wall) continue;
      if (defensesOnly && !b.bd!.attack) continue;
      if (!this.knownEnemyBuildings.has(b.id) && this.p.difficulty !== 'extreme') continue;
      const d = Math.hypot(b.x - tx, b.y - ty) + Math.hypot(b.x - x, b.y - y) * 0.3;
      if (defensesOnly && d > 26) continue;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  chooseTarget(army?: Entity[]): { x: number; y: number; pid: number } | null {
    const w = this.w;
    let ax = this.baseX, ay = this.baseY;
    if (army && army.length) {
      ax = army.reduce((a, u) => a + u.x, 0) / army.length;
      ay = army.reduce((a, u) => a + u.y, 0) / army.length;
    }
    // ¿llevamos asedio suficiente para atacar posiciones defendidas?
    let siege = 0;
    if (army) for (const u of army) {
      const c = u.ud!.cls;
      if (c === 'pummel' || c === 'artillery' || c === 'bomber') siege += 1;
      else if (c === 'assaultMech') siege += 0.5;
      else if (c === 'grenadier') siege += 0.25;
    }
    const defended: { x: number; y: number; r: number; w: number }[] = [];
    for (const [, info] of this.knownEnemyBuildings) {
      if (info.defId === 'turret') defended.push({ x: info.x, y: info.y, r: 10, w: 1 });
      else if (info.defId === 'fortress') defended.push({ x: info.x, y: info.y, r: 11, w: 3 });
    }
    // preferir el enemigo más cercano / el objetivo actual
    let best: { x: number; y: number; pid: number } | null = null;
    let bd = Infinity;
    for (const [id, info] of this.knownEnemyBuildings) {
      if (w.players[info.owner].defeated || !this.p.isEnemy(info.owner)) continue;
      const b = id > 0 ? w.get(id) : null;
      if (id > 0 && !b) continue;
      let d = Math.hypot(info.x - ax, info.y - ay);
      if (b && b.bd!.wall) d += 30;
      if (b && b.defId === 'command_center') d -= 5;
      if (this.attackTarget && info.owner === this.attackTarget.pid) d -= 10;
      // evitar meterse bajo torretas/fortalezas sin asedio suficiente
      let cover = 0;
      for (const dp of defended) if (Math.abs(dp.x - info.x) < dp.r && Math.abs(dp.y - info.y) < dp.r && Math.hypot(dp.x - info.x, dp.y - info.y) < dp.r) cover += dp.w;
      if (cover > 0 && siege < 2 + cover) d += cover * (siege >= 1 ? 9 : 18);
      else if (cover > 0 && b && (b.defId === 'turret' || b.defId === 'fortress')) d -= 8;
      if (d < bd) {
        bd = d;
        best = { x: info.x, y: info.y, pid: info.owner };
      }
    }
    if (best) return best;
    // sin información: explorar hacia enemigos conocidos por posición inicial (aproximada)
    const enemies = w.players.filter((q) => q.id && this.p.isEnemy(q.id) && !q.defeated);
    if (!enemies.length) return null;
    // unidades enemigas visibles
    for (const u of w.units) {
      if (u.alive && this.p.isEnemy(u.owner) && this.p.visible[Math.floor(u.y) * w.N + Math.floor(u.x)]) return { x: u.x, y: u.y, pid: u.owner };
    }
    const e = enemies[Math.floor(w.rng.next() * enemies.length)];
    return { x: e.startX + w.rng.range(-10, 10), y: e.startY + w.rng.range(-10, 10), pid: e.id };
  }

  // ─────────────────────────── Holocrones ───────────────────────────

  manageHolocrons(units: Entity[]) {
    const w = this.w;
    if (this.thinkCount % 6 !== 0 || this.p.difficulty === 'easy') return;
    if (!this.hasBuilding('temple', true)) return;
    let hunter = this.holocronHunter ? w.get(this.holocronHunter) : undefined;
    if (hunter && (hunter.order?.type === 'pickup' || hunter.order?.type === 'deposit' || hunter.holocronId)) return;
    const free = w.holocrons.filter((h) => !h.carrierId && !h.templeId);
    if (!free.length) return;
    if (!hunter) {
      hunter = units.find((u) => u.ud!.carriesHolocron && u.ud!.cls !== 'hero' && !u.holocronId);
      if (!hunter) return;
      this.holocronHunter = hunter.id;
    }
    free.sort((a, b) => Math.hypot(a.x - hunter!.x, a.y - hunter!.y) - Math.hypot(b.x - hunter!.x, b.y - hunter!.y));
    const h = free[0];
    // no ir a por holocrones dentro de bases enemigas
    for (const [, info] of this.knownEnemyBuildings) if (Math.hypot(info.x - h.x, info.y - h.y) < 12) return;
    w.issue(hunter, { type: 'pickup', targetId: h.id }, false);
  }

  // ─────────────────────────── Mercado y reparación ───────────────────────────

  manageMarket(buildings: Entity[]) {
    if (!buildings.some((b) => b.built && b.defId === 'spaceport')) return;
    const p = this.p;
    const w = this.w;
    const tradable = ['food', 'carbon', 'ore'] as const;
    const short = tradable.filter((r) => p.res[r] < 220).sort((a, b) => p.res[a] - p.res[b]);
    const reserve = p.era >= 3 ? 220 : 120;
    // vender excedentes (más agresivo si falta algo o si la Nova escasea)
    for (const r of tradable) {
      let limit = r === 'ore' ? (this.hasBuilding('fortress') || p.era < 3 ? 500 : 900) : r === 'food' ? 1300 : 1100;
      if (short.length && !short.includes(r)) limit -= 350;
      if (p.res.nova < reserve) limit -= 200;
      // la Nova es el cuello de botella (asedio, héroes, eras): vender más agresivamente
      const novaNeed = p.era >= 3 ? 450 : 250;
      if (p.res.nova < novaNeed) limit = Math.min(limit, r === 'ore' ? 450 : 550);
      limit = Math.max(450, limit);
      for (let k = 0; k < 4 && p.res[r] > limit + 100; k++) if (!w.marketSell(this.pid, r)) break;
    }
    // comprar lo escaso con Nova, conservando una reserva
    for (const r of short) {
      for (let k = 0; k < 3 && p.res[r] < 300; k++) {
        const price = Math.round(w.market[r] * (1 + w.marketFee(this.pid)));
        if (p.res.nova < reserve + price) break;
        if (!w.marketBuy(this.pid, r)) break;
      }
    }
  }

  manageRepairs(buildings: Entity[], workers: Entity[]) {
    if (this.p.difficulty === 'easy') return;
    const dmg = buildings.filter((b) => b.built && b.hp < b.maxHp * 0.6 && !b.bd!.farm && b.defId !== 'wall');
    for (const b of dmg.slice(0, 1)) {
      if (this.threatsNearBase().length) return;
      const already = workers.some((u) => u.order?.type === 'repair' && u.order.targetId === b.id);
      if (already) continue;
      const bs = this.pickBuilders(b.x, b.y, 2);
      for (const u of bs) this.w.issue(u, { type: 'repair', targetId: b.id }, false);
    }
    // reconstruir centro de mando perdido
    if (!buildings.some((b) => b.defId === 'command_center') && workers.length >= 3 && this.p.canAfford(this.p.stats_of('command_center').cost)) {
      const spot = this.findSpot('command_center', this.baseX, this.baseY, 0, 10, false);
      if (spot) this.w.commandBuild(this.pid, workers.slice(0, 4).map((u) => u.id), 'command_center', spot.x, spot.y, false);
    }
  }
}

export function attachAI(w: World): AIController[] {
  const ais: AIController[] = [];
  for (const p of w.players) {
    if (p.id && !p.human) ais.push(new AIController(w, p.id));
  }
  w.onTick = () => {
    for (const a of ais) a.update();
  };
  return ais;
}

export { DIFF };
