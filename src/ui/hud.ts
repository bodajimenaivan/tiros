// HUD de partida al estilo Age of Empires: barra de recursos, panel de órdenes, selección, minimapa.
import type { GameSession } from '../game';
import { h, clear, fmtTime } from './dom';
import { portrait, svgIcon, resIcon } from './icons';
import { Minimap } from './minimap';
import { UNITS, ABILITIES } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { TECHS, ERA_NAMES, ERA_ROMAN } from '../data/techs';
import { PLAYER_COLORS } from '../data/civs';
import type { Cost, ResourceType, AbilityId } from '../data/types';
import { RESOURCE_TYPES } from '../data/types';
import type { Entity } from '../sim/entity';
import type { Player } from '../sim/player';
import { buildBuildingModel } from '../render/models/buildingModels';
import { buildResource, buildTree } from '../render/models/natureModels';
import { costText } from '../sim/world';
import { settings, saveSettings } from './settings';
import { audio } from '../audio/audio';
import { techAvailable } from '../sim/player';

interface CmdButton {
  icon: string;
  title: string;
  desc?: string;
  cost?: Cost;
  hotkey?: string;
  disabled?: boolean;
  reason?: string;
  count?: number;
  cooldown?: number;
  active?: boolean;
  action: (shift: boolean) => void;
  rightAction?: () => void;
}

const GRID_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];
const ECO_BUILD = ['shelter', 'farm', 'food_center', 'carbon_center', 'mining_center', 'power_core', 'command_center', 'research_center', 'spaceport', 'monument'];
const MIL_BUILD = ['troop_center', 'mech_factory', 'heavy_weapons', 'airbase', 'temple', 'fortress', 'turret', 'aa_turret', 'shield_gen', 'wall', 'gate'];

export class Hud {
  s: GameSession;
  root: HTMLElement;
  overlay: HTMLCanvasElement;
  octx: CanvasRenderingContext2D;
  minimap: Minimap;
  private resEls: Record<string, HTMLElement> = {};
  private popEl!: HTMLElement;
  private eraEl!: HTMLElement;
  private clockEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private cmdPanel!: HTMLElement;
  private selPanel!: HTMLElement;
  private msgBox!: HTMLElement;
  private tooltip!: HTMLElement;
  private idleBtn!: HTMLElement;
  private idleMilBtn!: HTMLElement;
  private objBox!: HTMLElement;
  private pausedEl: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  page: 'main' | 'eco' | 'mil' = 'main';
  private cmdKey = '';
  private selKey = '-';
  private refreshT = 0;
  buttons: (CmdButton | null)[] = [];
  private alerts: { x: number; y: number; t: number }[] = [];
  private workersByRes: Record<string, number> = {};

  constructor(s: GameSession) {
    this.s = s;
    this.root = h('div', { class: 'hud' });
    s.root.appendChild(this.root);
    this.overlay = h('canvas', { class: 'overlay-canvas' });
    s.root.insertBefore(this.overlay, this.root);
    this.octx = this.overlay.getContext('2d')!;
    this.buildTop();
    this.buildBottom();
    this.msgBox = h('div', { class: 'messages' });
    this.root.appendChild(this.msgBox);
    this.tooltip = h('div', { class: 'tooltip hidden' });
    this.root.appendChild(this.tooltip);
    this.objBox = h('div', { class: 'objective-box hidden' });
    this.root.appendChild(this.objBox);
    this.minimap = new Minimap(s, this.root.querySelector('.minimap-wrap') as HTMLElement);
    this.resize();
  }

  get w() {
    return this.s.world;
  }
  get me() {
    return this.s.world.players[this.s.viewer];
  }

  resize() {
    const r = this.s.root.getBoundingClientRect();
    this.overlay.width = r.width * devicePixelRatio;
    this.overlay.height = r.height * devicePixelRatio;
    this.overlay.style.width = r.width + 'px';
    this.overlay.style.height = r.height + 'px';
  }

  // ─────────────────────────── Barra superior ───────────────────────────
  private buildTop() {
    const top = h('div', { class: 'topbar' });
    for (const r of RESOURCE_TYPES) {
      const val = h('span', null, '0');
      const wk = h('span', { class: 'workers' }, '');
      const el = h('div', { class: 'res', title: resLabel(r) }, h('img', { class: 'ico', src: resIcon(r) }), val, wk);
      this.resEls[r] = val;
      this.resEls[r + '_w'] = wk;
      el.addEventListener('mouseenter', () => this.showTip(el, { icon: '', title: resLabel(r), desc: resDesc(r), action: () => {} }));
      el.addEventListener('mouseleave', () => this.hideTip());
      top.appendChild(el);
    }
    this.popEl = h('span', null, '0/0');
    const popWrap = h('div', { class: 'res pop', title: 'Población' }, h('img', { class: 'ico', src: resIcon('pop') }), this.popEl);
    top.appendChild(popWrap);
    this.eraEl = h('div', { class: 'era-label' }, '');
    top.appendChild(this.eraEl);
    top.appendChild(h('div', { class: 'spacer' }));
    this.speedEl = h('span', { class: 'speed-ind' }, '');
    top.appendChild(this.speedEl);
    this.clockEl = h('span', { class: 'clock' }, '0:00');
    top.appendChild(this.clockEl);
    top.appendChild(h('button', { class: 'btn', onclick: () => this.openObjectives() }, 'Objetivos'));
    top.appendChild(h('button', { class: 'btn', onclick: () => this.openTechTree() }, 'Tecnologías'));
    top.appendChild(h('button', { class: 'btn', onclick: () => this.openDiplomacy() }, 'Diplomacia'));
    top.appendChild(h('button', { class: 'btn', onclick: () => this.openMenu() }, 'Menú (F10)'));
    this.root.appendChild(top);
  }

  private buildBottom() {
    const bottom = h('div', { class: 'bottombar' });
    this.cmdPanel = h('div', { class: 'cmd-panel' });
    this.selPanel = h('div', { class: 'sel-panel' });
    const mm = h('div', { class: 'minimap-wrap' });
    bottom.append(this.cmdPanel, this.selPanel, mm);
    this.root.appendChild(bottom);
    this.idleBtn = h('div', { class: 'idle-btn', title: 'Trabajador ocioso (.)', onclick: () => this.s.input.selectIdleWorker() }, h('img', { src: svgIcon('repair', 'eco'), style: 'width:22px;height:22px' }), h('span', null, '0'));
    this.idleMilBtn = h('div', { class: 'idle-btn', title: 'Unidad militar ociosa (,)', onclick: () => this.s.input.selectIdleMilitary() }, h('img', { src: svgIcon('attackMove', 'mil'), style: 'width:22px;height:22px' }), h('span', null, '0'));
    const ib = h('div', { class: 'idle-btns' }, this.idleBtn, this.idleMilBtn);
    this.root.appendChild(ib);
    this.scoreBox = h('div', { class: 'score-box', title: 'Puntuaciones (F4)' });
    this.root.appendChild(this.scoreBox);
  }

  // ─────────────────────────── Marcador ───────────────────────────
  private scoreBox!: HTMLElement;
  private scoreT = 0;
  showScores = true;

  toggleScores() {
    this.showScores = !this.showScores;
    this.scoreBox.style.display = this.showScores ? '' : 'none';
  }

  private refreshScores() {
    if (!this.showScores) return;
    const w = this.w;
    const ps = w.players.filter((p) => p.id).sort((a, b) => b.score() - a.score());
    clear(this.scoreBox);
    for (const p of ps) {
      const row = h('div', { class: 'score-row' + (p.defeated ? ' out' : '') },
        h('span', { class: 'sc-name', style: `color:${PLAYER_COLORS[p.color]?.css ?? '#fff'}` }, p.name),
        h('span', { class: 'sc-val' }, p.defeated ? '—' : String(p.score())),
      );
      this.scoreBox.appendChild(row);
    }
  }

  // ─────────────────────────── Mensajes ───────────────────────────
  message(text: string, color = '#e6e8ee') {
    const m = h('div', { class: 'msg', style: `color:${color}` }, text);
    this.msgBox.appendChild(m);
    while (this.msgBox.children.length > 8) this.msgBox.firstChild!.remove();
    setTimeout(() => m.remove(), 9000);
  }

  banner(text: string) {
    const b = h('div', { class: 'center-banner' }, text);
    this.root.appendChild(b);
    setTimeout(() => b.remove(), 3600);
  }

  alertAt(x: number, y: number) {
    this.alerts.push({ x, y, t: this.s.realTime });
    this.minimap.ping(x, y);
    this.s.input.lastAlert = { x, y };
  }

  setPaused(p: boolean) {
    if (p && !this.pausedEl) {
      this.pausedEl = h('div', { class: 'paused-ind' }, 'PAUSA');
      this.root.appendChild(this.pausedEl);
    } else if (!p && this.pausedEl) {
      this.pausedEl.remove();
      this.pausedEl = null;
    }
  }

  // ─────────────────────────── Actualización ───────────────────────────
  update(dt: number) {
    const p = this.me;
    const w = this.w;
    if (p) {
      for (const r of RESOURCE_TYPES) this.resEls[r].textContent = String(Math.floor(p.res[r]));
      this.popEl.textContent = `${p.pop}/${p.popCap}`;
      this.popEl.parentElement!.classList.toggle('full', p.pop >= p.popCap);
      this.eraEl.textContent = `${ERA_NAMES[p.era]} (${ERA_ROMAN[p.era]})`;
    }
    this.clockEl.textContent = fmtTime(w.time);
    this.speedEl.textContent = this.s.speed !== 1.5 ? `x${this.s.speed.toFixed(1)}` : '';
    this.refreshT -= dt;
    if (this.refreshT <= 0) {
      this.refreshT = 0.25;
      this.refreshSlow();
    }
    this.scoreT -= dt;
    if (this.scoreT <= 0) {
      this.scoreT = 1.5;
      this.refreshScores();
    }
    this.drawOverlay();
    this.minimap.update(dt);
  }

  private refreshSlow() {
    const w = this.w;
    const v = this.s.viewer;
    // trabajadores por recurso
    const counts: Record<string, number> = { food: 0, carbon: 0, nova: 0, ore: 0 };
    let idle = 0, idleMil = 0;
    for (const u of w.units) {
      if (!u.alive || u.owner !== v || u.garrisonedIn) continue;
      const ud = u.ud!;
      if (ud.cls === 'worker') {
        if (!u.order) idle++;
        else if (u.carryType && (u.order.type === 'gather' || u.order.type === 'returnRes')) counts[u.carryType]++;
        else if (u.order.type === 'gather') {
          const t = w.entities.get(u.order.targetId!);
          const r = t?.resType ?? (t?.bd?.farm || t?.kind === 'unit' ? 'food' : null);
          if (r) counts[r]++;
        }
      } else if (!u.order && ud.cls !== 'scout' && ud.attack) idleMil++;
    }
    for (const r of RESOURCE_TYPES) this.resEls[r + '_w'].textContent = counts[r] ? String(counts[r]) : '';
    (this.idleBtn.lastChild as HTMLElement).textContent = String(idle);
    this.idleBtn.classList.toggle('has', idle > 0);
    (this.idleMilBtn.lastChild as HTMLElement).textContent = String(idleMil);
    this.workersByRes = counts;
    this.refreshCommands();
    this.refreshSelection();
    this.refreshObjectives();
  }

  // ─────────────────────────── Panel de órdenes ───────────────────────────
  private refreshCommands() {
    const sel = this.s.input.selectedEntities();
    const btns = this.computeButtons(sel);
    this.buttons = btns;
    const key = btns.map((b) => (b ? b.title + (b.disabled ? 'd' : '') + (b.count ?? '') + (b.cooldown ? Math.ceil(b.cooldown) : '') + (b.active ? 'a' : '') + (b.cost && !this.me.canAfford(b.cost) ? 'u' : '') + (b.title.length) : '_')).join('|');
    if (key === this.cmdKey) return;
    this.cmdKey = key;
    clear(this.cmdPanel);
    btns.forEach((b, i) => {
      if (!b) {
        this.cmdPanel.appendChild(h('div'));
        return;
      }
      const unaff = b.cost && !this.me.canAfford(b.cost);
      const el = h('div', { class: 'cmd-btn' + (b.disabled ? ' disabled' : '') + (unaff ? ' unaffordable' : '') + (b.active ? ' active' : '') },
        h('img', { src: b.icon }),
        h('span', { class: 'hk' }, GRID_KEYS[i]),
        b.count ? h('span', { class: 'cnt' }, String(b.count)) : null,
        b.cooldown ? h('div', { class: 'cd', style: `height:${Math.min(100, b.cooldown * 4)}%` }) : null,
      );
      el.addEventListener('click', (ev) => {
        if (b.disabled) {
          audio.ui('error');
          if (b.reason) this.message(b.reason, '#ffb04a');
          return;
        }
        audio.ui('click');
        b.action(ev.shiftKey);
      });
      el.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        b.rightAction?.();
      });
      el.addEventListener('mouseenter', () => this.showTip(el, b, GRID_KEYS[i]));
      el.addEventListener('mouseleave', () => this.hideTip());
      this.cmdPanel.appendChild(el);
    });
  }

  pressGridKey(k: string, shift: boolean): boolean {
    const i = GRID_KEYS.indexOf(k.toUpperCase());
    if (i < 0) return false;
    const b = this.buttons[i];
    if (!b) return false;
    if (b.disabled) {
      audio.ui('error');
      if (b.reason) this.message(b.reason, '#ffb04a');
      return true;
    }
    audio.ui('click');
    b.action(shift);
    return true;
  }

  private name(defId: string, owner: number): string {
    const p = this.w.players[owner];
    return p?.civ.names[defId] ?? UNITS[defId]?.name ?? BUILDINGS[defId]?.name ?? defId;
  }

  unitIcon(defId: string, owner: number): string {
    const p = this.w.players[owner];
    const def = this.s.renderer.getUnitModel(defId, owner);
    const ud = UNITS[defId];
    return portrait('u:' + p.civ.style + ':' + defId, def, PLAYER_COLORS[p.color]?.hex ?? 0xffffff, ud.saberColor ?? p.civ.saber, ud.cls !== 'animal' && !ud.air && !ud.tags.includes('mech'));
  }

  buildingIcon(defId: string, owner: number): string {
    const p = this.w.players[owner];
    return portrait('b:' + p.civ.style + ':' + defId, buildBuildingModel(defId, p.civ.style), PLAYER_COLORS[p.color]?.hex ?? 0xffffff);
  }

  private computeButtons(sel: Entity[]): (CmdButton | null)[] {
    const out: (CmdButton | null)[] = new Array(15).fill(null);
    const w = this.w;
    const v = this.s.viewer;
    const p = this.me;
    const input = this.s.input;
    if (!sel.length || !p) return out;
    const own = sel.filter((e) => e.owner === v);
    if (!own.length) return out;
    const units = own.filter((e) => e.kind === 'unit');
    const builds = own.filter((e) => e.kind === 'building');
    if (units.length) {
      const workers = units.filter((u) => u.ud!.canBuild);
      if (workers.length && this.page !== 'main') {
        const list = this.page === 'eco' ? ECO_BUILD : MIL_BUILD;
        list.forEach((bid, i) => {
          const bd = BUILDINGS[bid];
          if (p.isDisabled(bid)) return;
          const cost = p.stats_of(bid).cost;
          const eraOk = p.era >= bd.era;
          let reason = !eraOk ? `Requiere ${ERA_NAMES[bd.era]}` : '';
          if (bd.requiresBuilding && !w.buildings.some((b) => b.alive && b.built && b.owner === v && b.defId === bd.requiresBuilding)) reason = `Requiere ${BUILDINGS[bd.requiresBuilding].name}`;
          if (bd.maxCount && w.buildings.filter((b) => b.alive && b.owner === v && b.defId === bid).length >= bd.maxCount) reason = 'Límite alcanzado';
          out[i] = {
            icon: this.buildingIcon(bid, v), title: this.name(bid, v), desc: bd.desc + (bd.needsPower ? ' Necesita energía.' : ''), cost, disabled: !!reason, reason,
            action: (shift) => input.startPlacement(bid, shift),
          };
        });
        out[14] = { icon: svgIcon('back', 'cmd'), title: 'Volver', action: () => this.setPage('main') };
        return out;
      }
      if (workers.length) {
        out[0] = { icon: svgIcon('buildEco', 'eco'), title: 'Construir edificio económico', desc: 'Refugios, granjas, centros de procesamiento, núcleos de energía...', action: () => this.setPage('eco') };
        out[1] = { icon: svgIcon('buildMil', 'mil'), title: 'Construir edificio militar', desc: 'Centros de tropas, fábricas, templos, fortalezas, torretas, muros...', action: () => this.setPage('mil') };
        out[2] = { icon: svgIcon('repair', 'cmd'), title: 'Reparar', desc: 'Repara un edificio dañado (cuesta recursos).', active: input.mode === 'repair', action: () => input.setMode('repair') };
      }
      const military = units.filter((u) => u.ud!.attack && !u.ud!.canBuild);
      if (military.length || units.some((u) => !u.ud!.canBuild)) {
        out[5] = { icon: svgIcon('attackMove', 'mil'), title: 'Ataque en movimiento', desc: 'Avanza hacia un punto atacando a todo enemigo en el camino.', active: input.mode === 'attackMove', action: () => input.setMode('attackMove') };
        if (military.length) out[4] = { icon: svgIcon('patrol', 'mil'), title: 'Patrullar', desc: 'Las unidades van y vienen entre su posición y el punto elegido, atacando a los enemigos que encuentren.', active: input.mode === 'patrol', action: () => input.setMode('patrol') };
        const st = units[0].stance;
        const stances: [string, string, string][] = [['aggressive', 'Agresiva', 'Persigue y ataca a cualquier enemigo a la vista.'], ['defensive', 'Defensiva', 'Ataca enemigos cercanos y vuelve a su posición.'], ['standGround', 'Mantener posición', 'No se mueve; solo dispara a lo que esté a su alcance.'], ['passive', 'Pasiva', 'No ataca nunca.']];
        stances.forEach(([id, name, desc], i) => {
          out[10 + i] = { icon: svgIcon(id, 'cmd'), title: 'Postura: ' + name, desc, active: st === id, action: () => input.setStance(id as any) };
        });
      }
      out[6] = { icon: svgIcon('stop', 'cmd'), title: 'Detener', desc: 'Cancela todas las órdenes.', action: () => input.stop() };
      if (units.some((u) => u.ud!.tags.includes('infantry'))) out[8] = { icon: svgIcon('garrison', 'cmd'), title: 'Guarnecer', desc: 'Refugia la infantería en un Centro de Mando, Fortaleza o Torreta. Los guarnecidos disparan desde dentro y se curan.', active: input.mode === 'garrison', action: () => input.setMode('garrison') };
      // conversión
      if (units.some((u) => u.ud!.convert)) out[7] = { icon: svgIcon('convert', 'force'), title: 'Convertir', desc: 'Usa la Fuerza para poner una unidad enemiga a tu servicio. No funciona con héroes ni maestros.', active: input.mode === 'convert', action: () => input.setMode('convert') };
      // habilidades de héroes
      const heroes = units.filter((u) => u.ud!.abilities?.length);
      if (heroes.length) {
        const hero = heroes[0];
        hero.ud!.abilities!.forEach((ab, i) => {
          const def = ABILITIES[ab];
          const cd = Math.max(0, (hero.abilityCd[ab] ?? 0) - w.time);
          out[i] = { icon: svgIcon(def.icon, 'force'), title: def.name, desc: def.desc + ` (Recarga: ${def.cooldown}s)`, cooldown: cd, disabled: cd > 0, reason: 'Habilidad en recarga', active: input.mode === 'ability:' + ab, action: () => input.useAbility(ab as AbilityId) };
        });
      }
      out[9] = { icon: svgIcon('delete', 'cmd'), title: 'Eliminar', desc: 'Elimina las unidades seleccionadas (Supr).', action: () => input.deleteSelected() };
      return out;
    }
    if (builds.length) {
      const b = builds[0];
      if (!b.built) {
        out[14] = { icon: svgIcon('delete', 'cmd'), title: 'Cancelar construcción', desc: 'Recupera los recursos no invertidos.', action: () => input.deleteSelected() };
        return out;
      }
      const same = builds.filter((x) => x.defId === b.defId && x.built);
      // el puerto espacial reserva las dos primeras filas para el mercado
      let i = b.defId === 'spaceport' ? 10 : 0;
      for (const uid of w.trainOptions(b)) {
        if (i >= (b.defId === 'spaceport' ? 13 : 10)) break;
        const ud = UNITS[uid];
        const c = w.canTrain(v, uid);
        const cost = p.stats_of(uid).cost;
        const queued = same.reduce((a, x) => a + x.prodQueue.filter((q) => q.id === uid).length, 0);
        out[i++] = {
          icon: this.unitIcon(uid, v), title: this.name(uid, v), desc: ud.desc + statsLine(this.s, uid), cost, count: queued || undefined,
          disabled: !c.ok && c.reason !== 'Recursos insuficientes', reason: c.reason,
          action: (shift) => {
            let n = 0;
            const times = shift ? 5 : 1;
            for (let k = 0; k < times; k++) {
              // repartir entre edificios iguales seleccionados
              const target = same.slice().sort((a2, b2) => a2.prodQueue.length - b2.prodQueue.length)[0];
              n += w.queueTrain(target, uid, 1);
            }
            if (!n) {
              audio.ui('error');
              const r = w.canTrain(v, uid);
              this.message(r.reason ?? 'No se puede entrenar', '#ffb04a');
            }
          },
          rightAction: () => {
            for (const x of same) {
              const idx = x.prodQueue.map((q) => q.id).lastIndexOf(uid);
              if (idx >= 0) {
                w.cancelQueue(x, idx);
                break;
              }
            }
          },
        };
      }
      // investigaciones
      const res = w.researchOptions(b);
      for (const tid of res) {
        if (i >= 14) break;
        const t = TECHS[tid];
        const c = w.canResearch(v, tid);
        out[i++] = {
          icon: t.eraAdvance ? svgIcon('era', 'era', ERA_ROMAN[t.eraAdvance]) : svgIcon(t.icon ?? 'upgrade', t.civ ? 'unique' : t.building === 'temple' ? 'force' : t.mods?.some((m) => m.target.player) ? 'eco' : 'tech'),
          title: t.name, desc: t.desc, cost: p.techCost(t), disabled: !c.ok && c.reason !== 'Recursos insuficientes', reason: c.reason,
          action: () => {
            if (!w.queueResearch(b, tid)) {
              audio.ui('error');
              this.message(w.canResearch(v, tid).reason ?? 'No disponible', '#ffb04a');
            }
          },
        };
      }
      // mercado
      if (b.defId === 'spaceport') {
        const fee = w.marketFee(v);
        (['food', 'carbon', 'ore'] as const).forEach((r, k) => {
          out[k] = { icon: svgIcon('buy', 'eco'), title: `Comprar 100 de ${resLabel(r)}`, desc: `Precio: ${Math.round(w.market[r] * (1 + fee))} Nova`, action: () => { if (!w.marketBuy(v, r)) this.message('No tienes suficiente Nova.', '#ffb04a'); } };
          out[5 + k] = { icon: svgIcon('sell', 'eco'), title: `Vender 100 de ${resLabel(r)}`, desc: `Obtienes: ${Math.round(w.market[r] * (1 - fee))} Nova`, action: () => { if (!w.marketSell(v, r)) this.message('No tienes suficientes recursos.', '#ffb04a'); } };
        });
        out[3] = { icon: svgIcon('trade', 'eco'), title: 'Tributos', desc: 'Envía recursos a tus aliados (panel de Diplomacia).', action: () => this.openDiplomacy() };
      }
      if (b.bd!.garrison) {
        out[11] = { icon: svgIcon('ungarrison', 'cmd'), title: `Desguarnecer (${b.garrison.length}/${b.bd!.garrison})`, desc: 'Libera a todas las unidades guarnecidas.', disabled: !b.garrison.length, reason: 'No hay unidades dentro', action: () => { for (const x of builds) w.ungarrison(x, true); } };
      }
      if (b.defId === 'command_center') {
        out[12] = p.alarm
          ? { icon: svgIcon('alarmOff', 'eco'), title: 'Volver al trabajo', desc: 'Los trabajadores salen de los refugios y retoman sus tareas.', action: () => { w.releaseAlarm(v); this.message('Los trabajadores vuelven al trabajo.', '#7dff9a'); } }
          : { icon: svgIcon('alarm', 'mil'), title: 'Toque de alarma', desc: 'Todos los trabajadores cercanos se refugian en el Centro de Mando, Fortalezas y Torretas.', action: () => { const n = w.ringAlarm(v); audio.alert(); this.message(`¡Alarma! ${n} trabajadores buscan refugio.`, '#ff9a6a'); } };
      }
      if (b.bd!.trains?.length || b.defId === 'fortress' || b.defId === 'temple') {
        out[13] = { icon: svgIcon('rallyPt', 'cmd'), title: 'Punto de reunión', desc: 'Clic derecho en el mapa con el edificio seleccionado para fijar dónde van las unidades nuevas.', active: input.mode === 'rally', action: () => input.setMode('rally') };
      }
      out[14] = { icon: svgIcon('delete', 'cmd'), title: 'Destruir edificio', desc: 'Destruye el edificio seleccionado (Supr).', action: () => input.deleteSelected() };
    }
    return out;
  }

  setPage(p: 'main' | 'eco' | 'mil') {
    this.page = p;
    this.cmdKey = '';
    this.refreshCommands();
  }

  // ─────────────────────────── Panel de selección ───────────────────────────
  private refreshSelection() {
    const sel = this.s.input.selectedEntities();
    const w = this.w;
    const key = sel.map((e) => e.id + ':' + Math.round((e.hp / e.maxHp) * 50) + ':' + (e.prodQueue?.length ?? 0) + ':' + (e.prodQueue?.[0] ? Math.round((e.prodQueue[0].progress / e.prodQueue[0].total) * 40) : '') + ':' + Math.floor(e.carry) + ':' + Math.floor(e.amount) + ':' + e.defId + ':' + e.owner + ':' + (e.garrison?.length ?? 0) + (e.built ? 'b' : Math.round(e.progress * 40))).join(',') + '|' + (this.me?.era ?? 0);
    if (key === this.selKey) return;
    this.selKey = key;
    clear(this.selPanel);
    if (!sel.length) {
      this.page = 'main';
      const p = this.me;
      if (p) {
        this.selPanel.appendChild(h('div', { class: 'sel-info' },
          h('div', { class: 'sel-name' }, p.civ.name),
          h('div', { class: 'sel-owner' }, `${p.name} · ${ERA_NAMES[p.era]}`),
          h('div', { class: 'stats' }, ...p.civ.bonuses.slice(0, 4).map((b) => h('span', null, '• ' + b.text))),
        ));
      }
      return;
    }
    if (sel.length > 1) {
      const grid = h('div', { class: 'multi-grid' });
      for (const e of sel.slice(0, 60)) {
        const icon = e.kind === 'unit' ? this.unitIcon(e.defId, e.owner) : e.kind === 'building' ? this.buildingIcon(e.defId, e.owner) : '';
        const mi = h('div', { class: 'mi', title: this.name(e.defId, e.owner) }, h('img', { src: icon }), h('div', { class: 'hp' }, h('div', { style: `width:${(e.hp / e.maxHp) * 100}%` })));
        mi.addEventListener('click', (ev) => {
          if (ev.shiftKey) this.s.input.deselect(e.id);
          else if (ev.ctrlKey) this.s.input.selectType(e.defId);
          else this.s.input.select([e.id]);
        });
        grid.appendChild(mi);
      }
      this.selPanel.appendChild(h('div', { class: 'sel-info' }, h('div', { class: 'sel-name' }, `${sel.length} seleccionados`), grid));
      return;
    }
    const e = sel[0];
    const owner = w.players[e.owner];
    let icon = '';
    let name = '';
    if (e.kind === 'unit') {
      icon = this.unitIcon(e.defId, e.owner);
      name = this.name(e.defId, e.owner);
    } else if (e.kind === 'building') {
      icon = this.buildingIcon(e.defId, e.owner);
      name = this.name(e.defId, e.owner);
    } else if (e.kind === 'resource') {
      const pl = w.planet;
      const def = e.resKind === 'tree' ? buildTree(pl.forest.tree, 0, pl.forest.color, pl.forest.color2) : buildResource(e.resKind!, 0, pl.biome);
      icon = portrait('res:' + e.resKind + pl.id, def, 0xffffff);
      name = e.resKind === 'tree' ? 'Fuente de carbono' : e.resKind === 'bush' ? 'Arbustos de frutos' : e.resKind === 'nova' ? 'Cristales Nova' : e.resKind === 'ore' ? 'Yacimiento de mineral' : 'Carne';
    } else if (e.kind === 'holocron') {
      icon = portrait('holo', buildResource('holocron', 0, w.planet.biome), 0xffffff);
      name = 'Holocrón';
    }
    const info = h('div', { class: 'sel-info' });
    info.appendChild(h('div', { class: 'sel-name' }, name));
    if (e.kind !== 'resource' && e.kind !== 'holocron') {
      info.appendChild(h('div', { class: 'sel-owner', style: `color:${owner.id ? PLAYER_COLORS[owner.color]?.css : '#cfc8b0'}` }, owner.id ? `${owner.name} (${owner.civ.short})` : 'Naturaleza'));
      const frac = e.hp / e.maxHp;
      info.appendChild(h('div', { class: 'hpbar' + (frac < 0.35 ? ' low' : '') }, h('div', { style: `width:${frac * 100}%` })));
      info.appendChild(h('div', { class: 'hptext' }, `${Math.ceil(e.hp)} / ${e.maxHp}` + (e.kind === 'building' && !e.built ? ` · Construcción ${Math.floor(e.progress * 100)}%` : '')));
      const st = owner.stats_of(e.defId);
      const stats = h('div', { class: 'stats' });
      const def = e.ud ?? e.bd;
      if (def?.attack) {
        stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Ataque'), `${Math.round(st.damage)}${(def.attack.shots ?? 1) > 1 ? '×' + def.attack.shots : ''}`));
        if (def.attack.type === 'ranged') stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Alcance'), st.range.toFixed(0)));
      }
      stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Armadura'), `${Math.round(st.armorMelee)}/${Math.round(st.armorRanged)}`));
      if (e.ud) stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Velocidad'), st.speed.toFixed(2)));
      stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Visión'), st.los.toFixed(0)));
      if (st.deflect > 0) stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Desvío'), Math.round(st.deflect * 100) + '%'));
      if (e.bd?.needsPower) stats.appendChild(h('span', { style: `color:${e.powered ? '#6aff7a' : '#ff6a5a'}` }, e.powered ? '⚡ Con energía' : '⚡ Sin energía (50%)'));
      if (e.bd?.farm) stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Alimento'), String(Math.floor(e.farmFood))));
      if (e.holocrons.length) stats.appendChild(h('span', { style: 'color:#6ac8ff' }, `Holocrones: ${e.holocrons.length}`));
      if (e.bd?.garrison) stats.appendChild(h('span', null, h('span', { class: 'si' }, 'Guarnición'), `${e.garrison.length}/${e.bd.garrison}`));
      if (e.monumentTimer > 0) stats.appendChild(h('span', { style: 'color:#ffd23d' }, `Victoria en ${fmtTime(e.monumentTimer)}`));
      info.appendChild(stats);
      if (e.carry > 0 && e.carryType) info.appendChild(h('div', { class: 'carry' }, `Transporta ${Math.floor(e.carry)} de ${resLabel(e.carryType)}`));
      if (e.holocronId) info.appendChild(h('div', { class: 'carry', style: 'color:#6ac8ff' }, 'Transporta un holocrón'));
      if (e.buffs.some((b) => b.until > w.time)) info.appendChild(h('div', { class: 'carry', style: 'color:#ffd23d' }, 'Potenciado'));
      // cola de producción
      if (e.kind === 'building' && e.prodQueue.length) {
        const q = h('div', { class: 'queue' });
        e.prodQueue.forEach((it, idx) => {
          const ic = it.kind === 'unit' ? this.unitIcon(it.id, e.owner) : TECHS[it.id].eraAdvance ? svgIcon('era', 'era', ERA_ROMAN[TECHS[it.id].eraAdvance!]) : svgIcon(TECHS[it.id].icon ?? 'upgrade', 'tech');
          const qi = h('div', { class: 'qi', title: (it.kind === 'unit' ? this.name(it.id, e.owner) : TECHS[it.id].name) + ' (clic para cancelar)' }, h('img', { src: ic }),
            idx === 0 ? h('div', { class: 'prog', style: `width:${(it.progress / it.total) * 100}%` }) : null);
          qi.addEventListener('click', () => {
            if (e.owner === this.s.viewer) w.cancelQueue(e, idx);
          });
          q.appendChild(qi);
        });
        info.appendChild(q);
        const it0 = e.prodQueue[0];
        if (it0.kind === 'tech') info.appendChild(h('div', { class: 'hptext' }, `${TECHS[it0.id].name}: ${Math.floor((it0.progress / it0.total) * 100)}%`));
      }
    } else if (e.kind === 'resource') {
      info.appendChild(h('div', { class: 'stats' }, h('span', null, h('span', { class: 'si' }, 'Cantidad'), String(Math.floor(e.amount))), h('span', null, h('span', { class: 'si' }, 'Recurso'), resLabel(e.resType!))));
    } else {
      info.appendChild(h('div', { class: 'hptext' }, 'Antiguo artefacto Jedi/Sith. Llévalo a tu Templo con un usuario de la Fuerza para generar Nova. Controlar todos otorga la victoria.'));
    }
    this.selPanel.append(h('div', { class: 'sel-portrait' }, h('img', { src: icon })), info);
  }

  // ─────────────────────────── Tooltip ───────────────────────────
  showTip(anchor: HTMLElement, b: CmdButton, hk?: string) {
    const p = this.me;
    const t = this.tooltip;
    clear(t);
    t.appendChild(h('div', { class: 'tt-title' }, b.title));
    if (b.cost) {
      const c = h('div', { class: 'tt-cost' });
      for (const r of RESOURCE_TYPES) {
        const v = b.cost[r];
        if (!v) continue;
        c.appendChild(h('span', { class: p && p.res[r] < v ? 'no' : '' }, h('img', { src: resIcon(r), style: 'width:14px;height:14px' }), String(v)));
      }
      t.appendChild(c);
    }
    if (b.desc) t.appendChild(h('div', { class: 'tt-desc' }, b.desc));
    if (b.disabled && b.reason) t.appendChild(h('div', { class: 'tt-req' }, b.reason));
    if (hk) t.appendChild(h('div', { class: 'tt-hk' }, `Tecla: ${hk}` + (b.rightAction ? ' · Mayús: x5 · Clic derecho: cancelar' : '')));
    t.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    const rr = this.s.root.getBoundingClientRect();
    t.style.left = Math.min(rr.width - 350, r.left - rr.left) + 'px';
    t.style.top = '';
    t.style.bottom = rr.bottom - r.top + 8 + 'px';
    if (r.top < 120) {
      t.style.bottom = '';
      t.style.top = r.bottom - rr.top + 8 + 'px';
    }
  }
  hideTip() {
    this.tooltip.classList.add('hidden');
  }

  // ─────────────────────────── Overlay (barras de vida, selección) ───────────────────────────
  private drawOverlay() {
    const ctx = this.octx;
    const dpr = devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    const r = this.s.renderer;
    const w = this.w;
    const always = settings().alwaysHealth;
    const sel = this.s.input.selection;
    for (const [id, sp] of r.screenPos) {
      if (!sp.visible) continue;
      const e = w.entities.get(id);
      if (!e || !e.alive || e.kind === 'resource' || e.kind === 'holocron') continue;
      const isSel = sel.has(id);
      const damaged = e.hp < e.maxHp - 0.5;
      if (!isSel && !(always && damaged) && r.hovered !== id && !(damaged && e.kind === 'unit' && w.time - e.lastHitTime < 4)) {
        if (!(e.kind === 'building' && !e.built && e.owner === this.s.viewer)) continue;
      }
      const bw = e.kind === 'building' ? 46 : 26;
      const x = sp.x - bw / 2, y = sp.y - 6;
      const frac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x - 1, y - 1, bw + 2, 6);
      ctx.fillStyle = frac > 0.6 ? '#3fe04a' : frac > 0.3 ? '#f0c030' : '#f04a30';
      ctx.fillRect(x, y, bw * frac, 4);
      if (e.owner) {
        ctx.fillStyle = PLAYER_COLORS[w.players[e.owner].color]?.css ?? '#fff';
        ctx.fillRect(x - 4, y - 1, 3, 6);
      }
      if (e.kind === 'building' && !e.built) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(x - 1, y + 6, bw + 2, 5);
        ctx.fillStyle = '#4ad8ff';
        ctx.fillRect(x, y + 7, bw * e.progress, 3);
      } else if (e.kind === 'building' && e.prodQueue.length && e.owner === this.s.viewer && isSel) {
        const q = e.prodQueue[0];
        ctx.fillStyle = '#ffd23d';
        ctx.fillRect(x, y + 6, bw * (q.progress / q.total), 2);
      }
      if (e.kind === 'unit' && e.ud!.cls === 'hero') {
        ctx.fillStyle = '#ffd23d';
        ctx.font = 'bold 10px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name(e.defId, e.owner), sp.x, y - 4);
      }
    }
    // rectángulo de selección
    const dr = this.s.input.dragRect;
    if (dr) {
      ctx.strokeStyle = 'rgba(120, 255, 140, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.fillStyle = 'rgba(120, 255, 140, 0.08)';
      ctx.fillRect(dr.x0, dr.y0, dr.x1 - dr.x0, dr.y1 - dr.y0);
      ctx.strokeRect(dr.x0, dr.y0, dr.x1 - dr.x0, dr.y1 - dr.y0);
    }
    // línea de muro
    const wl = this.s.input.wallPreview;
    if (wl) {
      ctx.strokeStyle = wl.valid ? 'rgba(80,255,100,0.8)' : 'rgba(255,80,60,0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(wl.x0, wl.y0);
      ctx.lineTo(wl.x1, wl.y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Exo 2, sans-serif';
      ctx.fillText(`${wl.n} secciones · ${wl.n * 5} mineral`, wl.x1 + 10, wl.y1);
    }
  }

  // ─────────────────────────── Objetivos ───────────────────────────
  private refreshObjectives() {
    const w = this.w;
    const box = this.objBox;
    const lines: [string, string][] = [];
    const mons = w.buildings.filter((b) => b.alive && b.monumentTimer > 0);
    for (const m of mons) lines.push([`Monumento de ${w.players[m.owner].name}`, fmtTime(m.monumentTimer)]);
    if (w.holocronHold.team >= 0) lines.push(['Holocrones controlados', fmtTime(Math.max(0, (w.setup.holocronTime ?? 300) - (w.time - w.holocronHold.since)))]);
    if (w.setup.victory === 'score' && w.setup.timeLimit) lines.push(['Tiempo restante', fmtTime(Math.max(0, w.setup.timeLimit * 60 - w.time))]);
    if (w.time < w.treatyUntil) lines.push(['Tregua', fmtTime(w.treatyUntil - w.time)]);
    if (!lines.length) {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    clear(box);
    box.appendChild(h('div', { class: 'ot' }, 'Condiciones de victoria'));
    for (const [a, b] of lines) box.appendChild(h('div', { class: 'or' }, h('span', null, a), h('span', { style: 'color:#ffd23d' }, b)));
  }

  // ─────────────────────────── Modales ───────────────────────────
  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  isModalOpen() {
    return !!this.modal;
  }

  private openModal(content: HTMLElement) {
    this.closeModal();
    this.modal = h('div', { class: 'modal-back' }, content);
    this.modal.addEventListener('mousedown', (ev) => {
      if (ev.target === this.modal) this.closeModal();
    });
    this.root.appendChild(this.modal);
  }

  openMenu() {
    if (!this.s.paused) this.s.togglePause();
    const m = h('div', { class: 'modal modal-col' },
      h('h2', null, 'Pausa'),
      h('button', { class: 'btn primary', onclick: () => { this.closeModal(); if (this.s.paused) this.s.togglePause(); } }, 'Continuar'),
      h('button', { class: 'btn', onclick: () => this.openOptions() }, 'Opciones'),
      h('button', { class: 'btn', onclick: () => this.openHelp() }, 'Controles'),
      h('button', { class: 'btn', onclick: () => { this.closeModal(); this.s.resign(); if (this.s.paused) this.s.togglePause(); } }, 'Rendirse'),
      h('button', { class: 'btn', onclick: () => this.s.quit() }, 'Salir al menú principal'),
    );
    this.openModal(m);
  }

  openOptions() {
    const st = settings();
    const vol = (label: string, key: 'music' | 'sfx') => {
      const inp = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(st[key]) }) as HTMLInputElement;
      inp.addEventListener('input', () => {
        saveSettings({ [key]: Number(inp.value) });
        audio.applySettings();
      });
      return h('div', { class: 'form-row' }, h('label', null, label), inp);
    };
    const chk = (label: string, key: 'alwaysHealth' | 'edgeScroll' | 'voices') => {
      const inp = h('input', { type: 'checkbox' }) as HTMLInputElement;
      inp.checked = st[key];
      inp.addEventListener('change', () => {
        saveSettings({ [key]: inp.checked });
        audio.applySettings();
      });
      return h('div', { class: 'form-row' }, h('label', null, label), inp);
    };
    const speed = h('select', null, ...[1, 1.5, 2, 3].map((v) => h('option', { value: String(v), selected: this.s.speed === v ? 'selected' : null }, v + 'x'))) as HTMLSelectElement;
    speed.addEventListener('change', () => this.s.setSpeed(Number(speed.value)));
    const m = h('div', { class: 'modal' },
      h('h2', null, 'Opciones'),
      vol('Música', 'music'),
      vol('Efectos', 'sfx'),
      chk('Voces de unidades', 'voices'),
      chk('Barras de vida siempre', 'alwaysHealth'),
      chk('Desplazamiento por bordes', 'edgeScroll'),
      h('div', { class: 'form-row' }, h('label', null, 'Velocidad'), speed),
      h('div', { class: 'hptext' }, 'La calidad gráfica se cambia desde el menú principal.'),
      h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: () => this.openMenu() }, 'Volver')),
    );
    this.openModal(m);
  }

  openHelp() {
    const rows: [string, string][] = [
      ['Clic izquierdo / arrastrar', 'Seleccionar unidades'],
      ['Doble clic / Ctrl+clic', 'Seleccionar todas las del mismo tipo en pantalla'],
      ['Clic derecho', 'Mover / atacar / recolectar / construir'],
      ['Mayús + orden', 'Encolar órdenes'],
      ['Q W E R T / A S D F G / Z X C V B', 'Botones del panel de órdenes'],
      ['Ctrl + 1..9 / 1..9', 'Crear / seleccionar grupos'],
      ['H', 'Ir al Centro de Mando'],
      ['. / ,', 'Trabajador / militar ocioso'],
      ['Espacio', 'Ir a la última alerta'],
      ['Supr', 'Eliminar selección'],
      ['Flechas / bordes / botón central', 'Mover la cámara'],
      ['Rueda', 'Zoom'],
      ['Inicio / Fin', 'Rotar cámara'],
      ['F3 o Pausa', 'Pausar'],
      ['+ / -', 'Velocidad de juego'],
      ['F10 / Esc', 'Menú'],
    ];
    const m = h('div', { class: 'modal' }, h('h2', null, 'Controles'),
      h('div', { class: 'kv' }, ...rows.flatMap(([a, b]) => [h('div', null, a), h('div', null, b)])),
      h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: () => this.openMenu() }, 'Volver')));
    this.openModal(m);
  }

  openDiplomacy() {
    const w = this.w;
    const v = this.s.viewer;
    const me = this.me;
    const table = h('table', { class: 'diplo-table' });
    table.appendChild(h('tr', null, h('th', null, 'Jugador'), h('th', null, 'Civilización'), h('th', null, 'Postura'), h('th', null, 'Puntuación'), h('th', null, 'Tributo')));
    for (const p of w.players) {
      if (!p.id || p.id === v) continue;
      const stance = h('select', { disabled: w.setup.lockedTeams ? 'disabled' : null }, ...(['ally', 'neutral', 'enemy'] as const).map((d) => h('option', { value: d, selected: me.diplo[p.id] === d ? 'selected' : null }, d === 'ally' ? 'Aliado' : d === 'neutral' ? 'Neutral' : 'Enemigo'))) as HTMLSelectElement;
      stance.addEventListener('change', () => {
        w.setDiplomacy(v, p.id, stance.value as any);
        // la IA responde
        if (!p.human) {
          if (stance.value === 'enemy') w.setDiplomacy(p.id, v, 'enemy');
          else {
            const strong = me.score() < p.score() * 1.5;
            if (strong) {
              w.setDiplomacy(p.id, v, stance.value as any);
              this.message(`${p.name} acepta tu propuesta.`, '#7dff9a');
            } else this.message(`${p.name} rechaza tu propuesta.`, '#ff9a6a');
          }
        }
      });
      const trib = h('div', { style: 'display:flex;gap:4px' }, ...RESOURCE_TYPES.map((r) => h('button', { class: 'btn small', title: `Enviar 100 de ${resLabel(r)}`, onclick: () => { if (w.tribute(v, p.id, r, 100)) this.message(`Has enviado 100 de ${resLabel(r)} a ${p.name}.`, '#7dff9a'); else this.message('Recursos insuficientes.', '#ffb04a'); } }, h('img', { src: resIcon(r), style: 'width:14px;height:14px' }))));
      table.appendChild(h('tr', null,
        h('td', { style: `color:${PLAYER_COLORS[p.color]?.css}` }, p.name + (p.defeated ? ' (derrotado)' : '')),
        h('td', null, p.civ.short),
        h('td', null, stance),
        h('td', null, String(p.score())),
        h('td', null, me.isAlly(p.id) && !p.defeated ? trib : h('span', { class: 'hptext' }, '—')),
      ));
    }
    const m = h('div', { class: 'modal' }, h('h2', null, 'Diplomacia'), table,
      h('div', { class: 'hptext', style: 'margin-top:8px' }, w.setup.lockedTeams ? 'Los equipos están bloqueados en esta partida.' : 'Las IA aceptan alianzas si no eres mucho más fuerte que ellas.'),
      h('div', { class: 'hptext' }, `Comisión de tributos: ${Math.round(w.marketFee(v) * 100)}%`),
      h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: () => this.closeModal() }, 'Cerrar')));
    this.openModal(m);
  }

  openObjectives() {
    const w = this.w;
    const lines: string[] = [];
    lines.push('• Conquista: destruye todas las unidades y edificios de tus enemigos.');
    if (w.setup.victory === 'standard') {
      lines.push(`• Monumento: construye el Monumento de tu civilización en la Era Galáctica y mantenlo en pie ${Math.round((w.setup.monumentTime ?? 360) / 60)} minutos.`);
      lines.push(`• Holocrones: reúne los ${w.holocrons.length} holocrones en tus Templos con usuarios de la Fuerza y consérvalos ${Math.round((w.setup.holocronTime ?? 300) / 60)} minutos.`);
    }
    if (w.setup.victory === 'score') lines.push(`• Puntuación: gana quien tenga más puntos tras ${w.setup.timeLimit} minutos.`);
    const table = h('table', { class: 'diplo-table' });
    table.appendChild(h('tr', null, h('th', null, 'Jugador'), h('th', null, 'Era'), h('th', null, 'Población'), h('th', null, 'Muertes'), h('th', null, 'Puntos')));
    for (const p of w.players) {
      if (!p.id) continue;
      table.appendChild(h('tr', null, h('td', { style: `color:${PLAYER_COLORS[p.color]?.css}` }, p.name), h('td', null, ERA_ROMAN[p.era]), h('td', null, String(p.pop)), h('td', null, String(p.stats.unitsKilled)), h('td', null, String(p.score()))));
    }
    const m = h('div', { class: 'modal' }, h('h2', null, 'Objetivos'), ...lines.map((l) => h('div', { style: 'margin-bottom:6px' }, l)), h('h2', { style: 'margin-top:18px' }, 'Puntuaciones'), table,
      h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: () => this.closeModal() }, 'Cerrar')));
    this.openModal(m);
  }

  openTechTree() {
    const p = this.me;
    const wrap = h('div', { style: 'display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;min-width:900px' });
    for (let era = 1; era <= 4; era++) {
      const col = h('div', null, h('div', { style: 'font-family:Orbitron;color:#ffd23d;margin-bottom:8px;font-size:12px;letter-spacing:1px' }, `${ERA_ROMAN[era as 1]} · ${ERA_NAMES[era as 1]}`));
      for (const t of Object.values(TECHS)) {
        if (t.era !== era || t.eraAdvance) continue;
        if (!techAvailable(p, t)) continue;
        const done = p.techs.has(t.id);
        const q = p.queuedTechs.has(t.id);
        col.appendChild(h('div', { style: `display:flex;gap:6px;align-items:center;margin-bottom:4px;font-size:12px;opacity:${done ? 1 : 0.75};color:${done ? '#7dff9a' : q ? '#ffd23d' : '#c8ccd8'}`, title: t.desc },
          h('img', { src: svgIcon(t.icon ?? 'upgrade', t.civ ? 'unique' : 'tech'), style: 'width:22px;height:22px' }), (done ? '✔ ' : '') + t.name, h('span', { style: 'color:#6a7488;font-size:10px' }, ` · ${BUILDINGS[t.building]?.name ?? ''}`)));
      }
      wrap.appendChild(col);
    }
    const m = h('div', { class: 'modal' }, h('h2', null, `Árbol tecnológico · ${p.civ.name}`), wrap,
      h('div', { class: 'hptext', style: 'margin-top:8px' }, `Desactivado para esta civilización: ${p.civ.disabled.map((d) => UNITS[d]?.name ?? TECHS[d]?.name ?? BUILDINGS[d]?.name ?? d).join(', ') || 'nada'}`),
      h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: () => this.closeModal() }, 'Cerrar')));
    this.openModal(m);
  }

  // ─────────────────────────── Fin de partida ───────────────────────────
  showEnd(win: boolean, onClose: () => void) {
    const w = this.w;
    const root = h('div', { class: 'endscreen' });
    root.appendChild(h('div', { class: 'big ' + (win ? 'win' : 'lose') }, win ? 'VICTORIA' : 'DERROTA'));
    root.appendChild(h('div', { class: 'subtitle', style: 'color:#9aa2b4' }, `${w.planet.name} · Duración ${fmtTime(w.time)}`));
    const tabs = h('div', { class: 'tabs' });
    const body = h('div');
    const views: Record<string, () => HTMLElement> = {
      Resumen: () => this.statTable([['Puntuación', (p) => p.score()], ['Era alcanzada', (p) => ERA_ROMAN[p.era]], ['Unidades eliminadas', (p) => p.stats.unitsKilled], ['Unidades perdidas', (p) => p.stats.unitsLost], ['Edificios destruidos', (p) => p.stats.buildingsDestroyed], ['Tecnologías', (p) => p.stats.techs]]),
      Militar: () => this.statTable([['Unidades entrenadas', (p) => p.stats.unitsTrained], ['Unidades eliminadas', (p) => p.stats.unitsKilled], ['Unidades perdidas', (p) => p.stats.unitsLost], ['Edificios destruidos', (p) => p.stats.buildingsDestroyed], ['Edificios perdidos', (p) => p.stats.buildingsLost], ['Conversiones', (p) => p.stats.converted]]),
      Economía: () => this.statTable([['Alimento recolectado', (p) => Math.round(p.stats.gathered.food)], ['Carbono recolectado', (p) => Math.round(p.stats.gathered.carbon)], ['Nova recolectada', (p) => Math.round(p.stats.gathered.nova)], ['Mineral recolectado', (p) => Math.round(p.stats.gathered.ore)], ['Tributos enviados', (p) => p.stats.tributeSent], ['Edificios construidos', (p) => p.stats.buildingsBuilt]]),
      Eras: () => this.statTable([['Era de Expansión', (p) => (p.stats.eraTimes[1] !== undefined ? fmtTime(p.stats.eraTimes[1]) : '—')], ['Era de las Guerras', (p) => (p.stats.eraTimes[2] !== undefined ? fmtTime(p.stats.eraTimes[2]) : '—')], ['Era Galáctica', (p) => (p.stats.eraTimes[3] !== undefined ? fmtTime(p.stats.eraTimes[3]) : '—')]]),
      'Línea temporal': () => this.timeline(),
    };
    const show = (k: string) => {
      clear(body);
      body.appendChild(views[k]());
      for (const b of tabs.children) b.classList.toggle('on', b.textContent === k);
    };
    for (const k of Object.keys(views)) tabs.appendChild(h('button', { class: 'btn small', onclick: () => show(k) }, k));
    root.append(tabs, body, h('div', { style: 'margin-top:20px' }, h('button', { class: 'btn primary', onclick: () => onClose() }, 'Continuar')));
    show('Resumen');
    this.root.appendChild(root);
  }

  private statTable(rows: [string, (p: Player) => string | number][]): HTMLElement {
    const w = this.w;
    const ps = w.players.filter((p) => p.id);
    const t = h('table', { class: 'stat-table' });
    t.appendChild(h('tr', null, h('th', null, ''), ...ps.map((p) => h('th', { style: `color:${PLAYER_COLORS[p.color]?.css}` }, p.name + (w.winners.includes(p.id) ? ' ★' : '')))));
    t.appendChild(h('tr', null, h('td', null, 'Civilización'), ...ps.map((p) => h('td', null, p.civ.short))));
    for (const [label, f] of rows) t.appendChild(h('tr', null, h('td', null, label), ...ps.map((p) => h('td', null, String(f(p))))));
    return t;
  }

  private timeline(): HTMLElement {
    const w = this.w;
    const c = h('canvas', { width: '860', height: '300', style: 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,210,61,0.2);margin-top:14px' }) as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    let maxS = 1, maxT = 1;
    for (const p of w.players) for (const pt of p.stats.timeline) {
      maxS = Math.max(maxS, pt.score);
      maxT = Math.max(maxT, pt.t);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(40, 20 + i * 52);
      ctx.lineTo(850, 20 + i * 52);
      ctx.stroke();
    }
    for (const p of w.players) {
      if (!p.id) continue;
      ctx.strokeStyle = PLAYER_COLORS[p.color]?.css ?? '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      p.stats.timeline.forEach((pt, i) => {
        const x = 40 + (pt.t / maxT) * 800, y = 280 - (pt.score / maxS) * 260;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.fillStyle = '#9aa2b4';
    ctx.font = '11px Exo 2';
    ctx.fillText('Puntuación a lo largo del tiempo', 44, 14);
    return c;
  }

  dispose() {
    this.minimap.dispose();
    this.root.remove();
    this.overlay.remove();
  }
}

function resLabel(r: ResourceType | string): string {
  return r === 'food' ? 'Alimento' : r === 'carbon' ? 'Carbono' : r === 'nova' ? 'Cristales Nova' : r === 'ore' ? 'Mineral' : r;
}
function resDesc(r: ResourceType): string {
  return r === 'food' ? 'Frutos, caza y granjas de humedad. Para trabajadores, tropas y eras.'
    : r === 'carbon' ? 'Bosques y chatarra. Para edificios, granjas y armas pesadas.'
      : r === 'nova' ? 'Cristales de alta energía. Para unidades avanzadas, la Fuerza y tecnologías.'
        : 'Minas de mineral. Para fortalezas, torretas y muros.';
}

function statsLine(s: GameSession, uid: string): string {
  const p = s.world.players[s.viewer];
  const st = p.stats_of(uid);
  const ud = UNITS[uid];
  let t = ` · PV ${st.hp}`;
  if (ud.attack) t += ` · Ataque ${Math.round(st.damage)}${ud.attack.type === 'ranged' ? ` (alcance ${st.range.toFixed(0)})` : ''}`;
  t += ` · Armadura ${Math.round(st.armorMelee)}/${Math.round(st.armorRanged)}`;
  if (ud.attack?.bonus) t += ' · Bonus: ' + Object.entries(ud.attack.bonus).map(([k, v]) => `+${v} vs ${tagName(k)}`).join(', ');
  return t;
}

function tagName(t: string): string {
  const m: Record<string, string> = { infantry: 'infantería', trooper: 'soldados', worker: 'trabajadores', mounted: 'montados', mech: 'mechs', heavyWeapon: 'armas pesadas', air: 'naves', bomber: 'bombarderos', jedi: 'Jedi/Sith', hero: 'héroes', building: 'edificios', turret: 'torretas', wall: 'muros', droid: 'droides', ranged: 'a distancia' };
  return m[t] ?? t;
}

export { costText };
