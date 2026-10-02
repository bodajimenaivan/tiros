// Constructor de modelos procedurales: primitivas fusionadas con color por vértice,
// máscara de color de equipo y emisión, organizadas en partes animables.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type AnimKind =
  | 'static' | 'legL' | 'legR' | 'legFL' | 'legFR' | 'legBL' | 'legBR' | 'legML' | 'legMR'
  | 'armR' | 'armL' | 'saber' | 'saber2' | 'spin' | 'spinFast' | 'head' | 'tail' | 'wingL' | 'wingR' | 'bob' | 'recoil' | 'flag' | 'radar'
  | 'shinL' | 'shinR' | 'aim';

export interface PartOpts {
  team?: number; // 0..1 mezcla con color de equipo
  em?: number; // emisión 0..3
  flat?: boolean; // sombreado plano (por defecto true)
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  seg?: number;
  metal?: number;
  /** Superficie (SURF.*) para la textura de detalle */
  mat?: number;
  /** Multiplicador de escala de la textura de detalle */
  ms?: number;
}

export interface ModelPart {
  name: string;
  geometry: THREE.BufferGeometry;
  pivot: THREE.Vector3;
  anim: AnimKind;
  parent: number; // índice de la parte padre (-1 = raíz)
  saberColor?: boolean;
}

export interface ModelDef {
  id: string;
  parts: ModelPart[];
  height: number;
  radius: number;
}

interface PartBuild {
  name: string;
  geos: THREE.BufferGeometry[];
  pivot: THREE.Vector3;
  anim: AnimKind;
  parent: string | null;
  saberColor?: boolean;
}

const tmpColor = new THREE.Color();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();

export class MB {
  private parts = new Map<string, PartBuild>();
  private cur: PartBuild;
  private order: string[] = [];
  /** Transformación adicional (para grupos / espejos) */
  private offX = 0;
  private offY = 0;
  private offZ = 0;
  private mirror = 1;
  /** Superficie por defecto para las primitivas siguientes (null = plain) */
  defMat: number | null = null;
  /** Bisel automático de las cajas grandes (vehículos y edificios); 0 = cajas rectas */
  bevel = 0;

  constructor() {
    this.cur = this.part('body');
  }

  part(name: string, anim: AnimKind = 'static', pivot: [number, number, number] = [0, 0, 0], parent: string | null = null, saberColor = false): PartBuild {
    let p = this.parts.get(name);
    if (!p) {
      p = { name, geos: [], pivot: new THREE.Vector3(...pivot), anim, parent, saberColor };
      this.parts.set(name, p);
      this.order.push(name);
    }
    this.cur = p;
    return p;
  }

  /** Fija la superficie por defecto de las siguientes primitivas */
  surf(id: number | null) {
    this.defMat = id;
    return this;
  }

  use(name: string) {
    const p = this.parts.get(name);
    if (p) this.cur = p;
    return this;
  }

  /** Ejecuta fn dos veces: normal y reflejada en X */
  sym(fn: (s: number) => void) {
    fn(1);
    fn(-1);
    return this;
  }

  offset(x: number, y: number, z: number, fn: () => void) {
    const ox = this.offX, oy = this.offY, oz = this.offZ;
    this.offX += x;
    this.offY += y;
    this.offZ += z;
    fn();
    this.offX = ox;
    this.offY = oy;
    this.offZ = oz;
    return this;
  }

  /** Geometría personalizada (se aplanan normales y se añaden atributos como al resto) */
  mesh(g: THREE.BufferGeometry, x: number, y: number, z: number, color: number, o?: PartOpts) {
    return this.add(g, x, y, z, color, o);
  }

  private add(g: THREE.BufferGeometry, x: number, y: number, z: number, color: number, o: PartOpts = {}, defFlat = true) {
    tmpE.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    tmpS.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    tmpV.set(x + this.offX, y + this.offY, z + this.offZ);
    tmpM.compose(tmpV, tmpQ, tmpS);
    g.applyMatrix4(tmpM);
    g.deleteAttribute('uv');
    g.deleteAttribute('uv1');
    g.deleteAttribute('uv2');
    let geo: THREE.BufferGeometry;
    if (o.flat ?? defFlat) {
      // sombreado plano: vértices propios por cara
      geo = g.index ? g.toNonIndexed() : g;
      geo.computeVertexNormals();
    } else {
      geo = g;
      if (geo.attributes.normal === undefined) geo.computeVertexNormals();
    }
    const n = geo.attributes.position.count;
    // todas las geometrías indexadas (necesario para fusionarlas; las suaves comparten vértices)
    if (!geo.index) {
      const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    const col = new Float32Array(n * 3);
    const team = new Float32Array(n);
    const em = new Float32Array(n);
    const sf = new Float32Array(n * 2);
    tmpColor.setHex(color);
    const surfId = o.mat ?? this.defMat ?? (o.em ? 15 : 0);
    const surfK = o.ms ?? 1;
    for (let i = 0; i < n; i++) {
      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;
      team[i] = o.team ?? 0;
      em[i] = o.em ?? 0;
      sf[i * 2] = surfId;
      sf[i * 2 + 1] = surfK;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('teamMask', new THREE.BufferAttribute(team, 1));
    geo.setAttribute('emissive', new THREE.BufferAttribute(em, 1));
    geo.setAttribute('surf', new THREE.BufferAttribute(sf, 2));
    this.cur.geos.push(geo);
    return this;
  }

  box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const minD = Math.min(w, h, d);
    if (this.bevel > 0 && minD > this.bevel * 3) {
      const r = Math.min(this.bevel, minD * 0.22);
      return this.add(new RoundedBoxGeometry(w, h, d, 1, r), x, y, z, color, o, false);
    }
    return this.add(new THREE.BoxGeometry(w, h, d), x, y, z, color, o);
  }
  cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const seg = o?.seg ?? 10;
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1), x, y, z, color, o, seg < 8);
  }
  sphere(r: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const seg = o?.seg ?? 10;
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg * 0.6))), x, y, z, color, o, false);
  }
  cone(r: number, h: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const seg = o?.seg ?? 10;
    return this.add(new THREE.ConeGeometry(r, h, seg), x, y, z, color, o, seg < 8);
  }
  torus(r: number, tube: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    return this.add(new THREE.TorusGeometry(r, tube, 6, o?.seg ?? 16), x, y, z, color, o, false);
  }
  capsule(r: number, len: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    return this.add(new THREE.CapsuleGeometry(r, len, 3, o?.seg ?? 8), x, y, z, color, o, false);
  }
  /** Caja con aristas redondeadas (sombreado suave) */
  rbox(w: number, h: number, d: number, r: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const minD = Math.min(w, h, d);
    // piezas diminutas: caja normal; bisel simple (chaflán suave) o redondeo de 2 segmentos para las grandes
    if (minD < 0.012 || rr < 0.002) return this.add(new THREE.BoxGeometry(w, h, d), x, y, z, color, o, true);
    const seg = rr > 0.025 ? 2 : 1;
    return this.add(new RoundedBoxGeometry(w, h, d, seg, Math.max(1e-4, rr)), x, y, z, color, o, false);
  }
  /** Elipsoide */
  ell(rx: number, ry: number, rz: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const seg = o?.seg ?? 12;
    return this.add(new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.6))), x, y, z, color, { ...o, sx: rx, sy: ry, sz: rz }, false);
  }
  /** Cápsula ahusada entre dos puntos (extremidades): radio r0 en a, r1 en b */
  limb(a: [number, number, number], bp: [number, number, number], r0: number, r1: number, color: number, o?: PartOpts) {
    const dx = bp[0] - a[0], dy = bp[1] - a[1], dz = bp[2] - a[2];
    const len = Math.hypot(dx, dy, dz) || 1e-4;
    const seg = o?.seg ?? 8;
    // perfil: semiesfera inferior (r0), tronco cónico, semiesfera superior (r1)
    const pts: THREE.Vector2[] = [];
    const cap = 2;
    for (let i = 0; i <= cap; i++) {
      const t = (i / cap) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.sin(t) * r0, -Math.cos(t) * r0));
    }
    for (let i = 0; i <= cap; i++) {
      const t = (i / cap) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.cos(t) * r1 + 1e-5, len + Math.sin(t) * r1));
    }
    const g = new THREE.LatheGeometry(pts, seg);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    g.applyQuaternion(q);
    const oo = { ...o };
    delete oo.rx;
    delete oo.ry;
    delete oo.rz;
    return this.add(g, a[0], a[1], a[2], color, oo, false);
  }
  /** Cuña / prisma triangular (útil para naves y techos) */
  wedge(w: number, h: number, d: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const g = new THREE.BufferGeometry();
    const hw = w / 2, hd = d / 2;
    // base rectangular en y=0, arista superior en y=h a lo largo de z
    const v = [
      -hw, 0, -hd, hw, 0, -hd, 0, h, -hd,
      -hw, 0, hd, 0, h, hd, hw, 0, hd,
      -hw, 0, -hd, 0, h, -hd, 0, h, hd, -hw, 0, -hd, 0, h, hd, -hw, 0, hd,
      hw, 0, -hd, hw, 0, hd, 0, h, hd, hw, 0, -hd, 0, h, hd, 0, h, -hd,
      -hw, 0, -hd, -hw, 0, hd, hw, 0, hd, -hw, 0, -hd, hw, 0, hd, hw, 0, -hd,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return this.add(g, x, y, z, color, o);
  }
  /** Placa triangular plana (alas, aletas) en el plano XZ */
  tri(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, thick: number, y: number, color: number, o?: PartOpts) {
    const shape = new THREE.Shape();
    shape.moveTo(ax, -az);
    shape.lineTo(bx, -bz);
    shape.lineTo(cx, -cz);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -thick / 2, 0);
    return this.add(g, 0, y, 0, color, o);
  }
  /** Polígono extruido en el plano XZ (y = altura) */
  poly(pts: [number, number][], thick: number, y: number, color: number, o?: PartOpts) {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], -pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return this.add(g, 0, y, 0, color, o);
  }
  /** Prisma: perfil (z, y) en el plano transversal, extruido a lo largo de X con bisel */
  prism(profile: [number, number][], len: number, x: number, y: number, z: number, color: number, o?: PartOpts & { bevel?: number }) {
    const shape = new THREE.Shape();
    shape.moveTo(profile[0][0], profile[0][1]);
    for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i][0], profile[i][1]);
    shape.closePath();
    const bv = o?.bevel ?? 0.02;
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, len - bv * 2), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 1 });
    g.translate(0, 0, -(len - bv * 2) / 2);
    g.rotateY(Math.PI / 2);
    return this.add(g, x, y, z, color, o, true);
  }
  /** Sólido de revolución */
  lathe(pts: [number, number][], x: number, y: number, z: number, color: number, o?: PartOpts) {
    const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 1e-5), h)), o?.seg ?? 12);
    return this.add(g, x, y, z, color, o, false);
  }
  /** Octaedro / cristal */
  crystal(r: number, h: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    const g = new THREE.OctahedronGeometry(r, 0);
    g.scale(1, h / r, 1);
    return this.add(g, x, y, z, color, o);
  }
  dodeca(r: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    return this.add(new THREE.DodecahedronGeometry(r, 0), x, y, z, color, o);
  }
  ico(r: number, x: number, y: number, z: number, color: number, o?: PartOpts) {
    return this.add(new THREE.IcosahedronGeometry(r, 0), x, y, z, color, o);
  }

  build(id: string): ModelDef {
    const parts: ModelPart[] = [];
    const idx = new Map<string, number>();
    let maxY = 0, maxR = 0;
    for (const name of this.order) {
      const p = this.parts.get(name)!;
      if (!p.geos.length) continue;
      const geo = p.geos.length === 1 ? p.geos[0] : mergeGeometries(p.geos, false)!;
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const bb = geo.boundingBox!;
      maxY = Math.max(maxY, bb.max.y);
      maxR = Math.max(maxR, Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z));
      idx.set(name, parts.length);
      parts.push({ name, geometry: geo, pivot: p.pivot.clone(), anim: p.anim, parent: -1, saberColor: p.saberColor });
    }
    for (const name of this.order) {
      const p = this.parts.get(name)!;
      const i = idx.get(name);
      if (i === undefined || !p.parent) continue;
      parts[i].parent = idx.get(p.parent) ?? -1;
    }
    return { id, parts, height: maxY, radius: maxR };
  }
}

// Paleta de utilidad
export const C = {
  white: 0xeeeeea,
  offwhite: 0xd8d4c8,
  black: 0x1a1a1e,
  dark: 0x2c2c32,
  gray: 0x7a7c82,
  lgray: 0xa8aab0,
  dgray: 0x4a4c52,
  metal: 0x8e9298,
  gun: 0x2a2a2e,
  tan: 0xc8a878,
  brown: 0x6a4a30,
  dbrown: 0x4a3420,
  khaki: 0x9a8a5a,
  olive: 0x5a6a3a,
  red: 0xc0302a,
  orange: 0xe07a2a,
  yellow: 0xe8c040,
  blue: 0x3a6ac8,
  skin: 0xe0b090,
  glass: 0x203040,
  glowRed: 0xff3a2a,
  glowBlue: 0x4ab8ff,
  glowCyan: 0x5af0ff,
  glowGreen: 0x5aff8a,
  glowYellow: 0xffd85a,
  glowOrange: 0xff9a3a,
  bronze: 0x9a7a4a,
  copper: 0xa86a3a,
  gold: 0xd8b04a,
  team: 0xffffff,
};
