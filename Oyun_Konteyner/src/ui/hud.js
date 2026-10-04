// Oyun içi gösterge: para, tarih/saat, hız, Bünyamin nerede, Özgüven/Analiz, alt menü, etkileşim düğmesi.
import { h, $, toast, floaty } from './dom.js';
import { G } from '../core/state.js';
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { fmtTLk } from '../core/util.js';
import { whereIs, locName } from '../characters/npcs.js';
import { unread, pendingActions } from '../crm/inbox.js';
import { carried, capacity } from '../factory/production.js';

export const hud = {
  el: null, near: null,
  build() {
    const el = (this.el = $('#hud')); el.innerHTML = '';
    const top = h('div', { class: 'topbar' });
    this.cash = h('div', { class: 'chip cash', title: 'Kasa (TL)', onclick: () => bus.emit('ui', 'finance') }, '');
    this.clock = h('div', { class: 'chip', onclick: () => bus.emit('ui', 'calendar') }, '');
    this.speed = h('div', { class: 'chip speed' });
    for (const [v, l] of [[0, '❚❚'], [1, '1x'], [2, '2x'], [3, '3x']]) this.speed.append(h('button', { 'data-v': v, onclick: () => { G.speed = v; this.update(); bus.emit('sfx', 'click'); } }, l));
    this.bun = h('div', { class: 'chip bun', title: 'Bünyamin şu an nerede?', onclick: () => bus.emit('ui', 'whereBun') }, '');
    this.meters = h('div', { class: 'chip meters', onclick: () => bus.emit('ui', 'confidence') });
    this.oz = h('i'); this.an = h('i');
    this.meters.append(h('div', { class: 'meter' }, 'Özgüven', h('div', { class: 'bar' }, this.oz)), h('div', { class: 'meter an' }, 'Analiz', h('div', { class: 'bar' }, this.an)));
    top.append(this.cash, this.clock, this.speed, this.bun, this.meters);
    el.append(top);
    this.obj = h('div', { class: 'objective', onclick: () => bus.emit('ui', 'goals') }); el.append(this.obj);
    this.carry = h('div', { class: 'carryhud' }); el.append(this.carry);
    const dock = h('div', { class: 'dock' });
    const db = (icon, label, ui, badgeFn) => { const b = h('button', { onclick: () => bus.emit('ui', ui) }, h('span', { class: 'i' }, icon), label); b._badge = badgeFn; return b; };
    this.dockBtns = [
      db('✉️', 'Gelen', 'inbox', () => unread() + 0), db('📋', 'Siparişler', 'orders', () => G.orders.filter((o) => ['proforma', 'erp', 'hazir'].includes(o.status)).length),
      db('🏭', 'Fabrika', 'factory'), db('🌍', 'Dünya', 'world'), db('👥', 'Kadro', 'people'), db('📊', 'Finans', 'finance'), db('☰', 'Menü', 'gamemenu'),
    ];
    dock.append(...this.dockBtns); el.append(dock);
    this.act = h('button', { class: 'actbtn hidden', onclick: () => { if (this.near) this.near.action(); } }); el.append(this.act);
    this.hint = h('div', { class: 'hint hidden' }); el.append(this.hint);
    bus.on('nearAction', (z) => { this.near = z; this.updAct(); });
    this.update();
  },
  updAct() {
    const z = this.near;
    this.act.classList.toggle('hidden', !z);
    if (z) { this.act.innerHTML = ''; this.act.append(z.actionLabel || z.label || 'Etkileşim', h('kbd', {}, matchMedia('(pointer:fine)').matches ? '[E]' : '')); }
  },
  update() {
    if (!G || !this.el) return;
    this.cash.innerHTML = ''; this.cash.append(h('span', { class: 'ico' }, '₺'), fmtTLk(G.cash).replace('₺', ''));
    this.clock.innerHTML = ''; this.clock.append(time.clock(), h('small', {}, `${time.dayShort()} · ${time.dayOfMonth()} ${time.monthName().slice(0, 3)}`));
    for (const b of this.speed.children) b.classList.toggle('on', +b.dataset.v === G.speed);
    const w = whereIs('bunyamin');
    this.bun.innerHTML = ''; this.bun.append('🧭 ', h('span', { class: 'bunlbl' }, 'Bünyamin: '), h('small', {}, w?.travelling ? 'yolda → ' + locName(w.to) : locName(w?.loc)));
    this.oz.style.width = Math.round(G.player.ozguven) + '%';
    this.an.style.width = Math.round(G.player.analiz) + '%';
    for (const b of this.dockBtns) { b.querySelector('.badge')?.remove(); const n = b._badge?.(); if (n) b.append(h('span', { class: 'badge' }, n)); }
    const c = carried();
    this.carry.classList.toggle('hidden', c === 0);
    this.carry.textContent = `Taşınan: ${c}/${capacity()} birim`;
    this.renderObjective();
  },
  renderObjective() {
    const o = this.objective?.();
    this.obj.classList.toggle('hidden', !o);
    if (!o) return;
    this.obj.innerHTML = '';
    this.obj.append(h('b', {}, o.title), ...o.items.map((it) => h('div', { class: it.done ? 'done' : '' }, (it.done ? '✓ ' : '• ') + it.text)));
  },
  showHint(text, ms = 3000) { this.hint.textContent = text; this.hint.classList.remove('hidden'); clearTimeout(this._ht); this._ht = setTimeout(() => this.hint.classList.add('hidden'), ms); },
};
bus.on('cash', (d) => { if (Math.abs(d) >= 1000 && d > 0) floaty('+' + fmtTLk(d), innerWidth * 0.18, 60); });
