// Düğün: 3 yıldızdan sonra sabahları bazen bir çift otelde evlenmek ister. Çift lobide müdürü bekler (aşama 'meet'):
// müdür yanlarına gidip görüşür, süsleme ve paketi seçer, kapora hemen kasaya girer (aşama 'ok'). Tören aynı gün öğleden sonra
// otelin çatısındaki güney terasta (düğün salonu, deniz manzaralı) yapılır. Müdür katılırsa ödül ×1,5; törende çifte ilgi gösterirse
// (buket, kadeh, fotoğraf) her biri ödülü %10 artırır. Tören karakterleri sahne süsüdür: Game.guests içinde değildir, oda/ödeme almazlar.
// Kayıt: st.wedding = { day, couple, stage ('meet'|'ok'; eski kayıtta yok = 'ok'), theme, pack, deposit, care, attended, done }.
const Wedding = {
  Themes: [
    { name: 'Pembe ve beyaz', a: C(1, 0.62, 0.75), b: C(1, 1, 1), carpet: C(0.98, 0.85, 0.9) },
    { name: 'Altın ve beyaz', a: C(0.98, 0.8, 0.35), b: C(1, 1, 1), carpet: C(0.98, 0.95, 0.88) },
    { name: 'Lavanta', a: C(0.72, 0.6, 0.95), b: C(0.95, 0.92, 1), carpet: C(0.9, 0.86, 0.98) },
  ],
  // paketler: kapora ve ödül çarpanı, davetli sayısı, orkestra
  Packs: [
    { name: 'Sade', desc: 'Küçük aile düğünü, 6 davetli', mul: 1, rew: 1, guests: 6, band: 0, stars: 3 },
    { name: 'Yemekli', desc: 'Yemekli davet, 8 davetli', mul: 1.5, rew: 1.4, guests: 8, band: 0, stars: 3 },
    { name: 'Lüks', desc: 'Orkestralı büyük davet, 10 davetli', mul: 2.2, rew: 1.9, guests: 10, band: 3, stars: 4 },
  ],
  Couples: [['Zeynep', 'Emre'], ['Selin', 'Can'], ['Melis', 'Arda'], ['Deniz', 'Oğuz'], ['Burcu', 'Murat'], ['Gül', 'Tolga'], ['Ayşe', 'Mehmet'], ['Defne', 'Barış']],
  Reserved: ['Ece', 'Kaan', 'Nermin', 'Cem'], // mektup hikâyelerindeki adlar
  // terasın (çatı zemini, y=0) yerleşimi: takın ucu kuzeyde, koltuklar güneye dizili, deniz arkada
  X: 0, ArchZ: 8.9, CoupleZ: 9.7, Stand: { x: 0, z: 12.6 }, Seats: [], Met: { x: -4.2, z: 1.0 },
  Start: 0.50, Begin: 0.54, Party: 0.64, End: 0.68, Late: 0.69, MeetEnd: 0.49,
  Care: [{ t: 0.51, icon: '💐', text: 'Gelin buketini getir', done: 'Buket çok güzel!' }, { t: 0.565, icon: '🥂', text: 'Tebrik kadehi ikram et', done: 'Şerefe! Kadehler havada' }, { t: 0.62, icon: '📸', text: 'Hatıra fotoğrafı için yanlarına dur', done: 'Ne güzel bir fotoğraf!' }], CareLen: 0.05,
  phase: 0, root: null, meet: null, actors: [], mActors: [], t: 0, confT: 0, hallLamps: [], talking: false, careI: -1,

  get Plan() { const p = Game.st && Game.st.wedding; return p && !p.done ? p : null; },
  get Meeting() { const p = this.Plan; return !!p && p.stage === 'meet'; },
  get Busy() { return this.phase >= 1 && this.phase <= 3; },
  get RoofY() { return Hotel.FloorY(Hotel.RoofIndex); },
  Couple(manager) { const l = this.Couples.filter(c => !c.some(n => n === manager || this.Reserved.includes(n))); return Random.Pick(l.length ? l : this.Couples); },
  Deposit(pack) { return Math.round((350 + 120 * Game.Stars) * this.Packs[pack].mul / 10) * 10; },
  Reward(p) { return Math.round((600 + 250 * Game.Stars) * this.Packs[p.pack || 0].rew * (p.attended ? 1.5 : 1) * (1 + 0.1 * (p.care || 0))); },

  // ---------------- teras salonu (kalıcı yapı; çatı her kat alımında yeniden kurulur) ----------------
  BuildHall(g) {
    if (this.hallLamps.length) { const set = new Set(this.hallLamps); World.lamps = World.lamps.filter(l => !set.has(l)); this.hallLamps = []; }
    const D = Hotel.Deck, hx = D.hx, z0 = D.z0, z1 = D.z1, depth = z1 - z0, zc = (z0 + z1) / 2, y = Hotel.FloorY(Hotel.RoofIndex);
    // çatının ön korkuluğu (Hotel.BuildRoof'ta yok) terasın iki yanında kalır
    const pc = C(0.98, 0.95, 0.9), sideW = Hotel.W / 2 - hx;
    for (const s of [-1, 1]) U.Box('Parapet', g, V(s * (hx + sideW / 2), 0.5, Hotel.D / 2 - 0.12), V(sideW, 1, 0.25), pc);
    U.Prim('TerasDoseme', g, V(0, -0.15, zc), V(hx * 2, 0.3, depth), U.Mat(C(0.9, 0.88, 0.84)));
    U.Prim('TerasZemin', g, V(0, 0.012, zc), V(hx * 2 - 0.4, 0.02, depth - 0.4), U.Mat(C(0.86, 0.7, 0.54), { tex: U.WoodTex, tiling: { x: 9, y: 4 } })).castShadow = false;
    const wood = C(0.62, 0.45, 0.32), white = C(0.97, 0.96, 0.94), gold = C(0.95, 0.78, 0.35), cush = C(0.82, 0.76, 0.95), P = [], B = (pos, scale, c, geo = 'Cube', rot = 0) => P.push({ geo, pos, scale, c, rot });
    // korkuluk: ön ve yanlar
    const rz = z1 - 0.2, rx = hx - 0.2;
    for (let x = -rx; x <= rx + 0.01; x += 1.7) B(V(x, 0.5, rz), V(0.09, 1, 0.09), white);
    for (let z = z0 + 0.3; z < rz; z += 1.7) for (const s of [-1, 1]) B(V(s * rx, 0.5, z), V(0.09, 1, 0.09), white);
    B(V(0, 1.0, rz), V(rx * 2, 0.07, 0.1), wood); B(V(0, 0.5, rz), V(rx * 2, 0.04, 0.05), white);
    for (const s of [-1, 1]) { B(V(s * rx, 1.0, zc), V(0.1, 0.07, depth - 0.2), wood); B(V(s * rx, 0.5, zc), V(0.05, 0.04, depth - 0.2), white); }
    // çardak: 6 direk, uzun kirişler, enine çıtalar
    for (const s of [-1, 1]) for (const z of [z0 + 0.7, zc, z1 - 0.7]) B(V(s * (hx - 0.5), 1.65, z), V(0.16, 3.3, 0.16), wood);
    for (const s of [-1, 1]) B(V(s * (hx - 0.5), 3.35, zc), V(0.22, 0.16, depth - 1), wood);
    for (const z of [z0 + 0.7, z1 - 0.7]) B(V(0, 3.48, z), V(hx * 2 - 0.6, 0.08, 0.14), white);
    // sahne ve takı çerçevesi (çiçekler törende eklenir)
    B(V(this.X, 0.1, this.CoupleZ), V(5.2, 0.2, 2.8), C(0.93, 0.9, 0.86));
    for (const s of [-1, 1]) B(V(this.X + s * 1.35, 1.35, this.ArchZ), V(0.14, 2.7, 0.14), white);
    B(V(this.X, 2.7, this.ArchZ), V(2.9, 0.14, 0.14), white);
    for (let i = 0; i < 7; i++) { const k = (i - 3) / 3; B(V(this.X + k * 1.3, 2.78 + 0.16 * Math.cos(k * 1.5), this.ArchZ), V(0.1, 0.1, 0.1), gold, 'Sphere'); }
    // koltuklar (2 sütun × 4 sıra) ve gelin yolu kenarı; yüzleri kuzeye (takıya) bakar
    this.Seats = [];
    for (let r = 0; r < 4; r++) for (const x of [-2.0, -1.15, 1.15, 2.0]) {
      const z = 11.0 + r * 0.9; this.Seats.push({ x, z });
      B(V(x, 0.4, z), V(0.46, 0.06, 0.46), cush); B(V(x, 0.7, z + 0.21), V(0.46, 0.55, 0.05), white);
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) B(V(x + lx, 0.19, z + lz), V(0.04, 0.38, 0.04), wood);
    }
    // pasta masası ve üç katlı pasta
    B(V(4.2, 0.45, 9.0), V(1.5, 0.9, 0.8), white); B(V(4.2, 0.92, 9.0), V(1.6, 0.05, 0.9), gold);
    B(V(4.2, 1.1, 9.0), V(0.7, 0.3, 0.7), white, 'Cylinder'); B(V(4.2, 1.35, 9.0), V(0.5, 0.25, 0.5), C(1, 0.82, 0.88), 'Cylinder'); B(V(4.2, 1.56, 9.0), V(0.3, 0.2, 0.3), white, 'Cylinder'); B(V(4.2, 1.72, 9.0), V(0.1, 0.12, 0.1), C(0.95, 0.3, 0.4), 'Sphere');
    U.Merge('TerasYapi', g, P);
    // gelin yolu halısı (renk törende kuruluyor); masalar ve sandalyeler
    U.Flat('TerasHali', g, V(0, 0.03, 12.2), V(1.0, 0.02, 5.8), C(0.95, 0.9, 0.88));
    for (const s of [-1, 1]) for (const z of [10.6, 13.4]) {
      const x = s * 6.3; U.Model('tableRound', g, V(x, 0, z), 0, 1);
      U.Model('chairRounded', g, V(x - 0.95, 0, z), 90, 1); U.Model('chairRounded', g, V(x + 0.95, 0, z), 270, 1); U.Model('chairRounded', g, V(x, 0, z - 0.95), 180, 1);
      U.Box('Mum', g, V(x, 0.78, z), V(0.12, 0.12, 0.12), C(1, 0.9, 0.55), 'Sphere');
    }
    for (const x of [-8.2, 8.2]) U.Model('pottedPlant', g, V(x, 0, z0 + 0.8), 0, 1.1);
    U.Model('plantSmall2', g, V(-3.8, 0, 8.6), 0, 1.1); U.Model('plantSmall2', g, V(-3.1, 0, 8.4), 0, 1.0);
    U.Text(g, V(0, 1.55, rz), 'DÜĞÜN TERASI', 0.07, C(0.95, 0.78, 0.35), true, true);
    // ışık zinciri
    for (const z of [z0 + 0.7, z1 - 0.7]) for (let x = -hx + 1.2; x <= hx - 1.15; x += 1.55) { const m = U.Prim('Ampul', g, V(x, 3.2 - 0.12 * Math.abs(Math.sin(x)), z), V(0.13, 0.13, 0.13), U.Mat(C(1, 0.92, 0.6), { emission: 0.9 }), 'Sphere'); U.NoShadow(m); World.AddFixture(m, C(1, 0.9, 0.55), 0); }
    for (const [x, z] of [[0, zc], [-5.5, zc], [5.5, zc]]) { World.AddLamp(V(x, y + 2.8, z), 8, 0.9, C(1, 0.9, 0.65)); this.hallLamps.push(World.lamps[World.lamps.length - 1]); }
  },

  // ---------------- teklif, lobide görüşme ----------------
  NewDay() {
    const st = Game.st; if (st.wedding && st.wedding.day < World.day && !st.wedding.done) this.Finish(false, true); // kapalı kalan oyunda geçmiş düğün
    if (window.__noWedding || this.Plan || Game.Stars < 3 || World.day < 4 || !Random.Chance(0.3)) return false;
    return this.Offer();
  },
  // çift lobide müdürü bekler; müdür yanlarına gidince görüşme açılır
  Offer() {
    const couple = this.Couple(Game.st.manager);
    Game.st.wedding = { day: World.day, couple, stage: 'meet', attended: false, done: false, care: 0, pack: 0, theme: 0, deposit: 0 };
    UI.Toast('💍 ' + couple[0] + ' ve ' + couple[1] + ' düğün için seninle görüşmek istiyor', 'good'); UI.Hint('Çift lobide seni bekliyor', 5);
    Sfx.Play('bell', 0.6); Game.Save(); Game.RefreshFloors();
    return true;
  },
  SetupMeet() {
    this.ClearMeet(); const p = this.Plan; if (!p) return;
    const g = this.meet = U.Pivot(W, V(0, 0, 0), 'DugunGorusme'), M = this.Met;
    const mk = (look, x) => { const r = Rig.Model(g, look, 1.7); r.go.position.set(x, 0.05, M.z); setEuler(r.go, 0, 0, 0); this.mActors.push(r); return r; };
    mk('character-female-e', M.x - 0.4); mk('character-male-e', M.x + 0.4);
    U.Burst(V(M.x, 2.2, M.z), this.Themes[0].a, this.Themes[0].b, 30, 3);
  },
  ClearMeet() { if (this.meet) { Destroy(this.meet); this.meet = null; this.mActors = []; } },
  Talk() {
    const p = this.Plan; if (!p || p.stage !== 'meet' || this.talking) return; this.talking = true;
    const me = Game.st.manager || 'Müdür', c = p.couple, free = () => { this.talking = false; };
    const no = { text: 'Bu sefer olmaz', cls: 'ghost', act: () => { free(); this.Decline(); } };
    const themeBtn = i => ({ text: this.Themes[i].name + ' süsleme', cls: i === 0 ? 'gold' : 'sea', act: () => this.PickPack(i) });
    UI.Dialog({ tag: 'DÜĞÜN GÖRÜŞMESİ 💬', title: c[0] + ' ve ' + c[1], html: `<p>“Merhaba ${UI.esc(me)}! Çatıdaki deniz manzaralı teras salonunuzda evlenmek istiyoruz. Düğünümüz bugün öğleden sonra olsun. Nasıl bir süsleme önerirsin?”</p>`, buttons: [themeBtn(0), themeBtn(1), themeBtn(2), no] });
  },
  PickPack(theme) {
    const p = this.Plan; if (!p) { this.talking = false; return; }
    const btn = i => { const k = this.Packs[i], ok = Game.Stars >= k.stars; return { text: k.name + ' · kapora ' + UI.fmt(this.Deposit(i)) + (ok ? '' : ' (' + k.stars + ' yıldız gerekir)'), cls: i === 0 ? 'gold' : i === 1 ? 'mint' : 'pink', disabled: !ok, act: () => { this.talking = false; this.Accept(theme, i); } }; };
    UI.Dialog({ tag: 'DÜĞÜN PAKETİ', title: this.Themes[theme].name, html: `<p>“Çok güzel olur! Bir de paketi seçelim. Kapora hemen kasana girer, tören bitince büyük bir ödül bırakırız. Törende yanımızda olursan ve bizimle ilgilenirsen çok mutlu oluruz.”</p>${this.Packs.map(k => `<div class="stat"><span>${k.name} · ${k.desc}</span><b>×${k.rew}</b></div>`).join('')}`, buttons: [btn(0), btn(1), btn(2), { text: 'Vazgeç', cls: 'ghost', act: () => { this.talking = false; this.Decline(); } }] });
  },
  Decline() { const p = this.Plan; if (!p) return; p.done = true; this.ClearMeet(); UI.Toast('Çift başka otel arayacak 😔', 'info'); Game.Save(); Game.RefreshFloors(); },
  Accept(theme, pack) {
    const st = Game.st, p = st.wedding; if (!p) return; const deposit = this.Deposit(pack);
    Object.assign(p, { stage: 'ok', theme, pack, deposit, care: 0, attended: false });
    st.money += deposit; Sfx.Play('coin', 0.7); this.ClearMeet();
    UI.Toast('💍 Düğün bugün öğleden sonra çatı terasında: ' + this.Themes[theme].name, 'good');
    Social.Share('Bugün {otel} çatı terasında bir düğün var! ' + p.couple[0] + ' ♥ ' + p.couple[1], 1, false);
    Game.Save(); Game.RefreshFloors();
  },

  // ---------------- tören sahnesi (çatı terası) ----------------
  Setup() {
    this.Clear(); const p = this.Plan; if (!p) return; const th = this.Themes[p.theme], X = this.X, Z = this.ArchZ, pk = this.Packs[p.pack || 0], y0 = 0.2;
    const g = this.root = U.Pivot(W, V(0, this.RoofY, 0), 'Dugun');
    U.Flat('GelinYolu', g, V(X, 0.045, 12.2), V(1.0, 0.02, 5.8), th.carpet);
    for (let z = 9.6; z <= 14.9; z += 0.55) for (const s of [-1, 1]) U.Box('YolCicek', g, V(X + s * 0.62, 0.15, z), V(0.18, 0.18, 0.18), (Math.round(z * 10) % 2) ? th.a : th.b, 'Sphere');
    for (let i = 0; i < 9; i++) { const k = (i - 4) / 4; U.Box('TakCicek', g, V(X + k * 1.3, 2.62 + 0.16 * Math.cos(k * 1.6), Z), V(0.3, 0.3, 0.3), i % 2 ? th.a : th.b, 'Sphere'); }
    for (const s of [-1, 1]) for (let y = 0.45; y < 2.6; y += 0.5) U.Box('DirekCicek', g, V(X + s * 1.35, y, Z), V(0.24, 0.24, 0.24), th.a, 'Sphere');
    for (const s of [-1, 1]) for (let x = 0.4; x <= 2.5; x += 0.55) U.Box('SahneCicek', g, V(X + s * x, 0.3, Z + 1.35), V(0.2, 0.2, 0.2), (Math.round(x * 10) % 2) ? th.b : th.a, 'Sphere');
    for (const s of this.Seats) if (Math.abs(s.x) > 2) U.Box('KoltukCicek', g, V(s.x + Math.sign(s.x) * 0.3, 0.5, s.z), V(0.14, 0.14, 0.14), th.a, 'Sphere');
    for (const [x, z] of [[-6.3, 10.6], [-6.3, 13.4], [6.3, 10.6], [6.3, 13.4]]) U.Box('MasaCicek', g, V(x, 0.95, z), V(0.26, 0.2, 0.26), th.a, 'Sphere');
    const mk = (look, x, z, yaw, h = 1.7, y = 0.05, act = 0) => { const r = Rig.Model(g, look, h); r.go.position.set(x, y, z); setEuler(r.go, 0, yaw, 0); r.act = act; r.seat = act === Rig.Act.Sit; r.Tick(0); Tween.Pop(r.go, 0); this.actors.push(r); return r; };
    this.bride = mk('character-female-e', X - 0.45, this.CoupleZ, 0, 1.7, y0 + 0.05); this.groom = mk('character-male-e', X + 0.45, this.CoupleZ, 0, 1.7, y0 + 0.05);
    const looks = Rig.Guests;
    for (let i = 0; i < pk.guests; i++) { const s = this.Seats[i]; mk(Random.Pick(looks), s.x, s.z, 180, 1.6 + Random.Range(-0.1, 0.1), 0.4, Rig.Act.Sit); }
    for (let i = 0; i < pk.band; i++) mk(Random.Pick(looks), -5.4 + i * 0.75, 9.2, 0, 1.65, 0.05);
    this.phase = 1; this.careI = -1; this._cared = []; Sfx.Play('unlock', 0.6); U.Burst(V(X, this.RoofY + 2.6, Z), th.a, th.b, 60, 4);
    UI.Toast('💍 Düğün çatı terasında hazırlandı! Müdür katılsın', 'good'); Game.RefreshFloors();
  },
  Clear() { if (this.root) Destroy(this.root); this.root = null; this.actors = []; this.bride = this.groom = null; },
  Attend() {
    if (this.Meeting) { Game.player.GoTo(V(this.Met.x + 0.4, 0, this.Met.z + 1.5), 0); UI.Hint(Game.st.manager + ' çiftin yanına gidiyor', 3); return; }
    const f = Hotel.RoofIndex; Hotel.SetView(f); if (Game.player.floor !== f) { if (!Game.player.RideLift(f)) Game.player.GoTo(Hotel.Lift(f), f); }
    Game.player.GoTo(V(this.Stand.x, 0, this.Stand.z), f); UI.Hint(Game.st.manager + ' düğüne gidiyor', 3);
  },

  OnDeck() { const P = Game.player; return P.floor === Hotel.RoofIndex && P.go.position.z > Hotel.D / 2 && Math.abs(P.go.position.x) < Hotel.Deck.hx; },
  NearCouple() { const P = Game.player; return P.floor === Hotel.RoofIndex && Math.hypot(P.go.position.x - this.X, P.go.position.z - this.CoupleZ) < 3.6; },
  // ---------------- döngü ----------------
  Tick(dt) {
    const p = this.Plan, t = World.time;
    if (!p) { if (this.root || this.meet) { this.Clear(); this.ClearMeet(); this.phase = 0; } return; }
    if (p.stage === 'meet') { this.TickMeet(p, t); return; }
    if (World.day > p.day || (World.day === p.day && t >= this.Late && this.phase === 0)) { this.Finish(false, true); return; } // oyun kapalıyken geçti
    if (World.day !== p.day) return;
    if (this.phase === 0 && t >= this.Start && t < this.Late) this.Setup();
    if (this.phase === 1 && t >= this.Begin) { this.phase = 2; Sfx.Play('ding', 0.7); UI.Toast('💒 Tören başladı', 'info'); }
    if (this.phase === 2 && t >= this.Party) { this.phase = 3; this.Celebrate(); }
    if (this.phase === 3 && t >= this.End) { this.Finish(!!p.attended, false); return; }
    if (this.phase >= 2 && this.OnDeck()) p.attended = true;
    if (this.root) {
      this.root.position.y = this.RoofY; this.root.visible = Hotel.view === Hotel.RoofIndex;
      this.t -= dt; if (this.t <= 0) { this.t = 0.4; for (const r of this.actors) { r.act = r.seat ? Rig.Act.Sit : this.phase === 3 ? Rig.Act.Cheer : Rig.Act.None; r.Tick(0); } }
      if (this.phase === 3) { this.confT -= dt; if (this.confT <= 0) { this.confT = 1.6; const th = this.Themes[p.theme]; U.Burst(V(this.X + Random.Range(-1, 1), this.RoofY + 2.8, this.ArchZ + 0.8), th.a, th.b, 40, 5); } }
    }
    if (this.phase >= 1 && this.phase <= 3) this.TickCare(p, t);
    if (this.phase >= 1 && this.phase <= 3 && !this.OnDeck()) {
      if (Hotel.view === Hotel.RoofIndex) UI.Label('dugun', V(this.X, this.RoofY + 3.8, this.ArchZ), '💍 Düğüne katıl', 'need', () => this.Attend());
      else UI.Label('dugun', V(Hotel.Lift(Hotel.view).x, Hotel.FloorY(Hotel.view) + 3.2, 0), '💍 Düğün çatıda · çık', 'need', () => this.Attend());
    }
  },
  // törende çifte ilgi: sırayla üç istek; zamanında yanlarına giden müdür çifti mutlu eder
  TickCare(p, t) {
    const c = this.Care; let i = -1; for (let k = 0; k < c.length; k++) if (t >= c[k].t && t < Math.min(c[k].t + this.CareLen, this.End)) i = k;
    if (i !== this.careI) { if (i >= 0 && !this.cared[i]) { Sfx.Play('bell', 0.5); UI.Toast(c[i].icon + ' ' + c[i].text, 'info'); } this.careI = i; }
    if (i < 0 || this.cared[i]) return;
    if (this.NearCouple()) { this.cared[i] = true; p.care = (p.care || 0) + 1; Sfx.Play('heart', 0.8); UI.Toast(c[i].icon + ' ' + c[i].done + ' (çift mutlu)', 'good'); const th = this.Themes[p.theme]; U.Burst(V(this.X, this.RoofY + 2.2, this.CoupleZ), th.a, th.b, 40, 4); return; }
    if (Hotel.view === Hotel.RoofIndex) UI.Label('ilgi', V(this.X, this.RoofY + 3.0, this.CoupleZ), c[i].icon + ' ' + c[i].text, 'buy', () => { Game.player.GoTo(V(this.X, 0, this.CoupleZ + 2.0), Hotel.RoofIndex); });
  },
  get cared() { return this._cared || (this._cared = []); },
  TickMeet(p, t) {
    if (World.day > p.day || (World.day === p.day && t >= this.MeetEnd) || (World.day === p.day && t < 0.2)) { // bekleyip vazgeçtiler
      p.done = true; this.ClearMeet(); if (World.day === p.day) UI.Toast('Çift beklemekten vazgeçti 😔', 'info'); Game.Save(); Game.RefreshFloors(); return;
    }
    if (this.talking && !UI.dialogs.length) this.talking = false;
    if (!this.meet) this.SetupMeet();
    if (this.meet) this.meet.visible = Hotel.view === 0;
    const P = Game.player, M = this.Met;
    if (P.floor === 0 && Math.hypot(P.go.position.x - M.x, P.go.position.z - M.z) < 2.8 && !UI.Blocking && !this.talking) this.Talk();
    if (Hotel.view === 0) UI.Label('gorus', V(M.x, 2.5, M.z), '💬 Düğün için görüş', 'need', () => this.Attend());
    else UI.Label('gorus', V(Hotel.Lift(Hotel.view).x, Hotel.FloorY(Hotel.view) + 3.2, 0), '💬 Çift lobide bekliyor', 'need', () => this.Attend());
  },
  Celebrate() { const th = this.Themes[this.Plan.theme]; Sfx.Play('unlock', 0.9); U.Burst(V(this.X, this.RoofY + 2.8, this.ArchZ + 0.8), th.a, th.b, 160, 7); UI.Toast('🎉 Evet dediler!', 'good'); },
  Finish(attended, unseen) {
    const st = Game.st, p = st.wedding; if (!p || p.done) return;
    if (p.stage === 'meet') { p.done = true; this.ClearMeet(); Game.Save(); return; } // görüşme hiç yapılmadı
    p.done = true; p.attended = !!attended;
    const n = this.Reward(p), care = p.care || 0;
    Game.Earn(n, V(this.X, this.RoofY + 1.4, this.ArchZ + 1), 0);
    st.rep += p.attended ? 12 : 8; st.weddings = (st.weddings || 0) + 1;
    Social.Share('{otel} muhteşemdi! ' + p.couple[0] + ' ve ' + p.couple[1] + ' hayatlarının en güzel gününü yaşadı ♥', 1, false);
    Album.Memory('💍', p.couple[0] + ' ve ' + p.couple[1] + ' otelinde evlendi');
    this.Clear(); this.phase = 0; this._cared = []; this.careI = -1; Game.Save(); Game.RefreshFloors();
    UI.Dialog({ tag: 'DÜĞÜN BİTTİ 💍', title: p.couple[0] + ' ♥ ' + p.couple[1], html: `<p>${p.attended ? 'Törende yanlarındaydın ve konuşman çok güzeldi! Çift çok mutlu.' : unseen ? 'Düğün sen yokken yapıldı ama herkes çok memnun kaldı.' : 'Törene yetişemedin ama herkes çok memnun kaldı.'}</p>${care ? `<p>Çiftle ilgilendin (${care}/3): ödül ${care * 10}% arttı.</p>` : ''}<div class="stat"><span>Düğün ödülü (bankoda toplanır)</span><b>${UI.fmt(n)}</b></div><div class="stat"><span>Ün</span><b>+${p.attended ? 12 : 8}</b></div>${p.attended ? '' : '<p>İpucu: Bir dahaki düğünde törene katılırsan ödül %50 artar.</p>'}`, buttons: [{ text: 'Ne güzel!', cls: 'gold' }] });
  },
};
if (typeof window !== 'undefined') window.__Wedding = Wedding;
