// Torneo IA contra IA: todas las civilizaciones entre sí para medir el equilibrio.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
import { CIV_LIST } from '../src/data/civs';
const planets = ['tatooine', 'naboo', 'hoth', 'endor', 'geonosis', 'kashyyyk', 'lothal', 'jakku'];
const civs = CIV_LIST.map((c) => c.id);
const wins: Record<string, number> = {}, games: Record<string, number> = {};
const times: number[] = [];
let n = 0;
const seeds = Number(process.argv[2] ?? 1);
const firstSeed = Number(process.argv[3] ?? 0);
for (let s = firstSeed; s < firstSeed + seeds; s++)
for (let i = 0; i < civs.length; i++) for (let j = i + 1; j < civs.length; j++) {
  const a = s % 2 ? civs[j] : civs[i], b = s % 2 ? civs[i] : civs[j];
  const planet = planets[(n++) % planets.length];
  const w = new World({ planet, size: 'small', seed: 1000 + n * 17 + s, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
    players: [{ name: a, civ: a, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: b, civ: b, color: 1, team: 2, human: false, difficulty: 'hard' }] });
  attachAI(w);
  for (let t = 0; t < 20 * 60 * 70 && !w.gameOver; t++) { w.step(); w.events.length = 0; }
  games[a] = (games[a] ?? 0) + 1; games[b] = (games[b] ?? 0) + 1;
  let winner = '';
  if (w.gameOver && w.winners.length) winner = w.players[w.winners[0]].civ.id;
  else {
    // sin ganador: mayor puntuación
    const pa = w.players[1].score(), pb = w.players[2].score();
    winner = pa >= pb ? a : b;
    winner += '*';
  }
  const wn = winner.replace('*', '');
  wins[wn] = (wins[wn] ?? 0) + 1;
  times.push(w.time / 60);
  console.log(`${a} vs ${b} @${planet}: ${winner} (${(w.time / 60).toFixed(1)}m)`);
}
console.log('\nRESULTADOS');
for (const c of civs) console.log(c.padEnd(10), `${wins[c] ?? 0}/${games[c]}`, ((100 * (wins[c] ?? 0)) / games[c]).toFixed(0) + '%');
console.log('duración media', (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1), 'min');
