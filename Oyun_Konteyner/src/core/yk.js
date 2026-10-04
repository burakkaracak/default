// Çeyrek sonu YK toplantısı: rapordaki tutarsızlıkları önceden bul ve düzelt; Davut Bey en küçük hatayı yakalar.
import { G, log } from './state.js';
import { bus } from './bus.js';
import { time, DAYS_PER_SEASON } from './time.js';
import { h, panel, toast, alertBox, confetti } from '../ui/dom.js';
import { fmtTLk, pick, shuffle, chance, randi, clamp } from './util.js';
import { addTrust } from '../characters/approvals.js';
import { addMessage } from '../crm/inbox.js';
import { conf } from './confidence.js';
import { stat, canCelebrate } from './story.js';
import { portraits } from '../characters/portraits.js';
import { receivables } from '../economy/economy.js';

function qSnap() { return { rev: G.stats.revenueTL || 0, orders: G.orders.length, shipped: G.stats.shipped || 0, cust: Object.values(G.customers).filter((c) => c.level >= 3).length, day: G.day }; }
bus.on('dayStart', () => {
  if (!G) return;
  G.qStart ||= qSnap();
  if (time.isQuarterEnd() && G.ykDay !== G.day) {
    G.ykDay = G.day; G.ykDone = false;
    addMessage({ ch: 'ic', from: 'Büşra Karaçak', fromId: 'busra', subject: 'Bugün 15:00: YK toplantısı', body: 'Çeyrek sonu YK toplantısı bugün 15:00\'te, 3. kat toplantı odasında. Raporu hazırla; Davut Bey rakamları tek tek kontrol edecek.', kind: 'hatirlatma' });
  }
});
bus.on('hour', (hr) => {
  if (!G || G.ykDay !== G.day || G.ykDone) return;
  if (hr === 14) toast('Büşra: YK toplantısı 15:00\'te. 3. kata çık.', 'warn', 6000);
  if (hr === 17) { G.ykDone = true; addTrust('davut', -6, 'YK toplantısına gelmedin'); addMessage({ ch: 'ic', from: 'Davut Karaçak', fromId: 'davut', subject: 'YK toplantısı', body: 'Toplantıda yoktun. Raporu Bünyamin sundu. Bir dahakine bekliyorum.', kind: 'uyari' }); G.qStart = qSnap(); }
});
export function ykAvailable() { return G.ykDay === G.day && !G.ykDone && G.min >= 14 * 60 + 30; }
bus.on('tick', () => { if (G && G.player.loc === 'store' && G.player.floor === 3 && ykAvailable() && !G._ykRunning) runYK(); });

export async function runYK() {
  G._ykRunning = true;
  const q = qSnap(), s = G.qStart || { rev: 0, orders: 0, shipped: 0, cust: 0 };
  const truth = [
    ['Çeyrek cirosu', fmtTLk(q.rev - s.rev)],
    ['Yeni sipariş sayısı', String(q.orders - s.orders)],
    ['Gönderilen sevkiyat', String(q.shipped - s.shipped)],
    ['Sipariş veren müşteri', String(q.cust)],
    ['Açık alacaklar', fmtTLk(receivables())],
    ['Dönem', `${time.quarter()}. çeyrek ${time.year()}`],
  ];
  // Hatalı rapor taslağı (asistan hazırlamış)
  const draft = truth.map((r) => ({ k: r[0], ok: r[1], v: r[1], fixed: false }));
  const nErr = randi(2, 3);
  for (const i of shuffle([0, 1, 2, 3, 4, 5]).slice(0, nErr)) {
    const d = draft[i];
    if (i === 5) d.v = `${time.quarter() === 1 ? 4 : time.quarter() - 1}. çeyrek ${time.year()}`;
    else if (i === 0 || i === 4) d.v = d.ok.replace('₺', '$');
    else d.v = String(Math.max(0, (+d.ok || 0) + pick([-2, -1, 1, 2, 3])));
  }
  const t0 = performance.now();
  await new Promise((res) => {
    const p = panel({
      title: 'YK sunumu: son kontrol', icon: '🏛️', size: 'md', modal: true, noClose: true,
      render(b) {
        b.append(h('p', { class: 'muted' }, 'Asistanın hazırladığı raporu kaynak verilerle karşılaştır. Hatalı satıra dokunarak düzelt. Davut Bey en küçük hatayı yakalar!'));
        const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Kalem'), h('th', {}, 'Raporda'), h('th', {}, 'Kaynak veri (ERP/muhasebe)')));
        for (const d of draft) t.append(h('tr', { style: { cursor: 'pointer', background: d.fixed ? '#E1EBDD' : '' }, onclick: () => { if (d.v !== d.ok) { d.v = d.ok; d.fixed = true; bus.emit('sfx', 'click'); } else { d.wrongClick = (d.wrongClick || 0) + 1; toast('Bu satır zaten doğru görünüyor.', 'info', 1500); } p.refresh(); } }, h('td', {}, d.k), h('td', {}, h('b', {}, d.v)), h('td', { class: 'muted' }, d.ok)));
        b.append(t);
      },
      footer(f) { f.append(h('button', { class: 'btn gold', onclick: () => { p.close(); res(); } }, 'Sunuma geç')); },
    });
  });
  const left = draft.filter((d) => d.v !== d.ok);
  const secs = (performance.now() - t0) / 1000;
  time.skip(60); stat('ykMeetings'); G.ykDone = true; G._ykRunning = false;
  let text = '';
  if (left.length) { text = left.map((d) => `“${d.k}: raporda ${d.v} yazıyor, doğrusu ${d.ok}. Bunu nasıl kaçırdın?”`).join('<br>'); addTrust('davut', -3 * left.length, 'rapor hatası'); }
  else { text = '“Rakamlar tutarlı. Tek hata bulamadım. Bu... iyi.”'; addTrust('davut', 6, 'temiz rapor'); bus.emit('achv', 'ykClean'); conf.gain(6, 'Temiz sunum'); }
  // Hedef değerlendirmesi
  const rev = q.rev - s.rev; const target = G.ykTarget || 3000000;
  const hit = rev >= target;
  text += `<br><br><b>Çeyrek hedefi:</b> ${fmtTLk(target)} ciro · Gerçekleşen: ${fmtTLk(rev)} ${hit ? '✓' : '✗'}<br>` + (hit ? '“Hedefi tutturdunuz. Ekibe teşekkür ederim.”' : '“Hedefin altında kaldık. Sebeplerini konuşacağız; ama paniğe gerek yok, planlı ilerleyelim.”');
  if (hit) { addTrust('davut', 4); confetti(50); } 
  if (secs < 25 && !left.length) text += '<br><span class="muted">(Hızlı ve isabetli kontrol: Özgüven +)</span>';
  G.ykTarget = Math.round(Math.max(target * (hit ? 1.25 : 1.05), rev * 1.15) / 100000) * 100000;
  text += `<br><br><b>Yeni çeyrek hedefi:</b> ${fmtTLk(G.ykTarget)}`;
  G.qStart = qSnap();
  await alertBox('YK toplantısı', text, 'Teşekkürler', { portrait: portraits.davut });
  if (canCelebrate()) bus.emit('celebrate');
}

export function meetingTable() {
  if (ykAvailable()) return runYK();
  if (canCelebrate()) return bus.emit('celebrate');
  if (time.dayOfWeek() === 0 && G.flags.meetingWeek !== time.week()) return toast('Haftalık toplantı 09:00–10:30 arası burada yapılır.', 'info');
  alertBox('Toplantı masası', `YK toplantıları her çeyrek sonu (${time.shortDate(Math.ceil(G.day / DAYS_PER_SEASON) * DAYS_PER_SEASON)}) 15:00'te, haftalık sabah toplantısı her Pazartesi 09:00'da burada yapılır.<br><br>Bu çeyreğin ciro hedefi: <b>${fmtTLk(G.ykTarget || 3000000)}</b>`, 'Tamam');
}
