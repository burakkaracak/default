// Misafir: kasabadan gelir, resepsiyonda sıraya girer, odaya çıkar, konaklar, isteklerde bulunur, çıkışta öder ve gider.
class Guest extends Behaviour {
  static S = { Arrive: 0, Queue: 1, ToRoom: 2, Stay: 3, Checkout: 4, Leave: 5, Visit: 6 };
  constructor(type) {
    super(); this.go.name = 'Misafir';
    this.type = type; this.id = ++Guest.seq;
    const fem = Random.Chance(0.5);
    const look = type.look ? Random.Pick(type.look) : Random.Pick(Rig.Guests.filter(l => fem === l.includes('female')));
    this.name = Random.Pick(look.includes('female') ? Data.Names.f : Data.Names.m);
    this.rig = Rig.Model(this.go, look, 1.7);
    this.floor = 0; this.s = Guest.S.Arrive; this.room = null; this.path = []; this.liftT = 0; this.t = 0;
    this.nights = Random.RangeInt(type.nights[0], type.nights[1] + 1);
    this.patience = 40 * type.patience; this.waited = 0; this.sat = 3; this.tips = 0; this.served = false;
    this.wantLevel = Random.Chance(0.3) ? 1 : 0;
    const side = Random.Chance(0.5) ? Hotel.SpawnW : Hotel.SpawnE;
    this.go.position.copy(side);
    this.tag = U.Text(this.go, V(0, 2.2, 0), type.icon + ' ' + this.name, 0.055, C(1, 1, 1), true);
    this.mood = U.Text(this.go, V(0, 2.7, 0), '', 0.1, Col.white, true); this.mood.obj.visible = false;
    if (type.follower) this.follower = new Follower(this, type.follower, fem);
    this.path = [Vec.add(Hotel.Street, V(side.x < 0 ? -2 : 2, 0, 0)), Hotel.Entrance.clone(), V(0, 0, 6.0)];
    this.slot = -1;
  }
  static seq = 0;
  get S() { return Guest.S; }
  get pos() { return this.go.position; }
  get Waiting() { return this.s === Guest.S.Queue; }

  ShowMood(t, c, sec = 2) { this.mood.text = t; this.mood.color = c; this.mood.obj.visible = true; this.moodT = sec; }

  Update() {
    const dt = Time.deltaTime; if (dt <= 0) return;
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood.obj.visible = false; }
    if (this.liftT > 0) { this.liftT -= dt; this.rig.Tick(0); if (this.liftT <= 0) { this.floor = this.liftTo; this.pos.y = Hotel.FloorY(this.floor); } return; }
    const S = Guest.S;
    if (this.path.length) {
      const n = this.path[0];
      if (n.lift !== undefined) { this.path.shift(); this.liftTo = n.lift; this.liftT = 0.9; this.pos.set(n.x, this.pos.y, n.z); return; }
      const done = U.Walk(this.go, this.path, 3.2, this.rig);
      if (!done) return;
    }
    switch (this.s) {
      case S.Arrive: this.s = S.Queue; Game.Queue(this); break;
      case S.Queue:
        this.rig.Tick(0); this.waited += dt;
        if (this.slot === 0 && this.waited > 6 && Math.floor(this.waited) % 8 === 0 && this.moodT <= 0) this.ShowMood('⏳', C(1, 0.9, 0.5));
        if (this.waited > this.patience) { this.ShowMood('😠', C(1, 0.6, 0.6)); Game.Dequeue(this); Game.LostGuest(this); this.Depart(); }
        break;
      case S.ToRoom: this.EnterRoom(); break;
      case S.Stay: this.StayTick(dt); break;
      case S.Checkout: this.Pay(); break;
      case S.Visit: Facilities.GuestTick(this, dt); break;
      case S.Leave: this.destroy(); if (this.follower) this.follower.destroy(); Game.OnGuestGone(this); break;
    }
  }

  // Resepsiyon: odaya gönder
  Assign(room) {
    this.room = room; room.guest = this; room.state = 'occupied';
    Game.Dequeue(this);
    this.s = Guest.S.ToRoom;
    this.path = Hotel.Path(this.pos, 0, room.inside, room.floor);
    this.sat += this.waited < 12 ? 0.5 : this.waited > 30 ? -0.6 : 0;
    if (room.level > this.wantLevel) this.sat += 0.6;
    this.sat += Decor.SatBonus(room);
    this.ShowMood('🔑', C(1, 0.9, 0.5), 1.5);
  }
  EnterRoom() {
    this.s = Guest.S.Stay; this.t = 0;
    this.stayLen = this.nights * Game.NightLen;
    this.nextReq = Random.Range(6, 14); this.reqCount = 0;
    this.rig.act = Rig.Act.Lie;
    this.go.position.copy(this.room.bed); this.go.position.y += 0.55; setEuler(this.go, 0, this.room.bedYaw || 0, 0);
    this.lying = true;
    if (this.follower) this.follower.Sit(this.room);
    Game.OnCheckIn(this);
  }
  StayTick(dt) {
    this.t += dt; this.rig.Tick(0);
    const r = this.room;
    if (!r.request && this.t > this.nextReq && this.reqCount < 2 + this.nights) {
      r.request = { def: Random.Pick(Data.Requests), t: 0, guest: this }; this.reqCount++;
      this.nextReq = this.t + Random.Range(14, 28);
      Game.OnRequest(r);
    }
    if (r.request) { r.request.t += dt; if (r.request.t > 40) { r.request = null; this.sat -= 0.7; this.ShowMood('☹', C(0.8, 0.8, 0.85)); } }
    if (this.t >= this.stayLen && !r.request) {
      // çıkış: odadan bankoya
      this.s = Guest.S.Checkout; this.rig.act = Rig.Act.None; this.lying = false;
      this.go.position.copy(r.inside);
      r.guest = null; r.state = 'dirty'; r.dirt = 1; if (r.mess) r.mess.visible = true;
      if (this.follower) this.follower.Follow();
      this.path = Hotel.Path(this.pos, r.floor, V(0.9, 0, -2.0), 0);
      Game.OnCheckoutStart(this);
    }
  }
  Pay() {
    const r = this.room;
    const base = Decor.RoomPrice(r) * this.type.pay * this.nights;
    const sat = Mathf.Clamp(this.sat, 1, 5);
    const tip = Math.round(base * Data.Tip * Mathf.Clamp01((sat - 2) / 3)) + this.tips;
    Game.Earn(Math.round(base), Vec.add(this.pos, V(0, 1.6, 0)), tip);
    Game.OnGuestPaid(this, sat);
    const face = sat >= 4.5 ? '😍' : sat >= 3.5 ? '😊' : sat >= 2.5 ? '🙂' : '😕';
    this.ShowMood(face, Col.white, 3);
    this.rig.act = sat >= 3.5 ? Rig.Act.Cheer : Rig.Act.None; this.rig.Tick(0);
    Tween.After(0.8, () => { this.rig.act = Rig.Act.None; });
    if (Facilities.Offer(this)) return; // tesise uğrar (durumu Facilities yönetir)
    this.Depart(true);
  }
  // Çıkış: lobiden sokağa (fromLobby: içeriden başlıyorsa)
  Depart(fromLobby) {
    this.s = Guest.S.Leave;
    this.path = fromLobby ? [V(0, 0, 6.0), Hotel.Entrance.clone(), Hotel.Street.clone(), Random.Chance(0.5) ? Hotel.SpawnW.clone() : Hotel.SpawnE.clone()] : [Hotel.Entrance.clone(), Hotel.Street.clone(), Random.Chance(0.5) ? Hotel.SpawnW.clone() : Hotel.SpawnE.clone()];
  }
  GoToSlot(i) { this.slot = i; this.path = [Hotel.QueueSlot(i)]; }
}

// Eşlik eden (çocuk ya da eş): misafiri takip eder
class Follower extends Behaviour {
  constructor(leader, scale, fem) {
    super(); this.go.name = 'Eslik';
    const look = Random.Pick(Rig.Guests.filter(l => scale < 1 ? true : l.includes('female') !== fem));
    this.rig = Rig.Model(this.go, look, 1.7 * scale);
    this.leader = leader; this.go.position.copy(leader.pos).add(V(0.8, 0, 0.4)); this.sitting = false;
  }
  Sit(room) { this.sitting = true; const s = room.seat || V(room.x + 1.2, Hotel.FloorY(room.floor), room.side * 2.4); this.go.position.copy(s); setEuler(this.go, 0, room.seatYaw || 0, 0); this.rig.act = Rig.Act.Sit; this.rig.Tick(0); }
  Follow() { this.sitting = false; this.rig.act = Rig.Act.None; this.go.position.copy(this.leader.pos); }
  Update() {
    if (this.sitting || !alive(this.leader)) return;
    const L = this.leader.pos, p = this.go.position;
    if (this.leader.liftT > 0) { p.copy(L); p.y = Hotel.FloorY(this.leader.liftTo); this.rig.Tick(0); return; }
    const d = V(L.x - p.x, 0, L.z - p.z), m = Vec.len(d);
    p.y = L.y;
    if (m > 1.3) { const st = Math.min(m - 1.1, 3.4 * Time.deltaTime); p.add(Vec.mul(d, st / m)); U.Face(this.go, d); this.rig.Tick(1); }
    else this.rig.Tick(0);
  }
}
