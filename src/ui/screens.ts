// Pantallas: texto de apertura, menú principal, configuración de escaramuza, opciones y créditos.
import { h, clear } from './dom';
import { MenuScene } from './menuScene';
import { PLANET_LIST, PLANETS } from '../data/planets';
import { CIV_LIST, CIVS, PLAYER_COLORS } from '../data/civs';
import { UNITS } from '../data/units';
import type { GameSetup, PlayerSetup, MapSize, StartRes, VictoryMode } from '../sim/types';
import { MAP_SIZES, START_RES } from '../sim/types';
import { settings, saveSettings } from './settings';
import { audio } from '../audio/audio';
import type { Era } from '../data/types';
import { Noise2D } from '../core/noise';

export function showCrawl(root: HTMLElement, onDone: () => void) {
  const el = h('div', { class: 'crawl-root' },
    starsCanvas(),
    h('div', { class: 'crawl-intro' }, 'Hace mucho tiempo, en una galaxia muy, muy lejana....'),
    h('div', { class: 'crawl-title' }, 'STAR WARS'),
    h('div', { class: 'crawl-text', html: `
      <h3>EPISODIO ∞</h3>
      <h2>LA ERA DE LOS IMPERIOS GALÁCTICOS</h2>
      <p>La galaxia arde en guerra. Desde los desiertos de Tatooine hasta los glaciares de Hoth, ocho grandes potencias luchan por el control de los sistemas estelares.</p>
      <p>El Imperio Galáctico despliega sus andadores. La Alianza Rebelde prepara sus escuadrones. Los ejércitos clon de la República marchan contra las interminables hordas droides de la Confederación.</p>
      <p>En los planetas del Borde Medio, el reino de Naboo, el Gran Ejército Gungan y los indomables wookiees de Kashyyyk se alzan para defender sus mundos.</p>
      <p>Ahora, un nuevo comandante debe recolectar recursos, levantar colonias, avanzar a través de las eras de la tecnología y forjar alianzas para conquistar la galaxia....</p>` }),
    h('div', { class: 'crawl-skip' }, 'Clic o tecla para continuar'),
  );
  root.appendChild(el);
  audio.playMusic('menu', 'menu');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', finish);
    el.remove();
    saveSettings({ introSeen: true });
    onDone();
  };
  el.addEventListener('click', finish);
  window.addEventListener('keydown', finish);
  setTimeout(finish, 52000);
}

function starsCanvas(): HTMLCanvasElement {
  const c = h('canvas', { class: 'stars' }) as HTMLCanvasElement;
  c.width = innerWidth;
  c.height = innerHeight;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 700; i++) {
    const a = Math.random();
    g.fillStyle = `rgba(255,255,255,${0.3 + a * 0.7})`;
    const s = Math.random() < 0.05 ? 2 : 1;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, s, s);
  }
  return c;
}

export interface MenuActions {
  instant: () => void;
  skirmish: () => void;
  conquest: () => void;
  encyclopedia: () => void;
  options: () => void;
  credits: () => void;
  intro: () => void;
}

export class MainMenu {
  root: HTMLElement;
  scene: MenuScene | null = null;
  constructor(parent: HTMLElement, a: MenuActions) {
    this.root = h('div', { class: 'menu-root' });
    const bg = h('div', { class: 'menu-bg' });
    this.root.appendChild(bg);
    parent.appendChild(this.root);
    try {
      this.scene = new MenuScene(bg);
    } catch (e) {
      console.warn('Sin WebGL para el menú', e);
    }
    const item = (label: string, k: string, fn: () => void) =>
      h('button', { class: 'btn', onclick: () => { audio.init(); audio.ui('click'); fn(); } }, label, h('span', { class: 'k' }, k));
    const overlay = h('div', { class: 'menu-overlay' },
      h('div', { class: 'logo' }, 'STAR WARS'),
      h('div', { class: 'logo-sub' }, 'La Era de los Imperios Galácticos'),
      h('div', { class: 'menu-buttons' },
        item('Acción Instantánea', 'Batalla rápida', a.instant),
        item('Escaramuza', 'Conflicto local', a.skirmish),
        item('Conquista Galáctica', 'Campaña', a.conquest),
        item('Enciclopedia', 'Civilizaciones y unidades', a.encyclopedia),
        item('Opciones', '', a.options),
        item('Ver introducción', '', a.intro),
        item('Créditos', '', a.credits),
      ),
    );
    this.root.appendChild(overlay);
    this.root.appendChild(h('div', { class: 'menu-footer' }, 'Juego de fans no oficial · Uso privado · v1.0'));
    audio.playMusic('menu', 'menu');
  }
  dispose() {
    this.scene?.dispose();
    this.root.remove();
  }
}

// ─────────────────────────── Vista previa de planetas ───────────────────────────
export function planetPreview(id: string, size = 96): HTMLCanvasElement {
  const p = PLANETS[id];
  const c = h('canvas', { width: String(size * 2), height: String(size * 2) }) as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  const S = size * 2;
  const R = S * 0.42;
  const img = g.createImageData(S, S);
  const n = new Noise2D(id.length * 31 + id.charCodeAt(0));
  const col = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const base = col(p.terrain.base), alt = col(p.terrain.alt), high = col(p.terrain.high), low = col(p.water?.color ?? p.terrain.low);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / R, dy = (y - S / 2) / R;
      const d2 = dx * dx + dy * dy;
      const i = (y * S + x) * 4;
      if (d2 > 1) {
        // atmósfera
        const a = Math.max(0, 1 - (Math.sqrt(d2) - 1) * 8);
        const sc = col(p.sky.top);
        img.data[i] = sc[0];
        img.data[i + 1] = sc[1];
        img.data[i + 2] = sc[2];
        img.data[i + 3] = a * 120;
        continue;
      }
      const z = Math.sqrt(1 - d2);
      const v = n.fbm(dx * 2.2 + z, dy * 2.2, 5);
      let cc = v < -0.15 && p.water ? low : v < 0 ? base : v < 0.2 ? alt : high;
      if (p.snow && Math.abs(dy) > 0.7) cc = [240, 245, 250];
      const light = Math.max(0.12, dx * -0.5 + dy * -0.4 + z * 0.8);
      img.data[i] = Math.min(255, cc[0] * light * 1.2);
      img.data[i + 1] = Math.min(255, cc[1] * light * 1.2);
      img.data[i + 2] = Math.min(255, cc[2] * light * 1.2);
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  if (id === 'geonosis') {
    g.strokeStyle = 'rgba(220,150,100,0.6)';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(S / 2, S / 2, R * 1.35, R * 0.25, -0.3, 0, Math.PI * 2);
    g.stroke();
  }
  return c;
}

// ─────────────────────────── Escaramuza ───────────────────────────
const DIFFS: [string, string][] = [['easy', 'IA Fácil'], ['normal', 'IA Normal'], ['hard', 'IA Difícil'], ['extreme', 'IA Extrema']];

export function randomCiv(exclude: string[] = []): string {
  const list = CIV_LIST.map((c) => c.id).filter((c) => !exclude.includes(c));
  return list[Math.floor(Math.random() * list.length)] ?? 'empire';
}

export function instantSetup(): GameSetup {
  const planets = PLANET_LIST.map((p) => p.id);
  const planet = planets[Math.floor(Math.random() * planets.length)];
  const civ1 = randomCiv();
  const civ2 = randomCiv([civ1]);
  return {
    planet, size: 'small', seed: Math.floor(Math.random() * 1e9), startRes: 'standard', startEra: 1, popMax: 200, victory: 'standard', reveal: 'normal', lockedTeams: true,
    players: [
      { name: settings().playerName, civ: civ1, color: 0, team: 1, human: true, difficulty: 'normal' },
      { name: CIVS[civ2].short, civ: civ2, color: 1, team: 2, human: false, difficulty: 'normal' },
    ],
  };
}

export class SkirmishScreen {
  root: HTMLElement;
  st: {
    planet: string; size: MapSize; startRes: StartRes; startEra: Era; popMax: number; victory: VictoryMode; reveal: 'normal' | 'explored' | 'all';
    locked: boolean; treaty: number; speed: number; timeLimit: number; players: PlayerSetup[];
  };
  private playersBox!: HTMLElement;
  private civInfo!: HTMLElement;
  private planetDesc!: HTMLElement;

  constructor(parent: HTMLElement, onBack: () => void, onStart: (s: GameSetup) => void) {
    const saved = loadSkirmish();
    this.st = saved ?? {
      planet: 'tatooine', size: 'small', startRes: 'standard', startEra: 1, popMax: 200, victory: 'standard', reveal: 'normal', locked: true, treaty: 0, speed: settings().gameSpeed, timeLimit: 45,
      players: [
        { name: settings().playerName, civ: 'empire', color: 0, team: 1, human: true, difficulty: 'normal' },
        { name: 'Alianza', civ: 'rebels', color: 1, team: 2, human: false, difficulty: 'normal' },
      ],
    };
    this.root = h('div', { class: 'screen' });
    this.root.appendChild(h('h1', null, 'Escaramuza'));
    this.root.appendChild(h('div', { class: 'subtitle' }, 'Configura un conflicto local en el mundo que elijas.'));
    const body = h('div', { class: 'screen-body' });
    // planetas
    const left = h('div', { class: 'panel', style: 'width:38%;display:flex;flex-direction:column;min-height:0' }, h('h2', null, 'Mundo'));
    const grid = h('div', { class: 'planet-grid' });
    for (const p of PLANET_LIST) {
      const card = h('div', { class: 'planet-card' + (p.id === this.st.planet ? ' sel' : '') }, planetPreview(p.id), h('div', { class: 'pn' }, p.name));
      card.addEventListener('click', () => {
        this.st.planet = p.id;
        for (const c of grid.children) c.classList.remove('sel');
        card.classList.add('sel');
        this.planetDesc.textContent = p.desc;
        audio.ui('click');
      });
      grid.appendChild(card);
    }
    left.appendChild(grid);
    this.planetDesc = h('div', { class: 'planet-desc' }, PLANETS[this.st.planet].desc);
    left.appendChild(this.planetDesc);
    // jugadores y opciones
    const right = h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:16px;min-width:0' });
    const pp = h('div', { class: 'panel' }, h('h2', null, 'Jugadores'));
    this.playersBox = h('div');
    pp.appendChild(this.playersBox);
    pp.appendChild(h('div', { style: 'margin-top:8px;display:flex;gap:8px' },
      h('button', { class: 'btn small', onclick: () => this.addPlayer() }, '+ Añadir jugador'),
      h('button', { class: 'btn small', onclick: () => this.removePlayer() }, '− Quitar jugador'),
      h('button', { class: 'btn small', onclick: () => this.shuffleTeams() }, 'Equipos aleatorios'),
    ));
    right.appendChild(pp);
    const opts = h('div', { class: 'panel', style: 'display:flex;gap:24px' });
    const col1 = h('div', { style: 'flex:1' }, h('h2', null, 'Partida'));
    const col2 = h('div', { style: 'flex:1' });
    this.civInfo = h('div', { class: 'civ-info', style: 'flex:1.2' });
    const sel = (label: string, opts2: [string, string][], val: string, on: (v: string) => void) => {
      const s = h('select', null, ...opts2.map(([v, l]) => h('option', { value: v, selected: v === val ? 'selected' : null }, l))) as HTMLSelectElement;
      s.addEventListener('change', () => on(s.value));
      return h('div', { class: 'form-row' }, h('label', null, label), s);
    };
    col1.appendChild(sel('Tamaño del mapa', Object.entries(MAP_SIZES).map(([k, v]) => [k, v.name]), this.st.size, (v) => (this.st.size = v as MapSize)));
    col1.appendChild(sel('Recursos iniciales', Object.entries(START_RES).map(([k, v]) => [k, v.name]), this.st.startRes, (v) => (this.st.startRes = v as StartRes)));
    col1.appendChild(sel('Era inicial', [['1', 'Era Fronteriza'], ['2', 'Era de Expansión'], ['3', 'Era de las Guerras'], ['4', 'Era Galáctica']], String(this.st.startEra), (v) => (this.st.startEra = Number(v) as Era)));
    col1.appendChild(sel('Población máxima', [['75', '75'], ['125', '125'], ['200', '200'], ['300', '300']], String(this.st.popMax), (v) => (this.st.popMax = Number(v))));
    col2.appendChild(h('h2', null, 'Reglas'));
    col2.appendChild(sel('Victoria', [['standard', 'Estándar (conquista, monumento, holocrones)'], ['conquest', 'Conquista'], ['score', 'Puntuación (tiempo límite)']], this.st.victory, (v) => (this.st.victory = v as VictoryMode)));
    col2.appendChild(sel('Visibilidad', [['normal', 'Normal'], ['explored', 'Mapa explorado'], ['all', 'Todo visible']], this.st.reveal, (v) => (this.st.reveal = v as any)));
    col2.appendChild(sel('Tregua', [['0', 'Sin tregua'], ['5', '5 minutos'], ['10', '10 minutos'], ['20', '20 minutos']], String(this.st.treaty), (v) => (this.st.treaty = Number(v))));
    col2.appendChild(sel('Equipos bloqueados', [['1', 'Sí'], ['0', 'No (diplomacia libre)']], this.st.locked ? '1' : '0', (v) => (this.st.locked = v === '1')));
    col2.appendChild(sel('Velocidad', [['1', 'Lenta (1x)'], ['1.5', 'Normal (1.5x)'], ['2', 'Rápida (2x)'], ['3', 'Muy rápida (3x)']], String(this.st.speed), (v) => (this.st.speed = Number(v))));
    opts.append(col1, col2, this.civInfo);
    right.appendChild(opts);
    body.append(left, right);
    this.root.appendChild(body);
    this.root.appendChild(h('div', { class: 'screen-actions' },
      h('button', { class: 'btn', onclick: () => onBack() }, 'Volver'),
      h('button', { class: 'btn primary', onclick: () => { saveSkirmish(this.st); onStart(this.build()); } }, 'Comenzar batalla'),
    ));
    parent.appendChild(this.root);
    this.renderPlayers();
    this.showCiv(this.st.players[0].civ);
  }

  private renderPlayers() {
    clear(this.playersBox);
    const t = h('table', { class: 'players-table' });
    t.appendChild(h('tr', null, h('th', null, '#'), h('th', null, 'Nombre'), h('th', null, 'Control'), h('th', null, 'Civilización'), h('th', null, 'Color'), h('th', null, 'Equipo')));
    this.st.players.forEach((p, i) => {
      const name = h('input', { type: 'text', value: p.name, style: 'width:130px' }) as HTMLInputElement;
      name.addEventListener('change', () => {
        p.name = name.value || p.name;
        if (p.human) saveSettings({ playerName: p.name });
      });
      const ctrl = h('select', null, h('option', { value: 'human', selected: p.human ? 'selected' : null }, 'Humano'),
        ...DIFFS.map(([v, l]) => h('option', { value: v, selected: !p.human && p.difficulty === v ? 'selected' : null }, l))) as HTMLSelectElement;
      ctrl.addEventListener('change', () => {
        if (ctrl.value === 'human') {
          for (const q of this.st.players) q.human = false;
          p.human = true;
        } else {
          p.human = false;
          p.difficulty = ctrl.value as any;
        }
        if (!this.st.players.some((q) => q.human)) this.st.players[0].human = true;
        this.renderPlayers();
      });
      const civ = h('select', null, h('option', { value: 'random', selected: p.civ === 'random' ? 'selected' : null }, '¿Aleatoria?'),
        ...CIV_LIST.map((c) => h('option', { value: c.id, selected: p.civ === c.id ? 'selected' : null }, c.name))) as HTMLSelectElement;
      civ.addEventListener('change', () => {
        p.civ = civ.value;
        if (civ.value !== 'random') this.showCiv(civ.value);
      });
      civ.addEventListener('focus', () => p.civ !== 'random' && this.showCiv(p.civ));
      const color = h('select', { style: `background:${PLAYER_COLORS[p.color].css};color:#000;font-weight:600` }, ...PLAYER_COLORS.map((c, ci) => h('option', { value: String(ci), selected: ci === p.color ? 'selected' : null, style: `background:${c.css}` }, c.name))) as HTMLSelectElement;
      color.addEventListener('change', () => {
        const nc = Number(color.value);
        const other = this.st.players.find((q) => q.color === nc);
        if (other) other.color = p.color;
        p.color = nc;
        this.renderPlayers();
      });
      const team = h('select', null, h('option', { value: '0', selected: p.team === 0 ? 'selected' : null }, '—'), ...[1, 2, 3, 4].map((n) => h('option', { value: String(n), selected: p.team === n ? 'selected' : null }, 'Equipo ' + n))) as HTMLSelectElement;
      team.addEventListener('change', () => (p.team = Number(team.value)));
      t.appendChild(h('tr', null, h('td', null, String(i + 1)), h('td', null, name), h('td', null, ctrl), h('td', null, civ), h('td', null, color), h('td', null, team)));
    });
    this.playersBox.appendChild(t);
  }

  private addPlayer() {
    if (this.st.players.length >= 8) return;
    const used = this.st.players.map((p) => p.color);
    const color = [0, 1, 2, 3, 4, 5, 6, 7].find((c) => !used.includes(c)) ?? 0;
    const civ = randomCiv();
    this.st.players.push({ name: CIVS[civ].short, civ, color, team: (this.st.players.length % 2) + 1, human: false, difficulty: 'normal' });
    if (this.st.players.length > MAP_SIZES[this.st.size].players) {
      const bigger = (Object.keys(MAP_SIZES) as MapSize[]).find((k) => MAP_SIZES[k].players >= this.st.players.length);
      if (bigger) this.st.size = bigger;
    }
    this.renderPlayers();
  }

  private removePlayer() {
    if (this.st.players.length <= 2) return;
    const idx = this.st.players.map((p) => p.human).lastIndexOf(false);
    this.st.players.splice(idx, 1);
    this.renderPlayers();
  }

  private shuffleTeams() {
    const ps = [...this.st.players].sort(() => Math.random() - 0.5);
    ps.forEach((p, i) => (p.team = (i % 2) + 1));
    this.renderPlayers();
  }

  private showCiv(id: string) {
    const c = CIVS[id];
    if (!c) return;
    clear(this.civInfo);
    this.civInfo.appendChild(h('h2', null, c.name));
    this.civInfo.appendChild(h('div', null, c.desc));
    this.civInfo.appendChild(h('div', { style: 'margin-top:6px' }, h('b', null, 'Bonificaciones:')));
    const ul = h('ul');
    for (const b of c.bonuses) ul.appendChild(h('li', null, b.text));
    ul.appendChild(h('li', { style: 'color:#6ac8ff' }, c.teamBonus.text));
    this.civInfo.appendChild(ul);
    this.civInfo.appendChild(h('div', null, h('b', null, 'Unidad única: '), UNITS[c.uniqueUnit].name));
    this.civInfo.appendChild(h('div', null, h('b', null, 'Héroes: '), c.heroes.map((x) => UNITS[x].name).join(', ')));
    this.civInfo.appendChild(h('div', null, h('b', null, 'Monumento: '), c.monumentName));
  }

  build(): GameSetup {
    const used: string[] = [];
    const players = this.st.players.map((p) => {
      const civ = p.civ === 'random' ? randomCiv(used) : p.civ;
      used.push(civ);
      return { ...p, civ, name: p.human ? p.name : p.name || CIVS[civ].short };
    });
    saveSettings({ gameSpeed: this.st.speed });
    return {
      planet: this.st.planet, size: this.st.size, seed: Math.floor(Math.random() * 1e9), startRes: this.st.startRes, startEra: this.st.startEra, popMax: this.st.popMax,
      victory: this.st.victory, timeLimit: this.st.timeLimit, reveal: this.st.reveal, lockedTeams: this.st.locked, treaty: this.st.treaty, players,
    };
  }

  dispose() {
    this.root.remove();
  }
}

function loadSkirmish(): SkirmishScreen['st'] | null {
  try {
    const raw = localStorage.getItem('swage.skirmish');
    if (raw) return JSON.parse(raw);
  } catch {
    /* */
  }
  return null;
}
function saveSkirmish(st: SkirmishScreen['st']) {
  try {
    localStorage.setItem('swage.skirmish', JSON.stringify(st));
  } catch {
    /* */
  }
}

// ─────────────────────────── Opciones ───────────────────────────
export function optionsScreen(parent: HTMLElement, onBack: () => void) {
  const s = settings();
  const root = h('div', { class: 'screen' });
  root.appendChild(h('h1', null, 'Opciones'));
  root.appendChild(h('div', { class: 'subtitle' }, 'Gráficos, audio y controles.'));
  const panel = h('div', { class: 'panel', style: 'max-width:640px' });
  const sel = (label: string, opts: [string, string][], val: string, on: (v: string) => void) => {
    const x = h('select', null, ...opts.map(([v, l]) => h('option', { value: v, selected: v === val ? 'selected' : null }, l))) as HTMLSelectElement;
    x.addEventListener('change', () => on(x.value));
    return h('div', { class: 'form-row' }, h('label', null, label), x);
  };
  const range = (label: string, val: number, min: number, max: number, step: number, on: (v: number) => void) => {
    const x = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(val) }) as HTMLInputElement;
    x.addEventListener('input', () => on(Number(x.value)));
    return h('div', { class: 'form-row' }, h('label', null, label), x);
  };
  const chk = (label: string, val: boolean, on: (v: boolean) => void) => {
    const x = h('input', { type: 'checkbox' }) as HTMLInputElement;
    x.checked = val;
    x.addEventListener('change', () => on(x.checked));
    return h('div', { class: 'form-row' }, h('label', null, label), x);
  };
  panel.appendChild(h('h2', null, 'Gráficos'));
  panel.appendChild(sel('Calidad', [['low', 'Baja (sin post-procesado)'], ['medium', 'Media'], ['high', 'Alta'], ['ultra', 'Ultra (sombras 4K)']], s.quality, (v) => saveSettings({ quality: v as any })));
  panel.appendChild(chk('Sombras', s.shadows, (v) => saveSettings({ shadows: v })));
  panel.appendChild(chk('Resplandor (bloom)', s.bloom, (v) => saveSettings({ bloom: v })));
  panel.appendChild(sel('Resolución de render', [['0.6', '60%'], ['0.8', '80%'], ['1', '100%']], String(s.pixelRatio), (v) => saveSettings({ pixelRatio: Number(v) })));
  panel.appendChild(h('h2', { style: 'margin-top:14px' }, 'Audio'));
  panel.appendChild(range('Música', s.music, 0, 1, 0.05, (v) => { saveSettings({ music: v }); audio.applySettings(); }));
  panel.appendChild(range('Efectos', s.sfx, 0, 1, 0.05, (v) => { saveSettings({ sfx: v }); audio.applySettings(); }));
  panel.appendChild(chk('Voces de unidades', s.voices, (v) => saveSettings({ voices: v })));
  panel.appendChild(h('h2', { style: 'margin-top:14px' }, 'Juego'));
  panel.appendChild(range('Velocidad de cámara', s.scrollSpeed, 0.4, 2.5, 0.1, (v) => saveSettings({ scrollSpeed: v })));
  panel.appendChild(chk('Desplazamiento por bordes', s.edgeScroll, (v) => saveSettings({ edgeScroll: v })));
  panel.appendChild(chk('Barras de vida siempre visibles', s.alwaysHealth, (v) => saveSettings({ alwaysHealth: v })));
  const nm = h('input', { type: 'text', value: s.playerName }) as HTMLInputElement;
  nm.addEventListener('change', () => saveSettings({ playerName: nm.value || 'Comandante' }));
  panel.appendChild(h('div', { class: 'form-row' }, h('label', null, 'Nombre de comandante'), nm));
  panel.appendChild(h('div', { class: 'planet-desc' }, 'Música propia: coloca archivos menu.mp3, heroic.mp3, dark.mp3, mystic.mp3, war.mp3, galaxy.mp3, victory.mp3 o defeat.mp3 en la carpeta "music" junto al juego y sustituirán a la banda sonora procedural.'));
  root.appendChild(panel);
  root.appendChild(h('div', { class: 'screen-actions', style: 'justify-content:flex-start' }, h('button', { class: 'btn', onclick: () => { root.remove(); onBack(); } }, 'Volver')));
  parent.appendChild(root);
}

export function creditsScreen(parent: HTMLElement, onBack: () => void) {
  const root = h('div', { class: 'screen', style: 'align-items:center;text-align:center' });
  root.appendChild(h('h1', null, 'Créditos'));
  root.appendChild(h('div', { style: 'max-width:720px;line-height:1.8;color:#c8ccd8;margin-top:20px' },
    h('p', null, 'Star Wars: La Era de los Imperios Galácticos es un juego de estrategia en tiempo real hecho por fans, inspirado en Age of Empires II y Star Wars: Galactic Battlegrounds.'),
    h('p', null, 'Motor, simulación, IA, modelos 3D procedurales, efectos, música y sonido generados íntegramente con código (TypeScript + Three.js + WebAudio).'),
    h('p', null, 'Star Wars y todos sus personajes, nombres y lugares son propiedad de Lucasfilm Ltd. / Disney. Proyecto sin ánimo de lucro para uso privado.'),
    h('p', { style: 'color:#ffd23d' }, 'Que la Fuerza te acompañe.'),
  ));
  root.appendChild(h('div', { class: 'screen-actions', style: 'justify-content:center' }, h('button', { class: 'btn', onclick: () => { root.remove(); onBack(); } }, 'Volver')));
  parent.appendChild(root);
}
