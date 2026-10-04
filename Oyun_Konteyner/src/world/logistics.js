// Sevkiyat: mod seçimi, navlun, yükleme (oyuncu ya da otomatik), yolculuk, teslim.
import { G, family, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { spend, toTL } from '../economy/economy.js';
import { boxesFor, autoPack, volumeM3 } from './container.js';
import CITIES from '../data/cities.json';
import { rand, randi } from '../core/util.js';

export const city = (id) => CITIES.list.find((c) => c.id === id);
export const MODES = CITIES.modes;
export const INCOTERMS = CITIES.incoterms;

export function freightUSD(cityId, mode, vol) {
  const c = city(cityId); const L = c?.logistics?.[mode]; if (!L) return null;
  return MODES[mode].perM3 ? Math.max(1, vol) * L[1] : L[1];
}
export function transitDays(cityId, mode) { return city(cityId)?.logistics?.[mode]?.[0] ?? null; }
export function ourFreightShare(order) { return INCOTERMS[order.incoterm]?.freight ?? 1; }

// Sevkiyat oluştur. how: 'manual' (mini oyun sonucu fill verilir) | 'auto' (ertesi gün depocu yükler)
export function createShipment({ orderIds, mode, fill = null, how = 'auto' }) {
  const orders = orderIds.map((id) => G.orders.find((o) => o.id === id));
  const cityId = orders[0].city;
  const boxes = boxesFor(orderIds); const vol = volumeM3(boxes);
  const usd = freightUSD(cityId, mode, vol);
  const share = orders.reduce((a, o) => a + ourFreightShare(o), 0) / orders.length;
  const id = 'SV-' + String(G.nextShip++).padStart(3, '0');
  const sh = { id, orders: orderIds, mode, city: cityId, vol: +vol.toFixed(1), usd, ourUSD: usd * share, fill, how, status: how === 'manual' ? 'yolda' : 'bekliyor', booked: G.day, depart: how === 'manual' ? G.day : G.day + 1, arrive: null };
  G.shipments.push(sh);
  for (const o of orders) { o.ship = id; o.status = how === 'manual' ? 'yolda' : 'sevk_planlandi'; }
  if (how === 'manual') depart(sh);
  bus.emit('shipments');
  return sh;
}
function depart(sh) {
  sh.status = 'yolda'; sh.depart = G.day;
  sh.arrive = G.day + transitDays(sh.city, sh.mode) * (G.flags.fastLogistics ? 0.85 : 1) | 0;
  if (sh.ourUSD > 0) spend(toTL(sh.ourUSD, 'USD'), 'navlun', 'Navlun ' + sh.id);
  for (const id of sh.orders) {
    const o = G.orders.find((x) => x.id === id); o.status = 'yolda'; o.shippedDay = G.day;
    for (const w of o.wos || []) { const wo = G.factory.wos[w]; if (wo) wo.shipped = wo.packed; }
  }
  G.stats.shipped += sh.orders.length; G.stats.containers += /c20|c40/.test(sh.mode) ? 1 : 0;
  log(`${sh.id} yola çıktı → ${city(sh.city).name} (${MODES[sh.mode].name}). Varış: ${time.shortDate(sh.arrive)}`, 'good');
  bus.emit('shipDeparted', sh);
}
export function orderReady(o) { return (o.wos || []).length > 0 && o.wos.every((w) => { const wo = G.factory.wos[w]; return wo && wo.packed >= wo.qty; }); }

// Ertesi sabah: otomatik yüklenecek sevkiyatlar. Harun'un "bitti" dediği ama bitmeyen sipariş burada ortaya çıkar.
bus.on('dayStart', () => {
  if (!G) return;
  for (const sh of G.shipments) {
    if (sh.status !== 'bekliyor' || sh.depart > G.day) continue;
    const notReady = sh.orders.map((id) => G.orders.find((o) => o.id === id)).filter((o) => !orderReady(o));
    if (notReady.length) {
      sh.depart = G.day + randi(2, 4); sh.delays = (sh.delays || 0) + 1;
      for (const o of notReady) { o.status = 'uretim'; o.fakeDone = false; bus.emit('shipFailed', o, sh); }
      continue;
    }
    const boxes = boxesFor(sh.orders);
    const cap = MODES[sh.mode].cap;
    if (cap) { const r = autoPack(cap, boxes, false); sh.fill = r.fill; if (r.left) { sh.fill = r.fill; sh.overflow = r.left; } }
    depart(sh);
  }
  for (const sh of G.shipments) if (sh.status === 'yolda' && sh.arrive <= G.day) { sh.status = 'teslim'; bus.emit('shipArrived', sh); }
});
