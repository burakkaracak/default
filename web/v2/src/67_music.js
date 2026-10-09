// Müzik: tek şarkı, sürekli döngüde çalar. Şarkı oyuna gömülü değildir: Ayarlar'dan cihazdaki bir ses dosyası seçilir,
// dosya bu cihazın IndexedDB deposuna yazılır (otel2_muzik; büyük dosya localStorage'a sığmaz, buluta gitmez).
// Dosya seçilmemişse müzik çalmaz. iPhone Safari sesi ilk dokunuştan sonra başlatır: Sfx.Init içinden çağrılır.
// Ses kapalıysa ya da sayfa gizliyse susar.
const Music = {
  ctx: null, master: null, src: null, buf: null, started: false, pausedByHidden: false, name: '', busy: false, DB: 'otel2_muzik',
  get On() { return !(Game.st && Game.st.music === false) && Sfx.volume > 0; },
  get Has() { return !!this.name; },

  // ---- depo (IndexedDB): tek kayıt, ArrayBuffer ----
  Db() { return new Promise((res, rej) => { try { const r = indexedDB.open(this.DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); },
  async Read() { const db = await this.Db(); return new Promise((res, rej) => { const q = db.transaction('s').objectStore('s').get('sarki'); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); },
  async Write(v) { const db = await this.Db(); return new Promise((res, rej) => { const t = db.transaction('s', 'readwrite'), s = t.objectStore('s'); if (v) s.put(v, 'sarki'); else s.delete('sarki'); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }); },

  Decode(ab) { return new Promise((res, rej) => { try { const p = this.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } }); },
  Init() {
    if (this.ctx || !Sfx.ctx) return; this.ctx = Sfx.ctx;
    this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) { this.pausedByHidden = true; try { this.ctx.suspend(); } catch (e) { } } else if (this.pausedByHidden) { this.pausedByHidden = false; try { this.ctx.resume(); } catch (e) { } } });
    this.Load();
  },
  // kayıtlı şarkıyı depodan oku ve çal
  async Load() {
    if (this.busy || !this.ctx) return; this.busy = true;
    try { const r = await this.Read(); if (r && r.data) { this.buf = await this.Decode(r.data.slice(0)); this.name = r.name || 'Şarkı'; this.Play(); } } catch (e) { } this.busy = false;
  },
  Play() {
    if (!this.ctx || !this.buf) return; this.Stop();
    const s = this.ctx.createBufferSource(); s.buffer = this.buf; s.loop = true; s.connect(this.master); s.start(); this.src = s; this.started = true;
  },
  Stop() { if (this.src) { try { this.src.stop(); } catch (e) { } try { this.src.disconnect(); } catch (e) { } this.src = null; } },
  // seçilen dosyayı kaydet ve hemen çal; sonuç: true / hata metni
  async SetFile(file) {
    if (!file) return 'Dosya seçilmedi';
    if (!this.ctx) { if (Sfx.Init) try { Sfx.Init(); } catch (e) { } this.Init(); }
    if (!this.ctx) return 'Ses henüz hazır değil, bir kez dokunup tekrar dene';
    try {
      const data = await file.arrayBuffer(), buf = await this.Decode(data.slice(0));
      await this.Write({ name: (file.name || 'Şarkı').replace(/\.[^.]+$/, ''), data });
      this.buf = buf; this.name = (file.name || 'Şarkı').replace(/\.[^.]+$/, ''); this.Play(); return true;
    } catch (e) { return 'Bu dosya açılamadı. mp3 ya da m4a dene'; }
  },
  async Remove() { this.Stop(); this.buf = null; this.name = ''; try { await this.Write(null); } catch (e) { } },
  Frame(raw) {
    if (!this.ctx || !this.master) return;
    const want = this.On ? 0.7 : 0; this.master.gain.value += (want - this.master.gain.value) * Math.min(1, raw * 2);
  },
  Render(body) {
    const d = document.createElement('div'); d.className = 'item';
    d.innerHTML = `<div class="ic">🎵</div><div class="tx"><b>Müzik</b><small>${this.Has ? UI.esc(this.name) + ' sürekli çalıyor.' : 'Şarkı seçilmedi. Telefondaki bir şarkıyı seç; sürekli çalar. Dosya bu telefonda kalır.'}</small></div>`;
    const col = document.createElement('div'); col.className = 'col';
    const b = document.createElement('button'); b.className = Game.st.music === false ? 'ghost' : 'mint'; b.textContent = Game.st.music === false ? 'Kapalı' : 'Açık';
    b.addEventListener('click', () => { Game.st.music = Game.st.music === false; Game.Save(); UI.RenderSheet(); }); col.appendChild(b);
    const p = document.createElement('button'); p.className = 'gold'; p.textContent = this.Has ? 'Değiştir' : 'Şarkı seç';
    p.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,.mp3,.m4a,.wav'; inp.style.display = 'none'; document.body.appendChild(inp);
      inp.addEventListener('change', async () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return; UI.Toast('Şarkı yükleniyor…', 'info'); const r = await this.SetFile(f); if (r === true) { UI.Toast('🎵 Şarkı seçildi', 'good'); if (Game.st.music === false) { Game.st.music = true; Game.Save(); } } else UI.Toast(r, 'bad'); UI.RenderSheet(); });
      inp.click();
    }); col.appendChild(p);
    if (this.Has) { const r = document.createElement('button'); r.className = 'ghost'; r.textContent = 'Kaldır'; r.addEventListener('click', async () => { await this.Remove(); UI.RenderSheet(); }); col.appendChild(r); }
    d.appendChild(col); body.appendChild(d);
  },
};
if (typeof window !== 'undefined') window.__Music = Music;
