// Superficies de los modelos: cada vértice lleva un tipo de material (armadura, paneles metálicos,
// tela, pelo, piel, yeso...). El sombreador proyecta en el espacio del modelo (triplanar) una textura
// de detalle generada por código con relieve, variación de color, rugosidad y oclusión de cavidades.
// Así todos los modelos tienen textura sin necesidad de coordenadas UV.
import * as THREE from 'three';

/** Identificadores de superficie (atributo `surf.x` de cada vértice) */
export const SURF = {
  plain: 0, // pintura / plástico genérico
  armor: 1, // armadura blanca brillante (soldados de asalto, clones)
  panel: 2, // chapa metálica con paneles, remaches y arañazos
  fabric: 3, // tela de uniforme
  fur: 4, // pelo (wookiees, animales)
  skin: 5, // piel
  plaster: 6, // adobe / yeso con grietas y manchas
  rock: 7, // roca
  rubber: 8, // traje negro, guantes, botas
  glass: 9, // visores y cristales
  leather: 10, // cuero
  wood: 11, // madera
  hull: 12, // casco de edificio: grandes planchas con chorretones
  grate: 13, // rejillas
  concrete: 14, // hormigón / ferrocemento
  light: 15, // luces y emisivos (sin detalle)
} as const;
export type SurfId = (typeof SURF)[keyof typeof SURF];

const LAYERS = 16;
const S = 256;

/**
 * Propiedades por superficie: [escala triplanar (repeticiones por unidad), relieve, metalicidad (-1 = la del material), brillo del entorno]
 */
const PROPS: [number, number, number, number][] = [
  [2.2, 0.35, -1, 0.8], // plain
  [2.6, 0.25, 0.05, 1.25], // armor
  [1.6, 0.9, 0.6, 1.1], // panel
  [7.0, 0.5, 0.0, 0.35], // fabric
  [5.0, 1.4, 0.0, 0.25], // fur
  [5.0, 0.2, 0.0, 0.45], // skin
  [0.9, 1.0, 0.0, 0.4], // plaster
  [1.2, 1.6, 0.0, 0.35], // rock
  [6.0, 0.35, 0.0, 0.6], // rubber
  [1.0, 0.0, 0.1, 1.6], // glass
  [4.0, 0.6, 0.0, 0.5], // leather
  [2.5, 0.8, 0.0, 0.35], // wood
  [0.7, 0.9, 0.45, 0.9], // hull
  [6.0, 1.2, 0.5, 0.8], // grate
  [1.4, 0.7, 0.0, 0.4], // concrete
  [1.0, 0.0, -1, 0.5], // light
];

// ───────────── ruido periódico (texturas que se repiten sin costuras) ─────────────
function hash(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor periódico: periodo P celdas sobre la textura (u,v en 0..1) */
function vnoise(u: number, v: number, P: number, seed: number): number {
  const x = u * P, y = v * P;
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % P) + P) % P, y0 = ((iy % P) + P) % P;
  const x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(u: number, v: number, P: number, oct: number, seed: number): number {
  let sum = 0, amp = 1, norm = 0, p = P;
  for (let o = 0; o < oct; o++) {
    sum += vnoise(u, v, p, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
}

/** Celdas de Worley periódicas: devuelve [d1, d2] (distancias a los dos puntos más cercanos, en celdas) */
function worley(u: number, v: number, P: number, seed: number): [number, number] {
  const x = u * P, y = v * P;
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let oy = -1; oy <= 1; oy++)
    for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox, cy = iy + oy;
      const wx = ((cx % P) + P) % P, wy = ((cy % P) + P) % P;
      const px = cx + hash(wx, wy, seed), py = cy + hash(wx, wy, seed + 1);
      const d = Math.hypot(px - x, py - y);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  return [d1, d2];
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Paneles rectangulares periódicos: subdivide recursivamente una rejilla. Devuelve distancia al borde y un id de panel */
function panels(u: number, v: number, grid: number, seed: number): [number, number] {
  let x = u * grid, y = v * grid;
  let ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  let id = hash(((ix % grid) + grid) % grid, ((iy % grid) + grid) % grid, seed);
  let scale = 1;
  // subdividir algunos paneles en 2 o 4
  if (id < 0.45) {
    const hx = fx < 0.5 ? 0 : 1, hy = fy < 0.5 ? 0 : 1;
    if (id < 0.2) {
      fx = (fx * 2) % 1;
      fy = (fy * 2) % 1;
      id = hash(ix * 2 + hx, iy * 2 + hy, seed + 7);
      scale = 0.5;
    } else {
      fx = (fx * 2) % 1;
      id = hash(ix * 2 + hx, iy, seed + 9);
      scale = 0.5;
    }
  }
  const edge = Math.min(fx, 1 - fx, fy, 1 - fy) * scale;
  return [edge, id];
}

/** Genera las capas de detalle: R = altura, G = albedo (0.5 neutro), B = rugosidad, A = cavidad/oclusión */
function generateLayers(): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(new ArrayBuffer(S * S * 4 * LAYERS));
  const put = (layer: number, i: number, h: number, alb: number, rough: number, ao: number) => {
    const o = (layer * S * S + i) * 4;
    data[o] = clamp01(h) * 255;
    data[o + 1] = clamp01(alb) * 255;
    data[o + 2] = clamp01(rough) * 255;
    data[o + 3] = clamp01(ao) * 255;
  };
  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const i = y * S + x;
      const n1 = fbm(u, v, 4, 4, 11);
      const n2 = fbm(u, v, 16, 3, 23);
      const nFine = vnoise(u, v, 64, 31);
      // 0 plain: pintura con leve moteado
      put(0, i, 0.5 + (n2 - 0.5) * 0.3, 0.5 + (n1 - 0.5) * 0.12, 0.55 + (n2 - 0.5) * 0.15, 1);
      // 1 armor: plástico brillante, rozaduras finas y suciedad suave
      {
        const scratch = smooth(0.93, 0.99, vnoise(u * 1.0, v * 0.12, 64, 41)) * smooth(0.5, 0.8, n1);
        const dirt = smooth(0.55, 0.85, fbm(u, v, 4, 4, 45));
        put(1, i, 0.5 + (n1 - 0.5) * 0.25 - scratch * 0.2, 0.5 - dirt * 0.14 - scratch * 0.08, 0.28 + dirt * 0.25 + scratch * 0.3, 1 - dirt * 0.1);
      }
      // 2 panel: chapas con juntas, remaches y arañazos
      {
        const [edge, id] = panels(u, v, 4, 51);
        const groove = 1 - smooth(0.0, 0.012, edge);
        const rivetPhase = Math.min(edge, 0.05);
        const rx = (u * 32) % 1, ry = (v * 32) % 1;
        const rivet = edge < 0.035 && edge > 0.015 ? 1 - smooth(0.0, 0.18, Math.hypot(rx - 0.5, ry - 0.5)) : 0;
        const scratch = smooth(0.94, 0.995, vnoise(u * 0.2, v, 96, 57)) * 0.8;
        const grime = smooth(0.3, 0.9, fbm(u, v, 8, 3, 59)) * (1 - smooth(0.0, 0.08, edge)) ;
        put(2, i, 0.55 - groove * 0.45 + rivet * 0.25 + (n2 - 0.5) * 0.08 - scratch * 0.1, 0.5 + (id - 0.5) * 0.14 - grime * 0.22 + scratch * 0.1, 0.38 + id * 0.18 + grime * 0.25 - scratch * 0.12, 1 - groove * 0.5 - grime * 0.2);
        void rivetPhase;
      }
      // 3 fabric: trama y pliegues
      {
        const weave = (Math.sin(u * Math.PI * 2 * 64) * Math.sin(v * Math.PI * 2 * 64)) * 0.5 + 0.5;
        const folds = fbm(u, v, 3, 3, 61);
        const fold = smooth(0.2, 0.8, folds);
        put(3, i, 0.42 + weave * 0.12 + fold * 0.22, 0.5 + (weave - 0.5) * 0.05 + (n1 - 0.5) * 0.06 - (1 - fold) * 0.03, 0.86 + (nFine - 0.5) * 0.08, 0.9 + fold * 0.1);
      }
      // 4 fur: mechones alargados en vertical
      {
        const strand = vnoise(u, v * 0.125, 64, 71);
        const strand2 = vnoise(u + 0.37, v * 0.25, 128, 73);
        const clump = fbm(u, v, 8, 2, 75);
        const hgt = strand * 0.6 + strand2 * 0.25 + clump * 0.3;
        put(4, i, hgt, 0.32 + hgt * 0.36, 0.9, 0.55 + hgt * 0.45);
      }
      // 5 skin: poros y moteado
      put(5, i, 0.5 + (nFine - 0.5) * 0.25, 0.5 + (n1 - 0.5) * 0.1 + (n2 - 0.5) * 0.05, 0.5 + (n2 - 0.5) * 0.12, 1);
      // 6 plaster: adobe con grietas y manchas
      {
        const [d1, d2] = worley(u, v, 5, 81);
        const crack = 1 - smooth(0.0, 0.06, d2 - d1);
        const crackMask = smooth(0.45, 0.7, fbm(u, v, 4, 3, 83));
        const stain = smooth(0.4, 0.95, fbm(u * 1, v * 1, 3, 4, 85));
        const bump = fbm(u, v, 16, 4, 87);
        put(6, i, 0.45 + bump * 0.3 - crack * crackMask * 0.4, 0.52 + (bump - 0.5) * 0.12 - stain * 0.2 - crack * crackMask * 0.2, 0.86 + (bump - 0.5) * 0.1, 1 - crack * crackMask * 0.5 - stain * 0.08);
      }
      // 7 rock
      {
        const [d1] = worley(u, v, 6, 91);
        const r = fbm(u, v, 8, 5, 93);
        const hgt = r * 0.7 + (1 - Math.min(1, d1)) * 0.4;
        put(7, i, hgt, 0.35 + r * 0.35, 0.88 + (r - 0.5) * 0.1, 0.6 + hgt * 0.4);
      }
      // 8 rubber: traje con nervaduras finas
      {
        const rib = Math.sin(v * Math.PI * 2 * 24) * 0.5 + 0.5;
        put(8, i, 0.45 + rib * 0.12 + (n2 - 0.5) * 0.1, 0.5 + (n1 - 0.5) * 0.08, 0.62 + (n2 - 0.5) * 0.12, 0.92 + rib * 0.08);
      }
      // 9 glass
      put(9, i, 0.5, 0.5 + (n1 - 0.5) * 0.05, 0.06 + n2 * 0.06, 1);
      // 10 leather: arrugas
      {
        const wr = fbm(u * 1, v * 1, 6, 4, 101);
        const crease = 1 - Math.abs(wr - 0.5) * 2;
        put(10, i, 0.4 + crease * 0.35, 0.5 + (wr - 0.5) * 0.18 - crease * 0.06, 0.55 + crease * 0.15, 0.85 + (1 - crease) * 0.15);
      }
      // 11 wood: veta
      {
        const warp = fbm(u, v, 2, 3, 111);
        const ring = Math.sin((u * 10 + warp * 3.5) * Math.PI * 2) * 0.5 + 0.5;
        const fineG = vnoise(u, v * 0.0625, 128, 113);
        put(11, i, 0.4 + ring * 0.2 + fineG * 0.2, 0.42 + ring * 0.16 + fineG * 0.08, 0.78, 0.9 + ring * 0.1);
      }
      // 12 hull: planchas grandes y chorretones verticales
      {
        const [edge, id] = panels(u, v, 2, 121);
        const groove = 1 - smooth(0.0, 0.008, edge);
        const streak = smooth(0.45, 0.9, vnoise(u, v * 0.0625, 48, 123)) * smooth(0.2, 0.9, fbm(u, v, 4, 2, 125));
        const weld = 1 - smooth(0.0, 0.02, Math.abs(edge - 0.03));
        put(12, i, 0.55 - groove * 0.5 + weld * 0.08 + (n2 - 0.5) * 0.06, 0.52 + (id - 0.5) * 0.1 - streak * 0.22, 0.45 + id * 0.15 + streak * 0.2, 1 - groove * 0.55 - streak * 0.15);
      }
      // 13 grate: rejilla
      {
        const gx = (u * 24) % 1, gy = (v * 24) % 1;
        const hole = gx > 0.2 && gx < 0.8 && gy > 0.15 && gy < 0.85 ? 1 : 0;
        put(13, i, 0.75 - hole * 0.7, 0.5 - hole * 0.3, 0.5, 1 - hole * 0.7);
      }
      // 14 concrete: moteado fino y manchas
      {
        const speck = smooth(0.7, 0.9, vnoise(u, v, 128, 141));
        const stain = smooth(0.5, 0.95, fbm(u, v, 3, 3, 143));
        const [edge] = panels(u, v, 2, 145);
        const joint = 1 - smooth(0.0, 0.006, edge);
        put(14, i, 0.5 + (n2 - 0.5) * 0.25 - speck * 0.1 - joint * 0.4, 0.5 + (n1 - 0.5) * 0.1 - speck * 0.1 - stain * 0.15, 0.88, 1 - joint * 0.4 - stain * 0.08);
      }
      // 15 light: sin detalle
      put(15, i, 0.5, 0.5, 0.4, 1);
    }
  }
  return data;
}

let cachedTex: THREE.DataArrayTexture | null = null;

/** Textura de detalle compartida (se genera una vez) */
export function surfaceTexture(): THREE.DataArrayTexture {
  if (cachedTex) return cachedTex;
  const tex = new THREE.DataArrayTexture(generateLayers(), S, S, LAYERS);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  cachedTex = tex;
  return tex;
}

export function surfaceProps(): THREE.Vector4[] {
  return PROPS.map(([a, b, c, d]) => new THREE.Vector4(a, b, c, d));
}

export const SURFACE_LAYERS = LAYERS;

/** Declaraciones del sombreador de fragmentos */
export const SURF_FRAG_PARS = /* glsl */ `
precision highp sampler2DArray;
uniform sampler2DArray uSurfTex;
uniform vec4 uSurfProps[${LAYERS}];
uniform float uSurfDetail;
varying vec2 vSurf;
varying vec3 vObjP;
varying vec3 vObjN;
vec4 sampleSurf(vec3 p, vec3 n, float layer, float scale) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-5);
  vec4 a = texture(uSurfTex, vec3(p.zy * scale, layer));
  vec4 b = texture(uSurfTex, vec3(p.xz * scale, layer));
  vec4 c = texture(uSurfTex, vec3(p.xy * scale, layer));
  return a * w.x + b * w.y + c * w.z;
}
vec3 surfPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  // Mikkelsen (bump mapping sin tangentes) con derivadas sin normalizar: pendiente física en unidades del mundo
  vec3 vSigmaX = dFdx(surf_pos.xyz);
  vec3 vSigmaY = dFdy(surf_pos.xyz);
  vec3 vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN);
  vec3 R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

/** Declaraciones del sombreador de vértices */
export const SURF_VERT_PARS = /* glsl */ `
attribute vec2 surf;
varying vec2 vSurf;
varying vec3 vObjP;
varying vec3 vObjN;
`;

export const SURF_VERT_MAIN = /* glsl */ `
vSurf = surf;
vObjP = position;
vObjN = normal;
`;

/** Tras <color_fragment>: muestrea el detalle y modula el albedo */
export const SURF_FRAG_COLOR = /* glsl */ `
vec4 sProps = uSurfProps[int(vSurf.x + 0.5)];
float sScale = sProps.x * vSurf.y;
vec4 sd = sampleSurf(vObjP, normalize(vObjN), vSurf.x, sScale);
float sDist = length(vViewPosition);
float sFade = uSurfDetail * (1.0 - smoothstep(40.0, 110.0, sDist));
diffuseColor.rgb *= mix(1.0, (0.55 + sd.g * 0.9) * mix(1.0, sd.a, 0.85), sFade);
`;

/** Tras <roughnessmap_fragment> */
export const SURF_FRAG_ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, sd.b, max(sFade, 0.6));
`;

/** Tras <metalnessmap_fragment> */
export const SURF_FRAG_METAL = /* glsl */ `
if (sProps.z >= 0.0) metalnessFactor = sProps.z;
`;

/** Tras <normal_fragment_maps>: relieve por derivadas de la altura (en unidades del mundo) */
export const SURF_FRAG_NORMAL = /* glsl */ `
{
  float hh = (sd.r - 0.5) * sProps.y * sFade * 0.035 / max(sScale, 0.2);
  normal = surfPerturb(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection);
}
`;
