// Conquista Galáctica: campaña por turnos sobre el mapa de la galaxia.
// Las batallas se libran en tiempo real (RTS) o se resuelven automáticamente.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { h, clear } from '../ui/dom';
import { CIV_LIST, CIVS, PLAYER_COLORS } from '../data/civs';
import { PLANETS } from '../data/planets';
import { UNITS } from '../data/units';
import type { GameSetup } from '../sim/types';
import type { Era } from '../data/types';
import { settings } from '../ui/settings';
import { audio } from '../audio/audio';
import { Noise2D } from '../core/noise';
import { glowSprite } from '../render/textures';
import { RNG } from '../core/rng';

interface GPlanet {
  id: string; // id de PlanetDef (mapa de batalla)
  name: string;
  x: number;
  y: number;
  income: number;
  bonus: string;
  bonusRes?: Partial<Record<'food' | 'carbon' | 'nova' | 'ore', number>>;
  links: string[];
}

interface Faction {
  id: number; // índice
  civ: string;
  name: string;
  color: number;
  human: boolean;
  credits: number;
  capital: string;
  alive: boolean;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
}

interface Fleet {
  id: number;
  owner: number;
  at: string;
  strength: number;
  moved: boolean;
}

interface Campaign {
  turn: number;
  factions: Faction[];
  owner: Record<string, number>; // planeta -> facción (-1 neutral)
  defense: Record<string, number>;
  fleets: Fleet[];
  nextFleet: number;
  log: string[];
  pending: { planet: string; attacker: number; fleetId: number }[];
  over: boolean;
  winner: number;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
}

const GALAXY: GPlanet[] = [
  { id: 'coruscant', name: 'Coruscant', x: 0, y: 0, income: 220, bonus: '+120 de créditos por turno (capital galáctica).', links: ['naboo', 'kashyyyk', 'lothal', 'scarif'] },
  { id: 'kashyyyk', name: 'Kashyyyk', x: -3.2, y: -2.2, income: 140, bonus: 'Batallas con +300 de carbono.', bonusRes: { carbon: 300 }, links: ['coruscant', 'felucia', 'yavin4', 'lothal'] },
  { id: 'naboo', name: 'Naboo', x: 3.0, y: 2.4, income: 150, bonus: 'Batallas con +250 de Nova.', bonusRes: { nova: 250 }, links: ['coruscant', 'tatooine', 'geonosis', 'scarif'] },
  { id: 'lothal', name: 'Lothal', x: -1.6, y: 3.2, income: 120, bonus: 'Batallas con +250 de alimento.', bonusRes: { food: 250 }, links: ['coruscant', 'kashyyyk', 'mustafar', 'crait'] },
  { id: 'scarif', name: 'Scarif', x: 3.4, y: -2.6, income: 130, bonus: 'Batallas con +200 de mineral.', bonusRes: { ore: 200 }, links: ['coruscant', 'naboo', 'hoth', 'endor'] },
  { id: 'tatooine', name: 'Tatooine', x: 6.4, y: 3.6, income: 110, bonus: 'Batallas con +150 de alimento y +150 de Nova.', bonusRes: { food: 150, nova: 150 }, links: ['naboo', 'geonosis', 'jakku'] },
  { id: 'geonosis', name: 'Geonosis', x: 5.0, y: 6.2, income: 120, bonus: 'Batallas con +300 de mineral.', bonusRes: { ore: 300 }, links: ['naboo', 'tatooine', 'mustafar'] },
  { id: 'jakku', name: 'Jakku', x: 9.0, y: 1.2, income: 90, bonus: 'Chatarra: batallas con +300 de carbono.', bonusRes: { carbon: 300 }, links: ['tatooine', 'endor'] },
  { id: 'endor', name: 'Endor', x: 7.6, y: -3.4, income: 110, bonus: 'Batallas con +200 de alimento.', bonusRes: { food: 200 }, links: ['scarif', 'jakku', 'hoth'] },
  { id: 'hoth', name: 'Hoth', x: 4.6, y: -6.0, income: 90, bonus: 'Batallas con +200 de Nova.', bonusRes: { nova: 200 }, links: ['scarif', 'endor', 'dagobah'] },
  { id: 'dagobah', name: 'Dagobah', x: 0.2, y: -6.4, income: 80, bonus: 'Lugar fuerte en la Fuerza: +300 de Nova.', bonusRes: { nova: 300 }, links: ['hoth', 'yavin4'] },
  { id: 'yavin4', name: 'Yavin 4', x: -4.0, y: -5.6, income: 110, bonus: 'Batallas con +200 de carbono y alimento.', bonusRes: { carbon: 200, food: 200 }, links: ['dagobah', 'kashyyyk', 'felucia'] },
  { id: 'felucia', name: 'Felucia', x: -7.0, y: -1.6, income: 110, bonus: 'Batallas con +300 de alimento.', bonusRes: { food: 300 }, links: ['kashyyyk', 'yavin4', 'crait'] },
  { id: 'crait', name: 'Crait', x: -6.2, y: 3.8, income: 100, bonus: 'Batallas con +250 de mineral.', bonusRes: { ore: 250 }, links: ['felucia', 'lothal', 'mustafar'] },
  { id: 'mustafar', name: 'Mustafar', x: 0.8, y: 6.8, income: 120, bonus: 'Batallas con +300 de mineral.', bonusRes: { ore: 300 }, links: ['lothal', 'geonosis', 'crait'] },
];
const GP: Record<string, GPlanet> = Object.fromEntries(GALAXY.map((p) => [p.id, p]));

const RECRUIT_COST = 160;
const FORTIFY_COST = 220;
const SAVE_KEY = 'swage.campaign';

let campaign: Campaign | null = null;

function save() {
  try {
    if (campaign) localStorage.setItem(SAVE_KEY, JSON.stringify(campaign));
  } catch {
    /* */
  }
}
function load(): Campaign | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* */
  }
  return null;
}

function newCampaign(civ: string, opponents: number, difficulty: Campaign['difficulty']): Campaign {
  const rng = new RNG(Date.now() & 0xffffff);
  const civs = [civ, ...rng.shuffle(CIV_LIST.map((c) => c.id).filter((c) => c !== civ)).slice(0, opponents)];
  // capitales: planeta natal si está libre, si no uno alejado
  const taken = new Set<string>();
  const factions: Faction[] = civs.map((c, i) => {
    let cap = CIVS[c].homeworld;
    if (taken.has(cap) || !GP[cap]) {
      const free = GALAXY.filter((p) => !taken.has(p.id)).sort((a, b) => distFromTaken(b, taken) - distFromTaken(a, taken));
      cap = free[0].id;
    }
    taken.add(cap);
    return { id: i, civ: c, name: CIVS[c].name, color: i, human: i === 0, credits: 400, capital: cap, alive: true, difficulty };
  });
  const owner: Record<string, number> = {};
  const defense: Record<string, number> = {};
  for (const p of GALAXY) {
    owner[p.id] = -1;
    defense[p.id] = 1;
  }
  const fleets: Fleet[] = [];
  let nf = 1;
  for (const f of factions) {
    owner[f.capital] = f.id;
    defense[f.capital] = 2;
    fleets.push({ id: nf++, owner: f.id, at: f.capital, strength: 2, moved: false });
  }
  // un planeta adyacente libre para cada facción
  for (const f of factions) {
    const adj = GP[f.capital].links.find((l) => owner[l] === -1);
    if (adj) owner[adj] = f.id;
  }
  return { turn: 1, factions, owner, defense, fleets, nextFleet: nf, log: ['Comienza la Conquista Galáctica.'], pending: [], over: false, winner: -1, difficulty };
}

function distFromTaken(p: GPlanet, taken: Set<string>): number {
  if (!taken.size) return Math.random();
  let d = Infinity;
  for (const t of taken) d = Math.min(d, Math.hypot(GP[t].x - p.x, GP[t].y - p.y));
  return d;
}

function eraForTurn(turn: number): Era {
  return Math.min(4, 1 + Math.floor((turn - 1) / 4)) as Era;
}

function fleetUnits(civ: string, strength: number, era: Era): { id: string; count: number }[] {
  const c = CIVS[civ];
  const out: { id: string; count: number }[] = [];
  const add = (id: string, n: number) => {
    if (c.disabled.includes(id) || n <= 0) return;
    out.push({ id, count: n });
  };
  add('trooper', 2 + strength * 2);
  if (era >= 2) {
    add('strike_mech', Math.ceil(strength * 0.8));
    add('grenadier', Math.ceil(strength * 0.6));
  }
  if (era >= 3) {
    add('assault_mech', Math.floor(strength * 0.5));
    add(c.uniqueUnit, Math.ceil(strength * 0.6));
    add('jedi_knight', Math.floor(strength * 0.3));
  }
  if (era >= 4) add('artillery', Math.floor(strength * 0.3));
  return out;
}

// ─────────────────────────── IA estratégica ───────────────────────────
function aiTurn(c: Campaign, f: Faction) {
  const rng = Math.random;
  // reclutar
  const myPlanets = GALAXY.filter((p) => c.owner[p.id] === f.id);
  const frontier = myPlanets.filter((p) => p.links.some((l) => c.owner[l] !== f.id));
  let guard = 0;
  while (f.credits >= RECRUIT_COST && guard++ < 6) {
    const target = frontier.length ? frontier[Math.floor(rng() * frontier.length)] : myPlanets[0];
    if (!target) break;
    let fl = c.fleets.find((x) => x.owner === f.id && x.at === target.id);
    if (!fl) {
      fl = { id: c.nextFleet++, owner: f.id, at: target.id, strength: 0, moved: false };
      c.fleets.push(fl);
    }
    fl.strength++;
    f.credits -= RECRUIT_COST;
    if (rng() < 0.25 && f.credits >= FORTIFY_COST) {
      c.defense[target.id] = Math.min(5, c.defense[target.id] + 1);
      f.credits -= FORTIFY_COST;
    }
  }
  // mover / atacar
  const aggr = f.difficulty === 'easy' ? 1.6 : f.difficulty === 'normal' ? 1.25 : f.difficulty === 'hard' ? 1.0 : 0.85;
  for (const fl of c.fleets.filter((x) => x.owner === f.id && !x.moved && x.strength > 0)) {
    const here = GP[fl.at];
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const l of here.links) {
      const o = c.owner[l];
      if (o === f.id) continue;
      const defStr = c.defense[l] + c.fleets.filter((x) => x.at === l && x.owner === o).reduce((a, x) => a + x.strength, 0);
      if (fl.strength < defStr * aggr) continue;
      const score = GP[l].income / 50 + (o === -1 ? 2 : 0) + (c.factions[o]?.capital === l ? 3 : 0) + (o >= 0 && c.factions[o].human ? 0.5 : 0) - defStr;
      if (score > bestScore) {
        bestScore = score;
        best = l;
      }
    }
    if (best && (c.owner[best] === -1 || rng() < 0.85)) {
      fl.at = best;
      fl.moved = true;
      c.pending.push({ planet: best, attacker: f.id, fleetId: fl.id });
    }
  }
}

function autoResolve(c: Campaign, planet: string, attacker: number, fleet: Fleet): boolean {
  const def = c.owner[planet];
  const defFleets = c.fleets.filter((x) => x.at === planet && x.owner === def && x.id !== fleet.id);
  const defStr = c.defense[planet] * 1.2 + defFleets.reduce((a, x) => a + x.strength, 0);
  const atkStr = fleet.strength;
  const p = atkStr / (atkStr + defStr + 0.01);
  const win = Math.random() < Math.pow(p, 1.3) * 1.15;
  if (win) {
    for (const df of defFleets) df.strength = 0;
    fleet.strength = Math.max(1, Math.round(fleet.strength * (0.5 + 0.4 * p)));
    c.owner[planet] = attacker;
    c.defense[planet] = Math.max(1, c.defense[planet] - 1);
  } else {
    fleet.strength = 0;
    for (const df of defFleets) df.strength = Math.max(1, Math.round(df.strength * 0.7));
  }
  c.fleets = c.fleets.filter((x) => x.strength > 0);
  void attacker;
  return win;
}

function checkEliminations(c: Campaign) {
  for (const f of c.factions) {
    if (!f.alive) continue;
    const has = GALAXY.some((p) => c.owner[p.id] === f.id);
    if (!has) {
      f.alive = false;
      c.fleets = c.fleets.filter((x) => x.owner !== f.id);
      c.log.unshift(`${f.name} ha sido eliminada de la galaxia.`);
    }
  }
  const alive = c.factions.filter((f) => f.alive);
  if (alive.length === 1) {
    c.over = true;
    c.winner = alive[0].id;
  }
  if (!c.factions[0].alive) {
    c.over = true;
    c.winner = alive[0]?.id ?? -1;
  }
}

// ─────────────────────────── Vista ───────────────────────────
type Launch = (s: GameSetup, onResult: (win: boolean) => void) => void;

export function startConquest(parent: HTMLElement, onBack: () => void, launch: Launch) {
  const existing = load();
  const root = h('div', { class: 'screen', style: 'align-items:center' });
  root.appendChild(h('h1', null, 'Conquista Galáctica'));
  root.appendChild(h('div', { class: 'subtitle' }, 'Conquista la galaxia sistema a sistema. Cada invasión se decide en una batalla en tiempo real.'));
  const panel = h('div', { class: 'panel', style: 'width:min(820px, 92vw)' });
  const civSel = h('select', null, ...CIV_LIST.map((c) => h('option', { value: c.id }, c.name))) as HTMLSelectElement;
  const opp = h('select', null, ...[1, 2, 3, 4, 5].map((n) => h('option', { value: String(n), selected: n === 3 ? 'selected' : null }, String(n)))) as HTMLSelectElement;
  const dif = h('select', null, h('option', { value: 'easy' }, 'Fácil'), h('option', { value: 'normal', selected: 'selected' }, 'Normal'), h('option', { value: 'hard' }, 'Difícil'), h('option', { value: 'extreme' }, 'Extrema')) as HTMLSelectElement;
  const info = h('div', { class: 'civ-info', style: 'margin-top:10px' });
  const showInfo = () => {
    const c = CIVS[civSel.value];
    clear(info);
    info.append(h('b', null, c.name + ': '), c.desc, h('div', null, 'Mundo natal: ' + (PLANETS[c.homeworld]?.name ?? '—')));
  };
  civSel.addEventListener('change', showInfo);
  showInfo();
  panel.append(
    h('h2', null, 'Nueva campaña'),
    h('div', { class: 'form-row' }, h('label', null, 'Tu facción'), civSel),
    h('div', { class: 'form-row' }, h('label', null, 'Facciones rivales'), opp),
    h('div', { class: 'form-row' }, h('label', null, 'Dificultad'), dif),
    info,
  );
  root.appendChild(panel);
  const actions = h('div', { class: 'screen-actions', style: 'justify-content:center' },
    h('button', { class: 'btn', onclick: () => { root.remove(); onBack(); } }, 'Volver'),
    existing && !existing.over ? h('button', { class: 'btn', onclick: () => { campaign = existing; root.remove(); new GalaxyView(parent, onBack, launch); } }, `Continuar campaña (turno ${existing.turn})`) : null,
    h('button', { class: 'btn primary', onclick: () => { campaign = newCampaign(civSel.value, Number(opp.value), dif.value as any); save(); root.remove(); new GalaxyView(parent, onBack, launch); } }, 'Nueva campaña'),
  );
  root.appendChild(actions);
  parent.appendChild(root);
  audio.playMusic('galaxy', 'menu');
}

class GalaxyView {
  parent: HTMLElement;
  root: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  composer: EffectComposer;
  side!: HTMLElement;
  top!: HTMLElement;
  labels: Record<string, HTMLElement> = {};
  planets: Record<string, THREE.Group> = {};
  rings: Record<string, THREE.Mesh> = {};
  fleetMeshes: THREE.Group;
  selected: string | null = null;
  moveFrom: Fleet | null = null;
  private raf = 0;
  private t = 0;
  private last = performance.now();
  private raycaster = new THREE.Raycaster();
  private onBack: () => void;
  private launch: Launch;
  private lanes: THREE.LineSegments;
  private galaxyPts: THREE.Points;

  constructor(parent: HTMLElement, onBack: () => void, launch: Launch) {
    this.parent = parent;
    this.onBack = onBack;
    this.launch = launch;
    this.root = h('div', { class: 'gc-root' });
    parent.appendChild(this.root);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.root.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x020308);

    // galaxia espiral de fondo
    const N = 26000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const arm = i % 4;
      const r = Math.pow(Math.random(), 0.6) * 22;
      const a = (arm / 4) * Math.PI * 2 + r * 0.32 + (Math.random() - 0.5) * (0.6 + r * 0.02);
      pos[i * 3] = Math.cos(a) * r + (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * (1.6 - r * 0.05) - 1.5;
      pos[i * 3 + 2] = Math.sin(a) * r + (Math.random() - 0.5) * 1.2;
      const c = new THREE.Color().setHSL(r < 4 ? 0.1 : 0.58 + Math.random() * 0.12, 0.6, 0.45 + Math.random() * 0.3);
      const k = r < 3 ? 1.6 : 0.8;
      col.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.galaxyPts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, map: glowSprite(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.galaxyPts);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xffd8a0, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.scale.set(10, 10, 1);
    core.position.set(0, -1.5, 0);
    this.scene.add(core);
    this.scene.add(new THREE.AmbientLight(0x404858, 1.2));
    const sun = new THREE.PointLight(0xfff0d0, 120, 60, 1.5);
    sun.position.set(0, 6, 0);
    this.scene.add(sun);

    // rutas hiperespaciales
    const lp: number[] = [];
    for (const p of GALAXY) for (const l of p.links) if (p.id < l) lp.push(p.x, 0, p.y, GP[l].x, 0, GP[l].y);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.lanes = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x4a8ad8, transparent: true, opacity: 0.45 }));
    this.scene.add(this.lanes);

    // planetas
    for (const p of GALAXY) {
      const grp = new THREE.Group();
      grp.position.set(p.x, 0, p.y);
      const def = PLANETS[p.id];
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshStandardMaterial({ map: planetTex(p.id), roughness: 0.9 }));
      sphere.userData.planet = p.id;
      grp.add(sphere);
      const atm = new THREE.Mesh(new THREE.SphereGeometry(0.47, 24, 16), new THREE.MeshBasicMaterial({ color: def.sky.top, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      grp.add(atm);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false, side: THREE.DoubleSide }));
      grp.add(ring);
      this.rings[p.id] = ring;
      this.scene.add(grp);
      this.planets[p.id] = grp;
      const lab = h('div', { class: 'gc-label' });
      this.root.appendChild(lab);
      this.labels[p.id] = lab;
    }
    this.fleetMeshes = new THREE.Group();
    this.scene.add(this.fleetMeshes);

    this.camera.position.set(0, 16, 11);
    this.camera.lookAt(0, 0, 0.5);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.5, 0.88));
    this.composer.addPass(new OutputPass());

    this.top = h('div', { class: 'gc-top' });
    this.side = h('div', { class: 'gc-side' });
    this.root.append(this.top, this.side);
    this.renderer.domElement.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.refresh();
    this.raf = requestAnimationFrame(this.loop);
    audio.playMusic('galaxy', 'menu');
    if (campaign && campaign.pending.length) this.resolvePending();
  }

  private resize = () => {
    const w = this.root.clientWidth - 360, hh = this.root.clientHeight;
    this.renderer.setSize(Math.max(100, w), hh);
    this.composer.setSize(Math.max(100, w), hh);
    this.camera.aspect = Math.max(100, w) / hh;
    this.camera.updateProjectionMatrix();
  };

  private c(): Campaign {
    return campaign!;
  }

  private refresh() {
    const c = this.c();
    const me = c.factions[0];
    // anillos de propietario
    for (const p of GALAXY) {
      const o = c.owner[p.id];
      const ring = this.rings[p.id];
      const col = o >= 0 ? PLAYER_COLORS[c.factions[o].color].hex : 0x667080;
      (ring.material as THREE.MeshBasicMaterial).color.setHex(col).multiplyScalar(o >= 0 ? 1.6 : 0.6);
      const lab = this.labels[p.id];
      const fl = c.fleets.filter((x) => x.at === p.id);
      lab.innerHTML = `<div style="color:${o >= 0 ? PLAYER_COLORS[c.factions[o].color].css : '#9aa2b4'}">${p.name}${o >= 0 && c.factions[o].capital === p.id ? ' ★' : ''}</div><div class="fl">${o >= 0 ? CIVS[c.factions[o].civ].short : 'Neutral'} · Def ${c.defense[p.id]}${fl.length ? ' · Flota ' + fl.map((f) => f.strength).join('+') : ''}</div>`;
    }
    // flotas
    while (this.fleetMeshes.children.length) this.fleetMeshes.remove(this.fleetMeshes.children[0]);
    for (const f of c.fleets) {
      const p = GP[f.at];
      const fac = c.factions[f.owner];
      const geo = new THREE.ConeGeometry(0.12, 0.38, 4);
      geo.rotateZ(-Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(PLAYER_COLORS[fac.color].hex).multiplyScalar(2), toneMapped: false }));
      const idx = c.fleets.filter((x) => x.at === f.at).indexOf(f);
      m.position.set(p.x + 0.7 + idx * 0.3, 0.35, p.y - 0.5);
      m.userData.fleet = f.id;
      this.fleetMeshes.add(m);
    }
    // barra superior
    clear(this.top);
    this.top.append(
      h('span', { class: 'gc-title' }, 'CONQUISTA GALÁCTICA'),
      h('span', null, `Turno ${c.turn}`),
      h('span', { style: 'color:#ffd23d' }, `Créditos: ${me.credits}`),
      h('span', null, `Planetas: ${GALAXY.filter((p) => c.owner[p.id] === 0).length}/${GALAXY.length}`),
      h('span', { style: 'color:#6ac8ff' }, `Era de batalla: ${['', 'I', 'II', 'III', 'IV'][eraForTurn(c.turn)]}`),
    );
    this.renderSide();
  }

  private renderSide() {
    const c = this.c();
    const me = c.factions[0];
    const s = this.side;
    clear(s);
    s.appendChild(h('h2', { style: 'font-family:Orbitron;color:#ffd23d;letter-spacing:2px;font-size:15px;margin:0 0 6px' }, me.name));
    s.appendChild(h('div', { class: 'hptext' }, `Ingresos por turno: ${this.income(0)} créditos`));
    if (c.over) {
      const win = c.winner === 0;
      s.appendChild(h('div', { style: `font-family:Orbitron;font-size:22px;margin:18px 0;color:${win ? '#ffd23d' : '#ff5a4a'}` }, win ? '¡LA GALAXIA ES TUYA!' : 'TU FACCIÓN HA CAÍDO'));
      s.appendChild(h('button', { class: 'btn primary', onclick: () => { localStorage.removeItem(SAVE_KEY); this.dispose(); this.onBack(); } }, 'Terminar campaña'));
      return;
    }
    if (this.selected) {
      const p = GP[this.selected];
      const def = PLANETS[p.id];
      const o = c.owner[p.id];
      const myFleets = c.fleets.filter((f) => f.at === p.id && f.owner === 0);
      const enemyFleets = c.fleets.filter((f) => f.at === p.id && f.owner !== 0);
      const box = h('div', { class: 'panel', style: 'margin-top:12px' });
      box.appendChild(h('h2', null, p.name));
      box.appendChild(h('div', { class: 'planet-desc', style: 'margin-top:0' }, def.desc));
      box.appendChild(h('div', { class: 'kv', style: 'margin-top:8px' },
        h('div', null, 'Propietario'), h('div', { style: `color:${o >= 0 ? PLAYER_COLORS[c.factions[o].color].css : '#9aa2b4'}` }, o >= 0 ? c.factions[o].name : 'Neutral'),
        h('div', null, 'Defensa'), h('div', null, '★'.repeat(c.defense[p.id])),
        h('div', null, 'Ingresos'), h('div', null, String(p.income)),
        h('div', null, 'Bonificación'), h('div', null, p.bonus),
        h('div', null, 'Flotas'), h('div', null, c.fleets.filter((f) => f.at === p.id).map((f) => `${CIVS[c.factions[f.owner].civ].short} (${f.strength})`).join(', ') || '—'),
      ));
      if (o === 0) {
        box.appendChild(h('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-top:10px' },
          h('button', { class: 'btn small', disabled: me.credits < RECRUIT_COST ? 'disabled' : null, onclick: () => this.recruit(p.id) }, `Reclutar tropas (+1 flota) · ${RECRUIT_COST} cr`),
          h('button', { class: 'btn small', disabled: me.credits < FORTIFY_COST || c.defense[p.id] >= 5 ? 'disabled' : null, onclick: () => this.fortify(p.id) }, `Fortificar planeta · ${FORTIFY_COST} cr`),
        ));
      }
      for (const f of myFleets) {
        box.appendChild(h('div', { style: 'margin-top:8px;display:flex;align-items:center;gap:8px' },
          h('span', null, `Tu flota (fuerza ${f.strength})`),
          h('button', { class: 'btn small', disabled: f.moved ? 'disabled' : null, onclick: () => { this.moveFrom = f; this.renderSide(); } }, f.moved ? 'Ya movida' : 'Mover / Invadir'),
        ));
      }
      if (this.moveFrom) box.appendChild(h('div', { style: 'color:#6aff7a;margin-top:8px' }, 'Haz clic en un planeta conectado para mover la flota. Si es enemigo o neutral, invadirás.'));
      void enemyFleets;
      s.appendChild(box);
    } else {
      s.appendChild(h('div', { class: 'planet-desc' }, 'Selecciona un planeta para ver sus detalles, reclutar tropas o mover tus flotas por las rutas hiperespaciales.'));
    }
    // facciones
    const t = h('div', { class: 'panel', style: 'margin-top:12px' }, h('h2', null, 'Facciones'));
    for (const f of c.factions) {
      const n = GALAXY.filter((p) => c.owner[p.id] === f.id).length;
      t.appendChild(h('div', { style: `color:${PLAYER_COLORS[f.color].css};font-size:13px;opacity:${f.alive ? 1 : 0.4}` }, `${f.name}: ${n} planetas${f.alive ? '' : ' (eliminada)'}`));
    }
    s.appendChild(t);
    s.appendChild(h('div', { style: 'display:flex;gap:8px;margin-top:12px' },
      h('button', { class: 'btn primary', onclick: () => this.endTurn() }, 'Terminar turno'),
      h('button', { class: 'btn', onclick: () => { save(); this.dispose(); this.onBack(); } }, 'Guardar y salir'),
    ));
    s.appendChild(h('div', { class: 'gc-log' }, ...c.log.slice(0, 14).map((l) => h('div', null, '• ' + l))));
  }

  private income(fid: number): number {
    const c = this.c();
    let inc = 60;
    for (const p of GALAXY) if (c.owner[p.id] === fid) inc += p.income;
    if (c.owner['coruscant'] === fid) inc += 120;
    return inc;
  }

  private recruit(pid: string) {
    const c = this.c();
    const me = c.factions[0];
    if (me.credits < RECRUIT_COST) return;
    me.credits -= RECRUIT_COST;
    let f = c.fleets.find((x) => x.at === pid && x.owner === 0);
    if (!f) {
      f = { id: c.nextFleet++, owner: 0, at: pid, strength: 0, moved: false };
      c.fleets.push(f);
    }
    f.strength++;
    audio.ui('trained');
    save();
    this.refresh();
  }

  private fortify(pid: string) {
    const c = this.c();
    const me = c.factions[0];
    if (me.credits < FORTIFY_COST) return;
    me.credits -= FORTIFY_COST;
    c.defense[pid] = Math.min(5, c.defense[pid] + 1);
    audio.ui('built');
    save();
    this.refresh();
  }

  private onClick = (e: MouseEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(Object.values(this.planets), true);
    const hit = hits.find((x) => x.object.userData.planet);
    if (!hit) return;
    const pid = hit.object.userData.planet as string;
    audio.init();
    audio.ui('click');
    const c = this.c();
    if (this.moveFrom) {
      const f = this.moveFrom;
      this.moveFrom = null;
      if (GP[f.at].links.includes(pid)) {
        const o = c.owner[pid];
        f.moved = true;
        const from = f.at;
        f.at = pid;
        if (o !== 0) {
          c.pending.push({ planet: pid, attacker: 0, fleetId: f.id });
          c.log.unshift(`Tu flota se dirige a invadir ${GP[pid].name} desde ${GP[from].name}.`);
        } else {
          // fusionar flotas propias
          const other = c.fleets.find((x) => x.at === pid && x.owner === 0 && x.id !== f.id);
          if (other) {
            other.strength += f.strength;
            other.moved = true;
            c.fleets = c.fleets.filter((x) => x.id !== f.id);
          }
        }
        save();
      } else audio.ui('error');
    }
    this.selected = pid;
    this.refresh();
  };

  private endTurn() {
    const c = this.c();
    // la IA actúa
    for (const f of c.factions) if (f.alive && !f.human) aiTurn(c, f);
    this.resolvePending();
  }

  /** Resuelve las invasiones pendientes una por una (las del jugador pueden librarse en RTS) */
  private resolvePending() {
    const c = this.c();
    while (c.pending.length) {
      const ev = c.pending[0];
      const fleet = c.fleets.find((x) => x.id === ev.fleetId);
      if (!fleet || fleet.strength <= 0 || c.owner[ev.planet] === ev.attacker) {
        c.pending.shift();
        continue;
      }
      const defender = c.owner[ev.planet];
      const humanInvolved = ev.attacker === 0 || defender === 0;
      if (!humanInvolved) {
        c.pending.shift();
        const win = autoResolve(c, ev.planet, ev.attacker, fleet);
        c.log.unshift(`${c.factions[ev.attacker].name} ${win ? 'conquista' : 'fracasa al invadir'} ${GP[ev.planet].name}.`);
        continue;
      }
      // batalla del jugador: preguntar
      this.askBattle(ev, fleet);
      return;
    }
    this.finishTurn();
  }

  private askBattle(ev: Campaign['pending'][0], fleet: Fleet) {
    const c = this.c();
    const defender = c.owner[ev.planet];
    const attackerF = c.factions[ev.attacker];
    const defF = defender >= 0 ? c.factions[defender] : null;
    const title = ev.attacker === 0 ? `Invasión de ${GP[ev.planet].name}` : `¡${attackerF.name} invade ${GP[ev.planet].name}!`;
    const back = h('div', { class: 'modal-back' });
    const m = h('div', { class: 'modal modal-col', style: 'max-width:520px' },
      h('h2', null, title),
      h('div', null, `Atacante: ${attackerF.name} (flota ${fleet.strength})`),
      h('div', null, `Defensor: ${defF ? defF.name : 'Fuerzas locales neutrales'} (defensa ${c.defense[ev.planet]})`),
      h('div', { class: 'planet-desc' }, 'Libra la batalla en tiempo real para controlar el resultado, o deja que tus comandantes la resuelvan (más arriesgado).'),
      h('button', { class: 'btn primary', onclick: () => { back.remove(); this.fight(ev, fleet); } }, 'Liderar la batalla (RTS)'),
      h('button', { class: 'btn', onclick: () => {
        back.remove();
        c.pending.shift();
        const win = autoResolve(c, ev.planet, ev.attacker, fleet);
        const humanWon = (ev.attacker === 0) === win;
        c.log.unshift(`${GP[ev.planet].name}: ${humanWon ? 'victoria' : 'derrota'} en resolución automática.`);
        audio.ui(humanWon ? 'research' : 'error');
        save();
        this.refresh();
        this.resolvePending();
      } }, 'Resolución automática'),
    );
    back.appendChild(m);
    this.root.appendChild(back);
  }

  private fight(ev: Campaign['pending'][0], fleet: Fleet) {
    const c = this.c();
    const defender = c.owner[ev.planet];
    const era = eraForTurn(c.turn);
    const att = c.factions[ev.attacker];
    const humanAttacks = ev.attacker === 0;
    const defCiv = defender >= 0 ? c.factions[defender].civ : CIV_LIST.filter((x) => x.id !== att.civ)[Math.floor(Math.random() * 7)].id;
    const defFleets = c.fleets.filter((x) => x.at === ev.planet && x.owner === defender && x.id !== fleet.id);
    const defStrength = c.defense[ev.planet] + defFleets.reduce((a, x) => a + x.strength, 0);
    const planetBonus = (fid: number) => {
      const res: Record<string, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
      for (const p of GALAXY) if (c.owner[p.id] === fid && p.bonusRes) for (const [k, v] of Object.entries(p.bonusRes)) res[k] = Math.min(800, res[k] + (v ?? 0));
      return res;
    };
    const humanP = { name: settings().playerName, civ: c.factions[0].civ, color: c.factions[0].color, team: 1, human: true, difficulty: 'normal' as const };
    const enemyF = humanAttacks ? (defender >= 0 ? c.factions[defender] : null) : att;
    const enemyP = { name: enemyF ? enemyF.name : 'Fuerzas locales', civ: humanAttacks ? defCiv : att.civ, color: enemyF ? enemyF.color : 6, team: 2, human: false, difficulty: c.difficulty };
    const humanStr = humanAttacks ? fleet.strength : defStrength;
    const enemyStr = humanAttacks ? defStrength : fleet.strength;
    const setup: GameSetup = {
      planet: ev.planet, size: 'small', seed: Math.floor(Math.random() * 1e9), startRes: 'standard', startEra: era, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
      campaignTitle: `${GP[ev.planet].name} · Turno ${c.turn}`,
      players: [
        { ...humanP, bonusUnits: fleetUnits(humanP.civ, humanStr, era), bonusRes: planetBonus(0) as any },
        { ...enemyP, bonusUnits: fleetUnits(enemyP.civ, enemyStr, era), bonusRes: enemyF ? (planetBonus(enemyF.id) as any) : undefined },
      ],
    };
    save();
    this.dispose();
    this.launch(setup, (win) => {
      // aplicar resultado
      campaign = load() ?? campaign;
      const cc = this.c();
      cc.pending.shift();
      const fl = cc.fleets.find((x) => x.id === fleet.id);
      if (humanAttacks) {
        if (win) {
          cc.owner[ev.planet] = 0;
          for (const df of cc.fleets.filter((x) => x.at === ev.planet && x.owner !== 0)) df.strength = 0;
          if (fl) fl.strength = Math.max(1, fl.strength - 1);
          cc.log.unshift(`¡Has conquistado ${GP[ev.planet].name}!`);
        } else {
          if (fl) fl.strength = 0;
          cc.log.unshift(`La invasión de ${GP[ev.planet].name} ha fracasado.`);
        }
      } else {
        if (win) {
          if (fl) fl.strength = 0;
          cc.log.unshift(`Has defendido ${GP[ev.planet].name}.`);
        } else {
          cc.owner[ev.planet] = ev.attacker;
          for (const df of cc.fleets.filter((x) => x.at === ev.planet && x.owner === 0)) df.strength = 0;
          cc.log.unshift(`${cc.factions[ev.attacker].name} ha conquistado ${GP[ev.planet].name}.`);
        }
      }
      cc.fleets = cc.fleets.filter((x) => x.strength > 0);
      checkEliminations(cc);
      save();
      const v = new GalaxyView(this.parent, this.onBack, this.launch);
      void v;
    });
  }

  private finishTurn() {
    const c = this.c();
    checkEliminations(c);
    if (!c.over) {
      for (const f of c.factions) if (f.alive) f.credits += this.income(f.id);
      for (const fl of c.fleets) fl.moved = false;
      c.turn++;
      c.log.unshift(`— Turno ${c.turn} —`);
      audio.ui('click');
    } else audio.fanfare();
    save();
    this.refresh();
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    for (const id in this.planets) {
      this.planets[id].children[0].rotation.y += dt * 0.2;
      const ring = this.rings[id];
      ring.rotation.y += dt * 0.3;
      const sel = this.selected === id;
      ring.scale.setScalar(sel ? 1.15 + Math.sin(this.t * 4) * 0.05 : 1);
    }
    this.galaxyPts.rotation.y += dt * 0.004;
    for (const m of this.fleetMeshes.children) m.position.y = 0.35 + Math.sin(this.t * 2 + m.position.x) * 0.06;
    // etiquetas
    const r = this.renderer.domElement.getBoundingClientRect();
    for (const p of GALAXY) {
      const v = new THREE.Vector3(p.x, -0.75, p.y).project(this.camera);
      const lab = this.labels[p.id];
      lab.style.left = ((v.x * 0.5 + 0.5) * r.width) + 'px';
      lab.style.top = ((-v.y * 0.5 + 0.5) * r.height) + 'px';
    }
    // líneas de movimiento posibles
    (this.lanes.material as THREE.LineBasicMaterial).opacity = this.moveFrom ? 0.8 : 0.4;
    this.composer.render(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.root.remove();
  }
}

function planetTex(id: string): THREE.Texture {
  const p = PLANETS[id];
  const W = 256, H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const n = new Noise2D(id.length * 97 + id.charCodeAt(1));
  const col = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const base = col(p.terrain.base), alt = col(p.terrain.alt), high = col(p.terrain.high), low = col(p.water?.color ?? p.terrain.low);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2, lat = (y / H) * Math.PI;
      const px = Math.cos(lon) * Math.sin(lat), py = Math.cos(lat), pz = Math.sin(lon) * Math.sin(lat);
      const v = n.fbm(px * 2 + pz * 1.3 + 5, py * 2 + pz * 0.7, 5);
      let cc = v < -0.12 && p.water ? low : v < 0.02 ? base : v < 0.2 ? alt : high;
      if (p.snow && Math.abs(py) > 0.6) cc = [240, 245, 250];
      const i = (y * W + x) * 4;
      img.data[i] = cc[0];
      img.data[i + 1] = cc[1];
      img.data[i + 2] = cc[2];
      img.data[i + 3] = 255;
      if (p.water?.kind === 'lava' && v < -0.12) {
        img.data[i] = 255;
        img.data[i + 1] = 110;
        img.data[i + 2] = 20;
      }
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

void UNITS;
