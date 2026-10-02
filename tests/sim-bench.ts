// Partida IA contra IA sin gráficos para validar la simulación y el equilibrio.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
import type { GameSetup } from '../src/sim/types';
import { ERA_NAMES } from '../src/data/techs';

(globalThis as any).__AI_DEBUG = true;
const args = process.argv.slice(2);
const civA = args[0] ?? 'empire';
const civB = args[1] ?? 'rebels';
const planet = args[2] ?? 'tatooine';
const minutes = Number(args[3] ?? 40);
const diff = (args[4] ?? 'hard') as any;
const seed = Number(args[5] ?? 1234);
const verbose = !args.includes('--quiet');

const setup: GameSetup = {
  planet, size: 'tiny', seed, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [
    { name: 'A-' + civA, civ: civA, color: 0, team: 1, human: false, difficulty: diff },
    { name: 'B-' + civB, civ: civB, color: 1, team: 2, human: false, difficulty: diff },
  ],
};
const t0 = Date.now();
const w = new World(setup);
attachAI(w);
let lastReport = 0;
let maxTick = 0;
const ticks = minutes * 60 * 20;
for (let i = 0; i < ticks && !w.gameOver; i++) {
  const s = performance.now();
  w.step();
  const dt = performance.now() - s;
  if (dt > maxTick) maxTick = dt;
  w.events.length = 0;
  if (verbose && w.time - lastReport >= 120) {
    lastReport = w.time;
    const lines = w.players.filter((p) => p.id).map((p) => {
      const units = w.unitsOf(p.id);
      const workers = units.filter((u) => u.ud!.cls === 'worker').length;
      const mil = units.length - workers;
      const blds = w.buildingsOf(p.id).length;
      const r = p.res;
      return `${p.name.padEnd(14)} era ${p.era} pop ${p.pop}/${p.popCap} wk ${workers} mil ${mil} bld ${blds} res F${r.food | 0} C${r.carbon | 0} N${r.nova | 0} O${r.ore | 0} kills ${p.stats.unitsKilled} lost ${p.stats.unitsLost} techs ${p.stats.techs}`;
    });
    console.log(`t=${(w.time / 60).toFixed(1)}m maxTick=${maxTick.toFixed(1)}ms paths=${w.pathQueue.length}\n  ` + lines.join('\n  '));
    maxTick = 0;
  }
}
const winners = w.winners.map((id) => w.players[id].name);
console.log(`RESULT ${civA} vs ${civB} @${planet}: ${w.gameOver ? 'winner ' + winners.join(',') : 'no winner'} at ${(w.time / 60).toFixed(1)}m; real ${(Date.now() - t0) / 1000}s`);
for (const p of w.players) if (p.id) console.log(`  ${p.name}: era ${ERA_NAMES[p.era]} eras@${p.stats.eraTimes.map((t) => (t / 60).toFixed(1)).join(',')} score ${p.score()} gathered ${JSON.stringify(Object.fromEntries(Object.entries(p.stats.gathered).map(([k, v]) => [k, Math.round(v)])))}`);
