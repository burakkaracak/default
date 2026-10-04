// ERP mini oyunu: sipariş formundaki eksik/hatalı alanları bulup düzelt, Semanur'a teslim et.
// Semanur Hanım ile sadece mail: birkaç saat sonra döner (eksik varsa soğuk bir notla).
import { h, panel, toast, choose } from '../ui/dom.js';
import { G, P, family, fabric, color as colorOf } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { chance, pick, randi, rand } from '../core/util.js';
import { startProduction, lineText } from './orders.js';
import { addMessage } from './inbox.js';
import { internal } from '../characters/comms.js';
import { isHere, addTrust, trust } from '../characters/approvals.js';
import { portraits } from '../characters/portraits.js';
import { conf } from '../core/confidence.js';
import { stat } from '../core/story.js';

const FIELDS = ['fam', 'size', 'fabric', 'color', 'qty', 'termin', 'drawing'];
const FNAME = { fam: 'Ürün', size: 'Ölçü', fabric: 'Kumaş', color: 'Renk', qty: 'Adet', termin: 'Termin', drawing: 'Çizim' };
const COLD = ['Form eksik; düzeltip tekrar gönderiniz.', 'Çizim alanı boş bırakılamaz.', 'Bu formla sistemde sipariş açamıyorum.', 'Eksik alanlar yine mevcut, formu iade ediyorum.', 'Alanların eksiksiz doldurulmasını rica ederim.'];

function truth(o, i) {
  const l = o.lines[i];
  return { fam: l.fam, size: l.size, fabric: family(l.fam).fabricless ? '-' : l.fabric, color: family(l.fam).fabricless ? '-' : l.color, qty: String(l.qty), termin: String(o.promisedDay), drawing: l.size === 'ozel' ? 'ekli' : 'katalog' };
}
function options(field, o, i) {
  const l = o.lines[i]; const fl = family(l.fam).fabricless;
  switch (field) {
    case 'fam': return G.open.families.map((id) => [id, family(id).name]);
    case 'size': return P.sizes.map((s) => [s.id, s.name]);
    case 'fabric': return fl ? [['-', '—']] : P.fabrics.map((f) => [f.id, f.name]);
    case 'color': return fl ? [['-', '—']] : P.colors.map((c) => [c.id, c.name]);
    case 'qty': { const q = l.qty; return [...new Set([q - 2, q - 1, q, q + 1, q + 2, q * 2].filter((x) => x > 0))].sort((a, b) => a - b).map((x) => [String(x), String(x)]); }
    case 'termin': { const d = o.promisedDay; return [d - 5, d - 3, d, d + 3, d + 5].map((x) => [String(x), time.shortDate(x)]); }
    case 'drawing': return [['katalog', 'Standart katalog'], ['ekli', 'Çizim ekli (ölçülü)']];
  }
}
// Form, siparişten hatalarla doldurulur (aceleyle yazılmış gibi)
function makeForm(o) {
  const errRate = 0.13 + (G.player.analiz > 70 ? 0.05 : 0) - (G.factory.staff.some((w) => w.role === 'satis') ? 0.04 : 0);
  return o.lines.map((l, i) => {
    const t = truth(o, i); const f = {};
    for (const k of FIELDS) {
      f[k] = t[k];
      if ((k === 'fabric' || k === 'color') && t[k] === '-') continue;
      if (chance(errRate)) f[k] = '';
      else if (chance(errRate * 0.6)) { const opts = options(k, o, i).map((x) => x[0]).filter((x) => x !== t[k]); if (opts.length) f[k] = pick(opts); }
    }
    if (l.size === 'ozel' && chance(0.45)) f.drawing = '';
    return f;
  });
}

export function erpPanel(o, after) {
  o.erp ||= { rounds: 0 };
  if (o.erp.pending) return toast('Form Semanur\'da. Cevabını bekle (İç Yazışmalar).', 'info');
  if (!o.erp.form) o.erp.form = makeForm(o);
  const form = o.erp.form;
  conf.startDecision('erp');
  const p = panel({
    id: 'erp', title: 'ERP Sipariş Formu', icon: '🗂️', size: 'md', sub: `${o.id} · Tur ${o.erp.rounds + 1}`,
    onClose: () => conf.endDecision(),
    render(b, api) {
      b.append(h('div', { class: 'card', style: { background: '#FBF8EE' } }, h('h3', {}, 'Müşteriyle anlaşılan (proforma)'), ...o.lines.map((l) => h('div', {}, '• ' + lineText(l))), h('div', { class: 'muted' }, `Teslim sözü: ${time.shortDate(o.promisedDay)} (${o.promisedDay}. gün) · ${o.incoterm}`)));
      b.append(h('p', { class: 'muted' }, 'Formu proformayla karşılaştır. Boş alan Semanur Hanım\'dan döner; yanlış alan ise fark edilmeden üretime gidebilir! Siparişin sistemde açılması için onay ondan gelir; Semanur Hanım ile sadece mailleşilir.'));
      form.forEach((f, i) => {
        b.append(h('div', { class: 'sec' }, `Kalem ${i + 1}`));
        const g = h('div', { class: 'formgrid' });
        for (const k of FIELDS) {
          const s = h('select', { class: f[k] === '' ? 'bad' : '', onchange: (e) => { f[k] = e.target.value; api.refresh(); } });
          s.append(h('option', { value: '', selected: f[k] === '' }, '— boş —'));
          for (const [v, l] of options(k, o, i)) s.append(h('option', { value: v, selected: f[k] === v }, l));
          g.append(h('b', {}, FNAME[k]), s);
        }
        b.append(g);
      });
      if (o.erp.note) b.append(h('div', { class: 'dlg', style: { marginTop: '10px' } }, h('img', { class: 'portrait', src: portraits.semanur }), h('div', { class: 'say' }, o.erp.note)));
    },
    footer(f, api) {
      f.append(h('button', { class: 'btn gold', onclick: () => submit('mesaj', api) }, '✉️ Semanur Hanım\'a mail ile gönder'));
    },
  });
  function review() {
    const blanks = []; const wrong = [];
    form.forEach((f, i) => { const t = truth(o, i); for (const k of FIELDS) { if (f[k] === '') blanks.push({ line: i, field: k }); else if (f[k] !== t[k]) wrong.push({ line: i, field: k, value: f[k] }); } });
    return { blanks, wrong };
  }
  function approve(r, ch) {
    o.erp.rounds++;
    const clean = o.erp.rounds === 1 && !r.wrong.length;
    const wrongProd = r.wrong.filter((w) => ['fam', 'size', 'fabric', 'color'].includes(w.field)).map((w) => ({ line: w.line, field: w.field, value: w.value }));
    // Adet ve termin hataları: ERP'de yanlış görünür ama üretim siparişe göre yapılır; sadece termin karışıklığı not düşülür
    startProduction(o, { clean, wrong: wrongProd });
    if (r.wrong.some((w) => w.field === 'termin')) o.notes.push('ERP\'de termin yanlış girildi; planlama karışabilir.');
    stat('erpApproved'); if (clean) stat('erpClean');
    addTrust('semanur', clean ? 4 : 1, 'ERP');
    conf.decided('erp', clean);
    const praise = clean && trust('semanur') > 60 && chance(0.5);
    const txt = praise ? pick(['Temiz form. Bunu kimseye söyleme.', 'İyi iş. Bir kere söyledim, tekrar bekleme.', 'Formların artık temiz geliyor.']) : clean ? pick(['Girildi.', 'Tamam. Üretime aktarıldı.', 'Bu sefer... kabul edilebilir.']) : 'Girildi. Bir dahakine ilk seferde doğru gelsin.';
    if (praise) bus.emit('semanurPraise');
    bus.emit('erpApproved', o, clean);
    return txt;
  }
  async function submit(ch, api) {
    const r = review();
    if (ch === 'yuz') {
      time.skip(15);
      if (r.blanks.length) {
        o.erp.rounds++; addTrust('semanur', -1);
        o.erp.note = `“${pick(COLD)}” — Eksik: ${[...new Set(r.blanks.map((x) => FNAME[x.field]))].join(', ')}. (Elden verdiğin için hemen söyledi; düzeltip tekrar ver.)`;
        bus.emit('sfx', 'fail'); api.refresh(); return;
      }
      const txt = approve(r, 'yuz');
      api.close(); toast('Semanur: “' + txt + '” → Üretime aktarıldı.', 'good', 5000); bus.emit('sfx', 'success'); after?.();
      return;
    }
    // Mesajla
    o.erp.pending = true; o.erp.due = G.day * 1440 + G.min + randi(120, 240) + (trust('semanur') < 30 ? 60 : 0);
    o.erp.snapshot = r;
    internal({ from: 'burak', to: 'semanur', via: 'mail', subject: `ERP formu: ${o.id}`, body: `${o.id} numaralı siparişin formu ektedir. Sistemde açılması için onayınızı rica ederim.` });
    conf.decided('erp');
    api.close(); toast('Form mail ile gönderildi. Semanur Hanım birkaç saat içinde bakar.', 'info'); after?.();
  }
  return p;
}

// Mesajla gönderilen formların değerlendirmesi
bus.on('tick', () => {
  if (!G) return;
  const nowAbs = G.day * 1440 + G.min;
  for (const o of G.orders) {
    if (o.status !== 'erp' || !o.erp?.pending || nowAbs < o.erp.due) continue;
    o.erp.pending = false;
    const r = o.erp.snapshot;
    if (r.blanks.length) {
      o.erp.rounds++; addTrust('semanur', -1);
      o.erp.note = `“${pick(COLD)}” — Eksik: ${[...new Set(r.blanks.map((x) => FNAME[x.field]))].join(', ')}.`;
      internal({ from: 'semanur', via: 'mail', subject: `İADE: ${o.id} ERP formu`, body: o.erp.note.replace(/[“”]/g, '') + '\n\nDüzeltip tekrar gönderiniz.', kind: 'erp', order: o.id, actions: [{ label: 'Formu aç ve düzelt', act: 'openErp', args: { order: o.id } }] });
      bus.emit('erpReturned', o);
    } else {
      // approve() mantığının mesaj sürümü
      o.erp.rounds++;
      const clean = o.erp.rounds === 1 && !r.wrong.length;
      startProduction(o, { clean, wrong: r.wrong.filter((w) => ['fam', 'size', 'fabric', 'color'].includes(w.field)) });
      stat('erpApproved'); if (clean) stat('erpClean');
      addTrust('semanur', clean ? 3 : 1);
      internal({ from: 'semanur', via: 'mail', subject: `${o.id} sistemde açıldı`, body: clean ? (trust('semanur') > 60 && chance(0.5) ? 'Sipariş açıldı, üretime aktarıldı. Form temizdi. Teşekkürler.' : 'Sipariş açıldı, üretime aktarıldı.') : 'Sipariş açıldı, üretime aktarıldı. Bir dahakine ilk seferde doğru gelmesini rica ederim.', kind: 'erp' });
      if (clean && trust('semanur') > 60) bus.emit('semanurPraise');
      bus.emit('erpApproved', o, clean);
    }
  }
});
