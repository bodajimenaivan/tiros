// Galería de modelos para revisar el aspecto de unidades y edificios.
// ?civ=empire&kind=units|buildings  ·  ?ids=trooper,worker&civ=empire (primer plano)  ·  &planet=tatooine
import * as THREE from 'three';
import { CIVS, PLAYER_COLORS } from '../src/data/civs';
import { UNITS } from '../src/data/units';
import { BUILDINGS } from '../src/data/buildings';
import { PLANETS } from '../src/data/planets';
import { buildUnitModel } from '../src/render/models/unitModels';
import { buildBuildingModel } from '../src/render/models/buildingModels';
import { ModelBatch } from '../src/render/instances';
import { createModelMaterial } from '../src/render/materials';
import { makeEnvironment } from '../src/render/environment';

const params = new URLSearchParams(location.search);
const civ = CIVS[params.get('civ') ?? 'empire'];
const kind = params.get('kind') ?? 'units';
const planet = PLANETS[params.get('planet') ?? 'naboo'];
const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(planet.sky.fog);
scene.environment = makeEnvironment(renderer, planet.sky);
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 500);
scene.add(new THREE.HemisphereLight(planet.sky.top, planet.sky.hemiGround, planet.sky.ambient * 1.6));
const sun = new THREE.DirectionalLight(planet.sky.sun, planet.sky.sunIntensity);
sun.position.set(20, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
sun.shadow.camera.right = sun.shadow.camera.top = 40;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: planet.terrain.base, roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);
const mat = createModelMaterial();
const group = new THREE.Group();
scene.add(group);
const team = new THREE.Color(PLAYER_COLORS[Number(params.get('color') ?? 0)].hex);

let ids: string[];
const closeup = params.has('ids');
if (closeup) ids = params.get('ids')!.split(',');
else if (kind === 'units') {
  ids = Object.values(UNITS).filter((u) => !u.hidden && u.cls !== 'animal' && (!u.civ || u.civ === civ.id) && (!u.heroOf || civ.heroes.includes(u.id)) && !civ.disabled.includes(u.id)).map((u) => u.id);
} else ids = Object.keys(BUILDINGS);
const isUnit = (id: string) => !!UNITS[id] && (kind === 'units' || !BUILDINGS[id]);
const cols = closeup ? ids.length : kind === 'units' ? 8 : 6;
const gap = closeup ? (isUnit(ids[0]) ? 1.3 : 6) : kind === 'units' ? 2.2 : 6.5;
const m = new THREE.Matrix4();
const walk = Number(params.get('walk') ?? 0);
ids.forEach((id, i) => {
  const def = isUnit(id) ? buildUnitModel(id, civ.style, civ.saber) : buildBuildingModel(id, civ.style);
  const b = new ModelBatch(def, group, mat, { shadows: true, capacity: 1 });
  b.begin();
  const x = (i % cols) * gap, z = Math.floor(i / cols) * gap;
  const sc = isUnit(id) ? (UNITS[id].air ? 1.2 : 1.25) : 1;
  const yaw = Number(params.get('yaw') ?? -Math.PI / 4 - 0.4);
  m.compose(new THREE.Vector3(x, isUnit(id) && UNITS[id].air ? 1.2 : 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(sc, sc, sc));
  b.push(m, team, new THREE.Color(civ.saber), 1, 0, 1, { walk: walk, walkAmp: walk ? 1 : 0, attackT: 9, melee: false, workT: 9, time: 0, seed: i, spin: 0 } as any);
  b.commit(false);
});
const rows = Math.ceil(ids.length / cols);
const cx = ((cols - 1) * gap) / 2, cz = ((rows - 1) * gap) / 2;
if (closeup) {
  const unit = isUnit(ids[0]);
  const ty = unit ? 0.62 : 2;
  const dist = (unit ? Math.max(2.6, cols * gap * 1.6) : Math.max(8, cols * gap * 0.9)) / Number(params.get("zoom") ?? 1);
  cam.position.set(cx + dist * 0.1, ty + dist * 0.28, cz + dist);
  cam.lookAt(cx, ty, cz);
} else {
  const span = Math.max(cols * gap, rows * gap);
  cam.position.set(cx, span * 0.75, cz + span * 1.15);
  cam.lookAt(cx, 0, cz);
}
renderer.render(scene, cam);
(window as any).__ready = true;
(window as any).__ids = ids;
