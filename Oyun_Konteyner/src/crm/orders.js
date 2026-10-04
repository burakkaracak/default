// Sipariş akışı: teklif → proforma → avans → ERP → üretim → sevkiyat → teslim → bakiye.
import { G, B, family, fabric, color as colorOf, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { earn, spend, toTL } from '../economy/economy.js';
import { createWO, woStars, woProgress } from '../factory/production.js';
import { cust, addSat, setLevel } from './customers.js';
import { addMessage } from './inbox.js';
import { chance, randi, rand, clamp } from '../core/util.js';
import { city } from '../world/logistics.js';
import { internal } from '../characters/comms.js';

export const STATUS = {
  teklif: 'Teklif', proforma: 'Proforma', avans: 'Avans bekleniyor', erp: 'ERP girişi', uretim: 'Üretimde', hazir: 'Sevke hazır',
  sevk_planlandi: 'Sevk planlandı', yolda: 'Yolda', teslim: 'Teslim edildi', tahsil: 'Bakiye bekleniyor', kapandi: 'Kapandı', iptal: 'İptal',
};
export const PAY = { pesin: 'Peşin', avans30: '%30 avans', vade: 'Vadeli (teslimden 15 gün sonra)' };
export const lineText = (l) => `${l.qty} × ${family(l.fam).name}${family(l.fam).fabricless ? '' : ' · ' + fabric(l.fabric).name}${family(l.fam).fabricless ? '' : ' · ' + colorOf(l.color).name}${l.size === 'ozel' ? ' · Özel ölçü' + (l.dims ? ' ' + l.dims : '') : ''}`;
export const orderTotal = (o) => o.lines.reduce((a, l) => a + l.price * l.qty, 0);

export function createOrder(spec) {
  const id = 'S-' + String(1000 + G.nextOrder++);
  const o = Object.assign({ id, cust: null, city: null, lines: [], cur: 'USD', incoterm: 'FOB', pay: 'avans30', status: 'proforma', paid: 0, created: G.day, promisedDay: G.day + 20, wos: [], erp: null, sample: false, fakeDone: false, notes: [] }, spec);
  o.total = orderTotal(o);
  G.orders.push(o);
  const c = cust(o.cust); if (c) { c.ordersN++; if (!o.sample) setLevel(c, 3, 'sipariş'); }
  bus.emit('orders');
  return o;
}
export const orderById = (id) => G.orders.find((o) => o.id === id);

export function sendProforma(o) {
  if (o.status !== 'proforma') return;
  if (o.pay === 'vade' || o.sample) { o.status = 'erp'; }
  else {
    o.status = 'avans';
    const c = city(o.city); const rel = c?.payRel ?? 0.85;
    o.advDay = G.day + (chance(rel) ? randi(1, 2) : randi(3, 5));
  }
  log(`${o.id} proforma gönderildi.`, 'info');
  bus.emit('orders');
}
export function startProduction(o, erpResult) {
  o.status = 'uretim';
  o.erp = Object.assign(o.erp || {}, erpResult || {});
  o.wos = [];
  for (const l of o.lines) {
    const spec = { order: o.id, purpose: o.sample ? 'sample' : 'order', fam: l.fam, fabric: l.fabric, color: l.color, size: l.size, qty: l.qty, erpClean: !!o.erp.clean, prio: o.prio || 0 };
    // ERP'de fark edilmeyen hatalı alan → yanlış ürün üretilir
    const wrong = o.erp.wrong?.find((w) => w.line === o.lines.indexOf(l));
    if (wrong) { spec[wrong.field] = wrong.value; spec.wrong = wrong; }
    const wo = createWO(spec);
    o.wos.push(wo.id);
  }
  bus.emit('orders');
}
export function orderProgress(o) {
  if (!o.wos?.length) return 0;
  let a = 0, n = 0; for (const id of o.wos) { const wo = G.factory.wos[id]; if (wo) { a += woProgress(wo) * wo.qty; n += wo.qty; } }
  return n ? a / n : 0;
}
export function orderStars(o) {
  let a = 0, n = 0; for (const id of o.wos || []) { const wo = G.factory.wos[id]; if (wo?.qN) { a += woStars(wo) * wo.qty; n += wo.qty; } }
  return n ? Math.round(a / n) : 0;
}
export function displayStatus(o) {
  if (o.status === 'uretim' && o.fakeDone) return 'Sevke hazır (ERP)';
  return STATUS[o.status] || o.status;
}

bus.on('woDone', (wo) => {
  const o = wo.order && orderById(wo.order); if (!o || o.status !== 'uretim') return;
  if (o.wos.every((id) => { const w = G.factory.wos[id]; return w && w.packed >= w.qty; })) {
    o.status = 'hazir'; o.fakeDone = false; o.readyDay = G.day;
    log(`${o.id} üretimi tamamlandı, sevke hazır.`, 'good');
    bus.emit('orderReady', o);
  }
});

// Gün başı: avans ödemeleri, bakiye tahsilatları, Harun'un "tamamlandı" işaretleri
bus.on('dayStart', () => {
  if (!G) return;
  for (const o of G.orders) {
    if (o.status === 'avans' && G.day >= o.advDay) {
      const share = o.pay === 'pesin' ? 1 : 0.3;
      const amt = o.total * share; o.paid += amt;
      earn(toTL(amt, o.cur), 'avans', o.id + ' avans');
      o.status = 'erp';
      internal({ from: 'harun', via: 'mail', subject: `${o.id} ${share === 1 ? 'ödemesi' : 'avansı'} hesaba geçti`, body: `${o.id} için ${o.cur} ${Math.round(amt).toLocaleString('tr-TR')} hesaba geçti, muhasebeye işledim. Siparişi Semanur'a açtır, üretime alalım.`, kind: 'finans' });
      addMessage({ ch: 'musteri', from: cust(o.cust)?.name || 'Müşteri', fromId: o.cust, subject: `Ödeme yapıldı: ${o.id}`, body: `Merhaba,\n\n${o.id} için ${share === 1 ? 'ödemenin tamamını' : '%30 avansı'} gönderdik. Dekont ektedir.\n\nÜretim planını bekliyoruz.`, kind: 'odeme', order: o.id });
      bus.emit('orders');
    }
    if (o.status === 'uretim' && !o.fakeDone && !o.harunCaught && !o.sample && orderProgress(o) > 0.45 && orderProgress(o) < 0.92 && chance(B.harunFakeDoneChance)) {
      o.fakeDone = true; o.fakeDay = G.day;
      bus.emit('harunFake', o);
    }
    if (o.status === 'tahsil' && G.day >= o.balDay) {
      const amt = o.total - o.paid; o.paid = o.total;
      earn(toTL(amt, o.cur), 'bakiye', o.id + ' bakiye');
      o.status = 'kapandi'; o.closedDay = G.day;
      log(`${o.id} bakiyesi tahsil edildi (${o.cur} ${Math.round(amt).toLocaleString('tr-TR')}). Sipariş kapandı.`, 'good');
      internal({ from: 'harun', via: 'mail', subject: `${o.id} bakiyesi tahsil edildi`, body: `${o.id} bakiyesi geldi (${o.cur} ${Math.round(amt).toLocaleString('tr-TR')}), hesap kapandı. Böyle müşteri iyidir.`, kind: 'finans' });
      bus.emit('orderClosed', o);
    }
  }
});

// Teslimat değerlendirmesi
bus.on('shipArrived', (sh) => {
  for (const id of sh.orders) {
    const o = orderById(id); if (!o) continue;
    o.status = 'teslim'; o.deliveredDay = G.day;
    const c = cust(o.cust);
    const stars = orderStars(o);
    const late = Math.max(0, G.day - o.promisedDay);
    const wrong = (o.wos || []).some((w) => G.factory.wos[w]?.wrong);
    o.result = { stars, late, wrong };
    let d = 8 + (stars - 3) * 6 - late * 2.5 - (wrong ? 18 : 0) + (o.informed ? 4 : 0);
    if (c) { addSat(c, d); c.delivered += o.sample ? 0 : 1; }
    bus.emit('delivered', o);
    // Ödeme takvimi
    const rel = city(o.city)?.payRel ?? 0.85;
    if (o.paid >= o.total - 0.01) { o.status = 'kapandi'; o.closedDay = G.day; }
    else { o.status = 'tahsil'; o.balDay = G.day + (o.pay === 'vade' ? 15 : 0) + (chance(rel) ? randi(0, 2) : randi(3, 6)); }
    if (o.sample) { o.status = 'kapandi'; }
    // Seviye ilerlemesi
    if (c && !o.sample && c.level === 3 && c.delivered >= 2 && c.sat >= 55) setLevel(c, 4, 'düzenli siparişler');
    if (c && c.level === 4 && c.delivered >= 5 && c.sat >= 78 && (G.chapter || 1) >= 5) bus.emit('strategicOffer', c);
  }
});
