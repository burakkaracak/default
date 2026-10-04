// Gün sonu ve ay sonu raporları, günlük planlama ekranı.
import { h, panel, stars, toast } from './dom.js';
import { G, P, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { fmtTL, fmtTLk, fmtCur, pct } from '../core/util.js';
import { lineChart, barChart } from './charts.js';
import { CATS } from '../economy/economy.js';
import { whereIs, locName } from '../characters/npcs.js';
import { displayStatus } from '../crm/orders.js';
import { cust } from '../crm/customers.js';
import { conf } from '../core/confidence.js';

export function dayReport(sum, onNext) {
  panel({
    id: 'dayReport', title: `Gün sonu · ${time.dayName()} ${time.dateLabel()}`, icon: '🌙', size: 'md', noClose: true, modal: true,
    render(b) {
      b.append(h('div', { class: 'grid3' },
        h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Kasa'), h('h3', {}, fmtTLk(G.cash)), h('div', { class: 'muted', style: { color: sum.net >= 0 ? 'var(--good)' : 'var(--bad)' } }, (sum.net >= 0 ? '+' : '') + fmtTLk(sum.net) + ' bugün')),
        h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Üretilen (paketlenen)'), h('h3', {}, sum.produced + ' birim')),
        h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Kur'), h('h3', {}, `$ ₺${G.fx.USD.toFixed(2)}`), h('div', { class: 'muted' }, `€ ₺${G.fx.EUR.toFixed(2)}`))));
      if (sum.events.length) { b.append(h('div', { class: 'sec' }, 'Bugün neler oldu?')); for (const e of sum.events.slice(0, 10)) b.append(h('div', { style: { margin: '3px 0' } }, (e.kind === 'good' ? '✓ ' : e.kind === 'warn' ? '! ' : '• ') + e.text)); }
      const active = G.orders.filter((o) => !['kapandi', 'iptal'].includes(o.status));
      if (active.length) { b.append(h('div', { class: 'sec' }, 'Açık siparişler')); for (const o of active.slice(0, 6)) b.append(h('div', { class: 'row' }, h('b', {}, o.id), h('span', { class: 'muted', style: { flex: 1 } }, cust(o.cust)?.name || ''), h('span', { class: 'tag' }, displayStatus(o)))); }
      b.append(h('div', { class: 'sec' }, 'Kur (son günler)'), lineChart([{ name: 'USD', color: '#9C905C', data: G.fx.hist.slice(-20).map((x) => [x[0], x[1]]) }, { name: 'EUR', color: '#4F6E83', data: G.fx.hist.slice(-20).map((x) => [x[0], x[2]]) }], { fmt: (v) => v.toFixed(1), hpx: 120 }));
    },
    footer(f, api) { f.append(h('button', { class: 'btn gold', onclick: () => { api.close(); onNext(); } }, 'Sonraki güne geç →')); },
  });
}

export function monthReport(res, onNext) {
  panel({
    id: 'monthReport', title: `Ay sonu raporu · ${time.monthName(G.day)}`, icon: '📈', size: 'md', noClose: true, modal: true,
    render(b) {
      const net = res.income - res.expense;
      b.append(h('div', { class: 'grid3' },
        h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Gelir'), h('h3', { style: { color: 'var(--good)' } }, fmtTLk(res.income))),
        h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Gider'), h('h3', { style: { color: 'var(--bad)' } }, fmtTLk(res.expense))),
        h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Net'), h('h3', {}, (net >= 0 ? '+' : '') + fmtTLk(net)))));
      b.append(h('div', { class: 'sec' }, 'Kalemler'));
      const t = h('table', { class: 't' });
      for (const [k, v] of Object.entries(res.byCat).sort((a, b) => b[1] - a[1])) t.append(h('tr', {}, h('td', {}, CATS[k] || k), h('td', { style: { textAlign: 'right', color: v >= 0 ? 'var(--good)' : 'var(--bad)' } }, fmtTL(v))));
      b.append(t);
      const hist = G.month.hist.slice(-8);
      b.append(h('div', { class: 'sec' }, 'Aylara göre gelir / gider'), barChart(hist.map((m) => ({ label: m.name.slice(0, 3), values: [{ v: m.income / 1e6, color: '#9C905C' }, { v: m.expense / 1e6, color: '#B4583E' }] })), { fmt: (v) => v.toFixed(1) + 'M' }));
    },
    footer(f, api) { f.append(h('button', { class: 'btn gold', onclick: () => { api.close(); onNext(); } }, 'Devam')); },
  });
}

const PLAN_OPTS = { store: '🏬 Mağaza: mail, teklif, CRM', factory: '🏭 Fabrika turu: kontrol, ERP, termin', branch: '🛍️ Şube ziyareti' };
export function dayPlan(onDone) {
  const plan = { am: 'store', pm: 'factory' };
  panel({
    id: 'plan', title: `Günaydın! ${time.dayName()} · ${time.dateLabel()}`, icon: '🗓️', size: 'md', modal: true,
    onClose: () => onDone?.(),
    render(b, api) {
      const items = [];
      for (const a of G.appointments || []) if (a.day === G.day) items.push(`📅 ${time.clock(a.min)} — Davut Bey randevusu: ${a.title} (3. kat)`);
      if (time.dayOfWeek() === 0) items.push('👥 09:00 — Haftalık sabah toplantısı (3. kat toplantı odası)');
      if (G.ykDay === G.day) items.push('🏛️ 15:00 — YK toplantısı: çeyrek sunumu (3. kat)');
      for (const o of G.orders) {
        if (o.status === 'erp' && !o.erp?.pending) items.push(`🗂️ ${o.id}: ERP formu Semanur'a gidecek`);
        if (o.status === 'proforma') items.push(`📄 ${o.id}: proforma gönderilmedi`);
        if (o.status === 'hazir') items.push(`🚢 ${o.id}: sevke hazır, sevkiyat planla`);
        if (o.fakeDone) items.push(`❔ ${o.id}: ERP "tamamlandı" diyor. Gözünle kontrol etmek ister misin?`);
        if (['uretim', 'erp', 'avans'].includes(o.status) && o.promisedDay - G.day <= 4 && o.promisedDay >= G.day) items.push(`⏰ ${o.id}: teslim sözüne ${o.promisedDay - G.day} gün kaldı`);
      }
      for (const f of G.fairBookings || []) if (f.day - G.day <= 3 && f.day >= G.day) items.push(`🎪 ${f.name}: ${f.day - G.day === 0 ? 'bugün!' : f.day - G.day + ' gün sonra'}`);
      const wb = G.bunPlan || [];
      b.append(h('div', { class: 'dlg' }, h('div', { class: 'say' }, h('b', {}, 'Büşra Hanım\'ın notu: '), items.length ? 'Bugünün gündemi:' : 'Bugün takviminde zorunlu bir şey yok. Kendi planını yap.')));
      if (items.length) b.append(h('div', { class: 'card', style: { marginTop: '8px' } }, ...items.slice(0, 9).map((t) => h('div', { style: { margin: '3px 0' } }, t))));
      b.append(h('div', { class: 'sec' }, 'Bünyamin bugün nerede olacak?'), h('div', { class: 'row' }, ...wb.map((e) => h('span', { class: 'tag' }, `${time.clock(e[0] * 60)} ${locName(e[1])}`))));
      b.append(h('div', { class: 'sec' }, 'Günün planı'));
      for (const [k, lbl] of [['am', 'Sabah (08–13)'], ['pm', 'Öğleden sonra (13–20)']]) {
        const row = h('div', { class: 'row', style: { marginBottom: '6px' } }, h('b', { style: { width: '150px' } }, lbl));
        for (const [v, l] of Object.entries(PLAN_OPTS)) row.append(h('button', { class: 'btn sm ' + (plan[k] === v ? 'gold' : 'ghost'), onclick: () => { plan[k] = v; api.refresh(); } }, l));
        b.append(row);
      }
      b.append(h('p', { class: 'muted' }, 'Planına uyarsan (11:00 ve 16:00\'da seçtiğin yerde olursan) küçük bir Özgüven artışı alırsın. Plan bağlayıcı değil.'));
    },
    footer(f, api) { f.append(h('button', { class: 'btn gold', onclick: () => { G.dayPlanSel = { ...plan, day: G.day }; api.close(); } }, 'Güne başla')); },
  });
}
bus.on('hour', (hr) => {
  if (!G?.dayPlanSel || G.dayPlanSel.day !== G.day) return;
  const want = hr === 11 ? G.dayPlanSel.am : hr === 16 ? G.dayPlanSel.pm : null;
  if (!want) return;
  const loc = G.player.loc; const ok = want === 'branch' ? ['nisantasi', 'atasehir'].includes(loc) : loc === want;
  if (ok) { conf.gain(2, 'Plana uydun'); toast('Plana uydun: Özgüven +2', 'good'); }
});
