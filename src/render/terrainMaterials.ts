// Materiales del terreno: cuatro capas (suelo, roca, zonas bajas, caminos) generadas en la GPU
// con ruido periódico (arena con dunas, hierba, roca con grietas, nieve, barro, chapa...).
// Cada capa produce dos texturas que se repiten sin costuras:
//   A: albedo (RGB) + altura (A)      N: normal (RG) + rugosidad (B) + oclusión (A)
// Si existe una foto del jugador en public/textures/terrain/ se usa en lugar de la generada.
import * as THREE from 'three';

export type LayerGen = 'sand' | 'ground' | 'grass' | 'rock' | 'snow' | 'ice' | 'forest' | 'mud' | 'ash' | 'metal' | 'concrete' | 'salt' | 'moss';

export interface LayerSpec {
  gen: LayerGen;
  c0: number;
  c1: number;
  c2: number;
  /** repeticiones por casilla del mapa */
  scale: number;
  /** rugosidad en zonas bajas / altas */
  rough: [number, number];
  /** fuerza del relieve */
  bump: number;
  /** archivo opcional (sin extensión) en public/textures/terrain/ */
  file?: string;
}

export interface TerrainLayers {
  albedo: THREE.Texture[];
  normal: THREE.Texture[];
  scale: number[];
  dispose(): void;
}

const GEN_ID: Record<LayerGen, number> = { sand: 0, ground: 1, grass: 2, rock: 3, snow: 4, ice: 5, forest: 6, mud: 7, ash: 8, metal: 9, concrete: 10, salt: 11, moss: 12 };

const NOISE_GLSL = /* glsl */ `
float hash1(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { float a = hash1(p); return vec2(a, hash1(p + a * 17.17)); }
float vnoise(vec2 p, float P) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash1(mod(i, P)), b = hash1(mod(i + vec2(1.0, 0.0), P));
  float c = hash1(mod(i + vec2(0.0, 1.0), P)), d = hash1(mod(i + vec2(1.0, 1.0), P));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// ruido periódico con periodos distintos en cada eje (para formas alargadas que encajan en mosaico)
float vnoise2(vec2 p, vec2 P) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash1(mod(i, P)), b = hash1(mod(i + vec2(1.0, 0.0), P));
  float c = hash1(mod(i + vec2(0.0, 1.0), P)), d = hash1(mod(i + vec2(1.0, 1.0), P));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 uv, float P, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 8; o++) {
    if (o >= oct) break;
    s += a * vnoise(uv * P, P);
    n += a; a *= 0.5; P *= 2.0;
  }
  return s / n;
}
// Worley periódico: (d1, d2, id de celda)
vec3 worley(vec2 uv, float P) {
  vec2 p = uv * P;
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 c = mod(i + g, P);
      vec2 o = hash2(c);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = hash1(c + 3.1); }
      else if (d < d2) d2 = d;
    }
  return vec3(d1, d2, id);
}
vec3 desat(vec3 c, float k) { float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(vec3(l), c, k); }
`;

const GEN_FRAG = /* glsl */ `
precision highp float;
uniform int uGen;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;
uniform float uSeed;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 uv = vUv + uSeed * 0.0; // periodo entero: la semilla desplaza celdas enteras
  vec2 so = vec2(floor(uSeed * 7.0), floor(uSeed * 13.0));
  vec3 col; float h;
  float n1 = fbm(uv + so / 64.0, 4.0, 5);
  float n2 = fbm(uv + so / 32.0, 16.0, 4);
  float n3 = vnoise((uv + so / 128.0) * 128.0, 128.0);
  if (uGen == 0) {
    // arena: dunas pequeñas por el viento, granulado y alguna piedra
    float warp = fbm(uv, 4.0, 4);
    float rip = sin((uv.x * 24.0 + uv.y * 6.0 + warp * 5.0) * 6.2831853);
    float ripMask = smoothstep(0.3, 0.7, fbm(uv + 0.3, 2.0, 3));
    vec3 st = worley(uv, 20.0);
    float stone = 1.0 - smoothstep(0.08, 0.16, st.x);
    stone *= step(0.82, st.z);
    h = 0.45 + rip * 0.12 * ripMask + (n3 - 0.5) * 0.08 + n1 * 0.15 + stone * 0.3;
    col = mix(uC0, uC1, smoothstep(0.3, 0.75, n1)) * 0.86;
    col *= 0.9 + rip * 0.08 * ripMask + (n3 - 0.5) * 0.16;
    col = mix(col, uC2 * (0.7 + st.z * 0.3), stone);
  } else if (uGen == 1 || uGen == 8) {
    // tierra / grava (8 = ceniza volcánica): guijarros sobre suelo granulado
    vec3 st = worley(uv, uGen == 8 ? 28.0 : 22.0);
    vec3 st2 = worley(uv + 0.5, 48.0);
    float peb = 1.0 - smoothstep(0.18, 0.36, st.x);
    float peb2 = (1.0 - smoothstep(0.12, 0.28, st2.x)) * step(0.5, st2.z);
    float crack = 1.0 - smoothstep(0.0, 0.05, worley(uv, 6.0).y - worley(uv, 6.0).x);
    h = 0.35 + n1 * 0.2 + (n3 - 0.5) * 0.1 + peb * (0.25 + st.z * 0.2) * step(0.45, st.z) + peb2 * 0.15 - crack * 0.15 * step(0.5, n1);
    col = mix(uC0, uC1, smoothstep(0.25, 0.75, n1 + (n2 - 0.5) * 0.4));
    col *= 0.88 + (n3 - 0.5) * 0.2;
    vec3 pc = mix(uC2, uC1 * 0.8, st.z) * (0.75 + st.z * 0.4);
    col = mix(col, pc, peb * step(0.45, st.z));
    col = mix(col, uC2 * (0.6 + st2.z * 0.5), peb2 * 0.8);
    col *= 1.0 - crack * 0.25 * step(0.5, n1);
  } else if (uGen == 2 || uGen == 12) {
    // hierba (12 = musgo): hojas en varias direcciones, matas y calvas de tierra
    float blades = 0.0;
    // briznas: ruido alargado en 4 direcciones (horizontal, vertical y diagonales), todas periódicas
    vec2 q0 = uv, q1 = uv.yx, q2 = vec2(uv.x + uv.y, uv.x - uv.y), q3 = vec2(uv.x - uv.y, uv.x + uv.y);
    blades = max(blades, smoothstep(0.6, 0.95, vnoise2(vec2(q0.x * 160.0, q0.y * 24.0), vec2(160.0, 24.0))));
    blades = max(blades, smoothstep(0.6, 0.95, vnoise2(vec2(q1.x * 160.0, q1.y * 24.0) + 3.0, vec2(160.0, 24.0))));
    blades = max(blades, smoothstep(0.62, 0.95, vnoise2(vec2(q2.x * 112.0, q2.y * 16.0) + 7.0, vec2(112.0, 16.0))));
    blades = max(blades, smoothstep(0.62, 0.95, vnoise2(vec2(q3.x * 112.0, q3.y * 16.0) + 11.0, vec2(112.0, 16.0))));
    blades = blades * 0.7 + n3 * 0.3;
    if (uGen == 12) blades = n3 * 0.6 + n2 * 0.4;
    float clump = fbm(uv, 8.0, 4);
    float bare = smoothstep(0.62, 0.42, fbm(uv + 0.7, 3.0, 5));
    h = 0.35 + blades * 0.35 + clump * 0.2 - bare * 0.25;
    vec3 green = mix(uC0, uC1, smoothstep(0.3, 0.8, clump + (n1 - 0.5) * 0.6));
    green *= 0.7 + blades * 0.45;
    green = mix(green, green * vec3(1.15, 1.1, 0.7), smoothstep(0.85, 1.0, blades) * 0.5); // puntas secas
    vec3 dirt = uC2 * (0.8 + (n3 - 0.5) * 0.4);
    col = mix(green, dirt, bare * (1.0 - blades * 0.6));
  } else if (uGen == 3) {
    // roca: superficie irregular con fracturas finas (ruido "ridged" deformado), estratos y líquenes
    vec2 wq = uv + (vec2(fbm(uv, 4.0, 4), fbm(uv + 0.5, 4.0, 4)) - 0.5) * 0.18;
    float rg = 1.0 - abs(fbm(wq, 6.0, 5) * 2.0 - 1.0);
    float rg2 = 1.0 - abs(fbm(wq + 0.31, 12.0, 4) * 2.0 - 1.0);
    float crack = smoothstep(0.9, 0.985, rg);
    float crack2 = smoothstep(0.92, 0.99, rg2) * 0.6;
    vec3 w1 = worley(wq, 3.0);
    float block = w1.z;
    float strata = sin((wq.y * 14.0 + n1 * 3.0) * 6.2831853) * 0.5 + 0.5;
    float bumps = fbm(wq, 16.0, 4);
    h = 0.45 + (n1 - 0.5) * 0.5 + (bumps - 0.5) * 0.35 + strata * 0.05 + block * 0.1 - crack * 0.35 - crack2 * 0.2;
    col = mix(uC0, uC1, smoothstep(0.25, 0.75, n1 + (block - 0.5) * 0.3));
    col *= 0.82 + strata * 0.1 + (bumps - 0.5) * 0.3 + (n3 - 0.5) * 0.12;
    col *= 1.0 - crack * 0.5 - crack2 * 0.25;
    float lich = smoothstep(0.6, 0.78, fbm(uv + 0.2, 8.0, 4)) * smoothstep(0.45, 0.7, h);
    col = mix(col, uC2, lich * 0.5);
  } else if (uGen == 4) {
    // nieve: suave, crestas del viento, brillo
    float ridge = sin((uv.x * 10.0 + uv.y * 2.0 + n1 * 3.0) * 6.2831853) * 0.5 + 0.5;
    float sparkle = step(0.985, hash1(floor(uv * 512.0)));
    float drift = fbm(uv + 0.3, 3.0, 5);
    h = 0.5 + (n1 - 0.5) * 0.5 + ridge * 0.14 * smoothstep(0.3, 0.7, drift) + (n2 - 0.5) * 0.15;
    col = mix(uC1, uC0, smoothstep(0.3, 0.7, h)) * 0.8;
    col = mix(col, uC2 * 0.75, smoothstep(0.45, 0.25, h) * 0.6); // sombras azuladas en huecos
    col += sparkle * 0.2;
  } else if (uGen == 5) {
    // hielo: liso con grietas blancas y burbujas
    vec3 w1 = worley(uv, 6.0);
    float crack = 1.0 - smoothstep(0.0, 0.025, w1.y - w1.x);
    h = 0.5 + (n1 - 0.5) * 0.2 - crack * 0.1;
    col = mix(uC0, uC1, n1);
    col = mix(col, vec3(0.92, 0.96, 1.0), crack * 0.7);
    col *= 0.92 + w1.z * 0.12;
  } else if (uGen == 6) {
    // suelo de bosque: tierra con hojas secas pequeñas y dispersas, agujas y ramitas
    vec3 dirt = mix(uC0, uC0 * 0.7, n1) * (0.85 + (n3 - 0.5) * 0.3);
    col = dirt; h = 0.3 + n1 * 0.15 + (n3 - 0.5) * 0.08;
    for (int k = 0; k < 3; k++) {
      float P = 36.0 + float(k) * 20.0;
      vec2 p = (uv + float(k) * 0.173) * P;
      vec2 ci = floor(p), cf = fract(p);
      vec2 cc = mod(ci, P);
      float r = hash1(cc + float(k) * 5.1);
      if (r < 0.55) continue;
      vec2 c0 = hash2(cc + 1.7) * 0.5 + 0.25;
      float ang = hash1(cc + 2.3) * 6.2831853;
      vec2 d = cf - c0;
      d = vec2(cos(ang) * d.x - sin(ang) * d.y, sin(ang) * d.x + cos(ang) * d.y);
      float leaf = 1.0 - smoothstep(0.85, 1.0, length(d / vec2(0.32, 0.17)));
      vec3 lc = mix(uC1, uC2, fract(r * 7.3)) * (0.65 + fract(r * 13.1) * 0.6);
      col = mix(col, lc, leaf);
      h = max(h, (0.45 + float(k) * 0.07) * leaf + h * (1.0 - leaf));
    }
    float needles = smoothstep(0.78, 0.95, vnoise2(vec2((uv.x + uv.y) * 192.0, (uv.x - uv.y) * 12.0), vec2(192.0, 12.0))) * smoothstep(0.45, 0.7, n2);
    col = mix(col, uC1 * 0.55, needles * 0.6);
    h += needles * 0.1;
  } else if (uGen == 7) {
    // barro: charcos brillantes, grietas y musgo
    float puddle = smoothstep(0.42, 0.36, fbm(uv + 0.1, 4.0, 5));
    float moss = smoothstep(0.6, 0.75, fbm(uv + 0.5, 8.0, 4));
    h = 0.4 + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.15 - puddle * 0.3 + moss * 0.15;
    col = mix(uC0, uC0 * 0.6, n2) * (0.85 + (n3 - 0.5) * 0.25);
    col = mix(col, uC0 * 0.45, puddle);
    col = mix(col, uC1, moss * 0.8);
  } else if (uGen == 9) {
    // chapas metálicas con juntas, remaches y suciedad
    vec2 g = uv * 4.0;
    vec2 gi = floor(g), gf = fract(g);
    float id = hash1(mod(gi, 4.0) + 9.0);
    float edge = min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y));
    float seam = 1.0 - smoothstep(0.0, 0.02, edge);
    vec2 rv = fract(uv * 32.0) - 0.5;
    float rivet = (1.0 - smoothstep(0.08, 0.14, length(rv))) * step(edge, 0.08) * step(0.03, edge);
    float grime = smoothstep(0.4, 0.9, fbm(uv, 8.0, 4)) * 0.6 + (1.0 - smoothstep(0.0, 0.1, edge)) * 0.3;
    float scratch = smoothstep(0.93, 0.99, vnoise(vec2(uv.x * 12.0, uv.y * 200.0), 1e5));
    h = 0.6 - seam * 0.5 + rivet * 0.25 + (n3 - 0.5) * 0.04;
    col = mix(uC0, uC1, id) * (1.0 - grime * 0.35) + scratch * 0.08;
    col = mix(col, uC2, smoothstep(0.75, 0.95, id) * 0.6); // franjas de aviso / placas pintadas
    col *= 1.0 - seam * 0.5;
  } else if (uGen == 10) {
    // hormigón / ferrocemento
    vec2 g = uv * 2.0;
    vec2 gf = fract(g);
    float edge = min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y));
    float joint = 1.0 - smoothstep(0.0, 0.01, edge);
    float speck = smoothstep(0.7, 0.9, n3);
    float stain = smoothstep(0.5, 0.9, fbm(uv, 3.0, 4));
    h = 0.5 + (n2 - 0.5) * 0.2 - joint * 0.4 - speck * 0.05;
    col = mix(uC0, uC1, n1) * (1.0 - stain * 0.3 - speck * 0.12);
    col *= 1.0 - joint * 0.4;
  } else if (uGen == 11) {
    // costra de sal sobre tierra roja
    vec3 w1 = worley(uv, 7.0);
    float gap = 1.0 - smoothstep(0.02, 0.09, w1.y - w1.x);
    float scuff = smoothstep(0.65, 0.85, fbm(uv + 0.3, 6.0, 4)) * 0.6;
    h = 0.6 + (n2 - 0.5) * 0.15 - gap * 0.45 - scuff * 0.2;
    col = mix(uC0, uC1, n1 * 0.5) * (0.92 + w1.z * 0.08);
    col = mix(col, uC2, max(gap, scuff));
  } else {
    h = n1; col = uC0;
  }
  col = desat(col, 0.86);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(h, 0.0, 1.0));
}`;

/** Convierte una foto (albedo) en capa A: altura aproximada por luminancia */
const PHOTO_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // la luminancia local (frente a la media borrosa) sirve como altura
  vec3 blur = texture2D(tSrc, vUv, 4.0).rgb;
  float lb = dot(blur, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(c, clamp(0.5 + (l - lb) * 1.6, 0.0, 1.0));
}`;

/** Capa N a partir de la altura de la capa A */
const NORMAL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tA;
uniform float uTexel;
uniform float uBump;
uniform vec2 uRough;
varying vec2 vUv;
void main() {
  float h = texture2D(tA, vUv).a;
  float hl = texture2D(tA, vUv - vec2(uTexel, 0.0)).a, hr = texture2D(tA, vUv + vec2(uTexel, 0.0)).a;
  float hd = texture2D(tA, vUv - vec2(0.0, uTexel)).a, hu = texture2D(tA, vUv + vec2(0.0, uTexel)).a;
  vec3 n = normalize(vec3((hl - hr) * uBump, (hd - hu) * uBump, 1.0));
  // cavidad: altura frente a la media de un entorno amplio
  float avg = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    avg += texture2D(tA, vUv + vec2(cos(a), sin(a)) * uTexel * 6.0).a;
  }
  avg /= 8.0;
  float ao = clamp(1.0 - (avg - h) * 2.2, 0.45, 1.0);
  float rough = mix(uRough.x, uRough.y, smoothstep(0.25, 0.7, h));
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, rough, ao);
}`;

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Capas por bioma: [suelo, roca, zonas bajas, caminos] */
export function biomeLayers(biome: string, t: { base: number; alt: number; high: number; low: number; cliff: number; path?: number }): LayerSpec[] {
  const path = t.path ?? t.alt;
  const L = (gen: LayerGen, c0: number, c1: number, c2: number, scale: number, rough: [number, number], bump: number, file?: string): LayerSpec => ({ gen, c0, c1, c2, scale, rough, bump, file });
  switch (biome) {
    case 'desert':
      return [L('sand', t.base, t.alt, 0x8a6a4a, 0.42, [0.95, 0.88], 3, 'arena'), L('rock', t.cliff, t.high, 0xd8b890, 0.22, [0.9, 0.8], 6, 'arenisca'), L('ground', t.low, t.alt, 0x9a7a5a, 0.4, [0.9, 0.85], 4, 'arena'), L('ground', path, t.alt, 0x8a7258, 0.45, [0.92, 0.85], 4, 'camino')];
    case 'ice':
      return [L('snow', t.base, t.alt, 0xb8cce4, 0.35, [0.55, 0.75], 2, 'nieve'), L('rock', t.cliff, 0x5a6878, 0xe8eef4, 0.22, [0.85, 0.7], 6, 'roca_gris'), L('ice', t.low, 0xc8dcee, 0xffffff, 0.3, [0.15, 0.3], 1.5, 'hielo'), L('ground', path, 0x8a96a4, 0x6a747e, 0.45, [0.85, 0.8], 4, 'grava')];
    case 'forest':
      return [L('forest', 0x4a3a28, 0x7a5a30, 0x5a6a2a, 0.5, [0.95, 0.85], 4, 'suelo_bosque'), L('rock', t.cliff, 0x7a7466, 0x4a6a2a, 0.22, [0.9, 0.8], 6, 'roca_gris'), L('mud', 0x3e3424, t.low, 0, 0.4, [0.35, 0.9], 3, 'barro'), L('ground', path, 0x5a4a34, 0x6a6458, 0.45, [0.92, 0.85], 4, 'camino')];
    case 'grassland':
    case 'plains':
    case 'tropical':
      return [
        L('grass', t.base, t.alt, biome === 'tropical' ? 0xd8c8a0 : 0x6a5a3e, 0.55, [0.95, 0.85], 3, biome === 'plains' ? 'pradera' : 'cesped'),
        L('rock', t.cliff, 0x9a9488, 0x6a7a4a, 0.22, [0.9, 0.8], 6, 'roca_gris'),
        biome === 'tropical' ? L('sand', t.low, 0xe8dcb8, 0x9a8a6a, 0.4, [0.9, 0.85], 2.5, 'arena_playa') : L('mud', 0x5a4a32, t.low, 0, 0.4, [0.4, 0.9], 3, 'barro'),
        L('ground', path, 0x8a7a5a, 0x6a6458, 0.45, [0.92, 0.85], 4, 'camino'),
      ];
    case 'jungle':
      return [L('grass', t.base, t.alt, 0x4a3a24, 0.55, [0.95, 0.85], 3, 'suelo_selva'), L('rock', t.cliff, 0x5a5444, 0x3a5a24, 0.22, [0.9, 0.75], 6, 'roca_gris'), L('mud', 0x3a2e20, 0x3a5a24, 0, 0.4, [0.3, 0.9], 3, 'barro'), L('ground', path, 0x5a4a30, 0x6a6458, 0.45, [0.92, 0.85], 4, 'camino')];
    case 'redrock':
      return [L('ground', t.base, t.alt, 0x6a3a22, 0.45, [0.95, 0.88], 4, 'tierra_roja'), L('rock', t.cliff, t.high, 0xd08a5a, 0.2, [0.9, 0.8], 7, 'roca_roja'), L('sand', t.low, t.base, 0x5a2a1a, 0.4, [0.92, 0.88], 2.5, 'tierra_roja'), L('ground', path, t.alt, 0x7a4a30, 0.45, [0.92, 0.85], 4, 'camino')];
    case 'volcanic':
      return [L('ash', t.base, t.alt, 0x1a1412, 0.45, [0.92, 0.85], 4, 'roca_volcanica'), L('rock', t.cliff, 0x3a302c, 0x5a2014, 0.22, [0.85, 0.7], 7, 'roca_volcanica'), L('ash', t.low, 0x2a1a14, 0x6a2a14, 0.4, [0.9, 0.8], 4, 'roca_volcanica'), L('ground', path, 0x3a3230, 0x1e1a18, 0.45, [0.9, 0.85], 4, 'grava')];
    case 'swamp':
      return [L('mud', 0x3a3626, t.base, 0, 0.45, [0.35, 0.92], 3, 'barro'), L('rock', t.cliff, 0x4a4a3a, 0x3a5a2a, 0.22, [0.85, 0.75], 6, 'roca_gris'), L('mud', 0x2a2a1e, t.low, 0, 0.4, [0.2, 0.85], 3, 'barro'), L('moss', t.base, t.alt, 0x3a3020, 0.5, [0.9, 0.85], 3, 'barro')];
    case 'urban':
      return [L('metal', t.base, t.alt, 0x9a7a3a, 0.3, [0.45, 0.6], 3, 'placas_metal'), L('concrete', t.cliff, 0x4a4c50, 0, 0.25, [0.85, 0.8], 4, 'placas_metal'), L('concrete', t.low, t.alt, 0, 0.3, [0.8, 0.75], 4, 'placas_metal'), L('metal', path, t.base, 0xa08a40, 0.3, [0.5, 0.65], 3, 'placas_metal')];
    case 'fungal':
      return [L('moss', t.base, t.alt, 0x6a4a5a, 0.5, [0.9, 0.8], 3, 'suelo_hongos'), L('rock', t.cliff, 0x6a6a4a, 0x8a5a8a, 0.22, [0.85, 0.75], 6, 'roca_gris'), L('mud', 0x3a3024, t.low, 0, 0.4, [0.35, 0.9], 3, 'barro'), L('ground', path, 0x7a6a4a, 0x5a5040, 0.45, [0.92, 0.85], 4, 'camino')];
    case 'salt':
      return [L('salt', t.base, t.alt, 0xb03a26, 0.35, [0.85, 0.6], 3, 'sal'), L('rock', t.cliff, 0x7a3024, 0xd8d0cc, 0.22, [0.9, 0.8], 6, 'roca_roja'), L('ground', t.low, 0x8a2a1a, 0x5a1a10, 0.4, [0.92, 0.88], 4, 'tierra_roja'), L('ground', path, 0xb0402e, 0x6a2a1a, 0.45, [0.92, 0.85], 4, 'tierra_roja')];
    default:
      return [L('ground', t.base, t.alt, t.low, 0.45, [0.92, 0.85], 4), L('rock', t.cliff, t.high, 0x888888, 0.22, [0.9, 0.8], 6), L('ground', t.low, t.base, 0x666666, 0.4, [0.92, 0.85], 4), L('ground', path, t.alt, 0x777777, 0.45, [0.92, 0.85], 4)];
  }
}

/** Fotos de terreno aportadas por el jugador (nombre -> textura ya cargada) */
export const terrainPhotos = new Map<string, THREE.Texture>();

/** Genera las texturas de las capas en la GPU */
export function buildTerrainLayers(renderer: THREE.WebGLRenderer, specs: LayerSpec[], size: number, seed: number): TerrainLayers {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const scene = new THREE.Scene();
  scene.add(quad);
  const genMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: GEN_FRAG,
    uniforms: { uGen: { value: 0 }, uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uSeed: { value: 0 } },
  });
  const photoMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: PHOTO_FRAG, uniforms: { tSrc: { value: null } } });
  const nrmMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: NORMAL_FRAG,
    uniforms: { tA: { value: null }, uTexel: { value: 1 / size }, uBump: { value: 4 }, uRough: { value: new THREE.Vector2(0.9, 0.8) } },
  });
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mkRT = (srgb: boolean) => {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
    });
    rt.texture.anisotropy = aniso;
    return rt;
  };
  const rts: THREE.WebGLRenderTarget[] = [];
  const albedo: THREE.Texture[] = [];
  const normal: THREE.Texture[] = [];
  const prevRT = renderer.getRenderTarget();
  const prevTone = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  const cA = new THREE.Color();
  specs.forEach((sp, i) => {
    const rtA = mkRT(true);
    const photo = sp.file ? terrainPhotos.get(sp.file) : undefined;
    if (photo) {
      photoMat.uniforms.tSrc.value = photo;
      quad.material = photoMat;
    } else {
      genMat.uniforms.uGen.value = GEN_ID[sp.gen];
      // colores de la paleta (sRGB) a lineal: el destino sRGB los vuelve a codificar al escribir
      genMat.uniforms.uC0.value.copy(cA.setHex(sp.c0));
      genMat.uniforms.uC1.value.copy(cA.setHex(sp.c1));
      genMat.uniforms.uC2.value.copy(cA.setHex(sp.c2 || sp.c1));
      genMat.uniforms.uSeed.value = ((seed * 7 + i * 13) % 97) / 97;
      quad.material = genMat;
    }
    renderer.setRenderTarget(rtA);
    renderer.render(scene, cam);
    const rtN = mkRT(false);
    nrmMat.uniforms.tA.value = rtA.texture;
    nrmMat.uniforms.uBump.value = sp.bump * (size / 512);
    nrmMat.uniforms.uRough.value.set(sp.rough[0], sp.rough[1]);
    quad.material = nrmMat;
    renderer.setRenderTarget(rtN);
    renderer.render(scene, cam);
    rts.push(rtA, rtN);
    albedo.push(rtA.texture);
    normal.push(rtN.texture);
  });
  renderer.setRenderTarget(prevRT);
  renderer.toneMapping = prevTone;
  genMat.dispose();
  photoMat.dispose();
  nrmMat.dispose();
  quad.geometry.dispose();
  return {
    albedo,
    normal,
    scale: specs.map((s) => s.scale),
    dispose: () => rts.forEach((r) => r.dispose()),
  };
}
