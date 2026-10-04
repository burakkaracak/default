// Kadro sosyal katmanı: Kadro paneli (aile ağacı, telefon), haftalık sabah toplantısı, görevler ve yan görevler, şube ekranı.
import { G, CH, charDef, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { pick, fmtTLk, chance } from '../core/util.js';
import { h, panel, alertBox, choose, toast, progress } from '../ui/dom.js';
import { portraits } from './portraits.js';
import { whereIs, locName } from './npcs.js';
import { trust, addTrust, isHere, whoName } from './approvals.js';
import { registerTalk, trustLabel, lineFor, talkTo } from '../ui/talk.js';
import { stat } from '../core/story.js';
import { conf } from '../core/confidence.js';
import { earn } from '../economy/economy.js';
import { addMessage } from '../crm/inbox.js';
import { internal, can, salute } from './comms.js';
import { showroomBeauty } from '../locations/store.js';
import TASKS from '../data/tasks.json';
import * as PR from '../factory/production.js';

// ---------- İstatistik kancaları ----------
bus.on('packed', (wo, n) => { stat('packed_' + wo.fam, n); stat('packedFab_' + wo.fabric, n); });
bus.on('arrived', (to) => stat('visit_' + to));
bus.on('hired', (w) => stat('hired_' + w.role));
bus.on('custLevel', () => stat('levelUps'));
bus.on('offerAccepted', (o) => { if (o.pay !== 'vade') stat('advanceOrders'); });

// ---------- Görevler ----------
function taskDone(t) {
  const c = t.check;
  if (c.stat) return (G.stats[c.stat] || 0) - (t.base || 0) >= c.n;
  if (c.beauty) return showroomBeauty() >= c.beauty;
  if (c.stock) return (G.mat.stock[c.stock[0]] || 0) >= c.stock[1];
  if (c.cash) return G.cash >= c.cash && time.isQuarterEnd();
  if (c.showroomItems) return Object.values(G.showroom.items).filter(Boolean).length >= c.showroomItems;
  return false;
}
export function giveTask(def, from) {
  G.tasks ||= [];
  if (G.tasks.some((t) => t.id === def.id && !t.closed)) return null;
  const t = { ...def, from, given: G.day, due: def.weeks ? G.day + def.weeks * 5 : null, base: def.check.stat ? (G.stats[def.check.stat] || 0) : 0, closed: false };
  G.tasks.push(t);
  bus.emit('taskGiven', t);
  return t;
}
function checkTasks() {
  if (!G?.tasks) return;
  for (const t of G.tasks) {
    if (t.closed) continue;
    if (taskDone(t)) {
      t.closed = true; t.ok = true;
      const r = t.reward || {};
      if (r.trust) addTrust(t.from, r.trust, 'görev');
      if (r.ozguven) conf.gain(r.ozguven, 'Görev tamamlandı');
      if (r.cash) earn(r.cash, 'diger', 'Görev primi');
      stat('tasksDone');
      toast(`✓ Görev tamamlandı: ${t.text}`, 'good', 5000); bus.emit('sfx', 'success');
      internal({ from: t.from, via: can(t.from, 'wa') ? 'wa' : 'mail', subject: 'Teşekkürler: ' + t.text, body: pick(['eline sağlık.', 'tam istediğim gibi olmuş, teşekkürler.', 'gördüm, çok iyi olmuş.']) + (r.cash ? ` Prim: ${fmtTLk(r.cash)}` : ''), kind: 'gorev' });
    } else if (t.due && G.day > t.due) {
      t.closed = true; t.ok = false;
      internal({ from: t.from, via: can(t.from, 'wa') ? 'wa' : 'mail', subject: 'Görev süresi doldu: ' + t.text, body: 'bu sefer yetişmedi, olsun. Bir dahakine.', kind: 'gorev' });
    }
  }
}
bus.on('hour', checkTasks);
bus.on('stat', () => { if (Math.random() < 0.3) checkTasks(); });

bus.on('renderTasks', (b) => {
  const ts = (G.tasks || []).slice().reverse();
  if (!ts.length) b.append(h('p', { class: 'muted' }, 'Henüz görev yok. Haftalık sabah toplantısında ve karakterlerle konuşurken görev alırsın.'));
  for (const t of ts) b.append(h('div', { class: 'list-item', style: { opacity: t.closed ? 0.6 : 1 } }, h('img', { class: 'portrait', src: portraits[t.from] }), h('div', { class: 'grow' }, h('div', { class: 't1', style: { whiteSpace: 'normal' } }, (t.closed ? (t.ok ? '✓ ' : '✗ ') : '○ ') + t.text), h('div', { class: 't2' }, whoName(t.from) + (t.due ? ' · son gün ' + time.shortDate(t.due) : '')))));
});

// Yan görev teklifleri: karakterle konuşurken ara sıra
registerTalk((who) => {
  const list = TASKS.side[who]; if (!list) return [];
  G.sideDone ||= {};
  const def = list.find((q) => !G.sideDone[q.id] && !(G.tasks || []).some((t) => t.id === q.id));
  if (!def || G.flags['sideAsked_' + who] === G.day) return [];
  return [{ label: '🎁 Küçük bir rica', sub: 'yan görev', fn: async (api, say) => {
    G.flags['sideAsked_' + who] = G.day;
    const v = await choose(whoName(who), '“' + def.intro + '”<br><br><b>Görev:</b> ' + def.text, [{ label: 'Tamam, hallederim', value: 'y' }, { label: 'Şu an yetişemem', value: 'n' }], { portrait: portraits[who] });
    if (v === 'y') { G.sideDone[def.id] = true; giveTask(def, who); addTrust(who, 1); say('“Sağ ol. Biliyordum.”'); }
    else say('“Olsun, başka zaman.”');
  } }];
});

// ---------- Haftalık sabah toplantısı ----------
function agenda() {
  const lines = [];
  const busy = PR.STATIONS.map((s) => [s.name, PR.stationLoadMinutes(s.id)]).sort((a, b) => b[1] - a[1])[0];
  lines.push(['serkan', busy[1] > 1500 ? `Kapasite: ${busy[0]} tıkanık, ${Math.round(busy[1] / 60)} saatlik iş var. Yeni termin verirken bana sorun.` : 'Kapasite rahat. Yeni işlere açığız.']);
  const low = Object.entries(G.mat.stock).filter(([k, v]) => v < 30 && ['sunger', 'keten', 'kadife', 'metal'].includes(k));
  lines.push(['ibrahim', low.length ? `Malzeme: ${low.map(([k]) => k).join(', ')} azaldı. Bu hafta alalım.` : 'Malzeme yeterli. Fiyatları izliyorum.']);
  const fair = (G.fairBookings || []).find((f) => f.day >= G.day);
  lines.push(['bunyamin', fair ? `Fuar: ${fair.name} ${time.shortDate(fair.day)}. Standı birlikte hazırlayalım.` : 'Fuar takvimine bakalım; bir sonraki fuara stand almayı düşünelim.']);
  lines.push(['harun', pick(['Finans: açık alacakları bu hafta kapatalım. Avans gelmeden yükleme yok.', 'Üretim ve kasa kontrol altında. Şimdilik.', 'Tedarikçi ödemeleri cuma çıkacak, tahsilatları ona göre takip edelim.'])]);
  return lines;
}
async function runMeeting() {
  G.flags.meetingWeek = time.week();
  stat('meetings'); time.skip(40);
  const ag = agenda();
  await alertBox('Haftalık sabah toplantısı', `<b>Davut Bey:</b> “Günaydın. Kısa tutalım. Fabrikadakiler telefonda, değil mi? Güzel.”<br><br>` + ag.map(([w, t]) => `<b>${whoName(w)}${['serkan', 'ibrahim', 'harun'].includes(w) ? ' (telefonla)' : ''}:</b> ${t}`).join('<br><br>'), 'Not aldım', { portrait: portraits.davut });
  const def = pick(TASKS.meeting.filter((d) => !(G.tasks || []).some((t) => t.id === d.id && !t.closed)));
  if (def) { giveTask(def, 'davut'); await alertBox('Bu haftanın görevi', `<b>Davut Bey:</b> “Burak, senden beklentim: <b>${def.text}</b>. Yapabilirsin.”`, 'Tamam', { portrait: portraits.davut }); }
  addTrust('davut', 2, 'toplantıya katıldın'); addTrust('busra', 1);
}
bus.on('locationEntered', (loc, fl) => maybeMeeting());
bus.on('tick', () => { if (G && G.player.loc === 'store' && G.player.floor === 3 && Math.random() < 0.05) maybeMeeting(); });
function maybeMeeting() {
  if (!G || G.player.loc !== 'store' || G.player.floor !== 3) return;
  if (time.dayOfWeek() !== 0 || G.flags.meetingWeek === time.week()) return;
  if (G.min < 8 * 60 + 50 || G.min > 10 * 60 + 30) return;
  runMeeting();
}
bus.on('hour', (hr) => {
  if (!G) return;
  if (hr === 8 && time.dayOfWeek() === 0 && G.min < 8 * 60 + 10) toast('Büşra: Bugün 09:00\'da haftalık toplantı var (3. kat).', 'info', 6000);
  if (hr === 11 && G.day > 1 && time.dayOfWeek() === 0 && G.flags.meetingWeek !== time.week()) {
    G.flags.meetingWeek = time.week(); addTrust('davut', -2, 'toplantıya gelmedin'); addTrust('busra', -1);
    const def = pick(TASKS.meeting); giveTask(def, 'davut');
    internal({ from: 'busra', via: 'mail', subject: 'Sabah toplantısı özeti', body: `Bugünkü toplantıda sizi göremedik. Özet bilgilerinize sunulur:\n\n${agenda().map(([w, t]) => '• ' + whoName(w) + ': ' + t).join('\n')}\n\nDavut Bey'in talimatı: ${def.text}`, kind: 'toplanti' });
  }
});

// ---------- Kadro paneli ----------
export function peoplePanel(sel) {
  panel({
    id: 'people', title: 'Kadro', icon: '👥', tab: 'kadro',
    tabs: [{ id: 'kadro', label: 'Karakterler' }, { id: 'org', label: 'Organizasyon' }, { id: 'aile', label: 'Aile ağacı' }, { id: 'gorev', label: 'Görevler' }],
    render(b, api) {
      if (api.tab === 'aile') return familyTree(b);
      if (api.tab === 'org') return orgChart(b);
      if (api.tab === 'gorev') return bus.emit('renderTasks', b);
      const g = h('div', { class: 'grid2' });
      for (const c of CH.list) {
        if (c.player) { g.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('img', { class: 'portrait lg', src: portraits[c.id] }), h('div', { class: 'grow' }, h('h3', {}, c.name + ' (sen)'), h('div', { class: 'muted' }, c.title))), h('p', { class: 'muted' }, c.desc))); continue; }
        const w = whereIs(c.id); const t = trust(c.id);
        const called = G.chars[c.id].callDay === G.day;
        g.append(h('div', { class: 'card' },
          h('div', { class: 'row' }, h('img', { class: 'portrait lg', src: portraits[c.id] }), h('div', { class: 'grow' }, h('h3', {}, c.name), h('div', { class: 'muted' }, c.title), h('div', { class: 'muted' }, '📍 ' + (w.travelling ? 'yolda → ' + locName(w.to) : locName(w.loc) + (w.loc === 'store' ? ` (${w.floor}. kat)` : ''))))),
          h('div', { class: 'row', style: { margin: '6px 0' } }, h('span', { class: 'muted' }, 'Güven'), h('div', { style: { flex: 1 } }, progress(t / 100)), h('span', { class: 'tag gold' }, Math.round(t) + ' ' + trustLabel(t))),
          h('div', { class: 'muted', style: { marginBottom: '6px' } }, c.desc),
          h('div', { class: 'muted', style: { marginBottom: '4px' } }, 'Kanallar: ' + (c.channels || []).map((x) => ({ yuz: '🤝 yüz yüze', telefon: '📞 telefon', wa: '💬 WhatsApp', mail: '✉️ mail', randevu: '📅 randevu' }[x])).join(' · ')),
          h('div', { class: 'row' },
            can(c.id, 'telefon') ? h('button', { class: 'btn ghost sm', disabled: called, onclick: () => phoneCall(c.id, api) }, called ? '📞 Bugün aradın' : '📞 Ara') : null,
            can(c.id, 'wa') ? h('button', { class: 'btn ghost sm', disabled: called, onclick: () => waChat(c.id, api) }, '💬 WhatsApp') : null,
            c.id === 'semanur' ? h('button', { class: 'btn ghost sm', onclick: () => { api.close(); bus.emit('ui', 'mailTo', 'semanur'); } }, '✉️ Mail yaz') : null,
            can(c.id, 'yuz') ? (isHere(c.id) ? h('button', { class: 'btn gold sm', onclick: () => { api.close(); talkTo(c.id); } }, '🤝 Yanına git') : h('span', { class: 'muted' }, 'Yüz yüze için ' + (w.travelling ? 'bekle' : locName(w.loc) + '’a git'))) : h('span', { class: 'muted' }, 'Yakın temastan çekinir; sadece mail'))));
      }
      b.append(g, h('p', { class: 'muted' }, 'Telefon anında ama kısa; yüz yüze görüşme zaman alır ama güveni en çok artırır.'));
    },
  });
}
async function waChat(id, api) {
  G.chars[id].callDay = G.day; time.skip(5); addTrust(id, 1);
  const body = id === 'bunyamin' ? bunTip() : id === 'busra' ? pick(['Davut Bey bugün iyi modda, istersen randevu ayarlarım.', 'Takvimine bir not düştüm, unutma 😊', 'Bu hafta toplantıda ilk sırayı sana verdim.']) : lineFor(id);
  internal({ from: 'burak', to: id, via: 'wa', subject: 'Selam', body: 'müsait misin?' });
  internal({ from: id, via: 'wa', subject: 'Cevap', body });
  toast('WhatsApp\'tan yazıştınız (Gelen Kutusu → WhatsApp).', 'info');
  api?.refresh();
}
async function phoneCall(id, api) {
  G.chars[id].callDay = G.day; time.skip(8); addTrust(id, 1);
  let text = lineFor(id);
  if (id === 'bunyamin') text = bunTip();
  text = salute(id, 'burak', 'telefon') + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
  await alertBox('📞 ' + whoName(id), '“' + text + '”', 'Kapat', { portrait: portraits[id] });
  api?.refresh();
}
export function bunTip() {
  const o = G.orders.find((x) => x.status === 'erp' && !x.erp?.pending);
  if (o) return `${o.id} ERP'de bekliyor abi. Semanur Hanım'a formu eksiksiz mail at, tek turda biter.`;
  if (G.orders.some((x) => x.fakeDone)) return 'Harun amcam bir siparişi "bitti" işaretlemiş. Fabrikaya uğra, kendi gözünle bak.';
  const r = (G.inbox || []).find((m) => m.rfq && !m.done && !m.rfq.lost);
  if (r) return `Bekleyen bir teklif isteği var (${r.from}). Mükemmel olmasını bekleme, gönder.`;
  if (Object.values(G.factory.stations).some((s) => s.block)) return 'Bir istasyonda malzeme bitmiş. Babana (İbrahim amca) söyle, stok yapsın.';
  if (!G.factory.staff.some((w) => w.role === 'depocu')) return 'Bir depocu alırsan istasyonlar arası taşıma hızlanır. Forklift yavaş.';
  return pick(['Dünya haritasından yeni bir ülke seç, birkaç firmaya kısa ve samimi mail at.', 'Showroom güzel olursa gelen alıcılar daha kolay sipariş veriyor.', 'Kur yükseliyor; EUR fiyatlı teklifler şu an daha kârlı olabilir.']);
}
registerTalk((who) => who === 'bunyamin' ? [{ label: '💡 Danış', sub: 'ne yapayım?', fn: (api, say) => say('“' + bunTip() + '”') }] : []);
bus.on('arrived', (to) => { const w = whereIs('bunyamin'); if (w && w.loc === to && !w.travelling && !G.flags.bunFound) { G.flags.bunFound = true; bus.emit('achv', 'bunFound'); } });

function orgChart(b) {
  const node = (id, sub) => h('div', { class: 'card', style: { textAlign: 'center', padding: '8px', minWidth: '104px' } }, h('img', { class: 'portrait', src: portraits[id] }), h('div', { style: { fontWeight: 700, fontSize: '12px' } }, charDef(id).name.split(' ')[0]), h('div', { class: 'muted', style: { fontSize: '10.5px' } }, sub));
  const row = (...k) => h('div', { class: 'row', style: { justifyContent: 'center', gap: '8px', flexWrap: 'wrap' } }, ...k);
  const lbl = (t) => h('div', { class: 'muted', style: { textAlign: 'center', margin: '6px 0' } }, t);
  b.append(row(node('davut', 'Patron · YK Başkanı')), lbl('│ doğrudan bağlı │'),
    row(node('burak', 'İhracat (Avrupa-Asya)'), node('bunyamin', 'Koordinatör, Satış Dir.'), node('busra', 'Sekreter')),
    lbl('│ YK üyeleri │'), row(node('harun', 'Üretim · Finans/Muhasebe'), node('ibrahim', 'Satın alma')),
    lbl('│ Harun Bey\'e bağlı (bütün patronlar iş verebilir) │'), row(node('serkan', 'Fabrika Müdürü'), node('semanur', 'ERP Yöneticisi')));
  b.append(h('div', { class: 'sec' }, 'Kim neye karar verir?'), h('div', { class: 'kv' },
    h('b', {}, 'Davut Bey'), h('span', {}, 'Talimatı her şeyden önce gelir. Ek iskonto, vade, yatırım, fuar.'),
    h('b', {}, 'Harun Bey'), h('span', {}, 'Üretim ve finans: tahsilat, ödemeler. İskontoda söz hakkı yok.'),
    h('b', {}, 'İbrahim Bey'), h('span', {}, 'Hammadde ve stok. Maili pek kullanmaz; telefon ya da yüz yüze.'),
    h('b', {}, 'Serkan Bey'), h('span', {}, 'Üretimin bel kemiği: maliyet, fiyatlandırma, termin, ürün bilgisi.'),
    h('b', {}, 'Semanur Hanım'), h('span', {}, 'ERP: sipariş açılış onayı, sipariş/stok durumu. Sadece mail.'),
    h('b', {}, 'Bünyamin'), h('span', {}, 'Günlük konularda istişare (WhatsApp: "abi" / "reis").'),
    h('b', {}, 'Büşra Hanım'), h('span', {}, 'Davut Bey randevuları, takvim, hatırlatmalar (WhatsApp: "kuzen").')));
}
function familyTree(b) {
  const node = (id, sub) => { const c = charDef(id); return h('div', { class: 'card', style: { textAlign: 'center', padding: '8px', cursor: 'pointer', minWidth: '96px' }, onclick: () => alertBox(c.name, `${c.title}<br>Doğum: ${c.born}<br><br>${c.family}`, 'Tamam', { portrait: portraits[id] }) }, h('img', { class: 'portrait', src: portraits[id] }), h('div', { style: { fontWeight: 700, fontSize: '12px' } }, c.name.split(' ')[0]), h('div', { class: 'muted', style: { fontSize: '10.5px' } }, sub || c.born)); };
  const row = (...k) => h('div', { class: 'row', style: { justifyContent: 'center', gap: '8px', flexWrap: 'wrap' } }, ...k);
  const lbl = (t) => h('div', { class: 'muted', style: { textAlign: 'center', margin: '6px 0' } }, t);
  b.append(lbl('Karaçak ailesi · birinci kuşak (kardeşler "abi" der)'),
    row(node('ibrahim', '1972 · en büyük'), node('harun', '1975'), node('davut', '1978')),
    lbl('│ ikinci kuşak (kuzenler) │'),
    row(node('burak', 'İbrahim\'in oğlu'), node('semanur', 'Harun\'un kızı'), node('bunyamin', 'Davut\'un oğlu')),
    lbl('Amca kolu: İsmail Karaçak'), row(node('busra', 'İsmail\'in kızı')),
    lbl('Aileden değil (ama fabrikada aileden çok)'), row(node('serkan', 'Fabrika müdürü')));
}

// ---------- Şube ----------
export function branchDesk(id) {
  const name = id === 'nisantasi' ? 'Nişantaşı' : 'Ataşehir';
  const sales = 40 + Math.round(Math.random() * 60);
  alertBox(`${name} Şube`, `Şube müdürü: “Bu hafta ${sales} ziyaretçi geldi, en çok sorulan ${pick(['bukle berjer', 'antrasit köşe koltuk', 'krem kanepe', 'yemek masası'])}.”<br><br><span class="muted">Şubeler yurt içi satış yapar. Gözlemlerin ihracat kataloğu için ipucu: trend kumaşı ${G.trend ? G.trend.name : 'henüz belirsiz'}.</span>`, 'Teşekkürler');
  if (!G.flags['branchVisit' + id + time.week()]) { G.flags['branchVisit' + id + time.week()] = true; conf.gain(1); }
}
