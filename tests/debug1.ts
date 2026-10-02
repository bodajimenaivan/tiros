import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
(globalThis as any).__AI_DEBUG = true;
const w = new World({ planet: 'tatooine', size: 'tiny', seed: 1234, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [ { name: 'A', civ: 'empire', color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: false, difficulty: 'hard' } ] });
attachAI(w);
for (let i = 0; i < 20 * 90; i++) {
  w.step();
  for (const e of w.events) if (e.t === 'death' || e.t === 'msg' || e.t === 'built' || e.t === 'placed') console.log((w.time).toFixed(1), JSON.stringify(e));
  w.events.length = 0;
  if (i % 200 === 0) {
    for (const u of w.units) if (u.alive && u.owner === 1) console.log('  ', w.time.toFixed(1), u.id, u.defId, u.x.toFixed(1), u.y.toFixed(1), JSON.stringify(u.order), 'carry', u.carry.toFixed(1), u.carryType, 'path', u.path?.length, u.pathPending, 'stuck', u.stuckTime);
  }
}
console.log(w.players[1].res, w.players[1].startX, w.players[1].startY);
