// Otelin yaşamı: yıldız şartları ve puan, mevsimler, hava (yağmur/kar efekti), günlük olaylar. Hırsız olayı YOK.
const Life = {
  // ---------------- Yıldızlar ----------------
  // Bir sonraki yıldız için şartlar (hepsi tamamlanınca yıldız kazanılır; yıldız düşmez)
  StarReq: {
    2: { rep: 40, rooms: 4, sat: 3.0 },
    3: { rep: 100, rooms: 10, fac: 1, deluxe: 1, sat: 3.4 },
    4: { rep: 200, rooms: 18, fac: 3, suite: 2, staff: 6, sat: 3.8 },
    5: { rep: 350, rooms: 26, fac: 5, served: 300, sat: 4.2 },
  },
  ReqList(n) {
    const q = this.StarReq[n]; if (!q) return [];
    const st = Game.st, rooms = Game.OpenRooms(), out = [];
    const add = (label, cur, target, fmt) => out.push({ label, cur, target, ok: cur >= target, text: fmt ? fmt(cur, target) : Math.floor(cur) + '/' + target });
    add('Ün', st.rep, q.rep);
    add('Açık oda', rooms.length, q.rooms);
    if (q.fac) add('Tesis', Data.Facilities.filter(d => Facilities.Built(d.id)).length, q.fac);
    if (q.deluxe) add('Deluxe ya da üstü oda', rooms.filter(r => r.level >= 1).length, q.deluxe);
    if (q.suite) add('Suit oda', rooms.filter(r => r.level >= 2).length, q.suite);
    if (q.staff) add('Personel', Game.staff.length, q.staff);
    if (q.served) add('Ağırlanan misafir', st.served, q.served);
    const n2 = (st.recent || []).length;
    add('Misafir puanı (son ' + Math.max(5, n2) + ')', n2 >= 5 ? this.Rating() : 0, q.sat, c => (n2 >= 5 ? c.toFixed(1).replace('.', ',') : '—') + ' / ' + q.sat.toFixed(1).replace('.', ','));
    return out;
  },
  // Puan: son 20 misafirin memnuniyet ortalaması (1–5)
  Rating() { const a = Game.st.recent || []; if (!a.length) return 3; return a.reduce((s, x) => s + x, 0) / a.length; },
  AddSat(sat) { const st = Game.st; st.recent = st.recent || []; st.recent.push(+sat.toFixed(2)); if (st.recent.length > 20) st.recent.shift(); },
  CheckStars() {
    const st = Game.st; if (st.stars >= 5) return;
    const n = st.stars + 1, list = this.ReqList(n);
    if (!list.length || !list.every(x => x.ok)) return;
    st.stars = n; Game.Save();
    Sfx.Play('unlock', 0.9);
    U.Burst(Vec.add(Game.player.go.position, V(0, 2.2, 0)), C(1, 0.85, 0.3), C(1, 0.55, 0.75), 120, 6);
    const perks = { 2: 'Balayı çiftleri, sporcular, müfettiş ve gizli milyoner gelmeye başlar. Havuz, spor salonu, restoran açılabilir.', 3: 'Fenomenler gelir. Spa ve çatı barı açılabilir.', 4: 'Ünlüler gelmeye başlar!', 5: 'Lavanta Koyu\'nun en iyi oteli!' };
    UI.Dialog({ tag: 'YENİ YILDIZ', title: '★'.repeat(n) + ' ' + n + ' yıldızlı otel!', html: `<p>Tebrikler! Oda fiyatları %${(n - 1) * 10} arttı, daha çok misafir gelecek.</p><p>${perks[n]}</p>`, buttons: [{ text: 'Harika!', cls: 'gold' }] });
    if (UI.SheetOpen) UI.RenderSheet();
  },
  PriceMul() { return 1 + 0.1 * (Game.Stars - 1); },

  // ---------------- Mevsim ----------------
  Seasons: [
    { id: 'ilkbahar', name: 'İlkbahar', icon: '🌸', weather: { sunny: 4, cloudy: 3, rainy: 2 }, spawn: 1, types: { balayi: 1.4 }, grass: C(0.56, 0.8, 0.4) },
    { id: 'yaz', name: 'Yaz', icon: '🌞', weather: { sunny: 7, cloudy: 1, rainy: 0.5 }, spawn: 1.25, types: { aile: 1.6, turist: 1.3, ogrenci: 1.3 }, grass: C(0.64, 0.79, 0.36) },
    { id: 'sonbahar', name: 'Sonbahar', icon: '🍂', weather: { sunny: 2, cloudy: 3, rainy: 3 }, spawn: 0.95, types: { is: 1.4, emekli: 1.2 }, grass: C(0.78, 0.68, 0.38) },
    { id: 'kis', name: 'Kış', icon: '⛄', weather: { sunny: 1.5, cloudy: 3, rainy: 1, snowy: 3.5 }, spawn: 0.85, types: { emekli: 1.5, is: 1.3 }, grass: C(0.62, 0.7, 0.52) },
  ],
  SeasonLen: 7,
  get Season() { return this.Seasons[Math.floor((Math.max(1, World.day) - 1) / this.SeasonLen) % 4]; },
  get WeatherText() { return this.Season.icon + ' ' + Data.Weather[World.weather]; },
  PickWeather() {
    const ev = this.Event; if (ev && ev.weather) return ev.weather;
    const w = this.Season.weather; let sum = 0; for (const k in w) sum += w[k];
    let r = Math.random() * sum; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return 'sunny';
  },

  // ---------------- Olaylar ----------------
  Events: [
    { id: 'festival', name: 'Lavanta Festivali', icon: '🪻', desc: 'Kasabada festival var! Bugün daha çok misafir gelir.', spawn: 1.6, w: 2, seasons: ['ilkbahar', 'yaz'] },
    { id: 'tur', name: 'Tur otobüsü', icon: '🚌', desc: 'Bir tur otobüsü yanaştı: dört turist kapıda!', burst: { turist: 4 }, w: 2 },
    { id: 'bayram', name: 'Bayram', icon: '🍬', desc: 'Bayram tatili: aileler geliyor, bahşişler bol.', types: { aile: 4 }, tip: 1.5, w: 1.2 },
    { id: 'konser', name: 'Sahil konseri', icon: '🎸', desc: 'Akşam sahilde konser var. Gece de misafir gelir, çatı barı dolar.', night: true, fac: { bar: 2.5, kafe: 1.3 }, types: { ogrenci: 2 }, w: 1.2, seasons: ['ilkbahar', 'yaz', 'sonbahar'] },
    { id: 'sicak', name: 'Sıcak dalgası', icon: '🥵', desc: 'Hava çok sıcak! Havuz ve kafe dolar, misafirler sık sık su ister.', fac: { havuz: 2.5, kafe: 1.5 }, req: { water: 3 }, weather: 'sunny', w: 2.5, seasons: ['yaz'] },
    { id: 'firtina', name: 'Fırtına', icon: '⛈', desc: 'Fırtına var: daha az misafir gelir ama gelenler bir gece fazla kalır.', spawn: 0.5, nights: 1, weather: 'rainy', storm: true, w: 1.5, seasons: ['sonbahar', 'kis'] },
    { id: 'ariza', name: 'Tesisat arızası', icon: '🔧', desc: 'Bir odada su kaçağı var! Gidip tamir et, yoksa oda kullanılamaz.', breakRoom: true, w: 1.5, minRooms: 2 },
    { id: 'rakip', name: 'Rakip kampanyası', icon: '📉', desc: 'Karşı otel indirim yaptı. Misafir puanın 4\'ün altındaysa bugün daha az misafir gelir.', spawnFn: () => Life.Rating() >= 4 ? 1 : 0.7, w: 1, minDay: 4 },
    { id: 'gazete', name: 'Gazete haberi', icon: '📰', desc: 'Yerel gazete otelini övdü! Ün +10.', rep: 10, w: 1, cond: () => Life.Rating() >= 3.8 && (Game.st.recent || []).length >= 5 },
    { id: 'indirim', name: 'Mobilya indirimi', icon: '🛋', desc: 'Mağazada indirim: bugün dekor eşyaları %25 ucuz.', furn: 0.75, w: 1 },
  ],
  get Event() { const e = Game.st && Game.st.event; return e && e.day === World.day ? this.Events.find(x => x.id === e.id) || null : null; },
  StartDay() {
    const st = Game.st, prev = st.event ? st.event.id : null;
    st.event = null;
    if (World.day >= 3 && Math.random() < 0.6) {
      const season = this.Season.id;
      const pool = this.Events.filter(e => e.id !== prev && (!e.seasons || e.seasons.includes(season)) && (!e.minDay || World.day >= e.minDay) && (!e.minRooms || Game.OpenRooms().length >= e.minRooms) && (!e.cond || e.cond()));
      let sum = 0; for (const e of pool) sum += e.w;
      let r = Math.random() * sum; let pick = null; for (const e of pool) { r -= e.w; if (r <= 0) { pick = e; break; } }
      if (pick) st.event = { id: pick.id, day: World.day };
    }
    World.weather = this.PickWeather();
    this.ApplySeasonLook();
    const ev = this.Event;
    if (ev) this.BeginEvent(ev);
    return ev;
  },
  BeginEvent(ev) {
    if (ev.rep) Game.st.rep += ev.rep;
    if (ev.id === 'gazete') Social.Share('{otel}: Lavanta Koyu\'nun en sevilen oteli seçildi! Misafirler övgüler yağdırıyor.', 2, false);
    if (ev.id === 'festival') Social.Share('Lavanta Festivali başladı! {otel} bu hafta sonu festivalin en şık adresi.', 1, false);
    if (ev.burst) { let i = 0; for (const t in ev.burst) for (let k = 0; k < ev.burst[t]; k++) Tween.After(1 + 1.6 * i++, () => { if (Game.queue.length < 8) Game.Spawn(t); }); }
    if (ev.breakRoom) this.BreakRoom();
  },
  // olay çarpanları
  SpawnMul() { const ev = this.Event; let k = this.Season.spawn * (1 + 0.12 * (Game.Stars - 1)) * (1 + Social.AdsBonus); if (World.weather === 'rainy') k *= 0.85; if (World.weather === 'snowy') k *= 0.8; if (ev) { if (ev.spawn) k *= ev.spawn; if (ev.spawnFn) k *= ev.spawnFn(); } return k; },
  NightMul() { const ev = this.Event; return ev && ev.night ? 1 : 2.5; },
  TypeMul(id) { const ev = this.Event; return (this.Season.types[id] || 1) * (ev && ev.types && ev.types[id] || 1); },
  TipMul() { const ev = this.Event; return ev && ev.tip || 1; },
  ExtraNights() { const ev = this.Event; return ev && ev.nights || 0; },
  ReqMul(id) { const ev = this.Event; return ev && ev.req && ev.req[id] || 1; },
  FurnMul() { const ev = this.Event; return ev && ev.furn || 1; },
  FacMul(id) {
    const ev = this.Event, w = World.weather; let k = ev && ev.fac && ev.fac[id] || 1;
    if (w === 'rainy' || w === 'snowy') { if (id === 'bahce') k *= 0.4; if (id === 'spa') k *= 1.5; if (id === 'kafe') k *= 1.4; }
    if (w === 'sunny' && this.Season.id === 'yaz' && id === 'havuz') k *= 1.6;
    return k;
  },

  // ---------------- Arıza ----------------
  BreakRoom() {
    const open = Game.OpenRooms().filter(r => r.state === 'clean' && !r.guest);
    const r = open.length ? Random.Pick(open) : null; if (!r) return null;
    r.state = 'broken';
    const y = 0.02;
    r.leak = U.Prim('SuKacagi', r.group, V(0.3, y, r.side * -0.6), V(1.6, 0.02, 1.2), U.Mat(C(0.45, 0.72, 1, 0.75), 0.9), 'Cylinder'); U.NoShadow(r.leak);
    UI.Toast('🔧 Oda ' + r.number + '\'da su kaçağı var! Tamir et', 'bad');
    return r;
  },
  FixRoom(r) {
    r.state = 'clean'; if (r.leak) { Destroy(r.leak); r.leak = null; }
    Game.st.rep += 1; U.Burst(V(r.x, Hotel.FloorY(r.floor) + 1, r.z), C(0.5, 0.8, 1), C(1, 1, 1), 30, 3);
    Sfx.Play('unlock', 0.5); UI.Toast('Oda ' + r.number + ' tamir edildi', 'good');
  },

  // ---------------- Görünüm: çim rengi, yağmur ve kar ----------------
  ApplySeasonLook() {
    const g = World.grass; if (!g) return;
    let c = this.Season.grass; if (World.weather === 'snowy') c = C(0.93, 0.95, 0.99);
    g.material.color.copy(Col.three(c));
  },
  fx: null,
  BuildFX() {
    // yağmur: kısa çizgiler; kar: yuvarlak noktalar. Kameranın baktığı yerin çevresinde döner.
    const N = 900, box = { x: 44, y: 26, z: 44 };
    const rp = new Float32Array(N * 6), sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * box.x, y = Math.random() * box.y, z = (Math.random() - 0.5) * box.z;
      rp.set([x, y, z, x - 0.05, y - 0.7, z], i * 6); sp.set([x, y, z], i * 3);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.55, depthWrite: false }));
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const cx = cv.getContext('2d');
    const grd = cx.createRadialGradient(16, 16, 0, 16, 16, 16); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = grd; cx.fillRect(0, 0, 32, 32);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.32, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, color: 0xffffff }));
    for (const o of [rain, snow]) { o.frustumCulled = false; o.visible = false; o.renderOrder = 5; scene.add(o); }
    this.fx = { rain, snow, N, box, t: 0 };
  },
  TickFX(dt) {
    if (!this.fx) this.BuildFX();
    const f = this.fx, w = World.weather, ev = this.Event;
    const showRain = w === 'rainy', showSnow = w === 'snowy';
    f.rain.visible = showRain; f.snow.visible = showSnow;
    if (!showRain && !showSnow) return;
    const c = Cam.target, n = Quality.level === 0 ? Math.floor(f.N * 0.45) : f.N;
    if (showRain) {
      f.rain.position.set(c.x, c.y, c.z);
      const a = f.rain.geometry.attributes.position, p = a.array, v = (ev && ev.storm ? 30 : 20) * dt;
      for (let i = 0; i < n; i++) { const o = i * 6; p[o + 1] -= v; p[o + 4] -= v; p[o] -= v * 0.07; p[o + 3] -= v * 0.07; if (p[o + 1] < 0) { const x = (Math.random() - 0.5) * f.box.x, z = (Math.random() - 0.5) * f.box.z; p[o] = x; p[o + 1] = f.box.y; p[o + 2] = z; p[o + 3] = x - 0.05; p[o + 4] = f.box.y - (ev && ev.storm ? 1 : 0.7); p[o + 5] = z; } }
      a.needsUpdate = true; f.rain.geometry.setDrawRange(0, n * 2);
    }
    if (showSnow) {
      f.snow.position.set(c.x, c.y, c.z); f.t += dt;
      const a = f.snow.geometry.attributes.position, p = a.array;
      for (let i = 0; i < n; i++) { const o = i * 3; p[o + 1] -= 1.6 * dt; p[o] += Math.sin(f.t * 0.8 + i) * 0.6 * dt; if (p[o + 1] < 0) { p[o] = (Math.random() - 0.5) * f.box.x; p[o + 1] = f.box.y; p[o + 2] = (Math.random() - 0.5) * f.box.z; } }
      a.needsUpdate = true; f.snow.geometry.setDrawRange(0, n);
    }
  },

  // ---------------- Döngü ----------------
  checkT: 1,
  Tick(dt) {
    this.checkT -= dt; if (this.checkT <= 0) { this.checkT = 1.5; this.CheckStars(); }
  },
  Frame(raw) { this.TickFX(Math.min(raw, 0.05) * (Time.timeScale || 0)); },

  // Menüdeki "Yıldızlar" bölümü
  RenderStars(body) {
    const n = Game.Stars, ev = this.Event, s = this.Season;
    const day = ((World.day - 1) % this.SeasonLen) + 1;
    const head = document.createElement('div'); head.className = 'stat';
    head.innerHTML = `<span>${s.icon} ${s.name} · ${day}/${this.SeasonLen}. gün</span><b>${UI.esc(Data.Weather[World.weather])}</b>`; body.appendChild(head);
    if (ev) { const e = document.createElement('div'); e.className = 'item'; e.innerHTML = `<div class="ic">${ev.icon}</div><div class="tx"><b>Bugün: ${UI.esc(ev.name)}</b><small>${UI.esc(ev.desc)}</small></div>`; body.appendChild(e); }
    const t = document.createElement('div'); t.className = 'stat';
    t.innerHTML = `<span>Misafir puanı</span><b>${this.Rating().toFixed(1).replace('.', ',')} / 5</b>`; body.appendChild(t);
    if (n >= 5) { const d = document.createElement('div'); d.className = 'item done'; d.innerHTML = `<div class="ic">🏆</div><div class="tx"><b>5 yıldızlı otel</b><small>En üst seviyedesin!</small></div>`; body.appendChild(d); return; }
    const box = document.createElement('div'); box.className = 'item';
    const rows = this.ReqList(n + 1).map(x => `<small>${x.ok ? "✅" : "⬜"} ${UI.esc(x.label)}: <span style="font-weight:800">${x.text}</span></small>`).join('');
    box.innerHTML = `<div class="ic">⭐</div><div class="tx"><b>${n + 1}. yıldız için</b>${rows}</div>`; body.appendChild(box);
  },
};
if (typeof window !== 'undefined') window.__L = Life; // test erişimi
