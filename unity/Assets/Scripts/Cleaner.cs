using System.Collections.Generic;
using UnityEngine;

// Temizlikci: kirli odalari temizler, misafir isteklerine kosar.
// Temizlik icin carsaf gerekir; elinde yoksa once camasirhaneye ugrar. Yorulunca molaya cikar.
public class Cleaner : MonoBehaviour
{
    enum S { Idle, Fetch, Going, Cleaning, Returning, Rest }
    S s = S.Idle;
    Room target;
    readonly List<Vector3> path = new List<Vector3>();
    Rig rig;
    Vector3 home;
    TextMesh nameTag;
    bool forRequest;
    public string staffName;
    public readonly StaffStats stats = new StaffStats();
    public int linen;
    Transform carry;
    readonly List<GameObject> carryItems = new List<GameObject>();
    int shownLinen = -1;

    float Speed => 3f * Eco.StaffMul * stats.Speed;

    public void Init(Vector3 h, int idx, string name)
    {
        home = h;
        staffName = name;
        stats.who = name;
        transform.position = h;
        transform.rotation = Quaternion.LookRotation(Vector3.left);
        rig = Rig.Model(transform, idx % 2 == 0 ? "character-male-e" : "character-female-e");
        var kova = U.Box("Kova", transform, new Vector3(0.5f, 0.2f, 0.15f), new Vector3(0.32f, 0.2f, 0.32f), new Color(0.3f, 0.5f, 0.95f), PrimitiveType.Cylinder);
        U.Box("Su", kova.transform, new Vector3(0, 1.02f, 0), new Vector3(0.85f, 0.05f, 0.85f), new Color(0.6f, 0.85f, 1f), PrimitiveType.Cylinder);
        carry = U.Pivot(transform, new Vector3(0, 1.05f, 0.45f), "Tasinan");
        nameTag = U.Text(null, Vector3.zero, name, 0.06f, Color.white, true);
        GameManager.I.Pop(rig.transform);
    }

    public void Rename(string n)
    {
        staffName = n;
        stats.who = n;
        if (nameTag) nameTag.text = n;
    }

    void LateUpdate()
    {
        if (nameTag)
        {
            nameTag.transform.position = transform.position + Vector3.up * 2.75f;
            string want = staffName + (stats.resting ? " (mola)" : "");
            if (nameTag.text != want) nameTag.text = want;
        }
        if (linen != shownLinen)
        {
            shownLinen = linen;
            while (carryItems.Count < linen)
                carryItems.Add(U.Box("Carsaf", carry, new Vector3(0, carryItems.Count * 0.11f, 0), new Vector3(0.5f, 0.1f, 0.38f), Color.white));
            for (int i = 0; i < carryItems.Count; i++) carryItems[i].SetActive(i < linen);
        }
    }

    void OnDestroy()
    {
        if (nameTag) Destroy(nameTag.gameObject);
    }

    bool OnFloor2 => transform.position.z > 20f;

    void GoHome()
    {
        path.Clear();
        if (OnFloor2) { path.Add(Elevator.UpPad); path.Add(Elevator.LobbyPad); }
        path.Add(home);
    }

    // Camasirhaneye git (lobide)
    void GoLaundry()
    {
        path.Clear();
        float x = transform.position.x;
        if (OnFloor2) { path.Add(Elevator.UpPad); path.Add(Elevator.LobbyPad); x = Elevator.LobbyPad.x; }
        else if (transform.position.z > 4f) path.Add(new Vector3(x, 0, 2.5f));
        if (x > 15f) { path.Add(new Vector3(14f, 0, 1.5f)); x = 14f; }
        path.Add(new Vector3(x, 0, -0.8f));
        path.Add(Laundry.Lane);
        path.Add(Laundry.Pad + Vector3.right * 0.3f);
        s = S.Fetch;
    }

    void GoTarget(bool fromLaundry)
    {
        path.Clear();
        if (fromLaundry) path.Add(Laundry.Lane);
        if (target.oz > 0f && !OnFloor2) { path.Add(Elevator.LobbyPad); path.Add(Elevator.UpPad); }
        if (target.oz <= 0f && target.x > 15f && transform.position.x < 14f) path.Add(new Vector3(14f, 0, 1.5f));
        path.Add(target.Door);
        path.Add(target.CleanSpot);
        s = S.Going;
    }

    void Update()
    {
        bool moving = s == S.Fetch || s == S.Going || s == S.Returning;
        stats.Tick(Time.deltaTime, moving || s == S.Cleaning);

        switch (s)
        {
            case S.Idle:
                rig.act = Rig.Act.None;
                U.Walk(transform, path, Speed, rig);
                if (stats.resting) { GoHome(); s = S.Rest; break; }
                target = GameManager.I.FindDirtyRoom();
                forRequest = false;
                if (target == null)
                {
                    target = GameManager.I.FindRequestRoom();
                    forRequest = target != null;
                    if (forRequest) target.reqClaimed = true;
                }
                if (target != null)
                {
                    if (!forRequest) target.claimed = true;
                    if (!forRequest && linen == 0 && !target.hasLinen) GoLaundry();
                    else GoTarget(false);
                }
                break;

            case S.Fetch:
                if (U.Walk(transform, path, Speed, rig))
                {
                    U.Face(transform, Vector3.left);
                    int got = Laundry.I.Take(Laundry.StaffCap - linen);
                    linen += got;
                    if (linen > 0)
                    {
                        Sfx.Play("tick", 0.3f);
                        if (target != null && (target.state == Room.State.Dirty || target.HasRequest)) GoTarget(true);
                        else { s = S.Returning; GoHome(); }
                    }
                    // raf bossa bekler (yikama bitince alir)
                }
                break;

            case S.Going:
                if (U.Walk(transform, path, Speed, rig)) s = S.Cleaning;
                break;

            case S.Cleaning:
                U.Face(transform, Vector3.forward);
                rig.act = Rig.Act.Clean;
                rig.Tick(0f);
                if (forRequest && target.HasRequest) target.ReqTick(Time.deltaTime / 1.5f * Eco.StaffMul * stats.Speed);
                else if (!forRequest && target.state == Room.State.Dirty)
                {
                    if (!target.hasLinen)
                    {
                        if (linen > 0) { linen--; target.hasLinen = true; }
                        else { rig.act = Rig.Act.None; GoLaundry(); break; }
                    }
                    target.CleanTick(Time.deltaTime / 2.5f * Eco.CleanMul * Eco.StaffMul * stats.Speed);
                }
                else
                {
                    rig.act = Rig.Act.None;
                    stats.AddXp(1);
                    s = S.Returning;
                    path.Clear();
                    path.Add(target.Door);
                    if (target.oz > 0f) { path.Add(Elevator.UpPad); path.Add(Elevator.LobbyPad); }
                    if (target.x > 15f && target.oz <= 0f) path.Add(new Vector3(14f, 0, 1.5f));
                    path.Add(home);
                }
                break;

            case S.Returning:
                if (U.Walk(transform, path, Speed, rig)) s = S.Idle;
                else if (!stats.resting && transform.position.z < 3f && transform.position.z > -1f && path.Count == 1 &&
                         (GameManager.I.FindDirtyRoom() != null || GameManager.I.FindRequestRoom() != null))
                {
                    s = S.Idle;
                    path.Clear();
                }
                break;

            case S.Rest:
                if (U.Walk(transform, path, Speed, rig))
                {
                    U.Face(transform, Vector3.back);
                    rig.act = Rig.Act.None;
                    if (!stats.resting) s = S.Idle;
                }
                break;
        }
    }
}
