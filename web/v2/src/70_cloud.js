// Bulut kaydı: oyuncunun kaydı Claude'un artifact veritabanında, kişiye özel bölümde (kayit2). İlerleme karşılaştırması:
// boş/yeni oyun buluttaki ilerlemiş kaydı asla ezmez; çakışmada ilerideki korunur; en ilerideki kayıt "yedek2"de saklanır.
const Cloud = {
  ref: null, backupRef: null, booted: false, sending: false, lastSent: '', restored: false, ready: false, failed: false,
  remoteAt: 0, backupP: -1, backupAt: 0, lastBackup: 0, pending: null, pendingBackup: null,

  Progress(obj) { const g = obj && obj.game; if (!g) return 0; return (g.day || 1) * 100 + Object.keys(g.rooms || {}).length * 10 + (g.floors || 1) * 50 + Math.min(99, g.served || 0) * 0.1; },
  Day(obj) { return obj && obj.game ? obj.game.day || 1 : 1; },
  Empty(obj) { return !obj || !obj.game; },

  async Init() {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id(); if (!id) return;
      this.ref = db.doc('data/users/' + id + '/kayit2'); this.backupRef = db.doc('data/users/' + id + '/yedek2');
      const [snap, bsnap] = await Promise.all([this.ref.get(), this.backupRef.get().catch(() => null)]);
      const local = Store.Raw(); const lt = +(local.__savedAt || 0), base = +(local.__base || 0);
      let cloudObj = null, ct = 0;
      if (snap.exists) { const d = snap.data() || {}; ct = +(d.savedAt || 0); if (typeof d.data === 'string') cloudObj = JSON.parse(d.data); this.lastSent = typeof d.data === 'string' ? d.data : ''; }
      this.remoteAt = ct;
      let backupObj = null;
      if (bsnap && bsnap.exists) { const b = bsnap.data() || {}; if (typeof b.data === 'string') { backupObj = JSON.parse(b.data); this.backupP = this.Progress(backupObj); this.backupAt = +(b.savedAt || 0); } }
      let useCloud = false;
      if (cloudObj) {
        const lp = this.Progress(local), cp = this.Progress(cloudObj);
        if (this.Empty(local)) useCloud = true; else if (base === ct) useCloud = false; else if (cp !== lp) useCloud = cp > lp; else useCloud = ct > lt;
      }
      if (useCloud && this.booted) { this.pending = { obj: cloudObj, at: ct }; this.ready = false; this.OfferPending(); return; }
      if (useCloud) this.Apply(cloudObj, ct); else this.MarkBase(base === ct ? base : 0);
      const cur = Store.Raw();
      if (backupObj && this.backupP > this.Progress(cur) + 150 && cur.__backupDeclined !== String(this.backupAt)) this.pendingBackup = { obj: backupObj, at: this.backupAt };
      this.ready = true;
      if (this.booted) this.OfferBackup();
    } catch (e) { console.warn('Bulut kaydı açılamadı', e); this.failed = true; }
  },
  Apply(obj, at) { obj.__savedAt = at; obj.__base = at; Store.Load(obj); Store.Save(true); this.restored = true; },
  MarkBase(b) { const r = Store.Raw(); if (r.__base !== b) { r.__base = b; Store.Touch(); Store.Save(true); } },
  OfferPending() {
    const p = this.pending; if (!p) return;
    UI.DialogFirst({ tag: 'BULUT KAYDI', title: 'Bulutta daha ilerideki kaydın var', body: 'Başka bir cihazda ya da önceki oyununda Gün ' + this.Day(p.obj) + "'e kadar ilerlemişsin. O kayıt yüklensin mi?", buttons: [{ text: 'Evet, yükle', cls: 'mint', act: () => { this.Apply(p.obj, p.at); Game.loaded = false; location.reload(); } }, { text: 'Hayır, bu oyun kalsın', cls: 'ghost', act: () => { this.pending = null; this.MarkBase(p.at); this.remoteAt = p.at; this.ready = true; } }] });
  },
  OfferBackup() {
    const b = this.pendingBackup; if (!b) return; this.pendingBackup = null;
    UI.DialogFirst({ tag: 'YEDEK', title: 'Eski kaydın bulundu', body: 'Daha önce Gün ' + this.Day(b.obj) + "'e kadar ilerlemiş bir kaydın yedekte duruyor. Ona geri dönmek ister misin?", buttons: [{ text: 'Evet, geri yükle', cls: 'mint', act: () => { this.Apply(b.obj, Date.now()); Store.Raw().__base = 0; Store.Touch(); Store.Save(true); Game.loaded = false; location.reload(); } }, { text: 'Hayır, yeni oyuna devam', cls: 'ghost', act: () => { const r = Store.Raw(); r.__backupDeclined = String(b.at); Store.Touch(); Store.Save(true); } }] });
  },
  async Push() {
    if (!this.ready || !this.ref || this.sending) return;
    const raw = Object.assign({}, Store.Raw());
    const savedAt = +(raw.__savedAt || Date.now()), base = +(raw.__base || 0);
    delete raw.__savedAt; delete raw.__base; delete raw.__backupDeclined;
    const s = JSON.stringify(raw);
    if (s === this.lastSent || s.length > 240000) return;
    this.sending = true;
    try {
      const snap = await this.ref.get(); const d = snap.exists ? snap.data() || {} : null; const rt = d ? +(d.savedAt || 0) : 0;
      if (d && rt !== base && typeof d.data === 'string') { const other = JSON.parse(d.data); if (this.Progress(other) > this.Progress(raw)) { this.pending = { obj: other, at: rt }; this.ready = false; this.sending = false; this.OfferPending(); return; } }
      await this.ref.set({ savedAt, data: s }); this.lastSent = s; this.remoteAt = savedAt; this.MarkBase(savedAt);
      const p = this.Progress(raw);
      if (this.backupRef && p >= this.backupP && Date.now() - this.lastBackup > 300000) { this.lastBackup = Date.now(); await this.backupRef.set({ savedAt, data: s }); this.backupP = p; this.backupAt = savedAt; }
    } catch (e) { if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) this.ready = false; }
    this.sending = false;
  },
  async Wipe() { try { if (this.ref) await this.ref.set({ savedAt: Date.now(), data: '{}' }); } catch (e) { } },
};
