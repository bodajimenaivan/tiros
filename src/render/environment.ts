// Mapa de entorno (reflejos e iluminación difusa) generado a partir del cielo del planeta.
import * as THREE from 'three';

export interface SkyColors {
  top: number;
  bottom: number;
  hemiGround: number;
  sun: number;
  sunIntensity: number;
}

export function makeEnvironment(renderer: THREE.WebGLRenderer, sky: SkyColors, sunDir = new THREE.Vector3(0.55, 0.62, 0.35)): THREE.Texture {
  const env = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(sky.top) },
      uBot: { value: new THREE.Color(sky.bottom) },
      uGround: { value: new THREE.Color(sky.hemiGround).multiplyScalar(0.55) },
      uSun: { value: new THREE.Color(sky.sun).multiplyScalar(sky.sunIntensity * 2.2) },
      uSunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uGround; uniform vec3 uSun; uniform vec3 uSunDir; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 sky = mix(uBot, uTop, smoothstep(0.0, 0.7, d.y));
        vec3 c = mix(uGround, sky, smoothstep(-0.12, 0.04, d.y));
        float s = max(dot(d, uSunDir), 0.0);
        c += uSun * (pow(s, 220.0) * 3.0 + pow(s, 8.0) * 0.12);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), m));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  m.dispose();
  return rt.texture;
}
