// Temizlikçi: kirli odaları temizler, misafir isteklerine koşar.
// Temizlik için çarşaf gerekir; elinde yoksa önce çamaşırhaneye uğrar. Yorulunca molaya çıkar.
class Cleaner extends Behaviour {
  static S = { Idle: 0, Fetch: 1, Going: 2, Cleaning: 3, Returning: 4, Rest: 5 };
  constructor() {
    super(); this.go.name = 'Temizlikci';
    this.s = Cleaner.S.Idle; this.target = null; this.path = []; this.forRequest = false;
    this.staffName = ''; this.stats = new StaffStats(); this.linen = 0; this.carryItems = []; this.shownLinen = -1;
  }
  get Speed() { return 3 * Eco.StaffMul * this.stats.Speed; }
  get OnFloor2() { return this.transform.position.z > 20; }

  Init(h, idx, name) {
    this.home = h.clone(); this.staffName = name; this.stats.who = name;
    this.transform.position.copy(h);
    lookRotation(this.transform, Vec.left);
    this.rig = Rig.Model(this.go, idx % 2 === 0 ? 'character-male-e' : 'character-female-e');
    const kova = U.Box('Kova', this.go, V(0.5, 0.2, 0.15), V(0.32, 0.2, 0.32), C(0.3, 0.5, 0.95), 'Cylinder');
    U.Box('Su', kova, V(0, 1.02, 0), V(0.85, 0.05, 0.85), C(0.6, 0.85, 1), 'Cylinder');
    this.carry = U.Pivot(this.go, V(0, 1.05, 0.45), 'Tasinan');
    this.nameTag = U.Text(null, V(), name, 0.06, Col.white, true);
    GameManager.I.Pop(this.rig.go);
  }

  Rename(n) { this.staffName = n; this.stats.who = n; if (this.nameTag) this.nameTag.text = n; }
  destroy() { if (this.nameTag) Destroy(this.nameTag.gameObject); Destroy(this.go); }

  LateUpdate() {
    if (this.nameTag) {
      this.nameTag.transform.position.copy(Vec.add(this.transform.position, V(0, 2.75, 0)));
      const want = this.staffName + (this.stats.resting ? ' (mola)' : '');
      if (this.nameTag.text !== want) this.nameTag.text = want;
    }
    if (this.linen !== this.shownLinen) {
      this.shownLinen = this.linen;
      while (this.carryItems.length < this.linen)
        this.carryItems.push(U.Box('Carsaf', this.carry, V(0, this.carryItems.length * 0.11, 0), V(0.5, 0.1, 0.38), Col.white));
      for (let i = 0; i < this.carryItems.length; i++) SetActive(this.carryItems[i], i < this.linen);
    }
  }

  GoHome() {
    this.path.length = 0;
    if (this.OnFloor2) { this.path.push(Elevator.UpPad); this.path.push(Elevator.LobbyPad); }
    this.path.push(this.home.clone());
  }

  // Çamaşırhaneye git (lobide)
  GoLaundry() {
    this.path.length = 0;
    let x = this.transform.position.x;
    if (this.OnFloor2) { this.path.push(Elevator.UpPad); this.path.push(Elevator.LobbyPad); x = Elevator.LobbyPad.x; }
    else if (this.transform.position.z > 4) this.path.push(V(x, 0, 2.5));
    if (x > 15) { this.path.push(V(14, 0, 1.5)); x = 14; }
    this.path.push(V(x, 0, -0.8));
    this.path.push(Laundry.Lane);
    this.path.push(Vec.add(Laundry.Pad, V(0.3, 0, 0)));
    this.s = Cleaner.S.Fetch;
  }

  GoTarget(fromLaundry) {
    this.path.length = 0;
    const t = this.target;
    if (fromLaundry) this.path.push(Laundry.Lane);
    if (t.oz > 0 && !this.OnFloor2) { this.path.push(Elevator.LobbyPad); this.path.push(Elevator.UpPad); }
    if (t.oz <= 0 && t.x > 15 && this.transform.position.x < 14) this.path.push(V(14, 0, 1.5));
    this.path.push(t.Door);
    this.path.push(t.CleanSpot);
    this.s = Cleaner.S.Going;
  }

  Update() {
    const S = Cleaner.S, gm = GameManager.I, rig = this.rig, T = this.transform;
    const moving = this.s === S.Fetch || this.s === S.Going || this.s === S.Returning;
    this.stats.Tick(Time.deltaTime, moving || this.s === S.Cleaning);
    switch (this.s) {
      case S.Idle:
        rig.act = Rig.Act.None;
        U.Walk(T, this.path, this.Speed, rig);
        if (this.stats.resting) { this.GoHome(); this.s = S.Rest; break; }
        this.target = gm.FindDirtyRoom();
        this.forRequest = false;
        if (this.target == null) {
          this.target = gm.FindRequestRoom();
          this.forRequest = this.target != null;
          if (this.forRequest) this.target.reqClaimed = true;
        }
        if (this.target != null) {
          if (!this.forRequest) this.target.claimed = true;
          if (!this.forRequest && this.linen === 0 && !this.target.hasLinen) this.GoLaundry();
          else this.GoTarget(false);
        }
        break;
      case S.Fetch:
        if (U.Walk(T, this.path, this.Speed, rig)) {
          U.Face(T, Vec.left);
          const got = Laundry.I.Take(Laundry.StaffCap - this.linen);
          this.linen += got;
          if (this.linen > 0) {
            Sfx.Play('tick', 0.3);
            if (this.target != null && (this.target.state === Room.State.Dirty || this.target.HasRequest)) this.GoTarget(true);
            else { this.s = S.Returning; this.GoHome(); }
          }
          // raf boşsa bekler (yıkama bitince alır)
        }
        break;
      case S.Going:
        if (U.Walk(T, this.path, this.Speed, rig)) this.s = S.Cleaning;
        break;
      case S.Cleaning: {
        const t = this.target;
        U.Face(T, Vec.forward);
        rig.act = Rig.Act.Clean;
        rig.Tick(0);
        if (this.forRequest && t.HasRequest) t.ReqTick(Time.deltaTime / 1.5 * Eco.StaffMul * this.stats.Speed);
        else if (!this.forRequest && t.state === Room.State.Dirty) {
          if (!t.hasLinen) {
            if (this.linen > 0) { this.linen--; t.hasLinen = true; }
            else { rig.act = Rig.Act.None; this.GoLaundry(); break; }
          }
          t.CleanTick(Time.deltaTime / 2.5 * Eco.CleanMul * Eco.StaffMul * this.stats.Speed);
        } else {
          rig.act = Rig.Act.None;
          this.stats.AddXp(1);
          this.s = S.Returning;
          this.path.length = 0;
          this.path.push(t.Door);
          if (t.oz > 0) { this.path.push(Elevator.UpPad); this.path.push(Elevator.LobbyPad); }
          if (t.x > 15 && t.oz <= 0) this.path.push(V(14, 0, 1.5));
          this.path.push(this.home.clone());
        }
        break;
      }
      case S.Returning:
        if (U.Walk(T, this.path, this.Speed, rig)) this.s = S.Idle;
        else if (!this.stats.resting && T.position.z < 3 && T.position.z > -1 && this.path.length === 1 &&
          (gm.FindDirtyRoom() != null || gm.FindRequestRoom() != null)) { this.s = S.Idle; this.path.length = 0; }
        break;
      case S.Rest:
        if (U.Walk(T, this.path, this.Speed, rig)) {
          U.Face(T, Vec.back);
          rig.act = Rig.Act.None;
          if (!this.stats.resting) this.s = S.Idle;
        }
        break;
    }
  }
}
