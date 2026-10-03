// Otelin maskot kedisi: lobide dolaşır, uyur, sevilince kalp çıkarır
// (Cat.cs karşılığı)
class Cat extends Behaviour {
  constructor() {
    super();
    this.target = V();
    this.waitT = 2; this.loveCd = 0; this.t = 0;
    this.tail = null; this.head = null;
    this.nameTag = null;
    this.sleeping = false;
  }

  static Make(name) {
    const c = new Cat();
    c.go.name = 'Kedi';
    c.Build(name);
    c.go.position.set(-1.5, 0, -6.5);
    c.target = c.go.position.clone();
    return c;
  }

  Build(name) {
    const tr = this.transform;
    const fur = C(0.97, 0.96, 0.94), pink = C(1, 0.7, 0.75), patch = C(0.95, 0.65, 0.35);
    U.Box('Govde', tr, V(0, 0.32, 0), V(0.42, 0.3, 0.7), fur);
    U.Box('Leke', tr, V(0.08, 0.48, -0.1), V(0.24, 0.02, 0.3), patch);
    for (const x of [-0.14, 0.14])
      for (const z of [-0.24, 0.24])
        U.Box('Bacak', tr, V(x, 0.1, z), V(0.1, 0.22, 0.1), fur);
    this.head = U.Pivot(tr, V(0, 0.55, 0.38), 'Bas');
    U.Box('Kafa', this.head, Vec.zero, V(0.36, 0.3, 0.3), fur);
    for (const x of [-0.11, 0.11]) {
      const ear = U.Box('Kulak', this.head, V(x, 0.18, 0), V(0.1, 0.12, 0.06), fur);
      setEuler(ear, 0, 0, x < 0 ? 20 : -20);
      U.Box('KulakIc', this.head, V(x, 0.17, 0.031), V(0.05, 0.07, 0.01), pink);
      U.Box('Goz', this.head, V(x * 0.85, 0.03, 0.152), V(0.05, 0.06, 0.01), C(0.15, 0.3, 0.2));
    }
    U.Box('Burun', this.head, V(0, -0.04, 0.155), V(0.05, 0.035, 0.01), pink);
    this.tail = U.Pivot(tr, V(0, 0.42, -0.34), 'Kuyruk');
    const tb = U.Box('KuyrukParca', this.tail, V(0, 0.18, -0.05), V(0.07, 0.4, 0.07), fur);
    setEuler(tb, -25, 0, 0);
    this.nameTag = U.Text(null, Vec.zero, name, 0.05, C(1, 0.8, 0.9), true);
  }

  // Unity OnDestroy: kedi yok edilince isim etiketini de kaldır
  OnDestroy() {
    if (this.nameTag) Destroy(this.nameTag.gameObject);
  }
  destroy() { this.OnDestroy(); Destroy(this.go); }

  LateUpdate() {
    if (this.nameTag) { const p = this.go.position; this.nameTag.transform.position.set(p.x, p.y + 1.15, p.z); }
  }

  Update() {
    const gm = GameManager.I;
    const tf = this.go;
    this.t += Time.deltaTime;
    if (this.tail) setEuler(this.tail, 0, 0, Mathf.Sin(this.t * (this.sleeping ? 1 : 4)) * 25);

    if (this.loveCd > 0) this.loveCd -= Time.deltaTime;
    if (gm.PlayerNear(tf.position.clone(), 1.4) && this.loveCd <= 0) {
      this.loveCd = 6;
      gm.FloatText(Vec.add(tf.position, Vec.mul(Vec.up, 1.2)), '♥', C(1, 0.45, 0.65), 0.14);
      Sfx.Play('pop', 0.3);
      this.sleeping = false;
    }

    if (this.waitT > 0) {
      this.waitT -= Time.deltaTime;
      if (this.head) setEuler(this.head, this.sleeping ? 25 : 0, Mathf.Sin(this.t * 0.7) * 30, 0);
      if (this.waitT <= 0) this.PickTarget();
      return;
    }
    const d = Vec.sub(this.target, tf.position);
    d.y = 0;
    if (Vec.len(d) < 0.1) {
      this.sleeping = Random.value < 0.35;
      this.waitT = this.sleeping ? Random.Range(8, 15) : Random.Range(2, 5);
      return;
    }
    const step = 1.3 * Time.deltaTime;
    const n = Vec.add(tf.position, Vec.mul(Vec.norm(d), Mathf.Min(step, Vec.len(d))));
    if (!gm.Walkable(n)) { this.PickTarget(); return; }
    tf.position.copy(n);
    U.Face(tf, d);
    if (this.head) this.head.rotation.set(0, 0, 0);
  }

  PickTarget() {
    const gm = GameManager.I;
    const tf = this.go;
    this.sleeping = false;
    for (let k = 0; k < 20; k++) {
      const p = V(Random.Range(-13, 13), 0, Random.Range(-10.5, 2.5));
      if (gm.Walkable(p) && Mathf.Abs(p.x - tf.position.x) < 9) { this.target = p; return; }
    }
    this.target = tf.position.clone();
    this.waitT = 1;
  }
}
