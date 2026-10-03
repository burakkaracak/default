// ============================================================================
// Photos.cs · Oyuncunun fotoğraflarını otelin tablolarında gösterir.
// Unity'de "Fotograflar" klasöründen okunuyordu; tarayıcıda localStorage'da
// ('otel_fotolar': data URL dizisi, en çok 6 tane, ≤512 px JPEG) tutulur.
// ============================================================================
const Photos = {
  KEY: 'otel_fotolar',
  MaxCount: 6,
  MaxSize: 512,
  list: null,
  next: 0,

  // Klasörün karşılığı (bilgi amaçlı)
  get Folder() { return 'tarayıcı deposu (' + this.KEY + ')'; },

  // Kayıtlı data URL'leri
  Urls() {
    try {
      const s = localStorage.getItem(this.KEY);
      const a = s ? JSON.parse(s) : [];
      return Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.startsWith('data:image')) : [];
    } catch (e) { return []; }
  },

  // THREE.Texture listesi (görüntüler arka planda yüklenir; t.userData.loaded)
  get All() {
    if (this.list != null) return this.list;
    this.list = [];
    try {
      for (const url of this.Urls()) {
        const img = new Image();
        const t = new THREE.Texture(img);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.name = 'foto_' + this.list.length;
        t.userData.loaded = false;
        t.userData.pending = [];
        img.onload = () => {
          t.userData.loaded = true;
          t.needsUpdate = true;
          const p = t.userData.pending; t.userData.pending = [];
          for (const fn of p) { try { fn(); } catch (e) { } }
        };
        img.src = url;
        this.list.push(t);
      }
    } catch (e) { }
    return this.list;
  },

  // Sıradaki fotoğrafı döner (yoksa null)
  Next() {
    const a = this.All;
    if (a.length === 0) return null;
    return a[(this.next++) % a.length];
  },

  // Resim kutusuna fotoğraf giydirir (çerçeve oranına göre ortadan kırpar)
  Apply(canvas, frameW, frameH) {
    const t = this.Next();
    if (!t || !canvas) return;
    const put = () => {
      if (!alive(canvas)) return;
      const img = t.image;
      const tw = img.naturalWidth || img.width || 1, th = img.naturalHeight || img.height || 1;
      const fa = frameW / frameH, ta = tw / th;
      const scale = { x: 1, y: 1 }, off = { x: 0, y: 0 };
      if (ta > fa) { scale.x = fa / ta; off.x = (1 - scale.x) / 2; }
      else { scale.y = ta / fa; off.y = (1 - scale.y) / 2; }
      const m = U.Mat(Col.white, t, { x: 1, y: 1 }, 0.2, 0).clone();
      const map = t.clone();
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      // W'nin z aynası görüntüyü yatayda ters çevirir: u'yu tersine çevirerek düzelt
      map.repeat.set(-scale.x, scale.y);
      map.offset.set(off.x + scale.x, off.y);
      map.needsUpdate = true;
      m.map = map;
      m.needsUpdate = true;
      canvas.material = m;
      canvas.userData.ownMat = true;
    };
    if (t.userData.loaded) put(); else t.userData.pending.push(put);
  },

  // Seçilen dosyaları küçültüp kaydeder. Döner: eklenen fotoğraf sayısı.
  // Yeni fotoğraflar sahne yeniden kurulunca (ya da oyun yeniden açılınca) tablolarda görünür.
  async AddFromFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => f && /^image\//.test(f.type));
    const urls = this.Urls();
    let added = 0;
    for (const f of files) {
      try {
        const url = await this.Shrink(f);
        if (url) { urls.push(url); added++; }
      } catch (e) { }
    }
    while (urls.length > this.MaxCount) urls.shift();
    // depo dolarsa en eskileri at
    for (;;) {
      try { localStorage.setItem(this.KEY, JSON.stringify(urls)); break; }
      catch (e) { if (urls.length === 0) break; urls.shift(); }
    }
    this.list = null;
    this.next = 0;
    return added;
  },

  // Tüm fotoğrafları sil
  Clear() {
    try { localStorage.removeItem(this.KEY); } catch (e) { }
    this.list = null;
    this.next = 0;
  },

  // Dosyayı ≤512 px JPEG data URL'ye çevirir
  Shrink(file) {
    return new Promise((resolve, reject) => {
      const u = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          const k = Math.min(1, this.MaxSize / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
          const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
          resolve(cv.toDataURL('image/jpeg', 0.82));
        } catch (e) { reject(e); }
        finally { URL.revokeObjectURL(u); }
      };
      img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('resim okunamadı')); };
      img.src = u;
    });
  },
};
