// Terreno: malla de alturas con mezcla de 4 texturas de detalle, color por vértice,
// relieve derivado, niebla de guerra y faldón exterior. Agua / lava / hielo animados.
import * as THREE from 'three';
import type { World } from '../sim/world';
import { T_ALT, T_CLIFF, T_DEEP, T_HIGH, T_LOW, T_PATH, T_SHALLOW } from '../sim/map';
import { noiseTexture } from './textures';
import { biomeLayers, buildTerrainLayers, type TerrainLayers } from './terrainMaterials';
import { Noise2D } from '../core/noise';
import { sharedUniforms } from './materials';

export class TerrainRenderer {
  mesh: THREE.Mesh;
  skirt: THREE.Mesh;
  liquid: THREE.Mesh | null = null;
  fogTex: THREE.DataTexture;
  fogData: Uint8Array;
  heightTex: THREE.DataTexture;
  material: THREE.MeshStandardMaterial;
  private w: World;
  private N: number;
  private fogSmooth: Float32Array;
  layers: TerrainLayers;

  constructor(w: World, scene: THREE.Scene, renderer: THREE.WebGLRenderer, quality: string) {
    this.w = w;
    const N = (this.N = w.map.w);
    const pl = w.planet;
    const m = w.map;

    // ── Niebla de guerra (R: visible, G: explorado) ──
    this.fogData = new Uint8Array(N * N * 4);
    this.fogSmooth = new Float32Array(N * N * 2);
    this.fogTex = new THREE.DataTexture(this.fogData, N, N, THREE.RGBAFormat);
    this.fogTex.magFilter = THREE.LinearFilter;
    this.fogTex.minFilter = THREE.LinearFilter;
    this.fogTex.needsUpdate = true;

    // ── Mapa de alturas para el agua ──
    const hd = new Float32Array((N + 1) * (N + 1));
    hd.set(m.heights);
    this.heightTex = new THREE.DataTexture(hd, N + 1, N + 1, THREE.RedFormat, THREE.FloatType);
    this.heightTex.magFilter = THREE.LinearFilter;
    this.heightTex.minFilter = THREE.LinearFilter;
    this.heightTex.needsUpdate = true;

    // ── Geometría (incluye un borde exterior montañoso de B tiles) ──
    const B = 26;
    const G = N + 2 * B;
    const geo = new THREE.BufferGeometry();
    const V = (G + 1) * (G + 1);
    const pos = new Float32Array(V * 3);
    const col = new Float32Array(V * 3);
    const splat = new Float32Array(V * 4);
    const noise = new Noise2D(w.setup.seed + 5);
    const noiseB = new Noise2D(w.setup.seed + 17);
    const tc = pl.terrain;
    const tmp = new THREE.Color();
    const hN = (x: number, y: number) => m.heights[Math.max(0, Math.min(N, y)) * (N + 1) + Math.max(0, Math.min(N, x))];
    for (let gy = 0; gy <= G; gy++) {
      for (let gx = 0; gx <= G; gx++) {
        const vx = gx - B, vy = gy - B;
        const i = gy * (G + 1) + gx;
        const inside = vx >= 0 && vy >= 0 && vx <= N && vy <= N;
        const cxv = Math.max(0, Math.min(N, vx)), cyv = Math.max(0, Math.min(N, vy));
        const dOut = Math.hypot(vx - cxv, vy - cyv);
        let h = m.heights[cyv * (N + 1) + cxv];
        if (!inside) {
          const ridge = noiseB.ridge(vx * 0.06, vy * 0.06, 4);
          const rise = Math.min(1, dOut / 10);
          h = h * (1 - rise * 0.3) + rise * (2.5 + ridge * 6 * pl.heightAmp * 0.4) + noise.fbm(vx * 0.15, vy * 0.15, 3) * 0.6 * rise;
          if (m.liquid !== 'none') h = Math.max(h, m.waterLevel + 0.2 + rise);
        }
        pos[i * 3] = vx;
        pos[i * 3 + 1] = h;
        pos[i * 3 + 2] = vy;
        let wBase = 0, wAlt = 0, wHigh = 0, wLow = 0, wCliff = 0, wPath = 0, wBed = 0;
        for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
          const tx = Math.max(0, Math.min(N - 1, cxv + dx)), ty = Math.max(0, Math.min(N - 1, cyv + dy));
          const t = m.terrain[ty * N + tx];
          if (t === T_ALT) wAlt++;
          else if (t === T_HIGH) wHigh++;
          else if (t === T_LOW) wLow++;
          else if (t === T_CLIFF) wCliff++;
          else if (t === T_PATH) wPath++;
          else if (t === T_SHALLOW || t === T_DEEP) wBed++;
          else wBase++;
        }
        if (!inside) {
          // fuera del mapa: roca y zonas altas
          const k = Math.min(1, dOut / 6);
          wBase *= 1 - k; wAlt *= 1 - k; wLow *= 1 - k; wPath = 0; wBed *= 1 - k;
          wHigh += k * 2;
          wCliff += k * 2 * Math.max(0, noiseB.noise(vx * 0.1, vy * 0.1) + 0.3);
        }
        const sum = wBase + wAlt + wHigh + wLow + wCliff + wPath + wBed;
        const nv = noise.fbm(vx * 0.15, vy * 0.15, 3);
        const nv2 = noise.fbm(vx * 0.03 + 9, vy * 0.03 + 4, 3);
        // el color viene de las capas de material; aquí solo variación de brillo y oclusión
        tmp.setRGB(1, 1, 1);
        tmp.multiplyScalar(1 + nv * 0.08 + nv2 * 0.08);
        // lecho de ríos y lagos algo más oscuro
        if (wBed > 0) tmp.multiplyScalar(1 - (wBed / sum) * 0.3);
        // oclusión aproximada por concavidad
        const avg = (hN(cxv - 2, cyv) + hN(cxv + 2, cyv) + hN(cxv, cyv - 2) + hN(cxv, cyv + 2)) / 4;
        const ao = inside ? Math.max(0.72, Math.min(1.08, 1 - (avg - h) * 0.18)) : 0.9;
        tmp.multiplyScalar(ao);
        col[i * 3] = tmp.r;
        col[i * 3 + 1] = tmp.g;
        col[i * 3 + 2] = tmp.b;
        splat[i * 4] = (wBase + wAlt + wHigh * 0.6) / sum;
        splat[i * 4 + 1] = (wCliff + wHigh * 0.4) / sum;
        splat[i * 4 + 2] = (wLow + wBed) / sum;
        splat[i * 4 + 3] = wPath / sum;
      }
    }
    const idx: number[] = [];
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        const a = y * (G + 1) + x, b = a + 1, c = a + G + 1, d = c + 1;
        if ((x + y) % 2 === 0) idx.push(a, c, b, b, c, d);
        else idx.push(a, c, d, a, d, b);
      }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const specs = biomeLayers(pl.biome, tc);
    this.layers = buildTerrainLayers(renderer, specs, quality === 'low' ? 512 : 1024, w.setup.seed);
    const L = this.layers;
    const macroTex = noiseTexture(w.setup.seed + 31, 4);

    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: pl.biome === 'urban' ? 0.3 : 0.0, envMapIntensity: 0.45 });
    const fogTex = this.fogTex;
    const NN = N;
    this.material.onBeforeCompile = (shader) => {
      for (let i = 0; i < 4; i++) {
        shader.uniforms['tA' + i] = { value: L.albedo[i] };
        shader.uniforms['tN' + i] = { value: L.normal[i] };
      }
      shader.uniforms.uScale = { value: new THREE.Vector4(...L.scale) };
      shader.uniforms.tMacro = { value: macroTex };
      shader.uniforms.tFog = { value: fogTex };
      shader.uniforms.uN = { value: NN };
      shader.uniforms.uTime = sharedUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec4 splat;
varying vec4 vSplat;
varying vec3 vWorld;
varying vec3 vWN;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vSplat = splat;
vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
vWN = normalize(mat3(modelMatrix) * normal);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform sampler2D tA0; uniform sampler2D tA1; uniform sampler2D tA2; uniform sampler2D tA3;
uniform sampler2D tN0; uniform sampler2D tN1; uniform sampler2D tN2; uniform sampler2D tN3;
uniform vec4 uScale; uniform sampler2D tMacro; uniform sampler2D tFog;
uniform float uN; uniform float uTime;
varying vec4 vSplat; varying vec3 vWorld; varying vec3 vWN;
vec2 tRot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// capa proyectada en planta con dos muestras (escala y giro distintos) para disimular la repetición
void tLayer(sampler2D tA, sampler2D tN, float sc, vec2 wuv, float mk, out vec4 a, out vec3 off, out vec2 rn) {
  vec2 uv1 = wuv * sc;
  vec2 uv2 = tRot(wuv * sc * 0.43, 1.1) + 0.37;
  vec4 a1 = texture2D(tA, uv1), a2 = texture2D(tA, uv2);
  vec4 n1 = texture2D(tN, uv1), n2 = texture2D(tN, uv2);
  float k = clamp(0.25 + (mk - 0.5) * 1.4, 0.0, 0.75);
  a = mix(a1, a2, k);
  vec2 d1 = n1.xy * 2.0 - 1.0;
  vec2 d2 = tRot(n2.xy * 2.0 - 1.0, -1.1);
  vec2 d = mix(d1, d2, k);
  off = vec3(d.x, 0.0, d.y);
  rn = mix(n1.zw, n2.zw, k);
}
vec3 tNw; float tRough; float tAO;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 wuv = vWorld.xz;
  vec3 Ng = normalize(vWN);
  float mk = texture2D(tMacro, wuv * 0.021).r;
  float mk2 = texture2D(tMacro, wuv * 0.0063 + 0.5).g;
  vec4 s = vSplat;
  float slope = 1.0 - Ng.y;
  float rockK = smoothstep(0.32, 0.62, slope);
  s.y += rockK * 2.5;
  s.xzw *= 1.0 - rockK * 0.85;
  vec4 a0 = vec4(0.0), a1 = vec4(0.0), a2 = vec4(0.0), a3 = vec4(0.0);
  vec3 o0 = vec3(0.0), o1 = vec3(0.0), o2 = vec3(0.0), o3 = vec3(0.0);
  vec2 r0 = vec2(0.9, 1.0), r1 = vec2(0.9, 1.0), r2 = vec2(0.9, 1.0), r3 = vec2(0.9, 1.0);
  if (s.x > 0.001) tLayer(tA0, tN0, uScale.x, wuv, mk, a0, o0, r0);
  if (s.z > 0.001) tLayer(tA2, tN2, uScale.z, wuv, mk, a2, o2, r2);
  if (s.w > 0.001) tLayer(tA3, tN3, uScale.w, wuv, mk, a3, o3, r3);
  if (s.y > 0.001) {
    // roca: proyección triplanar (acantilados)
    vec3 bw = pow(abs(Ng), vec3(4.0));
    bw /= (bw.x + bw.y + bw.z);
    float sc = uScale.y;
    vec4 ax = texture2D(tA1, vWorld.zy * sc), ay = texture2D(tA1, vWorld.xz * sc), az = texture2D(tA1, vWorld.xy * sc);
    vec4 nx = texture2D(tN1, vWorld.zy * sc), ny = texture2D(tN1, vWorld.xz * sc), nz = texture2D(tN1, vWorld.xy * sc);
    a1 = ax * bw.x + ay * bw.y + az * bw.z;
    vec2 dx = nx.xy * 2.0 - 1.0, dy = ny.xy * 2.0 - 1.0, dz = nz.xy * 2.0 - 1.0;
    o1 = vec3(0.0, dx.y, dx.x) * bw.x + vec3(dy.x, 0.0, dy.y) * bw.y + vec3(dz.x, dz.y, 0.0) * bw.z;
    r1 = nx.zw * bw.x + ny.zw * bw.y + nz.zw * bw.z;
  }
  // mezcla por alturas: las piedras asoman sobre la arena, la hierba sobre la tierra...
  vec4 hgt = vec4(a0.a, a1.a, a2.a, a3.a);
  vec4 pres = step(vec4(0.001), s);
  vec4 hb = s + hgt * 0.55 * pres;
  float mx = max(max(hb.x, hb.y), max(hb.z, hb.w)) - 0.2;
  vec4 wv = max(hb - mx, 0.0) * pres;
  wv /= (wv.x + wv.y + wv.z + wv.w + 1e-4);
  vec3 alb = a0.rgb * wv.x + a1.rgb * wv.y + a2.rgb * wv.z + a3.rgb * wv.w;
  vec3 off = o0 * wv.x + o1 * wv.y + o2 * wv.z + o3 * wv.w;
  vec2 rn = r0 * wv.x + r1 * wv.y + r2 * wv.z + r3 * wv.w;
  // variación de color a gran escala
  alb *= 0.84 + mk2 * 0.32;
  alb = mix(alb, alb * vec3(1.06, 1.0, 0.92), smoothstep(0.55, 0.8, mk) * 0.6);
  diffuseColor.rgb *= alb * mix(1.0, rn.y, 0.85);
  tNw = normalize(Ng + off * 0.9);
  tRough = rn.x;
  tAO = rn.y;
}`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = tRough;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = normalize((viewMatrix * vec4(tNw, 0.0)).xyz);`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
{
  vec2 fuv = clamp(vWorld.xz, 0.5, uN - 0.5) / uN;
  vec4 fg = texture2D(tFog, fuv);
  float vis = fg.r;
  float exp = fg.g;
  float f = mix(0.0, 0.42, exp);
  f = mix(f, 1.0, vis);
  // fuera del mapa: paisaje decorativo atenuado
  float outD = max(max(-vWorld.x, vWorld.x - uN), max(-vWorld.z, vWorld.z - uN));
  if (outD > 0.0) f = mix(f, 0.55 * max(exp, 0.6), smoothstep(0.0, 3.0, outD));
  gl_FragColor.rgb *= f;
}`);
    };
    this.material.customProgramCacheKey = () => 'swTerrain2';
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    scene.add(this.mesh);

    // ── Faldón exterior lejano ──
    const sg = new THREE.PlaneGeometry(N * 6, N * 6, 1, 1);
    sg.rotateX(-Math.PI / 2);
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(pl.terrain.cliff).multiplyScalar(0.35) });
    this.skirt = new THREE.Mesh(sg, sm);
    let minH = 1e9;
    for (let i = 0; i < m.heights.length; i++) if (m.heights[i] < minH) minH = m.heights[i];
    this.skirt.position.set(N / 2, Math.min(minH, m.waterLevel) - 3, N / 2);
    scene.add(this.skirt);

    // ── Líquido ──
    if (m.liquid !== 'none' && pl.water) this.liquid = this.makeLiquid(scene, pl.water.color, m.liquid, m.waterLevel);
  }

  private makeLiquid(scene: THREE.Scene, color: number, kind: string, level: number): THREE.Mesh {
    const N = this.N;
    const g = new THREE.PlaneGeometry(N, N, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(N / 2, level, N / 2);
    const nt = noiseTexture(11, 6);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        tNoise: { value: nt },
        tHeight: { value: this.heightTex },
        tFog: { value: this.fogTex },
        uN: { value: N },
        uLevel: { value: level },
        uColor: { value: new THREE.Color(color) },
        uDeep: { value: new THREE.Color(color).multiplyScalar(kind === 'lava' ? 0.6 : 0.35) },
        uSky: { value: new THREE.Color(this.w.planet.sky.top) },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunCol: { value: new THREE.Color(this.w.planet.sky.sun) },
        uKind: { value: kind === 'lava' ? 1 : kind === 'ice' ? 2 : kind === 'swamp' ? 3 : kind === 'acid' ? 4 : 0 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uTime; uniform sampler2D tNoise; uniform sampler2D tHeight; uniform sampler2D tFog;
        uniform float uN; uniform float uLevel; uniform vec3 uColor; uniform vec3 uDeep; uniform vec3 uSky;
        uniform vec3 uSunDir; uniform vec3 uSunCol; uniform int uKind;
        varying vec3 vWorld;
        void main() {
          vec2 uv = vWorld.xz;
          float th = texture2D(tHeight, (uv + 0.5) / (uN + 1.0)).r;
          float depth = uLevel - th;
          if (depth < -0.05) discard;
          vec2 fuv = uv / uN;
          vec4 fg = texture2D(tFog, fuv);
          float fog = mix(mix(0.0, 0.42, fg.g), 1.0, fg.r);
          vec3 col;
          float alpha;
          if (uKind == 1) {
            // lava
            vec2 f1 = uv * 0.06 + vec2(uTime * 0.01, uTime * 0.006);
            vec2 f2 = uv * 0.13 - vec2(uTime * 0.008, -uTime * 0.012);
            float n = texture2D(tNoise, f1).r * 0.6 + texture2D(tNoise, f2).g * 0.4;
            float crust = smoothstep(0.43, 0.47, n);
            float rim = smoothstep(0.38, 0.45, n) * (1.0 - crust);
            vec3 hot = vec3(1.0, 0.2, 0.02) * 1.15;
            vec3 glow = vec3(1.0, 0.55, 0.08) * 1.7;
            vec3 rock = vec3(0.06, 0.03, 0.025) + vec3(0.05, 0.015, 0.0) * texture2D(tNoise, uv * 0.4).g;
            col = mix(mix(hot, glow, smoothstep(0.3, 0.1, n)), rock, crust);
            col = mix(col, vec3(0.6, 0.12, 0.02), rim * 0.6);
            col *= 0.9 + 0.1 * sin(uTime * 2.0 + n * 12.0);
            alpha = 1.0;
          } else if (uKind == 2) {
            // hielo
            float n = texture2D(tNoise, uv * 0.08).r;
            float crack = smoothstep(0.48, 0.5, n) * (1.0 - smoothstep(0.5, 0.52, n));
            col = mix(vec3(0.75, 0.86, 0.95), vec3(0.55, 0.72, 0.88), smoothstep(0.0, 1.5, depth));
            col += crack * 0.25;
            vec3 V = normalize(cameraPosition - vWorld);
            vec3 H = normalize(uSunDir + V);
            col += uSunCol * pow(max(dot(vec3(0.0, 1.0, 0.0), H), 0.0), 60.0) * 0.6;
            alpha = 0.92;
          } else {
            vec2 w1 = uv * 0.09 + vec2(uTime * 0.02, uTime * 0.013);
            vec2 w2 = uv * 0.17 - vec2(uTime * 0.017, -uTime * 0.021);
            vec3 n1 = texture2D(tNoise, w1).rgb * 2.0 - 1.0;
            vec3 n2 = texture2D(tNoise, w2).rgb * 2.0 - 1.0;
            vec3 N = normalize(vec3((n1.x + n2.y) * 0.22, 1.0, (n1.y + n2.x) * 0.22));
            vec3 V = normalize(cameraPosition - vWorld);
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            vec3 H = normalize(uSunDir + V);
            float spec = pow(max(dot(N, H), 0.0), 120.0);
            float dk = smoothstep(0.0, 1.6, depth);
            col = mix(uColor * 1.1, uDeep, dk);
            col = mix(col, uSky, fres * (uKind == 3 ? 0.15 : 0.5));
            col += uSunCol * spec * (uKind == 3 ? 0.4 : 1.6);
            // espuma en la orilla
            float foamN = texture2D(tNoise, uv * 0.35 + uTime * 0.03).b;
            float wave = 0.5 + 0.5 * sin(uTime * 1.3 - depth * 38.0 + foamN * 4.0);
            float foam = (1.0 - smoothstep(0.0, 0.13, depth)) * smoothstep(0.45, 0.8, foamN * 0.6 + wave * 0.5);
            if (uKind != 3) col = mix(col, vec3(0.85, 0.92, 0.97), foam * 0.5);
            alpha = mix(0.5, 0.93, smoothstep(0.0, 0.5, depth) * 0.4 + dk * 0.6);
            if (uKind == 3) { col *= 0.8; alpha = mix(0.75, 0.97, dk); }
            if (uKind == 4) col += vec3(0.1, 0.4, 0.1) * (0.5 + 0.5 * sin(uTime + uv.x));
          }
          float edge = smoothstep(0.0, 1.5, min(min(vWorld.x, vWorld.z), min(uN - vWorld.x, uN - vWorld.z)));
          gl_FragColor = vec4(col * fog * edge, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: kind !== 'lava',
      depthWrite: kind === 'lava' || kind === 'ice',
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = 2;
    mesh.receiveShadow = false;
    scene.add(mesh);
    return mesh;
  }

  /** Copia la niebla del jugador observador a la textura con suavizado temporal */
  updateFog(pid: number, dt: number, revealAll: boolean) {
    const p = this.w.players[pid];
    const N = this.N;
    const d = this.fogData;
    const s = this.fogSmooth;
    const k = Math.min(1, dt * 6);
    for (let i = 0; i < N * N; i++) {
      const tv = revealAll ? 1 : p.visible[i];
      const te = revealAll ? 1 : p.explored[i];
      s[i * 2] += (tv - s[i * 2]) * k;
      s[i * 2 + 1] = Math.max(s[i * 2 + 1], te);
      d[i * 4] = Math.round(s[i * 2] * 255);
      d[i * 4 + 1] = Math.round(s[i * 2 + 1] * 255);
    }
    this.fogTex.needsUpdate = true;
  }

  /** Altura visible bajo un punto (incluye líquido) */
  heightAt(x: number, y: number): number {
    return this.w.map.surfaceAt(x, y);
  }
}
