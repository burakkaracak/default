using System.Globalization;
using UnityEngine;

// Oyunun ekonomisi: fiyatlar, maliyetler, yukseltmeler ve TL bicimi
public static class Eco
{
    static readonly CultureInfo TR = new CultureInfo("tr-TR");

    public static string TL(long v) => "₺" + v.ToString("N0", TR);
    public static string Upper(string s) => s.ToUpper(TR);

    public const int StartMoney = 60;

    // ---- Odalar ----
    public static readonly int[] RoomUnlock = { 0, 150, 400, 900, 1800, 3500, 8000, 12000, 17000, 24000, 30000, 40000, 52000, 66000, 82000, 100000 };
    public const int Floor2Start = 10;
    public const int WingStart = 6;

    // ---- Alanlar ----
    public const int CafeCost = 1200, PoolCost = 3000, WingCost = 8000, Floor2Cost = 30000, BaristaCost = 800;
    public static int CafePrice => Mathf.RoundToInt((14 + 3 * Stars) * (1f + 0.4f * Lv(Up.Tips) * 0.5f));
    public static int PoolPrice => Mathf.RoundToInt(20 + 5 * Stars);

    // ---- Yildiz ----
    public static float Stars => GameManager.I != null ? GameManager.I.Stars : 3f;
    public static float StarMul => 0.85f + 0.075f * Stars;
    public static readonly string[] LevelNames = { "", "Standart", "Konfor", "Kral Dairesi" };

    public static int UpgradeCost(int index, int toLevel) =>
        Mathf.RoundToInt((toLevel == 2 ? 250 + 120 * index : 750 + 320 * index) * (1f + 0.12f * index) / 10f) * 10;

    public static int NightPrice(int index, int level)
    {
        float lv = level <= 1 ? 1f : level == 2 ? 1.7f : 2.6f;
        float breakfast = 1f + 0.15f * Lv(Up.Breakfast);
        float exam = GameManager.I != null ? StarExam.PriceMul * GameManager.I.PriceBuff * Pricing.PriceMul * Chain.PriceMul : 1f;
        return Mathf.RoundToInt((30 + 6 * index) * lv * breakfast * StarMul * exam);
    }

    public static int Tip(int index, int level) =>
        Mathf.RoundToInt(NightPrice(index, level) * 0.25f * (1f + 0.3f * Lv(Up.Tips)));

    // ---- Personel ----
    public const int ReceptionistCost = 300, RestRoomCost = 1500;
    public static readonly int[] CleanerCost = { 450, 1100, 2400 };

    public static readonly string[] Names =
    {
        "Ayşe", "Mehmet", "Zeynep", "Can", "Elif", "Emre", "Selin", "Murat",
        "Deniz", "Burcu", "Kerem", "Ece", "Oğuz", "Melis", "Arda", "Nehir"
    };

    // ---- Yukseltmeler ----
    public enum Up { Magnet, Speed, Clean, Service, Tips, Ads, Comfort, StaffSpeed, Breakfast, Laundry, Carry }

    public class UpDef
    {
        public Up id;
        public string name, desc;
        public int baseCost, max;
        public float growth;
    }

    public static readonly UpDef[] Ups =
    {
        new UpDef { id = Up.Magnet, name = "Para Mıknatısı", desc = "Paralar uzaktan sana uçar. Her seviyede menzil artar.", baseCost = 300, growth = 2.0f, max = 5 },
        new UpDef { id = Up.Speed, name = "Hızlı Adımlar", desc = "Müdür daha hızlı yürür.", baseCost = 200, growth = 2.5f, max = 3 },
        new UpDef { id = Up.Clean, name = "Hızlı Temizlik", desc = "Odalar herkes için daha çabuk temizlenir.", baseCost = 250, growth = 2.4f, max = 3 },
        new UpDef { id = Up.Service, name = "Hızlı Resepsiyon", desc = "Misafirler daha çabuk odaya yerleşir.", baseCost = 300, growth = 2.4f, max = 3 },
        new UpDef { id = Up.Breakfast, name = "Kahvaltı Servisi", desc = "Gecelik oda fiyatları %15 artar.", baseCost = 700, growth = 2.5f, max = 3 },
        new UpDef { id = Up.Tips, name = "Cömert Misafirler", desc = "Bahşişler %30 artar.", baseCost = 500, growth = 2.2f, max = 3 },
        new UpDef { id = Up.Ads, name = "Reklam", desc = "Otele daha sık misafir gelir.", baseCost = 400, growth = 2.5f, max = 3 },
        new UpDef { id = Up.Comfort, name = "Konforlu Bekleme", desc = "Misafirler daha uzun sabırla bekler.", baseCost = 350, growth = 2.6f, max = 2 },
        new UpDef { id = Up.StaffSpeed, name = "Personel Eğitimi", desc = "Çalışanlar daha hızlı çalışır.", baseCost = 600, growth = 2.2f, max = 3 },
        new UpDef { id = Up.Laundry, name = "Hızlı Çamaşır", desc = "Makineler daha hızlı ve tek seferde daha çok çarşaf yıkar.", baseCost = 500, growth = 2.4f, max = 3 },
        new UpDef { id = Up.Carry, name = "Geniş Sepet", desc = "Sen ve temizlikçiler aynı anda daha çok çarşaf taşırsınız.", baseCost = 350, growth = 2.3f, max = 3 },
    };

    public static UpDef Def(Up u)
    {
        foreach (var d in Ups) if (d.id == u) return d;
        return null;
    }

    public static int Lv(Up u) => GameManager.I != null ? GameManager.I.UpLevel(u) : 0;

    public static int UpCost(Up u, int curLevel)
    {
        var d = Def(u);
        return Mathf.RoundToInt(d.baseCost * Mathf.Pow(d.growth, curLevel) / 10f) * 10;
    }

    // ---- Etkiler ----
    public static readonly float[] MagnetRange = { 1.25f, 3.5f, 5.5f, 8f, 11f, 15f };
    public static float Magnet => MagnetRange[Mathf.Clamp(Lv(Up.Magnet), 0, MagnetRange.Length - 1)];
    public static float PlayerSpeed => 5.5f + 1.2f * Lv(Up.Speed);
    public static float CleanMul => 1f + 0.35f * Lv(Up.Clean);
    public static float ServiceMul => 1f + 0.35f * Lv(Up.Service);
    public static float StaffMul => 1f + 0.25f * Lv(Up.StaffSpeed);
    public static float AdsMul => (1f + 0.25f * Lv(Up.Ads)) * (0.7f + 0.1f * Stars) * Seasons.SpawnMul * Events.SpawnMul * (1f + Social.AdsBonus) * Pricing.SpawnMul;
    public static float PatienceMul => 1f + 0.5f * Lv(Up.Comfort);

    public static string Effect(Up u, int lv)
    {
        switch (u)
        {
            case Up.Magnet: return lv == 0 ? "Kapalı" : "Menzil " + MagnetRange[Mathf.Min(lv, 5)].ToString("0.#", TR) + " m";
            case Up.Speed: return "Hız +" + (lv * 22) + "%";
            case Up.Clean: return "Temizlik +" + (lv * 35) + "%";
            case Up.Service: return "Resepsiyon +" + (lv * 35) + "%";
            case Up.Breakfast: return "Oda fiyatı +" + (lv * 15) + "%";
            case Up.Tips: return "Bahşiş +" + (lv * 30) + "%";
            case Up.Ads: return "Misafir +" + (lv * 25) + "%";
            case Up.Comfort: return "Sabır +" + (lv * 50) + "%";
            case Up.StaffSpeed: return "Personel +" + (lv * 25) + "%";
            case Up.Laundry: return "Yıkama +" + (lv * 60) + "%, " + (4 + 2 * lv) + " çarşaf/sefer";
            case Up.Carry: return "Sen " + (4 + 3 * lv) + ", personel " + (3 + lv) + " çarşaf";
        }
        return "";
    }
}
