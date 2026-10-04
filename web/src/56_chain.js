// Otel zinciri: ilk otelin yaninda Bodrum ve Kapadokya'da yeni oteller.
// Her otelin kaydi ayridir (ilk otel "o4_", digerleri "o4_c1_", "o4_c2_").
// (Chain.cs'den taşındı)
class Chain {
  static Base = 'o4_';
  static Cities = ['Merkez', 'Bodrum', 'Kapadokya'];
  static CityDesc = [
    'İlk otelin. Her şey burada başladı.',
    "Ege'nin incisi: beyaz badanalı duvarlar, palmiyeler ve deniz manzarası. Turistler ve balayı çiftleri akın eder, fiyatlar %15 yüksek.",
    'Peri bacaları ve sabah gökyüzünü dolduran sıcak hava balonları. Balayı çiftleri bayılır, fiyatlar %25 yüksek, kışın kar çok yağar.',
  ];
  static Cost = [0, 120000, 300000];
  static StartMoney = 5000;

  static cur = 0;
  static owned = 1;
  static inited = false;
  // Tarayıcı: otel değiştirirken sayfa yeniden yüklenir. true iken bellekteki oyun artık kaydedilmemeli.
  static switching = false;

  static Prefix(i) { return i === 0 ? Chain.Base : Chain.Base + 'c' + i + '_'; }
  static get K() { return Chain.Prefix(Chain.cur); }

  static Init() {
    Chain.owned = Store.GetInt(Chain.Base + 'chain_own', 1) | 1;
    Chain.cur = Mathf.Clamp(Store.GetInt(Chain.Base + 'chain_cur', 0), 0, Chain.Cities.length - 1);
    if (!Chain.Owns(Chain.cur)) Chain.cur = 0;
    Chain.inited = true;
  }

  static Owns(i) { return (Chain.owned & (1 << i)) !== 0; }

  static get Count() {
    if (!Chain.inited) Chain.Init();
    let n = 0;
    for (let i = 0; i < Chain.Cities.length; i++) if (Chain.Owns(i)) n++;
    return n;
  }

  // Zincir bonusu: her ek otel tum otellerde fiyatlari %5 artirir; sehir fiyat farki
  static get PriceMul() { return (1 + 0.05 * (Chain.Count - 1)) * (Chain.cur === 1 ? 1.15 : Chain.cur === 2 ? 1.25 : 1); }

  // Sehre gore misafir tipi carpani
  static Bias(t) {
    const G = Customer.G;
    if (Chain.cur === 1) return t === G.Turist ? 1.6 : t === G.Balayi ? 1.4 : t === G.Aile ? 1.2 : t === G.Is ? 0.6 : 1;
    if (Chain.cur === 2) return t === G.Balayi ? 1.7 : t === G.Turist ? 1.5 : t === G.Aile ? 0.9 : t === G.Is ? 0.5 : 1;
    return 1;
  }

  static HotelName(i) {
    if (i === Chain.cur && GameManager.I) return GameManager.I.hotelName;
    return Store.GetString(Chain.Prefix(i) + 'hotel', Chain.Cities[i]);
  }

  static Money(i) { return i === Chain.cur && GameManager.I ? GameManager.I.money : Store.GetInt(Chain.Prefix(i) + 'money', 0); }
  static Day(i) { return Store.GetInt(Chain.Prefix(i) + 'day', 1); }
  static Rooms(i) {
    if (i === Chain.cur && GameManager.I) return GameManager.I.Unlocked();
    let n = 0;
    for (let r = 0; r < 16; r++) if (Store.GetInt(Chain.Prefix(i) + 'room' + r, r === 0 ? 1 : 0) > 0) n++;
    return n;
  }

  // Satin alma sartlari
  static Requirement(i) {
    const G = GameManager.I;
    if (i === 1) {
      if (G.Unlocked() < 8) return 'En az 8 oda açık olmalı (' + G.Unlocked() + ')';
      if (G.Stars < 3.95) return 'Puan ortalaman en az 4,0 olmalı';
    }
    if (i === 2) {
      if (!Chain.Owns(1)) return 'Önce Bodrum otelini aç';
      if (G.Stars < 4.25) return 'Puan ortalaman en az 4,3 olmalı';
    }
    return null;
  }

  static CanBuy(i) { return !Chain.Owns(i) && Chain.Requirement(i) == null && GameManager.I.CanPay(Chain.Cost[i]); }

  static Buy(i) {
    const G = GameManager.I;
    if (!Chain.CanBuy(i)) return;
    G.money -= Chain.Cost[i];
    Chain.owned |= 1 << i;
    Store.SetInt(Chain.Base + 'chain_own', Chain.owned);
    // Yeni otelin baslangic kaydi
    const p = Chain.Prefix(i);
    const baseName = G.hotelName;
    let name = (baseName + ' ' + Chain.Cities[i]);
    if (name.length > 22) name = Chain.Cities[i] + ' Oteli';
    Store.SetInt(p + 'saved', 1);
    Store.SetInt(p + 'money', Chain.StartMoney);
    Store.SetString(p + 'hotel', name);
    Store.SetString(p + 'manager', G.managerName);
    Store.SetInt(p + 'managerLook', G.managerVariant);
    Store.SetInt(p + 'sound', G.sound ? 1 : 0);
    Store.SetInt(p + 'music', G.music ? 1 : 0);
    Store.SetInt(p + 'day', 1);
    Store.SetFloat(p + 'time', 0.3);
    Store.SetInt(p + 'news5', 1);
    Store.SetInt(p + 'news6', 1);
    Store.SetInt(p + 'official', 1);
    G.Save();
    Story.Track('chain');
    Sfx.Play('unlock');
    Popups.Show(Chain.Cities[i] + ' otelin hazır!',
      name + ' kapılarını açtı. Zincirdeki her otel tüm otellerde fiyatları %5 artırır.\n\nYeni otel ' + Eco.TL(Chain.StartMoney) + ' sermaye ile küçük başlar. Menü > Hikâye sekmesinden oteller arasında geçiş yapabilir, para gönderebilirsin. Resepsiyonisti olan otel, sen başka oteldeyken ya da oyun kapalıyken de kazanır.',
      'OTEL ZİNCİRİ')
      .Add('Hemen git!', () => Chain.Switch(i), Popups.Green)
      .Add('Sonra', null, Popups.Grey);
  }

  // Unity'de sahne yeniden yüklenir; tarayıcıda: kaydet, seçilen oteli Store'a yaz, sayfayı yenile.
  // Bellekteki "cur" bilerek değiştirilmez: sayfa kapanırken olası bir otomatik kayıt eski otelin
  // önekine yazılsın, yeni otelin kaydını ezmesin. Chain.Init() açılışta chain_cur'u okur.
  static Switch(i) {
    const G = GameManager.I;
    if (!Chain.Owns(i) || i === Chain.cur || !G) return;
    G.Save();
    Store.SetInt(Chain.Base + 'chain_cur', i);
    Store.Save();
    Chain.switching = true;
    Popups.Clear();
    Time.timeScale = 1;
    location.reload();
  }

  // Arka planda çalışan oteller: resepsiyonisti olan ve odası açık her otel, sen başka oteldeyken de kazanır.
  // Dakikalık kazanç, o otel en son kaydedilirken yazılan 'idleRate'ten (yoksa kayıttaki odalardan tahminen) gelir.
  // Oyun kapalıyken geçen süre, "sen yokken" kuralındaki gibi en fazla 2 saat sayılır.
  static IdleRate(i) {
    const G = GameManager.I;
    if (i === Chain.cur && G) return G.IdleRate();
    const p = Chain.Prefix(i);
    if (Store.GetString(p + 'recep', '') === '') return 0;
    const saved = Store.GetFloat(p + 'idleRate', -1);
    if (saved >= 0) return saved;
    const city = i === 1 ? 1.15 : i === 2 ? 1.25 : 1;
    let rate = 0;
    for (let r = 0; r < 16; r++) {
      const lv = Store.GetInt(p + 'room' + r, r === 0 ? 1 : 0);
      if (lv <= 0) continue;
      rate += (30 + 6 * r) * (lv <= 1 ? 1 : lv === 2 ? 1.7 : 2.6) * city * 1.25 * 2 * 0.015;
    }
    return Store.GetInt(p + 'cleaners', 0) === 0 ? rate * 0.5 : rate;
  }

  static bgT = 0; static carry = {}; static earned = {}; static noteT = 0;
  static TickBackground() {
    if (Chain.switching || !Chain.inited || Chain.Count < 2) return;
    // gerçek saate göre (kare süresi kırpılsa da doğru sayar)
    const now = Date.now();
    if (now - Chain.bgT < 5000) return;
    if (Chain.bgT > 0) Chain.noteT += (now - Chain.bgT) / 1000;
    Chain.bgT = now;
    for (let i = 0; i < Chain.Cities.length; i++) {
      if (i === Chain.cur || !Chain.Owns(i)) continue;
      const p = Chain.Prefix(i);
      let seen = parseFloat(Store.GetString(p + 'seen', ''));
      if (isNaN(seen) || seen > now) seen = now;
      const mins = Math.min((now - seen) / 60000, 120);
      Store.SetString(p + 'seen', String(now));
      const amt = Chain.IdleRate(i) * mins + (Chain.carry[i] || 0);
      const whole = Math.floor(amt);
      Chain.carry[i] = amt - whole;
      if (whole <= 0) continue;
      Store.SetInt(p + 'money', Store.GetInt(p + 'money', 0) + whole);
      Chain.earned[i] = (Chain.earned[i] || 0) + whole;
    }
    // birkaç dakikada bir kısa bilgi
    if (Chain.noteT >= 180) {
      Chain.noteT = 0;
      const parts = [];
      for (const k of Object.keys(Chain.earned)) if (Chain.earned[k] > 0) parts.push(Chain.HotelName(+k) + ' +' + Eco.TL(Chain.earned[k]));
      Chain.earned = {};
      if (parts.length && GameManager.I) GameManager.I.Notify(parts.join('  ·  '));
    }
  }

  // Bu otelin kasasindan baska bir otele para gonder
  static Send(to, amount) {
    const G = GameManager.I;
    if (!Chain.Owns(to) || to === Chain.cur || amount <= 0 || G.money < amount) return;
    G.money -= amount;
    Store.SetInt(Chain.Prefix(to) + 'money', Store.GetInt(Chain.Prefix(to) + 'money', 0) + amount);
    G.Save();
    Sfx.Play('coin');
    G.Notify(Chain.HotelName(to) + ' kasasına ' + Eco.TL(amount) + ' gönderildi');
  }
}

// Hafifce sallanan / suzulen dekor (tekneler, sicak hava balonlari)
// Kullanım (C#: go.AddComponent<Bob>().Set(...)): new Bob(go).Set(a, sp, v, wrap)
class Bob extends Behaviour {
  constructor(go) {
    super(go);
    this.amp = 0; this.speed = 0; this.range = 0; this.ph = 0;
    this.vel = V(); this.p0 = V();
  }

  Set(a, sp, v, wrap) {
    this.amp = a;
    this.speed = sp;
    this.vel = V(v.x, v.y, v.z);
    this.range = wrap;
    this.p0 = worldPos(this.transform);
    this.ph = Random.value * 6;
    return this;
  }

  Update() {
    this.p0 = Vec.add(this.p0, Vec.mul(this.vel, Time.deltaTime));
    if (this.range > 0 && this.p0.x > this.range) this.p0.x -= 2 * this.range;
    setWorldPos(this.transform, Vec.add(this.p0, Vec.mul(Vec.up, Mathf.Sin(Time.time * this.speed + this.ph) * this.amp)));
  }
}
