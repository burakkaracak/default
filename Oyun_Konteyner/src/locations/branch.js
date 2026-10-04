// Şube mağazalar: küçük, sade sahneler. Bünyamin buralara uğrar; bazı yan görevler burada geçer.
import * as THREE from 'three';
import { Parts, models, textSprite } from './builder.js';
import { bus } from '../core/bus.js';
import L from '../data/locations.json';

function makeBranch(id) {
  const D = L.branches[id];
  return {
    id, camOffset: [0, 13.5, 11],
    build() {
      const group = new THREE.Group(), p = new Parts();
      p.box(14.4, 0.12, 10.4, D.color, 0, -0.12, 0);
      p.box(0.3, 3.2, 10.4, '#EFE8DC', -7.2, 0, 0); p.box(0.3, 3.2, 10.4, '#EFE8DC', 7.2, 0, 0); p.box(14.4, 3.2, 0.3, '#E2D8C6', 0, 0, -5.2);
      p.box(14.4, 0.35, 0.2, '#2B2D2F', 0, 0, 5.15);
      p.box(16, 0.1, 4, '#C9C4BA', 0, -0.15, 7.2);
      const cols = id === 'nisantasi' ? ['#33415E', '#E9E0CF', '#B86A4B'] : ['#7D8A5C', '#CDBB9C', '#4A4D52'];
      const ms = [models.sofa(cols[0]), models.armchair(cols[1]), models.bed(cols[2])];
      D.slots.forEach(([x, z], i) => { p.cyl(1.0, 0.1, '#E9E0CF', x, 0, z, 16); p.add(ms[i % 3], x, 0.1, z, 0, i === 2 ? 0.7 : 0.85); });
      p.add(models.tallPlant(), -6.4, 0, -4.4); p.add(models.tallPlant(), 6.4, 0, -4.4); p.add(models.lamp(), 6.3, 0, 1.5);
      p.box(2.4, 1.0, 0.7, '#2B2D2F', 4.4, 0, -2.6); p.box(2.5, 0.05, 0.8, '#9C905C', 4.4, 1.0, -2.6);
      p.add(models.car('#2F3540'), D.car[0] + 2.2, 0, D.car[1] + 0.8, Math.PI / 2);
      group.add(p.toGroup(document.body.dataset.q === 'high'));
      const t = textSprite(D.name, { h: 0.5, bg: 'rgba(156,144,92,0.92)' }); t.position.set(-3, 3.4, -4.8); group.add(t);
      const colliders = [[-7.5, -5.5, -6.9, 5.5], [6.9, -5.5, 7.5, 5.5], [-7.5, -5.5, 7.5, -4.9], [-7.5, 4.95, -1.6, 5.4], [1.6, 4.95, 7.5, 5.4], [3.1, -3.0, 5.7, -2.2]];
      D.slots.forEach(([x, z]) => colliders.push([x - 0.9, z - 0.8, x + 0.9, z + 0.8]));
      const zones = [
        { id: 'car', kind: 'action', x: D.car[0], z: D.car[1], r: 1.2, label: 'Araç', action: () => bus.emit('ui', 'travel'), actionLabel: 'Araçla git' },
        { id: 'branchdesk', kind: 'action', x: 4.4, z: -1.5, r: 0.9, label: 'Şube kasası', action: () => bus.emit('ui', 'branchDesk', id), actionLabel: 'Şube durumu' },
      ];
      return { group, colliders, zones, bounds: [-7, -5, 7, 8.6], spawn: [D.car[0] - 1.2, D.car[1] - 0.6], bg: '#EFE9DF' };
    },
  };
}
export const nisantasiLoc = makeBranch('nisantasi');
export const atasehirLoc = makeBranch('atasehir');
