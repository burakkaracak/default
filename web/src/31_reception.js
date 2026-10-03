// Resepsiyon: ayakta sıra + bekleme salonu; sıradakini boş odaya yerleştirir
class Reception extends Behaviour {
  static Seat = class { constructor(o) { this.pos = o.pos; this.fwd = o.fwd; this.who = null; } };
  static StandSlots = 3;
  static forceAsk = false; // test için
  static nextAsk = 45;
  static askDay = -1;
  static asksToday = 0;

  constructor() {
    super(); this.go.name = 'Resepsiyon';
    this.queue = []; this.waiting = []; this.seats = [];
    this.servicePos = V(-6, 0, -3.6);
    this.stats = new StaffStats();
    this.staffName = ''; this.staff = null; this.t = 0; this.asking = false;
  }
  get HasStaff() { return this.staff != null; }
  get StaffWorking() { return this.HasStaff && !this.stats.resting; }
  get Capacity() { return Reception.StandSlots + this.seats.length; }
  get Count() { return this.queue.length + this.waiting.length; }

  Init(world) {
    world.add(this.go);
    this.pad = new ProgressPad(this.go, this.servicePos, 0.75, C(0.95, 0.7, 0.28), C(0.3, 0.95, 0.5));
    this.bubble = U.Text(null, V(), '', 0.1, Col.white, true);
    SetActive(this.bubble.gameObject, false);
  }

  Slot(i) { return V(-6, 0, -6.6 - i * 1.3); }

  Enqueue(c) {
    // Rezervasyonlu misafir sıranın önüne geçer (o an işlem göreni bekletmez)
    if (c.reservation != null) { this.queue.splice(Math.min(1, this.queue.length), 0, c); this.Reflow(); return; }
    if (this.queue.length < Reception.StandSlots && this.waiting.length === 0) {
      this.queue.push(c); c.GoToSlot(this.Slot(this.queue.length - 1)); return;
    }
    const seat = this.FreeSeat();
    if (seat != null) { seat.who = c; this.waiting.push(c); c.GoToSeat(seat); }
  }

  FreeSeat() { for (const s of this.seats) if (s.who == null) return s; return null; }

  Remove(c) {
    for (const s of this.seats) if (s.who === c) s.who = null;
    arrRemove(this.waiting, c);
    if (arrRemove(this.queue, c)) this.Reflow();
  }

  Reflow() {
    // Bekleme salonundan sıraya geçiş
    while (this.queue.length < Reception.StandSlots && this.waiting.length > 0) {
      const c = this.waiting.shift();
      for (const s of this.seats) if (s.who === c) s.who = null;
      this.queue.push(c);
    }
    for (let i = 0; i < this.queue.length; i++) this.queue[i].GoToSlot(this.Slot(i));
  }

  HireReceptionist(name, announce) {
    this.staffName = name; this.stats.who = name;
    const g = U.Pivot(this.go, V(), 'Resepsiyonist');
    setWorldPos(g, V(-7.3, 0, -3.9));
    lookRotation(g, Vec.back);
    this.staffGo = g;
    this.staff = Rig.Model(g, 'character-female-d');
    this.nameTag = U.Text(g, V(0, 2.75, 0), name, 0.06, Col.white, true);
    if (announce) { GameManager.I.Notify(name + ' resepsiyonda işe başladı!'); GameManager.I.Pop(this.staff.go); }
  }

  Rename(name) { this.staffName = name; this.stats.who = name; if (this.nameTag) this.nameTag.text = name; }

  Update() {
    const gm = GameManager.I;
    const front = this.queue.length > 0 ? this.queue[0] : null;
    const playerHere = gm.PlayerNear(this.servicePos, 0.85);
    const staffed = playerHere || this.StaffWorking;
    const ready = front != null && front.Arrived;
    let pick = -1, free = null;
    if (ready) {
      free = gm.FreeRoomFor(front);
      if (free != null) pick = 0;
      else if (front.MinLevel > 1 && this.queue.length > 1 && this.queue[1].Arrived && this.queue[1].MinLevel < front.MinLevel) {
        // Lüks oda bekleyen misafir varken arkadaki misafir alınabilir
        free = gm.FreeRoomFor(this.queue[1]);
        if (free != null) pick = 1;
      }
    }
    const b = this.bubble;
    if (ready && pick < 0) {
      const anyFree = gm.FreeRoom(false) != null;
      SetActive(b.gameObject, true);
      b.text = front.MinLevel > 1 && anyFree ? (front.MinLevel >= 3 ? 'Kral Dairesi yok!' : 'Lüks oda yok!') : 'Oda yok!';
      b.color = C(1, 0.5, 0.45);
      b.transform.position.copy(Vec.add(front.transform.position, V(0, 3.2, 0)));
    } else if (ready && !staffed) {
      SetActive(b.gameObject, true);
      b.text = '?';
      b.color = C(1, 0.85, 0.3);
      b.transform.position.copy(Vec.add(front.transform.position, V(0, 3.0 + Math.sin(Time.time * 5) * 0.08, 0)));
    } else SetActive(b.gameObject, false);

    if (this.asking) { this.pad.Set(1); return; }
    const working = pick >= 0 && staffed;
    const rate = playerHere ? 1.4 : 0.6 * Eco.StaffMul * this.stats.Speed;
    if (this.HasStaff) this.stats.Tick(Time.deltaTime, working && !playerHere);
    if (working) this.t += Time.deltaTime * rate * Eco.ServiceMul;
    else this.t = Math.max(0, this.t - Time.deltaTime);
    this.pad.Set(this.t);
    if (this.staff) {
      this.staff.act = working && !playerHere ? Rig.Act.Clean : Rig.Act.None;
      this.staff.Tick(0);
      const want = this.staffName + (this.stats.resting ? ' (mola)' : '');
      if (this.nameTag && this.nameTag.text !== want) this.nameTag.text = want;
    }
    if (this.t >= 1) {
      const guest = this.queue[pick];
      const better = this.UpgradeOption(guest, free);
      if (better != null) { this.AskUpgrade(guest, free, better, playerHere); return; }
      this.t = 0;
      this.CheckIn(guest, free, Mathf.RoundToInt(free.Price * guest.PayMul), playerHere);
    }
  }

  CheckIn(guest, room, pay, byPlayer) {
    const gm = GameManager.I;
    arrRemove(this.queue, guest);
    room.state = Room.State.Reserved;
    guest.GoToRoom(room);
    gm.deskPile.Add(pay);
    if (!byPlayer && this.HasStaff) this.stats.AddXp(1);
    if (guest.regular != null) Regulars.OnCheckIn(guest, room);
    Reservations.OnCheckIn(guest);
    gm.served++;
    Quests.Track('served');
    Sfx.Play('ding', 0.7);
    this.Reflow();
  }

  // ---------------- Oda yükseltme istekleri ----------------
  // Dengeli sıklık: misafirlerin bir kısmı sorar, ama arada en az 75 sn ve günde en fazla 3 kez.
  UpgradeOption(g, given) {
    const gm = GameManager.I, G = Customer.G;
    if (g.askedUpgrade || g.inspector || g.regular != null || g.celebrity || given.IsSuite || given.level >= 3) return null;
    g.askedUpgrade = true;
    if (gm.dayNight.day !== Reception.askDay) { Reception.askDay = gm.dayNight.day; Reception.asksToday = 0; }
    if (!Reception.forceAsk) {
      if (Time.time < Reception.nextAsk || Reception.asksToday >= 3 || gm.dayNight.day < 2) return null;
      const chance = g.vip ? 0.25 : g.type === G.Balayi ? 0.22 : g.type === G.Is ? 0.18 : g.type === G.Aile ? 0.16 : g.type === G.Turist ? 0.08 : 0.12;
      if (Random.value > chance) return null;
    }
    let best = null;
    for (const r of gm.rooms) {
      if (r === given || r.state !== Room.State.Clean || r.IsSuitePart || r.IsSuite || r.level <= given.level) continue;
      if (r.kind === RoomKinds.Ekonomik) continue;
      if (best == null || r.level > best.level || (r.level === best.level && RoomKinds.Match(r.kind, g.type))) best = r;
    }
    return best;
  }

  AskUpgrade(g, given, better, byPlayer) {
    const G = Customer.G;
    this.asking = true;
    Reception.forceAsk = false;
    Reception.asksToday++;
    Reception.nextAsk = Time.time + 75;
    const who = g.vip ? 'VIP misafir' : g.type === G.Balayi ? 'Balayı çifti' : g.type === G.Is ? 'İş insanı' : g.type === G.Aile ? 'Aile' : g.type === G.Turist ? 'Turist' : 'Misafir';
    const line = g.vip ? 'Bana daha uygun bir oda ayarlayın lütfen.' :
      g.type === G.Balayi ? 'Balayımızdayız, daha romantik bir oda olabilir mi?' :
      g.type === G.Is ? 'Yarın önemli bir toplantım var, daha geniş bir oda alabilir miyim?' :
      g.type === G.Aile ? 'Çocuklarla biraz dar olacak, daha büyük bir odanız var mı?' :
      g.type === G.Turist ? 'Manzarası daha güzel bir oda var mı acaba?' : 'Acaba daha iyi bir odaya geçebilir miyim?';
    const basePay = Mathf.RoundToInt(given.Price * g.PayMul);
    const fullPay = Mathf.RoundToInt(better.Price * g.PayMul);
    const diff = Math.max(0, fullPay - basePay);
    Popups.Show('Oda yükseltme isteği', who + ' soruyor:\n"' + line + '"\n\n' +
      'Verilen oda: ' + Reception.Label(given) + ' (' + Eco.TL(basePay) + ')\n' +
      'İstediği oda: ' + Reception.Label(better) + ' (' + Eco.TL(fullPay) + ')', 'RESEPSİYON')
      .Add('Farkı ödesin, yükselt  +' + Eco.TL(diff), () => this.Resolve(g, given, better, fullPay, 0.3, byPlayer, false), Popups.Green)
      .Add('Ücretsiz yükselt (jest)', () => this.Resolve(g, given, better, basePay, 0.9, byPlayer, true), Popups.Blue)
      .Add('Kibarca reddet', () => this.Resolve(g, given, null, basePay, g.vip ? -0.5 : -0.3, byPlayer, false), Popups.Grey);
  }

  static Label(r) { return 'Oda ' + r.Number + ' · ' + Eco.LevelNames[r.level] + (r.kind > 0 ? ' ' + RoomKinds.Short[r.kind] : ''); }

  Resolve(g, given, better, pay, sat, byPlayer, gift) {
    this.asking = false;
    this.t = 0;
    if (!alive(g.go) || !this.queue.includes(g)) return;
    const room = better != null && better.state === Room.State.Clean ? better : given;
    if (room.state !== Room.State.Clean) return; // oda bu arada doldu: sıradaki karede yeniden denenir
    g.satAdj += sat;
    this.CheckIn(g, room, pay, byPlayer);
    const gm = GameManager.I;
    if (better != null) {
      gm.FloatText(Vec.add(g.transform.position, V(0, 2.8, 0)), gift ? 'Çok teşekkürler!' : 'Harika!', C(0.6, 1, 0.7), 0.08);
      Story.Track('upgrade');
      if (gift && Random.value < 0.5) Social.Share(gm.hotelName + ' beni ücretsiz olarak daha iyi bir odaya geçirdi. Ne kadar nazik insanlar!', 1, false);
    } else gm.FloatText(Vec.add(g.transform.position, V(0, 2.8, 0)), 'Peki...', C(1, 0.75, 0.6), 0.08);
  }
}

// Çamaşırhane: kirli çarşaflar yıkanır, temizler rafa dizilir.
// Oda temizlemek için elinde temiz çarşaf olmalı. Raftan almak için önündeki daireye bas.
class Laundry extends Behaviour {
  static I = null;
  static get Pad() { return V(-13.25, 0, -4.2); }
  static get Lane() { return V(-12.4, 0, -0.8); }
  static get Cap() { return 4 + 3 * Eco.Lv(Eco.Up.Carry); }
  static get StaffCap() { return 3 + Eco.Lv(Eco.Up.Carry); }

  constructor() {
    super(); this.go.name = 'Camasirhane';
    this.clean = 14; this.dirty = 0; this.inMachine = 0; this.washesToday = 0;
    this.washT = 0; this.giveT = 0; this.hintCd = 0; this.stacks = []; this.drums = [];
  }
  get CycleTime() { return 9 / (1 + 0.6 * Eco.Lv(Eco.Up.Laundry)); }
  get Batch() { return 4 + 2 * Eco.Lv(Eco.Up.Laundry); }

  Build(world) {
    Laundry.I = this;
    world.add(this.go);
    const t = this.go, wood = C(0.58, 0.42, 0.3), white = C(0.95, 0.96, 0.98);
    // İki çamaşır makinesi (ön yüzleri doğuya bakar)
    for (const z of [-1.75, -2.8]) {
      U.Box('Makine', t, V(-14.45, 0.55, z), V(0.9, 1.1, 0.95), white);
      U.Box('MakineUst', t, V(-14.45, 1.11, z), V(0.92, 0.04, 0.97), C(0.8, 0.82, 0.86));
      U.Box('Panel', t, V(-14.0, 0.98, z), V(0.03, 0.14, 0.7), C(0.25, 0.3, 0.4));
      const door = U.Box('Kapak', t, V(-13.99, 0.5, z), V(0.62, 0.04, 0.62), C(0.75, 0.78, 0.82), 'Cylinder');
      setEuler(door, 0, 0, 90);
      const drum = U.Box('Tambur', t, V(-13.965, 0.5, z), V(0.48, 0.03, 0.48), C(0.35, 0.55, 0.85), 'Cylinder');
      setEuler(drum, 0, 0, 90);
      U.Box('Kopuk', drum, V(0.25, 0.6, 0), V(0.25, 0.4, 0.25), Col.white, 'Sphere');
      this.drums.push(drum);
    }
    GameManager.I.AddObstacle(-15, -3.3, -13.95, -1.25);
    // Temiz çarşaf rafı
    U.Box('RafYan', t, V(-14.45, 0.8, -3.62), V(0.8, 1.6, 0.06), wood);
    U.Box('RafYan', t, V(-14.45, 0.8, -4.78), V(0.8, 1.6, 0.06), wood);
    U.Box('RafArka', t, V(-14.82, 0.8, -4.2), V(0.06, 1.6, 1.2), wood);
    for (let k = 0; k < 3; k++) U.Box('RafKat', t, V(-14.45, 0.1 + k * 0.55, -4.2), V(0.8, 0.05, 1.2), wood);
    for (let k = 0; k < 12; k++) {
      const shelf = Math.floor(k / 4), col = k % 4;
      this.stacks.push(U.Box('Carsaf', t, V(-14.4, 0.2 + shelf * 0.55 + Math.floor(col / 2) * 0.13, -4.45 + (col % 2) * 0.5), V(0.55, 0.12, 0.42), k % 3 === 0 ? C(0.75, 0.88, 1) : Col.white));
    }
    GameManager.I.AddObstacle(-15, -4.85, -13.95, -3.55);
    // Tabela
    U.Box('TabelaDirek', t, V(-14.9, 1.15, -3.0), V(0.08, 2.3, 0.08), wood);
    U.Box('Tabela', t, V(-14.9, 2.25, -3.0), V(0.1, 0.42, 2.6), C(0.16, 0.22, 0.38));
    U.Text(t, V(-14.7, 2.3, -3.0), 'ÇAMAŞIRHANE', 0.05, C(1, 0.86, 0.42));
    this.pad = new ProgressPad(t, Vec.add(Laundry.Pad, V(0, 0.02, 0)), 0.6, C(0.45, 0.7, 1), C(0.3, 0.95, 0.5));
    this.shelfText = U.Text(t, V(-13.6, 1.95, -4.2), '', 0.05, Col.white, true);
    this.machineText = U.Text(t, V(-13.6, 1.55, -2.3), '', 0.04, C(0.7, 0.9, 1), true);
  }

  AddDirty(n) { this.dirty += n; }
  AddClean(n) { this.clean += n; }
  // Çalışan raftan alır
  Take(want) { const got = Math.min(want, this.clean); this.clean -= got; return got; }

  Update() {
    const gm = GameManager.I, dt = Time.deltaTime;
    // Yıkama
    if (this.inMachine === 0 && this.dirty > 0) {
      this.inMachine = Math.min(this.Batch, this.dirty);
      this.dirty -= this.inMachine; this.washT = 0; this.washesToday++;
    }
    if (this.inMachine > 0) {
      this.washT += dt;
      for (const d of this.drums) d.rotateY(400 * dt * Mathf.Deg2Rad);
      if (this.washT >= this.CycleTime) {
        this.clean += this.inMachine;
        gm.FloatText(V(-13.9, 1.8, -2.3), '+' + this.inMachine + ' temiz çarşaf', C(0.6, 0.9, 1), 0.06);
        this.inMachine = 0;
      }
    }
    // Oyuncu rafın önünde: çarşaf alır
    let anyOn = false;
    for (const p of gm.players) {
      if (!p || U.FlatDist(p.transform.position, Laundry.Pad) > 0.8) continue;
      anyOn = true;
      if (p.linen >= Laundry.Cap) continue;
      if (this.clean <= 0) {
        if (this.hintCd <= 0) { this.hintCd = 2.5; gm.FloatText(Vec.add(Laundry.Pad, V(0, 2.4, 0)), 'Raf boş, makine yıkıyor...', C(1, 0.7, 0.5), 0.06); }
        continue;
      }
      this.giveT += dt;
      if (this.giveT >= 0.12) { this.giveT = 0; this.clean--; p.linen++; Sfx.Play('tick', 0.35); }
    }
    if (this.hintCd > 0) this.hintCd -= dt;
    this.pad.Set(anyOn ? 1 : 0);
    const show = Math.min(this.clean, this.stacks.length);
    for (let i = 0; i < this.stacks.length; i++) if (this.stacks[i].visible !== (i < show)) this.stacks[i].visible = i < show;
    this.shelfText.text = 'Temiz çarşaf: ' + this.clean;
    this.shelfText.color = this.clean > 3 ? Col.white : C(1, 0.6, 0.5);
    this.machineText.text = this.inMachine > 0 ? 'Yıkanıyor: ' + this.inMachine + (this.dirty > 0 ? '  ·  Sırada: ' + this.dirty : '') : this.dirty > 0 ? 'Sırada: ' + this.dirty : '';
  }

  Save(K, carried) { Store.SetInt(K + 'lin_clean', this.clean + this.inMachine + carried); Store.SetInt(K + 'lin_dirty', this.dirty); }
  Load(K, unlockedRooms) { this.clean = Store.GetInt(K + 'lin_clean', 10 + 2 * unlockedRooms); this.dirty = Store.GetInt(K + 'lin_dirty', 0); this.inMachine = 0; }
}
