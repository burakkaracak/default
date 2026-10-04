// Rastgele olaylar, sezonluk trendler ve başarımlar.
import { G, log } from './state.js';
import { bus } from './bus.js';
import { time } from './time.js';
import { chance, pick, clamp } from './util.js';
import { toast, h, alertBox, confetti } from '../ui/dom.js';
import { addMessage } from '../crm/inbox.js';
import { internal } from '../characters/comms.js';
import { trust } from '../characters/approvals.js';
import { showroomBeauty } from '../locations/store.js';
import EV from '../data/events.json';
import ACH from '../data/achievements.json';

bus.on('dayStart', () => {
  if (!G) return;
  for (const e of EV.list) {
    if ((G.chapter || 1) < (e.minChapter || 1) || !chance(e.chance)) continue;
    const ef = e.effect;
    // İbrahim güveni yüksekse fiyat uyarısını önceden verir
    if (e.warnBy === 'ibrahim' && trust('ibrahim') > 55 && ef.matShock) {
      internal({ from: 'ibrahim', via: 'call', subject: 'Fiyat haberi', body: `duyduğuma göre: ${e.text} ${Object.values(ef.matShock)[0] > 0 ? 'Bence şimdi biraz stok alalım.' : 'Bu hafta alım yapmak mantıklı.'}`, kind: 'uyari' });
      G.flags.ibrahimDeal = Object.fromEntries(Object.keys(ef.matShock).map((k) => [k, G.day + 3]));
    }
    if (ef.fxShock) { G.fxShock = { ...ef.fxShock }; G.flags.fxCrisisDay = G.day; }
    if (ef.matShock) { G.matShock ||= {}; for (const k in ef.matShock) G.matShock[k] = (G.matShock[k] || 0) + ef.matShock[k]; }
    if (ef.motivation) for (const w of G.factory.staff) w.motiv = clamp(w.motiv + ef.motivation, 0.55, 1.1);
    if (ef.repAll) { G.reputation ||= {}; for (const k in G.reputation) G.reputation[k] = clamp(G.reputation[k] + ef.repAll, 0, 100); }
    addMessage({ ch: 'ic', from: 'Haber bülteni', subject: e.title, body: e.text, kind: 'haber' });
    log(e.title, 'info');
    break;
  }
});
// Sezon başında trend
bus.on('monthStart', () => {
  if (!G) return;
  if (time.monthIndex() % 3 === 2 || !G.trend) {
    const t = pick(EV.trends.filter((x) => x.id !== G.trend?.id));
    G.trend = t;
    addMessage({ ch: 'ic', from: 'Tasarım Stüdyosu', subject: `Sezon trendi: ${t.name}`, body: t.text + '\n\nTrende uyan ürünlerin teşhiri, teklifleri ve Instagram paylaşımları daha çok ilgi görür.', kind: 'trend' });
  }
});

// ---------- Başarımlar ----------
export function unlockAch(id) {
  G.ach ||= {};
  if (G.ach[id]) return;
  const a = ACH.list.find((x) => x.id === id); if (!a) return;
  G.ach[id] = G.day;
  toast(`🏆 Başarım: ${a.icon} ${a.name}`, 'good', 6000); bus.emit('sfx', 'sparkle'); confetti(40);
}
bus.on('achv', unlockAch);
function checkAch() {
  if (!G) return;
  for (const a of ACH.list) {
    if (G.ach?.[a.id] || !a.check) continue;
    const c = a.check;
    if (c.stat && (G.stats[c.stat] || 0) >= c.n) unlockAch(a.id);
    if (c.custLevel && Object.values(G.customers || {}).filter((x) => x.level >= c.custLevel && x.owner !== 'bunyamin').length >= c.n) unlockAch(a.id);
  }
  if (showroomBeauty() >= 60) unlockAch('beauty60');
  const fam = ['davut', 'harun', 'ibrahim', 'bunyamin', 'busra', 'semanur'];
  if (fam.every((id) => G.chars[id].chatDay === G.day)) unlockAch('family');
}
bus.on('hour', checkAch); bus.on('stat', () => { if (Math.random() < 0.3) checkAch(); }); bus.on('chatted', checkAch); bus.on('showroomChanged', checkAch);
bus.on('containerLoaded', (sh, fill) => { if (sh.mode === 'c40' && fill >= 0.85) unlockAch('full40'); if (/c40/.test(sh.mode) && fill >= 0.8) { G.flags.fill80 = true; bus.emit('flag', 'fill80'); } });
bus.on('semanurPraise', () => unlockAch('semanurPraise'));
bus.on('approval', () => {});
bus.on('cash', (d, note) => { if (d > 0 && G?.flags.fxCrisisDay && G.day - G.flags.fxCrisisDay <= 6 && /avans|bakiye/.test(note || '')) unlockAch('fxCrisis'); });
bus.on('renderAchievements', (b) => {
  const n = Object.keys(G.ach || {}).length;
  b.append(h('p', { class: 'muted' }, `${n} / ${ACH.list.length} başarım`));
  const g = h('div', { class: 'grid2' });
  for (const a of ACH.list) g.append(h('div', { class: 'ach' + (G.ach?.[a.id] ? '' : ' off') }, h('div', { class: 'em' }, a.icon), h('div', {}, h('b', {}, a.name), h('div', { class: 'muted' }, a.desc + (G.ach?.[a.id] ? ` · ${time.shortDate(G.ach[a.id])}` : '')))));
  b.append(g);
});
