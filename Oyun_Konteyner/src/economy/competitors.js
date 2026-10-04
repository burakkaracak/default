// NPC rakipler: aynı pazarlara girer, müşteri kapar, fiyat savaşı başlatabilir. Pazar payı her ay güncellenir.
import { G, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { chance, pick, clamp, rand } from '../core/util.js';
import { addMessage } from '../crm/inbox.js';
import { internal } from '../characters/comms.js';
import { cust } from '../crm/customers.js';
import COMP from '../data/competitors.json';
import CITIES from '../data/cities.json';

export const COMPETITORS = COMP.list;
export const activeComps = () => COMPETITORS.filter((c) => G.mode === 'free' || (G.chapter || 1) >= c.chapter);

export function marketShare(region) {
  // Bizim payımız: o bölgedeki teslimler ve itibardan
  const ours = Math.min(45, 2 + (G.stats.regionShip?.[region] || 0) * 2.5 + avgRep(region) / 6);
  const comps = activeComps().filter((c) => c.regions.includes(region)).map((c) => ({ ...c, s: (G.compShare?.[c.id]?.[region] ?? c.share) }));
  const tot = ours + comps.reduce((a, c) => a + c.s, 0) + 30;
  return [{ name: 'Live & Feel (biz)', color: '#9C905C', s: ours / tot }, ...comps.map((c) => ({ name: c.name, color: c.color, s: c.s / tot })), { name: 'Diğerleri', color: '#D8CCB6', s: 30 / tot }];
}
function avgRep(region) {
  const cs = CITIES.list.filter((c) => c.region === region); if (!cs.length) return 0;
  return cs.reduce((a, c) => a + (G.reputation?.[c.country] ?? 10), 0) / cs.length;
}
bus.on('monthStart', () => {
  if (!G) return;
  G.compShare ||= {}; G.shareHist ||= [];
  for (const c of activeComps()) {
    G.compShare[c.id] ||= {};
    for (const r of c.regions) G.compShare[c.id][r] = clamp((G.compShare[c.id][r] ?? c.share) + rand(-2, 2.5) - (G.stats.regionShip?.[r] || 0) * 0.15, 4, 45);
    // Fiyat savaşı
    if (chance(c.aggression * 0.35)) {
      const cities = CITIES.list.filter((x) => c.regions.includes(x.region) && !x.owner && (G.openCities || []).includes(x.id));
      if (cities.length) {
        const ct = pick(cities); G.priceWar ||= {}; G.priceWar[ct.id] = { by: c.id, until: G.day + 20 };
        internal({ from: 'bunyamin', via: 'wa', subject: `Fiyat savaşı: ${ct.name}`, body: `${c.name} (${c.type}) ${ct.name}'da fiyatları kırdı. Müşteriler bu ay daha fazla iskonto isteyecek. Panik yok; kaliteyi ve termini öne çıkaralım, ek iskonto gerekirse babamla konuşuruz.`, kind: 'rakip' });
      }
    }
    // Müşteri kapma
    if (chance(c.aggression * 0.25)) {
      const victims = Object.values(G.customers).filter((x) => x.owner === 'burak' && x.level >= 1 && x.level <= 3 && x.sat < 50 && c.regions.includes(CITIES.list.find((k) => k.id === x.city)?.region));
      if (victims.length) { const v = pick(victims); v.cooldown = G.day + 15; v.sat = Math.max(0, v.sat - 10); addMessage({ ch: 'musteri', from: v.name, fromId: v.id, subject: 'Bu sezon için...', body: `Bu sezon ${c.name} ile çalışmaya karar verdik. Fiyatları daha uygundu. İlişkimizi kesmek istemeyiz, ileride tekrar konuşalım.`, kind: 'rakip' }); }
    }
  }
  if (G.priceWar) for (const k in G.priceWar) if (G.priceWar[k].until < G.day) delete G.priceWar[k];
  const snap = { m: G.day }; for (const r of ['kafkasya', 'balkanlar', 'avrupa', 'ortaasya', 'uzakdogu']) snap[r] = marketShare(r)[0].s; G.shareHist.push(snap); if (G.shareHist.length > 24) G.shareHist.shift();
});
