import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
(globalThis as any).__AI_DEBUG = true;
const [c1, c2, planet, seed, diff] = [process.argv[2] ?? 'empire', process.argv[3] ?? 'rebels', process.argv[4] ?? 'tatooine', Number(process.argv[5] ?? 3), (process.argv[6] ?? 'hard') as any];
const w = new World({ planet, size: (process.env.SIZE as any) ?? 'small', seed, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [ { name: 'A', civ: c1, color: 0, team: 1, human: false, difficulty: diff }, { name: 'B', civ: c2, color: 1, team: 2, human: false, difficulty: diff } ] });
const ais = attachAI(w);
for (let i = 0; i < 20 * 60 * 60 && !w.gameOver; i++) {
  w.step(); w.events.length = 0;
  if (i % (20 * 120) === 0 && i > 0) {
    console.log(`--- ${(w.time / 60).toFixed(0)}m`);
    for (const ai of ais) {
      const p = ai.p;
      const units = w.unitsOf(p.id);
      const comp: Record<string, number> = {};
      for (const u of units) if (u.ud!.cls !== 'worker') comp[u.defId] = (comp[u.defId] ?? 0) + 1;
      const idleMil = units.filter(u => u.ud!.cls !== 'worker' && !u.order).length;
      const b: Record<string, number> = {};
      for (const x of w.buildingsOf(p.id)) if (x.built) b[x.defId] = (b[x.defId] ?? 0) + 1;
      console.log(`${p.name} era${p.era} pop ${p.pop}/${p.popCap} wk ${units.filter(u=>u.ud!.cls==='worker').length} att=${ai.attacking} wave=${ai.wave} next=${(ai.nextAttackAt/60).toFixed(1)} tgt=${ai.attackTarget ? ai.attackTarget.x.toFixed(0)+','+ai.attackTarget.y.toFixed(0) : '-'} idleMil=${idleMil} K/L ${p.stats.unitsKilled}/${p.stats.unitsLost} bD ${p.stats.buildingsDestroyed} res ${Object.values(p.res).map(v=>v|0).join(',')}`);
      console.log('   army', JSON.stringify(comp));
      console.log('   bld', JSON.stringify(b));
    }
  }
}
console.log('END', w.gameOver, w.winners, (w.time/60).toFixed(1));
