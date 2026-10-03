using UnityEngine;

// Asansor: lobi ile 2. kat arasinda gecis. Oyuncu kapinin onundeki dairede bekleyince kat degistirir.
public class Elevator : MonoBehaviour
{
    public const float Floor2Z = 40f;
    public static readonly Vector3 LobbyPad = new Vector3(5f, 0f, 2.6f);
    public static readonly Vector3 UpPad = new Vector3(-13.55f, 0f, Floor2Z + 1.65f);

    public bool Open;
    GameObject lobbyCar, upCar, lockedSign;
    Transform[] doors = new Transform[4];
    ProgressPad padL, padU;
    float t, fade;
    bool armed = true;

    public float Fade => fade;

    public void Build(Transform world, Transform floor2)
    {
        transform.SetParent(world, false);
        lobbyCar = MakeCar(world, new Vector3(5f, 0f, 3.55f), 0f, 0, out padL, LobbyPad);
        upCar = MakeCar(floor2, new Vector3(-14.6f, 0f, Floor2Z + 1.65f), -90f, 2, out padU, UpPad);
        lockedSign = new GameObject("AsansorKilitli");
        lockedSign.transform.SetParent(world, false);
        U.Box("Bant", lockedSign.transform, new Vector3(5f, 1f, 3.2f), new Vector3(1.9f, 0.12f, 0.04f), new Color(1f, 0.8f, 0.15f));
        U.Box("Bant", lockedSign.transform, new Vector3(5f, 0.6f, 3.2f), new Vector3(1.9f, 0.12f, 0.04f), new Color(0.2f, 0.2f, 0.22f));
        SetOpen(false);
    }

    GameObject MakeCar(Transform parent, Vector3 pos, float yaw, int di, out ProgressPad pad, Vector3 padPos)
    {
        var g = new GameObject("Asansor");
        g.transform.SetParent(parent, false);
        g.transform.localPosition = pos;
        g.transform.localRotation = Quaternion.Euler(0f, yaw, 0f);
        var t = g.transform;
        Color metal = new Color(0.78f, 0.8f, 0.84f), dark = new Color(0.3f, 0.32f, 0.36f), gold = new Color(0.95f, 0.78f, 0.3f);
        U.Box("Kasa", t, new Vector3(0, 1.3f, 0.15f), new Vector3(2.2f, 2.6f, 0.5f), dark);
        U.Box("CerceveSol", t, new Vector3(-0.95f, 1.15f, -0.12f), new Vector3(0.18f, 2.3f, 0.1f), gold);
        U.Box("CerceveSag", t, new Vector3(0.95f, 1.15f, -0.12f), new Vector3(0.18f, 2.3f, 0.1f), gold);
        U.Box("CerceveUst", t, new Vector3(0, 2.32f, -0.12f), new Vector3(2.08f, 0.18f, 0.1f), gold);
        doors[di] = U.Box("KapiSol", t, new Vector3(-0.43f, 1.1f, -0.14f), new Vector3(0.84f, 2.2f, 0.06f), metal).transform;
        doors[di + 1] = U.Box("KapiSag", t, new Vector3(0.43f, 1.1f, -0.14f), new Vector3(0.84f, 2.2f, 0.06f), metal).transform;
        U.Box("Gosterge", t, new Vector3(0, 2.62f, -0.12f), new Vector3(0.7f, 0.28f, 0.06f), new Color(0.1f, 0.1f, 0.12f));
        U.Text(t, new Vector3(0, 2.64f, -0.2f), di == 0 ? "▲ 2. KAT" : "▼ LOBİ", 0.035f, new Color(1f, 0.6f, 0.2f));
        pad = new ProgressPad(t, t.InverseTransformPoint(padPos + Vector3.up * 0.02f), 0.6f, new Color(0.55f, 0.6f, 0.75f), new Color(0.3f, 0.95f, 0.5f));
        // engel: kasanin dunya koselerinden
        Vector3 a = t.TransformPoint(new Vector3(-1.1f, 0f, -0.2f)), b = t.TransformPoint(new Vector3(1.1f, 0f, 0.45f));
        GameManager.I.AddObstacle(Mathf.Min(a.x, b.x), Mathf.Min(a.z, b.z), Mathf.Max(a.x, b.x), Mathf.Max(a.z, b.z));
        return g;
    }

    public void SetOpen(bool o)
    {
        Open = o;
        lobbyCar.SetActive(o);
        lockedSign.SetActive(!o);
    }

    void Update()
    {
        if (!Open) return;
        var gm = GameManager.I;
        if (gm.player == null) return;
        bool onL = false, onU = false;
        foreach (var pl in gm.players)
        {
            if (!pl) continue;
            Vector3 pp = pl.transform.position;
            if (U.Flat(pp, LobbyPad) < 0.6f) onL = true;
            if (U.Flat(pp, UpPad) < 0.6f) onU = true;
        }
        if (!onL && !onU) armed = true;

        // kapilar: biri yaklasinca acilir
        AnimateDoors(0, NearAny(LobbyPad, 2.2f));
        AnimateDoors(2, NearAny(UpPad, 2.2f));

        if (armed && (onL || onU)) t += Time.deltaTime / 0.5f;
        else t = 0f;
        padL.Set(onL ? t : 0f);
        padU.Set(onU ? t : 0f);

        if (t >= 1f)
        {
            t = 0f;
            armed = false;
            fade = 1f;
            // Ekip birlikte binilir: tum oyuncular ayni kata gecer
            Vector3 dest = onL ? UpPad + Vector3.right * 1.1f : LobbyPad + Vector3.back * 1.1f;
            Vector3 side = onL ? Vector3.back * 0.9f : Vector3.right * 0.9f;
            int k = 0;
            foreach (var pl in gm.players)
            {
                if (!pl) continue;
                pl.transform.position = dest + side * k;
                pl.transform.rotation = Quaternion.LookRotation(onL ? Vector3.right : Vector3.back);
                k++;
            }
            var cam = Camera.main ? Camera.main.GetComponent<CameraFollow>() : null;
            if (cam) cam.Snap();
            Sfx.Play("ding", 0.8f);
            gm.Notify(onL ? "2. Kat" : "Lobi");
        }
        if (fade > 0f) fade -= Time.deltaTime * 2f;
    }

    bool NearAny(Vector3 pad, float r)
    {
        var gm = GameManager.I;
        if (gm.PlayerNear(pad, r)) return true;
        foreach (var c in gm.customers) if (c && U.Flat(c.transform.position, pad) < r) return true;
        foreach (var c in gm.cleaners) if (c && U.Flat(c.transform.position, pad) < r) return true;
        return false;
    }

    void AnimateDoors(int di, bool open)
    {
        for (int k = 0; k < 2; k++)
        {
            var d = doors[di + k];
            if (!d) continue;
            float side = k == 0 ? -1f : 1f;
            Vector3 lp = d.localPosition;
            float baseX = side * 0.43f;
            float target = baseX + (open ? side * 0.7f : 0f);
            lp.x = Mathf.Lerp(lp.x, target, Time.deltaTime * 6f);
            d.localPosition = lp;
        }
    }
}
