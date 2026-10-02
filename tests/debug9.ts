// Quién mata a quién: registro de bajas por tipo de atacante.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const [civA, civB, planet, seedS, fromS, toS] = process.argv.slice(2);
const w = new World({ planet: planet ?? 'tatooine', size: 'small', seed: Number(seedS ?? 1017), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: civA, civ: civA, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: civB, civ: civB, color: 1, team: 2, human: false, difficulty: 'hard' }] });
attachAI(w);
const from = Number(fromS ?? 34) * 1200, to = Number(toS ?? 60) * 1200;
for (let t = 0; t < to && !w.gameOver; t++) { if (t === from) w.killLog = {}; w.step(); w.events.length = 0; }
const arr = Object.entries(w.killLog ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [k, v] of arr) console.log(String(v).padStart(4), k);
