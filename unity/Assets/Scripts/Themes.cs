using UnityEngine;

// Oda temalari: her oda ayri bir tarzda dosenebilir. Uygun misafir tipi o odada daha mutlu olur.
public static class Themes
{
    public static readonly string[] Names = { "Klasik", "Deniz", "Bohem", "Modern", "Romantik" };
    public static readonly string[] Desc =
    {
        "Otelin varsayılan görünümü.",
        "Beyaz ve mavi, can simidi ve yelkenli. Turistler bayılır.",
        "Toprak tonları, asılı bitkiler ve makrome. Aileler sever.",
        "Gri tonlar, neon ışık ve soyut tablo. İş insanlarının gözdesi.",
        "Pembe tonlar, kalpler ve peri ışıkları. Balayı çiftleri için.",
    };
    public static readonly Color[] Wall =
    {
        Color.clear,
        new Color(0.78f, 0.92f, 0.97f),
        new Color(0.9f, 0.66f, 0.5f),
        new Color(0.55f, 0.58f, 0.63f),
        new Color(0.98f, 0.8f, 0.85f),
    };
    public static readonly Customer.G[] Fan = { Customer.G.Normal, Customer.G.Turist, Customer.G.Aile, Customer.G.Is, Customer.G.Balayi };

    public static int Cost(int roomIndex, int theme) => theme == 0 ? 0 : Mathf.RoundToInt((350 + 90 * roomIndex) / 10f) * 10;

    // Memnuniyete katki: tema her misafire biraz, uygun misafire cok iyi gelir
    public static float Bonus(int theme, Customer.G type)
    {
        if (theme <= 0) return 0f;
        float b = 0.25f;
        if (Fan[theme] == type) b += 0.6f;
        return b;
    }

    public static bool Match(int theme, Customer.G type) => theme > 0 && Fan[theme] == type;
}
