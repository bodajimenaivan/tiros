// Diagnóstico de producción/era de cada IA en un instante.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
import { TECHS } from '../src/data/techs';
const [civA, civB, planet, seedS, atS] = process.argv.slice(2);
const w = new World({ planet, size: 'small', seed: Number(seedS), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: civA, civ: civA, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: civB, civ: civB, color: 1, team: 2, human: false, difficulty: 'hard' }] });
const ais = attachAI(w);
for (let t = 0; t < Number(atS) * 1200 && !w.gameOver; t++) { w.step(); w.events.length = 0; }
for (const ai of ais as any[]) {
  const p = w.players[ai.pid];
  const next = 'era_' + (p.era + 1);
  const ccs = w.buildings.filter((b) => b.alive && b.owner === ai.pid && b.defId === 'command_center');
  console.log(`\n${p.name} era ${p.era} saving=${ai.savingForEra} res=${JSON.stringify(Object.fromEntries(Object.entries(p.res).map(([k, v]) => [k, Math.round(v as number)])))} pop ${p.pop}/${p.popCap} reserved ${p.popReserved}`);
  if (TECHS[next]) for (const cc of ccs) console.log('  cc', cc.id, 'built', cc.built, 'queue', JSON.stringify(cc.prodQueue.map((q: any) => q.id)), 'canResearch', JSON.stringify(w.canResearch(ai.pid, next)));
  for (const b of w.buildings) {
    if (!b.alive || b.owner !== ai.pid || !b.built || !b.bd!.trains?.length || b.defId === 'command_center') continue;
    const opts = w.trainOptions(b);
    console.log('  ', b.defId, 'queue', b.prodQueue.length, 'opts', opts.map((u: string) => u + ':' + (w.canTrain(ai.pid, u).ok ? 'ok' : w.canTrain(ai.pid, u).reason)).join(' '));
  }
}
// prueba de construcción de refugio
for (const ai of ais as any[]) {
  const p = w.players[ai.pid];
  const spot = ai.findSpot('shelter', ai.baseX, ai.baseY, 5, 14, false);
  const spot2 = ai.findSpot('shelter', ai.baseX, ai.baseY, 14, 26, false);
  const builders = ai.pickBuilders(ai.baseX, ai.baseY, 1);
  console.log(p.name, 'base', ai.baseX, ai.baseY, 'spot', JSON.stringify(spot), 'spot2', JSON.stringify(spot2), 'builders', builders.length, 'lastBuild', ai.lastBuildAt['shelter']?.toFixed?.(0), 'time', w.time.toFixed(0));
  const pend = w.buildings.filter((b: any) => b.alive && b.owner === ai.pid && (b.defId === 'shelter') && !b.built).length;
  console.log('  pending shelters', pend, 'popMax', p.popMax);
}
