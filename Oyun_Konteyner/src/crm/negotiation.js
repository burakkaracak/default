// Teklif ve pazarlık: fiyat (indirim), teslim süresi, ödeme şekli, teslim şekli (Incoterm) arasında denge.
import { h, panel, toast, choose, progress } from '../ui/dom.js';
import { G, B, P, family, fabric, color as colorOf, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { clamp, rand, chance, fmtCur, fmtTLk, pct, fmtInt } from '../core/util.js';
import { listPrice, unitCostTL, usdTo } from '../economy/pricing.js';
import { estimateDays } from '../factory/production.js';
import { cust, LEVELS, TYPES, addSat } from './customers.js';
import { createOrder, lineText, PAY } from './orders.js';
import { city, INCOTERMS, MODES, transitDays } from '../world/logistics.js';
import { requestApproval, harunLimit, isHere, addTrust, trust } from '../characters/approvals.js';
import { addMessage } from './inbox.js';
import { conf } from '../core/confidence.js';
import { stat } from '../core/story.js';

// Müşterinin gizli beklentileri
export function makeRFQ(c, lines, extra = {}) {
  const cc = city(c.city);
  const ps = c.priceSens ?? 0.5;
  return Object.assign({
    cust: c.id, city: c.city, lines, cur: cc.cur,
    target: clamp(0.03 + ps * 0.11 + rand(-0.02, 0.03) + (G.priceWar?.[c.city] ? 0.04 : 0), 0, 0.22),
    wantDays: Math.round(20 + rand(0, 14) + (transitDays(c.city, bestMode(c.city)) || 10)),
    payPref: c.type === 'distributor' ? 'vade' : c.type === 'otel' ? 'avans30' : chance(0.6) ? 'avans30' : 'vade',
    incoPref: c.type === 'distributor' ? 'EXW' : c.size === 1 || c.type === 'icmimar' ? 'CIF' : 'FOB',
    patience: 3, round: 0, created: G.day,
  }, extra);
}
export function bestMode(cityId) { const L = city(cityId)?.logistics || {}; return L.c40 ? 'c40' : L.tir ? 'tir' : Object.keys(L)[0]; }

function evaluate(rfq, offer) {
  const c = cust(rfq.cust);
  const inc = INCOTERMS[offer.inco];
  const effDisc = offer.disc - inc.priceAdj; // CIF'te daha yüksek fiyat kabul edilir
  const rep = (G.reputation?.[city(rfq.city).country] || 0) / 100;
  const parts = {
    price: (effDisc - rfq.target) * 7,
    days: offer.days <= rfq.wantDays ? 0.06 : -(offer.days - rfq.wantDays) * 0.022,
    pay: offer.pay === rfq.payPref ? 0.06 : offer.pay === 'pesin' ? -0.12 : rfq.payPref === 'vade' && offer.pay === 'avans30' ? -0.06 : 0,
    inco: offer.inco === rfq.incoPref ? 0.05 : -0.03,
    rel: (c.sat - 50) / 400 + rep * 0.15 + (G.showroomBonus || 0),
  };
  if (rfq.lines.some((l) => l.size === 'ozel')) parts.days -= 0.02;
  const u = Object.values(parts).reduce((a, b) => a + b, 0) + rand(-0.03, 0.03);
  return { u, parts };
}
function counterText(rfq, parts, offer) {
  const worst = Object.entries(parts).filter(([k]) => k !== 'rel').sort((a, b) => a[1] - b[1])[0][0];
  const c = cust(rfq.cust);
  if (worst === 'price') { const need = Math.max(1, Math.round((rfq.target - offer.disc + INCOTERMS[offer.inco].priceAdj) * 100 + rand(0, 2))); return { k: 'price', t: c.comm === 'kisa' ? `Fiyat yüksek. %${need} daha iner misiniz?` : `Ürünler çok güzel ama bütçemiz biraz dar. %${need} civarı ek bir indirim mümkün olur mu?` }; }
  if (worst === 'days') return { k: 'days', t: `Teslim süresi uzun geldi. En geç ${rfq.wantDays} gün içinde elimizde olmalı.` };
  if (worst === 'pay') return { k: 'pay', t: rfq.payPref === 'vade' ? 'Bizim çalışma şeklimiz vadeli. Teslimden sonra ödemeyi tercih ederiz.' : 'Peşin ödeme bizim için zor; %30 avansla ilerleyelim.' };
  return { k: 'inco', t: `Teslim şekli olarak ${INCOTERMS[rfq.incoPref].name} bizim için daha uygun.` };
}

export function offerPanel(rfq, msg, onDone) {
  const c = cust(rfq.cust), cc = city(rfq.city);
  const off = Object.assign({ disc: 0, days: rfq.wantDays + 6, pay: 'avans30', inco: 'FOB', cur: rfq.cur }, rfq.lastOffer || {});
  let reply = rfq.reply || null, approvedDisc = rfq.approvedDisc ?? -1, approvedVade = !!rfq.approvedVade, bunReviewed = !!rfq.bunReviewed;
  const t0 = performance.now();
  conf.startDecision('offer');
  const p = panel({
    id: 'offer', title: 'Teklif ve pazarlık', icon: '💬', size: 'md', sub: `${c.name} · ${cc.flag} ${cc.name}`,
    onClose: () => { conf.endDecision(); rfq.lastOffer = off; rfq.approvedDisc = approvedDisc; rfq.approvedVade = approvedVade; rfq.bunReviewed = bunReviewed; },
    render(b, api) {
      const lp = rfq.lines.map((l) => listPrice(l, rfq.city, off.cur));
      const unit = lp.map((x) => x * (1 - off.disc));
      const total = rfq.lines.reduce((a, l, i) => a + unit[i] * l.qty, 0);
      const fxr = off.cur === 'USD' ? G.fx.USD : G.fx.EUR;
      const cost = rfq.lines.reduce((a, l) => a + unitCostTL(l) * l.qty, 0);
      const mode = bestMode(rfq.city); const tr = transitDays(rfq.city, mode);
      const freightTL = (cc.logistics[mode]?.[1] || 0) * G.fx.USD * INCOTERMS[off.inco].freight;
      const margin = (total * fxr - cost - freightTL) / (total * fxr);
      b.append(h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', {}, c.name), h('div', { class: 'muted' }, `${TYPES[c.type].icon} ${TYPES[c.type].name} · ${['', 'küçük', 'orta', 'büyük'][c.size]} · tarz: ${c.style}`),
          h('div', { class: 'muted' }, `İlişki: ${LEVELS[c.level]} · Fiyat hassasiyeti: ${c.priceSens > 0.6 ? 'yüksek' : c.priceSens > 0.35 ? 'orta' : 'düşük'} · İletişim: ${c.comm}`),
          h('div', { class: 'muted' }, `Kur: 1 USD = ₺${G.fx.USD.toFixed(2)} · 1 EUR = ₺${G.fx.EUR.toFixed(2)}`)),
        h('div', { class: 'card' }, h('h3', {}, 'İstenen'), ...rfq.lines.map((l) => h('div', {}, lineText(l))), h('div', { class: 'muted' }, `İstenen teslim: ~${rfq.wantDays} gün içinde`))));
      // Kalemler
      const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Ürün'), h('th', {}, 'Adet'), h('th', {}, 'Liste'), h('th', {}, 'Teklif'), h('th', {}, 'Maliyet')));
      rfq.lines.forEach((l, i) => t.append(h('tr', {}, h('td', {}, family(l.fam).name + (l.size === 'ozel' ? ' (özel)' : '')), h('td', {}, l.qty), h('td', {}, fmtCur(lp[i], off.cur)), h('td', {}, h('b', {}, fmtCur(unit[i], off.cur))), h('td', { class: 'muted' }, fmtCur(unitCostTL(l) / fxr, off.cur)))));
      b.append(h('div', { class: 'sec' }, 'Kalemler (aynı para biriminde, kur bilgisiyle)'), t);
      // Kontroller
      const lim = harunLimit();
      const freeLim = conf.has('smallDiscount') ? 0.05 : 0;
      const ctr = h('div', { class: 'formgrid', style: { marginTop: '10px' } });
      const rng = h('input', { type: 'range', min: 0, max: 25, step: 1, value: Math.round(off.disc * 100), oninput: (e) => { off.disc = +e.target.value / 100; api.refresh(); } });
      ctr.append(h('b', {}, `İndirim %${Math.round(off.disc * 100)}`), h('div', {}, rng, h('div', { class: 'muted' }, off.disc <= freeLim ? (freeLim ? 'Özgüven yetkinle onaysız verebilirsin' : 'İndirimsiz liste fiyatı') : approvedDisc >= off.disc ? '✓ Harun Bey onayladı' : `Harun Bey onayı gerekir (tavanı ~%${Math.round(lim * 100)})`)));
      const dIn = h('input', { type: 'number', min: 5, max: 120, value: off.days, onchange: (e) => { off.days = Math.max(5, +e.target.value || 30); api.refresh(); } });
      const ter = rfq.termin;
      ctr.append(h('b', {}, 'Teslim (gün)'), h('div', {}, dIn, h('div', { class: 'muted' }, ter ? `Serkan: üretim ${ter.exact ? 'kesin' : '~tahmini'} ${ter.days} gün + yol ${tr} gün (${MODES[mode].name}) = ${ter.days + tr} gün` : `Termin bilinmiyor! Yol: ${tr} gün. Serkan Bey'e sor:`),
        h('div', { class: 'row', style: { marginTop: '4px' } }, h('button', { class: 'btn ghost sm', onclick: () => askTermin(rfq, 'telefon', api) }, '📞 Telefonla sor (tahmini)'), h('button', { class: 'btn ghost sm', disabled: !isHere('serkan'), onclick: () => askTermin(rfq, 'yuz', api) }, isHere('serkan') ? '🤝 Yüz yüze (kesin)' : '🤝 Kesin termin: fabrikada'))));
      const sel = (val, opts, fn) => { const s = h('select', { onchange: (e) => { fn(e.target.value); api.refresh(); } }); for (const [v, l] of opts) s.append(h('option', { value: v, selected: v === val }, l)); return s; };
      ctr.append(h('b', {}, 'Ödeme'), h('div', {}, sel(off.pay, Object.entries(PAY), (v) => (off.pay = v)), off.pay === 'vade' ? h('div', { class: 'muted' }, approvedVade ? '✓ Harun Bey vadeyi onayladı' : 'Vadeli satış Harun Bey onayı ister') : null));
      ctr.append(h('b', {}, 'Teslim şekli'), h('div', {}, sel(off.inco, Object.entries(INCOTERMS).map(([k, v]) => [k, v.name]), (v) => (off.inco = v)), h('div', { class: 'muted' }, INCOTERMS[off.inco].desc)));
      ctr.append(h('b', {}, 'Para birimi'), sel(off.cur, [['USD', 'USD'], ['EUR', 'EUR']], (v) => (off.cur = v)));
      b.append(ctr);
      b.append(h('div', { class: 'card', style: { marginTop: '10px' } }, h('div', { class: 'row' }, h('b', { style: { flex: 1 } }, `Toplam: ${fmtCur(total, off.cur)}`), h('span', { class: 'muted' }, `≈ ${fmtTLk(total * fxr)}`)),
        h('div', { class: 'row' }, h('span', { class: 'muted', style: { flex: 1 } }, `Tahmini kâr marjı (navlun payı dahil)`), h('b', { style: { color: margin < 0.1 ? 'var(--bad)' : 'var(--good)' } }, pct(margin))),
        total > 40000 && off.cur === 'USD' || total > 36000 ? h('div', { class: 'muted' }, bunReviewed ? '✓ Bünyamin teklifi gözden geçirdi' : 'Büyük teklif: Bünyamin\'in gözden geçirmesi gerekir') : null));
      if (reply) b.append(h('div', { class: 'dlg', style: { marginTop: '10px' } }, h('div', { class: 'portrait', style: { display: 'grid', placeItems: 'center', fontSize: '20px' } }, '🏬'), h('div', { class: 'say' }, h('b', {}, c.contact + ': '), reply)));
      b.append(h('div', { class: 'muted', style: { marginTop: '6px' } }, `Pazarlık turu: ${rfq.round}/3 · Müşterinin sabrı: ${'●'.repeat(rfq.patience)}${'○'.repeat(Math.max(0, 3 - rfq.patience))}`));
      api.data = { total, margin, off };
    },
    footer(f, api) {
      f.append(h('button', { class: 'btn gold', onclick: () => send(api) }, 'Teklifi gönder'));
    },
  });
  async function send(api) {
    const { total } = api.data;
    const freeLim = conf.has('smallDiscount') ? 0.05 : 0;
    if (off.disc > freeLim && approvedDisc < off.disc) {
      const r = await requestApproval({ who: 'harun', type: 'discount', title: `${c.name} için %${Math.round(off.disc * 100)} indirim`, value: off.disc });
      if (!r) return; approvedDisc = off.disc; rfq.verbal = r === 'verbal';
      api.refresh(); return toast('İndirim onaylandı. Şimdi teklifi gönderebilirsin.', 'good');
    }
    if (off.pay === 'vade' && !approvedVade) {
      const r = await requestApproval({ who: 'harun', type: 'payment', title: `${c.name} için vadeli satış`, reliable: (city(rfq.city).payRel || 0.8) > 0.9 });
      if (!r) return; approvedVade = true; api.refresh(); return toast('Vade onaylandı.', 'good');
    }
    const big = off.cur === 'USD' ? total > 40000 : total > 36000;
    if (big && !bunReviewed) {
      const r = await requestApproval({ who: 'bunyamin', type: 'bigOffer', title: `${c.name} büyük teklif (${fmtCur(total, off.cur)})` });
      if (!r) return; bunReviewed = true; api.refresh(); return;
    }
    rfq.round++;
    const realProd = estimateDays(rfq.lines[0].fam, rfq.lines.reduce((a, l) => a + l.qty, 0), rfq.lines[0].size);
    const tr = transitDays(rfq.city, bestMode(rfq.city));
    const ev = evaluate(rfq, off);
    conf.decided('offer');
    stat('offersSent');
    if (ev.u >= 0) {
      const lines = rfq.lines.map((l) => ({ ...l, price: listPrice(l, rfq.city, off.cur) * (1 - off.disc) }));
      const o = createOrder({ cust: c.id, city: rfq.city, lines, cur: off.cur, incoterm: off.inco, pay: off.pay, promisedDay: G.day + off.days, sample: !!rfq.sample, verbalDiscount: !!rfq.verbal, realisticDays: realProd + tr, discount: off.disc });
      if (off.days < realProd + tr - 2) o.notes.push(`Uyarı: Söz verilen süre (${off.days} gün) gerçekçi termin (~${realProd + tr} gün) altında.`);
      if (off.days < realProd + tr - 2) addTrust('serkan', rfq.termin?.exact ? -4 : -2, 'gerçekçi olmayan termin');
      stat('offersAccepted'); addSat(c, 3);
      msg && (msg.done = true, msg.chosen = 'Teklif kabul edildi → ' + o.id);
      p.close(); bus.emit('sfx', 'success'); bus.emit('offerAccepted', o);
      toast(`${c.name} teklifi kabul etti! Sipariş ${o.id} oluşturuldu. Sıradaki adım: proforma.`, 'good', 5000);
      onDone?.(o);
      return;
    }
    rfq.patience--;
    if (ev.u < -0.35 || rfq.patience <= 0) {
      reply = 'Teşekkürler, ama bu sefer başka bir tedarikçiyle ilerleyeceğiz. İleride tekrar konuşalım.';
      c.cooldown = G.day + 6; addSat(c, -2);
      msg && (msg.done = true, msg.chosen = 'Teklif kabul edilmedi');
      rfq.lost = true; api.refresh(); bus.emit('sfx', 'fail'); bus.emit('offerLost', rfq);
      setTimeout(() => api.close(), 2600);
      return;
    }
    const ct = counterText(rfq, ev.parts, off);
    reply = ct.t; rfq.reply = reply; bus.emit('sfx', 'mail'); time.skip(30); api.refresh();
  }
  return p;
}

export function askTermin(rfq, ch, api) {
  const qty = rfq.lines.reduce((a, l) => a + l.qty, 0);
  const real = estimateDays(rfq.lines[0].fam, qty, rfq.lines.some((l) => l.size === 'ozel') ? 'ozel' : 'std') + (rfq.lines.length - 1);
  if (rfq.lines.some((l) => l.size === 'ozel' && !l.drawing)) { toast('Serkan: "Özel ölçüde çizim olmadan termin vermem. Ölçüyü net getir."', 'warn', 5000); addTrust('serkan', -1); return; }
  if (ch === 'telefon') { time.skip(10); rfq.termin = { days: Math.max(2, Math.round(real * rand(0.7, 1.35))), exact: false }; addTrust('serkan', 1); toast(`Serkan (telefonda): "Aşağı yukarı ${rfq.termin.days} gün. Kesin söyleyemem, gel bak."`, 'info', 5000); }
  else { time.skip(20); rfq.termin = { days: real, exact: true }; addTrust('serkan', 3); toast(`Serkan: "Hat yüküne baktım: ${real} gün. Bu kesin."`, 'good', 5000); }
  bus.emit('terminAsked', ch);
  api?.refresh();
}
