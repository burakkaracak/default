using System.Collections.Generic;
using UnityEngine;

// Kafe: lobinin dogusunda. Odadan cikan misafirler kahve alir, masada oturur.
public class Cafe : MonoBehaviour
{
    public class Seat
    {
        public Vector3 pos, fwd;
        public Customer who;
    }

    public bool Open;
    public MoneyPile pile;
    public string baristaName = "";
    public bool HasBarista => barista != null;
    public readonly StaffStats stats = new StaffStats();
    bool BaristaWorking => HasBarista && !stats.resting;
    public readonly List<Customer> queue = new List<Customer>();
    public readonly List<Seat> seats = new List<Seat>();
    public static readonly Vector3 ServeSpot = new Vector3(14.35f, 0f, -8.05f);

    GameObject sofaGroup, cafeGroup;
    readonly List<Rect> sofaObs = new List<Rect>(), cafeObs = new List<Rect>();
    ProgressPad pad;
    float t;
    Rig barista;
    TextMesh nameTag, bubble;

    public Vector3 Slot(int i) => new Vector3(12.2f - 1.25f * i, 0f, -8.05f);

    public void Build(Transform world, Color wood)
    {
        transform.SetParent(world, false);

        // ---- Kafe acilmadan once: lobi oturma grubu ----
        sofaGroup = new GameObject("LobiOturma");
        sofaGroup.transform.SetParent(transform, false);
        var s = sofaGroup.transform;
        Ob(sofaObs, U.Furn("loungeDesignSofa", s, new Vector3(13.9f, 0, -8f), -90f, 2.2f, new Vector3(1.1f, 1f, 3.2f), new Color(0.32f, 0.47f, 0.72f)));
        Ob(sofaObs, U.Furn("tableCoffeeGlass", s, new Vector3(11.6f, 0, -8f), 90f, 2.2f, new Vector3(1.1f, 0.5f, 1.8f), wood));
        Ob(sofaObs, U.Furn("loungeChair", s, new Vector3(11.6f, 0, -10.6f), 0f, 2.2f, new Vector3(1.1f, 1f, 1.1f), new Color(0.95f, 0.75f, 0.35f)));
        Ob(sofaObs, U.Furn("loungeChair", s, new Vector3(11.6f, 0, -5.4f), 180f, 2.2f, new Vector3(1.1f, 1f, 1.1f), new Color(0.95f, 0.75f, 0.35f)));
        U.Furn("plantSmall1", s, new Vector3(11.6f, 0.5f, -8f), 0f, 3f, new Vector3(0.3f, 0.4f, 0.3f), new Color(0.3f, 0.65f, 0.35f));
        U.Text(s, new Vector3(12.2f, 0.4f, -12.0f), "KAFE · Menüden açılır", 0.045f, new Color(1, 1, 1, 0.6f));

        // ---- Kafe ----
        cafeGroup = new GameObject("Kafe");
        cafeGroup.transform.SetParent(transform, false);
        var c = cafeGroup.transform;
        U.Prim("KafeZemin", c, new Vector3(12.25f, 0.008f, -8.05f), new Vector3(5.5f, 0.02f, 7.2f),
            U.Mat(new Color(0.75f, 0.55f, 0.38f), U.WoodTex, new Vector2(2.5f, 3f), 0.35f, 0f));
        U.Flat("KafeKenar", c, new Vector3(12.25f, 0.004f, -8.05f), new Vector3(5.7f, 0.02f, 7.4f), new Color(0.35f, 0.22f, 0.15f));

        float barTop = 0.92f;
        for (int k = -1; k <= 1; k++)
        {
            var b = U.Furn("kitchenBar", c, new Vector3(13.3f, 0f, -8.05f + k * 0.95f), -90f, 2.2f, new Vector3(0.5f, 0.92f, 0.95f), wood);
            Ob(cafeObs, b);
            barTop = b.max.y;
        }
        Ob(cafeObs, U.Furn("kitchenBarEnd", c, new Vector3(13.3f, 0f, -9.65f), -90f, 2.2f, new Vector3(0.5f, 0.92f, 0.25f), wood));
        Ob(cafeObs, U.Furn("kitchenBarEnd", c, new Vector3(13.3f, 0f, -6.45f), -90f, 2.2f, new Vector3(0.5f, 0.92f, 0.25f), wood));
        U.Furn("kitchenCoffeeMachine", c, new Vector3(13.35f, barTop, -7.2f), -90f, 2.4f, new Vector3(0.4f, 0.45f, 0.5f), new Color(0.2f, 0.2f, 0.22f));
        for (int k = 0; k < 4; k++)
            U.Box("Fincan", c, new Vector3(13.3f, barTop + 0.08f, -9.1f + k * 0.22f), new Vector3(0.12f, 0.12f, 0.12f), Color.white, PrimitiveType.Cylinder);
        U.Box("Pasta", c, new Vector3(13.3f, barTop + 0.1f, -8.4f), new Vector3(0.35f, 0.18f, 0.35f), new Color(0.95f, 0.7f, 0.75f), PrimitiveType.Cylinder);
        U.Box("PastaUst", c, new Vector3(13.3f, barTop + 0.2f, -8.4f), Vector3.one * 0.1f, new Color(0.9f, 0.2f, 0.25f), PrimitiveType.Sphere);

        // Tabela
        U.Box("KafeDirek", c, new Vector3(14.9f, 1.4f, -10.2f), new Vector3(0.1f, 2.8f, 0.1f), new Color(0.35f, 0.22f, 0.15f));
        U.Box("KafeDirek", c, new Vector3(14.9f, 1.4f, -5.9f), new Vector3(0.1f, 2.8f, 0.1f), new Color(0.35f, 0.22f, 0.15f));
        U.Box("KafeTabela", c, new Vector3(14.9f, 2.5f, -8.05f), new Vector3(0.12f, 0.7f, 4.5f), new Color(0.35f, 0.22f, 0.15f));
        U.Text(c, new Vector3(14.5f, 2.55f, -8.05f), "KAFE", 0.08f, new Color(1f, 0.88f, 0.6f), true);

        // Masalar ve sandalyeler
        foreach (float z in new[] { -10.7f, -5.4f })
        {
            Ob(cafeObs, U.Furn("tableRound", c, new Vector3(10.6f, 0f, z), 0f, 1.6f, new Vector3(1f, 0.6f, 1.2f), wood));
            foreach (float side in new[] { -1f, 1f })
            {
                var pos = new Vector3(10.6f + side * 1.15f, 0f, z);
                Ob(cafeObs, U.Furn("chairCushion", c, pos, side < 0 ? 90f : -90f, 2.4f, new Vector3(0.5f, 1f, 0.5f), wood));
                seats.Add(new Seat { pos = pos, fwd = side < 0 ? Vector3.right : Vector3.left });
            }
        }
        U.Furn("plantSmall2", c, new Vector3(10.6f, 0.6f, -10.7f), 0f, 3f, new Vector3(0.2f, 0.3f, 0.2f), new Color(0.3f, 0.65f, 0.35f));
        U.Furn("plantSmall2", c, new Vector3(10.6f, 0.6f, -5.4f), 0f, 3f, new Vector3(0.2f, 0.3f, 0.2f), new Color(0.3f, 0.65f, 0.35f));

        pad = new ProgressPad(c, ServeSpot + Vector3.up * 0.02f, 0.65f, new Color(0.65f, 0.4f, 0.25f), new Color(0.3f, 0.95f, 0.5f));
        pile = MoneyPile.Create(c, new Vector3(12.2f, 0f, -10.2f));
        pile.fullAt = 80;
        bubble = U.Text(null, Vector3.zero, "", 0.09f, Color.white, true);
        bubble.gameObject.SetActive(false);
        SetOpen(false, false);
    }

    static void Ob(List<Rect> l, Bounds b) => l.Add(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));

    public void SetOpen(bool o, bool fx)
    {
        Open = o;
        sofaGroup.SetActive(!o);
        cafeGroup.SetActive(o);
        if (fx)
        {
            U.Burst(new Vector3(12f, 1.5f, -8f), new Color(1f, 0.8f, 0.4f), new Color(0.6f, 0.4f, 0.25f), 90, 6f);
            Sfx.Play("unlock");
            GameManager.I.Celebrate("Kafe açıldı!", "Odadan çıkan misafirler artık kahve içmeye gelecek.");
        }
    }

    public bool Blocked(Vector3 p, float r)
    {
        foreach (var o in Open ? cafeObs : sofaObs)
            if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
        return false;
    }

    public bool Join(Customer c)
    {
        if (!Open || queue.Count >= 3) return false;
        queue.Add(c);
        c.GoToCafe(Slot(queue.Count - 1));
        return true;
    }

    public void Remove(Customer c)
    {
        foreach (var s in seats) if (s.who == c) s.who = null;
        if (queue.Remove(c)) Reflow();
    }

    void Reflow()
    {
        for (int i = 0; i < queue.Count; i++) queue[i].GoToCafe(Slot(i));
    }

    public Seat FreeSeat()
    {
        foreach (var s in seats) if (s.who == null) return s;
        return null;
    }

    public void HireBarista(string name, bool fx)
    {
        baristaName = name;
        stats.who = name;
        var g = new GameObject("Barista");
        g.transform.SetParent(cafeGroup.transform, false);
        g.transform.position = new Vector3(14.45f, 0f, -9.0f);
        g.transform.rotation = Quaternion.LookRotation(Vector3.left);
        barista = Rig.Model(g.transform, "character-female-c");
        nameTag = U.Text(g.transform, new Vector3(0, 2.75f, 0), name, 0.06f, Color.white, true);
        nameTag.transform.rotation = U.CamRot;
        if (fx)
        {
            GameManager.I.Notify(name + " kafede işe başladı!");
            GameManager.I.Pop(barista.transform);
        }
    }

    public void Rename(string n)
    {
        baristaName = n;
        stats.who = n;
        if (nameTag) nameTag.text = n;
    }

    void Update()
    {
        if (!Open) return;
        var gm = GameManager.I;
        Customer front = queue.Count > 0 ? queue[0] : null;
        bool playerHere = gm.PlayerNear(ServeSpot, 0.8f);
        bool ready = front != null && front.CafeArrived;
        bool staffed = playerHere || BaristaWorking;

        if (ready && !staffed)
        {
            bubble.gameObject.SetActive(true);
            bubble.text = "Kahve?";
            bubble.color = new Color(1f, 0.85f, 0.5f);
            bubble.transform.position = front.transform.position + Vector3.up * 3f + Vector3.up * Mathf.Sin(Time.time * 5f) * 0.08f;
        }
        else bubble.gameObject.SetActive(false);

        if (HasBarista) stats.Tick(Time.deltaTime, ready && !playerHere && BaristaWorking);
        if (ready && staffed) t += Time.deltaTime * (playerHere ? 1.5f : 0.7f * Eco.StaffMul * stats.Speed) * Eco.ServiceMul;
        else t = Mathf.Max(0f, t - Time.deltaTime);
        pad.Set(t);
        if (barista)
        {
            barista.act = ready && !playerHere && BaristaWorking ? Rig.Act.Clean : Rig.Act.None;
            barista.Tick(0f);
            string want = baristaName + (stats.resting ? " (mola)" : "");
            if (nameTag && nameTag.text != want) nameTag.text = want;
        }

        if (t >= 1f)
        {
            t = 0f;
            queue.RemoveAt(0);
            pile.Add(Eco.CafePrice);
            Quests.Track("cafe");
            if (!playerHere && HasBarista) stats.AddXp(1);
            Sfx.Play("ding", 0.5f);
            gm.FloatText(front.transform.position + Vector3.up * 2.6f, "Kahve!", new Color(1f, 0.85f, 0.6f), 0.08f);
            var seat = FreeSeat();
            if (seat != null) seat.who = front;
            front.CafeServed(seat);
            Reflow();
        }
    }
}
