// Prueba del comercio: dos puertos espaciales propios alejados y cargueros en ruta.
import { World } from '../src/sim/world';
const w = new World({ planet: 'tatooine', size: 'small', seed: 5, startRes: 'standard', startEra: 2, popMax: 200, victory: 'conquest', reveal: 'all', lockedTeams: true,
  players: [{ name: 'A', civ: 'tradefed', color: 0, team: 1, human: true, difficulty: 'normal' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: true, difficulty: 'normal' }] });
const p = w.players[1];
const find = (cx: number, cy: number) => {
  for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (w.canPlace(1, 'spaceport', cx + dx, cy + dy, true)) return [cx + dx, cy + dy];
  return null;
};
const a = find(p.startX + 6, p.startY + 6)!, bpos = find(Math.round(w.N / 2), Math.round(w.N / 2))!;
const s1 = w.placeBuilding(1, 'spaceport', a[0], a[1], true)!;
const s2 = w.placeBuilding(1, 'spaceport', bpos[0], bpos[1], true)!;
w.completeBuilding(s1, true);
w.completeBuilding(s2, true);
const d = Math.hypot(s1.x - s2.x, s1.y - s2.y);
console.log('distancia', d.toFixed(1), 'ganancia por viaje', w.tradeGain(s1, s2, 1));
const traders = [0, 1, 2].map(() => w.spawnUnit('trader', 1, s1.x + 3, s1.y));
w.commandSmart(1, traders.map((t) => t.id), s2.x, s2.y, s2.id, false);
console.log('orden', JSON.stringify(traders[0].order));
const n0 = p.res.nova;
for (let i = 0; i < 1200 * 5; i++) { w.step(); w.events.length = 0; }
console.log('Nova ganada en 5 min con 3 cargueros:', Math.round(p.res.nova - n0), '=>', ((p.res.nova - n0) / 300 / 3).toFixed(2), 'Nova/s por carguero', 'orden actual', traders[0].order?.type);
