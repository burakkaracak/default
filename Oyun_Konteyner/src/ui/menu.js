// Ana menü: logo, slogan, Yeni Oyun / Devam / Serbest Mod / Ayarlar, 3 kayıt yuvası, dışa/içe aktarma.
import { h, $, panel, confirmBox, toast } from './dom.js';
import { save } from '../core/save.js';
import { fmtTLk } from '../core/util.js';
import { bus } from '../core/bus.js';
import { sfx } from '../core/audio.js';

function ago(t) { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'az önce'; if (m < 60) return m + ' dk önce'; const hh = Math.round(m / 60); if (hh < 24) return hh + ' saat önce'; return Math.round(hh / 24) + ' gün önce'; }

export function showMenu() {
  const m = $('#menu'); m.classList.remove('hidden'); m.innerHTML = '';
  const last = save.lastSlot();
  const inner = h('div', { class: 'menu-in' },
    h('div', { class: 'logo' }, 'KARAÇAK MOBİLYA'),
    h('div', { class: 'logo-big' }, 'Konteyner', h('span', {}, '.')),
    h('div', { class: 'slogan' }, 'Live & Feel'),
  );
  const btns = h('div', { class: 'menu-btns' });
  if (last) { const mt = save.meta(last); btns.append(h('button', { class: 'btn gold', onclick: () => { sfx.ensure(); bus.emit('startGame', { slot: last, load: true }); } }, `Devam · Yuva ${last} · ${mt.day}. gün`)); }
  btns.append(
    h('button', { class: 'btn', onclick: () => pickSlot('story') }, 'Yeni Oyun'),
    h('button', { class: 'btn ghost', onclick: () => pickSlot('free') }, 'Serbest Mod'),
    h('button', { class: 'btn ghost', onclick: () => slotsPanel() }, 'Kayıtlar (yükle / dışa aktar)'),
    h('button', { class: 'btn line', onclick: () => settingsPanel() }, 'Ayarlar'),
  );
  inner.append(btns, h('div', { class: 'credit' }, 'İstanbul · Bostancı · Tuzla — Avrupa ve Asya ihracatı'));
  m.append(inner);
}
export function hideMenu() { $('#menu').classList.add('hidden'); }

function pickSlot(mode) {
  sfx.ensure();
  const p = panel({
    title: mode === 'free' ? 'Serbest Mod: kayıt yuvası seç' : 'Yeni Oyun: kayıt yuvası seç', size: 'sm',
    render(b) {
      b.append(h('p', { class: 'muted' }, mode === 'free' ? 'Bölüm yok; bütün pazarlar açık, daha yüksek başlangıç sermayesi.' : 'Bölüm 1 "İlk Konteyner" ile başlarsın. Bünyamin sana yol gösterecek.'));
      const s = h('div', { class: 'slots' });
      for (const slot of [1, 2, 3]) {
        const mt = save.meta(slot);
        s.append(h('div', { class: 'slotc' }, h('div', { class: 'grow' }, h('b', {}, 'Yuva ' + slot), h('div', { class: 'muted' }, mt ? `${mt.mode === 'free' ? 'Serbest' : 'Hikaye'} · ${mt.day}. gün · ${fmtTLk(mt.cash)} · ${ago(mt.savedAt)}` : 'Boş')),
          h('button', { class: 'btn gold sm', onclick: async () => { if (mt && !(await confirmBox('Üzerine yazılsın mı?', `Yuva ${slot} içindeki kayıt silinecek.`))) return; p.close(); bus.emit('startGame', { slot, mode }); } }, 'Başla')));
      }
      b.append(s);
    },
  });
}

export function slotsPanel(inGame = false) {
  const p = panel({
    title: 'Kayıtlar', size: 'sm',
    render(b) {
      const s = h('div', { class: 'slots' });
      for (const slot of [1, 2, 3]) {
        const mt = save.meta(slot);
        const file = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { save.importJSON(await f.text(), slot); toast('Kayıt içe aktarıldı → Yuva ' + slot, 'good'); p.refresh(); if (!inGame) showMenu(); } catch (err) { toast('Dosya okunamadı: ' + err.message, 'bad'); }
        } });
        s.append(h('div', { class: 'slotc' }, h('div', { class: 'grow' }, h('b', {}, 'Yuva ' + slot), h('div', { class: 'muted' }, mt ? `${mt.mode === 'free' ? 'Serbest' : 'Hikaye'} · ${mt.day}. gün · ${fmtTLk(mt.cash)} · ${ago(mt.savedAt)}` : 'Boş')),
          mt && !inGame ? h('button', { class: 'btn gold sm', onclick: () => { p.close(); bus.emit('startGame', { slot, load: true }); } }, 'Yükle') : null,
          mt ? h('button', { class: 'btn ghost sm', onclick: () => { const g = save.read(slot); const blob = new Blob([JSON.stringify(g)], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: `konteyner-yuva${slot}-gun${g.day}.json` }); document.body.append(a); a.click(); a.remove(); } }, 'Dışa aktar') : null,
          h('button', { class: 'btn ghost sm', onclick: () => file.click() }, 'İçe aktar'), file,
          mt && !inGame ? h('button', { class: 'btn line sm', onclick: async () => { if (await confirmBox('Silinsin mi?', `Yuva ${slot} kalıcı olarak silinecek.`, 'Sil')) { save.remove(slot); p.refresh(); showMenu(); } } }, 'Sil') : null));
      }
      b.append(s, h('p', { class: 'muted' }, 'Kayıtlar bu tarayıcıda saklanır. Başka cihaza taşımak için dışa aktar → diğer cihazda içe aktar.'));
    },
  });
}

export function settingsPanel() {
  const st = save.settings();
  const p = panel({
    title: 'Ayarlar', size: 'sm',
    render(b) {
      b.append(h('div', { class: 'sec' }, 'Grafik kalitesi'));
      const q = h('div', { class: 'row' });
      for (const [v, l] of [['auto', 'Otomatik'], ['low', 'Düşük'], ['med', 'Orta'], ['high', 'Yüksek']]) q.append(h('button', { class: 'btn sm ' + (st.quality === v ? 'gold' : 'ghost'), onclick: () => { st.quality = v; save.setSettings(st); p.refresh(); toast('Kalite ayarı bir sonraki açılışta tam uygulanır.', 'info'); bus.emit('qualityChanged', v); } }, l));
      b.append(q, h('p', { class: 'muted' }, 'Yüksek: gölgeler ve keskin görüntü. Düşük: telefonda en akıcı. Otomatik: FPS 40\'ın altına düşerse kaliteyi kendisi düşürür.'));
      b.append(h('div', { class: 'sec' }, 'Ses'));
      b.append(h('button', { class: 'btn sm ' + (st.sound ? 'gold' : 'ghost'), onclick: () => { st.sound = !st.sound; save.setSettings(st); sfx.on = st.sound; p.refresh(); } }, st.sound ? 'Ses efektleri: Açık' : 'Ses efektleri: Kapalı'));
      b.append(h('div', { class: 'sec' }, 'Kontroller'),
        h('div', { class: 'kv' }, h('b', {}, 'Masaüstü'), h('span', {}, 'WASD / oklar ile yürü, E veya Boşluk ile etkileşim.'), h('b', {}, 'Telefon'), h('span', {}, 'Ekranın boş bir yerine dokunup sürükle (joystick), sağ alttaki altın düğmeyle etkileşim.')));
    },
  });
}
