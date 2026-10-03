// Spa ve güzellik salonu: restoranın doğusunda, bahçede ayrı bina. Kapısı kaldırıma bakar.
// Misafir masaj yatağına uzanır ya da manikür koltuğuna oturur; müdür (ya da spa terapisti)
// yanındaki dairede durunca bakım yapılır, misafir dinlenip ödeme bırakır.
class Spa extends Behaviour {
  static Spot = class {
    constructor(o) { Object.assign(this, o); this.who = null; this.state = 0; this.t = 0; this.claimed = false; this.prog = 0; }
    // state: 0 boş, 1 geliyor, 2 bakım bekliyor, 3 dinleniyor
  };
  static DoorX = 33.5;
  static get DoorIn() { return V(Spa.DoorX, 0, -10.9); }
  static get DoorOut() { return V(Spa.DoorX, 0, -12.7); }
  static get Street() { return V(Spa.DoorX, 0, -14); }
  static Lilac = C(0.78, 0.68, 0.92);
  static Mint = C(0.66, 0.9, 0.8);
  static Rose = C(0.98, 0.72, 0.8);

  constructor() {
    super(); this.go.name = 'Spa';
    this.Open = false; this.spots = []; this.obs = [];
    this.therapistName = ''; this.stats = new StaffStats(); this.therapist = null;
  }
  get HasTherapist() { return this.therapist != null; }

  Build(world) {
    world.add(this.go);
    const trim = C(0.85, 0.7, 0.75), wood = C(0.82, 0.68, 0.55);
    // ---- Açılmadan önce: çimde tabela ----
    this.lockedGroup = U.Pivot(this.go, V(), 'SpaYakinda');
    const L = this.lockedGroup;
    U.Box('TabelaDirek', L, V(33.5, 0.7, -6.8), V(0.1, 1.4, 0.1), trim);
    U.Box('Tabela', L, V(33.5, 1.45, -6.8), V(2.8, 0.6, 0.1), C(0.55, 0.42, 0.7));
    U.Text(L, V(33.5, 1.5, -6.95), 'SPA & GÜZELLİK', 0.05, C(1, 0.92, 0.98));
    U.Text(L, V(33.5, 0.5, -6.9), 'Menüden açılır', 0.04, C(1, 1, 1, 0.7));
    for (const p of [V(31, 0, -9), V(36, 0, -9), V(31, 0, -4.5), V(36, 0, -4.5)])
      U.Box('Cicek', L, Vec.add(p, V(0, 0.25, 0)), V(0.5, 0.5, 0.5), Spa.Rose, 'Sphere');

    // ---- Spa ----
    this.group = U.Pivot(this.go, V(), 'SpaBina');
    const g = this.group;
    U.Prim('SpaZemin', g, V(33.6, -0.04, -6.75), V(10.2, 0.1, 10.5), U.Mat(C(0.95, 0.93, 0.9), U.TileTex, { x: 4, y: 4 }, 0.6, 0));
    U.Prim('SpaHali', g, V(33.6, 0.012, -7.2), V(5.4, 0.02, 3.6), U.Mat(Spa.Lilac, U.CarpetTex, { x: 2, y: 1.5 }, 0.05, 0));
    const wallM = U.Mat(C(0.97, 0.93, 0.95), U.StripeTex, { x: 5, y: 1 }, 0.2, 0);
    const Wl = (n, p, s) => GameManager.I.Wall(n, p, s, wallM, trim, g);
    Wl('SpaBati', V(28.6, 0.6, -6.75), V(0.25, 1.2, 10.5));
    Wl('SpaDogu', V(38.6, 0.6, -6.75), V(0.25, 1.2, 10.5));
    Wl('SpaKuzey', V(33.6, 0.9, -1.6), V(10.2, 1.8, 0.2));
    Wl('SpaGuneySol', V(30.55, 0.45, -11.95), V(4.1, 0.9, 0.25));   // kapı boşluğu x 32.6..34.4
    Wl('SpaGuneySag', V(36.5, 0.45, -11.95), V(4.2, 0.9, 0.25));
    U.Box('KapiKemer', g, V(Spa.DoorX, 1.9, -11.95), V(2.2, 0.25, 0.3), trim);
    U.Box('KapiDirek', g, V(32.5, 0.95, -11.95), V(0.2, 1.9, 0.3), trim);
    U.Box('KapiDirek', g, V(34.5, 0.95, -11.95), V(0.2, 1.9, 0.3), trim);
    U.Box('SpaTabela', g, V(Spa.DoorX, 2.45, -12.0), V(3.4, 0.6, 0.12), C(0.55, 0.42, 0.7));
    U.Text(g, V(Spa.DoorX, 2.5, -12.15), 'SPA & GÜZELLİK', 0.055, C(1, 0.92, 0.98));
    Events.Shelter(g, V(33.6, 6, -6.75), V(10.2, 14, 10.5));

    // Masaj yatakları (kuzey duvarı boyunca)
    for (const x of [30.4, 33.6, 36.8]) {
      U.Box('YatakAyak', g, V(x, 0.25, -3.6), V(0.8, 0.5, 1.9), C(0.92, 0.88, 0.84));
      U.Box('YatakMinder', g, V(x, 0.55, -3.6), V(0.9, 0.12, 2.0), Col.white);
      U.Box('Havlu', g, V(x, 0.62, -4.1), V(0.92, 0.04, 0.6), Spa.Mint);
      U.Box('Yastik', g, V(x, 0.65, -2.85), V(0.6, 0.1, 0.35), Spa.Rose);
      this.AddOb(x - 0.5, -4.65, x + 0.5, -2.55);
      // mum ve taşlar
      U.Box('Tas', g, V(x + 0.75, 0.05, -2.3), V(0.25, 0.1, 0.2), C(0.3, 0.3, 0.32), 'Sphere');
      const candle = U.Prim('Mum', g, V(x - 0.75, 0.12, -2.3), V(0.1, 0.12, 0.1), U.Glow(C(1, 0.85, 0.5), 2), 'Cylinder');
      this.spots.push(new Spa.Spot({ kind: 'bed', pos: V(x, 0.62, -4.5), fwd: Vec.forward, serve: V(x + 1.0, 0, -4.2), approach: V(x + 1.0, 0, -5.2) }));
    }
    // Manikür ve makyaj köşesi (batı duvarında aynalar)
    for (const z of [-7.0, -9.4]) {
      U.Box('AynaCerceve', g, V(28.78, 1.45, z), V(0.06, 1.1, 0.9), C(0.95, 0.8, 0.45));
      U.Prim('Ayna', g, V(28.82, 1.45, z), V(0.02, 0.95, 0.75), U.Mat(C(0.8, 0.9, 1), 0.95));
      for (let k = -1; k <= 1; k++) U.Prim('AynaIsik', g, V(28.85, 2.02, z + k * 0.3), V(0.08, 0.08, 0.08), U.Glow(C(1, 0.95, 0.85), 2.5), 'Sphere');
      U.Box('Masa', g, V(29.2, 0.4, z), V(0.6, 0.8, 1.0), Col.white);
      U.Box('Oje', g, V(29.15, 0.86, z - 0.25), V(0.06, 0.12, 0.06), C(0.95, 0.3, 0.5), 'Cylinder');
      U.Box('Oje', g, V(29.15, 0.86, z - 0.1), V(0.06, 0.12, 0.06), C(0.6, 0.4, 0.9), 'Cylinder');
      U.Box('Fircalar', g, V(29.2, 0.88, z + 0.25), V(0.12, 0.16, 0.12), C(0.95, 0.85, 0.8), 'Cylinder');
      this.AddOb(28.6, z - 0.55, 29.55, z + 0.55);
      this.Ob(U.Furn('chairCushion', g, V(30.3, 0, z), -90, 2.4, V(0.5, 1, 0.5), wood));
      this.spots.push(new Spa.Spot({ kind: 'chair', pos: V(30.3, 0, z), fwd: Vec.left, serve: V(31.4, 0, z), approach: V(31.4, 0, z - 0.8) }));
    }
    // Süs: bitkiler, aroma, çiçekler, jakuzi
    for (const p of [V(37.9, 0, -11.2), V(29.3, 0, -11.2), V(37.9, 0, -5.6)])
      this.Ob(U.Furn('pottedPlant', g, p, Random.Range(0, 360), 2.4, V(0.5, 1.4, 0.5), C(0.3, 0.65, 0.35)));
    U.Box('Jakuzi', g, V(36.6, 0.3, -8.6), V(2.4, 0.6, 2.4), C(0.95, 0.95, 0.97), 'Cylinder');
    U.Prim('JakuziSu', g, V(36.6, 0.58, -8.6), V(2.1, 0.04, 2.1), U.Mat(C(0.45, 0.8, 0.95), null, null, 0.95, 0.35), 'Cylinder');
    this.bubbles = [];
    for (let k = 0; k < 6; k++) this.bubbles.push(U.Box('Kopuk', g, V(36.6 + Math.cos(k) * 0.6, 0.65, -8.6 + Math.sin(k) * 0.6), V(0.14, 0.14, 0.14), Col.white, 'Sphere'));
    this.AddOb(35.3, -9.9, 37.9, -7.3);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      U.Box('GulYapragi', g, V(33.6 + Math.cos(a) * 1.4, 0.03, -7.2 + Math.sin(a) * 0.9), V(0.12, 0.01, 0.09), Spa.Rose);
    }
    this.pile = MoneyPile.Create(g, V(Spa.DoorX + 1.6, 0, -10.6));
    for (const s of this.spots) {
      s.pad = new ProgressPad(g, Vec.add(s.serve, V(0, 0.02, 0)), 0.5, C(0.85, 0.55, 0.95), C(0.3, 0.95, 0.5));
      s.pad.Show(false);
      s.bubble = U.Text(null, Vec.add(s.pos, V(0, 2.1, 0)), s.kind === 'bed' ? 'Masaj lütfen!' : 'Manikür lütfen!', 0.05, C(0.95, 0.7, 1), true);
      SetActive(s.bubble.gameObject, false);
    }
    const dn = GameManager.I.dayNight;
    dn.AddLamp(V(33.6, 2.8, -4.5), 8, 3.5, C(1, 0.8, 0.85), g);
    dn.AddLamp(V(31, 2.8, -8.5), 7, 3, C(1, 0.85, 0.7), g);
    this.SetOpen(false, false);
  }

  Ob(b) { this.obs.push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z)); return b; }
  AddOb(x0, z0, x1, z1) { this.obs.push(Rect.MinMaxRect(x0, z0, x1, z1)); }

  SetOpen(o, fx) {
    this.Open = o;
    SetActive(this.group, o);
    SetActive(this.lockedGroup, !o);
    if (fx) {
      U.Burst(V(33.6, 1.5, -6.8), Spa.Rose, Spa.Lilac, 110, 6);
      Sfx.Play('unlock');
      GameManager.I.Celebrate('Spa açıldı!', 'Misafirler masaj ve manikür için gelecek. Yanlarındaki dairede durarak bakım yap, ya da bir spa terapisti işe al.');
    }
  }

  // Yürünebilir alan: içerisi ve kapı
  InArea(p, r) {
    if (!this.Open) return false;
    if (p.x > 28.75 + r && p.x < 38.45 - r && p.z > -11.8 + r && p.z < -1.75 - r) return true;
    if (p.x > 32.65 + r && p.x < 34.35 - r && p.z > -12.4 && p.z < -11.5) return true;
    return false;
  }
  Blocked(p, r) {
    if (!this.Open) return false;
    for (const o of this.obs) if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
    return false;
  }

  Join(c) {
    if (!this.Open) return false;
    const free = this.spots.filter(s => s.who == null);
    if (!free.length) return false;
    const s = free[Random.RangeInt(0, free.length)];
    s.who = c; s.state = 1; s.t = 0; s.prog = 0; s.claimed = false;
    c.GoToSpa(s);
    return true;
  }
  Arrived(s) { s.state = 2; s.t = 0; Sfx.Play('pop', 0.4); }
  Free(s) { s.who = null; s.state = 0; s.t = 0; s.prog = 0; s.claimed = false; }
  Waiting() { return this.spots.filter(s => s.state === 2); }

  // Bakım ilerlemesi (müdür ya da terapist)
  Work(s, amount) {
    if (s.state !== 2) return;
    s.prog += amount;
    if (s.prog >= 1) {
      s.state = 3; s.t = Random.Range(5, 7); s.prog = 0; s.claimed = false;
      U.Burst(Vec.add(s.pos, V(0, 0.8, 0)), Spa.Rose, Spa.Lilac, 20, 2.5);
      Sfx.Play('clean', 0.6);
    }
  }

  HireTherapist(name, fx) {
    this.therapistName = name; this.stats.who = name;
    this.therapist = new Therapist(this, name);
    if (fx) { GameManager.I.Notify(name + ' spada terapist olarak başladı!'); GameManager.I.Pop(this.therapist.rig.go); }
  }
  Rename(n) { this.therapistName = n; this.stats.who = n; if (this.therapist) this.therapist.Rename(n); }

  Update() {
    if (!this.Open) return;
    const gm = GameManager.I, dt = Time.deltaTime;
    for (let k = 0; k < this.bubbles.length; k++) this.bubbles[k].position.y = 0.62 + Mathf.Repeat(Time.time * 0.7 + k * 0.3, 0.35);
    for (const s of this.spots) {
      if (s.who && !alive(s.who.go)) this.Free(s);
      const waiting = s.state === 2;
      s.pad.Show(waiting);
      SetActive(s.bubble.gameObject, waiting);
      if (waiting) {
        s.bubble.transform.position.set(s.pos.x, 2.1 + Math.sin(Time.time * 4) * 0.06, s.pos.z);
        if (gm.PlayerNear(s.serve, 0.9)) this.Work(s, dt / 2.2);
        s.pad.Set(s.prog);
        s.t += dt;
        if (s.state === 2 && s.t > 45 * Eco.PatienceMul) {
          gm.FloatText(Vec.add(s.pos, V(0, 2.4, 0)), 'Kimse ilgilenmedi...', C(1, 0.55, 0.5), 0.07);
          Sfx.Play('bad', 0.4);
          const c = s.who; this.Free(s); c.SpaDone(false);
        }
      } else if (s.state === 3) {
        s.t -= dt;
        if (Math.random() < dt * 1.5) gm.FloatText(Vec.add(s.pos, V(Random.Range(-0.3, 0.3), 1.2, 0)), '♥', C(1, 0.6, 0.8), 0.06);
        if (s.t <= 0) {
          const c = s.who;
          const k = c.type === Customer.G.Fenomen ? 1.3 : c.type === Customer.G.Balayi ? 1.2 : c.type === Customer.G.Ogrenci ? 0.7 : 1;
          this.pile.Add(Math.max(1, Mathf.RoundToInt(Eco.SpaPrice * c.PayMul * k)));
          this.Free(s); c.SpaDone(true);
        }
      }
    }
  }
}

// Spa terapisti: bekleyen misafire gidip bakım yapar
class Therapist extends Behaviour {
  constructor(spa, name) {
    super(); this.go.name = 'Terapist';
    this.spa = spa; this.home = V(35.2, 0, -5.6); this.path = []; this.target = null; this.state = 0;
    this.go.position.copy(this.home);
    lookRotation(this.go, Vec.back);
    this.rig = Rig.Model(this.go, 'character-female-e');
    U.Box('Onluk', this.go, V(0, 0.8, 0.2), V(0.5, 0.55, 0.05), Spa.Mint);
    this.nameTag = U.Text(null, V(), name, 0.06, Col.white, true);
    this.name = name;
  }
  get Speed() { return 3 * Eco.StaffMul * this.spa.stats.Speed; }
  Rename(n) { this.name = n; if (this.nameTag) this.nameTag.text = n; }
  Go(to) { this.path.length = 0; const p = this.transform.position; this.path.push(V(p.x, 0, -5.4)); this.path.push(V(to.x, 0, -5.4)); this.path.push(to.clone()); }
  Update() {
    const sp = this.spa, st = sp.stats, T = this.transform;
    st.Tick(Time.deltaTime, this.state !== 0);
    switch (this.state) {
      case 0:
        U.Walk(T, this.path, this.Speed, this.rig);
        if (st.resting) break;
        { const w = sp.Waiting().filter(s => !s.claimed); if (w.length) { this.target = w[0]; w[0].claimed = true; this.Go(w[0].serve); this.state = 1; } }
        break;
      case 1:
        if (!this.target || this.target.state !== 2) { this.Done(); break; }
        if (U.Walk(T, this.path, this.Speed, this.rig)) {
          U.Face(T, Vec.sub(this.target.pos, T.position));
          this.rig.act = Rig.Act.Clean; this.rig.Tick(0);
          sp.Work(this.target, Time.deltaTime / 3.2 * Eco.StaffMul * st.Speed);
          if (this.target.state !== 2) { st.AddXp(1); this.Done(); }
        }
        break;
      case 2:
        if (U.Walk(T, this.path, this.Speed, this.rig)) { U.Face(T, Vec.back); this.state = 0; }
        break;
    }
  }
  Done() {
    this.rig.act = Rig.Act.None;
    if (this.target) this.target.claimed = false;
    this.target = null;
    const w = this.spa.Waiting().filter(s => !s.claimed);
    if (w.length) { this.target = w[0]; w[0].claimed = true; this.Go(w[0].serve); this.state = 1; return; }
    this.Go(this.home); this.state = 2;
  }
  LateUpdate() {
    if (!this.nameTag) return;
    this.nameTag.transform.position.copy(Vec.add(this.transform.position, V(0, 2.75, 0)));
    const want = this.name + (this.spa.stats.resting ? ' (mola)' : '');
    if (this.nameTag.text !== want) this.nameTag.text = want;
  }
}
