using UnityEngine;

// Isimli sadik misafirler: her biri 3 ziyaretlik bir hikayeye sahip.
// Memnun ayrilirlarsa hikaye ilerler, son ziyarette kalici bir hediye birakirlar.
public static class Regulars
{
    public class Def
    {
        public string id, name, title, look, partner;
        public Customer.G type;
        public string[] arrive, success, request;
        public string fail;
        public int[] minLevel, reward;
    }

    public static readonly Def[] All =
    {
        new Def
        {
            id = "nermin", name = "Nermin Hanım", title = "Yazar", look = "character-female-c", type = Customer.G.Normal,
            arrive = new[]
            {
                "\"Merhaba! Ben Nermin, yazarım. Yeni romanımı bitirmek için sessiz bir oda arıyorum. Umarım burası doğru yer.\"",
                "\"Yine ben! Geçen sefer burada çok güzel yazdım. Bu kez de kahvemi eksik etmeyin lütfen.\"",
                "\"Son bölümü yazmaya geldim. Kitabın sonu burada, bu otelde bitecek.\""
            },
            success = new[]
            {
                "Nermin Hanım çok memnun ayrıldı: \"Tam 20 sayfa yazdım! Yine geleceğim.\"",
                "\"Kahveler, sessizlik, her şey mükemmeldi. Kitabım şekilleniyor.\"",
                "Nermin Hanım kitabını bitirdi ve otelinize ithaf etti! Kitap çıkınca binlerce okur oteli merak etti. (+800 Otelgram takipçisi)"
            },
            fail = "Nermin Hanım biraz hayal kırıklığıyla ayrıldı. Belki bir dahaki sefere...",
            request = new[] { "Sessizlik lütfen!", "Kahve lütfen!", "Kahve lütfen!" },
            minLevel = new[] { 1, 2, 2 }, reward = new[] { 300, 600, 2000 }
        },
        new Def
        {
            id = "kemal", name = "Kemal ve Saadet", title = "Emekli çift", look = "character-male-a", partner = "character-female-a", type = Customer.G.Balayi,
            arrive = new[]
            {
                "\"Kırk yıllık evliliğimizin yıldönümü! Bize güzel bir oda verir misiniz evladım?\"",
                "\"Geçen yıl burada çok mutlu olduk. Bu sefer torunlarımızın fotoğraflarını getirdik, size de göstereceğiz!\"",
                "\"Bu otel artık bizim ikinci evimiz. Bu sefer size bir sürprizimiz var.\""
            },
            success = new[]
            {
                "\"Bize gençliğimizi hatırlattınız!\" Kemal Bey seni kocaman kucakladı.",
                "Saadet Hanım el örgüsü bir şal hediye etti. Lobide çok güzel duruyor.",
                "Çift oteli tüm arkadaşlarına anlattı. Artık misafirler daha cömert bahşiş bırakıyor! (Bahşişler kalıcı olarak +%10)"
            },
            fail = "Çift biraz üzgün ayrıldı. Yıldönümleri için daha güzel bir oda bekliyorlardı.",
            request = new[] { "Çiçek lütfen!", "Çay getirir misin?", "Pasta lütfen!" },
            minLevel = new[] { 2, 2, 3 }, reward = new[] { 400, 700, 2500 }
        },
        new Def
        {
            id = "mert", name = "Mert", title = "Genç girişimci", look = "character-male-d", type = Customer.G.Is,
            arrive = new[]
            {
                "\"Merhaba, ben Mert. Şirketim için yatırımcı toplantım var. Hızlı internet ve sessiz bir oda şart!\"",
                "\"Yatırımı aldık! Şimdi ekibimle şehirdeyim, yine burayı seçtim.\"",
                "\"Şirket büyüdü! Tüm iş seyahatlerimizi size yönlendirmek istiyorum. Son bir kez bakalım.\""
            },
            success = new[]
            {
                "\"Toplantı harika geçti, bana şans getirdiniz!\"",
                "Mert ekibine oteli övdü. İş dünyasında adın duyulmaya başladı.",
                "Mert'in şirketiyle anlaşma yapıldı: İş insanları artık daha sık gelecek ve %10 daha fazla ödeyecek!"
            },
            fail = "Mert aceleyle ayrıldı: \"Bu sefer olmadı, işlerim aksadı.\"",
            request = new[] { "İnternet şifresi?", "Kahve lütfen!", "Ütü lazım!" },
            minLevel = new[] { 1, 2, 3 }, reward = new[] { 350, 700, 2500 }
        },
        new Def
        {
            id = "selin", name = "Selin", title = "Gezgin fotoğrafçı", look = "character-female-b", type = Customer.G.Turist,
            arrive = new[]
            {
                "\"Selam! Ben Selin, seyahat fotoğrafları çekiyorum. Otelinizi takipçilerime göstermek istiyorum!\"",
                "\"Geçen paylaşımım çok tuttu! Bu sefer havuzu ve kafeyi de çekeceğim.\"",
                "\"Büyük bir dergi için ülkenin en güzel otellerini çekiyorum. Listede sizin oteliniz de var!\""
            },
            success = new[]
            {
                "Selin'in paylaşımı yüzlerce beğeni aldı!",
                "\"Takipçilerim otelinize bayıldı, mesaj yağıyor!\"",
                "Dergi kapağı oldunuz! Otel ülke çapında tanındı. (+1500 Otelgram takipçisi)"
            },
            fail = "Selin fotoğraf çekecek güzel bir köşe bulamadı. Bir dahaki sefere...",
            request = new[] { "Şehir haritası?", "Havlu lütfen!", "Su getirir misin?" },
            minLevel = new[] { 1, 2, 2 }, reward = new[] { 300, 600, 2200 }
        },
        new Def
        {
            id = "huseyin", name = "Hüseyin Usta", title = "Emekli otelci", look = "character-male-c", type = Customer.G.Normal,
            arrive = new[]
            {
                "\"Ben 40 yıl otel işlettim evlat. Bakalım sen nasıl iş çıkarıyorsun?\"",
                "\"Yine geldim. Geçen sefer iyiydin ama otelcilik detaydadır!\"",
                "\"Son kez geliyorum, artık yaşlandım. Ama gitmeden sana bir hediyem var.\""
            },
            success = new[]
            {
                "\"Fena değil! Bir tavsiye: Çarşaf stoğunu hiç bitirme, temiz oda her şeydir.\"",
                "\"Aferin! Personelini mutlu tut. Onlar mutluysa misafir de mutludur.\"",
                "Hüseyin Usta en mütevazı odanı kendi ustalarıyla bir seviye yükseltti! \"Bu otel emin ellerde.\""
            },
            fail = "Hüseyin Usta başını salladı: \"Daha çok çalışman lazım evlat.\"",
            request = new[] { "Gazete var mı?", "Çay lütfen!", "Çay lütfen!" },
            minLevel = new[] { 1, 2, 3 }, reward = new[] { 300, 700, 2000 }
        },
    };

    public static readonly int[] visits = new int[5];
    static int pending = -1;
    static float spawnAt = -1f;
    static readonly bool[] inHotel = new bool[5];

    static int Idx(string id)
    {
        for (int i = 0; i < All.Length; i++) if (All[i].id == id) return i;
        return -1;
    }

    public static bool Done(string id) { int i = Idx(id); return i >= 0 && visits[i] >= 3; }
    public static float TipPerk => Done("kemal") ? 0.1f : 0f;
    public static bool BusinessPerk => Done("mert");

    public static void NewDay(int day)
    {
        spawnAt = -1f;
        pending = -1;
        if (Quests.Total("served") < 12 || Random.value > 0.65f) return;
        var cands = new System.Collections.Generic.List<int>();
        for (int i = 0; i < All.Length; i++) if (visits[i] < 3 && !inHotel[i]) cands.Add(i);
        if (cands.Count == 0) return;
        pending = cands[Random.Range(0, cands.Count)];
        spawnAt = Random.Range(0.33f, 0.72f);
    }

    public static void Tick()
    {
        var G = GameManager.I;
        if (pending < 0 || spawnAt < 0f || G.dayNight.time < spawnAt || G.dayNight.time > 0.9f) return;
        inHotel[pending] = true;
        G.QueueSpawn(new Customer.Config { type = All[pending].type, regular = All[pending] });
        pending = -1;
        spawnAt = -1f;
    }

    // Test icin: hemen bir mudavim gonder
    public static void SpawnNow()
    {
        for (int i = 0; i < All.Length; i++)
            if (visits[i] < 3 && !inHotel[i])
            {
                inHotel[i] = true;
                GameManager.I.QueueSpawn(new Customer.Config { type = All[i].type, regular = All[i] });
                return;
            }
    }

    public static int Chapter(Def d) => Mathf.Clamp(visits[Idx(d.id)], 0, 2);

    public static void OnCheckIn(Customer c, Room r)
    {
        var d = c.regular;
        int ch = Chapter(d);
        string extra = r.level < d.minLevel[ch] ? "\n\n(Bu ziyaret için en az " + Eco.LevelNames[d.minLevel[ch]] + " oda istiyor. Şu anki odası daha basit, memnun kalmayabilir.)" : "";
        Popups.Show(d.name + " geldi!", d.arrive[ch] + extra, "MÜDAVİM · " + d.title.ToUpper(new System.Globalization.CultureInfo("tr-TR")) + " · ZİYARET " + (ch + 1) + "/3")
            .Add("Hoş geldiniz!", null, Popups.Gold);
    }

    public static void OnLeave(Customer c, float sat, Room r, bool angry)
    {
        var d = c.regular;
        int i = Idx(d.id);
        inHotel[i] = false;
        int ch = Chapter(d);
        bool ok = !angry && sat >= 3.6f && r != null && r.level >= d.minLevel[ch];
        var G = GameManager.I;
        if (!ok)
        {
            Popups.Show(d.name, d.fail, "MÜDAVİM").Add("Bir dahaki sefere!", null, Popups.Grey);
            return;
        }
        visits[i] = ch + 1;
        int reward = Mathf.RoundToInt(d.reward[ch] * (1f + G.Unlocked() * 0.15f) / 10f) * 10;
        G.money += reward;
        Report.Bonus(reward);
        if (ch == 2) ApplyPerk(d);
        Social.Share(d.name + " yine " + G.hotelName + "'de! " + (ch == 2 ? "Bu otelin hikayemde çok özel bir yeri var." : "Burası artık favorim."), 1, false);
        Popups.Show(ch == 2 ? d.name + ": hikaye tamamlandı!" : d.name + " çok memnun!", d.success[ch] + "\n\nÖdül: " + Eco.TL(reward),
                "MÜDAVİM · ZİYARET " + (ch + 1) + "/3")
            .Add("Harika!", null, Popups.Gold);
        Sfx.Play("unlock");
    }

    static void ApplyPerk(Def d)
    {
        var G = GameManager.I;
        switch (d.id)
        {
            case "nermin": Social.followers += 800; break;
            case "selin": Social.followers += 1500; break;
            case "huseyin":
                Room low = null;
                foreach (var r in G.rooms) if (r.Unlocked && r.level < 3 && (low == null || r.level < low.level)) low = r;
                if (low != null) low.ApplyLevel(low.level + 1, true);
                break;
        }
    }

    public static void Save(string K)
    {
        for (int i = 0; i < All.Length; i++) Store.SetInt(K + "reg_" + All[i].id, visits[i]);
    }

    public static void Load(string K)
    {
        for (int i = 0; i < All.Length; i++)
        {
            visits[i] = Store.GetInt(K + "reg_" + All[i].id, 0);
            inHotel[i] = false;
        }
        pending = -1;
        spawnAt = -1f;
    }
}
