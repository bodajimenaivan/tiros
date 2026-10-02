// Motor de audio: efectos sintetizados con WebAudio, sonido espacial, voces y música.
import { settings } from '../ui/settings';
import { MusicEngine, type Theme } from './music';
import type { ProjectileKind, AbilityId, UnitDef } from '../data/types';

type VoiceKind = 'imperial' | 'rebel' | 'clone' | 'droid' | 'naboo' | 'gungan' | 'wookiee';

const LINES: Record<VoiceKind, Record<'select' | 'move' | 'attack' | 'build', string[]>> = {
  imperial: {
    select: ['¿Sí, señor?', 'A sus órdenes.', 'Listo.', 'Esperando órdenes.'],
    move: ['En marcha.', 'Entendido.', 'Moviéndonos.', 'Afirmativo.'],
    attack: ['¡Por el Imperio!', '¡Abran fuego!', '¡Eliminen a los rebeldes!', 'Objetivo localizado.'],
    build: ['Construcción iniciada.', 'Entendido.'],
  },
  rebel: {
    select: ['¿Sí?', 'Aquí estamos.', 'Listos.', '¿Qué hacemos?'],
    move: ['¡Vamos!', 'En camino.', 'Entendido.', '¡Rápido!'],
    attack: ['¡Por la Alianza!', '¡Al ataque!', '¡Que la Fuerza nos acompañe!', '¡Fuego!'],
    build: ['Manos a la obra.', 'Lo construiremos.'],
  },
  clone: {
    select: ['¿Señor?', 'Listo, señor.', 'Esperando órdenes.', 'Soldado presente.'],
    move: ['Sí, señor.', 'Entendido.', 'En movimiento.', 'Roger.'],
    attack: ['¡Por la República!', '¡Abran fuego!', '¡Acaben con esos droides!', '¡Al ataque!'],
    build: ['Sí, señor.', 'Entendido.'],
  },
  droid: {
    select: ['¿Orden?', 'Procesando.', 'Unidad lista.', 'Roger roger.'],
    move: ['Roger roger.', 'Roger roger.', 'Afirmativo.', 'Moviéndose.'],
    attack: ['Roger roger.', 'Objetivo adquirido.', '¡Bláster activado!', 'Eliminar enemigos.'],
    build: ['Roger roger.', 'Construyendo.'],
  },
  naboo: {
    select: ['¿Sí, alteza?', 'A su servicio.', 'Preparados.', '¿Ordenes?'],
    move: ['Enseguida.', 'Entendido.', 'Por Naboo.', 'En marcha.'],
    attack: ['¡Por Naboo!', '¡Por la reina!', '¡Al ataque!', '¡Fuego!'],
    build: ['Enseguida.', 'Será un honor.'],
  },
  gungan: {
    select: ['¿Mesa listo?', '¡Okieday!', '¿Sí, sí?', 'Mesa aquí.'],
    move: ['¡Okieday!', 'Mesa va.', '¡Sí, sí!', '¡Vamos!'],
    attack: ['¡Gran ejército gungan!', '¡Bombad!', '¡Atacando!', '¡Mesa lucha!'],
    build: ['¡Okieday!', 'Mesa construye.'],
  },
  wookiee: { select: [], move: [], attack: [], build: [] },
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  musicBus!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  noiseBuf!: AudioBuffer;
  music: MusicEngine | null = null;
  private lx = 0;
  private ly = 0;
  private ldist = 30;
  private budget = 0;
  private budgetT = 0;
  private lastVoice = 0;
  private lastAlert = 0;
  private ambience: { stop: () => void } | null = null;
  private pendingMusic: [Theme, string] | null = null;

  /** Debe llamarse tras un gesto del usuario */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(this.master);
    this.sfx = c.createGain();
    this.sfx.connect(comp);
    this.musicBus = c.createGain();
    this.musicBus.connect(comp);
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.reverbSend = c.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(comp);
    // ruido blanco reutilizable
    this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.music = new MusicEngine(c, this.musicBus, this.reverbSend);
    this.applySettings();
    if (this.pendingMusic) {
      this.playMusic(this.pendingMusic[0], this.pendingMusic[1]);
      this.pendingMusic = null;
    }
  }

  private impulse(dur: number, decay: number): AudioBuffer {
    const c = this.ctx!;
    const len = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  applySettings() {
    if (!this.ctx) return;
    const s = settings();
    this.sfx.gain.value = s.sfx * 0.9;
    this.musicBus.gain.value = s.music * 0.55;
  }

  setListener(x: number, y: number, dist: number) {
    this.lx = x;
    this.ly = y;
    this.ldist = dist;
  }

  // ─────────────────────────── utilidades de síntesis ───────────────────────────
  /** Crea la cadena de salida espacial; devuelve el nodo de entrada o null si es inaudible */
  private out(x: number | null, y: number | null, vol: number, reverb = 0.15): AudioNode | null {
    const c = this.ctx;
    if (!c || c.state !== 'running') return null;
    // limitar número de sonidos simultáneos
    const now = c.currentTime;
    if (now - this.budgetT > 0.05) {
      this.budgetT = now;
      this.budget = 0;
    }
    if (++this.budget > 7) return null;
    let gain = vol;
    let pan = 0;
    if (x !== null && y !== null) {
      const dx = x - this.lx, dy = y - this.ly;
      const d = Math.hypot(dx, dy);
      const range = 18 + this.ldist * 0.9;
      if (d > range) return null;
      gain *= Math.max(0, 1 - d / range) * Math.min(1, 34 / (this.ldist + 8));
      pan = Math.max(-0.8, Math.min(0.8, (dx - dy) * 0.03));
    }
    if (gain < 0.01) return null;
    const g = c.createGain();
    g.gain.value = gain;
    const p = c.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    p.connect(this.sfx);
    if (reverb > 0) {
      const r = c.createGain();
      r.gain.value = reverb;
      p.connect(r);
      r.connect(this.reverbSend);
    }
    return g;
  }

  private osc(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, dest: AudioNode, vol: number, attack = 0.005, curve: 'exp' | 'lin' = 'exp') {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    else o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }

  private noise(t0: number, dur: number, dest: AudioNode, vol: number, filter: BiquadFilterType, f0: number, f1: number, q = 1, attack = 0.005) {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t0, Math.random() * 1.5);
    s.stop(t0 + dur + 0.05);
  }

  // ─────────────────────────── efectos de combate ───────────────────────────
  shot(kind: ProjectileKind, civ: string, x: number, y: number) {
    const o = this.out(x, y, 0.32);
    if (!o) return;
    const t = this.ctx!.currentTime;
    const pitch = civ === 'republic' ? 1.1 : civ === 'cis' || civ === 'tradefed' ? 1.25 : civ === 'gungans' ? 0.7 : civ === 'wookiees' ? 0.85 : 1;
    const v = 0.9 + Math.random() * 0.2;
    switch (kind) {
      case 'bolt':
      case 'arrow': {
        // "pew" láser: barrido descendente con modulación metálica
        const car = this.osc('sawtooth', 1900 * pitch * v, 260 * pitch, t, 0.16, o, 0.18);
        const mod = this.ctx!.createOscillator();
        mod.frequency.value = 480 * v;
        const mg = this.ctx!.createGain();
        mg.gain.value = 600;
        mod.connect(mg);
        mg.connect(car.frequency);
        mod.start(t);
        mod.stop(t + 0.2);
        this.osc('sine', 1200 * pitch * v, 180, t, 0.14, o, 0.25);
        break;
      }
      case 'heavyBolt':
        this.osc('sawtooth', 900 * v, 110, t, 0.3, o, 0.25);
        this.osc('square', 450 * v, 60, t, 0.25, o, 0.12);
        this.noise(t, 0.12, o, 0.2, 'lowpass', 2400, 300);
        break;
      case 'ion':
        for (let i = 0; i < 3; i++) this.osc('square', 300 + i * 7, 120, t + i * 0.02, 0.35, o, 0.07);
        this.osc('sine', 700, 1400, t, 0.3, o, 0.1);
        break;
      case 'missile':
        this.noise(t, 0.6, o, 0.28, 'bandpass', 600, 2200, 1.5, 0.05);
        this.osc('sawtooth', 220, 440, t, 0.4, o, 0.05);
        break;
      case 'grenade':
      case 'energyBall':
        this.osc('sine', 260, 90, t, 0.18, o, 0.4);
        this.noise(t, 0.08, o, 0.2, 'lowpass', 1500, 400);
        break;
      case 'shell':
        this.osc('sine', 120, 40, t, 0.5, o, 0.7);
        this.noise(t, 0.4, o, 0.5, 'lowpass', 1800, 200);
        break;
      case 'bomb':
        this.osc('sine', 1400, 300, t, 0.7, o, 0.08, 0.05, 'lin');
        break;
      default:
        break;
    }
  }

  melee(saber: boolean, x: number, y: number) {
    const o = this.out(x, y, saber ? 0.32 : 0.25);
    if (!o) return;
    const t = this.ctx!.currentTime;
    if (saber) {
      // vuuum del sable: zumbido con barrido doppler
      const f = 85 + Math.random() * 25;
      this.osc('sawtooth', f, f * 1.6, t, 0.18, o, 0.18, 0.02, 'lin');
      this.osc('sawtooth', f * 1.01, f * 0.8, t + 0.15, 0.2, o, 0.15, 0.01, 'lin');
      this.noise(t, 0.25, o, 0.12, 'bandpass', 900, 3000, 2);
      if (Math.random() < 0.4) {
        // choque
        this.noise(t + 0.08, 0.15, o, 0.35, 'highpass', 2500, 1500, 1);
        this.osc('square', 140, 120, t + 0.08, 0.15, o, 0.1);
      }
    } else {
      this.noise(t, 0.09, o, 0.4, 'lowpass', 1200, 200);
      this.osc('sine', 140, 60, t, 0.1, o, 0.3);
    }
  }

  deflect(x: number, y: number) {
    const o = this.out(x, y, 0.3);
    if (!o) return;
    const t = this.ctx!.currentTime;
    this.osc('sine', 2200, 4200, t, 0.12, o, 0.2);
    this.noise(t, 0.12, o, 0.3, 'highpass', 3000, 2000, 1);
    this.osc('sawtooth', 110, 160, t, 0.2, o, 0.1);
  }

  explosion(size: number, x: number, y: number) {
    const o = this.out(x, y, Math.min(1, 0.45 + size * 0.25), 0.3);
    if (!o) return;
    const t = this.ctx!.currentTime;
    const dur = 0.6 + size * 0.5;
    this.noise(t, dur, o, 0.8, 'lowpass', 3500, 120, 0.7, 0.003);
    this.osc('sine', 110, 28, t, dur, o, 0.9);
    this.osc('triangle', 60, 25, t, dur * 0.8, o, 0.5);
    if (size > 1) this.noise(t + 0.1, dur, o, 0.3, 'bandpass', 600, 200, 0.8);
  }

  death(defId: string, x: number, y: number) {
    const o = this.out(x, y, 0.2);
    if (!o) return;
    const t = this.ctx!.currentTime;
    if (defId.includes('droid') || defId === 'worker') {
      this.osc('square', 900, 200, t, 0.25, o, 0.08);
      this.noise(t, 0.15, o, 0.15, 'highpass', 4000, 2000);
    } else {
      this.noise(t, 0.12, o, 0.15, 'lowpass', 900, 200);
    }
  }

  lightning(x: number, y: number) {
    const o = this.out(x, y, 0.45, 0.3);
    if (!o) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) this.noise(t + i * 0.06, 0.1 + Math.random() * 0.1, o, 0.35, 'bandpass', 2500 + Math.random() * 3000, 1500, 3);
    this.osc('sawtooth', 60, 50, t, 0.5, o, 0.15);
  }

  ability(id: AbilityId, x: number, y: number) {
    const o = this.out(x, y, 0.5, 0.4);
    if (!o) return;
    const t = this.ctx!.currentTime;
    switch (id) {
      case 'forcePush':
      case 'roar':
        this.noise(t, 0.6, o, 0.5, 'lowpass', 2500, 150, 1, 0.02);
        this.osc('sine', 90, 35, t, 0.6, o, 0.6);
        if (id === 'roar') this.wookieeGrowl(o, t, 1.2);
        break;
      case 'forceHeal':
      case 'battleMeditation':
      case 'rally':
      case 'shieldBubble':
      case 'droidCommand':
        [523, 659, 784, 1046].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.08, 0.6, o, 0.12, 0.02));
        break;
      case 'saberSpin':
      case 'saberThrow':
        for (let i = 0; i < 4; i++) this.osc('sawtooth', 90, 160, t + i * 0.12, 0.15, o, 0.15, 0.02, 'lin');
        break;
      case 'forceChoke':
        this.osc('sawtooth', 60, 55, t, 1.2, o, 0.1);
        this.noise(t, 1.0, o, 0.1, 'bandpass', 400, 300, 4);
        break;
      case 'thermalDetonator':
      case 'orbitalStrike':
        for (let i = 0; i < 6; i++) this.osc('square', 1800, 1800, t + i * 0.1, 0.05, o, 0.06);
        break;
      case 'jetpack':
        this.noise(t, 0.6, o, 0.4, 'bandpass', 500, 1500, 1, 0.05);
        break;
      case 'clumsy':
        this.osc('sine', 400, 800, t, 0.2, o, 0.2, 0.01, 'lin');
        this.osc('sine', 800, 300, t + 0.2, 0.3, o, 0.2, 0.01, 'lin');
        break;
      case 'rapidFire':
        for (let i = 0; i < 5; i++) this.osc('sawtooth', 1600, 300, t + i * 0.06, 0.1, o, 0.1);
        break;
      default:
        break;
    }
  }

  gather(res: string, x: number, y: number) {
    const o = this.out(x, y, 0.1);
    if (!o) return;
    const t = this.ctx!.currentTime;
    if (res === 'carbon') this.noise(t, 0.07, o, 0.4, 'bandpass', 1400, 700, 2);
    else if (res === 'nova') this.osc('sine', 2400 + Math.random() * 400, 2600, t, 0.25, o, 0.15);
    else if (res === 'ore') {
      this.osc('triangle', 900, 800, t, 0.12, o, 0.2);
      this.noise(t, 0.05, o, 0.3, 'highpass', 3000, 2000);
    } else this.noise(t, 0.06, o, 0.2, 'lowpass', 800, 300);
  }

  private wookieeGrowl(dest: AudioNode, t: number, dur: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.linearRampToValueAtTime(260, t + dur * 0.4);
    o.frequency.linearRampToValueAtTime(130, t + dur);
    const vib = c.createOscillator();
    vib.frequency.value = 22;
    const vg = c.createGain();
    vg.gain.value = 18;
    vib.connect(vg);
    vg.connect(o.frequency);
    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 650;
    f1.Q.value = 3;
    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1100;
    f2.Q.value = 4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.08);
    g.gain.setValueAtTime(0.5, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1);
    o.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(dest);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.1);
    vib.stop(t + dur + 0.1);
  }

  private droidChirp(dest: AudioNode, t: number) {
    for (let i = 0; i < 4 + Math.floor(Math.random() * 4); i++) {
      const f = 900 + Math.random() * 2200;
      this.osc('sine', f, f * (0.6 + Math.random() * 0.9), t + i * 0.07, 0.07, dest, 0.12, 0.005, 'lin');
    }
  }

  // ─────────────────────────── interfaz ───────────────────────────
  ui(kind: 'click' | 'error' | 'research' | 'trained' | 'built' | 'place' | 'convert') {
    const o = this.out(null, null, 0.3, 0.05);
    if (!o) return;
    const t = this.ctx!.currentTime;
    switch (kind) {
      case 'click':
        this.osc('sine', 1400, 900, t, 0.05, o, 0.25);
        break;
      case 'error':
        this.osc('square', 180, 160, t, 0.12, o, 0.12);
        this.osc('square', 140, 120, t + 0.13, 0.15, o, 0.12);
        break;
      case 'research':
        [784, 988, 1175, 1568].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.07, 0.4, o, 0.15, 0.01));
        break;
      case 'trained':
        this.osc('triangle', 660, 660, t, 0.18, o, 0.15);
        this.osc('triangle', 990, 990, t + 0.09, 0.25, o, 0.12);
        break;
      case 'built':
        this.noise(t, 0.12, o, 0.4, 'lowpass', 900, 200);
        this.osc('triangle', 523, 523, t + 0.1, 0.3, o, 0.15);
        this.osc('triangle', 784, 784, t + 0.18, 0.4, o, 0.15);
        break;
      case 'place':
        this.noise(t, 0.08, o, 0.35, 'lowpass', 700, 200);
        this.osc('sine', 200, 120, t, 0.12, o, 0.3);
        break;
      case 'convert':
        [440, 554, 659, 880].forEach((f, i) => this.osc('sine', f, f * 1.01, t + i * 0.1, 0.5, o, 0.12, 0.05));
        break;
    }
  }

  alert() {
    const now = performance.now();
    if (now - this.lastAlert < 8000) return;
    this.lastAlert = now;
    const o = this.out(null, null, 0.4, 0.2);
    if (!o) return;
    const t = this.ctx!.currentTime;
    // bocina de alarma de dos tonos
    for (let i = 0; i < 3; i++) {
      this.osc('sawtooth', 520, 520, t + i * 0.42, 0.2, o, 0.15, 0.01);
      this.osc('sawtooth', 390, 390, t + i * 0.42 + 0.2, 0.2, o, 0.15, 0.01);
    }
  }

  fanfare() {
    const o = this.out(null, null, 0.45, 0.4);
    if (!o) return;
    const t = this.ctx!.currentTime;
    const notes = [[392, 0], [523, 0.15], [659, 0.3], [784, 0.45], [1046, 0.75]];
    for (const [f, d] of notes) {
      this.osc('sawtooth', f, f, t + d, d === 0.75 ? 1.2 : 0.3, o, 0.12, 0.02);
      this.osc('square', f / 2, f / 2, t + d, d === 0.75 ? 1.2 : 0.3, o, 0.05, 0.02);
    }
  }

  buildingSelect(defId: string) {
    const o = this.out(null, null, 0.18, 0.1);
    if (!o) return;
    const t = this.ctx!.currentTime;
    const f = defId === 'temple' ? 330 : defId === 'command_center' ? 220 : 440;
    this.osc('triangle', f, f, t, 0.15, o, 0.15);
    this.osc('triangle', f * 1.5, f * 1.5, t + 0.06, 0.2, o, 0.1);
  }

  voice(kind: VoiceKind, ev: 'select' | 'move' | 'attack' | 'build', ud: UnitDef) {
    if (!settings().voices) return;
    const now = performance.now();
    if (now - this.lastVoice < 900) return;
    this.lastVoice = now;
    // criaturas y wookiees: sonidos sintetizados
    const isDroid = ud.tags.includes('droid') || kind === 'droid' || ud.voice === 'droid';
    const o = this.out(null, null, 0.4, 0.1);
    if (o && (kind === 'wookiee' || ud.voice === 'wookiee')) {
      this.wookieeGrowl(o, this.ctx!.currentTime, 0.6 + Math.random() * 0.4);
      return;
    }
    if (ud.cls === 'worker' && isDroid && o) {
      this.droidChirp(o, this.ctx!.currentTime);
      return;
    }
    if (ud.tags.includes('mech') || ud.air || ud.cls === 'animal') {
      if (o) {
        const t = this.ctx!.currentTime;
        this.osc('sine', 600, 900, t, 0.08, o, 0.1);
        this.osc('sine', 900, 700, t + 0.09, 0.1, o, 0.1);
      }
      return;
    }
    const synth = (globalThis as any).speechSynthesis as SpeechSynthesis | undefined;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      if (o) this.droidChirp(o, this.ctx!.currentTime);
      return;
    }
    const lines = LINES[kind]?.[ev];
    if (!lines || !lines.length) return;
    let text = lines[Math.floor(Math.random() * lines.length)];
    if (ud.cls === 'hero') text = heroLine(ud.id, ev) ?? text;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      const voices = synth.getVoices().filter((v) => v.lang.startsWith('es'));
      if (voices.length) u.voice = voices[Math.floor(Math.random() * Math.min(2, voices.length))];
      u.volume = Math.min(1, settings().sfx * 0.9);
      u.pitch = isDroid ? 1.7 : kind === 'gungan' ? 1.45 : kind === 'clone' ? 0.75 : kind === 'imperial' ? 0.85 : ud.voice === 'vader' || ud.voice === 'palpatine' ? 0.3 : ud.voice === 'yoda' ? 1.3 : 1;
      u.rate = isDroid ? 1.25 : kind === 'gungan' ? 1.15 : 1.05;
      synth.speak(u);
    } catch {
      /* sin voz */
    }
  }

  // ─────────────────────────── música y ambiente ───────────────────────────
  playMusic(theme: Theme, context: string) {
    if (!this.ctx || !this.music) {
      this.pendingMusic = [theme, context];
      return;
    }
    this.music.play(theme);
    if (context === 'game') this.startAmbience();
    else this.stopAmbience();
  }

  setIntensity(v: number) {
    this.music?.setIntensity(v);
  }

  pauseMusic() {
    this.music?.pause();
  }
  resumeMusic() {
    this.music?.resume();
  }

  stopAll() {
    this.music?.stop();
    this.stopAmbience();
    try {
      (globalThis as any).speechSynthesis?.cancel();
    } catch {
      /* */
    }
  }

  private ambiencePlanet = '';
  setAmbience(planetBiome: string) {
    this.ambiencePlanet = planetBiome;
  }

  private startAmbience() {
    this.stopAmbience();
    const c = this.ctx;
    if (!c) return;
    const biome = this.ambiencePlanet;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = biome === 'volcanic' ? 220 : biome === 'ice' ? 900 : biome === 'desert' || biome === 'redrock' ? 600 : 400;
    const g = c.createGain();
    g.gain.value = biome === 'ice' ? 0.09 : biome === 'volcanic' ? 0.12 : 0.05;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.08;
    const lg = c.createGain();
    lg.gain.value = 0.03;
    lfo.connect(lg);
    lg.connect(g.gain);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start();
    lfo.start();
    let timer = 0;
    const tick = () => {
      if (!this.ctx) return;
      const o = this.out(null, null, 0.08, 0.5);
      const t = this.ctx.currentTime;
      if (o) {
        if (biome === 'jungle' || biome === 'forest' || biome === 'swamp' || biome === 'grassland' || biome === 'tropical' || biome === 'fungal' || biome === 'plains') {
          const f0 = 2000 + Math.random() * 2500;
          for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.osc('sine', f0, f0 * (1.1 + Math.random() * 0.3), t + i * 0.12, 0.09, o, 0.15, 0.01, 'lin');
        } else if (biome === 'volcanic') this.noise(t, 2, o, 0.4, 'lowpass', 120, 60, 1, 0.5);
      }
      timer = window.setTimeout(tick, 2500 + Math.random() * 6000);
    };
    timer = window.setTimeout(tick, 3000);
    this.ambience = {
      stop: () => {
        clearTimeout(timer);
        try {
          src.stop();
          lfo.stop();
        } catch {
          /* */
        }
      },
    };
  }

  private stopAmbience() {
    this.ambience?.stop();
    this.ambience = null;
  }
}

function heroLine(id: string, ev: string): string | null {
  const m: Record<string, string[]> = {
    vader: ['Su falta de fe me resulta perturbadora.', 'Ahora soy el maestro.', 'El poder del Lado Oscuro.'],
    palpatine: ['Todo procede según lo previsto.', '¡Poder ilimitado!', 'Siento tu ira.'],
    luke: ['Soy un Jedi, como mi padre.', 'Que la Fuerza me acompañe.', 'Nunca me uniré a ti.'],
    han: ['Tengo un mal presentimiento.', 'Nunca me digas las probabilidades.', 'Lo sé.'],
    leia: ['Ayúdanos, eres nuestra única esperanza.', '¡Por la Rebelión!', 'Alguien tiene que salvarnos.'],
    yoda: ['Hazlo, o no lo hagas. Pero no lo intentes.', 'Grande en la Fuerza, yo soy.', 'Miedo es el camino al Lado Oscuro.'],
    obiwan: ['Hola, ¿qué tal?', 'Que la Fuerza te acompañe.', 'Tengo la ventaja.'],
    mace: ['Esta fiesta se ha terminado.', 'Por la República.', 'Prepárense.'],
    rex: ['¡Ahora, muchachos!', 'Sí, señor.', '¡Por la 501!'],
    dooku: ['Dos sith pueden ser mejor que uno.', 'Tus poderes son débiles.', 'Interesante.'],
    grievous: ['¡Te estaba esperando!', 'Soldados, ¡ataquen!', 'Será mi trofeo.'],
    maul: ['Por fin nos revelaremos.', 'Venganza.', '...'],
    quigon: ['Siempre hay un pez más grande.', 'Mantén la concentración.', 'Confía en la Fuerza.'],
    padme: ['¡Por Naboo!', 'Seremos libres.', 'No me rendiré.'],
    jarjar: ['¡Mesa amor!', '¡Ay, ay, ay!', '¡Ese es bombad!'],
    boba_fett: ['Él no vale nada muerto.', 'Como desee.', 'Contrato aceptado.'],
  };
  const l = m[id];
  if (!l) return null;
  void ev;
  return l[Math.floor(Math.random() * l.length)];
}

export const audio = new AudioEngine();

// iniciar audio con el primer gesto del usuario
const unlock = () => {
  audio.init();
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
