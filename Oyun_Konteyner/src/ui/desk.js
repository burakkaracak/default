// Masa (Bostancı 2. kat): Gelen Kutusu, sipariş takip panosu ve CRM işlerinin merkezi.
import { h, panel, toast, stars, progress, choose } from './dom.js';
import { G, family } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { esc, fmtCur, fmtTLk, fmtInt } from '../core/util.js';
import { runAction, unread } from '../crm/inbox.js';
import { STATUS, PAY, lineText, displayStatus, orderProgress, orderStars, sendProforma } from '../crm/orders.js';
import { cust, LEVELS } from '../crm/customers.js';
import { city } from '../world/logistics.js';
import { portraits } from '../characters/portraits.js';
import { toTL } from '../economy/economy.js';

export const deskHooks = { erp: null, offer: null, compose: null };
export const atDesk = () => G.player.loc === 'store' && G.player.floor === 2 && Math.hypot(G.player.x - -6, G.player.z - -2.8) < 2.2;

export function deskPanel() {
  panel({
    id: 'desk', title: 'Masam', icon: '🖥️', size: 'md', sub: 'Bostancı · 2. kat · İhracat ofisi',
    render(b) {
      const big = (icon, title, sub, ui, badge) => h('button', { class: 'card', style: { textAlign: 'left', cursor: 'pointer', position: 'relative' }, onclick: () => bus.emit('ui', ui) }, h('div', { style: { fontSize: '24px' } }, icon), h('h3', {}, title), h('div', { class: 'muted' }, sub), badge ? h('span', { class: 'badge' }, badge) : null);
      b.append(h('div', { class: 'grid3' },
        big('✉️', 'Gelen Kutusu', 'Müşteriler ve İç Yazışmalar', 'inbox', unread() || null),
        big('🌍', 'Müşteri bul', 'Haritadan ülke seç, ilk maili yaz', 'world'),
        big('📋', 'Sipariş panosu', 'Teklif → proforma → ERP → üretim → sevkiyat', 'orders'),
        big('🗓️', 'Günü planla', 'Bugünün işleri ve hatırlatmalar', 'plan'),
        big('📊', 'Finans', 'Kur, nakit, alacaklar', 'finance'),
        big('🏆', 'Hedefler', 'Bölüm hedefleri, görevler, başarımlar', 'goals')));
    },
  });
}

export function inboxPanel(tab = 'musteri', openId) {
  let sel = openId || null;
  const p = panel({
    id: 'inbox', title: 'Gelen Kutusu', icon: '✉️', tab,
    tabs: () => [{ id: 'musteri', label: 'Müşteriler', badge: unread('musteri') || null }, { id: 'ic', label: 'İç Yazışmalar', badge: unread('ic') || null }],
    render(b, api) {
      const list = (G.inbox || []).filter((m) => m.ch === api.tab);
      const left = h('div', { class: 'col', style: { gap: '0' } });
      if (!list.length) left.append(h('p', { class: 'muted' }, api.tab === 'musteri' ? 'Henüz müşteri maili yok. Dünya haritasından bir firmaya ilk maili gönder.' : 'İç yazışma yok.'));
      for (const m of list.slice(0, 80)) {
        left.append(h('div', { class: 'list-item' + (m.read ? '' : ' unread') + (sel === m.id ? ' sel' : ''), style: sel === m.id ? { borderColor: 'var(--gold)' } : {}, onclick: () => { sel = m.id; m.read = true; bus.emit('inboxChanged'); api.refresh(); } },
          m.fromId && portraits[m.fromId] ? h('img', { class: 'portrait', src: portraits[m.fromId] }) : h('div', { class: 'portrait', style: { display: 'grid', placeItems: 'center', fontSize: '18px' } }, m.outgoing ? '↗' : m.ch === 'ic' ? '🏢' : '🏬'),
          h('div', { class: 'grow' }, h('div', { class: 't1' }, m.subject), h('div', { class: 't2' }, (m.outgoing ? '→ ' : '') + m.from + ' · ' + time.shortDate(m.day) + ' ' + time.clock(m.min))),
          !m.done && m.actions?.length ? h('span', { class: 'tag gold' }, 'cevap') : null));
      }
      const m = list.find((x) => x.id === sel);
      const right = h('div', {});
      if (m) {
        right.append(h('div', { class: 'row' }, h('h3', { style: { margin: 0, flex: 1 } }, m.subject), h('span', { class: 'muted' }, time.shortDate(m.day) + ' ' + time.clock(m.min))),
          h('div', { class: 'muted', style: { margin: '4px 0 8px' } }, (m.outgoing ? 'Kime: ' + (m.toName || m.to || '') : 'Kimden: ' + m.from)),
          h('div', { class: 'mail', html: esc(m.body).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') }));
        if (m.actions?.length && !m.done) {
          const ch = h('div', { class: 'choices' });
          for (const a of m.actions) ch.append(h('button', { disabled: a.needDesk && !atDesk(), onclick: () => { runAction(m, a); setTimeout(() => api.refresh(), 30); } }, a.label, a.sub || a.needDesk ? h('small', {}, a.needDesk && !atDesk() ? 'masanda yapılır' : a.sub) : null));
          right.append(h('div', { class: 'sec' }, 'Cevap / eylem'), ch);
        } else if (m.chosen) right.append(h('p', { class: 'muted' }, '✓ ' + m.chosen));
      } else right.append(h('p', { class: 'muted' }, 'Bir mesaj seç.'));
      b.append(h('div', { class: 'split' }, left, right));
    },
  });
  return p;
}

const COLS = [['teklif', 'Teklif'], ['proforma', 'Proforma'], ['avans', 'Avans'], ['erp', 'ERP'], ['uretim', 'Üretim'], ['hazir', 'Sevke hazır'], ['yolda', 'Yolda'], ['tahsil', 'Tahsilat'], ['kapandi', 'Kapandı']];
export function ordersPanel(openId) {
  let sel = openId || null;
  panel({
    id: 'orders', title: 'Sipariş Takip Panosu', icon: '📋', tab: 'pano',
    tabs: [{ id: 'pano', label: 'Pano' }, { id: 'liste', label: 'Liste' }],
    render(b, api) {
      if (sel) return orderDetail(b, api, G.orders.find((o) => o.id === sel), () => { sel = null; api.refresh(); });
      if (api.tab === 'pano') {
        const k = h('div', { class: 'kanban' });
        for (const [st, name] of COLS) {
          const os = G.orders.filter((o) => (st === 'hazir' ? o.status === 'hazir' || o.status === 'sevk_planlandi' || (o.status === 'uretim' && o.fakeDone) : st === 'uretim' ? o.status === 'uretim' && !o.fakeDone : st === 'tahsil' ? o.status === 'tahsil' || o.status === 'teslim' : o.status === st)).slice(-12);
          k.append(h('div', { class: 'colk' }, h('h4', {}, `${name} (${os.length})`), ...os.map((o) => h('div', { class: 'ocard', onclick: () => { sel = o.id; api.refresh(); } }, h('b', {}, o.id + (o.sample ? ' · numune' : '')), h('div', { class: 'muted' }, cust(o.cust)?.name || ''), o.status === 'uretim' ? progress(orderProgress(o)) : null, o.fakeDone ? h('span', { class: 'tag warn' }, 'Harun: tamamlandı') : null))));
        }
        b.append(k, h('p', { class: 'muted' }, 'Bir karta dokunarak siparişin ayrıntısını ve sıradaki adımı aç.'));
      } else {
        const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'No'), h('th', {}, 'Müşteri'), h('th', {}, 'Tutar'), h('th', {}, 'Durum'), h('th', {}, 'Teslim sözü')));
        for (const o of [...G.orders].reverse()) t.append(h('tr', { style: { cursor: 'pointer' }, onclick: () => { sel = o.id; api.refresh(); } }, h('td', {}, o.id), h('td', {}, cust(o.cust)?.name || ''), h('td', {}, fmtCur(o.total, o.cur)), h('td', {}, displayStatus(o)), h('td', {}, time.shortDate(o.promisedDay))));
        b.append(t);
      }
    },
  });
}
export function orderDetail(b, api, o, back) {
  const c = cust(o.cust), cc = city(o.city);
  b.append(h('button', { class: 'btn ghost sm', onclick: back }, '← Pano'),
    h('div', { class: 'row', style: { margin: '10px 0' } }, h('h3', { style: { margin: 0, flex: 1 } }, `${o.id} · ${c?.name || ''}`), h('span', { class: 'tag gold' }, displayStatus(o))),
    h('div', { class: 'kv' },
      h('b', {}, 'Şehir'), h('span', {}, `${cc.flag} ${cc.name}, ${cc.country}`),
      h('b', {}, 'Ürünler'), h('span', {}, o.lines.map((l) => h('div', {}, lineText(l) + ' · ' + fmtCur(l.price, o.cur) + '/adet'))),
      h('b', {}, 'Toplam'), h('span', {}, `${fmtCur(o.total, o.cur)} (≈ ${fmtTLk(toTL(o.total, o.cur))})`),
      h('b', {}, 'Ödeme'), h('span', {}, `${PAY[o.pay]} · Tahsil edilen ${fmtCur(o.paid, o.cur)}`),
      h('b', {}, 'Teslim'), h('span', {}, `${o.incoterm} · söz: ${time.shortDate(o.promisedDay)}`),
      o.wos?.length ? h('b', {}, 'Üretim') : null, o.wos?.length ? h('span', {}, progress(orderProgress(o)), orderStars(o) ? stars(orderStars(o)) : '') : null,
      o.result ? h('b', {}, 'Sonuç') : null, o.result ? h('span', {}, `${o.result.stars}★ · ${o.result.late ? o.result.late + ' gün gecikme' : 'zamanında'}${o.result.wrong ? ' · yanlış ürün!' : ''}`) : null));
  const acts = h('div', { class: 'row', style: { marginTop: '12px' } });
  if (o.status === 'proforma') acts.append(h('button', { class: 'btn gold', onclick: () => { sendProforma(o); toast('Proforma gönderildi.', 'good'); bus.emit('sfx', 'mail'); api.refresh(); } }, 'Proforma gönder'));
  if (o.status === 'erp') acts.append(h('button', { class: 'btn gold', onclick: () => deskHooks.erp?.(o, () => api.refresh()) }, 'ERP formunu hazırla'));
  if (o.status === 'hazir' || (o.status === 'uretim' && o.fakeDone)) acts.append(h('button', { class: 'btn gold', onclick: () => bus.emit('ui', 'shipping') }, 'Sevkiyat planla'));
  if (o.status === 'uretim' && !o.informed && o.harunCaught) acts.append(h('button', { class: 'btn', onclick: () => { o.informed = true; o.promisedDay += 3; toast('Müşteri önceden bilgilendirildi; yeni tarih kabul edildi.', 'good'); bus.emit('informed', o); api.refresh(); } }, 'Müşteriyi gecikme için önceden bilgilendir'));
  b.append(acts);
  if (o.notes?.length) b.append(h('div', { class: 'sec' }, 'Notlar'), ...o.notes.map((n) => h('div', { class: 'muted' }, '• ' + n)));
}
