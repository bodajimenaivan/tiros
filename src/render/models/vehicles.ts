// Vehículos, andadores, criaturas y naves de Star Wars (procedurales).
import { MB, C } from './builder';
import { humanoid, type HumOpts } from './humanoids';

const IMP = 0xb8bcc4; // gris imperial
const IMPD = 0x6a6e76;

// ─────────────────────────── Motos speeder / STAP ───────────────────────────
export function speederBike(b: MB, body: number, rider: HumOpts | null, kind: 'bike' | 'stap' | 'barc' | 'flash' = 'bike') {
  b.part('body', 'bob');
  if (kind === 'stap') {
    b.box(0.1, 0.5, 0.1, 0, 0.45, 0, body);
    b.box(0.25, 0.08, 0.35, 0.05, 0.25, 0, body);
    b.sym((s) => b.cyl(0.06, 0.06, 0.25, 0.15, 0.35, s * 0.18, C.dgray, { rz: Math.PI / 2 }));
    b.box(0.08, 0.04, 0.3, 0.1, 0.68, 0, C.team, { team: 1 });
    if (rider) b.offset(-0.02, 0.18, 0, () => humanoid(b, { ...rider, weapon: 'none' }));
    return;
  }
  if (kind === 'flash') {
    b.box(0.9, 0.18, 0.38, 0, 0.3, 0, body);
    b.box(0.3, 0.1, 0.3, 0.3, 0.42, 0, C.glass);
    b.box(0.6, 0.05, 0.4, -0.1, 0.4, 0, C.team, { team: 1 });
    b.sym((s) => b.cyl(0.05, 0.06, 0.4, -0.38, 0.32, s * 0.15, C.dgray, { rz: Math.PI / 2 }));
    if (rider) b.offset(-0.1, 0.25, 0, () => humanoid(b, { ...rider, scale: 0.85 }));
    return;
  }
  // moto 74-Z / BARC
  const L = kind === 'barc' ? 1.1 : 0.95;
  b.box(L, 0.12, 0.16, 0, 0.3, 0, body);
  b.box(0.35, 0.08, 0.1, L * 0.55, 0.3, 0, body); // horquilla delantera
  b.sym((s) => b.box(0.3, 0.03, 0.12, L * 0.62, 0.3, s * 0.1, C.dgray)); // aletas
  b.box(0.3, 0.16, 0.22, -L * 0.3, 0.34, 0, IMPD);
  b.box(0.25, 0.04, 0.17, 0, 0.37, 0, C.team, { team: 1 });
  b.cyl(0.03, 0.03, 0.08, -L * 0.5, 0.34, 0, C.glowOrange, { em: 2, rz: Math.PI / 2 });
  if (kind === 'barc') b.sym((s) => b.cyl(0.05, 0.05, 0.4, 0.1, 0.27, s * 0.14, C.dgray, { rz: Math.PI / 2 }));
  if (rider) b.offset(-0.08, 0.2, 0, () => humanoid(b, { ...rider, weapon: 'none', scale: 0.9 }));
}

// ─────────────────────────── Tanques repulsores ───────────────────────────
export interface TankOpts {
  len: number;
  wid: number;
  hgt: number;
  body: number;
  trim?: number;
  turret?: 'single' | 'twin' | 'big' | 'missile' | 'ion' | 'none' | 'quad';
  shape?: 'flat' | 'wedge' | 'round' | 'aat' | 'mtt';
  tracks?: boolean;
  cannon?: number;
}

export function hoverTank(b: MB, o: TankOpts) {
  const { len: L, wid: W, hgt: H } = o;
  const trim = o.trim ?? C.dgray;
  b.part('body', o.tracks ? 'static' : 'bob');
  const baseY = o.tracks ? 0.12 : 0.22;
  if (o.tracks) {
    b.sym((s) => {
      b.box(L * 0.95, 0.24, W * 0.22, 0, 0.12, s * W * 0.4, C.dark);
      for (let i = 0; i < 4; i++) b.cyl(0.09, 0.09, W * 0.23, -L * 0.35 + (i * L * 0.7) / 3, 0.12, s * W * 0.4, C.dgray, { rx: Math.PI / 2 });
    });
  }
  switch (o.shape ?? 'flat') {
    case 'wedge':
      b.box(L * 0.75, H * 0.5, W, -L * 0.1, baseY + H * 0.25, 0, o.body);
      b.wedge(W, H * 0.5, L * 0.4, L * 0.38, baseY, 0, o.body, { ry: Math.PI / 2, sy: 1 });
      break;
    case 'round':
      b.sphere(W * 0.55, 0, baseY + H * 0.3, 0, o.body, { sx: L / W, sy: H / W, seg: 12 });
      break;
    case 'aat':
      b.box(L * 0.55, H * 0.45, W * 0.9, -L * 0.15, baseY + H * 0.22, 0, o.body);
      b.wedge(W * 0.9, H * 0.4, L * 0.55, L * 0.28, baseY, 0, o.body, { ry: Math.PI / 2 });
      b.sym((s) => b.box(L * 0.3, H * 0.25, 0.1, L * 0.35, baseY + H * 0.12, s * W * 0.4, trim));
      break;
    case 'mtt':
      b.sphere(W * 0.6, 0, baseY + H * 0.4, 0, o.body, { sx: L / W * 0.95, sy: H / W, seg: 12 });
      b.box(0.1, H * 0.6, W * 0.7, L * 0.5, baseY + H * 0.4, 0, trim);
      b.sym((s) => b.sphere(0.12, L * 0.38, baseY + H * 0.7, s * W * 0.2, C.glowOrange, { em: 1.2 }));
      break;
    default:
      b.box(L, H * 0.5, W, 0, baseY + H * 0.25, 0, o.body);
      b.box(L * 0.8, H * 0.15, W * 0.85, -L * 0.05, baseY + H * 0.55, 0, o.body);
  }
  // detalles
  b.box(L * 0.5, 0.04, W * 1.02, -L * 0.15, baseY + H * 0.45, 0, C.team, { team: 1 });
  if (!o.tracks) {
    b.sym((s) => b.box(L * 0.7, 0.06, 0.06, 0, baseY - 0.02, s * W * 0.45, trim));
    b.box(L * 0.6, 0.03, W * 0.6, 0, baseY - 0.05, 0, C.glowCyan, { em: 0.6 }); // repulsores
  }
  b.cyl(0.06, 0.06, 0.1, -L * 0.5, baseY + H * 0.3, W * 0.2, C.glowOrange, { em: 2, rz: Math.PI / 2 });
  b.cyl(0.06, 0.06, 0.1, -L * 0.5, baseY + H * 0.3, -W * 0.2, C.glowOrange, { em: 2, rz: Math.PI / 2 });
  // torreta
  const ty = baseY + H * 0.7;
  const cannon = o.cannon ?? C.gun;
  b.part('turret', 'head', [0, ty, 0], 'body');
  switch (o.turret ?? 'single') {
    case 'single':
      b.cyl(W * 0.28, W * 0.32, H * 0.3, 0, ty, 0, o.body, { seg: 8 });
      b.cyl(0.05, 0.05, L * 0.55, L * 0.32, ty + 0.04, 0, cannon, { rz: Math.PI / 2 });
      break;
    case 'twin':
      b.box(W * 0.5, H * 0.25, W * 0.5, 0, ty, 0, o.body);
      b.sym((s) => b.cyl(0.04, 0.04, L * 0.5, L * 0.3, ty + 0.04, s * 0.09, cannon, { rz: Math.PI / 2 }));
      break;
    case 'big':
      b.box(L * 0.35, H * 0.3, W * 0.5, -L * 0.05, ty, 0, o.body);
      b.cyl(0.08, 0.08, L * 0.7, L * 0.38, ty + 0.05, 0, cannon, { rz: Math.PI / 2 });
      b.cyl(0.1, 0.1, 0.12, L * 0.72, ty + 0.05, 0, C.dgray, { rz: Math.PI / 2 });
      break;
    case 'quad':
      b.box(W * 0.5, H * 0.25, W * 0.5, 0, ty, 0, o.body);
      b.sym((s) => {
        b.cyl(0.035, 0.035, L * 0.45, L * 0.25, ty + 0.08, s * 0.08, cannon, { rz: Math.PI / 2 });
        b.cyl(0.035, 0.035, L * 0.45, L * 0.25, ty - 0.02, s * 0.08, cannon, { rz: Math.PI / 2 });
      });
      break;
    case 'missile':
      b.box(L * 0.4, H * 0.45, W * 0.7, 0, ty + 0.1, 0, o.body, { rz: 0.35 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) b.cyl(0.05, 0.05, 0.05, L * 0.12, ty + 0.12 + j * 0.13, (i - 1) * 0.15, C.dark, { rz: Math.PI / 2 - 0.35 });
      break;
    case 'ion':
      b.cyl(W * 0.25, W * 0.3, H * 0.3, 0, ty, 0, o.body, { seg: 8 });
      b.cyl(0.06, 0.09, L * 0.45, L * 0.25, ty + 0.06, 0, cannon, { rz: Math.PI / 2 });
      b.torus(0.08, 0.025, L * 0.42, ty + 0.06, 0, C.glowBlue, { ry: Math.PI / 2, em: 1.6 });
      break;
    case 'none':
      break;
  }
  b.part('body');
}

// ─────────────────────────── Andadores ───────────────────────────
export function atst(b: MB, body: number, scale = 1, opts: { chicken?: boolean } = {}) {
  const s = scale;
  const hipY = 1.25 * s;
  b.part('body', 'static');
  // cabeza / cabina
  const hy = hipY + 0.32 * s;
  b.box(0.62 * s, 0.4 * s, 0.5 * s, 0.05 * s, hy, 0, body);
  b.wedge(0.5 * s, 0.12 * s, 0.3 * s, 0.36 * s, hy - 0.12 * s, 0, body, { ry: Math.PI / 2, rz: -0.2 });
  b.box(0.04 * s, 0.07 * s, 0.32 * s, 0.37 * s, hy + 0.06 * s, 0, C.black); // visor
  b.box(0.5 * s, 0.06 * s, 0.52 * s, 0.02 * s, hy + 0.23 * s, 0, C.team, { team: 1 });
  b.sym((ss) => b.cyl(0.04 * s, 0.04 * s, 0.32 * s, 0.32 * s, hy - 0.12 * s, ss * 0.27 * s, C.gun, { rz: Math.PI / 2 }));
  b.cyl(0.035 * s, 0.035 * s, 0.25 * s, 0.3 * s, hy + 0.05 * s, -0.3 * s, C.gun, { rz: Math.PI / 2 });
  b.box(0.3 * s, 0.18 * s, 0.3 * s, -0.05 * s, hipY + 0.05 * s, 0, IMPD); // cuello/cadera
  // piernas (articulación inversa simplificada)
  for (const side of [1, -1]) {
    const z = side * 0.24 * s;
    const name = side > 0 ? 'legL' : 'legR';
    b.part(name, side > 0 ? 'legL' : 'legR', [0, hipY, z]);
    b.box(0.12 * s, 0.6 * s, 0.1 * s, 0.08 * s, hipY - 0.28 * s, z, body, { rz: -0.35 });
    b.box(0.1 * s, 0.65 * s, 0.09 * s, 0.06 * s, hipY - 0.85 * s, z, body, { rz: 0.3 });
    b.box(0.08 * s, 0.08 * s, 0.08 * s, 0.17 * s, hipY - 0.56 * s, z, IMPD);
    b.box(0.34 * s, 0.06 * s, 0.24 * s, 0.02 * s, 0.03 * s, z, IMPD); // pie
    b.box(0.08 * s, 0.05 * s, 0.3 * s, 0.17 * s, 0.03 * s, z, IMPD);
  }
  void opts;
  b.part('body');
}

export function atat(b: MB, body: number, scale = 1) {
  const s = scale;
  const bodyY = 2.3 * s;
  b.part('body', 'static');
  // cuerpo
  b.box(1.9 * s, 0.75 * s, 0.85 * s, 0, bodyY, 0, body);
  b.box(1.7 * s, 0.25 * s, 0.75 * s, 0, bodyY + 0.48 * s, 0, body);
  b.box(1.95 * s, 0.08 * s, 0.9 * s, 0, bodyY - 0.4 * s, 0, IMPD);
  b.box(1.4 * s, 0.06 * s, 0.88 * s, 0, bodyY + 0.2 * s, 0, C.team, { team: 1 });
  for (let i = 0; i < 4; i++) b.box(0.05 * s, 0.6 * s, 0.87 * s, -0.7 * s + i * 0.45 * s, bodyY, 0, IMPD);
  // cuello y cabeza
  b.box(0.5 * s, 0.3 * s, 0.3 * s, 1.1 * s, bodyY - 0.05 * s, 0, IMPD);
  b.part('head', 'head', [1.35 * s, bodyY - 0.05 * s, 0], 'body');
  b.box(0.7 * s, 0.42 * s, 0.42 * s, 1.65 * s, bodyY - 0.1 * s, 0, body);
  b.wedge(0.42 * s, 0.15 * s, 0.25 * s, 2.05 * s, bodyY - 0.31 * s, 0, body, { ry: Math.PI / 2 });
  b.box(0.04 * s, 0.06 * s, 0.3 * s, 2.0 * s, bodyY + 0.04 * s, 0, C.black);
  b.sym((ss) => b.cyl(0.05 * s, 0.05 * s, 0.45 * s, 2.0 * s, bodyY - 0.28 * s, ss * 0.2 * s, C.gun, { rz: Math.PI / 2 }));
  b.sym((ss) => b.cyl(0.03 * s, 0.03 * s, 0.3 * s, 1.95 * s, bodyY + 0.0 * s, ss * 0.24 * s, C.gun, { rz: Math.PI / 2 }));
  // patas
  const legs: [string, 'legFL' | 'legFR' | 'legBL' | 'legBR', number, number][] = [
    ['legFL', 'legFL', 0.7, 0.36], ['legFR', 'legFR', 0.7, -0.36], ['legBL', 'legBL', -0.7, 0.36], ['legBR', 'legBR', -0.7, -0.36],
  ];
  for (const [name, anim, x, z] of legs) {
    b.part(name, anim, [x * s, bodyY - 0.3 * s, z * s]);
    b.box(0.22 * s, 0.25 * s, 0.22 * s, x * s, bodyY - 0.35 * s, z * s, IMPD);
    b.box(0.16 * s, 1.0 * s, 0.16 * s, x * s, bodyY - 0.95 * s, z * s, body);
    b.box(0.2 * s, 0.18 * s, 0.2 * s, x * s, bodyY - 1.45 * s, z * s, IMPD);
    b.box(0.14 * s, 0.75 * s, 0.14 * s, x * s, bodyY - 1.85 * s, z * s, body);
    b.cyl(0.18 * s, 0.22 * s, 0.14 * s, x * s, 0.07 * s, z * s, IMPD, { seg: 8 });
  }
  b.part('body');
}

export function atte(b: MB, body: number, scale = 1) {
  const s = scale;
  const by = 1.0 * s;
  b.part('body', 'static');
  b.box(2.0 * s, 0.55 * s, 0.75 * s, 0, by, 0, body);
  b.box(0.7 * s, 0.5 * s, 0.7 * s, 1.1 * s, by + 0.05 * s, 0, body);
  b.box(0.04 * s, 0.1 * s, 0.5 * s, 1.46 * s, by + 0.12 * s, 0, C.black);
  b.box(1.8 * s, 0.08 * s, 0.77 * s, -0.1 * s, by + 0.12 * s, 0, C.team, { team: 1 });
  b.box(0.5 * s, 0.2 * s, 0.5 * s, -0.5 * s, by + 0.38 * s, 0, body);
  b.cyl(0.07 * s, 0.07 * s, 1.0 * s, 0.0 * s, by + 0.5 * s, 0, C.gun, { rz: Math.PI / 2 - 0.2 }); // cañón de masa
  b.sym((ss) => b.cyl(0.04 * s, 0.04 * s, 0.3 * s, 1.5 * s, by - 0.05 * s, ss * 0.22 * s, C.gun, { rz: Math.PI / 2 }));
  const xs = [0.8, 0, -0.8];
  const anims: ['legFL', 'legFR'] | ['legML', 'legMR'] | ['legBL', 'legBR'][] = [];
  void anims;
  const am: [string, string][] = [['legFL', 'legFR'], ['legML', 'legMR'], ['legBL', 'legBR']];
  xs.forEach((x, i) => {
    for (const side of [1, -1]) {
      const z = side * 0.48 * s;
      const anim = (side > 0 ? am[i][0] : am[i][1]) as any;
      b.part(anim, anim, [x * s, by - 0.1 * s, z]);
      b.box(0.14 * s, 0.5 * s, 0.12 * s, x * s, by - 0.15 * s, z + side * 0.08 * s, IMPD, { rx: side * 0.5 });
      b.box(0.12 * s, 0.75 * s, 0.12 * s, x * s, by - 0.62 * s, z + side * 0.22 * s, body, { rx: -side * 0.15 });
      b.box(0.24 * s, 0.06 * s, 0.2 * s, x * s, 0.04 * s, z + side * 0.27 * s, IMPD);
    }
  });
  b.part('body');
}

export function atrt(b: MB, body: number, rider: HumOpts) {
  const hipY = 0.75;
  b.part('body');
  b.box(0.3, 0.25, 0.3, 0, hipY + 0.05, 0, body);
  b.box(0.14, 0.04, 0.32, 0.02, hipY + 0.2, 0, C.team, { team: 1 });
  b.cyl(0.035, 0.035, 0.4, 0.3, hipY - 0.02, 0, C.gun, { rz: Math.PI / 2 });
  b.offset(-0.05, hipY - 0.12, 0, () => humanoid(b, { ...rider, weapon: 'none', scale: 0.9 }));
  for (const side of [1, -1]) {
    const z = side * 0.14;
    b.part(side > 0 ? 'legL' : 'legR', side > 0 ? 'legL' : 'legR', [0, hipY, z]);
    b.box(0.08, 0.42, 0.07, 0.07, hipY - 0.2, z, body, { rz: -0.35 });
    b.box(0.07, 0.4, 0.06, 0.05, hipY - 0.55, z, body, { rz: 0.3 });
    b.box(0.22, 0.04, 0.12, 0.02, 0.02, z, IMPD);
  }
  b.part('body');
}

/** Droide araña: cuerpo esférico y N patas */
export function spiderDroid(b: MB, body: number, legs: number, size: number, cannon: 'small' | 'big' | 'homing') {
  const s = size;
  const by = 0.6 * s;
  b.part('body', 'static');
  b.sphere(0.38 * s, 0, by, 0, body, { seg: 12 });
  b.sphere(0.12 * s, 0.32 * s, by + 0.05 * s, 0, C.glowRed, { em: 1.5 });
  b.box(0.4 * s, 0.05 * s, 0.6 * s, 0, by + 0.32 * s, 0, C.team, { team: 1 });
  if (cannon === 'big') b.cyl(0.08 * s, 0.1 * s, 0.8 * s, 0.5 * s, by + 0.1 * s, 0, C.gun, { rz: Math.PI / 2 });
  else if (cannon === 'homing') {
    b.cyl(0.18 * s, 0.22 * s, 0.6 * s, 0.25 * s, by + 0.42 * s, 0, body, { rz: Math.PI / 2 - 0.5 });
    b.torus(0.15 * s, 0.04 * s, 0.5 * s, by + 0.6 * s, 0, C.glowGreen, { ry: Math.PI / 2, em: 1.4 });
  } else b.cyl(0.04 * s, 0.05 * s, 0.6 * s, 0.4 * s, by, 0, C.gun, { rz: Math.PI / 2 });
  const animOf = (i: number) => (['legFL', 'legBR', 'legFR', 'legBL', 'legML', 'legMR'] as const)[i % 6];
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2 + Math.PI / legs;
    const cx = Math.cos(a), cz = Math.sin(a);
    const anim = animOf(i);
    b.part('leg' + i, anim, [cx * 0.3 * s, by, cz * 0.3 * s]);
    b.box(0.6 * s, 0.07 * s, 0.07 * s, cx * 0.55 * s, by + 0.2 * s, cz * 0.55 * s, IMPD, { ry: -a, rz: 0.6 });
    b.box(0.07 * s, 0.75 * s, 0.07 * s, cx * 0.85 * s, by - 0.15 * s, cz * 0.85 * s, body);
  }
  b.part('body');
}

/** Droide rueda (Persuasor / Granizo) */
export function wheelDroid(b: MB, body: number, big: boolean) {
  const r = big ? 0.75 : 0.55;
  b.part('wheel', 'spin', [0, r, 0]);
  b.torus(r * 0.85, r * 0.15, 0, r, big ? 0.3 : 0, body, { seg: 16 });
  if (big) b.torus(r * 0.85, r * 0.15, 0, r, -0.3, body, { seg: 16 });
  for (let i = 0; i < 6; i++) b.box(0.05, r * 1.6, 0.05, 0, r, big ? 0.3 : 0, IMPD, { rz: (i * Math.PI) / 6 });
  b.part('body', 'static');
  if (big) {
    b.box(0.6, 0.35, 0.5, 0.05, r + 0.1, 0, body);
    b.sym((ss) => {
      b.box(0.45, 0.3, 0.2, 0.1, r + 0.3, ss * 0.42, IMPD);
      for (let i = 0; i < 3; i++) b.cyl(0.04, 0.04, 0.05, 0.34, r + 0.22 + i * 0.09, ss * 0.42, C.glowRed, { em: 1, rz: Math.PI / 2 });
    });
    b.box(0.3, 0.05, 0.55, 0.0, r + 0.3, 0, C.team, { team: 1 });
    b.cyl(0.05, 0.05, 0.4, 0.4, r, 0, C.gun, { rz: Math.PI / 2 });
  } else {
    b.box(0.3, 0.25, 0.4, 0.05, r, 0, body);
    b.sym((ss) => b.cyl(0.04, 0.04, 0.45, 0.25, r + 0.05, ss * 0.25, C.gun, { rz: Math.PI / 2 }));
    b.box(0.2, 0.05, 0.42, 0.0, r + 0.15, 0, C.team, { team: 1 });
  }
}

// ─────────────────────────── Criaturas ───────────────────────────
export interface BeastOpts {
  len: number;
  hgt: number;
  wid: number;
  body: number;
  belly?: number;
  neck?: number;
  legs: 2 | 4;
  head?: 'kaadu' | 'bantha' | 'tauntaun' | 'dewback' | 'fambaa' | 'falumpaset' | 'nerf' | 'shaak' | 'wampa' | 'nexu' | 'cat' | 'acklay' | 'varactyl' | 'happabore' | 'boar';
  rider?: HumOpts | null;
  saddle?: boolean;
  horns?: boolean;
  tail?: boolean;
}

export function beast(b: MB, o: BeastOpts) {
  const { len: L, hgt: H, wid: W } = o;
  const by = H * 0.62;
  b.part('body', 'static');
  b.sphere(W * 0.5, 0, by, 0, o.body, { sx: L / W, sy: (H * 0.45) / (W * 0.5), seg: 10 });
  if (o.belly) b.sphere(W * 0.42, 0, by - H * 0.1, 0, o.belly, { sx: (L / W) * 0.85, sy: 0.6, seg: 8 });
  // cuello y cabeza
  const hx = L * 0.55, hy = by + H * (o.legs === 2 ? 0.45 : 0.15);
  b.part('head', 'head', [L * 0.4, by + H * 0.1, 0], 'body');
  const neck = o.neck ?? o.body;
  b.cyl(W * 0.16, W * 0.22, H * 0.4, L * 0.45, (by + hy) / 2, 0, neck, { rz: o.legs === 2 ? -0.3 : -1.0 });
  switch (o.head ?? 'nerf') {
    case 'kaadu':
      b.sphere(W * 0.22, hx, hy, 0, o.body, { sx: 1.8 });
      b.cone(W * 0.12, W * 0.3, hx + W * 0.45, hy - 0.02, 0, 0xd0a060, { rz: -Math.PI / 2 });
      break;
    case 'tauntaun':
      b.sphere(W * 0.24, hx, hy, 0, o.body, { sx: 1.5 });
      b.sym((s) => b.cone(0.05, 0.22, hx - 0.05, hy + 0.1, s * W * 0.18, 0xb0a080, { rx: s * 1.2, rz: 0.6 }));
      break;
    case 'bantha':
      b.sphere(W * 0.3, hx, hy, 0, o.body);
      b.sym((s) => b.torus(W * 0.18, W * 0.05, hx - 0.05, hy + 0.08, s * W * 0.3, 0xd8c8a0, { rx: Math.PI / 2 }));
      break;
    case 'dewback':
    case 'varactyl':
      b.sphere(W * 0.24, hx, hy, 0, o.body, { sx: 1.7, sy: 0.8 });
      if (o.head === 'varactyl') b.sym((s) => b.cone(0.04, 0.2, hx - 0.1, hy + 0.12, s * 0.08, 0xd8a040, { rz: 0.8 }));
      break;
    case 'fambaa':
    case 'falumpaset':
      b.sphere(W * 0.25, hx, hy, 0, o.body, { sx: 1.6 });
      b.cone(W * 0.1, W * 0.3, hx + W * 0.4, hy - W * 0.1, 0, o.body, { rz: -Math.PI / 2 - 0.4 });
      break;
    case 'wampa':
    case 'nexu':
    case 'cat':
    case 'boar':
      b.sphere(W * 0.3, hx, hy, 0, o.body, { sx: 1.3 });
      if (o.head === 'boar') b.sym((s) => b.cone(0.03, 0.12, hx + W * 0.3, hy - 0.03, s * 0.08, C.offwhite, { rz: -1.3 }));
      if (o.head === 'nexu') b.sym((s) => b.cone(0.04, 0.12, hx, hy + 0.12, s * 0.08, o.body));
      break;
    case 'acklay':
      b.sphere(W * 0.22, hx, hy, 0, o.body, { sx: 1.6 });
      break;
    default:
      b.sphere(W * 0.26, hx, hy, 0, o.body, { sx: 1.3 });
      if (o.horns) b.sym((s) => b.cone(0.04, 0.18, hx - 0.05, hy + 0.12, s * W * 0.2, C.offwhite, { rx: s * 0.6 }));
  }
  b.sphere(0.03, hx + W * 0.25, hy + W * 0.1, W * 0.12, C.black);
  b.sphere(0.03, hx + W * 0.25, hy + W * 0.1, -W * 0.12, C.black);
  b.part('body');
  // cola
  if (o.tail !== false) {
    b.part('tail', 'tail', [-L * 0.5, by, 0], 'body');
    b.cone(W * 0.15, L * 0.6, -L * 0.75, by - H * 0.05, 0, o.body, { rz: Math.PI / 2 + 0.25 });
  }
  // patas
  if (o.legs === 2) {
    for (const side of [1, -1]) {
      const z = side * W * 0.28;
      b.part(side > 0 ? 'legL' : 'legR', side > 0 ? 'legL' : 'legR', [0, by - H * 0.1, z]);
      b.box(W * 0.22, by * 0.6, W * 0.2, 0.03, by * 0.68, z, o.body, { rz: -0.2 });
      b.box(W * 0.14, by * 0.55, W * 0.14, 0, by * 0.28, z, o.body, { rz: 0.25 });
      b.box(W * 0.35, 0.06, W * 0.2, 0.05, 0.03, z, o.belly ?? o.body);
    }
  } else {
    const anims = [['legFL', L * 0.32, 1], ['legFR', L * 0.32, -1], ['legBL', -L * 0.32, 1], ['legBR', -L * 0.32, -1]] as const;
    for (const [an, x, side] of anims) {
      const z = side * W * 0.32;
      b.part(an, an, [x, by - H * 0.1, z]);
      b.cyl(W * 0.13, W * 0.11, by, x, by / 2, z, o.body, { seg: 8 });
      b.cyl(W * 0.14, W * 0.15, 0.06, x, 0.03, z, o.belly ?? 0x3a3020, { seg: 8 });
    }
  }
  b.part('body');
  if (o.saddle) b.box(L * 0.35, 0.06, W * 0.7, 0, by + H * 0.42, 0, C.team, { team: 1 });
  if (o.rider) b.offset(-L * 0.05, by + H * 0.25, 0, () => humanoid(b, { ...o.rider!, scale: (o.rider!.scale ?? 1) * 0.9 }));
}

// ─────────────────────────── Naves ───────────────────────────
export function tieFighter(b: MB, kind: 'fighter' | 'interceptor' | 'bomber' | 'advanced') {
  b.part('body', 'static');
  const panel = 0x2a2c34;
  if (kind === 'bomber') {
    b.sphere(0.28, 0.1, 0, 0.18, IMP, { seg: 10 });
    b.capsule(0.22, 0.6, -0.05, 0, -0.18, IMP, { rz: Math.PI / 2 });
    b.sphere(0.13, 0.36, 0.02, 0.18, C.black, { seg: 8 });
  } else {
    b.sphere(0.3, 0, 0, 0, IMP, { seg: 12 });
    b.sphere(0.16, 0.24, 0.02, 0, C.black, { seg: 8 });
  }
  b.sym((s) => b.cyl(0.07, 0.07, 0.4, 0, 0, s * 0.35, IMPD, { rx: Math.PI / 2 }));
  b.box(0.12, 0.04, 0.4, -0.15, 0.25, 0, C.team, { team: 1 });
  for (const s of [1, -1]) {
    const z = s * 0.58;
    if (kind === 'interceptor' || kind === 'advanced') {
      b.poly([[0.55, 0], [0.1, 0.62], [-0.35, 0.7], [-0.45, 0], [-0.35, -0.7], [0.1, -0.62]].map(([x, y]) => [x, y] as [number, number]), 0.04, 0, panel, { rx: Math.PI / 2 });
      // la fuente usa el plano XZ: rotamos para que quede vertical
    }
    if (kind === 'fighter' || kind === 'bomber') {
      // ala hexagonal vertical
      b.offset(0, 0, z, () => {
        b.box(0.04, 1.1, 0.9, 0, 0, 0, panel, { rx: Math.PI / 2 * 0 });
        b.box(0.05, 1.12, 0.06, 0, 0, 0, IMPD);
        b.box(0.05, 0.06, 0.92, 0, 0, 0, IMPD);
      });
    } else {
      b.offset(0, 0, z, () => {
        b.box(0.04, 1.2, 0.6, -0.05, 0, 0, panel, { rx: 0 });
        b.box(0.05, 0.06, 0.62, -0.05, 0, 0, IMPD);
        b.box(0.05, 1.22, 0.06, -0.05, 0, 0, IMPD);
      });
    }
  }
  b.sym((s) => b.cyl(0.02, 0.02, 0.15, 0.3, -0.12, s * 0.08, C.glowGreen, { em: 1.5, rz: Math.PI / 2 }));
}

export function xwing(b: MB, kind: 'xwing' | 'awing' | 'ywing' | 'bwing' | 'arc170' | 'vwing' | 'n1' | 'nabooBomber' | 'airspeeder' | 'catamaran' | 'glider' | 'jedi') {
  b.part('body', 'static');
  const W = 0xe8e4dc;
  switch (kind) {
    case 'xwing': {
      b.box(1.2, 0.18, 0.2, 0.1, 0, 0, W);
      b.wedge(0.2, 0.12, 0.5, 0.88, -0.09, 0, W, { ry: Math.PI / 2, rz: 0 });
      b.box(0.3, 0.12, 0.16, 0.1, 0.13, 0, C.glass);
      b.box(0.5, 0.04, 0.22, 0.25, 0.1, 0, C.team, { team: 1 });
      b.sphere(0.07, -0.25, 0.12, 0, 0x5a8acc); // R2
      for (const [y, z] of [[0.12, 1], [0.12, -1], [-0.12, 1], [-0.12, -1]]) {
        b.box(0.35, 0.03, 0.75, -0.25, y + Math.sign(y) * z * 0, z * 0.45, W, { rx: z * (y > 0 ? -0.25 : 0.25) });
        b.cyl(0.07, 0.07, 0.4, -0.25, y * 1.4, z * 0.22, 0xa0a0a0, { rz: Math.PI / 2 });
        b.cyl(0.05, 0.05, 0.05, -0.47, y * 1.4, z * 0.22, C.glowOrange, { em: 2, rz: Math.PI / 2 });
        b.cyl(0.015, 0.015, 0.7, 0.05, y * 2.5, z * 0.82, C.metal, { rz: Math.PI / 2 });
        b.box(0.2, 0.025, 0.08, -0.2, y + y * 0.6, z * 0.55, C.team, { team: 1, rx: z * (y > 0 ? -0.25 : 0.25) });
      }
      break;
    }
    case 'awing': {
      b.wedge(0.8, 0.2, 1.1, 0, 0, 0, 0xb83a2a, { ry: Math.PI / 2 });
      b.box(0.25, 0.12, 0.16, 0.05, 0.16, 0, C.glass);
      b.sym((s) => {
        b.cyl(0.08, 0.08, 0.6, -0.15, 0.06, s * 0.42, W, { rz: Math.PI / 2 });
        b.cyl(0.06, 0.06, 0.05, -0.46, 0.06, s * 0.42, C.glowOrange, { em: 2, rz: Math.PI / 2 });
      });
      b.box(0.3, 0.03, 0.8, -0.1, 0.1, 0, C.team, { team: 1 });
      break;
    }
    case 'ywing':
    case 'bwing': {
      b.box(0.55, 0.2, 0.26, 0.45, 0, 0, W);
      b.box(0.22, 0.1, 0.18, 0.5, 0.14, 0, C.glass);
      b.box(0.6, 0.06, 0.2, 0.0, 0, 0, C.metal);
      b.box(0.15, 0.06, 1.1, -0.15, 0, 0, W);
      b.sym((s) => {
        b.cyl(0.11, 0.11, 1.1, -0.35, 0, s * 0.55, W, { rz: Math.PI / 2 });
        b.cyl(0.09, 0.09, 0.06, -0.92, 0, s * 0.55, C.glowOrange, { em: 2, rz: Math.PI / 2 });
        b.cyl(0.12, 0.12, 0.12, 0.2, 0, s * 0.55, C.team, { team: 1, rz: Math.PI / 2 });
      });
      b.box(0.3, 0.05, 0.2, 0.45, 0.11, 0, C.team, { team: 1 });
      break;
    }
    case 'arc170': {
      b.box(1.3, 0.2, 0.24, 0.1, 0, 0, W);
      b.box(0.35, 0.14, 0.18, 0.4, 0.13, 0, C.glass);
      b.sym((s) => {
        b.box(0.4, 0.05, 0.9, -0.2, 0, s * 0.55, W);
        b.cyl(0.1, 0.1, 0.8, -0.1, 0, s * 0.42, 0xb04030, { rz: Math.PI / 2 });
        b.cyl(0.07, 0.07, 0.05, -0.52, 0, s * 0.42, C.glowOrange, { em: 2, rz: Math.PI / 2 });
        b.box(0.25, 0.25, 0.03, -0.45, 0.12, s * 0.95, W);
        b.box(0.3, 0.06, 0.4, -0.2, 0.04, s * 0.6, C.team, { team: 1 });
      });
      break;
    }
    case 'vwing': {
      b.box(0.8, 0.14, 0.18, 0.1, 0, 0, W);
      b.wedge(0.18, 0.1, 0.3, 0.6, -0.07, 0, W, { ry: Math.PI / 2 });
      b.sym((s) => b.box(0.3, 0.6, 0.03, -0.15, 0.28, s * 0.08, W, { rx: s * -0.4 }));
      b.sym((s) => b.box(0.25, 0.04, 0.5, -0.15, -0.05, s * 0.25, C.team, { team: 1 }));
      b.cyl(0.07, 0.07, 0.05, -0.32, 0, 0, C.glowOrange, { em: 2, rz: Math.PI / 2 });
      break;
    }
    case 'n1': {
      const Y = 0xe8c838;
      b.capsule(0.12, 1.1, 0.2, 0, 0, Y, { rz: Math.PI / 2 });
      b.cone(0.12, 0.4, 0.95, 0, 0, Y, { rz: -Math.PI / 2 });
      b.box(0.3, 0.1, 0.16, 0.2, 0.12, 0, C.glass);
      b.box(0.3, 0.04, 0.9, -0.05, 0, 0, 0xc0c4c8);
      b.sym((s) => {
        b.capsule(0.07, 0.8, 0.0, 0, s * 0.45, 0xc0c4c8, { rz: Math.PI / 2 });
        b.cyl(0.06, 0.06, 0.04, -0.47, 0, s * 0.45, C.glowCyan, { em: 2, rz: Math.PI / 2 });
      });
      b.box(0.2, 0.04, 0.4, -0.1, 0.03, 0, C.team, { team: 1 });
      break;
    }
    case 'nabooBomber': {
      b.capsule(0.22, 0.9, 0, 0, 0, 0xd8d8e0, { rz: Math.PI / 2 });
      b.box(0.25, 0.12, 0.2, 0.45, 0.18, 0, C.glass);
      b.sym((s) => b.capsule(0.1, 0.6, -0.1, 0, s * 0.4, 0xd8d8e0, { rz: Math.PI / 2 }));
      b.box(0.3, 0.04, 0.9, -0.15, 0, 0, C.team, { team: 1 });
      break;
    }
    case 'airspeeder': {
      const G = 0xc8c8c0;
      b.box(0.8, 0.14, 0.4, 0, 0, 0, G);
      b.wedge(0.4, 0.14, 0.4, 0.55, -0.07, 0, G, { ry: Math.PI / 2 });
      b.box(0.25, 0.1, 0.25, 0.1, 0.12, 0, C.glass);
      b.sym((s) => {
        b.box(0.8, 0.12, 0.12, -0.05, 0, s * 0.28, 0xb0b0a8);
        b.box(0.4, 0.04, 0.13, 0.0, 0.065, s * 0.28, C.team, { team: 1 });
        b.cyl(0.02, 0.02, 0.4, 0.5, 0, s * 0.28, C.gun, { rz: Math.PI / 2 });
      });
      b.box(0.08, 0.2, 0.3, -0.38, 0.12, 0, G);
      break;
    }
    case 'catamaran': {
      const Wd = 0x8a6a3a;
      b.sym((s) => {
        b.capsule(0.12, 1.1, 0, 0, s * 0.35, Wd, { rz: Math.PI / 2 });
        b.cyl(0.07, 0.07, 0.05, -0.68, 0, s * 0.35, C.glowOrange, { em: 2, rz: Math.PI / 2 });
      });
      b.box(0.6, 0.08, 0.72, 0.05, 0.05, 0, Wd);
      b.box(0.3, 0.14, 0.22, 0.15, 0.15, 0, C.glass);
      b.box(0.3, 0.04, 0.75, -0.2, 0.1, 0, C.team, { team: 1 });
      break;
    }
    case 'glider': {
      const Wd = 0x9a7a4a;
      b.box(0.9, 0.12, 0.2, 0, 0, 0, Wd);
      b.tri(0.2, 0, -0.4, 1.0, -0.4, -1.0, 0.03, 0.05, 0xb89a6a);
      b.box(0.2, 0.04, 1.4, -0.3, 0.07, 0, C.team, { team: 1 });
      b.cyl(0.06, 0.06, 0.05, -0.47, 0, 0, C.glowOrange, { em: 2, rz: Math.PI / 2 });
      break;
    }
    case 'jedi':
      break;
  }
}

export function vultureDroid(b: MB, kind: 'vulture' | 'tri' | 'hyena') {
  b.part('body', 'static');
  const D = 0x9a8a6a;
  if (kind === 'tri') {
    b.sphere(0.2, 0.25, 0, 0, D, { seg: 8 });
    b.sphere(0.08, 0.42, 0, 0, C.glowRed, { em: 1.6 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.box(0.15, 0.06, 0.8, -0.1, Math.sin(a) * 0.35, Math.cos(a) * 0.35, D, { rx: -a });
    }
    b.box(0.6, 0.12, 0.12, -0.1, 0, 0, D);
    b.box(0.2, 0.05, 0.3, 0, 0.1, 0, C.team, { team: 1 });
    return;
  }
  b.box(0.7, 0.14, 0.2, 0, 0, 0, D);
  b.sphere(0.07, 0.38, 0, 0.07, C.glowRed, { em: 1.6 });
  b.sphere(0.07, 0.38, 0, -0.07, C.glowRed, { em: 1.6 });
  b.sym((s) => {
    b.box(0.5, 0.04, 0.8, -0.05, 0, s * 0.5, D);
    b.box(0.5, 0.25, 0.04, -0.05, kind === 'hyena' ? -0.1 : 0.1, s * 0.92, D);
    b.box(0.3, 0.05, 0.3, -0.05, 0.03, s * 0.5, C.team, { team: 1 });
    b.cyl(0.03, 0.03, 0.3, 0.15, 0, s * 0.85, C.gun, { rz: Math.PI / 2 });
  });
  if (kind === 'hyena') b.box(0.4, 0.15, 0.4, -0.1, -0.12, 0, D);
}

// ─────────────────────────── Artillería y especiales ───────────────────────────
export function artilleryPiece(b: MB, kind: 'spmat' | 'sphat' | 'catapult' | 'ion' | 'pac' | 'royal', body: number) {
  if (kind === 'spmat' || kind === 'sphat') {
    // andador de 6 patas con gran cañón
    const by = 0.85;
    b.part('body', 'static');
    b.box(1.1, 0.4, 0.7, 0, by, 0, body);
    b.box(0.9, 0.06, 0.72, 0, by + 0.15, 0, C.team, { team: 1 });
    b.part('turret', 'recoil', [0, by + 0.3, 0], 'body');
    if (kind === 'sphat') {
      b.box(0.6, 0.45, 0.5, -0.1, by + 0.5, 0, body);
      b.cyl(0.14, 0.18, 1.6, 0.7, by + 0.9, 0, body, { rz: Math.PI / 2 - 0.7 });
      b.torus(0.17, 0.04, 1.2, by + 1.3, 0, C.glowBlue, { em: 1.5, ry: Math.PI / 2, rz: -0.7 });
    } else {
      b.box(0.5, 0.35, 0.4, -0.1, by + 0.45, 0, body);
      b.cyl(0.08, 0.1, 1.4, 0.55, by + 0.8, 0, C.gun, { rz: Math.PI / 2 - 0.6 });
    }
    const xs = [0.4, 0, -0.4];
    const am: [string, string][] = [['legFL', 'legFR'], ['legML', 'legMR'], ['legBL', 'legBR']];
    xs.forEach((x, i) => {
      for (const side of [1, -1]) {
        const an = side > 0 ? am[i][0] : am[i][1];
        b.part(an, an as any, [x, by - 0.1, side * 0.35]);
        b.box(0.08, 0.95, 0.08, x, by / 2 - 0.05, side * 0.5, IMPD, { rx: -side * 0.3 });
      }
    });
    b.part('body');
    return;
  }
  if (kind === 'catapult') {
    b.part('body', 'static');
    const Wd = 0x8a6a3a;
    b.box(0.9, 0.12, 0.6, 0, 0.3, 0, Wd);
    b.sym((s) => b.cyl(0.18, 0.18, 0.06, 0.3, 0.18, s * 0.32, 0x5a4020, { rx: Math.PI / 2 }));
    b.sym((s) => b.cyl(0.18, 0.18, 0.06, -0.3, 0.18, s * 0.32, 0x5a4020, { rx: Math.PI / 2 }));
    b.sym((s) => b.box(0.06, 0.5, 0.06, 0.1, 0.6, s * 0.22, Wd));
    b.part('turret', 'recoil', [0.1, 0.75, 0], 'body');
    b.box(0.9, 0.06, 0.08, -0.15, 0.85, 0, Wd, { rz: 0.4 });
    b.sphere(0.1, -0.55, 1.05, 0, 0x6aff8a, { em: 1.8 });
    b.part('body');
    b.box(0.3, 0.05, 0.62, 0, 0.38, 0, C.team, { team: 1 });
    return;
  }
  // torreta móvil: ion / PAC / royal
  hoverTank(b, { len: 1.2, wid: 0.7, hgt: 0.5, body, turret: 'none', shape: kind === 'pac' ? 'round' : 'flat' });
  b.part('turret', 'recoil', [0, 0.7, 0], 'body');
  if (kind === 'ion') {
    b.sphere(0.3, 0, 0.85, 0, body, { seg: 10 });
    b.cyl(0.07, 0.1, 1.0, 0.45, 1.05, 0, C.gun, { rz: Math.PI / 2 - 0.5 });
    b.torus(0.1, 0.03, 0.7, 1.2, 0, C.glowBlue, { em: 1.6, ry: Math.PI / 2, rz: -0.5 });
  } else {
    b.box(0.5, 0.3, 0.4, 0, 0.85, 0, body);
    b.cyl(0.08, 0.1, 1.1, 0.5, 1.05, 0, C.gun, { rz: Math.PI / 2 - 0.5 });
  }
  b.part('body');
}

export function droideka(b: MB, body: number) {
  b.part('body', 'static');
  const by = 0.55;
  b.sphere(0.2, 0, by + 0.05, 0, body, { sx: 1.2 });
  b.box(0.3, 0.2, 0.14, 0.1, by + 0.2, 0, body);
  b.sphere(0.05, 0.25, by + 0.28, 0, C.glowRed, { em: 1.2 });
  b.box(0.12, 0.04, 0.3, 0, by + 0.25, 0, C.team, { team: 1 });
  b.sym((s) => {
    b.box(0.3, 0.06, 0.06, 0.2, by, s * 0.2, IMPD);
    b.box(0.08, 0.06, 0.06, 0.38, by + 0.02, s * 0.22, C.gun);
    b.box(0.08, 0.06, 0.06, 0.38, by - 0.04, s * 0.22, C.gun);
  });
  b.part('legL', 'legL', [0, by, 0.12]);
  b.box(0.06, 0.55, 0.06, -0.05, by / 2, 0.15, IMPD, { rz: 0.2 });
  b.part('legR', 'legR', [0, by, -0.12]);
  b.box(0.06, 0.55, 0.06, -0.05, by / 2, -0.15, IMPD, { rz: 0.2 });
  b.part('tail', 'tail', [-0.15, by, 0]);
  b.box(0.06, 0.5, 0.06, 0.15, by / 2, 0, IMPD, { rz: -0.4 });
  b.part('body');
}

export function pummel(b: MB, kind: 'juggernaut' | 'mtt' | 'ram' | 'wood', body: number) {
  if (kind === 'mtt') {
    hoverTank(b, { len: 2.0, wid: 1.0, hgt: 0.9, body, shape: 'mtt', turret: 'none' });
    return;
  }
  if (kind === 'juggernaut') {
    b.part('body', 'static');
    b.box(1.8, 0.7, 0.9, 0, 0.65, 0, body);
    b.wedge(0.9, 0.35, 0.5, 1.0, 0.3, 0, body, { ry: Math.PI / 2 });
    b.box(0.5, 0.6, 0.45, -0.45, 1.25, 0, body);
    b.box(0.05, 0.08, 0.4, -0.19, 1.4, 0, C.black);
    b.box(1.5, 0.06, 0.92, -0.1, 0.9, 0, C.team, { team: 1 });
    b.part('wheel', 'spin', [0, 0.25, 0]);
    for (let i = 0; i < 5; i++) b.sym((s) => b.cyl(0.22, 0.22, 0.12, -0.75 + i * 0.37, 0.25, s * 0.5, C.dark, { rx: Math.PI / 2 }));
    b.part('body');
    return;
  }
  b.part('body', 'static');
  const Wd = kind === 'wood' ? 0x7a5a30 : body;
  b.box(1.4, 0.55, 0.8, 0, 0.45, 0, Wd);
  b.wedge(0.8, 0.5, 0.6, 0.0, 0.72, 0, Wd);
  b.part('turret', 'recoil', [0.6, 0.45, 0], 'body');
  b.cyl(0.12, 0.16, 0.7, 0.85, 0.45, 0, kind === 'wood' ? 0x4a3a2a : C.metal, { rz: Math.PI / 2 });
  b.cone(0.16, 0.25, 1.28, 0.45, 0, C.dgray, { rz: -Math.PI / 2 });
  b.part('body');
  b.box(1.0, 0.05, 0.82, -0.1, 0.6, 0, C.team, { team: 1 });
  if (kind === 'wood') {
    b.part('wheel', 'spin', [0, 0.18, 0]);
    for (let i = 0; i < 3; i++) b.sym((s) => b.cyl(0.18, 0.18, 0.08, -0.5 + i * 0.5, 0.18, s * 0.45, 0x4a3420, { rx: Math.PI / 2 }));
    b.part('body');
  }
}

export function aaPlatform(b: MB, body: number, beastBase: BeastOpts | null) {
  if (beastBase) beast(b, beastBase);
  else hoverTank(b, { len: 1.3, wid: 0.75, hgt: 0.5, body, turret: 'none' });
  const y = beastBase ? beastBase.hgt * 1.05 : 0.7;
  b.part('turret', 'head', [0, y, 0], 'body');
  b.box(0.4, 0.2, 0.4, 0, y + 0.1, 0, body);
  b.sym((s) => {
    b.box(0.5, 0.25, 0.18, 0.1, y + 0.3, s * 0.25, C.dgray, { rz: 0.5 });
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) b.cyl(0.04, 0.04, 0.04, 0.33, y + 0.38 + j * 0.1, s * 0.25 + (i - 0.5) * 0.08, C.glowRed, { em: 1.2, rz: Math.PI / 2 - 0.5 });
  });
  b.part('body');
}
