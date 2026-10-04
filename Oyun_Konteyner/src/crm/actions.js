// Gelen kutusu düğmelerinin eylemleri ve karakterlere özel konuşma seçenekleri.
import { registerAction } from './inbox.js';
import { G, log } from '../core/state.js';
import { bus } from '../core/bus.js';
import { toast, choose } from '../ui/dom.js';
import { offerPanel, askTermin } from './negotiation.js';
import { erpPanel } from './erp.js';
import { orderById } from './orders.js';
import { cust } from './customers.js';
import { registerTalk } from '../ui/talk.js';
import { isHere, trust, addTrust, harunLimit } from '../characters/approvals.js';
import { time } from '../core/time.js';
import * as PR from '../factory/production.js';
import { canCelebrate } from '../core/story.js';
import { conf } from '../core/confidence.js';

registerAction('openOffer', (msg, a) => {
  const rfq = msg.rfq; if (!rfq) return false;
  if (rfq.lost) { toast('Bu müşteri şimdilik başka tedarikçiyle ilerliyor.', 'info'); return true; }
  offerPanel(rfq, msg);
  return false; // panel kendi kapatır
});
registerAction('openErp', (msg, a) => { const o = orderById(a.order); if (!o || o.status !== 'erp') return true; erpPanel(o); return true; });
registerAction('ack', () => true);
registerAction('openUi', (msg, a) => { bus.emit('ui', a.ui, ...(a.args || [])); return a.keep ? false : true; });

// ---- Karaktere özel seçenekler ----
registerTalk((who) => {
  const out = [];
  if (who === 'serkan') {
    const rfqs = (G.inbox || []).filter((m) => m.rfq && !m.done && !m.rfq.lost).map((m) => m.rfq);
    for (const r of rfqs.slice(0, 2)) out.push({ label: `📏 Kesin termin: ${cust(r.cust).name}`, sub: r.termin?.exact ? `${r.termin.days} gün (alındı)` : 'yüz yüze · kesin', fn: () => askTermin(r, 'yuz') });
    const wos = Object.values(G.factory.wos).filter((w) => w.packed < w.qty && !w.prio);
    out.push({ label: '⚡ Acil işi öne al', sub: trust('serkan') >= 55 ? 'güven yeterli' : 'güven 55+ gerekir', disabled: trust('serkan') < 55 || !wos.length, fn: async (api, say) => {
      const v = await choose('Hangi iş öne alınsın?', '', wos.map((w) => ({ label: `${w.id} · ${w.qty} ${w.fam}`, sub: w.order || w.purpose, value: w.id })));
      if (!v) return 'keep'; G.factory.wos[v].prio = 2; addTrust('serkan', -1); say('“Tamam, araya alıyorum. Ama her gün olmaz.”');
    } });
    out.push({ label: '👷 Kadro ve işe alım', sub: 'çalışanlar', fn: () => { bus.emit('ui', 'factory', 'kadro'); return true; } });
  }
  if (who === 'semanur') {
    for (const o of G.orders.filter((o) => o.status === 'erp' && !o.erp?.pending)) out.push({ label: `🗂️ ERP formu teslim et: ${o.id}`, sub: 'elden · tek turda düzeltme', fn: () => { erpPanel(o); return true; } });
  }
  if (who === 'harun') {
    out.push({ label: '📋 Siparişler ne durumda?', sub: '', fn: (api, say) => { const f = G.orders.filter((o) => o.fakeDone); say(f.length ? `“Hepsi tamam yeğenim! ${f.map((o) => o.id).join(', ')} bitti, ERP'de de işaretledim.” <span class="muted">(Gözünle bakmak istersen sevkiyat alanı ya da sipariş panosu.)</span>` : '“Her şey yolunda. Ben buradayken iş aksamaz.”'); } });
    out.push({ label: '💰 İndirim yetkim ne kadar?', sub: '', fn: (api, say) => say(`“Sana %${Math.round(harunLimit() * 100)}'e kadar onay veririm. Fazlası... konuşuruz.”${conf.has('smallDiscount') ? ' <span class="muted">(Özgüvenin sayesinde %5\'e kadar sormadan verebilirsin.)</span>' : ''}`) });
  }
  if (who === 'ibrahim') {
    out.push({ label: '🪵 Hammadde ve stok', sub: 'yüz yüze: onaysız alım', fn: () => { G.flags.ibrahimFace = G.day; bus.emit('ui', 'factory', 'depo'); return true; } });
    out.push({ label: '👨‍👦 Baba, nasılsın?', sub: 'kısa sohbet', fn: (api, say) => { time.skip(10); addTrust('ibrahim', 1); say(['“İyiyim oğlum. Sen yemeğini yiyor musun?”', '“Annen akşama dolma yapacakmış. Geç kalma.”', '“Harun amcanın işlerine fazla takılma. Sen kendi işini düzgün yap, yeter.”', '“Ben senin yaşındayken bu fabrika tek bir hangardı. Sabırlı ol.”'][Math.floor(Math.random() * 4)]); } });
  }
  if (who === 'davut' && canCelebrate()) out.push({ label: '🎉 Bölüm değerlendirmesi', sub: 'kutlama', fn: () => { bus.emit('celebrate'); return true; } });
  if (who === 'davut' && G.chapter === 1 && G.stats.shipped >= 1 && !G.flags.ch1Report) out.push({ label: '📦 İlk konteyner yolda!', sub: 'haber ver', fn: () => { G.flags.ch1Report = true; bus.emit('flag', 'ch1Report'); setTimeout(() => bus.emit('celebrate'), 300); return true; } });
  if (who === 'busra') {
    out.push({ label: '🗓️ Takvimimde ne var?', sub: '', fn: (api, say) => {
      const it = [];
      for (const a of G.appointments || []) if (a.day >= G.day) it.push(`${time.shortDate(a.day)} ${time.clock(a.min)}: Davut Bey — ${a.title}`);
      if (G.ykDay >= G.day) it.push(`${time.shortDate(G.ykDay)} 15:00: YK toplantısı`);
      it.push(`Haftalık toplantı: her Pazartesi 09:00`);
      for (const o of G.orders) if (['uretim', 'erp', 'avans', 'hazir'].includes(o.status)) it.push(`${o.id} teslim sözü: ${time.shortDate(o.promisedDay)}`);
      say('“Not aldım, sıralıyorum:”<br>' + it.slice(0, 8).map((x) => '• ' + x).join('<br>'));
    } });
  }
  return out;
});
