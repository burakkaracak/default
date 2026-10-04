// Sahne yöneticisi: tek renderer, lokasyonlar arasında geçiş, kamera takibi, çarpışma ve etkileşim alanları.
import * as THREE from 'three';
import { ringMesh, textSprite } from './builder.js';
import { G } from '../core/state.js';
import { bus } from '../core/bus.js';

export const W = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null,
  root: null,          // aktif lokasyon grubu
  locs: {},            // id -> modül
  cur: null,           // aktif modül
  floor: 0,
  colliders: [], zones: [], bounds: null,
  overlay: null,       // mini oyun sahnesi {scene,camera,update}
  quality: 'med',
  camDist: 1, camTarget: new THREE.Vector3(), camShake: 0,
  fps: 60, _fpsAcc: 0, _fpsN: 0,

  init(canvas, quality) {
    this.quality = quality;
    const hi = quality === 'high';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'low' ? 1 : quality === 'med' ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = hi;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#EFE9DF');
    this.scene.fog = new THREE.Fog('#EFE9DF', 40, 90);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.5, 220);
    this.hemi = new THREE.HemisphereLight('#FFF8EC', '#B8AE9C', 1.55);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#FFF1DC', 1.25);
    this.sun.position.set(-10, 22, 12);
    if (hi) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1536, 1536);
      const c = this.sun.shadow.camera; c.left = -26; c.right = 26; c.top = 26; c.bottom = -26; c.near = 1; c.far = 70;
      this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sun, this.sun.target);
    this.resize();
    addEventListener('resize', () => this.resize());
  },
  setQuality(q) {
    this.quality = q;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'low' ? 1 : q === 'med' ? 1.5 : 2));
    this.resize();
  },
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.camDist = w < h ? 1.45 : w < 900 ? 1.15 : 1;
    if (this.overlay?.resize) this.overlay.resize(w, h);
  },
  register(mod) { this.locs[mod.id] = mod; },

  // Lokasyona geç. floor: mağaza katı. spawn: {x,z}
  enter(id, opts = {}) {
    if (this.root) { this.scene.remove(this.root); this.cur?.leave?.(); }
    this.cur = this.locs[id];
    this.floor = opts.floor ?? 0;
    G.player.loc = id; G.player.floor = this.floor;
    const built = this.cur.build(this.floor);
    this.root = built.group; this.colliders = built.colliders; this.zones = built.zones; this.bounds = built.bounds;
    this.scene.add(this.root);
    for (const z of this.zones) this._attachZone(z);
    if (opts.x != null) { G.player.x = opts.x; G.player.z = opts.z; }
    else if (built.spawn) { G.player.x = built.spawn[0]; G.player.z = built.spawn[1]; }
    this.scene.background.set(built.bg || '#EFE9DF'); this.scene.fog.color.set(built.bg || '#EFE9DF');
    bus.emit('locationEntered', id, this.floor);
    this.snapCamera();
  },
  addZone(z) { this.zones.push(z); this._attachZone(z); return z; },
  removeZone(z) { const i = this.zones.indexOf(z); if (i >= 0) this.zones.splice(i, 1); if (z.mesh) z.mesh.parent?.remove(z.mesh); },
  _attachZone(z) {
    if (z.hidden) return;
    const ring = ringMesh(z.r * 0.8, z.color || (z.kind === 'auto' ? '#7C9AA8' : '#9C905C'));
    ring.position.set(z.x, 0.03 + (z.y || 0), z.z);
    if (z.label && !z.noSign) {
      const s = textSprite(z.label, { h: 0.36 }); s.position.set(0, 2.25 + (z.signY || 0), 0); ring.add(s); z.sign = s;
    }
    z.mesh = ring; this.root.add(ring);
  },
  // Duvarlara çarpışma: daire-kutu itme
  collide(x, z, r) {
    for (const c of this.colliders) {
      const nx = Math.max(c[0], Math.min(x, c[2])), nz = Math.max(c[1], Math.min(z, c[3]));
      const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), push = (r - d) / d; x += dx * push; z += dz * push; }
        else { // merkez kutunun içinde: en yakın kenara it
          const l = x - c[0], rr = c[2] - x, t = z - c[1], b = c[3] - z, m = Math.min(l, rr, t, b);
          if (m === l) x = c[0] - r; else if (m === rr) x = c[2] + r; else if (m === t) z = c[1] - r; else z = c[3] + r;
        }
      }
    }
    if (this.bounds) { x = Math.max(this.bounds[0] + r, Math.min(this.bounds[2] - r, x)); z = Math.max(this.bounds[1] + r, Math.min(this.bounds[3] - r, z)); }
    return [x, z];
  },
  snapCamera() { this._camPos(true); },
  _camPos(snap, dt = 0.016) {
    const p = G.player, k = this.camDist;
    this.camTarget.set(p.x, 0.8, p.z);
    const off = this.cur?.camOffset || [0, 16, 13];
    const want = new THREE.Vector3(p.x + off[0] * k, off[1] * k, p.z + off[2] * k);
    if (snap) this.camera.position.copy(want); else this.camera.position.lerp(want, Math.min(1, dt * 5));
    const look = this.camTarget.clone(); look.x = this.camera.position.x - off[0] * k;
    look.z = this.camera.position.z - off[2] * k;
    if (this.camShake > 0) { look.x += (Math.random() - 0.5) * this.camShake; look.y += (Math.random() - 0.5) * this.camShake; this.camShake *= 0.9; }
    this.camera.lookAt(look);
    if (this.quality === 'high') { this.sun.position.set(look.x - 10, 22, look.z + 12); this.sun.target.position.copy(look); }
  },
  frame(dt) {
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 2) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; bus.emit('fps', this.fps); }
    if (this.overlay) { const ov = this.overlay; ov.update?.(dt); this.renderer.render(ov.scene, ov.camera); return; }
    this.cur?.update?.(dt);
    this._camPos(false, dt);
    for (const z of this.zones) if (z.mesh) {
      const vis = z.visible ? z.visible() : true;
      z.mesh.visible = vis;
      if (vis) { z.mesh.material.opacity = 0.55 + Math.sin(performance.now() / 300) * 0.2; }
    }
    this.renderer.render(this.scene, this.camera);
  },
  // Dünya koordinatını ekran pikseline çevirir (balon yazılar için)
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, vis: v.z < 1 };
  },
};
