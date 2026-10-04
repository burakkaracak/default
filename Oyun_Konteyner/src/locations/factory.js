// Fabrika sahnesi (Tuzla): üretim holü, istasyonlar, ofisler, sevkiyat rampası, depo ve kilitli alanlar.
import * as THREE from 'three';
import { Parts, models, mat, textSprite, shade, productModel } from './builder.js';
import { G, family, color as colorOf } from '../core/state.js';
import { bus } from '../core/bus.js';
import L from '../data/locations.json';
import * as PR from '../factory/production.js';
import { makePerson } from '../characters/model.js';
import CH from '../data/characters.json';

const F = L.factory;
const WALL = '#E4DED3', WALL2 = '#D3CCBF', FLOOR = '#CFCAC0';

function buildStatic(shadow) {
  const p = new Parts();
  // Zemin
  p.box(42, 0.1, 26, FLOOR, 0, -0.1, 0);
  p.box(42, 0.1, 8, '#DDD6CA', 0, -0.1, -16); // ofis koridoru
  // Sarı yürüme şeritleri
  for (const z of [-1.2, 6.8]) p.box(34, 0.012, 0.12, '#E2B33C', 0, 0.0, z);
  for (const x of [-18.5, 14.2]) p.box(0.12, 0.012, 8, '#E2B33C', x, 0, 2.8);
  // Dış duvarlar
  p.box(0.4, 1.6, 34, WALL, -21, 0, -3); p.box(0.4, 1.6, 34, WALL, 21, 0, -3);
  p.box(0.4, 4, 8, WALL, -21, 0, -16); p.box(0.4, 4, 8, WALL, 21, 0, -16);
  p.box(42.4, 4, 0.4, WALL2, 0, 0, -20);
  // Ön duvar (alçak, kamera görsün)
  p.box(14, 0.6, 0.3, WALL, -14, 0, 13); p.box(14, 0.6, 0.3, WALL, 6, 0, 13);
  // Ofis bölmeleri (kuzey)
  p.box(6.6, 3, 0.25, WALL, -17.8, 0, -12); p.box(5.2, 3, 0.25, WALL, -10.6, 0, -12); p.box(5.8, 3, 0.25, WALL, -3.1, 0, -12);
  p.box(15.4, 0.9, 0.25, WALL, 13.3, 0, -12); p.box(15.4, 0.06, 0.25, '#9C905C', 13.3, 2.95, -12);
  p.box(15.4, 2.05, 0.1, '#BFD3DE', 13.3, 0.9, -12, 0, { glass: true, opacity: 0.25 });
  for (const x of [-14, -7, 0.6]) p.box(0.25, 3, 8, WALL2, x, 0, -16);
  p.box(0.25, 3, 8, '#BFD3DE', 5.6, 0, -16, 0, { glass: true, opacity: 0.3 });
  // Ofis eşyaları
  for (const [id, pos] of Object.entries(F.offices)) {
    const [x, z] = pos;
    p.add(models.desk(id === 'serkan' ? '#C9CED3' : '#D8CDB8'), x, 0, z - 1.3, Math.PI);
    p.add(models.officeChair(), x, 0, z - 0.4);
    p.add(models.plant(0.9), x + 2.2, 0, z - 2.6);
    p.add(models.shelf(1.4), x - 1.8, 0, z - 3.4);
    p.box(1.8, 0.02, 1.4, id === 'semanur' ? '#C9C2D6' : '#D6C8B0', x, 0.0, z + 0.4);
  }
  // Semanur ERP: iki ekran
  p.box(0.5, 0.32, 0.03, '#1E1F22', -9.2, 0.84, -16.1); p.box(0.46, 0.27, 0.01, '#6C8FA8', -9.2, 0.865, -16.08, 0, { emissive: true });
  // İstasyon makineleri ve tepsiler
  for (const s of F.stations) {
    const [x, z] = s.pos;
    p.add(models.machine(s.id, s.color), x, 0, z);
    p.box(1.3, 0.06, 1.0, '#B79B72', x - 2.1, 0.0, z + 0.4); // giriş paleti
    p.box(1.3, 0.06, 1.0, '#9C905C', x + 2.1, 0.0, z + 0.4); // çıkış paleti
    p.box(5.8, 0.012, 3.6, shade(s.color, 1.25), x, 0.001, z + 0.4);
  }
  // Malzeme yığınları istasyonların yanında
  p.add(models.planks(), -17.4, 0, -7.5); p.add(models.planks(), -16, 0, -7.6);
  p.add(models.metalBars(), -8.6, 0, -7.6);
  p.add(models.foam(), 4.6, 0, -7.6);
  p.add(models.fabricRolls(['#E9E0CF', '#CDBB9C', '#7D8A5C', '#33415E']), 12.6, 0, -7.4);
  p.add(models.cans(), 12.6, 0, 5.8);
  // Hammadde deposu rafları
  for (let i = 0; i < 4; i++) {
    const x = -2 + i * 2.2;
    p.box(2, 0.06, 1, '#8C9096', x, 0.0, 11.6); p.box(2, 0.06, 1, '#8C9096', x, 1.2, 11.6); p.box(2, 0.06, 1, '#8C9096', x, 2.4, 11.6);
    p.box(0.06, 2.5, 0.06, '#5F6368', x - 1, 0, 11.1); p.box(0.06, 2.5, 0.06, '#5F6368', x + 1, 0, 11.1); p.box(0.06, 2.5, 0.06, '#5F6368', x - 1, 0, 12.1); p.box(0.06, 2.5, 0.06, '#5F6368', x + 1, 0, 12.1);
  }
  p.add(models.planks(), -2, 0.06, 11.6); p.add(models.foam(), 0.2, 0.06, 11.6); p.add(models.fabricRolls(['#E9E0CF', '#B86A4B', '#4A4D52']), 2.4, 0.06, 11.6, Math.PI / 2); p.add(models.cans(), 4.6, 0.06, 11.6);
  p.add(models.metalBars(), -2, 1.26, 11.6); p.add(models.planks(), 2.4, 1.26, 11.6); p.add(models.foam(), 0.2, 1.26, 11.6);
  // Sevkiyat rampası: konteyner + tır
  p.box(6.8, 0.3, 4.4, '#B8B1A4', -17.2, 0, 4.2);
  p.add(models.container('#3E6A7A', 6), -17.4, 0.3, 4.2, Math.PI);
  p.add(models.forklift(), -12.4, 0, 9.8, Math.PI * 0.75);
  // Pano
  p.box(2.4, 1.5, 0.12, '#2B2D2F', F.board[0], 0.7, F.board[1] + 1.4); p.box(2.2, 1.3, 0.02, '#F4EFE6', F.board[0], 0.8, F.board[1] + 1.47);
  for (let i = 0; i < 4; i++) p.box(1.6, 0.1, 0.01, i % 2 ? '#9C905C' : '#7C9AA8', F.board[0], 1.0 + i * 0.25, F.board[1] + 1.49);
  // Dış alan: otopark
  p.box(16, 0.08, 8, '#8E8C88', 12, -0.12, 17);
  p.add(models.car('#2F3540'), F.car[0] + 1.5, 0, F.car[1] + 4.5, Math.PI / 2);
  // Bitkiler
  for (const [x, z] of [[-19.6, -10.6], [19.6, -10.6], [19.6, 11.6], [-19.6, 11.6]]) p.add(models.tallPlant(), x, 0, z);
  return p.toGroup(shadow);
}

function buildExpansions(group) {
  for (const e of F.expansions) {
    const [x1, z1, x2, z2] = e.area; const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, w = x2 - x1, d = z2 - z1;
    const p = new Parts();
    const open = G.factory.areas[e.id];
    p.box(w, 0.08, d, open ? '#D6D0C5' : '#BDB7AC', cx, -0.08, cz);
    if (!open) {
      for (let i = 0; i <= w; i += 2) p.box(0.1, 1.0, 0.1, '#E2B33C', x1 + i, 0, z1);
      p.box(w, 0.08, 0.1, '#E2B33C', cx, 0.95, z1);
      p.add(models.pallet(), cx - 2, 0, cz); p.add(models.boxStack(3, '#BDA57D'), cx + 1.5, 0, cz + 1);
    } else {
      if (e.id === 'ekhol') { p.add(models.machine('doseme'), cx - 2, 0, cz - 4); p.add(models.machine('kumas'), cx + 2.5, 0, cz + 3); p.add(models.foam(), cx + 3.5, 0, cz - 6); }
      if (e.id === 'depo') { for (let i = 0; i < 5; i++) p.add(models.planks(), x1 + 2 + i * 2.4, 0, cz); }
      if (e.id === 'studyo') { p.add(models.desk('#E9E0CF'), cx - 2, 0, cz - 3); p.add(models.desk('#E9E0CF'), cx + 2, 0, cz - 3); p.add(models.sofa('#CDBB9C'), cx, 0, cz + 3); p.add(models.shelf(), cx + 4, 0, cz - 5.5); p.add(models.rug(4, 3, '#E6DCCB'), cx, 0, cz + 2.6); p.add(models.tallPlant(), cx - 4.5, 0, cz + 4); }
      if (e.id === 'ikincikat') { p.box(w, 0.25, d, '#C2BBAF', cx, 3, cz); for (const [a, b] of [[x1 + 0.3, z1 + 0.3], [x2 - 0.3, z1 + 0.3], [x1 + 0.3, z2 - 0.3], [x2 - 0.3, z2 - 0.3]]) p.box(0.3, 3, 0.3, '#8C9096', a, 0, b); p.add(models.machine('paket'), cx, 0, cz); }
    }
    // Duvar açıklığı (açılınca)
    const g = p.toGroup(); group.add(g);
    const sign = textSprite((open ? '' : '🔒 ') + e.name, { h: 0.5, bg: open ? 'rgba(156,144,92,0.9)' : 'rgba(43,45,47,0.82)' });
    sign.position.set(cx, 2.8, cz); group.add(sign);
  }
}

// Dinamik görseller: tepsilerdeki koliler, ilerleme çubukları, çalışanlar
function makeStationVis(s, group) {
  const [x, z] = s.pos;
  const v = { inBoxes: [], outBoxes: [], bar: null, workers: [], spark: null };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), mat('#2B2D2F'));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), mat('#9C905C', { emissive: true }));
  bg.position.set(x, 2.15, z + 0.4); fg.position.set(x, 2.15, z + 0.41); group.add(bg, fg); v.bar = fg; v.barBg = bg;
  fg.geometry.translate(0.8, 0, 0); fg.position.x = x - 0.8;
  const geo = new THREE.BoxGeometry(0.5, 0.32, 0.4);
  for (let i = 0; i < 9; i++) {
    const a = new THREE.Mesh(geo, mat('#C9A97F')); a.position.set(x - 2.4 + (i % 3) * 0.55, 0.22 + Math.floor(i / 3) * 0.34, z + 0.4); group.add(a); v.inBoxes.push(a);
    const b = new THREE.Mesh(geo, mat('#C9A97F')); b.position.set(x + 1.6 + (i % 3) * 0.5, 0.22 + Math.floor(i / 3) * 0.34, z + 0.4); group.add(b); v.outBoxes.push(b);
  }
  const lbl = textSprite(s.name, { h: 0.4 }); lbl.position.set(x, 2.65, z + 0.4); group.add(lbl);
  v.block = textSprite('Malzeme yok!', { h: 0.36, bg: 'rgba(184,106,75,0.95)' }); v.block.position.set(x, 3.15, z + 0.4); group.add(v.block); v.block.visible = false;
  v.idle = textSprite('Usta yok · yardım et', { h: 0.32, bg: 'rgba(124,154,168,0.95)' }); v.idle.position.set(x, 3.15, z + 0.4); group.add(v.idle); v.idle.visible = false;
  return v;
}

function unitColor(woId) {
  const wo = G.factory.wos[woId]; if (!wo) return '#C9A97F';
  const f = family(wo.fam); if (f?.fabricless) return '#B08D63';
  return colorOf(wo.color)?.hex || '#C9A97F';
}

export const factoryLoc = {
  id: 'factory', camOffset: [0, 21, 17],
  cache: null,
  invalidate() { this.cache = null; },
  build() {
    const group = new THREE.Group();
    const hi = document.body.dataset.q === 'high';
    group.add(buildStatic(hi));
    buildExpansions(group);
    const colliders = [
      [-21.5, -20.5, -20.6, 14], [20.6, -20.5, 21.5, 14], [-21.5, -20.5, 21.5, -19.6],
      [-21, 12.85, -7, 13.2], [-1, 12.85, 13, 13.2],
      [-21.1, -12.15, -14.5, -11.85], [-13.2, -12.15, -8, -11.85], [-6, -12.15, -0.2, -11.85], [5.6, -12.15, 21, -11.85],
      [-14.15, -20, -13.85, -12], [-7.15, -20, -6.85, -12], [0.45, -20, 0.75, -12], [5.45, -20, 5.75, -12],
      [-20.6, 1.9, -13.8, 6.5],
      [-3.1, 11, 5.7, 12.3],
    ];
    for (const s of F.stations) { const [x, z] = s.pos; colliders.push([x - 1.1, z - 1.0, x + 1.1, z + 0.55]); }
    for (const [, [x, z]] of Object.entries(F.offices)) colliders.push([x - 0.85, z - 1.75, x + 0.85, z - 0.95]);
    // Kilitli alanlara geçiş yok (açılınca sınırlar genişler)
    const bx1 = G.factory.areas.studyo || G.factory.areas.ikincikat ? -33 : -21, bx2 = G.factory.areas.ekhol ? 33 : 21;
    if (bx1 < -21) { colliders.splice(0, 1, [-21.5, -20.5, -20.6, -12.5]); }
    if (bx2 > 21) { colliders.splice(1, 1, [20.6, -20.5, 21.5, -12.5]); }
    const zones = [];
    for (const s of F.stations) {
      const [x, z] = s.pos;
      zones.push({ id: 'st_' + s.id, kind: 'auto', x, z: z + 1.65, r: 1.25, noSign: true, station: s.id,
        enter: () => { PR.runtime.playerStation = s.id; },
        stay: () => { const ch = PR.playerAtStation(s.id); if (ch) bus.emit('carry', ch); },
        exit: () => { if (PR.runtime.playerStation === s.id) PR.runtime.playerStation = null; },
        action: () => bus.emit('ui', 'station', s.id), actionLabel: s.name });
    }
    zones.push({ id: 'dock', kind: 'auto', x: -13.2, z: 4.2, r: 1.5, label: 'Sevkiyat Alanı', color: '#9C905C',
      stay: () => { const ch = PR.playerAtStation('dock'); if (ch) bus.emit('carry', ch); },
      action: () => bus.emit('ui', 'shipping'), actionLabel: 'Sevkiyat / Konteyner' });
    zones.push({ id: 'depot', kind: 'action', x: F.depot[0] + 1, z: F.depot[1] - 0.6, r: 1.3, label: 'Hammadde Deposu', action: () => bus.emit('ui', 'materials'), actionLabel: 'Depoyu incele' });
    zones.push({ id: 'board', kind: 'action', x: F.board[0], z: F.board[1], r: 1.2, label: 'Sipariş Panosu', action: () => bus.emit('ui', 'verifyBoard'), actionLabel: 'Siparişleri gözünle kontrol et' });
    zones.push({ id: 'car', kind: 'action', x: F.car[0], z: F.car[1], r: 1.3, label: 'Araç', action: () => bus.emit('ui', 'travel'), actionLabel: 'Araçla git' });
    zones.push({ id: 'hire', kind: 'action', x: 9.2, z: -10.2, r: 1.0, label: 'İK / Kadro', action: () => bus.emit('ui', 'staff'), actionLabel: 'Çalışanlar ve işe alım' });
    for (const e of F.expansions) {
      if (G.factory.areas[e.id]) {
        if (e.id === 'studyo') zones.push({ id: 'studio', kind: 'action', x: (e.area[0] + e.area[2]) / 2, z: (e.area[1] + e.area[3]) / 2 + 1, r: 1.3, label: 'Tasarım Stüdyosu', action: () => bus.emit('ui', 'studio'), actionLabel: 'Koleksiyon araştırması' });
        continue;
      }
      const cx = e.id === 'ekhol' ? 19.4 : -19.4, cz = (e.area[1] + e.area[3]) / 2;
      zones.push({ id: 'exp_' + e.id, kind: 'action', x: cx, z: Math.max(-10, Math.min(10, cz)), r: 1.0, label: '🔒 ' + e.name, color: '#B86A4B', action: () => bus.emit('ui', 'expansion', e.id), actionLabel: e.name + ' alanını aç' });
    }
    // Dinamik
    const dyn = new THREE.Group(); group.add(dyn);
    this.vis = {};
    for (const s of F.stations) this.vis[s.id] = makeStationVis(s, dyn);
    this.dock = []; const dgeo = new THREE.BoxGeometry(0.6, 0.45, 0.5);
    for (let i = 0; i < 24; i++) { const b = new THREE.Mesh(dgeo, mat('#C9A97F')); b.position.set(-19.6 + (i % 8) * 0.68, 0.55 + Math.floor(i / 8) * 0.47, 3.4 + (Math.floor(i / 8) % 2) * 0.1); dyn.add(b); this.dock.push(b); }
    this.dyn = dyn;
    this.workerModels = []; this._staffSig = '';
    this.forklift = productModel('coffee').toGroup(); this.forklift = models.forklift().toGroup(); dyn.add(this.forklift); this.forklift.position.set(-12, 0, 0);
    this.fl = { t: 0, from: [-12, 0], to: [-12, 0] };
    return { group, colliders, zones, bounds: [bx1, -20, bx2, 20], spawn: [F.car[0] - 1.5, F.car[1] - 1.5], bg: '#ECE6DB' };
  },
  syncWorkers() {
    const sig = G.factory.staff.map((w) => w.id + w.station + w.role).join(',');
    if (sig === this._staffSig) return;
    this._staffSig = sig;
    for (const m of this.workerModels) this.dyn.remove(m.root);
    this.workerModels = [];
    const looks = CH.workerLooks;
    const per = {};
    for (const w of G.factory.staff) {
      if (w.role === 'tasarimci' || w.role === 'satis') continue;
      const lk = Object.assign({}, looks[w.look % looks.length]);
      if (w.role === 'kalite') { lk.top = '#E9ECEF'; lk.extra = ['clipboard']; }
      if (w.role === 'depocu') { lk.vest = '#E2B33C'; }
      const m = makePerson(lk); m.w = w;
      if (w.station) {
        const s = PR.ST[w.station]; const i = per[w.station] = (per[w.station] || 0) + 1;
        m.root.position.set(s.pos[0] + (i - 1) * 0.8 - 0.4 * (i > 1), 0, s.pos[1] - 1.45); m.root.rotation.y = 0;
      } else { m.root.position.set(-6 + Math.random() * 10, 0, 1.2); m.roam = true; m.tgt = null; }
      this.dyn.add(m.root); this.workerModels.push(m);
    }
  },
  update(dt) {
    if (!this.vis) return;
    this.syncWorkers();
    const t = performance.now() / 1000;
    for (const s of F.stations) {
      const v = this.vis[s.id], S = G.factory.stations[s.id];
      const nIn = PR.inCount(s.id), nOut = PR.outCount(s.id);
      const inC = S.q[0] ? unitColor(S.q[0].wo) : '#C9A97F';
      v.inBoxes.forEach((b, i) => { b.visible = i < nIn; if (b.visible) b.material = mat(inC); });
      const ow = Object.keys(S.out)[0]; const oc = ow ? unitColor(ow) : '#C9A97F';
      v.outBoxes.forEach((b, i) => { b.visible = i < nOut; if (b.visible) b.material = mat(oc); });
      const prog = S.cur ? Math.min(1, S.cur.p / S.cur.need) : 0;
      v.bar.scale.x = Math.max(0.001, prog); v.bar.visible = v.barBg.visible = !!S.cur;
      v.block.visible = !!S.block;
      const sp = PR.stationSpeed(s.id);
      v.idle.visible = !S.block && sp === 0 && nIn > 0 && s.id !== 'kalite';
    }
    for (const m of this.workerModels) {
      if (m.roam) {
        if (!m.tgt || Math.hypot(m.tgt[0] - m.root.position.x, m.tgt[1] - m.root.position.z) < 0.3) {
          const s = F.stations[Math.floor(Math.random() * F.stations.length)]; m.tgt = [s.pos[0] + (Math.random() < 0.5 ? -2.1 : 2.1), s.pos[1] + 1.6];
        }
        const dx = m.tgt[0] - m.root.position.x, dz = m.tgt[1] - m.root.position.z, d = Math.hypot(dx, dz);
        m.root.position.x += dx / d * dt * 2.6; m.root.position.z += dz / d * dt * 2.6; m.root.rotation.y = Math.atan2(dx, dz);
        m.animate(dt, 1);
        if (!m.carry.children.length) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.35), mat('#C9A97F')); m.carry.add(b); }
      } else {
        const S = G.factory.stations[m.w.station];
        const working = !!S?.cur;
        m.animate(dt, 0);
        if (working) { m.armL.rotation.x = -0.9 + Math.sin(t * 8 + m.w.skill) * 0.35; m.armR.rotation.x = -0.9 - Math.sin(t * 8 + m.w.skill) * 0.35; }
      }
    }
    // Sevkiyat alanındaki koliler
    let packed = 0; const cols = [];
    for (const wo of Object.values(G.factory.wos)) { const n = wo.packed - wo.shipped; if (n > 0) { packed += n; for (let i = 0; i < n && cols.length < 24; i++) cols.push(unitColor(wo.id)); } }
    this.dock.forEach((b, i) => { b.visible = i < packed; if (b.visible) b.material = mat(shade(cols[i] || '#C9A97F', 0.95)); });
    // Forklift: depocu yoksa ağır ağır gezer
    const fl = this.fl; fl.t += dt / 6;
    if (fl.t >= 1) { fl.t = 0; fl.from = fl.to; const s = F.stations[Math.floor(Math.random() * F.stations.length)]; fl.to = [s.pos[0] + 2.4, s.pos[1] + 2.6]; }
    const fx = fl.from[0] + (fl.to[0] - fl.from[0]) * fl.t, fz = fl.from[1] + (fl.to[1] - fl.from[1]) * fl.t;
    this.forklift.rotation.y = Math.atan2(fl.to[0] - fl.from[0], fl.to[1] - fl.from[1]);
    this.forklift.position.set(fx, 0, fz);
  },
};
