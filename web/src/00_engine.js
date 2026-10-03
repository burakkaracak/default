// ============================================================================
// Otel Ustası · web motoru
// Unity'deki yardımcıların (U, Mathf, Random, Time, Store, GUI, Sfx...) karşılıkları.
// Bütün oyun nesneleri "W" (Unity uzayı) grubunun içinde durur. W'nin z ölçeği -1:
// böylece Unity'deki konum, döndürme ve ölçek sayıları aynen kullanılabilir.
// ============================================================================

// ---------------------------------------------------------------- Mathf
const Mathf = {
  PI: Math.PI, Deg2Rad: Math.PI / 180, Rad2Deg: 180 / Math.PI, Infinity: Infinity,
  Clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  Clamp01: v => v < 0 ? 0 : v > 1 ? 1 : v,
  Lerp: (a, b, t) => a + (b - a) * (t < 0 ? 0 : t > 1 ? 1 : t),
  LerpUnclamped: (a, b, t) => a + (b - a) * t,
  InverseLerp: (a, b, v) => a === b ? 0 : Mathf.Clamp01((v - a) / (b - a)),
  SmoothStep: (a, b, t) => { t = Mathf.Clamp01(t); t = -2 * t * t * t + 3 * t * t; return b * t + a * (1 - t); },
  Repeat: (t, l) => Mathf.Clamp(t - Math.floor(t / l) * l, 0, l),
  PingPong: (t, l) => { t = Mathf.Repeat(t, l * 2); return l - Math.abs(t - l); },
  MoveTowards: (c, t, d) => Math.abs(t - c) <= d ? t : c + Math.sign(t - c) * d,
  Sin: Math.sin, Cos: Math.cos, Abs: Math.abs, Sqrt: Math.sqrt, Pow: Math.pow, Exp: Math.exp, Atan2: Math.atan2, Log: Math.log,
  Sign: v => v >= 0 ? 1 : -1,
  Max: (...a) => Math.max(...a), Min: (...a) => Math.min(...a),
  Floor: Math.floor, Ceil: Math.ceil, Round: Math.round,
  FloorToInt: Math.floor, CeilToInt: Math.ceil,
  // Unity'nin RoundToInt'i .5'te çifte yuvarlar
  RoundToInt: v => { const f = Math.floor(v), d = v - f; if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1; return Math.round(v); },
  Approximately: (a, b) => Math.abs(a - b) < 1e-6,
  PerlinNoise: (x, y) => perlin2(x, y),
};

// Klasik Perlin gürültüsü (0..1 aralığında, Unity'ye benzer)
const _perm = (() => { const p = []; for (let i = 0; i < 256; i++) p[i] = i; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _grad(h, x, y) { switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; } }
function perlin2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
  const u = _fade(x), v = _fade(y), a = _perm[X] + Y, b = _perm[X + 1] + Y;
  const r = (1 - v) * ((1 - u) * _grad(_perm[a], x, y) + u * _grad(_perm[b], x - 1, y)) + v * ((1 - u) * _grad(_perm[a + 1], x, y - 1) + u * _grad(_perm[b + 1], x - 1, y - 1));
  return Mathf.Clamp01(r * 0.7071 + 0.5);
}

// ---------------------------------------------------------------- Random
const Random = {
  get value() { return Math.random(); },
  Range: (a, b) => a + Math.random() * (b - a),             // float
  RangeInt: (a, b) => a + Math.floor(Math.random() * (b - a)), // int, üst sınır hariç
  Pick: arr => arr[Math.floor(Math.random() * arr.length)],
};
// System.Random karşılığı (tohumlu)
class SysRandom {
  constructor(seed) { this.s = (seed | 0) || 1; }
  NextDouble() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s / 0x80000000; }
  Next(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.floor(this.NextDouble() * (b - a)); }
}

// ---------------------------------------------------------------- Vector3 yardımcıları
// DİKKAT: THREE.Vector3 başvuru tipidir. Unity'deki gibi değer kopyası için V(...) / .clone() kullan.
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const V2 = (x = 0, y = 0) => ({ x, y });
const Vec = {
  get zero() { return V(0, 0, 0); }, get one() { return V(1, 1, 1); }, get up() { return V(0, 1, 0); }, get down() { return V(0, -1, 0); },
  get forward() { return V(0, 0, 1); }, get back() { return V(0, 0, -1); }, get right() { return V(1, 0, 0); }, get left() { return V(-1, 0, 0); },
  add: (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z),
  sub: (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z),
  mul: (a, k) => V(a.x * k, a.y * k, a.z * k),
  scale: (a, b) => V(a.x * b.x, a.y * b.y, a.z * b.z),
  lerp: (a, b, t) => { t = Mathf.Clamp01(t); return V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); },
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  len: a => Math.hypot(a.x, a.y, a.z),
  norm: a => { const l = Math.hypot(a.x, a.y, a.z); return l > 1e-9 ? V(a.x / l, a.y / l, a.z / l) : V(); },
  min: (a, b) => V(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)),
  max: (a, b) => V(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)),
  // Quaternion.Euler(0, deg, 0) * v
  rotY: (v, deg) => { const a = deg * Mathf.Deg2Rad, c = Math.cos(a), s = Math.sin(a); return V(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); },
};

// ---------------------------------------------------------------- Renk
// Unity Color: r,g,b,a 0..1 (sRGB). Düz nesne olarak tutulur.
const C = (r, g, b, a = 1) => ({ r, g, b, a });
const Col = {
  get white() { return C(1, 1, 1); }, get black() { return C(0, 0, 0); }, get clear() { return C(0, 0, 0, 0); },
  get green() { return C(0, 1, 0); }, get red() { return C(1, 0, 0); }, get gray() { return C(0.5, 0.5, 0.5); }, get yellow() { return C(1, 0.92, 0.016); },
  lerp: (a, b, t) => { t = Mathf.Clamp01(t); return C(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, a.a + (b.a - a.a) * t); },
  mul: (a, k) => C(a.r * k, a.g * k, a.b * k, a.a * k),
  alpha: (a, al) => C(a.r, a.g, a.b, al),
  HSVToRGB: (h, s, v) => { const c = new THREE.Color().setHSL(h, 1, 0.5); const l = v * (1 - s / 2), sl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l); c.setHSL(h, sl, l, THREE.SRGBColorSpace); const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return C(o.r, o.g, o.b); },
  key: c => c.r.toFixed(3) + ',' + c.g.toFixed(3) + ',' + c.b.toFixed(3) + ',' + (c.a ?? 1).toFixed(3),
  three: c => new THREE.Color().setRGB(Mathf.Clamp01(c.r), Mathf.Clamp01(c.g), Mathf.Clamp01(c.b), THREE.SRGBColorSpace),
  css: c => `rgba(${Math.round(Mathf.Clamp01(c.r) * 255)},${Math.round(Mathf.Clamp01(c.g) * 255)},${Math.round(Mathf.Clamp01(c.b) * 255)},${Mathf.Clamp01(c.a ?? 1).toFixed(3)})`,
};

// ---------------------------------------------------------------- Zaman
const Time = { deltaTime: 0, unscaledDeltaTime: 0, time: 0, unscaledTime: 0, timeScale: 1, frameCount: 0 };

// ---------------------------------------------------------------- Kayıt (PlayerPrefs / Store)
const Store = (() => {
  const KEY = 'otel_ustasi_kayit_v1';
  let data = null, dirty = false;
  function ensure() {
    if (data) return;
    data = {};
    try { const s = localStorage.getItem(KEY); if (s) data = JSON.parse(s) || {}; } catch (e) { data = {}; }
  }
  function put(k, v) { ensure(); if (data[k] === v) return; data[k] = v; dirty = true; }
  return {
    SetInt: (k, v) => put(k, String(Math.trunc(v))),
    SetFloat: (k, v) => put(k, String(+v)),
    SetString: (k, v) => put(k, v == null ? '' : String(v)),
    GetInt: (k, d = 0) => { ensure(); const s = data[k]; if (s == null) return d; const n = parseInt(s, 10); return isNaN(n) ? d : n; },
    GetFloat: (k, d = 0) => { ensure(); const s = data[k]; if (s == null) return d; const n = parseFloat(s); return isNaN(n) ? d : n; },
    GetString: (k, d = '') => { ensure(); const s = data[k]; return s == null ? d : s; },
    HasKey: k => { ensure(); return k in data; },
    DeleteKey: k => { ensure(); if (k in data) { delete data[k]; dirty = true; } },
    DeleteAll: () => { data = {}; dirty = true; Store.Save(); },
    // force: bulut kaydını olduğu gibi yaz (zaman damgasını değiştirme)
    Save: (force) => { if (!dirty || !data) return; if (!force) data.__savedAt = String(Date.now()); try { localStorage.setItem(KEY, JSON.stringify(data)); dirty = false; } catch (e) { } },
    Raw: () => { ensure(); return data; },
    Load: obj => { data = obj || {}; dirty = true; },
  };
})();

// ---------------------------------------------------------------- Sahne ve davranışlar
let renderer, scene, camera, W, sunLight, hemiLight, ambLight;
const behaviours = [];      // update/lateUpdate çağrılan bileşenler
const lateTasks = [];       // kısa ömürlü işler (FloatText, Pop, Fly, Burst...)

// Bir nesne ve tüm ataları görünür mü (Unity activeInHierarchy)
function activeInHierarchy(o) {
  while (o) { if (!o.visible || o.userData.destroyed) return false; if (o === W) return true; o = o.parent; }
  return true;
}
function SetActive(o, b) { if (o) o.visible = !!b; }
function activeSelf(o) { return !!(o && o.visible); }

// MonoBehaviour karşılığı: nesneye bağlı, her karede Update çağrılır
class Behaviour {
  constructor(go) {
    this.go = go || new THREE.Group();
    if (!this.go.parent) W.add(this.go);
    this.go.userData.comp = this;
    this.enabled = true;
    behaviours.push(this);
  }
  get transform() { return this.go; }
  get gameObject() { return this.go; }
  destroy() { Destroy(this.go); }
}

function Destroy(o, delay) {
  if (!o) return;
  if (o.go) o = o.go;
  if (delay) { lateTasks.push({ t: delay, step(dt) { this.t -= dt; if (this.t <= 0) { Destroy(o); return true; } } }); return; }
  o.traverse(c => { c.userData.destroyed = true; if (c.userData.textTex) c.userData.textTex.dispose(); if (c.userData.ownMat) c.material.dispose(); });
  if (o.parent) o.parent.remove(o);
}
function alive(o) { if (!o) return false; if (o.go) o = o.go; return !o.userData.destroyed; }

// Unity uzayındaki dünya konumu (W içindeki yerel koordinat)
const _tv = new THREE.Vector3();
function worldPos(o) { if (o.parent === W) return o.position.clone(); o.getWorldPosition(_tv); return W.worldToLocal(_tv.clone()); }
function setWorldPos(o, p) { if (o.parent === W) { o.position.copy(p); return; } const w = W.localToWorld(V(p.x, p.y, p.z)); o.parent.worldToLocal(w); o.position.copy(w); }
// Ebeveyni değiştir, dünya konumunu koru (SetParent(p, true))
function reparentKeep(o, parent) { parent = parent || W; const wp = worldPos(o); parent.add(o); setWorldPos(o, wp); }
// Euler açılarını Unity sırasıyla (Z, X, Y) derece olarak ver
function setEuler(o, x, y, z) { o.rotation.set(x * Mathf.Deg2Rad, y * Mathf.Deg2Rad, z * Mathf.Deg2Rad, 'YXZ'); }
function yawOf(dir) { return Math.atan2(dir.x, dir.z); }
function lookRotation(o, dir) { if (dir.x * dir.x + dir.z * dir.z < 1e-8) return; o.rotation.set(0, yawOf(dir), 0, 'YXZ'); }
function forwardOf(o) { const y = o.rotation.y; return V(Math.sin(y), 0, Math.cos(y)); }
function findChild(o, name) { for (const c of o.children) if (c.name === name) return c; return null; }

// ---------------------------------------------------------------- Dokular (kodla)
function canvasTex(size, fn, repeat = true) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b, a] = fn(x, size - 1 - y); const i = (y * size + x) * 4;
    img.data[i] = r * 255; img.data[i + 1] = g * 255; img.data[i + 2] = b * 255; img.data[i + 3] = (a ?? 1) * 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return t;
}

// ---------------------------------------------------------------- U (ortak yardımcılar)
const U = {
  CamRot: { x: 52, y: 0, z: 0 },
  Skin: C(1, 0.82, 0.68),
  _matCache: new Map(),
  _geo: {},
  _tex: {},

  geo(type) {
    if (this._geo[type]) return this._geo[type];
    let g;
    switch (type) {
      case 'Sphere': g = new THREE.SphereGeometry(0.5, 20, 14); break;
      case 'Cylinder': g = new THREE.CylinderGeometry(0.5, 0.5, 2, 24); break;
      case 'Capsule': g = new THREE.CapsuleGeometry(0.5, 1, 6, 16); break;
      case 'Quad': g = new THREE.PlaneGeometry(1, 1); break;
      case 'CubeSeg': g = new THREE.BoxGeometry(1, 1, 1, 24, 1, 24); break;
      default: g = new THREE.BoxGeometry(1, 1, 1);
    }
    return this._geo[type] = g;
  },

  // ---- Dokular ----
  get TileTex() { return this._tex.tile || (this._tex.tile = U.MakeTile()); },
  get WoodTex() { return this._tex.wood || (this._tex.wood = U.MakeWood()); },
  get CarpetTex() { return this._tex.carpet || (this._tex.carpet = U.MakeNoise('carpet', 0.3, 0.12)); },
  get GrassTex() { return this._tex.grass || (this._tex.grass = U.MakeNoise('grass', 0.06, 0.25)); },
  get StripeTex() { return this._tex.stripe || (this._tex.stripe = U.MakeStripe()); },
  get HaloTex() { return this._tex.halo || (this._tex.halo = canvasTex(64, (x, y) => { const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) / 32; const a = Mathf.Clamp01(1 - d); return [1, 1, 1, a * a]; }, false)); },
  get DotTex() { return this._tex.dot || (this._tex.dot = canvasTex(32, (x, y) => { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16); return [1, 1, 1, Mathf.Clamp01(15 - d)]; }, false)); },
  MakeTile() {
    const s = 256, tiles = 4, cell = s / tiles, rnd = new SysRandom(3), v = [];
    for (let i = 0; i < tiles * tiles; i++) v[i] = 0.92 + rnd.NextDouble() * 0.08;
    return canvasTex(s, (x, y) => { const lx = x % cell, ly = y % cell; const grout = lx < 3 || ly < 3; const b = grout ? 0.74 : v[Math.floor(y / cell) * tiles + Math.floor(x / cell)] - 0.04 * Mathf.PerlinNoise(x * 0.04, y * 0.04); return [b, b, b]; });
  },
  MakeWood() {
    const s = 256, pw = 32;
    return canvasTex(s, (x, y) => { const p = Math.floor(x / pw), off = (p * 73) % s; const grain = Mathf.PerlinNoise(x * 0.09 + p * 10, (y + off) * 0.012); let b = 0.8 + 0.2 * grain; b *= 0.93 + 0.07 * ((p * 37) % 5) / 4; if (x % pw < 2) b *= 0.7; if ((y + off) % 128 < 2) b *= 0.75; return [b, b, b]; });
  },
  MakeNoise(n, freq, amount) {
    const rnd = new SysRandom(n.length * 17);
    return canvasTex(256, (x, y) => { const a = Mathf.PerlinNoise(x * freq, y * freq) * 0.6 + Mathf.PerlinNoise(x * freq * 3 + 50, y * freq * 3 + 50) * 0.4; const b = 1 - amount + amount * a + (rnd.NextDouble() - 0.5) * amount * 0.4; return [b, b, b]; });
  },
  MakeStripe() { return canvasTex(128, (x) => { const b = Math.floor(x / 16) % 2 === 0 ? 1 : 0.95; return [b, b, b]; }); },

  // ---- Malzemeler ----
  // Mat(c) / Mat(c, smooth) / Mat(c, tex, tiling, smooth, emission)
  Mat(c, tex, tiling, smooth, emission) {
    if (typeof tex === 'number') { smooth = tex; tex = null; }
    if (tex === undefined) tex = null;
    tiling = tiling || { x: 1, y: 1 };
    if (smooth === undefined) smooth = 0.25;
    emission = emission || 0;
    const key = Col.key(c) + '|' + (tex ? tex.uuid : '-') + '|' + tiling.x.toFixed(2) + ',' + tiling.y.toFixed(2) + '|' + smooth.toFixed(2) + '|' + emission.toFixed(2);
    let m = this._matCache.get(key);
    if (m) return m;
    m = new THREE.MeshStandardMaterial({ color: Col.three(c), roughness: Mathf.Clamp(1 - smooth, 0.05, 1), metalness: 0 });
    if (tex) {
      const t = tex.clone(); t.needsUpdate = true; t.repeat.set(tiling.x, tiling.y); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
      m.map = t;
    }
    if (emission > 0) { m.emissive = Col.three(c); m.emissiveIntensity = emission * 0.75; }
    if ((c.a ?? 1) < 0.999) { m.transparent = true; m.opacity = c.a; m.depthWrite = false; }
    m.userData.key = key; m.userData.color = c;
    this._matCache.set(key, m);
    return m;
  },
  Glow(c, intensity) { return U.Mat(c, null, null, 0.3, intensity); },
  // Işıktan etkilenmeyen, hep parlak (yanan ampul)
  Bright(c) {
    const key = 'bright' + Col.key(c);
    let m = this._matCache.get(key);
    if (m) return m;
    const b = Col.lerp(c, Col.white, 0.25);
    m = new THREE.MeshBasicMaterial({ color: Col.three(b), fog: true });
    this._matCache.set(key, m);
    return m;
  },

  // ---- Nesneler ----
  Prim(name, parent, pos, scale, mat, type = 'Cube') {
    // çok büyük düz kutular parçalı çizilir (bazı ekran kartlarında derinlik hatası olmasın)
    if (type === 'Cube' && Math.max(scale.x, scale.z) > 25) type = 'CubeSeg';
    const m = new THREE.Mesh(U.geo(type), mat);
    m.name = name;
    m.castShadow = true; m.receiveShadow = true;
    (parent || W).add(m);
    m.position.set(pos.x, pos.y, pos.z);
    m.scale.set(scale.x, scale.y, scale.z);
    if (mat && mat.transparent) m.castShadow = false;
    return m;
  },
  Box(name, parent, pos, scale, c, type = 'Cube') { return U.Prim(name, parent, pos, scale, U.Mat(c), type); },
  Flat(name, parent, pos, scale, c, type = 'Cube') { const g = U.Box(name, parent, pos, scale, c, type); U.NoShadow(g); return g; },
  NoShadow(g) { g.traverse(o => { if (o.isMesh) o.castShadow = false; }); },
  Pivot(parent, pos, name = 'Pivot') { const g = new THREE.Group(); g.name = name; (parent || W).add(g); if (pos) g.position.set(pos.x, pos.y, pos.z); return g; },
  SetMat(o, mat) { if (o && o.isMesh) o.material = mat; },

  // ---- Yazı ----
  // Unity TextMesh (kameraya dönük). size: characterSize. Döner: TextMesh nesnesi.
  Text(parent, pos, s, size, c, shadow = false) { return new TextMesh(parent, pos, s, size, c, shadow); },

  // Lamba halesi (kameraya dönük yumuşak ışık)
  Halo(parent, worldPos, size, c) {
    const mat = new THREE.SpriteMaterial({ map: U.HaloTex, color: Col.three(c), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat); sp.name = 'Hale'; sp.userData.ownMat = true;
    W.add(sp); sp.position.copy(worldPos); sp.scale.set(size, size, 1);
    if (parent && parent !== W) reparentKeep(sp, parent);
    sp.renderOrder = 5;
    return sp;
  },

  // ---- Hazır 3D modeller ----
  models: {},
  _furnUnit: -1, _charUnit: -1, _furnYaw: NaN,
  get FurnUnit() { if (this._furnUnit < 0) { const m = this.models.bedDouble; this._furnUnit = m ? 0.956 / U.LocalBounds(m.scene, true).size.x : 1; } return this._furnUnit; },
  get CharUnit() { if (this._charUnit < 0) { const m = this.models['character-female-a']; this._charUnit = m ? 0.776 / U.LocalBounds(m.scene, false).size.y : 1; } return this._charUnit; },
  get FurnYaw() { if (isNaN(this._furnYaw)) this._furnYaw = U.ProbeYaw(); return this._furnYaw; },

  // Modelin kendi uzayındaki sınırları (mirror: Unity içe aktarımındaki gibi x'i ters çevir)
  LocalBounds(obj, mirror) {
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3();
    obj.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); b.union(bb); } });
    if (mirror) { const a = -b.max.x, z = -b.min.x; b.min.x = a; b.max.x = z; }
    return { min: b.min, max: b.max, size: b.getSize(new THREE.Vector3()), center: b.getCenter(new THREE.Vector3()) };
  },

  ProbeYaw() {
    const m = this.models.bedDouble;
    if (!m) return 0;
    const pts = [];
    m.scene.updateMatrixWorld(true);
    m.scene.traverse(o => { if (o.isMesh) { const p = o.geometry.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pts.push(V(-v.x, v.y, v.z)); } } });
    if (!pts.length) return 180;
    let lo = pts[0].clone(), hi = pts[0].clone();
    for (const p of pts) { lo.min(p); hi.max(p); }
    const c = Vec.mul(Vec.add(lo, hi), 0.5); const sum = V(); let n = 0;
    for (const p of pts) if (p.y > lo.y + 0.85 * (hi.y - lo.y)) { sum.add(p); n++; }
    if (!n) return 180;
    const back = Vec.sub(Vec.mul(sum, 1 / n), c);
    const frontYaw = Math.atan2(-back.x, -back.z) * Mathf.Rad2Deg;
    return Math.round(-frontYaw / 90) * 90;
  },

  // Unity uzayında bir nesnenin sınırları (Bounds)
  WorldBounds(obj) {
    obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(W.matrixWorld).invert();
    const b = new THREE.Box3(); let has = false;
    obj.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      b.union(o.geometry.boundingBox.clone().applyMatrix4(m)); has = true;
    });
    if (!has) { const p = worldPos(obj); b.set(p.clone(), p.clone()); }
    return Bounds.from(b);
  },

  // Mobilya: taban pos.y'de, ortası pos.x/pos.z'de. Model yoksa yedek kutu.
  Furn(name, parent, pos, yRot, scale, fbSize, fbColor) {
    const md = this.models[name];
    if (!md) {
      const box = U.Box(name, parent, Vec.add(pos, V(0, fbSize.y / 2, 0)), fbSize, fbColor);
      box.rotation.set(0, yRot * Mathf.Deg2Rad, 0);
      return U.WorldBounds(box);
    }
    const holder = new THREE.Group(); holder.name = name;
    (parent || W).add(holder);
    holder.rotation.set(0, (yRot + U.FurnYaw) * Mathf.Deg2Rad, 0);
    holder.scale.setScalar(scale * U.FurnUnit);
    const g = md.scene.clone(true);
    g.scale.x *= -1;
    U.FixMats(g);
    holder.add(g);
    const b = U.WorldBounds(holder);
    const d = V(pos.x - b.center.x, pos.y - b.min.y, pos.z - b.center.z);
    // holder ebeveyn uzayında kaydır (ebeveyn W ya da W'ye eşit ölçekli grup varsayılır)
    const wp = Vec.add(worldPos(holder), d); setWorldPos(holder, wp);
    b.min.add(d); b.max.add(d); b.center.add(d);
    return b;
  },

  // Model malzemelerini oyunun ışık sistemine uydur
  FixMats(g) {
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const fix = m => {
        if (!m) return U.Mat(Col.white);
        if (m.map) {
          const key = 'tex' + m.map.uuid;
          let mm = U._matCache.get(key);
          if (!mm) { m.map.colorSpace = THREE.SRGBColorSpace; mm = new THREE.MeshStandardMaterial({ map: m.map, roughness: 0.8, metalness: 0 }); U._matCache.set(key, mm); }
          return mm;
        }
        // assimp renkleri sRGB değerleri doğrusal diye yazıyor: geri çevir
        const c = m.color.clone(); const o2 = {}; c.getRGB(o2, THREE.LinearSRGBColorSpace);
        return U.Mat(C(o2.r, o2.g, o2.b), 0.25);
      };
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
    });
  },

  // ---- Hareket ----
  FlatDist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); },
  Face(t, dir) {
    if (dir.x * dir.x + dir.z * dir.z < 0.0001) return;
    const target = Math.atan2(dir.x, dir.z);
    let d = target - t.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    t.rotation.set(0, t.rotation.y + d * Math.min(1, Time.deltaTime * 12), 0, 'YXZ');
  },
  // Yol boyunca yürür; yol bittiyse true döner (t: W'nin doğrudan çocuğu)
  Walk(t, path, speed, rig) {
    if (path.length === 0) { if (rig) rig.Tick(0); return true; }
    const target = path[0];
    const d = V(target.x - t.position.x, 0, target.z - t.position.z);
    if (Math.abs(d.z) > 25) {
      t.position.set(target.x, t.position.y, target.z); path.shift();
      if (rig) rig.Tick(0); return path.length === 0;
    }
    const step = speed * Time.deltaTime, mag = Vec.len(d);
    if (mag <= step) { t.position.set(target.x, t.position.y, target.z); path.shift(); }
    else { t.position.add(Vec.mul(d, step / mag)); U.Face(t, d); }
    if (rig) rig.Tick(1);
    return path.length === 0;
  },

  // ---- Efekt: konfeti patlaması ----
  Burst(pos, a, b, count, speed = 5) { Particles.burst(pos, a, b, count, speed); },
};

// Unity Bounds benzeri
class Bounds {
  static from(b3) { const b = new Bounds(); b.min = b3.min.clone(); b.max = b3.max.clone(); return b; }
  get center() { return Vec.mul(Vec.add(this.min, this.max), 0.5); }
  set center(c) { const s = this.size; this.min = V(c.x - s.x / 2, c.y - s.y / 2, c.z - s.z / 2); this.max = V(c.x + s.x / 2, c.y + s.y / 2, c.z + s.z / 2); }
  get size() { return Vec.sub(this.max, this.min); }
}

// Unity Rect (x, y, w, h); MinMaxRect ile de kurulur
class Rect {
  constructor(x = 0, y = 0, w = 0, h = 0) { this.x = x; this.y = y; this.width = w; this.height = h; }
  static MinMaxRect(x0, y0, x1, y1) { return new Rect(x0, y0, x1 - x0, y1 - y0); }
  static get zero() { return new Rect(); }
  get xMin() { return this.x; } get yMin() { return this.y; } get xMax() { return this.x + this.width; } get yMax() { return this.y + this.height; }
  get center() { return { x: this.x + this.width / 2, y: this.y + this.height / 2 }; }
  Contains(p) { return p.x >= this.x && p.x < this.x + this.width && p.y >= this.y && p.y < this.y + this.height; }
}

// ---------------------------------------------------------------- 3B yazı (TextMesh)
const _measure = document.createElement('canvas').getContext('2d');
class TextMesh {
  constructor(parent, pos, s, size, c, shadow) {
    this._text = s || ''; this._size = size; this._color = c; this.shadow = shadow; this.flat = false;
    this.mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, fog: false });
    this.obj = new THREE.Sprite(this.mat);
    this.obj.name = 'Yazi'; this.obj.renderOrder = 10;
    this.obj.userData.ownMat = true; this.obj.userData.text = this;
    (parent || W).add(this.obj);
    this.obj.position.set(pos.x, pos.y, pos.z);
    this._scaleK = 1;
    this.redraw();
  }
  get gameObject() { return this.obj; }
  get transform() { return this.obj; }
  get text() { return this._text; }
  set text(v) { v = v == null ? '' : String(v); if (v === this._text) return; this._text = v; this.redraw(); }
  get color() { return this._color; }
  set color(c) { if (this._color && Col.key(c) === Col.key(this._color)) return; const rgbSame = this._color && c.r === this._color.r && c.g === this._color.g && c.b === this._color.b; this._color = c; if (rgbSame) { this.mat.opacity = c.a ?? 1; return; } this.redraw(); }
  get characterSize() { return this._size; }
  set characterSize(v) { this._size = v; this.applyScale(); }
  set scaleK(k) { this._scaleK = k; this.applyScale(); }
  // Yere yatık yazı (Unity'de Euler(90,0,0))
  makeFlat() {
    if (this.flat) return this;
    const tex = this.mat.map; const p = this.obj.position.clone(); const parent = this.obj.parent;
    parent.remove(this.obj);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: this.mat.opacity });
    const mesh = new THREE.Mesh(U.geo('Quad'), m); mesh.name = 'Yazi'; mesh.renderOrder = 3;
    mesh.rotation.set(-Math.PI / 2, 0, 0); mesh.userData.ownMat = true; mesh.userData.text = this;
    parent.add(mesh); mesh.position.copy(p);
    this.obj = mesh; this.mat = m; this.flat = true; this.applyScale();
    return this;
  }
  redraw() {
    const lines = this._text.split('\n');
    const px = 96, font = `bold ${px}px ${UI_FONT}`;
    _measure.font = font;
    let w = 1; for (const l of lines) w = Math.max(w, _measure.measureText(l).width);
    const pad = 12, lh = px * 1.15;
    const cw = Math.ceil(w + pad * 2), ch = Math.ceil(lh * lines.length + pad * 2);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d'); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const c = this._color;
    lines.forEach((l, i) => {
      const y = pad + lh * (i + 0.5);
      if (this.shadow) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(l, cw / 2 + 6, y + 6); }
      ctx.fillStyle = Col.css(C(c.r, c.g, c.b, 1)); ctx.fillText(l, cw / 2, y);
    });
    if (this.mat.map) this.mat.map.dispose();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    this.mat.map = t; this.mat.opacity = c.a ?? 1; this.mat.needsUpdate = true;
    this.obj.userData.textTex = t;
    this.cw = cw; this.ch = ch;
    this.applyScale();
  }
  applyScale() {
    // Unity: fontSize 64 * characterSize / 10 ≈ satır yüksekliği (dünya birimi)
    const k = this._size * 6.4 / 96 * this._scaleK;
    this.obj.scale.set(this.cw * k, this.ch * k, 1);
  }
}

// ---------------------------------------------------------------- Konfeti parçacıkları
const Particles = {
  list: [], mesh: null, max: 1500,
  init() {
    const g = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: false });
    this.mesh = new THREE.InstancedMesh(g, m, this.max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 3), 3);
    W.add(this.mesh);
  },
  burst(pos, a, b, count, speed) {
    count = Math.min(count, 300);
    for (let i = 0; i < count && this.list.length < this.max; i++) {
      // koni: yukarı doğru 35 derece
      const ang = Random.Range(0, 35) * Mathf.Deg2Rad, az = Random.Range(0, Math.PI * 2), sp = Random.Range(speed * 0.5, speed);
      const dir = V(Math.sin(ang) * Math.cos(az), Math.cos(ang), Math.sin(ang) * Math.sin(az));
      const t = Math.random();
      this.list.push({ p: V(pos.x + Random.Range(-0.2, 0.2), pos.y, pos.z + Random.Range(-0.2, 0.2)), v: Vec.mul(dir, sp), life: Random.Range(0.8, 1.4), age: 0, size: Random.Range(0.1, 0.22), rot: Random.Range(0, 6.28), rs: Random.Range(-6, 6), c: Col.three(Col.lerp(a, b, t)) });
    }
  },
  update(dt) {
    if (!this.mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.age += dt;
      if (p.age >= p.life) { this.list.splice(i, 1); continue; }
      p.v.y -= 9.81 * 1.3 * dt; p.p.addScaledVector(p.v, dt); p.rot += p.rs * dt;
    }
    for (const p of this.list) {
      e.set(p.rot, p.rot * 0.7, p.rot * 0.3); q.setFromEuler(e); s.setScalar(p.size);
      m.compose(p.p, q, s); this.mesh.setMatrixAt(n, m); this.mesh.setColorAt(n, p.c); n++;
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  },
};

// ---------------------------------------------------------------- Yere çizilen dolan daire
class ProgressPad {
  constructor(parent, pos, radius, baseC, fillC, icon) {
    this.root = U.Pivot(parent, pos, 'Daire');
    this.r = radius; this.pulse = 0;
    this.ring = U.Flat('Kenar', this.root, V(0, 0.01, 0), V(radius * 2 + 0.18, 0.01, radius * 2 + 0.18), Col.white, 'Cylinder');
    U.Flat('Zemin', this.root, V(0, 0.02, 0), V(radius * 2, 0.01, radius * 2), baseC, 'Cylinder');
    this.fill = U.Flat('Dolum', this.root, V(0, 0.03, 0), V(0, 0, 0), fillC, 'Cylinder');
    if (icon) U.Text(this.root, V(0, 0.05, 0), icon, radius * 0.12, C(1, 1, 1, 0.9)).makeFlat();
    this.Set(0);
  }
  Set(t) {
    t = Mathf.Clamp01(t);
    const d = this.r * 2 * t;
    this.fill.scale.set(Math.max(d, 1e-4), 0.01, Math.max(d, 1e-4));
    this.fill.visible = t > 0.001;
    if (t > 0.001) this.pulse += Time.deltaTime * 10; else this.pulse = 0;
    const k = 1 + Math.sin(this.pulse) * 0.04;
    this.ring.scale.set((this.r * 2 + 0.18) * k, 0.01, (this.r * 2 + 0.18) * k);
  }
  Show(s) { this.root.visible = !!s; }
}

// ---------------------------------------------------------------- Karakter iskeleti
class Rig {
  static CharYaw = 0;
  static Guests = ['character-female-a', 'character-female-b', 'character-female-c', 'character-female-f', 'character-male-a', 'character-male-b', 'character-male-c', 'character-male-f'];
  static Act = { None: 0, Clean: 1, Cheer: 2, Sad: 3, Lie: 4, Sit: 5 };

  // Hazır animasyonlu karakter
  static Model(parent, variant) {
    const md = U.models[variant] || U.models['character-male-d'];
    const r = new Rig();
    const g = SkeletonUtils.clone(md.scene);
    g.name = 'Karakter';
    const holder = new THREE.Group(); holder.name = 'Karakter';
    holder.add(g);
    g.scale.x *= -1;
    holder.scale.setScalar(2.8 * U.CharUnit);
    holder.rotation.y = Rig.CharYaw * Mathf.Deg2Rad;
    (parent || W).add(holder);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    U.FixMats(g);
    r.go = holder; r.transform = holder; r.gameObject = holder;
    holder.userData.rig = r;
    r.mixer = new THREE.AnimationMixer(g);
    r.actions = {};
    for (const clip of md.animations) r.actions[clip.name] = r.mixer.clipAction(clip);
    r.seed = Math.random() * 10;
    r.act = Rig.Act.None;
    r.cur = null;
    r.Play('idle', 0);
    if (r.actions.idle) r.actions.idle.time = Math.random() * r.actions.idle.getClip().duration;
    Rig.all.add(r);
    return r;
  }
  static all = new Set();

  Play(n, fade) {
    if (this.cur === n || !this.actions[n]) return;
    const next = this.actions[n];
    next.reset(); next.setLoop(THREE.LoopRepeat); next.enabled = true; next.setEffectiveWeight(1); next.play();
    if (this.cur && this.actions[this.cur] && fade > 0) this.actions[this.cur].crossFadeTo(next, fade, false);
    else if (this.cur && this.actions[this.cur]) this.actions[this.cur].stop();
    this.cur = n;
  }

  // m: 0 duruyor, 1 yürüyor
  Tick(m) {
    const A = Rig.Act;
    let want = this.act === A.Clean ? 'interact-right' : this.act === A.Cheer ? 'emote-yes' : this.act === A.Sad ? 'emote-no' :
      this.act === A.Lie ? 'static' : this.act === A.Sit ? 'sit' : m > 1.25 ? 'sprint' : m > 0.1 ? 'walk' : 'idle';
    if (!this.actions[want]) want = 'idle';
    this.Play(want, 0.15);
    if (want === 'walk') this.actions.walk.timeScale = Mathf.Clamp(m, 0.8, 1.5) * 1.15;
    if (want === 'sprint') this.actions.sprint.timeScale = Mathf.Clamp(m * 0.75, 0.8, 1.4);
  }

  update(dt) { if (this.mixer && activeInHierarchy(this.go)) this.mixer.update(dt); }
}

// ---------------------------------------------------------------- Kısa animasyonlar (coroutine karşılıkları)
const Tween = {
  FloatText(pos, s, c, size = 0.1) {
    const t = U.Text(null, pos, s, size, c, true);
    const p0 = pos.clone(); let a = 0;
    lateTasks.push({
      step(dt) {
        a += dt / 1.3;
        const k = a < 0.15 ? Mathf.Lerp(0.5, 1.2, a / 0.15) : Mathf.Lerp(1.2, 1, (a - 0.15) * 4);
        t.scaleK = k;
        t.obj.position.set(p0.x, p0.y + a * 1.3, p0.z);
        t.mat.opacity = (c.a ?? 1) * (1 - a * a);
        if (a >= 1) { Destroy(t.obj); return true; }
      }
    });
  },
  Pop(o) {
    const s = o.scale.clone(); let a = 0;
    lateTasks.push({
      step(dt) {
        if (!alive(o)) return true;
        a += dt / 0.3;
        const k = a < 0.7 ? Mathf.Lerp(0, 1.15, a / 0.7) : Mathf.Lerp(1.15, 1, (a - 0.7) / 0.3);
        o.scale.set(s.x * Math.max(k, 1e-3), s.y * Math.max(k, 1e-3), s.z * Math.max(k, 1e-3));
        if (a >= 1) { o.scale.copy(s); return true; }
      }
    });
  },
  // b: uçacak nesne; target: takip edilecek nesne (ya da null ve "to" konumu)
  Fly(b, target, to, delay) {
    let a = 0, p0 = null, dur = 0.35, wait = delay || 0;
    lateTasks.push({
      step(dt) {
        if (!alive(b)) return true;
        if (wait > 0) { wait -= dt; return; }
        if (!p0) {
          reparentKeep(b, W); p0 = worldPos(b);
          dur = target ? Mathf.Clamp(Vec.dist(p0, target.position) * 0.05, 0.35, 0.8) : 0.35;
        }
        a += dt / dur;
        const end = target ? Vec.add(target.position, V(0, 1.1, 0)) : to;
        const p = Vec.lerp(p0, end, a);
        p.y += Math.sin(Math.min(a, 1) * Math.PI) * 1.4;
        b.position.copy(p);
        b.rotation.y += 720 * Mathf.Deg2Rad * dt;
        if (a >= 1) { Destroy(b); return true; }
      }
    });
  },
  After(sec, fn) { let t = sec; lateTasks.push({ step(dt) { t -= dt; if (t <= 0) { fn(); return true; } } }); },
};

// ---------------------------------------------------------------- Ses efektleri (kodla üretilir)
const Sfx = {
  ctx: null, gain: null, clips: {}, Rate: 44100, volume: 1,
  Init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    this.gain = this.ctx.createGain(); this.gain.gain.value = 0.45 * this.volume; this.gain.connect(this.ctx.destination);
    this.clips.coin = this.Notes([1318, 1975], 0.055, 30);
    this.clips.tick = this.Notes([1567], 0.04, 60);
    this.clips.unlock = this.Notes([523, 659, 784, 1047, 1319], 0.08, 12);
    this.clips.ding = this.Bell(1760, 0.7);
    this.clips.clean = this.Swish();
    this.clips.bad = this.Notes([330, 247], 0.14, 8, true);
    this.clips.pop = this.Notes([880], 0.07, 40);
  },
  Resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  SetVolume(v) { this.volume = v; if (this.gain) this.gain.gain.value = 0.45 * v; },
  Play(n, vol = 1) {
    if (!this.ctx || !this.clips[n] || this.volume <= 0) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.clips[n];
    const g = this.ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(this.gain); s.start();
  },
  buf(data) { const b = this.ctx.createBuffer(1, data.length, this.Rate); b.getChannelData(0).set(data); return b; },
  Notes(freqs, noteLen, decay, square) {
    const R = this.Rate, per = Math.floor(R * noteLen), tail = Math.floor(R * 0.15), total = per * freqs.length + tail;
    const d = new Float32Array(total);
    freqs.forEach((f, n) => {
      for (let i = 0; i < per + tail && n * per + i < total; i++) {
        const t = i / R, env = Math.exp(-t * decay) * Mathf.Clamp01(t * 400);
        let w = Math.sin(2 * Math.PI * f * t);
        if (square) w = Mathf.Sign(w) * 0.5 + w * 0.5; else w = w * 0.8 + Math.sin(4 * Math.PI * f * t) * 0.2;
        d[n * per + i] += w * env * 0.4;
      }
    });
    return this.buf(d);
  },
  Bell(f, len) {
    const R = this.Rate, total = Math.floor(R * len), d = new Float32Array(total);
    for (let i = 0; i < total; i++) { const t = i / R, env = Math.exp(-t * 6) * Mathf.Clamp01(t * 600); d[i] = (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 2.76 * t) * 0.25 + Math.sin(2 * Math.PI * f * 5.4 * t) * 0.1) * env * 0.4; }
    return this.buf(d);
  },
  Swish() {
    const R = this.Rate, total = Math.floor(R * 0.5), d = new Float32Array(total), rnd = new SysRandom(7); let lp = 0;
    for (let i = 0; i < total; i++) {
      const t = i / R, noise = rnd.NextDouble() * 2 - 1, k = Mathf.Lerp(0.05, 0.5, t / 0.5);
      lp += (noise - lp) * k;
      const env = Math.sin(Mathf.Clamp01(t / 0.3) * Math.PI) * 0.5;
      const sparkle = t > 0.25 ? Math.sin(2 * Math.PI * 2637 * t) * Math.exp(-(t - 0.25) * 14) * 0.3 : 0;
      d[i] = lp * env + sparkle;
    }
    return this.buf(d);
  },
};

// ---------------------------------------------------------------- Girdi
const Input = {
  keys: new Set(),
  pointerDown: false, pointerPos: { x: 0, y: 0 },  // ekran koordinatı (y aşağı)
  clicked: false, released: false, pressPos: null, releasePos: null, wheel: 0,
  anyKeyDown: false,
};
const Screen = { get width() { return innerWidth; }, get height() { return innerHeight; } };

// ---------------------------------------------------------------- Arayüz (Unity IMGUI karşılığı)
// Her kare yeniden çizilir. Koordinatlar CSS piksel, y aşağı (Unity GUI ile aynı).
const UI_FONT = '"Nunito", "Segoe UI", Arial, sans-serif';
const GUI = {
  ctx: null, cv: null, color: C(1, 1, 1, 1), depth: 0, enabled: true,
  _clip: [], _offset: [{ x: 0, y: 0 }], _hot: null, _scroll: null,
  wantsMouse: false, // bu karede bir arayüz öğesi tıklamayı yakaladı mı
  textFields: new Map(),
  get skin() { return GUI._skin || (GUI._skin = { label: new GUIStyle(), button: new GUIStyle({ alignment: TextAnchor.MiddleCenter }), box: new GUIStyle(), textField: new GUIStyle({ wordWrap: false }) }); },

  begin() {
    const ctx = this.ctx, dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.cv.width !== Math.round(innerWidth * dpr) || this.cv.height !== Math.round(innerHeight * dpr)) {
      this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.color = C(1, 1, 1, 1);
    this._offset = [{ x: 0, y: 0 }]; this._clip = [];
    this.wantsMouse = false;
    this._usedFields = new Set();
    this._hits = [];
  },
  end() {
    for (const [k, el] of this.textFields) if (!this._usedFields.has(k)) { el.remove(); this.textFields.delete(k); }
    if (this._fire && this._fireAge++ > 1) this._fire = null;
    if (this._hits.length) { this._fire = this._hits[this._hits.length - 1]; this._fireAge = 0; }
    if (Input.released) { Input.pressPos = null; GUI._drag = null; GUI._dragged = false; }
    Input.clicked = false; Input.released = false; Input.wheel = 0;
  },
  _hits: [], _fire: null, _fireAge: 0,
  off() { return this._offset[this._offset.length - 1]; },
  abs(r) { const o = this.off(); return new Rect(r.x + o.x, r.y + o.y, r.width, r.height); },
  mouse() { return Input.pointerPos; },
  inClip(p) { for (const c of this._clip) if (!c.Contains(p)) return false; return true; },
  mouseIn(r) { const a = this.abs(r); const m = this.mouse(); return a.Contains(m) && this.inClip(m); },

  roundRect(r, rad, fill) {
    const ctx = this.ctx; rad = Math.min(rad, r.width / 2, r.height / 2);
    ctx.beginPath(); ctx.moveTo(r.x + rad, r.y); ctx.arcTo(r.xMax, r.y, r.xMax, r.yMax, rad); ctx.arcTo(r.xMax, r.yMax, r.x, r.yMax, rad); ctx.arcTo(r.x, r.yMax, r.x, r.y, rad); ctx.arcTo(r.x, r.y, r.xMax, r.y, rad); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  },
  // Panel: yuvarlak köşeli dolu kutu (U.RoundTex karşılığı)
  Panel(r, c, radius) {
    const a = this.abs(r);
    const k = C(c.r * this.color.r, c.g * this.color.g, c.b * this.color.b, (c.a ?? 1) * (this.color.a ?? 1));
    this.roundRect(a, radius ?? (Math.min(a.width, a.height) < 50 ? 10 : 22), Col.css(k));
  },
  // Doku çizimi: 'circle', 'white', 'round', 'roundSmall' ya da canvas/Image
  DrawTexture(r, tex) {
    const a = this.abs(r), ctx = this.ctx, c = this.color;
    const fill = Col.css(c);
    if (tex === 'circle') { ctx.beginPath(); ctx.ellipse(a.x + a.width / 2, a.y + a.height / 2, a.width / 2, a.height / 2, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
    else if (tex === 'white' || !tex) { ctx.fillStyle = fill; ctx.fillRect(a.x, a.y, a.width, a.height); }
    else if (tex === 'round') this.roundRect(a, 22, fill);
    else if (tex === 'roundSmall') this.roundRect(a, 10, fill);
    else { ctx.save(); ctx.globalAlpha = c.a ?? 1; try { ctx.drawImage(tex, a.x, a.y, a.width, a.height); } catch (e) { } ctx.restore(); }
  },
  Label(r, text, style) { this._text(this.abs(r), text, style || this.skin.label); },
  Box(r, text, style) { this.Panel(r, C(0, 0, 0, 0.4)); if (text) this.Label(r, text, style); },
  _text(a, text, st) {
    if (text == null) return;
    text = String(text);
    const ctx = this.ctx, fs = Math.max(1, st.fontSize || 14);
    ctx.font = `${st.fontStyle === FontStyle.Bold ? '800' : '600'} ${fs}px ${UI_FONT}`;
    const tc = st.normal.textColor || C(1, 1, 1, 1), gc = this.color;
    ctx.fillStyle = Col.css(C(tc.r * gc.r, tc.g * gc.g, tc.b * gc.b, (tc.a ?? 1) * (gc.a ?? 1)));
    const pad = st.padding || { left: 0, right: 0, top: 0, bottom: 0 };
    const x0 = a.x + pad.left, w = a.width - pad.left - pad.right;
    let lines = [];
    for (const para of text.split('\n')) {
      if (!st.wordWrap) { lines.push(para); continue; }
      const words = para.split(' '); let cur = '';
      for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; }
      lines.push(cur);
    }
    // taşma denetimi (test için): yazı kutusuna sığmıyorsa kaydet
    if (GUI.audit) {
      let mw = 0; for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width);
      const tot = fs * 1.2 * lines.length;
      if (mw > w + 2 || tot > a.height * 1.35 + 4) GUI.overflows.push({ text: text.slice(0, 60), w: Math.round(mw), boxW: Math.round(w), h: Math.round(tot), boxH: Math.round(a.height), fs });
    }
    const lh = fs * 1.2, total = lh * lines.length;
    const al = st.alignment ?? TextAnchor.UpperLeft;
    const h = al === TextAnchor.UpperLeft || al === TextAnchor.UpperCenter || al === TextAnchor.UpperRight ? 0 : al === TextAnchor.LowerLeft || al === TextAnchor.LowerCenter || al === TextAnchor.LowerRight ? 2 : 1;
    const hx = (al % 3);
    let y = h === 0 ? a.y + pad.top : h === 2 ? a.yMax - pad.bottom - total : a.y + (a.height - total) / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = hx === 0 ? 'left' : hx === 1 ? 'center' : 'right';
    const x = hx === 0 ? x0 : hx === 1 ? x0 + w / 2 : x0 + w;
    ctx.save();
    if (st.clip !== false) { ctx.beginPath(); ctx.rect(a.x - 2, a.y - 4, a.width + 4, a.height + 8); }
    for (const l of lines) { ctx.fillText(l, x, y + lh / 2 + fs * 0.04); y += lh; }
    ctx.restore();
  },
  // Düğme: dokunma/fare bırakılınca, en üstteki düğme bir sonraki karede true döner
  Button(r, text, style) {
    const st = style || this.skin.button;
    this._text(this.abs(r), text, st);
    if (!this.enabled) return false;
    const a = this.abs(r), id = Math.round(a.x) + ',' + Math.round(a.y) + ',' + Math.round(a.width) + ',' + Math.round(a.height) + '|' + text;
    if (Input.pressPos && a.Contains(Input.pressPos) && this.inClip(Input.pressPos)) this.wantsMouse = true;
    if (Input.released && Input.releasePos && a.Contains(Input.releasePos) && this.inClip(Input.releasePos) && Input.pressPos && a.Contains(Input.pressPos) && !GUI._dragged) this._hits.push(id);
    if (this._fire === id) { this._fire = null; return true; }
    return false;
  },
  // Altındaki düğmelere tıklamayı engelleyen alan (açılır pencere arka planı)
  Block(r) {
    const a = r ? this.abs(r) : new Rect(0, 0, innerWidth, innerHeight);
    if (Input.pressPos && a.Contains(Input.pressPos)) this.wantsMouse = true;
    if (Input.released && Input.releasePos && a.Contains(Input.releasePos)) this._hits.push('#block');
  },
  // Kaydırma alanı (dokunarak sürükleme ve fare tekerleği)
  BeginScrollView(r, pos, view) {
    const a = this.abs(r);
    const id = Math.round(a.x) + ',' + Math.round(a.y);
    const maxY = Math.max(0, view.height - r.height);
    let y = pos.y;
    if (Input.wheel && a.Contains(this.mouse())) y += Input.wheel;
    if (GUI._drag && GUI._drag.id === id) y = GUI._drag.startScroll - (Input.pointerPos.y - GUI._drag.startY);
    if (Input.pointerDown && !GUI._drag && Input.pressPos && a.Contains(Input.pressPos) && Math.abs(Input.pointerPos.y - Input.pressPos.y) > 8) {
      GUI._drag = { id, startY: Input.pressPos.y, startScroll: pos.y }; GUI._dragged = true;
    }
    y = Mathf.Clamp(y, 0, maxY);
    this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(a.x, a.y, a.width, a.height); this.ctx.clip();
    this._clip.push(a);
    this._offset.push({ x: a.x - view.x, y: a.y - y - view.y });
    if (Input.pressPos && a.Contains(Input.pressPos)) this.wantsMouse = true;
    // kaydırma çubuğu
    if (maxY > 0) { const h = a.height * r.height / view.height, yy = a.y + (a.height - h) * (y / maxY); this.ctx.fillStyle = 'rgba(255,255,255,0.25)'; this.ctx.fillRect(a.xMax - 6, yy, 4, h); }
    return { x: pos.x, y };
  },
  EndScrollView() { this._offset.pop(); this._clip.pop(); this.ctx.restore(); },
  BeginGroup(r) { const a = this.abs(r); this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(a.x, a.y, a.width, a.height); this.ctx.clip(); this._clip.push(a); this._offset.push({ x: a.x, y: a.y }); },
  EndGroup() { this._offset.pop(); this._clip.pop(); this.ctx.restore(); },
  // Yazı alanı: gerçek bir <input> kullanır
  TextField(r, value, maxLen, key) {
    key = key || 'tf';
    this._usedFields.add(key);
    let el = this.textFields.get(key);
    const a = this.abs(r);
    if (!el) {
      el = document.createElement('input'); el.type = 'text'; el.maxLength = maxLen || 30; el.value = value;
      el.style.cssText = 'position:fixed;z-index:20;border:none;border-radius:10px;padding:0 12px;font-weight:700;color:#222;background:rgba(255,255,255,0.95);outline:none;box-sizing:border-box;';
      el.style.fontFamily = UI_FONT;
      document.body.appendChild(el); this.textFields.set(key, el);
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('keydown', e => e.stopPropagation());
    }
    el.style.left = a.x + 'px'; el.style.top = a.y + 'px'; el.style.width = a.width + 'px'; el.style.height = a.height + 'px';
    el.style.fontSize = Math.round(a.height * 0.45) + 'px';
    if (!this.inClip({ x: a.x + 2, y: a.y + 2 })) el.style.display = 'none'; else el.style.display = 'block';
    if (document.activeElement !== el && el.value !== value && !el.dataset.edited) el.value = value;
    el.oninput = () => { el.dataset.edited = '1'; };
    return el.value;
  },
  scale: 1, audit: false, overflows: [],
};
const TextAnchor = { UpperLeft: 0, UpperCenter: 1, UpperRight: 2, MiddleLeft: 3, MiddleCenter: 4, MiddleRight: 5, LowerLeft: 6, LowerCenter: 7, LowerRight: 8 };
const FontStyle = { Normal: 0, Bold: 1 };
class GUIStyle {
  // new GUIStyle(GUI.skin.label, { ... }) ya da new GUIStyle({ ... })
  constructor(base, o) {
    if (o === undefined && base && !(base instanceof GUIStyle)) { o = base; base = null; }
    this.fontSize = 13; this.alignment = TextAnchor.UpperLeft; this.fontStyle = FontStyle.Normal; this.wordWrap = true;
    this.normal = { textColor: C(1, 1, 1, 1), background: null }; this.padding = { left: 0, right: 0, top: 0, bottom: 0 };
    if (base) { Object.assign(this, base); this.normal = Object.assign({}, base.normal); this.padding = Object.assign({}, base.padding); }
    if (o) { const n = o.normal; Object.assign(this, o); this.normal = Object.assign({}, base ? base.normal : { textColor: C(1, 1, 1, 1) }, n || {}); }
  }
}
