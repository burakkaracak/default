// Müşteri: gelir, bekler, odada uyur, istek yapar; çıkışta kafe ya da havuza uğrayabilir
class Customer extends Behaviour {
  static S = { Queue: 0, Seat: 1, ToRoom: 2, Sleeping: 3, Cafe: 4, CafeSeat: 5, Swim: 6, Leaving: 7, Rest: 8, Spa: 9 };
  static G = { Normal: 0, Is: 1, Turist: 2, Balayi: 3, Aile: 4, Kopekli: 5, Fenomen: 6, Emekli: 7, Ogrenci: 8, Sporcu: 9 };
  static TypeNames = ['', 'İş insanı', 'Turist', 'Balayı çifti ♥', 'Aile', 'Köpekli misafir', 'Fenomen', 'Emekli', 'Öğrenci', 'Sporcu'];
  static get Entrance() { return V(0, 0, -11); }
  static get Sidewalk() { return V(0, 0, -14); }
  static get LoungeGate() { return V(-8.6, 0, -9.15); }
  static Speed = 3.4;
  static next = null;
  // Özel misafir ayarı (olaylar, müdavimler, müfettiş için)
  static Config = class { constructor() { this.type = 0; this.vip = false; this.celebrity = false; this.inspector = false; this.regular = null; this.reservation = null; } };
  static UmbColors = [C(0.9, 0.25, 0.3), C(0.25, 0.45, 0.85), C(0.98, 0.8, 0.25), C(0.3, 0.7, 0.45), C(0.6, 0.35, 0.75), C(0.15, 0.15, 0.18)];

  constructor() {
    super(); this.go.name = 'Musteri';
    const S = Customer.S, G = Customer.G;
    this.s = S.Queue; this.path = [];
    this.type = G.Normal; this.vip = false; this.celebrity = false; this.inspector = false;
    this.regular = null; this.reservation = null; this.satAdj = 0; this.askedUpgrade = false; this.budget = 3;
    this.follower = null; this.typeTag = null; this.room = null; this.seat = null; this.cafeSeat = null; this.swimSpot = null;
    this.zzz = null; this.vipTag = null; this.umbrella = null;
    this.passedDoor = false; this.sitting = false; this.swimming = false; this.reqDone = false; this.reqFailed = false; this.asked = false;
    this.sleepT = 0; this.patience = 0; this.pause = 0; this.waited = 0; this.actT = 0; this.reqWait = 0; this.pauseAct = Rig.Act.None;

    const gm = GameManager.I, cfg = Customer.next;
    Customer.next = null;
    if (cfg != null) {
      this.type = cfg.type || 0; this.vip = !!cfg.vip; this.celebrity = !!cfg.celebrity; this.inspector = !!cfg.inspector;
      this.regular = cfg.regular || null; this.reservation = cfg.reservation || null;
    } else {
      let lux = false;
      for (const r of gm.rooms) if (r.level >= 2) lux = true;
      this.vip = lux && Quests.Total('served') >= 8 && Random.value < 0.12 * Pricing.VipMul;
      if (!this.vip && Quests.Total('served') >= 5) {
        const r = Random.value;
        const love = Seasons.SpecialDay === 'sevgililer';
        const bz = Regulars.BusinessPerk ? 0.12 : 0;
        // şehre göre misafir karışımı (Bodrum: turist ve balayı, Kapadokya: balayı ve turist)
        const hb = Chain.Bias(G.Balayi), ha = Chain.Bias(G.Aile), hi = Chain.Bias(G.Is), ht = Chain.Bias(G.Turist);
        const b1 = (love ? 0.3 : 0.1) * hb;
        const b2 = b1 + (love ? 0.1 : 0.1) * ha;
        const b3 = b2 + ((love ? 0.15 : 0.2) + bz) * hi;
        const b4 = b3 + (love ? 0.15 : 0.2) * ht;
        // yeni misafir türleri
        const b5 = b4 + 0.07, b6 = b5 + 0.07, b7 = b6 + 0.06, b8 = b7 + 0.06, b9 = b8 + (gm.Stars >= 3.5 ? 0.05 : 0);
        if (r < b1) this.type = G.Balayi; else if (r < b2) this.type = G.Aile; else if (r < b3) this.type = G.Is; else if (r < b4) this.type = G.Turist;
        else if (r < b5) this.type = G.Emekli; else if (r < b6) this.type = G.Ogrenci; else if (r < b7) this.type = G.Kopekli; else if (r < b8) this.type = G.Sporcu; else if (r < b9) this.type = G.Fenomen;
      }
    }
    // Bütçe: herkes en iyi odayı istemez; böylece bazıları daha iyi oda ister (yükseltme isteği)
    const bq = Random.value, t = this.type;
    if (this.vip || this.celebrity || this.inspector) this.budget = 3;
    else if (this.reservation != null) this.budget = this.reservation.level;
    else if (t === G.Is) this.budget = bq < 0.3 ? 1 : bq < 0.7 ? 2 : 3;
    else if (t === G.Balayi) this.budget = bq < 0.2 ? 1 : bq < 0.6 ? 2 : 3;
    else if (t === G.Aile) this.budget = bq < 0.4 ? 1 : bq < 0.8 ? 2 : 3;
    else if (t === G.Turist) this.budget = bq < 0.55 ? 1 : bq < 0.9 ? 2 : 3;
    else if (t === G.Ogrenci) this.budget = bq < 0.8 ? 1 : 2;
    else if (t === G.Emekli) this.budget = bq < 0.3 ? 1 : bq < 0.7 ? 2 : 3;
    else if (t === G.Fenomen) this.budget = bq < 0.25 ? 2 : 3;
    else if (t === G.Sporcu) this.budget = bq < 0.35 ? 1 : bq < 0.75 ? 2 : 3;
    else this.budget = bq < 0.45 ? 1 : bq < 0.8 ? 2 : 3;
    if (this.regular != null) this.budget = 3;

    let look = Rig.Guests[Random.RangeInt(0, Rig.Guests.length)];
    if (t === G.Is) look = Random.value < 0.5 ? 'character-male-d' : 'character-female-d';
    if (this.regular != null) look = this.regular.look;
    this.rig = Rig.Model(this.go, look); this.look = look;
    this.mood = U.Text(null, V(), '', 0.12, Col.white, true);
    SetActive(this.mood.gameObject, false);
    const pt = t === G.Is ? 0.7 : t === G.Aile ? 0.85 : t === G.Turist ? 1.1 : t === G.Fenomen ? 0.75 : t === G.Emekli ? 1.5 : t === G.Ogrenci ? 1.2 : t === G.Sporcu ? 0.9 : 1;
    this.patience = (this.vip ? 35 : 45) * pt * Eco.PatienceMul;
    if (this.regular != null) this.patience *= 1.3;
    if (this.reservation != null) this.patience *= 1.25;
    if (this.celebrity) this.patience = 28 * Eco.PatienceMul;

    if (t === G.Turist) U.Box('SirtCantasi', this.go, V(0, 1.05, -0.42), V(0.5, 0.6, 0.28), C(0.95, 0.55, 0.2));
    if (t === G.Ogrenci) U.Box('SirtCantasi', this.go, V(0, 1.05, -0.42), V(0.46, 0.55, 0.26), C(0.3, 0.5, 0.9));
    if (t === G.Fenomen) U.Box('Telefon', this.go, V(0.32, 1.35, 0.3), V(0.1, 0.2, 0.03), C(0.12, 0.12, 0.15));
    if (t === G.Sporcu) U.Box('Bandana', this.go, V(0, 1.98, 0), V(0.62, 0.08, 0.62), C(0.95, 0.3, 0.3), 'Cylinder');
    if (t === G.Kopekli) this.dog = Dog.Make(this);
    if (t === G.Balayi) {
      const partner = this.regular != null && this.regular.partner != null ? this.regular.partner : Rig.Guests[Random.RangeInt(0, Rig.Guests.length)];
      this.follower = Follower.Make(this, partner, 1);
    }
    if (t === G.Aile) this.follower = Follower.Make(this, Rig.Guests[Random.RangeInt(0, Rig.Guests.length)], 0.62);
    if (this.regular != null) this.typeTag = U.Text(null, V(), '★ ' + this.regular.name, 0.055, C(1, 0.82, 0.35), true);
    else if (this.reservation != null) this.typeTag = U.Text(null, V(), 'Rezervasyon · ' + this.reservation.name, 0.05, C(0.5, 0.95, 1), true);
    else if (this.celebrity) this.typeTag = U.Text(null, V(), 'Ünlü sanatçı', 0.055, C(1, 0.6, 0.9), true);
    else if (t !== G.Normal && !this.inspector) {
      const tn = Customer.TypeNames;
      const tc = [Col.white, C(0.6, 0.85, 1), C(0.6, 1, 0.6), C(1, 0.6, 0.8), C(1, 0.8, 0.45), C(0.95, 0.75, 0.55), C(1, 0.55, 0.85), C(0.85, 0.85, 1), C(0.55, 0.8, 1), C(1, 0.6, 0.45)];
      this.typeTag = U.Text(null, V(), tn[t], 0.05, tc[t], true);
    }
    if (this.vip) {
      const gold = C(1, 0.82, 0.25);
      U.Box('Tac', this.go, V(0, 2.32, 0), V(0.55, 0.12, 0.55), gold, 'Cylinder');
      for (let k = 0; k < 5; k++) {
        const a = k * Math.PI * 2 / 5;
        U.Box('TacUc', this.go, V(Math.cos(a) * 0.22, 2.48, Math.sin(a) * 0.22), V(0.12, 0.12, 0.12), gold, 'Sphere');
      }
      this.vipTag = U.Text(null, V(), 'VIP', 0.07, gold, true);
    }
  }

  get Arrived() { return this.s === Customer.S.Queue && this.path.length === 0; }
  get Busy() { return this.s === Customer.S.Sleeping || this.sitting || this.swimming; }
  get PayMul() {
    const G = Customer.G;
    const tm = { [G.Kopekli]: 1.25, [G.Fenomen]: 1.3, [G.Emekli]: 1.1, [G.Ogrenci]: 0.8, [G.Sporcu]: 1.15 }[this.type] || 1;
    return (this.celebrity ? 3 : this.vip ? 2 : 1) * (this.type === G.Is ? (Regulars.BusinessPerk ? 1.43 : 1.3) : this.type === G.Balayi || this.type === G.Aile ? 1.5 : tm) * (this.reservation != null ? 1.2 : 1);
  }
  // Bu misafirin kabul edeceği en düşük oda seviyesi
  get MinLevel() { return Math.max(this.vip || this.celebrity ? 2 : 1, this.reservation != null ? this.reservation.level : 1); }
  get Lux() { return this.vip || this.celebrity; }
  get CafeArrived() { return this.s === Customer.S.Cafe && this.path.length === 0; }

  RequestList() {
    const G = Customer.G;
    if (this.regular != null) return [this.regular.request[Regulars.Chapter(this.regular)]];
    if (this.celebrity) return ['Şampanya lütfen!', 'Taze çiçekler!', 'Masaj randevusu?'];
    switch (this.type) {
      case G.Is: return ['Kahve lütfen!', 'Ütü lazım!', 'İnternet şifresi?'];
      case G.Turist: return ['Şehir haritası?', 'Havlu lütfen!', 'Su getirir misin?'];
      case G.Balayi: return ['Gül yaprakları!', 'Şampanya lütfen!', 'Çikolata?'];
      case G.Aile: return ['Ekstra yatak!', 'Oyuncak var mı?', 'Çocuk menüsü?'];
      case G.Kopekli: return ['Mama kabı lütfen!', 'Köpek yatağı?', 'Su kabı getirir misin?'];
      case G.Fenomen: return ['Ring ışığı var mı?', 'Wi-Fi şifresi!', 'Çiçek buketi lütfen!'];
      case G.Emekli: return ['Bir çay lütfen!', 'Gazete var mı?', 'Ekstra battaniye!'];
      case G.Ogrenci: return ['Wi-Fi şifresi?', 'Atıştırmalık var mı?', 'Şarj aleti?'];
      case G.Sporcu: return ['Protein içeceği!', 'Buz torbası?', 'Havlu lütfen!'];
    }
    return null;
  }

  // ---------------- Yollar ----------------
  StartPath() {
    this.path.length = 0;
    if (this.passedDoor) return;
    const p = this.transform.position;
    if (p.z < -12.6 && Math.abs(p.x) > 1) this.path.push(Customer.Sidewalk);
    this.path.push(Customer.Entrance);
  }

  StandUp() {
    if (!this.sitting) return;
    this.sitting = false;
    if (this.seat != null) this.transform.position.copy(Vec.add(this.seat.pos, Vec.mul(this.seat.fwd, 0.9)));
    else if (this.cafeSeat != null) this.transform.position.copy(Vec.add(this.cafeSeat.pos, Vec.mul(this.cafeSeat.fwd, 0.9)));
    else if (this.restSeat != null) this.transform.position.copy(this.restSeat.Approach);
    this.rig.act = Rig.Act.None;
  }

  GoToSlot(p) {
    const fromSeat = this.s === Customer.S.Seat;
    this.StandUp();
    this.s = Customer.S.Queue;
    if (fromSeat) { this.path.length = 0; this.path.push(Customer.LoungeGate); }
    else this.StartPath();
    this.path.push(p.clone());
    this.seat = null;
  }

  GoToSeat(st) {
    this.seat = st;
    this.s = Customer.S.Seat;
    this.StartPath();
    this.path.push(Customer.LoungeGate);
    this.path.push(Vec.add(st.pos, Vec.mul(st.fwd, 0.9)));
  }

  GoToRoom(r) {
    this.room = r;
    this.s = Customer.S.ToRoom;
    this.HideMood();
    if (this.vip) Quests.Track('vip');
    this.path.length = 0;
    const left = r.x < -6, side = left ? -9.0 : -3.3;
    this.path.push(V(side, 0, this.transform.position.z));
    this.path.push(V(side, 0, -1));
    if (r.oz > 0) { this.path.push(Elevator.LobbyPad); this.path.push(Elevator.UpPad); }
    this.path.push(r.Door);
    this.path.push(r.Inside);
  }

  // Odadan ya da bir alandan çıkışta lobiye dönüş noktaları
  ToLobby(from) {
    if (from.z > 20) {
      this.path.push(V(from.x, 0, Elevator.Floor2Z + 2.5));
      this.path.push(Elevator.UpPad);
      this.path.push(Elevator.LobbyPad);
      return;
    }
    if (from.z > 3) this.path.push(V(from.x, 0, 2.5));
    if (from.x > 15) this.path.push(V(14, 0, 1.5));
    if (from.x < -15) { this.path.push(Pool.DoorOut); this.path.push(Pool.DoorIn); }
  }

  ExitPath(from) {
    this.path.length = 0;
    this.ToLobby(from);
    const p = this.path.length > 0 ? this.path[this.path.length - 1] : from;
    if (p.x < -6) {
      if (p.z > -2) { this.path.push(V(-9, 0, -1)); this.path.push(V(-9, 0, -6)); }
      this.path.push(V(-7.5, 0, -10.3));
    }
    this.path.push(Customer.Entrance);
    this.path.push(Customer.Sidewalk);
    this.path.push(V(Random.value < 0.5 ? -26 : 26, 0, -14));
  }

  GoToCafe(slot) {
    if (this.s !== Customer.S.Cafe) {
      this.s = Customer.S.Cafe;
      this.path.length = 0;
      this.ToLobby(this.transform.position.clone());
      const p = this.path.length > 0 ? this.path[this.path.length - 1] : this.transform.position;
      if (p.x < -6) this.path.push(V(-9, 0, -1));
      this.path.push(V(8.5, 0, -2.5));
    } else {
      // sıradaki yeri güncelle: son hedefi değiştir
      if (this.path.length > 0) this.path.pop();
    }
    this.path.push(slot.clone());
  }

  CafeServed(st) {
    this.cafeSeat = st;
    if (st == null) { this.Leave(); return; }
    this.s = Customer.S.CafeSeat;
    this.path.length = 0;
    this.path.push(Vec.add(st.pos, Vec.mul(st.fwd, 0.9)));
    this.actT = Random.Range(4, 6);
  }

  GoToRestaurant(st) {
    this.restSeat = st;
    this.s = Customer.S.Rest;
    this.path.length = 0;
    this.ToLobby(this.transform.position.clone());
    const p = this.path.length > 0 ? this.path[this.path.length - 1] : this.transform.position;
    if (p.x < -6) this.path.push(V(-9, 0, -1));
    const a = st.Approach;
    this.path.push(Restaurant.LobbySide, Restaurant.Door, V(a.x, 0, Restaurant.AisleZ), a);
  }

  // Restorandan kalkış: yediyse mutlu, yemek gelmediyse üzgün
  RestDone(ate) {
    const st = this.restSeat;
    this.StandUp();
    this.restSeat = null;
    this.s = Customer.S.Leaving;
    const a = st.Approach;
    this.ExitPath(Restaurant.LobbySide);
    this.path.unshift(V(a.x, 0, Restaurant.AisleZ), Restaurant.Door, Restaurant.LobbySide);
    GameManager.I.FloatText(Vec.add(this.transform.position, V(0, 2.6, 0)), ate ? '♥' : '☹', ate ? C(1, 0.45, 0.6) : C(0.7, 0.7, 0.75), 0.14);
  }

  // Spa: lobiden ön kapıya, kaldırımdan spa kapısına
  GoToSpa(st) {
    this.spaSpot = st;
    this.s = Customer.S.Spa;
    this.ExitPath(this.transform.position.clone());
    this.path.pop(); // sokağa çıkış yerine spaya
    this.path.push(Spa.Street, Spa.DoorOut, Spa.DoorIn, st.approach.clone(), st.kind === 'bed' ? V(st.pos.x, 0, st.pos.z) : st.pos.clone());
  }

  SpaDone(happy) {
    const st = this.spaSpot;
    this.sitting = false; this.rig.act = Rig.Act.None;
    this.transform.position.copy(st.approach);
    this.transform.rotation.set(0, 0, 0);
    this.spaSpot = null;
    this.s = Customer.S.Leaving;
    this.path.length = 0;
    this.path.push(Spa.DoorIn, Spa.DoorOut, Spa.Street, V(46, 0, -14));
    GameManager.I.FloatText(Vec.add(this.transform.position, V(0, 2.6, 0)), happy ? '♥♥' : '☹', happy ? C(1, 0.5, 0.75) : C(0.7, 0.7, 0.75), 0.14);
  }

  GoSwim(sp) {
    this.swimSpot = sp;
    this.s = Customer.S.Swim;
    this.path.length = 0;
    this.ToLobby(this.transform.position.clone());
    this.path.push(V(-12, 0, 1.0));
    this.path.push(Pool.DoorIn);
    this.path.push(Pool.DoorOut);
    this.path.push(V(sp.pos.x, 0, 3.15));
    this.actT = Random.Range(6, 9);
  }

  Leave() { this.s = Customer.S.Leaving; this.ExitPath(this.transform.position.clone()); }

  // ---------------- Durum ----------------
  OnRequestDone() { this.reqDone = true; }

  Satisfaction() {
    const G = Customer.G, room = this.room;
    let sat = 3;
    let lv = room != null ? room.level : 1;
    if (room != null) { sat += RoomKinds.Bonus(room.kind, this.type, this.vip); if (room.IsSuite) lv = 3; }
    sat += Pricing.Sat(lv) + this.satAdj;
    if (this.reservation != null && room != null && room.level >= this.reservation.level) sat += 0.3;
    sat += lv === 2 ? 0.7 : lv >= 3 ? 1.4 : 0;
    if (this.vip && lv < 3) sat -= 0.6;
    if (this.waited < 15) sat += 0.5; else if (this.waited > 35) sat -= 0.6;
    if (this.reqDone) sat += 0.6;
    if (this.reqFailed) sat -= 0.8;
    if (this.type === G.Balayi) sat += lv >= 3 ? 0.8 : lv <= 1 ? -0.5 : 0;
    if (this.type === G.Aile && lv >= 2) sat += 0.4;
    if (this.type === G.Is && this.waited > 20) sat -= 0.4;
    if (this.type === G.Kopekli) sat += lv >= 2 ? 0.3 : -0.2;            // köpekle geniş oda ister
    if (this.type === G.Fenomen) { if (this.waited > 20) sat -= 0.5; if (room != null && room.theme > 0) sat += 0.4; } // fotoğraflık oda sever
    if (this.type === G.Emekli) sat += 0.2;                                // kolay memnun olur
    if (this.type === G.Ogrenci && lv <= 1) sat += 0.4;                    // ucuz oda yeter
    if (this.type === G.Sporcu && GameManager.I.pool.Open) sat += 0.3;
    sat += GameManager.I.DecorBonus;
    if (room != null) sat += Themes.Bonus(room.theme, this.type);
    sat += Events.SatBonus;
    if (GameManager.I.catAdopted) sat += 0.1;
    if (this.celebrity && (room == null || room.level < 3)) sat -= 1;
    if (this.regular != null && room != null && room.level < this.regular.minLevel[Regulars.Chapter(this.regular)]) sat -= 1;
    if (this.inspector && !this.reqDone) sat -= 0.5;
    return Mathf.Clamp(sat, 1, 5);
  }

  ShowMood(t, c) { SetActive(this.mood.gameObject, true); this.mood.text = t; this.mood.color = c; }
  HideMood() { if (this.mood) SetActive(this.mood.gameObject, false); }

  // Yağmurda dışarıda yürürken şemsiye açar
  UpdateUmbrella() {
    const p = this.transform.position;
    const outside = (p.z < -12.45 || p.x < -15.5) && !this.Busy && this.pause <= 0;
    const want = outside && Events.Wet;
    if (want && this.umbrella == null) {
      this.umbrella = U.Pivot(this.go, V(), 'Semsiye');
      const c = Customer.UmbColors[Random.RangeInt(0, Customer.UmbColors.length)];
      U.Box('Sap', this.umbrella, V(0.25, 1.8, 0.1), V(0.04, 0.55, 0.04), C(0.2, 0.18, 0.16), 'Cylinder');
      U.Box('Kubbe', this.umbrella, V(0.25, 2.38, 0.1), V(1.15, 0.32, 1.15), c, 'Sphere');
      U.Box('Tepe', this.umbrella, V(0.25, 2.56, 0.1), V(0.08, 0.1, 0.08), C(0.2, 0.18, 0.16), 'Sphere');
    }
    if (this.umbrella && this.umbrella.visible !== want) this.umbrella.visible = want;
  }

  LateUpdate() {
    this.UpdateUmbrella();
    const pos = this.transform.position;
    const h = this.sitting ? 2.3 : this.swimming ? 1.6 : 2.75;
    if (this.mood && activeSelf(this.mood.gameObject))
      this.mood.transform.position.set(pos.x, pos.y + h + (this.vip ? 0.35 : 0) + Math.sin(Time.time * 4) * 0.06, pos.z);
    if (this.typeTag) {
      SetActive(this.typeTag.gameObject, !this.Busy && this.s !== Customer.S.Leaving);
      this.typeTag.transform.position.set(pos.x, pos.y + h + (this.vip ? 0.4 : 0.05), pos.z);
    }
    if (this.vipTag) {
      SetActive(this.vipTag.gameObject, this.s !== Customer.S.Sleeping);
      this.vipTag.transform.position.set(pos.x, pos.y + h + 0.05, pos.z);
    }
  }

  destroy() {
    for (const t of [this.mood, this.zzz, this.vipTag, this.typeTag]) if (t) Destroy(t.gameObject);
    if (this.follower) Destroy(this.follower.go);
    if (this.dog) Destroy(this.dog.go);
    Destroy(this.go);
  }

  Update() {
    const S = Customer.S, T = this.transform, rig = this.rig, gm = GameManager.I;
    if (this.pause > 0) {
      this.pause -= Time.deltaTime;
      rig.act = this.pause > 0 ? this.pauseAct : Rig.Act.None;
      rig.Tick(0);
      return;
    }
    if (!this.passedDoor && T.position.z > -11.5) this.passedDoor = true;
    switch (this.s) {
      case S.Queue:
        if (U.Walk(T, this.path, Customer.Speed, rig)) U.Face(T, Vec.forward);
        this.Wait(1);
        break;
      case S.Seat:
        if (!this.sitting) {
          if (U.Walk(T, this.path, Customer.Speed, rig)) {
            this.sitting = true;
            T.position.copy(this.seat.pos);
            lookRotation(T, this.seat.fwd);
            rig.act = Rig.Act.Sit;
          }
        } else rig.Tick(0);
        this.Wait(0.35);
        break;
      case S.ToRoom:
        if (U.Walk(T, this.path, Customer.Speed, rig)) {
          const room = this.room;
          this.s = S.Sleeping;
          room.state = Room.State.Occupied;
          room.guest = this;
          room.SetOccupied(true);
          this.sleepT = Random.Range(5, 7);
          rig.Tick(0);
          T.position.copy(room.BedPos);
          setEuler(T, -90, 180, 0);
          this.zzz = U.Text(null, V(room.x + 0.5, 2.2, room.Z(9)), 'Z', 0.1, C(0.75, 0.88, 1), true);
        }
        break;
      case S.Sleeping: {
        const room = this.room;
        // biraz sonra istekte bulunabilir; istek açıkken uyku sayacı durur
        if (!this.asked && this.sleepT < 4.2) {
          this.asked = true;
          if (this.inspector || this.regular != null || this.celebrity || Random.value < (this.vip ? 0.7 : this.type !== Customer.G.Normal ? 0.55 : 0.4)) room.StartRequest(this.RequestList());
        }
        if (room.HasRequest) {
          this.reqWait += Time.deltaTime;
          if (this.reqWait > 14) {
            room.CancelRequest();
            this.reqFailed = true;
            gm.FloatText(V(room.x, 2.6, room.Z(7.6)), 'Kimse gelmedi...', C(1, 0.55, 0.5), 0.07);
          }
        } else this.sleepT -= Time.deltaTime;
        if (this.zzz) {
          this.zzz.text = 'Z'.repeat(1 + Math.floor(Time.time * 2) % 3);
          this.zzz.transform.position.set(room.x + 0.5, 2.1 + Mathf.Repeat(Time.time * 0.5, 0.4), room.Z(9));
        }
        if (this.sleepT <= 0) this.CheckOut();
        break;
      }
      case S.Cafe:
        if (U.Walk(T, this.path, Customer.Speed, rig)) U.Face(T, Vec.right);
        break;
      case S.CafeSeat:
        if (!this.sitting) {
          if (U.Walk(T, this.path, Customer.Speed, rig)) {
            this.sitting = true;
            T.position.copy(this.cafeSeat.pos);
            lookRotation(T, this.cafeSeat.fwd);
            rig.act = Rig.Act.Sit;
          }
        } else {
          rig.Tick(0);
          this.actT -= Time.deltaTime;
          if (this.actT <= 0) { this.StandUp(); this.cafeSeat.who = null; this.cafeSeat = null; this.Leave(); }
        }
        break;
      case S.Swim:
        if (!this.swimming) {
          if (U.Walk(T, this.path, Customer.Speed, rig)) {
            this.swimming = true;
            T.position.copy(this.swimSpot.pos);
            T.rotation.set(0, Random.Range(0, 360) * Mathf.Deg2Rad, 0);
            U.Burst(V(this.swimSpot.pos.x, 0, this.swimSpot.pos.z), C(0.7, 0.9, 1), Col.white, 20, 3);
          }
        } else {
          this.actT -= Time.deltaTime;
          T.position.copy(Vec.add(this.swimSpot.pos, V(0, Math.sin(Time.time * 2) * 0.06, 0)));
          T.rotation.y += 20 * Mathf.Deg2Rad * Time.deltaTime;
          rig.Tick(0);
          if (this.actT <= 0) {
            this.swimming = false;
            T.position.set(this.swimSpot.pos.x, 0, 3.15);
            gm.pool.Leave(this.swimSpot, true);
            this.swimSpot = null;
            this.Leave();
          }
        }
        break;
      case S.Rest:
        if (!this.sitting) {
          if (U.Walk(T, this.path, Customer.Speed, rig)) {
            this.sitting = true;
            T.position.copy(this.restSeat.pos);
            lookRotation(T, this.restSeat.fwd);
            rig.act = Rig.Act.Sit;
            gm.restaurant.Seated(this.restSeat);
          }
        } else rig.Tick(0);
        break;
      case S.Spa:
        if (!this.sitting) {
          if (U.Walk(T, this.path, Customer.Speed, rig)) {
            const st = this.spaSpot;
            this.sitting = true;
            T.position.copy(st.pos);
            if (st.kind === 'bed') { setEuler(T, 90, 0, 0); rig.act = Rig.Act.Lie; } // yüzüstü uzanır
            else { lookRotation(T, st.fwd); rig.act = Rig.Act.Sit; }
            gm.spa.Arrived(st);
          }
        } else rig.Tick(0);
        break;
      case S.Leaving:
        if (U.Walk(T, this.path, Customer.Speed, rig)) { arrRemove(gm.customers, this); this.destroy(); }
        break;
    }
  }

  CheckOut() {
    const gm = GameManager.I, room = this.room, G = Customer.G;
    if (this.zzz) { Destroy(this.zzz.gameObject); this.zzz = null; }
    if (room.HasRequest) room.CancelRequest();
    const sat = this.Satisfaction();
    gm.AddRating(sat);
    Report.Guest(sat);
    Social.OnCheckout(this, sat, room);
    Story.OnGuest(this, sat);
    if (this.regular != null) Regulars.OnLeave(this, sat, room, false);
    if (this.inspector) StarExam.Result(sat);
    room.SetDirty();
    const typeTip = this.type === G.Emekli ? 1.4 : this.type === G.Ogrenci ? 0.6 : this.type === G.Fenomen ? 1.2 : 1;
    const tipMul = typeTip * (0.5 + sat * 0.2) * (this.vip ? 3 : 1) * (this.celebrity ? 2 : 1) * (this.type === G.Balayi ? 1.5 : 1) * Seasons.TipMul * (1 + Regulars.TipPerk) * RoomKinds.TipMul(room.kind, this.type);
    room.tips.Add(Math.max(1, Mathf.RoundToInt(room.Tip * tipMul)));
    this.transform.position.copy(room.Inside);
    lookRotation(this.transform, Vec.back);
    this.pause = 1.4;
    this.pauseAct = Rig.Act.Cheer;
    const face = sat >= 4.5 ? '♥♥' : sat >= 3.5 ? '♥' : sat >= 2.5 ? '☺' : '☹';
    gm.FloatText(Vec.add(this.transform.position, V(0, 2.6, 0)), face, sat >= 2.5 ? C(1, 0.45, 0.6) : C(0.7, 0.7, 0.75), 0.16);
    // Fenomen: memnunsa otel hakkında paylaşım yapar (takipçi kazandırır), değilse kötü yorum
    if (this.type === G.Fenomen) {
      if (sat >= 4) { Social.Add('@gezgin.fenomen', gm.hotelName + ' harika! Odanın her köşesi fotoğraflık. Takipçilerime tavsiye ederim ✨', Random.RangeInt(600, 1400), false, 1); Social.followers += 40; }
      else if (sat < 3) Social.Add('@gezgin.fenomen', gm.hotelName + ' beklediğim gibi değildi, beklemekten yoruldum.', Random.RangeInt(300, 800), true, 1);
    }
    // Çıkışta restoran, kafe ya da havuz
    const restC = 0.28 + (this.type === G.Emekli ? 0.25 : this.type === G.Sporcu ? 0.15 : this.type === G.Aile ? 0.12 : this.type === G.Balayi ? 0.1 : this.type === G.Is ? 0.05 : 0);
    if (gm.restaurant.Open && Random.value < restC && gm.restaurant.Join(this)) return;
    const spaC = 0.22 + (this.type === G.Fenomen ? 0.3 : this.type === G.Balayi ? 0.2 : this.type === G.Emekli ? 0.15 : this.type === G.Is ? 0.1 : 0);
    if (gm.spa.Open && Random.value < spaC && gm.spa.Join(this)) return;
    const cafeC = Seasons.CafeChance + Events.CafeAdd + (this.type === G.Is ? 0.2 : this.type === G.Turist ? 0.1 : 0);
    const poolC = Seasons.PoolChance * Events.PoolMul * (this.type === G.Turist ? 1.4 : this.type === G.Is ? 0.5 : this.type === G.Aile ? 1.2 : this.type === G.Sporcu ? 1.8 : this.type === G.Emekli ? 0.5 : this.type === G.Kopekli ? 0.6 : this.type === G.Ogrenci ? 1.2 : 1);
    if (gm.cafe.Open && Random.value < cafeC && gm.cafe.Join(this)) return;
    if (gm.pool.Open && Random.value < poolC) {
      const sp = gm.pool.Join(this);
      if (sp != null) { this.GoSwim(sp); return; }
    }
    this.Leave();
  }

  Wait(rate) {
    if (!this.passedDoor) return;
    this.waited += Time.deltaTime;
    this.patience -= Time.deltaTime * rate;
    if (this.patience < 12) this.ShowMood(Mathf.Repeat(Time.time, 0.6) < 0.3 ? '!!' : '!', C(1, 0.4, 0.35));
    if (this.patience <= 0) this.LeaveAngry();
  }

  LeaveAngry() {
    const gm = GameManager.I;
    this.StandUp();
    gm.reception.Remove(this);
    gm.AddRating(1);
    Report.Angry();
    if (this.regular != null) Regulars.OnLeave(this, 1, null, true);
    if (this.inspector) StarExam.Result(1);
    if (this.reservation != null) Reservations.OnAngry(this);
    if (this.celebrity) Social.Share('Ünlü sanatçı otelde beklemekten sıkılıp gitti! Hayranları çok kızgın.', 0, true);
    gm.FloatText(Vec.add(this.transform.position, V(0, 2.6, 0)), 'Çok bekledim!', C(1, 0.45, 0.4), 0.07);
    Sfx.Play('bad', 0.6);
    this.HideMood();
    this.pause = 1.2;
    this.pauseAct = Rig.Act.Sad;
    this.Leave();
  }
}

// Misafire eşlik eden ikinci karakter (eş ya da çocuk)
class Follower extends Behaviour {
  static Make(leader, variant, scale) {
    const f = new Follower();
    f.go.name = 'Eslikci';
    f.go.position.copy(Vec.add(leader.transform.position, V(0.8, 0, 0)));
    f.leader = leader;
    f.side = Random.value < 0.5 ? -1 : 1;
    f.rig = Rig.Model(f.go, variant);
    f.rig.go.scale.multiplyScalar(scale);
    return f;
  }

  LateUpdate() {
    const leader = this.leader;
    if (!leader || !alive(leader.go)) { Destroy(this.go); return; }
    const hide = leader.Busy;
    if (this.rig.go.visible === hide) this.rig.go.visible = !hide;
    const lt = leader.transform;
    let fwd = forwardOf(lt);
    if (fwd.x * fwd.x + fwd.z * fwd.z < 0.01) fwd = Vec.forward;
    fwd = Vec.norm(fwd);
    const right = V(fwd.z, 0, -fwd.x);
    const target = Vec.add(Vec.sub(V(lt.position.x, 0, lt.position.z), Vec.mul(fwd, 0.7)), Vec.mul(right, 0.75 * this.side));
    const T = this.transform;
    if (hide) { T.position.copy(target); return; }
    const d = V(target.x - T.position.x, 0, target.z - T.position.z);
    let dist = Vec.len(d);
    if (dist > 12) { T.position.copy(target); dist = 0; }
    const sp = Mathf.Clamp(dist * 3, 0, 5);
    if (dist > 0.05) { T.position.add(Vec.mul(d, Math.min(dist, sp * Time.deltaTime) / dist)); U.Face(T, d); }
    else U.Face(T, fwd);
    this.rig.Tick(dist > 0.15 ? 1 : 0);
  }
}

// Köpekli misafirin köpeği: sahibinin yanında koşturur
class Dog extends Behaviour {
  static Make(owner) {
    const d = new Dog();
    d.go.name = 'Kopek';
    d.owner = owner;
    d.go.position.copy(Vec.add(owner.transform.position, V(-0.7, 0, 0)));
    const fur = [C(0.85, 0.65, 0.4), C(0.95, 0.95, 0.92), C(0.3, 0.25, 0.22), C(0.75, 0.5, 0.3)][Random.RangeInt(0, 4)];
    const b = d.body = U.Pivot(d.go, V(), 'Govde');
    U.Box('Govde', b, V(0, 0.38, 0), V(0.32, 0.3, 0.62), fur);
    U.Box('Bas', b, V(0, 0.6, 0.38), V(0.3, 0.28, 0.3), fur);
    U.Box('Burun', b, V(0, 0.55, 0.56), V(0.14, 0.12, 0.12), Col.lerp(fur, Col.black, 0.4));
    U.Box('BurunUc', b, V(0, 0.58, 0.63), V(0.06, 0.05, 0.03), C(0.1, 0.1, 0.1));
    for (const x of [-0.11, 0.11]) {
      U.Box('Kulak', b, V(x, 0.78, 0.33), V(0.08, 0.12, 0.05), Col.lerp(fur, Col.black, 0.25));
      U.Box('Goz', b, V(x * 0.7, 0.66, 0.53), V(0.04, 0.04, 0.02), C(0.08, 0.08, 0.1));
    }
    d.legs = [];
    for (const [x, z] of [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]]) d.legs.push(U.Box('Bacak', b, V(x, 0.12, z), V(0.08, 0.24, 0.08), fur));
    d.tail = U.Box('Kuyruk', b, V(0, 0.55, -0.36), V(0.06, 0.06, 0.24), fur);
    U.Box('Tasma', b, V(0, 0.5, 0.25), V(0.32, 0.05, 0.08), C(0.9, 0.2, 0.25));
    d.phase = Math.random() * 6;
    return d;
  }
  LateUpdate() {
    const o = this.owner;
    if (!o || !alive(o.go)) { Destroy(this.go); return; }
    const hide = o.Busy;
    this.go.visible = !hide;
    const lt = o.transform;
    let fwd = forwardOf(lt); fwd = Vec.norm(fwd);
    const right = V(fwd.z, 0, -fwd.x);
    const target = Vec.add(Vec.sub(V(lt.position.x, 0, lt.position.z), Vec.mul(fwd, 0.3)), Vec.mul(right, -0.75));
    const T = this.transform;
    if (hide) { T.position.copy(target); return; }
    const d = V(target.x - T.position.x, 0, target.z - T.position.z);
    let dist = Vec.len(d);
    if (dist > 12) { T.position.copy(target); dist = 0; }
    const moving = dist > 0.08;
    if (moving) { T.position.add(Vec.mul(d, Math.min(dist, Mathf.Clamp(dist * 4, 0, 6) * Time.deltaTime) / dist)); U.Face(T, d); }
    else U.Face(T, fwd);
    this.phase += Time.deltaTime * (moving ? 16 : 4);
    const sw = moving ? Math.sin(this.phase) * 0.5 : 0;
    this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
    this.tail.rotation.y = Math.sin(this.phase * (moving ? 0.6 : 2)) * 0.6;
    this.body.position.y = moving ? Math.abs(Math.sin(this.phase)) * 0.04 : 0;
  }
}
