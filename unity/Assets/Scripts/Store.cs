using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using UnityEngine;

// Oyun kaydi: Unity editoru ve "Otel Ustasi.app" ayni dosyayi kullanir,
// boylece kayit ikisinde de ortaktir. Dosyada olmayan anahtarlar eski kayittan (PlayerPrefs) okunur.
public static class Store
{
    static Dictionary<string, string> data;
    static bool dirty;
    static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    public static string FilePath => Path.Combine(Application.persistentDataPath, "otel_kayit.txt");

    static void Ensure()
    {
        if (data != null) return;
        data = new Dictionary<string, string>();
        try
        {
            if (!File.Exists(FilePath)) return;
            foreach (var line in File.ReadAllLines(FilePath, Encoding.UTF8))
            {
                int t = line.IndexOf('\t');
                if (t <= 0) continue;
                data[line.Substring(0, t)] = Unesc(line.Substring(t + 1));
            }
        }
        catch (System.Exception e) { Debug.LogWarning("[Otel] Kayit okunamadi: " + e.Message); }
    }

    static string Esc(string s) => s.Replace("\\", "\\\\").Replace("\n", "\\n").Replace("\t", "\\t").Replace("\r", "");
    static string Unesc(string s)
    {
        var sb = new StringBuilder(s.Length);
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            if (c == '\\' && i + 1 < s.Length)
            {
                char n = s[++i];
                sb.Append(n == 'n' ? '\n' : n == 't' ? '\t' : n);
            }
            else sb.Append(c);
        }
        return sb.ToString();
    }

    static void Put(string k, string v)
    {
        Ensure();
        string old;
        if (data.TryGetValue(k, out old) && old == v) return;
        data[k] = v;
        dirty = true;
    }

    public static void SetInt(string k, int v) { Put(k, v.ToString(Inv)); PlayerPrefs.SetInt(k, v); }
    public static void SetFloat(string k, float v) { Put(k, v.ToString("R", Inv)); PlayerPrefs.SetFloat(k, v); }
    public static void SetString(string k, string v) { Put(k, v ?? ""); PlayerPrefs.SetString(k, v ?? ""); }

    public static int GetInt(string k, int def = 0)
    {
        Ensure();
        string s;
        int v;
        if (data.TryGetValue(k, out s) && int.TryParse(s, NumberStyles.Integer, Inv, out v)) return v;
        return PlayerPrefs.GetInt(k, def);
    }

    public static float GetFloat(string k, float def = 0f)
    {
        Ensure();
        string s;
        float v;
        if (data.TryGetValue(k, out s) && float.TryParse(s, NumberStyles.Float, Inv, out v)) return v;
        return PlayerPrefs.GetFloat(k, def);
    }

    public static string GetString(string k, string def = "")
    {
        Ensure();
        string s;
        if (data.TryGetValue(k, out s)) return s;
        return PlayerPrefs.GetString(k, def);
    }

    public static bool HasKey(string k)
    {
        Ensure();
        return data.ContainsKey(k) || PlayerPrefs.HasKey(k);
    }

    public static void DeleteKey(string k)
    {
        Ensure();
        if (data.Remove(k)) dirty = true;
        PlayerPrefs.DeleteKey(k);
    }

    public static void Save()
    {
        PlayerPrefs.Save();
        if (!dirty || data == null) return;
        try
        {
            Directory.CreateDirectory(Application.persistentDataPath);
            var sb = new StringBuilder();
            foreach (var kv in data) sb.Append(kv.Key).Append('\t').Append(Esc(kv.Value)).Append('\n');
            string tmp = FilePath + ".tmp";
            File.WriteAllText(tmp, sb.ToString(), Encoding.UTF8);
            if (File.Exists(FilePath)) File.Delete(FilePath);
            File.Move(tmp, FilePath);
            dirty = false;
        }
        catch (System.Exception e) { Debug.LogWarning("[Otel] Kayit yazilamadi: " + e.Message); }
    }
}
