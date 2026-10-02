// Edificios procedurales con un "kit" arquitectónico por civilización.
import { MB, C, type ModelDef } from './builder';
import { SURF } from '../surface';
import type { CivStyle } from '../../data/types';
import { BUILDINGS } from '../../data/buildings';

interface Kit {
  wall: number;
  wall2: number;
  roof: number;
  trim: number;
  light: number;
  glass: number;
  /** superficies de muros, techos y detalles */
  sWall: number;
  sRoof: number;
  sTrim: number;
  block(b: MB, x: number, y: number, z: number, w: number, h: number, d: number, alt?: boolean): void;
  roofOn(b: MB, x: number, y: number, z: number, w: number, d: number): void;
  dome(b: MB, x: number, y: number, z: number, r: number): void;
  tower(b: MB, x: number, z: number, r: number, h: number): void;
}

/** Fila de ventanas iluminadas en las cuatro caras de un bloque */
function windows(b: MB, k: Kit, x: number, y: number, z: number, w: number, d: number, h: number, opts: { n?: number; tall?: number; round?: boolean } = {}) {
  const n = opts.n ?? Math.max(1, Math.round(Math.max(w, d) / 0.45));
  const wh = opts.tall ?? Math.min(0.22, h * 0.35);
  for (const [fx, fz, len] of [[1, 0, d], [-1, 0, d], [0, 1, w], [0, -1, w]] as [number, number, number][]) {
    const cnt = Math.max(1, Math.round((n * len) / Math.max(w, d)));
    for (let i = 0; i < cnt; i++) {
      const t = (i + 0.5) / cnt - 0.5;
      const px = x + (fx ? fx * (w / 2 + 0.005) : t * len * 0.8);
      const pz = z + (fz ? fz * (d / 2 + 0.005) : t * len * 0.8);
      const ww = Math.min(0.2, (len * 0.6) / cnt);
      if (opts.round) b.cyl(ww * 0.45, ww * 0.45, 0.03, px, y, pz, k.glass, { mat: SURF.glass, em: 0.35, rx: fz ? Math.PI / 2 : 0, rz: fx ? Math.PI / 2 : 0, seg: 10 });
      else {
        b.box(fx ? 0.03 : ww, wh, fz ? 0.03 : ww, px, y, pz, k.glass, { mat: SURF.glass, em: 0.35 });
        // marco
        b.box(fx ? 0.035 : ww + 0.04, 0.025, fz ? 0.035 : ww + 0.04, px, y - wh / 2 - 0.012, pz, k.trim, { mat: k.sTrim });
      }
    }
  }
}

/** Rejillas, tubos y equipos sobre un techo plano */
function roofGear(b: MB, k: Kit, x: number, y: number, z: number, w: number, d: number, seed: number) {
  const r = (i: number) => Math.abs(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
  const n = Math.max(2, Math.round((w * d) / 0.6));
  for (let i = 0; i < n; i++) {
    const px = x + (r(i) - 0.5) * w * 0.7, pz = z + (r(i + 50) - 0.5) * d * 0.7;
    const kind = r(i + 100);
    if (kind < 0.4) b.rbox(0.22, 0.12, 0.18, 0.02, px, y + 0.06, pz, k.trim, { mat: SURF.grate });
    else if (kind < 0.7) b.cyl(0.07, 0.08, 0.16, px, y + 0.08, pz, k.wall2, { mat: SURF.panel, seg: 10 });
    else b.limb([px, y + 0.04, pz], [px + 0.3, y + 0.04, pz], 0.025, 0.025, k.trim, { mat: SURF.panel, seg: 6 });
  }
}

/** Puerta con marco */
function door(b: MB, k: Kit, x: number, y: number, z: number, w: number, h: number, alongZ: boolean) {
  b.rbox(alongZ ? 0.06 : w + 0.1, h + 0.06, alongZ ? w + 0.1 : 0.06, 0.02, x, y + h / 2, z, k.trim, { mat: k.sTrim });
  b.box(alongZ ? 0.04 : w, h, alongZ ? w : 0.04, x + (alongZ ? 0.02 : 0), y + h / 2, z + (alongZ ? 0 : 0.02), 0x1c1e22, { mat: SURF.panel });
  b.box(alongZ ? 0.045 : w * 0.9, 0.03, alongZ ? w * 0.9 : 0.045, x + (alongZ ? 0.022 : 0), y + h + 0.05, z + (alongZ ? 0 : 0.022), k.light, { em: 1.4 });
}

function baseKit(style: CivStyle): Kit {
  const P: Record<CivStyle, [number, number, number, number, number, number]> = {
    imperial: [0x8c9098, 0x5e626a, 0x3e424a, 0x2a2c30, 0xff4030, 0x1a2a3a],
    rebel: [0xb8a888, 0x8c7c5c, 0x6e6a58, 0x4a4436, 0xffb040, 0x2a3a3a],
    republic: [0xdcd8cc, 0xa8a49a, 0x8e3a32, 0x5a5650, 0x6ab8ff, 0x1a2a40],
    cis: [0xa07050, 0x6e4c36, 0x5a3a2a, 0x3a2a20, 0xff7a30, 0x2a1a10],
    tradefed: [0xa0906c, 0x6e5e44, 0x4e4434, 0x3a3428, 0xff9a40, 0x2a2010],
    naboo: [0xe8dcc0, 0xc4b48c, 0x4e8a6c, 0x8a7a5a, 0xffd890, 0x2a3a50],
    gungan: [0x7a9a7a, 0x5a7a6a, 0x7ab0c8, 0x4a6a5a, 0x8af0ff, 0x6ad0e8],
    wookiee: [0x8a6a3a, 0x6a4a2a, 0x5a7a3a, 0x4a3420, 0xffb050, 0x3a2a1a],
  };
  const SW: Record<CivStyle, [number, number, number]> = {
    imperial: [SURF.hull, SURF.panel, SURF.panel],
    rebel: [SURF.plaster, SURF.concrete, SURF.panel],
    republic: [SURF.concrete, SURF.concrete, SURF.panel],
    cis: [SURF.plaster, SURF.plaster, SURF.rock],
    tradefed: [SURF.hull, SURF.panel, SURF.panel],
    naboo: [SURF.concrete, SURF.panel, SURF.concrete],
    gungan: [SURF.plaster, SURF.glass, SURF.leather],
    wookiee: [SURF.wood, SURF.wood, SURF.wood],
  };
  const [wall, wall2, roof, trim, light, glass] = P[style];
  const [sWall, sRoof, sTrim] = SW[style];
  const k: Kit = {
    wall, wall2, roof, trim, light, glass, sWall, sRoof, sTrim,
    block(b, x, y, z, w, h, d, alt) {
      const c = alt ? wall2 : wall;
      const prev = b.defMat;
      b.surf(sWall);
      switch (style) {
        case 'imperial': {
          // bloque de duracero con zócalo, contrafuertes, banda oscura y franja de equipo
          b.rbox(w, h, d, 0.05, x, y + h / 2, z, c);
          b.rbox(w * 1.04, h * 0.14, d * 1.04, 0.03, x, y + h * 0.07, z, wall2, { mat: SURF.panel });
          b.rbox(w * 1.02, h * 0.07, d * 1.02, 0.015, x, y + h * 0.84, z, trim, { mat: SURF.panel });
          b.box(w * 1.012, 0.045, d * 1.012, x, y + h * 0.55, z, C.team, { team: 1, mat: SURF.panel });
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rbox(0.12, h * 0.98, 0.12, 0.02, x + sx * (w / 2), y + h * 0.49, z + sz * (d / 2), wall2, { mat: SURF.panel });
          windows(b, k, x, y + h * 0.7, z, w, d, h);
          break;
        }
        case 'rebel': {
          // búnker: base de hormigón y bóveda, sacos terreros
          b.rbox(w, h * 0.62, d, 0.06, x, y + h * 0.31, z, c);
          b.cyl(Math.min(w, d) * 0.5, Math.min(w, d) * 0.5, Math.max(w, d) * 0.98, x, y + h * 0.62, z, wall2, { mat: SURF.concrete, rx: w > d ? 0 : Math.PI / 2, rz: w > d ? Math.PI / 2 : 0, seg: 16, sz: (h * 0.6) / Math.min(w, d) });
          b.box(w * 1.01, 0.05, d * 1.01, x, y + h * 0.42, z, C.team, { team: 1 });
          for (let i = 0; i < Math.round(w / 0.3); i++) b.ell(0.13, 0.07, 0.09, x - w / 2 + 0.15 + i * 0.3, y + 0.07, z + d / 2 + 0.06, 0x8a7a58, { mat: SURF.fabric, seg: 8 });
          windows(b, k, x, y + h * 0.3, z, w, d, h * 0.6, { tall: 0.08 });
          break;
        }
        case 'republic': {
          b.rbox(w, h, d, 0.04, x, y + h / 2, z, c);
          b.rbox(w * 1.05, h * 0.12, d * 1.05, 0.03, x, y + h * 0.06, z, wall2);
          b.rbox(w * 1.03, 0.07, d * 1.03, 0.02, x, y + h, z, wall2);
          b.box(w * 1.012, 0.06, d * 1.012, x, y + h * 0.78, z, C.team, { team: 1 });
          windows(b, k, x, y + h * 0.5, z, w, d, h);
          break;
        }
        case 'cis': {
          // arquitectura geonosiana: torres orgánicas de adobe
          const r = Math.min(w, d);
          b.lathe([[r * 0.56, 0], [r * 0.6, h * 0.15], [r * 0.5, h * 0.55], [r * 0.38, h * 0.95], [r * 0.3, h * 1.1], [r * 0.18, h * 1.3], [0.0, h * 1.36]], x, y, z, c, { seg: 14 });
          b.ell(r * 0.2, h * 0.25, r * 0.2, x + r * 0.42, y + h * 0.35, z + r * 0.15, wall2, { seg: 10 });
          b.torus(r * 0.53, 0.04, x, y + h * 0.42, z, C.team, { team: 1, rx: Math.PI / 2, seg: 18 });
          for (let i = 0; i < 4; i++) {
            const a = i * 1.57 + 0.4;
            b.ell(0.05, 0.08, 0.05, x + Math.cos(a) * r * 0.5, y + h * 0.5, z + Math.sin(a) * r * 0.5, 0x1a120c, { seg: 8, em: 0.15 });
          }
          break;
        }
        case 'tradefed': {
          b.rbox(w, h * 0.8, d, 0.06, x, y + h * 0.4, z, c);
          b.ell(Math.min(w, d) * 0.48, Math.min(w, d) * 0.26, Math.min(w, d) * 0.48, x, y + h * 0.8, z, wall2, { mat: SURF.panel, seg: 16 });
          b.box(w * 1.012, 0.06, d * 1.012, x, y + h * 0.65, z, C.team, { team: 1 });
          for (const sx of [-1, 1]) b.rbox(0.08, h * 0.78, d * 1.02, 0.02, x + sx * w * 0.3, y + h * 0.39, z, wall2, { mat: SURF.panel });
          windows(b, k, x, y + h * 0.45, z, w, d, h * 0.8, { round: true });
          break;
        }
        case 'naboo': {
          // mármol de Theed con columnas, cornisa y friso
          b.rbox(w, h, d, 0.03, x, y + h / 2, z, c);
          b.rbox(w * 1.08, h * 0.07, d * 1.08, 0.02, x, y + h, z, wall2);
          b.rbox(w * 1.06, h * 0.08, d * 1.06, 0.02, x, y + h * 0.04, z, wall2);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            b.cyl(0.075, 0.085, h * 0.92, x + sx * w * 0.5, y + h * 0.5, z + sz * d * 0.5, 0xf4ecd8, { seg: 12 });
            b.rbox(0.2, 0.06, 0.2, 0.015, x + sx * w * 0.5, y + h * 0.95, z + sz * d * 0.5, wall2);
          }
          b.box(w * 1.012, 0.05, d * 1.012, x, y + h * 0.84, z, C.team, { team: 1 });
          windows(b, k, x, y + h * 0.5, z, w, d, h, { tall: Math.min(0.32, h * 0.45) });
          break;
        }
        case 'gungan': {
          const r = Math.min(w, d);
          b.cyl(r * 0.4, r * 0.5, h * 0.4, x, y + h * 0.2, z, c, { seg: 14, mat: SURF.plaster });
          b.ell(r * 0.55, h * 0.48, r * 0.55, x, y + h * 0.48, z, roof, { em: 0.15, seg: 18, mat: SURF.glass });
          b.torus(r * 0.45, 0.04, x, y + h * 0.38, z, C.team, { team: 1, rx: Math.PI / 2, seg: 18 });
          break;
        }
        case 'wookiee': {
          // madera: troncos, vigas y bandas
          b.rbox(w, h, d, 0.05, x, y + h / 2, z, c);
          for (let i = 0; i < 3; i++) b.rbox(w * 1.03, 0.05, d * 1.03, 0.015, x, y + h * (0.2 + i * 0.3), z, wall2);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.08, 0.1, h * 1.05, x + sx * w * 0.5, y + h * 0.52, z + sz * d * 0.5, 0x5a3a20, { seg: 9 });
          b.box(w * 1.04, 0.06, d * 1.04, x, y + h * 0.95, z, C.team, { team: 1 });
          windows(b, k, x, y + h * 0.55, z, w, d, h, { tall: 0.12 });
          break;
        }
      }
      b.surf(prev);
    },
    roofOn(b, x, y, z, w, d) {
      const prev = b.defMat;
      b.surf(sRoof);
      switch (style) {
        case 'imperial':
          b.rbox(w * 0.84, 0.12, d * 0.84, 0.03, x, y + 0.06, z, roof);
          roofGear(b, k, x, y + 0.12, z, w * 0.84, d * 0.84, w * 7 + d);
          break;
        case 'republic':
          b.wedge(w, 0.35, d, x, y, z, roof, { ry: w > d ? Math.PI / 2 : 0, mat: SURF.concrete, ms: 2 });
          break;
        case 'naboo':
          b.ell(Math.min(w, d) * 0.45, Math.min(w, d) * 0.32, Math.min(w, d) * 0.45, x, y, z, roof, { seg: 18 });
          b.cone(0.06, 0.3, x, y + Math.min(w, d) * 0.33 + 0.12, z, 0xd8b040, { mat: SURF.panel, ms: 3 });
          break;
        case 'wookiee':
          b.cone(Math.max(w, d) * 0.72, 0.65, x, y + 0.3, z, roof, { seg: 10, mat: SURF.fur, ms: 0.6 });
          break;
        case 'rebel':
          b.rbox(w * 0.3, 0.12, d * 0.3, 0.03, x, y + 0.06, z, roof);
          roofGear(b, k, x, y + 0.1, z, w * 0.5, d * 0.5, w * 3 + d);
          break;
        case 'cis':
          // remate geonosiano: aguja con luz
          b.cone(0.12, 0.5, x, y + 0.2, z, wall2, { seg: 10, mat: SURF.plaster });
          b.sphere(0.05, x, y + 0.47, z, light, { em: 1.6, seg: 8 });
          break;
        case 'gungan':
          b.sphere(Math.min(w, d) * 0.22, x, y + 0.05, z, roof, { em: 0.15, seg: 14, mat: SURF.glass });
          break;
        case 'tradefed':
          b.cyl(0.08, 0.1, 0.25, x, y + 0.08, z, trim, { seg: 10, mat: SURF.panel });
          b.ell(0.18, 0.05, 0.18, x, y + 0.22, z, wall2, { seg: 12, mat: SURF.panel });
          break;
        default:
          b.rbox(w * 0.6, 0.1, d * 0.6, 0.03, x, y + 0.05, z, roof);
          roofGear(b, k, x, y + 0.1, z, w * 0.6, d * 0.6, w * 5 + d);
      }
      b.surf(prev);
    },
    dome(b, x, y, z, r) {
      if (style === 'gungan') b.sphere(r, x, y, z, roof, { em: 0.15, seg: 18, mat: SURF.glass });
      else if (style === 'wookiee') b.cone(r * 1.2, r * 1.2, x, y + r * 0.5, z, roof, { seg: 10, mat: SURF.fur, ms: 0.6 });
      else {
        b.ell(r, r * 0.65, r, x, y, z, style === 'naboo' ? roof : wall2, { seg: 18, mat: SURF.panel });
        b.torus(r * 0.98, 0.03, x, y + 0.02, z, trim, { rx: Math.PI / 2, seg: 20, mat: SURF.panel });
      }
    },
    tower(b, x, z, r, h) {
      const prev = b.defMat;
      b.surf(sWall);
      switch (style) {
        case 'cis':
          b.lathe([[r * 1.2, 0], [r * 1.0, h * 0.4], [r * 0.6, h * 0.85], [0.0, h]], x, 0, z, wall, { seg: 12 });
          b.sphere(r * 0.45, x, h * 0.72, z, light, { em: 1, seg: 10 });
          break;
        case 'wookiee':
          b.cyl(r * 1.1, r * 1.3, h, x, h / 2, z, 0x5a3a20, { seg: 10 });
          b.cone(r * 2.4, r * 2.2, x, h + r, z, 0x4a6a2a, { seg: 10, mat: SURF.fur, ms: 0.6 });
          break;
        case 'gungan':
          b.cyl(r * 0.6, r * 0.8, h * 0.7, x, h * 0.35, z, wall, { seg: 12 });
          b.sphere(r * 1.3, x, h * 0.8, z, roof, { em: 0.15, seg: 14, mat: SURF.glass });
          break;
        case 'naboo':
          b.cyl(r, r * 1.1, h, x, h / 2, z, wall, { seg: 16 });
          b.ell(r * 1.15, r * 0.92, r * 1.15, x, h, z, roof, { seg: 16, mat: SURF.panel });
          windows(b, k, x, h * 0.7, z, r * 1.6, r * 1.6, h * 0.3, { n: 1, round: true });
          break;
        default: {
          const seg = style === 'imperial' ? 8 : 14;
          b.cyl(r, r * 1.15, h, x, h / 2, z, wall2, { seg });
          b.cyl(r * 1.25, r * 1.25, h * 0.1, x, h, z, trim, { seg, mat: SURF.panel });
          b.cyl(r * 1.05, r * 1.05, 0.06, x, h * 0.55, z, C.team, { team: 1, seg });
          windows(b, k, x, h * 0.8, z, r * 1.7, r * 1.7, h * 0.2, { n: 1 });
        }
      }
      b.surf(prev);
    },
  };
  return k;
}

function lamp(b: MB, k: Kit, x: number, y: number, z: number, r = 0.06) {
  b.cyl(r * 0.6, r * 0.8, r * 1.2, x, y - r * 0.9, z, k.trim, { mat: SURF.panel, seg: 8 });
  b.sphere(r, x, y, z, k.light, { em: 2.2, seg: 8, mat: SURF.light });
}

function antenna(b: MB, k: Kit, x: number, y: number, z: number, h: number) {
  b.cyl(0.025, 0.035, h, x, y + h / 2, z, k.trim, { seg: 6, mat: SURF.panel });
  b.cyl(0.05, 0.05, 0.02, x, y + h * 0.6, z, k.trim, { seg: 8, mat: SURF.panel });
  lamp(b, k, x, y + h, z, 0.045);
}

function banner(b: MB, x: number, y: number, z: number, h: number) {
  b.cyl(0.025, 0.03, h, x, y + h / 2, z, C.dgray, { seg: 8, mat: SURF.panel });
  b.sphere(0.04, x, y + h + 0.03, z, C.gold, { seg: 8, mat: SURF.panel });
  b.part('flag', 'flag', [x, y + h, z]);
  b.rbox(0.015, h * 0.38, 0.36, 0.005, x, y + h * 0.79, z + 0.19, C.team, { team: 1, mat: SURF.fabric });
  b.part('body');
}

/** Oscurece / aclara un color hexadecimal */
function shade(hex: number, f: number) {
  return THREE_COLOR(hex).mul(f);
}
function THREE_COLOR(hex: number) {
  return {
    mul(f: number) {
      const r = Math.min(255, Math.round(((hex >> 16) & 255) * f)), g = Math.min(255, Math.round(((hex >> 8) & 255) * f)), bl = Math.min(255, Math.round((hex & 255) * f));
      return (r << 16) | (g << 8) | bl;
    },
  };
}

export function buildBuildingModel(defId: string, style: CivStyle): ModelDef {
  const bd = BUILDINGS[defId];
  const b = new MB();
  b.bevel = 0.025;
  const k = baseKit(style);
  const S = bd.size;
  const half = S / 2;
  const w = S * 0.9;
  b.part('body');
  // cimientos: losa biselada con bordillo
  if (!bd.farm && !bd.wall) {
    const fc = style === 'gungan' ? 0x5a7a6a : style === 'wookiee' ? 0x5a4a30 : style === 'cis' ? 0x7a5a42 : 0x6e6e6a;
    b.rbox(S * 0.98, 0.14, S * 0.98, 0.04, 0, 0.05, 0, fc, { mat: style === 'wookiee' ? SURF.wood : SURF.concrete });
    b.rbox(S * 0.9, 0.05, S * 0.9, 0.02, 0, 0.13, 0, shade(fc, 0.85), { mat: SURF.concrete });
  }
  switch (defId) {
    case 'command_center': {
      k.block(b, 0, 0.1, 0, w * 0.82, 1.3, w * 0.82);
      k.roofOn(b, 0, 1.4, 0, w * 0.82, w * 0.82);
      k.block(b, w * 0.28, 0.1, w * 0.28, w * 0.4, 0.8, w * 0.4, true);
      k.block(b, -w * 0.3, 0.1, -w * 0.25, w * 0.35, 0.9, w * 0.4, true);
      k.tower(b, -w * 0.32, w * 0.3, 0.22, 2.6);
      k.dome(b, 0.1, 1.55, -0.1, 0.55);
      antenna(b, k, w * 0.3, 0.9, w * 0.3, 0.9);
      if (style !== 'gungan') {
        // antena parabólica giratoria
        b.part('radar', 'radar', [-w * 0.32, 2.62, w * 0.3]);
        b.cyl(0.35, 0.05, 0.12, -w * 0.32 + 0.08, 2.72, w * 0.3, 0xd0d0d0, { rz: 0.9, seg: 12 });
        b.cyl(0.015, 0.015, 0.22, -w * 0.32 + 0.16, 2.8, w * 0.3, C.dgray, { rz: 0.9, seg: 4 });
        b.part('body');
      }
      lamp(b, k, w * 0.42, 0.5, 0);
      lamp(b, k, 0, 0.5, w * 0.42);
      b.box(0.06, 0.55, 0.7, w * 0.42, 0.38, -w * 0.05, C.dark); // puerta
      banner(b, w * 0.45, 0.1, -w * 0.42, 1.7);
      break;
    }
    case 'shelter': {
      if (style === 'rebel' || style === 'republic' || style === 'imperial') {
        b.cyl(0.62, 0.62, 1.2, 0, 0.3, 0, k.wall, { rx: Math.PI / 2, seg: 10, sy: 1 });
        b.box(1.2, 0.3, 1.2, 0, 0.15, 0, k.wall2);
        b.box(0.04, 0.4, 0.3, 0.6, 0.35, 0, C.dark);
        b.box(1.22, 0.05, 0.1, 0, 0.92, 0, C.team, { team: 1 });
        lamp(b, k, 0.62, 0.65, 0.25, 0.04);
      } else if (style === 'gungan') {
        b.sphere(0.6, 0, 0.45, 0, k.roof, { em: 0.12, seg: 12 });
        b.cyl(0.4, 0.5, 0.2, 0, 0.1, 0, k.wall);
        b.torus(0.45, 0.04, 0, 0.3, 0, C.team, { team: 1, rx: Math.PI / 2 });
      } else if (style === 'wookiee') {
        b.cyl(0.55, 0.6, 0.8, 0, 0.4, 0, k.wall, { seg: 8 });
        b.cone(0.8, 0.6, 0, 1.1, 0, k.roof, { seg: 8 });
        b.box(0.04, 0.45, 0.25, 0.58, 0.3, 0, C.dark);
        b.torus(0.57, 0.04, 0, 0.7, 0, C.team, { team: 1, rx: Math.PI / 2, seg: 8 });
      } else if (style === 'cis') {
        b.cone(0.6, 1.3, 0, 0.65, 0, k.wall, { seg: 7 });
        b.torus(0.45, 0.04, 0, 0.45, 0, C.team, { team: 1, rx: Math.PI / 2, seg: 7 });
        lamp(b, k, 0.35, 0.6, 0, 0.05);
      } else {
        k.block(b, 0, 0.1, 0, 1.2, 0.75, 1.2);
        k.roofOn(b, 0, 0.85, 0, 1.2, 1.2);
      }
      break;
    }
    case 'food_center':
    case 'carbon_center':
    case 'mining_center': {
      k.block(b, -0.2, 0.1, 0, w * 0.6, 0.9, w * 0.85);
      k.roofOn(b, -0.2, 1.0, 0, w * 0.6, w * 0.85);
      if (defId === 'food_center') {
        // silos
        b.cyl(0.25, 0.25, 1.1, 0.5, 0.65, 0.35, k.wall2, { seg: 10 });
        b.sphere(0.25, 0.5, 1.2, 0.35, k.roof, { sy: 0.6 });
        b.cyl(0.2, 0.2, 0.8, 0.55, 0.5, -0.35, k.wall2, { seg: 10 });
        b.box(0.3, 0.25, 0.3, 0.55, 0.22, -0.35, 0x6a8a3a); // cajas de comida
      } else if (defId === 'carbon_center') {
        b.box(0.5, 0.35, 0.8, 0.5, 0.3, 0, 0x5a4030); // troncos
        for (let i = 0; i < 3; i++) b.cyl(0.08, 0.08, 0.8, 0.45, 0.2 + i * 0.12, -0.2 + i * 0.2, 0x6a4a2a, { rx: Math.PI / 2 });
        b.box(0.08, 0.9, 0.08, 0.7, 0.6, 0.4, C.dgray);
        b.box(0.5, 0.06, 0.06, 0.5, 1.05, 0.4, C.dgray);
      } else {
        // cinta / grúa minera con cristal
        b.box(0.7, 0.08, 0.15, 0.45, 0.5, 0.2, C.dgray, { rz: 0.4 });
        b.crystal(0.12, 0.25, 0.6, 0.3, -0.3, 0x5ad8ff, { em: 1.4 });
        b.dodeca(0.16, 0.35, 0.25, -0.4, 0x8a7a6a);
      }
      lamp(b, k, w * 0.2, 0.7, w * 0.35, 0.05);
      banner(b, -w * 0.45, 0.1, w * 0.42, 1.2);
      break;
    }
    case 'farm': {
      // parcela de cultivo de humedad: surcos de tierra, plantas en hilera y vaporizador
      const soil = style === 'gungan' ? 0x4a5a3a : style === 'wookiee' ? 0x5a4028 : 0x6e5438;
      const crop = style === 'imperial' || style === 'cis' || style === 'tradefed' ? 0x6a8a38 : style === 'gungan' ? 0x4a9a6a : 0x7a9a3a;
      const crop2 = style === 'gungan' ? 0x6ab08a : 0x9aae4a;
      // losa gruesa: en terreno irregular no debe quedar enterrada
      b.rbox(S * 0.98, 0.22, S * 0.98, 0.03, 0, -0.03, 0, soil, { mat: SURF.plaster, ms: 2 });
      // bordes de madera / piedra
      for (const sz of [-1, 1]) b.rbox(S * 0.98, 0.14, 0.07, 0.02, 0, 0.06, sz * S * 0.47, 0x5a4a38, { mat: SURF.wood });
      for (const sx of [-1, 1]) b.rbox(0.07, 0.14, S * 0.98, 0.02, sx * S * 0.47, 0.06, 0, 0x5a4a38, { mat: SURF.wood });
      b.part('crops', 'static');
      const rows = 6;
      for (let i = 0; i < rows; i++) {
        const z = -S * 0.38 + (i * S * 0.76) / (rows - 1);
        // caballón de tierra
        b.limb([-S * 0.42, 0.09, z], [S * 0.42, 0.09, z], 0.07, 0.07, soil, { mat: SURF.plaster, ms: 2, seg: 6 });
        for (let j = 0; j < 6; j++) {
          const x = -S * 0.38 + j * S * 0.152 + ((i * 7 + j * 3) % 5) * 0.012;
          const hgt = 0.24 + ((i * 3 + j * 5) % 7) * 0.02;
          const c = (i + j) % 3 ? crop : crop2;
          // mata de hojas: tres conos inclinados
          for (let k = 0; k < 3; k++) {
            const a = k * 2.1 + i + j;
            b.cone(0.06, hgt, x + Math.cos(a) * 0.05, 0.13 + hgt / 2, z + Math.sin(a) * 0.05, c, { seg: 5, rx: Math.sin(a) * 0.45, rz: -Math.cos(a) * 0.45, mat: SURF.leaves, ms: 3 });
          }
        }
      }
      b.part('body');
      // vaporizador de humedad
      b.cyl(0.06, 0.08, 1.1, S * 0.4, 0.55, S * 0.4, 0xd0ccc0, { seg: 10, mat: SURF.panel });
      for (let i = 0; i < 3; i++) b.cyl(0.16, 0.16, 0.04, S * 0.4, 0.62 + i * 0.18, S * 0.4, 0xb0aca0, { seg: 12, mat: SURF.panel });
      b.cyl(0.1, 0.06, 0.12, S * 0.4, 1.15, S * 0.4, 0x8a8478, { seg: 10, mat: SURF.panel });
      b.rbox(0.1, 0.06, 0.1, 0.015, S * 0.4, 1.24, S * 0.4, C.team, { team: 1 });
      b.cyl(0.12, 0.14, 0.12, S * 0.4, 0.06, S * 0.4, 0x6a6a64, { seg: 10, mat: SURF.concrete });
      break;
    }
    case 'power_core': {
      b.cyl(0.6, 0.7, 0.3, 0, 0.25, 0, k.wall2, { seg: 12 });
      b.cyl(0.32, 0.32, 1.5, 0, 1.0, 0, k.trim, { seg: 10 });
      b.cyl(0.24, 0.24, 1.3, 0, 1.0, 0, 0x7ae0ff, { em: 2.2, seg: 10 });
      for (let i = 0; i < 3; i++) b.torus(0.36, 0.05, 0, 0.55 + i * 0.4, 0, k.wall, { rx: Math.PI / 2 });
      b.sym((s) => b.box(0.15, 1.6, 0.15, s * 0.55, 0.85, 0, k.wall));
      b.box(1.3, 0.12, 0.15, 0, 1.7, 0, k.wall);
      b.torus(0.62, 0.04, 0, 0.42, 0, C.team, { team: 1, rx: Math.PI / 2 });
      break;
    }
    case 'troop_center':
    case 'mech_factory':
    case 'heavy_weapons': {
      const big = defId !== 'troop_center';
      k.block(b, -0.15, 0.1, 0, w * 0.75, big ? 1.4 : 1.15, w * 0.9);
      k.roofOn(b, -0.15, big ? 1.5 : 1.25, 0, w * 0.75, w * 0.9);
      // portón
      b.box(0.08, big ? 0.9 : 0.65, w * 0.5, w * 0.23 + 0.04, big ? 0.55 : 0.43, 0, C.dark);
      b.box(0.09, 0.08, w * 0.52, w * 0.23 + 0.05, big ? 1.02 : 0.8, 0, k.light, { em: 1.2 });
      if (defId === 'mech_factory') {
        b.box(0.2, 1.8, 0.2, -w * 0.4, 0.9, w * 0.38, k.trim);
        b.box(1.4, 0.15, 0.15, -w * 0.05, 1.8, w * 0.38, k.trim); // grúa
        b.box(0.1, 0.5, 0.1, w * 0.3, 1.5, w * 0.38, C.dgray);
      } else if (defId === 'heavy_weapons') {
        k.tower(b, -w * 0.38, -w * 0.36, 0.2, 2.2);
        k.tower(b, -w * 0.38, w * 0.36, 0.2, 2.0);
        b.cyl(0.08, 0.08, 1.0, w * 0.3, 1.7, 0, C.gun, { rz: Math.PI / 2 - 0.3 });
      } else {
        // centro de tropas: campo de entrenamiento y barracones
        b.box(0.6, 0.06, 0.4, w * 0.35, 0.13, -w * 0.32, 0x5a5a50);
        for (let i = 0; i < 3; i++) b.box(0.05, 0.3, 0.05, w * 0.25 + i * 0.12, 0.25, -w * 0.32, C.dgray);
      }
      banner(b, w * 0.45, 0.1, w * 0.45, 1.5);
      lamp(b, k, w * 0.28, big ? 1.2 : 0.95, w * 0.3, 0.05);
      lamp(b, k, w * 0.28, big ? 1.2 : 0.95, -w * 0.3, 0.05);
      break;
    }
    case 'research_center': {
      k.block(b, -0.1, 0.1, 0, w * 0.7, 1.0, w * 0.75);
      k.dome(b, -0.1, 1.15, 0, 0.6);
      b.cyl(0.03, 0.05, 0.7, w * 0.3, 1.0, w * 0.3, k.trim);
      // parabólica giratoria
      b.part('radar', 'radar', [w * 0.3, 1.38, w * 0.3]);
      b.cyl(0.5, 0.05, 0.25, w * 0.3, 1.45, w * 0.3, 0xd8d8d8, { rx: -0.5, seg: 14 });
      b.sphere(0.05, w * 0.3, 1.58, w * 0.3 - 0.12, k.light, { em: 2 });
      b.part('body');
      b.torus(0.3, 0.04, -0.1, 1.6, 0, k.light, { em: 1.6, rx: Math.PI / 2 });
      banner(b, w * 0.45, 0.1, -w * 0.45, 1.3);
      break;
    }
    case 'spaceport': {
      b.cyl(half * 0.9, half * 0.92, 0.25, 0.2, 0.2, 0.2, k.wall2, { seg: 16 });
      b.torus(half * 0.75, 0.05, 0.2, 0.34, 0.2, k.light, { em: 1.5, rx: Math.PI / 2, seg: 24 });
      k.block(b, -w * 0.32, 0.1, -w * 0.32, 1.0, 1.3, 1.0, true);
      k.tower(b, -w * 0.38, -w * 0.38, 0.18, 2.4);
      // radar de control de tráfico
      b.part('radar', 'radar', [-w * 0.38, 2.45, -w * 0.38]);
      b.box(0.08, 0.12, 0.7, -w * 0.38, 2.5, -w * 0.38, 0xd0d0d0);
      b.box(0.04, 0.04, 0.6, -w * 0.38 + 0.05, 2.52, -w * 0.38, k.light, { em: 1.6 });
      b.part('body');
      // nave aparcada (carguero)
      b.box(1.0, 0.3, 0.7, 0.3, 0.6, 0.3, 0xb8b4a8);
      b.cyl(0.35, 0.35, 0.3, 0.3, 0.6, 0.3, 0xb8b4a8, { seg: 12 });
      b.box(0.4, 0.15, 0.3, 0.85, 0.6, 0.3, 0xa8a498);
      b.box(0.2, 0.08, 0.25, 0.65, 0.78, 0.3, C.glass);
      b.box(0.6, 0.05, 0.72, 0.2, 0.77, 0.3, C.team, { team: 1 });
      banner(b, w * 0.47, 0.1, -w * 0.47, 1.6);
      break;
    }
    case 'turret':
    case 'aa_turret': {
      // base fortificada del estilo de la civilización y cabezal giratorio blindado
      const prev = b.defMat;
      b.surf(k.sWall);
      if (style === 'gungan' || style === 'wookiee') b.cyl(0.36, 0.46, 0.85, 0, 0.42, 0, k.wall, { seg: 14 });
      else {
        b.cyl(0.36, 0.46, 0.8, 0, 0.4, 0, k.wall, { seg: style === 'imperial' ? 8 : 14 });
        b.cyl(0.42, 0.48, 0.14, 0, 0.12, 0, k.wall2, { seg: style === 'imperial' ? 8 : 14 });
      }
      b.surf(prev);
      b.torus(0.38, 0.035, 0, 0.72, 0, C.team, { team: 1, rx: Math.PI / 2, seg: 16 });
      b.cyl(0.32, 0.34, 0.08, 0, 0.84, 0, k.trim, { seg: 16, mat: SURF.panel });
      b.part('turret', 'head', [0, 0.95, 0]);
      b.surf(SURF.panel);
      b.rbox(0.52, 0.28, 0.46, 0.06, 0, 1.0, 0, k.wall2, { ms: 2 });
      b.rbox(0.2, 0.14, 0.36, 0.03, -0.25, 0.98, 0, k.trim, { mat: SURF.grate });
      b.rbox(0.08, 0.06, 0.28, 0.02, 0.22, 1.12, 0, k.glass, { mat: SURF.glass, em: 0.4 });
      if (defId === 'turret') {
        b.sym((sd) => {
          b.limb([0.2, 1.0, sd * 0.11], [0.68, 1.0, sd * 0.11], 0.045, 0.035, C.gun, { seg: 10 });
          b.cyl(0.05, 0.05, 0.06, 0.66, 1.0, sd * 0.11, 0x2a2a2e, { rz: Math.PI / 2, seg: 10 });
          b.rbox(0.18, 0.08, 0.08, 0.02, 0.28, 1.0, sd * 0.11, 0x3a3c40);
        });
      } else
        b.sym((sd) => {
          b.rbox(0.34, 0.24, 0.16, 0.03, 0.12, 1.16, sd * 0.29, C.dgray, { rz: 0.6 });
          for (let i = 0; i < 2; i++) b.cyl(0.035, 0.035, 0.05, 0.27, 1.27 - i * 0.07, sd * 0.29 + (i ? -0.04 : 0.04), C.glowRed, { em: 1.5, rz: Math.PI / 2 - 0.6, seg: 8 });
        });
      b.surf(null);
      lamp(b, k, 0.0, 1.2, 0.2, 0.035);
      b.part('body');
      break;
    }
    case 'wall':
    case 'gate': {
      const h = defId === 'gate' ? 1.1 : 0.95;
      if (style === 'wookiee' || style === 'gungan') {
        b.box(0.9, h, 0.9, 0, h / 2, 0, style === 'gungan' ? 0x6a8a7a : 0x6a4a2a);
        if (style === 'gungan') b.box(0.95, h * 0.6, 0.95, 0, h * 0.6, 0, 0x8ae0f0, { em: 0.4 });
      } else {
        b.box(0.95, h, 0.95, 0, h / 2, 0, k.wall);
        b.box(1.0, 0.1, 1.0, 0, h, 0, k.trim);
      }
      b.box(0.97, 0.06, 0.97, 0, h * 0.7, 0, C.team, { team: 1 });
      if (defId === 'gate') {
        b.box(0.97, 0.5, 0.5, 0, 0.3, 0, C.dark);
        lamp(b, k, 0, h + 0.1, 0, 0.06);
      }
      break;
    }
    case 'temple': {
      if (style === 'imperial' || style === 'cis' || style === 'tradefed') {
        // templo sith: pirámide oscura con aguja
        b.box(w, 0.4, w, 0, 0.3, 0, 0x2a2a30);
        b.box(w * 0.75, 0.4, w * 0.75, 0, 0.7, 0, 0x34343a);
        b.box(w * 0.5, 0.4, w * 0.5, 0, 1.1, 0, 0x3e3e44);
        b.cone(0.3, 1.6, 0, 2.1, 0, 0x1a1a1e, { seg: 4, ry: Math.PI / 4 });
        b.sphere(0.12, 0, 2.95, 0, 0xff2a2a, { em: 2.5 });
        b.box(0.05, 0.5, 0.4, w * 0.5, 0.45, 0, 0xff3a2a, { em: 1.2 });
      } else if (style === 'wookiee') {
        b.cyl(0.6, 0.8, 2.6, 0, 1.3, 0, 0x5a3a20, { seg: 10 });
        b.cone(1.5, 1.4, 0, 3.2, 0, 0x3a6a2a, { seg: 10 });
        b.cyl(1.1, 1.1, 0.12, 0, 1.6, 0, k.wall, { seg: 12 });
        lamp(b, k, 0.6, 1.8, 0.6);
      } else {
        // templo jedi: zigurat con agujas
        b.box(w, 0.5, w, 0, 0.35, 0, k.wall);
        b.box(w * 0.75, 0.5, w * 0.75, 0, 0.85, 0, k.wall);
        b.box(w * 0.5, 0.5, w * 0.5, 0, 1.35, 0, k.wall);
        b.cyl(0.12, 0.18, 1.4, 0, 2.3, 0, k.wall2, { seg: 8 });
        b.sym((s) => b.cyl(0.08, 0.12, 0.9, s * w * 0.32, 1.55, s * w * 0.32, k.wall2, { seg: 8 }));
        b.sym((s) => b.cyl(0.08, 0.12, 0.9, s * w * 0.32, 1.55, -s * w * 0.32, k.wall2, { seg: 8 }));
        b.sphere(0.1, 0, 3.05, 0, 0x6ac8ff, { em: 2.4 });
      }
      b.torus(w * 0.48, 0.04, 0, 0.15, 0, C.team, { team: 1, rx: Math.PI / 2, seg: 4, ry: Math.PI / 4 });
      banner(b, w * 0.5, 0.1, w * 0.5, 1.4);
      break;
    }
    case 'airbase': {
      b.box(S * 0.95, 0.18, S * 0.95, 0, 0.15, 0, k.wall2);
      b.cyl(half * 0.55, half * 0.55, 0.05, w * 0.15, 0.26, w * 0.15, 0x3a3a3e, { seg: 20 });
      b.torus(half * 0.5, 0.04, w * 0.15, 0.3, w * 0.15, k.light, { em: 1.5, rx: Math.PI / 2, seg: 20 });
      b.box(0.2, 0.06, 0.2, w * 0.15, 0.3, w * 0.15, C.team, { team: 1 });
      k.block(b, -w * 0.35, 0.2, -w * 0.3, 1.0, 1.1, 1.3, true);
      k.tower(b, -w * 0.4, w * 0.38, 0.2, 2.6);
      b.box(0.45, 0.25, 0.45, -w * 0.4, 2.7, w * 0.38, C.glass, { em: 0.4 });
      lamp(b, k, w * 0.45, 0.4, w * 0.45);
      lamp(b, k, -w * 0.05, 0.4, w * 0.45);
      banner(b, w * 0.47, 0.2, -w * 0.47, 1.6);
      break;
    }
    case 'shield_gen': {
      b.cyl(0.55, 0.65, 0.4, 0, 0.3, 0, k.wall2, { seg: 10 });
      b.cyl(0.08, 0.12, 1.6, 0, 1.2, 0, k.trim, { seg: 8 });
      b.sphere(0.4, 0, 2.05, 0, 0x7ae0ff, { em: 1.6, seg: 14 });
      b.sym((s) => b.box(0.1, 1.2, 0.1, s * 0.4, 0.9, 0, k.wall, { rz: s * 0.2 }));
      b.torus(0.6, 0.05, 0, 0.5, 0, C.team, { team: 1, rx: Math.PI / 2 });
      break;
    }
    case 'fortress': {
      // murallas con torres en las esquinas y bastión central
      const r = w * 0.45;
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        k.tower(b, sx * r, sz * r, 0.32, 2.2);
        lamp(b, k, sx * r, 2.35, sz * r, 0.07);
      }
      b.sym((s) => {
        b.box(0.35, 1.3, r * 2, s * r, 0.75, 0, k.wall);
        b.box(r * 2, 1.3, 0.35, 0, 0.75, s * r, k.wall);
      });
      b.box(r * 2.05, 0.08, 0.38, 0, 1.25, r, C.team, { team: 1 });
      b.box(r * 2.05, 0.08, 0.38, 0, 1.25, -r, C.team, { team: 1 });
      k.block(b, 0, 0.1, 0, w * 0.45, 2.3, w * 0.45, true);
      k.roofOn(b, 0, 2.4, 0, w * 0.45, w * 0.45);
      b.sym((s) => b.cyl(0.07, 0.07, 0.8, w * 0.12 + 0.3, 2.2, s * 0.2, C.gun, { rz: Math.PI / 2 }));
      b.box(0.1, 0.8, 0.8, r + 0.2, 0.5, 0, C.dark);
      banner(b, 0, 2.4, 0, 1.4);
      break;
    }
    case 'monument':
      monument(b, k, style, S);
      break;
    default:
      k.block(b, 0, 0.1, 0, w * 0.8, 1, w * 0.8);
  }
  return b.build(defId + ':' + style);
}

function monument(b: MB, k: Kit, style: CivStyle, S: number) {
  const w = S * 0.9;
  b.box(S * 0.98, 0.3, S * 0.98, 0, 0.15, 0, k.wall2);
  switch (style) {
    case 'imperial': {
      // Palacio imperial: gran pirámide escalonada con antena
      for (let i = 0; i < 5; i++) b.box(w * (1 - i * 0.17), 0.7, w * (1 - i * 0.17), 0, 0.6 + i * 0.7, 0, i % 2 ? k.wall : k.wall2);
      b.cyl(0.1, 0.2, 2.5, 0, 5.0, 0, k.trim, { seg: 6 });
      b.sphere(0.25, 0, 6.3, 0, 0xff3a2a, { em: 2.5 });
      // holograma de la Estrella de la Muerte
      b.sphere(0.9, 0, 7.6, 0, 0x6ac8ff, { em: 1.5, seg: 16 });
      break;
    }
    case 'rebel': {
      // Gran templo de Yavin
      b.box(w, 1.2, w, 0, 0.9, 0, 0x8a8a7a);
      b.box(w * 0.75, 1.2, w * 0.75, 0, 2.1, 0, 0x7a7a6a);
      b.box(w * 0.5, 1.2, w * 0.5, 0, 3.3, 0, 0x6a6a5a);
      b.box(w * 0.3, 0.8, w * 0.3, 0, 4.3, 0, 0x5a5a4a);
      b.box(0.1, 0.9, 1.6, w * 0.5, 0.75, 0, 0x2a2a2a);
      b.sphere(0.2, 0, 4.9, 0, 0xffb040, { em: 2.5 });
      break;
    }
    case 'republic': {
      // Senado galáctico: cúpula con cuenco
      b.cyl(w * 0.45, w * 0.5, 1.0, 0, 0.8, 0, k.wall, { seg: 20 });
      b.sphere(w * 0.45, 0, 1.3, 0, k.wall2, { sy: 0.6, seg: 20 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.cyl(0.08, 0.1, 2.4, Math.cos(a) * w * 0.48, 1.5, Math.sin(a) * w * 0.48, 0xf0ece0, { seg: 8 });
      }
      b.cyl(0.08, 0.08, 2.0, 0, 3.5, 0, k.trim);
      b.sphere(0.3, 0, 4.6, 0, 0x6ab8ff, { em: 2.5 });
      break;
    }
    case 'cis': {
      // Arena de Petranaki
      b.cyl(w * 0.5, w * 0.48, 1.8, 0, 1.1, 0, k.wall, { seg: 14 });
      b.cyl(w * 0.4, w * 0.4, 1.9, 0, 1.15, 0, 0x5a3a2a, { seg: 14 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.cone(0.3, 3.5, Math.cos(a) * w * 0.5, 2.5, Math.sin(a) * w * 0.5, k.wall2, { seg: 6 });
      }
      b.sphere(0.4, 0, 3.0, 0, 0xff7a30, { em: 2 });
      break;
    }
    case 'tradefed': {
      // Nave de control de droides (anillo con esfera)
      b.torus(w * 0.38, 0.45, 0, 1.6, 0, k.wall, { rx: Math.PI / 2, seg: 24 });
      b.sphere(1.0, 0, 1.6, 0, k.wall2, { seg: 16 });
      b.box(0.6, 2.2, 0.6, 0, 1.1, 0, k.trim);
      b.sphere(0.25, 0, 2.7, 0, 0xff9a40, { em: 2.5 });
      break;
    }
    case 'naboo': {
      // Palacio de Theed
      b.box(w, 1.6, w * 0.6, 0, 1.1, 0, 0xece2c8);
      b.sphere(w * 0.28, 0, 2.2, 0, 0x5a9a7a, { sy: 0.8, seg: 18 });
      b.sym((s) => {
        b.cyl(0.4, 0.45, 3.0, s * w * 0.4, 1.8, 0, 0xece2c8, { seg: 12 });
        b.sphere(0.45, s * w * 0.4, 3.3, 0, 0x5a9a7a, { seg: 12 });
      });
      b.cone(0.1, 0.8, 0, 3.6, 0, 0xd8b040);
      break;
    }
    case 'gungan': {
      // Otoh Gunga: burbujas
      b.sphere(1.6, 0, 1.8, 0, k.roof, { em: 0.15, seg: 18 });
      b.sym((s) => b.sphere(0.9, s * 1.2, 1.1, s * 0.6, k.roof, { em: 0.15, seg: 14 }));
      b.sphere(0.7, -0.6, 1.0, 1.2, k.roof, { em: 0.15, seg: 14 });
      b.cyl(0.5, 0.9, 0.6, 0, 0.5, 0, k.wall, { seg: 12 });
      break;
    }
    case 'wookiee': {
      // Gran árbol de Kachirho
      b.cyl(1.0, 1.5, 6.0, 0, 3.2, 0, 0x5a3a20, { seg: 10 });
      for (let i = 0; i < 3; i++) b.cyl(1.9 - i * 0.3, 1.9 - i * 0.3, 0.15, 0, 1.6 + i * 1.5, 0, k.wall, { seg: 12 });
      b.cone(2.8, 2.5, 0, 7.2, 0, 0x3a6a2a, { seg: 10 });
      b.sphere(2.0, 0, 6.5, 0, 0x4a7a32, { seg: 10 });
      break;
    }
  }
  b.torus(w * 0.5, 0.06, 0, 0.32, 0, C.team, { team: 1, rx: Math.PI / 2, seg: 24 });
}
