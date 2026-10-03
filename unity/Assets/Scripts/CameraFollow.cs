using UnityEngine;

// Kamera oyuncuyu (iki oyunculu modda ikisinin ortasini) yumusakca takip eder
public class CameraFollow : MonoBehaviour
{
    public Transform target;
    static readonly Vector3 Offset = new Vector3(0f, 17.6f, -13.75f);
    float zoom = 1f;

    void Start()
    {
        transform.rotation = U.CamRot;
        if (target) transform.position = Goal(out zoom);
    }

    Vector3 Goal(out float z)
    {
        Vector3 t = target.position;
        z = 1f;
        var gm = GameManager.I;
        if (gm && gm.coop && gm.player2)
        {
            Vector3 b = gm.player2.transform.position;
            if (Mathf.Abs(b.z - t.z) < 20f)
            {
                float d = Vector3.Distance(new Vector3(t.x, 0, t.z), new Vector3(b.x, 0, b.z));
                t = (t + b) * 0.5f;
                z = 1f + 0.45f * Mathf.Clamp01((d - 6f) / 16f);
            }
        }
        float extra = (z - 1f) * 8f;
        if (t.z > 20f)
        {
            // 2. kat
            t.x = Mathf.Clamp(t.x, -9f + extra, 9f - extra);
            t.z = Mathf.Clamp(t.z, Elevator.Floor2Z + 2.5f, Elevator.Floor2Z + 5.5f);
        }
        else
        {
            float mn = gm ? gm.CamMinX : -9f, mx = gm ? gm.CamMaxX : 9f;
            t.x = Mathf.Clamp(t.x, Mathf.Min(mn + extra, 0f), Mathf.Max(mx - extra, 0f));
            t.z = Mathf.Clamp(t.z, -10f, 5.5f);
        }
        t.y = 0f;
        return t + Offset * z;
    }

    public void Snap()
    {
        if (target) transform.position = Goal(out zoom);
    }

    void LateUpdate()
    {
        if (!target) return;
        transform.rotation = U.CamRot;
        transform.position = Vector3.Lerp(transform.position, Goal(out float z), Time.deltaTime * 5f);
    }
}
