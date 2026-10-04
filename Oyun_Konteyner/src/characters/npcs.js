// Kadronun sahnedeki hali: rutinlerine göre doğru lokasyon/katta durur, saat değişince yürür.
import * as THREE from 'three';
import { makePerson } from './model.js';
import { W } from '../locations/world3d.js';
import { G, CH, charDef } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { pick, shuffle } from '../core/util.js';
import L from '../data/locations.json';

const SP = CH.spots;
const carPos = (loc) => loc === 'store' ? L.store.car : loc === 'factory' ? L.factory.car : L.branches[loc]?.car || [0, 0];

// Bünyamin'in günlük gezisi
export function planBunyamin() {
  const locs = ['store', 'factory', 'nisantasi', 'atasehir'];
  const plan = []; let h = 8 + Math.random() * 1.5; let last = null;
  while (h < 19) {
    let l = pick(locs); if (l === last) l = pick(locs.filter((x) => x !== last));
    plan.push([+h.toFixed(2), l]); last = l;
    h += 2 + Math.random() * 2.5;
  }
  G.bunPlan = plan;
}
// Bir karakterin şu anki yeri: {loc, floor, pos, face, travelling}
export function whereIs(id, hour = G.min / 60) {
  const d = charDef(id);
  if (!d || d.player) return null;
  if (G.chars[id]?.away) return { loc: G.chars[id].away, travelling: false, pos: [0, 0], floor: 0 };
  if (d.home === 'roam') {
    if (!G.bunPlan) planBunyamin();
    let cur = G.bunPlan[0];
    for (const e of G.bunPlan) if (e[0] <= hour) cur = e;
    const idx = G.bunPlan.indexOf(cur);
    const nxt = G.bunPlan[idx + 1];
    // Bir sonraki yere geçmeden 40 dk önce yola çıkar
    if (nxt && hour > nxt[0] - 0.6 && hour < nxt[0]) return { loc: null, travelling: true, to: nxt[1] };
    if (hour < G.bunPlan[0][0]) return { loc: null, travelling: true, to: G.bunPlan[0][1] };
    const sp = SP.roam[cur[1]] || SP[cur[1]]?.roam;
    return { loc: cur[1], floor: sp?.floor ?? 0, pos: sp.pos, face: sp.face };
  }
  let cur = d.routine[0];
  for (const r of d.routine) if (r[0] <= hour) cur = r;
  const sp = SP[cur[1]][cur[2]];
  return { loc: cur[1], floor: sp.floor ?? 0, pos: sp.pos, face: sp.face, spot: cur[2] };
}
export function locName(loc) { return L.list.find((l) => l.id === loc)?.short || loc; }

export const npcs = {
  list: [], // {id, m, zone, tgt, leaving}
  bubbleT: 8,
  init() {
    bus.on('locationEntered', () => this.sync(true));
    bus.on('hour', () => this.sync(false));
    bus.on('tick', () => { if (Math.random() < 0.02) this.sync(false); });
    bus.on('dayStart', () => planBunyamin());
  },
  clear() { for (const n of this.list) { W.root?.remove(n.m.root); W.removeZone(n.zone); n.tag?.remove(); } this.list = []; document.querySelectorAll('.npc-tag,.bubble').forEach((e) => e.remove()); },
  sync(fresh) {
    if (!W.cur) return;
    if (fresh) this.clear();
    const here = G.player.loc, fl = G.player.floor;
    for (const c of CH.list) {
      if (c.player) continue;
      const w = whereIs(c.id);
      const present = w && !w.travelling && w.loc === here && (here !== 'store' || w.floor === fl);
      let n = this.list.find((x) => x.id === c.id);
      if (present && !n) {
        const m = makePerson(c.look, { shadow: document.body.dataset.q === 'high' });
        const arriving = !fresh;
        const start = arriving ? (here === 'store' ? L.store.elevator.slice() : carPos(here)) : w.pos;
        if (arriving && here === 'store') start[1] += 1;
        m.root.position.set(start[0], 0, start[1]); m.root.rotation.y = w.face || 0;
        W.root.add(m.root);
        n = { id: c.id, m, tgt: w.pos, face: w.face || 0, leaving: false };
        n.zone = W.addZone({ id: 'npc_' + c.id, kind: 'action', x: start[0], z: start[1], r: 1.3, noSign: true, hidden: true, action: () => bus.emit('ui', 'talk', c.id), actionLabel: 'Konuş: ' + c.name.split(' ')[0] });
        const tag = (n.tag = document.createElement('div')); tag.className = 'npc-tag'; tag.textContent = c.name.split(' ')[0];
        document.getElementById('tags').appendChild(tag);
        this.list.push(n);
      } else if (present && n) { n.tgt = w.pos; n.face = w.face || 0; n.leaving = false; }
      else if (!present && n && !n.leaving) {
        n.leaving = true; n.tgt = here === 'store' ? [L.store.elevator[0], L.store.elevator[1] + 0.6] : carPos(here);
      }
    }
  },
  update(dt) {
    const t = performance.now() / 1000;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const n = this.list[i], r = n.m.root;
      const dx = n.tgt[0] - r.position.x, dz = n.tgt[1] - r.position.z, d = Math.hypot(dx, dz);
      if (d > 0.08) {
        const s = Math.min(d, dt * 2.8); r.position.x += dx / d * s; r.position.z += dz / d * s;
        r.rotation.y = Math.atan2(dx, dz); n.m.animate(dt, 1);
      } else {
        if (n.leaving) { W.root.remove(r); W.removeZone(n.zone); n.tag.remove(); this.list.splice(i, 1); continue; }
        let df = n.face - r.rotation.y; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
        r.rotation.y += df * Math.min(1, dt * 5);
        n.m.animate(dt, 0);
        if (n.id === 'harun' && Math.sin(t * 0.7) > 0.3) n.m.armR.rotation.x = -2.2; // telefonda
      }
      n.zone.x = r.position.x; n.zone.z = r.position.z;
      const s = W.toScreen(r.position.x, 2.2, r.position.z);
      n.tag.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
      n.tag.style.display = s.vis ? '' : 'none';
    }
    // Ara sıra kısa iç sesler
    this.bubbleT -= dt;
    if (this.bubbleT < 0 && this.list.length && !time.paused) {
      this.bubbleT = 14 + Math.random() * 12;
      const n = pick(this.list); const c = charDef(n.id); const tr = G.chars[n.id].trust;
      const pool = c.lines[tr < 35 ? 'dusuk' : tr > 70 ? 'yuksek' : 'orta'];
      bus.emit('bubble', n, pick(pool));
    }
  },
};
