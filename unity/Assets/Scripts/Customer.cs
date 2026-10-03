using System.Collections.Generic;
using UnityEngine;

// Musteri: gelir, bekler, odada uyur, istek yapar; cikista kafe ya da havuza ugrayabilir
public class Customer : MonoBehaviour
{
    enum S { Queue, Seat, ToRoom, Sleeping, Cafe, CafeSeat, Swim, Leaving }
    S s = S.Queue;

    readonly List<Vector3> path = new List<Vector3>();
    static readonly Vector3 Entrance = new Vector3(0f, 0f, -11f);
    static readonly Vector3 Sidewalk = new Vector3(0f, 0f, -14f);
    static readonly Vector3 LoungeGate = new Vector3(-8.6f, 0f, -9.15f);
    const float Speed = 3.4f;

    public enum G { Normal, Is, Turist, Balayi, Aile }
    public G type = G.Normal;
    public bool vip, celebrity, inspector;
    [System.NonSerialized] public Regulars.Def regular;
    [System.NonSerialized] public Reservations.R reservation;
    public float satAdj; // oda yukseltme gibi kararlarin memnuniyete etkisi
    public bool askedUpgrade;
    public int budget = 3; // misafirin butcesine gore istedigi oda seviyesi (1-3)

    // Ozel misafir ayari (olaylar, mudavimler, mufettis icin)
    public class Config
    {
        public G type = G.Normal;
        public bool vip, celebrity, inspector;
        public Regulars.Def regular;
        public Reservations.R reservation;
    }
    public static Config next;
    Follower follower;
    TextMesh typeTag;
    Rig rig;
    Room room;
    Reception.Seat seat;
    Cafe.Seat cafeSeat;
    Pool.Spot swimSpot;
    TextMesh zzz, mood, vipTag;
    bool passedDoor, sitting, swimming, reqDone, reqFailed, asked;
    float sleepT, patience, pause, waited, actT, reqWait;
    Rig.Act pauseAct;

    void Awake()
    {
        var gm = GameManager.I;
        var cfg = next;
        next = null;
        if (cfg != null)
        {
            type = cfg.type;
            vip = cfg.vip;
            celebrity = cfg.celebrity;
            inspector = cfg.inspector;
            regular = cfg.regular;
            reservation = cfg.reservation;
        }
        else
        {
            bool lux = false;
            foreach (var r in gm.rooms) if (r.level >= 2) lux = true;
            vip = lux && Quests.Total("served") >= 8 && Random.value < 0.12f * Pricing.VipMul;
            if (!vip && Quests.Total("served") >= 5)
            {
                float r = Random.value;
                bool love = Seasons.SpecialDay == "sevgililer";
                float bz = Regulars.BusinessPerk ? 0.12f : 0f;
                // sehre gore misafir karisimi (Bodrum: turist ve balayi, Kapadokya: balayi ve turist)
                float hb = Chain.Bias(G.Balayi), ha = Chain.Bias(G.Aile), hi = Chain.Bias(G.Is), ht = Chain.Bias(G.Turist);
                float b1 = (love ? 0.3f : 0.1f) * hb;
                float b2 = b1 + (love ? 0.1f : 0.1f) * ha;
                float b3 = b2 + ((love ? 0.15f : 0.2f) + bz) * hi;
                float b4 = b3 + (love ? 0.15f : 0.2f) * ht;
                if (r < b1) type = G.Balayi;
                else if (r < b2) type = G.Aile;
                else if (r < b3) type = G.Is;
                else if (r < b4) type = G.Turist;
            }
        }

        // Butce: herkes en iyi odayi istemez; boylece bazilari daha iyi oda ister (yukseltme istegi)
        float bq = Random.value;
        if (vip || celebrity || inspector) budget = 3;
        else if (reservation != null) budget = reservation.level;
        else if (type == G.Is) budget = bq < 0.3f ? 1 : bq < 0.7f ? 2 : 3;
        else if (type == G.Balayi) budget = bq < 0.2f ? 1 : bq < 0.6f ? 2 : 3;
        else if (type == G.Aile) budget = bq < 0.4f ? 1 : bq < 0.8f ? 2 : 3;
        else if (type == G.Turist) budget = bq < 0.55f ? 1 : bq < 0.9f ? 2 : 3;
        else budget = bq < 0.45f ? 1 : bq < 0.8f ? 2 : 3;
        if (regular != null) budget = 3;

        string look = Rig.Guests[Random.Range(0, Rig.Guests.Length)];
        if (type == G.Is) look = Random.value < 0.5f ? "character-male-d" : "character-female-d";
        if (regular != null) look = regular.look;
        rig = Rig.Model(transform, look);
        mood = U.Text(null, Vector3.zero, "", 0.12f, Color.white, true);
        mood.gameObject.SetActive(false);
        float pt = type == G.Is ? 0.7f : type == G.Aile ? 0.85f : type == G.Turist ? 1.1f : 1f;
        patience = (vip ? 35f : 45f) * pt * Eco.PatienceMul;
        if (regular != null) patience *= 1.3f;
        if (reservation != null) patience *= 1.25f;
        if (celebrity) patience = 28f * Eco.PatienceMul;

        if (type == G.Turist)
            U.Box("SirtCantasi", transform, new Vector3(0, 1.05f, -0.42f), new Vector3(0.5f, 0.6f, 0.28f), new Color(0.95f, 0.55f, 0.2f));
        if (type == G.Balayi)
        {
            string partner = regular != null && regular.partner != null ? regular.partner : Rig.Guests[Random.Range(0, Rig.Guests.Length)];
            follower = Follower.Make(this, partner, 1f);
        }
        if (type == G.Aile)
            follower = Follower.Make(this, Rig.Guests[Random.Range(0, Rig.Guests.Length)], 0.62f);
        if (regular != null)
            typeTag = U.Text(null, Vector3.zero, "★ " + regular.name, 0.055f, new Color(1f, 0.82f, 0.35f), true);
        else if (reservation != null)
            typeTag = U.Text(null, Vector3.zero, "Rezervasyon · " + reservation.name, 0.05f, new Color(0.5f, 0.95f, 1f), true);
        else if (celebrity)
            typeTag = U.Text(null, Vector3.zero, "Ünlü sanatçı", 0.055f, new Color(1f, 0.6f, 0.9f), true);
        else if (type != G.Normal && !inspector)
        {
            string[] tn = { "", "İş insanı", "Turist", "Balayı çifti ♥", "Aile" };
            Color[] tc = { Color.white, new Color(0.6f, 0.85f, 1f), new Color(0.6f, 1f, 0.6f), new Color(1f, 0.6f, 0.8f), new Color(1f, 0.8f, 0.45f) };
            typeTag = U.Text(null, Vector3.zero, tn[(int)type], 0.05f, tc[(int)type], true);
        }
        if (vip)
        {
            Color gold = new Color(1f, 0.82f, 0.25f);
            var crown = U.Box("Tac", transform, new Vector3(0, 2.32f, 0), new Vector3(0.55f, 0.12f, 0.55f), gold, PrimitiveType.Cylinder);
            for (int k = 0; k < 5; k++)
            {
                float a = k * Mathf.PI * 2f / 5f;
                U.Box("TacUc", transform, new Vector3(Mathf.Cos(a) * 0.22f, 2.48f, Mathf.Sin(a) * 0.22f), Vector3.one * 0.12f, gold, PrimitiveType.Sphere);
            }
            vipTag = U.Text(null, Vector3.zero, "VIP", 0.07f, gold, true);
        }
    }

    public bool Arrived => s == S.Queue && path.Count == 0;
    public bool Busy => s == S.Sleeping || sitting || swimming;
    public float PayMul => (celebrity ? 3f : vip ? 2f : 1f) * (type == G.Is ? (Regulars.BusinessPerk ? 1.43f : 1.3f) : type == G.Balayi || type == G.Aile ? 1.5f : 1f) * (reservation != null ? 1.2f : 1f);

    // Bu misafirin kabul edecegi en dusuk oda seviyesi
    public int MinLevel => Mathf.Max(vip || celebrity ? 2 : 1, reservation != null ? reservation.level : 1);
    public bool Lux => vip || celebrity;

    string[] RequestList()
    {
        if (regular != null) return new[] { regular.request[Regulars.Chapter(regular)] };
        if (celebrity) return new[] { "Şampanya lütfen!", "Taze çiçekler!", "Masaj randevusu?" };
        switch (type)
        {
            case G.Is: return new[] { "Kahve lütfen!", "Ütü lazım!", "İnternet şifresi?" };
            case G.Turist: return new[] { "Şehir haritası?", "Havlu lütfen!", "Su getirir misin?" };
            case G.Balayi: return new[] { "Gül yaprakları!", "Şampanya lütfen!", "Çikolata?" };
            case G.Aile: return new[] { "Ekstra yatak!", "Oyuncak var mı?", "Çocuk menüsü?" };
        }
        return null;
    }
    public bool CafeArrived => s == S.Cafe && path.Count == 0;

    // ---------------- Yollar ----------------
    void StartPath()
    {
        path.Clear();
        if (passedDoor) return;
        if (transform.position.z < -12.6f && Mathf.Abs(transform.position.x) > 1f) path.Add(Sidewalk);
        path.Add(Entrance);
    }

    void StandUp()
    {
        if (!sitting) return;
        sitting = false;
        if (seat != null) transform.position = seat.pos + seat.fwd * 0.9f;
        else if (cafeSeat != null) transform.position = cafeSeat.pos + cafeSeat.fwd * 0.9f;
        rig.act = Rig.Act.None;
    }

    public void GoToSlot(Vector3 p)
    {
        bool fromSeat = s == S.Seat;
        StandUp();
        s = S.Queue;
        if (fromSeat)
        {
            path.Clear();
            path.Add(LoungeGate);
        }
        else StartPath();
        path.Add(p);
        seat = null;
    }

    public void GoToSeat(Reception.Seat st)
    {
        seat = st;
        s = S.Seat;
        StartPath();
        path.Add(LoungeGate);
        path.Add(st.pos + st.fwd * 0.9f);
    }

    public void GoToRoom(Room r)
    {
        room = r;
        s = S.ToRoom;
        HideMood();
        if (vip) Quests.Track("vip");
        path.Clear();
        bool left = r.x < -6f;
        float side = left ? -9.0f : -3.3f;
        path.Add(new Vector3(side, 0, transform.position.z));
        path.Add(new Vector3(side, 0, -1f));
        if (r.oz > 0f) { path.Add(Elevator.LobbyPad); path.Add(Elevator.UpPad); }
        path.Add(r.Door);
        path.Add(r.Inside);
    }

    // Odadan ya da bir alandan cikista lobiye donus noktalari
    void ToLobby(Vector3 from)
    {
        if (from.z > 20f)
        {
            path.Add(new Vector3(from.x, 0, Elevator.Floor2Z + 2.5f));
            path.Add(Elevator.UpPad);
            path.Add(Elevator.LobbyPad);
            return;
        }
        if (from.z > 3f) path.Add(new Vector3(from.x, 0, 2.5f));
        if (from.x > 15f) path.Add(new Vector3(14f, 0, 1.5f));
        if (from.x < -15f) { path.Add(Pool.DoorOut); path.Add(Pool.DoorIn); }
    }

    void ExitPath(Vector3 from)
    {
        path.Clear();
        ToLobby(from);
        Vector3 p = path.Count > 0 ? path[path.Count - 1] : from;
        if (p.x < -6f)
        {
            if (p.z > -2f) { path.Add(new Vector3(-9f, 0, -1f)); path.Add(new Vector3(-9f, 0, -6f)); }
            path.Add(new Vector3(-7.5f, 0, -10.3f));
        }
        path.Add(Entrance);
        path.Add(Sidewalk);
        path.Add(new Vector3(Random.value < 0.5f ? -26f : 26f, 0, -14f));
    }

    public void GoToCafe(Vector3 slot)
    {
        if (s != S.Cafe)
        {
            s = S.Cafe;
            path.Clear();
            ToLobby(transform.position);
            Vector3 p = path.Count > 0 ? path[path.Count - 1] : transform.position;
            if (p.x < -6f) path.Add(new Vector3(-9f, 0, -1f));
            path.Add(new Vector3(8.5f, 0, -2.5f));
        }
        else
        {
            // siradaki yeri guncelle: son hedefi degistir
            if (path.Count > 0) path.RemoveAt(path.Count - 1);
        }
        path.Add(slot);
    }

    public void CafeServed(Cafe.Seat st)
    {
        cafeSeat = st;
        if (st == null) { Leave(); return; }
        s = S.CafeSeat;
        path.Clear();
        path.Add(st.pos + st.fwd * 0.9f);
        actT = Random.Range(4f, 6f);
    }

    void GoSwim(Pool.Spot sp)
    {
        swimSpot = sp;
        s = S.Swim;
        path.Clear();
        ToLobby(transform.position);
        path.Add(new Vector3(-12f, 0, 1.0f));
        path.Add(Pool.DoorIn);
        path.Add(Pool.DoorOut);
        path.Add(new Vector3(sp.pos.x, 0, 3.15f));
        actT = Random.Range(6f, 9f);
    }

    void Leave()
    {
        s = S.Leaving;
        ExitPath(transform.position);
    }

    // ---------------- Durum ----------------
    public void OnRequestDone() => reqDone = true;

    float Satisfaction()
    {
        float sat = 3f;
        int lv = room != null ? room.level : 1;
        if (room != null)
        {
            sat += RoomKinds.Bonus(room.kind, type, vip);
            if (room.IsSuite) lv = 3;
        }
        sat += Pricing.Sat(lv) + satAdj;
        if (reservation != null && room != null && room.level >= reservation.level) sat += 0.3f;
        sat += lv == 2 ? 0.7f : lv >= 3 ? 1.4f : 0f;
        if (vip && lv < 3) sat -= 0.6f;
        if (waited < 15f) sat += 0.5f;
        else if (waited > 35f) sat -= 0.6f;
        if (reqDone) sat += 0.6f;
        if (reqFailed) sat -= 0.8f;
        if (type == G.Balayi) sat += lv >= 3 ? 0.8f : lv <= 1 ? -0.5f : 0f;
        if (type == G.Aile && lv >= 2) sat += 0.4f;
        if (type == G.Is && waited > 20f) sat -= 0.4f;
        sat += GameManager.I.DecorBonus;
        if (room != null) sat += Themes.Bonus(room.theme, type);
        sat += Events.SatBonus;
        if (GameManager.I.catAdopted) sat += 0.1f;
        if (celebrity && (room == null || room.level < 3)) sat -= 1f;
        if (regular != null && room != null && room.level < regular.minLevel[Regulars.Chapter(regular)]) sat -= 1f;
        if (inspector && !reqDone) sat -= 0.5f;
        return Mathf.Clamp(sat, 1f, 5f);
    }

    void ShowMood(string t, Color c)
    {
        mood.gameObject.SetActive(true);
        mood.text = t;
        mood.color = c;
    }

    void HideMood()
    {
        if (mood) mood.gameObject.SetActive(false);
    }

    // Yagmurda disarida yururken semsiye acar
    GameObject umbrella;
    static readonly Color[] UmbColors = { new Color(0.9f, 0.25f, 0.3f), new Color(0.25f, 0.45f, 0.85f), new Color(0.98f, 0.8f, 0.25f), new Color(0.3f, 0.7f, 0.45f), new Color(0.6f, 0.35f, 0.75f), new Color(0.15f, 0.15f, 0.18f) };

    void UpdateUmbrella()
    {
        Vector3 p = transform.position;
        bool outside = (p.z < -12.45f || p.x < -15.5f) && !Busy && pause <= 0f;
        bool want = outside && Events.Wet;
        if (want && umbrella == null)
        {
            umbrella = new GameObject("Semsiye");
            umbrella.transform.SetParent(transform, false);
            var c = UmbColors[Random.Range(0, UmbColors.Length)];
            U.Box("Sap", umbrella.transform, new Vector3(0.25f, 1.8f, 0.1f), new Vector3(0.04f, 0.55f, 0.04f), new Color(0.2f, 0.18f, 0.16f), PrimitiveType.Cylinder);
            U.Box("Kubbe", umbrella.transform, new Vector3(0.25f, 2.38f, 0.1f), new Vector3(1.15f, 0.32f, 1.15f), c, PrimitiveType.Sphere);
            U.Box("Tepe", umbrella.transform, new Vector3(0.25f, 2.56f, 0.1f), new Vector3(0.08f, 0.1f, 0.08f), new Color(0.2f, 0.18f, 0.16f), PrimitiveType.Sphere);
        }
        if (umbrella && umbrella.activeSelf != want) umbrella.SetActive(want);
    }

    void LateUpdate()
    {
        UpdateUmbrella();
        float h = sitting ? 2.3f : swimming ? 1.6f : 2.75f;
        if (mood && mood.gameObject.activeSelf)
            mood.transform.position = transform.position + Vector3.up * (h + (vip ? 0.35f : 0f)) + Vector3.up * Mathf.Sin(Time.time * 4f) * 0.06f;
        if (typeTag)
        {
            typeTag.gameObject.SetActive(!Busy && s != S.Leaving);
            typeTag.transform.position = transform.position + Vector3.up * (h + (vip ? 0.4f : 0.05f));
        }
        if (vipTag)
        {
            vipTag.gameObject.SetActive(s != S.Sleeping);
            vipTag.transform.position = transform.position + Vector3.up * (h + 0.05f);
        }
    }

    void OnDestroy()
    {
        if (mood) Destroy(mood.gameObject);
        if (zzz) Destroy(zzz.gameObject);
        if (vipTag) Destroy(vipTag.gameObject);
        if (typeTag) Destroy(typeTag.gameObject);
        if (follower) Destroy(follower.gameObject);
    }

    void Update()
    {
        if (pause > 0f)
        {
            pause -= Time.deltaTime;
            rig.act = pause > 0f ? pauseAct : Rig.Act.None;
            rig.Tick(0f);
            return;
        }
        if (!passedDoor && transform.position.z > -11.5f) passedDoor = true;

        switch (s)
        {
            case S.Queue:
                if (U.Walk(transform, path, Speed, rig)) U.Face(transform, Vector3.forward);
                Wait(1f);
                break;

            case S.Seat:
                if (!sitting)
                {
                    if (U.Walk(transform, path, Speed, rig))
                    {
                        sitting = true;
                        transform.position = seat.pos;
                        transform.rotation = Quaternion.LookRotation(seat.fwd);
                        rig.act = Rig.Act.Sit;
                    }
                }
                else rig.Tick(0f);
                Wait(0.35f);
                break;

            case S.ToRoom:
                if (U.Walk(transform, path, Speed, rig))
                {
                    s = S.Sleeping;
                    room.state = Room.State.Occupied;
                    room.guest = this;
                    room.SetOccupied(true);
                    sleepT = Random.Range(5f, 7f);
                    rig.Tick(0f);
                    transform.position = room.BedPos;
                    transform.rotation = Quaternion.Euler(0, 180, 0) * Quaternion.Euler(-90, 0, 0);
                    zzz = U.Text(null, new Vector3(room.x + 0.5f, 2.2f, room.Z(9f)), "Z", 0.1f, new Color(0.75f, 0.88f, 1f), true);
                }
                break;

            case S.Sleeping:
                // biraz sonra istekte bulunabilir; istek acikken uyku sayaci durur
                if (!asked && sleepT < 4.2f)
                {
                    asked = true;
                    if (inspector || regular != null || celebrity || Random.value < (vip ? 0.7f : type != G.Normal ? 0.55f : 0.4f)) room.StartRequest(RequestList());
                }
                if (room.HasRequest)
                {
                    reqWait += Time.deltaTime;
                    if (reqWait > 14f)
                    {
                        room.CancelRequest();
                        reqFailed = true;
                        GameManager.I.FloatText(new Vector3(room.x, 2.6f, room.Z(7.6f)), "Kimse gelmedi...", new Color(1f, 0.55f, 0.5f), 0.07f);
                    }
                }
                else sleepT -= Time.deltaTime;

                if (zzz)
                {
                    zzz.text = new string('Z', 1 + (int)(Time.time * 2f) % 3);
                    zzz.transform.position = new Vector3(room.x + 0.5f, 2.1f + Mathf.Repeat(Time.time * 0.5f, 0.4f), room.Z(9f));
                }
                if (sleepT <= 0f) CheckOut();
                break;

            case S.Cafe:
                if (U.Walk(transform, path, Speed, rig)) U.Face(transform, Vector3.right);
                break;

            case S.CafeSeat:
                if (!sitting)
                {
                    if (U.Walk(transform, path, Speed, rig))
                    {
                        sitting = true;
                        transform.position = cafeSeat.pos;
                        transform.rotation = Quaternion.LookRotation(cafeSeat.fwd);
                        rig.act = Rig.Act.Sit;
                    }
                }
                else
                {
                    rig.Tick(0f);
                    actT -= Time.deltaTime;
                    if (actT <= 0f)
                    {
                        StandUp();
                        cafeSeat.who = null;
                        cafeSeat = null;
                        Leave();
                    }
                }
                break;

            case S.Swim:
                if (!swimming)
                {
                    if (U.Walk(transform, path, Speed, rig))
                    {
                        swimming = true;
                        transform.position = swimSpot.pos;
                        transform.rotation = Quaternion.Euler(0, Random.Range(0f, 360f), 0);
                        U.Burst(new Vector3(swimSpot.pos.x, 0f, swimSpot.pos.z), new Color(0.7f, 0.9f, 1f), Color.white, 20, 3f);
                    }
                }
                else
                {
                    actT -= Time.deltaTime;
                    transform.position = swimSpot.pos + Vector3.up * Mathf.Sin(Time.time * 2f) * 0.06f;
                    transform.Rotate(0, 20f * Time.deltaTime, 0);
                    rig.Tick(0f);
                    if (actT <= 0f)
                    {
                        swimming = false;
                        transform.position = new Vector3(swimSpot.pos.x, 0, 3.15f);
                        GameManager.I.pool.Leave(swimSpot, true);
                        swimSpot = null;
                        Leave();
                    }
                }
                break;

            case S.Leaving:
                if (U.Walk(transform, path, Speed, rig))
                {
                    GameManager.I.customers.Remove(this);
                    Destroy(gameObject);
                }
                break;
        }
    }

    void CheckOut()
    {
        var gm = GameManager.I;
        if (zzz) Destroy(zzz.gameObject);
        if (room.HasRequest) room.CancelRequest();
        float sat = Satisfaction();
        gm.AddRating(sat);
        Report.Guest(sat);
        Social.OnCheckout(this, sat, room);
        Story.OnGuest(this, sat);
        if (regular != null) Regulars.OnLeave(this, sat, room, false);
        if (inspector) StarExam.Result(sat);
        room.SetDirty();
        float tipMul = (0.5f + sat * 0.2f) * (vip ? 3f : 1f) * (celebrity ? 2f : 1f) * (type == G.Balayi ? 1.5f : 1f) * Seasons.TipMul * (1f + Regulars.TipPerk) * RoomKinds.TipMul(room.kind, type);
        room.tips.Add(Mathf.Max(1, Mathf.RoundToInt(room.Tip * tipMul)));
        transform.position = room.Inside;
        transform.rotation = Quaternion.LookRotation(Vector3.back);
        pause = 1.4f;
        pauseAct = Rig.Act.Cheer;
        string face = sat >= 4.5f ? "♥♥" : sat >= 3.5f ? "♥" : sat >= 2.5f ? "☺" : "☹";
        gm.FloatText(transform.position + Vector3.up * 2.6f, face, sat >= 2.5f ? new Color(1f, 0.45f, 0.6f) : new Color(0.7f, 0.7f, 0.75f), 0.16f);

        // Cikista kafe ya da havuz
        float cafeC = Seasons.CafeChance + Events.CafeAdd + (type == G.Is ? 0.2f : type == G.Turist ? 0.1f : 0f);
        float poolC = Seasons.PoolChance * Events.PoolMul * (type == G.Turist ? 1.4f : type == G.Is ? 0.5f : type == G.Aile ? 1.2f : 1f);
        if (gm.cafe.Open && Random.value < cafeC && gm.cafe.Join(this)) return;
        if (gm.pool.Open && Random.value < poolC)
        {
            var sp = gm.pool.Join(this);
            if (sp != null) { GoSwim(sp); return; }
        }
        Leave();
    }

    void Wait(float rate)
    {
        if (!passedDoor) return;
        waited += Time.deltaTime;
        patience -= Time.deltaTime * rate;
        if (patience < 12f)
            ShowMood(Mathf.Repeat(Time.time, 0.6f) < 0.3f ? "!!" : "!", new Color(1f, 0.4f, 0.35f));
        if (patience <= 0f) LeaveAngry();
    }

    void LeaveAngry()
    {
        var gm = GameManager.I;
        StandUp();
        gm.reception.Remove(this);
        gm.AddRating(1f);
        Report.Angry();
        if (regular != null) Regulars.OnLeave(this, 1f, null, true);
        if (inspector) StarExam.Result(1f);
        if (reservation != null) Reservations.OnAngry(this);
        if (celebrity) Social.Share("Ünlü sanatçı otelde beklemekten sıkılıp gitti! Hayranları çok kızgın.", 0, true);
        gm.FloatText(transform.position + Vector3.up * 2.6f, "Çok bekledim!", new Color(1f, 0.45f, 0.4f), 0.07f);
        Sfx.Play("bad", 0.6f);
        HideMood();
        pause = 1.2f;
        pauseAct = Rig.Act.Sad;
        Leave();
    }
}

// Misafire eslik eden ikinci karakter (es ya da cocuk)
public class Follower : MonoBehaviour
{
    Customer leader;
    Rig rig;
    float side;

    public static Follower Make(Customer leader, string variant, float scale)
    {
        var g = new GameObject("Eslikci");
        g.transform.position = leader.transform.position + Vector3.right * 0.8f;
        var f = g.AddComponent<Follower>();
        f.leader = leader;
        f.side = Random.value < 0.5f ? -1f : 1f;
        f.rig = Rig.Model(g.transform, variant);
        f.rig.transform.localScale *= scale;
        return f;
    }

    void LateUpdate()
    {
        if (!leader) { Destroy(gameObject); return; }
        bool hide = leader.Busy;
        if (rig.gameObject.activeSelf == hide) rig.gameObject.SetActive(!hide);
        var lt = leader.transform;
        Vector3 fwd = lt.forward; fwd.y = 0;
        if (fwd.sqrMagnitude < 0.01f) fwd = Vector3.forward;
        fwd.Normalize();
        Vector3 right = new Vector3(fwd.z, 0, -fwd.x);
        Vector3 target = new Vector3(lt.position.x, 0, lt.position.z) - fwd * 0.7f + right * 0.75f * side;
        if (hide) { transform.position = target; return; }
        Vector3 d = target - transform.position;
        d.y = 0;
        float dist = d.magnitude;
        if (dist > 12f) { transform.position = target; dist = 0f; }
        float sp = Mathf.Clamp(dist * 3f, 0f, 5f);
        if (dist > 0.05f)
        {
            transform.position += d.normalized * Mathf.Min(dist, sp * Time.deltaTime);
            U.Face(transform, d);
        }
        else U.Face(transform, fwd);
        rig.Tick(dist > 0.15f ? 1f : 0f);
    }
}
