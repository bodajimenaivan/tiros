// Registro de modelos de unidades: (unidad, estilo de civilización) -> modelo procedural.
import { MB, C, type ModelDef } from './builder';
import { humanoid, extraSabers, type HumOpts } from './humanoids';
import {
  speederBike, hoverTank, atst, atat, atte, atrt, spiderDroid, wheelDroid, beast, tieFighter, xwing, vultureDroid,
  artilleryPiece, droideka, pummel, aaPlatform, type BeastOpts,
} from './vehicles';
import type { CivStyle } from '../../data/types';
import { UNITS } from '../../data/units';

const WHITE = 0xe6e6e2;
const B1 = 0xc9b07e;
const B1TF = 0xd2bb8a;
const B2 = 0x5a6878;
const NABOO_GUARD = 0x2e3a58;
const GUNGAN = 0xc8905a;
const FUR = 0x6e4a2a;
const WOOD = 0x8a6a3a;
const REB_VEST = 0xb8a070;
const REB_PANTS = 0x5a5a3e;

type Variant = 0 | 1 | 2; // normal, pesado, élite

function infantry(style: CivStyle, role: 'trooper' | 'grenadier' | 'aa' | 'worker' | 'pilot', v: Variant): HumOpts {
  const weapon = role === 'grenadier' ? 'grenade' : role === 'aa' ? 'launcher' : role === 'worker' ? 'tool' : v === 2 ? 'heavy' : 'rifle';
  const accent = role === 'grenadier' ? 'stripe' : v === 1 ? 'pauldron' : 'shoulder';
  switch (style) {
    case 'imperial':
      if (role === 'worker') return { body: 0x5c6066, legs: 0x3e4248, vest: 0x34373c, arms: 0x5c6066, head: 'engineer', headColor: 0x3a3d42, weapon: 'tool', accent: 'belt', backpack: undefined };
      return { body: WHITE, legs: WHITE, arms: WHITE, boots: WHITE, head: role === 'aa' ? 'aa' : 'storm', weapon, accent, bulk: v === 2 ? 1.12 : v === 1 ? 1.06 : 1, backpack: role === 'grenadier' || v === 1 ? 0x2c2e33 : undefined };
    case 'rebel':
      if (role === 'worker') return { body: 0xa08458, legs: 0x5a4a36, vest: 0x6a4e30, arms: 0xa08458, head: 'engineer', headColor: 0x7a6a4a, weapon: 'tool', accent: 'belt', hair: 0x4a3420 };
      if (v === 1) return { body: 0xd2cec4, legs: 0x9a968a, vest: 0xb8b2a4, arms: 0xd2cec4, head: 'hothHelmet', weapon, accent, bulk: 1.06, backpack: 0xb0aa9c };
      return { body: 0x5e6444, legs: 0x4a4e36, vest: 0x6e6a48, arms: 0x5e6444, head: role === 'aa' ? 'hothHelmet' : 'rebelHelmet', headColor: 0x5a5a40, weapon, accent, bulk: v === 2 ? 1.1 : 1, backpack: role === 'grenadier' ? 0x5a4a30 : undefined };
    case 'republic':
      if (role === 'worker') return { body: 0x8a8c90, legs: 0x5a5c60, vest: 0x6a6c70, arms: 0x8a8c90, head: 'engineer', headColor: 0xd8c040, weapon: 'tool', accent: 'belt' };
      return { body: WHITE, legs: WHITE, arms: WHITE, boots: WHITE, head: role === 'aa' ? 'aa' : v === 0 ? 'clone' : 'clone2', weapon, accent: 'stripe', bulk: v === 2 ? 1.12 : v === 1 ? 1.06 : 1, backpack: role === 'grenadier' || v === 1 ? 0xd0d0cc : undefined };
    case 'cis':
      if (role === 'worker') return { body: 0x6a7078, head: 'droidWorker', headColor: 0x7a8088, weapon: 'tool', thin: true, accent: 'chest' };
      if (v >= 1 && role === 'trooper') return { body: B2, head: 'b2', headColor: B2, weapon: 'wristBlasters', bulk: v === 2 ? 1.12 : 1.05, accent: 'chest', scale: 1.08 };
      return { body: B1, head: 'b1', headColor: B1, weapon, thin: true, accent: 'chest', boots: B1, backpack: role === 'grenadier' ? 0x8a7a50 : undefined };
    case 'tradefed':
      if (role === 'worker') return { body: 0x7a5e40, head: 'droidWorker', headColor: 0x8a6e50, weapon: 'tool', thin: true, accent: 'chest' };
      return { body: B1TF, head: v >= 1 ? 'oom' : 'b1', headColor: B1TF, weapon, thin: true, accent: 'chest', boots: B1TF, bulk: v === 2 ? 1.1 : 1 };
    case 'naboo':
      if (role === 'worker') return { body: 0xc4b08a, legs: 0x5a4a3a, vest: 0x7a5434, arms: 0xc4b08a, head: 'rebel', hair: 0x6a4424, weapon: 'tool', accent: 'belt' };
      if (v === 2) return { body: 0x23306a, legs: 0x23306a, vest: 0x1a2350, head: 'naboo', weapon: 'heavy', accent: 'sash', cape: 0xa02a2a };
      return { body: 0x3a4466, legs: 0x4a3424, vest: NABOO_GUARD, arms: 0x6a4a2a, head: 'naboo', weapon, accent: v === 1 ? 'sash' : 'shoulder', boots: 0x2a1a10 };
    case 'gungan':
      if (role === 'worker') return { body: 0x8a6a4a, legs: GUNGAN, arms: GUNGAN, head: 'gungan', headColor: GUNGAN, weapon: 'tool', accent: 'belt' };
      return { body: 0x6a4a2c, legs: GUNGAN, arms: GUNGAN, head: 'gungan', headColor: GUNGAN, weapon: role === 'trooper' ? 'atlatl' : weapon, accent: v >= 1 ? 'sash' : 'belt', bulk: v === 2 ? 1.1 : 1, skirt: 0x5a3e24 };
    case 'wookiee':
      if (role === 'worker') return { body: 0x9a7650, head: 'wookiee', headColor: 0x9a7650, weapon: 'tool', fur: true, accent: 'sash', scale: 1.12, bulk: 1.12 };
      return { body: FUR, head: 'wookiee', headColor: FUR, weapon: role === 'trooper' ? 'bowcaster' : weapon, fur: true, accent: 'sash', scale: 1.15 + v * 0.03, bulk: 1.15 };
  }
}

function riderOf(style: CivStyle): HumOpts {
  switch (style) {
    case 'imperial': return { body: 0x3a3a3a, legs: WHITE, head: 'scout', weapon: 'pistol', accent: 'shoulder' };
    case 'rebel': return { body: REB_VEST, legs: REB_PANTS, head: 'rebelHelmet', weapon: 'pistol', accent: 'shoulder' };
    case 'republic': return { body: WHITE, head: 'clone2', weapon: 'pistol', accent: 'stripe' };
    case 'cis': return { body: B1, head: 'b1', headColor: B1, weapon: 'none', thin: true, accent: 'chest' };
    case 'tradefed': return { body: B1TF, head: 'b1', headColor: B1TF, weapon: 'none', thin: true, accent: 'chest' };
    case 'naboo': return { body: NABOO_GUARD, head: 'naboo', weapon: 'pistol', accent: 'shoulder' };
    case 'gungan': return { body: 0x7a5a3a, legs: GUNGAN, arms: GUNGAN, head: 'gungan', headColor: GUNGAN, weapon: 'atlatl', accent: 'sash' };
    case 'wookiee': return { body: FUR, head: 'wookiee', headColor: FUR, weapon: 'bowcaster', fur: true, accent: 'sash' };
  }
}

const VEH: Record<CivStyle, number> = {
  imperial: 0xb4b8c0, rebel: 0xb8b0a0, republic: 0xd6d4cc, cis: 0x8a8070, tradefed: 0xa08860, naboo: 0xd8c050, gungan: 0x8a7a5a, wookiee: WOOD,
};

function kaadu(rider: HumOpts | null, armored = false): BeastOpts {
  return { len: 1.0, hgt: 0.95, wid: 0.42, body: armored ? 0x7a6a40 : 0xa08a50, belly: 0xd8c090, legs: 2, head: 'kaadu', rider, saddle: true };
}

export function buildUnitModel(defId: string, style: CivStyle, saber: number): ModelDef {
  const ud = UNITS[defId];
  const b = new MB();
  const v: Variant = defId.startsWith('heavy_') || defId === 'heavy_trooper' ? 1 : defId.startsWith('repeater') || defId.startsWith('adv_') || defId.startsWith('elite_') ? 2 : 0;
  const veh = VEH[style];
  const cls = ud.cls;
  // ── Animales ──
  if (cls === 'animal') {
    animal(b, defId);
    return b.build(defId);
  }
  // ── Héroes y únicas ──
  if (cls === 'hero') {
    hero(b, defId, style);
    return b.build(defId);
  }
  if (cls === 'unique') {
    unique(b, defId.replace('elite_', ''), style, v);
    return b.build(defId + style);
  }
  switch (cls) {
    case 'worker':
      humanoid(b, infantry(style, 'worker', 0));
      break;
    case 'trooper':
      humanoid(b, infantry(style, 'trooper', v));
      break;
    case 'grenadier':
      humanoid(b, infantry(style, 'grenadier', v));
      break;
    case 'aaTrooper':
      humanoid(b, infantry(style, 'aa', v));
      break;
    case 'trader': {
      // carguero repulsor con contenedores (mira hacia +X)
      const hull = style === 'gungan' ? 0x6a8a7a : style === 'wookiee' ? WOOD : veh;
      b.part('body', 'bob');
      b.box(1.1, 0.18, 0.56, 0, 0.32, 0, hull);
      b.box(0.28, 0.14, 0.42, 0.66, 0.3, 0, hull, { rz: 0.35 });
      b.box(1.12, 0.05, 0.58, 0, 0.37, 0, C.team, { team: 1 });
      b.box(0.34, 0.26, 0.44, -0.27, 0.55, 0, 0xb08a4a);
      b.box(0.3, 0.24, 0.42, 0.08, 0.54, 0, 0x8a9aa8);
      b.box(0.22, 0.18, 0.32, 0.42, 0.5, 0, hull);
      b.box(0.04, 0.09, 0.26, 0.53, 0.52, 0, C.glass);
      b.box(0.9, 0.02, 0.42, 0, 0.22, 0, C.glowBlue, { em: 0.8 });
      b.sym((sd) => {
        b.cyl(0.08, 0.1, 0.25, -0.62, 0.32, sd * 0.18, C.dgray, { rz: Math.PI / 2 });
        b.cyl(0.065, 0.065, 0.03, -0.75, 0.32, sd * 0.18, C.glowBlue, { em: 2, rz: Math.PI / 2 });
      });
      break;
    }
    case 'scout':
    case 'mounted': {
      const rider = riderOf(style);
      const big = cls === 'mounted';
      if (style === 'rebel' && big) beast(b, { len: 0.9, hgt: 1.0, wid: 0.4, body: 0xd8d0c0, belly: 0xc0b8a8, legs: 2, head: 'tauntaun', rider, saddle: true });
      else if (style === 'gungan') beast(b, kaadu(rider, big && v > 0));
      else if (style === 'wookiee' && big) beast(b, { len: 1.3, hgt: 0.9, wid: 0.45, body: 0x6a8a5a, belly: 0xd0a040, legs: 4, head: 'varactyl', rider, saddle: true });
      else if (style === 'cis' || style === 'tradefed') speederBike(b, veh, rider, 'stap');
      else if (style === 'republic') speederBike(b, 0xd8d4c8, rider, 'barc');
      else if (style === 'naboo') speederBike(b, 0xd8c050, rider, big ? 'flash' : 'bike');
      else if (style === 'wookiee') speederBike(b, WOOD, rider, 'bike');
      else speederBike(b, style === 'rebel' ? 0x8a8a6a : veh, rider, 'bike');
      break;
    }
    case 'strikeMech':
      switch (style) {
        case 'imperial': atst(b, veh, 1 + v * 0.08); break;
        case 'republic': atrt(b, veh, riderOf('republic')); break;
        case 'cis': spiderDroid(b, veh, 4, 0.75 + v * 0.08, 'small'); break;
        case 'tradefed': wheelDroid(b, veh, false); break;
        case 'gungan': beast(b, { ...kaadu(riderOf('gungan'), true), len: 1.2, hgt: 1.1, wid: 0.5 }); break;
        case 'wookiee': atst(b, WOOD, 0.9 + v * 0.08); break;
        case 'naboo': hoverTank(b, { len: 1.3, wid: 0.7, hgt: 0.45, body: 0xc8c8c0, trim: 0xd8b040, turret: 'twin', shape: 'flat' }); break;
        default: hoverTank(b, { len: 1.3, wid: 0.7, hgt: 0.45, body: veh, turret: 'twin', shape: 'wedge' });
      }
      break;
    case 'mechDestroyer':
      switch (style) {
        case 'imperial': hoverTank(b, { len: 1.6, wid: 0.85, hgt: 0.55, body: veh, turret: 'ion', shape: 'wedge' }); break;
        case 'rebel': hoverTank(b, { len: 1.5, wid: 0.9, hgt: 0.6, body: 0xa8a090, turret: 'ion', shape: 'flat' }); break;
        case 'republic': hoverTank(b, { len: 1.6, wid: 0.85, hgt: 0.55, body: veh, turret: 'twin', shape: 'wedge', cannon: 0x6a2a20 }); break;
        case 'cis': hoverTank(b, { len: 1.7, wid: 1.0, hgt: 0.6, body: veh, turret: 'ion', shape: 'flat', tracks: true }); break;
        case 'tradefed': spiderDroid(b, veh, 4, 0.95, 'big'); break;
        case 'naboo': hoverTank(b, { len: 1.6, wid: 0.85, hgt: 0.55, body: 0xc0c0c8, trim: 0xd8b040, turret: 'ion', shape: 'round' }); break;
        case 'gungan': beast(b, { len: 1.6, hgt: 1.1, wid: 0.75, body: 0x7a8a5a, belly: 0xb0a070, legs: 4, head: 'falumpaset', saddle: true, rider: riderOf('gungan') }); break;
        case 'wookiee': pummel(b, 'wood', WOOD); break;
      }
      break;
    case 'assaultMech':
      switch (style) {
        case 'imperial': atat(b, veh, 1 + v * 0.06); break;
        case 'rebel': hoverTank(b, { len: 2.1, wid: 1.15, hgt: 0.75, body: 0xa8a090, turret: 'big', shape: 'wedge' }); break;
        case 'republic': atte(b, veh, 1 + v * 0.06); break;
        case 'cis': wheelDroid(b, veh, true); break;
        case 'tradefed': hoverTank(b, { len: 2.2, wid: 1.2, hgt: 0.8, body: veh, turret: 'big', shape: 'aat', trim: 0x6a5a40 }); break;
        case 'naboo': hoverTank(b, { len: 2.0, wid: 1.1, hgt: 0.8, body: 0xd0d0d8, trim: 0xd8b040, turret: 'quad', shape: 'round' }); break;
        case 'gungan': beast(b, { len: 2.3, hgt: 1.6, wid: 1.15, body: 0x6a7a4a, belly: 0xa09060, legs: 4, head: 'falumpaset', saddle: true, horns: true }); break;
        case 'wookiee': hoverTank(b, { len: 2.0, wid: 1.15, hgt: 0.8, body: WOOD, turret: 'big', shape: 'flat', tracks: true, trim: 0x5a4020 }); break;
      }
      break;
    case 'pummel':
      switch (style) {
        case 'imperial': pummel(b, 'juggernaut', veh); break;
        case 'republic': pummel(b, 'juggernaut', veh); break;
        case 'tradefed': pummel(b, 'mtt', veh); break;
        case 'gungan': case 'wookiee': pummel(b, 'wood', WOOD); break;
        default: pummel(b, 'ram', veh);
      }
      break;
    case 'artillery':
      switch (style) {
        case 'imperial': artilleryPiece(b, 'spmat', veh); break;
        case 'republic': artilleryPiece(b, 'sphat', veh); break;
        case 'cis': spiderDroid(b, veh, 4, 1.05, 'homing'); break;
        case 'tradefed': artilleryPiece(b, 'pac', veh); break;
        case 'rebel': artilleryPiece(b, 'ion', 0xa8a090); break;
        case 'naboo': artilleryPiece(b, 'royal', 0xd0d0d8); break;
        default: artilleryPiece(b, 'catapult', WOOD);
      }
      break;
    case 'aaMobile':
      if (style === 'gungan') aaPlatform(b, 0x7a5a3a, { len: 1.5, hgt: 1.0, wid: 0.7, body: 0x7a8a5a, belly: 0xb0a070, legs: 4, head: 'falumpaset' });
      else aaPlatform(b, style === 'wookiee' ? WOOD : veh, null);
      break;
    case 'fighter':
      switch (style) {
        case 'imperial': tieFighter(b, v ? 'interceptor' : 'fighter'); break;
        case 'rebel': xwing(b, v ? 'awing' : 'xwing'); break;
        case 'republic': xwing(b, v ? 'vwing' : 'arc170'); break;
        case 'cis': vultureDroid(b, v ? 'tri' : 'vulture'); break;
        case 'tradefed': vultureDroid(b, 'vulture'); break;
        case 'wookiee': xwing(b, 'catamaran'); break;
        default: xwing(b, 'n1');
      }
      break;
    case 'bomber':
      switch (style) {
        case 'imperial': tieFighter(b, 'bomber'); break;
        case 'rebel': xwing(b, v ? 'bwing' : 'ywing'); break;
        case 'republic': xwing(b, 'ywing'); break;
        case 'cis': case 'tradefed': vultureDroid(b, 'hyena'); break;
        case 'wookiee': xwing(b, 'glider'); break;
        default: xwing(b, 'nabooBomber');
      }
      break;
    case 'jediKnight':
    case 'jediMaster': {
      const dark = style === 'imperial' || style === 'cis' || style === 'tradefed';
      const master = cls === 'jediMaster';
      const robe = dark ? 0x1a1a1e : master ? 0x8a7a5a : 0x6a4a2a;
      if (style === 'imperial' && !master) {
        humanoid(b, { body: 0x1a1a20, head: 'darktrooper', headColor: 0x2a2a2a, weapon: 'doubleSaber', accent: 'shoulder', robe: 0x1a1a20, saberColor: saber });
      } else if (style === 'wookiee') {
        humanoid(b, { body: FUR, head: 'wookiee', headColor: FUR, weapon: 'saber', fur: true, accent: 'sash', robe: master ? 0x8a7a5a : undefined, scale: 1.12, bulk: 1.15, saberColor: saber });
      } else if (style === 'gungan') {
        humanoid(b, { body: 0x7a5a3a, legs: GUNGAN, arms: GUNGAN, head: 'gungan', headColor: GUNGAN, weapon: 'saber', accent: 'sash', robe, saberColor: saber });
      } else {
        humanoid(b, { body: dark ? 0x26262a : 0xd2c4a4, legs: dark ? 0x1a1a1e : 0x6a5038, head: master ? 'hood' : dark ? 'zabrak' : 'bare', hair: dark ? undefined : 0x6a4a2a, weapon: 'saber', accent: master ? 'sash' : 'none', robe, cape: master ? robe : undefined, saberColor: saber, outfit: 'robe' });
      }
      break;
    }
    default:
      humanoid(b, infantry(style, 'trooper', 0));
  }
  return b.build(defId + ':' + style);
}

function unique(b: MB, id: string, style: CivStyle, v: Variant) {
  switch (id) {
    case 'dark_trooper':
      humanoid(b, { body: 0x2a2a30, legs: 0x2a2a30, arms: 0x3a3a40, boots: 0x1a1a1e, head: 'darktrooper', weapon: 'heavy', accent: 'pauldron', bulk: 1.3, scale: 1.15 + v * 0.05 });
      break;
    case 'airspeeder':
      xwing(b, 'airspeeder');
      break;
    case 'arc_trooper':
      humanoid(b, { body: WHITE, head: 'arc', weapon: 'dualPistol', accent: 'stripe', bulk: 1.05, scale: 1.05 });
      break;
    case 'magnaguard':
      humanoid(b, { body: 0x3a3a40, legs: 0x2a2a30, head: 'magna', weapon: 'electro', thin: true, accent: 'chest', scale: 1.2, cape: 0x5a2a20 });
      break;
    case 'droideka':
      droideka(b, 0x8a7a5a);
      break;
    case 'royal_crusader':
      speederBike(b, 0xd8c050, { body: 0x5a1a1a, head: 'naboo', weapon: 'pistol', accent: 'sash' }, 'flash');
      break;
    case 'fambaa':
      beast(b, { len: 2.6, hgt: 1.7, wid: 1.25, body: 0x5a7a6a, belly: 0x9aa080, legs: 4, head: 'fambaa', saddle: true });
      b.part('body');
      b.box(0.6, 0.4, 0.5, -0.1, 1.85, 0, 0x8a6a4a);
      b.sphere(0.25, -0.1, 2.15, 0, 0x7af0ff, { em: 1.8 });
      b.sym((s) => b.cyl(0.04, 0.04, 0.5, -0.1, 2.0, s * 0.3, C.metal, { rx: s * 0.4 }));
      break;
    case 'berserker':
      humanoid(b, { body: 0x5a3a20, head: 'wookiee', headColor: 0x5a3a20, weapon: 'staff', fur: true, accent: 'sash', scale: 1.22, bulk: 1.3 });
      break;
  }
  void style;
}

function hero(b: MB, id: string, style: CivStyle) {
  const ud = UNITS[id];
  const sc = ud.saberColor;
  switch (id) {
    case 'vader':
      humanoid(b, { body: C.black, legs: C.black, arms: C.black, boots: C.black, head: 'vader', weapon: 'saber', accent: 'none', cape: 0x101012, scale: 1.25, bulk: 1.15, saberColor: sc });
      break;
    case 'palpatine':
      humanoid(b, { body: 0x101014, head: 'hood', robe: 0x101014, weapon: 'none', accent: 'none', cape: 0x101014, scale: 1.0 });
      b.part('armR');
      b.sphere(0.04, 0.17, 0.45, -0.16, 0x9ad8ff, { em: 3 });
      b.part('body');
      break;
    case 'boba_fett':
      humanoid(b, { body: 0x5a6a4a, legs: 0x6a6a5a, arms: 0x8a7a5a, head: 'mando', weapon: 'rifle', accent: 'pauldron', cape: 0x6a4a2a, scale: 1.08 });
      break;
    case 'luke':
      humanoid(b, { body: 0x1a1a1a, head: 'bare', weapon: 'saber', accent: 'none', scale: 1.05, saberColor: sc, cape: 0x1a1a1a });
      break;
    case 'han':
      humanoid(b, { body: 0xe8e0d0, legs: 0x2a3a5a, arms: 0xe8e0d0, vest: 0x1a1a1c, head: 'rebel', hair: 0x5a3a20, weapon: 'pistol', accent: 'none', scale: 1.08 });
      break;
    case 'leia':
      humanoid(b, { body: 0xf0f0f0, head: 'leia', weapon: 'pistol', accent: 'none', robe: 0xf0f0f0, scale: 1.0 });
      break;
    case 'yoda':
      humanoid(b, { body: 0x8a7a5a, head: 'yoda', weapon: 'saber', accent: 'none', robe: 0x8a7a5a, scale: 0.6, saberColor: sc });
      break;
    case 'obiwan':
      humanoid(b, { body: 0xd8c8a8, legs: 0x8a6a4a, head: 'bare', weapon: 'saber', accent: 'none', robe: 0x7a5a3a, cape: 0x6a4a2a, scale: 1.08, saberColor: sc });
      break;
    case 'mace':
      humanoid(b, { body: 0x8a6a4a, legs: 0x5a3a20, head: 'bare', headColor: 0x5a3a22, weapon: 'saber', accent: 'none', robe: 0x6a4a2a, scale: 1.1, saberColor: sc });
      break;
    case 'rex':
      humanoid(b, { body: WHITE, head: 'clone', weapon: 'dualPistol', accent: 'stripe', cape: 0x3a6ac8, scale: 1.08, bulk: 1.05 });
      break;
    case 'dooku':
      humanoid(b, { body: 0x2a2a30, head: 'bare', headColor: 0xd8c8b8, weapon: 'saber', accent: 'none', cape: 0x5a2a1a, robe: 0x2a2a30, scale: 1.12, saberColor: sc });
      break;
    case 'ventress':
      humanoid(b, { body: 0x2a2a2e, head: 'bare', headColor: 0xe8e8e8, weapon: 'doubleSaber', accent: 'sash', scale: 1.05, saberColor: sc, robe: 0x2a2a2e });
      break;
    case 'grievous':
      humanoid(b, { body: 0xe8e0c8, legs: 0x8a8a8a, head: 'grievous', weapon: 'saber', thin: true, accent: 'none', cape: 0x6a4a3a, scale: 1.3, saberColor: sc });
      extraSabers(b, 3, 1.3);
      break;
    case 'maul':
      humanoid(b, { body: 0x101014, head: 'maul', weapon: 'doubleSaber', accent: 'none', robe: 0x101014, scale: 1.08, saberColor: sc });
      break;
    case 'oom9':
      humanoid(b, { body: B1TF, head: 'oom', headColor: B1TF, weapon: 'rifle', thin: true, accent: 'chest', scale: 1.1 });
      break;
    case 'aurra':
      humanoid(b, { body: 0xd8d0c8, legs: 0x8a2a1a, head: 'bare', headColor: 0xf0f0f0, weapon: 'sniper', accent: 'none', scale: 1.08 });
      break;
    case 'quigon':
      humanoid(b, { body: 0xb0a080, legs: 0x6a4a2a, head: 'bare', weapon: 'saber', accent: 'none', robe: 0x6a4a2a, cape: 0x5a3a20, scale: 1.15, saberColor: sc });
      break;
    case 'padme':
      humanoid(b, { body: 0x8a1a2a, head: 'padme', weapon: 'pistol', accent: 'sash', robe: 0x8a1a2a, scale: 1.0 });
      break;
    case 'panaka':
      humanoid(b, { body: NABOO_GUARD, legs: 0x3a2a1a, head: 'naboo', weapon: 'pistol', accent: 'sash', cape: 0x5a3a20, scale: 1.08 });
      break;
    case 'boss_nass':
      humanoid(b, { body: 0x4a2a5a, legs: 0x9a7a50, head: 'nass', weapon: 'cane', accent: 'sash', robe: 0x4a2a5a, scale: 1.25, bulk: 1.6 });
      break;
    case 'jarjar':
      humanoid(b, { body: 0x7a5a3a, legs: 0xd08a40, arms: 0xd08a40, head: 'jarjar', weapon: 'none', accent: 'belt', scale: 1.12, thin: true });
      break;
    case 'tarpals':
      humanoid(b, { body: 0x6a4a2a, legs: GUNGAN, arms: GUNGAN, head: 'gungan', headColor: 0xb07a40, weapon: 'electro', accent: 'sash', scale: 1.15, skirt: 0x5a3a20 });
      break;
    case 'chewbacca':
      humanoid(b, { body: 0x7a5232, head: 'wookiee', headColor: 0x7a5232, weapon: 'bowcaster', fur: true, accent: 'sash', scale: 1.28, bulk: 1.2 });
      break;
    case 'tarfful':
      humanoid(b, { body: 0x9a7a5a, head: 'wookiee', headColor: 0x9a7a5a, weapon: 'staff', fur: true, accent: 'sash', scale: 1.3, bulk: 1.3 });
      break;
    case 'gungi':
      humanoid(b, { body: 0x5a3a20, head: 'wookiee', headColor: 0x5a3a20, weapon: 'saber', fur: true, accent: 'sash', scale: 1.1, bulk: 1.1, saberColor: sc });
      break;
    default:
      humanoid(b, { body: 0x888888, head: 'bare', weapon: 'rifle' });
  }
  // aura de héroe: base dorada
  b.part('body');
  b.torus(0.32, 0.025, 0, 0.02, 0, 0xffd860, { rx: Math.PI / 2, em: 1.2, seg: 20 });
  void style;
}

function animal(b: MB, id: string) {
  switch (id) {
    case 'bantha': beast(b, { len: 1.5, hgt: 1.3, wid: 0.95, body: 0x6a4a30, belly: 0x5a3a24, legs: 4, head: 'bantha' }); break;
    case 'dewback': beast(b, { len: 1.5, hgt: 0.7, wid: 0.6, body: 0x7a8a5a, belly: 0xb0a070, legs: 4, head: 'dewback' }); break;
    case 'tauntaun': beast(b, { len: 0.8, hgt: 0.95, wid: 0.38, body: 0xd8d0c0, belly: 0xc0b8a8, legs: 2, head: 'tauntaun' }); break;
    case 'shaak': beast(b, { len: 1.0, hgt: 0.75, wid: 0.7, body: 0xc8b8a0, belly: 0x8a6a4a, legs: 4, head: 'shaak', tail: false }); break;
    case 'nerf': beast(b, { len: 1.0, hgt: 0.8, wid: 0.6, body: 0x6a5a4a, legs: 4, head: 'nerf', horns: true }); break;
    case 'kaadu': beast(b, kaadu(null)); break;
    case 'happabore': beast(b, { len: 1.5, hgt: 1.1, wid: 0.9, body: 0x5a5a6a, belly: 0x7a7a8a, legs: 4, head: 'happabore' }); break;
    case 'lothcat': beast(b, { len: 0.5, hgt: 0.35, wid: 0.25, body: 0xe8d8b0, legs: 4, head: 'cat' }); break;
    case 'thranta': beast(b, { len: 1.3, hgt: 0.9, wid: 0.45, body: 0x6a8a5a, belly: 0xd0a040, legs: 4, head: 'varactyl' }); break;
    case 'wampa': beast(b, { len: 0.7, hgt: 1.3, wid: 0.6, body: 0xf0f0f0, legs: 2, head: 'wampa', tail: false }); break;
    case 'nexu': beast(b, { len: 1.0, hgt: 0.6, wid: 0.45, body: 0xd8b8a0, belly: 0x9a6a4a, legs: 4, head: 'nexu' }); break;
    case 'boarwolf': beast(b, { len: 0.9, hgt: 0.6, wid: 0.45, body: 0x5a4a3a, legs: 4, head: 'boar' }); break;
    case 'acklay': spiderDroid(b, 0x6a8a6a, 6, 1.0, 'small'); break;
    default: beast(b, { len: 1.0, hgt: 0.8, wid: 0.6, body: 0x8a7a6a, legs: 4 });
  }
}
