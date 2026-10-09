// Otelin kedisi: lobinin bekleme köşesinde dolaşır, uyur; dokunulunca kalp çıkarır. Sahne süsüdür (Game.guests dışında).
// Birleşik geometri: gövde, baş ve kuyruk olmak üzere 3 çizim. Yalnız lobi katı görünürken çizilir.
class Cat extends Behaviour {
  constructor() {
    super(); this.go.name = 'Kedi';
    this.target = V(-8, 0, 2); this.state = 'idle'; this.t = 2; this.loveCd = 0; this.tt = 0;
    const fur = C(0.97, 0.96, 0.94), pink = C(1, 0.7, 0.75), patch = C(0.95, 0.65, 0.35), dark = C(0.15, 0.3, 0.2);
    const body = [{ geo: 'Cube', pos: V(0, 0.32, 0), scale: V(0.42, 0.3, 0.7), c: fur }, { geo: 'Cube', pos: V(0.08, 0.48, -0.1), scale: V(0.24, 0.02, 0.3), c: patch }];
    for (const x of [-0.14, 0.14]) for (const z of [-0.24, 0.24]) body.push({ geo: 'Cube', pos: V(x, 0.1, z), scale: V(0.1, 0.22, 0.1), c: fur });
    this.body = U.Merge('KediGovde', this.go, body);
    this.head = U.Pivot(this.go, V(0, 0.55, 0.38), 'KediBas');
    const hp = [{ geo: 'Cube', pos: V(0, 0, 0), scale: V(0.36, 0.3, 0.3), c: fur }, { geo: 'Cube', pos: V(0, -0.04, 0.155), scale: V(0.05, 0.035, 0.01), c: pink }];
    for (const x of [-0.11, 0.11]) hp.push({ geo: 'Cube', pos: V(x, 0.18, 0), scale: V(0.1, 0.12, 0.06), c: fur, rz: x < 0 ? 20 : -20 }, { geo: 'Cube', pos: V(x, 0.17, 0.031), scale: V(0.05, 0.07, 0.01), c: pink }, { geo: 'Cube', pos: V(x * 0.85, 0.03, 0.152), scale: V(0.05, 0.06, 0.01), c: dark });
    U.Merge('KediKafa', this.head, hp);
    this.tail = U.Pivot(this.go, V(0, 0.42, -0.34), 'KediKuyruk');
    U.Merge('KediKuyrukParca', this.tail, [{ geo: 'Cube', pos: V(0, 0.18, -0.05), scale: V(0.07, 0.4, 0.07), c: fur }, { geo: 'Cube', pos: V(0, 0.38, -0.05), scale: V(0.075, 0.1, 0.075), c: patch }]);
    this.tag = U.Text(this.go, V(0, 1.0, 0), Game.st.catName || 'Pamuk', 0.045, C(1, 1, 1), true);
    this.go.position.set(-8, 0, 2);
  }
  static Spot() { // bekleme köşesi (batı) ve resepsiyonun sol yanı; kuyruk ve yürüyüş yolundan uzak
    return Random.Chance(0.75) ? V(Random.Range(-11, -5), 0, Random.Range(-0.5, 5)) : V(Random.Range(-4.5, -2.5), 0, Random.Range(-2, 0));
  }
  Pet() {
    if (this.loveCd > 0) return false; this.loveCd = 2.5;
    const st = Game.st; st.pets = (st.pets || 0) + 1; this.state = 'idle'; this.t = 3;
    Tween.FloatText(Vec.add(this.go.position, V(0, 1.1, 0)), '♥', C(1, 0.5, 0.75), 0.16); Sfx.Play('heart', 0.7); U.Burst(Vec.add(this.go.position, V(0, 0.9, 0)), C(1, 0.5, 0.7), C(1, 0.8, 0.85), 14, 2.5);
    if (st.pets % 10 === 0) { st.rep += 1; UI.Toast('🐱 ' + (st.catName || 'Pamuk') + ' seni çok seviyor!', 'good'); }
    return true;
  }
  Update() {
    const dt = Time.deltaTime; if (dt <= 0) return;
    this.tt += dt; this.loveCd = Math.max(0, this.loveCd - dt);
    const pos = this.go.position;
    this.tag.obj.visible = this.state !== 'sleep';
    const sway = this.state === 'sleep' ? 0.1 : 0.45, hs = this.state === 'sleep' ? 0.04 : 0.14;
    this.tail.rotation.set(0.7, Math.sin(this.tt * (this.state === 'sleep' ? 1 : 2.5)) * sway, 0); this.head.rotation.x = this.state === 'sleep' ? 0.45 : Math.sin(this.tt * 1.3) * hs;
    this.body.scale.y += ((this.state === 'sleep' ? 0.62 : 1) - this.body.scale.y) * Math.min(1, dt * 4);
    this.t -= dt;
    if (this.state === 'walk') {
      const d = V(this.target.x - pos.x, 0, this.target.z - pos.z), m = Vec.len(d);
      if (m < 0.1) { this.state = 'idle'; this.t = Random.Range(3, 8); }
      else { pos.x += d.x / m * 0.9 * dt; pos.z += d.z / m * 0.9 * dt; U.Face(this.go, d, 8); pos.y = Math.abs(Math.sin(this.tt * 9)) * 0.03; }
    } else if (this.t <= 0) {
      const r = Math.random();
      if (this.state === 'sleep' || r < 0.55) { this.target = Cat.Spot(); this.state = 'walk'; }
      else if (r < 0.8) { this.state = 'sleep'; this.t = Random.Range(14, 28); }
      else this.t = Random.Range(3, 8);
      pos.y = 0;
    }
    if (this.state === 'sleep' && Math.floor(this.tt) % 5 === 0 && Math.floor(this.tt * 4) % 4 === 0 && this.loveCd < 1.5) Tween.FloatText(Vec.add(pos, V(0, 0.9, 0)), 'z', C(0.8, 0.85, 1), 0.07);
  }
}
const Pets = {
  cat: null,
  Frame() { if (this.cat) this.cat.go.visible = Hotel.view === 0 && !Decor.active; }, // görünürlük her karede (gizliyken Update çalışmaz)
  Init() { if (this.cat) Destroy(this.cat); this.cat = new Cat(); },
  // dokunma: kedi çevresine dokunulduysa sever (true döner)
  Tap(pt) { const c = this.cat; if (!c || !c.go.visible || Hotel.view !== 0) return false; if (Vec.flat(c.go.position, pt) < 0.9) { c.Pet(); return true; } return false; },
  Render(body) {
    const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<div class="ic">🐱</div><div class="tx"><b>Otelin kedisi</b><input type="text" id="in-cat" maxlength="14" value="${UI.esc(Game.st.catName || 'Pamuk')}"><small>Lobide dolaşır, ona dokunursan sevilir. ${Game.st.pets || 0} kez sevildi.</small></div>`;
    body.appendChild(d); d.querySelector('#in-cat').addEventListener('change', e => { Game.st.catName = e.target.value.trim() || 'Pamuk'; if (this.cat) this.cat.tag.text = Game.st.catName; Game.Save(); });
  },
};
if (typeof window !== 'undefined') window.__Pets = Pets;
