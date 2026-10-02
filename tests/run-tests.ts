// Pruebas rápidas sin gráficos (npm test): movimiento, patrulla y una partida corta entre IA.
import { World } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';

let fails = 0;
const check = (name: string, ok: boolean, info = '') => {
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${name}${info ? ' — ' + info : ''}`);
  if (!ok) fails++;
};
const mkWorld = (planet: string, size: string, seed: number, ai = false) => {
  const w = new World({ planet, size: size as any, seed, startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'all', lockedTeams: true,
    players: [{ name: 'A', civ: 'empire', color: 0, team: 1, human: !ai, difficulty: 'hard' }, { name: 'B', civ: 'rebels', color: 1, team: 2, human: !ai, difficulty: 'hard' }] });
  if (ai) attachAI(w);
  return w;
};

// 1. Unidades enviadas lejos llegan a su destino (mapa grande)
{
  const w = mkWorld('endor', 'large', 5);
  const p = w.players[1];
  w.ensureRegions();
  let ok = 0, total = 0;
  for (let k = 0; k < 6; k++) {
    const u = w.spawnUnit('trooper', 1, p.startX + 3, p.startY + 3);
    const sr = w.regionAt(u.x, u.y);
    let tx = 0, ty = 0;
    for (let t = 0; t < 400; t++) {
      tx = 5 + ((k * 37 + t * 13) % (w.N - 10)) + 0.5; ty = 5 + ((k * 53 + t * 29) % (w.N - 10)) + 0.5;
      if (w.map.passable(Math.floor(tx), Math.floor(ty)) && w.regionAt(tx, ty) === sr && Math.hypot(tx - u.x, ty - u.y) > w.N * 0.35) break;
    }
    w.commandMove([u.id], tx, ty, false, false);
    for (let s = 0; s < 20 * 400 && u.order; s++) { w.step(); w.events.length = 0; }
    if (u.hp <= 0) continue;
    total++;
    if (Math.hypot(u.x - tx, u.y - ty) < 1.5) ok++;
    u.alive = false; u.order = null;
  }
  check('movimiento largo', ok === total, `${ok}/${total} llegaron`);
}

// 2. Patrulla entre dos puntos
{
  const w = mkWorld('tatooine', 'small', 5);
  const p = w.players[1];
  const u = w.spawnUnit('trooper', 1, p.startX + 4, p.startY + 4);
  const sx = u.x, sy = u.y;
  const tx = Math.max(5, Math.min(w.N - 5, sx + (sx < w.N / 2 ? 12 : -12))), ty = sy;
  w.commandPatrol([u.id], tx, ty, false);
  let turns = 0, last = '';
  for (let i = 0; i < 20 * 60; i++) {
    w.step(); w.events.length = 0;
    const near = Math.hypot(u.x - sx, u.y - sy) < 1.5 ? 'A' : Math.hypot(u.x - tx, u.y - ty) < 1.5 ? 'B' : '';
    if (near && near !== last) { turns++; last = near; }
  }
  check('patrulla', turns >= 3 && u.order?.type === 'patrol', `${turns} extremos visitados`);
}

// 3. Partida corta entre IA: sin errores, economía y ejército en marcha
{
  const w = mkWorld('naboo', 'tiny', 11, true);
  const t0 = performance.now();
  for (let t = 0; t < 20 * 60 * 12; t++) { w.step(); w.events.length = 0; }
  const ms = (performance.now() - t0) / (20 * 60 * 12);
  const pops = w.players.slice(1).map((p) => p.pop);
  check('IA 12 minutos', pops.every((n) => n >= 20), `población ${pops.join(' / ')}, ${ms.toFixed(2)} ms por paso`);
}

console.log(fails ? `\n${fails} prueba(s) fallida(s)` : '\nTodas las pruebas pasan');
process.exit(fails ? 1 : 0);
