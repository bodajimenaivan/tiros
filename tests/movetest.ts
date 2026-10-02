// Prueba de movimiento: unidades enviadas a puntos lejanos deben llegar (no quedarse a medio camino).
// Uso: npx tsx tests/movetest.ts [planeta] [tamaño] [seed]
import { World } from '../src/sim/world';
const planet = process.argv[2] ?? 'endor';
const size = (process.argv[3] ?? 'huge') as any;
const seed = Number(process.argv[4] ?? 3);
const w = new World({ planet, size, seed, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'all', lockedTeams: true,
  players: [{ name: 'A', civ: 'empire', color: 0, team: 1, human: true, difficulty: 'normal' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: true, difficulty: 'normal' }] });
console.log('mapa', planet, size, 'N =', w.N);
let rng = seed * 9301 + 49297;
const rnd = () => ((rng = (rng * 233280 + 49297) % 2147483647) / 2147483647);
const p = w.players[1];
let ok = 0, short = 0, worst = 0;
const t0 = performance.now();
for (let k = 0; k < 24; k++) {
  const u = w.spawnUnit(k % 3 === 0 ? 'worker' : k % 3 === 1 ? 'trooper' : 'scout', 1, p.startX + 3, p.startY + 3);
  // destino aleatorio transitable y alcanzable
  let tx = 0, ty = 0;
  w.ensureRegions();
  const sr = w.regionAt(u.x, u.y);
  for (let tries = 0; tries < 500; tries++) {
    tx = 4 + rnd() * (w.N - 8); ty = 4 + rnd() * (w.N - 8);
    if (w.map.passable(Math.floor(tx), Math.floor(ty)) && w.regionAt(tx, ty) === sr && Math.hypot(tx - u.x, ty - u.y) > w.N * 0.4) break;
  }
  w.commandMove([u.id], tx, ty, false, false);
  let steps = 0;
  while (u.order && steps < 20 * 600) { w.step(); w.events.length = 0; steps++; }
  const d = Math.hypot(u.x - tx, u.y - ty);
  if (u.hp <= 0) { console.log(`  ${u.defId} murió por el camino`); continue; }
  worst = Math.max(worst, d);
  if (d < 1.5) ok++; else { short++; console.log(`  ${u.defId} se quedó a ${d.toFixed(1)} de (${tx.toFixed(2)},${ty.toFixed(2)}) tras ${(steps / 20).toFixed(0)} s; en (${u.x.toFixed(1)},${u.y.toFixed(1)}) orden=${u.order?.type} path=${u.path ? u.pathIdx + "/" + u.path.length : null} pend=${u.pathPending} stuck=${u.stuckTime.toFixed(1)} tries=${u.partialTries}`); }
  u.hp = 0; u.alive = false; u.order = null;
}
console.log(`llegaron ${ok}/${ok + short}, peor distancia ${worst.toFixed(1)}, ${(performance.now() - t0).toFixed(0)} ms`);

// grupo de 30 unidades con una sola orden
const group = Array.from({ length: 30 }, (_, i) => w.spawnUnit(i % 2 ? 'trooper' : 'worker', 1, p.startX + 2 + (i % 6), p.startY + 2 + Math.floor(i / 6)));
w.ensureRegions();
const sr = w.regionAt(group[0].x, group[0].y);
let gx = 0, gy = 0;
for (let tries = 0; tries < 500; tries++) {
  gx = 6 + rnd() * (w.N - 12); gy = 6 + rnd() * (w.N - 12);
  if (w.map.passable(Math.floor(gx), Math.floor(gy)) && w.regionAt(gx, gy) === sr && Math.hypot(gx - group[0].x, gy - group[0].y) > w.N * 0.5) break;
}
const tg = performance.now();
w.commandMove(group.map((u) => u.id), gx, gy, false, false);
let st = 0;
while (group.some((u) => u.alive && u.hp > 0 && u.order) && st < 20 * 600) { w.step(); w.events.length = 0; st++; }
const alive = group.filter((u) => u.hp > 0);
const near = alive.filter((u) => Math.hypot(u.x - gx, u.y - gy) < 6).length;
console.log(`grupo: ${near}/${alive.length} a menos de 6 casillas del destino en ${(st / 20).toFixed(0)} s (${(performance.now() - tg).toFixed(0)} ms de simulación)`);
