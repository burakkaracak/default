using UnityEngine;

// Otelin maskot kedisi: lobide dolasir, uyur, sevilince kalp cikarir
public class Cat : MonoBehaviour
{
    Vector3 target;
    float waitT = 2f, loveCd, t;
    Transform tail, head;
    TextMesh nameTag;
    bool sleeping;

    public static Cat Make(string name)
    {
        var g = new GameObject("Kedi");
        var c = g.AddComponent<Cat>();
        c.Build(name);
        g.transform.position = new Vector3(-1.5f, 0f, -6.5f);
        c.target = g.transform.position;
        return c;
    }

    void Build(string name)
    {
        var tr = transform;
        Color fur = new Color(0.97f, 0.96f, 0.94f), pink = new Color(1f, 0.7f, 0.75f), patch = new Color(0.95f, 0.65f, 0.35f);
        U.Box("Govde", tr, new Vector3(0, 0.32f, 0), new Vector3(0.42f, 0.3f, 0.7f), fur);
        U.Box("Leke", tr, new Vector3(0.08f, 0.48f, -0.1f), new Vector3(0.24f, 0.02f, 0.3f), patch);
        foreach (float x in new[] { -0.14f, 0.14f })
            foreach (float z in new[] { -0.24f, 0.24f })
                U.Box("Bacak", tr, new Vector3(x, 0.1f, z), new Vector3(0.1f, 0.22f, 0.1f), fur);
        head = U.Pivot(tr, new Vector3(0, 0.55f, 0.38f), "Bas");
        U.Box("Kafa", head, Vector3.zero, new Vector3(0.36f, 0.3f, 0.3f), fur);
        foreach (float x in new[] { -0.11f, 0.11f })
        {
            var ear = U.Box("Kulak", head, new Vector3(x, 0.18f, 0f), new Vector3(0.1f, 0.12f, 0.06f), fur);
            ear.transform.localRotation = Quaternion.Euler(0, 0, x < 0 ? 20f : -20f);
            U.Box("KulakIc", head, new Vector3(x, 0.17f, 0.031f), new Vector3(0.05f, 0.07f, 0.01f), pink);
            U.Box("Goz", head, new Vector3(x * 0.85f, 0.03f, 0.152f), new Vector3(0.05f, 0.06f, 0.01f), new Color(0.15f, 0.3f, 0.2f));
        }
        U.Box("Burun", head, new Vector3(0, -0.04f, 0.155f), new Vector3(0.05f, 0.035f, 0.01f), pink);
        tail = U.Pivot(tr, new Vector3(0, 0.42f, -0.34f), "Kuyruk");
        var tb = U.Box("KuyrukParca", tail, new Vector3(0, 0.18f, -0.05f), new Vector3(0.07f, 0.4f, 0.07f), fur);
        tb.transform.localRotation = Quaternion.Euler(-25f, 0, 0);
        nameTag = U.Text(null, Vector3.zero, name, 0.05f, new Color(1f, 0.8f, 0.9f), true);
    }

    void OnDestroy()
    {
        if (nameTag) Destroy(nameTag.gameObject);
    }

    void LateUpdate()
    {
        if (nameTag) nameTag.transform.position = transform.position + Vector3.up * 1.15f;
    }

    void Update()
    {
        var gm = GameManager.I;
        t += Time.deltaTime;
        if (tail) tail.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(t * (sleeping ? 1f : 4f)) * 25f);

        if (loveCd > 0f) loveCd -= Time.deltaTime;
        if (gm.PlayerNear(transform.position, 1.4f) && loveCd <= 0f)
        {
            loveCd = 6f;
            gm.FloatText(transform.position + Vector3.up * 1.2f, "♥", new Color(1f, 0.45f, 0.65f), 0.14f);
            Sfx.Play("pop", 0.3f);
            sleeping = false;
        }

        if (waitT > 0f)
        {
            waitT -= Time.deltaTime;
            if (head) head.localRotation = Quaternion.Euler(sleeping ? 25f : 0f, Mathf.Sin(t * 0.7f) * 30f, 0);
            if (waitT <= 0f) PickTarget();
            return;
        }
        Vector3 d = target - transform.position;
        d.y = 0;
        if (d.magnitude < 0.1f)
        {
            sleeping = Random.value < 0.35f;
            waitT = sleeping ? Random.Range(8f, 15f) : Random.Range(2f, 5f);
            return;
        }
        float step = 1.3f * Time.deltaTime;
        Vector3 n = transform.position + d.normalized * Mathf.Min(step, d.magnitude);
        if (!gm.Walkable(n)) { PickTarget(); return; }
        transform.position = n;
        U.Face(transform, d);
        if (head) head.localRotation = Quaternion.identity;
    }

    void PickTarget()
    {
        var gm = GameManager.I;
        sleeping = false;
        for (int k = 0; k < 20; k++)
        {
            var p = new Vector3(Random.Range(-13f, 13f), 0f, Random.Range(-10.5f, 2.5f));
            if (gm.Walkable(p) && Mathf.Abs(p.x - transform.position.x) < 9f) { target = p; return; }
        }
        target = transform.position;
        waitT = 1f;
    }
}
