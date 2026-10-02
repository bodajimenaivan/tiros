// Punto de entrada: navegación entre pantallas.
import '@fontsource/orbitron/latin-400.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/exo-2/latin-400.css';
import '@fontsource/exo-2/latin-600.css';
import './ui/styles.css';
import { enterFullscreen } from './ui/fullscreen';
import { MainMenu, SkirmishScreen, showCrawl, instantSetup, optionsScreen, creditsScreen } from './ui/screens';
import { encyclopedia } from './ui/encyclopedia';
import { GameSession } from './game';
import type { GameSetup } from './sim/types';
import { settings } from './ui/settings';
import { startConquest } from './galactic/conquest';
import { audio } from './audio/audio';

const app = document.getElementById('app')!;
let menu: MainMenu | null = null;

function clearApp() {
  menu?.dispose();
  menu = null;
  while (app.firstChild) app.removeChild(app.firstChild);
}

function showMenu() {
  clearApp();
  menu = new MainMenu(app, {
    instant: () => launch(instantSetup(), showMenu),
    skirmish: () => {
      clearApp();
      const sc = new SkirmishScreen(app, showMenu, (s) => {
        sc.dispose();
        launch(s, showMenu);
      });
    },
    conquest: () => {
      clearApp();
      startConquest(app, showMenu, (s, onResult) => launch(s, () => {}, onResult));
    },
    encyclopedia: () => {
      clearApp();
      encyclopedia(app, showMenu);
    },
    options: () => {
      clearApp();
      optionsScreen(app, showMenu);
    },
    credits: () => {
      clearApp();
      creditsScreen(app, showMenu);
    },
    intro: () => {
      clearApp();
      showCrawl(app, showMenu);
    },
  });
}

function launch(setup: GameSetup, after: () => void, onResult?: (win: boolean) => void) {
  if (settings().fullscreen) enterFullscreen();
  clearApp();
  audio.setAmbience(setup.planet ? (await_planet_biome(setup.planet)) : '');
  const s = new GameSession(app, setup, (r) => {
    if (onResult) onResult(r.winner);
    else after();
  }, () => {
    if (onResult) onResult(false);
    else after();
  });
  s.start();
  (window as any).__session = s;
}

import { PLANETS } from './data/planets';
function await_planet_biome(id: string): string {
  return PLANETS[id]?.biome ?? '';
}

// arranque
(window as any).__audio = audio;
const params = new URLSearchParams(location.search);
if (params.get('auto')) {
  // modo de prueba: partida directa
  const s = instantSetup();
  if (params.get('planet')) s.planet = params.get('planet')!;
  if (params.get('civ')) s.players[0].civ = params.get('civ')!;
  if (params.get('ai')) s.players[0].human = false;
  if (params.get('reveal')) s.reveal = 'all';
  s.size = (params.get('size') as any) ?? 'tiny';
  launch(s, showMenu);
  (window as any).__ready = true;
} else if (!settings().introSeen) {
  showCrawl(app, showMenu);
} else showMenu();
(window as any).__ready = true;
