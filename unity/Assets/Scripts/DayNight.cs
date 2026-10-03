using System.Collections.Generic;
using UnityEngine;

// Gunduz/gece dongusu: gunes, ortam isigi, gok rengi, gece lambalari ve gun sayaci
public class DayNight : MonoBehaviour
{
    public const float DayLength = 240f; // bir tam gun (saniye)
    public float time = 0.3f;            // 0..1 (0.25 = 06:00)
    public int day = 1;

    Light sun;
    Camera cam;
    readonly List<Light> lamps = new List<Light>();
    readonly List<float> lampBase = new List<float>();
    public float Daylight { get; private set; } = 1f;

    static readonly Color SkyDay = new Color(0.62f, 0.8f, 0.95f);
    static readonly Color SkyDusk = new Color(0.95f, 0.62f, 0.45f);
    static readonly Color SkyNight = new Color(0.07f, 0.09f, 0.2f);

    public string Clock
    {
        get
        {
            int m = Mathf.FloorToInt(time * 24f * 60f) % (24 * 60);
            return (m / 60).ToString("00") + ":" + (m % 60).ToString("00");
        }
    }

    public bool IsNight => Daylight < 0.35f;

    public void Init(Light s, Camera c)
    {
        sun = s;
        cam = c;
        Apply();
    }

    // Gece yanan aydinlatma parcalari (fener cami, avize mumu): gunduz sonuk, gece parlak
    readonly List<Renderer> fixR = new List<Renderer>();
    readonly List<Material> fixOn = new List<Material>(), fixOff = new List<Material>();
    readonly List<GameObject> halos = new List<GameObject>();
    int fixLit = -1;

    public void AddFixture(Renderer r, Color c, float halo)
    {
        if (!r) return;
        fixR.Add(r);
        fixOn.Add(U.Bright(c));
        fixOff.Add(r.sharedMaterial);
        if (halo > 0f)
        {
            var h = U.Halo(r.transform.parent, r.bounds.center, halo, c);
            h.SetActive(false);
            halos.Add(h);
        }
        fixLit = -1;
    }

    public void AddLamp(Vector3 pos, float range, float intensity, Color c)
    {
        var g = new GameObject("GeceLambasi");
        g.transform.position = pos;
        var l = g.AddComponent<Light>();
        l.type = LightType.Point;
        l.range = range;
        l.intensity = intensity;
        l.color = c;
        l.shadows = LightShadows.None;
        l.enabled = false;
        lamps.Add(l);
        lampBase.Add(intensity);
    }

    void Update()
    {
        float before = time;
        time += Time.deltaTime / DayLength;
        if (time >= 1f) time -= 1f;
        // Sabah 06:00'yi gecince yeni gun
        if (before < 0.25f && time >= 0.25f)
        {
            day++;
            GameManager.I.OnNewDay();
        }
        Apply();
    }

    void Apply()
    {
        float alt = Mathf.Sin((time - 0.25f) * Mathf.PI * 2f); // 06:00'da 0, 12:00'de 1
        Daylight = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(-0.15f, 0.3f, alt));
        float dusk = Mathf.Clamp01(1f - Mathf.Abs(alt) / 0.3f) * (alt > -0.2f ? 1f : 0f);

        float gl = Events.Gloom; // yagmur ve bulut: gunes zayiflar, gok griye doner
        if (sun)
        {
            float elev = Mathf.Lerp(18f, 58f, Mathf.Clamp01(alt));
            sun.transform.rotation = Quaternion.Euler(elev, -110f + time * 160f, 0f);
            sun.intensity = Mathf.Lerp(0.18f, 1.35f, Daylight) * (1f - 0.6f * gl);
            Color day = new Color(1f, 0.95f, 0.86f);
            Color warm = new Color(1f, 0.62f, 0.4f);
            Color night = new Color(0.55f, 0.65f, 1f);
            sun.color = Color.Lerp(Color.Lerp(night, day, Daylight), warm, dusk * 0.7f);
            sun.shadowStrength = Mathf.Lerp(0.2f, 0.55f, Daylight) * (1f - 0.7f * gl);
        }

        Color sky = Color.Lerp(SkyNight, SkyDay, Daylight);
        sky = Color.Lerp(sky, SkyDusk, dusk * 0.55f * (1f - gl));
        sky = Color.Lerp(sky, new Color(0.45f, 0.5f, 0.56f) * Mathf.Lerp(0.3f, 1f, Daylight), Mathf.Clamp01(gl * 1.4f));
        if (cam) cam.backgroundColor = sky;
        RenderSettings.fogColor = sky;
        RenderSettings.ambientSkyColor = Color.Lerp(new Color(0.3f, 0.36f, 0.6f), new Color(0.78f, 0.84f, 0.95f), Daylight);
        RenderSettings.ambientEquatorColor = Color.Lerp(new Color(0.32f, 0.32f, 0.45f), new Color(0.75f, 0.72f, 0.68f), Daylight);
        RenderSettings.ambientGroundColor = Color.Lerp(new Color(0.2f, 0.2f, 0.28f), new Color(0.48f, 0.45f, 0.42f), Daylight);

        // Kapali havada lambalar erken yanar: icerisi sicak ve aydinlik, disarisi gri
        float eff = Daylight * (1f - 0.65f * gl);
        bool on = eff < 0.55f;
        if ((on ? 1 : 0) != fixLit)
        {
            fixLit = on ? 1 : 0;
            for (int i = 0; i < fixR.Count; i++)
                if (fixR[i]) fixR[i].sharedMaterial = on ? fixOn[i] : fixOff[i];
            foreach (var h in halos) if (h) h.SetActive(on);
        }
        float k = Mathf.Lerp(1f, 0.3f, eff / 0.55f);
        for (int i = 0; i < lamps.Count; i++)
            if (lamps[i])
            {
                lamps[i].enabled = on;
                if (on) lamps[i].intensity = lampBase[i] * k;
            }
    }
}
