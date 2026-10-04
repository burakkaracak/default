// Oyuncu (Burak): hareket, çarpışma, taşınan koliler, etkileşim alanları.
import * as THREE from 'three';
import { makePerson } from './model.js';
import { W } from '../locations/world3d.js';
import { input } from '../core/input.js';
import { G, B, CH, family, color as colorOf } from '../core/state.js';
import { bus } from '../core/bus.js';
import { mat } from '../locations/builder.js';
import { time } from '../core/time.js';

export const player = {
  m: null, inside: new Set(), nearAction: null, stayT: 0,
  init() {
    const look = CH.list.find((c) => c.player).look;
    this.m = makePerson(look, { shadow: document.body.dataset.q === 'high' });
    W.scene.add(this.m.root);
    bus.on('locationEntered', () => { this.inside.clear(); this.nearAction = null; bus.emit('nearAction', null); this.place(); });
    bus.on('carry', (kind) => { this.refreshCarry(); bus.emit('sfx', kind === 'drop' ? 'drop' : 'pickup'); });
  },
  place() { this.m.root.position.set(G.player.x, 0, G.player.z); this.m.root.rotation.y = G.player.rot || 0; this.refreshCarry(); },
  refreshCarry() {
    const c = this.m.carry; while (c.children.length) c.remove(c.children[0]);
    let i = 0;
    for (const e of G.player.carry) {
      const wo = G.factory.wos[e.wo]; const f = wo && family(wo.fam);
      const col = f?.fabricless ? '#B08D63' : colorOf(wo?.color)?.hex || '#C9A97F';
      for (let k = 0; k < e.n; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.36), mat(col)); b.position.y = i * 0.27; c.add(b); i++; }
    }
  },
  update(dt) {
    if (!this.m) return;
    const mv = input.move;
    const sp = B.playerSpeed * (G.flags.fastWalk ? 1.15 : 1);
    let moving = 0;
    if (mv.x || mv.z) {
      let x = G.player.x + mv.x * sp * dt, z = G.player.z + mv.z * sp * dt;
      [x, z] = W.collide(x, z, 0.38);
      G.player.x = x; G.player.z = z;
      const tr = Math.atan2(mv.x, mv.z);
      let d = tr - G.player.rot; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      G.player.rot += d * Math.min(1, dt * 14);
      moving = Math.min(1, Math.hypot(mv.x, mv.z));
    }
    this.m.root.position.set(G.player.x, 0, G.player.z);
    this.m.root.rotation.y = G.player.rot;
    this.m.animate(dt, moving);
    // Alanlar
    let best = null, bd = 1e9;
    this.stayT += dt;
    for (const z of W.zones) {
      if (z.visible && !z.visible()) { if (this.inside.has(z)) { this.inside.delete(z); z.exit?.(); } continue; }
      const d = Math.hypot(G.player.x - z.x, G.player.z - z.z);
      const inn = d < z.r;
      if (inn && !this.inside.has(z)) { this.inside.add(z); z.enter?.(); if (z.kind === 'auto') z.stay?.(); }
      else if (!inn && this.inside.has(z)) { this.inside.delete(z); z.exit?.(); }
      if (inn && z.kind === 'auto' && this.stayT > 0.35 && !time.paused) z.stay?.();
      if (inn && z.action && d < bd) { bd = d; best = z; }
    }
    if (this.stayT > 0.35) this.stayT = 0;
    if (best !== this.nearAction) { this.nearAction = best; bus.emit('nearAction', best); }
    if (input.consumeAction() && this.nearAction) this.nearAction.action();
  },
};
