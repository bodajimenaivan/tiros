// Infantería y personajes: generador humanoide paramétrico con proporciones realistas,
// rodillas articuladas, armaduras por placas, cascos detallados y superficies texturizadas.
// Convenciones: mira hacia +X, Y arriba, el lado izquierdo es +Z. Altura ~0.86 con scale = 1.
import { MB, C } from './builder';
import { SURF } from '../surface';

export type HeadKind =
  | 'storm' | 'clone' | 'clone2' | 'rebel' | 'rebelHelmet' | 'b1' | 'b2' | 'gungan' | 'wookiee' | 'hood' | 'bare' | 'naboo'
  | 'darktrooper' | 'magna' | 'vader' | 'yoda' | 'scout' | 'arc' | 'mando' | 'grievous' | 'maul' | 'tusken' | 'pilot'
  | 'zabrak' | 'oom' | 'nass' | 'jarjar' | 'leia' | 'padme' | 'droidWorker' | 'aa' | 'hothHelmet' | 'engineer';

export type WeaponKind = 'rifle' | 'pistol' | 'launcher' | 'bowcaster' | 'staff' | 'saber' | 'doubleSaber' | 'none' | 'tool' | 'atlatl' | 'grenade' | 'heavy' | 'sniper' | 'dualPistol' | 'electro' | 'cane' | 'wristBlasters';

/** Tipo de vestimenta: decide cómo se construyen torso y extremidades */
export type Outfit = 'armor' | 'uniform' | 'droid' | 'b2' | 'fur' | 'robe' | 'skin' | 'heavyDroid';

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
  outfit?: Outfit;
  /** Color del chaleco / segunda prenda */
  vest?: number;
  /** Color de piel o de la cara */
  skin?: number;
  hair?: number;
  /** Sentado (pilotos de motos y bestias) */
  seated?: boolean;
}

type V3 = [number, number, number];

const SKIN = 0xd9a882;
const BODYSUIT = 0x16171b;
const GLOVE = 0x1c1d21;
const LEATHER = 0x4a3524;
const VISOR = 0x0b0c10;

function outfitOf(o: HumOpts): Outfit {
  if (o.outfit) return o.outfit;
  if (o.fur) return 'fur';
  switch (o.head) {
    case 'storm': case 'clone': case 'clone2': case 'arc': case 'aa': case 'scout': case 'vader': case 'mando':
      return 'armor';
    case 'b1': case 'oom': case 'droidWorker': case 'magna': case 'grievous':
      return 'droid';
    case 'b2':
      return 'b2';
    case 'darktrooper':
      return 'heavyDroid';
    case 'gungan': case 'jarjar': case 'nass':
      return 'skin';
    default:
      return o.robe !== undefined ? 'robe' : 'uniform';
  }
}

/** Construye un humanoide. */
export function humanoid(b: MB, o: HumOpts) {
  const s = o.scale ?? 1;
  const k = o.bulk ?? 1;
  const out = outfitOf(o);
  const thin = out === 'droid' || !!o.thin;
  const wk = Math.sqrt(k);
  const legC = o.legs ?? o.body;
  const armC = o.arms ?? o.body;
  const boot = o.boots ?? (out === 'armor' ? o.body : out === 'droid' ? o.body : C.black);
  const skin = o.skin ?? (o.headColor !== undefined && o.headColor !== o.body ? o.headColor : SKIN);
  const P = (x: number, y: number, z: number): V3 => [x * s, y * s, z * s];
  const prevMat = b.defMat;

  // ── esqueleto ──
  const seatDrop = o.seated ? -0.085 : 0;
  const hipY = 0.445 + seatDrop;
  const kneeY = 0.25 + seatDrop;
  const hz = (thin ? 0.04 : 0.05) * k;
  const shY = 0.675 + seatDrop;
  const shZ = (thin ? 0.092 : 0.112) * k * (out === 'b2' ? 1.35 : out === 'fur' ? 1.08 : 1);
  const neckY = 0.72 + seatDrop;
  const headY = 0.787 + seatDrop + (out === 'b2' ? -0.02 : out === 'armor' || out === 'heavyDroid' ? -0.008 : 0);

  // ── piernas ──
  for (const side of [1, -1]) {
    const L = side > 0;
    const hip: V3 = [0, hipY, side * hz];
    const knee: V3 = o.seated ? [0.17, hipY + 0.01, side * (hz + 0.012)] : [0.012, kneeY, side * hz];
    const ankle: V3 = o.seated ? [0.15, hipY - 0.19, side * (hz + 0.015)] : [-0.004, 0.055, side * hz];
    b.part(L ? 'legL' : 'legR', o.seated ? 'static' : L ? 'legL' : 'legR', P(...hip));
    thigh(b, out, P, hip, knee, legC, wk, thin, o);
    b.part(L ? 'shinL' : 'shinR', o.seated ? 'static' : L ? 'shinL' : 'shinR', P(...knee), L ? 'legL' : 'legR');
    shin(b, out, P, knee, ankle, legC, boot, wk, thin, o, side);
  }

  // ── torso ──
  b.part('body');
  torso(b, out, P, o, { hipY, shY, neckY, shZ, k, wk, thin, skin });

  // ── cabeza ──
  head(b, o, P, headY, neckY, out, skin);

  // ── brazos y arma ──
  arms(b, o, P, out, { shY, shZ, wk, thin, armC, skin, seatDrop });

  if (o.cape !== undefined || o.accent === 'cape') {
    b.part('cape', 'tail', P(-0.06, shY + 0.02, 0));
    const cc = o.cape ?? C.team;
    const cw = shZ * 1.9;
    // capa: lámina curvada que cae desde los hombros
    b.surf(SURF.fabric);
    b.rbox(0.025 * s, (o.seated ? 0.36 : 0.56) * s, cw * s, 0.008 * s, -0.085 * s, (shY - (o.seated ? 0.17 : 0.27)) * s, 0, cc, { team: o.cape === undefined ? 1 : 0, rz: -0.1 });
    b.ell(0.045 * s, 0.03 * s, cw * 0.55 * s, -0.06 * s, (shY + 0.005) * s, 0, cc, { team: o.cape === undefined ? 1 : 0 });
  }
  b.part('body');
  b.surf(prevMat);
}

interface TorsoCtx {
  hipY: number;
  shY: number;
  neckY: number;
  shZ: number;
  k: number;
  wk: number;
  thin: boolean;
  skin: number;
}

// ───────────────────────── piernas ─────────────────────────
function thigh(b: MB, out: Outfit, P: (x: number, y: number, z: number) => V3, hip: V3, knee: V3, legC: number, wk: number, thin: boolean, o: HumOpts) {
  const s = o.scale ?? 1;
  const r0 = (thin ? 0.018 : 0.041) * wk, r1 = (thin ? 0.016 : 0.031) * wk;
  const lerp = (t: number): V3 => [hip[0] + (knee[0] - hip[0]) * t, hip[1] + (knee[1] - hip[1]) * t, hip[2] + (knee[2] - hip[2]) * t];
  switch (out) {
    case 'armor':
      b.limb(P(...hip), P(...knee), r0 * s * 0.92, r1 * s * 0.9, BODYSUIT, { mat: SURF.rubber });
      b.limb(P(...lerp(0.08)), P(...lerp(0.78)), r0 * s * 1.08, r1 * s * 1.12, legC, { mat: SURF.armor });
      break;
    case 'droid':
      b.limb(P(...hip), P(...knee), r0 * s, r1 * s, legC, { mat: SURF.panel, ms: 3, seg: 7 });
      b.limb(P(...lerp(0.2)), P(...lerp(0.6)), r0 * s * 1.7, r1 * s * 1.7, legC, { mat: SURF.panel, ms: 3, seg: 7 });
      break;
    case 'b2':
    case 'heavyDroid':
      b.limb(P(...hip), P(...knee), r0 * s * 0.9, r1 * s * 0.85, out === 'b2' ? legC : 0x1e1f24, { mat: SURF.panel, ms: 2.5 });
      b.limb(P(...lerp(0.1)), P(...lerp(0.7)), r0 * s * 1.15, r1 * s * 1.1, legC, { mat: SURF.panel, ms: 2.5 });
      break;
    case 'fur':
      b.limb(P(...hip), P(...knee), r0 * s * 1.22, r1 * s * 1.2, legC, { mat: SURF.fur });
      break;
    case 'skin':
      b.limb(P(...hip), P(...knee), r0 * s * 0.85, r1 * s * 0.8, o.legs ?? legC, { mat: SURF.skin });
      if (o.skirt) b.limb(P(...lerp(-0.1)), P(...lerp(0.45)), r0 * s * 1.25, r1 * s * 1.35, o.skirt, { mat: SURF.leather });
      break;
    case 'robe':
      b.limb(P(...hip), P(...knee), r0 * s, r1 * s, legC, { mat: SURF.fabric });
      break;
    default:
      b.limb(P(...hip), P(...knee), r0 * s, r1 * s, legC, { mat: SURF.fabric });
      // bolsillo lateral
      b.rbox(0.05 * s, 0.06 * s, 0.018 * s, 0.006 * s, ...P(lerp(0.4)[0], lerp(0.4)[1], lerp(0.4)[2] + Math.sign(hip[2]) * r0 * 0.95), legC, { mat: SURF.fabric });
  }
}

function shin(b: MB, out: Outfit, P: (x: number, y: number, z: number) => V3, knee: V3, ankle: V3, legC: number, boot: number, wk: number, thin: boolean, o: HumOpts, side: number) {
  const s = o.scale ?? 1;
  const r0 = (thin ? 0.016 : 0.03) * wk, r1 = (thin ? 0.014 : 0.022) * wk;
  const lerp = (t: number): V3 => [knee[0] + (ankle[0] - knee[0]) * t, knee[1] + (ankle[1] - knee[1]) * t, knee[2] + (ankle[2] - knee[2]) * t];
  const footY = ankle[1] - 0.03;
  const footX = ankle[0];
  const fz = ankle[2];
  switch (out) {
    case 'armor':
      b.limb(P(...knee), P(...ankle), r0 * s * 0.9, r1 * s * 0.9, BODYSUIT, { mat: SURF.rubber });
      b.ell(0.024 * s, 0.026 * s, 0.026 * s, ...P(knee[0] + 0.014, knee[1] - 0.01, knee[2]), legC, { mat: SURF.armor }); // rodillera
      b.limb(P(...lerp(0.18)), P(...lerp(0.8)), r0 * s * 1.18, r1 * s * 1.25, legC, { mat: SURF.armor });
      // bota de armadura
      b.rbox(0.105 * s, 0.05 * s, 0.05 * s * wk, 0.016 * s, ...P(footX + 0.022, footY + 0.022, fz), boot, { mat: SURF.armor });
      break;
    case 'droid':
      b.limb(P(...knee), P(...ankle), r0 * s, r1 * s, legC, { mat: SURF.panel, ms: 3, seg: 7 });
      b.sphere(0.022 * s * wk, ...P(...knee), legC, { mat: SURF.panel, seg: 8 });
      // pie de droide: dos dedos
      b.rbox(0.08 * s, 0.022 * s, 0.03 * s, 0.008 * s, ...P(footX + 0.025, footY + 0.012, fz), boot, { mat: SURF.panel });
      b.rbox(0.03 * s, 0.022 * s, 0.03 * s, 0.008 * s, ...P(footX - 0.03, footY + 0.012, fz), boot, { mat: SURF.panel });
      break;
    case 'b2':
    case 'heavyDroid':
      b.limb(P(...knee), P(...ankle), r0 * s * 0.95, r1 * s, out === 'b2' ? legC : 0x1e1f24, { mat: SURF.panel, ms: 2.5 });
      b.sphere(0.03 * s * wk, ...P(...knee), legC, { mat: SURF.panel, seg: 10 });
      b.rbox(0.13 * s, 0.045 * s, 0.075 * s * wk, 0.015 * s, ...P(footX + 0.03, footY + 0.022, fz), legC, { mat: SURF.panel, ms: 2 });
      break;
    case 'fur':
      b.limb(P(...knee), P(...ankle), r0 * s * 1.25, r1 * s * 1.3, legC, { mat: SURF.fur });
      b.ell(0.065 * s, 0.03 * s, 0.038 * s * wk, ...P(footX + 0.025, footY + 0.025, fz), legC, { mat: SURF.fur }); // pie peludo
      break;
    case 'skin':
      b.limb(P(...knee), P(...ankle), r0 * s * 0.8, r1 * s * 0.75, o.legs ?? legC, { mat: SURF.skin });
      // pies gungan largos
      b.ell(0.075 * s, 0.022 * s, 0.032 * s, ...P(footX + 0.04, footY + 0.02, fz), o.legs ?? legC, { mat: SURF.skin });
      break;
    case 'robe':
      b.limb(P(...knee), P(...ankle), r0 * s, r1 * s, legC, { mat: SURF.fabric });
      b.rbox(0.1 * s, 0.05 * s, 0.045 * s, 0.016 * s, ...P(footX + 0.022, footY + 0.022, fz), boot, { mat: SURF.leather });
      break;
    default:
      b.limb(P(...knee), P(...ankle), r0 * s, r1 * s, legC, { mat: SURF.fabric });
      // bota alta de cuero
      b.limb(P(...lerp(0.45)), P(...lerp(1.0)), r1 * s * 1.25, r1 * s * 1.2, boot, { mat: SURF.leather });
      b.rbox(0.105 * s, 0.05 * s, 0.047 * s, 0.017 * s, ...P(footX + 0.024, footY + 0.022, fz), boot, { mat: SURF.leather });
  }
  void side;
}

// ───────────────────────── torso ─────────────────────────
function torso(b: MB, out: Outfit, P: (x: number, y: number, z: number) => V3, o: HumOpts, c: TorsoCtx) {
  const s = o.scale ?? 1;
  const { hipY, shY, neckY, shZ, k } = c;
  const body = o.body;
  const W = (z: number) => z * k; // anchura
  const accent = o.accent ?? 'shoulder';
  const midY = (hipY + shY) / 2;
  switch (out) {
    case 'armor': {
      const black = BODYSUIT;
      b.ell(0.058 * s, 0.05 * s, W(0.078) * s, ...P(0, hipY + 0.02, 0), black, { mat: SURF.rubber }); // pelvis
      b.ell(0.05 * s, 0.07 * s, W(0.07) * s, ...P(0, midY - 0.01, 0), black, { mat: SURF.rubber }); // abdomen
      // peto y espaldar
      b.rbox(0.115 * s, 0.13 * s, W(0.19) * s, 0.05 * s, ...P(0.002, shY - 0.062, 0), body, { mat: SURF.armor });
      b.rbox(0.03 * s, 0.07 * s, W(0.12) * s, 0.012 * s, ...P(0.055, shY - 0.05, 0), body, { mat: SURF.armor }); // placa pectoral
      b.rbox(0.13 * s, 0.03 * s, W(0.05) * s, 0.01 * s, ...P(0.0, shY - 0.002, 0), body, { mat: SURF.armor }); // hombreras de unión
      // placas abdominales
      for (let i = 0; i < 2; i++) b.rbox(0.03 * s, 0.03 * s, W(0.075) * s, 0.01 * s, ...P(0.03, midY - 0.005 - i * 0.034, 0), body, { mat: SURF.armor });
      // cinturón con cargadores
      b.cyl(W(0.08) * s, W(0.078) * s, 0.026 * s, ...P(0, hipY + 0.04, 0), body, { mat: SURF.armor, seg: 14, sx: 0.78 });
      b.rbox(0.025 * s, 0.03 * s, 0.035 * s, 0.006 * s, ...P(0.058, hipY + 0.04, 0), C.lgray, { mat: SURF.panel, ms: 3 });
      for (const zz of [-1, 1]) {
        b.rbox(0.03 * s, 0.035 * s, 0.03 * s, 0.006 * s, ...P(0.03, hipY + 0.035, zz * W(0.06)), C.black, { mat: SURF.rubber });
      }
      // protector de cadera
      b.rbox(0.03 * s, 0.05 * s, W(0.05) * s, 0.01 * s, ...P(0.045, hipY - 0.004, 0), body, { mat: SURF.armor });
      // botones del pecho
      b.rbox(0.012 * s, 0.022 * s, 0.03 * s, 0.004 * s, ...P(0.07, shY - 0.045, W(0.03)), C.gray, { mat: SURF.panel, ms: 4 });
      if (o.head === 'vader') {
        b.rbox(0.02 * s, 0.05 * s, 0.07 * s, 0.006 * s, ...P(0.07, shY - 0.07, 0), 0x5a5a62, { mat: SURF.panel, ms: 4 });
        for (let i = 0; i < 3; i++) b.box(0.006 * s, 0.008 * s, 0.012 * s, ...P(0.08, shY - 0.06 - i * 0.014, -0.02 + i * 0.02), [C.glowRed, C.glowGreen, C.glowBlue][i], { em: 1.6 });
      }
      break;
    }
    case 'droid': {
      // B1: torso estrecho con mochila
      b.surf(SURF.panel);
      b.cyl(0.012 * s, 0.012 * s, (shY - hipY) * s, ...P(-0.01, midY, 0), body, { ms: 3, seg: 6 }); // columna
      b.rbox(0.05 * s, 0.03 * s, W(0.07) * s, 0.01 * s, ...P(0, hipY + 0.015, 0), body, { ms: 3 }); // pelvis
      b.rbox(0.07 * s, 0.11 * s, W(0.13) * s, 0.018 * s, ...P(0.0, shY - 0.055, 0), body, { ms: 3 }); // pecho
      b.rbox(0.035 * s, 0.13 * s, W(0.1) * s, 0.012 * s, ...P(-0.055, shY - 0.065, 0), body, { ms: 3 }); // mochila
      b.rbox(0.012 * s, 0.06 * s, W(0.06) * s, 0.004 * s, ...P(0.038, shY - 0.05, 0), accent === 'chest' && o.head === 'oom' ? C.team : body, { team: accent === 'chest' && o.head === 'oom' ? 1 : 0, ms: 3 });
      b.surf(null);
      break;
    }
    case 'b2': {
      b.surf(SURF.panel);
      b.ell(0.05 * s, 0.045 * s, W(0.07) * s, ...P(0, hipY + 0.02, 0), body, { ms: 2 });
      b.cyl(0.02 * s, 0.025 * s, 0.1 * s, ...P(0, midY - 0.02, 0), 0x2a2e36, { ms: 2, seg: 8 });
      // pecho enorme
      b.ell(0.105 * s, 0.11 * s, W(0.145) * s, ...P(0.01, shY - 0.04, 0), body, { ms: 1.6, seg: 16 });
      b.rbox(0.02 * s, 0.07 * s, W(0.11) * s, 0.008 * s, ...P(0.1, shY - 0.05, 0), C.team, { team: 1 });
      b.surf(null);
      break;
    }
    case 'heavyDroid': {
      b.surf(SURF.panel);
      b.rbox(0.09 * s, 0.07 * s, W(0.12) * s, 0.02 * s, ...P(0, hipY + 0.02, 0), 0x22232a, { ms: 2 });
      b.rbox(0.12 * s, 0.17 * s, W(0.2) * s, 0.03 * s, ...P(0.0, shY - 0.07, 0), body, { ms: 1.5 });
      b.rbox(0.05 * s, 0.14 * s, W(0.13) * s, 0.015 * s, ...P(-0.08, shY - 0.06, 0), 0x1e1f24, { ms: 2 }); // propulsor
      b.rbox(0.012 * s, 0.05 * s, W(0.05) * s, 0.004 * s, ...P(0.063, shY - 0.06, -W(0.05)), C.team, { team: 1 });
      b.surf(null);
      break;
    }
    case 'fur': {
      b.surf(SURF.fur);
      b.ell(0.07 * s, 0.065 * s, W(0.09) * s, ...P(0, hipY + 0.02, 0), body);
      b.ell(0.085 * s, 0.13 * s, W(0.115) * s, ...P(0.005, midY + 0.03, 0), body, { seg: 14 });
      b.ell(0.07 * s, 0.05 * s, W(0.12) * s, ...P(-0.005, shY - 0.005, 0), body); // hombros
      // mechones
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.cone(0.022 * s, 0.06 * s, ...P(Math.cos(a) * 0.075, hipY - 0.02, Math.sin(a) * W(0.085)), body, { rx: Math.PI, seg: 5 });
      }
      b.surf(null);
      // bandolera en diagonal con cartuchos
      strap(b, P, [[0.05, shY - 0.005, W(0.09)], [0.088, midY + 0.04, 0.0], [0.062, hipY + 0.04, -W(0.085)]], 0.012 * s, LEATHER);
      for (let i = 0; i < 4; i++) b.rbox(0.016 * s, 0.022 * s, 0.022 * s, 0.004 * s, ...P(0.085 + (i === 1 || i === 2 ? 0.008 : 0), shY - 0.04 - i * 0.035, W(0.06) - i * W(0.035)), C.lgray, { mat: SURF.panel, ms: 4 });
      if (accent === 'sash') b.cyl(W(0.088) * s, W(0.09) * s, 0.028 * s, ...P(0, hipY + 0.045, 0), C.team, { team: 1, mat: SURF.leather, sx: 0.8, seg: 14 });
      break;
    }
    case 'skin': {
      // gungan: chaleco de cuero sobre piel
      const sk = o.legs ?? c.skin;
      b.ell(0.052 * s, 0.05 * s, W(0.07) * s, ...P(0, hipY + 0.02, 0), body, { mat: SURF.leather });
      b.ell(0.052 * s, 0.09 * s, W(0.072) * s, ...P(0.0, midY + 0.02, 0), sk, { mat: SURF.skin });
      b.ell(0.06 * s, 0.075 * s, W(0.088) * s, ...P(-0.004, shY - 0.05, 0), body, { mat: SURF.leather, seg: 14 });
      b.cyl(W(0.07) * s, W(0.072) * s, 0.03 * s, ...P(0, hipY + 0.045, 0), accent === 'sash' ? C.team : LEATHER, { team: accent === 'sash' ? 1 : 0, mat: SURF.leather, sx: 0.78, seg: 12 });
      if (o.head === 'nass') b.ell(0.1 * s, 0.11 * s, W(0.1) * s, ...P(0.025, midY + 0.02, 0), o.robe ?? body, { mat: SURF.fabric, seg: 16 });
      break;
    }
    case 'robe': {
      const tunic = o.body;
      const robe = o.robe ?? o.body;
      b.ell(0.056 * s, 0.05 * s, W(0.075) * s, ...P(0, hipY + 0.02, 0), tunic, { mat: SURF.fabric });
      b.ell(0.055 * s, 0.075 * s, W(0.074) * s, ...P(0.0, midY, 0), tunic, { mat: SURF.fabric });
      b.ell(0.064 * s, 0.075 * s, W(0.096) * s, ...P(0.0, shY - 0.055, 0), tunic, { mat: SURF.fabric, seg: 14 });
      // túnica cruzada
      b.rbox(0.012 * s, 0.11 * s, 0.02 * s, 0.004 * s, ...P(0.06, shY - 0.07, 0.012), tunic, { mat: SURF.fabric, rx: 0.35 });
      // fajín (obi) y cinturón
      b.cyl(W(0.077) * s, W(0.077) * s, 0.06 * s, ...P(0, hipY + 0.06, 0), accent === 'sash' ? C.team : robe, { team: accent === 'sash' ? 0.8 : 0, mat: SURF.fabric, sx: 0.78, seg: 14 });
      b.cyl(W(0.08) * s, W(0.08) * s, 0.014 * s, ...P(0, hipY + 0.06, 0), LEATHER, { mat: SURF.leather, sx: 0.8, seg: 14 });
      // falda de la túnica hasta las rodillas
      b.lathe([[W(0.07), 0.0], [W(0.085), -0.08 * s], [W(0.1), -0.18 * s], [W(0.112), -0.25 * s]].map(([r, y]) => [r * s, y]) as [number, number][], ...P(0, hipY + 0.045, 0), robe, { mat: SURF.fabric, sx: 0.85, seg: 14 });
      // manto exterior (hombros)
      if (o.cape !== undefined) b.ell(0.07 * s, 0.05 * s, W(0.115) * s, ...P(-0.01, shY - 0.012, 0), o.cape, { mat: SURF.fabric });
      break;
    }
    default: {
      // uniforme: camisa, chaleco y cinturón
      const shirt = o.arms ?? o.body;
      const vest = o.vest ?? o.body;
      b.ell(0.056 * s, 0.05 * s, W(0.075) * s, ...P(0, hipY + 0.02, 0), o.legs ?? o.body, { mat: SURF.fabric });
      b.ell(0.052 * s, 0.075 * s, W(0.072) * s, ...P(0.0, midY, 0), shirt, { mat: SURF.fabric });
      b.ell(0.062 * s, 0.075 * s, W(0.092) * s, ...P(0.0, shY - 0.055, 0), shirt, { mat: SURF.fabric, seg: 14 });
      // chaleco táctico
      b.rbox(0.105 * s, 0.13 * s, W(0.165) * s, 0.03 * s, ...P(0.002, shY - 0.075, 0), vest, { mat: o.head === 'hothHelmet' ? SURF.fabric : SURF.fabric, sx: 1 });
      // bolsillos del chaleco
      for (const zz of [-1, 1]) b.rbox(0.02 * s, 0.035 * s, 0.04 * s, 0.006 * s, ...P(0.055, shY - 0.1, zz * W(0.04)), vest, { mat: SURF.fabric });
      b.cyl(W(0.078) * s, W(0.078) * s, 0.02 * s, ...P(0, hipY + 0.04, 0), accent === 'belt' ? C.team : LEATHER, { team: accent === 'belt' ? 1 : 0, mat: SURF.leather, sx: 0.78, seg: 14 });
      b.rbox(0.012 * s, 0.022 * s, 0.03 * s, 0.004 * s, ...P(0.06, hipY + 0.04, 0), C.lgray, { mat: SURF.panel, ms: 4 });
      if (accent === 'sash') strap(b, P, [[0.045, shY - 0.01, W(0.085)], [0.072, midY + 0.035, 0.0], [0.05, hipY + 0.04, -W(0.08)]], 0.012 * s, C.team, 1);
      if (accent === 'chest') b.rbox(0.01 * s, 0.03 * s, 0.05 * s, 0.004 * s, ...P(0.058, shY - 0.05, W(0.04)), C.team, { team: 1 });
      if (accent === 'stripe') b.cyl(W(0.094) * s, W(0.094) * s, 0.018 * s, ...P(0, shY - 0.03, 0), C.team, { team: 1, mat: SURF.fabric, sx: 0.7, seg: 14 });
      if (o.skirt) b.lathe([[W(0.075) * s, 0], [W(0.1) * s, -0.13 * s]], ...P(0, hipY + 0.04, 0), o.skirt, { mat: SURF.leather, sx: 0.85, seg: 12 });
    }
  }
  // cuello
  if (out !== 'b2') b.limb(P(0, shY - 0.02, 0), P(0.004, neckY + 0.02, 0), (out === 'droid' ? 0.01 : out === 'fur' ? 0.045 : 0.026) * s, (out === 'droid' ? 0.009 : out === 'fur' ? 0.04 : 0.024) * s, out === 'armor' || out === 'heavyDroid' ? BODYSUIT : out === 'droid' || out === 'fur' ? o.body : c.skin, { mat: out === 'armor' ? SURF.rubber : out === 'droid' ? SURF.panel : out === 'fur' ? SURF.fur : SURF.skin, seg: 8 });
  // mochila
  if (o.backpack) {
    b.rbox(0.07 * s, 0.15 * s, W(0.13) * s, 0.022 * s, ...P(-0.085, shY - 0.08, 0), o.backpack, { mat: SURF.fabric });
    b.rbox(0.04 * s, 0.05 * s, W(0.11) * s, 0.01 * s, ...P(-0.1, shY - 0.17, 0), o.backpack, { mat: SURF.fabric });
    b.cyl(0.006 * s, 0.006 * s, 0.14 * s, ...P(-0.1, shY + 0.03, -W(0.04)), C.dgray, { mat: SURF.panel, seg: 5 });
  }
  if (o.robe !== undefined && out !== 'robe' && out !== 'skin') {
    // túnica sobre otras vestimentas (p. ej. Inquisidor con faldón)
    b.lathe([[W(0.08) * s, 0], [W(0.11) * s, -0.2 * s], [W(0.13) * s, -0.36 * s]], ...P(0, hipY + 0.05, 0), o.robe, { mat: SURF.fabric, sx: 0.85, seg: 14 });
  }
}

/** Correa o fajín que sigue una polilínea sobre el torso */
function strap(b: MB, P: (x: number, y: number, z: number) => V3, pts: V3[], r: number, color: number, team = 0) {
  for (let i = 0; i < pts.length - 1; i++) b.limb(P(...pts[i]), P(...pts[i + 1]), r, r, color, { mat: team ? SURF.fabric : SURF.leather, team, seg: 6, sx: 1 });
}

// ───────────────────────── cabeza ─────────────────────────
function head(b: MB, o: HumOpts, P: (x: number, y: number, z: number) => V3, hy: number, neckY: number, out: Outfit, skin: number) {
  const s = o.scale ?? 1;
  const hc = o.headColor ?? o.body;
  const S = (r: number) => r * s;
  b.part('body');
  // cara humana genérica
  const face = (col: number, hair: number | null, opts: { beard?: boolean } = {}) => {
    b.ell(S(0.05), S(0.06), S(0.046), ...P(0.004, hy, 0), col, { mat: SURF.skin, seg: 14 });
    b.ell(S(0.02), S(0.022), S(0.03), ...P(0.03, hy - 0.035, 0), col, { mat: SURF.skin }); // mandíbula
    b.ell(S(0.008), S(0.012), S(0.008), ...P(0.054, hy - 0.004, 0), col, { mat: SURF.skin }); // nariz
    for (const zz of [-1, 1]) {
      b.sphere(S(0.0065), ...P(0.046, hy + 0.012, zz * 0.018), 0x1a140f, { seg: 6 }); // ojos
      b.ell(S(0.008), S(0.014), S(0.006), ...P(0.0, hy + 0.002, zz * 0.047), col, { mat: SURF.skin }); // orejas
      b.rbox(S(0.006), S(0.004), S(0.016), S(0.0015), ...P(0.05, hy + 0.024, zz * 0.018), hair ?? 0x3a2a1a); // cejas
    }
    if (hair !== null) {
      b.ell(S(0.054), S(0.04), S(0.05), ...P(-0.006, hy + 0.024, 0), hair, { mat: SURF.fur, ms: 2 });
      b.ell(S(0.03), S(0.05), S(0.045), ...P(-0.03, hy - 0.002, 0), hair, { mat: SURF.fur, ms: 2 });
    }
    if (opts.beard) b.ell(S(0.03), S(0.03), S(0.04), ...P(0.03, hy - 0.04, 0), hair ?? 0x5a4a3a, { mat: SURF.fur, ms: 2 });
  };
  // casco tipo soldado de asalto / clon (perfil por revolución)
  const dome = (col: number, h = 1, w = 1) => {
    b.lathe(
      [[0.045, -0.06 * h], [0.058, -0.04 * h], [0.066, -0.01 * h], [0.067, 0.015 * h], [0.06, 0.042 * h], [0.042, 0.064 * h], [0.02, 0.075 * h], [0.0, 0.078 * h]].map(([r, y]) => [S(r), S(y)]) as [number, number][],
      ...P(0.0, hy, 0), col, { mat: SURF.armor, seg: 16, sx: 1.06, sz: 0.97 * w },
    );
  };
  switch (o.head) {
    case 'storm': {
      // casco de soldado de asalto: cúpula con faldón ancho y cara en trapecio invertido
      b.lathe(
        [[0.07, -0.072], [0.071, -0.058], [0.066, -0.04], [0.064, -0.015], [0.066, 0.012], [0.062, 0.038], [0.048, 0.06], [0.026, 0.073], [0.0, 0.077]].map(([r, y]) => [S(r), S(y)]) as [number, number][],
        ...P(-0.004, hy, 0), C.white, { mat: SURF.armor, seg: 18, sx: 1.04, sz: 0.98 },
      );
      // frontal plano de la cara
      b.rbox(S(0.03), S(0.07), S(0.078), S(0.014), ...P(0.05, hy - 0.022, 0), C.white, { mat: SURF.armor });
      // ceja gris
      b.rbox(S(0.014), S(0.01), S(0.07), S(0.004), ...P(0.066, hy + 0.026, 0), 0x8a8e96, { mat: SURF.panel, ms: 4 });
      // lentes negras en lágrima, inclinadas
      for (const zz of [-1, 1]) b.ell(S(0.008), S(0.02), S(0.011), ...P(0.066, hy + 0.004, zz * 0.022), VISOR, { mat: SURF.glass, rx: zz * -0.6, seg: 10 });
      // "ceño" de la boca: rejilla en V invertida
      b.rbox(S(0.01), S(0.026), S(0.05), S(0.006), ...P(0.066, hy - 0.04, 0), 0x2a2c32, { mat: SURF.grate, ms: 1.5 });
      for (const zz of [-1, 1]) {
        b.rbox(S(0.012), S(0.008), S(0.026), S(0.003), ...P(0.068, hy - 0.022, zz * 0.015), 0x5a5e66, { mat: SURF.panel, rx: zz * 0.45 });
        b.cyl(S(0.007), S(0.006), S(0.022), ...P(0.062, hy - 0.058, zz * 0.03), 0x9a9ea6, { rx: Math.PI / 2 + zz * 0.2, seg: 8, mat: SURF.panel }); // tubos
        b.cyl(S(0.014), S(0.014), S(0.006), ...P(-0.004, hy - 0.012, zz * 0.07), 0x9a9ea6, { rx: Math.PI / 2, seg: 12, mat: SURF.panel }); // "orejas"
        b.rbox(S(0.07), S(0.009), S(0.004), S(0.002), ...P(-0.005, hy + 0.004, zz * 0.068), C.team, { team: 0.85 }); // franja lateral
      }
      break;
    }
    case 'scout': {
      dome(C.white, 0.9);
      b.ell(S(0.03), S(0.03), S(0.07), ...P(0.05, hy - 0.025, 0), C.white, { mat: SURF.armor });
      b.rbox(S(0.012), S(0.016), S(0.08), S(0.004), ...P(0.066, hy + 0.004, 0), VISOR, { mat: SURF.glass });
      b.ell(S(0.05), S(0.008), S(0.07), ...P(0.0, hy - 0.01, 0), C.white, { mat: SURF.armor }); // ala del casco
      break;
    }
    case 'clone':
    case 'clone2':
    case 'arc':
    case 'aa': {
      const col = o.head === 'aa' ? o.headColor ?? C.white : C.white;
      dome(col, 1.06);
      b.ell(S(0.032), S(0.044), S(0.052), ...P(0.04, hy - 0.026, 0), col, { mat: SURF.armor }); // mandíbula
      // visor en T
      b.rbox(S(0.012), S(0.016), S(0.078), S(0.004), ...P(0.066, hy + 0.01, 0), VISOR, { mat: SURF.glass });
      b.rbox(S(0.012), S(0.045), S(0.018), S(0.004), ...P(0.068, hy - 0.016, 0), VISOR, { mat: SURF.glass });
      // cresta central y marcas de equipo
      b.rbox(S(0.11), S(0.008), S(0.012), S(0.003), ...P(-0.002, hy + 0.078, 0), col, { mat: SURF.armor });
      for (const zz of [-1, 1]) b.ell(S(0.04), S(0.03), S(0.008), ...P(0.005, hy + 0.035, zz * 0.06), C.team, { team: 1, ry: 0, rx: zz * 0.6 });
      b.rbox(S(0.05), S(0.012), S(0.02), S(0.004), ...P(0.04, hy + 0.055, 0), C.team, { team: 1, rz: -0.35 });
      if (o.head === 'clone2' || o.head === 'arc') {
        b.cyl(S(0.004), S(0.004), S(0.07), ...P(0.0, hy + 0.07, -0.06), C.dgray, { seg: 6, mat: SURF.panel }); // telémetro
        b.rbox(S(0.01), S(0.03), S(0.012), S(0.003), ...P(0.03, hy + 0.04, -0.07), C.dgray, { rz: 0.4 });
      }
      if (o.head === 'arc') {
        // kama (faldón) y hombrera
        b.lathe([[0.085, 0], [0.1, -0.08], [0.11, -0.17]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.005, 0.47, 0), C.team, { team: 1, mat: SURF.fabric, sx: 0.85, seg: 14 });
      }
      if (o.head === 'aa') b.rbox(S(0.012), S(0.05), S(0.012), S(0.004), ...P(-0.01, hy + 0.09, 0), C.team, { team: 1 });
      break;
    }
    case 'rebelHelmet': {
      face(skin, null);
      // casco con visera (Endor / Tantive IV)
      b.lathe([[0.062, -0.005], [0.064, 0.02], [0.056, 0.045], [0.035, 0.062], [0.0, 0.066]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.002, hy, 0), o.headColor ?? 0x6a6448, { mat: SURF.fabric, seg: 16, sx: 1.08 });
      b.ell(S(0.072), S(0.006), S(0.07), ...P(0.012, hy - 0.004, 0), o.headColor ?? 0x6a6448, { mat: SURF.fabric }); // ala
      b.rbox(S(0.016), S(0.014), S(0.07), S(0.004), ...P(0.045, hy + 0.03, 0), 0x2a2a2a, { mat: SURF.glass }); // gafas
      b.rbox(S(0.004), S(0.012), S(0.11), S(0.002), ...P(-0.01, hy - 0.05, 0), LEATHER, { mat: SURF.leather, rz: 0.2 }); // barboquejo
      break;
    }
    case 'hothHelmet': {
      face(skin, null);
      b.lathe([[0.063, -0.01], [0.066, 0.02], [0.058, 0.045], [0.036, 0.064], [0.0, 0.07]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.002, hy, 0), 0xd8d8d0, { mat: SURF.armor, seg: 16, sx: 1.06 });
      b.rbox(S(0.02), S(0.024), S(0.08), S(0.006), ...P(0.048, hy + 0.008, 0), 0x2a2420, { mat: SURF.glass }); // gafas de nieve
      b.ell(S(0.035), S(0.03), S(0.05), ...P(0.03, hy - 0.035, 0), 0xb8b0a0, { mat: SURF.fabric }); // braga
      break;
    }
    case 'rebel':
      face(skin, o.hair ?? 0x4a3420);
      break;
    case 'engineer':
      face(skin, null);
      b.lathe([[0.062, 0.0], [0.063, 0.02], [0.055, 0.045], [0.0, 0.058]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.004, hy + 0.01, 0), o.headColor ?? 0x5a5e66, { mat: SURF.fabric, seg: 14, sx: 1.05 });
      b.ell(S(0.04), S(0.006), S(0.05), ...P(0.05, hy + 0.012, 0), o.headColor ?? 0x5a5e66, { mat: SURF.fabric });
      b.rbox(S(0.012), S(0.014), S(0.06), S(0.004), ...P(0.05, hy + 0.035, 0), 0x2a3a44, { mat: SURF.glass }); // gafas en la frente
      break;
    case 'pilot':
      face(skin, null);
      b.lathe([[0.065, -0.02], [0.068, 0.02], [0.058, 0.05], [0.0, 0.072]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.004, hy, 0), C.orange, { mat: SURF.armor, seg: 16 });
      b.rbox(S(0.016), S(0.03), S(0.08), S(0.006), ...P(0.05, hy + 0.01, 0), C.glass, { mat: SURF.glass });
      b.rbox(S(0.12), S(0.012), S(0.016), S(0.004), ...P(0.0, hy + 0.07, 0), C.team, { team: 1 });
      break;
    case 'naboo':
      face(skin, 0x3a2a1a);
      // gorra de la guardia de seguridad
      b.lathe([[0.058, 0], [0.062, 0.025], [0.066, 0.05], [0.0, 0.052]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.004, hy + 0.02, 0), 0x2a2018, { mat: SURF.leather, seg: 16, sx: 1.05 });
      b.ell(S(0.035), S(0.006), S(0.05), ...P(0.055, hy + 0.025, 0), 0x1a140c, { mat: SURF.leather });
      b.rbox(S(0.004), S(0.012), S(0.02), S(0.002), ...P(0.066, hy + 0.05, 0), C.gold, { mat: SURF.panel, ms: 4 });
      break;
    case 'b1':
    case 'oom': {
      // cabeza alargada de droide de combate
      b.surf(SURF.panel);
      b.ell(S(0.07), S(0.028), S(0.03), ...P(0.03, hy + 0.0, 0), hc, { ms: 3, rz: -0.38, seg: 12 });
      b.ell(S(0.04), S(0.034), S(0.034), ...P(-0.012, hy + 0.02, 0), hc, { ms: 3, seg: 12 });
      for (const zz of [-1, 1]) b.cyl(S(0.012), S(0.012), S(0.006), ...P(0.012, hy + 0.022, zz * 0.032), 0x2a2620, { rx: Math.PI / 2, seg: 10 }); // ojos
      b.cyl(S(0.007), S(0.007), S(0.06), ...P(-0.01, hy - 0.04, 0), hc, { seg: 6, ms: 3 }); // cuello largo
      if (o.head === 'oom') b.ell(S(0.05), S(0.02), S(0.031), ...P(0.02, hy + 0.012, 0), C.team, { team: 1, rz: -0.38 });
      b.surf(null);
      break;
    }
    case 'b2':
      b.surf(SURF.panel);
      b.rbox(S(0.07), S(0.035), S(0.06), S(0.012), ...P(0.05, hy - 0.04, 0), hc, { ms: 2 });
      b.rbox(S(0.01), S(0.012), S(0.05), S(0.003), ...P(0.086, hy - 0.04, 0), C.glowOrange, { em: 1.4 });
      b.surf(null);
      break;
    case 'droidWorker':
      b.surf(SURF.panel);
      b.cyl(S(0.05), S(0.055), S(0.07), ...P(0, hy, 0), hc, { seg: 14, ms: 3 });
      b.ell(S(0.052), S(0.02), S(0.052), ...P(0, hy + 0.035, 0), hc, { ms: 3 });
      b.cyl(S(0.022), S(0.022), S(0.016), ...P(0.05, hy + 0.005, 0), 0x1a1c20, { rz: Math.PI / 2, seg: 12 });
      b.sphere(S(0.014), ...P(0.058, hy + 0.005, 0), C.glowCyan, { em: 1.4, seg: 8 });
      b.cyl(S(0.003), S(0.003), S(0.08), ...P(-0.02, hy + 0.08, 0.02), C.dgray, { seg: 5 });
      b.surf(null);
      break;
    case 'darktrooper':
      b.surf(SURF.panel);
      b.rbox(S(0.1), S(0.09), S(0.09), S(0.02), ...P(0.01, hy, 0), 0x1c1d22, { ms: 2 });
      b.rbox(S(0.04), S(0.05), S(0.08), S(0.012), ...P(0.05, hy - 0.025, 0), 0x2a2b30, { ms: 2 });
      b.rbox(S(0.01), S(0.012), S(0.07), S(0.003), ...P(0.062, hy + 0.012, 0), C.glowRed, { em: 1.8 });
      b.rbox(S(0.03), S(0.07), S(0.012), S(0.004), ...P(-0.02, hy + 0.06, -0.035), C.team, { team: 1 });
      b.surf(null);
      break;
    case 'magna':
      b.surf(SURF.panel);
      b.ell(S(0.05), S(0.058), S(0.045), ...P(0.008, hy, 0), 0x2a2a30, { ms: 3, seg: 12 });
      for (const zz of [-1, 1]) b.sphere(S(0.012), ...P(0.05, hy + 0.01, zz * 0.02), C.glowRed, { em: 1.8, seg: 8 });
      b.surf(null);
      // capucha / cuello de tela
      b.lathe([[0.07, -0.06], [0.06, -0.01], [0.045, 0.02]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.01, hy, 0), 0x5a2a20, { mat: SURF.fabric, seg: 14 });
      break;
    case 'vader': {
      b.lathe(
        [[0.08, -0.07], [0.074, -0.045], [0.068, -0.01], [0.068, 0.02], [0.06, 0.045], [0.04, 0.066], [0.0, 0.074]].map(([r, y]) => [S(r), S(y)]) as [number, number][],
        ...P(-0.006, hy, 0), 0x0c0c0e, { mat: SURF.armor, seg: 18, sx: 1.06 },
      );
      b.ell(S(0.032), S(0.045), S(0.05), ...P(0.045, hy - 0.02, 0), 0x121214, { mat: SURF.armor });
      for (const zz of [-1, 1]) b.ell(S(0.01), S(0.016), S(0.02), ...P(0.066, hy + 0.01, zz * 0.022), 0x1e1418, { mat: SURF.glass, rx: zz * 0.4 });
      b.cone(S(0.02), S(0.04), ...P(0.072, hy - 0.04, 0), 0x6a6e76, { rx: Math.PI, seg: 3, mat: SURF.grate });
      break;
    }
    case 'yoda':
      b.ell(S(0.07), S(0.06), S(0.07), ...P(0.004, hy - 0.01, 0), 0x8aa86a, { mat: SURF.skin, seg: 14 });
      for (const zz of [-1, 1]) {
        b.ell(S(0.018), S(0.02), S(0.075), ...P(-0.01, hy + 0.0, zz * 0.1), 0x8aa86a, { mat: SURF.skin, rx: zz * -0.25 }); // orejas
        b.sphere(S(0.009), ...P(0.06, hy + 0.0, zz * 0.022), 0x2a2010, { seg: 6 });
      }
      b.ell(S(0.05), S(0.02), S(0.055), ...P(-0.01, hy + 0.04, 0), 0xd8d8d0, { mat: SURF.fur, ms: 2 }); // pelo
      break;
    case 'hood':
      face(skin, o.hair ?? 0x6a5a4a, { beard: true });
      b.lathe([[0.075, -0.07], [0.072, -0.02], [0.07, 0.02], [0.055, 0.06], [0.0, 0.08]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.02, hy, 0), o.robe ?? 0x6a4a30, { mat: SURF.fabric, seg: 16, sx: 1.05 });
      break;
    case 'bare':
      face(skin, o.hair ?? (skin === SKIN ? 0x4a3420 : null), { beard: o.hair !== undefined && o.hair !== 0x1a1410 });
      break;
    case 'leia':
      face(skin, 0x3a2414);
      for (const zz of [-1, 1]) b.ell(S(0.018), S(0.034), S(0.034), ...P(-0.012, hy + 0.0, zz * 0.058), 0x3a2414, { mat: SURF.fur, ms: 2 }); // moños
      break;
    case 'padme':
      face(0xf0e2da, 0x1a1410);
      b.ell(S(0.07), S(0.1), S(0.1), ...P(-0.02, hy + 0.08, 0), 0x1a1a1a, { mat: SURF.fabric, seg: 14 }); // tocado
      b.rbox(S(0.008), S(0.008), S(0.008), S(0.002), ...P(0.05, hy - 0.04, 0), C.glowRed, { em: 0.8 });
      for (const zz of [-1, 1]) b.sphere(S(0.012), ...P(0.0, hy + 0.04, zz * 0.09), C.gold, { mat: SURF.panel, seg: 8 });
      break;
    case 'mando':
      dome(o.headColor ?? 0x4a6a4a, 1.04);
      b.ell(S(0.03), S(0.042), S(0.05), ...P(0.042, hy - 0.024, 0), o.headColor ?? 0x4a6a4a, { mat: SURF.armor });
      b.rbox(S(0.012), S(0.016), S(0.08), S(0.004), ...P(0.066, hy + 0.01, 0), VISOR, { mat: SURF.glass });
      b.rbox(S(0.012), S(0.05), S(0.018), S(0.004), ...P(0.068, hy - 0.018, 0), VISOR, { mat: SURF.glass });
      b.cyl(S(0.004), S(0.004), S(0.09), ...P(0.0, hy + 0.06, -0.068), C.dgray, { seg: 6 });
      // mochila cohete
      b.rbox(S(0.06), S(0.16), S(0.13), S(0.02), ...P(-0.1, neckY - 0.12, 0), 0x8a8e88, { mat: SURF.panel, ms: 2 });
      for (const zz of [-1, 1]) b.cyl(S(0.022), S(0.018), S(0.05), ...P(-0.1, neckY - 0.225, zz * 0.04), 0x3a3a3a, { mat: SURF.panel, seg: 10 });
      b.cone(S(0.025), S(0.07), ...P(-0.1, neckY - 0.01, 0), 0x7a5a3a, { mat: SURF.panel, seg: 10 });
      break;
    case 'grievous':
      b.surf(SURF.armor);
      b.ell(S(0.07), S(0.04), S(0.045), ...P(0.03, hy + 0.01, 0), 0xe8e0c8, { rz: -0.25, seg: 12 });
      b.ell(S(0.035), S(0.035), S(0.04), ...P(-0.01, hy + 0.025, 0), 0xe8e0c8, { seg: 10 });
      for (const zz of [-1, 1]) b.sphere(S(0.012), ...P(0.07, hy + 0.012, zz * 0.022), 0xffd040, { em: 1.4, seg: 8 });
      b.surf(null);
      break;
    case 'maul':
    case 'zabrak':
      b.ell(S(0.05), S(0.06), S(0.046), ...P(0.004, hy, 0), 0xb02020, { mat: SURF.skin, seg: 14 });
      b.ell(S(0.02), S(0.022), S(0.03), ...P(0.03, hy - 0.035, 0), 0x1a1214, { mat: SURF.skin });
      for (const zz of [-1, 1]) {
        b.sphere(S(0.007), ...P(0.046, hy + 0.012, zz * 0.018), 0xffc030, { seg: 6, em: 0.6 });
        b.rbox(S(0.004), S(0.03), S(0.012), S(0.002), ...P(0.05, hy + 0.0, zz * 0.022), 0x1a1214);
      }
      for (let i = 0; i < 7; i++) b.cone(S(0.007), S(0.025), ...P(-0.02 + Math.cos(i * 0.9) * 0.025, hy + 0.06, Math.sin(i * 1.7) * 0.035), 0xe8d8b0, { seg: 5 });
      break;
    case 'gungan':
    case 'jarjar':
    case 'nass': {
      const big = o.head === 'nass' ? 1.4 : o.head === 'jarjar' ? 1.1 : 1;
      const gc = o.head === 'jarjar' ? 0xd08a40 : hc;
      b.surf(SURF.skin);
      b.ell(S(0.055 * big), S(0.05 * big), S(0.045 * big), ...P(0.0, hy + 0.01, 0), gc, { seg: 14 });
      b.ell(S(0.06 * big), S(0.028 * big), S(0.03 * big), ...P(0.055 * big, hy - 0.005, 0), gc, { rz: -0.15 }); // pico
      for (const zz of [-1, 1]) {
        b.limb(P(0.0, hy + 0.04 * big, zz * 0.02), P(0.012, hy + 0.075 * big, zz * 0.028), S(0.009), S(0.008), gc, { seg: 6 }); // pedúnculos oculares
        b.sphere(S(0.014), ...P(0.014, hy + 0.08 * big, zz * 0.03), 0xf0d040, { seg: 8 });
        b.sphere(S(0.006), ...P(0.026, hy + 0.082 * big, zz * 0.03), 0x1a1a1a, { seg: 5 });
        // orejas largas colgantes (haillu)
        b.ell(S(0.025), S(o.head === 'jarjar' ? 0.17 : 0.13), S(0.014), ...P(-0.045, hy - (o.head === 'jarjar' ? 0.11 : 0.08), zz * 0.04), gc, { rz: 0.15, rx: zz * -0.1 });
      }
      b.surf(null);
      if (o.head === 'gungan') {
        // casco de guerrero gungan
        b.lathe([[0.058, 0], [0.058, 0.02], [0.045, 0.045], [0.0, 0.052]].map(([r, y]) => [S(r), S(y)]) as [number, number][], ...P(-0.005, hy + 0.015, 0), 0x6a4a2a, { mat: SURF.leather, seg: 14 });
      }
      if (o.head === 'nass') b.cyl(S(0.08), S(0.085), S(0.04), ...P(-0.01, hy + 0.09, 0), 0x4a2a5a, { mat: SURF.fabric, seg: 14 });
      break;
    }
    case 'wookiee': {
      b.surf(SURF.fur);
      b.ell(S(0.058), S(0.07), S(0.054), ...P(0.004, hy + 0.005, 0), hc, { seg: 14 });
      b.ell(S(0.03), S(0.03), S(0.036), ...P(0.045, hy - 0.025, 0), 0x3a2414, { seg: 10 }); // hocico
      b.ell(S(0.04), S(0.03), S(0.06), ...P(-0.02, hy - 0.05, 0), hc, { seg: 10 }); // melena
      b.surf(null);
      b.ell(S(0.012), S(0.008), S(0.014), ...P(0.072, hy - 0.016, 0), 0x0c0a08, { mat: SURF.skin }); // nariz
      for (const zz of [-1, 1]) b.sphere(S(0.007), ...P(0.05, hy + 0.018, zz * 0.02), 0x0c0a08, { seg: 6 });
      break;
    }
    case 'tusken':
      b.ell(S(0.055), S(0.064), S(0.05), ...P(0.004, hy, 0), 0xc8b898, { mat: SURF.fabric, seg: 14 });
      for (const zz of [-1, 1]) b.cyl(S(0.012), S(0.012), S(0.016), ...P(0.05, hy + 0.012, zz * 0.02), 0x1a1a1a, { rz: Math.PI / 2, seg: 8, mat: SURF.panel });
      b.cyl(S(0.01), S(0.014), S(0.03), ...P(0.05, hy - 0.03, 0), 0x6a6a6a, { rz: Math.PI / 2, seg: 8, mat: SURF.panel });
      break;
  }
  void out;
}

// ───────────────────────── brazos ─────────────────────────
interface ArmCtx {
  shY: number;
  shZ: number;
  wk: number;
  thin: boolean;
  armC: number;
  skin: number;
  seatDrop: number;
}

/** Poses de brazos (en unidades antes de escalar): codo y mano de cada lado */
interface Pose {
  eR: V3;
  hR: V3;
  eL: V3;
  hL: V3;
  /** el brazo izquierdo acompaña al derecho (arma a dos manos) */
  twoHand: boolean;
}

function poseFor(w: WeaponKind, shY: number, shZ: number): Pose {
  const y = shY - 0.675;
  const z = shZ - 0.112;
  const p = (x: number, yy: number, zz: number, side: number): V3 => [x, yy + y, side * (Math.abs(zz) + z)];
  const relaxed = { eL: p(-0.03, 0.53, 0.13, 1), hL: p(0.0, 0.41, 0.125, 1) };
  switch (w) {
    case 'rifle':
    case 'grenade':
    case 'bowcaster':
    case 'sniper':
      return { eR: p(-0.045, 0.55, 0.135, -1), hR: p(0.065, 0.525, 0.065, -1), eL: p(0.07, 0.545, 0.1, 1), hL: p(0.185, 0.565, 0.025, -1), twoHand: true };
    case 'heavy':
      return { eR: p(-0.04, 0.54, 0.14, -1), hR: p(0.04, 0.495, 0.085, -1), eL: p(0.06, 0.52, 0.11, 1), hL: p(0.17, 0.5, 0.03, -1), twoHand: true };
    case 'launcher':
      return { eR: p(-0.03, 0.56, 0.16, -1), hR: p(0.08, 0.655, 0.11, -1), eL: p(0.08, 0.57, 0.08, 1), hL: p(0.17, 0.665, 0.07, -1), twoHand: true };
    case 'staff':
    case 'electro':
      return { eR: p(-0.02, 0.53, 0.14, -1), hR: p(0.07, 0.5, 0.08, -1), eL: p(0.06, 0.57, 0.12, 1), hL: p(0.11, 0.62, 0.06, 1), twoHand: false };
    case 'dualPistol':
      return { eR: p(0.0, 0.54, 0.14, -1), hR: p(0.11, 0.53, 0.1, -1), eL: p(0.0, 0.54, 0.14, 1), hL: p(0.11, 0.53, 0.1, 1), twoHand: true };
    case 'wristBlasters':
      return { eR: p(0.0, 0.56, 0.17, -1), hR: p(0.13, 0.52, 0.15, -1), eL: p(0.0, 0.56, 0.17, 1), hL: p(0.13, 0.52, 0.15, 1), twoHand: true };
    case 'atlatl':
      return { eR: p(-0.035, 0.73, 0.15, -1), hR: p(0.02, 0.83, 0.13, -1), eL: p(0.03, 0.55, 0.15, 1), hL: p(0.11, 0.56, 0.11, 1), twoHand: false };
    case 'saber':
    case 'doubleSaber':
      return { eR: p(0.0, 0.53, 0.135, -1), hR: p(0.1, 0.49, 0.075, -1), ...relaxed, twoHand: false };
    case 'pistol':
      return { eR: p(-0.02, 0.53, 0.135, -1), hR: p(0.085, 0.47, 0.115, -1), ...relaxed, twoHand: false };
    case 'tool':
      return { eR: p(-0.015, 0.53, 0.135, -1), hR: p(0.08, 0.46, 0.115, -1), ...relaxed, twoHand: false };
    case 'cane':
      return { eR: p(0.0, 0.53, 0.14, -1), hR: p(0.09, 0.45, 0.12, -1), ...relaxed, twoHand: false };
    default:
      return { eR: p(-0.03, 0.53, 0.13, -1), hR: p(0.0, 0.41, 0.125, -1), ...relaxed, twoHand: false };
  }
}

function arms(b: MB, o: HumOpts, P: (x: number, y: number, z: number) => V3, out: Outfit, c: ArmCtx) {
  const s = o.scale ?? 1;
  const { shY, shZ, wk, thin } = c;
  const pose = poseFor(o.weapon, shY, shZ);
  const armKindR = pose.twoHand ? 'aim' : 'armR';
  const armKindL = pose.twoHand ? 'aim' : o.weapon === 'atlatl' ? 'static' : 'armL';
  for (const side of [-1, 1]) {
    const R = side < 0;
    const sh: V3 = [-0.005, shY, side * shZ];
    const el = R ? pose.eR : pose.eL;
    const hd = R ? pose.hR : pose.hL;
    b.part(R ? 'armR' : 'armL', R ? armKindR : armKindL, P(...sh));
    arm(b, o, P, out, sh, el, hd, c, side);
    if (out !== 'droid' && out !== 'b2' && out !== 'heavyDroid' && (o.accent === 'shoulder' || o.accent === 'pauldron' || o.accent === 'stripe')) {
      if (o.accent !== 'pauldron' || side > 0) {
        // hombrera de color de equipo
        b.ell(0.04 * s * wk, 0.022 * s, 0.042 * s * wk, ...P(sh[0], sh[1] + 0.012, sh[2] + side * 0.012), C.team, { team: 1, mat: out === 'armor' ? SURF.armor : SURF.leather, rx: side * 0.35, seg: 12 });
      }
    }
  }
  weapon(b, o, P, pose, out);
  b.part('body');
  void thin;
}

function arm(b: MB, o: HumOpts, P: (x: number, y: number, z: number) => V3, out: Outfit, sh: V3, el: V3, hd: V3, c: ArmCtx, side: number) {
  const s = o.scale ?? 1;
  const { wk, thin, armC, skin } = c;
  const ru = (thin ? 0.014 : 0.031) * wk * s, rf = (thin ? 0.012 : 0.024) * wk * s, rw = (thin ? 0.01 : 0.019) * wk * s;
  const lerp = (a: V3, bb: V3, t: number): V3 => [a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t];
  // la mano un poco antes del punto de agarre
  const wrist = lerp(el, hd, 0.86);
  const hand = (col: number, mat: number, r = 1) => b.ell(0.02 * s * wk * r, 0.024 * s * wk * r, 0.016 * s * wk * r, ...P(...hd), col, { mat, seg: 8 });
  switch (out) {
    case 'armor': {
      b.ell(0.042 * s * wk, 0.034 * s, 0.042 * s * wk, ...P(sh[0], sh[1] - 0.004, sh[2] + side * 0.004), o.body, { mat: SURF.armor, seg: 12 }); // hombrera
      b.limb(P(...sh), P(...el), ru * 0.9, rf * 0.95, BODYSUIT, { mat: SURF.rubber });
      b.limb(P(...lerp(sh, el, 0.18)), P(...lerp(sh, el, 0.8)), ru * 1.08, rf * 1.12, armC, { mat: SURF.armor });
      b.limb(P(...el), P(...wrist), rf * 0.92, rw * 0.92, BODYSUIT, { mat: SURF.rubber });
      b.limb(P(...lerp(el, wrist, 0.12)), P(...lerp(el, wrist, 0.85)), rf * 1.12, rw * 1.18, armC, { mat: SURF.armor });
      hand(GLOVE, SURF.rubber);
      break;
    }
    case 'droid':
      b.limb(P(...sh), P(...el), ru, rf, armC, { mat: SURF.panel, ms: 3, seg: 7 });
      b.limb(P(...el), P(...wrist), rf, rw, armC, { mat: SURF.panel, ms: 3, seg: 7 });
      b.sphere(0.016 * s, ...P(...el), armC, { mat: SURF.panel, seg: 8 });
      b.sphere(0.02 * s, ...P(...sh), armC, { mat: SURF.panel, seg: 8 });
      hand(armC, SURF.panel, 0.8);
      break;
    case 'b2':
    case 'heavyDroid': {
      const col = out === 'b2' ? armC : 0x2a2b31;
      b.sphere(0.045 * s * wk, ...P(...sh), armC, { mat: SURF.panel, seg: 12 });
      b.limb(P(...sh), P(...el), ru * 1.1, rf * 1.15, col, { mat: SURF.panel, ms: 2 });
      b.limb(P(...el), P(...wrist), rf * 1.35, rw * 1.4, armC, { mat: SURF.panel, ms: 2 });
      hand(col, SURF.panel, 1.2);
      break;
    }
    case 'fur':
      b.limb(P(...sh), P(...el), ru * 1.25, rf * 1.25, armC, { mat: SURF.fur });
      b.limb(P(...el), P(...wrist), rf * 1.2, rw * 1.25, armC, { mat: SURF.fur });
      hand(armC, SURF.fur, 1.25);
      break;
    case 'skin':
      b.limb(P(...sh), P(...el), ru * 0.8, rf * 0.8, armC, { mat: SURF.skin });
      b.limb(P(...el), P(...wrist), rf * 0.8, rw * 0.85, armC, { mat: SURF.skin });
      hand(armC, SURF.skin);
      break;
    case 'robe': {
      const sleeve = o.robe ?? armC;
      b.limb(P(...sh), P(...el), ru * 1.05, rf * 1.12, o.cape ?? sleeve, { mat: SURF.fabric });
      // manga ancha en la muñeca
      b.limb(P(...el), P(...lerp(el, wrist, 0.92)), rf * 1.15, rw * 2.0, o.cape ?? sleeve, { mat: SURF.fabric });
      hand(skin, SURF.skin);
      break;
    }
    default:
      b.limb(P(...sh), P(...el), ru, rf, armC, { mat: SURF.fabric });
      b.limb(P(...el), P(...wrist), rf, rw, armC, { mat: SURF.fabric });
      b.limb(P(...lerp(el, wrist, 0.7)), P(...wrist), rw * 1.15, rw * 1.2, GLOVE, { mat: SURF.leather }); // guante
      hand(GLOVE, SURF.leather);
  }
}

// ───────────────────────── armas ─────────────────────────
/** Coloca un arma alargada entre dos puntos (culata -> boca) en la parte actual */
function gun(b: MB, P: (x: number, y: number, z: number) => V3, from: V3, to: V3, s: number, kind: 'e11' | 'dc15' | 'a280' | 'e5' | 'heavy' | 'sniper' | 'bowcaster' | 'launcher' | 'nabooRifle' | 'grenade') {
  const dir: V3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const len = Math.hypot(...dir);
  const u: V3 = [dir[0] / len, dir[1] / len, dir[2] / len];
  const at = (t: number, up = 0): V3 => [from[0] + dir[0] * t, from[1] + dir[1] * t + up, from[2] + dir[2] * t];
  const yaw = Math.atan2(-u[2], u[0]);
  const pitch = Math.asin(u[1]);
  const rot = { ry: yaw, rz: pitch };
  const gm = { mat: SURF.panel, ms: 5 };
  const dark = 0x1d1e22, metal = 0x55585e;
  switch (kind) {
    case 'e11':
      b.rbox(len * 0.42 * s, 0.026 * s, 0.022 * s, 0.006 * s, ...P(...at(0.42)), dark, { ...gm, ...rot });
      b.limb(P(...at(0.6, 0.004)), P(...at(1.0, 0.004)), 0.009 * s, 0.009 * s, dark, { ...gm, seg: 8 });
      b.limb(P(...at(0.35, 0.026)), P(...at(0.55, 0.026)), 0.007 * s, 0.007 * s, metal, { ...gm, seg: 8 }); // mira
      b.rbox(0.012 * s, 0.035 * s, 0.012 * s, 0.003 * s, ...P(...at(0.3, -0.03)), dark, { ...gm, ...rot }); // empuñadura
      b.rbox(0.045 * s, 0.01 * s, 0.03 * s, 0.003 * s, ...P(...at(0.5, -0.005)), metal, { ...gm, ...rot }); // cargador lateral
      b.rbox(len * 0.25 * s, 0.008 * s, 0.008 * s, 0.002 * s, ...P(...at(0.05)), metal, { ...gm, ...rot }); // culata plegada
      break;
    case 'dc15':
      b.rbox(len * 0.55 * s, 0.026 * s, 0.024 * s, 0.006 * s, ...P(...at(0.38)), 0x2a2b30, { ...gm, ...rot });
      b.limb(P(...at(0.62, 0.006)), P(...at(1.05, 0.006)), 0.011 * s, 0.009 * s, dark, { ...gm, seg: 8 });
      b.limb(P(...at(0.3, 0.03)), P(...at(0.5, 0.03)), 0.008 * s, 0.008 * s, metal, { ...gm, seg: 8 });
      b.rbox(0.012 * s, 0.035 * s, 0.012 * s, 0.003 * s, ...P(...at(0.28, -0.03)), dark, { ...gm, ...rot });
      b.rbox(0.04 * s, 0.025 * s, 0.012 * s, 0.003 * s, ...P(...at(0.45, -0.025)), dark, { ...gm, ...rot });
      b.rbox(len * 0.08 * s, 0.03 * s, 0.02 * s, 0.006 * s, ...P(...at(0.02, -0.005)), 0x2a2b30, { ...gm, ...rot });
      break;
    case 'a280':
    case 'nabooRifle':
      b.rbox(len * 0.6 * s, 0.024 * s, 0.022 * s, 0.006 * s, ...P(...at(0.4)), kind === 'nabooRifle' ? 0x6a5a3a : 0x2c2a26, { ...gm, ...rot });
      b.limb(P(...at(0.68, 0.004)), P(...at(1.05, 0.004)), 0.008 * s, 0.008 * s, dark, { ...gm, seg: 8 });
      b.rbox(0.012 * s, 0.035 * s, 0.012 * s, 0.003 * s, ...P(...at(0.3, -0.03)), dark, { ...gm, ...rot });
      b.rbox(len * 0.18 * s, 0.035 * s, 0.02 * s, 0.008 * s, ...P(...at(0.05, -0.008)), kind === 'nabooRifle' ? 0x5a3a20 : LEATHER, { mat: SURF.wood, ...rot });
      b.limb(P(...at(0.32, 0.028)), P(...at(0.48, 0.028)), 0.007 * s, 0.007 * s, metal, { ...gm, seg: 8 });
      break;
    case 'e5':
      b.rbox(len * 0.5 * s, 0.02 * s, 0.018 * s, 0.005 * s, ...P(...at(0.35)), 0x6a5a40, { ...gm, ...rot });
      b.limb(P(...at(0.55)), P(...at(1.08)), 0.008 * s, 0.007 * s, 0x5a4a34, { ...gm, seg: 8 });
      b.rbox(0.012 * s, 0.03 * s, 0.012 * s, 0.003 * s, ...P(...at(0.25, -0.025)), 0x3a3428, { ...gm, ...rot });
      break;
    case 'heavy':
      b.rbox(len * 0.62 * s, 0.045 * s, 0.04 * s, 0.01 * s, ...P(...at(0.42)), dark, { ...gm, ...rot });
      b.limb(P(...at(0.72)), P(...at(1.05)), 0.016 * s, 0.014 * s, metal, { ...gm, seg: 10 });
      b.limb(P(...at(0.78, 0.02)), P(...at(1.0, 0.02)), 0.006 * s, 0.006 * s, dark, { ...gm, seg: 6 });
      b.cyl(0.03 * s, 0.03 * s, 0.03 * s, ...P(...at(0.45, -0.045)), 0x4a4c50, { ...gm, rx: Math.PI / 2, seg: 12 }); // tambor
      b.rbox(0.014 * s, 0.04 * s, 0.014 * s, 0.003 * s, ...P(...at(0.25, -0.035)), dark, { ...gm, ...rot });
      break;
    case 'sniper':
      b.rbox(len * 0.5 * s, 0.022 * s, 0.02 * s, 0.006 * s, ...P(...at(0.32)), 0x3a3a34, { ...gm, ...rot });
      b.limb(P(...at(0.55)), P(...at(1.25)), 0.007 * s, 0.006 * s, dark, { ...gm, seg: 8 });
      b.limb(P(...at(0.25, 0.03)), P(...at(0.5, 0.03)), 0.011 * s, 0.011 * s, dark, { ...gm, seg: 10 });
      b.rbox(0.012 * s, 0.035 * s, 0.012 * s, 0.003 * s, ...P(...at(0.25, -0.03)), dark, { ...gm, ...rot });
      break;
    case 'bowcaster':
      b.rbox(len * 0.62 * s, 0.03 * s, 0.024 * s, 0.008 * s, ...P(...at(0.4)), 0x5a3a1a, { mat: SURF.wood, ...rot });
      b.limb(P(...at(0.6)), P(...at(1.0)), 0.01 * s, 0.009 * s, metal, { ...gm, seg: 8 });
      // arco (palas)
      b.rbox(0.014 * s, 0.014 * s, 0.24 * s, 0.004 * s, ...P(...at(0.88, 0.012)), metal, { ...gm, ry: yaw });
      for (const zz of [-1, 1]) b.sphere(0.012 * s, ...P(at(0.88)[0], at(0.88)[1] + 0.012, at(0.88)[2] + zz * 0.12), C.glowGreen, { em: 0.9, seg: 6 });
      b.rbox(0.05 * s, 0.03 * s, 0.03 * s, 0.006 * s, ...P(...at(0.45, 0.03)), dark, { ...gm, ...rot });
      break;
    case 'launcher':
      b.limb(P(...at(0.0)), P(...at(1.0)), 0.032 * s, 0.03 * s, 0x4a5a3a, { ...gm, seg: 12 });
      b.limb(P(...at(0.95)), P(...at(1.05)), 0.036 * s, 0.036 * s, dark, { ...gm, seg: 12 });
      b.rbox(0.05 * s, 0.03 * s, 0.025 * s, 0.006 * s, ...P(...at(0.45, 0.045)), dark, { ...gm, ...rot });
      b.rbox(0.014 * s, 0.045 * s, 0.014 * s, 0.003 * s, ...P(...at(0.48, -0.05)), dark, { ...gm, ...rot });
      break;
    case 'grenade':
      b.rbox(len * 0.5 * s, 0.03 * s, 0.026 * s, 0.007 * s, ...P(...at(0.38)), dark, { ...gm, ...rot });
      b.limb(P(...at(0.6)), P(...at(1.0)), 0.022 * s, 0.022 * s, metal, { ...gm, seg: 12 });
      b.rbox(0.012 * s, 0.035 * s, 0.012 * s, 0.003 * s, ...P(...at(0.25, -0.03)), dark, { ...gm, ...rot });
      break;
  }
}

function rifleKind(o: HumOpts): 'e11' | 'dc15' | 'a280' | 'e5' | 'nabooRifle' {
  switch (o.head) {
    case 'storm': case 'scout': case 'mando': return 'e11';
    case 'clone': case 'clone2': case 'arc': case 'aa': return 'dc15';
    case 'b1': case 'oom': case 'magna': return 'e5';
    case 'naboo': return 'nabooRifle';
    default: return 'a280';
  }
}

function weapon(b: MB, o: HumOpts, P: (x: number, y: number, z: number) => V3, pose: Pose, out: Outfit) {
  const s = o.scale ?? 1;
  b.part('armR');
  const hR = pose.hR, hL = pose.hL;
  // eje del arma: de la mano derecha a la izquierda, prolongado
  const axis = (back: number, fwd: number): [V3, V3] => {
    const d: V3 = [hL[0] - hR[0], hL[1] - hR[1], hL[2] - hR[2]];
    return [
      [hR[0] - d[0] * back, hR[1] - d[1] * back, hR[2] - d[2] * back],
      [hR[0] + d[0] * fwd, hR[1] + d[1] * fwd, hR[2] + d[2] * fwd],
    ];
  };
  const gm = { mat: SURF.panel, ms: 5 };
  switch (o.weapon) {
    case 'rifle': {
      const [a, z] = axis(0.55, 1.9);
      gun(b, P, a, z, s, rifleKind(o));
      break;
    }
    case 'heavy': {
      const [a, z] = axis(0.6, 2.4);
      gun(b, P, a, z, s, 'heavy');
      break;
    }
    case 'sniper': {
      const [a, z] = axis(0.6, 2.6);
      gun(b, P, a, z, s, 'sniper');
      break;
    }
    case 'bowcaster': {
      const [a, z] = axis(0.5, 2.0);
      gun(b, P, a, z, s, 'bowcaster');
      break;
    }
    case 'grenade': {
      const [a, z] = axis(0.5, 1.7);
      gun(b, P, a, z, s, 'grenade');
      b.part('body');
      for (const zz of [-1, 1]) b.sphere(0.017 * s, ...P(0.045, 0.49, zz * 0.065), C.dgray, { mat: SURF.panel, seg: 8 });
      b.part('armR');
      break;
    }
    case 'launcher': {
      const [a, z] = axis(2.0, 2.4);
      gun(b, P, [a[0], a[1] + 0.045, a[2]], [z[0], z[1] + 0.045, z[2]], s, 'launcher');
      break;
    }
    case 'pistol':
    case 'dualPistol': {
      const one = (h: V3) => {
        b.rbox(0.07 * s, 0.022 * s, 0.018 * s, 0.006 * s, ...P(h[0] + 0.03, h[1] + 0.012, h[2]), 0x1d1e22, gm);
        b.limb(P(h[0] + 0.06, h[1] + 0.014, h[2]), P(h[0] + 0.1, h[1] + 0.014, h[2]), 0.007 * s, 0.006 * s, 0x2a2b30, { ...gm, seg: 8 });
        b.rbox(0.014 * s, 0.03 * s, 0.014 * s, 0.003 * s, ...P(h[0] + 0.005, h[1] - 0.004, h[2]), 0x1d1e22, { ...gm, rz: 0.3 });
      };
      one(hR);
      if (o.weapon === 'dualPistol') {
        b.part('armL', 'aim');
        one(hL);
        b.part('armR');
      }
      break;
    }
    case 'staff':
    case 'electro': {
      const [a, z] = axis(1.6, 2.6);
      b.limb(P(...a), P(...z), 0.009 * s, 0.009 * s, o.weapon === 'electro' ? 0x2a2a30 : 0x6a4a2a, { mat: o.weapon === 'electro' ? SURF.panel : SURF.wood, seg: 8 });
      if (o.weapon === 'electro') {
        b.sphere(0.022 * s, ...P(...a), 0x8ad8ff, { em: 2.2, seg: 8 });
        b.sphere(0.022 * s, ...P(...z), 0x8ad8ff, { em: 2.2, seg: 8 });
      } else b.cone(0.014 * s, 0.05 * s, ...P(...z), C.metal, { mat: SURF.panel, seg: 6 });
      break;
    }
    case 'atlatl':
      b.limb(P(hR[0] - 0.02, hR[1] - 0.04, hR[2]), P(hR[0] + 0.08, hR[1] + 0.16, hR[2]), 0.007 * s, 0.006 * s, 0x6a4a2a, { mat: SURF.wood, seg: 6 });
      b.sphere(0.032 * s, ...P(hR[0] + 0.09, hR[1] + 0.19, hR[2]), 0x6aff8a, { em: 1.6, seg: 10 });
      b.part('armL');
      b.cyl(0.075 * s, 0.075 * s, 0.014 * s, ...P(hL[0] - 0.02, hL[1] + 0.02, hL[2] + 0.03), 0xb08a4a, { rx: Math.PI / 2, mat: SURF.leather, seg: 16 }); // escudo
      b.cyl(0.03 * s, 0.03 * s, 0.018 * s, ...P(hL[0] - 0.02, hL[1] + 0.02, hL[2] + 0.04), 0x8a6a3a, { rx: Math.PI / 2, mat: SURF.panel, seg: 12 });
      b.part('armR');
      break;
    case 'tool':
      // hidrollave / cortador de fusión
      b.limb(P(hR[0] - 0.03, hR[1] - 0.005, hR[2]), P(hR[0] + 0.1, hR[1] + 0.06, hR[2]), 0.008 * s, 0.008 * s, C.metal, { ...gm, seg: 8 });
      b.rbox(0.05 * s, 0.035 * s, 0.03 * s, 0.008 * s, ...P(hR[0] + 0.11, hR[1] + 0.07, hR[2]), C.yellow, { ...gm, rz: 0.5 });
      b.part('body');
      // bolsa de herramientas
      b.rbox(0.04 * s, 0.05 * s, 0.03 * s, 0.008 * s, ...P(0.0, 0.46, 0.09), LEATHER, { mat: SURF.leather });
      b.part('armR');
      break;
    case 'cane':
      b.limb(P(hR[0], hR[1] + 0.02, hR[2]), P(hR[0] + 0.03, 0.0, hR[2]), 0.007 * s, 0.006 * s, 0x5a6a3a, { mat: SURF.wood, seg: 6 });
      break;
    case 'wristBlasters':
      for (const [h, part] of [[hR, 'armR'], [hL, 'armL']] as [V3, string][]) {
        b.part(part, 'aim');
        b.rbox(0.09 * s, 0.045 * s, 0.045 * s, 0.01 * s, ...P(h[0] - 0.02, h[1] + 0.01, h[2]), 0x3a404a, { mat: SURF.panel, ms: 3 });
        b.limb(P(h[0] + 0.02, h[1] + 0.012, h[2]), P(h[0] + 0.06, h[1] + 0.012, h[2]), 0.008 * s, 0.008 * s, 0x1d1e22, { mat: SURF.panel, seg: 8 });
      }
      b.part('armR');
      break;
    case 'saber':
    case 'doubleSaber': {
      b.limb(P(hR[0], hR[1] - 0.03, hR[2]), P(hR[0], hR[1] + 0.03, hR[2]), 0.007 * s, 0.007 * s, 0x9a9ea6, { mat: SURF.panel, ms: 6, seg: 8 }); // empuñadura
      b.part('saber', 'saber', P(hR[0], hR[1] + 0.02, hR[2]), 'armR', true);
      const L = 0.42;
      b.limb(P(hR[0], hR[1] + 0.03, hR[2]), P(hR[0], hR[1] + 0.03 + L, hR[2]), 0.011 * s, 0.009 * s, C.team, { team: 1, em: 2.6, seg: 8, mat: SURF.light });
      if (o.weapon === 'doubleSaber') b.limb(P(hR[0], hR[1] - 0.03, hR[2]), P(hR[0], hR[1] - 0.03 - L, hR[2]), 0.011 * s, 0.009 * s, C.team, { team: 1, em: 2.6, seg: 8, mat: SURF.light });
      break;
    }
    case 'none':
      break;
  }
  void out;
}

/** Múltiples sables (Grievous) en brazos extra */
export function extraSabers(b: MB, n: number, s: number) {
  for (let i = 0; i < n; i++) {
    const z = (i % 2 === 0 ? 1 : -1) * 0.17 * s;
    const y = (0.6 + (i < 2 ? 0.02 : -0.08)) * s;
    b.part('saber' + (i + 2), 'saber2', [0.06 * s, y, z], null, true);
    b.limb([-0.01 * s, y + 0.04 * s, z * 0.7], [0.08 * s, y, z], 0.011 * s, 0.009 * s, 0xe8e0c8, { mat: SURF.armor, seg: 7 });
    b.limb([0.09 * s, y, z], [0.18 * s, y + 0.38 * s, z], 0.01 * s, 0.008 * s, C.team, { team: 1, em: 2.6, seg: 8, mat: SURF.light });
  }
}
