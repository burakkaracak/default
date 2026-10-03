using UnityEngine;

// Calisanin enerjisi, morali ve seviyesi.
// Calistikca yorulur, enerjisi bitince molaya cikar. Moral hizini etkiler, her gun biraz duser.
public class StaffStats
{
    public float energy = 1f, morale = 0.8f;
    public int xp;
    public bool resting;
    public string who = "";

    public static readonly int[] LevelXp = { 0, 8, 25, 55, 100 };

    public int Level
    {
        get
        {
            int l = 1;
            for (int i = 1; i < LevelXp.Length; i++) if (xp >= LevelXp[i]) l = i + 1;
            return l;
        }
    }

    public float LevelProgress
    {
        get
        {
            int l = Level;
            if (l >= LevelXp.Length) return 1f;
            return Mathf.InverseLerp(LevelXp[l - 1], LevelXp[l], xp);
        }
    }

    // Hiz carpani: moral ve seviyeye gore (yaklasik 0,75 ile 1,45 arasi)
    public float Speed => (0.75f + 0.4f * morale) * (1f + 0.08f * (Level - 1));
    public int Wage => 60 + 20 * Level;
    public int BonusCost => 80 + 50 * Level;
    public string MoodWord => morale >= 0.75f ? "Mutlu" : morale >= 0.45f ? "İyi" : morale >= 0.25f ? "Keyifsiz" : "Çok mutsuz";

    static float RestRate => GameManager.I != null && GameManager.I.restRoom ? 1f / 9f : 1f / 18f;

    public void Tick(float dt, bool working)
    {
        if (resting)
        {
            energy += dt * RestRate;
            if (energy >= 1f)
            {
                energy = 1f;
                resting = false;
                if (GameManager.I) GameManager.I.Notify(who + " moladan döndü");
            }
            return;
        }
        if (working)
        {
            energy -= dt / 110f;
            if (energy <= 0.08f)
            {
                energy = 0.08f;
                resting = true;
                if (GameManager.I) GameManager.I.Notify(who + " yoruldu, molaya çıktı");
            }
        }
        else energy = Mathf.Min(1f, energy + dt / 160f);
    }

    public void AddXp(int n)
    {
        int before = Level;
        xp += n;
        if (Level > before && GameManager.I)
        {
            morale = Mathf.Min(1f, morale + 0.1f);
            GameManager.I.Notify(who + " seviye atladı! Seviye " + Level);
            Sfx.Play("unlock", 0.5f);
        }
    }

    public void NewDay()
    {
        float decay = GameManager.I != null && GameManager.I.restRoom ? 0.03f : 0.06f;
        morale = Mathf.Max(0.05f, morale - decay);
        energy = Mathf.Max(energy, 0.6f);
    }

    public void Bonus() => morale = Mathf.Min(1f, morale + 0.35f);

    public void Save(string key)
    {
        Store.SetInt(key + "_xp", xp);
        Store.SetFloat(key + "_mor", morale);
        Store.SetFloat(key + "_en", energy);
    }

    public void Load(string key)
    {
        xp = Store.GetInt(key + "_xp", 0);
        morale = Store.GetFloat(key + "_mor", 0.8f);
        energy = Store.GetFloat(key + "_en", 1f);
        resting = false;
    }
}
