using UnityEngine;

// Oda tipleri: Klasik, Ekonomik, Aile, Balayi, Is ve iki Kral Dairesinin birlesmesiyle Baskanlik Suiti.
// Tip; fiyati, temizlik hizini ve hangi misafirin cok mutlu olacagini belirler.
public static class RoomKinds
{
    public const int Klasik = 0, Ekonomik = 1, Aile = 2, Balayi = 3, Is = 4, Suit = 5;
    public const int Selectable = 5; // menude secilebilen tipler (0-4); suit ayri kurulur

    public static readonly string[] Names = { "Klasik", "Ekonomik", "Aile Odası", "Balayı Odası", "İş Odası", "Başkanlık Süiti" };
    public static readonly string[] Short = { "", "Ekonomik", "Aile", "Balayı", "İş", "Başkanlık Süiti" };
    public static readonly string[] Desc =
    {
        "Herkese uygun, normal fiyat.",
        "Gecelik %35 ucuz, temizliği çok hızlı. Turistler bayılır, VIP misafir kalmaz.",
        "Gecelik %25 pahalı. Aileler çok mutlu olur: balonlar ve oyuncak ayı.",
        "Gecelik %30 pahalı. Balayı çiftleri çok mutlu olur. En az Konfor seviye ister.",
        "Gecelik %15 pahalı. İş insanları çok mutlu olur, %50 fazla bahşiş bırakır.",
        "İki Kral Dairesi birleşir. Sadece VIP ve ünlüler kalır, gecelik fiyat çok yüksek."
    };

    public static float PriceMul(int k) => k == Ekonomik ? 0.65f : k == Aile ? 1.25f : k == Balayi ? 1.3f : k == Is ? 1.15f : 1f;
    public static float CleanMul(int k) => k == Ekonomik ? 1.6f : k == Suit ? 0.6f : 1f;
    public static int MinLevel(int k) => k == Balayi ? 2 : k == Suit ? 3 : 1;

    public static int Cost(int roomIdx, int k)
    {
        if (k == Klasik) return 0;
        int b = k == Ekonomik ? 250 : k == Aile ? 900 : k == Balayi ? 1200 : 700;
        return Mathf.RoundToInt(b * (1f + 0.15f * roomIdx) / 10f) * 10;
    }

    public static int SuiteCost(int roomIdx) => Mathf.RoundToInt((15000 + 1500 * roomIdx) / 100f) * 100;

    public static bool Match(int k, Customer.G t) =>
        (k == Ekonomik && t == Customer.G.Turist) || (k == Aile && t == Customer.G.Aile) ||
        (k == Balayi && t == Customer.G.Balayi) || (k == Is && t == Customer.G.Is);

    public static float Bonus(int k, Customer.G t, bool vip)
    {
        switch (k)
        {
            case Ekonomik: return t == Customer.G.Turist ? 0.6f : vip ? -0.8f : -0.15f;
            case Aile: return t == Customer.G.Aile ? 1f : 0f;
            case Balayi: return t == Customer.G.Balayi ? 1f : 0f;
            case Is: return t == Customer.G.Is ? 0.8f : 0f;
            case Suit: return 1.2f;
        }
        return 0f;
    }

    public static float TipMul(int k, Customer.G t) => k == Is && t == Customer.G.Is ? 1.5f : k == Suit ? 2f : 1f;

    public static string Fans(int k) =>
        k == Ekonomik ? "Turistler sever" : k == Aile ? "Aileler sever" : k == Balayi ? "Balayı çiftleri sever" : k == Is ? "İş insanları sever" : "Herkese uygun";

    // Ayni bolumde (lobi, kanat, 2. kat) yan yana iki oda mi?
    public static bool SameSection(int a, int b) => Sec(a) == Sec(b);
    static int Sec(int i) => i < Eco.WingStart ? 0 : i < Eco.Floor2Start ? 1 : 2;
}

// Fiyat politikasi: ucuz cok misafir getirir, luks az ama zengin misafir getirir
public static class Pricing
{
    public static int policy = 1;
    public static readonly string[] Names = { "Ucuz", "Normal", "Pahalı", "Lüks" };
    public static readonly string[] Desc =
    {
        "Fiyatlar %20 düşük. %35 daha çok misafir gelir, herkes biraz daha memnun.",
        "Standart fiyatlar.",
        "Fiyatlar %20 yüksek. %20 daha az misafir. Standart odalarda kalanlar biraz memnuniyetsiz.",
        "Fiyatlar %45 yüksek. Çok daha az ama daha çok VIP misafir. Kral Dairesi dışındaki odalarda kalanlar mutsuz."
    };
    static readonly float[] priceMul = { 0.8f, 1f, 1.2f, 1.45f };
    static readonly float[] spawnMul = { 1.35f, 1f, 0.8f, 0.62f };
    static readonly float[] vipMul = { 0.6f, 1f, 1.4f, 2.2f };

    public static float PriceMul => priceMul[Mathf.Clamp(policy, 0, 3)];
    public static float SpawnMul => spawnMul[Mathf.Clamp(policy, 0, 3)];
    public static float VipMul => vipMul[Mathf.Clamp(policy, 0, 3)];

    // Odanin seviyesine gore fiyat politikasinin memnuniyete etkisi
    public static float Sat(int level)
    {
        switch (policy)
        {
            case 0: return 0.35f;
            case 2: return level >= 2 ? 0f : -0.35f;
            case 3: return level >= 3 ? 0f : -0.6f;
        }
        return 0f;
    }

    public static void Save(string K) => Store.SetInt(K + "price_pol", policy);
    public static void Load(string K) => policy = Mathf.Clamp(Store.GetInt(K + "price_pol", 1), 0, 3);
}
