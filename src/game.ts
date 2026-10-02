// Sesión de juego: une simulación, IA, render, HUD, entrada y audio.
import { World, TICK } from './sim/world';
import { attachAI, type AIController } from './ai/ai';
import type { GameSetup, GameEvent } from './sim/types';
import { GameRenderer } from './render/renderer';
import { Hud } from './ui/hud';
import { InputController } from './ui/input';
import { settings } from './ui/settings';
import { h } from './ui/dom';
import { audio } from './audio/audio';
import { ERA_NAMES } from './data/techs';
import { TECHS } from './data/techs';
import { UNITS } from './data/units';
import { BUILDINGS } from './data/buildings';

export interface SessionResult {
  winner: boolean;
  winners: number[];
  world: World;
}

const TIPS = [
  'Los Cargueros Comerciales ganan más Nova cuanto más lejos esté el puerto espacial de destino; con un aliado, aún más.',
  'Cuando se agoten los cristales de Nova, vende comida de tus granjas en el Puerto Espacial: los precios se recuperan con el tiempo.',
  'Guarnece trabajadores en el Centro de Mando para que dispare más proyectiles contra los atacantes.',
  'Las torretas y fortalezas apenas sufren con los blásteres: usa arietes o artillería para derribarlas.',
  'Los Jedi y Sith desvían los disparos de bláster, pero son vulnerables a granadas y artillería.',
  'Los Destructores de Mechs destrozan andadores y tropas montadas, pero caen rápido ante los soldados.',
  'Construye Núcleos de Energía: los edificios militares sin energía producen a la mitad de velocidad.',
  'Los Maestros Jedi/Sith pueden convertir unidades enemigas. Protégelos bien.',
  'Lleva todos los holocrones a tu Templo y defiéndelos para lograr la victoria.',
  'Los Generadores de Escudos reducen el daño que reciben tus unidades y edificios en su radio.',
  'Pulsa "." para seleccionar trabajadores ociosos y "H" para ir a tu Centro de Mando.',
  'Usa Ctrl + número para crear grupos de unidades y el número para seleccionarlos.',
  'La artillería no puede disparar a corta distancia: escóltala con infantería.',
  'Las unidades en terreno elevado causan un 25% más de daño.',
  'Los antiaéreos y las torretas AA son la mejor defensa contra bombarderos.',
  'Los héroes tienen habilidades especiales: búscalas en el panel de órdenes.',
];

export class GameSession {
  world: World;
  ais: AIController[];
  renderer!: GameRenderer;
  hud!: Hud;
  input!: InputController;
  root: HTMLElement;
  viewer: number;
  speed: number;
  paused = false;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private onEnd: (r: SessionResult) => void;
  private onQuit: () => void;
  private endShown = false;
  private musicIntensity = 0;
  realTime = 0;

  constructor(parent: HTMLElement, setup: GameSetup, onEnd: (r: SessionResult) => void, onQuit: () => void) {
    this.onEnd = onEnd;
    this.onQuit = onQuit;
    this.root = h('div', { class: 'game-root' });
    parent.appendChild(this.root);
    this.world = new World(setup);
    this.ais = attachAI(this.world);
    const human = this.world.players.find((p) => p.human);
    this.viewer = human ? human.id : 1;
    this.speed = settings().gameSpeed;
  }

  /** Muestra la pantalla de carga y construye el render */
  async start() {
    const w = this.world;
    const loading = h('div', { class: 'loading' },
      h('div', { class: 'lt' }, w.planet.name),
      h('div', { class: 'ld' }, w.planet.desc),
      h('div', { class: 'bar' }, h('div')),
      h('div', { class: 'tip' }, 'Consejo: ' + TIPS[Math.floor(Math.random() * TIPS.length)]),
    );
    this.root.appendChild(loading);
    await new Promise((r) => setTimeout(r, 60));
    const s = settings();
    const canvasHost = h('div', { class: 'game-canvas' });
    this.root.appendChild(canvasHost);
    this.renderer = new GameRenderer(canvasHost, w, this.viewer, { quality: s.quality, shadows: s.shadows, bloom: s.bloom, pixelRatio: s.pixelRatio });
    if (w.setup.reveal === 'all') this.renderer.revealAll = false;
    this.hud = new Hud(this);
    this.input = new InputController(this);
    // precalentar shaders con un frame
    this.renderer.render(0.016, 0);
    await new Promise((r) => setTimeout(r, 30));
    loading.remove();
    audio.playMusic(w.planet.music ?? 'heroic', 'game');
    this.hud.banner(w.setup.campaignTitle ?? w.planet.name);
    this.hud.message(`Bienvenido a ${w.planet.name}. ${w.players[this.viewer]?.civ.name ?? ''}: construye tu colonia y derrota a tus enemigos.`, '#9fd8ff');
    this.running = true;
    this.last = performance.now();
    window.addEventListener('resize', this.onResize);
    this.raf = requestAnimationFrame(this.loop);
  }

  private onResize = () => {
    this.renderer.resize();
    this.hud.resize();
  };

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.realTime += dt;
    if (!this.paused) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= TICK && steps < 12) {
        this.world.step();
        this.handleEvents(this.world.events);
        this.world.events.length = 0;
        this.acc -= TICK;
        steps++;
      }
      if (steps >= 12) this.acc = 0;
    }
    this.input.update(dt);
    this.renderer.render(dt, this.paused ? 1 : this.acc / TICK);
    this.hud.update(dt);
    audio.setListener(this.renderer.camTarget.x, this.renderer.camTarget.z, this.renderer.camDist);
    // intensidad musical según combate cercano
    this.musicIntensity = Math.max(0, this.musicIntensity - dt * 0.08);
    audio.setIntensity(this.musicIntensity);
    if (this.world.gameOver && !this.endShown) {
      this.endShown = true;
      setTimeout(() => this.finish(), 2500);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private handleEvents(events: GameEvent[]) {
    const w = this.world;
    const v = this.viewer;
    this.renderer.processEvents(events);
    const camX = this.renderer.camTarget.x, camY = this.renderer.camTarget.z;
    const near = (x: number, y: number) => Math.hypot(x - camX, y - camY) < this.renderer.camDist * 1.2 + 6 && (w.isVisibleTo(v, x, y) || this.renderer.revealAll);
    for (const ev of events) {
      switch (ev.t) {
        case 'msg':
          if (ev.owner === v || ev.owner === -1) this.hud.message(ev.text, ev.color);
          break;
        case 'underAttack':
          if (ev.owner === v) {
            this.hud.message(ev.building ? '¡Tus edificios están siendo atacados!' : '¡Tus unidades están siendo atacadas!', '#ff6a5a');
            this.hud.alertAt(ev.x, ev.y);
            audio.alert();
          }
          break;
        case 'popCap':
          if (ev.owner === v) {
            this.hud.message('Población máxima alcanzada. Construye refugios prefabricados.', '#ffb04a');
            audio.ui('error');
          }
          break;
        case 'research':
          if (ev.owner === v) {
            const t = TECHS[ev.techId];
            if (!t.eraAdvance) this.hud.message(`Investigación completada: ${t.name}.`, '#8adfff');
            audio.ui('research');
          }
          break;
        case 'era':
          if (ev.owner === v) {
            this.hud.banner(ERA_NAMES[ev.era]);
            audio.fanfare();
          }
          break;
        case 'trained':
          if (ev.owner === v) {
            const u = w.entities.get(ev.id);
            if (u && UNITS[ev.defId].cls === 'hero') this.hud.message(`¡${UNITS[ev.defId].name} se une a la batalla!`, '#ffd23d');
            audio.ui('trained');
          }
          break;
        case 'built':
          if (ev.owner === v) {
            audio.ui('built');
            if (BUILDINGS[ev.defId].monument) this.hud.message('¡Monumento completado!', '#ffd23d');
          }
          break;
        case 'defeated':
          if (ev.owner === v) this.hud.banner('Has sido derrotado');
          break;
        case 'converted':
          if (ev.from === v) this.hud.message('¡Una de tus unidades ha sido convertida!', '#ff6a5a');
          if (ev.to === v) audio.ui('convert');
          break;
        case 'shot': {
          if (!near(ev.x, ev.y)) break;
          audio.shot(ev.kind, w.players[ev.owner]?.civ.id ?? '', ev.x, ev.y);
          this.musicIntensity = Math.min(1, this.musicIntensity + 0.02);
          break;
        }
        case 'melee': {
          if (!near(ev.x, ev.y)) break;
          audio.melee(ev.saber, ev.x, ev.y);
          this.musicIntensity = Math.min(1, this.musicIntensity + 0.02);
          break;
        }
        case 'deflect':
          if (near(ev.x, ev.y)) audio.deflect(ev.x, ev.y);
          break;
        case 'explosion':
          if (near(ev.x, ev.y)) audio.explosion(ev.size, ev.x, ev.y);
          break;
        case 'death':
          if (near(ev.x, ev.y)) {
            if (ev.kind === 'building') audio.explosion(2, ev.x, ev.y);
            else if (ev.mech) audio.explosion(0.8, ev.x, ev.y);
            else audio.death(ev.defId, ev.x, ev.y);
          }
          break;
        case 'lightning':
          if (near(ev.pts[0], ev.pts[1])) audio.lightning(ev.pts[0], ev.pts[1]);
          break;
        case 'ability': {
          if (near(ev.x, ev.y)) audio.ability(ev.ability, ev.x, ev.y);
          break;
        }
        case 'gather':
          if (near(w.entities.get(ev.id)?.x ?? -999, w.entities.get(ev.id)?.y ?? -999) && this.renderer.camDist < 40) audio.gather(ev.res, w.entities.get(ev.id)!.x, w.entities.get(ev.id)!.y);
          break;
        case 'holocron':
          if (ev.owner === v) audio.ui(ev.action === 'deposit' ? 'research' : 'click');
          break;
        case 'gameOver':
          break;
      }
    }
  }

  setSpeed(s: number) {
    this.speed = Math.max(0.5, Math.min(4, s));
    this.hud.message(`Velocidad de juego: ${this.speed.toFixed(1)}x`, '#9fd8ff');
  }

  togglePause() {
    this.paused = !this.paused;
    this.hud.setPaused(this.paused);
    if (this.paused) audio.pauseMusic();
    else audio.resumeMusic();
  }

  private finish() {
    const w = this.world;
    const winner = w.winners.includes(this.viewer);
    audio.playMusic(winner ? 'victory' : 'defeat', 'end');
    this.hud.showEnd(winner, () => {
      this.dispose();
      this.onEnd({ winner, winners: w.winners, world: w });
    });
  }

  resign() {
    const p = this.world.players[this.viewer];
    if (p) {
      p.resigned = true;
      this.world.checkVictory();
      if (!this.world.gameOver) {
        // si el jugador abandona y la partida continúa entre IAs, terminarla
        this.world.declareVictory(-1, 'Te has rendido.');
      }
    }
  }

  quit() {
    this.dispose();
    this.onQuit();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.input?.dispose();
    this.hud?.dispose();
    this.renderer?.dispose();
    this.root.remove();
    audio.stopAll();
  }
}
