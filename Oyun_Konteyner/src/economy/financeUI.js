// Finans paneli: özet, nakit akışı, alacaklar, kur ve hammadde grafikleri, kredi, pazar payı.
import { h, panel, toast, confirmBox, progress } from '../ui/dom.js';
import { G, B, P } from '../core/state.js';
import { time } from '../core/time.js';
import { fmtTL, fmtTLk, fmtCur, pct } from '../core/util.js';
import { lineChart, barChart } from '../ui/charts.js';
import { receivables, takeLoan, CATS, toTL } from './economy.js';
import { monthlySalaries } from '../factory/production.js';
import { cust } from '../crm/customers.js';
import { marketShare, activeComps } from './competitors.js';
import CITIES from '../data/cities.json';

export function financePanel(tab = 'ozet') {
  panel({
    id: 'finance', title: 'Finans', icon: '📊', tab,
    tabs: [{ id: 'ozet', label: 'Özet' }, { id: 'alacak', label: 'Alacaklar' }, { id: 'kur', label: 'Kur' }, { id: 'ham', label: 'Hammadde' }, { id: 'kredi', label: 'Kredi' }, { id: 'pazar', label: 'Pazar payı' }],
    render(b, api) {
      if (api.tab === 'ozet') {
        const rec = receivables(); const m = G.month;
        const margin = m.income > 0 ? (m.income - m.expense) / m.income : 0;
        b.append(h('div', { class: 'grid3' },
          h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Kasa'), h('h3', {}, fmtTL(G.cash))),
          h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Alacaklar'), h('h3', {}, fmtTLk(rec))),
          h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Bu ay gelir / gider'), h('h3', {}, fmtTLk(m.income) + ' / ' + fmtTLk(m.expense)), h('div', { class: 'muted' }, 'Kâr marjı ' + pct(margin))),
          h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Aylık maaş yükü'), h('h3', {}, fmtTLk(monthlySalaries()))),
          h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Krediler'), h('h3', {}, fmtTLk((G.loans || []).reduce((a, l) => a + l.left, 0)))),
          h('div', { class: 'card' }, h('div', { class: 'muted' }, 'Toplam satış'), h('h3', {}, fmtTLk(G.stats.revenueTL || 0)))));
        const hist = G.month.hist.slice(-10);
        b.append(h('div', { class: 'sec' }, 'Aylık gelir / gider (milyon ₺)'), barChart(hist.map((x) => ({ label: x.name.slice(0, 3), values: [{ v: x.income / 1e6, color: '#9C905C' }, { v: x.expense / 1e6, color: '#B4583E' }] })), { fmt: (v) => v.toFixed(1) }));
        b.append(h('div', { class: 'sec' }, 'Nakit (ay sonları)'), lineChart([{ name: 'Kasa', color: '#2B2D2F', data: hist.map((x, i) => [i + 1, x.cash / 1e6]) }], { fmt: (v) => v.toFixed(1) + 'M', xl: (x) => 'ay ' + x }));
        b.append(h('div', { class: 'sec' }, 'Bu ayın kalemleri'));
        const t = h('table', { class: 't' }); for (const [k, v] of Object.entries(m.byCat || {})) t.append(h('tr', {}, h('td', {}, CATS[k] || k), h('td', { style: { textAlign: 'right', color: v >= 0 ? 'var(--good)' : 'var(--bad)' } }, fmtTL(v)))); b.append(t);
      }
      if (api.tab === 'alacak') {
        const os = G.orders.filter((o) => !['kapandi', 'iptal'].includes(o.status) && o.total - o.paid > 1);
        if (!os.length) b.append(h('p', { class: 'muted' }, 'Açık alacak yok.'));
        const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Sipariş'), h('th', {}, 'Müşteri'), h('th', {}, 'Kalan'), h('th', {}, 'Bugünkü kurla'), h('th', {}, 'Vade')));
        for (const o of os) t.append(h('tr', {}, h('td', {}, o.id), h('td', {}, cust(o.cust)?.name || ''), h('td', {}, fmtCur(o.total - o.paid, o.cur)), h('td', {}, fmtTLk(toTL(o.total - o.paid, o.cur))), h('td', {}, o.balDay ? time.shortDate(o.balDay) : o.status === 'avans' ? 'avans ' + time.shortDate(o.advDay) : 'teslimde')));
        b.append(t, h('p', { class: 'muted' }, 'Alacaklar döviz cinsinden: TL değer kaybederse tahsilat günü daha çok TL eder (kur farkı geliri).'));
      }
      if (api.tab === 'kur') {
        const hs = G.fx.hist.slice(-60);
        b.append(h('div', { class: 'grid3' }, h('div', { class: 'card' }, h('div', { class: 'muted' }, 'USD/TRY'), h('h3', {}, G.fx.USD.toFixed(2))), h('div', { class: 'card' }, h('div', { class: 'muted' }, 'EUR/TRY'), h('h3', {}, G.fx.EUR.toFixed(2))), h('div', { class: 'card' }, h('div', { class: 'muted' }, 'EUR/USD'), h('h3', {}, (G.fx.EUR / G.fx.USD).toFixed(3)))),
          h('div', { class: 'sec' }, 'Son 60 gün'), lineChart([{ name: 'USD', color: '#9C905C', data: hs.map((x) => [x[0], x[1]]) }, { name: 'EUR', color: '#4F6E83', data: hs.map((x) => [x[0], x[2]]) }], { fmt: (v) => v.toFixed(1), xl: (d) => time.shortDate(d), hpx: 200 }),
          G.fxShock ? h('p', { class: 'tag warn' }, 'Kur şu an dalgalı (olay etkisi)') : null,
          h('p', { class: 'muted' }, 'Satışlar USD/EUR, maliyetler TL. Kur yükselirse döviz gelirin TL karşılığı artar ama ithal girdiler (kumaş, sünger) de pahalanır.'));
      }
      if (api.tab === 'ham') {
        const cols = ['#9C905C', '#4F6E83', '#B86A4B', '#7D8A5C', '#2B2D2F', '#C08A2E', '#8C9096', '#B4583E'];
        b.append(lineChart(P.materials.map((m, i) => ({ name: m.name.split(' ')[0], color: cols[i], data: G.mat.hist[m.id].slice(-40).map((v, j) => [j, v / m.priceTL * 100]) })), { fmt: (v) => v.toFixed(0), hpx: 220 }), h('p', { class: 'muted' }, 'Endeks (başlangıç = 100). Ucuzken stok yapmak kârı korur; depo kapasitesine dikkat.'));
      }
      if (api.tab === 'kredi') {
        const loans = G.loans || [];
        if (!loans.length) b.append(h('p', { class: 'muted' }, 'Aktif kredi yok.'));
        for (const l of loans) b.append(h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, (l.rescue ? 'Kurtarma kredisi' : 'Banka kredisi') + ' · ' + fmtTL(l.amount)), h('div', { class: 't2' }, `Kalan ${fmtTL(l.left)} · aylık faiz %${(l.rate * 100).toFixed(1)}`))));
        b.append(h('div', { class: 'sec' }, 'Yeni kredi'));
        for (const amt of [1000000, 2500000, 5000000]) b.append(h('button', { class: 'btn ghost', style: { margin: '4px' }, onclick: async () => { if (await confirmBox('Kredi', `${fmtTL(amt)}, 6 ay vade, aylık faiz %${(B.loanRateMonthly * 100).toFixed(1)}. Onaylıyor musun?`)) { takeLoan(amt, 6); api.refresh(); } } }, fmtTLk(amt)));
        b.append(h('p', { class: 'muted' }, 'İflas yok: kasa eksiye düşerse kurtarma kredisi önerilir. Güven yüksekse Davut Bey bir kez destek verir.'));
      }
      if (api.tab === 'pazar') {
        const comps = activeComps();
        if (!comps.length) b.append(h('p', { class: 'muted' }, 'Henüz rakip sahnede değil (Bölüm 2\'den itibaren).'));
        for (const c of comps) b.append(h('div', { class: 'list-item' }, h('span', { style: { width: '12px', height: '12px', borderRadius: '6px', background: c.color } }), h('div', { class: 'grow' }, h('div', { class: 't1' }, `${c.name} · ${c.type}`), h('div', { class: 't2', style: { whiteSpace: 'normal' } }, c.desc + ' Pazarlar: ' + c.regions.map((r) => CITIES.regions[r]).join(', ')))));
        for (const r of ['kafkasya', 'balkanlar', 'avrupa', 'ortaasya', 'uzakdogu']) {
          const ms = marketShare(r);
          b.append(h('div', { class: 'sec' }, CITIES.regions[r]), h('div', { style: { display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden' } }, ...ms.map((x) => h('div', { title: x.name, style: { width: x.s * 100 + '%', background: x.color } }))), h('div', { class: 'muted' }, ms.map((x) => `${x.name.split(' ')[0]} %${Math.round(x.s * 100)}`).join(' · ')));
        }
        const sh = G.shareHist || [];
        if (sh.length > 1) b.append(h('div', { class: 'sec' }, 'Payımızın gelişimi'), lineChart(['kafkasya', 'balkanlar', 'avrupa'].map((r, i) => ({ name: CITIES.regions[r], color: ['#9C905C', '#4F6E83', '#B86A4B'][i], data: sh.map((x, j) => [j + 1, x[r] * 100]) })), { fmt: (v) => '%' + v.toFixed(0) }));
      }
    },
  });
}
