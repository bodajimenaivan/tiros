// Opciones persistentes del jugador.
export interface Settings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  shadows: boolean;
  bloom: boolean;
  pixelRatio: number;
  music: number;
  sfx: number;
  voices: boolean;
  gameSpeed: number;
  edgeScroll: boolean;
  scrollSpeed: number;
  alwaysHealth: boolean;
  playerName: string;
  introSeen: boolean;
}

const DEFAULTS: Settings = {
  quality: 'high', shadows: true, bloom: true, pixelRatio: 1, music: 0.55, sfx: 0.75, voices: true, gameSpeed: 1.5, edgeScroll: true, scrollSpeed: 1,
  alwaysHealth: false, playerName: 'Comandante', introSeen: false,
};

let cur: Settings = { ...DEFAULTS };
try {
  const raw = localStorage.getItem('swage.settings');
  if (raw) cur = { ...DEFAULTS, ...JSON.parse(raw) };
} catch {
  /* sin almacenamiento */
}

export function settings(): Settings {
  return cur;
}

export function saveSettings(patch: Partial<Settings>) {
  cur = { ...cur, ...patch };
  try {
    localStorage.setItem('swage.settings', JSON.stringify(cur));
  } catch {
    /* ignorar */
  }
}
