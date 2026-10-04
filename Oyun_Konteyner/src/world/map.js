// Stilize dünya haritası: şehirler, pazar karakterleri, firmalar, yoldaki sevkiyatlar.
import { h, panel, toast, stars, progress } from '../ui/dom.js';
import { G, family } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { pct, fmtInt } from '../core/util.js';
import CITIES from '../data/cities.json';
import MAP from '../data/map.json';
import { custByCity, LEVELS, TYPES, isProtected, cityOpen, cityOf } from '../crm/customers.js';
import { composePanel, rep } from '../crm/outreach.js';
import { MODES } from './logistics.js';
import { atDesk } from '../ui/desk.js';

const X = (lon) => (lon + 12) * 4, Y = (lat) => (64 - lat) * 5.2;
const VIEWS = { all: [0, 0, 648, 364], avrupa: [10, 30, 230, 150], dogu: [150, 70, 260, 150], uzak: [330, 70, 318, 300] };
const NS = 'http://www.w3.org/2000/svg';
export const mapHooks = { cityExtra: [] }; // fn(city, body)

function svgMap(view, selId, onCity) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', VIEWS[view].join(' ')); s.setAttribute('class', 'map');
  const poly = (pts, cls, fill) => `<polygon class="${cls}" ${fill ? `fill="${fill}"` : ''} points="${pts.map(([lo, la]) => X(lo).toFixed(1) + ',' + Y(la).toFixed(1)).join(' ')}"/>`;
  let html = MAP.land.map((p) => poly(p, 'land')).join('') + MAP.sea.map((p) => poly(p, 'sea', '#E8EEF0')).join('');
  const k = view === 'all' ? 1 : 0.55;
  // İstanbul
  html += `<circle cx="${X(29)}" cy="${Y(41)}" r="${4 * k}" fill="#2B2D2F"/><text x="${X(29) + 5 * k}" y="${Y(41) + 3 * k}" style="font-size:${9 * k}px">İstanbul</text>`;
  // Sevkiyat rotaları
  for (const sh of G.shipments.filter((x) => x.status === 'yolda')) {
    const c = cityOf(sh.city); const t = Math.min(1, (G.day - sh.depart + G.min / 1440) / Math.max(1, sh.arrive - sh.depart));
    const x0 = X(29), y0 = Y(41), x1 = X(c.lon), y1 = Y(c.lat), mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 30 * k;
    html += `<path d="M${x0},${y0} Q${mx},${my} ${x1},${y1}" fill="none" stroke="#9C905C" stroke-width="${1.4 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>`;
    const bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1;
    html += `<text x="${bx}" y="${by}" text-anchor="middle" style="font-size:${13 * k}px">${MODES[sh.mode].icon}</text>`;
  }
  for (const c of CITIES.list) {
    const open = cityOpen(c.id); const prot = c.owner === 'bunyamin';
    const n = custByCity(c.id).filter((x) => x.level >= 1).length;
    const col = prot ? '#B8AFA3' : !open ? '#CFC6B6' : n ? '#9C905C' : '#4F6E83';
    const r = (selId === c.id ? 6 : 4.2) * k;
    html += `<g class="city" data-id="${c.id}"><circle cx="${X(c.lon)}" cy="${Y(c.lat)}" r="${r + 5 * k}" fill="transparent"/><circle cx="${X(c.lon)}" cy="${Y(c.lat)}" r="${r}" fill="${col}" stroke="#fff" stroke-width="${1.2 * k}"/>` +
      `<text x="${X(c.lon) + r + 2}" y="${Y(c.lat) + 3 * k}" style="font-size:${8.5 * k}px;fill:${open && !prot ? '#2B2D2F' : '#8E877B'}">${prot ? '🔒 ' : ''}${c.name}</text></g>`;
  }
  s.innerHTML = html;
  s.querySelectorAll('.city').forEach((g) => g.addEventListener('click', () => onCity(g.dataset.id)));
  return s;
}

export function worldPanel(cityId) {
  let view = 'all', sel = cityId || null, typeF = 'all';
  const p = panel({
    id: 'world', title: 'Dünya haritası', icon: '🌍', sub: 'Ülke seç → firmaları gör → ilk maili yaz',
    render(b, api) {
      const vrow = h('div', { class: 'row', style: { marginBottom: '6px' } });
      for (const [v, l] of [['all', 'Tümü'], ['avrupa', 'Avrupa · Balkanlar'], ['dogu', 'Kafkasya · Orta Asya'], ['uzak', 'Uzak Doğu']]) vrow.append(h('button', { class: 'btn sm ' + (view === v ? 'gold' : 'ghost'), onclick: () => { view = v; api.refresh(); } }, l));
      b.append(vrow, svgMap(view, sel, (id) => { sel = id; api.refresh(); setTimeout(() => api.body.querySelector('#citydet')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }));
      b.append(h('div', { class: 'row muted', style: { fontSize: '11px', margin: '4px 0' } }, '● mavi: açık pazar · ● altın: ilişkin var · ● gri: kilitli · 🔒 Bünyamin\'in korumalı hesapları'));
      if (!sel) return;
      const c = cityOf(sel); const open = cityOpen(sel); const prot = c.owner === 'bunyamin';
      const det = h('div', { id: 'citydet' });
      det.append(h('h3', { style: { margin: '10px 0 4px' } }, `${c.flag} ${c.name}, ${c.country}`));
      if (prot) det.append(h('p', { class: 'tag warn' }, 'Bünyamin\'in bölgesi (korumalı hesap). Dokunmak güven ve itibar kaybettirir.'));
      if (!open && !prot) { det.append(h('p', { class: 'muted' }, `Bu pazar ${c.chapter}. bölümde açılır.`)); b.append(det); return; }
      const st = Object.entries(c.styles).sort((a, b) => b[1] - a[1]).map(([k]) => k).join(', ');
      det.append(h('div', { class: 'kv' },
        h('b', {}, 'Tarz'), h('span', {}, st), h('b', {}, 'Renkler'), h('span', {}, c.colors.join(', ')),
        h('b', {}, 'Fiyat seviyesi'), h('span', {}, c.priceLevel >= 1.15 ? 'yüksek' : c.priceLevel >= 0.98 ? 'orta' : 'düşük', ` (×${c.priceLevel})`),
        h('b', {}, 'Ölçü alışkanlığı'), h('span', {}, c.sizeHabit || '-'),
        h('b', {}, 'Ödeme güvenilirliği'), h('span', {}, pct(c.payRel)),
        h('b', {}, 'Sezon talebi'), h('span', {}, ['Kış', 'İlkb.', 'Yaz', 'Sonb.'].map((s, i) => `${s} ${c.season[i] >= 1.1 ? '▲' : c.season[i] <= 0.9 ? '▼' : '•'}`).join(' · '), ` (şu an ${time.season()})`),
        h('b', {}, 'Para birimi'), h('span', {}, c.cur),
        h('b', {}, 'Lojistik'), h('span', {}, Object.entries(c.logistics).map(([m, v]) => `${MODES[m].icon} ${v[0]} gün`).join(' · ')),
        h('b', {}, 'Marka itibarı'), h('span', {}, h('div', { style: { maxWidth: '200px' } }, progress(rep(sel) / 100)))));
      for (const fn of mapHooks.cityExtra) fn(c, det);
      det.append(h('div', { class: 'sec' }, 'Firmalar'));
      const trow = h('div', { class: 'row', style: { marginBottom: '6px' } });
      for (const [t, l] of [['all', 'Hepsi'], ...Object.entries(TYPES).map(([k, v]) => [k, v.icon + ' ' + v.name])]) trow.append(h('button', { class: 'btn sm ' + (typeF === t ? 'gold' : 'ghost'), onclick: () => { typeF = t; api.refresh(); } }, l));
      det.append(trow);
      for (const f of custByCity(sel).filter((x) => typeF === 'all' || x.type === typeF)) {
        const status = f.waiting ? 'cevap bekleniyor' : f.cooldown > G.day ? 'şimdilik meşgul' : LEVELS[f.level];
        det.append(h('div', { class: 'list-item' }, h('div', { style: { fontSize: '22px' } }, TYPES[f.type].icon),
          h('div', { class: 'grow' }, h('div', { class: 't1' }, f.name), h('div', { class: 't2' }, `${TYPES[f.type].name} · ${['', 'küçük', 'orta', 'büyük'][f.size]} · ${f.style} · fiyat hassasiyeti ${f.priceSens > 0.6 ? 'yüksek' : f.priceSens > 0.35 ? 'orta' : 'düşük'} · ${f.comm}`),
            h('div', { class: 't2' }, h('span', { class: 'tag ' + (f.level >= 3 ? 'good' : f.level ? 'gold' : '') }, status), f.level ? ` · memnuniyet ${Math.round(f.sat)}` : '')),
          f.level === 0 && !f.waiting ? h('button', { class: 'btn sm ' + (prot ? 'line' : 'gold'), onclick: () => { if (!prot && !atDesk()) return toast('İlk temas mailleri masandan yazılır (Bostancı, 2. kat).', 'warn'); p.close(); composePanel(f); } }, prot ? 'Yine de yaz' : 'Mail yaz') : null));
      }
      if (!atDesk()) det.append(h('p', { class: 'muted' }, 'Not: Mail yazmak için masanda (Bostancı 2. kat) olmalısın.'));
      b.append(det);
    },
  });
  return p;
}
