// Diğer personel: tuvalet görevlisi (tuvalet açılınca), vale (otopark açılınca), kapı görevlisi (2 yıldızdan sonra).
// Kayıt Game.st.extraStaff ve staffData içinde (tesis personeli gibi). Testte window.__ms erişimi.
const MoreStaff = {
  List: ['tuvaletci', 'vale', 'kapici'],
  Post: { tuvaletci: V(9.3, 0, 2.6), vale: V(-2.4, 0, 7.6), kapici: V(1.6, 0, 7.7) },
  Has(role) { return this.List.includes(role); },
  Open(role) {
    const n = Data.Staff[role].need;
    return n === 'wc' ? Wc.Built() : n === 'park' ? Park.Built() : n === 'stars2' ? Game.Stars >= 2 : true;
  },
  // Personel sekmesinde görünenler: yeri açık olanlar ya da zaten tutulmuş olanlar
  Roles() { return this.List.filter(r => this.Open(r) || Game.StaffCount(r) > 0); },
  Place(s) { const p = this.Post[s.role]; s.go.position.set(p.x + Random.Range(-0.3, 0.3), 0, p.z); s.floor = 0; },
  Tick(s, dt) {
    if (s.role === 'tuvaletci') return this.Wc(s, dt);
    if (s.role === 'vale') return this.Vale(s, dt);
    if (s.role === 'kapici') return this.Door(s, dt);
  },
  // yerine dön; true = zaten yerinde
  Home(s, inside) {
    const p = this.Post[s.role];
    if (s.floor === 0 && Vec.flat(s.pos, p) < 0.5) return true;
    if (!s.path.length) { if (inside) s.Go(p, 0); else s.path = [p.clone()]; }
    s.rig.Tick(0); return false;
  },

  // tuvalet görevlisi: kâğıt ve temizlik ikisini de üstlenir
  Wc(s, dt) {
    if (s.wcJob && Wc.StaffWork(s, dt)) return;
    if (!Wc.Built()) { s.rig.Tick(0); return; }
    if (Wc.Claim(s, 'clean') || Wc.Claim(s, 'paper')) return;
    if (this.Home(s, true)) { setEuler(s.go, 0, 90, 0); s.rig.Tick(0); }
  },

  // vale: park etmeye gelen arabanın yanına gider, misafiri karşılar
  Vale(s, dt) {
    let t = s.trip;
    if (t && (!Taxi.trips.includes(t) || !alive(t.g) || t.valeDone)) { t = s.trip = null; }
    if (!t) {
      t = Taxi.trips.find(x => x.slot && !x.valeBy && !x.valeDone && alive(x.g) && (x.phase === 'in' || x.phase === 'park' || (x.phase === 'parked' && x.g.s === Guest.S.Arrive)));
      if (t) { t.valeBy = s; s.trip = t; s.path = [V(s.pos.x, 0, 7.4), V(t.slot.x + 1.0, 0, 7.4)]; }
    }
    if (!t) { if (this.Home(s, false)) { setEuler(s.go, 0, 0, 0); s.rig.Tick(0); } return; }
    if (s.path.length) return;
    s.rig.Tick(0); setEuler(s.go, 0, 0, 0);
    if (t.phase !== 'parked' && t.phase !== 'unpark' && t.phase !== 'out') return; // araba yanaşıyor: bekle
    const g = t.g; t.valeDone = true; s.trip = null;
    g.payMul = (g.payMul || 1) + 0.1; g.sat += 0.4 + s.trait.sat;
    g.ShowMood('🚗', C(1, 0.9, 0.5), 2); s.ShowMood('👋', 1.5);
    Tween.FloatText(V(t.car.position.x, 2.2, 7.6), '🚗 Vale +%10', C(1, 0.9, 0.5), 0.09);
    Sfx.Play('ding', 0.4); s.GainXP(4);
  },

  // kapı görevlisi: kapıdan geçen yeni misafiri selamlar (bir kez)
  Door(s, dt) {
    if (!this.Home(s, false)) return;
    setEuler(s.go, 0, 0, 0); s.rig.Tick(0);
    const r = 2.6 * Math.min(1.3, s.Eff);
    for (const g of Game.guests) {
      if (g.greeted || g.hidden || g.taxiWait || g.s !== Guest.S.Arrive || g.floor !== 0 || Vec.flat(g.pos, Hotel.Entrance) > r) continue;
      g.greeted = true; g.patience *= 1.3; g.sat += 0.2 + s.trait.sat;
      g.ShowMood('😊', C(1, 0.95, 0.7), 1.5); s.ShowMood('👋', 1.2); s.GainXP(2);
    }
  },
};
if (typeof window !== 'undefined') window.__ms = MoreStaff;
