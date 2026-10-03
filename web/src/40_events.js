// ============================================================================
// Events.cs (+ PrecipCull) · Günlük hava durumu, gün içinde rastgele olaylar (seçimli) ve geçici etkiler
// Unity ParticleSystem yerine hafif bir parçacık yayıcısı (PrecipEmitter) kullanılır.
// ============================================================================

// Hava tipleri (Events.W). Üst düzeyde "W" adı Unity uzayı grubuna ait olduğu için EvW adıyla tutulur.
const EvW = Object.freeze({ Gunesli: 0, Bulutlu: 1, Yagmurlu: 2, Firtina: 3, Sicak: 4, Karli: 5 });

// Telefonlarda yağmur damlası sayısını azalt
const PRECIP_Q = (() => { try { return matchMedia('(pointer: coarse)').matches ? 0.6 : 1; } catch (e) { return 1; } })();

// ---------------------------------------------------------------- Parçacık yayıcısı (ParticleSystem karşılığı)
// Dünya uzayında (W içinde, Unity koordinatı) benzetim. Kutu biçiminde yayar.
// mode: 'line' (Stretch: yağmur çizgisi), 'points' (Billboard kare: kar/yaprak), 'ring' (HorizontalBillboard halka: sıçrama)
class PrecipEmitter extends Behaviour {
  constructor(name, o) {
    super();
    this.go.name = name;
    this.mode = o.mode;
    this.max = o.max;
    this.life = o.life || [1, 1];
    this.box = o.box || V(1, 1, 1);
    this.velX = o.velX || [0, 0]; this.velY = o.velY || [0, 0]; this.velZ = o.velZ || [0, 0];
    this.startVel = o.startVel || V(0, 0, 0);     // startSpeed * kutu ileri yönü (+z)
    this.size = o.size || [1, 1];
    this.colA = o.colA || Col.white; this.colB = o.colB || null;
    this.lineLen = o.lineLen || 1;
    this.rate = 0; this.emitting = false; this.acc = 0; this.hooked = false;
    const M = this.max;
    this.n = 0;
    this.px = new Float32Array(M); this.py = new Float32Array(M); this.pz = new Float32Array(M);
    this.vx = new Float32Array(M); this.vy = new Float32Array(M); this.vz = new Float32Array(M);
    this.age = new Float32Array(M); this.lf = new Float32Array(M); this.sz = new Float32Array(M);
    this.cr = new Float32Array(M); this.cg = new Float32Array(M); this.cb = new Float32Array(M);
    this.build();
  }

  build() {
    const M = this.max;
    if (this.mode === 'line') {
      const g = new THREE.BufferGeometry();
      this.pos = new THREE.BufferAttribute(new Float32Array(M * 6), 3); this.pos.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', this.pos);
      g.setDrawRange(0, 0);
      const m = new THREE.LineBasicMaterial({ color: Col.three(this.colA), transparent: true, opacity: this.colA.a ?? 1, depthWrite: false });
      this.obj = new THREE.LineSegments(g, m);
    } else if (this.mode === 'points') {
      const g = new THREE.BufferGeometry();
      this.pos = new THREE.BufferAttribute(new Float32Array(M * 3), 3); this.pos.setUsage(THREE.DynamicDrawUsage);
      this.col = new THREE.BufferAttribute(new Float32Array(M * 3), 3); this.col.setUsage(THREE.DynamicDrawUsage);
      this.psz = new THREE.BufferAttribute(new Float32Array(M), 1); this.psz.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', this.pos); g.setAttribute('color', this.col); g.setAttribute('psize', this.psz);
      g.setDrawRange(0, 0);
      const m = new THREE.PointsMaterial({ size: 1, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, sizeAttenuation: true });
      // parçacık başına boyut
      m.onBeforeCompile = sh => {
        sh.vertexShader = 'attribute float psize;\n' + sh.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * psize;');
      };
      this.obj = new THREE.Points(g, m);
    } else {
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
      const m = new THREE.MeshBasicMaterial({ map: Events.RingTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      this.obj = new THREE.InstancedMesh(g, m, M);
      this.obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.obj.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(M * 3), 3);
      this.obj.count = 0;
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = V(); this._p = V(); this._c = new THREE.Color();
    }
    this.obj.name = this.go.name + 'Cizim';
    this.obj.frustumCulled = false;
    this.obj.castShadow = false; this.obj.receiveShadow = false;
    this.obj.renderOrder = 4;
    this.obj.userData.ownMat = true;
    this.go.add(this.obj);
    // benzetim dünya uzayında: çizim nesnesi yayıcının konumunu izlemez
    this.obj.matrixAutoUpdate = false;
  }

  // Yayıcı konumu ne olursa olsun çizim nesnesi W'nin kökünde dursun
  syncObj() {
    const p = this.go.position;
    this.obj.matrix.makeTranslation(-p.x, -p.y, -p.z);
    this.obj.matrixWorldNeedsUpdate = true;
  }

  // Görünüm ayarı (Seasons her mevsimde değiştirir)
  SetColor(a, b) {
    this.colA = a; this.colB = b || null;
    if (this.mode === 'points') this.obj.material.opacity = a.a ?? 1;
  }

  Play() { this.emitting = true; }
  Stop() { this.emitting = false; }
  Clear() { this.n = 0; this.acc = 0; }
  get isPlaying() { return this.emitting || this.n > 0; }

  spawn() {
    const i = this.n++;
    const o = this.go.position, b = this.box;
    this.px[i] = o.x + Random.Range(-0.5, 0.5) * b.x;
    this.py[i] = o.y + Random.Range(-0.5, 0.5) * b.y;
    this.pz[i] = o.z + Random.Range(-0.5, 0.5) * b.z;
    this.vx[i] = this.startVel.x + Random.Range(this.velX[0], this.velX[1]);
    this.vy[i] = this.startVel.y + Random.Range(this.velY[0], this.velY[1]);
    this.vz[i] = this.startVel.z + Random.Range(this.velZ[0], this.velZ[1]);
    this.age[i] = 0;
    this.lf[i] = Random.Range(this.life[0], this.life[1]);
    this.sz[i] = Random.Range(this.size[0], this.size[1]);
    const c = this.colB ? Col.lerp(this.colA, this.colB, Random.value) : this.colA;
    const tc = Col.three(c);  // doğrusal renk
    this.cr[i] = tc.r; this.cg[i] = tc.g; this.cb[i] = tc.b;
  }

  kill(i) {
    const j = --this.n;
    if (i === j) return;
    this.px[i] = this.px[j]; this.py[i] = this.py[j]; this.pz[i] = this.pz[j];
    this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j]; this.vz[i] = this.vz[j];
    this.age[i] = this.age[j]; this.lf[i] = this.lf[j]; this.sz[i] = this.sz[j];
    this.cr[i] = this.cr[j]; this.cg[i] = this.cg[j]; this.cb[i] = this.cb[j];
  }

  Update() {
    const dt = Time.deltaTime;
    if (dt <= 0) return;
    if (this.emitting && this.rate > 0) {
      this.acc += this.rate * dt;
      while (this.acc >= 1) { this.acc -= 1; if (this.n < this.max) this.spawn(); else { this.acc = 0; break; } }
    }
    for (let i = this.n - 1; i >= 0; i--) {
      this.age[i] += dt;
      if (this.age[i] >= this.lf[i]) { this.kill(i); continue; }
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
    }
  }

  LateUpdate() {
    if (this.hooked) PrecipCull.LateUpdate(this);
    this.syncObj();
    const n = this.n;
    if (this.mode === 'line') {
      const a = this.pos.array;
      for (let i = 0; i < n; i++) {
        const vx = this.vx[i], vy = this.vy[i], vz = this.vz[i];
        const sp = Math.hypot(vx, vy, vz) || 1, k = this.lineLen / sp;
        const o = i * 6;
        a[o] = this.px[i]; a[o + 1] = this.py[i]; a[o + 2] = this.pz[i];
        a[o + 3] = this.px[i] - vx * k; a[o + 4] = this.py[i] - vy * k; a[o + 5] = this.pz[i] - vz * k;
      }
      this.pos.needsUpdate = true;
      this.obj.geometry.setDrawRange(0, n * 2);
    } else if (this.mode === 'points') {
      const a = this.pos.array, c = this.col.array, s = this.psz.array;
      for (let i = 0; i < n; i++) {
        a[i * 3] = this.px[i]; a[i * 3 + 1] = this.py[i]; a[i * 3 + 2] = this.pz[i];
        c[i * 3] = this.cr[i]; c[i * 3 + 1] = this.cg[i]; c[i * 3 + 2] = this.cb[i];
        s[i] = this.sz[i];
      }
      this.pos.needsUpdate = true; this.col.needsUpdate = true; this.psz.needsUpdate = true;
      this.obj.geometry.setDrawRange(0, n);
    } else {
      const al0 = this.colA.a ?? 1;
      for (let i = 0; i < n; i++) {
        const t = this.age[i] / this.lf[i];
        const k = this.sz[i] * Mathf.Lerp(0.35, 1.25, t);   // sizeOverLifetime
        const al = al0 * (1 - t);                            // colorOverLifetime: alfa 1 → 0
        this._p.set(this.px[i], this.py[i], this.pz[i]); this._s.set(k, 1, k);
        this._m.compose(this._p, this._q, this._s);
        this.obj.setMatrixAt(i, this._m);
        this._c.setRGB(this.cr[i] * al, this.cg[i] * al, this.cb[i] * al);
        this.obj.setColorAt(i, this._c);
      }
      this.obj.count = n;
      this.obj.instanceMatrix.needsUpdate = true;
      if (this.obj.instanceColor) this.obj.instanceColor.needsUpdate = true;
    }
  }
}

// Yağış parçacıklarını, kameradan bakınca binanın üstüne denk geliyorsa gizler.
// Böylece yağmur ve kar sadece açık havada görünür, içerisi kuru kalır.
const PrecipCull = {
  LateUpdate(ps) {
    if (!ps || !camera || Events.roofs.length === 0) return;
    const n = ps.n;
    if (n === 0) return;
    camera.updateMatrixWorld();
    const c = W.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));  // kamera, Unity uzayında
    const p = { x: 0, y: 0, z: 0 };
    for (let i = n - 1; i >= 0; i--) {
      p.x = ps.px[i]; p.y = ps.py[i]; p.z = ps.pz[i];
      if (Events.UnderRoof(c, p)) ps.kill(i);
    }
  },
};

// ---------------------------------------------------------------- Events
const Events = {
  W: EvW,
  WNames: ['Güneşli', 'Bulutlu', 'Yağmurlu', 'Fırtınalı', 'Sıcak dalgası', 'Karlı'],
  weather: EvW.Gunesli,

  // geçici etkiler
  spawnBuffT: 0, spawnBuff: 1, satBuffT: 0, satBuff: 0,
  flash: 0, // şimşek (ekran beyazlaması)

  times: [],
  fired: [],
  rain: null, splash: null,
  thunderT: 8,

  // ---- İç / dış ayrımı: yağış sadece açık havada ----
  get Wet() { return this.weather === EvW.Yagmurlu || this.weather === EvW.Firtina; },
  wetNow: 0, gloomNow: 0,
  get Gloom() { return this.gloomNow; },       // 0 açık hava, 1 çok kasvetli
  get WetAmount() { return this.wetNow; },     // zeminin ıslaklığı (yavaş yavaş artar/azalır)
  get GloomTarget() { const w = this.weather; return w === EvW.Firtina ? 0.55 : w === EvW.Yagmurlu ? 0.38 : w === EvW.Bulutlu ? 0.16 : w === EvW.Karli ? 0.22 : 0; },

  wetMats: [],      // { m, c, s, dark, shine }
  puddles: [],
  puddleSize: [],
  wetApplied: -1,

  // Çatılı alanlar (x0, z0, x1, z1) ve sahibi (kapalıysa yok sayılır)
  roofs: [],
  roofOwner: [],
  hooked: [],

  // Bu alanın üstünde (kameradan bakınca) yağmur, kar ve yaprak görünmez
  Shelter(parent, center, size) {
    this.roofs.push(Rect.MinMaxRect(center.x - size.x / 2, center.z - size.z / 2, center.x + size.x / 2, center.z + size.z / 2));
    this.roofOwner.push(parent || null);
  },

  Hook(ps) {
    if (!ps || this.hooked.includes(ps)) return;
    this.hooked.push(ps);
    ps.hooked = true; // PrecipCull eklendi
  },

  // Kameradan parçacığa giden ışının yere değdiği nokta bir çatının altındaysa true
  UnderRoof(cam, p) {
    const dy = cam.y - p.y;
    if (dy < 0.05) return false;
    const t = cam.y / dy;
    const gx = cam.x + (p.x - cam.x) * t, gz = cam.z + (p.z - cam.z) * t;
    for (let i = 0; i < this.roofs.length; i++) {
      const o = this.roofOwner[i];
      if (o && !o.userData.destroyed && !activeInHierarchy(o)) continue;
      const r = this.roofs[i];
      if (gx > r.xMin && gx < r.xMax && gz > r.yMin && gz < r.yMax) return true;
    }
    return false;
  },

  // Yağmurda koyulaşıp parlayan dış zeminler (kaldırım, asfalt, çim). m: MeshStandardMaterial (kendi kopyası olmalı)
  RegisterWet(m, dark, shine) {
    if (!m) return;
    const w = { m, dark, shine };
    if (m.userData && m.userData.color) w.c = { ...m.userData.color };
    else if (m.color) { const o = {}; m.color.getRGB(o, THREE.SRGBColorSpace); w.c = C(o.r, o.g, o.b); }
    else w.c = Col.white;
    w.s = m.roughness !== undefined ? 1 - m.roughness : 0.2;
    this.wetMats.push(w);
    this.wetApplied = -1;
  },

  // Mevsim çimin rengini değiştirince ıslaklık bu rengin üzerine uygulanır
  WetBase(m, c) {
    for (const w of this.wetMats) if (w.m === m) w.c = c;
    this.wetApplied = -1;
  },

  RegisterPuddle(t) {
    this.puddles.push(t);
    this.puddleSize.push(t.scale.clone());
    SetActive(t, false);
  },

  ApplyWet() {
    if (Math.abs(this.wetNow - this.wetApplied) < 0.01) return;
    this.wetApplied = this.wetNow;
    for (const w of this.wetMats) {
      if (!w.m) continue;
      if (w.m.color) { const k = Mathf.Lerp(1, w.dark, this.wetNow); w.m.color.copy(Col.three(C(w.c.r * k, w.c.g * k, w.c.b * k))); }
      if (w.m.roughness !== undefined) w.m.roughness = Mathf.Clamp(1 - Mathf.Lerp(w.s, w.shine, this.wetNow), 0.05, 1);
    }
    const k = Mathf.Clamp01((this.wetNow - 0.25) / 0.75);
    for (let i = 0; i < this.puddles.length; i++) {
      const p = this.puddles[i];
      if (!alive(p)) continue;
      const on = k > 0.02;
      if (activeSelf(p) !== on) SetActive(p, on);
      const sz = this.puddleSize[i];
      p.scale.set(Math.max(sz.x * k, 1e-4), sz.y, Math.max(sz.z * k, 1e-4));
    }
  },

  _ringTex: null,
  get RingTex() {
    if (this._ringTex) return this._ringTex;
    const n = 64;
    this._ringTex = canvasTex(n, (x, y) => {
      const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1;
      const d = Math.sqrt(dx * dx + dy * dy);
      const a = Mathf.Clamp01(1 - Math.abs(d - 0.72) / 0.16);
      return [1, 1, 1, a * a];
    }, false);
    return this._ringTex;
  },

  get G() { return GameManager.I; },

  // ---- Etkiler ----
  get SpawnMul() {
    const w = this.weather;
    let m = w === EvW.Yagmurlu ? 0.9 : w === EvW.Firtina ? 0.65 : w === EvW.Sicak ? 1.1 : 1;
    if (this.spawnBuffT > 0) m *= this.spawnBuff;
    return m;
  },
  get PoolMul() { const w = this.weather; return w === EvW.Yagmurlu ? 0.15 : w === EvW.Firtina ? 0 : w === EvW.Sicak ? 1.6 : w === EvW.Karli ? 0.2 : w === EvW.Bulutlu ? 0.8 : 1; },
  get CafeAdd() { const w = this.weather; return w === EvW.Yagmurlu ? 0.25 : w === EvW.Firtina ? 0.3 : w === EvW.Karli ? 0.2 : w === EvW.Sicak ? -0.15 : 0; },
  get SatBonus() { return this.satBuffT > 0 ? this.satBuff : 0; },
  get BuffText() {
    let s = '';
    if (this.spawnBuffT > 0) s += this.spawnBuff >= 1 ? 'Misafir akını' : 'Misafir azaldı';
    if (this.satBuffT > 0) s += (s.length > 0 ? ' · ' : '') + (this.satBuff >= 0 ? 'Misafirler keyifli' : 'Misafirler huysuz');
    return s;
  },

  SpawnBuff(mul, secs) { this.spawnBuff = mul; this.spawnBuffT = secs; },
  SatBuff(add, secs) { this.satBuff = add; this.satBuffT = secs; },

  // ---- Gün başı ----
  NewDay(day) {
    const s = Seasons.Current, S = Seasons.S, Wt = EvW;
    const r = Random.value;
    let w;
    if (Chain.cur === 1) { // Bodrum: bol güneş, kar yok
      if (s === S.Kis) w = r < 0.45 ? Wt.Gunesli : r < 0.75 ? Wt.Bulutlu : r < 0.93 ? Wt.Yagmurlu : Wt.Firtina;
      else w = r < 0.6 ? Wt.Gunesli : r < 0.85 ? Wt.Sicak : r < 0.95 ? Wt.Bulutlu : Wt.Yagmurlu;
    }
    else if (Chain.cur === 2 && s === S.Kis) w = r < 0.55 ? Wt.Karli : r < 0.8 ? Wt.Gunesli : r < 0.95 ? Wt.Bulutlu : Wt.Firtina;
    else if (s === S.Yaz) w = r < 0.55 ? Wt.Gunesli : r < 0.8 ? Wt.Sicak : r < 0.92 ? Wt.Bulutlu : Wt.Firtina;
    else if (s === S.Kis) w = r < 0.35 ? Wt.Karli : r < 0.6 ? Wt.Bulutlu : r < 0.85 ? Wt.Gunesli : Wt.Firtina;
    else w = r < 0.4 ? Wt.Gunesli : r < 0.65 ? Wt.Bulutlu : r < 0.9 ? Wt.Yagmurlu : Wt.Firtina;
    this.weather = w;
    if (day <= 2) this.weather = Wt.Gunesli;

    this.times.length = 0;
    this.fired.length = 0;
    if (day >= 2) {
      const n = Random.value < 0.35 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        this.times.push(Random.Range(0.32, 0.82));
        this.fired.push(false);
      }
    }
    this.ApplyVisual();
  },

  Restore(w) {
    this.weather = Mathf.Clamp(w | 0, 0, 5);
    this.wetNow = this.Wet ? 1 : 0;
    this.gloomNow = this.GloomTarget;
    this.wetApplied = -1;
    this.ApplyVisual();
  },

  Reset() {
    // Unity'de sahne yeniden yüklenince parçacık nesneleri de silinir; burada elle siliyoruz
    if (this.rain && alive(this.rain.go)) Destroy(this.rain.go);
    if (this.splash && alive(this.splash.go)) Destroy(this.splash.go);
    this.rain = null;
    this.splash = null;
    this.roofs.length = 0;
    this.roofOwner.length = 0;
    this.hooked.length = 0;
    this.wetMats.length = 0;
    this.puddles.length = 0;
    this.puddleSize.length = 0;
    this.wetApplied = -1;
    this.spawnBuffT = this.satBuffT = 0;
    this.times.length = 0;
    this.fired.length = 0;
  },

  ApplyVisual() {
    const wet = this.Wet;
    if (this.rain == null && camera) {
      this.rain = new PrecipEmitter('Yagmur', {
        mode: 'line', max: Math.round(2600 * PRECIP_Q), life: [1.1, 1.1],
        box: V(56, 1, 44),
        velX: [-1, -0.6], velY: [-13, -11], velZ: [0, 0],
        colA: C(0.75, 0.85, 1, 0.55),
        lineLen: 0.5 + 12 * 0.04, // startSizeY + hız * velocityScale (Stretch)
      });
      this.rain.Stop(); this.rain.Clear();
      this.Hook(this.rain);

      // Yere düşen damlaların sıçraması (sadece açık havada)
      this.splash = new PrecipEmitter('YagmurSicrama', {
        mode: 'ring', max: Math.round(900 * PRECIP_Q), life: [0.3, 0.3],
        box: V(56, 0.01, 44),
        size: [0.18, 0.36],
        colA: C(0.88, 0.94, 1, 0.75),
      });
      this.splash.Stop(); this.splash.Clear();
      this.Hook(this.splash);
    }
    if (this.rain) {
      this.rain.rate = (this.weather === EvW.Firtina ? 1500 : 850) * PRECIP_Q;
      if (wet) this.rain.Play(); else this.rain.Stop();
    }
    if (this.splash) {
      this.splash.rate = (this.weather === EvW.Firtina ? 900 : 520) * PRECIP_Q;
      if (wet) this.splash.Play(); else this.splash.Stop();
    }
  },

  Follow(p) {
    if (this.rain) this.rain.go.position.set(p.x, 11, p.z + 2);
    if (this.splash) this.splash.go.position.set(p.x - 0.9, 0.02, p.z + 2);
  },

  // ---- Her kare ----
  Tick(dt) {
    if (this.spawnBuffT > 0) this.spawnBuffT -= dt;
    if (this.satBuffT > 0) this.satBuffT -= dt;
    if (this.flash > 0) this.flash -= Time.unscaledDeltaTime * 2.5;
    this.wetNow = Mathf.MoveTowards(this.wetNow, this.Wet ? 1 : 0, dt / (this.Wet ? 25 : 60));
    this.gloomNow = Mathf.MoveTowards(this.gloomNow, this.GloomTarget, dt / 8);
    this.ApplyWet();
    if (this.weather === EvW.Firtina) {
      this.thunderT -= dt;
      if (this.thunderT <= 0) {
        this.thunderT = Random.Range(9, 20);
        this.flash = 1;
        Sfx.Play('bad', 0.25);
      }
    }

    const G = this.G;
    if (G == null || G.MenuOpen || Popups.Open) return;
    const t = G.dayNight.time;
    for (let i = 0; i < this.times.length; i++)
      if (!this.fired[i] && t >= this.times[i] && t < 0.9) {
        this.fired[i] = true;
        this.Fire();
        break;
      }
  },

  // ---- Olaylar ----
  Cost(perRoom) { return Mathf.RoundToInt((60 + perRoom * this.G.Unlocked()) / 10) * 10; },

  RandomRoom(cleanOnly = false) {
    const l = [];
    for (const r of this.G.rooms) if (r.Unlocked && (!cleanOnly || r.state === Room.State.Clean)) l.push(r);
    return l.length > 0 ? l[Random.RangeInt(0, l.length)] : null;
  },

  Fire() {
    const l = [];
    let tot = 0;
    for (const e of EventsAll) {
      let ok;
      try { ok = e.can(); } catch (err) { ok = false; }
      if (ok) { l.push(e); tot += e.weight; }
    }
    if (l.length === 0) return;
    let r = Random.value * tot;
    for (const e of l) {
      r -= e.weight;
      if (r <= 0) { e.run(); return; }
    }
    l[l.length - 1].run();
  },

  // Test ve hata ayıklama için
  FireNow() { this.Fire(); },
};

// Customer.Config nesnesi (C#: new Customer.Config { ... })
function evConfig(o) { return Object.assign(new Customer.Config(), o); }

// Olay listesi (Events.All)
const EventsAll = (() => {
  const E = Events;
  const G = () => GameManager.I;
  const ev = (can, run, weight = 1) => ({ can, run, weight });
  return [
    // 1. Su kaçağı
    ev(() => G().Unlocked() >= 2, () => {
      const g = G();
      const r = E.RandomRoom(true);
      if (r == null) return;
      const c = E.Cost(25);
      Popups.Show('Su kaçağı!', 'Oda ' + r.Number + "'in banyosunda boru patladı. Koridora su sızıyor.", 'OLAY')
        .Add('Tesisatçı çağır  ' + Eco.TL(c), () => { g.Spend(c, 'Tesisatçı'); g.Notify('Tesisatçı hemen halletti'); }, Popups.Green, g.CanPay(c))
        .Add('Kendimiz idare ederiz', () => { if (r.state === Room.State.Clean) r.SetDirty(); E.SatBuff(-0.4, 60); g.Notify('Oda ' + r.Number + ' kirlendi, misafirler biraz huysuz'); }, Popups.Gold);
    }),
    // 2. Kayıp bavul
    ev(() => true, () => {
      const g = G();
      const c = E.Cost(12);
      Popups.Show('Kayıp bavul', 'Bir misafirin bavulu havalimanında kaybolmuş, resepsiyonda çok üzgün bekliyor.', 'OLAY')
        .Add('Ona yeni eşyalar al  ' + Eco.TL(c), () => { g.Spend(c, 'Kayıp bavul'); g.AddRating(5); g.AddRating(5); Social.Share('Bavulum kaybolunca otel bana her şeyi yeniden aldı. İnanılmaz misafirperverlik!', 0, false); }, Popups.Green, g.CanPay(c))
        .Add('Personel arasın', () => { g.StaffMoraleAll(-0.05); g.AddRating(4); g.Notify('Personel saatlerce aradı, bavul bulundu!'); }, Popups.Gold)
        .Add('Elimizden bir şey gelmez', () => { g.AddRating(1.5); }, Popups.Grey);
    }),
    // 3. Turist otobüsü
    ev(() => G().Unlocked() >= 3, () => {
      const g = G();
      Popups.Show('Turist otobüsü!', 'Kapıda 6 kişilik bir tur grubu var. Hepsi bu gece kalmak istiyor. Odaları hızlı hazırlaman gerekecek.', 'OLAY')
        .Add('Hepsini kabul et', () => { for (let i = 0; i < 6; i++) g.QueueSpawn(evConfig({ type: Customer.G.Turist })); g.Notify('Tur grubu geliyor!'); }, Popups.Green)
        .Add('Kibarca geri çevir', null, Popups.Grey);
    }, 1.2),
    // 4. Şikayetçi misafir
    ev(() => G().served >= 10, () => {
      const g = G();
      const c = E.Cost(10);
      Popups.Show('Şikayetçi misafir', '"Odam çok sıcaktı, klima da gürültülüydü!" diye bağırıyor. Lobideki herkes sana bakıyor.', 'OLAY')
        .Add('Ücretsiz kahvaltı ver  ' + Eco.TL(c), () => { g.Spend(c, 'İkram'); g.AddRating(4.5); E.SatBuff(0.3, 60); }, Popups.Green, g.CanPay(c))
        .Add('Özür dile', () => {
          if (Random.value < 0.55) { g.AddRating(4); g.Notify('Misafir sakinleşti'); }
          else { g.AddRating(1.5); Social.Share('Odamdaki klima berbattı, sadece özür dilediler. Tavsiye etmem.', 0, true); }
        }, Popups.Gold);
    }),
    // 5. Gazeteci
    ev(() => G().served >= 15, () => {
      const g = G();
      Popups.Show('Gazeteci geldi', 'Bir seyahat dergisinden muhabir oteli gezmek istiyor. Otelin iyiyse harika bir haber çıkar, değilse...', 'OLAY')
        .Add('Otel turu ver', () => {
          const good = g.Stars >= 3.8 || Decor.Bonus >= 0.2;
          if (good) { E.SpawnBuff(1.6, 120); Social.Share('Dergimizin bu ayki gözdesi: ' + g.hotelName + '! Tertemiz, sıcacık bir otel.', 2, false); g.Celebrate('Harika haber!', 'Dergide övgü dolu bir yazı çıktı. 2 dakika boyunca çok daha fazla misafir gelecek.'); }
          else { E.SpawnBuff(0.8, 90); Social.Share(g.hotelName + ' fena değil ama daha yolu var.', 0, true); g.Notify('Haber pek parlak olmadı'); }
        }, Popups.Green)
        .Add('Şu an müsait değiliz', null, Popups.Grey);
    }),
    // 6. Tedarikçi indirimi
    ev(() => true, () => {
      const g = G();
      const c = E.Cost(15);
      Popups.Show('Tedarikçi kampanyası', 'Tekstil firması 10 takım yeni çarşafı yarı fiyatına satıyor.', 'OLAY')
        .Add('Satın al  ' + Eco.TL(c), () => { g.Spend(c, 'Çarşaf'); Laundry.I.AddClean(10); g.Notify('Rafa 10 temiz çarşaf eklendi'); }, Popups.Green, g.CanPay(c))
        .Add('Gerek yok', null, Popups.Grey);
    }),
    // 7. Ünlü sanatçı
    ev(() => { for (const r of G().rooms) if (r.level >= 3) return true; return false; }, () => {
      const g = G();
      Popups.Show('Ünlü sanatçı!', 'Ünlü bir şarkıcının menajeri aradı. Bu gece için Kral Dairesi istiyorlar. Çok iyi ödeyecekler ama beklemeyi hiç sevmezler.', 'OLAY')
        .Add('Ağırlayalım!', () => { g.QueueSpawn(evConfig({ type: Customer.G.Normal, vip: true, celebrity: true })); g.Notify('Ünlü misafir yolda!'); }, Popups.Green)
        .Add('Riske girmeyelim', null, Popups.Grey);
    }, 0.8),
    // 8. Elektrik kesintisi
    ev(() => E.weather === EvW.Firtina || Random.value < 0.4, () => {
      const g = G();
      const c = E.Cost(20);
      Popups.Show('Elektrik kesildi!', 'Mahallede elektrik gitti. Asansör ve kafe makineleri durdu.', 'OLAY')
        .Add('Jeneratör kirala  ' + Eco.TL(c), () => { g.Spend(c, 'Jeneratör'); g.Notify('Jeneratör çalışıyor, her şey yolunda'); }, Popups.Green, g.CanPay(c))
        .Add('Mumla idare edelim', () => { E.SatBuff(-0.5, 90); g.Notify('Mum ışığında romantik bir akşam... ama misafirler pek memnun değil'); }, Popups.Gold);
    }),
    // 9. Kedi
    ev(() => !G().catAdopted && G().dayNight.day >= 3, () => {
      const g = G();
      Popups.Show('Kapıda bir kedi!', 'Minik beyaz bir kedi lobiye girdi, resepsiyonun önünde miyavlıyor. Misafirler ona bayıldı.', 'OLAY')
        .Add('Otelin kedisi olsun!', () => { g.AdoptCat(); }, Popups.Green)
        .Add('Barınağa götürelim', null, Popups.Grey);
    }, 1.5),
    // 10. Doğum günü
    ev(() => G().served >= 8, () => {
      const g = G();
      const c = E.Cost(8);
      Popups.Show('Doğum günü sürprizi', 'Resepsiyondaki misafir bugün doğum günü olduğunu söyledi. Ona küçük bir pasta hazırlayalım mı?', 'OLAY')
        .Add('Pasta hazırlat  ' + Eco.TL(c), () => { g.Spend(c, 'Pasta'); g.AddRating(5); Social.Share('Doğum günümü otelde kutladılar, pastayı bile düşünmüşler! Ağladım resmen.', 1, false); }, Popups.Green, g.CanPay(c))
        .Add('Tebrik etmek yeter', () => { g.AddRating(3.8); }, Popups.Gold);
    }),
    // 11. Çatı akıntısı (yağmurda)
    ev(() => E.weather === EvW.Yagmurlu || E.weather === EvW.Firtina, () => {
      const g = G();
      const c = E.Cost(30);
      const r = E.RandomRoom();
      if (r == null) return; // C#'ta burada NullReference olurdu
      Popups.Show('Çatı akıtıyor', 'Yağmur yüzünden Oda ' + r.Number + "'in tavanından su damlıyor.", 'OLAY')
        .Add('Ustayı çağır  ' + Eco.TL(c), () => { g.Spend(c, 'Çatı tamiri'); }, Popups.Green, g.CanPay(c))
        .Add('Kova koyalım', () => { E.SatBuff(-0.3, 120); }, Popups.Gold);
    }, 1.5),
    // 12. Festival kalabalığı
    ev(() => Seasons.Festival || E.weather === EvW.Sicak, () => {
      const g = G();
      Popups.Show('Şehirde konser var!', 'Akşam büyük bir konser var, şehir dolup taşıyor. Fiyatları biraz artırırsan daha çok kazanırsın ama bazıları vazgeçebilir.', 'OLAY')
        .Add('Normal fiyat, herkes gelsin', () => { E.SpawnBuff(1.5, 120); }, Popups.Green)
        .Add('Fiyatları artır', () => { g.priceBuff = 1.3; g.priceBuffT = 120; E.SpawnBuff(1.15, 120); }, Popups.Gold);
    }),
  ];
})();
Events.All = EventsAll;
