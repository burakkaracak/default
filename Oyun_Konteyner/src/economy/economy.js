// Para, kur ve hammadde fiyatları. Şirket kasası TL; satışlar USD/EUR.
import { G, B, P, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { clamp, rand } from '../core/util.js';
import { time } from '../core/time.js';

export const CATS = { satis: 'Satış', avans: 'Avans', bakiye: 'Bakiye tahsilatı', maas: 'Maaşlar', hammadde: 'Hammadde', navlun: 'Navlun', yatirim: 'Yatırım', pazarlama: 'Pazarlama', fuar: 'Fuar', kredi: 'Kredi', faiz: 'Faiz', iade: 'İade / tazminat', egitim: 'Eğitim', numune: 'Numune', diger: 'Diğer', kur: 'Kur farkı' };

export function toTL(amount, cur) { return cur === 'TL' ? amount : amount * G.fx[cur]; }
export function fromTL(tl, cur) { return cur === 'TL' ? tl : tl / G.fx[cur]; }
export function earn(tl, cat = 'satis', note) {
  G.cash += tl; G.month.income += tl;
  (G.month.byCat ||= {})[cat] = ((G.month.byCat ||= {})[cat] || 0) + tl;
  G.today && (G.today.income += tl);
  bus.emit('cash', tl, note);
}
export function spend(tl, cat = 'diger', note) {
  G.cash -= tl; G.month.expense += tl;
  (G.month.byCat ||= {})[cat] = (G.month.byCat[cat] || 0) - tl;
  G.today && (G.today.expense += tl);
  bus.emit('cash', -tl, note);
}
export function canAfford(tl) { return G.cash >= tl; }

// Günlük kur: hafif TL değer kaybı + rastgele dalga; olaylar şok ekleyebilir.
export function stepFx() {
  const vol = B.fxDailyVolatility * (G.fxShock?.vol || 1);
  for (const c of ['USD', 'EUR']) {
    const drift = B.fxDailyDrift + (G.fxShock?.drift || 0);
    G.fx[c] *= Math.exp(drift + rand(-1, 1) * vol * 1.7);
  }
  // EUR/USD paritesi 1.08–1.25 aralığında kalsın
  const par = G.fx.EUR / G.fx.USD;
  if (par < 1.08) G.fx.EUR = G.fx.USD * 1.08; if (par > 1.25) G.fx.EUR = G.fx.USD * 1.25;
  if (G.fxShock && --G.fxShock.days <= 0) G.fxShock = null;
  G.fx.hist.push([G.day, +G.fx.USD.toFixed(3), +G.fx.EUR.toFixed(3)]);
  if (G.fx.hist.length > 240) G.fx.hist.shift();
}
export function stepMaterials() {
  for (const m of P.materials) {
    const base = m.priceTL * (G.fx.USD / B.fxStart.USD) ** 0.6; // ithal girdi kura kısmen bağlı
    let p = G.mat.price[m.id];
    const shock = G.matShock?.[m.id] || 0;
    p = p * Math.exp(rand(-1, 1) * 0.018 + 0.25 * Math.log(base / p) / 10 + shock);
    G.mat.price[m.id] = Math.round(p * 100) / 100;
    const h = G.mat.hist[m.id]; h.push(Math.round(p)); if (h.length > 120) h.shift();
  }
  if (G.matShock) { for (const k in G.matShock) { G.matShock[k] *= 0.5; if (Math.abs(G.matShock[k]) < 0.002) delete G.matShock[k]; } }
}
export function storageCap() { return 60 * (G.factory.areas.depo ? 2 : 1); } // m³
export function storageUsed() { let v = 0; for (const m of P.materials) v += (G.mat.stock[m.id] || 0) * m.vol * (m.id === 'kereste' ? 14 : 1) / 10; return v; }
export function buyMaterial(id, qty, discount = 0) {
  const price = G.mat.price[id] * qty * (1 - discount);
  if (G.cash < price) return false;
  spend(price, 'hammadde', `${qty} birim ${id}`);
  G.mat.stock[id] = (G.mat.stock[id] || 0) + qty;
  bus.emit('materials');
  return true;
}

export function monthEndSettle(salaries) {
  spend(salaries, 'maas', 'Aylık maaşlar');
  // Kredi faizleri ve taksitler
  for (const l of G.loans || []) {
    const interest = l.left * l.rate; spend(interest, 'faiz', 'Kredi faizi');
    const pay = Math.min(l.left, l.amount / l.months); spend(pay, 'kredi', 'Kredi taksiti'); l.left -= pay;
  }
  G.loans = (G.loans || []).filter((l) => l.left > 1);
  G.month.hist.push({ m: time.monthNo(), name: time.monthName(), income: G.month.income, expense: G.month.expense, cash: G.cash, byCat: G.month.byCat || {} });
  if (G.month.hist.length > 36) G.month.hist.shift();
  const res = { income: G.month.income, expense: G.month.expense, byCat: G.month.byCat || {} };
  G.month.income = 0; G.month.expense = 0; G.month.byCat = {};
  return res;
}
export function takeLoan(amount, months = 6, rate = B.loanRateMonthly, rescue = false) {
  (G.loans ||= []).push({ amount, left: amount, months, rate, rescue, day: G.day });
  earn(amount, 'kredi', rescue ? 'Kurtarma kredisi' : 'Banka kredisi');
  log(`${rescue ? 'Kurtarma kredisi' : 'Kredi'} alındı: ₺${Math.round(amount).toLocaleString('tr-TR')}`, 'warn');
}
export function receivables() {
  let tot = 0;
  for (const o of G.orders) if (!['kapandi', 'iptal', 'teklif'].includes(o.status)) tot += toTL(o.total - (o.paid || 0), o.cur);
  return tot;
}
