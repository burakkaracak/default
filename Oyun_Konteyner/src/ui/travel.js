// Lokasyonlar arası araç yolculuğu ve mağaza asansörü.
import { h, $, panel, choose, toast } from './dom.js';
import { G } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { W } from '../locations/world3d.js';
import { randi } from '../core/util.js';
import L from '../data/locations.json';
import { whereIs } from '../characters/npcs.js';
import { CH } from '../core/state.js';

export function travelMinutes(a, b) {
  const k = [a, b].sort().join('-'); const k2 = a + '-' + b, k3 = b + '-' + a;
  const r = L.travel[k2] || L.travel[k3] || L.travel[k] || [30, 45];
  return randi(r[0], r[1]);
}
function whoAt(loc) {
  return CH.list.filter((c) => !c.player).filter((c) => { const w = whereIs(c.id); return w && !w.travelling && w.loc === loc; }).map((c) => c.name.split(' ')[0]);
}
export function openTravel() {
  const from = G.player.loc;
  const opts = L.list.filter((l) => l.id !== from).map((l) => {
    const who = whoAt(l.id);
    return { label: l.name, sub: (who.length ? who.join(', ') : 'kimse yok') + ' · ~' + (L.travel[[from, l.id].join('-')] || L.travel[[l.id, from].join('-')] || [30])[0] + ' dk', value: l.id };
  });
  if (G.player.carry.length) toast('Taşıdığın ürünleri istasyona bırakmadan çıkarsan forklift onları geri götürür.', 'warn');
  choose('Araçla nereye?', `Şu an: <b>${L.list.find((l) => l.id === from).name}</b> · Saat ${time.clock()}<br><span class="muted">Yolda geçen süre oyun saatinden düşer.</span>`, opts, { icon: '🚗' }).then((to) => { if (to) go(to); });
}
export function go(to, opts = {}) {
  const from = G.player.loc;
  const mins = opts.minutes ?? travelMinutes(from, to);
  // Taşınanları istasyona geri koy
  if (G.player.carry.length) { for (const c of G.player.carry) { const S = G.factory.stations[c.from]; if (S) S.out[c.wo] = (S.out[c.wo] || 0) + c.n; } G.player.carry = []; }
  const name = L.list.find((l) => l.id === to).name;
  const ov = h('div', { id: 'travel' },
    h('div', { class: 'tt' }, h('h3', {}, '→ ' + name), h('p', {}, `${mins} dakika yol · ${time.clock()} → ${time.clock(Math.min(time.dayEnded ? G.min : G.min + mins, 20 * 60))}`)),
    h('div', { class: 'city' }), h('div', { class: 'road' }),
    h('div', { class: 'carsvg', html: `<svg width="150" height="62" viewBox="0 0 150 62"><rect x="8" y="22" width="134" height="26" rx="8" fill="#2F3540"/><path d="M34 22 L50 6 H102 L120 22 Z" fill="#3E4652"/><path d="M40 21 L53 9 H74 V21 Z M78 21 V9 H99 L113 21 Z" fill="#9FB7C8"/><circle cx="38" cy="50" r="11" fill="#1C1C1E"/><circle cx="38" cy="50" r="5" fill="#9C905C"/><circle cx="112" cy="50" r="11" fill="#1C1C1E"/><circle cx="112" cy="50" r="5" fill="#9C905C"/><rect x="136" y="28" width="8" height="6" rx="2" fill="#F6E7B0"/></svg>` }),
  );
  document.body.append(ov);
  bus.emit('sfx', 'whoosh');
  time.hold++;
  setTimeout(() => {
    time.hold--; time.skip(mins);
    W.enter(to, { floor: to === 'store' ? 0 : 0 });
    G.stats.trips = (G.stats.trips || 0) + 1;
    bus.emit('arrived', to, from);
    ov.style.transition = 'opacity .35s'; ov.style.opacity = '0'; setTimeout(() => ov.remove(), 380);
  }, opts.fast ? 900 : 2300);
}
export function openElevator() {
  const fl = L.store.floors;
  choose('Asansör', 'Hangi kata?', fl.map((f) => ({ label: (f.id === G.player.floor ? '● ' : '') + f.name, sub: f.id === 1 && !G.showroom.floors[1] ? '🔒 kilitli (gezebilirsin)' : '', value: String(f.id), disabled: f.id === G.player.floor })), { icon: '🛗' }).then((v) => {
    if (v == null) return;
    const f = +v;
    const fade = h('div', { style: { position: 'fixed', inset: 0, background: '#EFE9DF', zIndex: 85, opacity: 0, transition: 'opacity .25s' } });
    document.body.append(fade); requestAnimationFrame(() => (fade.style.opacity = 1));
    bus.emit('sfx', 'open');
    setTimeout(() => { W.enter('store', { floor: f, x: L.store.elevator[0], z: L.store.elevator[1] + 1.1 }); fade.style.opacity = 0; setTimeout(() => fade.remove(), 300); time.skip(2); }, 280);
  });
}
