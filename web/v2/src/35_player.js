// Oyuncu: otel müdürü. Sürükleme/WASD ile yürür, dokunulan yere kendisi gider, asansörle kat değiştirir.
class Player extends Behaviour {
  constructor(look, name) {
    super(); this.go.name = 'Oyuncu';
    this.rig = Rig.Model(this.go, look || 'character-female-a', 1.75);
    this.floor = 0; this.speed = 5.6; this.path = []; this.liftT = 0; this.busy = 0;
    this.go.position.set(0, 0, 10);
    this.tag = U.Text(this.go, V(0, 2.25, 0), name || 'Müdür', 0.07, C(1, 0.85, 0.4), true);
    this.ring = U.Flat('Halka', this.go, V(0, 0.03, 0), V(1.2, 0.02, 1.2), C(1, 1, 1, 0.55), 'Torus'); this.ring.rotation.x = Math.PI / 2;
    this.progress = null; this.work = null; this.carry = null;
  }
  get floorY() { return Hotel.FloorY(this.floor); }
  get pos() { return this.go.position; }

  GoTo(p, f) {
    if (f === undefined) f = this.floor;
    this.path = Hotel.Path(this.go.position, this.floor, p, f);
  }
  Stop() { this.path = []; }

  Update() {
    const dt = Time.deltaTime; if (dt <= 0) return;
    if (this.liftT > 0) { this.liftT -= dt; this.rig.Tick(0); if (this.liftT <= 0) this.ArriveFloor(); return; }
    // manuel kontrol
    let mx = 0, mz = 0;
    const k = Input.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) mz += 1; if (k.has('KeyS') || k.has('ArrowDown')) mz -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1; if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (Cam.joy) { mx += Cam.joy.x; mz += Cam.joy.y; }
    const mag = Math.min(1, Math.hypot(mx, mz));
    if (mag > 0.05 && !UI.Blocking) {
      this.path = [];
      const F = Cam.Forward, R = Cam.Right;
      const dir = V(R.x * mx + F.x * mz, 0, R.z * mx + F.z * mz); const l = Vec.len(dir);
      const step = Vec.mul(dir, this.speed * mag * dt / l);
      this.TryMove(step);
      U.Face(this.go, dir);
      this.rig.Tick(mag > 0.6 ? 1.3 : 1);
      if (Hotel.InLift(this.go.position) && this.floor <= Hotel.floors + 1) UI.Hint('Asansördesin: sağdaki kat düğmelerine dokun', 2);
      return;
    }
    if (this.path.length) {
      const n = this.path[0];
      if (n.lift !== undefined) {
        // asansöre bin
        this.path.shift(); this.liftTo = n.lift; this.liftT = 0.9; this.go.position.set(n.x, this.floorY, n.z);
        Sfx.Play('tick', 0.6); return;
      }
      U.Walk(this.go, this.path, this.speed, this.rig);
      return;
    }
    this.rig.Tick(0);
  }
  ArriveFloor() {
    this.floor = this.liftTo; this.go.position.y = this.floorY;
    Hotel.SetView(this.floor); Sfx.Play('ding', 0.5);
  }
  RideLift(f) {
    if (!Hotel.InLift(this.go.position) || f === this.floor) return false;
    this.path = []; this.liftTo = f; this.liftT = 0.9; return true;
  }
  TryMove(step) {
    const p = this.go.position, f = this.floor;
    const nx = V(p.x + step.x, p.y, p.z), nz = V(p.x, p.y, p.z + step.z);
    if (Hotel.Walkable(V(p.x + step.x, p.y, p.z + step.z), f)) { p.x += step.x; p.z += step.z; return; }
    if (Hotel.Walkable(nx, f)) p.x += step.x;
    if (Hotel.Walkable(nz, f)) p.z += step.z;
  }
  Near(pt, r = 1.8) { const p = this.go.position; return Math.abs(p.y - pt.y) < 1.5 && Math.hypot(p.x - pt.x, p.z - pt.z) < r; }
}
