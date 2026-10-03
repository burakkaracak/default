using System.Collections.Generic;
using UnityEngine;

// Resmi yildiz belgesi: sartlari saglayinca sinava basvurulur.
// Gizli bir mufettis misafir gibi gelir; memnun ayrilirsa otel bir ust yildiza cikar.
public static class StarExam
{
    public static int official = 1;
    public static bool scheduled, inspectorIn;
    public static int cooldownDay;
    static float spawnTimer = -1f;

    public static readonly int[] Rewards = { 0, 0, 800, 2500, 6000, 15000 };
    public static float PriceMul => 1f + 0.05f * (official - 1);
    public static int Target => Mathf.Min(5, official + 1);

    public class Req
    {
        public string text;
        public bool ok;
    }

    static GameManager G => GameManager.I;

    static int CountLevel(int l) { int n = 0; foreach (var r in G.rooms) if (r.level >= l) n++; return n; }

    public static List<Req> Requirements(int t)
    {
        var l = new List<Req>();
        int rooms = 0;
        foreach (var r in G.rooms) if (r.Unlocked) rooms++;
        switch (t)
        {
            case 2:
                Add(l, "En az 3 oda açık (" + rooms + ")", rooms >= 3);
                Add(l, "Puan ortalaması " + P(3f) + " ve üzeri (" + P(G.Stars) + ")", G.Stars >= 3f);
                break;
            case 3:
                Add(l, "En az 6 oda açık (" + rooms + ")", rooms >= 6);
                Add(l, "Kafe açık", G.cafe.Open);
                Add(l, "Resepsiyonist var", G.reception.HasStaff);
                Add(l, "En az 2 Konfor oda (" + CountLevel(2) + ")", CountLevel(2) >= 2);
                Add(l, "Puan ortalaması " + P(3.5f) + " ve üzeri (" + P(G.Stars) + ")", G.Stars >= 3.5f);
                break;
            case 4:
                Add(l, "En az 8 oda açık (" + rooms + ")", rooms >= 8);
                Add(l, "Havuz açık", G.pool.Open);
                Add(l, "En az 3 Kral Dairesi (" + CountLevel(3) + ")", CountLevel(3) >= 3);
                Add(l, "En az 2 temizlikçi (" + G.cleaners.Count + ")", G.cleaners.Count >= 2);
                Add(l, "Lobi dekoru en az %20 (" + Mathf.RoundToInt(Decor.Bonus * 100) + "%)", Decor.Bonus >= 0.19f);
                Add(l, "Puan ortalaması " + P(4f) + " ve üzeri (" + P(G.Stars) + ")", G.Stars >= 4f);
                break;
            default:
                Add(l, "2. kat açık", G.floor2Open);
                Add(l, "En az 12 oda açık (" + rooms + ")", rooms >= 12);
                Add(l, "En az 6 Kral Dairesi (" + CountLevel(3) + ")", CountLevel(3) >= 6);
                Add(l, "3 temizlikçi (" + G.cleaners.Count + ")", G.cleaners.Count >= 3);
                Add(l, "1.000 Otelgram takipçisi (" + Social.followers + ")", Social.followers >= 1000);
                Add(l, "Puan ortalaması " + P(4.5f) + " ve üzeri (" + P(G.Stars) + ")", G.Stars >= 4.5f);
                break;
        }
        return l;
    }

    static void Add(List<Req> l, string s, bool ok) => l.Add(new Req { text = s, ok = ok });
    static string P(float v) => v.ToString("0.0", new System.Globalization.CultureInfo("tr-TR"));

    public static bool ReqsMet
    {
        get
        {
            if (official >= 5) return false;
            foreach (var r in Requirements(Target)) if (!r.ok) return false;
            return true;
        }
    }

    public static string Status
    {
        get
        {
            if (official >= 5) return "Otelin en üst seviyede: 5 yıldız!";
            if (scheduled || inspectorIn) return "Müfettiş bugün gelecek ya da şu an otelde. Kim olduğunu bilmiyorsun!";
            if (G.dayNight.day < cooldownDay) return "Son sınav başarısız oldu. Yarın tekrar başvurabilirsin.";
            return ReqsMet ? "Tüm şartlar tamam, sınava başvurabilirsin!" : "Şartları tamamlayınca sınava başvurabilirsin.";
        }
    }

    public static bool CanApply => ReqsMet && !scheduled && !inspectorIn && G.dayNight.day >= cooldownDay;

    public static void Apply()
    {
        if (!CanApply) return;
        scheduled = true;
        spawnTimer = Random.Range(20f, 60f);
        Popups.Show("Başvurun alındı!", "Gizli bir müfettiş bugün otele gelecek. Normal bir misafir gibi davranacak, kim olduğunu bilmeyeceksin.\n\nHerkese en iyi hizmeti ver: hızlı karşıla, isteklerini yerine getir, iyi bir odaya yerleştir.", "YILDIZ SINAVI")
            .Add("Hazırız!", null, Popups.Gold);
    }

    public static void Tick(float dt)
    {
        if (!scheduled || spawnTimer < 0f) return;
        spawnTimer -= dt;
        if (spawnTimer > 0f) return;
        spawnTimer = -1f;
        scheduled = false;
        inspectorIn = true;
        G.QueueSpawn(new Customer.Config { type = Customer.G.Normal, inspector = true });
        G.Notify("Gizli müfettiş otelde olabilir...");
    }

    public static void Result(float score)
    {
        inspectorIn = false;
        int t = Target;
        if (score >= 4f)
        {
            official = t;
            int reward = Rewards[t];
            G.money += reward;
            Report.Bonus(reward);
            Social.Share(G.hotelName + " resmi olarak " + t + " yıldızlı otel oldu! Tebrikler!", 2, false);
            Popups.Show("Tebrikler! Artık " + t + " yıldızlı resmi bir otelsin!",
                    "Müfettiş çok memnun kaldı (puanı " + score.ToString("0.0", new System.Globalization.CultureInfo("tr-TR")) + ").\n\nOda fiyatların kalıcı olarak %5 arttı.\nÖdül: " + Eco.TL(reward),
                    "YILDIZ SINAVI · " + new string('★', t))
                .Add("Muhteşem!", null, Popups.Gold);
            U.Burst(new Vector3(0f, 3f, -12.5f), new Color(1f, 0.85f, 0.3f), new Color(1f, 0.5f, 0.7f), 160, 8f);
            Sfx.Play("unlock");
        }
        else
        {
            cooldownDay = G.dayNight.day + 1;
            Popups.Show("Sınav bu sefer olmadı", "Müfettiş gizlice not aldı ve ayrıldı (puanı " + score.ToString("0.0", new System.Globalization.CultureInfo("tr-TR")) + ", en az 4,0 gerekiyordu).\n\nİpucu: Bekleme süresini kısa tut, isteklere hızlı koş, ona iyi bir oda ver. Yarın tekrar başvurabilirsin.", "YILDIZ SINAVI")
                .Add("Yarın tekrar deneriz", null, Popups.Grey);
        }
        G.Save();
    }

    public static void Save(string K)
    {
        Store.SetInt(K + "official", official);
        Store.SetInt(K + "exam_cd", cooldownDay);
    }

    public static void Load(string K, float stars)
    {
        official = Store.GetInt(K + "official", -1);
        if (official < 1) official = Mathf.Clamp(Mathf.FloorToInt(stars), 1, 3);
        cooldownDay = Store.GetInt(K + "exam_cd", 0);
        scheduled = false;
        inspectorIn = false;
        spawnTimer = -1f;
    }
}
