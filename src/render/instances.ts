// Renderizado instanciado de modelos con animación por partes.
import * as THREE from 'three';
import type { ModelDef, AnimKind } from './models/builder';

export interface AnimState {
  walk: number; // fase de pasos
  walkAmp: number; // 0..1
  attackT: number; // segundos desde el último ataque (grande = nada)
  melee: boolean;
  workT: number; // segundos desde el último trabajo
  time: number;
  seed: number;
  spin: number; // rotación de ruedas
  /** cadáver (los modelos con esqueleto reproducen la animación de muerte) */
  dead?: boolean;
}

const tmpM = new THREE.Matrix4();
const tmpL = new THREE.Matrix4();
const tmpP = new THREE.Matrix4();
const tmpPi = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

function partLocal(anim: AnimKind, a: AnimState, out: THREE.Matrix4, pivot: THREE.Vector3): boolean {
  let rx = 0, ry = 0, rz = 0, tx = 0, ty = 0;
  const ph = a.walk;
  const amp = a.walkAmp;
  switch (anim) {
    case 'static':
    case 'bob':
      return false;
    case 'legL':
      rz = Math.sin(ph) * 0.5 * amp;
      break;
    case 'legR':
      rz = -Math.sin(ph) * 0.5 * amp;
      break;
    case 'legFL':
    case 'legBR':
      rz = Math.sin(ph) * 0.32 * amp;
      break;
    case 'legFR':
    case 'legBL':
      rz = -Math.sin(ph) * 0.32 * amp;
      break;
    case 'legML':
      rz = Math.cos(ph) * 0.3 * amp;
      break;
    case 'legMR':
      rz = -Math.cos(ph) * 0.3 * amp;
      break;
    case 'armR': {
      if (a.attackT < 0.45) {
        if (a.melee) {
          const k = a.attackT / 0.45;
          rz = -Math.sin(k * Math.PI) * 1.5 + 0.4;
          rx = Math.sin(k * Math.PI) * 0.5;
        } else rz = Math.exp(-a.attackT * 14) * 0.35;
      } else if (a.workT < 0.4) {
        rz = -Math.abs(Math.sin(a.time * 7 + a.seed)) * 1.1 + 0.2;
      } else rz = -Math.sin(ph) * 0.25 * amp + Math.sin(a.time * 1.3 + a.seed) * 0.03;
      break;
    }
    case 'shinL':
      // rodilla: se dobla al adelantar la pierna (fase de balanceo)
      rz = -Math.pow(Math.max(0, Math.cos(ph)), 1.5) * 0.85 * amp - 0.06 * amp;
      break;
    case 'shinR':
      rz = -Math.pow(Math.max(0, -Math.cos(ph)), 1.5) * 0.85 * amp - 0.06 * amp;
      break;
    case 'aim':
      // arma a dos manos: retroceso al disparar, balanceo leve al andar, golpe en cuerpo a cuerpo
      if (a.attackT < 0.45 && a.melee) rz = -Math.sin((a.attackT / 0.45) * Math.PI) * 0.6;
      else rz = (a.attackT < 1 ? Math.exp(-a.attackT * 12) * 0.22 : 0) - Math.sin(ph * 2) * 0.03 * amp + Math.sin(a.time * 1.3 + a.seed) * 0.015;
      if (a.workT < 0.4) rz = -Math.abs(Math.sin(a.time * 7 + a.seed)) * 0.6 + 0.1;
      break;
    case 'armL':
      if (a.workT < 0.4) rz = -Math.abs(Math.sin(a.time * 7 + a.seed + 1.2)) * 0.8 + 0.1;
      else rz = Math.sin(ph) * 0.3 * amp - Math.sin(a.time * 1.1 + a.seed) * 0.03;
      break;
    case 'saber':
    case 'saber2':
      if (a.attackT < 0.45 && a.melee) {
        const k = a.attackT / 0.45;
        rx = -Math.sin(k * Math.PI) * 1.2;
      } else rx = -0.3 + Math.sin(a.time * 2 + a.seed) * 0.05;
      if (anim === 'saber2') ry = Math.sin(a.time * 9 + a.seed) * (a.attackT < 1 ? 1.2 : 0.1);
      break;
    case 'spin':
      rz = -a.spin;
      if (pivot.y > 0.5 && pivot.x === 0 && pivot.z === 0) {
        // holocrón: rotación vertical
        rz = 0;
        ry = a.time * 1.5;
        ty = Math.sin(a.time * 2 + a.seed) * 0.06;
      }
      break;
    case 'spinFast':
      ry = a.time * 8;
      break;
    case 'radar':
      ry = a.time * 0.7 + a.seed;
      break;
    case 'head':
      ry = Math.sin(a.time * 0.5 + a.seed) * 0.15;
      break;
    case 'tail':
      ry = Math.sin(a.time * 2 + a.seed) * 0.18;
      break;
    case 'flag':
      ry = Math.sin(a.time * 2.5 + a.seed) * 0.35;
      break;
    case 'recoil':
      tx = a.attackT < 1 ? -Math.exp(-a.attackT * 6) * 0.2 : 0;
      break;
    case 'wingL':
    case 'wingR':
      return false;
  }
  if (rx === 0 && ry === 0 && rz === 0 && tx === 0 && ty === 0) return false;
  tmpE.set(rx, ry, rz, 'XYZ');
  tmpQ.setFromEuler(tmpE);
  tmpP.makeTranslation(pivot.x + tx, pivot.y + ty, pivot.z);
  tmpL.compose(tmpV.set(0, 0, 0), tmpQ, ONE);
  tmpPi.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
  out.multiplyMatrices(tmpP, tmpL).multiply(tmpPi);
  return true;
}

export class ModelBatch {
  def: ModelDef;
  meshes: THREE.InstancedMesh[] = [];
  holoMeshes: THREE.InstancedMesh[] = [];
  capacity = 0;
  count = 0;
  private instData!: THREE.InstancedBufferAttribute;
  private colorAttr!: THREE.InstancedBufferAttribute;
  private saberAttr!: THREE.InstancedBufferAttribute;
  private group: THREE.Group;
  private material: THREE.Material;
  private holoMat: THREE.Material | null;
  private shadows: boolean;
  private locals: THREE.Matrix4[];
  private hasLocal: boolean[];
  animated: boolean;
  hasBob: boolean;
  dirty = true;
  isStatic = false;

  constructor(def: ModelDef, group: THREE.Group, material: THREE.Material, opts: { shadows?: boolean; holo?: THREE.Material | null; capacity?: number; isStatic?: boolean } = {}) {
    this.def = def;
    this.group = group;
    this.material = material;
    this.holoMat = opts.holo ?? null;
    this.shadows = opts.shadows ?? true;
    this.isStatic = opts.isStatic ?? false;
    this.locals = def.parts.map(() => new THREE.Matrix4());
    this.hasLocal = def.parts.map(() => false);
    this.animated = def.parts.some((p) => p.anim !== 'static' && p.anim !== 'bob');
    this.hasBob = def.parts.some((p) => p.anim === 'bob');
    this.alloc(opts.capacity ?? 16);
  }

  private alloc(cap: number) {
    for (const m of this.meshes) {
      this.group.remove(m);
      m.dispose();
    }
    for (const m of this.holoMeshes) {
      this.group.remove(m);
      m.dispose();
    }
    this.meshes = [];
    this.holoMeshes = [];
    const old = this.instData;
    const oldC = this.colorAttr;
    const oldS = this.saberAttr;
    this.instData = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.instData.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.saberAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.saberAttr.setUsage(THREE.DynamicDrawUsage);
    if (old) {
      this.instData.array.set((old.array as Float32Array).subarray(0, Math.min(old.array.length, cap * 4)));
      this.colorAttr.array.set((oldC.array as Float32Array).subarray(0, Math.min(oldC.array.length, cap * 3)));
      this.saberAttr.array.set((oldS.array as Float32Array).subarray(0, Math.min(oldS.array.length, cap * 3)));
    }
    for (const part of this.def.parts) {
      const g = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'color', 'teamMask', 'emissive', 'surf']) {
        const a = part.geometry.getAttribute(name);
        if (a) g.setAttribute(name, a);
      }
      if (part.geometry.index) g.setIndex(part.geometry.index);
      g.setAttribute('instData', this.instData);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const mesh = new THREE.InstancedMesh(g, this.material, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = part.saberColor ? this.saberAttr : this.colorAttr;
      mesh.frustumCulled = false;
      mesh.castShadow = this.shadows && !part.saberColor;
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      this.meshes.push(mesh);
      if (this.holoMat) {
        const hm = new THREE.InstancedMesh(g, this.holoMat, cap);
        hm.instanceMatrix = mesh.instanceMatrix;
        hm.frustumCulled = false;
        hm.count = 0;
        hm.renderOrder = 5;
        this.group.add(hm);
        this.holoMeshes.push(hm);
      }
    }
    this.capacity = cap;
  }

  begin() {
    this.count = 0;
  }

  push(base: THREE.Matrix4, color: THREE.Color, saber: THREE.Color | null, brightness: number, flash: number, progress: number, anim: AnimState | null) {
    if (this.count >= this.capacity) {
      const c = this.count;
      this.alloc(Math.max(16, this.capacity * 2));
      this.count = c;
    }
    const i = this.count++;
    const d = this.instData.array as Float32Array;
    d[i * 4] = brightness;
    d[i * 4 + 1] = flash;
    d[i * 4 + 2] = progress;
    d[i * 4 + 3] = this.def.height;
    const ca = this.colorAttr.array as Float32Array;
    ca[i * 3] = color.r;
    ca[i * 3 + 1] = color.g;
    ca[i * 3 + 2] = color.b;
    if (saber) {
      const sa = this.saberAttr.array as Float32Array;
      sa[i * 3] = saber.r * 1.6;
      sa[i * 3 + 1] = saber.g * 1.6;
      sa[i * 3 + 2] = saber.b * 1.6;
    }
    const parts = this.def.parts;
    if (!anim || !this.animated) {
      for (let p = 0; p < parts.length; p++) this.meshes[p].setMatrixAt(i, base);
      return;
    }
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      const has = partLocal(part.anim, anim, this.locals[p], part.pivot);
      this.hasLocal[p] = has;
      if (!has) this.locals[p].identity();
      if (part.parent >= 0 && (this.hasLocal[part.parent] || has)) {
        this.locals[p].premultiply(this.locals[part.parent]);
        this.hasLocal[p] = true;
      }
      if (this.hasLocal[p]) {
        tmpM.multiplyMatrices(base, this.locals[p]);
        this.meshes[p].setMatrixAt(i, tmpM);
      } else this.meshes[p].setMatrixAt(i, base);
    }
  }

  commit(hasHolo: boolean) {
    for (const m of this.meshes) {
      m.count = this.count;
      m.instanceMatrix.needsUpdate = true;
    }
    this.instData.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.saberAttr.needsUpdate = true;
    for (const m of this.holoMeshes) m.count = hasHolo ? this.count : 0;
  }
}
