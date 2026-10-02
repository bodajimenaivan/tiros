// Vehículos, andadores, criaturas y naves de Star Wars (procedurales).
import { MB, C } from './builder';
import { humanoid, type HumOpts } from './humanoids';
import { SURF } from '../surface';
import * as THREE from 'three';
import { displace } from './organic';

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
    if (rider) b.offset(-0.02, 0.18, 0, () => humanoid(b, { ...rider, weapon: 'none', seated: true }));
    return;
  }
  if (kind === 'flash') {
    b.box(0.9, 0.18, 0.38, 0, 0.3, 0, body);
    b.box(0.3, 0.1, 0.3, 0.3, 0.42, 0, C.glass);
    b.box(0.6, 0.05, 0.4, -0.1, 0.4, 0, C.team, { team: 1 });
    b.sym((s) => b.cyl(0.05, 0.06, 0.4, -0.38, 0.32, s * 0.15, C.dgray, { rz: Math.PI / 2 }));
    if (rider) b.offset(-0.1, 0.25, 0, () => humanoid(b, { ...rider, scale: 0.85, seated: true }));
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
  if (rider) b.offset(-0.08, 0.2, 0, () => humanoid(b, { ...rider, weapon: 'none', scale: 0.9, seated: true }));
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
    case 'wedge': {
      // casco con flancos inclinados y morro en cuña
      const pr: [number, number][] = [[-W * 0.42, -H * 0.25], [W * 0.42, -H * 0.25], [W * 0.5, H * 0.02], [W * 0.34, H * 0.25], [-W * 0.34, H * 0.25], [-W * 0.5, H * 0.02]];
      b.prism(pr, L * 0.72, -L * 0.12, baseY + H * 0.25, 0, o.body, { bevel: 0.025 });
      b.taper(L * 0.4, H * 0.5, W, 0.35, 0.75, L * 0.42, baseY + H * 0.2, 0, o.body);
      b.rbox(L * 0.3, 0.05, W * 0.5, 0.015, -L * 0.2, baseY + H * 0.52, 0, trim, { mat: SURF.grate });
      break;
    }
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
    default: {
      const pr: [number, number][] = [[-W * 0.44, -H * 0.25], [W * 0.44, -H * 0.25], [W * 0.5, H * 0.05], [W * 0.4, H * 0.25], [-W * 0.4, H * 0.25], [-W * 0.5, H * 0.05]];
      b.prism(pr, L * 0.85, -L * 0.05, baseY + H * 0.25, 0, o.body, { bevel: 0.025 });
      b.taper(L * 0.2, H * 0.5, W, 0.6, 0.85, L * 0.46, baseY + H * 0.25, 0, o.body);
      b.rbox(L * 0.8, H * 0.15, W * 0.78, 0.03, -L * 0.05, baseY + H * 0.55, 0, o.body);
    }
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
      b.taper(W * 0.55, H * 0.25, W * 0.5, 0.7, 0.8, 0, ty, 0, o.body);
      b.sym((s) => b.cyl(0.04, 0.04, L * 0.5, L * 0.3, ty + 0.04, s * 0.09, cannon, { rz: Math.PI / 2 }));
      break;
    case 'big':
      b.taper(L * 0.38, H * 0.3, W * 0.52, 0.7, 0.8, -L * 0.05, ty, 0, o.body);
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
  const S = (v: number) => v * s;
  b.part('body', 'static');
  // cabina: prisma de frente inclinado, como el AT-ST de Endor
  const hy = hipY + 0.32 * s;
  b.prism([[-0.25, -0.2], [0.25, -0.2], [0.29, 0.02], [0.24, 0.2], [-0.24, 0.2], [-0.29, 0.02]].map(([zz, yy]) => [S(zz), S(yy)]) as [number, number][], S(0.62), S(0.02), hy, 0, body, { bevel: S(0.02) });
  b.prism([[-0.22, -0.1], [0.22, -0.1], [0.24, 0.05], [0.2, 0.12], [-0.2, 0.12], [-0.24, 0.05]].map(([zz, yy]) => [S(zz), S(yy)]) as [number, number][], S(0.22), S(0.4), hy - S(0.06), 0, body, { bevel: S(0.015) }); // morro
  b.rbox(S(0.03), S(0.05), S(0.34), S(0.01), S(0.5), hy + S(0.04), 0, 0x101216, { mat: SURF.glass }); // mirilla
  b.rbox(S(0.5), S(0.05), S(0.46), S(0.015), S(0.0), hy + S(0.22), 0, C.team, { team: 1 });
  b.cyl(S(0.1), S(0.1), S(0.05), S(-0.08), hy + S(0.26), 0, IMPD, { seg: 12 }); // escotilla
  // cañones de barbilla y lateral
  b.sym((ss) => {
    b.limb([S(0.3), hy - S(0.16), ss * S(0.14)], [S(0.72), hy - S(0.16), ss * S(0.14)], S(0.035), S(0.028), C.gun, { seg: 8 });
    b.rbox(S(0.18), S(0.08), S(0.08), S(0.02), S(0.32), hy - S(0.16), ss * S(0.14), IMPD);
  });
  b.rbox(S(0.2), S(0.1), S(0.1), S(0.025), S(0.15), hy + S(0.02), -S(0.33), IMPD); // vaina lateral
  b.limb([S(0.25), hy + S(0.02), -S(0.33)], [S(0.55), hy + S(0.02), -S(0.33)], S(0.025), S(0.02), C.gun, { seg: 8 });
  b.rbox(S(0.16), S(0.12), S(0.12), S(0.03), S(0.15), hy + S(0.02), S(0.33), IMPD); // lanzagranadas
  // cuello y cadera con conductos
  b.cyl(S(0.1), S(0.12), S(0.2), S(-0.04), hipY + S(0.06), 0, IMPD, { seg: 12 });
  b.rbox(S(0.32), S(0.14), S(0.56), S(0.04), S(-0.04), hipY, 0, IMPD);
  for (const ss of [-1, 1]) b.limb([S(-0.18), hipY + S(0.05), ss * S(0.1)], [S(-0.12), hy - S(0.12), ss * S(0.12)], S(0.02), S(0.02), 0x3a3c40, { seg: 6 });
  // piernas de articulación inversa: muslo hacia delante, espinilla hacia atrás
  for (const side of [1, -1]) {
    const z = side * S(0.27);
    const name = side > 0 ? 'legL' : 'legR';
    b.part(name, side > 0 ? 'legL' : 'legR', [0, hipY, z]);
    b.cyl(S(0.1), S(0.1), S(0.08), 0, hipY, z, IMPD, { rx: Math.PI / 2, seg: 14 }); // cadera
    const knee: [number, number, number] = [S(0.22), hipY - S(0.5), z];
    const ankle: [number, number, number] = [S(-0.02), S(0.14), z];
    b.limb([0, hipY, z], knee, S(0.065), S(0.055), body, { seg: 8 });
    b.limb([S(0.04), hipY - S(0.05), z + side * S(0.06)], [S(0.2), hipY - S(0.45), z + side * S(0.06)], S(0.022), S(0.022), 0x3a3c40, { seg: 6 }); // pistón
    b.cyl(S(0.075), S(0.075), S(0.1), knee[0], knee[1], z, IMPD, { rx: Math.PI / 2, seg: 14 }); // rodilla
    b.limb(knee, ankle, S(0.055), S(0.045), body, { seg: 8 });
    b.cyl(S(0.055), S(0.055), S(0.09), ankle[0], ankle[1], z, IMPD, { rx: Math.PI / 2, seg: 12 });
    // pie con dedos
    b.rbox(S(0.22), S(0.06), S(0.16), S(0.02), S(0.02), S(0.05), z, IMPD);
    for (const t of [-1, 0, 1]) b.rbox(S(0.16), S(0.04), S(0.05), S(0.015), S(0.16), S(0.03), z + t * S(0.07), body, { ry: t * 0.25 });
    b.rbox(S(0.1), S(0.04), S(0.06), S(0.015), S(-0.13), S(0.03), z, body);
  }
  void opts;
  b.part('body');
}

export function atat(b: MB, body: number, scale = 1) {
  const s = scale;
  const S = (v: number) => v * s;
  const bodyY = 2.3 * s;
  b.part('body', 'static');
  // cuerpo: sección hexagonal con flancos inclinados
  const prof: [number, number][] = [[-0.3, -0.4], [0.3, -0.4], [0.44, -0.12], [0.44, 0.22], [0.3, 0.42], [-0.3, 0.42], [-0.44, 0.22], [-0.44, -0.12]];
  b.prism(prof.map(([zz, yy]) => [S(zz), S(yy)]) as [number, number][], S(1.9), 0, bodyY, 0, body, { bevel: S(0.03) });
  b.prism([[-0.22, 0], [0.22, 0], [0.18, 0.1], [-0.18, 0.1]].map(([zz, yy]) => [S(zz), S(yy)]) as [number, number][], S(1.4), S(-0.1), bodyY + S(0.42), 0, body, { bevel: S(0.015) }); // lomo
  // juntas de las placas y franja de equipo
  for (let i = 0; i < 5; i++) b.rbox(S(0.03), S(0.6), S(0.9), S(0.01), S(-0.76 + i * 0.38), bodyY + S(0.02), 0, IMPD);
  b.rbox(S(1.6), S(0.06), S(0.9), S(0.015), S(-0.05), bodyY + S(0.26), 0, C.team, { team: 1 });
  b.rbox(S(1.95), S(0.08), S(0.62), S(0.02), 0, bodyY - S(0.4), 0, IMPD); // vientre
  // cuello corrugado
  for (let i = 0; i < 4; i++) b.cyl(S(0.17), S(0.17), S(0.06), S(1.02 + i * 0.08), bodyY - S(0.04), 0, i % 2 ? IMPD : 0x4a4e56, { rz: Math.PI / 2, seg: 14 });
  b.part('head', 'head', [S(1.3), bodyY - S(0.05), 0], 'body');
  // cabeza: prisma alargado con morro en cuña
  b.prism([[-0.2, -0.2], [0.2, -0.2], [0.24, 0.0], [0.19, 0.2], [-0.19, 0.2], [-0.24, 0.0]].map(([zz, yy]) => [S(zz), S(yy)]) as [number, number][], S(0.7), S(1.62), bodyY - S(0.08), 0, body, { bevel: S(0.02) });
  b.prism([[-0.17, -0.12], [0.17, -0.12], [0.2, 0.04], [0.14, 0.1], [-0.14, 0.1], [-0.2, 0.04]].map(([zz, yy]) => [S(zz), S(yy)]) as [number, number][], S(0.3), S(2.06), bodyY - S(0.2), 0, body, { bevel: S(0.015) });
  b.rbox(S(0.03), S(0.04), S(0.3), S(0.01), S(1.97), bodyY + S(0.06), 0, 0x101216, { mat: SURF.glass }); // mirilla
  b.sym((ss) => {
    b.limb([S(1.9), bodyY - S(0.3), ss * S(0.13)], [S(2.42), bodyY - S(0.3), ss * S(0.13)], S(0.045), S(0.035), C.gun, { seg: 10 }); // cañones de barbilla
    b.rbox(S(0.12), S(0.1), S(0.1), S(0.025), S(1.9), bodyY - S(0.3), ss * S(0.13), IMPD);
    b.limb([S(1.85), bodyY + S(0.02), ss * S(0.26)], [S(2.15), bodyY + S(0.02), ss * S(0.26)], S(0.025), S(0.02), C.gun, { seg: 8 }); // bláster de sien
  });
  // patas: cadera, muslo, rodilla, espinilla, tobillo y pie circular
  const legs: [string, 'legFL' | 'legFR' | 'legBL' | 'legBR', number, number][] = [
    ['legFL', 'legFL', 0.68, 0.4], ['legFR', 'legFR', 0.68, -0.4], ['legBL', 'legBL', -0.68, 0.4], ['legBR', 'legBR', -0.68, -0.4],
  ];
  for (const [name, anim, x, z] of legs) {
    const X = S(x), Z = S(z);
    b.part(name, anim, [X, bodyY - S(0.3), Z]);
    b.cyl(S(0.2), S(0.2), S(0.14), X, bodyY - S(0.28), Z + Math.sign(z) * S(0.04), IMPD, { rx: Math.PI / 2, seg: 16 });
    b.rbox(S(0.2), S(1.0), S(0.18), S(0.04), X, bodyY - S(0.9), Z, body);
    b.rbox(S(0.12), S(0.8), S(0.04), S(0.015), X + S(0.06), bodyY - S(0.9), Z + Math.sign(z) * S(0.1), IMPD); // pistón
    b.cyl(S(0.15), S(0.15), S(0.24), X, bodyY - S(1.42), Z, IMPD, { rx: Math.PI / 2, seg: 16 }); // rodilla
    b.rbox(S(0.16), S(0.95), S(0.15), S(0.035), X, bodyY - S(1.85), Z, body);
    b.cyl(S(0.11), S(0.11), S(0.18), X, S(0.26), Z, IMPD, { rx: Math.PI / 2, seg: 14 }); // tobillo
    b.cyl(S(0.2), S(0.27), S(0.16), X, S(0.08), Z, IMPD, { seg: 18 }); // pie
    b.torus(S(0.22), S(0.025), X, S(0.15), Z, 0x4a4e56, { rx: Math.PI / 2, seg: 18 });
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
  b.offset(-0.05, hipY - 0.12, 0, () => humanoid(b, { ...rider, weapon: 'none', scale: 0.9, seated: true }));
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
  const prevMat = b.defMat;
  const scaly = ['kaadu', 'dewback', 'varactyl', 'fambaa', 'falumpaset', 'nexu', 'acklay'].includes(o.head ?? '');
  const skin = scaly ? SURF.skin : SURF.fur;
  b.surf(skin);
  b.part('body', 'static');
  // cuerpo: elipsoide con bultos suaves (lomo, costillas)
  const bodyG = displace(new THREE.SphereGeometry(1, 16, 11), scaly ? 0.05 : 0.09, 2.2, Math.round(L * 100 + H * 37));
  bodyG.scale(L * 0.5, H * 0.45, W * 0.5);
  b.mesh(bodyG, 0, by, 0, o.body, { flat: false, mat: skin });
  if (o.belly) b.ell(L * 0.4, H * 0.27, W * 0.4, 0, by - H * 0.12, 0, o.belly, { mat: skin });
  // cuello y cabeza
  const hx = L * 0.55, hy = by + H * (o.legs === 2 ? 0.45 : 0.15);
  b.part('head', 'head', [L * 0.4, by + H * 0.1, 0], 'body');
  const neck = o.neck ?? o.body;
  b.limb([L * 0.32, by + H * 0.05, 0], [hx - W * 0.1, hy - W * 0.05, 0], W * 0.24, W * 0.17, neck, { mat: skin, seg: 9 });
  let headR = W * 0.26;
  switch (o.head ?? 'nerf') {
    case 'kaadu':
      b.ell(W * 0.4, W * 0.2, W * 0.2, hx, hy, 0, o.body, { mat: skin });
      b.ell(W * 0.22, W * 0.07, W * 0.12, hx + W * 0.42, hy - 0.03, 0, 0xd0a060, { mat: SURF.leather }); // pico
      headR = W * 0.2;
      break;
    case 'tauntaun':
      b.ell(W * 0.36, W * 0.24, W * 0.22, hx, hy, 0, o.body, { mat: skin });
      b.sym((sd) => b.limb([hx - 0.04, hy + 0.06, sd * W * 0.16], [hx - 0.16, hy + 0.2, sd * W * 0.3], 0.035, 0.012, 0xb0a080, { mat: SURF.bark, seg: 6 }));
      headR = W * 0.22;
      break;
    case 'bantha':
      b.ell(W * 0.34, W * 0.32, W * 0.3, hx, hy, 0, o.body, { mat: skin });
      // cuernos en espiral
      b.sym((sd) => {
        b.torus(W * 0.16, W * 0.05, hx - 0.06, hy + 0.06, sd * W * 0.32, 0xd8c8a0, { rx: Math.PI / 2, mat: SURF.bark, seg: 14 });
        b.limb([hx + 0.02, hy - 0.04, sd * W * 0.32], [hx + 0.12, hy - 0.14, sd * W * 0.36], W * 0.045, W * 0.015, 0xd8c8a0, { mat: SURF.bark, seg: 6 });
      });
      headR = W * 0.3;
      break;
    case 'dewback':
    case 'varactyl':
      b.ell(W * 0.42, W * 0.19, W * 0.23, hx, hy, 0, o.body, { mat: skin });
      if (o.head === 'varactyl') b.sym((sd) => b.limb([hx - 0.08, hy + 0.08, sd * 0.07], [hx - 0.22, hy + 0.24, sd * 0.1], 0.03, 0.008, 0xd8a040, { mat: SURF.fur, seg: 5 }));
      headR = W * 0.22;
      break;
    case 'fambaa':
    case 'falumpaset':
      b.ell(W * 0.4, W * 0.25, W * 0.25, hx, hy, 0, o.body, { mat: skin });
      b.limb([hx + W * 0.3, hy - W * 0.05, 0], [hx + W * 0.55, hy - W * 0.3, 0], W * 0.09, W * 0.05, o.body, { mat: skin, seg: 7 }); // trompa
      headR = W * 0.25;
      break;
    case 'wampa':
    case 'nexu':
    case 'cat':
    case 'boar':
      b.ell(W * 0.36, W * 0.29, W * 0.3, hx, hy, 0, o.body, { mat: skin });
      b.ell(W * 0.16, W * 0.12, W * 0.14, hx + W * 0.3, hy - W * 0.06, 0, o.belly ?? o.body, { mat: skin }); // hocico
      if (o.head === 'boar') b.sym((sd) => b.limb([hx + W * 0.36, hy - 0.06, sd * 0.06], [hx + W * 0.44, hy + 0.02, sd * 0.09], 0.02, 0.006, C.offwhite, { mat: SURF.bark, seg: 5 }));
      if (o.head === 'nexu' || o.head === 'cat') b.sym((sd) => b.cone(0.04, 0.12, hx - 0.02, hy + W * 0.27, sd * 0.08, o.body, { mat: skin, seg: 6 }));
      headR = W * 0.29;
      break;
    case 'acklay':
      b.ell(W * 0.36, W * 0.2, W * 0.2, hx, hy, 0, o.body, { mat: skin });
      headR = W * 0.2;
      break;
    default:
      b.ell(W * 0.34, W * 0.26, W * 0.26, hx, hy, 0, o.body, { mat: skin });
      if (o.horns) b.sym((sd) => b.limb([hx - 0.04, hy + 0.1, sd * W * 0.16], [hx - 0.1, hy + 0.24, sd * W * 0.28], 0.03, 0.01, C.offwhite, { mat: SURF.bark, seg: 6 }));
  }
  // ojos pequeños y oscuros a los lados de la cabeza
  b.sym((sd) => b.ell(0.022, 0.018, 0.012, hx + headR * 0.55, hy + headR * 0.3, sd * headR * 0.78, 0x140e0a, { mat: SURF.glass, seg: 8 }));
  b.part('body');
  // cola en dos tramos
  if (o.tail !== false) {
    b.part('tail', 'tail', [-L * 0.45, by, 0], 'body');
    const t1: [number, number, number] = [-L * 0.75, by - H * 0.05, 0];
    b.limb([-L * 0.42, by + H * 0.02, 0], t1, W * 0.18, W * 0.1, o.body, { mat: skin, seg: 8 });
    b.limb(t1, [-L * 1.05, by - H * 0.18, 0], W * 0.1, W * 0.03, o.body, { mat: skin, seg: 7 });
  }
  // patas con muslo, rodilla y pie
  if (o.legs === 2) {
    for (const side of [1, -1]) {
      const z = side * W * 0.28;
      b.part(side > 0 ? 'legL' : 'legR', side > 0 ? 'legL' : 'legR', [0, by - H * 0.1, z]);
      const knee: [number, number, number] = [W * 0.18, by * 0.5, z];
      b.limb([0, by - H * 0.05, z], knee, W * 0.19, W * 0.11, o.body, { mat: skin, seg: 8 });
      b.limb(knee, [-W * 0.05, 0.06, z], W * 0.1, W * 0.07, o.body, { mat: skin, seg: 8 });
      for (const t of [-1, 0, 1]) b.limb([-W * 0.05, 0.04, z], [W * 0.18, 0.02, z + t * W * 0.09], 0.025, 0.012, o.belly ?? o.body, { mat: SURF.leather, seg: 5 });
    }
  } else {
    const anims = [['legFL', L * 0.3, 1], ['legFR', L * 0.3, -1], ['legBL', -L * 0.3, 1], ['legBR', -L * 0.3, -1]] as const;
    for (const [an, x, side] of anims) {
      const z = side * W * 0.3;
      b.part(an, an, [x, by - H * 0.1, z]);
      const knee: [number, number, number] = [x + (x > 0 ? 0.02 : -0.03), by * 0.48, z];
      b.limb([x, by - H * 0.05, z], knee, W * 0.15, W * 0.11, o.body, { mat: skin, seg: 8 });
      b.limb(knee, [x, 0.07, z], W * 0.1, W * 0.09, o.body, { mat: skin, seg: 8 });
      b.cyl(W * 0.11, W * 0.13, 0.08, x, 0.04, z, o.belly ?? 0x3a3020, { seg: 10, mat: SURF.leather }); // pezuña
    }
  }
  b.part('body');
  b.surf(prevMat);
  if (o.saddle) {
    b.rbox(L * 0.35, 0.06, W * 0.72, 0.02, 0, by + H * 0.42, 0, 0x5a3a20, { mat: SURF.leather });
    b.rbox(L * 0.36, 0.02, W * 0.74, 0.008, 0, by + H * 0.45, 0, C.team, { team: 1, mat: SURF.fabric });
  }
  if (o.rider) b.offset(-L * 0.05, by + H * 0.25, 0, () => humanoid(b, { ...o.rider!, scale: (o.rider!.scale ?? 1) * 0.9, seated: true }));
}

// ─────────────────────────── Naves ───────────────────────────
export function tieFighter(b: MB, kind: 'fighter' | 'interceptor' | 'bomber' | 'advanced') {
  b.part('body', 'static');
  const panel = 0x22242a;
  const frame = 0x7a7e86;
  b.surf(SURF.panel);
  if (kind === 'bomber') {
    b.sphere(0.28, 0.1, 0, 0.18, IMP, { seg: 14 });
    b.capsule(0.22, 0.6, -0.05, 0, -0.18, IMP, { rz: Math.PI / 2, seg: 12 });
    b.ell(0.03, 0.11, 0.11, 0.37, 0.02, 0.18, 0x10161c, { mat: SURF.glass });
  } else {
    // cabina esférica con ventana octogonal enmarcada
    b.sphere(0.3, 0, 0, 0, IMP, { seg: 16 });
    b.cyl(0.17, 0.17, 0.04, 0.27, 0.02, 0, 0x10161c, { rz: Math.PI / 2, seg: 8, mat: SURF.glass });
    b.torus(0.17, 0.02, 0.28, 0.02, 0, frame, { ry: Math.PI / 2, seg: 8 });
    for (let i = 0; i < 4; i++) b.rbox(0.02, 0.34, 0.016, 0.004, 0.29, 0.02, 0, frame, { rx: (i * Math.PI) / 4 });
    b.cyl(0.08, 0.08, 0.06, -0.26, 0.0, 0, IMPD, { rz: Math.PI / 2, seg: 12 });
  }
  // pilones
  b.sym((s) => {
    b.cyl(0.065, 0.075, 0.42, 0, 0, s * 0.36, IMPD, { rx: Math.PI / 2, seg: 12 });
    b.cyl(0.1, 0.1, 0.05, 0, 0, s * 0.18, IMP, { rx: Math.PI / 2, seg: 12 });
  });
  b.rbox(0.12, 0.04, 0.38, 0.01, -0.15, 0.27, 0, C.team, { team: 1 });
  for (const s of [1, -1]) {
    const z = s * 0.6;
    if (kind === 'interceptor' || kind === 'advanced') {
      // alas en daga
      b.offset(0, 0, z, () => {
        b.prism([[-0.02, -0.65], [0.02, -0.65], [0.02, 0.65], [-0.02, 0.65]], 0.95, -0.05, 0, 0, panel, { bevel: 0.005 });
        b.rbox(0.05, 1.32, 0.05, 0.01, -0.05, 0, 0, frame);
        b.rbox(0.9, 0.05, 0.05, 0.01, -0.05, 0, 0, frame);
        for (const yy of [-1, 1]) b.limb([0.15, yy * 0.66, 0], [0.55, yy * 0.66, 0], 0.016, 0.012, C.gun, { seg: 6 });
      });
    } else {
      // ala hexagonal: panel solar negro, marco y radios
      b.offset(0, 0, z, () => {
        b.cyl(0.62, 0.62, 0.03, 0, 0, 0, panel, { rx: Math.PI / 2, seg: 6, flat: true, mat: SURF.panel, ms: 1.6 });
        b.torus(0.6, 0.025, 0, 0, 0, frame, { seg: 6, rz: Math.PI / 6 * 0 });
        for (let i = 0; i < 3; i++) b.rbox(0.03, 1.22, 0.035, 0.008, 0, 0, 0, frame, { rz: (i * Math.PI) / 3 });
        b.cyl(0.12, 0.12, 0.05, 0, 0, 0, frame, { rx: Math.PI / 2, seg: 12 });
      });
    }
  }
  b.surf(null);
  b.sym((s) => b.limb([0.22, -0.13, s * 0.08], [0.38, -0.13, s * 0.08], 0.018, 0.018, C.gun, { seg: 6 }));
  b.sym((s) => b.cyl(0.02, 0.02, 0.03, 0.39, -0.13, s * 0.08, C.glowGreen, { em: 1.5, rz: Math.PI / 2, seg: 8 }));
}

export function xwing(b: MB, kind: 'xwing' | 'awing' | 'ywing' | 'bwing' | 'arc170' | 'vwing' | 'n1' | 'nabooBomber' | 'airspeeder' | 'catamaran' | 'glider' | 'jedi') {
  b.part('body', 'static');
  const W = 0xe8e4dc;
  switch (kind) {
    case 'xwing': {
      // T-65: morro largo ahusado, cabina, astromecánico y alas en X con motores y cañones
      b.taper(0.9, 0.17, 0.22, 0.35, 0.4, 0.62, 0.0, 0, W, { mat: SURF.hull });
      b.rbox(0.72, 0.22, 0.28, 0.04, -0.05, 0.0, 0, W, { mat: SURF.hull });
      b.rbox(0.22, 0.26, 0.34, 0.04, -0.46, 0.0, 0, 0xd0ccc4, { mat: SURF.panel });
      b.ell(0.2, 0.08, 0.1, 0.18, 0.12, 0, 0x1a2430, { mat: SURF.glass });
      b.torus(0.1, 0.012, 0.18, 0.12, 0, 0x6a6e76, { rz: Math.PI / 2, ry: Math.PI / 2, seg: 12 });
      b.cyl(0.055, 0.06, 0.06, -0.1, 0.13, 0, 0xe8e8e8, { seg: 12 });
      b.sphere(0.055, -0.1, 0.16, 0, 0x3a6ac8, { seg: 10, mat: SURF.panel }); // R2
      b.rbox(0.5, 0.012, 0.23, 0.004, 0.35, 0.088, 0, C.team, { team: 1 }); // franja
      for (const up of [1, -1])
        for (const side of [1, -1]) {
          const a = side * up * -0.26;
          const span = 0.78;
          const root: [number, number, number] = [-0.25, up * 0.07, side * 0.14];
          const cy = root[1] + up * Math.sin(0.26) * span * 0.5, cz = root[2] + side * Math.cos(0.26) * span * 0.5;
          b.rbox(0.42, 0.028, span, 0.01, root[0], cy, cz, W, { rx: a, mat: SURF.hull });
          b.rbox(0.16, 0.03, 0.3, 0.008, root[0] + 0.08, cy + up * 0.005, cz + side * 0.12, C.team, { team: 1, rx: a });
          // motor junto al fuselaje
          b.cyl(0.075, 0.08, 0.5, -0.27, root[1] + up * 0.05, side * 0.2, 0xa8acb2, { rz: Math.PI / 2, seg: 12, mat: SURF.panel });
          b.cyl(0.06, 0.06, 0.03, -0.53, root[1] + up * 0.05, side * 0.2, C.glowOrange, { em: 2.2, rz: Math.PI / 2, seg: 12 });
          // cañón láser en la punta del ala
          const ty = root[1] + up * Math.sin(0.26) * span, tz = root[2] + side * Math.cos(0.26) * span;
          b.limb([-0.35, ty, tz], [0.75, ty, tz], 0.022, 0.014, 0x8a8e96, { mat: SURF.panel, seg: 8 });
          b.cyl(0.02, 0.02, 0.08, 0.78, ty, tz, 0x3a3c42, { rz: Math.PI / 2, seg: 8 });
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
