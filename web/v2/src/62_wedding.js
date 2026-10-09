// Düğün: 3 yıldızdan sonra sabahları bazen bir çift otelde evlenmek ister. Kabul edilirse kapora hemen gelir,
// öğleden sonra otelin karşısındaki meydanda takı, gelin yolu ve davetliler kurulur; tören yapılır, büyük ödül gelir.
// Töreni Elif izlerse (yakında durursa) ödül büyür. Tören karakterleri sahne süsüdür: Game.guests içinde değildir, oda/ödeme almazlar.
const Wedding = {
  Themes: [
    { name: 'Pembe ve beyaz', a: C(1, 0.62, 0.75), b: C(1, 1, 1), carpet: C(0.98, 0.85, 0.9) },
    { name: 'Altın ve beyaz', a: C(0.98, 0.8, 0.35), b: C(1, 1, 1), carpet: C(0.98, 0.95, 0.88) },
    { name: 'Lavanta', a: C(0.72, 0.6, 0.95), b: C(0.95, 0.92, 1), carpet: C(0.9, 0.86, 0.98) },
  ],
  Couples: [['Zeynep', 'Emre'], ['Selin', 'Can'], ['Melis', 'Arda'], ['Deniz', 'Oğuz'], ['Burcu', 'Murat'], ['Gül', 'Tolga'], ['Ayşe', 'Mehmet'], ['Defne', 'Barış']],
  Reserved: ['Ece', 'Kaan', 'Nermin', 'Cem'], // mektup hikâyelerindeki adlar
  // sahne: meydanın batı karosu (yaya yolundan görünür, yürünebilir sınırın hemen önünde)
  X: -6, ArchZ: 16.0, Stand: { x: -6, z: 14.4 },
  Start: 0.50, Begin: 0.54, Party: 0.64, End: 0.68, Late: 0.69,
  phase: 0, root: null, actors: [], t: 0, confT: 0,

  get Plan() { const p = Game.st && Game.st.wedding; return p && !p.done ? p : null; },
  get Busy() { return this.phase >= 1 && this.phase <= 3; },
  Couple(manager) { const l = this.Couples.filter(c => !c.some(n => n === manager || this.Reserved.includes(n))); return Random.Pick(l.length ? l : this.Couples); },

  // yeni gün: koşullar uygunsa teklif
  NewDay() {
    const st = Game.st; if (st.wedding && st.wedding.day < World.day && !st.wedding.done) this.Finish(false, true); // kapalı kalan oyunda geçmiş düğün
    if (window.__noWedding || this.Plan || Game.Stars < 3 || World.day < 4 || !Random.Chance(0.3)) return false;
    return this.Offer();
  },
  Offer(force) {
    const couple = this.Couple(Game.st.manager), deposit = Math.round((350 + 120 * Game.Stars) / 10) * 10;
    const btn = i => ({ text: this.Themes[i].name + ' süsleme', cls: i === 0 ? 'gold' : 'sea', act: () => this.Accept(i, couple, deposit) });
    UI.Dialog({ tag: 'DÜĞÜN TEKLİFİ 💍', title: couple[0] + ' ve ' + couple[1], html: `<p>Bugün öğleden sonra otelinin karşısındaki meydanda evlenmek istiyorlar!</p><p>Kapora hemen kasana girer: <b>${UI.fmt(deposit)}</b>. Tören bitince büyük bir ödül bırakırlar. Törende sen de bulunursan çok daha mutlu olurlar.</p><p>Hangi süslemeyi istersin?</p>`, buttons: [btn(0), btn(1), btn(2), { text: 'Bu sefer olmaz', cls: 'ghost' }] });
    return true;
  },
  Accept(theme, couple, deposit) {
    const st = Game.st; st.wedding = { day: World.day, theme, couple, deposit, attended: false, done: false };
    st.money += deposit; Sfx.Play('coin', 0.7);
    UI.Toast('💍 Düğün bugün öğleden sonra: ' + this.Themes[theme].name, 'good');
    Social.Share('Bugün {otel} yakınında bir düğün var! ' + couple[0] + ' ♥ ' + couple[1], 1, false);
    Game.Save();
  },

  // ---------------- sahne ----------------
  Setup() {
    this.Clear(); const p = this.Plan; if (!p) return; const th = this.Themes[p.theme], X = this.X, Z = this.ArchZ;
    const g = this.root = U.Pivot(W, V(0, 0, 0), 'Dugun');
    U.Flat('GelinYolu', g, V(X, 0.05, Z + 2.4), V(1.3, 0.02, 4.4), th.carpet);
    for (let z = Z + 0.4; z <= Z + 4.4; z += 0.5) for (const s of [-1, 1]) U.Box('YolCicek', g, V(X + s * 0.85, 0.2, z), V(0.2, 0.2, 0.2), (Math.round(z * 10) % 2) ? th.a : th.b, 'Sphere');
    for (const s of [-1, 1]) U.Box('TakDirek', g, V(X + s * 1.2, 1.25, Z), V(0.13, 2.5, 0.13), th.b, 'Cylinder');
    U.Box('TakUst', g, V(X, 2.5, Z), V(2.6, 0.13, 0.13), th.b);
    for (let i = 0; i < 9; i++) { const k = (i - 4) / 4; U.Box('TakCicek', g, V(X + k * 1.25, 2.45 + 0.18 * Math.cos(k * 1.6), Z), V(0.3, 0.3, 0.3), i % 2 ? th.a : th.b, 'Sphere'); }
    for (const s of [-1, 1]) for (let y = 0.4; y < 2.4; y += 0.55) U.Box('DirekCicek', g, V(X + s * 1.2, y, Z), V(0.24, 0.24, 0.24), th.a, 'Sphere');
    const mk = (look, x, z, yaw, h = 1.7) => { const r = Rig.Model(g, look, h); r.go.position.set(x, 0.05, z); setEuler(r.go, 0, yaw, 0); Tween.Pop(r.go, 0); this.actors.push(r); return r; };
    this.bride = mk('character-female-e', X - 0.4, Z + 0.7, 0); this.groom = mk('character-male-e', X + 0.4, Z + 0.7, 0);
    const looks = Rig.Guests, n = 8;
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2); mk(Random.Pick(looks), X + side * (1.7 + 0.1 * row), Z + 1.6 + 0.85 * row, side > 0 ? -90 : 90, 1.6 + Random.Range(-0.1, 0.1)); }
    // sahne sırasına göre zil sesi ve parıltı
    this.phase = 1; Sfx.Play('unlock', 0.6); U.Burst(V(X, 2.4, Z), th.a, th.b, 60, 4);
    UI.Toast('💍 Düğün hazırlandı! Meydanda tören başlıyor', 'good'); Game.RefreshFloors();
  },
  Clear() { if (this.root) Destroy(this.root); this.root = null; this.actors = []; this.bride = this.groom = null; },
  Attend() { Game.player.GoTo(V(this.Stand.x, 0, this.Stand.z), 0); UI.Hint('Elif düğüne gidiyor', 3); },

  Near() { const P = Game.player; return P.floor === 0 && Math.hypot(P.go.position.x - this.X, P.go.position.z - this.ArchZ) < 6; },
  // ---------------- döngü ----------------
  Tick(dt) {
    const p = this.Plan, st = Game.st, t = World.time;
    if (!p) { if (this.root) { this.Clear(); this.phase = 0; } return; }
    if (World.day > p.day || (World.day === p.day && t >= this.Late && this.phase === 0)) { this.Finish(false, true); return; } // oyun kapalıyken geçti
    if (World.day !== p.day) return;
    if (this.phase === 0 && t >= this.Start && t < this.Late) this.Setup();
    if (this.phase === 1 && t >= this.Begin) { this.phase = 2; Sfx.Play('ding', 0.7); UI.Toast('💒 Tören başladı', 'info'); }
    if (this.phase === 2 && t >= this.Party) { this.phase = 3; this.Celebrate(); }
    if (this.phase === 3 && t >= this.End) { this.Finish(this.attended(p), false); return; }
    if (this.phase >= 2 && this.Near()) p.attended = true;
    if (this.root) {
      this.root.visible = Hotel.view === 0;
      this.t -= dt; if (this.t <= 0) { this.t = 0.4; for (const r of this.actors) { r.act = this.phase === 3 ? Rig.Act.Cheer : Rig.Act.None; r.Tick(0); } }
      if (this.phase === 3) { this.confT -= dt; if (this.confT <= 0) { this.confT = 1.6; const th = this.Themes[p.theme]; U.Burst(V(this.X + Random.Range(-1, 1), 2.6, this.ArchZ + 0.8), th.a, th.b, 40, 5); } }
    }
    if (this.phase >= 1 && this.phase <= 3 && Hotel.view === 0 && !this.Near()) UI.Label('dugun', V(this.X, 3.3, this.ArchZ), '💍 Düğüne katıl', 'need', () => this.Attend());
  },
  attended(p) { return !!p.attended; },
  Celebrate() { const th = this.Themes[this.Plan.theme]; Sfx.Play('unlock', 0.9); U.Burst(V(this.X, 2.6, this.ArchZ + 0.8), th.a, th.b, 160, 7); UI.Toast('🎉 Evet dediler!', 'good'); },
  Finish(attended, unseen) {
    const st = Game.st, p = st.wedding; if (!p || p.done) return;
    p.done = true; const th = this.Themes[p.theme];
    const base = 600 + 250 * Game.Stars, n = Math.round(base * (attended ? 1.5 : 1));
    const pos = V(this.X, 1.2, this.ArchZ + 1);
    Game.Earn(n, pos, 0);
    st.rep += attended ? 12 : 8; st.weddings = (st.weddings || 0) + 1;
    Social.Share('{otel} muhteşemdi! ' + p.couple[0] + ' ve ' + p.couple[1] + ' hayatlarının en güzel gününü yaşadı ♥', 1, false);
    Album.Memory('💍', p.couple[0] + ' ve ' + p.couple[1] + ' otelinde evlendi');
    this.Clear(); this.phase = 0; Game.Save(); Game.RefreshFloors();
    UI.Dialog({ tag: 'DÜĞÜN BİTTİ 💍', title: p.couple[0] + ' ♥ ' + p.couple[1], html: `<p>${attended ? 'Törende yanlarındaydın ve konuşman çok güzeldi! Çift çok mutlu.' : unseen ? 'Düğün sen yokken yapıldı ama herkes çok memnun kaldı.' : 'Törene yetişemedin ama herkes çok memnun kaldı.'}</p><div class="stat"><span>Düğün ödülü (bankoda toplanır)</span><b>${UI.fmt(n)}</b></div><div class="stat"><span>Ün</span><b>+${attended ? 12 : 8}</b></div>${attended ? '' : '<p>İpucu: Bir dahaki düğünde törene katılırsan ödül %50 artar.</p>'}`, buttons: [{ text: 'Ne güzel!', cls: 'gold' }] });
  },
};
if (typeof window !== 'undefined') window.__Wedding = Wedding;
