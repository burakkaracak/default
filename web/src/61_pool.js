// Havuz: otelin batısında açık hava alanı. Odadan çıkan misafirler yüzer, çıkışta ücret öder.
// (Pool.cs karşılığı)
class Pool extends Behaviour {
  static Spot = class {
    constructor(pos) { this.pos = pos || V(); this.who = null; }
  };
  static get DoorIn() { return V(-13.6, 0, 1.0); }
  static get DoorOut() { return V(-16.8, 0, 1.0); }
  static WaterY = -0.9;
  static get Water() { return Rect.MinMaxRect(-25, -4, -18.5, 2.5); }

  constructor() {
    super();
    this.go.name = 'Havuz';
    this.Open = false;
    this.pile = null;
    this.spots = [];
    this.area = null; this.locked = null; this.doorFill = null;
    this.obs = [];
  }

  Build(world, westDoorFill) {
    world.add(this.go);
    this.doorFill = westDoorFill;
    const Water = Pool.Water;

    this.area = new THREE.Group(); this.area.name = 'Havuz';
    this.go.add(this.area);
    const a = this.area;
    const stone = C(0.93, 0.9, 0.84);
    // Zemin: suyun etrafında 4 parça (su görünsün diye)
    const deckM = U.Mat(stone, U.TileTex, V2(3, 3), 0.4, 0).clone();
    deckM.userData.color = stone;
    Events.RegisterWet(deckM, 0.78, 0.85);
    const x0 = -27.8, x1 = -15.45, z0 = -7.5, z1 = 5.5;
    U.Prim('Zemin', a, V((x0 + x1) / 2, -0.03, (z0 + Water.yMin) / 2), V(x1 - x0, 0.1, Water.yMin - z0), deckM);
    U.Prim('Zemin', a, V((x0 + x1) / 2, -0.03, (Water.yMax + z1) / 2), V(x1 - x0, 0.1, z1 - Water.yMax), deckM);
    U.Prim('Zemin', a, V((x0 + Water.xMin) / 2, -0.03, Water.center.y), V(Water.xMin - x0, 0.1, Water.height), deckM);
    U.Prim('Zemin', a, V((Water.xMax + x1) / 2, -0.03, Water.center.y), V(x1 - Water.xMax, 0.1, Water.height), deckM);
    // Su yüzeyi (çim ve zeminin üstünde)
    U.Prim('Su', a, V(Water.center.x, -0.02, Water.center.y), V(Water.width, 0.02, Water.height),
      U.Mat(C(0.25, 0.7, 0.95), null, V2(1, 1), 0.95, 0.45));
    for (let k = 0; k < 6; k++)
      U.Flat('SuIsik', a, V(Water.xMin + 0.8 + k * 1.05, 0, Water.center.y + Mathf.Sin(k * 1.7) * 1.8), V(0.7, 0.01, 0.12), C(0.75, 0.95, 1));
    const rim = Col.white;
    U.Box('Kenar', a, V(Water.center.x, 0.03, Water.yMin - 0.15), V(Water.width + 0.6, 0.12, 0.3), rim);
    U.Box('Kenar', a, V(Water.center.x, 0.03, Water.yMax + 0.15), V(Water.width + 0.6, 0.12, 0.3), rim);
    U.Box('Kenar', a, V(Water.xMin - 0.15, 0.03, Water.center.y), V(0.3, 0.12, Water.height), rim);
    U.Box('Kenar', a, V(Water.xMax + 0.15, 0.03, Water.center.y), V(0.3, 0.12, Water.height), rim);
    this.obs.push(Rect.MinMaxRect(Water.xMin - 0.1, Water.yMin - 0.1, Water.xMax + 0.1, Water.yMax + 0.1));
    // Merdiven
    U.Box('Merdiven', a, V(-19.2, 0.25, Water.yMax - 0.1), V(0.06, 0.5, 0.06), C(0.8, 0.82, 0.85));
    U.Box('Merdiven', a, V(-18.8, 0.25, Water.yMax - 0.1), V(0.06, 0.5, 0.06), C(0.8, 0.82, 0.85));
    // Simit
    U.Box('Simit', a, V(-23, 0.02, 1.2), V(0.9, 0.08, 0.9), C(1, 0.4, 0.35), 'Cylinder');

    // Şezlonglar ve şemsiyeler
    const lx = [-26.2, -23.9, -21.6, -19.3];
    const uc = [C(1, 0.45, 0.4), C(0.35, 0.65, 0.95), C(1, 0.8, 0.3), C(0.45, 0.8, 0.5)];
    for (let i = 0; i < lx.length; i++) {
      const b = U.Furn('loungeChairRelax', a, V(lx[i], 0, 4.3), 180, 2.2, V(1, 0.8, 1.6), Col.white);
      this.obs.push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));
      if (i % 2 === 0) {
        const ux = lx[i] + 1.15;
        U.Box('SemsiyeDirek', a, V(ux, 1.2, 4.6), V(0.07, 1.2, 0.07), Col.white, 'Cylinder');
        U.Box('Semsiye', a, V(ux, 2.35, 4.6), V(2.2, 0.12, 2.2), uc[i], 'Cylinder');
        U.Box('SemsiyeTepe', a, V(ux, 2.45, 4.6), V(0.9, 0.12, 0.9), Col.white, 'Cylinder');
        this.obs.push(Rect.MinMaxRect(ux - 0.1, 4.5, ux + 0.1, 4.7));
      }
    }
    // Bitkiler ve çit
    for (const p of [V(-27.2, 0, -6.8), V(-27.2, 0, 4.9), V(-16.2, 0, -6.8)]) {
      const b = U.Furn('pottedPlant', a, p, 0, 2.6, V(0.5, 1.4, 0.5), C(0.3, 0.65, 0.35));
      this.obs.push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));
    }
    for (let x = -27.6; x <= -15.8; x += 1.2) {
      U.Box('Cit', a, V(x, 0.4, -7.4), V(0.1, 0.8, 0.1), Col.white);
      U.Box('Cit', a, V(x, 0.4, 5.5), V(0.1, 0.8, 0.1), Col.white);
    }
    for (let z = -7.4; z <= 5.5; z += 1.2) U.Box('Cit', a, V(-27.75, 0.4, z), V(0.1, 0.8, 0.1), Col.white);
    U.Box('CitUst', a, V(-21.7, 0.7, -7.4), V(11.9, 0.08, 0.06), Col.white);
    U.Box('CitUst', a, V(-21.7, 0.7, 5.5), V(11.9, 0.08, 0.06), Col.white);
    U.Box('CitUst', a, V(-27.75, 0.7, -0.95), V(0.06, 0.08, 12.9), Col.white);
    U.Text(a, V(-21.75, 0.5, -5.6), 'HAVUZ', 0.09, C(0.2, 0.45, 0.7));
    // Kapı çerçevesi
    U.Box('KapiUst', a, V(-15.25, 2.4, 1.0), V(0.5, 0.15, 2.4), C(0.62, 0.47, 0.34));
    U.Box('KapiDirek', a, V(-15.25, 1.2, -0.1), V(0.45, 2.4, 0.2), C(0.62, 0.47, 0.34));
    U.Box('KapiDirek', a, V(-15.25, 1.2, 2.1), V(0.45, 2.4, 0.2), C(0.62, 0.47, 0.34));

    // Yüzme noktaları
    for (const sx of [-23.6, -21.7, -19.8])
      for (const sz of [-2.4, 0.9])
        this.spots.push(new Pool.Spot(V(sx, Pool.WaterY, sz)));

    // Kilitliyken: inşaat tabelası
    this.locked = new THREE.Group(); this.locked.name = 'HavuzKilitli';
    this.go.add(this.locked);
    U.Box('TabelaDirek', this.locked, V(-17.5, 0.6, 1), V(0.1, 1.2, 0.1), C(0.5, 0.35, 0.2));
    U.Box('Tabela', this.locked, V(-17.5, 1.3, 1), V(0.1, 0.6, 2.2), C(1, 0.85, 0.3));
    U.Text(this.locked, V(-17.5, 1.35, 0.6), 'YAKINDA\nHAVUZ', 0.05, C(0.25, 0.18, 0.05));

    this.pile = MoneyPile.Create(this.go, V(-13.9, 0, -0.6));
    this.pile.fullAt = 100;
    this.SetOpen(false, false);
  }

  SetOpen(o, fx) {
    this.Open = o;
    SetActive(this.area, o);
    SetActive(this.locked, !o);
    if (this.doorFill) SetActive(this.doorFill, !o);
    if (fx) {
      U.Burst(V(-21.7, 1, -1), C(0.4, 0.8, 1), Col.white, 120, 7);
      Sfx.Play('unlock');
      GameManager.I.Celebrate('Havuz açıldı!', 'Misafirler odadan çıkınca yüzmeye gidecek, çıkışta ücret bırakacak.');
    }
  }

  // Oyuncunun yürüyebileceği alan (havuz açıkken)
  InArea(p, r) {
    if (!this.Open) return false;
    const door = p.x > -15.8 && p.x < -14.6 && p.z > 0.0 + r && p.z < 2.0 - r;
    const deck = p.x > -27.6 + r && p.x < -15.45 && p.z > -7.3 + r && p.z < 5.4 - r;
    return door || deck;
  }

  Blocked(p, r) {
    if (!this.Open || p.x > -15.3) return false;
    for (const o of this.obs)
      if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
    return false;
  }

  Join(c) {
    if (!this.Open) return null;
    for (const s of this.spots)
      if (s.who == null) { s.who = c; return s; }
    return null;
  }

  Leave(s, paid) {
    if (s != null) s.who = null;
    if (paid) {
      this.pile.Add(Eco.PoolPrice);
      Quests.Track('pool');
    }
  }
}
