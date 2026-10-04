// Küçük paneller: oyun menüsü, hedefler, Bünyamin nerede, özgüven, nostalji, sipariş panosu kontrolü, showroom.
import { h, panel, toast, choose, alertBox, confirmBox, stars, progress } from './dom.js';
import { G, P, family, fabric, color as colorOf, log, CH } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { save } from '../core/save.js';
import { fmtTLk, pick } from '../core/util.js';
import { whereIs, locName } from '../characters/npcs.js';
import { portraits } from '../characters/portraits.js';
import { goalsState, chapter, CH_LIST } from '../core/story.js';
import { ABILITIES, conf } from '../core/confidence.js';
import { slotsPanel, settingsPanel } from './menu.js';
import { displayStatus } from '../crm/orders.js';
import { orderReady } from '../world/logistics.js';
import { showroomBeauty } from '../locations/store.js';
import { spend } from '../economy/economy.js';
import { requestApproval, registerApply } from '../characters/approvals.js';
import { woStars } from '../factory/production.js';
import L from '../data/locations.json';

export function gameMenu() {
  const p = panel({
    title: 'Menü', size: 'md', icon: '☰',
    render(b) {
      const w = whereIs('bunyamin');
      b.append(h('div', { class: 'row', style: { marginBottom: '10px', gap: '14px' } },
        h('div', { style: { flex: 1, minWidth: '140px' } }, h('div', { class: 'muted' }, 'Özgüven ' + Math.round(G.player.ozguven)), progress(G.player.ozguven / 100)),
        h('div', { style: { flex: 1, minWidth: '140px' } }, h('div', { class: 'muted' }, 'Analiz ' + Math.round(G.player.analiz)), progress(G.player.analiz / 100)),
        h('div', { class: 'muted' }, '🧭 Bünyamin: ' + (w?.travelling ? 'yolda → ' + locName(w.to) : locName(w?.loc)))));
      const tile = (icon, title, sub, fn) => h('button', { class: 'card', style: { textAlign: 'left', cursor: 'pointer' }, onclick: () => { p.close(); fn(); } }, h('div', { style: { fontSize: '22px' } }, icon), h('b', {}, title), h('div', { class: 'muted' }, sub));
      const ui = (n, ...a) => () => bus.emit('ui', n, ...a);
      b.append(h('div', { class: 'grid3' },
        tile('👥', 'Kadro', 'Karakterler, organizasyon, aile', ui('people')),
        tile('📊', 'Finans', 'Kasa, kur, alacaklar', ui('finance')),
        tile('🏆', 'Hedefler', 'Bölüm, görevler, başarımlar', ui('goals')),
        tile('🗓️', 'Günün gündemi', 'Büşra Hanım\'ın notları', ui('plan')),
        tile('🎪', 'Fuarlar', 'Stand kirala', ui('fairs')),
        tile('📣', 'Pazarlama', 'Katalog, web, Instagram', ui('marketing')),
        tile('🎨', 'Tasarım Stüdyosu', 'Yeni ürünler, trendler', ui('studio')),
        tile('🌱', 'Özgüven', 'Yetenekler', ui('confidence')),
        tile('⚙️', 'Ayarlar', 'Grafik, ses', () => settingsPanel())));
      b.append(h('div', { class: 'row', style: { marginTop: '12px' } },
        h('button', { class: 'btn gold sm', onclick: () => { save.write(); toast('Kaydedildi (Yuva ' + save.slot + ').', 'good'); } }, '💾 Kaydet'),
        h('button', { class: 'btn ghost sm', onclick: () => slotsPanel(true) }, '🗂️ Kayıt yuvaları'),
        h('button', { class: 'btn line sm', onclick: () => { save.write(); p.close(); bus.emit('toMenu'); } }, '⏏︎ Ana menü')),
        h('p', { class: 'muted' }, `Otomatik kayıt açık (30 sn'de bir ve gün sonunda). Yuva ${save.slot}.`));
    },
  });
}

export function whereBun() {
  const w = whereIs('bunyamin');
  const plan = (G.bunPlan || []).map((e) => `${time.clock(e[0] * 60)} ${locName(e[1])}`).join(' → ');
  alertBox('Bünyamin şu an nerede?', `${w.travelling ? '🚗 Yolda → <b>' + locName(w.to) + '</b>' : '📍 <b>' + locName(w.loc) + '</b>'}<br><br><span class="muted">Bugünkü planı: ${plan}</span><br><br>Telefonla arayabilir ya da bulunduğu yere gidip yüz yüze konuşabilirsin (yüz yüze daha etkili).`, 'Tamam', { portrait: portraits.bunyamin }).then(() => {});
}

export function confidencePanel() {
  panel({
    title: 'Özgüven ve Analiz Döngüsü', icon: '🌱', size: 'sm',
    render(b) {
      b.append(h('div', { class: 'row' }, h('b', { style: { width: '80px' } }, 'Özgüven'), h('div', { style: { flex: 1 } }, progress(G.player.ozguven / 100)), h('b', {}, Math.round(G.player.ozguven))),
        h('div', { class: 'row', style: { marginTop: '6px' } }, h('b', { style: { width: '80px' } }, 'Analiz'), h('div', { style: { flex: 1 } }, progress(G.player.analiz / 100)), h('b', {}, Math.round(G.player.analiz))),
        h('p', { class: 'muted' }, 'Karar ekranında (mail, teklif, ERP) uzun beklemek Analiz Döngüsü\'nü doldurur. Karar verip harekete geçmek, sonuç mükemmel olmasa bile Özgüven\'i artırır. "Yeterince iyi" bir mail, hiç gönderilmeyen "mükemmel" mailden her zaman iyidir.'),
        h('div', { class: 'sec' }, 'Yetenekler'));
      for (const a of ABILITIES) b.append(h('div', { class: 'ach' + (conf.has(a.id) ? '' : ' off') }, h('div', { class: 'em' }, conf.has(a.id) ? '🌟' : '🔒'), h('div', {}, h('b', {}, `${a.name} (${a.at})`), h('div', { class: 'muted' }, a.desc))));
    },
  });
}

export function nostalgia() {
  const lines = [
    'Bünyamin\'in eski masası. Çekmecede hâlâ 2019 tarihli bir Bakü fuarı yaka kartı var.',
    'Masanın üstündeki çerçevede Bünyamin ile Burak, ilk fuar standının önünde. İkisi de çok genç ve çok yorgun.',
    'Masanın kenarına kurşun kalemle yazılmış: "Mükemmel değil, gönderilmiş mail kazanır. — B."',
    'Bünyamin\'in bıraktığı kupa hâlâ burada. Üzerinde "Dünyanın en sabırlı ihracat müdürü" yazıyor. Büşra Hanım hediye etmiş.',
  ];
  const t = pick(lines);
  if (!G.flags.nostalgia) { G.flags.nostalgia = true; conf.gain(2, 'Biraz nostalji'); }
  alertBox('Eski ihracat müdürü masası', t + '<br><br><span class="muted">Bünyamin artık Koordinatör ve Satış Direktörü. Ama masası hep burada; "ne olur ne olmaz" diyor.</span>', 'Gülümse', { portrait: portraits.bunyamin });
}

// Sipariş panosu (fabrika): ERP'deki "tamamlandı" işaretlerini kendi gözünle doğrula
export function verifyBoard() {
  const fakes = G.orders.filter((o) => o.fakeDone && !orderReady(o));
  const prod = G.orders.filter((o) => ['uretim', 'hazir'].includes(o.status));
  if (!prod.length) return alertBox('Sipariş panosu', 'Şu an üretimde ya da sevke hazır sipariş yok.', 'Tamam');
  let txt = prod.map((o) => {
    const wos = o.wos.map((id) => G.factory.wos[id]).filter(Boolean);
    const pk = wos.reduce((a, w) => a + w.packed, 0), q = wos.reduce((a, w) => a + w.qty, 0);
    return `• <b>${o.id}</b>: ERP → ${displayStatus(o)} · Gerçek: ${pk}/${q} koli paketli`;
  }).join('<br>');
  alertBox('Sipariş panosu (kendi gözünle)', txt, 'Tamam').then(() => { for (const o of fakes) bus.emit('harunCaught', o, 'board'); });
}

export function goalsPanel() {
  panel({
    title: 'Hedefler ve başarımlar', icon: '🏆', tab: 'bolum',
    tabs: [{ id: 'bolum', label: 'Bölüm' }, { id: 'gorev', label: 'Görevler' }, { id: 'basarim', label: 'Başarımlar' }],
    render(b, api) {
      if (api.tab === 'bolum') {
        if (G.mode === 'free') { b.append(h('p', {}, 'Serbest moddasın: bölüm hedefi yok. Görevler ve başarımlar devam ediyor.')); return; }
        for (const ch of CH_LIST) {
          const cur = ch.id === (G.chapter || 1), done = G.flags['chDone' + ch.id];
          b.append(h('div', { class: 'card', style: { marginBottom: '8px', opacity: ch.id > (G.chapter || 1) ? 0.5 : 1 } }, h('h3', {}, `${done ? '✓ ' : cur ? '▶ ' : '🔒 '}Bölüm ${ch.id}: ${ch.name}`),
            cur ? goalsState().map((g) => h('div', { class: g.done ? 'done muted' : '' }, (g.done ? '✓ ' : '○ ') + g.text)) : h('div', { class: 'muted' }, done ? 'Tamamlandı' : ch.intro)));
        }
      }
      if (api.tab === 'gorev') bus.emit('renderTasks', b);
      if (api.tab === 'basarim') bus.emit('renderAchievements', b);
    },
  });
}

// ---- Showroom ----
export function slotPanel(floor, i) {
  const key = floor + ':' + i;
  const cur = G.showroom.items[key];
  const stock = G.showroom.stock || [];
  const opts = stock.map((s, j) => ({ label: `${family(s.fam).name}${family(s.fam).fabricless ? '' : ' · ' + fabric(s.fabric).name + ' ' + colorOf(s.color).name} · ${'★'.repeat(s.q)}`, value: String(j) }));
  if (cur) opts.unshift({ label: '↩︎ Teşhirdeki ürünü kaldır (stoğa dön)', value: 'remove' });
  if (!opts.length) return alertBox('Teşhir alanı', 'Showroom stoğunda ürün yok.<br><br>Fabrikada "Yeni üretim → Amaç: Showroom teşhiri" ile ürün üret. Üretim bitince burada yerleştirebilirsin.', 'Tamam');
  choose('Teşhir alanı ' + (i + 1), `Güzellik puanı: <b>${showroomBeauty()}</b>/100 · Yabancı alıcı ziyaretlerinde sipariş ihtimalini artırır.`, opts).then((v) => {
    if (v == null) return;
    if (v === 'remove') { stock.push(cur); delete G.showroom.items[key]; }
    else { const it = stock.splice(+v, 1)[0]; if (cur) stock.push(cur); G.showroom.items[key] = it; bus.emit('sfx', 'thud'); }
    bus.emit('showroomChanged');
  });
}
const DECOR = [['Bitki ve çiçek düzeni', 60000], ['Aydınlatma tasarımı', 120000], ['Sanat eserleri ve aksesuar', 180000], ['Koku ve müzik sistemi', 90000], ['Halı koleksiyonu', 140000]];
export function decorPanel() {
  const n = G.showroom.decor || 0;
  const next = DECOR[n];
  alertBox('Showroom dekorasyonu', `Güzellik puanı: <b>${showroomBeauty()}</b>/100<br>Teşhir ürünleri (kalite ve çeşit), dekorasyon ve açık katlar puanı belirler.<br><br>${next ? `Sıradaki: <b>${next[0]}</b> · ${fmtTLk(next[1])}` : 'Bütün dekorasyon yapıldı.'}`, next ? 'Satın al' : 'Tamam').then((ok) => {
    if (!ok || !next) return;
    if (G.cash < next[1]) return toast('Para yetmiyor.', 'bad');
    spend(next[1], 'pazarlama', next[0]); G.showroom.decor = n + 1; bus.emit('showroomChanged'); toast(next[0] + ' tamamlandı. Güzellik: ' + showroomBeauty(), 'good');
  });
}
registerApply('floorUnlock', ({ floor }) => unlockFloorDo(floor));
function unlockFloorDo(floor) {
  const f = L.store.floors[floor]; if (G.showroom.floors[floor]) return;
  if (G.cash < f.costTL) return toast('Kasada para kalmadı.', 'bad');
  spend(f.costTL, 'yatirim', f.name); G.showroom.floors[floor] = true; log(`${f.name} açıldı!`, 'good'); bus.emit('sfx', 'success'); bus.emit('expansion', 'floor' + floor);
}
export async function unlockFloor(floor) {
  const f = L.store.floors[floor];
  if (G.cash < f.costTL) return toast('Kasada yeterli para yok (' + fmtTLk(f.costTL) + ').', 'bad');
  if (await requestApproval({ who: 'davut', type: 'invest', title: f.name, amountTL: f.costTL, act: 'floorUnlock', args: { floor } })) unlockFloorDo(floor);
}
// Showroom üretimi bitince stoğa al
bus.on('woDone', (wo) => {
  if (wo.purpose !== 'showroom') return;
  G.showroom.stock ||= [];
  for (let i = 0; i < wo.qty; i++) G.showroom.stock.push({ fam: wo.fam, fabric: wo.fabric, color: wo.color, q: woStars(wo) || 3 });
  wo.shipped = wo.packed;
  toast(`${wo.qty} ürün showroom stoğuna geldi. Mağazada teşhir alanlarına yerleştir.`, 'good', 5000);
});
