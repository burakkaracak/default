// Fabrika panelleri: istasyonlar, iş emirleri, yeni üretim, depo, kadro, genişleme, sevkiyat.
import { h, panel, toast, choose, confirmBox, stars, progress, goldGlow, confetti } from './dom.js';
import { G, P, B, family, fabric, color as colorOf, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { fmtTL, fmtTLk, fmtInt, pct, fmtCur } from '../core/util.js';
import * as PR from '../factory/production.js';
import { buyMaterial, spend, storageCap, storageUsed } from '../economy/economy.js';
import { time } from '../core/time.js';
import L from '../data/locations.json';
import CITIES from '../data/cities.json';
import { MODES, freightUSD, transitDays, createShipment, city, orderReady } from '../world/logistics.js';
import { boxesFor, autoPack, volumeM3, playContainer } from '../world/container.js';
import { lineText, displayStatus } from '../crm/orders.js';
import { cust } from '../crm/customers.js';
import { portraits } from '../characters/portraits.js';
import { requestApproval, registerApply } from '../characters/approvals.js';

const UPG = [0, 350000, 800000, 1600000];
const purposeName = { order: 'Sipariş', stock: 'Stok', showroom: 'Showroom', sample: 'Numune' };

export function woLabel(wo) {
  const f = family(wo.fam);
  return `${wo.qty} × ${f.name}${f.fabricless ? '' : ' · ' + fabric(wo.fabric).name + ' ' + colorOf(wo.color).name}${wo.size === 'ozel' ? ' · Özel' : ''}`;
}

export function stationPanel(sid) {
  const s = PR.ST[sid];
  panel({
    id: 'station', title: s.name, icon: '🛠️', size: 'md', sub: () => `Seviye ${G.factory.stations[sid].lvl} · Hız ${PR.stationSpeed(sid).toFixed(2)}`,
    render(b, api) {
      const S = G.factory.stations[sid];
      const ws = PR.workersAt(sid);
      b.append(h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', {}, 'Durum'),
          h('div', { class: 'kv' }, h('b', {}, 'Bekleyen'), h('span', {}, PR.inCount(sid) + ' birim'), h('b', {}, 'Çıkış tepsisi'), h('span', {}, PR.outCount(sid) + ' birim'),
            h('b', {}, 'Şu an'), h('span', {}, S.cur ? woLabel(G.factory.wos[S.cur.wo] || { fam: 'kanepe', qty: 1 }).replace(/^\d+ × /, '') + ` (%${Math.round(S.cur.p / S.cur.need * 100)})` : S.block ? 'Malzeme bekliyor: ' + P.materials.find((m) => m.id === S.block)?.name : 'Boşta'),
            h('b', {}, 'Taşıma'), h('span', {}, PR.depocular().length ? 'Depocu (hızlı)' : `Forklift (~${B.autoTransferMinutes} dk) — sen de taşıyabilirsin`))),
        h('div', { class: 'card' }, h('h3', {}, `Ustalar (${ws.length}/${S.lvl})`),
          ws.length ? ws.map((w) => h('div', { class: 'row', style: { marginBottom: '6px' } }, h('img', { class: 'portrait', src: portraits['worker' + (w.look % 5)] }), h('div', { class: 'grow' }, h('b', {}, w.name), h('div', { class: 'muted' }, 'Yetenek ', stars(w.skill), ' · Motivasyon ' + pct(w.motiv))), h('button', { class: 'btn ghost sm', onclick: () => { w.station = null; api.refresh(); bus.emit('staffChanged'); } }, 'Çıkar'))) : h('p', { class: 'muted' }, sid === 'kalite' ? 'Kontrolcü yok: ürünler kontrolsüz geçer (kalite riski).' : 'Usta yok. Alanda durarak sen çalıştırabilirsin.'),
          ws.length < S.lvl ? assignBtn(sid, api) : null)));
      b.append(h('div', { class: 'sec' }, 'Sıradaki işler'));
      if (!S.q.length) b.append(h('p', { class: 'muted' }, 'Sırada iş yok.'));
      for (const e of S.q) { const wo = G.factory.wos[e.wo]; if (wo) b.append(h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, `${e.n} birim · ${woLabel(wo).replace(/^\d+ × /, '')}`), h('div', { class: 't2' }, `${wo.id} · ${purposeName[wo.purpose]}${wo.prio ? ' · ÖNCELİKLİ' : ''}`)))); }
      const nl = S.lvl + 1;
      b.append(h('div', { class: 'sec' }, 'Tezgah seviyesi'), h('p', { class: 'muted' }, 'Seviye; hızı (+%30), kaliteyi ve aynı anda çalışabilecek usta sayısını artırır.'));
      if (nl <= 3) b.append(h('button', { class: 'btn gold', onclick: async () => {
        const cost = UPG[nl];
        if (G.cash < cost) return toast('Kasada yeterli para yok.', 'bad');
        const ok = cost >= 1000000 ? await requestApproval({ who: 'davut', type: 'invest', title: `${s.name} seviye ${nl}`, amountTL: cost, act: 'stationUpg', args: { sid, lvl: nl } }) : true;
        if (!ok) return;
        upgradeStation(sid, nl); api.refresh();
      } }, `Seviye ${nl}'e yükselt · ${fmtTLk(UPG[nl])}`, UPG[nl] >= 1000000 ? ' (Davut onayı)' : ''));
      else b.append(h('p', {}, 'En üst seviyede.'));
    },
  });
}
function assignBtn(sid, api) {
  const free = G.factory.staff.filter((w) => (sid === 'kalite' ? w.role === 'kalite' : w.role === 'usta') && w.station !== sid);
  return h('button', { class: 'btn ghost sm', onclick: async () => {
    if (!free.length) { toast('Boşta uygun çalışan yok. Kadro panelinden işe al.', 'warn'); return; }
    const v = await choose('Kimi atayalım?', '', free.map((w) => ({ label: `${w.name} (yetenek ${w.skill})`, sub: w.station ? 'şu an: ' + PR.ST[w.station].name : 'boşta', value: w.id })));
    if (!v) return; const w = G.factory.staff.find((x) => x.id === v); w.station = sid; bus.emit('staffChanged'); api.refresh();
  } }, '+ Usta ata');
}

export function factoryPanel(tab = 'hat') {
  panel({
    id: 'factory', title: 'Fabrika', icon: '🏭', tab,
    sub: () => G.player.loc === 'factory' ? 'Şu an fabrikadasın' : 'Uzaktan izliyorsun (mağazadayken de üretim sürer)',
    tabs: [{ id: 'hat', label: 'Üretim hattı' }, { id: 'is', label: 'İş emirleri' }, { id: 'depo', label: 'Hammadde' }, { id: 'kadro', label: 'Çalışanlar' }, { id: 'alan', label: 'Genişleme' }],
    render(b, api) {
      if (api.tab === 'hat') {
        const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'İstasyon'), h('th', {}, 'Usta'), h('th', {}, 'Sıra'), h('th', {}, 'Çıkış'), h('th', {}, 'Durum')));
        for (const s of PR.STATIONS) {
          const S = G.factory.stations[s.id], ws = PR.workersAt(s.id);
          t.append(h('tr', { style: { cursor: 'pointer' }, onclick: () => stationPanel(s.id) }, h('td', {}, h('b', {}, s.name), h('div', { class: 'muted' }, 'Sv ' + S.lvl)), h('td', {}, ws.length ? ws.map((w) => w.name.split(' ')[0]).join(', ') : h('span', { class: 'tag warn' }, 'yok')), h('td', {}, PR.inCount(s.id)), h('td', {}, PR.outCount(s.id)),
            h('td', {}, S.block ? h('span', { class: 'tag bad' }, 'Malzeme yok') : S.cur ? progress(S.cur.p / S.cur.need) : h('span', { class: 'muted' }, 'boşta'))));
        }
        b.append(t, h('p', { class: 'muted' }, 'İpucu: Fabrikada bir istasyonun önündeki halkaya girersen o istasyonu sen de çalıştırırsın ve çıkan ürünleri sonraki istasyona taşırsın.'));
      }
      if (api.tab === 'is') {
        b.append(h('div', { class: 'row' }, h('button', { class: 'btn gold', onclick: () => newWOPanel(() => api.refresh()) }, '+ Yeni üretim (stok / showroom)')));
        const wos = Object.values(G.factory.wos).filter((w) => w.packed < w.qty || w.packed > w.shipped).sort((a, b) => (b.prio - a.prio) || a.id.localeCompare(b.id));
        if (!wos.length) b.append(h('p', { class: 'muted' }, 'Aktif iş emri yok.'));
        for (const wo of wos) b.append(h('div', { class: 'list-item' }, h('div', { class: 'grow' },
          h('div', { class: 't1' }, `${wo.id} · ${woLabel(wo)}`),
          h('div', { class: 't2' }, `${purposeName[wo.purpose]}${wo.order ? ' ' + wo.order : ''} · Paketlenen ${wo.packed}/${wo.qty}${wo.qN ? ' · Kalite ' : ''}`, wo.qN ? stars(PR.woStars(wo)) : ''),
          progress(PR.woProgress(wo))),
          wo.packed < wo.qty ? h('button', { class: 'btn ghost sm', onclick: () => { wo.prio = wo.prio ? 0 : 1; api.refresh(); } }, wo.prio ? 'Önceliği kaldır' : 'Öne al') : null,
          wo.purpose === 'showroom' && wo.packed > wo.shipped ? h('span', { class: 'tag gold' }, 'Showroom stoğunda') : null));
      }
      if (api.tab === 'depo') materialsBody(b, api);
      if (api.tab === 'kadro') staffBody(b, api);
      if (api.tab === 'alan') expansionBody(b, api);
    },
  });
}

export function newWOPanel(after, preset = {}) {
  const st = Object.assign({ fam: G.open.families[0], fabric: 'keten', color: 'krem', size: 'std', qty: 4, purpose: 'stock' }, preset);
  const p = panel({
    title: 'Yeni üretim emri', size: 'sm', icon: '🧵',
    render(b) {
      const sel = (key, items) => { const s = h('select', { onchange: (e) => { st[key] = e.target.value; p.refresh(); } }); for (const [v, l] of items) s.append(h('option', { value: v, selected: st[key] === v }, l)); return s; };
      const f = family(st.fam);
      b.append(h('div', { class: 'formgrid' },
        h('b', {}, 'Ürün'), sel('fam', G.open.families.map((id) => [id, family(id).name])),
        f.fabricless ? null : h('b', {}, 'Kumaş'), f.fabricless ? null : sel('fabric', G.open.fabrics.map((id) => [id, fabric(id).name])),
        f.fabricless ? null : h('b', {}, 'Renk'), f.fabricless ? null : sel('color', P.colors.map((c) => [c.id, c.name])),
        h('b', {}, 'Ölçü'), sel('size', P.sizes.map((s) => [s.id, s.name])),
        h('b', {}, 'Adet'), h('input', { type: 'number', min: 1, max: 60, value: st.qty, oninput: (e) => (st.qty = Math.max(1, Math.min(60, +e.target.value || 1))) }),
        h('b', {}, 'Amaç'), sel('purpose', [['stock', 'Stok (siparişlere hazır)'], ['showroom', 'Showroom teşhiri']])));
      const need = PR.matNeeds(st); const miss = Object.entries(need).filter(([k, v]) => (G.mat.stock[k] || 0) < v * st.qty);
      b.append(h('p', { class: 'muted' }, `Tahmini süre: ~${PR.estimateDays(st.fam, st.qty, st.size)} iş günü. `, miss.length ? h('span', { style: { color: 'var(--bad)' } }, 'Dikkat: ' + miss.map(([k]) => P.materials.find((m) => m.id === k).name).join(', ') + ' stoğu yetmeyebilir.') : 'Malzeme yeterli.'));
    },
    footer(f) { f.append(h('button', { class: 'btn gold', onclick: () => { const wo = PR.createWO({ ...st, purpose: st.purpose }); toast(`${wo.id} üretime alındı.`, 'good'); bus.emit('sfx', 'success'); p.close(); after?.(); } }, 'Üretime al')); },
  });
}

function spark(arr, w = 90, hgt = 24) {
  if (!arr?.length) return h('span');
  const mn = Math.min(...arr), mx = Math.max(...arr), r = mx - mn || 1;
  const pts = arr.map((v, i) => `${(i / Math.max(1, arr.length - 1)) * w},${hgt - ((v - mn) / r) * (hgt - 4) - 2}`).join(' ');
  const up = arr[arr.length - 1] >= arr[0];
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', w); s.setAttribute('height', hgt); s.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  s.innerHTML = `<polyline points="${pts}" fill="none" stroke="${up ? '#B4583E' : '#5E7F55'}" stroke-width="1.6"/>`;
  return s;
}
export function materialsBody(b, api) {
  const used = storageUsed(), cap = storageCap();
  b.append(h('p', { class: 'muted' }, 'Hammadde fiyatları her gün dalgalanır. Toplu alım ve stok kararları İbrahim Bey\'le verilir; ucuzken stok yapmak kârı korur.'),
    h('div', { class: 'row' }, h('b', {}, 'Depo doluluğu'), h('div', { style: { flex: 1, minWidth: '120px' } }, progress(used / cap)), h('span', { class: 'muted' }, `${used.toFixed(0)} / ${cap} m³`)));
  const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Malzeme'), h('th', {}, 'Stok'), h('th', {}, 'Fiyat'), h('th', {}, 'Son 30 gün'), h('th', {}, '')));
  for (const m of P.materials) {
    const amt = m.id === 'kereste' ? 2 : m.unit === 'kg' ? 200 : m.unit === 'lt' ? 30 : 100;
    const hist = G.mat.hist[m.id].slice(-30);
    const chg = hist.length > 1 ? (hist[hist.length - 1] / hist[0] - 1) : 0;
    t.append(h('tr', {}, h('td', {}, h('b', {}, m.name)), h('td', {}, `${fmtInt(G.mat.stock[m.id] || 0)} ${m.unit}`), h('td', {}, fmtTL(G.mat.price[m.id]) + '/' + m.unit, h('div', { class: 'muted', style: { color: chg > 0 ? 'var(--bad)' : 'var(--good)' } }, (chg >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(chg), 1))), h('td', {}, spark(hist)),
      h('td', {}, h('button', { class: 'btn ghost sm', onclick: async () => {
        const cost = G.mat.price[m.id] * amt;
        if (storageUsed() > storageCap()) return toast('Depo dolu! Genişleme ile Hammadde Deposu açılabilir.', 'warn');
        const disc = G.flags.ibrahimDeal?.[m.id] && G.flags.ibrahimDeal[m.id] >= G.day ? 0.1 : 0;
        if (cost >= 150000 && G.flags.ibrahimFace !== G.day && !(await requestApproval({ who: 'ibrahim', type: 'material', title: `${amt} ${m.unit} ${m.name}`, amountTL: cost, matId: m.id, act: 'buyMat', args: { id: m.id, amt } }))) return;
        if (!buyMaterial(m.id, amt, disc)) return toast('Kasada yeterli para yok.', 'bad');
        bus.emit('sfx', 'coin'); api.refresh();
      } }, `+${amt} ${m.unit}`))));
  }
  b.append(t);
}

export function staffBody(b, api) {
  const roles = Object.entries(PR.ROLES);
  b.append(h('p', { class: 'muted' }, `Aylık maaş toplamı: ${fmtTL(PR.monthlySalaries())} (her ay sonunda ödenir).`));
  const t = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Ad'), h('th', {}, 'Görev'), h('th', {}, 'Yetenek'), h('th', {}, 'Motivasyon'), h('th', {}, 'Maaş'), h('th', {}, '')));
  for (const w of G.factory.staff) t.append(h('tr', {}, h('td', {}, h('b', {}, w.name), h('div', { class: 'muted' }, w.station ? PR.ST[w.station].name : w.role === 'usta' ? 'boşta' : '')), h('td', {}, PR.ROLES[w.role].name), h('td', {}, stars(w.skill)), h('td', {}, pct(w.motiv)), h('td', {}, fmtTLk(w.salary)),
    h('td', {}, h('div', { class: 'row' },
      w.skill < 5 ? h('button', { class: 'btn ghost sm', onclick: () => { const c = 40000 * w.skill; if (G.cash < c) return toast('Para yetmiyor.', 'bad'); spend(c, 'egitim', 'Eğitim ' + w.name); w.xp += 8 * w.skill; w.motiv = Math.min(1.1, w.motiv + 0.08); if (w.xp >= 12 * w.skill) { w.skill++; w.xp = 0; w.salary = Math.round(w.salary * 1.08 / 500) * 500; } toast(`${w.name} eğitime gönderildi.`, 'good'); api.refresh(); } }, `Eğitim ${fmtTLk(40000 * w.skill)}`) : null,
      w.role === 'usta' ? h('button', { class: 'btn ghost sm', onclick: async () => { const v = await choose('İstasyon seç', '', PR.STATIONS.filter((s) => s.id !== 'kalite').map((s) => ({ label: s.name, sub: `${PR.workersAt(s.id).length}/${G.factory.stations[s.id].lvl}`, value: s.id, disabled: PR.workersAt(s.id).length >= G.factory.stations[s.id].lvl }))); if (v) { w.station = v; bus.emit('staffChanged'); api.refresh(); } } }, 'Ata') : null,
      h('button', { class: 'btn line sm', onclick: async () => { if (await confirmBox('İşten çıkarılsın mı?', `${w.name} ayrılacak; ekip motivasyonu biraz düşer.`, 'Çıkar')) { G.factory.staff.splice(G.factory.staff.indexOf(w), 1); for (const x of G.factory.staff) x.motiv = Math.max(0.55, x.motiv - 0.04); bus.emit('staffChanged'); api.refresh(); } } }, '×')))));
  b.append(t, h('div', { class: 'sec' }, 'İşe alım'));
  if (!G.candidates || G.candidatesDay !== time.week()) { G.candidates = []; for (const [r] of roles) for (let i = 0; i < 2; i++) G.candidates.push(PR.newWorker(r)); G.candidatesDay = time.week(); }
  const g = h('div', { class: 'grid3' });
  for (const c of G.candidates) g.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('img', { class: 'portrait', src: portraits['worker' + (c.look % 5)] }), h('div', {}, h('b', {}, c.name), h('div', { class: 'muted' }, PR.ROLES[c.role].name))),
    h('div', { class: 'muted', style: { margin: '6px 0' } }, PR.ROLES[c.role].desc), h('div', {}, 'Yetenek ', stars(c.skill)), h('div', { class: 'muted' }, 'Maaş: ' + fmtTL(c.salary) + '/ay'),
    h('button', { class: 'btn gold sm', style: { marginTop: '6px' }, onclick: () => {
      const fee = c.salary * 0.5; if (G.cash < fee) return toast('İşe alım masrafı için para yetmiyor.', 'bad');
      spend(fee, 'maas', 'İşe alım'); const w = Object.assign(c, { id: 'w' + G.factory.nextStaff++ });
      if (w.role === 'kalite') w.station = PR.workersAt('kalite').length < G.factory.stations.kalite.lvl ? 'kalite' : null;
      if (w.role === 'usta') { const s = PR.STATIONS.find((s) => s.id !== 'kalite' && PR.workersAt(s.id).length < G.factory.stations[s.id].lvl); w.station = s?.id || null; }
      G.factory.staff.push(w); G.candidates.splice(G.candidates.indexOf(c), 1); log(`${w.name} işe alındı (${PR.ROLES[w.role].name}).`, 'good'); bus.emit('staffChanged'); bus.emit('hired', w); bus.emit('sfx', 'success'); api.refresh();
    } }, 'İşe al')));
  b.append(g, h('p', { class: 'muted' }, 'Aday listesi her hafta yenilenir. İşe alım masrafı yarım maaştır.'));
}

export function expansionBody(b, api) {
  for (const e of L.factory.expansions) {
    const open = G.factory.areas[e.id];
    b.append(h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, (open ? '✓ ' : '🔒 ') + e.name), h('div', { class: 'muted', style: { whiteSpace: 'normal' } }, e.desc)),
      open ? h('span', { class: 'tag good' }, 'Açık') : h('button', { class: 'btn gold sm', onclick: () => buyExpansion(e.id, api) }, fmtTLk(e.costTL))));
  }
  b.append(h('p', { class: 'muted' }, 'Yatırımlar Davut Bey\'in onayına gider (randevu Büşra Hanım üzerinden).'));
}
export async function buyExpansion(id, api) {
  const e = L.factory.expansions.find((x) => x.id === id);
  if (G.factory.areas[id]) return;
  if (G.cash < e.costTL) return toast('Kasada yeterli para yok (' + fmtTLk(e.costTL) + ').', 'bad');
  const ok = await requestApproval({ who: 'davut', type: 'invest', title: e.name, amountTL: e.costTL, act: 'expansion', args: { id } });
  if (!ok) return;
  doExpansion(id); api?.refresh?.();
}
export function doExpansion(id) {
  const e = L.factory.expansions.find((x) => x.id === id);
  if (G.factory.areas[id]) return;
  if (G.cash < e.costTL) { toast(e.name + ' için kasada para kalmadı.', 'bad'); return; }
  spend(e.costTL, 'yatirim', e.name); G.factory.areas[id] = true;
  log(`${e.name} açıldı!`, 'good'); bus.emit('sfx', 'success'); confetti(50);
  bus.emit('expansion', id);
}
export function upgradeStation(sid, nl) {
  const S = G.factory.stations[sid]; const cost = UPG[nl];
  if (S.lvl >= nl) return;
  if (G.cash < cost) { toast('Yükseltme için para yetmiyor.', 'bad'); return; }
  spend(cost, 'yatirim', PR.ST[sid].name + ' yükseltme'); S.lvl = nl; log(`${PR.ST[sid].name} seviye ${nl} oldu.`, 'good'); bus.emit('sfx', 'success');
}

// ---------------- Sevkiyat ----------------
export function shippingPanel() {
  const atFactory = G.player.loc === 'factory';
  const sel = new Set();
  const p = panel({
    id: 'shipping', title: 'Sevkiyat', icon: '🚢', size: 'md',
    sub: atFactory ? 'Sevkiyat alanındasın: konteyneri kendin yükleyebilirsin.' : 'Uzaktan planlıyorsun: depocu yarın sabah otomatik yükler.',
    render(b) {
      const ready = G.orders.filter((o) => o.status === 'hazir' || (o.status === 'uretim' && o.fakeDone));
      if (!ready.length) { b.append(h('p', {}, 'Sevke hazır sipariş yok.'), h('p', { class: 'muted' }, 'Sipariş üretimi bitince (paketleme tamamlanınca) burada görünür.')); }
      const cityId = sel.size ? G.orders.find((o) => o.id === [...sel][0]).city : null;
      for (const o of ready) {
        const c = cust(o.cust); const real = orderReady(o);
        if (atFactory && o.fakeDone && !real) { setTimeout(() => bus.emit('harunCaught', o, 'dock'), 50); continue; }
        const dis = cityId && o.city !== cityId;
        b.append(h('label', { class: 'list-item', style: { opacity: dis ? 0.4 : 1 } },
          h('input', { type: 'checkbox', checked: sel.has(o.id), disabled: dis, onchange: (e) => { e.target.checked ? sel.add(o.id) : sel.delete(o.id); p.refresh(); } }),
          h('div', { class: 'grow' }, h('div', { class: 't1' }, `${o.id} · ${c?.name || ''} · ${city(o.city).flag} ${city(o.city).name}`), h('div', { class: 't2' }, o.lines.map(lineText).join(' + ')),
            h('div', { class: 't2' }, `${o.incoterm} · Söz verilen teslim: ${time.shortDate(o.promisedDay)}`, atFactory && !real ? h('span', { class: 'tag bad', style: { marginLeft: '6px' } }, 'Kolilerin hepsi yok!') : '')),
          h('span', { class: 'tag ' + (o.fakeDone ? 'warn' : 'good') }, displayStatus(o))));
      }
      if (!sel.size) return;
      const ids = [...sel]; const boxes = boxesFor(ids); const vol = volumeM3(boxes);
      const cc = city(cityId);
      b.append(h('div', { class: 'sec' }, `Taşıma modu → ${cc.name} · ${boxes.length} koli · ${vol.toFixed(1)} m³`));
      const share = ids.reduce((a, id) => a + ({ EXW: 0, FOB: 0.25, CIF: 1 }[G.orders.find((o) => o.id === id).incoterm] ?? 1), 0) / ids.length;
      for (const [mode, md] of Object.entries(MODES)) {
        const usd = freightUSD(cityId, mode, vol); if (usd == null) continue;
        let fits = true, fill = null;
        if (md.cap) { const r = autoPack(md.cap, boxes, true); fits = r.left === 0; fill = r.fill; }
        b.append(h('div', { class: 'list-item' }, h('span', { style: { fontSize: '22px' } }, md.icon), h('div', { class: 'grow' }, h('div', { class: 't1' }, md.name), h('div', { class: 't2' }, `${transitDays(cityId, mode)} gün · Navlun $${fmtInt(usd)}${md.perM3 ? ' (m³ başına)' : ''} · Bize düşen: $${fmtInt(usd * share)}`),
          fill != null ? h('div', { class: 't2' }, fits ? `Tahmini doluluk %${Math.round(fill * 100)} · koli başı $${fmtInt(usd / boxes.length)}` : 'Bu kolilerin hepsi sığmıyor') : null),
          h('div', { class: 'col' },
            md.cap && atFactory ? h('button', { class: 'btn gold sm', disabled: !fits, onclick: () => { p.close(); loadGame(ids, mode); } }, 'Kendin yükle') : null,
            h('button', { class: 'btn ghost sm', disabled: !fits, onclick: () => {
              if (md.cap && autoPack(md.cap, boxes, false).left > 0) return toast('Depocu bu kolileri bu konteynere sığdıramaz. Büyüğünü seç ya da kendin yükle.', 'warn');
              createShipment({ orderIds: ids, mode, how: 'auto' }); toast('Sevkiyat planlandı: depocu yarın sabah yükleyecek.', 'good'); p.close();
            } }, 'Depocuya bırak'))));
      }
    },
  });
}
function loadGame(ids, mode) {
  const boxes = boxesFor(ids);
  const cap = MODES[mode].cap;
  playContainer({ contType: cap, boxes, title: `${MODES[mode].name} → ${city(G.orders.find((o) => o.id === ids[0]).city).name}`, onDone: (r) => {
    if (!r.ok) return;
    const sh = createShipment({ orderIds: ids, mode, fill: r.fill, how: 'manual' });
    goldGlow(); confetti(70);
    bus.emit('containerLoaded', sh, r.fill);
    toast(`Konteyner mühürlendi! Doluluk %${Math.round(r.fill * 100)}. ${sh.id} yolda.`, 'good', 5000);
  } });
}

registerApply('expansion', ({ id }) => doExpansion(id));
registerApply('stationUpg', ({ sid, lvl }) => upgradeStation(sid, lvl));
registerApply('buyMat', ({ id, amt }) => { if (buyMaterial(id, amt)) toast('Hammadde alındı (İbrahim Bey onayı).', 'good'); });
