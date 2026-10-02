// Música orquestal procedural (composiciones originales al estilo épico espacial)
// con soporte para archivos propios en /music/<tema>.mp3 o .ogg.

export type Theme = 'heroic' | 'dark' | 'mystic' | 'war' | 'menu' | 'galaxy' | 'victory' | 'defeat';

interface ThemeDef {
  tempo: number;
  root: number; // MIDI de la tónica
  scale: number[];
  chords: [number, 'M' | 'm' | 'sus' | 'dim' | 'M7' | 'm7'][]; // grado (semitonos) y tipo
  melody: 'fanfare' | 'march' | 'lyric' | 'ostinato' | 'none';
  perc: 'march' | 'drive' | 'soft' | 'none' | 'timp';
  pad: 'strings' | 'choir' | 'both';
  harp: boolean;
  loop: boolean;
}

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const HARM = [0, 2, 3, 5, 7, 8, 11];
const DOR = [0, 2, 3, 5, 7, 9, 10];
const LYD = [0, 2, 4, 6, 7, 9, 11];
const MIX = [0, 2, 4, 5, 7, 9, 10];

const THEMES: Record<Theme, ThemeDef> = {
  menu: { tempo: 92, root: 53, scale: LYD, chords: [[0, 'M'], [2, 'M'], [-3, 'm'], [-5, 'M'], [0, 'M'], [5, 'M'], [-2, 'M'], [-5, 'sus']], melody: 'fanfare', perc: 'timp', pad: 'strings', harp: true, loop: true },
  heroic: { tempo: 108, root: 58, scale: MIX, chords: [[0, 'M'], [-2, 'M'], [5, 'M'], [0, 'M'], [-4, 'M'], [-2, 'M'], [-5, 'M'], [-5, 'sus']], melody: 'fanfare', perc: 'march', pad: 'strings', harp: false, loop: true },
  dark: { tempo: 96, root: 55, scale: HARM, chords: [[0, 'm'], [-4, 'M'], [0, 'm'], [-5, 'M'], [0, 'm'], [1, 'M'], [-4, 'M'], [-5, 'M']], melody: 'march', perc: 'march', pad: 'both', harp: false, loop: true },
  mystic: { tempo: 68, root: 50, scale: DOR, chords: [[0, 'm7'], [5, 'M'], [-2, 'M7'], [3, 'M'], [0, 'm'], [-5, 'm7'], [-2, 'M'], [-3, 'sus']], melody: 'lyric', perc: 'soft', pad: 'both', harp: true, loop: true },
  war: { tempo: 132, root: 48, scale: MIN, chords: [[0, 'm'], [0, 'm'], [-4, 'M'], [-2, 'M'], [0, 'm'], [3, 'M'], [-5, 'm'], [-5, 'M']], melody: 'ostinato', perc: 'drive', pad: 'strings', harp: false, loop: true },
  galaxy: { tempo: 74, root: 52, scale: LYD, chords: [[0, 'M7'], [2, 'M'], [-3, 'm7'], [-5, 'sus'], [0, 'M'], [-1, 'm'], [-3, 'M'], [-5, 'M']], melody: 'lyric', perc: 'timp', pad: 'both', harp: true, loop: true },
  victory: { tempo: 100, root: 58, scale: MAJ, chords: [[0, 'M'], [5, 'M'], [-5, 'M'], [0, 'M']], melody: 'fanfare', perc: 'timp', pad: 'strings', harp: false, loop: false },
  defeat: { tempo: 60, root: 50, scale: MIN, chords: [[0, 'm'], [-4, 'M'], [-7, 'm'], [0, 'm']], melody: 'lyric', perc: 'none', pad: 'choir', harp: false, loop: false },
};

function chordNotes(root: number, deg: number, q: string): number[] {
  const r = root + deg;
  switch (q) {
    case 'm': return [r, r + 3, r + 7];
    case 'sus': return [r, r + 5, r + 7];
    case 'dim': return [r, r + 3, r + 6];
    case 'M7': return [r, r + 4, r + 7, r + 11];
    case 'm7': return [r, r + 3, r + 7, r + 10];
    default: return [r, r + 4, r + 7];
  }
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// motivos rítmicos en semicorcheas: [paso, duración, grado relativo]
const FANFARE_MOTIFS: [number, number, number][][] = [
  [[0, 2, 0], [2, 2, 4], [4, 6, 7], [10, 2, 6], [12, 4, 4]],
  [[0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 5, 4], [8, 4, 7], [12, 4, 9]],
  [[0, 6, 7], [6, 2, 4], [8, 4, 5], [12, 4, 4]],
  [[0, 3, 4], [3, 1, 5], [4, 4, 7], [8, 2, 9], [10, 2, 7], [12, 4, 11]],
];
const MARCH_MOTIFS: [number, number, number][][] = [
  [[0, 4, 0], [4, 4, 0], [8, 4, 0], [12, 3, -4], [15, 1, 3]],
  [[0, 4, 7], [4, 3, -4], [7, 1, 3], [8, 4, 0], [12, 4, -1]],
  [[0, 3, 0], [3, 1, 3], [4, 4, 7], [8, 3, 8], [11, 1, 7], [12, 4, 3]],
];
const LYRIC_MOTIFS: [number, number, number][][] = [
  [[0, 8, 4], [8, 4, 2], [12, 4, 0]],
  [[0, 6, 7], [6, 2, 9], [8, 8, 4]],
  [[0, 4, 2], [4, 4, 4], [8, 8, 7]],
];

export class MusicEngine {
  private ctx: AudioContext;
  private bus: GainNode;
  private rev: AudioNode;
  private out: GainNode;
  private theme: Theme | null = null;
  private def: ThemeDef | null = null;
  private timer = 0;
  private step = 0;
  private bar = 0;
  private nextTime = 0;
  private intensity = 0;
  private paused = false;
  private file: HTMLAudioElement | null = null;
  private motifs: [number, number, number][][] = [];
  private noise: AudioBuffer;
  private seed = 1;

  constructor(ctx: AudioContext, bus: GainNode, reverbSend: AudioNode) {
    this.ctx = ctx;
    this.bus = bus;
    this.rev = reverbSend;
    this.out = ctx.createGain();
    this.out.gain.value = 0.8;
    this.out.connect(bus);
    const send = ctx.createGain();
    send.gain.value = 0.9;
    this.out.connect(send);
    send.connect(reverbSend);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  private rnd() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  play(theme: Theme) {
    if (this.theme === theme && !this.paused) return;
    this.stop();
    this.theme = theme;
    // intentar música del usuario
    const tryFile = (exts: string[]) => {
      if (!exts.length) {
        this.startProcedural(theme);
        return;
      }
      const a = new Audio(`music/${theme}.${exts[0]}`);
      a.loop = THEMES[theme].loop;
      a.volume = 1;
      let done = false;
      a.addEventListener('canplay', () => {
        if (done || this.theme !== theme) return;
        done = true;
        this.file = a;
        try {
          const src = this.ctx.createMediaElementSource(a);
          src.connect(this.bus);
        } catch {
          /* ya conectado */
        }
        a.play().catch(() => this.startProcedural(theme));
      });
      a.addEventListener('error', () => {
        if (done) return;
        done = true;
        tryFile(exts.slice(1));
      });
      a.load();
    };
    tryFile(['mp3', 'ogg']);
  }

  private startProcedural(theme: Theme) {
    if (this.theme !== theme) return;
    this.def = THEMES[theme];
    this.seed = Math.floor(Math.random() * 100000) + 1;
    const pool = this.def.melody === 'march' ? MARCH_MOTIFS : this.def.melody === 'lyric' ? LYRIC_MOTIFS : FANFARE_MOTIFS;
    this.motifs = [pool[Math.floor(this.rnd() * pool.length)], pool[Math.floor(this.rnd() * pool.length)]];
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.out.gain.exponentialRampToValueAtTime(0.8, this.ctx.currentTime + 2);
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = 0;
    if (this.file) {
      this.file.pause();
      this.file = null;
    }
    this.theme = null;
    this.def = null;
  }

  pause() {
    this.paused = true;
    this.file?.pause();
    this.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
  }

  resume() {
    this.paused = false;
    this.file?.play().catch(() => {});
    this.out.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.3);
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
  }

  setIntensity(v: number) {
    this.intensity += (v - this.intensity) * 0.05;
  }

  private schedule() {
    const def = this.def;
    if (!def || this.paused) return;
    const sd = 60 / def.tempo / 4;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      this.playStep(def, this.step, this.bar, this.nextTime, sd);
      this.nextTime += sd;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
        if (!def.loop && this.bar >= def.chords.length) {
          clearInterval(this.timer);
          return;
        }
        if (this.bar % 16 === 0) {
          // nuevos motivos para variar
          const pool = def.melody === 'march' ? MARCH_MOTIFS : def.melody === 'lyric' ? LYRIC_MOTIFS : FANFARE_MOTIFS;
          this.motifs = [pool[Math.floor(this.rnd() * pool.length)], pool[Math.floor(this.rnd() * pool.length)]];
        }
      }
    }
  }

  private playStep(def: ThemeDef, step: number, bar: number, t: number, sd: number) {
    const ci = bar % def.chords.length;
    const [deg, q] = def.chords[ci];
    const chord = chordNotes(def.root, deg, q);
    const section = Math.floor(bar / 8) % 4; // 0: A, 1: A', 2: B (sin melodía), 3: A''
    const inten = this.intensity;
    // ── pad ──
    if (step === 0) {
      const dur = sd * 16 + 0.05;
      if (def.pad !== 'choir') for (const n of chord) this.strings(n, t, dur, 0.045);
      if (def.pad !== 'strings' || section === 2) this.choir(chord[0] + 12, t, dur, 0.035);
      this.bassNote(chord[0] - 12, t, sd * 8, 0.16);
    }
    if (step === 8) this.bassNote(chord[0] - 12 + (def.melody === 'march' ? 0 : 7), t, sd * 8, 0.12);
    // ── arpa ──
    if (def.harp && step % 2 === 0) {
      const n = chord[(step / 2) % chord.length] + 12 + (step >= 8 ? 12 : 0);
      this.harp(n, t, 0.06);
    }
    // ── ostinato de cuerdas (war o intensidad) ──
    if ((def.melody === 'ostinato' || inten > 0.35) && step % 2 === 0) {
      const seq = [0, 0, 1, 0, 2, 0, 1, 2];
      const n = chord[seq[(step / 2) % 8] % chord.length] + (def.melody === 'ostinato' ? 0 : 12);
      this.stacc(n, t, sd * 1.5, 0.05 + inten * 0.04);
    }
    // ── melodía ──
    if (def.melody !== 'none' && def.melody !== 'ostinato' && section !== 2) {
      const motif = this.motifs[(bar >> 1) % 2] ?? this.motifs[0];
      const bInPhrase = bar % 2;
      if (bInPhrase === 0 || section === 3) {
        for (const [st, len, rel] of motif) {
          if (st !== step) continue;
          const n = this.scaleNote(def, chord[0], rel) + 12;
          if (def.melody === 'lyric') this.horn(n, t, sd * len, 0.08);
          else this.brass(n, t, sd * len, 0.075);
        }
      } else if (step === 0 && def.melody === 'fanfare') {
        // respuesta: nota larga del acorde
        this.horn(chord[1] + 12, t, sd * 12, 0.05);
      }
    } else if (def.melody === 'ostinato' && section !== 2 && step % 4 === 0 && bar % 2 === 1) {
      this.brass(chord[0] + 12 + (step === 8 ? 7 : 0), t, sd * 3, 0.06);
    }
    // ── percusión ──
    switch (def.perc) {
      case 'march':
        if (step === 0 || step === 8) this.timp(chord[0] - 24, t, 0.22);
        if (step === 4 || step === 12) this.snare(t, 0.06 + inten * 0.08);
        if (step === 14 || step === 15) this.snare(t, 0.04 + inten * 0.05);
        break;
      case 'drive':
        if (step % 4 === 0) this.timp(chord[0] - 24, t, 0.18 + (step === 0 ? 0.06 : 0));
        if (step % 2 === 1) this.snare(t, 0.035 + inten * 0.05);
        if (step === 0 && bar % 4 === 0) this.cymbal(t, 0.06);
        break;
      case 'timp':
        if (step === 0) this.timp(chord[0] - 24, t, 0.18);
        if (bar % 4 === 3 && step >= 12) this.timp(chord[0] - 24, t, 0.06 + (step - 12) * 0.03);
        break;
      case 'soft':
        if (step === 0 && bar % 2 === 0) this.timp(chord[0] - 24, t, 0.1);
        break;
    }
    // capa extra de combate
    if (inten > 0.5 && def.perc !== 'drive') {
      if (step % 4 === 2) this.snare(t, (inten - 0.5) * 0.12);
      if (step === 0) this.timp(chord[0] - 24, t, (inten - 0.5) * 0.3);
    }
  }

  private scaleNote(def: ThemeDef, base: number, rel: number): number {
    // rel en semitonos aproximados -> ajustar a la escala
    const r = ((rel % 12) + 12) % 12;
    let best = def.scale[0], bd = 99;
    for (const s of def.scale) if (Math.abs(s - r) < bd) {
      bd = Math.abs(s - r);
      best = s;
    }
    return base + best + Math.floor(rel / 12) * 12;
  }

  // ─────────────── instrumentos ───────────────
  private env(g: GainNode, t: number, a: number, peak: number, dur: number, rel: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  }

  private strings(n: number, t: number, dur: number, vol: number) {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    f.Q.value = 0.5;
    const g = c.createGain();
    this.env(g, t, 0.45, vol, dur, 0.6);
    for (const det of [-7, 0, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.8);
    }
    f.connect(g);
    g.connect(this.out);
  }

  private choir(n: number, t: number, dur: number, vol: number) {
    const c = this.ctx;
    const g = c.createGain();
    this.env(g, t, 0.7, vol, dur, 0.8);
    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 760;
    f1.Q.value = 5;
    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1180;
    f2.Q.value = 6;
    for (const det of [-10, 8]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(n);
      o.detune.value = det;
      const vib = c.createOscillator();
      vib.frequency.value = 5;
      const vg = c.createGain();
      vg.gain.value = 4;
      vib.connect(vg);
      vg.connect(o.detune);
      o.connect(f1);
      o.connect(f2);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 1);
      vib.stop(t + dur + 1);
    }
    f1.connect(g);
    f2.connect(g);
    g.connect(this.out);
  }

  private brass(n: number, t: number, dur: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(n);
    const o2 = c.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = mtof(n);
    o2.detune.value = 8;
    const vib = c.createOscillator();
    vib.frequency.value = 5.5;
    const vg = c.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(6, t + 0.3);
    vib.connect(vg);
    vg.connect(o.detune);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.06);
    f.frequency.exponentialRampToValueAtTime(1300, t + Math.max(0.1, dur));
    const g = c.createGain();
    this.env(g, t, 0.04, vol, dur, 0.15);
    o.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(this.out);
    o.start(t);
    o2.start(t);
    vib.start(t);
    o.stop(t + dur + 0.3);
    o2.stop(t + dur + 0.3);
    vib.stop(t + dur + 0.3);
  }

  private horn(n: number, t: number, dur: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(n);
    const o2 = c.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = mtof(n);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = c.createGain();
    this.env(g, t, 0.12, vol, dur, 0.3);
    const g2 = c.createGain();
    g2.gain.value = 0.35;
    o.connect(f);
    o2.connect(g2);
    g2.connect(f);
    f.connect(g);
    g.connect(this.out);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.5);
    o2.stop(t + dur + 0.5);
  }

  private stacc(n: number, t: number, dur: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(n);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    const g = c.createGain();
    this.env(g, t, 0.01, vol, dur * 0.6, 0.08);
    o.connect(f);
    f.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.2);
  }

  private bassNote(n: number, t: number, dur: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(n);
    const o2 = c.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = mtof(n);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const g = c.createGain();
    this.env(g, t, 0.05, vol, dur, 0.2);
    o.connect(g);
    o2.connect(f);
    f.connect(g);
    g.connect(this.out);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.3);
    o2.stop(t + dur + 0.3);
  }

  private harp(n: number, t: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(n);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + 1.5);
  }

  private timp(n: number, t: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(mtof(n) * 1.06, t);
    o.frequency.exponentialRampToValueAtTime(mtof(n), t + 0.1);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g);
    g.connect(this.out);
    o.start(t);
    o.stop(t + 1.3);
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const ng = c.createGain();
    ng.gain.setValueAtTime(vol * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    s.connect(f);
    f.connect(ng);
    ng.connect(this.out);
    s.start(t);
    s.stop(t + 0.2);
  }

  private snare(t: number, vol: number) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1500;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f);
    f.connect(g);
    g.connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + 0.16);
  }

  private cymbal(t: number, vol: number) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    s.connect(f);
    f.connect(g);
    g.connect(this.out);
    s.start(t);
    s.stop(t + 1.9);
  }
}
