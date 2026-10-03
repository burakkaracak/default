using System.Collections.Generic;
using UnityEngine;

// "Otelgram": misafirlerin otel hakkindaki paylasimlari. Takipci arttikca reklam etkisi artar.
public static class Social
{
    public class Post
    {
        public string author, text;
        public int likes;
        public bool bad;
        public int kind; // 0 misafir, 1 sevindirici, 2 basin/unlu
    }

    public static readonly List<Post> feed = new List<Post>();
    public static int followers = 50;
    public static int unread;
    public static bool open;
    static Vector2 scroll;

    public static float AdsBonus => Mathf.Min(0.6f, followers / 4000f);

    static readonly string[] First = { "ayse", "mehmet", "zeynep", "can", "elif", "emre", "selin", "murat", "deniz", "burcu", "kerem", "ece", "oguz", "melis", "arda", "nehir", "tolga", "irem", "baris", "derya" };
    static readonly string[] Suffix = { "_gezgin", ".travels", "_tatilde", "61", "_istanbul", ".foto", "_yolda", "34", "_kahve", ".blog" };

    static string Handle() => "@" + First[Random.Range(0, First.Length)] + Suffix[Random.Range(0, Suffix.Length)];

    static readonly string[] Good =
    {
        "{otel} gerçekten harika! Oda {oda} tertemizdi, yatak bulut gibi.",
        "Personel çok güler yüzlü. {otel}'e kesinlikle tekrar geleceğim!",
        "Hafta sonu kaçamağı için {otel} birebir. Kahvaltıya bayıldım.",
        "Bu otelin havası başka. Lobide saatlerce oturabilirim.",
        "Resepsiyonda hiç beklemedim, odam hazırdı. Bravo {otel}!",
        "Oda {oda} manzarası ve dekorasyonu çok şık. 10/10",
    };
    static readonly string[] Bad =
    {
        "{otel}'de saatlerce bekledim, kimse ilgilenmedi.",
        "Oda {oda} tozluydu, beklentimin altında kaldı.",
        "Fiyatına göre biraz pahalı geldi açıkçası.",
        "İsteğim unutuldu, kimse gelmedi. Hayal kırıklığı.",
    };
    static readonly string[] PoolPosts = { "Havuz keyfi! {otel}'in havuzu çok temiz.", "Güneş, havuz ve kitap. Tatil tam olarak bu." };
    static readonly string[] CafePosts = { "{otel} kafesinin kahvesi şehrin en iyisi olabilir.", "Kafede pasta ve kahve molası. Mutluluk!" };

    static string Fill(string t, Room r)
    {
        string hotel = GameManager.I != null ? GameManager.I.hotelName : "Otel";
        return t.Replace("{otel}", hotel).Replace("{oda}", r != null ? r.Number.ToString() : "101");
    }

    // Misafir ayrilirken paylasim yapabilir
    public static void OnCheckout(Customer c, float sat, Room r)
    {
        bool celeb = c.celebrity || c.regular != null && c.regular.id == "selin";
        if (celeb)
        {
            Add(c.regular != null ? "@selin.gezer" : "@unlu.sanatci", Fill(sat >= 3.5f ? "Bu gece {otel}'de kaldım. Herkese tavsiye ederim, çok özel bir yer!" : "{otel}... daha iyisini beklerdim.", r),
                sat >= 3.5f ? Random.Range(800, 1600) : Random.Range(300, 700), sat < 3.5f, 2);
            return;
        }
        if (sat >= 4.2f && Random.value < 0.4f)
        {
            string[] l = Good;
            float k = Random.value;
            if (GameManager.I.pool.Open && k < 0.15f) l = PoolPosts;
            else if (GameManager.I.cafe.Open && k < 0.3f) l = CafePosts;
            Add(Handle(), Fill(l[Random.Range(0, l.Length)], r), Likes(1f), false, 0);
        }
        else if (sat <= 2.2f && Random.value < 0.5f)
            Add(Handle(), Fill(Bad[Random.Range(0, Bad.Length)], r), Likes(0.7f), true, 0);
    }

    static int Likes(float k) => Mathf.RoundToInt((Random.Range(8, 30) + followers * Random.Range(0.03f, 0.09f)) * k);

    // Olaylardan gelen paylasim. kind 1 = sevindirici, 2 = basin
    public static void Share(string text, int kind, bool bad)
    {
        int likes = kind == 2 ? Random.Range(400, 900) : kind == 1 ? Likes(2.5f) : Likes(1f);
        Add(kind == 2 ? "@seyahat.dergisi" : Handle(), text, likes, bad, kind);
    }

    public static void Add(string author, string text, int likes, bool bad, int kind)
    {
        var p = new Post { author = author, text = text, likes = likes, bad = bad, kind = kind };
        feed.Insert(0, p);
        while (feed.Count > 25) feed.RemoveAt(feed.Count - 1);
        unread++;
        var gm = GameManager.I;
        if (!bad)
        {
            int gain = Mathf.Max(1, likes / 6);
            followers += gain;
            if (gm) gm.Notify("Otelgram: yeni paylaşım, +" + gain + " takipçi");
        }
        else
        {
            int loss = Mathf.Max(1, likes / 8);
            followers = Mathf.Max(10, followers - loss);
            if (likes > 120)
            {
                Events.SpawnBuff(0.75f, 90f);
                if (gm) gm.Notify("Kötü bir yorum yayıldı! Misafir sayısı geçici olarak düştü");
            }
            else if (gm) gm.Notify("Otelgram: olumsuz bir yorum geldi");
        }
    }

    // ---- Ekran ----
    static GUIStyle head, txt, small;

    public static Rect Button(float s) => new Rect(Screen.width - 210 * s, 104 * s, 190 * s, 58 * s);

    public static void DrawButton(GameManager G, float s, GUIStyle btn)
    {
        var r = Button(s);
        G.Panel(r, new Color(0.85f, 0.35f, 0.6f, 0.95f));
        btn.fontSize = Mathf.RoundToInt(22 * s);
        btn.normal.textColor = Color.white;
        if (GUI.Button(r, "Otelgram", btn)) { open = !open; unread = 0; scroll = Vector2.zero; Sfx.Play("pop", 0.5f); }
        if (unread > 0)
        {
            var badge = new Rect(r.x - 12 * s, r.y - 8 * s, 36 * s, 36 * s);
            GUI.color = U.UI(new Color(0.9f, 0.25f, 0.25f));
            GUI.DrawTexture(badge, U.CircleTex);
            GUI.color = Color.white;
            if (small == null) small = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            small.fontSize = Mathf.RoundToInt(18 * s);
            small.normal.textColor = Color.white;
            GUI.Label(badge, Mathf.Min(unread, 9).ToString(), small);
        }
    }

    public static void DrawFeed(GameManager G, float s)
    {
        if (!open) return;
        if (head == null)
        {
            head = new GUIStyle(GUI.skin.label) { fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleLeft };
            txt = new GUIStyle(GUI.skin.label) { wordWrap = true, alignment = TextAnchor.UpperLeft };
        }
        float w = 470 * s, h = Mathf.Min(Screen.height - 200 * s, 760 * s);
        var r = new Rect(Screen.width - w - 20 * s, 175 * s, w, h);
        G.Panel(r, new Color(0.98f, 0.97f, 0.99f, 0.98f));
        G.Panel(new Rect(r.x, r.y, r.width, 78 * s), new Color(0.85f, 0.35f, 0.6f, 1f));
        head.fontSize = Mathf.RoundToInt(28 * s);
        head.normal.textColor = Color.white;
        GUI.Label(new Rect(r.x + 22 * s, r.y + 4 * s, r.width, 40 * s), "Otelgram", head);
        head.fontSize = Mathf.RoundToInt(18 * s);
        GUI.Label(new Rect(r.x + 22 * s, r.y + 40 * s, r.width, 30 * s), followers.ToString("N0", new System.Globalization.CultureInfo("tr-TR")) + " takipçi  ·  Reklam etkisi +" + Mathf.RoundToInt(AdsBonus * 100) + "%", head);
        if (GUI.Button(new Rect(r.xMax - 70 * s, r.y + 14 * s, 50 * s, 50 * s), "✕", head)) open = false;

        txt.fontSize = Mathf.RoundToInt(19 * s);
        float iw = r.width - 60 * s;
        float total = 0f;
        foreach (var p in feed) total += txt.CalcHeight(new GUIContent(p.text), iw) + 74 * s;
        var area = new Rect(r.x + 10 * s, r.y + 88 * s, r.width - 20 * s, r.height - 98 * s);
        var view = new Rect(0, 0, area.width - 20 * s, Mathf.Max(total, area.height));
        scroll = GUI.BeginScrollView(area, scroll, view);
        float y = 0f;
        if (feed.Count == 0)
        {
            txt.normal.textColor = new Color(0.4f, 0.4f, 0.45f);
            GUI.Label(new Rect(14 * s, 10 * s, iw, 80 * s), "Henüz paylaşım yok. Misafirlerin çok memnun kalırsa otelini paylaşırlar!", txt);
        }
        foreach (var p in feed)
        {
            float th = txt.CalcHeight(new GUIContent(p.text), iw);
            var card = new Rect(4 * s, y, view.width - 8 * s, th + 64 * s);
            G.Panel(card, p.bad ? new Color(1f, 0.9f, 0.9f, 1f) : p.kind == 2 ? new Color(1f, 0.95f, 0.8f, 1f) : new Color(0.93f, 0.94f, 0.98f, 1f));
            head.fontSize = Mathf.RoundToInt(18 * s);
            head.normal.textColor = p.kind == 2 ? new Color(0.75f, 0.5f, 0.05f) : new Color(0.55f, 0.25f, 0.5f);
            GUI.Label(new Rect(card.x + 14 * s, card.y + 4 * s, card.width, 28 * s), p.author, head);
            txt.normal.textColor = new Color(0.15f, 0.15f, 0.2f);
            GUI.Label(new Rect(card.x + 14 * s, card.y + 30 * s, iw, th), p.text, txt);
            head.normal.textColor = p.bad ? new Color(0.75f, 0.3f, 0.3f) : new Color(0.85f, 0.3f, 0.45f);
            GUI.Label(new Rect(card.x + 14 * s, card.yMax - 32 * s, card.width, 28 * s), (p.bad ? "♡ " : "♥ ") + p.likes + " beğeni", head);
            y += card.height + 10 * s;
        }
        GUI.EndScrollView();
    }

    // ---- Kayit ----
    public static void Save(string K)
    {
        Store.SetInt(K + "soc_f", followers);
        var parts = new List<string>();
        for (int i = 0; i < feed.Count && i < 15; i++)
        {
            var p = feed[i];
            parts.Add(Esc(p.author) + "\u001f" + Esc(p.text) + "\u001f" + p.likes + "\u001f" + (p.bad ? 1 : 0) + "\u001f" + p.kind);
        }
        Store.SetString(K + "soc_p", string.Join("\u001e", parts));
    }

    static string Esc(string s) => s.Replace("\u001e", " ").Replace("\u001f", " ");

    public static void Load(string K)
    {
        feed.Clear();
        unread = 0;
        open = false;
        followers = Store.GetInt(K + "soc_f", 50);
        string s = Store.GetString(K + "soc_p", "");
        if (string.IsNullOrEmpty(s)) return;
        foreach (var part in s.Split('\u001e'))
        {
            var f = part.Split('\u001f');
            if (f.Length < 5) continue;
            int.TryParse(f[2], out int likes);
            int.TryParse(f[4], out int kind);
            feed.Add(new Post { author = f[0], text = f[1], likes = likes, bad = f[3] == "1", kind = kind });
        }
    }
}
