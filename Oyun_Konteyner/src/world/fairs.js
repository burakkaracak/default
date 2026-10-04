// Fuarlar: takvim, stand kiralama ve tasarımı, fuarda hızlı görüşme mini oyunu, fuar sonrası dolan gelen kutusu.
import { h, panel, toast, alertBox, choose, confetti, modals } from '../ui/dom.js';
import { G, family } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time, DAYS_PER_MONTH } from '../core/time.js';
import { fmtTLk, pick, shuffle, chance, randi } from '../core/util.js';
import { spend } from '../economy/economy.js';
import { requestApproval, registerApply, addTrust, trust } from '../characters/approvals.js';
import { conf } from '../core/confidence.js';
import { stat } from '../core/story.js';
import { setLevel, TYPES, cityOf } from '../crm/customers.js';
import { makeRequest, addRep } from '../crm/outreach.js';
import { addMessage } from '../crm/inbox.js';
import { portraits } from '../characters/portraits.js';
import FAIRS from '../data/fairs.json';
import CITIES from '../data/cities.json';

export function nextFairDay(f) {
  for (let d = G.day + 1; d < G.day + 140; d++) if (time.monthIndex(d) === f.month && time.dayOfMonth(d) === 6) return d;
  return null;
}
const fairOpen = (f) => G.mode === 'free' || (G.chapter || 1) >= f.chapter;

export function fairsPanel() {
  panel({
    id: 'fairs', title: 'Fuarlar', icon: '🎪', size: 'md', sub: 'Stand kirala, ürünlerini seç, fuarda hızlı görüşmeler yap',
    render(b, api) {
      const bk = G.fairBookings || [];
      for (const f of FAIRS.list) {
        const day = nextFairDay(f); const booked = bk.find((x) => x.id === f.id && x.day >= G.day);
        const open = fairOpen(f);
        b.append(h('div', { class: 'list-item', style: { opacity: open ? 1 : 0.5 } }, h('div', { style: { fontSize: '22px' } }, f.big ? '🏛️' : '🎪'),
          h('div', { class: 'grow' }, h('div', { class: 't1' }, `${f.name} · ${f.city}`), h('div', { class: 't2' }, `${day ? time.shortDate(day) + ' (' + (day - G.day) + ' gün sonra)' : '-'} · ${f.big ? 'büyük uluslararası' : 'bölgesel'} · ${f.region === 'all' ? 'tüm bölgeler' : CITIES.regions[f.region]} · m² ${fmtTLk(f.standCost)}`)),
          booked ? h('span', { class: 'tag good' }, 'Stand ayrıldı') : !open ? h('span', { class: 'tag' }, `${f.chapter}. bölüm`) : h('button', { class: 'btn gold sm', disabled: !day || day - G.day < 2, onclick: () => standPanel(f, day, () => api.refresh()) }, 'Stand kirala')));
      }
      b.append(h('p', { class: 'muted' }, 'Büyük fuarlar Davut Bey onayı ister. Özgüvenin 45\'e ulaşınca bölgesel fuarları kendin ayarlayabilirsin. Fuar günü sabah 08:00\'de başlar; o gün fuardasın.'));
    },
  });
}
function standPanel(f, day, after) {
  const st = { size: 1, theme: 'modern', products: G.open.families.slice(0, 2) };
  const p = panel({
    title: `Stand tasarımı · ${f.name}`, icon: '📐', size: 'md',
    render(b, api) {
      const sz = FAIRS.standSizes[st.size];
      b.append(h('div', { class: 'sec' }, 'Stand büyüklüğü'));
      const r1 = h('div', { class: 'row' }); FAIRS.standSizes.forEach((s, i) => r1.append(h('button', { class: 'btn sm ' + (st.size === i ? 'gold' : 'ghost'), onclick: () => { st.size = i; st.products = st.products.slice(0, s.slots); api.refresh(); } }, `${s.name} · ${fmtTLk(s.m2 * f.standCost)}`))); b.append(r1);
      b.append(h('div', { class: 'sec' }, 'Tema'));
      const r2 = h('div', { class: 'row' }); FAIRS.themes.forEach((t) => r2.append(h('button', { class: 'btn sm ' + (st.theme === t.id ? 'gold' : 'ghost'), onclick: () => { st.theme = t.id; api.refresh(); } }, t.name))); b.append(r2);
      b.append(h('div', { class: 'sec' }, `Sergilenecek ürünler (${st.products.length}/${sz.slots})`));
      const r3 = h('div', { class: 'row' }); G.open.families.forEach((id) => { const on = st.products.includes(id); r3.append(h('button', { class: 'btn sm ' + (on ? 'gold' : 'ghost'), onclick: () => { if (on) st.products = st.products.filter((x) => x !== id); else if (st.products.length < sz.slots) st.products.push(id); api.refresh(); } }, family(id).name)); }); b.append(r3);
      const regStyles = f.region === 'all' ? [] : CITIES.list.filter((c) => c.region === f.region).flatMap((c) => Object.keys(c.styles));
      b.append(h('p', { class: 'muted' }, `Bölge tarzları: ${[...new Set(regStyles)].join(', ') || 'karışık'}. Tema ve ürünler bölgeye uyarsa daha çok ziyaretçi gelir. Konaklama ve nakliye: ${fmtTLk(150000)}.`));
    },
    footer(ft) {
      ft.append(h('button', { class: 'btn gold', onclick: async () => {
        const cost = FAIRS.standSizes[st.size].m2 * f.standCost + 150000;
        if (G.cash < cost) return toast('Kasada yeterli para yok (' + fmtTLk(cost) + ').', 'bad');
        const self = !f.big && conf.has('selfFair');
        if (self) { book(f, day, st, cost); bus.emit('achv', 'firstInitiative'); p.close(); after?.(); return toast('Kendi yetkinle fuarı ayarladın!', 'good'); }
        const ok = await requestApproval({ who: 'davut', type: 'invest', title: `${f.name} standı`, amountTL: cost, act: 'fairBook', args: { id: f.id, day, st, cost } });
        if (ok) book(f, day, st, cost);
        p.close(); after?.();
      } }, 'Standı kirala'));
    },
  });
}
function book(f, day, st, cost) {
  if (G.cash < cost) return toast('Fuar için para yetmedi.', 'bad');
  spend(cost, 'fuar', f.name); (G.fairBookings ||= []).push({ id: f.id, name: f.name, day, st, big: f.big, region: f.region });
  toast(`${f.name} standı ayrıldı: ${time.shortDate(day)}.`, 'good'); bus.emit('sfx', 'success');
}
registerApply('fairBook', ({ id, day, st, cost }) => book(FAIRS.list.find((x) => x.id === id), day, st, cost));

// Fuar günü
bus.on('dayStart', () => {
  const f = (G?.fairBookings || []).find((x) => x.day === G.day && !x.done);
  if (f) setTimeout(() => runFair(f), 1200);
});
const NEEDS = [
  { t: 'Otel projemiz için {qty} oda takımı arıyoruz; termin çok önemli.', type: 'otel', right: 'termin' },
  { t: 'Mağazam için yeni bir tedarikçi arıyorum, bu kumaş dokusu ne?', type: 'magaza', right: 'urun' },
  { t: 'Bölgemizde distribütörlük vermeyi düşünür müsünüz?', type: 'distributor', right: 'fiyat' },
  { t: 'Özel ölçü çalışabiliyor musunuz? Müşterim çok spesifik.', type: 'icmimar', right: 'urun' },
  { t: 'Online satıyoruz; kolileme ve parsiyel gönderim nasıl?', type: 'eticaret', right: 'termin' },
  { t: 'Fiyat listeniz var mı? Hacimli alım yaparız.', type: 'distributor', right: 'fiyat' },
  { t: 'Bu standı çok sevdim! Kataloğunuz var mı?', type: 'magaza', right: 'katalog' },
  { t: 'Sadece bakıyorum, kartvizitinizi alabilir miyim?', type: 'icmimar', right: 'katalog' },
];
const PITCH = { urun: '🛋️ Ürünü göster, dokuyu anlat', termin: '⏱️ Termin ve lojistiği konuş', fiyat: '💲 Fiyat ve hacim şartlarını konuş', katalog: '📖 Katalog ver, kartvizit al' };
async function runFair(f) {
  f.done = true; stat('fairs'); if (f.big) stat('bigFairs');
  const def = FAIRS.list.find((x) => x.id === f.id);
  const regStyles = f.region === 'all' ? [] : CITIES.list.filter((c) => c.region === f.region).flatMap((c) => Object.keys(c.styles));
  const fit = (regStyles.includes(f.st.theme) ? 1 : 0) + f.st.products.filter((id) => family(id).styles.some((s) => regStyles.includes(s))).length * 0.4;
  const n = Math.min(9, 4 + f.st.size * 2 + Math.round(fit));
  await alertBox(`🎪 ${f.name} başladı`, `Standın kuruldu: ${FAIRS.standSizes[f.st.size].name}, ${FAIRS.themes.find((t) => t.id === f.st.theme).name}.<br>${trust('bunyamin') > 55 ? 'Bünyamin de yanında; birlikte karşılıyorsunuz.' : ''}<br><br>Ziyaretçiler gelecek. Her birine en uygun yaklaşımı hızlıca seç (8 saniye).`, 'Hazırım', { portrait: portraits.bunyamin });
  let good = 0;
  const visitors = shuffle([...NEEDS]).slice(0, n);
  for (let i = 0; i < visitors.length; i++) {
    const v = visitors[i];
    const t0 = performance.now();
    const pickP = choose(`Ziyaretçi ${i + 1}/${visitors.length} · ${TYPES[v.type].icon} ${TYPES[v.type].name}`, '“' + v.t.replace('{qty}', randi(40, 120)) + '”', shuffle(Object.entries(PITCH)).map(([k, l]) => ({ label: l, value: k })), { modal: true });
    const timer = new Promise((res) => setTimeout(() => res('__late'), 8000));
    const ans = await Promise.race([pickP, timer]);
    if (ans === '__late') { modals.top?.close(); toast('Ziyaretçi beklemeden geçti.', 'info', 1500); continue; }
    if (ans === v.right) { good++; bus.emit('sfx', 'coin'); toast('Güzel görüşme! Kartvizit alındı.', 'good', 1400); }
    else toast('Fena değil ama tam ihtiyacına değinmedin.', 'info', 1400);
  }
  const bonus = trust('bunyamin') > 55 ? 1 : 0;
  const leads = Math.min(def.leads, good + bonus);
  time.skip(Math.max(0, 18 * 60 - G.min));
  // Lead'ler: bölgedeki firmalar ilgilenir
  const pool = Object.values(G.customers).filter((c) => c.owner === 'burak' && c.level <= 1 && (f.region === 'all' || cityOf(c.city).region === f.region) && ((G.openCities || []).includes(c.city) || G.mode === 'free'));
  const chosen = shuffle(pool).slice(0, leads);
  chosen.forEach((c, i) => { setLevel(c, Math.max(1, c.level), 'fuar'); setTimeout(() => {}, 0); (G.custEvents ||= []).push({ cust: c.id, kind: chance(0.5) ? 'rfq' : 'sampleReq', day: G.day + 1 + (i % 3) }); });
  if (f.region !== 'all') for (const c of CITIES.list.filter((x) => x.region === f.region)) addRep(c.id, f.big ? 5 : 3);
  addTrust('bunyamin', 3, 'fuar'); conf.gain(5, 'Fuar tamamlandı');
  confetti(60);
  await alertBox('Fuar sonu', `${visitors.length} ziyaretçiyle görüştün, <b>${good}</b> güçlü görüşme. ${chosen.length} firma seninle çalışmak istiyor; önümüzdeki günlerde gelen kutun dolacak.<br><br>Bölgede marka itibarın arttı.`, 'Harika');
  bus.emit('fairDone', f);
}
