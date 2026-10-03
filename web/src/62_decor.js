// Lobi dekorasyonu: her yuva için satın alınabilen seçenekler. Her dekor misafir memnuniyetini artırır.
// (Decor.cs karşılığı — statik sınıf)
class Decor {
  static Slot = class {
    constructor(o) {
      this.key = ''; this.name = ''; this.opts = []; this.costs = [];
      this.sel = 0;
      this.owned = 1; // bit maskesi (0. seçenek ücretsiz)
      this.groups = null;
      Object.assign(this, o);
    }
    Owns(i) { return (this.owned & (1 << i)) !== 0; }
  };

  static Slots = [
    new Decor.Slot({ key: 'carpet', name: 'Lobi halısı', opts: ['Kırmızı', 'Lacivert', 'Zümrüt', 'Altın işlemeli'], costs: [0, 300, 300, 900] }),
    new Decor.Slot({ key: 'plants', name: 'Giriş bitkileri', opts: ['Saksı bitkisi', 'Palmiye', 'Çiçek sepeti'], costs: [0, 400, 350] }),
    new Decor.Slot({ key: 'corner', name: 'Lobi köşesi', opts: ['Boş', 'Akvaryum', 'Heykel', 'Kuyruklu piyano'], costs: [0, 800, 600, 1500] }),
    new Decor.Slot({ key: 'light', name: 'Lobi aydınlatması', opts: ['Sade', 'Kristal avize', 'Modern lambalar'], costs: [0, 1200, 700] }),
    new Decor.Slot({ key: 'desk', name: 'Resepsiyon süsü', opts: ['Çiçekli vazo', 'Orkide', 'Bonsai', 'Altın zil'], costs: [0, 250, 350, 500] }),
    new Decor.Slot({ key: 'art', name: 'Duvar tabloları', opts: ['Manzara', 'Soyut', 'Gün batımı'], costs: [0, 300, 300] }),
  ];

  static carpet = null;
  static carpetEdge = null;
  static canvases = [];
  static cornerObs = [[], [], [], []];
  static get Corner() { return V(9.6, 0, -0.6); }
  static get Gold() { return C(0.95, 0.78, 0.3); }

  static get Bonus() {
    let n = 0;
    for (const s of Decor.Slots) if (s.sel !== 0) n++;
    return n * 0.1;
  }

  // Satın alınmış (varsayılan dışı) parça sayısı: bakım giderinde kullanılır
  static OwnedCount() {
    let n = 0;
    for (const s of Decor.Slots)
      for (let i = 1; i < s.opts.length; i++) if (s.Owns(i)) n++;
    return n;
  }

  // ---------------- Kurulum ----------------
  // carpetR / edgeR / paintings: Mesh nesneleri (Unity'de Renderer)
  static Build(world, carpetR, edgeR, plantsDefault, deskDefault, paintings) {
    Decor.carpet = carpetR;
    Decor.carpetEdge = edgeR;
    Decor.canvases.length = 0;
    Decor.canvases.push(...paintings);
    for (const l of Decor.cornerObs) l.length = 0;

    const root = new THREE.Group(); root.name = 'Dekor';
    world.add(root);
    const Gold = Decor.Gold;
    const at = (base, x, y, z) => Vec.add(base, V(x, y, z));

    // Giriş bitkileri
    const plants = Decor.Slots[1];
    plants.groups = new Array(3);
    plants.groups[0] = plantsDefault;
    plants.groups[1] = Decor.Group(root, 'Palmiyeler');
    plants.groups[2] = Decor.Group(root, 'CicekSepetleri');
    for (const x of [-3.2, 3.2]) {
      const p = plants.groups[1];
      U.Box('Saksi', p, V(x, 0.3, -11.4), V(0.8, 0.3, 0.8), C(0.9, 0.88, 0.84), 'Cylinder');
      U.Box('Govde', p, V(x, 1.3, -11.4), V(0.18, 1.1, 0.18), C(0.55, 0.4, 0.25), 'Cylinder');
      for (let k = 0; k < 6; k++) {
        const leaf = U.Box('Yaprak', p, V(x + Mathf.Cos(k) * 0.45, 2.35, -11.4 + Mathf.Sin(k) * 0.45), V(1.1, 0.06, 0.3), C(0.25, 0.6, 0.3));
        setEuler(leaf, 0, -k * Mathf.Rad2Deg, -25);
      }
      const b = plants.groups[2];
      U.Box('Sepet', b, V(x, 0.35, -11.4), V(0.9, 0.35, 0.9), C(0.75, 0.55, 0.3), 'Cylinder');
      for (let k = 0; k < 9; k++)
        U.Box('Cicek', b, V(x + Random.Range(-0.32, 0.32), 0.8 + Random.Range(0, 0.2), -11.4 + Random.Range(-0.32, 0.32)), V(0.22, 0.22, 0.22),
          k % 3 === 0 ? C(1, 0.45, 0.6) : k % 3 === 1 ? C(1, 0.9, 0.35) : C(0.75, 0.5, 1), 'Sphere');
    }

    // Lobi köşesi
    const Corner = Decor.Corner;
    const corner = Decor.Slots[2];
    corner.groups = new Array(4);
    corner.groups[0] = Decor.Group(root, 'KoseBos');
    const aq = Decor.Group(root, 'Akvaryum');
    corner.groups[1] = aq;
    U.Box('Sehpa', aq, at(Corner, 0, 0.4, 0), V(2.2, 0.8, 0.9), C(0.35, 0.25, 0.2));
    U.Prim('Su', aq, at(Corner, 0, 1.3, 0), V(2.1, 1, 0.8), U.Glow(C(0.3, 0.65, 0.95), 0.5));
    U.Box('Kum', aq, at(Corner, 0, 0.85, 0), V(2.05, 0.1, 0.75), C(0.95, 0.85, 0.6));
    for (let k = 0; k < 4; k++)
      U.Prim('Balik', aq, at(Corner, -0.6 + k * 0.4, 1.2 + (k % 2) * 0.3, -0.42), V(0.22, 0.12, 0.04), U.Glow(k % 2 === 0 ? C(1, 0.55, 0.15) : C(1, 0.85, 0.2), 1), 'Sphere');
    Decor.cornerObs[1].push(Rect.MinMaxRect(Corner.x - 1.15, Corner.z - 0.5, Corner.x + 1.15, Corner.z + 0.5));

    const st = Decor.Group(root, 'Heykel');
    corner.groups[2] = st;
    U.Box('Kaide', st, at(Corner, 0, 0.5, 0), V(0.9, 1, 0.9), C(0.92, 0.9, 0.86));
    U.Box('Govde', st, at(Corner, 0, 1.45, 0), V(0.4, 0.9, 0.4), C(0.85, 0.85, 0.88), 'Capsule');
    U.Box('Bas', st, at(Corner, 0, 2.15, 0), V(0.38, 0.38, 0.38), C(0.85, 0.85, 0.88), 'Sphere');
    U.Box('Halka', st, at(Corner, 0, 1.6, 0), V(0.9, 0.05, 0.9), Gold, 'Cylinder');
    Decor.cornerObs[2].push(Rect.MinMaxRect(Corner.x - 0.5, Corner.z - 0.5, Corner.x + 0.5, Corner.z + 0.5));

    const pi = Decor.Group(root, 'Piyano');
    corner.groups[3] = pi;
    const black = C(0.08, 0.08, 0.1);
    U.Box('Govde', pi, at(Corner, 0, 0.8, 0.1), V(1.6, 0.4, 1.9), black);
    const lid = U.Box('Kapak', pi, at(Corner, 0.35, 1.35, 0.25), V(1.4, 0.04, 1.7), black);
    setEuler(lid, 0, 0, 35);
    U.Box('Tuslar', pi, at(Corner, 0, 0.98, -0.85), V(1.4, 0.06, 0.25), Col.white);
    for (const o of [V(-0.65, 0.3, -0.7), V(0.65, 0.3, -0.7), V(0, 0.3, 0.9)])
      U.Box('Ayak', pi, Vec.add(Corner, o), V(0.1, 0.6, 0.1), black);
    U.Box('Tabure', pi, at(Corner, 0, 0.25, -1.4), V(0.9, 0.5, 0.4), black);
    Decor.cornerObs[3].push(Rect.MinMaxRect(Corner.x - 0.85, Corner.z - 1.6, Corner.x + 0.85, Corner.z + 1.1));

    // Lobi aydınlatması
    const light = Decor.Slots[3];
    light.groups = new Array(3);
    light.groups[0] = Decor.Group(root, 'IsikSade');
    const ch = Decor.Group(root, 'KristalAvize');
    light.groups[1] = ch;
    const c0 = V(0, 3.3, -4.5);
    U.Box('Tavan', ch, at(c0, 0, 0.5, 0), V(0.05, 1, 0.05), Gold);
    U.Box('Govde', ch, c0.clone(), V(0.45, 0.12, 0.45), Gold, 'Cylinder');
    for (let k = 0; k < 10; k++) {
      const a = k * Mathf.PI * 2 / 10;
      const kol = U.Box('Kol', ch, at(c0, Mathf.Cos(a) * 0.6, 0, Mathf.Sin(a) * 0.6), V(1.1, 0.05, 0.06), Gold);
      setEuler(kol, 0, -a * Mathf.Rad2Deg, 0);
      const mum = U.Prim('Mum', ch, at(c0, Mathf.Cos(a) * 1.15, 0.12, Mathf.Sin(a) * 1.15), V(0.16, 0.16, 0.16), U.Glow(C(1, 0.9, 0.6), 2.5), 'Sphere');
      GameManager.I.dayNight.AddFixture(mum, C(1, 0.85, 0.55), 0.7);
      U.Prim('Kristal', ch, at(c0, Mathf.Cos(a) * 1.15, -0.18, Mathf.Sin(a) * 1.15), V(0.12, 0.3, 0.12), U.Glow(C(0.9, 0.95, 1), 1.8), 'Capsule');
      if (k % 2 === 0)
        U.Prim('Kristal', ch, at(c0, Mathf.Cos(a) * 0.65, -0.55, Mathf.Sin(a) * 0.65), V(0.1, 0.26, 0.1), U.Glow(C(1, 0.92, 0.7), 2), 'Capsule');
    }
    const merkez = U.Prim('Merkez', ch, at(c0, 0, -0.6, 0), V(0.35, 0.35, 0.35), U.Glow(C(1, 0.92, 0.75), 2.5), 'Sphere');
    GameManager.I.dayNight.AddFixture(merkez, C(1, 0.88, 0.6), 3.2);
    const md = Decor.Group(root, 'ModernLambalar');
    light.groups[2] = md;
    for (let k = -1; k <= 1; k++) {
      const p = V(k * 3.2, 3.1, -4.5);
      U.Box('Kablo', md, at(p, 0, 0.5, 0), V(0.03, 1, 0.03), C(0.15, 0.15, 0.15));
      U.Box('Kup', md, p.clone(), V(0.7, 0.35, 0.7), C(0.15, 0.15, 0.17), 'Cylinder');
      const amp = U.Prim('Ampul', md, at(p, 0, -0.25, 0), V(0.3, 0.3, 0.3), U.Glow(C(1, 0.85, 0.6), 3), 'Sphere');
      GameManager.I.dayNight.AddFixture(amp, C(1, 0.85, 0.55), 1.8);
    }

    // Resepsiyon süsü
    const desk = Decor.Slots[4];
    desk.groups = new Array(4);
    desk.groups[0] = deskDefault;
    const d0 = V(-7.6, 1.17, -5.1);
    const orc = Decor.Group(root, 'Orkide');
    desk.groups[1] = orc;
    U.Box('Saksi', orc, at(d0, 0, 0.1, 0), V(0.25, 0.1, 0.25), Col.white, 'Cylinder');
    U.Box('Sap', orc, at(d0, 0, 0.45, 0), V(0.03, 0.35, 0.03), C(0.3, 0.5, 0.25), 'Cylinder');
    for (let k = 0; k < 4; k++)
      U.Box('Cicek', orc, at(d0, 0.08 * k - 0.1, 0.65 + k * 0.07, 0.05), V(0.14, 0.14, 0.05), C(0.95, 0.6, 0.85), 'Sphere');
    const bon = Decor.Group(root, 'Bonsai');
    desk.groups[2] = bon;
    U.Box('Saksi', bon, at(d0, 0, 0.06, 0), V(0.45, 0.12, 0.3), C(0.35, 0.3, 0.45));
    U.Box('Govde', bon, at(d0, 0.05, 0.25, 0), V(0.07, 0.2, 0.07), C(0.45, 0.32, 0.22), 'Cylinder');
    U.Box('Tac', bon, at(d0, 0.05, 0.48, 0), V(0.5, 0.18, 0.35), C(0.3, 0.6, 0.3), 'Sphere');
    const bell = Decor.Group(root, 'AltinZil');
    desk.groups[3] = bell;
    U.Prim('Zil', bell, at(d0, 0, 0.15, 0), V(0.4, 0.3, 0.4), U.Mat(Gold, null, V2(1, 1), 0.9, 0.3), 'Sphere');
    U.Box('Taban', bell, at(d0, 0, 0.02, 0), V(0.45, 0.03, 0.45), C(0.3, 0.2, 0.15), 'Cylinder');
    U.Prim('Tepe', bell, at(d0, 0, 0.33, 0), V(0.08, 0.08, 0.08), U.Mat(Gold, null, V2(1, 1), 0.9, 0.3), 'Sphere');

    // Tablolar ve halı: renk değişimi, grup yok
    Decor.Slots[0].groups = null;
    Decor.Slots[5].groups = null;
    Decor.Apply();
  }

  static Group(root, name) {
    const g = new THREE.Group(); g.name = name;
    root.add(g);
    return g;
  }

  // ---------------- Uygulama ----------------
  static Apply() {
    for (const s of Decor.Slots) {
      if (s.groups == null) continue;
      for (let i = 0; i < s.groups.length; i++)
        if (s.groups[i]) SetActive(s.groups[i], i === s.sel);
    }
    const cc = [C(0.78, 0.33, 0.3), C(0.2, 0.27, 0.5), C(0.15, 0.5, 0.38), C(0.6, 0.15, 0.2)];
    const ce = [C(0.95, 0.8, 0.45), C(0.9, 0.9, 0.95), C(0.95, 0.85, 0.55), Decor.Gold];
    const c = Decor.Slots[0].sel;
    if (Decor.carpet) Decor.carpet.material = U.Mat(cc[c], U.CarpetTex, V2(3, 2), 0.05, 0);
    if (Decor.carpetEdge) Decor.carpetEdge.material = U.Mat(ce[c]);
    const art = [C(0.35, 0.6, 0.85), C(0.7, 0.35, 0.75), C(0.98, 0.55, 0.3)];
    for (const r of Decor.canvases)
      if (r && alive(r)) r.material = U.Mat(art[Decor.Slots[5].sel]);
  }

  static Blocked(p, r) {
    for (const o of Decor.cornerObs[Decor.Slots[2].sel])
      if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
    return false;
  }

  // ---------------- Kayıt ----------------
  static Save(K) {
    for (const s of Decor.Slots) {
      Store.SetInt(K + 'dec_sel_' + s.key, s.sel);
      Store.SetInt(K + 'dec_own_' + s.key, s.owned);
    }
  }

  static Load(K) {
    for (const s of Decor.Slots) {
      s.owned = Store.GetInt(K + 'dec_own_' + s.key, 1) | 1;
      s.sel = Mathf.Clamp(Store.GetInt(K + 'dec_sel_' + s.key, 0), 0, s.opts.length - 1);
      if (!s.Owns(s.sel)) s.sel = 0;
    }
    Decor.Apply();
  }

  static Reset() {
    for (const s of Decor.Slots) { s.sel = 0; s.owned = 1; }
  }
}
