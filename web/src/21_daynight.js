// Gündüz/gece döngüsü: güneş, ortam ışığı, gök rengi, gece lambaları ve gün sayacı
const LIGHT_K = Math.PI; // Unity URP ışık şiddeti → three.js (fiziksel) çarpanı
class DayNight extends Behaviour {
  static DayLength = 240; // bir tam gün (saniye)
  static SkyDay = C(0.62, 0.8, 0.95);
  static SkyDusk = C(0.95, 0.62, 0.45);
  static SkyNight = C(0.07, 0.09, 0.2);
  static MaxLamps = 8; // aynı anda yanan en fazla nokta ışık (telefonlar için)

  constructor() {
    super(); this.go.name = 'GunGece';
    this.time = 0.3; this.day = 1; this.Daylight = 1;
    this.lamps = []; this.fixtures = []; this.halos = []; this.fixLit = -1;
  }

  get Clock() { const m = Math.floor(this.time * 24 * 60) % (24 * 60); return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); }
  get IsNight() { return this.Daylight < 0.35; }

  Init() { this.Apply(); }

  // Gece yanan aydınlatma parçaları (fener camı, avize mumu): gündüz sönük, gece parlak
  AddFixture(mesh, c, halo) {
    if (!mesh) return;
    this.fixtures.push({ mesh, on: U.Bright(c), off: mesh.material });
    if (halo > 0) {
      const b = U.WorldBounds(mesh);
      const h = U.Halo(mesh.parent, b.center, halo, c);
      h.visible = false;
      this.halos.push(h);
    }
    this.fixLit = -1;
  }

  // Lambalar veri olarak tutulur; sabit sayıda gerçek ışık en yakın lambalara taşınır
  // (ışık sayısı değişirse three.js tüm gölgelendiricileri yeniden derler)
  AddLamp(pos, range, intensity, c, parent) {
    this.lamps.push({ base: intensity, pos: pos.clone(), range, c: Col.three(c), parent: parent || null });
  }
  ensurePool() {
    if (this.pool) return;
    this.pool = [];
    for (let i = 0; i < DayNight.MaxLamps; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 1.6); W.add(l); this.pool.push(l); }
  }

  Update() {
    const before = this.time;
    this.time += Time.deltaTime / DayNight.DayLength;
    if (this.time >= 1) this.time -= 1;
    // Sabah 06:00'yı geçince yeni gün
    if (before < 0.25 && this.time >= 0.25) { this.day++; GameManager.I.OnNewDay(); }
    this.Apply();
  }

  Apply() {
    const alt = Math.sin((this.time - 0.25) * Math.PI * 2); // 06:00'da 0, 12:00'de 1
    this.Daylight = Mathf.SmoothStep(0, 1, Mathf.InverseLerp(-0.15, 0.3, alt));
    const dusk = Mathf.Clamp01(1 - Math.abs(alt) / 0.3) * (alt > -0.2 ? 1 : 0);
    const gl = typeof Events !== 'undefined' ? Events.Gloom : 0; // yağmur ve bulut: güneş zayıflar, gök griye döner

    const elev = Mathf.Lerp(18, 58, Mathf.Clamp01(alt));
    SunState.x = elev; SunState.y = -110 + this.time * 160;
    sunLight.intensity = Mathf.Lerp(0.18, 1.35, this.Daylight) * (1 - 0.6 * gl) * LIGHT_K;
    const day = C(1, 0.95, 0.86), warm = C(1, 0.62, 0.4), night = C(0.55, 0.65, 1);
    sunLight.color.copy(Col.three(Col.lerp(Col.lerp(night, day, this.Daylight), warm, dusk * 0.7)));
    // gölge gücü: three'de doğrudan yok; ortam ışığını artırarak gölgeleri yumuşatırız
    const shadowStrength = Mathf.Lerp(0.2, 0.55, this.Daylight) * (1 - 0.7 * gl);

    let sky = Col.lerp(DayNight.SkyNight, DayNight.SkyDay, this.Daylight);
    sky = Col.lerp(sky, DayNight.SkyDusk, dusk * 0.55 * (1 - gl));
    sky = Col.lerp(sky, Col.mul(C(0.45, 0.5, 0.56), Mathf.Lerp(0.3, 1, this.Daylight)), Mathf.Clamp01(gl * 1.4));
    scene.background.copy(Col.three(sky));
    scene.fog.color.copy(Col.three(sky));
    const skyA = Col.lerp(C(0.3, 0.36, 0.6), C(0.78, 0.84, 0.95), this.Daylight);
    const eqA = Col.lerp(C(0.32, 0.32, 0.45), C(0.75, 0.72, 0.68), this.Daylight);
    const grA = Col.lerp(C(0.2, 0.2, 0.28), C(0.48, 0.45, 0.42), this.Daylight);
    hemiLight.color.copy(Col.three(Col.lerp(skyA, eqA, 0.35)));
    hemiLight.groundColor.copy(Col.three(Col.lerp(grA, eqA, 0.35)));
    hemiLight.intensity = LIGHT_K * (1.0 + (0.55 - shadowStrength) * 0.6);

    // Kapalı havada lambalar erken yanar: içerisi sıcak ve aydınlık, dışarısı gri
    const eff = this.Daylight * (1 - 0.65 * gl);
    const on = eff < 0.55;
    if ((on ? 1 : 0) !== this.fixLit) {
      this.fixLit = on ? 1 : 0;
      for (const f of this.fixtures) if (alive(f.mesh)) f.mesh.material = on ? f.on : f.off;
      for (const h of this.halos) h.visible = on;
    }
    const k = Mathf.Lerp(1, 0.3, eff / 0.55);
    // Sadece kameraya en yakın birkaç lamba yanar (performans)
    const focus = SunState.target || V();
    this.ensurePool();
    const lit = on ? this.lamps.filter(L => !L.parent || activeInHierarchy(L.parent))
      .map(L => ({ L, d: Math.hypot(L.pos.x - focus.x, L.pos.z - focus.z) - L.range * 0.3 }))
      .sort((a, b) => a.d - b.d).slice(0, DayNight.MaxLamps) : [];
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i], o = lit[i];
      if (!o) { l.intensity = 0; continue; }
      l.position.copy(o.L.pos); l.color.copy(o.L.c); l.distance = o.L.range * 1.15;
      l.intensity = o.L.base * k * LIGHT_K * 1.6;
    }
  }
}
