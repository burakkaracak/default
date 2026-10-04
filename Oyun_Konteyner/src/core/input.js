// Klavye (WASD/oklar, E/Boşluk) ve dokunmatik yüzer joystick.
export const input = {
  keys: new Set(),
  joy: { active: false, x: 0, y: 0, id: null, ox: 0, oy: 0 },
  actionQueued: false,
  enabled: true,
  get move() {
    let x = 0, z = 0;
    if (!this.enabled) return { x, z };
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (this.joy.active) { x += this.joy.x; z += this.joy.y; }
    const l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    return { x, z };
  },
  consumeAction() { const a = this.actionQueued; this.actionQueued = false; return a; },
  init(canvas) {
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      this.keys.add(e.code);
      if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !e.repeat) { this.actionQueued = true; if (e.code === 'Space') e.preventDefault(); }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    const base = document.createElement('div'); base.className = 'joy-base';
    const knob = document.createElement('div'); knob.className = 'joy-knob';
    base.appendChild(knob); document.body.appendChild(base);
    const R = 46;
    const show = (on) => { base.style.display = on ? 'block' : 'none'; };
    show(false);
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.joy.active) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.joy.active = true; this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY;
      this.joy.x = this.joy.y = 0;
      base.style.left = e.clientX - 60 + 'px'; base.style.top = e.clientY - 60 + 'px';
      knob.style.transform = 'translate(0px,0px)';
      show(true);
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      this.joy.x = dx / R; this.joy.y = dy / R;
      if (Math.hypot(this.joy.x, this.joy.y) < 0.15) this.joy.x = this.joy.y = 0;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.active = false; this.joy.x = this.joy.y = 0; this.joy.id = null; show(false);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  },
};
