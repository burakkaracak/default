using System.Collections.Generic;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

// Oyuncu (mudur). 1. oyuncu: WASD, ekranda surukleme (tek oyuncuda ok tuslari da).
// 2. oyuncu: ok tuslari. Elinde temiz carsaf tasiyabilir.
public class Player : MonoBehaviour
{
    public int id = 1;
    public float speed = 5.5f;
    public bool dragging;
    public bool Moved { get; private set; }
    public Vector2 dragStart, dragNow;
    public int linen;
    Rig rig;
    Transform ring, carry;
    TextMesh nameTag;
    readonly List<GameObject> carryItems = new List<GameObject>();
    int shownLinen = -1;
    float noLinenCd;

    void Awake()
    {
        rig = Rig.Model(transform, "character-male-d");
        nameTag = U.Text(null, Vector3.zero, "", 0.06f, new Color(1f, 0.86f, 0.42f), true);
        ring = U.Flat("Halka", transform, new Vector3(0, 0.02f, 0), new Vector3(1.1f, 0.01f, 1.1f), new Color(1f, 1f, 1f), PrimitiveType.Cylinder).transform;
        U.Flat("HalkaIc", ring, new Vector3(0, 1.2f, 0), new Vector3(0.85f, 1f, 0.85f), new Color(0.98f, 0.7f, 0.3f), PrimitiveType.Cylinder);
        carry = U.Pivot(transform, new Vector3(0, 1.05f, 0.5f), "Tasinan");
    }

    // 2. oyuncu icin halka rengini degistir
    public void SetSecond()
    {
        id = 2;
        foreach (var r in ring.GetComponentsInChildren<Renderer>())
            if (r.name == "HalkaIc") r.sharedMaterial = U.Mat(new Color(0.4f, 0.7f, 1f));
        if (nameTag) nameTag.color = new Color(0.6f, 0.85f, 1f);
    }

    void OnDestroy()
    {
        if (nameTag) Destroy(nameTag.gameObject);
    }

    void Update()
    {
        var gm = GameManager.I;
        speed = Eco.PlayerSpeed;
        bool blocked = gm.MenuOpen || Popups.Open;
        Vector2 inp = blocked ? Vector2.zero : ReadInput();
        if (blocked) dragging = false;
        Vector3 move = new Vector3(inp.x, 0, inp.y);
        bool walking = move.sqrMagnitude > 0.01f;
        if (walking)
        {
            Moved = true;
            Vector3 delta = move * speed * Time.deltaTime;
            Vector3 p = transform.position;
            Vector3 n = p + delta;
            if (gm.Walkable(n) || !gm.Walkable(p)) p = n;
            else if (gm.DoorAssist(ref p, move, speed * Time.deltaTime)) { }
            else
            {
                Vector3 nx = p + new Vector3(delta.x, 0, 0);
                if (gm.Walkable(nx)) p = nx;
                Vector3 nz = p + new Vector3(0, 0, delta.z);
                if (gm.Walkable(nz)) p = nz;
            }
            transform.position = p;
            U.Face(transform, move);
        }

        rig.act = !walking && IsCleaning() ? Rig.Act.Clean : Rig.Act.None;
        rig.Tick(walking ? Mathf.Clamp01(move.magnitude) * (speed / 5.5f) : 0f);
        ring.localScale = Vector3.one * (1.1f + Mathf.Sin(Time.time * 3f) * 0.05f);
        ring.localScale = new Vector3(ring.localScale.x, 0.01f, ring.localScale.z);
        UpdateCarry();
        if (noLinenCd > 0f) noLinenCd -= Time.deltaTime;
    }

    // Kirli odada carsafsiz durunca ipucu
    public void NoLinenHint(Vector3 at)
    {
        if (noLinenCd > 0f) return;
        noLinenCd = 3f;
        GameManager.I.FloatText(at + Vector3.up * 2.2f, "Çarşafın yok! Çamaşırhaneden al", new Color(1f, 0.75f, 0.45f), 0.06f);
    }

    void UpdateCarry()
    {
        if (linen == shownLinen) return;
        shownLinen = linen;
        while (carryItems.Count < Mathf.Min(linen, 12))
        {
            int k = carryItems.Count;
            var b = U.Box("Carsaf", carry, new Vector3(0, k * 0.11f, 0), new Vector3(0.55f, 0.1f, 0.4f), k % 3 == 0 ? new Color(0.75f, 0.88f, 1f) : Color.white);
            carryItems.Add(b);
        }
        for (int i = 0; i < carryItems.Count; i++) carryItems[i].SetActive(i < linen);
    }

    public void SetLook(string variant, string name)
    {
        if (rig) Destroy(rig.gameObject);
        rig = Rig.Model(transform, variant);
        if (nameTag) nameTag.text = name;
    }

    void LateUpdate()
    {
        if (nameTag) nameTag.transform.position = transform.position + Vector3.up * 2.75f;
    }

    bool IsCleaning()
    {
        var gm = GameManager.I;
        foreach (var r in gm.rooms)
            if ((r.state == Room.State.Dirty || r.HasRequest) && U.Flat(transform.position, r.CleanSpot) < 0.95f) return true;
        if (gm.cafe.Open && gm.cafe.queue.Count > 0 && U.Flat(transform.position, Cafe.ServeSpot) < 0.8f) return true;
        if (gm.reception.queue.Count > 0 && U.Flat(transform.position, gm.reception.servicePos) < 0.85f) return true;
        return false;
    }

    Vector2 ReadInput()
    {
        Vector2 v = Vector2.zero;
        bool down = false;
        Vector2 pos = Vector2.zero;
        bool coop = GameManager.I.coop;
#if ENABLE_INPUT_SYSTEM
        var k = Keyboard.current;
        if (k != null)
        {
            if (id == 2)
            {
                if (k.upArrowKey.isPressed) v.y += 1;
                if (k.downArrowKey.isPressed) v.y -= 1;
                if (k.rightArrowKey.isPressed) v.x += 1;
                if (k.leftArrowKey.isPressed) v.x -= 1;
            }
            else
            {
                if (k.wKey.isPressed || (!coop && k.upArrowKey.isPressed)) v.y += 1;
                if (k.sKey.isPressed || (!coop && k.downArrowKey.isPressed)) v.y -= 1;
                if (k.dKey.isPressed || (!coop && k.rightArrowKey.isPressed)) v.x += 1;
                if (k.aKey.isPressed || (!coop && k.leftArrowKey.isPressed)) v.x -= 1;
            }
        }
        if (id == 1)
        {
            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.isPressed)
            {
                down = true;
                pos = Touchscreen.current.primaryTouch.position.ReadValue();
            }
            else if (Mouse.current != null && Mouse.current.leftButton.isPressed)
            {
                down = true;
                pos = Mouse.current.position.ReadValue();
            }
        }
#else
        if (id == 1)
        {
            v.x = Input.GetAxisRaw("Horizontal");
            v.y = Input.GetAxisRaw("Vertical");
            if (Input.GetMouseButton(0)) { down = true; pos = Input.mousePosition; }
        }
#endif
        // Arayuz dugmelerine tiklamayi joystick sayma
        if (down && !dragging && GameManager.I.OverUI(pos)) down = false;

        if (down)
        {
            if (!dragging) { dragging = true; dragStart = pos; }
            dragNow = pos;
            Vector2 d = (pos - dragStart) / (Screen.height * 0.08f);
            if (d.magnitude > 1f) d.Normalize();
            if (d.magnitude > 0.1f) v = d;
        }
        else dragging = false;

        if (v.magnitude > 1f) v.Normalize();
        return v;
    }
}
