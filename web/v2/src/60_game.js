// Oyun yöneticisi: durum, kayıt, misafir akışı, para, görevler, arayüz bağlantıları
const Game = {
  st: null, player: null, guests: [], queue: [], staff: [], spawnT: 4, tillAge: 0, pile: [], pileN: -1, pads: new Map(), shownMoney: 0, saveT: 5,
  NightLen: 36,  // bir gece (saniye)
  loaded: false,

  Default() {
    return { v: 2, name: 'Lavanta Oteli', manager: 'Elif', look: 'character-female-a', money: Data.StartMoney, rep: 0, day: 1, time: 0.33, floors: 1, rooms: { 10: 0 }, staff: { receptionist: false, cleaners: 0, bellhops: 0 }, served: 0, earned: 0, lost: 0, questIdx: 0, questDone: false, sound: true, followers: 50, ach: {}, achInit: false, memories: [], chain: {}, chainEarned: 0, dayLog: [], earnedMark: 0, chats: 0, replies: 0, photos: 0, repairs: 0, weddings: 0, seasonsSeen: [], flags: {}, feed: [], letters: [], arcs: {}, unread: 0, unreadL: 0, postSeq: 0, tutorial: 0, staffData: {}, facilities: {}, extraStaff: {}, upg: {}, comp: {}, till: 0 };
  },

  Boot() {
    const saved = Store.Get('game');
    this.st = Object.assign(this.Default(), saved || {});
    if (saved && saved.rooms) this.st.rooms = Object.assign({}, saved.rooms);
    if (this.st.stars == null) this.st.stars = saved ? Mathf.Clamp(1 + Math.floor((this.st.rep || 0) / 40), 1, 5) : 1;
    if (saved && saved.weather) World.weather = saved.weather;
    World.day = this.st.day; World.time = this.st.time;
    Hotel.Build(this.st);
    this.player = new Player(this.st.look, this.st.manager);
    Cam.follow = this.player.go; Cam.target.copy(this.player.go.position);
    for (let i = 0; i < this.st.staff.cleaners; i++) this.AddStaff('cleaner', false);
    for (let i = 0; i < this.st.staff.bellhops; i++) this.AddStaff('bellhop', false);
    if (this.st.staff.receptionist) this.AddStaff('receptionist', false);
    for (const role of Object.keys(this.st.extraStaff || {})) for (let i = 0; i < this.st.extraStaff[role]; i++) this.AddStaff(role, false);
    Facilities.Boot();
    this.st.upg = this.st.upg || {}; this.st.comp = this.st.comp || {}; this.st.till = this.st.till || 0; this.tillAge = 0; this.RefreshPile();
    Social.Defaults(); Social.GetSample();
    this.BindUI();
    this.loaded = true;
    this.RefreshFloors();
    Input.tapHandlers.push((x, y) => this.OnTap(x, y));
    Life.ApplySeasonLook();
    if (!saved) this.Tutorial(0);
  },

  // ---------------- Kayıt ----------------
  Save() {
    if (!this.loaded) return;
    this.st.day = World.day; this.st.time = World.time; this.st.weather = World.weather;
    const rooms = {}; for (const r of Hotel.rooms.values()) if (r.level >= 0) { const prev = this.st.rooms[r.id]; rooms[r.id] = (prev && typeof prev === 'object') ? Object.assign(prev, { lv: r.level }) : r.level; } this.st.rooms = rooms;
    Store.Set('game', this.st); Store.Save();
  },
  Reset() { Album.Clear(); Store.DeleteAll(); Cloud.Wipe(); location.reload(); },

  // ---------------- Döngü ----------------
  Tick(dt) {
    if (!this.loaded) return;
    this.saveT -= dt; if (this.saveT <= 0) { this.saveT = 5; this.Save(); }
    // misafir üretimi
    const open = this.OpenRooms().length;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = Random.Range(7, 12) / Math.pow(Math.max(1, open), 0.55) * (World.IsNight ? Life.NightMul() : 1) / Life.SpawnMul();
      if (this.guests.length < open + 3 && this.queue.length < 6 && !Wedding.Busy) this.Spawn();
    }
    // oyuncu işleri: banko, temizlik, istek
    this.PlayerWork(dt);
    this.TillTick(dt);
    Facilities.Tick(dt);
    Life.Tick(dt);
    Ach.Tick(dt);
    Wedding.Tick(dt);
    for (const [k, p] of this.pads) { p.t -= dt; if (p.t <= 0) { p.pad.Show(false); } }
  },
  Frame(raw) {
    Life.Frame(raw);
    this.shownMoney += (this.st.money - this.shownMoney) * Math.min(1, raw * 10);
    if (Math.abs(this.shownMoney - this.st.money) < 0.6) this.shownMoney = this.st.money;
    const q = this.Quest();
    UI.Hud({ name: this.st.name, stars: this.Stars, rating: this.Rating, day: World.day, clock: World.Clock, weather: World.WeatherText, event: Life.Event, guests: this.guests.length, rooms: this.OpenRooms().length + '/' + (Hotel.floors * 10), money: this.shownMoney, rep: this.st.rep, menuBadge: 0, socialBadge: (this.st.unread || 0) + (this.st.unreadL || 0), quest: q ? { text: q.text, progress: Mathf.Clamp01(q.cur() / q.target), done: q.cur() >= q.target, reward: q.reward } : null });
    this.Labels();
    for (const c of this.pile) c.visible = Hotel.view === 0;
    // isim etiketleri: sadece bakılan kattakiler (ya da dışarıdakiler) görünsün
    const v = Hotel.view, onView = e => (e.floor === v) || (e.floor === 0 && e.pos.z > Hotel.D / 2);
    const show = e => { const ok = onView(e) && e.liftT <= 0; if (e.tag) e.tag.obj.visible = ok; e.rig.inner.visible = ok; if (e.follower) e.follower.rig.inner.visible = ok; };
    for (const g of this.guests) show(g); for (const s of this.staff) show(s);
    if (this.player) { const P = this.player, riding = P.liftT > 0 && P.liftPhase >= 1 && P.liftPhase < 3; P.tag.obj.visible = onView(P) && !riding; P.rig.inner.visible = !riding && (onView(P) || P.liftT > 0); }
  },
  get Stars() { return Mathf.Clamp(this.st.stars || 1, 1, 5); },
  get Rating() { return Life.Rating(); },

  // ---------------- Odalar ----------------
  OpenRooms() { return [...Hotel.rooms.values()].filter(r => r.level >= 0); },
  DirtyRooms() { return this.OpenRooms().filter(r => r.state === 'dirty'); },
  RequestRooms() { return this.OpenRooms().filter(r => r.request); },
  FreeRoom(g) {
    const free = this.OpenRooms().filter(r => r.state === 'clean' && r.hasBed !== false);
    if (!free.length) return null;
    free.sort((a, b) => (Math.abs(a.level - g.wantLevel) - Math.abs(b.level - g.wantLevel)) || (a.floor - b.floor));
    return free[0];
  },
  NextRoom() {
    for (let f = 1; f <= Hotel.floors; f++) for (let s = 0; s < 10; s++) { const r = Hotel.Room(Hotel.RoomId(f, s)); if (r && r.level < 0) return r; }
    return null;
  },
  NextRoomCost() { return Data.RoomCost(this.OpenRooms().length); },
  BuyRoom(r) {
    const cost = this.NextRoomCost();
    if (!r || r.level >= 0 || !this.Pay(cost)) return false;
    r.level = 0; r.state = 'clean'; this.st.rooms[r.id] = 0;
    const g = r.group; const old = g.children.filter(c => c.name === 'Beton' || c.name === 'cardboardBoxClosed'); for (const o of old) Destroy(o);
    Hotel.Furnish(r); Tween.Pop(g, 0.3);
    U.Burst(V(r.x, Hotel.FloorY(r.floor) + 1, r.z), C(1, 0.85, 0.3), C(0.5, 0.9, 1), 60, 5);
    Sfx.Play('build', 0.7); UI.Toast('Oda ' + r.number + ' açıldı!', 'good'); this.Save(); this.RefreshFloors();
    if (UI.SheetIs('İnşa')) UI.RenderSheet();
    return true;
  },
  UpgradeRoom(r) {
    if (r.level < 0 || r.level >= 2 || r.state === 'occupied') return false;
    const cost = Data.RoomLevels[r.level + 1].cost;
    if (!this.Pay(cost)) return false;
    r.level++; this.st.rooms[r.id] = r.level; Hotel.Furnish(r); Tween.Pop(r.group, 0.6);
    U.Burst(V(r.x, Hotel.FloorY(r.floor) + 1, r.z), C(1, 0.6, 0.8), C(1, 0.9, 0.5), 50, 5);
    Sfx.Play('unlock', 0.7); UI.Toast('Oda ' + r.number + ' artık ' + Data.RoomLevels[r.level].name, 'good'); this.Save();
    if (UI.SheetOpen) UI.RenderSheet();
    return true;
  },
  BuyFloor() {
    if (Hotel.floors >= Data.Floor.Max) return false;
    const cost = Data.FloorCost(Hotel.floors + 1);
    if (!this.Pay(cost)) return false;
    this.st.floors = Hotel.floors + 1;
    Hotel.AddFloor(this.st);
    U.Burst(V(0, Hotel.FloorY(Hotel.floors) + 1.5, 0), C(1, 0.85, 0.3), C(1, 0.5, 0.7), 160, 7);
    Sfx.Play('unlock', 0.8); UI.Toast((Hotel.floors) + '. kat açıldı! Yeni odalar hazır', 'good'); this.Save(); this.RefreshFloors();
    if (UI.SheetOpen) UI.RenderSheet();
    return true;
  },

  // ---------------- Para ----------------
  Pay(n) { if (this.st.money < n) { UI.Toast('Yeterli paran yok (' + UI.fmt(n) + ')', 'bad'); Sfx.Play('bad', 0.5); return false; } this.st.money -= n; Sfx.Play('coin', 0.5); return true; },
  Earn(n, pos, tip = 0) {
    this.st.till += n + tip; this.st.earned += n + tip;
    Tween.FloatText(pos, '+' + UI.fmt(n), C(0.45, 1, 0.55), 0.12);
    if (tip > 0) Tween.FloatText(Vec.add(pos, V(0.6, 0.5, 0)), '♥ bahşiş ' + UI.fmt(tip), C(1, 0.6, 0.75), 0.09);
    Sfx.Play('coin', 0.7);
    const to = this.PilePos();
    for (let i = 0; i < Math.min(6, 1 + Math.round(n / 40)); i++) { const c = U.Prim('Para', W, Vec.add(pos, V(Random.Range(-0.3, 0.3), Random.Range(-0.2, 0.3), Random.Range(-0.3, 0.3))), V(0.3, 0.06, 0.3), U.Mat(C(1, 0.82, 0.25), 0.6), 'Cylinder'); U.NoShadow(c); Tween.Fly(c, null, to, i * 0.06); }
    if (!this.tillHinted) { this.tillHinted = true; UI.Hint('Kazanç resepsiyon bankosunda birikir: yanına gidince toplanır (' + Data.TillAuto + ' sn sonra kendiliğinden de geçer)', 5); }
  },
  // ---- Bankodaki para yığını ----
  PilePos() { const d = Hotel.Lobby.desk; return V(d.x - 0.3, 1.25, d.z + 0.1); },
  RefreshPile() {
    const n = Math.min(30, Math.ceil(this.st.till / 40));
    if (n === this.pileN) return; this.pileN = n;
    for (const c of this.pile) Destroy(c); this.pile = [];
    const d = Hotel.Lobby.desk, mat = U.Mat(C(1, 0.82, 0.25), 0.6);
    for (let i = 0; i < n; i++) { const col = i % 5, h = Math.floor(i / 5); const c = U.Prim('ParaYigin', W, V(d.x - 0.9 + col * 0.34 + (h % 2) * 0.05, 1.18 + h * 0.07, d.z + 0.1 + (col % 2) * 0.05), V(0.3, 0.06, 0.3), mat, 'Cylinder'); U.NoShadow(c); this.pile.push(c); }
  },
  CollectTill() {
    const n = Math.floor(this.st.till); if (n <= 0) return;
    this.st.till = 0; this.st.money += n; this.tillAge = 0;
    const from = this.PilePos();
    for (let i = 0; i < 6; i++) { const c = U.Prim('Para', W, Vec.add(from, V(Random.Range(-0.5, 0.5), 0, Random.Range(-0.2, 0.2))), V(0.3, 0.06, 0.3), U.Mat(C(1, 0.82, 0.25), 0.6), 'Cylinder'); U.NoShadow(c); Tween.Fly(c, this.player.go, null, i * 0.05); }
    Tween.FloatText(Vec.add(this.player.pos, V(0, 2.4, 0)), '💰 ' + UI.fmt(n), C(1, 0.9, 0.4), 0.12);
    Sfx.Play('coin', 0.8); this.RefreshPile();
  },
  TillTick(dt) {
    if (this.st.till > 0) {
      this.tillAge += dt;
      const P = this.player;
      if (this.tillAge > Data.TillAuto || (P && P.floor === 0 && P.liftT <= 0 && P.Near(Hotel.Lobby.desk, 3))) this.CollectTill();
    } else this.tillAge = 0;
    this.RefreshPile();
  },

  // ---------------- Yükseltmeler ----------------
  UpgLv(k) { return (this.st.upg && this.st.upg[k]) || 0; },
  UpgMul(k) { return 1 + Data.Upgrades[k].step * this.UpgLv(k); },
  BuyUpgrade(k) {
    const u = Data.Upgrades[k], lv = this.UpgLv(k); if (lv >= u.cost.length) return false;
    if (!this.Pay(u.cost[lv])) return false;
    this.st.upg[k] = lv + 1; Sfx.Play('unlock', 0.6); UI.Toast(u.icon + ' ' + u.name + ' seviye ' + (lv + 1), 'good');
    U.Burst(Vec.add(this.player.pos, V(0, 1.2, 0)), C(1, 0.85, 0.3), C(0.5, 0.9, 1), 30, 4); this.Save(); if (UI.SheetOpen) UI.RenderSheet(); return true;
  },
  // Oda parçaları: yatak/TV/banyo seviyeleri (oda sınıfı yükselince de korunur)
  PartLv(r, i) { const c = this.st.comp && this.st.comp[r.id]; return (c && c[i]) || 0; },
  PartPriceMul(r) { let m = 1; Data.RoomParts.forEach((p, i) => m += p.price * this.PartLv(r, i)); return m; },
  PartSat(r) { let s = 0; Data.RoomParts.forEach((p, i) => s += p.sat * this.PartLv(r, i)); return s; },
  BuyPart(r, i) {
    const p = Data.RoomParts[i], lv = this.PartLv(r, i); if (r.level < 0 || lv >= p.cost.length) return false;
    if (!this.Pay(p.cost[lv])) return false;
    const c = this.st.comp[r.id] = this.st.comp[r.id] || [0, 0, 0]; c[i] = lv + 1;
    Sfx.Play('unlock', 0.5); UI.Toast('Oda ' + r.number + ': ' + p.name + ' seviye ' + (lv + 1), 'good');
    U.Burst(V(r.x, Hotel.FloorY(r.floor) + 1, r.z), C(1, 0.8, 0.5), C(1, 0.95, 0.8), 25, 3); this.Save(); if (UI.SheetOpen) UI.RenderSheet(); return true;
  },

  // ---------------- Misafirler ----------------
  Spawn(typeId) {
    const stars = this.Stars;
    const pool = Data.Guests.filter(t => !t.minStars || stars >= t.minStars);
    let type = typeId ? Data.Guests.find(t => t.id === typeId) : null;
    if (!type) { const wt = t => t.w * Life.TypeMul(t.id); let sum = 0; for (const t of pool) sum += wt(t); let k = Math.random() * sum; for (const t of pool) { k -= wt(t); if (k <= 0) { type = t; break; } } type = type || pool[0]; }
    const g = new Guest(type); this.guests.push(g); Social.MaybeArc(g); return g;
  },
  Queue(g) { this.queue.push(g); this.Reflow(); },
  Dequeue(g) { const i = this.queue.indexOf(g); if (i >= 0) { this.queue.splice(i, 1); this.Reflow(); } },
  Reflow() { this.queue.forEach((g, i) => { if (g.slot !== i) g.GoToSlot(i); }); },
  OnGuestGone(g) { const i = this.guests.indexOf(g); if (i >= 0) this.guests.splice(i, 1); },
  LostGuest(g) { this.st.lost++; this.st.rep = Math.max(0, this.st.rep - 2 * (g.type.repMul || 1)); if (g.type.id === 'mufettis') this.st.rep = Math.max(0, this.st.rep - 6); UI.Toast(g.name + ' beklemekten sıkılıp gitti', 'bad'); },
  OnCheckIn(g) { },
  OnRequest(r) { Sfx.Play('bell', 0.4); },
  OnCheckoutStart(g) { },
  OnGuestPaid(g, sat) {
    this.st.served++;
    Life.AddSat(sat);
    Social.OnPaid(g, sat, g.room);
    const t = g.type;
    const d = (sat >= 4 ? 3 : sat >= 3 ? 1.5 : sat >= 2 ? 0 : -2) * (t.repMul || 1);
    this.st.rep = Math.max(0, this.st.rep + d);
    if (t.id === 'milyoner') {
      if (sat >= 4.3) { (this.st.flags = this.st.flags || {}).milyoner = true; const b = 200 * this.Stars; this.Earn(0, Vec.add(g.pos, V(0, 2.2, 0)), b); UI.Dialog({ tag: 'SÜRPRİZ', title: '🎩 Gizli milyoner!', html: `<p>Turist sandığın ${UI.esc(g.name)} aslında bir milyonermiş. Otelini çok sevdi ve <b>${UI.fmt(b)}</b> bahşiş bıraktı!</p>`, buttons: [{ text: 'Vay be!', cls: 'gold' }] }); }
      else UI.Toast('🎩 ' + g.name + ' gizli bir milyonermiş... ama pek etkilenmedi', 'info');
    }
    if (t.id === 'mufettis') {
      if (sat >= 4) { (this.st.flags = this.st.flags || {}).mufettis = true; this.st.rep += 12; UI.Dialog({ tag: 'MÜFETTİŞ RAPORU', title: '🕵 Harika rapor!', html: `<p>İş insanı sandığın ${UI.esc(g.name)} bir otel müfettişiymiş. Raporu çok iyi: <b>Ün +12</b></p>`, buttons: [{ text: 'Süper', cls: 'gold' }] }); }
      else if (sat < 3) { this.st.rep = Math.max(0, this.st.rep - 8); UI.Toast('🕵 Bir müfettiş memnun ayrılmadı: Ün -8', 'bad'); }
      else UI.Toast('🕵 Bir müfettiş otelini inceledi: rapor orta', 'info');
    }
    if (t.id === 'fenomen' && sat >= 4) UI.Toast('🤳 ' + g.name + ' otelini takipçilerine anlattı! Ün +' + Math.round(d), 'good');
    if (t.id === 'huysuz' && sat >= 4) UI.Toast('😤→😊 ' + g.name + ' bile memnun kaldı!', 'good');
    if (sat >= 4.5) U.Burst(Vec.add(g.pos, V(0, 1.8, 0)), C(1, 0.5, 0.7), C(1, 0.9, 0.5), 20, 3);
    if (this.st.served === 1) this.Tutorial(3);
  },

  // ---------------- Oyuncunun işleri ----------------
  ShowProgress(pos, t) {
    const key = pos.x.toFixed(1) + ',' + pos.y.toFixed(1) + ',' + pos.z.toFixed(1);
    let p = this.pads.get(key);
    if (!p) { p = { pad: new ProgressPad(W, V(pos.x, pos.y + 0.02, pos.z), 0.7, C(0.1, 0.12, 0.2, 0.5), C(0.45, 0.95, 0.6)), t: 0 }; this.pads.set(key, p); }
    p.pad.Show(true); p.pad.Set(t); p.t = 0.3;
  },
  PlayerWork(dt) {
    const P = this.player; if (!P || P.liftT > 0) return;
    // 1) resepsiyon: bankonun arkasında dur
    if (P.floor === 0 && P.Near(Hotel.Lobby.deskBack, 1.9)) {
      const g = this.queue[0];
      const recep = this.staff.find(s => s.role === 'receptionist');
      if (g && g.slot === 0 && Vec.flat(g.pos, Hotel.QueueSlot(0)) < 0.6 && !recep) {
        const room = this.FreeRoom(g);
        if (room) { P.work = (P.work || 0) + dt / 1.1; this.ShowProgress(Hotel.Lobby.desk, P.work); if (P.work >= 1) { P.work = 0; g.Assign(room); Sfx.Play('ding', 0.5); if (this.st.tutorial < 2) this.Tutorial(2); } }
        else UI.Hint('Boş temiz oda yok: kirli odaları temizle ya da yeni oda aç', 2);
        return;
      }
    }
    P.work = 0;
    // 2) odada: temizlik ya da istek
    if (P.floor >= 1) {
      const r = Hotel.RoomAt(P.go.position, P.floor);
      if (r && r.level >= 0) {
        if (r.request && !(r.request.claimed)) {
          P.work2 = (P.work2 || 0) + dt / 1.2; this.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), P.work2);
          if (P.work2 >= 1) { P.work2 = 0; this.RequestDone(r, true); }
          return;
        }
        if (r.state === 'broken') {
          P.rig.act = Rig.Act.Clean;
          P.work2 = (P.work2 || 0) + dt / 3; this.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), P.work2);
          if (P.work2 >= 1) { P.work2 = 0; Life.FixRoom(r); P.rig.act = Rig.Act.None; }
          return;
        }
        if (r.state === 'dirty' && !r.claimed) {
          P.rig.act = Rig.Act.Clean;
          P.work2 = (P.work2 || 0) + dt / 2.4; this.ShowProgress(V(r.x, Hotel.FloorY(r.floor), r.z), P.work2);
          if (P.work2 >= 1) { P.work2 = 0; this.CleanDone(r, true); P.rig.act = Rig.Act.None; }
          return;
        }
      }
    }
    if (P.rig.act === Rig.Act.Clean) P.rig.act = Rig.Act.None;
    P.work2 = 0;
  },
  CleanDone(r, byPlayer) {
    r.state = 'clean'; r.dirt = 0; if (r.mess) r.mess.visible = false;
    U.Burst(V(r.x, Hotel.FloorY(r.floor) + 1, r.z), C(0.8, 0.95, 1), C(1, 1, 1), 25, 3);
    Sfx.Play('clean', 0.6);
    if (byPlayer && this.st.tutorial < 4) this.Tutorial(4);
  },
  RequestDone(r, byPlayer) {
    const q = r.request; if (!q) return; r.request = null;
    const g = q.guest; if (alive(g)) { g.sat += 0.5; g.tips += q.def.tip; g.ShowMood('♥', C(1, 0.5, 0.7)); }
    Tween.FloatText(V(r.x, Hotel.FloorY(r.floor) + 1.8, r.z), q.def.icon + ' +' + UI.fmt(q.def.tip) + ' bahşiş', C(1, 0.7, 0.85), 0.1);
    Sfx.Play('heart', 0.6);
  },

  // ---------------- Personel ----------------
  StaffCount(role) { return role === 'receptionist' ? (this.st.staff.receptionist ? 1 : 0) : role === 'cleaner' ? this.st.staff.cleaners : role === 'bellhop' ? this.st.staff.bellhops : ((this.st.extraStaff || {})[role] || 0); },
  AddStaff(role, pay = true) {
    const def = Data.Staff[role];
    const n = this.StaffCount(role);
    const cost = Array.isArray(def.cost) ? def.cost[n] : def.cost;
    if (pay) { if (cost === undefined) return false; if (!this.Pay(cost)) return false; }
    const key = role + n;
    if (!this.st.staffData) this.st.staffData = {};
    const s = new Staff(role, key); this.staff.push(s);
    if (pay) {
      if (role === 'receptionist') this.st.staff.receptionist = true; else if (role === 'cleaner') this.st.staff.cleaners++; else if (role === 'bellhop') this.st.staff.bellhops++; else { this.st.extraStaff = this.st.extraStaff || {}; this.st.extraStaff[role] = (this.st.extraStaff[role] || 0) + 1; }
      UI.Toast(s.name + ' işe başladı: ' + def.name, 'good'); Sfx.Play('unlock', 0.6); this.Save();
      Tween.Pop(s.go, 0.2); U.Burst(Vec.add(s.pos, V(0, 1.5, 0)), C(1, 0.85, 0.3), C(0.5, 1, 0.7), 40, 4);
      if (UI.SheetOpen) UI.RenderSheet();
    }
    return true;
  },

  // ---------------- Gün ----------------
  OnNewDay() {
    this.st.day = World.day;
    let wages = 0;
    for (const s of this.staff) { wages += s.Wage; s.NewDay(); }
    wages += Facilities.Wages();
    this.st.money = Math.max(0, this.st.money - wages);
    const prevSeason = this.st.season;
    const ev = Life.StartDay(); const season = Life.Season; this.st.season = season.id;
    this.st.seasonsSeen = this.st.seasonsSeen || []; if (!this.st.seasonsSeen.includes(season.id)) this.st.seasonsSeen.push(season.id);
    const chain = Chain.NewDay();
    Wedding.NewDay();
    const chainHtml = chain.out.map(o => `<div class="item"><div class="ic">${o.c.icon}</div><div class="tx"><b>${o.c.name} şubesi +${UI.fmt(o.n)}</b><small>${UI.esc(o.line)}</small></div></div>`).join('');
    const nxt = Game.Stars < 5 ? Life.ReqList(Game.Stars + 1) : [];
    const seasonHtml = prevSeason && prevSeason !== season.id ? `<p><b>${season.icon} ${season.name} geldi!</b></p>` : '';
    const evHtml = ev ? `<div class="item"><div class="ic">${ev.icon}</div><div class="tx"><b>${UI.esc(ev.name)}</b><small>${UI.esc(ev.desc)}</small></div></div>` : '';
    const starHtml = nxt.length ? `<div class="stat"><span>${Game.Stars + 1}. yıldız şartları</span><b>${nxt.filter(x => x.ok).length}/${nxt.length}</b></div>` : '';
    UI.Dialog({ tag: 'YENİ GÜN', title: 'Gün ' + World.day, html: `${seasonHtml}<p>${season.icon} ${season.name} · ${UI.esc(Data.Weather[World.weather])}</p>${evHtml}${chainHtml}<div class="stat"><span>Ağırlanan misafir</span><b>${this.st.served}</b></div><div class="stat"><span>Toplam kazanç</span><b>${UI.fmt(this.st.earned)}</b></div><div class="stat"><span>Maaşlar</span><b>-${UI.fmt(wages)}</b></div><div class="stat"><span>Ün</span><b>${Math.round(this.st.rep)} · ${'★'.repeat(this.Stars)}</b></div>${starHtml}`, buttons: [{ text: 'Güne başla', cls: 'gold' }] });
    this.Save();
  },

  // ---------------- Görevler ----------------
  Quests: [
    { text: '3 misafir ağırla', cur: () => Game.st.served, target: 3, reward: 60 },
    { text: 'İkinci odayı aç', cur: () => Game.OpenRooms().length, target: 2, reward: 80 },
    { text: 'Bir odayı temizle', cur: () => Game.st.cleaned || 0, target: 1, reward: 50 },
    { text: '4 oda aç', cur: () => Game.OpenRooms().length, target: 4, reward: 150 },
    { text: 'Bir resepsiyonist işe al', cur: () => Game.st.staff.receptionist ? 1 : 0, target: 1, reward: 150 },
    { text: 'Bir odayı Deluxe yap', cur: () => Game.OpenRooms().filter(r => r.level >= 1).length, target: 1, reward: 250 },
    { text: 'Bir odayı dekore et (konfor 60)', cur: () => Math.max(0, ...Game.OpenRooms().map(r => { const z = Decor.Zone('oda' + r.id); return z ? Decor.Comfort(z) : 0; })), target: 60, reward: 300 },
    { text: '15 misafir ağırla', cur: () => Game.st.served, target: 15, reward: 300 },
    { text: 'Bir temizlikçi işe al', cur: () => Game.st.staff.cleaners, target: 1, reward: 200 },
    { text: '2 yıldızlı otel ol (Menü → Otel)', cur: () => Game.Stars, target: 2, reward: 400 },
    { text: '2. katı aç', cur: () => Hotel.floors, target: 2, reward: 600 },
    { text: '10 oda aç', cur: () => Game.OpenRooms().length, target: 10, reward: 800 },
    { text: '40 misafir ağırla', cur: () => Game.st.served, target: 40, reward: 900 },
    { text: 'Bir odayı Suit yap', cur: () => Game.OpenRooms().filter(r => r.level >= 2).length, target: 1, reward: 1200 },
    { text: '3 yıldızlı otel ol', cur: () => Game.Stars, target: 3, reward: 1500 },
    { text: '3. katı aç', cur: () => Hotel.floors, target: 3, reward: 2500 },
    { text: '4 yıldızlı otel ol', cur: () => Game.Stars, target: 4, reward: 4000 },
    { text: '5 yıldızlı otel ol', cur: () => Game.Stars, target: 5, reward: 10000 },
  ],
  Quest() { return this.Quests[this.st.questIdx] || null; },
  ClaimQuest() {
    const q = this.Quest(); if (!q || q.cur() < q.target) return;
    this.st.money += q.reward; this.st.questIdx++; Sfx.Play('unlock', 0.8);
    U.Burst(Vec.add(this.player.go.position, V(0, 2, 0)), C(1, 0.85, 0.3), C(0.5, 1, 0.6), 60, 5);
    UI.Toast('Görev tamamlandı: +' + UI.fmt(q.reward), 'good'); this.Save();
  },

  // ---------------- Öğretici ----------------
  Tutorial(step) {
    const T = this.st.tutorial; this.st.tutorial = step;
    const msgs = {
      0: { tag: 'HOŞ GELDİN', title: 'Lavanta Oteli senin!', body: 'Anneannenden kalan bu küçük oteli yeniden canlandıracaksın. Karakterini ekranda parmağını sürükleyerek (ya da WASD ile) yürüt.\n\nİlk misafir yolda: resepsiyon bankosunun ARKASINA git ve onu karşıla.', buttons: [{ text: 'Başlayalım!', cls: 'gold', act: () => UI.Hint('Resepsiyonun arkasında dur: misafiri odaya sen yerleştirirsin', 8) }] },
      2: { tag: 'HARİKA', title: 'İlk misafirin odasına çıkıyor', body: 'Misafir 1. kattaki odasına asansörle çıkıyor. Konaklarken odanın üstünde bir istek (havlu, su, kahve) belirirse odaya gidip hallet: bahşiş kazanırsın.\n\nSağdaki kat düğmeleriyle katları görebilirsin.', buttons: [{ text: 'Tamam', cls: 'gold' }] },
      3: { tag: 'PARA KAZANDIN', title: 'İlk kazancın!', body: 'Misafir çıkışta ödedi. Çıkan misafirin odası kirlenir: odaya girip temizle (ya da ileride temizlikçi tut).\n\nParan birikince "İnşa" düğmesinden yeni oda aç.', buttons: [{ text: 'Tamam', cls: 'gold' }] },
      4: { tag: 'TERTEMİZ', title: 'Oda hazır', body: 'Temizlik tamam. Artık yeni misafir yerleşebilir. Görev kartındaki hedefleri tamamlayıp ödül al; yeni oda ve kat açtıkça otel büyür, yıldızın artar.', buttons: [{ text: 'Devam', cls: 'gold' }] },
    };
    if (msgs[step] && step > T || step === 0) UI.Dialog(msgs[step]);
    if (step === 4) this.st.cleaned = (this.st.cleaned || 0) + 1;
    this.Save();
  },

  // ---------------- Dokunma ve etiketler ----------------
  OnTap(x, y) {
    if (UI.Blocking || Decor.active) return;
    if (UI.SheetOpen) { UI.CloseSheet(); return; }
    const f = Hotel.view <= Hotel.floors + 1 ? Hotel.view : 0;
    const pt = Cam.ScreenToPlane(x, y, Hotel.FloorY(f));
    if (!pt) return;
    // misafire dokunma: bilgi
    for (const g of this.guests) if (Math.abs(g.pos.y - pt.y) < 1 && Vec.flat(g.pos, pt) < 1.1) { Chat.StartGuest(g); return; }
    const r = Hotel.RoomAt(pt, f);
    if (r && r.level < 0) { this.OfferRoom(r); return; }
    if (r && r.level >= 0 && this.player.floor === f && Vec.flat(this.player.go.position, pt) < 1.2) { this.RoomSheet(r); return; }
    if (Hotel.Walkable(pt, f)) { this.player.GoTo(pt, f); Sfx.Play('tap', 0.3); }
    else if (r && r.level >= 0) { this.player.GoTo(r.inside, f); }
  },
  OfferRoom(r) {
    const next = this.NextRoom(); const cost = this.NextRoomCost();
    if (next !== r) { UI.Toast('Önce Oda ' + next.number + ' açılmalı (sırayla)', 'info'); return; }
    UI.Dialog({ tag: 'İNŞA', title: 'Oda ' + r.number + ' açılsın mı?', big: '🛏', body: 'Standart oda: gecelik ' + UI.fmt(Data.RoomLevels[0].price) + '. Bedeli ' + UI.fmt(cost) + '.', buttons: [{ text: 'Aç  ' + UI.fmt(cost), cls: 'mint', act: () => this.BuyRoom(r), disabled: this.st.money < cost }, { text: 'Vazgeç', cls: 'ghost' }] });
  },
  RoomSheet(r) {
    const lv = Data.RoomLevels[r.level];
    UI.Sheet({ title: 'Oda ' + r.number, sub: lv.name + ' · gecelik ' + UI.fmt(lv.price), render: body => {
      body.innerHTML = `<div class="stat"><span>Durum</span><b>${r.state === 'occupied' ? '👤 ' + (r.guest ? r.guest.name : 'dolu') : r.state === 'dirty' ? '🧹 Kirli' : r.state === 'broken' ? '🔧 Arızalı: içeri gir, tamir et' : '✨ Temiz ve boş'}</b></div>`;
      const z = Decor.Zone('oda' + r.id); const dk = document.createElement('div'); dk.className = 'item'; dk.innerHTML = `<div class="ic">🎨</div><div class="tx"><b>Dekore et</b><small>Konfor ${z ? Decor.Comfort(z) : 0} · gecelik ${UI.fmt(Decor.RoomPrice(r))}. Mobilya, duvar ve zemin seç.</small></div>`; const db = document.createElement('button'); db.className = 'pink'; db.textContent = 'Aç'; db.disabled = r.state === 'occupied'; db.addEventListener('click', () => Decor.Enter('oda' + r.id)); dk.appendChild(db); body.appendChild(dk);
      Data.RoomParts.forEach((p, i) => {
        const lv = this.PartLv(r, i), max = p.cost.length, d = document.createElement('div'); d.className = 'item' + (lv >= max ? ' done' : '');
        const eff = [p.price ? '+%' + Math.round(p.price * 100) + ' fiyat' : '', p.sat ? 'memnuniyet' : ''].filter(Boolean).join(' · ');
        d.innerHTML = `<div class="ic">${p.icon}</div><div class="tx"><b>${p.name} <span class="chip">${lv}/${max}</span></b><small>Her seviye: ${eff}</small></div>`;
        if (lv < max) { const b = document.createElement('button'); b.className = 'gold'; b.textContent = UI.fmt(p.cost[lv]); b.addEventListener('click', () => this.BuyPart(r, i)); d.appendChild(b); }
        body.appendChild(d);
      });
      if (r.level < 2) { const n = Data.RoomLevels[r.level + 1]; const b = document.createElement('div'); b.className = 'item'; b.innerHTML = `<div class="ic">${n.icon}</div><div class="tx"><b>${n.name} yap</b><small>Gecelik ${UI.fmt(n.price)}. Oda hazır mobilyayla yeniden döşenir.</small></div>`; const bt = document.createElement('button'); bt.className = 'gold'; bt.textContent = UI.fmt(n.cost); bt.disabled = r.state === 'occupied'; bt.addEventListener('click', () => this.UpgradeRoom(r)); b.appendChild(bt); body.appendChild(b); }
    } });
  },
  Labels() {
    const f = Hotel.view;
    Social.Frame();
    // açılabilir oda etiketi
    const next = this.NextRoom();
    if (next && next.floor === f) UI.Label('buy', V(next.x, Hotel.FloorY(f) + 1.4, next.z), '➕ Oda aç ' + UI.fmt(this.NextRoomCost()), 'buy', () => this.OfferRoom(next));
    for (const r of Hotel.rooms.values()) {
      if (r.floor !== f || r.level < 0) continue;
      if (r.request) UI.Label('rq' + r.id, V(r.x, Hotel.FloorY(f) + 1.6, r.z), r.request.def.icon + ' ' + r.request.def.name, 'need', () => this.player.GoTo(r.inside, r.floor));
      else if (r.state === 'broken') UI.Label('br' + r.id, V(r.x, Hotel.FloorY(f) + 1.6, r.z), '🔧 Tamir et', 'need', () => this.player.GoTo(r.inside, r.floor));
      else if (r.state === 'dirty') UI.Label('dt' + r.id, V(r.x, Hotel.FloorY(f) + 1.6, r.z), '🧹 Temizle', '', () => this.player.GoTo(r.inside, r.floor));
    }
    const hasRecep = !!this.staff.find(s => s.role === 'receptionist');
    if (f === 0 && this.queue.length && (!hasRecep || this.queue.length >= 3)) UI.Label('desk', V(0, 2.6, -3.6), '🛎 ' + this.queue.length + (hasRecep ? ' misafir sırada' : ' misafir bekliyor'), hasRecep ? '' : 'need', () => this.player.GoTo(Hotel.Lobby.deskBack, 0));
    if (f === 0) this.queue.forEach((g, i) => {
      const k = Mathf.Clamp01(1 - g.waited / g.patience), col = k > 0.5 ? '#5fd68a' : k > 0.25 ? '#f2b84b' : '#ef6b6b';
      UI.Label('qp' + i, Vec.add(g.pos, V(0, 2.5, 0)), `<span style="display:inline-block;width:44px;height:7px;border-radius:4px;background:rgba(0,0,0,.25);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(k * 100)}%;background:${col}"></i></span>`, '');
    });
    if (f === 0 && this.st.till > 0) UI.Label('till', V(Hotel.Lobby.desk.x - 0.3, 1.9, Hotel.Lobby.desk.z), '💰 ' + UI.fmt(this.st.till) + ' · topla', 'buy', () => this.player.GoTo(Hotel.Lobby.deskFront, 0));
    if (f === Hotel.floors + 1 && !Data.Facilities.some(d => d.floor === 'roof' && Facilities.Built(d.id))) UI.Label('roof', V(0, Hotel.FloorY(f) + 1.5, 0), '🌿 Çatı · İnşa → Tesisler', '', () => this.BuildSheet('tesis'));
  },
  OnViewChanged() { this.RefreshFloors(); },
  // Resepsiyona git: hangi katta olursa olsun asansörle lobiye iner, bankonun arkasına yürür
  GoReception() {
    const P = this.player; if (!P) return;
    if (P.floor === 0 && P.Near(Hotel.Lobby.deskBack, 1.2)) { UI.Hint('Zaten resepsiyondasın', 2); return; }
    P.GoTo(Hotel.Lobby.deskBack, 0); Sfx.Play('tap', 0.4);
    UI.Hint(P.floor === 0 ? 'Resepsiyona gidiliyor' : 'Asansörle lobiye inip resepsiyona gidiliyor', 3);
  },
  RefreshFloors() {
    const list = [{ i: 0, label: 'Z', name: 'Zemin' }];
    for (let f = 1; f <= Hotel.floors; f++) list.push({ i: f, label: String(f), name: f + '. kat' });
    list.push({ i: Hotel.floors + 1, label: '⌂', name: 'Çatı' });
    if (Hotel.floors < Data.Floor.Max) list.push({ i: -1, label: '+', name: 'Yeni kat', locked: true });
    list.unshift({ i: -2, label: '🛎', name: 'Resepsiyona git', desk: true });
    if (Wedding.Busy) list.unshift({ i: -3, label: '💍', name: 'Düğüne git', desk: true });
    UI.Floors(list, Hotel.view, i => {
      if (i === -1) { this.BuildSheet('kat'); return; }
      if (i === -2) { this.GoReception(); return; }
      if (i === -3) { Wedding.Attend(); return; }
      Hotel.SetView(i);
      if (this.player.floor !== i && i <= Hotel.floors + 1) { if (!this.player.RideLift(i)) this.player.GoTo(Hotel.Lift(i), i); UI.Hint('Elif asansörle ' + (i === 0 ? 'lobiye' : i > Hotel.floors ? 'çatıya' : i + '. kata') + ' geliyor', 3); }
      Sfx.Play('tap', 0.4);
    });
  },

  // ---------------- Arayüz ----------------
  BindUI() {
    const q = UI.byId;
    q('b-menu').addEventListener('click', () => this.MenuSheet());
    q('b-build').addEventListener('click', () => this.BuildSheet());
    q('b-social').addEventListener('click', () => Social.Open());
    q('b-photo').addEventListener('click', () => Photo.Take());
    q('q-claim').addEventListener('click', () => this.ClaimQuest());
    q('b-rotl').addEventListener('click', () => Cam.Rotate(-1)); q('b-rotr').addEventListener('click', () => Cam.Rotate(1)); q('b-zin').addEventListener('click', () => Cam.Zoom(0.78)); q('b-zout').addEventListener('click', () => Cam.Zoom(1.28)); q('b-zreset').addEventListener('click', () => Cam.Reset());
  },
  BuildSheet(tab) {
    UI.Sheet({ title: 'İnşa', tabs: [{ id: 'oda', label: '🛏 Odalar' }, { id: 'kat', label: '🏢 Katlar' }, { id: 'tesis', label: '🏊 Tesisler' }], tab, render: (body, t) => {
      if (t === 'tesis') { Facilities.Sheet(body); return; }
      if (t === 'oda') {
        const next = this.NextRoom();
        const it = document.createElement('div'); it.className = 'item';
        it.innerHTML = next ? `<div class="ic">➕</div><div class="tx"><b>Yeni oda: ${next.number}</b><small>${next.floor}. katta standart oda. Sırayla açılır.</small></div>` : `<div class="ic">🏢</div><div class="tx"><b>Bu katlar dolu</b><small>Yeni oda için yeni kat aç.</small></div>`;
        if (next) { const b = document.createElement('button'); b.className = 'mint'; b.textContent = UI.fmt(this.NextRoomCost()); b.addEventListener('click', () => { this.BuyRoom(next); }); it.appendChild(b); }
        body.appendChild(it);
        for (const r of this.OpenRooms()) {
          const lv = Data.RoomLevels[r.level]; const d = document.createElement('div'); d.className = 'item';
          d.innerHTML = `<div class="ic">${lv.icon}</div><div class="tx"><b>Oda ${r.number} · ${lv.name}</b><small>Gecelik ${UI.fmt(lv.price)} · ${r.state === 'occupied' ? 'dolu' : r.state === 'dirty' ? 'kirli' : 'temiz'}</small></div>`;
          if (r.level < 2) { const b = document.createElement('button'); b.className = 'gold'; b.textContent = Data.RoomLevels[r.level + 1].name + ' ' + UI.fmt(Data.RoomLevels[r.level + 1].cost); b.disabled = r.state === 'occupied'; b.addEventListener('click', () => this.UpgradeRoom(r)); d.appendChild(b); }
          body.appendChild(d);
        }
      } else {
        const d = document.createElement('div'); d.className = 'item';
        if (Hotel.floors < Data.Floor.Max) { const c = Data.FloorCost(Hotel.floors + 1); d.innerHTML = `<div class="ic">🏢</div><div class="tx"><b>${Hotel.floors + 1}. katı aç</b><small>10 yeni oda yeri. Otel yükselir, çatı yukarı taşınır.</small></div>`; const b = document.createElement('button'); b.className = 'mint'; b.textContent = UI.fmt(c); b.addEventListener('click', () => this.BuyFloor()); d.appendChild(b); }
        else d.innerHTML = `<div class="ic">🏢</div><div class="tx"><b>Otel en yüksek katında</b><small>Çatı tesisleri yakında.</small></div>`;
        body.appendChild(d);
        for (let f = 1; f <= Hotel.floors; f++) { const n = [...Hotel.rooms.values()].filter(r => r.floor === f && r.level >= 0).length; const e = document.createElement('div'); e.className = 'stat'; e.innerHTML = `<span>${f}. kat</span><b>${n}/10 oda</b>`; body.appendChild(e); }
      }
    } });
  },
  MenuSheet(tab) {
    UI.Sheet({ title: this.st.name, sub: 'Gün ' + World.day + ' · ' + '★'.repeat(this.Stars), tabs: [{ id: 'otel', label: '🏨 Otel' }, { id: 'personel', label: '👥 Personel' }, { id: 'gelisim', label: '⚡ Gelişim' }, { id: 'gorev', label: '🎯 Görevler' }, { id: 'basarim', label: '🏆 Başarım' }, { id: 'album', label: '📸 Albüm' }, { id: 'zincir', label: '🏙 Zincir' }, { id: 'ayar', label: '⚙ Ayarlar' }], tab, render: (body, t) => {
      if (t === 'otel') {
        const lb = document.createElement('div'); lb.className = 'item'; lb.innerHTML = `<div class="ic">🎨</div><div class="tx"><b>Lobiyi dekore et</b><small>Bekleme salonuna mobilya ve dekor yerleştir.</small></div>`; const lbb = document.createElement('button'); lbb.className = 'pink'; lbb.textContent = 'Aç'; lbb.addEventListener('click', () => Decor.Enter('lobi')); lb.appendChild(lbb);
        body.innerHTML = `<div class="stat"><span>Ün</span><b>${Math.round(this.st.rep)} (${this.Rating.toFixed(1).replace('.', ',')} ★)</b></div><div class="stat"><span>Ağırlanan misafir</span><b>${this.st.served}</b></div><div class="stat"><span>Kaçan misafir</span><b>${this.st.lost}</b></div><div class="stat"><span>Toplam kazanç</span><b>${UI.fmt(this.st.earned)}</b></div><div class="stat"><span>Odalar</span><b>${this.OpenRooms().length} açık · ${this.DirtyRooms().length} kirli</b></div><p style="font-size:13px;color:var(--ink-2);font-weight:700">Yıldız için şartları yukarıda görebilirsin. Memnun misafirler ün ve puan kazandırır; bekleyip giden misafirler düşürür.</p>`;
        body.prepend(lb);
        const sw = document.createElement('div'); Life.RenderStars(sw); body.prepend(...sw.childNodes);
      } else if (t === 'personel') {
        for (const role of ['receptionist', 'cleaner', 'bellhop', ...Facilities.StaffRoles()]) {
          const def = Data.Staff[role]; const have = this.staff.filter(s => s.role === role);
          for (const s of have) {
            const d = document.createElement('div'); d.className = 'item done';
            const mp = Math.round(s.morale * 100), nx = s.NextXP;
            d.innerHTML = `<div class="ic">${def.icon}</div><div class="tx"><b>${UI.esc(s.name)} <span class="chip">Lv ${s.lv}</span> <span class="chip">${s.trait.icon} ${s.trait.name}</span></b><small>${def.name} · günlük ${UI.fmt(s.Wage)} · ${s.trait.desc}</small><small>Moral ${mp}%${nx ? ' · XP ' + s.xp + '/' + nx : ' · en üst seviye'}</small><div class="meter"><i style="width:${mp}%;background:${mp < 30 ? 'var(--red)' : mp < 55 ? 'var(--gold)' : 'var(--mint)'}"></i></div></div><div class="col"></div>`;
            const col = d.querySelector('.col');
            if (s.lv < Staff.MaxLevel) { const b = document.createElement('button'); b.className = 'sea'; b.textContent = '🎓 ' + UI.fmt(Staff.TrainCost(s.lv)); b.title = 'Eğitim: seviye atlar'; b.addEventListener('click', () => { s.Train(); UI.RenderSheet(); }); col.appendChild(b); }
            const bb = document.createElement('button'); bb.className = 'pink'; bb.textContent = '🎁 ' + UI.fmt(s.Wage * 2); bb.title = 'İkramiye: moral +40'; bb.addEventListener('click', () => { s.Bonus(); UI.RenderSheet(); }); col.appendChild(bb);
            body.appendChild(d);
          }
          const n = have.length; const cost = Array.isArray(def.cost) ? def.cost[n] : (n ? undefined : def.cost);
          if (cost !== undefined) { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<div class="ic">${def.icon}</div><div class="tx"><b>${def.name} tut</b><small>${def.desc} Günlük maaş ${UI.fmt(def.wage)}.</small></div>`; const b = document.createElement('button'); b.className = 'gold'; b.textContent = UI.fmt(cost); b.addEventListener('click', () => this.AddStaff(role)); d.appendChild(b); body.appendChild(d); }
        }
      } else if (t === 'gelisim') {
        for (const k of Object.keys(Data.Upgrades)) {
          const u = Data.Upgrades[k], lv = this.UpgLv(k), max = u.cost.length, d = document.createElement('div'); d.className = 'item' + (lv >= max ? ' done' : '');
          d.innerHTML = `<div class="ic">${u.icon}</div><div class="tx"><b>${u.name} <span class="chip">${lv}/${max}</span></b><small>${u.desc} Şu an +%${Math.round(u.step * lv * 100)}; her seviye +%${Math.round(u.step * 100)}.</small><div class="meter"><i style="width:${lv / max * 100}%;background:var(--mint)"></i></div></div>`;
          if (lv < max) { const b = document.createElement('button'); b.className = 'gold'; b.textContent = UI.fmt(u.cost[lv]); b.addEventListener('click', () => this.BuyUpgrade(k)); d.appendChild(b); }
          body.appendChild(d);
        }
        const n = document.createElement('p'); n.style.cssText = 'font-size:13px;color:var(--ink-2);font-weight:700'; n.textContent = 'Oda yatağı, televizyonu ve banyosunu yükseltmek için odaya dokun.'; body.appendChild(n);
      } else if (t === 'basarim') { Ach.Render(body);
      } else if (t === 'album') { Album.Render(body);
      } else if (t === 'zincir') { Chain.Render(body);
      } else if (t === 'gorev') {
        this.Quests.forEach((q, i) => { const d = document.createElement('div'); d.className = 'item' + (i < this.st.questIdx ? ' done' : i > this.st.questIdx ? ' locked' : ''); d.innerHTML = `<div class="ic">${i < this.st.questIdx ? '✅' : i === this.st.questIdx ? '🎯' : '🔒'}</div><div class="tx"><b>${UI.esc(q.text)}</b><small>Ödül ${UI.fmt(q.reward)}${i === this.st.questIdx ? ' · ' + Math.min(q.cur(), q.target) + '/' + q.target : ''}</small></div>`; if (i === this.st.questIdx && q.cur() >= q.target) { const b = document.createElement('button'); b.className = 'gold'; b.textContent = 'Ödülü al'; b.addEventListener('click', () => { this.ClaimQuest(); UI.RenderSheet(); }); d.appendChild(b); } body.appendChild(d); });
      } else {
        body.innerHTML = `<div class="item"><div class="ic">🏨</div><div class="tx"><b>Otelin adı</b><input type="text" id="in-name" maxlength="22" value="${UI.esc(this.st.name)}"></div></div><div class="item"><div class="ic">🧑‍💼</div><div class="tx"><b>Müdürün adı</b><input type="text" id="in-mgr" maxlength="16" value="${UI.esc(this.st.manager)}"></div></div><div class="item"><div class="ic">🎨</div><div class="tx"><b>Grafik kalitesi</b><small>Takılırsa Düşük seç.</small></div><button class="gold" id="bt-q">${Quality.names[Quality.level]}</button></div><div class="item"><div class="ic">🔊</div><div class="tx"><b>Ses efektleri</b></div><button class="${this.st.sound ? 'mint' : 'ghost'}" id="bt-s">${this.st.sound ? 'Açık' : 'Kapalı'}</button></div><div class="item"><div class="ic">🗑</div><div class="tx"><b>Yeni oyun</b><small>Tüm ilerleme silinir.</small></div><button class="red" id="bt-r">Baştan başla</button></div>`;
        body.querySelector('#in-name').addEventListener('change', e => { this.st.name = e.target.value.trim() || 'Otel'; Hotel.SetName(this.st.name); this.Save(); });
        body.querySelector('#in-mgr').addEventListener('change', e => { this.st.manager = e.target.value.trim() || 'Müdür'; this.player.tag.text = this.st.manager; this.Save(); });
        body.querySelector('#bt-q').addEventListener('click', () => { Quality.Set((Quality.level + 1) % 3, true); UI.RenderSheet(); });
        body.querySelector('#bt-s').addEventListener('click', () => { this.st.sound = !this.st.sound; Sfx.SetVolume(this.st.sound ? 1 : 0); this.Save(); UI.RenderSheet(); });
        body.querySelector('#bt-r').addEventListener('click', () => UI.Dialog({ tag: 'DİKKAT', title: 'Baştan başlansın mı?', body: 'Otel, para ve tüm ilerleme silinir.', buttons: [{ text: 'Evet, sil', cls: 'red', act: () => this.Reset() }, { text: 'Vazgeç', cls: 'ghost' }] }));
      }
    } });
  },
};
