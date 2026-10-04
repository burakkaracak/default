// Konteyner yükleme mini oyunu: kolileri 3B konteynere yerleştir. Hücre = 25 cm.
import * as THREE from 'three';
import { W } from '../locations/world3d.js';
import { mat, Parts, shade } from '../locations/builder.js';
import { h } from '../ui/dom.js';
import { input } from '../core/input.js';
import { G, family, color as colorOf } from '../core/state.js';
import { bus } from '../core/bus.js';
import CITIES from '../data/cities.json';

export const CELL = 25;
export function boxCells(fam) { const b = family(fam).box; return b.map((cm) => Math.ceil(cm / CELL - 0.05)); }
// Yönler: [uzunluk(x), derinlik(z), yükseklik(y)]
export function orientations(d) {
  const [l, w, hh] = d;
  const o = [[l, w, hh], [w, l, hh], [l, hh, w], [hh, l, w], [w, hh, l], [hh, w, l]];
  const seen = new Set(); return o.filter((x) => { const k = x.join(); if (seen.has(k)) return false; seen.add(k); return true; });
}

export class Packer {
  constructor(dims) { [this.L, this.Wd, this.H] = dims; this.hm = new Int16Array(this.L * this.Wd); this.placed = []; }
  base(x, z, a, b) { let m = 0; for (let i = x; i < x + a; i++) for (let j = z; j < z + b; j++) m = Math.max(m, this.hm[i * this.Wd + j]); return m; }
  support(x, z, a, b, base) { if (base === 0) return 1; let n = 0; for (let i = x; i < x + a; i++) for (let j = z; j < z + b; j++) if (this.hm[i * this.Wd + j] === base) n++; return n / (a * b); }
  check(x, z, o) {
    const [a, b, c] = o;
    if (x < 0 || z < 0 || x + a > this.L || z + b > this.Wd) return null;
    const base = this.base(x, z, a, b);
    if (base + c > this.H) return null;
    if (this.support(x, z, a, b, base) < 0.5) return null;
    return base;
  }
  place(box, x, z, o) {
    const base = this.check(x, z, o); if (base == null) return null;
    const [a, b, c] = o;
    for (let i = x; i < x + a; i++) for (let j = z; j < z + b; j++) this.hm[i * this.Wd + j] = base + c;
    const p = { box, x, y: base, z, o: o.slice() }; this.placed.push(p); return p;
  }
  undo() {
    const p = this.placed.pop(); if (!p) return null;
    this.hm.fill(0); const rest = this.placed; this.placed = [];
    for (const q of rest) this.place(q.box, q.x, q.z, q.o);
    return p;
  }
  best(box, oris) {
    let best = null, bs = 1e18;
    for (const o of oris) for (let x = 0; x + o[0] <= this.L; x++) for (let z = 0; z + o[1] <= this.Wd; z++) {
      const base = this.check(x, z, o); if (base == null) continue;
      const s = x * 10000 + base * 100 + z;
      if (s < bs) { bs = s; best = { x, z, o }; }
    }
    return best;
  }
  usedCells() { return this.placed.reduce((a, p) => a + p.o[0] * p.o[1] * p.o[2], 0); }
  fill() { return this.usedCells() / (this.L * this.Wd * this.H); }
}

// Siparişlerin kolileri: [{fam, color, order}]
export function boxesFor(orderIds) {
  const out = [];
  for (const id of orderIds) { const o = G.orders.find((x) => x.id === id); if (!o) continue; for (const l of o.lines) for (let i = 0; i < l.qty; i++) out.push({ fam: l.fam, color: l.color, order: id, d: boxCells(l.fam) }); }
  return out;
}
// Uzaktan yükleme (depocu/forklift): yönleri pek düşünmez
export function autoPack(contType, boxes, smart = false) {
  const pk = new Packer(CITIES.containers[contType].cells);
  const sorted = [...boxes].sort((a, b) => b.d[0] * b.d[1] * b.d[2] - a.d[0] * a.d[1] * a.d[2]);
  let left = 0;
  for (const b of sorted) {
    const oris = smart ? orientations(b.d) : [b.d, [b.d[1], b.d[0], b.d[2]]];
    const bp = pk.best(b, oris);
    if (bp) pk.place(b, bp.x, bp.z, bp.o); else left++;
  }
  return { fill: pk.fill(), left, packer: pk };
}
export function volumeM3(boxes) { return boxes.reduce((a, b) => { const f = family(b.fam).box; return a + f[0] * f[1] * f[2] / 1e6; }, 0); }

// ------------------------------------------------------------------
// Oynanabilir 3B ekran
export function playContainer({ contType, boxes, title, onDone }) {
  const dims = CITIES.containers[contType].cells;
  const pk = new Packer(dims);
  const S = 0.25; // hücre → metre
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#E9E4DA');
  scene.add(new THREE.HemisphereLight('#FFF8EC', '#A99F8C', 1.6));
  const sun = new THREE.DirectionalLight('#FFF1DC', 1.1); sun.position.set(-6, 14, 10); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  const [L, Wd, H] = dims; const Lm = L * S, Wm = Wd * S, Hm = H * S;
  // Konteyner gövdesi
  const p = new Parts(), col = contType === 'tir' ? '#D8D2C6' : '#3E6A7A';
  p.box(Lm + 0.2, 0.1, Wm + 0.2, '#5A4E3E', Lm / 2, -0.1, Wm / 2);
  p.box(Lm + 0.2, Hm + 0.1, 0.08, col, Lm / 2, -0.05, -0.04);
  p.box(0.08, Hm + 0.1, Wm + 0.2, shade(col, 0.85), -0.04, -0.05, Wm / 2);
  for (let i = 0; i < L; i += 2) p.box(0.03, Hm, 0.02, shade(col, 0.75), i * S, 0, 0.01);
  const shell = p.toGroup(); scene.add(shell);
  // Zemin ızgarası
  const gp = new Parts();
  gp.box(Lm, 0.004, Wm, '#D9D0BF', Lm / 2, 0, Wm / 2);
  for (let i = 0; i <= L; i += 4) gp.box(0.015, 0.006, Wm, '#B8AE9C', i * S, 0, Wm / 2);
  for (let j = 0; j <= Wd; j += 4) gp.box(Lm, 0.006, 0.015, '#B8AE9C', Lm / 2, 0, j * S);
  scene.add(gp.toGroup());
  // Ön ve tavan çerçeve çizgisi
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(Lm, Hm, Wm)), new THREE.LineBasicMaterial({ color: '#7E7446' }));
  edge.position.set(Lm / 2, Hm / 2, Wm / 2); scene.add(edge);
  // Kapılar (sağ uç)
  const doorM = mat(shade(col, 0.95));
  const doorA = new THREE.Mesh(new THREE.BoxGeometry(0.06, Hm, Wm / 2), doorM), doorB = doorA.clone();
  const pivA = new THREE.Group(), pivB = new THREE.Group(); pivA.position.set(Lm + 0.04, Hm / 2, 0); pivB.position.set(Lm + 0.04, Hm / 2, Wm);
  doorA.position.z = Wm / 4; doorB.position.z = -Wm / 4; pivA.add(doorA); pivB.add(doorB); scene.add(pivA, pivB);
  pivA.rotation.y = -Math.PI * 0.55; pivB.rotation.y = Math.PI * 0.55;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  const placedG = new THREE.Group(); scene.add(placedG);
  function boxMesh(b, o, ghost) {
    const g = new THREE.Group();
    const fc = family(b.fam).fabricless ? '#B08D63' : colorOf(b.color)?.hex || '#C9A97F';
    const m = new THREE.Mesh(boxGeo, ghost ? new THREE.MeshBasicMaterial({ color: '#7FB069', transparent: true, opacity: 0.45, depthWrite: false }) : mat('#CDAF84'));
    m.scale.set(o[0] * S - 0.02, o[2] * S - 0.02, o[1] * S - 0.02); g.add(m);
    if (!ghost) {
      const stripe = new THREE.Mesh(boxGeo, mat(fc)); stripe.scale.set(o[0] * S - 0.01, 0.06, Math.min(0.12, o[1] * S * 0.3)); stripe.position.y = o[2] * S / 2 - 0.05; g.add(stripe);
      const e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: '#8C7350' })); e.scale.copy(m.scale); g.add(e);
    } else g.userData.mat = m.material;
    return g;
  }
  const queue = [...boxes];
  // Aynı türleri gruplayarak sırala (büyükten küçüğe)
  queue.sort((a, b) => b.d[0] * b.d[1] * b.d[2] - a.d[0] * a.d[1] * a.d[2] || a.fam.localeCompare(b.fam));
  let ori = 0, gx = 0, gz = 0, ghost = null, curBox = null, oris = [];
  function setCur() {
    curBox = queue[0] || null;
    if (ghost) scene.remove(ghost); ghost = null;
    updHud();
    if (!curBox) return;
    oris = orientations(curBox.d); ori = Math.min(ori, oris.length - 1);
    ghost = boxMesh(curBox, oris[ori], true); scene.add(ghost);
    // Mümkünse geçerli bir yere taşı
    const bp = pk.best(curBox, [oris[ori]]); if (bp) { gx = bp.x; gz = bp.z; }
    updGhost();
  }
  function updGhost() {
    if (!ghost || !curBox) return;
    const o = oris[ori];
    gx = Math.max(0, Math.min(L - o[0], gx)); gz = Math.max(0, Math.min(Wd - o[1], gz));
    const base = pk.check(gx, gz, o);
    const y = base ?? pk.base(gx, gz, o[0], o[1]);
    ghost.position.set((gx + o[0] / 2) * S, (y + o[2] / 2) * S, (gz + o[1] / 2) * S);
    ghost.children[0].scale.set(o[0] * S - 0.02, o[2] * S - 0.02, o[1] * S - 0.02);
    ghost.userData.mat.color.set(base == null ? '#D9534F' : '#7FB069');
    updHud();
  }
  function rotate(tip) {
    if (!curBox) return;
    if (tip) ori = (ori + 1) % oris.length;
    else { const o = oris[ori]; const t = oris.findIndex((x) => x[0] === o[1] && x[1] === o[0] && x[2] === o[2]); ori = t >= 0 ? t : (ori + 1) % oris.length; }
    updGhost(); bus.emit('sfx', 'click');
  }
  function addMesh(pl) {
    const m = boxMesh(pl.box, pl.o, false);
    m.position.set((pl.x + pl.o[0] / 2) * S, (pl.y + pl.o[2] / 2) * S, (pl.z + pl.o[1] / 2) * S);
    m.userData.pl = pl; placedG.add(m);
    m.scale.setScalar(0.6); m.userData.pop = 0;
  }
  function place() {
    if (!curBox) return;
    const pl = pk.place(curBox, gx, gz, oris[ori]);
    if (!pl) { bus.emit('sfx', 'fail'); flash('Buraya sığmıyor'); return; }
    queue.shift(); addMesh(pl); bus.emit('sfx', 'thud'); setCur();
  }
  function undo() {
    const p0 = pk.undo(); if (!p0) return;
    queue.unshift(p0.box); const last = placedG.children[placedG.children.length - 1]; if (last) placedG.remove(last);
    setCur(); bus.emit('sfx', 'click');
  }
  function autoRest() {
    let n = 0;
    while (queue.length) {
      const b = queue[0]; const os = [b.d, [b.d[1], b.d[0], b.d[2]]];
      const bp = pk.best(b, os); if (!bp) break;
      const pl = pk.place(b, bp.x, bp.z, bp.o); queue.shift(); addMesh(pl); n++;
    }
    setCur(); bus.emit('sfx', 'thud');
    if (queue.length) flash(queue.length + ' koli sığmadı. Geri al ile yön değiştirmeyi dene.');
  }
  function clearAll() { while (pk.placed.length) undo(); }

  // ---- Arayüz
  input.enabled = false; document.body.classList.add('mg-on');
  const ui = h('div', { class: 'mg' });
  const top = h('div', { class: 'mgtop' });
  const info = h('div', { class: 'card', style: { flex: '1', minWidth: '200px' } });
  const exit = h('button', { class: 'btn ghost', onclick: () => finish(false) }, 'Vazgeç');
  top.append(info, exit);
  const bot = h('div', { class: 'mgbot' });
  const B = (lbl, fn, cls = 'btn ghost') => h('button', { class: cls, onclick: fn }, lbl);
  bot.append(
    B('◀', () => { gx -= 1; updGhost(); }), B('▲', () => { gz -= 1; updGhost(); }), B('▼', () => { gz += 1; updGhost(); }), B('▶', () => { gx += 1; updGhost(); }),
    B('⟳ Döndür', () => rotate(false)), B('⤒ Yan yatır', () => rotate(true)),
    B('Yerleştir', place, 'btn gold'), B('Geri al', undo), B('Kalanı otomatik', autoRest), B('Boşalt', clearAll),
    B('Kapıları kapat ✓', () => finish(true), 'btn'),
  );
  const msg = h('div', { class: 'hint', style: { bottom: 'calc(120px + var(--safe-b))', display: 'none' } });
  ui.append(top, bot, msg);
  document.body.append(ui);
  let msgT = 0;
  function flash(t) { msg.textContent = t; msg.style.display = ''; msgT = 2.5; }
  function updHud() {
    const f = pk.fill();
    const cur = curBox ? `${family(curBox.fam).name} kolisi (${curBox.d.map((x) => x * CELL).join('×')} cm)` : 'Tüm koliler yerleşti';
    info.innerHTML = '';
    info.append(h('div', { style: { fontWeight: 700 } }, title || CITIES.containers[contType].name),
      h('div', { class: 'muted' }, `Doluluk: `, h('b', { style: { color: f > 0.8 ? '#5E7F55' : '#2B2D2F' } }, '%' + Math.round(f * 100)), ` · Kalan koli: ${queue.length} · Sıradaki: ${cur}`));
  }
  // İşaretçi ile konumlama
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  let downAt = null;
  const cv = W.renderer.domElement;
  const toCell = (e) => {
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const o = oris[ori] || [1, 1, 1];
    return [Math.round(hit.x / S - o[0] / 2), Math.round(hit.z / S - o[1] / 2)];
  };
  const pd = (e) => { downAt = [e.clientX, e.clientY]; const c = toCell(e); if (c) { gx = c[0]; gz = c[1]; updGhost(); } };
  const pm = (e) => { if (!downAt) return; const c = toCell(e); if (c) { gx = c[0]; gz = c[1]; updGhost(); } };
  const pu = (e) => { if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null; if (moved < 8 && e.pointerType !== 'mouse') {} };
  cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu);
  let lastTap = 0; const tapPlace = (e) => { const t = performance.now(); if (t - lastTap < 320) place(); lastTap = t; };
  cv.addEventListener('pointerup', tapPlace);
  const key = (e) => {
    const k = e.code;
    if (k === 'ArrowLeft' || k === 'KeyA') { gx--; updGhost(); } else if (k === 'ArrowRight' || k === 'KeyD') { gx++; updGhost(); }
    else if (k === 'ArrowUp' || k === 'KeyW') { gz--; updGhost(); } else if (k === 'ArrowDown' || k === 'KeyS') { gz++; updGhost(); }
    else if (k === 'KeyR') rotate(false); else if (k === 'KeyT') rotate(true);
    else if (k === 'Space' || k === 'Enter') { e.preventDefault(); place(); } else if (k === 'Backspace' || k === 'KeyZ') undo();
    else return; e.stopPropagation();
  };
  addEventListener('keydown', key, true);

  let closing = 0, done = false, camX = Lm / 2;
  const portrait = () => innerWidth < innerHeight;
  W.overlay = {
    scene, camera: cam,
    resize(w, hh) { cam.aspect = w / hh; cam.updateProjectionMatrix(); },
    update(dt) {
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) msg.style.display = 'none'; }
      const gxm = ghost ? ghost.position.x : Lm / 2;
      const span = Math.min(Lm + 0.8, portrait() ? 4.2 : 9.5);
      const want = Lm + 0.8 <= span ? Lm / 2 : Math.max(span / 2 - 0.4, Math.min(Lm - span / 2 + 0.4, gxm));
      camX += (want - camX) * Math.min(1, dt * 4);
      const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
      const d = Math.max(4.5, (span / 2) / Math.tan(hf) + 1.5);
      cam.position.set(camX + d * 0.12, 0.6 + d * 0.78, Wm / 2 + d * 0.62);
      cam.lookAt(camX, 0.5, Wm / 2 - 0.1);
      for (const m of placedG.children) if (m.scale.x < 1) m.scale.setScalar(Math.min(1, m.scale.x + dt * 5));
      if (closing > 0) {
        closing += dt;
        const t = Math.min(1, closing / 0.9);
        pivA.rotation.y = -Math.PI * 0.55 * (1 - t); pivB.rotation.y = Math.PI * 0.55 * (1 - t);
        if (closing > 2.2) {
          const k = (closing - 2.2) * 6; shell.position.x = k * k; placedG.position.x = k * k; pivA.position.x = Lm + 0.04 + k * k; pivB.position.x = Lm + 0.04 + k * k; edge.position.x = Lm / 2 + k * k;
        }
        if (closing > 3.4 && !done) { done = true; cleanup(); onDone?.({ ok: true, fill: pk.fill(), left: queue.length }); }
      }
    },
  };
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  setCur(); updHud();

  function cleanup() {
    ui.remove(); cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointermove', pm); cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointerup', tapPlace);
    removeEventListener('keydown', key, true); W.overlay = null; input.enabled = true; document.body.classList.remove('mg-on');
  }
  function finish(ok) {
    if (!ok) { cleanup(); onDone?.({ ok: false }); return; }
    if (queue.length) { flash(`Daha ${queue.length} koli var. Hepsi yerleşmeden kapatamazsın (Kalanı otomatik dene ya da büyük konteyner seç).`); bus.emit('sfx', 'fail'); return; }
    if (ghost) scene.remove(ghost);
    bot.style.display = 'none'; exit.style.display = 'none';
    closing = 0.001; bus.emit('sfx', 'whoosh'); setTimeout(() => { bus.emit('sfx', 'sparkle'); bus.emit('goldGlow'); }, 900); setTimeout(() => bus.emit('sfx', 'horn'), 2100);
  }
}
