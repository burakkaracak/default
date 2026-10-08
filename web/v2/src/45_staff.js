// Personel: resepsiyonist (bankoda bekler, sırayı alır), temizlikçi (kirli odaları temizler), kat görevlisi (istekleri taşır)
class Staff extends Behaviour {
  constructor(role, name) {
    super(); this.go.name = 'Personel';
    this.role = role; this.name = name || Random.Pick(Random.Chance(0.5) ? Data.Names.f : Data.Names.m);
    const look = role === 'receptionist' ? 'character-female-d' : role === 'cleaner' ? Random.Pick(['character-female-b', 'character-male-b']) : 'character-male-e';
    this.rig = Rig.Model(this.go, look, 1.72);
    this.floor = 0; this.path = []; this.liftT = 0; this.task = null; this.work = 0; this.idleT = 0;
    this.go.position.set(10, 0, 4);
    const def = Data.Staff[role];
    this.tag = U.Text(this.go, V(0, 2.2, 0), def.icon + ' ' + this.name, 0.055, C(0.75, 0.95, 1), true);
    this.speed = 3.6;
    if (role === 'receptionist') { this.go.position.copy(Hotel.Lobby.deskBack); setEuler(this.go, 0, 180, 0); }
  }
  get pos() { return this.go.position; }
  Go(p, f) { this.path = Hotel.Path(this.pos, this.floor, p, f ?? this.floor); }
  Update() {
    const dt = Time.deltaTime; if (dt <= 0) return;
    if (this.liftT > 0) { this.liftT -= dt; this.rig.Tick(0); if (this.liftT <= 0) { this.floor = this.liftTo; this.pos.y = Hotel.FloorY(this.floor); } return; }
    if (this.path.length) {
      const n = this.path[0];
      if (n.lift !== undefined) { this.path.shift(); this.liftTo = n.lift; this.liftT = 0.9; this.pos.set(n.x, this.pos.y, n.z); return; }
      if (!U.Walk(this.go, this.path, this.speed, this.rig)) return;
    }
    if (this.role === 'receptionist') return this.ReceptionTick(dt);
    if (this.role === 'cleaner') return this.CleanerTick(dt);
    if (this.role === 'bellhop') return this.BellhopTick(dt);
  }
  ReceptionTick(dt) {
    this.rig.Tick(0); setEuler(this.go, 0, 180, 0);
    const g = Game.queue[0];
    if (!g || g.slot !== 0 || Vec.flat(g.pos, Hotel.QueueSlot(0)) > 0.6) { this.work = 0; return; }
    const room = Game.FreeRoom(g);
    if (!room) return;
    this.work += dt / 2.0; Game.ShowProgress(Hotel.Lobby.desk, this.work);
    if (this.work >= 1) { this.work = 0; g.Assign(room); Sfx.Play('ding', 0.5); }
  }
  CleanerTick(dt) {
    if (!this.task) {
      this.idleT -= dt; if (this.idleT > 0) { this.rig.Tick(0); return; }
      const r = Game.DirtyRooms().filter(x => !x.claimed).sort((a, b) => Math.abs(a.floor - this.floor) - Math.abs(b.floor - this.floor))[0];
      if (!r) { this.idleT = 1.5; this.rig.Tick(0); if (this.floor !== 0 && Random.Chance(0.02)) this.Go(V(10, 0, 4), 0); return; }
      this.task = r; r.claimed = this; this.work = 0; this.Go(r.inside, r.floor); return;
    }
    const r = this.task;
    if (r.state !== 'dirty') { r.claimed = null; this.task = null; return; }
    this.rig.act = Rig.Act.Clean; this.rig.Tick(0);
    this.work += dt / 4.5; Game.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), this.work);
    if (this.work >= 1) { Game.CleanDone(r, false); this.rig.act = Rig.Act.None; r.claimed = null; this.task = null; this.idleT = 0.5; }
  }
  BellhopTick(dt) {
    if (!this.task) {
      this.idleT -= dt; if (this.idleT > 0) { this.rig.Tick(0); return; }
      const r = Game.RequestRooms().filter(x => !x.request.claimed)[0];
      if (!r) { this.idleT = 1.5; this.rig.Tick(0); return; }
      this.task = r; r.request.claimed = this; this.work = 0; this.Go(r.inside, r.floor); return;
    }
    const r = this.task;
    if (!r.request) { this.task = null; return; }
    this.rig.Tick(0); this.work += dt / 2.2; Game.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), this.work);
    if (this.work >= 1) { Game.RequestDone(r, false); this.task = null; this.idleT = 0.4; }
  }
}
