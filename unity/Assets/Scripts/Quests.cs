using System;
using System.Collections.Generic;
using UnityEngine;

// Hikaye gorevleri ve gunluk hedefler
public static class Quests
{
    public static readonly string[] Keys = { "served", "cleaned", "earned", "requests", "cafe", "pool", "vip" };
    static readonly Dictionary<string, int> total = new Dictionary<string, int>();
    static readonly Dictionary<string, int> today = new Dictionary<string, int>();

    static GameManager G => GameManager.I;

    public static void Track(string k, int n = 1)
    {
        total[k] = Total(k) + n;
        today[k] = Today(k) + n;
        global::Story.Track(k, n); // hikaye modu ilerlemesi
    }

    public static int Total(string k) => total.TryGetValue(k, out var v) ? v : 0;
    public static int Today(string k) => today.TryGetValue(k, out var v) ? v : 0;

    // ---------------- Hikaye gorevleri ----------------
    public class Story
    {
        public string text;
        public Func<int> cur;
        public int target, reward;
    }

    static int Unlocked() { int n = 0; foreach (var r in G.rooms) if (r.Unlocked) n++; return n; }
    static int MaxLevel() { int m = 0; foreach (var r in G.rooms) m = Mathf.Max(m, r.level); return m; }
    static int CountLevel(int l) { int n = 0; foreach (var r in G.rooms) if (r.level >= l) n++; return n; }

    public static readonly Story[] Line =
    {
        new Story { text = "3 misafir ağırla", cur = () => Total("served"), target = 3, reward = 40 },
        new Story { text = "Bir odayı temizle", cur = () => Total("cleaned"), target = 1, reward = 40 },
        new Story { text = "Oda 102'yi aç", cur = () => Unlocked(), target = 2, reward = 80 },
        new Story { text = "Toplam 10 misafir ağırla", cur = () => Total("served"), target = 10, reward = 100 },
        new Story { text = "Resepsiyonist işe al", cur = () => G.reception.HasStaff ? 1 : 0, target = 1, reward = 120 },
        new Story { text = "Bir odayı Konfor seviyesine yükselt", cur = () => MaxLevel() >= 2 ? 1 : 0, target = 1, reward = 150 },
        new Story { text = "Para Mıknatısı satın al", cur = () => G.UpLevel(Eco.Up.Magnet), target = 1, reward = 150 },
        new Story { text = "Bir misafir isteğini karşıla", cur = () => Total("requests"), target = 1, reward = 120 },
        new Story { text = "Temizlikçi işe al", cur = () => G.cleaners.Count, target = 1, reward = 200 },
        new Story { text = "Kafeyi aç", cur = () => G.cafe.Open ? 1 : 0, target = 1, reward = 250 },
        new Story { text = "Kafede 10 kahve sat", cur = () => Total("cafe"), target = 10, reward = 300 },
        new Story { text = "Otel 3,5 yıldıza ulaşsın", cur = () => Mathf.FloorToInt(G.Stars * 10f + 0.01f), target = 35, reward = 350 },
        new Story { text = "Bir Kral Dairesi yap", cur = () => MaxLevel() >= 3 ? 1 : 0, target = 1, reward = 500 },
        new Story { text = "4 oda aç", cur = () => Unlocked(), target = 4, reward = 500 },
        new Story { text = "Havuzu aç", cur = () => G.pool.Open ? 1 : 0, target = 1, reward = 700 },
        new Story { text = "Bir VIP misafir ağırla", cur = () => Total("vip"), target = 1, reward = 600 },
        new Story { text = "6 odanın hepsini aç", cur = () => Mathf.Min(Unlocked(), 6), target = 6, reward = 900 },
        new Story { text = "Yeni Kanadı aç", cur = () => G.wingOpen ? 1 : 0, target = 1, reward = 1500 },
        new Story { text = "Toplam 200 misafir ağırla", cur = () => Total("served"), target = 200, reward = 1500 },
        new Story { text = "Otel 5 yıldız olsun", cur = () => Mathf.FloorToInt(G.Stars * 10f + 0.01f), target = 48, reward = 3000 },
        new Story { text = "10 odanın hepsi Kral Dairesi olsun", cur = () => CountLevel(3), target = 10, reward = 10000 },
    };

    public static int storyIndex;
    public static Story Current => storyIndex < Line.Length ? Line[storyIndex] : null;
    public static bool CurrentDone => Current != null && Current.cur() >= Current.target;

    public static void ClaimStory()
    {
        if (!CurrentDone) return;
        G.Reward(Current.reward, "Görev tamamlandı!", Current.text);
        storyIndex++;
        G.Save();
    }

    // ---------------- Gunluk hedefler ----------------
    public class Daily
    {
        public string key;
        public int target, reward;
        public bool claimed;
        public string Text
        {
            get
            {
                switch (key)
                {
                    case "served": return target + " misafir ağırla";
                    case "earned": return Eco.TL(target) + " kazan";
                    case "cleaned": return target + " oda temizle";
                    case "requests": return target + " misafir isteği karşıla";
                    case "cafe": return "Kafede " + target + " kahve sat";
                    case "pool": return "Havuza " + target + " misafir gelsin";
                    case "vip": return target + " VIP misafir ağırla";
                }
                return key;
            }
        }
        public int Cur => Mathf.Min(Today(key), target);
        public bool Done => Today(key) >= target;
    }

    public static readonly List<Daily> daily = new List<Daily>();

    public static void NewDay()
    {
        today.Clear();
        daily.Clear();
        int rooms = Mathf.Max(1, Unlocked());
        var pool = new List<Daily>
        {
            new Daily { key = "served", target = 5 + 3 * rooms },
            new Daily { key = "earned", target = 120 * rooms },
            new Daily { key = "cleaned", target = 3 + 2 * rooms },
            new Daily { key = "requests", target = 2 + rooms / 2 },
        };
        if (G.cafe.Open) pool.Add(new Daily { key = "cafe", target = 4 + rooms });
        if (G.pool.Open) pool.Add(new Daily { key = "pool", target = 3 + rooms / 2 });
        if (MaxLevel() >= 2) pool.Add(new Daily { key = "vip", target = 1 + rooms / 4 });
        var rnd = new System.Random(G.dayNight.day * 7919);
        while (daily.Count < 3 && pool.Count > 0)
        {
            int i = rnd.Next(pool.Count);
            var d = pool[i];
            pool.RemoveAt(i);
            d.reward = Mathf.RoundToInt((50 + 45 * rooms) / 10f) * 10;
            daily.Add(d);
        }
    }

    public static void ClaimDaily(Daily d)
    {
        if (d.claimed || !d.Done) return;
        d.claimed = true;
        G.Reward(d.reward, "Günlük hedef tamam!", d.Text);
        G.Save();
    }

    public static int ReadyCount()
    {
        int n = CurrentDone ? 1 : 0;
        foreach (var d in daily) if (d.Done && !d.claimed) n++;
        return n;
    }

    // ---------------- Kayit ----------------
    public static void Save(string K)
    {
        Store.SetInt(K + "story", storyIndex);
        foreach (var k in Keys)
        {
            Store.SetInt(K + "tot_" + k, Total(k));
            Store.SetInt(K + "day_" + k, Today(k));
        }
        var parts = new List<string>();
        foreach (var d in daily) parts.Add(d.key + ":" + d.target + ":" + d.reward + ":" + (d.claimed ? 1 : 0));
        Store.SetString(K + "daily", string.Join("|", parts));
    }

    public static void Load(string K)
    {
        total.Clear();
        today.Clear();
        daily.Clear();
        storyIndex = Store.GetInt(K + "story", 0);
        foreach (var k in Keys)
        {
            total[k] = Store.GetInt(K + "tot_" + k, 0);
            today[k] = Store.GetInt(K + "day_" + k, 0);
        }
        string s = Store.GetString(K + "daily", "");
        if (!string.IsNullOrEmpty(s))
            foreach (var p in s.Split('|'))
            {
                var f = p.Split(':');
                if (f.Length < 4) continue;
                daily.Add(new Daily { key = f[0], target = int.Parse(f[1]), reward = int.Parse(f[2]), claimed = f[3] == "1" });
            }
    }
}
