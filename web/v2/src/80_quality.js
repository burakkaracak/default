// Grafik kalitesi: ortam yansıması, parlama, gölge; otomatik düşürme. Ayrıca fotoğraf modu.
const Quality = {
  level: 2, names: ['Düşük', 'Orta', 'Yüksek'], composer: null, bloom: null, auto: true, fpsT: 0, frames: 0,
  Init() {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; pm.dispose();
    const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
    let saved = null; try { saved = localStorage.getItem('otel2_grafik'); } catch (e) { }
    if (saved != null && saved !== '') { this.level = +saved; this.auto = false; } else this.level = mobile ? 1 : 2;
    this.Apply();
  },
  Set(l, manual) { this.level = Mathf.Clamp(l, 0, 2); if (manual) { this.auto = false; try { localStorage.setItem('otel2_grafik', String(this.level)); } catch (e) { } } this.Apply(); UI.Toast('Grafik: ' + this.names[this.level], 'info'); },
  Apply() {
    const L = this.level;
    renderer.setPixelRatio(this.PixelRatio());
    renderer.shadowMap.enabled = L > 0; sunLight.castShadow = L > 0;
    sunLight.shadow.mapSize.set(L === 2 ? 4096 : 2048, L === 2 ? 4096 : 2048);
    if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
    scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.needsUpdate = true; } });
    if (L === 2) this.MakeComposer(); else this.composer = null;
    this.Resize();
  },
  MakeComposer() {
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 2 });
    const c = new EffectComposer(renderer, rt);
    c.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.4, 0.4, 1.6);
    c.addPass(this.bloom); c.addPass(new OutputPass());
    this.composer = c;
  },
  // Ekran büyüdükçe piksel oranı düşer: toplam piksel Yüksek 3.6M, Orta 2.4M, Düşük 1.4M'ı aşmaz (iPhone 14 Pro dikeyde 1.75x kalır, M2 Air'de ~1.6x)
  PixelRatio() { const L = this.level, cap = Math.sqrt((L === 2 ? 3.6e6 : L === 1 ? 2.4e6 : 1.4e6) / Math.max(1, innerWidth * innerHeight)); return Math.min(devicePixelRatio || 1, L === 2 ? 2 : L === 1 ? 1.75 : 1.25, Math.max(1, cap)); },
  Resize() { renderer.setPixelRatio(this.PixelRatio()); if (!this.composer) return; this.composer.setPixelRatio(renderer.getPixelRatio()); this.composer.setSize(innerWidth, innerHeight); },
  Render() { if (this.composer) this.composer.render(); else renderer.render(scene, camera); },
  Tick(raw) {
    if (!this.auto || window.__sub) return;
    this.fpsT += raw; this.frames++;
    if (this.fpsT < 5) return;
    const fps = this.frames / this.fpsT; this.fpsT = 0; this.frames = 0;
    if (fps < 38 && this.level > 0) this.Set(this.level - 1, false);
  },
};

const Photo = {
  pending: false, downloads: null,
  Init() { try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { this.downloads = d; }).catch(() => { }); } catch (e) { } },
  Take() { this.pending = true; Sfx.Play('pop', 0.5); },
  AfterRender() {
    if (!this.pending) return; this.pending = false;
    const gl = renderer.domElement, cv = document.createElement('canvas'); cv.width = gl.width; cv.height = gl.height;
    const ctx = cv.getContext('2d'); ctx.drawImage(gl, 0, 0);
    if (Album.Add(cv)) { Game.st.photos = (Game.st.photos || 0) + 1; UI.Toast('📸 Albüme eklendi', 'good'); }
    const h = Math.round(cv.height * 0.07), k = cv.width / innerWidth;
    const grd = ctx.createLinearGradient(0, cv.height - h * 1.8, 0, cv.height); grd.addColorStop(0, 'rgba(20,24,40,0)'); grd.addColorStop(1, 'rgba(20,24,40,0.75)');
    ctx.fillStyle = grd; ctx.fillRect(0, cv.height - h * 1.8, cv.width, h * 1.8);
    ctx.font = `900 ${Math.round(h * 0.45)}px ${UI_FONT}`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd96b'; ctx.textAlign = 'left';
    ctx.fillText(Game.st.name + '  ' + '★'.repeat(Game.Stars), 24 * k, cv.height - h * 0.6);
    ctx.font = `700 ${Math.round(h * 0.32)}px ${UI_FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    ctx.fillText('Gün ' + World.day + ' · ' + World.Clock + ' · ' + new Date().toLocaleDateString('tr-TR'), cv.width - 24 * k, cv.height - h * 0.6);
    const flash = document.createElement('div'); flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:40;pointer-events:none;transition:opacity .5s'; document.body.appendChild(flash); requestAnimationFrame(() => { flash.style.opacity = 0; setTimeout(() => flash.remove(), 500); });
    const name = 'lavanta-koyu-gun-' + World.day + '.png';
    cv.toBlob(async blob => {
      if (!blob) return;
      if (this.downloads) { try { await this.downloads.save({ filename: name, data: blob }); UI.Toast('Fotoğraf kaydedildi', 'good'); } catch (e) { if (e && e.code !== 'declined') UI.Toast('Fotoğraf kaydedilemedi', 'bad'); } }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    }, 'image/png');
  },
};
