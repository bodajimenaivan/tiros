// Escena 3D del menú: estrellas, nebulosa, planeta, Destructor Estelar y un combate de cazas.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { MB, C } from '../render/models/builder';
import { tieFighter, xwing } from '../render/models/vehicles';
import { ModelBatch } from '../render/instances';
import { createModelMaterial, sharedUniforms } from '../render/materials';
import { Noise2D } from '../core/noise';
import { glowSprite } from '../render/textures';

function starDestroyer() {
  const b = new MB();
  b.part('body');
  const G = 0xb8bcc4, D = 0x7a7e86;
  b.wedge(3.2, 0.5, 6.0, 0, 0, 0, G, { ry: Math.PI / 2 });
  b.wedge(2.6, 0.35, 5.0, -0.3, 0.45, 0, D, { ry: Math.PI / 2 });
  b.box(1.4, 0.5, 0.9, -1.8, 0.85, 0, G);
  b.box(0.7, 0.35, 1.4, -2.0, 1.25, 0, D);
  b.sym((s) => b.sphere(0.13, -2.0, 1.55, s * 0.4, D));
  b.box(0.2, 0.6, 0.15, -2.0, 1.45, 0, D);
  b.sym((s) => {
    for (let i = 0; i < 3; i++) b.cyl(0.22, 0.22, 0.2, -3.0, 0.25 + i * 0.05, s * (0.35 + i * 0.4) * (i === 0 ? 0 : 1) + (i === 0 ? 0 : 0), C.glowBlue, { em: 2.5, rz: Math.PI / 2 });
  });
  for (let i = 0; i < 40; i++) b.box(0.08, 0.04, 0.08, -2.5 + Math.random() * 5, 0.47 + Math.random() * 0.2, (Math.random() - 0.5) * 2, 0xffe0a0, { em: 1.5 });
  return b.build('sd');
}

export class MenuScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
  composer: EffectComposer;
  private raf = 0;
  private t = 0;
  private last = performance.now();
  private planet: THREE.Mesh;
  private clouds: THREE.Mesh;
  private sd: THREE.Group;
  private fighters: { g: THREE.Group; batch: ModelBatch; phase: number; r: number; speed: number; y: number; tie: boolean }[] = [];
  private bolts: THREE.InstancedMesh;
  private boltData: { p: THREE.Vector3; v: THREE.Vector3; life: number; color: THREE.Color }[] = [];
  private host: HTMLElement;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x010206);

    // estrellas
    const N = 6000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(1500 + Math.random() * 800);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.3, 0.6 + Math.random() * 0.4);
      const k = Math.random() < 0.05 ? 2.5 : 1;
      col.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, map: glowSprite(), transparent: true, depthWrite: false }));
    this.scene.add(stars);

    // nebulosa
    const neb = new THREE.Mesh(
      new THREE.SphereGeometry(2500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uT: { value: 0 } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          varying vec3 vP; uniform float uT;
          float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
          float n(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
            float a=h(i), b=h(i+vec3(1,0,0)), c=h(i+vec3(0,1,0)), d=h(i+vec3(1,1,0));
            float e=h(i+vec3(0,0,1)), f1=h(i+vec3(1,0,1)), g=h(i+vec3(0,1,1)), k=h(i+vec3(1,1,1));
            return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,f1,f.x),mix(g,k,f.x),f.y), f.z); }
          float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.1; a*=0.5; } return s; }
          void main(){
            float f = fbm(vP * 3.0 + vec3(0.0, 0.0, uT * 0.003));
            float band = exp(-pow((vP.y + 0.15 + vP.x * 0.25) * 3.0, 2.0));
            vec3 c = mix(vec3(0.05,0.02,0.12), vec3(0.35,0.12,0.4), f) * band * 0.55;
            c += vec3(0.05,0.2,0.35) * pow(f, 3.0) * band * 0.8;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    this.scene.add(neb);
    (this as any).neb = neb;

    // planeta
    const tex = this.planetTexture();
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }));
    this.planet.position.set(95, -48, -190);
    this.scene.add(this.planet);
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(61, 48, 32), new THREE.MeshStandardMaterial({ map: this.cloudTexture(), transparent: true, opacity: 0.8, depthWrite: false }));
    this.clouds.position.copy(this.planet.position);
    this.scene.add(this.clouds);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(64, 48, 32), new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(vec3(0.3,0.6,1.0)*f*1.6, f); }',
    }));
    atm.position.copy(this.planet.position);
    this.scene.add(atm);

    // luz
    const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
    sun.position.set(200, 80, 60);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x223355, 0.6));

    // destructor estelar
    const mat = createModelMaterial({ roughness: 0.5, metalness: 0.4 });
    this.sd = new THREE.Group();
    const sdb = new ModelBatch(starDestroyer(), this.sd, mat, { shadows: false, capacity: 1 });
    sdb.begin();
    sdb.push(new THREE.Matrix4().makeScale(7, 7, 7), new THREE.Color(0xffffff), null, 1, 0, 1, null);
    sdb.commit(false);
    this.scene.add(this.sd);

    // cazas
    for (let i = 0; i < 8; i++) {
      const tie = i % 2 === 0;
      const b = new MB();
      if (tie) tieFighter(b, i % 4 === 0 ? 'interceptor' : 'fighter');
      else xwing(b, 'xwing');
      const g = new THREE.Group();
      const batch = new ModelBatch(b.build('f' + i), g, mat, { shadows: false, capacity: 1 });
      this.scene.add(g);
      this.fighters.push({ g, batch, phase: Math.random() * Math.PI * 2, r: 18 + Math.random() * 14, speed: 0.35 + Math.random() * 0.2, y: -4 + Math.random() * 12, tie });
    }
    const bg = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);
    bg.rotateZ(Math.PI / 2);
    this.bolts = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ toneMapped: false }), 200);
    this.bolts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(600), 3);
    this.bolts.count = 0;
    this.bolts.frustumCulled = false;
    this.scene.add(this.bolts);

    this.camera.position.set(0, 6, 40);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.5, 0.75));
    this.composer.addPass(new OutputPass());
    this.resize();
    window.addEventListener('resize', this.resize);
    this.raf = requestAnimationFrame(this.loop);
  }

  private planetTexture(): THREE.Texture {
    const W = 1024, H = 512;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const img = g.createImageData(W, H);
    const n = new Noise2D(42);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const lon = (x / W) * Math.PI * 2, lat = (y / H) * Math.PI;
        const px = Math.cos(lon) * Math.sin(lat), py = Math.cos(lat), pz = Math.sin(lon) * Math.sin(lat);
        const v = n.fbm(px * 2 + pz * 0.7 + 3, py * 2 + pz * 1.3, 6);
        const i = (y * W + x) * 4;
        let r: number, gg: number, b: number;
        if (v < -0.02) { r = 20; gg = 50 + v * 40; b = 110 + v * 60; }
        else if (v < 0.03) { r = 190; gg = 170; b = 120; }
        else if (v < 0.25) { r = 60 + v * 80; gg = 110 + v * 60; b = 50; }
        else { r = 130 + v * 60; gg = 115 + v * 40; b = 90; }
        if (Math.abs(py) > 0.85) { r = gg = b = 235; }
        img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private cloudTexture(): THREE.Texture {
    const W = 512, H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const img = g.createImageData(W, H);
    const n = new Noise2D(7);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const lon = (x / W) * Math.PI * 2, lat = (y / H) * Math.PI;
        const px = Math.cos(lon) * Math.sin(lat), py = Math.cos(lat), pz = Math.sin(lon) * Math.sin(lat);
        const v = n.fbm(px * 3 + 10, py * 3 + pz * 2, 5);
        const a = Math.max(0, Math.min(1, (v - 0.02) * 3));
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = a * 220;
      }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private resize = () => {
    const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    sharedUniforms.uTime.value = this.t;
    const t = this.t;
    ((this as any).neb.material as THREE.ShaderMaterial).uniforms.uT.value = t;
    this.planet.rotation.y += dt * 0.01;
    this.clouds.rotation.y += dt * 0.014;
    // el destructor cruza lentamente
    const sdx = ((t * 1.4 + 40) % 160) - 80;
    this.sd.position.set(sdx * 0.5 + 30, 14 + Math.sin(t * 0.1) * 1, -70 - sdx * 0.25);
    this.sd.rotation.set(0.05, -0.35, 0.02);
    // cazas en combate circular
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const f of this.fighters) {
      const a = f.phase + t * f.speed;
      const x = Math.cos(a) * f.r + 22, z = Math.sin(a) * f.r * 0.6 - 14;
      const y = f.y + Math.sin(a * 2) * 3;
      const dx = -Math.sin(a) * f.r, dz = Math.cos(a) * f.r * 0.6, dy = Math.cos(a * 2) * 6;
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      const bank = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.6);
      q.multiply(bank);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1.6, 1.6, 1.6));
      f.batch.begin();
      f.batch.push(m, new THREE.Color(f.tie ? 0x8a8a90 : 0xd04030), null, 1, 0, 1, null);
      f.batch.commit(false);
      if (Math.random() < dt * 1.8) {
        const p = new THREE.Vector3(x, y, z).addScaledVector(dir, 1.5);
        for (const off of [-0.4, 0.4]) {
          const pp = p.clone().add(new THREE.Vector3(0, off * 0.5, off));
          this.boltData.push({ p: pp, v: dir.clone().multiplyScalar(60), life: 0.8, color: new THREE.Color(f.tie ? 0x4aff6a : 0xff3a2a).multiplyScalar(5) });
        }
      }
    }
    this.boltData = this.boltData.filter((b) => (b.life -= dt) > 0);
    let k = 0;
    for (const b of this.boltData) {
      if (k >= 200) break;
      b.p.addScaledVector(b.v, dt);
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), b.v.clone().normalize());
      m.compose(b.p, q, new THREE.Vector3(1, 1, 1));
      this.bolts.setMatrixAt(k, m);
      this.bolts.setColorAt(k, b.color);
      k++;
    }
    this.bolts.count = k;
    this.bolts.instanceMatrix.needsUpdate = true;
    if (this.bolts.instanceColor) this.bolts.instanceColor.needsUpdate = true;
    this.camera.position.set(Math.sin(t * 0.05) * 6, 6 + Math.sin(t * 0.07) * 2, 40);
    this.camera.lookAt(0, 2, -20);
    this.composer.render(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
