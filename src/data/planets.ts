import type { PlanetDef } from './types';

const P: Record<string, PlanetDef> = {};
function def(p: PlanetDef) {
  P[p.id] = p;
}

def({
  id: 'tatooine', name: 'Tatooine', biome: 'desert', music: 'heroic',
  desc: 'Planeta desértico de soles gemelos en el Borde Exterior. Dunas, mesetas rocosas, banthas y peligros en cada cañón.',
  sky: { top: 0x6fa8dc, bottom: 0xf4d9a6, fog: 0xe8cfa0, fogDensity: 0.0045, sun: 0xfff1d6, sunIntensity: 3.0, ambient: 0.55, hemiGround: 0xc9a16a },
  terrain: { base: 0xd9b27a, alt: 0xc79a5e, high: 0xb8875a, low: 0xe6c48e, cliff: 0x9a6a44, path: 0xceb085 },
  heightAmp: 2.6, heightScale: 0.035, cliffs: 0.35,
  forest: { density: 0.25, clusters: 5, tree: 'scrap', tree2: 'dead_tree', color: 0x8a6a4a, color2: 0x6b5644 },
  animals: ['bantha', 'dewback'], decor: ['rock', 'vaporator', 'bones', 'rock'], landmarks: ['sandcrawler', 'sarlacc', 'mos_hut'],
  dust: true, sunAngle: 0.9,
});
def({
  id: 'hoth', name: 'Hoth', biome: 'ice', music: 'war',
  desc: 'Mundo helado del sistema Hoth. Llanuras de nieve, glaciares y cuevas de wampas. Escenario de la célebre batalla.',
  sky: { top: 0x9db8d4, bottom: 0xe6eef6, fog: 0xdfe8f2, fogDensity: 0.006, sun: 0xeaf2ff, sunIntensity: 2.4, ambient: 0.75, hemiGround: 0xbdcfe0 },
  terrain: { base: 0xeef3f8, alt: 0xd8e2ee, high: 0xffffff, low: 0xc3d3e6, cliff: 0x8fa6c0, path: 0xd0dbe8 },
  water: { color: 0x9fc4e0, level: -0.6, kind: 'ice', amount: 0.08 },
  heightAmp: 3.2, heightScale: 0.03, cliffs: 0.45,
  forest: { density: 0.35, clusters: 6, tree: 'ice_spire', tree2: 'frozen_fungus', color: 0xa8c8e8, color2: 0x7ea2c8 },
  animals: ['tauntaun', 'tauntaun', 'wampa'], decor: ['ice_rock', 'snow_mound', 'ice_rock'], landmarks: ['echo_base', 'shield_dish', 'ion_cannon'],
  snow: true, sunAngle: 0.6,
});
def({
  id: 'endor', name: 'Endor (Luna Boscosa)', biome: 'forest', music: 'mystic',
  desc: 'Luna cubierta de secuoyas gigantes. Aldeas ewok en los árboles y la sombra del generador de escudo imperial.',
  sky: { top: 0x5f8fbf, bottom: 0xbfd8c8, fog: 0x8fae96, fogDensity: 0.008, sun: 0xffe9c4, sunIntensity: 2.2, ambient: 0.5, hemiGround: 0x3a5a2a },
  terrain: { base: 0x4f7a32, alt: 0x5d6b2c, high: 0x6f8a3c, low: 0x3e5e28, cliff: 0x5a4a36, path: 0x6b5a3e },
  water: { color: 0x2f5a5a, level: -0.8, kind: 'water', amount: 0.05, rivers: 1 },
  heightAmp: 2.4, heightScale: 0.045, cliffs: 0.2,
  forest: { density: 0.75, clusters: 14, tree: 'redwood', tree2: 'fern_tree', color: 0x2e5a22, color2: 0x3f6e2a },
  animals: ['boarwolf', 'nerf'], decor: ['fern', 'log', 'rock', 'fern'], landmarks: ['ewok_village', 'bunker', 'shield_generator'],
  sunAngle: 0.8,
});
def({
  id: 'naboo', name: 'Naboo', biome: 'grassland', music: 'heroic',
  desc: 'Mundo idílico de praderas onduladas, lagos y ciudades de arquitectura clásica. Hogar de humanos y gungans.',
  sky: { top: 0x4a8fe0, bottom: 0xcfe6ff, fog: 0xbcd6ee, fogDensity: 0.0045, sun: 0xfff3d6, sunIntensity: 2.8, ambient: 0.6, hemiGround: 0x5a8a3a },
  terrain: { base: 0x6fae3e, alt: 0x87bf4a, high: 0x9ccc5a, low: 0x5a9a34, cliff: 0x8a8070, path: 0xc8b48a },
  water: { color: 0x2a7ab8, level: -0.6, kind: 'water', amount: 0.14, rivers: 2 },
  heightAmp: 3.0, heightScale: 0.03, cliffs: 0.15,
  forest: { density: 0.45, clusters: 9, tree: 'naboo_tree', tree2: 'round_tree', color: 0x4f8f2e, color2: 0x6aa83a },
  animals: ['shaak', 'shaak', 'kaadu'], decor: ['flowers', 'rock', 'column', 'flowers'], landmarks: ['theed_ruins', 'waterfall_rock', 'gungan_statue'],
  sunAngle: 1.0,
});
def({
  id: 'geonosis', name: 'Geonosis', biome: 'redrock', music: 'war',
  desc: 'Planeta rocoso de anillos rojizos, fundiciones de droides y colmenas en espiral. Donde comenzaron las Guerras Clon.',
  sky: { top: 0xb06a4a, bottom: 0xf0b07a, fog: 0xd48a5a, fogDensity: 0.006, sun: 0xffd0a0, sunIntensity: 2.8, ambient: 0.5, hemiGround: 0x8a4a2a },
  terrain: { base: 0xb9673f, alt: 0xa65532, high: 0xc97a4a, low: 0x8f4628, cliff: 0x6e3a24, path: 0xc88a5a },
  heightAmp: 3.4, heightScale: 0.04, cliffs: 0.5,
  forest: { density: 0.3, clusters: 6, tree: 'rock_spire', tree2: 'geo_fungus', color: 0x9a5a3a, color2: 0x7a4a34 },
  animals: ['nexu', 'acklay', 'happabore'], decor: ['rock', 'spire_small', 'rock'], landmarks: ['droid_foundry', 'hive_spire', 'arena'],
  dust: true, sunAngle: 0.7,
});
def({
  id: 'kashyyyk', name: 'Kashyyyk', biome: 'jungle', music: 'heroic',
  desc: 'Mundo natal wookiee de árboles wroshyr colosales, playas y lagos. Selva densa ideal para emboscadas.',
  sky: { top: 0x6aa0c8, bottom: 0xd8e8d0, fog: 0xa8c4a0, fogDensity: 0.007, sun: 0xfff0d0, sunIntensity: 2.5, ambient: 0.55, hemiGround: 0x3a6a2a },
  terrain: { base: 0x5a8a34, alt: 0x4a7a2c, high: 0x7a9a46, low: 0xc8b88a, cliff: 0x6a5a40, path: 0x8a7a54 },
  water: { color: 0x2a6a7a, level: -0.5, kind: 'water', amount: 0.16, rivers: 1 },
  heightAmp: 2.8, heightScale: 0.035, cliffs: 0.25,
  forest: { density: 0.7, clusters: 12, tree: 'wroshyr', tree2: 'jungle_palm', color: 0x3a7a2a, color2: 0x4e8a30 },
  animals: ['thranta', 'nerf'], decor: ['fern', 'rock', 'log', 'fern'], landmarks: ['wookiee_village', 'kachirho_tree', 'catamaran_dock'],
  rain: true, sunAngle: 0.85,
});
def({
  id: 'mustafar', name: 'Mustafar', biome: 'volcanic', music: 'dark',
  desc: 'Mundo volcánico de ríos de lava y cielos de ceniza. Pasos estrechos y puentes naturales: cada cuello de botella cuenta.',
  sky: { top: 0x2a0e0a, bottom: 0x8a2a10, fog: 0x4a1a10, fogDensity: 0.009, sun: 0xff9050, sunIntensity: 1.8, ambient: 0.35, hemiGround: 0x5a1a0a },
  terrain: { base: 0x3a302c, alt: 0x2a2220, high: 0x4a3c34, low: 0x5a2a1a, cliff: 0x1e1816, path: 0x5a4a40 },
  water: { color: 0xff5a10, level: -0.5, kind: 'lava', amount: 0.18, rivers: 2 },
  heightAmp: 3.2, heightScale: 0.04, cliffs: 0.45,
  forest: { density: 0.3, clusters: 6, tree: 'obsidian', tree2: 'dead_tree', color: 0x1a1414, color2: 0x2a201c },
  animals: ['nexu'], decor: ['obsidian_rock', 'vent', 'rock'], landmarks: ['mining_facility', 'lava_collector', 'sith_spire'],
  ash: true, sunAngle: 0.5,
});
def({
  id: 'yavin4', name: 'Yavin 4', biome: 'jungle', music: 'heroic',
  desc: 'Luna selvática con antiguos templos massassi. Base secreta de la Alianza Rebelde antes de destruir la Estrella de la Muerte.',
  sky: { top: 0x4a8ab0, bottom: 0xe0d8b8, fog: 0xb0bea0, fogDensity: 0.006, sun: 0xffe8c0, sunIntensity: 2.6, ambient: 0.55, hemiGround: 0x3a5a2a },
  terrain: { base: 0x4a7a2a, alt: 0x5a8a30, high: 0x6a8a3a, low: 0x3a6a26, cliff: 0x6a6050, path: 0x7a6a4a },
  water: { color: 0x2a5a4a, level: -0.7, kind: 'water', amount: 0.08, rivers: 1 },
  heightAmp: 2.2, heightScale: 0.04, cliffs: 0.15,
  forest: { density: 0.65, clusters: 12, tree: 'jungle_palm', tree2: 'round_tree', color: 0x2f6a26, color2: 0x4a8030 },
  animals: ['thranta', 'nerf'], decor: ['fern', 'ruin_block', 'rock', 'fern'], landmarks: ['massassi_temple', 'ruin_pyramid', 'rebel_hangar'],
  sunAngle: 0.9,
});
def({
  id: 'dagobah', name: 'Dagobah', biome: 'swamp', music: 'mystic',
  desc: 'Pantano neblinoso fuerte en la Fuerza. Aguas poco profundas, árboles gnarltree y criaturas acechantes.',
  sky: { top: 0x4a5a4a, bottom: 0x9aa890, fog: 0x7a8a72, fogDensity: 0.014, sun: 0xd8e0c0, sunIntensity: 1.6, ambient: 0.55, hemiGround: 0x2a3a24 },
  terrain: { base: 0x4a5a30, alt: 0x3a4a28, high: 0x5a6a3a, low: 0x34402a, cliff: 0x3a3428, path: 0x5a5038 },
  water: { color: 0x3a4a30, level: -0.3, kind: 'swamp', amount: 0.24, rivers: 0 },
  heightAmp: 1.6, heightScale: 0.05, cliffs: 0.05,
  forest: { density: 0.6, clusters: 12, tree: 'gnarltree', tree2: 'swamp_tree', color: 0x3a4a2a, color2: 0x4a5430 },
  animals: ['nerf', 'boarwolf'], decor: ['fern', 'swamp_root', 'log'], landmarks: ['yoda_hut', 'dark_cave', 'xwing_wreck'],
  sunAngle: 0.7,
});
def({
  id: 'coruscant', name: 'Coruscant (Distrito Industrial)', biome: 'urban', music: 'war',
  desc: 'Ecumenópolis capital de la galaxia. Plataformas de duracero, ruinas industriales y chatarra como fuente de carbono.',
  sky: { top: 0x2a3a6a, bottom: 0xe8a070, fog: 0x8a7a8a, fogDensity: 0.006, sun: 0xffc890, sunIntensity: 2.2, ambient: 0.55, hemiGround: 0x3a3a4a },
  terrain: { base: 0x6a6e74, alt: 0x5a5e64, high: 0x7a7e84, low: 0x4a4e54, cliff: 0x3a3c40, path: 0x8a8a8a },
  heightAmp: 1.4, heightScale: 0.025, cliffs: 0.3,
  forest: { density: 0.35, clusters: 8, tree: 'scrap_pile', tree2: 'pipe_cluster', color: 0x5a5048, color2: 0x6a6058 },
  animals: ['lothcat'], decor: ['crate', 'antenna', 'vent'], landmarks: ['skyscraper', 'landing_pad', 'senate_dome'],
  stars: false, sunAngle: 0.45,
});
def({
  id: 'jakku', name: 'Jakku', biome: 'desert', music: 'mystic',
  desc: 'Cementerio de naves estelares. Restos de destructores imperiales semienterrados en la arena: chatarra en abundancia.',
  sky: { top: 0x7aa0c8, bottom: 0xf0d8b0, fog: 0xe8d0a8, fogDensity: 0.0045, sun: 0xfff0d0, sunIntensity: 3.0, ambient: 0.55, hemiGround: 0xc8a070 },
  terrain: { base: 0xe0bc88, alt: 0xd0a874, high: 0xe8c898, low: 0xc89a68, cliff: 0xa07850, path: 0xd8b888 },
  heightAmp: 2.8, heightScale: 0.025, cliffs: 0.2,
  forest: { density: 0.3, clusters: 6, tree: 'scrap', tree2: 'scrap_pile', color: 0x8a8a8a, color2: 0x6a6a6a },
  animals: ['happabore'], decor: ['rock', 'scrap_small', 'bones'], landmarks: ['star_destroyer_wreck', 'atat_wreck', 'niima_outpost'],
  dust: true, sunAngle: 1.0,
});
def({
  id: 'scarif', name: 'Scarif', biome: 'tropical', music: 'war',
  desc: 'Paraíso tropical de islas y lagunas turquesa, sede de la ciudadela imperial de archivos.',
  sky: { top: 0x3a90e0, bottom: 0xd8f0ff, fog: 0xbfe2f0, fogDensity: 0.0035, sun: 0xfff6e0, sunIntensity: 3.0, ambient: 0.65, hemiGround: 0x6aa080 },
  terrain: { base: 0x6ab04a, alt: 0xe8dcb0, high: 0x7ac05a, low: 0xf0e6c0, cliff: 0x8a8070, path: 0xd8cca0 },
  water: { color: 0x1ab8c8, level: -0.4, kind: 'water', amount: 0.3, rivers: 0 },
  heightAmp: 2.0, heightScale: 0.035, cliffs: 0.1,
  forest: { density: 0.45, clusters: 10, tree: 'palm', tree2: 'jungle_palm', color: 0x3a9a3a, color2: 0x5aaa4a },
  animals: ['nerf', 'thranta'], decor: ['rock', 'shell', 'flowers'], landmarks: ['citadel_tower', 'landing_pad', 'bunker'],
  sunAngle: 1.1,
});
def({
  id: 'lothal', name: 'Lothal', biome: 'plains', music: 'heroic',
  desc: 'Praderas doradas salpicadas de agujas de roca. Tierra natal de rebeldes y gatos de Loth.',
  sky: { top: 0x5a98d8, bottom: 0xf0e0c0, fog: 0xd8d0b0, fogDensity: 0.0045, sun: 0xffeccc, sunIntensity: 2.8, ambient: 0.6, hemiGround: 0x9a9a5a },
  terrain: { base: 0xa8a85a, alt: 0x8fa04a, high: 0xbab06a, low: 0x7a9040, cliff: 0x8a7a6a, path: 0xc0b080 },
  water: { color: 0x3a7aa8, level: -0.6, kind: 'water', amount: 0.06, rivers: 1 },
  heightAmp: 2.0, heightScale: 0.03, cliffs: 0.3,
  forest: { density: 0.35, clusters: 8, tree: 'round_tree', tree2: 'rock_spire', color: 0x5a7a2e, color2: 0x7a8a3a },
  animals: ['lothcat', 'nerf'], decor: ['rock', 'spire_small', 'flowers'], landmarks: ['imperial_factory', 'jedi_ruin', 'farm_dome'],
  sunAngle: 0.9,
});
def({
  id: 'felucia', name: 'Felucia', biome: 'fungal', music: 'mystic',
  desc: 'Mundo de hongos gigantes y flora bioluminiscente. Exótico, húmedo y peligroso.',
  sky: { top: 0x6a8a5a, bottom: 0xe0e8a0, fog: 0xb0c888, fogDensity: 0.009, sun: 0xfff0b0, sunIntensity: 2.2, ambient: 0.6, hemiGround: 0x6a7a3a },
  terrain: { base: 0x7a9a3a, alt: 0xa0a040, high: 0x8aba4a, low: 0x5a7a34, cliff: 0x5a5a3a, path: 0x9a8a5a },
  water: { color: 0x5aa86a, level: -0.5, kind: 'acid', amount: 0.08 },
  heightAmp: 2.4, heightScale: 0.04, cliffs: 0.2,
  forest: { density: 0.6, clusters: 11, tree: 'mushroom', tree2: 'tube_plant', color: 0xd8604a, color2: 0xe8a040 },
  animals: ['nerf', 'acklay'], decor: ['glow_plant', 'fern', 'glow_plant'], landmarks: ['sarlacc', 'jedi_ruin', 'giant_flower'],
  sunAngle: 0.8,
});
def({
  id: 'crait', name: 'Crait', biome: 'salt', music: 'war',
  desc: 'Llanuras de sal blanca sobre suelo rojo carmesí. Cada paso deja una estela roja.',
  sky: { top: 0x8aa0c0, bottom: 0xf0e8e8, fog: 0xe8e0e0, fogDensity: 0.0045, sun: 0xffffff, sunIntensity: 2.6, ambient: 0.7, hemiGround: 0xc04030 },
  terrain: { base: 0xf2eeea, alt: 0xe4dcd8, high: 0xffffff, low: 0xc8402a, cliff: 0xa03a2a, path: 0xd04030 },
  heightAmp: 2.2, heightScale: 0.03, cliffs: 0.4,
  forest: { density: 0.25, clusters: 6, tree: 'salt_crystal', tree2: 'ice_spire', color: 0xe0e8f0, color2: 0xc8d0e0 },
  animals: ['lothcat'], decor: ['ice_rock', 'rock'], landmarks: ['rebel_bunker_door', 'shield_dish', 'trench'],
  sunAngle: 0.7,
});

export const PLANETS = P;
export const PLANET_LIST = Object.values(P);
export function planetDef(id: string): PlanetDef {
  return P[id] ?? P['tatooine'];
}
