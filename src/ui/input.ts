// Control del jugador: selección, órdenes, colocación de edificios, cámara y atajos de teclado.
import type { GameSession } from '../game';
import type { Entity, Stance } from '../sim/entity';
import { BUILDINGS } from '../data/buildings';
import type { AbilityId } from '../data/types';
import { ABILITIES } from '../data/units';
import { audio } from '../audio/audio';
import { settings } from './settings';

export type Mode = 'none' | 'attackMove' | 'patrol' | 'convert' | 'repair' | 'rally' | 'garrison' | `ability:${string}` | 'place';

export class InputController {
  s: GameSession;
  selection = new Set<number>();
  mode: Mode = 'none';
  placing: { defId: string; keep: boolean } | null = null;
  dragRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  wallPreview: { x0: number; y0: number; x1: number; y1: number; n: number; valid: boolean } | null = null;
  lastAlert: { x: number; y: number } | null = null;
  private groups: number[][] = Array.from({ length: 10 }, () => []);
  private lastGroupKey = -1;
  private lastGroupTime = 0;
  private mouseX = 0;
  private mouseY = 0;
  private downX = 0;
  private downY = 0;
  private leftDown = false;
  private midDown = false;
  private wallStart: { x: number; y: number } | null = null;
  private keys = new Set<string>();
  private lastClickTime = 0;
  private lastClickId = 0;
  private el: HTMLElement;
  private ccCycle = 0;
  private idleCycle = 0;
  private mouseInside = false;

  constructor(s: GameSession) {
    this.s = s;
    this.el = s.renderer.renderer.domElement;
    this.el.addEventListener('mousedown', this.onDown);
    window.addEventListener('mouseup', this.onUp);
    window.addEventListener('mousemove', this.onMove);
    this.el.addEventListener('wheel', this.onWheel, { passive: false });
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.el.addEventListener('dblclick', this.onDbl);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mouseout', this.onOut);
    window.addEventListener('blur', this.onBlur);
  }

  /** Dirección de desplazamiento cuando el ratón sale de la ventana por un borde (navegador en ventana). */
  private edgeHoldX = 0;
  private edgeHoldY = 0;

  private onOut = (e: MouseEvent) => {
    if (e.relatedTarget) return; // sigue dentro del documento
    this.mouseInside = false;
    const W = innerWidth, H = innerHeight;
    const dl = e.clientX, dr = W - e.clientX, dt = e.clientY, db = H - e.clientY;
    const near = Math.min(dl, dr, dt, db);
    // el borde por el que salió (el más cercano) y, en una esquina, también el contiguo
    const lim = Math.max(near, 0) + 48;
    this.edgeHoldX = dl <= lim && dl <= dr ? -1 : dr <= lim ? 1 : 0;
    this.edgeHoldY = dt <= lim && dt <= db ? -1 : db <= lim ? 1 : 0;
  };

  private onBlur = () => {
    this.mouseInside = false;
    this.edgeHoldX = this.edgeHoldY = 0;
    this.keys.clear();
  };

  get w() {
    return this.s.world;
  }
  get viewer() {
    return this.s.viewer;
  }

  selectedEntities(): Entity[] {
    const out: Entity[] = [];
    for (const id of this.selection) {
      const e = this.w.entities.get(id);
      if (e && (e.alive || (e.kind === 'holocron' && !e.templeId && !e.carrierId))) out.push(e);
      else this.selection.delete(id);
    }
    // ordenar: unidades del jugador primero, por tipo
    out.sort((a, b) => (a.owner === this.viewer ? 0 : 1) - (b.owner === this.viewer ? 0 : 1) || a.defId.localeCompare(b.defId));
    return out;
  }

  private ownUnits(): Entity[] {
    return this.selectedEntities().filter((e) => e.kind === 'unit' && e.owner === this.viewer);
  }

  select(ids: number[], add = false) {
    if (!add) this.selection.clear();
    for (const id of ids) this.selection.add(id);
    this.s.renderer.selected = this.selection;
    this.s.hud.page = 'main';
    const e = this.selectedEntities()[0];
    if (e && e.owner === this.viewer && e.kind === 'unit') audio.voice(this.w.players[this.viewer].civ.voice, 'select', e.ud!);
    else if (e && e.kind === 'building' && e.owner === this.viewer) audio.buildingSelect(e.defId);
  }

  deselect(id: number) {
    this.selection.delete(id);
  }

  selectType(defId: string) {
    const ids = this.selectedEntities().filter((e) => e.defId === defId).map((e) => e.id);
    this.select(ids);
  }

  // ─────────────────────────── Ratón ───────────────────────────
  private onDown = (e: MouseEvent) => {
    if (this.s.hud.isModalOpen()) return;
    this.mouseX = e.offsetX;
    this.mouseY = e.offsetY;
    if (e.button === 1) {
      e.preventDefault();
      this.midDown = true;
      return;
    }
    if (e.button === 2) {
      this.rightClick(e.shiftKey);
      return;
    }
    if (e.button !== 0) return;
    // colocación de edificios
    if (this.placing) {
      const def = BUILDINGS[this.placing.defId];
      if (def.wall) {
        const g = this.s.renderer.screenToGround(e.offsetX, e.offsetY);
        if (g) this.wallStart = { x: Math.floor(g.x), y: Math.floor(g.y) };
        return;
      }
      this.placeAt(e.offsetX, e.offsetY, e.shiftKey);
      return;
    }
    if (this.mode !== 'none') {
      this.modeClick(e.offsetX, e.offsetY, e.shiftKey);
      return;
    }
    this.leftDown = true;
    this.downX = e.offsetX;
    this.downY = e.offsetY;
  };

  private onMove = (e: MouseEvent) => {
    this.mouseInside = true;
    this.edgeHoldX = this.edgeHoldY = 0;
    const r = this.el.getBoundingClientRect();
    this.mouseX = e.clientX - r.left;
    this.mouseY = e.clientY - r.top;
    if (this.midDown) {
      this.s.renderer.pan(-e.movementX * 0.06, -e.movementY * 0.06);
      return;
    }
    if (this.leftDown) {
      const dx = this.mouseX - this.downX, dy = this.mouseY - this.downY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this.dragRect = { x0: Math.min(this.downX, this.mouseX), y0: Math.min(this.downY, this.mouseY), x1: Math.max(this.downX, this.mouseX), y1: Math.max(this.downY, this.mouseY) };
    }
  };

  private onUp = (e: MouseEvent) => {
    if (e.button === 1) {
      this.midDown = false;
      return;
    }
    if (e.button !== 0) return;
    if (this.wallStart && this.placing) {
      const g = this.s.renderer.screenToGround(this.mouseX, this.mouseY);
      if (g) {
        const ws = this.workerIds();
        const placed = this.w.commandWall(this.viewer, ws, this.wallStart.x, this.wallStart.y, Math.floor(g.x), Math.floor(g.y), e.shiftKey);
        if (placed.length) audio.ui('place');
        else audio.ui('error');
      }
      this.wallStart = null;
      this.wallPreview = null;
      if (!e.shiftKey) this.cancelPlacement();
      return;
    }
    if (!this.leftDown) return;
    this.leftDown = false;
    if (this.dragRect) {
      const ids = this.s.renderer.entitiesInRect(this.dragRect.x0, this.dragRect.y0, this.dragRect.x1, this.dragRect.y1);
      const own = ids.filter((id) => this.w.entities.get(id)?.owner === this.viewer);
      const pick = own.length ? own : ids.slice(0, 1);
      // si hay militares, no seleccionar trabajadores mezclados (opcional AoE: todos)
      this.select(pick, e.shiftKey);
      this.dragRect = null;
      return;
    }
    const id = this.s.renderer.pick(this.mouseX, this.mouseY);
    const now = performance.now();
    if (id && (e.ctrlKey || (now - this.lastClickTime < 350 && this.lastClickId === id))) {
      this.selectSameOnScreen(id, e.shiftKey);
    } else if (id) {
      if (e.shiftKey && this.selection.has(id)) this.selection.delete(id);
      else {
        const ent = this.w.entities.get(id);
        const addable = e.shiftKey && ent?.owner === this.viewer && ent.kind === 'unit';
        this.select([id], addable);
      }
    } else if (!e.shiftKey) this.select([]);
    this.lastClickTime = now;
    this.lastClickId = id;
  };

  private onDbl = (e: MouseEvent) => {
    const id = this.s.renderer.pick(e.offsetX, e.offsetY);
    if (id) this.selectSameOnScreen(id, e.shiftKey);
  };

  private selectSameOnScreen(id: number, add: boolean) {
    const ent = this.w.entities.get(id);
    if (!ent) return;
    const ids: number[] = [];
    for (const [oid, sp] of this.s.renderer.screenPos) {
      if (!sp.visible) continue;
      const o = this.w.entities.get(oid);
      if (o && o.alive && o.defId === ent.defId && o.owner === ent.owner && o.kind === ent.kind) ids.push(oid);
    }
    this.select(ids, add);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) {
      this.s.renderer.rotate(e.deltaY * 0.002);
      return;
    }
    this.s.renderer.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  };

  // ─────────────────────────── Órdenes ───────────────────────────
  private rightClick(shift: boolean) {
    if (this.placing) {
      this.cancelPlacement();
      return;
    }
    if (this.mode !== 'none') {
      this.setMode('none');
      return;
    }
    const g = this.s.renderer.screenToGround(this.mouseX, this.mouseY);
    if (!g) return;
    const target = this.s.renderer.pick(this.mouseX, this.mouseY);
    this.commandAt(g.x, g.y, target, shift);
  }

  commandAt(x: number, y: number, targetId: number, shift: boolean) {
    const sel = this.selectedEntities().filter((e) => e.owner === this.viewer);
    if (!sel.length) return;
    const ids = sel.map((e) => e.id);
    const tgt = targetId ? this.w.entities.get(targetId) : undefined;
    const attack = !!tgt && tgt.kind !== 'resource' && tgt.kind !== 'holocron' && (this.w.isEnemy(this.viewer, tgt.owner) || (tgt.owner === 0 && tgt.kind === 'unit'));
    this.w.commandSmart(this.viewer, ids, x, y, targetId, shift);
    this.s.renderer.orderMarker(tgt ? tgt.x : x, tgt ? tgt.y : y, attack);
    const u = sel.find((e) => e.kind === 'unit');
    if (u) audio.voice(this.w.players[this.viewer].civ.voice, attack ? 'attack' : 'move', u.ud!);
    else audio.ui('click');
  }

  private modeClick(mx: number, my: number, shift: boolean) {
    const g = this.s.renderer.screenToGround(mx, my);
    if (!g) return;
    const target = this.s.renderer.pick(mx, my);
    const units = this.ownUnits();
    const ids = units.map((u) => u.id);
    const m = this.mode;
    if (m === 'attackMove') {
      if (target && this.w.isEnemy(this.viewer, this.w.entities.get(target)?.owner ?? 0)) this.w.commandAttack(ids, target, shift);
      else this.w.commandMove(ids, g.x, g.y, true, shift);
      this.s.renderer.orderMarker(g.x, g.y, true);
      if (units[0]) audio.voice(this.w.players[this.viewer].civ.voice, 'attack', units[0].ud!);
    } else if (m === 'patrol') {
      this.w.commandPatrol(ids, g.x, g.y, shift);
      this.s.renderer.orderMarker(g.x, g.y, true);
      if (units[0]) audio.voice(this.w.players[this.viewer].civ.voice, 'move', units[0].ud!);
    } else if (m === 'convert') {
      const t = target ? this.w.get(target) : undefined;
      if (t && t.kind === 'unit' && this.w.isEnemy(this.viewer, t.owner)) {
        for (const u of units) if (u.ud!.convert) this.w.issue(u, { type: 'convert', targetId: t.id }, shift);
        audio.ui('convert');
      } else audio.ui('error');
    } else if (m === 'repair') {
      const t = target ? this.w.get(target) : undefined;
      if (t && t.kind === 'building' && t.owner === this.viewer) {
        for (const u of units) if (u.ud!.canBuild) this.w.issue(u, { type: t.built ? 'repair' : 'build', targetId: t.id }, shift);
      } else audio.ui('error');
    } else if (m === 'garrison') {
      const t = target ? this.w.get(target) : undefined;
      if (t && t.kind === 'building' && t.owner === this.viewer && t.bd!.garrison) this.w.commandGarrison(ids, t.id);
      else audio.ui('error');
    } else if (m === 'rally') {
      for (const b of this.selectedEntities()) {
        if (b.kind === 'building' && b.owner === this.viewer) {
          b.rallyX = g.x;
          b.rallyY = g.y;
          b.rallyTargetId = target;
        }
      }
      this.s.renderer.orderMarker(g.x, g.y, false);
    } else if (m.startsWith('ability:')) {
      const ab = m.slice(8) as AbilityId;
      const def = ABILITIES[ab];
      const t = target ? this.w.get(target) : undefined;
      for (const u of units) {
        if (!u.ud!.abilities?.includes(ab)) continue;
        if (def.target === 'unit') {
          if (t && t.kind === 'unit' && this.w.isEnemy(this.viewer, t.owner)) this.w.issue(u, { type: 'ability', ability: ab, targetId: t.id, x: t.x, y: t.y }, shift);
          else audio.ui('error');
        } else this.w.issue(u, { type: 'ability', ability: ab, x: g.x, y: g.y }, shift);
        break;
      }
    }
    if (!shift) this.setMode('none');
  }

  setMode(m: Mode) {
    this.mode = this.mode === m ? 'none' : m;
    this.el.style.cursor = this.mode === 'none' ? 'default' : 'crosshair';
  }

  setStance(st: Stance) {
    for (const u of this.ownUnits()) {
      u.stance = st;
      u.homeX = u.x;
      u.homeY = u.y;
    }
  }

  stop() {
    this.w.commandStop(this.ownUnits().map((u) => u.id));
  }

  deleteSelected() {
    for (const e of this.selectedEntities()) if (e.owner === this.viewer) this.w.deleteEntity(this.viewer, e.id);
    this.select([]);
  }

  useAbility(ab: AbilityId) {
    const def = ABILITIES[ab];
    const units = this.ownUnits().filter((u) => u.ud!.abilities?.includes(ab));
    if (!units.length) return;
    if (def.target === 'self') {
      for (const u of units) {
        if ((u.abilityCd[ab] ?? 0) <= this.w.time) {
          this.w.issue(u, { type: 'ability', ability: ab, x: u.x, y: u.y }, false);
          break;
        }
      }
    } else this.setMode(`ability:${ab}`);
  }

  // ─────────────────────────── Construcción ───────────────────────────
  private workerIds(): number[] {
    return this.ownUnits().filter((u) => u.ud!.canBuild).map((u) => u.id);
  }

  startPlacement(defId: string, keep: boolean) {
    this.placing = { defId, keep };
    this.mode = 'place';
    this.el.style.cursor = 'crosshair';
  }

  cancelPlacement() {
    this.placing = null;
    this.mode = 'none';
    this.wallStart = null;
    this.wallPreview = null;
    this.s.renderer.setGhost(null, '', 0, 0, 0, false);
    this.el.style.cursor = 'default';
  }

  private placementTile(mx: number, my: number): { tx: number; ty: number } | null {
    if (!this.placing) return null;
    const g = this.s.renderer.screenToGround(mx, my);
    if (!g) return null;
    const sz = BUILDINGS[this.placing.defId].size;
    return { tx: Math.round(g.x - sz / 2), ty: Math.round(g.y - sz / 2) };
  }

  private placeAt(mx: number, my: number, shift: boolean) {
    const t = this.placementTile(mx, my);
    if (!t || !this.placing) return;
    const ws = this.workerIds();
    const b = this.w.commandBuild(this.viewer, ws, this.placing.defId, t.tx, t.ty, shift);
    if (b) {
      audio.ui('place');
      const u = this.ownUnits()[0];
      if (u) audio.voice(this.w.players[this.viewer].civ.voice, 'build', u.ud!);
      if (!shift && !this.placing.keep) this.cancelPlacement();
    } else {
      audio.ui('error');
      const p = this.w.players[this.viewer];
      if (!p.canAfford(p.stats_of(this.placing.defId).cost)) this.s.hud.message('Recursos insuficientes.', '#ffb04a');
      else this.s.hud.message('No se puede construir ahí.', '#ffb04a');
    }
  }

  // ─────────────────────────── Teclado ───────────────────────────
  private onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
    const k = e.key;
    this.keys.add(k);
    if (k === 'Escape' || k === 'F10') {
      e.preventDefault();
      if (this.s.hud.isModalOpen()) {
        this.s.hud.closeModal();
        if (this.s.paused) this.s.togglePause();
      } else if (this.placing) this.cancelPlacement();
      else if (this.mode !== 'none') this.setMode('none');
      else if (this.s.hud.page !== 'main') this.s.hud.setPage('main');
      else this.s.hud.openMenu();
      return;
    }
    if (this.s.hud.isModalOpen()) return;
    if (k === 'F4') {
      e.preventDefault();
      this.s.hud.toggleScores();
      return;
    }
    if (k === 'F3' || k === 'Pause' || k === 'p' || k === 'P') {
      e.preventDefault();
      this.s.togglePause();
      return;
    }
    if (/^[0-9]$/.test(k)) {
      const n = Number(k);
      if (e.ctrlKey) {
        e.preventDefault();
        this.groups[n] = [...this.selection];
        this.s.hud.message(`Grupo ${n} asignado (${this.groups[n].length}).`, '#9fd8ff');
      } else {
        const ids = this.groups[n].filter((id) => this.w.get(id));
        if (ids.length) {
          const now = performance.now();
          if (this.lastGroupKey === n && now - this.lastGroupTime < 400) {
            const e0 = this.w.get(ids[0])!;
            this.s.renderer.centerOn(e0.x, e0.y);
          }
          this.select(ids, e.shiftKey);
          this.lastGroupKey = n;
          this.lastGroupTime = now;
        }
      }
      return;
    }
    if (k === 'Delete') {
      this.deleteSelected();
      return;
    }
    if (k === '.' ) {
      this.selectIdleWorker();
      return;
    }
    if (k === ',') {
      this.selectIdleMilitary();
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      if (this.lastAlert) this.s.renderer.centerOn(this.lastAlert.x, this.lastAlert.y);
      return;
    }
    if (k === '+' || k === '=') {
      this.s.setSpeed(this.s.speed + 0.5);
      return;
    }
    if (k === '-') {
      this.s.setSpeed(this.s.speed - 0.5);
      return;
    }
    if (k === 'h' || k === 'H') {
      const ccs = this.w.buildingsOf(this.viewer, 'command_center');
      if (ccs.length) {
        const cc = ccs[this.ccCycle++ % ccs.length];
        this.select([cc.id]);
        this.s.renderer.centerOn(cc.x, cc.y);
      }
      return;
    }
    if (k.length === 1 && /[a-zA-Z]/.test(k) && !e.ctrlKey && !e.altKey) {
      if (this.s.hud.pressGridKey(k, e.shiftKey)) e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };

  selectIdleWorker() {
    const idle = this.w.idleWorkers(this.viewer);
    if (!idle.length) return;
    const u = idle[this.idleCycle++ % idle.length];
    this.select([u.id]);
    this.s.renderer.centerOn(u.x, u.y);
  }

  selectIdleMilitary() {
    const idle = this.w.units.filter((u) => u.alive && u.owner === this.viewer && !u.order && !u.garrisonedIn && u.ud!.attack && u.ud!.cls !== 'worker' && u.ud!.cls !== 'scout');
    if (!idle.length) return;
    this.select(idle.map((u) => u.id));
    const u = idle[0];
    this.s.renderer.centerOn(u.x, u.y);
  }

  // ─────────────────────────── Por frame ───────────────────────────
  update(dt: number) {
    const r = this.s.renderer;
    // cámara por teclado y bordes
    const sp = 22 * dt * settings().scrollSpeed;
    let dx = 0, dy = 0;
    if (this.keys.has('ArrowLeft')) dx -= sp;
    if (this.keys.has('ArrowRight')) dx += sp;
    if (this.keys.has('ArrowUp')) dy -= sp;
    if (this.keys.has('ArrowDown')) dy += sp;
    if (this.keys.has('Home')) r.rotate(dt * 1.2);
    if (this.keys.has('End')) r.rotate(-dt * 1.2);
    if (settings().edgeScroll && !this.leftDown && !this.midDown && !this.s.hud.isModalOpen()) {
      if (this.mouseInside) {
        const W = this.el.clientWidth, H = this.el.clientHeight;
        const m = 12;
        if (this.mouseX <= m) dx -= sp;
        if (this.mouseX >= W - m) dx += sp;
        if (this.mouseY <= m) dy -= sp;
        if (this.mouseY >= H - m) dy += sp;
      } else if (document.hasFocus()) {
        // el ratón salió por un borde (barra de pestañas, barra de tareas...): seguir desplazando
        dx += this.edgeHoldX * sp;
        dy += this.edgeHoldY * sp;
      }
    }
    if (dx || dy) r.pan(dx, dy);
    // hover
    if (!this.leftDown && !this.midDown) r.hovered = this.s.renderer.pick(this.mouseX, this.mouseY);
    // fantasma de colocación
    if (this.placing) {
      const def = BUILDINGS[this.placing.defId];
      const t = this.placementTile(this.mouseX, this.mouseY);
      if (t) {
        const p = this.w.players[this.viewer];
        const valid = this.w.canPlace(this.viewer, this.placing.defId, t.tx, t.ty) && p.canAfford(p.stats_of(this.placing.defId).cost);
        r.setGhost(this.placing.defId, p.civ.style, t.tx, t.ty, def.size, valid);
        if (def.wall && this.wallStart) {
          const g = r.screenToGround(this.mouseX, this.mouseY);
          if (g) {
            const a = r.project(this.wallStart.x + 0.5, this.w.map.heightAt(this.wallStart.x, this.wallStart.y), this.wallStart.y + 0.5);
            const n = Math.max(Math.abs(Math.floor(g.x) - this.wallStart.x), Math.abs(Math.floor(g.y) - this.wallStart.y)) + 1;
            this.wallPreview = { x0: a.x, y0: a.y, x1: this.mouseX, y1: this.mouseY, n, valid: p.res.ore >= n * 5 };
          }
        }
      }
    }
    // cursor contextual
    if (this.mode === 'none' && !this.placing) {
      const hov = r.hovered ? this.w.entities.get(r.hovered) : undefined;
      const sel = this.selectedEntities();
      const hasOwn = sel.some((e) => e.owner === this.viewer && e.kind === 'unit');
      let cur = 'default';
      if (hov && hasOwn) {
        if (hov.kind === 'resource' || (hov.kind === 'unit' && hov.owner === 0)) cur = 'cell';
        else if (this.w.isEnemy(this.viewer, hov.owner)) cur = 'crosshair';
        else if (hov.kind === 'building' && hov.owner === this.viewer && !hov.built) cur = 'cell';
        else cur = 'pointer';
      }
      if (this.el.style.cursor !== cur) this.el.style.cursor = cur;
    }
  }

  dispose() {
    window.removeEventListener('mouseup', this.onUp);
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mouseout', this.onOut);
    window.removeEventListener('blur', this.onBlur);
  }
}
