using System.Collections.Generic;
using UnityEngine;

// Para destesi: ustune basinca para oyuncuya ucar
public class MoneyPile : MonoBehaviour
{
    readonly List<Transform> bills = new List<Transform>();
    public int value;
    public int fullAt;
    TextMesh full;

    public static MoneyPile Create(Transform parent, Vector3 pos)
    {
        var g = new GameObject("Para");
        g.transform.SetParent(parent, false);
        g.transform.position = pos;
        return g.AddComponent<MoneyPile>();
    }

    public static GameObject MakeBill(Transform parent, Vector3 pos)
    {
        var b = U.Box("Banknot", parent, pos, new Vector3(0.5f, 0.07f, 0.3f), new Color(0.38f, 0.72f, 0.38f));
        U.Box("Serit", b.transform, new Vector3(0, 0.52f, 0), new Vector3(0.36f, 0.1f, 0.6f), new Color(0.82f, 0.95f, 0.8f));
        U.Box("Daire", b.transform, new Vector3(0, 0.62f, 0), new Vector3(0.28f, 0.1f, 0.42f), new Color(0.3f, 0.6f, 0.3f), PrimitiveType.Cylinder);
        return b;
    }

    public void Add(int amount)
    {
        value += amount;
        int n = Mathf.Clamp(amount / 4, 1, 6);
        for (int k = 0; k < n && bills.Count < 60; k++)
        {
            int idx = bills.Count;
            int col = idx % 4;
            int layer = Mathf.Min(idx / 4, 14);
            var b = MakeBill(transform, new Vector3((col % 2) * 0.55f - 0.27f, 0.04f + layer * 0.075f, (col / 2) * 0.35f - 0.17f)).transform;
            b.localRotation = Quaternion.Euler(0, Random.Range(-6f, 6f), 0);
            bills.Add(b);
            GameManager.I.Pop(b);
        }
    }

    void Update()
    {
        if (fullAt > 0)
        {
            bool f = value >= fullAt;
            if (f && full == null) full = U.Text(transform, new Vector3(0, 1.6f, 0), "Kasa dolu!", 0.07f, new Color(1f, 0.85f, 0.3f), true);
            if (full)
            {
                full.gameObject.SetActive(f);
                if (f) full.transform.localPosition = new Vector3(0, 1.6f + Mathf.Abs(Mathf.Sin(Time.time * 4f)) * 0.25f, 0);
            }
        }
        if (value <= 0) return;
        var p = GameManager.I.NearestPlayer(transform.position, Eco.Magnet);
        if (p != null)
        {
            int v = value;
            value = 0;
            GameManager.I.AddMoney(v, transform.position);
            float delay = 0f;
            foreach (var b in bills)
            {
                GameManager.I.Fly(b, p.transform, delay);
                delay += 0.025f;
            }
            bills.Clear();
        }
    }
}
