using System.Collections.Generic;
using UnityEngine;

// Resepsiyon: ayakta sira + bekleme salonu; siradakini bos odaya yerlestirir
public class Reception : MonoBehaviour
{
    public class Seat
    {
        public Vector3 pos, fwd;
        public Customer who;
    }

    public const int StandSlots = 3;
    public readonly List<Customer> queue = new List<Customer>();
    public readonly List<Customer> waiting = new List<Customer>();
    public readonly List<Seat> seats = new List<Seat>();
    public Vector3 servicePos = new Vector3(-6f, 0f, -3.6f);
    public bool HasStaff => staff != null;
    public readonly StaffStats stats = new StaffStats();
    bool StaffWorking => HasStaff && !stats.resting;
    public string staffName = "";

    ProgressPad pad;
    float t;
    TextMesh bubble, nameTag;
    Rig staff;

    public int Capacity => StandSlots + seats.Count;
    public int Count => queue.Count + waiting.Count;

    public void Init(Transform world)
    {
        transform.SetParent(world, false);
        pad = new ProgressPad(transform, servicePos, 0.75f, new Color(0.95f, 0.7f, 0.28f), new Color(0.3f, 0.95f, 0.5f));
        bubble = U.Text(null, Vector3.zero, "", 0.1f, Color.white, true);
        bubble.gameObject.SetActive(false);
    }

    public Vector3 Slot(int i) => new Vector3(-6f, 0f, -6.6f - i * 1.3f);

    public void Enqueue(Customer c)
    {
        // Rezervasyonlu misafir siranin onune gecer (o an islem goreni bekletmez)
        if (c.reservation != null)
        {
            queue.Insert(Mathf.Min(1, queue.Count), c);
            Reflow();
            return;
        }
        if (queue.Count < StandSlots && waiting.Count == 0)
        {
            queue.Add(c);
            c.GoToSlot(Slot(queue.Count - 1));
            return;
        }
        var seat = FreeSeat();
        if (seat != null)
        {
            seat.who = c;
            waiting.Add(c);
            c.GoToSeat(seat);
        }
    }

    Seat FreeSeat()
    {
        foreach (var s in seats) if (s.who == null) return s;
        return null;
    }

    public void Remove(Customer c)
    {
        foreach (var s in seats) if (s.who == c) s.who = null;
        waiting.Remove(c);
        if (queue.Remove(c)) Reflow();
    }

    void Reflow()
    {
        // Bekleme salonundan siraya gecis
        while (queue.Count < StandSlots && waiting.Count > 0)
        {
            var c = waiting[0];
            waiting.RemoveAt(0);
            foreach (var s in seats) if (s.who == c) s.who = null;
            queue.Add(c);
        }
        for (int i = 0; i < queue.Count; i++) queue[i].GoToSlot(Slot(i));
    }

    public void HireReceptionist(string name, bool announce)
    {
        staffName = name;
        stats.who = name;
        var g = new GameObject("Resepsiyonist");
        g.transform.SetParent(transform, false);
        g.transform.position = new Vector3(-7.3f, 0f, -3.9f);
        g.transform.rotation = Quaternion.LookRotation(Vector3.back);
        staff = Rig.Model(g.transform, "character-female-d");
        nameTag = U.Text(g.transform, new Vector3(0, 2.75f, 0), name, 0.06f, Color.white, true);
        nameTag.transform.rotation = U.CamRot;
        if (announce)
        {
            GameManager.I.Notify(name + " resepsiyonda işe başladı!");
            GameManager.I.Pop(staff.transform);
        }
    }

    public void Rename(string name)
    {
        staffName = name;
        stats.who = name;
        if (nameTag) nameTag.text = name;
    }

    void Update()
    {
        var gm = GameManager.I;
        Customer front = queue.Count > 0 ? queue[0] : null;
        bool playerHere = gm.PlayerNear(servicePos, 0.85f);
        bool staffed = playerHere || StaffWorking;
        bool ready = front != null && front.Arrived;
        int pick = -1;
        Room free = null;
        if (ready)
        {
            free = gm.FreeRoomFor(front);
            if (free != null) pick = 0;
            else if (front.MinLevel > 1 && queue.Count > 1 && queue[1].Arrived && queue[1].MinLevel < front.MinLevel)
            {
                // Luks oda bekleyen misafir varken arkadaki misafir alinabilir
                free = gm.FreeRoomFor(queue[1]);
                if (free != null) pick = 1;
            }
        }

        if (ready && pick < 0)
        {
            bool anyFree = gm.FreeRoom(false) != null;
            bubble.gameObject.SetActive(true);
            bubble.text = front.MinLevel > 1 && anyFree ? (front.MinLevel >= 3 ? "Kral Dairesi yok!" : "Lüks oda yok!") : "Oda yok!";
            bubble.color = new Color(1f, 0.5f, 0.45f);
            bubble.transform.position = front.transform.position + Vector3.up * 3.2f;
        }
        else if (ready && !staffed)
        {
            bubble.gameObject.SetActive(true);
            bubble.text = "?";
            bubble.color = new Color(1f, 0.85f, 0.3f);
            bubble.transform.position = front.transform.position + Vector3.up * 3.0f + Vector3.up * Mathf.Sin(Time.time * 5f) * 0.08f;
        }
        else bubble.gameObject.SetActive(false);

        if (asking) { pad.Set(1f); return; }
        bool working = pick >= 0 && staffed;
        float rate = playerHere ? 1.4f : 0.6f * Eco.StaffMul * stats.Speed;
        if (HasStaff) stats.Tick(Time.deltaTime, working && !playerHere);
        if (working) t += Time.deltaTime * rate * Eco.ServiceMul;
        else t = Mathf.Max(0f, t - Time.deltaTime);
        pad.Set(t);
        if (staff)
        {
            staff.act = working && !playerHere ? Rig.Act.Clean : Rig.Act.None;
            staff.Tick(0f);
            string want = staffName + (stats.resting ? " (mola)" : "");
            if (nameTag && nameTag.text != want) nameTag.text = want;
        }

        if (t >= 1f)
        {
            var guest = queue[pick];
            var better = UpgradeOption(guest, free);
            if (better != null)
            {
                AskUpgrade(guest, free, better, playerHere);
                return;
            }
            t = 0f;
            CheckIn(guest, free, Mathf.RoundToInt(free.Price * guest.PayMul), playerHere);
        }
    }

    void CheckIn(Customer guest, Room room, int pay, bool byPlayer)
    {
        var gm = GameManager.I;
        queue.Remove(guest);
        room.state = Room.State.Reserved;
        guest.GoToRoom(room);
        gm.deskPile.Add(pay);
        if (!byPlayer && HasStaff) stats.AddXp(1);
        if (guest.regular != null) Regulars.OnCheckIn(guest, room);
        Reservations.OnCheckIn(guest);
        gm.served++;
        Quests.Track("served");
        Sfx.Play("ding", 0.7f);
        Reflow();
    }

    // ---------------- Oda yukseltme istekleri ----------------
    // Dengeli siklik: misafirlerin bir kismi sorar, ama arada en az 75 sn ve gunde en fazla 3 kez.
    bool asking;
    public static bool forceAsk; // test icin
    static float nextAsk = 45f;
    static int askDay = -1, asksToday;

    Room UpgradeOption(Customer g, Room given)
    {
        var gm = GameManager.I;
        if (g.askedUpgrade || g.inspector || g.regular != null || g.celebrity || given.IsSuite || given.level >= 3) return null;
        g.askedUpgrade = true;
        if (gm.dayNight.day != askDay) { askDay = gm.dayNight.day; asksToday = 0; }
        if (!forceAsk)
        {
            if (Time.time < nextAsk || asksToday >= 3 || gm.dayNight.day < 2) return null;
            float chance = g.vip ? 0.25f : g.type == Customer.G.Balayi ? 0.22f : g.type == Customer.G.Is ? 0.18f :
                           g.type == Customer.G.Aile ? 0.16f : g.type == Customer.G.Turist ? 0.08f : 0.12f;
            if (Random.value > chance) return null;
        }
        Room best = null;
        foreach (var r in gm.rooms)
        {
            if (r == given || r.state != Room.State.Clean || r.IsSuitePart || r.IsSuite || r.level <= given.level) continue;
            if (r.kind == RoomKinds.Ekonomik) continue;
            if (best == null || r.level > best.level || (r.level == best.level && RoomKinds.Match(r.kind, g.type))) best = r;
        }
        return best;
    }

    void AskUpgrade(Customer g, Room given, Room better, bool byPlayer)
    {
        var gm = GameManager.I;
        asking = true;
        forceAsk = false;
        asksToday++;
        nextAsk = Time.time + 75f;
        string who = g.vip ? "VIP misafir" : g.type == Customer.G.Balayi ? "Balayı çifti" : g.type == Customer.G.Is ? "İş insanı" :
                     g.type == Customer.G.Aile ? "Aile" : g.type == Customer.G.Turist ? "Turist" : "Misafir";
        string line = g.vip ? "Bana daha uygun bir oda ayarlayın lütfen." :
                      g.type == Customer.G.Balayi ? "Balayımızdayız, daha romantik bir oda olabilir mi?" :
                      g.type == Customer.G.Is ? "Yarın önemli bir toplantım var, daha geniş bir oda alabilir miyim?" :
                      g.type == Customer.G.Aile ? "Çocuklarla biraz dar olacak, daha büyük bir odanız var mı?" :
                      g.type == Customer.G.Turist ? "Manzarası daha güzel bir oda var mı acaba?" : "Acaba daha iyi bir odaya geçebilir miyim?";
        int basePay = Mathf.RoundToInt(given.Price * g.PayMul);
        int fullPay = Mathf.RoundToInt(better.Price * g.PayMul);
        int diff = Mathf.Max(0, fullPay - basePay);
        Popups.Show("Oda yükseltme isteği", who + " soruyor:\n\"" + line + "\"\n\n" +
                "Verilen oda: " + Label(given) + " (" + Eco.TL(basePay) + ")\n" +
                "İstediği oda: " + Label(better) + " (" + Eco.TL(fullPay) + ")", "RESEPSİYON")
            .Add("Farkı ödesin, yükselt  +" + Eco.TL(diff), () => Resolve(g, given, better, fullPay, 0.3f, byPlayer, false), Popups.Green)
            .Add("Ücretsiz yükselt (jest)", () => Resolve(g, given, better, basePay, 0.9f, byPlayer, true), Popups.Blue)
            .Add("Kibarca reddet", () => Resolve(g, given, null, basePay, g.vip ? -0.5f : -0.3f, byPlayer, false), Popups.Grey);
    }

    static string Label(Room r) => "Oda " + r.Number + " · " + Eco.LevelNames[r.level] + (r.kind > 0 ? " " + RoomKinds.Short[r.kind] : "");

    void Resolve(Customer g, Room given, Room better, int pay, float sat, bool byPlayer, bool gift)
    {
        asking = false;
        t = 0f;
        if (!g || !queue.Contains(g)) return;
        Room room = better != null && better.state == Room.State.Clean ? better : given;
        if (room.state != Room.State.Clean) return; // oda bu arada doldu: siradaki karede yeniden denenir
        g.satAdj += sat;
        CheckIn(g, room, pay, byPlayer);
        var gm = GameManager.I;
        if (better != null)
        {
            gm.FloatText(g.transform.position + Vector3.up * 2.8f, gift ? "Çok teşekkürler!" : "Harika!", new Color(0.6f, 1f, 0.7f), 0.08f);
            Story.Track("upgrade");
            if (gift && Random.value < 0.5f)
                Social.Share(gm.hotelName + " beni ücretsiz olarak daha iyi bir odaya geçirdi. Ne kadar nazik insanlar!", 1, false);
        }
        else gm.FloatText(g.transform.position + Vector3.up * 2.8f, "Peki...", new Color(1f, 0.75f, 0.6f), 0.08f);
    }
}
