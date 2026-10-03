// ============================================================================
// Themes.cs · Oda temaları: her oda ayrı bir tarzda döşenebilir. Uygun misafir tipi o odada daha mutlu olur.
// ============================================================================
const Themes = {
  Names: ['Klasik', 'Deniz', 'Bohem', 'Modern', 'Romantik'],
  Desc: [
    'Otelin varsayılan görünümü.',
    'Beyaz ve mavi, can simidi ve yelkenli. Turistler bayılır.',
    'Toprak tonları, asılı bitkiler ve makrome. Aileler sever.',
    'Gri tonlar, neon ışık ve soyut tablo. İş insanlarının gözdesi.',
    'Pembe tonlar, kalpler ve peri ışıkları. Balayı çiftleri için.',
  ],
  Wall: [
    Col.clear,
    C(0.78, 0.92, 0.97),
    C(0.9, 0.66, 0.5),
    C(0.55, 0.58, 0.63),
    C(0.98, 0.8, 0.85),
  ],
  // Customer sonra tanımlanabileceği için ilk kullanımda kurulur
  _fan: null,
  get Fan() { if (!this._fan) { const G = Customer.G; this._fan = [G.Normal, G.Turist, G.Aile, G.Is, G.Balayi]; } return this._fan; },

  Cost(roomIndex, theme) { return theme === 0 ? 0 : Mathf.RoundToInt((350 + 90 * roomIndex) / 10) * 10; },

  // Memnuniyete katkı: tema her misafire biraz, uygun misafire çok iyi gelir
  Bonus(theme, type) {
    if (theme <= 0) return 0;
    let b = 0.25;
    if (this.Fan[theme] === type) b += 0.6;
    return b;
  },

  Match(theme, type) { return theme > 0 && this.Fan[theme] === type; },
};
