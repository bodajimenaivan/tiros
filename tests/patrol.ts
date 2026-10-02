// Prueba de patrulla: la unidad debe ir y volver entre dos puntos.
import { World } from '../src/sim/world';
const w = new World({ planet: 'tatooine', size: 'small', seed: 5, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'all', lockedTeams: true,
  players: [{ name: 'A', civ: 'empire', color: 0, team: 1, human: true, difficulty: 'normal' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: true, difficulty: 'normal' }] });
const p = w.players[1];
const u = w.spawnUnit('trooper', 1, p.startX + 4, p.startY + 4);
const sx = u.x, sy = u.y;
const tx = Math.max(5, Math.min(w.N - 5, sx + (sx < w.N / 2 ? 12 : -12))), ty = sy;
w.commandPatrol([u.id], tx, ty, false);
let turns = 0, lastNear = '';
for (let i = 0; i < 20 * 60; i++) {
  w.step(); w.events.length = 0;
  const nearA = Math.hypot(u.x - sx, u.y - sy) < 1.5 ? 'A' : Math.hypot(u.x - tx, u.y - ty) < 1.5 ? 'B' : '';
  if (nearA && nearA !== lastNear) { turns++; lastNear = nearA; }
}
console.log('order', u.order?.type, 'extremos visitados', turns);
