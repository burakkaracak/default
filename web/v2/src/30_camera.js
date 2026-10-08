// Kamera: hedefi takip eden, 4 yöne dönen, yakınlaşan eğik kuşbakışı. Dokunma hareketleri burada yorumlanır.
const Cam = {
  target: V(0, 0, 2), yaw: 0, yawGoal: 0, dist: 24, distGoal: 24, pitch: 50,
  follow: null, floor: 0, joy: null, shake: 0,
  MinDist: 11, MaxDist: 42,

  get Forward() { const y = this.yaw * Mathf.Deg2Rad; return V(-Math.sin(y), 0, -Math.cos(y)); }, // kameranın baktığı yatay yön
  get Right() { const y = this.yaw * Mathf.Deg2Rad; return V(Math.cos(y), 0, -Math.sin(y)); },

  Rotate(dir) { this.yawGoal = Math.round(this.yawGoal / 90) * 90 + dir * 90; Sfx.Play('tap', 0.4); },
  Zoom(k) { this.distGoal = Mathf.Clamp(this.distGoal * k, this.MinDist, this.MaxDist); },
  ZoomToggle() { this.distGoal = this.distGoal > 20 ? 14 : 30; },
  Snap() { this.yaw = this.yawGoal; this.dist = this.distGoal; if (this.follow) this.target.copy(this.FollowPoint()); this.Apply(); },

  FollowPoint() {
    const p = this.follow.position.clone();
    const base = Hotel.FloorY(this.floor);
    p.y = base;
    // biraz önünü göster
    const f = this.Forward; p.x += f.x * 1.5; p.z += f.z * 1.5;
    const aspect = innerWidth / innerHeight;
    if (aspect < 1) { p.x += f.x * 2.5; p.z += f.z * 2.5; }
    return p;
  },

  Update(dt) {
    // yön ve uzaklık yumuşak
    this.yaw += Mathf.DeltaAngle(this.yaw, this.yawGoal) * Math.min(1, dt * 6);
    const aspect = innerWidth / innerHeight;
    const want = this.distGoal * (aspect < 1 ? Mathf.Lerp(1.55, 1, Mathf.InverseLerp(0.5, 1, aspect)) : 1);
    this.dist += (want - this.dist) * Math.min(1, dt * 5);
    if (this.follow) {
      const g = this.FollowPoint();
      this.target.lerp(g, Math.min(1, dt * 4));
    }
    this.Apply();
  },
  Apply() {
    const y = this.yaw * Mathf.Deg2Rad, p = this.pitch * Mathf.Deg2Rad;
    const off = V(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)).multiplyScalar(this.dist);
    const pos = Vec.add(this.target, off);
    if (this.shake > 0) { pos.x += (Math.random() - 0.5) * this.shake; pos.y += (Math.random() - 0.5) * this.shake; this.shake *= 0.9; }
    camera.position.copy(pos);
    camera.lookAt(this.target.x, this.target.y, this.target.z);
    Sun.target.copy(this.target);
  },

  // ---- dokunma ve fare ----
  Setup(el) {
    const P = Input.pointers;
    let pinch0 = 0, dist0 = 0, ang0 = 0, yaw0 = 0, twoFinger = false;
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
      try { window.focus(); el.focus({ preventScroll: true }); } catch (x) { }
      Sfx.Init(); Sfx.Resume();
      if (Decor.active && P.size === 0) { P.set(e.pointerId, { decor: true }); Decor.OnDown(e.clientX, e.clientY); if (e.pointerType !== 'mouse') e.preventDefault(); return; }
      P.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, btn: e.button });
      if (P.size === 2) { const [a, b] = [...P.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); pinch0 = this.distGoal; ang0 = Math.atan2(b.y - a.y, b.x - a.x); yaw0 = this.yawGoal; twoFinger = true; this.joy = null; }
      if (e.pointerType !== 'mouse') e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      const p = P.get(e.pointerId); if (!p) return;
      if (p.decor) { Decor.OnMove(e.clientX, e.clientY); return; }
      p.x = e.clientX; p.y = e.clientY;
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > 10) p.moved = true;
      if (P.size === 2) {
        const [a, b] = [...P.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.distGoal = Mathf.Clamp(pinch0 * dist0 / Math.max(10, d), this.MinDist, this.MaxDist);
        const ang = Math.atan2(b.y - a.y, b.x - a.x); this.yawGoal = yaw0 - (ang - ang0) * Mathf.Rad2Deg;
      } else if (P.size === 1 && p.btn === 2) { // sağ fare: döndür
        this.yawGoal -= (e.movementX || 0) * 0.3;
      } else if (P.size === 1 && p.moved) {
        // tek parmak sürükleme: sanal joystick (ekranda ok yönü, kameraya göre)
        const dx = p.x - p.x0, dy = p.y - p.y0, m = Math.min(1, Math.hypot(dx, dy) / (innerHeight * 0.09));
        const a = Math.atan2(dx, -dy);
        this.joy = { x: Math.sin(a) * m, y: Math.cos(a) * m, sx: p.x0, sy: p.y0, cx: p.x, cy: p.y };
      }
    });
    const up = e => {
      const p = P.get(e.pointerId); if (!p) return;
      P.delete(e.pointerId);
      if (p.decor) { Decor.OnUp(e.clientX, e.clientY); return; }
      if (P.size === 0) {
        this.joy = null;
        if (!p.moved && !twoFinger && performance.now() - p.t0 < 350 && p.btn === 0) for (const h of Input.tapHandlers) h(p.x, p.y);
        if (p.btn === 2) this.yawGoal = Math.round(this.yawGoal / 90) * 90;
        twoFinger = false;
      }
      if (P.size === 1) { twoFinger = true; this.yawGoal = Math.round(this.yawGoal / 90) * 90; }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => { this.Zoom(e.deltaY > 0 ? 1.12 : 0.9); e.preventDefault(); }, { passive: false });
    addEventListener('keydown', e => {
      Input.keys.add(e.code); Sfx.Init(); Sfx.Resume();
      if (e.code === 'KeyQ') this.Rotate(-1); if (e.code === 'KeyE') this.Rotate(1);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', e => Input.keys.delete(e.code));
    addEventListener('blur', () => { Input.keys.clear(); P.clear(); this.joy = null; });
    try { window.focus(); el.focus({ preventScroll: true }); } catch (x) { }
  },

  // Ekran noktasının y yüksekliğindeki düzleme izdüşümü
  ScreenToPlane(px, py, y) {
    const ndc = new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
    const o = rc.ray.origin, d = rc.ray.direction;
    if (Math.abs(d.y) < 1e-6) return null;
    const t = (y - o.y) / d.y; if (t < 0) return null;
    return V(o.x + d.x * t, y, o.z + d.z * t);
  },
};
function worldToScreen(p) {
  const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, z: v.z };
}
