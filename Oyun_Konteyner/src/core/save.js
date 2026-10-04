// Kayıt: localStorage'da 3 slot + otomatik kayıt + JSON dışa/içe aktarma.
import { G, setG } from './state.js';
const KEY = (s) => 'konteyner_kayit_' + s;
const SET_KEY = 'konteyner_ayarlar';

export const save = {
  slot: 1,
  write(slot = this.slot) {
    if (!G) return false;
    G.savedAt = Date.now();
    try { localStorage.setItem(KEY(slot), JSON.stringify(G)); return true; } catch (e) { console.warn('kayıt yazılamadı', e); return false; }
  },
  read(slot) {
    try { const s = localStorage.getItem(KEY(slot)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  },
  meta(slot) {
    const g = this.read(slot);
    if (!g) return null;
    return { day: g.day, cash: g.cash, mode: g.mode, savedAt: g.savedAt, chapter: g.chapter };
  },
  remove(slot) { try { localStorage.removeItem(KEY(slot)); } catch (e) {} },
  lastSlot() {
    let best = null, t = 0;
    for (const s of [1, 2, 3]) { const m = this.meta(s); if (m && m.savedAt > t) { t = m.savedAt; best = s; } }
    return best;
  },
  load(slot) { const g = this.read(slot); if (!g) return null; this.slot = slot; setG(g); return g; },
  exportJSON() {
    const blob = new Blob([JSON.stringify(G, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `konteyner-kayit-gun${G.day}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  importJSON(text, slot) {
    const g = JSON.parse(text);
    if (!g || typeof g.day !== 'number' || !g.factory) throw new Error('Geçersiz kayıt dosyası');
    localStorage.setItem(KEY(slot), JSON.stringify(g));
  },
  settings() {
    try { return Object.assign({ quality: 'auto', sound: true, music: false }, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); }
    catch (e) { return { quality: 'auto', sound: true }; }
  },
  setSettings(s) { try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) {} },
};
