// ¿Usa la IA el comercio? Cuenta cargueros y puertos espaciales en el tiempo.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const teams = process.argv[2] === 'teams';
const civs = ['tradefed', 'naboo', 'empire', 'cis'];
const w = new World({ planet: 'lothal', size: 'medium', seed: 314, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: civs.map((c, i) => ({ name: c, civ: c, color: i, team: teams ? (i % 2) + 1 : i + 1, human: false, difficulty: 'hard' as const })) });
attachAI(w);
(globalThis as any).__AI_DEBUG = true;
for (let t = 0; t < 1200 * 60 && !w.gameOver; t++) {
  w.step(); w.events.length = 0;
  if (t % (1200 * 10) === 0 && t) console.log(`t=${(w.time / 60).toFixed(0)}m ` + w.players.filter((p) => p.id).map((p) => `${p.name}: e${p.era} ports ${w.buildingsOf(p.id, 'spaceport').length} traders ${w.unitsOf(p.id).filter((u) => u.ud!.cls === 'trader').length} trading ${w.unitsOf(p.id).filter((u) => u.order?.type === 'trade').length}`).join(' | '));
}
console.log('RESULT', w.gameOver ? w.winners.map((id) => w.players[id].name).join(',') : 'none', (w.time / 60).toFixed(1));
