// Grafik kalitesi: ortam yansımaları, parlama (bloom), yumuşak gölgeler ve cihaza göre otomatik ayar.
// Seviyeler: 2 Yüksek (parlama + keskin gölge), 1 Orta (parlama yok), 0 Düşük (gölge yok, düşük çözünürlük).
const Quality = {
  level: 2, names: ['Düşük', 'Orta', 'Yüksek'], composer: null, bloom: null, auto: true,
  fpsT: 0, frames: 0, slow: 0,

  Init() {
    // Ortam ışığı: malzemelere hafif yansıma ve derinlik (Unity URP'deki yansıma sondasının karşılığı)
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    pm.dispose();
    const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
    let saved = null;
    try { saved = localStorage.getItem('otel_grafik'); } catch (e) { }
    if (saved != null && saved !== '') { this.level = +saved; this.auto = false; }
    else this.level = mobile ? 1 : 2;
    this.Apply();
  },

  Set(l, manual) {
    this.level = Mathf.Clamp(l, 0, 2);
    if (manual) { this.auto = false; try { localStorage.setItem('otel_grafik', String(this.level)); } catch (e) { } }
    this.Apply();
  },

  Apply() {
    const L = this.level;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, L === 2 ? 2 : L === 1 ? 1.5 : 1));
    renderer.shadowMap.enabled = L > 0;
    sunLight.castShadow = L > 0;
    sunLight.shadow.mapSize.set(L === 2 ? 4096 : 2048, L === 2 ? 4096 : 2048);
    sunLight.shadow.radius = L === 2 ? 3 : 2;
    if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
    scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.needsUpdate = true; } });
    if (L === 2) this.MakeComposer(); else this.composer = null;
    this.Resize();
  },

  MakeComposer() {
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(renderer, rt);
    c.addPass(new RenderPass(scene, camera));
    // sadece gerçekten parlayan şeyler (lamba, tabela ışığı, avize) hafifçe ışıldar
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.35, 0.35, 1.9);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  },

  Resize() {
    if (!this.composer) return;
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(innerWidth, innerHeight);
  },

  Render() {
    if (this.composer) this.composer.render(); else renderer.render(scene, camera);
  },

  // Otomatik: 5 sn boyunca ortalama 40 fps altındaysa bir seviye düşür
  Tick(raw) {
    if (!this.auto || window.__sub) return;
    this.fpsT += raw; this.frames++;
    if (this.fpsT < 5) return;
    const fps = this.frames / this.fpsT;
    this.fpsT = 0; this.frames = 0;
    if (fps < 40 && this.level > 0) { this.slow++; if (this.slow >= 1) { this.slow = 0; this.Set(this.level - 1, false); } }
    else this.slow = 0;
  },
};
