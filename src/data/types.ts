// Tipos de datos compartidos por simulación, IA, render y UI.

export type ResourceType = 'food' | 'carbon' | 'nova' | 'ore';
export const RESOURCE_TYPES: ResourceType[] = ['food', 'carbon', 'nova', 'ore'];
export type Cost = Partial<Record<ResourceType, number>>;
export type Era = 1 | 2 | 3 | 4;

/** Etiquetas de armadura / clase: los bonus de ataque se aplican contra estas etiquetas. */
export type Tag =
  | 'infantry' | 'trooper' | 'worker' | 'mounted' | 'mech' | 'heavyWeapon' | 'air' | 'bomber'
  | 'jedi' | 'hero' | 'building' | 'turret' | 'wall' | 'animal' | 'droid' | 'ranged' | 'melee'
  | 'shielded' | 'fortress' | 'unique' | 'creature';

export type UnitClass =
  | 'worker' | 'scout' | 'trooper' | 'grenadier' | 'aaTrooper' | 'mounted' | 'strikeMech' | 'mechDestroyer'
  | 'assaultMech' | 'pummel' | 'artillery' | 'aaMobile' | 'fighter' | 'bomber' | 'jediKnight' | 'jediMaster'
  | 'unique' | 'hero' | 'animal';

export type ProjectileKind = 'bolt' | 'heavyBolt' | 'grenade' | 'shell' | 'missile' | 'bomb' | 'ion' | 'energyBall' | 'arrow' | 'none';

export interface AttackDef {
  damage: number;
  type: 'melee' | 'ranged';
  range: number;
  minRange?: number;
  reload: number; // segundos entre ataques
  bonus?: Partial<Record<Tag, number>>;
  splash?: number; // radio de daño en área (tiles)
  projectile?: ProjectileKind;
  projectileSpeed?: number;
  canHitAir?: boolean; // por defecto false
  airOnly?: boolean;
  shots?: number; // ráfagas (p.ej. AT-AT dispara 2)
  boltColor?: number; // color del láser (se sobreescribe por bando)
}

export type AbilityId =
  | 'forcePush' | 'forceLightning' | 'forceChoke' | 'forceHeal' | 'saberThrow' | 'battleMeditation'
  | 'rally' | 'thermalDetonator' | 'saberSpin' | 'roar' | 'rapidFire' | 'orbitalStrike' | 'jetpack'
  | 'clumsy' | 'shieldBubble' | 'droidCommand';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  desc: string;
  cooldown: number;
  range: number; // 0 = sobre sí mismo
  radius?: number;
  target: 'self' | 'unit' | 'point';
  icon: string;
}

export interface UnitDef {
  id: string;
  name: string;
  desc: string;
  cls: UnitClass;
  tags: Tag[];
  era: Era;
  building: string; // edificio que la entrena ('' si no se entrena)
  cost: Cost;
  time: number; // segundos de entrenamiento
  pop: number;
  hp: number;
  speed: number; // tiles/s
  los: number;
  radius: number;
  armor: { melee: number; ranged: number };
  attack?: AttackDef;
  air?: boolean;
  flyHeight?: number;
  carry?: number;
  buildRate?: number;
  canGather?: boolean;
  canBuild?: boolean;
  convert?: boolean; // Maestro Jedi/Sith
  heal?: number; // hp/s a aliados
  deflect?: number; // probabilidad de desviar disparos de bláster
  regen?: number; // hp/s
  shieldAura?: number; // radio de escudo móvil (Fambaa)
  carriesHolocron?: boolean;
  abilities?: AbilityId[];
  civ?: string; // unidad exclusiva de una civilización
  heroOf?: string;
  model: string; // modelo genérico (se especializa por estilo de civ)
  saberColor?: number;
  saberCount?: number;
  voice?: string;
  hidden?: boolean; // no aparece en enciclopedia
}

export interface BuildingDef {
  id: string;
  name: string;
  desc: string;
  era: Era;
  cost: Cost;
  time: number;
  hp: number;
  size: number; // tiles por lado
  los: number;
  armor: { melee: number; ranged: number };
  attack?: AttackDef;
  pop?: number;
  dropsite?: ResourceType[];
  trains?: string[];
  needsPower?: boolean;
  powerRadius?: number;
  shieldRadius?: number;
  walkable?: boolean; // granjas
  farm?: boolean;
  wall?: boolean;
  gate?: boolean;
  maxCount?: number;
  monument?: boolean;
  temple?: boolean;
  hotkey?: string;
  tags: Tag[];
  model: string;
  requiresBuilding?: string;
}

export type ModStat =
  | 'hp' | 'damage' | 'armorMelee' | 'armorRanged' | 'speed' | 'range' | 'los' | 'reload' | 'cost' | 'costFood'
  | 'costCarbon' | 'costNova' | 'costOre' | 'trainTime' | 'buildTime' | 'carry' | 'buildSpeed' | 'heal' | 'regen'
  | 'convertSpeed' | 'researchCost' | 'researchTime' | 'powerRadius' | 'shieldRadius' | 'deflect' | 'popBonus'
  | 'gatherFood' | 'gatherForage' | 'gatherHunt' | 'gatherFarm' | 'gatherCarbon' | 'gatherNova' | 'gatherOre'
  | 'farmFood' | 'tradeFee' | 'holocronRate' | 'splash' | 'attackBonusMech' | 'attackBonusBuilding';

export interface ModTarget {
  all?: boolean;
  units?: string[];
  cls?: UnitClass[];
  tags?: Tag[];
  buildings?: string[];
  allBuildings?: boolean;
  allUnits?: boolean;
  player?: boolean; // modificadores económicos globales
}

export interface Modifier {
  target: ModTarget;
  stat: ModStat;
  add?: number;
  mul?: number;
}

export interface TechDef {
  id: string;
  name: string;
  desc: string;
  era: Era;
  building: string;
  cost: Cost;
  time: number;
  requires?: string[];
  civ?: string; // tecnología exclusiva
  excludeCivs?: string[];
  mods?: Modifier[];
  upgrade?: [string, string][]; // mejora de línea de unidades
  eraAdvance?: Era;
  enableUnits?: string[];
  icon?: string;
  special?: 'autoReseed' | 'shareVision' | 'tradeBoost' | 'conversionBuildings';
}

export type CivStyle = 'imperial' | 'rebel' | 'republic' | 'cis' | 'tradefed' | 'naboo' | 'gungan' | 'wookiee';

export interface CivBonus {
  text: string;
  mods?: Modifier[];
}

export interface CivDef {
  id: string;
  name: string;
  short: string;
  side: 'light' | 'dark';
  style: CivStyle;
  emblem: string; // svg path id
  desc: string;
  bonuses: CivBonus[];
  teamBonus: CivBonus;
  uniqueUnit: string;
  eliteUnique: string;
  uniqueTechs: string[];
  heroes: string[];
  disabled: string[]; // unidades / tecnologías / edificios no disponibles
  names: Record<string, string>; // nombre de unidades/edificios por civ
  models: Record<string, string>; // modelo por unidad (sobre-escritura)
  voice: 'imperial' | 'rebel' | 'clone' | 'droid' | 'naboo' | 'gungan' | 'wookiee';
  saber: number; // color de sable de caballeros
  monumentName: string;
  strengths: string[];
  homeworld: string;
}

export interface PlanetDef {
  id: string;
  name: string;
  desc: string;
  biome: string;
  sky: { top: number; bottom: number; fog: number; fogDensity: number; sun: number; sunIntensity: number; ambient: number; hemiGround: number };
  terrain: { base: number; alt: number; high: number; low: number; cliff: number; path?: number };
  water?: { color: number; level: number; kind: 'water' | 'lava' | 'swamp' | 'ice' | 'acid'; amount: number; rivers?: number };
  heightAmp: number;
  heightScale: number;
  cliffs: number; // 0..1
  forest: { density: number; clusters: number; tree: string; tree2?: string; color: number; color2: number };
  animals: string[];
  decor: string[];
  landmarks: string[];
  stars?: boolean;
  snow?: boolean;
  dust?: boolean;
  ash?: boolean;
  rain?: boolean;
  sunAngle?: number;
  music?: 'heroic' | 'dark' | 'mystic' | 'war';
}
