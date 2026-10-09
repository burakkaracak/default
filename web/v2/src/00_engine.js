// ============================================================================
// Lavanta Koyu · motor
// Sahne three.js uzayında (x sağ, y yukarı, z öne/güney). Bütün oyun nesneleri "W" grubunda durur.
// Burada: matematik, rastgele, vektör/renk, zaman, kayıt, davranış döngüsü, malzeme/geometri yardımcıları,
// yazı sprite'ları, parçacıklar, karakter iskeleti, kısa animasyonlar, ses, girdi.
// ============================================================================

// ---------------------------------------------------------------- Mathf
const Mathf = {
  PI: Math.PI, Deg2Rad: Math.PI / 180, Rad2Deg: 180 / Math.PI,
  Clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  Clamp01: v => v < 0 ? 0 : v > 1 ? 1 : v,
  Lerp: (a, b, t) => a + (b - a) * (t < 0 ? 0 : t > 1 ? 1 : t),
  LerpUnclamped: (a, b, t) => a + (b - a) * t,
  InverseLerp: (a, b, v) => a === b ? 0 : Mathf.Clamp01((v - a) / (b - a)),
  SmoothStep: (a, b, t) => { t = Mathf.Clamp01(t); t = -2 * t * t * t + 3 * t * t; return b * t + a * (1 - t); },
  Repeat: (t, l) => Mathf.Clamp(t - Math.floor(t / l) * l, 0, l),
  PingPong: (t, l) => { t = Mathf.Repeat(t, l * 2); return l - Math.abs(t - l); },
  MoveTowards: (c, t, d) => Math.abs(t - c) <= d ? t : c + Math.sign(t - c) * d,
  // açı farkını -180..180 aralığına getir
  DeltaAngle: (a, b) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; },
  Sign: v => v >= 0 ? 1 : -1,
  RoundToInt: v => Math.round(v),
  PerlinNoise: (x, y) => perlin2(x, y),
  Ease: {
    outCubic: t => 1 - Math.pow(1 - t, 3), inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
    linear: t => t,
  },
};

// Klasik Perlin gürültüsü (0..1)
const _perm = (() => { const p = []; for (let i = 0; i < 256; i++) p[i] = i; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _grad(h, x, y) { switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; } }
function perlin2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
  const u = _fade(x), v = _fade(y), a = _perm[X] + Y, b = _perm[X + 1] + Y;
  const r = (1 - v) * ((1 - u) * _grad(_perm[a], x, y) + u * _grad(_perm[b], x - 1, y)) + v * ((1 - u) * _grad(_perm[a + 1], x, y - 1) + u * _grad(_perm[b + 1], x - 1, y - 1));
  return Mathf.Clamp01(r * 0.7071 + 0.5);
}

// ---------------------------------------------------------------- Rastgele
const Random = {
  get value() { return Math.random(); },
  Range: (a, b) => a + Math.random() * (b - a),
  RangeInt: (a, b) => a + Math.floor(Math.random() * (b - a)),
  Pick: arr => arr[Math.floor(Math.random() * arr.length)],
  Chance: p => Math.random() < p,
  Shuffle: arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
};
class SysRandom {
  constructor(seed) { this.s = (seed | 0) || 1; }
  NextDouble() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s / 0x80000000; }
  Next(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.floor(this.NextDouble() * (b - a)); }
  Range(a, b) { return a + this.NextDouble() * (b - a); }
}

// ---------------------------------------------------------------- Vektör
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Vec = {
  get zero() { return V(); }, get up() { return V(0, 1, 0); }, get forward() { return V(0, 0, 1); }, get right() { return V(1, 0, 0); },
  add: (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z),
  sub: (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z),
  mul: (a, k) => V(a.x * k, a.y * k, a.z * k),
  lerp: (a, b, t) => { t = Mathf.Clamp01(t); return V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); },
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  flat: (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
  len: a => Math.hypot(a.x, a.y, a.z),
  norm: a => { const l = Math.hypot(a.x, a.y, a.z); return l > 1e-9 ? V(a.x / l, a.y / l, a.z / l) : V(); },
  rotY: (v, deg) => { const a = deg * Mathf.Deg2Rad, c = Math.cos(a), s = Math.sin(a); return V(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); },
};

// ---------------------------------------------------------------- Renk (sRGB 0..1)
const C = (r, g, b, a = 1) => ({ r, g, b, a });
const Col = {
  get white() { return C(1, 1, 1); }, get black() { return C(0, 0, 0); },
  hex: h => { const n = parseInt(h.replace('#', ''), 16); return C(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); },
  lerp: (a, b, t) => { t = Mathf.Clamp01(t); return C(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, (a.a ?? 1) + ((b.a ?? 1) - (a.a ?? 1)) * t); },
  mul: (a, k) => C(a.r * k, a.g * k, a.b * k, a.a ?? 1),
  alpha: (a, al) => C(a.r, a.g, a.b, al),
  key: c => c.r.toFixed(3) + ',' + c.g.toFixed(3) + ',' + c.b.toFixed(3) + ',' + (c.a ?? 1).toFixed(3),
  three: c => new THREE.Color().setRGB(Mathf.Clamp01(c.r), Mathf.Clamp01(c.g), Mathf.Clamp01(c.b), THREE.SRGBColorSpace),
  css: c => `rgba(${Math.round(Mathf.Clamp01(c.r) * 255)},${Math.round(Mathf.Clamp01(c.g) * 255)},${Math.round(Mathf.Clamp01(c.b) * 255)},${Mathf.Clamp01(c.a ?? 1).toFixed(3)})`,
  hsl: (h, s, l) => { const c = new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace); const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return C(o.r, o.g, o.b); },
};

// ---------------------------------------------------------------- Zaman
const Time = { deltaTime: 0, unscaledDeltaTime: 0, time: 0, unscaledTime: 0, timeScale: 1, frameCount: 0 };

// ---------------------------------------------------------------- Kayıt
// Tek bir JSON nesnesi localStorage'da tutulur; bulut aynı nesneyi taşır.
const Store = (() => {
  const KEY = 'otel2_kayit_v1';
  let data = null, dirty = false;
  function ensure() { if (data) return; data = {}; try { const s = localStorage.getItem(KEY); if (s) data = JSON.parse(s) || {}; } catch (e) { data = {}; } }
  return {
    Get: (k, d) => { ensure(); return k in data ? data[k] : d; },
    Set: (k, v) => { ensure(); data[k] = v; dirty = true; },
    Has: k => { ensure(); return k in data; },
    Delete: k => { ensure(); if (k in data) { delete data[k]; dirty = true; } },
    DeleteAll: () => { data = {}; dirty = true; Store.Save(); },
    Save: (keepStamp) => { if (!dirty || !data) return; if (!keepStamp) data.__savedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(data)); dirty = false; } catch (e) { } },
    Raw: () => { ensure(); return data; },
    Load: obj => { data = obj || {}; dirty = true; },
    Touch: () => { dirty = true; },
  };
})();

// ---------------------------------------------------------------- Sahne ve davranışlar
let renderer, scene, camera, W, sunLight, hemiLight;
const behaviours = [];
const lateTasks = [];

function activeInHierarchy(o) { while (o) { if (!o.visible || o.userData.destroyed) return false; if (o === W) return true; o = o.parent; } return true; }
function SetActive(o, b) { if (o) o.visible = !!b; }

class Behaviour {
  constructor(go) {
    this.go = go || new THREE.Group();
    if (!this.go.parent) W.add(this.go);
    this.go.userData.comp = this;
    this.enabled = true;
    behaviours.push(this);
  }
  get transform() { return this.go; }
  get pos() { return this.go.position; }
  destroy() { Destroy(this.go); }
}

function Destroy(o, delay) {
  if (!o) return;
  if (o.go) o = o.go;
  if (delay) { lateTasks.push({ t: delay, step(dt) { this.t -= dt; if (this.t <= 0) { Destroy(o); return true; } } }); return; }
  o.traverse(c => { c.userData.destroyed = true; if (c.userData.textTex) c.userData.textTex.dispose(); if (c.userData.ownMat && c.material) c.material.dispose(); });
  if (o.parent) o.parent.remove(o);
}
function alive(o) { if (!o) return false; if (o.go) o = o.go; return !o.userData.destroyed; }

const _tv = new THREE.Vector3();
function worldPos(o) { if (o.parent === W) return o.position.clone(); o.getWorldPosition(_tv); return W.worldToLocal(_tv.clone()); }
function setWorldPos(o, p) { if (o.parent === W) { o.position.copy(p); return; } const w = W.localToWorld(V(p.x, p.y, p.z)); o.parent.worldToLocal(w); o.position.copy(w); }
function reparentKeep(o, parent) { parent = parent || W; const wp = worldPos(o); parent.add(o); setWorldPos(o, wp); }
function setEuler(o, x, y, z) { o.rotation.set(x * Mathf.Deg2Rad, y * Mathf.Deg2Rad, z * Mathf.Deg2Rad, 'YXZ'); }
function yawOf(dir) { return Math.atan2(dir.x, dir.z); }
function lookRotation(o, dir) { if (dir.x * dir.x + dir.z * dir.z < 1e-8) return; o.rotation.set(0, yawOf(dir), 0, 'YXZ'); }
function forwardOf(o) { const y = o.rotation.y; return V(Math.sin(y), 0, Math.cos(y)); }

// ---------------------------------------------------------------- Dokular (kodla)
function canvasTex(size, fn, repeat = true) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b, a] = fn(x, size - 1 - y); const i = (y * size + x) * 4;
    img.data[i] = r * 255; img.data[i + 1] = g * 255; img.data[i + 2] = b * 255; img.data[i + 3] = (a ?? 1) * 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return t;
}
// Ham RGBA (models.json içinde) → DataTexture. Sayfa korumalı olduğundan resim dosyası çözülemez; piksel olarak gömülür.
function dataTex(c) {
  const px = Uint8Array.from(atob(c.rgba), ch => ch.charCodeAt(0));
  const t = new THREE.DataTexture(px, c.w, c.h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- U (ortak yardımcılar)
const U = {
  _matCache: new Map(), _geo: {}, _tex: {},
  models: {}, tex: {},

  geo(type) {
    if (this._geo[type]) return this._geo[type];
    let g;
    switch (type) {
      case 'Sphere': g = new THREE.SphereGeometry(0.5, 20, 14); break;
      case 'Cylinder': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 24); break;
      case 'Cone': g = new THREE.ConeGeometry(0.5, 1, 20); break;
      case 'Capsule': g = new THREE.CapsuleGeometry(0.5, 1, 6, 16); break;
      case 'Quad': g = new THREE.PlaneGeometry(1, 1); break;
      case 'Round': g = new RoundedBoxGeometry(1, 1, 1, 4, 0.08); break;
      case 'RoundBig': g = new RoundedBoxGeometry(1, 1, 1, 5, 0.22); break;
      case 'Torus': g = new THREE.TorusGeometry(0.5, 0.08, 10, 28); break;
      default: g = new THREE.BoxGeometry(1, 1, 1);
    }
    return this._geo[type] = g;
  },

  get TileTex() { return this._tex.tile || (this._tex.tile = U.MakeTile()); },
  get WoodTex() { return this._tex.wood || (this._tex.wood = U.MakeWood()); },
  get CarpetTex() { return this._tex.carpet || (this._tex.carpet = U.MakeNoise('carpet', 0.3, 0.12)); },
  get GrassTex() { return this._tex.grass || (this._tex.grass = U.MakeNoise('grass', 0.06, 0.22)); },
  get SandTex() { return this._tex.sand || (this._tex.sand = U.MakeNoise('sand', 0.12, 0.1)); },
  get HaloTex() { return this._tex.halo || (this._tex.halo = canvasTex(64, (x, y) => { const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) / 32; const a = Mathf.Clamp01(1 - d); return [1, 1, 1, a * a]; }, false)); },
  get DotTex() { return this._tex.dot || (this._tex.dot = canvasTex(32, (x, y) => { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16); return [1, 1, 1, Mathf.Clamp01(15 - d)]; }, false)); },
  MakeTile() {
    const s = 256, tiles = 4, cell = s / tiles, rnd = new SysRandom(3), v = [];
    for (let i = 0; i < tiles * tiles; i++) v[i] = 0.92 + rnd.NextDouble() * 0.08;
    return canvasTex(s, (x, y) => { const lx = x % cell, ly = y % cell; const grout = lx < 3 || ly < 3; const b = grout ? 0.76 : v[Math.floor(y / cell) * tiles + Math.floor(x / cell)] - 0.04 * Mathf.PerlinNoise(x * 0.04, y * 0.04); return [b, b, b]; });
  },
  MakeWood() {
    const s = 256, pw = 32;
    return canvasTex(s, (x, y) => { const p = Math.floor(x / pw), off = (p * 73) % s; const grain = Mathf.PerlinNoise(x * 0.09 + p * 10, (y + off) * 0.012); let b = 0.8 + 0.2 * grain; b *= 0.93 + 0.07 * ((p * 37) % 5) / 4; if (x % pw < 2) b *= 0.7; if ((y + off) % 128 < 2) b *= 0.75; return [b, b, b]; });
  },
  MakeNoise(n, freq, amount) {
    const rnd = new SysRandom(n.length * 17);
    return canvasTex(256, (x, y) => { const a = Mathf.PerlinNoise(x * freq, y * freq) * 0.6 + Mathf.PerlinNoise(x * freq * 3 + 50, y * freq * 3 + 50) * 0.4; const b = 1 - amount + amount * a + (rnd.NextDouble() - 0.5) * amount * 0.4; return [b, b, b]; });
  },

  // Mat(c) / Mat(c, smooth) / Mat(c, {tex, tiling, smooth, emission, flat})
  Mat(c, opt) {
    if (typeof opt === 'number') opt = { smooth: opt };
    opt = opt || {};
    const tex = opt.tex || null, tiling = opt.tiling || { x: 1, y: 1 }, smooth = opt.smooth ?? 0.2, emission = opt.emission || 0;
    const key = Col.key(c) + '|' + (tex ? tex.uuid : '-') + '|' + tiling.x.toFixed(2) + ',' + tiling.y.toFixed(2) + '|' + smooth.toFixed(2) + '|' + emission.toFixed(2) + (opt.flat ? '|f' : '') + (opt.double ? '|d' : '');
    let m = this._matCache.get(key);
    if (m) return m;
    if (opt.flat) m = new THREE.MeshBasicMaterial({ color: Col.three(c) });
    else m = new THREE.MeshStandardMaterial({ color: Col.three(c), roughness: Mathf.Clamp(1 - smooth, 0.05, 1), metalness: 0 });
    if (tex) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(tiling.x, tiling.y); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; m.map = t; }
    if (emission > 0 && !opt.flat) { m.emissive = Col.three(c); m.emissiveIntensity = emission; }
    if ((c.a ?? 1) < 0.999) { m.transparent = true; m.opacity = c.a; m.depthWrite = false; }
    if (opt.double) m.side = THREE.DoubleSide;
    m.userData.key = key; m.userData.color = c;
    this._matCache.set(key, m);
    return m;
  },
  Glow(c, k = 1) { return U.Mat(c, { smooth: 0.3, emission: k }); },

  Prim(name, parent, pos, scale, mat, type = 'Cube') {
    const m = new THREE.Mesh(U.geo(type), mat);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
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
  Text(parent, pos, s, size, c, shadow = false, depth = false) { return new TextMesh(parent, pos, s, size, c, shadow, depth); },
  Halo(parent, pos, size, c, opacity = 0.5) {
    const mat = new THREE.SpriteMaterial({ map: U.HaloTex, color: Col.three(c), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat); sp.name = 'Hale'; sp.userData.ownMat = true;
    (parent || W).add(sp); sp.position.copy(pos); sp.scale.set(size, size, 1); sp.renderOrder = 5;
    return sp;
  },

  // Birçok küçük parçayı tek bir mesh'te birleştir (sabit dekor: çit, çiçek, kaldırım taşı...). Renk vertex'e yazılır.
  Merge(name, parent, parts) {
    // parts: [{geo:'Cube'|geometry, pos, scale, rot(yaw derece), c}]
    const geos = [];
    for (const p of parts) {
      const g = (typeof p.geo === 'string' ? U.geo(p.geo) : p.geo).clone();
      const col = Col.three(p.c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      const m = new THREE.Matrix4().compose(V(p.pos.x, p.pos.y, p.pos.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx ? p.rx * Mathf.Deg2Rad : 0, (p.rot || 0) * Mathf.Deg2Rad, p.rz ? p.rz * Mathf.Deg2Rad : 0, 'YXZ')), V(p.scale.x, p.scale.y, p.scale.z));
      g.applyMatrix4(m); geos.push(g);
    }
    if (!geos.length) return null;
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, U.vertexMat());
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    (parent || W).add(mesh);
    return mesh;
  },
  vertexMat() { return this._vmat || (this._vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 })); },

  // ---- Hazır modeller ----
  _furnUnit: -1, _charUnit: -1,
  get FurnUnit() { if (this._furnUnit < 0) { const m = this.models.bedDouble; this._furnUnit = m ? 2.0 / U.LocalBounds(m.scene).size.z : 1; } return this._furnUnit; },
  get CharUnit() { if (this._charUnit < 0) { const m = this.models['character-female-a']; this._charUnit = m ? 1.0 / U.LocalBounds(m.scene).size.y : 1; } return this._charUnit; },
  LocalBounds(obj) {
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3();
    obj.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    return { min: b.min, max: b.max, size: b.getSize(V()), center: b.getCenter(V()) };
  },
  WorldBounds(obj) {
    obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(W.matrixWorld).invert();
    const b = new THREE.Box3(); let has = false;
    obj.traverse(o => { if (!o.isMesh || !o.visible) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))); has = true; });
    if (!has) { const p = worldPos(obj); b.set(p.clone(), p.clone()); }
    return { min: b.min, max: b.max, size: b.getSize(V()), center: b.getCenter(V()) };
  },
  // Model kopyası: taban pos.y'de, orta pos.x/z'de. scale: metre çarpanı (mobilya: 1 = gerçek boy). yaw derece.
  // Dokusuz, opak parçaları (Kenney mobilyaları) renkleri köşe rengine yazarak tek geometride birleştirir; modele göre önbelleklenir
  _mergedCache: new Map(),
  NoShadowRe: /^(road-|pavement|grass$|plantSmall|pottedPlant|lamp|cardboard|cloud|rug)/,
  mergedModel(name) {
    if (this._mergedCache.has(name)) return this._mergedCache.get(name);
    const md = this.models[name]; let res = null;
    if (md) {
      md.scene.updateMatrixWorld(true);
      const geos = [], rest = [];
      md.scene.traverse(o => {
        if (!o.isMesh) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (ms.length !== 1 || !ms[0] || ms[0].map || ms[0].transparent || o.isSkinnedMesh || (o.geometry.groups && o.geometry.groups.length > 1)) { rest.push(o); return; }
        let g = o.geometry.clone(); if (g.index) g = g.toNonIndexed();
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        g.applyMatrix4(o.matrixWorld);
        const o2 = {}; ms[0].color.getRGB(o2, THREE.LinearSRGBColorSpace); const col = Col.three(C(o2.r, o2.g, o2.b));
        const n = g.attributes.position.count, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); geos.push(g);
      });
      if (geos.length) res = { geo: BufferGeometryUtils.mergeGeometries(geos, false), rest };
    }
    this._mergedCache.set(name, res); return res;
  },
  Model(name, parent, pos, yaw = 0, scale = 1, unit) {
    const md = this.models[name];
    if (!md) return U.Box(name, parent, Vec.add(pos, V(0, 0.5, 0)), V(1, 1, 1), C(0.9, 0.5, 0.8));
    const holder = new THREE.Group(); holder.name = name;
    (parent || W).add(holder);
    holder.rotation.set(0, yaw * Mathf.Deg2Rad, 0);
    holder.scale.setScalar(scale * (unit ?? U.FurnUnit));
    const mm = this.mergedModel(name); let g;
    if (mm) {
      g = new THREE.Group(); g.name = name;
      const mesh = new THREE.Mesh(mm.geo, U.vertexMat()); mesh.name = name + '_1'; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
      for (const o of mm.rest) { const c = new THREE.Mesh(o.geometry, o.material); c.name = o.name; c.applyMatrix4(o.matrixWorld); g.add(c); }
      U.FixMats(g);
    } else { g = md.scene.clone(true); U.FixMats(g); }
    if (this.NoShadowRe.test(name)) U.NoShadow(g);
    holder.add(g);
    const b = U.LocalBounds(g);
    // model merkezini tabana ve ortaya al (model kendi uzayında)
    g.position.set(-b.center.x, -b.min.y, -b.center.z);
    holder.position.set(pos.x, pos.y, pos.z);
    holder.userData.size = V(b.size.x * holder.scale.x, b.size.y * holder.scale.y, b.size.z * holder.scale.z);
    return holder;
  },
  Furn(name, parent, pos, yaw = 0, scale = 1) { return U.Model(name, parent, pos, yaw, scale); },
  // Şehir paketi: 1 karo = 1 birim; TileSize ile ölçeklenir, taban orta noktası pos
  City(name, parent, pos, yaw = 0, k = 1) { return U.Model(name, parent, pos, yaw, k * U.TileSize, 1); },
  TileSize: 6,

  FixMats(g) {
    g.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (o.material && o.material.vertexColors) return; // birleştirilmiş, köşe renkli ağ
      const fix = m => {
        if (!m) return U.Mat(Col.white);
        if (m.map) {
          const key = 'tex' + m.map.uuid;
          let mm = U._matCache.get(key);
          if (!mm) { m.map.colorSpace = THREE.SRGBColorSpace; mm = new THREE.MeshStandardMaterial({ map: m.map, roughness: 0.85, metalness: 0 }); U._matCache.set(key, mm); }
          return mm;
        }
        const c = m.color.clone(); const o2 = {}; c.getRGB(o2, THREE.LinearSRGBColorSpace); // assimp: sRGB sayıları doğrusal yazmış
        return U.Mat(C(o2.r, o2.g, o2.b), 0.2);
      };
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
    });
  },

  // ---- Hareket ----
  Face(t, dir, k = 12) {
    if (dir.x * dir.x + dir.z * dir.z < 0.0001) return;
    const target = Math.atan2(dir.x, dir.z);
    let d = target - t.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    t.rotation.set(0, t.rotation.y + d * Math.min(1, Time.deltaTime * k), 0, 'YXZ');
  },
  // Yol boyunca yürür; bitince true. Yol noktaları {x,y,z}; y farkı anında uygulanır (kat geçişi asansörle yapılır)
  Walk(t, path, speed, rig) {
    if (path.length === 0) { if (rig) rig.Tick(0); return true; }
    const target = path[0];
    const d = V(target.x - t.position.x, 0, target.z - t.position.z);
    const step = speed * Time.deltaTime, mag = Vec.len(d);
    if (mag <= step) { t.position.set(target.x, target.y, target.z); path.shift(); }
    else { t.position.add(Vec.mul(d, step / mag)); t.position.y += (target.y - t.position.y) * Math.min(1, Time.deltaTime * 8); U.Face(t, d); }
    if (rig) rig.Tick(1);
    return path.length === 0;
  },
  Burst(pos, a, b, count, speed = 5) { Particles.burst(pos, a, b, count, speed); },
};

// ---------------------------------------------------------------- 3B yazı (kameraya dönük sprite)
const UI_FONT = '"Nunito", "Segoe UI", Arial, sans-serif';
const _measure = document.createElement('canvas').getContext('2d');
class TextMesh {
  constructor(parent, pos, s, size, c, shadow, depth) {
    this._text = s || ''; this._size = size; this._color = c; this.shadow = shadow; this.flat = false;
    this.mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: !!depth, fog: false });
    this.obj = new THREE.Sprite(this.mat);
    this.obj.name = 'Yazi'; this.obj.renderOrder = 10;
    this.obj.userData.ownMat = true; this.obj.userData.text = this;
    (parent || W).add(this.obj);
    this.obj.position.set(pos.x, pos.y, pos.z);
    this._scaleK = 1;
    this.redraw();
  }
  get transform() { return this.obj; }
  get text() { return this._text; }
  set text(v) { v = v == null ? '' : String(v); if (v === this._text) return; this._text = v; this.redraw(); }
  get color() { return this._color; }
  set color(c) { if (this._color && Col.key(c) === Col.key(this._color)) return; const same = this._color && c.r === this._color.r && c.g === this._color.g && c.b === this._color.b; this._color = c; if (same) { this.mat.opacity = c.a ?? 1; return; } this.redraw(); }
  set scaleK(k) { this._scaleK = k; this.applyScale(); }
  // Yere yatık (vertical=false) ya da dik duran (yaw derece, +z'ye bakar) düz yazı
  makeFlat(vertical = false, yaw = 0) {
    if (this.flat) return this;
    const tex = this.mat.map; const p = this.obj.position.clone(); const parent = this.obj.parent;
    parent.remove(this.obj);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: this.mat.opacity });
    const mesh = new THREE.Mesh(U.geo('Quad'), m); mesh.name = 'Yazi'; mesh.renderOrder = 3;
    if (vertical) mesh.rotation.set(0, yaw * Mathf.Deg2Rad, 0); else mesh.rotation.set(-Math.PI / 2, 0, 0);
    mesh.userData.ownMat = true; mesh.userData.text = this;
    parent.add(mesh); mesh.position.copy(p);
    this.obj = mesh; this.mat = m; this.flat = true; this.applyScale();
    return this;
  }
  redraw() {
    const lines = this._text.split('\n');
    const px = 96, font = `800 ${px}px ${UI_FONT}`;
    _measure.font = font;
    let w = 1; for (const l of lines) w = Math.max(w, _measure.measureText(l).width);
    const pad = 14, lh = px * 1.15;
    const cw = Math.ceil(w + pad * 2), ch = Math.ceil(lh * lines.length + pad * 2);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d'); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const c = this._color;
    lines.forEach((l, i) => {
      const y = pad + lh * (i + 0.5);
      if (this.shadow) { ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,20,40,0.75)'; ctx.strokeText(l, cw / 2, y); }
      ctx.fillStyle = Col.css(C(c.r, c.g, c.b, 1)); ctx.fillText(l, cw / 2, y);
    });
    if (this.mat.map) this.mat.map.dispose();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    this.mat.map = t; this.mat.opacity = c.a ?? 1; this.mat.needsUpdate = true;
    this.obj.userData.textTex = t;
    this.cw = cw; this.ch = ch;
    this.applyScale();
  }
  applyScale() { const k = this._size * 6.4 / 96 * this._scaleK; this.obj.scale.set(this.cw * k, this.ch * k, 1); }
}

// ---------------------------------------------------------------- Parçacıklar (konfeti, yaprak, kar, kalp)
const Particles = {
  list: [], mesh: null, max: 2000,
  init() {
    const g = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, m, this.max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 3), 3);
    W.add(this.mesh);
  },
  burst(pos, a, b, count, speed) {
    count = Math.min(count, 300);
    for (let i = 0; i < count && this.list.length < this.max; i++) {
      const ang = Random.Range(0, 35) * Mathf.Deg2Rad, az = Random.Range(0, Math.PI * 2), sp = Random.Range(speed * 0.5, speed);
      const dir = V(Math.sin(ang) * Math.cos(az), Math.cos(ang), Math.sin(ang) * Math.sin(az));
      this.list.push({ p: V(pos.x + Random.Range(-0.2, 0.2), pos.y, pos.z + Random.Range(-0.2, 0.2)), v: Vec.mul(dir, sp), life: Random.Range(0.8, 1.4), age: 0, size: Random.Range(0.1, 0.22), rot: Random.Range(0, 6.28), rs: Random.Range(-6, 6), g: 12.7, c: Col.three(Col.lerp(a, b, Math.random())) });
    }
  },
  // yavaş süzülen (yaprak, kar, kalp): g küçük, yatay salınım
  drift(pos, c, size, life, vel) {
    if (this.list.length >= this.max) return;
    this.list.push({ p: pos.clone(), v: vel.clone(), life, age: 0, size, rot: Random.Range(0, 6.28), rs: Random.Range(-2, 2), g: 0.4, sway: Random.Range(0.5, 1.5), c: Col.three(c) });
  },
  update(dt) {
    if (!this.mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.age += dt;
      if (p.age >= p.life) { this.list.splice(i, 1); continue; }
      p.v.y -= p.g * dt; if (p.sway) p.p.x += Math.sin(p.age * 3 * p.sway) * dt * 0.6;
      p.p.addScaledVector(p.v, dt); p.rot += p.rs * dt;
    }
    for (const p of this.list) {
      e.set(p.rot, p.rot * 0.7, p.rot * 0.3); q.setFromEuler(e); s.setScalar(p.size * (p.sway ? Mathf.Clamp01((p.life - p.age) * 2) : 1));
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
    this.ring = U.Flat('Kenar', this.root, V(0, 0.015, 0), V(radius * 2 + 0.18, 0.01, radius * 2 + 0.18), Col.white, 'Cylinder');
    U.Flat('Zemin', this.root, V(0, 0.02, 0), V(radius * 2, 0.01, radius * 2), baseC, 'Cylinder');
    this.fill = U.Flat('Dolum', this.root, V(0, 0.03, 0), V(0, 0, 0), fillC, 'Cylinder');
    if (icon) U.Text(this.root, V(0, 0.05, 0), icon, radius * 0.12, C(1, 1, 1, 0.9)).makeFlat();
    this.Set(0);
  }
  Set(t) {
    t = Mathf.Clamp01(t); const d = this.r * 2 * t;
    this.fill.scale.set(Math.max(d, 1e-4), 0.01, Math.max(d, 1e-4)); this.fill.visible = t > 0.001;
    if (t > 0.001) this.pulse += Time.deltaTime * 10; else this.pulse = 0;
    const k = 1 + Math.sin(this.pulse) * 0.04;
    this.ring.scale.set((this.r * 2 + 0.18) * k, 0.01, (this.r * 2 + 0.18) * k);
  }
  Show(s) { this.root.visible = !!s; }
}

// ---------------------------------------------------------------- Karakter iskeleti
class Rig {
  static CharYaw = 0; // model önü +z; U.Face hareket yönüne +z'yi çevirir
  static Guests = ['character-female-a', 'character-female-b', 'character-female-c', 'character-female-e', 'character-female-f', 'character-male-a', 'character-male-b', 'character-male-c', 'character-male-e', 'character-male-f'];
  static Act = { None: 0, Clean: 1, Cheer: 2, Sad: 3, Lie: 4, Sit: 5, Wave: 6 };
  static all = new Set();

  static Model(parent, variant, height = 1.75) {
    const md = U.models[variant] || U.models['character-male-d'];
    const r = new Rig();
    const g = SkeletonUtils.clone(md.scene);
    g.name = 'Karakter';
    const holder = new THREE.Group(); holder.name = 'Karakter';
    holder.add(g);
    holder.scale.setScalar(height * U.CharUnit);
    g.rotation.y = Rig.CharYaw * Mathf.Deg2Rad;
    (parent || W).add(holder);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    U.FixMats(g);
    r.go = holder; r.transform = holder; r.inner = g;
    holder.userData.rig = r;
    r.mixer = new THREE.AnimationMixer(g);
    r.actions = {};
    for (const clip of md.animations) r.actions[clip.name] = r.mixer.clipAction(clip);
    r.act = Rig.Act.None; r.cur = null;
    r.Play('idle', 0);
    if (r.actions.idle) r.actions.idle.time = Math.random() * r.actions.idle.getClip().duration;
    Rig.all.add(r);
    return r;
  }
  Play(n, fade) {
    if (this.cur === n || !this.actions[n]) return;
    const next = this.actions[n];
    next.reset(); next.setLoop(THREE.LoopRepeat); next.enabled = true; next.setEffectiveWeight(1); next.play();
    if (this.cur && this.actions[this.cur] && fade > 0) this.actions[this.cur].crossFadeTo(next, fade, false);
    else if (this.cur && this.actions[this.cur]) this.actions[this.cur].stop();
    this.cur = n;
  }
  Tick(m) {
    const A = Rig.Act;
    let want = this.act === A.Clean ? 'interact-right' : this.act === A.Cheer ? 'emote-yes' : this.act === A.Sad ? 'emote-no' :
      this.act === A.Lie ? 'static' : this.act === A.Sit ? 'sit' : this.act === A.Wave ? 'emote-yes' : m > 1.25 ? 'sprint' : m > 0.1 ? 'walk' : 'idle';
    if (!this.actions[want]) want = 'idle';
    this.Play(want, 0.15);
    if (want === 'walk') this.actions.walk.timeScale = Mathf.Clamp(m, 0.8, 1.5) * 1.15;
    if (want === 'sprint') this.actions.sprint.timeScale = Mathf.Clamp(m * 0.75, 0.8, 1.4);
  }
  update(dt) { if (this.mixer && this.inner.visible && activeInHierarchy(this.go)) this.mixer.update(dt); }
}

// ---------------------------------------------------------------- Kısa animasyonlar
const Tween = {
  // genel: dur saniye boyunca fn(t 0..1, eased)
  To(dur, fn, ease = Mathf.Ease.outCubic, done) {
    let a = 0;
    lateTasks.push({ step(dt) { a += dt / dur; const t = Mathf.Clamp01(a); fn(ease(t), t); if (a >= 1) { done && done(); return true; } } });
  },
  FloatText(pos, s, c, size = 0.1) {
    const t = U.Text(null, pos, s, size, c, true);
    const p0 = pos.clone(); let a = 0;
    lateTasks.push({ step(dt) { a += dt / 1.3; const k = a < 0.15 ? Mathf.Lerp(0.5, 1.2, a / 0.15) : Mathf.Lerp(1.2, 1, (a - 0.15) * 4); t.scaleK = k; t.obj.position.set(p0.x, p0.y + a * 1.3, p0.z); t.mat.opacity = (c.a ?? 1) * (1 - a * a); if (a >= 1) { Destroy(t.obj); return true; } } });
  },
  Pop(o, k0 = 0) {
    const s = o.scale.clone(); let a = 0;
    lateTasks.push({ step(dt) { if (!alive(o)) return true; a += dt / 0.35; const k = Mathf.Lerp(k0, 1, Mathf.Ease.outBack(Mathf.Clamp01(a))); o.scale.set(s.x * Math.max(k, 1e-3), s.y * Math.max(k, 1e-3), s.z * Math.max(k, 1e-3)); if (a >= 1) { o.scale.copy(s); return true; } } });
  },
  Squash(o, k = 0.18) {
    const s = o.scale.clone(); let a = 0;
    lateTasks.push({ step(dt) { if (!alive(o)) return true; a += dt / 0.3; const q = Math.sin(Mathf.Clamp01(a) * Math.PI) * k; o.scale.set(s.x * (1 + q), s.y * (1 - q), s.z * (1 + q)); if (a >= 1) { o.scale.copy(s); return true; } } });
  },
  Fly(b, target, to, delay) {
    let a = 0, p0 = null, dur = 0.35, wait = delay || 0;
    lateTasks.push({ step(dt) {
      if (!alive(b)) return true;
      if (wait > 0) { wait -= dt; return; }
      if (!p0) { reparentKeep(b, W); p0 = worldPos(b); dur = target ? Mathf.Clamp(Vec.dist(p0, target.position) * 0.05, 0.35, 0.8) : 0.35; }
      a += dt / dur;
      const end = target ? Vec.add(target.position, V(0, 1.1, 0)) : to;
      const p = Vec.lerp(p0, end, a); p.y += Math.sin(Math.min(a, 1) * Math.PI) * 1.4;
      b.position.copy(p); b.rotation.y += 720 * Mathf.Deg2Rad * dt;
      if (a >= 1) { Destroy(b); return true; }
    } });
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
    this.clips.build = this.Notes([392, 523, 659, 784], 0.09, 10);
    this.clips.ding = this.Bell(1760, 0.7);
    this.clips.bell = this.Bell(1320, 0.9);
    this.clips.clean = this.Swish();
    this.clips.bad = this.Notes([330, 247], 0.14, 8, true);
    this.clips.pop = this.Notes([880], 0.07, 40);
    this.clips.tap = this.Notes([1200], 0.03, 80);
    this.clips.heart = this.Notes([988, 1319], 0.09, 18);
    if (typeof Music !== 'undefined') Music.Init();
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
    freqs.forEach((f, n) => { for (let i = 0; i < per + tail && n * per + i < total; i++) { const t = i / R, env = Math.exp(-t * decay) * Mathf.Clamp01(t * 400); let w = Math.sin(2 * Math.PI * f * t); if (square) w = Mathf.Sign(w) * 0.5 + w * 0.5; else w = w * 0.8 + Math.sin(4 * Math.PI * f * t) * 0.2; d[n * per + i] += w * env * 0.4; } });
    return this.buf(d);
  },
  Bell(f, len) {
    const R = this.Rate, total = Math.floor(R * len), d = new Float32Array(total);
    for (let i = 0; i < total; i++) { const t = i / R, env = Math.exp(-t * 6) * Mathf.Clamp01(t * 600); d[i] = (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 2.76 * t) * 0.25 + Math.sin(2 * Math.PI * f * 5.4 * t) * 0.1) * env * 0.4; }
    return this.buf(d);
  },
  Swish() {
    const R = this.Rate, total = Math.floor(R * 0.5), d = new Float32Array(total), rnd = new SysRandom(7); let lp = 0;
    for (let i = 0; i < total; i++) { const t = i / R, noise = rnd.NextDouble() * 2 - 1, k = Mathf.Lerp(0.05, 0.5, t / 0.5); lp += (noise - lp) * k; const env = Math.sin(Mathf.Clamp01(t / 0.3) * Math.PI) * 0.5; const sparkle = t > 0.25 ? Math.sin(2 * Math.PI * 2637 * t) * Math.exp(-(t - 0.25) * 14) * 0.3 : 0; d[i] = lp * env + sparkle; }
    return this.buf(d);
  },
};

// ---------------------------------------------------------------- Girdi (ham)
// Dokunma/fare olayları Gestures tarafından yorumlanır (sürükleme = yürüme, kısa dokunma = seçme, iki parmak = kamera)
const Input = {
  keys: new Set(), pointers: new Map(), // id -> {x,y,x0,y0,t0,moved}
  wheel: 0,
  tapHandlers: [], dragHandlers: [], pinchHandlers: [],
};
