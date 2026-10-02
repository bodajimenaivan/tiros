// Traza detallada de un movimiento largo que no llega.
import { World } from '../src/sim/world';
const [, , planet = 'endor', size = 'huge', seedS = '3', unit = 'trooper', txS = '31.5', tyS = '99.5'] = process.argv;
const w = new World({ planet, size: size as any, seed: Number(seedS), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'all', lockedTeams: true,
  players: [{ name: 'A', civ: 'empire', color: 0, team: 1, human: true, difficulty: 'normal' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: true, difficulty: 'normal' }] });
const p = w.players[1];
const u = w.spawnUnit(unit, 1, p.startX + 3, p.startY + 3);
const tx = Number(txS), ty = Number(tyS);
console.log('from', u.x.toFixed(1), u.y.toFixed(1), 'to', tx, ty, 'passable', w.map.passable(Math.floor(tx), Math.floor(ty)));
w.commandMove([u.id], tx, ty, false, false);
let last = '';
for (let i = 0; i < 20 * 500 && u.order; i++) {
  const before = { path: u.path?.length, idx: u.pathIdx, partial: u.pathPartial, stuck: u.stuckTime };
  w.step(); w.events.length = 0;
  const st = `path=${u.path ? u.pathIdx + '/' + u.path.length : 'null'} pend=${u.pathPending} partial=${u.pathPartial} tries=${u.partialTries} stuck=${u.stuckTime.toFixed(1)}`;
  if (i % 200 === 0 && w.time > 100) console.log(`  t=${w.time.toFixed(0)} pos=(${u.x.toFixed(2)},${u.y.toFixed(2)}) wp=${u.path ? JSON.stringify(u.path[u.pathIdx]) : '-'} moving=${u.moving} fleeUntil=${u.fleeUntil?.toFixed?.(1)} hp=${u.hp}`);
  if (st.replace(/stuck=[\d.]+/, '') !== last.replace(/stuck=[\d.]+/, '')) {
    console.log(`t=${w.time.toFixed(1)} pos=(${u.x.toFixed(1)},${u.y.toFixed(1)}) ${st}` + (u.path ? ' end=(' + u.path[u.path.length - 1].x.toFixed(1) + ',' + u.path[u.path.length - 1].y.toFixed(1) + ')' : ''));
    last = st;
  }
}
console.log('final', u.x.toFixed(1), u.y.toFixed(1), 'order', u.order?.type ?? null, 'dist', Math.hypot(u.x - tx, u.y - ty).toFixed(1));
