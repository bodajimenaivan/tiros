import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const w = new World({ planet: 'endor', size: 'tiny', seed: 7, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [ { name: 'A', civ: 'tradefed', color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'B', civ: 'naboo', color: 1, team: 2, human: false, difficulty: 'hard' } ] });
attachAI(w);
let t0 = performance.now();
for (let i = 0; i < 20 * 60 * 50; i++) { w.step(); w.events.length = 0;
  if (i % (20*60*5) === 0) { const t = performance.now(); console.log((w.time/60).toFixed(0), 'm', ((t - t0)/(20*60*5)).toFixed(2), 'ms/tick', 'units', w.units.filter(u=>u.alive).length, 'proj', w.projectiles.length, 'pq', w.pathQueue.length, 'nodes', w.pf.nodesExpanded); t0 = t; }
}
