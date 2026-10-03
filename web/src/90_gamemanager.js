// Oyunu başlatır, oteli kurar, parayı, satın almaları, kaydı ve ekranı yönetir
class GameManager extends Behaviour {
  static I = null;
  static Variants = ['character-female-a', 'character-female-b', 'character-female-c', 'character-female-d', 'character-female-e', 'character-female-f',
    'character-male-a', 'character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f'];
  static RoomX = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5];
  static get K() { return Chain.K; } // her otelin kendi kaydı (ilk otel "o4_")

  static Boot() { if (!GameManager.I) new GameManager(); }

  constructor() {
    super(); this.go.name = 'GameManager';
    GameManager.I = this;
    this.money = Eco.StartMoney; this.served = 0; this.shownMoney = 0;
    this.player = null; this.player2 = null; this.players = []; this.coop = false; this.p2Name = 'Oyuncu 2'; this.p2Variant = 1;
    this.restRoom = false; this.catAdopted = false; this.cat = null; this.laundry = null;
    this.priceBuff = 1; this.priceBuffT = 0; this.pendingSpawns = [];
    this.rooms = []; this.customers = []; this.cleaners = []; this.obstacles = [];
    this.ups = new Array(Eco.UpCount).fill(0);
    this.hotelName = 'Otel Ustası'; this.sound = true; this.music = true; this.managerName = 'Müdür'; this.managerVariant = 9;
    this.wingOpen = false; this.floor2Open = false;
    this.paintingCanvases = []; this.specialDecor = [null, null, null];
    this.ratings = [3, 3, 3]; this.Stars = 3; this.starTier = -1; this.starDecor = [];
    this.celebT = 0; this.banner = null; this.bannerT = 0; this.hintT = 12;
    this.spawnTimer = 1.5; this.saveTimer = 3; this.dividers = new Array(20).fill(null); this.storyT = 1;
    this.menuBtn = Rect.zero; this.questBtn = Rect.zero; this.loaded = false; this.plantParent = null;

    Time.timeScale = 1;
    Sfx.Init();
    this.menu = new Menu();
    new PopupHost();
    Popups.Clear();
    Chain.Init();
    Story.Load();
    this.Build();
    this.Load();
    Music.Init(this.go, this.music);
    this.shownMoney = this.money;
    RegisterGUI(10, () => this.OnGUI());
  }

  UpLevel(u) { return this.ups[u]; }
  get PriceBuff() { return this.priceBuffT > 0 ? this.priceBuff : 1; }
  get DecorBonus() { return Decor.Bonus; }
  get MenuOpen() { return this.menu != null && this.menu.open; }
  get UIScale() { return GUI.scale; }
  // Kameranın gezebileceği alan (açılan alanlara göre genişler)
  get CamMinX() { return this.pool != null && this.pool.Open ? -19 : -9; }
  get CamMaxX() { return this.wingOpen ? 27 : 9; }
  get CanHireCleaner() { return this.cleaners.length < Eco.CleanerCost.length; }

  // ================= KURULUM =================
  Build() {
    this.world = U.Pivot(W, V(), 'Otel');
    const world = this.world;
    this.dayNight = new DayNight();
    Seasons.Reset();
    Events.Reset();
    const city = Chain.cur;
    const wallC = city === 1 ? C(0.98, 0.98, 0.97) : city === 2 ? C(0.93, 0.83, 0.68) : C(0.97, 0.94, 0.88);
    const trim = city === 1 ? C(0.2, 0.45, 0.75) : city === 2 ? C(0.72, 0.42, 0.26) : C(0.62, 0.47, 0.34);
    const wood = C(0.58, 0.42, 0.3);

    this.SetupLook();
    this.BuildOutside();

    // Lobi zemini
    U.Prim('LobiZemin', world, V(0, -0.05, -4), V(30.5, 0.1, 16.5), U.Mat(C(0.96, 0.91, 0.82), U.TileTex, { x: 30.5 / 3, y: 16.5 / 3 }, 0.45, 0));
    const lobbyCarpet = U.Prim('Hali', world, V(4, 0.01, -6.2), V(7, 0.02, 4.6), U.Mat(C(0.78, 0.33, 0.3), U.CarpetTex, { x: 3, y: 2 }, 0.05, 0));
    const lobbyEdge = U.Flat('HaliKenar', world, V(4, 0.005, -6.2), V(7.4, 0.02, 5), C(0.95, 0.8, 0.45));
    U.Prim('Paspas', world, V(0, 0.01, -10.9), V(3.2, 0.02, 1.8), U.Mat(C(0.4, 0.32, 0.28), U.CarpetTex, { x: 1, y: 1 }, 0.05, 0));

    // Lobi duvarları
    const wallM = U.Mat(wallC, U.StripeTex, { x: 8, y: 1 }, 0.2, 0);
    this.Wall('DuvarBati', V(-15.25, 0.6, -6.225), V(0.4, 1.2, 12.45), wallM, trim);
    this.Wall('DuvarBati', V(-15.25, 0.6, 6.4), V(0.4, 1.2, 8.8), wallM, trim);
    const westFill = this.WallGroup('BatiKapiKapali', V(-15.25, 0.6, 1.0), V(0.4, 1.2, 2.0), wallM, trim);
    this.Wall('DuvarDogu', V(15.25, 0.6, -6.525), V(0.4, 1.2, 11.85), wallM, trim);
    this.Wall('DuvarDogu', V(15.25, 0.6, 7.35), V(0.4, 1.2, 6.9), wallM, trim);
    this.eastDoorFill = this.WallGroup('DoguKapiKapali', V(15.25, 0.6, 1.65), V(0.4, 1.2, 4.5), wallM, trim);
    this.Wall('DuvarGuneySol', V(-8.7, 0.45, -12.25), V(13.1, 0.9, 0.4), wallM, trim);
    this.Wall('DuvarGuneySag', V(8.7, 0.45, -12.25), V(13.1, 0.9, 0.4), wallM, trim);
    this.Wall('DuvarArka', V(0, 1.3, 10.65), V(30.9, 2.6, 0.3), wallM, trim);
    Events.Shelter(world, V(0, 6, -0.85), V(30.9, 14, 23.2)); // lobi ve odalar çatılı

    // Giriş kapısı ve otel tabelası
    U.Box('KapiSol', world, V(-2.2, 1.4, -12.25), V(0.45, 2.8, 0.45), trim);
    U.Box('KapiSag', world, V(2.2, 1.4, -12.25), V(0.45, 2.8, 0.45), trim);
    U.Box('Tente', world, V(0, 2.95, -12.6), V(5.2, 0.25, 1.4), C(0.8, 0.25, 0.3));
    U.Box('Tabela', world, V(0, 3.55, -12.3), V(6.4, 0.9, 0.2), C(0.16, 0.22, 0.38));
    this.signText = U.Text(world, V(0, 3.6, -12.5), 'OTEL', 0.12, C(1, 0.86, 0.42), true);
    U.Box('TabelaIsik', world, V(0, 3.05, -12.35), V(6, 0.05, 0.05), C(1, 0.9, 0.6)).material = U.Glow(C(1, 0.85, 0.5), 2);

    // Oda duvarları
    for (let i = 0; i < 5; i++) this.dividers[i] = this.Divider(V(GameManager.RoomX[i] + 2.5, 0.9, 7.25), wallM, trim, world);
    for (let i = 0; i < 6; i++) this.FrontWall(world, GameManager.RoomX[i], 0, wallM, trim);

    // Resepsiyon masası ve tabelası
    U.Prim('Masa', world, V(-6, 0.55, -5), V(4, 1.1, 1), U.Mat(wood, U.WoodTex, { x: 2, y: 1 }, 0.3, 0));
    U.Box('MasaSerit', world, V(-6, 0.75, -5.51), V(4.02, 0.12, 0.02), C(0.95, 0.78, 0.35));
    U.Prim('MasaUst', world, V(-6, 1.13, -5), V(4.2, 0.08, 1.2), U.Mat(C(0.92, 0.9, 0.88), null, null, 0.8, 0));
    U.Box('Zil', world, V(-4.6, 1.22, -5.2), V(0.22, 0.14, 0.22), C(0.95, 0.78, 0.3), 'Sphere');
    // ekran resepsiyoniste (arkaya, +z) baksın: arkası müşteriye dönük
    U.Furn('computerScreen', world, V(-6.8, 1.17, -5.05), 0, 2.1, V(0.8, 0.6, 0.2), C(0.15, 0.15, 0.18));
    U.Furn('computerKeyboard', world, V(-6.8, 1.17, -4.6), 0, 2.1, V(0.6, 0.04, 0.2), C(0.2, 0.2, 0.22));
    const deskDecor = U.Pivot(world, V(), 'MasaSusu');
    U.Box('Vazo', deskDecor, V(-7.6, 1.3, -5.1), V(0.2, 0.25, 0.2), C(0.3, 0.5, 0.8), 'Cylinder');
    U.Box('Cicek', deskDecor, V(-7.6, 1.6, -5.1), V(0.3, 0.3, 0.3), C(0.95, 0.45, 0.6), 'Sphere');
    this.AddObstacle(-8.1, -5.6, -3.9, -4.4);

    U.Box('TabelaDirek', world, V(-7.7, 1.2, -2.4), V(0.12, 2.4, 0.12), trim);
    U.Box('TabelaDirek', world, V(-4.3, 1.2, -2.4), V(0.12, 2.4, 0.12), trim);
    U.Box('ResTabela', world, V(-6, 2.25, -2.4), V(3.6, 0.65, 0.12), C(0.16, 0.22, 0.38));
    U.Text(world, V(-6, 2.3, -2.55), 'RESEPSİYON', 0.075, C(1, 0.86, 0.42));
    this.AddObstacle(-7.85, -2.55, -7.55, -2.25);
    this.AddObstacle(-4.45, -2.55, -4.15, -2.25);

    // Kafe (doğu) ve havuz (batı)
    this.cafe = new Cafe(); this.cafe.Build(world, wood);
    this.pool = new Pool(); this.pool.Build(world, westFill);

    // Bekleme salonu (batı): iki sıra koltuk karşılıklı
    this.BuildLounge(wood);

    this.laundry = new Laundry(); this.laundry.Build(world);
    this.Ob(U.Furn('coatRackStanding', world, V(-9, 0, -11.5), 0, 2.2, V(0.4, 1.7, 0.4), wood));

    // İçecek makinesi
    U.Box('Makine', world, V(14.5, 1, -2.5), V(0.9, 2, 1.2), C(0.85, 0.2, 0.25));
    U.Prim('MakineCam', world, V(14.04, 1.2, -2.5), V(0.04, 1.2, 0.8), U.Glow(C(0.7, 0.9, 1), 0.8));
    this.AddObstacle(14, -3.15, 15, -1.85);

    this.Painting(V(-15.03, 0.85, -9.2), C(0.35, 0.6, 0.85));
    this.Painting(V(15.03, 0.85, -3.9), C(0.95, 0.6, 0.35));

    this.Plant(V(14.4, 0, -11.4), 1.1);
    this.Plant(V(-14.4, 0, 3.2), 1);
    this.Plant(V(14.4, 0, -4.4), 0.9);
    const entrancePlants = U.Pivot(world, V(), 'GirisBitkileri');
    this.plantParent = entrancePlants;
    this.Plant(V(-3.2, 0, -11.4), 0.8);
    this.Plant(V(3.2, 0, -11.4), 0.8);
    this.plantParent = null;
    this.AddObstacle(-3.6, -11.8, -2.8, -11);
    this.AddObstacle(2.8, -11.8, 3.6, -11);
    this.Plant(V(-14.4, 0, -5.4), 0.9);

    // Resepsiyon, kasa, odalar
    this.reception.Init(world);
    this.deskPile = MoneyPile.Create(world, V(-3, 0, -4.2));

    this.BuildWing(wallM, trim);
    this.BuildFloor2(wallM, trim);
    for (let i = 0; i < Eco.RoomUnlock.length; i++) {
      const r = new Room();
      if (i < Eco.Floor2Start) r.Init(i < Eco.WingStart ? world : this.wingRoot, i, GameManager.RoomX[i]);
      else r.Init(this.floor2Root, i, GameManager.RoomX[i - Eco.Floor2Start], Elevator.Floor2Z);
      this.rooms.push(r);
    }
    this.elevator = new Elevator(); this.elevator.Build(world, this.floor2Root);
    Decor.Build(world, lobbyCarpet, lobbyEdge, entrancePlants, deskDecor, this.paintingCanvases);
    this.BuildSpecialDecor();
    this.BuildStarDecor();
    this.BuildLamps();

    // Oyuncu
    this.player = new Player();
    this.player.transform.position.set(-3, 0, -3.4);
    this.players = [this.player];

    // Kamera
    this.dayNight.Init();
    this.camFollow = new CameraFollow();
    this.camFollow.target = this.player.transform;
  }

  FrontWall(parent, x, oz, wallM, trim) {
    this.Wall('OnDuvar', V(x - 1.65, 0.35, oz + 4), V(1.7, 0.7, 0.2), wallM, trim, parent);
    this.Wall('OnDuvar', V(x + 1.65, 0.35, oz + 4), V(1.7, 0.7, 0.2), wallM, trim, parent);
    U.Box('KapiPervaz', parent, V(x - 0.85, 0.45, oz + 4), V(0.12, 0.9, 0.3), trim);
    U.Box('KapiPervaz', parent, V(x + 0.85, 0.45, oz + 4), V(0.12, 0.9, 0.3), trim);
  }

  BuildLounge(wood) {
    const world = this.world;
    this.reception = new Reception();
    U.Prim('SalonHali', world, V(-11.9, 0.012, -9.15), V(5.6, 0.02, 2.4), U.Mat(C(0.45, 0.6, 0.5), U.CarpetTex, { x: 3, y: 1.3 }, 0.05, 0));
    U.Flat('SalonHaliKenar', world, V(-11.9, 0.006, -9.15), V(5.9, 0.02, 2.7), C(0.95, 0.85, 0.55));
    U.Text(world, V(-11.9, 0.6, -9.15), 'BEKLEME SALONU', 0.05, C(1, 1, 1, 0.7));
    const xs = [-13.6, -11.9, -10.2];
    for (const row of [{ z: -10.9, yaw: 0, fwd: Vec.forward }, { z: -7.4, yaw: 180, fwd: Vec.back }]) {
      for (const x of xs) {
        this.Ob(U.Furn('loungeChair', world, V(x, 0, row.z), row.yaw, 2.2, V(1.1, 1, 1), C(0.55, 0.75, 0.6)));
        this.reception.seats.push(new Reception.Seat({ pos: V(x, 0, row.z), fwd: row.fwd.clone() }));
      }
      for (const x of [-12.75, -11.05]) {
        const st = U.Furn('sideTable', world, V(x, 0, row.z - row.fwd.z * 0.15), row.yaw, 1.1, V(0.5, 0.6, 0.4), wood);
        this.Ob(st);
        U.Furn('plantSmall3', world, V(x, st.max.y, row.z - row.fwd.z * 0.15), 0, 3, V(0.2, 0.3, 0.2), C(0.3, 0.65, 0.35));
      }
    }
  }

  SetupLook() {
    // Güneş: 99_main.js kurar. Ortam ışığı ve sis DayNight'ta güncellenir.
    SunState.x = 52; SunState.y = -38;
    scene.fog.near = 40; scene.fog.far = 85;
  }

  BuildOutside() {
    const world = this.world, city = Chain.cur;
    const gc = city === 1 ? C(0.93, 0.86, 0.68) : city === 2 ? C(0.82, 0.7, 0.5) : C(0.55, 0.78, 0.45);
    const grassM = U.Mat(gc, U.GrassTex, { x: 24, y: 14 }, 0.1, 0).clone();
    U.Prim('Cim', world, V(0, -0.16, -8), V(110, 0.1, 64), grassM);
    this.lowGrass = grassM;
    Seasons.RegisterGrass(grassM);
    const walkM = U.Mat(C(0.86, 0.84, 0.8), U.TileTex, { x: 30, y: 1.4 }, 0.2, 0).clone();
    U.Prim('Kaldirim', world, V(0, -0.08, -14), V(70, 0.1, 3.2), walkM);
    U.Box('KaldirimTasi', world, V(0, -0.04, -15.65), V(70, 0.12, 0.2), C(0.7, 0.7, 0.7));
    const roadM = U.Mat(C(0.3, 0.31, 0.34)).clone();
    U.Prim('Asfalt', world, V(0, -0.1, -19.5), V(70, 0.05, 7.5), roadM);
    // Yağmurda dış zeminler koyulaşır ve parlar, birikintiler oluşur
    Events.RegisterWet(grassM, 0.8, 0.45);
    Events.RegisterWet(walkM, 0.72, 0.82);
    Events.RegisterWet(roadM, 0.7, 0.9);
    const puddleM = U.Mat(C(0.36, 0.43, 0.52), null, null, 0.97, 0);
    const pr = U.Pivot(world, V(), 'Birikintiler');
    for (const pp of [V(-11.5, -0.02, -14.3), V(-5.6, -0.02, -13.7), V(6.8, -0.02, -14.4), V(12.6, -0.02, -13.8),
      V(19, -0.02, -14.2), V(-19.5, -0.02, -13.9), V(-14, -0.07, -18.2), V(-2.5, -0.07, -21.4),
      V(6.2, -0.07, -17.4), V(21, -0.07, -20.8), V(-24, -0.07, -20.2)]) {
      const pd = U.Prim('Birikinti', pr, pp, V(Random.Range(1.6, 2.6), 0.01, Random.Range(0.8, 1.3)), puddleM, 'Cylinder');
      pd.rotation.set(0, Random.Range(-20, 20) * Mathf.Deg2Rad, 0);
      U.NoShadow(pd);
      Events.RegisterPuddle(pd);
    }
    for (let i = -16; i <= 16; i++) U.Flat('Serit', world, V(i * 2.2, -0.07, -19.5), V(1.1, 0.02, 0.15), C(0.95, 0.95, 0.9));
    U.Flat('GirisYolu', world, V(0, -0.07, -12.9), V(4.2, 0.06, 1.3), C(0.86, 0.84, 0.8));

    for (const x of [-24, -16, -8, 8, 16, 24]) this.Green(V(x, 0, -16.6), 1 + Math.abs(x) * 0.008);
    for (const z of [-8, 0, 8]) { this.Green(V(-31, 0, z), 1.2); this.Green(V(38, 0, z), 1.15); }
    this.Green(V(-20, 0, 9), 1.1);
    this.Green(V(-26, 0, 9.5), 1.25);
    for (let x = 4; x <= 14; x += 2.5) { this.Bush(V(x, 0, -12.95)); this.Bush(V(-x, 0, -12.95)); }
    this.LampPost(V(-4.2, 0, -15.2));
    this.LampPost(V(4.2, 0, -15.2));
    this.Car(V(-11, 0, -18), C(0.3, 0.55, 0.85));
    this.Car(V(12, 0, -18), C(0.95, 0.75, 0.3));
    if (city === 1) this.BuildBodrum();
    if (city === 2) this.BuildKapadokya();
  }

  // Şehre göre ağaç: Bodrum'da palmiye
  Green(p, s) { if (Chain.cur === 1) this.Palm(p, s); else this.Tree(p, Chain.cur === 2 ? s * 0.85 : s); }

  Palm(p, s) {
    const world = this.world, bark = C(0.6, 0.45, 0.3), leaf = C(0.3, 0.62, 0.3);
    let top = p.clone();
    for (let k = 0; k < 5; k++) {
      const c = Vec.add(p, V(0.12 * k * s, (0.45 + k * 0.8) * s, 0));
      U.Box('PalmGovde', world, c, Vec.mul(V(0.32 - k * 0.03, 0.42, 0.32 - k * 0.03), s), bark, 'Cylinder');
      top = c;
    }
    top = Vec.add(top, V(0, 0.45 * s, 0));
    for (let k = 0; k < 7; k++) {
      const a = k * 360 / 7;
      const l = U.Box('PalmYaprak', world, Vec.add(top, Vec.rotY(V(0.75 * s, -0.15 * s, 0), a)), Vec.mul(V(1.7, 0.06, 0.42), s), leaf);
      setEuler(l, 0, a, -18);
    }
    for (let k = 0; k < 3; k++)
      U.Box('Hindistan', world, Vec.add(top, Vec.mul(V(Math.cos(k * 2.1) * 0.2, -0.25, Math.sin(k * 2.1) * 0.2), s)), Vec.mul(Vec.one, 0.2 * s), C(0.45, 0.32, 0.18), 'Sphere');
  }

  // ---------------- Bodrum: deniz, kumsal, tekneler, begonviller ----------------
  BuildBodrum() {
    const world = this.world;
    U.Prim('Deniz', world, V(0, -0.09, 48), V(150, 0.02, 62), U.Mat(C(0.12, 0.52, 0.82), null, null, 0.95, 0));
    U.Flat('Kopuk', world, V(0, -0.07, 17.1), V(150, 0.02, 0.35), Col.white);
    U.Flat('SigSu', world, V(0, -0.075, 18.3), V(150, 0.02, 2.2), C(0.35, 0.75, 0.85));
    const uc = [C(0.95, 0.35, 0.35), C(0.25, 0.5, 0.9), C(1, 0.8, 0.25), C(0.3, 0.7, 0.5)];
    const bx = [-12, -6, 0, 6, 12];
    for (let i = 0; i < bx.length; i++) {
      U.Box('SemsiyeDirek', world, V(bx[i], 1.2, 13.6), V(0.07, 1.2, 0.07), Col.white, 'Cylinder');
      U.Box('Semsiye', world, V(bx[i], 2.35, 13.6), V(2.4, 0.14, 2.4), uc[i % uc.length], 'Cylinder');
      U.Box('SemsiyeTepe', world, V(bx[i], 2.45, 13.6), V(0.9, 0.12, 0.9), Col.white, 'Cylinder');
      U.Box('Sezlong', world, V(bx[i] - 0.8, 0.2, 14.2), V(0.7, 0.12, 1.8), Col.white);
      U.Box('Havlu', world, V(bx[i] - 0.8, 0.27, 14.2), V(0.6, 0.02, 1.5), uc[(i + 1) % uc.length]);
    }
    for (const bp of [V(-20, 0, 21.5), V(4, 0, 23), V(22, 0, 21), V(-7, 0, 27)]) {
      const boat = U.Pivot(world, bp, 'Tekne');
      U.Box('Govde', boat, V(0, 0.15, 0), V(3.6, 0.55, 1.2), Col.white);
      U.Box('GovdeSerit', boat, V(0, 0.3, 0), V(3.62, 0.1, 1.22), C(0.2, 0.45, 0.75));
      U.Box('Kabin', boat, V(-0.4, 0.6, 0), V(1.3, 0.45, 0.9), C(0.85, 0.7, 0.5));
      U.Box('Direk', boat, V(0.6, 1.9, 0), V(0.07, 1.6, 0.07), C(0.5, 0.38, 0.25), 'Cylinder');
      setEuler(U.Box('Yelken', boat, V(1.05, 1.9, 0), V(1.3, 1.3, 0.03), C(0.98, 0.96, 0.9)), 0, 0, 45);
      new Bob(boat).Set(0.08, 1.1, Vec.zero, 0);
    }
    // Beyaz duvarlarda begonviller
    for (const x of [-13.5, -10, -6.5, 6.5, 10, 13.5]) for (let k = 0; k < 3; k++)
      U.Box('Begonvil', world, V(x + (k - 1) * 0.45, 0.95 + (k % 2) * 0.2, -12.45), V(0.6, 0.45, 0.35), k % 2 === 0 ? C(0.95, 0.3, 0.6) : C(0.85, 0.2, 0.5), 'Sphere');
  }

  // ---------------- Kapadokya: peri bacaları ve sıcak hava balonları ----------------
  BuildKapadokya() {
    for (const fp of [[-24, 14, 0.9], [-14, 14.5, 1], [-4, 14, 0.85], [7, 14.5, 1.05], [18, 14, 0.9], [29, 14.5, 1], [-19, 19, 1.25], [-9, 19.5, 1.2],
      [2, 19, 1.3], [12, 19.5, 1.2], [23, 19, 1.25], [-36, -4, 1.1], [-35, 6, 1], [43, -6, 1.1], [42, 5, 1]])
      this.FairyChimney(V(fp[0], 0, fp[1]), fp[2]);
    const bc = [[C(0.95, 0.3, 0.3), C(1, 0.85, 0.3)], [C(0.3, 0.55, 0.95), C(1, 1, 1)], [C(0.95, 0.6, 0.2), C(0.6, 0.3, 0.75)], [C(0.35, 0.75, 0.45), C(1, 0.9, 0.4)], [C(0.9, 0.35, 0.6), C(0.3, 0.75, 0.9)]];
    // Otelin üzerinden süzülen balonlar
    const bp = [V(-22, 7.5, 2), V(3, 8.5, -5), V(26, 7, 7), V(-38, 8, -2), V(40, 8, 4)];
    for (let i = 0; i < bp.length; i++) this.HotAirBalloon(bp[i], bc[i][0], bc[i][1], i);
  }

  FairyChimney(p, s) {
    const world = this.world, rock = C(0.92, 0.82, 0.66), cap = C(0.55, 0.42, 0.32);
    U.Box('PeriBacasi', world, Vec.add(p, V(0, 1.3 * s, 0)), Vec.mul(V(3.2, 1.3, 3.2), s), rock, 'Cylinder');
    U.Box('PeriBacasi', world, Vec.add(p, V(0, 3.5 * s, 0)), Vec.mul(V(2.2, 1, 2.2), s), rock, 'Cylinder');
    U.Box('PeriBacasi', world, Vec.add(p, V(0, 5.2 * s, 0)), Vec.mul(V(1.3, 0.8, 1.3), s), rock, 'Cylinder');
    U.Box('Sapka', world, Vec.add(p, V(0, 6.2 * s, 0)), Vec.mul(V(1.9, 0.9, 1.9), s), cap, 'Sphere');
    U.Box('Pencere', world, Vec.add(p, V(0, 1.6 * s, -1.58 * s)), Vec.mul(V(0.45, 0.6, 0.05), s), C(0.3, 0.22, 0.18));
    U.Box('Pencere', world, Vec.add(p, V(0.5 * s, 3.6 * s, -1.08 * s)), Vec.mul(V(0.3, 0.4, 0.05), s), C(0.3, 0.22, 0.18));
  }

  HotAirBalloon(p, a, b, seed) {
    const root = U.Pivot(this.world, p, 'SicakHavaBalonu');
    root.scale.setScalar(0.6);
    U.Box('Zarf', root, V(), V(2.6, 3, 2.6), a, 'Sphere');
    U.Box('Serit', root, V(0, -0.2, 0), V(2.66, 0.7, 2.66), b, 'Sphere');
    U.Box('Agiz', root, V(0, -1.55, 0), V(0.8, 0.2, 0.8), b, 'Cylinder');
    for (const o of [V(0.3, 0, 0.3), V(-0.3, 0, 0.3), V(0.3, 0, -0.3), V(-0.3, 0, -0.3)])
      U.Box('Ip', root, V(o.x, -2.05, o.z), V(0.02, 0.9, 0.02), C(0.3, 0.25, 0.2));
    U.Box('Sepet', root, V(0, -2.6, 0), V(0.75, 0.5, 0.75), C(0.6, 0.42, 0.25));
    new Bob(root).Set(0.35, 0.4 + seed * 0.07, V(0.45 + seed * 0.05, 0, 0), 42);
  }

  Wall(name, pos, scale, m, trim, parent) {
    const p = parent || this.world;
    U.Prim(name, p, pos, scale, m);
    U.Box(name + 'Pervaz', p, V(pos.x, 0.08, pos.z), V(scale.x + 0.04, 0.16, scale.z + 0.04), trim);
    U.Box(name + 'Ust', p, V(pos.x, pos.y + scale.y / 2, pos.z), V(scale.x + 0.06, 0.06, scale.z + 0.06), Col.white);
  }

  // İki oda arasındaki duvar (Başkanlık Süiti kurulunca kaldırılır)
  Divider(pos, m, trim, parent) { const g = U.Pivot(parent, V(), 'AraDuvarGrup'); this.Wall('AraDuvar', pos, V(0.2, 1.8, 6.6), m, trim, g); return g; }
  WallGroup(name, pos, scale, m, trim) { const g = U.Pivot(this.world, V(), name); this.Wall(name, pos, scale, m, trim, g); return g; }

  // ---------------- Yeni Kanat (doğu, oda 107-110) ----------------
  BuildWing(wallM, trim) {
    this.wingRoot = U.Pivot(this.world, V(), 'YeniKanat');
    const w = this.wingRoot;
    U.Prim('KoridorZemin', w, V(25.3, -0.05, 1.6), V(20.2, 0.1, 5), U.Mat(C(0.96, 0.91, 0.82), U.TileTex, { x: 20.2 / 3, y: 5 / 3 }, 0.45, 0));
    U.Prim('KoridorHali', w, V(25.3, 0.01, 1.6), V(19, 0.02, 1.6), U.Mat(C(0.6, 0.2, 0.25), U.CarpetTex, { x: 10, y: 1 }, 0.05, 0));
    this.Wall('KoridorGuney', V(25.3, 0.6, -0.95), V(20.2, 1.2, 0.3), wallM, trim, w);
    this.Wall('KanatDogu', V(35.4, 0.9, 4.9), V(0.3, 1.8, 11.9), wallM, trim, w);
    this.Wall('KanatArka', V(25.3, 1.3, 10.65), V(20.2, 2.6, 0.3), wallM, trim, w);
    Events.Shelter(w, V(25.35, 6, 4.9), V(20.3, 14, 11.9));
    for (let i = 6; i < 9; i++) this.dividers[i] = this.Divider(V(GameManager.RoomX[i] + 2.5, 0.9, 7.25), wallM, trim, w);
    for (let i = 6; i < 10; i++) this.FrontWall(w, GameManager.RoomX[i], 0, wallM, trim);
    U.Box('KanatTabela', w, V(25.3, 1.55, -0.95), V(4, 0.6, 0.2), C(0.16, 0.22, 0.38));
    U.Text(w, V(25.3, 1.6, -1.1), 'YENİ KANAT', 0.06, C(1, 0.86, 0.42));

    this.wingLocked = U.Pivot(this.world, V(), 'KanatInsaat');
    const l = this.wingLocked;
    for (let x = 16; x <= 35; x += 1.6) {
      U.Box('InsaatCit', l, V(x, 0.6, -0.8), V(1.4, 1.2, 0.06), C(1, 0.8, 0.2));
      U.Box('InsaatSerit', l, V(x, 0.6, -0.84), V(1.4, 0.18, 0.02), C(0.2, 0.2, 0.22));
    }
    U.Box('Vinç', l, V(30, 3, 6), V(0.4, 6, 0.4), C(1, 0.75, 0.15));
    U.Box('VinçKol', l, V(27, 6, 6), V(7, 0.3, 0.3), C(1, 0.75, 0.15));
    U.Text(l, V(25, 1.9, -1), 'YAKINDA · YENİ KANAT', 0.06, C(0.25, 0.2, 0.1));
  }

  // ---------------- 2. Kat (oda 201-206) ----------------
  BuildFloor2(wallM, trim) {
    this.floor2Root = U.Pivot(this.world, V(), 'Kat2');
    const f = this.floor2Root, F = Elevator.Floor2Z;
    // Yükseklik hissi: aşağıda kalan zemin ve bina cephesi
    U.Prim('AltZemin', f, V(0, -9, F + 20), V(140, 0.1, 76), this.lowGrass);
    U.Prim('Yol', f, V(0, -8.9, F - 11), V(140, 0.05, 4), U.Mat(C(0.35, 0.36, 0.4)));
    for (let x = -66; x <= 66; x += 6) U.Box('YolCizgi', f, V(x, -8.85, F - 11), V(2.5, 0.02, 0.25), Col.white);
    U.Box('Cephe', f, V(0, -4.6, F + 5), V(40, 9, 24), C(0.93, 0.86, 0.74));
    for (let x = -18; x <= 18; x += 3) for (let fl = 0; fl < 2; fl++)
      U.Box('Pencere', f, V(x, -2.4 - fl * 3.6, F - 7.02), V(1.3, 1.5, 0.06), C(0.55, 0.75, 0.95));
    const rnd = new SysRandom(7);
    for (let k = 0; k < 26; k++) {
      const x = rnd.NextDouble() * 120 - 60, z = F - 16 + rnd.NextDouble() * 50;
      if (Math.abs(x) < 23 && z > F - 9) continue;
      if (Math.abs(z - (F - 11)) < 3) continue;
      U.Box('AgacGovde', f, V(x, -8.2, z), V(0.4, 1.6, 0.4), C(0.45, 0.3, 0.2), 'Cylinder');
      const cr = U.Box('AgacTac', f, V(x, -6.6, z), V(2.4, 2.4, 2.4), C(0.3, 0.62, 0.3), 'Sphere');
      Seasons.RegisterCrown(cr);
    }
    U.Prim('Cati', f, V(0, -0.08, F + 5), V(40, 0.12, 24), U.Mat(C(0.78, 0.76, 0.72), U.TileTex, { x: 14, y: 8 }, 0.2, 0));
    for (let x = -19.5; x <= 19.5; x += 1.5) {
      U.Box('Korkuluk', f, V(x, 0.5, F - 6.9), V(0.08, 1, 0.08), Col.white);
      U.Box('Korkuluk', f, V(x, 0.5, F + 16.9), V(0.08, 1, 0.08), Col.white);
    }
    U.Box('KorkulukUst', f, V(0, 1, F - 6.9), V(39.2, 0.08, 0.08), Col.white);
    U.Box('KorkulukUst', f, V(0, 1, F + 16.9), V(39.2, 0.08, 0.08), Col.white);
    U.Prim('KoridorZemin', f, V(0, -0.04, F + 1.65), V(30.5, 0.1, 4.7), U.Mat(C(0.96, 0.91, 0.82), U.TileTex, { x: 10, y: 1.6 }, 0.45, 0));
    U.Prim('KoridorHali', f, V(0, 0.01, F + 1.9), V(28, 0.02, 1.6), U.Mat(C(0.2, 0.3, 0.55), U.CarpetTex, { x: 14, y: 1 }, 0.05, 0));
    this.Wall('Kat2Guney', V(0, 0.6, F - 0.75), V(30.9, 1.2, 0.3), wallM, trim, f);
    this.Wall('Kat2Bati', V(-15.25, 0.9, F + 5), V(0.4, 1.8, 11.8), wallM, trim, f);
    this.Wall('Kat2Dogu', V(15.25, 0.9, F + 5), V(0.4, 1.8, 11.8), wallM, trim, f);
    this.Wall('Kat2Arka', V(0, 1.3, F + 10.65), V(30.9, 2.6, 0.3), wallM, trim, f);
    Events.Shelter(f, V(0, 6, F + 5), V(30.9, 14, 11.8));
    for (let i = 0; i < 5; i++) this.dividers[Eco.Floor2Start + i] = this.Divider(V(GameManager.RoomX[i] + 2.5, 0.9, F + 7.25), wallM, trim, f);
    for (let i = 0; i < 6; i++) this.FrontWall(f, GameManager.RoomX[i], F, wallM, trim);
    U.Box('Kat2Tabela', f, V(-6, 1.55, F - 0.75), V(3, 0.6, 0.2), C(0.16, 0.22, 0.38));
    U.Text(f, V(-6, 1.6, F - 0.9), '2. KAT', 0.07, C(1, 0.86, 0.42));
    U.Furn('pottedPlant', f, V(14.3, 0, F + 0.2), 0, 2.4, Vec.one, Col.green);
    // Çatı terası (koridorun önünde, dekor)
    U.Prim('TerasZemin', f, V(0, -0.01, F - 3.9), V(30, 0.04, 5.4), U.Mat(C(0.62, 0.45, 0.3), U.WoodTex, { x: 10, y: 2 }, 0.3, 0));
    const uc = [C(1, 0.45, 0.4), C(0.35, 0.65, 0.95), C(1, 0.8, 0.3), C(0.45, 0.8, 0.5)];
    for (const lx of [-11.5, -8.7, 8.7, 11.5]) U.Furn('loungeChairRelax', f, V(lx, 0, F - 3.6), 180, 2.2, V(1, 0.8, 1.6), Col.white);
    for (const ux of [-10.1, 10.1]) {
      U.Box('SemsiyeDirek', f, V(ux, 1.2, F - 3.3), V(0.07, 1.2, 0.07), Col.white, 'Cylinder');
      U.Box('Semsiye', f, V(ux, 2.35, F - 3.3), V(2.4, 0.12, 2.4), uc[ux < 0 ? 0 : 1], 'Cylinder');
    }
    for (let k = 0; k < 3; k++) {
      const tx = -3 + k * 3;
      U.Furn('tableRound', f, V(tx, 0, F - 3.8), 0, 2.2, V(1, 0.8, 1), Col.white);
      U.Furn('chairCushion', f, V(tx - 0.9, 0, F - 3.8), 90, 2.2, V(0.6, 1, 0.6), Col.white);
      U.Furn('chairCushion', f, V(tx + 0.9, 0, F - 3.8), -90, 2.2, V(0.6, 1, 0.6), Col.white);
    }
    for (const x of [-14.4, -6.2, 6.2, 14.4]) U.Furn('pottedPlant', f, V(x, 0, F - 6.1), 0, 2.4, Vec.one, Col.green);
    // ışık zinciri
    for (let x = -14; x <= 14; x += 0.9) U.Box('Ampul', f, V(x, 2.3 + Math.sin(x * 0.7) * 0.12, F - 1.2), V(0.12, 0.12, 0.12), C(1, 0.85, 0.45), 'Sphere');
    U.Text(f, V(0, 0.05, F - 5.9), 'TERAS', 0.08, C(1, 0.86, 0.5)).makeFlat();
  }

  SetFloor2(open, fx) {
    this.floor2Open = open;
    this.floor2Root.visible = open;
    this.elevator.SetOpen(open);
    if (fx) {
      U.Burst(Vec.add(Elevator.LobbyPad, V(0, 2, 0)), C(1, 0.85, 0.3), C(0.5, 0.8, 1), 120, 7);
      Sfx.Play('unlock');
      this.Celebrate('2. Kat açıldı!', 'Asansörün önündeki dairede bekleyerek kat değiştirebilirsin. 6 yeni oda (201-206) menüde.');
    }
  }

  // ---------------- Özel gün süsleri (gerçek takvim) ----------------
  BuildSpecialDecor() {
    const world = this.world;
    // Yılbaşı: lobide çam ağacı ve ışık zincirleri
    const y = this.specialDecor[0] = U.Pivot(world, V(), 'Yilbasi');
    const tp = V(-2.6, 0, -16.7);
    U.Box('Govde', y, Vec.add(tp, V(0, 0.3, 0)), V(0.3, 0.3, 0.3), C(0.45, 0.3, 0.2), 'Cylinder');
    for (let k = 0; k < 4; k++) U.Box('Dal', y, Vec.add(tp, V(0, 0.9 + k * 0.55, 0)), V(1.8 - k * 0.4, 0.55, 1.8 - k * 0.4), C(0.15, 0.5, 0.25), 'Cylinder');
    U.Prim('Yildiz', y, Vec.add(tp, V(0, 3.15, 0)), V(0.35, 0.35, 0.35), U.Glow(C(1, 0.85, 0.3), 3), 'Sphere');
    const orn = [C(1, 0.2, 0.25), C(1, 0.8, 0.2), C(0.3, 0.6, 1)];
    for (let k = 0; k < 12; k++) {
      const a = k * 2.4, h = 0.9 + (k % 4) * 0.55, rr = 0.85 - (k % 4) * 0.2;
      U.Prim('Sus', y, Vec.add(tp, V(Math.cos(a) * rr, h, Math.sin(a) * rr)), V(0.16, 0.16, 0.16), U.Glow(orn[k % 3], 1.5), 'Sphere');
    }
    for (let k = 0; k < 3; k++) U.Box('Hediye', y, Vec.add(tp, V(-0.7 + k * 0.7, 0.18, 1.05)), V(0.45, 0.36, 0.45), orn[k]);
    for (let x = -14; x <= 14; x += 1.4) U.Prim('IsikZincir', y, V(x, 1.25, -12.1), V(0.12, 0.12, 0.12), U.Glow(orn[Math.floor((x + 14) / 1.4 + 1e-6) % 3], 2.5), 'Sphere');
    if (Seasons.SpecialDay === 'yilbasi') this.AddObstacle(tp.x - 1, tp.z - 1.4, tp.x + 1, tp.z + 1);

    // Sevgililer günü: kalpler ve pembe balonlar
    const v = this.specialDecor[1] = U.Pivot(world, V(), 'Sevgililer');
    for (let k = 0; k < 8; k++) {
      const p = V(-12 + k * 3.4, 2.6 + (k % 2) * 0.3, -11.9);
      U.Prim('Balon', v, p, V(0.45, 0.55, 0.45), U.Glow(k % 2 === 0 ? C(1, 0.35, 0.55) : C(1, 0.7, 0.85), 0.8), 'Sphere');
      U.Box('Ip', v, Vec.add(p, V(0, -0.6, 0)), V(0.01, 0.7, 0.01), Col.white);
    }
    U.Text(v, V(4, 0.5, -6.2), '♥', 0.4, C(1, 0.4, 0.6, 0.7));

    // Ulusal bayramlar: kırmızı bayraklar ve flama
    const b = this.specialDecor[2] = U.Pivot(world, V(), 'Bayram');
    const red = C(0.85, 0.1, 0.15);
    for (const x of [-11, -6, 6, 11]) {
      U.Box('Direk', b, V(x, 2, -12.95), V(0.08, 2, 0.08), Col.white, 'Cylinder');
      U.Box('Bayrak', b, V(x + 0.55, 3.55, -12.95), V(1.1, 0.72, 0.03), red);
      setEuler(U.Box('Hilal', b, V(x + 0.38, 3.55, -12.99), V(0.38, 0.38, 0.02), Col.white, 'Cylinder'), 90, 0, 0);
      setEuler(U.Box('HilalIc', b, V(x + 0.45, 3.55, -13.0), V(0.3, 0.3, 0.02), red, 'Cylinder'), 90, 0, 0);
      U.Box('Yildiz', b, V(x + 0.72, 3.55, -13.0), V(0.12, 0.12, 0.02), Col.white);
    }
    for (let x = -14; x <= 14; x += 0.9) U.Box('Flama', b, V(x, 2.2, -12.1), V(0.35, 0.3, 0.02), Math.floor((x + 14) / 0.9 + 1e-6) % 2 === 0 ? red : Col.white);
    const sd = Seasons.SpecialDay;
    y.visible = sd === 'yilbasi'; v.visible = sd === 'sevgililer'; b.visible = sd === 'bayram';
  }

  SetWing(open, fx) {
    this.wingOpen = open;
    this.wingRoot.visible = open;
    this.wingLocked.visible = !open;
    this.eastDoorFill.visible = !open;
    if (fx) {
      U.Burst(V(25, 2, 3), C(1, 0.85, 0.3), C(0.5, 0.8, 1), 140, 8);
      Sfx.Play('unlock');
      this.Celebrate('Yeni Kanat açıldı!', '4 yeni oda (107-110) artık menüden açılabilir.');
    }
  }

  // ---------------- Gece lambaları ----------------
  BuildLamps() {
    const warm = C(1, 0.82, 0.55), dn = this.dayNight;
    // Lobi tavan ışıkları
    for (const p of [V(-9, 3.2, -7), V(0, 3.2, -7), V(9, 3.2, -7), V(-9, 3.2, 0.5), V(0, 3.2, 0.5), V(9, 3.2, 0.5)]) dn.AddLamp(p, 11, 4.5, warm);
    // Duvar fenerleri (gece yanar)
    for (const x of [-11.5, -6, 6, 11.5]) this.Sconce(V(x, 0.9, -12.25));
    for (const z of [-10.6, -7]) this.Sconce(V(-15.25, 1.2, z));
    for (const z of [-11.3, -4.6]) this.Sconce(V(15.25, 1.2, z));
    for (const r of this.rooms) dn.AddLamp(V(r.x, 2.6, r.Z(7.2)), 6, 2.4, warm, r.go);
    dn.AddLamp(V(-6, 3, Elevator.Floor2Z + 1.6), 11, 4, warm, this.floor2Root);
    dn.AddLamp(V(6, 3, Elevator.Floor2Z + 1.6), 11, 4, warm, this.floor2Root);
    dn.AddLamp(V(-4.2, 2.9, -15.2), 8, 5, warm);
    dn.AddLamp(V(4.2, 2.9, -15.2), 8, 5, warm);
    dn.AddLamp(V(-21.7, 2.5, -1), 10, 4, C(0.6, 0.85, 1));
    dn.AddLamp(V(25, 2.6, 1.6), 10, 3.5, warm, this.wingRoot);
  }

  // Duvar üstü küçük fener: gündüz sönük, gece yanar ve çevresini aydınlatır
  Sconce(top) {
    const world = this.world, dark = C(0.22, 0.2, 0.2), warm = C(1, 0.82, 0.55);
    U.Box('FenerDirek', world, Vec.add(top, V(0, 0.2, 0)), V(0.07, 0.4, 0.07), dark);
    U.Box('FenerTaban', world, Vec.add(top, V(0, 0.3, 0)), V(0.3, 0.05, 0.3), dark);
    const glass = U.Prim('FenerCam', world, Vec.add(top, V(0, 0.5, 0)), V(0.24, 0.32, 0.24), U.Mat(C(1, 0.95, 0.85)));
    U.Box('FenerKapak', world, Vec.add(top, V(0, 0.7, 0)), V(0.34, 0.07, 0.34), dark);
    this.dayNight.AddFixture(glass, C(1, 0.85, 0.55), 1.6);
    this.dayNight.AddLamp(Vec.add(top, V(0, 0.9, 0)), 6.5, 3, warm);
  }

  // ---------------- Yıldızla büyüyen dış cephe ----------------
  BuildStarDecor() {
    for (let t = 2; t <= 5; t++) this.starDecor[t] = U.Pivot(this.world, V(), 'DisCephe' + t + 'Yildiz');
    // 2 yıldız: giriş saksıları
    const d2 = this.starDecor[2];
    for (const x of [-3.3, 3.3]) {
      U.Box('Saksi', d2, V(x, 0.35, -13.1), V(0.9, 0.7, 0.9), C(0.85, 0.85, 0.88));
      U.Box('Cicekler', d2, V(x, 0.85, -13.1), V(0.95, 0.5, 0.95), C(0.35, 0.65, 0.35), 'Sphere');
      for (let k = 0; k < 5; k++)
        U.Box('Cicek', d2, V(x + Random.Range(-0.35, 0.35), 1.05, -13.1 + Random.Range(-0.35, 0.35)), V(0.16, 0.16, 0.16), k % 2 === 0 ? C(1, 0.45, 0.6) : C(1, 0.9, 0.4), 'Sphere');
    }
    // 3 yıldız: bayraklar
    const d3 = this.starDecor[3];
    const fc = [C(0.85, 0.15, 0.2), C(0.2, 0.45, 0.85), C(0.95, 0.75, 0.2), C(0.85, 0.15, 0.2)];
    const fx = [-8, -5.5, 5.5, 8];
    for (let i = 0; i < 4; i++) {
      U.Box('BayrakDirek', d3, V(fx[i], 2, -12.9), V(0.08, 2, 0.08), C(0.85, 0.85, 0.88), 'Cylinder');
      U.Box('Bayrak', d3, V(fx[i] + 0.45, 3.5, -12.9), V(0.9, 0.55, 0.03), fc[i]);
    }
    // 4 yıldız: fıskiye
    const d4 = this.starDecor[4];
    U.Box('Havuzcuk', d4, V(-21, 0.25, -11), V(3.4, 0.5, 3.4), C(0.88, 0.86, 0.82), 'Cylinder');
    U.Prim('FiskiyeSu', d4, V(-21, 0.48, -11), V(3, 0.04, 3), U.Mat(C(0.3, 0.7, 0.95), null, null, 0.95, 0.5), 'Cylinder');
    U.Box('FiskiyeOrta', d4, V(-21, 0.9, -11), V(0.6, 0.8, 0.6), C(0.88, 0.86, 0.82), 'Cylinder');
    U.Prim('FiskiyeTepe', d4, V(-21, 1.9, -11), V(0.5, 1.2, 0.5), U.Mat(C(0.6, 0.85, 1), null, null, 0.95, 0.6), 'Sphere');
    // 5 yıldız: kırmızı halı, altın yıldızlar, ışıklar
    const d5 = this.starDecor[5];
    U.Flat('KirmiziHali', d5, V(0, -0.02, -14), V(2.4, 0.02, 3.4), C(0.75, 0.12, 0.15));
    for (let k = 0; k < 5; k++) U.Text(d5, V(-1.2 + k * 0.6, 4.15, -12.45), '★', 0.08, C(1, 0.82, 0.25));
    for (const x of [-2.6, 2.6]) U.Prim('Spot', d5, V(x, 0.3, -13.4), V(0.35, 0.35, 0.35), U.Glow(C(1, 0.95, 0.8), 3), 'Sphere');
    this.UpdateStarDecor(false);
  }

  UpdateStarDecor(fx) {
    const tier = Mathf.Clamp(Math.floor(this.Stars + 0.001), 1, 5);
    if (tier === this.starTier) return;
    const up = this.starTier >= 0 && tier > this.starTier;
    this.starTier = tier;
    for (let t = 2; t <= 5; t++) if (this.starDecor[t]) this.starDecor[t].visible = tier >= t;
    if (fx && up) {
      this.Celebrate('Otelin ' + tier + ' yıldız oldu!', tier >= 5 ? 'Artık şehrin en iyi oteli sensin!' : 'Daha çok misafir gelecek, fiyatlar yükseldi ve otelin dışı güzelleşti.');
      U.Burst(V(0, 3, -12.5), C(1, 0.85, 0.3), C(1, 0.5, 0.7), 150, 8);
    }
  }

  AddRating(r) {
    this.ratings.push(r);
    while (this.ratings.length > 20) this.ratings.shift();
    let sum = 0; for (const v of this.ratings) sum += v;
    this.Stars = Mathf.Clamp(sum / this.ratings.length, 1, 5);
    this.UpdateStarDecor(true);
  }

  Celebrate(title, sub) {
    this.celebTitle = title; this.celebSub = sub; this.celebT = 6;
    if (this.player) U.Burst(Vec.add(this.player.transform.position, V(0, 2, 0)), C(1, 0.85, 0.3), C(0.5, 0.8, 1), 80, 6);
    Sfx.Play('unlock');
  }

  Reward(amount, title, what) {
    this.money += amount;
    Quests.Track('earned', amount);
    Report.Bonus(amount);
    this.Celebrate(title, what + '  ·  Ödül: ' + Eco.TL(amount));
    Sfx.Play('coin');
  }

  OnNewDay() {
    const dn = this.dayNight;
    Report.EndOfDay(dn.day - 1);
    Quests.NewDay();
    const prev = Math.floor((Math.max(1, dn.day - 1) - 1) / Seasons.DaysPerSeason) % 4;
    Seasons.Apply();
    Events.NewDay(dn.day);
    Regulars.NewDay(dn.day);
    Reservations.NewDay(dn.day);
    for (const st of this.AllStaff()) st.NewDay();
    const S = Seasons.S;
    if (Seasons.Current !== prev && dn.day > 1)
      Popups.Show(Seasons.Names[Seasons.Current] + ' geldi!', Seasons.Current === S.Yaz ? 'Yaz kalabalığı! Daha çok misafir gelir, havuz dolup taşar.' :
        Seasons.Current === S.Kis ? 'Kar yağıyor. Misafirler kafeye daha çok gider, havuz pek kullanılmaz.' :
          Seasons.Current === S.Sonbahar ? 'Yapraklar dökülüyor. Kafe keyfi artar.' : 'Doğa uyanıyor, ağaçlar çiçek açtı.', 'YENİ MEVSİM').Add('Harika!');
    else if (Seasons.Festival) Popups.Show('Festival günü!', 'Bugün misafir sayısı %50, bahşişler %30 fazla.', 'ÖZEL GÜN').Add('Harika!');
    this.Notify('Gün ' + dn.day + ' · Hava: ' + Events.WNames[Events.weather]);
    for (const st of this.AllStaff()) if (st.morale < 0.25) { this.Notify(st.who + ' çok mutsuz! Personel sekmesinden ikramiye ver'); break; }
    this.Save();
  }

  AllStaff() {
    const a = [];
    if (this.reception.HasStaff) a.push(this.reception.stats);
    for (const c of this.cleaners) a.push(c.stats);
    if (this.cafe.HasBarista) a.push(this.cafe.stats);
    return a;
  }

  StaffMoraleAll(d) { for (const st of this.AllStaff()) st.morale = Mathf.Clamp(st.morale + d, 0.05, 1); }

  StaffBonus(st) {
    if (!this.Pay(st.BonusCost)) return;
    Report.Other(st.BonusCost);
    st.Bonus();
    Sfx.Play('coin');
    this.Notify(st.who + ' çok sevindi! Morali yükseldi');
    this.Save();
  }

  BuyRestRoom() {
    if (this.restRoom || !this.Pay(Eco.RestRoomCost)) return;
    this.restRoom = true;
    this.Celebrate('Personel dinlenme odası!', 'Çalışanlar molada iki kat hızlı dinlenecek, morali daha yavaş düşecek.');
    this.Save();
  }

  // Olay giderleri (rapora "diğer" olarak yazılır)
  Spend(c, what) { const p = Math.min(c, this.money); this.money -= p; Report.Other(p); }
  QueueSpawn(cfg) { this.pendingSpawns.push(cfg); }

  AdoptCat() {
    this.catAdopted = true;
    if (!this.cat) this.cat = Cat.Make('Pamuk');
    Social.Share('Otelin yeni maskotu Pamuk! Bu tatlılığa bakın.', 1, false);
    this.Celebrate('Otelin kedisi: Pamuk!', 'Pamuk artık lobide dolaşıyor. Misafirler onu çok seviyor (memnuniyet +0,1).');
    this.Save();
  }

  BuyTheme(roomIdx, theme) {
    const r = this.rooms[roomIdx];
    const owned = (r.themeOwned & (1 << theme)) !== 0;
    if (!owned) {
      const c = Themes.Cost(roomIdx, theme);
      if (!this.Pay(c)) return;
      this.Notify('Oda ' + r.Number + ' artık ' + Themes.Names[theme] + ' temalı!');
    }
    r.SetTheme(theme, true);
    this.Save();
  }

  // ---- Oda tipleri ve Başkanlık Süiti ----
  BuyKind(i, k) {
    const r = this.rooms[i];
    if (!r.Unlocked || r.IsSuite || r.IsSuitePart || r.kind === k) return;
    if (r.level < RoomKinds.MinLevel(k)) { this.Notify(RoomKinds.Names[k] + ' için en az ' + Eco.LevelNames[RoomKinds.MinLevel(k)] + ' seviye gerekir'); return; }
    if (!this.Pay(RoomKinds.Cost(i, k))) return;
    r.SetKind(k, true);
    this.Notify('Oda ' + r.Number + ' artık ' + RoomKinds.Names[k] + '!');
    this.Save();
  }

  CanSuite(i) {
    if (i < 0 || i + 1 >= this.rooms.length || !RoomKinds.SameSection(i, i + 1)) return false;
    const a = this.rooms[i], b = this.rooms[i + 1];
    return a.level >= 3 && b.level >= 3 && !a.IsSuite && !a.IsSuitePart && !b.IsSuite && !b.IsSuitePart && a.state === Room.State.Clean && b.state === Room.State.Clean;
  }

  MakeSuite(i) {
    if (!this.CanSuite(i) || !this.Pay(RoomKinds.SuiteCost(i))) return;
    this.rooms[i].MakeSuite(this.rooms[i + 1], true);
    if (this.dividers[i]) this.dividers[i].visible = false;
    Story.Track('suite');
    this.Celebrate('Başkanlık Süiti!', 'Oda ' + this.rooms[i].Number + ' ve ' + this.rooms[i + 1].Number + ' birleşti. Sadece VIP ve ünlüler kalır. Gecelik ' + Eco.TL(this.rooms[i].Price) + '.');
    this.Save();
  }

  SetPricing(p) { Pricing.policy = Mathf.Clamp(p, 0, 3); this.Notify('Fiyat politikası: ' + Pricing.Names[Pricing.policy]); this.Save(); }

  // ---- İki oyunculu mod ----
  SetCoop(on) {
    this.coop = on;
    if (on && !this.player2) {
      this.player2 = new Player();
      this.player2.SetSecond();
      this.player2.transform.position.copy(Vec.add(this.player.transform.position, V(1.2, 0, 0)));
      if (!this.Walkable(this.player2.transform.position)) this.player2.transform.position.copy(this.player.transform.position);
      this.player2.SetLook(GameManager.Variants[this.p2Variant], this.p2Name);
      this.players.push(this.player2);
    } else if (!on && this.player2) {
      if (this.laundry) this.laundry.AddClean(this.player2.linen);
      arrRemove(this.players, this.player2);
      this.player2.destroy();
      this.player2 = null;
    }
  }

  SetPlayer2(variant, name) {
    const n = GameManager.Variants.length;
    this.p2Variant = ((variant % n) + n) % n;
    this.p2Name = !name || !String(name).trim() ? 'Oyuncu 2' : String(name).trim();
    if (this.player2) this.player2.SetLook(GameManager.Variants[this.p2Variant], this.p2Name);
  }

  PlayerNear(pos, r) { return this.NearestPlayer(pos, r) != null; }
  NearestPlayer(pos, r) {
    let best = null, bd = r;
    for (const p of this.players) {
      if (!p) continue;
      const d = U.FlatDist(p.transform.position, pos);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  Ob(b) { this.AddObstacle(b.min.x, b.min.z, b.max.x, b.max.z); }

  Plant(p, s) {
    const b = U.Furn('pottedPlant', this.plantParent || this.world, p, Random.Range(0, 360), 2.6 * s, Vec.one, Col.green);
    if (!this.plantParent) this.Ob(b);
  }

  Tree(p, s) {
    const world = this.world;
    U.Box('Govde', world, Vec.add(p, V(0, 0.9 * s, 0)), Vec.mul(V(0.35, 0.9, 0.35), s), C(0.5, 0.35, 0.22), 'Cylinder');
    Seasons.RegisterCrown(U.Box('Tac', world, Vec.add(p, V(0, 2.3 * s, 0)), Vec.mul(Vec.one, 2 * s), C(0.32, 0.62, 0.32), 'Sphere'));
    Seasons.RegisterCrown(U.Box('Tac', world, Vec.add(p, V(0.5, 2.8 * s, 0.2)), Vec.mul(Vec.one, 1.4 * s), C(0.4, 0.7, 0.36), 'Sphere'));
    Seasons.RegisterCrown(U.Box('Tac', world, Vec.add(p, V(-0.45, 2.7 * s, -0.3)), Vec.mul(Vec.one, 1.3 * s), C(0.36, 0.66, 0.34), 'Sphere'));
  }

  Bush(p) {
    const world = this.world;
    U.Box('Cali', world, Vec.add(p, V(0, 0.35, 0)), V(1.4, 0.8, 0.9), C(0.3, 0.6, 0.32), 'Sphere');
    U.Box('Cicek', world, Vec.add(p, V(0.3, 0.7, -0.3)), V(0.18, 0.18, 0.18), C(1, 0.55, 0.7), 'Sphere');
    U.Box('Cicek', world, Vec.add(p, V(-0.35, 0.65, -0.25)), V(0.16, 0.16, 0.16), C(1, 0.95, 0.5), 'Sphere');
  }

  LampPost(p) {
    U.Box('Direk', this.world, Vec.add(p, V(0, 1.4, 0)), V(0.12, 1.4, 0.12), C(0.2, 0.22, 0.25), 'Cylinder');
    U.Prim('Fener', this.world, Vec.add(p, V(0, 2.9, 0)), V(0.4, 0.4, 0.4), U.Glow(C(1, 0.9, 0.6), 2.5), 'Sphere');
  }

  Painting(p, c) {
    const world = this.world, west = p.x < 0, s = V(0.05, 0.6, 1.2);
    U.Box('Cerceve', world, p, Vec.add(s, V(0, 0.12, 0.12)), C(0.85, 0.7, 0.35));
    const canvas = U.Box('Resim', world, Vec.add(p, V(west ? 0.02 : -0.02, 0, 0)), s, c);
    Photos.Apply(canvas, s.z, s.y);
    if (Photos.All.length === 0) this.paintingCanvases.push(canvas);
    if (Photos.All.length === 0) U.Box('ResimGunes', world, Vec.add(p, V(west ? 0.04 : -0.04, 0.1, 0.25)), V(0.02, 0.18, 0.18), C(1, 0.9, 0.5), 'Sphere');
  }

  Car(p, c) {
    const world = this.world;
    U.Box('Kasa', world, Vec.add(p, V(0, 0.55, 0)), V(3.6, 0.6, 1.7), c);
    U.Box('Kabin', world, Vec.add(p, V(-0.2, 1.05, 0)), V(2, 0.5, 1.5), Col.lerp(c, Col.white, 0.2));
    U.Prim('CamOn', world, Vec.add(p, V(0.82, 1.05, 0)), V(0.05, 0.42, 1.4), U.Mat(C(0.55, 0.75, 0.95), 0.9));
    for (const x of [-1.2, 1.2]) for (const z of [-0.8, 0.8])
      setEuler(U.Box('Teker', world, Vec.add(p, V(x, 0.32, z)), V(0.65, 0.12, 0.65), C(0.15, 0.15, 0.17), 'Cylinder'), 90, 0, 0);
    U.Prim('Far', world, Vec.add(p, V(1.81, 0.6, 0.55)), V(0.04, 0.15, 0.3), U.Glow(C(1, 0.95, 0.8), 1.5));
    U.Prim('Far', world, Vec.add(p, V(1.81, 0.6, -0.55)), V(0.04, 0.15, 0.3), U.Glow(C(1, 0.95, 0.8), 1.5));
  }

  // ================= SATIN ALMALAR =================
  CanPay(cost) { return this.money >= cost; }
  Pay(cost) {
    if (this.money < cost) { Sfx.Play('bad', 0.5); this.Notify('Yeterli paran yok'); return false; }
    this.money -= cost;
    return true;
  }

  // Sıradaki açılabilecek oda (sırayla açılır)
  NextLockedRoom() { for (let i = 0; i < this.rooms.length; i++) if (!this.rooms[i].Unlocked) return i; return -1; }

  UnlockRoom(i) {
    if (i >= Eco.WingStart && i < Eco.Floor2Start && !this.wingOpen) return;
    if (i >= Eco.Floor2Start && !this.floor2Open) return;
    if (i !== this.NextLockedRoom() || !this.Pay(Eco.RoomUnlock[i])) return;
    this.rooms[i].ApplyLevel(1, true);
    this.laundry.AddClean(2);
    this.Save();
  }

  UpgradeRoom(i) {
    const r = this.rooms[i];
    if (!r.Unlocked || r.level >= 3) return;
    if (!this.Pay(Eco.UpgradeCost(i, r.level + 1))) return;
    r.ApplyLevel(r.level + 1, true);
    this.Save();
  }

  OpenCafe() { if (this.cafe.Open || !this.Pay(Eco.CafeCost)) return; this.cafe.SetOpen(true, true); this.Save(); }
  OpenPool() { if (this.pool.Open || !this.Pay(Eco.PoolCost)) return; this.pool.SetOpen(true, true); this.Save(); }
  OpenFloor2() { if (this.floor2Open || !this.Pay(Eco.Floor2Cost)) return; this.SetFloor2(true, true); this.Save(); }

  BuyDecor(slot, opt) {
    const d = Decor.Slots[slot];
    if (opt === d.sel) return;
    if (!d.Owns(opt)) {
      if (!this.Pay(d.costs[opt])) return;
      d.owned |= 1 << opt;
      Sfx.Play('unlock');
      this.Notify(d.opts[opt] + ' eklendi! Misafirler memnun.');
      if (this.player) U.Burst(Vec.add(this.player.transform.position, V(0, 2, 0)), C(1, 0.85, 0.3), C(1, 0.6, 0.8), 40, 5);
    }
    d.sel = opt;
    Decor.Apply();
    this.Save();
  }

  OpenWing() { if (this.wingOpen || !this.Pay(Eco.WingCost)) return; this.SetWing(true, true); this.Save(); }

  HireBarista() {
    if (!this.cafe.Open || this.cafe.HasBarista || !this.Pay(Eco.BaristaCost)) return;
    this.cafe.HireBarista(this.RandomName(), true);
    Sfx.Play('unlock');
    this.Save();
  }

  SetManager(variant, name) {
    const n = GameManager.Variants.length;
    this.managerVariant = ((variant % n) + n) % n;
    this.managerName = !name || !String(name).trim() ? 'Müdür' : String(name).trim();
    if (this.player) this.player.SetLook(GameManager.Variants[this.managerVariant], this.managerName);
  }

  SetMusic(on) { this.music = on; Music.Set(on); }

  HireReceptionist() {
    if (this.reception.HasStaff || !this.Pay(Eco.ReceptionistCost)) return;
    this.reception.HireReceptionist(this.RandomName(), true);
    Sfx.Play('unlock');
    this.Save();
  }

  HireCleaner() {
    if (!this.CanHireCleaner || !this.Pay(Eco.CleanerCost[this.cleaners.length])) return;
    const n = this.RandomName();
    this.SpawnCleaner(this.cleaners.length, n);
    this.Notify(n + ' temizlik ekibine katıldı!');
    Sfx.Play('unlock');
    this.Save();
  }

  BuyUpgrade(u) {
    const d = Eco.Def(u), lv = this.ups[u];
    if (lv >= d.max || !this.Pay(Eco.UpCost(u, lv))) return;
    this.ups[u] = lv + 1;
    Sfx.Play('unlock');
    this.Notify(d.name + ' · Seviye ' + (lv + 1));
    this.Save();
  }

  SetHotelName(n) {
    n = !n || !String(n).trim() ? 'Otel' : String(n).trim();
    if (n.length > 22) n = n.substring(0, 22);
    this.hotelName = n;
    if (this.signText) {
      this.signText.text = Eco.Upper(n);
      this.signText.characterSize = Math.min(0.12, 0.12 * 10 / Math.max(1, n.length));
    }
  }

  SetSound(on) { this.sound = on; Sfx.SetVolume(on ? 1 : 0); }

  RandomName() {
    const used = new Set([this.reception.staffName, this.cafe.baristaName]);
    for (const c of this.cleaners) used.add(c.staffName);
    for (let k = 0; k < 30; k++) { const n = Eco.Names[Random.RangeInt(0, Eco.Names.length)]; if (!used.has(n)) return n; }
    return Eco.Names[Random.RangeInt(0, Eco.Names.length)];
  }

  SpawnCleaner(idx, name) {
    const c = new Cleaner();
    c.Init(V(13.6, 0, 0.6 + idx * 1.1), idx, name);
    this.cleaners.push(c);
  }
}
