// Bulut kaydı: oyuncunun kaydı Claude'un artifact veritabanında, kişiye özel bölümde tutulur.
// Açılışta cihazdaki kayıt ile buluttaki karşılaştırılır. Sadece zamana bakılmaz: yeni başlamış boş bir oyun
// (ör. depolaması silinmiş bir tarayıcı) buluttaki ilerlemiş kaydın üzerine asla yazmaz.
//   __savedAt: kaydın zamanı, __base: bu cihazdaki kaydın türediği bulut kaydının zamanı.
// Ayrıca en ilerideki kayıt "yedek" belgesinde saklanır; ilerleme kaybolursa geri yükleme önerilir.
const Cloud = {
  ref: null, backupRef: null, booted: false, sending: false, lastSent: '', restored: false, ready: false, failed: false,
  remoteAt: 0, backupP: -1, backupAt: 0, lastBackup: 0, pending: null, pendingBackup: null,

  // İlerleme puanı: otellerdeki gün sayısı ve açık odalar (zincirdeki tüm oteller)
  Progress(obj) {
    if (!obj) return 0;
    let p = 0;
    for (const k of Object.keys(obj)) {
      if (/^o4_(c\d_)?day$/.test(k)) p += (parseInt(obj[k], 10) || 0) * 100;
      else if (/^o4_(c\d_)?room\d+$/.test(k)) p += (parseInt(obj[k], 10) || 0) * 10;
      else if (/^o4_(c\d_)?served$/.test(k)) p += Math.min(99, parseInt(obj[k], 10) || 0) * 0.1;
    }
    return p;
  },
  Day(obj) { return obj ? parseInt(obj.o4_day, 10) || 1 : 1; },
  Empty(obj) { return !obj || Object.keys(obj).filter(k => !k.startsWith('__')).length === 0; },

  // Açılışta bir kez
  async Init() {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.ref = db.doc('data/users/' + id + '/kayit');
      this.backupRef = db.doc('data/users/' + id + '/yedek');
      const [snap, bsnap] = await Promise.all([this.ref.get(), this.backupRef.get().catch(() => null)]);
      const local = Store.Raw();
      const lt = +(local.__savedAt || 0), base = +(local.__base || 0);
      let cloudObj = null, ct = 0;
      if (snap.exists) {
        const d = snap.data() || {};
        ct = +(d.savedAt || 0);
        if (typeof d.data === 'string') cloudObj = JSON.parse(d.data);
        this.lastSent = typeof d.data === 'string' ? d.data : '';
      }
      this.remoteAt = ct;
      let backupObj = null;
      if (bsnap && bsnap.exists) {
        const b = bsnap.data() || {};
        if (typeof b.data === 'string') { backupObj = JSON.parse(b.data); this.backupP = this.Progress(backupObj); this.backupAt = +(b.savedAt || 0); }
      }

      // Hangisi kullanılacak?
      let useCloud = false;
      if (cloudObj) {
        const lp = this.Progress(local), cp = this.Progress(cloudObj);
        if (this.Empty(local)) useCloud = true;
        else if (base === ct) useCloud = false;                 // cihazdaki kayıt buluttakinin devamı
        else if (cp !== lp) useCloud = cp > lp;                 // ayrışmış: daha ilerideki kazanır
        else useCloud = ct > lt;
      }
      if (useCloud && this.booted) {
        // oyun çoktan açıldı: buluttaki daha ilerideki kaydı sormadan yükleme, üzerine de yazma
        this.pending = { obj: cloudObj, at: ct };
        this.ready = false;
        this.OfferPending();
        return;
      }
      if (useCloud) this.Apply(cloudObj, ct);
      else this.MarkBase(base === ct ? base : 0);

      // Yedek, hem cihazdakinden hem buluttakinden belirgin şekilde ilerideyse geri yüklemeyi öner
      const cur = Store.Raw();
      if (backupObj && this.backupP > this.Progress(cur) + 150 && cur.__backupDeclined !== String(this.backupAt))
        this.pendingBackup = { obj: backupObj, at: this.backupAt };
      this.ready = true;
      if (this.booted) this.OfferBackup();
    } catch (e) { console.warn('Bulut kaydı açılamadı', e); this.failed = true; }
  },

  Apply(obj, at) {
    obj.__savedAt = String(at);
    obj.__base = String(at);
    Store.Load(obj);
    Store.Save(true);
    this.restored = true;
  },

  MarkBase(b) { const r = Store.Raw(); if (r.__base !== String(b)) { r.__base = String(b); Store.Load(r); Store.Save(true); } },

  // Oyun açıldıktan sonra bulunan daha ilerideki kayıt / yedek için soru
  OfferPending() {
    if (!GameManager.I || !this.pending) return;
    const p = this.pending;
    Popups.Show('Bulutta daha ilerideki kaydın var', 'Başka bir cihazda ya da önceki oyununda Gün ' + this.Day(p.obj) + "'e kadar ilerlemişsin. O kayıt yüklensin mi?", 'BULUT KAYDI')
      .Add('Evet, yükle', () => { this.Apply(p.obj, p.at); Chain.switching = true; location.reload(); }, Popups.Green)
      .Add('Hayır, bu oyun kalsın', () => { this.pending = null; this.MarkBase(p.at); this.remoteAt = p.at; this.ready = true; }, Popups.Grey);
    Popups.queue.unshift(Popups.queue.pop()); // diğer pencerelerden önce sorulsun
  },
  OfferBackup() {
    const b = this.pendingBackup;
    if (!GameManager.I || !b) return;
    this.pendingBackup = null;
    Popups.Show('Eski kaydın bulundu', 'Daha önce Gün ' + this.Day(b.obj) + "'e kadar ilerlemiş bir kaydın yedekte duruyor. Ona geri dönmek ister misin?", 'YEDEK')
      .Add('Evet, geri yükle', () => { this.Apply(b.obj, Date.now()); Store.Raw().__base = '0'; Store.Save(true); Chain.switching = true; location.reload(); }, Popups.Green)
      .Add('Hayır, yeni oyuna devam', () => { const r = Store.Raw(); r.__backupDeclined = String(b.at); Store.Load(r); Store.Save(true); }, Popups.Grey);
    Popups.queue.unshift(Popups.queue.pop());
  },

  // Değiştiyse buluta gönder (aynı anda tek yazma). Başka cihaz arada daha ilerideki bir kayıt yazdıysa ezme.
  async Push() {
    if (!this.ready || !this.ref || this.sending || Chain.switching) return;
    const raw = Object.assign({}, Store.Raw());
    const savedAt = +(raw.__savedAt || Date.now());
    const base = +(raw.__base || 0);
    delete raw.__savedAt; delete raw.__base; delete raw.__backupDeclined;
    const s = JSON.stringify(raw);
    if (s === this.lastSent || s.length > 240000) return;
    this.sending = true;
    try {
      const snap = await this.ref.get();
      const d = snap.exists ? snap.data() || {} : null;
      const rt = d ? +(d.savedAt || 0) : 0;
      if (d && rt !== base && typeof d.data === 'string') {
        // bulut kaydı bu cihaz son baktığından beri değişti (başka cihaz)
        const other = JSON.parse(d.data);
        if (this.Progress(other) > this.Progress(raw)) {
          this.pending = { obj: other, at: rt }; this.ready = false; this.sending = false;
          this.OfferPending();
          return;
        }
      }
      await this.ref.set({ savedAt, data: s });
      this.lastSent = s; this.remoteAt = savedAt;
      this.MarkBase(savedAt);
      // en ilerideki kaydı yedekte tut (en fazla 5 dakikada bir)
      const p = this.Progress(raw);
      if (this.backupRef && p >= this.backupP && Date.now() - this.lastBackup > 300000) {
        this.lastBackup = Date.now();
        await this.backupRef.set({ savedAt, data: s }); this.backupP = p; this.backupAt = savedAt;
      }
    }
    catch (e) {
      if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) this.ready = false; // bu ziyarette yazamıyoruz
    }
    this.sending = false;
  },
};
