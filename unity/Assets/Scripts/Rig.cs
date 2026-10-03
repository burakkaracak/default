using UnityEngine;

// Basit karakter iskeleti: yurume, nefes, temizlik ve sevinc animasyonu
public class Rig : MonoBehaviour
{
    public enum Act { None, Clean, Cheer, Sad, Lie, Sit }
    public static float CharYaw = 0f;
    public Act act = Act.None;

    Transform legL, legR, armL, armR, torso;
    float phase, move, seed;
    Animation anim;
    string cur;

    public static readonly string[] Guests =
    {
        "character-female-a", "character-female-b", "character-female-c", "character-female-f",
        "character-male-a", "character-male-b", "character-male-c", "character-male-f"
    };

    // Hazir animasyonlu karakter; bulunamazsa basit karaktere doner
    public static Rig Model(Transform parent, string variant)
    {
        var pf = Resources.Load<GameObject>("Karakterler/" + variant);
        if (!pf)
        {
            Color c = Color.HSVToRGB(Random.value, 0.5f, 0.95f);
            return Build(parent, c, new Color(0.25f, 0.3f, 0.45f), new Color(0.25f, 0.15f, 0.08f), Random.Range(0, 3), false, c);
        }
        var g = Instantiate(pf, parent, false);
        g.name = "Karakter";
        g.transform.localPosition = Vector3.zero;
        g.transform.localRotation = Quaternion.Euler(0, CharYaw, 0) * g.transform.localRotation;
        g.transform.localScale = Vector3.one * 2.8f * U.CharUnit;
        U.FixMats(g, U.CharTex);
        var r = g.AddComponent<Rig>();
        r.seed = Random.value * 10f;
        r.anim = g.GetComponentInChildren<Animation>();
        if (r.anim)
        {
            r.anim.cullingType = AnimationCullingType.AlwaysAnimate;
            foreach (AnimationState st in r.anim) st.wrapMode = WrapMode.Loop;
            r.Play("idle", 0f);
            if (r.anim["idle"] != null) r.anim["idle"].time = Random.value * r.anim["idle"].length;
        }
        return r;
    }

    void Play(string n, float fade)
    {
        if (cur == n || anim[n] == null) return;
        if (fade <= 0f) anim.Play(n); else anim.CrossFade(n, fade);
        cur = n;
    }

    public static Rig Build(Transform parent, Color shirt, Color pants, Color hair, int hairStyle, bool hat, Color hatColor)
    {
        var g = new GameObject("Karakter");
        g.transform.SetParent(parent, false);
        var r = g.AddComponent<Rig>();
        r.seed = Random.value * 10f;
        var t = g.transform;
        Color shoe = new Color(0.22f, 0.2f, 0.22f);

        r.legL = U.Pivot(t, new Vector3(-0.13f, 0.46f, 0));
        r.legR = U.Pivot(t, new Vector3(0.13f, 0.46f, 0));
        foreach (var leg in new[] { r.legL, r.legR })
        {
            U.Box("Bacak", leg, new Vector3(0, -0.2f, 0), new Vector3(0.19f, 0.22f, 0.19f), pants, PrimitiveType.Capsule);
            U.Box("Ayakkabi", leg, new Vector3(0, -0.41f, 0.05f), new Vector3(0.21f, 0.11f, 0.3f), shoe);
        }

        r.torso = U.Pivot(t, new Vector3(0, 0.46f, 0));
        U.Box("Govde", r.torso, new Vector3(0, 0.33f, 0), new Vector3(0.56f, 0.36f, 0.44f), shirt, PrimitiveType.Capsule);

        r.armL = U.Pivot(r.torso, new Vector3(-0.34f, 0.56f, 0));
        r.armR = U.Pivot(r.torso, new Vector3(0.34f, 0.56f, 0));
        foreach (var arm in new[] { r.armL, r.armR })
        {
            U.Box("Kol", arm, new Vector3(0, -0.19f, 0), new Vector3(0.15f, 0.2f, 0.15f), shirt, PrimitiveType.Capsule);
            U.Box("El", arm, new Vector3(0, -0.4f, 0), Vector3.one * 0.14f, U.Skin, PrimitiveType.Sphere);
        }

        var h = U.Pivot(r.torso, new Vector3(0, 0.72f, 0));
        U.Box("Kafa", h, new Vector3(0, 0.28f, 0), Vector3.one * 0.6f, U.Skin, PrimitiveType.Sphere);
        Color eye = new Color(0.12f, 0.1f, 0.12f);
        U.Box("GozSol", h, new Vector3(-0.11f, 0.31f, 0.285f), new Vector3(0.08f, 0.1f, 0.06f), eye, PrimitiveType.Sphere);
        U.Box("GozSag", h, new Vector3(0.11f, 0.31f, 0.285f), new Vector3(0.08f, 0.1f, 0.06f), eye, PrimitiveType.Sphere);
        U.Box("YanakSol", h, new Vector3(-0.18f, 0.21f, 0.235f), new Vector3(0.1f, 0.06f, 0.05f), new Color(1f, 0.62f, 0.62f), PrimitiveType.Sphere);
        U.Box("YanakSag", h, new Vector3(0.18f, 0.21f, 0.235f), new Vector3(0.1f, 0.06f, 0.05f), new Color(1f, 0.62f, 0.62f), PrimitiveType.Sphere);
        U.Box("Agiz", h, new Vector3(0, 0.17f, 0.28f), new Vector3(0.1f, 0.035f, 0.03f), new Color(0.6f, 0.25f, 0.25f), PrimitiveType.Sphere);

        U.Box("Sac", h, new Vector3(0, 0.4f, -0.04f), new Vector3(0.64f, 0.44f, 0.62f), hair, PrimitiveType.Sphere);
        if (hairStyle == 1) U.Box("UzunSac", h, new Vector3(0, 0.12f, -0.17f), new Vector3(0.56f, 0.5f, 0.26f), hair, PrimitiveType.Sphere);
        if (hairStyle == 2) U.Box("Topuz", h, new Vector3(0, 0.66f, -0.12f), Vector3.one * 0.24f, hair, PrimitiveType.Sphere);
        if (hat)
        {
            U.Box("Siper", h, new Vector3(0, 0.56f, 0.04f), new Vector3(0.68f, 0.025f, 0.68f), hatColor, PrimitiveType.Cylinder);
            U.Box("SapkaUst", h, new Vector3(0, 0.66f, -0.02f), new Vector3(0.48f, 0.09f, 0.48f), hatColor, PrimitiveType.Cylinder);
        }
        return r;
    }

    // m: 0 duruyor, 1 yuruyor
    public void Tick(float m)
    {
        if (anim)
        {
            string want =
                act == Act.Clean ? "interact-right" :
                act == Act.Cheer ? "emote-yes" :
                act == Act.Sad ? "emote-no" :
                act == Act.Lie ? "static" :
                act == Act.Sit ? "sit" :
                m > 1.25f ? "sprint" :
                m > 0.1f ? "walk" : "idle";
            if (anim[want] == null) want = "idle";
            Play(want, 0.15f);
            if (want == "walk") anim["walk"].speed = Mathf.Clamp(m, 0.8f, 1.5f) * 1.15f;
            if (want == "sprint") anim["sprint"].speed = Mathf.Clamp(m * 0.75f, 0.8f, 1.4f);
            return;
        }
        if (!torso) return;
        move = Mathf.Lerp(move, m, Time.deltaTime * 10f);
        phase += Time.deltaTime * 11f * move;
        float sw = Mathf.Sin(phase) * move;
        legL.localRotation = Quaternion.Euler(sw * 38f, 0, 0);
        legR.localRotation = Quaternion.Euler(-sw * 38f, 0, 0);

        if (act == Act.Clean)
        {
            float w = Mathf.Sin(Time.time * 16f) * 25f;
            armR.localRotation = Quaternion.Euler(-85f + w, 0, 0);
            armL.localRotation = Quaternion.Euler(-60f - w * 0.5f, 0, 0);
        }
        else if (act == Act.Cheer)
        {
            float w = Mathf.Sin(Time.time * 12f) * 12f;
            armR.localRotation = Quaternion.Euler(0, 0, 150f + w);
            armL.localRotation = Quaternion.Euler(0, 0, -150f - w);
        }
        else
        {
            armL.localRotation = Quaternion.Euler(-sw * 32f, 0, 0);
            armR.localRotation = Quaternion.Euler(sw * 32f, 0, 0);
        }

        float bob = Mathf.Abs(Mathf.Cos(phase)) * 0.06f * move;
        float breath = Mathf.Sin(Time.time * 2.2f + seed) * 0.015f * (1f - move);
        torso.localPosition = new Vector3(0, 0.46f + bob, 0);
        torso.localScale = new Vector3(1f, 1f + breath, 1f);
    }
}
