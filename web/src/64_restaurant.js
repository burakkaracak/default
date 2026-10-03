// Restoran: lobinin doğusunda ek bina (kafenin arkası). Odadan çıkan misafirler masaya oturup yemek ister.
// Mutfak tabakları kendiliğinden hazırlar; müdür (ya da garson) tezgâhtan tabak alıp masalara götürür.
// Yemeğini yiyen misafir masaya para bırakır.
class Restaurant extends Behaviour {
  static Seat = class {
    constructor(pos, fwd, table) { this.pos = pos; this.fwd = fwd; this.table = table; this.who = null; this.state = 0; this.t = 0; this.claimed = false; this.food = null; }
    // state: 0 boş, 1 geliyor, 2 yemek bekliyor, 3 yiyor
    get Approach() { return Vec.sub(this.pos, Vec.mul(this.fwd, 0.75)); }
  };
  static get PassPad() { return V(24.9, 0, -6.4); }   // tabakların alındığı tezgâh önü
  static get Door() { return V(16.3, 0, -2.4); }
  static get LobbySide() { return V(13.6, 0, -2.4); }
  static AisleZ = -2.4;
  static MaxReady = 6;
  static CookTime = 3.5;
  static get Cap() { return 3 + Eco.Lv(Eco.Up.Carry); }

  constructor() {
    super(); this.go.name = 'Restoran';
    this.Open = false; this.seats = []; this.tables = []; this.obs = [];
    this.ready = 2; this.cookT = 0; this.giveT = 0;
    this.waiterName = ''; this.stats = new StaffStats(); this.waiter = null;
  }
  get HasWaiter() { return this.waiter != null; }

  Build(world, wood) {
    world.add(this.go);
    const warm = C(0.98, 0.93, 0.84), trim = C(0.55, 0.3, 0.22);

    // ---- Açılmadan önce: çim üstünde tabela ----
    this.lockedGroup = U.Pivot(this.go, V(), 'RestoranYakinda');
    const L = this.lockedGroup;
    U.Box('TabelaDirek', L, V(21.5, 0.7, -6.5), V(0.1, 1.4, 0.1), trim);
    U.Box('Tabela', L, V(21.5, 1.45, -6.5), V(2.6, 0.6, 0.1), C(0.16, 0.22, 0.38));
    U.Text(L, V(21.5, 1.5, -6.65), 'RESTORAN', 0.06, C(1, 0.86, 0.42));
    U.Text(L, V(21.5, 0.5, -6.6), 'Menüden açılır', 0.04, C(1, 1, 1, 0.7));
    for (let x = 16; x <= 27; x += 1.6) U.Box('Serit', L, V(x, 0.45, -11.6), V(1.4, 0.12, 0.05), C(1, 0.8, 0.15));

    // ---- Restoran ----
    this.group = U.Pivot(this.go, V(), 'RestoranBina');
    const g = this.group;
    U.Prim('RestZemin', g, V(21.5, -0.04, -6.55), V(12.3, 0.1, 10.7), U.Mat(C(0.86, 0.66, 0.48), U.WoodTex, { x: 5, y: 4 }, 0.35, 0));
    U.Prim('RestHali', g, V(19.8, 0.012, -6.6), V(6.6, 0.02, 8.6), U.Mat(C(0.55, 0.18, 0.2), U.CarpetTex, { x: 3, y: 4 }, 0.05, 0));
    U.Flat('RestHaliKenar', g, V(19.8, 0.006, -6.6), V(6.9, 0.02, 8.9), C(0.95, 0.78, 0.35));
    const wallM = U.Mat(warm, U.StripeTex, { x: 6, y: 1 }, 0.2, 0);
    const W_ = (n, p, s) => GameManager.I.Wall(n, p, s, wallM, trim, g);
    W_('RestGuney', V(21.5, 0.45, -11.95), V(12.4, 0.9, 0.3));
    W_('RestDogu', V(27.65, 0.6, -6.6), V(0.3, 1.2, 10.9));
    W_('RestKuzey', V(21.5, 0.6, -1.25), V(12.4, 1.2, 0.2));
    Events.Shelter(g, V(21.5, 6, -6.55), V(12.4, 14, 10.8));

    // Mutfak: doğu duvarı boyunca tezgâh, arkasında ocak ve aşçı
    let top = 0.92;
    for (let k = -1; k <= 1; k++) {
      const b = U.Furn('kitchenBar', g, V(25.9, 0, -6.4 + k * 0.95), -90, 2.2, V(0.5, 0.92, 0.95), wood);
      this.Ob(b); top = b.max.y;
    }
    this.Ob(U.Furn('kitchenBarEnd', g, V(25.9, 0, -8.0), -90, 2.2, V(0.5, 0.92, 0.25), wood));
    this.Ob(U.Furn('kitchenBarEnd', g, V(25.9, 0, -4.8), -90, 2.2, V(0.5, 0.92, 0.25), wood));
    this.counterTop = top;
    U.Box('Ocak', g, V(27.1, 0.5, -6.4), V(0.7, 1.0, 2.2), C(0.3, 0.32, 0.36));
    U.Box('OcakUst', g, V(27.1, 1.02, -6.4), V(0.72, 0.04, 2.22), C(0.15, 0.15, 0.17));
    U.Box('Tencere', g, V(27.1, 1.2, -6.9), V(0.45, 0.3, 0.45), C(0.75, 0.77, 0.8), 'Cylinder');
    U.Box('Tava', g, V(27.1, 1.08, -5.8), V(0.5, 0.06, 0.5), C(0.2, 0.2, 0.22), 'Cylinder');
    this.steam = U.Box('Buhar', g, V(27.1, 1.55, -6.9), V(0.3, 0.3, 0.3), C(1, 1, 1, 0.5), 'Sphere');
    this.AddObstacle(26.5, -9.2, 27.6, -3.6);
    const chefG = U.Pivot(g, V(), 'Asci');
    setWorldPos(chefG, V(26.75, 0, -6.4));
    lookRotation(chefG, Vec.right);
    this.chef = Rig.Model(chefG, 'character-male-b');
    U.Box('AsciSapka', chefG, V(0, 2.45, 0), V(0.5, 0.45, 0.5), Col.white, 'Cylinder');
    // hazır tabaklar (tezgâhta)
    this.readyMeshes = [];
    for (let k = 0; k < Restaurant.MaxReady; k++) {
      const p = U.Pivot(g, V(25.85, top + 0.03, -7.35 + k * 0.38), 'Tabak');
      U.Box('TabakAlt', p, V(0, 0, 0), V(0.32, 0.03, 0.32), Col.white, 'Cylinder');
      U.Box('Yemek', p, V(0, 0.06, 0), V(0.2, 0.08, 0.2), k % 2 ? C(0.9, 0.55, 0.2) : C(0.45, 0.7, 0.3), 'Sphere');
      this.readyMeshes.push(p);
    }
    this.passPad = new ProgressPad(g, Vec.add(Restaurant.PassPad, V(0, 0.02, 0)), 0.6, C(0.95, 0.6, 0.3), C(0.3, 0.95, 0.5));
    U.Text(g, V(25.3, 2.1, -6.4), 'MUTFAK', 0.05, C(1, 0.86, 0.42));

    // Masalar (3 sıra × 2) ve sandalyeler
    for (const tx of [18.0, 21.6]) for (const tz of [-3.8, -6.7, -9.6]) {
      const table = { pos: V(tx, 0, tz), seats: [], t: 0, pile: null, pad: null };
      table.serve = V(tx, 0, tz - 1.05);
      this.Ob(U.Furn('tableRound', g, V(tx, 0, tz), 0, 1.6, V(1, 0.6, 1.2), wood));
      U.Box('Masaortusu', g, V(tx, 0.74, tz), V(1.05, 0.02, 1.05), Col.white, 'Cylinder');
      U.Box('Mum', g, V(tx, 0.85, tz), V(0.07, 0.18, 0.07), C(1, 0.95, 0.85), 'Cylinder');
      for (const side of [-1, 1]) {
        const pos = V(tx + side * 1.15, 0, tz);
        this.Ob(U.Furn('chairCushion', g, pos, side < 0 ? 90 : -90, 2.4, V(0.5, 1, 0.5), wood));
        const seat = new Restaurant.Seat(pos.clone(), side < 0 ? Vec.right : Vec.left, table);
        const food = U.Pivot(g, V(tx + side * 0.35, 0.8, tz), 'Yemek');
        U.Box('TabakAlt', food, V(), V(0.3, 0.03, 0.3), Col.white, 'Cylinder');
        U.Box('Yemek', food, V(0, 0.05, 0), V(0.18, 0.07, 0.18), C(0.9, 0.55, 0.2), 'Sphere');
        food.visible = false; seat.food = food;
        table.seats.push(seat); this.seats.push(seat);
      }
      table.pad = new ProgressPad(g, Vec.add(table.serve, V(0, 0.02, 0)), 0.5, C(1, 0.6, 0.2), C(0.3, 0.95, 0.5));
      table.pad.Show(false);
      table.pile = MoneyPile.Create(g, V(tx + 0.75, 0, tz - 0.75));
      table.bubble = U.Text(null, V(tx, 2.2, tz), 'Yemek!', 0.06, C(1, 0.75, 0.4), true);
      SetActive(table.bubble.gameObject, false);
      this.tables.push(table);
    }
    for (const p of [V(16.0, 0, -11.2), V(16.0, 0, -4.6), V(26.8, 0, -11.2), V(26.8, 0, -2.0)])
      this.Ob(U.Furn('pottedPlant', g, p, Random.Range(0, 360), 2.4, V(0.5, 1.4, 0.5), C(0.3, 0.65, 0.35)));
    // Tabela ve ışıklar
    U.Box('RestTabela', g, V(21.5, 1.55, -1.25), V(4.2, 0.6, 0.12), C(0.16, 0.22, 0.38));
    U.Text(g, V(21.5, 1.6, -1.4), 'RESTORAN', 0.07, C(1, 0.86, 0.42));
    for (let x = 16.2; x <= 27; x += 0.9) U.Prim('Ampul', g, V(x, 2.0 + Math.sin(x * 0.8) * 0.1, -11.85), V(0.11, 0.11, 0.11), U.Glow(C(1, 0.85, 0.5), 2.5), 'Sphere');
    const dn = GameManager.I.dayNight;
    dn.AddLamp(V(19.5, 3, -4.5), 9, 4, C(1, 0.82, 0.55), g);
    dn.AddLamp(V(19.5, 3, -9), 9, 4, C(1, 0.82, 0.55), g);
    dn.AddLamp(V(25.5, 3, -6.4), 7, 3.5, C(1, 0.82, 0.55), g);
    this.SetOpen(false, false);
  }

  Ob(b) { this.obs.push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z)); return b; }
  AddObstacle(x0, z0, x1, z1) { this.obs.push(Rect.MinMaxRect(x0, z0, x1, z1)); }

  SetOpen(o, fx) {
    this.Open = o;
    SetActive(this.group, o);
    SetActive(this.lockedGroup, !o);
    GameManager.I.SetRestaurantDoor(o);
    if (fx) {
      U.Burst(V(21.5, 1.5, -6.5), C(1, 0.8, 0.4), C(0.9, 0.3, 0.3), 100, 6);
      Sfx.Play('unlock');
      GameManager.I.Celebrate('Restoran açıldı!', 'Misafirler yemeğe gelecek. Mutfaktan tabakları alıp masalara götür, ya da bir garson işe al.');
    }
  }

  // Yürünebilir alan: salon ve lobiye açılan kapı
  InArea(p, r) {
    if (!this.Open) return false;
    if (p.x > 15.4 + r && p.x < 27.5 - r && p.z > -11.8 + r && p.z < -1.35 - r) return true;
    if (p.x > 14.5 && p.x < 16.2 && p.z > -3.35 + r && p.z < -1.45 - r) return true;
    return false;
  }

  Blocked(p, r) {
    if (!this.Open) return false;
    for (const o of this.obs) if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
    return false;
  }

  FreeSeat() {
    // boş masadan başla ki misafirler dağılsın
    const empty = this.seats.filter(s => s.who == null);
    if (!empty.length) return null;
    const lonely = empty.filter(s => s.table.seats.every(x => x.who == null));
    const pool = lonely.length ? lonely : empty;
    return pool[Random.RangeInt(0, pool.length)];
  }

  Join(c) {
    if (!this.Open) return false;
    const s = this.FreeSeat();
    if (!s) return false;
    s.who = c; s.state = 1; s.t = 0; s.claimed = false;
    c.GoToRestaurant(s);
    return true;
  }

  // Misafir masaya oturdu: sipariş verir
  Seated(s) { s.state = 2; s.t = 0; Sfx.Play('pop', 0.4); }

  Serve(s) {
    s.state = 3; s.t = Random.Range(5, 7); s.claimed = false;
    s.food.visible = true;
    GameManager.I.Pop(s.food);
    Sfx.Play('tick', 0.5);
  }

  Free(s) { s.who = null; s.state = 0; s.t = 0; s.claimed = false; s.food.visible = false; }

  Remove(c) { for (const s of this.seats) if (s.who === c) this.Free(s); }

  WaitingSeats() { return this.seats.filter(s => s.state === 2); }

  HireWaiter(name, fx) {
    this.waiterName = name; this.stats.who = name;
    this.waiter = new Waiter(this, name);
    if (fx) { GameManager.I.Notify(name + ' restoranda garson olarak başladı!'); GameManager.I.Pop(this.waiter.rig.go); }
  }

  Rename(n) { this.waiterName = n; this.stats.who = n; if (this.waiter) this.waiter.Rename(n); }

  Update() {
    if (!this.Open) return;
    const gm = GameManager.I, dt = Time.deltaTime;
    // Mutfak: tabak hazırlar
    if (this.ready < Restaurant.MaxReady) {
      this.cookT += dt * Eco.StaffMul;
      if (this.cookT >= Restaurant.CookTime) { this.cookT = 0; this.ready++; }
    }
    this.chef.act = this.ready < Restaurant.MaxReady ? Rig.Act.Clean : Rig.Act.None;
    this.chef.Tick(0);
    this.steam.position.y = 1.55 + Mathf.Repeat(Time.time * 0.6, 0.5);
    this.steam.visible = this.ready < Restaurant.MaxReady;
    for (let i = 0; i < this.readyMeshes.length; i++) if (this.readyMeshes[i].visible !== (i < this.ready)) this.readyMeshes[i].visible = i < this.ready;

    // Müdür tezgâhtan tabak alır
    let onPass = false;
    for (const p of gm.players) {
      if (!p || U.FlatDist(p.transform.position, Restaurant.PassPad) > 0.75) continue;
      onPass = true;
      if (p.plates >= Restaurant.Cap || this.ready <= 0) continue;
      this.giveT += dt;
      if (this.giveT >= 0.15) { this.giveT = 0; this.ready--; p.plates++; Sfx.Play('tick', 0.35); }
    }
    this.passPad.Set(onPass ? 1 : 0);

    // Masalar: bekleme, servis, yemek
    for (const tb of this.tables) {
      const waiting = tb.seats.filter(s => s.state === 2);
      tb.pad.Show(waiting.length > 0);
      SetActive(tb.bubble.gameObject, waiting.length > 0);
      if (waiting.length) tb.bubble.transform.position.set(tb.pos.x, 2.3 + Math.sin(Time.time * 4) * 0.06, tb.pos.z);
      const p = gm.NearestPlayer(tb.serve, 0.95);
      if (waiting.length && p && p.plates > 0) {
        tb.t += dt / 0.45;
        if (tb.t >= 1) { tb.t = 0; p.plates--; this.Serve(waiting[0]); }
      } else tb.t = Math.max(0, tb.t - dt);
      tb.pad.Set(tb.t);
    }
    for (const s of this.seats) {
      if (!s.who) continue;
      if (!alive(s.who.go)) { this.Free(s); continue; }
      if (s.state === 2) {
        s.t += dt;
        if (s.t > 35 * Eco.PatienceMul * (s.who.type === Customer.G.Emekli ? 1.5 : 1)) {
          // yemek gelmedi: üzgün ayrılır, para bırakmaz
          gm.FloatText(Vec.add(s.pos, V(0, 2.4, 0)), 'Yemek gelmedi...', C(1, 0.55, 0.5), 0.07);
          Sfx.Play('bad', 0.4);
          const c = s.who; this.Free(s); c.RestDone(false);
        }
      } else if (s.state === 3) {
        s.t -= dt;
        if (s.t <= 0) {
          const c = s.who;
          const tip = c.type === Customer.G.Emekli ? 1.4 : c.type === Customer.G.Ogrenci ? 0.7 : 1;
          s.table.pile.Add(Math.max(1, Mathf.RoundToInt(Eco.RestPrice * c.PayMul * tip)));
          Quests.Track('earned', 0);
          this.Free(s); c.RestDone(true);
        }
      }
    }
  }
}

// Garson: mutfaktan tabak alır, bekleyen masalara götürür
class Waiter extends Behaviour {
  constructor(rest, name) {
    super(); this.go.name = 'Garson';
    this.rest = rest; this.home = V(24.2, 0, -10.6); this.path = []; this.state = 0; this.target = null; this.plates = 0; this.t = 0;
    this.go.position.copy(this.home);
    lookRotation(this.go, Vec.left);
    this.rig = Rig.Model(this.go, 'character-female-a');
    U.Box('Onluk', this.go, V(0, 0.75, 0.2), V(0.5, 0.5, 0.05), Col.white);
    this.tray = U.Pivot(this.go, V(0.35, 1.25, 0.25), 'Tepsi');
    U.Box('TepsiAlt', this.tray, V(), V(0.5, 0.03, 0.5), C(0.75, 0.77, 0.8), 'Cylinder');
    this.trayFood = U.Box('Yemek', this.tray, V(0, 0.07, 0), V(0.2, 0.09, 0.2), C(0.9, 0.55, 0.2), 'Sphere');
    this.nameTag = U.Text(null, V(), name, 0.06, Col.white, true);
    this.name = name;
  }
  get Speed() { return 3.2 * Eco.StaffMul * this.rest.stats.Speed; }
  Rename(n) { this.name = n; if (this.nameTag) this.nameTag.text = n; }

  // Salonda masaların arasından: sütun (x 16.1 / 19.8 / 23.6) → kuzey koridoru → hedefin sütunu
  static Col(x) { return x < 17.5 ? 16.1 : x < 22.9 ? 19.8 : 23.6; }
  Route(to) {
    this.path.length = 0;
    const p = this.transform.position, a = Waiter.Col(p.x), b = Waiter.Col(to.x);
    this.path.push(V(a, 0, p.z));
    if (a !== b) { this.path.push(V(a, 0, Restaurant.AisleZ)); this.path.push(V(b, 0, Restaurant.AisleZ)); }
    this.path.push(V(b, 0, to.z));
    this.path.push(to.clone());
  }

  Update() {
    const r = this.rest, st = r.stats, T = this.transform;
    const working = this.state !== 0;
    st.Tick(Time.deltaTime, working);
    this.tray.visible = this.plates > 0;
    switch (this.state) {
      case 0: // boşta
        U.Walk(T, this.path, this.Speed, this.rig);
        if (st.resting) break;
        if (r.ready > 0 && r.WaitingSeats().some(s => !s.claimed)) { this.Route(Restaurant.PassPad); this.state = 1; }
        break;
      case 1: // tezgâha
        if (U.Walk(T, this.path, this.Speed, this.rig)) {
          U.Face(T, Vec.right);
          const want = Math.min(3, r.WaitingSeats().filter(s => !s.claimed).length);
          const got = Math.min(want, r.ready);
          if (got > 0) { r.ready -= got; this.plates = got; Sfx.Play('tick', 0.3); this.Next(); }
        }
        break;
      case 2: // masaya
        if (!this.target || this.target.state !== 2) { this.Next(); break; }
        if (U.Walk(T, this.path, this.Speed, this.rig)) {
          this.rig.act = Rig.Act.Clean; this.rig.Tick(0);
          U.Face(T, Vec.forward);
          this.t += Time.deltaTime / 0.6;
          if (this.t >= 1) { this.t = 0; this.rig.act = Rig.Act.None; this.plates--; r.Serve(this.target); st.AddXp(1); this.Next(); }
        }
        break;
      case 3: // eve dön
        if (U.Walk(T, this.path, this.Speed, this.rig)) { U.Face(T, Vec.left); this.state = 0; }
        break;
    }
  }

  // Sıradaki bekleyen masaya; tabak bitti ya da kimse beklemiyorsa geri dön
  Next() {
    if (this.target) this.target.claimed = false;
    this.target = null;
    const free = this.rest.WaitingSeats().filter(s => !s.claimed);
    if (this.plates > 0 && free.length) {
      const p = this.transform.position;
      free.sort((a, b) => U.FlatDist(a.table.serve, p) - U.FlatDist(b.table.serve, p));
      this.target = free[0]; this.target.claimed = true;
      this.Route(this.target.table.serve); this.state = 2; this.t = 0;
      return;
    }
    if (this.plates > 0) { this.rest.ready = Math.min(Restaurant.MaxReady, this.rest.ready + this.plates); this.plates = 0; }
    this.Route(this.home); this.state = 3;
  }

  LateUpdate() {
    if (this.nameTag) {
      this.nameTag.transform.position.copy(Vec.add(this.transform.position, V(0, 2.75, 0)));
      const want = this.name + (this.rest.stats.resting ? ' (mola)' : '');
      if (this.nameTag.text !== want) this.nameTag.text = want;
    }
  }
}
