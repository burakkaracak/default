using System.Collections.Generic;
using UnityEngine;

// Tek bir otel odasi: kilitli, temiz, dolu, kirli; 3 belirgin seviye
public class Room : MonoBehaviour
{
    public enum State { Locked, Clean, Reserved, Occupied, Dirty }
    public State state = State.Locked;
    public int index;
    public float x;
    public bool claimed;
    public int level;
    public MoneyPile tips;

    public Vector3 CleanSpot => new Vector3(x, 0f, Z(6.2f));
    public Vector3 BedPos => new Vector3(x, bedTop + 0.55f, Z(7.35f));
    public int Price => IsSuite ? Mathf.RoundToInt((Eco.NightPrice(index, 3) + Eco.NightPrice(suitePart.index, 3)) * 1.5f)
                                : Mathf.RoundToInt(Eco.NightPrice(index, level) * RoomKinds.PriceMul(kind));
    public int Tip => IsSuite ? Mathf.RoundToInt((Eco.Tip(index, 3) + Eco.Tip(suitePart.index, 3)) * 1.5f)
                              : Mathf.RoundToInt(Eco.Tip(index, level) * RoomKinds.PriceMul(kind));
    public int Number => index < Eco.Floor2Start ? 101 + index : 201 + index - Eco.Floor2Start;
    public bool Unlocked => state != State.Locked;

    const float S = 2.1f;
    float bedTop = 0.55f;
    GameObject cover, trash, blanket, messy;
    readonly GameObject[] lv = new GameObject[4];
    readonly List<Rect>[] lvObs = { new List<Rect>(), new List<Rect>(), new List<Rect>(), new List<Rect>() };
    readonly List<Rect> activeObs = new List<Rect>();
    ProgressPad pad, reqPad;
    TextMesh levelText, reqText;
    GameObject reqBubble;
    float cleanT, reqT;

    // Oda tipi ve Baskanlik Suiti (iki Kral Dairesi birlesir)
    public int kind;
    public Room suitePart, suiteMain;
    public bool IsSuitePart => suiteMain != null;
    public bool IsSuite => suitePart != null;
    GameObject kindGroup, lounge;
    readonly List<Rect> loungeObs = new List<Rect>();

    public bool hasLinen;
    public int theme, themeOwned = 1;
    TextMesh needText;
    readonly GameObject[] themeGroups = new GameObject[Themes.Names.Length];
    readonly Color[] wallOrig = new Color[4];

    public Customer guest;
    public string request;
    public bool HasRequest => request != null;
    public bool reqClaimed;
    static readonly string[] Requests = { "Havlu lütfen!", "Bir kahve?", "Ekstra yastık!", "Su getirir misin?" };

    static readonly Color Wood = new Color(0.62f, 0.45f, 0.32f);
    static readonly Color Gold = new Color(0.95f, 0.78f, 0.3f);

    public float oz;
    public float Z(float z) => z + oz;
    public Vector3 Door => new Vector3(x, 0f, Z(2.5f));
    public Vector3 Inside => new Vector3(x, 0f, Z(6.6f));

    public void Init(Transform world, int i, float px, float zOffset = 0f)
    {
        index = i;
        x = px;
        oz = zOffset;
        transform.SetParent(world, false);

        // ---- Her seviyede ortak: cop, daginik yatak, battaniye, temizlik dairesi ----
        var common = U.Pivot(transform, Vector3.zero, "Ortak").gameObject;
        var ct = common.transform;
        blanket = new GameObject("UyuyanBattaniye");
        blanket.transform.SetParent(ct, false);
        U.Box("Battaniye", blanket.transform, new Vector3(x, 0.87f, Z(7.95f)), new Vector3(1.5f, 0.3f, 1.55f), new Color(0.55f, 0.75f, 0.95f));
        U.Box("BattaniyeKenar", blanket.transform, new Vector3(x, 0.88f, Z(8.72f)), new Vector3(1.52f, 0.3f, 0.12f), Color.white);
        blanket.SetActive(false);

        messy = new GameObject("Daginik");
        messy.transform.SetParent(ct, false);
        var mb = U.Box("DaginikCarsaf", messy.transform, new Vector3(x + 0.1f, 0.62f, Z(7.95f)), new Vector3(1.5f, 0.1f, 1.5f), new Color(0.68f, 0.6f, 0.52f));
        mb.transform.localRotation = Quaternion.Euler(0, 12f, 3f);
        var mp = U.Box("DusmusYastik", messy.transform, new Vector3(x - 0.9f, 0.12f, Z(6.7f)), new Vector3(0.7f, 0.18f, 0.45f), Color.white);
        mp.transform.localRotation = Quaternion.Euler(0, 35f, 8f);
        messy.SetActive(false);

        trash = new GameObject("Cop");
        trash.transform.SetParent(ct, false);
        for (int k = 0; k < 5; k++)
        {
            var c = U.Box("CopParca", trash.transform,
                new Vector3(x + Random.Range(-1.3f, 1.3f), 0.1f, Z(Random.Range(4.8f, 7.0f))),
                Vector3.one * Random.Range(0.16f, 0.26f), new Color(0.92f, 0.92f, 0.88f), PrimitiveType.Sphere);
            c.transform.localScale = new Vector3(c.transform.localScale.x, c.transform.localScale.y * 0.7f, c.transform.localScale.z);
        }
        U.Box("Havlu", trash.transform, new Vector3(x + 0.8f, 0.05f, Z(5.3f)), new Vector3(0.7f, 0.05f, 0.45f), new Color(1f, 0.75f, 0.8f));
        trash.SetActive(false);

        pad = new ProgressPad(ct, CleanSpot + Vector3.up * 0.05f, 0.8f, new Color(0.25f, 0.6f, 0.95f), new Color(0.3f, 0.95f, 0.5f));
        pad.Show(false);
        reqPad = new ProgressPad(ct, CleanSpot + Vector3.up * 0.05f, 0.8f, new Color(1f, 0.6f, 0.2f), new Color(0.3f, 0.95f, 0.5f));
        reqPad.Show(false);
        needText = U.Text(ct, new Vector3(x, 1.5f, Z(6.2f)), "Çarşaf gerekli", 0.045f, new Color(1f, 0.75f, 0.45f), true);
        needText.gameObject.SetActive(false);
        reqBubble = new GameObject("IstekBalonu");
        reqBubble.transform.SetParent(ct, false);
        reqBubble.transform.position = new Vector3(x, 3.1f, Z(7.6f));
        reqBubble.transform.rotation = U.CamRot;
        var plate = U.Flat("Balon", reqBubble.transform, new Vector3(0, 0, 0.03f), new Vector3(2.6f, 0.6f, 0.02f), Color.white);
        plate.transform.localRotation = Quaternion.identity;
        var tail = U.Flat("BalonUc", reqBubble.transform, new Vector3(0, -0.36f, 0.03f), new Vector3(0.22f, 0.22f, 0.02f), Color.white);
        tail.transform.localRotation = Quaternion.Euler(0, 0, 45f);
        reqText = U.Text(reqBubble.transform, Vector3.zero, "", 0.055f, new Color(0.25f, 0.2f, 0.35f));
        reqText.transform.localRotation = Quaternion.identity;
        reqBubble.SetActive(false);

        BuildLevel1();
        BuildLevel2();
        BuildLevel3();
        BuildThemes();

        // ---- Kilitli gorunum ----
        cover = new GameObject("Kilitli");
        cover.transform.SetParent(transform, false);
        U.Prim("BetonZemin", cover.transform, new Vector3(x, -0.04f, Z(7.25f)), new Vector3(4.8f, 0.1f, 6.5f), U.Mat(new Color(0.55f, 0.55f, 0.58f), U.CarpetTex, new Vector2(2, 2), 0.1f, 0f));
        for (int k = 0; k < 3; k++)
            U.Furn("cardboardBoxClosed", cover.transform, new Vector3(x - 1.2f + k * 1.1f, 0f, 8.6f + (k % 2) * 0.5f), k * 25f, S * 1.6f, new Vector3(0.8f, 0.6f, 0.8f), new Color(0.75f, 0.6f, 0.4f));
        U.Box("Seritler", cover.transform, new Vector3(x, 0.55f, Z(4.05f)), new Vector3(1.7f, 0.08f, 0.05f), new Color(1f, 0.8f, 0.1f));
        U.Text(cover.transform, new Vector3(x, 1.7f, Z(7f)), "KAPALI", 0.08f, new Color(1, 1, 1, 0.8f), true);

        // ---- Kapi ustu numara ----
        U.Text(transform, new Vector3(x, 1.35f, Z(3.9f)), Number.ToString(), 0.085f, new Color(0.3f, 0.22f, 0.15f));
        levelText = U.Text(transform, new Vector3(x, 1.05f, Z(3.85f)), "", 0.045f, new Color(0.85f, 0.6f, 0.1f));

        tips = MoneyPile.Create(transform, new Vector3(x + 1.5f, 0, Z(2.9f)));
    }

    // ---------------- SEVIYE 1: Standart ----------------
    void BuildLevel1()
    {
        var t = NewLevel(1);
        U.Prim("Zemin", t, new Vector3(x, -0.04f, Z(7.25f)), new Vector3(4.8f, 0.1f, 6.5f),
            U.Mat(new Color(0.9f, 0.78f, 0.62f), U.WoodTex, new Vector2(2.5f, 3f), 0.3f, 0f));
        U.Box("DuvarKagidi", t, new Vector3(x, 1.25f, Z(10.47f)), new Vector3(4.6f, 2.4f, 0.02f), new Color(0.96f, 0.92f, 0.84f));
        Window(t);
        U.Prim("Hali", t, new Vector3(x, 0.012f, Z(6.4f)), new Vector3(2.4f, 0.02f, 1.6f), U.Mat(new Color(0.7f, 0.8f, 0.7f), U.CarpetTex, Vector2.one, 0.05f, 0f));

        var bed = Ob(1, U.Furn("bedSingle", t, new Vector3(x, 0f, Z(8.65f)), 180f, S, new Vector3(1.3f, 0.55f, 2.4f), Wood));
        bedTop = bed.min.y + bed.size.y * 0.69f;
        var ns = Ob(1, U.Furn("cabinetBedDrawerTable", t, new Vector3(x + 1.2f, 0f, Z(9.75f)), 180f, S, new Vector3(0.55f, 0.55f, 0.45f), Wood));
        U.Furn("lampRoundTable", t, new Vector3(x + 1.2f, ns.max.y, Z(9.75f)), 180f, S, new Vector3(0.3f, 0.6f, 0.3f), new Color(1f, 0.9f, 0.6f));
        Ob(1, U.Furn("pottedPlant", t, new Vector3(x - 1.95f, 0f, Z(9.85f)), 30f, 2.2f, new Vector3(0.5f, 1.4f, 0.5f), new Color(0.3f, 0.65f, 0.35f)));
        Ob(1, U.Furn("chairRounded", t, new Vector3(x + 1.95f, 0f, Z(5.2f)), -120f, 2.3f, new Vector3(0.5f, 1f, 0.5f), Wood));
    }

    // ---------------- SEVIYE 2: Konfor ----------------
    void BuildLevel2()
    {
        var t = NewLevel(2);
        U.Prim("Zemin", t, new Vector3(x, -0.04f, Z(7.25f)), new Vector3(4.8f, 0.1f, 6.5f),
            U.Mat(new Color(0.56f, 0.66f, 0.8f), U.CarpetTex, new Vector2(3f, 4f), 0.05f, 0f));
        U.Box("DuvarKagidi", t, new Vector3(x, 1.25f, Z(10.47f)), new Vector3(4.6f, 2.4f, 0.02f), new Color(0.72f, 0.84f, 0.95f));
        U.Box("DuvarSeridi", t, new Vector3(x, 0.9f, Z(10.45f)), new Vector3(4.6f, 0.08f, 0.03f), Color.white);
        Window(t);
        Curtains(t, new Color(0.3f, 0.45f, 0.75f));
        U.Prim("Hali", t, new Vector3(x, 0.012f, Z(6.3f)), new Vector3(3.4f, 0.02f, 2.2f), U.Mat(new Color(0.95f, 0.92f, 0.85f), U.CarpetTex, new Vector2(2, 1.3f), 0.05f, 0f));

        var bed = Ob(2, U.Furn("bedDouble", t, new Vector3(x, 0f, Z(8.65f)), 180f, S, new Vector3(2f, 0.55f, 2.4f), Wood));
        bedTop = bed.min.y + bed.size.y * 0.69f;
        foreach (float side in new[] { -1f, 1f })
        {
            var ns = Ob(2, U.Furn("cabinetBedDrawerTable", t, new Vector3(x + 1.6f * side, 0f, Z(9.75f)), 180f, S, new Vector3(0.55f, 0.55f, 0.45f), Wood));
            U.Furn("lampRoundTable", t, new Vector3(x + 1.6f * side, ns.max.y, Z(9.75f)), 180f, S, new Vector3(0.3f, 0.6f, 0.3f), new Color(1f, 0.9f, 0.6f));
            U.Prim("LambaIsik", t, new Vector3(x + 1.6f * side, ns.max.y + 0.42f, Z(9.75f)), Vector3.one * 0.16f, U.Glow(new Color(1f, 0.88f, 0.6f), 2f), PrimitiveType.Sphere);
        }
        var tvc = Ob(2, U.Furn("cabinetTelevision", t, new Vector3(x - 2.0f, 0f, Z(7.2f)), 90f, S, new Vector3(0.55f, 0.65f, 1.6f), Wood));
        U.Furn("televisionModern", t, new Vector3(x - 2.05f, tvc.max.y, Z(7.2f)), 90f, S, new Vector3(0.2f, 0.9f, 1.4f), new Color(0.15f, 0.15f, 0.17f));
        Ob(2, U.Furn("bookcaseClosedDoors", t, new Vector3(x + 1.95f, 0f, Z(7.0f)), -90f, S, new Vector3(0.55f, 1.8f, 0.85f), Wood));
        Ob(2, U.Furn("loungeChair", t, new Vector3(x + 1.7f, 0f, Z(5.0f)), -135f, 2.0f, new Vector3(1f, 0.9f, 0.9f), new Color(0.3f, 0.45f, 0.75f)));
        Painting(t, new Color(0.35f, 0.65f, 0.85f));
    }

    // ---------------- SEVIYE 3: Kral Dairesi ----------------
    void BuildLevel3()
    {
        var t = NewLevel(3);
        U.Prim("Zemin", t, new Vector3(x, -0.04f, Z(7.25f)), new Vector3(4.8f, 0.1f, 6.5f),
            U.Mat(new Color(0.97f, 0.95f, 0.93f), U.TileTex, new Vector2(2.4f, 3.2f), 0.85f, 0f));
        U.Flat("AltinKenar", t, new Vector3(x, 0.015f, Z(7.25f)), new Vector3(4.2f, 0.02f, 5.9f), Gold);
        U.Prim("ZeminIc", t, new Vector3(x, 0.02f, Z(7.25f)), new Vector3(4.0f, 0.02f, 5.7f),
            U.Mat(new Color(0.97f, 0.95f, 0.93f), U.TileTex, new Vector2(2f, 2.8f), 0.85f, 0f));
        U.Box("DuvarKagidi", t, new Vector3(x, 1.25f, Z(10.47f)), new Vector3(4.6f, 2.4f, 0.02f), new Color(0.55f, 0.16f, 0.24f));
        for (int k = -2; k <= 2; k++)
            U.Box("AltinCizgi", t, new Vector3(x + k * 0.9f, 1.25f, Z(10.45f)), new Vector3(0.04f, 2.4f, 0.02f), Gold);
        Window(t);
        Curtains(t, new Color(0.85f, 0.65f, 0.25f));
        U.Prim("Hali", t, new Vector3(x, 0.035f, Z(6.1f)), new Vector3(2.8f, 0.02f, 1.9f), U.Mat(new Color(0.75f, 0.2f, 0.28f), U.CarpetTex, new Vector2(2, 1.3f), 0.05f, 0f));
        U.Flat("HaliKenar", t, new Vector3(x, 0.03f, Z(6.1f)), new Vector3(3.0f, 0.02f, 2.1f), Gold);

        var bed = Ob(3, U.Furn("bedDouble", t, new Vector3(x, 0f, Z(8.65f)), 180f, S, new Vector3(2f, 0.55f, 2.4f), Wood));
        // Kanopi (cibinlikli yatak)
        foreach (float sx in new[] { -1f, 1f })
            foreach (float sz in new[] { bed.min.z + 0.08f, bed.max.z - 0.08f })
                U.Box("KanopiDirek", t, new Vector3(x + sx * (bed.size.x / 2f - 0.05f), 1.2f, sz), new Vector3(0.09f, 2.4f, 0.09f), Gold);
        U.Box("KanopiUst", t, new Vector3(x, 2.4f, bed.center.z), new Vector3(bed.size.x + 0.1f, 0.08f, bed.size.z), Gold);
        foreach (float sx in new[] { -1f, 1f })
            U.Box("Tul", t, new Vector3(x + sx * (bed.size.x / 2f + 0.02f), 1.9f, bed.center.z), new Vector3(0.03f, 0.9f, bed.size.z * 0.9f), new Color(0.98f, 0.92f, 0.96f));
        U.Box("YatakOrtu", t, new Vector3(x, bed.min.y + bed.size.y * 0.7f + 0.01f, Z(7.75f)), new Vector3(bed.size.x * 0.92f, 0.03f, 0.4f), Gold);
        U.Furn("pillowBlue", t, new Vector3(x, bed.min.y + bed.size.y * 0.69f, Z(9.15f)), 0f, S, new Vector3(0.6f, 0.15f, 0.35f), new Color(0.5f, 0.7f, 0.95f));

        foreach (float side in new[] { -1f, 1f })
        {
            var ns = Ob(3, U.Furn("cabinetBedDrawerTable", t, new Vector3(x + 1.6f * side, 0f, Z(9.75f)), 180f, S, new Vector3(0.55f, 0.55f, 0.45f), Wood));
            U.Furn("lampRoundTable", t, new Vector3(x + 1.6f * side, ns.max.y, Z(9.75f)), 180f, S, new Vector3(0.3f, 0.6f, 0.3f), new Color(1f, 0.9f, 0.6f));
            U.Prim("LambaIsik", t, new Vector3(x + 1.6f * side, ns.max.y + 0.42f, Z(9.75f)), Vector3.one * 0.16f, U.Glow(new Color(1f, 0.88f, 0.6f), 2.2f), PrimitiveType.Sphere);
        }
        var tvc = Ob(3, U.Furn("cabinetTelevision", t, new Vector3(x - 2.0f, 0f, Z(7.4f)), 90f, S, new Vector3(0.55f, 0.65f, 1.6f), Wood));
        U.Furn("televisionModern", t, new Vector3(x - 2.05f, tvc.max.y, Z(7.4f)), 90f, S, new Vector3(0.2f, 0.9f, 1.4f), new Color(0.15f, 0.15f, 0.17f));
        Ob(3, U.Furn("bathtub", t, new Vector3(x - 1.75f, 0f, Z(5.15f)), 90f, 1.6f, new Vector3(0.9f, 0.6f, 1.9f), Color.white));
        U.Box("Kopuk", t, new Vector3(x - 1.75f, 0.62f, Z(5.15f)), new Vector3(0.6f, 0.08f, 1.3f), new Color(0.85f, 0.95f, 1f), PrimitiveType.Sphere);
        Ob(3, U.Furn("loungeChair", t, new Vector3(x + 1.7f, 0f, Z(5.0f)), -135f, 2.0f, new Vector3(1f, 0.9f, 0.9f), new Color(0.75f, 0.2f, 0.3f)));
        var fl = Ob(3, U.Furn("lampSquareFloor", t, new Vector3(x + 2.05f, 0f, Z(6.3f)), 0f, S, new Vector3(0.3f, 1.8f, 0.3f), new Color(1f, 0.9f, 0.6f)));
        U.Prim("AbajurIsik", t, new Vector3(fl.center.x, fl.max.y - 0.2f, fl.center.z), Vector3.one * 0.22f, U.Glow(new Color(1f, 0.88f, 0.6f), 2.2f), PrimitiveType.Sphere);
        Ob(3, U.Furn("pottedPlant", t, new Vector3(x + 2.0f, 0f, Z(8.1f)), 0f, 2.4f, new Vector3(0.5f, 1.4f, 0.5f), new Color(0.3f, 0.65f, 0.35f)));

        // Avize
        U.Box("AvizeZincir", t, new Vector3(x, 2.75f, Z(6.6f)), new Vector3(0.03f, 0.5f, 0.03f), Gold);
        U.Box("AvizeHalka", t, new Vector3(x, 2.45f, Z(6.6f)), new Vector3(0.8f, 0.03f, 0.8f), Gold, PrimitiveType.Cylinder);
        for (int k = 0; k < 6; k++)
        {
            float a = k * Mathf.PI / 3f;
            U.Prim("AvizeIsik", t, new Vector3(x + Mathf.Cos(a) * 0.38f, 2.52f, Z(6.6f) + Mathf.Sin(a) * 0.38f), Vector3.one * 0.12f, U.Glow(new Color(1f, 0.9f, 0.65f), 3f), PrimitiveType.Sphere);
        }
        Painting(t, new Color(0.95f, 0.7f, 0.3f));
        U.Text(t, new Vector3(x, 2.15f, Z(10.3f)), "★★★", 0.07f, Gold);
    }

    Transform NewLevel(int l)
    {
        var g = new GameObject("Seviye" + l);
        g.transform.SetParent(transform, false);
        lv[l] = g;
        return g.transform;
    }

    Bounds Ob(int l, Bounds b)
    {
        lvObs[l].Add(Rect.MinMaxRect(b.min.x, b.min.z, b.max.x, b.max.z));
        return b;
    }

    void Window(Transform t)
    {
        U.Box("Pencere", t, new Vector3(x, 1.5f, Z(10.44f)), new Vector3(1.9f, 1.2f, 0.04f), Color.white);
        U.Prim("Cam", t, new Vector3(x, 1.5f, Z(10.42f)), new Vector3(1.65f, 0.95f, 0.03f), U.Glow(new Color(0.6f, 0.82f, 1f), 0.6f));
        U.Box("PencereOrta", t, new Vector3(x, 1.5f, Z(10.4f)), new Vector3(0.06f, 0.95f, 0.03f), Color.white);
    }

    void Curtains(Transform t, Color c)
    {
        U.Box("Perde", t, new Vector3(x - 1.15f, 1.45f, Z(10.36f)), new Vector3(0.45f, 1.6f, 0.06f), c);
        U.Box("Perde", t, new Vector3(x + 1.15f, 1.45f, Z(10.36f)), new Vector3(0.45f, 1.6f, 0.06f), c);
        U.Box("PerdeCubuk", t, new Vector3(x, 2.28f, Z(10.36f)), new Vector3(2.9f, 0.05f, 0.05f), Gold);
    }

    void Painting(Transform t, Color c)
    {
        U.Box("Cerceve", t, new Vector3(x - 2.33f, 1.6f, Z(5.5f)), new Vector3(0.04f, 0.6f, 0.85f), Gold);
        var canvas = U.Box("Resim", t, new Vector3(x - 2.31f, 1.6f, Z(5.5f)), new Vector3(0.03f, 0.48f, 0.72f), c);
        Photos.Apply(canvas, 0.72f, 0.48f);
    }

    // ---------------- Durum ----------------
    public void ApplyLevel(int l, bool fx)
    {
        bool wasLocked = state == State.Locked;
        level = Mathf.Clamp(l, 0, 3);
        if (level == 0) { state = State.Locked; }
        else if (wasLocked) state = State.Clean;

        cover.SetActive(level == 0);
        for (int k = 1; k <= 3; k++) lv[k].SetActive(level == k && !IsSuitePart);
        if (lounge) lounge.SetActive(IsSuitePart);
        activeObs.Clear();
        if (IsSuitePart) activeObs.AddRange(loungeObs);
        else if (level > 0) activeObs.AddRange(lvObs[level]);

        // yatak yuksekligi ve battaniye rengi seviyeye gore
        var bedR = lv[Mathf.Max(1, level)].transform.Find(level == 1 ? "bedSingle" : "bedDouble");
        if (bedR)
        {
            var b = U.WorldBounds(bedR.gameObject);
            bedTop = b.min.y + b.size.y * 0.69f;
            float w = Mathf.Max(0.9f, b.size.x * 0.85f);
            foreach (Transform c in blanket.transform)
            {
                c.localPosition = new Vector3(c.localPosition.x, bedTop + 0.32f, c.localPosition.z);
                c.localScale = new Vector3(w, c.localScale.y, c.localScale.z);
            }
            foreach (Transform c in messy.transform)
                if (c.name == "DaginikCarsaf")
                {
                    c.localPosition = new Vector3(c.localPosition.x, bedTop + 0.06f, c.localPosition.z);
                    c.localScale = new Vector3(w, c.localScale.y, c.localScale.z);
                }
        }
        Color[] bc = { Color.white, new Color(0.55f, 0.75f, 0.95f), new Color(0.75f, 0.68f, 0.95f), new Color(0.75f, 0.2f, 0.3f) };
        foreach (var r in blanket.GetComponentsInChildren<Renderer>(true))
            if (r.name == "Battaniye") r.sharedMaterial = U.Mat(bc[Mathf.Max(1, level)]);

        levelText.text = LevelLabel;
        ApplyTheme();
        ApplyKind();

        if (fx && level > 0)
        {
            U.Burst(new Vector3(x, 1.5f, Z(7.5f)), new Color(1f, 0.85f, 0.3f), new Color(1f, 0.5f, 0.7f), 80, 6f);
            Sfx.Play("unlock");
            GameManager.I.Notify(wasLocked ? "Yeni oda açıldı: " + Number + "!" : Number + " artık " + Eco.LevelNames[level] + "!");
        }
    }

    // ---------------- Temalar ----------------
    void BuildThemes()
    {
        for (int k = 1; k <= 3; k++)
        {
            var w = lv[k].transform.Find("DuvarKagidi");
            if (w) wallOrig[k] = w.GetComponent<Renderer>().sharedMaterial.color;
        }
        for (int th = 1; th < Themes.Names.Length; th++)
        {
            var g = new GameObject("Tema" + Themes.Names[th]);
            g.transform.SetParent(transform, false);
            themeGroups[th] = g;
            var t = g.transform;
            switch (th)
            {
                case 1: // Deniz
                    U.Flat("HaliMavi", t, new Vector3(x, 0.045f, Z(6.0f)), new Vector3(2.6f, 0.01f, 1.5f), new Color(0.2f, 0.4f, 0.7f));
                    for (int k = 0; k < 3; k++)
                        U.Flat("HaliCizgi", t, new Vector3(x, 0.05f, Z(5.55f + k * 0.45f)), new Vector3(2.6f, 0.01f, 0.14f), Color.white);
                    var ring = U.Box("CanSimidi", t, new Vector3(x - 1.85f, 1.75f, Z(10.42f)), new Vector3(0.55f, 0.05f, 0.55f), new Color(0.95f, 0.3f, 0.3f), PrimitiveType.Cylinder);
                    ring.transform.localRotation = Quaternion.Euler(90f, 0, 0);
                    var hole = U.Box("SimitIc", t, new Vector3(x - 1.85f, 1.75f, Z(10.39f)), new Vector3(0.28f, 0.05f, 0.28f), Themes.Wall[1], PrimitiveType.Cylinder);
                    hole.transform.localRotation = Quaternion.Euler(90f, 0, 0);
                    foreach (float a in new[] { 0f, 90f })
                    {
                        var st = U.Box("SimitSerit", t, new Vector3(x - 1.85f, 1.75f, Z(10.38f)), new Vector3(0.58f, 0.09f, 0.02f), Color.white);
                        st.transform.localRotation = Quaternion.Euler(0, 0, a + 45f);
                    }
                    U.Box("Tekne", t, new Vector3(x + 1.85f, 1.45f, Z(10.42f)), new Vector3(0.6f, 0.12f, 0.04f), new Color(0.55f, 0.38f, 0.25f));
                    var sail = U.Box("Yelken", t, new Vector3(x + 1.85f, 1.75f, Z(10.41f)), new Vector3(0.35f, 0.35f, 0.02f), Color.white);
                    sail.transform.localRotation = Quaternion.Euler(0, 0, 45f);
                    U.Box("Serit", t, new Vector3(x, 0.4f, Z(10.43f)), new Vector3(4.6f, 0.12f, 0.02f), new Color(0.2f, 0.4f, 0.7f));
                    break;
                case 2: // Bohem
                    U.Box("HaliYuvarlak", t, new Vector3(x, 0.045f, Z(6.0f)), new Vector3(2.3f, 0.01f, 2.0f), new Color(0.85f, 0.55f, 0.25f), PrimitiveType.Cylinder);
                    U.Box("HaliIc", t, new Vector3(x, 0.05f, Z(6.0f)), new Vector3(1.4f, 0.01f, 1.2f), new Color(0.95f, 0.85f, 0.6f), PrimitiveType.Cylinder);
                    foreach (float sx in new[] { -1.85f, 1.85f })
                    {
                        U.Box("Ip", t, new Vector3(x + sx, 2.35f, Z(10.2f)), new Vector3(0.02f, 0.5f, 0.02f), new Color(0.6f, 0.45f, 0.3f));
                        U.Box("AsiliSaksi", t, new Vector3(x + sx, 2.05f, Z(10.2f)), new Vector3(0.28f, 0.2f, 0.28f), new Color(0.85f, 0.55f, 0.35f), PrimitiveType.Cylinder);
                        U.Box("Sarmasik", t, new Vector3(x + sx, 2.2f, Z(10.2f)), new Vector3(0.45f, 0.3f, 0.45f), new Color(0.3f, 0.65f, 0.3f), PrimitiveType.Sphere);
                        U.Box("Sarkan", t, new Vector3(x + sx + 0.12f, 1.85f, Z(10.2f)), new Vector3(0.12f, 0.4f, 0.12f), new Color(0.35f, 0.7f, 0.35f), PrimitiveType.Sphere);
                    }
                    U.Box("Makrome", t, new Vector3(x - 1.3f, 1.55f, Z(10.43f)), new Vector3(0.35f, 0.55f, 0.02f), new Color(0.96f, 0.9f, 0.78f));
                    for (int k = 0; k < 4; k++)
                        U.Box("Puskul", t, new Vector3(x - 1.42f + k * 0.08f, 1.2f, Z(10.43f)), new Vector3(0.03f, 0.18f, 0.02f), new Color(0.96f, 0.9f, 0.78f));
                    break;
                case 3: // Modern
                    U.Flat("HaliGri", t, new Vector3(x, 0.045f, Z(6.0f)), new Vector3(2.8f, 0.01f, 1.7f), new Color(0.22f, 0.23f, 0.26f));
                    U.Flat("HaliKenar", t, new Vector3(x, 0.05f, Z(6.0f)), new Vector3(2.4f, 0.01f, 1.3f), new Color(0.35f, 0.36f, 0.4f));
                    U.Prim("Neon", t, new Vector3(x, 2.38f, Z(10.42f)), new Vector3(4.4f, 0.05f, 0.04f), U.Glow(new Color(0.4f, 0.8f, 1f), 3f));
                    foreach (float sx in new[] { -1.85f, 1.85f })
                    {
                        U.Box("Cerceve", t, new Vector3(x + sx, 1.7f, Z(10.43f)), new Vector3(0.6f, 0.7f, 0.02f), new Color(0.1f, 0.1f, 0.12f));
                        U.Box("Blok", t, new Vector3(x + sx - 0.1f, 1.8f, Z(10.42f)), new Vector3(0.25f, 0.3f, 0.02f), sx < 0 ? new Color(0.95f, 0.75f, 0.2f) : new Color(0.9f, 0.35f, 0.3f));
                        U.Box("Blok", t, new Vector3(x + sx + 0.12f, 1.55f, Z(10.415f)), new Vector3(0.2f, 0.25f, 0.02f), new Color(0.3f, 0.55f, 0.9f));
                    }
                    break;
                case 4: // Romantik
                    U.Box("HaliPembe", t, new Vector3(x, 0.045f, Z(6.0f)), new Vector3(2.4f, 0.01f, 2.0f), new Color(0.95f, 0.6f, 0.7f), PrimitiveType.Cylinder);
                    Color red = new Color(0.95f, 0.25f, 0.4f);
                    foreach (float sx in new[] { -1.85f, 1.85f })
                    {
                        U.Prim("Kalp", t, new Vector3(x + sx - 0.1f, 1.85f, Z(10.42f)), new Vector3(0.24f, 0.24f, 0.05f), U.Glow(red, 1.2f), PrimitiveType.Sphere);
                        U.Prim("Kalp", t, new Vector3(x + sx + 0.1f, 1.85f, Z(10.42f)), new Vector3(0.24f, 0.24f, 0.05f), U.Glow(red, 1.2f), PrimitiveType.Sphere);
                        var tip = U.Prim("KalpUc", t, new Vector3(x + sx, 1.72f, Z(10.42f)), new Vector3(0.24f, 0.24f, 0.05f), U.Glow(red, 1.2f));
                        tip.transform.localRotation = Quaternion.Euler(0, 0, 45f);
                    }
                    for (int k = 0; k < 12; k++)
                        U.Prim("PeriIsigi", t, new Vector3(x - 2.2f + k * 0.4f, 2.3f - Mathf.Sin(k / 11f * Mathf.PI) * 0.25f, Z(10.4f)), Vector3.one * 0.07f,
                            U.Glow(new Color(1f, 0.85f, 0.6f), 3f), PrimitiveType.Sphere);
                    for (int k = 0; k < 7; k++)
                        U.Flat("GulYapragi", t, new Vector3(x + Random.Range(-1.1f, 1.1f), 0.06f, Z(Random.Range(5.2f, 6.8f))), new Vector3(0.1f, 0.01f, 0.08f), red);
                    break;
            }
            g.SetActive(false);
        }
    }

    public void ApplyTheme()
    {
        for (int th = 1; th < themeGroups.Length; th++)
            if (themeGroups[th]) themeGroups[th].SetActive(theme == th && level > 0 && !IsSuitePart);
        for (int k = 1; k <= 3; k++)
        {
            var w = lv[k] ? lv[k].transform.Find("DuvarKagidi") : null;
            if (!w) continue;
            Color c = theme > 0 ? Themes.Wall[theme] : wallOrig[k];
            w.GetComponent<Renderer>().sharedMaterial = U.Mat(c);
        }
    }

    public void SetTheme(int t, bool fx)
    {
        theme = Mathf.Clamp(t, 0, Themes.Names.Length - 1);
        themeOwned |= 1 << theme;
        ApplyTheme();
        if (fx)
        {
            U.Burst(new Vector3(x, 1.5f, Z(7.5f)), new Color(1f, 0.6f, 0.8f), new Color(0.6f, 0.85f, 1f), 50, 5f);
            Sfx.Play("unlock", 0.7f);
        }
    }


    // ---------------- Oda tipleri ----------------
    string LevelLabel => level <= 0 ? "" : IsSuitePart ? "Süit salonu" : IsSuite ? "Başkanlık Süiti" :
        Eco.LevelNames[level] + (kind > 0 ? " · " + RoomKinds.Short[kind] : "");

    public void SetKind(int k, bool fx)
    {
        kind = Mathf.Clamp(k, 0, RoomKinds.Suit);
        ApplyKind();
        if (levelText) levelText.text = LevelLabel;
        if (fx)
        {
            U.Burst(new Vector3(x, 1.5f, Z(7.5f)), new Color(1f, 0.85f, 0.4f), new Color(0.6f, 0.85f, 1f), 50, 5f);
            Sfx.Play("unlock", 0.7f);
        }
    }

    void ApplyKind()
    {
        if (kindGroup) Destroy(kindGroup);
        kindGroup = null;
        if (level <= 0 || IsSuitePart || kind == RoomKinds.Klasik) return;
        kindGroup = new GameObject("OdaTipi");
        kindGroup.transform.SetParent(transform, false);
        var t = kindGroup.transform;
        float top = bedTop;
        switch (kind)
        {
            case RoomKinds.Ekonomik:
                // duvarda sirt cantasi askisi
                U.Box("Aski", t, new Vector3(x - 2.3f, 1.85f, Z(8.5f)), new Vector3(0.05f, 0.1f, 1.3f), new Color(0.55f, 0.4f, 0.28f));
                U.Box("Canta", t, new Vector3(x - 2.17f, 1.45f, Z(8.1f)), new Vector3(0.22f, 0.55f, 0.42f), new Color(0.95f, 0.55f, 0.2f));
                U.Box("Canta", t, new Vector3(x - 2.17f, 1.5f, Z(8.9f)), new Vector3(0.22f, 0.48f, 0.38f), new Color(0.3f, 0.6f, 0.85f));
                U.Box("Harita", t, new Vector3(x + 2.32f, 1.6f, Z(8.6f)), new Vector3(0.03f, 0.55f, 0.85f), new Color(0.95f, 0.9f, 0.7f));
                U.Box("HaritaYol", t, new Vector3(x + 2.3f, 1.6f, Z(8.6f)), new Vector3(0.02f, 0.05f, 0.7f), new Color(0.85f, 0.3f, 0.3f));
                break;
            case RoomKinds.Aile:
                Balloons(t, new[] { new Color(1f, 0.85f, 0.25f), new Color(0.35f, 0.65f, 1f), new Color(0.45f, 0.85f, 0.45f) });
                Color brown = new Color(0.65f, 0.45f, 0.28f);
                U.Box("Ayi", t, new Vector3(x + 0.45f, top + 0.2f, Z(9.25f)), new Vector3(0.34f, 0.36f, 0.28f), brown, PrimitiveType.Sphere);
                U.Box("AyiBas", t, new Vector3(x + 0.45f, top + 0.47f, Z(9.3f)), Vector3.one * 0.25f, brown, PrimitiveType.Sphere);
                U.Box("AyiKulak", t, new Vector3(x + 0.35f, top + 0.58f, Z(9.3f)), Vector3.one * 0.09f, brown, PrimitiveType.Sphere);
                U.Box("AyiKulak", t, new Vector3(x + 0.55f, top + 0.58f, Z(9.3f)), Vector3.one * 0.09f, brown, PrimitiveType.Sphere);
                U.Box("Kup", t, new Vector3(x - 0.5f, top + 0.08f, Z(8.0f)), Vector3.one * 0.16f, new Color(0.95f, 0.35f, 0.35f));
                U.Box("Kup", t, new Vector3(x - 0.3f, top + 0.08f, Z(7.9f)), Vector3.one * 0.16f, new Color(0.35f, 0.6f, 0.95f));
                break;
            case RoomKinds.Balayi:
                Balloons(t, new[] { new Color(1f, 0.25f, 0.4f), new Color(1f, 0.6f, 0.75f), new Color(1f, 0.25f, 0.4f) });
                Color red = new Color(0.9f, 0.15f, 0.3f);
                U.Box("Kalp", t, new Vector3(x - 0.1f, top + 0.05f, Z(8.2f)), new Vector3(0.28f, 0.04f, 0.28f), red, PrimitiveType.Sphere);
                U.Box("Kalp", t, new Vector3(x + 0.1f, top + 0.05f, Z(8.2f)), new Vector3(0.28f, 0.04f, 0.28f), red, PrimitiveType.Sphere);
                var tip = U.Box("KalpUc", t, new Vector3(x, top + 0.05f, Z(8.05f)), new Vector3(0.22f, 0.04f, 0.22f), red);
                tip.transform.localRotation = Quaternion.Euler(0, 45f, 0);
                for (int k = 0; k < 9; k++)
                    U.Flat("GulYapragi", t, new Vector3(x + Random.Range(-0.7f, 0.7f), top + 0.03f, Z(Random.Range(7.6f, 9.2f))), new Vector3(0.1f, 0.01f, 0.08f), new Color(0.95f, 0.25f, 0.4f));
                break;
            case RoomKinds.Is:
                U.Box("Canta", t, new Vector3(x + 0.8f, 0.22f, Z(7.05f)), new Vector3(0.55f, 0.42f, 0.16f), new Color(0.35f, 0.22f, 0.12f));
                U.Box("CantaSap", t, new Vector3(x + 0.8f, 0.47f, Z(7.05f)), new Vector3(0.2f, 0.06f, 0.04f), new Color(0.2f, 0.15f, 0.1f));
                U.Box("Laptop", t, new Vector3(x - 0.2f, top + 0.03f, Z(8.0f)), new Vector3(0.5f, 0.03f, 0.35f), new Color(0.25f, 0.26f, 0.3f));
                U.Prim("Ekran", t, new Vector3(x - 0.2f, top + 0.2f, Z(8.18f)), new Vector3(0.5f, 0.32f, 0.03f), U.Glow(new Color(0.45f, 0.7f, 1f), 0.9f));
                U.Box("Tahta", t, new Vector3(x + 2.32f, 1.65f, Z(8.6f)), new Vector3(0.03f, 0.6f, 1.0f), Color.white);
                for (int k = 0; k < 3; k++)
                    U.Box("Cizgi", t, new Vector3(x + 2.3f, 1.78f - k * 0.12f, Z(8.5f)), new Vector3(0.02f, 0.03f, 0.6f - k * 0.12f), new Color(0.3f, 0.45f, 0.85f));
                break;
            case RoomKinds.Suit:
                Color gold = new Color(0.95f, 0.78f, 0.3f);
                U.Flat("KirmiziHali", t, new Vector3(x, 0.05f, Z(4.5f)), new Vector3(1.1f, 0.01f, 0.9f), new Color(0.75f, 0.12f, 0.15f));
                U.Text(t, new Vector3(x + 2.5f, 2.42f, Z(10.3f)), "BAŞKANLIK SÜİTİ", 0.06f, gold);
                break;
        }
        U.NoShadow(kindGroup);
    }

    void Balloons(Transform t, Color[] cs)
    {
        for (int i = 0; i < cs.Length; i++)
        {
            var p = new Vector3(x - 1.3f + i * 0.3f, 2.2f + (i % 2) * 0.22f, Z(7.15f + i * 0.08f));
            U.Box("Balon", t, p, new Vector3(0.36f, 0.44f, 0.36f), cs[i], PrimitiveType.Sphere);
            U.Box("Ip", t, p + new Vector3(0.05f, -0.62f, 0f), new Vector3(0.012f, 0.8f, 0.012f), Color.white);
        }
    }

    // ---------------- Baskanlik Suiti ----------------
    public void MakeSuite(Room part, bool fx)
    {
        suitePart = part;
        part.suiteMain = this;
        kind = RoomKinds.Suit;
        part.kind = RoomKinds.Klasik;
        part.BuildLounge();
        part.ApplyLevel(3, false);
        part.guest = null;
        ApplyLevel(3, false);
        if (fx)
        {
            U.Burst(new Vector3(x + 2.5f, 2f, Z(7.5f)), new Color(1f, 0.85f, 0.3f), new Color(1f, 0.5f, 0.7f), 160, 8f);
            Sfx.Play("unlock");
        }
    }

    void BuildLounge()
    {
        if (lounge) return;
        lounge = new GameObject("SuitSalon");
        lounge.transform.SetParent(transform, false);
        var t = lounge.transform;
        loungeObs.Clear();
        Color gold = new Color(0.95f, 0.78f, 0.3f);
        U.Prim("Zemin", t, new Vector3(x, -0.04f, Z(7.25f)), new Vector3(4.8f, 0.1f, 6.5f), U.Mat(new Color(0.97f, 0.95f, 0.93f), U.TileTex, new Vector2(2.4f, 3.2f), 0.85f, 0f));
        U.Box("DuvarKagidi", t, new Vector3(x, 1.25f, Z(10.47f)), new Vector3(4.6f, 2.4f, 0.02f), new Color(0.55f, 0.16f, 0.24f));
        for (int k = -2; k <= 2; k++)
            U.Box("AltinCizgi", t, new Vector3(x + k * 0.9f, 1.25f, Z(10.45f)), new Vector3(0.04f, 2.4f, 0.02f), gold);
        Window(t);
        Curtains(t, new Color(0.85f, 0.65f, 0.25f));
        U.Flat("HaliKenar", t, new Vector3(x, 0.03f, Z(7.4f)), new Vector3(3.6f, 0.02f, 2.8f), gold);
        U.Prim("Hali", t, new Vector3(x, 0.035f, Z(7.4f)), new Vector3(3.4f, 0.02f, 2.6f), U.Mat(new Color(0.2f, 0.24f, 0.42f), U.CarpetTex, new Vector2(2, 1.5f), 0.05f, 0f));
        var sofa = U.Furn("loungeDesignSofa", t, new Vector3(x, 0f, Z(9.4f)), 180f, S, new Vector3(2.4f, 0.9f, 0.9f), new Color(0.75f, 0.2f, 0.3f));
        loungeObs.Add(Rect.MinMaxRect(sofa.min.x, sofa.min.z, sofa.max.x, sofa.max.z));
        var table = U.Furn("tableCoffeeGlass", t, new Vector3(x, 0f, Z(7.7f)), 0f, S, new Vector3(1.2f, 0.4f, 0.7f), new Color(0.8f, 0.9f, 1f));
        loungeObs.Add(Rect.MinMaxRect(table.min.x, table.min.z, table.max.x, table.max.z));
        U.Box("Meyve", t, new Vector3(x, table.max.y + 0.08f, Z(7.7f)), new Vector3(0.4f, 0.12f, 0.4f), new Color(0.95f, 0.6f, 0.2f), PrimitiveType.Sphere);
        // Kuyruklu piyano
        Color black = new Color(0.08f, 0.08f, 0.1f);
        U.Box("Piyano", t, new Vector3(x - 1.55f, 0.75f, Z(5.6f)), new Vector3(1.1f, 0.35f, 1.5f), black);
        U.Box("PiyanoAyak", t, new Vector3(x - 1.55f, 0.3f, Z(5.6f)), new Vector3(0.9f, 0.6f, 1.2f), black);
        U.Box("Tuslar", t, new Vector3(x - 1.0f, 0.85f, Z(5.6f)), new Vector3(0.12f, 0.03f, 1.2f), Color.white);
        U.Box("PiyanoKapak", t, new Vector3(x - 1.7f, 1.25f, Z(5.7f)), new Vector3(0.9f, 0.04f, 1.3f), black).transform.localRotation = Quaternion.Euler(0, 0, 35f);
        loungeObs.Add(Rect.MinMaxRect(x - 2.15f, Z(4.8f), x - 0.9f, Z(6.4f)));
        var bar = U.Furn("kitchenBar", t, new Vector3(x + 1.95f, 0f, Z(6.6f)), -90f, S, new Vector3(0.6f, 1f, 1.4f), new Color(0.45f, 0.3f, 0.2f));
        loungeObs.Add(Rect.MinMaxRect(bar.min.x, bar.min.z, bar.max.x, bar.max.z));
        Color[] bc = { new Color(0.2f, 0.5f, 0.25f), new Color(0.6f, 0.15f, 0.2f), new Color(0.85f, 0.7f, 0.3f) };
        for (int k = 0; k < 3; k++)
            U.Box("Sise", t, new Vector3(x + 1.95f, bar.max.y + 0.15f, Z(6.2f + k * 0.35f)), new Vector3(0.09f, 0.3f, 0.09f), bc[k], PrimitiveType.Cylinder);
        var pl = U.Furn("pottedPlant", t, new Vector3(x + 2.0f, 0f, Z(9.7f)), 0f, 2.4f, new Vector3(0.5f, 1.4f, 0.5f), new Color(0.3f, 0.65f, 0.35f));
        loungeObs.Add(Rect.MinMaxRect(pl.min.x, pl.min.z, pl.max.x, pl.max.z));
        // Avize
        U.Box("AvizeZincir", t, new Vector3(x, 2.75f, Z(7.4f)), new Vector3(0.03f, 0.5f, 0.03f), gold);
        U.Box("AvizeHalka", t, new Vector3(x, 2.45f, Z(7.4f)), new Vector3(1.0f, 0.03f, 1.0f), gold, PrimitiveType.Cylinder);
        for (int k = 0; k < 8; k++)
        {
            float a = k * Mathf.PI / 4f;
            U.Prim("AvizeIsik", t, new Vector3(x + Mathf.Cos(a) * 0.48f, 2.52f, Z(7.4f) + Mathf.Sin(a) * 0.48f), Vector3.one * 0.12f, U.Glow(new Color(1f, 0.9f, 0.65f), 3f), PrimitiveType.Sphere);
        }
        U.Text(t, new Vector3(x, 2.15f, Z(10.3f)), "★★★★★", 0.07f, gold);
        lounge.SetActive(false);
    }

    public bool Blocked(Vector3 p, float r)
    {
        foreach (var o in activeObs)
            if (p.x > o.xMin - r && p.x < o.xMax + r && p.z > o.yMin - r && p.z < o.yMax + r) return true;
        return false;
    }

    // ---------------- Misafir istekleri ----------------
    public void StartRequest(string[] list = null)
    {
        var l = list != null && list.Length > 0 ? list : Requests;
        request = l[Random.Range(0, l.Length)];
        reqT = 0f;
        reqText.text = request;
        reqBubble.SetActive(true);
        GameManager.I.Pop(reqBubble.transform);
        reqPad.Show(true);
        reqPad.Set(0);
        Sfx.Play("pop", 0.5f);
    }

    public void ReqTick(float amount)
    {
        if (!HasRequest) return;
        reqT += amount;
        reqPad.Set(reqT);
        if (reqT >= 1f) FulfillRequest();
    }

    void FulfillRequest()
    {
        HideRequest();
        int bonus = Mathf.Max(5, Mathf.RoundToInt(Price * 0.3f));
        tips.Add(bonus);
        Quests.Track("requests");
        if (guest) guest.OnRequestDone();
        U.Burst(new Vector3(x, 1.8f, Z(7.6f)), new Color(1f, 0.8f, 0.3f), new Color(1f, 0.5f, 0.7f), 25, 3f);
        Sfx.Play("coin");
        GameManager.I.FloatText(new Vector3(x, 2.4f, Z(7.2f)), "Teşekkürler!", new Color(1f, 0.85f, 0.5f), 0.08f);
    }

    public void CancelRequest() => HideRequest();

    void HideRequest()
    {
        reqClaimed = false;
        request = null;
        reqT = 0f;
        reqBubble.SetActive(false);
        reqPad.Show(false);
    }

    void Update()
    {
        var gm = GameManager.I;
        if (HasRequest)
        {
            if (gm.PlayerNear(CleanSpot, 0.95f)) ReqTick(Time.deltaTime / 0.8f);
            reqBubble.transform.position = new Vector3(x, 3.1f + Mathf.Sin(Time.time * 3f) * 0.08f, Z(7.6f));
        }
        if (state != State.Dirty)
        {
            if (needText.gameObject.activeSelf) needText.gameObject.SetActive(false);
            return;
        }
        var p = gm.NearestPlayer(CleanSpot, 0.95f);
        if (p != null && !hasLinen)
        {
            if (p.linen > 0) { p.linen--; hasLinen = true; Sfx.Play("tick", 0.4f); }
            else p.NoLinenHint(CleanSpot);
        }
        if (needText.gameObject.activeSelf == hasLinen) needText.gameObject.SetActive(!hasLinen);
        bool near = p != null && hasLinen;
        if (near) cleanT += Time.deltaTime / 1.2f * Eco.CleanMul * RoomKinds.CleanMul(kind);
        if (near && cleanT >= 1f) Quests.Track("cleaned");
        else if (!claimed && !near) cleanT = Mathf.Max(0f, cleanT - Time.deltaTime * 0.5f);
        pad.Set(cleanT);
        if (cleanT >= 1f)
        {
            if (!near) Quests.Track("cleaned");
            SetClean();
        }
    }

    public void CleanTick(float amount) { if (hasLinen) cleanT += amount * RoomKinds.CleanMul(kind); }

    public void SetOccupied(bool on) => blanket.SetActive(on);

    public void SetDirty()
    {
        guest = null;
        HideRequest();
        state = State.Dirty;
        cleanT = 0;
        hasLinen = false;
        blanket.SetActive(false);
        messy.SetActive(true);
        trash.SetActive(true);
        pad.Show(true);
        pad.Set(0);
    }

    public void SetClean()
    {
        state = State.Clean;
        claimed = false;
        cleanT = 0;
        if (hasLinen && Laundry.I) Laundry.I.AddDirty(1);
        hasLinen = false;
        if (needText) needText.gameObject.SetActive(false);
        messy.SetActive(false);
        trash.SetActive(false);
        pad.Show(false);
        U.Burst(CleanSpot + Vector3.up * 0.6f, new Color(0.7f, 0.95f, 1f), Color.white, 30, 4f);
        Sfx.Play("clean");
        GameManager.I.FloatText(CleanSpot + Vector3.up * 1.8f, "Tertemiz!", new Color(0.5f, 1f, 0.75f));
    }
}
