// Habilidades activas de héroes (Fuerza, detonadores, auras...).
import type { World } from './world';
import type { Entity } from './entity';
import type { AbilityId } from '../data/types';
import { ABILITIES } from '../data/units';
import { damageEntity, spawnProjectile } from './combat';
import type { HitInfo } from './types';

export function abilityRange(id: AbilityId): number {
  return ABILITIES[id].range;
}

export function abilityReady(w: World, e: Entity, id: AbilityId): boolean {
  return (e.abilityCd[id] ?? 0) <= w.time;
}

function enemiesAround(w: World, e: Entity, x: number, y: number, r: number, includeBuildings = false): Entity[] {
  const out: Entity[] = [];
  const tmp: Entity[] = [];
  w.unitHash.query(x, y, r, tmp);
  for (const u of tmp) if (u.alive && w.hostile(e, u) && !u.isAir) out.push(u);
  if (includeBuildings) {
    w.staticHash.query(x, y, r + 2, tmp);
    for (const b of tmp) if (b.alive && b.kind === 'building' && w.hostile(e, b) && w.distTo({ x, y, radius: 0 } as Entity, b) <= r) out.push(b);
  }
  return out;
}
function alliesAround(w: World, e: Entity, r: number): Entity[] {
  const out: Entity[] = [];
  const tmp: Entity[] = [];
  w.unitHash.query(e.x, e.y, r, tmp);
  for (const u of tmp) if (u.alive && w.players[e.owner].isAlly(u.owner) && u.owner !== 0) out.push(u);
  return out;
}

export function useAbility(w: World, e: Entity, id: AbilityId, x: number, y: number, targetId: number): boolean {
  if (!abilityReady(w, e, id)) return false;
  const def = ABILITIES[id];
  const p = w.players[e.owner];
  const s = p.stats_of(e.defId);
  const base = s.damage;
  e.abilityCd[id] = w.time + def.cooldown;
  e.attackAnim = w.time;
  w.emit({ t: 'ability', id: e.id, ability: id, x, y, targetId, owner: e.owner });
  const t = targetId ? w.get(targetId) : undefined;
  switch (id) {
    case 'forcePush': {
      for (const u of enemiesAround(w, e, e.x, e.y, def.radius!)) {
        const a = Math.atan2(u.y - e.y, u.x - e.x);
        const push = u.ud!.tags.includes('mech') ? 0.6 : 2.2;
        const nx = u.x + Math.cos(a) * push, ny = u.y + Math.sin(a) * push;
        if (w.map.passable(Math.floor(nx), Math.floor(ny))) {
          u.x = nx;
          u.y = ny;
        }
        u.stunUntil = w.time + 1.6;
        damageEntity(w, u, base * 0.8 + 10, e);
      }
      break;
    }
    case 'forceLightning': {
      let cur: Entity | undefined = t ?? enemiesAround(w, e, x, y, 4)[0];
      const hit = new Set<number>();
      let from: Entity = e;
      const pts: number[] = [e.x, e.y, e.z + 1];
      for (let k = 0; k < 6 && cur; k++) {
        hit.add(cur.id);
        pts.push(cur.x, cur.y, cur.z + 0.6);
        damageEntity(w, cur, 32 - k * 3, e);
        cur.stunUntil = Math.max(cur.stunUntil, w.time + 0.6);
        from = cur;
        const next: Entity | undefined = enemiesAround(w, e, from.x, from.y, def.radius!).filter((u) => !hit.has(u.id) && u.kind === 'unit').sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
        cur = next;
      }
      w.emit({ t: 'lightning', pts, owner: e.owner });
      break;
    }
    case 'forceChoke': {
      if (t && t.kind === 'unit') {
        t.stunUntil = w.time + 3;
        damageEntity(w, t, t.ud!.cls === 'hero' ? 120 : 90, e);
      }
      break;
    }
    case 'forceHeal': {
      for (const u of alliesAround(w, e, def.radius!)) {
        if (u.ud!.tags.includes('mech')) continue;
        u.hp = Math.min(u.maxHp, u.hp + 60 + u.maxHp * 0.25);
      }
      break;
    }
    case 'saberThrow': {
      const a = Math.atan2(y - e.y, x - e.x);
      const len = def.range;
      const tmp: Entity[] = [];
      w.unitHash.query(e.x + Math.cos(a) * len * 0.5, e.y + Math.sin(a) * len * 0.5, len * 0.6, tmp);
      for (const u of tmp) {
        if (!u.alive || !w.hostile(e, u) || u.isAir) continue;
        // distancia al segmento
        const px = u.x - e.x, py = u.y - e.y;
        const along = px * Math.cos(a) + py * Math.sin(a);
        const perp = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
        if (along > 0 && along < len && perp < 0.8) damageEntity(w, u, base * 1.4, e);
      }
      break;
    }
    case 'battleMeditation': {
      for (const u of alliesAround(w, e, def.radius!)) u.buffs.push({ kind: 'meditation', until: w.time + 15, dmgMul: 1.3, armorAdd: 2 });
      break;
    }
    case 'rally': {
      for (const u of alliesAround(w, e, def.radius!)) u.buffs.push({ kind: 'rally', until: w.time + 12, dmgMul: 1.2, speedMul: 1.25 });
      break;
    }
    case 'droidCommand': {
      for (const u of alliesAround(w, e, def.radius!)) if (u.ud!.tags.includes('droid')) u.buffs.push({ kind: 'droidCommand', until: w.time + 12, reloadMul: 0.7 });
      break;
    }
    case 'shieldBubble': {
      for (const u of alliesAround(w, e, def.radius!)) u.buffs.push({ kind: 'shield', until: w.time + 10, dmgTakenMul: 0.4 });
      break;
    }
    case 'rapidFire': {
      e.buffs.push({ kind: 'rapidFire', until: w.time + 6, reloadMul: 0.33 });
      break;
    }
    case 'thermalDetonator':
    case 'orbitalStrike': {
      const hit: HitInfo = {
        attackerId: e.id, attackerDef: e.defId, owner: e.owner, damage: id === 'orbitalStrike' ? 70 : 45, type: 'ranged',
        bonus: { building: 30 }, splash: def.radius!, canHitAir: false, airOnly: false, mul: 1, deflectable: false,
      };
      if (id === 'orbitalStrike') {
        for (let k = 0; k < 5; k++) {
          const fake = { x: x + w.rng.range(-2, 2), y: y + w.rng.range(-2, 2), z: w.map.surfaceAt(x, y), id: 0, alive: true, isAir: false, bd: null, radius: 0 } as unknown as Entity;
          const src = { x: x + 8, y: y - 8, z: 25, angle: 0, radius: 0, ud: null, bd: { id: 'orbital' }, owner: e.owner, id: e.id, isAir: true } as unknown as Entity;
          spawnProjectile(w, src, fake, 'shell', { ...hit, splash: 1.6 }, 14, -k * 0.35);
        }
      } else {
        const fake = { x, y, z: w.map.surfaceAt(x, y), id: 0, alive: true, isAir: false, bd: null, radius: 0 } as unknown as Entity;
        spawnProjectile(w, e, fake, 'grenade', hit, 8);
      }
      break;
    }
    case 'saberSpin': {
      const enemies = enemiesAround(w, e, e.x, e.y, def.radius!);
      for (const u of enemies) damageEntity(w, u, base * 1.6, e);
      e.buffs.push({ kind: 'rapidFire', until: w.time + 2, reloadMul: 0.5 });
      break;
    }
    case 'roar': {
      for (const u of enemiesAround(w, e, e.x, e.y, def.radius!)) {
        if (u.ud!.cls === 'hero' || u.ud!.tags.includes('mech')) continue;
        u.fleeUntil = w.time + 2.5;
        u.angle = Math.atan2(u.y - e.y, u.x - e.x);
        u.path = null;
        u.buffs.push({ kind: 'fear', until: w.time + 8, dmgMul: 0.7 });
      }
      break;
    }
    case 'clumsy': {
      for (const u of enemiesAround(w, e, e.x, e.y, def.radius!)) {
        if (w.rng.next() < 0.75) {
          u.stunUntil = w.time + 2.5;
          damageEntity(w, u, 15, e);
        }
      }
      break;
    }
    case 'jetpack': {
      const nx = Math.floor(x), ny = Math.floor(y);
      const spot = w.map.passable(nx, ny) ? { x, y } : w.findFreeSpot(x, y, 3);
      if (spot) {
        e.x = spot.x;
        e.y = spot.y;
        e.path = null;
      }
      break;
    }
  }
  return true;
}

/** Uso automático de habilidades (IA y apoyo al jugador) */
export function autoCastAbilities(w: World, e: Entity, offensiveOnly = false) {
  const abs = e.ud!.abilities;
  if (!abs) return;
  for (const id of abs) {
    if (!abilityReady(w, e, id)) continue;
    const def = ABILITIES[id];
    switch (id) {
      case 'forcePush':
      case 'saberSpin':
      case 'clumsy':
      case 'roar': {
        const n = enemiesAround(w, e, e.x, e.y, def.radius!).filter((u) => u.kind === 'unit').length;
        if (n >= 3) {
          useAbility(w, e, id, e.x, e.y, 0);
          return;
        }
        break;
      }
      case 'forceLightning':
      case 'forceChoke': {
        if (!e.order || e.order.type !== 'attack') break;
        const t = w.get(e.order.targetId!);
        if (t && t.kind === 'unit' && Math.hypot(t.x - e.x, t.y - e.y) <= def.range) {
          if (id === 'forceChoke' && t.hp < 50) break;
          useAbility(w, e, id, t.x, t.y, t.id);
          return;
        }
        break;
      }
      case 'saberThrow':
      case 'thermalDetonator': {
        if (!e.order || e.order.type !== 'attack') break;
        const t = w.get(e.order.targetId!);
        if (t && Math.hypot(t.x - e.x, t.y - e.y) <= def.range && Math.hypot(t.x - e.x, t.y - e.y) > 1.5) {
          const n = enemiesAround(w, e, t.x, t.y, 2).length;
          if (n >= 2 || t.kind === 'building') {
            useAbility(w, e, id, t.x, t.y, t.id);
            return;
          }
        }
        break;
      }
      case 'orbitalStrike': {
        if (offensiveOnly) break;
        if (!e.order || e.order.type !== 'attack') break;
        const t = w.get(e.order.targetId!);
        if (t && enemiesAround(w, e, t.x, t.y, 3, true).length >= 4) {
          useAbility(w, e, id, t.x, t.y, 0);
          return;
        }
        break;
      }
      case 'forceHeal': {
        const hurt = alliesAround(w, e, def.radius!).filter((u) => u.hp < u.maxHp * 0.6).length;
        if (hurt >= 3 || e.hp < e.maxHp * 0.4) {
          useAbility(w, e, id, e.x, e.y, 0);
          return;
        }
        break;
      }
      case 'battleMeditation':
      case 'rally':
      case 'droidCommand':
      case 'shieldBubble': {
        if (offensiveOnly && id !== 'shieldBubble') {
          /* también útil para el jugador en combate */
        }
        const enemies = enemiesAround(w, e, e.x, e.y, 8).length;
        const allies = alliesAround(w, e, def.radius!).length;
        if (enemies >= 4 && allies >= 4) {
          useAbility(w, e, id, e.x, e.y, 0);
          return;
        }
        break;
      }
      case 'rapidFire': {
        if (e.order?.type === 'attack') {
          useAbility(w, e, id, e.x, e.y, 0);
          return;
        }
        break;
      }
      case 'jetpack':
        break;
    }
  }
}
