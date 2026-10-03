// Tek bir otel odası: kilitli, temiz, dolu, kirli; 3 belirgin seviye
class Room extends Behaviour {
  static State = { Locked: 0, Clean: 1, Reserved: 2, Occupied: 3, Dirty: 4 };
  static Requests = ['Havlu lütfen!', 'Bir kahve?', 'Ekstra yastık!', 'Su getirir misin?'];
  static Wood = C(0.62, 0.45, 0.32);
  static Gold = C(0.95, 0.78, 0.3);
  static S = 2.1;

  constructor() {
    super();
    this.state = Room.State.Locked; this.index = 0; this.x = 0; this.claimed = false; this.level = 0; this.tips = null;
    this.bedTop = 0.55; this.lv = [null, null, null, null]; this.lvObs = [[], [], [], []]; this.activeObs = [];
    this.cleanT = 0; this.reqT = 0;
    this.kind = 0; this.suitePart = null; this.suiteMain = null; this.kindGroup = null; this.lounge = null; this.loungeObs = [];
    this.hasLinen = false; this.theme = 0; this.themeOwned = 1;
    this.themeGroups = []; this.wallOrig = [null, null, null, null];
    this.guest = null; this.request = null; this.reqClaimed = false; this.oz = 0;
  }

  get CleanSpot() { return V(this.x, 0, this.Z(6.2)); }
  get BedPos() { return V(this.x, this.bedTop + 0.55, this.Z(7.35)); }
  get Price() {
    return this.IsSuite ? Mathf.RoundToInt((Eco.NightPrice(this.index, 3) + Eco.NightPrice(this.suitePart.index, 3)) * 1.5)
      : Mathf.RoundToInt(Eco.NightPrice(this.index, this.level) * RoomKinds.PriceMul(this.kind));
  }
  get Tip() {
    return this.IsSuite ? Mathf.RoundToInt((Eco.Tip(this.index, 3) + Eco.Tip(this.suitePart.index, 3)) * 1.5)
      : Mathf.RoundToInt(Eco.Tip(this.index, this.level) * RoomKinds.PriceMul(this.kind));
  }
  get Number() { return this.index < Eco.Floor2Start ? 101 + this.index : 201 + this.index - Eco.Floor2Start; }
  get Unlocked() { return this.state !== Room.State.Locked; }
  get IsSuitePart() { return this.suiteMain != null; }
  get IsSuite() { return this.suitePart != null; }
  get HasRequest() { return this.request != null; }
  Z(z) { return z + this.oz; }
  get Door() { return V(this.x, 0, this.Z(2.5)); }
  get Inside() { return V(this.x, 0, this.Z(6.6)); }

  Init(world, i, px, zOffset = 0) {
    this.index = i; this.x = px; this.oz = zOffset;
    this.go.name = 'Oda' + i;
    world.add(this.go);
    const x = this.x, Z = z => this.Z(z), T = this.go;

    // ---- Her seviyede ortak: çöp, dağınık yatak, battaniye, temizlik dairesi ----
    const ct = U.Pivot(T, V(), 'Ortak');
    this.blanket = U.Pivot(ct, V(), 'UyuyanBattaniye');
    U.Box('Battaniye', this.blanket, V(x, 0.87, Z(7.95)), V(1.5, 0.3, 1.55), C(0.55, 0.75, 0.95));
    U.Box('BattaniyeKenar', this.blanket, V(x, 0.88, Z(8.72)), V(1.52, 0.3, 0.12), Col.white);
    this.blanket.visible = false;

    this.messy = U.Pivot(ct, V(), 'Daginik');
    const mb = U.Box('DaginikCarsaf', this.messy, V(x + 0.1, 0.62, Z(7.95)), V(1.5, 0.1, 1.5), C(0.68, 0.6, 0.52));
    setEuler(mb, 0, 12, 3);
    const mp = U.Box('DusmusYastik', this.messy, V(x - 0.9, 0.12, Z(6.7)), V(0.7, 0.18, 0.45), Col.white);
    setEuler(mp, 0, 35, 8);
    this.messy.visible = false;

    this.trash = U.Pivot(ct, V(), 'Cop');
    for (let k = 0; k < 5; k++) {
      const s = Random.Range(0.16, 0.26);
      U.Box('CopParca', this.trash, V(x + Random.Range(-1.3, 1.3), 0.1, Z(Random.Range(4.8, 7.0))), V(s, s * 0.7, s), C(0.92, 0.92, 0.88), 'Sphere');
    }
    U.Box('Havlu', this.trash, V(x + 0.8, 0.05, Z(5.3)), V(0.7, 0.05, 0.45), C(1, 0.75, 0.8));
    this.trash.visible = false;

    this.pad = new ProgressPad(ct, Vec.add(this.CleanSpot, V(0, 0.05, 0)), 0.8, C(0.25, 0.6, 0.95), C(0.3, 0.95, 0.5));
    this.pad.Show(false);
    this.reqPad = new ProgressPad(ct, Vec.add(this.CleanSpot, V(0, 0.05, 0)), 0.8, C(1, 0.6, 0.2), C(0.3, 0.95, 0.5));
    this.reqPad.Show(false);
    this.needText = U.Text(ct, V(x, 1.5, Z(6.2)), 'Çarşaf gerekli', 0.045, C(1, 0.75, 0.45), true);
    SetActive(this.needText.gameObject, false);
    // İstek balonu: yazının arkasında beyaz balon (yazı kameraya dönük, balon da)
    this.reqBubble = U.Pivot(ct, V(x, 3.1, Z(7.6)), 'IstekBalonu');
    this.reqText = new BubbleText(this.reqBubble);
    this.reqBubble.visible = false;

    this.BuildLevel1();
    this.BuildLevel2();
    this.BuildLevel3();
    this.BuildThemes();

    // ---- Kilitli görünüm ----
    this.cover = U.Pivot(T, V(), 'Kilitli');
    U.Prim('BetonZemin', this.cover, V(x, -0.04, Z(7.25)), V(4.8, 0.1, 6.5), U.Mat(C(0.55, 0.55, 0.58), U.CarpetTex, { x: 2, y: 2 }, 0.1, 0));
    for (let k = 0; k < 3; k++)
      U.Furn('cardboardBoxClosed', this.cover, V(x - 1.2 + k * 1.1, 0, 8.6 + (k % 2) * 0.5), k * 25, Room.S * 1.6, V(0.8, 0.6, 0.8), C(0.75, 0.6, 0.4));
    U.Box('Seritler', this.cover, V(x, 0.55, Z(4.05)), V(1.7, 0.08, 0.05), C(1, 0.8, 0.1));
    U.Text(this.cover, V(x, 1.7, Z(7)), 'KAPALI', 0.08, C(1, 1, 1, 0.8), true);

    // ---- Kapı üstü numara ----
    U.Text(T, V(x, 1.35, Z(3.9)), String(this.Number), 0.085, C(0.3, 0.22, 0.15));
    this.levelText = U.Text(T, V(x, 1.05, Z(3.85)), '', 0.045, C(0.85, 0.6, 0.1));

    this.tips = MoneyPile.Create(T, V(x + 1.5, 0, Z(2.9)));
  }

  // ---------------- SEVİYE 1: Standart ----------------
  BuildLevel1() {
    const t = this.NewLevel(1), x = this.x, Z = z => this.Z(z), S = Room.S, Wood = Room.Wood;
    U.Prim('Zemin', t, V(x, -0.04, Z(7.25)), V(4.8, 0.1, 6.5), U.Mat(C(0.9, 0.78, 0.62), U.WoodTex, { x: 2.5, y: 3 }, 0.3, 0));
    U.Box('DuvarKagidi', t, V(x, 1.25, Z(10.47)), V(4.6, 2.4, 0.02), C(0.96, 0.92, 0.84));
    this.Window(t);
    U.Prim('Hali', t, V(x, 0.012, Z(6.4)), V(2.4, 0.02, 1.6), U.Mat(C(0.7, 0.8, 0.7), U.CarpetTex, { x: 1, y: 1 }, 0.05, 0));
    const bed = this.Ob(1, U.Furn('bedSingle', t, V(x, 0, Z(8.65)), 180, S, V(1.3, 0.55, 2.4), Wood));
    this.bedTop = bed.min.y + bed.size.y * 0.69;
    const ns = this.Ob(1, U.Furn('cabinetBedDrawerTable', t, V(x + 1.2, 0, Z(9.75)), 180, S, V(0.55, 0.55, 0.45), Wood));
    U.Furn('lampRoundTable', t, V(x + 1.2, ns.max.y, Z(9.75)), 180, S, V(0.3, 0.6, 0.3), C(1, 0.9, 0.6));
    this.Ob(1, U.Furn('pottedPlant', t, V(x - 1.95, 0, Z(9.85)), 30, 2.2, V(0.5, 1.4, 0.5), C(0.3, 0.65, 0.35)));
    this.Ob(1, U.Furn('chairRounded', t, V(x + 1.95, 0, Z(5.2)), -120, 2.3, V(0.5, 1, 0.5), Wood));
  }

  // ---------------- SEVİYE 2: Konfor ----------------
  BuildLevel2() {
    const t = this.NewLevel(2), x = this.x, Z = z => this.Z(z), S = Room.S, Wood = Room.Wood;
    U.Prim('Zemin', t, V(x, -0.04, Z(7.25)), V(4.8, 0.1, 6.5), U.Mat(C(0.56, 0.66, 0.8), U.CarpetTex, { x: 3, y: 4 }, 0.05, 0));
    U.Box('DuvarKagidi', t, V(x, 1.25, Z(10.47)), V(4.6, 2.4, 0.02), C(0.72, 0.84, 0.95));
    U.Box('DuvarSeridi', t, V(x, 0.9, Z(10.45)), V(4.6, 0.08, 0.03), Col.white);
    this.Window(t);
    this.Curtains(t, C(0.3, 0.45, 0.75));
    U.Prim('Hali', t, V(x, 0.012, Z(6.3)), V(3.4, 0.02, 2.2), U.Mat(C(0.95, 0.92, 0.85), U.CarpetTex, { x: 2, y: 1.3 }, 0.05, 0));
    const bed = this.Ob(2, U.Furn('bedDouble', t, V(x, 0, Z(8.65)), 180, S, V(2, 0.55, 2.4), Wood));
    this.bedTop = bed.min.y + bed.size.y * 0.69;
    for (const side of [-1, 1]) {
      const ns = this.Ob(2, U.Furn('cabinetBedDrawerTable', t, V(x + 1.6 * side, 0, Z(9.75)), 180, S, V(0.55, 0.55, 0.45), Wood));
      U.Furn('lampRoundTable', t, V(x + 1.6 * side, ns.max.y, Z(9.75)), 180, S, V(0.3, 0.6, 0.3), C(1, 0.9, 0.6));
      U.Prim('LambaIsik', t, V(x + 1.6 * side, ns.max.y + 0.42, Z(9.75)), V(0.16, 0.16, 0.16), U.Glow(C(1, 0.88, 0.6), 2), 'Sphere');
    }
    const tvc = this.Ob(2, U.Furn('cabinetTelevision', t, V(x - 2.0, 0, Z(7.2)), 90, S, V(0.55, 0.65, 1.6), Wood));
    U.Furn('televisionModern', t, V(x - 2.05, tvc.max.y, Z(7.2)), 90, S, V(0.2, 0.9, 1.4), C(0.15, 0.15, 0.17));
    this.Ob(2, U.Furn('bookcaseClosedDoors', t, V(x + 1.95, 0, Z(7.0)), -90, S, V(0.55, 1.8, 0.85), Wood));
    this.Ob(2, U.Furn('loungeChair', t, V(x + 1.7, 0, Z(5.0)), -135, 2.0, V(1, 0.9, 0.9), C(0.3, 0.45, 0.75)));
    this.Painting(t, C(0.35, 0.65, 0.85));
  }

  // ---------------- SEVİYE 3: Kral Dairesi ----------------
  BuildLevel3() {
    const t = this.NewLevel(3), x = this.x, Z = z => this.Z(z), S = Room.S, Wood = Room.Wood, Gold = Room.Gold;
    U.Prim('Zemin', t, V(x, -0.04, Z(7.25)), V(4.8, 0.1, 6.5), U.Mat(C(0.97, 0.95, 0.93), U.TileTex, { x: 2.4, y: 3.2 }, 0.85, 0));
    U.Flat('AltinKenar', t, V(x, 0.015, Z(7.25)), V(4.2, 0.02, 5.9), Gold);
    U.Prim('ZeminIc', t, V(x, 0.02, Z(7.25)), V(4.0, 0.02, 5.7), U.Mat(C(0.97, 0.95, 0.93), U.TileTex, { x: 2, y: 2.8 }, 0.85, 0));
    U.Box('DuvarKagidi', t, V(x, 1.25, Z(10.47)), V(4.6, 2.4, 0.02), C(0.55, 0.16, 0.24));
    for (let k = -2; k <= 2; k++) U.Box('AltinCizgi', t, V(x + k * 0.9, 1.25, Z(10.45)), V(0.04, 2.4, 0.02), Gold);
    this.Window(t);
    this.Curtains(t, C(0.85, 0.65, 0.25));
    U.Prim('Hali', t, V(x, 0.035, Z(6.1)), V(2.8, 0.02, 1.9), U.Mat(C(0.75, 0.2, 0.28), U.CarpetTex, { x: 2, y: 1.3 }, 0.05, 0));
    U.Flat('HaliKenar', t, V(x, 0.03, Z(6.1)), V(3.0, 0.02, 2.1), Gold);
    const bed = this.Ob(3, U.Furn('bedDouble', t, V(x, 0, Z(8.65)), 180, S, V(2, 0.55, 2.4), Wood));
    // Kanopi (cibinlikli yatak)
    for (const sx of [-1, 1]) for (const sz of [bed.min.z + 0.08, bed.max.z - 0.08])
      U.Box('KanopiDirek', t, V(x + sx * (bed.size.x / 2 - 0.05), 1.2, sz), V(0.09, 2.4, 0.09), Gold);
    U.Box('KanopiUst', t, V(x, 2.4, bed.center.z), V(bed.size.x + 0.1, 0.08, bed.size.z), Gold);
    for (const sx of [-1, 1]) U.Box('Tul', t, V(x + sx * (bed.size.x / 2 + 0.02), 1.9, bed.center.z), V(0.03, 0.9, bed.size.z * 0.9), C(0.98, 0.92, 0.96));
    U.Box('YatakOrtu', t, V(x, bed.min.y + bed.size.y * 0.7 + 0.01, Z(7.75)), V(bed.size.x * 0.92, 0.03, 0.4), Gold);
    U.Furn('pillowBlue', t, V(x, bed.min.y + bed.size.y * 0.69, Z(9.15)), 0, S, V(0.6, 0.15, 0.35), C(0.5, 0.7, 0.95));
    for (const side of [-1, 1]) {
      const ns = this.Ob(3, U.Furn('cabinetBedDrawerTable', t, V(x + 1.6 * side, 0, Z(9.75)), 180, S, V(0.55, 0.55, 0.45), Wood));
      U.Furn('lampRoundTable', t, V(x + 1.6 * side, ns.max.y, Z(9.75)), 180, S, V(0.3, 0.6, 0.3), C(1, 0.9, 0.6));
      U.Prim('LambaIsik', t, V(x + 1.6 * side, ns.max.y + 0.42, Z(9.75)), V(0.16, 0.16, 0.16), U.Glow(C(1, 0.88, 0.6), 2.2), 'Sphere');
    }
    const tvc = this.Ob(3, U.Furn('cabinetTelevision', t, V(x - 2.0, 0, Z(7.4)), 90, S, V(0.55, 0.65, 1.6), Wood));
    U.Furn('televisionModern', t, V(x - 2.05, tvc.max.y, Z(7.4)), 90, S, V(0.2, 0.9, 1.4), C(0.15, 0.15, 0.17));
    this.Ob(3, U.Furn('bathtub', t, V(x - 1.75, 0, Z(5.15)), 90, 1.6, V(0.9, 0.6, 1.9), Col.white));
    U.Box('Kopuk', t, V(x - 1.75, 0.62, Z(5.15)), V(0.6, 0.08, 1.3), C(0.85, 0.95, 1), 'Sphere');
    this.Ob(3, U.Furn('loungeChair', t, V(x + 1.7, 0, Z(5.0)), -135, 2.0, V(1, 0.9, 0.9), C(0.75, 0.2, 0.3)));
    const fl = this.Ob(3, U.Furn('lampSquareFloor', t, V(x + 2.05, 0, Z(6.3)), 0, S, V(0.3, 1.8, 0.3), C(1, 0.9, 0.6)));
    U.Prim('AbajurIsik', t, V(fl.center.x, fl.max.y - 0.2, fl.center.z), V(0.22, 0.22, 0.22), U.Glow(C(1, 0.88, 0.6), 2.2), 'Sphere');
    this.Ob(3, U.Furn('pottedPlant', t, V(x + 2.0, 0, Z(8.1)), 0, 2.4, V(0.5, 1.4, 0.5), C(0.3, 0.65, 0.35)));
    // Avize
    U.Box('AvizeZincir', t, V(x, 2.75, Z(6.6)), V(0.03, 0.5, 0.03), Gold);
    U.Box('AvizeHalka', t, V(x, 2.45, Z(6.6)), V(0.8, 0.03, 0.8), Gold, 'Cylinder');
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      U.Prim('AvizeIsik', t, V(x + Math.cos(a) * 0.38, 2.52, Z(6.6) + Math.sin(a) * 0.38), V(0.12, 0.12, 0.12), U.Glow(C(1, 0.9, 0.65), 3), 'Sphere');
    }
    this.Painting(t, C(0.95, 0.7, 0.3));
    U.Text(t, V(x, 2.15, Z(10.3)), '★★★', 0.07, Gold);
  }

  NewLevel(l) { const g = U.Pivot(this.go, V(), 'Seviye' + l); this.lv[l] = g; return g; }
  Ob(l, b) { this.lvObs[l].push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z)); return b; }

  Window(t) {
    const x = this.x, Z = z => this.Z(z);
    U.Box('Pencere', t, V(x, 1.5, Z(10.44)), V(1.9, 1.2, 0.04), Col.white);
    U.Prim('Cam', t, V(x, 1.5, Z(10.42)), V(1.65, 0.95, 0.03), U.Glow(C(0.6, 0.82, 1), 0.6));
    U.Box('PencereOrta', t, V(x, 1.5, Z(10.4)), V(0.06, 0.95, 0.03), Col.white);
  }
  Curtains(t, c) {
    const x = this.x, Z = z => this.Z(z);
    U.Box('Perde', t, V(x - 1.15, 1.45, Z(10.36)), V(0.45, 1.6, 0.06), c);
    U.Box('Perde', t, V(x + 1.15, 1.45, Z(10.36)), V(0.45, 1.6, 0.06), c);
    U.Box('PerdeCubuk', t, V(x, 2.28, Z(10.36)), V(2.9, 0.05, 0.05), Room.Gold);
  }
  Painting(t, c) {
    const x = this.x, Z = z => this.Z(z);
    U.Box('Cerceve', t, V(x - 2.33, 1.6, Z(5.5)), V(0.04, 0.6, 0.85), Room.Gold);
    const canvas = U.Box('Resim', t, V(x - 2.31, 1.6, Z(5.5)), V(0.03, 0.48, 0.72), c);
    Photos.Apply(canvas, 0.72, 0.48);
  }

  // ---------------- Durum ----------------
  ApplyLevel(l, fx) {
    const wasLocked = this.state === Room.State.Locked;
    this.level = Mathf.Clamp(l, 0, 3);
    if (this.level === 0) this.state = Room.State.Locked;
    else if (wasLocked) this.state = Room.State.Clean;
    this.cover.visible = this.level === 0;
    for (let k = 1; k <= 3; k++) this.lv[k].visible = this.level === k && !this.IsSuitePart;
    if (this.lounge) this.lounge.visible = this.IsSuitePart;
    this.activeObs = [];
    if (this.IsSuitePart) this.activeObs.push(...this.loungeObs);
    else if (this.level > 0) this.activeObs.push(...this.lvObs[this.level]);

    // yatak yüksekliği ve battaniye rengi seviyeye göre
    const bedR = findChild(this.lv[Math.max(1, this.level)], this.level === 1 ? 'bedSingle' : 'bedDouble');
    if (bedR) {
      const vis = bedR.parent.visible; bedR.parent.visible = true;
      const b = U.WorldBounds(bedR);
      bedR.parent.visible = vis;
      this.bedTop = b.min.y + b.size.y * 0.69;
      const w = Math.max(0.9, b.size.x * 0.85);
      for (const c of this.blanket.children) { c.position.y = this.bedTop + 0.32; c.scale.x = w; }
      for (const c of this.messy.children) if (c.name === 'DaginikCarsaf') { c.position.y = this.bedTop + 0.06; c.scale.x = w; }
    }
    const bc = [Col.white, C(0.55, 0.75, 0.95), C(0.75, 0.68, 0.95), C(0.75, 0.2, 0.3)];
    for (const c of this.blanket.children) if (c.name === 'Battaniye') c.material = U.Mat(bc[Math.max(1, this.level)]);
    this.levelText.text = this.LevelLabel;
    this.ApplyTheme();
    this.ApplyKind();
    if (fx && this.level > 0) {
      U.Burst(V(this.x, 1.5, this.Z(7.5)), C(1, 0.85, 0.3), C(1, 0.5, 0.7), 80, 6);
      Sfx.Play('unlock');
      GameManager.I.Notify(wasLocked ? 'Yeni oda açıldı: ' + this.Number + '!' : this.Number + ' artık ' + Eco.LevelNames[this.level] + '!');
    }
  }

  // ---------------- Temalar ----------------
  BuildThemes() {
    const x = this.x, Z = z => this.Z(z);
    for (let k = 1; k <= 3; k++) { const w = findChild(this.lv[k], 'DuvarKagidi'); if (w) this.wallOrig[k] = w.material.userData.color; }
    for (let th = 1; th < Themes.Names.length; th++) {
      const g = U.Pivot(this.go, V(), 'Tema' + Themes.Names[th]);
      this.themeGroups[th] = g;
      const t = g;
      switch (th) {
        case 1: { // Deniz
          U.Flat('HaliMavi', t, V(x, 0.045, Z(6.0)), V(2.6, 0.01, 1.5), C(0.2, 0.4, 0.7));
          for (let k = 0; k < 3; k++) U.Flat('HaliCizgi', t, V(x, 0.05, Z(5.55 + k * 0.45)), V(2.6, 0.01, 0.14), Col.white);
          const ring = U.Box('CanSimidi', t, V(x - 1.85, 1.75, Z(10.42)), V(0.55, 0.05, 0.55), C(0.95, 0.3, 0.3), 'Cylinder');
          setEuler(ring, 90, 0, 0);
          const hole = U.Box('SimitIc', t, V(x - 1.85, 1.75, Z(10.39)), V(0.28, 0.05, 0.28), Themes.Wall[1], 'Cylinder');
          setEuler(hole, 90, 0, 0);
          for (const a of [0, 90]) { const st = U.Box('SimitSerit', t, V(x - 1.85, 1.75, Z(10.38)), V(0.58, 0.09, 0.02), Col.white); setEuler(st, 0, 0, a + 45); }
          U.Box('Tekne', t, V(x + 1.85, 1.45, Z(10.42)), V(0.6, 0.12, 0.04), C(0.55, 0.38, 0.25));
          const sail = U.Box('Yelken', t, V(x + 1.85, 1.75, Z(10.41)), V(0.35, 0.35, 0.02), Col.white);
          setEuler(sail, 0, 0, 45);
          U.Box('Serit', t, V(x, 0.4, Z(10.43)), V(4.6, 0.12, 0.02), C(0.2, 0.4, 0.7));
          break;
        }
        case 2: { // Bohem
          U.Box('HaliYuvarlak', t, V(x, 0.045, Z(6.0)), V(2.3, 0.01, 2.0), C(0.85, 0.55, 0.25), 'Cylinder');
          U.Box('HaliIc', t, V(x, 0.05, Z(6.0)), V(1.4, 0.01, 1.2), C(0.95, 0.85, 0.6), 'Cylinder');
          for (const sx of [-1.85, 1.85]) {
            U.Box('Ip', t, V(x + sx, 2.35, Z(10.2)), V(0.02, 0.5, 0.02), C(0.6, 0.45, 0.3));
            U.Box('AsiliSaksi', t, V(x + sx, 2.05, Z(10.2)), V(0.28, 0.2, 0.28), C(0.85, 0.55, 0.35), 'Cylinder');
            U.Box('Sarmasik', t, V(x + sx, 2.2, Z(10.2)), V(0.45, 0.3, 0.45), C(0.3, 0.65, 0.3), 'Sphere');
            U.Box('Sarkan', t, V(x + sx + 0.12, 1.85, Z(10.2)), V(0.12, 0.4, 0.12), C(0.35, 0.7, 0.35), 'Sphere');
          }
          U.Box('Makrome', t, V(x - 1.3, 1.55, Z(10.43)), V(0.35, 0.55, 0.02), C(0.96, 0.9, 0.78));
          for (let k = 0; k < 4; k++) U.Box('Puskul', t, V(x - 1.42 + k * 0.08, 1.2, Z(10.43)), V(0.03, 0.18, 0.02), C(0.96, 0.9, 0.78));
          break;
        }
        case 3: { // Modern
          U.Flat('HaliGri', t, V(x, 0.045, Z(6.0)), V(2.8, 0.01, 1.7), C(0.22, 0.23, 0.26));
          U.Flat('HaliKenar', t, V(x, 0.05, Z(6.0)), V(2.4, 0.01, 1.3), C(0.35, 0.36, 0.4));
          U.Prim('Neon', t, V(x, 2.38, Z(10.42)), V(4.4, 0.05, 0.04), U.Glow(C(0.4, 0.8, 1), 3));
          for (const sx of [-1.85, 1.85]) {
            U.Box('Cerceve', t, V(x + sx, 1.7, Z(10.43)), V(0.6, 0.7, 0.02), C(0.1, 0.1, 0.12));
            U.Box('Blok', t, V(x + sx - 0.1, 1.8, Z(10.42)), V(0.25, 0.3, 0.02), sx < 0 ? C(0.95, 0.75, 0.2) : C(0.9, 0.35, 0.3));
            U.Box('Blok', t, V(x + sx + 0.12, 1.55, Z(10.415)), V(0.2, 0.25, 0.02), C(0.3, 0.55, 0.9));
          }
          break;
        }
        case 4: { // Romantik
          U.Box('HaliPembe', t, V(x, 0.045, Z(6.0)), V(2.4, 0.01, 2.0), C(0.95, 0.6, 0.7), 'Cylinder');
          const red = C(0.95, 0.25, 0.4);
          for (const sx of [-1.85, 1.85]) {
            U.Prim('Kalp', t, V(x + sx - 0.1, 1.85, Z(10.42)), V(0.24, 0.24, 0.05), U.Glow(red, 1.2), 'Sphere');
            U.Prim('Kalp', t, V(x + sx + 0.1, 1.85, Z(10.42)), V(0.24, 0.24, 0.05), U.Glow(red, 1.2), 'Sphere');
            const tip = U.Prim('KalpUc', t, V(x + sx, 1.72, Z(10.42)), V(0.24, 0.24, 0.05), U.Glow(red, 1.2));
            setEuler(tip, 0, 0, 45);
          }
          for (let k = 0; k < 12; k++)
            U.Prim('PeriIsigi', t, V(x - 2.2 + k * 0.4, 2.3 - Math.sin(k / 11 * Math.PI) * 0.25, Z(10.4)), V(0.07, 0.07, 0.07), U.Glow(C(1, 0.85, 0.6), 3), 'Sphere');
          for (let k = 0; k < 7; k++)
            U.Flat('GulYapragi', t, V(x + Random.Range(-1.1, 1.1), 0.06, Z(Random.Range(5.2, 6.8))), V(0.1, 0.01, 0.08), red);
          break;
        }
      }
      g.visible = false;
    }
  }

  ApplyTheme() {
    for (let th = 1; th < this.themeGroups.length; th++)
      if (this.themeGroups[th]) this.themeGroups[th].visible = this.theme === th && this.level > 0 && !this.IsSuitePart;
    for (let k = 1; k <= 3; k++) {
      const w = this.lv[k] ? findChild(this.lv[k], 'DuvarKagidi') : null;
      if (!w) continue;
      const c = this.theme > 0 ? Themes.Wall[this.theme] : this.wallOrig[k];
      w.material = U.Mat(c);
    }
  }

  SetTheme(t, fx) {
    this.theme = Mathf.Clamp(t, 0, Themes.Names.length - 1);
    this.themeOwned |= 1 << this.theme;
    this.ApplyTheme();
    if (fx) { U.Burst(V(this.x, 1.5, this.Z(7.5)), C(1, 0.6, 0.8), C(0.6, 0.85, 1), 50, 5); Sfx.Play('unlock', 0.7); }
  }

  // ---------------- Oda tipleri ----------------
  get LevelLabel() {
    return this.level <= 0 ? '' : this.IsSuitePart ? 'Süit salonu' : this.IsSuite ? 'Başkanlık Süiti' :
      Eco.LevelNames[this.level] + (this.kind > 0 ? ' · ' + RoomKinds.Short[this.kind] : '');
  }

  SetKind(k, fx) {
    this.kind = Mathf.Clamp(k, 0, RoomKinds.Suit);
    this.ApplyKind();
    if (this.levelText) this.levelText.text = this.LevelLabel;
    if (fx) { U.Burst(V(this.x, 1.5, this.Z(7.5)), C(1, 0.85, 0.4), C(0.6, 0.85, 1), 50, 5); Sfx.Play('unlock', 0.7); }
  }

  ApplyKind() {
    if (this.kindGroup) Destroy(this.kindGroup);
    this.kindGroup = null;
    if (this.level <= 0 || this.IsSuitePart || this.kind === RoomKinds.Klasik) return;
    this.kindGroup = U.Pivot(this.go, V(), 'OdaTipi');
    const t = this.kindGroup, x = this.x, Z = z => this.Z(z), top = this.bedTop;
    switch (this.kind) {
      case RoomKinds.Ekonomik:
        // duvarda sırt çantası askısı
        U.Box('Aski', t, V(x - 2.3, 1.85, Z(8.5)), V(0.05, 0.1, 1.3), C(0.55, 0.4, 0.28));
        U.Box('Canta', t, V(x - 2.17, 1.45, Z(8.1)), V(0.22, 0.55, 0.42), C(0.95, 0.55, 0.2));
        U.Box('Canta', t, V(x - 2.17, 1.5, Z(8.9)), V(0.22, 0.48, 0.38), C(0.3, 0.6, 0.85));
        U.Box('Harita', t, V(x + 2.32, 1.6, Z(8.6)), V(0.03, 0.55, 0.85), C(0.95, 0.9, 0.7));
        U.Box('HaritaYol', t, V(x + 2.3, 1.6, Z(8.6)), V(0.02, 0.05, 0.7), C(0.85, 0.3, 0.3));
        break;
      case RoomKinds.Aile: {
        this.Balloons(t, [C(1, 0.85, 0.25), C(0.35, 0.65, 1), C(0.45, 0.85, 0.45)]);
        const brown = C(0.65, 0.45, 0.28);
        U.Box('Ayi', t, V(x + 0.45, top + 0.2, Z(9.25)), V(0.34, 0.36, 0.28), brown, 'Sphere');
        U.Box('AyiBas', t, V(x + 0.45, top + 0.47, Z(9.3)), V(0.25, 0.25, 0.25), brown, 'Sphere');
        U.Box('AyiKulak', t, V(x + 0.35, top + 0.58, Z(9.3)), V(0.09, 0.09, 0.09), brown, 'Sphere');
        U.Box('AyiKulak', t, V(x + 0.55, top + 0.58, Z(9.3)), V(0.09, 0.09, 0.09), brown, 'Sphere');
        U.Box('Kup', t, V(x - 0.5, top + 0.08, Z(8.0)), V(0.16, 0.16, 0.16), C(0.95, 0.35, 0.35));
        U.Box('Kup', t, V(x - 0.3, top + 0.08, Z(7.9)), V(0.16, 0.16, 0.16), C(0.35, 0.6, 0.95));
        break;
      }
      case RoomKinds.Balayi: {
        this.Balloons(t, [C(1, 0.25, 0.4), C(1, 0.6, 0.75), C(1, 0.25, 0.4)]);
        const red = C(0.9, 0.15, 0.3);
        U.Box('Kalp', t, V(x - 0.1, top + 0.05, Z(8.2)), V(0.28, 0.04, 0.28), red, 'Sphere');
        U.Box('Kalp', t, V(x + 0.1, top + 0.05, Z(8.2)), V(0.28, 0.04, 0.28), red, 'Sphere');
        const tip = U.Box('KalpUc', t, V(x, top + 0.05, Z(8.05)), V(0.22, 0.04, 0.22), red);
        setEuler(tip, 0, 45, 0);
        for (let k = 0; k < 9; k++)
          U.Flat('GulYapragi', t, V(x + Random.Range(-0.7, 0.7), top + 0.03, Z(Random.Range(7.6, 9.2))), V(0.1, 0.01, 0.08), C(0.95, 0.25, 0.4));
        break;
      }
      case RoomKinds.Is:
        U.Box('Canta', t, V(x + 0.8, 0.22, Z(7.05)), V(0.55, 0.42, 0.16), C(0.35, 0.22, 0.12));
        U.Box('CantaSap', t, V(x + 0.8, 0.47, Z(7.05)), V(0.2, 0.06, 0.04), C(0.2, 0.15, 0.1));
        U.Box('Laptop', t, V(x - 0.2, top + 0.03, Z(8.0)), V(0.5, 0.03, 0.35), C(0.25, 0.26, 0.3));
        U.Prim('Ekran', t, V(x - 0.2, top + 0.2, Z(8.18)), V(0.5, 0.32, 0.03), U.Glow(C(0.45, 0.7, 1), 0.9));
        U.Box('Tahta', t, V(x + 2.32, 1.65, Z(8.6)), V(0.03, 0.6, 1.0), Col.white);
        for (let k = 0; k < 3; k++) U.Box('Cizgi', t, V(x + 2.3, 1.78 - k * 0.12, Z(8.5)), V(0.02, 0.03, 0.6 - k * 0.12), C(0.3, 0.45, 0.85));
        break;
      case RoomKinds.Suit: {
        const gold = C(0.95, 0.78, 0.3);
        U.Flat('KirmiziHali', t, V(x, 0.05, Z(4.5)), V(1.1, 0.01, 0.9), C(0.75, 0.12, 0.15));
        U.Text(t, V(x + 2.5, 2.42, Z(10.3)), 'BAŞKANLIK SÜİTİ', 0.06, gold);
        break;
      }
    }
    U.NoShadow(this.kindGroup);
  }

  Balloons(t, cs) {
    for (let i = 0; i < cs.length; i++) {
      const p = V(this.x - 1.3 + i * 0.3, 2.2 + (i % 2) * 0.22, this.Z(7.15 + i * 0.08));
      U.Box('Balon', t, p, V(0.36, 0.44, 0.36), cs[i], 'Sphere');
      U.Box('Ip', t, Vec.add(p, V(0.05, -0.62, 0)), V(0.012, 0.8, 0.012), Col.white);
    }
  }

  // ---------------- Başkanlık Süiti ----------------
  MakeSuite(part, fx) {
    this.suitePart = part;
    part.suiteMain = this;
    this.kind = RoomKinds.Suit;
    part.kind = RoomKinds.Klasik;
    part.BuildLounge();
    part.ApplyLevel(3, false);
    part.guest = null;
    this.ApplyLevel(3, false);
    if (fx) { U.Burst(V(this.x + 2.5, 2, this.Z(7.5)), C(1, 0.85, 0.3), C(1, 0.5, 0.7), 160, 8); Sfx.Play('unlock'); }
  }

  BuildLounge() {
    if (this.lounge) return;
    this.lounge = U.Pivot(this.go, V(), 'SuitSalon');
    const t = this.lounge, x = this.x, Z = z => this.Z(z), S = Room.S;
    this.loungeObs = [];
    const gold = C(0.95, 0.78, 0.3);
    U.Prim('Zemin', t, V(x, -0.04, Z(7.25)), V(4.8, 0.1, 6.5), U.Mat(C(0.97, 0.95, 0.93), U.TileTex, { x: 2.4, y: 3.2 }, 0.85, 0));
    U.Box('DuvarKagidi', t, V(x, 1.25, Z(10.47)), V(4.6, 2.4, 0.02), C(0.55, 0.16, 0.24));
    for (let k = -2; k <= 2; k++) U.Box('AltinCizgi', t, V(x + k * 0.9, 1.25, Z(10.45)), V(0.04, 2.4, 0.02), gold);
    this.Window(t);
    this.Curtains(t, C(0.85, 0.65, 0.25));
    U.Flat('HaliKenar', t, V(x, 0.03, Z(7.4)), V(3.6, 0.02, 2.8), gold);
    U.Prim('Hali', t, V(x, 0.035, Z(7.4)), V(3.4, 0.02, 2.6), U.Mat(C(0.2, 0.24, 0.42), U.CarpetTex, { x: 2, y: 1.5 }, 0.05, 0));
    const R = b => this.loungeObs.push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));
    const sofa = U.Furn('loungeDesignSofa', t, V(x, 0, Z(9.4)), 180, S, V(2.4, 0.9, 0.9), C(0.75, 0.2, 0.3)); R(sofa);
    const table = U.Furn('tableCoffeeGlass', t, V(x, 0, Z(7.7)), 0, S, V(1.2, 0.4, 0.7), C(0.8, 0.9, 1)); R(table);
    U.Box('Meyve', t, V(x, table.max.y + 0.08, Z(7.7)), V(0.4, 0.12, 0.4), C(0.95, 0.6, 0.2), 'Sphere');
    // Kuyruklu piyano
    const black = C(0.08, 0.08, 0.1);
    U.Box('Piyano', t, V(x - 1.55, 0.75, Z(5.6)), V(1.1, 0.35, 1.5), black);
    U.Box('PiyanoAyak', t, V(x - 1.55, 0.3, Z(5.6)), V(0.9, 0.6, 1.2), black);
    U.Box('Tuslar', t, V(x - 1.0, 0.85, Z(5.6)), V(0.12, 0.03, 1.2), Col.white);
    setEuler(U.Box('PiyanoKapak', t, V(x - 1.7, 1.25, Z(5.7)), V(0.9, 0.04, 1.3), black), 0, 0, 35);
    this.loungeObs.push(Rect.MinMaxRect(x - 2.15, Z(4.8), x - 0.9, Z(6.4)));
    const bar = U.Furn('kitchenBar', t, V(x + 1.95, 0, Z(6.6)), -90, S, V(0.6, 1, 1.4), C(0.45, 0.3, 0.2)); R(bar);
    const bc = [C(0.2, 0.5, 0.25), C(0.6, 0.15, 0.2), C(0.85, 0.7, 0.3)];
    for (let k = 0; k < 3; k++) U.Box('Sise', t, V(x + 1.95, bar.max.y + 0.15, Z(6.2 + k * 0.35)), V(0.09, 0.3, 0.09), bc[k], 'Cylinder');
    const pl = U.Furn('pottedPlant', t, V(x + 2.0, 0, Z(9.7)), 0, 2.4, V(0.5, 1.4, 0.5), C(0.3, 0.65, 0.35)); R(pl);
    // Avize
    U.Box('AvizeZincir', t, V(x, 2.75, Z(7.4)), V(0.03, 0.5, 0.03), gold);
    U.Box('AvizeHalka', t, V(x, 2.45, Z(7.4)), V(1.0, 0.03, 1.0), gold, 'Cylinder');
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      U.Prim('AvizeIsik', t, V(x + Math.cos(a) * 0.48, 2.52, Z(7.4) + Math.sin(a) * 0.48), V(0.12, 0.12, 0.12), U.Glow(C(1, 0.9, 0.65), 3), 'Sphere');
    }
    U.Text(t, V(x, 2.15, Z(10.3)), '★★★★★', 0.07, gold);
    this.lounge.visible = false;
  }

  Blocked(p, r) {
    for (const o of this.activeObs)
      if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
    return false;
  }

  // ---------------- Misafir istekleri ----------------
  StartRequest(list) {
    const l = list && list.length > 0 ? list : Room.Requests;
    this.request = l[Random.RangeInt(0, l.length)];
    this.reqT = 0;
    this.reqText.set(this.request);
    this.reqBubble.visible = true;
    GameManager.I.Pop(this.reqBubble);
    this.reqPad.Show(true);
    this.reqPad.Set(0);
    Sfx.Play('pop', 0.5);
  }

  ReqTick(amount) {
    if (!this.HasRequest) return;
    this.reqT += amount;
    this.reqPad.Set(this.reqT);
    if (this.reqT >= 1) this.FulfillRequest();
  }

  FulfillRequest() {
    this.HideRequest();
    const bonus = Math.max(5, Mathf.RoundToInt(this.Price * 0.3));
    this.tips.Add(bonus);
    Quests.Track('requests');
    if (this.guest) this.guest.OnRequestDone();
    U.Burst(V(this.x, 1.8, this.Z(7.6)), C(1, 0.8, 0.3), C(1, 0.5, 0.7), 25, 3);
    Sfx.Play('coin');
    GameManager.I.FloatText(V(this.x, 2.4, this.Z(7.2)), 'Teşekkürler!', C(1, 0.85, 0.5), 0.08);
  }

  CancelRequest() { this.HideRequest(); }

  HideRequest() {
    this.reqClaimed = false;
    this.request = null;
    this.reqT = 0;
    this.reqBubble.visible = false;
    this.reqPad.Show(false);
  }

  Update() {
    const gm = GameManager.I;
    if (this.HasRequest) {
      if (gm.PlayerNear(this.CleanSpot, 0.95)) this.ReqTick(Time.deltaTime / 0.8);
      this.reqBubble.position.set(this.x, 3.1 + Math.sin(Time.time * 3) * 0.08, this.Z(7.6));
    }
    if (this.state !== Room.State.Dirty) {
      if (activeSelf(this.needText.gameObject)) SetActive(this.needText.gameObject, false);
      return;
    }
    const p = gm.NearestPlayer(this.CleanSpot, 0.95);
    if (p != null && !this.hasLinen) {
      if (p.linen > 0) { p.linen--; this.hasLinen = true; Sfx.Play('tick', 0.4); }
      else p.NoLinenHint(this.CleanSpot);
    }
    if (activeSelf(this.needText.gameObject) === this.hasLinen) SetActive(this.needText.gameObject, !this.hasLinen);
    const near = p != null && this.hasLinen;
    if (near) this.cleanT += Time.deltaTime / 1.2 * Eco.CleanMul * RoomKinds.CleanMul(this.kind);
    if (near && this.cleanT >= 1) Quests.Track('cleaned');
    else if (!this.claimed && !near) this.cleanT = Math.max(0, this.cleanT - Time.deltaTime * 0.5);
    this.pad.Set(this.cleanT);
    if (this.cleanT >= 1) {
      if (!near) Quests.Track('cleaned');
      this.SetClean();
    }
  }

  CleanTick(amount) { if (this.hasLinen) this.cleanT += amount * RoomKinds.CleanMul(this.kind); }

  SetOccupied(on) { this.blanket.visible = on; }

  SetDirty() {
    this.guest = null;
    this.HideRequest();
    this.state = Room.State.Dirty;
    this.cleanT = 0;
    this.hasLinen = false;
    this.blanket.visible = false;
    this.messy.visible = true;
    this.trash.visible = true;
    this.pad.Show(true);
    this.pad.Set(0);
  }

  SetClean() {
    this.state = Room.State.Clean;
    this.claimed = false;
    this.cleanT = 0;
    if (this.hasLinen && Laundry.I) Laundry.I.AddDirty(1);
    this.hasLinen = false;
    if (this.needText) SetActive(this.needText.gameObject, false);
    this.messy.visible = false;
    this.trash.visible = false;
    this.pad.Show(false);
    U.Burst(Vec.add(this.CleanSpot, V(0, 0.6, 0)), C(0.7, 0.95, 1), Col.white, 30, 4);
    Sfx.Play('clean');
    GameManager.I.FloatText(Vec.add(this.CleanSpot, V(0, 1.8, 0)), 'Tertemiz!', C(0.5, 1, 0.75));
  }
}

// İstek balonu: beyaz konuşma balonu içinde yazı (kameraya dönük tek sprite)
class BubbleText {
  constructor(parent) {
    this.mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false });
    this.obj = new THREE.Sprite(this.mat); this.obj.renderOrder = 11; this.obj.userData.ownMat = true;
    parent.add(this.obj);
    this.text = '';
  }
  set(s) {
    this.text = s;
    const px = 56, font = `bold ${px}px ${UI_FONT}`;
    _measure.font = font;
    const tw = _measure.measureText(s).width;
    const w = Math.max(260, Math.ceil(tw + 70)), h = 104, tail = 26;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h + tail;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    const r = 26; g.beginPath(); g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 20, h - 2); g.lineTo(w / 2, h + tail); g.lineTo(w / 2 + 20, h - 2); g.closePath(); g.fill();
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgb(64,51,89)';
    g.fillText(s, w / 2, h / 2 + 3);
    if (this.mat.map) this.mat.map.dispose();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; this.mat.map = t; this.mat.needsUpdate = true;
    this.obj.userData.textTex = t;
    // Unity: balon 2.6 genişlik, 0.6 yükseklik
    const k = 2.6 / 260 * (w / 260 > 1 ? 1 : 1);
    this.obj.scale.set(w * k * 0.95, (h + tail) * k * 0.95, 1);
  }
}
