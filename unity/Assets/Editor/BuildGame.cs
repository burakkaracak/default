using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

// Ust menude "Otel > Mac uygulamasi olustur": oyunu tek tikla
// 07_Otel_Oyunu klasorune "Otel Ustasi.app" olarak cikarir.
public static class BuildGame
{
    [MenuItem("Otel/Mac uygulaması oluştur")]
    public static void BuildMac()
    {
        KeepShaders();
        string dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
        string path = Path.Combine(dir, "Otel Ustası.app");

        var scenes = new List<string>();
        foreach (var s in EditorBuildSettings.scenes) if (s.enabled) scenes.Add(s.path);
        if (scenes.Count == 0) scenes.Add(UnityEngine.SceneManagement.SceneManager.GetActiveScene().path);

        PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
        PlayerSettings.defaultScreenWidth = 1400;
        PlayerSettings.defaultScreenHeight = 880;
        PlayerSettings.resizableWindow = true;
        PlayerSettings.runInBackground = true;

        var opts = new BuildPlayerOptions
        {
            scenes = scenes.ToArray(),
            locationPathName = path,
            target = BuildTarget.StandaloneOSX,
            options = BuildOptions.None
        };
        var report = BuildPipeline.BuildPlayer(opts);
        Debug.Log("[Otel] Uygulama: " + report.summary.result + " · " + path);
        if (report.summary.result == BuildResult.Succeeded) EditorUtility.RevealInFinder(path);
    }

    // Kodla olusturulan malzemelerin golgelendiricileri uygulamadan silinmesin
    static void KeepShaders()
    {
        const string dir = "Assets/Resources/ShaderKeep";
        if (!AssetDatabase.IsValidFolder(dir)) AssetDatabase.CreateFolder("Assets/Resources", "ShaderKeep");
        Make(dir + "/Lit.mat", "Universal Render Pipeline/Lit", false);
        Make(dir + "/LitGlow.mat", "Universal Render Pipeline/Lit", true);
        Make(dir + "/Particles.mat", "Universal Render Pipeline/Particles/Unlit", false);
        Make(dir + "/Unlit.mat", "Universal Render Pipeline/Unlit", false);
        AssetDatabase.SaveAssets();
    }

    static void Make(string path, string shader, bool emission)
    {
        if (AssetDatabase.LoadAssetAtPath<Material>(path)) return;
        var sh = Shader.Find(shader);
        if (!sh) return;
        var m = new Material(sh);
        if (emission)
        {
            m.EnableKeyword("_EMISSION");
            m.SetColor("_EmissionColor", Color.white);
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
        }
        AssetDatabase.CreateAsset(m, path);
    }
}
