import type { Era, ProjectileKind, AbilityId, ResourceType, Tag } from '../data/types';
import type { Difficulty } from './player';

export type MapSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';
export const MAP_SIZES: Record<MapSize, { tiles: number; name: string; players: number }> = {
  tiny: { tiles: 88, name: 'Diminuto (2)', players: 2 },
  small: { tiles: 112, name: 'Pequeño (3-4)', players: 4 },
  medium: { tiles: 136, name: 'Mediano (4-6)', players: 6 },
  large: { tiles: 164, name: 'Grande (6-8)', players: 8 },
  huge: { tiles: 192, name: 'Enorme (8)', players: 8 },
};

export type StartRes = 'low' | 'standard' | 'high' | 'deathmatch';
export const START_RES: Record<StartRes, { name: string; res: Record<ResourceType, number> }> = {
  low: { name: 'Bajos', res: { food: 100, carbon: 100, nova: 50, ore: 100 } },
  standard: { name: 'Estándar', res: { food: 200, carbon: 200, nova: 100, ore: 150 } },
  high: { name: 'Altos', res: { food: 1000, carbon: 1000, nova: 800, ore: 800 } },
  deathmatch: { name: 'Combate a muerte', res: { food: 20000, carbon: 20000, nova: 20000, ore: 20000 } },
};

export type VictoryMode = 'standard' | 'conquest' | 'score' | 'monument';

export interface PlayerSetup {
  name: string;
  civ: string;
  color: number; // índice de PLAYER_COLORS
  team: number; // 0 = sin equipo
  human: boolean;
  difficulty: Difficulty;
  bonusUnits?: { id: string; count: number }[]; // conquista galáctica
  bonusRes?: Partial<Record<ResourceType, number>>;
}

export interface GameSetup {
  planet: string;
  size: MapSize;
  seed: number;
  players: PlayerSetup[];
  startRes: StartRes;
  startEra: Era;
  popMax: number;
  victory: VictoryMode;
  timeLimit?: number; // minutos (modo puntuación)
  reveal: 'normal' | 'explored' | 'all';
  lockedTeams: boolean;
  treaty?: number; // minutos de tregua
  monumentTime?: number;
  holocronTime?: number;
  conquestPlanetId?: string;
  campaignTitle?: string;
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  owner: number;
  srcId: number;
  targetId: number;
  sx: number; sy: number; sz: number;
  x: number; y: number; z: number;
  tx: number; ty: number; tz: number;
  t: number;
  dur: number;
  arc: number;
  color: number;
  hit: HitInfo;
  done: boolean;
}

export interface HitInfo {
  attackerId: number;
  attackerDef: string;
  owner: number;
  damage: number;
  type: 'melee' | 'ranged';
  bonus?: Partial<Record<Tag, number>>;
  splash: number;
  canHitAir: boolean;
  airOnly: boolean;
  mul: number;
  deflectable: boolean;
}

export type GameEvent =
  | { t: 'shot'; id: number; kind: ProjectileKind; owner: number; x: number; y: number; air: boolean; projId: number }
  | { t: 'melee'; id: number; targetId: number; x: number; y: number; saber: boolean }
  | { t: 'hit'; x: number; y: number; z: number; kind: ProjectileKind; big: boolean }
  | { t: 'deflect'; id: number; x: number; y: number; z: number }
  | { t: 'death'; id: number; x: number; y: number; defId: string; owner: number; kind: 'unit' | 'building'; size: number; mech: boolean; air: boolean }
  | { t: 'explosion'; x: number; y: number; z: number; size: number }
  | { t: 'built'; id: number; owner: number; defId: string }
  | { t: 'placed'; id: number; owner: number; defId: string }
  | { t: 'trained'; id: number; owner: number; defId: string }
  | { t: 'research'; owner: number; techId: string }
  | { t: 'era'; owner: number; era: Era }
  | { t: 'underAttack'; owner: number; x: number; y: number; building: boolean }
  | { t: 'converted'; id: number; from: number; to: number }
  | { t: 'ability'; id: number; ability: AbilityId; x: number; y: number; targetId: number; owner: number }
  | { t: 'msg'; owner: number; text: string; color?: string }
  | { t: 'gameOver'; winnerTeam: number; winners: number[] }
  | { t: 'defeated'; owner: number }
  | { t: 'popCap'; owner: number }
  | { t: 'lightning'; pts: number[]; owner: number }
  | { t: 'gather'; id: number; res: ResourceType }
  | { t: 'drop'; owner: number; res: ResourceType; amount: number }
  | { t: 'holocron'; owner: number; action: 'pickup' | 'deposit' | 'drop' }
  | { t: 'monument'; owner: number; started: boolean }
  | { t: 'converting'; id: number; targetId: number }
  | { t: 'heal'; id: number; targetId: number };
