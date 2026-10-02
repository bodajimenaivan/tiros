// Máquina de estados de unidades: movimiento, combate, recolección, construcción, conversión, holocrones.
import type { World } from './world';
import { TICK } from './world';
import type { Entity, Order } from './entity';
import { fire, canHit, buffMul, convertUnit, attackOf, effVsBuilding } from './combat';
import { useAbility, abilityRange, autoCastAbilities } from './abilities';
import { T_SHALLOW } from './map';
import type { ResourceType } from '../data/types';
import type { ComputedStats } from './player';

const BASE_RATE = { bush: 0.46, carcass: 0.6, farm: 0.47, tree: 0.54, nova: 0.5, ore: 0.48 };
const CONVERT_RANGE = 7;

function gatherRate(w: World, e: Entity, kind: keyof typeof BASE_RATE): number {
  const p = w.players[e.owner];
  let r = BASE_RATE[kind];
  if (kind === 'bush') r *= p.eco('gatherForage') * p.eco('gatherFood');
  else if (kind === 'carcass') r *= p.eco('gatherHunt') * p.eco('gatherFood');
  else if (kind === 'farm') r *= p.eco('gatherFarm') * p.eco('gatherFood');
  else if (kind === 'tree') r *= p.eco('gatherCarbon');
  else if (kind === 'nova') r *= p.eco('gatherNova');
  else if (kind === 'ore') r *= p.eco('gatherOre');
  return r;
}

function speedOf(w: World, e: Entity, s: ComputedStats): number {
  let sp = s.speed * buffMul(e, w, 'speedMul');
  if (!e.isAir) {
    const tx = Math.floor(e.x), ty = Math.floor(e.y);
    if (w.map.inBounds(tx, ty) && w.map.terrain[ty * w.map.w + tx] === T_SHALLOW && w.map.liquid !== 'ice') sp *= 0.7;
  }
  if (e.carry > 0 && e.ud!.cls === 'worker') sp *= 0.95;
  return sp;
}

function turnTo(e: Entity, a: number, rate: number) {
  let d = a - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const m = rate * TICK;
  if (Math.abs(d) <= m) e.angle = a;
  else e.angle += Math.sign(d) * m;
}

/** Sigue el camino actual. Devuelve true al llegar al final. */
function followPath(w: World, e: Entity, s: ComputedStats): boolean {
  const path = e.path;
  if (!path || e.pathIdx >= path.length) {
    e.path = null;
    return true;
  }
  const wp = path[e.pathIdx];
  const dx = wp.x - e.x, dy = wp.y - e.y;
  const d = Math.hypot(dx, dy);
  const step = speedOf(w, e, s) * TICK;
  const turnRate = e.isAir ? 4 : e.ud!.tags.includes('mech') ? 5 : 10;
  if (d > 0.01) turnTo(e, Math.atan2(dy, dx), turnRate);
  e.moving = true;
  if (d <= step + 0.02) {
    e.x = wp.x;
    e.y = wp.y;
    e.distMoved += d;
    e.pathIdx++;
    if (e.pathIdx >= path.length) {
      e.path = null;
      return true;
    }
    return false;
  }
  const nx = e.x + (dx / d) * step, ny = e.y + (dy / d) * step;
  if (!e.isAir) {
    const tx = Math.floor(nx), ty = Math.floor(ny);
    if (!w.pf.isPassable(tx, ty, w.pathOpts(e, { ignoreOcc: (e as any)._goal || undefined }))) {
      // bloqueado: recalcular
      e.stuckTime += TICK;
      if (w.time - e.lastRepath > 0.6) {
        e.lastRepath = w.time;
        const g = path[path.length - 1];
        e.path = null;
        const goalId = (e as any)._goal as number;
        w.requestPath(e, g.x, g.y, goalId ? w.get(goalId) : undefined);
      }
      return false;
    }
  }
  e.x = nx;
  e.y = ny;
  e.distMoved += step;
  // detección de atasco: si no progresa hacia el punto en 2 s
  if (w.time - e.progressCheckT > 2) {
    const dd = Math.hypot(wp.x - e.x, wp.y - e.y);
    if (e.progressCheckT > 0 && dd > e.progressCheckD - 0.4 && !e.isAir) {
      e.pathIdx++;
      if (e.pathIdx >= path.length) {
        e.path = null;
        return true;
      }
    }
    e.progressCheckT = w.time;
    e.progressCheckD = Math.hypot(path[e.pathIdx].x - e.x, path[e.pathIdx].y - e.y);
  }
  return false;
}

/**
 * Avanza hacia (x,y) o hacia una entidad objetivo.
 * Devuelve 'arrived' | 'moving' | 'failed'
 */
function moveTo(w: World, e: Entity, x: number, y: number, s: ComputedStats, goal?: Entity, repathDist = 1.5): 'arrived' | 'moving' | 'failed' {
  if (e.pathPending) return 'moving';
  const goalChanged = Math.hypot(x - e.pathGoalX, y - e.pathGoalY) > repathDist;
  if (!e.path && e.inGoal && !goalChanged) {
    e.inGoal = false;
    return 'arrived';
  }
  if (!e.path || (goalChanged && w.time - e.lastRepath > 0.5)) {
    if (!goal && Math.hypot(x - e.x, y - e.y) < 0.12) return 'arrived';
    if (goal && w.adjacent(e, goal)) return 'arrived';
    if (e.path === null && e.stuckTime > 6) return 'failed';
    if (!e.path && e.stuckTime > 0.5 && w.time - e.lastRepath < 0.4) return 'moving';
    e.lastRepath = w.time;
    w.requestPath(e, x, y, goal);
    if (e.pathPending) return 'moving';
    if (!e.path) {
      e.stuckTime += 1;
      return e.stuckTime > 4 ? 'failed' : 'moving';
    }
  }
  const done = followPath(w, e, s);
  if (done) {
    e.stuckTime = 0;
    return 'arrived';
  }
  return 'moving';
}

/** Escanea enemigos cercanos y devuelve el mejor objetivo */
/** Zonas cubiertas por defensas enemigas a las que esta unidad no puede dañar (solo IA) */
const dangerTmp: Entity[] = [];
function dangerZones(w: World, e: Entity, radius: number): { x: number; y: number; r2: number }[] | null {
  if (w.players[e.owner].human || e.ud!.cls === 'worker') return null;
  w.staticHash.query(e.x, e.y, radius + 12, dangerTmp);
  let zones: { x: number; y: number; r2: number }[] | null = null;
  for (const b of dangerTmp) {
    if (!b.alive || b.kind !== 'building' || !b.bd!.attack || !b.built || !w.hostile(e, b)) continue;
    if (effVsBuilding(w, e, b) > 2) continue;
    const r = w.players[b.owner].stats_of(b.defId).range + b.size * 0.5 + 1;
    (zones ??= []).push({ x: b.x, y: b.y, r2: r * r });
  }
  return zones;
}

function inDanger(zones: { x: number; y: number; r2: number }[] | null, x: number, y: number): boolean {
  if (!zones) return false;
  for (const z of zones) {
    const dx = z.x - x, dy = z.y - y;
    if (dx * dx + dy * dy < z.r2) return true;
  }
  return false;
}

export function findTarget(w: World, e: Entity, radius: number): Entity | null {
  const atk = e.ud?.attack;
  if (!atk) return null;
  const zones = dangerZones(w, e, radius);
  const out = w.tmp;
  w.unitHash.query(e.x, e.y, radius, out);
  let best: Entity | null = null;
  let bestScore = -1e9;
  for (const t of out) {
    if (!t.alive || t === e || !w.hostile(e, t)) continue;
    if (!canHit(w, e, t, atk)) continue;
    // la IA no persigue objetivos refugiados bajo defensas que no puede dañar (salvo si ya está dentro)
    if (zones && inDanger(zones, t.x, t.y) && !inDanger(zones, e.x, e.y)) continue;
    if (t.owner === 0 && !(t.ud!.attack && t.ud!.cls === 'animal')) continue; // ignorar fauna pacífica
    const d = Math.hypot(t.x - e.x, t.y - e.y);
    let sc = -d;
    if (t.ud!.attack) sc += 4;
    if (t.ud!.cls === 'worker') sc += 1;
    if (t.lastAttackerId && w.get(t.lastAttackerId)?.owner === e.owner) sc += 1;
    if (t.ud!.cls === 'hero') sc += 1;
    if (atk.bonus) for (const tag of t.ud!.tags) if (atk.bonus[tag]) sc += 3;
    if (t.ud!.cls === 'pummel' && atk.type === 'ranged') sc -= 4;
    if (sc > bestScore) {
      bestScore = sc;
      best = t;
    }
  }
  if (best) return best;
  // edificios: preferir aquellos a los que se hace daño de verdad
  w.staticHash.query(e.x, e.y, radius, out);
  const myDmg = w.players[e.owner].stats_of(e.defId).damage;
  for (const b of out) {
    if (!b.alive || b.kind !== 'building' || !w.hostile(e, b)) continue;
    if (!canHit(w, e, b, atk)) continue;
    const d = w.distTo(e, b);
    let sc = -d;
    if (b.bd!.wall) sc -= 20;
    const bs = w.players[b.owner].stats_of(b.defId);
    const eff = Math.max(1, myDmg - (atk.type === 'melee' ? bs.armorMelee : bs.armorRanged)) + (atk.bonus?.building ?? 0) + (b.bd!.tags.includes('turret') ? atk.bonus?.turret ?? 0 : 0);
    // defensas inexpugnables para esta unidad: ignorarlas en el ataque automático
    if (b.bd!.attack && eff <= 2 && e.ud!.cls !== 'worker') continue;
    if (zones && inDanger(zones, b.x, b.y)) continue;
    if (b.bd!.attack) sc += eff >= 8 ? 6 : 2;
    else sc += Math.min(4, eff * 0.5);
    if (sc > bestScore) {
      bestScore = sc;
      best = b;
    }
  }
  return best;
}

export function updateUnit(w: World, e: Entity) {
  const ud = e.ud!;
  const p = w.players[e.owner];
  const s = p.stats_of(e.defId);
  e.moving = false;
  if (e.buffs.length && w.tickN % 10 === 0) e.buffs = e.buffs.filter((b) => b.until > w.time);
  if (s.regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + s.regen * TICK);
  if (e.cooldown > 0) e.cooldown -= TICK / buffMul(e, w, 'reloadMul');
  if (e.convertCooldown > 0) e.convertCooldown -= TICK;
  if (w.time < e.stunUntil) return;
  if (ud.abilities && !p.human && w.tickN % 10 === (e.id % 10)) autoCastAbilities(w, e);
  else if (ud.abilities && p.human && w.tickN % 10 === (e.id % 10) && e.order?.type === 'attack') autoCastAbilities(w, e, true);

  // miedo (rugido)
  if (e.fleeUntil > w.time) {
    const fx = e.x + Math.cos(e.angle) * 2, fy = e.y + Math.sin(e.angle) * 2;
    if (!e.path) w.requestPath(e, fx, fy);
    followPath(w, e, s);
    return;
  }

  const o = e.order;
  if (!o) {
    idle(w, e, s);
    return;
  }
  e.idleTime = 0;
  switch (o.type) {
    case 'move':
    case 'attackMove': {
      if (o.type === 'attackMove' && w.time >= e.scanAt) {
        e.scanAt = w.time + 0.4;
        const t = findTarget(w, e, s.los);
        if (t) {
          e.queue.unshift({ ...o });
          w.setOrder(e, { type: 'attack', targetId: t.id });
          e.explicitTarget = false;
          return;
        }
      }
      const r = moveTo(w, e, o.x!, o.y!, s, undefined, 0.5);
      if (r !== 'moving') w.nextOrder(e);
      break;
    }
    case 'patrol': {
      if (w.time >= e.scanAt) {
        e.scanAt = w.time + 0.4;
        const t = findTarget(w, e, s.los);
        if (t) {
          e.queue.unshift({ ...o });
          w.setOrder(e, { type: 'attack', targetId: t.id });
          e.explicitTarget = false;
          return;
        }
      }
      const r = moveTo(w, e, o.x!, o.y!, s, undefined, 0.6);
      if (r !== 'moving') {
        // llegar a un extremo: dar la vuelta
        const x = o.x!, y = o.y!;
        o.x = o.x2;
        o.y = o.y2;
        o.x2 = x;
        o.y2 = y;
        e.path = null;
      }
      break;
    }
    case 'follow': {
      const t = w.get(o.targetId!);
      if (!t) return w.nextOrder(e);
      if (Math.hypot(t.x - e.x, t.y - e.y) > 2.2) moveTo(w, e, t.x, t.y, s, undefined, 1.5);
      else e.path = null;
      break;
    }
    case 'attack': {
      const t = w.get(o.targetId!);
      if (!t || !w.hostile(e, t)) return w.nextOrder(e);
      if (!attackTarget(w, e, t, s, true)) w.nextOrder(e);
      break;
    }
    case 'gather':
      gather(w, e, o, s);
      break;
    case 'returnRes':
      returnRes(w, e, o, s);
      break;
    case 'trade': {
      // ruta comercial entre dos puertos espaciales (propios o aliados)
      const dest = w.get(o.targetId!), home = w.get(o.resumeId!);
      const okPort = (b: Entity | undefined) => !!b && b.alive && b.built && b.defId === 'spaceport' && (b.owner === e.owner || p.isAlly(b.owner));
      if (!okPort(dest) || !okPort(home)) return w.nextOrder(e);
      if (w.distTo(e, dest!) > 0.6 && !w.adjacent(e, dest!)) {
        if (moveTo(w, e, dest!.x, dest!.y, s, dest!) === 'failed') w.nextOrder(e);
        break;
      }
      const g = w.tradeGain(home!, dest!, e.owner);
      if (g > 0) {
        p.res.nova += g;
        p.stats.gathered.nova += g;
        w.emit({ t: 'drop', owner: e.owner, res: 'nova', amount: g });
      }
      o.targetId = home!.id;
      o.resumeId = dest!.id;
      e.path = null;
      break;
    }
    case 'build':
    case 'repair':
      build(w, e, o, s);
      break;
    case 'convert':
      convert(w, e, o, s);
      break;
    case 'heal': {
      const t = w.get(o.targetId!);
      if (!t || t.hp >= t.maxHp || !w.players[e.owner].isAlly(t.owner)) return w.nextOrder(e);
      if (w.distTo(e, t) > 4) moveTo(w, e, t.x, t.y, s);
      else {
        e.path = null;
        t.hp = Math.min(t.maxHp, t.hp + s.heal * 2 * TICK);
        e.workAnim = w.time;
        if (w.tickN % 20 === 0) w.emit({ t: 'heal', id: e.id, targetId: t.id });
      }
      break;
    }
    case 'ability': {
      const ab = o.ability!;
      const range = abilityRange(ab);
      const tx = o.targetId ? w.get(o.targetId)?.x ?? o.x! : o.x ?? e.x;
      const ty = o.targetId ? w.get(o.targetId)?.y ?? o.y! : o.y ?? e.y;
      if (range > 0 && Math.hypot(tx - e.x, ty - e.y) > range) {
        if (moveTo(w, e, tx, ty, s) === 'failed') w.nextOrder(e);
      } else {
        e.path = null;
        useAbility(w, e, ab, tx, ty, o.targetId ?? 0);
        w.nextOrder(e);
      }
      break;
    }
    case 'pickup': {
      const h = w.entities.get(o.targetId!);
      if (!h || h.carrierId || h.templeId || e.holocronId || !ud.carriesHolocron) return w.nextOrder(e);
      if (Math.hypot(h.x - e.x, h.y - e.y) > 0.8) {
        if (moveTo(w, e, h.x, h.y, s) === 'failed') w.nextOrder(e);
      } else {
        e.holocronId = h.id;
        h.carrierId = e.id;
        h.owner = e.owner;
        w.emit({ t: 'holocron', owner: e.owner, action: 'pickup' });
        const temple = nearestTemple(w, e);
        w.nextOrder(e);
        if (temple && !e.order) w.setOrder(e, { type: 'deposit', targetId: temple.id });
      }
      break;
    }
    case 'deposit': {
      const t = w.get(o.targetId!);
      if (!t || !t.built || !e.holocronId || t.owner !== e.owner) return w.nextOrder(e);
      if (w.distTo(e, t) > 0.5 && !w.adjacent(e, t)) {
        if (moveTo(w, e, t.x, t.y, s, t) === 'failed') w.nextOrder(e);
      } else {
        const h = w.entities.get(e.holocronId);
        e.holocronId = 0;
        if (h) {
          h.carrierId = 0;
          h.templeId = t.id;
          h.owner = t.owner;
          h.x = t.x;
          h.y = t.y;
          t.holocrons.push(h.id);
          w.emit({ t: 'holocron', owner: e.owner, action: 'deposit' });
          w.msg(e.owner, 'Holocrón guardado en el templo. Genera Nova.', '#9fd8ff');
        }
        w.nextOrder(e);
      }
      break;
    }
    case 'garrison': {
      const b = w.get(o.targetId!);
      if (!b || !w.canGarrison(e, b)) return w.nextOrder(e);
      if (w.distTo(e, b) > 0.5 && !w.adjacent(e, b)) {
        if (moveTo(w, e, b.x, b.y, s, b, 0.5) === 'failed') w.nextOrder(e);
      } else w.enterGarrison(e, b);
      return;
    }
    case 'flee': {
      if (moveTo(w, e, o.x!, o.y!, s) !== 'moving') w.nextOrder(e);
      break;
    }
    default:
      w.nextOrder(e);
  }
  // el holocrón sigue a su portador
  if (e.holocronId) {
    const h = w.entities.get(e.holocronId);
    if (h) {
      h.x = e.x;
      h.y = e.y;
    }
  }
}

function nearestTemple(w: World, e: Entity): Entity | null {
  let best: Entity | null = null;
  let bd = Infinity;
  for (const b of w.buildings) {
    if (!b.alive || !b.built || b.owner !== e.owner || !b.bd!.temple) continue;
    const d = Math.hypot(b.x - e.x, b.y - e.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

/** Ataca al objetivo; devuelve false si es imposible continuar */
function attackTarget(w: World, e: Entity, t: Entity, s: ComputedStats, explicit: boolean): boolean {
  const atk = attackOf(e, t);
  if (!atk || !canHit(w, e, t, atk)) return false;
  const d = w.distTo(e, t);
  const range = atk.range === s.range || e.ud!.attack === atk ? s.range : atk.range;
  // detección de objetivo inalcanzable: sin progreso durante 8 s
  if (e.targetId !== t.id || e.bestChaseT === 0) {
    e.bestChaseD = d;
    e.bestChaseT = w.time;
  } else if (d < e.bestChaseD - 0.5) {
    e.bestChaseD = d;
    e.bestChaseT = w.time;
  } else if (d > range + 0.3 && w.time - e.bestChaseT > 8 && !e.isAir) {
    t.unreachable |= 1 << e.owner;
    e.bestChaseT = 0;
    return false;
  }
  e.targetId = t.id;
  if (atk.minRange && d < atk.minRange && t.kind === 'unit') {
    // retroceder
    const a = Math.atan2(e.y - t.y, e.x - t.x);
    const fx = e.x + Math.cos(a) * 2, fy = e.y + Math.sin(a) * 2;
    if (w.map.passable(Math.floor(fx), Math.floor(fy))) {
      if (!e.path || w.time - e.lastRepath > 1) {
        e.lastRepath = w.time;
        e.path = [{ x: fx, y: fy }];
        e.pathIdx = 0;
      }
      followPath(w, e, s);
      return true;
    }
  }
  if (d <= range + 0.15) {
    e.path = null;
    e.bestChaseT = w.time;
    turnTo(e, Math.atan2(t.y - e.y, t.x - e.x), 12);
    if (e.cooldown <= 0) {
      fire(w, e, t);
      e.cooldown = atk === e.ud!.attack ? s.reload : atk.reload;
    }
    return true;
  }
  // fuera de alcance
  if (e.stance === 'standGround' && !e.explicitTarget) return false;
  if (e.stance === 'defensive' && !e.explicitTarget && Math.hypot(e.x - e.homeX, e.y - e.homeY) > 9) {
    w.setOrder(e, { type: 'move', x: e.homeX, y: e.homeY });
    return true;
  }
  // persecución limitada para objetivos auto-adquiridos
  if (!explicit || !e.explicitTarget) {
    if (!e.chaseStart) e.chaseStart = w.time;
  }
  if (t.kind === 'building') {
    const r = moveTo(w, e, t.x, t.y, s, t, 0.5);
    if (r === 'failed') return false;
    if (r === 'arrived' && w.distTo(e, t) > range + 0.3) {
      e.stuckTime += 1;
      if (e.stuckTime > 6) return false;
    }
  } else {
    // aproximación directa al objetivo móvil
    const lead = t.moving ? 0.6 : 0;
    const gx = t.x + Math.cos(t.angle) * lead, gy = t.y + Math.sin(t.angle) * lead;
    const r = moveTo(w, e, gx, gy, s, undefined, 1.2);
    if (r === 'failed') return false;
  }
  return true;
}

function idle(w: World, e: Entity, s: ComputedStats) {
  const ud = e.ud!;
  e.idleTime += TICK;
  e.chaseStart = 0;
  // trabajadores sin tarea con holocrón: nada
  if (e.holocronId) {
    const temple = nearestTemple(w, e);
    if (temple && w.tickN % 20 === 0) w.setOrder(e, { type: 'deposit', targetId: temple.id });
  }
  // sanación automática
  if (s.heal > 0 && w.time >= e.scanAt) {
    e.scanAt = w.time + 0.6;
    const out = w.tmp;
    w.unitHash.query(e.x, e.y, s.los, out);
    let best: Entity | null = null;
    let bestR = 1;
    for (const u of out) {
      if (!u.alive || u === e || u.owner !== e.owner) continue;
      if (u.ud!.tags.includes('mech') || u.isAir) continue;
      const r = u.hp / u.maxHp;
      if (r < bestR) {
        bestR = r;
        best = u;
      }
    }
    if (best && bestR < 0.95) {
      w.setOrder(e, { type: 'heal', targetId: best.id });
      return;
    }
  }
  if (!ud.attack || e.stance === 'passive' || ud.cls === 'worker') return;
  if (w.time >= e.scanAt) {
    e.scanAt = w.time + 0.45 + (e.id % 5) * 0.02;
    const radius = e.stance === 'standGround' ? s.range + 0.5 : s.los;
    const t = findTarget(w, e, radius);
    if (t) {
      w.setOrder(e, { type: 'attack', targetId: t.id });
      e.explicitTarget = false;
      if (e.stance === 'defensive') e.queue.push({ type: 'move', x: e.homeX, y: e.homeY });
    }
  }
}

// ───────────────────────── Recolección ─────────────────────────

function capacity(w: World, e: Entity): number {
  return w.st(e).carry;
}

function gather(w: World, e: Entity, o: Order, s: ComputedStats) {
  let t = w.entities.get(o.targetId!);
  // animal: cazarlo primero
  if (t && t.kind === 'unit') {
    if (t.alive) {
      if (!attackTarget(w, e, t, s, true)) {
        const n = nearestAnimal(w, e, 10);
        if (n && n !== t) o.targetId = n.id;
        else w.nextOrder(e);
      }
      return;
    }
    if (t.carcassId) {
      o.targetId = t.carcassId;
      t = w.entities.get(t.carcassId);
    }
  }
  if (!t || !t.alive || (t.kind === 'resource' && t.amount <= 0)) {
    // buscar otro similar
    const kind = e.lastResKind;
    if (kind) {
      const n = w.nearestResource(e.lastResX, e.lastResY, kind === 'carcass' || kind === 'bush' ? 'food' : kind, 10, t?.id ?? 0, e.owner);
      if (n && (kind !== 'carcass' || n.resKind === 'carcass' || n.resKind === 'bush')) {
        o.targetId = n.id;
        e.path = null;
        return;
      }
      // cazar otro animal cercano
      if (kind === 'carcass') {
        const animal = nearestAnimal(w, e, 10);
        if (animal) {
          o.targetId = animal.id;
          e.path = null;
          return;
        }
      }
    }
    if (e.carry > 0) {
      w.setOrder(e, { type: 'returnRes' });
      return;
    }
    w.nextOrder(e);
    return;
  }
  // granja
  if (t.kind === 'building') {
    if (!t.bd!.farm || t.owner !== e.owner) return w.nextOrder(e);
    if (!t.built) {
      w.setOrder(e, { type: 'build', targetId: t.id });
      return;
    }
    if (t.farmerId && t.farmerId !== e.id) {
      const f = w.get(t.farmerId);
      if (f && f.order?.type === 'gather' && (f.order.targetId === t.id || f.order.type === 'gather')) {
        const other = freeFarm(w, e);
        if (other) {
          o.targetId = other.id;
          return;
        }
        return w.nextOrder(e);
      }
    }
    t.farmerId = e.id;
    e.autoFarm = t.id;
    if (e.carryType && e.carryType !== 'food' && e.carry > 0) {
      w.setOrder(e, { type: 'returnRes', resumeId: t.id });
      return;
    }
    if (e.carry >= capacity(w, e)) {
      w.setOrder(e, { type: 'returnRes', resumeId: t.id });
      e.autoFarm = t.id;
      t.farmerId = e.id;
      return;
    }
    // ir a un punto dentro de la granja
    const fx = t.x + Math.cos(e.id) * 0.6, fy = t.y + Math.sin(e.id * 1.7) * 0.6;
    if (Math.hypot(fx - e.x, fy - e.y) > 0.3 && !(e.x > t.tx && e.x < t.tx + t.size && e.y > t.ty && e.y < t.ty + t.size && !e.path)) {
      if (moveTo(w, e, fx, fy, s) === 'failed') w.nextOrder(e);
      return;
    }
    e.path = null;
    e.workAnim = w.time;
    const amt = gatherRate(w, e, 'farm') * TICK;
    e.carryType = 'food';
    e.carry += amt;
    t.farmFood -= amt;
    e.lastResKind = null;
    if (w.tickN % 30 === e.id % 30) w.emit({ t: 'gather', id: e.id, res: 'food' });
    if (t.farmFood <= 0) {
      const p = w.players[e.owner];
      if (p.res.carbon >= 45) {
        p.res.carbon -= 45;
        t.farmFood = 300 + p.eco('farmFood');
      } else {
        w.msg(e.owner, 'Una granja se ha agotado (sin carbono para replantar).', '#ffb04a');
        t.farmerId = 0;
        w.removeEntity(t);
        t.deathTime = w.time;
      }
    }
    return;
  }
  if (t.kind !== 'resource') return w.nextOrder(e);
  const rtype = t.resType as ResourceType;
  if (e.carryType && e.carryType !== rtype && e.carry > 0) {
    w.setOrder(e, { type: 'returnRes', resumeId: t.id });
    return;
  }
  if (e.carry >= capacity(w, e) - 0.01) {
    w.setOrder(e, { type: 'returnRes', resumeId: t.id });
    return;
  }
  const d = w.distTo(e, t);
  if (d > 0.45 && !w.adjacent(e, t)) {
    const r = moveTo(w, e, t.x, t.y, s, t, 0.5);
    if (r === 'failed') {
      // recurso inalcanzable: buscar otro
      t.unreachable |= 1 << e.owner;
      const n = w.nearestResource(e.x, e.y, t.resKind === 'carcass' || t.resKind === 'bush' ? 'food' : t.resKind, 8, t.id, e.owner);
      if (n) {
        o.targetId = n.id;
        e.stuckTime = 0;
        e.path = null;
      } else w.nextOrder(e);
    } else if (r === 'arrived' && !w.adjacent(e, t)) {
      e.stuckTime += 0.5;
      if (e.stuckTime > 5) {
        t.unreachable |= 1 << e.owner;
        const n = w.nearestResource(e.x, e.y, t.resKind === 'carcass' || t.resKind === 'bush' ? 'food' : t.resKind, 8, t.id, e.owner);
        if (n) {
          o.targetId = n.id;
          e.stuckTime = 0;
        } else w.nextOrder(e);
      }
    }
    return;
  }
  e.path = null;
  turnTo(e, Math.atan2(t.y - e.y, t.x - e.x), 10);
  e.workAnim = w.time;
  e.lastResKind = t.resKind;
  e.lastResX = t.x;
  e.lastResY = t.y;
  const rate = gatherRate(w, e, t.resKind as keyof typeof BASE_RATE);
  const amt = Math.min(t.amount, rate * TICK);
  e.carryType = rtype;
  e.carry += amt;
  t.amount -= amt;
  if (w.tickN % 30 === e.id % 30) w.emit({ t: 'gather', id: e.id, res: rtype });
  if (t.amount <= 0.001) {
    t.amount = 0;
    w.removeEntity(t);
    t.deathTime = w.time;
  }
}

function nearestAnimal(w: World, e: Entity, r: number): Entity | null {
  const out = w.tmp;
  w.unitHash.query(e.x, e.y, r, out);
  let best: Entity | null = null;
  let bd = Infinity;
  for (const u of out) {
    if (!u.alive || u.owner !== 0 || u.ud!.cls !== 'animal' || u.ud!.attack) continue;
    if (u.unreachable & (1 << e.owner)) continue;
    const d = Math.hypot(u.x - e.x, u.y - e.y);
    if (d < bd) {
      bd = d;
      best = u;
    }
  }
  return best;
}

function freeFarm(w: World, e: Entity): Entity | null {
  let best: Entity | null = null;
  let bd = 14;
  for (const b of w.buildings) {
    if (!b.alive || !b.built || b.owner !== e.owner || !b.bd!.farm) continue;
    if (b.farmerId && b.farmerId !== e.id && w.get(b.farmerId)) continue;
    const d = Math.hypot(b.x - e.x, b.y - e.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

function returnRes(w: World, e: Entity, o: Order, s: ComputedStats) {
  if (e.carry <= 0 || !e.carryType) {
    resume(w, e, o);
    return;
  }
  let drop = o.targetId ? w.get(o.targetId) : null;
  if (!drop || !drop.built || drop.owner !== e.owner || !drop.bd!.dropsite?.includes(e.carryType)) {
    drop = w.nearestDropsite(e, e.carryType);
    if (!drop) {
      if (w.tickN % 100 === 0 && w.players[e.owner].human) w.msg(e.owner, 'No hay depósito para ese recurso. Construye un centro de procesamiento.', '#ffb04a');
      w.nextOrder(e);
      return;
    }
    o.targetId = drop.id;
  }
  const d = w.distTo(e, drop);
  if (d > 0.5 && !w.adjacent(e, drop)) {
    const r = moveTo(w, e, drop.x, drop.y, s, drop, 0.5);
    if (r === 'failed') {
      o.targetId = 0;
      e.stuckTime = 0;
      w.nextOrder(e);
    }
    return;
  }
  const p = w.players[e.owner];
  const amt = e.carry;
  p.res[e.carryType] += amt;
  p.stats.gathered[e.carryType] += amt;
  w.emit({ t: 'drop', owner: e.owner, res: e.carryType, amount: amt });
  e.carry = 0;
  resume(w, e, o);
}

function resume(w: World, e: Entity, o: Order) {
  const id = o.resumeId;
  if (id) {
    const t = w.get(id);
    if (t && (t.kind === 'resource' || (t.bd?.farm && t.owner === e.owner))) {
      w.setOrder(e, { type: 'gather', targetId: id });
      return;
    }
    const kind = e.lastResKind;
    if (kind) {
      const n = w.nearestResource(e.lastResX, e.lastResY, kind === 'carcass' || kind === 'bush' ? 'food' : kind, 12, 0, e.owner);
      if (n) {
        w.setOrder(e, { type: 'gather', targetId: n.id });
        return;
      }
    }
  }
  if (e.autoFarm) {
    const f = w.get(e.autoFarm);
    if (f) {
      w.setOrder(e, { type: 'gather', targetId: f.id });
      return;
    }
  }
  w.nextOrder(e);
}

// ───────────────────────── Construcción ─────────────────────────

function build(w: World, e: Entity, o: Order, s: ComputedStats) {
  const t = w.get(o.targetId!);
  if (!t || t.kind !== 'building' || t.owner !== e.owner) return afterBuild(w, e, null);
  if (o.type === 'build' && t.built) return afterBuild(w, e, t);
  if (o.type === 'repair' && t.hp >= t.maxHp) return afterBuild(w, e, null);
  const d = w.distTo(e, t);
  const inside = t.bd!.walkable && e.x >= t.tx && e.x <= t.tx + t.size && e.y >= t.ty && e.y <= t.ty + t.size;
  if (d > 0.45 && !inside && !w.adjacent(e, t)) {
    const r = moveTo(w, e, t.x, t.y, s, t, 0.5);
    if (r === 'failed') w.nextOrder(e);
    else if (r === 'arrived' && !w.adjacent(e, t)) {
      e.stuckTime += 0.5;
      if (e.stuckTime > 6) w.nextOrder(e);
    }
    return;
  }
  e.path = null;
  turnTo(e, Math.atan2(t.y - e.y, t.x - e.x), 10);
  e.workAnim = w.time;
  const p = w.players[e.owner];
  const bt = p.stats_of(t.defId).buildTime;
  const n = Math.max(1, t.buildersCount);
  const factor = ((n + 2) / 3) / n;
  if (o.type === 'build') {
    t.buildersNext++;
    const inc = (TICK / Math.max(1, bt)) * factor * (e.ud!.buildRate ?? 1);
    t.progress = Math.min(1, t.progress + inc);
    t.hp = Math.min(t.maxHp, t.hp + t.maxHp * inc);
    if (t.progress >= 1) {
      w.completeBuilding(t);
      afterBuild(w, e, t);
    }
  } else {
    // reparar: cuesta la mitad del coste proporcional
    t.buildersNext++;
    const inc = (TICK / Math.max(10, bt)) * 1.5 * factor;
    const c = p.stats_of(t.defId).cost;
    const frac = inc * 0.5;
    const needC = (c.carbon ?? 0) * frac, needO = (c.ore ?? 0) * frac;
    if (p.res.carbon < needC || p.res.ore < needO) return w.nextOrder(e);
    p.res.carbon -= needC;
    p.res.ore -= needO;
    t.hp = Math.min(t.maxHp, t.hp + t.maxHp * inc);
  }
}

function afterBuild(w: World, e: Entity, b: Entity | null) {
  if (e.queue.length) return w.nextOrder(e);
  w.setOrder(e, null);
  if (!b || !b.alive) {
    helpNearby(w, e);
    return;
  }
  const bd = b.bd!;
  if (bd.farm) {
    if (!b.farmerId || !w.get(b.farmerId)) {
      w.setOrder(e, { type: 'gather', targetId: b.id });
      return;
    }
  }
  if (bd.dropsite && bd.id !== 'command_center') {
    // recolectar el recurso más cercano del tipo del depósito
    let best: Entity | null = null;
    let bestD = 12;
    for (const rt of bd.dropsite) {
      const kind = rt === 'carbon' ? 'tree' : rt === 'nova' ? 'nova' : rt === 'ore' ? 'ore' : 'food';
      const r = w.nearestResource(b.x, b.y, kind as any, 12, 0, e.owner);
      if (r) {
        const d = Math.hypot(r.x - b.x, r.y - b.y);
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      }
    }
    if (best) {
      w.setOrder(e, { type: 'gather', targetId: best.id });
      return;
    }
  }
  helpNearby(w, e);
}

function helpNearby(w: World, e: Entity) {
  for (const b of w.buildings) {
    if (!b.alive || b.built || b.owner !== e.owner) continue;
    if (Math.hypot(b.x - e.x, b.y - e.y) < 10) {
      w.setOrder(e, { type: 'build', targetId: b.id });
      return;
    }
  }
}

// ───────────────────────── Conversión ─────────────────────────

function convert(w: World, e: Entity, o: Order, s: ComputedStats) {
  const t = w.get(o.targetId!);
  if (!t || t.kind !== 'unit' || !w.isEnemy(e.owner, t.owner) || t.ud!.cls === 'hero' || t.ud!.cls === 'jediMaster') return w.nextOrder(e);
  const baseRange = e.ud!.attack?.range ?? 0.9;
  const range = CONVERT_RANGE + Math.max(0, s.range - baseRange);
  const d = Math.hypot(t.x - e.x, t.y - e.y);
  if (d > range) {
    e.convertProgress = 0;
    if (moveTo(w, e, t.x, t.y, s, undefined, 1.5) === 'failed') w.nextOrder(e);
    return;
  }
  e.path = null;
  turnTo(e, Math.atan2(t.y - e.y, t.x - e.x), 8);
  if (e.convertCooldown > 0) return;
  e.convertProgress += TICK * s.convertSpeed;
  e.workAnim = w.time;
  if (w.tickN % 20 === 0) w.emit({ t: 'converting', id: e.id, targetId: t.id });
  const pr = e.convertProgress;
  // a partir de 4 s, 28% por segundo; garantizado a los 10 s. Unidades mecánicas resisten más.
  const resist = t.ud!.tags.includes('mech') || t.ud!.tags.includes('droid') ? 1.6 : 1;
  if (pr >= 4 * resist) {
    const chance = 0.28 * TICK * s.convertSpeed / resist;
    if (w.rng.next() < chance || pr >= 10 * resist) {
      convertUnit(w, t, e.owner);
      e.convertProgress = 0;
      e.convertCooldown = 14;
      w.nextOrder(e);
    }
  }
}

// ───────────────────────── Fauna ─────────────────────────

export function updateAnimal(w: World, e: Entity) {
  const s = w.players[0].stats_of(e.defId);
  e.moving = false;
  if (e.cooldown > 0) e.cooldown -= TICK;
  if (w.time < e.stunUntil) return;
  const aggressive = !!e.ud!.attack;
  if (aggressive) {
    const o = e.order;
    if (o && o.type === 'attack') {
      const t = w.get(o.targetId!);
      if (!t || Math.hypot(e.x - e.homeX, e.y - e.homeY) > 12) {
        w.setOrder(e, { type: 'move', x: e.homeX, y: e.homeY });
        return;
      }
      attackTarget(w, e, t, s, true);
      return;
    }
    if (w.time >= e.scanAt) {
      e.scanAt = w.time + 0.8;
      const out = w.tmp;
      w.unitHash.query(e.x, e.y, s.los, out);
      for (const u of out) {
        if (!u.alive || u.owner === 0 || u.isAir) continue;
        w.setOrder(e, { type: 'attack', targetId: u.id });
        return;
      }
    }
  } else if (w.time - e.lastHitTime < 4 && e.lastAttackerId) {
    // huir
    const a = w.get(e.lastAttackerId);
    if (a && (!e.path || w.time - e.lastRepath > 1.5)) {
      const ang = Math.atan2(e.y - a.y, e.x - a.x) + w.rng.range(-0.5, 0.5);
      const fx = e.x + Math.cos(ang) * 4, fy = e.y + Math.sin(ang) * 4;
      e.lastRepath = w.time;
      if (w.map.passable(Math.floor(fx), Math.floor(fy))) {
        e.path = [{ x: fx, y: fy }];
        e.pathIdx = 0;
      }
    }
    if (e.path) followPath(w, e, { ...s, speed: s.speed * 1.3 } as ComputedStats);
    return;
  }
  if (e.order && e.order.type === 'move') {
    if (moveTo(w, e, e.order.x!, e.order.y!, s) !== 'moving') w.setOrder(e, null);
    return;
  }
  // deambular
  if (w.time >= e.wanderAt) {
    e.wanderAt = w.time + w.rng.range(5, 14);
    const a = w.rng.next() * Math.PI * 2;
    const r = w.rng.range(0.5, 3);
    const fx = e.homeX + Math.cos(a) * r, fy = e.homeY + Math.sin(a) * r;
    if (w.map.passable(Math.floor(fx), Math.floor(fy))) {
      e.path = [{ x: fx, y: fy }];
      e.pathIdx = 0;
    }
  }
  if (e.path) followPath(w, e, { ...s, speed: s.speed * 0.4 } as ComputedStats);
}

// ───────────────────────── Separación ─────────────────────────

export function separation(w: World) {
  const out = w.tmp2;
  const m = w.map;
  for (const b of w.buildings) {
    b.buildersCount = b.buildersNext;
    b.buildersNext = 0;
  }
  for (const u of w.units) {
    if (!u.alive || u.garrisonedIn) continue;
    const ru = u.radius;
    w.unitHash.query(u.x, u.y, ru + 0.8, out);
    for (const v of out) {
      if (v.id <= u.id || !v.alive || v.isAir !== u.isAir) continue;
      const dx = v.x - u.x, dy = v.y - u.y;
      const minD = (ru + v.radius) * (u.isAir ? 1.6 : 0.95);
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD) continue;
      let d = Math.sqrt(d2);
      let nx: number, ny: number;
      if (d < 1e-4) {
        const a = (u.id * 2.39996) % (Math.PI * 2);
        nx = Math.cos(a);
        ny = Math.sin(a);
        d = 0;
      } else {
        nx = dx / d;
        ny = dy / d;
      }
      const overlap = (minD - d) * 0.5;
      // quien trabaja/ataca quieto se mueve menos
      const uw = u.moving ? 0.35 : u.workAnim > w.time - 0.5 || u.lastAttackTime > w.time - 1 ? 0.15 : 0.5;
      const vw = v.moving ? 0.35 : v.workAnim > w.time - 0.5 || v.lastAttackTime > w.time - 1 ? 0.15 : 0.5;
      const tot = uw + vw || 1;
      const pu = (overlap * 2 * uw) / tot, pv = (overlap * 2 * vw) / tot;
      const ux = u.x - nx * pu, uy = u.y - ny * pu;
      const vx = v.x + nx * pv, vy = v.y + ny * pv;
      if (u.isAir || m.passable(Math.floor(ux), Math.floor(uy))) {
        u.x = ux;
        u.y = uy;
      }
      if (v.isAir || m.passable(Math.floor(vx), Math.floor(vy))) {
        v.x = vx;
        v.y = vy;
      }
    }
    // no quedar dentro de obstáculos
    if (!u.isAir) {
      const tx = Math.floor(u.x), ty = Math.floor(u.y);
      if (!m.passable(tx, ty)) {
        const gate = m.gateOcc[ty * m.w + tx];
        if (!(gate && w.pathOpts(u).canPassGate!(gate))) {
          const spot = w.pf.nearestPassable(tx, ty, w.pathOpts(u), 4);
          if (spot) {
            u.x = spot.x + 0.5;
            u.y = spot.y + 0.5;
          }
        }
      }
      u.x = Math.max(0.3, Math.min(m.w - 0.3, u.x));
      u.y = Math.max(0.3, Math.min(m.h - 0.3, u.y));
    } else {
      u.x = Math.max(0.5, Math.min(m.w - 0.5, u.x));
      u.y = Math.max(0.5, Math.min(m.h - 0.5, u.y));
    }
  }
}

export { CONVERT_RANGE };
