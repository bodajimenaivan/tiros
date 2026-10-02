import type { UnitDef, AbilityDef, AbilityId } from './types';

// Colores de sable de luz
export const SABER = {
  blue: 0x3d8bff,
  green: 0x3dff6a,
  red: 0xff2a2a,
  purple: 0xb04dff,
  yellow: 0xffd23d,
  white: 0xf0f6ff,
};

const U: Record<string, UnitDef> = {};
function def(u: UnitDef): UnitDef {
  U[u.id] = u;
  return u;
}

// ───────────────────────── TRABAJADORES Y EXPLORACIÓN ─────────────────────────
def({
  id: 'worker', name: 'Trabajador', desc: 'Recolecta recursos, construye y repara edificios.', cls: 'worker',
  tags: ['infantry', 'worker'], era: 1, building: 'command_center', cost: { food: 50 }, time: 20, pop: 1,
  hp: 25, speed: 0.85, los: 4, radius: 0.22, armor: { melee: 0, ranged: 0 },
  attack: { damage: 3, type: 'melee', range: 0.6, reload: 2 }, carry: 10, buildRate: 1, canGather: true, canBuild: true,
  model: 'worker',
});
def({
  id: 'scout', name: 'Explorador', desc: 'Unidad rápida de reconocimiento. Gran línea de visión.', cls: 'scout',
  tags: ['mounted'], era: 1, building: 'mech_factory', cost: { food: 80 }, time: 30, pop: 1,
  hp: 45, speed: 1.6, los: 9, radius: 0.32, armor: { melee: 0, ranged: 2 },
  attack: { damage: 4, type: 'ranged', range: 1.6, reload: 2, bonus: { worker: 2 }, projectile: 'bolt' }, model: 'scout',
});

// ───────────────────────── CENTRO DE TROPAS ─────────────────────────
def({
  id: 'trooper', name: 'Soldado', desc: 'Infantería con bláster. Barata y versátil. Fuerte contra armas pesadas.', cls: 'trooper',
  tags: ['infantry', 'trooper', 'ranged'], era: 1, building: 'troop_center', cost: { food: 35, carbon: 25 }, time: 24, pop: 1,
  hp: 38, speed: 0.95, los: 7, radius: 0.22, armor: { melee: 0, ranged: 0 },
  attack: { damage: 4, type: 'ranged', range: 5, reload: 2, bonus: { heavyWeapon: 3, jedi: 1 }, projectile: 'bolt' },
  model: 'trooper',
});
def({
  id: 'heavy_trooper', name: 'Soldado Pesado', desc: 'Versión mejorada del soldado con mejor blindaje.', cls: 'trooper',
  tags: ['infantry', 'trooper', 'ranged'], era: 3, building: 'troop_center', cost: { food: 35, carbon: 25 }, time: 24, pop: 1,
  hp: 46, speed: 0.95, los: 7, radius: 0.23, armor: { melee: 0, ranged: 1 },
  attack: { damage: 5, type: 'ranged', range: 5, reload: 2, bonus: { heavyWeapon: 4, jedi: 1 }, projectile: 'bolt' },
  model: 'trooper', hidden: true,
});
def({
  id: 'repeater_trooper', name: 'Soldado de Repetición', desc: 'Élite de infantería con bláster de repetición.', cls: 'trooper',
  tags: ['infantry', 'trooper', 'ranged'], era: 4, building: 'troop_center', cost: { food: 35, carbon: 25 }, time: 24, pop: 1,
  hp: 55, speed: 0.95, los: 8, radius: 0.24, armor: { melee: 1, ranged: 1 },
  attack: { damage: 6, type: 'ranged', range: 6, reload: 1.8, bonus: { heavyWeapon: 5, jedi: 2 }, projectile: 'bolt' },
  model: 'trooper', hidden: true,
});
def({
  id: 'grenadier', name: 'Granadero', desc: 'Lanza detonadores con daño en área. Destruye grupos de infantería, Jedi y edificios.', cls: 'grenadier',
  tags: ['infantry', 'trooper', 'ranged'], era: 2, building: 'troop_center', cost: { food: 40, nova: 35 }, time: 30, pop: 1,
  hp: 40, speed: 0.9, los: 7, radius: 0.22, armor: { melee: 0, ranged: 0 },
  attack: { damage: 5, type: 'ranged', range: 4.5, minRange: 1, reload: 3, splash: 0.9, bonus: { trooper: 3, building: 10, jedi: 5 }, projectile: 'grenade', projectileSpeed: 7 },
  model: 'grenadier',
});
def({
  id: 'heavy_grenadier', name: 'Granadero Pesado', desc: 'Granadero mejorado con mayor radio de explosión.', cls: 'grenadier',
  tags: ['infantry', 'trooper', 'ranged'], era: 3, building: 'troop_center', cost: { food: 40, nova: 35 }, time: 30, pop: 1,
  hp: 50, speed: 0.9, los: 7, radius: 0.23, armor: { melee: 0, ranged: 1 },
  attack: { damage: 6, type: 'ranged', range: 5, minRange: 1, reload: 3, splash: 1.15, bonus: { trooper: 4, building: 14, jedi: 6 }, projectile: 'grenade', projectileSpeed: 7 },
  model: 'grenadier', hidden: true,
});
def({
  id: 'aa_trooper', name: 'Soldado Antiaéreo', desc: 'Infantería con lanzamisiles. Solo ataca unidades aéreas.', cls: 'aaTrooper',
  tags: ['infantry', 'trooper', 'ranged'], era: 2, building: 'troop_center', cost: { food: 30, carbon: 40 }, time: 26, pop: 1,
  hp: 40, speed: 0.95, los: 8, radius: 0.22, armor: { melee: 0, ranged: 0 },
  attack: { damage: 6, type: 'ranged', range: 7, reload: 2.2, airOnly: true, canHitAir: true, bonus: { air: 6 }, projectile: 'missile', projectileSpeed: 12 },
  model: 'aaTrooper',
});
def({
  id: 'heavy_aa_trooper', name: 'Soldado Antiaéreo Pesado', desc: 'Antiaéreo mejorado.', cls: 'aaTrooper',
  tags: ['infantry', 'trooper', 'ranged'], era: 3, building: 'troop_center', cost: { food: 30, carbon: 40 }, time: 26, pop: 1,
  hp: 48, speed: 0.95, los: 9, radius: 0.23, armor: { melee: 0, ranged: 1 },
  attack: { damage: 7, type: 'ranged', range: 8, reload: 2.2, airOnly: true, canHitAir: true, bonus: { air: 9 }, projectile: 'missile', projectileSpeed: 13 },
  model: 'aaTrooper', hidden: true,
});
def({
  id: 'mounted_trooper', name: 'Soldado Montado', desc: 'Tropa veloz. Excelente contra soldados, granaderos y artillería.', cls: 'mounted',
  tags: ['mounted'], era: 2, building: 'troop_center', cost: { food: 60, nova: 45 }, time: 30, pop: 1,
  hp: 95, speed: 1.45, los: 6, radius: 0.34, armor: { melee: 0, ranged: 2 },
  attack: { damage: 6, type: 'ranged', range: 2, reload: 1.9, bonus: { ranged: 3, heavyWeapon: 8, worker: 2 }, projectile: 'bolt' },
  model: 'mounted',
});
def({
  id: 'heavy_mounted', name: 'Soldado Montado Pesado', desc: 'Caballería blindada mejorada.', cls: 'mounted',
  tags: ['mounted'], era: 3, building: 'troop_center', cost: { food: 60, nova: 45 }, time: 30, pop: 1,
  hp: 120, speed: 1.5, los: 7, radius: 0.36, armor: { melee: 1, ranged: 3 },
  attack: { damage: 8, type: 'ranged', range: 2, reload: 1.9, bonus: { ranged: 4, heavyWeapon: 10, worker: 3 }, projectile: 'bolt' },
  model: 'mounted', hidden: true,
});

// ───────────────────────── FÁBRICA DE MECHS ─────────────────────────
def({
  id: 'strike_mech', name: 'Mech de Ataque', desc: 'Andador ligero y rápido. Destroza infantería.', cls: 'strikeMech',
  tags: ['mech', 'ranged'], era: 2, building: 'mech_factory', cost: { carbon: 60, nova: 60 }, time: 32, pop: 1,
  hp: 85, speed: 1.25, los: 7, radius: 0.4, armor: { melee: 1, ranged: 1 },
  attack: { damage: 6, type: 'ranged', range: 5, reload: 2.1, bonus: { infantry: 2 }, projectile: 'bolt' },
  model: 'strikeMech',
});
def({
  id: 'heavy_strike_mech', name: 'Mech de Ataque Pesado', desc: 'Mech de ataque mejorado.', cls: 'strikeMech',
  tags: ['mech', 'ranged'], era: 3, building: 'mech_factory', cost: { carbon: 60, nova: 60 }, time: 32, pop: 1,
  hp: 105, speed: 1.3, los: 8, radius: 0.42, armor: { melee: 1, ranged: 2 },
  attack: { damage: 7, type: 'ranged', range: 6, reload: 2.1, bonus: { infantry: 3 }, projectile: 'bolt' },
  model: 'strikeMech', hidden: true,
});
def({
  id: 'mech_destroyer', name: 'Destructor de Mechs', desc: 'Cañón de iones antivehículos. Contrarresta mechs y tropas montadas. Débil contra soldados.', cls: 'mechDestroyer',
  tags: ['mech'], era: 2, building: 'mech_factory', cost: { food: 50, nova: 50 }, time: 30, pop: 1,
  hp: 90, speed: 1.05, los: 6, radius: 0.4, armor: { melee: 0, ranged: 0 },
  attack: { damage: 5, type: 'ranged', range: 4, reload: 2.4, bonus: { mech: 11, mounted: 7 }, projectile: 'ion', projectileSpeed: 10 },
  model: 'mechDestroyer',
});
def({
  id: 'heavy_mech_destroyer', name: 'Destructor de Mechs Pesado', desc: 'Antivehículos mejorado.', cls: 'mechDestroyer',
  tags: ['mech'], era: 3, building: 'mech_factory', cost: { food: 50, nova: 50 }, time: 30, pop: 1,
  hp: 115, speed: 1.05, los: 7, radius: 0.42, armor: { melee: 1, ranged: 0 },
  attack: { damage: 6, type: 'ranged', range: 4.5, reload: 2.4, bonus: { mech: 15, mounted: 9 }, projectile: 'ion', projectileSpeed: 10 },
  model: 'mechDestroyer', hidden: true,
});
def({
  id: 'assault_mech', name: 'Mech de Asalto', desc: 'Andador pesado. Enorme resistencia y potencia de fuego. Caro.', cls: 'assaultMech',
  tags: ['mech'], era: 3, building: 'mech_factory', cost: { carbon: 120, nova: 140 }, time: 45, pop: 1,
  hp: 260, speed: 0.75, los: 8, radius: 0.7, armor: { melee: 3, ranged: 4 },
  attack: { damage: 14, type: 'ranged', range: 6, reload: 3, shots: 2, splash: 0.5, bonus: { building: 12, infantry: 2 }, projectile: 'heavyBolt' },
  model: 'assaultMech',
});
def({
  id: 'heavy_assault_mech', name: 'Mech de Asalto Pesado', desc: 'La cúspide de la guerra terrestre.', cls: 'assaultMech',
  tags: ['mech'], era: 4, building: 'mech_factory', cost: { carbon: 120, nova: 140 }, time: 45, pop: 1,
  hp: 340, speed: 0.75, los: 9, radius: 0.75, armor: { melee: 4, ranged: 5 },
  attack: { damage: 17, type: 'ranged', range: 6.5, reload: 3, shots: 2, splash: 0.6, bonus: { building: 16, infantry: 3 }, projectile: 'heavyBolt' },
  model: 'assaultMech', hidden: true,
});

// ───────────────────────── FÁBRICA DE ARMAS PESADAS ─────────────────────────
def({
  id: 'pummel', name: 'Ariete', desc: 'Demoledor blindado contra edificios. Resiste blásteres; vulnerable cuerpo a cuerpo.', cls: 'pummel',
  tags: ['heavyWeapon', 'mech'], era: 3, building: 'heavy_weapons', cost: { carbon: 160, nova: 75 }, time: 40, pop: 1,
  hp: 190, speed: 0.6, los: 5, radius: 0.6, armor: { melee: 0, ranged: 30 },
  attack: { damage: 3, type: 'melee', range: 0.8, reload: 4, bonus: { building: 55, wall: 20, turret: 20 } },
  model: 'pummel',
});
def({
  id: 'heavy_pummel', name: 'Ariete Pesado', desc: 'Ariete mejorado.', cls: 'pummel',
  tags: ['heavyWeapon', 'mech'], era: 4, building: 'heavy_weapons', cost: { carbon: 160, nova: 75 }, time: 40, pop: 1,
  hp: 260, speed: 0.65, los: 5, radius: 0.62, armor: { melee: 0, ranged: 40 },
  attack: { damage: 4, type: 'melee', range: 0.8, reload: 4, bonus: { building: 80, wall: 30, turret: 30 } },
  model: 'pummel', hidden: true,
});
def({
  id: 'artillery', name: 'Artillería', desc: 'Cañón de largo alcance con daño en área. Asedia edificios y masas de infantería.', cls: 'artillery',
  tags: ['heavyWeapon'], era: 3, building: 'heavy_weapons', cost: { carbon: 180, nova: 120 }, time: 50, pop: 1,
  hp: 60, speed: 0.65, los: 10, radius: 0.55, armor: { melee: 0, ranged: 4 },
  attack: { damage: 22, type: 'ranged', range: 10, minRange: 3, reload: 6, splash: 1.2, bonus: { building: 35, infantry: 4 }, projectile: 'shell', projectileSpeed: 9 },
  model: 'artillery',
});
def({
  id: 'heavy_artillery', name: 'Artillería Pesada', desc: 'Artillería mejorada.', cls: 'artillery',
  tags: ['heavyWeapon'], era: 4, building: 'heavy_weapons', cost: { carbon: 180, nova: 120 }, time: 50, pop: 1,
  hp: 80, speed: 0.65, los: 11, radius: 0.58, armor: { melee: 0, ranged: 5 },
  attack: { damage: 28, type: 'ranged', range: 11, minRange: 3, reload: 6, splash: 1.4, bonus: { building: 50, infantry: 5 }, projectile: 'shell', projectileSpeed: 9 },
  model: 'artillery', hidden: true,
});
def({
  id: 'aa_mobile', name: 'Antiaéreo Móvil', desc: 'Plataforma de misiles antiaéreos de gran alcance.', cls: 'aaMobile',
  tags: ['heavyWeapon', 'mech'], era: 3, building: 'heavy_weapons', cost: { carbon: 90, nova: 80 }, time: 35, pop: 1,
  hp: 130, speed: 0.85, los: 10, radius: 0.55, armor: { melee: 1, ranged: 3 },
  attack: { damage: 10, type: 'ranged', range: 9, reload: 2.5, shots: 2, airOnly: true, canHitAir: true, bonus: { air: 12 }, projectile: 'missile', projectileSpeed: 14 },
  model: 'aaMobile',
});
def({
  id: 'heavy_aa_mobile', name: 'Antiaéreo Móvil Pesado', desc: 'Antiaéreo mejorado.', cls: 'aaMobile',
  tags: ['heavyWeapon', 'mech'], era: 4, building: 'heavy_weapons', cost: { carbon: 90, nova: 80 }, time: 35, pop: 1,
  hp: 160, speed: 0.85, los: 11, radius: 0.58, armor: { melee: 1, ranged: 4 },
  attack: { damage: 12, type: 'ranged', range: 10, reload: 2.5, shots: 2, airOnly: true, canHitAir: true, bonus: { air: 16 }, projectile: 'missile', projectileSpeed: 15 },
  model: 'aaMobile', hidden: true,
});

// ───────────────────────── BASE AÉREA ─────────────────────────
def({
  id: 'fighter', name: 'Caza Estelar', desc: 'Nave de combate veloz. Domina el cielo y hostiga tropas.', cls: 'fighter',
  tags: ['air'], era: 3, building: 'airbase', cost: { carbon: 70, nova: 90 }, time: 35, pop: 1,
  hp: 90, speed: 2.0, los: 9, radius: 0.5, armor: { melee: 0, ranged: 1 }, air: true, flyHeight: 6,
  attack: { damage: 6, type: 'ranged', range: 4, reload: 1.5, shots: 2, canHitAir: true, bonus: { air: 5, bomber: 6 }, projectile: 'bolt', projectileSpeed: 22 },
  model: 'fighter',
});
def({
  id: 'adv_fighter', name: 'Caza Estelar Avanzado', desc: 'Caza mejorado.', cls: 'fighter',
  tags: ['air'], era: 4, building: 'airbase', cost: { carbon: 70, nova: 90 }, time: 35, pop: 1,
  hp: 110, speed: 2.2, los: 10, radius: 0.5, armor: { melee: 1, ranged: 2 }, air: true, flyHeight: 6,
  attack: { damage: 7, type: 'ranged', range: 4.5, reload: 1.4, shots: 2, canHitAir: true, bonus: { air: 7, bomber: 8 }, projectile: 'bolt', projectileSpeed: 24 },
  model: 'fighter', hidden: true,
});
def({
  id: 'bomber', name: 'Bombardero', desc: 'Arrasa edificios y vehículos con bombas de protones. No ataca naves.', cls: 'bomber',
  tags: ['air', 'bomber'], era: 3, building: 'airbase', cost: { carbon: 150, nova: 110 }, time: 45, pop: 1,
  hp: 130, speed: 1.3, los: 8, radius: 0.6, armor: { melee: 1, ranged: 2 }, air: true, flyHeight: 7,
  attack: { damage: 18, type: 'ranged', range: 1.2, reload: 4, splash: 1.6, bonus: { building: 25, mech: 6, heavyWeapon: 8 }, projectile: 'bomb', projectileSpeed: 6 },
  model: 'bomber',
});
def({
  id: 'heavy_bomber', name: 'Bombardero Pesado', desc: 'Bombardero mejorado.', cls: 'bomber',
  tags: ['air', 'bomber'], era: 4, building: 'airbase', cost: { carbon: 150, nova: 110 }, time: 45, pop: 1,
  hp: 170, speed: 1.35, los: 9, radius: 0.62, armor: { melee: 1, ranged: 3 }, air: true, flyHeight: 7,
  attack: { damage: 24, type: 'ranged', range: 1.2, reload: 4, splash: 1.8, bonus: { building: 32, mech: 8, heavyWeapon: 10 }, projectile: 'bomb', projectileSpeed: 6 },
  model: 'bomber', hidden: true,
});

// ───────────────────────── TEMPLO ─────────────────────────
def({
  id: 'jedi_knight', name: 'Caballero Jedi', desc: 'Guerrero con sable de luz. Desvía disparos de bláster. Fuerte contra mechs y droides; vulnerable a granadas.', cls: 'jediKnight',
  tags: ['infantry', 'jedi', 'melee'], era: 3, building: 'temple', cost: { food: 80, nova: 120 }, time: 40, pop: 1,
  hp: 150, speed: 1.15, los: 7, radius: 0.24, armor: { melee: 2, ranged: 5 }, deflect: 0.3,
  attack: { damage: 11, type: 'melee', range: 0.9, reload: 1.5, bonus: { mech: 5, droid: 3, trooper: 2 } },
  model: 'jediKnight', carriesHolocron: true,
});
def({
  id: 'jedi_master', name: 'Maestro Jedi', desc: 'Usa la Fuerza para convertir unidades enemigas y sanar aliados. Puede llevar holocrones.', cls: 'jediMaster',
  tags: ['infantry', 'jedi'], era: 3, building: 'temple', cost: { nova: 150 }, time: 45, pop: 1,
  hp: 90, speed: 0.75, los: 10, radius: 0.24, armor: { melee: 1, ranged: 3 }, deflect: 0.2, convert: true, heal: 1.2,
  attack: { damage: 6, type: 'melee', range: 0.9, reload: 2 },
  model: 'jediMaster', carriesHolocron: true,
});

// ───────────────────────── UNIDADES ÚNICAS ─────────────────────────
def({
  id: 'dark_trooper', name: 'Soldado Oscuro', desc: 'Droide de combate imperial fase III. Blindaje pesado y bláster de gran potencia.', cls: 'unique',
  tags: ['infantry', 'trooper', 'ranged', 'droid', 'unique'], era: 3, building: 'fortress', cost: { food: 60, nova: 55 }, time: 28, pop: 1,
  hp: 90, speed: 1.0, los: 7, radius: 0.27, armor: { melee: 2, ranged: 3 },
  attack: { damage: 9, type: 'ranged', range: 6, reload: 2, bonus: { mounted: 3, jedi: 3 }, projectile: 'heavyBolt' },
  civ: 'empire', model: 'dark_trooper',
});
def({
  id: 'elite_dark_trooper', name: 'Soldado Oscuro de Élite', desc: 'Soldado oscuro mejorado.', cls: 'unique',
  tags: ['infantry', 'trooper', 'ranged', 'droid', 'unique'], era: 4, building: 'fortress', cost: { food: 60, nova: 55 }, time: 28, pop: 1,
  hp: 112, speed: 1.0, los: 8, radius: 0.28, armor: { melee: 3, ranged: 4 },
  attack: { damage: 11, type: 'ranged', range: 6.5, reload: 2, bonus: { mounted: 4, jedi: 4 }, projectile: 'heavyBolt' },
  civ: 'empire', model: 'dark_trooper', hidden: true,
});
def({
  id: 'airspeeder', name: 'Aerodeslizador T-47', desc: 'Nave de baja altura con cable de remolque. Derriba mechs pesados.', cls: 'unique',
  tags: ['air', 'unique'], era: 3, building: 'fortress', cost: { carbon: 80, nova: 80 }, time: 30, pop: 1,
  hp: 110, speed: 2.0, los: 9, radius: 0.5, armor: { melee: 0, ranged: 1 }, air: true, flyHeight: 3,
  attack: { damage: 6, type: 'ranged', range: 3, reload: 1.8, shots: 2, bonus: { mech: 12 }, projectile: 'bolt' },
  civ: 'rebels', model: 'airspeeder',
});
def({
  id: 'elite_airspeeder', name: 'Aerodeslizador de Élite', desc: 'Aerodeslizador mejorado.', cls: 'unique',
  tags: ['air', 'unique'], era: 4, building: 'fortress', cost: { carbon: 80, nova: 80 }, time: 30, pop: 1,
  hp: 140, speed: 2.1, los: 10, radius: 0.5, armor: { melee: 1, ranged: 2 }, air: true, flyHeight: 3,
  attack: { damage: 7, type: 'ranged', range: 3.5, reload: 1.8, shots: 2, bonus: { mech: 18 }, projectile: 'bolt' },
  civ: 'rebels', model: 'airspeeder', hidden: true,
});
def({
  id: 'arc_trooper', name: 'Soldado ARC', desc: 'Clon de élite de la República. Letal contra droides.', cls: 'unique',
  tags: ['infantry', 'trooper', 'ranged', 'unique'], era: 3, building: 'fortress', cost: { food: 55, nova: 60 }, time: 26, pop: 1,
  hp: 70, speed: 1.05, los: 8, radius: 0.24, armor: { melee: 1, ranged: 2 },
  attack: { damage: 8, type: 'ranged', range: 6, reload: 1.6, bonus: { droid: 4, heavyWeapon: 3 }, projectile: 'bolt' },
  civ: 'republic', model: 'arc_trooper',
});
def({
  id: 'elite_arc_trooper', name: 'Soldado ARC de Élite', desc: 'Soldado ARC mejorado.', cls: 'unique',
  tags: ['infantry', 'trooper', 'ranged', 'unique'], era: 4, building: 'fortress', cost: { food: 55, nova: 60 }, time: 26, pop: 1,
  hp: 90, speed: 1.05, los: 9, radius: 0.25, armor: { melee: 2, ranged: 3 },
  attack: { damage: 10, type: 'ranged', range: 6.5, reload: 1.5, bonus: { droid: 6, heavyWeapon: 4 }, projectile: 'bolt' },
  civ: 'republic', model: 'arc_trooper', hidden: true,
});
def({
  id: 'magnaguard', name: 'MagnaGuardia IG-100', desc: 'Guardaespaldas droide con electrovara. Especialista en cazar Jedi y héroes.', cls: 'unique',
  tags: ['infantry', 'droid', 'melee', 'unique'], era: 3, building: 'fortress', cost: { food: 70, nova: 60 }, time: 28, pop: 1,
  hp: 110, speed: 1.15, los: 6, radius: 0.26, armor: { melee: 2, ranged: 3 },
  attack: { damage: 10, type: 'melee', range: 1.2, reload: 1.6, bonus: { jedi: 12, hero: 8 } },
  civ: 'cis', model: 'magnaguard',
});
def({
  id: 'elite_magnaguard', name: 'MagnaGuardia de Élite', desc: 'MagnaGuardia mejorado.', cls: 'unique',
  tags: ['infantry', 'droid', 'melee', 'unique'], era: 4, building: 'fortress', cost: { food: 70, nova: 60 }, time: 28, pop: 1,
  hp: 140, speed: 1.2, los: 7, radius: 0.27, armor: { melee: 3, ranged: 4 },
  attack: { damage: 13, type: 'melee', range: 1.2, reload: 1.5, bonus: { jedi: 16, hero: 12 } },
  civ: 'cis', model: 'magnaguard', hidden: true,
});
def({
  id: 'droideka', name: 'Droideka', desc: 'Droide destructor con escudo deflector. Rueda a gran velocidad y dispara ráfagas dobles.', cls: 'unique',
  tags: ['droid', 'ranged', 'shielded', 'unique', 'mech'], era: 3, building: 'fortress', cost: { food: 60, nova: 70, ore: 20 }, time: 30, pop: 1,
  hp: 90, speed: 1.35, los: 7, radius: 0.32, armor: { melee: 1, ranged: 6 },
  attack: { damage: 7, type: 'ranged', range: 5, reload: 2.2, shots: 2, projectile: 'bolt' },
  civ: 'tradefed', model: 'droideka',
});
def({
  id: 'elite_droideka', name: 'Droideka de Élite', desc: 'Droideka mejorado.', cls: 'unique',
  tags: ['droid', 'ranged', 'shielded', 'unique', 'mech'], era: 4, building: 'fortress', cost: { food: 60, nova: 70, ore: 20 }, time: 30, pop: 1,
  hp: 120, speed: 1.4, los: 8, radius: 0.33, armor: { melee: 2, ranged: 8 },
  attack: { damage: 8, type: 'ranged', range: 5.5, reload: 2.1, shots: 2, projectile: 'bolt' },
  civ: 'tradefed', model: 'droideka', hidden: true,
});
def({
  id: 'royal_crusader', name: 'Cruzado Real', desc: 'Caballería de élite de Naboo en speeder. Rápido y eficaz contra vehículos.', cls: 'unique',
  tags: ['mounted', 'unique'], era: 3, building: 'fortress', cost: { food: 70, nova: 70 }, time: 28, pop: 1,
  hp: 120, speed: 1.55, los: 7, radius: 0.36, armor: { melee: 1, ranged: 3 },
  attack: { damage: 8, type: 'ranged', range: 3, reload: 1.8, bonus: { mech: 6, heavyWeapon: 6 }, projectile: 'bolt' },
  civ: 'naboo', model: 'royal_crusader',
});
def({
  id: 'elite_royal_crusader', name: 'Cruzado Real de Élite', desc: 'Cruzado mejorado.', cls: 'unique',
  tags: ['mounted', 'unique'], era: 4, building: 'fortress', cost: { food: 70, nova: 70 }, time: 28, pop: 1,
  hp: 150, speed: 1.6, los: 8, radius: 0.37, armor: { melee: 2, ranged: 4 },
  attack: { damage: 10, type: 'ranged', range: 3.5, reload: 1.7, bonus: { mech: 9, heavyWeapon: 8 }, projectile: 'bolt' },
  civ: 'naboo', model: 'royal_crusader', hidden: true,
});
def({
  id: 'fambaa', name: 'Fambaa Escudo', desc: 'Enorme bestia que porta un generador de escudo. Las unidades aliadas bajo el escudo reciben mucho menos daño.', cls: 'unique',
  tags: ['creature', 'unique', 'mounted'], era: 3, building: 'fortress', cost: { food: 200, nova: 150 }, time: 50, pop: 1,
  hp: 450, speed: 0.55, los: 7, radius: 0.85, armor: { melee: 2, ranged: 3 }, shieldAura: 4.5,
  attack: { damage: 6, type: 'melee', range: 1.2, reload: 2.5 },
  civ: 'gungans', model: 'fambaa',
});
def({
  id: 'elite_fambaa', name: 'Fambaa Escudo de Élite', desc: 'Fambaa con generador ampliado.', cls: 'unique',
  tags: ['creature', 'unique', 'mounted'], era: 4, building: 'fortress', cost: { food: 200, nova: 150 }, time: 50, pop: 1,
  hp: 600, speed: 0.58, los: 8, radius: 0.9, armor: { melee: 3, ranged: 4 }, shieldAura: 5.5,
  attack: { damage: 8, type: 'melee', range: 1.2, reload: 2.5 },
  civ: 'gungans', model: 'fambaa', hidden: true,
});
def({
  id: 'berserker', name: 'Berserker Wookiee', desc: 'Guerrero cuerpo a cuerpo furioso que se regenera en combate.', cls: 'unique',
  tags: ['infantry', 'melee', 'unique'], era: 3, building: 'fortress', cost: { food: 65, carbon: 20, nova: 40 }, time: 26, pop: 1,
  hp: 120, speed: 1.2, los: 6, radius: 0.3, armor: { melee: 1, ranged: 2 }, regen: 1,
  attack: { damage: 12, type: 'melee', range: 0.9, reload: 1.8, bonus: { building: 4, trooper: 3 } },
  civ: 'wookiees', model: 'berserker',
});
def({
  id: 'elite_berserker', name: 'Berserker Wookiee de Élite', desc: 'Berserker mejorado.', cls: 'unique',
  tags: ['infantry', 'melee', 'unique'], era: 4, building: 'fortress', cost: { food: 65, carbon: 20, nova: 40 }, time: 26, pop: 1,
  hp: 150, speed: 1.25, los: 7, radius: 0.31, armor: { melee: 2, ranged: 3 }, regen: 1.5,
  attack: { damage: 15, type: 'melee', range: 0.9, reload: 1.7, bonus: { building: 6, trooper: 4 } },
  civ: 'wookiees', model: 'berserker', hidden: true,
});

// ───────────────────────── HÉROES ─────────────────────────
type HeroSpec = Omit<UnitDef, 'cls' | 'era' | 'pop' | 'radius' | 'time' | 'tags'> & { tags?: UnitDef['tags']; time?: number };
function hero(h: HeroSpec, force: boolean): UnitDef {
  return def({
    cls: 'hero', era: 3, pop: 1, radius: 0.28, time: h.time ?? 60,
    ...h,
    tags: h.tags ?? (force ? ['infantry', 'hero', 'jedi'] : ['infantry', 'hero']),
    carriesHolocron: force,
  });
}
const FORCE_COST = { food: 250, nova: 450 };
const HERO_COST = { food: 220, nova: 330 };

hero({ id: 'vader', name: 'Darth Vader', desc: 'Señor Oscuro de los Sith. Imparable en combate cuerpo a cuerpo. Estrangula con la Fuerza.', building: 'temple', cost: FORCE_COST,
  hp: 950, speed: 0.95, los: 9, armor: { melee: 5, ranged: 12 }, deflect: 0.7, attack: { damage: 30, type: 'melee', range: 1.1, reload: 1.6, bonus: { jedi: 10, hero: 10 } },
  abilities: ['forceChoke', 'forcePush'], saberColor: SABER.red, heroOf: 'empire', model: 'hero_vader', voice: 'vader' }, true);
hero({ id: 'palpatine', name: 'Emperador Palpatine', desc: 'Darth Sidious. Lanza relámpagos de la Fuerza que encadenan enemigos y corrompe tropas enemigas.', building: 'temple', cost: FORCE_COST,
  hp: 650, speed: 0.85, los: 10, armor: { melee: 3, ranged: 10 }, deflect: 0.6, convert: true, attack: { damage: 16, type: 'ranged', range: 5, reload: 2, projectile: 'none', bonus: { jedi: 6 } },
  abilities: ['forceLightning', 'forcePush'], saberColor: SABER.red, heroOf: 'empire', model: 'hero_palpatine', voice: 'palpatine' }, true);
hero({ id: 'boba_fett', name: 'Boba Fett', desc: 'Cazarrecompensas mandaloriano. Mochila propulsora y detonadores térmicos.', building: 'fortress', cost: HERO_COST,
  hp: 620, speed: 1.2, los: 10, armor: { melee: 3, ranged: 5 }, attack: { damage: 16, type: 'ranged', range: 6, reload: 1.4, canHitAir: true, bonus: { jedi: 8, hero: 8 }, projectile: 'bolt' },
  abilities: ['thermalDetonator', 'jetpack'], heroOf: 'empire', model: 'hero_boba', voice: 'boba' }, false);

hero({ id: 'luke', name: 'Luke Skywalker', desc: 'Caballero Jedi y héroe de la Alianza. Empuje de la Fuerza y lanzamiento de sable.', building: 'temple', cost: FORCE_COST,
  hp: 780, speed: 1.15, los: 9, armor: { melee: 4, ranged: 10 }, deflect: 0.65, attack: { damage: 26, type: 'melee', range: 1.0, reload: 1.4, bonus: { mech: 8, droid: 6 } },
  abilities: ['forcePush', 'saberThrow'], saberColor: SABER.green, heroOf: 'rebels', model: 'hero_luke', voice: 'luke' }, true);
hero({ id: 'han', name: 'Han Solo', desc: 'Contrabandista y general rebelde. Dispara primero.', building: 'fortress', cost: HERO_COST,
  hp: 520, speed: 1.15, los: 9, armor: { melee: 2, ranged: 4 }, attack: { damage: 18, type: 'ranged', range: 6, reload: 1.2, canHitAir: true, bonus: { hero: 6 }, projectile: 'bolt' },
  abilities: ['rapidFire', 'thermalDetonator'], heroOf: 'rebels', model: 'hero_han', voice: 'han' }, false);
hero({ id: 'leia', name: 'Princesa Leia', desc: 'Líder de la Rebelión. Su presencia inspira a las tropas cercanas.', building: 'fortress', cost: HERO_COST,
  hp: 480, speed: 1.1, los: 10, armor: { melee: 2, ranged: 4 }, attack: { damage: 14, type: 'ranged', range: 6, reload: 1.3, canHitAir: true, projectile: 'bolt' },
  abilities: ['rally', 'rapidFire'], heroOf: 'rebels', model: 'hero_leia', voice: 'leia' }, false);

hero({ id: 'yoda', name: 'Maestro Yoda', desc: 'Gran Maestro de la Orden Jedi. Su Meditación de Batalla potencia a todo el ejército.', building: 'temple', cost: FORCE_COST,
  hp: 620, speed: 1.2, los: 11, armor: { melee: 4, ranged: 12 }, deflect: 0.8, heal: 2, attack: { damage: 24, type: 'melee', range: 0.9, reload: 1.1, bonus: { droid: 6 } },
  abilities: ['battleMeditation', 'forcePush'], saberColor: SABER.green, heroOf: 'republic', model: 'hero_yoda', voice: 'yoda' }, true);
hero({ id: 'obiwan', name: 'Obi-Wan Kenobi', desc: 'Maestro de la forma Soresu. Desvía casi cualquier disparo. Sana aliados.', building: 'temple', cost: FORCE_COST,
  hp: 800, speed: 1.1, los: 9, armor: { melee: 5, ranged: 12 }, deflect: 0.85, attack: { damage: 24, type: 'melee', range: 1.0, reload: 1.4, bonus: { droid: 6 } },
  abilities: ['forcePush', 'forceHeal'], saberColor: SABER.blue, heroOf: 'republic', model: 'hero_obiwan', voice: 'obiwan' }, true);
hero({ id: 'mace', name: 'Mace Windu', desc: 'Maestro del Vaapad. Daño devastador con su sable púrpura.', building: 'temple', cost: FORCE_COST,
  hp: 820, speed: 1.1, los: 9, armor: { melee: 4, ranged: 10 }, deflect: 0.7, attack: { damage: 30, type: 'melee', range: 1.0, reload: 1.4, bonus: { droid: 6, hero: 8 } },
  abilities: ['forcePush', 'saberThrow'], saberColor: SABER.purple, heroOf: 'republic', model: 'hero_mace', voice: 'mace' }, true);
hero({ id: 'rex', name: 'Capitán Rex', desc: 'Veterano clon de la 501. Doble pistola y bombardeo orbital.', building: 'fortress', cost: HERO_COST,
  hp: 560, speed: 1.1, los: 9, armor: { melee: 2, ranged: 5 }, attack: { damage: 9, type: 'ranged', range: 6, reload: 1.0, shots: 2, canHitAir: true, bonus: { droid: 4 }, projectile: 'bolt' },
  abilities: ['orbitalStrike', 'rally'], heroOf: 'republic', model: 'hero_rex', voice: 'rex' }, false);

hero({ id: 'dooku', name: 'Conde Dooku', desc: 'Darth Tyranus. Duelista elegante que domina el relámpago de la Fuerza.', building: 'temple', cost: FORCE_COST,
  hp: 740, speed: 1.05, los: 9, armor: { melee: 4, ranged: 10 }, deflect: 0.75, attack: { damage: 26, type: 'melee', range: 1.0, reload: 1.4, bonus: { jedi: 8 } },
  abilities: ['forceLightning', 'forcePush'], saberColor: SABER.red, heroOf: 'cis', model: 'hero_dooku', voice: 'dooku' }, true);
hero({ id: 'ventress', name: 'Asajj Ventress', desc: 'Asesina sith con dos sables curvos.', building: 'temple', cost: FORCE_COST,
  hp: 660, speed: 1.25, los: 9, armor: { melee: 3, ranged: 9 }, deflect: 0.6, attack: { damage: 24, type: 'melee', range: 1.0, reload: 1.1 },
  abilities: ['saberThrow', 'saberSpin'], saberColor: SABER.red, saberCount: 2, heroOf: 'cis', model: 'hero_ventress', voice: 'ventress' }, true);
hero({ id: 'grievous', name: 'General Grievous', desc: 'Cyborg comandante de los droides. Cuatro sables robados en un torbellino letal.', building: 'fortress', cost: HERO_COST,
  hp: 820, speed: 1.2, los: 9, armor: { melee: 4, ranged: 8 }, deflect: 0.5, attack: { damage: 24, type: 'melee', range: 1.1, reload: 1.2, bonus: { jedi: 10 } },
  abilities: ['saberSpin'], saberColor: SABER.blue, saberCount: 4, heroOf: 'cis', model: 'hero_grievous', voice: 'grievous',
  tags: ['infantry', 'hero', 'droid'] }, false);

hero({ id: 'maul', name: 'Darth Maul', desc: 'Aprendiz sith con sable de doble hoja. Ágil y salvaje.', building: 'temple', cost: FORCE_COST,
  hp: 720, speed: 1.3, los: 9, armor: { melee: 3, ranged: 9 }, deflect: 0.65, attack: { damage: 28, type: 'melee', range: 1.1, reload: 1.3, bonus: { jedi: 10 } },
  abilities: ['saberSpin', 'forcePush'], saberColor: SABER.red, saberCount: 2, heroOf: 'tradefed', model: 'hero_maul', voice: 'maul' }, true);
hero({ id: 'oom9', name: 'Comandante OOM-9', desc: 'Droide comandante. Potencia a todos los droides cercanos.', building: 'fortress', cost: HERO_COST,
  hp: 520, speed: 1.0, los: 10, armor: { melee: 2, ranged: 5 }, attack: { damage: 12, type: 'ranged', range: 6, reload: 1.4, canHitAir: true, projectile: 'bolt' },
  abilities: ['droidCommand', 'rally'], heroOf: 'tradefed', model: 'hero_oom9', voice: 'droid', tags: ['infantry', 'hero', 'droid'] }, false);
hero({ id: 'aurra', name: 'Aurra Sing', desc: 'Cazarrecompensas francotiradora contratada por la Federación.', building: 'fortress', cost: HERO_COST,
  hp: 480, speed: 1.15, los: 12, armor: { melee: 2, ranged: 4 }, attack: { damage: 26, type: 'ranged', range: 9, reload: 2.2, bonus: { jedi: 12, hero: 12 }, projectile: 'heavyBolt' },
  abilities: ['thermalDetonator', 'rapidFire'], heroOf: 'tradefed', model: 'hero_aurra', voice: 'aurra' }, false);

hero({ id: 'quigon', name: 'Qui-Gon Jinn', desc: 'Maestro Jedi sabio. Protege y sana a los suyos.', building: 'temple', cost: FORCE_COST,
  hp: 780, speed: 1.05, los: 10, armor: { melee: 4, ranged: 10 }, deflect: 0.7, attack: { damage: 25, type: 'melee', range: 1.0, reload: 1.4, bonus: { droid: 6 } },
  abilities: ['forcePush', 'forceHeal'], saberColor: SABER.green, heroOf: 'naboo', model: 'hero_quigon', voice: 'quigon' }, true);
hero({ id: 'padme', name: 'Reina Padmé Amidala', desc: 'Reina de Naboo. Inspira a sus tropas y dispara con precisión.', building: 'fortress', cost: HERO_COST,
  hp: 480, speed: 1.1, los: 10, armor: { melee: 2, ranged: 4 }, attack: { damage: 15, type: 'ranged', range: 6, reload: 1.2, canHitAir: true, projectile: 'bolt' },
  abilities: ['rally', 'rapidFire'], heroOf: 'naboo', model: 'hero_padme', voice: 'padme' }, false);
hero({ id: 'panaka', name: 'Capitán Panaka', desc: 'Jefe de seguridad real. Experto en explosivos.', building: 'fortress', cost: HERO_COST,
  hp: 540, speed: 1.05, los: 9, armor: { melee: 2, ranged: 5 }, attack: { damage: 14, type: 'ranged', range: 6, reload: 1.3, canHitAir: true, projectile: 'bolt' },
  abilities: ['thermalDetonator', 'rally'], heroOf: 'naboo', model: 'hero_panaka', voice: 'panaka' }, false);

hero({ id: 'boss_nass', name: 'Jefe Nass', desc: 'Gobernante de Otoh Gunga. Proyecta una burbuja de escudo protectora.', building: 'fortress', cost: HERO_COST,
  hp: 950, speed: 0.9, los: 9, armor: { melee: 3, ranged: 4 }, attack: { damage: 18, type: 'melee', range: 1.1, reload: 1.8, bonus: { droid: 4 } },
  abilities: ['shieldBubble', 'rally'], heroOf: 'gungans', model: 'hero_nass', voice: 'gungan' }, false);
hero({ id: 'jarjar', name: 'Jar Jar Binks', desc: 'General Gungan accidentalmente letal. Su torpeza derriba enemigos.', building: 'fortress', cost: HERO_COST,
  hp: 520, speed: 1.3, los: 8, armor: { melee: 2, ranged: 3 }, deflect: 0.5, attack: { damage: 9, type: 'melee', range: 1.0, reload: 1.2 },
  abilities: ['clumsy'], heroOf: 'gungans', model: 'hero_jarjar', voice: 'jarjar' }, false);
hero({ id: 'tarpals', name: 'Capitán Tarpals', desc: 'Capitán del Gran Ejército Gungan con electrovara.', building: 'fortress', cost: HERO_COST,
  hp: 640, speed: 1.1, los: 9, armor: { melee: 3, ranged: 4 }, attack: { damage: 18, type: 'melee', range: 1.3, reload: 1.4, bonus: { droid: 8 } },
  abilities: ['rally', 'roar'], heroOf: 'gungans', model: 'hero_tarpals', voice: 'gungan' }, false);

hero({ id: 'chewbacca', name: 'Chewbacca', desc: 'Copiloto del Halcón Milenario. Su ballesta láser arranca brazos.', building: 'fortress', cost: HERO_COST,
  hp: 780, speed: 1.1, los: 9, armor: { melee: 3, ranged: 5 }, regen: 1, attack: { damage: 20, type: 'ranged', range: 5, reload: 1.6, canHitAir: true, bonus: { building: 10, mech: 6 }, projectile: 'heavyBolt' },
  abilities: ['roar', 'rapidFire'], heroOf: 'wookiees', model: 'hero_chewbacca', voice: 'wookiee' }, false);
hero({ id: 'tarfful', name: 'Tarfful', desc: 'Jefe wookiee de Kashyyyk. Fuerza bruta cuerpo a cuerpo.', building: 'fortress', cost: HERO_COST,
  hp: 900, speed: 1.05, los: 8, armor: { melee: 4, ranged: 4 }, regen: 1.5, attack: { damage: 24, type: 'melee', range: 1.1, reload: 1.5, bonus: { droid: 6, building: 6 } },
  abilities: ['roar'], heroOf: 'wookiees', model: 'hero_tarfful', voice: 'wookiee' }, false);
hero({ id: 'gungi', name: 'Gungi', desc: 'Joven Jedi wookiee. Su sable de madera de wroshyr brilla verde.', building: 'temple', cost: FORCE_COST,
  hp: 860, speed: 1.05, los: 9, armor: { melee: 4, ranged: 9 }, deflect: 0.6, regen: 1, attack: { damage: 24, type: 'melee', range: 1.1, reload: 1.5, bonus: { droid: 6 } },
  abilities: ['forcePush', 'roar'], saberColor: SABER.green, heroOf: 'wookiees', model: 'hero_gungi', voice: 'wookiee' }, true);

// ───────────────────────── ANIMALES (GAIA) ─────────────────────────
function animal(id: string, name: string, hp: number, speed: number, food: number, aggressive: boolean, radius: number, dmg = 0): UnitDef {
  return def({
    id, name, desc: aggressive ? 'Criatura salvaje y agresiva. Cázala con cuidado.' : 'Criatura salvaje. Cázala para obtener alimento.',
    cls: 'animal', tags: ['animal', 'creature'], era: 1, building: '', cost: { food }, time: 0, pop: 0, hp, speed, los: aggressive ? 5 : 4,
    radius, armor: { melee: 0, ranged: 0 }, attack: aggressive ? { damage: dmg, type: 'melee', range: 0.8, reload: 2 } : undefined,
    model: 'animal_' + id, hidden: true,
  });
}
animal('bantha', 'Bantha', 50, 0.6, 220, false, 0.6);
animal('dewback', 'Dewback', 40, 0.65, 180, false, 0.5);
animal('tauntaun', 'Tauntaun', 25, 1.0, 140, false, 0.4);
animal('shaak', 'Shaak', 20, 0.7, 140, false, 0.45);
animal('nerf', 'Nerf', 30, 0.7, 160, false, 0.45);
animal('kaadu', 'Kaadu salvaje', 28, 1.0, 140, false, 0.4);
animal('happabore', 'Happabore', 50, 0.55, 200, false, 0.6);
animal('lothcat', 'Gato de Loth', 15, 1.1, 80, false, 0.25);
animal('thranta', 'Varactyl', 35, 0.9, 170, false, 0.45);
animal('wampa', 'Wampa', 90, 0.95, 140, true, 0.45, 7);
animal('nexu', 'Nexu', 55, 1.1, 100, true, 0.38, 5);
animal('boarwolf', 'Lobo-jabalí', 50, 1.0, 120, true, 0.38, 5);
animal('acklay', 'Acklay', 140, 0.9, 200, true, 0.7, 10);

export const UNITS = U;

export function unitDef(id: string): UnitDef {
  const d = U[id];
  if (!d) throw new Error('Unidad desconocida: ' + id);
  return d;
}

// Habilidades activas de héroes
export const ABILITIES: Record<AbilityId, AbilityDef> = {
  forcePush: { id: 'forcePush', name: 'Empuje de la Fuerza', desc: 'Lanza a los enemigos cercanos por los aires causando daño y aturdimiento.', cooldown: 18, range: 0, radius: 3.2, target: 'self', icon: 'push' },
  forceLightning: { id: 'forceLightning', name: 'Relámpago de la Fuerza', desc: 'Relámpagos que saltan entre hasta 6 enemigos.', cooldown: 16, range: 6, radius: 3, target: 'unit', icon: 'lightning' },
  forceChoke: { id: 'forceChoke', name: 'Estrangulamiento', desc: 'Levanta y estrangula a un enemigo, causando daño masivo y aturdimiento.', cooldown: 20, range: 6, target: 'unit', icon: 'choke' },
  forceHeal: { id: 'forceHeal', name: 'Sanación de la Fuerza', desc: 'Restaura vida a todos los aliados cercanos.', cooldown: 25, range: 0, radius: 5, target: 'self', icon: 'heal' },
  saberThrow: { id: 'saberThrow', name: 'Lanzar Sable', desc: 'Lanza el sable en línea recta dañando a todo a su paso.', cooldown: 12, range: 7, target: 'point', icon: 'throw' },
  battleMeditation: { id: 'battleMeditation', name: 'Meditación de Batalla', desc: 'Aliados cercanos +30% de daño y +2 de armadura durante 15 s.', cooldown: 40, range: 0, radius: 8, target: 'self', icon: 'meditate' },
  rally: { id: 'rally', name: 'Inspirar Tropas', desc: 'Aliados cercanos +25% velocidad y +20% daño durante 12 s.', cooldown: 35, range: 0, radius: 7, target: 'self', icon: 'rally' },
  thermalDetonator: { id: 'thermalDetonator', name: 'Detonador Térmico', desc: 'Lanza un explosivo con gran daño en área.', cooldown: 15, range: 6, radius: 2, target: 'point', icon: 'detonator' },
  saberSpin: { id: 'saberSpin', name: 'Torbellino de Sables', desc: 'Gira dañando a todos los enemigos alrededor varias veces.', cooldown: 14, range: 0, radius: 2.2, target: 'self', icon: 'spin' },
  roar: { id: 'roar', name: 'Rugido', desc: 'Aterra a los enemigos cercanos: reducen su daño y huyen brevemente.', cooldown: 25, range: 0, radius: 5, target: 'self', icon: 'roar' },
  rapidFire: { id: 'rapidFire', name: 'Fuego Rápido', desc: 'Triplica la cadencia de disparo durante 6 s.', cooldown: 22, range: 0, target: 'self', icon: 'rapid' },
  orbitalStrike: { id: 'orbitalStrike', name: 'Bombardeo Orbital', desc: 'Solicita un bombardeo de artillería en la zona objetivo.', cooldown: 60, range: 14, radius: 3, target: 'point', icon: 'orbital' },
  jetpack: { id: 'jetpack', name: 'Mochila Propulsora', desc: 'Vuela hasta el punto objetivo ignorando obstáculos.', cooldown: 14, range: 9, target: 'point', icon: 'jetpack' },
  clumsy: { id: 'clumsy', name: 'Torpeza Gungan', desc: 'Tropieza de forma caótica derribando a los enemigos cercanos.', cooldown: 16, range: 0, radius: 3, target: 'self', icon: 'clumsy' },
  shieldBubble: { id: 'shieldBubble', name: 'Burbuja de Escudo', desc: 'Proyecta un escudo que reduce el daño de los aliados en un 60% durante 10 s.', cooldown: 40, range: 0, radius: 5, target: 'self', icon: 'shield' },
  droidCommand: { id: 'droidCommand', name: 'Protocolo de Mando', desc: 'Droides aliados cercanos +30% velocidad de ataque durante 12 s.', cooldown: 35, range: 0, radius: 8, target: 'self', icon: 'command' },
};
