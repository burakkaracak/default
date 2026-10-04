// Oyun akışı: yeni oyun / yükleme, gün döngüsü, olay bildirimleri, bölüm kutlaması, çevrimdışı ilerleme.
import { G, B, setG, freshState, log, charDef } from './state.js';
import { bus } from './bus.js';
import { time, DAY_START, DAYS_PER_MONTH } from './time.js';
import { save } from './save.js';
import { initFactory, tick as prodTick, monthlySalaries } from '../factory/production.js';
import { initCustomers, cust, custByCity } from '../crm/customers.js';
import { addMessage } from '../crm/inbox.js';
import { makeRFQ } from '../crm/negotiation.js';
import { stepFx, stepMaterials, monthEndSettle, takeLoan } from '../economy/economy.js';
import { W } from '../locations/world3d.js';
import { planBunyamin } from '../characters/npcs.js';
import { toast, alertBox, confetti, goldGlow, choose } from '../ui/dom.js';
import { dayReport, monthReport, dayPlan } from '../ui/reports.js';
import { hud } from '../ui/hud.js';
import { chapter, finishChapter, evaluate, setFlag, stat, goalsState } from './story.js';
import { addTrust } from '../characters/approvals.js';
import { portraits } from '../characters/portraits.js';
import { conf } from './confidence.js';
import CITIES from '../data/cities.json';

let todayLog = [];
export const game = { running: false };

export function newGame(slot, mode) {
  const g = freshState(mode);
  setG(g); save.slot = slot;
  initFactory(g); initCustomers(g);
  g.chapter = mode === 'free' ? 5 : 1;
  g.openCities = CITIES.list.filter((c) => !c.owner && c.chapter <= g.chapter).map((c) => c.id);
  g.today = { income: 0, expense: 0, produced: 0 };
  // Gün 1: Bünyamin mağazada başlar ve öğleden sonra fabrikaya geçer
  g.bunPlan = [[8, 'store'], [12.5, 'factory'], [17, 'store']];
  if (mode !== 'free') seedTutorial(); else seedFree();
  stepFx();
  save.write(slot);
}
function seedTutorial() {
  const c = cust('c1'); c.level = 1; c.sat = 60;
  const rfq = makeRFQ(c, [{ fam: 'kanepe', fabric: 'keten', color: 'bej', size: 'std', qty: 8 }, { fam: 'berjer', fabric: 'kadife', color: 'yesil', size: 'std', qty: 6 }], { target: 0.04, wantDays: 26, payPref: 'avans30', incoPref: 'FOB' });
  addMessage({ ch: 'ic', from: 'Bünyamin Karaçak', fromId: 'bunyamin', subject: 'Bakü\'den sıcak müşteri: Caspian Home', body: 'Kuzen hoş geldin!\n\nBakü\'deki eski tanıdığım Elnur Bey (Caspian Home Interiors) mağazası için **8 kanepe** (keten, bej) ve **6 berjer** (kadife, zeytin yeşili) istiyor. Seni önerdim.\n\nTeklifi masandan hazırla. Birkaç ipucu:\n• Teslim süresini vermeden önce Serkan abiden termin al (telefonda tahmini, fabrikada kesin).\n• İndirim verirsen Harun amcamın onayı lazım. Yazılı iste!\n• Mükemmel olmasını bekleme; makul bir teklif yeter.\n\nKolay gelsin,\nBünyamin', kind: 'rfq', rfq, actions: [{ label: 'Teklifi hazırla', act: 'openOffer', needDesk: true, sub: 'pazarlık ekranı' }] });
  addMessage({ ch: 'ic', from: 'Büşra Karaçak', fromId: 'busra', subject: 'Hoş geldin + takvim', body: 'Burak Bey, hoş geldiniz.\n\n• Haftalık sabah toplantısı her Pazartesi 09:00, 3. kat.\n• Davut Bey ile görüşmek için randevuyu benden alabilirsiniz.\n• Yatırım talepleri Davut Bey onayına gider.\n\nİyi çalışmalar.', kind: 'bilgi' });
}
function seedFree() {
  for (const id of ['c1', 'c6', 'c10', 'c25', 'c29']) { const c = cust(id); if (c) { c.level = 1; c.sat = 55; } }
  addMessage({ ch: 'ic', from: 'Bünyamin Karaçak', fromId: 'bunyamin', subject: 'Serbest mod', body: 'Bütün pazarlar açık, kasa dolu. Dünya haritasından istediğin ülkeye gir, firmalara yaz, fuarlara katıl. Kolay gelsin!', kind: 'bilgi' });
}

export function startLoaded() {
  // Eski kayıtlar için eksik alanları tamamla
  G.today ||= { income: 0, expense: 0, produced: 0 };
  G.flags ||= {}; G.stats ||= {}; G.inbox ||= [];
  time.dayEnded = false;
  if (!G.bunPlan) planBunyamin();
  offlineProgress();
}
// Oyuncu yokken üretim sürer (üst sınırlı)
function offlineProgress() {
  const away = (Date.now() - (G.savedAt || Date.now())) / 1000;
  if (away < 120) return;
  const capMin = Math.min(away / B.time.realSecondsPerDay * 720 * 0.5, B.offlineMaxHours * 60);
  if (capMin < 10) return;
  const before = G.stats.produced || 0;
  const startDay = G.day;
  let left = capMin;
  while (left > 0) { const st = Math.min(5, left); left -= st; prodTick(st); }
  const made = (G.stats.produced || 0) - before;
  G.offlineSummary = { minutes: Math.round(capMin), made, awayH: (away / 3600).toFixed(1) };
}

export function enterWorld() {
  const p = G.player;
  W.enter(p.loc, { floor: p.floor, x: p.x, z: p.z });
  game.running = true;
  hud.objective = () => {
    if (G.mode === 'free') return null;
    const ch = chapter(); if (!ch) return null;
    const gs = goalsState(); const next = gs.filter((g) => !g.done).slice(0, 2);
    if (!next.length) return { title: `Bölüm ${ch.id}: ${ch.name}`, items: [{ text: 'Tüm hedefler tamam! Davut Bey seni 3. katta bekliyor.', done: false }] };
    return { title: `Bölüm ${ch.id}: ${ch.name} · ${gs.filter((g) => g.done).length}/${gs.length}`, items: next };
  };
  hud.update();
  if (G.offlineSummary) {
    const s = G.offlineSummary; G.offlineSummary = null;
    alertBox('Sen yokken', `${s.awayH} saattir yoktun. Fabrika çalışmaya devam etti (en fazla ${B.offlineMaxHours} oyun saati sayılır).<br><br>• Simüle edilen süre: ${s.minutes} dk<br>• Paketlenen ürün: <b>${s.made}</b>`, 'Harika');
  } else if (G.day === 1 && G.min <= DAY_START + 5 && G.mode !== 'free' && !G.flags.introShown) {
    G.flags.introShown = true;
    setTimeout(() => alertBox('Bölüm 1 · İlk Konteyner', `<b>Bünyamin:</b> "${'Hoş geldin kuzen! Burası Bostancı mağazamız, 2. kat ihracat ofisi. Masana geç, Gelen Kutusu\'nda seni bir müşteri bekliyor.'}"<br><br><span class="muted">Hareket: WASD/oklar ya da ekranda parmağını sürükle. Etkileşim: E ya da sağ alttaki altın düğme.</span>`, 'Başlayalım', { portrait: portraits.bunyamin }), 400);
  }
}

// --------- Gün döngüsü ---------
bus.on('log', () => {});
const _log = log;
bus.on('dayEnd', () => {
  if (!G) return;
  const sum = { net: G.today.income - G.today.expense, produced: G.today.produced, events: G.log.filter((l) => l.d === G.day).slice(0, 12) };
  save.write();
  const goNext = () => {
    const monthEnd = time.isMonthEnd();
    const next = () => {
      time.startNextDay();
      G.today = { income: 0, expense: 0, produced: 0 };
      G.player.loc = 'store'; G.player.floor = 2; G.player.x = -6; G.player.z = -2.2; G.player.carry = [];
      W.enter('store', { floor: 2, x: -6, z: -2.2 });
      save.write();
      dayPlan();
    };
    if (monthEnd) { const res = monthEndSettle(monthlySalaries()); bus.emit('monthEnd', res); monthReport(res, next); } else next();
  };
  dayReport(sum, goNext);
});
bus.on('dayStart', () => {
  stepFx(); stepMaterials();
  // Nakit sıkışması: iflas yok, kurtarma kredisi
  if (G.cash < 0 && !G.flags.rescueOffered) {
    G.flags.rescueOffered = G.day;
    rescue();
  }
  if (G.flags.rescueOffered && G.day - G.flags.rescueOffered > 10) G.flags.rescueOffered = 0;
});
async function rescue() {
  if (G.chars.davut.trust >= 70 && !G.flags.davutRescueUsed) {
    G.flags.davutRescueUsed = true;
    await alertBox('Davut Bey\'den destek', '“Kasa eksiye düştü, biliyorum. Bir kereliğine şirketin kendi kaynağından destek veriyorum. Bunu iyi kullan.”', 'Teşekkürler', { portrait: portraits.davut });
    G.cash += B.rescueLoanTL; log('Davut Bey kurtarma desteği verdi (faizsiz).', 'good'); return;
  }
  const v = await choose('Nakit sıkışıklığı', 'Kasa eksiye düştü. İflas yok; banka kurtarma kredisi önerdi. Aylık faiz %' + (B.loanRateMonthly * 100).toFixed(1) + ', 6 ay vade.', [{ label: 'Kurtarma kredisini al (' + Math.round(B.rescueLoanTL / 1e6 * 10) / 10 + ' Mn ₺)', value: 'y' }, { label: 'Şimdilik idare ederim', value: 'n' }]);
  if (v === 'y') takeLoan(B.rescueLoanTL, 6, B.loanRateMonthly, true);
}

// Bildirimler
bus.on('mail', (m) => { if (!m.outgoing) { bus.emit('sfx', 'mail'); toast(`${m.ch === 'ic' ? '🏢' : '✉️'} ${m.from}: ${m.subject}`, 'info'); } });
bus.on('trust', (id, d, why) => { if (Math.abs(d) >= 2) toast(`${charDef(id).name.split(' ')[0]} güveni ${d > 0 ? '+' : ''}${Math.round(d)}${why ? ' (' + why + ')' : ''}`, d > 0 ? 'good' : 'warn', 2600); });
bus.on('ozguven', (d, why) => { if (d >= 3) toast(`Özgüven +${d}${why ? ' · ' + why : ''}`, 'good', 2400); });
bus.on('ability', (a) => { toast(`🌟 Yeni yetenek: ${a.name} — ${a.desc}`, 'good', 7000); bus.emit('sfx', 'success'); });
bus.on('innerVoice', (t) => bus.emit('voice', t));
bus.on('materialShort', (m) => { if (G.player.loc !== 'factory' || Math.random() < 0.3) toast(`Malzeme bitti: ${m}. İbrahim Bey'le stok konuş (Fabrika → Hammadde).`, 'warn', 5000); });
bus.on('harunFake', (o) => { if (G.chapter >= 1) log(`ERP: ${o.id} "tamamlandı" işaretlendi (Harun).`, 'info'); });
bus.on('harunCaught', async (o, where) => {
  if (!o.fakeDone) return;
  o.fakeDone = false; o.harunCaught = true;
  stat('harunCaught'); addTrust('harun', -1); conf.gain(4, 'Kendi gözünle kontrol ettin');
  bus.emit('achv', 'harunCatch');
  const v = await choose('Kendi gözünle gördün', `ERP'de <b>${o.id}</b> "tamamlandı" görünüyor ama sevkiyat alanında kolilerin hepsi yok. Harun Bey: “Ha o mu... bitti sayılır yeğenim, iki güne çıkar.”<br><br>Müşteriyi önceden bilgilendirirsen itibarını korursun.`, [{ label: 'Müşteriye hemen yaz: kısa gecikme bilgisi', value: 'inform' }, { label: 'Şimdilik bekle', value: 'wait' }], { portrait: portraits.harun });
  if (v === 'inform') { o.informed = true; o.promisedDay = Math.max(o.promisedDay, G.day + 3); toast('Müşteri bilgilendirildi; anlayışla karşıladı.', 'good'); }
});
bus.on('shipFailed', (o) => {
  const c = cust(o.cust);
  if (o.informed) { toast(`${o.id} için tır boş döndü ama müşteri önceden bilgilendirilmişti.`, 'warn'); return; }
  c && (c.sat = Math.max(0, c.sat - 12));
  addMessage({ ch: 'musteri', from: c?.name || 'Müşteri', fromId: o.cust, subject: `Şikayet: ${o.id} sevkiyatı`, body: `Merhaba,\n\nForwarder'ımız yükleme günü fabrikanıza gitti ama ürünler hazır değilmiş. Bize "hazır" denmişti. Bu bizim için ciddi bir sorun.\n\nYeni tarihi bekliyoruz.`, kind: 'sikayet' });
  toast(`Tır geldi ama ${o.id} hazır değildi! ERP'de "tamamlandı" yazıyordu...`, 'bad', 6000);
  log(`${o.id}: Harun'un "bitti" dediği sipariş sevkiyatta yakalandı, müşteri şikayetçi.`, 'warn');
});
bus.on('delivered', (o) => {
  const c = cust(o.cust); const r = o.result;
  const city = CITIES.list.find((x) => x.id === o.city);
  if (!o.sample) { G.stats.regionShip ||= {}; G.stats.regionShip[city.region] = (G.stats.regionShip[city.region] || 0) + 1; G.stats.delivered = (G.stats.delivered || 0) + 1; }
  if (r.wrong) addMessage({ ch: 'musteri', from: c.name, fromId: c.id, subject: `Yanlış ürün: ${o.id}`, body: 'Merhaba,\n\nGelen ürünlerin bir kısmı siparişimizle uyuşmuyor (kumaş/renk/ölçü farklı). İade ve değişim talep ediyoruz.', kind: 'sikayet', order: o.id, actions: [{ label: 'Özür dile, değişimi üstlen (%15 iade maliyeti)', act: 'complaintPay', args: { order: o.id, pct: 0.15 } }, { label: 'İndirimle kabul etmelerini rica et (%8)', act: 'complaintDisc', args: { order: o.id, pct: 0.08 } }] });
  else if (r.stars <= 2) addMessage({ ch: 'musteri', from: c.name, fromId: c.id, subject: `Kalite sorunu: ${o.id}`, body: 'Merhaba,\n\nBazı ürünlerde dikiş ve kaplama sorunları var. Müşterilerimize bu kaliteyi satamayız.', kind: 'sikayet', order: o.id, actions: [{ label: 'Hatalı parçaları yenileriz (%10 maliyet)', act: 'complaintPay', args: { order: o.id, pct: 0.1 } }, { label: 'Fiyat indirimi teklif et (%6)', act: 'complaintDisc', args: { order: o.id, pct: 0.06 } }] });
  else if (r.late > 2 && !o.informed) addMessage({ ch: 'musteri', from: c.name, fromId: c.id, subject: `Gecikme: ${o.id}`, body: `Ürünler ${r.late} gün gecikmeyle geldi. Bir dahaki sefere daha gerçekçi termin rica ederiz.`, kind: 'sikayet', actions: [{ label: 'Özür dile, bir sonraki siparişte öncelik sözü ver', act: 'ack' }] });
  else addMessage({ ch: 'musteri', from: c.name, fromId: c.id, subject: `Teslim alındı: ${o.id} ${'★'.repeat(r.stars)}`, body: `Merhaba,\n\nÜrünler sorunsuz ulaştı. ${r.stars >= 4 ? 'Kalite gerçekten çok iyi, müşterilerimiz bayıldı!' : 'Teşekkürler.'}\n\n${o.sample ? 'Numuneleri değerlendirip size döneceğiz.' : 'Yeni siparişler için görüşelim.'}`, kind: 'teslim' });
  toast(`${o.id} teslim edildi: ${'★'.repeat(r.stars || 0)} ${r.late ? r.late + ' gün gecikme' : 'zamanında'}`, r.wrong || r.stars <= 2 ? 'bad' : 'good', 5000);
});
bus.on('shipDeparted', (sh) => { bus.emit('sfx', 'ship'); });
bus.on('woDone', (wo) => { if (!wo.order) toast(`${wo.id} tamamlandı (${wo.purpose === 'showroom' ? 'showroom için hazır' : 'stokta'}).`, 'good'); });
bus.on('packed', (wo, n) => { if (G.today) G.today.produced += n; });
bus.on('cash', () => {});
bus.on('offerAccepted', () => conf.gain(3, 'Teklif kabul edildi'));
bus.on('chapterStart', (ch) => { for (const id of ch.unlock) (G.openCities ||= []).includes(id) || G.openCities.push(id); });
bus.on('celebrate', async () => {
  const ch = chapter(); if (!ch) return;
  goldGlow(); confetti(120); bus.emit('sfx', 'success');
  await alertBox(`🎉 Bölüm ${ch.id} tamamlandı: ${ch.name}`, `<b>${ch.outro}</b><br><br><span class="muted">Herkes toplantı odasında alkışlıyor. Büşra Hanım pasta getirdi; Harun Bey ilk dilimi aldı.</span>`, 'Teşekkürler!', { portrait: portraits.davut });
  const { next } = finishChapter();
  addTrust('davut', 5); conf.gain(8, 'Bölüm tamamlandı');
  if (next) await alertBox(`Bölüm ${next.id}: ${next.name}`, next.intro, 'Hadi bakalım');
  else await alertBox('Hikaye tamamlandı', 'Live & Feel artık global bir marka. Oyuna serbestçe devam edebilirsin.', 'Devam');
  hud.update();
});
