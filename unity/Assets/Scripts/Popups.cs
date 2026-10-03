using System;
using System.Collections.Generic;
using UnityEngine;

// Ekranin ortasinda acilan karar/bilgi pencereleri (olaylar, raporlar, hikayeler).
// Pencere acikken oyun durur. Menunun de ustunde cizilir.
public static class Popups
{
    public class Choice
    {
        public string text;
        public Action act;
        public Color color;
        public bool enabled = true;
    }

    public class P
    {
        public string title, body, tag;
        public Color accent = new Color(1f, 0.78f, 0.25f, 1f);
        public readonly List<Choice> choices = new List<Choice>();
        public Action<Rect, float> custom;
        public float customH;
    }

    static readonly List<P> queue = new List<P>();
    public static bool Open => queue.Count > 0;
    public static P Current => queue.Count > 0 ? queue[0] : null;

    public static readonly Color Gold = new Color(1f, 0.78f, 0.25f, 1f);
    public static readonly Color Green = new Color(0.35f, 0.8f, 0.45f, 1f);
    public static readonly Color Blue = new Color(0.45f, 0.7f, 1f, 1f);
    public static readonly Color Red = new Color(0.95f, 0.45f, 0.4f, 1f);
    public static readonly Color Grey = new Color(0.45f, 0.47f, 0.52f, 1f);

    public static P Show(string title, string body, string tag = null)
    {
        var p = new P { title = title, body = body, tag = tag };
        queue.Add(p);
        Sfx.Play("pop", 0.6f);
        return p;
    }

    public static P Add(this P p, string text, Action act = null, Color? c = null, bool enabled = true)
    {
        p.choices.Add(new Choice { text = text, act = act, color = c ?? Gold, enabled = enabled });
        return p;
    }

    public static void Clear() => queue.Clear();

    static GUIStyle title, body, btn, tagSt;

    static void Styles(float s)
    {
        if (title == null)
        {
            title = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, wordWrap = true };
            body = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.UpperCenter, wordWrap = true };
            btn = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, wordWrap = true };
            tagSt = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
        }
        title.fontSize = Mathf.RoundToInt(36 * s);
        title.normal.textColor = new Color(1f, 0.86f, 0.42f);
        body.fontSize = Mathf.RoundToInt(24 * s);
        body.normal.textColor = new Color(0.92f, 0.94f, 1f);
        btn.fontSize = Mathf.RoundToInt(22 * s);
        tagSt.fontSize = Mathf.RoundToInt(18 * s);
    }

    public static void Draw(GameManager G)
    {
        var p = Current;
        if (p == null) return;
        float s = G.UIScale;
        Styles(s);

        GUI.color = new Color(0, 0, 0, 0.55f);
        GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
        GUI.color = Color.white;

        float w = Mathf.Min(Screen.width - 40 * s, 820 * s);
        float inner = w - 70 * s;
        float bodyH = string.IsNullOrEmpty(p.body) ? 0f : body.CalcHeight(new GUIContent(p.body), inner);
        int n = Mathf.Max(1, p.choices.Count);
        bool stack = n > 2;
        float btnH = 66 * s;
        float btnsH = stack ? n * (btnH + 10 * s) : btnH + 10 * s;
        float h = 40 * s + (p.tag != null ? 34 * s : 0) + 60 * s + 16 * s + bodyH + (p.custom != null ? p.customH * s + 16 * s : 0) + 24 * s + btnsH + 20 * s;
        h = Mathf.Min(h, Screen.height - 40 * s);
        var r = new Rect((Screen.width - w) / 2f, (Screen.height - h) / 2f, w, h);
        G.Panel(r, new Color(0.11f, 0.13f, 0.22f, 0.98f));
        G.Panel(new Rect(r.x + 12 * s, r.y + 12 * s, r.width - 24 * s, 8 * s), p.accent);

        float y = r.y + 32 * s;
        if (p.tag != null)
        {
            tagSt.normal.textColor = p.accent;
            GUI.Label(new Rect(r.x, y, r.width, 30 * s), p.tag, tagSt);
            y += 34 * s;
        }
        GUI.Label(new Rect(r.x + 30 * s, y, r.width - 60 * s, 60 * s), p.title, title);
        y += 76 * s;
        if (bodyH > 0)
        {
            body.alignment = p.body.Contains("•") ? TextAnchor.UpperLeft : TextAnchor.UpperCenter;
            GUI.Label(new Rect(r.x + 35 * s, y, inner, bodyH), p.body, body);
            y += bodyH + 16 * s;
        }
        if (p.custom != null)
        {
            p.custom(new Rect(r.x + 35 * s, y, inner, p.customH * s), s);
            y += p.customH * s + 16 * s;
        }
        y += 8 * s;

        if (p.choices.Count == 0) p.Add("Tamam");
        for (int i = 0; i < p.choices.Count; i++)
        {
            var c = p.choices[i];
            Rect br;
            if (stack) br = new Rect(r.x + 40 * s, y + i * (btnH + 10 * s), r.width - 80 * s, btnH);
            else
            {
                float bw = (r.width - 80 * s - (n - 1) * 16 * s) / n;
                br = new Rect(r.x + 40 * s + i * (bw + 16 * s), y, bw, btnH);
            }
            G.Panel(br, c.enabled ? c.color : Grey);
            btn.normal.textColor = c.enabled ? new Color(0.14f, 0.1f, 0.06f) : new Color(0.85f, 0.85f, 0.88f);
            if (GUI.Button(br, c.text, btn) && c.enabled)
            {
                Sfx.Play("pop", 0.5f);
                queue.Remove(p);
                c.act?.Invoke();
                GUIUtility.ExitGUI();
            }
        }
        // pencere disindaki tiklamalar alttaki menuye gecmesin
        if (Event.current.isMouse) Event.current.Use();
    }
}

// Pencereleri menunun de ustunde cizen yardimci
public class PopupHost : MonoBehaviour
{
    void OnGUI()
    {
        if (!Popups.Open || GameManager.I == null) return;
        GUI.depth = -10;
        Popups.Draw(GameManager.I);
    }
}
