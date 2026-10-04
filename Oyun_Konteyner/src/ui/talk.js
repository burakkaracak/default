// Karakterle yüz yüze konuşma menüsü. Diğer modüller registerTalk ile kendi seçeneklerini ekler.
import { h, panel, toast } from './dom.js';
import { G, charDef } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { pick } from '../core/util.js';
import { portraits } from '../characters/portraits.js';
import { trust, addTrust, pendingFor, resolveFace, whoName } from '../characters/approvals.js';

const EXTRA = [];
// fn(who, api) → [{label, sub, fn}] (fn async olabilir; true dönerse panel kapanır)
export function registerTalk(fn) { EXTRA.push(fn); }

export function trustLabel(t) { return t < 20 ? 'Mesafeli' : t < 40 ? 'Temkinli' : t < 60 ? 'İyi' : t < 80 ? 'Güvenli' : 'Tam güven'; }
export function lineFor(id) { const c = charDef(id); const t = trust(id); return pick(c.lines[t < 35 ? 'dusuk' : t > 70 ? 'yuksek' : 'orta']); }

export function talkTo(id, opener) {
  const c = charDef(id);
  if (!G.chars[id].met) { G.chars[id].met = true; bus.emit('met', id); }
  let say = opener || lineFor(id);
  const p = panel({
    id: 'talk', title: c.name, sub: c.title, size: 'md',
    render(b, api) {
      const t = trust(id);
      b.append(h('div', { class: 'dlg' }, h('img', { class: 'portrait lg', src: portraits[id] }), h('div', { class: 'say', html: say })),
        h('div', { class: 'row', style: { margin: '10px 0 2px' } }, h('span', { class: 'muted' }, 'Güven'), h('div', { class: 'prog', style: { flex: 1, minWidth: '120px' } }, h('i', { style: { width: t + '%' } })), h('span', { class: 'tag gold' }, Math.round(t) + ' · ' + trustLabel(t))));
      const ch = h('div', { class: 'choices' });
      const add = (label, sub, fn, dis) => ch.append(h('button', { disabled: dis, onclick: async () => { const r = await fn(api, (s) => { say = s; api.refresh(); }); if (r === true) api.close(); else if (r !== 'keep') api.refresh(); } }, label, sub ? h('small', {}, sub) : null));
      for (const ap of pendingFor(id)) add('📝 ' + ap.spec.title, 'bekleyen onay · yüz yüze', () => { const d = resolveFace(ap); say = '“' + d.text + '”' + (d.ok ? ' <span class="tag good">Onaylandı</span>' : ' <span class="tag bad">Onaylanmadı</span>'); });
      for (const fn of EXTRA) for (const o of fn(id, api) || []) add(o.label, o.sub, async (a, setSay) => o.fn(a, setSay), o.disabled);
      const chatted = G.chars[id].chatDay === G.day;
      add('☕ Sohbet et', chatted ? 'bugün konuştunuz' : '10 dk · güven ↑', () => {
        G.chars[id].chatDay = G.day; time.skip(10); addTrust(id, 2, 'sohbet');
        say = lineFor(id); bus.emit('chatted', id);
      }, chatted);
      add('🌳 Aile', 'aile ağacı', () => { say = `<b>${c.name}</b> (${c.born})<br>${c.family}<br><br><span class="muted">${c.desc}</span>`; });
      add('👋 Görüşürüz', '', () => true);
      b.append(ch);
    },
  });
  return p;
}
