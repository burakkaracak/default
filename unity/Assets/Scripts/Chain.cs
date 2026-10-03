using UnityEngine;
using UnityEngine.SceneManagement;

// Otel zinciri: ilk otelin yaninda Bodrum ve Kapadokya'da yeni oteller.
// Her otelin kaydi ayridir (ilk otel "o4_", digerleri "o4_c1_", "o4_c2_").
public static class Chain
{
    public const string Base = "o4_";
    public static readonly string[] Cities = { "Merkez", "Bodrum", "Kapadokya" };
    public static readonly string[] CityDesc =
    {
        "İlk otelin. Her şey burada başladı.",
        "Ege'nin incisi: beyaz badanalı duvarlar, palmiyeler ve deniz manzarası. Turistler ve balayı çiftleri akın eder, fiyatlar %15 yüksek.",
        "Peri bacaları ve sabah gökyüzünü dolduran sıcak hava balonları. Balayı çiftleri bayılır, fiyatlar %25 yüksek, kışın kar çok yağar."
    };
    public static readonly int[] Cost = { 0, 120000, 300000 };
    public const int StartMoney = 5000;

    public static int cur;
    public static int owned = 1;
    static bool inited;

    public static string Prefix(int i) => i == 0 ? Base : Base + "c" + i + "_";
    public static string K => Prefix(cur);

    public static void Init()
    {
        owned = Store.GetInt(Base + "chain_own", 1) | 1;
        cur = Mathf.Clamp(Store.GetInt(Base + "chain_cur", 0), 0, Cities.Length - 1);
        if (!Owns(cur)) cur = 0;
        inited = true;
    }

    public static bool Owns(int i) => (owned & (1 << i)) != 0;

    public static int Count
    {
        get
        {
            if (!inited) Init();
            int n = 0;
            for (int i = 0; i < Cities.Length; i++) if (Owns(i)) n++;
            return n;
        }
    }

    // Zincir bonusu: her ek otel tum otellerde fiyatlari %5 artirir; sehir fiyat farki
    public static float PriceMul => (1f + 0.05f * (Count - 1)) * (cur == 1 ? 1.15f : cur == 2 ? 1.25f : 1f);

    // Sehre gore misafir tipi carpani
    public static float Bias(Customer.G t)
    {
        if (cur == 1) return t == Customer.G.Turist ? 1.6f : t == Customer.G.Balayi ? 1.4f : t == Customer.G.Aile ? 1.2f : t == Customer.G.Is ? 0.6f : 1f;
        if (cur == 2) return t == Customer.G.Balayi ? 1.7f : t == Customer.G.Turist ? 1.5f : t == Customer.G.Aile ? 0.9f : t == Customer.G.Is ? 0.5f : 1f;
        return 1f;
    }

    public static string HotelName(int i)
    {
        if (i == cur && GameManager.I) return GameManager.I.hotelName;
        return Store.GetString(Prefix(i) + "hotel", Cities[i]);
    }

    public static int Money(int i) => i == cur && GameManager.I ? GameManager.I.money : Store.GetInt(Prefix(i) + "money", 0);
    public static int Day(int i) => Store.GetInt(Prefix(i) + "day", 1);
    public static int Rooms(int i)
    {
        if (i == cur && GameManager.I) return GameManager.I.Unlocked();
        int n = 0;
        for (int r = 0; r < 16; r++) if (Store.GetInt(Prefix(i) + "room" + r, r == 0 ? 1 : 0) > 0) n++;
        return n;
    }

    // Satin alma sartlari
    public static string Requirement(int i)
    {
        var G = GameManager.I;
        if (i == 1)
        {
            if (G.Unlocked() < 8) return "En az 8 oda açık olmalı (" + G.Unlocked() + ")";
            if (G.Stars < 3.95f) return "Puan ortalaman en az 4,0 olmalı";
        }
        if (i == 2)
        {
            if (!Owns(1)) return "Önce Bodrum otelini aç";
            if (G.Stars < 4.25f) return "Puan ortalaman en az 4,3 olmalı";
        }
        return null;
    }

    public static bool CanBuy(int i) => !Owns(i) && Requirement(i) == null && GameManager.I.CanPay(Cost[i]);

    public static void Buy(int i)
    {
        var G = GameManager.I;
        if (!CanBuy(i)) return;
        G.money -= Cost[i];
        owned |= 1 << i;
        Store.SetInt(Base + "chain_own", owned);
        // Yeni otelin baslangic kaydi
        string p = Prefix(i);
        string baseName = G.hotelName;
        string name = (baseName + " " + Cities[i]);
        if (name.Length > 22) name = Cities[i] + " Oteli";
        Store.SetInt(p + "saved", 1);
        Store.SetInt(p + "money", StartMoney);
        Store.SetString(p + "hotel", name);
        Store.SetString(p + "manager", G.managerName);
        Store.SetInt(p + "managerLook", G.managerVariant);
        Store.SetInt(p + "sound", G.sound ? 1 : 0);
        Store.SetInt(p + "music", G.music ? 1 : 0);
        Store.SetInt(p + "day", 1);
        Store.SetFloat(p + "time", 0.3f);
        Store.SetInt(p + "news5", 1);
        Store.SetInt(p + "news6", 1);
        Store.SetInt(p + "official", 1);
        G.Save();
        Story.Track("chain");
        Sfx.Play("unlock");
        Popups.Show(Cities[i] + " otelin hazır!",
                name + " kapılarını açtı. Zincirdeki her otel tüm otellerde fiyatları %5 artırır.\n\nYeni otel " + Eco.TL(StartMoney) + " sermaye ile küçük başlar. Menü > Hikâye sekmesinden oteller arasında geçiş yapabilir, para gönderebilirsin. Resepsiyonisti olan otel sen yokken de kazanır.",
                "OTEL ZİNCİRİ")
            .Add("Hemen git!", () => Switch(i), Popups.Green)
            .Add("Sonra", null, Popups.Grey);
    }

    public static void Switch(int i)
    {
        var G = GameManager.I;
        if (!Owns(i) || i == cur || G == null) return;
        G.Save();
        cur = i;
        Store.SetInt(Base + "chain_cur", i);
        Store.Save();
        Popups.Clear();
        Time.timeScale = 1f;
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }

    // Bu otelin kasasindan baska bir otele para gonder
    public static void Send(int to, int amount)
    {
        var G = GameManager.I;
        if (!Owns(to) || to == cur || amount <= 0 || G.money < amount) return;
        G.money -= amount;
        Store.SetInt(Prefix(to) + "money", Store.GetInt(Prefix(to) + "money", 0) + amount);
        G.Save();
        Sfx.Play("coin");
        G.Notify(HotelName(to) + " kasasına " + Eco.TL(amount) + " gönderildi");
    }
}

// Hafifce sallanan / suzulen dekor (tekneler, sicak hava balonlari)
public class Bob : MonoBehaviour
{
    float amp, speed, range, ph;
    Vector3 vel, p0;

    public void Set(float a, float sp, Vector3 v, float wrap)
    {
        amp = a;
        speed = sp;
        vel = v;
        range = wrap;
        p0 = transform.position;
        ph = Random.value * 6f;
    }

    void Update()
    {
        p0 += vel * Time.deltaTime;
        if (range > 0f && p0.x > range) p0.x -= 2f * range;
        transform.position = p0 + Vector3.up * Mathf.Sin(Time.time * speed + ph) * amp;
    }
}
