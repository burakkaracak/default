// ============================================================================
// Seasons.cs · Mevsimler (oyun gününe göre), festival günleri ve gerçek takvime göre özel günler
// ============================================================================
const Seasons = {
  S: Object.freeze({ Ilkbahar: 0, Yaz: 1, Sonbahar: 2, Kis: 3 }),
  Names: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'],
  DaysPerSeason: 5,

  get Current() { return Math.floor((Math.max(1, this.Day) - 1) / this.DaysPerSeason) % 4; },
  get Day() { return GameManager.I != null && GameManager.I.dayNight != null ? GameManager.I.dayNight.day : 1; },
  get Festival() { return this.Day % 7 === 0; },

  get SpawnMul() {
    const S = this.S, c = this.Current;
    let m = c === S.Yaz ? 1.25 : c === S.Kis ? 0.85 : c === S.Sonbahar ? 0.95 : 1;
    if (this.Festival) m *= 1.5;
    return m;
  },
  get PoolChance() { const S = this.S, c = this.Current; return c === S.Yaz ? 0.7 : c === S.Kis ? 0.1 : 0.45; },
  get CafeChance() { const S = this.S, c = this.Current; return c === S.Kis ? 0.65 : c === S.Sonbahar ? 0.55 : 0.45; },
  get TipMul() { return this.Festival ? 1.3 : 1; },

  // ---- Gerçek takvim özel günleri ----
  get SpecialDay() {
    const d = new Date();
    const m = d.getMonth() + 1, day = d.getDate();
    if ((m === 12 && day >= 20) || (m === 1 && day <= 6)) return 'yilbasi';
    if (m === 2 && day >= 10 && day <= 15) return 'sevgililer';
    if ((m === 4 && day >= 22 && day <= 24) || (m === 5 && day >= 18 && day <= 20) ||
      (m === 8 && day >= 29 && day <= 31) || (m === 10 && day >= 28 && day <= 30)) return 'bayram';
    return null;
  },

  get SpecialTitle() {
    switch (this.SpecialDay) {
      case 'yilbasi': return 'Mutlu yıllar! Otel yılbaşı için süslendi.';
      case 'sevgililer': return 'Sevgililer Günü kutlu olsun! Balayı çiftleri yolda.';
      case 'bayram': {
        const m = new Date().getMonth() + 1;
        if (m === 4) return '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun!';
        if (m === 5) return '19 Mayıs Gençlik ve Spor Bayramı kutlu olsun!';
        if (m === 8) return '30 Ağustos Zafer Bayramı kutlu olsun!';
        return '29 Ekim Cumhuriyet Bayramı kutlu olsun!';
      }
    }
    return null;
  },

  // ---- Görsel ----
  crowns: [],   // ağaç tepeleri (Mesh)
  grass: null,  // çim malzemesi (kendi kopyası olan MeshStandardMaterial)
  fall: null,   // PrecipEmitter (40_events.js)

  RegisterCrown(r) { this.crowns.push(r); },

  // Parçacık bulutunu oyuncunun üstünde tutar
  Follow(p) {
    if (this.fall) this.fall.go.position.set(p.x, 9, p.z + 2);
  },
  RegisterGrass(m) { this.grass = m; },

  Reset() {
    this.crowns.length = 0;
    this.grass = null;
    // Unity'de sahne yeniden yüklenince parçacık nesnesi de silinir
    if (this.fall && alive(this.fall.go)) Destroy(this.fall.go);
    this.fall = null;
  },

  Apply() {
    const s = this.Current, S = this.S;
    const leaf = [C(0.45, 0.75, 0.38), C(0.3, 0.62, 0.3), C(0.9, 0.55, 0.2), C(0.92, 0.95, 0.98)];
    for (let i = 0; i < this.crowns.length; i++) {
      const cr = this.crowns[i];
      if (!cr || !alive(cr)) continue;
      let c = leaf[s];
      if (s === S.Ilkbahar && i % 3 === 0) c = C(1, 0.72, 0.82);      // çiçek açmış
      if (s === S.Sonbahar && i % 3 === 1) c = C(0.85, 0.32, 0.18);   // kızıl
      cr.material = U.Mat(c);
    }
    if (this.grass) {
      let g = s === S.Kis ? C(0.92, 0.94, 0.97) : s === S.Sonbahar ? C(0.68, 0.7, 0.4) :
        s === S.Yaz ? C(0.5, 0.78, 0.38) : C(0.58, 0.82, 0.48);
      if (Chain.cur === 1) g = C(0.93, 0.86, 0.68); // Bodrum: kum
      else if (Chain.cur === 2) // Kapadokya: kuru toprak, kışın kar
        g = s === S.Kis ? C(0.94, 0.95, 0.97) : s === S.Ilkbahar ? C(0.74, 0.72, 0.48) : s === S.Yaz ? C(0.84, 0.72, 0.5) : C(0.8, 0.62, 0.42);
      if (this.grass.color) { this.grass.color.copy(Col.three(g)); if (this.grass.userData) this.grass.userData.color = g; }
      Events.WetBase(this.grass, g);
    }
    this.SetupParticles(s);
  },

  SetupParticles(s) {
    if (!camera) return;
    const S = this.S;
    if (this.fall == null) {
      this.fall = new PrecipEmitter('MevsimParcaciklari', {
        mode: 'points', max: 600, life: [7, 7],
        box: V(44, 1, 34),
        // Unity varsayılanı: startSpeed 5, kutu biçimi ileri (+z) yönde yayar
        startVel: V(0, 0, 5),
      });
      this.fall.Stop(); this.fall.Clear();
      Events.Hook(this.fall); // kar ve yapraklar binanın içine düşmesin
    }
    const f = this.fall;
    f.life = [7, 7];
    f.max = Math.min(f.max, 600);
    switch (s) {
      case S.Kis:
        f.SetColor(C(1, 1, 1, 0.9));
        f.size = [0.08, 0.18];
        f.velX = [-0.4, 0.4]; f.velY = [-1.6, -1.1]; f.velZ = [-0.2, 0.2];
        f.rate = 60;
        break;
      case S.Sonbahar:
        f.SetColor(C(0.95, 0.55, 0.15), C(0.8, 0.3, 0.15));
        f.size = [0.12, 0.22];
        f.velX = [0.3, 1.2]; f.velY = [-1.2, -0.7]; f.velZ = [-0.3, 0.3];
        f.rate = 14;
        break;
      case S.Ilkbahar:
        f.SetColor(C(1, 0.78, 0.86));
        f.size = [0.08, 0.14];
        f.velX = [0.2, 0.8]; f.velY = [-0.9, -0.5]; f.velZ = [-0.2, 0.2];
        f.rate = 8;
        break;
      default:
        f.rate = 0;
        break;
    }
    if (Chain.cur === 1 && s === S.Kis) f.rate = 0;        // Bodrum'a kar yağmaz
    if (Chain.cur === 2 && s === S.Kis) f.rate = 110;      // Kapadokya'da bol kar
    f.Clear();
    if (s === S.Yaz) f.Stop();
    else f.Play();
  },
};
