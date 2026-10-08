// Dünya: Lavanta Koyu kasabası, zemin, deniz, tepeler, gökyüzü, gündüz/gece ve sokak lambaları
const World = {
  T: 6,                 // bir kasaba karosu (m)
  time: 0.33, day: 1, daylight: 1, weather: 'sunny',
  lamps: [], pool: [], fixtures: [], halos: [], lit: -1,
  sea: null, clouds: [], root: null,

  Build() {
    const T = this.T, root = U.Pivot(W, V(), 'Kasaba'); this.root = root;
    // --- zemin: büyük çim, kum ve deniz ---
    const grass = U.Prim('Cim', root, V(0, -0.02, -6), V(220, 0.04, 150), U.Mat(C(0.56, 0.78, 0.4), { tex: U.GrassTex, tiling: { x: 40, y: 28 } }));
    grass.material = grass.material.clone(); this.grass = grass;
    grass.receiveShadow = true; grass.castShadow = false;
    // kumsal ve deniz güneyde
    U.Prim('Kum', root, V(0, 0.0, 30), V(220, 0.06, 12), U.Mat(C(0.96, 0.88, 0.7), { tex: U.SandTex, tiling: { x: 30, y: 2 } }));
    this.BuildSea(root);
    this.BuildHills(root);

    // --- karo haritası (i: x, j: z; otel arsası i -2..2, j -1..1) ---
    const road = (i, j, name, yaw) => { const m = U.City(name, root, V(i * T, -0.22, j * T), yaw); U.NoShadow(m); return m; };
    for (let i = -6; i <= 6; i++) for (const j of [-2, 2]) {
      if (Math.abs(i) === 3) road(i, j, 'road-intersection', 0);
      else if (Math.abs(i) === 6) road(i, j, 'road-corner', j > 0 ? (i > 0 ? 180 : 90) : (i > 0 ? 270 : 0));
      else road(i, j, (i % 2 === 0) ? 'road-straight-lightposts' : 'road-straight', 90);
    }
    for (let j = -1; j <= 1; j++) for (const i of [-3, 3, -6, 6]) road(i, j, (j === 0 && Math.abs(i) === 3) ? 'road-straight-lightposts' : 'road-straight', 0);
    // kaldırım: otel arsasının çevresi (j = ±1.5 arası arsa kenarı) basit düz taş
    const pave = U.Mat(C(0.86, 0.84, 0.8), { tex: U.TileTex, tiling: { x: 20, y: 2 } });
    U.Prim('KaldirimG', root, V(0, 0.01, 9.6), V(31, 0.06, 2.2), pave).castShadow = false;
    U.Prim('KaldirimK', root, V(0, 0.01, -9.6), V(31, 0.06, 2.2), pave).castShadow = false;
    U.Prim('KaldirimD', root, V(15.4, 0.01, 0), V(2.2, 0.06, 21.4), pave).castShadow = false;
    U.Prim('KaldirimB', root, V(-15.4, 0.01, 0), V(2.2, 0.06, 21.4), pave).castShadow = false;
    // otel ön yolu: girişten kaldırıma
    U.Prim('Yol', root, V(0, 0.02, 8.4), V(4.2, 0.06, 2), U.Mat(C(0.9, 0.86, 0.78), { tex: U.TileTex, tiling: { x: 3, y: 1.5 } })).castShadow = false;

    // --- kasaba binaları ---
    const bld = ['building-small-a', 'building-small-b', 'building-small-c', 'building-small-d', 'building-garage'];
    const rnd = new SysRandom(11);
    const spots = [];
    for (const j of [-1, 0, 1]) for (const i of [-5, -4, 4, 5]) spots.push([i, j]);
    for (const i of [-5, -4, -2, -1, 1, 2, 4, 5]) spots.push([i, -3]);
    for (const i of [-5, -2, 2, 5]) spots.push([i, 3]);
    for (const [i, j] of spots) {
      const k = rnd.NextDouble();
      if (k < 0.72) U.City(bld[rnd.Next(0, bld.length)], root, V(i * T, 0, j * T), [0, 90, 180, 270][rnd.Next(0, 4)]);
      else U.City(k < 0.9 ? 'grass-trees' : 'grass-trees-tall', root, V(i * T, -0.22, j * T), 0);
    }
    // meydan ve çeşme (güney, yolun karşısı)
    U.City('pavement-fountain', root, V(0, -0.22, 3 * T), 0);
    for (const i of [-1, 1]) U.City('pavement', root, V(i * T, -0.22, 3 * T), 0);
    for (const i of [-4, -3, 3, 4]) U.City('grass-trees', root, V(i * T, -0.22, 3 * T), 0);
    // sokak lambaları (gece yanar) – yol karolarındaki direkler için ışık kayıtları
    for (let i = -6; i <= 6; i += 2) for (const j of [-2, 2]) this.AddLamp(V(i * T, 2.6, j * T + (j > 0 ? -2.2 : 2.2)), 9, 1.1, C(1, 0.85, 0.55));
    for (const i of [-3, 3]) this.AddLamp(V(i * T + (i > 0 ? -2.2 : 2.2), 2.6, 0), 9, 1.1, C(1, 0.85, 0.55));

    // --- bulutlar ---
    for (let k = 0; k < 7; k++) {
      const c = U.Model('cloud', root, V(rnd.Range(-90, 90), rnd.Range(26, 40), rnd.Range(-70, 40)), 0, rnd.Range(2.5, 5), 1);
      c.traverse(o => { if (o.isMesh) { o.castShadow = false; o.material = U.Mat(C(1, 1, 1, 0.9), 0.5); } });
      c.userData.v = rnd.Range(0.3, 0.8); this.clouds.push(c);
    }
    // --- kuşlar (basit) ---
    this.birds = [];
    for (let k = 0; k < 6; k++) {
      const b = U.Pivot(root, V(), 'Kus');
      U.Box('g1', b, V(-0.25, 0, 0), V(0.5, 0.04, 0.14), C(0.2, 0.2, 0.25)); U.Box('g2', b, V(0.25, 0, 0), V(0.5, 0.04, 0.14), C(0.2, 0.2, 0.25));
      U.NoShadow(b);
      this.birds.push({ go: b, a: rnd.Range(0, 6.28), r: rnd.Range(18, 40), h: rnd.Range(14, 22), s: rnd.Range(0.15, 0.3), cx: rnd.Range(-20, 20), cz: rnd.Range(-30, 10) });
    }
    this.ensurePool();
    this.Apply();
  },

  BuildSea(root) {
    const g = new THREE.PlaneGeometry(260, 110, 90, 40);
    const mat = new THREE.MeshStandardMaterial({ color: Col.three(C(0.3, 0.62, 0.86)), roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = this.seaU = { value: 0 };
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float w = sin(position.x*0.35 + uT*1.3) * 0.12 + sin(position.y*0.5 + uT*0.9) * 0.1 + sin((position.x+position.y)*0.2 + uT*0.6)*0.08;\n transformed.z += w;');
    };
    const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.04, 36 + 55); m.receiveShadow = true; m.name = 'Deniz';
    root.add(m); this.sea = m;
    // köpük şeridi (kıyı)
    U.Flat('Kopuk', root, V(0, 0.08, 36.2), V(220, 0.02, 0.6), C(1, 1, 1, 0.75));
  },
  BuildHills(root) {
    const parts = [], rnd = new SysRandom(5);
    for (let k = 0; k < 14; k++) {
      const x = rnd.Range(-110, 110), z = rnd.Range(-95, -60), s = rnd.Range(16, 34);
      parts.push({ geo: 'Sphere', pos: V(x, -s * 0.35, z), scale: V(s * 1.6, s, s * 1.2), c: Col.lerp(C(0.42, 0.66, 0.38), C(0.58, 0.72, 0.5), rnd.NextDouble()) });
    }
    for (let k = 0; k < 5; k++) { const x = rnd.Range(-80, 80), z = rnd.Range(-120, -95), s = rnd.Range(30, 48); parts.push({ geo: 'Sphere', pos: V(x, -s * 0.3, z), scale: V(s * 1.7, s, s), c: C(0.56, 0.68, 0.72) }); }
    const m = U.Merge('Tepeler', root, parts); m.castShadow = false;
  },

  // ---- gece ışıkları (havuz) ----
  AddLamp(pos, range, intensity, c) { this.lamps.push({ pos: pos.clone(), range, base: intensity, c: Col.three(c) }); },
  AddFixture(mesh, c, halo) {
    if (!mesh) return;
    this.fixtures.push({ mesh, on: U.Glow(c, 1.6), off: mesh.material });
    if (halo > 0) { const b = U.WorldBounds(mesh); const h = U.Halo(W, b.center, halo, c, 0.45); h.visible = false; this.halos.push(h); }
    this.lit = -1;
  },
  ensurePool() { if (this.pool.length) return; for (let i = 0; i < 10; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 1.7); W.add(l); this.pool.push(l); } },

  get Clock() { const m = Math.floor(this.time * 24 * 60) % (24 * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },
  get IsNight() { return this.daylight < 0.35; },
  get WeatherText() { return Life.WeatherText; },

  Tick(dt) {
    const before = this.time;
    this.time += dt / Data.DayLength;
    if (this.time >= 1) this.time -= 1;
    if (before < 0.25 && this.time >= 0.25) { this.day++; Game.OnNewDay(); }
    if (this.seaU) this.seaU.value += dt;
    for (const c of this.clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 110) c.position.x = -110; }
    for (const b of this.birds) { b.a += b.s * dt; const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r; const dx = -Math.sin(b.a), dz = Math.cos(b.a); b.go.position.set(x, b.h + Math.sin(b.a * 3) * 0.5, z); b.go.rotation.set(0, Math.atan2(dx, dz), Math.sin(Time.time * 8 + b.a) * 0.35); }
    this.Apply();
  },

  Apply() {
    const alt = Math.sin((this.time - 0.25) * Math.PI * 2);
    this.daylight = Mathf.SmoothStep(0, 1, Mathf.InverseLerp(-0.15, 0.3, alt));
    const dusk = Mathf.Clamp01(1 - Math.abs(alt) / 0.3) * (alt > -0.2 ? 1 : 0);
    const gl = this.weather === 'rainy' ? 0.75 : this.weather === 'cloudy' ? 0.4 : this.weather === 'snowy' ? 0.5 : 0;
    const elev = Mathf.Lerp(16, 60, Mathf.Clamp01(alt));
    Sun.elev = elev; Sun.az = -115 + this.time * 170;
    sunLight.intensity = Mathf.Lerp(0.15, 3.6, this.daylight) * (1 - 0.6 * gl);
    const day = C(1, 0.96, 0.88), warm = C(1, 0.62, 0.4), night = C(0.5, 0.6, 1);
    sunLight.color.copy(Col.three(Col.lerp(Col.lerp(night, day, this.daylight), warm, dusk * 0.7)));
    let sky = Col.lerp(C(0.07, 0.09, 0.22), C(0.6, 0.8, 0.96), this.daylight);
    sky = Col.lerp(sky, C(0.97, 0.64, 0.48), dusk * 0.55 * (1 - gl));
    sky = Col.lerp(sky, Col.mul(C(0.5, 0.55, 0.6), Mathf.Lerp(0.3, 1, this.daylight)), Mathf.Clamp01(gl * 1.3));
    scene.background.copy(Col.three(sky)); scene.fog.color.copy(Col.three(sky));
    const skyA = Col.lerp(C(0.3, 0.36, 0.62), C(0.8, 0.86, 0.97), this.daylight);
    const grA = Col.lerp(C(0.18, 0.18, 0.26), C(0.5, 0.48, 0.42), this.daylight);
    hemiLight.color.copy(Col.three(skyA)); hemiLight.groundColor.copy(Col.three(grA));
    hemiLight.intensity = Mathf.Lerp(0.9, 1.6, this.daylight) * (1 + 0.5 * gl);
    const eff = this.daylight * (1 - 0.65 * gl);
    if (scene.environment) scene.environmentIntensity = 0.05 + 0.35 * eff;
    const on = eff < 0.55;
    if ((on ? 1 : 0) !== this.lit) {
      this.lit = on ? 1 : 0;
      for (const f of this.fixtures) if (alive(f.mesh)) f.mesh.material = on ? f.on : f.off;
      for (const h of this.halos) h.visible = on;
    }
    const k = Mathf.Lerp(1, 0.3, eff / 0.55);
    const focus = Cam.target;
    const lit = on ? this.lamps.map(L => ({ L, d: Math.hypot(L.pos.x - focus.x, L.pos.z - focus.z) })).sort((a, b) => a.d - b.d).slice(0, this.pool.length) : [];
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i], o = lit[i];
      if (!o) { l.intensity = 0; continue; }
      l.position.copy(o.L.pos); l.color.copy(o.L.c); l.distance = o.L.range * 1.2; l.intensity = o.L.base * k * 14;
    }
  },
};
// Güneş yönü: yükseklik ve azimut (derece); gölge kamerası hedefi takip eder
const Sun = { elev: 50, az: -40, target: V() };
function applySun() {
  const e = Sun.elev * Mathf.Deg2Rad, a = Sun.az * Mathf.Deg2Rad;
  const d = V(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
  const t = Sun.target;
  sunLight.target.position.set(t.x, 0, t.z);
  sunLight.position.set(t.x + d.x * 60, d.y * 60, t.z + d.z * 60);
}
