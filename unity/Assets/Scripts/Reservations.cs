using System.Collections.Generic;
using UnityEngine;

// Telefonla gelen rezervasyonlar: kabul edersen kapora hemen kasaya girer,
// misafir belirtilen saatte gelir ve istedigi seviyede bos oda bekler.
public static class Reservations
{
    public class R
    {
        public string name;
        public Customer.G type;
        public int level, day, deposit, state; // state: 0 bekleniyor, 1 geldi, 2 yerlesti, 3 iptal/gelmedi
        public float time;
    }

    public static readonly List<R> list = new List<R>();
    static readonly List<float> calls = new List<float>();
    static int callDay = -1;

    static readonly string[] First = { "Ahmet", "Ayşe", "Mehmet", "Fatma", "Ali", "Zeynep", "Hasan", "Elif", "Hüseyin", "Merve", "Burak", "Ceren", "Kemal", "Gizem", "Onur", "Derya", "Serkan", "Pınar", "Tarık", "Sevgi" };
    static readonly string[] Last = { "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Öztürk", "Arslan", "Doğan", "Koç", "Kurt", "Polat", "Erdem", "Aksoy" };
    static readonly string[] TypeNames = { "Misafir", "İş insanı", "Turist", "Balayı çifti", "Aile" };

    static GameManager G => GameManager.I;

    public static string Clock(float t)
    {
        int m = Mathf.FloorToInt(t * 24f * 60f) % (24 * 60);
        m = m / 15 * 15;
        return (m / 60).ToString("00") + ":" + (m % 60).ToString("00");
    }

    static int MaxLevel()
    {
        int mx = 0;
        foreach (var r in G.rooms) if (r.Unlocked && !r.IsSuitePart) mx = Mathf.Max(mx, r.level);
        return mx;
    }

    // Her sabah: gunun telefonlari planlanir
    public static void NewDay(int day)
    {
        list.Clear();
        ScheduleFrom(day, 0f);
    }

    public static bool Scheduled => callDay >= 0;

    // Gunun kalan saatleri icin telefonlari planla
    public static void ScheduleFrom(int day, float now)
    {
        calls.Clear();
        callDay = day;
        if (day < 3 || G.Unlocked() < 4) return;
        float a = Mathf.Max(0.28f, now + 0.02f), b = 0.62f;
        if (a >= b) return;
        int n = G.Unlocked() >= 8 ? Random.Range(1, 4) : Random.Range(1, 3);
        for (int i = 0; i < n; i++) calls.Add(Random.Range(a, b));
        calls.Sort();
    }

    public static void Tick()
    {
        if (G == null || G.MenuOpen || Popups.Open) return;
        float t = G.dayNight.time;
        if (callDay == G.dayNight.day && calls.Count > 0 && t >= calls[0])
        {
            calls.RemoveAt(0);
            Call(t);
            if (calls.Count > 0 && calls[0] < t + 0.05f) calls[0] = t + 0.05f; // telefonlar ust uste gelmesin
            return;
        }
        foreach (var r in list)
            if (r.state == 0 && r.day == G.dayNight.day && t >= r.time)
            {
                Arrive(r);
                break;
            }
    }

    public static void CallNow() => Call(Mathf.Min(G.dayNight.time, 0.6f)); // test icin

    static void Call(float now)
    {
        int mx = MaxLevel();
        if (mx <= 0) return;
        var r = new R();
        r.name = First[Random.Range(0, First.Length)] + " " + Last[Random.Range(0, Last.Length)].Substring(0, 1) + ".";
        float k = Random.value;
        r.type = k < 0.3f ? Customer.G.Is : k < 0.5f ? Customer.G.Balayi : k < 0.7f ? Customer.G.Aile : k < 0.85f ? Customer.G.Turist : Customer.G.Normal;
        float l = Random.value;
        r.level = Mathf.Min(mx, l < 0.3f ? 1 : l < 0.75f ? 2 : 3);
        if (r.type == Customer.G.Balayi) r.level = Mathf.Min(mx, Mathf.Max(r.level, 2));
        r.time = Mathf.Min(0.88f, now + Random.Range(0.1f, 0.24f));
        r.day = G.dayNight.day;
        int price = 0, cnt = 0;
        foreach (var rm in G.rooms)
            if (rm.Unlocked && !rm.IsSuitePart && rm.level >= r.level) { price += rm.Price; cnt++; }
        price = cnt > 0 ? price / cnt : 50;
        r.deposit = Mathf.Max(10, Mathf.RoundToInt(price * 0.3f / 10f) * 10);

        string lvName = Eco.LevelNames[r.level];
        Popups.Show("Telefon çalıyor!",
                r.name + " (" + TypeNames[(int)r.type] + ") bugün saat " + Clock(r.time) + " için " + lvName + " ya da daha iyi bir oda ayırtmak istiyor.\n\n" +
                "Kapora: " + Eco.TL(r.deposit) + " (hemen kasaya girer)\nGelince gecelik ücretin %20 fazlasını öder.\n\n" +
                "Dikkat: Geldiğinde uygun oda boş olmalı. Çok beklerse kaporayı geri ister ve kötü yorum yazar.", "REZERVASYON")
            .Add("Kabul et  +" + Eco.TL(r.deposit), () =>
            {
                list.Add(r);
                G.money += r.deposit;
                Report.Income(r.deposit);
                Sfx.Play("coin");
                G.Notify(Clock(r.time) + " · " + r.name + " için " + lvName + " oda ayrıldı");
                G.Save();
            }, Popups.Green)
            .Add("Kibarca reddet", null, Popups.Grey);
    }

    static void Arrive(R r)
    {
        r.state = 1;
        if (Random.value < 0.07f)
        {
            r.state = 3;
            G.Notify(r.name + " gelmedi. Kapora sende kaldı.");
            return;
        }
        G.QueueSpawn(new Customer.Config { type = r.type, reservation = r });
        G.Notify("Rezervasyonlu misafir geliyor: " + r.name);
    }

    public static void OnCheckIn(Customer c)
    {
        if (c.reservation == null) return;
        c.reservation.state = 2;
        Story.Track("reservation");
    }

    public static void OnAngry(Customer c)
    {
        var r = c.reservation;
        if (r == null) return;
        r.state = 3;
        G.Spend(r.deposit, "Kapora iadesi");
        G.Notify(r.name + " odasız kaldı, kaporayı geri aldı");
        Social.Share("Rezervasyon yaptırdım ama gelince oda yoktu! " + G.hotelName + "'e güvenmeyin.", 0, true);
    }

    // Ekranda gosterilecek bekleyen rezervasyonlar
    public static int Pending
    {
        get
        {
            int n = 0;
            foreach (var r in list) if (r.state <= 1) n++;
            return n;
        }
    }

    public static void Save(string K)
    {
        var parts = new List<string>();
        foreach (var r in list)
            parts.Add(r.name.Replace("|", " ").Replace(";", " ") + "|" + (int)r.type + "|" + r.level + "|" +
                      r.time.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|" + r.day + "|" + r.deposit + "|" + r.state);
        Store.SetString(K + "res_list", string.Join(";", parts));
        var c = new List<string>();
        foreach (var t in calls) c.Add(t.ToString(System.Globalization.CultureInfo.InvariantCulture));
        Store.SetString(K + "res_calls", callDay + ";" + string.Join(";", c));
    }

    public static void Load(string K, int day)
    {
        list.Clear();
        calls.Clear();
        callDay = -1;
        foreach (var part in Store.GetString(K + "res_list", "").Split(';'))
        {
            var f = part.Split('|');
            if (f.Length < 7) continue;
            var r = new R { name = f[0] };
            int.TryParse(f[1], out int ty);
            r.type = (Customer.G)Mathf.Clamp(ty, 0, 4);
            int.TryParse(f[2], out r.level);
            float.TryParse(f[3], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out r.time);
            int.TryParse(f[4], out r.day);
            int.TryParse(f[5], out r.deposit);
            int.TryParse(f[6], out r.state);
            if (r.day != day) continue;
            if (r.state == 1) r.state = 0; // yolda olan misafir yeniden gelsin
            list.Add(r);
        }
        var cs = Store.GetString(K + "res_calls", "").Split(';');
        if (cs.Length > 0 && int.TryParse(cs[0], out int cd) && cd == day)
        {
            callDay = cd;
            for (int i = 1; i < cs.Length; i++)
                if (float.TryParse(cs[i], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float t)) calls.Add(t);
        }
    }
}
