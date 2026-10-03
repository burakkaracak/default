using System.Collections.Generic;
using System.IO;
using UnityEngine;

// "Fotograflar" klasorundeki resimleri otelin tablolarinda gosterir
public static class Photos
{
    static List<Texture2D> list;
    static int next;

    public static string Folder => Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "Fotograflar"));

    public static List<Texture2D> All
    {
        get
        {
            if (list != null) return list;
            list = new List<Texture2D>();
            try
            {
                if (!Directory.Exists(Folder)) return list;
                foreach (var f in Directory.GetFiles(Folder))
                {
                    string e = Path.GetExtension(f).ToLowerInvariant();
                    if (e != ".jpg" && e != ".jpeg" && e != ".png") continue;
                    var t = new Texture2D(2, 2);
                    if (t.LoadImage(File.ReadAllBytes(f)))
                    {
                        t.wrapMode = TextureWrapMode.Clamp;
                        t.name = "foto_" + list.Count;
                        list.Add(t);
                    }
                }
            }
            catch { }
            return list;
        }
    }

    // Siradaki fotografi doner (yoksa null)
    public static Texture2D Next()
    {
        var a = All;
        if (a.Count == 0) return null;
        return a[(next++) % a.Count];
    }

    // Resim kutusuna fotograf giydirir (cerceve oranina gore ortadan kirpar)
    public static void Apply(GameObject canvas, float frameW, float frameH)
    {
        var t = Next();
        if (!t || !canvas) return;
        var r = canvas.GetComponent<Renderer>();
        float fa = frameW / frameH, ta = (float)t.width / t.height;
        Vector2 scale = Vector2.one, off = Vector2.zero;
        if (ta > fa) { scale.x = fa / ta; off.x = (1f - scale.x) / 2f; }
        else { scale.y = ta / fa; off.y = (1f - scale.y) / 2f; }
        var m = new Material(U.Mat(Color.white, t, Vector2.one, 0.2f, 0f));
        if (m.HasProperty("_BaseMap")) { m.SetTextureScale("_BaseMap", scale); m.SetTextureOffset("_BaseMap", off); }
        r.sharedMaterial = m;
    }
}
