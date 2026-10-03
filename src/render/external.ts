// Recursos aportados por el jugador en la carpeta assets/ del proyecto (texturas de terreno y
// modelos 3D). Se incluyen en la compilación (también en Jugar.html) y sustituyen a los modelos
// generados por código cuando existen. Ver docs/modelos-con-ia.md.
//
//   assets/terrain/<nombre>.jpg               texturas de suelo
//   assets/models/<civ>/<unidad|edificio>.glb  modelos por civilización
//   assets/models/<civ>/<unidad>.png          textura suelta del modelo del mismo nombre (opcional)
//   assets/models/heroes/<héroe>.glb          héroes
//   assets/models/anims/<acción>.fbx          animaciones de Mixamo compartidas
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { terrainPhotos } from './terrainMaterials';
import type { AnimState } from './instances';

const FILES = import.meta.glob('/assets/**/*.{glb,fbx,jpg,jpeg,png,webp,GLB,FBX,JPG,JPEG,PNG,WEBP}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface ExtModel {
  key: string;
  /** raíz normalizada: altura 1, apoyada en y = 0, mirando a +X */
  root: THREE.Object3D;
  skinned: boolean;
  clips: Map<string, THREE.AnimationClip>;
  /** cadera del esqueleto, para adaptar las animaciones compartidas */
  hips?: HipsFrame;
}

export const extModels = new Map<string, ExtModel>();
const sharedClips = new Map<string, THREE.AnimationClip>();
/** cadera del personaje con el que se descargó cada animación compartida */
const sharedHips = new Map<string, HipsFrame>();
let loading: Promise<void> | null = null;
let loaded = false;

export function hasExternalAssets(): boolean {
  return Object.keys(FILES).length > 0;
}

export function externalReady(): boolean {
  return loaded || !hasExternalAssets();
}

/** Nombre canónico de hueso: sin el prefijo de Mixamo ni separadores */
function boneName(n: string): string {
  return n.replace(/^mixamorig[:_]?\d*/i, '').replace(/[:.]/g, '').toLowerCase();
}

/** Clave de acción a partir del nombre de archivo o del clip */
function actionKey(name: string): string | null {
  const n = name.toLowerCase();
  if (/death|dying|die|muert/.test(n)) return 'death';
  if (/melee|slash|sword|punch|attack|ataque/.test(n)) return 'melee';
  if (/pistol/.test(n)) return 'pistol';
  if (/fir|shoot|disparo/.test(n)) return 'shoot';
  if (/hammer|mining|dig|work|build|trabaj/.test(n)) return 'work';
  if (/run|corr/.test(n)) return 'run';
  if (/walk|andar|camin/.test(n)) return 'walk';
  if (/idle|stand|repos/.test(n)) return 'idle';
  return null;
}

/** Cadera del esqueleto: eje vertical en el espacio de su padre y altura en reposo (unidades del archivo) */
interface HipsFrame {
  /** orientación del padre de la cadera en el mundo */
  parentQ: THREE.Quaternion;
  /** eje vertical en el espacio del padre */
  up: THREE.Vector3;
  restY: number;
}

function hipsFrame(obj: THREE.Object3D): HipsFrame | undefined {
  let hips: THREE.Object3D | undefined;
  obj.traverse((o) => {
    if (!hips && boneName(o.name) === 'hips') hips = o;
  });
  if (!hips) return undefined;
  obj.updateMatrixWorld(true);
  // los archivos exportados desde Blender suelen tener el esqueleto con Z hacia arriba
  const parentQ = hips.parent ? hips.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(parentQ.clone().invert()).normalize();
  const restY = hips.position.dot(up);
  return restY > 0 ? { parentQ, up, restY } : undefined;
}

/** Prepara un clip: nombres de hueso canónicos y sin desplazamiento horizontal de la cadera */
function prepClip(clip: THREE.AnimationClip, name: string, up = new THREE.Vector3(0, 1, 0)): THREE.AnimationClip {
  const c = clip.clone();
  c.name = name;
  c.tracks = c.tracks.filter((t) => !/\.scale$/.test(t.name));
  for (const t of c.tracks) {
    const dot = t.name.lastIndexOf('.');
    const node = t.name.slice(0, dot), prop = t.name.slice(dot);
    const bone = boneName(node.split('/').pop()!);
    t.name = bone + prop;
    if (prop === '.position') {
      if (bone !== 'hips') {
        t.name = '__drop__';
        continue;
      }
      // animación en el sitio: solo se conserva el movimiento vertical de la cadera
      const v = t.values;
      const p = new THREE.Vector3(v[0], v[1], v[2]);
      const base = p.clone().addScaledVector(up, -p.dot(up));
      for (let i = 0; i < v.length; i += 3) {
        const h = p.set(v[i], v[i + 1], v[i + 2]).dot(up);
        v[i] = base.x + up.x * h;
        v[i + 1] = base.y + up.y * h;
        v[i + 2] = base.z + up.z * h;
      }
    }
  }
  c.tracks = c.tracks.filter((t) => t.name !== '__drop__');
  return c;
}

function toStandard(m: THREE.Material): THREE.MeshStandardMaterial {
  if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m as THREE.MeshStandardMaterial;
  const src = m as THREE.MeshPhongMaterial;
  const s = new THREE.MeshStandardMaterial({
    color: src.color ?? new THREE.Color(0xffffff),
    map: src.map ?? null,
    normalMap: src.normalMap ?? null,
    emissive: src.emissive ?? new THREE.Color(0),
    emissiveMap: src.emissiveMap ?? null,
    roughness: 0.65,
    metalness: 0.1,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaTest: src.alphaTest,
    side: src.side,
  });
  s.name = m.name;
  return s;
}

/** Normaliza un modelo cargado: altura 1, centrado, apoyado en el suelo y mirando a +X */
function normalize(obj: THREE.Object3D): THREE.Object3D {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const h = Math.max(size.y, 1e-4);
  const k = 1 / h;
  const inner = new THREE.Group();
  inner.add(obj);
  obj.position.x -= (box.min.x + box.max.x) / 2;
  obj.position.z -= (box.min.z + box.max.z) / 2;
  obj.position.y -= box.min.y;
  inner.scale.setScalar(k);
  const root = new THREE.Group();
  root.add(inner);
  root.rotation.y = Math.PI / 2; // glTF y Mixamo miran a +Z; el juego, a +X
  root.updateMatrixWorld(true);
  obj.traverse((o) => {
    // nodos del esqueleto con nombre canónico (también los que no pertenecen a la piel)
    if (/^mixamorig/i.test(o.name) || (o as THREE.Bone).isBone) o.name = boneName(o.name);
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toStandard) : toStandard(mesh.material);
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      // nombres de hueso canónicos para compartir animaciones entre personajes
      for (const b of (o as THREE.SkinnedMesh).skeleton.bones) b.name = boneName(b.name);
      o.frustumCulled = false;
    }
  });
  return root;
}

async function loadModel(url: string, ext: string): Promise<{ obj: THREE.Object3D; clips: THREE.AnimationClip[] }> {
  if (ext === 'fbx') {
    const fbx = await new FBXLoader().loadAsync(url);
    return { obj: fbx, clips: fbx.animations ?? [] };
  }
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const g = await loader.loadAsync(url);
  return { obj: g.scene, clips: g.animations ?? [] };
}

/** Carga todo lo que haya en assets/ (una sola vez) */
export function loadExternalAssets(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const jobs: Promise<void>[] = [];
    const texLoader = new THREE.TextureLoader();
    // texturas sueltas de modelos (p. ej. trooper.png junto a trooper.fbx) y modelos FBX (otra orientación de UV)
    const modelTex = new Map<string, THREE.Texture>();
    const fbxKeys = new Set<string>();
    for (const [path, url] of Object.entries(FILES)) {
      const m = path.match(/^\/assets\/(.+)\/([^/]+)\.(\w+)$/);
      if (!m) continue;
      const dir = m[1].toLowerCase(), name = m[2].toLowerCase(), ext = m[3].toLowerCase();
      if (dir === 'terrain' && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        jobs.push(
          texLoader.loadAsync(url).then((t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            terrainPhotos.set(name, t);
          }).catch((e) => console.warn('Textura no válida', path, e)),
        );
      } else if (dir === 'models/anims' && (ext === 'fbx' || ext === 'glb')) {
        jobs.push(
          loadModel(url, ext).then(({ obj, clips }) => {
            const key = actionKey(name) ?? name;
            if (!clips[0]) return;
            const hf = hipsFrame(obj);
            sharedClips.set(key, prepClip(clips[0], key, hf?.up));
            if (hf) sharedHips.set(key, hf);
          }).catch((e) => console.warn('Animación no válida', path, e)),
        );
      } else if (dir.startsWith('models/') && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        jobs.push(
          texLoader.loadAsync(url).then((t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            modelTex.set(dir.slice(7) + '/' + name, t);
          }).catch((e) => console.warn('Textura no válida', path, e)),
        );
      } else if (dir.startsWith('models/') && (ext === 'fbx' || ext === 'glb')) {
        const key = dir.slice(7) + '/' + name;
        if (ext === 'fbx') fbxKeys.add(key);
        jobs.push(
          loadModel(url, ext).then(({ obj, clips }) => {
            let skinned = false;
            obj.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
            const hf = skinned ? hipsFrame(obj) : undefined;
            const own = new Map<string, THREE.AnimationClip>();
            for (const c of clips) {
              const k = actionKey(c.name);
              if (k && !own.has(k)) own.set(k, prepClip(c, k, hf?.up));
            }
            extModels.set(key, { key, root: normalize(obj), skinned, clips: own, hips: hf });
          }).catch((e) => console.warn('Modelo no válido', path, e)),
        );
      }
    }
    await Promise.all(jobs);
    // una textura con el mismo nombre que el modelo sustituye a la suya (útil si Mixamo la perdió)
    for (const [key, tex] of modelTex) {
      const m = extModels.get(key);
      if (!m) continue;
      tex.flipY = fbxKeys.has(key);
      m.root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const sm = mat as THREE.MeshStandardMaterial;
          sm.map = tex;
          sm.color.set(0xffffff);
          sm.needsUpdate = true;
        }
      });
    }
    loaded = true;
    if (extModels.size || terrainPhotos.size) console.info(`Recursos propios: ${extModels.size} modelos, ${terrainPhotos.size} texturas, ${sharedClips.size} animaciones`);
  })();
  return loading;
}

/** Busca el modelo propio de una unidad o edificio (con variantes pesadas / de élite como respaldo) */
export function findExtModel(civId: string, defId: string, hero: boolean): ExtModel | undefined {
  if (!extModels.size) return undefined;
  const cands = [defId, defId.replace(/^(heavy_|elite_|adv_|repeater_)/, ''), defId.replace(/^heavy_(\w+)/, '$1')];
  if (defId === 'repeater_trooper' || defId === 'heavy_trooper') cands.push('trooper');
  if (defId.endsWith('_mounted') || defId === 'heavy_mounted') cands.push('mounted_trooper');
  for (const c of cands) {
    const m = (hero && extModels.get('heroes/' + c)) || extModels.get(civId + '/' + c);
    if (m) return m;
  }
  return undefined;
}

// ───────────────────────── material con color de equipo ─────────────────────────

/** Sustituye el magenta puro de las texturas por el color del jugador */
const TEAM_GLSL = /* glsl */ `
{
  float mgK = clamp((min(diffuseColor.r, diffuseColor.b) - diffuseColor.g) * 3.5 - 0.35, 0.0, 1.0);
  mgK *= step(0.25, max(diffuseColor.r, diffuseColor.b));
  diffuseColor.rgb = mix(diffuseColor.rgb, eTeam * (0.3 + 0.7 * max(diffuseColor.r, diffuseColor.b)), mgK);
}`;

function patchMaterial(src: THREE.Material, instanced: boolean, team: THREE.Color | null): THREE.MeshStandardMaterial {
  const m = (src as THREE.MeshStandardMaterial).clone();
  m.envMapIntensity = 0.8;
  const teamU = { value: team ? team.clone() : new THREE.Color(1, 1, 1) };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTeamCol = teamU;
    if (instanced) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec3 teamCol;
attribute vec4 instData;
varying vec3 vTeamCol;
varying vec4 vInstE;
varying float vLocY;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vTeamCol = teamCol;
vInstE = instData;
vLocY = position.y;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vTeamCol;
varying vec4 vInstE;
varying float vLocY;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vInstE.z < 0.999 && vLocY > vInstE.z * vInstE.w + 0.02) discard;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
vec3 eTeam = vTeamCol;
${TEAM_GLSL}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.0) * vInstE.y * 0.55;
if (vInstE.z < 0.999) totalEmissiveRadiance += vec3(0.3, 0.8, 1.0) * (1.0 - smoothstep(0.0, 0.12, abs(vLocY - vInstE.z * vInstE.w))) * 2.5;`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
gl_FragColor.rgb *= vInstE.x;`);
    } else {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform vec3 uTeamCol;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
vec3 eTeam = uTeamCol;
${TEAM_GLSL}`);
    }
  };
  m.customProgramCacheKey = () => (instanced ? 'extInst1' : 'extSkin1') + (m.map ? 'm' : '') + (m.normalMap ? 'n' : '');
  return m;
}

// ───────────────────────── armas para personajes con esqueleto ─────────────────────────

/** Arma sencilla para poner en la mano (el cañón mira a -Z local, como Object3D.lookAt) */
export function weaponObject(kind: 'rifle' | 'pistol' | 'saber' | 'none', saberColor: number): THREE.Object3D | null {
  if (kind === 'none') return null;
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d1e22, roughness: 0.45, metalness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8e96, roughness: 0.35, metalness: 0.8 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  };
  if (kind === 'rifle') {
    add(new THREE.BoxGeometry(0.035, 0.045, 0.32), dark, 0, 0.02, -0.08);
    add(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 10).rotateX(Math.PI / 2), dark, 0, 0.026, -0.33);
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 10).rotateX(Math.PI / 2), metal, 0, 0.06, -0.08);
    add(new THREE.BoxGeometry(0.02, 0.06, 0.025), dark, 0, -0.02, 0.0);
  } else if (kind === 'pistol') {
    add(new THREE.BoxGeometry(0.028, 0.035, 0.13), dark, 0, 0.02, -0.05);
    add(new THREE.CylinderGeometry(0.009, 0.009, 0.08, 8).rotateX(Math.PI / 2), metal, 0, 0.026, -0.14);
    add(new THREE.BoxGeometry(0.02, 0.05, 0.025), dark, 0, -0.01, 0.0);
  } else {
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 10), metal, 0, 0, 0);
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.7, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(saberColor).multiplyScalar(1.8), toneMapped: false }));
    blade.position.set(0, 0.4, 0);
    g.add(blade);
    g.rotation.x = -Math.PI / 2;
    const w = new THREE.Group();
    w.add(g);
    return w;
  }
  return g;
}

// ───────────────────────── lotes de dibujo ─────────────────────────

export interface DrawBatch {
  def: { height: number; radius: number };
  hasBob: boolean;
  begin(): void;
  push(base: THREE.Matrix4, color: THREE.Color, saber: THREE.Color | null, brightness: number, flash: number, progress: number, anim: AnimState | null, id?: number): void;
  commit(hasHolo: boolean): void;
}

/** Modelo estático (vehículos, edificios): instancias por cada malla del archivo */
export class ExtStaticBatch implements DrawBatch {
  def: { height: number; radius: number };
  hasBob: boolean;
  private parts: { mesh: THREE.InstancedMesh; inst: THREE.InstancedBufferAttribute; team: THREE.InstancedBufferAttribute }[] = [];
  private cap = 0;
  private count = 0;
  private tmp = new THREE.Matrix4();
  private local: THREE.Matrix4[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private mats: THREE.Material[] = [];

  /** fitFootprint: los edificios se escalan para no salirse de su parcela (sin pasar de 1,5 veces la altura del generado) */
  constructor(src: ExtModel, private group: THREE.Group, height: number, radius: number, bob: boolean, private shadows: boolean, fitFootprint = false) {
    src.root.updateMatrixWorld(true);
    let scale = height;
    if (fitFootprint) {
      let r = 0;
      const v = new THREE.Vector3();
      src.root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const pos = mesh.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
          r = Math.max(r, Math.hypot(v.x, v.z));
        }
      });
      if (r > 0) scale = Math.min(radius / r, height * 1.5);
    }
    this.def = { height: scale, radius };
    this.hasBob = bob;
    src.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // escala de la altura normalizada (1) a la del juego
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      g.applyMatrix4(new THREE.Matrix4().makeScale(scale, scale, scale));
      if (mats.length > 1 && g.groups.length) {
        // un lote por material
        for (const gr of g.groups) {
          const sub = g.clone();
          sub.clearGroups();
          sub.setDrawRange(gr.start, gr.count);
          this.geos.push(sub);
          this.mats.push(patchMaterial(mats[gr.materialIndex ?? 0], true, null));
        }
      } else {
        this.geos.push(g);
        this.mats.push(patchMaterial(mats[0], true, null));
      }
    });
    this.alloc(16);
  }

  private alloc(cap: number) {
    for (const p of this.parts) {
      this.group.remove(p.mesh);
      p.mesh.dispose();
    }
    const old = this.parts;
    this.parts = [];
    this.geos.forEach((g, i) => {
      const inst = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      const team = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      if (old[i]) {
        (inst.array as Float32Array).set((old[i].inst.array as Float32Array).subarray(0, Math.min(old[i].inst.array.length, cap * 4)));
        (team.array as Float32Array).set((old[i].team.array as Float32Array).subarray(0, Math.min(old[i].team.array.length, cap * 3)));
      }
      const geo = g.clone();
      geo.setAttribute('instData', inst);
      geo.setAttribute('teamCol', team);
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const mesh = new THREE.InstancedMesh(geo, this.mats[i], cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = this.shadows;
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      this.parts.push({ mesh, inst, team });
    });
    this.cap = cap;
  }

  begin() {
    this.count = 0;
  }

  push(base: THREE.Matrix4, color: THREE.Color, _saber: THREE.Color | null, brightness: number, flash: number, progress: number) {
    if (this.count >= this.cap) {
      const c = this.count;
      this.alloc(this.cap * 2);
      this.count = c;
    }
    const i = this.count++;
    for (const p of this.parts) {
      p.mesh.setMatrixAt(i, base);
      const d = p.inst.array as Float32Array;
      d[i * 4] = brightness;
      d[i * 4 + 1] = flash;
      d[i * 4 + 2] = progress;
      d[i * 4 + 3] = this.def.height;
      const t = p.team.array as Float32Array;
      t[i * 3] = color.r;
      t[i * 3 + 1] = color.g;
      t[i * 3 + 2] = color.b;
    }
  }

  commit() {
    for (const p of this.parts) {
      p.mesh.count = this.count;
      p.mesh.instanceMatrix.needsUpdate = true;
      p.inst.needsUpdate = true;
      p.team.needsUpdate = true;
    }
  }
}

interface SkinUnit {
  obj: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  cur: string;
  last: number;
  seen: number;
}

/** Personajes con esqueleto: una copia animada por unidad visible */
export class ExtSkinnedBatch implements DrawBatch {
  def: { height: number; radius: number };
  hasBob = false;
  private units = new Map<number, SkinUnit>();
  private frame = 0;
  private matCache = new Map<number, Map<THREE.Material, THREE.Material>>();
  private weapon: THREE.Object3D | null;
  private scaledClips = new Map<string, THREE.AnimationClip | undefined>();

  constructor(private src: ExtModel, private group: THREE.Group, height: number, radius: number, private shadows: boolean, weapon: THREE.Object3D | null, private melee: boolean, private pistol: boolean) {
    this.def = { height, radius };
    this.weapon = weapon;
  }

  begin() {
    this.frame++;
  }

  private clipFor(key: string): THREE.AnimationClip | undefined {
    const alt: Record<string, string[]> = {
      walk: ['walk', 'run'], run: ['run', 'walk'], idle: ['idle'], shoot: ['shoot', 'pistol', 'melee'], pistol: ['pistol', 'shoot'],
      melee: ['melee', 'shoot'], work: ['work', 'melee', 'idle'], death: ['death'],
    };
    for (const k of alt[key] ?? [key]) {
      const own = this.src.clips.get(k);
      if (own) return own;
      const c = this.sharedFor(k);
      if (c) return c;
    }
    return undefined;
  }

  /** Animación compartida adaptada a este esqueleto: altura de la cadera (Yoda no flota, Chewbacca no se hunde) y orientación (Y o Z hacia arriba) */
  private sharedFor(k: string): THREE.AnimationClip | undefined {
    if (this.scaledClips.has(k)) return this.scaledClips.get(k);
    let c = sharedClips.get(k);
    const from = sharedHips.get(k), to = this.src.hips;
    if (c && from && to) {
      const ratio = to.restY / from.restY;
      const conv = to.parentQ.clone().invert().multiply(from.parentQ);
      const rotate = 1 - Math.abs(conv.w) > 1e-6;
      if (rotate || Math.abs(ratio - 1) > 0.02) {
        c = c.clone();
        const v = new THREE.Vector3(), q = new THREE.Quaternion();
        for (const t of c.tracks) {
          if (t.name === 'hips.position') {
            t.values = t.values.slice();
            for (let i = 0; i < t.values.length; i += 3) {
              v.fromArray(t.values, i).applyQuaternion(conv).multiplyScalar(ratio).toArray(t.values, i);
            }
          } else if (rotate && t.name === 'hips.quaternion') {
            t.values = t.values.slice();
            for (let i = 0; i < t.values.length; i += 4) q.fromArray(t.values, i).premultiply(conv).toArray(t.values, i);
          }
        }
      }
    }
    this.scaledClips.set(k, c);
    return c;
  }

  private make(color: THREE.Color): SkinUnit {
    // contenedor con la transformación del juego; dentro, el modelo normalizado (girado a +X)
    const obj = new THREE.Group();
    const inner = SkeletonUtils.clone(this.src.root);
    obj.add(inner);
    const hex = color.getHex();
    let cache = this.matCache.get(hex);
    if (!cache) this.matCache.set(hex, (cache = new Map()));
    inner.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = this.shadows;
      const fix = (m: THREE.Material) => {
        let pm = cache!.get(m);
        if (!pm) cache!.set(m, (pm = patchMaterial(m, false, color)));
        return pm;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
    });
    inner.scale.multiplyScalar(this.def.height);
    // arma en la mano derecha
    if (this.weapon) {
      let hand: THREE.Object3D | undefined;
      inner.traverse((o) => { if (!hand && /^righthand$/.test(o.name)) hand = o; });
      if (hand) {
        // orientación: el cañón hacia delante del personaje en la pose de reposo
        obj.updateMatrixWorld(true);
        const hq = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
        const hs = hand.getWorldScale(new THREE.Vector3());
        const objQ = obj.getWorldQuaternion(new THREE.Quaternion());
        const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(objQ).applyQuaternion(hq).normalize();
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(objQ).applyQuaternion(hq).normalize();
        const wq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), fwd, up));
        const w = this.weapon.clone();
        w.quaternion.copy(wq);
        const ws = obj.getWorldScale(new THREE.Vector3()).y / Math.max(hs.y, 1e-6);
        w.scale.setScalar(ws);
        hand.add(w);
      }
    }
    const mixer = new THREE.AnimationMixer(inner);
    const u: SkinUnit = { obj, mixer, actions: new Map(), cur: '', last: -1, seen: this.frame };
    this.group.add(obj);
    return u;
  }

  private play(u: SkinUnit, key: string) {
    if (u.cur === key) return;
    const clip = this.clipFor(key);
    if (!clip) return;
    let a = u.actions.get(key);
    if (!a) {
      a = u.mixer.clipAction(clip);
      if (key === 'death') {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      u.actions.set(key, a);
    }
    const prev = u.cur ? u.actions.get(u.cur) : undefined;
    a.reset().play();
    if (prev && prev !== a) a.crossFadeFrom(prev, 0.2, false);
    u.cur = key;
  }

  push(base: THREE.Matrix4, color: THREE.Color, _saber: THREE.Color | null, brightness: number, _flash: number, _progress: number, anim: AnimState | null, id = 0) {
    let u = this.units.get(id);
    if (!u) {
      u = this.make(color);
      this.units.set(id, u);
    }
    u.seen = this.frame;
    u.obj.visible = true;
    // la matriz del juego ya incluye la escala de render; el modelo interior está normalizado a la altura del juego
    base.decompose(u.obj.position, u.obj.quaternion, u.obj.scale);
    void brightness;
    if (anim) {
      const dead = !!anim.dead;
      const key = dead ? 'death' : anim.attackT < 0.7 ? (this.melee ? 'melee' : this.pistol ? 'pistol' : 'shoot') : anim.workT < 0.5 ? 'work' : anim.walkAmp > 0 ? 'walk' : 'idle';
      this.play(u, key);
      const dt = u.last < 0 ? 0 : Math.min(0.1, Math.max(0, anim.time - u.last));
      u.last = anim.time;
      u.mixer.update(dt);
    }
  }

  commit() {
    for (const [id, u] of this.units) {
      if (u.seen === this.frame) continue;
      u.obj.visible = false;
      // fuera de vista mucho tiempo: liberar
      if (this.frame - u.seen > 600) {
        this.group.remove(u.obj);
        u.mixer.stopAllAction();
        this.units.delete(id);
      }
    }
  }
}
