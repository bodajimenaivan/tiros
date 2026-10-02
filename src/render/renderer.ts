// Renderizador principal del juego.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { World } from '../sim/world';
import { TICK } from '../sim/world';
import type { Entity } from '../sim/entity';
import type { GameEvent } from '../sim/types';
import { TerrainRenderer } from './terrain';
import { ModelBatch, type AnimState } from './instances';
import { createModelMaterial, createHologramMaterial, sharedUniforms } from './materials';
import { buildUnitModel } from './models/unitModels';
import { buildBuildingModel } from './models/buildingModels';
import { buildTree, buildResource, buildDecor, buildLandmark } from './models/natureModels';
import type { ModelDef } from './models/builder';
import { Effects } from './effects';
import { PLAYER_COLORS, GAIA_COLOR } from '../data/civs';
import { BOLT_COLORS } from '../sim/combat';
import { SABER } from '../data/units';

export interface RenderSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  shadows: boolean;
  bloom: boolean;
  pixelRatio: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();
const tmpC2 = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uSat: { value: 1.08 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uVig; uniform float uSat; uniform vec3 uTint; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, uSat) * uTint;
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * uVig * 2.2;
      c.rgb *= clamp(v, 0.0, 1.0);
      gl_FragColor = c;
    }`,
};

export class GameRenderer {
  w: World;
  viewer: number;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer | null = null;
  bloom: UnrealBloomPass | null = null;
  terrain: TerrainRenderer;
  effects: Effects;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  settings: RenderSettings;
  container: HTMLElement;
  // cámara RTS
  camTarget = new THREE.Vector3();
  camDist = 26;
  camYaw = Math.PI / 4;
  camPitch = 0.95;
  revealAll = false;
  // modelos
  private material: THREE.MeshStandardMaterial;
  private vegMaterial: THREE.MeshStandardMaterial;
  private holoMat: THREE.ShaderMaterial;
  private batches = new Map<string, ModelBatch>();
  private staticBatches = new Map<string, ModelBatch>();
  private modelCache = new Map<string, ModelDef>();
  private unitGroup = new THREE.Group();
  private staticGroup = new THREE.Group();
  private staticDirty = true;
  private staticTimer = 0;
  private lastResCount = -1;
  // selección
  selected = new Set<number>();
  hovered = 0;
  private rings: THREE.InstancedMesh;
  private ringCount = 0;
  private ghost: THREE.Group | null = null;
  private ghostKey = '';
  private ghostMat: THREE.MeshBasicMaterial;
  private rally: THREE.Mesh;
  private markers: { x: number; y: number; t: number; color: number }[] = [];
  private sky: THREE.Mesh;
  private time = 0;
  private seenBuildings = new Set<number>();
  private raycaster = new THREE.Raycaster();
  /** posiciones de pantalla calculadas en el último frame (para barras de vida y selección) */
  screenPos = new Map<number, { x: number; y: number; r: number; visible: boolean }>();
  private frame = 0;

  constructor(container: HTMLElement, w: World, viewer: number, settings: RenderSettings) {
    this.container = container;
    this.w = w;
    this.viewer = viewer;
    this.settings = settings;
    const pl = w.planet;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * settings.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 900);

    // ── Cielo y niebla ──
    this.scene.fog = new THREE.FogExp2(pl.sky.fog, pl.sky.fogDensity);
    this.scene.background = new THREE.Color(pl.sky.fog);
    this.sky = this.makeSky();
    this.scene.add(this.sky);

    // ── Luces ──
    this.hemi = new THREE.HemisphereLight(pl.sky.top, pl.sky.hemiGround, pl.sky.ambient * 1.6);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(pl.sky.sun, pl.sky.sunIntensity);
    this.sun.castShadow = settings.shadows;
    const sm = settings.quality === 'ultra' ? 4096 : settings.quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 220;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    const amb = new THREE.AmbientLight(0xffffff, 0.12);
    this.scene.add(amb);

    // ── Terreno ──
    this.terrain = new TerrainRenderer(w, this.scene);

    // ── Modelos ──
    this.material = createModelMaterial();
    this.vegMaterial = createModelMaterial({ roughness: 0.85, metalness: 0 });
    this.vegMaterial.onBeforeCompile = ((orig) => (shader: any, r: any) => {
      orig(shader, r);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float sway = max(0.0, position.y - 0.6) * 0.05;
          transformed.x += sin(uTime * 1.3 + ip.x * 0.7 + ip.z * 0.3) * sway;
          transformed.z += cos(uTime * 1.1 + ip.z * 0.6) * sway * 0.7;
        }`,
      );
    })(this.vegMaterial.onBeforeCompile);
    this.vegMaterial.customProgramCacheKey = () => 'swVeg1';
    this.holoMat = createHologramMaterial();
    this.scene.add(this.unitGroup, this.staticGroup);

    // ── Efectos ──
    this.effects = new Effects(this.scene);
    if (pl.snow) this.effects.setWeather('snow');
    else if (pl.ash) this.effects.setWeather('ash');
    else if (pl.rain) this.effects.setWeather('rain');
    else if (pl.dust) this.effects.setWeather('dust');

    // ── Anillos de selección ──
    const rg = new THREE.RingGeometry(0.9, 1.0, 40);
    rg.rotateX(-Math.PI / 2);
    const rm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
    this.rings = new THREE.InstancedMesh(rg, rm, 1024);
    this.rings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(1024 * 3), 3);
    this.rings.frustumCulled = false;
    this.rings.renderOrder = 3;
    this.scene.add(this.rings);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x40ff60, transparent: true, opacity: 0.45, depthWrite: false });
    const flagG = new THREE.ConeGeometry(0.18, 0.7, 4);
    flagG.translate(0, 0.35, 0);
    this.rally = new THREE.Mesh(flagG, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    this.rally.visible = false;
    this.scene.add(this.rally);

    this.setupPost();
    const p = w.players[viewer];
    if (p) this.centerOn(p.startX, p.startY);
    else this.centerOn(w.N / 2, w.N / 2);
    this.resize();
  }

  private makeSky(): THREE.Mesh {
    const pl = this.w.planet;
    const g = new THREE.SphereGeometry(500, 32, 16);
    const extra = pl.id === 'tatooine' ? 1 : pl.id === 'endor' || pl.id === 'yavin4' ? 2 : pl.id === 'geonosis' ? 3 : 0;
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(pl.sky.top) },
        uBot: { value: new THREE.Color(pl.sky.bottom) },
        uFog: { value: new THREE.Color(pl.sky.fog) },
        uSunDir: { value: new THREE.Vector3() },
        uSun: { value: new THREE.Color(pl.sky.sun) },
        uExtra: { value: extra },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uFog; uniform vec3 uSunDir; uniform vec3 uSun; uniform int uExtra; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 c = mix(uBot, uTop, smoothstep(-0.05, 0.6, h));
          c = mix(uFog, c, smoothstep(-0.2, 0.15, h));
          float s = max(dot(vDir, normalize(uSunDir)), 0.0);
          c += uSun * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.25);
          if (uExtra == 1) { vec3 d2 = normalize(uSunDir + vec3(0.12, -0.03, 0.08)); float s2 = max(dot(vDir, d2), 0.0); c += vec3(1.0, 0.8, 0.6) * pow(s2, 900.0) * 4.0; }
          if (uExtra == 2) { vec3 pd = normalize(vec3(-0.6, 0.35, -0.5)); float pp = dot(vDir, pd); if (pp > 0.985) { float k = (pp - 0.985) / 0.015; c = mix(c, vec3(0.75, 0.55, 0.4) * (0.6 + 0.4 * sin(vDir.y * 120.0)), smoothstep(0.0, 0.08, k)); } }
          if (uExtra == 3) { float band = abs(vDir.y - 0.25 + vDir.x * 0.3); c += vec3(0.4, 0.25, 0.15) * smoothstep(0.03, 0.0, band) * 0.6; }
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    return mesh;
  }

  private setupPost() {
    const s = this.settings;
    if (s.quality === 'low') {
      this.composer = null;
      return;
    }
    const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: s.quality === 'medium' ? 2 : 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (s.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.4, 0.92);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    const grade = new ShaderPass(GradeShader);
    this.composer.addPass(grade);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
  }

  // ─────────────────────────── Cámara ───────────────────────────

  centerOn(x: number, y: number) {
    this.camTarget.set(x, this.w.map.surfaceAt(x, y), y);
  }

  pan(dx: number, dy: number) {
    // dx, dy en "tiles" relativos a la pantalla
    const c = Math.cos(this.camYaw), s = Math.sin(this.camYaw);
    const k = this.camDist / 30;
    const fx = -s, fz = -c; // adelante en pantalla
    const rx = c, rz = -s; // derecha
    this.camTarget.x += (rx * dx - fx * dy) * k;
    this.camTarget.z += (rz * dx - fz * dy) * k;
    const N = this.w.N;
    this.camTarget.x = Math.max(0, Math.min(N, this.camTarget.x));
    this.camTarget.z = Math.max(0, Math.min(N, this.camTarget.z));
  }

  zoom(f: number) {
    this.camDist = Math.max(10, Math.min(78, this.camDist * f));
  }

  rotate(d: number) {
    this.camYaw += d;
  }

  updateCamera() {
    const N = this.w.N;
    const ty = this.w.map.surfaceAt(Math.max(0, Math.min(N - 0.01, this.camTarget.x)), Math.max(0, Math.min(N - 0.01, this.camTarget.z)));
    this.camTarget.y += (ty - this.camTarget.y) * 0.15;
    const pitch = this.camPitch + (this.camDist < 22 ? (22 - this.camDist) * -0.012 : 0);
    const d = this.camDist;
    const cx = this.camTarget.x + Math.sin(this.camYaw) * Math.cos(pitch) * d;
    const cz = this.camTarget.z + Math.cos(this.camYaw) * Math.cos(pitch) * d;
    const cy = this.camTarget.y + Math.sin(pitch) * d;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.camTarget);
    // sol y sombras siguiendo la cámara
    const sa = this.w.planet.sunAngle ?? 0.8;
    const sunDir = tmpV.set(Math.cos(sa) * 0.6, 0.75, Math.sin(sa) * 0.55).normalize();
    this.sun.position.copy(this.camTarget).addScaledVector(sunDir, 80);
    this.sun.target.position.copy(this.camTarget);
    const span = Math.max(20, d * 1.15);
    const sc = this.sun.shadow.camera;
    sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span;
    sc.updateProjectionMatrix();
    (this.sky.material as THREE.ShaderMaterial).uniforms.uSunDir.value.copy(sunDir);
    this.sky.position.copy(this.camera.position);
  }

  // ─────────────────────────── Modelos ───────────────────────────

  private model(key: string, make: () => ModelDef): ModelDef {
    let m = this.modelCache.get(key);
    if (!m) {
      m = make();
      this.modelCache.set(key, m);
    }
    return m;
  }

  private batch(key: string, make: () => ModelDef, holo = false): ModelBatch {
    let b = this.batches.get(key);
    if (!b) {
      b = new ModelBatch(this.model(key, make), this.unitGroup, this.material, { shadows: this.settings.shadows, holo: holo ? this.holoMat : null });
      this.batches.set(key, b);
    }
    return b;
  }

  private staticBatch(key: string, make: () => ModelDef, veg: boolean): ModelBatch {
    let b = this.staticBatches.get(key);
    if (!b) {
      b = new ModelBatch(this.model(key, make), this.staticGroup, veg ? this.vegMaterial : this.material, { shadows: this.settings.shadows, isStatic: true });
      this.staticBatches.set(key, b);
    }
    return b;
  }

  unitModelKey(e: Entity): string {
    const p = this.w.players[e.owner];
    return 'u:' + p.civ.style + ':' + e.defId;
  }

  getUnitModel(defId: string, owner: number): ModelDef {
    const p = this.w.players[owner];
    const key = 'u:' + p.civ.style + ':' + defId;
    return this.model(key, () => buildUnitModel(defId, p.civ.style, p.civ.saber));
  }

  // ─────────────────────────── Visibilidad ───────────────────────────

  private visibleTile(x: number, y: number): number {
    // 2 = visible, 1 = explorado, 0 = oculto
    if (this.revealAll) return 2;
    const p = this.w.players[this.viewer];
    if (!p) return 2;
    const N = this.w.N;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return 0;
    const i = ty * N + tx;
    return p.visible[i] ? 2 : p.explored[i] ? 1 : 0;
  }

  private teamColor(owner: number): THREE.Color {
    if (owner === 0) return tmpC.setHex(GAIA_COLOR.hex);
    const p = this.w.players[owner];
    return tmpC.setHex(PLAYER_COLORS[p.color]?.hex ?? 0xffffff);
  }

  // ─────────────────────────── Frame ───────────────────────────

  render(realDt: number, alpha: number) {
    this.frame++;
    this.time += realDt;
    sharedUniforms.uTime.value = this.time;
    const w = this.w;
    const gt = w.time + alpha * TICK; // tiempo de juego interpolado
    this.updateCamera();
    this.terrain.updateFog(this.viewer, realDt, this.revealAll);

    // límites de vista aproximados para descarte
    const cx = this.camTarget.x, cz = this.camTarget.z;
    const viewR = this.camDist * 1.25 + 8;

    // ── Edificios y unidades ──
    for (const b of this.batches.values()) b.begin();
    this.ringCount = 0;
    this.effects.beginShields();
    this.screenPos.clear();

    for (const e of w.buildings) {
      if (!e.alive) continue;
      if (Math.abs(e.x - cx) > viewR || Math.abs(e.y - cz) > viewR) continue;
      const vis = this.visibleTile(e.x, e.y);
      const own = e.owner === this.viewer || w.players[this.viewer]?.isAlly(e.owner);
      if (vis === 2) this.seenBuildings.add(e.id);
      if (!own && vis < 2 && !this.seenBuildings.has(e.id)) continue;
      if (vis === 0) continue;
      const p = w.players[e.owner];
      const key = 'b:' + p.civ.style + ':' + e.defId;
      const bt = this.batch(key, () => buildBuildingModel(e.defId, p.civ.style), true);
      const h = this.buildingHeight(e);
      tmpM.makeTranslation(e.x, h, e.y);
      const flash = Math.max(0, 1 - (gt - e.lastHitTime) * 5) * 0.25 + (this.hovered === e.id ? 0.12 : 0);
      bt.push(tmpM, this.teamColor(e.owner), null, vis === 2 ? 1 : 0.55, flash, e.built ? 1 : Math.max(0.02, e.progress), this.buildingAnim(e, gt));
      this.recordScreen(e, h + bt.def.height + 0.3, e.size * 0.6);
      if (this.selected.has(e.id) || this.hovered === e.id) this.addRing(e.x, h + 0.08, e.y, e.size * 0.68, e.owner, this.selected.has(e.id));
      // escudo y fuego
      if (e.built && e.bd!.shieldRadius && vis === 2) this.effects.shield(e.x, h, e.y, w.players[e.owner].stats_of(e.defId).shieldRadius);
      if (e.built && e.fireDamage > 0.45 && vis === 2 && this.frame % 3 === 0) {
        const fx = e.x + (Math.random() - 0.5) * e.size * 0.6, fz = e.y + (Math.random() - 0.5) * e.size * 0.6;
        this.effects.fire(fx, h + bt.def.height * 0.5, fz, 0.5 + e.size * 0.15);
        if (Math.random() < 0.5) this.effects.smokePuff(fx, h + bt.def.height * 0.7, fz, 0.15, 0.6 + e.size * 0.2);
      }
      // punto de reunión
    }

    const viewerP = w.players[this.viewer];
    for (const e of w.units) {
      if (!e.alive) continue;
      const x = e.px + (e.x - e.px) * alpha;
      const y = e.py + (e.y - e.py) * alpha;
      if (Math.abs(x - cx) > viewR || Math.abs(y - cz) > viewR) continue;
      const own = e.owner === this.viewer || (viewerP && viewerP.isAlly(e.owner));
      if (!own && this.visibleTile(x, y) < 2) continue;
      this.drawUnit(e, x, y, gt, alpha, false);
    }
    // cadáveres
    for (const e of w.corpses) {
      if (e.kind !== 'unit' || e.isAir) continue;
      if (Math.abs(e.x - cx) > viewR || Math.abs(e.y - cz) > viewR) continue;
      if (this.visibleTile(e.x, e.y) < 1) continue;
      this.drawUnit(e, e.x, e.y, gt, 1, true);
    }
    // holocrones
    for (const h of w.holocrons) {
      if (h.templeId) continue;
      const carrier = h.carrierId ? w.get(h.carrierId) : null;
      let x = h.x, y = h.y, z = w.map.surfaceAt(h.x, h.y);
      if (carrier) {
        x = carrier.px + (carrier.x - carrier.px) * alpha;
        y = carrier.py + (carrier.y - carrier.py) * alpha;
        z = carrier.z + 0.6;
        const own = carrier.owner === this.viewer || viewerP?.isAlly(carrier.owner);
        if (!own && this.visibleTile(x, y) < 2) continue;
      } else if (this.visibleTile(x, y) < 1) continue;
      const bt = this.batch('holocron', () => buildResource('holocron', 0, this.w.planet.biome));
      tmpM.makeTranslation(x, z, y);
      if (carrier) tmpM.scale(tmpS.set(0.6, 0.6, 0.6));
      bt.push(tmpM, this.teamColor(0), null, 1, 0, 1, { walk: 0, walkAmp: 0, attackT: 9, melee: false, workT: 9, time: this.time, seed: h.id, spin: 0 });
      this.screenPos.set(h.id, { ...this.project(x, z + 1, y), r: 12, visible: true });
    }
    for (const b of this.batches.values()) b.commit(true);

    // ── Estáticos (árboles, recursos, decoración) ──
    this.staticTimer -= realDt;
    const alive = w.resources.length;
    if (this.staticDirty || this.staticTimer <= 0 || alive !== this.lastResCount) {
      this.rebuildStatic();
      this.staticTimer = 0.7;
      this.lastResCount = alive;
      this.staticDirty = false;
    }

    // ── Anillos de recursos seleccionados ──
    for (const id of this.selected) {
      const e = w.entities.get(id);
      if (e && e.kind === 'resource' && e.alive) this.addRing(e.x, w.map.surfaceAt(e.x, e.y) + 0.05, e.y, 0.6, 0, true);
    }
    // marcadores de orden
    this.markers = this.markers.filter((m) => this.time - m.t < 0.6);
    for (const m of this.markers) {
      const k = (this.time - m.t) / 0.6;
      this.addRingColor(m.x, w.map.surfaceAt(m.x, m.y) + 0.06, m.y, 0.6 * (1 - k) + 0.2, m.color);
    }
    this.rings.count = this.ringCount;
    this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;

    // punto de reunión del edificio seleccionado
    this.rally.visible = false;
    if (this.selected.size === 1) {
      const e = w.get([...this.selected][0]);
      if (e && e.kind === 'building' && e.owner === this.viewer && e.rallyX >= 0) {
        this.rally.visible = true;
        this.rally.position.set(e.rallyX, w.map.surfaceAt(e.rallyX, e.rallyY), e.rallyY);
        (this.rally.material as THREE.MeshBasicMaterial).color.copy(this.teamColor(e.owner)).multiplyScalar(1.5);
        this.rally.rotation.y = this.time * 2;
      }
    }

    // ── Proyectiles ──
    this.effects.beginProjectiles();
    for (const p of w.projectiles) {
      if (p.done || p.t < 0) continue;
      const tt = Math.min(1, (p.t + alpha * TICK) / p.dur);
      const x = p.sx + (p.tx - p.sx) * tt, y = p.sy + (p.ty - p.sy) * tt;
      const z = p.sz + (p.tz - p.sz) * tt + Math.sin(tt * Math.PI) * p.arc;
      if (Math.abs(x - cx) > viewR || Math.abs(y - cz) > viewR) continue;
      if (this.visibleTile(x, y) < 2 && p.owner !== this.viewer) continue;
      const dx = p.tx - p.sx, dy = p.tz - p.sz + Math.cos(tt * Math.PI) * p.arc * Math.PI, dz = p.ty - p.sy;
      switch (p.kind) {
        case 'bolt':
        case 'arrow':
          this.effects.bolt(x, z, y, dx, dy, dz, 0.75, 1.0, p.color, 5);
          break;
        case 'heavyBolt':
          this.effects.bolt(x, z, y, dx, dy, dz, 1.1, 1.8, p.color, 6);
          break;
        case 'ion':
          this.effects.ball(x, z, y, 1.6, 0x6ac8ff, 4);
          if (this.frame % 2 === 0) this.effects.add.spawn(x, z, y, 0, 0, 0, 0.25, 0.3, 0.05, 0.5, 1.2, 2.5, 0.8);
          break;
        case 'energyBall':
          this.effects.ball(x, z, y, 1.4, 0x6aff8a, 4);
          break;
        case 'missile':
          this.effects.ball(x, z, y, 0.6, 0xffffff, 1);
          this.effects.add.spawn(x, z, y, 0, 0, 0, 0.12, 0.25, 0.1, 2.5, 1.4, 0.5, 1);
          this.effects.alpha.spawn(x, z, y, 0, 0.2, 0, 0.9, 0.12, 0.5, 0.7, 0.7, 0.7, 0.45, { drag: 1 });
          break;
        case 'grenade':
          this.effects.ball(x, z, y, 0.5, w.players[p.owner].civ.id === 'gungans' ? 0x6aff8a : 0xff8a3a, 3);
          break;
        case 'shell':
          this.effects.ball(x, z, y, 0.9, 0xffa040, 3);
          if (this.frame % 2 === 0) this.effects.alpha.spawn(x, z, y, 0, 0.1, 0, 0.8, 0.15, 0.5, 0.5, 0.5, 0.5, 0.4, { drag: 1 });
          break;
        case 'bomb':
          this.effects.ball(x, z, y, 0.9, 0xff6a2a, 2);
          break;
      }
    }
    this.effects.endProjectiles();
    this.effects.endShields();

    // ── Clima ──
    this.effects.updateWeather(realDt, cx, cz, this.camDist * 0.8, this.camTarget.y);
    this.effects.update(realDt, this.time);

    if (this.composer) this.composer.render(realDt);
    else this.renderer.render(this.scene, this.camera);
  }

  private buildingHeight(e: Entity): number {
    const m = this.w.map;
    let s = 0, mn = 1e9;
    for (const [dx, dy] of [[0, 0], [e.size, 0], [0, e.size], [e.size, e.size]]) {
      const h = m.heightAt(e.tx + dx, e.ty + dy);
      s += h;
      mn = Math.min(mn, h);
    }
    return Math.max(mn, s / 4 - 0.1);
  }

  private buildingAnim(e: Entity, gt: number): AnimState {
    return { walk: 0, walkAmp: 0, attackT: gt - e.attackAnim, melee: false, workT: 9, time: this.time, seed: e.id * 1.7, spin: 0 };
  }

  private drawUnit(e: Entity, x: number, y: number, gt: number, alpha: number, dead: boolean) {
    const w = this.w;
    const p = w.players[e.owner];
    const ud = e.ud!;
    const key = 'u:' + p.civ.style + ':' + e.defId;
    const bt = this.batch(key, () => buildUnitModel(e.defId, p.civ.style, p.civ.saber));
    let z = w.map.surfaceAt(x, y);
    if (!e.isAir && w.map.liquid !== 'none' && w.map.liquid !== 'ice' && w.map.heightAt(x, y) < w.map.waterLevel) z = w.map.waterLevel - 0.22;
    let ang = e.pangle + angleDiff(e.pangle, e.angle) * alpha;
    let roll = 0, pitch = 0;
    let scale = e.isAir ? 1.2 : ud.cls === 'hero' ? 1.3 : ud.cls === 'animal' ? 0.85 : 1.25;
    let bright = 1;
    let yoff = 0;
    if (e.isAir) {
      z += e.flyZ + Math.sin(this.time * 1.7 + e.id) * 0.15;
      roll = -angleDiff(e.pangle, e.angle) * 6;
      roll = Math.max(-0.7, Math.min(0.7, roll));
      if (!e.moving && !dead) {
        // planeo en círculos lento
        roll += Math.sin(this.time + e.id) * 0.08;
      }
    } else if (bt.hasBob && !dead) yoff = Math.sin(this.time * 2.2 + e.id) * 0.04;
    if (dead) {
      const t = gt - e.deathTime;
      const mech = ud.tags.includes('mech') || ud.tags.includes('droid');
      const k = Math.min(1, t / 0.6);
      if (mech) {
        roll = k * 0.35;
        bright = 0.35;
      } else roll = k * (Math.PI / 2) * (e.id % 2 ? 1 : -1);
      if (t > 6) yoff = -(t - 6) * 0.25;
      if (t > 10) return;
      bright *= 0.85;
    }
    tmpE.set(roll, -ang, pitch, 'YXZ');
    // orden: yaw primero y luego roll alrededor del eje de avance
    tmpQ.setFromAxisAngle(UP, -ang);
    const qr = new THREE.Quaternion().setFromAxisAngle(tmpV.set(1, 0, 0), roll);
    tmpQ.multiply(qr);
    tmpS.set(scale, scale, scale);
    tmpM.compose(tmpV.set(x, z + yoff, y), tmpQ, tmpS);
    const flash = dead ? 0 : Math.max(0, 1 - (gt - e.lastHitTime) * 6) * 0.35 + (this.hovered === e.id ? 0.15 : 0);
    const stride = ud.radius > 0.6 ? 2.4 : ud.radius > 0.35 ? 1.2 : 0.62;
    const anim: AnimState = {
      walk: (e.distMoved / stride) * Math.PI * 2,
      walkAmp: dead ? 0 : e.moving ? 1 : 0,
      attackT: dead ? 9 : gt - e.attackAnim,
      melee: ud.attack?.type === 'melee' || !!ud.saberColor,
      workT: dead ? 9 : gt - e.workAnim,
      time: this.time,
      seed: e.id * 0.37,
      spin: e.distMoved / 0.5,
    };
    const saber = ud.saberColor ?? (ud.cls === 'jediKnight' || ud.cls === 'jediMaster' ? p.civ.saber : SABER.blue);
    bt.push(tmpM, this.teamColor(e.owner), tmpC2.setHex(saber), bright, flash, 1, anim);
    if (!dead) {
      this.recordScreen(e, z + bt.def.height + 0.25, Math.max(10, e.radius * 30));
      if (this.selected.has(e.id) || this.hovered === e.id) {
        const gy = e.isAir ? w.map.surfaceAt(x, y) + 0.06 : z + 0.04;
        this.addRing(x, gy, y, Math.max(0.35, e.radius * 1.35), e.owner, this.selected.has(e.id));
      }
      if (ud.shieldAura) this.effects.shield(x, z, y, w.players[e.owner].stats_of(e.defId).shieldRadius);
    }
  }

  private recordScreen(e: Entity, topY: number, r: number) {
    const s = this.project(e.x, topY, e.y);
    this.screenPos.set(e.id, { x: s.x, y: s.y, r, visible: s.visible });
  }

  project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    tmpV.set(x, y, z).project(this.camera);
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h, visible: tmpV.z < 1 && tmpV.x > -1.1 && tmpV.x < 1.1 && tmpV.y > -1.1 && tmpV.y < 1.1 };
  }

  private addRing(x: number, y: number, z: number, r: number, owner: number, selected: boolean) {
    const c = selected ? (owner === this.viewer ? tmpC2.setHex(0x7dff8a) : this.w.isEnemy(this.viewer, owner) ? tmpC2.setHex(0xff5a4a) : owner === 0 ? tmpC2.setHex(0xffe08a) : tmpC2.setHex(0x8ad8ff)) : tmpC2.setHex(0xffffff).multiplyScalar(0.7);
    this.addRingColor(x, y, z, r, c.getHex());
  }

  private addRingColor(x: number, y: number, z: number, r: number, color: number) {
    if (this.ringCount >= 1024) return;
    tmpM.makeScale(r, 1, r).setPosition(x, y + 0.04, z);
    this.rings.setMatrixAt(this.ringCount, tmpM);
    this.rings.setColorAt(this.ringCount, tmpC.setHex(color).multiplyScalar(1.3));
    this.ringCount++;
  }

  orderMarker(x: number, y: number, attack: boolean) {
    this.markers.push({ x, y, t: this.time, color: attack ? 0xff5a4a : 0x6aff7a });
  }

  private rebuildStatic() {
    const w = this.w;
    const pl = w.planet;
    for (const b of this.staticBatches.values()) b.begin();
    const N = w.N;
    for (const r of w.resources) {
      if (!r.alive) continue;
      const vis = this.visibleTile(r.x, r.y);
      if (vis === 0) continue;
      let key: string;
      let bt: ModelBatch;
      if (r.resKind === 'tree') {
        const kind = r.variant === 1 && pl.forest.tree2 ? pl.forest.tree2 : pl.forest.tree;
        const v = (r.id * 7) % 4;
        key = 't:' + kind + ':' + v;
        bt = this.staticBatch(key, () => buildTree(kind, v, pl.forest.color, pl.forest.color2), true);
      } else {
        const v = r.resKind === 'carcass' ? 0 : r.id % 3;
        key = 'r:' + r.resKind + ':' + v;
        bt = this.staticBatch(key, () => buildResource(r.resKind!, v, pl.biome), false);
      }
      const h = w.map.heightAt(r.x, r.y);
      const sc = r.resKind === 'tree' ? 0.85 + ((r.id * 13) % 10) / 30 : r.resKind === 'nova' || r.resKind === 'ore' ? 0.6 + 0.4 * Math.min(1, r.amount / 450) + 0.15 : 1;
      tmpQ.setFromAxisAngle(UP, r.angle);
      tmpM.compose(tmpV.set(r.x, h - 0.02, r.y), tmpQ, tmpS.set(sc, sc, sc));
      bt.push(tmpM, tmpC.setHex(0xffffff), null, vis === 2 ? 1 : 0.6, this.selected.has(r.id) || this.hovered === r.id ? 0.15 : 0, 1, null);
    }
    for (const d of w.decor) {
      const vis = this.visibleTile(d.x, d.y);
      if (vis === 0) continue;
      let key: string;
      let bt: ModelBatch;
      if (d.block) {
        key = 'l:' + d.kind + ':' + d.size;
        bt = this.staticBatch(key, () => buildLandmark(d.kind, d.size, pl.terrain.cliff), false);
      } else {
        key = 'd:' + d.kind;
        bt = this.staticBatch(key, () => buildDecor(d.kind, pl.terrain.cliff), true);
      }
      const h = w.map.heightAt(d.x, d.y);
      tmpQ.setFromAxisAngle(UP, d.rot);
      tmpM.compose(tmpV.set(d.x, h - 0.03, d.y), tmpQ, tmpS.set(d.scale, d.scale, d.scale));
      bt.push(tmpM, tmpC.setHex(0xffffff), null, vis === 2 ? 1 : 0.6, 0, 1, null);
    }
    void N;
    for (const b of this.staticBatches.values()) b.commit(false);
  }

  // ─────────────────────────── Placement ───────────────────────────

  setGhost(defId: string | null, style: string, tx: number, ty: number, size: number, valid: boolean) {
    if (!defId) {
      if (this.ghost) this.ghost.visible = false;
      return;
    }
    const key = defId + ':' + style;
    if (this.ghostKey !== key) {
      if (this.ghost) this.scene.remove(this.ghost);
      const p = this.w.players[this.viewer];
      const def = this.model('b:' + p.civ.style + ':' + defId, () => buildBuildingModel(defId, p.civ.style));
      this.ghost = new THREE.Group();
      for (const part of def.parts) this.ghost.add(new THREE.Mesh(part.geometry, this.ghostMat));
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), this.ghostMat);
      fp.position.y = 0.05;
      this.ghost.add(fp);
      this.scene.add(this.ghost);
      this.ghostKey = key;
    }
    const g = this.ghost!;
    g.visible = true;
    const cxp = tx + size / 2, czp = ty + size / 2;
    g.position.set(cxp, this.w.map.heightAt(cxp, czp), czp);
    this.ghostMat.color.setHex(valid ? 0x40ff60 : 0xff4030);
  }

  // ─────────────────────────── Picking ───────────────────────────

  screenToGround(mx: number, my: number): { x: number; y: number } | null {
    const el = this.renderer.domElement;
    const ndc = new THREE.Vector2((mx / el.clientWidth) * 2 - 1, -(my / el.clientHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const ro = this.raycaster.ray.origin, rd = this.raycaster.ray.direction;
    // marcha sobre el mapa de alturas
    let t = 0;
    const m = this.w.map;
    for (let i = 0; i < 400; i++) {
      const px = ro.x + rd.x * t, py = ro.y + rd.y * t, pz = ro.z + rd.z * t;
      const h = m.surfaceAt(Math.max(0, Math.min(m.w - 0.01, px)), Math.max(0, Math.min(m.h - 0.01, pz)));
      if (py <= h) {
        // refinar
        let a = t - 0.5, b = t;
        for (let k = 0; k < 8; k++) {
          const mid = (a + b) / 2;
          const qx = ro.x + rd.x * mid, qy = ro.y + rd.y * mid, qz = ro.z + rd.z * mid;
          if (qy <= m.surfaceAt(Math.max(0, Math.min(m.w - 0.01, qx)), Math.max(0, Math.min(m.h - 0.01, qz)))) b = mid;
          else a = mid;
        }
        return { x: ro.x + rd.x * b, y: ro.z + rd.z * b };
      }
      t += 0.5;
    }
    return null;
  }

  /** Entidad bajo el cursor (unidades priorizadas sobre edificios y recursos) */
  pick(mx: number, my: number): number {
    let best = 0, bestD = 1e9;
    for (const [id, s] of this.screenPos) {
      if (!s.visible) continue;
      const e = this.w.entities.get(id);
      if (!e || (!e.alive && e.kind !== 'holocron')) continue;
      const dx = mx - s.x, dy = my - s.y;
      const base = e.kind === 'building' ? 0 : 0;
      // las unidades se seleccionan alrededor del cuerpo (desde la etiqueta superior hacia abajo)
      const r = e.kind === 'building' ? s.r * (40 / this.camDist) : Math.max(14, s.r * (30 / this.camDist));
      const ddy = e.kind === 'building' ? dy + r * 0.6 : dy - r * 0.9;
      const d = Math.hypot(dx, ddy);
      if (d < r * 1.1 + base && d < bestD) {
        bestD = d * (e.kind === 'unit' ? 0.6 : 1);
        best = id;
      }
    }
    if (best) return best;
    // edificios / recursos por posición en el suelo
    const g = this.screenToGround(mx, my);
    if (!g) return 0;
    const tx = Math.floor(g.x), ty = Math.floor(g.y);
    const m = this.w.map;
    if (!m.inBounds(tx, ty)) return 0;
    const occ = m.occ[ty * m.w + tx] || m.farmOcc[ty * m.w + tx];
    if (occ > 0) {
      const e = this.w.entities.get(occ);
      if (e && e.alive && this.visibleTile(e.x, e.y) > 0) return occ;
    }
    // cadáveres (recursos sin ocupación)
    for (const r of this.w.resources) {
      if (r.alive && r.resKind === 'carcass' && Math.hypot(r.x - g.x, r.y - g.y) < 0.8) return r.id;
    }
    return 0;
  }

  entitiesInRect(x0: number, y0: number, x1: number, y1: number): number[] {
    const out: number[] = [];
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
    for (const [id, s] of this.screenPos) {
      if (!s.visible) continue;
      const e = this.w.entities.get(id);
      if (!e || !e.alive || e.kind !== 'unit') continue;
      const sy = s.y + Math.max(10, s.r * (30 / this.camDist)) * 0.8;
      if (s.x >= ax && s.x <= bx && sy >= ay - 10 && s.y <= by + 10) out.push(id);
    }
    return out;
  }

  // ─────────────────────────── Eventos → efectos ───────────────────────────

  processEvents(events: GameEvent[]) {
    const w = this.w;
    const cx = this.camTarget.x, cz = this.camTarget.z;
    const near = (x: number, y: number) => Math.abs(x - cx) < this.camDist * 1.4 + 10 && Math.abs(y - cz) < this.camDist * 1.4 + 10 && this.visibleTile(x, y) === 2;
    for (const ev of events) {
      switch (ev.t) {
        case 'shot': {
          if (!near(ev.x, ev.y)) break;
          const e = w.entities.get(ev.id);
          const col = BOLT_COLORS[w.players[ev.owner].civ.id] ?? 0xff3322;
          const pr = w.projectiles.find((p) => p.id === ev.projId);
          if (pr && (ev.kind === 'bolt' || ev.kind === 'heavyBolt')) this.effects.muzzle(pr.sx, pr.sz, pr.sy, col);
          else if (pr && (ev.kind === 'shell' || ev.kind === 'missile')) {
            this.effects.muzzle(pr.sx, pr.sz, pr.sy, 0xffa040);
            this.effects.smokePuff(pr.sx, pr.sz, pr.sy, 0.5, 0.4);
          }
          void e;
          break;
        }
        case 'hit': {
          if (!near(ev.x, ev.y)) break;
          this.effects.sparks(ev.x, ev.z, ev.y, ev.big ? 0xffaa55 : 0xff8a4a, ev.big ? 8 : 4, ev.big ? 4 : 2.5);
          break;
        }
        case 'melee': {
          if (!near(ev.x, ev.y)) break;
          const e = w.entities.get(ev.id);
          const t = w.entities.get(ev.targetId);
          if (ev.saber && e && t) {
            const sc = e.ud?.saberColor ?? w.players[e.owner].civ.saber;
            this.effects.sparks((e.x + t.x) / 2, (t.z + 0.6), (e.y + t.y) / 2, sc, 5, 2);
          } else if (t) this.effects.dust(t.x, t.z + 0.3, t.y, 0xc8b8a0, 2, 0.2);
          break;
        }
        case 'deflect': {
          if (!near(ev.x, ev.y)) break;
          const e = w.entities.get(ev.id);
          const sc = e?.ud?.saberColor ?? (e ? w.players[e.owner].civ.saber : 0x3d8bff);
          this.effects.sparks(ev.x, ev.z, ev.y, sc, 6, 3);
          this.effects.sparks(ev.x, ev.z, ev.y, 0xffe08a, 4, 2.5);
          break;
        }
        case 'death': {
          if (!near(ev.x, ev.y)) break;
          const z = w.map.surfaceAt(ev.x, ev.y);
          if (ev.kind === 'building') {
            this.effects.explosion(ev.x, z + 0.5, ev.y, 1 + ev.size * 0.45);
            for (let i = 0; i < ev.size * 2; i++) this.effects.explosion(ev.x + (Math.random() - 0.5) * ev.size, z + Math.random(), ev.y + (Math.random() - 0.5) * ev.size, 0.6 + Math.random() * 0.6, { ring: false, light: false });
            for (let i = 0; i < 10; i++) this.effects.smokePuff(ev.x + (Math.random() - 0.5) * ev.size, z + 0.5, ev.y + (Math.random() - 0.5) * ev.size, 0.12, 1 + ev.size * 0.3);
          } else if (ev.air) {
            const e = w.entities.get(ev.id);
            this.effects.explosion(ev.x, (e?.z ?? z + 6), ev.y, 0.9);
          } else if (ev.mech) {
            this.effects.explosion(ev.x, z + 0.4, ev.y, 0.5 + ev.size * 1.2);
          } else {
            this.effects.dust(ev.x, z, ev.y, 0xb8a888, 3, 0.3);
          }
          break;
        }
        case 'explosion':
          if (!near(ev.x, ev.y)) break;
          this.effects.explosion(ev.x, ev.z, ev.y, ev.size, { debris: ev.size > 0.7, ring: ev.size > 0.9, light: ev.size > 0.7 });
          break;
        case 'lightning':
          this.effects.addLightning(ev.pts);
          break;
        case 'trained': {
          const e = w.entities.get(ev.id);
          if (e && near(e.x, e.y)) this.effects.sparkle(e.x, e.z, e.y, 0x8ad8ff, 8, 0.4);
          break;
        }
        case 'built': {
          const e = w.entities.get(ev.id);
          if (e && near(e.x, e.y)) {
            this.effects.dust(e.x, e.z, e.y, 0xc8b8a0, 10, e.size * 0.5);
            this.effects.ring(e.x, w.map.surfaceAt(e.x, e.y), e.y, e.size * 0.8, 0x8ad8ff, 0.7);
          }
          this.staticDirty = true;
          break;
        }
        case 'era': {
          if (ev.owner !== this.viewer) break;
          for (const b of w.buildings) if (b.alive && b.owner === ev.owner && b.defId === 'command_center') {
            this.effects.ring(b.x, w.map.surfaceAt(b.x, b.y), b.y, 6, 0xffd860, 1.2);
            this.effects.sparkle(b.x, w.map.surfaceAt(b.x, b.y), b.y, 0xffd860, 40, 2.5);
          }
          break;
        }
        case 'converted': {
          const e = w.entities.get(ev.id);
          if (e && near(e.x, e.y)) {
            this.effects.sparkle(e.x, e.z, e.y, PLAYER_COLORS[w.players[ev.to].color].hex, 20, 0.6);
            this.effects.ring(e.x, e.z, e.y, 1.2, 0xffffff, 0.5);
          }
          break;
        }
        case 'converting': {
          const e = w.entities.get(ev.id), t = w.entities.get(ev.targetId);
          if (e && t && near(t.x, t.y)) this.effects.sparkle(t.x, t.z, t.y, 0xc8e8ff, 3, 0.4);
          break;
        }
        case 'heal': {
          const t = w.entities.get(ev.targetId);
          if (t && near(t.x, t.y)) this.effects.sparkle(t.x, t.z, t.y, 0x6aff8a, 3, 0.3);
          break;
        }
        case 'gather': {
          const e = w.entities.get(ev.id);
          if (!e || !near(e.x, e.y) || this.camDist > 45) break;
          const col = ev.res === 'carbon' ? 0x8a6a3a : ev.res === 'nova' ? 0x6ad8ff : ev.res === 'ore' ? 0xd8a050 : 0x8aba5a;
          const fx = e.x + Math.cos(e.angle) * 0.35, fz = e.y + Math.sin(e.angle) * 0.35;
          if (ev.res === 'nova' || ev.res === 'ore') this.effects.sparks(fx, e.z + 0.3, fz, col, 2, 1.5);
          else this.effects.dust(fx, e.z + 0.2, fz, col, 1, 0.1);
          break;
        }
        case 'ability': {
          const e = w.entities.get(ev.id);
          if (!e) break;
          const z = e.z;
          switch (ev.ability) {
            case 'forcePush':
              this.effects.ring(e.x, z, e.y, 3.2, 0x8ad8ff, 0.5);
              this.effects.dust(e.x, z, e.y, 0xc8b8a0, 14, 1.5);
              break;
            case 'forceHeal':
              this.effects.ring(e.x, z, e.y, 5, 0x6aff8a, 0.8);
              this.effects.sparkle(e.x, z, e.y, 0x6aff8a, 30, 4);
              break;
            case 'battleMeditation':
              this.effects.ring(e.x, z, e.y, 8, 0xffd860, 1.0);
              this.effects.sparkle(e.x, z, e.y, 0xffd860, 30, 6);
              break;
            case 'rally':
            case 'droidCommand':
              this.effects.ring(e.x, z, e.y, 7, 0xffb040, 0.8);
              this.effects.sparkle(e.x, z, e.y, 0xffb040, 20, 5);
              break;
            case 'shieldBubble':
              this.effects.ring(e.x, z, e.y, 5, 0x6ac8ff, 1.0);
              this.effects.sparkle(e.x, z, e.y, 0x6ac8ff, 30, 4);
              break;
            case 'roar':
              this.effects.ring(e.x, z, e.y, 5, 0xffffff, 0.6);
              this.effects.dust(e.x, z, e.y, 0xc8b8a0, 12, 1.2);
              break;
            case 'saberSpin':
            case 'clumsy':
              this.effects.ring(e.x, z + 0.5, e.y, 2.2, ev.ability === 'clumsy' ? 0xffd860 : (e.ud?.saberColor ?? 0xff2a2a), 0.4);
              break;
            case 'forceChoke': {
              const t = w.entities.get(ev.targetId);
              if (t) this.effects.sparkle(t.x, t.z + 0.5, t.y, 0x4a4a6a, 15, 0.3);
              break;
            }
            case 'saberThrow': {
              const sc = e.ud?.saberColor ?? 0x3d8bff;
              const dx = ev.x - e.x, dy = ev.y - e.y, d = Math.hypot(dx, dy) || 1;
              for (let i = 0; i < 14; i++) {
                const k = i / 14;
                this.effects.add.spawn(e.x + dx * k, z + 0.6, e.y + dy * k, (dx / d) * 2, 0, (dy / d) * 2, 0.35, 0.35, 0.1, ((sc >> 16) & 255) / 120, ((sc >> 8) & 255) / 120, (sc & 255) / 120, 1);
              }
              break;
            }
            case 'jetpack':
              this.effects.explosion(e.x, z, e.y, 0.4, { debris: false, ring: false, light: false });
              break;
          }
          break;
        }
      }
    }
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
