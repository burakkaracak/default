using System.Collections.Generic;
using UnityEngine;

// Havuz: otelin batisinda acik hava alani. Odadan cikan misafirler yuzer, cikista ucret oder.
public class Pool : MonoBehaviour
{
    public class Spot
    {
        public Vector3 pos;
        public Customer who;
    }

    public bool Open;
    public MoneyPile pile;
    public readonly List<Spot> spots = new List<Spot>();
    public static readonly Vector3 DoorIn = new Vector3(-13.6f, 0f, 1.0f);
    public static readonly Vector3 DoorOut = new Vector3(-16.8f, 0f, 1.0f);
    public const float WaterY = -0.9f;

    GameObject area, locked, doorFill;
    readonly List<Rect> obs = new List<Rect>();
    static readonly Rect Water = Rect.MinMaxRect(-25f, -4f, -18.5f, 2.5f);

    public void Build(Transform world, GameObject westDoorFill)
    {
        transform.SetParent(world, false);
        doorFill = westDoorFill;

        area = new GameObject("Havuz");
        area.transform.SetParent(transform, false);
        var a = area.transform;
        Color stone = new Color(0.93f, 0.9f, 0.84f);
        // Zemin: suyun etrafinda 4 parca (su gorunsun diye)
        var deckM = new Material(U.Mat(stone, U.TileTex, new Vector2(3, 3), 0.4f, 0f));
        Events.RegisterWet(deckM, 0.78f, 0.85f);
        float x0 = -27.8f, x1 = -15.45f, z0 = -7.5f, z1 = 5.5f;
        U.Prim("Zemin", a, new Vector3((x0 + x1) / 2f, -0.03f, (z0 + Water.yMin) / 2f), new Vector3(x1 - x0, 0.1f, Water.yMin - z0), deckM);
        U.Prim("Zemin", a, new Vector3((x0 + x1) / 2f, -0.03f, (Water.yMax + z1) / 2f), new Vector3(x1 - x0, 0.1f, z1 - Water.yMax), deckM);
        U.Prim("Zemin", a, new Vector3((x0 + Water.xMin) / 2f, -0.03f, Water.center.y), new Vector3(Water.xMin - x0, 0.1f, Water.height), deckM);
        U.Prim("Zemin", a, new Vector3((Water.xMax + x1) / 2f, -0.03f, Water.center.y), new Vector3(x1 - Water.xMax, 0.1f, Water.height), deckM);
        // Su yuzeyi (cim ve zeminin ustunde)
        U.Prim("Su", a, new Vector3(Water.center.x, -0.02f, Water.center.y), new Vector3(Water.width, 0.02f, Water.height),
            U.Mat(new Color(0.25f, 0.7f, 0.95f), null, Vector2.one, 0.95f, 0.45f));
        for (int k = 0; k < 6; k++)
            U.Flat("SuIsik", a, new Vector3(Water.xMin + 0.8f + k * 1.05f, 0f, Water.center.y + Mathf.Sin(k * 1.7f) * 1.8f), new Vector3(0.7f, 0.01f, 0.12f), new Color(0.75f, 0.95f, 1f));
        Color rim = Color.white;
        U.Box("Kenar", a, new Vector3(Water.center.x, 0.03f, Water.yMin - 0.15f), new Vector3(Water.width + 0.6f, 0.12f, 0.3f), rim);
        U.Box("Kenar", a, new Vector3(Water.center.x, 0.03f, Water.yMax + 0.15f), new Vector3(Water.width + 0.6f, 0.12f, 0.3f), rim);
        U.Box("Kenar", a, new Vector3(Water.xMin - 0.15f, 0.03f, Water.center.y), new Vector3(0.3f, 0.12f, Water.height), rim);
        U.Box("Kenar", a, new Vector3(Water.xMax + 0.15f, 0.03f, Water.center.y), new Vector3(0.3f, 0.12f, Water.height), rim);
        obs.Add(Rect.MinMaxRect(Water.xMin - 0.1f, Water.yMin - 0.1f, Water.xMax + 0.1f, Water.yMax + 0.1f));
        // Merdiven
        U.Box("Merdiven", a, new Vector3(-19.2f, 0.25f, Water.yMax - 0.1f), new Vector3(0.06f, 0.5f, 0.06f), new Color(0.8f, 0.82f, 0.85f));
        U.Box("Merdiven", a, new Vector3(-18.8f, 0.25f, Water.yMax - 0.1f), new Vector3(0.06f, 0.5f, 0.06f), new Color(0.8f, 0.82f, 0.85f));
        // Simit
        U.Box("Simit", a, new Vector3(-23f, 0.02f, 1.2f), new Vector3(0.9f, 0.08f, 0.9f), new Color(1f, 0.4f, 0.35f), PrimitiveType.Cylinder);

        // Sezlonglar ve semsiyeler
        float[] lx = { -26.2f, -23.9f, -21.6f, -19.3f };
        Color[] uc = { new Color(1f, 0.45f, 0.4f), new Color(0.35f, 0.65f, 0.95f), new Color(1f, 0.8f, 0.3f), new Color(0.45f, 0.8f, 0.5f) };
        for (int i = 0; i < lx.Length; i++)
        {
            var b = U.Furn("loungeChairRelax", a, new Vector3(lx[i], 0f, 4.3f), 180f, 2.2f, new Vector3(1f, 0.8f, 1.6f), Color.white);
            obs.Add(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));
            if (i % 2 == 0)
            {
                float ux = lx[i] + 1.15f;
                U.Box("SemsiyeDirek", a, new Vector3(ux, 1.2f, 4.6f), new Vector3(0.07f, 1.2f, 0.07f), Color.white, PrimitiveType.Cylinder);
                U.Box("Semsiye", a, new Vector3(ux, 2.35f, 4.6f), new Vector3(2.2f, 0.12f, 2.2f), uc[i], PrimitiveType.Cylinder);
                U.Box("SemsiyeTepe", a, new Vector3(ux, 2.45f, 4.6f), new Vector3(0.9f, 0.12f, 0.9f), Color.white, PrimitiveType.Cylinder);
                obs.Add(Rect.MinMaxRect(ux - 0.1f, 4.5f, ux + 0.1f, 4.7f));
            }
        }
        // Bitkiler ve cit
        foreach (var p in new[] { new Vector3(-27.2f, 0, -6.8f), new Vector3(-27.2f, 0, 4.9f), new Vector3(-16.2f, 0, -6.8f) })
        {
            var b = U.Furn("pottedPlant", a, p, 0f, 2.6f, new Vector3(0.5f, 1.4f, 0.5f), new Color(0.3f, 0.65f, 0.35f));
            obs.Add(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));
        }
        for (float x = -27.6f; x <= -15.8f; x += 1.2f)
        {
            U.Box("Cit", a, new Vector3(x, 0.4f, -7.4f), new Vector3(0.1f, 0.8f, 0.1f), Color.white);
            U.Box("Cit", a, new Vector3(x, 0.4f, 5.5f), new Vector3(0.1f, 0.8f, 0.1f), Color.white);
        }
        for (float z = -7.4f; z <= 5.5f; z += 1.2f) U.Box("Cit", a, new Vector3(-27.75f, 0.4f, z), new Vector3(0.1f, 0.8f, 0.1f), Color.white);
        U.Box("CitUst", a, new Vector3(-21.7f, 0.7f, -7.4f), new Vector3(11.9f, 0.08f, 0.06f), Color.white);
        U.Box("CitUst", a, new Vector3(-21.7f, 0.7f, 5.5f), new Vector3(11.9f, 0.08f, 0.06f), Color.white);
        U.Box("CitUst", a, new Vector3(-27.75f, 0.7f, -0.95f), new Vector3(0.06f, 0.08f, 12.9f), Color.white);
        U.Text(a, new Vector3(-21.75f, 0.5f, -5.6f), "HAVUZ", 0.09f, new Color(0.2f, 0.45f, 0.7f));
        // Kapi cercevesi
        U.Box("KapiUst", a, new Vector3(-15.25f, 2.4f, 1.0f), new Vector3(0.5f, 0.15f, 2.4f), new Color(0.62f, 0.47f, 0.34f));
        U.Box("KapiDirek", a, new Vector3(-15.25f, 1.2f, -0.1f), new Vector3(0.45f, 2.4f, 0.2f), new Color(0.62f, 0.47f, 0.34f));
        U.Box("KapiDirek", a, new Vector3(-15.25f, 1.2f, 2.1f), new Vector3(0.45f, 2.4f, 0.2f), new Color(0.62f, 0.47f, 0.34f));

        // Yuzme noktalari
        foreach (float sx in new[] { -23.6f, -21.7f, -19.8f })
            foreach (float sz in new[] { -2.4f, 0.9f })
                spots.Add(new Spot { pos = new Vector3(sx, WaterY, sz) });

        // Kilitliyken: insaat tabelasi
        locked = new GameObject("HavuzKilitli");
        locked.transform.SetParent(transform, false);
        U.Box("TabelaDirek", locked.transform, new Vector3(-17.5f, 0.6f, 1f), new Vector3(0.1f, 1.2f, 0.1f), new Color(0.5f, 0.35f, 0.2f));
        U.Box("Tabela", locked.transform, new Vector3(-17.5f, 1.3f, 1f), new Vector3(0.1f, 0.6f, 2.2f), new Color(1f, 0.85f, 0.3f));
        U.Text(locked.transform, new Vector3(-17.5f, 1.35f, 0.6f), "YAKINDA\nHAVUZ", 0.05f, new Color(0.25f, 0.18f, 0.05f));

        pile = MoneyPile.Create(transform, new Vector3(-13.9f, 0f, -0.6f));
        pile.fullAt = 100;
        SetOpen(false, false);
    }

    public void SetOpen(bool o, bool fx)
    {
        Open = o;
        area.SetActive(o);
        locked.SetActive(!o);
        if (doorFill) doorFill.SetActive(!o);
        if (fx)
        {
            U.Burst(new Vector3(-21.7f, 1f, -1f), new Color(0.4f, 0.8f, 1f), Color.white, 120, 7f);
            Sfx.Play("unlock");
            GameManager.I.Celebrate("Havuz açıldı!", "Misafirler odadan çıkınca yüzmeye gidecek, çıkışta ücret bırakacak.");
        }
    }

    // Oyuncunun yurueyebilecegi alan (havuz acikken)
    public bool InArea(Vector3 p, float r)
    {
        if (!Open) return false;
        bool door = p.x > -15.8f && p.x < -14.6f && p.z > 0.0f + r && p.z < 2.0f - r;
        bool deck = p.x > -27.6f + r && p.x < -15.45f && p.z > -7.3f + r && p.z < 5.4f - r;
        return door || deck;
    }

    public bool Blocked(Vector3 p, float r)
    {
        if (!Open || p.x > -15.3f) return false;
        foreach (var o in obs)
            if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
        return false;
    }

    public Spot Join(Customer c)
    {
        if (!Open) return null;
        foreach (var s in spots)
            if (s.who == null) { s.who = c; return s; }
        return null;
    }

    public void Leave(Spot s, bool paid)
    {
        if (s != null) s.who = null;
        if (paid)
        {
            pile.Add(Eco.PoolPrice);
            Quests.Track("pool");
        }
    }
}
