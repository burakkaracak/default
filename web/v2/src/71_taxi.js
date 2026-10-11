// Taksi ve araba ile gelen misafirler: yoldan gelir, otelin önünde durur, misafir iner, araç yoluna devam eder.
// Misafir, araç duruncaya kadar görünmez ve bekler (Guest.taxiWait). Yıldız arttıkça arabayla gelenler artar.
const Taxi = {
  trips: [],
  Chance() { return Math.min(0.65, 0.2 + 0.07 * Game.Stars + (Park.Built() ? 0.12 : 0)); },
  Colors: [C(1, 0.82, 0.2), C(1, 0.82, 0.2), C(0.9, 0.35, 0.35), C(0.35, 0.6, 0.9), C(0.95, 0.95, 0.95), C(0.4, 0.75, 0.5)],
  Maybe(g) {
    if (window.__noTaxi || !alive(g) || !Random.Chance(this.Chance())) return false;
    const side = g.go.position.x < 0 ? -1 : 1, taxi = Random.Chance(Park.Built() ? 0.4 : 0.6), col = taxi ? this.Colors[0] : Random.Pick(this.Colors.slice(2));
    const slot = !taxi && Park.Built() ? Park.Take() : null; // otopark varsa özel araç park eder
    if (!taxi) g.payMul = slot ? 1.2 : 1.05;
    const car = this.Build(col, taxi); car.position.set(side * 34, 0, 9.5); car.rotation.y = side < 0 ? 0 : Math.PI;
    g.taxiWait = true; g.hidden = true; g.path = [];
    this.trips.push({ car, g, side, slot, phase: 'in', stopX: slot ? slot.x : side * Random.Range(2.6, 4.2), t: 0 });
    return true;
  },
  Build(col, taxi) {
    const g = U.Pivot(W, V(), taxi ? 'Taksi' : 'Araba'), dark = C(0.15, 0.16, 0.2), glass = C(0.7, 0.88, 0.97);
    U.Box('Govde', g, V(0, 0.6, 0), V(3.2, 0.7, 1.5), col);
    U.Box('Kabin', g, V(-0.2, 1.2, 0), V(1.7, 0.6, 1.35), col);
    U.Box('Cam', g, V(-0.2, 1.22, 0), V(1.72, 0.4, 1.38), glass);
    U.Box('Tavan', g, V(-0.2, 1.52, 0), V(1.6, 0.06, 1.3), col);
    for (const [x, z] of [[-1.0, -0.78], [1.0, -0.78], [-1.0, 0.78], [1.0, 0.78]]) U.Box('Teker', g, V(x, 0.3, z), V(0.6, 0.6, 0.22), dark);
    U.Box('Far', g, V(1.62, 0.65, -0.5), V(0.05, 0.18, 0.28), C(1, 0.95, 0.7)); U.Box('Far', g, V(1.62, 0.65, 0.5), V(0.05, 0.18, 0.28), C(1, 0.95, 0.7));
    U.Box('Stop', g, V(-1.62, 0.65, -0.5), V(0.05, 0.16, 0.26), C(0.9, 0.2, 0.2)); U.Box('Stop', g, V(-1.62, 0.65, 0.5), V(0.05, 0.16, 0.26), C(0.9, 0.2, 0.2));
    if (taxi) { U.Box('TaksiTabela', g, V(-0.2, 1.75, 0), V(0.55, 0.22, 0.3), C(1, 1, 0.9)); U.Box('TaksiSerit', g, V(0, 0.62, 0.76), V(2.4, 0.12, 0.02), dark); U.Box('TaksiSerit', g, V(0, 0.62, -0.76), V(2.4, 0.12, 0.02), dark); }
    return g;
  },
  Tick(dt) {
    for (const t of this.trips.slice()) {
      const p = t.car.position;
      if (t.phase === 'in') {
        const d = t.stopX - p.x, step = Math.min(Math.abs(d), 9 * dt * Math.max(0.35, Math.min(1, Math.abs(d) / 6)));
        p.x += Math.sign(d) * step;
        if (Math.abs(d) < 0.05 && t.slot) { t.phase = 'park'; }
        else if (Math.abs(d) < 0.05) {
          t.phase = 'wait'; t.t = 1.1;
          const g = t.g;
          if (alive(g)) { g.go.position.set(p.x, 0, 8.4); g.taxiWait = false; g.hidden = false; if (g.follower) g.follower.go.position.copy(g.go.position); if (g.s === Guest.S.Arrive) g.path = [Hotel.Entrance.clone(), V(0, 0, 6.0)]; /* başka işe yollandıysa yolu bozulmasın */ U.Burst(Vec.add(g.pos, V(0, 1, 0)), C(1, 0.95, 0.8), C(1, 1, 1), 10, 2); Sfx.Play('tick', 0.4); }
        }
      } else if (t.phase === 'park') { // şeritten park yerine yanaşır
        const dz = Park.Z - p.z, st = Math.min(Math.abs(dz), 3.5 * dt); p.z += Math.sign(dz) * st; t.car.rotation.y = dz < 0 ? Math.PI / 2 : -Math.PI / 2;
        if (Math.abs(dz) < 0.05) {
          t.car.rotation.y = 0; t.phase = 'parked'; const g = t.g;
          if (alive(g)) { g.go.position.set(p.x + 0.4, 0, 7.6); g.taxiWait = false; g.hidden = false; if (g.follower) g.follower.go.position.copy(g.go.position); if (g.s === Guest.S.Arrive) g.path = [Hotel.Entrance.clone(), V(0, 0, 6.0)]; /* başka işe yollandıysa yolu bozulmasın */ Sfx.Play('tick', 0.4); }
        }
      } else if (t.phase === 'parked') { // misafir otelden ayrılana kadar bekler
        if (!alive(t.g) || t.g.s === Guest.S.Leave) { t.phase = 'unpark'; Park.Release(t.slot); t.side = Random.Chance(0.5) ? 1 : -1; }
      } else if (t.phase === 'unpark') {
        const dz = 9.5 - p.z, st = Math.min(Math.abs(dz), 3.5 * dt); p.z += Math.sign(dz) * st; t.car.rotation.y = -Math.PI / 2;
        if (Math.abs(dz) < 0.05) t.phase = 'out';
      } else if (t.phase === 'wait') {
        t.t -= dt; if (t.t <= 0) { t.phase = 'out'; }
      } else {
        const dir = t.side > 0 ? -1 : 1; // sağdan geldiyse sola devam et
        p.x += dir * 9 * dt; t.car.rotation.y = dir > 0 ? 0 : Math.PI;
        if (Math.abs(p.x) > 36) { Destroy(t.car); this.trips.splice(this.trips.indexOf(t), 1); }
      }
      // misafir silindiyse (kayıt yükleme vb.) araç yine de yoluna gider
      if (t.phase === 'in' && !alive(t.g)) { t.phase = 'out'; if (t.slot) Park.Release(t.slot); }
    }
  },
};
