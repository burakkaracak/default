// Bostancı Mağaza: 4 kat. Zemin ve 1. kat teşhir, 2. kat ihracat ofisi (Burak'ın masası), 3. kat toplantı odası.
import * as THREE from 'three';
import { Parts, models, textSprite, productModel, shade, mat } from './builder.js';
import { G, family, color as colorOf } from '../core/state.js';
import { bus } from '../core/bus.js';
import L from '../data/locations.json';

const S = L.store;
const WALL = '#EFE8DC', WALL2 = '#E2D8C6', FLOOR = '#E6DCCB', WOODF = '#CDB495';

function shell(p, floor) {
  p.box(24.4, 0.12, 16.4, floor === 2 ? '#DCD3C3' : floor === 3 ? WOODF : FLOOR, 0, -0.12, 0);
  p.box(0.3, 1.2, 16.4, WALL, -12.2, 0, 0); p.box(0.3, 1.2, 16.4, WALL, 12.2, 0, 0);
  p.box(0.3, 3.4, 3, WALL, -12.2, 0, -6.7); p.box(0.3, 3.4, 3, WALL, 12.2, 0, -6.7);
  p.box(0.32, 0.06, 13.4, '#9C905C', -12.2, 1.2, 1.5); p.box(0.32, 0.06, 13.4, '#9C905C', 12.2, 1.2, 1.5);
  p.box(24.4, 3.4, 0.3, WALL2, 0, 0, -8.2);
  // Ön cephe cam (alçak çerçeve)
  p.box(24.4, 0.35, 0.2, '#2B2D2F', 0, 0, 8.15);
  p.box(24.4, 0.06, 0.2, '#9C905C', 0, 0.35, 8.15);
  // Asansör
  const [ex, ez] = S.elevator;
  p.box(2.4, 3.2, 0.3, '#2B2D2F', ex, 0, ez - 1.6); p.box(1.4, 2.5, 0.05, '#B9B3A7', ex, 0, ez - 1.43); p.box(0.04, 2.5, 0.06, '#7E786D', ex, 0, ez - 1.4);
  p.box(0.3, 0.3, 0.05, '#9C905C', ex + 0.95, 1.2, ez - 1.42, 0, { emissive: true });
}

function floor0(p) {
  shell(p, 0);
  p.box(9, 0.9, 0.08, '#2B2D2F', 0, 2.1, -8.0);
  p.box(4.6, 0.02, 2.8, '#E6DCCB', 7, 0, 3);
  // Resepsiyon
  p.box(3.2, 1.0, 0.8, '#2B2D2F', 6, 0, 3.6); p.box(3.3, 0.06, 0.9, '#9C905C', 6, 1.0, 3.6);
  p.add(models.tallPlant(), 10.8, 0, 6.8); p.add(models.tallPlant(), -10.8, 0, 6.8); p.add(models.tallPlant(), -10.8, 0, -6.8);
  p.add(models.lamp(), 10.6, 0, -1.5); p.add(models.lamp(), -10.8, 0, -1.2);
  p.add(models.rug(5, 3.5, '#D8CCB6'), -4, 0, -1.5); p.add(models.rug(4, 3, '#CFC2A9'), 1, 0, 3);
  // Giriş saçağı ve kaldırım
  p.box(26, 0.1, 6, '#C9C4BA', 0, -0.15, 11); p.box(4, 0.08, 1.4, '#2B2D2F', 0, -0.1, 8.9);
  p.add(models.car('#2F3540'), S.car[0] + 2.4, 0, S.car[1] + 0.4, Math.PI / 2);
}
function floor1(p) {
  shell(p, 1);
  p.box(8, 0.8, 0.06, '#2B2D2F', 0, 2.2, -8.0);
  p.add(models.tallPlant(), 10.8, 0, 6.6); p.add(models.tallPlant(), -10.8, 0, -6.8); p.add(models.lamp(), -10.6, 0, 6);
  p.add(models.rug(6, 4, '#E0D2BA'), -2, 0, -1.5);
  if (!G.showroom.floors[1]) {
    for (let i = -10; i <= 10; i += 2) p.box(0.1, 1, 0.1, '#E2B33C', i, 0, 6);
    p.add(models.pallet(), -3, 0, 2); p.add(models.boxStack(3), 2, 0, 2); p.add(models.boxStack(2), 4, 0, -2);
  }
}
function floor2(p) {
  shell(p, 2);
  // Burak'ın masası
  const [dx, dz] = S.desk;
  p.add(models.desk('#D8CDB8'), dx, 0, dz - 0.9, 0); p.add(models.officeChair('#2F3033'), dx, 0, dz);
  p.box(0.25, 0.2, 0.18, '#9C905C', dx - 0.6, 0.77, dz - 1.0); // kupa
  p.add(models.plant(0.7), dx - 1.4, 0, dz - 1.4);
  // Bünyamin'in eski masası (tozlu, boş)
  const [ox, oz] = S.oldDesk;
  p.add(models.desk('#CFC5B2'), ox, 0, oz - 0.9, 0); p.add(models.officeChair('#55524C'), ox + 0.2, 0, oz + 0.1);
  p.box(0.3, 0.24, 0.03, '#2B2D2F', ox - 0.5, 0.77, oz - 1.1); p.box(0.25, 0.18, 0.01, '#C9B37A', ox - 0.5, 0.8, oz - 1.085);
  p.add(models.plant(0.55), ox + 0.6, 0.77, oz - 1.1);
  p.add(models.shelf(1.8), -9.5, 0, -7.6); p.add(models.shelf(1.8), -3.8, 0, -7.6);
  // Satış asistanı masaları
  p.add(models.desk('#E2D8C6'), -6, 0, 3.4, Math.PI); p.add(models.desk('#E2D8C6'), -3, 0, 3.4, Math.PI);
  // Müşteri görüşme odası (cam)
  p.box(0.12, 2.8, 6.6, '#BFD3DE', 3, 0, 2.5, 0, { glass: true, opacity: 0.3 });
  p.box(7.6, 2.8, 0.12, '#BFD3DE', 6.8, 0, -0.8, 0, { glass: true, opacity: 0.3 });
  p.box(3.2, 0.06, 1.4, '#2B2D2F', 7, 0.74, 2.6); p.cyl(0.18, 0.74, '#2B2D2F', 7, 0, 2.6, 8);
  for (const [x, z] of [[5.8, 1.6], [8.2, 1.6], [5.8, 3.6], [8.2, 3.6]]) p.add(models.chair('#CDBB9C'), x, 0, z, z < 2.6 ? 0 : Math.PI);
  p.add(models.tallPlant(), 10.8, 0, 6.5); p.add(models.lamp(), -10.8, 0, 6.6);
  p.add(models.rug(3.4, 2.4, '#D9CDB7'), dx, 0, dz - 0.6);
}
function floor3(p) {
  shell(p, 3);
  // Deniz manzarası (pencere bandı)
  p.box(18, 1.6, 0.05, '#9DB8C8', -1, 1.0, -8.03, 0, { emissive: true }); p.box(18, 0.45, 0.06, '#7FA3B9', -1, 1.0, -8.0, 0, { emissive: true });
  for (let i = -9; i <= 8; i += 3) p.box(0.1, 1.6, 0.08, '#2B2D2F', i + 0.5, 1.0, -7.98);
  // Toplantı masası
  p.box(7.2, 0.08, 2.2, '#2B2D2F', 0, 0.74, -1.4); p.box(7.3, 0.03, 2.3, '#9C905C', 0, 0.82, -1.4);
  p.box(0.4, 0.74, 1.2, '#3A3B3E', -2.5, 0, -1.4); p.box(0.4, 0.74, 1.2, '#3A3B3E', 2.5, 0, -1.4);
  for (let i = 0; i < 4; i++) { p.add(models.officeChair('#3B3A38'), -2.7 + i * 1.8, 0, -3.1, Math.PI); p.add(models.officeChair('#3B3A38'), -2.7 + i * 1.8, 0, 0.3); }
  p.add(models.officeChair('#6B4F3A'), 0, 0, -4.3, Math.PI);
  // Sunum ekranı
  p.box(3.6, 2.0, 0.1, '#1E1F22', -8.8, 0.8, -1.4, Math.PI / 2); p.box(3.4, 1.8, 0.02, '#4F6E83', -8.72, 0.9, -1.4, Math.PI / 2, { emissive: true });
  // Büşra'nın masası
  p.add(models.desk('#E9E0CF'), 7, 0, 3.4, Math.PI); p.add(models.plant(0.6), 8.4, 0.77, 3.6);
  p.add(models.tallPlant(), 10.8, 0, -6.8); p.add(models.tallPlant(), -10.8, 0, 6.6); p.add(models.shelf(), 4.5, 0, -7.6);
  p.add(models.rug(9, 4.4, '#D2C3A8'), 0, 0, -1.4);
}

function slotPedestal(p, x, z) { p.cyl(1.05, 0.12, '#E9E0CF', x, 0, z, 18); p.cyl(1.08, 0.03, '#9C905C', x, 0.12, z, 18); }

export function showroomBeauty() {
  let b = 0; const seen = new Set();
  for (const [k, it] of Object.entries(G.showroom.items)) {
    if (!it) continue;
    b += 6 + it.q * 3; seen.add(it.fam + it.fabric); if (it.fabric === G.trend?.fabric) b += 4;
  }
  b += seen.size * 2 + (G.showroom.decor || 0) * 3 + (G.showroom.floors[1] ? 6 : 0);
  return Math.min(100, Math.round(b));
}

export const storeLoc = {
  id: 'store', camOffset: [0, 18.5, 15],
  build(floor) {
    const group = new THREE.Group();
    const p = new Parts();
    [floor0, floor1, floor2, floor3][floor](p);
    const slots = S.floors[floor].slots || [];
    if (floor === 0 || G.showroom.floors[1]) for (const [x, z] of slots) slotPedestal(p, x, z);
    const hi = document.body.dataset.q === 'high';
    group.add(p.toGroup(hi));
    // Teşhir ürünleri
    this.slotGroup = new THREE.Group(); group.add(this.slotGroup);
    this.renderSlots(floor);
    const title = textSprite(S.floors[floor].name, { h: 0.5, bg: 'rgba(156,144,92,0.92)' }); title.position.set(-6, 3.6, -7.6); group.add(title);
    if (floor === 0) { const lg = textSprite('LIVE & FEEL', { h: 0.62, bg: 'rgba(43,45,47,0.0)', color: '#9C905C', size: 60 }); lg.position.set(0, 2.55, -7.9); group.add(lg); }
    const [ex, ez] = S.elevator;
    const colliders = [[-12.5, -8.5, -11.9, 8.5], [11.9, -8.5, 12.5, 8.5], [-12.5, -8.6, 12.5, -7.9], [ex - 1.3, ez - 1.9, ex + 1.3, ez - 1.35]];
    if (floor !== 0) colliders.push([-12.5, 7.9, 12.5, 8.5]); else { colliders.push([-12.5, 7.95, -2.1, 8.4], [2.1, 7.95, 12.5, 8.4]); }
    const zones = [];
    zones.push({ id: 'elev', kind: 'action', x: ex, z: ez + 0.2, r: 1.1, label: 'Asansör', action: () => bus.emit('ui', 'elevator'), actionLabel: 'Asansör (kat seç)' });
    if (floor === 0) {
      colliders.push([4.3, 3.1, 7.7, 4.1]);
      zones.push({ id: 'car', kind: 'action', x: S.car[0], z: S.car[1], r: 1.2, label: 'Araç', action: () => bus.emit('ui', 'travel'), actionLabel: 'Araçla git' });
      zones.push({ id: 'decor', kind: 'action', x: 6, z: 5.2, r: 1.0, label: 'Dekorasyon', action: () => bus.emit('ui', 'decor'), actionLabel: 'Showroom dekorasyonu' });
    }
    if (floor === 0 || (floor === 1 && G.showroom.floors[1])) slots.forEach(([x, z], i) => {
      colliders.push([x - 0.9, z - 0.9, x + 0.9, z + 0.9]);
      zones.push({ id: 'slot' + i, kind: 'action', x, z: z + 1.6, r: 0.8, noSign: true, color: '#C9B37A', action: () => bus.emit('ui', 'slot', floor, i), actionLabel: 'Teşhir alanı ' + (i + 1) });
    });
    if (floor === 1 && !G.showroom.floors[1]) zones.push({ id: 'unlock1', kind: 'action', x: 0, z: 6.9, r: 1.1, label: '🔒 Teşhir Galerisi', color: '#B86A4B', action: () => bus.emit('ui', 'unlockFloor', 1), actionLabel: '1. kat teşhir galerisini aç' });
    if (floor === 2) {
      const [dx, dz] = S.desk, [ox, oz] = S.oldDesk;
      colliders.push([dx - 0.85, dz - 1.3, dx + 0.85, dz - 0.5], [ox - 0.85, oz - 1.3, ox + 0.85, oz - 0.5], [-6.85, 3.0, -2.15, 3.8], [2.9, -0.9, 3.1, 5.8], [3, -0.9, 10.6, -0.7], [5.4, 2.0, 8.6, 3.2]);
      zones.push({ id: 'desk', kind: 'action', x: dx, z: dz + 0.5, r: 0.95, label: 'Masam', color: '#9C905C', action: () => bus.emit('ui', 'desk'), actionLabel: 'Masana otur (Gelen Kutusu)' });
      zones.push({ id: 'olddesk', kind: 'action', x: ox, z: oz + 0.6, r: 0.8, label: 'Eski masa', action: () => bus.emit('ui', 'nostalgia'), actionLabel: 'Bünyamin\'in eski masası' });
      zones.push({ id: 'meetroom', kind: 'action', x: 7, z: 5.2, r: 1.0, label: 'Müşteri Görüşme Odası', action: () => bus.emit('ui', 'meetroom'), actionLabel: 'Görüşme odası' });
    }
    if (floor === 3) {
      colliders.push([-3.7, -2.6, 3.7, -0.2], [-9.2, -3.3, -8.4, 0.5], [6.1, 2.9, 7.9, 3.9]);
      zones.push({ id: 'table', kind: 'action', x: 4.4, z: 0.9, r: 1.0, label: 'Toplantı masası', action: () => bus.emit('ui', 'meetingTable'), actionLabel: 'Toplantı masası' });
    }
    const spawn = floor === 2 ? [S.desk[0], S.desk[1] + 0.9] : [ex, ez + 1.2];
    return { group, colliders, zones, bounds: [-12, -8, 12, floor === 0 ? 11.5 : 8], spawn, bg: floor === 3 ? '#E9E4DA' : '#EFE9DF' };
  },
  renderSlots(floor) {
    const g = this.slotGroup; if (!g) return;
    while (g.children.length) g.remove(g.children[0]);
    const slots = S.floors[floor].slots || [];
    if (floor === 1 && !G.showroom.floors[1]) return;
    slots.forEach(([x, z], i) => {
      const it = G.showroom.items[floor + ':' + i];
      if (!it) { const s = textSprite('Boş teşhir', { h: 0.3, bg: 'rgba(156,144,92,0.75)' }); s.position.set(x, 0.9, z); g.add(s); return; }
      const f = family(it.fam);
      const m = productModel(f.model, colorOf(it.color)?.hex || '#CDBB9C', '#8B6A4A').toGroup(document.body.dataset.q === 'high');
      m.position.set(x, 0.15, z); m.rotation.y = 0.25 * (i % 2 ? 1 : -1);
      const sc = f.model === 'bed' || f.model === 'corner' ? 0.72 : f.model === 'sofa' || f.model === 'table' ? 0.85 : 1; m.scale.setScalar(sc);
      g.add(m);
      const lbl = textSprite(`${f.name} · ${'★'.repeat(it.q)}`, { h: 0.28 }); lbl.position.set(x, 1.9, z); g.add(lbl);
    });
  },
};
bus.on('showroomChanged', () => { if (G.player.loc === 'store') storeLoc.renderSlots(G.player.floor); });
