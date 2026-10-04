// Küçük DOM yardımcıları: öğe oluşturma, paneller (modal yığını), bildirimler, onay ve seçim pencereleri.
import { bus } from '../core/bus.js';
import { time } from '../core/time.js';
import { input } from '../core/input.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);

const stack = [];
export const modals = {
  get open() { return stack.length > 0; },
  get top() { return stack[stack.length - 1]; },
  closeAll() { while (stack.length) stack[stack.length - 1].close(); },
};

// Panel: {title, sub, size:'sm'|'md'|''|'full', tabs:[{id,label,badge}], tab, render(body, api), footer(foot, api), onClose, hold, noClose}
export function panel(opt) {
  const root = $('#modals');
  const scrim = h('div', { class: 'scrim' });
  const box = h('div', { class: 'panel ' + (opt.size || '') });
  const head = h('div', { class: 'ph' });
  const body = h('div', { class: 'pb' });
  const foot = h('div', { class: 'pf' });
  const api = {
    el: box, body, foot, tab: opt.tab || opt.tabs?.[0]?.id, data: opt.data || {},
    close() {
      const i = stack.indexOf(api); if (i < 0) return;
      stack.splice(i, 1); scrim.remove(); box.remove();
      if (opt.hold) time.hold = Math.max(0, time.hold - 1);
      input.enabled = stack.length === 0;
      opt.onClose?.(api); bus.emit('panelClosed', opt.id);
      bus.emit('sfx', 'close');
    },
    refresh() {
      const st = body.scrollTop;
      head.innerHTML = '';
      head.append(h('h2', {}, opt.icon ? opt.icon + ' ' : '', typeof opt.title === 'function' ? opt.title(api) : opt.title, opt.sub ? h('small', {}, typeof opt.sub === 'function' ? opt.sub(api) : opt.sub) : null));
      if (!opt.noClose) head.append(h('button', { class: 'x', onclick: () => api.close(), 'aria-label': 'Kapat' }, '×'));
      if (tabsEl) { tabsEl.innerHTML = ''; for (const t of (typeof opt.tabs === 'function' ? opt.tabs(api) : opt.tabs)) tabsEl.append(h('button', { class: t.id === api.tab ? 'on' : '', onclick: () => { api.tab = t.id; api.refresh(); body.scrollTop = 0; } }, t.label, t.badge ? h('span', { class: 'badge', style: { position: 'static', marginLeft: '5px' } }, t.badge) : null)); }
      body.innerHTML = ''; opt.render(body, api);
      foot.innerHTML = ''; if (opt.footer) { opt.footer(foot, api); foot.style.display = foot.children.length ? '' : 'none'; } else foot.style.display = 'none';
      body.scrollTop = st;
    },
    setTab(t) { api.tab = t; api.refresh(); },
  };
  let tabsEl = null;
  box.append(head);
  if (opt.tabs) { tabsEl = h('div', { class: 'tabs' }); box.append(tabsEl); }
  box.append(body, foot);
  scrim.addEventListener('click', () => { if (!opt.noClose && !opt.modal) api.close(); });
  root.append(scrim, box);
  stack.push(api);
  if (opt.hold) time.hold++;
  input.enabled = false;
  api.refresh();
  bus.emit('sfx', 'open');
  return api;
}

export function toast(text, kind = 'info', ms = 3800) {
  const t = h('div', { class: 'toast ' + kind }, text);
  $('#toasts').append(t);
  const all = $('#toasts').children; if (all.length > 4) all[0].remove();
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, ms);
}

export function floaty(text, x = innerWidth / 2, y = innerHeight / 2, color) {
  const f = h('div', { class: 'floaty', style: { left: x + 'px', top: y + 'px', color: color || '' } }, text);
  document.body.append(f); setTimeout(() => f.remove(), 1500);
}

export function confetti(n = 60) {
  const cols = ['#9C905C', '#B7AB76', '#E6DCCB', '#2B2D2F', '#F1E7C2', '#B86A4B'];
  for (let i = 0; i < n; i++) {
    const c = h('div', { class: 'confetti', style: { left: Math.random() * 100 + 'vw', background: cols[i % cols.length], animationDuration: 1.6 + Math.random() * 1.8 + 's', animationDelay: Math.random() * 0.5 + 's' } });
    document.body.append(c); setTimeout(() => c.remove(), 4200);
  }
}
export function goldGlow() { const g = h('div', { class: 'glow' }); document.body.append(g); setTimeout(() => g.remove(), 1700); }

// Basit seçim penceresi: choices: [{label, sub, disabled, value}] → Promise(value|null)
export function choose(title, text, choices, opt = {}) {
  return new Promise((res) => {
    let done = false;
    const p = panel({
      title, size: 'sm', hold: opt.hold ?? true, icon: opt.icon, modal: opt.modal,
      onClose: () => { if (!done) res(null); },
      render(b) {
        if (opt.portrait || text) b.append(h('div', { class: 'dlg' }, opt.portrait ? h('img', { class: 'portrait lg', src: opt.portrait }) : null, text ? h('div', { class: 'say', html: text }) : null));
        const ch = h('div', { class: 'choices' });
        for (const c of choices) ch.append(h('button', { disabled: c.disabled, onclick: () => { done = true; p.close(); res(c.value ?? c.label); } }, c.label, c.sub ? h('small', {}, c.sub) : null));
        b.append(ch);
      },
    });
  });
}
export function confirmBox(title, text, yes = 'Evet', no = 'Vazgeç') {
  return choose(title, text, [{ label: yes, value: true }, { label: no, value: false }]).then((v) => v === true);
}
export function alertBox(title, text, ok = 'Tamam', opt = {}) { return choose(title, text, [{ label: ok, value: true }], opt); }

export function stars(n, max = 5) { return h('span', { class: 'stars' }, '★'.repeat(Math.max(0, Math.round(n))) + '☆'.repeat(Math.max(0, max - Math.round(n)))); }
export function progress(v) { return h('div', { class: 'prog' }, h('i', { style: { width: Math.round(Math.max(0, Math.min(1, v)) * 100) + '%' } })); }
