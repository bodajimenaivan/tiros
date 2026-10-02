// Iconos: retratos 3D de modelos renderizados fuera de pantalla + iconos vectoriales.
import * as THREE from 'three';
import { ModelBatch } from '../render/instances';
import { createModelMaterial } from '../render/materials';
import type { ModelDef } from '../render/models/builder';

// ─────────────────────────── Retratos 3D ───────────────────────────
let pr: THREE.WebGLRenderer | null = null;
let pScene: THREE.Scene;
let pCam: THREE.PerspectiveCamera;
let pMat: THREE.MeshStandardMaterial;
const cache = new Map<string, string>();

function init() {
  if (pr) return;
  pr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  pr.setSize(128, 128);
  pr.setPixelRatio(1);
  pr.toneMapping = THREE.ACESFilmicToneMapping;
  pr.outputColorSpace = THREE.SRGBColorSpace;
  pScene = new THREE.Scene();
  pScene.add(new THREE.HemisphereLight(0xcfe0ff, 0x302820, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 2.6);
  d.position.set(3, 5, 4);
  pScene.add(d);
  const rim = new THREE.DirectionalLight(0x6ac8ff, 1.4);
  rim.position.set(-4, 2, -3);
  pScene.add(rim);
  pCam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  pMat = createModelMaterial();
}

export function portrait(key: string, def: ModelDef, teamColor: number, saberColor = 0x3d8bff, close = false): string {
  const k = key + ':' + teamColor.toString(16) + (close ? 'c' : '');
  const c = cache.get(k);
  if (c) return c;
  init();
  const g = new THREE.Group();
  pScene.add(g);
  const batch = new ModelBatch(def, g, pMat, { shadows: false, capacity: 1 });
  batch.begin();
  const m = new THREE.Matrix4().makeRotationY(-0.6);
  batch.push(m, new THREE.Color(teamColor), new THREE.Color(saberColor), 1, 0, 1, { walk: 0.6, walkAmp: 0.4, attackT: 9, melee: false, workT: 9, time: 1, seed: 0, spin: 0 });
  batch.commit(false);
  const h = Math.max(0.4, def.height);
  const r = Math.max(0.3, def.radius);
  const size = Math.max(h, r * 1.6);
  const dist = size * (close ? 2.2 : 2.9) + 0.4;
  const ty = close && h > 0.6 && h < 1.6 ? h * 0.72 : h * 0.5;
  pCam.position.set(dist * 0.75, ty + dist * 0.35, dist * 0.7);
  pCam.lookAt(0, ty, 0);
  pr!.setClearColor(0x000000, 0);
  pr!.render(pScene, pCam);
  const url = pr!.domElement.toDataURL('image/png');
  pScene.remove(g);
  for (const mesh of batch.meshes) mesh.geometry.dispose();
  cache.set(k, url);
  return url;
}

// ─────────────────────────── Iconos vectoriales ───────────────────────────
const svgCache = new Map<string, string>();

const BG: Record<string, [string, string]> = {
  eco: ['#2e4a22', '#0c160a'],
  mil: ['#4a2222', '#160a0a'],
  tech: ['#22344a', '#0a1016'],
  force: ['#2a2a4a', '#0a0a18'],
  era: ['#4a3e12', '#161004'],
  cmd: ['#2a3038', '#0c0e12'],
  unique: ['#4a2a4a', '#160a16'],
};

const P: Record<string, string> = {
  era: '<path d="M32 10 L38 26 L54 26 L41 36 L46 52 L32 42 L18 52 L23 36 L10 26 L26 26Z" fill="#ffd23d" stroke="#fff3a0" stroke-width="1.5"/>',
  armor: '<path d="M32 10 L50 18 L48 36 Q46 48 32 56 Q18 48 16 36 L14 18Z" fill="#9aa8b8" stroke="#e0e8f0" stroke-width="2"/><path d="M32 16 L32 50" stroke="#5a6878" stroke-width="3"/>',
  mecharmor: '<rect x="12" y="20" width="40" height="26" rx="4" fill="#8a96a6" stroke="#e0e8f0" stroke-width="2"/><circle cx="20" cy="46" r="6" fill="#444"/><circle cx="44" cy="46" r="6" fill="#444"/><rect x="26" y="12" width="12" height="10" fill="#6a7686"/>',
  cargo: '<rect x="12" y="24" width="30" height="20" fill="#b08a4a" stroke="#ffd890" stroke-width="2"/><circle cx="20" cy="48" r="5" fill="#333"/><circle cx="38" cy="48" r="5" fill="#333"/><path d="M44 30 L54 30 L54 44 L44 44" fill="none" stroke="#ffd890" stroke-width="2"/>',
  sensor: '<circle cx="32" cy="32" r="18" fill="none" stroke="#6ac8ff" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="#6ac8ff"/><path d="M32 32 L48 18" stroke="#c8f0ff" stroke-width="3"/>',
  turret: '<rect x="22" y="30" width="20" height="24" fill="#8a96a6"/><rect x="18" y="22" width="28" height="12" fill="#6a7686"/><rect x="42" y="25" width="16" height="4" fill="#333"/>',
  food: '<circle cx="26" cy="36" r="12" fill="#d0303a"/><circle cx="40" cy="34" r="11" fill="#e04a3a"/><path d="M32 24 Q34 14 42 12" stroke="#4a8a2a" stroke-width="3" fill="none"/>',
  farm: '<path d="M10 46 L54 46" stroke="#8a6a3a" stroke-width="6"/><path d="M16 44 L16 26 M26 44 L26 22 M36 44 L36 26 M46 44 L46 22" stroke="#7ac040" stroke-width="4"/><circle cx="48" cy="16" r="5" fill="#ffd23d"/>',
  hunt: '<path d="M12 40 Q20 22 38 26 L50 20 L52 30 L44 34 Q44 46 30 48 Z" fill="#8a6a4a"/><circle cx="46" cy="26" r="2" fill="#000"/>',
  carbon: '<rect x="12" y="34" width="40" height="10" rx="5" fill="#7a5230"/><rect x="16" y="22" width="34" height="10" rx="5" fill="#8a6038"/><circle cx="14" cy="39" r="4" fill="#c8a070"/>',
  nova: '<path d="M32 8 L42 28 L32 56 L22 28Z" fill="#6ad8ff" stroke="#e0f8ff" stroke-width="2"/><path d="M18 30 L24 22 L26 44Z M46 30 L40 22 L38 44Z" fill="#3a9ad8"/>',
  ore: '<path d="M12 44 L20 24 L34 18 L48 26 L52 44 Z" fill="#7a6a5a" stroke="#c8b8a0" stroke-width="2"/><path d="M24 34 L30 30 M36 36 L42 30" stroke="#ffc850" stroke-width="3"/>',
  power: '<path d="M36 8 L18 36 L30 36 L26 56 L46 26 L34 26Z" fill="#7ae0ff" stroke="#e0f8ff" stroke-width="2"/>',
  blaster: '<path d="M10 28 L44 28 L44 24 L54 24 L54 34 L28 34 L24 46 L16 46 L18 34 L10 34Z" fill="#5a5e66" stroke="#c0c8d0" stroke-width="1.5"/><path d="M54 29 L62 29" stroke="#ff4a3a" stroke-width="3"/>',
  cannon: '<rect x="10" y="32" width="26" height="14" fill="#5a5e66"/><rect x="30" y="26" width="28" height="7" fill="#7a7e86" transform="rotate(-15 30 30)"/><circle cx="18" cy="48" r="6" fill="#333"/><circle cx="32" cy="48" r="6" fill="#333"/>',
  building: '<rect x="14" y="26" width="36" height="28" fill="#9aa8b8"/><path d="M10 28 L32 12 L54 28Z" fill="#6a7686"/><rect x="28" y="38" width="8" height="16" fill="#333"/>',
  upgrade: '<path d="M32 10 L50 32 L40 32 L40 54 L24 54 L24 32 L14 32Z" fill="#6aff7a" stroke="#e0ffe0" stroke-width="2"/>',
  speed: '<path d="M8 24 L30 24 M12 32 L36 32 M8 40 L30 40" stroke="#6ac8ff" stroke-width="3"/><path d="M34 16 L56 32 L34 48Z" fill="#ffd23d"/>',
  target: '<circle cx="32" cy="32" r="18" fill="none" stroke="#ff5a4a" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="none" stroke="#ff5a4a" stroke-width="3"/><path d="M32 8 L32 20 M32 44 L32 56 M8 32 L20 32 M44 32 L56 32" stroke="#ff5a4a" stroke-width="3"/>',
  force: '<circle cx="32" cy="32" r="20" fill="none" stroke="#9ab8ff" stroke-width="2"/><path d="M32 12 C 44 22, 20 42, 32 52" stroke="#c8d8ff" stroke-width="3" fill="none"/><circle cx="32" cy="32" r="5" fill="#fff"/>',
  heal: '<rect x="26" y="12" width="12" height="40" fill="#6aff7a"/><rect x="12" y="26" width="40" height="12" fill="#6aff7a"/>',
  saber: '<rect x="14" y="44" width="12" height="6" fill="#aaa" transform="rotate(-45 20 47)"/><path d="M22 42 L52 12" stroke="#6ac8ff" stroke-width="5" stroke-linecap="round"/><path d="M22 42 L52 12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  holocron: '<rect x="18" y="18" width="28" height="28" fill="#3a8aff" stroke="#ffd860" stroke-width="2" transform="rotate(15 32 32)"/><circle cx="32" cy="32" r="5" fill="#fff"/>',
  trade: '<circle cx="24" cy="32" r="12" fill="#ffd23d"/><circle cx="40" cy="32" r="12" fill="#6ad8ff" opacity="0.85"/><path d="M18 18 L46 18 M42 14 L46 18 L42 22 M46 46 L18 46 M22 42 L18 46 L22 50" stroke="#fff" stroke-width="2" fill="none"/>',
  shield: '<path d="M32 8 Q48 16 52 18 Q50 44 32 56 Q14 44 12 18 Q16 16 32 8Z" fill="#3a8ad8" fill-opacity="0.6" stroke="#9ad8ff" stroke-width="3"/>',
  unique: '<path d="M32 8 L38 24 L56 26 L42 38 L46 56 L32 46 L18 56 L22 38 L8 26 L26 24Z" fill="#d88aff" stroke="#fff" stroke-width="1.5"/>',
  // habilidades
  push: '<circle cx="16" cy="32" r="6" fill="#9ad8ff"/><path d="M26 22 Q36 32 26 42 M34 16 Q48 32 34 48 M42 10 Q60 32 42 54" stroke="#9ad8ff" stroke-width="3" fill="none"/>',
  lightning: '<path d="M36 6 L20 30 L30 30 L22 58 L44 26 L33 26 L42 6Z" fill="#b8e0ff" stroke="#fff" stroke-width="1.5"/>',
  choke: '<path d="M18 50 L18 30 Q18 22 26 22 L26 14 M26 22 L34 18 M26 22 L40 24 M26 22 L42 30" stroke="#c8c8d8" stroke-width="4" fill="none" stroke-linecap="round"/>',
  throw: '<circle cx="32" cy="32" r="18" fill="none" stroke="#6ac8ff" stroke-width="3" stroke-dasharray="6 5"/><path d="M14 50 L50 14" stroke="#6ac8ff" stroke-width="4"/>',
  meditate: '<circle cx="32" cy="18" r="7" fill="#ffd860"/><path d="M14 46 Q32 30 50 46 L44 52 L20 52Z" fill="#c8a040"/><circle cx="32" cy="32" r="24" fill="none" stroke="#ffd860" stroke-width="2"/>',
  rally: '<path d="M18 56 L18 10" stroke="#ccc" stroke-width="3"/><path d="M18 10 L50 18 L18 28Z" fill="#ffb040"/>',
  detonator: '<circle cx="30" cy="36" r="16" fill="#555" stroke="#aaa" stroke-width="2"/><rect x="26" y="14" width="8" height="8" fill="#888"/><circle cx="30" cy="36" r="5" fill="#ff4a2a"/>',
  spin: '<circle cx="32" cy="32" r="20" fill="none" stroke="#ff4a3a" stroke-width="4" stroke-dasharray="20 8"/><path d="M50 22 L54 34 L44 30Z" fill="#ff4a3a"/>',
  roar: '<path d="M14 24 Q30 14 46 24 L40 30 Q30 24 20 30Z" fill="#8a6a4a"/><path d="M20 38 Q32 52 46 38" stroke="#fff" stroke-width="3" fill="none"/><path d="M50 24 L60 18 M52 32 L62 32 M50 40 L60 46" stroke="#ffd23d" stroke-width="2"/>',
  rapid: '<path d="M8 22 L40 22 M8 32 L46 32 M8 42 L40 42" stroke="#ff5a4a" stroke-width="4"/><path d="M42 22 L50 22 M48 32 L58 32 M42 42 L50 42" stroke="#ffd23d" stroke-width="4"/>',
  orbital: '<circle cx="32" cy="46" r="8" fill="#ff8a3a"/><path d="M20 8 L28 36 M32 6 L32 36 M44 8 L36 36" stroke="#ffd23d" stroke-width="3"/>',
  jetpack: '<rect x="22" y="12" width="20" height="26" rx="4" fill="#5a6a4a"/><path d="M26 38 L22 56 L32 46 L42 56 L38 38" fill="#ff8a3a"/>',
  clumsy: '<circle cx="32" cy="30" r="14" fill="#d08a40"/><path d="M14 52 Q32 40 50 52" stroke="#fff" stroke-width="3" fill="none"/><path d="M8 14 L16 20 M56 14 L48 20" stroke="#ffd23d" stroke-width="3"/>',
  command: '<rect x="18" y="12" width="28" height="20" fill="#c8b07e"/><rect x="24" y="32" width="16" height="22" fill="#a89060"/><circle cx="32" cy="22" r="4" fill="#ff4a3a"/>',
  // órdenes
  stop: '<rect x="18" y="18" width="28" height="28" fill="#ff5a4a"/>',
  patrol: '<path d="M14 24 H46" stroke="#ffd23d" stroke-width="4"/><path d="M46 16 L56 24 L46 32Z" fill="#ffd23d"/><path d="M50 42 H18" stroke="#9fd8ff" stroke-width="4"/><path d="M18 34 L8 42 L18 50Z" fill="#9fd8ff"/>',
  attackMove: '<path d="M12 52 L40 24" stroke="#ff5a4a" stroke-width="5"/><path d="M34 14 L52 14 L52 32Z" fill="#ff5a4a"/><circle cx="16" cy="48" r="4" fill="#fff"/>',
  delete: '<path d="M16 16 L48 48 M48 16 L16 48" stroke="#ff5a4a" stroke-width="6"/>',
  aggressive: '<path d="M14 50 L50 14" stroke="#ff5a4a" stroke-width="5"/><path d="M38 12 L52 12 L52 26Z" fill="#ff5a4a"/>',
  defensive: '<path d="M32 10 Q48 16 50 18 Q48 42 32 54 Q16 42 14 18 Q16 16 32 10Z" fill="none" stroke="#6ac8ff" stroke-width="4"/>',
  standGround: '<path d="M20 54 L20 12 L44 12 L44 54" stroke="#ffd23d" stroke-width="5" fill="none"/><path d="M12 54 L52 54" stroke="#ffd23d" stroke-width="5"/>',
  passive: '<circle cx="32" cy="32" r="18" fill="none" stroke="#9aa" stroke-width="4"/><path d="M20 44 L44 20" stroke="#9aa" stroke-width="4"/>',
  buildEco: '<rect x="14" y="30" width="22" height="20" fill="#c8a070"/><path d="M10 32 L25 20 L40 32Z" fill="#8a6a3a"/><path d="M42 50 L52 30 L56 34Z" fill="#aaa"/><rect x="44" y="18" width="4" height="22" fill="#6a4a2a" transform="rotate(30 46 30)"/>',
  buildMil: '<rect x="10" y="26" width="44" height="26" fill="#8a96a6"/><rect x="14" y="16" width="10" height="12" fill="#6a7686"/><rect x="40" y="16" width="10" height="12" fill="#6a7686"/><rect x="26" y="36" width="12" height="16" fill="#333"/>',
  back: '<path d="M44 14 L22 32 L44 50" stroke="#ffd23d" stroke-width="6" fill="none"/>',
  repair: '<path d="M14 50 L36 28" stroke="#bbb" stroke-width="6"/><circle cx="42" cy="22" r="10" fill="none" stroke="#bbb" stroke-width="6"/>',
  buy: '<circle cx="32" cy="32" r="18" fill="#2a6a2a"/><path d="M32 20 L32 44 M20 32 L44 32" stroke="#fff" stroke-width="5"/>',
  sell: '<circle cx="32" cy="32" r="18" fill="#6a2a2a"/><path d="M20 32 L44 32" stroke="#fff" stroke-width="5"/>',
  rallyPt: '<path d="M18 56 L18 10" stroke="#ccc" stroke-width="3"/><path d="M18 10 L50 18 L18 28Z" fill="#6aff7a"/>',
  convert: '<circle cx="32" cy="32" r="20" fill="none" stroke="#c8d8ff" stroke-width="3"/><path d="M20 32 Q32 18 44 32 Q32 46 20 32Z" fill="#c8d8ff"/>',
  garrison: '<path d="M10 30 L32 12 L54 30 L54 54 L10 54Z" fill="#6a7686"/><path d="M32 22 L32 46 M22 36 L32 46 L42 36" stroke="#6aff7a" stroke-width="5" fill="none"/>',
  ungarrison: '<path d="M10 30 L32 12 L54 30 L54 54 L10 54Z" fill="#6a7686"/><path d="M32 46 L32 22 M22 32 L32 22 L42 32" stroke="#ffd23d" stroke-width="5" fill="none"/>',
  alarm: '<path d="M20 44 L20 30 Q20 16 32 16 Q44 16 44 30 L44 44 L50 50 L14 50Z" fill="#ffd23d"/><circle cx="32" cy="54" r="4" fill="#ffd23d"/><path d="M8 20 L14 24 M56 20 L50 24" stroke="#ff5a4a" stroke-width="3"/>',
  alarmOff: '<path d="M20 44 L20 30 Q20 16 32 16 Q44 16 44 30 L44 44 L50 50 L14 50Z" fill="#7a8a7a"/><path d="M12 52 L52 12" stroke="#6aff7a" stroke-width="5"/>',
  wall: '<rect x="8" y="24" width="48" height="26" fill="#8a96a6"/><path d="M8 24 L8 18 L16 18 L16 24 M24 24 L24 18 L32 18 L32 24 M40 24 L40 18 L48 18 L48 24" fill="#8a96a6"/>',
};

export function svgIcon(name: string, cat: keyof typeof BG = 'tech', label?: string): string {
  const key = name + ':' + cat + ':' + (label ?? '');
  const c = svgCache.get(key);
  if (c) return c;
  const [a, b] = BG[cat] ?? BG.tech;
  const body = P[name] ?? P.unique;
  const text = label ? `<text x="32" y="40" font-family="Orbitron, sans-serif" font-weight="900" font-size="22" text-anchor="middle" fill="#ffd23d" stroke="#000" stroke-width="1">${label}</text>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><rect width="64" height="64" fill="url(#g)"/>${body}${text}</svg>`;
  const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  svgCache.set(key, url);
  return url;
}

export const RES_ICON: Record<string, string> = {};
export function resIcon(r: 'food' | 'carbon' | 'nova' | 'ore' | 'pop'): string {
  if (RES_ICON[r]) return RES_ICON[r];
  let body = '';
  switch (r) {
    case 'food': body = P.food; break;
    case 'carbon': body = P.carbon; break;
    case 'nova': body = P.nova; break;
    case 'ore': body = P.ore; break;
    case 'pop': body = '<circle cx="24" cy="22" r="8" fill="#9ad8ff"/><path d="M10 52 Q24 30 38 52Z" fill="#9ad8ff"/><circle cx="42" cy="24" r="7" fill="#6aa8d8"/><path d="M30 52 Q42 32 56 52Z" fill="#6aa8d8"/>'; break;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;
  RES_ICON[r] = 'data:image/svg+xml;base64,' + btoa(svg);
  return RES_ICON[r];
}
