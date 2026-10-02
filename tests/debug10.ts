// Conectividad del mapa entre bases: regiones y mapa ASCII de la zona central.
import { World } from '../src/sim/world';
import { T_CLIFF, T_DEEP, T_SHALLOW, T_PATH } from '../src/sim/map';
const [planet, seedS, size] = process.argv.slice(2);
const w = new World({ planet: planet ?? 'naboo', size: (size as any) ?? 'small', seed: Number(seedS ?? 1034), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'normal', lockedTeams: true,
  players: [{ name: 'a', civ: 'empire', color: 0, team: 1, human: false, difficulty: 'hard' }, { name: 'b', civ: 'republic', color: 1, team: 2, human: false, difficulty: 'hard' }] });
(w as any).ensureRegions();
const reg = (x: number, y: number) => (w as any).regionAt(x, y);
for (const p of w.players) if (p.id) console.log(p.name, 'start', p.startX, p.startY, 'region', reg(p.startX + 3, p.startY + 3));
const m = w.map, N = m.w;
const rows: string[] = [];
for (let y = 0; y < N; y += 1) {
  let s = '';
  for (let x = 0; x < N; x += 1) {
    const t = m.terrain[y * N + x];
    const o = m.occ[y * N + x];
    s += t === T_DEEP ? '~' : t === T_SHALLOW ? ',' : t === T_CLIFF ? '#' : t === T_PATH ? ':' : o ? 'T' : '.';
  }
  rows.push(s);
}
console.log(rows.join('\n'));
