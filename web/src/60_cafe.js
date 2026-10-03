// Kafe: lobinin doğusunda. Odadan çıkan misafirler kahve alır, masada oturur.
// (Cafe.cs karşılığı)
class Cafe extends Behaviour {
  static Seat = class {
    constructor(pos, fwd) { this.pos = pos || V(); this.fwd = fwd || V(); this.who = null; }
  };
  static get ServeSpot() { return V(14.35, 0, -8.05); }

  constructor() {
    super();
    this.go.name = 'Kafe';
    this.Open = false;
    this.pile = null;
    this.baristaName = '';
    this.stats = new StaffStats();
    this.queue = [];
    this.seats = [];
    this.sofaGroup = null; this.cafeGroup = null;
    this.sofaObs = []; this.cafeObs = [];
    this.pad = null;
    this.t = 0;
    this.barista = null;
    this.nameTag = null; this.bubble = null;
  }

  get HasBarista() { return this.barista != null; }
  get BaristaWorking() { return this.HasBarista && !this.stats.resting; }

  Slot(i) { return V(12.2 - 1.25 * i, 0, -8.05); }

  Build(world, wood) {
    world.add(this.go);

    // ---- Kafe açılmadan önce: lobi oturma grubu ----
    this.sofaGroup = new THREE.Group(); this.sofaGroup.name = 'LobiOturma';
    this.go.add(this.sofaGroup);
    const s = this.sofaGroup;
    Cafe.Ob(this.sofaObs, U.Furn('loungeDesignSofa', s, V(13.9, 0, -8), -90, 2.2, V(1.1, 1, 3.2), C(0.32, 0.47, 0.72)));
    Cafe.Ob(this.sofaObs, U.Furn('tableCoffeeGlass', s, V(11.6, 0, -8), 90, 2.2, V(1.1, 0.5, 1.8), wood));
    Cafe.Ob(this.sofaObs, U.Furn('loungeChair', s, V(11.6, 0, -10.6), 0, 2.2, V(1.1, 1, 1.1), C(0.95, 0.75, 0.35)));
    Cafe.Ob(this.sofaObs, U.Furn('loungeChair', s, V(11.6, 0, -5.4), 180, 2.2, V(1.1, 1, 1.1), C(0.95, 0.75, 0.35)));
    U.Furn('plantSmall1', s, V(11.6, 0.5, -8), 0, 3, V(0.3, 0.4, 0.3), C(0.3, 0.65, 0.35));
    U.Text(s, V(12.2, 0.4, -12.0), 'KAFE · Menüden açılır', 0.045, C(1, 1, 1, 0.6));

    // ---- Kafe ----
    this.cafeGroup = new THREE.Group(); this.cafeGroup.name = 'Kafe';
    this.go.add(this.cafeGroup);
    const c = this.cafeGroup;
    U.Prim('KafeZemin', c, V(12.25, 0.008, -8.05), V(5.5, 0.02, 7.2),
      U.Mat(C(0.75, 0.55, 0.38), U.WoodTex, V2(2.5, 3), 0.35, 0));
    U.Flat('KafeKenar', c, V(12.25, 0.004, -8.05), V(5.7, 0.02, 7.4), C(0.35, 0.22, 0.15));

    let barTop = 0.92;
    for (let k = -1; k <= 1; k++) {
      const b = U.Furn('kitchenBar', c, V(13.3, 0, -8.05 + k * 0.95), -90, 2.2, V(0.5, 0.92, 0.95), wood);
      Cafe.Ob(this.cafeObs, b);
      barTop = b.max.y;
    }
    Cafe.Ob(this.cafeObs, U.Furn('kitchenBarEnd', c, V(13.3, 0, -9.65), -90, 2.2, V(0.5, 0.92, 0.25), wood));
    Cafe.Ob(this.cafeObs, U.Furn('kitchenBarEnd', c, V(13.3, 0, -6.45), -90, 2.2, V(0.5, 0.92, 0.25), wood));
    U.Furn('kitchenCoffeeMachine', c, V(13.35, barTop, -7.2), -90, 2.4, V(0.4, 0.45, 0.5), C(0.2, 0.2, 0.22));
    for (let k = 0; k < 4; k++)
      U.Box('Fincan', c, V(13.3, barTop + 0.08, -9.1 + k * 0.22), V(0.12, 0.12, 0.12), Col.white, 'Cylinder');
    U.Box('Pasta', c, V(13.3, barTop + 0.1, -8.4), V(0.35, 0.18, 0.35), C(0.95, 0.7, 0.75), 'Cylinder');
    U.Box('PastaUst', c, V(13.3, barTop + 0.2, -8.4), V(0.1, 0.1, 0.1), C(0.9, 0.2, 0.25), 'Sphere');

    // Tabela
    U.Box('KafeDirek', c, V(14.9, 1.4, -10.2), V(0.1, 2.8, 0.1), C(0.35, 0.22, 0.15));
    U.Box('KafeDirek', c, V(14.9, 1.4, -5.9), V(0.1, 2.8, 0.1), C(0.35, 0.22, 0.15));
    U.Box('KafeTabela', c, V(14.9, 2.5, -8.05), V(0.12, 0.7, 4.5), C(0.35, 0.22, 0.15));
    U.Text(c, V(14.5, 2.55, -8.05), 'KAFE', 0.08, C(1, 0.88, 0.6), true);

    // Masalar ve sandalyeler
    for (const z of [-10.7, -5.4]) {
      Cafe.Ob(this.cafeObs, U.Furn('tableRound', c, V(10.6, 0, z), 0, 1.6, V(1, 0.6, 1.2), wood));
      for (const side of [-1, 1]) {
        const pos = V(10.6 + side * 1.15, 0, z);
        Cafe.Ob(this.cafeObs, U.Furn('chairCushion', c, pos, side < 0 ? 90 : -90, 2.4, V(0.5, 1, 0.5), wood));
        this.seats.push(new Cafe.Seat(pos.clone(), side < 0 ? Vec.right : Vec.left));
      }
    }
    U.Furn('plantSmall2', c, V(10.6, 0.6, -10.7), 0, 3, V(0.2, 0.3, 0.2), C(0.3, 0.65, 0.35));
    U.Furn('plantSmall2', c, V(10.6, 0.6, -5.4), 0, 3, V(0.2, 0.3, 0.2), C(0.3, 0.65, 0.35));

    this.pad = new ProgressPad(c, Vec.add(Cafe.ServeSpot, Vec.mul(Vec.up, 0.02)), 0.65, C(0.65, 0.4, 0.25), C(0.3, 0.95, 0.5));
    this.pile = MoneyPile.Create(c, V(12.2, 0, -10.2));
    this.pile.fullAt = 80;
    this.bubble = U.Text(null, Vec.zero, '', 0.09, Col.white, true);
    SetActive(this.bubble.gameObject, false);
    this.SetOpen(false, false);
  }

  static Ob(l, b) { l.push(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z)); }

  SetOpen(o, fx) {
    this.Open = o;
    SetActive(this.sofaGroup, !o);
    SetActive(this.cafeGroup, o);
    if (fx) {
      U.Burst(V(12, 1.5, -8), C(1, 0.8, 0.4), C(0.6, 0.4, 0.25), 90, 6);
      Sfx.Play('unlock');
      GameManager.I.Celebrate('Kafe açıldı!', 'Odadan çıkan misafirler artık kahve içmeye gelecek.');
    }
  }

  Blocked(p, r) {
    for (const o of this.Open ? this.cafeObs : this.sofaObs)
      if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
    return false;
  }

  Join(c) {
    if (!this.Open || this.queue.length >= 3) return false;
    this.queue.push(c);
    c.GoToCafe(this.Slot(this.queue.length - 1));
    return true;
  }

  Remove(c) {
    for (const s of this.seats) if (s.who === c) s.who = null;
    if (arrRemove(this.queue, c)) this.Reflow();
  }

  Reflow() {
    for (let i = 0; i < this.queue.length; i++) this.queue[i].GoToCafe(this.Slot(i));
  }

  FreeSeat() {
    for (const s of this.seats) if (s.who == null) return s;
    return null;
  }

  HireBarista(name, fx) {
    this.baristaName = name;
    this.stats.who = name;
    const g = new THREE.Group(); g.name = 'Barista';
    this.cafeGroup.add(g);
    setWorldPos(g, V(14.45, 0, -9.0));
    lookRotation(g, Vec.left);
    this.barista = Rig.Model(g, 'character-female-c');
    this.nameTag = U.Text(g, V(0, 2.75, 0), name, 0.06, Col.white, true);
    // nameTag.transform.rotation = U.CamRot → yazılar zaten kameraya dönük
    if (fx) {
      GameManager.I.Notify(name + ' kafede işe başladı!');
      GameManager.I.Pop(this.barista.transform);
    }
  }

  Rename(n) {
    this.baristaName = n;
    this.stats.who = n;
    if (this.nameTag) this.nameTag.text = n;
  }

  Update() {
    if (!this.Open) return;
    const gm = GameManager.I;
    const front = this.queue.length > 0 ? this.queue[0] : null;
    const playerHere = gm.PlayerNear(Cafe.ServeSpot, 0.8);
    const ready = front != null && front.CafeArrived;
    const staffed = playerHere || this.BaristaWorking;

    if (ready && !staffed) {
      SetActive(this.bubble.gameObject, true);
      this.bubble.text = 'Kahve?';
      this.bubble.color = C(1, 0.85, 0.5);
      const fp = worldPos(front.transform);
      this.bubble.transform.position.set(fp.x, fp.y + 3 + Mathf.Sin(Time.time * 5) * 0.08, fp.z);
    }
    else SetActive(this.bubble.gameObject, false);

    if (this.HasBarista) this.stats.Tick(Time.deltaTime, ready && !playerHere && this.BaristaWorking);
    if (ready && staffed) this.t += Time.deltaTime * (playerHere ? 1.5 : 0.7 * Eco.StaffMul * this.stats.Speed) * Eco.ServiceMul;
    else this.t = Mathf.Max(0, this.t - Time.deltaTime);
    this.pad.Set(this.t);
    if (this.barista) {
      this.barista.act = ready && !playerHere && this.BaristaWorking ? Rig.Act.Clean : Rig.Act.None;
      this.barista.Tick(0);
      const want = this.baristaName + (this.stats.resting ? ' (mola)' : '');
      if (this.nameTag && this.nameTag.text !== want) this.nameTag.text = want;
    }

    if (this.t >= 1) {
      this.t = 0;
      this.queue.splice(0, 1);
      this.pile.Add(Eco.CafePrice);
      Quests.Track('cafe');
      if (!playerHere && this.HasBarista) this.stats.AddXp(1);
      Sfx.Play('ding', 0.5);
      gm.FloatText(Vec.add(worldPos(front.transform), Vec.mul(Vec.up, 2.6)), 'Kahve!', C(1, 0.85, 0.6), 0.08);
      const seat = this.FreeSeat();
      if (seat != null) seat.who = front;
      front.CafeServed(seat);
      this.Reflow();
    }
  }
}
