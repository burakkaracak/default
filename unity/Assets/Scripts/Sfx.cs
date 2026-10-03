using System.Collections.Generic;
using UnityEngine;

// Kodla uretilen kucuk ses efektleri
public static class Sfx
{
    static AudioSource src;
    static readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
    const int Rate = 44100;

    public static void Init(GameObject host)
    {
        src = host.AddComponent<AudioSource>();
        src.playOnAwake = false;
        src.spatialBlend = 0f;
        src.volume = 0.45f;
        foreach (var c in clips.Values) if (c == null) { clips.Clear(); break; }
        if (clips.Count > 0) return;
        clips["coin"] = Notes("coin", new[] { 1318f, 1975f }, 0.055f, 30f);
        clips["tick"] = Notes("tick", new[] { 1567f }, 0.04f, 60f);
        clips["unlock"] = Notes("unlock", new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.08f, 12f);
        clips["ding"] = Bell("ding", 1760f, 0.7f);
        clips["clean"] = Swish("clean");
        clips["bad"] = Notes("bad", new[] { 330f, 247f }, 0.14f, 8f, true);
        clips["pop"] = Notes("pop", new[] { 880f }, 0.07f, 40f);
    }

    public static void Play(string n, float vol = 1f)
    {
        if (src && clips.TryGetValue(n, out var c)) src.PlayOneShot(c, vol);
    }

    static AudioClip Notes(string name, float[] freqs, float noteLen, float decay, bool square = false)
    {
        int per = (int)(Rate * noteLen);
        int tail = (int)(Rate * 0.15f);
        int total = per * freqs.Length + tail;
        var data = new float[total];
        for (int n = 0; n < freqs.Length; n++)
        {
            float f = freqs[n];
            for (int i = 0; i < per + tail && n * per + i < total; i++)
            {
                float t = i / (float)Rate;
                float env = Mathf.Exp(-t * decay) * Mathf.Clamp01(t * 400f);
                float w = Mathf.Sin(2f * Mathf.PI * f * t);
                if (square) w = Mathf.Sign(w) * 0.5f + w * 0.5f;
                else w = w * 0.8f + Mathf.Sin(4f * Mathf.PI * f * t) * 0.2f;
                data[n * per + i] += w * env * 0.4f;
            }
        }
        var clip = AudioClip.Create(name, total, 1, Rate, false);
        clip.SetData(data, 0);
        return clip;
    }

    static AudioClip Bell(string name, float f, float len)
    {
        int total = (int)(Rate * len);
        var data = new float[total];
        for (int i = 0; i < total; i++)
        {
            float t = i / (float)Rate;
            float env = Mathf.Exp(-t * 6f) * Mathf.Clamp01(t * 600f);
            float w = Mathf.Sin(2f * Mathf.PI * f * t) * 0.6f + Mathf.Sin(2f * Mathf.PI * f * 2.76f * t) * 0.25f + Mathf.Sin(2f * Mathf.PI * f * 5.4f * t) * 0.1f;
            data[i] = w * env * 0.4f;
        }
        var clip = AudioClip.Create(name, total, 1, Rate, false);
        clip.SetData(data, 0);
        return clip;
    }

    static AudioClip Swish(string name)
    {
        int total = (int)(Rate * 0.5f);
        var data = new float[total];
        var rnd = new System.Random(7);
        float lp = 0f;
        for (int i = 0; i < total; i++)
        {
            float t = i / (float)Rate;
            float noise = (float)rnd.NextDouble() * 2f - 1f;
            float k = Mathf.Lerp(0.05f, 0.5f, t / 0.5f);
            lp += (noise - lp) * k;
            float env = Mathf.Sin(Mathf.Clamp01(t / 0.3f) * Mathf.PI) * 0.5f;
            float sparkle = t > 0.25f ? Mathf.Sin(2f * Mathf.PI * 2637f * t) * Mathf.Exp(-(t - 0.25f) * 14f) * 0.3f : 0f;
            data[i] = lp * env + sparkle;
        }
        var clip = AudioClip.Create(name, total, 1, Rate, false);
        clip.SetData(data, 0);
        return clip;
    }
}
