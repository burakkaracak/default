using System.Collections.Generic;
using UnityEngine;

// Ortak yardimcilar: malzeme, doku, kutu, yazi, yurume, efekt
public static class U
{
    static Shader lit;
    static Material partMat;
    static readonly Dictionary<string, Material> cache = new Dictionary<string, Material>();
    static Font font;
    public static readonly Quaternion CamRot = Quaternion.Euler(52f, 0f, 0f);
    public static readonly Color Skin = new Color(1f, 0.82f, 0.68f);

    static Shader Lit
    {
        get
        {
            if (lit == null)
            {
                lit = Shader.Find("Universal Render Pipeline/Lit");
                if (lit == null) lit = Shader.Find("Standard");
            }
            return lit;
        }
    }

    // ---------- Malzemeler ----------
    public static Material Mat(Color c, float smooth = 0.25f) => Mat(c, null, Vector2.one, smooth, 0f);
    public static Material Glow(Color c, float intensity) => Mat(c, null, Vector2.one, 0.3f, intensity);

    public static Material Mat(Color c, Texture2D tex, Vector2 tiling, float smooth, float emission)
    {
        string key = c.ToString("F3") + (tex ? tex.name : "-") + tiling.ToString("F2") + smooth.ToString("F2") + emission.ToString("F2");
        if (cache.TryGetValue(key, out var m) && m) return m;
        m = new Material(Lit);
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
        if (m.HasProperty("_Color")) m.SetColor("_Color", c);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
        if (tex)
        {
            if (m.HasProperty("_BaseMap")) { m.SetTexture("_BaseMap", tex); m.SetTextureScale("_BaseMap", tiling); }
            if (m.HasProperty("_MainTex")) { m.SetTexture("_MainTex", tex); m.SetTextureScale("_MainTex", tiling); }
        }
        if (emission > 0f)
        {
            m.EnableKeyword("_EMISSION");
            m.SetColor("_EmissionColor", c * emission);
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
        }
        cache[key] = m;
        return m;
    }

    // ---------- Dokular (kodla uretilir) ----------
    static Texture2D tileTex, woodTex, carpetTex, grassTex, stripeTex, roundTex, circleTex;
    public static Texture2D TileTex => tileTex ? tileTex : (tileTex = MakeTile());
    public static Texture2D WoodTex => woodTex ? woodTex : (woodTex = MakeWood());
    public static Texture2D CarpetTex => carpetTex ? carpetTex : (carpetTex = MakeNoise("carpet", 0.3f, 0.12f));
    public static Texture2D GrassTex => grassTex ? grassTex : (grassTex = MakeNoise("grass", 0.06f, 0.25f));
    public static Texture2D StripeTex => stripeTex ? stripeTex : (stripeTex = MakeStripe());
    public static Texture2D RoundTex => roundTex ? roundTex : (roundTex = MakeRound(64, 22));
    public static Texture2D CircleTex => circleTex ? circleTex : (circleTex = MakeRound(128, 64));
    static Texture2D roundSmallTex;
    public static Texture2D RoundSmallTex => roundSmallTex ? roundSmallTex : (roundSmallTex = MakeRound(32, 10));

    // Arayuz renklerini lineer renk uzayina gore duzeltir (yoksa soluk gorunur)
    public static Color UI(Color c)
    {
        if (QualitySettings.activeColorSpace != ColorSpace.Linear) return c;
        var l = c.linear;
        l.a = c.a;
        return l;
    }

    static Texture2D NewTex(string n, int s)
    {
        return new Texture2D(s, s, TextureFormat.RGBA32, true)
        { name = n, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear, anisoLevel = 4 };
    }

    static Texture2D MakeTile()
    {
        int s = 256, tiles = 4, cell = s / tiles;
        var t = NewTex("tile", s);
        var rnd = new System.Random(3);
        float[] v = new float[tiles * tiles];
        for (int i = 0; i < v.Length; i++) v[i] = 0.92f + (float)rnd.NextDouble() * 0.08f;
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                int lx = x % cell, ly = y % cell;
                bool grout = lx < 3 || ly < 3;
                float b = grout ? 0.74f : v[(y / cell) * tiles + x / cell] - 0.04f * Mathf.PerlinNoise(x * 0.04f, y * 0.04f);
                t.SetPixel(x, y, new Color(b, b, b, 1));
            }
        t.Apply();
        return t;
    }

    static Texture2D MakeWood()
    {
        int s = 256, pw = 32;
        var t = NewTex("wood", s);
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                int p = x / pw;
                int off = (p * 73) % s;
                float grain = Mathf.PerlinNoise(x * 0.09f + p * 10f, (y + off) * 0.012f);
                float b = 0.8f + 0.2f * grain;
                b *= 0.93f + 0.07f * ((p * 37) % 5) / 4f;
                if (x % pw < 2) b *= 0.7f;
                if ((y + off) % 128 < 2) b *= 0.75f;
                t.SetPixel(x, y, new Color(b, b, b, 1));
            }
        t.Apply();
        return t;
    }

    static Texture2D MakeNoise(string n, float freq, float amount)
    {
        int s = 256;
        var t = NewTex(n, s);
        var rnd = new System.Random(n.Length * 17);
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                float a = Mathf.PerlinNoise(x * freq, y * freq) * 0.6f + Mathf.PerlinNoise(x * freq * 3f + 50, y * freq * 3f + 50) * 0.4f;
                float b = 1f - amount + amount * a + ((float)rnd.NextDouble() - 0.5f) * amount * 0.4f;
                t.SetPixel(x, y, new Color(b, b, b, 1));
            }
        t.Apply();
        return t;
    }

    static Texture2D MakeStripe()
    {
        int s = 128;
        var t = NewTex("stripe", s);
        for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                float b = (x / 16) % 2 == 0 ? 1f : 0.95f;
                t.SetPixel(x, y, new Color(b, b, b, 1));
            }
        t.Apply();
        return t;
    }

    static Texture2D MakeRound(int n, int radius)
    {
        var t = new Texture2D(n, n, TextureFormat.RGBA32, false) { name = "round", filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
            {
                float cx = Mathf.Clamp(x + 0.5f, radius, n - radius);
                float cy = Mathf.Clamp(y + 0.5f, radius, n - radius);
                float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(cx, cy));
                t.SetPixel(x, y, new Color(1, 1, 1, Mathf.Clamp01(radius - d)));
            }
        t.Apply();
        return t;
    }

    // ---------- Gece isiklari (bloom gerektirmez) ----------
    static Texture2D haloTex;
    static Shader unlit;

    // Isiktan etkilenmeyen, hep parlak gorunen malzeme (yanan ampul, fener cami)
    public static Material Bright(Color c)
    {
        string key = "bright" + c.ToString("F3");
        if (cache.TryGetValue(key, out var m) && m) return m;
        if (unlit == null) unlit = Shader.Find("Universal Render Pipeline/Unlit");
        m = new Material(unlit != null ? unlit : Lit);
        Color b = Color.Lerp(c, Color.white, 0.25f);
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", b);
        if (m.HasProperty("_Color")) m.SetColor("_Color", b);
        cache[key] = m;
        return m;
    }

    static Texture2D HaloTex
    {
        get
        {
            if (haloTex) return haloTex;
            const int n = 64;
            haloTex = new Texture2D(n, n, TextureFormat.RGBA32, false) { name = "hale", filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(n / 2f, n / 2f)) / (n / 2f);
                    float a = Mathf.Clamp01(1f - d);
                    haloTex.SetPixel(x, y, new Color(1, 1, 1, a * a));
                }
            haloTex.Apply();
            return haloTex;
        }
    }

    // Lambanin etrafinda yumusak isik halesi (kameraya doner)
    public static GameObject Halo(Transform parent, Vector3 worldPos, float size, Color c)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Quad);
        g.name = "Hale";
        var col = g.GetComponent<Collider>();
        if (col) Object.Destroy(col);
        g.transform.SetParent(parent, true);
        g.transform.position = worldPos;
        g.transform.rotation = CamRot;
        g.transform.localScale = Vector3.one * size;
        string key = "halo" + c.ToString("F3");
        if (!cache.TryGetValue(key, out var m) || !m)
        {
            var sh = Shader.Find("Sprites/Default");
            m = new Material(sh != null ? sh : Lit) { mainTexture = HaloTex };
            m.color = new Color(c.r, c.g, c.b, 0.55f);
            m.renderQueue = 3100;
            cache[key] = m;
        }
        var r = g.GetComponent<Renderer>();
        r.sharedMaterial = m;
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        r.receiveShadows = false;
        return g;
    }

    // ---------- Nesneler ----------
    public static GameObject Box(string name, Transform parent, Vector3 pos, Vector3 scale, Color c, PrimitiveType type = PrimitiveType.Cube)
        => Prim(name, parent, pos, scale, Mat(c), type);

    public static GameObject Prim(string name, Transform parent, Vector3 pos, Vector3 scale, Material m, PrimitiveType type = PrimitiveType.Cube)
    {
        var g = GameObject.CreatePrimitive(type);
        g.name = name;
        var col = g.GetComponent<Collider>();
        if (col) Object.Destroy(col);
        g.transform.SetParent(parent, false);
        g.transform.localPosition = pos;
        g.transform.localScale = scale;
        g.GetComponent<Renderer>().sharedMaterial = m;
        return g;
    }

    public static GameObject Flat(string name, Transform parent, Vector3 pos, Vector3 scale, Color c, PrimitiveType type = PrimitiveType.Cube)
    {
        var g = Box(name, parent, pos, scale, c, type);
        NoShadow(g);
        return g;
    }

    public static void NoShadow(GameObject g)
    {
        foreach (var r in g.GetComponentsInChildren<Renderer>())
        {
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }
    }

    public static Transform Pivot(Transform parent, Vector3 pos, string name = "Pivot")
    {
        var t = new GameObject(name).transform;
        t.SetParent(parent, false);
        t.localPosition = pos;
        return t;
    }

    public static TextMesh Text(Transform parent, Vector3 pos, string s, float size, Color c, bool shadow = false)
    {
        var g = new GameObject("Yazi");
        g.transform.SetParent(parent, false);
        g.transform.localPosition = pos;
        g.transform.rotation = CamRot;
        var t = MakeTextMesh(g, s, size, c);
        if (shadow)
        {
            var sg = new GameObject("Golge");
            sg.transform.SetParent(g.transform, false);
            sg.transform.localPosition = new Vector3(0.035f, -0.035f, 0.03f);
            var st = MakeTextMesh(sg, s, size, new Color(0, 0, 0, 0.55f));
            var ts = g.AddComponent<TxtShadow>();
            ts.src = t;
            ts.dst = st;
        }
        return t;
    }

    static TextMesh MakeTextMesh(GameObject g, string s, float size, Color c)
    {
        var t = g.AddComponent<TextMesh>();
        if (font == null) font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        t.font = font;
        g.GetComponent<MeshRenderer>().sharedMaterial = font.material;
        t.text = s;
        t.fontSize = 64;
        t.characterSize = size;
        t.anchor = TextAnchor.MiddleCenter;
        t.alignment = TextAlignment.Center;
        t.fontStyle = FontStyle.Bold;
        t.color = c;
        return t;
    }


    // ---------- Hazir 3D modeller (Resources klasorunden) ----------
    static float furnUnit = -1f, charUnit = -1f;
    public static float FurnUnit { get { if (furnUnit < 0f) furnUnit = Probe("Mobilya/bedDouble", 0.956f, 0); return furnUnit; } }
    public static float CharUnit { get { if (charUnit < 0f) charUnit = Probe("Karakterler/character-female-a", 0.776f, 1); return charUnit; } }
    static Texture2D charTex;
    public static Texture2D CharTex => charTex ? charTex : (charTex = Resources.Load<Texture2D>("Karakterler/Textures/colormap"));


    // Mobilya modellerinin dogal on yonunu yataktan olcer (yatak basligi = arka)
    static float furnYaw = float.NaN;
    public static float FurnYaw { get { if (float.IsNaN(furnYaw)) furnYaw = ProbeYaw(); return furnYaw; } }

    static float ProbeYaw()
    {
        var pf = Resources.Load<GameObject>("Mobilya/bedDouble");
        if (!pf) return 0f;
        var holder = new GameObject("YonOlcer").transform;
        holder.position = new Vector3(0, -500, 0);
        var g = Object.Instantiate(pf, holder, false);
        var pts = new List<Vector3>();
        foreach (var mf in g.GetComponentsInChildren<MeshFilter>())
        {
            var m = mf.sharedMesh;
            if (!m || !m.isReadable) continue;
            foreach (var v in m.vertices) pts.Add(holder.InverseTransformPoint(mf.transform.TransformPoint(v)));
        }
        Object.DestroyImmediate(holder.gameObject);
        if (pts.Count == 0) return 180f;
        Vector3 lo = pts[0], hi = pts[0];
        foreach (var p in pts) { lo = Vector3.Min(lo, p); hi = Vector3.Max(hi, p); }
        Vector3 c = (lo + hi) / 2f, sum = Vector3.zero;
        int n = 0;
        foreach (var p in pts)
            if (p.y > lo.y + 0.85f * (hi.y - lo.y)) { sum += p; n++; }
        if (n == 0) return 180f;
        Vector3 back = sum / n - c;
        float frontYaw = Mathf.Atan2(-back.x, -back.z) * Mathf.Rad2Deg;
        float corr = Mathf.Round(-frontYaw / 90f) * 90f;
        Debug.Log("[Otel] Mobilya yon duzeltmesi: " + corr);
        return corr;
    }

    static float Probe(string path, float expected, int axis)
    {
        var pf = Resources.Load<GameObject>(path);
        if (!pf) return 1f;
        var g = Object.Instantiate(pf);
        g.transform.position = new Vector3(0, -500, 0);
        var b = WorldBounds(g);
        Object.DestroyImmediate(g);
        float s = axis == 0 ? b.size.x : b.size.y;
        return s > 0.0001f ? expected / s : 1f;
    }

    public static Bounds WorldBounds(GameObject g)
    {
        bool has = false;
        var b = new Bounds(g.transform.position, Vector3.zero);
        foreach (var r in g.GetComponentsInChildren<Renderer>(true))
        {
            if (r is ParticleSystemRenderer) continue;
            if (!has) { b = r.bounds; has = true; }
            else b.Encapsulate(r.bounds);
        }
        return b;
    }

    // Modelin malzemelerini oyunun isik sistemine uygun hale getirir
    public static void FixMats(GameObject g, Texture2D forceTex = null)
    {
        foreach (var r in g.GetComponentsInChildren<Renderer>(true))
        {
            var mats = r.sharedMaterials;
            for (int i = 0; i < mats.Length; i++)
            {
                var m = mats[i];
                Texture2D t = forceTex;
                Color c = Color.white;
                if (m)
                {
                    if (!t && m.HasProperty("_BaseMap")) t = m.GetTexture("_BaseMap") as Texture2D;
                    if (!t && m.HasProperty("_MainTex")) t = m.GetTexture("_MainTex") as Texture2D;
                    if (m.HasProperty("_BaseColor")) c = m.GetColor("_BaseColor");
                    else if (m.HasProperty("_Color")) c = m.GetColor("_Color");
                }
                c.a = 1f;
                mats[i] = t ? Mat(Color.white, t, Vector2.one, 0.2f, 0f) : Mat(c, 0.25f);
            }
            r.sharedMaterials = mats;
            if (r is SkinnedMeshRenderer smr) smr.updateWhenOffscreen = true;
        }
    }

    // Mobilya modeli koyar: taban pos.y'de, ortasi pos.x/pos.z'de. Model yoksa yedek kutu koyar.
    public static Bounds Furn(string name, Transform parent, Vector3 pos, float yRot, float scale, Vector3 fbSize, Color fbColor)
    {
        var pf = Resources.Load<GameObject>("Mobilya/" + name);
        if (!pf)
        {
            var box = Box(name, parent, pos + Vector3.up * fbSize.y / 2f, fbSize, fbColor);
            box.transform.rotation = Quaternion.Euler(0, yRot, 0);
            return box.GetComponent<Renderer>().bounds;
        }
        var holder = new GameObject(name).transform;
        holder.SetParent(parent, false);
        holder.rotation = Quaternion.Euler(0, yRot + FurnYaw, 0);
        holder.localScale = Vector3.one * scale * FurnUnit;
        var g = Object.Instantiate(pf, holder, false);
        FixMats(g);
        var b = WorldBounds(g);
        Vector3 d = new Vector3(pos.x - b.center.x, pos.y - b.min.y, pos.z - b.center.z);
        holder.position += d;
        b.center += d;
        return b;
    }

    // ---------- Hareket ----------
    public static float Flat(Vector3 a, Vector3 b)
    {
        a.y = 0; b.y = 0;
        return Vector3.Distance(a, b);
    }

    public static void Face(Transform t, Vector3 dir)
    {
        dir.y = 0;
        if (dir.sqrMagnitude < 0.0001f) return;
        t.rotation = Quaternion.Slerp(t.rotation, Quaternion.LookRotation(dir), Time.deltaTime * 12f);
    }

    // Yol boyunca yurur; yol bittiyse true doner
    public static bool Walk(Transform t, List<Vector3> path, float speed, Rig rig)
    {
        if (path.Count == 0)
        {
            if (rig) rig.Tick(0f);
            return true;
        }
        Vector3 target = path[0];
        Vector3 d = target - t.position;
        d.y = 0;
        // Asansor: kat degisiminde aninda gec
        if (Mathf.Abs(d.z) > 25f)
        {
            t.position = new Vector3(target.x, t.position.y, target.z);
            path.RemoveAt(0);
            if (rig) rig.Tick(0f);
            return path.Count == 0;
        }
        float step = speed * Time.deltaTime;
        if (d.magnitude <= step)
        {
            t.position = new Vector3(target.x, t.position.y, target.z);
            path.RemoveAt(0);
        }
        else
        {
            t.position += d.normalized * step;
            Face(t, d);
        }
        if (rig) rig.Tick(1f);
        return path.Count == 0;
    }

    // ---------- Efekt ----------
    static Material PartMat
    {
        get
        {
            if (!partMat)
            {
                var sh = Shader.Find("Universal Render Pipeline/Particles/Unlit");
                partMat = new Material(sh != null ? sh : Lit);
            }
            return partMat;
        }
    }

    public static void Burst(Vector3 pos, Color a, Color b, int count, float speed = 5f)
    {
        var g = new GameObject("Konfeti");
        g.transform.position = pos;
        g.transform.rotation = Quaternion.Euler(-90f, 0f, 0f);
        var ps = g.AddComponent<ParticleSystem>();
        ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        var main = ps.main;
        main.loop = false;
        main.playOnAwake = false;
        main.startLifetime = new ParticleSystem.MinMaxCurve(0.8f, 1.4f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(speed * 0.5f, speed);
        main.startSize = new ParticleSystem.MinMaxCurve(0.1f, 0.22f);
        main.startColor = new ParticleSystem.MinMaxGradient(a, b);
        main.startRotation = new ParticleSystem.MinMaxCurve(0f, 6.28f);
        main.gravityModifier = 1.3f;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.maxParticles = 300;
        var em = ps.emission;
        em.rateOverTime = 0f;
        em.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)count) });
        var sh = ps.shape;
        sh.shapeType = ParticleSystemShapeType.Cone;
        sh.angle = 35f;
        sh.radius = 0.2f;
        var rot = ps.rotationOverLifetime;
        rot.enabled = true;
        rot.z = new ParticleSystem.MinMaxCurve(-6f, 6f);
        var r = g.GetComponent<ParticleSystemRenderer>();
        r.sharedMaterial = PartMat;
        ps.Play();
        Object.Destroy(g, 2.5f);
    }
}

// Yazi golgesini ana yaziyla esler
public class TxtShadow : MonoBehaviour
{
    public TextMesh src, dst;

    void LateUpdate()
    {
        if (!src || !dst) return;
        if (dst.text != src.text) dst.text = src.text;
        if (dst.characterSize != src.characterSize) dst.characterSize = src.characterSize;
        dst.color = new Color(0, 0, 0, src.color.a * 0.55f);
    }
}

// Yere cizilen dolan daire (ilerleme gostergesi)
public class ProgressPad
{
    public GameObject root;
    readonly Transform fill, ring;
    readonly float r;
    float pulse;

    public ProgressPad(Transform parent, Vector3 pos, float radius, Color baseC, Color fillC, string icon = null)
    {
        root = new GameObject("Daire");
        root.transform.SetParent(parent, false);
        root.transform.localPosition = pos;
        r = radius;
        ring = U.Flat("Kenar", root.transform, new Vector3(0, 0.01f, 0), new Vector3(r * 2 + 0.18f, 0.01f, r * 2 + 0.18f), Color.white, PrimitiveType.Cylinder).transform;
        U.Flat("Zemin", root.transform, new Vector3(0, 0.02f, 0), new Vector3(r * 2, 0.01f, r * 2), baseC, PrimitiveType.Cylinder);
        fill = U.Flat("Dolum", root.transform, new Vector3(0, 0.03f, 0), Vector3.zero, fillC, PrimitiveType.Cylinder).transform;
        if (!string.IsNullOrEmpty(icon))
        {
            var t = U.Text(root.transform, new Vector3(0, 0.05f, 0), icon, r * 0.12f, new Color(1, 1, 1, 0.9f));
            t.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        }
        Set(0);
    }

    public void Set(float t)
    {
        t = Mathf.Clamp01(t);
        float d = r * 2 * t;
        fill.localScale = new Vector3(d, 0.01f, d);
        fill.gameObject.SetActive(t > 0.001f);
        if (t > 0.001f) pulse += Time.deltaTime * 10f; else pulse = 0;
        float k = 1f + Mathf.Sin(pulse) * 0.04f;
        ring.localScale = new Vector3((r * 2 + 0.18f) * k, 0.01f, (r * 2 + 0.18f) * k);
    }

    public void Show(bool s) => root.SetActive(s);
}
