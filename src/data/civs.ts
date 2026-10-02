import type { CivDef } from './types';
import { SABER } from './units';

// Colores de jugador (idénticos en espíritu a Age of Empires)
export const PLAYER_COLORS = [
  { name: 'Azul', hex: 0x2f6bff, css: '#2f6bff' },
  { name: 'Rojo', hex: 0xe8322a, css: '#e8322a' },
  { name: 'Verde', hex: 0x2fbf3a, css: '#2fbf3a' },
  { name: 'Amarillo', hex: 0xf2d22e, css: '#f2d22e' },
  { name: 'Cian', hex: 0x2ad8e0, css: '#2ad8e0' },
  { name: 'Púrpura', hex: 0xb84ae6, css: '#b84ae6' },
  { name: 'Gris', hex: 0xa8a8a8, css: '#a8a8a8' },
  { name: 'Naranja', hex: 0xff8a1f, css: '#ff8a1f' },
];
export const GAIA_COLOR = { name: 'Naturaleza', hex: 0xcfc8b0, css: '#cfc8b0' };

const C: Record<string, CivDef> = {};
function def(c: CivDef) {
  C[c.id] = c;
}

def({
  id: 'empire', name: 'Imperio Galáctico', short: 'Imperio', side: 'dark', style: 'imperial', emblem: 'empire', homeworld: 'coruscant',
  desc: 'El poder del Lado Oscuro. Andadores devastadores, disciplina férrea y defensas formidables.',
  bonuses: [
    { text: 'Mechs de asalto +20% PV; mechs de ataque y de asalto un 10% más baratos.', mods: [{ target: { cls: ['assaultMech'] }, stat: 'hp', mul: 1.2 }, { target: { cls: ['strikeMech', 'assaultMech'] }, stat: 'cost', mul: 0.9 }] },
    { text: 'Torretas +1 de alcance y se construyen un 30% más rápido.', mods: [{ target: { buildings: ['turret', 'aa_turret'] }, stat: 'range', add: 1 }, { target: { buildings: ['turret', 'aa_turret'] }, stat: 'buildTime', mul: 0.7 }] },
    { text: 'Soldados +10% PV.', mods: [{ target: { cls: ['trooper'] }, stat: 'hp', mul: 1.1 }] },
    { text: 'Logística imperial: trabajadores +3 de carga y núcleos de energía +2 de radio.', mods: [{ target: { cls: ['worker'] }, stat: 'carry', add: 3 }, { target: { buildings: ['power_core'] }, stat: 'powerRadius', add: 2 }] },
  ],
  teamBonus: { text: 'Equipo: Fortalezas +2 de alcance.', mods: [{ target: { buildings: ['fortress'] }, stat: 'range', add: 2 }] },
  uniqueUnit: 'dark_trooper', eliteUnique: 'elite_dark_trooper', uniqueTechs: ['imp_walkers', 'imp_death_squadron'],
  heroes: ['vader', 'palpatine', 'boba_fett'], disabled: ['heavy_bomber', 'up_heavy_bomber', 'up_heavy_mounted', 'heavy_mounted', 'force_healing'],
  names: {
    worker: 'Obrero Imperial', scout: 'Moto Speeder 74-Z', trooper: 'Soldado de Asalto', heavy_trooper: 'Soldado de Asalto Pesado', repeater_trooper: 'Soldado de Asalto de Repetición',
    grenadier: 'Soldado de Demolición', heavy_grenadier: 'Soldado de Demolición Pesado', aa_trooper: 'Soldado Antiaéreo Imperial', heavy_aa_trooper: 'Soldado AA Imperial Pesado',
    mounted_trooper: 'Soldado Explorador en Moto', heavy_mounted: 'Explorador Pesado', strike_mech: 'AT-ST', heavy_strike_mech: 'AT-ST Pesado',
    mech_destroyer: 'Tanque TX-225', heavy_mech_destroyer: 'Tanque TX-225 Pesado', assault_mech: 'AT-AT', heavy_assault_mech: 'AT-AT Elite',
    pummel: 'Juggernaut HAVw', heavy_pummel: 'Juggernaut Pesado', artillery: 'Artillería SPMA-T', heavy_artillery: 'Artillería SPMA-T Pesada', aa_mobile: 'Lanzamisiles AT-AA', heavy_aa_mobile: 'AT-AA Pesado',
    fighter: 'Caza TIE', adv_fighter: 'Interceptor TIE', bomber: 'Bombardero TIE', jedi_knight: 'Inquisidor', jedi_master: 'Señor Sith', temple: 'Templo Sith', command_center: 'Centro de Mando Imperial',
  },
  models: {},
  voice: 'imperial', saber: SABER.red, monumentName: 'Palacio Imperial',
  strengths: ['Mechs pesados', 'Defensas', 'Infantería resistente'],
});

def({
  id: 'rebels', name: 'Alianza Rebelde', short: 'Rebeldes', side: 'light', style: 'rebel', emblem: 'rebel', homeworld: 'yavin4',
  desc: 'Esperanza y movilidad. Una flota aérea temible, unidades rápidas y una red de espías por toda la galaxia.',
  bonuses: [
    { text: 'Naves un 15% más baratas.', mods: [{ target: { tags: ['air'] }, stat: 'cost', mul: 0.85 }] },
    { text: 'Trabajadores +10% de velocidad.', mods: [{ target: { cls: ['worker'] }, stat: 'speed', mul: 1.1 }] },
    { text: 'Soldados se entrenan un 15% más rápido.', mods: [{ target: { cls: ['trooper'] }, stat: 'trainTime', mul: 0.85 }] },
    { text: 'Unidades montadas +1 de línea de visión y +5% de velocidad.', mods: [{ target: { tags: ['mounted'] }, stat: 'los', add: 1 }, { target: { tags: ['mounted'] }, stat: 'speed', mul: 1.05 }] },
  ],
  teamBonus: { text: 'Equipo: Bases aéreas trabajan un 15% más rápido.', mods: [{ target: { tags: ['air'] }, stat: 'trainTime', mul: 0.85 }] },
  uniqueUnit: 'airspeeder', eliteUnique: 'elite_airspeeder', uniqueTechs: ['reb_network', 'reb_guerrilla'],
  heroes: ['luke', 'han', 'leia'], disabled: ['heavy_assault_mech', 'up_heavy_assault', 'heavy_pummel', 'up_heavy_pummel'],
  names: {
    worker: 'Técnico Rebelde', scout: 'Moto Speeder Rebelde', trooper: 'Soldado Rebelde', heavy_trooper: 'Comando Rebelde', repeater_trooper: 'Comando de Endor',
    grenadier: 'Granadero Rebelde', heavy_grenadier: 'Granadero Rebelde Pesado', aa_trooper: 'Soldado AA Rebelde', heavy_aa_trooper: 'Soldado AA Rebelde Pesado',
    mounted_trooper: 'Jinete de Tauntaun', heavy_mounted: 'Jinete de Tauntaun Veterano', strike_mech: 'Speeder de Combate', heavy_strike_mech: 'Speeder de Combate Pesado',
    mech_destroyer: 'Tanque Repulsor T2-B', heavy_mech_destroyer: 'Tanque T2-B Pesado', assault_mech: 'Tanque de Asalto T3-B', heavy_assault_mech: 'T3-B Pesado',
    pummel: 'Ariete Rebelde', heavy_pummel: 'Ariete Rebelde Pesado', artillery: 'Cañón de Iones DF.9', heavy_artillery: 'DF.9 Pesado', aa_mobile: 'Lanzamisiles AA Rebelde', heavy_aa_mobile: 'Lanzamisiles AA Pesado',
    fighter: 'Ala-X T-65', adv_fighter: 'Ala-A RZ-1', bomber: 'Ala-Y BTL', heavy_bomber: 'Ala-B', jedi_knight: 'Caballero Jedi', jedi_master: 'Maestro Jedi', temple: 'Templo Massassi',
  },
  models: {},
  voice: 'rebel', saber: SABER.blue, monumentName: 'Gran Templo de Yavin',
  strengths: ['Aviación', 'Movilidad', 'Economía ágil'],
});

def({
  id: 'republic', name: 'República Galáctica', short: 'República', side: 'light', style: 'republic', emblem: 'republic', homeworld: 'coruscant',
  desc: 'El Gran Ejército de la República: legiones de clones dirigidos por generales Jedi.',
  bonuses: [
    { text: 'Soldados cuestan un 20% menos de alimento.', mods: [{ target: { cls: ['trooper'] }, stat: 'costFood', mul: 0.8 }] },
    { text: 'Caballeros y Maestros Jedi un 20% más baratos.', mods: [{ target: { cls: ['jediKnight', 'jediMaster'] }, stat: 'cost', mul: 0.8 }] },
    { text: 'Templos y fortalezas se construyen un 25% más rápido.', mods: [{ target: { buildings: ['temple', 'fortress'] }, stat: 'buildTime', mul: 0.75 }] },
    { text: 'Infantería +1 de armadura cuerpo a cuerpo y a distancia.', mods: [{ target: { cls: ['trooper', 'grenadier', 'aaTrooper'] }, stat: 'armorRanged', add: 1 }, { target: { cls: ['trooper', 'grenadier', 'aaTrooper'] }, stat: 'armorMelee', add: 1 }] },
  ],
  teamBonus: { text: 'Equipo: Usuarios de la Fuerza +2 de línea de visión.', mods: [{ target: { cls: ['jediKnight', 'jediMaster'] }, stat: 'los', add: 2 }] },
  uniqueUnit: 'arc_trooper', eliteUnique: 'elite_arc_trooper', uniqueTechs: ['rep_kamino', 'rep_jedi_generals'],
  heroes: ['yoda', 'obiwan', 'mace', 'rex'], disabled: ['heavy_mounted', 'up_heavy_mounted', 'heavy_aa_mobile', 'up_heavy_aa_mobile'],
  names: {
    worker: 'Trabajador de la República', scout: 'Clon Explorador BARC', trooper: 'Soldado Clon', heavy_trooper: 'Soldado Clon Fase II', repeater_trooper: 'Soldado Clon Pesado',
    grenadier: 'Clon de Demolición', heavy_grenadier: 'Clon de Demolición Pesado', aa_trooper: 'Clon Antiaéreo', heavy_aa_trooper: 'Clon Antiaéreo Pesado',
    mounted_trooper: 'Clon en Speeder BARC', heavy_mounted: 'Clon en BARC Pesado', strike_mech: 'AT-RT', heavy_strike_mech: 'AT-RT Pesado',
    mech_destroyer: 'Tanque TX-130', heavy_mech_destroyer: 'TX-130 Pesado', assault_mech: 'AT-TE', heavy_assault_mech: 'AT-TE Pesado',
    pummel: 'Juggernaut A6', heavy_pummel: 'Juggernaut A6 Pesado', artillery: 'SPHA-T', heavy_artillery: 'SPHA-T Pesado', aa_mobile: 'AV-7 Antiaéreo', heavy_aa_mobile: 'AV-7 Pesado',
    fighter: 'Caza ARC-170', adv_fighter: 'Caza Ala-V', bomber: 'Bombardero Ala-Y BTL-B', heavy_bomber: 'Bombardero Pesado BTL-B', jedi_knight: 'Caballero Jedi', jedi_master: 'Maestro Jedi', temple: 'Templo Jedi',
  },
  models: {},
  voice: 'clone', saber: SABER.blue, monumentName: 'Senado Galáctico',
  strengths: ['Infantería clon', 'Jedi', 'Producción rápida'],
});

def({
  id: 'cis', name: 'Confederación de Sistemas Independientes', short: 'Separatistas', side: 'dark', style: 'cis', emblem: 'cis', homeworld: 'geonosis',
  desc: 'Ejércitos droides interminables fabricados en Geonosis. Superioridad numérica y maquinaria implacable.',
  bonuses: [
    { text: 'Soldados y trabajadores droide cuestan un 20% menos de alimento.', mods: [{ target: { cls: ['trooper', 'worker'] }, stat: 'costFood', mul: 0.8 }] },
    { text: 'Mechs +10% de velocidad.', mods: [{ target: { tags: ['mech'] }, stat: 'speed', mul: 1.1 }] },
    { text: 'Fábricas de mechs trabajan un 15% más rápido.', mods: [{ target: { tags: ['mech'] }, stat: 'trainTime', mul: 0.85 }] },
    { text: 'Los droides no se cansan: trabajadores +10% de recolección de carbono, Nova y mineral.', mods: [{ target: { player: true }, stat: 'gatherCarbon', mul: 1.1 }, { target: { player: true }, stat: 'gatherNova', mul: 1.1 }, { target: { player: true }, stat: 'gatherOre', mul: 1.1 }] },
  ],
  teamBonus: { text: 'Equipo: Núcleos de energía +3 de radio.', mods: [{ target: { buildings: ['power_core'] }, stat: 'powerRadius', add: 3 }] },
  uniqueUnit: 'magnaguard', eliteUnique: 'elite_magnaguard', uniqueTechs: ['cis_foundries', 'cis_tactical'],
  heroes: ['dooku', 'ventress', 'grievous'], disabled: ['heavy_mounted', 'up_heavy_mounted', 'heavy_aa_trooper', 'up_heavy_aa_trooper', 'force_healing'],
  names: {
    worker: 'Droide Obrero', scout: 'STAP Explorador', trooper: 'Droide de Combate B1', heavy_trooper: 'Súper Droide B2', repeater_trooper: 'Súper Droide B2-RP',
    grenadier: 'Droide Granadero B2-GR', heavy_grenadier: 'Droide Granadero Pesado', aa_trooper: 'Droide Antiaéreo', heavy_aa_trooper: 'Droide AA Pesado',
    mounted_trooper: 'Droide en STAP', heavy_mounted: 'STAP Pesado', strike_mech: 'Droide Araña Enano', heavy_strike_mech: 'Droide Araña Pesado',
    mech_destroyer: 'Droide Tanque NR-N99', heavy_mech_destroyer: 'Tanque NR-N99 Pesado', assault_mech: 'Droide Granizo IG-227', heavy_assault_mech: 'Droide Octuptarra',
    pummel: 'Droide Demoledor', heavy_pummel: 'Demoledor Pesado', artillery: 'Droide Araña OG-9', heavy_artillery: 'Araña OG-9 Pesada', aa_mobile: 'Droide Antiaéreo Móvil', heavy_aa_mobile: 'Droide AA Móvil Pesado',
    fighter: 'Droide Buitre', adv_fighter: 'Droide Tri-Caza', bomber: 'Bombardero Hiena', heavy_bomber: 'Bombardero Hiena Pesado', jedi_knight: 'Acólito Oscuro', jedi_master: 'Señor Oscuro', temple: 'Templo Sith', command_center: 'Centro de Mando Separatista',
  },
  models: {},
  voice: 'droid', saber: SABER.red, monumentName: 'Arena de Petranaki',
  strengths: ['Hordas droide', 'Mechs veloces', 'Producción industrial'],
});

def({
  id: 'tradefed', name: 'Federación de Comercio', short: 'Federación', side: 'dark', style: 'tradefed', emblem: 'tradefed', homeworld: 'naboo',
  desc: 'Un imperio mercantil respaldado por ejércitos droide. Economía de hierro y droidekas imparables.',
  bonuses: [
    { text: 'Trabajadores un 15% más baratos.', mods: [{ target: { cls: ['worker'] }, stat: 'cost', mul: 0.85 }] },
    { text: 'Mechs de asalto +1/+1 de armadura.', mods: [{ target: { cls: ['assaultMech'] }, stat: 'armorMelee', add: 1 }, { target: { cls: ['assaultMech'] }, stat: 'armorRanged', add: 1 }] },
    { text: 'Recolección de mineral +15% y de Nova +5%.', mods: [{ target: { player: true }, stat: 'gatherOre', mul: 1.15 }, { target: { player: true }, stat: 'gatherNova', mul: 1.05 }] },
    { text: 'Comisión de comercio reducida a la mitad.', mods: [{ target: { player: true }, stat: 'tradeFee', mul: 0.5 }] },
  ],
  teamBonus: { text: 'Equipo: Puertos espaciales dan +5% de recolección de Nova.', mods: [{ target: { player: true }, stat: 'gatherNova', mul: 1.05 }] },
  uniqueUnit: 'droideka', eliteUnique: 'elite_droideka', uniqueTechs: ['tf_control_ship', 'tf_monopoly'],
  heroes: ['maul', 'oom9', 'aurra'], disabled: ['heavy_aa_trooper', 'up_heavy_aa_trooper', 'adv_fighter', 'up_adv_fighter', 'force_endurance'],
  names: {
    worker: 'Droide Trabajador PK', scout: 'STAP Federal', trooper: 'Droide de Combate B1', heavy_trooper: 'Droide de Seguridad OOM', repeater_trooper: 'Droide Comandante B1',
    grenadier: 'Droide de Asalto', heavy_grenadier: 'Droide de Asalto Pesado', aa_trooper: 'Droide AA', heavy_aa_trooper: 'Droide AA Pesado',
    mounted_trooper: 'Droide en STAP', heavy_mounted: 'Droide en STAP Pesado', strike_mech: 'Tanque Ligero Persuasor', heavy_strike_mech: 'Persuasor Pesado',
    mech_destroyer: 'Droide Araña DSD1', heavy_mech_destroyer: 'Araña DSD1 Pesada', assault_mech: 'Tanque AAT', heavy_assault_mech: 'AAT Pesado',
    pummel: 'MTT Ariete', heavy_pummel: 'MTT Pesado', artillery: 'Cañón Multitrópico PAC', heavy_artillery: 'PAC Pesado', aa_mobile: 'Plataforma AA Federal', heavy_aa_mobile: 'Plataforma AA Pesada',
    fighter: 'Droide Buitre', bomber: 'Bombardero Buitre', heavy_bomber: 'Bombardero Buitre Pesado', jedi_knight: 'Asesino Sith', jedi_master: 'Señor Sith', temple: 'Templo Sith',
  },
  models: {},
  voice: 'droid', saber: SABER.red, monumentName: 'Nave de Control de Droides',
  strengths: ['Economía', 'Blindaje', 'Droidekas'],
});

def({
  id: 'naboo', name: 'Naboo Real', short: 'Naboo', side: 'light', style: 'naboo', emblem: 'naboo', homeworld: 'naboo',
  desc: 'Un reino elegante de artistas e ingenieros. Cazas N-1 de élite y una economía rica en cristales.',
  bonuses: [
    { text: 'Recolección de Nova +10%.', mods: [{ target: { player: true }, stat: 'gatherNova', mul: 1.1 }] },
    { text: 'Cazas +15% PV.', mods: [{ target: { cls: ['fighter'] }, stat: 'hp', mul: 1.15 }] },
    { text: 'Edificios +10% PV.', mods: [{ target: { allBuildings: true }, stat: 'hp', mul: 1.1 }] },
    { text: 'Tecnologías un 10% más baratas.', mods: [{ target: { player: true }, stat: 'researchCost', mul: 0.9 }] },
  ],
  teamBonus: { text: 'Equipo: Maestros Jedi sanan un 50% más.', mods: [{ target: { cls: ['jediMaster'] }, stat: 'heal', mul: 1.5 }] },
  uniqueUnit: 'royal_crusader', eliteUnique: 'elite_royal_crusader', uniqueTechs: ['nab_engineering', 'nab_bravo'],
  heroes: ['quigon', 'padme', 'panaka'], disabled: ['heavy_assault_mech', 'up_heavy_assault', 'heavy_pummel', 'up_heavy_pummel', 'heavy_mech_destroyer', 'up_heavy_destroyer'],
  names: {
    worker: 'Trabajador de Naboo', scout: 'Speeder Flash', trooper: 'Guardia de Seguridad', heavy_trooper: 'Guardia Veterano', repeater_trooper: 'Guardia Real',
    grenadier: 'Granadero de Naboo', heavy_grenadier: 'Granadero de Naboo Pesado', aa_trooper: 'Guardia Antiaéreo', heavy_aa_trooper: 'Guardia AA Pesado',
    mounted_trooper: 'Guardia en Speeder Flash', heavy_mounted: 'Speeder Flash Pesado', strike_mech: 'Speeder Gian', heavy_strike_mech: 'Speeder Gian Pesado',
    mech_destroyer: 'Tanque Gian', heavy_mech_destroyer: 'Tanque Gian Pesado', assault_mech: 'Tanque de Asalto Real', heavy_assault_mech: 'Tanque Real Pesado',
    pummel: 'Ariete Real', artillery: 'Cañón Real', heavy_artillery: 'Cañón Real Pesado', aa_mobile: 'Batería AA Real', heavy_aa_mobile: 'Batería AA Pesada',
    fighter: 'Caza Estelar N-1', adv_fighter: 'Caza N-1 Real', bomber: 'Bombardero de Naboo', heavy_bomber: 'Bombardero Real Pesado', jedi_knight: 'Caballero Jedi', jedi_master: 'Maestro Jedi', temple: 'Santuario Jedi',
  },
  models: {},
  voice: 'naboo', saber: SABER.green, monumentName: 'Palacio de Theed',
  strengths: ['Cazas', 'Nova', 'Edificios robustos'],
});

def({
  id: 'gungans', name: 'República Gungan', short: 'Gungans', side: 'light', style: 'gungan', emblem: 'gungan', homeworld: 'naboo',
  desc: 'El Gran Ejército Gungan. Escudos de energía, catapultas de boomas y bestias de guerra. No tienen aviación propia.',
  bonuses: [
    { text: 'Generadores de escudo un 40% más baratos.', mods: [{ target: { buildings: ['shield_gen'] }, stat: 'cost', mul: 0.6 }] },
    { text: 'Recolección de frutos y caza +20%.', mods: [{ target: { player: true }, stat: 'gatherForage', mul: 1.2 }, { target: { player: true }, stat: 'gatherHunt', mul: 1.2 }] },
    { text: 'Infantería +1 de armadura cuerpo a cuerpo.', mods: [{ target: { tags: ['infantry'] }, stat: 'armorMelee', add: 1 }] },
    { text: 'Antiaéreos +25% PV y +2 de alcance.', mods: [{ target: { cls: ['aaTrooper', 'aaMobile'] }, stat: 'hp', mul: 1.25 }, { target: { cls: ['aaTrooper', 'aaMobile'] }, stat: 'range', add: 2 }, { target: { buildings: ['aa_turret'] }, stat: 'range', add: 2 }] },
  ],
  teamBonus: { text: 'Equipo: Granjas +10% de alimento.', mods: [{ target: { player: true }, stat: 'gatherFarm', mul: 1.1 }] },
  uniqueUnit: 'fambaa', eliteUnique: 'elite_fambaa', uniqueTechs: ['gun_shields', 'gun_boomas'],
  heroes: ['boss_nass', 'jarjar', 'tarpals'], disabled: ['airbase', 'fighter', 'adv_fighter', 'bomber', 'heavy_bomber', 'up_adv_fighter', 'up_heavy_bomber', 'afterburners', 'deflector_shields'],
  names: {
    worker: 'Trabajador Gungan', scout: 'Kaadu Explorador', trooper: 'Guerrero Gungan', heavy_trooper: 'Guerrero Gungan Veterano', repeater_trooper: 'Guerrero Gungan de Élite',
    grenadier: 'Lanzador de Boomas', heavy_grenadier: 'Lanzador de Boomas Pesado', aa_trooper: 'Lanzador AA Gungan', heavy_aa_trooper: 'Lanzador AA Gungan Pesado',
    mounted_trooper: 'Caballería Kaadu', heavy_mounted: 'Caballería Kaadu Pesada', strike_mech: 'Kaadu de Asalto', heavy_strike_mech: 'Kaadu de Asalto Pesado',
    mech_destroyer: 'Falumpaset con Cañón', heavy_mech_destroyer: 'Falumpaset Pesado', assault_mech: 'Falumpaset de Guerra', heavy_assault_mech: 'Falumpaset Acorazado',
    pummel: 'Ariete Gungan', heavy_pummel: 'Ariete Gungan Pesado', artillery: 'Catapulta de Boomas', heavy_artillery: 'Catapulta Pesada', aa_mobile: 'Falumpaset AA', heavy_aa_mobile: 'Falumpaset AA Pesado',
    jedi_knight: 'Caballero Jedi', jedi_master: 'Maestro Jedi', temple: 'Templo Sagrado', command_center: 'Burbuja de Mando Gungan',
  },
  models: {},
  voice: 'gungan', saber: SABER.green, monumentName: 'Otoh Gunga',
  strengths: ['Escudos', 'Bestias', 'Antiaéreo', 'Sin aviación'],
});

def({
  id: 'wookiees', name: 'Wookiees', short: 'Wookiees', side: 'light', style: 'wookiee', emblem: 'wookiee', homeworld: 'kashyyyk',
  desc: 'Guerreros indomables de Kashyyyk. Fuerza descomunal, regeneración y maestría con la madera de wroshyr.',
  bonuses: [
    { text: 'Toda la infantería +15% PV.', mods: [{ target: { tags: ['infantry'] }, stat: 'hp', mul: 1.15 }] },
    { text: 'Extracción de carbono +15%.', mods: [{ target: { player: true }, stat: 'gatherCarbon', mul: 1.15 }] },
    { text: 'Trabajadores +10 PV y +1 de daño.', mods: [{ target: { cls: ['worker'] }, stat: 'hp', add: 10 }, { target: { cls: ['worker'] }, stat: 'damage', add: 1 }] },
    { text: 'Edificios se construyen un 15% más rápido.', mods: [{ target: { allBuildings: true }, stat: 'buildTime', mul: 0.85 }] },
  ],
  teamBonus: { text: 'Equipo: Infantería se regenera 0,3 PV/s.', mods: [{ target: { tags: ['infantry'] }, stat: 'regen', add: 0.3 }] },
  uniqueUnit: 'berserker', eliteUnique: 'elite_berserker', uniqueTechs: ['wook_regen', 'wook_bowcasters'],
  heroes: ['chewbacca', 'tarfful', 'gungi'], disabled: ['heavy_assault_mech', 'up_heavy_assault', 'heavy_aa_mobile', 'up_heavy_aa_mobile', 'heavy_artillery', 'up_heavy_artillery'],
  names: {
    worker: 'Trabajador Wookiee', scout: 'Explorador Wookiee', trooper: 'Guerrero Wookiee', heavy_trooper: 'Guerrero Wookiee Veterano', repeater_trooper: 'Guerrero Wookiee de Élite',
    grenadier: 'Granadero Wookiee', heavy_grenadier: 'Granadero Wookiee Pesado', aa_trooper: 'Lanzador AA Wookiee', heavy_aa_trooper: 'Lanzador AA Wookiee Pesado',
    mounted_trooper: 'Jinete de Varactyl', heavy_mounted: 'Jinete de Varactyl Veterano', strike_mech: 'Andador Wookiee', heavy_strike_mech: 'Andador Wookiee Pesado',
    mech_destroyer: 'Cañón Rodante Wookiee', heavy_mech_destroyer: 'Cañón Rodante Pesado', assault_mech: 'Tanque Wookiee', heavy_assault_mech: 'Tanque Wookiee Pesado',
    pummel: 'Ariete de Wroshyr', heavy_pummel: 'Ariete de Wroshyr Pesado', artillery: 'Catapulta Wookiee', aa_mobile: 'Lanzador AA de Kashyyyk',
    fighter: 'Catamarán Oevvaor', adv_fighter: 'Catamarán de Élite', bomber: 'Planeador Bombardero', heavy_bomber: 'Planeador Pesado', jedi_knight: 'Caballero Jedi', jedi_master: 'Maestro Jedi', temple: 'Árbol Sagrado',
  },
  models: {},
  voice: 'wookiee', saber: SABER.green, monumentName: 'Gran Árbol de Kachirho',
  strengths: ['Infantería fuerte', 'Carbono', 'Regeneración'],
});

export const CIVS = C;
export const CIV_LIST = Object.values(C);

export function civDef(id: string): CivDef {
  const d = C[id];
  if (!d) throw new Error('Civilización desconocida: ' + id);
  return d;
}
