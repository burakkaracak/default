// Pazarlama: katalog kalitesi, web sitesi ve Instagram paylaşım mini oyunu.
import { h, panel, toast, choose, confetti } from '../ui/dom.js';
import { G, P, family, fabric, color as colorOf } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { fmtTLk, pick, chance, clamp, randi } from '../core/util.js';
import { spend } from '../economy/economy.js';
import { conf } from '../core/confidence.js';
import { addRep } from './outreach.js';
import { stat } from '../core/story.js';
import CITIES from '../data/cities.json';

const CAT = [0, 250000, 600000, 1200000];
const WEB = [0, 300000, 750000];
const CAPTIONS = [
  { t: 'Sabah kahvesi, keten ve güneş. ☕', tone: 'samimi', len: 1 },
  { t: 'Yeni sezon. Yeni dokular. #LiveAndFeel', tone: 'kısa', len: 1 },
  { t: 'Ustalarımızın 3 kuşaklık el emeği: her dikiş bir hikâye.', tone: 'hikaye', len: 2 },
  { t: 'EN UYGUN FİYAT!!! KAÇIRMAYIN!!! İNDİRİM İNDİRİM!!!', tone: 'abartı', len: 1, bad: true },
  { t: 'Kumaş: %100 keten. Ölçü: 220×95 cm. Ayak: masif meşe. Renk seçenekleri: 6. Teslim: 4-6 hafta. İletişim için DM.', tone: 'teknik', len: 3 },
];
export function marketingPanel() {
  G.mkt ||= { catalog: 0, web: 0, posts: [] };
  panel({
    id: 'marketing', title: 'Pazarlama', icon: '📣', size: 'md',
    render(b, api) {
      const m = G.mkt;
      b.append(h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', {}, `📖 Katalog · seviye ${m.catalog}/3`), h('div', { class: 'muted' }, 'Profesyonel çekim ve baskı: mail cevap oranı ve fuar başarısı artar.'), m.catalog < 3 ? h('button', { class: 'btn gold sm', style: { marginTop: '6px' }, onclick: () => up('catalog', CAT, api) }, `Yükselt · ${fmtTLk(CAT[m.catalog + 1])}`) : h('span', { class: 'tag good' }, 'En iyi')),
        h('div', { class: 'card' }, h('h3', {}, `🌐 Web sitesi · seviye ${m.web}/2`), h('div', { class: 'muted' }, 'Çok dilli site: yabancı firmalar seni kendiliğinden bulur (ara sıra gelen talepler).'), m.web < 2 ? h('button', { class: 'btn gold sm', style: { marginTop: '6px' }, onclick: () => up('web', WEB, api) }, `Yükselt · ${fmtTLk(WEB[m.web + 1])}`) : h('span', { class: 'tag good' }, 'En iyi'))));
      b.append(h('div', { class: 'sec' }, '📸 Instagram'), h('p', { class: 'muted' }, `Haftada bir paylaşım yapabilirsin. Doğru ürün, doğru zamanda (trend: ${G.trend?.name || '—'}, sezon: ${time.season()}) ilgi artırır.`));
      const lastWeek = m.lastPostWeek === time.week();
      b.append(h('button', { class: 'btn gold', disabled: lastWeek, onclick: () => post(api) }, lastWeek ? 'Bu hafta paylaşım yapıldı' : 'Yeni paylaşım hazırla'));
      for (const p of m.posts.slice(-5).reverse()) b.append(h('div', { class: 'list-item' }, h('div', { style: { fontSize: '20px' } }, '📸'), h('div', { class: 'grow' }, h('div', { class: 't1' }, p.title), h('div', { class: 't2' }, `${time.shortDate(p.day)} · ❤️ ${p.likes} · ${p.caption}`))));
    },
  });
}
function up(key, arr, api) {
  const lv = G.mkt[key] + 1; const c = arr[lv];
  if (G.cash < c) return toast('Para yetmiyor.', 'bad');
  spend(c, 'pazarlama', key === 'catalog' ? 'Katalog' : 'Web sitesi'); G.mkt[key] = lv; toast('Pazarlama yatırımı yapıldı.', 'good'); api.refresh();
}
async function post(api) {
  const items = [...Object.values(G.showroom.items).filter(Boolean), ...(G.showroom.stock || [])];
  const photos = items.length ? items.slice(0, 5).map((it) => ({ fam: it.fam, fabric: it.fabric, color: it.color, q: it.q, label: `${family(it.fam).name} · ${family(it.fam).fabricless ? '' : fabric(it.fabric).name + ' ' + colorOf(it.color).name}`, real: true }))
    : G.open.families.slice(0, 3).map((f) => ({ fam: f, fabric: 'keten', color: 'krem', q: 3, label: family(f).name + ' (katalog fotoğrafı)', real: false }));
  const ph = await choose('Fotoğraf seç', 'Showroom ve stoktaki ürünlerin gerçek fotoğrafları daha çok ilgi görür.', photos.map((p, i) => ({ label: '📷 ' + p.label, sub: p.real ? '★'.repeat(p.q) : 'stok fotoğrafı', value: String(i) })));
  if (ph == null) return;
  const cap = await choose('Kısa metin', 'Kısa ve samimi metinler genelde iyi çalışır.', CAPTIONS.map((c, i) => ({ label: c.t, value: String(i) })));
  if (cap == null) return;
  const p = photos[+ph], c = CAPTIONS[+cap];
  let s = 0.4 + (p.real ? 0.15 : 0) + p.q * 0.05;
  if (G.trend && (G.trend.fabric === p.fabric || G.trend.fam === p.fam)) s += 0.3;
  if (c.bad) s -= 0.35; if (c.len >= 3) s -= 0.1; if (c.tone === 'hikaye' || c.tone === 'samimi') s += 0.12;
  const likes = Math.round(clamp(s, 0.05, 1.2) * (400 + G.mkt.web * 300 + G.mkt.catalog * 150) * (0.8 + Math.random() * 0.5));
  G.mkt.posts.push({ day: G.day, title: p.label, caption: c.t, likes }); G.mkt.lastPostWeek = time.week();
  conf.decided('post', s > 0.5); stat('posts');
  if (s > 0.6) { for (const ct of CITIES.list.filter((x) => (G.openCities || []).includes(x.id))) addRep(ct.id, 1); confetti(30); }
  G.mkt.buzz = clamp(s, 0, 1);
  toast(`Paylaşım yayında: ❤️ ${likes}. ${s > 0.7 ? 'Harika tutuldu!' : s > 0.45 ? 'Fena değil.' : 'İlgi düşük kaldı.'}`, s > 0.45 ? 'good' : 'info', 5000);
  api.refresh();
}
// Web sitesi ve popüler paylaşımlar ara sıra gelen talep getirir
bus.on('dayStart', () => {
  if (!G?.mkt) return;
  const p = 0.03 * G.mkt.web + 0.04 * (G.mkt.buzz || 0); G.mkt.buzz = (G.mkt.buzz || 0) * 0.7;
  if (chance(p)) {
    const cands = Object.values(G.customers).filter((c) => c.owner === 'burak' && c.level === 0 && (G.openCities || []).includes(c.city) && !c.waiting);
    if (cands.length) { const c = pick(cands); c.waiting = { day: G.day, reply: true, score: 0.6 }; toast(`🌐 ${c.name} web sitenden seni buldu!`, 'good'); }
  }
});
export const catalogBonus = () => (G.mkt?.catalog || 0) * 0.04;
