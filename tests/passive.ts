// IA contra un jugador humano pasivo: ¿cuándo ataca y cuánto tarda en ganar?
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const diff = (process.argv[2] ?? 'easy') as any;
const w = new World({ planet: process.argv[3] ?? 'tatooine', size: 'small', seed: 99, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: 'Humano', civ: 'rebels', color: 0, team: 1, human: true, difficulty: 'normal' }, { name: 'IA', civ: 'empire', color: 1, team: 2, human: false, difficulty: diff }] });
attachAI(w);
let firstHit = -1;
for (let t = 0; t < 1200 * 60 && !w.gameOver; t++) {
  w.step();
  for (const e of w.events) if ((e as any).t === 'underAttack' && (e as any).owner === 1 && firstHit < 0) firstHit = w.time;
  w.events.length = 0;
}
console.log(diff, 'first attack on human at', firstHit > 0 ? (firstHit / 60).toFixed(1) + 'm' : 'never', 'result', w.gameOver ? 'AI wins at ' + (w.time / 60).toFixed(1) + 'm' : 'no end in 60m', 'AI era', w.players[2].era);
