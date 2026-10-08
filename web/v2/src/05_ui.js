// Arayüz: HTML/CSS üstünde. Pencereler (dialog) oyunu durdurur; alt sayfalar (sheet) durdurmaz.
const UI = {
  root: null, labels: null, sheetEl: null, dialogs: [], dialogEl: null, hintT: 0,
  byId: id => document.getElementById(id),
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  fmt: n => '₺' + Math.round(n).toLocaleString('tr-TR'),

  Init() {
    this.root = this.byId('ui'); this.labels = this.byId('world-labels');
    // arayüze dokunulunca sahneye gitmesin
    this.root.addEventListener('pointerdown', e => { if (e.target !== this.root && e.target !== this.labels) e.stopPropagation(); });
  },
  overlay: false, // sohbet gibi tam ekran pencereler oyunu durdurur
  get Blocking() { return this.dialogs.length > 0 || this.overlay; },

  // ---- HUD ----
  Hud(s) {
    const q = this.byId;
    q('h-name').textContent = s.name; q('h-stars').textContent = '★'.repeat(s.stars) + '☆'.repeat(5 - s.stars) + ' ' + s.rating.toFixed(1).replace('.', ',');
    q('h-day').textContent = 'Gün ' + s.day + ' · ' + s.clock; q('h-weather').textContent = s.weather; { const e = q('h-event'), t = s.event ? s.event.icon + ' ' + s.event.name : ''; if (e.textContent !== t) e.textContent = t; e.hidden = !t; } q('h-guests').textContent = 'Misafir ' + s.guests + ' · Oda ' + s.rooms;
    q('money').textContent = this.fmt(s.money).slice(1); q('rep').textContent = 'Ün ' + Math.round(s.rep);
    const badge = (id, n) => { const b = q(id); b.hidden = !(n > 0); b.textContent = n; };
    badge('menu-badge', s.menuBadge); badge('social-badge', s.socialBadge);
    const qc = q('quest-card');
    if (s.quest) { qc.hidden = false; q('q-text').textContent = s.quest.text; q('q-bar').style.width = Math.round(s.quest.progress * 100) + '%'; q('q-claim').hidden = !s.quest.done; q('q-claim').textContent = 'Ödülü al  ' + this.fmt(s.quest.reward); }
    else qc.hidden = true;
  },
  Floors(list, cur, onPick) {
    const el = this.byId('floors'); el.innerHTML = '';
    for (const f of list.slice().reverse()) {
      const d = document.createElement('div'); d.className = 'pill' + (f.i === cur ? ' on' : '') + (f.locked ? ' locked' : '') + (f.desk ? ' desk' : ''); d.textContent = f.label; d.title = f.name;
      d.addEventListener('pointerdown', e => { e.stopPropagation(); onPick(f.i); });
      el.appendChild(d);
    }
  },
  Hint(text, sec = 4) { const h = this.byId('hint'); h.textContent = text; h.style.opacity = text ? 1 : 0; this.hintT = sec; },
  Toast(text, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = text;
    const box = this.byId('toasts'); box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, 2600);
  },

  // ---- Dünya etiketleri (3B noktaya bağlı küçük HTML) ----
  _lab: new Map(),
  Label(key, pos, html, cls, onTap) {
    let l = this._lab.get(key);
    if (!l) { l = { el: document.createElement('div'), pos: V(), used: true }; l.el.className = 'wlabel'; this.labels.appendChild(l.el); this._lab.set(key, l);
      l.el.addEventListener('pointerdown', e => { e.stopPropagation(); l.onTap && l.onTap(); }); }
    if (l.html !== html) { l.el.innerHTML = html; l.html = html; }
    const c = 'wlabel ' + (cls || ''); if (l.cls !== c) { l.el.className = c; l.cls = c; }
    l.pos.copy(pos); l.onTap = onTap; l.used = true;
  },
  LabelsFrame() {
    for (const [k, l] of this._lab) {
      if (!l.used) { l.el.remove(); this._lab.delete(k); continue; }
      l.used = false;
      const s = worldToScreen(l.pos);
      const vis = s.z < 1 && s.x > -80 && s.x < innerWidth + 80 && s.y > -40 && s.y < innerHeight + 40;
      l.el.style.display = vis ? '' : 'none';
      if (vis) l.el.style.transform = `translate(${s.x.toFixed(0)}px, ${s.y.toFixed(0)}px) translate(-50%, -100%)`;
    }
  },

  // ---- Alt sayfa ----
  // Sheet({ title, sub, tabs:[{id,label}], tab, render(body, tab), onClose })
  Sheet(o) {
    this.CloseSheet();
    const el = document.createElement('div'); el.className = 'sheet'; this.sheetEl = el; el._opt = o;
    el.innerHTML = `<div class="head"><div class="grow"><h2>${this.esc(o.title)}</h2>${o.sub ? `<div class="sub">${this.esc(o.sub)}</div>` : ''}</div><button class="icon ghost" data-x>✕</button></div>${o.tabs ? '<div class="tabs"></div>' : ''}<div class="body"></div>`;
    el.querySelector('[data-x]').addEventListener('click', () => this.CloseSheet());
    this.root.appendChild(el);
    o.tab = o.tab || (o.tabs ? o.tabs[0].id : null);
    this.RenderSheet();
    return el;
  },
  RenderSheet() {
    const el = this.sheetEl; if (!el) return; const o = el._opt;
    if (o.tabs) {
      const t = el.querySelector('.tabs'); t.innerHTML = '';
      for (const tb of o.tabs) { const b = document.createElement('button'); b.textContent = tb.label; b.className = tb.id === o.tab ? 'on' : ''; b.addEventListener('click', () => { o.tab = tb.id; this.RenderSheet(); }); t.appendChild(b); }
    }
    const body = el.querySelector('.body'); const sc = body.scrollTop; body.innerHTML = ''; o.render(body, o.tab); body.scrollTop = sc;
  },
  CloseSheet() { if (this.sheetEl) { const o = this.sheetEl._opt; this.sheetEl.remove(); this.sheetEl = null; o.onClose && o.onClose(); } },
  get SheetOpen() { return !!this.sheetEl; },
  SheetIs(title) { return this.sheetEl && this.sheetEl._opt.title === title; },

  // ---- Pencere (oyunu durdurur, sırayla) ----
  // Dialog({ tag, title, body(html|text), big, buttons:[{text, cls, act}] , custom(el) })
  Dialog(o) { this.dialogs.push(o); if (this.dialogs.length === 1) this.ShowDialog(); return o; },
  DialogFirst(o) { this.dialogs.unshift(o); if (this.dialogEl) { this.dialogEl.remove(); this.dialogEl = null; } this.ShowDialog(); },
  ShowDialog() {
    const o = this.dialogs[0]; if (!o || this.dialogEl) return;
    const w = document.createElement('div'); w.className = 'dialog-wrap';
    const d = document.createElement('div'); d.className = 'dialog';
    d.innerHTML = `${o.tag ? `<div class="tag">${this.esc(o.tag)}</div>` : ''}<h2>${this.esc(o.title)}</h2>${o.big ? `<div class="big">${o.big}</div>` : ''}${o.html ? o.html : o.body ? `<p>${this.esc(o.body)}</p>` : ''}<div class="btns"></div>`;
    const btns = d.querySelector('.btns');
    for (const b of (o.buttons && o.buttons.length ? o.buttons : [{ text: 'Tamam' }])) {
      const el = document.createElement('button'); el.textContent = b.text; el.className = b.cls || 'gold'; if (b.disabled) el.disabled = true;
      el.addEventListener('click', () => { Sfx.Play('pop', 0.5); this.dialogs.shift(); w.remove(); this.dialogEl = null; b.act && b.act(); this.ShowDialog(); });
      btns.appendChild(el);
    }
    if (o.custom) o.custom(d);
    w.appendChild(d); this.root.appendChild(w); this.dialogEl = w;
    Sfx.Play('pop', 0.5);
  },
  ClearDialogs() { this.dialogs.length = 0; if (this.dialogEl) { this.dialogEl.remove(); this.dialogEl = null; } },

  Frame(dt) {
    this.LabelsFrame();
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.byId('hint').style.opacity = 0; }
  },
};
