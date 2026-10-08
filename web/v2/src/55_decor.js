// Dekorasyon: odalar ve lobi "bölge"lerinde ızgaraya mobilya yerleştirme, duvar/zemin seçimi, konfor puanı.
// Bölge: { id, parent(group), x0, z0 (ızgaranın sol-üst köşesi, bölge yerel koordinatı), cols, rows, blocked:Set("c,r"), items:[{k,c,r,rot}], wall, floor }
// Oda bölgesi: oda grubu (ortası 0,0), 7 x 10 hücre (0.5 m). Lobi bölgesi: zemin kat grubu, batı salon.
const Decor = {
  Cell: 0.5,
  Themes: {
    walls: [['#f4e9d6', 'Krem'], ['#e6f1ff', 'Gök'], ['#fde8f0', 'Pembe'], ['#ebe2f6', 'Lavanta'], ['#e3f3e6', 'Nane'], ['#fff1d6', 'Bal'], ['#f0e4d8', 'Kum'], ['#dfe9f3', 'Deniz']],
    floors: [['ahsap', 'Ahşap', '🪵'], ['parke', 'Koyu parke', '🟫'], ['halimavi', 'Mavi halı', '🟦'], ['halipembe', 'Pembe halı', '🩷'], ['halilav', 'Lavanta halı', '🟪'], ['fayans', 'Fayans', '⬜']],
  },
  // k: anahtar · n: ad · m: model (ya da b: prosedürel kurucu) · w,d: hücre · yaw: modelin önü +z'ye baksın diye ek dönüş · cost · comfort · cat · star · flat (üstüne basılabilir, çakışmaz)
  Catalog: [
    { k: 'bedSingle', n: 'Tek kişilik yatak', i: '🛏', m: 'bedSingle', w: 2, d: 4, cost: 120, comfort: 8, cat: 'yatak', star: 1, bed: true },
    { k: 'bedDouble', n: 'Çift kişilik yatak', i: '🛏', m: 'bedDouble', w: 3, d: 4, cost: 320, comfort: 16, cat: 'yatak', star: 1, bed: true },
    { k: 'nightstand', n: 'Komodin ve abajur', i: '🕯', b: 'nightstand', w: 2, d: 1, cost: 70, comfort: 4, cat: 'mobilya', star: 1 },
    { k: 'chairCushion', n: 'Koltuk', i: '🪑', m: 'chairCushion', w: 2, d: 2, cost: 90, comfort: 5, cat: 'mobilya', star: 1 },
    { k: 'chairRounded', n: 'Sandalye', i: '🪑', m: 'chairRounded', w: 1, d: 1, cost: 45, comfort: 2, cat: 'mobilya', star: 1 },
    { k: 'loungeChair', n: 'Berjer', i: '🛋', m: 'loungeChair', w: 2, d: 2, cost: 140, comfort: 7, cat: 'mobilya', star: 1 },
    { k: 'loungeChairRelax', n: 'Dinlenme koltuğu', i: '🛋', m: 'loungeChairRelax', w: 2, d: 3, cost: 220, comfort: 10, cat: 'mobilya', star: 2 },
    { k: 'loungeDesignSofa', n: 'Kanepe', i: '🛋', m: 'loungeDesignSofa', w: 4, d: 2, cost: 380, comfort: 14, cat: 'mobilya', star: 2 },
    { k: 'sideTable', n: 'Sehpa', i: '🪵', m: 'sideTable', w: 1, d: 1, cost: 40, comfort: 2, cat: 'mobilya', star: 1 },
    { k: 'tableCoffeeGlass', n: 'Cam orta sehpa', i: '🪟', m: 'tableCoffeeGlass', w: 3, d: 2, cost: 160, comfort: 5, cat: 'mobilya', star: 2 },
    { k: 'tableRound', n: 'Yuvarlak masa', i: '🟤', m: 'tableRound', w: 2, d: 2, cost: 110, comfort: 4, cat: 'mobilya', star: 1 },
    { k: 'bookcaseOpen', n: 'Kitaplık', i: '📚', m: 'bookcaseOpen', w: 2, d: 1, cost: 130, comfort: 6, cat: 'mobilya', star: 1 },
    { k: 'bookcaseClosedDoors', n: 'Gardırop', i: '🚪', m: 'bookcaseClosedDoors', w: 2, d: 1, cost: 150, comfort: 5, cat: 'mobilya', star: 1 },
    { k: 'tvSet', n: 'Televizyon ünitesi', i: '📺', b: 'tvSet', w: 3, d: 1, cost: 260, comfort: 12, cat: 'mobilya', star: 1 },
    { k: 'coatRackStanding', n: 'Askılık', i: '🧥', m: 'coatRackStanding', w: 1, d: 1, cost: 35, comfort: 2, cat: 'mobilya', star: 1 },
    { k: 'lampSquareFloor', n: 'Lambader', i: '💡', m: 'lampSquareFloor', w: 1, d: 1, cost: 60, comfort: 4, cat: 'dekor', star: 1, light: true },
    { k: 'bathtub', n: 'Küvet', i: '🛁', m: 'bathtub', w: 2, d: 4, cost: 450, comfort: 18, cat: 'mobilya', star: 3 },
    { k: 'plantSmall1', n: 'Bitki', i: '🌿', m: 'plantSmall1', w: 1, d: 1, cost: 30, comfort: 3, cat: 'dekor', star: 1 },
    { k: 'plantSmall2', n: 'Çiçekli bitki', i: '🌸', m: 'plantSmall2', w: 1, d: 1, cost: 45, comfort: 4, cat: 'dekor', star: 1 },
    { k: 'plantSmall3', n: 'Kaktüs', i: '🌵', m: 'plantSmall3', w: 1, d: 1, cost: 25, comfort: 2, cat: 'dekor', star: 1 },
    { k: 'pottedPlant', n: 'Büyük saksı', i: '🪴', m: 'pottedPlant', w: 1, d: 1, cost: 60, comfort: 5, cat: 'dekor', star: 1 },
    { k: 'rugPink', n: 'Pembe halı', i: '🟥', b: 'rug', col: '#ec8fb0', w: 4, d: 3, cost: 80, comfort: 6, cat: 'dekor', star: 1, flat: true },
    { k: 'rugBlue', n: 'Mavi halı', i: '🟦', b: 'rug', col: '#7fb3e0', w: 4, d: 3, cost: 80, comfort: 6, cat: 'dekor', star: 1, flat: true },
    { k: 'rugLav', n: 'Lavanta halı', i: '🟪', b: 'rug', col: '#a78fd0', w: 4, d: 3, cost: 95, comfort: 7, cat: 'dekor', star: 1, flat: true },
    { k: 'rugRound', n: 'Yuvarlak kilim', i: '🟠', b: 'rugRound', col: '#f2b36b', w: 3, d: 3, cost: 70, comfort: 5, cat: 'dekor', star: 1, flat: true },
    { k: 'vase', n: 'Çiçek vazosu', i: '💐', b: 'vase', w: 1, d: 1, cost: 55, comfort: 5, cat: 'dekor', star: 1 },
    { k: 'candles', n: 'Mumlar', i: '🕯', b: 'candles', w: 1, d: 1, cost: 40, comfort: 4, cat: 'dekor', star: 2, light: true },
    { k: 'balloons', n: 'Balonlar', i: '🎈', b: 'balloons', w: 1, d: 1, cost: 35, comfort: 3, cat: 'dekor', star: 1 },
  ],
  Presets: {
    0: [['bedSingle', 0, 1, 0], ['nightstand', 2, 1, 0], ['plantSmall1', 6, 6, 0]],
    1: [['bedDouble', 0, 1, 0], ['nightstand', 3, 1, 0], ['tvSet', 4, 6, 0], ['chairCushion', 0, 6, 0], ['rugBlue', 1, 4, 0]],
    2: [['bedDouble', 0, 1, 0], ['nightstand', 3, 1, 0], ['tvSet', 4, 6, 0], ['loungeChairRelax', 5, 2, 0], ['bookcaseOpen', 0, 7, 0], ['rugPink', 1, 4, 0], ['vase', 5, 0, 0], ['plantSmall2', 6, 0, 0]],
  },
  LobbyPreset: [['loungeDesignSofa', 0, 2, 0], ['loungeDesignSofa', 0, 8, 0], ['tableCoffeeGlass', 5, 5, 0], ['loungeChairRelax', 9, 2, 0], ['rugLav', 3, 4, 0], ['pottedPlant', 0, 0, 0], ['vase', 11, 0, 0]],

  zones: new Map(), active: null, sel: null, ghost: null, drag: null, lastZone: null,
  Def(k) { return this.Catalog.find(c => c.k === k); },

  // ---------------- Bölgeler ----------------
  RoomZone(r) {
    // oda grubu ortası (0,0); 7 sütun x 10 satır; kapı koridor tarafında (side -1 → satır 9, side +1 → satır 0), sütun 3-4
    const doorRow = r.side < 0 ? 9 : 0, near = r.side < 0 ? 8 : 1;
    const blocked = new Set([`3,${doorRow}`, `4,${doorRow}`, `3,${near}`, `4,${near}`]);
    const z = { id: 'oda' + r.id, room: r, parent: r.group, x0: -1.75, z0: -2.5, cols: 7, rows: 10, blocked, items: [], wall: '#f4e9d6', floor: 'ahsap', side: r.side, floorIdx: r.floor, worldOrigin: V(r.x, 0, r.z) };
    this.zones.set(z.id, z); return z;
  },
  LobbyZone(g) {
    // batı salon: dünya x -12.25..-3.75 (17 sütun), z -0.75..6.25 (14 satır)
    const z = { id: 'lobi', room: null, parent: g, x0: -12.25, z0: -0.75, cols: 17, rows: 14, blocked: new Set(), items: [], wall: null, floor: null, side: 1, floorIdx: 0, worldOrigin: V(0, 0, 0) };
    this.zones.set('lobi', z); return z;
  },
  Zone(id) { return this.zones.get(id); },

  // yerel: hücre → bölge-yerel koordinat (öğe merkezi)
  Center(z, it) {
    const d = this.Def(it.k), rot = it.rot || 0, w = rot % 180 ? d.d : d.w, dd = rot % 180 ? d.w : d.d;
    return { x: z.x0 + (it.c + w / 2) * this.Cell, zz: z.z0 + (it.r + dd / 2) * this.Cell, w, d: dd };
  },
  Cells(z, it) {
    const d = this.Def(it.k), rot = it.rot || 0, w = rot % 180 ? d.d : d.w, dd = rot % 180 ? d.w : d.d, out = [];
    for (let i = 0; i < w; i++) for (let j = 0; j < dd; j++) out.push([it.c + i, it.r + j]);
    return out;
  },
  Fits(z, it, ignore) {
    const d = this.Def(it.k);
    for (const [c, r] of this.Cells(z, it)) {
      if (c < 0 || r < 0 || c >= z.cols || r >= z.rows) return false;
      if (z.blocked.has(c + ',' + r)) return false;
      if (d.flat) continue;
      for (const o of z.items) { if (o === ignore || this.Def(o.k).flat) continue; for (const [oc, or] of this.Cells(z, o)) if (oc === c && or === r) return false; }
    }
    return true;
  },
  FindSpot(z, k) {
    const it = { k, c: 0, r: 0, rot: 0 };
    const d = this.Def(k);
    // ortadan dışa doğru ara
    const cc = Math.floor((z.cols - d.w) / 2), cr = Math.floor((z.rows - d.d) / 2);
    const order = [];
    for (let r = 0; r <= z.rows; r++) for (let c = 0; c <= z.cols; c++) order.push([c, r, Math.abs(c - cc) + Math.abs(r - cr)]);
    order.sort((a, b) => a[2] - b[2]);
    for (const [c, r] of order) { it.c = c; it.r = r; if (this.Fits(z, it)) return it; }
    for (const rot of [90]) { it.rot = rot; for (const [c, r] of order) { it.c = c; it.r = r; if (this.Fits(z, it)) return it; } }
    return null;
  },
  Comfort(z) { let s = 0; for (const it of z.items) s += this.Def(it.k).comfort; if (z.wall && z.wall !== '#f4e9d6') s += 4; if (z.floor && z.floor !== 'ahsap') s += 4; return s; },
  HasBed(z) { return z.items.some(it => this.Def(it.k).bed); },
  // oda fiyat çarpanı: konfor 0 → 1.0, 100 → 1.5
  PriceMul(r) { const z = this.zones.get('oda' + r.id); return z ? 1 + Math.min(100, this.Comfort(z)) * 0.005 : 1; },
  RoomPrice(r) { return Math.round(Data.RoomLevels[r.level].price * this.PriceMul(r)); },
  SatBonus(r) { const z = this.zones.get('oda' + r.id); return z ? Math.min(1.2, this.Comfort(z) * 0.012) : 0; },

  // ---------------- Kurma ----------------
  // Odayı durumdan (Game.st.rooms[id] = {lv, wall, floor, items}) kurar; yoksa seviye ön ayarı
  Furnish(r) {
    const rg = r.group; for (const o of rg.children.filter(c => c.userData.furn)) Destroy(o);
    let z = this.zones.get('oda' + r.id); if (!z) z = this.RoomZone(r);
    const st = Game.st.rooms[r.id];
    if (st && typeof st === 'object' && st.items) { z.items = st.items.map(x => Object.assign({}, x)); z.wall = st.wall || z.wall; z.floor = st.floor || z.floor; }
    else { this.ApplyPreset(z, r.level); }
    this.BuildZone(z);
    this.SaveZone(z);
    // kapı numarası ve dağınıklık
    const side = r.side;
    const t = U.Text(rg, V(0.15, 2.45, -side * 2.9), String(r.number), 0.05, C(0.35, 0.25, 0.2), false, true); t.obj.userData.furn = true;
    r.mess = U.Box('Dagınık', rg, V(0.4, 0.15, side * 0.4), V(0.9, 0.3, 0.7), C(0.9, 0.9, 0.95)); r.mess.userData.furn = true; r.mess.visible = r.state === 'dirty';
  },
  ApplyPreset(z, level) {
    const lv = Data.RoomLevels[Math.max(0, level)];
    z.wall = lv.color; z.floor = level >= 2 ? 'halipembe' : level === 1 ? 'halimavi' : 'ahsap';
    z.items = [];
    for (const [k, c, r, rot] of (this.Presets[level] || this.Presets[0])) { const it = { k, c, r, rot }; if (z.side > 0) { const d = this.Def(k), dd = rot % 180 ? d.w : d.d; it.r = z.rows - r - dd; it.rot = (rot + 180) % 360; } if (this.Fits(z, it)) z.items.push(it); }
  },
  FurnishLobby(g) {
    let z = this.zones.get('lobi'); if (!z) z = this.LobbyZone(g); z.parent = g;
    const st = Game.st.lobby;
    if (st && st.items) z.items = st.items.map(x => Object.assign({}, x));
    else z.items = this.LobbyPreset.map(([k, c, r, rot]) => ({ k, c, r, rot })).filter(it => this.Fits(z, it, it));
    this.BuildZone(z);
  },
  SaveZone(z) {
    if (z.room) { Game.st.rooms[z.room.id] = { lv: z.room.level, wall: z.wall, floor: z.floor, items: z.items.map(x => ({ k: x.k, c: x.c, r: x.r, rot: x.rot || 0 })) }; }
    else Game.st.lobby = { items: z.items.map(x => ({ k: x.k, c: x.c, r: x.r, rot: x.rot || 0 })) };
  },
  FloorMat(id) {
    switch (id) {
      case 'parke': return U.Mat(C(0.55, 0.4, 0.28), { tex: U.WoodTex, tiling: { x: 2, y: 3 } });
      case 'halimavi': return U.Mat(C(0.68, 0.76, 0.88), { tex: U.CarpetTex, tiling: { x: 3, y: 4 } });
      case 'halipembe': return U.Mat(C(0.93, 0.78, 0.84), { tex: U.CarpetTex, tiling: { x: 3, y: 4 } });
      case 'halilav': return U.Mat(C(0.78, 0.7, 0.9), { tex: U.CarpetTex, tiling: { x: 3, y: 4 } });
      case 'fayans': return U.Mat(C(0.92, 0.92, 0.9), { tex: U.TileTex, tiling: { x: 2, y: 3 } });
      default: return U.Mat(C(0.86, 0.72, 0.55), { tex: U.WoodTex, tiling: { x: 2, y: 3 } });
    }
  },
  BuildZone(z) {
    for (const o of z.parent.children.filter(c => c.userData.zone === z.id)) Destroy(o);
    const mark = o => { o.userData.zone = z.id; o.userData.furn = true; return o; };
    if (z.room) {
      mark(U.Prim('Taban', z.parent, V(0, 0.005, 0), V(3.85, 0.01, 5.4), this.FloorMat(z.floor))).castShadow = false;
      mark(U.Flat('Boya', z.parent, V(0, 1.2, z.side * 2.72), V(3.8, 2.4, 0.03), Col.hex(z.wall)));
      mark(U.Flat('Boya2', z.parent, V(-1.92, 1.2, 0), V(0.03, 2.4, 5.4), Col.lerp(Col.hex(z.wall), Col.white, 0.3)));
      mark(U.Flat('Boya3', z.parent, V(1.92, 1.2, 0), V(0.03, 2.4, 5.4), Col.lerp(Col.hex(z.wall), Col.white, 0.3)));
    }
    for (const it of z.items) mark(this.BuildItem(z, it));
    this.UpdateRoomSpots(z);
  },
  BuildItem(z, it) {
    const d = this.Def(it.k), c = this.Center(z, it), rot = it.rot || 0;
    const yaw = rot + (d.yaw || 0);
    let g;
    if (d.m) g = U.Model(d.m, z.parent, V(c.x, 0, c.zz), yaw, 1);
    else g = this['Make_' + d.b](z, it, d, c, yaw);
    g.userData.item = it; g.name = 'Esya:' + it.k;
    it.go = g;
    return g;
  },
  Make_nightstand(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'Komodin'); g.rotation.y = yaw * Mathf.Deg2Rad;
    U.Model('cabinetBedDrawerTable', g, V(0, 0, 0), 0, 1); U.Model('lampRoundTable', g, V(0, 0.55, 0), 0, 1);
    const b = U.Prim('Ampul', g, V(0, 0.95, 0), V(0.3, 0.2, 0.3), U.Mat(C(1, 0.95, 0.8)), 'Sphere'); World.AddFixture(b, C(1, 0.9, 0.6), 1.2);
    return g;
  },
  Make_tvSet(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'TV'); g.rotation.y = yaw * Mathf.Deg2Rad;
    U.Model('cabinetTelevision', g, V(0, 0, 0), 0, 1); U.Model('televisionModern', g, V(0, 0.5, 0), 0, 1);
    return g;
  },
  Make_rug(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'Hali'); g.rotation.y = yaw * Mathf.Deg2Rad;
    const col = Col.hex(d.col);
    U.Flat('HaliKenar', g, V(0, 0.012, 0), V(d.w * this.Cell, 0.02, d.d * this.Cell), Col.lerp(col, Col.black, 0.25));
    U.Flat('HaliIc', g, V(0, 0.02, 0), V(d.w * this.Cell - 0.2, 0.02, d.d * this.Cell - 0.2), col);
    return g;
  },
  Make_rugRound(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'Kilim');
    const col = Col.hex(d.col);
    U.Flat('K1', g, V(0, 0.012, 0), V(1.5, 0.02, 1.5), Col.lerp(col, Col.black, 0.2), 'Cylinder'); U.Flat('K2', g, V(0, 0.02, 0), V(1.2, 0.02, 1.2), col, 'Cylinder'); U.Flat('K3', g, V(0, 0.028, 0), V(0.6, 0.02, 0.6), Col.lerp(col, Col.white, 0.4), 'Cylinder');
    return g;
  },
  Make_vase(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'Vazo');
    U.Box('Masa', g, V(0, 0.4, 0), V(0.4, 0.8, 0.4), C(0.96, 0.95, 0.92), 'Cylinder');
    U.Box('Vazo', g, V(0, 0.95, 0), V(0.22, 0.3, 0.22), C(0.55, 0.75, 0.95), 'Cylinder');
    const cols = [C(1, 0.5, 0.65), C(1, 0.85, 0.3), C(0.75, 0.55, 0.95), C(1, 1, 1)];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; U.Box('Sap', g, V(Math.cos(a) * 0.08, 1.2, Math.sin(a) * 0.08), V(0.02, 0.3, 0.02), C(0.35, 0.65, 0.35)); U.Box('Cicek', g, V(Math.cos(a) * 0.13, 1.36, Math.sin(a) * 0.13), V(0.12, 0.12, 0.12), cols[i % 4], 'Sphere'); }
    return g;
  },
  Make_candles(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'Mumlar');
    U.Box('Tabla', g, V(0, 0.02, 0), V(0.4, 0.04, 0.4), C(0.6, 0.45, 0.3), 'Cylinder');
    for (const [x, zz, h] of [[-0.1, -0.08, 0.22], [0.1, -0.05, 0.3], [0, 0.1, 0.26]]) { U.Box('Mum', g, V(x, 0.04 + h / 2, zz), V(0.08, h, 0.08), C(0.98, 0.95, 0.85), 'Cylinder'); const f = U.Prim('Alev', g, V(x, 0.08 + h, zz), V(0.06, 0.09, 0.06), U.Mat(C(1, 0.8, 0.4)), 'Sphere'); World.AddFixture(f, C(1, 0.75, 0.3), 0.6); }
    return g;
  },
  Make_balloons(z, it, d, c, yaw) {
    const g = U.Pivot(z.parent, V(c.x, 0, c.zz), 'Balonlar');
    U.Box('Agirlik', g, V(0, 0.06, 0), V(0.16, 0.12, 0.16), C(0.7, 0.7, 0.75));
    const cols = [C(1, 0.45, 0.6), C(1, 0.85, 0.3), C(0.5, 0.8, 1), C(0.7, 0.55, 0.95)];
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.5; U.Box('Ip', g, V(Math.cos(a) * 0.08, 0.7, Math.sin(a) * 0.08), V(0.01, 1.2, 0.01), C(0.8, 0.8, 0.8)); U.Box('Balon', g, V(Math.cos(a) * 0.2, 1.45 + (i % 2) * 0.15, Math.sin(a) * 0.2), V(0.3, 0.38, 0.3), cols[i], 'Sphere'); }
    return g;
  },
  // Odanın yatak ve oturma noktalarını eşyalardan türet
  UpdateRoomSpots(z) {
    const r = z.room; if (!r) return;
    const bed = z.items.find(it => this.Def(it.k).bed);
    const y = Hotel.FloorY(r.floor);
    if (bed) { const c = this.Center(z, bed); r.bed = V(r.x + c.x, y, r.z + c.zz); r.bedYaw = (bed.rot || 0) + (this.Def(bed.k).yaw || 0) + 180; r.hasBed = true; }
    else { r.bed = V(r.x, y, r.z); r.bedYaw = 0; r.hasBed = false; }
    const seat = z.items.find(it => /chair|lounge|Sofa/.test(it.k));
    if (seat) { const c = this.Center(z, seat); r.seat = V(r.x + c.x, y, r.z + c.zz); r.seatYaw = (seat.rot || 0) + (this.Def(seat.k).yaw || 0); } else { r.seat = V(r.x + 1.2, y, r.z + z.side * 2.4); r.seatYaw = 0; }
  },

  // ---------------- Düzenleme kipi ----------------
  Enter(zoneId) {
    const z = this.zones.get(zoneId); if (!z) return;
    if (z.room && z.room.state === 'occupied') { UI.Toast('Odada misafir var, çıkınca dekore edebilirsin', 'info'); return; }
    this.active = z; this.sel = null; this.lastZone = z; document.body.classList.add('decor');
    const o = z.worldOrigin, cx = o.x + z.x0 + z.cols * this.Cell / 2, cz = o.z + z.z0 + z.rows * this.Cell / 2;
    Cam.follow = null; Cam.target.set(cx, Hotel.FloorY(z.floorIdx), cz); Cam.distGoal = z.room ? 12 : 16; Hotel.SetView(z.floorIdx);
    // liste sağda (geniş ekran) ya da altta (telefon): bölge boş alanda kalsın
    const wide = innerWidth >= 900, R = Cam.Right, F = Cam.Forward, k = z.room ? 2.4 : 3.5;
    if (wide) Cam.target.add(V(R.x * k, 0, R.z * k)); else Cam.target.add(V(-F.x * k * 0.9, 0, -F.z * k * 0.9));
    // odanın duvarları alçalır, kamera tepeden bakar
    for (const o of z.parent.children) if (o.userData.roomWall) { o.userData.hFull = o.scale.y; o.scale.y = 0.35; o.position.y = 0.175; }
    this.pitch0 = Cam.pitch; Cam.pitch = 66;
    this.Grid(true);
    this.Sheet();
    UI.Hint('Eşyayı sürükle, döndür, kaldır. Yeni eşya için listeden seç.', 5);
    Sfx.Play('pop', 0.5);
  },
  Exit() {
    if (!this.active) return;
    const z = this.active;
    if (z.room && !this.HasBed(z)) { UI.Toast('Odada yatak yok! Misafir yerleşemez', 'bad'); }
    this.Select(null); this.Grid(false); this.active = null; document.body.classList.remove('decor');
    UI.CloseSheet(); this.Toolbar(false);
    for (const o of z.parent.children) if (o.userData.roomWall && o.userData.hFull) { o.scale.y = o.userData.hFull; o.position.y = o.userData.hFull / 2; }
    Cam.follow = Game.player.go; Cam.distGoal = 24; Cam.pitch = this.pitch0 || 50;
    this.SaveZone(z); Game.Save();
    if (UI.SheetIs('Oda ' + (z.room ? z.room.number : ''))) UI.RenderSheet();
  },
  Grid(on) {
    if (this.gridMesh) { Destroy(this.gridMesh); this.gridMesh = null; }
    if (!on) return;
    const z = this.active, parts = [];
    for (let c = 0; c < z.cols; c++) for (let r = 0; r < z.rows; r++) {
      const blocked = z.blocked.has(c + ',' + r);
      parts.push({ geo: 'Cube', pos: V(z.x0 + (c + 0.5) * this.Cell, 0.035, z.z0 + (r + 0.5) * this.Cell), scale: V(this.Cell - 0.04, 0.01, this.Cell - 0.04), c: blocked ? C(1, 0.45, 0.45) : C(0.35, 0.6, 1) });
    }
    const m = U.Merge('Izgara', z.parent, parts); m.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false }); m.userData.ownMat = true; m.castShadow = false; m.receiveShadow = false;
    this.gridMesh = m;
  },
  Select(it) {
    if (this.selRing) { Destroy(this.selRing); this.selRing = null; }
    this.sel = it;
    if (it) {
      const z = this.active, c = this.Center(z, it);
      this.selRing = U.Flat('Secim', z.parent, V(c.x, 0.05, c.zz), V(c.w * this.Cell + 0.1, 0.02, c.d * this.Cell + 0.1), C(1, 0.85, 0.3, 0.55));
      this.selRing.renderOrder = 2;
    }
    this.Toolbar(!!it);
  },
  Toolbar(show) {
    let el = document.getElementById('decor-bar');
    if (!el) {
      el = document.createElement('div'); el.id = 'decor-bar'; el.className = 'decor-bar';
      el.innerHTML = '<button class="ghost" id="dc-rot">↻ Döndür</button><button class="red" id="dc-del">🗑 Kaldır</button><button class="mint" id="dc-ok">✓ Tamam</button>';
      document.getElementById('ui').appendChild(el);
      el.querySelector('#dc-rot').addEventListener('click', () => this.Rotate());
      el.querySelector('#dc-del').addEventListener('click', () => this.Remove());
      el.querySelector('#dc-ok').addEventListener('click', () => { this.Select(null); });
    }
    el.hidden = !show;
  },
  Sheet() {
    const z = this.active, tabs = [{ id: 'mobilya', label: '🛋 Mobilya' }, { id: 'dekor', label: '🌸 Dekor' }];
    if (z.room) tabs.push({ id: 'duvar', label: '🎨 Duvar & zemin' });
    UI.Sheet({ title: z.room ? 'Oda ' + z.room.number + ' dekorasyonu' : 'Lobi dekorasyonu', sub: 'Konfor ' + this.Comfort(z) + (z.room ? ' · gecelik ' + UI.fmt(this.RoomPrice(z.room)) : ''), tabs, onClose: () => this.Exit(), render: (body, t) => {
      if (t === 'duvar') {
        body.innerHTML = '<div class="sec">Duvar rengi</div><div class="swatches" id="sw-wall"></div><div class="sec">Zemin</div><div class="grid3" id="sw-floor"></div>';
        const sw = body.querySelector('#sw-wall');
        for (const [hex, name] of this.Themes.walls) { const d = document.createElement('div'); d.className = 'swatch' + (z.wall === hex ? ' on' : ''); d.style.background = hex; d.title = name; d.addEventListener('click', () => { z.wall = hex; this.BuildZone(z); this.Grid(true); this.SaveZone(z); UI.RenderSheet(); Sfx.Play('tap', 0.4); }); sw.appendChild(d); }
        const fl = body.querySelector('#sw-floor');
        for (const [id, name, ic] of this.Themes.floors) { const b = document.createElement('button'); b.className = z.floor === id ? 'gold' : 'ghost'; b.textContent = ic + ' ' + name; b.addEventListener('click', () => { z.floor = id; this.BuildZone(z); this.Grid(true); this.SaveZone(z); UI.RenderSheet(); Sfx.Play('tap', 0.4); }); fl.appendChild(b); }
        return;
      }
      const list = this.Catalog.filter(d => (t === 'mobilya' ? (d.cat === 'mobilya' || (d.cat === 'yatak' && z.room)) : d.cat === 'dekor'));
      const grid = document.createElement('div'); grid.className = 'catalog';
      for (const d of list) {
        const locked = Game.Stars < d.star;
        const card = document.createElement('div'); card.className = 'cat-card' + (locked ? ' locked' : '');
        card.innerHTML = `<div class="ci">${d.i}</div><div class="cn">${UI.esc(d.n)}</div><div class="cc">${locked ? '🔒 ' + d.star + '★' : UI.fmt(d.cost)}</div><div class="cm">+${d.comfort} konfor</div>`;
        if (!locked) card.addEventListener('click', () => this.Buy(d.k));
        grid.appendChild(card);
      }
      body.appendChild(grid);
    } });
    document.querySelector('.sheet').classList.add('short');
  },
  Buy(k) {
    const z = this.active, d = this.Def(k);
    const spot = this.FindSpot(z, k);
    if (!spot) { UI.Toast('Yer yok: önce bir eşya kaldır', 'bad'); return; }
    if (!Game.Pay(d.cost)) return;
    z.items.push(spot); const g = this.BuildItem(z, spot); g.userData.zone = z.id; g.userData.furn = true;
    Tween.Pop(g, 0.2); Sfx.Play('build', 0.6);
    this.Select(spot); this.UpdateRoomSpots(z); this.SaveZone(z); this.RefreshSub();
  },
  Rotate() {
    const z = this.active, it = this.sel; if (!it) return;
    const old = it.rot || 0; it.rot = (old + 90) % 360;
    if (!this.Fits(z, it, it)) { // sığmazsa biraz kaydırmayı dene
      let ok = false; for (const [dc, dr] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [-2, 0], [0, -2], [1, 0], [0, 1]]) { const c0 = it.c, r0 = it.r; it.c += dc; it.r += dr; if (this.Fits(z, it, it)) { ok = true; break; } it.c = c0; it.r = r0; }
      if (!ok) { it.rot = old; UI.Toast('Bu yönde sığmıyor', 'info'); return; }
    }
    this.Rebuild(it); Sfx.Play('tap', 0.4);
  },
  Remove() {
    const z = this.active, it = this.sel; if (!it) return;
    const d = this.Def(it.k);
    z.items.splice(z.items.indexOf(it), 1); if (it.go) Destroy(it.go);
    Game.st.money += Math.round(d.cost * 0.5); Tween.FloatText(Vec.add(this.WorldOf(z, it), V(0, 1, 0)), '+' + UI.fmt(Math.round(d.cost * 0.5)), C(0.6, 1, 0.6), 0.1);
    this.Select(null); this.UpdateRoomSpots(z); this.SaveZone(z); this.RefreshSub(); Sfx.Play('pop', 0.5);
  },
  Rebuild(it) {
    const z = this.active; if (it.go) Destroy(it.go);
    const g = this.BuildItem(z, it); g.userData.zone = z.id; g.userData.furn = true;
    this.Select(it); this.UpdateRoomSpots(z); this.SaveZone(z);
  },
  WorldOf(z, it) { const c = this.Center(z, it); return V(z.worldOrigin.x + c.x, Hotel.FloorY(z.floorIdx), z.worldOrigin.z + c.zz); },
  RefreshSub() { const z = this.active; const el = document.querySelector('.sheet .head .sub'); if (el) el.textContent = 'Konfor ' + this.Comfort(z) + (z.room ? ' · gecelik ' + UI.fmt(this.RoomPrice(z.room)) : ''); },

  // ---- dokunma: seçme ve sürükleme ----
  Pick(x, y) {
    const z = this.active; if (!z) return null;
    const ndc = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    camera.updateMatrixWorld(); z.parent.updateMatrixWorld(true); // yeni kurulmuş eşya henüz çizilmemiş olabilir
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
    const hits = rc.intersectObjects(z.items.filter(it => it.go).map(it => it.go), true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.item) o = o.parent; if (o) return o.userData.item; }
    return null;
  },
  CellAt(x, y) {
    const z = this.active; const p = Cam.ScreenToPlane(x, y, Hotel.FloorY(z.floorIdx)); if (!p) return null;
    const lx = p.x - z.worldOrigin.x - z.x0, lz = p.z - z.worldOrigin.z - z.z0;
    return { c: Math.floor(lx / this.Cell), r: Math.floor(lz / this.Cell) };
  },
  OnDown(x, y) {
    if (!this.active) return false;
    const it = this.Pick(x, y);
    if (it) { this.Select(it); const cell = this.CellAt(x, y); this.drag = { it, dc: it.c - (cell ? cell.c : 0), dr: it.r - (cell ? cell.r : 0), moved: false }; Sfx.Play('tap', 0.3); return true; }
    return true; // dekor kipinde sahneye dokunma yürütmez
  },
  OnMove(x, y) {
    if (!this.active || !this.drag) return false;
    const z = this.active, d = this.drag, cell = this.CellAt(x, y); if (!cell) return true;
    const nc = cell.c + d.dc, nr = cell.r + d.dr;
    if (nc === d.it.c && nr === d.it.r) return true;
    const c0 = d.it.c, r0 = d.it.r; d.it.c = nc; d.it.r = nr;
    if (this.Fits(z, d.it, d.it)) { d.moved = true; const c = this.Center(z, d.it); d.it.go.position.set(c.x, 0, c.zz); if (this.selRing) this.selRing.position.set(c.x, 0.05, c.zz); }
    else { d.it.c = c0; d.it.r = r0; }
    return true;
  },
  OnUp(x, y) {
    if (!this.active) return false;
    if (this.drag) { if (this.drag.moved) { this.UpdateRoomSpots(this.active); this.SaveZone(this.active); Sfx.Play('pop', 0.4); } else if (!this.Pick(x, y)) this.Select(null); this.drag = null; }
    return true;
  },
};
