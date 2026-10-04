// Onay zinciri ve iletişim kanalları.
// İndirim/ödeme → Harun, yatırım → Davut (randevu Büşra), malzeme → İbrahim, termin → Serkan, büyük teklif → Bünyamin, sipariş girişi → Semanur.
// Kanallar: telefon (anında, kısa; büyük işte "yüz yüze konuşalım"), mesaj (yavaş ama yazılı), yüz yüze (zaman ister, en etkili).
import { G, charDef, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { clamp, chance, randi } from '../core/util.js';
import { choose, toast } from '../ui/dom.js';
import { portraits } from './portraits.js';
import { whereIs } from './npcs.js';
import { addMessage } from '../crm/inbox.js';

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
const WHO = { davut: 'Davut Bey', harun: 'Harun Bey', ibrahim: 'İbrahim Bey', serkan: 'Serkan Bey', bunyamin: 'Bünyamin', busra: 'Büşra Hanım', semanur: 'Semanur' };
export const whoName = (id) => WHO[id] || charDef(id)?.name;

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
    const lim = harunLimit() + (channel === 'yuz' ? 0.03 : 0);
    if (spec.value <= lim) return { ok: true, text: pickT(['Olur, ver gitsin. Ama aramızda kalsın.', 'Tamam yeğenim, bu müşteri değer.', 'Bu sefer olsun. Bir dahakine bu kadar değil.']) };
    if (spec.value <= lim + 0.04 && t + bonus > 55) return { ok: true, text: 'Zorluyorsun ama... peki. Sadece bu sipariş için.' };
    return { ok: false, text: `%${Math.round(spec.value * 100)} olmaz. En fazla %${Math.round(lim * 100)} konuşabiliriz.` };
  }
  if (spec.type === 'payment') {
    const ok = t + bonus > 45 || spec.reliable;
    return ok ? { ok, text: 'Vadeye tamam; ama ödemeyi sen takip edeceksin.' } : { ok, text: 'Bu müşteriye vade vermem. Avans al, sonra konuşuruz.' };
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
export function harunLimit() { const t = trust('harun'); return 0.08 + (t > 70 ? 0.04 : t > 50 ? 0.02 : 0) + (G.flags.harunPlus || 0); }

// Kanal seçimli onay. Anında karar çıkarsa true/false döner; mesajla gidince 'pending' döner ve onay gelince APPLY[act] çalışır.
export async function requestApproval(spec, opts = {}) {
  const who = spec.who; const here = isHere(who);
  const t = trust(who);
  const big = spec.type === 'invest' || (spec.amountTL || 0) > 1000000;
  const hrs = Math.max(1, (spec.type === 'invest' ? 4 : 2) + (t < 30 ? 2 : t > 70 ? -1 : 0));
  const choices = [];
  if (here) choices.push({ label: '🤝 Yüz yüze konuş', sub: 'Hemen karar · güven ↑↑', value: 'yuz' });
  else choices.push({ label: '🤝 Yüz yüze konuşmak için not al', sub: `${whoName(who)} şu an burada değil; yanına gidince konuşursun`, value: 'yuzNot' });
  if (who !== 'davut') choices.push({ label: '📞 Telefonla ara', sub: big ? 'Büyük konu: "yüz yüze konuşalım" diyebilir' : 'Anında ama kısa · ' + (who === 'harun' ? 'sözlü kalır!' : 'güven ↑'), value: 'telefon' });
  else choices.push({ label: '📅 Büşra Hanım\'dan randevu al', sub: 'Davut Bey yarın sabah 10:00\'da toplantı odasında dinler', value: 'randevu' });
  choices.push({ label: '✉️ İç Yazışmalar\'dan yaz', sub: `Yazılı kayıt · ~${hrs} oyun saati sürer`, value: 'mesaj' });
  const portrait = portraits[who];
  const ch = opts.channel || await choose(`Onay: ${whoName(who)}`, `<b>${spec.title}</b>${spec.amountTL ? ' · ₺' + Math.round(spec.amountTL).toLocaleString('tr-TR') : ''}${spec.value != null && spec.type === 'discount' ? ' · indirim %' + Math.round(spec.value * 100) : ''}<br><span class="muted">Hangi kanaldan soralım?</span>`, choices, { portrait });
  if (!ch) return false;
  G.stats.approvals = (G.stats.approvals || 0) + 1;
  if (ch === 'telefon') {
    time.skip(10);
    if (big) { addTrust(who, -1); await choose(whoName(who), '“Telefonda olmaz bu. Yüz yüze konuşalım.”', [{ label: 'Peki', value: 1 }], { portrait }); return false; }
    const d = decide(spec, 'telefon');
    addTrust(who, d.ok ? 1 : 0, 'telefon');
    if (who === 'harun' && d.ok) spec.verbal = true;
    await choose(whoName(who), '📞 “' + d.text + '”' + (who === 'harun' && d.ok ? '<br><span class="muted">Not: Sözlü onay. Harun Bey sonradan hatırlamayabilir.</span>' : ''), [{ label: 'Teşekkürler', value: 1 }], { portrait });
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
  if (ch === 'mesaj') ap.due = G.day * 1440 + G.min + hrs * 60;
  if (ch === 'randevu') { ap.due = (G.day + 1) * 1440 + 10 * 60; ap.meeting = true; G.appointments ||= []; G.appointments.push({ day: G.day + 1, min: 600, who: 'davut', title: spec.title, ap: ap.id }); }
  if (ch === 'yuzNot') ap.faceOnly = true;
  (G.approvals ||= []).push(ap);
  addMessage({ ch: 'ic', from: 'Burak Karaçak', fromId: 'burak', to: who, subject: `Onay talebi: ${spec.title}`, body: ch === 'mesaj' ? `${whoName(who)}, ${spec.title} için onayınızı rica ediyorum.${spec.amountTL ? '\nTutar: ₺' + Math.round(spec.amountTL).toLocaleString('tr-TR') : ''}` : ch === 'randevu' ? 'Büşra Hanım\'dan Davut Bey için yarın 10:00 randevusu alındı.' : `${whoName(who)} ile yüz yüze konuşulacak: ${spec.title}`, read: true, outgoing: true });
  toast(ch === 'mesaj' ? 'Talep İç Yazışmalar\'a gönderildi.' : ch === 'randevu' ? 'Randevu alındı: yarın 10:00, 3. kat toplantı odası.' : `${whoName(who)} ile yüz yüze konuşmak üzere not alındı.`, 'info');
  bus.emit('approvalPending', ap);
  return false;
}
function resolve(ap, channel) {
  ap.done = true;
  const d = decide(ap.spec, channel);
  if (channel === 'yuz') addTrust(ap.who, d.ok ? 3 : 1);
  else addTrust(ap.who, d.ok ? 1 : 0);
  addMessage({ ch: 'ic', from: whoName(ap.who), fromId: ap.who, subject: (d.ok ? '✓ Onaylandı: ' : '✗ Onaylanmadı: ') + ap.spec.title, body: d.text, kind: 'onay' });
  if (d.ok && ap.spec.act && APPLY[ap.spec.act]) APPLY[ap.spec.act](ap.spec.args || {}, ap.spec);
  bus.emit('approval', ap.spec, d.ok, channel);
  return d;
}
// Mesaj onaylarının zamanı geldi mi?
bus.on('tick', () => {
  if (!G?.approvals) return;
  const nowAbs = G.day * 1440 + G.min;
  for (const ap of G.approvals) if (!ap.done && ap.due && !ap.meeting && nowAbs >= ap.due) resolve(ap, 'mesaj');
  G.approvals = G.approvals.filter((a) => !a.done || nowAbs - a.created < 3 * 1440);
});
// Karakterle yüz yüze konuşunca bekleyen onaylar
export function pendingFor(who) { return (G.approvals || []).filter((a) => !a.done && a.who === who && (a.faceOnly || a.channel === 'mesaj' || (a.meeting && G.day * 1440 + G.min >= a.due - 60))); }
export function resolveFace(ap) { time.skip(15); return resolve(ap, 'yuz'); }
// Randevu kaçarsa
bus.on('dayEnd', () => {
  if (!G?.approvals) return;
  for (const ap of G.approvals) if (!ap.done && ap.meeting && G.day * 1440 + G.min > ap.due + 120) {
    ap.done = true; addTrust('davut', -3, 'randevuya gelinmedi'); addTrust('busra', -2);
    addMessage({ ch: 'ic', from: 'Büşra Karaçak', fromId: 'busra', subject: 'Kaçan randevu', body: `Davut Bey 10:00'da seni bekledi. "${ap.spec.title}" konusu için yeni randevu almalısın.`, kind: 'hatirlatma' });
  }
});
