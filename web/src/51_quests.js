// Hikaye gorevleri ve gunluk hedefler (Quests.cs'den taşındı)
class Quests {
  static Keys = ['served', 'cleaned', 'earned', 'requests', 'cafe', 'pool', 'vip'];
  static total = new Map();
  static today = new Map();

  static get G() { return GameManager.I; }

  static Track(k, n = 1) {
    Quests.total.set(k, Quests.Total(k) + n);
    Quests.today.set(k, Quests.Today(k) + n);
    Story.Track(k, n); // hikaye modu ilerlemesi
  }

  static Total(k) { return Quests.total.has(k) ? Quests.total.get(k) : 0; }
  static Today(k) { return Quests.today.has(k) ? Quests.today.get(k) : 0; }

  // ---------------- Hikaye gorevleri ----------------
  // Görev: { text, cur: () => int, target, reward }
  static Unlocked() { let n = 0; for (const r of Quests.G.rooms) if (r.Unlocked) n++; return n; }
  static MaxLevel() { let m = 0; for (const r of Quests.G.rooms) m = Mathf.Max(m, r.level); return m; }
  static CountLevel(l) { let n = 0; for (const r of Quests.G.rooms) if (r.level >= l) n++; return n; }

  static Line = [
    { text: '3 misafir ağırla', cur: () => Quests.Total('served'), target: 3, reward: 40 },
    { text: 'Bir odayı temizle', cur: () => Quests.Total('cleaned'), target: 1, reward: 40 },
    { text: "Oda 102'yi aç", cur: () => Quests.Unlocked(), target: 2, reward: 80 },
    { text: 'Toplam 10 misafir ağırla', cur: () => Quests.Total('served'), target: 10, reward: 100 },
    { text: 'Resepsiyonist işe al', cur: () => Quests.G.reception.HasStaff ? 1 : 0, target: 1, reward: 120 },
    { text: 'Bir odayı Konfor seviyesine yükselt', cur: () => Quests.MaxLevel() >= 2 ? 1 : 0, target: 1, reward: 150 },
    { text: 'Para Mıknatısı satın al', cur: () => Quests.G.UpLevel(Eco.Up.Magnet), target: 1, reward: 150 },
    { text: 'Bir misafir isteğini karşıla', cur: () => Quests.Total('requests'), target: 1, reward: 120 },
    { text: 'Temizlikçi işe al', cur: () => Quests.G.cleaners.length, target: 1, reward: 200 },
    { text: 'Kafeyi aç', cur: () => Quests.G.cafe.Open ? 1 : 0, target: 1, reward: 250 },
    { text: 'Kafede 10 kahve sat', cur: () => Quests.Total('cafe'), target: 10, reward: 300 },
    { text: 'Otel 3,5 yıldıza ulaşsın', cur: () => Mathf.FloorToInt(Quests.G.Stars * 10 + 0.01), target: 35, reward: 350 },
    { text: 'Bir Kral Dairesi yap', cur: () => Quests.MaxLevel() >= 3 ? 1 : 0, target: 1, reward: 500 },
    { text: '4 oda aç', cur: () => Quests.Unlocked(), target: 4, reward: 500 },
    { text: 'Havuzu aç', cur: () => Quests.G.pool.Open ? 1 : 0, target: 1, reward: 700 },
    { text: 'Bir VIP misafir ağırla', cur: () => Quests.Total('vip'), target: 1, reward: 600 },
    { text: '6 odanın hepsini aç', cur: () => Mathf.Min(Quests.Unlocked(), 6), target: 6, reward: 900 },
    { text: 'Yeni Kanadı aç', cur: () => Quests.G.wingOpen ? 1 : 0, target: 1, reward: 1500 },
    { text: 'Toplam 200 misafir ağırla', cur: () => Quests.Total('served'), target: 200, reward: 1500 },
    { text: 'Otel 5 yıldız olsun', cur: () => Mathf.FloorToInt(Quests.G.Stars * 10 + 0.01), target: 48, reward: 3000 },
    { text: '10 odanın hepsi Kral Dairesi olsun', cur: () => Quests.CountLevel(3), target: 10, reward: 10000 },
  ];

  static storyIndex = 0;
  static get Current() { return Quests.storyIndex < Quests.Line.length ? Quests.Line[Quests.storyIndex] : null; }
  static get CurrentDone() { const c = Quests.Current; return c != null && c.cur() >= c.target; }

  static ClaimStory() {
    if (!Quests.CurrentDone) return;
    const c = Quests.Current;
    Quests.G.Reward(c.reward, 'Görev tamamlandı!', c.text);
    Quests.storyIndex++;
    Quests.G.Save();
  }

  // ---------------- Gunluk hedefler ----------------
  static Daily = class {
    constructor(o) { this.key = o.key; this.target = o.target | 0; this.reward = o.reward | 0; this.claimed = !!o.claimed; }
    get Text() {
      switch (this.key) {
        case 'served': return this.target + ' misafir ağırla';
        case 'earned': return Eco.TL(this.target) + ' kazan';
        case 'cleaned': return this.target + ' oda temizle';
        case 'requests': return this.target + ' misafir isteği karşıla';
        case 'cafe': return 'Kafede ' + this.target + ' kahve sat';
        case 'pool': return 'Havuza ' + this.target + ' misafir gelsin';
        case 'vip': return this.target + ' VIP misafir ağırla';
      }
      return this.key;
    }
    get Cur() { return Mathf.Min(Quests.Today(this.key), this.target); }
    get Done() { return Quests.Today(this.key) >= this.target; }
  };

  static daily = [];

  static NewDay() {
    const G = Quests.G, D = Quests.Daily;
    Quests.today.clear();
    Quests.daily.length = 0;
    const rooms = Mathf.Max(1, Quests.Unlocked());
    const pool = [
      new D({ key: 'served', target: 5 + 3 * rooms }),
      new D({ key: 'earned', target: 120 * rooms }),
      new D({ key: 'cleaned', target: 3 + 2 * rooms }),
      new D({ key: 'requests', target: 2 + Math.floor(rooms / 2) }),
    ];
    if (G.cafe.Open) pool.push(new D({ key: 'cafe', target: 4 + rooms }));
    if (G.pool.Open) pool.push(new D({ key: 'pool', target: 3 + Math.floor(rooms / 2) }));
    if (Quests.MaxLevel() >= 2) pool.push(new D({ key: 'vip', target: 1 + Math.floor(rooms / 4) }));
    const rnd = new SysRandom(G.dayNight.day * 7919);
    while (Quests.daily.length < 3 && pool.length > 0) {
      const i = rnd.Next(pool.length);
      const d = pool[i];
      pool.splice(i, 1);
      d.reward = Mathf.RoundToInt((50 + 45 * rooms) / 10) * 10;
      Quests.daily.push(d);
    }
  }

  static ClaimDaily(d) {
    if (d.claimed || !d.Done) return;
    d.claimed = true;
    Quests.G.Reward(d.reward, 'Günlük hedef tamam!', d.Text);
    Quests.G.Save();
  }

  static ReadyCount() {
    let n = Quests.CurrentDone ? 1 : 0;
    for (const d of Quests.daily) if (d.Done && !d.claimed) n++;
    return n;
  }

  // ---------------- Kayit ----------------
  static Save(K) {
    Store.SetInt(K + 'story', Quests.storyIndex);
    for (const k of Quests.Keys) {
      Store.SetInt(K + 'tot_' + k, Quests.Total(k));
      Store.SetInt(K + 'day_' + k, Quests.Today(k));
    }
    const parts = [];
    for (const d of Quests.daily) parts.push(d.key + ':' + d.target + ':' + d.reward + ':' + (d.claimed ? 1 : 0));
    Store.SetString(K + 'daily', parts.join('|'));
  }

  static Load(K) {
    Quests.total.clear();
    Quests.today.clear();
    Quests.daily.length = 0;
    Quests.storyIndex = Store.GetInt(K + 'story', 0);
    for (const k of Quests.Keys) {
      Quests.total.set(k, Store.GetInt(K + 'tot_' + k, 0));
      Quests.today.set(k, Store.GetInt(K + 'day_' + k, 0));
    }
    const s = Store.GetString(K + 'daily', '');
    if (s)
      for (const p of s.split('|')) {
        const f = p.split(':');
        if (f.length < 4) continue;
        Quests.daily.push(new Quests.Daily({ key: f[0], target: parseInt(f[1], 10), reward: parseInt(f[2], 10), claimed: f[3] === '1' }));
      }
  }
}
