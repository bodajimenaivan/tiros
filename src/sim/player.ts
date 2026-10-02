import type { CivDef, Cost, Era, Modifier, ModStat, ResourceType, UnitDef, BuildingDef, TechDef } from '../data/types';
import { RESOURCE_TYPES } from '../data/types';
import { UNITS } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { TECHS } from '../data/techs';

export type Diplo = 'ally' | 'neutral' | 'enemy';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export interface ComputedStats {
  hp: number;
  damage: number;
  armorMelee: number;
  armorRanged: number;
  speed: number;
  range: number;
  los: number;
  reload: number;
  carry: number;
  trainTime: number;
  buildTime: number;
  heal: number;
  regen: number;
  deflect: number;
  convertSpeed: number;
  powerRadius: number;
  shieldRadius: number;
  splash: number;
  cost: Cost;
}

export interface PlayerStats {
  unitsKilled: number;
  unitsLost: number;
  buildingsDestroyed: number;
  buildingsLost: number;
  unitsTrained: number;
  buildingsBuilt: number;
  techs: number;
  gathered: Record<ResourceType, number>;
  converted: number;
  tributeSent: number;
  eraTimes: number[];
  militaryScore: number;
  economyScore: number;
  timeline: { t: number; score: number; pop: number }[];
}

export class Player {
  id: number;
  name: string;
  civ: CivDef;
  color: number;
  team: number;
  human: boolean;
  difficulty: Difficulty = 'normal';
  res: Record<ResourceType, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
  era: Era = 1;
  techs = new Set<string>();
  queuedTechs = new Set<string>();
  upgrades = new Map<string, string>();
  pop = 0;
  popReserved = 0;
  popWarnAt = -99;
  popCap = 0;
  popMax = 200;
  diplo: Diplo[] = [];
  defeated = false;
  resigned = false;
  mods: Modifier[] = [];
  private cache = new Map<string, ComputedStats>();
  private ecoCache = new Map<ModStat, number>();
  stats: PlayerStats;
  explored!: Uint8Array;
  visible!: Uint8Array;
  sharedVision = false;
  revealUntil = 0;
  lastAttackedAt = -999;
  lastAttackedX = 0;
  lastAttackedY = 0;
  startX = 0;
  startY = 0;
  heroDead: Record<string, number> = {};
  alarm = false;
  gaia = false;

  constructor(id: number, name: string, civ: CivDef, color: number, team: number, human: boolean) {
    this.id = id;
    this.name = name;
    this.civ = civ;
    this.color = color;
    this.team = team;
    this.human = human;
    this.stats = {
      unitsKilled: 0, unitsLost: 0, buildingsDestroyed: 0, buildingsLost: 0, unitsTrained: 0, buildingsBuilt: 0, techs: 0,
      gathered: { food: 0, carbon: 0, nova: 0, ore: 0 }, converted: 0, tributeSent: 0, eraTimes: [0], militaryScore: 0, economyScore: 0, timeline: [],
    };
    for (const b of civ.bonuses) if (b.mods) this.mods.push(...b.mods);
  }

  invalidate() {
    this.cache.clear();
    this.ecoCache.clear();
  }

  addMods(mods: Modifier[]) {
    this.mods.push(...mods);
    this.invalidate();
  }

  isEnemy(other: number): boolean {
    if (other === this.id) return false;
    if (other === 0) return false;
    return this.diplo[other] === 'enemy';
  }
  isAlly(other: number): boolean {
    return other === this.id || this.diplo[other] === 'ally';
  }

  /** Resuelve la unidad actual de una línea de mejora */
  resolveUnit(id: string): string {
    let cur = id;
    for (let i = 0; i < 4; i++) {
      const n = this.upgrades.get(cur);
      if (!n) break;
      cur = n;
    }
    return cur;
  }

  isDisabled(id: string): boolean {
    return this.civ.disabled.includes(id);
  }

  private matches(m: Modifier, def: UnitDef | BuildingDef, isUnit: boolean): boolean {
    const t = m.target;
    if (t.player) return false;
    if (t.all) return true;
    if (isUnit) {
      const u = def as UnitDef;
      if (t.allUnits && u.cls !== 'animal') return true;
      if (t.units && t.units.includes(u.id)) return true;
      if (t.cls && t.cls.includes(u.cls)) return true;
      if (t.tags && u.tags.some((g) => t.tags!.includes(g))) return true;
    } else {
      const b = def as BuildingDef;
      if (t.allBuildings) return true;
      if (t.buildings && t.buildings.includes(b.id)) return true;
      if (t.tags && b.tags.some((g) => t.tags!.includes(g))) return true;
    }
    return false;
  }

  /** Estadísticas efectivas de una unidad o edificio para este jugador */
  stats_of(defId: string): ComputedStats {
    const c = this.cache.get(defId);
    if (c) return c;
    const u = UNITS[defId];
    const b = u ? null : BUILDINGS[defId];
    const def = (u ?? b)!;
    const isUnit = !!u;
    const atk = def.attack;
    const base: Record<string, number> = {
      hp: def.hp,
      damage: atk?.damage ?? 0,
      armorMelee: def.armor.melee,
      armorRanged: def.armor.ranged,
      speed: u?.speed ?? 0,
      range: atk?.range ?? 0,
      los: def.los,
      reload: atk?.reload ?? 1,
      carry: u?.carry ?? 0,
      trainTime: u?.time ?? 0,
      buildTime: b?.time ?? 0,
      heal: u?.heal ?? 0,
      regen: u?.regen ?? 0,
      deflect: u?.deflect ?? 0,
      convertSpeed: 1,
      powerRadius: b?.powerRadius ?? 0,
      shieldRadius: b?.shieldRadius ?? u?.shieldAura ?? 0,
      splash: atk?.splash ?? 0,
      cost: 1, costFood: 1, costCarbon: 1, costNova: 1, costOre: 1,
    };
    const add: Record<string, number> = {};
    const mul: Record<string, number> = {};
    for (const m of this.mods) {
      if (!this.matches(m, def, isUnit)) continue;
      if (m.add !== undefined) add[m.stat] = (add[m.stat] ?? 0) + m.add;
      if (m.mul !== undefined) mul[m.stat] = (mul[m.stat] ?? 1) * m.mul;
    }
    const v = (k: string) => ((base[k] ?? 0) + (add[k] ?? 0)) * (mul[k] ?? 1);
    const costMul = mul['cost'] ?? 1;
    const cost: Cost = {};
    const keys: [ResourceType, string][] = [['food', 'costFood'], ['carbon', 'costCarbon'], ['nova', 'costNova'], ['ore', 'costOre']];
    for (const [r, k] of keys) {
      const bc = def.cost[r];
      if (bc) cost[r] = Math.round(bc * costMul * (mul[k] ?? 1));
    }
    const s: ComputedStats = {
      hp: Math.round(v('hp')),
      damage: v('damage'),
      armorMelee: v('armorMelee'),
      armorRanged: v('armorRanged'),
      speed: v('speed'),
      range: v('range'),
      los: v('los'),
      reload: v('reload'),
      carry: v('carry'),
      trainTime: v('trainTime'),
      buildTime: v('buildTime'),
      heal: v('heal'),
      regen: v('regen'),
      deflect: Math.min(0.92, v('deflect')),
      convertSpeed: v('convertSpeed'),
      powerRadius: v('powerRadius'),
      shieldRadius: v('shieldRadius'),
      splash: v('splash'),
      cost,
    };
    this.cache.set(defId, s);
    return s;
  }

  /** Multiplicadores económicos globales (recolección, comercio...) */
  eco(stat: ModStat): number {
    const c = this.ecoCache.get(stat);
    if (c !== undefined) return c;
    let add = 0, mul = 1;
    for (const m of this.mods) {
      if (!m.target.player || m.stat !== stat) continue;
      if (m.add !== undefined) add += m.add;
      if (m.mul !== undefined) mul *= m.mul;
    }
    const v = stat === 'farmFood' ? add : mul * (1 + add);
    this.ecoCache.set(stat, v);
    return v;
  }

  techCost(t: TechDef): Cost {
    const m = this.eco('researchCost');
    const c: Cost = {};
    for (const r of RESOURCE_TYPES) if (t.cost[r]) c[r] = Math.round(t.cost[r]! * m);
    return c;
  }

  canAfford(c: Cost): boolean {
    for (const r of RESOURCE_TYPES) if ((c[r] ?? 0) > this.res[r] + 1e-6) return false;
    return true;
  }

  pay(c: Cost): Record<ResourceType, number> {
    const paid = { food: 0, carbon: 0, nova: 0, ore: 0 };
    for (const r of RESOURCE_TYPES) {
      const v = c[r] ?? 0;
      this.res[r] -= v;
      paid[r] = v;
    }
    return paid;
  }

  refund(p: Record<ResourceType, number>) {
    for (const r of RESOURCE_TYPES) this.res[r] += p[r];
  }

  score(): number {
    const s = this.stats;
    const g = s.gathered;
    return Math.round(
      (g.food + g.carbon + g.nova + g.ore) / 10 + s.unitsKilled * 6 + s.buildingsDestroyed * 20 + s.techs * 15 + this.era * 100 + this.pop * 3,
    );
  }
}

export function techAvailable(p: Player, t: TechDef): boolean {
  if (t.civ && t.civ !== p.civ.id) return false;
  if (t.excludeCivs && t.excludeCivs.includes(p.civ.id)) return false;
  if (p.isDisabled(t.id)) return false;
  if (t.upgrade) {
    for (const [, to] of t.upgrade) if (p.isDisabled(to)) return false;
  }
  return true;
}

export { TECHS };
