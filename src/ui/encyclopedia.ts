// Enciclopedia: civilizaciones, unidades, edificios, tecnologías, planetas y guía.
import { h, clear } from './dom';
import { CIV_LIST, CIVS } from '../data/civs';
import { UNITS, ABILITIES } from '../data/units';
import { BUILDINGS } from '../data/buildings';
import { TECHS, ERA_NAMES } from '../data/techs';
import { PLANET_LIST } from '../data/planets';
import { portrait, svgIcon, resIcon } from './icons';
import { buildUnitModel } from '../render/models/unitModels';
import { buildBuildingModel } from '../render/models/buildingModels';
import { planetPreview } from './screens';
import { RESOURCE_TYPES, type Cost } from '../data/types';

function costEl(c: Cost) {
  return h('span', { style: 'display:inline-flex;gap:10px' }, ...RESOURCE_TYPES.filter((r) => c[r]).map((r) => h('span', { style: 'display:inline-flex;gap:3px;align-items:center' }, h('img', { src: resIcon(r), style: 'width:16px;height:16px' }), String(c[r]))));
}

const TAG_ES: Record<string, string> = { infantry: 'infantería', trooper: 'soldados', worker: 'trabajadores', mounted: 'montados', mech: 'mechs', heavyWeapon: 'armas pesadas', air: 'naves', bomber: 'bombarderos', jedi: 'Jedi/Sith', hero: 'héroes', building: 'edificios', turret: 'torretas', wall: 'muros', droid: 'droides', ranged: 'a distancia', creature: 'criaturas', shielded: 'escudados', unique: 'únicas', melee: 'cuerpo a cuerpo' };

export function encyclopedia(parent: HTMLElement, onBack: () => void) {
  const root = h('div', { class: 'screen' });
  root.appendChild(h('h1', null, 'Enciclopedia Galáctica'));
  const tabs = h('div', { class: 'tabs' });
  const body = h('div', { class: 'ency' });
  root.append(tabs, body);
  root.appendChild(h('div', { class: 'screen-actions', style: 'justify-content:flex-start' }, h('button', { class: 'btn', onclick: () => { root.remove(); onBack(); } }, 'Volver')));
  parent.appendChild(root);
  const style = 'imperial';

  const sections: Record<string, () => void> = {
    'Cómo jugar': () => {
      clear(body);
      body.appendChild(h('div', { class: 'ency-detail panel', style: 'line-height:1.7' }, h('div', { html: `
        <h3>Fundamentos</h3>
        <p>Como en Age of Empires, empiezas con un <b>Centro de Mando</b>, unos pocos <b>trabajadores</b> y un explorador. Recolecta los cuatro recursos:</p>
        <ul>
          <li><b>Alimento</b>: arbustos de frutos, caza de animales salvajes y granjas de humedad.</li>
          <li><b>Carbono</b>: árboles y chatarra. Sirve para casi todos los edificios.</li>
          <li><b>Cristales Nova</b>: el recurso valioso, para unidades avanzadas, tecnologías y la Fuerza.</li>
          <li><b>Mineral</b>: para fortalezas, torretas y muros.</li>
        </ul>
        <p>Construye <b>Refugios Prefabricados</b> para aumentar la población y centros de procesamiento junto a los recursos para acortar los viajes.</p>
        <h3>Eras</h3>
        <p>Avanza por las cuatro eras desde el Centro de Mando: <b>Fronteriza → Expansión → Guerras → Galáctica</b>. Cada avance necesita recursos y dos edificios distintos de la era actual.</p>
        <h3>Energía y escudos</h3>
        <p>Los edificios militares necesitan estar dentro del radio de un <b>Núcleo de Energía</b>; sin energía producen a la mitad de velocidad. Los <b>Generadores de Escudos</b> reducen el daño de todo lo que protegen.</p>
        <h3>Mercado y comercio</h3>
        <p>En el <b>Puerto Espacial</b> compras y vendes recursos a cambio de Nova; los precios suben al comprar, bajan al vender y se recuperan con el tiempo. Los <b>Cargueros Comerciales</b> viajan entre dos puertos (tuyos o aliados) y ganan Nova en cada viaje: cuanto más lejos, más ganancia. Cuando los cristales se agoten, las granjas y el comercio sostendrán tu economía.</p>
        <h3>Defensa</h3>
        <p>Mete unidades en el <b>Centro de Mando</b>, la <b>Fortaleza</b> o las <b>torretas</b> para que disparen más y se curen. La <b>campana de alarma</b> refugia a tus trabajadores. Las defensas resisten muy bien los blásteres: derríbalas con arietes, artillería, mechs de asalto, granaderos o bombarderos.</p>
        <h3>Contrarrestar</h3>
        <ul>
          <li>Soldados → vencen a armas pesadas y destructores de mechs.</li>
          <li>Granaderos → arrasan grupos de soldados, Jedi y edificios.</li>
          <li>Tropas montadas → cazan soldados, granaderos y artillería.</li>
          <li>Mechs de ataque → destrozan infantería.</li>
          <li>Destructores de mechs → aniquilan mechs y tropas montadas.</li>
          <li>Jedi/Sith → desvían blásteres y destrozan droides y mechs, pero temen a las granadas.</li>
          <li>Antiaéreos → única defensa eficaz contra cazas y bombarderos.</li>
          <li>Arietes y artillería → derriban edificios.</li>
        </ul>
        <h3>Victoria</h3>
        <p>Destruye a tus enemigos, mantén en pie tu <b>Monumento</b> el tiempo necesario o reúne todos los <b>Holocrones</b> en tus templos.</p>` })));
    },
    Civilizaciones: () => list(CIV_LIST.map((c) => ({ id: c.id, name: c.name, icon: '' })), (id) => {
      const c = CIVS[id];
      const d = h('div', { class: 'ency-detail panel' });
      d.appendChild(h('h3', null, c.name));
      d.appendChild(h('p', null, c.desc));
      d.appendChild(h('div', { class: 'kv' },
        h('div', null, 'Bando'), h('div', null, c.side === 'light' ? 'Lado Luminoso' : 'Lado Oscuro'),
        h('div', null, 'Fortalezas'), h('div', null, c.strengths.join(', ')),
        h('div', null, 'Unidad única'), h('div', null, UNITS[c.uniqueUnit].name + ' — ' + UNITS[c.uniqueUnit].desc),
        h('div', null, 'Héroes'), h('div', null, c.heroes.map((x) => UNITS[x].name).join(', ')),
        h('div', null, 'Tecnologías únicas'), h('div', null, c.uniqueTechs.map((t) => TECHS[t].name + ' (' + TECHS[t].desc + ')').join(' · ')),
        h('div', null, 'Monumento'), h('div', null, c.monumentName),
        h('div', null, 'No disponible'), h('div', null, c.disabled.map((d2) => UNITS[d2]?.name ?? TECHS[d2]?.name ?? BUILDINGS[d2]?.name ?? d2).join(', ') || '—'),
      ));
      d.appendChild(h('h3', { style: 'margin-top:14px' }, 'Bonificaciones'));
      const ul = h('ul');
      for (const b of c.bonuses) ul.appendChild(h('li', null, b.text));
      ul.appendChild(h('li', { style: 'color:#6ac8ff' }, c.teamBonus.text));
      d.appendChild(ul);
      const gal = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px' });
      for (const uid of ['worker', 'trooper', 'mounted_trooper', 'strike_mech', 'assault_mech', 'fighter', c.uniqueUnit, ...c.heroes]) {
        if (c.disabled.includes(uid)) continue;
        const def = buildUnitModel(uid, c.style, c.saber);
        gal.appendChild(h('div', { style: 'text-align:center;font-size:11px;width:96px' }, h('img', { src: portrait('u:' + c.style + ':' + uid, def, 0x2f6bff, UNITS[uid].saberColor ?? c.saber), style: 'width:96px;height:96px;background:radial-gradient(circle,#1d2a40,#070a10)' }), h('div', null, c.names[uid] ?? UNITS[uid].name)));
      }
      d.appendChild(gal);
      return d;
    }),
    Unidades: () => list(Object.values(UNITS).filter((u) => !u.hidden || u.cls === 'hero').filter((u) => u.cls !== 'animal').map((u) => ({ id: u.id, name: u.name, icon: '' })), (id) => {
      const u = UNITS[id];
      const civ = u.civ ? CIVS[u.civ] : u.heroOf ? CIVS[u.heroOf] : null;
      const st = civ?.style ?? style;
      const d = h('div', { class: 'ency-detail panel' });
      d.appendChild(h('img', { class: 'big-portrait', src: portrait('u:' + st + ':' + id + ':big', buildUnitModel(id, st, u.saberColor ?? civ?.saber ?? 0x3d8bff), 0x2f6bff, u.saberColor ?? civ?.saber ?? 0x3d8bff) }));
      d.appendChild(h('h3', null, u.name));
      d.appendChild(h('p', null, u.desc));
      const kv = h('div', { class: 'kv' },
        h('div', null, 'Coste'), h('div', null, costEl(u.cost)),
        h('div', null, 'Era'), h('div', null, ERA_NAMES[u.era]),
        h('div', null, 'Edificio'), h('div', null, BUILDINGS[u.building]?.name ?? '—'),
        h('div', null, 'Puntos de vida'), h('div', null, String(u.hp)),
        h('div', null, 'Armadura'), h('div', null, `${u.armor.melee} cuerpo a cuerpo / ${u.armor.ranged} a distancia`),
        h('div', null, 'Velocidad'), h('div', null, u.speed.toFixed(2)),
        h('div', null, 'Visión'), h('div', null, String(u.los)),
      );
      if (u.attack) {
        kv.append(h('div', null, 'Ataque'), h('div', null, `${u.attack.damage}${u.attack.shots ? '×' + u.attack.shots : ''} (${u.attack.type === 'melee' ? 'cuerpo a cuerpo' : 'a distancia'}), alcance ${u.attack.range}, recarga ${u.attack.reload}s` + (u.attack.splash ? `, área ${u.attack.splash}` : '') + (u.attack.airOnly ? ', solo aire' : u.attack.canHitAir ? ', ataca aire' : '')));
        if (u.attack.bonus) kv.append(h('div', null, 'Bonus'), h('div', null, Object.entries(u.attack.bonus).map(([k, v]) => `+${v} contra ${TAG_ES[k] ?? k}`).join(', ')));
      }
      if (u.deflect) kv.append(h('div', null, 'Desvío de bláster'), h('div', null, Math.round(u.deflect * 100) + '%'));
      if (u.abilities) kv.append(h('div', null, 'Habilidades'), h('div', null, ...u.abilities.map((a) => h('div', null, h('b', null, ABILITIES[a].name + ': '), ABILITIES[a].desc))));
      kv.append(h('div', null, 'Clases'), h('div', null, u.tags.map((t) => TAG_ES[t] ?? t).join(', ')));
      if (civ) kv.append(h('div', null, 'Civilización'), h('div', null, civ.name));
      d.appendChild(kv);
      // nombres por civilización
      if (!u.civ && !u.heroOf) {
        const names = h('div', { style: 'margin-top:10px;font-size:12px;color:#9aa2b4' }, h('b', null, 'Nombres por civilización: '), CIV_LIST.filter((c) => !c.disabled.includes(id)).map((c) => `${c.short}: ${c.names[id] ?? u.name}`).join(' · '));
        d.appendChild(names);
      }
      return d;
    }),
    Edificios: () => list(Object.values(BUILDINGS).map((b) => ({ id: b.id, name: b.name, icon: '' })), (id) => {
      const b = BUILDINGS[id];
      const d = h('div', { class: 'ency-detail panel' });
      d.appendChild(h('img', { class: 'big-portrait', src: portrait('b:' + style + ':' + id + ':big', buildBuildingModel(id, style), 0x2f6bff) }));
      d.appendChild(h('h3', null, b.name));
      d.appendChild(h('p', null, b.desc));
      d.appendChild(h('div', { class: 'kv' },
        h('div', null, 'Coste'), h('div', null, costEl(b.cost)),
        h('div', null, 'Era'), h('div', null, ERA_NAMES[b.era]),
        h('div', null, 'Puntos de vida'), h('div', null, String(b.hp)),
        h('div', null, 'Tamaño'), h('div', null, `${b.size}×${b.size}`),
        h('div', null, 'Tiempo de construcción'), h('div', null, b.time + ' s'),
        h('div', null, 'Población'), h('div', null, b.pop ? '+' + b.pop : '—'),
        h('div', null, 'Necesita energía'), h('div', null, b.needsPower ? 'Sí' : 'No'),
        h('div', null, 'Entrena'), h('div', null, (b.trains ?? []).map((u) => UNITS[u].name).join(', ') || (id === 'fortress' ? 'Unidad única y héroes' : '—')),
        h('div', null, 'Investiga'), h('div', null, Object.values(TECHS).filter((t) => t.building === id && !t.civ).map((t) => t.name).join(', ') || '—'),
      ));
      d.appendChild(h('div', { style: 'margin-top:10px;display:flex;gap:6px;flex-wrap:wrap' }, ...CIV_LIST.map((c) => h('div', { style: 'text-align:center;font-size:11px;width:84px' }, h('img', { src: portrait('b:' + c.style + ':' + id, buildBuildingModel(id, c.style), 0x2f6bff), style: 'width:84px;height:84px;background:radial-gradient(circle,#1d2a40,#070a10)' }), h('div', null, c.short)))));
      return d;
    }),
    Tecnologías: () => list(Object.values(TECHS).filter((t) => !t.id.startsWith('elite_')).map((t) => ({ id: t.id, name: t.name, icon: svgIcon(t.icon ?? 'upgrade', t.civ ? 'unique' : 'tech') })), (id) => {
      const t = TECHS[id];
      const d = h('div', { class: 'ency-detail panel' });
      d.appendChild(h('h3', null, t.name));
      d.appendChild(h('p', null, t.desc));
      d.appendChild(h('div', { class: 'kv' },
        h('div', null, 'Coste'), h('div', null, costEl(t.cost)),
        h('div', null, 'Era'), h('div', null, ERA_NAMES[t.era]),
        h('div', null, 'Edificio'), h('div', null, BUILDINGS[t.building]?.name ?? '—'),
        h('div', null, 'Tiempo'), h('div', null, t.time + ' s'),
        h('div', null, 'Requiere'), h('div', null, (t.requires ?? []).map((r) => TECHS[r].name).join(', ') || '—'),
        h('div', null, 'Exclusiva'), h('div', null, t.civ ? CIVS[t.civ].name : '—'),
      ));
      return d;
    }),
    Planetas: () => list(PLANET_LIST.map((p) => ({ id: p.id, name: p.name, icon: '' })), (id) => {
      const p = PLANET_LIST.find((x) => x.id === id)!;
      const d = h('div', { class: 'ency-detail panel' });
      const c = planetPreview(id, 110);
      c.style.cssText = 'float:right;width:220px;height:220px';
      d.appendChild(c);
      d.appendChild(h('h3', null, p.name));
      d.appendChild(h('p', null, p.desc));
      d.appendChild(h('div', { class: 'kv' },
        h('div', null, 'Bioma'), h('div', null, p.biome),
        h('div', null, 'Líquido'), h('div', null, p.water ? ({ water: 'Agua', lava: 'Lava', swamp: 'Pantano', ice: 'Hielo', acid: 'Ácido' } as any)[p.water.kind] : '—'),
        h('div', null, 'Densidad forestal'), h('div', null, Math.round(p.forest.density * 100) + '%'),
        h('div', null, 'Fauna'), h('div', null, p.animals.map((a) => UNITS[a]?.name ?? a).join(', ')),
      ));
      return d;
    }),
  };

  function list(items: { id: string; name: string; icon: string }[], detail: (id: string) => HTMLElement) {
    clear(body);
    const l = h('div', { class: 'ency-list panel' });
    const holder = h('div', { style: 'flex:1;min-width:0;display:flex' });
    let sel: HTMLElement | null = null;
    const pick = (id: string, el: HTMLElement) => {
      sel?.classList.remove('sel');
      el.classList.add('sel');
      sel = el;
      clear(holder);
      const d = detail(id);
      d.style.flex = '1';
      holder.appendChild(d);
    };
    items.forEach((it, i) => {
      const el = h('div', { class: 'ency-item' }, it.icon ? h('img', { src: it.icon }) : null, it.name);
      el.addEventListener('click', () => pick(it.id, el));
      l.appendChild(el);
      if (i === 0) setTimeout(() => pick(it.id, el), 0);
    });
    body.append(l, holder);
  }

  for (const k of Object.keys(sections)) {
    tabs.appendChild(h('button', { class: 'btn small', onclick: (ev: Event) => { for (const b of tabs.children) b.classList.remove('on'); (ev.currentTarget as HTMLElement).classList.add('on'); sections[k](); } }, k));
  }
  (tabs.children[0] as HTMLElement).classList.add('on');
  sections['Cómo jugar']();
}
