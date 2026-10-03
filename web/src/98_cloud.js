// Bulut kaydı: oyuncunun kaydı Claude'un artifact veritabanında, kişiye özel bölümde tutulur.
// Açılışta bulut ile cihazdaki kayıttan yeni olanı kullanılır; oyun sırasında değişiklikler buluta gönderilir.
const Cloud = {
  ref: null, booted: false, sending: false, lastSent: '', restored: false, ready: false, failed: false,

  // Açılışta bir kez (en fazla birkaç saniye bekler)
  async Init() {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.ref = db.doc('data/users/' + id + '/kayit');
      const snap = await this.ref.get();
      const local = Store.Raw();
      const lt = +(local.__savedAt || 0);
      if (snap.exists) {
        const d = snap.data() || {};
        const ct = +(d.savedAt || 0);
        if (ct > lt && this.booted) { this.ready = false; return; } // oyun çoktan başladı: buluttaki yeni kaydın üzerine yazma
        if (ct > lt && typeof d.data === 'string') {
          const obj = JSON.parse(d.data);
          obj.__savedAt = String(ct);
          Store.Load(obj);
          Store.Save(true);
          this.restored = true;
        }
        this.lastSent = typeof d.data === 'string' ? d.data : '';
      }
      this.ready = true;
    } catch (e) { console.warn('Bulut kaydı açılamadı', e); this.failed = true; }
  },

  // Değiştiyse buluta gönder (aynı anda tek yazma)
  async Push() {
    if (!this.ready || !this.ref || this.sending) return;
    const raw = Object.assign({}, Store.Raw());
    const savedAt = +(raw.__savedAt || Date.now());
    delete raw.__savedAt;
    const s = JSON.stringify(raw);
    if (s === this.lastSent || s.length > 240000) return;
    this.sending = true;
    try { await this.ref.set({ savedAt, data: s }); this.lastSent = s; }
    catch (e) {
      if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) this.ready = false; // bu ziyarette yazamıyoruz
    }
    this.sending = false;
  },
};
