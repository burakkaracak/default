using UnityEngine;

// Oyun ici menu: Otel (odalar), Personel, Gelistirmeler, Ayarlar
public class Menu : MonoBehaviour
{
    public bool open;
    int tab;
    Vector2 scroll;
    float resetConfirm;
    string hotelEdit = "";
    string recepEdit = "";
    string baristaEdit = "";
    string managerEdit = "";
    string p2Edit = "";
    readonly string[] cleanerEdit = new string[8];

    GUIStyle title, sub, btn, tabSt, field, small;
    static readonly string[] Tabs = { "Otel", "Personel", "Geliştirmeler", "Dekor", "Görevler", "Hikâye", "Ayarlar" };
    static readonly Color Dark = new Color(0.11f, 0.13f, 0.21f, 1f);
    static readonly Color Card = new Color(1f, 1f, 1f, 0.06f);
    static readonly Color Green = new Color(0.35f, 0.8f, 0.45f, 1f);
    static readonly Color Grey = new Color(0.45f, 0.47f, 0.52f, 1f);
    static readonly Color Gold = new Color(1f, 0.78f, 0.25f, 1f);

    GameManager G => GameManager.I;

    public void Toggle()
    {
        open = !open;
        if (open)
        {
            hotelEdit = G.hotelName;
            recepEdit = G.reception.staffName;
            baristaEdit = G.cafe.baristaName;
            managerEdit = G.managerName;
            p2Edit = G.p2Name;
            for (int i = 0; i < G.cleaners.Count && i < cleanerEdit.Length; i++) cleanerEdit[i] = G.cleaners[i].staffName;
            resetConfirm = 0;
        }
        else G.Save();
    }

    void Update()
    {
        if (resetConfirm > 0) resetConfirm -= Time.unscaledDeltaTime;
#if ENABLE_INPUT_SYSTEM
        var k = UnityEngine.InputSystem.Keyboard.current;
        if (open && k != null && k.escapeKey.wasPressedThisFrame) Toggle();
#endif
    }

    void Styles(float s)
    {
        if (title == null)
        {
            title = new GUIStyle(GUI.skin.label) { fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleLeft };
            sub = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.UpperLeft, wordWrap = true };
            small = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            btn = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            tabSt = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            field = new GUIStyle(GUI.skin.textField) { alignment = TextAnchor.MiddleLeft };
        }
        title.fontSize = Mathf.RoundToInt(28 * s);
        title.normal.textColor = Color.white;
        sub.fontSize = Mathf.RoundToInt(21 * s);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        small.fontSize = Mathf.RoundToInt(20 * s);
        btn.fontSize = Mathf.RoundToInt(24 * s);
        tabSt.fontSize = Mathf.RoundToInt(19 * s);
        field.fontSize = Mathf.RoundToInt(26 * s);
        field.padding = new RectOffset(Mathf.RoundToInt(14 * s), 8, 4, 4);
    }

    bool Button(Rect r, string text, Color c, bool enabled = true)
    {
        G.Panel(r, enabled ? c : Grey);
        btn.normal.textColor = enabled ? new Color(0.12f, 0.1f, 0.08f) : new Color(0.85f, 0.85f, 0.88f);
        bool click = GUI.Button(r, text, btn);
        if (click && enabled) Sfx.Play("pop", 0.5f);
        return click && enabled;
    }

    void OnGUI()
    {
        if (!open) return;
        GUI.depth = 0;
        float s = G.UIScale;
        Styles(s);

        // arka plani karart
        GUI.color = new Color(0, 0, 0, 0.45f);
        GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
        GUI.color = Color.white;

        float w = Mathf.Min(Screen.width - 40 * s, 1150 * s);
        float h = Mathf.Min(Screen.height - 140 * s, 840 * s);
        var P = new Rect((Screen.width - w) / 2f, 120 * s, w, h);
        G.Panel(P, Dark);

        // sekmeler
        float tw = (w - 140 * s) / Tabs.Length;
        for (int i = 0; i < Tabs.Length; i++)
        {
            var tr = new Rect(P.x + 20 * s + i * tw, P.y + 18 * s, tw - 10 * s, 64 * s);
            G.Panel(tr, i == tab ? Gold : Card);
            tabSt.normal.textColor = i == tab ? new Color(0.2f, 0.13f, 0.05f) : Color.white;
            if (GUI.Button(tr, Tabs[i], tabSt)) { tab = i; scroll = Vector2.zero; Sfx.Play("pop", 0.4f); }
        }
        if (Button(new Rect(P.xMax - 100 * s, P.y + 18 * s, 80 * s, 64 * s), "✕", new Color(0.95f, 0.45f, 0.4f))) { Toggle(); return; }

        var body = new Rect(P.x + 20 * s, P.y + 100 * s, w - 40 * s, h - 120 * s);
        switch (tab)
        {
            case 0: HotelTab(body, s); break;
            case 1: StaffTab(body, s); break;
            case 2: UpgradeTab(body, s); break;
            case 3: DecorTab(body, s); break;
            case 4: QuestTab(body, s); break;
            case 5: StoryTab(body, s); break;
            case 6: SettingsTab(body, s); break;
        }
    }

    // ---------------- OTEL ----------------
    void HotelTab(Rect b, float s)
    {
        float rh = 112 * s;
        int areaRows = 4;
        float priceH = 170 * s;
        var view = new Rect(0, 0, b.width - 30 * s, priceH + rh * (G.rooms.Count + areaRows) + 60 * s);
        scroll = GUI.BeginScrollView(b, scroll, view);

        // Fiyat politikasi
        var pr = new Rect(0, 0, view.width, priceH - 12 * s);
        G.Panel(pr, new Color(1f, 0.78f, 0.25f, 0.1f));
        title.normal.textColor = Color.white;
        GUI.Label(new Rect(pr.x + 22 * s, pr.y + 8 * s, 600 * s, 44 * s), "Fiyat politikası: " + Pricing.Names[Pricing.policy], title);
        GUI.Label(new Rect(pr.x + 22 * s, pr.y + 52 * s, pr.width - 44 * s, 30 * s), Pricing.Desc[Pricing.policy], sub);
        float pbw = (pr.width - 44 * s - 3 * 12 * s) / 4f;
        for (int k = 0; k < 4; k++)
        {
            var pbr = new Rect(pr.x + 22 * s + k * (pbw + 12 * s), pr.y + 92 * s, pbw, 60 * s);
            bool sel = Pricing.policy == k;
            if (sel) { G.Panel(pbr, Gold); btn.normal.textColor = new Color(0.12f, 0.1f, 0.08f); GUI.Label(pbr, Pricing.Names[k] + " ✓", btn); }
            else if (Button(pbr, Pricing.Names[k], new Color(0.55f, 0.75f, 0.95f, 1f))) G.SetPricing(k);
        }
        GUI.BeginGroup(new Rect(0, priceH, view.width, view.height - priceH));

        // Alanlar
        AreaRow(new Rect(0, 0, view.width, rh - 12 * s), "Kafe", "Odadan çıkan misafirler kahve alır, kafede oturur. Lobinin doğusuna kurulur.",
            G.cafe.Open, Eco.CafeCost, () => G.OpenCafe(), s);
        AreaRow(new Rect(0, rh, view.width, rh - 12 * s), "Havuz", "Misafirler çıkışta yüzmeye gider ve ücret bırakır. Otelin batısına kurulur.",
            G.pool.Open, Eco.PoolCost, () => G.OpenPool(), s);
        AreaRow(new Rect(0, rh * 2, view.width, rh - 12 * s), "Yeni Kanat", "Doğuya 4 odalı yeni bir bina (Oda 107-110).",
            G.wingOpen, Eco.WingCost, () => G.OpenWing(), s);
        AreaRow(new Rect(0, rh * 3, view.width, rh - 12 * s), "2. Kat", "Asansörle çıkılan yeni kat: 6 oda (201-206). Lobideki asansörde bekle, yukarı çık.",
            G.floor2Open, Eco.Floor2Cost, () => G.OpenFloor2(), s);

        float y0 = rh * areaRows + 10 * s;
        sub.normal.textColor = new Color(1f, 0.86f, 0.5f);
        GUI.Label(new Rect(10 * s, y0, 400 * s, 40 * s), "ODALAR", sub);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        y0 += 44 * s;

        int next = G.NextLockedRoom();
        for (int i = 0; i < G.rooms.Count; i++)
        {
            var r = G.rooms[i];
            var row = new Rect(0, y0 + i * rh, view.width, rh - 12 * s);
            G.Panel(row, Card);
            string stars = r.Unlocked ? new string('★', r.level) + new string('☆', 3 - r.level) : "";
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 520 * s, 44 * s), "Oda " + r.Number + "   " + stars, title);
            string info;
            if (!r.Unlocked) info = "Kilitli · açılınca gecelik " + Eco.TL(Eco.NightPrice(i, 1));
            else if (r.IsSuitePart) info = "Oda " + r.suiteMain.Number + " Başkanlık Süiti'nin salonu";
            else
            {
                info = (r.IsSuite ? "Başkanlık Süiti" : Eco.LevelNames[r.level] + (r.kind > 0 ? " " + RoomKinds.Short[r.kind] : "")) + " · gecelik " + Eco.TL(r.Price) + " · bahşiş " + Eco.TL(r.Tip);
                if (r.level < 3) info += "\nSonraki: " + Eco.LevelNames[r.level + 1] + " · gecelik " + Eco.TL(Mathf.RoundToInt(Eco.NightPrice(i, r.level + 1) * RoomKinds.PriceMul(r.kind)));
            }
            GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 560 * s, 56 * s), info, sub);

            var br = new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s);
            if (r.IsSuitePart)
            {
                Button(br, "Süitin parçası", Grey, false);
                continue;
            }
            if (r.Unlocked)
            {
                var tb = new Rect(row.xMax - 520 * s, row.y + 6 * s, 220 * s, 42 * s);
                var kb = new Rect(row.xMax - 520 * s, row.y + 52 * s, 220 * s, 42 * s);
                int idx = i;
                small.normal.textColor = new Color(0.12f, 0.1f, 0.08f);
                if (Button(tb, "Tema: " + Themes.Names[r.theme], r.theme > 0 ? new Color(0.95f, 0.6f, 0.8f, 1f) : new Color(0.6f, 0.75f, 0.95f, 1f))) ThemeChooser(idx);
                string kn = r.IsSuite ? "Süit" : r.kind == 0 ? "Klasik" : RoomKinds.Short[r.kind];
                if (Button(kb, "Tip: " + kn, r.kind > 0 ? new Color(1f, 0.82f, 0.45f, 1f) : new Color(0.6f, 0.75f, 0.95f, 1f))) KindChooser(idx);
            }
            if (!r.Unlocked)
            {
                if (i >= Eco.Floor2Start && !G.floor2Open) Button(br, "Önce 2. Kat", Grey, false);
                else if (i >= Eco.WingStart && i < Eco.Floor2Start && !G.wingOpen) Button(br, "Önce Yeni Kanat", Grey, false);
                else if (i == next)
                {
                    int c = Eco.RoomUnlock[i];
                    if (Button(br, "Aç  " + Eco.TL(c), Green, G.CanPay(c))) G.UnlockRoom(i);
                }
                else Button(br, "Önce Oda " + G.rooms[next].Number, Grey, false);
            }
            else if (r.level < 3)
            {
                int c = Eco.UpgradeCost(i, r.level + 1);
                if (Button(br, "Yükselt  " + Eco.TL(c), Gold, G.CanPay(c))) G.UpgradeRoom(i);
            }
            else Button(br, "En üst seviye", Grey, false);
        }
        GUI.EndGroup();
        GUI.EndScrollView();
    }

    void KindChooser(int i)
    {
        var r = G.rooms[i];
        var p = Popups.Show("Oda " + r.Number + " tipi",
            "Tip, fiyatı ve hangi misafirin çok mutlu olacağını belirler. Resepsiyon misafiri ona uygun tipteki boş odaya yerleştirir.\n" + RoomKinds.Desc[r.IsSuite ? RoomKinds.Suit : r.kind], "ODA TİPİ");
        if (!r.IsSuite)
            for (int k = 0; k < RoomKinds.Selectable; k++)
            {
                int kk = k;
                bool sel = r.kind == k;
                int c = RoomKinds.Cost(i, k);
                bool lvOk = r.level >= RoomKinds.MinLevel(k);
                string label = RoomKinds.Names[k] + " · " + RoomKinds.Fans(k) + (sel ? "   (seçili)" : !lvOk ? "   (en az " + Eco.LevelNames[RoomKinds.MinLevel(k)] + ")" : c > 0 ? "   " + Eco.TL(c) : "");
                p.Add(label, () => G.BuyKind(i, kk), sel ? Grey : Green, !sel && lvOk && G.CanPay(c));
            }
        if (!r.IsSuite && i + 1 < G.rooms.Count && RoomKinds.SameSection(i, i + 1) && !G.rooms[i + 1].IsSuite)
        {
            int sc = RoomKinds.SuiteCost(i);
            bool ok = G.CanSuite(i);
            p.Add("Başkanlık Süiti: Oda " + G.rooms[i + 1].Number + " ile birleştir   " + (ok ? Eco.TL(sc) : "(ikisi de boş Kral Dairesi olmalı)"),
                () => G.MakeSuite(i), Gold, ok && G.CanPay(sc));
        }
        p.Add("Kapat", null, new Color(0.95f, 0.45f, 0.4f, 1f));
    }

    static readonly string[] ThemeFans = { "Herkese uygun", "Turistler sever", "Aileler sever", "İş insanları sever", "Balayı çiftleri sever" };

    void ThemeChooser(int i)
    {
        var r = G.rooms[i];
        var p = Popups.Show("Oda " + r.Number + " teması",
            "Tema her misafiri biraz mutlu eder, uygun misafiri çok daha fazla. Resepsiyon misafiri ona uygun temalı boş odaya yerleştirir.", "ODA TEMASI");
        for (int t = 0; t < Themes.Names.Length; t++)
        {
            int th = t;
            bool owned = (r.themeOwned & (1 << t)) != 0;
            bool sel = r.theme == t;
            int c = Themes.Cost(i, t);
            string label = Themes.Names[t] + " · " + ThemeFans[t] + (sel ? "   (seçili)" : owned ? "" : "   " + Eco.TL(c));
            p.Add(label, () => G.BuyTheme(i, th), sel ? Grey : owned ? new Color(0.55f, 0.75f, 0.95f, 1f) : Green, !sel && (owned || G.CanPay(c)));
        }
        p.Add("Kapat", null, new Color(0.95f, 0.45f, 0.4f, 1f));
    }

    void AreaRow(Rect row, string name, string desc, bool open, int cost, System.Action buy, float s)
    {
        G.Panel(row, open ? new Color(0.3f, 0.6f, 0.4f, 0.25f) : Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 520 * s, 44 * s), name, title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 330 * s, 56 * s), desc, sub);
        var br = new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s);
        if (open) Button(br, "Açık ✓", Grey, false);
        else if (Button(br, "Aç  " + Eco.TL(cost), Green, G.CanPay(cost))) buy();
    }

    // ---------------- DEKOR ----------------
    void DecorTab(Rect b, float s)
    {
        float rh = 150 * s;
        var view = new Rect(0, 0, b.width - 30 * s, rh * Decor.Slots.Length + 90 * s);
        scroll = GUI.BeginScrollView(b, scroll, view);
        sub.normal.textColor = new Color(1f, 0.86f, 0.5f);
        GUI.Label(new Rect(10 * s, 0, view.width - 20 * s, 70 * s),
            "Lobiyi süsle! Varsayılandan farklı her seçim misafir memnuniyetini artırır. Şu an bonus: +" + Mathf.RoundToInt(Decor.Bonus * 100) + "%", sub);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        float y = 76 * s;
        for (int si = 0; si < Decor.Slots.Length; si++)
        {
            var d = Decor.Slots[si];
            var row = new Rect(0, y, view.width, rh - 12 * s);
            G.Panel(row, Card);
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(row.x + 22 * s, row.y + 6 * s, 600 * s, 40 * s), d.name, title);
            int n = d.opts.Length;
            float bw = (row.width - 44 * s - (n - 1) * 10 * s) / n;
            for (int o = 0; o < n; o++)
            {
                var br = new Rect(row.x + 22 * s + o * (bw + 10 * s), row.y + 52 * s, bw, 80 * s);
                bool sel = d.sel == o, own = d.Owns(o);
                string label = d.opts[o] + "\n" + (sel ? "Seçili ✓" : own ? "Kullan" : Eco.TL(d.costs[o]));
                Color c = sel ? Gold : own ? new Color(0.55f, 0.75f, 0.95f, 1f) : Green;
                bool can = !sel && (own || G.CanPay(d.costs[o]));
                if (sel)
                {
                    G.Panel(br, Gold);
                    btn.normal.textColor = new Color(0.12f, 0.1f, 0.08f);
                    GUI.Label(br, label, btn);
                }
                else if (Button(br, label, c, can)) G.BuyDecor(si, o);
            }
            y += rh;
        }
        GUI.EndScrollView();
    }

    // ---------------- PERSONEL ----------------
    Vector2 staffScroll;

    void StaffTab(Rect b, float s)
    {
        float rh = 158 * s;
        int rows = 2 + G.cleaners.Count + (G.CanHireCleaner ? 1 : 0) + 1;
        var view = new Rect(0, 0, b.width - 30 * s, rh * rows + 60 * s);
        staffScroll = GUI.BeginScrollView(b, staffScroll, view);
        float y = 0;

        // Resepsiyonist
        if (G.reception.HasStaff)
            StaffRow(new Rect(0, y, view.width, rh - 12 * s), "Resepsiyonist", G.reception.stats, ref recepEdit, n => G.reception.Rename(n), "Misafirleri senin yerine odalara yerleştirir.", s);
        else
            HireRow(new Rect(0, y, view.width, rh - 12 * s), "Resepsiyonist", "Misafirleri senin yerine odalara yerleştirir. Resepsiyonda beklemene gerek kalmaz.",
                Eco.ReceptionistCost, true, () => { G.HireReceptionist(); recepEdit = G.reception.staffName; }, s);
        y += rh;

        // Temizlikciler
        for (int i = 0; i < G.cleaners.Count; i++)
        {
            if (cleanerEdit[i] == null) cleanerEdit[i] = G.cleaners[i].staffName;
            int idx = i;
            StaffRow(new Rect(0, y, view.width, rh - 12 * s), "Temizlikçi " + (i + 1), G.cleaners[i].stats, ref cleanerEdit[i], n => G.cleaners[idx].Rename(n),
                "Odaları temizler, isteklere koşar.", s);
            y += rh;
        }
        if (G.CanHireCleaner)
        {
            int c = Eco.CleanerCost[G.cleaners.Count];
            HireRow(new Rect(0, y, view.width, rh - 12 * s), "Yeni Temizlikçi (" + (G.cleaners.Count + 1) + "/" + Eco.CleanerCost.Length + ")",
                "Kirli odaları kendiliğinden temizler, sen paraya odaklanırsın.", c, true,
                () => { G.HireCleaner(); cleanerEdit[G.cleaners.Count - 1] = G.cleaners[G.cleaners.Count - 1].staffName; }, s);
            y += rh;
        }
        // Barista
        if (G.cafe.HasBarista)
            StaffRow(new Rect(0, y, view.width, rh - 12 * s), "Barista", G.cafe.stats, ref baristaEdit, n => G.cafe.Rename(n), "Kafede kahveleri o hazırlar.", s);
        else
            HireRow(new Rect(0, y, view.width, rh - 12 * s), "Barista", G.cafe.Open ? "Kafede kahveleri senin yerine hazırlar." : "Önce Otel sekmesinden kafeyi aç.",
                Eco.BaristaCost, G.cafe.Open, () => { G.HireBarista(); baristaEdit = G.cafe.baristaName; }, s);
        y += rh;

        // Dinlenme odasi
        var row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, G.restRoom ? new Color(0.3f, 0.6f, 0.4f, 0.25f) : Card);
        title.normal.textColor = Color.white;
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "Personel Dinlenme Odası", title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 90 * s), "Molalar iki kat hızlı biter, morali her gün daha yavaş düşer. Maaşlar her sabah gün sonu raporunda ödenir.", sub);
        var br = new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s);
        if (G.restRoom) Button(br, "Açık ✓", Grey, false);
        else if (Button(br, "Aç  " + Eco.TL(Eco.RestRoomCost), Green, G.CanPay(Eco.RestRoomCost))) G.BuyRestRoom();
        y += rh;

        sub.normal.textColor = new Color(1f, 0.86f, 0.5f);
        GUI.Label(new Rect(10 * s, y + 4 * s, view.width, 50 * s), "İsimleri değiştirmek için kutuya dokunup yaz. Mutlu ve deneyimli çalışan daha hızlı çalışır.", sub);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        GUI.EndScrollView();
    }

    void HireRow(Rect row, string name, string desc, int cost, bool can, System.Action hire, float s)
    {
        G.Panel(row, Card);
        title.normal.textColor = Color.white;
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), name, title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 90 * s), desc, sub);
        if (Button(new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s), "İşe al  " + Eco.TL(cost), Green, can && G.CanPay(cost))) hire();
    }

    void StaffRow(Rect row, string role, StaffStats st, ref string edit, System.Action<string> rename, string desc, float s)
    {
        G.Panel(row, st.resting ? new Color(0.6f, 0.5f, 0.3f, 0.2f) : Card);
        title.normal.textColor = Color.white;
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), role + (st.resting ? "  ·  molada" : ""), title);
        // seviye, enerji, moral
        small.fontSize = Mathf.RoundToInt(19 * s);
        small.normal.textColor = new Color(1f, 0.86f, 0.42f);
        small.alignment = TextAnchor.MiddleLeft;
        float x = row.x + 22 * s, y = row.y + 56 * s;
        GUI.Label(new Rect(x, y, 120 * s, 26 * s), "Seviye " + st.Level, small);
        BarC(new Rect(x, y + 28 * s, 100 * s, 10 * s), st.LevelProgress, Gold);
        x += 135 * s;
        small.normal.textColor = Color.white;
        GUI.Label(new Rect(x, y, 160 * s, 26 * s), "Enerji", small);
        BarC(new Rect(x, y + 28 * s, 150 * s, 10 * s), st.energy, st.energy > 0.3f ? new Color(0.45f, 0.85f, 1f, 1f) : new Color(1f, 0.55f, 0.4f, 1f));
        x += 170 * s;
        GUI.Label(new Rect(x, y, 200 * s, 26 * s), "Moral: " + st.MoodWord, small);
        BarC(new Rect(x, y + 28 * s, 150 * s, 10 * s), st.morale, st.morale > 0.45f ? Green : st.morale > 0.25f ? Gold : new Color(1f, 0.45f, 0.4f, 1f));
        small.alignment = TextAnchor.MiddleCenter;
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 100 * s, row.width - 480 * s, 50 * s), desc + "  Maaş: " + Eco.TL(st.Wage) + "/gün", sub);

        DrawNameField(new Rect(row.xMax - 440 * s, row.y + 14 * s, 420 * s, 56 * s), ref edit, rename);
        bool full = st.morale >= 0.99f;
        if (Button(new Rect(row.xMax - 440 * s, row.y + 80 * s, 420 * s, 56 * s), full ? "Morali tam" : "İkramiye ver  " + Eco.TL(st.BonusCost), Gold, !full && G.CanPay(st.BonusCost)))
            G.StaffBonus(st);
    }

    void BarC(Rect r, float t, Color c)
    {
        GUI.color = U.UI(new Color(1, 1, 1, 0.15f));
        GUI.DrawTexture(r, Texture2D.whiteTexture);
        t = Mathf.Clamp01(t);
        GUI.color = U.UI(c);
        if (t > 0.01f) GUI.DrawTexture(new Rect(r.x, r.y, r.width * t, r.height), Texture2D.whiteTexture);
        GUI.color = Color.white;
    }

    void DrawNameField(Rect r, ref string val, System.Action<string> apply)
    {
        GUI.color = new Color(1, 1, 1, 0.95f);
        string nv = GUI.TextField(r, val ?? "", 16, field);
        GUI.color = Color.white;
        if (nv != val)
        {
            val = nv;
            if (!string.IsNullOrWhiteSpace(nv)) apply(nv.Trim());
        }
    }

    // ---------------- GELISTIRMELER ----------------
    void UpgradeTab(Rect b, float s)
    {
        float rh = 118 * s;
        var view = new Rect(0, 0, b.width - 30 * s, rh * Eco.Ups.Length + 10 * s);
        scroll = GUI.BeginScrollView(b, scroll, view);
        for (int i = 0; i < Eco.Ups.Length; i++)
        {
            var d = Eco.Ups[i];
            int lv = G.UpLevel(d.id);
            var row = new Rect(0, i * rh, view.width, rh - 12 * s);
            G.Panel(row, Card);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 520 * s, 44 * s), d.name, title);

            // seviye noktalari
            for (int k = 0; k < d.max; k++)
            {
                GUI.color = U.UI(k < lv ? Gold : new Color(1, 1, 1, 0.2f));
                GUI.DrawTexture(new Rect(row.x + 330 * s + k * 30 * s, row.y + 20 * s, 22 * s, 22 * s), U.CircleTex);
            }
            GUI.color = Color.white;

            string eff = Eco.Effect(d.id, lv) + (lv < d.max ? "  →  " + Eco.Effect(d.id, lv + 1) : "");
            sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width - 340 * s, 60 * s), d.desc + "\n" + eff, sub);

            var br = new Rect(row.xMax - 290 * s, row.y + 24 * s, 270 * s, 64 * s);
            if (lv >= d.max) Button(br, "Tamamlandı", Grey, false);
            else
            {
                int c = Eco.UpCost(d.id, lv);
                if (Button(br, (lv == 0 ? "Satın al  " : "Geliştir  ") + Eco.TL(c), Gold, G.CanPay(c))) G.BuyUpgrade(d.id);
            }
        }
        GUI.EndScrollView();
    }

    // ---------------- GOREVLER ----------------
    Vector2 questScroll;

    void QuestTab(Rect b, float s)
    {
        var reqs = StarExam.official < 5 ? StarExam.Requirements(StarExam.Target) : new System.Collections.Generic.List<StarExam.Req>();
        float examH = 150 * s + reqs.Count * 34 * s;
        float h = examH + 20 * s + 160 * s + 44 * s + Quests.daily.Count * 120 * s + 60 * s + Regulars.All.Length * 92 * s + 40 * s;
        var view = new Rect(0, 0, b.width - 30 * s, h);
        questScroll = GUI.BeginScrollView(b, questScroll, view);
        float y = 0;

        // Yildiz sinavi
        var row = new Rect(0, y, view.width, examH);
        G.Panel(row, new Color(0.55f, 0.45f, 1f, 0.14f));
        title.normal.textColor = new Color(1f, 0.86f, 0.42f);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), "Resmi yıldız belgesi: " + new string('★', StarExam.official) + new string('☆', 5 - StarExam.official), title);
        sub.normal.textColor = new Color(0.85f, 0.85f, 1f);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 340 * s, 60 * s),
            (StarExam.official < 5 ? StarExam.Target + " yıldız için şartlar. Sınavda gizli bir müfettiş gelir, memnun ayrılırsa belge alırsın (fiyatlar +%5)." : "") + "\n" + StarExam.Status, sub);
        float ry = row.y + 116 * s;
        foreach (var rq in reqs)
        {
            sub.normal.textColor = rq.ok ? new Color(0.55f, 0.95f, 0.55f) : new Color(1f, 0.7f, 0.6f);
            GUI.Label(new Rect(row.x + 34 * s, ry, row.width - 380 * s, 32 * s), (rq.ok ? "✓  " : "✗  ") + rq.text, sub);
            ry += 34 * s;
        }
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        if (StarExam.official < 5)
        {
            var br = new Rect(row.xMax - 290 * s, row.y + 30 * s, 270 * s, 64 * s);
            if (Button(br, "Sınava başvur", Gold, StarExam.CanApply)) { StarExam.Apply(); Toggle(); }
            small.fontSize = Mathf.RoundToInt(18 * s);
            small.normal.textColor = new Color(1f, 0.86f, 0.5f);
            GUI.Label(new Rect(br.x, br.yMax + 4 * s, br.width, 30 * s), "Ödül: " + Eco.TL(StarExam.Rewards[StarExam.Target]), small);
        }
        y += examH + 20 * s;

        // Ana gorev
        var q = Quests.Current;
        row = new Rect(0, y, view.width, 140 * s);
        G.Panel(row, new Color(1f, 0.78f, 0.25f, 0.12f));
        title.normal.textColor = new Color(1f, 0.86f, 0.42f);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 40 * s), "Ana görev " + Mathf.Min(Quests.storyIndex + 1, Quests.Line.Length) + "/" + Quests.Line.Length, title);
        title.normal.textColor = Color.white;
        if (q != null)
        {
            GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width - 340 * s, 40 * s), q.text, title);
            Bar(new Rect(row.x + 22 * s, row.y + 100 * s, row.width - 360 * s, 18 * s), (float)q.cur() / q.target, s);
            var br = new Rect(row.xMax - 290 * s, row.y + 38 * s, 270 * s, 64 * s);
            if (Quests.CurrentDone) { if (Button(br, "Ödülü al  " + Eco.TL(q.reward), Gold)) Quests.ClaimStory(); }
            else Button(br, "Ödül  " + Eco.TL(q.reward), Grey, false);
        }
        else GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width, 40 * s), "Tüm ana görevler tamamlandı!", title);
        y += 160 * s;

        sub.normal.textColor = new Color(1f, 0.86f, 0.5f);
        GUI.Label(new Rect(10 * s, y, view.width, 40 * s), "GÜNÜN HEDEFLERİ · Gün " + G.dayNight.day + " (her sabah 06:00'da yenilenir)", sub);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        y += 44 * s;
        foreach (var d in Quests.daily)
        {
            row = new Rect(0, y, view.width, 108 * s);
            G.Panel(row, d.claimed ? new Color(0.3f, 0.6f, 0.4f, 0.2f) : Card);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), d.Text, title);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, 300 * s, 30 * s), d.Cur + " / " + d.target, sub);
            Bar(new Rect(row.x + 22 * s, row.y + 80 * s, row.width - 360 * s, 14 * s), (float)d.Cur / d.target, s);
            var br = new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s);
            if (d.claimed) Button(br, "Alındı ✓", Grey, false);
            else if (d.Done) { if (Button(br, "Ödülü al  " + Eco.TL(d.reward), Gold)) Quests.ClaimDaily(d); }
            else Button(br, "Ödül  " + Eco.TL(d.reward), Grey, false);
            y += 120 * s;
        }

        // Mudavimler
        y += 10 * s;
        sub.normal.textColor = new Color(1f, 0.86f, 0.5f);
        GUI.Label(new Rect(10 * s, y, view.width, 40 * s), "MÜDAVİM MİSAFİRLER · Memnun ayrılırlarsa hikayeleri ilerler", sub);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        y += 46 * s;
        for (int i = 0; i < Regulars.All.Length; i++)
        {
            var d = Regulars.All[i];
            int v = Regulars.visits[i];
            row = new Rect(0, y, view.width, 80 * s);
            G.Panel(row, v >= 3 ? new Color(0.3f, 0.6f, 0.4f, 0.22f) : Card);
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(row.x + 22 * s, row.y + 4 * s, 500 * s, 40 * s), v > 0 ? d.name : "???", title);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 42 * s, row.width - 300 * s, 34 * s), v > 0 ? d.title : "Henüz tanışmadın", sub);
            small.fontSize = Mathf.RoundToInt(30 * s);
            small.normal.textColor = new Color(1f, 0.45f, 0.6f);
            GUI.Label(new Rect(row.xMax - 280 * s, row.y + 6 * s, 260 * s, 44 * s), new string('♥', v) + new string('♡', 3 - v), small);
            small.fontSize = Mathf.RoundToInt(18 * s);
            small.normal.textColor = new Color(1f, 0.86f, 0.5f);
            GUI.Label(new Rect(row.xMax - 280 * s, row.y + 46 * s, 260 * s, 30 * s), v >= 3 ? "Hikaye tamam" : "Ziyaret " + v + "/3", small);
            y += 92 * s;
        }
        GUI.EndScrollView();
    }

    void Bar(Rect r, float t, float s)
    {
        G.Panel(r, new Color(1, 1, 1, 0.12f));
        t = Mathf.Clamp01(t);
        if (t > 0.02f) G.Panel(new Rect(r.x, r.y, r.width * t, r.height), new Color(0.45f, 0.9f, 0.5f, 1f));
    }

    // ---------------- HIKAYE VE ZINCIR ----------------
    Vector2 storyScroll;

    void StoryTab(Rect b, float s)
    {
        var goals = Story.Goals();
        float storyH = !Story.started || Story.Finished ? 190 * s : 200 * s + goals.Count * 70 * s + (Story.chapter == 1 ? 76 * s : 0);
        float chainH = 56 * s + Chain.Cities.Length * 182 * s;
        var view = new Rect(0, 0, b.width - 30 * s, storyH + 24 * s + chainH);
        storyScroll = GUI.BeginScrollView(b, storyScroll, view);
        float y = 0;
        int switchTo = -1;

        var row = new Rect(0, y, view.width, storyH);
        G.Panel(row, new Color(1f, 0.6f, 0.75f, 0.13f));
        title.normal.textColor = new Color(1f, 0.75f, 0.85f);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), "ELİF'İN OTELİ · Hikâye modu", title);
        sub.normal.textColor = new Color(0.9f, 0.88f, 0.95f);
        if (!Story.started)
        {
            GUI.Label(new Rect(row.x + 22 * s, row.y + 56 * s, row.width - 340 * s, 120 * s),
                "Anneanne Saadet'in otelini yeniden canlandır, rakibin Kaan Bey'e karşı yarış, Bodrum ve Kapadokya'da yeni oteller aç. 8 bölüm, her bölümde ödül. Hedefler otelinin büyüklüğüne göre ayarlanır.", sub);
            if (Button(new Rect(row.xMax - 290 * s, row.y + 60 * s, 270 * s, 64 * s), "Hikâyeyi başlat", Gold)) Story.Begin();
        }
        else if (Story.Finished)
        {
            GUI.Label(new Rect(row.x + 22 * s, row.y + 56 * s, row.width - 44 * s, 120 * s),
                "Hikâye tamamlandı! Otel İmparatoriçesi " + Story.Ad + ". Anneanne Saadet gurur duyardı. Otellerin seni bekliyor.", sub);
        }
        else
        {
            int ch = Story.chapter;
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width - 340 * s, 40 * s), "Bölüm " + (ch + 1) + "/" + Story.Count + " · " + Story.Titles[ch], title);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 96 * s, row.width - 340 * s, 90 * s), Story.Summaries[ch], sub);
            float gy = row.y + 190 * s;
            foreach (var g in goals)
            {
                int cur = Mathf.Min(g.cur(), g.target);
                sub.normal.textColor = g.Done ? new Color(0.55f, 0.95f, 0.55f) : new Color(0.9f, 0.9f, 0.95f);
                GUI.Label(new Rect(row.x + 34 * s, gy, row.width - 360 * s, 32 * s), (g.Done ? "✓  " : "•  ") + g.text + "   " + cur + " / " + g.target, sub);
                Bar(new Rect(row.x + 34 * s, gy + 36 * s, row.width - 380 * s, 14 * s), (float)cur / g.target, s);
                gy += 70 * s;
            }
            if (ch == 1 && !Story.debtPaid)
            {
                if (Button(new Rect(row.x + 34 * s, gy, 360 * s, 60 * s), "Borcu öde  " + Eco.TL(Story.Debt), Gold, G.CanPay(Story.Debt))) Story.PayDebt();
            }
            var cb = new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s);
            if (Button(cb, Story.Ready ? "Bölümü bitir\n+" + Eco.TL(Story.Reward) : "Ödül " + Eco.TL(Story.Reward), Story.Ready ? Gold : Grey, Story.Ready)) Story.Complete();
        }
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        y += storyH + 24 * s;

        // Otel zinciri
        sub.normal.textColor = new Color(1f, 0.86f, 0.5f);
        GUI.Label(new Rect(10 * s, y, view.width, 44 * s), "OTEL ZİNCİRİ · " + Chain.Count + " otel" + (Chain.Count > 1 ? " · tüm otellerde fiyatlar +%" + (5 * (Chain.Count - 1)) : " · her yeni otel tüm otellerde fiyatları %5 artırır"), sub);
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);
        y += 56 * s;
        for (int i = 0; i < Chain.Cities.Length; i++)
        {
            int ci = i;
            row = new Rect(0, y, view.width, 170 * s);
            bool own = Chain.Owns(i), here = i == Chain.cur;
            G.Panel(row, here ? new Color(0.3f, 0.6f, 0.4f, 0.25f) : Card);
            title.normal.textColor = Color.white;
            GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), Chain.Cities[i] + (own ? " · " + Chain.HotelName(i) : "") + (here ? "   (buradasın)" : ""), title);
            if (own)
            {
                GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 100 * s),
                    "Gün " + Chain.Day(i) + " · " + Chain.Rooms(i) + " oda · Kasa " + Eco.TL(Chain.Money(i)) + "\n" + Chain.CityDesc[i], sub);
                if (!here)
                {
                    if (Button(new Rect(row.xMax - 290 * s, row.y + 18 * s, 270 * s, 60 * s), "Bu otele git", Green)) switchTo = ci;
                    int amt = Mathf.Max(100, Mathf.RoundToInt(G.money * 0.1f / 100f) * 100);
                    if (Button(new Rect(row.xMax - 290 * s, row.y + 90 * s, 270 * s, 60 * s), "Para gönder  " + Eco.TL(amt), new Color(0.55f, 0.75f, 0.95f, 1f), G.money >= amt)) Chain.Send(ci, amt);
                }
                else Button(new Rect(row.xMax - 290 * s, row.y + 18 * s, 270 * s, 60 * s), "Şu an burada", Grey, false);
            }
            else
            {
                string req = Chain.Requirement(i);
                GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 110 * s), Chain.CityDesc[i] + (req != null ? "\nŞart: " + req : ""), sub);
                if (Button(new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s), "Aç  " + Eco.TL(Chain.Cost[i]), Green, Chain.CanBuy(i))) Chain.Buy(ci);
            }
            y += 182 * s;
        }
        GUI.EndScrollView();
        if (switchTo >= 0) Chain.Switch(switchTo);
    }

    // ---------------- AYARLAR ----------------
    void SettingsTab(Rect b, float s)
    {
        float rh = 112 * s;
        var view = new Rect(0, 0, b.width - 30 * s, rh * 10 + 40 * s);
        scroll = GUI.BeginScrollView(b, scroll, view);
        float y = 0;
        sub.normal.textColor = new Color(0.8f, 0.83f, 0.9f);

        var row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "Otelin adı", title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), "Girişteki tabelada ve ekranın sol üstünde görünür.", sub);
        DrawNameField(new Rect(row.xMax - 560 * s, row.y + 22 * s, 540 * s, 64 * s), ref hotelEdit, n => G.SetHotelName(n));
        y += rh;

        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "Müdürün adı", title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), "Senin karakterinin başında görünür.", sub);
        DrawNameField(new Rect(row.xMax - 560 * s, row.y + 22 * s, 540 * s, 64 * s), ref managerEdit, n => G.SetManager(G.managerVariant, n));
        y += rh;

        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "Müdürün görünüşü", title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), "12 farklı karakterden birini seç.", sub);
        if (Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 80 * s, 64 * s), "◀", Gold)) { G.SetManager(G.managerVariant - 1, G.managerName); G.Save(); }
        small.normal.textColor = Color.white;
        small.fontSize = Mathf.RoundToInt(24 * s);
        GUI.Label(new Rect(row.xMax - 205 * s, row.y + 22 * s, 100 * s, 64 * s), (G.managerVariant + 1) + " / 12", small);
        if (Button(new Rect(row.xMax - 100 * s, row.y + 22 * s, 80 * s, 64 * s), "▶", Gold)) { G.SetManager(G.managerVariant + 1, G.managerName); G.Save(); }
        y += rh;

        // Iki kisilik oyun
        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, G.coop ? new Color(0.3f, 0.5f, 0.8f, 0.25f) : Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "İki kişilik oyun", title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 50 * s), "Aynı bilgisayarda: 1. oyuncu WASD, 2. oyuncu ok tuşları. Kamera ikinizi birden gösterir.", sub);
        if (Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), G.coop ? "Açık" : "Kapalı", G.coop ? Green : Grey, true)) { G.SetCoop(!G.coop); G.Save(); }
        y += rh;
        if (G.coop)
        {
            row = new Rect(0, y, view.width, rh - 12 * s);
            G.Panel(row, Card);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "2. oyuncunun adı", title);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), "Mavi halkalı karakterin başında görünür.", sub);
            DrawNameField(new Rect(row.xMax - 560 * s, row.y + 22 * s, 540 * s, 64 * s), ref p2Edit, n => G.SetPlayer2(G.p2Variant, n));
            y += rh;

            row = new Rect(0, y, view.width, rh - 12 * s);
            G.Panel(row, Card);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "2. oyuncunun görünüşü", title);
            GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), "12 farklı karakterden birini seç.", sub);
            if (Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 80 * s, 64 * s), "◀", Gold)) { G.SetPlayer2(G.p2Variant - 1, G.p2Name); G.Save(); }
            small.normal.textColor = Color.white;
            small.fontSize = Mathf.RoundToInt(24 * s);
            GUI.Label(new Rect(row.xMax - 205 * s, row.y + 22 * s, 100 * s, 64 * s), (G.p2Variant + 1) + " / 12", small);
            if (Button(new Rect(row.xMax - 100 * s, row.y + 22 * s, 80 * s, 64 * s), "▶", Gold)) { G.SetPlayer2(G.p2Variant + 1, G.p2Name); G.Save(); }
            y += rh;
        }

        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 30 * s, 600 * s, 44 * s), "Müzik", title);
        if (Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), G.music ? "Açık" : "Kapalı", G.music ? Green : Grey, true)) { G.SetMusic(!G.music); G.Save(); }
        y += rh;

        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 30 * s, 600 * s, 44 * s), "Ses efektleri", title);
        if (Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), G.sound ? "Açık" : "Kapalı", G.sound ? Green : Grey, true)) { G.SetSound(!G.sound); G.Save(); }
        y += rh;

        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "Tablolardaki fotoğraflar", title);
        int pc = Photos.All.Count;
        GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 40 * s, 56 * s),
            (pc > 0 ? pc + " fotoğraf kullanılıyor. " : "Henüz fotoğraf yok. ") + "07_Otel_Oyunu/Fotograflar klasörüne JPG/PNG koy, oyunu yeniden başlat.", sub);
        y += rh;

        row = new Rect(0, y, view.width, rh - 12 * s);
        G.Panel(row, Card);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), "Yeni oyun", title);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 50 * s), "Tüm ilerleme silinir ve otel baştan başlar.", sub);
        if (Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), resetConfirm > 0 ? "Emin misin?" : "Baştan başla", new Color(0.95f, 0.45f, 0.4f), true))
        {
            if (resetConfirm > 0) G.ResetGame();
            else resetConfirm = 3f;
        }
        GUI.EndScrollView();
    }
}
