// Oyuncu (müdür). 1. oyuncu: WASD, ekranda sürükleme (tek oyuncuda ok tuşları da).
// 2. oyuncu: ok tuşları. Elinde temiz çarşaf taşıyabilir.
class Player extends Behaviour {
  constructor() {
    super(); this.go.name = 'Oyuncu';
    this.id = 1; this.speed = 5.5; this.dragging = false; this.Moved = false;
    this.dragStart = { x: 0, y: 0 }; this.dragNow = { x: 0, y: 0 };
    this.linen = 0; this.carryItems = []; this.shownLinen = -1; this.noLinenCd = 0;
    this.rig = Rig.Model(this.go, 'character-male-d');
    this.nameTag = U.Text(null, V(), '', 0.06, C(1, 0.86, 0.42), true);
    this.ring = U.Flat('Halka', this.go, V(0, 0.02, 0), V(1.1, 0.01, 1.1), C(1, 1, 1), 'Cylinder');
    this.ringIn = U.Flat('HalkaIc', this.ring, V(0, 1.2, 0), V(0.85, 1, 0.85), C(0.98, 0.7, 0.3), 'Cylinder');
    this.carry = U.Pivot(this.go, V(0, 1.05, 0.5), 'Tasinan');
  }

  // 2. oyuncu için halka rengini değiştir
  SetSecond() {
    this.id = 2;
    this.ringIn.material = U.Mat(C(0.4, 0.7, 1));
    if (this.nameTag) this.nameTag.color = C(0.6, 0.85, 1);
  }

  destroy() { if (this.nameTag) Destroy(this.nameTag.gameObject); Destroy(this.go); }

  Update() {
    const gm = GameManager.I;
    this.speed = Eco.PlayerSpeed;
    const blocked = gm.MenuOpen || Popups.Open;
    const inp = blocked ? { x: 0, y: 0 } : this.ReadInput();
    if (blocked) this.dragging = false;
    const move = V(inp.x, 0, inp.y);
    const walking = move.x * move.x + move.z * move.z > 0.01;
    if (walking) {
      this.Moved = true;
      const delta = Vec.mul(move, this.speed * Time.deltaTime);
      let p = this.transform.position.clone();
      const n = Vec.add(p, delta);
      const ref = { p };
      if (gm.Walkable(n) || !gm.Walkable(p)) p = n;
      else if (gm.DoorAssist(ref, move, this.speed * Time.deltaTime)) p = ref.p;
      else {
        const nx = Vec.add(p, V(delta.x, 0, 0));
        if (gm.Walkable(nx)) p = nx;
        const nz = Vec.add(p, V(0, 0, delta.z));
        if (gm.Walkable(nz)) p = nz;
      }
      this.transform.position.copy(p);
      U.Face(this.transform, move);
    }
    this.rig.act = !walking && this.IsCleaning() ? Rig.Act.Clean : Rig.Act.None;
    this.rig.Tick(walking ? Mathf.Clamp01(Vec.len(move)) * (this.speed / 5.5) : 0);
    const rs = 1.1 + Math.sin(Time.time * 3) * 0.05;
    this.ring.scale.set(rs, 0.01, rs);
    this.UpdateCarry();
    if (this.noLinenCd > 0) this.noLinenCd -= Time.deltaTime;
  }

  // Kirli odada çarşafsız durunca ipucu
  NoLinenHint(at) {
    if (this.noLinenCd > 0) return;
    this.noLinenCd = 3;
    GameManager.I.FloatText(Vec.add(at, V(0, 2.2, 0)), 'Çarşafın yok! Çamaşırhaneden al', C(1, 0.75, 0.45), 0.06);
  }

  UpdateCarry() {
    if (this.linen === this.shownLinen) return;
    this.shownLinen = this.linen;
    while (this.carryItems.length < Math.min(this.linen, 12)) {
      const k = this.carryItems.length;
      this.carryItems.push(U.Box('Carsaf', this.carry, V(0, k * 0.11, 0), V(0.55, 0.1, 0.4), k % 3 === 0 ? C(0.75, 0.88, 1) : Col.white));
    }
    for (let i = 0; i < this.carryItems.length; i++) SetActive(this.carryItems[i], i < this.linen);
  }

  SetLook(variant, name) {
    if (this.rig) Destroy(this.rig.go);
    this.rig = Rig.Model(this.go, variant);
    if (this.nameTag) this.nameTag.text = name;
  }

  LateUpdate() { if (this.nameTag) this.nameTag.transform.position.copy(Vec.add(this.transform.position, V(0, 2.75, 0))); }

  IsCleaning() {
    const gm = GameManager.I, pos = this.transform.position;
    for (const r of gm.rooms) if ((r.state === Room.State.Dirty || r.HasRequest) && U.FlatDist(pos, r.CleanSpot) < 0.95) return true;
    if (gm.cafe.Open && gm.cafe.queue.length > 0 && U.FlatDist(pos, Cafe.ServeSpot) < 0.8) return true;
    if (gm.reception.queue.length > 0 && U.FlatDist(pos, gm.reception.servicePos) < 0.85) return true;
    return false;
  }

  ReadInput() {
    let v = { x: 0, y: 0 };
    let down = false, pos = { x: 0, y: 0 };
    const coop = GameManager.I.coop, k = Input.keys;
    if (this.id === 2) {
      if (k.has('ArrowUp')) v.y += 1; if (k.has('ArrowDown')) v.y -= 1;
      if (k.has('ArrowRight')) v.x += 1; if (k.has('ArrowLeft')) v.x -= 1;
    } else {
      if (k.has('KeyW') || (!coop && k.has('ArrowUp'))) v.y += 1;
      if (k.has('KeyS') || (!coop && k.has('ArrowDown'))) v.y -= 1;
      if (k.has('KeyD') || (!coop && k.has('ArrowRight'))) v.x += 1;
      if (k.has('KeyA') || (!coop && k.has('ArrowLeft'))) v.x -= 1;
    }
    if (this.id === 1 && Input.pointerDown) {
      down = true;
      // Unity ekran koordinatı: y aşağıdan yukarı
      pos = { x: Input.pointerPos.x, y: Screen.height - Input.pointerPos.y };
    }
    // Arayüz düğmelerine tıklamayı joystick sayma
    if (down && !this.dragging) {
      const pp = Input.pressPos ? { x: Input.pressPos.x, y: Screen.height - Input.pressPos.y } : pos;
      if (GameManager.I.OverUI(pp) || GUI.wantsMouse) down = false;
    }
    if (down) {
      if (!this.dragging) { this.dragging = true; this.dragStart = { x: pos.x, y: pos.y }; }
      this.dragNow = pos;
      let d = { x: (pos.x - this.dragStart.x) / (Screen.height * 0.08), y: (pos.y - this.dragStart.y) / (Screen.height * 0.08) };
      const m = Math.hypot(d.x, d.y);
      if (m > 1) d = { x: d.x / m, y: d.y / m };
      if (Math.hypot(d.x, d.y) > 0.1) v = d;
    } else this.dragging = false;
    const vm = Math.hypot(v.x, v.y);
    if (vm > 1) v = { x: v.x / vm, y: v.y / vm };
    return v;
  }
}
