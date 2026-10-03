// Para destesi: üstüne basınca para oyuncuya uçar
class MoneyPile extends Behaviour {
  constructor() { super(); this.go.name = 'Para'; this.bills = []; this.value = 0; this.fullAt = 0; this.full = null; }

  static Create(parent, pos) {
    const m = new MoneyPile();
    (parent || W).add(m.go);
    setWorldPos(m.go, pos);
    return m;
  }

  static MakeBill(parent, pos) {
    const b = U.Box('Banknot', parent, pos, V(0.5, 0.07, 0.3), C(0.38, 0.72, 0.38));
    U.Box('Serit', b, V(0, 0.52, 0), V(0.36, 0.1, 0.6), C(0.82, 0.95, 0.8));
    U.Box('Daire', b, V(0, 0.62, 0), V(0.28, 0.1, 0.42), C(0.3, 0.6, 0.3), 'Cylinder');
    return b;
  }

  get position() { return worldPos(this.go); }

  Add(amount) {
    this.value += amount;
    const n = Mathf.Clamp(Math.floor(amount / 4), 1, 6);
    for (let k = 0; k < n && this.bills.length < 60; k++) {
      const idx = this.bills.length, col = idx % 4, layer = Math.min(Math.floor(idx / 4), 14);
      const b = MoneyPile.MakeBill(this.go, V((col % 2) * 0.55 - 0.27, 0.04 + layer * 0.075, Math.floor(col / 2) * 0.35 - 0.17));
      b.rotation.set(0, Random.Range(-6, 6) * Mathf.Deg2Rad, 0);
      this.bills.push(b);
      GameManager.I.Pop(b);
    }
  }

  Update() {
    if (this.fullAt > 0) {
      const f = this.value >= this.fullAt;
      if (f && this.full == null) this.full = U.Text(this.go, V(0, 1.6, 0), 'Kasa dolu!', 0.07, C(1, 0.85, 0.3), true);
      if (this.full) {
        SetActive(this.full.gameObject, f);
        if (f) this.full.transform.position.set(0, 1.6 + Math.abs(Math.sin(Time.time * 4)) * 0.25, 0);
      }
    }
    if (this.value <= 0) return;
    const p = GameManager.I.NearestPlayer(this.position, Eco.Magnet);
    if (p != null) {
      const v = this.value;
      this.value = 0;
      GameManager.I.AddMoney(v, this.position);
      let delay = 0;
      for (const b of this.bills) { GameManager.I.Fly(b, p.transform, delay); delay += 0.025; }
      this.bills = [];
    }
  }
}

// Kilitli alan: üstünde durunca para ödenir, dolunca açılır
class UnlockZone extends Behaviour {
  static Size = 1.8;
  static Create(parent, pos, price, title, icon, onDone) {
    const z = new UnlockZone();
    z.go.name = 'Acilacak_' + title;
    (parent || W).add(z.go); setWorldPos(z.go, pos);
    Object.assign(z, { price, paid: 0, acc: 0, flyCd: 0, stand: 0, pulse: 0, done: onDone, title });
    const S = UnlockZone.Size;
    z.visual = U.Pivot(z.go, V(), 'Gorsel');
    const v = z.visual;
    U.Flat('Zemin', v, V(0, 0.02, 0), V(S, 0.02, S), C(0.16, 0.38, 0.3));
    z.fill = U.Flat('Dolum', v, V(0, 0.03, -S / 2), V(S, 0.02, 0.0001), C(0.35, 0.88, 0.48));
    const dashes = 5, step = S / dashes;
    for (let i = 0; i < dashes; i++) {
      const o = -S / 2 + step * (i + 0.5);
      U.Flat('Kenar', v, V(o, 0.04, S / 2), V(step * 0.6, 0.02, 0.08), Col.white);
      U.Flat('Kenar', v, V(o, 0.04, -S / 2), V(step * 0.6, 0.02, 0.08), Col.white);
      U.Flat('Kenar', v, V(S / 2, 0.04, o), V(0.08, 0.02, step * 0.6), Col.white);
      U.Flat('Kenar', v, V(-S / 2, 0.04, o), V(0.08, 0.02, step * 0.6), Col.white);
    }
    U.Text(v, V(0, 0.06, 0.15), icon, 0.16, C(1, 1, 1, 0.85)).makeFlat();
    U.Text(z.go, V(0, 1.35, 0.2), title, 0.075, Col.white, true);
    z.priceText = U.Text(z.go, V(0, 0.8, 0), Eco.TL(price), 0.11, C(1, 0.88, 0.3), true);
    return z;
  }

  Update() {
    const gm = GameManager.I, p = gm.player;
    if (p == null) return;
    const S = UnlockZone.Size, here = worldPos(this.go);
    const on = U.FlatDist(p.transform.position, here) < S * 0.5;
    this.stand = on ? this.stand + Time.deltaTime : 0;
    if (on && this.stand > 0.2 && gm.money > 0 && this.paid < this.price) {
      this.acc += Time.deltaTime * Math.max(this.price / 1.6, 15);
      let n = Math.floor(this.acc); this.acc -= n;
      n = Math.min(n, this.price - this.paid, gm.money);
      if (n > 0) {
        gm.money -= n; this.paid += n;
        this.flyCd -= Time.deltaTime;
        if (this.flyCd <= 0) { this.flyCd = 0.09; gm.FlyBill(Vec.add(p.transform.position, Vec.up), here); Sfx.Play('tick', 0.5); }
      }
    } else if (on && gm.money <= 0 && this.paid < this.price && this.stand > 0.2 && this.stand < 0.25) {
      gm.FloatText(Vec.add(here, V(0, 2, 0)), 'Para yetmiyor', C(1, 0.6, 0.5), 0.07);
    }
    this.pulse = on ? this.pulse + Time.deltaTime * 8 : 0;
    this.visual.scale.setScalar(1 + Math.sin(this.pulse) * 0.04);
    const t = this.paid / this.price;
    this.fill.scale.set(S, 0.02, Math.max(S * t, 0.0001));
    this.fill.position.set(0, 0.03, -S / 2 + S / 2 * t);
    this.priceText.text = Eco.TL(this.price - this.paid);
    if (this.paid >= this.price) {
      gm.Notify(this.title + ' açıldı!');
      if (this.done) this.done();
      U.Burst(Vec.add(here, V(0, 0.5, 0)), C(1, 0.85, 0.3), C(0.4, 0.8, 1), 60, 6);
      Sfx.Play('unlock');
      gm.Save();
      Destroy(this.go);
    }
  }
}

// Asansör: lobi ile 2. kat arasında geçiş. Oyuncu kapının önündeki dairede bekleyince kat değiştirir.
class Elevator extends Behaviour {
  static Floor2Z = 40;
  static get LobbyPad() { return V(5, 0, 2.6); }
  static get UpPad() { return V(-13.55, 0, Elevator.Floor2Z + 1.65); }

  constructor() { super(); this.go.name = 'Asansor'; this.Open = false; this.doors = [null, null, null, null]; this.t = 0; this.fade = 0; this.armed = true; }
  get Fade() { return this.fade; }

  Build(world, floor2) {
    world.add(this.go);
    let pads = {};
    this.lobbyCar = this.MakeCar(world, V(5, 0, 3.55), 0, 0, pads, 'L', Elevator.LobbyPad);
    this.upCar = this.MakeCar(floor2, V(-14.6, 0, Elevator.Floor2Z + 1.65), -90, 2, pads, 'U', Elevator.UpPad);
    this.padL = pads.L; this.padU = pads.U;
    this.lockedSign = U.Pivot(world, V(), 'AsansorKilitli');
    U.Box('Bant', this.lockedSign, V(5, 1, 3.2), V(1.9, 0.12, 0.04), C(1, 0.8, 0.15));
    U.Box('Bant', this.lockedSign, V(5, 0.6, 3.2), V(1.9, 0.12, 0.04), C(0.2, 0.2, 0.22));
    this.SetOpen(false);
  }

  MakeCar(parent, pos, yaw, di, pads, key, padPos) {
    const g = U.Pivot(parent, pos, 'Asansor');
    g.rotation.set(0, yaw * Mathf.Deg2Rad, 0);
    const t = g;
    const metal = C(0.78, 0.8, 0.84), dark = C(0.3, 0.32, 0.36), gold = C(0.95, 0.78, 0.3);
    U.Box('Kasa', t, V(0, 1.3, 0.15), V(2.2, 2.6, 0.5), dark);
    U.Box('CerceveSol', t, V(-0.95, 1.15, -0.12), V(0.18, 2.3, 0.1), gold);
    U.Box('CerceveSag', t, V(0.95, 1.15, -0.12), V(0.18, 2.3, 0.1), gold);
    U.Box('CerceveUst', t, V(0, 2.32, -0.12), V(2.08, 0.18, 0.1), gold);
    this.doors[di] = U.Box('KapiSol', t, V(-0.43, 1.1, -0.14), V(0.84, 2.2, 0.06), metal);
    this.doors[di + 1] = U.Box('KapiSag', t, V(0.43, 1.1, -0.14), V(0.84, 2.2, 0.06), metal);
    U.Box('Gosterge', t, V(0, 2.62, -0.12), V(0.7, 0.28, 0.06), C(0.1, 0.1, 0.12));
    U.Text(t, V(0, 2.64, -0.2), di === 0 ? '▲ 2. KAT' : '▼ LOBİ', 0.035, C(1, 0.6, 0.2));
    // ped: Unity dünya konumundan yerel konuma
    g.updateMatrixWorld(true);
    const wl = W.localToWorld(V(padPos.x, padPos.y + 0.02, padPos.z)); g.worldToLocal(wl);
    pads[key] = new ProgressPad(t, wl, 0.6, C(0.55, 0.6, 0.75), C(0.3, 0.95, 0.5));
    // engel: kasanın dünya köşelerinden
    const toU = lp => { const w = g.localToWorld(lp.clone()); return W.worldToLocal(w); };
    const a = toU(V(-1.1, 0, -0.2)), b = toU(V(1.1, 0, 0.45));
    GameManager.I.AddObstacle(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z));
    return g;
  }

  SetOpen(o) { this.Open = o; SetActive(this.lobbyCar, o); SetActive(this.lockedSign, !o); }

  Update() {
    if (!this.Open) return;
    const gm = GameManager.I;
    if (gm.player == null) return;
    let onL = false, onU = false;
    for (const pl of gm.players) {
      if (!pl) continue;
      const pp = pl.transform.position;
      if (U.FlatDist(pp, Elevator.LobbyPad) < 0.6) onL = true;
      if (U.FlatDist(pp, Elevator.UpPad) < 0.6) onU = true;
    }
    if (!onL && !onU) this.armed = true;
    this.AnimateDoors(0, this.NearAny(Elevator.LobbyPad, 2.2));
    this.AnimateDoors(2, this.NearAny(Elevator.UpPad, 2.2));
    if (this.armed && (onL || onU)) this.t += Time.deltaTime / 0.5; else this.t = 0;
    this.padL.Set(onL ? this.t : 0);
    this.padU.Set(onU ? this.t : 0);
    if (this.t >= 1) {
      this.t = 0; this.armed = false; this.fade = 1;
      // Ekip birlikte biner: tüm oyuncular aynı kata geçer
      const dest = onL ? Vec.add(Elevator.UpPad, V(1.1, 0, 0)) : Vec.add(Elevator.LobbyPad, V(0, 0, -1.1));
      const side = onL ? V(0, 0, -0.9) : V(0.9, 0, 0);
      let k = 0;
      for (const pl of gm.players) {
        if (!pl) continue;
        pl.transform.position.copy(Vec.add(dest, Vec.mul(side, k)));
        lookRotation(pl.transform, onL ? Vec.right : Vec.back);
        k++;
      }
      if (gm.camFollow) gm.camFollow.Snap();
      Sfx.Play('ding', 0.8);
      gm.Notify(onL ? '2. Kat' : 'Lobi');
    }
    if (this.fade > 0) this.fade -= Time.deltaTime * 2;
  }

  NearAny(pad, r) {
    const gm = GameManager.I;
    if (gm.PlayerNear(pad, r)) return true;
    for (const c of gm.customers) if (alive(c.go) && U.FlatDist(c.transform.position, pad) < r) return true;
    for (const c of gm.cleaners) if (alive(c.go) && U.FlatDist(c.transform.position, pad) < r) return true;
    return false;
  }

  AnimateDoors(di, open) {
    for (let k = 0; k < 2; k++) {
      const d = this.doors[di + k];
      if (!d) continue;
      const side = k === 0 ? -1 : 1, baseX = side * 0.43, target = baseX + (open ? side * 0.7 : 0);
      d.position.x = Mathf.Lerp(d.position.x, target, Time.deltaTime * 6);
    }
  }
}

// Kamera oyuncuyu (iki oyunculu modda ikisinin ortasını) yumuşakça takip eder
class CameraFollow extends Behaviour {
  static get Offset() { return V(0, 17.6, -13.75); }
  constructor() { super(); this.go.name = 'Kamera'; this.target = null; this.zoom = 1; this.started = false; }

  Goal() {
    const t = this.target.position.clone();
    let z = 1;
    const gm = GameManager.I;
    if (gm && gm.coop && gm.player2) {
      const b = gm.player2.transform.position;
      if (Math.abs(b.z - t.z) < 20) {
        const d = Math.hypot(t.x - b.x, t.z - b.z);
        t.set((t.x + b.x) * 0.5, (t.y + b.y) * 0.5, (t.z + b.z) * 0.5);
        z = 1 + 0.45 * Mathf.Clamp01((d - 6) / 16);
      }
    }
    // dar ekranda (telefon dikey) biraz uzaklaş
    const aspect = innerWidth / innerHeight;
    if (aspect < 1.2) z *= Mathf.Lerp(1.9, 1, Mathf.InverseLerp(0.45, 1.2, aspect));
    const extra = (z - 1) * 8;
    if (aspect < 1) t.z += 2.5 * (1 - aspect); // dikey ekranda odalar daha çok görünsün
    if (t.z > 20) {
      t.x = Mathf.Clamp(t.x, -9 + extra, 9 - extra);
      t.z = Mathf.Clamp(t.z, Elevator.Floor2Z + 2.5, Elevator.Floor2Z + 5.5);
    } else {
      const mn = gm ? gm.CamMinX : -9, mx = gm ? gm.CamMaxX : 9;
      if (Outside.IsOutside(this.target.position)) {
        // dışarıda: kamera bahçeleri ve caddeyi de gezer
        t.x = Mathf.Clamp(t.x, -26 + extra, 33 - extra);
        t.z = Mathf.Clamp(t.z, -16.5, 5.5);
      } else {
        t.x = Mathf.Clamp(t.x, Math.min(mn + extra, 0), Math.max(mx - extra, 0));
        t.z = Mathf.Clamp(t.z, -10, 5.5);
      }
    }
    t.y = 0;
    this.zoom = z;
    return Vec.add(t, Vec.mul(CameraFollow.Offset, z));
  }

  Snap() { if (this.target) CamState.pos = this.Goal(); }

  LateUpdate() {
    if (!this.target) return;
    if (!this.started) { this.started = true; this.Snap(); }
    CamState.rot = { x: U.CamRot.x, y: 0 };
    CamState.pos = Vec.lerp(CamState.pos, this.Goal(), Time.deltaTime * 5);
    SunState.target = V(CamState.pos.x, 0, CamState.pos.z - CameraFollow.Offset.z * this.zoom);
  }
}
