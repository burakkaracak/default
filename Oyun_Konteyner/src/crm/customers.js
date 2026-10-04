// Müşteri firmaları: ilişki seviyesi, memnuniyet, korumalı hesaplar.
import { G, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { clamp } from '../core/util.js';
import CUST from '../data/customers.json';
import CITIES from '../data/cities.json';

export const LEVELS = ['Soğuk', 'İlgili', 'Numune istedi', 'İlk sipariş', 'Düzenli müşteri', 'Stratejik ortak'];
export const LEVEL_DESC = [
  'Henüz tanışmadınız. İlk maili gönder.',
  'Katalog ve fiyat listesi isteyebilir.',
  'Numune üretip göndermen gerekiyor.',
  'İlk siparişi verdi. Zamanında ve kaliteli teslim et.',
  'Düzenli sipariş verir; daha büyük ve özel ölçü işler gelir.',
  'Proje ortaklığı, büyük hacim ve yurt dışı showroom fırsatı.',
];
export const TYPES = CUST.types;
export const cityOf = (id) => CITIES.list.find((c) => c.id === id);

export function initCustomers(g) {
  g.customers = {};
  CUST.firms.forEach((f, i) => {
    const id = 'c' + (i + 1);
    const c = cityOf(f.city);
    g.customers[id] = Object.assign({}, f, { id, level: 0, sat: 50, owner: c?.owner || 'burak', delivered: 0, ordersN: 0, lastContact: null, waiting: null, cooldown: 0, notes: [] });
  });
}
export const cust = (id) => G.customers[id];
export function custByCity(cityId) { return Object.values(G.customers).filter((c) => c.city === cityId); }
export function setLevel(c, lv, why) {
  if (lv <= c.level) return;
  c.level = Math.min(5, lv);
  log(`${c.name}: ilişki seviyesi → ${LEVELS[c.level]}${why ? ' (' + why + ')' : ''}`, 'good');
  bus.emit('custLevel', c);
}
export function addSat(c, d) { c.sat = clamp(c.sat + d, 0, 100); }
export const isProtected = (c) => c.owner === 'bunyamin';
export function cityOpen(cityId) {
  const c = cityOf(cityId); if (!c) return false;
  if (G.mode === 'free') return true;
  return (G.chapter || 1) >= c.chapter || (G.openCities || []).includes(cityId);
}
