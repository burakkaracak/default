using System.Collections.Generic;
using UnityEngine;

// Lobi dekorasyonu: her yuva icin satin alinabilen secenekler. Her dekor misafir memnuniyetini artirir.
public static class Decor
{
    public class Slot
    {
        public string key, name;
        public string[] opts;
        public int[] costs;
        public int sel;
        public int owned = 1; // bit maskesi (0. secenek ucretsiz)
        public GameObject[] groups;
        public bool Owns(int i) => (owned & (1 << i)) != 0;
    }

    public static readonly Slot[] Slots =
    {
        new Slot { key = "carpet", name = "Lobi halısı", opts = new[] { "Kırmızı", "Lacivert", "Zümrüt", "Altın işlemeli" }, costs = new[] { 0, 300, 300, 900 } },
        new Slot { key = "plants", name = "Giriş bitkileri", opts = new[] { "Saksı bitkisi", "Palmiye", "Çiçek sepeti" }, costs = new[] { 0, 400, 350 } },
        new Slot { key = "corner", name = "Lobi köşesi", opts = new[] { "Boş", "Akvaryum", "Heykel", "Kuyruklu piyano" }, costs = new[] { 0, 800, 600, 1500 } },
        new Slot { key = "light", name = "Lobi aydınlatması", opts = new[] { "Sade", "Kristal avize", "Modern lambalar" }, costs = new[] { 0, 1200, 700 } },
        new Slot { key = "desk", name = "Resepsiyon süsü", opts = new[] { "Çiçekli vazo", "Orkide", "Bonsai", "Altın zil" }, costs = new[] { 0, 250, 350, 500 } },
        new Slot { key = "art", name = "Duvar tabloları", opts = new[] { "Manzara", "Soyut", "Gün batımı" }, costs = new[] { 0, 300, 300 } },
    };

    static Renderer carpet, carpetEdge;
    static readonly List<Renderer> canvases = new List<Renderer>();
    static readonly List<Rect>[] cornerObs = { new List<Rect>(), new List<Rect>(), new List<Rect>(), new List<Rect>() };
    static readonly Vector3 Corner = new Vector3(9.6f, 0f, -0.6f);
    static readonly Color Gold = new Color(0.95f, 0.78f, 0.3f);

    public static float Bonus
    {
        get
        {
            int n = 0;
            foreach (var s in Slots) if (s.sel != 0) n++;
            return n * 0.1f;
        }
    }

    // Satin alinmis (varsayilan disi) parca sayisi: bakim giderinde kullanilir
    public static int OwnedCount()
    {
        int n = 0;
        foreach (var s in Slots)
            for (int i = 1; i < s.opts.Length; i++) if (s.Owns(i)) n++;
        return n;
    }

    // ---------------- Kurulum ----------------
    public static void Build(Transform world, Renderer carpetR, Renderer edgeR, GameObject plantsDefault, GameObject deskDefault, List<Renderer> paintings)
    {
        carpet = carpetR;
        carpetEdge = edgeR;
        canvases.Clear();
        canvases.AddRange(paintings);
        foreach (var l in cornerObs) l.Clear();

        var root = new GameObject("Dekor").transform;
        root.SetParent(world, false);

        // Giris bitkileri
        var plants = Slots[1];
        plants.groups = new GameObject[3];
        plants.groups[0] = plantsDefault;
        plants.groups[1] = Group(root, "Palmiyeler");
        plants.groups[2] = Group(root, "CicekSepetleri");
        foreach (float x in new[] { -3.2f, 3.2f })
        {
            var p = plants.groups[1].transform;
            U.Box("Saksi", p, new Vector3(x, 0.3f, -11.4f), new Vector3(0.8f, 0.3f, 0.8f), new Color(0.9f, 0.88f, 0.84f), PrimitiveType.Cylinder);
            U.Box("Govde", p, new Vector3(x, 1.3f, -11.4f), new Vector3(0.18f, 1.1f, 0.18f), new Color(0.55f, 0.4f, 0.25f), PrimitiveType.Cylinder);
            for (int k = 0; k < 6; k++)
            {
                var leaf = U.Box("Yaprak", p, new Vector3(x + Mathf.Cos(k) * 0.45f, 2.35f, -11.4f + Mathf.Sin(k) * 0.45f), new Vector3(1.1f, 0.06f, 0.3f), new Color(0.25f, 0.6f, 0.3f));
                leaf.transform.localRotation = Quaternion.Euler(0, -k * Mathf.Rad2Deg, -25f);
            }
            var b = plants.groups[2].transform;
            U.Box("Sepet", b, new Vector3(x, 0.35f, -11.4f), new Vector3(0.9f, 0.35f, 0.9f), new Color(0.75f, 0.55f, 0.3f), PrimitiveType.Cylinder);
            for (int k = 0; k < 9; k++)
                U.Box("Cicek", b, new Vector3(x + Random.Range(-0.32f, 0.32f), 0.8f + Random.Range(0f, 0.2f), -11.4f + Random.Range(-0.32f, 0.32f)), Vector3.one * 0.22f,
                    k % 3 == 0 ? new Color(1f, 0.45f, 0.6f) : k % 3 == 1 ? new Color(1f, 0.9f, 0.35f) : new Color(0.75f, 0.5f, 1f), PrimitiveType.Sphere);
        }

        // Lobi kosesi
        var corner = Slots[2];
        corner.groups = new GameObject[4];
        corner.groups[0] = Group(root, "KoseBos");
        var aq = Group(root, "Akvaryum").transform;
        corner.groups[1] = aq.gameObject;
        U.Box("Sehpa", aq, Corner + new Vector3(0, 0.4f, 0), new Vector3(2.2f, 0.8f, 0.9f), new Color(0.35f, 0.25f, 0.2f));
        U.Prim("Su", aq, Corner + new Vector3(0, 1.3f, 0), new Vector3(2.1f, 1f, 0.8f), U.Glow(new Color(0.3f, 0.65f, 0.95f), 0.5f));
        U.Box("Kum", aq, Corner + new Vector3(0, 0.85f, 0), new Vector3(2.05f, 0.1f, 0.75f), new Color(0.95f, 0.85f, 0.6f));
        for (int k = 0; k < 4; k++)
            U.Prim("Balik", aq, Corner + new Vector3(-0.6f + k * 0.4f, 1.2f + (k % 2) * 0.3f, -0.42f), new Vector3(0.22f, 0.12f, 0.04f), U.Glow(k % 2 == 0 ? new Color(1f, 0.55f, 0.15f) : new Color(1f, 0.85f, 0.2f), 1f), PrimitiveType.Sphere);
        cornerObs[1].Add(Rect.MinMaxRect(Corner.x - 1.15f, Corner.z - 0.5f, Corner.x + 1.15f, Corner.z + 0.5f));

        var st = Group(root, "Heykel").transform;
        corner.groups[2] = st.gameObject;
        U.Box("Kaide", st, Corner + new Vector3(0, 0.5f, 0), new Vector3(0.9f, 1f, 0.9f), new Color(0.92f, 0.9f, 0.86f));
        U.Box("Govde", st, Corner + new Vector3(0, 1.45f, 0), new Vector3(0.4f, 0.9f, 0.4f), new Color(0.85f, 0.85f, 0.88f), PrimitiveType.Capsule);
        U.Box("Bas", st, Corner + new Vector3(0, 2.15f, 0), Vector3.one * 0.38f, new Color(0.85f, 0.85f, 0.88f), PrimitiveType.Sphere);
        U.Box("Halka", st, Corner + new Vector3(0, 1.6f, 0), new Vector3(0.9f, 0.05f, 0.9f), Gold, PrimitiveType.Cylinder);
        cornerObs[2].Add(Rect.MinMaxRect(Corner.x - 0.5f, Corner.z - 0.5f, Corner.x + 0.5f, Corner.z + 0.5f));

        var pi = Group(root, "Piyano").transform;
        corner.groups[3] = pi.gameObject;
        Color black = new Color(0.08f, 0.08f, 0.1f);
        U.Box("Govde", pi, Corner + new Vector3(0, 0.8f, 0.1f), new Vector3(1.6f, 0.4f, 1.9f), black);
        var lid = U.Box("Kapak", pi, Corner + new Vector3(0.35f, 1.35f, 0.25f), new Vector3(1.4f, 0.04f, 1.7f), black);
        lid.transform.localRotation = Quaternion.Euler(0, 0, 35f);
        U.Box("Tuslar", pi, Corner + new Vector3(0, 0.98f, -0.85f), new Vector3(1.4f, 0.06f, 0.25f), Color.white);
        foreach (var o in new[] { new Vector3(-0.65f, 0.3f, -0.7f), new Vector3(0.65f, 0.3f, -0.7f), new Vector3(0f, 0.3f, 0.9f) })
            U.Box("Ayak", pi, Corner + o, new Vector3(0.1f, 0.6f, 0.1f), black);
        U.Box("Tabure", pi, Corner + new Vector3(0, 0.25f, -1.4f), new Vector3(0.9f, 0.5f, 0.4f), black);
        cornerObs[3].Add(Rect.MinMaxRect(Corner.x - 0.85f, Corner.z - 1.6f, Corner.x + 0.85f, Corner.z + 1.1f));

        // Lobi aydinlatmasi
        var light = Slots[3];
        light.groups = new GameObject[3];
        light.groups[0] = Group(root, "IsikSade");
        var ch = Group(root, "KristalAvize").transform;
        light.groups[1] = ch.gameObject;
        Vector3 c0 = new Vector3(0f, 3.3f, -4.5f);
        U.Box("Tavan", ch, c0 + Vector3.up * 0.5f, new Vector3(0.05f, 1f, 0.05f), Gold);
        U.Box("Govde", ch, c0, new Vector3(0.45f, 0.12f, 0.45f), Gold, PrimitiveType.Cylinder);
        for (int k = 0; k < 10; k++)
        {
            float a = k * Mathf.PI * 2f / 10f;
            var kol = U.Box("Kol", ch, c0 + new Vector3(Mathf.Cos(a) * 0.6f, 0f, Mathf.Sin(a) * 0.6f), new Vector3(1.1f, 0.05f, 0.06f), Gold);
            kol.transform.localRotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
            var mum = U.Prim("Mum", ch, c0 + new Vector3(Mathf.Cos(a) * 1.15f, 0.12f, Mathf.Sin(a) * 1.15f), Vector3.one * 0.16f, U.Glow(new Color(1f, 0.9f, 0.6f), 2.5f), PrimitiveType.Sphere);
            GameManager.I.dayNight.AddFixture(mum.GetComponent<Renderer>(), new Color(1f, 0.85f, 0.55f), 0.7f);
            U.Prim("Kristal", ch, c0 + new Vector3(Mathf.Cos(a) * 1.15f, -0.18f, Mathf.Sin(a) * 1.15f), new Vector3(0.12f, 0.3f, 0.12f), U.Glow(new Color(0.9f, 0.95f, 1f), 1.8f), PrimitiveType.Capsule);
            if (k % 2 == 0)
                U.Prim("Kristal", ch, c0 + new Vector3(Mathf.Cos(a) * 0.65f, -0.55f, Mathf.Sin(a) * 0.65f), new Vector3(0.1f, 0.26f, 0.1f), U.Glow(new Color(1f, 0.92f, 0.7f), 2f), PrimitiveType.Capsule);
        }
        var merkez = U.Prim("Merkez", ch, c0 + Vector3.down * 0.6f, Vector3.one * 0.35f, U.Glow(new Color(1f, 0.92f, 0.75f), 2.5f), PrimitiveType.Sphere);
        GameManager.I.dayNight.AddFixture(merkez.GetComponent<Renderer>(), new Color(1f, 0.88f, 0.6f), 3.2f);
        var md = Group(root, "ModernLambalar").transform;
        light.groups[2] = md.gameObject;
        for (int k = -1; k <= 1; k++)
        {
            Vector3 p = new Vector3(k * 3.2f, 3.1f, -4.5f);
            U.Box("Kablo", md, p + Vector3.up * 0.5f, new Vector3(0.03f, 1f, 0.03f), new Color(0.15f, 0.15f, 0.15f));
            U.Box("Kup", md, p, new Vector3(0.7f, 0.35f, 0.7f), new Color(0.15f, 0.15f, 0.17f), PrimitiveType.Cylinder);
            var amp = U.Prim("Ampul", md, p + Vector3.down * 0.25f, Vector3.one * 0.3f, U.Glow(new Color(1f, 0.85f, 0.6f), 3f), PrimitiveType.Sphere);
            GameManager.I.dayNight.AddFixture(amp.GetComponent<Renderer>(), new Color(1f, 0.85f, 0.55f), 1.8f);
        }

        // Resepsiyon susu
        var desk = Slots[4];
        desk.groups = new GameObject[4];
        desk.groups[0] = deskDefault;
        Vector3 d0 = new Vector3(-7.6f, 1.17f, -5.1f);
        var orc = Group(root, "Orkide").transform;
        desk.groups[1] = orc.gameObject;
        U.Box("Saksi", orc, d0 + new Vector3(0, 0.1f, 0), new Vector3(0.25f, 0.1f, 0.25f), Color.white, PrimitiveType.Cylinder);
        U.Box("Sap", orc, d0 + new Vector3(0, 0.45f, 0), new Vector3(0.03f, 0.35f, 0.03f), new Color(0.3f, 0.5f, 0.25f), PrimitiveType.Cylinder);
        for (int k = 0; k < 4; k++)
            U.Box("Cicek", orc, d0 + new Vector3(0.08f * k - 0.1f, 0.65f + k * 0.07f, 0.05f), new Vector3(0.14f, 0.14f, 0.05f), new Color(0.95f, 0.6f, 0.85f), PrimitiveType.Sphere);
        var bon = Group(root, "Bonsai").transform;
        desk.groups[2] = bon.gameObject;
        U.Box("Saksi", bon, d0 + new Vector3(0, 0.06f, 0), new Vector3(0.45f, 0.12f, 0.3f), new Color(0.35f, 0.3f, 0.45f));
        U.Box("Govde", bon, d0 + new Vector3(0.05f, 0.25f, 0), new Vector3(0.07f, 0.2f, 0.07f), new Color(0.45f, 0.32f, 0.22f), PrimitiveType.Cylinder);
        U.Box("Tac", bon, d0 + new Vector3(0.05f, 0.48f, 0), new Vector3(0.5f, 0.18f, 0.35f), new Color(0.3f, 0.6f, 0.3f), PrimitiveType.Sphere);
        var bell = Group(root, "AltinZil").transform;
        desk.groups[3] = bell.gameObject;
        U.Prim("Zil", bell, d0 + new Vector3(0, 0.15f, 0), new Vector3(0.4f, 0.3f, 0.4f), U.Mat(Gold, null, Vector2.one, 0.9f, 0.3f), PrimitiveType.Sphere);
        U.Box("Taban", bell, d0 + new Vector3(0, 0.02f, 0), new Vector3(0.45f, 0.03f, 0.45f), new Color(0.3f, 0.2f, 0.15f), PrimitiveType.Cylinder);
        U.Prim("Tepe", bell, d0 + new Vector3(0, 0.33f, 0), Vector3.one * 0.08f, U.Mat(Gold, null, Vector2.one, 0.9f, 0.3f), PrimitiveType.Sphere);

        // Tablolar ve hali: renk degisimi, grup yok
        Slots[0].groups = null;
        Slots[5].groups = null;
        Apply();
    }

    static GameObject Group(Transform root, string name)
    {
        var g = new GameObject(name);
        g.transform.SetParent(root, false);
        return g;
    }

    // ---------------- Uygulama ----------------
    public static void Apply()
    {
        foreach (var s in Slots)
        {
            if (s.groups == null) continue;
            for (int i = 0; i < s.groups.Length; i++)
                if (s.groups[i]) s.groups[i].SetActive(i == s.sel);
        }
        Color[] cc = { new Color(0.78f, 0.33f, 0.3f), new Color(0.2f, 0.27f, 0.5f), new Color(0.15f, 0.5f, 0.38f), new Color(0.6f, 0.15f, 0.2f) };
        Color[] ce = { new Color(0.95f, 0.8f, 0.45f), new Color(0.9f, 0.9f, 0.95f), new Color(0.95f, 0.85f, 0.55f), Gold };
        int c = Slots[0].sel;
        if (carpet) carpet.sharedMaterial = U.Mat(cc[c], U.CarpetTex, new Vector2(3, 2), 0.05f, 0f);
        if (carpetEdge) carpetEdge.sharedMaterial = U.Mat(ce[c]);
        Color[] art = { new Color(0.35f, 0.6f, 0.85f), new Color(0.7f, 0.35f, 0.75f), new Color(0.98f, 0.55f, 0.3f) };
        foreach (var r in canvases)
            if (r) r.sharedMaterial = U.Mat(art[Slots[5].sel]);
    }

    public static bool Blocked(Vector3 p, float r)
    {
        foreach (var o in cornerObs[Slots[2].sel])
            if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
        return false;
    }

    // ---------------- Kayit ----------------
    public static void Save(string K)
    {
        foreach (var s in Slots)
        {
            Store.SetInt(K + "dec_sel_" + s.key, s.sel);
            Store.SetInt(K + "dec_own_" + s.key, s.owned);
        }
    }

    public static void Load(string K)
    {
        foreach (var s in Slots)
        {
            s.owned = Store.GetInt(K + "dec_own_" + s.key, 1) | 1;
            s.sel = Mathf.Clamp(Store.GetInt(K + "dec_sel_" + s.key, 0), 0, s.opts.Length - 1);
            if (!s.Owns(s.sel)) s.sel = 0;
        }
        Apply();
    }

    public static void Reset()
    {
        foreach (var s in Slots) { s.sel = 0; s.owned = 1; }
    }
}
