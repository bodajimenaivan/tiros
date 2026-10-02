// Edificios procedurales con un "kit" arquitectónico por civilización.
import { MB, C, type ModelDef } from './builder';
import type { CivStyle } from '../../data/types';
import { BUILDINGS } from '../../data/buildings';

interface Kit {
  wall: number;
  wall2: number;
  roof: number;
  trim: number;
  light: number;
  glass: number;
  block(b: MB, x: number, y: number, z: number, w: number, h: number, d: number, alt?: boolean): void;
  roofOn(b: MB, x: number, y: number, z: number, w: number, d: number): void;
  dome(b: MB, x: number, y: number, z: number, r: number): void;
  tower(b: MB, x: number, z: number, r: number, h: number): void;
}

function baseKit(style: CivStyle): Kit {
  const P: Record<CivStyle, [number, number, number, number, number, number]> = {
    imperial: [0x8c9098, 0x5e626a, 0x3e424a, 0x2a2c30, 0xff4030, 0x1a2a3a],
    rebel: [0xbcae8c, 0x8c7c5c, 0x6e6a58, 0x4a4436, 0xffb040, 0x2a3a3a],
    republic: [0xe2ded2, 0xaaa69c, 0x9a3a32, 0x5a5650, 0x6ab8ff, 0x1a2a40],
    cis: [0x9a6a48, 0x6a4a34, 0x5a3a2a, 0x3a2a20, 0xff7a30, 0x2a1a10],
    tradefed: [0xa0906c, 0x6e5e44, 0x4e4434, 0x3a3428, 0xff9a40, 0x2a2010],
    naboo: [0xece2c8, 0xc8b890, 0x5a9a7a, 0x8a7a5a, 0xffd890, 0x2a3a50],
    gungan: [0x7a9a7a, 0x5a7a6a, 0x7ab0c8, 0x4a6a5a, 0x8af0ff, 0x6ad0e8],
    wookiee: [0x8a6a3a, 0x6a4a2a, 0x5a7a3a, 0x4a3420, 0xffb050, 0x3a2a1a],
  };
  const [wall, wall2, roof, trim, light, glass] = P[style];
  const k: Kit = {
    wall, wall2, roof, trim, light, glass,
    block(b, x, y, z, w, h, d, alt) {
      const c = alt ? wall2 : wall;
      switch (style) {
        case 'imperial':
          b.box(w, h, d, x, y + h / 2, z, c);
          b.box(w * 1.02, h * 0.08, d * 1.02, x, y + h * 0.82, z, trim);
          b.box(w * 1.01, 0.05, d * 1.01, x, y + h * 0.5, z, C.team, { team: 1 });
          break;
        case 'rebel':
          b.box(w, h * 0.7, d, x, y + h * 0.35, z, c);
          b.cyl(Math.min(w, d) * 0.5, Math.min(w, d) * 0.5, Math.max(w, d), x, y + h * 0.7, z, c, { rx: w > d ? 0 : Math.PI / 2, rz: w > d ? Math.PI / 2 : 0, seg: 10, sy: 1, sx: 1, sz: h * 0.6 / Math.min(w, d) });
          b.box(w * 1.01, 0.05, d * 1.01, x, y + h * 0.35, z, C.team, { team: 1 });
          break;
        case 'republic':
          b.box(w, h, d, x, y + h / 2, z, c);
          b.box(w * 1.04, h * 0.1, d * 1.04, x, y + h * 0.05, z, wall2);
          b.box(w * 1.01, 0.06, d * 1.01, x, y + h * 0.75, z, C.team, { team: 1 });
          break;
        case 'cis':
          b.cyl(Math.min(w, d) * 0.42, Math.min(w, d) * 0.55, h, x, y + h / 2, z, c, { seg: 7 });
          b.cyl(Math.min(w, d) * 0.3, Math.min(w, d) * 0.42, h * 0.25, x, y + h * 1.1, z, wall2, { seg: 7 });
          b.torus(Math.min(w, d) * 0.47, 0.04, x, y + h * 0.6, z, C.team, { team: 1, rx: Math.PI / 2, seg: 12 });
          break;
        case 'tradefed':
          b.box(w, h * 0.8, d, x, y + h * 0.4, z, c);
          b.sphere(Math.min(w, d) * 0.48, x, y + h * 0.8, z, wall2, { sy: 0.5, seg: 12 });
          b.box(w * 1.01, 0.06, d * 1.01, x, y + h * 0.65, z, C.team, { team: 1 });
          break;
        case 'naboo':
          b.box(w, h, d, x, y + h / 2, z, c);
          b.box(w * 1.06, h * 0.06, d * 1.06, x, y + h, z, wall2);
          // columnas
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.07, 0.08, h, x + sx * w * 0.5, y + h / 2, z + sz * d * 0.5, 0xf4ecd8, { seg: 8 });
          b.box(w * 1.01, 0.05, d * 1.01, x, y + h * 0.82, z, C.team, { team: 1 });
          break;
        case 'gungan':
          b.cyl(Math.min(w, d) * 0.4, Math.min(w, d) * 0.5, h * 0.4, x, y + h * 0.2, z, c, { seg: 10 });
          b.sphere(Math.min(w, d) * 0.55, x, y + h * 0.45, z, roof, { em: 0.12, seg: 14, sy: (h * 0.9) / Math.min(w, d) });
          b.torus(Math.min(w, d) * 0.45, 0.04, x, y + h * 0.38, z, C.team, { team: 1, rx: Math.PI / 2 });
          break;
        case 'wookiee':
          b.box(w, h, d, x, y + h / 2, z, c);
          for (let i = 0; i < 3; i++) b.box(w * 1.02, 0.04, d * 1.02, x, y + h * (0.2 + i * 0.3), z, wall2);
          b.box(w * 1.03, 0.06, d * 1.03, x, y + h * 0.95, z, C.team, { team: 1 });
          break;
      }
    },
    roofOn(b, x, y, z, w, d) {
      switch (style) {
        case 'imperial':
          b.box(w * 0.8, 0.12, d * 0.8, x, y + 0.06, z, roof);
          break;
        case 'republic':
          b.wedge(w, 0.35, d, x, y, z, roof, { ry: w > d ? Math.PI / 2 : 0 });
          break;
        case 'naboo':
          b.sphere(Math.min(w, d) * 0.45, x, y, z, roof, { sy: 0.7, seg: 14 });
          b.cone(0.06, 0.3, x, y + Math.min(w, d) * 0.33 + 0.12, z, 0xd8b040);
          break;
        case 'wookiee':
          b.cone(Math.max(w, d) * 0.72, 0.65, x, y + 0.3, z, roof, { seg: 8 });
          break;
        case 'rebel':
          b.box(w * 0.3, 0.12, d * 0.3, x, y + 0.06, z, roof);
          break;
        default:
          b.box(w * 0.6, 0.1, d * 0.6, x, y + 0.05, z, roof);
      }
    },
    dome(b, x, y, z, r) {
      if (style === 'gungan') b.sphere(r, x, y, z, roof, { em: 0.12, seg: 14 });
      else if (style === 'wookiee') b.cone(r * 1.2, r * 1.2, x, y + r * 0.5, z, roof, { seg: 8 });
      else b.sphere(r, x, y, z, style === 'naboo' ? roof : wall2, { sy: 0.65, seg: 14 });
    },
    tower(b, x, z, r, h) {
      switch (style) {
        case 'cis':
          b.cone(r * 1.2, h, x, h / 2, z, wall, { seg: 7 });
          b.sphere(r * 0.5, x, h * 0.75, z, light, { em: 1 });
          break;
        case 'wookiee':
          b.cyl(r * 1.1, r * 1.3, h, x, h / 2, z, 0x5a3a20, { seg: 8 });
          b.cone(r * 2.4, r * 2.2, x, h + r, z, 0x4a6a2a, { seg: 8 });
          break;
        case 'gungan':
          b.cyl(r * 0.6, r * 0.8, h * 0.7, x, h * 0.35, z, wall, { seg: 8 });
          b.sphere(r * 1.3, x, h * 0.8, z, roof, { em: 0.12, seg: 12 });
          break;
        case 'naboo':
          b.cyl(r, r * 1.1, h, x, h / 2, z, wall, { seg: 12 });
          b.sphere(r * 1.15, x, h, z, roof, { sy: 0.8, seg: 12 });
          break;
        default:
          b.cyl(r, r * 1.15, h, x, h / 2, z, wall2, { seg: style === 'imperial' ? 6 : 10 });
          b.cyl(r * 1.25, r * 1.25, h * 0.12, x, h, z, trim, { seg: style === 'imperial' ? 6 : 10 });
      }
    },
  };
  return k;
}

function lamp(b: MB, k: Kit, x: number, y: number, z: number, r = 0.06) {
  b.sphere(r, x, y, z, k.light, { em: 2.2, seg: 6 });
}

function antenna(b: MB, k: Kit, x: number, y: number, z: number, h: number) {
  b.cyl(0.025, 0.035, h, x, y + h / 2, z, k.trim, { seg: 5 });
  lamp(b, k, x, y + h, z, 0.05);
}

function banner(b: MB, x: number, y: number, z: number, h: number) {
  b.cyl(0.025, 0.025, h, x, y + h / 2, z, C.dgray, { seg: 5 });
  b.part('flag', 'flag', [x, y + h, z]);
  b.box(0.02, h * 0.35, 0.35, x, y + h * 0.8, z + 0.18, C.team, { team: 1 });
  b.part('body');
}

export function buildBuildingModel(defId: string, style: CivStyle): ModelDef {
  const bd = BUILDINGS[defId];
  const b = new MB();
  const k = baseKit(style);
  const S = bd.size;
  const half = S / 2;
  const w = S * 0.9;
  b.part('body');
  // cimientos
  if (!bd.farm && !bd.wall) b.box(S * 0.98, 0.12, S * 0.98, 0, 0.06, 0, style === 'gungan' ? 0x5a7a6a : style === 'wookiee' ? 0x5a4a30 : 0x6a6a66);
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
      // parcela de cultivo hidropónico + vaporizador de humedad
      const soil = style === 'gungan' ? 0x5a7a4a : style === 'wookiee' ? 0x6a5030 : 0x8a7050;
      const crop = style === 'imperial' || style === 'cis' || style === 'tradefed' ? 0x7aa040 : style === 'gungan' ? 0x5ab07a : 0x8ab040;
      b.box(S * 0.96, 0.05, S * 0.96, 0, 0.025, 0, soil);
      b.box(S * 0.98, 0.08, 0.06, 0, 0.04, S * 0.47, 0x5a4a38);
      b.box(S * 0.98, 0.08, 0.06, 0, 0.04, -S * 0.47, 0x5a4a38);
      b.part('crops', 'static');
      for (let i = 0; i < 6; i++) {
        const z = -S * 0.38 + i * S * 0.152;
        b.box(S * 0.82, 0.1, 0.13, -0.05, 0.1, z, crop);
        for (let j = 0; j < 5; j++) b.sphere(0.09, -S * 0.36 + j * S * 0.17, 0.18, z, i % 2 ? crop : 0x9ac050, { seg: 5, flat: true });
      }
      b.part('body');
      b.cyl(0.07, 0.09, 1.1, S * 0.4, 0.55, S * 0.4, 0xd0ccc0, { seg: 8 });
      b.cyl(0.17, 0.17, 0.05, S * 0.4, 0.8, S * 0.4, 0xb0aca0, { seg: 8 });
      b.cyl(0.17, 0.17, 0.05, S * 0.4, 1.0, S * 0.4, 0xb0aca0, { seg: 8 });
      b.box(0.1, 0.06, 0.1, S * 0.4, 1.12, S * 0.4, C.team, { team: 1 });
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
      b.cyl(0.38, 0.45, 0.8, 0, 0.4, 0, k.wall, { seg: 8 });
      b.torus(0.4, 0.04, 0, 0.75, 0, C.team, { team: 1, rx: Math.PI / 2, seg: 8 });
      b.part('turret', 'head', [0, 0.95, 0]);
      b.box(0.5, 0.3, 0.45, 0, 0.98, 0, k.wall2);
      if (defId === 'turret') b.sym((s) => b.cyl(0.045, 0.045, 0.7, 0.4, 1.0, s * 0.12, C.gun, { rz: Math.PI / 2 }));
      else b.sym((s) => {
        b.box(0.35, 0.25, 0.15, 0.15, 1.15, s * 0.28, C.dgray, { rz: 0.6 });
        b.cyl(0.04, 0.04, 0.05, 0.3, 1.27, s * 0.28, C.glowRed, { em: 1.5, rz: Math.PI / 2 - 0.6 });
      });
      lamp(b, k, 0.26, 1.1, 0, 0.04);
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
