import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
(globalThis as any).__AI_DEBUG = true;
const w = new World({ planet: 'tatooine', size: 'tiny', seed: 1234, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true, treaty: 60,
  players: [ { name: 'A', civ: 'empire', color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: false, difficulty: 'hard' } ] });
const ais = attachAI(w);
for (let i = 0; i < 20 * 60 * 12; i++) { w.step(); w.events.length = 0; }
const p = w.players[1];
console.log('start', p.startX, p.startY);
for (const u of w.units) if (u.alive && u.owner === 1 && u.ud!.cls === 'worker') {
  const o = u.order; const t = o?.targetId ? w.entities.get(o.targetId) : null;
  console.log(u.id, u.x.toFixed(1), u.y.toFixed(1), JSON.stringify(o), t ? `${t.kind}:${t.resKind ?? t.defId} at ${t.x.toFixed(1)},${t.y.toFixed(1)} alive=${t.alive} amt=${t.amount?.toFixed?.(0)} farmFood=${t.farmFood|0} farmer=${t.farmerId}` : '', 'carry', u.carry.toFixed(1), 'moving', u.moving, 'pend', u.pathPending, 'path', u.path?.length, 'stuck', u.stuckTime, 'work', (w.time-u.workAnim).toFixed(1));
}
