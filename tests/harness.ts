// Arnés de prueba visual: ?planet=...&warm=segundos
import { World, TICK } from '../src/sim/world';
import { attachAI } from '../src/ai/ai';
import { GameRenderer } from '../src/render/renderer';
const app = document.getElementById('app')!;
app.style.cssText = 'position:fixed;inset:0;background:#000';
const params = new URLSearchParams(location.search);
const w = new World({
  planet: params.get('planet') ?? 'naboo', size: (params.get('size') as any) ?? 'tiny', seed: Number(params.get('seed') ?? 5), startRes: 'standard', startEra: 1, popMax: 200, victory: 'conquest', reveal: 'all', lockedTeams: true,
  players: [
    { name: 'Azul', civ: params.get('c1') ?? 'empire', color: 0, team: 1, human: false, difficulty: 'hard' },
    { name: 'Rojo', civ: params.get('c2') ?? 'rebels', color: 1, team: 2, human: false, difficulty: 'hard' },
  ],
});
attachAI(w);
const warm = Number(params.get('warm') ?? 0);
for (let i = 0; i < warm * 20; i++) { w.step(); w.events.length = 0; }
const r = new GameRenderer(app, w, 1, { quality: (params.get('q') as any) ?? 'high', shadows: params.get('shadows') !== '0', bloom: true, pixelRatio: 1 });
r.revealAll = params.get('fog') !== '1';
if (params.get('cx')) r.centerOn(Number(params.get('cx')), Number(params.get('cy')));
if (params.get('dist')) r.camDist = Number(params.get('dist'));
if (params.get('yaw')) r.camYaw = Number(params.get('yaw'));
(window as any).__r = r; (window as any).__w = w;
let last = performance.now(), acc = 0;
const speed = Number(params.get('speed') ?? 1);
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt * speed;
  while (acc >= TICK) { w.step(); r.processEvents(w.events); w.events.length = 0; acc -= TICK; }
  r.render(dt, acc / TICK);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
