import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
(globalThis as any).__AI_DEBUG = true;
const civ = process.argv[2] ?? 'empire';
const w = new World({ planet: process.argv[3] ?? 'tatooine', size: 'tiny', seed: Number(process.argv[4] ?? 99), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true, treaty: 60,
  players: [ { name: 'A', civ, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: false, difficulty: 'hard' } ] });
const ais = attachAI(w);
for (let i = 0; i < 20 * 60 * 25; i++) {
  w.step();
  for (const e of w.events) if ((e.t === 'msg' && e.owner === 1) || (e.t==='era')) console.log((w.time/60).toFixed(1), JSON.stringify(e));
  w.events.length = 0;
  if (i % 1200 === 0) {
    const ai = ais[0];
    const counts: Record<string, number> = {};
    for (const u of w.units) if (u.alive && u.owner === 1 && u.ud!.cls === 'worker') { const t = ai.workerTask(u); counts[t] = (counts[t] ?? 0) + 1; }
    const p = w.players[1];
    const b: Record<string, number> = {};
    for (const x of w.buildingsOf(1)) b[x.defId + (x.built ? '' : '*')] = (b[x.defId + (x.built ? '' : '*')] ?? 0) + 1;
    console.log((w.time/60).toFixed(0)+'m', 'pop', p.pop, '/', p.popCap, 'res', Object.values(p.res).map(v=>v|0).join(' '), 'tasks', JSON.stringify(counts), 'bld', JSON.stringify(b), 'gathered', Object.values(p.stats.gathered).map(v=>v|0).join(' '), 'saving', ai.savingForEra);
  }
}
