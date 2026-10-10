// Tesisler: kafe, restoran, spa (zemin kat) · havuz, çatı barı, bahçe, spor salonu (çatı).
// Misafir çıkışta ödedikten sonra bir tesise uğrar: bekler (oyuncu ya da ilgili personel servis eder), keyfini çıkarır, öder, gider.
// Görseller lobide Hotel.BuildLobby grubuna, çatıda Hotel.BuildRoof grubuna (çatı her kat alımında yeniden kurulur) eklenir.
const Facilities = (() => {
  const S = { lobbyG: null, roofG: null, booted: false, fac: {}, roofIdx: -1, roofLamps: [], roofHalos: [], bloom: 1, day: 0, waters: [], flowerPivots: [], wilted: [], t: 0 };
  const PATIENCE = 35, warm = C(1, 0.85, 0.55);
  const yawDeg = (from, to) => Math.atan2(to.x - from.x, to.z - from.z) * Mathf.Rad2Deg;
  // Karakter modeli yaw 0'da -z'ye bakar (Rig.CharYaw=180 ile); yüzünü bir noktaya döndürmek için +CharYaw eklenir.
  const faceTo = (go, from, to) => { if (Math.abs(to.x - from.x) + Math.abs(to.z - from.z) > 1e-4) setEuler(go, 0, yawDeg(from, to) + Rig.CharYaw, 0); };
  // Kenney mobilyaları yaw 0'da -z'ye bakar: bakış yönüne göre +180
  const CHAIR_YAW = 180, RELAX_YAW = 180;

  // ---------------- yardımcılar ----------------
  const def = id => Data.Facilities.find(d => d.id === id);
  const isRoof = fac => fac.def.floor === 'roof';
  const FloorIdx = fac => isRoof(fac) ? Hotel.RoofIndex : 0;
  const WorldY = fac => isRoof(fac) ? Hotel.FloorY(Hotel.RoofIndex) : 0;
  const WP = (fac, p, dy = 0) => V(p.x, WorldY(fac) + dy, p.z);
  const RoofA = () => V(10.6, 0, 2.3), RoofB = () => V(8.3, 0, 2.3);
  function removeNear(group, name, x, z) { if (!group) return; for (const c of group.children.slice()) if (c.name === name && Math.abs(c.position.x - x) < 0.3 && Math.abs(c.position.z - z) < 0.3) Destroy(c); }
  function lamp(fac, p, range, k, c) { World.AddLamp(V(p.x, WorldY(fac) + p.y, p.z), range, k, c); if (isRoof(fac)) S.roofLamps.push(World.lamps[World.lamps.length - 1]); }
  function halo(fac, parent, p, size, c) { const h = U.Halo(parent, p, size, c, 0.45); h.visible = World.lit === 1; World.halos.push(h); if (isRoof(fac)) S.roofHalos.push(h); return h; }
  function fix(mesh, c) { World.AddFixture(mesh, c, 0); }
  function glowBall(fac, g, p, r, c, haloSize) { const m = U.Prim('Isik', g, p, V(r, r, r), U.Mat(c), 'Sphere'); U.NoShadow(m); fix(m, c); if (haloSize) halo(fac, g, p, haloSize, c); return m; }
  function water(g, p, sc, c, type = 'Cylinder') {
    const m = U.Prim('Su', g, p, sc, U.Mat(c, { emission: 0.35, smooth: 0.95 }), type);
    U.NoShadow(m); m.receiveShadow = false; S.waters.push({ m, y: p.y }); return m;
  }
  function chair(model, g, p, look) { return U.Model(model, g, V(p.x, 0, p.z), yawDeg(p, look) + CHAIR_YAW, 1); }
  function candle(fac, g, p, c = C(1, 0.98, 0.9)) {
    U.Box('Mum', g, V(p.x, p.y + 0.09, p.z), V(0.1, 0.18, 0.1), c, 'Cylinder');
    return glowBall(fac, g, V(p.x, p.y + 0.22, p.z), 0.08, C(1, 0.7, 0.3), 0);
  }
  function table(fac, g, p, model = 'tableRound') { const t = U.Model(model, g, V(p.x, 0, p.z), 0, 1); return t; }
  const pastel = [C(0.98, 0.55, 0.65), C(1, 0.85, 0.35), C(0.72, 0.6, 0.9), C(1, 1, 1), C(1, 0.6, 0.4), C(0.55, 0.8, 0.95)];

  // ---------------- yerleşimler ----------------
  // mode: counter (bankoda bekle → otur), table (otur → servis gelir), self (servis yok)
  // spots: {p, look, act:'sit'|'lie'|'tread'|'mat'|'stand', dy, at (servis noktası), self}
  const Layout = {
    kafe: {
      mode: 'counter', entry: V(3.8, 0, 1.4), serve: V(7.9, 0, 3.8), serveLook: V(6, 0, 3.8), wait: V(6.3, 0, 3.8), waitLook: V(8, 0, 3.8), qdir: V(0, 0, -0.8), label: V(4.9, 0, 4.1),
      enjoy: 7, waitText: 'Kahve bekliyor', item: C(0.98, 0.98, 0.95), sat: 0.4, staffTime: 1.8,
      spots: [
        { p: V(2.1, 0, 2.9), look: V(3.0, 0, 2.9), act: 'sit', dy: 0.4 }, { p: V(3.9, 0, 2.9), look: V(3.0, 0, 2.9), act: 'sit', dy: 0.4 },
        { p: V(2.1, 0, 5.4), look: V(3.0, 0, 5.4), act: 'sit', dy: 0.4 }, { p: V(3.9, 0, 5.4), look: V(3.0, 0, 5.4), act: 'sit', dy: 0.4 },
        { p: V(5.4, 0, 4.4), look: V(5.4, 0, 5.4), act: 'sit', dy: 0.4 }, { p: V(6.3, 0, 5.4), look: V(5.4, 0, 5.4), act: 'sit', dy: 0.4 },
      ],
      build(g, fac) {
        U.Prim('KafeHali', g, V(4.9, 0.02, 4.1), V(6.2, 0.03, 4.8), U.Mat(C(0.93, 0.8, 0.62), { tex: U.CarpetTex, tiling: { x: 3, y: 2 } })).castShadow = false;
        for (const z of [2.4, 3.16, 3.92, 4.68]) U.Model('kitchenBar', g, V(7.2, 0, z), 90, 1);
        U.Model('kitchenBarEnd', g, V(7.2, 0, 5.15), 90, 1);
        U.Model('kitchenCoffeeMachine', g, V(7.2, 0.75, 2.7), 270, 1);
        U.Box('Vitrin', g, V(7.2, 0.95, 4.3), V(0.34, 0.36, 0.7), C(0.85, 0.95, 1, 0.4));
        U.Box('Pasta', g, V(7.2, 0.84, 4.15), V(0.22, 0.14, 0.22), C(1, 0.75, 0.8), 'Cylinder'); U.Box('Pasta2', g, V(7.2, 0.84, 4.5), V(0.2, 0.14, 0.2), C(0.6, 0.4, 0.3), 'Cylinder');
        U.Model('bookcaseOpen', g, V(8.7, 0, 2.3), 270, 1);
        for (const t of [V(3.0, 0, 2.9), V(3.0, 0, 5.4), V(5.4, 0, 5.4)]) { table(fac, g, t); U.Box('Fincan', g, V(t.x + 0.2, 0.7, t.z - 0.15), V(0.14, 0.1, 0.14), Col.white, 'Cylinder'); }
        for (const s of this.spots) chair('chairRounded', g, s.p, s.look);
        U.Box('Tahta', g, V(7.2, 0.55, 5.8), V(0.5, 0.75, 0.05), C(0.2, 0.28, 0.24)); U.Box('TahtaCerceve', g, V(7.2, 0.55, 5.76), V(0.58, 0.83, 0.03), C(0.72, 0.5, 0.32));
        U.Text(g, V(7.2, 0.62, 5.86), '☕ MENÜ', 0.035, C(1, 0.95, 0.8), false, true).makeFlat(true, 0);
        const l = U.Prim('KafeLamba', g, V(6.6, 2.5, 3.8), V(0.55, 0.3, 0.55), U.Mat(C(1, 0.9, 0.7)), 'Cone'); fix(l, C(1, 0.9, 0.6)); halo(fac, g, V(6.6, 2.4, 3.8), 1.8, C(1, 0.9, 0.6));
        U.Box('Zincir', g, V(6.6, 3.0, 3.8), V(0.04, 0.7, 0.04), C(0.6, 0.6, 0.65));
        lamp(fac, V(6.6, 2.3, 3.8), 6, 0.9, warm);
        U.Model('pottedPlant', g, V(7.9, 0, 6.2), 0, 1);
        U.Text(g, V(4.9, 2.4, 1.7), 'KAFE', 0.06, C(0.55, 0.35, 0.2), true, true);
      },
    },
    restoran: {
      mode: 'table', entry: V(3.8, 0, -1.2), serve: V(6.3, 0, -5.0), serveLook: V(6.3, 0, -3), cook: V(6.3, 0, -6.38), cookLook: V(6.3, 0, -5), label: V(5.0, 0, -4.1),
      enjoy: 9, waitText: 'Yemek bekliyor', item: Col.white, sat: 0.5, staffTime: 2.2,
      spots: [
        { p: V(3.0, 0, -2.0), look: V(3.0, 0, -3.0), act: 'sit', dy: 0.4, at: V(3.9, 0, -2.1) }, { p: V(3.0, 0, -4.0), look: V(3.0, 0, -3.0), act: 'sit', dy: 0.4, at: V(3.9, 0, -4.0) },
        { p: V(3.9, 0, -5.3), look: V(3.0, 0, -5.3), act: 'sit', dy: 0.4, at: V(4.5, 0, -5.0) },
        { p: V(5.5, 0, -2.0), look: V(5.5, 0, -3.0), act: 'sit', dy: 0.4, at: V(6.3, 0, -2.0) }, { p: V(5.5, 0, -4.0), look: V(5.5, 0, -3.0), act: 'sit', dy: 0.4, at: V(6.3, 0, -4.1) },
        { p: V(7.8, 0, -2.0), look: V(7.8, 0, -3.0), act: 'sit', dy: 0.4, at: V(7.0, 0, -2.0) }, { p: V(7.8, 0, -4.0), look: V(7.8, 0, -3.0), act: 'sit', dy: 0.4, at: V(7.0, 0, -4.1) },
      ],
      build(g, fac) {
        removeNear(S.lobbyG, 'pottedPlant', 5.6, -5.8);
        U.Prim('RestoranZemin', g, V(5.0, 0.02, -4.1), V(6.6, 0.03, 4.9), U.Mat(C(0.84, 0.66, 0.5), { tex: U.WoodTex, tiling: { x: 3, y: 2 } })).castShadow = false;
        U.Prim('Fayans', g, V(6.5, 1.1, -6.58), V(3.8, 2.2, 0.06), U.Mat(C(0.88, 0.95, 0.93), { tex: U.TileTex, tiling: { x: 3, y: 2 } })).castShadow = false;
        for (const x of [5.15, 5.91, 6.67, 7.43]) U.Model('kitchenBar', g, V(x, 0, -5.85), 0, 1);
        U.Model('kitchenBarEnd', g, V(4.68, 0, -5.85), 0, 1); U.Model('kitchenBarEnd', g, V(7.9, 0, -5.85), 0, 1);
        U.Box('Ocak', g, V(6.3, 0.78, -5.85), V(0.7, 0.06, 0.34), C(0.25, 0.25, 0.28));
        U.Box('Tencere', g, V(6.15, 0.9, -5.85), V(0.26, 0.16, 0.26), C(0.85, 0.3, 0.3), 'Cylinder'); U.Box('Tencere2', g, V(6.5, 0.88, -5.85), V(0.22, 0.12, 0.22), C(0.9, 0.9, 0.92), 'Cylinder');
        U.Box('Davlumbaz', g, V(6.3, 2.25, -6.1), V(1.1, 0.35, 0.6), C(0.8, 0.82, 0.86));
        U.Box('Tabaklar', g, V(5.2, 0.8, -5.85), V(0.36, 0.1, 0.36), Col.white, 'Cylinder');
        U.Box('Kesme', g, V(7.4, 0.77, -5.85), V(0.4, 0.04, 0.3), C(0.75, 0.55, 0.35));
        for (const t of [V(3.0, 0, -3.0), V(3.0, 0, -5.3), V(5.5, 0, -3.0), V(7.8, 0, -3.0)]) {
          table(fac, g, t); U.Box('Ortu', g, V(t.x, 0.66, t.z), V(1.0, 0.02, 1.0), C(0.98, 0.9, 0.9), 'Cylinder');
          candle(fac, g, V(t.x, 0.67, t.z)); U.Box('Pecete', g, V(t.x + 0.3, 0.7, t.z + 0.2), V(0.14, 0.06, 0.14), C(0.9, 0.3, 0.35), 'Cylinder');
        }
        for (const s of this.spots) chair('chairCushion', g, s.p, s.look);
        U.Model('pottedPlant', g, V(1.9, 0, -6.3), 0, 1);
        halo(fac, g, V(5.5, 1.1, -3.5), 2.4, C(1, 0.75, 0.4));
        lamp(fac, V(5.5, 2.2, -3.5), 7, 0.8, warm);
        U.Text(g, V(5.0, 2.6, -6.45), 'RESTORAN', 0.065, C(0.65, 0.3, 0.3), true, true);
      },
    },
    spa: {
      mode: 'table', entry: V(-3.8, 0, -1.2), serve: V(-9.7, 0, -6.2), serveLook: V(-9.7, 0, -4), label: V(-7.9, 0, -4.1),
      enjoy: 10, waitText: 'Masaj bekliyor', item: C(1, 0.6, 0.75), sat: 0.8, staffTime: 2.6,
      spots: [
        { p: V(-10.8, 0, -4.4), dy: 0.75, feet: 0.85, act: 'lie', look: V(-10.8, 0, -2), at: V(-9.7, 0, -4.4) },
        { p: V(-8.6, 0, -4.4), dy: 0.75, feet: 0.85, act: 'lie', look: V(-8.6, 0, -2), at: V(-7.5, 0, -4.4) },
        { p: V(-5.5, 0, -4.3), dy: 0.3, act: 'sit', look: V(-4.5, 0, -4.3), self: true },
        { p: V(-4.5, 0, -4.3), dy: 0.3, act: 'sit', look: V(-5.5, 0, -4.3), self: true },
      ],
      build(g, fac) {
        U.Prim('SpaZemin', g, V(-7.9, 0.02, -4.1), V(9.2, 0.03, 4.9), U.Mat(C(0.9, 0.82, 0.7), { tex: U.WoodTex, tiling: { x: 4, y: 2 } })).castShadow = false;
        for (const x of [-10.8, -8.6]) {
          U.Model('bedSingle', g, V(x, 0, -4.4), 0, 1);
          U.Box('Havlu', g, V(x, 0.72, -3.5), V(0.44, 0.1, 0.3), Col.white); U.Box('Havlu2', g, V(x, 0.72, -5.25), V(0.3, 0.14, 0.14), C(0.6, 0.85, 0.8), 'Cylinder');
        }
        // jakuzi
        const J = V(-5.0, 0, -4.3);
        U.Box('Jakuzi', g, V(J.x, 0.4, J.z), V(2.8, 0.8, 2.8), C(0.86, 0.83, 0.78), 'Cylinder');
        U.Box('JakuziIc', g, V(J.x, 0.41, J.z), V(2.4, 0.8, 2.4), C(0.35, 0.6, 0.8), 'Cylinder');
        water(g, V(J.x, 0.76, J.z), V(2.3, 0.02, 2.3), C(0.45, 0.82, 1, 0.7));
        for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.3 + (i % 3) * 0.3; U.Flat('Kabarcik', g, V(J.x + Math.cos(a) * r, 0.8, J.z + Math.sin(a) * r), V(0.12, 0.06, 0.12), C(1, 1, 1, 0.8), 'Sphere'); }
        U.Box('Basamak', g, V(J.x, 0.2, J.z + 1.65), V(0.9, 0.4, 0.5), C(0.86, 0.83, 0.78));
        // mum rafı
        U.Box('Raf', g, V(-8.2, 1.05, -6.5), V(4.2, 0.06, 0.28), C(0.75, 0.6, 0.45));
        for (let i = 0; i < 6; i++) candle(fac, g, V(-9.7 + i * 0.6, 1.08, -6.5), i % 2 ? C(1, 0.98, 0.9) : C(0.9, 0.7, 0.8));
        halo(fac, g, V(-8.2, 1.4, -6.45), 2.4, C(1, 0.75, 0.4));
        // bitkiler, alçak saksı sırası (lobiden ayırır)
        U.Model('pottedPlant', g, V(-3.6, 0, -6.2), 0, 1); U.Model('plantSmall3', g, V(-12.2, 0, -2.1), 0, 3);
        const parts = [];
        for (let x = -12.2; x <= -9.2; x += 1.0) { parts.push({ geo: 'Round', pos: V(x, 0.25, -1.75), scale: V(0.9, 0.5, 0.4), c: C(0.6, 0.45, 0.35) }, { geo: 'Round', pos: V(x, 0.65, -1.75), scale: V(0.9, 0.4, 0.45), c: C(0.45, 0.7, 0.45) }); }
        U.Merge('Saksilar', g, parts);
        // taş yığını, sepet
        U.Box('Tas1', g, V(-6.8, 0.1, -6.2), V(0.4, 0.2, 0.35), C(0.6, 0.6, 0.62), 'Sphere'); U.Box('Tas2', g, V(-6.8, 0.28, -6.2), V(0.3, 0.16, 0.26), C(0.7, 0.7, 0.72), 'Sphere');
        lamp(fac, V(-8, 2.2, -4.3), 7, 0.7, C(1, 0.75, 0.55));
        U.Text(g, V(-8.0, 2.6, -6.45), 'SPA', 0.07, C(0.45, 0.35, 0.6), true, true);
      },
    },
    havuz: {
      mode: 'self', serve: V(6.4, 0, -2.2), serveLook: V(0.8, 0, 0), guard: V(6.4, 0, -2.2), guardDy: 1.45, label: V(0.8, 0, 1.6),
      enjoy: 99, waitText: '', item: C(0.5, 0.8, 1), sat: 0.5, pool: { x0: -2.6, x1: 4.2, z0: -1.9, z1: 1.9 },
      spots: [
        { p: V(-2.2, 0, 3.3), look: V(-2.2, 0, 0), act: 'lie', dy: 0.42, pitch: 62, feet: 0.45, edge: V(-2.2, 0, 3.0) }, { p: V(0, 0, 3.3), look: V(0, 0, 0), act: 'lie', dy: 0.42, pitch: 62, feet: 0.45, edge: V(0, 0, 3.0) }, { p: V(2.2, 0, 3.3), look: V(2.2, 0, 0), act: 'lie', dy: 0.42, pitch: 62, feet: 0.45, edge: V(2.2, 0, 3.0) },
        { p: V(5.6, 0, -0.9), look: V(0.8, 0, -0.9), act: 'lie', dy: 0.42, pitch: 62, feet: 0.45, edge: V(5.3, 0, -0.9) }, { p: V(5.6, 0, 1.1), look: V(0.8, 0, 1.1), act: 'lie', dy: 0.42, pitch: 62, feet: 0.45, edge: V(5.3, 0, 1.1) },
      ],
      build(g, fac) {
        U.Prim('Deck', g, V(1.05, 0.015, 0.25), V(9.9, 0.03, 7.3), U.Mat(C(0.9, 0.86, 0.78), { tex: U.WoodTex, tiling: { x: 5, y: 3 } })).castShadow = false;
        U.Box('Havuz', g, V(0.8, 0.22, 0), V(8, 0.44, 5), C(0.55, 0.8, 0.95));
        const dip = U.Box('HavuzDip', g, V(0.8, 0.3, 0), V(7.7, 0.3, 4.7), C(0.35, 0.65, 0.9)); fix(dip, C(0.4, 0.75, 1));
        const su = water(g, V(0.8, 0.46, 0), V(7.8, 4.8, 1), C(0.45, 0.82, 1, 0.55), 'Quad'); su.rotation.x = -Math.PI / 2;
        const rimC = C(0.93, 0.9, 0.85);
        U.Box('Kenar', g, V(0.8, 0.25, -2.65), V(8.7, 0.5, 0.3), rimC); U.Box('Kenar', g, V(0.8, 0.25, 2.65), V(8.7, 0.5, 0.3), rimC);
        U.Box('Kenar', g, V(-3.35, 0.25, 0), V(0.3, 0.5, 5.6), rimC); U.Box('Kenar', g, V(4.95, 0.25, 0), V(0.3, 0.5, 5.6), rimC);
        const lad = []; for (const z of [0.7, 1.2]) lad.push({ geo: 'Cylinder', pos: V(5.1, 0.6, z), scale: V(0.06, 0.9, 0.06), c: C(0.85, 0.87, 0.9) }); for (const y of [0.55, 0.8]) lad.push({ geo: 'Cube', pos: V(5.1, y, 0.95), scale: V(0.05, 0.05, 0.5), c: C(0.85, 0.87, 0.9) }); U.Merge('Merdiven', g, lad);
        for (const s of this.spots) U.Model('loungeChairRelax', g, V(s.p.x, 0, s.p.z), yawDeg(s.p, s.look) + RELAX_YAW, 1);
        for (const [x, z, c] of [[-1.1, 3.6, C(1, 0.6, 0.55)], [1.1, 3.6, C(0.5, 0.75, 0.95)]]) {
          U.Box('Direk', g, V(x, 1.1, z), V(0.06, 2.2, 0.06), C(0.95, 0.95, 0.95), 'Cylinder');
          U.Box('Semsiye', g, V(x, 2.35, z), V(1.9, 0.5, 1.9), c, 'Cone');
          U.Box('Sehpa', g, V(x, 0.22, z - 0.5), V(0.42, 0.44, 0.42), C(0.95, 0.95, 0.95), 'Cylinder');
        }
        // cankurtaran kulesi
        const G = this.guard; const tw = [];
        for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) tw.push({ geo: 'Cube', pos: V(G.x + dx, 0.7, G.z + dz), scale: V(0.08, 1.4, 0.08), c: C(0.95, 0.95, 0.95) });
        tw.push({ geo: 'Cube', pos: V(G.x, 1.4, G.z), scale: V(0.8, 0.08, 0.8), c: C(0.95, 0.4, 0.35) }, { geo: 'Cube', pos: V(G.x, 1.75, G.z + 0.35), scale: V(0.8, 0.6, 0.06), c: C(0.95, 0.4, 0.35) });
        tw.push({ geo: 'Cube', pos: V(G.x, 0.9, G.z - 0.5), scale: V(0.3, 0.04, 0.4), c: C(0.9, 0.9, 0.9) }, { geo: 'Cube', pos: V(G.x, 0.5, G.z - 0.5), scale: V(0.3, 0.04, 0.4), c: C(0.9, 0.9, 0.9) });
        U.Merge('Kule', g, tw);
        U.Box('Simit', g, V(G.x - 0.6, 0.45, G.z), V(0.6, 0.6, 0.12), C(0.95, 0.4, 0.35), 'Torus');
        lamp(fac, V(0.8, 1.8, 0), 9, 0.9, C(0.5, 0.8, 1));
      },
    },
    bar: {
      mode: 'counter', serve: V(6.4, 0, -5.75), serveLook: V(6.4, 0, -4), wait: V(4.3, 0, -4.4), waitLook: V(6, 0, -5), qdir: V(-0.1, 0, 0.75), label: V(6.4, 0, -5.0),
      enjoy: 8, waitText: 'İçecek bekliyor', item: C(1, 0.7, 0.3), sat: 0.5, staffTime: 2.0,
      spots: [{ p: V(5.4, 0, -4.35), look: V(5.4, 0, -5.5), act: 'sit', dy: 0.55 }, { p: V(6.4, 0, -4.35), look: V(6.4, 0, -5.5), act: 'sit', dy: 0.55 }, { p: V(7.4, 0, -4.35), look: V(7.4, 0, -5.5), act: 'sit', dy: 0.55 }],
      build(g, fac) {
        U.Prim('BarZemin', g, V(6.4, 0.015, -5.1), V(5.4, 0.03, 3.1), U.Mat(C(0.55, 0.42, 0.34), { tex: U.WoodTex, tiling: { x: 3, y: 2 } })).castShadow = false;
        U.Box('ArkaBar', g, V(6.4, 0.6, -6.35), V(3.6, 1.2, 0.35), C(0.4, 0.3, 0.26));
        U.Box('RafTahta', g, V(6.4, 1.24, -6.35), V(3.6, 0.05, 0.3), C(0.55, 0.42, 0.34));
        const bottles = []; for (let i = 0; i < 9; i++) bottles.push({ geo: 'Cylinder', pos: V(5.0 + i * 0.35, 1.42, -6.35), scale: V(0.11, 0.32, 0.11), c: pastel[i % pastel.length] }, { geo: 'Cylinder', pos: V(5.0 + i * 0.35, 1.62, -6.35), scale: V(0.05, 0.1, 0.05), c: C(0.3, 0.3, 0.3) });
        U.Merge('Siseler', g, bottles);
        for (const x of [5.26, 6.02, 6.78, 7.54]) U.Model('kitchenBar', g, V(x, 0, -5.1), 0, 1);
        U.Model('kitchenBarEnd', g, V(4.79, 0, -5.1), 0, 1); U.Model('kitchenBarEnd', g, V(8.01, 0, -5.1), 0, 1);
        const gl = []; for (let i = 0; i < 4; i++) gl.push({ geo: 'Cylinder', pos: V(5.1 + i * 0.3, 0.84, -5.2), scale: V(0.1, 0.16, 0.1), c: C(0.9, 0.97, 1) }); gl.push({ geo: 'Cylinder', pos: V(7.5, 0.82, -5.1), scale: V(0.3, 0.12, 0.3), c: C(1, 0.8, 0.3) }); U.Merge('Bardaklar', g, gl);
        for (const s of this.spots) { U.Box('Tabure', g, V(s.p.x, 0.3, s.p.z), V(0.42, 0.6, 0.42), C(0.9, 0.6, 0.3), 'Cylinder'); U.Box('TabureAyak', g, V(s.p.x, 0.02, s.p.z), V(0.5, 0.04, 0.5), C(0.3, 0.3, 0.32), 'Cylinder'); }
        // direkler ve ışık zinciri
        const poles = [V(4.0, 0, -6.3), V(8.8, 0, -6.3), V(4.0, 0, -3.8), V(8.8, 0, -3.8)];
        for (const p of poles) U.Box('Direk', g, V(p.x, 1.3, p.z), V(0.08, 2.6, 0.08), C(0.3, 0.3, 0.33), 'Cylinder');
        const bulbs = [], wires = [];
        const string = (a, b, n) => { let prev = null; for (let i = 0; i <= n; i++) { const t = i / n, p = V(Mathf.Lerp(a.x, b.x, t), 2.55 - Math.sin(t * Math.PI) * 0.35, Mathf.Lerp(a.z, b.z, t)); if (i % 2 === 1) bulbs.push({ geo: 'Sphere', pos: V(p.x, p.y - 0.08, p.z), scale: V(0.16, 0.16, 0.16), c: C(1, 0.92, 0.65) }); if (prev) { const m = Vec.lerp(prev, p, 0.5), d = Vec.sub(p, prev), L = Vec.len(d); wires.push({ geo: 'Cube', pos: m, scale: V(L, 0.025, 0.025), c: C(0.2, 0.2, 0.22), rot: Math.atan2(d.x, d.z) * Mathf.Rad2Deg - 90, rz: Math.asin(Mathf.Clamp(d.y / L, -1, 1)) * Mathf.Rad2Deg }); } prev = p; } };
        string(poles[0], poles[1], 12); string(poles[2], poles[3], 12); string(poles[0], poles[3], 14); string(poles[1], poles[2], 14);
        const bm = U.Merge('Ampuller', g, bulbs); U.NoShadow(bm); fix(bm, C(1, 0.85, 0.5)); U.Merge('Teller', g, wires).castShadow = false;
        for (const p of [V(5.2, 2.3, -6.3), V(7.6, 2.3, -6.3), V(6.4, 2.25, -5.05), V(5.2, 2.3, -3.8), V(7.6, 2.3, -3.8)]) halo(fac, g, p, 1.6, C(1, 0.85, 0.5));
        lamp(fac, V(6.4, 2.3, -5.0), 8, 1.0, C(1, 0.8, 0.5));
        U.Model('plantSmall2', g, V(4.2, 0, -5.9), 0, 1.1); U.Model('plantSmall2', g, V(8.6, 0, -5.9), 0, 1.1);
        U.Text(g, V(6.4, 2.0, -6.5), 'ÇATI BARI', 0.06, C(1, 0.85, 0.4), true, true);
      },
    },
    bahce: {
      mode: 'self', entry: V(-4.4, 0, 0.5), serve: V(-8.0, 0, -1.7), serveLook: V(-8, 0, 0.3), label: V(-8, 0, 0.3),
      enjoy: 5, waitText: '', item: C(1, 0.6, 0.75), sat: 0.5, stroll: [V(-8.0, 0, -1.7), V(-9.8, 0, -0.4), V(-8.0, 0, 2.3)],
      beds: [V(-11.0, 0, -2.4), V(-11.0, 0, 3.4), V(-5.4, 0, -2.4), V(-5.4, 0, 3.4)], bedWork: [V(-9.9, 0, -2.4), V(-9.9, 0, 3.4), V(-6.5, 0, -2.4), V(-6.5, 0, 3.4)],
      spots: [{ p: V(-5.6, 0, 0.6), look: V(-8, 0, 0.6), act: 'sit', dy: 0.4 }, { p: V(-9.7, 0, 1.6), look: V(-8, 0, 0.3), act: 'sit', dy: 0.4 }],
      build(g, fac) {
        U.Prim('Cim', g, V(-8, 0.015, 0.3), V(7.6, 0.03, 12.0), U.Mat(C(0.56, 0.78, 0.42), { tex: U.GrassTex, tiling: { x: 3, y: 5 } })).castShadow = false;
        U.Flat('Patika', g, V(-8, 0.025, 0.3), V(1.1, 0.02, 11.4), C(0.88, 0.84, 0.76)); U.Flat('Patika2', g, V(-8, 0.025, 0.5), V(7.0, 0.02, 1.0), C(0.88, 0.84, 0.76));
        // çeşme
        const Fp = V(-8, 0, 0.3);
        U.Box('Cesme', g, V(Fp.x, 0.25, Fp.z), V(2.2, 0.5, 2.2), C(0.85, 0.82, 0.78), 'Cylinder');
        U.Box('CesmeIc', g, V(Fp.x, 0.26, Fp.z), V(1.9, 0.5, 1.9), C(0.4, 0.6, 0.75), 'Cylinder');
        water(g, V(Fp.x, 0.47, Fp.z), V(1.9, 0.02, 1.9), C(0.5, 0.85, 1, 0.75));
        U.Box('Sutun', g, V(Fp.x, 0.75, Fp.z), V(0.4, 0.9, 0.4), C(0.85, 0.82, 0.78), 'Cylinder'); U.Box('Kase', g, V(Fp.x, 1.18, Fp.z), V(0.9, 0.12, 0.9), C(0.85, 0.82, 0.78), 'Cylinder');
        U.Flat('Fiskiye', g, V(Fp.x, 1.45, Fp.z), V(0.25, 0.5, 0.25), C(0.8, 0.95, 1, 0.7), 'Sphere');
        // çiçek tarhları (açma durumu bloom ile ölçeklenir)
        const rnd = new SysRandom(21);
        this.beds.forEach((b, bi) => {
          U.Box('Tarh', g, V(b.x, 0.15, b.z), V(1.4, 0.3, 1.4), C(0.45, 0.32, 0.22));
          const edge = []; for (const [dx, dz, sx, sz] of [[0, -0.7, 1.5, 0.1], [0, 0.7, 1.5, 0.1], [-0.7, 0, 0.1, 1.5], [0.7, 0, 0.1, 1.5]]) edge.push({ geo: 'Cube', pos: V(b.x + dx, 0.18, b.z + dz), scale: V(sx, 0.36, sz), c: C(0.8, 0.76, 0.7) }); U.Merge('TarhKenar', g, edge);
          const piv = U.Pivot(g, V(b.x, 0.3, b.z), 'Cicekler'); S.flowerPivots.push(piv);
          const fl = [];
          for (let i = 0; i < 12; i++) { const x = rnd.Range(-0.5, 0.5), z = rnd.Range(-0.5, 0.5), h = rnd.Range(0.22, 0.4); fl.push({ geo: 'Cylinder', pos: V(x, h / 2, z), scale: V(0.04, h, 0.04), c: C(0.35, 0.6, 0.3) }, { geo: 'Sphere', pos: V(x, h + 0.08, z), scale: V(0.22, 0.2, 0.22), c: pastel[(bi + i) % pastel.length] }); }
          U.Merge('Cicek', piv, fl);
          const wl = []; for (let i = 0; i < 6; i++) wl.push({ geo: 'Sphere', pos: V(rnd.Range(-0.5, 0.5), 0.06, rnd.Range(-0.5, 0.5)), scale: V(0.2, 0.08, 0.2), c: C(0.55, 0.45, 0.3) });
          const wm = U.Merge('Solmus', g, wl.map(p => ({ ...p, pos: V(b.x + p.pos.x, 0.3 + p.pos.y, b.z + p.pos.z) }))); wm.visible = false; S.wilted.push(wm);
        });
        // çitler
        const hedge = []; for (let z = -5.5; z <= 5.5; z += 1.0) hedge.push({ geo: 'Round', pos: V(-12.15, 0.4, z), scale: V(0.55, 0.8, 0.9), c: C(0.35, 0.6, 0.35) });
        for (let x = -11.6; x <= -5.6; x += 1.0) hedge.push({ geo: 'Round', pos: V(x, 0.4, 6.1), scale: V(0.9, 0.8, 0.55), c: C(0.35, 0.6, 0.35) });
        for (const x of [-11.6, -10.6]) hedge.push({ geo: 'Round', pos: V(x, 0.4, -6.1), scale: V(0.9, 0.8, 0.55), c: C(0.35, 0.6, 0.35) });
        U.Merge('Citler', g, hedge);
        for (const s of this.spots) U.Model('loungeChair', g, V(s.p.x, 0, s.p.z), yawDeg(s.p, s.look) + CHAIR_YAW, 1);
        for (const p of [V(-11.2, 0, 5.4), V(-5.0, 0, -4.6)]) { U.Box('Direk', g, V(p.x, 1.2, p.z), V(0.08, 2.4, 0.08), C(0.3, 0.3, 0.33), 'Cylinder'); glowBall(fac, g, V(p.x, 2.5, p.z), 0.32, C(1, 0.9, 0.6), 1.8); lamp(fac, V(p.x, 2.4, p.z), 7, 0.8, warm); }
        U.Model('plantSmall1', g, V(-6.4, 0, -4.6), 0, 2.5); U.Model('plantSmall3', g, V(-11.2, 0, -5.7), 0, 2.5);
        U.Text(g, V(-8, 2.4, 5.9), 'BAHÇE', 0.06, C(0.95, 0.5, 0.6), true, true);
      },
    },
    spor: {
      mode: 'self', serve: V(7.75, 0, 4.7), serveLook: V(9, 0, 4.7), label: V(7.75, 0, 4.7),
      enjoy: 9, waitText: '', item: C(0.6, 0.8, 1), sat: 0.4, fee: 9,
      spots: [
        { p: V(8.3, 0, 3.8), look: V(9.5, 0, 3.8), act: 'tread', dy: 0.19 }, { p: V(8.3, 0, 5.2), look: V(9.5, 0, 5.2), act: 'tread', dy: 0.19 },
        { p: V(6.9, 0, 3.8), look: V(9.5, 0, 3.8), act: 'mat' }, { p: V(6.9, 0, 5.0), look: V(9.5, 0, 5.0), act: 'mat' },
      ],
      build(g, fac) {
        removeNear(S.roofG, 'plantSmall2', 6, 5.2);
        U.Prim('SporZemin', g, V(7.75, 0.015, 4.7), V(2.7, 0.03, 3.2), U.Mat(C(0.45, 0.5, 0.62))).castShadow = false;
        for (const z of [3.8, 5.2]) {
          U.Box('Bant', g, V(8.3, 0.09, z), V(1.5, 0.18, 0.7), C(0.25, 0.27, 0.3)); U.Box('BantUst', g, V(8.25, 0.19, z), V(1.2, 0.02, 0.5), C(0.45, 0.47, 0.5));
          U.Box('Konsol', g, V(9.0, 0.7, z), V(0.08, 1.0, 0.6), C(0.3, 0.32, 0.36)); const sc = U.Box('Ekran', g, V(9.0, 1.25, z), V(0.06, 0.3, 0.5), C(0.3, 0.6, 0.95)); fix(sc, C(0.4, 0.7, 1));
          U.Box('Tutamak', g, V(8.75, 1.05, z), V(0.5, 0.04, 0.6), C(0.6, 0.6, 0.64));
        }
        U.Flat('Minder', g, V(6.9, 0.03, 3.8), V(0.75, 0.05, 1.7), C(0.6, 0.4, 0.8)); U.Flat('Minder', g, V(6.9, 0.03, 5.0), V(0.75, 0.05, 1.7), C(0.4, 0.75, 0.75));
        U.Box('Raf', g, V(7.1, 0.3, 6.1), V(1.3, 0.08, 0.35), C(0.3, 0.32, 0.36)); U.Box('RafAyak', g, V(6.55, 0.15, 6.1), V(0.06, 0.3, 0.3), C(0.3, 0.32, 0.36)); U.Box('RafAyak', g, V(7.65, 0.15, 6.1), V(0.06, 0.3, 0.3), C(0.3, 0.32, 0.36));
        const db = []; [[6.65, C(0.95, 0.45, 0.4)], [6.95, C(0.3, 0.6, 0.95)], [7.25, C(0.4, 0.75, 0.45)], [7.55, C(1, 0.8, 0.3)]].forEach(([x, c]) => { db.push({ geo: 'Cylinder', pos: V(x, 0.4, 6.1), scale: V(0.05, 0.3, 0.05), c: C(0.6, 0.6, 0.64), rot: 0, rx: 90 }, { geo: 'Cylinder', pos: V(x, 0.4, 5.97), scale: V(0.14, 0.08, 0.14), c, rx: 90 }, { geo: 'Cylinder', pos: V(x, 0.4, 6.23), scale: V(0.14, 0.08, 0.14), c, rx: 90 }); });
        U.Merge('Agirliklar', g, db);
        U.Box('Sebil', g, V(8.6, 0.5, 6.1), V(0.35, 1.0, 0.35), C(0.9, 0.9, 0.92)); U.Box('SebilSu', g, V(8.6, 1.2, 6.1), V(0.4, 0.42, 0.4), C(0.5, 0.8, 1, 0.75), 'Sphere');
        U.Box('Ayna', g, V(9.05, 1.3, 4.5), V(0.04, 1.4, 2.6), C(0.75, 0.85, 0.95));
        lamp(fac, V(7.75, 2.2, 4.7), 6, 0.6, C(0.85, 0.9, 1));
        U.Text(g, V(7.75, 2.2, 3.2), 'SPOR', 0.055, C(0.3, 0.45, 0.8), true, true);
      },
    },
  };

  // misafir türüne göre tercih ağırlıkları
  const Prefs = {
    turist: { kafe: 2, restoran: 1.5, havuz: 2, bar: 1.5, bahce: 1, spor: 0.5, spa: 1 },
    ogrenci: { kafe: 2.5, spor: 2, havuz: 1, bahce: 0.5, restoran: 0.3, bar: 0.8, spa: 0.2 },
    is: { kafe: 3, restoran: 1.5, bar: 1.5, spa: 0.7, spor: 0.7, havuz: 0.3, bahce: 0.3 },
    aile: { havuz: 3, restoran: 1.5, bahce: 1.5, kafe: 1, spor: 0.2, bar: 0.1, spa: 0.4 },
    emekli: { bahce: 3, spa: 1.5, restoran: 1.5, kafe: 1.5, havuz: 0.5, bar: 0.5, spor: 0.1 },
    balayi: { spa: 3, restoran: 2.5, bar: 2, havuz: 1, bahce: 1, kafe: 0.5, spor: 0.2 },
    sporcu: { spor: 4, havuz: 2, kafe: 0.5, bahce: 0.3, restoran: 0.8, bar: 0.2, spa: 0.5 },
    huysuz: { spa: 2, kafe: 1.5, restoran: 1.5, bahce: 1, havuz: 0.5, bar: 0.7, spor: 0.3 },
    milyoner: { restoran: 2.5, spa: 2, bar: 2, havuz: 1, bahce: 1, kafe: 1, spor: 0.5 },
    mufettis: { restoran: 2, kafe: 2, spa: 1, bar: 1, havuz: 0.5, bahce: 0.5, spor: 0.5 },
    fenomen: { havuz: 3, bar: 2.5, spa: 2, restoran: 1.5, kafe: 1.5, bahce: 1.2, spor: 0.8 },
    unlu: { spa: 3, bar: 2, restoran: 2, havuz: 1.5, bahce: 1, kafe: 0.5, spor: 0.5 },
    fotografci: { bahce: 3, havuz: 2, bar: 1.5, kafe: 1.5, restoran: 1, spa: 0.4, spor: 0.2 },
    yaslicift: { bahce: 3, restoran: 2, kafe: 1.5, spa: 1.5, havuz: 0.5, bar: 0.4, spor: 0.1 },
    gezgin: { kafe: 3, bahce: 2, havuz: 1.5, bar: 1.2, spor: 0.5, restoran: 0.6, spa: 0.2 },
    yazar: { kafe: 4, bahce: 2, restoran: 1.2, spa: 1, bar: 0.8, havuz: 0.4, spor: 0.2 },
  };

  // ---------------- kurulum ----------------
  function ensureFac(id) {
    if (S.fac[id]) return S.fac[id];
    const d = def(id), L = Layout[id];
    return S.fac[id] = { id, def: d, L, built: false, go: null, guests: [], spots: L.spots.map(s => Object.assign({ by: null }, s)), pwork: 0, cookT: -99, guardT: -99 };
  }
  function buildVis(fac) {
    const group = isRoof(fac) ? S.roofG : S.lobbyG;
    if (!group || fac.go || !fac.built) return;
    fac.go = U.Pivot(group, V(), 'Tesis_' + fac.id);
    fac.L.build(fac.go, fac);
    World.lit = -1;
  }
  function pathTo(pos, floor, fac, target, dy = 0) {
    const fi = FloorIdx(fac), y = WorldY(fac), T = V(target.x, y + dy, target.z);
    if (isRoof(fac)) {
      if (floor === fi) return [T];
      const a = RoofA(), b = RoofB(); a.y = b.y = y;
      return [...Hotel.Path(pos, floor, a, fi), b, T];
    }
    const e = fac.L.entry;
    if (floor === 0 && e && Math.abs(pos.x - e.x) < 6 && Math.abs(pos.z - e.z) < 6 && pos.z < Hotel.D / 2) {
      // yakınsa: giriş noktasından içeri
      return [V(e.x, 0, e.z), T];
    }
    return [...Hotel.Path(pos, floor, e ? V(e.x, 0, e.z) : T, 0), T];
  }
  function exitPath(fac, pos) {
    const y = WorldY(fac);
    if (isRoof(fac)) { const a = RoofA(), b = RoofB(); a.y = b.y = y; return [b, a, ...Hotel.Path(a, FloorIdx(fac), V(0, 0, 6.0), 0)]; }
    return null;
  }

  // ---------------- misafir akışı ----------------
  function freeSpots(fac, guest) { return fac.spots.filter(s => !s.by && (!s.only || s.only(guest))); }
  function startVisit(guest, fac) {
    const L = fac.L, spot = (S.forceSpot && !S.forceSpot.by) ? S.forceSpot : Random.Pick(freeSpots(fac, guest)); S.forceSpot = null; if (!spot) return false;
    spot.by = guest;
    const v = guest.fv = { fac, spot, phase: 'go', t: 0, q: 0, served: false, claimed: null, sub: 0 };
    guest.s = Guest.S.Visit; guest.rig.act = Rig.Act.None; guest.waited = 0;
    fac.guests.push(guest);
    if (L.mode === 'counter') {
      v.q = fac.guests.filter(g => g !== guest && g.fv && !g.fv.seated).length;
      const w = Vec.add(L.wait, Vec.mul(L.qdir, v.q));
      guest.path = pathTo(guest.pos, guest.floor, fac, w);
    } else if (L.stroll) {
      const y = WorldY(fac);
      guest.path = [...pathTo(guest.pos, guest.floor, fac, L.stroll[0]), ...L.stroll.slice(1).map(p => V(p.x, y, p.z)), V(spot.p.x, y, spot.p.z)];
    } else guest.path = pathTo(guest.pos, guest.floor, fac, spot.p);
    guest.ShowMood(fac.def.icon, C(1, 0.95, 0.7), 2);
    return true;
  }
  function seat(guest, fac, spot) {
    const v = guest.fv; v.seated = true;
    const y = WorldY(fac);
    guest.go.position.set(spot.p.x, y + (spot.dy || 0), spot.p.z);
    faceTo(guest.go, spot.p, spot.look);
    guest.rig.act = spot.act === 'sit' ? Rig.Act.Sit : spot.act === 'lie' ? Rig.Act.Lie : spot.act === 'mat' ? Rig.Act.Cheer : Rig.Act.None;
    if (spot.act === 'lie') { // sırt üstü uzan: ayaklar bakış yönünde, baş geride
      const d = Vec.norm(V(spot.look.x - spot.p.x, 0, spot.look.z - spot.p.z)), k = spot.feet ?? 0.5;
      guest.go.position.set(spot.p.x + d.x * k, y + (spot.dy || 0), spot.p.z + d.z * k);
      setEuler(guest.go, (Rig.CharYaw ? 1 : -1) * (spot.pitch ?? 90), yawDeg(spot.p, spot.look) + Rig.CharYaw, 0);
    }
    guest.rig.Tick(0);
  }
  function release(guest) {
    const v = guest.fv; if (!v) return;
    if (v.spot && v.spot.by === guest) v.spot.by = null;
    if (v.claimed && v.claimed.fx) { v.claimed.fx.target = null; }
    arrRemove(v.fac.guests, guest);
    guest.rig.act = Rig.Act.None; guest.go.rotation.x = 0;
    guest.fv = null;
  }
  function leave(guest, fac) {
    const y = WorldY(fac);
    guest.go.position.y = y;
    const v = guest.fv;
    if (isRoof(fac)) { v.phase = 'exit'; v.spot && v.spot.by === guest && (v.spot.by = null); v.spot = null; guest.path = exitPath(fac, guest.pos); return; }
    release(guest); guest.Depart(true);
  }
  function unhappy(guest, fac) {
    guest.sat -= 1; guest.ShowMood('😠', C(1, 0.6, 0.6), 3); Sfx.Play('bad', 0.4);
    guest.rig.act = Rig.Act.None; guest.go.rotation.x = 0;
    leave(guest, fac);
  }
  function finish(guest, fac) {
    const L = fac.L, v = guest.fv;
    let bonus = L.sat || 0.4;
    if (fac.id === 'havuz' && Time.time - fac.guardT < 3) bonus += 0.3;
    if (fac.id === 'bahce') bonus = 0.3 + 0.5 * S.bloom;
    guest.sat += bonus;
    const sat = Mathf.Clamp(guest.sat, 1, 5);
    let price = (L.fee ?? fac.def.price) * guest.type.pay;
    if (fac.id === 'bar' && World.IsNight) price *= 1.5;
    price = Math.round(price);
    const st = Game.st; st.facStats = st.facStats || {}; const fs = st.facStats[fac.id] = st.facStats[fac.id] || { n: 0, earn: 0 };
    fs.n++;
    if (price > 0) { const tip = sat >= 4 ? Math.round(price * 0.2) : 0; fs.earn += price + tip; Game.Earn(price, Vec.add(guest.pos, V(0, 1.7, 0)), tip); }
    else Tween.FloatText(Vec.add(guest.pos, V(0, 1.9, 0)), '♥', C(1, 0.55, 0.7), 0.14);
    guest.ShowMood(sat >= 4 ? '😍' : '😊', Col.white, 2.5);
    guest.rig.act = Rig.Act.None; guest.go.rotation.x = 0;
    leave(guest, fac);
  }
  function serve(fac, guest, byPlayer) {
    const v = guest.fv; if (!v) return;
    v.served = true; v.claimed = null;
    Sfx.Play('ding', 0.5);
    // tabak / fincan / bardak misafire uçar
    const from = fac.L.mode === 'table' ? WP(fac, fac.L.serve, 1.0) : WP(fac, fac.L.serve, 1.1);
    const item = U.Prim('Servis', W, from, fac.id === 'restoran' ? V(0.42, 0.05, 0.42) : fac.id === 'spa' ? V(0.3, 0.3, 0.3) : V(0.2, 0.26, 0.2), U.Mat(fac.L.item, 0.6), fac.id === 'spa' ? 'Sphere' : 'Cylinder');
    U.NoShadow(item); Tween.Fly(item, guest.go, null, 0);
    if (fac.id === 'spa') U.Burst(Vec.add(guest.pos, V(0, 1.6, 0)), C(1, 0.6, 0.75), C(1, 0.9, 0.95), 14, 2.5);
  }
  function frontWaiting(fac) {
    let best = null;
    for (const g of fac.guests) { const v = g.fv; if (!v || v.phase !== 'wait' || v.claimed || v.served || g.path.length) continue; if (!best || v.q < best.fv.q || (v.q === best.fv.q && v.t > best.fv.t)) best = g; }
    return best;
  }
  function reflow(fac) {
    if (fac.L.mode !== 'counter') return;
    const q = fac.guests.filter(g => g.fv && !g.fv.seated && !g.fv.served).sort((a, b) => a.fv.q - b.fv.q);
    q.forEach((g, i) => { if (g.fv.q !== i) { g.fv.q = i; if (g.fv.phase === 'wait' && !g.path.length) { const w = Vec.add(fac.L.wait, Vec.mul(fac.L.qdir, i)); g.path = [WP(fac, w)]; } } });
  }

  function guestTick(guest, dt) {
    const v = guest.fv;
    if (!v) { guest.Depart(true); return; }
    const fac = v.fac, L = fac.L;
    switch (v.phase) {
      case 'go':
        v.t = 0;
        if (L.mode === 'counter') { v.phase = 'wait'; faceTo(guest.go, guest.pos, WP(fac, L.waitLook)); break; }
        seat(guest, fac, v.spot);
        v.phase = (L.mode === 'self' || v.spot.self) ? 'enjoy' : 'wait';
        if (v.phase === 'enjoy' && fac.id === 'havuz') v.sub = 0;
        break;
      case 'wait':
        v.t += dt; guest.rig.Tick(0);
        if (v.served) {
          v.served = false; v.t = 0;
          if (!v.seated) { v.seated = true; v.phase = 'toSpot'; guest.path = [WP(fac, v.spot.p)]; }
          else v.phase = 'enjoy';
          break;
        }
        if (v.t > 6 && Math.floor(v.t) % 7 === 0 && guest.moodT <= 0) guest.ShowMood('⏳', C(1, 0.9, 0.5));
        if (v.t > PATIENCE) unhappy(guest, fac);
        break;
      case 'toSpot': seat(guest, fac, v.spot); v.phase = 'enjoy'; v.t = 0; break;
      case 'enjoy':
        v.t += dt;
        if (fac.id === 'havuz') { poolTick(guest, fac, dt); break; }
        if (v.spot.act === 'tread') guest.rig.Tick(1.1); else guest.rig.Tick(0);
        if (fac.id === 'bahce' && v.t > 1.5 && Random.Chance(dt * 0.4)) Particles.drift(Vec.add(guest.pos, V(Random.Range(-0.4, 0.4), 1.9, 0)), C(1, 0.6, 0.75), 0.12, 1.5, V(0, 0.8, 0));
        if (v.t >= L.enjoy) finish(guest, fac);
        break;
      case 'exit':
        release(guest); guest.Depart(true); break;
    }
  }
  // havuz: şezlongda uzan → suya gir → yüz → çık → uzan → öde
  function poolTick(guest, fac, dt) {
    const v = guest.fv, y = WorldY(fac), P = fac.L.pool, spot = v.spot;
    if (v.sub === 0) { guest.rig.Tick(0); if (v.t > 4) { v.sub = 1; v.t = 0; guest.rig.act = Rig.Act.None; guest.go.rotation.x = 0; guest.go.position.set(spot.p.x, y, spot.p.z); guest.path = [WP(fac, spot.edge)]; } return; }
    if (v.sub === 1) { // kenara geldi: suya atla
      v.sub = 2; v.t = 0; v.swimT = Random.Range(8, 12);
      guest.go.position.set(Mathf.Clamp(spot.edge.x, P.x0, P.x1), y - 0.25, Mathf.Clamp(spot.edge.z, P.z0, P.z1));
      U.Burst(Vec.add(guest.pos, V(0, 0.6, 0)), C(0.8, 0.95, 1), C(1, 1, 1), 24, 3.5);
      v.target = V(Random.Range(P.x0, P.x1), 0, Random.Range(P.z0, P.z1));
      return;
    }
    if (v.sub === 2) { // yüzüyor
      const p = guest.go.position, d = V(v.target.x - p.x, 0, v.target.z - p.z), m = Vec.len(d);
      if (m < 0.2) v.target = V(Random.Range(P.x0, P.x1), 0, Random.Range(P.z0, P.z1));
      else { const st = Math.min(m, 0.9 * dt); p.x += d.x / m * st; p.z += d.z / m * st; U.Face(guest.go, d); }
      p.y = y - 0.25 + Math.sin(v.t * 2.2) * 0.04;
      guest.rig.Tick(0.6);
      if (v.t > 1 && Random.Chance(dt * 0.6)) Particles.drift(Vec.add(p, V(Random.Range(-0.3, 0.3), 0.6, Random.Range(-0.3, 0.3))), C(0.9, 0.97, 1), 0.1, 0.8, V(0, 0.6, 0));
      if (v.t >= v.swimT) { v.sub = 3; v.t = 0; v.target = V(Mathf.Clamp(spot.edge.x, P.x0, P.x1), 0, Mathf.Clamp(spot.edge.z, P.z0, P.z1)); }
      return;
    }
    if (v.sub === 3) { // kenara yüz, çık
      const p = guest.go.position, d = V(v.target.x - p.x, 0, v.target.z - p.z), m = Vec.len(d);
      if (m < 0.15) { v.sub = 4; v.t = 0; p.y = y; p.set(spot.edge.x, y, spot.edge.z); guest.path = [WP(fac, spot.p)]; return; }
      const st = Math.min(m, 0.9 * dt); p.x += d.x / m * st; p.z += d.z / m * st; U.Face(guest.go, d); guest.rig.Tick(0.6);
      return;
    }
    if (v.sub === 4) { seat(guest, fac, spot); v.sub = 5; v.t = 0; return; }
    guest.rig.Tick(0);
    if (v.t > 3) finish(guest, fac);
  }

  // ---------------- personel ----------------
  const RoleFac = { barista: 'kafe', asci: 'restoran', garson: 'restoran', terapist: 'spa', cankurtaran: 'havuz', barmen: 'bar', bahcivan: 'bahce' };
  function near(a, b, r = 0.35) { return Math.abs(a.x - b.x) + Math.abs(a.z - b.z) < r; }
  function staffTick(staff, dt) {
    const id = RoleFac[staff.role]; const fac = id && S.fac[id];
    if (!fac || !fac.built) { staff.rig.Tick(0); return; }
    const fi = FloorIdx(fac), L = fac.L, x = staff.fx || (staff.fx = { target: null, bed: 0, w: 0 });
    const goTo = p => { staff.path = pathTo(staff.pos, staff.floor, fac, p); };
    if (staff.floor !== fi) { goTo(L.serve); return; }
    const role = staff.role;
    if (role === 'asci') {
      if (!near(staff.pos, L.cook)) { goTo(L.cook); return; }
      faceTo(staff.go, staff.pos, WP(fac, L.cookLook)); staff.rig.act = Rig.Act.Clean; staff.rig.Tick(0); fac.cookT = Time.time;
      if (Random.Chance(dt * 0.5)) Particles.drift(WP(fac, V(6.3, 1.1, -5.85)), C(0.95, 0.95, 0.95), 0.14, 1.4, V(0, 0.7, 0));
      return;
    }
    if (role === 'cankurtaran') {
      if (!near(staff.pos, L.guard, 0.3)) { goTo(L.guard); return; }
      staff.go.position.y = WorldY(fac) + L.guardDy; faceTo(staff.go, staff.pos, WP(fac, L.serveLook)); staff.rig.act = Rig.Act.Sit; staff.rig.Tick(0); fac.guardT = Time.time;
      return;
    }
    if (role === 'bahcivan') {
      if (S.bloom >= 0.98) { // dinlen: çeşme yanında
        staff.rig.act = Rig.Act.None;
        if (!near(staff.pos, L.serve, 0.4)) { if (!staff.path.length) goTo(L.serve); return; }
        faceTo(staff.go, staff.pos, WP(fac, L.serveLook)); staff.rig.Tick(0); return;
      }
      const wp = L.bedWork[x.bed % L.bedWork.length];
      if (!near(staff.pos, wp, 0.4)) { if (!staff.path.length) goTo(wp); staff.rig.act = Rig.Act.None; return; }
      faceTo(staff.go, staff.pos, WP(fac, L.beds[x.bed % L.beds.length])); staff.rig.act = Rig.Act.Clean; staff.rig.Tick(0);
      x.w += dt / 3.5 * (staff.Eff ?? 1); Game.ShowProgress(WP(fac, L.beds[x.bed % L.beds.length]), x.w);
      if (Random.Chance(dt * 2)) Particles.drift(WP(fac, Vec.add(L.beds[x.bed % L.beds.length], V(Random.Range(-0.5, 0.5), 0.6, Random.Range(-0.5, 0.5)))), C(0.5, 0.8, 1), 0.08, 0.8, V(0, -0.5, 0));
      if (x.w >= 1) { x.w = 0; setBloom(S.bloom + 0.34); x.bed++; staff.rig.act = Rig.Act.None; Sfx.Play('clean', 0.4); staff.GainXP && staff.GainXP(4); U.Burst(WP(fac, L.beds[(x.bed - 1) % L.beds.length], 0.6), C(1, 0.6, 0.75), C(1, 0.9, 0.5), 16, 2.5); }
      return;
    }
    // servis personeli: barista, garson, terapist, barmen
    let g = x.target;
    if (g && (!alive(g) || !g.fv || g.fv.fac !== fac || g.fv.phase !== 'wait' || g.fv.served)) { if (g && g.fv && g.fv.claimed === staff) g.fv.claimed = null; g = x.target = null; staff.work = 0; staff.rig.act = Rig.Act.None; }
    if (!g) {
      g = frontWaiting(fac);
      if (g) { g.fv.claimed = staff; x.target = g; staff.work = 0; }
      else {
        staff.rig.act = Rig.Act.None;
        if (!near(staff.pos, L.serve)) { if (!staff.path.length) goTo(L.serve); return; }
        faceTo(staff.go, staff.pos, WP(fac, L.serveLook)); staff.rig.Tick(0); return;
      }
    }
    const standAt = L.mode === 'table' ? g.fv.spot.at : L.serve;
    if (!near(staff.pos, standAt)) { if (!staff.path.length) staff.path = [WP(fac, standAt)]; staff.rig.act = Rig.Act.None; return; }
    faceTo(staff.go, staff.pos, L.mode === 'table' ? g.pos : WP(fac, L.serveLook)); staff.rig.act = Rig.Act.Clean; staff.rig.Tick(0);
    const speed = ((Time.time - fac.cookT < 3) ? 1.7 : 1) * (staff.Eff ?? 1); // aşçı varsa restoran hızlanır; seviye/moral (Staff.Eff)
    staff.work += dt / (L.staffTime || 2) * speed;
    Game.ShowProgress(WP(fac, L.mode === 'table' ? g.fv.spot.p : L.serve), staff.work);
    if (staff.work >= 1) { staff.work = 0; serve(fac, g, false); x.target = null; staff.rig.act = Rig.Act.None; if (staff.trait) g.sat += staff.trait.sat || 0; staff.GainXP && staff.GainXP(5); }
  }

  // ---------------- bahçe çiçeklenmesi ----------------
  function setBloom(b) {
    S.bloom = Mathf.Clamp01(b); Game.st.gardenBloom = S.bloom;
    const k = 0.35 + 0.65 * S.bloom;
    for (const p of S.flowerPivots) if (alive(p)) p.scale.set(k, k, k);
    for (const w of S.wilted) if (alive(w)) w.visible = S.bloom < 0.35;
  }

  // ---------------- oyuncu servisi ve etiketler ----------------
  function playerTick(dt) {
    const P = Game.player; if (!P || P.liftT > 0) return;
    let working = false;
    for (const id in S.fac) {
      const fac = S.fac[id]; if (!fac.built || fac.L.mode === 'self') continue;
      const fi = FloorIdx(fac); if (P.floor !== fi) { fac.pwork = 0; continue; }
      const g = fac.guests.find(x => x.fv && x.fv.phase === 'wait' && !x.fv.served && x.fv.claimed === P && !x.path.length) || frontWaiting(fac);
      if (!g) { fac.pwork = 0; continue; }
      const L = fac.L, spotP = L.mode === 'table' ? WP(fac, g.fv.spot.p) : null;
      const ok = P.Near(WP(fac, L.serve), 1.8) || (spotP && P.Near(spotP, 1.7)) || (L.mode === 'table' && P.Near(WP(fac, g.fv.spot.at), 1.2));
      if (!ok) { fac.pwork = 0; if (g.fv.claimed === P) g.fv.claimed = null; continue; }
      if (g.fv.claimed && g.fv.claimed !== P) { fac.pwork = 0; continue; }
      g.fv.claimed = P; working = true;
      fac.pwork += dt / 1.2; P.rig.act = Rig.Act.Clean;
      Game.ShowProgress(spotP || WP(fac, L.serve), fac.pwork);
      if (fac.pwork >= 1) { fac.pwork = 0; serve(fac, g, true); P.rig.act = Rig.Act.None; g.fv.claimed = null; }
      break;
    }
    if (!working && P.rig.act === Rig.Act.Clean && P.fvWork) P.rig.act = Rig.Act.None;
    P.fvWork = working;
  }
  function labels() {
    const view = Hotel.view, stars = Game.Stars;
    for (const d of Data.Facilities) {
      const fac = S.fac[d.id]; if (!fac) continue;
      const fi = FloorIdx(fac); if (view !== fi) continue;
      const L = fac.L;
      if (!fac.built) {
        if (stars >= d.unlock && Game.st.money >= d.cost * 0.5) UI.Label('fz' + d.id, WP(fac, L.label, 1.0), '➕ ' + d.icon + ' ' + d.name + ' ' + UI.fmt(d.cost), 'buy', () => Game.BuildSheet && Game.BuildSheet('tesis'));
        continue;
      }
      for (const g of fac.guests) {
        const v = g.fv; if (!v || v.phase !== 'wait' || g.path.length) continue;
        const txt = (v.t > PATIENCE * 0.6 ? '⏳ ' : d.icon + ' ') + L.waitText;
        UI.Label('fw' + g.id, Vec.add(g.pos, V(0, v.seated ? 1.9 : 2.3, 0)), txt, 'need', () => Game.player.GoTo(WP(fac, L.mode === 'table' ? v.spot.at : L.serve), fi));
      }
    }
  }

  // ---------------- satın alma ----------------
  function buy(id) {
    const fac = ensureFac(id), d = fac.def;
    if (fac.built) return false;
    if (Game.Stars < d.unlock) { UI.Toast(d.name + ' için ' + d.unlock + ' yıldız gerekir', 'bad'); return false; }
    if (!Game.Pay(d.cost)) return false;
    fac.built = true; Game.st.facilities = Game.st.facilities || {}; Game.st.facilities[id] = true;
    buildVis(fac);
    if (fac.go) Tween.Pop(fac.go, 0.2);
    U.Burst(WP(fac, fac.L.label, 1.2), C(1, 0.85, 0.3), C(0.5, 0.9, 1), 90, 6);
    Sfx.Play('build', 0.8); UI.Toast(d.icon + ' ' + d.name + ' açıldı!', 'good');
    Hotel.SetView(FloorIdx(fac));
    Game.Save(); Game.RefreshFloors && Game.RefreshFloors();
    if (UI.SheetOpen) UI.RenderSheet();
    return true;
  }

  function cleanupRoofRefs() {
    if (S.roofLamps.length) { const set = new Set(S.roofLamps); World.lamps = World.lamps.filter(l => !set.has(l)); S.roofLamps = []; }
    if (S.roofHalos.length) { const set = new Set(S.roofHalos); World.halos = World.halos.filter(h => !set.has(h)); S.roofHalos = []; }
    World.fixtures = World.fixtures.filter(f => alive(f.mesh));
    S.waters = S.waters.filter(w => alive(w.m)); S.flowerPivots = S.flowerPivots.filter(p => alive(p)); S.wilted = S.wilted.filter(p => alive(p));
    for (const id in S.fac) if (isRoof(S.fac[id])) S.fac[id].go = null;
    World.lit = -1;
  }
  // kat alınınca çatı yukarı taşınır: çatıdaki misafir ve personel yeni kata taşınır
  function onRoofMoved(oldIdx, newIdx) {
    const y = Hotel.FloorY(newIdx), fix1 = o => {
      if (o.floor === oldIdx) { o.floor = newIdx; o.pos.y += y - Hotel.FloorY(oldIdx); }
      if (o.liftT > 0 && o.liftTo === oldIdx) o.liftTo = newIdx;
      for (const n of o.path) { if (n.lift === oldIdx) { n.lift = newIdx; n.y = y; } else if (Math.abs(n.y - Hotel.FloorY(oldIdx)) < 0.01 || (n.y !== undefined && n.y > Hotel.FloorY(oldIdx) - 1)) { if (!(n.lift !== undefined)) n.y = y; } }
    };
    for (const g of Game.guests) if (g.fv && isRoof(g.fv.fac)) fix1(g);
    for (const s of Game.staff) { const id = RoleFac[s.role]; if (id && S.fac[id] && isRoof(S.fac[id])) fix1(s); }
  }

  // ---------------- dışa açık arayüz ----------------
  const api = {
    get S() { return S; },
    get bloom() { return S.bloom; },
    get GardenBonus() { const f = S.fac.bahce; return f && f.built ? 0.15 + 0.35 * S.bloom : 0; },
    Built(id) { const f = S.fac[id]; return !!(f && f.built); },
    Boot() {
      S.booted = true; S.roofIdx = Hotel.RoofIndex; S.day = World.day;
      const st = Game.st; st.facilities = st.facilities || {};
      for (const d of Data.Facilities) { const f = ensureFac(d.id); f.built = !!st.facilities[d.id]; buildVis(f); }
      setBloom(st.gardenBloom ?? 1);
    },
    BuildLobby(g) {
      S.lobbyG = g;
      for (const c of g.children.slice()) if (['kitchenBar', 'kitchenBarEnd', 'kitchenCoffeeMachine', 'tableRound', 'chairRounded'].includes(c.name) && c.position.x > 0 && c.position.z > 0) Destroy(c);
      if (S.booted) for (const id in S.fac) if (!isRoof(S.fac[id])) { S.fac[id].go = null; buildVis(S.fac[id]); }
    },
    BuildRoof(g) {
      cleanupRoofRefs(); S.roofG = g;
      if (S.booted) {
        if (Hotel.RoofIndex !== S.roofIdx) { onRoofMoved(S.roofIdx, Hotel.RoofIndex); S.roofIdx = Hotel.RoofIndex; }
        for (const id in S.fac) if (isRoof(S.fac[id])) buildVis(S.fac[id]); setBloom(S.bloom);
      }
    },
    Tick(dt) {
      if (!S.booted) return;
      S.t += dt;
      if (Hotel.RoofIndex !== S.roofIdx) { onRoofMoved(S.roofIdx, Hotel.RoofIndex); S.roofIdx = Hotel.RoofIndex; }
      if (World.day !== S.day) { S.day = World.day; if (S.fac.bahce && S.fac.bahce.built) setBloom(S.bloom - 0.35); }
      for (const id in S.fac) {
        const fac = S.fac[id]; if (!fac.built) continue;
        for (const g of fac.guests.slice()) if (!alive(g) || g.s !== Guest.S.Visit || g.fv?.fac !== fac) { if (g.fv && g.fv.fac === fac) release(g); else { arrRemove(fac.guests, g); for (const s of fac.spots) if (s.by === g) s.by = null; } }
        reflow(fac);
      }
      playerTick(dt);
      for (const w of S.waters) if (alive(w.m)) w.m.position.y = w.y + Math.sin(S.t * 1.6 + w.y * 7) * 0.012;
      labels();
    },
    Wages() { return 0; },
    StaffRoles() { const out = []; for (const d of Data.Facilities) if (S.fac[d.id] && S.fac[d.id].built) for (const r of d.roles) out.push(r); return out; },
    Offer(guest) {
      const built = Data.Facilities.filter(d => S.fac[d.id] && S.fac[d.id].built);
      if (!built.length || !(S.alwaysOffer || Random.Chance(0.65))) return false;
      const pref = Prefs[guest.type.id] || {}; let sum = 0; const w = [];
      for (const d of built) { const fac = S.fac[d.id]; if (!freeSpots(fac, guest).length) continue; let k = (pref[d.id] ?? 1) * Life.FacMul(d.id); if (d.id === 'bar' && World.IsNight) k *= 1.6; if (d.id === 'havuz' && (World.IsNight || World.weather === 'rainy' || World.weather === 'snowy')) k *= 0.25; w.push([fac, k]); sum += k; }
      if (!w.length || sum <= 0) return false;
      let r = Math.random() * sum; let pick = w[w.length - 1][0];
      for (const [fac, k] of w) { r -= k; if (r <= 0) { pick = fac; break; } }
      return startVisit(guest, pick);
    },
    GuestTick(guest, dt) { guestTick(guest, dt); },
    StaffTick(staff, dt) { staffTick(staff, dt); },
    Buy(id) { return buy(id); },
    // hata ayıklama / test: odasında ya da sırada olan misafiri doğrudan tesise yollar
    ForceVisit(guest, id, spotIdx) {
      const fac = S.fac[id]; if (!fac || !fac.built || !alive(guest)) return false;
      if (spotIdx !== undefined) S.forceSpot = fac.spots[spotIdx];
      if (guest.fv) release(guest);
      const r = guest.room;
      if (r && guest.s === Guest.S.Stay) { r.guest = null; r.state = 'dirty'; r.dirt = 1; if (r.mess) r.mess.visible = true; guest.go.position.copy(r.inside); guest.go.rotation.set(0, 0, 0); guest.lying = false; guest.Blanket(false); if (guest.follower) guest.follower.Follow(); }
      if (guest.s === Guest.S.Queue) Game.Dequeue(guest);
      guest.rig.act = Rig.Act.None; guest.path = [];
      return startVisit(guest, fac);
    },
    Sheet(body) {
      const st = Game.st, stats = st.facStats || {};
      let total = 0, earn = 0; for (const k in stats) { total += stats[k].n; earn += stats[k].earn; }
      body.innerHTML = `<div class="stat"><span>Tesis ziyareti</span><b>${total}</b></div><div class="stat"><span>Tesis kazancı</span><b>${UI.fmt(earn)}</b></div>`;
      if (S.fac.bahce && S.fac.bahce.built) { const d = document.createElement('div'); d.className = 'stat'; d.innerHTML = `<span>🌷 Bahçe çiçeklenmesi</span><b style="flex:0 0 40%"><div class="meter"><i style="width:${Math.round(S.bloom * 100)}%"></i></div></b>`; body.appendChild(d); }
      Wc.SheetItem(body);
      for (const d of Data.Facilities) {
        const fac = S.fac[d.id], it = document.createElement('div');
        const roles = d.roles.map(r => Data.Staff[r].icon + ' ' + Data.Staff[r].name).join(', ');
        const where = d.floor === 'roof' ? 'Çatı' : 'Zemin kat';
        if (fac && fac.built) {
          const s = stats[d.id] || { n: 0, earn: 0 };
          const hired = d.roles.reduce((a, r) => a + Game.staff.filter(x => x.role === r).length, 0);
          it.className = 'item done';
          it.innerHTML = `<div class="ic">${d.icon}</div><div class="tx"><b>${d.name} · açık</b><small>${where} · ${s.n} ziyaret · ${UI.fmt(s.earn)} kazanç${d.roles.length ? (hired ? ' · ' + hired + ' personel' : ' · Personel yok: Menü → Personel (' + roles + ')') : ' · personel gerekmez'}</small></div>`;
          const b = document.createElement('button'); b.className = 'ghost'; b.textContent = 'Göster'; b.addEventListener('click', () => { Hotel.SetView(FloorIdx(fac)); Game.player.GoTo(WP(fac, fac.L.serve), FloorIdx(fac)); UI.CloseSheet(); }); it.appendChild(b);
        } else if (Game.Stars < d.unlock) {
          it.className = 'item locked';
          it.innerHTML = `<div class="ic">🔒</div><div class="tx"><b>${d.name}</b><small>${d.unlock} yıldız gerekir · ${where} · ${UI.esc(d.desc)}</small></div>`;
        } else {
          it.className = 'item';
          it.innerHTML = `<div class="ic">${d.icon}</div><div class="tx"><b>${d.name}</b><small>${where} · ${UI.esc(d.desc)}${d.price ? ' Ücret ~' + UI.fmt(d.price) + '/misafir.' : ''}${roles ? ' Personel: ' + roles + '.' : ''}</small></div>`;
          const b = document.createElement('button'); b.className = 'mint'; b.textContent = UI.fmt(d.cost); b.addEventListener('click', () => buy(d.id)); it.appendChild(b);
        }
        body.appendChild(it);
      }
    },
  };
  if (typeof window !== 'undefined') window.__fac = api; // test/hata ayıklama erişimi
  return api;
})();
