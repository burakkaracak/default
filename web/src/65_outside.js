// Otelin dışı: kaldırım, cadde ve yan bahçeler yürünebilir; caddede trafik akar.
// (Unity sürümünde dışarı çıkılamıyordu ve arabalar sabitti.)
const Outside = {
  // Bina tabanları: dışarıdan içine girilmez (kapılar ayrı)
  get Footprints() {
    const gm = GameManager.I, l = [
      Rect.MinMaxRect(-15.5, -12.5, 15.5, 10.9),   // lobi ve odalar
      Rect.MinMaxRect(15.0, -1.15, 35.7, 10.9),    // yeni kanat (kapalıyken inşaat alanı)
    ];
    if (gm.restaurant && gm.restaurant.Open) l.push(Rect.MinMaxRect(15.0, -12.2, 27.9, -1.0));
    if (gm.spa && gm.spa.Open) { l.push(Rect.MinMaxRect(28.4, -12.15, 32.6, -1.4)); l.push(Rect.MinMaxRect(34.4, -12.15, 38.85, -1.4)); l.push(Rect.MinMaxRect(32.6, -11.5, 34.4, -1.4)); }
    return l;
  },

  InArea(p, r) {
    // ön kapı (lobiden kaldırıma)
    if (p.x > -1.9 + r && p.x < 1.9 - r && p.z > -12.9 && p.z < -11.5) return true;
    const out = p.z > -22.8 + r && p.z < 10.5 - r && p.x > -34 + r && p.x < 40 - r;
    if (!out) return false;
    for (const f of this.Footprints) if (p.x > f.xMin - r && p.x < f.xMax + r && p.z > f.yMin - r && p.z < f.yMax + r) return false;
    return true;
  },

  // Dış engeller (ağaçlar, çalılar, direkler, yıldız süsleri)
  obs: [],
  Build() {
    const o = this.obs; o.length = 0;
    const box = (x, z, rx, rz) => o.push({ r: Rect.MinMaxRect(x - rx, z - rz, x + rx, z + rz) });
    for (const x of [-24, -16, -8, 8, 16, 24]) box(x, -16.6, 0.35, 0.35);
    for (const z of [-8, 0, 8]) { box(-31, z, 0.4, 0.4); box(38, z, 0.4, 0.4); }
    box(-20, 9, 0.4, 0.4); box(-26, 9.5, 0.45, 0.45);
    for (let x = 4; x <= 14; x += 2.5) { box(x, -12.95, 0.7, 0.45); box(-x, -12.95, 0.7, 0.45); }
    for (const x of [-4.2, 4.2]) box(x, -15.2, 0.15, 0.15);
    const gm = GameManager.I;
    o.push({ r: Rect.MinMaxRect(-3.75, -13.55, -2.85, -12.65), when: () => gm.starTier >= 2 });
    o.push({ r: Rect.MinMaxRect(2.85, -13.55, 3.75, -12.65), when: () => gm.starTier >= 2 });
    o.push({ r: Rect.MinMaxRect(-22.7, -12.7, -19.3, -9.3), when: () => gm.starTier >= 4 });
  },
  Blocked(p, r) {
    for (const o of this.obs) {
      if (o.when && !o.when()) continue;
      const q = o.r;
      if (p.x > q.xMin - r && p.x < q.xMax + r && p.z > q.yMin - r && p.z < q.yMax + r) return true;
    }
    return false;
  },
  IsOutside(p) { return p.z < -12.3 || p.x < -15.5 || p.x > 35.7 || (p.x > 15.4 && p.z < -1.1 && !(GameManager.I.restaurant && GameManager.I.restaurant.InArea(p, 0))); },
};

// Cadde trafiği: iki şerit, önünde müdür ya da başka araba varsa yavaşlar
class Traffic extends Behaviour {
  constructor() { super(); this.go.name = 'Trafik'; this.cars = []; }
  static LaneZ = { 1: -18, [-1]: -21.2 };
  Add(g, dir) {
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    g.position.z = Traffic.LaneZ[dir];
    this.cars.push({ g, dir, v: 0, max: Random.Range(5.5, 8.5) });
  }
  Update() {
    const dt = Time.deltaTime, gm = GameManager.I;
    for (const c of this.cars) {
      const x = c.g.position.x;
      // önündeki engel: müdür(ler) ya da aynı şeritteki araba
      let gap = 99;
      for (const p of gm.players) {
        if (!p) continue;
        const pp = p.transform.position;
        if (Math.abs(pp.z - c.g.position.z) < 1.6) { const d = (pp.x - x) * c.dir; if (d > 0) gap = Math.min(gap, d - 2.3); }
      }
      for (const o of this.cars) if (o !== c && o.dir === c.dir) { const d = (o.g.position.x - x) * c.dir; if (d > 0) gap = Math.min(gap, d - 4.2); }
      const want = gap < 1 ? 0 : gap < 7 ? c.max * (gap - 1) / 6 : c.max;
      c.v = Mathf.MoveTowards(c.v, want, (want < c.v ? 14 : 4) * dt);
      c.g.position.x += c.v * c.dir * dt;
      if (c.dir > 0 && c.g.position.x > 48) c.g.position.x = -48;
      if (c.dir < 0 && c.g.position.x < -48) c.g.position.x = 48;
      for (const w of c.g.userData.wheels) w.rotateY(-c.v * dt / 0.32);
    }
  }
}
