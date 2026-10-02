import type { BuildingDef } from './types';

const B: Record<string, BuildingDef> = {};
function def(b: BuildingDef) {
  B[b.id] = b;
}

def({
  id: 'command_center', name: 'Centro de Mando', desc: 'Corazón de tu colonia. Entrena trabajadores, recibe todos los recursos y permite avanzar de era.',
  era: 1, cost: { carbon: 275, ore: 100 }, time: 150, hp: 2400, size: 4, los: 9, armor: { melee: 1, ranged: 6 },
  attack: { damage: 5, type: 'ranged', range: 6, reload: 2, canHitAir: true, projectile: 'bolt', shots: 1 },
  pop: 10, dropsite: ['food', 'carbon', 'nova', 'ore'], trains: ['worker'], tags: ['building'], model: 'command_center', hotkey: 'C', garrison: 15,
});
def({
  id: 'shelter', name: 'Refugio Prefabricado', desc: 'Vivienda modular. Aumenta la población máxima en 5.',
  era: 1, cost: { carbon: 30 }, time: 25, hp: 550, size: 2, los: 2, armor: { melee: 0, ranged: 6 }, pop: 5,
  tags: ['building'], model: 'shelter', hotkey: 'E',
});
def({
  id: 'food_center', name: 'Centro de Procesamiento de Alimentos', desc: 'Depósito de alimentos. Investiga mejoras de cultivo.',
  era: 1, cost: { carbon: 100 }, time: 35, hp: 650, size: 2, los: 5, armor: { melee: 0, ranged: 6 }, dropsite: ['food'],
  tags: ['building'], model: 'food_center', hotkey: 'F',
});
def({
  id: 'farm', name: 'Granja de Humedad', desc: 'Fuente renovable de alimentos. Un trabajador por granja. Se replanta automáticamente.',
  era: 1, cost: { carbon: 60 }, time: 15, hp: 480, size: 3, los: 1, armor: { melee: 0, ranged: 0 }, walkable: true, farm: true,
  tags: ['building'], model: 'farm', requiresBuilding: 'food_center', hotkey: 'G',
});
def({
  id: 'carbon_center', name: 'Centro de Procesamiento de Carbono', desc: 'Depósito de carbono. Investiga mejoras de extracción.',
  era: 1, cost: { carbon: 100 }, time: 35, hp: 650, size: 2, los: 5, armor: { melee: 0, ranged: 6 }, dropsite: ['carbon'],
  tags: ['building'], model: 'carbon_center', hotkey: 'L',
});
def({
  id: 'mining_center', name: 'Centro de Minería', desc: 'Depósito de cristales Nova y mineral. Investiga mejoras de minería.',
  era: 1, cost: { carbon: 100 }, time: 35, hp: 650, size: 2, los: 5, armor: { melee: 0, ranged: 6 }, dropsite: ['nova', 'ore'],
  tags: ['building'], model: 'mining_center', hotkey: 'M',
});
def({
  id: 'power_core', name: 'Núcleo de Energía', desc: 'Suministra energía en un radio. Los edificios militares sin energía producen a la mitad de velocidad.',
  era: 1, cost: { carbon: 75, ore: 25 }, time: 30, hp: 600, size: 2, los: 5, armor: { melee: 0, ranged: 6 }, powerRadius: 9,
  tags: ['building'], model: 'power_core', hotkey: 'P',
});
def({
  id: 'troop_center', name: 'Centro de Tropas', desc: 'Entrena soldados, granaderos, antiaéreos y tropas montadas.',
  era: 1, cost: { carbon: 175 }, time: 50, hp: 1300, size: 3, los: 6, armor: { melee: 0, ranged: 7 }, needsPower: true,
  trains: ['trooper', 'grenadier', 'aa_trooper', 'mounted_trooper'], tags: ['building'], model: 'troop_center', hotkey: 'B',
});
def({
  id: 'mech_factory', name: 'Fábrica de Mechs', desc: 'Construye exploradores, mechs de ataque, destructores de mechs y mechs de asalto.',
  era: 2, cost: { carbon: 175, ore: 25 }, time: 50, hp: 1300, size: 3, los: 6, armor: { melee: 0, ranged: 7 }, needsPower: true,
  trains: ['scout', 'strike_mech', 'mech_destroyer', 'assault_mech'], tags: ['building'], model: 'mech_factory', hotkey: 'K',
});
def({
  id: 'research_center', name: 'Centro de Investigación', desc: 'Investiga mejoras de armas, blindajes y estructuras.',
  era: 2, cost: { carbon: 150 }, time: 40, hp: 1200, size: 3, los: 6, armor: { melee: 0, ranged: 7 },
  tags: ['building'], model: 'research_center', hotkey: 'R',
});
def({
  id: 'spaceport', name: 'Puerto Espacial', desc: 'Comercia recursos en el mercado galáctico, envía tributos a aliados y construye cargueros para rutas comerciales.',
  era: 2, cost: { carbon: 175 }, time: 60, hp: 1400, size: 4, los: 7, armor: { melee: 0, ranged: 7 },
  trains: ['trader'], tags: ['building'], model: 'spaceport', hotkey: 'S',
});
def({
  id: 'turret', name: 'Torreta Bláster', desc: 'Defensa fija contra unidades terrestres.',
  era: 2, cost: { carbon: 25, ore: 125 }, time: 70, hp: 1000, size: 1, los: 9, armor: { melee: 1, ranged: 7 },
  attack: { damage: 6, type: 'ranged', range: 8, reload: 2.2, projectile: 'bolt', bonus: { infantry: 1 } },
  tags: ['building', 'turret'], model: 'turret', hotkey: 'T', garrison: 5,
});
def({
  id: 'aa_turret', name: 'Torreta Antiaérea', desc: 'Defensa fija con misiles que derriba naves enemigas.',
  era: 2, cost: { carbon: 25, ore: 100 }, time: 60, hp: 900, size: 1, los: 10, armor: { melee: 1, ranged: 7 },
  attack: { damage: 10, type: 'ranged', range: 9, reload: 2.2, airOnly: true, canHitAir: true, shots: 2, bonus: { air: 10 }, projectile: 'missile', projectileSpeed: 14 },
  tags: ['building', 'turret'], model: 'aa_turret', hotkey: 'Y',
});
def({
  id: 'wall', name: 'Muro de Duracero', desc: 'Muro defensivo. Arrastra para construir secciones.',
  era: 2, cost: { ore: 5 }, time: 8, hp: 1800, size: 1, los: 2, armor: { melee: 8, ranged: 10 }, wall: true,
  tags: ['building', 'wall'], model: 'wall', hotkey: 'W',
});
def({
  id: 'gate', name: 'Compuerta', desc: 'Puerta en el muro. Solo tus unidades y las aliadas pueden atravesarla.',
  era: 2, cost: { ore: 30 }, time: 20, hp: 2200, size: 1, los: 3, armor: { melee: 8, ranged: 10 }, wall: true, gate: true, walkable: false,
  tags: ['building', 'wall'], model: 'gate', hotkey: 'Q',
});
def({
  id: 'temple', name: 'Templo de la Fuerza', desc: 'Entrena usuarios de la Fuerza y héroes Jedi/Sith. Guarda holocrones que generan Nova.',
  era: 3, cost: { carbon: 175, nova: 50 }, time: 50, hp: 2100, size: 3, los: 8, armor: { melee: 2, ranged: 8 }, temple: true,
  trains: ['jedi_knight', 'jedi_master'], tags: ['building'], model: 'temple', hotkey: 'J',
});
def({
  id: 'heavy_weapons', name: 'Fábrica de Armas Pesadas', desc: 'Construye arietes, artillería y antiaéreos móviles.',
  era: 3, cost: { carbon: 200, ore: 25 }, time: 50, hp: 1400, size: 3, los: 6, armor: { melee: 0, ranged: 7 }, needsPower: true,
  trains: ['pummel', 'artillery', 'aa_mobile'], tags: ['building'], model: 'heavy_weapons', hotkey: 'H',
});
def({
  id: 'airbase', name: 'Base Aérea', desc: 'Construye cazas estelares y bombarderos.',
  era: 3, cost: { carbon: 200, ore: 50 }, time: 55, hp: 1400, size: 4, los: 7, armor: { melee: 0, ranged: 7 }, needsPower: true,
  trains: ['fighter', 'bomber'], tags: ['building'], model: 'airbase', hotkey: 'A',
});
def({
  id: 'shield_gen', name: 'Generador de Escudos', desc: 'Proyecta un escudo que reduce un 35% el daño a unidades y edificios propios en su radio.',
  era: 3, cost: { carbon: 100, nova: 100, ore: 50 }, time: 45, hp: 900, size: 2, los: 6, armor: { melee: 0, ranged: 8 }, shieldRadius: 7,
  tags: ['building'], model: 'shield_gen', hotkey: 'D',
});
def({
  id: 'fortress', name: 'Fortaleza', desc: 'Bastión fuertemente armado. Entrena la unidad única y los héroes de tu civilización.',
  era: 3, cost: { ore: 650 }, time: 180, hp: 4800, size: 4, los: 11, armor: { melee: 8, ranged: 11 }, pop: 20,
  attack: { damage: 11, type: 'ranged', range: 8, reload: 2, shots: 3, canHitAir: true, projectile: 'heavyBolt', bonus: { mech: 2 } },
  trains: [], tags: ['building', 'fortress'], model: 'fortress', hotkey: 'X', garrison: 20,
});
def({
  id: 'monument', name: 'Monumento', desc: 'Maravilla de la galaxia. Si se mantiene en pie el tiempo necesario, otorga la victoria.',
  era: 4, cost: { food: 1000, carbon: 1000, nova: 1000, ore: 1000 }, time: 500, hp: 5000, size: 5, los: 8, armor: { melee: 8, ranged: 10 },
  monument: true, maxCount: 1, tags: ['building'], model: 'monument', hotkey: 'O',
});

export const BUILDINGS = B;
export const BUILD_ORDER_MENU = [
  ['shelter', 'farm', 'food_center', 'carbon_center', 'mining_center', 'power_core', 'troop_center', 'command_center'],
  ['mech_factory', 'research_center', 'spaceport', 'turret', 'aa_turret', 'wall', 'gate'],
  ['temple', 'heavy_weapons', 'airbase', 'shield_gen', 'fortress', 'monument'],
];

export function buildingDef(id: string): BuildingDef {
  const d = B[id];
  if (!d) throw new Error('Edificio desconocido: ' + id);
  return d;
}
