using UnityEditor;

// Karakter ve mobilya modellerinin ice aktarma ayarlari
public class ModelImportSettings : AssetPostprocessor
{
    public override uint GetVersion() => 2;

    void OnPreprocessModel()
    {
        bool chars = assetPath.Contains("Resources/Karakterler");
        bool furn = assetPath.Contains("Resources/Mobilya");
        if (!chars && !furn) return;
        var mi = (ModelImporter)assetImporter;
        mi.importCameras = false;
        mi.importLights = false;
        mi.isReadable = furn;
        if (chars)
        {
            mi.animationType = ModelImporterAnimationType.Legacy;
            mi.importAnimation = true;
            mi.generateAnimations = ModelImporterGenerateAnimations.GenerateAnimations;
        }
        else
        {
            mi.animationType = ModelImporterAnimationType.None;
            mi.importAnimation = false;
        }
    }
}
