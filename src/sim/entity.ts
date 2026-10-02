import type { BuildingDef, ResourceType, UnitDef, AbilityId } from '../data/types';
import type { Waypoint } from './pathfinding';

export type EntityKind = 'unit' | 'building' | 'resource' | 'holocron';
export type ResKind = 'tree' | 'bush' | 'nova' | 'ore' | 'carcass';

export type OrderType =
  | 'move' | 'attackMove' | 'attack' | 'gather' | 'build' | 'repair' | 'returnRes' | 'convert' | 'heal'
  | 'ability' | 'pickup' | 'deposit' | 'follow' | 'patrol' | 'flee' | 'garrison' | 'trade';

export interface Order {
  type: OrderType;
  x?: number;
  y?: number;
  targetId?: number;
  ability?: AbilityId;
  resType?: ResourceType;
  x2?: number;
  y2?: number;
  /** id de edificio para devolver recursos y retomar la tarea */
  resumeId?: number;
}

export type Stance = 'aggressive' | 'defensive' | 'standGround' | 'passive';

export interface QueueItem {
  kind: 'unit' | 'tech';
  id: string;
  progress: number; // segundos acumulados
  total: number;
  paid: Record<ResourceType, number>;
}

export interface Buff {
  kind: 'rally' | 'meditation' | 'shield' | 'droidCommand' | 'rapidFire' | 'fear';
  until: number;
  dmgMul?: number;
  speedMul?: number;
  armorAdd?: number;
  reloadMul?: number;
  dmgTakenMul?: number;
}

export class Entity {
  id: number;
  kind: EntityKind;
  defId: string;
  owner: number;
  x: number;
  y: number;
  px: number; // posición previa (interpolación)
  py: number;
  z = 0; // altura de render
  angle = 0;
  pangle = 0;
  hp = 1;
  maxHp = 1;
  alive = true;
  deathTime = -1;
  createdAt = 0;
  lastHitTime = -100;
  lastAttackTime = -100;

  // ─── Unidad ───
  ud: UnitDef | null = null;
  order: Order | null = null;
  queue: Order[] = [];
  path: Waypoint[] | null = null;
  pathIdx = 0;
  pathGoalX = 0;
  pathGoalY = 0;
  pathPending = false;
  repathAt = 0;
  stuckTime = 0;
  moving = false;
  distMoved = 0; // para animación de pasos
  cooldown = 0;
  shotsLeft = 0;
  targetId = 0;
  scanAt = 0;
  carryType: ResourceType | null = null;
  carry = 0;
  gatherAcc = 0;
  stance: Stance = 'aggressive';
  homeX = 0;
  homeY = 0;
  convertProgress = 0;
  convertCooldown = 0;
  abilityCd: Partial<Record<AbilityId, number>> = {};
  buffs: Buff[] = [];
  stunUntil = 0;
  attackAnim = 0; // tiempo del último ataque (anim)
  workAnim = 0;
  holocronId = 0; // holocrón transportado
  flyZ = 0;
  idleTime = 0;
  lastAttackerId = 0;
  controlGroup = -1;
  vx = 0;
  vy = 0;
  wanderAt = 0;
  fleeUntil = 0;
  autoFarm = 0; // id de granja asignada
  lastResKind: ResKind | null = null;
  lastResX = 0;
  lastResY = 0;
  carcassId = 0; // animal cazado -> cadáver
  carrierId = 0; // holocrón: unidad que lo transporta
  templeId = 0; // holocrón: templo donde está guardado
  buildersNext = 0;
  chaseStart = 0;
  attackMoveX = -1;
  attackMoveY = -1;
  lastRepath = 0;
  progressCheckT = 0;
  progressCheckD = 0;
  explicitTarget = false;
  inGoal = false;
  garrisonedIn = 0; // unidad dentro de un edificio
  garrison: number[] = []; // edificio: unidades guarnecidas
  unreachable = 0; // máscara de jugadores que no pueden alcanzar este recurso/animal
  bestChaseD = 1e9;
  bestChaseT = 0;

  // ─── Edificio ───
  bd: BuildingDef | null = null;
  built = true;
  progress = 1; // fracción construida
  buildersCount = 0;
  prodQueue: QueueItem[] = [];
  rallyX = -1;
  rallyY = -1;
  rallyTargetId = 0;
  tx = 0; // tile de origen
  ty = 0;
  size = 1;
  powered = true;
  farmFood = 0;
  farmerId = 0;
  holocrons: number[] = [];
  monumentTimer = -1;
  gateOpen = false;
  fireDamage = 0;

  // ─── Recurso ───
  resKind: ResKind | null = null;
  resType: ResourceType | null = null;
  amount = 0;
  variant = 0;
  gatherers = 0;

  constructor(id: number, kind: EntityKind, defId: string, owner: number, x: number, y: number) {
    this.id = id;
    this.kind = kind;
    this.defId = defId;
    this.owner = owner;
    this.x = this.px = x;
    this.y = this.py = y;
  }

  get isUnit() {
    return this.kind === 'unit';
  }
  get isBuilding() {
    return this.kind === 'building';
  }
  get isResource() {
    return this.kind === 'resource';
  }
  get radius(): number {
    if (this.ud) return this.ud.radius;
    if (this.bd) return this.size * 0.5;
    return 0.45;
  }
  get isAir(): boolean {
    return !!this.ud?.air;
  }
  /** Centro del edificio */
  get cx(): number {
    return this.x;
  }
}
