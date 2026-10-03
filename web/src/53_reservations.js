// Telefonla gelen rezervasyonlar: kabul edersen kapora hemen kasaya girer,
// misafir belirtilen saatte gelir ve istedigi seviyede bos oda bekler.
// (Reservations.cs'den taşındı)
// R: { name, type (Customer.G), level, day, deposit, state, time } — state: 0 bekleniyor, 1 geldi, 2 yerlesti, 3 iptal/gelmedi
class Reservations {
  static list = [];
  static calls = [];
  static callDay = -1;

  static First = ['Ahmet', 'Ayşe', 'Mehmet', 'Fatma', 'Ali', 'Zeynep', 'Hasan', 'Elif', 'Hüseyin', 'Merve', 'Burak', 'Ceren', 'Kemal', 'Gizem', 'Onur', 'Derya', 'Serkan', 'Pınar', 'Tarık', 'Sevgi'];
  static Last = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Koç', 'Kurt', 'Polat', 'Erdem', 'Aksoy'];
  static TypeNames = ['Misafir', 'İş insanı', 'Turist', 'Balayı çifti', 'Aile'];

  static get G() { return GameManager.I; }

  static NewR(o) { return Object.assign({ name: '', type: 0, level: 0, day: 0, deposit: 0, state: 0, time: 0 }, o || {}); }

  // C# int.TryParse / float.TryParse karşılığı (başarısızsa 0)
  static TryInt(s) { return /^\s*[-+]?\d+\s*$/.test(s) ? parseInt(s, 10) : NaN; }
  static TryFloat(s) { const v = Number(s); return s != null && String(s).trim() !== '' && isFinite(v) ? v : NaN; }

  static Clock(t) {
    let m = Mathf.FloorToInt(t * 24 * 60) % (24 * 60);
    m = Math.trunc(m / 15) * 15;
    return pad2(Math.trunc(m / 60)) + ':' + pad2(m % 60);
  }

  static MaxLevel() {
    let mx = 0;
    for (const r of Reservations.G.rooms) if (r.Unlocked && !r.IsSuitePart) mx = Mathf.Max(mx, r.level);
    return mx;
  }

  // Her sabah: gunun telefonlari planlanir
  static NewDay(day) {
    Reservations.list.length = 0;
    Reservations.ScheduleFrom(day, 0);
  }

  static get Scheduled() { return Reservations.callDay >= 0; }

  // Gunun kalan saatleri icin telefonlari planla
  static ScheduleFrom(day, now) {
    const G = Reservations.G, calls = Reservations.calls;
    calls.length = 0;
    Reservations.callDay = day;
    if (day < 3 || G.Unlocked() < 4) return;
    const a = Mathf.Max(0.28, now + 0.02), b = 0.62;
    if (a >= b) return;
    const n = G.Unlocked() >= 8 ? Random.RangeInt(1, 4) : Random.RangeInt(1, 3);
    for (let i = 0; i < n; i++) calls.push(Random.Range(a, b));
    calls.sort((x, y) => x - y);
  }

  static Tick() {
    const G = Reservations.G, calls = Reservations.calls;
    if (!G || G.MenuOpen || Popups.Open) return;
    const t = G.dayNight.time;
    if (Reservations.callDay === G.dayNight.day && calls.length > 0 && t >= calls[0]) {
      calls.splice(0, 1);
      Reservations.Call(t);
      if (calls.length > 0 && calls[0] < t + 0.05) calls[0] = t + 0.05; // telefonlar ust uste gelmesin
      return;
    }
    for (const r of Reservations.list)
      if (r.state === 0 && r.day === G.dayNight.day && t >= r.time) {
        Reservations.Arrive(r);
        break;
      }
  }

  static CallNow() { Reservations.Call(Mathf.Min(Reservations.G.dayNight.time, 0.6)); } // test icin

  static Call(now) {
    const G = Reservations.G, CG = Customer.G;
    const mx = Reservations.MaxLevel();
    if (mx <= 0) return;
    const r = Reservations.NewR();
    const First = Reservations.First, Last = Reservations.Last;
    r.name = First[Random.RangeInt(0, First.length)] + ' ' + Last[Random.RangeInt(0, Last.length)].substring(0, 1) + '.';
    const k = Random.value;
    r.type = k < 0.3 ? CG.Is : k < 0.5 ? CG.Balayi : k < 0.7 ? CG.Aile : k < 0.85 ? CG.Turist : CG.Normal;
    const l = Random.value;
    r.level = Mathf.Min(mx, l < 0.3 ? 1 : l < 0.75 ? 2 : 3);
    if (r.type === CG.Balayi) r.level = Mathf.Min(mx, Mathf.Max(r.level, 2));
    r.time = Mathf.Min(0.88, now + Random.Range(0.1, 0.24));
    r.day = G.dayNight.day;
    let price = 0, cnt = 0;
    for (const rm of G.rooms)
      if (rm.Unlocked && !rm.IsSuitePart && rm.level >= r.level) { price += rm.Price; cnt++; }
    price = cnt > 0 ? Math.trunc(price / cnt) : 50;
    r.deposit = Mathf.Max(10, Mathf.RoundToInt(price * 0.3 / 10) * 10);

    const lvName = Eco.LevelNames[r.level];
    Popups.Show('Telefon çalıyor!',
      r.name + ' (' + Reservations.TypeNames[r.type] + ') bugün saat ' + Reservations.Clock(r.time) + ' için ' + lvName + ' ya da daha iyi bir oda ayırtmak istiyor.\n\n' +
      'Kapora: ' + Eco.TL(r.deposit) + ' (hemen kasaya girer)\nGelince gecelik ücretin %20 fazlasını öder.\n\n' +
      'Dikkat: Geldiğinde uygun oda boş olmalı. Çok beklerse kaporayı geri ister ve kötü yorum yazar.', 'REZERVASYON')
      .Add('Kabul et  +' + Eco.TL(r.deposit), () => {
        Reservations.list.push(r);
        G.money += r.deposit;
        Report.Income(r.deposit);
        Sfx.Play('coin');
        G.Notify(Reservations.Clock(r.time) + ' · ' + r.name + ' için ' + lvName + ' oda ayrıldı');
        G.Save();
      }, Popups.Green)
      .Add('Kibarca reddet', null, Popups.Grey);
  }

  static Arrive(r) {
    const G = Reservations.G;
    r.state = 1;
    if (Random.value < 0.07) {
      r.state = 3;
      G.Notify(r.name + ' gelmedi. Kapora sende kaldı.');
      return;
    }
    G.QueueSpawn({ type: r.type, vip: false, celebrity: false, inspector: false, regular: null, reservation: r });
    G.Notify('Rezervasyonlu misafir geliyor: ' + r.name);
  }

  static OnCheckIn(c) {
    if (c.reservation == null) return;
    c.reservation.state = 2;
    Story.Track('reservation');
  }

  static OnAngry(c) {
    const G = Reservations.G;
    const r = c.reservation;
    if (r == null) return;
    r.state = 3;
    G.Spend(r.deposit, 'Kapora iadesi');
    G.Notify(r.name + ' odasız kaldı, kaporayı geri aldı');
    Social.Share('Rezervasyon yaptırdım ama gelince oda yoktu! ' + G.hotelName + "'e güvenmeyin.", 0, true);
  }

  // Ekranda gosterilecek bekleyen rezervasyonlar
  static get Pending() {
    let n = 0;
    for (const r of Reservations.list) if (r.state <= 1) n++;
    return n;
  }

  static Save(K) {
    const parts = [];
    for (const r of Reservations.list)
      parts.push(r.name.split('|').join(' ').split(';').join(' ') + '|' + r.type + '|' + r.level + '|' +
        String(r.time) + '|' + r.day + '|' + r.deposit + '|' + r.state);
    Store.SetString(K + 'res_list', parts.join(';'));
    const c = [];
    for (const t of Reservations.calls) c.push(String(t));
    Store.SetString(K + 'res_calls', Reservations.callDay + ';' + c.join(';'));
  }

  static Load(K, day) {
    const TI = s => { const v = Reservations.TryInt(s); return isNaN(v) ? 0 : v; };
    Reservations.list.length = 0;
    Reservations.calls.length = 0;
    Reservations.callDay = -1;
    for (const part of Store.GetString(K + 'res_list', '').split(';')) {
      const f = part.split('|');
      if (f.length < 7) continue;
      const r = Reservations.NewR({ name: f[0] });
      r.type = Mathf.Clamp(TI(f[1]), 0, 4);
      r.level = TI(f[2]);
      const tm = Reservations.TryFloat(f[3]); r.time = isNaN(tm) ? 0 : tm;
      r.day = TI(f[4]);
      r.deposit = TI(f[5]);
      r.state = TI(f[6]);
      if (r.day !== day) continue;
      if (r.state === 1) r.state = 0; // yolda olan misafir yeniden gelsin
      Reservations.list.push(r);
    }
    const cs = Store.GetString(K + 'res_calls', '').split(';');
    const cd = cs.length > 0 ? Reservations.TryInt(cs[0]) : NaN;
    if (!isNaN(cd) && cd === day) {
      Reservations.callDay = cd;
      for (let i = 1; i < cs.length; i++) {
        const t = Reservations.TryFloat(cs[i]);
        if (!isNaN(t)) Reservations.calls.push(t);
      }
    }
  }
}
