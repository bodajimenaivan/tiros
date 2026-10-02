// Combate: proyectiles, daño con armaduras/bonus, desvío de bláster, muerte y conversión.
import type { World } from './world';
import { TICK } from './world';
import type { Entity } from './entity';
import type { HitInfo, Projectile } from './types';
import type { AttackDef, ProjectileKind, Tag } from '../data/types';
import { UNITS } from '../data/units';

const PROJ_SPEED: Record<ProjectileKind, number> = {
  bolt: 20, heavyBolt: 17, grenade: 7, shell: 9, missile: 12, bomb: 7, ion: 11, energyBall: 9, arrow: 14, none: 1000,
};
const ARC: Partial<Record<ProjectileKind, number>> = { grenade: 0.35, shell: 0.45, energyBall: 0.3, bomb: 0 };
const UNDEFLECTABLE: ProjectileKind[] = ['grenade', 'shell', 'missile', 'bomb', 'ion', 'energyBall', 'none'];

/** Color del disparo según el bando */
export const BOLT_COLORS: Record<string, number> = {
  empire: 0xff3322, rebels: 0xff5522, republic: 0x3a8cff, cis: 0xff3a2a, tradefed: 0xff4a2a, naboo: 0xffaa22, gungans: 0x55ff7a, wookiees: 0x66ffcc,
};

export function canHit(w: World, e: Entity, t: Entity, atk: AttackDef | undefined): boolean {
  if (!atk) return false;
  if (t.isAir) {
    if (!atk.canHitAir) return false;
  } else if (atk.airOnly) return false;
  if (t.kind === 'building' && atk.airOnly) return false;
  return true;
}

export function unitTags(t: Entity): Tag[] {
  return t.ud ? t.ud.tags : t.bd ? t.bd.tags : [];
}

function elevationMul(w: World, e: Entity, t: Entity): number {
  if (e.isAir || t.isAir) return 1;
  const dz = w.map.heightAt(e.x, e.y) - w.map.heightAt(t.x, t.y);
  if (dz > 0.6) return 1.25;
  if (dz < -0.6) return 0.85;
  return 1;
}

export function buffMul(e: Entity, w: World, kind: 'dmgMul' | 'speedMul' | 'reloadMul' | 'dmgTakenMul'): number {
  let m = 1;
  for (const b of e.buffs) {
    if (b.until < w.time) continue;
    const v = b[kind];
    if (v !== undefined) m *= v;
  }
  return m;
}
export function buffArmor(e: Entity, w: World): number {
  let a = 0;
  for (const b of e.buffs) if (b.until >= w.time && b.armorAdd) a += b.armorAdd;
  return a;
}

export const HUNT_ATTACK: AttackDef = { damage: 12, type: 'ranged', range: 3, reload: 2, projectile: 'bolt' };

/** Ataque efectivo de una entidad contra un objetivo (los trabajadores cazan a distancia) */
export function attackOf(e: Entity, t: Entity | null): AttackDef | undefined {
  if (e.ud?.cls === 'worker' && t?.ud?.cls === 'animal') return HUNT_ATTACK;
  return (e.ud ?? e.bd)?.attack;
}

/** Ataque: cuerpo a cuerpo inmediato o proyectil */
export function fire(w: World, e: Entity, t: Entity) {
  const atk = attackOf(e, t)!;
  const p = w.players[e.owner];
  const s = p.stats_of(e.defId);
  let damage = atk === HUNT_ATTACK ? HUNT_ATTACK.damage : s.damage;
  const hit: HitInfo = {
    attackerId: e.id,
    attackerDef: e.defId,
    owner: e.owner,
    damage,
    type: atk.type,
    bonus: atk.bonus,
    splash: atk === HUNT_ATTACK ? 0 : s.splash,
    canHitAir: !!atk.canHitAir,
    airOnly: !!atk.airOnly,
    mul: elevationMul(w, e, t) * buffMul(e, w, 'dmgMul'),
    deflectable: atk.type === 'ranged' && !UNDEFLECTABLE.includes(atk.projectile ?? 'bolt'),
  };
  e.attackAnim = w.time;
  e.lastAttackTime = w.time;
  e.angle = Math.atan2(t.y - e.y, t.x - e.x);
  if (atk.type === 'melee') {
    w.emit({ t: 'melee', id: e.id, targetId: t.id, x: t.x, y: t.y, saber: !!(e.ud && (e.ud.saberColor || e.ud.cls === 'jediKnight' || e.ud.cls === 'jediMaster')) });
    applyHit(w, hit, t, t.x, t.y);
    return;
  }
  const kind = atk.projectile ?? 'bolt';
  if (kind === 'none') {
    // relámpago instantáneo
    w.emit({ t: 'lightning', pts: [e.x, e.y, e.z + 0.8, t.x, t.y, t.z + 0.5], owner: e.owner });
    applyHit(w, hit, t, t.x, t.y);
    return;
  }
  let shots = atk.shots ?? 1;
  if (e.bd && e.garrison.length) {
    // disparos extra por guarnición: torretas hasta +2, centro de mando hasta +4, fortaleza hasta +4
    const cap = e.bd.tags.includes('turret') ? 2 : 4;
    shots += Math.min(cap, Math.ceil(e.garrison.length * 0.4));
  }
  for (let k = 0; k < shots; k++) spawnProjectile(w, e, t, kind, hit, atk.projectileSpeed, -k * 0.12);
}

function muzzle(e: Entity): { x: number; y: number; z: number } {
  if (e.bd) return { x: e.x, y: e.y, z: e.z + (e.bd.id === 'fortress' ? 3 : e.bd.id === 'command_center' ? 2.6 : 1.6) };
  const h = e.isAir ? 0 : e.ud!.cls === 'assaultMech' ? 2.2 : e.ud!.cls === 'strikeMech' ? 1.5 : e.ud!.tags.includes('mech') ? 0.7 : 0.6;
  return { x: e.x + Math.cos(e.angle) * e.radius * 0.8, y: e.y + Math.sin(e.angle) * e.radius * 0.8, z: e.z + h };
}

export function spawnProjectile(w: World, e: Entity, t: Entity, kind: ProjectileKind, hit: HitInfo, speed?: number, delay = 0) {
  const m = muzzle(e);
  const tz = t.z + (t.bd ? 0.8 : t.isAir ? 0 : 0.5);
  const d = Math.hypot(t.x - m.x, t.y - m.y, tz - m.z);
  const sp = speed ?? PROJ_SPEED[kind];
  const civ = w.players[e.owner].civ.id;
  const pr: Projectile = {
    id: w.nextProjId++,
    kind,
    owner: e.owner,
    srcId: e.id,
    targetId: t.id,
    sx: m.x, sy: m.y, sz: m.z,
    x: m.x, y: m.y, z: m.z,
    tx: t.x, ty: t.y, tz,
    t: delay,
    dur: Math.max(0.08, d / sp),
    arc: (ARC[kind] ?? 0) * d,
    color: BOLT_COLORS[civ] ?? 0xff3322,
    hit,
    done: false,
  };
  w.projectiles.push(pr);
  w.emit({ t: 'shot', id: e.id, kind, owner: e.owner, x: m.x, y: m.y, air: e.isAir, projId: pr.id });
}

export function updateProjectiles(w: World) {
  const list = w.projectiles;
  for (const p of list) {
    if (p.done) continue;
    p.t += TICK;
    if (p.t < 0) continue;
    // guiado para disparos rectos
    const homing = p.kind === 'bolt' || p.kind === 'heavyBolt' || p.kind === 'missile' || p.kind === 'ion' || p.kind === 'arrow';
    if (homing) {
      const t = w.get(p.targetId);
      if (t) {
        p.tx = t.x;
        p.ty = t.y;
        p.tz = t.z + (t.bd ? 0.8 : t.isAir ? 0 : 0.5);
      }
    }
    const k = Math.min(1, p.t / p.dur);
    p.x = p.sx + (p.tx - p.sx) * k;
    p.y = p.sy + (p.ty - p.sy) * k;
    p.z = p.sz + (p.tz - p.sz) * k + Math.sin(k * Math.PI) * p.arc;
    if (k >= 1) {
      p.done = true;
      const t = w.get(p.targetId);
      if (p.hit.splash > 0 || !homing) {
        // proyectiles balísticos impactan en el punto
        const big = p.kind === 'shell' || p.kind === 'bomb';
        w.emit({ t: 'explosion', x: p.tx, y: p.ty, z: p.tz, size: big ? 1.4 : p.kind === 'grenade' ? 0.8 : 0.6 });
        if (p.hit.splash > 0) splashDamage(w, p.hit, p.tx, p.ty, t ?? null);
        else if (t && Math.hypot(t.x - p.tx, t.y - p.ty) < t.radius + 0.5) applyHit(w, p.hit, t, p.tx, p.ty);
      } else if (t) {
        applyHit(w, p.hit, t, p.tx, p.ty);
        w.emit({ t: 'hit', x: p.tx, y: p.ty, z: p.tz, kind: p.kind, big: p.kind === 'heavyBolt' });
      }
    }
  }
  if (list.length > 64 && w.tickN % 10 === 0) w.projectiles = list.filter((p) => !p.done);
}

function splashDamage(w: World, hit: HitInfo, x: number, y: number, primary: Entity | null) {
  const r = hit.splash;
  const out: Entity[] = [];
  w.unitHash.query(x, y, r + 1, out);
  const victims = new Set<Entity>();
  for (const u of out) {
    if (!u.alive) continue;
    if (u.isAir && !hit.canHitAir) continue;
    if (!u.isAir && hit.airOnly) continue;
    if (u.owner === hit.owner || (u.owner !== 0 && !w.isEnemy(hit.owner, u.owner))) continue;
    if (u.owner === 0 && u.ud!.cls === 'animal' && u !== primary) continue;
    if (Math.hypot(u.x - x, u.y - y) <= r + u.radius) victims.add(u);
  }
  const outB: Entity[] = [];
  w.staticHash.query(x, y, r + 3, outB);
  for (const b of outB) {
    if (!b.alive || b.kind !== 'building' || hit.airOnly) continue;
    if (!w.isEnemy(hit.owner, b.owner)) continue;
    const dx = Math.max(b.tx - x, 0, x - (b.tx + b.size));
    const dy = Math.max(b.ty - y, 0, y - (b.ty + b.size));
    if (Math.hypot(dx, dy) <= r) victims.add(b);
  }
  if (primary && primary.alive && w.hostileOwner(hit.owner, primary)) victims.add(primary);
  for (const v of victims) applyHit(w, hit, v, x, y, v !== primary);
}

export function computeDamage(w: World, hit: HitInfo, t: Entity): number {
  const tp = w.players[t.owner];
  const ts = tp.stats_of(t.defId);
  const armor = (hit.type === 'melee' ? ts.armorMelee : ts.armorRanged) + buffArmor(t, w);
  let dmg = Math.max(0, hit.damage - armor);
  if (hit.bonus) {
    const tags = unitTags(t);
    for (const k in hit.bonus) {
      if (tags.includes(k as Tag)) dmg += hit.bonus[k as Tag]!;
    }
  }
  dmg = Math.max(1, dmg) * hit.mul;
  dmg *= w.shieldMul(t) * buffMul(t, w, 'dmgTakenMul');
  return dmg;
}

export function applyHit(w: World, hit: HitInfo, t: Entity, x: number, y: number, splashSecondary = false) {
  if (!t.alive) return;
  // desvío de bláster por usuarios de la Fuerza
  if (hit.deflectable && t.ud && !splashSecondary) {
    const def = w.players[t.owner].stats_of(t.defId).deflect;
    if (def > 0 && w.time >= t.stunUntil && w.rng.next() < def) {
      w.emit({ t: 'deflect', id: t.id, x: t.x, y: t.y, z: t.z + 0.6 });
      t.attackAnim = w.time;
      const src = w.get(hit.attackerId);
      if (src && w.rng.next() < 0.45 && Math.hypot(src.x - t.x, src.y - t.y) < 9 && !src.isAir) {
        const back: HitInfo = { ...hit, attackerId: t.id, owner: t.owner, damage: hit.damage * 0.6, bonus: undefined, deflectable: false, mul: 1 };
        spawnProjectile(w, t, src, 'bolt', back, 22);
      }
      return;
    }
  }
  const dmg = computeDamage(w, hit, t) * (splashSecondary ? 0.85 : 1);
  const attacker = w.get(hit.attackerId) ?? null;
  damageEntity(w, t, dmg, attacker, hit.owner);
}

export function damageEntity(w: World, t: Entity, dmg: number, attacker: Entity | null, attackerOwner = attacker?.owner ?? 0) {
  if (!t.alive) return;
  t.hp -= dmg;
  t.lastHitTime = w.time;
  if (attacker) t.lastAttackerId = attacker.id;
  // aviso de ataque
  if (t.owner !== 0 && attackerOwner !== t.owner && attacker) {
    const p = w.players[t.owner];
    if (w.time - p.lastAttackedAt > 15) {
      w.emit({ t: 'underAttack', owner: t.owner, x: t.x, y: t.y, building: t.kind === 'building' });
    }
    p.lastAttackedAt = w.time;
    p.lastAttackedX = t.x;
    p.lastAttackedY = t.y;
  }
  // represalia
  if (t.kind === 'unit' && attacker && t.hp > 0 && attacker.alive) retaliate(w, t, attacker);
  if (t.hp <= 0) kill(w, t, attacker, attackerOwner);
}

/** Daño efectivo aproximado de una unidad contra un edificio (armadura + bonus) */
export function effVsBuilding(w: World, e: Entity, b: Entity): number {
  const atk = e.ud?.attack;
  if (!atk) return 0;
  const dmg = w.players[e.owner].stats_of(e.defId).damage;
  const bs = w.players[b.owner].stats_of(b.defId);
  const tags = b.bd!.tags;
  let bonus = 0;
  if (atk.bonus) for (const k in atk.bonus) if (k === 'building' || tags.includes(k as Tag)) bonus += atk.bonus[k as Tag]!;
  return Math.max(0, dmg - (atk.type === 'melee' ? bs.armorMelee : bs.armorRanged)) + bonus;
}

function retaliate(w: World, t: Entity, attacker: Entity) {
  const ud = t.ud!;
  if (t.owner === 0) return;
  if (!w.hostile(t, attacker)) return;
  // no contestar a defensas a las que apenas se hace daño; la IA se aparta de su alcance
  if (attacker.kind === 'building' && ud.cls !== 'worker' && effVsBuilding(w, t, attacker) <= 2) {
    if (!w.players[t.owner].human && (!t.order || t.order.type === 'attackMove' || t.order.type === 'move')) {
      const dx = t.x - attacker.x, dy = t.y - attacker.y;
      const d = Math.hypot(dx, dy) || 1;
      const r = w.players[attacker.owner].stats_of(attacker.defId).range + 2.5;
      const fx = attacker.x + (dx / d) * (r + 1), fy = attacker.y + (dy / d) * (r + 1);
      if (t.order && t.order.type === 'attackMove') t.queue.length = 0;
      w.setOrder(t, { type: 'move', x: Math.max(1, Math.min(w.N - 2, fx)), y: Math.max(1, Math.min(w.N - 2, fy)) });
    }
    return;
  }
  if (ud.cls === 'worker') {
    // los trabajadores se defienden de animales
    if (attacker.owner === 0 && !t.order) w.setOrder(t, { type: 'attack', targetId: attacker.id });
    return;
  }
  if (!ud.attack || t.stance === 'passive') return;
  if (!canHit(w, t, attacker, ud.attack)) return;
  if (!t.order || t.order.type === 'attackMove' || (t.order.type === 'move' && false)) {
    if (t.order && t.order.type === 'attackMove') t.queue.unshift({ ...t.order });
    if (t.stance === 'standGround') {
      if (w.distTo(t, attacker) > w.st(t).range + 0.2) return;
    }
    w.setOrder(t, { type: 'attack', targetId: attacker.id });
    t.explicitTarget = false;
  }
}

export function kill(w: World, t: Entity, attacker: Entity | null, attackerOwner: number) {
  if (!t.alive) return;
  t.hp = 0;
  if (w.killLog) {
    const k = (attacker ? attacker.defId : 'none') + '>' + (t.ud ? t.ud.cls : t.defId);
    w.killLog[k] = (w.killLog[k] ?? 0) + 1;
  }
  const killerP = attackerOwner ? w.players[attackerOwner] : null;
  if (t.kind === 'unit') {
    const ud = t.ud!;
    if (t.owner !== 0) {
      w.players[t.owner].stats.unitsLost++;
      if (killerP && attackerOwner !== t.owner) killerP.stats.unitsKilled++;
      if (ud.cls === 'hero') {
        w.players[t.owner].heroDead[t.defId] = w.time;
        for (const q of w.players) if (q.id) w.msg(q.id, `¡${ud.name} ha caído en combate!`, '#ff9a6a');
      }
    }
    w.emit({ t: 'death', id: t.id, x: t.x, y: t.y, defId: t.defId, owner: t.owner, kind: 'unit', size: ud.radius, mech: ud.tags.includes('mech') || ud.tags.includes('droid'), air: !!ud.air });
    w.removeEntity(t);
    if (ud.cls === 'animal') {
      const tx = Math.floor(t.x), ty = Math.floor(t.y);
      const c = w.spawnResource('carcass', tx, ty, ud.cost.food ?? 100, 0);
      c.x = t.x;
      c.y = t.y;
      c.angle = t.angle;
      (c as any).animal = t.defId;
      t.carcassId = c.id;
    }
  } else if (t.kind === 'building') {
    const bd = t.bd!;
    if (t.owner !== 0) {
      w.players[t.owner].stats.buildingsLost++;
      if (killerP && attackerOwner !== t.owner) killerP.stats.buildingsDestroyed++;
    }
    w.emit({ t: 'death', id: t.id, x: t.x, y: t.y, defId: t.defId, owner: t.owner, kind: 'building', size: bd.size, mech: true, air: false });
    w.emit({ t: 'explosion', x: t.x, y: t.y, z: t.z + 1, size: bd.size * 0.9 });
    w.removeEntity(t);
  }
}

/** Edificios con ataque (centro de mando, torretas, fortaleza) */
export function updateBuildingCombat(w: World, b: Entity) {
  if (b.cooldown > 0) b.cooldown -= TICK;
  const atk = b.bd!.attack!;
  const s = w.players[b.owner].stats_of(b.defId);
  let t = b.targetId ? w.get(b.targetId) : undefined;
  if (t && (!w.hostile(b, t) || w.distTo(b, t) > s.range + b.size * 0.5 || !canHit(w, b, t, atk))) t = undefined;
  if (!t && w.time >= b.scanAt) {
    b.scanAt = w.time + 0.5;
    const out = w.tmp;
    w.unitHash.query(b.x, b.y, s.range + b.size * 0.5, out);
    let best: Entity | undefined;
    let bestScore = -1e9;
    for (const u of out) {
      if (!u.alive || !w.hostile(b, u) || !canHit(w, b, u, atk)) continue;
      if (u.owner === 0 && !u.ud!.attack) continue;
      const d = w.distTo(b, u);
      if (d > s.range + b.size * 0.5) continue;
      let sc = -d;
      if (u.ud!.attack) sc += 5;
      if (u.ud!.cls === 'pummel') sc -= 3; // casi inmune
      if (sc > bestScore) {
        bestScore = sc;
        best = u;
      }
    }
    t = best;
  }
  b.targetId = t ? t.id : 0;
  if (t && b.cooldown <= 0) {
    fire(w, b, t);
    b.cooldown = s.reload;
  }
}

export function convertUnit(w: World, t: Entity, newOwner: number) {
  const old = t.owner;
  const oldP = w.players[old], np = w.players[newOwner];
  if (t.kind === 'unit') {
    oldP.pop -= t.ud!.pop;
    np.pop += t.ud!.pop;
    if (t.holocronId) w.dropHolocron(t);
  }
  const frac = t.hp / t.maxHp;
  t.owner = newOwner;
  // si la unidad no existe en la civ nueva igualmente se conserva
  t.maxHp = np.stats_of(t.defId).hp;
  t.hp = Math.max(1, frac * t.maxHp);
  t.queue = [];
  w.setOrder(t, null);
  t.homeX = t.x;
  t.homeY = t.y;
  np.stats.converted++;
  oldP.stats.unitsLost++;
  w.emit({ t: 'converted', id: t.id, from: old, to: newOwner });
}

export { UNITS };
