// Tasarım stüdyosu: koleksiyon araştırma ağacı. Tasarımcılar her gün araştırma puanı üretir.
import { h, panel, toast, progress, confetti } from '../ui/dom.js';
import { G, family, fabric, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import RES from '../data/research.json';

export function researchRate() {
  const des = G.factory.staff.filter((w) => w.role === 'tasarimci');
  return (G.factory.areas.studyo ? 2 : 0.5) + des.reduce((a, w) => a + 1 + w.skill * 0.6, 0);
}
bus.on('dayEnd', () => {
  if (!G) return;
  G.research ||= { pts: 0, done: {}, cur: null, qualityBonus: 0 };
  G.research.pts += researchRate();
  const cur = RES.list.find((r) => r.id === G.research.cur);
  if (cur && G.research.pts >= cur.cost) { G.research.pts -= cur.cost; complete(cur); G.research.cur = null; }
});
function complete(r) {
  G.research.done[r.id] = true;
  const u = r.unlock;
  if (u.family && !G.open.families.includes(u.family)) G.open.families.push(u.family);
  if (u.fabric && !G.open.fabrics.includes(u.fabric)) G.open.fabrics.push(u.fabric);
  if (u.bonus === 'quality') G.research.qualityBonus = (G.research.qualityBonus || 0) + 0.3;
  if (u.bonus === 'brand') G.brandPremium = (G.brandPremium || 0) + 0.06;
  log(`Araştırma tamamlandı: ${r.name}`, 'good');
  toast(`🎨 Tasarım stüdyosu: ${r.name} tamamlandı! ${r.desc}`, 'good', 6000); bus.emit('sfx', 'success');
  bus.emit('researchDone', r);
}
export function studioPanel() {
  G.research ||= { pts: 0, done: {}, cur: null, qualityBonus: 0 };
  panel({
    id: 'studio', title: 'Tasarım Stüdyosu', icon: '🎨', size: 'md', sub: () => `Araştırma puanı: ${Math.floor(G.research.pts)} · günlük +${researchRate().toFixed(1)}`,
    render(b, api) {
      if (!G.factory.areas.studyo) b.append(h('p', { class: 'tag warn' }, 'Stüdyo alanı açık değil: araştırma çok yavaş. Fabrika → Genişleme → Tasarım Stüdyosu.'));
      if (!G.factory.staff.some((w) => w.role === 'tasarimci')) b.append(h('p', { class: 'muted' }, 'İç mimar / tasarımcı işe alırsan araştırma hızlanır.'));
      if (G.trend) b.append(h('div', { class: 'card', style: { margin: '6px 0' } }, h('b', {}, '📈 Sezon trendi: ' + G.trend.name), h('div', { class: 'muted' }, G.trend.text)));
      for (const r of RES.list) {
        const done = G.research.done[r.id]; const locked = (r.needs || []).some((n) => !G.research.done[n]);
        const cur = G.research.cur === r.id;
        b.append(h('div', { class: 'list-item', style: { opacity: locked ? 0.5 : 1 } }, h('div', { class: 'grow' }, h('div', { class: 't1' }, (done ? '✓ ' : locked ? '🔒 ' : '') + r.name + ` · ${r.cost} puan`), h('div', { class: 't2', style: { whiteSpace: 'normal' } }, r.desc + (locked ? ' (önce: ' + r.needs.map((n) => RES.list.find((x) => x.id === n).name).join(', ') + ')' : '')), cur ? progress(G.research.pts / r.cost) : null),
          done ? h('span', { class: 'tag good' }, 'Açık') : cur ? h('span', { class: 'tag gold' }, 'Araştırılıyor') : h('button', { class: 'btn ghost sm', disabled: locked, onclick: () => { G.research.cur = r.id; api.refresh(); } }, 'Araştır')));
      }
    },
  });
}
