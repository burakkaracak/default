using UnityEngine;

// Kilitli alan: ustunde durunca para odenir, dolunca acilir
public class UnlockZone : MonoBehaviour
{
    int price, paid;
    float acc, flyCd, stand, pulse;
    System.Action done;
    TextMesh priceText;
    Transform fill, visual;
    string title;
    const float Size = 1.8f;

    public static UnlockZone Create(Transform parent, Vector3 pos, int price, string title, string icon, System.Action onDone)
    {
        var g = new GameObject("Acilacak_" + title);
        g.transform.SetParent(parent, false);
        g.transform.position = pos;
        var z = g.AddComponent<UnlockZone>();
        z.price = price;
        z.done = onDone;
        z.title = title;

        z.visual = U.Pivot(g.transform, Vector3.zero, "Gorsel");
        var v = z.visual;
        U.Flat("Zemin", v, new Vector3(0, 0.02f, 0), new Vector3(Size, 0.02f, Size), new Color(0.16f, 0.38f, 0.3f));
        z.fill = U.Flat("Dolum", v, new Vector3(0, 0.03f, -Size / 2f), new Vector3(Size, 0.02f, 0f), new Color(0.35f, 0.88f, 0.48f)).transform;

        // Kesikli beyaz kenar
        int dashes = 5;
        float step = Size / dashes;
        for (int i = 0; i < dashes; i++)
        {
            float o = -Size / 2f + step * (i + 0.5f);
            U.Flat("Kenar", v, new Vector3(o, 0.04f, Size / 2f), new Vector3(step * 0.6f, 0.02f, 0.08f), Color.white);
            U.Flat("Kenar", v, new Vector3(o, 0.04f, -Size / 2f), new Vector3(step * 0.6f, 0.02f, 0.08f), Color.white);
            U.Flat("Kenar", v, new Vector3(Size / 2f, 0.04f, o), new Vector3(0.08f, 0.02f, step * 0.6f), Color.white);
            U.Flat("Kenar", v, new Vector3(-Size / 2f, 0.04f, o), new Vector3(0.08f, 0.02f, step * 0.6f), Color.white);
        }

        var ic = U.Text(v, new Vector3(0, 0.06f, 0.15f), icon, 0.16f, new Color(1, 1, 1, 0.85f));
        ic.transform.rotation = Quaternion.Euler(90f, 0f, 0f);

        U.Text(g.transform, new Vector3(0, 1.35f, 0.2f), title, 0.075f, Color.white, true);
        z.priceText = U.Text(g.transform, new Vector3(0, 0.8f, 0f), Eco.TL(price), 0.11f, new Color(1f, 0.88f, 0.3f), true);
        return z;
    }

    void Update()
    {
        var gm = GameManager.I;
        var p = gm.player;
        if (p == null) return;

        bool on = U.Flat(p.transform.position, transform.position) < Size * 0.5f;
        stand = on ? stand + Time.deltaTime : 0f;

        if (on && stand > 0.2f && gm.money > 0 && paid < price)
        {
            acc += Time.deltaTime * Mathf.Max(price / 1.6f, 15f);
            int n = Mathf.FloorToInt(acc);
            acc -= n;
            n = Mathf.Min(n, price - paid, gm.money);
            if (n > 0)
            {
                gm.money -= n;
                paid += n;
                flyCd -= Time.deltaTime;
                if (flyCd <= 0f)
                {
                    flyCd = 0.09f;
                    gm.FlyBill(p.transform.position + Vector3.up, transform.position);
                    Sfx.Play("tick", 0.5f);
                }
            }
        }
        else if (on && gm.money <= 0 && paid < price && stand > 0.2f && stand < 0.25f)
        {
            gm.FloatText(transform.position + Vector3.up * 2f, "Para yetmiyor", new Color(1f, 0.6f, 0.5f), 0.07f);
        }

        pulse = on ? pulse + Time.deltaTime * 8f : 0f;
        visual.localScale = Vector3.one * (1f + Mathf.Sin(pulse) * 0.04f);

        float t = (float)paid / price;
        fill.localScale = new Vector3(Size, 0.02f, Size * t);
        fill.localPosition = new Vector3(0, 0.03f, -Size / 2f + Size / 2f * t);
        priceText.text = Eco.TL(price - paid);

        if (paid >= price)
        {
            gm.Notify(title + " açıldı!");
            done?.Invoke();
            U.Burst(transform.position + Vector3.up * 0.5f, new Color(1f, 0.85f, 0.3f), new Color(0.4f, 0.8f, 1f), 60, 6f);
            Sfx.Play("unlock");
            gm.Save();
            Destroy(gameObject);
        }
    }
}
