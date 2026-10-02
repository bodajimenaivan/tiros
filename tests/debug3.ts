import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
(globalThis as any).__AI_DEBUG = true;
const w = new World({ planet: 'tatooine', size: 'tiny', seed: 99, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true, treaty: 60,
  players: [ { name: 'A', civ: 'empire', color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: false, difficulty: 'hard' } ] });
attachAI(w);
const stat: Record<string, number> = {};
for (let i = 0; i < 20 * 60 * 10; i++) {
  w.step();
  w.events.length = 0;
  if (i > 20*60*5) for (const u of w.units) if (u.alive && u.owner === 1 && u.ud!.cls === 'worker') {
    const o = u.order; const t = o?.targetId ? w.entities.get(o.targetId) : null;
    const k = (o?.type ?? 'none') + ':' + (t ? (t.resKind ?? t.defId) : '-') + ':' + (u.workAnim > w.time - 0.1 ? 'WORK' : u.moving ? 'MOVE' : u.pathPending ? 'PEND' : 'STILL');
    stat[k] = (stat[k] ?? 0) + 1;
  }
}
const tot = Object.values(stat).reduce((a,b)=>a+b,0);
for (const [k,v] of Object.entries(stat).sort((a,b)=>b[1]-a[1])) console.log(k.padEnd(40), (v/tot*100).toFixed(1)+'%');
console.log('nodes expanded', w.pf.nodesExpanded);
