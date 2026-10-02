// Estado del ejército de la IA en un instante dado.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
const civA = process.argv[2] ?? 'empire', civB = process.argv[3] ?? 'rebels';
const planet = process.argv[4] ?? 'tatooine';
const seed = Number(process.argv[5] ?? 1018);
const at = Number(process.argv[6] ?? 56);
const w = new World({ planet, size: 'small', seed, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: civA, civ: civA, color: 0, team: 1, human: false, difficulty: 'hard' }, { name: civB, civ: civB, color: 1, team: 2, human: false, difficulty: 'hard' }] });
const ais = attachAI(w);
for (let t = 0; t < 20 * 60 * at && !w.gameOver; t++) { w.step(); w.events.length = 0; }
for (const ai of ais) {
  const a = ai as any;
  const p = w.players[a.pid];
  const mil = w.unitsOf(a.pid).filter((u) => u.ud!.cls !== 'worker');
  console.log(`\n${p.name}: attacking=${a.attacking} defending=${a.defending} wave=${a.wave} nextAttackAt=${a.nextAttackAt?.toFixed?.(0)} time=${w.time.toFixed(0)} target=${JSON.stringify(a.attackTarget)} known=${a.knownEnemyBuildings.size} rally=${a.rallyX?.toFixed(0)},${a.rallyY?.toFixed(0)} base=${a.baseX},${a.baseY}`);
  const th = a.threatsNearBase();
  console.log(' threats', th.length, th.slice(0, 5).map((u: any) => `${u.defId}@${u.x.toFixed(0)},${u.y.toFixed(0)}`).join(' '));
  const ord: Record<string, number> = {};
  for (const u of mil) { const k = (u.defId) + ':' + (u.order?.type ?? 'none') + (u.path ? 'P' : '') + (u.pathPending ? 'Q' : ''); ord[k] = (ord[k] ?? 0) + 1; }
  console.log(' mil orders', JSON.stringify(ord));
  for (const u of mil.slice(0, 6)) console.log(`   ${u.defId} @${u.x.toFixed(1)},${u.y.toFixed(1)} order=${JSON.stringify(u.order)} target=${u.targetId} stuck=${u.stuckTime?.toFixed?.(1)}`);
  const bl = w.buildingsOf(a.pid);
  const cnt: Record<string, number> = {};
  for (const b of bl) cnt[b.defId] = (cnt[b.defId] ?? 0) + 1;
  console.log(' blds', JSON.stringify(cnt));
  const xs = bl.map((b) => `${b.defId}@${b.tx},${b.ty}`).slice(0, 12);
  console.log(' sample', xs.join(' '));
}
