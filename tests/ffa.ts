// Partida de N jugadores todos contra todos (o por equipos) para validar IA y rendimiento.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const civs = (process.argv[2] ?? 'empire,rebels,republic,cis').split(',');
const planet = process.argv[3] ?? 'endor';
const size = (process.argv[4] ?? 'medium') as any;
const teams = process.argv[5] === 'teams';
const w = new World({ planet, size, seed: Number(process.argv[6] ?? 77), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: civs.map((c, i) => ({ name: c, civ: c, color: i, team: teams ? (i % 2) + 1 : i + 1, human: false, difficulty: 'hard' as const })) });
attachAI(w);
let maxTick = 0, sum = 0, n = 0;
const t0 = Date.now();
for (let t = 0; t < 1200 * 90 && !w.gameOver; t++) {
  const s = performance.now(); w.step(); const d = performance.now() - s; w.events.length = 0;
  sum += d; n++; if (d > maxTick) maxTick = d;
  if (t % (1200 * 10) === 0 && t) {
    console.log(`t=${(w.time / 60).toFixed(0)}m avg ${(sum / n).toFixed(2)}ms max ${maxTick.toFixed(1)}ms units ${w.units.filter((u) => u.alive).length} ` + w.players.filter((p) => p.id).map((p) => `${p.name}:${p.defeated ? 'X' : 'e' + p.era + '/' + p.pop}`).join(' '));
    sum = 0; n = 0; maxTick = 0;
  }
}
console.log('RESULT', w.gameOver ? 'winner ' + w.winners.map((id) => w.players[id].name).join(',') : 'none', 'at', (w.time / 60).toFixed(1), 'm real', (Date.now() - t0) / 1000, 's');
