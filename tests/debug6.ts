import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
(globalThis as any).__AI_DEBUG = true;
const w = new World({ planet: process.argv[2] ?? 'tatooine', size: 'small', seed: Number(process.argv[3] ?? 3), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true, treaty: 90,
  players: [ { name: 'A', civ: 'empire', color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: false, difficulty: 'hard' } ] });
const ais = attachAI(w);
const from = Number(process.argv[4] ?? 20), to = Number(process.argv[5] ?? 30);
const stat: Record<string, number> = {};
const g0: any = {};
for (let i = 0; i < 20 * 60 * to; i++) {
  w.step(); w.events.length = 0;
  if (i === 20 * 60 * from) { for (const p of w.players) if (p.id) g0[p.id] = { ...p.stats.gathered }; }
  if (i > 20 * 60 * from && i % 5 === 0) for (const u of w.units) if (u.alive && u.owner === 1 && u.ud!.cls === 'worker') {
    const o = u.order; const t = o?.targetId ? w.entities.get(o.targetId) : null;
    const k = (o?.type ?? 'none') + ':' + (t ? (t.resKind ?? t.defId) : '-') + ':' + (u.garrisonedIn ? 'GARR' : u.workAnim > w.time - 0.1 ? 'WORK' : u.moving ? 'MOVE' : u.pathPending ? 'PEND' : 'STILL');
    stat[k] = (stat[k] ?? 0) + 1;
  }
}
const tot = Object.values(stat).reduce((a,b)=>a+b,0);
for (const [k,v] of Object.entries(stat).sort((a,b)=>b[1]-a[1]).slice(0, 25)) console.log(k.padEnd(40), (v/tot*100).toFixed(1)+'%');
for (const p of w.players) if (p.id) { const d: any = {}; for (const r of ['food','carbon','nova','ore']) d[r] = Math.round((p.stats.gathered as any)[r] - g0[p.id][r]); console.log(p.name, 'gathered/min', JSON.stringify(Object.fromEntries(Object.entries(d).map(([k,v]: any)=>[k, Math.round(v/(to-from))]))), 'workers', w.unitsOf(p.id).filter(u=>u.ud!.cls==='worker').length); }
