// Diagnóstico de economía tardía: árboles, reparto de trabajadores, edificios clave.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const civA = process.argv[2] ?? 'empire', civB = process.argv[3] ?? 'rebels';
const planet = process.argv[4] ?? 'tatooine';
const seed = Number(process.argv[5] ?? 1018);
const mins = (process.argv[6] ?? '20,30,40,50').split(',').map(Number);
const w = new World({ planet, size: 'small', seed, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: civA, civ: civA, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: civB, civ: civB, color: 1, team: 2, human: false, difficulty: 'hard' }] });
attachAI(w);
let mi = 0;
for (let t = 0; t < 20 * 60 * 70 && !w.gameOver && mi < mins.length; t++) {
  w.step(); w.events.length = 0;
  if (w.time >= mins[mi] * 60) {
    mi++;
    let trees = 0, wood = 0, nova = 0, ore = 0, bush = 0;
    for (const r of w.resources) if (r.alive) {
      if (r.resKind === 'tree') { trees++; wood += r.amount; }
      else if (r.resKind === 'nova') nova += r.amount; else if (r.resKind === 'ore') ore += r.amount; else if (r.resKind === 'bush') bush += r.amount;
    }
    console.log(`\n== t=${mins[mi - 1]}m trees ${trees} wood ${wood} nova ${nova} ore ${ore} bush ${bush}`);
    for (const p of w.players) if (p.id) {
      const us = w.unitsOf(p.id).filter((u) => u.ud!.cls === 'worker');
      const tasks: Record<string, number> = {};
      for (const u of us) {
        const k = u.order ? u.order.type + (u.order.type === 'gather' ? ':' + (w.get(u.order.targetId!)?.resKind ?? (w.get(u.order.targetId!)?.bd?.farm ? 'farm' : '?')) : '') : 'idle';
        tasks[k] = (tasks[k] ?? 0) + 1;
      }
      const bl = w.buildingsOf(p.id);
      const cnt: Record<string, number> = {};
      for (const b of bl) cnt[b.defId] = (cnt[b.defId] ?? 0) + 1;
      // árboles alcanzables a menos de 25 de algún depósito propio
      let nearTrees = 0;
      const drops = bl.filter((b) => b.built && b.bd!.dropsite?.includes('carbon'));
      for (const r of w.resources) if (r.alive && r.resKind === 'tree' && drops.some((d) => Math.hypot(d.x - r.x, d.y - r.y) < 15)) nearTrees++;
      console.log(`${p.name} era ${p.era} res ${JSON.stringify(Object.fromEntries(Object.entries(p.res).map(([k, v]) => [k, v | 0])))} workers ${us.length} tasks ${JSON.stringify(tasks)}`);
      console.log(`   blds ${JSON.stringify(cnt)} nearTrees ${nearTrees} carbonDrops ${drops.length}`);
    }
  }
}
