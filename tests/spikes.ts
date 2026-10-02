// Picos de tiempo por tick: IA vs simulación.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const w = new World({ planet: 'endor', size: 'medium', seed: 77, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: ['empire', 'rebels', 'republic', 'cis'].map((c, i) => ({ name: c, civ: c, color: i, team: i + 1, human: false, difficulty: 'hard' as const })) });
const ais = attachAI(w) as any[];
const thinkT: Record<string, number> = {};
const worst: { t: number; what: string; ms: number }[] = [];
for (const ai of ais) {
  const proto = Object.getPrototypeOf(ai);
  for (const k of Object.getOwnPropertyNames(proto)) {
    if (!k.startsWith('manage') && k !== 'observe' && k !== 'considerResign' && k !== 'updateGatherCounts') continue;
    const orig = proto[k];
    if ((orig as any).__wrapped) continue;
    const f = function (this: any, ...a: any[]) { const s = performance.now(); const r = orig.apply(this, a); const d = performance.now() - s; thinkT[k] = (thinkT[k] ?? 0) + d; if (d > 4) worst.push({ t: w.time, what: k, ms: d }); return r; };
    (f as any).__wrapped = true;
    proto[k] = f;
  }
}
const onTick = w.onTick!;
let aiT = 0, simT = 0, maxSim = 0, maxAi = 0;
w.onTick = (x: any) => { const s = performance.now(); onTick(x); const d = performance.now() - s; aiT += d; if (d > maxAi) maxAi = d; };
const pq = (w as any).processPathQueue.bind(w);
let pathT = 0, maxPath = 0;
(w as any).processPathQueue = () => { const s = performance.now(); pq(); const d = performance.now() - s; pathT += d; if (d > maxPath) maxPath = d; };
for (let t = 0; t < 1200 * 40; t++) { const s = performance.now(); w.step(); const d = performance.now() - s; simT += d; if (d > maxSim) maxSim = d; w.events.length = 0; }
console.log('total sim ms', simT.toFixed(0), 'ai', aiT.toFixed(0), 'path', pathT.toFixed(0), 'max tick', maxSim.toFixed(1), 'max ai', maxAi.toFixed(1), 'max path', maxPath.toFixed(1));
console.log(Object.entries(thinkT).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v.toFixed(0)).join(' '));
const agg: Record<string, number> = {};
for (const x of worst) agg[x.what] = Math.max(agg[x.what] ?? 0, x.ms);
console.log('worst', JSON.stringify(agg));
