import type { TechDef, Era } from './types';

const T: Record<string, TechDef> = {};
function def(t: TechDef) {
  T[t.id] = t;
}

export const ERA_NAMES: Record<Era, string> = {
  1: 'Era Fronteriza',
  2: 'Era de Expansión',
  3: 'Era de las Guerras',
  4: 'Era Galáctica',
};
export const ERA_ROMAN: Record<Era, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

/** Edificios que cuentan como requisito para avanzar de era (hacen falta 2 distintos de la era actual). */
export const ERA_REQ_BUILDINGS: Record<number, string[]> = {
  2: ['food_center', 'carbon_center', 'mining_center', 'troop_center', 'power_core'],
  3: ['mech_factory', 'research_center', 'spaceport'],
  4: ['temple', 'heavy_weapons', 'airbase', 'fortress', 'shield_gen'],
};

// ───────── Avance de era ─────────
def({ id: 'era_2', name: 'Avanzar a la Era de Expansión', desc: 'Desbloquea nuevos edificios, unidades y mejoras. Requiere 2 edificios de la Era Fronteriza.', era: 1, building: 'command_center', cost: { food: 450 }, time: 120, eraAdvance: 2, icon: 'era' });
def({ id: 'era_3', name: 'Avanzar a la Era de las Guerras', desc: 'Desbloquea mechs pesados, aviación, la Fuerza y fortalezas. Requiere 2 edificios de la Era de Expansión.', era: 2, building: 'command_center', cost: { food: 800, nova: 200 }, time: 150, eraAdvance: 3, icon: 'era' });
def({ id: 'era_4', name: 'Avanzar a la Era Galáctica', desc: 'Desbloquea las mejoras definitivas y el Monumento. Requiere 2 edificios de la Era de las Guerras.', era: 3, building: 'command_center', cost: { food: 1000, nova: 800 }, time: 180, eraAdvance: 4, icon: 'era' });

// ───────── Centro de Mando ─────────
def({ id: 'worker_armor', name: 'Equipo de Supervivencia', desc: 'Trabajadores +15 PV, +1 armadura cuerpo a cuerpo y +2 a distancia.', era: 1, building: 'command_center', cost: { nova: 50 }, time: 25,
  mods: [{ target: { cls: ['worker'] }, stat: 'hp', add: 15 }, { target: { cls: ['worker'] }, stat: 'armorMelee', add: 1 }, { target: { cls: ['worker'] }, stat: 'armorRanged', add: 2 }], icon: 'armor' });
def({ id: 'cargo_droids', name: 'Droides de Carga', desc: 'Trabajadores +10% velocidad y +3 de capacidad de carga.', era: 2, building: 'command_center', cost: { food: 175, carbon: 50 }, time: 60,
  mods: [{ target: { cls: ['worker'] }, stat: 'speed', mul: 1.1 }, { target: { cls: ['worker'] }, stat: 'carry', add: 3 }], icon: 'cargo' });
def({ id: 'repulsor_carts', name: 'Carros Repulsores', desc: 'Trabajadores +10% velocidad y +5 de capacidad de carga.', era: 3, building: 'command_center', cost: { food: 300, carbon: 200 }, time: 75, requires: ['cargo_droids'],
  mods: [{ target: { cls: ['worker'] }, stat: 'speed', mul: 1.1 }, { target: { cls: ['worker'] }, stat: 'carry', add: 5 }], icon: 'cargo' });
def({ id: 'holonet', name: 'Red HoloNet', desc: 'Todos los edificios +4 de línea de visión.', era: 2, building: 'command_center', cost: { food: 75 }, time: 25,
  mods: [{ target: { allBuildings: true }, stat: 'los', add: 4 }], icon: 'sensor' });
def({ id: 'cc_defense', name: 'Defensas del Centro de Mando', desc: 'Centro de Mando +3 de daño y +1 de alcance.', era: 3, building: 'command_center', cost: { carbon: 150, nova: 100 }, time: 50,
  mods: [{ target: { buildings: ['command_center'] }, stat: 'damage', add: 3 }, { target: { buildings: ['command_center'] }, stat: 'range', add: 1 }], icon: 'turret' });

// ───────── Centro de Procesamiento de Alimentos ─────────
def({ id: 'forage_1', name: 'Recolección Eficiente', desc: 'Recolección de bayas y frutos +25%.', era: 1, building: 'food_center', cost: { food: 50, carbon: 50 }, time: 25,
  mods: [{ target: { player: true }, stat: 'gatherForage', mul: 1.25 }], icon: 'food' });
def({ id: 'farm_1', name: 'Vaporizadores de Humedad', desc: 'Granjas +15% de rendimiento y +100 de alimento.', era: 2, building: 'food_center', cost: { food: 75, carbon: 75 }, time: 40,
  mods: [{ target: { player: true }, stat: 'gatherFarm', mul: 1.15 }, { target: { player: true }, stat: 'farmFood', add: 100 }], icon: 'farm' });
def({ id: 'farm_2', name: 'Hidroponía', desc: 'Granjas +15% de rendimiento y +125 de alimento.', era: 3, building: 'food_center', cost: { food: 150, carbon: 150 }, time: 60, requires: ['farm_1'],
  mods: [{ target: { player: true }, stat: 'gatherFarm', mul: 1.15 }, { target: { player: true }, stat: 'farmFood', add: 125 }], icon: 'farm' });
def({ id: 'farm_3', name: 'Cultivo Genético', desc: 'Granjas +15% de rendimiento y +175 de alimento.', era: 4, building: 'food_center', cost: { food: 300, carbon: 250 }, time: 80, requires: ['farm_2'],
  mods: [{ target: { player: true }, stat: 'gatherFarm', mul: 1.15 }, { target: { player: true }, stat: 'farmFood', add: 175 }], icon: 'farm' });
def({ id: 'hunting', name: 'Rastreadores de Caza', desc: 'Caza +25%.', era: 2, building: 'food_center', cost: { food: 100, carbon: 50 }, time: 30,
  mods: [{ target: { player: true }, stat: 'gatherHunt', mul: 1.25 }], icon: 'hunt' });

// ───────── Carbono ─────────
def({ id: 'carbon_1', name: 'Cortadoras Láser', desc: 'Extracción de carbono +20%.', era: 1, building: 'carbon_center', cost: { food: 100, carbon: 50 }, time: 25,
  mods: [{ target: { player: true }, stat: 'gatherCarbon', mul: 1.2 }], icon: 'carbon' });
def({ id: 'carbon_2', name: 'Sierras Vibratorias', desc: 'Extracción de carbono +20%.', era: 3, building: 'carbon_center', cost: { food: 150, carbon: 100 }, time: 50, requires: ['carbon_1'],
  mods: [{ target: { player: true }, stat: 'gatherCarbon', mul: 1.2 }], icon: 'carbon' });
def({ id: 'carbon_3', name: 'Escáneres de Densidad', desc: 'Extracción de carbono +15%.', era: 4, building: 'carbon_center', cost: { food: 300, carbon: 200 }, time: 70, requires: ['carbon_2'],
  mods: [{ target: { player: true }, stat: 'gatherCarbon', mul: 1.15 }], icon: 'carbon' });

// ───────── Minería ─────────
def({ id: 'nova_1', name: 'Taladros de Cristal', desc: 'Extracción de Nova +15%.', era: 2, building: 'mining_center', cost: { food: 100, carbon: 75 }, time: 35,
  mods: [{ target: { player: true }, stat: 'gatherNova', mul: 1.15 }], icon: 'nova' });
def({ id: 'nova_2', name: 'Resonadores Kyber', desc: 'Extracción de Nova +15%.', era: 3, building: 'mining_center', cost: { food: 200, carbon: 150 }, time: 55, requires: ['nova_1'],
  mods: [{ target: { player: true }, stat: 'gatherNova', mul: 1.15 }], icon: 'nova' });
def({ id: 'ore_1', name: 'Barrenas Sónicas', desc: 'Extracción de mineral +15%.', era: 2, building: 'mining_center', cost: { food: 100, carbon: 75 }, time: 35,
  mods: [{ target: { player: true }, stat: 'gatherOre', mul: 1.15 }], icon: 'ore' });
def({ id: 'ore_2', name: 'Fundición Portátil', desc: 'Extracción de mineral +15%.', era: 3, building: 'mining_center', cost: { food: 200, carbon: 150 }, time: 55, requires: ['ore_1'],
  mods: [{ target: { player: true }, stat: 'gatherOre', mul: 1.15 }], icon: 'ore' });

// ───────── Núcleo de energía ─────────
def({ id: 'power_1', name: 'Reactores de Fusión', desc: 'Radio de los núcleos de energía +4.', era: 3, building: 'power_core', cost: { carbon: 150, nova: 100 }, time: 40,
  mods: [{ target: { buildings: ['power_core'] }, stat: 'powerRadius', add: 4 }], icon: 'power' });

// ───────── Centro de Investigación ─────────
const RANGED_INF: { cls: ('trooper' | 'grenadier' | 'aaTrooper' | 'unique')[] } = { cls: ['trooper', 'grenadier', 'aaTrooper'] };
def({ id: 'blaster_1', name: 'Blásteres Mejorados', desc: 'Soldados, granaderos, antiaéreos y torretas +1 de daño.', era: 2, building: 'research_center', cost: { food: 100, nova: 50 }, time: 40,
  mods: [{ target: RANGED_INF, stat: 'damage', add: 1 }, { target: { buildings: ['turret', 'aa_turret', 'command_center', 'fortress'] }, stat: 'damage', add: 1 }], icon: 'blaster' });
def({ id: 'blaster_2', name: 'Cámaras de Plasma', desc: 'Soldados, granaderos, antiaéreos y torretas +1 de daño y +1 de alcance.', era: 3, building: 'research_center', cost: { food: 200, nova: 120 }, time: 55, requires: ['blaster_1'],
  mods: [{ target: RANGED_INF, stat: 'damage', add: 1 }, { target: RANGED_INF, stat: 'range', add: 1 }, { target: { buildings: ['turret', 'aa_turret', 'command_center', 'fortress'] }, stat: 'damage', add: 1 }, { target: { buildings: ['turret', 'aa_turret', 'command_center', 'fortress'] }, stat: 'range', add: 1 }], icon: 'blaster' });
def({ id: 'blaster_3', name: 'Blásteres de Precisión', desc: 'Soldados, granaderos, antiaéreos y torretas +1 de daño y +1 de alcance.', era: 4, building: 'research_center', cost: { food: 300, nova: 250 }, time: 70, requires: ['blaster_2'],
  mods: [{ target: RANGED_INF, stat: 'damage', add: 1 }, { target: RANGED_INF, stat: 'range', add: 1 }, { target: { buildings: ['turret', 'aa_turret', 'command_center', 'fortress'] }, stat: 'damage', add: 1 }, { target: { buildings: ['turret', 'aa_turret', 'command_center', 'fortress'] }, stat: 'range', add: 1 }], icon: 'blaster' });
const INF_ARMOR = { tags: ['infantry' as const] };
def({ id: 'inf_armor_1', name: 'Armadura de Plastoide', desc: 'Infantería +1/+1 de armadura.', era: 2, building: 'research_center', cost: { food: 100, nova: 40 }, time: 40,
  mods: [{ target: INF_ARMOR, stat: 'armorMelee', add: 1 }, { target: INF_ARMOR, stat: 'armorRanged', add: 1 }], icon: 'armor' });
def({ id: 'inf_armor_2', name: 'Armadura Compuesta', desc: 'Infantería +1/+1 de armadura.', era: 3, building: 'research_center', cost: { food: 200, nova: 100 }, time: 55, requires: ['inf_armor_1'],
  mods: [{ target: INF_ARMOR, stat: 'armorMelee', add: 1 }, { target: INF_ARMOR, stat: 'armorRanged', add: 1 }], icon: 'armor' });
def({ id: 'inf_armor_3', name: 'Armadura de Beskar', desc: 'Infantería +1/+2 de armadura.', era: 4, building: 'research_center', cost: { food: 300, nova: 200 }, time: 70, requires: ['inf_armor_2'],
  mods: [{ target: INF_ARMOR, stat: 'armorMelee', add: 1 }, { target: INF_ARMOR, stat: 'armorRanged', add: 2 }], icon: 'armor' });
const MECH = { tags: ['mech' as const] };
const MECHMOUNT = { tags: ['mech' as const, 'mounted' as const] };
def({ id: 'mech_armor_1', name: 'Blindaje de Duracero', desc: 'Mechs y tropas montadas +1/+1 de armadura.', era: 2, building: 'research_center', cost: { food: 120, nova: 60 }, time: 45,
  mods: [{ target: MECHMOUNT, stat: 'armorMelee', add: 1 }, { target: MECHMOUNT, stat: 'armorRanged', add: 1 }], icon: 'mecharmor' });
def({ id: 'mech_armor_2', name: 'Blindaje Reactivo', desc: 'Mechs y tropas montadas +1/+1 de armadura.', era: 3, building: 'research_center', cost: { food: 220, nova: 120 }, time: 60, requires: ['mech_armor_1'],
  mods: [{ target: MECHMOUNT, stat: 'armorMelee', add: 1 }, { target: MECHMOUNT, stat: 'armorRanged', add: 1 }], icon: 'mecharmor' });
def({ id: 'mech_armor_3', name: 'Blindaje de Cortosis', desc: 'Mechs y tropas montadas +1/+2 de armadura.', era: 4, building: 'research_center', cost: { food: 320, nova: 240 }, time: 75, requires: ['mech_armor_2'],
  mods: [{ target: MECHMOUNT, stat: 'armorMelee', add: 1 }, { target: MECHMOUNT, stat: 'armorRanged', add: 2 }], icon: 'mecharmor' });
def({ id: 'mech_weapons_1', name: 'Cañones de Turbolláser', desc: 'Mechs, tropas montadas y naves +1 de daño.', era: 3, building: 'research_center', cost: { food: 200, nova: 150 }, time: 50,
  mods: [{ target: { tags: ['mech', 'mounted', 'air'] }, stat: 'damage', add: 1 }], icon: 'cannon' });
def({ id: 'mech_weapons_2', name: 'Acopladores de Energía', desc: 'Mechs, tropas montadas y naves +2 de daño.', era: 4, building: 'research_center', cost: { food: 350, nova: 300 }, time: 70, requires: ['mech_weapons_1'],
  mods: [{ target: { tags: ['mech', 'mounted', 'air'] }, stat: 'damage', add: 2 }], icon: 'cannon' });
def({ id: 'building_armor_1', name: 'Estructuras Reforzadas', desc: 'Edificios +15% de PV y +1/+1 de armadura.', era: 2, building: 'research_center', cost: { carbon: 175, ore: 50 }, time: 40,
  mods: [{ target: { allBuildings: true }, stat: 'hp', mul: 1.15 }, { target: { allBuildings: true }, stat: 'armorMelee', add: 1 }, { target: { allBuildings: true }, stat: 'armorRanged', add: 1 }], icon: 'building' });
def({ id: 'building_armor_2', name: 'Escudos Estructurales', desc: 'Edificios +15% de PV y +1/+1 de armadura.', era: 3, building: 'research_center', cost: { carbon: 250, ore: 150 }, time: 60, requires: ['building_armor_1'],
  mods: [{ target: { allBuildings: true }, stat: 'hp', mul: 1.15 }, { target: { allBuildings: true }, stat: 'armorMelee', add: 1 }, { target: { allBuildings: true }, stat: 'armorRanged', add: 1 }], icon: 'building' });
def({ id: 'turret_upgrade', name: 'Torretas Pesadas', desc: 'Torretas +40% PV y +3 de daño.', era: 3, building: 'research_center', cost: { carbon: 150, ore: 200 }, time: 50,
  mods: [{ target: { buildings: ['turret', 'aa_turret'] }, stat: 'hp', mul: 1.4 }, { target: { buildings: ['turret', 'aa_turret'] }, stat: 'damage', add: 3 }], icon: 'turret' });
def({ id: 'sensors', name: 'Sensores de Largo Alcance', desc: 'Todas las unidades +2 de línea de visión.', era: 2, building: 'research_center', cost: { food: 80, nova: 40 }, time: 30,
  mods: [{ target: { allUnits: true }, stat: 'los', add: 2 }], icon: 'sensor' });

// ───────── Centro de Tropas ─────────
def({ id: 'up_heavy_trooper', name: 'Soldado Pesado', desc: 'Mejora todos los soldados a Soldado Pesado.', era: 3, building: 'troop_center', cost: { food: 150, nova: 100 }, time: 45, upgrade: [['trooper', 'heavy_trooper']], icon: 'upgrade' });
def({ id: 'up_repeater_trooper', name: 'Soldado de Repetición', desc: 'Mejora todos los soldados pesados a Soldado de Repetición.', era: 4, building: 'troop_center', cost: { food: 250, nova: 225 }, time: 60, requires: ['up_heavy_trooper'], upgrade: [['heavy_trooper', 'repeater_trooper']], icon: 'upgrade' });
def({ id: 'up_heavy_grenadier', name: 'Granadero Pesado', desc: 'Mejora los granaderos.', era: 3, building: 'troop_center', cost: { food: 200, nova: 150 }, time: 50, upgrade: [['grenadier', 'heavy_grenadier']], icon: 'upgrade' });
def({ id: 'up_heavy_aa_trooper', name: 'Antiaéreo Pesado', desc: 'Mejora los soldados antiaéreos.', era: 3, building: 'troop_center', cost: { food: 150, nova: 100 }, time: 45, upgrade: [['aa_trooper', 'heavy_aa_trooper']], icon: 'upgrade' });
def({ id: 'up_heavy_mounted', name: 'Soldado Montado Pesado', desc: 'Mejora las tropas montadas.', era: 3, building: 'troop_center', cost: { food: 250, nova: 200 }, time: 55, upgrade: [['mounted_trooper', 'heavy_mounted']], icon: 'upgrade' });
def({ id: 'stims', name: 'Estimulantes de Combate', desc: 'Infantería +10% de velocidad.', era: 2, building: 'troop_center', cost: { food: 100, nova: 50 }, time: 35,
  mods: [{ target: { tags: ['infantry'] }, stat: 'speed', mul: 1.1 }], icon: 'speed' });
def({ id: 'targeting', name: 'Visores de Puntería', desc: 'Soldados +1 de alcance y +1 de línea de visión.', era: 3, building: 'troop_center', cost: { food: 150, nova: 120 }, time: 45,
  mods: [{ target: { cls: ['trooper'] }, stat: 'range', add: 1 }, { target: { cls: ['trooper'] }, stat: 'los', add: 1 }], icon: 'target' });

// ───────── Fábrica de Mechs ─────────
def({ id: 'up_heavy_strike', name: 'Mech de Ataque Pesado', desc: 'Mejora los mechs de ataque.', era: 3, building: 'mech_factory', cost: { carbon: 200, nova: 175 }, time: 50, upgrade: [['strike_mech', 'heavy_strike_mech']], icon: 'upgrade' });
def({ id: 'up_heavy_destroyer', name: 'Destructor Pesado', desc: 'Mejora los destructores de mechs.', era: 3, building: 'mech_factory', cost: { food: 200, nova: 175 }, time: 50, upgrade: [['mech_destroyer', 'heavy_mech_destroyer']], icon: 'upgrade' });
def({ id: 'up_heavy_assault', name: 'Mech de Asalto Pesado', desc: 'Mejora los mechs de asalto.', era: 4, building: 'mech_factory', cost: { carbon: 400, nova: 400 }, time: 70, upgrade: [['assault_mech', 'heavy_assault_mech']], icon: 'upgrade' });
def({ id: 'repulsors', name: 'Repulsores Mejorados', desc: 'Mechs y tropas montadas +10% de velocidad.', era: 3, building: 'mech_factory', cost: { food: 150, nova: 150 }, time: 45,
  mods: [{ target: MECHMOUNT, stat: 'speed', mul: 1.1 }], icon: 'speed' });

// ───────── Armas Pesadas ─────────
def({ id: 'up_heavy_pummel', name: 'Ariete Pesado', desc: 'Mejora los arietes.', era: 4, building: 'heavy_weapons', cost: { carbon: 300, nova: 250 }, time: 60, upgrade: [['pummel', 'heavy_pummel']], icon: 'upgrade' });
def({ id: 'up_heavy_artillery', name: 'Artillería Pesada', desc: 'Mejora la artillería.', era: 4, building: 'heavy_weapons', cost: { carbon: 400, nova: 300 }, time: 70, upgrade: [['artillery', 'heavy_artillery']], icon: 'upgrade' });
def({ id: 'up_heavy_aa_mobile', name: 'Antiaéreo Móvil Pesado', desc: 'Mejora los antiaéreos móviles.', era: 4, building: 'heavy_weapons', cost: { carbon: 250, nova: 250 }, time: 55, upgrade: [['aa_mobile', 'heavy_aa_mobile']], icon: 'upgrade' });
def({ id: 'ballistics', name: 'Computadoras Balísticas', desc: 'Artillería y antiaéreos +1 de alcance.', era: 3, building: 'heavy_weapons', cost: { carbon: 200, nova: 175 }, time: 50,
  mods: [{ target: { cls: ['artillery', 'aaMobile'] }, stat: 'range', add: 1 }], icon: 'target' });

// ───────── Base aérea ─────────
def({ id: 'up_adv_fighter', name: 'Caza Avanzado', desc: 'Mejora los cazas estelares.', era: 4, building: 'airbase', cost: { carbon: 300, nova: 300 }, time: 60, upgrade: [['fighter', 'adv_fighter']], icon: 'upgrade' });
def({ id: 'up_heavy_bomber', name: 'Bombardero Pesado', desc: 'Mejora los bombarderos.', era: 4, building: 'airbase', cost: { carbon: 350, nova: 300 }, time: 65, upgrade: [['bomber', 'heavy_bomber']], icon: 'upgrade' });
def({ id: 'afterburners', name: 'Postquemadores', desc: 'Naves +15% de velocidad.', era: 3, building: 'airbase', cost: { carbon: 150, nova: 150 }, time: 45,
  mods: [{ target: { tags: ['air'] }, stat: 'speed', mul: 1.15 }], icon: 'speed' });
def({ id: 'deflector_shields', name: 'Escudos Deflectores', desc: 'Naves +2 de armadura a distancia y +15% PV.', era: 4, building: 'airbase', cost: { carbon: 250, nova: 250 }, time: 60,
  mods: [{ target: { tags: ['air'] }, stat: 'armorRanged', add: 2 }, { target: { tags: ['air'] }, stat: 'hp', mul: 1.15 }], icon: 'shield' });

// ───────── Templo ─────────
const FORCE = { cls: ['jediKnight' as const, 'jediMaster' as const] };
def({ id: 'force_mastery', name: 'Maestría de la Fuerza', desc: 'Conversión 40% más rápida.', era: 3, building: 'temple', cost: { nova: 200 }, time: 50,
  mods: [{ target: { cls: ['jediMaster', 'hero'] }, stat: 'convertSpeed', mul: 1.4 }], icon: 'force' });
def({ id: 'force_sense', name: 'Sentido de la Fuerza', desc: 'Usuarios de la Fuerza +3 de línea de visión y alcance de conversión.', era: 3, building: 'temple', cost: { nova: 150 }, time: 40,
  mods: [{ target: FORCE, stat: 'los', add: 3 }, { target: { cls: ['jediMaster'] }, stat: 'range', add: 3 }], icon: 'sensor' });
def({ id: 'force_endurance', name: 'Resistencia de la Fuerza', desc: 'Caballeros y Maestros +25% PV.', era: 3, building: 'temple', cost: { food: 150, nova: 150 }, time: 45,
  mods: [{ target: FORCE, stat: 'hp', mul: 1.25 }], icon: 'armor' });
def({ id: 'saber_forms', name: 'Formas de Sable de Luz', desc: 'Caballeros +4 de daño y +10% de desvío.', era: 4, building: 'temple', cost: { food: 250, nova: 300 }, time: 60,
  mods: [{ target: { cls: ['jediKnight'] }, stat: 'damage', add: 4 }, { target: { cls: ['jediKnight'] }, stat: 'deflect', add: 0.1 }], icon: 'saber' });
def({ id: 'force_healing', name: 'Curación de la Fuerza', desc: 'Los Maestros sanan el doble de rápido.', era: 3, building: 'temple', cost: { nova: 150 }, time: 40,
  mods: [{ target: { cls: ['jediMaster'] }, stat: 'heal', mul: 2 }], icon: 'heal' });
def({ id: 'holocron_study', name: 'Estudio de Holocrones', desc: 'Los holocrones generan +50% de Nova.', era: 3, building: 'temple', cost: { food: 100, nova: 100 }, time: 40,
  mods: [{ target: { player: true }, stat: 'holocronRate', mul: 1.5 }], icon: 'holocron' });

// ───────── Puerto Espacial ─────────
def({ id: 'trade_guild', name: 'Gremio de Comercio', desc: 'Reduce la comisión del mercado y de los tributos.', era: 3, building: 'spaceport', cost: { food: 200, carbon: 200 }, time: 50,
  mods: [{ target: { player: true }, stat: 'tradeFee', mul: 0.5 }], icon: 'trade' });
def({ id: 'smugglers', name: 'Red de Contrabandistas', desc: 'Comparte la visión con tus aliados.', era: 2, building: 'spaceport', cost: { food: 100, nova: 50 }, time: 30, special: 'shareVision', icon: 'sensor' });

// ───────── Escudo ─────────
def({ id: 'shield_power', name: 'Escudos de Alta Energía', desc: 'Radio de los generadores de escudo +3.', era: 4, building: 'shield_gen', cost: { carbon: 200, nova: 200 }, time: 50,
  mods: [{ target: { buildings: ['shield_gen'] }, stat: 'shieldRadius', add: 3 }], icon: 'shield' });

// ───────── Fortaleza (genéricas) ─────────
def({ id: 'conscription', name: 'Reclutamiento Masivo', desc: 'Unidades militares se entrenan un 25% más rápido.', era: 4, building: 'fortress', cost: { food: 400, nova: 250 }, time: 60,
  mods: [{ target: { allUnits: true }, stat: 'trainTime', mul: 0.75 }], icon: 'speed' });
def({ id: 'spy_network', name: 'Red de Espías Bothan', desc: 'Revela la posición de todas las unidades enemigas durante 60 s cada vez.', era: 4, building: 'fortress', cost: { nova: 500 }, time: 40, icon: 'sensor' });

// Mejora de unidades únicas
const ELITE: [string, string, string][] = [
  ['empire', 'dark_trooper', 'elite_dark_trooper'], ['rebels', 'airspeeder', 'elite_airspeeder'], ['republic', 'arc_trooper', 'elite_arc_trooper'],
  ['cis', 'magnaguard', 'elite_magnaguard'], ['tradefed', 'droideka', 'elite_droideka'], ['naboo', 'royal_crusader', 'elite_royal_crusader'],
  ['gungans', 'fambaa', 'elite_fambaa'], ['wookiees', 'berserker', 'elite_berserker'],
];
for (const [civ, from, to] of ELITE) {
  def({ id: 'elite_' + civ, name: 'Unidad Única de Élite', desc: 'Mejora la unidad única a su versión de élite.', era: 4, building: 'fortress', cost: { food: 600, nova: 450 }, time: 60, civ, upgrade: [[from, to]], icon: 'upgrade' });
}

// ───────── Tecnologías únicas de civilización ─────────
def({ id: 'imp_walkers', name: 'Investigación de Andadores', desc: 'Mechs de asalto +2/+2 de armadura y +15% PV.', era: 3, building: 'fortress', cost: { food: 300, nova: 250 }, time: 50, civ: 'empire',
  mods: [{ target: { cls: ['assaultMech'] }, stat: 'armorMelee', add: 2 }, { target: { cls: ['assaultMech'] }, stat: 'armorRanged', add: 2 }, { target: { cls: ['assaultMech'] }, stat: 'hp', mul: 1.15 }], icon: 'unique' });
def({ id: 'imp_death_squadron', name: 'Escuadrón de la Muerte', desc: 'Naves +20% de daño. Torretas +2 de alcance.', era: 4, building: 'fortress', cost: { food: 500, nova: 400 }, time: 60, civ: 'empire',
  mods: [{ target: { tags: ['air'] }, stat: 'damage', mul: 1.2 }, { target: { buildings: ['turret', 'aa_turret'] }, stat: 'range', add: 2 }], icon: 'unique' });
def({ id: 'reb_network', name: 'Red de la Alianza', desc: 'Todas las unidades +2 de línea de visión. Trabajadores +10% de velocidad.', era: 3, building: 'fortress', cost: { food: 250, nova: 200 }, time: 45, civ: 'rebels',
  mods: [{ target: { allUnits: true }, stat: 'los', add: 2 }, { target: { cls: ['worker'] }, stat: 'speed', mul: 1.1 }], icon: 'unique' });
def({ id: 'reb_guerrilla', name: 'Tácticas de Guerrilla', desc: 'Soldados y tropas montadas +12% de velocidad y +1 de daño.', era: 4, building: 'fortress', cost: { food: 450, nova: 400 }, time: 60, civ: 'rebels',
  mods: [{ target: { cls: ['trooper', 'mounted'] }, stat: 'speed', mul: 1.12 }, { target: { cls: ['trooper', 'mounted'] }, stat: 'damage', add: 1 }], icon: 'unique' });
def({ id: 'rep_kamino', name: 'Clonación de Kamino', desc: 'Soldados y unidades únicas se entrenan un 35% más rápido.', era: 3, building: 'fortress', cost: { food: 300, nova: 200 }, time: 50, civ: 'republic',
  mods: [{ target: { cls: ['trooper', 'grenadier', 'aaTrooper', 'unique'] }, stat: 'trainTime', mul: 0.65 }], icon: 'unique' });
def({ id: 'rep_jedi_generals', name: 'Generales Jedi', desc: 'Caballeros Jedi +25% PV y +3 de daño.', era: 4, building: 'fortress', cost: { food: 400, nova: 450 }, time: 60, civ: 'republic',
  mods: [{ target: { cls: ['jediKnight'] }, stat: 'hp', mul: 1.25 }, { target: { cls: ['jediKnight'] }, stat: 'damage', add: 3 }], icon: 'unique' });
def({ id: 'cis_foundries', name: 'Fundiciones de Geonosis', desc: 'Mechs un 15% más baratos.', era: 3, building: 'fortress', cost: { food: 300, nova: 250 }, time: 50, civ: 'cis',
  mods: [{ target: { tags: ['mech'] }, stat: 'cost', mul: 0.85 }], icon: 'unique' });
def({ id: 'cis_tactical', name: 'Droides Tácticos', desc: 'Unidades droide +1 de alcance y +1 de daño.', era: 4, building: 'fortress', cost: { food: 450, nova: 400 }, time: 60, civ: 'cis',
  mods: [{ target: { tags: ['droid'] }, stat: 'damage', add: 1 }, { target: { tags: ['droid'] }, stat: 'range', add: 1 }], icon: 'unique' });
def({ id: 'tf_control_ship', name: 'Nave de Control de Droides', desc: 'Unidades droide +15% PV.', era: 3, building: 'fortress', cost: { food: 300, nova: 250 }, time: 50, civ: 'tradefed',
  mods: [{ target: { tags: ['droid'] }, stat: 'hp', mul: 1.15 }], icon: 'unique' });
def({ id: 'tf_monopoly', name: 'Monopolio Comercial', desc: 'Extracción de Nova y mineral +10%. Comercio sin comisión.', era: 4, building: 'fortress', cost: { food: 350, carbon: 300 }, time: 55, civ: 'tradefed',
  mods: [{ target: { player: true }, stat: 'gatherNova', mul: 1.1 }, { target: { player: true }, stat: 'gatherOre', mul: 1.1 }, { target: { player: true }, stat: 'tradeFee', mul: 0 }], icon: 'unique' });
def({ id: 'nab_engineering', name: 'Ingeniería Real', desc: 'Edificios +20% PV. Torretas se construyen más rápido.', era: 3, building: 'fortress', cost: { food: 250, nova: 200 }, time: 45, civ: 'naboo',
  mods: [{ target: { allBuildings: true }, stat: 'hp', mul: 1.2 }], icon: 'unique' });
def({ id: 'nab_bravo', name: 'Escuadrón Bravo', desc: 'Cazas +2 de armadura a distancia y +15% de velocidad.', era: 4, building: 'fortress', cost: { food: 400, nova: 400 }, time: 60, civ: 'naboo',
  mods: [{ target: { cls: ['fighter'] }, stat: 'armorRanged', add: 2 }, { target: { cls: ['fighter'] }, stat: 'speed', mul: 1.15 }], icon: 'unique' });
def({ id: 'gun_shields', name: 'Escudos de Energía Gungan', desc: 'Generadores de escudo y Fambaas +3 de radio.', era: 3, building: 'fortress', cost: { food: 300, nova: 200 }, time: 50, civ: 'gungans',
  mods: [{ target: { buildings: ['shield_gen'] }, stat: 'shieldRadius', add: 3 }, { target: { units: ['fambaa', 'elite_fambaa'] }, stat: 'shieldRadius', add: 2 }], icon: 'unique' });
def({ id: 'gun_boomas', name: 'Boomas de Plasma', desc: 'Granaderos y artillería +25% de daño en área.', era: 4, building: 'fortress', cost: { food: 400, nova: 350 }, time: 60, civ: 'gungans',
  mods: [{ target: { cls: ['grenadier', 'artillery'] }, stat: 'damage', mul: 1.25 }, { target: { cls: ['grenadier', 'artillery'] }, stat: 'splash', mul: 1.2 }], icon: 'unique' });
def({ id: 'wook_regen', name: 'Regeneración Wookiee', desc: 'Toda la infantería se regenera 0,6 PV/s.', era: 3, building: 'fortress', cost: { food: 300, nova: 200 }, time: 50, civ: 'wookiees',
  mods: [{ target: { tags: ['infantry'] }, stat: 'regen', add: 0.6 }], icon: 'unique' });
def({ id: 'wook_bowcasters', name: 'Ballestas Láser', desc: 'Soldados +2 de daño.', era: 4, building: 'fortress', cost: { food: 400, nova: 350 }, time: 55, civ: 'wookiees',
  mods: [{ target: { cls: ['trooper'] }, stat: 'damage', add: 2 }], icon: 'unique' });

export const TECHS = T;
export function techDef(id: string): TechDef {
  const d = T[id];
  if (!d) throw new Error('Tecnología desconocida: ' + id);
  return d;
}
