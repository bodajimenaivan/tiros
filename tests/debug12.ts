// Proporciones de recolección deseadas vs reales.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const [civA, civB, planet, seedS, atS] = process.argv.slice(2);
const w = new World({ planet, size: 'small', seed: Number(seedS), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: civA, civ: civA, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: civB, civ: civB, color: 1, team: 2, human: false, difficulty: 'hard' }] });
const ais = attachAI(w) as any[];
for (const at of atS.split(',').map(Number)) {
  while (w.time < at * 60 && !w.gameOver) { w.step(); w.events.length = 0; }
  for (const ai of ais) {
    const r = ai.desiredRatios();
    const ws = w.unitsOf(ai.pid).filter((u: any) => u.ud.cls === 'worker');
    const counts: Record<string, number> = {};
    for (const u of ws) { const t = ai.workerTask(u); counts[t] = (counts[t] ?? 0) + 1; }
    console.log(`t=${at} ${w.players[ai.pid].name} want ${Object.entries(r).map(([k, v]) => k + ':' + Math.round((v as number) * ws.length)).join(' ')} have ${JSON.stringify(counts)} saving=${ai.savingForEra} res=${JSON.stringify(Object.fromEntries(Object.entries(w.players[ai.pid].res).map(([k, v]) => [k, Math.round(v as number)])))}`);
  }
}
