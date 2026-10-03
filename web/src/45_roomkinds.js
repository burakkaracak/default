// ============================================================================
// RoomKinds.cs · Oda tipleri: Klasik, Ekonomik, Aile, Balayı, İş ve iki Kral Dairesinin birleşmesiyle Başkanlık Süiti.
// Tip; fiyatı, temizlik hızını ve hangi misafirin çok mutlu olacağını belirler.
// ============================================================================
const RoomKinds = {
  Klasik: 0, Ekonomik: 1, Aile: 2, Balayi: 3, Is: 4, Suit: 5,
  Selectable: 5, // menüde seçilebilen tipler (0-4); süit ayrı kurulur

  Names: ['Klasik', 'Ekonomik', 'Aile Odası', 'Balayı Odası', 'İş Odası', 'Başkanlık Süiti'],
  Short: ['', 'Ekonomik', 'Aile', 'Balayı', 'İş', 'Başkanlık Süiti'],
  Desc: [
    'Herkese uygun, normal fiyat.',
    'Gecelik %35 ucuz, temizliği çok hızlı. Turistler bayılır, VIP misafir kalmaz.',
    'Gecelik %25 pahalı. Aileler çok mutlu olur: balonlar ve oyuncak ayı.',
    'Gecelik %30 pahalı. Balayı çiftleri çok mutlu olur. En az Konfor seviye ister.',
    'Gecelik %15 pahalı. İş insanları çok mutlu olur, %50 fazla bahşiş bırakır.',
    'İki Kral Dairesi birleşir. Sadece VIP ve ünlüler kalır, gecelik fiyat çok yüksek.',
  ],

  PriceMul(k) { const K = RoomKinds; return k === K.Ekonomik ? 0.65 : k === K.Aile ? 1.25 : k === K.Balayi ? 1.3 : k === K.Is ? 1.15 : 1; },
  CleanMul(k) { const K = RoomKinds; return k === K.Ekonomik ? 1.6 : k === K.Suit ? 0.6 : 1; },
  MinLevel(k) { const K = RoomKinds; return k === K.Balayi ? 2 : k === K.Suit ? 3 : 1; },

  Cost(roomIdx, k) {
    const K = RoomKinds;
    if (k === K.Klasik) return 0;
    const b = k === K.Ekonomik ? 250 : k === K.Aile ? 900 : k === K.Balayi ? 1200 : 700;
    return Mathf.RoundToInt(b * (1 + 0.15 * roomIdx) / 10) * 10;
  },

  SuiteCost(roomIdx) { return Mathf.RoundToInt((15000 + 1500 * roomIdx) / 100) * 100; },

  Match(k, t) {
    const K = RoomKinds, G = Customer.G;
    return (k === K.Ekonomik && t === G.Turist) || (k === K.Aile && t === G.Aile) ||
      (k === K.Balayi && t === G.Balayi) || (k === K.Is && t === G.Is);
  },

  Bonus(k, t, vip) {
    const K = RoomKinds, G = Customer.G;
    switch (k) {
      case K.Ekonomik: return t === G.Turist ? 0.6 : vip ? -0.8 : -0.15;
      case K.Aile: return t === G.Aile ? 1 : 0;
      case K.Balayi: return t === G.Balayi ? 1 : 0;
      case K.Is: return t === G.Is ? 0.8 : 0;
      case K.Suit: return 1.2;
    }
    return 0;
  },

  TipMul(k, t) { const K = RoomKinds; return k === K.Is && t === Customer.G.Is ? 1.5 : k === K.Suit ? 2 : 1; },

  Fans(k) {
    const K = RoomKinds;
    return k === K.Ekonomik ? 'Turistler sever' : k === K.Aile ? 'Aileler sever' : k === K.Balayi ? 'Balayı çiftleri sever' : k === K.Is ? 'İş insanları sever' : 'Herkese uygun';
  },

  // Aynı bölümde (lobi, kanat, 2. kat) yan yana iki oda mı?
  SameSection(a, b) { return RoomKinds.Sec(a) === RoomKinds.Sec(b); },
  Sec(i) { return i < Eco.WingStart ? 0 : i < Eco.Floor2Start ? 1 : 2; },
};

// Fiyat politikası: ucuz çok misafir getirir, lüks az ama zengin misafir getirir
const Pricing = {
  policy: 1,
  Names: ['Ucuz', 'Normal', 'Pahalı', 'Lüks'],
  Desc: [
    'Fiyatlar %20 düşük. %35 daha çok misafir gelir, herkes biraz daha memnun.',
    'Standart fiyatlar.',
    'Fiyatlar %20 yüksek. %20 daha az misafir. Standart odalarda kalanlar biraz memnuniyetsiz.',
    'Fiyatlar %45 yüksek. Çok daha az ama daha çok VIP misafir. Kral Dairesi dışındaki odalarda kalanlar mutsuz.',
  ],
  priceMul: [0.8, 1, 1.2, 1.45],
  spawnMul: [1.35, 1, 0.8, 0.62],
  vipMul: [0.6, 1, 1.4, 2.2],

  get PriceMul() { return this.priceMul[Mathf.Clamp(this.policy, 0, 3)]; },
  get SpawnMul() { return this.spawnMul[Mathf.Clamp(this.policy, 0, 3)]; },
  get VipMul() { return this.vipMul[Mathf.Clamp(this.policy, 0, 3)]; },

  // Odanın seviyesine göre fiyat politikasının memnuniyete etkisi
  Sat(level) {
    switch (this.policy) {
      case 0: return 0.35;
      case 2: return level >= 2 ? 0 : -0.35;
      case 3: return level >= 3 ? 0 : -0.6;
    }
    return 0;
  },

  Save(K) { Store.SetInt(K + 'price_pol', this.policy); },
  Load(K) { this.policy = Mathf.Clamp(Store.GetInt(K + 'price_pol', 1), 0, 3); },
};
