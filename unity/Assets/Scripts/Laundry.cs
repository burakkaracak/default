using System.Collections.Generic;
using UnityEngine;

// Camasirhane: kirli carsaflar yikanir, temizler rafa dizilir.
// Oda temizlemek icin elinde temiz carsaf olmali. Raftan almak icin onundeki daireye bas.
public class Laundry : MonoBehaviour
{
    public static Laundry I;
    public static readonly Vector3 Pad = new Vector3(-13.25f, 0f, -4.2f);
    public static readonly Vector3 Lane = new Vector3(-12.4f, 0f, -0.8f);

    public int clean = 14, dirty, inMachine;
    public int washesToday;

    float washT, giveT, hintCd;
    TextMesh shelfText, machineText;
    readonly List<GameObject> stacks = new List<GameObject>();
    readonly List<Transform> drums = new List<Transform>();
    ProgressPad pad;

    public static int Cap => 4 + 3 * Eco.Lv(Eco.Up.Carry);
    public static int StaffCap => 3 + Eco.Lv(Eco.Up.Carry);
    public float CycleTime => 9f / (1f + 0.6f * Eco.Lv(Eco.Up.Laundry));
    public int Batch => 4 + 2 * Eco.Lv(Eco.Up.Laundry);

    public void Build(Transform world)
    {
        I = this;
        transform.SetParent(world, false);
        var t = transform;
        Color wood = new Color(0.58f, 0.42f, 0.3f);
        Color white = new Color(0.95f, 0.96f, 0.98f);

        // Iki camasir makinesi (on yuzleri doguya bakar)
        foreach (float z in new[] { -1.75f, -2.8f })
        {
            U.Box("Makine", t, new Vector3(-14.45f, 0.55f, z), new Vector3(0.9f, 1.1f, 0.95f), white);
            U.Box("MakineUst", t, new Vector3(-14.45f, 1.11f, z), new Vector3(0.92f, 0.04f, 0.97f), new Color(0.8f, 0.82f, 0.86f));
            U.Box("Panel", t, new Vector3(-14.0f, 0.98f, z), new Vector3(0.03f, 0.14f, 0.7f), new Color(0.25f, 0.3f, 0.4f));
            var door = U.Box("Kapak", t, new Vector3(-13.99f, 0.5f, z), new Vector3(0.62f, 0.04f, 0.62f), new Color(0.75f, 0.78f, 0.82f), PrimitiveType.Cylinder);
            door.transform.localRotation = Quaternion.Euler(0, 0, 90f);
            var drum = U.Box("Tambur", t, new Vector3(-13.965f, 0.5f, z), new Vector3(0.48f, 0.03f, 0.48f), new Color(0.35f, 0.55f, 0.85f), PrimitiveType.Cylinder);
            drum.transform.localRotation = Quaternion.Euler(0, 0, 90f);
            U.Box("Kopuk", drum.transform, new Vector3(0.25f, 0.6f, 0f), new Vector3(0.25f, 0.4f, 0.25f), Color.white, PrimitiveType.Sphere);
            drums.Add(drum.transform);
        }
        GameManager.I.AddObstacle(-15f, -3.3f, -13.95f, -1.25f);

        // Temiz carsaf rafi
        U.Box("RafYan", t, new Vector3(-14.45f, 0.8f, -3.62f), new Vector3(0.8f, 1.6f, 0.06f), wood);
        U.Box("RafYan", t, new Vector3(-14.45f, 0.8f, -4.78f), new Vector3(0.8f, 1.6f, 0.06f), wood);
        U.Box("RafArka", t, new Vector3(-14.82f, 0.8f, -4.2f), new Vector3(0.06f, 1.6f, 1.2f), wood);
        for (int k = 0; k < 3; k++)
            U.Box("RafKat", t, new Vector3(-14.45f, 0.1f + k * 0.55f, -4.2f), new Vector3(0.8f, 0.05f, 1.2f), wood);
        for (int k = 0; k < 12; k++)
        {
            int shelf = k / 4, col = k % 4;
            var b = U.Box("Carsaf", t, new Vector3(-14.4f, 0.2f + shelf * 0.55f + (col / 2) * 0.13f, -4.45f + (col % 2) * 0.5f),
                new Vector3(0.55f, 0.12f, 0.42f), k % 3 == 0 ? new Color(0.75f, 0.88f, 1f) : Color.white);
            stacks.Add(b);
        }
        GameManager.I.AddObstacle(-15f, -4.85f, -13.95f, -3.55f);

        // Tabela
        U.Box("TabelaDirek", t, new Vector3(-14.9f, 1.15f, -3.0f), new Vector3(0.08f, 2.3f, 0.08f), wood);
        U.Box("Tabela", t, new Vector3(-14.9f, 2.25f, -3.0f), new Vector3(0.1f, 0.42f, 2.6f), new Color(0.16f, 0.22f, 0.38f));
        U.Text(t, new Vector3(-14.7f, 2.3f, -3.0f), "ÇAMAŞIRHANE", 0.05f, new Color(1f, 0.86f, 0.42f));

        pad = new ProgressPad(t, Pad + Vector3.up * 0.02f, 0.6f, new Color(0.45f, 0.7f, 1f), new Color(0.3f, 0.95f, 0.5f));
        shelfText = U.Text(t, new Vector3(-13.6f, 1.95f, -4.2f), "", 0.05f, Color.white, true);
        machineText = U.Text(t, new Vector3(-13.6f, 1.55f, -2.3f), "", 0.04f, new Color(0.7f, 0.9f, 1f), true);
    }

    public void AddDirty(int n) => dirty += n;
    public void AddClean(int n) => clean += n;

    // Calisan raftan alir
    public int Take(int want)
    {
        int got = Mathf.Min(want, clean);
        clean -= got;
        return got;
    }

    void Update()
    {
        var gm = GameManager.I;
        float dt = Time.deltaTime;

        // Yikama
        if (inMachine == 0 && dirty > 0)
        {
            inMachine = Mathf.Min(Batch, dirty);
            dirty -= inMachine;
            washT = 0f;
            washesToday++;
        }
        if (inMachine > 0)
        {
            washT += dt;
            foreach (var d in drums) d.Rotate(0, 400f * dt, 0, Space.Self);
            if (washT >= CycleTime)
            {
                clean += inMachine;
                gm.FloatText(new Vector3(-13.9f, 1.8f, -2.3f), "+" + inMachine + " temiz çarşaf", new Color(0.6f, 0.9f, 1f), 0.06f);
                inMachine = 0;
            }
        }

        // Oyuncu rafin onunde: carsaf alir
        bool anyOn = false;
        foreach (var p in gm.players)
        {
            if (!p || U.Flat(p.transform.position, Pad) > 0.8f) continue;
            anyOn = true;
            if (p.linen >= Cap) continue;
            if (clean <= 0)
            {
                if (hintCd <= 0f)
                {
                    hintCd = 2.5f;
                    gm.FloatText(Pad + Vector3.up * 2.4f, "Raf boş, makine yıkıyor...", new Color(1f, 0.7f, 0.5f), 0.06f);
                }
                continue;
            }
            giveT += dt;
            if (giveT >= 0.12f)
            {
                giveT = 0f;
                clean--;
                p.linen++;
                Sfx.Play("tick", 0.35f);
            }
        }
        if (hintCd > 0f) hintCd -= dt;
        pad.Set(anyOn ? 1f : 0f);

        int show = Mathf.Min(clean, stacks.Count);
        for (int i = 0; i < stacks.Count; i++)
            if (stacks[i].activeSelf != (i < show)) stacks[i].SetActive(i < show);
        shelfText.text = "Temiz çarşaf: " + clean;
        shelfText.color = clean > 3 ? Color.white : new Color(1f, 0.6f, 0.5f);
        machineText.text = inMachine > 0 ? "Yıkanıyor: " + inMachine + (dirty > 0 ? "  ·  Sırada: " + dirty : "")
                         : dirty > 0 ? "Sırada: " + dirty : "";
    }

    public void Save(string K, int carried)
    {
        Store.SetInt(K + "lin_clean", clean + inMachine + carried);
        Store.SetInt(K + "lin_dirty", dirty);
    }

    public void Load(string K, int unlockedRooms)
    {
        clean = Store.GetInt(K + "lin_clean", 10 + 2 * unlockedRooms);
        dirty = Store.GetInt(K + "lin_dirty", 0);
        inMachine = 0;
    }
}
