using System;
using System.Collections.Generic;
using UnityEngine;

// Gunluk hava durumu, gun icinde rastgele olaylar (secimli) ve gecici etkiler
public static class Events
{
    public enum W { Gunesli, Bulutlu, Yagmurlu, Firtina, Sicak, Karli }
    public static readonly string[] WNames = { "Güneşli", "Bulutlu", "Yağmurlu", "Fırtınalı", "Sıcak dalgası", "Karlı" };
    public static W weather = W.Gunesli;

    // gecici etkiler
    static float spawnBuffT, spawnBuff = 1f, satBuffT, satBuff;
    public static float flash; // simsek (ekran beyazlamasi)

    static readonly List<float> times = new List<float>();
    static readonly List<bool> fired = new List<bool>();
    static ParticleSystem rain, splash;
    static float thunderT = 8f;

    // ---- Ic / dis ayrimi: yagis sadece acik havada ----
    public static bool Wet => weather == W.Yagmurlu || weather == W.Firtina;
    static float wetNow, gloomNow;
    public static float Gloom => gloomNow;     // 0 acik hava, 1 cok kasvetli
    public static float WetAmount => wetNow;   // zeminin islakligi (yavas yavas artar/azalir)
    static float GloomTarget => weather == W.Firtina ? 0.55f : weather == W.Yagmurlu ? 0.38f : weather == W.Bulutlu ? 0.16f : weather == W.Karli ? 0.22f : 0f;

    class WetMat { public Material m; public Color c; public float s, dark, shine; }
    static readonly List<WetMat> wetMats = new List<WetMat>();
    static readonly List<Transform> puddles = new List<Transform>();
    static readonly List<Vector3> puddleSize = new List<Vector3>();
    static float wetApplied = -1f;

    // Catili alanlar (x0, z0, x1, z1) ve sahibi (kapaliysa yok sayilir)
    public static readonly List<Rect> roofs = new List<Rect>();
    public static readonly List<GameObject> roofOwner = new List<GameObject>();
    static readonly List<ParticleSystem> hooked = new List<ParticleSystem>();

    // Bu alanin ustunde (kameradan bakinca) yagmur, kar ve yaprak gorunmez
    public static void Shelter(Transform parent, Vector3 center, Vector3 size)
    {
        roofs.Add(Rect.MinMaxRect(center.x - size.x / 2f, center.z - size.z / 2f, center.x + size.x / 2f, center.z + size.z / 2f));
        roofOwner.Add(parent ? parent.gameObject : null);
    }

    public static void Hook(ParticleSystem ps)
    {
        if (!ps || hooked.Contains(ps)) return;
        hooked.Add(ps);
        ps.gameObject.AddComponent<PrecipCull>();
    }

    // Kameradan parcaciga giden isin yere degdigi nokta bir catinin altindaysa true
    public static bool UnderRoof(Vector3 cam, Vector3 p)
    {
        float dy = cam.y - p.y;
        if (dy < 0.05f) return false;
        float t = cam.y / dy;
        float gx = cam.x + (p.x - cam.x) * t, gz = cam.z + (p.z - cam.z) * t;
        for (int i = 0; i < roofs.Count; i++)
        {
            var o = roofOwner[i];
            if (o != null && !o.activeInHierarchy) continue;
            var r = roofs[i];
            if (gx > r.xMin && gx < r.xMax && gz > r.yMin && gz < r.yMax) return true;
        }
        return false;
    }

    // Yagmurda koyulasip parlayan dis zeminler (kaldirim, asfalt, cim)
    public static void RegisterWet(Material m, float dark, float shine)
    {
        if (!m) return;
        var w = new WetMat { m = m, dark = dark, shine = shine };
        w.c = m.HasProperty("_BaseColor") ? m.GetColor("_BaseColor") : Color.white;
        w.s = m.HasProperty("_Smoothness") ? m.GetFloat("_Smoothness") : 0.2f;
        wetMats.Add(w);
        wetApplied = -1f;
    }

    // Mevsim cimin rengini degistirince islaklik bu rengin uzerine uygulanir
    public static void WetBase(Material m, Color c)
    {
        foreach (var w in wetMats) if (w.m == m) w.c = c;
        wetApplied = -1f;
    }

    public static void RegisterPuddle(Transform t)
    {
        puddles.Add(t);
        puddleSize.Add(t.localScale);
        t.gameObject.SetActive(false);
    }

    static void ApplyWet()
    {
        if (Mathf.Abs(wetNow - wetApplied) < 0.01f) return;
        wetApplied = wetNow;
        foreach (var w in wetMats)
        {
            if (!w.m) continue;
            if (w.m.HasProperty("_BaseColor")) w.m.SetColor("_BaseColor", w.c * Mathf.Lerp(1f, w.dark, wetNow));
            if (w.m.HasProperty("_Smoothness")) w.m.SetFloat("_Smoothness", Mathf.Lerp(w.s, w.shine, wetNow));
        }
        float k = Mathf.Clamp01((wetNow - 0.25f) / 0.75f);
        for (int i = 0; i < puddles.Count; i++)
        {
            if (!puddles[i]) continue;
            bool on = k > 0.02f;
            if (puddles[i].gameObject.activeSelf != on) puddles[i].gameObject.SetActive(on);
            var sz = puddleSize[i];
            puddles[i].localScale = new Vector3(sz.x * k, sz.y, sz.z * k);
        }
    }

    static Texture2D ringTex;
    static Texture2D RingTex
    {
        get
        {
            if (ringTex) return ringTex;
            const int n = 64;
            ringTex = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color[n * n];
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float dx = (x + 0.5f) / n * 2f - 1f, dy = (y + 0.5f) / n * 2f - 1f;
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    float a = Mathf.Clamp01(1f - Mathf.Abs(d - 0.72f) / 0.16f);
                    px[y * n + x] = new Color(1f, 1f, 1f, a * a);
                }
            ringTex.SetPixels(px);
            ringTex.Apply();
            return ringTex;
        }
    }

    static GameManager G => GameManager.I;

    // ---- Etkiler ----
    public static float SpawnMul
    {
        get
        {
            float m = weather == W.Yagmurlu ? 0.9f : weather == W.Firtina ? 0.65f : weather == W.Sicak ? 1.1f : 1f;
            if (spawnBuffT > 0f) m *= spawnBuff;
            return m;
        }
    }
    public static float PoolMul => weather == W.Yagmurlu ? 0.15f : weather == W.Firtina ? 0f : weather == W.Sicak ? 1.6f : weather == W.Karli ? 0.2f : weather == W.Bulutlu ? 0.8f : 1f;
    public static float CafeAdd => weather == W.Yagmurlu ? 0.25f : weather == W.Firtina ? 0.3f : weather == W.Karli ? 0.2f : weather == W.Sicak ? -0.15f : 0f;
    public static float SatBonus => satBuffT > 0f ? satBuff : 0f;
    public static string BuffText
    {
        get
        {
            string s = "";
            if (spawnBuffT > 0f) s += spawnBuff >= 1f ? "Misafir akını" : "Misafir azaldı";
            if (satBuffT > 0f) s += (s.Length > 0 ? " · " : "") + (satBuff >= 0f ? "Misafirler keyifli" : "Misafirler huysuz");
            return s;
        }
    }

    public static void SpawnBuff(float mul, float secs) { spawnBuff = mul; spawnBuffT = secs; }
    public static void SatBuff(float add, float secs) { satBuff = add; satBuffT = secs; }

    // ---- Gun basi ----
    public static void NewDay(int day)
    {
        var s = Seasons.Current;
        float r = UnityEngine.Random.value;
        if (Chain.cur == 1) // Bodrum: bol gunes, kar yok
        {
            if (s == Seasons.S.Kis) weather = r < 0.45f ? W.Gunesli : r < 0.75f ? W.Bulutlu : r < 0.93f ? W.Yagmurlu : W.Firtina;
            else weather = r < 0.6f ? W.Gunesli : r < 0.85f ? W.Sicak : r < 0.95f ? W.Bulutlu : W.Yagmurlu;
        }
        else if (Chain.cur == 2 && s == Seasons.S.Kis) weather = r < 0.55f ? W.Karli : r < 0.8f ? W.Gunesli : r < 0.95f ? W.Bulutlu : W.Firtina;
        else if (s == Seasons.S.Yaz) weather = r < 0.55f ? W.Gunesli : r < 0.8f ? W.Sicak : r < 0.92f ? W.Bulutlu : W.Firtina;
        else if (s == Seasons.S.Kis) weather = r < 0.35f ? W.Karli : r < 0.6f ? W.Bulutlu : r < 0.85f ? W.Gunesli : W.Firtina;
        else weather = r < 0.4f ? W.Gunesli : r < 0.65f ? W.Bulutlu : r < 0.9f ? W.Yagmurlu : W.Firtina;
        if (day <= 2) weather = W.Gunesli;

        times.Clear();
        fired.Clear();
        if (day >= 2)
        {
            int n = UnityEngine.Random.value < 0.35f ? 1 : 2;
            for (int i = 0; i < n; i++)
            {
                times.Add(UnityEngine.Random.Range(0.32f, 0.82f));
                fired.Add(false);
            }
        }
        ApplyVisual();
    }

    public static void Restore(int w)
    {
        weather = (W)Mathf.Clamp(w, 0, 5);
        wetNow = Wet ? 1f : 0f;
        gloomNow = GloomTarget;
        wetApplied = -1f;
        ApplyVisual();
    }

    public static void Reset()
    {
        rain = null;
        splash = null;
        roofs.Clear();
        roofOwner.Clear();
        hooked.Clear();
        wetMats.Clear();
        puddles.Clear();
        puddleSize.Clear();
        wetApplied = -1f;
        spawnBuffT = satBuffT = 0f;
        times.Clear();
        fired.Clear();
    }

    static void ApplyVisual()
    {
        bool wet = Wet;
        if (rain == null && Camera.main)
        {
            var g = new GameObject("Yagmur");
            rain = g.AddComponent<ParticleSystem>();
            rain.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = rain.main;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startLifetime = 1.1f;
            main.startSpeed = 0f;
            main.startSize3D = true;
            main.startSizeX = 0.03f;
            main.startSizeY = 0.5f;
            main.startSizeZ = 0.03f;
            main.maxParticles = 2600;
            main.startColor = new Color(0.75f, 0.85f, 1f, 0.55f);
            var sh = rain.shape;
            sh.shapeType = ParticleSystemShapeType.Box;
            sh.scale = new Vector3(56f, 1f, 44f);
            var vel = rain.velocityOverLifetime;
            vel.enabled = true;
            vel.space = ParticleSystemSimulationSpace.World;
            vel.x = new ParticleSystem.MinMaxCurve(-1f, -0.6f);
            vel.y = new ParticleSystem.MinMaxCurve(-13f, -11f);
            vel.z = new ParticleSystem.MinMaxCurve(0f, 0f);
            var pr = g.GetComponent<ParticleSystemRenderer>();
            pr.renderMode = ParticleSystemRenderMode.Stretch;
            pr.velocityScale = 0.04f;
            pr.lengthScale = 2f;
            var shd = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            pr.sharedMaterial = new Material(shd != null ? shd : Shader.Find("Sprites/Default"));
            Hook(rain);

            // Yere dusen damlalarin sicramasi (sadece acik havada)
            var sg = new GameObject("YagmurSicrama");
            splash = sg.AddComponent<ParticleSystem>();
            splash.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var sm = splash.main;
            sm.simulationSpace = ParticleSystemSimulationSpace.World;
            sm.startLifetime = 0.3f;
            sm.startSpeed = 0f;
            sm.startSize = new ParticleSystem.MinMaxCurve(0.18f, 0.36f);
            sm.startColor = new Color(0.88f, 0.94f, 1f, 0.75f);
            sm.maxParticles = 900;
            var ssh = splash.shape;
            ssh.shapeType = ParticleSystemShapeType.Box;
            ssh.scale = new Vector3(56f, 0.01f, 44f);
            var sol = splash.sizeOverLifetime;
            sol.enabled = true;
            sol.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, 0.35f, 1f, 1.25f));
            var col = splash.colorOverLifetime;
            col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                         new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0f, 1f) });
            col.color = grad;
            var spr = sg.GetComponent<ParticleSystemRenderer>();
            spr.renderMode = ParticleSystemRenderMode.HorizontalBillboard;
            var sp = Shader.Find("Sprites/Default");
            var smat = new Material(sp != null ? sp : shd);
            smat.mainTexture = RingTex;
            spr.sharedMaterial = smat;
            Hook(splash);
        }
        if (rain)
        {
            var em = rain.emission;
            em.rateOverTime = weather == W.Firtina ? 1500f : 850f;
            if (wet) rain.Play(); else rain.Stop();
        }
        if (splash)
        {
            var em = splash.emission;
            em.rateOverTime = weather == W.Firtina ? 900f : 520f;
            if (wet) splash.Play(); else splash.Stop();
        }
    }

    public static void Follow(Vector3 p)
    {
        if (rain) rain.transform.position = new Vector3(p.x, 11f, p.z + 2f);
        if (splash) splash.transform.position = new Vector3(p.x - 0.9f, 0.02f, p.z + 2f);
    }

    // ---- Her kare ----
    public static void Tick(float dt)
    {
        if (spawnBuffT > 0f) spawnBuffT -= dt;
        if (satBuffT > 0f) satBuffT -= dt;
        if (flash > 0f) flash -= Time.unscaledDeltaTime * 2.5f;
        wetNow = Mathf.MoveTowards(wetNow, Wet ? 1f : 0f, dt / (Wet ? 25f : 60f));
        gloomNow = Mathf.MoveTowards(gloomNow, GloomTarget, dt / 8f);
        ApplyWet();
        if (weather == W.Firtina)
        {
            thunderT -= dt;
            if (thunderT <= 0f)
            {
                thunderT = UnityEngine.Random.Range(9f, 20f);
                flash = 1f;
                Sfx.Play("bad", 0.25f);
            }
        }

        if (G == null || G.MenuOpen || Popups.Open) return;
        float t = G.dayNight.time;
        for (int i = 0; i < times.Count; i++)
            if (!fired[i] && t >= times[i] && t < 0.9f)
            {
                fired[i] = true;
                Fire();
                break;
            }
    }

    // ---- Olaylar ----
    class Ev
    {
        public Func<bool> can;
        public Action run;
        public float weight = 1f;
    }

    static int Cost(float perRoom) => Mathf.RoundToInt((60 + perRoom * G.Unlocked()) / 10f) * 10;

    static Room RandomRoom(bool cleanOnly = false)
    {
        var l = new List<Room>();
        foreach (var r in G.rooms) if (r.Unlocked && (!cleanOnly || r.state == Room.State.Clean)) l.Add(r);
        return l.Count > 0 ? l[UnityEngine.Random.Range(0, l.Count)] : null;
    }

    static readonly Ev[] All =
    {
        // 1. Su kacagi
        new Ev { can = () => G.Unlocked() >= 2, run = () =>
        {
            var r = RandomRoom(true);
            if (r == null) return;
            int c = Cost(25);
            Popups.Show("Su kaçağı!", "Oda " + r.Number + "'in banyosunda boru patladı. Koridora su sızıyor.", "OLAY")
                .Add("Tesisatçı çağır  " + Eco.TL(c), () => { G.Spend(c, "Tesisatçı"); G.Notify("Tesisatçı hemen halletti"); }, Popups.Green, G.CanPay(c))
                .Add("Kendimiz idare ederiz", () => { if (r.state == Room.State.Clean) r.SetDirty(); SatBuff(-0.4f, 60f); G.Notify("Oda " + r.Number + " kirlendi, misafirler biraz huysuz"); }, Popups.Gold);
        }},
        // 2. Kayip bavul
        new Ev { can = () => true, run = () =>
        {
            int c = Cost(12);
            Popups.Show("Kayıp bavul", "Bir misafirin bavulu havalimanında kaybolmuş, resepsiyonda çok üzgün bekliyor.", "OLAY")
                .Add("Ona yeni eşyalar al  " + Eco.TL(c), () => { G.Spend(c, "Kayıp bavul"); G.AddRating(5f); G.AddRating(5f); Social.Share("Bavulum kaybolunca otel bana her şeyi yeniden aldı. İnanılmaz misafirperverlik!", 0, false); }, Popups.Green, G.CanPay(c))
                .Add("Personel arasın", () => { G.StaffMoraleAll(-0.05f); G.AddRating(4f); G.Notify("Personel saatlerce aradı, bavul bulundu!"); }, Popups.Gold)
                .Add("Elimizden bir şey gelmez", () => { G.AddRating(1.5f); }, Popups.Grey);
        }},
        // 3. Turist otobusu
        new Ev { can = () => G.Unlocked() >= 3, weight = 1.2f, run = () =>
        {
            Popups.Show("Turist otobüsü!", "Kapıda 6 kişilik bir tur grubu var. Hepsi bu gece kalmak istiyor. Odaları hızlı hazırlaman gerekecek.", "OLAY")
                .Add("Hepsini kabul et", () => { for (int i = 0; i < 6; i++) G.QueueSpawn(new Customer.Config { type = Customer.G.Turist }); G.Notify("Tur grubu geliyor!"); }, Popups.Green)
                .Add("Kibarca geri çevir", null, Popups.Grey);
        }},
        // 4. Sikayetci misafir
        new Ev { can = () => G.served >= 10, run = () =>
        {
            int c = Cost(10);
            Popups.Show("Şikayetçi misafir", "\"Odam çok sıcaktı, klima da gürültülüydü!\" diye bağırıyor. Lobideki herkes sana bakıyor.", "OLAY")
                .Add("Ücretsiz kahvaltı ver  " + Eco.TL(c), () => { G.Spend(c, "İkram"); G.AddRating(4.5f); SatBuff(0.3f, 60f); }, Popups.Green, G.CanPay(c))
                .Add("Özür dile", () =>
                {
                    if (UnityEngine.Random.value < 0.55f) { G.AddRating(4f); G.Notify("Misafir sakinleşti"); }
                    else { G.AddRating(1.5f); Social.Share("Odamdaki klima berbattı, sadece özür dilediler. Tavsiye etmem.", 0, true); }
                }, Popups.Gold);
        }},
        // 5. Gazeteci
        new Ev { can = () => G.served >= 15, run = () =>
        {
            Popups.Show("Gazeteci geldi", "Bir seyahat dergisinden muhabir oteli gezmek istiyor. Otelin iyiyse harika bir haber çıkar, değilse...", "OLAY")
                .Add("Otel turu ver", () =>
                {
                    bool good = G.Stars >= 3.8f || Decor.Bonus >= 0.2f;
                    if (good) { SpawnBuff(1.6f, 120f); Social.Share("Dergimizin bu ayki gözdesi: " + G.hotelName + "! Tertemiz, sıcacık bir otel.", 2, false); G.Celebrate("Harika haber!", "Dergide övgü dolu bir yazı çıktı. 2 dakika boyunca çok daha fazla misafir gelecek."); }
                    else { SpawnBuff(0.8f, 90f); Social.Share(G.hotelName + " fena değil ama daha yolu var.", 0, true); G.Notify("Haber pek parlak olmadı"); }
                }, Popups.Green)
                .Add("Şu an müsait değiliz", null, Popups.Grey);
        }},
        // 6. Tedarikci indirimi
        new Ev { can = () => true, run = () =>
        {
            int c = Cost(15);
            Popups.Show("Tedarikçi kampanyası", "Tekstil firması 10 takım yeni çarşafı yarı fiyatına satıyor.", "OLAY")
                .Add("Satın al  " + Eco.TL(c), () => { G.Spend(c, "Çarşaf"); Laundry.I.AddClean(10); G.Notify("Rafa 10 temiz çarşaf eklendi"); }, Popups.Green, G.CanPay(c))
                .Add("Gerek yok", null, Popups.Grey);
        }},
        // 7. Unlu sanatci
        new Ev { can = () => { foreach (var r in G.rooms) if (r.level >= 3) return true; return false; }, weight = 0.8f, run = () =>
        {
            Popups.Show("Ünlü sanatçı!", "Ünlü bir şarkıcının menajeri aradı. Bu gece için Kral Dairesi istiyorlar. Çok iyi ödeyecekler ama beklemeyi hiç sevmezler.", "OLAY")
                .Add("Ağırlayalım!", () => { G.QueueSpawn(new Customer.Config { type = Customer.G.Normal, vip = true, celebrity = true }); G.Notify("Ünlü misafir yolda!"); }, Popups.Green)
                .Add("Riske girmeyelim", null, Popups.Grey);
        }},
        // 8. Elektrik kesintisi
        new Ev { can = () => weather == W.Firtina || UnityEngine.Random.value < 0.4f, run = () =>
        {
            int c = Cost(20);
            Popups.Show("Elektrik kesildi!", "Mahallede elektrik gitti. Asansör ve kafe makineleri durdu.", "OLAY")
                .Add("Jeneratör kirala  " + Eco.TL(c), () => { G.Spend(c, "Jeneratör"); G.Notify("Jeneratör çalışıyor, her şey yolunda"); }, Popups.Green, G.CanPay(c))
                .Add("Mumla idare edelim", () => { SatBuff(-0.5f, 90f); G.Notify("Mum ışığında romantik bir akşam... ama misafirler pek memnun değil"); }, Popups.Gold);
        }},
        // 9. Kedi
        new Ev { can = () => !G.catAdopted && G.dayNight.day >= 3, weight = 1.5f, run = () =>
        {
            Popups.Show("Kapıda bir kedi!", "Minik beyaz bir kedi lobiye girdi, resepsiyonun önünde miyavlıyor. Misafirler ona bayıldı.", "OLAY")
                .Add("Otelin kedisi olsun!", () => { G.AdoptCat(); }, Popups.Green)
                .Add("Barınağa götürelim", null, Popups.Grey);
        }},
        // 10. Dogum gunu
        new Ev { can = () => G.served >= 8, run = () =>
        {
            int c = Cost(8);
            Popups.Show("Doğum günü sürprizi", "Resepsiyondaki misafir bugün doğum günü olduğunu söyledi. Ona küçük bir pasta hazırlayalım mı?", "OLAY")
                .Add("Pasta hazırlat  " + Eco.TL(c), () => { G.Spend(c, "Pasta"); G.AddRating(5f); Social.Share("Doğum günümü otelde kutladılar, pastayı bile düşünmüşler! Ağladım resmen.", 1, false); }, Popups.Green, G.CanPay(c))
                .Add("Tebrik etmek yeter", () => { G.AddRating(3.8f); }, Popups.Gold);
        }},
        // 11. Cati akintisi (yagmurda)
        new Ev { can = () => weather == W.Yagmurlu || weather == W.Firtina, weight = 1.5f, run = () =>
        {
            int c = Cost(30);
            var r = RandomRoom();
            Popups.Show("Çatı akıtıyor", "Yağmur yüzünden Oda " + r.Number + "'in tavanından su damlıyor.", "OLAY")
                .Add("Ustayı çağır  " + Eco.TL(c), () => { G.Spend(c, "Çatı tamiri"); }, Popups.Green, G.CanPay(c))
                .Add("Kova koyalım", () => { SatBuff(-0.3f, 120f); }, Popups.Gold);
        }},
        // 12. Festival kalabaligi
        new Ev { can = () => Seasons.Festival || weather == W.Sicak, run = () =>
        {
            Popups.Show("Şehirde konser var!", "Akşam büyük bir konser var, şehir dolup taşıyor. Fiyatları biraz artırırsan daha çok kazanırsın ama bazıları vazgeçebilir.", "OLAY")
                .Add("Normal fiyat, herkes gelsin", () => { SpawnBuff(1.5f, 120f); }, Popups.Green)
                .Add("Fiyatları artır", () => { G.priceBuff = 1.3f; G.priceBuffT = 120f; SpawnBuff(1.15f, 120f); }, Popups.Gold);
        }},
    };

    static void Fire()
    {
        var l = new List<Ev>();
        float tot = 0f;
        foreach (var e in All)
        {
            bool ok;
            try { ok = e.can(); } catch { ok = false; }
            if (ok) { l.Add(e); tot += e.weight; }
        }
        if (l.Count == 0) return;
        float r = UnityEngine.Random.value * tot;
        foreach (var e in l)
        {
            r -= e.weight;
            if (r <= 0f) { e.run(); return; }
        }
        l[l.Count - 1].run();
    }

    // Test ve hata ayiklama icin
    public static void FireNow() => Fire();
}

// Yagis parcaciklarini, kameradan bakinca binanin ustune denk geliyorsa gizler.
// Boylece yagmur ve kar sadece acik havada gorunur, icerisi kuru kalir.
public class PrecipCull : MonoBehaviour
{
    ParticleSystem ps;
    ParticleSystem.Particle[] buf;

    void Awake() => ps = GetComponent<ParticleSystem>();

    void LateUpdate()
    {
        var cam = Camera.main;
        if (!ps || !cam || Events.roofs.Count == 0) return;
        int max = ps.main.maxParticles;
        if (buf == null || buf.Length < max) buf = new ParticleSystem.Particle[max];
        int n = ps.GetParticles(buf);
        if (n == 0) return;
        Vector3 c = cam.transform.position;
        bool changed = false;
        for (int i = 0; i < n; i++)
        {
            if (buf[i].remainingLifetime <= 0f) continue;
            if (Events.UnderRoof(c, buf[i].position))
            {
                buf[i].remainingLifetime = 0f;
                buf[i].startSize = 0f;
                changed = true;
            }
        }
        if (changed) ps.SetParticles(buf, n);
    }
}
