// Composición del ejército y economía de cada civ en el tiempo.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const [civA, civB, planet, seedS] = process.argv.slice(2);
const w = new World({ planet, size: 'small', seed: Number(seedS), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: civA, civ: civA, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: civB, civ: civB, color: 1, team: 2, human: false, difficulty: 'hard' }] });
attachAI(w);
w.killLog = {};
for (let t = 1; t <= 1200 * 50 && !w.gameOver; t++) {
  w.step(); w.events.length = 0;
  if (t % (1200 * 10) === 0) {
    console.log(`t=${t / 1200}m`);
    for (const p of w.players) if (p.id) {
      const comp: Record<string, number> = {};
      for (const u of w.unitsOf(p.id)) if (u.ud!.cls !== 'worker') comp[u.defId] = (comp[u.defId] ?? 0) + 1;
      console.log(`  ${p.name} e${p.era} wk ${w.unitsOf(p.id).filter((u) => u.ud!.cls === 'worker').length} gathered ${JSON.stringify(Object.fromEntries(Object.entries(p.stats.gathered).map(([k, v]) => [k, Math.round(v as number)])))} kills ${p.stats.unitsKilled} lost ${p.stats.unitsLost}`);
      console.log(`    army ${JSON.stringify(comp)}`);
    }
  }
}
// quién mata a quién (por civ atacante)
const byAtk: Record<string, number> = {};
for (const [k, v] of Object.entries(w.killLog!)) { const a = k.split('>')[0]; byAtk[a] = (byAtk[a] ?? 0) + v; }
console.log('kills by attacker', JSON.stringify(Object.entries(byAtk).sort((a, b) => b[1] - a[1]).slice(0, 14)));
console.log('RESULT', w.gameOver ? w.winners.map((id) => w.players[id].name).join(',') : 'none', (w.time / 60).toFixed(1));
