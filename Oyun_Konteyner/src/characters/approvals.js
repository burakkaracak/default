// Onay zinciri ve iletişim kanalları.
// Patron Davut: ek iskonto, vade ve yatırım kararları onda. Harun: üretim ve finans (ödeme takibi), iskontoya karışmaz.
// Malzeme → İbrahim, fiyat/maliyet/termin → Serkan, sipariş açılışı (ERP) → Semanur (sadece mail).
// Kanallar karakter verisinden gelir: yüz yüze, telefon, WhatsApp, mail, randevu (Büşra üzerinden).
import { G, B, charDef, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { clamp, chance, randi } from '../core/util.js';
import { choose, toast } from '../ui/dom.js';
import { portraits } from './portraits.js';
import { whereIs } from './npcs.js';
import { addMessage } from '../crm/inbox.js';
import { internal, can, refName } from './comms.js';

export const APPLY = {}; // onay mesajla gelince çalışacak eylemler
export function registerApply(name, fn) { APPLY[name] = fn; }

export function trust(id) { return G.chars[id]?.trust ?? 50; }
export function addTrust(id, d, why) {
  const c = G.chars[id]; if (!c) return;
  const before = c.trust; c.trust = clamp(c.trust + d, 0, 100);
  if (Math.round(c.trust) !== Math.round(before)) bus.emit('trust', id, c.trust - before, why);
}
export function isHere(id) {
  const w = whereIs(id);
  return w && !w.travelling && w.loc === G.player.loc && (G.player.loc !== 'store' || w.floor === G.player.floor);
}
export const whoName = (id) => refName(id);

// Karar mantığı: {ok, text}
function decide(spec, channel) {
  const t = trust(spec.who);
  const bonus = channel === 'yuz' ? 12 : channel === 'telefon' ? -4 : 0;
  if (spec.type === 'invest') {
    const buffer = G.cash - (spec.amountTL || 0);
    if (buffer < 400000) return { ok: false, text: 'Kasayı bu kadar zorlamayalım. Önce tahsilatları toparla, sonra tekrar konuşalım.' };
    const ok = t + bonus >= 30 || chance(0.5);
    return ok ? { ok, text: pickT(['Rakamlar tutarlı. Onaylıyorum, ama her kuruşun hesabını isterim.', 'Tamam. Bu yatırımın geri dönüşünü çeyrek sonunda göreceğim.', 'İyi hazırlanmışsın. Onay.']) } : { ok, text: 'Bu yatırımın gerekçesi zayıf. Biraz daha veri getir.' };
  }
  if (spec.type === 'discount') {
    const lim = discountLimit() + (channel === 'yuz' ? 0.02 : 0);
    if (spec.value <= lim) return { ok: true, text: pickT(['Gerekçe makul. Onaylıyorum; ama bir dahakine liste fiyatını koruyalım.', 'Bu müşteri büyüyecekse olur. Onay.', 'Tamam. Marjı kontrol ettin, değil mi? Peki.']) };
    if (spec.value <= lim + 0.04 && t + bonus > 55) return { ok: true, text: 'Zorluyorsun ama gerekçen sağlam. Sadece bu sipariş için.' };
    return { ok: false, text: `%${Math.round(spec.value * 100)} olmaz. En fazla %${Math.round(lim * 100)} konuşabiliriz.` };
  }
  if (spec.type === 'payment') {
    const ok = t + bonus > 45 || spec.reliable;
    return ok ? { ok, text: 'Vadeye onay veriyorum. Harun takibini yapsın, tahsilatı sen de izle.' } : { ok, text: 'Bu müşteriye vade vermeyelim. Avansla çalışalım.' };
  }
  if (spec.type === 'material') {
    const m = G.mat.hist[spec.matId] || []; const avg = m.slice(-15).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(15, m.length));
    const now = G.mat.price[spec.matId];
    if (now > avg * 1.05) return { ok: true, warn: true, text: 'Al ama bil: fiyat şu an ortalamanın üstünde. Az al, gerisini bekle.' };
    return { ok: true, text: pickT(['Uygun. Al.', 'Fiyat makul, stok yap.', 'Tamam oğlum.']) };
  }
  if (spec.type === 'bigOffer') return { ok: true, text: pickT(['Teklif mantıklı. Teslim tarihini Serkan abiden kesin al, yeter.', 'Güzel. Ödeme şartına dikkat, gerisi tamam.', 'Bence gönder. Mükemmel olmasını bekleme.']) };
  return { ok: true, text: 'Tamam.' };
}
function pickT(a) { return a[Math.floor(Math.random() * a.length)]; }
export function discountLimit() { const t = trust('davut'); return B.discountBase + (t > 70 ? 0.03 : t > 50 ? 0.015 : 0) + (G.flags.discPlus || 0); }
export const harunLimit = discountLimit;

// Kanal seçimli onay. Anında karar çıkarsa true/false döner; mesajla gidince 'pending' döner ve onay gelince APPLY[act] çalışır.
export async function requestApproval(spec, opts = {}) {
  const who = spec.who; const here = isHere(who);
  const t = trust(who);
  const big = spec.type === 'invest' || (spec.amountTL || 0) > 1000000;
  const hrs = Math.max(1, (spec.type === 'invest' ? 4 : 2) + (t < 30 ? 2 : t > 70 ? -1 : 0));
  const choices = [];
  const mailH = can(who, 'mail') && charDef(who).mailSlow ? 24 : hrs;
  if (can(who, 'yuz')) {
    if (here) choices.push({ label: '🤝 Yüz yüze konuş', sub: 'Hemen karar · güven ↑↑', value: 'yuz' });
    else choices.push({ label: '🤝 Yüz yüze konuşmak için not al', sub: `${whoName(who)} şu an burada değil; yanına gidince konuşursun`, value: 'yuzNot' });
  }
  if (can(who, 'telefon')) choices.push({ label: '📞 Telefonla ara', sub: big ? 'Büyük konu: "yüz yüze konuşalım" diyebilir' : 'Anında ama kısa · güven ↑', value: 'telefon' });
  if (can(who, 'wa')) choices.push({ label: '💬 WhatsApp', sub: 'Yazılı ve hızlı · ~30 dk', value: 'wa' });
  if (can(who, 'randevu')) choices.push({ label: '📅 Büşra Hanım\'dan randevu al', sub: 'Yarın sabah 10:00, 3. kat toplantı odası', value: 'randevu' });
  if (can(who, 'mail')) choices.push({ label: '✉️ Mail (İç Yazışmalar)', sub: charDef(who).mailSlow ? 'İbrahim Bey maile pek bakmaz · ~1 gün' : `Resmi yazılı kayıt · ~${hrs} oyun saati`, value: 'mesaj' });
  const portrait = portraits[who];
  const ch = opts.channel || await choose(`Onay: ${whoName(who)}`, `<b>${spec.title}</b>${spec.amountTL ? ' · ₺' + Math.round(spec.amountTL).toLocaleString('tr-TR') : ''}${spec.value != null && spec.type === 'discount' ? ' · indirim %' + Math.round(spec.value * 100) : ''}<br><span class="muted">Hangi kanaldan soralım?</span>`, choices, { portrait });
  if (!ch) return false;
  G.stats.approvals = (G.stats.approvals || 0) + 1;
  if (ch === 'telefon') {
    time.skip(10);
    if (big) { addTrust(who, -1); await choose(whoName(who), '“Telefonda olmaz bu. Yüz yüze konuşalım.”', [{ label: 'Peki', value: 1 }], { portrait }); return false; }
    const d = decide(spec, 'telefon');
    addTrust(who, d.ok ? 1 : 0, 'telefon');
    await choose(whoName(who), '📞 “' + d.text + '”', [{ label: 'Teşekkürler', value: 1 }], { portrait });
    bus.emit('approval', spec, d.ok, 'telefon');
    return d.ok ? (spec.verbal ? 'verbal' : true) : false;
  }
  if (ch === 'yuz') {
    time.skip(20);
    const d = decide(spec, 'yuz');
    addTrust(who, d.ok ? 3 : 1, 'yüz yüze');
    await choose(whoName(who), '“' + d.text + '”', [{ label: d.ok ? 'Sağ olun' : 'Anladım', value: 1 }], { portrait });
    bus.emit('approval', spec, d.ok, 'yuz');
    return d.ok;
  }
  // Ertelenen onaylar
  const ap = { id: 'ap' + Date.now().toString(36) + randi(10, 99), who, spec, channel: ch, created: G.day * 1440 + G.min, done: false };
  if (ch === 'mesaj') ap.due = G.day * 1440 + G.min + mailH * 60;
  if (ch === 'wa') ap.due = G.day * 1440 + G.min + randi(20, 45);
  if (ch === 'randevu') { ap.due = (G.day + 1) * 1440 + 10 * 60; ap.meeting = true; G.appointments ||= []; G.appointments.push({ day: G.day + 1, min: 600, who: 'davut', title: spec.title, ap: ap.id }); }
  if (ch === 'yuzNot') ap.faceOnly = true;
  (G.approvals ||= []).push(ap);
  const amt = spec.amountTL ? ' (₺' + Math.round(spec.amountTL).toLocaleString('tr-TR') + ')' : '';
  if (ch === 'mesaj') internal({ from: 'burak', to: who, via: 'mail', subject: `Onay talebi: ${spec.title}`, body: `${spec.title}${amt} için onayınızı rica ederim. Gerekçe ve detaylar ektedir.` });
  if (ch === 'wa') internal({ from: 'burak', to: who, via: 'wa', subject: spec.title, body: `${spec.title}${amt} için bakabilir misin? 🙏` });
  if (ch === 'randevu') internal({ from: 'burak', to: 'busra', via: 'wa', subject: 'Randevu', body: `yarın 10:00'a Davut Bey'den randevu ayarlar mısın? Konu: ${spec.title}` });
  toast(ch === 'mesaj' ? 'Mail gönderildi (İç Yazışmalar).' : ch === 'wa' ? 'WhatsApp\'tan yazıldı.' : ch === 'randevu' ? 'Randevu alındı: yarın 10:00, 3. kat toplantı odası.' : `${whoName(who)} ile yüz yüze konuşmak üzere not alındı.`, 'info');
  bus.emit('approvalPending', ap);
  return false;
}
function resolve(ap, channel) {
  ap.done = true;
  const d = decide(ap.spec, channel);
  if (channel === 'yuz') addTrust(ap.who, d.ok ? 3 : 1);
  else addTrust(ap.who, d.ok ? 1 : 0);
  if (channel !== 'yuz') internal({ from: ap.who, to: 'burak', via: channel === 'wa' ? 'wa' : 'mail', subject: (d.ok ? '✓ Onaylandı: ' : '✗ Onaylanmadı: ') + ap.spec.title, body: d.text, kind: 'onay' });
  if (d.ok && ap.spec.act && APPLY[ap.spec.act]) APPLY[ap.spec.act](ap.spec.args || {}, ap.spec);
  bus.emit('approval', ap.spec, d.ok, channel);
  return d;
}
// Mesaj onaylarının zamanı geldi mi?
bus.on('tick', () => {
  if (!G?.approvals) return;
  const nowAbs = G.day * 1440 + G.min;
  for (const ap of G.approvals) if (!ap.done && ap.due && !ap.meeting && nowAbs >= ap.due) resolve(ap, ap.channel === 'wa' ? 'wa' : 'mesaj');
  G.approvals = G.approvals.filter((a) => !a.done || nowAbs - a.created < 3 * 1440);
});
// Karakterle yüz yüze konuşunca bekleyen onaylar
export function pendingFor(who) { return (G.approvals || []).filter((a) => !a.done && a.who === who && (a.faceOnly || a.channel === 'mesaj' || a.channel === 'wa' || (a.meeting && G.day * 1440 + G.min >= a.due - 60))); }
export function resolveFace(ap) { time.skip(15); return resolve(ap, 'yuz'); }
// Randevu kaçarsa
bus.on('dayEnd', () => {
  if (!G?.approvals) return;
  for (const ap of G.approvals) if (!ap.done && ap.meeting && G.day * 1440 + G.min > ap.due + 120) {
    ap.done = true; addTrust('davut', -3, 'randevuya gelinmedi'); addTrust('busra', -2);
    internal({ from: 'busra', via: 'wa', subject: 'Kaçan randevu', body: `Davut Bey 10:00'da seni bekledi. "${ap.spec.title}" için yeni randevu alalım mı?`, kind: 'hatirlatma' });
  }
});
