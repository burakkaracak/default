// Müşteri bulma ve ilişki döngüsü: ilk temas maili (parçalardan kurulur), cevaplar, katalog, fiyat listesi,
// numune, teklif istekleri, özel ölçü, indirim ve termin baskısı, şikayetler, Bostancı ziyaretleri.
import { G, P, family, fabric, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { clamp, chance, pick, rand, randi, shuffle, esc } from '../core/util.js';
import { h, panel, toast, choose, confirmBox, alertBox } from '../ui/dom.js';
import { addMessage, registerAction } from './inbox.js';
import { cust, custByCity, setLevel, addSat, TYPES, LEVELS, isProtected, cityOf, cityOpen } from './customers.js';
import { makeRFQ, offerPanel } from './negotiation.js';
import { createOrder, orderById, lineText } from './orders.js';
import { spend, toTL } from '../economy/economy.js';
import { addTrust, trust, requestApproval } from '../characters/approvals.js';
import { conf } from '../core/confidence.js';
import { stat } from '../core/story.js';
import { atDesk } from '../ui/desk.js';
import { showroomBeauty } from '../locations/store.js';
import { portraits } from '../characters/portraits.js';
import MP from '../data/mailparts.json';

export const rep = (cityId) => (G.reputation?.[cityOf(cityId)?.country] ?? 10);
export function addRep(cityId, d) { const c = cityOf(cityId); if (!c) return; G.reputation ||= {}; G.reputation[c.country] = clamp((G.reputation[c.country] ?? 10) + d, 0, 100); }
const first = (n) => n.split(' ')[0];
const fill = (t, c) => t.replace('{contact}', c.contact).replace('{first}', first(c.contact)).replace('{firm}', c.name).replace('{city}', cityOf(c.city).name);

// ---------- Mail mini oyunu ----------
export function scoreMail(c, sel) {
  const parts = MP.slots.map((s, i) => s.options[sel[i]]).filter(Boolean);
  let s = 0.5; const notes = [];
  const len = parts.reduce((a, p) => a + (p.len || 0), 0);
  const want = c.comm === 'kisa' ? 5 : c.comm === 'resmi' ? 8 : 6;
  if (len > want + 1) { s -= (len - want) * 0.06; notes.push('uzun'); }
  const cl = parts.reduce((a, p) => a + (p.cliche || 0), 0); s -= cl * 0.07; if (cl >= 2) notes.push('şablon kokuyor');
  const ex = parts.reduce((a, p) => a + (p.exag || 0), 0); s -= ex * 0.09; if (ex >= 2) notes.push('abartılı');
  const pe = parts.reduce((a, p) => a + (p.pers || 0), 0); s += pe * 0.06; if (pe) notes.push('kişisel');
  const tones = parts.map((p) => p.tone).filter((t) => t && t !== 'notr');
  const match = c.comm === 'resmi' ? 'resmi' : 'samimi';
  const tm = tones.filter((t) => t === match).length - tones.filter((t) => t !== match).length; s += tm * 0.05;
  if (tm < 0) notes.push('üslup uymuyor');
  const urun = parts[2]; if (urun?.style === c.style) { s += 0.14; notes.push('ürün tarzı uygun'); } else if (urun?.style) s -= 0.03;
  s += parts.reduce((a, p) => a + (p.good || 0), 0) * 0.05;
  return { score: clamp(s, 0.02, 1), notes, len };
}
export function composePanel(c) {
  if (isProtected(c)) return protectedWarn(c);
  if (c.cooldown > G.day) return toast(`${c.name} şu an başka tedarikçiyle çalışıyor. ${c.cooldown - G.day} gün sonra tekrar dene.`, 'info');
  if (!atDesk()) return toast('İlk temas mailleri masandan yazılır (Bostancı, 2. kat).', 'warn');
  const sel = MP.slots.map(() => null);
  let polish = 0;
  conf.startDecision('mail');
  const p = panel({
    id: 'compose', title: 'İlk temas maili', icon: '✍️', size: 'md', sub: `${c.name} · ${c.contact} · ${TYPES[c.type].name}`,
    onClose: () => conf.endDecision(),
    render(b, api) {
      b.append(h('div', { class: 'muted' }, `İpucu: ${c.comm === 'kisa' ? 'Kısa ve net yazılmasını seviyor.' : c.comm === 'resmi' ? 'Resmi bir dil bekliyor.' : 'Samimi bir dili seviyor.'} Tarz: ${c.style}. Kısa, doğal, insani ve firmaya uygun mailler kazanır.`));
      MP.slots.forEach((s, i) => {
        b.append(h('div', { class: 'sec' }, s.name));
        const g = h('div', { class: 'col', style: { gap: '6px' } });
        s.options.forEach((o, j) => g.append(h('button', { class: 'mailpart' + (sel[i] === j ? ' sel' : ''), onclick: () => { sel[i] = sel[i] === j && i === 3 ? null : j; api.refresh(); } }, fill(o.t, c))));
        b.append(g);
      });
      const ready = sel.every((x, i) => x != null || i === 3);
      if (ready) {
        b.append(h('div', { class: 'sec' }, 'Önizleme'), h('div', { class: 'mail' }, MP.slots.map((s, i) => sel[i] == null ? null : fill(s.options[sel[i]].t, c)).filter(Boolean).join('\n\n')));
      }
    },
    footer(f, api) {
      const ready = sel.every((x, i) => x != null || i === 3);
      f.append(h('button', { class: 'btn ghost', disabled: !ready, onclick: () => { polish++; G.player.analiz = Math.min(100, G.player.analiz + 18); bus.emit('innerVoice', pick(['Bir virgül daha...', 'Şu kelime biraz sert mi?', 'Bir daha okuyayım.', 'Mükemmel olmalı...'])); toast(polish <= 2 ? 'Biraz daha düzelttin. (Küçük fark)' : 'Artık fark yaratmıyor; gönderme zamanı.', 'info', 2200); } }, '🔍 Bir kez daha gözden geçir'),
        h('button', { class: 'btn gold', disabled: !ready, onclick: () => { send(); p.close(); } }, '✉️ Gönder'));
    },
  });
  function send() {
    const r = scoreMail(c, sel);
    const score = clamp(r.score + Math.min(2, polish) * 0.025, 0, 1);
    const cc = cityOf(c.city);
    const season = cc.season?.[time.seasonIndex()] ?? 1;
    const focus = G.focusRegion && G.focusRegion === cc.region ? 1.25 : 1;
    const compet = G.priceWar?.[c.city] ? 0.85 : 1;
    const pr = clamp(TYPES[c.type].replyBase * (0.35 + score * 1.3) * (0.85 + rep(c.city) / 200) * season * focus * compet, 0.04, 0.92);
    const willReply = chance(pr);
    c.lastContact = G.day; c.waiting = { day: G.day + randi(1, 4), reply: willReply, score };
    G.stats.mailsSent = (G.stats.mailsSent || 0) + 1; bus.emit('stat', 'mailsSent'); bus.emit('mailSent', c);
    addMessage({ ch: 'musteri', from: 'Burak Karaçak', fromId: 'burak', toName: c.name, outgoing: true, read: true, subject: `Live & Feel × ${c.name}`, body: MP.slots.map((s, i) => sel[i] == null ? null : fill(s.options[sel[i]].t, c)).filter(Boolean).join('\n\n') });
    conf.decided('mail', score > 0.45);
    G.mailScores ||= []; G.mailScores.push(+score.toFixed(2));
    toast(`Mail gönderildi. ${r.notes.length ? 'İzlenim: ' + r.notes.join(', ') + '.' : ''} Cevap birkaç gün içinde gelebilir.`, 'good', 5000);
  }
  return p;
}
async function protectedWarn(c) {
  const ok = await confirmBox('Korumalı hesap', `<b>${c.name}</b> (${cityOf(c.city).name}) Bünyamin'in bölgesinde. Orta Doğu, Pakistan, Hindistan ve diğer bölgeler onun korumalı hesapları.<br><br>Yine de yazarsan Bünyamin'le aran bozulur ve şirket içinde itibar kaybedersin.`, 'Yine de yaz', 'Vazgeç');
  if (!ok) return;
  addTrust('bunyamin', -15, 'korumalı hesaba dokundun'); addTrust('davut', -4);
  G.flags.touchedProtected = (G.flags.touchedProtected || 0) + 1;
  c.cooldown = G.day + 30;
  addMessage({ ch: 'ic', from: 'Bünyamin Karaçak', fromId: 'bunyamin', subject: 'Bu benim müşterim kuzen', body: `${c.name} ile ben görüşüyorum. Bize iki farklı ses gidince müşteri kafası karışıyor. Bir dahakine önce bana sor, olur mu? Senin bölgen Avrupa ve Asya.`, kind: 'uyari' });
}

// ---------- Cevaplar ve ilişki olayları ----------
function lineFor(c, opts = {}) {
  const fams = G.open.families.filter((f) => family(f).styles.includes(c.style) || Math.random() < 0.4);
  const fam = pick(fams.length ? fams : G.open.families);
  const f = family(fam);
  const cc = cityOf(c.city);
  const col = chance(0.65) ? pick(cc.colors) : pick(P.colors).id;
  let fab = G.trend?.fabric && G.open.fabrics.includes(G.trend.fabric) && chance(0.4) ? G.trend.fabric : pick(G.open.fabrics);
  const base = { magaza: 8, icmimar: 3, otel: 18, distributor: 22, eticaret: 12 }[c.type] || 8;
  let qty = Math.max(1, Math.round(base * (0.6 + c.size * 0.35) * (opts.mult || 1) * rand(0.7, 1.3) * (fam === 'sandalye' ? 3 : fam === 'kose' || fam === 'yatak' ? 0.6 : 1)));
  if (opts.sample) qty = 1;
  const ozel = !opts.sample && chance((cc.ozelRate || 0.15) + (TYPES[c.type].ozelBonus || 0)) && !f.fabricless;
  return { fam, fabric: f.fabricless ? 'keten' : fab, color: col, size: ozel ? 'ozel' : 'std', qty, dims: ozel ? `${randi(18, 32) * 10}×${randi(85, 105)} cm` : null, drawing: !ozel };
}
export function makeRequest(c, opts = {}) {
  const n = opts.sample ? 1 : c.level >= 4 ? randi(1, 3) : randi(1, 2);
  const lines = []; const used = new Set();
  for (let i = 0; i < n; i++) { const l = lineFor(c, opts); if (used.has(l.fam)) continue; used.add(l.fam); lines.push(l); }
  const rfq = makeRFQ(c, lines, opts.sample ? { sample: true, target: 0.02, wantDays: 30 } : {});
  const ozel = lines.some((l) => l.size === 'ozel');
  const body = (c.comm === 'resmi' ? `Sayın Burak Bey,\n\n` : `Merhaba Burak,\n\n`) + (opts.sample ? 'Ürünlerinizi yakından görmek istiyoruz. Bir adet numune için teklifinizi rica ederiz:\n' : opts.visit ? 'Showroom ziyaretimizden sonra şu ürünler için teklif istiyoruz:\n' : 'Aşağıdaki ürünler için fiyat ve termin teklifinizi bekliyoruz:\n') + lines.map((l) => '• ' + lineText(l)).join('\n') + (ozel ? '\n\nÖzel ölçü kalemleri için ölçülerimiz yukarıda; teknik çizimi talep ederseniz göndeririz.' : '') + `\n\nİstediğimiz teslim: yaklaşık ${rfq.wantDays} gün.\n\n${c.contact}\n${c.name}`;
  const actions = [];
  if (ozel) actions.push({ label: 'Ölçülü teknik çizim iste', act: 'askDrawing', sub: 'Serkan net çizim ister' });
  actions.push({ label: 'Teklifi hazırla', act: 'openOffer', needDesk: true, sub: 'pazarlık ekranı' });
  actions.push({ label: 'Nazikçe reddet', act: 'declineRfq' });
  addMessage({ ch: 'musteri', from: c.name, fromId: c.id, subject: (opts.sample ? 'Numune talebi' : opts.visit ? 'Ziyaret sonrası teklif talebi' : 'Teklif talebi') + ` · ${cityOf(c.city).flag} ${cityOf(c.city).name}`, body, kind: 'rfq', rfq, actions });
  return rfq;
}
registerAction('askDrawing', (msg) => { msg.rfq.drawAsk = G.day + 1; toast('Çizim istendi; yarın gelir.', 'info'); msg.actions = msg.actions.filter((a) => a.act !== 'askDrawing'); bus.emit('inboxChanged'); return false; });
registerAction('declineRfq', (msg) => { msg.rfq.lost = true; const c = cust(msg.rfq.cust); addSat(c, -1); return true; });
registerAction('sendCatalog', (msg) => { const c = cust(msg.cust); c.catalogSent = G.day; G.flags.catalogs = (G.flags.catalogs || 0) + 1; toast('Katalog gönderildi.', 'good'); conf.gain(1); schedule(c, 'priceList', randi(1, 3)); return true; });
registerAction('sendPriceList', async (msg, a) => { const c = cust(msg.cust); c.priceListSent = G.day; toast('Fiyat listesi gönderildi (' + a.cur + ').', 'good'); conf.gain(1); schedule(c, chance(0.75) ? 'sampleReq' : 'rfq', randi(2, 4)); return true; });
registerAction('acceptSample', (msg) => { const c = cust(msg.cust); setLevel(c, 2, 'numune talebi'); makeRequest(c, { sample: true }); return true; });
registerAction('complaintPay', (msg, a) => { const o = orderById(a.order); const amt = toTL(o.total * a.pct, o.cur); spend(amt, 'iade', 'İade/değişim ' + o.id); const c = cust(o.cust); addSat(c, 10); addRep(o.city, 2); toast('Müşteri jestini takdir etti.', 'good'); return true; });
registerAction('complaintDisc', (msg, a) => { const o = orderById(a.order); const c = cust(o.cust); if (chance(0.6)) { o.total *= 1 - a.pct; addSat(c, 4); toast('Müşteri indirimi kabul etti.', 'good'); } else { const amt = toTL(o.total * a.pct * 1.6, o.cur); spend(amt, 'iade', 'İade ' + o.id); addSat(c, -4); addRep(o.city, -2); toast('Müşteri indirimi yeterli bulmadı; iade yapıldı.', 'warn'); } return true; });
registerAction('discountReq', async (msg, a) => { const c = cust(msg.cust); const ok = await requestApproval({ who: 'harun', type: 'discount', title: `${c.name} için gelecek siparişe %${Math.round(a.pct * 100)}`, value: a.pct }); if (!ok) return false; c.nextDisc = a.pct; addSat(c, 6); toast('İndirim sözü verildi; bir sonraki teklifte hedef fiyatı düşük olacak.', 'good'); return true; });
registerAction('politeNo', (msg) => { const c = cust(msg.cust); addSat(c, chance(0.6) ? 0 : -4); return true; });
registerAction('rushYes', async (msg, a) => { const o = orderById(a.order); if (trust('serkan') < 50) { toast('Serkan: "Şu an olmaz, hat dolu." (güven 50+ gerekir)', 'warn'); return false; } for (const id of o.wos || []) { const wo = G.factory.wos[id]; if (wo) wo.prio = 2; } addTrust('serkan', -2); o.promisedDay = Math.max(G.day + 2, o.promisedDay - 3); addSat(cust(o.cust), 6); toast('Serkan işi öne aldı. Teslim 3 gün öne çekildi.', 'good'); return true; });

function schedule(c, kind, days) { (G.custEvents ||= []).push({ cust: c.id, kind, day: G.day + days }); }

function replyMail(c) {
  const w = c.waiting; c.waiting = null;
  if (!w.reply) { c.cooldown = G.day + 8; return; }
  setLevel(c, 1, 'ilk temas');
  conf.gain(6, 'Mail cevap aldı');
  stat('replies');
  const body = (c.comm === 'resmi' ? `Sayın Burak Bey,\n\nMailiniz için teşekkür ederiz. ` : c.comm === 'kisa' ? 'Merhaba, ' : `Merhaba Burak,\n\nMailin çok hoşuma gitti, teşekkürler! `) + pick(['Ürünleriniz ilgimizi çekti.', 'Koleksiyonunuz tam aradığımız çizgide görünüyor.', 'Bu sezon yeni tedarikçilere bakıyoruz.']) + ' Güncel kataloğunuzu gönderebilir misiniz?\n\n' + c.contact;
  addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: 'Re: Live & Feel × ' + c.name, body, kind: 'katalog', actions: [{ label: 'Kataloğu gönder', act: 'sendCatalog' }] });
}
function fireEvent(e) {
  const c = cust(e.cust); if (!c) return;
  const cc = cityOf(c.city);
  if (e.kind === 'priceList') addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: 'Fiyat listesi', body: `Kataloğa baktık, güzel. ${cc.cur} fiyat listenizi alabilir miyiz?\n\n${c.contact}`, kind: 'fiyat', actions: [{ label: `Fiyat listesini gönder (${cc.cur})`, act: 'sendPriceList', args: { cur: cc.cur } }, { label: `Fiyat listesini gönder (${cc.cur === 'EUR' ? 'USD' : 'EUR'})`, act: 'sendPriceList', args: { cur: cc.cur === 'EUR' ? 'USD' : 'EUR' } }] });
  if (e.kind === 'sampleReq') addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: 'Numune isteği', body: `Fiyatlar makul görünüyor. Sipariş öncesi kaliteyi görmek için bir numune isteriz.\n\n${c.contact}`, kind: 'numune', actions: [{ label: 'Numune teklifini hazırlamak üzere kabul et', act: 'acceptSample' }, { label: 'Numune yerine görüntülü sunum öner', act: 'politeNo' }] });
  if (e.kind === 'rfq') makeRequest(c, { mult: c.nextDisc ? 1.2 : 1 });
}
// Satış asistanı basit istekleri kendi cevaplar
function assistantHandles() {
  if (!G.factory.staff.some((w) => w.role === 'satis')) return;
  for (const m of G.inbox) if (!m.done && ['katalog', 'fiyat'].includes(m.kind) && G.day - m.day >= 1) {
    const a = m.actions[0]; m.done = true; m.chosen = 'Satış asistanı cevapladı: ' + a.label;
    const c = cust(m.cust); if (m.kind === 'katalog') schedule(c, 'priceList', randi(1, 3)); else schedule(c, chance(0.75) ? 'sampleReq' : 'rfq', randi(2, 4));
  }
}

bus.on('dayStart', () => {
  if (!G?.customers) return;
  for (const c of Object.values(G.customers)) if (c.waiting && G.day >= c.waiting.day) replyMail(c);
  const evs = G.custEvents || []; G.custEvents = evs.filter((e) => e.day > G.day);
  for (const e of evs) if (e.day <= G.day) fireEvent(e);
  // Çizim istenen teklifler
  for (const m of G.inbox) if (m.rfq?.drawAsk && G.day >= m.rfq.drawAsk && !m.rfq.drawGot) { m.rfq.drawGot = true; for (const l of m.rfq.lines) l.drawing = true; addMessage({ ch: 'musteri', from: m.from, fromId: m.fromId, subject: 'Teknik çizim ektedir', body: 'Özel ölçü kalemleri için ölçülü çizim ektedir. Termini bekliyoruz.', kind: 'cizim' }); }
  // Düzenli müşterilerden yeni siparişler, rastgele istekler
  for (const c of Object.values(G.customers)) {
    if (c.owner !== 'burak' || c.level < 3 || c.cooldown > G.day) continue;
    const open = G.orders.some((o) => o.cust === c.id && !['kapandi', 'iptal', 'teslim', 'tahsil'].includes(o.status));
    const pRfq = (c.level >= 4 ? 0.12 : 0.06) * (cityOf(c.city).season?.[time.seasonIndex()] ?? 1) * (c.sat / 60);
    if (!open && chance(pRfq) && !(G.inbox.some((m) => m.rfq?.cust === c.id && !m.done))) makeRequest(c, { mult: c.level >= 5 ? 1.8 : c.level >= 4 ? 1.3 : 1 });
    if (c.level >= 4 && chance(0.02) && !c.nextDisc) addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: 'İndirim talebi', body: `Uzun süredir birlikte çalışıyoruz. Bir sonraki siparişte %5 indirim yapabilir misiniz? Hacmimizi artırmayı düşünüyoruz.\n\n${c.contact}`, kind: 'indirim', actions: [{ label: '%5 indirim sözü ver (Harun onayı)', act: 'discountReq', args: { pct: 0.05 } }, { label: 'Nazikçe hayır de', act: 'politeNo' }] });
  }
  for (const o of G.orders) if (o.status === 'uretim' && !o.rushAsked && !o.sample && chance(0.05)) {
    o.rushAsked = true; const c = cust(o.cust);
    addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: `Acil: ${o.id} teslimi`, body: `Merhaba,\n\nMağaza açılışımız öne çekildi. ${o.id} teslimini birkaç gün öne alabilir misiniz?\n\n${c.contact}`, kind: 'termin', actions: [{ label: 'Serkan\'dan işi öne almasını iste', act: 'rushYes', args: { order: o.id } }, { label: 'Nazikçe mevcut tarihi koru', act: 'politeNo' }] });
  }
  assistantHandles();
  // Bostancı ziyareti planla
  if (chance(0.12) && !G.visit) {
    const cands = Object.values(G.customers).filter((c) => c.owner === 'burak' && c.level >= 1 && cityOpen(c.city));
    if (cands.length) { const c = pick(cands); G.visit = { cust: c.id, day: G.day + 1, min: 14 * 60 }; addMessage({ ch: 'musteri', from: c.name, fromId: c.id, cust: c.id, subject: 'Bostancı ziyareti', body: `Yarın İstanbul'dayız. Saat 14:00'te showroom'unuza uğramak isteriz.\n\n${c.contact}`, kind: 'ziyaret' }); }
  }
});
// Ziyaret saati
bus.on('tick', () => {
  const v = G?.visit; if (!v || G.day !== v.day || G.min < v.min) return;
  G.visit = null;
  const c = cust(v.cust); const beauty = showroomBeauty();
  if (G.player.loc === 'store') {
    G.showroomBonus = beauty / 400;
    alertBox(`Ziyaret: ${c.name}`, `${c.contact} showroom'u geziyor. Güzellik puanı <b>${beauty}</b>.<br><br>“${beauty > 50 ? 'Burası harika! Ürünleri canlı görmek bambaşka.' : beauty > 25 ? 'Güzel ürünler. Biraz daha teşhir olsa...' : 'Teşhirde pek ürün yok, kataloğa bakalım.'}”`, 'Görüşmeyi tamamla').then(() => {
      addSat(c, 4 + beauty / 10); addTrust('davut', 1);
      if (chance(0.35 + beauty / 120)) { if (c.level < 3) setLevel(c, Math.max(c.level, 2)); makeRequest(c, { visit: true, mult: 1 + beauty / 100 }); toast('Ziyaret sonrası teklif talebi geldi!', 'good'); }
      G.showroomBonus = 0; stat('visitsHosted');
    });
  } else {
    addMessage({ ch: 'ic', from: 'Bünyamin Karaçak', fromId: 'bunyamin', subject: `${c.name} ziyareti`, body: 'Sen yoktun, misafirleri ben karşıladım. Showroom\'u gezdik. ' + (beauty > 40 ? 'Çok beğendiler.' : 'Teşhir biraz zayıftı.'), kind: 'ziyaret' });
    if (chance(0.15 + beauty / 300)) makeRequest(c, { visit: true });
  }
});
// Teslim sonrası itibar
bus.on('delivered', (o) => { const r = o.result; addRep(o.city, r.wrong ? -6 : r.stars >= 4 && !r.late ? 4 : r.stars <= 2 ? -4 : 1); if (o.sample && r.stars >= 3) schedule(cust(o.cust), 'rfq', randi(2, 3)); if (o.sample) stat('samplesSent'); });
// Analiz taşınca teklif müşterisi sabırsızlanır (nazikçe)
bus.on('analysisOverflow', (kind) => { toast(kind === 'offer' ? 'Müşteri cevabını bekliyor; yeterince iyi bir teklif, mükemmel ama geç bir tekliften iyidir.' : '“Yeterince iyi” göndermeye hazır. Hadi!', 'info', 5000); });
