// Elde taşınan eşya yığınının çizimi (müdür ve personel ortak): havlu, kâğıt, tabak, kirli tabak
function drawStack(o, pos) {
  if (o.stackG) { Destroy(o.stackG); o.stackG = null; }
  if (!o.items.length) return;
  const g = o.stackG = U.Pivot(o.go, pos, 'Yigin'); let y = 0;
  for (const t of o.items) {
    if (t === 'towel') { U.Box('Havlu', g, V(0, y + 0.05, 0), V(0.4, 0.1, 0.32), y / 0.11 % 2 < 1 ? C(1, 1, 1) : C(0.8, 0.92, 1)); y += 0.11; }
    else if (t === 'plate') { U.Box('Tabak', g, V(0, y + 0.03, 0), V(0.42, 0.05, 0.42), C(1, 1, 1), 'Cylinder'); U.Box('Yemek', g, V(0, y + 0.08, 0), V(0.26, 0.07, 0.26), C(0.92, 0.55, 0.28), 'Sphere'); y += 0.1; }
    else if (t === 'dirty') { U.Box('KirliTabak', g, V(0, y + 0.03, 0), V(0.42, 0.05, 0.42), C(0.93, 0.92, 0.9), 'Cylinder'); U.Box('Kalinti', g, V(0.04, y + 0.065, 0.02), V(0.2, 0.03, 0.2), C(0.55, 0.38, 0.28), 'Sphere'); y += 0.08; }
    else { U.Box('Kagit', g, V(0, y + 0.09, 0), V(0.22, 0.18, 0.22), C(1, 1, 1), 'Cylinder'); U.Box('KagitSerit', g, V(0, y + 0.09, 0), V(0.23, 0.05, 0.23), C(0.55, 0.75, 0.95), 'Cylinder'); y += 0.19; }
  }
}
// Oyuncu: otel müdürü. Sürükleme/WASD ile yürür, dokunulan yere kendisi gider, asansörle kat değiştirir.
class Player extends Behaviour {
  constructor(look, name) {
    super(); this.go.name = 'Oyuncu';
    this.rig = Rig.Model(this.go, look || 'character-female-a', 1.75);
    this.floor = 0; this.path = []; this.liftT = 0; this.busy = 0;
    this.go.position.set(0, 0, 10);
    this.tag = U.Text(this.go, V(0, 2.25, 0), name || 'Müdür', 0.07, C(1, 0.85, 0.4), true);
    this.ring = U.Flat('Halka', this.go, V(0, 0.03, 0), V(1.2, 0.02, 1.2), C(1, 1, 1, 0.55), 'Torus'); this.ring.rotation.x = Math.PI / 2;
    this.progress = null; this.work = null; this.items = []; this.stackG = null;
  }
  get floorY() { return Hotel.FloorY(this.floor); }
  get pos() { return this.go.position; }
  // Elde eşya yığını: havlu, tuvalet kâğıdı, yemek tabağı. Kapasite 'Taşıma sepeti' yükseltmesiyle artar.
  get CarryCap() { const u = Data.Upgrades.carry; return u.add + u.step * Game.UpgLv('carry'); }
  get CarryFree() { return this.CarryCap - this.items.length; }
  Count(t) { return this.items.filter(x => x === t).length; }
  CarryAdd(t) { if (this.CarryFree <= 0) return false; this.items.push(t); this.RefreshCarry(); return true; }
  CarryTake(t) { const i = this.items.lastIndexOf(t); if (i < 0) return false; this.items.splice(i, 1); this.RefreshCarry(); return true; }
  RefreshCarry() { drawStack(this, V(0, 0.95, 0.42)); }
  get speed() { return 5.6 * Game.UpgMul('me'); }
  set speed(v) { }

  GoTo(p, f) {
    if (f === undefined) f = this.floor;
    this.path = Hotel.Path(this.go.position, this.floor, p, f);
  }
  Stop() { this.path = []; }

  Update() {
    const dt = Time.deltaTime; if (dt <= 0) return;
    if (this.stackG) this.stackG.visible = this.rig.inner.visible;
    if (this.liftT > 0) { this.LiftTick(dt); return; }
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
        this.path.shift(); this.go.position.set(n.x, this.floorY, n.z); this.StartLift(n.lift); return;
      }
      U.Walk(this.go, this.path, this.speed, this.rig);
      return;
    }
    this.rig.Tick(0);
  }
  // Asansör yolculuğu: kapı açılır → karakter kabine girer → kabin (ve kamera) katlar boyunca kayar → kapı açılır, karakter çıkar
  StartLift(f, clearPath = false) {
    if (clearPath) this.path = []; this.liftFrom = this.floor; this.liftTo = f;
    this.liftDur = 1.4 + 0.35 * Math.abs(f - this.floor); this.liftT = this.liftDur; this.liftPhase = 0;
    Hotel.LiftDoor(this.floor, true); Sfx.Play('tick', 0.6);
    UI.Toast((f === 0 ? 'Lobi' : f > Hotel.floors ? 'Çatı' : f + '. kat') + (f > this.floor ? ' ↑' : ' ↓'), 'info');
  }
  LiftTick(dt) {
    this.liftT -= dt; this.rig.Tick(0);
    const u = 1 - this.liftT / this.liftDur; // 0..1
    const y0 = Hotel.FloorY(this.liftFrom), y1 = Hotel.FloorY(this.liftTo);
    if (u < 0.2) { this.go.position.z = Mathf.Lerp(0, -1.2, u / 0.2); } // kabine yürür
    else if (u < 0.8) {
      if (this.liftPhase === 0) { this.liftPhase = 1; Hotel.LiftDoor(this.liftFrom, false); this.rig.inner.visible = false; }
      const k = Mathf.Ease.inOutCubic((u - 0.2) / 0.6);
      this.go.position.y = Mathf.Lerp(y0, y1, k);
      if (this.liftPhase === 1 && k > 0.5) { this.liftPhase = 2; this.floor = this.liftTo; Hotel.SetView(this.floor); }
    } else {
      if (this.liftPhase === 2) { this.liftPhase = 3; this.rig.inner.visible = true; this.go.position.y = y1; Hotel.LiftDoor(this.liftTo, true); Sfx.Play('ding', 0.5); }
      this.go.position.z = Mathf.Lerp(-1.2, 0.3, (u - 0.8) / 0.2);
    }
    if (this.liftT <= 0) this.ArriveFloor();
  }
  ArriveFloor() {
    this.floor = this.liftTo; this.go.position.y = this.floorY; this.rig.inner.visible = true; this.go.position.z = 0.3; this.liftT = 0;
    if (Hotel.view !== this.floor) Hotel.SetView(this.floor);
    Hotel.LiftDoor(this.floor, false);
  }
  RideLift(f) {
    if (!Hotel.InLift(this.go.position) || f === this.floor || this.liftT > 0) return false;
    this.StartLift(f, true); return true;
  }
  TryMove(step) {
    // büyük adımlar duvardan geçmesin: 0.2 m'lik parçalar
    const n = Math.max(1, Math.ceil(Math.hypot(step.x, step.z) / 0.2));
    const part = V(step.x / n, 0, step.z / n);
    for (let i = 0; i < n; i++) this.TryMovePart(part);
  }
  TryMovePart(step) {
    const p = this.go.position, f = this.floor;
    const nx = V(p.x + step.x, p.y, p.z), nz = V(p.x, p.y, p.z + step.z);
    if (Hotel.Walkable(V(p.x + step.x, p.y, p.z + step.z), f)) { p.x += step.x; p.z += step.z; return; }
    let moved = false;
    if (step.x && Hotel.Walkable(nx, f)) { p.x += step.x; moved = true; }
    if (step.z && Hotel.Walkable(nz, f)) { p.z += step.z; moved = true; }
    if (moved || f < 1 || f > Hotel.floors) return;
    // kapı yardımı: odaya doğru itiliyorsa ve kapıya yakınsa kapı hizasına kay
    const side = Math.sign(step.z); if (!side || Math.abs(step.z) < Math.abs(step.x) * 0.5) return;
    // odaya girerken: ilerideki oda; odadan çıkarken: içinde olduğu oda
    const r = Hotel.RoomAt(p, f) || Hotel.RoomAt(V(p.x, p.y, side * 2.5), f); if (!r || r.level < 0) return; // önce içinde olunan oda (çıkış), yoksa ilerideki (giriş)
    if (Math.abs(p.z) > 3.2) return; // kapıdan uzak
    const dx = (r.x + 0.15) - p.x; if (Math.abs(dx) > 1.6) return;
    p.x += Mathf.Clamp(dx, -Math.abs(step.z) * 1.5, Math.abs(step.z) * 1.5);
    const nz2 = V(p.x, p.y, p.z + step.z); if (Hotel.Walkable(nz2, f)) p.z += step.z;
  }
  Near(pt, r = 1.8) { const p = this.go.position; return Math.abs(p.y - pt.y) < 1.5 && Math.hypot(p.x - pt.x, p.z - pt.z) < r; }
}
