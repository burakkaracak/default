using System;
using System.Collections.Generic;
using UnityEngine;

// Hikaye modu "Elif'in Oteli": 8 bolum. Hikaye tum oteller icin ortaktir.
// Hedefler bolum basinda otelin buyuklugune gore olceklenir, boylece buyuk bir otelde de anlamli kalir.
public static class Story
{
    const string P = "o4_story_";
    public static bool started;
    public static int chapter;          // 0..7, 8 = hikaye bitti
    public static int scale = 1;
    public static int followersBase, officialBase;
    public static bool debtPaid;
    static readonly Dictionary<string, int> prog = new Dictionary<string, int>();
    static bool notified;

    public const int Count = 8;
    public static bool Finished => started && chapter >= Count;
    public static bool Active => started && chapter < Count;

    static GameManager G => GameManager.I;

    public static string Ad
    {
        get
        {
            string n = G != null ? G.managerName : "";
            return string.IsNullOrWhiteSpace(n) || n == "Müdür" ? "Elif" : n;
        }
    }

    public static readonly string[] Titles =
    {
        "Anneannenin Mektubu", "Bankanın Mektubu", "Karşıdaki Rakip", "Sadık Müşteriler",
        "Kaan Bey'in Oyunu", "Resmi Yıldız", "Bodrum'a Yelken", "Kapadokya Rüyası"
    };

    public static readonly string[] Summaries =
    {
        "Anneanne Saadet otelini sana bıraktı. Misafirleri mutlu ederek otelin adını yeniden duyur.",
        "Bankada eski bir borç çıktı. Borcu öde, oteli temiz ve düzenli tut.",
        "Kaan Bey karşıya Kaan Palas'ı açtı ve oteli satın almak istiyor. Misafirlerini mutlu et, Otelgram'da büyü.",
        "Telefonlar susmuyor. Rezervasyonları ağırla, yükseltme isteklerini karşıla, istekleri yerine getir.",
        "Kaan Bey Otelgram'da kötü yorumlarla otelini karalıyor. En iyi cevap: kusursuz hizmet.",
        "Bakanlık seni yıldız sınavına davet ediyor. Belgeni yükselt ve odalarına kimlik kazandır.",
        "Anneannenin gençken pansiyon işlettiği Bodrum'da bir otel satılık. Zincirini büyüt.",
        "Anneannenin son hayali: peri bacalarının arasında, balonların altında bir otel."
    };

    public class Goal
    {
        public string text;
        public Func<int> cur;
        public int target;
        public bool Done => cur() >= target;
    }

    static int Get(string k) => prog.TryGetValue(k, out var v) ? v : 0;

    public static int Debt => 2500 * scale;
    public static int Reward => chapter >= Count ? 0 : (new[] { 500, 300, 800, 1000, 1500, 2000, 3000, 10000 })[chapter] * scale;

    static int Kinds()
    {
        int n = 0;
        foreach (var r in G.rooms) if (r.Unlocked && r.kind != RoomKinds.Klasik) n++;
        return n;
    }

    public static List<Goal> Goals()
    {
        var l = new List<Goal>();
        if (!Active || G == null) return l;
        int S = scale;
        switch (chapter)
        {
            case 0:
                l.Add(new Goal { text = "Misafir ağırla", cur = () => Get("guest"), target = 10 + 3 * S });
                l.Add(new Goal { text = "Puan ortalaması 4,0 (x10)", cur = () => Mathf.RoundToInt(G.Stars * 10f), target = 40 });
                break;
            case 1:
                l.Add(new Goal { text = "Bankaya borcu öde (" + Eco.TL(Debt) + ")", cur = () => debtPaid ? 1 : 0, target = 1 });
                l.Add(new Goal { text = "Oda temizle", cur = () => Get("cleaned"), target = 8 + 2 * S });
                break;
            case 2:
                l.Add(new Goal { text = "♥♥ ile ayrılan misafir (4,5+)", cur = () => Get("happy"), target = 6 + S });
                l.Add(new Goal { text = "Otelgram'da yeni takipçi", cur = () => Mathf.Max(0, Social.followers - followersBase), target = 100 + 20 * S });
                break;
            case 3:
                l.Add(new Goal { text = "Rezervasyonlu misafiri yerleştir", cur = () => Get("reservation"), target = 3 });
                l.Add(new Goal { text = "Oda yükseltme isteğini kabul et", cur = () => Get("upgrade"), target = 2 });
                l.Add(new Goal { text = "Misafir isteğini yerine getir", cur = () => Get("requests"), target = 5 + S });
                break;
            case 4:
                l.Add(new Goal { text = "4+ puanla ayrılan misafir", cur = () => Get("good"), target = 15 + 3 * S });
                l.Add(new Goal { text = "Puan ortalaması 4,5 (x10)", cur = () => Mathf.RoundToInt(G.Stars * 10f), target = 45 });
                break;
            case 5:
                if (officialBase < 5)
                    l.Add(new Goal { text = "Resmi yıldız belgesi " + (officialBase + 1) + "★", cur = () => StarExam.official, target = officialBase + 1 });
                else
                    l.Add(new Goal { text = "VIP misafir ağırla", cur = () => Get("vipguest"), target = 4 + S / 2 });
                l.Add(new Goal { text = "Özel tipli oda (Menü > Otel > Tip)", cur = Kinds, target = 2 });
                break;
            case 6:
                l.Add(new Goal { text = "Bodrum otelini aç (Hikâye sekmesi)", cur = () => Chain.Owns(1) ? 1 : 0, target = 1 });
                l.Add(new Goal { text = "Bodrum'da misafir ağırla", cur = () => Get("guest_c1"), target = 15 });
                break;
            case 7:
                l.Add(new Goal { text = "Kapadokya otelini aç", cur = () => Chain.Owns(2) ? 1 : 0, target = 1 });
                l.Add(new Goal { text = "Kapadokya'da misafir ağırla", cur = () => Get("guest_c2"), target = 15 });
                l.Add(new Goal { text = "Başkanlık Süiti kur (herhangi bir otelde)", cur = () => Get("suite"), target = 1 });
                break;
        }
        return l;
    }

    public static bool Ready
    {
        get
        {
            if (!Active) return false;
            var g = Goals();
            if (g.Count == 0) return false;
            foreach (var x in g) if (!x.Done) return false;
            return true;
        }
    }

    // ---- Ilerleme ----
    public static void Track(string k, int n = 1)
    {
        if (!Active) return;
        prog[k] = Get(k) + n;
    }

    public static void OnGuest(Customer c, float sat)
    {
        if (!Active) return;
        Track("guest");
        if (Chain.cur > 0) Track("guest_c" + Chain.cur);
        if (sat >= 4.5f) Track("happy");
        if (sat >= 4f) Track("good");
        if (c.vip) Track("vipguest");
    }

    // Saniyede bir: bolum bittiyse haber ver
    public static void Tick()
    {
        if (!Active || notified || G == null) return;
        if (Ready)
        {
            notified = true;
            G.Notify("Hikâye bölümü tamamlandı! Menü > Hikâye");
            Sfx.Play("unlock", 0.6f);
        }
    }

    // ---- Bolumler ----
    public static void Begin()
    {
        if (started) return;
        started = true;
        StartChapter(0);
    }

    static int ComputeScale()
    {
        int sum = 0;
        foreach (var r in G.rooms) if (r.Unlocked && !r.IsSuitePart) sum += r.Price;
        return Mathf.Clamp(Mathf.RoundToInt(sum / 400f), 1, 12);
    }

    static void StartChapter(int c)
    {
        chapter = c;
        prog.Clear();
        notified = false;
        scale = ComputeScale();
        followersBase = Social.followers;
        officialBase = StarExam.official;
        debtPaid = false;
        Save();
        Intro(c);
    }

    public static void PayDebt()
    {
        if (!Active || chapter != 1 || debtPaid || !G.CanPay(Debt)) return;
        G.money -= Debt;
        Report.Other(Debt);
        debtPaid = true;
        Sfx.Play("coin");
        Popups.Show("Borç kapandı!", "Banka Müdürü Necati Bey: \"Tebrikler " + Ad + " Hanım, otelin tapusu artık tamamen sizin. Anneanneniz bu günü görse çok sevinirdi.\"", "BANKA")
            .Add("Çok şükür!", null, Popups.Gold);
        Save();
    }

    public static void Complete()
    {
        if (!Ready) return;
        int reward = Reward;
        G.money += reward;
        Report.Bonus(reward);
        Sfx.Play("coin");
        int done = chapter;
        Outro(done, reward);
        if (done + 1 >= Count)
        {
            chapter = Count;
            Save();
            return;
        }
        StartChapter(done + 1);
    }

    static Popups.P Say(string tag, string title, string body, string btn, Color c)
    {
        var p = Popups.Show(title, body, tag);
        p.accent = c;
        p.Add(btn, null, c);
        return p;
    }

    static readonly Color Rose = new Color(1f, 0.6f, 0.75f, 1f);
    static readonly Color Sea = new Color(0.45f, 0.75f, 1f, 1f);
    static readonly Color Rival = new Color(0.95f, 0.45f, 0.4f, 1f);

    static void Intro(int c)
    {
        string tag = "BÖLÜM " + (c + 1) + " · " + Eco.Upper(Titles[c]);
        switch (c)
        {
            case 0:
                Say(tag, "Sevgili " + Ad + ",",
                    "Bu mektubu okuyorsan, otelim artık senin. Bu duvarlar kırk yıl boyunca misafirlerin kahkahalarıyla doldu. Biraz yorgun görünüyor, biliyorum. Ama sen ona yeniden hayat verebilirsin.\n\nKalbinin sesini dinle, misafirlerine ailen gibi bak.\n\nSeni çok seven anneannen Saadet",
                    "Söz veriyorum anneanne", Rose);
                Say(tag, "Elif'in Oteli", "Hikâye başladı! Her bölümün hedefleri Menü > Hikâye sekmesinde. Hedefler tamamlanınca bölüm ödülünü alıp sonraki bölüme geçersin.", "Hadi başlayalım!", Popups.Gold);
                break;
            case 1:
                Say(tag, "Banka Müdürü Necati Bey",
                    "\"Merhaba " + Ad + " Hanım. Anneannenizin bankamıza eski bir borcu var: " + Eco.TL(Debt) + ". Ödenene kadar otelin tapusu bizde rehinli. Acele etmeyin ama unutmayın, bu borcun kapanması gerek.\"",
                    "Ödeyeceğim", Popups.Blue);
                break;
            case 2:
                Say(tag, "Kapıda biri var: Kaan Bey",
                    "\"Demek anneannenin oteline artık sen bakıyorsun. Karşıya Kaan Palas'ı açtım. Misafirlerinin hepsi bana gelecek, göreceksin. Bu eski binayı bana satmaya ne dersin?\"",
                    "Asla satmam!", Rival);
                break;
            case 3:
                Say(tag, "Telefonlar susmuyor!",
                    "Otelin adı duyuldu. Misafirler artık önceden arayıp oda ayırtıyor, bazıları da gelince daha iyi bir oda istiyor.\n\nRezervasyonları kabul et, istekleri karşıla: sadık müşteri böyle kazanılır.",
                    "Hazırım", Popups.Gold);
                break;
            case 4:
                Social.Add("@kaanpalas_hayrani", G.hotelName + " çok eski ve sıkıcı. Karşıdaki Kaan Palas çok daha iyi!", UnityEngine.Random.Range(60, 100), true, 0);
                Social.Add("@kaanpalas_hayrani", "Bence kimse " + G.hotelName + "'e gitmesin, hizmet berbat.", UnityEngine.Random.Range(60, 100), true, 0);
                Say(tag, "Otelgram'da garip yorumlar",
                    "Aynı hesaptan art arda kötü yorumlar geliyor: @kaanpalas_hayrani. Kaan Bey'in oyunu belli!\n\nOna en iyi cevap: misafirlerini öyle mutlu et ki, iyi yorumlar kötüleri gölgede bıraksın.",
                    "Kusursuz hizmet!", Rival);
                break;
            case 5:
                Say(tag, "Bakanlıktan bir mektup",
                    "Turizm Bakanlığı otelini resmi yıldız sınavına davet ediyor. Kaan Palas'ın belgesi 4 yıldız.\n\nŞartları tamamla, sınava başvur (Menü > Görevler) ve odalarına kimlik kazandır: Aile, Balayı, İş ya da Ekonomik oda.",
                    "Başvuracağım", Popups.Gold);
                break;
            case 6:
                Say(tag, "Bodrum'dan bir telefon",
                    "Kaptan Yusuf: \"Anneannen gençken Bodrum'da küçük bir pansiyon işletirdi, bilir misin? O bina satılık! Beyaz duvarlar, deniz, palmiyeler... Zincirini büyütmek için tam zamanı.\"\n\nBodrum otelini Menü > Hikâye sekmesinden açabilirsin.",
                    "Yelkenler fora!", Sea);
                break;
            case 7:
                Say(tag, "Anneannenin son hayali",
                    "Balon pilotu Ayşe Hanım yazdı: \"Anneanneniz yıllar önce buraya geldiğinde, peri bacalarının arasında bir otel açmayı hayal etmişti. Sabahları balonlar penceresinin önünden geçecekti. Bu hayali siz gerçekleştirin.\"",
                    "Gerçekleştireceğim", Rose);
                break;
        }
    }

    static void Outro(int c, int reward)
    {
        string tag = "BÖLÜM " + (c + 1) + " TAMAMLANDI";
        string r = "\n\nÖdül: " + Eco.TL(reward);
        switch (c)
        {
            case 0: Say(tag, "Otel yeniden canlandı", "Lobide yine kahkahalar var. Komşular \"Saadet Hanım'ın oteli yeniden açılmış!\" diye konuşuyor." + r, "Devam", Popups.Gold); break;
            case 1: Say(tag, "Tapu artık senin", "Borç kapandı, otel tamamen senin. Şimdi büyüme zamanı." + r, "Devam", Popups.Gold); break;
            case 2: Say(tag, "Kaan Bey bozuldu", "Misafirlerin seni seçti. Kaan Bey karşıdan pencereden bakıp söyleniyor." + r, "Devam", Popups.Gold); break;
            case 3: Say(tag, "Sadık müşteriler", "Misafirler artık seni arayıp yer ayırtıyor. Güven kazandın." + r, "Devam", Popups.Gold); break;
            case 4: Say(tag, "Gerçek ortaya çıktı", "Otelgram'da herkes kötü yorumların sahte olduğunu anladı. @kaanpalas_hayrani hesabı kapandı!" + r, "Devam", Popups.Gold); break;
            case 5: Say(tag, "Resmi olarak tescilli", "Otelin artık resmi olarak daha yıldızlı ve odaların her misafire göre." + r, "Devam", Popups.Gold); break;
            case 6: Say(tag, "Bodrum'da güneş", "Bodrum otelin denize karşı ilk misafirlerini ağırladı. Kaptan Yusuf gururla el sallıyor." + r, "Devam", Sea); break;
            case 7:
                Say(tag, "Kaan Bey'den bir ziyaret",
                    "\"Kabul ediyorum " + Ad + ", sen benden iyisin. Üç şehirde üç otel... Artık rakip değil, dostuz. Bir gün Kaan Palas'ı da sana devretsem şaşırma.\"",
                    "Dostluğa!", Rival);
                Say("HİKÂYENİN SONU", "Otel İmparatoriçesi " + Ad,
                    "Anneanne Saadet'in eski mektubunun arkasında bir not daha varmış:\n\n\"Biliyordum. Kalbinin sesini dinleyeceğini biliyordum.\"\n\nHikâye bitti ama otellerin seni bekliyor!" + r,
                    "♥", Rose);
                if (G) G.Celebrate("Otel İmparatoriçesi " + Ad + "!", "Elif'in Oteli hikâyesi tamamlandı. Üç şehirde üç otel!");
                break;
        }
    }

    // Test icin: sayac hedeflerini doldur
    public static void TestFill()
    {
        foreach (var k in new[] { "guest", "cleaned", "happy", "good", "reservation", "upgrade", "requests", "vipguest", "guest_c1", "guest_c2", "suite" })
            prog[k] = 999;
        followersBase = -100000;
        for (int i = 0; i < 20; i++) G.AddRating(5f);
    }

    // ---- Kayit (tum oteller icin ortak) ----
    public static void Save()
    {
        Store.SetInt(P + "on", started ? 1 : 0);
        Store.SetInt(P + "ch", chapter);
        Store.SetInt(P + "scale", scale);
        Store.SetInt(P + "fol", followersBase);
        Store.SetInt(P + "off", officialBase);
        Store.SetInt(P + "debt", debtPaid ? 1 : 0);
        var parts = new List<string>();
        foreach (var kv in prog) parts.Add(kv.Key + "=" + kv.Value);
        Store.SetString(P + "prog", string.Join(";", parts));
    }

    public static void Load()
    {
        started = Store.GetInt(P + "on", 0) == 1;
        chapter = Store.GetInt(P + "ch", 0);
        scale = Mathf.Max(1, Store.GetInt(P + "scale", 1));
        followersBase = Store.GetInt(P + "fol", 0);
        officialBase = Store.GetInt(P + "off", 1);
        debtPaid = Store.GetInt(P + "debt", 0) == 1;
        prog.Clear();
        notified = false;
        foreach (var part in Store.GetString(P + "prog", "").Split(';'))
        {
            var kv = part.Split('=');
            if (kv.Length == 2 && int.TryParse(kv[1], out int v)) prog[kv[0]] = v;
        }
    }
}
