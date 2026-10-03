using System.Collections.Generic;
using UnityEngine;

// Gun sonu raporu: gunun geliri, giderleri (maas, elektrik, bakim, camasir) ve son 7 gunun kari
public static class Report
{
    public static int income, bonus, guests, angry, other;
    static float ratingSum;
    static int ratingN;
    public static readonly List<int> history = new List<int>();

    public static void Income(int a) => income += a;
    public static void Bonus(int a) => bonus += a;
    public static void Other(int a) => other += a;
    public static void Guest(float rating) { guests++; ratingSum += rating; ratingN++; }
    public static void Angry() { angry++; ratingSum += 1f; ratingN++; }

    static GameManager G => GameManager.I;

    public class Costs
    {
        public int wages, power, upkeep, laundry, other;
        public int Total => wages + power + upkeep + laundry + other;
    }

    public static Costs Today()
    {
        var c = new Costs();
        if (G.reception.HasStaff) c.wages += G.reception.stats.Wage;
        foreach (var cl in G.cleaners) c.wages += cl.stats.Wage;
        if (G.cafe.HasBarista) c.wages += G.cafe.stats.Wage;
        int rooms = 0, levels = 0;
        foreach (var r in G.rooms) if (r.Unlocked) { rooms++; levels += r.level; }
        c.power = 8 * rooms + (G.cafe.Open ? 25 : 0) + (G.pool.Open ? 45 : 0) + (G.wingOpen ? 20 : 0) + (G.floor2Open ? 35 : 0);
        c.upkeep = 4 * levels + Decor.OwnedCount() * 3;
        c.laundry = Laundry.I != null ? Laundry.I.washesToday * 4 : 0;
        c.other = other;
        return c;
    }

    // Saat 06:00'da cagrilir: dunun raporu
    public static void EndOfDay(int finishedDay)
    {
        var c = Today();
        int fixedCosts = c.Total - c.other; // diger giderler zaten odendi
        int paid = Mathf.Min(G.money, fixedCosts);
        G.money -= paid;
        bool shortPay = paid < fixedCosts;
        if (shortPay) G.StaffMoraleAll(-0.2f);

        int profit = income + bonus - c.Total;
        history.Add(profit);
        while (history.Count > 7) history.RemoveAt(0);
        float avg = ratingN > 0 ? ratingSum / ratingN : 0f;

        string weatherShown = Events.WNames[(int)Events.weather];
        int incomeShown = income, bonusShown = bonus, guestsShown = guests, angryShown = angry;
        var tr = new System.Globalization.CultureInfo("tr-TR");
        var p = Popups.Show("Gün " + finishedDay + " raporu", null, "GÜN SONU");
        p.customH = 470f;
        p.custom = (r, s) => DrawReport(r, s, incomeShown, bonusShown, c, profit, guestsShown, angryShown, avg, shortPay, tr, weatherShown);
        p.Add("Yeni güne başla!", null, Popups.Gold);

        income = bonus = guests = angry = other = 0;
        ratingSum = 0f;
        ratingN = 0;
        if (Laundry.I) Laundry.I.washesToday = 0;
    }

    static GUIStyle l, rgt, hd;

    static void DrawReport(Rect r, float s, int inc, int bon, Costs c, int profit, int guests, int angry, float avg, bool shortPay, System.Globalization.CultureInfo tr, string weather)
    {
        if (l == null)
        {
            l = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleLeft };
            rgt = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleRight, fontStyle = FontStyle.Bold };
            hd = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleLeft, fontStyle = FontStyle.Bold };
        }
        l.fontSize = rgt.fontSize = Mathf.RoundToInt(21 * s);
        hd.fontSize = Mathf.RoundToInt(22 * s);
        float lh = 30 * s;
        float half = r.width / 2f - 14 * s;
        // Sol: gelir-gider
        float y = r.y;
        Color green = new Color(0.55f, 0.95f, 0.55f), red = new Color(1f, 0.6f, 0.55f), white = Color.white;
        hd.normal.textColor = new Color(1f, 0.86f, 0.42f);
        GUI.Label(new Rect(r.x, y, half, lh), "GELİR", hd); y += lh;
        Row(r.x, ref y, half, lh, "Konaklama ve satışlar", "+" + Eco.TL(inc), green);
        Row(r.x, ref y, half, lh, "Ödüller", "+" + Eco.TL(bon), green);
        y += 8 * s;
        GUI.Label(new Rect(r.x, y, half, lh), "GİDER", hd); y += lh;
        Row(r.x, ref y, half, lh, "Maaşlar", "-" + Eco.TL(c.wages), red);
        Row(r.x, ref y, half, lh, "Elektrik ve su", "-" + Eco.TL(c.power), red);
        Row(r.x, ref y, half, lh, "Bakım", "-" + Eco.TL(c.upkeep), red);
        Row(r.x, ref y, half, lh, "Çamaşır (deterjan)", "-" + Eco.TL(c.laundry), red);
        if (c.other > 0) Row(r.x, ref y, half, lh, "Diğer (olaylar)", "-" + Eco.TL(c.other), red);
        y += 6 * s;
        Line(new Rect(r.x, y, half, 2 * s), new Color(1, 1, 1, 0.3f));
        y += 10 * s;
        hd.normal.textColor = profit >= 0 ? green : red;
        GUI.Label(new Rect(r.x, y, half, lh + 6 * s), "NET KÂR", hd);
        rgt.fontSize = Mathf.RoundToInt(26 * s);
        rgt.normal.textColor = profit >= 0 ? green : red;
        GUI.Label(new Rect(r.x, y, half, lh + 6 * s), (profit >= 0 ? "+" : "-") + Eco.TL(Mathf.Abs(profit)), rgt);
        rgt.fontSize = Mathf.RoundToInt(21 * s);
        y += lh + 14 * s;
        if (shortPay)
        {
            l.normal.textColor = red;
            l.wordWrap = true;
            GUI.Label(new Rect(r.x, y, half, 2 * lh), "Kasada yeterli para yoktu, maaşlar eksik ödendi. Personelin morali düştü!", l);
            l.wordWrap = false;
        }

        // Sag: misafir ozeti ve 7 gunluk grafik
        float x = r.x + r.width / 2f + 14 * s;
        y = r.y;
        hd.normal.textColor = new Color(1f, 0.86f, 0.42f);
        GUI.Label(new Rect(x, y, half, lh), "MİSAFİRLER", hd); y += lh;
        Row(x, ref y, half, lh, "Ağırlanan misafir", guests.ToString(), white);
        Row(x, ref y, half, lh, "Beklemekten bıkıp giden", angry.ToString(), white);
        Row(x, ref y, half, lh, "Ortalama puan", avg > 0 ? avg.ToString("0.0", tr) + " ★" : "-", white);
        Row(x, ref y, half, lh, "Hava", weather, white);
        y += 12 * s;
        GUI.Label(new Rect(x, y, half, lh), "SON 7 GÜN (net kâr)", hd); y += lh + 6 * s;
        var chart = new Rect(x, y, half, r.yMax - y - 6 * s);
        G.Panel(chart, new Color(1, 1, 1, 0.06f));
        int max = 1;
        foreach (var v in history) max = Mathf.Max(max, Mathf.Abs(v));
        int n = history.Count;
        if (n > 0)
        {
            float bw = (chart.width - 20 * s) / 7f;
            float mid = chart.y + chart.height * 0.62f;
            float up = mid - chart.y - 10 * s, down = chart.yMax - mid - 10 * s;
            for (int i = 0; i < n; i++)
            {
                int v = history[i];
                float hh = v >= 0 ? up * v / max : down * -v / max;
                var bar = v >= 0 ? new Rect(chart.x + 10 * s + i * bw + 4 * s, mid - hh, bw - 8 * s, Mathf.Max(2 * s, hh))
                                 : new Rect(chart.x + 10 * s + i * bw + 4 * s, mid, bw - 8 * s, Mathf.Max(2 * s, hh));
                Line(bar, i == n - 1 ? new Color(1f, 0.78f, 0.25f, 1f) : v >= 0 ? new Color(0.45f, 0.85f, 0.5f, 1f) : new Color(0.95f, 0.5f, 0.45f, 1f));
            }
            Line(new Rect(chart.x + 6 * s, mid, chart.width - 12 * s, 2 * s), new Color(1, 1, 1, 0.35f));
        }
    }

    static void Line(Rect r, Color c)
    {
        GUI.color = U.UI(c);
        GUI.DrawTexture(r, Texture2D.whiteTexture);
        GUI.color = Color.white;
    }

    static void Row(float x, ref float y, float w, float lh, string a, string b, Color col)
    {
        l.normal.textColor = new Color(0.85f, 0.88f, 0.95f);
        rgt.normal.textColor = col;
        GUI.Label(new Rect(x, y, w, lh), a, l);
        GUI.Label(new Rect(x, y, w, lh), b, rgt);
        y += lh;
    }

    public static void Save(string K)
    {
        Store.SetString(K + "rep_today", income + ";" + bonus + ";" + guests + ";" + angry + ";" + other + ";" +
            ratingSum.ToString(System.Globalization.CultureInfo.InvariantCulture) + ";" + ratingN);
        Store.SetString(K + "rep_hist", string.Join(";", history));
    }

    public static void Load(string K)
    {
        income = bonus = guests = angry = other = 0;
        ratingSum = 0f;
        ratingN = 0;
        history.Clear();
        var t = Store.GetString(K + "rep_today", "").Split(';');
        if (t.Length >= 7)
        {
            int.TryParse(t[0], out income);
            int.TryParse(t[1], out bonus);
            int.TryParse(t[2], out guests);
            int.TryParse(t[3], out angry);
            int.TryParse(t[4], out other);
            float.TryParse(t[5], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out ratingSum);
            int.TryParse(t[6], out ratingN);
        }
        foreach (var v in Store.GetString(K + "rep_hist", "").Split(';'))
            if (int.TryParse(v, out int x)) history.Add(x);
    }
}
