// "Sıradaki adım" rehberi: her an tek bir net iş gösterir; "Götür" düğmesi oyuncuyu oraya götürüp işi açar.
import { G } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { W } from '../locations/world3d.js';
import { h } from './dom.js';
import { go } from './travel.js';
import { atDesk } from './desk.js';
import { whereIs, locName } from '../characters/npcs.js';
import { orderProgress } from '../crm/orders.js';
import { chapter, goalsState } from '../core/story.js';
import { canCelebrate } from '../core/story.js';
import L from '../data/locations.json';
import { runAction } from '../crm/inbox.js';

const DESK = { loc: 'store', floor: 2, x: -6, z: -2.6 };
const DOCK = { loc: 'factory', floor: 0, x: -12.6, z: 4.6 };
// Bir karakterin yanına götürür (yüz yüze konuşma)
function nearChar(id) {
  const w = whereIs(id);
  if (!w || w.travelling || !w.loc) return null;
  return { loc: w.loc, floor: w.floor || 0, x: w.pos[0], z: w.pos[1] + 1.3 };
}
export function goTo(t, after) {
  if (!t) return after?.();
  const done = () => { G.player.x = t.x; G.player.z = t.z; W.snapCamera(); after && setTimeout(after, 150); };
  if (G.player.loc !== t.loc) return go(t.loc, { floor: t.floor, x: t.x, z: t.z, after });
  if (t.loc === 'store' && G.player.floor !== t.floor) {
    W.enter('store', { floor: t.floor, x: t.x, z: t.z }); time.skip(3); after && setTimeout(after, 200); return;
  }
  time.skip(2); done();
}
const ui = (name, ...a) => () => bus.emit('ui', name, ...a);

// Sıradaki tek adım
export function nextStep() {
  if (!G) return null;
  const orders = G.orders || [];
  const rfqMsg = (G.inbox || []).find((m) => m.rfq && !m.done && !m.rfq.lost);
  const unreadWork = (G.inbox || []).find((m) => !m.done && m.actions?.length && !m.rfq && m.kind !== 'erp');
  const o = (st) => orders.find((x) => x.status === st);
  if (canCelebrate() || (G.chapter === 1 && (G.stats.shipped || 0) >= 1 && !G.flags.ch1Report)) {
    const t = nearChar('davut');
    return { text: 'Davut Bey\'e haber ver', sub: 'Bostancı · 3. kat toplantı odası', label: 'Götür ve konuş', target: t, run: ui('talk', 'davut') };
  }
  if (G.ykDay === G.day && !G.ykDone) return { text: 'YK toplantısı bugün 15:00', sub: 'Bostancı · 3. kat · raporu kontrol et', label: 'Götür', target: { loc: 'store', floor: 3, x: 3, z: 1 }, run: ui('meetingTable') };
  if (o('proforma')) return { text: `Proformayı gönder (${o('proforma').id})`, sub: 'Müşteri kabul etti; şimdi proforma', label: 'Aç', run: ui('orders', o('proforma').id) };
  const erp = orders.find((x) => x.status === 'erp' && !x.erp?.pending);
  if (erp) return { text: `ERP formunu Semanur Hanım'a mail at (${erp.id})`, sub: 'Formdaki boş/yanlış alanları düzelt, gönder', label: 'Aç', run: () => bus.emit('openErp', erp) };
  if (o('hazir')) return { text: `Sevkiyatı planla (${o('hazir').id})`, sub: 'Fabrikada konteyneri kendin yükleyebilirsin', label: 'Fabrikaya götür', target: DOCK, run: ui('shipping') };
  if (rfqMsg) {
    if (!atDesk()) return { text: `Teklif hazırla: ${rfqMsg.from.replace(/^.*?: /, '')}`, sub: 'Teklifler masandan hazırlanır (Bostancı 2. kat)', label: 'Masaya götür', target: DESK, run: () => runAction(rfqMsg, rfqMsg.actions.find((a) => a.act === 'openOffer')) };
    return { text: 'Teklifi hazırla ve gönder', sub: 'İpucu: önce Serkan Bey\'e maliyet ve termin sor', label: 'Teklif ekranını aç', run: () => runAction(rfqMsg, rfqMsg.actions.find((a) => a.act === 'openOffer')) };
  }
  if (unreadWork) return { text: 'Cevap bekleyen mesaj var', sub: unreadWork.subject, label: 'Aç', run: () => bus.emit('ui', 'inbox', unreadWork.ch, unreadWork.id) };
  if (!G.chars.serkan.met && G.chapter === 1) { const t = nearChar('serkan') || { loc: 'factory', x: 8, z: -13.4 }; return { text: 'Fabrikaya git, Serkan Bey\'le tanış', sub: 'Fabrika müdürü; maliyet ve terminin adresi', label: 'Götür ve konuş', target: t, run: ui('talk', 'serkan') }; }
  const pend = orders.find((x) => x.status === 'erp' && x.erp?.pending);
  if (pend) return { text: 'Semanur Hanım formu inceliyor', sub: 'Birkaç saat sürer. Hızı 3x yapabilirsin.', label: '3x hız', run: () => { G.speed = 3; } };
  const av = o('avans');
  if (av) return { text: `Avans bekleniyor (${av.id})`, sub: `Tahmini ${time.shortDate(av.advDay)}. Beklerken hızı 3x yapabilirsin.`, label: '3x hız', run: () => { G.speed = 3; } };
  const pr = o('uretim');
  if (pr) return { text: `Üretim sürüyor (${pr.id} · %${Math.round(orderProgress(pr) * 100)})`, sub: 'Fabrikada istasyon halkasında durursan sen de çalışırsın', label: 'Fabrikaya götür', target: { loc: 'factory', x: 2, z: -2.6 }, run: null };
  if (orders.some((x) => x.status === 'yolda' || x.status === 'sevk_planlandi')) return { text: 'Ürünler yolda', sub: 'Bu arada yeni müşteri bul: dünya haritasından mail yaz', label: 'Masaya götür', target: DESK, run: ui('world') };
  // Bölüm hedefi
  const g = goalsState().find((x) => !x.done);
  if (g) {
    if (/mail/i.test(g.text) || /müşteri/i.test(g.text)) return { text: g.text, sub: 'Masanda: Dünya haritası → ülke → firma → Mail yaz', label: 'Masaya götür', target: DESK, run: ui('world') };
    if (/toplantı/i.test(g.text)) return { text: g.text, sub: 'Her Pazartesi 09:00, Bostancı 3. kat', label: 'Götür', target: { loc: 'store', floor: 3, x: 3, z: 1 }, run: null };
    if (/fuar/i.test(g.text)) return { text: g.text, sub: 'Masa → Fuarlar → stand kirala', label: 'Aç', run: ui('fairs') };
    return { text: g.text, sub: 'Bölüm hedefi', label: 'Hedefler', run: ui('goals') };
  }
  return { text: 'Yeni müşteri bul', sub: 'Dünya haritasından bir firmaya kısa bir mail yaz', label: 'Masaya götür', target: DESK, run: ui('world') };
}

export function renderGuide(el) {
  const s = nextStep();
  el.classList.toggle('hidden', !s);
  if (!s) return;
  const key = s.text + '|' + s.sub;
  if (el._key === key) return; el._key = key;
  el.innerHTML = '';
  const ch = chapter(); const gs = goalsState();
  el.append(
    h('div', { class: 'gtop', onclick: () => bus.emit('ui', 'goals') }, G.mode === 'free' ? 'Serbest mod · sıradaki adım' : `Bölüm ${ch.id} · ${gs.filter((g) => g.done).length}/${gs.length} · sıradaki adım`),
    h('div', { class: 'gtxt' }, s.text), h('div', { class: 'gsub' }, s.sub),
    h('button', { class: 'btn gold sm', onclick: () => { bus.emit('sfx', 'click'); goTo(s.target, s.run || undefined); el._key = null; } }, s.label + ' →'));
}
export function guideTarget() { return nextStep()?.target || null; }
