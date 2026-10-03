using System;
using System.Collections.Generic;
using UnityEngine;

// Mevsimler (oyun gunune gore), festival gunleri ve gercek takvime gore ozel gunler
public static class Seasons
{
    public enum S { Ilkbahar, Yaz, Sonbahar, Kis }
    public static readonly string[] Names = { "İlkbahar", "Yaz", "Sonbahar", "Kış" };
    public const int DaysPerSeason = 5;

    public static S Current => (S)(((Mathf.Max(1, Day) - 1) / DaysPerSeason) % 4);
    static int Day => GameManager.I != null && GameManager.I.dayNight != null ? GameManager.I.dayNight.day : 1;
    public static bool Festival => Day % 7 == 0;

    public static float SpawnMul
    {
        get
        {
            float m = Current == S.Yaz ? 1.25f : Current == S.Kis ? 0.85f : Current == S.Sonbahar ? 0.95f : 1f;
            if (Festival) m *= 1.5f;
            return m;
        }
    }
    public static float PoolChance => Current == S.Yaz ? 0.7f : Current == S.Kis ? 0.1f : 0.45f;
    public static float CafeChance => Current == S.Kis ? 0.65f : Current == S.Sonbahar ? 0.55f : 0.45f;
    public static float TipMul => Festival ? 1.3f : 1f;

    // ---- Gercek takvim ozel gunleri ----
    public static string SpecialDay
    {
        get
        {
            var d = DateTime.Now;
            int m = d.Month, day = d.Day;
            if ((m == 12 && day >= 20) || (m == 1 && day <= 6)) return "yilbasi";
            if (m == 2 && day >= 10 && day <= 15) return "sevgililer";
            if ((m == 4 && day >= 22 && day <= 24) || (m == 5 && day >= 18 && day <= 20) ||
                (m == 8 && day >= 29 && day <= 31) || (m == 10 && day >= 28 && day <= 30)) return "bayram";
            return null;
        }
    }

    public static string SpecialTitle
    {
        get
        {
            switch (SpecialDay)
            {
                case "yilbasi": return "Mutlu yıllar! Otel yılbaşı için süslendi.";
                case "sevgililer": return "Sevgililer Günü kutlu olsun! Balayı çiftleri yolda.";
                case "bayram":
                    var d = DateTime.Now;
                    if (d.Month == 4) return "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun!";
                    if (d.Month == 5) return "19 Mayıs Gençlik ve Spor Bayramı kutlu olsun!";
                    if (d.Month == 8) return "30 Ağustos Zafer Bayramı kutlu olsun!";
                    return "29 Ekim Cumhuriyet Bayramı kutlu olsun!";
            }
            return null;
        }
    }

    // ---- Gorsel ----
    static readonly List<Renderer> crowns = new List<Renderer>();
    static Material grass;
    static ParticleSystem fall;

    public static void RegisterCrown(Renderer r) => crowns.Add(r);

    // Parcacik bulutunu oyuncunun ustunde tutar
    public static void Follow(Vector3 p)
    {
        if (fall) fall.transform.position = new Vector3(p.x, 9f, p.z + 2f);
    }
    public static void RegisterGrass(Material m) => grass = m;

    public static void Reset()
    {
        crowns.Clear();
        grass = null;
        fall = null;
    }

    public static void Apply()
    {
        var s = Current;
        Color[] leaf =
        {
            new Color(0.45f, 0.75f, 0.38f), new Color(0.3f, 0.62f, 0.3f), new Color(0.9f, 0.55f, 0.2f), new Color(0.92f, 0.95f, 0.98f)
        };
        for (int i = 0; i < crowns.Count; i++)
        {
            if (!crowns[i]) continue;
            Color c = leaf[(int)s];
            if (s == S.Ilkbahar && i % 3 == 0) c = new Color(1f, 0.72f, 0.82f);      // cicek acmis
            if (s == S.Sonbahar && i % 3 == 1) c = new Color(0.85f, 0.32f, 0.18f);   // kizil
            crowns[i].sharedMaterial = U.Mat(c);
        }
        if (grass)
        {
            Color g = s == S.Kis ? new Color(0.92f, 0.94f, 0.97f) : s == S.Sonbahar ? new Color(0.68f, 0.7f, 0.4f) :
                      s == S.Yaz ? new Color(0.5f, 0.78f, 0.38f) : new Color(0.58f, 0.82f, 0.48f);
            if (Chain.cur == 1) g = new Color(0.93f, 0.86f, 0.68f); // Bodrum: kum
            else if (Chain.cur == 2) // Kapadokya: kuru toprak, kisin kar
                g = s == S.Kis ? new Color(0.94f, 0.95f, 0.97f) : s == S.Ilkbahar ? new Color(0.74f, 0.72f, 0.48f) : s == S.Yaz ? new Color(0.84f, 0.72f, 0.5f) : new Color(0.8f, 0.62f, 0.42f);
            if (grass.HasProperty("_BaseColor")) grass.SetColor("_BaseColor", g);
            Events.WetBase(grass, g);
        }
        SetupParticles(s);
    }

    static void SetupParticles(S s)
    {
        var cam = Camera.main;
        if (!cam) return;
        if (fall == null)
        {
            var g = new GameObject("MevsimParcaciklari");
            g.transform.rotation = Quaternion.identity;
            fall = g.AddComponent<ParticleSystem>();
            fall.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var sh = fall.shape;
            sh.shapeType = ParticleSystemShapeType.Box;
            sh.scale = new Vector3(44f, 1f, 34f);
            var r = g.GetComponent<ParticleSystemRenderer>();
            var shd = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            r.sharedMaterial = new Material(shd != null ? shd : Shader.Find("Sprites/Default"));
            Events.Hook(fall); // kar ve yapraklar binanin icine dusmesin
        }
        var main = fall.main;
        var em = fall.emission;
        var vel = fall.velocityOverLifetime;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.startLifetime = 7f;
        main.maxParticles = 600;
        main.gravityModifier = 0f;
        vel.enabled = true;
        vel.space = ParticleSystemSimulationSpace.World;
        switch (s)
        {
            case S.Kis:
                main.startColor = new Color(1f, 1f, 1f, 0.9f);
                main.startSize = new ParticleSystem.MinMaxCurve(0.08f, 0.18f);
                vel.x = new ParticleSystem.MinMaxCurve(-0.4f, 0.4f);
                vel.y = new ParticleSystem.MinMaxCurve(-1.6f, -1.1f);
                vel.z = new ParticleSystem.MinMaxCurve(-0.2f, 0.2f);
                em.rateOverTime = 60f;
                break;
            case S.Sonbahar:
                main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.95f, 0.55f, 0.15f), new Color(0.8f, 0.3f, 0.15f));
                main.startSize = new ParticleSystem.MinMaxCurve(0.12f, 0.22f);
                vel.x = new ParticleSystem.MinMaxCurve(0.3f, 1.2f);
                vel.y = new ParticleSystem.MinMaxCurve(-1.2f, -0.7f);
                vel.z = new ParticleSystem.MinMaxCurve(-0.3f, 0.3f);
                em.rateOverTime = 14f;
                break;
            case S.Ilkbahar:
                main.startColor = new Color(1f, 0.78f, 0.86f);
                main.startSize = new ParticleSystem.MinMaxCurve(0.08f, 0.14f);
                vel.x = new ParticleSystem.MinMaxCurve(0.2f, 0.8f);
                vel.y = new ParticleSystem.MinMaxCurve(-0.9f, -0.5f);
                vel.z = new ParticleSystem.MinMaxCurve(-0.2f, 0.2f);
                em.rateOverTime = 8f;
                break;
            default:
                em.rateOverTime = 0f;
                break;
        }
        if (Chain.cur == 1 && s == S.Kis) em.rateOverTime = 0f;        // Bodrum'a kar yagmaz
        if (Chain.cur == 2 && s == S.Kis) em.rateOverTime = 110f;      // Kapadokya'da bol kar
        fall.Clear();
        if (s == S.Yaz) fall.Stop();
        else fall.Play();
    }
}
