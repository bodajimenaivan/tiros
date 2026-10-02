// Infantería y personajes: generador humanoide paramétrico con muchas variantes de Star Wars.
import { MB, C } from './builder';

export type HeadKind =
  | 'storm' | 'clone' | 'clone2' | 'rebel' | 'rebelHelmet' | 'b1' | 'b2' | 'gungan' | 'wookiee' | 'hood' | 'bare' | 'naboo'
  | 'darktrooper' | 'magna' | 'vader' | 'yoda' | 'scout' | 'arc' | 'mando' | 'grievous' | 'maul' | 'tusken' | 'pilot'
  | 'zabrak' | 'oom' | 'nass' | 'jarjar' | 'leia' | 'padme' | 'droidWorker' | 'aa';

export type WeaponKind = 'rifle' | 'pistol' | 'launcher' | 'bowcaster' | 'staff' | 'saber' | 'doubleSaber' | 'none' | 'tool' | 'atlatl' | 'grenade' | 'heavy' | 'sniper' | 'dualPistol' | 'electro' | 'cane' | 'wristBlasters';

export interface HumOpts {
  scale?: number;
  bulk?: number; // anchura
  body: number;
  legs?: number;
  arms?: number;
  boots?: number;
  head: HeadKind;
  headColor?: number;
  accent?: 'shoulder' | 'chest' | 'belt' | 'cape' | 'stripe' | 'sash' | 'none' | 'pauldron';
  weapon: WeaponKind;
  saberColor?: number;
  cape?: number;
  robe?: number;
  backpack?: number;
  thin?: boolean; // droides esbeltos
  skirt?: number;
  fur?: boolean;
}

/** Construye un humanoide. Altura base ~0.85 con scale=1 (mira hacia +X). */
export function humanoid(b: MB, o: HumOpts) {
  const s = o.scale ?? 1;
  const k = o.bulk ?? 1;
  const thin = o.thin ? 0.55 : 1;
  const legC = o.legs ?? o.body;
  const armC = o.arms ?? o.body;
  const boot = o.boots ?? C.black;
  const hipY = 0.36 * s;
  const shY = 0.6 * s;
  const legZ = 0.065 * s * k;
  const shZ = 0.155 * s * k;

  // ── Piernas ──
  b.part('legL', 'legL', [0, hipY, legZ]);
  b.box(0.1 * s * thin, hipY - 0.05 * s, 0.1 * s * thin, 0, hipY / 2 + 0.03 * s, legZ, legC);
  b.box(0.15 * s * thin, 0.07 * s, 0.11 * s * thin, 0.02 * s, 0.035 * s, legZ, boot);
  b.part('legR', 'legR', [0, hipY, -legZ]);
  b.box(0.1 * s * thin, hipY - 0.05 * s, 0.1 * s * thin, 0, hipY / 2 + 0.03 * s, -legZ, legC);
  b.box(0.15 * s * thin, 0.07 * s, 0.11 * s * thin, 0.02 * s, 0.035 * s, -legZ, boot);
  if (o.fur) {
    b.use('legL').box(0.12 * s, hipY - 0.1 * s, 0.12 * s, 0, hipY / 2 + 0.05 * s, legZ, legC);
    b.use('legR').box(0.12 * s, hipY - 0.1 * s, 0.12 * s, 0, hipY / 2 + 0.05 * s, -legZ, legC);
  }

  // ── Torso ──
  b.part('body');
  const tw = 0.27 * s * k * (o.thin ? 0.6 : 1);
  const th = 0.27 * s;
  b.box(0.16 * s * (o.thin ? 0.6 : 1), 0.08 * s, tw * 0.9, 0, hipY + 0.02 * s, 0, o.legs ?? o.body); // cadera
  b.box(0.18 * s * (o.thin ? 0.55 : 1), th, tw, 0, hipY + th / 2 + 0.04 * s, 0, o.body);
  if (o.robe) {
    b.cyl(0.13 * s * k, 0.2 * s * k, 0.36 * s, -0.01 * s, 0.2 * s, 0, o.robe, { seg: 8 });
  }
  if (o.skirt) b.cyl(0.12 * s * k, 0.17 * s * k, 0.16 * s, 0, hipY - 0.04 * s, 0, o.skirt, { seg: 8 });
  // cinturón
  if (!o.thin) b.box(0.19 * s, 0.035 * s, tw * 1.02, 0, hipY + 0.05 * s, 0, o.accent === 'belt' ? C.team : C.dark, { team: o.accent === 'belt' ? 1 : 0 });
  // acentos de equipo
  switch (o.accent ?? 'shoulder') {
    case 'shoulder':
      b.box(0.14 * s, 0.05 * s, 0.09 * s, 0, shY + 0.03 * s, shZ, C.team, { team: 1 });
      b.box(0.14 * s, 0.05 * s, 0.09 * s, 0, shY + 0.03 * s, -shZ, C.team, { team: 1 });
      break;
    case 'pauldron':
      b.box(0.15 * s, 0.06 * s, 0.1 * s, 0, shY + 0.03 * s, -shZ, C.team, { team: 1, rx: -0.3 });
      break;
    case 'chest':
      b.box(0.02 * s, 0.12 * s, tw * 0.6, 0.095 * s, hipY + th * 0.6, 0, C.team, { team: 1 });
      break;
    case 'stripe':
      b.box(0.185 * s, 0.03 * s, tw * 1.01, 0, hipY + th * 0.85, 0, C.team, { team: 1 });
      b.box(0.14 * s, 0.05 * s, 0.09 * s, 0, shY + 0.03 * s, shZ, C.team, { team: 1 });
      break;
    case 'sash':
      b.box(0.19 * s, 0.05 * s, tw * 1.03, 0, hipY + th * 0.5, 0, C.team, { team: 1, rx: 0.5 });
      break;
    case 'cape':
      break;
    default:
      break;
  }
  if (o.cape !== undefined || o.accent === 'cape') {
    b.part('cape', 'tail', [-0.09 * s, shY + 0.02 * s, 0]);
    b.box(0.03 * s, 0.5 * s, tw * 1.1, -0.11 * s, shY - 0.22 * s, 0, o.cape ?? C.team, { team: o.cape === undefined ? 1 : 0.6, rz: -0.08 });
    b.part('body');
  }
  if (o.backpack) b.box(0.1 * s, 0.18 * s, 0.18 * s * k, -0.13 * s, hipY + 0.16 * s, 0, o.backpack);

  // ── Cabeza ──
  head(b, o, s, shY, k);

  // ── Brazos ──
  b.part('armL', 'armL', [0, shY, shZ]);
  b.box(0.08 * s * thin, 0.24 * s, 0.08 * s * thin, 0.02 * s, shY - 0.12 * s, shZ, armC, { rz: -0.15 });
  if (o.fur) b.box(0.1 * s, 0.2 * s, 0.1 * s, 0.02 * s, shY - 0.1 * s, shZ, armC, { rz: -0.15 });
  b.part('armR', 'armR', [0, shY, -shZ]);
  b.box(0.08 * s * thin, 0.24 * s, 0.08 * s * thin, 0.04 * s, shY - 0.1 * s, -shZ, armC, { rz: -0.55 });
  if (o.fur) b.box(0.1 * s, 0.2 * s, 0.1 * s, 0.04 * s, shY - 0.1 * s, -shZ, armC, { rz: -0.55 });
  weapon(b, o, s, shY, shZ);
  b.part('body');
}

function head(b: MB, o: HumOpts, s: number, shY: number, k: number) {
  const hy = shY + 0.12 * s;
  const hc = o.headColor ?? o.body;
  b.part('body');
  switch (o.head) {
    case 'storm':
      b.sphere(0.09 * s, 0, hy, 0, C.white, { sy: 1.1 });
      b.box(0.04 * s, 0.03 * s, 0.11 * s, 0.075 * s, hy + 0.01 * s, 0, C.black); // visor
      b.box(0.05 * s, 0.05 * s, 0.07 * s, 0.07 * s, hy - 0.05 * s, 0, C.lgray); // respirador
      b.box(0.02 * s, 0.015 * s, 0.05 * s, 0.09 * s, hy - 0.06 * s, 0, C.black);
      break;
    case 'scout':
      b.sphere(0.085 * s, 0, hy, 0, C.white);
      b.box(0.12 * s, 0.03 * s, 0.16 * s, 0.06 * s, hy - 0.03 * s, 0, C.white);
      b.box(0.03 * s, 0.03 * s, 0.12 * s, 0.085 * s, hy + 0.005 * s, 0, C.black);
      break;
    case 'clone':
    case 'clone2':
    case 'arc':
      b.sphere(0.088 * s, 0, hy, 0, C.white, { sy: 1.05 });
      b.box(0.04 * s, 0.025 * s, 0.13 * s, 0.075 * s, hy + 0.015 * s, 0, C.black); // T-visor
      b.box(0.04 * s, 0.07 * s, 0.03 * s, 0.075 * s, hy - 0.02 * s, 0, C.black);
      b.box(0.1 * s, 0.02 * s, 0.17 * s, 0.03 * s, hy + 0.06 * s, 0, C.team, { team: 1 }); // franja
      if (o.head === 'clone2') b.box(0.03 * s, 0.07 * s, 0.02 * s, 0, hy + 0.1 * s, 0, C.white); // telémetro
      if (o.head === 'arc') {
        b.box(0.02 * s, 0.12 * s, 0.02 * s, -0.02 * s, hy + 0.08 * s, -0.08 * s, C.dgray);
        b.box(0.1 * s, 0.25 * s, 0.03 * s, -0.04 * s, shY - 0.05 * s, 0.17 * s, C.team, { team: 1 }); // kama
      }
      break;
    case 'rebel':
      b.sphere(0.08 * s, 0, hy, 0, C.skin);
      b.sphere(0.085 * s, -0.01 * s, hy + 0.03 * s, 0, 0x4a3420, { sy: 0.6 }); // pelo
      break;
    case 'rebelHelmet':
      b.sphere(0.08 * s, 0, hy, 0, C.skin);
      b.sphere(0.092 * s, -0.005 * s, hy + 0.025 * s, 0, 0x7a6a50, { sy: 0.75 });
      b.box(0.02 * s, 0.02 * s, 0.14 * s, 0.07 * s, hy + 0.03 * s, 0, 0x3a3020);
      break;
    case 'pilot':
      b.sphere(0.088 * s, 0, hy, 0, C.orange);
      b.box(0.03 * s, 0.05 * s, 0.12 * s, 0.07 * s, hy, 0, C.glass);
      b.box(0.12 * s, 0.025 * s, 0.03 * s, 0, hy + 0.07 * s, 0, C.team, { team: 1 });
      break;
    case 'naboo':
      b.sphere(0.08 * s, 0, hy, 0, C.skin);
      b.cyl(0.1 * s, 0.09 * s, 0.05 * s, 0, hy + 0.06 * s, 0, 0x3a2a1a); // gorra
      b.box(0.06 * s, 0.015 * s, 0.12 * s, 0.07 * s, hy + 0.04 * s, 0, 0x2a1a10);
      break;
    case 'b1':
      b.box(0.05 * s, 0.05 * s, 0.05 * s, 0, hy - 0.03 * s, 0, hc);
      b.box(0.2 * s, 0.07 * s, 0.07 * s, 0.07 * s, hy + 0.02 * s, 0, hc, { rz: -0.35 }); // cabeza alargada
      b.box(0.04 * s, 0.03 * s, 0.08 * s, -0.04 * s, hy + 0.06 * s, 0, hc);
      break;
    case 'oom':
      b.box(0.05 * s, 0.05 * s, 0.05 * s, 0, hy - 0.03 * s, 0, hc);
      b.box(0.2 * s, 0.07 * s, 0.07 * s, 0.07 * s, hy + 0.02 * s, 0, hc, { rz: -0.35 });
      b.box(0.06 * s, 0.03 * s, 0.09 * s, 0.03 * s, hy + 0.05 * s, 0, C.team, { team: 1, rz: -0.35 });
      break;
    case 'b2':
      b.box(0.08 * s, 0.05 * s, 0.1 * s, 0.02 * s, hy - 0.02 * s, 0, hc);
      b.box(0.03 * s, 0.02 * s, 0.07 * s, 0.065 * s, hy - 0.01 * s, 0, C.glowRed, { em: 1.2 });
      break;
    case 'droidWorker':
      b.cyl(0.07 * s, 0.07 * s, 0.1 * s, 0, hy, 0, hc);
      b.sphere(0.03 * s, 0.065 * s, hy + 0.01 * s, 0, C.glowCyan, { em: 1.2 });
      b.cyl(0.005 * s, 0.005 * s, 0.12 * s, -0.02 * s, hy + 0.1 * s, 0, C.dgray);
      break;
    case 'darktrooper':
      b.box(0.14 * s, 0.13 * s, 0.13 * s, 0.01 * s, hy + 0.01 * s, 0, 0x1a1a20);
      b.box(0.03 * s, 0.03 * s, 0.1 * s, 0.075 * s, hy + 0.02 * s, 0, C.glowRed, { em: 1.6 });
      b.box(0.04 * s, 0.08 * s, 0.03 * s, 0.03 * s, hy + 0.1 * s, -0.04 * s, C.team, { team: 1 });
      break;
    case 'magna':
      b.sphere(0.07 * s, 0, hy, 0, 0x2a2a30);
      b.sphere(0.02 * s, 0.06 * s, hy + 0.01 * s, 0.025 * s, C.glowRed, { em: 1.5 });
      b.sphere(0.02 * s, 0.06 * s, hy + 0.01 * s, -0.025 * s, C.glowRed, { em: 1.5 });
      b.cyl(0.02 * s, 0.11 * s, 0.25 * s, -0.08 * s, hy - 0.12 * s, 0, 0x5a2a20); // capa corta
      break;
    case 'vader':
      b.sphere(0.1 * s, 0, hy, 0, C.black, { sy: 1.05 });
      b.cone(0.12 * s, 0.1 * s, 0, hy - 0.04 * s, 0, C.black, { seg: 10 });
      b.box(0.04 * s, 0.03 * s, 0.1 * s, 0.085 * s, hy + 0.01 * s, 0, 0x101014);
      b.box(0.05 * s, 0.05 * s, 0.06 * s, 0.08 * s, hy - 0.05 * s, 0, 0x3a3a40);
      b.box(0.02 * s, 0.06 * s, 0.1 * s, 0.1 * s, shY - 0.12 * s, 0, 0x8a8a90, { em: 0.1 }); // panel pecho
      b.box(0.01 * s, 0.015 * s, 0.03 * s, 0.112 * s, shY - 0.1 * s, 0.02 * s, C.glowRed, { em: 1.5 });
      break;
    case 'yoda':
      b.sphere(0.09 * s, 0, hy - 0.02 * s, 0, 0x8aa86a);
      b.cone(0.03 * s, 0.14 * s, 0, hy, 0.1 * s, 0x8aa86a, { rx: Math.PI / 2 + 0.3 });
      b.cone(0.03 * s, 0.14 * s, 0, hy, -0.1 * s, 0x8aa86a, { rx: -Math.PI / 2 - 0.3 });
      break;
    case 'hood':
      b.sphere(0.08 * s, 0, hy, 0, C.skin);
      b.sphere(0.1 * s, -0.025 * s, hy + 0.02 * s, 0, o.robe ?? 0x6a4a30, { sx: 0.9 });
      break;
    case 'bare':
      b.sphere(0.08 * s, 0, hy, 0, hc === o.body ? C.skin : hc);
      break;
    case 'leia':
      b.sphere(0.078 * s, 0, hy, 0, C.skin);
      b.sphere(0.05 * s, -0.01 * s, hy, 0.085 * s, 0x3a2414);
      b.sphere(0.05 * s, -0.01 * s, hy, -0.085 * s, 0x3a2414);
      b.sphere(0.08 * s, -0.015 * s, hy + 0.03 * s, 0, 0x3a2414, { sy: 0.6 });
      break;
    case 'padme':
      b.sphere(0.078 * s, 0, hy, 0, 0xf0e0d8);
      b.box(0.14 * s, 0.18 * s, 0.22 * s, -0.02 * s, hy + 0.1 * s, 0, 0x1a1a1a); // tocado
      b.box(0.02 * s, 0.02 * s, 0.02 * s, 0.07 * s, hy - 0.04 * s, 0, C.glowRed, { em: 0.8 });
      break;
    case 'mando':
      b.sphere(0.09 * s, 0, hy, 0, 0x4a6a4a, { sy: 1.05 });
      b.box(0.04 * s, 0.025 * s, 0.13 * s, 0.075 * s, hy + 0.015 * s, 0, C.black);
      b.box(0.04 * s, 0.07 * s, 0.03 * s, 0.075 * s, hy - 0.02 * s, 0, C.black);
      b.cyl(0.006 * s, 0.006 * s, 0.1 * s, 0, hy + 0.08 * s, -0.08 * s, C.dgray);
      b.box(0.1 * s, 0.22 * s, 0.16 * s, -0.13 * s, shY - 0.1 * s, 0, C.metal); // mochila
      b.cone(0.04 * s, 0.1 * s, -0.13 * s, shY + 0.06 * s, 0, 0x7a5a3a);
      break;
    case 'grievous':
      b.box(0.14 * s, 0.07 * s, 0.09 * s, 0.03 * s, hy + 0.02 * s, 0, 0xe8e0c8, { rz: -0.2 });
      b.sphere(0.018 * s, 0.09 * s, hy + 0.02 * s, 0.025 * s, 0xffd040, { em: 1.2 });
      b.sphere(0.018 * s, 0.09 * s, hy + 0.02 * s, -0.025 * s, 0xffd040, { em: 1.2 });
      break;
    case 'maul':
    case 'zabrak':
      b.sphere(0.08 * s, 0, hy, 0, 0xb02020);
      b.box(0.05 * s, 0.02 * s, 0.1 * s, 0.065 * s, hy, 0, C.black);
      for (let i = 0; i < 5; i++) b.cone(0.012 * s, 0.04 * s, -0.02 * s + Math.cos(i) * 0.03 * s, hy + 0.08 * s, Math.sin(i * 1.3) * 0.05 * s, 0xe8d8b0);
      break;
    case 'gungan':
      b.sphere(0.07 * s, 0.02 * s, hy + 0.02 * s, 0, hc, { sx: 1.4 });
      b.sphere(0.04 * s, 0.1 * s, hy + 0.02 * s, 0, hc); // hocico
      b.sphere(0.02 * s, 0.03 * s, hy + 0.08 * s, 0.035 * s, 0xf0d040);
      b.sphere(0.02 * s, 0.03 * s, hy + 0.08 * s, -0.035 * s, 0xf0d040);
      b.box(0.05 * s, 0.24 * s, 0.03 * s, -0.08 * s, hy - 0.08 * s, 0.07 * s, hc, { rz: 0.2 }); // orejas
      b.box(0.05 * s, 0.24 * s, 0.03 * s, -0.08 * s, hy - 0.08 * s, -0.07 * s, hc, { rz: 0.2 });
      break;
    case 'jarjar':
      b.sphere(0.07 * s, 0.02 * s, hy + 0.03 * s, 0, 0xd08a40, { sx: 1.5 });
      b.sphere(0.04 * s, 0.11 * s, hy + 0.02 * s, 0, 0xd08a40, { sx: 1.4 });
      b.sphere(0.022 * s, 0.03 * s, hy + 0.1 * s, 0.035 * s, 0xf0d040);
      b.sphere(0.022 * s, 0.03 * s, hy + 0.1 * s, -0.035 * s, 0xf0d040);
      b.box(0.05 * s, 0.32 * s, 0.03 * s, -0.08 * s, hy - 0.12 * s, 0.07 * s, 0xc07a30, { rz: 0.15 });
      b.box(0.05 * s, 0.32 * s, 0.03 * s, -0.08 * s, hy - 0.12 * s, -0.07 * s, 0xc07a30, { rz: 0.15 });
      break;
    case 'nass':
      b.sphere(0.12 * s, 0.02 * s, hy, 0, 0x9a7a50, { sx: 1.3 });
      b.box(0.08 * s, 0.03 * s, 0.14 * s, 0.1 * s, hy - 0.04 * s, 0, 0x6a4a2a);
      b.cyl(0.1 * s, 0.11 * s, 0.05 * s, -0.02 * s, hy + 0.11 * s, 0, 0x4a2a5a); // sombrero
      break;
    case 'wookiee':
      b.sphere(0.095 * s, 0.01 * s, hy, 0, hc, { sy: 1.15 });
      b.box(0.05 * s, 0.04 * s, 0.08 * s, 0.08 * s, hy - 0.02 * s, 0, 0x3a2414);
      b.sphere(0.012 * s, 0.085 * s, hy + 0.035 * s, 0.03 * s, C.black);
      b.sphere(0.012 * s, 0.085 * s, hy + 0.035 * s, -0.03 * s, C.black);
      break;
    case 'tusken':
      b.sphere(0.085 * s, 0, hy, 0, 0xc8b898);
      b.box(0.05 * s, 0.02 * s, 0.1 * s, 0.075 * s, hy + 0.02 * s, 0, C.black);
      break;
    case 'aa':
      b.sphere(0.088 * s, 0, hy, 0, o.headColor ?? C.white, { sy: 1.05 });
      b.box(0.04 * s, 0.03 * s, 0.13 * s, 0.075 * s, hy + 0.01 * s, 0, C.black);
      b.box(0.04 * s, 0.1 * s, 0.03 * s, 0.03 * s, hy + 0.08 * s, -0.07 * s, C.team, { team: 1 });
      break;
  }
  void k;
}

function weapon(b: MB, o: HumOpts, s: number, shY: number, shZ: number) {
  b.part('armR');
  const hx = 0.12 * s, hy = shY - 0.17 * s, hz = -shZ; // posición de la mano
  switch (o.weapon) {
    case 'rifle':
      b.box(0.34 * s, 0.045 * s, 0.035 * s, hx + 0.08 * s, hy + 0.03 * s, hz + 0.03 * s, C.gun);
      b.box(0.06 * s, 0.07 * s, 0.03 * s, hx - 0.02 * s, hy, hz + 0.03 * s, C.gun);
      b.box(0.1 * s, 0.02 * s, 0.02 * s, hx + 0.12 * s, hy + 0.065 * s, hz + 0.03 * s, C.dgray);
      break;
    case 'heavy':
      b.box(0.4 * s, 0.07 * s, 0.06 * s, hx + 0.1 * s, hy + 0.03 * s, hz + 0.03 * s, C.gun);
      b.cyl(0.03 * s, 0.03 * s, 0.12 * s, hx + 0.3 * s, hy + 0.03 * s, hz + 0.03 * s, C.dgray, { rz: Math.PI / 2 });
      b.box(0.08 * s, 0.1 * s, 0.05 * s, hx - 0.02 * s, hy - 0.02 * s, hz + 0.03 * s, C.gun);
      break;
    case 'sniper':
      b.box(0.5 * s, 0.035 * s, 0.03 * s, hx + 0.14 * s, hy + 0.03 * s, hz + 0.03 * s, C.gun);
      b.cyl(0.018 * s, 0.018 * s, 0.12 * s, hx + 0.06 * s, hy + 0.08 * s, hz + 0.03 * s, C.dgray, { rz: Math.PI / 2 });
      break;
    case 'pistol':
    case 'dualPistol':
      b.box(0.14 * s, 0.04 * s, 0.03 * s, hx + 0.04 * s, hy + 0.02 * s, hz, C.gun);
      if (o.weapon === 'dualPistol') {
        b.part('armL');
        b.box(0.14 * s, 0.04 * s, 0.03 * s, hx, hy + 0.02 * s, shZ, C.gun);
        b.part('armR');
      }
      break;
    case 'launcher':
      b.cyl(0.05 * s, 0.05 * s, 0.42 * s, hx + 0.06 * s, hy + 0.12 * s, hz + 0.02 * s, 0x4a5a3a, { rz: Math.PI / 2 });
      b.cyl(0.055 * s, 0.04 * s, 0.05 * s, hx + 0.28 * s, hy + 0.12 * s, hz + 0.02 * s, C.dgray, { rz: Math.PI / 2 });
      break;
    case 'grenade':
      b.box(0.22 * s, 0.05 * s, 0.04 * s, hx + 0.05 * s, hy + 0.03 * s, hz + 0.03 * s, C.gun);
      b.cyl(0.035 * s, 0.035 * s, 0.1 * s, hx + 0.18 * s, hy + 0.03 * s, hz + 0.03 * s, C.dgray, { rz: Math.PI / 2 });
      b.part('body');
      b.sphere(0.025 * s, 0.05 * s, 0.4 * s, 0.13 * s, C.dgray);
      b.sphere(0.025 * s, 0.05 * s, 0.4 * s, -0.13 * s, C.dgray);
      b.part('armR');
      break;
    case 'bowcaster':
      b.box(0.36 * s, 0.05 * s, 0.04 * s, hx + 0.08 * s, hy + 0.03 * s, hz + 0.03 * s, 0x5a3a1a);
      b.box(0.04 * s, 0.03 * s, 0.24 * s, hx + 0.22 * s, hy + 0.06 * s, hz + 0.03 * s, C.metal);
      b.box(0.08 * s, 0.05 * s, 0.05 * s, hx + 0.02 * s, hy + 0.07 * s, hz + 0.03 * s, C.dgray);
      break;
    case 'staff':
    case 'electro':
      b.cyl(0.015 * s, 0.015 * s, 0.7 * s, hx + 0.05 * s, hy + 0.05 * s, hz, o.weapon === 'electro' ? 0x3a3a40 : 0x6a4a2a, { rz: 1.2 });
      if (o.weapon === 'electro') {
        b.sphere(0.03 * s, hx + 0.37 * s, hy + 0.18 * s, hz, 0x8ad8ff, { em: 2 });
        b.sphere(0.03 * s, hx - 0.27 * s, hy - 0.07 * s, hz, 0x8ad8ff, { em: 2 });
      }
      break;
    case 'atlatl':
      b.cyl(0.012 * s, 0.012 * s, 0.4 * s, hx + 0.04 * s, hy + 0.12 * s, hz, 0x6a4a2a, { rz: 0.6 });
      b.sphere(0.04 * s, hx + 0.16 * s, hy + 0.28 * s, hz, 0x6aff8a, { em: 1.5 });
      b.part('armL');
      b.cyl(0.08 * s, 0.08 * s, 0.02 * s, 0.06 * s, shY - 0.12 * s, shZ + 0.04 * s, 0xb08a4a, { rx: Math.PI / 2 }); // escudo
      b.part('armR');
      break;
    case 'tool':
      b.box(0.04 * s, 0.18 * s, 0.03 * s, hx + 0.04 * s, hy + 0.06 * s, hz, C.metal, { rz: -0.4 });
      b.box(0.07 * s, 0.04 * s, 0.05 * s, hx + 0.1 * s, hy + 0.15 * s, hz, C.yellow, { rz: -0.4 });
      break;
    case 'cane':
      b.cyl(0.01 * s, 0.01 * s, 0.35 * s, hx + 0.02 * s, hy - 0.1 * s, hz, 0x5a6a3a, { rz: 0.1 });
      break;
    case 'wristBlasters':
      b.box(0.12 * s, 0.07 * s, 0.07 * s, hx + 0.02 * s, hy + 0.02 * s, hz, C.dgray);
      b.part('armL');
      b.box(0.12 * s, 0.07 * s, 0.07 * s, 0.1 * s, shY - 0.15 * s, shZ, C.dgray);
      b.part('armR');
      break;
    case 'saber':
    case 'doubleSaber': {
      b.box(0.04 * s, 0.03 * s, 0.03 * s, hx + 0.04 * s, hy + 0.02 * s, hz, C.metal); // empuñadura
      b.part('saber', 'saber', [hx + 0.04 * s, hy + 0.02 * s, hz], 'armR', true);
      const L = 0.5 * s;
      b.cyl(0.018 * s, 0.018 * s, L, hx + 0.04 * s, hy + 0.04 * s + L / 2, hz, C.team, { team: 1, em: 2.4, seg: 6 });
      if (o.weapon === 'doubleSaber') b.cyl(0.018 * s, 0.018 * s, L, hx + 0.04 * s, hy - L / 2, hz, C.team, { team: 1, em: 2.4, seg: 6 });
      break;
    }
    case 'none':
      break;
  }
  b.part('body');
}

/** Multiples sables (Grievous) en brazos extra */
export function extraSabers(b: MB, n: number, s: number) {
  for (let i = 0; i < n; i++) {
    const z = (i % 2 === 0 ? 1 : -1) * 0.2 * s;
    const y = 0.5 * s + (i < 2 ? 0.05 : -0.08) * s;
    b.part('saber' + (i + 2), 'saber2', [0.1 * s, y, z], null, true);
    b.box(0.25 * s, 0.03 * s, 0.03 * s, 0.05 * s, y, z, 0xe8e0c8, { rz: 0.3 });
    b.cyl(0.016 * s, 0.016 * s, 0.45 * s, 0.25 * s, y + 0.25 * s, z, C.team, { team: 1, em: 2.4, seg: 6, rz: -0.3 });
  }
}
