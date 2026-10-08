// Otel: katlı modüler bina, odalar, lobi, asansör, yürünebilir alanlar ve yol bulma.
// Koordinat: otel merkezi (0,0), x doğu, z güney (giriş güneyde). Zemin kat 0, oda katları 1..N, çatı N+1.
const Hotel = {
  W: 26, D: 14, H: Data.Floor.H,
  RoomX: [-10, -6, -2, 2, 6],           // oda merkezleri (x); kuzey yakası slot 0-4, güney yakası 5-9
  floors: 1,                             // sahip olunan oda katı sayısı (0 = sadece zemin)
  groups: [], rooms: new Map(), walls: [], roof: null, view: 0, lobby: null, liftDoors: [],
  Lobby: { desk: V(0, 0, -3.6), deskBack: V(0, 0, -4.9), deskFront: V(0, 0, -2.1), lounge: V(-8, 0, 2.5) },
  Entrance: V(0, 0, 7.4), Street: V(0, 0, 9.6), SpawnW: V(-34, 0, 9.6), SpawnE: V(34, 0, 9.6),

  FloorY(f) { return f * this.H; },
  get RoofIndex() { return this.floors + 1; },
  Lift(f) { return V(10.6, this.FloorY(f), 0); },
  InLift(p) { return p.x > 8.6 && p.x < 12.6 && Math.abs(p.z) < 1.6; },
  RoomId(f, slot) { return f * 10 + slot; },
  Room(id) { return this.rooms.get(id); },
  QueueSlot(i) { return V(this.Lobby.deskFront.x + (i % 2 ? 0.5 : -0.5) * (i > 0 ? 1 : 0), 0, this.Lobby.deskFront.z + i * 1.15); },

  // ---------------- İnşa ----------------
  Build(state) {
    for (const g of this.groups) Destroy(g); this.groups = []; this.rooms.clear(); this.walls = []; this.liftDoors = [];
    if (this.roof) Destroy(this.roof); if (this.lobby) Destroy(this.lobby);
    this.floors = state.floors;
    for (let f = 0; f <= this.floors; f++) this.BuildFloorGroup(f, state);
    this.BuildRoof(state);
    this.SetView(Math.min(this.view, this.RoofIndex));
  },
  // Yeni kat: mevcut katlar ve odaların durumu korunur, sadece yeni kat ve çatı kurulur
  AddFloor(state) {
    if (this.roof) Destroy(this.roof);
    this.floors = state.floors;
    this.BuildFloorGroup(this.floors, state);
    this.BuildRoof(state);
  },
  BuildFloorGroup(f, state) {
    const H = this.H, Wd = this.W, D = this.D;
    const wallC = C(0.98, 0.95, 0.9), trimC = C(0.93, 0.6, 0.55), winC = C(0.55, 0.75, 0.95);
    {
      const g = U.Pivot(W, V(0, this.FloorY(f), 0), 'Kat' + f); this.groups.push(g);
      // döşeme
      const slab = U.Prim('Doseme', g, V(0, -0.15, 0), V(Wd, 0.3, D), U.Mat(C(0.9, 0.88, 0.84)));
      if (f === 0) { U.Prim('Zemin', g, V(0, 0.01, 0), V(Wd - 0.5, 0.02, D - 0.5), U.Mat(C(0.93, 0.87, 0.78), { tex: U.TileTex, tiling: { x: 13, y: 7 } })).castShadow = false; }
      else U.Prim('Koridor', g, V(-1.7, 0.01, 0), V(Wd - 4.4, 0.02, 3), U.Mat(C(0.78, 0.7, 0.62), { tex: U.CarpetTex, tiling: { x: 8, y: 1 } })).castShadow = false;
      // dış duvarlar (kameraya bakan gizlenir)
      const t = 0.25;
      const mk = (name, pos, sc, n) => { const m = U.Prim(name, g, pos, sc, U.Mat(wallC, 0.1)); this.walls.push({ mesh: m, n, floor: f }); return m; };
      mk('DuvarK', V(0, H / 2, -D / 2 + t / 2), V(Wd, H, t), V(0, 0, -1));
      mk('DuvarG', V(0, H / 2, D / 2 - t / 2), V(Wd, H, t), V(0, 0, 1));
      mk('DuvarD', V(Wd / 2 - t / 2, H / 2, 0), V(t, H, D), V(1, 0, 0));
      mk('DuvarB', V(-Wd / 2 + t / 2, H / 2, 0), V(t, H, D), V(-1, 0, 0));
      // dış cephe: pencereler ve kat bandı (merge)
      const parts = [];
      for (const side of [-1, 1]) {
        const z = side * (D / 2 + 0.02);
        if (f === 0) { for (const x of [-9, -5, 5, 9]) { parts.push({ geo: 'Cube', pos: V(x, 1.7, z + side * 0.04), scale: V(2.4, 1.9, 0.1), c: winC }, { geo: 'Cube', pos: V(x, 1.7, z - side * 0.02), scale: V(2.55, 2.05, 0.06), c: C(1, 1, 1) }); parts.push({ geo: 'Cube', pos: V(x, 0.62, z + side * 0.2), scale: V(2.0, 0.24, 0.36), c: C(0.6, 0.42, 0.3) }); for (const dx of [-0.7, -0.35, 0, 0.35, 0.7]) parts.push({ geo: 'Sphere', pos: V(x + dx, 0.84, z + side * 0.2), scale: V(0.26, 0.22, 0.26), c: [C(0.98, 0.45, 0.6), C(0.75, 0.55, 0.95), C(1, 0.85, 0.3)][Math.abs(dx * 10 | 0) % 3] }); } }
        else for (const x of this.RoomX) {
          // pencere, balkon ve çiçeklik
          parts.push({ geo: 'Cube', pos: V(x, 1.8, z + side * 0.04), scale: V(1.6, 1.4, 0.1), c: winC }, { geo: 'Cube', pos: V(x, 1.8, z - side * 0.02), scale: V(1.75, 1.55, 0.06), c: C(1, 1, 1) });
          parts.push({ geo: 'Cube', pos: V(x, 0.06, z + side * 0.5), scale: V(2.3, 0.12, 1.0), c: C(0.97, 0.94, 0.9) });
          for (const dx of [-1.1, -0.55, 0, 0.55, 1.1]) parts.push({ geo: 'Cube', pos: V(x + dx, 0.5, z + side * 0.95), scale: V(0.06, 0.9, 0.06), c: trimC });
          parts.push({ geo: 'Cube', pos: V(x, 0.95, z + side * 0.95), scale: V(2.3, 0.07, 0.07), c: trimC });
          for (const sz of [-1, 1]) for (const dz of [0.25, 0.5, 0.75]) parts.push({ geo: 'Cube', pos: V(x + sz * 1.12, 0.5, z + side * dz), scale: V(0.06, 0.9, 0.06), c: trimC }, { geo: 'Cube', pos: V(x + sz * 1.12, 0.95, z + side * 0.5), scale: V(0.07, 0.07, 1.0), c: trimC });
          parts.push({ geo: 'Cube', pos: V(x, 1.0, z + side * 0.92), scale: V(1.2, 0.22, 0.26), c: C(0.6, 0.42, 0.3) });
          for (const dx of [-0.4, -0.13, 0.13, 0.4]) parts.push({ geo: 'Sphere', pos: V(x + dx, 1.2, z + side * 0.92), scale: V(0.22, 0.2, 0.22), c: [C(0.98, 0.45, 0.6), C(0.75, 0.55, 0.95), C(1, 0.85, 0.3), C(0.98, 0.6, 0.7)][(dx * 10 + 5 | 0) % 4] });
        }
        parts.push({ geo: 'Cube', pos: V(0, H - 0.1, z + side * 0.06), scale: V(Wd + 0.2, 0.22, 0.14), c: trimC });
      }
      for (const side of [-1, 1]) { const x = side * (Wd / 2 + 0.02); for (const z of [-4, 0, 4]) parts.push({ geo: 'Cube', pos: V(x, 1.8, z), scale: V(0.1, 1.4, 1.6), c: winC }); parts.push({ geo: 'Cube', pos: V(x + side * 0.06, H - 0.1, 0), scale: V(0.14, 0.22, D + 0.2), c: trimC }); }
      if (f === 0) { // giriş: kapı boşluğu yerine saçak ve kapı
        parts.push({ geo: 'Cube', pos: V(0, 2.9, D / 2 + 1.1), scale: V(5, 0.18, 2.4), c: trimC }, { geo: 'Cube', pos: V(-2.2, 1.45, D / 2 + 2.1), scale: V(0.16, 2.9, 0.16), c: trimC }, { geo: 'Cube', pos: V(2.2, 1.45, D / 2 + 2.1), scale: V(0.16, 2.9, 0.16), c: trimC });
        parts.push({ geo: 'Cube', pos: V(0, 1.25, D / 2 + 0.01), scale: V(2.6, 2.5, 0.1), c: C(0.5, 0.78, 0.98, 0.7) });
      }
      const fac = U.Merge('Cephe' + f, g, parts); fac.castShadow = false;
      // asansör çekirdeği (doğu ucu)
      const core = U.Pivot(g, V(10.6, 0, 0), 'Asansor');
      U.Box('Kabin', core, V(0, H / 2, -1.7), V(2.6, H, 0.2), C(0.85, 0.85, 0.88));
      const kapi = U.Box('Kapi', core, V(0, 1.2, -1.58), V(1.6, 2.4, 0.08), C(0.65, 0.7, 0.78, 1)); this.liftDoors[f] = kapi; kapi.userData.open = 0;
      U.Box('Cerceve', core, V(0, 2.55, -1.56), V(2.2, 0.3, 0.1), C(0.95, 0.75, 0.3));
      const glow = U.Prim('Isik', core, V(0, 2.55, -1.5), V(0.5, 0.12, 0.04), U.Mat(C(1, 0.9, 0.5)));
      World.AddFixture(glow, C(1, 0.9, 0.5), 0);
      // merdiven görüntüsü
      U.Box('Merdiven', core, V(0, 0.3, 1.0), V(2.4, 0.6, 1.4), C(0.75, 0.7, 0.66));
      if (f === 0) this.BuildLobby(g); else this.BuildFloor(g, f, state);
    }
  },

  BuildLobby(g) {
    const L = this.Lobby;
    // resepsiyon bankosu
    const desk = U.Pivot(g, L.desk, 'Resepsiyon');
    U.Box('Banko', desk, V(0, 0.55, 0), V(4.2, 1.1, 0.9), C(0.98, 0.98, 0.98));
    U.Box('BankoAlt', desk, V(0, 0.22, 0.1), V(4.2, 0.44, 0.9), C(0.62, 0.42, 0.26));
    U.Box('BankoUst', desk, V(0, 1.12, 0), V(4.4, 0.06, 1.0), C(0.85, 0.6, 0.35));
    U.Model('computerScreen', desk, V(0.9, 1.15, 0), 180, 1); U.Model('computerKeyboard', desk, V(0.9, 1.15, 0.25), 180, 1);
    U.Box('Zil', desk, V(-1.2, 1.22, 0.1), V(0.22, 0.16, 0.22), C(1, 0.82, 0.3), 'Sphere');
    U.Text(desk, V(0, 2.3, 0), 'RESEPSİYON', 0.07, C(0.3, 0.2, 0.5), true, true);
    // arka duvar: lavanta renkli vurgu duvarı, anahtar rafı, tablolar
    U.Flat('VurguDuvar', g, V(0, this.H / 2, -this.D / 2 + 0.28), V(11, this.H - 0.1, 0.06), C(0.74, 0.62, 0.88));
    U.Box('Raf', g, V(0, 1.9, -6.55), V(3.6, 0.9, 0.22), C(0.62, 0.42, 0.26));
    for (const x of [-3.6, 3.6]) { U.Box('Tablo', g, V(x, 2.0, -6.6), V(1.3, 1.0, 0.06), C(0.98, 0.9, 0.5)); U.Box('TabloCerceve', g, V(x, 2.0, -6.64), V(1.45, 1.15, 0.04), C(0.5, 0.35, 0.25)); }
    // giriş yolluğu
    U.Flat('Yolluk', g, V(0, 0.025, 1.2), V(2.6, 0.02, 8.6), C(0.62, 0.52, 0.82));
    U.Flat('YollukKenar', g, V(0, 0.02, 1.2), V(2.9, 0.02, 8.9), C(0.95, 0.8, 0.4));
    // bekleme köşesi (batı)
    Decor.FurnishLobby(g);
    U.Model('plantSmall2', g, V(-11.6, 0, 5.6), 0, 1); U.Model('pottedPlant', g, V(-11.6, 0, -5.6), 0, 1); U.Model('pottedPlant', g, V(5.6, 0, -5.8), 0, 1);
    // kafe köşesi (doğu, ileride tesis)
    U.Model('kitchenBar', g, V(5.5, 0, 3.2), 90, 1); U.Model('kitchenBarEnd', g, V(5.5, 0, 5.0), 90, 1); U.Model('kitchenCoffeeMachine', g, V(5.5, 1.0, 3.2), 90, 1);
    U.Model('tableRound', g, V(2.5, 0, 4.6), 0, 1); U.Model('chairRounded', g, V(1.6, 0, 4.6), 90, 1); U.Model('chairRounded', g, V(3.4, 0, 4.6), 270, 1);
    // avize ve lambalar
    for (const x of [-6, 0, 6]) { const l = U.Prim('Lamba', g, V(x, this.H - 0.35, 0), V(0.9, 0.25, 0.9), U.Mat(C(1, 0.95, 0.8)), 'Cylinder'); World.AddFixture(l, C(1, 0.9, 0.6), 2.2); World.AddLamp(V(x, 2.6, 0), 9, 1.4, C(1, 0.9, 0.7)); }
    U.Box('Zincir', g, V(0, this.H - 0.1, 0), V(0.05, 0.3, 0.05), C(0.8, 0.7, 0.3));
    // giriş paspası
    U.Flat('Paspas', g, V(0, 0.03, 5.9), V(2.4, 0.02, 1.4), C(0.75, 0.3, 0.35));
    Facilities.BuildLobby(g);
    this.lobby = g;
  },

  BuildFloor(g, f, state) {
    const H = this.H;
    for (let s = 0; s < 10; s++) {
      const side = s < 5 ? -1 : 1, x = this.RoomX[s % 5], zc = side * 4.25;
      const id = this.RoomId(f, s), rs = state.rooms[id], level = rs == null ? -1 : typeof rs === 'object' ? rs.lv : rs;
      const r = { id, floor: f, slot: s, side, x, z: zc, level, state: level < 0 ? 'locked' : 'clean', guest: null, request: null, dirt: 0, go: null, door: V(x, this.FloorY(f), side * 1.9), inside: V(x + 0.9, this.FloorY(f), side * 3.6), bed: V(x - 0.8, this.FloorY(f), side * 5.1), number: (f * 100) + (s + 1), group: null };
      this.rooms.set(id, r);
      const rg = U.Pivot(g, V(x, 0, zc), 'Oda' + id); r.group = rg;
      // bölme duvarları (odalar arası) ve koridor duvarı (kapı boşluklu)
      const pc = C(0.97, 0.94, 0.9);
      const rw = o => { o.userData.roomWall = true; return o; };
      if (s % 5 > 0) rw(U.Box('Bolme', rg, V(-2, H / 2, 0), V(0.15, H, 5.5), pc));
      if (s % 5 === 4) rw(U.Box('BolmeD', rg, V(2, H / 2, 0), V(0.15, H, 5.5), pc));
      rw(U.Box('KoridorDuvar1', rg, V(-1.2, H / 2, -side * 2.75), V(1.6, H, 0.15), pc));
      rw(U.Box('KoridorDuvar2', rg, V(1.35, H / 2, -side * 2.75), V(1.3, H, 0.15), pc));
      rw(U.Box('KapiUst', rg, V(0.15, H - 0.4, -side * 2.75), V(1.1, 0.8, 0.15), pc));
      if (level < 0) {
        U.Prim('Beton', rg, V(0, 0.005, 0), V(3.85, 0.01, 5.4), U.Mat(C(0.74, 0.72, 0.7))).castShadow = false;
        U.Model('cardboardBoxClosed', rg, V(-1, 0, 1.2), 20, 1); U.Model('cardboardBoxClosed', rg, V(0.8, 0, -0.6), -15, 1);
      } else this.Furnish(r);
    }
  },

  // Oda seviyesine göre döşeme ve mobilya
  Furnish(r) { Decor.Furnish(r); },

  BuildRoof(state) {
    const y = this.FloorY(this.floors + 1), g = U.Pivot(W, V(0, y, 0), 'Cati'); this.roof = g;
    U.Prim('CatiDoseme', g, V(0, -0.15, 0), V(this.W, 0.3, this.D), U.Mat(C(0.9, 0.88, 0.84)));
    U.Prim('CatiZemin', g, V(0, 0.01, 0), V(this.W - 0.4, 0.02, this.D - 0.4), U.Mat(C(0.82, 0.78, 0.72), { tex: U.TileTex, tiling: { x: 10, y: 5 } })).castShadow = false;
    const pc = C(0.98, 0.95, 0.9);
    for (const [p, s] of [[V(0, 0.5, -this.D / 2 + 0.12), V(this.W, 1, 0.25)], [V(0, 0.5, this.D / 2 - 0.12), V(this.W, 1, 0.25)], [V(this.W / 2 - 0.12, 0.5, 0), V(0.25, 1, this.D)], [V(-this.W / 2 + 0.12, 0.5, 0), V(0.25, 1, this.D)]]) U.Box('Parapet', g, p, s, pc);
    // asansör makine dairesi, su deposu, klimalar
    U.Box('Makine', g, V(10.6, 1.6, -0.3), V(3, 3.2, 3.4), C(0.9, 0.86, 0.8));
    U.Box('Depo', g, V(-9, 1.4, -4), V(2.2, 2.4, 2.2), C(0.7, 0.75, 0.8), 'Cylinder');
    for (const x of [-3, 0, 3]) U.Box('Klima', g, V(x, 0.45, -5), V(1.2, 0.9, 1), C(0.8, 0.82, 0.86));
    // tabela
    const sign = U.Pivot(g, V(0, 0, this.D / 2 - 1), 'Tabela');
    U.Box('TabelaArka', sign, V(0, 1.9, 0), V(9, 1.6, 0.25), C(0.2, 0.25, 0.5));
    U.Box('Ayak1', sign, V(-3.5, 0.6, 0), V(0.15, 1.2, 0.15), C(0.4, 0.4, 0.45)); U.Box('Ayak2', sign, V(3.5, 0.6, 0), V(0.15, 1.2, 0.15), C(0.4, 0.4, 0.45));
    const txt = U.Text(sign, V(0, 1.9, 0.14), (state.name || 'OTEL').toLocaleUpperCase('tr-TR'), 0.095, C(1, 0.85, 0.35), true).makeFlat(true, 0); this.signText = txt;
    for (const x of [-3.8, 3.8]) { const l = U.Prim('TabelaIsik', sign, V(x, 2.6, 0.2), V(0.3, 0.3, 0.3), U.Mat(C(1, 0.9, 0.5)), 'Sphere'); World.AddFixture(l, C(1, 0.85, 0.4), 1.5); }
    World.AddLamp(V(0, y + 2.2, this.D / 2 - 0.5), 8, 1, C(1, 0.9, 0.6));
    // çiçekli saksılar
    for (const x of [-6, -2, 2, 6]) U.Model('plantSmall2', g, V(x, 0, 5.2), 0, 1.1);
    Facilities.BuildRoof(g);
  },

  SetName(n) { if (this.signText) this.signText.text = (n || 'OTEL').toLocaleUpperCase('tr-TR'); },

  // ---------------- Asansör kapıları ----------------
  LiftDoor(f, open) { const d = this.liftDoors[f]; if (d) d.userData.open = open ? 1 : 0; },
  TickDoors(dt) {
    for (const d of this.liftDoors) {
      if (!d) continue; const want = d.userData.open ? 1 : 0, cur = d.userData.k || 0;
      if (Math.abs(want - cur) < 0.01) continue;
      const k = cur + (want - cur) * Math.min(1, dt * 7); d.userData.k = k;
      d.scale.x = 1.6 * (1 - k * 0.92) || 0.01; d.position.x = -0.8 * k; // sola kayarak açılır
    }
  },

  // ---------------- Görünüm (kat kesiti) ----------------
  SetView(f) {
    this.view = Mathf.Clamp(f, 0, this.RoofIndex); Cam.floor = this.view;
    for (let i = 0; i < this.groups.length; i++) this.groups[i].visible = i <= this.view;
    if (this.roof) this.roof.visible = this.view >= this.RoofIndex;
    Game.OnViewChanged && Game.OnViewChanged();
  },
  FrameView() {
    // seçili katta kameraya bakan dış duvarlar gizlenir; alt katlar bütün kalır
    const f = Cam.Forward;
    for (const w of this.walls) {
      const hide = w.floor === this.view && (w.n.x * f.x + w.n.z * f.z) < -0.25;
      w.mesh.visible = !hide;
    }
  },

  // ---------------- Yürünebilirlik ve yol ----------------
  RoomAt(p, f) {
    if (f < 1 || f > this.floors || Math.abs(p.z) < 1.6) return null;
    const side = p.z < 0 ? -1 : 1; let best = null, bd = 99;
    for (let i = 0; i < 5; i++) { const d = Math.abs(p.x - this.RoomX[i]); if (d < bd) { bd = d; best = i; } }
    if (bd > 2.0) return null;
    return this.rooms.get(this.RoomId(f, side < 0 ? best : best + 5)) || null;
  },
  Walkable(p, f) {
    const Wd = this.W / 2 - 0.5, Dd = this.D / 2 - 0.5;
    if (f === 0) {
      if (p.z > this.D / 2 + 0.3) return Math.abs(p.x) < 40 && p.z < 17.5 && !(Math.abs(p.x) < 40 && p.z > 16.5 && false);
      if (Math.abs(p.x) < 1.3 && p.z > Dd - 0.2) return true; // kapı
      if (Math.abs(p.x) > Wd || Math.abs(p.z) > Dd) return false;
      const L = this.Lobby; if (Math.abs(p.x - L.desk.x) < 2.3 && Math.abs(p.z - L.desk.z) < 0.7) return false; // banko
      if (p.x > 8.8 && p.z < -1.4) return false; // asansör kabini
      return true;
    }
    if (f > this.floors) return Math.abs(p.x) < Wd && Math.abs(p.z) < Dd; // çatı
    if (Math.abs(p.x) <= Wd && Math.abs(p.z) <= 1.45) return true; // koridor
    const r = this.RoomAt(p, f);
    if (!r) return false;
    if (r.level < 0) return false;
    const lx = p.x - r.x, lz = Math.abs(p.z);
    if (lz < 1.95) return Math.abs(lx - 0.15) < 0.55; // kapı boşluğu
    return Math.abs(lx) < 1.75 && lz < 6.7;
  },
  // Katta iki nokta arasında yol (noktalar y'siz; kat yüksekliği eklenir)
  InFloorPath(a, b, f) {
    const y = this.FloorY(f), pts = [];
    const P = (x, z) => V(x, y, z);
    if (f === 0) {
      const inA = a.z < this.D / 2, inB = b.z < this.D / 2;
      if (inA !== inB) { pts.push(P(0, this.D / 2 - 1.2), P(0, this.D / 2 + 0.8)); if (!inA) pts.reverse(); }
      pts.push(P(b.x, b.z));
      return pts;
    }
    if (f > this.floors) { pts.push(P(b.x, b.z)); return pts; }
    const ra = this.RoomAt(a, f), rb = this.RoomAt(b, f);
    if (ra) { pts.push(P(ra.x + 0.15, ra.side * 2.3), P(ra.x + 0.15, ra.side * 0.9)); }
    if (rb) { pts.push(P(rb.x + 0.15, rb.side * 0.9), P(rb.x + 0.15, rb.side * 2.3)); }
    pts.push(P(b.x, b.z));
    return pts;
  },
  // Katlar arası: asansör durağı {lift: hedefKat}
  Path(a, fa, b, fb) {
    if (fa === fb) return this.InFloorPath(a, b, fa);
    const la = this.Lift(fa), lb = this.Lift(fb);
    const p1 = this.InFloorPath(a, la, fa);
    const p2 = this.InFloorPath(lb, b, fb);
    return [...p1, { lift: fb, x: lb.x, y: lb.y, z: lb.z }, ...p2];
  },
};
