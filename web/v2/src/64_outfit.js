// Müdür kıyafeti: 12 karakter görünümü + şapka/taç. Ayarlar'da küçük önizlemelerle seçilir; seçim kayda yazılır (st.look, st.hat).
const Outfit = {
  Looks: ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f'].map(x => 'character-' + x),
  Hats: [{ id: '', name: 'Yok', icon: '🚫' }, { id: 'tac', name: 'Taç', icon: '👑' }, { id: 'fiyonk', name: 'Fiyonk', icon: '🎀' }, { id: 'silindir', name: 'Silindir', icon: '🎩' }, { id: 'cicek', name: 'Çiçek', icon: '🌸' }],
  thumbs: {}, hat: null,

  // oyuncunun görünümünü değiştirir (eski model Rig listesinden normal yolla temizlenir)
  Apply(look, hat) {
    const P = Game.player, st = Game.st; if (!P) return;
    if (look && look !== st.look) {
      const old = P.rig; P.rig = Rig.Model(P.go, look, 1.75); Destroy(old.go); st.look = look;
      P.rig.inner.visible = old.inner.visible;
    }
    if (hat !== undefined) { st.hat = hat; this.Hat(hat); }
    Game.Save();
  },
  Hat(id) {
    const P = Game.player; if (this.hat) { Destroy(this.hat); this.hat = null; } if (!id || !P) return;
    const y = 1.68, parts = [];
    if (id === 'tac') { parts.push({ geo: 'Cylinder', pos: V(0, y + 0.1, 0), scale: V(0.34, 0.1, 0.34), c: C(1, 0.82, 0.25) }); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; parts.push({ geo: 'Sphere', pos: V(Math.cos(a) * 0.15, y + 0.2, Math.sin(a) * 0.15), scale: V(0.07, 0.09, 0.07), c: i % 2 ? C(0.95, 0.3, 0.45) : C(0.4, 0.8, 1) }); } }
    if (id === 'fiyonk') { parts.push({ geo: 'Sphere', pos: V(-0.1, y + 0.12, 0.05), scale: V(0.17, 0.12, 0.1), c: C(1, 0.45, 0.65) }, { geo: 'Sphere', pos: V(0.1, y + 0.12, 0.05), scale: V(0.17, 0.12, 0.1), c: C(1, 0.45, 0.65) }, { geo: 'Sphere', pos: V(0, y + 0.12, 0.05), scale: V(0.08, 0.08, 0.08), c: C(0.9, 0.25, 0.5) }); }
    if (id === 'silindir') { parts.push({ geo: 'Cylinder', pos: V(0, y + 0.05, 0), scale: V(0.42, 0.04, 0.42), c: C(0.12, 0.12, 0.16) }, { geo: 'Cylinder', pos: V(0, y + 0.27, 0), scale: V(0.28, 0.4, 0.28), c: C(0.12, 0.12, 0.16) }, { geo: 'Cylinder', pos: V(0, y + 0.12, 0), scale: V(0.29, 0.06, 0.29), c: C(0.75, 0.3, 0.5) }); }
    if (id === 'cicek') { parts.push({ geo: 'Sphere', pos: V(0.18, y + 0.08, 0.05), scale: V(0.09, 0.09, 0.09), c: C(1, 0.85, 0.3) }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; parts.push({ geo: 'Sphere', pos: V(0.18 + Math.cos(a) * 0.1, y + 0.08 + Math.sin(a) * 0.1, 0.05), scale: V(0.08, 0.08, 0.05), c: C(0.95, 0.5, 0.75) }); } }
    this.hat = U.Merge('Sapka', P.go, parts); if (this.hat) this.hat.castShadow = false;
  },

  // küçük önizleme: karakter ayrı bir sahnede kendi hedefine çizilir
  Thumb(look) {
    if (this.thumbs[look]) return this.thumbs[look];
    try {
      const w = 120, h = 150, rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace }), sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0xaab0c8, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 2); dl.position.set(2, 4, 4); sc.add(dl);
      const r = Rig.Model(sc, look, 1.75); r.mixer.update(0.05);
      const cam = new THREE.PerspectiveCamera(24, w / h, 0.1, 20); cam.position.set(0, 1.05, 3.6); cam.lookAt(0, 0.98, 0);
      const old = { rt: renderer.getRenderTarget(), col: renderer.getClearColor(new THREE.Color()), a: renderer.getClearAlpha() };
      renderer.setRenderTarget(rt); renderer.setClearColor(0xffffff, 0); renderer.clear(); renderer.render(sc, cam);
      const buf = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
      renderer.setRenderTarget(old.rt); renderer.setClearColor(old.col, old.a);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      ctx.putImageData(img, 0, 0);
      Destroy(r.go); rt.dispose();
      return (this.thumbs[look] = cv.toDataURL('image/png'));
    } catch (e) { return (this.thumbs[look] = ''); }
  },
  Render(body) {
    const st = Game.st, h = document.createElement('div'); h.className = 'sec'; h.textContent = '👗 KIYAFET'; body.appendChild(h);
    const g = document.createElement('div'); g.className = 'outfits';
    for (const l of this.Looks) {
      const b = document.createElement('div'); b.className = 'of' + (st.look === l ? ' on' : ''); const t = this.Thumb(l);
      b.innerHTML = t ? `<img alt="" src="${t}">` : `<span>${l.includes('female') ? '👩' : '🧑'}</span>`;
      b.addEventListener('click', () => { this.Apply(l); Sfx.Play('pop', 0.5); UI.RenderSheet(); }); g.appendChild(b);
    }
    body.appendChild(g);
    const h2 = document.createElement('div'); h2.className = 'sec'; h2.textContent = 'ŞAPKA'; body.appendChild(h2);
    const row = document.createElement('div'); row.className = 'grid3';
    for (const x of this.Hats) { const b = document.createElement('button'); b.className = (st.hat || '') === x.id ? 'gold' : 'ghost'; b.textContent = x.icon + ' ' + x.name; b.addEventListener('click', () => { this.Apply(undefined, x.id); Sfx.Play('pop', 0.5); UI.RenderSheet(); }); row.appendChild(b); }
    body.appendChild(row);
  },
};
if (typeof window !== 'undefined') window.__Outfit = Outfit;
