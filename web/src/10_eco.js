// Oyunun ekonomisi: fiyatlar, maliyetler, yükseltmeler ve TL biçimi
const Eco = {
  TL: v => '₺' + Math.round(v).toLocaleString('tr-TR'),
  Upper: s => trUpper(s),

  StartMoney: 60,

  // ---- Odalar ----
  RoomUnlock: [0, 150, 400, 900, 1800, 3500, 8000, 12000, 17000, 24000, 30000, 40000, 52000, 66000, 82000, 100000],
  Floor2Start: 10,
  WingStart: 6,

  // ---- Alanlar ----
  RestaurantCost: 5000, WaiterCost: 1500, SpaCost: 7000, TherapistCost: 1800,
  get SpaPrice() { return Mathf.RoundToInt(32 + 8 * Eco.Stars); },
  get RestPrice() { return Mathf.RoundToInt((24 + 6 * Eco.Stars) * (1 + 0.15 * Eco.Lv(Eco.Up.Breakfast))); },
  CafeCost: 1200, PoolCost: 3000, WingCost: 8000, Floor2Cost: 30000, BaristaCost: 800,
  get CafePrice() { return Mathf.RoundToInt((14 + 3 * Eco.Stars) * (1 + 0.4 * Eco.Lv(Eco.Up.Tips) * 0.5)); },
  get PoolPrice() { return Mathf.RoundToInt(20 + 5 * Eco.Stars); },

  // ---- Yıldız ----
  get Stars() { return GameManager.I != null ? GameManager.I.Stars : 3; },
  get StarMul() { return 0.85 + 0.075 * Eco.Stars; },
  LevelNames: ['', 'Standart', 'Konfor', 'Kral Dairesi'],

  UpgradeCost: (index, toLevel) => Mathf.RoundToInt((toLevel === 2 ? 250 + 120 * index : 750 + 320 * index) * (1 + 0.12 * index) / 10) * 10,

  NightPrice(index, level) {
    const lv = level <= 1 ? 1 : level === 2 ? 1.7 : 2.6;
    const breakfast = 1 + 0.15 * Eco.Lv(Eco.Up.Breakfast);
    const exam = GameManager.I != null ? StarExam.PriceMul * GameManager.I.PriceBuff * Pricing.PriceMul * Chain.PriceMul : 1;
    return Mathf.RoundToInt((30 + 6 * index) * lv * breakfast * Eco.StarMul * exam);
  },

  Tip: (index, level) => Mathf.RoundToInt(Eco.NightPrice(index, level) * 0.25 * (1 + 0.3 * Eco.Lv(Eco.Up.Tips))),

  // ---- Personel ----
  ReceptionistCost: 300, RestRoomCost: 1500,
  CleanerCost: [450, 1100, 2400],

  Names: ['Ayşe', 'Mehmet', 'Zeynep', 'Can', 'Elif', 'Emre', 'Selin', 'Murat', 'Deniz', 'Burcu', 'Kerem', 'Ece', 'Oğuz', 'Melis', 'Arda', 'Nehir'],

  // ---- Yükseltmeler ----
  Up: { Magnet: 0, Speed: 1, Clean: 2, Service: 3, Tips: 4, Ads: 5, Comfort: 6, StaffSpeed: 7, Breakfast: 8, Laundry: 9, Carry: 10 },
  UpCount: 11,

  Def(u) { for (const d of Eco.Ups) if (d.id === u) return d; return null; },
  Lv: u => GameManager.I != null ? GameManager.I.UpLevel(u) : 0,
  UpCost(u, curLevel) { const d = Eco.Def(u); return Mathf.RoundToInt(d.baseCost * Math.pow(d.growth, curLevel) / 10) * 10; },

  // ---- Etkiler ----
  MagnetRange: [1.25, 3.5, 5.5, 8, 11, 15],
  get Magnet() { return Eco.MagnetRange[Mathf.Clamp(Eco.Lv(Eco.Up.Magnet), 0, Eco.MagnetRange.length - 1)]; },
  get PlayerSpeed() { return 5.5 + 1.2 * Eco.Lv(Eco.Up.Speed); },
  get CleanMul() { return 1 + 0.35 * Eco.Lv(Eco.Up.Clean); },
  get ServiceMul() { return 1 + 0.35 * Eco.Lv(Eco.Up.Service); },
  get StaffMul() { return 1 + 0.25 * Eco.Lv(Eco.Up.StaffSpeed); },
  get AdsMul() { return (1 + 0.25 * Eco.Lv(Eco.Up.Ads)) * (0.7 + 0.1 * Eco.Stars) * Seasons.SpawnMul * Events.SpawnMul * (1 + Social.AdsBonus) * Pricing.SpawnMul; },
  get PatienceMul() { return 1 + 0.5 * Eco.Lv(Eco.Up.Comfort); },

  Effect(u, lv) {
    const U_ = Eco.Up;
    switch (u) {
      case U_.Magnet: return lv === 0 ? 'Kapalı' : 'Menzil ' + String(Math.round(Eco.MagnetRange[Math.min(lv, 5)] * 10) / 10).replace('.', ',') + ' m';
      case U_.Speed: return 'Hız +' + (lv * 22) + '%';
      case U_.Clean: return 'Temizlik +' + (lv * 35) + '%';
      case U_.Service: return 'Resepsiyon +' + (lv * 35) + '%';
      case U_.Breakfast: return 'Oda fiyatı +' + (lv * 15) + '%';
      case U_.Tips: return 'Bahşiş +' + (lv * 30) + '%';
      case U_.Ads: return 'Misafir +' + (lv * 25) + '%';
      case U_.Comfort: return 'Sabır +' + (lv * 50) + '%';
      case U_.StaffSpeed: return 'Personel +' + (lv * 25) + '%';
      case U_.Laundry: return 'Yıkama +' + (lv * 60) + '%, ' + (4 + 2 * lv) + ' çarşaf/sefer';
      case U_.Carry: return 'Sen ' + (4 + 3 * lv) + ', personel ' + (3 + lv) + ' çarşaf';
    }
    return '';
  },
};
Eco.Ups = [
  { id: Eco.Up.Magnet, name: 'Para Mıknatısı', desc: 'Paralar uzaktan sana uçar. Her seviyede menzil artar.', baseCost: 300, growth: 2.0, max: 5 },
  { id: Eco.Up.Speed, name: 'Hızlı Adımlar', desc: 'Müdür daha hızlı yürür.', baseCost: 200, growth: 2.5, max: 3 },
  { id: Eco.Up.Clean, name: 'Hızlı Temizlik', desc: 'Odalar herkes için daha çabuk temizlenir.', baseCost: 250, growth: 2.4, max: 3 },
  { id: Eco.Up.Service, name: 'Hızlı Resepsiyon', desc: 'Misafirler daha çabuk odaya yerleşir.', baseCost: 300, growth: 2.4, max: 3 },
  { id: Eco.Up.Breakfast, name: 'Kahvaltı Servisi', desc: 'Gecelik oda fiyatları %15 artar.', baseCost: 700, growth: 2.5, max: 3 },
  { id: Eco.Up.Tips, name: 'Cömert Misafirler', desc: 'Bahşişler %30 artar.', baseCost: 500, growth: 2.2, max: 3 },
  { id: Eco.Up.Ads, name: 'Reklam', desc: 'Otele daha sık misafir gelir.', baseCost: 400, growth: 2.5, max: 3 },
  { id: Eco.Up.Comfort, name: 'Konforlu Bekleme', desc: 'Misafirler daha uzun sabırla bekler.', baseCost: 350, growth: 2.6, max: 2 },
  { id: Eco.Up.StaffSpeed, name: 'Personel Eğitimi', desc: 'Çalışanlar daha hızlı çalışır.', baseCost: 600, growth: 2.2, max: 3 },
  { id: Eco.Up.Laundry, name: 'Hızlı Çamaşır', desc: 'Makineler daha hızlı ve tek seferde daha çok çarşaf yıkar.', baseCost: 500, growth: 2.4, max: 3 },
  { id: Eco.Up.Carry, name: 'Geniş Sepet', desc: 'Sen ve temizlikçiler aynı anda daha çok çarşaf taşırsınız.', baseCost: 350, growth: 2.3, max: 3 },
];

// Çalışanın enerjisi, morali ve seviyesi.
// Çalıştıkça yorulur, enerjisi bitince molaya çıkar. Moral hızını etkiler, her gün biraz düşer.
class StaffStats {
  constructor() { this.energy = 1; this.morale = 0.8; this.xp = 0; this.resting = false; this.who = ''; }
  static LevelXp = [0, 8, 25, 55, 100];
  get Level() { let l = 1; for (let i = 1; i < StaffStats.LevelXp.length; i++) if (this.xp >= StaffStats.LevelXp[i]) l = i + 1; return l; }
  get LevelProgress() { const l = this.Level; if (l >= StaffStats.LevelXp.length) return 1; return Mathf.InverseLerp(StaffStats.LevelXp[l - 1], StaffStats.LevelXp[l], this.xp); }
  // Hız çarpanı: moral ve seviyeye göre (yaklaşık 0,75 ile 1,45 arası)
  get Speed() { return (0.75 + 0.4 * this.morale) * (1 + 0.08 * (this.Level - 1)); }
  get Wage() { return 60 + 20 * this.Level; }
  get BonusCost() { return 80 + 50 * this.Level; }
  get MoodWord() { return this.morale >= 0.75 ? 'Mutlu' : this.morale >= 0.45 ? 'İyi' : this.morale >= 0.25 ? 'Keyifsiz' : 'Çok mutsuz'; }
  static get RestRate() { return GameManager.I != null && GameManager.I.restRoom ? 1 / 9 : 1 / 18; }

  Tick(dt, working) {
    if (this.resting) {
      this.energy += dt * StaffStats.RestRate;
      if (this.energy >= 1) { this.energy = 1; this.resting = false; if (GameManager.I) GameManager.I.Notify(this.who + ' moladan döndü'); }
      return;
    }
    if (working) {
      this.energy -= dt / 110;
      if (this.energy <= 0.08) { this.energy = 0.08; this.resting = true; if (GameManager.I) GameManager.I.Notify(this.who + ' yoruldu, molaya çıktı'); }
    } else this.energy = Math.min(1, this.energy + dt / 160);
  }
  AddXp(n) {
    const before = this.Level;
    this.xp += n;
    if (this.Level > before && GameManager.I) {
      this.morale = Math.min(1, this.morale + 0.1);
      GameManager.I.Notify(this.who + ' seviye atladı! Seviye ' + this.Level);
      Sfx.Play('unlock', 0.5);
    }
  }
  NewDay() {
    const decay = GameManager.I != null && GameManager.I.restRoom ? 0.03 : 0.06;
    this.morale = Math.max(0.05, this.morale - decay);
    this.energy = Math.max(this.energy, 0.6);
  }
  Bonus() { this.morale = Math.min(1, this.morale + 0.35); }
  Save(key) { Store.SetInt(key + '_xp', this.xp); Store.SetFloat(key + '_mor', this.morale); Store.SetFloat(key + '_en', this.energy); }
  Load(key) { this.xp = Store.GetInt(key + '_xp', 0); this.morale = Store.GetFloat(key + '_mor', 0.8); this.energy = Store.GetFloat(key + '_en', 1); this.resting = false; }
}
