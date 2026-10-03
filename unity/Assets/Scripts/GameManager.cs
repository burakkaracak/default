using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

// Oyunu baslatir, oteli kurar, parayi, satin almalari, kaydi ve ekrani yonetir
public class GameManager : MonoBehaviour
{
    public static GameManager I;
    public int money = Eco.StartMoney;
    public int served;
    float shownMoney;

    public Player player, player2;
    public readonly List<Player> players = new List<Player>();
    public bool coop;
    public string p2Name = "Oyuncu 2";
    public int p2Variant = 1;
    public bool restRoom, catAdopted;
    Cat cat;
    public Laundry laundry;
    public float priceBuff = 1f, priceBuffT;
    public float PriceBuff => priceBuffT > 0f ? priceBuff : 1f;
    readonly List<Customer.Config> pendingSpawns = new List<Customer.Config>();
    public Reception reception;
    public MoneyPile deskPile;
    public Menu menu;
    public readonly List<Room> rooms = new List<Room>();
    public readonly List<Customer> customers = new List<Customer>();
    public readonly List<Cleaner> cleaners = new List<Cleaner>();
    readonly List<Rect> obstacles = new List<Rect>();
    readonly int[] ups = new int[System.Enum.GetValues(typeof(Eco.Up)).Length];

    public string hotelName = "Otel Ustası";
    public bool sound = true, music = true;
    public string managerName = "Müdür";
    public int managerVariant = 9; // character-male-d
    public Cafe cafe;
    public Pool pool;
    public DayNight dayNight;
    public bool wingOpen, floor2Open;
    public Elevator elevator;
    Material lowGrass;
    GameObject floor2Root;
    Transform plantParent;
    readonly List<Renderer> paintingCanvases = new List<Renderer>();
    GameObject[] specialDecor = new GameObject[3];
    public float DecorBonus => Decor.Bonus;
    GameObject wingRoot, wingLocked, eastDoorFill;
    readonly List<float> ratings = new List<float> { 3f, 3f, 3f };
    public float Stars { get; private set; } = 3f;
    int starTier = -1;
    readonly GameObject[] starDecor = new GameObject[6];
    string celebTitle, celebSub;
    float celebT;
    public static readonly string[] Variants =
    {
        "character-female-a", "character-female-b", "character-female-c", "character-female-d", "character-female-e", "character-female-f",
        "character-male-a", "character-male-b", "character-male-c", "character-male-d", "character-male-e", "character-male-f"
    };
    public bool MenuOpen => menu != null && menu.open;

    Transform world;
    TextMesh signText;
    float spawnTimer = 1.5f, saveTimer = 3f;
    static string K => Chain.K; // her otelin kendi kaydi (ilk otel "o4_")
    readonly GameObject[] dividers = new GameObject[20];
    float storyT = 1f;

    // ekran
    GUIStyle panelStyle, panelSmall, bigStyle, smallStyle, bannerStyle, btnStyle, titleStyle;
    string banner;
    float bannerT;
    float hintT = 12f;
    Rect menuBtn, questBtn;

    public static readonly float[] RoomX = { -12.5f, -7.5f, -2.5f, 2.5f, 7.5f, 12.5f, 17.5f, 22.5f, 27.5f, 32.5f };

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
        SceneManager.sceneLoaded += (s, m) => Ensure();
        Ensure();
    }

    static void Ensure()
    {
        if (FindAnyObjectByType<GameManager>() == null)
            new GameObject("GameManager").AddComponent<GameManager>();
    }

    void Awake()
    {
        I = this;
        Application.targetFrameRate = 60;
        Sfx.Init(gameObject);
        menu = gameObject.AddComponent<Menu>();
        gameObject.AddComponent<PopupHost>();
        Popups.Clear();
        Time.timeScale = 1f;
        Chain.Init();
        Story.Load();
        Build();
        Load();
        Music.Init(gameObject, music);
        shownMoney = money;
    }

    public int UpLevel(Eco.Up u) => ups[(int)u];

    // ================= KURULUM =================
    void Build()
    {
        world = new GameObject("Otel").transform;
        dayNight = gameObject.AddComponent<DayNight>();
        Seasons.Reset();
        Events.Reset();
        int city = Chain.cur;
        Color wallC = city == 1 ? new Color(0.98f, 0.98f, 0.97f) : city == 2 ? new Color(0.93f, 0.83f, 0.68f) : new Color(0.97f, 0.94f, 0.88f);
        Color trim = city == 1 ? new Color(0.2f, 0.45f, 0.75f) : city == 2 ? new Color(0.72f, 0.42f, 0.26f) : new Color(0.62f, 0.47f, 0.34f);
        Color wood = new Color(0.58f, 0.42f, 0.3f);

        SetupLook();
        BuildOutside();

        // Lobi zemini
        U.Prim("LobiZemin", world, new Vector3(0, -0.05f, -4f), new Vector3(30.5f, 0.1f, 16.5f),
            U.Mat(new Color(0.96f, 0.91f, 0.82f), U.TileTex, new Vector2(30.5f / 3f, 16.5f / 3f), 0.45f, 0f));
        var lobbyCarpet = U.Prim("Hali", world, new Vector3(4f, 0.01f, -6.2f), new Vector3(7f, 0.02f, 4.6f),
            U.Mat(new Color(0.78f, 0.33f, 0.3f), U.CarpetTex, new Vector2(3, 2), 0.05f, 0f));
        var lobbyEdge = U.Flat("HaliKenar", world, new Vector3(4f, 0.005f, -6.2f), new Vector3(7.4f, 0.02f, 5f), new Color(0.95f, 0.8f, 0.45f));
        U.Prim("Paspas", world, new Vector3(0, 0.01f, -10.9f), new Vector3(3.2f, 0.02f, 1.8f),
            U.Mat(new Color(0.4f, 0.32f, 0.28f), U.CarpetTex, Vector2.one, 0.05f, 0f));

        // Lobi duvarlari
        Material wallM = U.Mat(wallC, U.StripeTex, new Vector2(8, 1), 0.2f, 0f);
        Wall("DuvarBati", new Vector3(-15.25f, 0.6f, -6.225f), new Vector3(0.4f, 1.2f, 12.45f), wallM, trim);
        Wall("DuvarBati", new Vector3(-15.25f, 0.6f, 6.4f), new Vector3(0.4f, 1.2f, 8.8f), wallM, trim);
        var westFill = WallGroup("BatiKapiKapali", new Vector3(-15.25f, 0.6f, 1.0f), new Vector3(0.4f, 1.2f, 2.0f), wallM, trim);
        Wall("DuvarDogu", new Vector3(15.25f, 0.6f, -6.525f), new Vector3(0.4f, 1.2f, 11.85f), wallM, trim);
        Wall("DuvarDogu", new Vector3(15.25f, 0.6f, 7.35f), new Vector3(0.4f, 1.2f, 6.9f), wallM, trim);
        eastDoorFill = WallGroup("DoguKapiKapali", new Vector3(15.25f, 0.6f, 1.65f), new Vector3(0.4f, 1.2f, 4.5f), wallM, trim);
        Wall("DuvarGuneySol", new Vector3(-8.7f, 0.45f, -12.25f), new Vector3(13.1f, 0.9f, 0.4f), wallM, trim);
        Wall("DuvarGuneySag", new Vector3(8.7f, 0.45f, -12.25f), new Vector3(13.1f, 0.9f, 0.4f), wallM, trim);
        Wall("DuvarArka", new Vector3(0, 1.3f, 10.65f), new Vector3(30.9f, 2.6f, 0.3f), wallM, trim);
        Events.Shelter(world, new Vector3(0f, 6f, -0.85f), new Vector3(30.9f, 14f, 23.2f)); // lobi ve odalar catili

        // Giris kapisi ve otel tabelasi
        U.Box("KapiSol", world, new Vector3(-2.2f, 1.4f, -12.25f), new Vector3(0.45f, 2.8f, 0.45f), trim);
        U.Box("KapiSag", world, new Vector3(2.2f, 1.4f, -12.25f), new Vector3(0.45f, 2.8f, 0.45f), trim);
        U.Box("Tente", world, new Vector3(0, 2.95f, -12.6f), new Vector3(5.2f, 0.25f, 1.4f), new Color(0.8f, 0.25f, 0.3f));
        U.Box("Tabela", world, new Vector3(0, 3.55f, -12.3f), new Vector3(6.4f, 0.9f, 0.2f), new Color(0.16f, 0.22f, 0.38f));
        signText = U.Text(world, new Vector3(0, 3.6f, -12.5f), "OTEL", 0.12f, new Color(1f, 0.86f, 0.42f), true);
        U.Box("TabelaIsik", world, new Vector3(0, 3.05f, -12.35f), new Vector3(6f, 0.05f, 0.05f), new Color(1f, 0.9f, 0.6f)).GetComponent<Renderer>().sharedMaterial = U.Glow(new Color(1f, 0.85f, 0.5f), 2f);

        // Oda duvarlari
        for (int i = 0; i < 5; i++)
            dividers[i] = Divider(new Vector3(RoomX[i] + 2.5f, 0.9f, 7.25f), wallM, trim, world);
        for (int i = 0; i < 6; i++)
        {
            float x = RoomX[i];
            Wall("OnDuvar", new Vector3(x - 1.65f, 0.35f, 4f), new Vector3(1.7f, 0.7f, 0.2f), wallM, trim);
            Wall("OnDuvar", new Vector3(x + 1.65f, 0.35f, 4f), new Vector3(1.7f, 0.7f, 0.2f), wallM, trim);
            U.Box("KapiPervaz", world, new Vector3(x - 0.85f, 0.45f, 4f), new Vector3(0.12f, 0.9f, 0.3f), trim);
            U.Box("KapiPervaz", world, new Vector3(x + 0.85f, 0.45f, 4f), new Vector3(0.12f, 0.9f, 0.3f), trim);
        }

        // Resepsiyon masasi ve tabelasi
        U.Prim("Masa", world, new Vector3(-6f, 0.55f, -5f), new Vector3(4f, 1.1f, 1f), U.Mat(wood, U.WoodTex, new Vector2(2, 1), 0.3f, 0f));
        U.Box("MasaSerit", world, new Vector3(-6f, 0.75f, -5.51f), new Vector3(4.02f, 0.12f, 0.02f), new Color(0.95f, 0.78f, 0.35f));
        U.Prim("MasaUst", world, new Vector3(-6f, 1.13f, -5f), new Vector3(4.2f, 0.08f, 1.2f), U.Mat(new Color(0.92f, 0.9f, 0.88f), null, Vector2.one, 0.8f, 0f));
        U.Box("Zil", world, new Vector3(-4.6f, 1.22f, -5.2f), new Vector3(0.22f, 0.14f, 0.22f), new Color(0.95f, 0.78f, 0.3f), PrimitiveType.Sphere);
        // ekran resepsiyoniste (arkaya, +z) baksin: arkasi musteriye donuk
        U.Furn("computerScreen", world, new Vector3(-6.8f, 1.17f, -5.05f), 0f, 2.1f, new Vector3(0.8f, 0.6f, 0.2f), new Color(0.15f, 0.15f, 0.18f));
        U.Furn("computerKeyboard", world, new Vector3(-6.8f, 1.17f, -4.6f), 0f, 2.1f, new Vector3(0.6f, 0.04f, 0.2f), new Color(0.2f, 0.2f, 0.22f));
        var deskDecor = new GameObject("MasaSusu");
        deskDecor.transform.SetParent(world, false);
        U.Box("Vazo", deskDecor.transform, new Vector3(-7.6f, 1.3f, -5.1f), new Vector3(0.2f, 0.25f, 0.2f), new Color(0.3f, 0.5f, 0.8f), PrimitiveType.Cylinder);
        U.Box("Cicek", deskDecor.transform, new Vector3(-7.6f, 1.6f, -5.1f), Vector3.one * 0.3f, new Color(0.95f, 0.45f, 0.6f), PrimitiveType.Sphere);
        AddObstacle(-8.1f, -5.6f, -3.9f, -4.4f);

        U.Box("TabelaDirek", world, new Vector3(-7.7f, 1.2f, -2.4f), new Vector3(0.12f, 2.4f, 0.12f), trim);
        U.Box("TabelaDirek", world, new Vector3(-4.3f, 1.2f, -2.4f), new Vector3(0.12f, 2.4f, 0.12f), trim);
        U.Box("ResTabela", world, new Vector3(-6f, 2.25f, -2.4f), new Vector3(3.6f, 0.65f, 0.12f), new Color(0.16f, 0.22f, 0.38f));
        U.Text(world, new Vector3(-6f, 2.3f, -2.55f), "RESEPSİYON", 0.075f, new Color(1f, 0.86f, 0.42f));
        AddObstacle(-7.85f, -2.55f, -7.55f, -2.25f);
        AddObstacle(-4.45f, -2.55f, -4.15f, -2.25f);

        // Kafe (dogu) ve havuz (bati)
        cafe = new GameObject("Kafe").AddComponent<Cafe>();
        cafe.Build(world, wood);
        pool = new GameObject("Havuz").AddComponent<Pool>();
        pool.Build(world, westFill);

        // Bekleme salonu (bati): iki sira koltuk karsilikli
        BuildLounge(wood);

        laundry = new GameObject("Camasirhane").AddComponent<Laundry>();
        laundry.Build(world);
        Ob(U.Furn("coatRackStanding", world, new Vector3(-9f, 0, -11.5f), 0f, 2.2f, new Vector3(0.4f, 1.7f, 0.4f), wood));

        // Icecek makinesi
        U.Box("Makine", world, new Vector3(14.5f, 1f, -2.5f), new Vector3(0.9f, 2f, 1.2f), new Color(0.85f, 0.2f, 0.25f));
        U.Prim("MakineCam", world, new Vector3(14.04f, 1.2f, -2.5f), new Vector3(0.04f, 1.2f, 0.8f), U.Glow(new Color(0.7f, 0.9f, 1f), 0.8f));
        AddObstacle(14f, -3.15f, 15f, -1.85f);

        Painting(new Vector3(-15.03f, 0.85f, -9.2f), new Color(0.35f, 0.6f, 0.85f));
        Painting(new Vector3(15.03f, 0.85f, -3.9f), new Color(0.95f, 0.6f, 0.35f));

        Plant(new Vector3(14.4f, 0, -11.4f), 1.1f);
        Plant(new Vector3(-14.4f, 0, 3.2f), 1f);
        Plant(new Vector3(14.4f, 0, -4.4f), 0.9f);
        var entrancePlants = new GameObject("GirisBitkileri");
        entrancePlants.transform.SetParent(world, false);
        plantParent = entrancePlants.transform;
        Plant(new Vector3(-3.2f, 0, -11.4f), 0.8f);
        Plant(new Vector3(3.2f, 0, -11.4f), 0.8f);
        plantParent = null;
        AddObstacle(-3.6f, -11.8f, -2.8f, -11f);
        AddObstacle(2.8f, -11.8f, 3.6f, -11f);
        Plant(new Vector3(-14.4f, 0, -5.4f), 0.9f);

        // Resepsiyon, kasa, odalar
        reception.Init(world);
        deskPile = MoneyPile.Create(world, new Vector3(-3f, 0, -4.2f));

        BuildWing(wallM, trim);
        BuildFloor2(wallM, trim);
        for (int i = 0; i < Eco.RoomUnlock.Length; i++)
        {
            var r = new GameObject("Oda" + i).AddComponent<Room>();
            if (i < Eco.Floor2Start) r.Init(i < Eco.WingStart ? world : wingRoot.transform, i, RoomX[i]);
            else r.Init(floor2Root.transform, i, RoomX[i - Eco.Floor2Start], Elevator.Floor2Z);
            rooms.Add(r);
        }
        elevator = new GameObject("Asansor").AddComponent<Elevator>();
        elevator.Build(world, floor2Root.transform);
        Decor.Build(world, lobbyCarpet.GetComponent<Renderer>(), lobbyEdge.GetComponent<Renderer>(), entrancePlants, deskDecor, paintingCanvases);
        BuildSpecialDecor();
        BuildStarDecor();
        BuildLamps();

        // Oyuncu
        player = new GameObject("Oyuncu").AddComponent<Player>();
        player.transform.position = new Vector3(-3f, 0, -3.4f);
        players.Clear();
        players.Add(player);

        // Kamera
        var cam = Camera.main;
        if (cam == null)
        {
            cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.gameObject.AddComponent<AudioListener>();
        }
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.62f, 0.8f, 0.95f);
        cam.fieldOfView = 42f;
        cam.farClipPlane = 200f;
        var data = cam.GetUniversalAdditionalCameraData();
        if (data != null)
        {
            data.renderPostProcessing = true;
            data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
        }
        Light sunL = null;
        foreach (var l in FindObjectsByType<Light>())
            if (l.type == LightType.Directional) { sunL = l; break; }
        dayNight.Init(sunL, cam);
        var follow = cam.gameObject.GetComponent<CameraFollow>();
        if (follow == null) follow = cam.gameObject.AddComponent<CameraFollow>();
        follow.target = player.transform;
    }

    void BuildLounge(Color wood)
    {
        reception = new GameObject("Resepsiyon").AddComponent<Reception>();
        U.Prim("SalonHali", world, new Vector3(-11.9f, 0.012f, -9.15f), new Vector3(5.6f, 0.02f, 2.4f),
            U.Mat(new Color(0.45f, 0.6f, 0.5f), U.CarpetTex, new Vector2(3, 1.3f), 0.05f, 0f));
        U.Flat("SalonHaliKenar", world, new Vector3(-11.9f, 0.006f, -9.15f), new Vector3(5.9f, 0.02f, 2.7f), new Color(0.95f, 0.85f, 0.55f));
        U.Text(world, new Vector3(-11.9f, 0.6f, -9.15f), "BEKLEME SALONU", 0.05f, new Color(1, 1, 1, 0.7f));
        float[] xs = { -13.6f, -11.9f, -10.2f };
        foreach (var row in new[] { (z: -10.9f, yaw: 0f, fwd: Vector3.forward), (z: -7.4f, yaw: 180f, fwd: Vector3.back) })
        {
            foreach (float x in xs)
            {
                Ob(U.Furn("loungeChair", world, new Vector3(x, 0, row.z), row.yaw, 2.2f, new Vector3(1.1f, 1f, 1f), new Color(0.55f, 0.75f, 0.6f)));
                reception.seats.Add(new Reception.Seat { pos = new Vector3(x, 0, row.z), fwd = row.fwd });
            }
            foreach (float x in new[] { -12.75f, -11.05f })
            {
                var st = U.Furn("sideTable", world, new Vector3(x, 0, row.z - row.fwd.z * 0.15f), row.yaw, 1.1f, new Vector3(0.5f, 0.6f, 0.4f), wood);
                Ob(st);
                U.Furn("plantSmall3", world, new Vector3(x, st.max.y, row.z - row.fwd.z * 0.15f), 0f, 3f, new Vector3(0.2f, 0.3f, 0.2f), new Color(0.3f, 0.65f, 0.35f));
            }
        }
    }

    void SetupLook()
    {
        // Gunes
        Light sun = null;
        foreach (var l in FindObjectsByType<Light>())
            if (l.type == LightType.Directional) { sun = l; break; }
        if (sun == null) sun = new GameObject("Gunes").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.transform.rotation = Quaternion.Euler(52f, -38f, 0f);
        sun.color = new Color(1f, 0.95f, 0.86f);
        sun.intensity = 1.35f;
        sun.shadows = LightShadows.Soft;
        sun.shadowStrength = 0.55f;

        // Ortam isigi ve sis
        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(0.78f, 0.84f, 0.95f);
        RenderSettings.ambientEquatorColor = new Color(0.75f, 0.72f, 0.68f);
        RenderSettings.ambientGroundColor = new Color(0.48f, 0.45f, 0.42f);
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogColor = new Color(0.62f, 0.8f, 0.95f);
        RenderSettings.fogStartDistance = 40f;
        RenderSettings.fogEndDistance = 85f;

        // Renk duzeltme (post process)
        var vol = FindAnyObjectByType<Volume>();
        if (vol == null)
        {
            vol = new GameObject("Global Volume").AddComponent<Volume>();
            vol.isGlobal = true;
        }
        if (vol.profile == null) vol.profile = ScriptableObject.CreateInstance<VolumeProfile>();
        var p = vol.profile;
        if (!p.TryGet(out Bloom bloom)) bloom = p.Add<Bloom>(true);
        bloom.active = true;
        bloom.intensity.Override(0.7f);
        bloom.threshold.Override(1.05f);
        bloom.scatter.Override(0.6f);
        if (!p.TryGet(out Tonemapping tone)) tone = p.Add<Tonemapping>(true);
        tone.active = true;
        tone.mode.Override(TonemappingMode.Neutral);
        if (!p.TryGet(out ColorAdjustments ca)) ca = p.Add<ColorAdjustments>(true);
        ca.active = true;
        ca.saturation.Override(18f);
        ca.contrast.Override(8f);
        ca.postExposure.Override(0.15f);
        if (!p.TryGet(out Vignette vig)) vig = p.Add<Vignette>(true);
        vig.active = true;
        vig.intensity.Override(0.22f);
        vig.smoothness.Override(0.5f);
    }

    void BuildOutside()
    {
        int city = Chain.cur;
        Color gc = city == 1 ? new Color(0.93f, 0.86f, 0.68f) : city == 2 ? new Color(0.82f, 0.7f, 0.5f) : new Color(0.55f, 0.78f, 0.45f);
        var grassM = new Material(U.Mat(gc, U.GrassTex, new Vector2(24, 14), 0.1f, 0f));
        U.Prim("Cim", world, new Vector3(0, -0.16f, -8), new Vector3(110, 0.1f, 64), grassM);
        lowGrass = grassM;
        Seasons.RegisterGrass(grassM);
        var walkM = new Material(U.Mat(new Color(0.86f, 0.84f, 0.8f), U.TileTex, new Vector2(30, 1.4f), 0.2f, 0f));
        U.Prim("Kaldirim", world, new Vector3(0, -0.08f, -14f), new Vector3(70f, 0.1f, 3.2f), walkM);
        U.Box("KaldirimTasi", world, new Vector3(0, -0.04f, -15.65f), new Vector3(70f, 0.12f, 0.2f), new Color(0.7f, 0.7f, 0.7f));
        var roadM = new Material(U.Mat(new Color(0.3f, 0.31f, 0.34f)));
        U.Prim("Asfalt", world, new Vector3(0, -0.1f, -19.5f), new Vector3(70f, 0.05f, 7.5f), roadM);
        // Yagmurda dis zeminler koyulasir ve parlar, birikintiler olusur
        Events.RegisterWet(grassM, 0.8f, 0.45f);
        Events.RegisterWet(walkM, 0.72f, 0.82f);
        Events.RegisterWet(roadM, 0.7f, 0.9f);
        var puddleM = U.Mat(new Color(0.36f, 0.43f, 0.52f), null, Vector2.one, 0.97f, 0f);
        var pr = new GameObject("Birikintiler").transform;
        pr.SetParent(world, false);
        foreach (var pp in new[] { new Vector3(-11.5f, -0.02f, -14.3f), new Vector3(-5.6f, -0.02f, -13.7f), new Vector3(6.8f, -0.02f, -14.4f), new Vector3(12.6f, -0.02f, -13.8f),
                                   new Vector3(19f, -0.02f, -14.2f), new Vector3(-19.5f, -0.02f, -13.9f), new Vector3(-14f, -0.07f, -18.2f), new Vector3(-2.5f, -0.07f, -21.4f),
                                   new Vector3(6.2f, -0.07f, -17.4f), new Vector3(21f, -0.07f, -20.8f), new Vector3(-24f, -0.07f, -20.2f) })
        {
            var pd = U.Prim("Birikinti", pr, pp, new Vector3(Random.Range(1.6f, 2.6f), 0.01f, Random.Range(0.8f, 1.3f)), puddleM, PrimitiveType.Cylinder);
            pd.transform.localRotation = Quaternion.Euler(0f, Random.Range(-20f, 20f), 0f);
            U.NoShadow(pd);
            Events.RegisterPuddle(pd.transform);
        }
        for (int i = -16; i <= 16; i++)
            U.Flat("Serit", world, new Vector3(i * 2.2f, -0.07f, -19.5f), new Vector3(1.1f, 0.02f, 0.15f), new Color(0.95f, 0.95f, 0.9f));
        U.Flat("GirisYolu", world, new Vector3(0, -0.07f, -12.9f), new Vector3(4.2f, 0.06f, 1.3f), new Color(0.86f, 0.84f, 0.8f));

        foreach (float x in new[] { -24f, -16f, -8f, 8f, 16f, 24f }) Green(new Vector3(x, 0, -16.6f), 1f + Mathf.Abs(x) * 0.008f);
        foreach (float z in new[] { -8f, 0f, 8f }) { Green(new Vector3(-31f, 0, z), 1.2f); Green(new Vector3(38f, 0, z), 1.15f); }
        Green(new Vector3(-20f, 0, 9f), 1.1f);
        Green(new Vector3(-26f, 0, 9.5f), 1.25f);
        for (float x = 4f; x <= 14f; x += 2.5f)
        {
            Bush(new Vector3(x, 0, -12.95f));
            Bush(new Vector3(-x, 0, -12.95f));
        }
        LampPost(new Vector3(-4.2f, 0, -15.2f));
        LampPost(new Vector3(4.2f, 0, -15.2f));
        Car(new Vector3(-11f, 0, -18f), new Color(0.3f, 0.55f, 0.85f));
        Car(new Vector3(12f, 0, -18f), new Color(0.95f, 0.75f, 0.3f));
        if (city == 1) BuildBodrum();
        if (city == 2) BuildKapadokya();
    }

    // Sehre gore agac: Bodrum'da palmiye
    void Green(Vector3 p, float s)
    {
        if (Chain.cur == 1) Palm(p, s);
        else Tree(p, Chain.cur == 2 ? s * 0.85f : s);
    }

    void Palm(Vector3 p, float s)
    {
        Color bark = new Color(0.6f, 0.45f, 0.3f), leaf = new Color(0.3f, 0.62f, 0.3f);
        Vector3 top = p;
        for (int k = 0; k < 5; k++)
        {
            Vector3 c = p + new Vector3(0.12f * k * s, (0.45f + k * 0.8f) * s, 0f);
            U.Box("PalmGovde", world, c, new Vector3(0.32f - k * 0.03f, 0.42f, 0.32f - k * 0.03f) * s, bark, PrimitiveType.Cylinder);
            top = c;
        }
        top += Vector3.up * 0.45f * s;
        for (int k = 0; k < 7; k++)
        {
            float a = k * 360f / 7f;
            var l = U.Box("PalmYaprak", world, top + Quaternion.Euler(0, a, 0) * new Vector3(0.75f * s, -0.15f * s, 0f), new Vector3(1.7f, 0.06f, 0.42f) * s, leaf);
            l.transform.localRotation = Quaternion.Euler(0, a, -18f);
        }
        for (int k = 0; k < 3; k++)
            U.Box("Hindistan", world, top + new Vector3(Mathf.Cos(k * 2.1f) * 0.2f, -0.25f, Mathf.Sin(k * 2.1f) * 0.2f) * s, Vector3.one * 0.2f * s, new Color(0.45f, 0.32f, 0.18f), PrimitiveType.Sphere);
    }

    // ---------------- Bodrum: deniz, kumsal, tekneler, begonviller ----------------
    void BuildBodrum()
    {
        U.Prim("Deniz", world, new Vector3(0f, -0.09f, 48f), new Vector3(150f, 0.02f, 62f), U.Mat(new Color(0.12f, 0.52f, 0.82f), null, Vector2.one, 0.95f, 0f));
        U.Flat("Kopuk", world, new Vector3(0f, -0.07f, 17.1f), new Vector3(150f, 0.02f, 0.35f), Color.white);
        U.Flat("SigSu", world, new Vector3(0f, -0.075f, 18.3f), new Vector3(150f, 0.02f, 2.2f), new Color(0.35f, 0.75f, 0.85f));
        Color[] uc = { new Color(0.95f, 0.35f, 0.35f), new Color(0.25f, 0.5f, 0.9f), new Color(1f, 0.8f, 0.25f), new Color(0.3f, 0.7f, 0.5f) };
        float[] bx = { -12f, -6f, 0f, 6f, 12f };
        for (int i = 0; i < bx.Length; i++)
        {
            U.Box("SemsiyeDirek", world, new Vector3(bx[i], 1.2f, 13.6f), new Vector3(0.07f, 1.2f, 0.07f), Color.white, PrimitiveType.Cylinder);
            U.Box("Semsiye", world, new Vector3(bx[i], 2.35f, 13.6f), new Vector3(2.4f, 0.14f, 2.4f), uc[i % uc.Length], PrimitiveType.Cylinder);
            U.Box("SemsiyeTepe", world, new Vector3(bx[i], 2.45f, 13.6f), new Vector3(0.9f, 0.12f, 0.9f), Color.white, PrimitiveType.Cylinder);
            U.Box("Sezlong", world, new Vector3(bx[i] - 0.8f, 0.2f, 14.2f), new Vector3(0.7f, 0.12f, 1.8f), Color.white);
            U.Box("Havlu", world, new Vector3(bx[i] - 0.8f, 0.27f, 14.2f), new Vector3(0.6f, 0.02f, 1.5f), uc[(i + 1) % uc.Length]);
        }
        foreach (var bp in new[] { new Vector3(-20f, 0f, 21.5f), new Vector3(4f, 0f, 23f), new Vector3(22f, 0f, 21f), new Vector3(-7f, 0f, 27f) })
        {
            var boat = new GameObject("Tekne").transform;
            boat.SetParent(world, false);
            boat.position = bp;
            U.Box("Govde", boat, new Vector3(0f, 0.15f, 0f), new Vector3(3.6f, 0.55f, 1.2f), Color.white);
            U.Box("GovdeSerit", boat, new Vector3(0f, 0.3f, 0f), new Vector3(3.62f, 0.1f, 1.22f), new Color(0.2f, 0.45f, 0.75f));
            U.Box("Kabin", boat, new Vector3(-0.4f, 0.6f, 0f), new Vector3(1.3f, 0.45f, 0.9f), new Color(0.85f, 0.7f, 0.5f));
            U.Box("Direk", boat, new Vector3(0.6f, 1.9f, 0f), new Vector3(0.07f, 1.6f, 0.07f), new Color(0.5f, 0.38f, 0.25f), PrimitiveType.Cylinder);
            var sail = U.Box("Yelken", boat, new Vector3(1.05f, 1.9f, 0f), new Vector3(1.3f, 1.3f, 0.03f), new Color(0.98f, 0.96f, 0.9f));
            sail.transform.localRotation = Quaternion.Euler(0, 0, 45f);
            boat.gameObject.AddComponent<Bob>().Set(0.08f, 1.1f, Vector3.zero, 0f);
        }
        // Beyaz duvarlarda begonviller
        foreach (float x in new[] { -13.5f, -10f, -6.5f, 6.5f, 10f, 13.5f })
            for (int k = 0; k < 3; k++)
                U.Box("Begonvil", world, new Vector3(x + (k - 1) * 0.45f, 0.95f + (k % 2) * 0.2f, -12.45f), new Vector3(0.6f, 0.45f, 0.35f), k % 2 == 0 ? new Color(0.95f, 0.3f, 0.6f) : new Color(0.85f, 0.2f, 0.5f), PrimitiveType.Sphere);
    }

    // ---------------- Kapadokya: peri bacalari ve sicak hava balonlari ----------------
    void BuildKapadokya()
    {
        foreach (var fp in new[] { new Vector4(-24f, 0f, 14f, 0.9f), new Vector4(-14f, 0f, 14.5f, 1f), new Vector4(-4f, 0f, 14f, 0.85f), new Vector4(7f, 0f, 14.5f, 1.05f),
                                   new Vector4(18f, 0f, 14f, 0.9f), new Vector4(29f, 0f, 14.5f, 1f), new Vector4(-19f, 0f, 19f, 1.25f), new Vector4(-9f, 0f, 19.5f, 1.2f),
                                   new Vector4(2f, 0f, 19f, 1.3f), new Vector4(12f, 0f, 19.5f, 1.2f), new Vector4(23f, 0f, 19f, 1.25f),
                                   new Vector4(-36f, 0f, -4f, 1.1f), new Vector4(-35f, 0f, 6f, 1f), new Vector4(43f, 0f, -6f, 1.1f), new Vector4(42f, 0f, 5f, 1f) })
            FairyChimney(new Vector3(fp.x, 0f, fp.z), fp.w);
        Color[,] bc =
        {
            { new Color(0.95f, 0.3f, 0.3f), new Color(1f, 0.85f, 0.3f) },
            { new Color(0.3f, 0.55f, 0.95f), new Color(1f, 1f, 1f) },
            { new Color(0.95f, 0.6f, 0.2f), new Color(0.6f, 0.3f, 0.75f) },
            { new Color(0.35f, 0.75f, 0.45f), new Color(1f, 0.9f, 0.4f) },
            { new Color(0.9f, 0.35f, 0.6f), new Color(0.3f, 0.75f, 0.9f) },
        };
        // Otelin uzerinden suzulen balonlar
        Vector3[] bp = { new Vector3(-22f, 7.5f, 2f), new Vector3(3f, 8.5f, -5f), new Vector3(26f, 7f, 7f), new Vector3(-38f, 8f, -2f), new Vector3(40f, 8f, 4f) };
        for (int i = 0; i < bp.Length; i++)
            HotAirBalloon(bp[i], bc[i, 0], bc[i, 1], i);
    }

    void FairyChimney(Vector3 p, float s)
    {
        Color rock = new Color(0.92f, 0.82f, 0.66f), cap = new Color(0.55f, 0.42f, 0.32f);
        U.Box("PeriBacasi", world, p + new Vector3(0f, 1.3f * s, 0f), new Vector3(3.2f, 1.3f, 3.2f) * s, rock, PrimitiveType.Cylinder);
        U.Box("PeriBacasi", world, p + new Vector3(0f, 3.5f * s, 0f), new Vector3(2.2f, 1f, 2.2f) * s, rock, PrimitiveType.Cylinder);
        U.Box("PeriBacasi", world, p + new Vector3(0f, 5.2f * s, 0f), new Vector3(1.3f, 0.8f, 1.3f) * s, rock, PrimitiveType.Cylinder);
        U.Box("Sapka", world, p + new Vector3(0f, 6.2f * s, 0f), new Vector3(1.9f, 0.9f, 1.9f) * s, cap, PrimitiveType.Sphere);
        U.Box("Pencere", world, p + new Vector3(0f, 1.6f * s, -1.58f * s), new Vector3(0.45f, 0.6f, 0.05f) * s, new Color(0.3f, 0.22f, 0.18f));
        U.Box("Pencere", world, p + new Vector3(0.5f * s, 3.6f * s, -1.08f * s), new Vector3(0.3f, 0.4f, 0.05f) * s, new Color(0.3f, 0.22f, 0.18f));
    }

    void HotAirBalloon(Vector3 p, Color a, Color b, int seed)
    {
        var root = new GameObject("SicakHavaBalonu").transform;
        root.SetParent(world, false);
        root.position = p;
        root.localScale = Vector3.one * 0.6f;
        U.Box("Zarf", root, Vector3.zero, new Vector3(2.6f, 3f, 2.6f), a, PrimitiveType.Sphere);
        U.Box("Serit", root, new Vector3(0f, -0.2f, 0f), new Vector3(2.66f, 0.7f, 2.66f), b, PrimitiveType.Sphere);
        U.Box("Agiz", root, new Vector3(0f, -1.55f, 0f), new Vector3(0.8f, 0.2f, 0.8f), b, PrimitiveType.Cylinder);
        foreach (var o in new[] { new Vector3(0.3f, 0f, 0.3f), new Vector3(-0.3f, 0f, 0.3f), new Vector3(0.3f, 0f, -0.3f), new Vector3(-0.3f, 0f, -0.3f) })
            U.Box("Ip", root, new Vector3(o.x, -2.05f, o.z), new Vector3(0.02f, 0.9f, 0.02f), new Color(0.3f, 0.25f, 0.2f));
        U.Box("Sepet", root, new Vector3(0f, -2.6f, 0f), new Vector3(0.75f, 0.5f, 0.75f), new Color(0.6f, 0.42f, 0.25f));
        root.gameObject.AddComponent<Bob>().Set(0.35f, 0.4f + seed * 0.07f, new Vector3(0.45f + seed * 0.05f, 0f, 0f), 42f);
    }

    void Wall(string name, Vector3 pos, Vector3 scale, Material m, Color trim, Transform parent = null)
    {
        var p = parent ? parent : world;
        U.Prim(name, p, pos, scale, m);
        U.Box(name + "Pervaz", p, new Vector3(pos.x, 0.08f, pos.z), new Vector3(scale.x + 0.04f, 0.16f, scale.z + 0.04f), trim);
        U.Box(name + "Ust", p, new Vector3(pos.x, pos.y + scale.y / 2f, pos.z), new Vector3(scale.x + 0.06f, 0.06f, scale.z + 0.06f), Color.white);
    }

    // Iki oda arasindaki duvar (Baskanlik Suiti kurulunca kaldirilir)
    GameObject Divider(Vector3 pos, Material m, Color trim, Transform parent)
    {
        var g = new GameObject("AraDuvarGrup");
        g.transform.SetParent(parent, false);
        Wall("AraDuvar", pos, new Vector3(0.2f, 1.8f, 6.6f), m, trim, g.transform);
        return g;
    }

    GameObject WallGroup(string name, Vector3 pos, Vector3 scale, Material m, Color trim)
    {
        var g = new GameObject(name);
        g.transform.SetParent(world, false);
        Wall(name, pos, scale, m, trim, g.transform);
        return g;
    }

    // ---------------- Yeni Kanat (dogu, oda 107-110) ----------------
    void BuildWing(Material wallM, Color trim)
    {
        wingRoot = new GameObject("YeniKanat");
        wingRoot.transform.SetParent(world, false);
        var w = wingRoot.transform;
        U.Prim("KoridorZemin", w, new Vector3(25.3f, -0.05f, 1.6f), new Vector3(20.2f, 0.1f, 5f),
            U.Mat(new Color(0.96f, 0.91f, 0.82f), U.TileTex, new Vector2(20.2f / 3f, 5f / 3f), 0.45f, 0f));
        U.Prim("KoridorHali", w, new Vector3(25.3f, 0.01f, 1.6f), new Vector3(19f, 0.02f, 1.6f),
            U.Mat(new Color(0.6f, 0.2f, 0.25f), U.CarpetTex, new Vector2(10, 1), 0.05f, 0f));
        Wall("KoridorGuney", new Vector3(25.3f, 0.6f, -0.95f), new Vector3(20.2f, 1.2f, 0.3f), wallM, trim, w);
        Wall("KanatDogu", new Vector3(35.4f, 0.9f, 4.9f), new Vector3(0.3f, 1.8f, 11.9f), wallM, trim, w);
        Wall("KanatArka", new Vector3(25.3f, 1.3f, 10.65f), new Vector3(20.2f, 2.6f, 0.3f), wallM, trim, w);
        Events.Shelter(w, new Vector3(25.35f, 6f, 4.9f), new Vector3(20.3f, 14f, 11.9f));
        for (int i = 6; i < 9; i++)
            dividers[i] = Divider(new Vector3(RoomX[i] + 2.5f, 0.9f, 7.25f), wallM, trim, w);
        for (int i = 6; i < 10; i++)
        {
            float x = RoomX[i];
            Wall("OnDuvar", new Vector3(x - 1.65f, 0.35f, 4f), new Vector3(1.7f, 0.7f, 0.2f), wallM, trim, w);
            Wall("OnDuvar", new Vector3(x + 1.65f, 0.35f, 4f), new Vector3(1.7f, 0.7f, 0.2f), wallM, trim, w);
            U.Box("KapiPervaz", w, new Vector3(x - 0.85f, 0.45f, 4f), new Vector3(0.12f, 0.9f, 0.3f), trim);
            U.Box("KapiPervaz", w, new Vector3(x + 0.85f, 0.45f, 4f), new Vector3(0.12f, 0.9f, 0.3f), trim);
        }
        U.Box("KanatTabela", w, new Vector3(25.3f, 1.55f, -0.95f), new Vector3(4f, 0.6f, 0.2f), new Color(0.16f, 0.22f, 0.38f));
        U.Text(w, new Vector3(25.3f, 1.6f, -1.1f), "YENİ KANAT", 0.06f, new Color(1f, 0.86f, 0.42f));

        wingLocked = new GameObject("KanatInsaat");
        wingLocked.transform.SetParent(world, false);
        var l = wingLocked.transform;
        for (float x = 16f; x <= 35f; x += 1.6f)
        {
            U.Box("InsaatCit", l, new Vector3(x, 0.6f, -0.8f), new Vector3(1.4f, 1.2f, 0.06f), new Color(1f, 0.8f, 0.2f));
            U.Box("InsaatSerit", l, new Vector3(x, 0.6f, -0.84f), new Vector3(1.4f, 0.18f, 0.02f), new Color(0.2f, 0.2f, 0.22f));
        }
        U.Box("Vinç", l, new Vector3(30f, 3f, 6f), new Vector3(0.4f, 6f, 0.4f), new Color(1f, 0.75f, 0.15f));
        U.Box("VinçKol", l, new Vector3(27f, 6f, 6f), new Vector3(7f, 0.3f, 0.3f), new Color(1f, 0.75f, 0.15f));
        U.Text(l, new Vector3(25f, 1.9f, -1f), "YAKINDA · YENİ KANAT", 0.06f, new Color(0.25f, 0.2f, 0.1f));
    }

    // ---------------- 2. Kat (oda 201-206) ----------------
    void BuildFloor2(Material wallM, Color trim)
    {
        floor2Root = new GameObject("Kat2");
        floor2Root.transform.SetParent(world, false);
        var f = floor2Root.transform;
        float F = Elevator.Floor2Z;
        // Yukseklik hissi: asagida kalan zemin ve bina cephesi
        U.Prim("AltZemin", f, new Vector3(0f, -9f, F + 20f), new Vector3(140f, 0.1f, 76f), lowGrass);
        U.Prim("Yol", f, new Vector3(0f, -8.9f, F - 11f), new Vector3(140f, 0.05f, 4f), U.Mat(new Color(0.35f, 0.36f, 0.4f)));
        for (float x = -66f; x <= 66f; x += 6f)
            U.Box("YolCizgi", f, new Vector3(x, -8.85f, F - 11f), new Vector3(2.5f, 0.02f, 0.25f), Color.white);
        U.Box("Cephe", f, new Vector3(0f, -4.6f, F + 5f), new Vector3(40f, 9f, 24f), new Color(0.93f, 0.86f, 0.74f));
        for (float x = -18f; x <= 18f; x += 3f)
            for (int fl = 0; fl < 2; fl++)
                U.Box("Pencere", f, new Vector3(x, -2.4f - fl * 3.6f, F - 7.02f), new Vector3(1.3f, 1.5f, 0.06f), new Color(0.55f, 0.75f, 0.95f));
        var rnd = new System.Random(7);
        for (int k = 0; k < 26; k++)
        {
            float x = (float)(rnd.NextDouble() * 120 - 60);
            float z = F - 16f + (float)(rnd.NextDouble() * 50);
            if (Mathf.Abs(x) < 23f && z > F - 9f) continue;
            if (Mathf.Abs(z - (F - 11f)) < 3f) continue;
            U.Box("AgacGovde", f, new Vector3(x, -8.2f, z), new Vector3(0.4f, 1.6f, 0.4f), new Color(0.45f, 0.3f, 0.2f), PrimitiveType.Cylinder);
            var cr = U.Box("AgacTac", f, new Vector3(x, -6.6f, z), new Vector3(2.4f, 2.4f, 2.4f), new Color(0.3f, 0.62f, 0.3f), PrimitiveType.Sphere);
            Seasons.RegisterCrown(cr.GetComponent<Renderer>());
        }
        U.Prim("Cati", f, new Vector3(0f, -0.08f, F + 5f), new Vector3(40f, 0.12f, 24f),
            U.Mat(new Color(0.78f, 0.76f, 0.72f), U.TileTex, new Vector2(14, 8), 0.2f, 0f));
        for (float x = -19.5f; x <= 19.5f; x += 1.5f)
        {
            U.Box("Korkuluk", f, new Vector3(x, 0.5f, F - 6.9f), new Vector3(0.08f, 1f, 0.08f), Color.white);
            U.Box("Korkuluk", f, new Vector3(x, 0.5f, F + 16.9f), new Vector3(0.08f, 1f, 0.08f), Color.white);
        }
        U.Box("KorkulukUst", f, new Vector3(0f, 1f, F - 6.9f), new Vector3(39.2f, 0.08f, 0.08f), Color.white);
        U.Box("KorkulukUst", f, new Vector3(0f, 1f, F + 16.9f), new Vector3(39.2f, 0.08f, 0.08f), Color.white);
        U.Prim("KoridorZemin", f, new Vector3(0f, -0.04f, F + 1.65f), new Vector3(30.5f, 0.1f, 4.7f),
            U.Mat(new Color(0.96f, 0.91f, 0.82f), U.TileTex, new Vector2(10, 1.6f), 0.45f, 0f));
        U.Prim("KoridorHali", f, new Vector3(0f, 0.01f, F + 1.9f), new Vector3(28f, 0.02f, 1.6f),
            U.Mat(new Color(0.2f, 0.3f, 0.55f), U.CarpetTex, new Vector2(14, 1), 0.05f, 0f));
        Wall("Kat2Guney", new Vector3(0f, 0.6f, F - 0.75f), new Vector3(30.9f, 1.2f, 0.3f), wallM, trim, f);
        Wall("Kat2Bati", new Vector3(-15.25f, 0.9f, F + 5f), new Vector3(0.4f, 1.8f, 11.8f), wallM, trim, f);
        Wall("Kat2Dogu", new Vector3(15.25f, 0.9f, F + 5f), new Vector3(0.4f, 1.8f, 11.8f), wallM, trim, f);
        Wall("Kat2Arka", new Vector3(0f, 1.3f, F + 10.65f), new Vector3(30.9f, 2.6f, 0.3f), wallM, trim, f);
        Events.Shelter(f, new Vector3(0f, 6f, F + 5f), new Vector3(30.9f, 14f, 11.8f));
        for (int i = 0; i < 5; i++)
            dividers[Eco.Floor2Start + i] = Divider(new Vector3(RoomX[i] + 2.5f, 0.9f, F + 7.25f), wallM, trim, f);
        for (int i = 0; i < 6; i++)
        {
            float x = RoomX[i];
            Wall("OnDuvar", new Vector3(x - 1.65f, 0.35f, F + 4f), new Vector3(1.7f, 0.7f, 0.2f), wallM, trim, f);
            Wall("OnDuvar", new Vector3(x + 1.65f, 0.35f, F + 4f), new Vector3(1.7f, 0.7f, 0.2f), wallM, trim, f);
            U.Box("KapiPervaz", f, new Vector3(x - 0.85f, 0.45f, F + 4f), new Vector3(0.12f, 0.9f, 0.3f), trim);
            U.Box("KapiPervaz", f, new Vector3(x + 0.85f, 0.45f, F + 4f), new Vector3(0.12f, 0.9f, 0.3f), trim);
        }
        U.Box("Kat2Tabela", f, new Vector3(-6f, 1.55f, F - 0.75f), new Vector3(3f, 0.6f, 0.2f), new Color(0.16f, 0.22f, 0.38f));
        U.Text(f, new Vector3(-6f, 1.6f, F - 0.9f), "2. KAT", 0.07f, new Color(1f, 0.86f, 0.42f));
        U.Furn("pottedPlant", f, new Vector3(14.3f, 0f, F + 0.2f), 0f, 2.4f, Vector3.one, Color.green);

        // Cati terasi (koridorun onunde, dekor)
        U.Prim("TerasZemin", f, new Vector3(0f, -0.01f, F - 3.9f), new Vector3(30f, 0.04f, 5.4f),
            U.Mat(new Color(0.62f, 0.45f, 0.3f), U.WoodTex, new Vector2(10, 2), 0.3f, 0f));
        Color[] uc = { new Color(1f, 0.45f, 0.4f), new Color(0.35f, 0.65f, 0.95f), new Color(1f, 0.8f, 0.3f), new Color(0.45f, 0.8f, 0.5f) };
        float[] lx = { -11.5f, -8.7f, 8.7f, 11.5f };
        for (int i = 0; i < lx.Length; i++)
        {
            U.Furn("loungeChairRelax", f, new Vector3(lx[i], 0f, F - 3.6f), 180f, 2.2f, new Vector3(1f, 0.8f, 1.6f), Color.white);
        }
        foreach (float ux in new[] { -10.1f, 10.1f })
        {
            U.Box("SemsiyeDirek", f, new Vector3(ux, 1.2f, F - 3.3f), new Vector3(0.07f, 1.2f, 0.07f), Color.white, PrimitiveType.Cylinder);
            U.Box("Semsiye", f, new Vector3(ux, 2.35f, F - 3.3f), new Vector3(2.4f, 0.12f, 2.4f), uc[ux < 0 ? 0 : 1], PrimitiveType.Cylinder);
        }
        for (int k = 0; k < 3; k++)
        {
            float tx = -3f + k * 3f;
            U.Furn("tableRound", f, new Vector3(tx, 0f, F - 3.8f), 0f, 2.2f, new Vector3(1f, 0.8f, 1f), Color.white);
            U.Furn("chairCushion", f, new Vector3(tx - 0.9f, 0f, F - 3.8f), 90f, 2.2f, new Vector3(0.6f, 1f, 0.6f), Color.white);
            U.Furn("chairCushion", f, new Vector3(tx + 0.9f, 0f, F - 3.8f), -90f, 2.2f, new Vector3(0.6f, 1f, 0.6f), Color.white);
        }
        foreach (float x in new[] { -14.4f, -6.2f, 6.2f, 14.4f })
            U.Furn("pottedPlant", f, new Vector3(x, 0f, F - 6.1f), 0f, 2.4f, Vector3.one, Color.green);
        // isik zinciri
        for (float x = -14f; x <= 14f; x += 0.9f)
            U.Box("Ampul", f, new Vector3(x, 2.3f + Mathf.Sin(x * 0.7f) * 0.12f, F - 1.2f), new Vector3(0.12f, 0.12f, 0.12f),
                new Color(1f, 0.85f, 0.45f), PrimitiveType.Sphere);
        U.Text(f, new Vector3(0f, 0.05f, F - 5.9f), "TERAS", 0.08f, new Color(1f, 0.86f, 0.5f));
    }

    public void SetFloor2(bool open, bool fx)
    {
        floor2Open = open;
        floor2Root.SetActive(open);
        elevator.SetOpen(open);
        if (fx)
        {
            U.Burst(Elevator.LobbyPad + Vector3.up * 2f, new Color(1f, 0.85f, 0.3f), new Color(0.5f, 0.8f, 1f), 120, 7f);
            Sfx.Play("unlock");
            Celebrate("2. Kat açıldı!", "Asansörün önündeki dairede bekleyerek kat değiştirebilirsin. 6 yeni oda (201-206) menüde.");
        }
    }

    // ---------------- Ozel gun susleri (gercek takvim) ----------------
    void BuildSpecialDecor()
    {
        // Yilbasi: lobide cam agaci ve isik zincirleri
        specialDecor[0] = new GameObject("Yilbasi");
        specialDecor[0].transform.SetParent(world, false);
        var y = specialDecor[0].transform;
        Vector3 tp = new Vector3(-2.6f, 0f, -16.7f);
        U.Box("Govde", y, tp + new Vector3(0, 0.3f, 0), new Vector3(0.3f, 0.3f, 0.3f), new Color(0.45f, 0.3f, 0.2f), PrimitiveType.Cylinder);
        for (int k = 0; k < 4; k++)
            U.Box("Dal", y, tp + new Vector3(0, 0.9f + k * 0.55f, 0), new Vector3(1.8f - k * 0.4f, 0.55f, 1.8f - k * 0.4f), new Color(0.15f, 0.5f, 0.25f), PrimitiveType.Cylinder);
        U.Prim("Yildiz", y, tp + new Vector3(0, 3.15f, 0), Vector3.one * 0.35f, U.Glow(new Color(1f, 0.85f, 0.3f), 3f), PrimitiveType.Sphere);
        Color[] orn = { new Color(1f, 0.2f, 0.25f), new Color(1f, 0.8f, 0.2f), new Color(0.3f, 0.6f, 1f) };
        for (int k = 0; k < 12; k++)
        {
            float a = k * 2.4f, h = 0.9f + (k % 4) * 0.55f, rr = 0.85f - (k % 4) * 0.2f;
            U.Prim("Sus", y, tp + new Vector3(Mathf.Cos(a) * rr, h, Mathf.Sin(a) * rr), Vector3.one * 0.16f, U.Glow(orn[k % 3], 1.5f), PrimitiveType.Sphere);
        }
        for (int k = 0; k < 3; k++)
            U.Box("Hediye", y, tp + new Vector3(-0.7f + k * 0.7f, 0.18f, 1.05f), new Vector3(0.45f, 0.36f, 0.45f), orn[k]);
        for (float x = -14f; x <= 14f; x += 1.4f)
            U.Prim("IsikZincir", y, new Vector3(x, 1.25f, -12.1f), Vector3.one * 0.12f, U.Glow(orn[(int)((x + 14f) / 1.4f) % 3], 2.5f), PrimitiveType.Sphere);
        AddObstacleIfSpecial(0, tp.x - 1f, tp.z - 1.4f, tp.x + 1f, tp.z + 1f);

        // Sevgililer gunu: kalpler ve pembe balonlar
        specialDecor[1] = new GameObject("Sevgililer");
        specialDecor[1].transform.SetParent(world, false);
        var v = specialDecor[1].transform;
        for (int k = 0; k < 8; k++)
        {
            Vector3 p = new Vector3(-12f + k * 3.4f, 2.6f + (k % 2) * 0.3f, -11.9f);
            U.Prim("Balon", v, p, new Vector3(0.45f, 0.55f, 0.45f), U.Glow(k % 2 == 0 ? new Color(1f, 0.35f, 0.55f) : new Color(1f, 0.7f, 0.85f), 0.8f), PrimitiveType.Sphere);
            U.Box("Ip", v, p + Vector3.down * 0.6f, new Vector3(0.01f, 0.7f, 0.01f), Color.white);
        }
        U.Text(v, new Vector3(4f, 0.5f, -6.2f), "♥", 0.4f, new Color(1f, 0.4f, 0.6f, 0.7f));

        // Ulusal bayramlar: kirmizi bayraklar ve flama
        specialDecor[2] = new GameObject("Bayram");
        specialDecor[2].transform.SetParent(world, false);
        var b = specialDecor[2].transform;
        Color red = new Color(0.85f, 0.1f, 0.15f);
        foreach (float x in new[] { -11f, -6f, 6f, 11f })
        {
            U.Box("Direk", b, new Vector3(x, 2f, -12.95f), new Vector3(0.08f, 2f, 0.08f), Color.white, PrimitiveType.Cylinder);
            U.Box("Bayrak", b, new Vector3(x + 0.55f, 3.55f, -12.95f), new Vector3(1.1f, 0.72f, 0.03f), red);
            U.Box("Hilal", b, new Vector3(x + 0.38f, 3.55f, -12.99f), new Vector3(0.38f, 0.38f, 0.02f), Color.white, PrimitiveType.Cylinder).transform.localRotation = Quaternion.Euler(90, 0, 0);
            U.Box("HilalIc", b, new Vector3(x + 0.45f, 3.55f, -13.0f), new Vector3(0.3f, 0.3f, 0.02f), red, PrimitiveType.Cylinder).transform.localRotation = Quaternion.Euler(90, 0, 0);
            U.Box("Yildiz", b, new Vector3(x + 0.72f, 3.55f, -13.0f), new Vector3(0.12f, 0.12f, 0.02f), Color.white);
        }
        for (float x = -14f; x <= 14f; x += 0.9f)
            U.Box("Flama", b, new Vector3(x, 2.2f, -12.1f), new Vector3(0.35f, 0.3f, 0.02f), ((int)((x + 14f) / 0.9f)) % 2 == 0 ? red : Color.white);

        string sd = Seasons.SpecialDay;
        specialDecor[0].SetActive(sd == "yilbasi");
        specialDecor[1].SetActive(sd == "sevgililer");
        specialDecor[2].SetActive(sd == "bayram");
    }

    void AddObstacleIfSpecial(int idx, float x0, float z0, float x1, float z1)
    {
        if (idx == 0 && Seasons.SpecialDay == "yilbasi") AddObstacle(x0, z0, x1, z1);
    }

    void SetWing(bool open, bool fx)
    {
        wingOpen = open;
        wingRoot.SetActive(open);
        wingLocked.SetActive(!open);
        eastDoorFill.SetActive(!open);
        if (fx)
        {
            U.Burst(new Vector3(25f, 2f, 3f), new Color(1f, 0.85f, 0.3f), new Color(0.5f, 0.8f, 1f), 140, 8f);
            Sfx.Play("unlock");
            Celebrate("Yeni Kanat açıldı!", "4 yeni oda (107-110) artık menüden açılabilir.");
        }
    }

    // ---------------- Gece lambalari ----------------
    void BuildLamps()
    {
        Color warm = new Color(1f, 0.82f, 0.55f);
        // Lobi tavan isiklari
        foreach (var p in new[] { new Vector3(-9f, 3.2f, -7f), new Vector3(0f, 3.2f, -7f), new Vector3(9f, 3.2f, -7f), new Vector3(-9f, 3.2f, 0.5f), new Vector3(0f, 3.2f, 0.5f), new Vector3(9f, 3.2f, 0.5f) })
            dayNight.AddLamp(p, 11f, 4.5f, warm);
        // Duvar fenerleri (gece yanar)
        foreach (float x in new[] { -11.5f, -6f, 6f, 11.5f }) Sconce(new Vector3(x, 0.9f, -12.25f));
        foreach (float z in new[] { -10.6f, -7f }) Sconce(new Vector3(-15.25f, 1.2f, z));
        foreach (float z in new[] { -11.3f, -4.6f }) Sconce(new Vector3(15.25f, 1.2f, z));
        foreach (var r in rooms) dayNight.AddLamp(new Vector3(r.x, 2.6f, r.Z(7.2f)), 6f, 2.4f, warm);
        dayNight.AddLamp(new Vector3(-6f, 3f, Elevator.Floor2Z + 1.6f), 11f, 4f, warm);
        dayNight.AddLamp(new Vector3(6f, 3f, Elevator.Floor2Z + 1.6f), 11f, 4f, warm);
        dayNight.AddLamp(new Vector3(-4.2f, 2.9f, -15.2f), 8f, 5f, warm);
        dayNight.AddLamp(new Vector3(4.2f, 2.9f, -15.2f), 8f, 5f, warm);
        dayNight.AddLamp(new Vector3(-21.7f, 2.5f, -1f), 10f, 4f, new Color(0.6f, 0.85f, 1f));
        dayNight.AddLamp(new Vector3(25f, 2.6f, 1.6f), 10f, 3.5f, warm);
    }

    // Duvar ustu kucuk fener: gunduz sonuk, gece yanar ve cevresini aydinlatir
    void Sconce(Vector3 top)
    {
        Color dark = new Color(0.22f, 0.2f, 0.2f), warm = new Color(1f, 0.82f, 0.55f);
        U.Box("FenerDirek", world, top + Vector3.up * 0.2f, new Vector3(0.07f, 0.4f, 0.07f), dark);
        U.Box("FenerTaban", world, top + Vector3.up * 0.3f, new Vector3(0.3f, 0.05f, 0.3f), dark);
        var glass = U.Prim("FenerCam", world, top + Vector3.up * 0.5f, new Vector3(0.24f, 0.32f, 0.24f), U.Mat(new Color(1f, 0.95f, 0.85f)));
        U.Box("FenerKapak", world, top + Vector3.up * 0.7f, new Vector3(0.34f, 0.07f, 0.34f), dark);
        dayNight.AddFixture(glass.GetComponent<Renderer>(), new Color(1f, 0.85f, 0.55f), 1.6f);
        dayNight.AddLamp(top + Vector3.up * 0.9f, 6.5f, 3f, warm);
    }

    // ---------------- Yildizla buyuyen dis cephe ----------------
    void BuildStarDecor()
    {
        for (int t = 2; t <= 5; t++)
        {
            starDecor[t] = new GameObject("DisCephe" + t + "Yildiz");
            starDecor[t].transform.SetParent(world, false);
        }
        // 2 yildiz: giris saksilari
        var d2 = starDecor[2].transform;
        foreach (float x in new[] { -3.3f, 3.3f })
        {
            U.Box("Saksi", d2, new Vector3(x, 0.35f, -13.1f), new Vector3(0.9f, 0.7f, 0.9f), new Color(0.85f, 0.85f, 0.88f));
            U.Box("Cicekler", d2, new Vector3(x, 0.85f, -13.1f), new Vector3(0.95f, 0.5f, 0.95f), new Color(0.35f, 0.65f, 0.35f), PrimitiveType.Sphere);
            for (int k = 0; k < 5; k++)
                U.Box("Cicek", d2, new Vector3(x + Random.Range(-0.35f, 0.35f), 1.05f, -13.1f + Random.Range(-0.35f, 0.35f)), Vector3.one * 0.16f,
                    k % 2 == 0 ? new Color(1f, 0.45f, 0.6f) : new Color(1f, 0.9f, 0.4f), PrimitiveType.Sphere);
        }
        // 3 yildiz: bayraklar
        var d3 = starDecor[3].transform;
        Color[] fc = { new Color(0.85f, 0.15f, 0.2f), new Color(0.2f, 0.45f, 0.85f), new Color(0.95f, 0.75f, 0.2f), new Color(0.85f, 0.15f, 0.2f) };
        float[] fx = { -8f, -5.5f, 5.5f, 8f };
        for (int i = 0; i < 4; i++)
        {
            U.Box("BayrakDirek", d3, new Vector3(fx[i], 2f, -12.9f), new Vector3(0.08f, 2f, 0.08f), new Color(0.85f, 0.85f, 0.88f), PrimitiveType.Cylinder);
            U.Box("Bayrak", d3, new Vector3(fx[i] + 0.45f, 3.5f, -12.9f), new Vector3(0.9f, 0.55f, 0.03f), fc[i]);
        }
        // 4 yildiz: fiskiye
        var d4 = starDecor[4].transform;
        U.Box("Havuzcuk", d4, new Vector3(-21f, 0.25f, -11f), new Vector3(3.4f, 0.5f, 3.4f), new Color(0.88f, 0.86f, 0.82f), PrimitiveType.Cylinder);
        U.Prim("FiskiyeSu", d4, new Vector3(-21f, 0.48f, -11f), new Vector3(3f, 0.04f, 3f), U.Mat(new Color(0.3f, 0.7f, 0.95f), null, Vector2.one, 0.95f, 0.5f), PrimitiveType.Cylinder);
        U.Box("FiskiyeOrta", d4, new Vector3(-21f, 0.9f, -11f), new Vector3(0.6f, 0.8f, 0.6f), new Color(0.88f, 0.86f, 0.82f), PrimitiveType.Cylinder);
        U.Prim("FiskiyeTepe", d4, new Vector3(-21f, 1.9f, -11f), new Vector3(0.5f, 1.2f, 0.5f), U.Mat(new Color(0.6f, 0.85f, 1f), null, Vector2.one, 0.95f, 0.6f), PrimitiveType.Sphere);
        // 5 yildiz: kirmizi hali, altin yildizlar, isiklar
        var d5 = starDecor[5].transform;
        U.Flat("KirmiziHali", d5, new Vector3(0f, -0.02f, -14f), new Vector3(2.4f, 0.02f, 3.4f), new Color(0.75f, 0.12f, 0.15f));
        for (int k = 0; k < 5; k++)
            U.Text(d5, new Vector3(-1.2f + k * 0.6f, 4.15f, -12.45f), "★", 0.08f, new Color(1f, 0.82f, 0.25f));
        foreach (float x in new[] { -2.6f, 2.6f })
            U.Prim("Spot", d5, new Vector3(x, 0.3f, -13.4f), new Vector3(0.35f, 0.35f, 0.35f), U.Glow(new Color(1f, 0.95f, 0.8f), 3f), PrimitiveType.Sphere);
        UpdateStarDecor(false);
    }

    void UpdateStarDecor(bool fx)
    {
        int tier = Mathf.Clamp(Mathf.FloorToInt(Stars + 0.001f), 1, 5);
        if (tier == starTier) return;
        bool up = starTier >= 0 && tier > starTier;
        starTier = tier;
        for (int t = 2; t <= 5; t++) if (starDecor[t]) starDecor[t].SetActive(tier >= t);
        if (fx && up)
        {
            Celebrate("Otelin " + tier + " yıldız oldu!", tier >= 5 ? "Artık şehrin en iyi oteli sensin!" : "Daha çok misafir gelecek, fiyatlar yükseldi ve otelin dışı güzelleşti.");
            U.Burst(new Vector3(0f, 3f, -12.5f), new Color(1f, 0.85f, 0.3f), new Color(1f, 0.5f, 0.7f), 150, 8f);
        }
    }

    public void AddRating(float r)
    {
        ratings.Add(r);
        while (ratings.Count > 20) ratings.RemoveAt(0);
        float sum = 0f;
        foreach (var v in ratings) sum += v;
        Stars = Mathf.Clamp(sum / ratings.Count, 1f, 5f);
        UpdateStarDecor(true);
    }

    public void Celebrate(string title, string sub)
    {
        celebTitle = title;
        celebSub = sub;
        celebT = 6f;
        if (player) U.Burst(player.transform.position + Vector3.up * 2f, new Color(1f, 0.85f, 0.3f), new Color(0.5f, 0.8f, 1f), 80, 6f);
        Sfx.Play("unlock");
    }

    public void Reward(int amount, string title, string what)
    {
        money += amount;
        Quests.Track("earned", amount);
        Report.Bonus(amount);
        Celebrate(title, what + "  ·  Ödül: " + Eco.TL(amount));
        Sfx.Play("coin");
    }

    public void OnNewDay()
    {
        Report.EndOfDay(dayNight.day - 1);
        Quests.NewDay();
        var prev = (Seasons.S)(((Mathf.Max(1, dayNight.day - 1) - 1) / Seasons.DaysPerSeason) % 4);
        Seasons.Apply();
        Events.NewDay(dayNight.day);
        Regulars.NewDay(dayNight.day);
        Reservations.NewDay(dayNight.day);
        foreach (var st in AllStaff()) st.NewDay();
        if (Seasons.Current != prev && dayNight.day > 1)
            Popups.Show(Seasons.Names[(int)Seasons.Current] + " geldi!", Seasons.Current == Seasons.S.Yaz ? "Yaz kalabalığı! Daha çok misafir gelir, havuz dolup taşar." :
                Seasons.Current == Seasons.S.Kis ? "Kar yağıyor. Misafirler kafeye daha çok gider, havuz pek kullanılmaz." :
                Seasons.Current == Seasons.S.Sonbahar ? "Yapraklar dökülüyor. Kafe keyfi artar." : "Doğa uyanıyor, ağaçlar çiçek açtı.", "YENİ MEVSİM").Add("Harika!");
        else if (Seasons.Festival) Popups.Show("Festival günü!", "Bugün misafir sayısı %50, bahşişler %30 fazla.", "ÖZEL GÜN").Add("Harika!");
        Notify("Gün " + dayNight.day + " · Hava: " + Events.WNames[(int)Events.weather]);
        foreach (var st in AllStaff())
            if (st.morale < 0.25f) { Notify(st.who + " çok mutsuz! Personel sekmesinden ikramiye ver"); break; }
        Save();
    }

    public IEnumerable<StaffStats> AllStaff()
    {
        if (reception.HasStaff) yield return reception.stats;
        foreach (var c in cleaners) yield return c.stats;
        if (cafe.HasBarista) yield return cafe.stats;
    }

    public void StaffMoraleAll(float d)
    {
        foreach (var st in AllStaff()) st.morale = Mathf.Clamp(st.morale + d, 0.05f, 1f);
    }

    public void StaffBonus(StaffStats st)
    {
        if (!Pay(st.BonusCost)) return;
        Report.Other(st.BonusCost);
        st.Bonus();
        Sfx.Play("coin");
        Notify(st.who + " çok sevindi! Morali yükseldi");
        Save();
    }

    public void BuyRestRoom()
    {
        if (restRoom || !Pay(Eco.RestRoomCost)) return;
        restRoom = true;
        Celebrate("Personel dinlenme odası!", "Çalışanlar molada iki kat hızlı dinlenecek, morali daha yavaş düşecek.");
        Save();
    }

    // Olay giderleri (rapora "diger" olarak yazilir)
    public void Spend(int c, string what)
    {
        int p = Mathf.Min(c, money);
        money -= p;
        Report.Other(p);
    }

    public void QueueSpawn(Customer.Config cfg) => pendingSpawns.Add(cfg);

    public void AdoptCat()
    {
        catAdopted = true;
        if (!cat) cat = Cat.Make("Pamuk");
        Social.Share("Otelin yeni maskotu Pamuk! Bu tatlılığa bakın.", 1, false);
        Celebrate("Otelin kedisi: Pamuk!", "Pamuk artık lobide dolaşıyor. Misafirler onu çok seviyor (memnuniyet +0,1).");
        Save();
    }

    public void BuyTheme(int roomIdx, int theme)
    {
        var r = rooms[roomIdx];
        bool owned = (r.themeOwned & (1 << theme)) != 0;
        if (!owned)
        {
            int c = Themes.Cost(roomIdx, theme);
            if (!Pay(c)) return;
            Notify("Oda " + r.Number + " artık " + Themes.Names[theme] + " temalı!");
        }
        r.SetTheme(theme, true);
        Save();
    }

    // ---- Oda tipleri ve Baskanlik Suiti ----
    public void BuyKind(int i, int k)
    {
        var r = rooms[i];
        if (!r.Unlocked || r.IsSuite || r.IsSuitePart || r.kind == k) return;
        if (r.level < RoomKinds.MinLevel(k)) { Notify(RoomKinds.Names[k] + " için en az " + Eco.LevelNames[RoomKinds.MinLevel(k)] + " seviye gerekir"); return; }
        if (!Pay(RoomKinds.Cost(i, k))) return;
        r.SetKind(k, true);
        Notify("Oda " + r.Number + " artık " + RoomKinds.Names[k] + "!");
        Save();
    }

    public bool CanSuite(int i)
    {
        if (i < 0 || i + 1 >= rooms.Count || !RoomKinds.SameSection(i, i + 1)) return false;
        var a = rooms[i];
        var b = rooms[i + 1];
        return a.level >= 3 && b.level >= 3 && !a.IsSuite && !a.IsSuitePart && !b.IsSuite && !b.IsSuitePart &&
               a.state == Room.State.Clean && b.state == Room.State.Clean;
    }

    public void MakeSuite(int i)
    {
        if (!CanSuite(i) || !Pay(RoomKinds.SuiteCost(i))) return;
        rooms[i].MakeSuite(rooms[i + 1], true);
        if (dividers[i]) dividers[i].SetActive(false);
        Story.Track("suite");
        Celebrate("Başkanlık Süiti!", "Oda " + rooms[i].Number + " ve " + rooms[i + 1].Number + " birleşti. Sadece VIP ve ünlüler kalır. Gecelik " + Eco.TL(rooms[i].Price) + ".");
        Save();
    }

    public void SetPricing(int p)
    {
        Pricing.policy = Mathf.Clamp(p, 0, 3);
        Notify("Fiyat politikası: " + Pricing.Names[Pricing.policy]);
        Save();
    }

    // ---- Iki oyunculu mod ----
    public void SetCoop(bool on)
    {
        coop = on;
        if (on && !player2)
        {
            player2 = new GameObject("Oyuncu2").AddComponent<Player>();
            player2.SetSecond();
            player2.transform.position = player.transform.position + Vector3.right * 1.2f;
            if (!Walkable(player2.transform.position)) player2.transform.position = player.transform.position;
            player2.SetLook(Variants[p2Variant], p2Name);
            players.Add(player2);
        }
        else if (!on && player2)
        {
            if (laundry) laundry.AddClean(player2.linen);
            players.Remove(player2);
            Destroy(player2.gameObject);
            player2 = null;
        }
    }

    public void SetPlayer2(int variant, string name)
    {
        p2Variant = (variant % Variants.Length + Variants.Length) % Variants.Length;
        p2Name = string.IsNullOrWhiteSpace(name) ? "Oyuncu 2" : name.Trim();
        if (player2) player2.SetLook(Variants[p2Variant], p2Name);
    }

    public bool PlayerNear(Vector3 pos, float r) => NearestPlayer(pos, r) != null;

    public Player NearestPlayer(Vector3 pos, float r)
    {
        Player best = null;
        float bd = r;
        foreach (var p in players)
        {
            if (!p) continue;
            float d = U.Flat(p.transform.position, pos);
            if (d < bd) { bd = d; best = p; }
        }
        return best;
    }

    void Ob(Bounds b) => AddObstacle(b.min.x, b.min.z, b.max.x, b.max.z);

    void Plant(Vector3 p, float s)
    {
        if (Resources.Load<GameObject>("Mobilya/pottedPlant"))
        {
            var b = U.Furn("pottedPlant", plantParent ? plantParent : world, p, Random.Range(0f, 360f), 2.6f * s, Vector3.one, Color.green);
            if (!plantParent) Ob(b);
            return;
        }
        U.Box("Saksi", world, p + new Vector3(0, 0.3f * s, 0), new Vector3(0.6f, 0.3f, 0.6f) * s, new Color(0.78f, 0.5f, 0.35f), PrimitiveType.Cylinder);
        U.Box("Toprak", world, p + new Vector3(0, 0.6f * s, 0), new Vector3(0.55f, 0.02f, 0.55f) * s, new Color(0.35f, 0.25f, 0.18f), PrimitiveType.Cylinder);
        Color g1 = new Color(0.3f, 0.65f, 0.35f), g2 = new Color(0.38f, 0.75f, 0.4f);
        U.Box("Yaprak", world, p + new Vector3(0, 1.0f * s, 0), Vector3.one * 0.8f * s, g1, PrimitiveType.Sphere);
        U.Box("Yaprak", world, p + new Vector3(0.22f, 1.35f * s, 0.1f), Vector3.one * 0.6f * s, g2, PrimitiveType.Sphere);
        U.Box("Yaprak", world, p + new Vector3(-0.2f, 1.25f * s, -0.12f), Vector3.one * 0.55f * s, g2, PrimitiveType.Sphere);
        AddObstacle(p.x - 0.4f * s, p.z - 0.4f * s, p.x + 0.4f * s, p.z + 0.4f * s);
    }

    void Tree(Vector3 p, float s)
    {
        U.Box("Govde", world, p + new Vector3(0, 0.9f * s, 0), new Vector3(0.35f, 0.9f, 0.35f) * s, new Color(0.5f, 0.35f, 0.22f), PrimitiveType.Cylinder);
        Seasons.RegisterCrown(U.Box("Tac", world, p + new Vector3(0, 2.3f * s, 0), Vector3.one * 2f * s, new Color(0.32f, 0.62f, 0.32f), PrimitiveType.Sphere).GetComponent<Renderer>());
        Seasons.RegisterCrown(U.Box("Tac", world, p + new Vector3(0.5f, 2.8f * s, 0.2f), Vector3.one * 1.4f * s, new Color(0.4f, 0.7f, 0.36f), PrimitiveType.Sphere).GetComponent<Renderer>());
        Seasons.RegisterCrown(U.Box("Tac", world, p + new Vector3(-0.45f, 2.7f * s, -0.3f), Vector3.one * 1.3f * s, new Color(0.36f, 0.66f, 0.34f), PrimitiveType.Sphere).GetComponent<Renderer>());
    }

    void Bush(Vector3 p)
    {
        U.Box("Cali", world, p + new Vector3(0, 0.35f, 0), new Vector3(1.4f, 0.8f, 0.9f), new Color(0.3f, 0.6f, 0.32f), PrimitiveType.Sphere);
        U.Box("Cicek", world, p + new Vector3(0.3f, 0.7f, -0.3f), Vector3.one * 0.18f, new Color(1f, 0.55f, 0.7f), PrimitiveType.Sphere);
        U.Box("Cicek", world, p + new Vector3(-0.35f, 0.65f, -0.25f), Vector3.one * 0.16f, new Color(1f, 0.95f, 0.5f), PrimitiveType.Sphere);
    }

    void LampPost(Vector3 p)
    {
        U.Box("Direk", world, p + new Vector3(0, 1.4f, 0), new Vector3(0.12f, 1.4f, 0.12f), new Color(0.2f, 0.22f, 0.25f), PrimitiveType.Cylinder);
        U.Prim("Fener", world, p + new Vector3(0, 2.9f, 0), Vector3.one * 0.4f, U.Glow(new Color(1f, 0.9f, 0.6f), 2.5f), PrimitiveType.Sphere);
    }

    void FloorLamp(Vector3 p)
    {
        U.Box("LambaAyak", world, p + new Vector3(0, 0.75f, 0), new Vector3(0.06f, 0.75f, 0.06f), new Color(0.25f, 0.25f, 0.28f), PrimitiveType.Cylinder);
        U.Box("LambaTaban", world, p + new Vector3(0, 0.03f, 0), new Vector3(0.4f, 0.03f, 0.4f), new Color(0.25f, 0.25f, 0.28f), PrimitiveType.Cylinder);
        U.Prim("Abajur", world, p + new Vector3(0, 1.6f, 0), new Vector3(0.5f, 0.2f, 0.5f), U.Glow(new Color(1f, 0.88f, 0.6f), 1.5f), PrimitiveType.Cylinder);
        AddObstacle(p.x - 0.25f, p.z - 0.25f, p.x + 0.25f, p.z + 0.25f);
    }

    void Sofa(Vector3 p)
    {
        Color c = new Color(0.32f, 0.47f, 0.72f), c2 = new Color(0.28f, 0.42f, 0.66f);
        U.Box("KoltukOturak", world, p + new Vector3(0, 0.32f, 0), new Vector3(1.1f, 0.4f, 3.2f), c);
        U.Box("KoltukSirt", world, p + new Vector3(0.5f, 0.78f, 0), new Vector3(0.3f, 0.9f, 3.2f), c2);
        U.Box("KoltukKolL", world, p + new Vector3(0.05f, 0.55f, 1.55f), new Vector3(1.2f, 0.55f, 0.25f), c2);
        U.Box("KoltukKolR", world, p + new Vector3(0.05f, 0.55f, -1.55f), new Vector3(1.2f, 0.55f, 0.25f), c2);
        U.Box("Minder", world, p + new Vector3(0.25f, 0.75f, 0.7f), new Vector3(0.18f, 0.5f, 0.5f), new Color(1f, 0.85f, 0.4f));
        U.Box("Minder", world, p + new Vector3(0.25f, 0.75f, -0.7f), new Vector3(0.18f, 0.5f, 0.5f), new Color(0.95f, 0.5f, 0.45f));
    }

    void Painting(Vector3 p, Color c)
    {
        bool west = p.x < 0;
        Vector3 s = new Vector3(0.05f, 0.6f, 1.2f);
        U.Box("Cerceve", world, p, s + new Vector3(0, 0.12f, 0.12f), new Color(0.85f, 0.7f, 0.35f));
        var canvas = U.Box("Resim", world, p + new Vector3(west ? 0.02f : -0.02f, 0, 0), s, c);
        Photos.Apply(canvas, s.z, s.y);
        if (Photos.All.Count == 0) paintingCanvases.Add(canvas.GetComponent<Renderer>());
        if (Photos.All.Count == 0) U.Box("ResimGunes", world, p + new Vector3(west ? 0.04f : -0.04f, 0.1f, 0.25f), new Vector3(0.02f, 0.18f, 0.18f), new Color(1f, 0.9f, 0.5f), PrimitiveType.Sphere);
    }

    void Car(Vector3 p, Color c)
    {
        U.Box("Kasa", world, p + new Vector3(0, 0.55f, 0), new Vector3(3.6f, 0.6f, 1.7f), c);
        U.Box("Kabin", world, p + new Vector3(-0.2f, 1.05f, 0), new Vector3(2f, 0.5f, 1.5f), Color.Lerp(c, Color.white, 0.2f));
        U.Prim("CamOn", world, p + new Vector3(0.82f, 1.05f, 0), new Vector3(0.05f, 0.42f, 1.4f), U.Mat(new Color(0.55f, 0.75f, 0.95f), 0.9f));
        foreach (float x in new[] { -1.2f, 1.2f })
            foreach (float z in new[] { -0.8f, 0.8f })
            {
                var w = U.Box("Teker", world, p + new Vector3(x, 0.32f, z), new Vector3(0.65f, 0.12f, 0.65f), new Color(0.15f, 0.15f, 0.17f), PrimitiveType.Cylinder);
                w.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            }
        U.Prim("Far", world, p + new Vector3(1.81f, 0.6f, 0.55f), new Vector3(0.04f, 0.15f, 0.3f), U.Glow(new Color(1f, 0.95f, 0.8f), 1.5f));
        U.Prim("Far", world, p + new Vector3(1.81f, 0.6f, -0.55f), new Vector3(0.04f, 0.15f, 0.3f), U.Glow(new Color(1f, 0.95f, 0.8f), 1.5f));
    }

    // ================= SATIN ALMALAR =================
    public bool CanPay(int cost) => money >= cost;

    bool Pay(int cost)
    {
        if (money < cost)
        {
            Sfx.Play("bad", 0.5f);
            Notify("Yeterli paran yok");
            return false;
        }
        money -= cost;
        return true;
    }

    // Siradaki acilabilecek oda (sirayla acilir)
    public int NextLockedRoom()
    {
        for (int i = 0; i < rooms.Count; i++) if (!rooms[i].Unlocked) return i;
        return -1;
    }

    public void UnlockRoom(int i)
    {
        if (i >= Eco.WingStart && i < Eco.Floor2Start && !wingOpen) return;
        if (i >= Eco.Floor2Start && !floor2Open) return;
        if (i != NextLockedRoom() || !Pay(Eco.RoomUnlock[i])) return;
        rooms[i].ApplyLevel(1, true);
        laundry.AddClean(2);
        Save();
    }

    public void UpgradeRoom(int i)
    {
        var r = rooms[i];
        if (!r.Unlocked || r.level >= 3) return;
        if (!Pay(Eco.UpgradeCost(i, r.level + 1))) return;
        r.ApplyLevel(r.level + 1, true);
        Save();
    }

    public void OpenCafe()
    {
        if (cafe.Open || !Pay(Eco.CafeCost)) return;
        cafe.SetOpen(true, true);
        Save();
    }

    public void OpenPool()
    {
        if (pool.Open || !Pay(Eco.PoolCost)) return;
        pool.SetOpen(true, true);
        Save();
    }

    public void OpenFloor2()
    {
        if (floor2Open || !Pay(Eco.Floor2Cost)) return;
        SetFloor2(true, true);
        Save();
    }

    public void BuyDecor(int slot, int opt)
    {
        var d = Decor.Slots[slot];
        if (opt == d.sel) return;
        if (!d.Owns(opt))
        {
            if (!Pay(d.costs[opt])) return;
            d.owned |= 1 << opt;
            Sfx.Play("unlock");
            Notify(d.opts[opt] + " eklendi! Misafirler memnun.");
            if (player) U.Burst(player.transform.position + Vector3.up * 2f, new Color(1f, 0.85f, 0.3f), new Color(1f, 0.6f, 0.8f), 40, 5f);
        }
        d.sel = opt;
        Decor.Apply();
        Save();
    }

    public void OpenWing()
    {
        if (wingOpen || !Pay(Eco.WingCost)) return;
        SetWing(true, true);
        Save();
    }

    public void HireBarista()
    {
        if (!cafe.Open || cafe.HasBarista || !Pay(Eco.BaristaCost)) return;
        cafe.HireBarista(RandomName(), true);
        Sfx.Play("unlock");
        Save();
    }

    public void SetManager(int variant, string name)
    {
        managerVariant = (variant % Variants.Length + Variants.Length) % Variants.Length;
        managerName = string.IsNullOrWhiteSpace(name) ? "Müdür" : name.Trim();
        if (player) player.SetLook(Variants[managerVariant], managerName);
    }

    public void SetMusic(bool on)
    {
        music = on;
        Music.Set(on);
    }

    public void HireReceptionist()
    {
        if (reception.HasStaff || !Pay(Eco.ReceptionistCost)) return;
        reception.HireReceptionist(RandomName(), true);
        Sfx.Play("unlock");
        Save();
    }

    public bool CanHireCleaner => cleaners.Count < Eco.CleanerCost.Length;

    public void HireCleaner()
    {
        if (!CanHireCleaner || !Pay(Eco.CleanerCost[cleaners.Count])) return;
        string n = RandomName();
        SpawnCleaner(cleaners.Count, n);
        Notify(n + " temizlik ekibine katıldı!");
        Sfx.Play("unlock");
        Save();
    }

    public void BuyUpgrade(Eco.Up u)
    {
        var d = Eco.Def(u);
        int lv = ups[(int)u];
        if (lv >= d.max || !Pay(Eco.UpCost(u, lv))) return;
        ups[(int)u] = lv + 1;
        Sfx.Play("unlock");
        Notify(d.name + " · Seviye " + (lv + 1));
        Save();
    }

    public void SetHotelName(string n)
    {
        n = string.IsNullOrWhiteSpace(n) ? "Otel" : n.Trim();
        if (n.Length > 22) n = n.Substring(0, 22);
        hotelName = n;
        if (signText)
        {
            signText.text = Eco.Upper(n);
            signText.characterSize = Mathf.Min(0.12f, 0.12f * 10f / Mathf.Max(1, n.Length));
        }
    }

    public void SetSound(bool on)
    {
        sound = on;
        AudioListener.volume = on ? 1f : 0f;
    }

    string RandomName()
    {
        var used = new HashSet<string>();
        used.Add(reception.staffName);
        used.Add(cafe.baristaName);
        foreach (var c in cleaners) used.Add(c.staffName);
        for (int k = 0; k < 30; k++)
        {
            var n = Eco.Names[Random.Range(0, Eco.Names.Length)];
            if (!used.Contains(n)) return n;
        }
        return Eco.Names[Random.Range(0, Eco.Names.Length)];
    }

    void SpawnCleaner(int idx, string name)
    {
        var c = new GameObject("Temizlikci").AddComponent<Cleaner>();
        c.Init(new Vector3(13.6f, 0, 0.6f + idx * 1.1f), idx, name);
        cleaners.Add(c);
    }

    // ================= KAYIT =================
    bool loaded;

    public void Save()
    {
        if (!loaded) return; // yukleme tamamlanmadan kayit yapma (ilerleme korunur)
        Store.SetInt(K + "money", money);
        Store.SetInt(K + "served", served);
        for (int i = 0; i < rooms.Count; i++) Store.SetInt(K + "room" + i, rooms[i].level);
        for (int i = 0; i < ups.Length; i++) Store.SetInt(K + "up" + i, ups[i]);
        Store.SetString(K + "recep", reception.HasStaff ? reception.staffName : "");
        Store.SetInt(K + "cleaners", cleaners.Count);
        for (int i = 0; i < cleaners.Count; i++) Store.SetString(K + "cleaner" + i, cleaners[i].staffName);
        Store.SetString(K + "hotel", hotelName);
        Store.SetInt(K + "sound", sound ? 1 : 0);
        Store.SetInt(K + "music", music ? 1 : 0);
        Store.SetInt(K + "cafe", cafe.Open ? 1 : 0);
        Store.SetString(K + "barista", cafe.HasBarista ? cafe.baristaName : "");
        Store.SetInt(K + "pool", pool.Open ? 1 : 0);
        Store.SetInt(K + "wing", wingOpen ? 1 : 0);
        Store.SetInt(K + "floor2", floor2Open ? 1 : 0);
        Decor.Save(K);
        Store.SetInt(K + "day", dayNight.day);
        Store.SetFloat(K + "time", dayNight.time);
        Store.SetString(K + "ratings", string.Join(";", ratings.ConvertAll(v => v.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture))));
        Store.SetString(K + "manager", managerName);
        Store.SetInt(K + "managerLook", managerVariant);
        Quests.Save(K);
        // yeni sistemler
        Store.SetInt(K + "coop", coop ? 1 : 0);
        Store.SetString(K + "p2name", p2Name);
        Store.SetInt(K + "p2look", p2Variant);
        Store.SetInt(K + "restroom", restRoom ? 1 : 0);
        Store.SetInt(K + "cat", catAdopted ? 1 : 0);
        int carried = 0;
        foreach (var pl in players) if (pl) carried += pl.linen;
        foreach (var c in cleaners) carried += c.linen;
        foreach (var r in rooms) if (r.hasLinen) carried++;
        laundry.Save(K, carried);
        if (reception.HasStaff) reception.stats.Save(K + "st_rec");
        if (cafe.HasBarista) cafe.stats.Save(K + "st_bar");
        for (int i = 0; i < cleaners.Count; i++) cleaners[i].stats.Save(K + "st_cl" + i);
        for (int i = 0; i < rooms.Count; i++)
        {
            Store.SetInt(K + "theme" + i, rooms[i].theme);
            Store.SetInt(K + "themeOwn" + i, rooms[i].themeOwned);
        }
        for (int i = 0; i < rooms.Count; i++)
        {
            Store.SetInt(K + "kind" + i, rooms[i].kind);
            Store.SetInt(K + "suite" + i, rooms[i].IsSuite ? 1 : 0);
        }
        Pricing.Save(K);
        Reservations.Save(K);
        Story.Save();
        Report.Save(K);
        Social.Save(K);
        Regulars.Save(K);
        StarExam.Save(K);
        Store.SetInt(K + "weather", (int)Events.weather);
        Store.SetString(K + "seen", System.DateTime.UtcNow.Ticks.ToString());
        Store.SetInt(K + "saved", 1);
        Store.Save();
    }

    void Load()
    {
        bool has = Store.GetInt(K + "saved", 0) == 1;
        money = has ? Store.GetInt(K + "money", Eco.StartMoney) : Eco.StartMoney;
        served = Store.GetInt(K + "served", 0);
        for (int i = 0; i < ups.Length; i++) ups[i] = Store.GetInt(K + "up" + i, 0);
        for (int i = 0; i < rooms.Count; i++)
            rooms[i].ApplyLevel(has ? Store.GetInt(K + "room" + i, i == 0 ? 1 : 0) : (i == 0 ? 1 : 0), false);
        string rn = Store.GetString(K + "recep", "");
        if (!string.IsNullOrEmpty(rn)) reception.HireReceptionist(rn, false);
        int cc = Store.GetInt(K + "cleaners", 0);
        for (int i = 0; i < cc; i++) SpawnCleaner(i, Store.GetString(K + "cleaner" + i, Eco.Names[i]));
        SetHotelName(Store.GetString(K + "hotel", hotelName));
        SetSound(Store.GetInt(K + "sound", 1) == 1);
        music = Store.GetInt(K + "music", 1) == 1;
        SetWing(Store.GetInt(K + "wing", 0) == 1, false);
        SetFloor2(Store.GetInt(K + "floor2", 0) == 1, false);
        Decor.Load(K);
        cafe.SetOpen(Store.GetInt(K + "cafe", 0) == 1, false);
        string bn = Store.GetString(K + "barista", "");
        if (cafe.Open && !string.IsNullOrEmpty(bn)) cafe.HireBarista(bn, false);
        pool.SetOpen(Store.GetInt(K + "pool", 0) == 1, false);
        dayNight.day = Store.GetInt(K + "day", 1);
        dayNight.time = Store.GetFloat(K + "time", 0.3f);
        string rs = Store.GetString(K + "ratings", "");
        if (!string.IsNullOrEmpty(rs))
        {
            ratings.Clear();
            foreach (var v in rs.Split(';'))
                if (float.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float f)) ratings.Add(f);
            if (ratings.Count == 0) ratings.Add(3f);
        }
        float sum = 0f;
        foreach (var v in ratings) sum += v;
        Stars = Mathf.Clamp(sum / ratings.Count, 1f, 5f);
        UpdateStarDecor(false);
        SetManager(Store.GetInt(K + "managerLook", 9), Store.GetString(K + "manager", "Müdür"));
        Quests.Load(K);
        if (Quests.daily.Count == 0) Quests.NewDay();

        // yeni sistemler
        if (reception.HasStaff) reception.stats.Load(K + "st_rec");
        if (cafe.HasBarista) cafe.stats.Load(K + "st_bar");
        for (int i = 0; i < cleaners.Count; i++) cleaners[i].stats.Load(K + "st_cl" + i);
        restRoom = Store.GetInt(K + "restroom", 0) == 1;
        for (int i = 0; i < rooms.Count; i++)
        {
            rooms[i].themeOwned = Store.GetInt(K + "themeOwn" + i, 1) | 1;
            rooms[i].SetTheme(Store.GetInt(K + "theme" + i, 0), false);
        }
        for (int i = 0; i < rooms.Count; i++) rooms[i].SetKind(Store.GetInt(K + "kind" + i, 0), false);
        for (int i = 0; i + 1 < rooms.Count; i++)
            if (Store.GetInt(K + "suite" + i, 0) == 1 && rooms[i].level >= 3 && rooms[i + 1].level >= 3 && !rooms[i].IsSuitePart)
            {
                rooms[i].MakeSuite(rooms[i + 1], false);
                if (dividers[i]) dividers[i].SetActive(false);
            }
        int unlockedN = 0;
        foreach (var r in rooms) if (r.Unlocked) unlockedN++;
        laundry.Load(K, unlockedN);
        Report.Load(K);
        Social.Load(K);
        Regulars.Load(K);
        StarExam.Load(K, Stars);
        Pricing.Load(K);
        Reservations.Load(K, dayNight.day);
        if (!Reservations.Scheduled) Reservations.ScheduleFrom(dayNight.day, dayNight.time);
        if (has && Store.HasKey(K + "weather")) Events.Restore(Store.GetInt(K + "weather", 0));
        else Events.NewDay(dayNight.day);
        p2Name = Store.GetString(K + "p2name", "Oyuncu 2");
        p2Variant = Store.GetInt(K + "p2look", 1);
        SetCoop(Store.GetInt(K + "coop", 0) == 1);
        if (Store.GetInt(K + "cat", 0) == 1) { catAdopted = true; cat = Cat.Make("Pamuk"); }

        loaded = true;
        Seasons.Apply();
        string sp = Seasons.SpecialTitle;
        if (sp != null) Celebrate("Özel gün!", sp);

        if (has && Store.GetInt(K + "news5", 0) == 0) ShowNews();
        Store.SetInt(K + "news5", 1);
        if (has && Store.GetInt(K + "news6", 0) == 0) ShowNews6();
        else if (!has && !Story.started && Chain.cur == 0) OfferStory();
        Store.SetInt(K + "news6", 1);
        string seen = Store.GetString(K + "seen", "");
        if (has && long.TryParse(seen, out long ticks))
        {
            double mins = (System.DateTime.UtcNow - new System.DateTime(ticks, System.DateTimeKind.Utc)).TotalMinutes;
            if (mins >= 3) OfferOffline(mins);
        }
    }

    void ShowNews()
    {
        Popups.Show("Otelde yenilikler var!",
            "• Çamaşırhane: Odayı temizlemek için temiz çarşaf gerekir. Lobinin batısındaki raftan al.\n" +
            "• Personel artık yorulur, molaya çıkar, seviye atlar. Morali düşerse ikramiye ver.\n" +
            "• Her sabah gün sonu raporu: gelir, maaşlar, elektrik, bakım.\n" +
            "• Hava durumu ve gün içinde karar vermen gereken olaylar.\n" +
            "• Müdavim misafirler ve hikayeleri, gizli müfettişli yıldız sınavı (Görevler sekmesi).\n" +
            "• Otelgram: misafirlerin paylaşımları. Takipçi arttıkça misafir artar.\n" +
            "• Oda temaları (Otel sekmesi) ve iki kişilik oyun (Ayarlar).\n" +
            "• Sen yokken de otel çalışır (resepsiyonist varsa).", "YENİ SÜRÜM")
            .Add("Hadi başlayalım!", null, Popups.Gold);
    }

    void ShowNews6()
    {
        var p = Popups.Show("Büyük güncelleme!",
            "• Yağmur ve kar artık sadece dışarıya yağar. Yağmurda dışarısı ıslanır, birikintiler oluşur, misafirler şemsiye açar, lambalar erken yanar.\n" +
            "• Bazı misafirler resepsiyonda oda yükseltme ister: farkı ödesin, hediye et ya da reddet.\n" +
            "• Telefonla rezervasyon: kabul edersen kapora hemen gelir, misafir saatinde gelir.\n" +
            "• Fiyat politikası: Ucuz, Normal, Pahalı, Lüks (Menü > Otel).\n" +
            "• Oda tipleri: Ekonomik, Aile, Balayı, İş. İki Kral Dairesini birleştirip Başkanlık Süiti yap.\n" +
            "• Otel zinciri: Bodrum ve Kapadokya (Menü > Hikâye).\n" +
            "• Hikâye modu: Elif'in Oteli.", "YENİ SÜRÜM");
        if (!Story.started) p.Add("Hikâyeyi başlat", () => Story.Begin(), Popups.Gold).Add("Sonra", null, Popups.Grey);
        else p.Add("Harika!", null, Popups.Gold);
    }

    void OfferStory()
    {
        Popups.Show("Elif'in Oteli", "Hikâye modunu başlatmak ister misin? Anneannenin otelini yeniden canlandır, rakibin Kaan Bey'e karşı yarış, Bodrum ve Kapadokya'da yeni oteller aç.", "HİKÂYE MODU")
            .Add("Hikâyeyi başlat", () => Story.Begin(), Popups.Gold)
            .Add("Sonra (Menü > Hikâye)", null, Popups.Grey);
    }

    void OfferOffline(double mins)
    {
        if (!reception.HasStaff)
        {
            if (mins >= 15)
                Popups.Show("Tekrar hoş geldin!", "Sen yokken otel kapalıydı. Bir resepsiyonist işe alırsan sen yokken de misafir kabul edilir ve para kazanırsın.", "SEN YOKKEN")
                    .Add("Anladım", null, Popups.Grey);
            return;
        }
        double capped = System.Math.Min(mins, 120.0);
        float perMin = 0f;
        int n = 0;
        foreach (var r in rooms) if (r.Unlocked) { perMin += (r.Price + r.Tip) * 2f * 0.015f; n++; }
        if (cleaners.Count == 0) perMin *= 0.5f;
        int earned = Mathf.RoundToInt((float)(perMin * capped));
        if (earned < 10) return;
        int guests = Mathf.Max(1, Mathf.RoundToInt((float)capped * n * 0.06f));
        int h = (int)(mins / 60), m = (int)(mins % 60);
        string away = (h > 0 ? h + " saat " : "") + m + " dakika";
        Popups.Show("Sen yokken otel çalıştı!", away + " boyunca " + reception.staffName + " resepsiyonda misafirleri karşıladı.\n\nYaklaşık " + guests + " misafir ağırlandı." +
                (mins > 120 ? "\n(Kasa en fazla 2 saatlik kazancı tutabiliyor.)" : ""), "SEN YOKKEN")
            .Add("Topla  " + Eco.TL(earned), () => { money += earned; Report.Bonus(earned); Sfx.Play("coin"); }, Popups.Green);
    }

    void OnApplicationQuit() => Save();

    public void ResetGame()
    {
        foreach (var k in new[] { "money", "served", "recep", "cleaners", "saved", "cafe", "barista", "pool", "wing", "day", "time", "ratings", "story", "daily", "floor2",
                 "coop", "restroom", "cat", "lin_clean", "lin_dirty", "rep_today", "rep_hist", "soc_f", "soc_p", "official", "exam_cd", "weather", "seen", "news5",
                 "st_rec_xp", "st_rec_mor", "st_rec_en", "st_bar_xp", "st_bar_mor", "st_bar_en",
                 "price_pol", "res_list", "res_calls", "news6" }) Store.DeleteKey(K + k);
        foreach (var d in Regulars.All) Store.DeleteKey(K + "reg_" + d.id);
        for (int i = 0; i < 20; i++)
        {
            Store.DeleteKey(K + "theme" + i);
            Store.DeleteKey(K + "themeOwn" + i);
            Store.DeleteKey(K + "kind" + i);
            Store.DeleteKey(K + "suite" + i);
            Store.DeleteKey(K + "up" + i);
            foreach (var x in new[] { "_xp", "_mor", "_en" }) Store.DeleteKey(K + "st_cl" + i + x);
        }
        foreach (var d in Decor.Slots) { Store.DeleteKey(K + "dec_sel_" + d.key); Store.DeleteKey(K + "dec_own_" + d.key); }
        for (int i = 10; i < 20; i++) Store.DeleteKey(K + "room" + i);
        foreach (var k in Quests.Keys) { Store.DeleteKey(K + "tot_" + k); Store.DeleteKey(K + "day_" + k); }
        for (int i = 0; i < 10; i++)
        {
            Store.DeleteKey(K + "room" + i);
            Store.DeleteKey(K + "cleaner" + i);
            Store.DeleteKey(K + "up" + i);
        }
        Store.Save();
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }

    // ================= DONGU =================
    void Update()
    {
        shownMoney = Mathf.Lerp(shownMoney, money, Time.deltaTime * 10f);
        if (Mathf.Abs(shownMoney - money) < 0.5f) shownMoney = money;

        Time.timeScale = Popups.Open ? 0f : 1f;
        float dt = Time.deltaTime;
        Events.Tick(dt);
        Regulars.Tick();
        StarExam.Tick(dt);
        Reservations.Tick();
        storyT -= Time.unscaledDeltaTime;
        if (storyT <= 0f) { storyT = 1f; Story.Tick(); }
        if (priceBuffT > 0f) priceBuffT -= dt;

        if (pendingSpawns.Count > 0 && (reception.Count < reception.Capacity || pendingSpawns[0].reservation != null) && !Popups.Open)
        {
            var cfg = pendingSpawns[0];
            pendingSpawns.RemoveAt(0);
            SpawnCustomer(cfg);
            spawnTimer = Mathf.Max(spawnTimer, 1.2f);
        }

        spawnTimer -= Time.deltaTime;
        if (spawnTimer <= 0f)
        {
            spawnTimer = Random.Range(5f, 8f) / Mathf.Pow(Unlocked(), 0.6f) / Eco.AdsMul;
            if (reception.Count < reception.Capacity && pendingSpawns.Count == 0) SpawnCustomer();
        }

        saveTimer -= Time.deltaTime;
        if (saveTimer <= 0f) { saveTimer = 4f; Save(); }

        if (bannerT > 0) bannerT -= Time.deltaTime;
        if (celebT > 0) celebT -= Time.unscaledDeltaTime;
        if (player) { Seasons.Follow(player.transform.position); Events.Follow(player.transform.position); }
        if (hintT > 0 && player.Moved) hintT -= Time.deltaTime * 3f;
    }

    void SpawnCustomer(Customer.Config cfg = null)
    {
        bool left = Random.value < 0.5f;
        Customer.next = cfg;
        var c = new GameObject("Musteri").AddComponent<Customer>();
        c.transform.position = new Vector3(left ? -26f : 26f, 0, -14f);
        customers.Add(c);
        reception.Enqueue(c);
    }

    // ================= YARDIMCILAR =================
    public void AddObstacle(float x0, float z0, float x1, float z1) => obstacles.Add(Rect.MinMaxRect(x0, z0, x1, z1));

    public bool Walkable(Vector3 p)
    {
        const float r = 0.3f;
        bool ok = p.x > -15f + r && p.x < 15f - r && p.z > -12f + r && p.z < 3.9f - r;
        if (!ok && wingOpen && p.x > 14.6f && p.x < 35.25f - r && p.z > -0.8f + r && p.z < 3.9f - r) ok = true;
        if (!ok && pool.InArea(p, r)) ok = true;
        if (!ok && floor2Open && p.x > -15f + r && p.x < 15f - r && p.z > Elevator.Floor2Z - 0.55f + r && p.z < Elevator.Floor2Z + 3.9f - r) ok = true;
        if (!ok)
        {
            foreach (var room in rooms)
            {
                if (!room.Unlocked) continue;
                float dx = Mathf.Abs(p.x - room.x);
                float pz = p.z - room.oz;
                if (dx < 0.6f && pz > 3.4f && pz < 4.6f) { ok = true; break; }
                if (dx < 2.5f - 0.15f - r && pz > 4.1f + r && pz < 10.5f - r) { ok = true; break; }
            }
        }
        if (!ok) return false;
        foreach (var o in obstacles)
            if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return false;
        if (cafe.Blocked(p, r) || pool.Blocked(p, r) || Decor.Blocked(p, r)) return false;
        foreach (var room in rooms)
            if (p.z > room.Z(4f) && p.z < room.Z(11f) && Mathf.Abs(p.x - room.x) < 2.6f && room.Blocked(p, r)) return false;
        return true;
    }

    // Kapiya yakinsa oyuncuyu kapinin ortasina dogru kaydirir
    public bool DoorAssist(ref Vector3 p, Vector3 move, float step)
    {
        if (Mathf.Abs(move.z) < 0.3f) return false;
        foreach (var room in rooms)
        {
            if (!room.Unlocked) continue;
            float pz = p.z - room.oz;
            if (pz < 2.6f || pz > 5.4f) continue;
            float dx = room.x - p.x;
            if (Mathf.Abs(dx) > 1.4f || Mathf.Abs(dx) < 0.02f) continue;
            Vector3 n = p + new Vector3(Mathf.Sign(dx) * Mathf.Min(Mathf.Abs(dx), step), 0, 0);
            if (Walkable(n)) { p = n; return true; }
        }
        return false;
    }

    public Room FreeRoom(bool lux = false, Customer.G type = Customer.G.Normal) => FreeRoom(lux ? 2 : 1, type, lux, 3);

    public Room FreeRoomFor(Customer c) => FreeRoom(c.MinLevel, c.type, c.Lux, c.budget);

    // En uygun bos oda: seviye, tema ve oda tipi uyumuna gore puanlanir
    public Room FreeRoom(int minLevel, Customer.G type, bool lux, int budget)
    {
        Room best = null;
        int bestScore = int.MinValue;
        foreach (var r in rooms)
        {
            if (r.state != Room.State.Clean || r.IsSuitePart || r.level < minLevel) continue;
            if (r.IsSuite && !lux) continue;                    // suit sadece VIP ve unlulere
            if (r.kind == RoomKinds.Ekonomik && lux) continue;  // VIP ekonomik odada kalmaz
            bool km = RoomKinds.Match(r.kind, type);
            // butceye en yakin seviye; esitlikte daha iyi oda
            int score = -4 * Mathf.Abs(r.level - budget) + r.level + (Themes.Match(r.theme, type) ? 5 : 0) + (km ? 8 : 0) + (r.IsSuite ? 20 : 0);
            if (r.kind != RoomKinds.Klasik && !r.IsSuite && !km) score -= 4; // ozel odalari sevenlerine sakla
            if (score > bestScore) { bestScore = score; best = r; }
        }
        return best;
    }

    public Room FindRequestRoom()
    {
        foreach (var r in rooms) if (r.HasRequest && !r.reqClaimed) return r;
        return null;
    }

    public Room FindDirtyRoom()
    {
        foreach (var r in rooms) if (r.state == Room.State.Dirty && !r.claimed) return r;
        return null;
    }

    public int Unlocked()
    {
        int n = 0;
        foreach (var r in rooms) if (r.Unlocked) n++;
        return Mathf.Max(1, n);
    }

    public void AddMoney(int a, Vector3 at)
    {
        money += a;
        Quests.Track("earned", a);
        Report.Income(a);
        FloatText(at + Vector3.up * 1.6f, "+" + Eco.TL(a), new Color(0.55f, 1f, 0.5f));
        Sfx.Play("coin");
        if (a >= 150 && player) U.Burst(player.transform.position + Vector3.up * 2f, new Color(1f, 0.85f, 0.3f), new Color(0.5f, 1f, 0.5f), 40, 5f);
    }

    public void Notify(string s)
    {
        banner = s;
        bannerT = 2.6f;
    }

    public void FloatText(Vector3 pos, string s, Color c, float size = 0.1f)
    {
        var t = U.Text(null, pos, s, size, c, true);
        StartCoroutine(FloatCo(t));
    }

    IEnumerator FloatCo(TextMesh t)
    {
        float a = 0;
        Vector3 p0 = t.transform.position;
        Color c = t.color;
        while (a < 1f && t)
        {
            a += Time.deltaTime / 1.3f;
            float k = a < 0.15f ? Mathf.Lerp(0.5f, 1.2f, a / 0.15f) : Mathf.Lerp(1.2f, 1f, (a - 0.15f) * 4f);
            t.transform.localScale = Vector3.one * k;
            t.transform.position = p0 + Vector3.up * a * 1.3f;
            c.a = 1f - a * a;
            t.color = c;
            yield return null;
        }
        if (t) Destroy(t.gameObject);
    }

    public void Pop(Transform t) => StartCoroutine(PopCo(t));

    IEnumerator PopCo(Transform t)
    {
        Vector3 s = t.localScale;
        float a = 0;
        while (a < 1f && t)
        {
            a += Time.deltaTime / 0.3f;
            float k = a < 0.7f ? Mathf.Lerp(0f, 1.15f, a / 0.7f) : Mathf.Lerp(1.15f, 1f, (a - 0.7f) / 0.3f);
            t.localScale = s * k;
            yield return null;
        }
        if (t) t.localScale = s;
    }

    public void Fly(Transform b, Transform target, float delay) => StartCoroutine(FlyCo(b, target, Vector3.zero, delay));

    public void FlyBill(Vector3 from, Vector3 to)
    {
        var b = MoneyPile.MakeBill(null, from).transform;
        StartCoroutine(FlyCo(b, null, to, 0));
    }

    IEnumerator FlyCo(Transform b, Transform target, Vector3 to, float delay)
    {
        if (delay > 0) yield return new WaitForSeconds(delay);
        if (!b) yield break;
        b.SetParent(null, true);
        Vector3 p0 = b.position;
        float a = 0;
        float dur = target ? Mathf.Clamp(Vector3.Distance(p0, target.position) * 0.05f, 0.35f, 0.8f) : 0.35f;
        while (a < 1f && b)
        {
            a += Time.deltaTime / dur;
            Vector3 end = target ? target.position + Vector3.up * 1.1f : to;
            Vector3 p = Vector3.Lerp(p0, end, a);
            p.y += Mathf.Sin(Mathf.Min(a, 1f) * Mathf.PI) * 1.4f;
            b.position = p;
            b.Rotate(0, 720f * Time.deltaTime, 0);
            yield return null;
        }
        if (b) Destroy(b.gameObject);
    }

    // ================= EKRAN =================
    public float UIScale => Screen.height / 1080f;

    // Kameranin gezebilecegi alan (acilan alanlara gore genisler)
    public float CamMinX => pool != null && pool.Open ? -19f : -9f;
    public float CamMaxX => wingOpen ? 27f : 9f;

    // Ekran koordinati (y asagidan) bir arayuz ogesinin ustunde mi?
    public bool OverUI(Vector2 p)
    {
        Vector2 g = new Vector2(p.x, Screen.height - p.y);
        if (Social.Button(UIScale).Contains(g) || Social.open || Popups.Open) return true;
        return menuBtn.Contains(g) || questBtn.Contains(g) || MenuOpen || celebT > 0f;
    }

    public static string StarText(float st)
    {
        int full = Mathf.FloorToInt(st + 0.25f);
        return new string('★', Mathf.Clamp(full, 0, 5)) + new string('☆', Mathf.Clamp(5 - full, 0, 5));
    }

    void Styles()
    {
        if (panelStyle != null) return;
        panelStyle = new GUIStyle { normal = { background = U.RoundTex }, border = new RectOffset(22, 22, 22, 22) };
        panelSmall = new GUIStyle { normal = { background = U.RoundSmallTex }, border = new RectOffset(10, 10, 10, 10) };
        bigStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleLeft, fontStyle = FontStyle.Bold };
        smallStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
        titleStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleLeft, fontStyle = FontStyle.Bold };
        bannerStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
        btnStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
    }

    public void Panel(Rect r, Color c)
    {
        Styles();
        GUI.color = U.UI(c);
        GUI.Box(r, GUIContent.none, Mathf.Min(r.width, r.height) < 50f ? panelSmall : panelStyle);
        GUI.color = Color.white;
    }

    void OnGUI()
    {
        GUI.depth = 10;
        Styles();
        float s = UIScale;

        // Para paneli
        var r = new Rect(Screen.width / 2f - 170 * s, 22 * s, 340 * s, 84 * s);
        Panel(r, new Color(0.1f, 0.12f, 0.2f, 0.72f));
        var coin = new Rect(r.x + 16 * s, r.y + 14 * s, 56 * s, 56 * s);
        GUI.color = U.UI(new Color(0.85f, 0.6f, 0.1f));
        GUI.DrawTexture(coin, U.CircleTex);
        GUI.color = U.UI(new Color(1f, 0.82f, 0.25f));
        GUI.DrawTexture(new Rect(coin.x + 5 * s, coin.y + 5 * s, coin.width - 10 * s, coin.height - 10 * s), U.CircleTex);
        GUI.color = Color.white;
        smallStyle.fontSize = Mathf.RoundToInt(34 * s);
        smallStyle.normal.textColor = new Color(0.72f, 0.48f, 0.05f);
        GUI.Label(coin, "₺", smallStyle);
        bigStyle.fontSize = Mathf.RoundToInt(48 * s);
        bigStyle.normal.textColor = Color.white;
        GUI.Label(new Rect(r.x + 88 * s, r.y, r.width - 96 * s, r.height), Eco.TL(Mathf.RoundToInt(shownMoney)).Substring(1), bigStyle);

        // Sol ust: otel adi, yildiz, saat ve bilgi
        var info = new Rect(20 * s, 22 * s, 500 * s, 162 * s);
        Panel(info, new Color(0.1f, 0.12f, 0.2f, 0.62f));
        titleStyle.fontSize = Mathf.RoundToInt(28 * s);
        titleStyle.normal.textColor = new Color(1f, 0.86f, 0.42f);
        GUI.Label(new Rect(info.x + 20 * s, info.y + 6 * s, info.width - 30 * s, 40 * s), hotelName, titleStyle);
        titleStyle.fontSize = Mathf.RoundToInt(24 * s);
        GUI.Label(new Rect(info.x + 20 * s, info.y + 44 * s, 260 * s, 36 * s), StarText(Stars) + "  " + Stars.ToString("0.0", System.Globalization.CultureInfo.GetCultureInfo("tr-TR")), titleStyle);
        titleStyle.normal.textColor = dayNight.IsNight ? new Color(0.7f, 0.8f, 1f) : Color.white;
        GUI.Label(new Rect(info.x + 270 * s, info.y + 44 * s, 220 * s, 36 * s), (dayNight.IsNight ? "☾ " : "☀ ") + "Gün " + dayNight.day + " · " + dayNight.Clock, titleStyle);
        titleStyle.fontSize = Mathf.RoundToInt(20 * s);
        titleStyle.normal.textColor = Color.white;
        GUI.Label(new Rect(info.x + 20 * s, info.y + 84 * s, info.width - 30 * s, 34 * s),
            "Oda " + Unlocked() + "/" + rooms.Count + "   ·   Misafir " + served + "   ·   Bekleyen " + reception.Count, titleStyle);
        titleStyle.normal.textColor = Seasons.Festival ? new Color(1f, 0.7f, 0.9f) : new Color(0.75f, 0.95f, 0.8f);
        string seasonTxt = Seasons.Names[(int)Seasons.Current] + " · " + Events.WNames[(int)Events.weather] + "   ·   Belge " + StarExam.official + "★" + (Seasons.Festival ? "   ·   FESTİVAL" : "");
        GUI.Label(new Rect(info.x + 20 * s, info.y + 118 * s, info.width - 30 * s, 34 * s), seasonTxt, titleStyle);
        titleStyle.normal.textColor = Color.white;

        // Gorev karti
        var q = Quests.Current;
        questBtn = Rect.zero;
        if (q != null && !MenuOpen)
        {
            var qr = new Rect(20 * s, 196 * s, 500 * s, 104 * s);
            bool done = Quests.CurrentDone;
            Panel(qr, done ? new Color(0.25f, 0.55f, 0.3f, 0.9f) : new Color(0.1f, 0.12f, 0.2f, 0.62f));
            titleStyle.fontSize = Mathf.RoundToInt(18 * s);
            titleStyle.normal.textColor = new Color(1f, 0.86f, 0.42f);
            GUI.Label(new Rect(qr.x + 20 * s, qr.y + 6 * s, 300 * s, 28 * s), "GÖREV " + (Quests.storyIndex + 1) + "/" + Quests.Line.Length, titleStyle);
            titleStyle.fontSize = Mathf.RoundToInt(22 * s);
            titleStyle.normal.textColor = Color.white;
            GUI.Label(new Rect(qr.x + 20 * s, qr.y + 32 * s, 330 * s, 32 * s), q.text, titleStyle);
            float prog = Mathf.Clamp01((float)q.cur() / q.target);
            var bar = new Rect(qr.x + 20 * s, qr.y + 72 * s, 300 * s, 16 * s);
            Panel(bar, new Color(1, 1, 1, 0.15f));
            if (prog > 0.02f) Panel(new Rect(bar.x, bar.y, bar.width * prog, bar.height), new Color(0.45f, 0.9f, 0.5f, 1f));
            if (done)
            {
                questBtn = new Rect(qr.xMax - 160 * s, qr.y + 22 * s, 140 * s, 60 * s);
                Panel(questBtn, new Color(1f, 0.78f, 0.25f, 1f));
                btnStyle.fontSize = Mathf.RoundToInt(20 * s);
                btnStyle.normal.textColor = new Color(0.3f, 0.18f, 0.05f);
                if (GUI.Button(questBtn, "Ödülü al\n" + Eco.TL(q.reward), btnStyle)) Quests.ClaimStory();
            }
            else
            {
                smallStyle.fontSize = Mathf.RoundToInt(18 * s);
                smallStyle.normal.textColor = new Color(1f, 0.86f, 0.42f);
                GUI.Label(new Rect(qr.xMax - 160 * s, qr.y + 22 * s, 140 * s, 60 * s), "Ödül\n" + Eco.TL(q.reward), smallStyle);
            }
        }

        // Bugunun rezervasyonlari
        if (!MenuOpen && Reservations.Pending > 0)
        {
            int n = Mathf.Min(3, Reservations.Pending);
            var rr = new Rect(20 * s, (q != null ? 312 : 196) * s, 500 * s, (46 + n * 30) * s);
            Panel(rr, new Color(0.08f, 0.24f, 0.3f, 0.72f));
            titleStyle.fontSize = Mathf.RoundToInt(18 * s);
            titleStyle.normal.textColor = new Color(0.55f, 0.95f, 1f);
            GUI.Label(new Rect(rr.x + 20 * s, rr.y + 6 * s, rr.width - 30 * s, 30 * s), "BUGÜNÜN REZERVASYONLARI", titleStyle);
            titleStyle.fontSize = Mathf.RoundToInt(19 * s);
            titleStyle.normal.textColor = Color.white;
            int k = 0;
            foreach (var res in Reservations.list)
            {
                if (res.state > 1 || k >= n) continue;
                GUI.Label(new Rect(rr.x + 20 * s, rr.y + (38 + k * 30) * s, rr.width - 30 * s, 30 * s),
                    Reservations.Clock(res.time) + "  ·  " + res.name + "  ·  " + Eco.LevelNames[res.level] + (res.state == 1 ? "  (geldi)" : ""), titleStyle);
                k++;
            }
        }

        // Menu dugmesi (hazir odul varsa rozet)
        menuBtn = new Rect(Screen.width - 210 * s, 22 * s, 190 * s, 72 * s);
        Panel(menuBtn, new Color(1f, 0.72f, 0.2f, 0.95f));
        btnStyle.fontSize = Mathf.RoundToInt(30 * s);
        btnStyle.normal.textColor = new Color(0.3f, 0.18f, 0.05f);
        if (GUI.Button(menuBtn, "☰  MENÜ", btnStyle)) { menu.Toggle(); Sfx.Play("pop", 0.6f); }
        Social.DrawButton(this, s, btnStyle);
        Social.DrawFeed(this, s);
        string buff = Events.BuffText;
        if (!string.IsNullOrEmpty(buff) && !MenuOpen)
        {
            var bf = new Rect(Screen.width / 2f - 170 * s, 112 * s, 340 * s, 40 * s);
            Panel(bf, new Color(0.1f, 0.12f, 0.2f, 0.6f));
            smallStyle.fontSize = Mathf.RoundToInt(19 * s);
            smallStyle.normal.textColor = new Color(1f, 0.9f, 0.6f);
            GUI.Label(bf, buff, smallStyle);
        }
        int ready = Quests.ReadyCount() - (Quests.CurrentDone ? 1 : 0) + (Story.Ready ? 1 : 0);
        if (ready > 0)
        {
            var badge = new Rect(menuBtn.x - 14 * s, menuBtn.y - 10 * s, 40 * s, 40 * s);
            GUI.color = U.UI(new Color(0.9f, 0.25f, 0.25f));
            GUI.DrawTexture(badge, U.CircleTex);
            GUI.color = Color.white;
            smallStyle.fontSize = Mathf.RoundToInt(22 * s);
            smallStyle.normal.textColor = Color.white;
            GUI.Label(badge, ready.ToString(), smallStyle);
        }

        // Kutlama penceresi
        if (celebT > 0f)
        {
            float a = Mathf.Clamp01(celebT / 0.5f);
            var cr = new Rect(Screen.width / 2f - 360 * s, Screen.height / 2f - 150 * s, 720 * s, 260 * s);
            Panel(cr, new Color(0.12f, 0.14f, 0.24f, 0.97f * a));
            Panel(new Rect(cr.x + 10 * s, cr.y + 10 * s, cr.width - 20 * s, 8 * s), new Color(1f, 0.78f, 0.25f, a));
            bannerStyle.fontSize = Mathf.RoundToInt(40 * s);
            bannerStyle.normal.textColor = new Color(1f, 0.86f, 0.42f, a);
            GUI.Label(new Rect(cr.x, cr.y + 30 * s, cr.width, 60 * s), "★ " + celebTitle + " ★", bannerStyle);
            bannerStyle.fontSize = Mathf.RoundToInt(24 * s);
            bannerStyle.normal.textColor = new Color(1f, 1f, 1f, a);
            bannerStyle.wordWrap = true;
            GUI.Label(new Rect(cr.x + 30 * s, cr.y + 95 * s, cr.width - 60 * s, 70 * s), celebSub, bannerStyle);
            bannerStyle.wordWrap = false;
            var ok = new Rect(cr.center.x - 120 * s, cr.yMax - 80 * s, 240 * s, 60 * s);
            Panel(ok, new Color(1f, 0.78f, 0.25f, a));
            btnStyle.fontSize = Mathf.RoundToInt(26 * s);
            btnStyle.normal.textColor = new Color(0.3f, 0.18f, 0.05f, a);
            if (GUI.Button(ok, "Harika!", btnStyle)) celebT = 0f;
        }

        // Duyuru
        if (bannerT > 0 && !string.IsNullOrEmpty(banner))
        {
            float a = Mathf.Clamp01(bannerT / 0.4f) * Mathf.Clamp01((2.6f - bannerT) / 0.15f);
            var br = new Rect(Screen.width / 2f - 330 * s, 160 * s, 660 * s, 76 * s);
            Panel(br, new Color(1f, 0.78f, 0.25f, 0.94f * a));
            bannerStyle.fontSize = Mathf.RoundToInt(34 * s);
            bannerStyle.normal.textColor = new Color(0.25f, 0.15f, 0.05f, a);
            GUI.Label(br, banner, bannerStyle);
        }

        // Ipucu
        if (hintT > 0 && !MenuOpen)
        {
            float a = Mathf.Clamp01(hintT);
            var hr = new Rect(Screen.width / 2f - 380 * s, Screen.height - 90 * s, 760 * s, 58 * s);
            Panel(hr, new Color(0.1f, 0.12f, 0.2f, 0.55f * a));
            smallStyle.fontSize = Mathf.RoundToInt(23 * s);
            smallStyle.normal.textColor = new Color(1, 1, 1, a);
            GUI.Label(hr, "Hareket: WASD / ok tuşları ya da ekranda sürükle  ·  Satın almalar MENÜ'de", smallStyle);
        }

        // Sanal joystick
        if (player != null && player.dragging && !MenuOpen)
        {
            float R = 90 * s;
            float max = Screen.height * 0.08f;
            Vector2 c = new Vector2(player.dragStart.x, Screen.height - player.dragStart.y);
            Vector2 d = player.dragNow - player.dragStart;
            if (d.magnitude > max) d = d.normalized * max;
            Vector2 k = c + new Vector2(d.x, -d.y) * (R / max);
            GUI.color = new Color(1, 1, 1, 0.25f);
            GUI.DrawTexture(new Rect(c.x - R, c.y - R, 2 * R, 2 * R), U.CircleTex);
            GUI.color = new Color(1, 1, 1, 0.8f);
            GUI.DrawTexture(new Rect(k.x - 40 * s, k.y - 40 * s, 80 * s, 80 * s), U.CircleTex);
            GUI.color = Color.white;
        }

        // Simsek
        if (Events.flash > 0f)
        {
            GUI.color = new Color(1, 1, 1, Mathf.Clamp01(Events.flash) * 0.6f);
            GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        // Asansor gecisi: kisa karartma
        if (elevator != null && elevator.Fade > 0f)
        {
            GUI.color = new Color(0, 0, 0, Mathf.Clamp01(elevator.Fade));
            GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }
    }
}
