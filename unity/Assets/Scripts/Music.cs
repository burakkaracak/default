using UnityEngine;

// Kodla uretilen hafif, nese dolu arka plan muzigi (dongu)
public static class Music
{
    static AudioSource src;
    static AudioClip clip;
    const int Rate = 22050;

    public static void Init(GameObject host, bool on)
    {
        src = host.AddComponent<AudioSource>();
        src.loop = true;
        src.playOnAwake = false;
        src.spatialBlend = 0f;
        src.volume = 0.22f;
        if (clip == null) clip = Make();
        src.clip = clip;
        Set(on);
    }

    public static void Set(bool on)
    {
        if (!src) return;
        if (on && !src.isPlaying) src.Play();
        else if (!on && src.isPlaying) src.Stop();
    }

    static float Freq(int midi) => 440f * Mathf.Pow(2f, (midi - 69) / 12f);

    static void Note(float[] d, float start, float dur, int midi, float amp, float decay, int type)
    {
        int s0 = (int)(start * Rate);
        int len = (int)((dur + 0.6f) * Rate);
        float f = Freq(midi);
        for (int i = 0; i < len; i++)
        {
            int idx = s0 + i;
            if (idx >= d.Length) idx -= d.Length; // dongu sonunda basa sar
            if (idx < 0) continue;
            float t = i / (float)Rate;
            float env = Mathf.Exp(-t * decay) * Mathf.Clamp01(t * 120f);
            if (t > dur) env *= Mathf.Exp(-(t - dur) * 10f);
            float ph = 2f * Mathf.PI * f * t;
            float w;
            if (type == 0) w = Mathf.Sin(ph) * 0.75f + Mathf.Sin(ph * 2f) * 0.18f + Mathf.Sin(ph * 3f) * 0.07f; // elektrikli piyano
            else if (type == 1) w = Mathf.Sin(ph) + 0.25f * Mathf.Sin(ph * 2f);                            // bas
            else w = Mathf.Sin(ph + 0.4f * Mathf.Sin(2f * Mathf.PI * 5f * t)) * 0.8f + Mathf.Sin(ph * 2f) * 0.1f; // melodi
            d[idx] += w * env * amp;
        }
    }

    static AudioClip Make()
    {
        float bpm = 96f;
        float beat = 60f / bpm;
        int bars = 16;
        int n = (int)(Rate * beat * 4 * bars);
        var d = new float[n];
        int[][] chords =
        {
            new[] { 60, 64, 67, 71 }, new[] { 57, 60, 64, 67 }, new[] { 53, 57, 60, 64 }, new[] { 55, 59, 62, 67 }
        };
        int[] bass = { 36, 33, 29, 31 };
        int[] scale = { 72, 74, 76, 79, 81, 84 };
        var rnd = new System.Random(11);
        int mel = 2;
        var noiseR = new System.Random(3);

        for (int bar = 0; bar < bars; bar++)
        {
            float t0 = bar * 4 * beat;
            var ch = chords[bar % 4];
            // akorlar: 1. ve 3. vurusta, hafif arpej
            for (int k = 0; k < ch.Length; k++)
            {
                Note(d, t0 + k * 0.02f, beat * 1.8f, ch[k], 0.07f, 1.6f, 0);
                Note(d, t0 + 2 * beat + k * 0.02f, beat * 1.8f, ch[k], 0.055f, 1.8f, 0);
            }
            // bas
            int b = bass[bar % 4];
            Note(d, t0, beat * 1.4f, b, 0.16f, 2.5f, 1);
            Note(d, t0 + 2.5f * beat, beat * 0.9f, b + 7, 0.11f, 3f, 1);
            // melodi (ilk 4 olcu sessiz, sonra kisa ezgiler)
            if (bar >= 4)
                for (int e = 0; e < 8; e++)
                {
                    if (rnd.NextDouble() > (e % 2 == 0 ? 0.6 : 0.35)) continue;
                    mel = Mathf.Clamp(mel + rnd.Next(-2, 3), 0, scale.Length - 1);
                    Note(d, t0 + e * beat / 2f, beat * 0.45f, scale[mel], 0.06f, 4f, 2);
                }
            // hafif ritim: ara vuruslarda yumusak tsss
            for (int e = 1; e < 8; e += 2)
            {
                int s0 = (int)((t0 + e * beat / 2f) * Rate);
                int len = (int)(0.05f * Rate);
                for (int i = 0; i < len && s0 + i < n; i++)
                {
                    float env = Mathf.Exp(-i / (float)Rate * 70f);
                    d[s0 + i] += ((float)noiseR.NextDouble() * 2f - 1f) * env * 0.025f;
                }
            }
        }

        float peak = 0.001f;
        foreach (var v in d) peak = Mathf.Max(peak, Mathf.Abs(v));
        for (int i = 0; i < n; i++) d[i] = d[i] / peak * 0.8f;
        var c = AudioClip.Create("OtelMuzik", n, 1, Rate, false);
        c.SetData(d, 0);
        return c;
    }
}
