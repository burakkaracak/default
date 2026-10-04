// Semanur Hanım: ERP yöneticisi. Yakın temastan çekinir; sadece mailleşilir.
// Siparişler sistemden açıldığı için sipariş durumu, stok ve iş emirleri konusunda onunla istişare edilir.
import { G, P, family } from '../core/state.js';
import { bus } from '../core/bus.js';
import { choose, toast } from '../ui/dom.js';
import { randi } from '../core/util.js';
import { internal } from './comms.js';
import { trust, addTrust } from './approvals.js';
import { displayStatus } from '../crm/orders.js';
import { erpPanel } from '../crm/erp.js';
import { portraits } from './portraits.js';

export async function mailTo(id) {
  if (id !== 'semanur') return;
  const erps = G.orders.filter((o) => o.status === 'erp' && !o.erp?.pending);
  const opts = [
    ...erps.map((o) => ({ label: `🗂️ ERP formu gönder: ${o.id}`, sub: 'sipariş açılışı için onay', value: 'erp:' + o.id })),
    { label: '📋 Siparişlerin ERP durumunu sor', sub: 'yanıt 1–3 saat', value: 'status' },
    { label: '📦 Hammadde stok raporunu iste', sub: 'yanıt 1–3 saat', value: 'stock' },
    { label: '🏭 Açık iş emirlerini sor', sub: 'yanıt 1–3 saat', value: 'wo' },
  ];
  const v = await choose('Semanur Hanım\'a mail', 'Semanur Hanım yakın temastan çekiniyor; yanına gidince sadece “Mail atarsan bakarım.” diyor.<br>Konuyu seç:', opts, { portrait: portraits.semanur });
  if (!v) return;
  if (v.startsWith('erp:')) return erpPanel(G.orders.find((o) => o.id === v.slice(4)));
  const subj = { status: 'Sipariş durumları', stock: 'Hammadde stok raporu', wo: 'Açık iş emirleri' }[v];
  internal({ from: 'burak', to: 'semanur', via: 'mail', subject: subj, body: `${subj.toLowerCase()} hakkında ERP'deki güncel bilgiyi paylaşabilir misiniz?` });
  (G.semReq ||= []).push({ kind: v, due: G.day * 1440 + G.min + randi(60, 180) + (trust('semanur') < 30 ? 60 : 0) });
  toast('Mail gönderildi.', 'info');
}
bus.on('tick', () => {
  if (!G?.semReq?.length) return;
  const now = G.day * 1440 + G.min;
  for (const r of G.semReq.filter((x) => now >= x.due)) {
    let body = '';
    if (r.kind === 'status') {
      const os = G.orders.filter((o) => !['kapandi', 'iptal'].includes(o.status));
      body = os.length ? 'ERP kayıtlarına göre:\n\n' + os.map((o) => `• ${o.id}: ${displayStatus(o)}`).join('\n') + '\n\nNot: Üretim durumları üretim tarafının (Harun Bey) girişlerine göredir.' : 'Sistemde açık sipariş bulunmamaktadır.';
    }
    if (r.kind === 'stock') body = 'Güncel stok:\n\n' + P.materials.map((m) => `• ${m.name}: ${Math.round(G.mat.stock[m.id] || 0)} ${m.unit}`).join('\n');
    if (r.kind === 'wo') { const w = Object.values(G.factory.wos).filter((x) => x.packed < x.qty); body = w.length ? 'Açık iş emirleri:\n\n' + w.map((x) => `• ${x.id}: ${x.qty} ${family(x.fam).name} · paketlenen ${x.packed}`).join('\n') : 'Açık iş emri bulunmamaktadır.'; }
    internal({ from: 'semanur', via: 'mail', subject: 'Re: ' + { status: 'Sipariş durumları', stock: 'Hammadde stok raporu', wo: 'Açık iş emirleri' }[r.kind], body, kind: 'erp' });
    addTrust('semanur', 1);
  }
  G.semReq = G.semReq.filter((x) => now < x.due);
});
