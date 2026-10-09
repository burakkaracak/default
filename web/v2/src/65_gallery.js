// Lobi tabloları: Elif'in (ya da Burak'ın) yüklediği fotoğraflar, yoksa albümdeki fotoğraflar lobideki iki tabloda döner.
// Fotoğraflar bu cihazın deposunda (otel2_tablolar) küçük JPEG olarak saklanır; buluta gitmez. Resim açılamazsa düz tablo kalır.
const Gallery = {
  Key: 'otel2_tablolar', Max: 6, Size: 640, planes: [], off: 0, t: 40, tex: [], busy: false,
  Items() { try { const a = JSON.parse(localStorage.getItem(this.Key) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.startsWith('data:image')) : []; } catch (e) { return []; } },
  Save(a) { for (let k = 0; k < 6; k++) { try { localStorage.setItem(this.Key, JSON.stringify(a)); return true; } catch (e) { if (!a.length) return false; a.shift(); } } return false; },
  Clear() { try { localStorage.removeItem(this.Key); } catch (e) { } },
  Sources() { const up = this.Items(); return up.length ? up : Album.Items().map(x => x.u); },

  Init() {
    const g = Hotel.groups[0]; if (!g) return;
    for (const p of this.planes) Destroy(p); this.planes = [];
    for (const x of [-3.6, 3.6]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.name = 'TabloResim';
      m.position.set(x, 2.0, -6.565); m.visible = false; g.add(m); this.planes.push(m);
    }
    this.Refresh();
  },
  // iki tabloya sıradaki iki fotoğrafı yükler
  Refresh() {
    const src = this.Sources(); if (!src.length || !this.planes.length) { for (const p of this.planes) p.visible = false; return; }
    this.planes.forEach((pl, i) => {
      const url = src[(this.off + i) % src.length], img = new Image();
      img.onload = () => {
        if (!alive(pl)) return;
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 384; const ctx = cv.getContext('2d');
        const k = Math.max(512 / img.width, 384 / img.height), w = img.width * k, h = img.height * k; ctx.drawImage(img, (512 - w) / 2, (384 - h) / 2, w, h);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
        if (pl.material.map) pl.material.map.dispose(); pl.material.map = t; pl.material.color.set(0xffffff); pl.material.needsUpdate = true; pl.visible = true;
      };
      img.onerror = () => { pl.visible = false; }; // açılamazsa düz tablo
      img.src = url;
    });
  },
  Tick(dt) { this.t -= dt; if (this.t > 0) return; this.t = 40; this.off++; this.Refresh(); },

  // seçilen dosyayı küçültüp saklar
  Add(file) {
    return new Promise(ok => {
      const rd = new FileReader();
      rd.onerror = () => ok(false);
      rd.onload = () => {
        const img = new Image();
        img.onerror = () => ok(false);
        img.onload = () => {
          try {
            const k = Math.min(1, this.Size / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            const a = this.Items(); a.push(cv.toDataURL('image/jpeg', 0.8)); while (a.length > this.Max) a.shift();
            ok(this.Save(a));
          } catch (e) { ok(false); }
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  },
  Render(body) {
    const h = document.createElement('div'); h.className = 'sec'; h.textContent = '🖼 LOBİ TABLOLARI'; body.appendChild(h);
    const items = this.Items(), info = document.createElement('div'); info.className = 'item';
    info.innerHTML = `<div class="ic">🖼</div><div class="tx"><b>Fotoğraflarını tablolara as</b><small>Telefondan fotoğraf seç, lobideki iki tabloda dönsün. Fotoğraflar yalnız bu cihazda saklanır (en çok ${this.Max}). ${items.length ? '' : 'Hiç yoksa albümdeki fotoğraflar asılır.'}</small></div>`;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true;
    const bt = document.createElement('button'); bt.className = 'pink'; bt.textContent = '＋ Ekle'; bt.addEventListener('click', () => inp.click());
    inp.addEventListener('change', async () => { let n = 0; for (const f of [...inp.files].slice(0, this.Max)) if (await this.Add(f)) n++; UI.Toast(n ? '🖼 ' + n + ' fotoğraf tabloya eklendi' : 'Fotoğraf eklenemedi', n ? 'good' : 'bad'); this.off = 0; this.Refresh(); UI.RenderSheet(); });
    info.appendChild(bt); info.appendChild(inp); body.appendChild(info);
    if (items.length) {
      const g = document.createElement('div'); g.className = 'photos';
      items.forEach((u, i) => { const c = document.createElement('div'); c.className = 'ph'; c.innerHTML = `<img alt="" src="${u}"><small>✕ kaldır</small>`; c.addEventListener('click', () => { const a = this.Items(); a.splice(i, 1); a.length ? this.Save(a) : this.Clear(); this.Refresh(); UI.RenderSheet(); }); g.appendChild(c); });
      body.appendChild(g);
    }
  },
};
if (typeof window !== 'undefined') window.__Gallery = Gallery;
