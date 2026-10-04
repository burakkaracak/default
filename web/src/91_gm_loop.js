// GameManager: kayıt, döngü, yardımcılar ve ekran (OnGUI)
Object.assign(GameManager.prototype, {
  // ================= KAYIT =================
  Save() {
    if (!this.loaded) return; // yükleme tamamlanmadan kayıt yapma (ilerleme korunur)
    if (Chain.switching) return; // otel değişiyor: eski otelin kaydının üzerine yazma
    const K = GameManager.K;
    Store.SetInt(K + 'money', this.money);
    Store.SetInt(K + 'served', this.served);
    for (let i = 0; i < this.rooms.length; i++) Store.SetInt(K + 'room' + i, this.rooms[i].level);
    for (let i = 0; i < this.ups.length; i++) Store.SetInt(K + 'up' + i, this.ups[i]);
    Store.SetString(K + 'recep', this.reception.HasStaff ? this.reception.staffName : '');
    Store.SetInt(K + 'cleaners', this.cleaners.length);
    for (let i = 0; i < this.cleaners.length; i++) Store.SetString(K + 'cleaner' + i, this.cleaners[i].staffName);
    Store.SetString(K + 'hotel', this.hotelName);
    Store.SetInt(K + 'sound', this.sound ? 1 : 0);
    Store.SetInt(K + 'music', this.music ? 1 : 0);
    Store.SetInt(K + 'cafe', this.cafe.Open ? 1 : 0);
    Store.SetString(K + 'barista', this.cafe.HasBarista ? this.cafe.baristaName : '');
    Store.SetInt(K + 'pool', this.pool.Open ? 1 : 0);
    Store.SetInt(K + 'rest', this.restaurant.Open ? 1 : 0);
    Store.SetInt(K + 'spa', this.spa.Open ? 1 : 0);
    Store.SetString(K + 'therapist', this.spa.HasTherapist ? this.spa.therapistName : '');
    if (this.spa.HasTherapist) this.spa.stats.Save(K + 'st_spa');
    Store.SetString(K + 'waiter', this.restaurant.HasWaiter ? this.restaurant.waiterName : '');
    if (this.restaurant.HasWaiter) this.restaurant.stats.Save(K + 'st_wai');
    Store.SetInt(K + 'wing', this.wingOpen ? 1 : 0);
    Store.SetInt(K + 'floor2', this.floor2Open ? 1 : 0);
    Decor.Save(K);
    Store.SetInt(K + 'day', this.dayNight.day);
    Store.SetFloat(K + 'time', this.dayNight.time);
    Store.SetString(K + 'ratings', this.ratings.map(v => v.toFixed(2)).join(';'));
    Store.SetString(K + 'manager', this.managerName);
    Store.SetInt(K + 'managerLook', this.managerVariant);
    Quests.Save(K);
    // yeni sistemler
    Store.SetInt(K + 'coop', this.coop ? 1 : 0);
    Store.SetString(K + 'p2name', this.p2Name);
    Store.SetInt(K + 'p2look', this.p2Variant);
    Store.SetInt(K + 'restroom', this.restRoom ? 1 : 0);
    Store.SetInt(K + 'cat', this.catAdopted ? 1 : 0);
    let carried = 0;
    for (const pl of this.players) if (pl) carried += pl.linen;
    for (const c of this.cleaners) carried += c.linen;
    for (const r of this.rooms) if (r.hasLinen) carried++;
    this.laundry.Save(K, carried);
    if (this.reception.HasStaff) this.reception.stats.Save(K + 'st_rec');
    if (this.cafe.HasBarista) this.cafe.stats.Save(K + 'st_bar');
    for (let i = 0; i < this.cleaners.length; i++) this.cleaners[i].stats.Save(K + 'st_cl' + i);
    for (let i = 0; i < this.rooms.length; i++) { Store.SetInt(K + 'theme' + i, this.rooms[i].theme); Store.SetInt(K + 'themeOwn' + i, this.rooms[i].themeOwned); }
    for (let i = 0; i < this.rooms.length; i++) { Store.SetInt(K + 'kind' + i, this.rooms[i].kind); Store.SetInt(K + 'suite' + i, this.rooms[i].IsSuite ? 1 : 0); }
    Pricing.Save(K);
    Reservations.Save(K);
    Story.Save();
    Report.Save(K);
    Social.Save(K);
    Regulars.Save(K);
    StarExam.Save(K);
    Wedding.Save(K);
    Store.SetInt(K + 'weather', Events.weather);
    Store.SetString(K + 'seen', String(Date.now()));
    Store.SetFloat(K + 'idleRate', this.IdleRate());
    Store.SetInt(K + 'saved', 1);
    Store.Save();
  },

  Load() {
    const K = GameManager.K;
    const has = Store.GetInt(K + 'saved', 0) === 1;
    this.money = has ? Store.GetInt(K + 'money', Eco.StartMoney) : Eco.StartMoney;
    this.served = Store.GetInt(K + 'served', 0);
    for (let i = 0; i < this.ups.length; i++) this.ups[i] = Store.GetInt(K + 'up' + i, 0);
    for (let i = 0; i < this.rooms.length; i++)
      this.rooms[i].ApplyLevel(has ? Store.GetInt(K + 'room' + i, i === 0 ? 1 : 0) : (i === 0 ? 1 : 0), false);
    const rn = Store.GetString(K + 'recep', '');
    if (rn) this.reception.HireReceptionist(rn, false);
    const cc = Store.GetInt(K + 'cleaners', 0);
    for (let i = 0; i < cc; i++) this.SpawnCleaner(i, Store.GetString(K + 'cleaner' + i, Eco.Names[i]));
    this.SetHotelName(Store.GetString(K + 'hotel', this.hotelName));
    this.SetSound(Store.GetInt(K + 'sound', 1) === 1);
    this.music = Store.GetInt(K + 'music', 1) === 1;
    this.SetWing(Store.GetInt(K + 'wing', 0) === 1, false);
    this.SetFloor2(Store.GetInt(K + 'floor2', 0) === 1, false);
    Decor.Load(K);
    this.cafe.SetOpen(Store.GetInt(K + 'cafe', 0) === 1, false);
    const bn = Store.GetString(K + 'barista', '');
    if (this.cafe.Open && bn) this.cafe.HireBarista(bn, false);
    this.pool.SetOpen(Store.GetInt(K + 'pool', 0) === 1, false);
    this.restaurant.SetOpen(Store.GetInt(K + 'rest', 0) === 1, false);
    this.spa.SetOpen(Store.GetInt(K + 'spa', 0) === 1, false);
    const tn = Store.GetString(K + 'therapist', '');
    if (this.spa.Open && tn) { this.spa.HireTherapist(tn, false); this.spa.stats.Load(K + 'st_spa'); }
    const wn = Store.GetString(K + 'waiter', '');
    if (this.restaurant.Open && wn) { this.restaurant.HireWaiter(wn, false); this.restaurant.stats.Load(K + 'st_wai'); }
    this.dayNight.day = Store.GetInt(K + 'day', 1);
    this.dayNight.time = Store.GetFloat(K + 'time', 0.3);
    const rs = Store.GetString(K + 'ratings', '');
    if (rs) {
      this.ratings = rs.split(';').map(parseFloat).filter(v => !isNaN(v));
      if (this.ratings.length === 0) this.ratings.push(3);
    }
    let sum = 0; for (const v of this.ratings) sum += v;
    this.Stars = Mathf.Clamp(sum / this.ratings.length, 1, 5);
    this.UpdateStarDecor(false);
    this.SetManager(Store.GetInt(K + 'managerLook', 9), Store.GetString(K + 'manager', 'Müdür'));
    Quests.Load(K);
    if (Quests.daily.length === 0) Quests.NewDay();

    // yeni sistemler
    if (this.reception.HasStaff) this.reception.stats.Load(K + 'st_rec');
    if (this.cafe.HasBarista) this.cafe.stats.Load(K + 'st_bar');
    for (let i = 0; i < this.cleaners.length; i++) this.cleaners[i].stats.Load(K + 'st_cl' + i);
    this.restRoom = Store.GetInt(K + 'restroom', 0) === 1;
    for (let i = 0; i < this.rooms.length; i++) {
      this.rooms[i].themeOwned = Store.GetInt(K + 'themeOwn' + i, 1) | 1;
      this.rooms[i].SetTheme(Store.GetInt(K + 'theme' + i, 0), false);
    }
    for (let i = 0; i < this.rooms.length; i++) this.rooms[i].SetKind(Store.GetInt(K + 'kind' + i, 0), false);
    for (let i = 0; i + 1 < this.rooms.length; i++)
      if (Store.GetInt(K + 'suite' + i, 0) === 1 && this.rooms[i].level >= 3 && this.rooms[i + 1].level >= 3 && !this.rooms[i].IsSuitePart) {
        this.rooms[i].MakeSuite(this.rooms[i + 1], false);
        if (this.dividers[i]) this.dividers[i].visible = false;
      }
    let unlockedN = 0; for (const r of this.rooms) if (r.Unlocked) unlockedN++;
    this.laundry.Load(K, unlockedN);
    Report.Load(K);
    Social.Load(K);
    Regulars.Load(K);
    StarExam.Load(K, this.Stars);
    Wedding.Load(K);
    Pricing.Load(K);
    Reservations.Load(K, this.dayNight.day);
    if (!Reservations.Scheduled) Reservations.ScheduleFrom(this.dayNight.day, this.dayNight.time);
    if (has && Store.HasKey(K + 'weather')) Events.Restore(Store.GetInt(K + 'weather', 0));
    else Events.NewDay(this.dayNight.day);
    this.p2Name = Store.GetString(K + 'p2name', 'Oyuncu 2');
    this.p2Variant = Store.GetInt(K + 'p2look', 1);
    this.SetCoop(Store.GetInt(K + 'coop', 0) === 1);
    if (Store.GetInt(K + 'cat', 0) === 1) { this.catAdopted = true; this.cat = Cat.Make('Pamuk'); }

    this.loaded = true;
    Seasons.Apply();
    const sp = Seasons.SpecialTitle;
    if (sp != null) this.Celebrate('Özel gün!', sp);
    if (!has && !Story.started && Chain.cur === 0) this.OfferStory();
    Store.SetInt(K + 'news5', 1);
    Store.SetInt(K + 'news6', 1);
    const seen = parseFloat(Store.GetString(K + 'seen', ''));
    if (has && !isNaN(seen)) {
      // Eski Unity kaydı .NET tick'i tutuyordu; web kaydı milisaniye
      const mins = (Date.now() - seen) / 60000;
      if (mins >= 3 && mins < 60 * 24 * 365) this.OfferOffline(mins);
    }
  },

  OfferStory() {
    Popups.Show('Elif\'in Oteli', 'Hikâye modunu başlatmak ister misin? Anneannenin otelini yeniden canlandır, rakibin Kaan Bey\'e karşı yarış, Bodrum ve Kapadokya\'da yeni oteller aç.', 'HİKÂYE MODU')
      .Add('Hikâyeyi başlat', () => Story.Begin(), Popups.Gold)
      .Add('Sonra (Menü > Hikâye)', null, Popups.Grey);
  },

  // Resepsiyonist varken otelin sen başında değilken dakikada kazandığı yaklaşık para
  IdleRate() {
    if (!this.reception.HasStaff) return 0;
    let perMin = 0;
    for (const r of this.rooms) if (r.Unlocked) perMin += (r.Price + r.Tip) * 2 * 0.015;
    return this.cleaners.length === 0 ? perMin * 0.5 : perMin;
  },

  OfferOffline(mins) {
    if (!this.reception.HasStaff) {
      if (mins >= 15)
        Popups.Show('Tekrar hoş geldin!', 'Sen yokken otel kapalıydı. Bir resepsiyonist işe alırsan sen yokken de misafir kabul edilir ve para kazanırsın.', 'SEN YOKKEN')
          .Add('Anladım', null, Popups.Grey);
      return;
    }
    const capped = Math.min(mins, 120);
    const perMin = this.IdleRate(), n = this.Unlocked();
    const earned = Mathf.RoundToInt(perMin * capped);
    if (earned < 10) return;
    const guests = Math.max(1, Mathf.RoundToInt(capped * n * 0.06));
    const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
    const away = (h > 0 ? h + ' saat ' : '') + m + ' dakika';
    Popups.Show('Sen yokken otel çalıştı!', away + ' boyunca ' + this.reception.staffName + ' resepsiyonda misafirleri karşıladı.\n\nYaklaşık ' + guests + ' misafir ağırlandı.' +
      (mins > 120 ? '\n(Kasa en fazla 2 saatlik kazancı tutabiliyor.)' : ''), 'SEN YOKKEN')
      .Add('Topla  ' + Eco.TL(earned), () => { this.money += earned; Report.Bonus(earned); Sfx.Play('coin'); }, Popups.Green);
  },

  ResetGame() {
    const K = GameManager.K;
    const raw = Store.Raw();
    for (const k of Object.keys(raw)) if (k.startsWith(K) && !k.startsWith(K + 'c1_') && !k.startsWith(K + 'c2_') && !k.startsWith('o4_chain')) Store.DeleteKey(k);
    Store.Save();
    this.loaded = false;
    location.reload();
  },

  // ================= DÖNGÜ =================
  Update() {
    this.shownMoney = Mathf.Lerp(this.shownMoney, this.money, Time.unscaledDeltaTime * 10);
    if (Math.abs(this.shownMoney - this.money) < 0.5) this.shownMoney = this.money;
    Time.timeScale = Popups.Open || Chat.open ? 0 : 1;
    const dt = Time.deltaTime;
    Events.Tick(dt);
    Regulars.Tick();
    StarExam.Tick(dt);
    Wedding.Tick(dt);
    Chain.TickBackground();
    Reservations.Tick();
    this.storyT -= Time.unscaledDeltaTime;
    if (this.storyT <= 0) { this.storyT = 1; Story.Tick(); }
    if (this.priceBuffT > 0) this.priceBuffT -= dt;

    if (this.pendingSpawns.length > 0 && (this.reception.Count < this.reception.Capacity || this.pendingSpawns[0].reservation != null) && !Popups.Open) {
      const cfg = this.pendingSpawns.shift();
      this.SpawnCustomer(cfg);
      this.spawnTimer = Math.max(this.spawnTimer, 1.2);
    }
    this.spawnTimer -= Time.deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Random.Range(5, 8) / Math.pow(this.Unlocked(), 0.6) / Eco.AdsMul;
      if (this.reception.Count < this.reception.Capacity && this.pendingSpawns.length === 0) this.SpawnCustomer();
    }
    this.saveTimer -= Time.deltaTime;
    if (this.saveTimer <= 0) { this.saveTimer = 4; this.Save(); }
    if (this.bannerT > 0) this.bannerT -= Time.unscaledDeltaTime;
    if (this.celebT > 0) this.celebT -= Time.unscaledDeltaTime;
    if (this.player) { Seasons.Follow(this.player.transform.position); Events.Follow(this.player.transform.position); }
    if (this.hintT > 0 && this.player.Moved) this.hintT -= Time.deltaTime * 3;
  },

  SpawnCustomer(cfg) {
    const left = Random.value < 0.5;
    Customer.next = cfg || null;
    const c = new Customer();
    c.transform.position.set(left ? -26 : 26, 0, -14);
    this.customers.push(c);
    this.reception.Enqueue(c);
  },

  // ================= YARDIMCILAR =================
  AddObstacle(x0, z0, x1, z1) { this.obstacles.push(Rect.MinMaxRect(x0, z0, x1, z1)); },

  Walkable(p) {
    const r = 0.3;
    let ok = p.x > -15 + r && p.x < 15 - r && p.z > -12 + r && p.z < 3.9 - r;
    if (!ok && this.wingOpen && p.x > 14.6 && p.x < 35.25 - r && p.z > -0.8 + r && p.z < 3.9 - r) ok = true;
    if (!ok && this.pool.InArea(p, r)) ok = true;
    if (!ok && this.restaurant.InArea(p, r)) ok = true;
    if (!ok && this.spa.InArea(p, r)) ok = true;
    if (!ok && Outside.InArea(p, r)) ok = true;
    if (!ok && this.floor2Open && p.x > -15 + r && p.x < 15 - r && p.z > Elevator.Floor2Z - 0.55 + r && p.z < Elevator.Floor2Z + 3.9 - r) ok = true;
    if (!ok) {
      for (const room of this.rooms) {
        if (!room.Unlocked) continue;
        const dx = Math.abs(p.x - room.x), pz = p.z - room.oz;
        if (dx < 0.6 && pz > 3.4 && pz < 4.6) { ok = true; break; }
        if (dx < 2.5 - 0.15 - r && pz > 4.1 + r && pz < 10.5 - r) { ok = true; break; }
      }
    }
    if (!ok) return false;
    for (const o of this.obstacles) if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return false;
    if (this.cafe.Blocked(p, r) || this.pool.Blocked(p, r) || this.restaurant.Blocked(p, r) || this.spa.Blocked(p, r) || Decor.Blocked(p, r) || Outside.Blocked(p, r)) return false;
    for (const room of this.rooms)
      if (p.z > room.Z(4) && p.z < room.Z(11) && Math.abs(p.x - room.x) < 2.6 && room.Blocked(p, r)) return false;
    return true;
  },

  // Kapıya yakınsa oyuncuyu kapının ortasına doğru kaydırır (ref: {p})
  DoorAssist(ref, move, step) {
    if (Math.abs(move.z) < 0.3) return false;
    const p = ref.p;
    for (const room of this.rooms) {
      if (!room.Unlocked) continue;
      const pz = p.z - room.oz;
      if (pz < 2.6 || pz > 5.4) continue;
      const dx = room.x - p.x;
      if (Math.abs(dx) > 1.4 || Math.abs(dx) < 0.02) continue;
      const n = Vec.add(p, V(Mathf.Sign(dx) * Math.min(Math.abs(dx), step), 0, 0));
      if (this.Walkable(n)) { ref.p = n; return true; }
    }
    return false;
  },

  FreeRoomFor(c) { return this.FreeRoom(c.MinLevel, c.type, c.Lux, c.budget); },

  // En uygun boş oda: seviye, tema ve oda tipi uyumuna göre puanlanır
  // FreeRoom(lux=false) ya da FreeRoom(minLevel, type, lux, budget)
  FreeRoom(minLevel, type, lux, budget) {
    if (typeof minLevel !== 'number') { const l = !!minLevel; minLevel = l ? 2 : 1; type = Customer.G.Normal; lux = l; budget = 3; }
    let best = null, bestScore = -Infinity;
    for (const r of this.rooms) {
      if (r.state !== Room.State.Clean || r.IsSuitePart || r.level < minLevel) continue;
      if (r.IsSuite && !lux) continue;                    // süit sadece VIP ve ünlülere
      if (r.kind === RoomKinds.Ekonomik && lux) continue;  // VIP ekonomik odada kalmaz
      const km = RoomKinds.Match(r.kind, type);
      // bütçeye en yakın seviye; eşitlikte daha iyi oda
      let score = -4 * Math.abs(r.level - budget) + r.level + (Themes.Match(r.theme, type) ? 5 : 0) + (km ? 8 : 0) + (r.IsSuite ? 20 : 0);
      if (r.kind !== RoomKinds.Klasik && !r.IsSuite && !km) score -= 4; // özel odaları sevenlerine sakla
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return best;
  },

  FindRequestRoom() { for (const r of this.rooms) if (r.HasRequest && !r.reqClaimed) return r; return null; },
  FindDirtyRoom() { for (const r of this.rooms) if (r.state === Room.State.Dirty && !r.claimed) return r; return null; },
  Unlocked() { let n = 0; for (const r of this.rooms) if (r.Unlocked) n++; return Math.max(1, n); },

  AddMoney(a, at) {
    this.money += a;
    Quests.Track('earned', a);
    Report.Income(a);
    this.FloatText(Vec.add(at, V(0, 1.6, 0)), '+' + Eco.TL(a), C(0.55, 1, 0.5));
    Sfx.Play('coin');
    if (a >= 150 && this.player) U.Burst(Vec.add(this.player.transform.position, V(0, 2, 0)), C(1, 0.85, 0.3), C(0.5, 1, 0.5), 40, 5);
  },

  Notify(s) { this.banner = s; this.bannerT = 2.6; },
  FloatText(pos, s, c, size = 0.1) { Tween.FloatText(pos, s, c, size); },
  Pop(t) { Tween.Pop(t); },
  Fly(b, target, delay) { Tween.Fly(b, target, null, delay); },
  FlyBill(from, to) { const b = MoneyPile.MakeBill(null, from); Tween.Fly(b, null, to.clone(), 0); },

  // ================= EKRAN =================
  // Ekran koordinatı (y aşağıdan) bir arayüz öğesinin üstünde mi?
  OverUI(p) {
    const g = { x: p.x, y: Screen.height - p.y };
    if (Social.Button(this.UIScale).Contains(g) || Social.open || Popups.Open) return true;
    return this.menuBtn.Contains(g) || this.questBtn.Contains(g) || Photo.btn.Contains(g) || Chat.btn.Contains(g) || Chat.open || this.MenuOpen || this.celebT > 0;
  },

  Panel(r, c) { GUI.Panel(r, c); },
});

GameManager.StarText = st => { const full = Math.floor(st + 0.25); return '★'.repeat(Mathf.Clamp(full, 0, 5)) + '☆'.repeat(Mathf.Clamp(5 - full, 0, 5)); };

GameManager.prototype.Styles = function () {
  if (this.bigStyle) return;
  const L = GUI.skin.label;
  this.bigStyle = new GUIStyle(L, { alignment: TextAnchor.MiddleLeft, fontStyle: FontStyle.Bold, wordWrap: false });
  this.smallStyle = new GUIStyle(L, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
  this.titleStyle = new GUIStyle(L, { alignment: TextAnchor.MiddleLeft, fontStyle: FontStyle.Bold, wordWrap: false });
  this.bannerStyle = new GUIStyle(L, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold, wordWrap: false });
  this.btnStyle = new GUIStyle(L, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
};

GameManager.prototype.OnGUI = function () {
  this.Styles();
  const s = this.UIScale, SW = Screen.width, SH = Screen.height, P = (r, c) => GUI.Panel(r, c);
  const { bigStyle, smallStyle, titleStyle, bannerStyle, btnStyle } = this;

  // Dikey ekranda: para paneli bilgi panelinin altına (solda) iner, görev ve rezervasyon kartları ekranın altına geçer;
  // böylece üstteki odalar ve sağdaki düğmeler açıkta kalır
  const narrow = SW < SH;
  // Para paneli
  const r = narrow ? new Rect(20 * s, 196 * s, 340 * s, 76 * s) : new Rect(SW / 2 - 170 * s, 22 * s, 340 * s, 84 * s);
  P(r, C(0.1, 0.12, 0.2, 0.72));
  const coin = new Rect(r.x + 16 * s, r.center.y - 28 * s, 56 * s, 56 * s);
  GUI.color = C(0.85, 0.6, 0.1); GUI.DrawTexture(coin, 'circle');
  GUI.color = C(1, 0.82, 0.25); GUI.DrawTexture(new Rect(coin.x + 5 * s, coin.y + 5 * s, coin.width - 10 * s, coin.height - 10 * s), 'circle');
  GUI.color = Col.white;
  smallStyle.fontSize = Mathf.RoundToInt(34 * s); smallStyle.normal.textColor = C(0.72, 0.48, 0.05);
  GUI.Label(coin, '₺', smallStyle);
  bigStyle.fontSize = Mathf.RoundToInt(48 * s); bigStyle.normal.textColor = Col.white;
  GUI.Label(new Rect(r.x + 88 * s, r.y, r.width - 96 * s, r.height), Eco.TL(Mathf.RoundToInt(this.shownMoney)).substring(1), bigStyle);

  // Sol üst: otel adı, yıldız, saat ve bilgi
  const info = new Rect(20 * s, 22 * s, 500 * s, 162 * s);
  P(info, C(0.1, 0.12, 0.2, 0.62));
  titleStyle.fontSize = Mathf.RoundToInt(28 * s); titleStyle.normal.textColor = C(1, 0.86, 0.42);
  GUI.Label(new Rect(info.x + 20 * s, info.y + 6 * s, info.width - 30 * s, 40 * s), this.hotelName, titleStyle);
  titleStyle.fontSize = Mathf.RoundToInt(24 * s);
  GUI.Label(new Rect(info.x + 20 * s, info.y + 44 * s, 260 * s, 36 * s), GameManager.StarText(this.Stars) + '  ' + fmt1(this.Stars), titleStyle);
  titleStyle.normal.textColor = this.dayNight.IsNight ? C(0.7, 0.8, 1) : Col.white;
  GUI.Label(new Rect(info.x + 270 * s, info.y + 44 * s, 220 * s, 36 * s), (this.dayNight.IsNight ? '☾ ' : '☀ ') + 'Gün ' + this.dayNight.day + ' · ' + this.dayNight.Clock, titleStyle);
  titleStyle.fontSize = Mathf.RoundToInt(20 * s); titleStyle.normal.textColor = Col.white;
  GUI.Label(new Rect(info.x + 20 * s, info.y + 84 * s, info.width - 30 * s, 34 * s),
    'Oda ' + this.Unlocked() + '/' + this.rooms.length + '   ·   Misafir ' + this.served + '   ·   Bekleyen ' + this.reception.Count, titleStyle);
  titleStyle.normal.textColor = Seasons.Festival ? C(1, 0.7, 0.9) : C(0.75, 0.95, 0.8);
  const seasonTxt = Seasons.Names[Seasons.Current] + ' · ' + Events.WNames[Events.weather] + '   ·   Belge ' + StarExam.official + '★' + (Seasons.Festival ? '   ·   FESTİVAL' : '');
  GUI.Label(new Rect(info.x + 20 * s, info.y + 118 * s, info.width - 30 * s, 34 * s), seasonTxt, titleStyle);
  titleStyle.normal.textColor = Col.white;

  const buff = Events.BuffText;
  // Görev kartı
  const q = Quests.Current;
  this.questBtn = Rect.zero;
  if (q != null && !this.MenuOpen) {
    const qr = narrow ? new Rect(20 * s, SH - 124 * s, 500 * s, 104 * s) : new Rect(20 * s, 196 * s, 500 * s, 104 * s);
    const done = Quests.CurrentDone;
    P(qr, done ? C(0.25, 0.55, 0.3, 0.9) : C(0.1, 0.12, 0.2, 0.62));
    titleStyle.fontSize = Mathf.RoundToInt(18 * s); titleStyle.normal.textColor = C(1, 0.86, 0.42);
    GUI.Label(new Rect(qr.x + 20 * s, qr.y + 6 * s, 300 * s, 28 * s), 'GÖREV ' + (Quests.storyIndex + 1) + '/' + Quests.Line.length, titleStyle);
    titleStyle.fontSize = Mathf.RoundToInt(22 * s); titleStyle.normal.textColor = Col.white;
    GUI.Label(new Rect(qr.x + 20 * s, qr.y + 32 * s, 330 * s, 32 * s), q.text, titleStyle);
    const prog = Mathf.Clamp01(q.cur() / q.target);
    const bar = new Rect(qr.x + 20 * s, qr.y + 72 * s, 300 * s, 16 * s);
    P(bar, C(1, 1, 1, 0.15));
    if (prog > 0.02) P(new Rect(bar.x, bar.y, bar.width * prog, bar.height), C(0.45, 0.9, 0.5, 1));
    if (done) {
      this.questBtn = new Rect(qr.xMax - 160 * s, qr.y + 22 * s, 140 * s, 60 * s);
      P(this.questBtn, C(1, 0.78, 0.25, 1));
      btnStyle.fontSize = Mathf.RoundToInt(20 * s); btnStyle.normal.textColor = C(0.3, 0.18, 0.05);
      if (GUI.Button(this.questBtn, 'Ödülü al\n' + Eco.TL(q.reward), btnStyle)) Quests.ClaimStory();
    } else {
      smallStyle.fontSize = Mathf.RoundToInt(18 * s); smallStyle.normal.textColor = C(1, 0.86, 0.42);
      GUI.Label(new Rect(qr.xMax - 160 * s, qr.y + 22 * s, 140 * s, 60 * s), 'Ödül\n' + Eco.TL(q.reward), smallStyle);
    }
  }

  // Bugünün rezervasyonları
  if (!this.MenuOpen && Reservations.Pending > 0) {
    const n = Math.min(3, Reservations.Pending);
    const rh = (46 + n * 30) * s;
    const rr = narrow ? new Rect(20 * s, SH - (q != null ? 136 * s : 20 * s) - rh, 500 * s, rh) : new Rect(20 * s, (q != null ? 312 : 196) * s, 500 * s, rh);
    P(rr, C(0.08, 0.24, 0.3, 0.72));
    titleStyle.fontSize = Mathf.RoundToInt(18 * s); titleStyle.normal.textColor = C(0.55, 0.95, 1);
    GUI.Label(new Rect(rr.x + 20 * s, rr.y + 6 * s, rr.width - 30 * s, 30 * s), 'BUGÜNÜN REZERVASYONLARI', titleStyle);
    titleStyle.fontSize = Mathf.RoundToInt(19 * s); titleStyle.normal.textColor = Col.white;
    let k = 0;
    for (const res of Reservations.list) {
      if (res.state > 1 || k >= n) continue;
      GUI.Label(new Rect(rr.x + 20 * s, rr.y + (38 + k * 30) * s, rr.width - 30 * s, 30 * s),
        Reservations.Clock(res.time) + '  ·  ' + res.name + '  ·  ' + Eco.LevelNames[res.level] + (res.state === 1 ? '  (geldi)' : ''), titleStyle);
      k++;
    }
  }

  // iPhone testi bu kutuların birbirine binip binmediğine bakar
  this.hudRects = { bilgi: info, para: r, menu: new Rect(SW - 210 * s, 22 * s, 190 * s, 72 * s), otelgram: Social.Button(s) };
  if (q != null && !this.MenuOpen) this.hudRects.gorev = narrow ? new Rect(20 * s, SH - 124 * s, 500 * s, 104 * s) : new Rect(20 * s, 196 * s, 500 * s, 104 * s);
  if (buff && !this.MenuOpen) this.hudRects.etki = narrow ? new Rect(20 * s, 282 * s, 340 * s, 40 * s) : new Rect(SW / 2 - 170 * s, 112 * s, 340 * s, 40 * s);

  // Menü düğmesi (hazır ödül varsa rozet)
  this.menuBtn = new Rect(SW - 210 * s, 22 * s, 190 * s, 72 * s);
  P(this.menuBtn, C(1, 0.72, 0.2, 0.95));
  btnStyle.fontSize = Mathf.RoundToInt(30 * s); btnStyle.normal.textColor = C(0.3, 0.18, 0.05);
  if (GUI.Button(this.menuBtn, '☰  MENÜ', btnStyle)) { this.menu.Toggle(); Sfx.Play('pop', 0.6); }
  Social.DrawButton(this, s, btnStyle);
  Social.DrawFeed(this, s);
  if (buff && !this.MenuOpen) {
    const bf = narrow ? new Rect(20 * s, 282 * s, 340 * s, 40 * s) : new Rect(SW / 2 - 170 * s, 112 * s, 340 * s, 40 * s);
    P(bf, C(0.1, 0.12, 0.2, 0.6));
    smallStyle.fontSize = Mathf.RoundToInt(19 * s); smallStyle.normal.textColor = C(1, 0.9, 0.6);
    GUI.Label(bf, buff, smallStyle);
  }
  const ready = Quests.ReadyCount() - (Quests.CurrentDone ? 1 : 0) + (Story.Ready ? 1 : 0);
  if (ready > 0) {
    const badge = new Rect(this.menuBtn.x - 14 * s, this.menuBtn.y - 10 * s, 40 * s, 40 * s);
    GUI.color = C(0.9, 0.25, 0.25); GUI.DrawTexture(badge, 'circle'); GUI.color = Col.white;
    smallStyle.fontSize = Mathf.RoundToInt(22 * s); smallStyle.normal.textColor = Col.white;
    GUI.Label(badge, String(ready), smallStyle);
  }

  // Kutlama penceresi
  if (this.celebT > 0) {
    const a = Mathf.Clamp01(this.celebT / 0.5);
    const cw = Math.min(720 * s, SW - 24), cr = new Rect(SW / 2 - cw / 2, SH / 2 - 150 * s, cw, 260 * s);
    P(cr, C(0.12, 0.14, 0.24, 0.97 * a));
    P(new Rect(cr.x + 10 * s, cr.y + 10 * s, cr.width - 20 * s, 8 * s), C(1, 0.78, 0.25, a));
    bannerStyle.fontSize = Mathf.RoundToInt(40 * s); bannerStyle.normal.textColor = C(1, 0.86, 0.42, a);
    GUI.Label(new Rect(cr.x, cr.y + 30 * s, cr.width, 60 * s), '★ ' + this.celebTitle + ' ★', bannerStyle);
    bannerStyle.fontSize = Mathf.RoundToInt(24 * s); bannerStyle.normal.textColor = C(1, 1, 1, a); bannerStyle.wordWrap = true;
    GUI.Label(new Rect(cr.x + 30 * s, cr.y + 95 * s, cr.width - 60 * s, 70 * s), this.celebSub, bannerStyle);
    bannerStyle.wordWrap = false;
    const ok = new Rect(cr.center.x - 120 * s, cr.yMax - 80 * s, 240 * s, 60 * s);
    P(ok, C(1, 0.78, 0.25, a));
    btnStyle.fontSize = Mathf.RoundToInt(26 * s); btnStyle.normal.textColor = C(0.3, 0.18, 0.05, a);
    if (GUI.Button(ok, 'Harika!', btnStyle)) this.celebT = 0;
  }

  // Duyuru
  if (this.bannerT > 0 && this.banner) {
    const a = Mathf.Clamp01(this.bannerT / 0.4) * Mathf.Clamp01((2.6 - this.bannerT) / 0.15);
    const bw = Math.min(660 * s, SW - 24), br = new Rect(SW / 2 - bw / 2, 160 * s + (narrow ? 260 * s : 0), bw, 76 * s);
    P(br, C(1, 0.78, 0.25, 0.94 * a));
    bannerStyle.fontSize = Mathf.RoundToInt(34 * s); bannerStyle.normal.textColor = C(0.25, 0.15, 0.05, a);
    GUI.Label(br, this.banner, bannerStyle);
  }

  // İpucu
  if (this.hintT > 0 && !this.MenuOpen) {
    const a = Mathf.Clamp01(this.hintT);
    const hw = Math.min(760 * s, SW - 24), hr = new Rect(SW / 2 - hw / 2, SH - 90 * s - (narrow && q != null ? 124 * s : 0), hw, 58 * s);
    P(hr, C(0.1, 0.12, 0.2, 0.55 * a));
    smallStyle.fontSize = Mathf.RoundToInt(23 * s); smallStyle.normal.textColor = C(1, 1, 1, a);
    GUI.Label(hr, ('ontouchstart' in window ? 'Hareket: ekranda parmağını sürükle' : 'Hareket: WASD / ok tuşları ya da ekranda sürükle') + '  ·  Satın almalar MENÜ\'de', smallStyle);
  }

  // Klavye odağı yoksa (oyun claude.ai çerçevesinde, odak dışarıda) bilgisayarda uyarı göster
  if (!('ontouchstart' in window) && !this.MenuOpen && !Popups.Open && typeof document.hasFocus === 'function' && !document.hasFocus()) {
    const kw = Math.min(560 * s, SW - 24), kr = new Rect(SW / 2 - kw / 2, SH - 160 * s, kw, 54 * s);
    P(kr, C(0.95, 0.45, 0.4, 0.92));
    smallStyle.fontSize = Mathf.RoundToInt(22 * s); smallStyle.normal.textColor = Col.white;
    GUI.Label(kr, 'Tuşlarla oynamak için oyunun üstüne bir kez tıkla', smallStyle);
  }

  // Sanal joystick
  const pl = this.player;
  if (pl != null && pl.dragging && !this.MenuOpen) {
    const R = 90 * s, max = SH * 0.08;
    const c = { x: pl.dragStart.x, y: SH - pl.dragStart.y };
    let d = { x: pl.dragNow.x - pl.dragStart.x, y: pl.dragNow.y - pl.dragStart.y };
    const m = Math.hypot(d.x, d.y);
    if (m > max) d = { x: d.x / m * max, y: d.y / m * max };
    const k = { x: c.x + d.x * (R / max), y: c.y - d.y * (R / max) };
    GUI.color = C(1, 1, 1, 0.25); GUI.DrawTexture(new Rect(c.x - R, c.y - R, 2 * R, 2 * R), 'circle');
    GUI.color = C(1, 1, 1, 0.8); GUI.DrawTexture(new Rect(k.x - 40 * s, k.y - 40 * s, 80 * s, 80 * s), 'circle');
    GUI.color = Col.white;
  }

  // Şimşek
  if (Events.flash > 0) { GUI.color = C(1, 1, 1, Mathf.Clamp01(Events.flash) * 0.6); GUI.DrawTexture(new Rect(0, 0, SW, SH), 'white'); GUI.color = Col.white; }
  // Asansör geçişi: kısa karartma
  if (this.elevator != null && this.elevator.Fade > 0) { GUI.color = C(0, 0, 0, Mathf.Clamp01(this.elevator.Fade)); GUI.DrawTexture(new Rect(0, 0, SW, SH), 'white'); GUI.color = Col.white; }
};
