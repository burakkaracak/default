// Bahçede düğün: arada bir bir çift otelde evlenmek ister. Kabul edilirse ertesi gün öğleden sonra
// batı bahçesine çiçek takı, sandalyeler ve gelin yolu kurulur; konuklar gelir, tören yapılır.
// Tören bitince takın önünde büyük bir para destesi kalır. Müdür törende bulunursa ek ödül.
const Wedding = {
  Themes: [
    { name: 'Pembe & Beyaz', a: C(1, 0.62, 0.75), b: C(1, 1, 1), carpet: C(0.98, 0.85, 0.9) },
    { name: 'Altın & Beyaz', a: C(0.98, 0.8, 0.35), b: C(1, 1, 1), carpet: C(0.98, 0.95, 0.88) },
    { name: 'Lavanta', a: C(0.72, 0.6, 0.95), b: C(0.95, 0.92, 1), carpet: C(0.9, 0.86, 0.98) },
  ],
  Couples: [['Zeynep', 'Emre'], ['Ece', 'Kerem'], ['Selin', 'Can'], ['Melis', 'Arda'], ['Deniz', 'Oğuz'], ['Burcu', 'Murat']],
  ArchX: -28, ArchZ: -7.9,
  plan: null,       // { day, theme, couple, deposit }
  phase: 0,         // 0 yok, 1 kuruldu, 2 konuklar geliyor, 3 tören, 4 kutlama, 5 bitti
  root: null, actors: [], t: 0, chairs: [], bonus: false, offeredDay: -1,

  get K() { return GameManager.K; },
  Save(K) { Store.SetString(K + 'wedding', this.plan ? JSON.stringify(this.plan) : ''); },
  Load(K) {
    const s = Store.GetString(K + 'wedding', '');
    this.plan = null;
    try { if (s) this.plan = JSON.parse(s); } catch (e) { }
  },

  // Her sabah: uygun günlerde düğün teklifi gelir
  NewDay(day) {
    if (this.plan && day > this.plan.day) { this.plan = null; this.Clear(); }
    if (this.plan || day < 3 || this.offeredDay === day) return;
    const gm = GameManager.I;
    if (gm.Stars < 2.5 || Random.value > 0.4) return;
    this.offeredDay = day;
    const couple = this.Couples[Random.RangeInt(0, this.Couples.length)];
    const deposit = Mathf.RoundToInt((350 + 120 * gm.Stars) / 10) * 10;
    const p = Popups.Show('Düğün teklifi 💍', couple[0] + ' ve ' + couple[1] + ' düğünlerini yarın öğleden sonra otelinin bahçesinde yapmak istiyor!\n\n' +
      'Kapora hemen kasana girer: ' + Eco.TL(deposit) + '. Tören bitince takın önüne büyük bir ödül bırakırlar. Törende sen de bulunursan daha da mutlu olurlar.\n\nHangi süslemeyi istersin?', 'ORGANİZASYON');
    this.Themes.forEach((th, i) => p.Add(th.name, () => this.Accept(day + 1, i, couple, deposit), i === 0 ? Popups.Gold : Popups.Blue));
    p.Add('Bu sefer olmaz', null, Popups.Grey);
  },

  Accept(day, theme, couple, deposit) {
    const gm = GameManager.I;
    this.plan = { day, theme, couple, deposit };
    gm.money += deposit;
    Report.Bonus(deposit);
    Sfx.Play('coin');
    gm.Notify('Düğün yarın · ' + this.Themes[theme].name + ' süsleme');
    Social.Share(gm.hotelName + ' bahçesinde yarın düğün var! ' + couple[0] + ' ♥ ' + couple[1], 1, false);
    gm.Save();
  },

  // Saniyede birkaç kez: saate göre aşamalar
  Tick(dt) {
    const gm = GameManager.I, p = this.plan;
    if (!p) return;
    const dn = gm.dayNight;
    if (dn.day !== p.day) return;
    if (this.phase === 0 && dn.time >= 0.5 && dn.time < 0.7) this.Setup();
    if (this.phase === 1 && dn.time >= 0.53) this.Arrive();
    if (this.phase >= 2 && this.phase <= 4) this.Run(dt);
  },

  // Batı bahçesi: takı, gelin yolu, sandalyeler, çiçekler
  Setup() {
    this.Clear();
    const th = this.Themes[this.plan.theme], X = this.ArchX, Z = this.ArchZ;
    const g = this.root = U.Pivot(GameManager.I.world, V(), 'Dugun');
    U.Flat('GelinYolu', g, V(X, 0.01, -10.2), V(1.4, 0.02, 4.4), th.carpet);
    for (let z = -12.2; z <= -8.6; z += 0.45) for (const s of [-1, 1])
      U.Box('YolCicek', g, V(X + s * 0.82, 0.12, z), V(0.18, 0.18, 0.18), (Math.round(z * 10) % 2) ? th.a : th.b, 'Sphere');
    // çiçek takı
    for (const s of [-1, 1]) U.Box('TakDirek', g, V(X + s * 1.1, 1.2, Z), V(0.12, 2.4, 0.12), th.b, 'Cylinder');
    for (let k = 0; k <= 12; k++) {
      const a = Math.PI * k / 12;
      U.Box('TakCicek', g, V(X - Math.cos(a) * 1.1, 2.3 + Math.sin(a) * 0.75, Z), V(0.32, 0.32, 0.32), k % 2 ? th.a : th.b, 'Sphere');
    }
    for (const s of [-1, 1]) U.Box('Buket', g, V(X + s * 1.1, 0.35, Z - 0.05), V(0.55, 0.55, 0.55), th.a, 'Sphere');
    // sandalyeler (iki blok, üçer sıra)
    this.chairs = [];
    for (const z of [-11.6, -10.6, -9.6]) for (const x of [-31.4, -30.3, -25.7, -24.6]) {
      U.Box('Sandalye', g, V(x, 0.25, z), V(0.5, 0.5, 0.5), Col.white);
      U.Box('SandalyeSirt', g, V(x, 0.7, z - 0.23), V(0.5, 0.5, 0.06), Col.white);
      U.Box('Kurdele', g, V(x, 0.75, z - 0.27), V(0.18, 0.18, 0.04), th.a, 'Sphere');
      this.chairs.push(V(x, 0, z));
    }
    // pasta masası
    U.Box('PastaMasa', g, V(-32.4, 0.4, -8.4), V(1.0, 0.8, 1.0), Col.white, 'Cylinder');
    U.Box('Pasta1', g, V(-32.4, 0.95, -8.4), V(0.7, 0.3, 0.7), th.b, 'Cylinder');
    U.Box('Pasta2', g, V(-32.4, 1.22, -8.4), V(0.5, 0.25, 0.5), th.b, 'Cylinder');
    U.Box('Pasta3', g, V(-32.4, 1.45, -8.4), V(0.32, 0.22, 0.32), th.a, 'Cylinder');
    U.Text(g, V(X, 3.4, Z), this.plan.couple[0] + ' ♥ ' + this.plan.couple[1], 0.06, th.a, true);
    this.pile = MoneyPile.Create(g, V(X, 0, Z - 1.3));
    this.phase = 1;
    GameManager.I.Notify('Düğün hazırlıkları bahçede başladı!');
  },

  // Konuklar ve çift sokaktan gelir
  Arrive() {
    const th = this.Themes[this.plan.theme], X = this.ArchX;
    this.actors = [];
    const mk = (look, path, seat) => {
      const a = new WeddingGuest(look, V(-40, 0, -14), path, seat);
      this.actors.push(a);
      return a;
    };
    const n = Math.min(this.chairs.length, 10);
    for (let i = 0; i < n; i++) {
      const c = this.chairs[i];
      mk(Rig.Guests[Random.RangeInt(0, Rig.Guests.length)], [V(-33, 0, -14 + 0 * i), V(c.x, 0, -12.9), V(c.x, 0, c.z - 0.6)], c);
    }
    this.groom = mk('character-male-d', [V(-33, 0, -14), V(X + 0.6, 0, -12.9), V(X + 0.6, 0, this.ArchZ - 0.9)], null);
    this.bride = mk('character-female-b', [V(-34, 0, -14.4), V(X - 0.6, 0, -13.2)], null);
    this.bride.delay = 3;
    U.Box('Duvak', this.bride.go, V(0, 2.05, -0.15), V(0.75, 0.35, 0.6), C(1, 1, 1, 0.85), 'Sphere');
    U.Box('GelinBuket', this.bride.go, V(0.25, 1.05, 0.35), V(0.28, 0.28, 0.28), th.a, 'Sphere');
    U.Box('Papyon', this.groom.go, V(0, 1.55, 0.27), V(0.2, 0.09, 0.05), C(0.1, 0.1, 0.12));
    this.phase = 2; this.t = 0; this.bonus = false;
    GameManager.I.Notify('Düğün konukları geliyor! Batı bahçesine git');
  },

  Run(dt) {
    const gm = GameManager.I, th = this.Themes[this.plan.theme], X = this.ArchX, Z = this.ArchZ;
    this.t += dt;
    if (this.phase === 2) {
      const seated = this.actors.filter(a => a !== this.bride && a !== this.groom).every(a => a.done);
      if ((seated && this.groom.done) || this.t > 40) {
        this.phase = 3; this.t = 0;
        // gelin, gelin yolundan takıya yürür
        this.bride.Walk([V(X - 0.6, 0, -12.6), V(X - 0.6, 0, Z - 0.9)], 1.6);
        Sfx.Play('ding', 0.8);
      }
    } else if (this.phase === 3) {
      if (gm.PlayerNear(V(X, 0, -10), 6)) this.bonus = true;
      if (Math.random() < dt * 3) U.Burst(V(X + Random.Range(-1.5, 1.5), 2.6, Random.Range(-11, Z)), th.a, th.b, 18, 2.5);
      if (this.bride.done && this.t > 12) {
        this.phase = 4; this.t = 0;
        U.Burst(V(X, 2.5, Z), th.a, th.b, 220, 8);
        Sfx.Play('unlock');
        for (const a of this.actors) a.Cheer();
        lookRotation(this.bride.go, Vec.right); lookRotation(this.groom.go, Vec.left);
      }
    } else if (this.phase === 4) {
      if (Math.random() < dt * 4) U.Burst(V(X + Random.Range(-3, 3), 3, Random.Range(-12, Z)), th.a, th.b, 30, 5);
      if (this.t > 6) this.Finish();
    }
  },

  Finish() {
    const gm = GameManager.I, p = this.plan;
    const reward = Mathf.RoundToInt((1800 + 450 * gm.Stars) * (this.bonus ? 1.3 : 1) / 10) * 10;
    this.pile.Add(reward);
    this.pile.fullAt = 0;
    gm.AddRating(5); gm.AddRating(5);
    Social.Add('@' + p.couple[0].toLowerCase().replace(/[^a-zçğıöşü]/g, '') + '.ve.' + p.couple[1].toLowerCase().replace(/[^a-zçğıöşü]/g, ''),
      'Hayatımızın en güzel günü ' + gm.hotelName + ' bahçesindeydi! Her şey için teşekkürler ♥', Random.RangeInt(900, 2200), false, 2);
    Social.followers += 80;
    Story.Track('wedding');
    gm.Celebrate('Düğün çok güzel geçti!', (this.bonus ? 'Törende sen de vardın, çift çok mutlu oldu! ' : '') + 'Takın önündeki ödülü topla: ' + Eco.TL(reward) + '.');
    for (const a of this.actors) a.Leave();
    this.phase = 5;
    p.done = true;
    gm.Save();
  },

  Clear() {
    for (const a of this.actors) a.destroy();
    this.actors = [];
    if (this.root) Destroy(this.root);
    this.root = null; this.phase = 0;
  },
};

// Düğün konuğu: sokaktan gelir, sandalyesine oturur, törende alkışlar, sonra gider
class WeddingGuest extends Behaviour {
  constructor(look, start, path, seat) {
    super(); this.go.name = 'DugunKonugu';
    this.go.position.copy(start);
    this.rig = Rig.Model(this.go, look);
    this.path = path.map(p => p.clone()); this.seat = seat; this.done = false; this.speed = 3.2; this.delay = Random.Range(0, 2.5); this.cheerT = 0; this.leaving = false;
  }
  Walk(path, speed) { this.path = path.map(p => p.clone()); this.done = false; this.speed = speed || 3.2; this.rig.act = Rig.Act.None; }
  Cheer() { this.cheerT = 4; }
  Leave() { this.leaving = true; this.Walk([V(this.go.position.x, 0, -12.9), V(-33, 0, -14), V(-44, 0, -14)], 3.4); this.delay = Random.Range(3, 6); }
  destroy() { Destroy(this.go); }
  Update() {
    if (this.delay > 0) { this.delay -= Time.deltaTime; this.rig.Tick(0); return; }
    if (this.cheerT > 0) { this.cheerT -= Time.deltaTime; this.rig.act = Rig.Act.Cheer; this.rig.Tick(0); if (this.cheerT <= 0) this.rig.act = this.seat && !this.leaving ? Rig.Act.Sit : Rig.Act.None; return; }
    if (this.done) { this.rig.Tick(0); return; }
    if (U.Walk(this.go, this.path, this.speed, this.rig)) {
      this.done = true;
      if (this.leaving) { this.destroy(); return; }
      if (this.seat) { this.go.position.copy(this.seat); lookRotation(this.go, Vec.forward); this.rig.act = Rig.Act.Sit; }
      else lookRotation(this.go, Vec.forward);
    }
  }
}
