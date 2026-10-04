// Fiyatlama: liste fiyatı (USD) → sipariş para birimi; birim maliyet (TL) ve kâr marjı.
import { G, P, family, fabric } from '../core/state.js';
import CITIES from '../data/cities.json';
import { matNeeds } from '../factory/production.js';

export function listUSD(l, cityId) {
  const f = family(l.fam), fb = fabric(l.fabric), sz = P.sizes.find((s) => s.id === l.size);
  const c = CITIES.list.find((x) => x.id === cityId);
  let p = f.priceUSD * (f.fabricless ? 1 : fb?.priceMult || 1) * (sz?.priceMult || 1) * (c?.priceLevel || 1);
  if (G.trend && (G.trend.fabric === l.fabric || G.trend.fam === l.fam)) p *= 1.05;
  p *= 1 + (G.brandPremium || 0);
  return p;
}
export const usdTo = (usd, cur) => cur === 'USD' ? usd : cur === 'EUR' ? usd * G.fx.USD / G.fx.EUR : usd * G.fx.USD;
export const toUSD = (amt, cur) => cur === 'USD' ? amt : cur === 'EUR' ? amt * G.fx.EUR / G.fx.USD : amt / G.fx.USD;
export function listPrice(l, cityId, cur) { return usdTo(listUSD(l, cityId), cur); }
// Birim maliyet: hammadde (güncel fiyat) + işçilik payı
export function unitCostTL(l) {
  const need = matNeeds({ fam: l.fam, fabric: l.fabric, size: l.size });
  let tl = 0; for (const k in need) tl += need[k] * (G.mat.price[k] || 0);
  const mins = family(l.fam).stations.reduce((a, s) => a + s[1], 0) * (l.size === 'ozel' ? 1.45 : 1);
  return tl + mins * 7.5;
}
export function marginOf(lines, cur) {
  let rev = 0, cost = 0;
  for (const l of lines) { rev += l.price * l.qty * (cur === 'USD' ? G.fx.USD : G.fx.EUR); cost += unitCostTL(l) * l.qty; }
  return { revTL: rev, costTL: cost, margin: rev > 0 ? (rev - cost) / rev : 0 };
}
