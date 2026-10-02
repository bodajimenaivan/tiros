// Materiales compartidos: material de modelos instanciados con color de equipo,
// emisión por vértice, destello de impacto, construcción holográfica y niebla.
import * as THREE from 'three';

export interface ModelMaterialUniforms {
  uTime: { value: number };
}

export const sharedUniforms = {
  uTime: { value: 0 },
};

/**
 * Atributos por instancia (vec4 instData):
 *  x = brillo (1 normal, <1 oscurecido por niebla)
 *  y = destello blanco (impacto / selección)
 *  z = progreso de construcción (0..1; 1 = completo)
 *  w = altura del modelo (para el corte de construcción)
 */
export function createModelMaterial(opts: { roughness?: number; metalness?: number } = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: opts.roughness ?? 0.62,
    metalness: opts.metalness ?? 0.18,
    envMapIntensity: 0.6,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float teamMask;
attribute float emissive;
attribute vec4 instData;
varying float vEmissive;
varying vec4 vInst;
varying float vLocalY;
uniform float uTime;`,
      )
      .replace(
        '#include <color_vertex>',
        `#include <color_vertex>
#ifdef USE_INSTANCING_COLOR
  vColor.xyz = mix(color.xyz, color.xyz * instanceColor.xyz, teamMask);
#endif
vEmissive = emissive;
vInst = instData;
vLocalY = position.y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vEmissive;
varying vec4 vInst;
varying float vLocalY;
uniform float uTime;`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
float cutH = vInst.z * vInst.w;
if (vInst.z < 0.999 && vLocalY > cutH + 0.02) discard;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
// oclusión ambiental falsa: la base de los modelos queda más oscura (contacto con el suelo)
diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.55, vLocalY));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
// luz de borde para separar los modelos del terreno
float rimK = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
totalEmissiveRadiance += vec3(0.55, 0.65, 0.8) * rimK * 0.22 * vInst.x;
totalEmissiveRadiance += vColor.rgb * vEmissive * 2.2;
totalEmissiveRadiance += vec3(1.0) * vInst.y * 0.55;
if (vInst.z < 0.999) {
  float edge = 1.0 - smoothstep(0.0, 0.12, abs(vLocalY - cutH));
  totalEmissiveRadiance += vec3(0.3, 0.8, 1.0) * edge * 2.5;
}`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
gl_FragColor.rgb *= vInst.x;`,
      );
  };
  mat.customProgramCacheKey = () => 'swModel2';
  return mat;
}

/** Material holográfico para la parte aún no construida de un edificio */
export function createHologramMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uColor: { value: new THREE.Color(0x4ad8ff) } },
    vertexShader: `
      attribute vec4 instData;
      varying vec4 vInst;
      varying float vLocalY;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vInst = instData;
        vLocalY = position.y;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
        if (instData.z >= 0.999) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec4 vInst;
      varying float vLocalY;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float cutH = vInst.z * vInst.w;
        if (vLocalY < cutH) discard;
        float fres = pow(1.0 - abs(dot(normalize(vN), vView)), 2.0);
        float scan = 0.5 + 0.5 * sin(vLocalY * 40.0 - uTime * 6.0);
        float a = 0.07 + fres * 0.22 + scan * 0.04;
        float line = smoothstep(0.92, 1.0, scan);
        gl_FragColor = vec4(uColor * (0.32 + fres * 0.4 + line * 0.25), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}
