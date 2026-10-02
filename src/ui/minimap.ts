// Minimapa rotado según la cámara, con niebla, unidades, recursos y alertas.
import type { GameSession } from '../game';
import { PLAYER_COLORS } from '../data/civs';
import { T_CLIFF, T_DEEP, T_SHALLOW, T_HIGH, T_LOW, T_ALT, T_PATH } from '../sim/map';

export class Minimap {
  s: GameSession;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private fog: HTMLCanvasElement;
  private fogCtx: CanvasRenderingContext2D;
  private fogImg: ImageData;
  private frameCanvas: HTMLCanvasElement;
  private fctx: CanvasRenderingContext2D;
  private lastYaw = NaN;
  private timer = 0;
  private pings: { x: number; y: number; t: number }[] = [];
  private dragging = false;
  private W = 220;
  private H = 180;

  constructor(s: GameSession, wrap: HTMLElement) {
    this.s = s;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W * 2;
    this.canvas.height = this.H * 2;
    wrap.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.frameCanvas = document.createElement('canvas');
    this.frameCanvas.width = this.W * 2;
    this.frameCanvas.height = this.H * 2;
    this.fctx = this.frameCanvas.getContext('2d')!;
    const w = s.world;
    const N = w.N;
    // capa base del terreno
    this.base = document.createElement('canvas');
    this.base.width = this.base.height = N;
    const bctx = this.base.getContext('2d')!;
    const img = bctx.createImageData(N, N);
    const tc = w.planet.terrain;
    const liquid = w.planet.water?.color ?? 0x3a6a9a;
    const col = (t: number) => {
      switch (t) {
        case T_CLIFF: return tc.cliff;
        case T_DEEP: return liquid;
        case T_SHALLOW: return mix(liquid, tc.low, 0.4);
        case T_HIGH: return tc.high;
        case T_LOW: return tc.low;
        case T_ALT: return tc.alt;
        case T_PATH: return tc.path ?? tc.alt;
        default: return tc.base;
      }
    };
    for (let i = 0; i < N * N; i++) {
      const c = col(w.map.terrain[i]);
      img.data[i * 4] = (c >> 16) & 255;
      img.data[i * 4 + 1] = (c >> 8) & 255;
      img.data[i * 4 + 2] = c & 255;
      img.data[i * 4 + 3] = 255;
    }
    bctx.putImageData(img, 0, 0);
    this.fog = document.createElement('canvas');
    this.fog.width = this.fog.height = N;
    this.fogCtx = this.fog.getContext('2d')!;
    this.fogImg = this.fogCtx.createImageData(N, N);

    this.canvas.addEventListener('mousedown', this.onDown);
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** mapa -> minimapa (px de canvas) */
  private toMini(x: number, y: number): [number, number] {
    const N = this.s.world.N;
    const yaw = this.s.renderer.camYaw;
    const dx = x - N / 2, dy = y - N / 2;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const rx = dx * c - dy * s, ry = dx * s + dy * c;
    const scale = (Math.min(this.W, this.H) * 2) / (N * 1.42);
    return [this.W + rx * scale, this.H + ry * scale];
  }
  private fromMini(px: number, py: number): [number, number] {
    const N = this.s.world.N;
    const yaw = this.s.renderer.camYaw;
    const scale = (Math.min(this.W, this.H) * 2) / (N * 1.42);
    const rx = (px - this.W) / scale, ry = (py - this.H) / scale;
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    return [rx * c - ry * s + N / 2, rx * s + ry * c + N / 2];
  }

  private eventPos(e: MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return this.fromMini(((e.clientX - r.left) / r.width) * this.W * 2, ((e.clientY - r.top) / r.height) * this.H * 2);
  }

  private onDown = (e: MouseEvent) => {
    e.preventDefault();
    const [x, y] = this.eventPos(e);
    if (e.button === 0) {
      this.dragging = true;
      this.s.renderer.centerOn(x, y);
    } else if (e.button === 2) {
      this.s.input.commandAt(x, y, 0, e.shiftKey);
    }
  };
  private onMove = (e: MouseEvent) => {
    if (!this.dragging) return;
    const [x, y] = this.eventPos(e);
    const N = this.s.world.N;
    this.s.renderer.centerOn(Math.max(0, Math.min(N, x)), Math.max(0, Math.min(N, y)));
  };
  private onUp = () => {
    this.dragging = false;
  };

  ping(x: number, y: number) {
    this.pings.push({ x, y, t: performance.now() });
  }

  update(dt: number) {
    this.timer -= dt;
    const yaw = this.s.renderer.camYaw;
    if (this.timer <= 0 || Math.abs(yaw - this.lastYaw) > 0.01 || Number.isNaN(this.lastYaw)) {
      this.timer = 0.25;
      this.lastYaw = yaw;
      this.updateFog();
      this.drawFrame();
    }
    // cada fotograma: componer el último fotograma + alertas + cámara (sin lecturas de píxeles)
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.frameCanvas, 0, 0);
    this.drawPings();
    this.drawCameraOnly();
  }

  private updateFog() {
    const w = this.s.world;
    const p = w.players[this.s.viewer];
    const N = w.N;
    const d = this.fogImg.data;
    const reveal = this.s.renderer.revealAll;
    for (let i = 0; i < N * N; i++) {
      const vis = reveal || (p && p.visible[i]);
      const exp = reveal || (p && p.explored[i]);
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0;
      d[i * 4 + 3] = vis ? 0 : exp ? 120 : 255;
    }
    this.fogCtx.putImageData(this.fogImg, 0, 0);
  }

  private drawFrame() {
    const ctx = this.fctx;
    const w = this.s.world;
    const N = w.N;
    const v = this.s.viewer;
    const p = w.players[v];
    const reveal = this.s.renderer.revealAll;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.W * 2, this.H * 2);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, this.W * 2, this.H * 2);
    // terreno rotado
    const yaw = this.s.renderer.camYaw;
    const scale = (Math.min(this.W, this.H) * 2) / (N * 1.42);
    ctx.save();
    ctx.translate(this.W, this.H);
    ctx.rotate(yaw);
    ctx.scale(scale, scale);
    ctx.translate(-N / 2, -N / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, 0, 0);
    // recursos
    const exp = p?.explored;
    for (const r of w.resources) {
      if (!r.alive) continue;
      if (!reveal && exp && !exp[r.ty * N + r.tx]) continue;
      ctx.fillStyle = r.resKind === 'tree' ? '#1e4a1a' : r.resKind === 'nova' ? '#5ad8ff' : r.resKind === 'ore' ? '#d8b070' : '#e85a8a';
      const sz = r.resKind === 'tree' ? 1 : 1.6;
      ctx.fillRect(r.tx + 0.5 - sz / 2, r.ty + 0.5 - sz / 2, sz, sz);
    }
    // edificios
    for (const b of w.buildings) {
      if (!b.alive) continue;
      const own = b.owner === v || p?.isAlly(b.owner);
      if (!reveal && !own && (!exp || !exp[Math.floor(b.y) * N + Math.floor(b.x)])) continue;
      ctx.fillStyle = PLAYER_COLORS[w.players[b.owner].color]?.css ?? '#fff';
      ctx.fillRect(b.tx, b.ty, b.size, b.size);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 0.3;
      ctx.strokeRect(b.tx, b.ty, b.size, b.size);
    }
    // niebla
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, 0, 0);
    // unidades
    const vis = p?.visible;
    for (const u of w.units) {
      if (!u.alive || u.garrisonedIn) continue;
      const own = u.owner === v || p?.isAlly(u.owner);
      if (!reveal && !own && (!vis || !vis[Math.floor(u.y) * N + Math.floor(u.x)])) continue;
      ctx.fillStyle = u.owner === 0 ? '#e8e0c8' : PLAYER_COLORS[w.players[u.owner].color]?.css ?? '#fff';
      const sz = u.isAir ? 1.8 : 1.4;
      ctx.fillRect(u.x - sz / 2, u.y - sz / 2, sz, sz);
    }
    for (const h of w.holocrons) {
      if (h.templeId || h.carrierId) continue;
      if (!reveal && exp && !exp[Math.floor(h.y) * N + Math.floor(h.x)]) continue;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPings() {
    const ctx = this.ctx;
    const now = performance.now();
    if (!this.pings.length) return;
    this.pings = this.pings.filter((pg) => now - pg.t < 3000);
    for (const pg of this.pings) {
      const [mx, my] = this.toMini(pg.x, pg.y);
      const k = ((now - pg.t) % 1000) / 1000;
      ctx.strokeStyle = `rgba(255, 70, 50, ${1 - k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, my, 6 + k * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawCameraOnly() {
    const r = this.s.renderer;
    const el = r.renderer.domElement;
    const W = el.clientWidth, H = el.clientHeight;
    const corners = [[0, 0], [W, 0], [W, H - 190], [0, H - 190]];
    const pts: [number, number][] = [];
    for (const [sx, sy] of corners) {
      const g = r.screenToGround(sx, sy);
      if (g) pts.push(this.toMini(g.x, g.y));
    }
    if (pts.length < 3) return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }

  dispose() {
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mouseup', this.onUp);
  }
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
