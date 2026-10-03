// Oyun ici menu: Otel (odalar), Personel, Gelistirmeler, Ayarlar
// (Unity: Menu.cs — GameManager "this.menu = new Menu()" ile kurar)

const MenuThemeFans = ['Herkese uygun', 'Turistler sever', 'Aileler sever', 'İş insanları sever', 'Balayı çiftleri sever'];

class Menu extends Behaviour {
  // Dosya seçici: seçilen fotoğraflar kaydedilir, tablolar yenilensin diye sayfa yeniden açılır
  static PickPhotos() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = async () => {
      if (!inp.files || !inp.files.length) return;
      const n = await Photos.AddFromFiles(inp.files);
      if (n > 0) { GameManager.I.Save(); Store.Save(); location.reload(); }
    };
    inp.click();
  }
  static Tabs = ['Otel', 'Personel', 'Geliştirmeler', 'Dekor', 'Görevler', 'Hikâye', 'Ayarlar'];
  static Dark = C(0.11, 0.13, 0.21, 1);
  static Card = C(1, 1, 1, 0.06);
  static Green = C(0.35, 0.8, 0.45, 1);
  static Grey = C(0.45, 0.47, 0.52, 1);
  static Gold = C(1, 0.78, 0.25, 1);
  static ThemeFans = MenuThemeFans;

  constructor() {
    super();
    this.open = false;
    this.tab = 0;
    this.scroll = { x: 0, y: 0 };
    this.staffScroll = { x: 0, y: 0 };
    this.questScroll = { x: 0, y: 0 };
    this.storyScroll = { x: 0, y: 0 };
    this.resetConfirm = 0;
    this.hotelEdit = '';
    this.recepEdit = '';
    this.baristaEdit = '';
    this.waiterEdit = '';
    this.therapistEdit = '';
    this.managerEdit = '';
    this.p2Edit = '';
    this.cleanerEdit = new Array(8).fill(null);
    this.title = null; this.sub = null; this.btn = null; this.tabSt = null; this.field = null; this.small = null;
    this._escPrev = false;
    RegisterGUI(0, () => this.OnGUI());
  }

  get G() { return GameManager.I; }

  Toggle() {
    const G = this.G;
    this.open = !this.open;
    if (this.open) {
      this.hotelEdit = G.hotelName;
      this.recepEdit = G.reception.staffName;
      this.baristaEdit = G.cafe.baristaName;
      this.waiterEdit = G.restaurant.waiterName;
      this.therapistEdit = G.spa.therapistName;
      this.managerEdit = G.managerName;
      this.p2Edit = G.p2Name;
      for (let i = 0; i < G.cleaners.length && i < this.cleanerEdit.length; i++) this.cleanerEdit[i] = G.cleaners[i].staffName;
      this.resetConfirm = 0;
    }
    else G.Save();
  }

  Update() {
    if (this.resetConfirm > 0) this.resetConfirm -= Time.unscaledDeltaTime;
    // Esc: bu karede basıldıysa (wasPressedThisFrame)
    const esc = Input.keys.has('Escape');
    if (this.open && esc && !this._escPrev) this.Toggle();
    this._escPrev = esc;
  }

  Styles(s) {
    if (this.title == null) {
      this.title = new GUIStyle(GUI.skin.label, { fontStyle: FontStyle.Bold, alignment: TextAnchor.MiddleLeft });
      this.sub = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.UpperLeft, wordWrap: true });
      this.small = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
      this.btn = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
      this.tabSt = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
      this.field = new GUIStyle(GUI.skin.textField, { alignment: TextAnchor.MiddleLeft });
    }
    this.title.fontSize = Mathf.RoundToInt(28 * s);
    this.title.normal.textColor = Col.white;
    this.sub.fontSize = Mathf.RoundToInt(21 * s);
    this.sub.normal.textColor = C(0.8, 0.83, 0.9);
    this.small.fontSize = Mathf.RoundToInt(20 * s);
    this.btn.fontSize = Mathf.RoundToInt(24 * s);
    this.tabSt.fontSize = Mathf.RoundToInt(19 * s);
    this.field.fontSize = Mathf.RoundToInt(26 * s);
    this.field.padding = { left: Mathf.RoundToInt(14 * s), right: 8, top: 4, bottom: 4 };
  }

  Button(r, text, c, enabled = true) {
    GUI.Panel(r, enabled ? c : Menu.Grey);
    this.btn.normal.textColor = enabled ? C(0.12, 0.1, 0.08) : C(0.85, 0.85, 0.88);
    const click = GUI.Button(r, text, this.btn);
    if (click && enabled) Sfx.Play('pop', 0.5);
    return click && enabled;
  }

  // ---------------- dar ekran yardımcıları ----------------
  // Sarılmış yazının yüksekliği (GUI._text ile aynı satır kırma kuralı)
  TH(text, st, w) {
    const ctx = GUI.ctx, fs = Math.max(1, st.fontSize || 14);
    ctx.font = `${st.fontStyle === FontStyle.Bold ? '800' : '600'} ${fs}px ${UI_FONT}`;
    const pad = st.padding || { left: 0, right: 0 };
    w -= (pad.left || 0) + (pad.right || 0);
    let n = 0;
    for (const para of String(text ?? '').split('\n')) {
      n++;
      if (!st.wordWrap) continue;
      let cur = '';
      for (const wd of para.split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { n++; cur = wd; } else cur = t; }
    }
    return n * fs * 1.2 + 2;
  }

  // Yazıyı ölçüp çizer, yüksekliğini döndürür
  Para(x, y, w, text, st, min = 0) {
    const h = Math.max(min, this.TH(text, st, w));
    GUI.Label(new Rect(x, y, w, h), text, st);
    return h;
  }

  // Dar ekran satırı: başlık, tam genişlikte açıklama, altında ctrlH yüksekliğinde denetim alanı.
  // Paneli çizer; denetim alanını this.cx/cy/cw'ye yazar, satır adımını (boşluk dahil) döndürür.
  // rr: başlığın sağında ayrılan genişlik (kalpler, noktalar vb.)
  NRow(x, y, w, panel, name, desc, ctrlH, s, rr = 0) {
    const tw = w - 44 * s;
    const nh = name != null ? Math.max(44 * s, this.TH(name, this.title, tw - rr)) : 0;
    const dh = desc ? this.TH(desc, this.sub, tw) : 0;
    const h = 8 * s + nh + (desc ? dh + 6 * s : 0) + (ctrlH > 0 ? ctrlH + 6 * s : 0) + 10 * s;
    GUI.Panel(new Rect(x, y, w, h), panel);
    if (name != null) GUI.Label(new Rect(x + 22 * s, y + 8 * s, tw - rr, nh), name, this.title);
    let cy = y + 8 * s + nh;
    if (desc) { GUI.Label(new Rect(x + 22 * s, cy, tw, dh), desc, this.sub); cy += dh + 6 * s; }
    this.cx = x + 22 * s; this.cy = cy; this.cw = tw;
    return h + 12 * s;
  }

  // Dar ekranda kaydırma alanı yüksekliği bir önceki karede ölçülen içerikten gelir
  NView(key, b, s) {
    if (!this._vh) this._vh = {};
    return new Rect(0, 0, b.width - 30 * s, this._vh[key] ?? 20000);
  }

  OnGUI() {
    if (!this.open) return;
    const G = this.G;
    if (!G) return;
    GUI.depth = 0;
    const s = G.UIScale;
    this.Styles(s);

    // tam ekran menü: alttaki arayüze tıklama geçmesin
    GUI.Block();

    // arka plani karart
    GUI.color = C(0, 0, 0, 0.45);
    GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), 'white');
    GUI.color = Col.white;

    const w = Mathf.Min(Screen.width - 40 * s, 1150 * s);
    // dar ekran (telefon dikey): satırlar alt alta dizilir, menü ekranın boyunu kullanır
    const N = this.narrow = w < 900 * s;
    const h = N ? Screen.height - 140 * s : Mathf.Min(Screen.height - 140 * s, 840 * s);
    const P = new Rect((Screen.width - w) / 2, 120 * s, w, h);
    GUI.Panel(P, Menu.Dark);

    // sekmeler (dar ekranda iki sıra, 4 sütun; ✕ ikinci sıranın sonunda)
    const Tabs = Menu.Tabs;
    const tw = N ? (w - 30 * s) / 4 : (w - 140 * s) / Tabs.length;
    for (let i = 0; i < Tabs.length; i++) {
      const tr = N ? new Rect(P.x + 20 * s + (i % 4) * tw, P.y + 18 * s + Math.floor(i / 4) * 64 * s, tw - 10 * s, 56 * s)
        : new Rect(P.x + 20 * s + i * tw, P.y + 18 * s, tw - 10 * s, 64 * s);
      GUI.Panel(tr, i === this.tab ? Menu.Gold : Menu.Card);
      this.tabSt.normal.textColor = i === this.tab ? C(0.2, 0.13, 0.05) : Col.white;
      if (GUI.Button(tr, Tabs[i], this.tabSt)) { this.tab = i; this.scroll = { x: 0, y: 0 }; Sfx.Play('pop', 0.4); }
    }
    const xr = N ? new Rect(P.x + 20 * s + 3 * tw, P.y + 18 * s + 64 * s, tw - 10 * s, 56 * s) : new Rect(P.xMax - 100 * s, P.y + 18 * s, 80 * s, 64 * s);
    if (this.Button(xr, '✕', C(0.95, 0.45, 0.4))) { this.Toggle(); return; }

    const top = N ? 156 * s : 100 * s;
    const body = new Rect(P.x + 20 * s, P.y + top, w - 40 * s, h - top - 20 * s);
    switch (this.tab) {
      case 0: this.HotelTab(body, s); break;
      case 1: this.StaffTab(body, s); break;
      case 2: this.UpgradeTab(body, s); break;
      case 3: this.DecorTab(body, s); break;
      case 4: this.QuestTab(body, s); break;
      case 5: this.StoryTab(body, s); break;
      case 6: this.SettingsTab(body, s); break;
    }
  }

  // ---------------- OTEL ----------------
  HotelTab(b, s) {
    if (this.narrow) { this.HotelTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub, btn = this.btn, small = this.small;
    const Gold = Menu.Gold, Green = Menu.Green, Grey = Menu.Grey, Card = Menu.Card;
    const rh = 112 * s;
    const areaRows = 6;
    const priceH = 170 * s;
    const view = new Rect(0, 0, b.width - 30 * s, priceH + rh * (G.rooms.length + areaRows) + 60 * s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);

    // Fiyat politikasi
    const pr = new Rect(0, 0, view.width, priceH - 12 * s);
    GUI.Panel(pr, C(1, 0.78, 0.25, 0.1));
    title.normal.textColor = Col.white;
    GUI.Label(new Rect(pr.x + 22 * s, pr.y + 8 * s, 600 * s, 44 * s), 'Fiyat politikası: ' + Pricing.Names[Pricing.policy], title);
    GUI.Label(new Rect(pr.x + 22 * s, pr.y + 52 * s, pr.width - 44 * s, 30 * s), Pricing.Desc[Pricing.policy], sub);
    const pbw = (pr.width - 44 * s - 3 * 12 * s) / 4;
    for (let k = 0; k < 4; k++) {
      const pbr = new Rect(pr.x + 22 * s + k * (pbw + 12 * s), pr.y + 92 * s, pbw, 60 * s);
      const sel = Pricing.policy === k;
      if (sel) { GUI.Panel(pbr, Gold); btn.normal.textColor = C(0.12, 0.1, 0.08); GUI.Label(pbr, Pricing.Names[k] + ' ✓', btn); }
      else if (this.Button(pbr, Pricing.Names[k], C(0.55, 0.75, 0.95, 1))) G.SetPricing(k);
    }
    GUI.BeginGroup(new Rect(0, priceH, view.width, view.height - priceH));

    // Alanlar
    this.AreaRow(new Rect(0, 0, view.width, rh - 12 * s), 'Kafe', 'Odadan çıkan misafirler kahve alır, kafede oturur. Lobinin doğusuna kurulur.',
      G.cafe.Open, Eco.CafeCost, () => G.OpenCafe(), s);
    this.AreaRow(new Rect(0, rh, view.width, rh - 12 * s), 'Havuz', 'Misafirler çıkışta yüzmeye gider ve ücret bırakır. Otelin batısına kurulur.',
      G.pool.Open, Eco.PoolCost, () => G.OpenPool(), s);
    this.AreaRow(new Rect(0, rh * 2, view.width, rh - 12 * s), 'Restoran', 'Misafirler çıkışta yemek yer. Mutfaktan tabakları alıp masalara götür. Kafenin arkasına kurulur.',
      G.restaurant.Open, Eco.RestaurantCost, () => G.OpenRestaurant(), s);
    this.AreaRow(new Rect(0, rh * 3, view.width, rh - 12 * s), 'Spa', 'Misafirler çıkışta masaj, manikür ve jakuzi keyfi yapar. Restoranın doğusuna kurulur.',
      G.spa.Open, Eco.SpaCost, () => G.OpenSpa(), s);
    this.AreaRow(new Rect(0, rh * 4, view.width, rh - 12 * s), 'Yeni Kanat', 'Doğuya 4 odalı yeni bir bina (Oda 107-110).',
      G.wingOpen, Eco.WingCost, () => G.OpenWing(), s);
    this.AreaRow(new Rect(0, rh * 5, view.width, rh - 12 * s), '2. Kat', 'Asansörle çıkılan yeni kat: 6 oda (201-206). Lobideki asansörde bekle, yukarı çık.',
      G.floor2Open, Eco.Floor2Cost, () => G.OpenFloor2(), s);

    let y0 = rh * areaRows + 10 * s;
    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, y0, 400 * s, 40 * s), 'ODALAR', sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    y0 += 44 * s;

    const next = G.NextLockedRoom();
    for (let i = 0; i < G.rooms.length; i++) {
      const r = G.rooms[i];
      const row = new Rect(0, y0 + i * rh, view.width, rh - 12 * s);
      GUI.Panel(row, Card);
      const stars = r.Unlocked ? '★'.repeat(Math.max(0, r.level)) + '☆'.repeat(Math.max(0, 3 - r.level)) : '';
      title.normal.textColor = Col.white;
      GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 520 * s, 44 * s), 'Oda ' + r.Number + '   ' + stars, title);
      const info = this.RoomInfo(i);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 560 * s, 56 * s), info, sub);

      const br = new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s);
      if (r.IsSuitePart) {
        this.Button(br, 'Süitin parçası', Grey, false);
        continue;
      }
      if (r.Unlocked) this.RoomTypeButtons(i, new Rect(row.xMax - 520 * s, row.y + 6 * s, 220 * s, 42 * s), new Rect(row.xMax - 520 * s, row.y + 52 * s, 220 * s, 42 * s));
      this.RoomMainButton(i, br, next);
    }
    GUI.EndGroup();
    GUI.EndScrollView();
  }

  RoomInfo(i) {
    const r = this.G.rooms[i];
    let info;
    if (!r.Unlocked) info = 'Kilitli · açılınca gecelik ' + Eco.TL(Eco.NightPrice(i, 1));
    else if (r.IsSuitePart) info = 'Oda ' + r.suiteMain.Number + " Başkanlık Süiti'nin salonu";
    else {
      info = (r.IsSuite ? 'Başkanlık Süiti' : Eco.LevelNames[r.level] + (r.kind > 0 ? ' ' + RoomKinds.Short[r.kind] : '')) + ' · gecelik ' + Eco.TL(r.Price) + ' · bahşiş ' + Eco.TL(r.Tip);
      if (r.level < 3) info += '\nSonraki: ' + Eco.LevelNames[r.level + 1] + ' · gecelik ' + Eco.TL(Mathf.RoundToInt(Eco.NightPrice(i, r.level + 1) * RoomKinds.PriceMul(r.kind)));
    }
    return info;
  }

  RoomTypeButtons(i, tb, kb) {
    const r = this.G.rooms[i];
    const idx = i;
    this.small.normal.textColor = C(0.12, 0.1, 0.08);
    if (this.Button(tb, 'Tema: ' + Themes.Names[r.theme], r.theme > 0 ? C(0.95, 0.6, 0.8, 1) : C(0.6, 0.75, 0.95, 1))) this.ThemeChooser(idx);
    const kn = r.IsSuite ? 'Süit' : r.kind === 0 ? 'Klasik' : RoomKinds.Short[r.kind];
    if (this.Button(kb, 'Tip: ' + kn, r.kind > 0 ? C(1, 0.82, 0.45, 1) : C(0.6, 0.75, 0.95, 1))) this.KindChooser(idx);
  }

  RoomMainButton(i, br, next) {
    const G = this.G, r = G.rooms[i], Grey = Menu.Grey;
    if (!r.Unlocked) {
      if (i >= Eco.Floor2Start && !G.floor2Open) this.Button(br, 'Önce 2. Kat', Grey, false);
      else if (i >= Eco.WingStart && i < Eco.Floor2Start && !G.wingOpen) this.Button(br, 'Önce Yeni Kanat', Grey, false);
      else if (i === next) {
        const c = Eco.RoomUnlock[i];
        if (this.Button(br, 'Aç  ' + Eco.TL(c), Menu.Green, G.CanPay(c))) G.UnlockRoom(i);
      }
      else this.Button(br, 'Önce Oda ' + G.rooms[next].Number, Grey, false);
    }
    else if (r.level < 3) {
      const c = Eco.UpgradeCost(i, r.level + 1);
      if (this.Button(br, 'Yükselt  ' + Eco.TL(c), Menu.Gold, G.CanPay(c))) G.UpgradeRoom(i);
    }
    else this.Button(br, 'En üst seviye', Grey, false);
  }

  // dar ekran: fiyat düğmeleri 2x2, satırlarda düğmeler yazının altında
  HotelTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub, btn = this.btn;
    const Gold = Menu.Gold, Grey = Menu.Grey, Card = Menu.Card;
    const view = this.NView('hotel', b, s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    const W = view.width;
    let y = 0;

    // Fiyat politikasi
    title.normal.textColor = Col.white;
    y += this.NRow(0, y, W, C(1, 0.78, 0.25, 0.1), 'Fiyat politikası: ' + Pricing.Names[Pricing.policy], Pricing.Desc[Pricing.policy], 130 * s, s);
    const pbw = (this.cw - 12 * s) / 2;
    for (let k = 0; k < 4; k++) {
      const pbr = new Rect(this.cx + (k % 2) * (pbw + 12 * s), this.cy + Math.floor(k / 2) * 70 * s, pbw, 60 * s);
      const sel = Pricing.policy === k;
      if (sel) { GUI.Panel(pbr, Gold); btn.normal.textColor = C(0.12, 0.1, 0.08); GUI.Label(pbr, Pricing.Names[k] + ' ✓', btn); }
      else if (this.Button(pbr, Pricing.Names[k], C(0.55, 0.75, 0.95, 1))) G.SetPricing(k);
    }

    // Alanlar
    const area = (name, desc, open, cost, buy) => {
      title.normal.textColor = Col.white;
      y += this.NRow(0, y, W, open ? C(0.3, 0.6, 0.4, 0.25) : Card, name, desc, 60 * s, s);
      const br = new Rect(this.cx, this.cy, this.cw, 60 * s);
      if (open) this.Button(br, 'Açık ✓', Grey, false);
      else if (this.Button(br, 'Aç  ' + Eco.TL(cost), Menu.Green, G.CanPay(cost))) buy();
    };
    area('Kafe', 'Odadan çıkan misafirler kahve alır, kafede oturur. Lobinin doğusuna kurulur.', G.cafe.Open, Eco.CafeCost, () => G.OpenCafe());
    area('Havuz', 'Misafirler çıkışta yüzmeye gider ve ücret bırakır. Otelin batısına kurulur.', G.pool.Open, Eco.PoolCost, () => G.OpenPool());
    area('Restoran', 'Misafirler çıkışta yemek yer. Mutfaktan tabakları alıp masalara götür. Kafenin arkasına kurulur.', G.restaurant.Open, Eco.RestaurantCost, () => G.OpenRestaurant());
    area('Spa', 'Misafirler çıkışta masaj, manikür ve jakuzi keyfi yapar. Restoranın doğusuna kurulur.', G.spa.Open, Eco.SpaCost, () => G.OpenSpa());
    area('Yeni Kanat', 'Doğuya 4 odalı yeni bir bina (Oda 107-110).', G.wingOpen, Eco.WingCost, () => G.OpenWing());
    area('2. Kat', 'Asansörle çıkılan yeni kat: 6 oda (201-206). Lobideki asansörde bekle, yukarı çık.', G.floor2Open, Eco.Floor2Cost, () => G.OpenFloor2());

    y += 4 * s;
    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, y, 400 * s, 40 * s), 'ODALAR', sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    y += 44 * s;

    const next = G.NextLockedRoom();
    for (let i = 0; i < G.rooms.length; i++) {
      const r = G.rooms[i];
      const stars = r.Unlocked ? '★'.repeat(Math.max(0, r.level)) + '☆'.repeat(Math.max(0, 3 - r.level)) : '';
      const types = r.Unlocked && !r.IsSuitePart;
      title.normal.textColor = Col.white;
      y += this.NRow(0, y, W, Card, 'Oda ' + r.Number + '   ' + stars, this.RoomInfo(i), (types ? 60 * s : 0) + 60 * s, s);
      let cy = this.cy;
      if (types) {
        const hw = (this.cw - 12 * s) / 2;
        this.RoomTypeButtons(i, new Rect(this.cx, cy, hw, 50 * s), new Rect(this.cx + hw + 12 * s, cy, hw, 50 * s));
        cy += 60 * s;
      }
      const br = new Rect(this.cx, cy, this.cw, 60 * s);
      if (r.IsSuitePart) this.Button(br, 'Süitin parçası', Grey, false);
      else this.RoomMainButton(i, br, next);
    }
    this._vh.hotel = y + 20 * s;
    GUI.EndScrollView();
  }

  KindChooser(i) {
    const G = this.G;
    const r = G.rooms[i];
    const p = Popups.Show('Oda ' + r.Number + ' tipi',
      'Tip, fiyatı ve hangi misafirin çok mutlu olacağını belirler. Resepsiyon misafiri ona uygun tipteki boş odaya yerleştirir.\n' + RoomKinds.Desc[r.IsSuite ? RoomKinds.Suit : r.kind], 'ODA TİPİ');
    if (!r.IsSuite)
      for (let k = 0; k < RoomKinds.Selectable; k++) {
        const kk = k;
        const sel = r.kind === k;
        const c = RoomKinds.Cost(i, k);
        const lvOk = r.level >= RoomKinds.MinLevel(k);
        const label = RoomKinds.Names[k] + ' · ' + RoomKinds.Fans(k) + (sel ? '   (seçili)' : !lvOk ? '   (en az ' + Eco.LevelNames[RoomKinds.MinLevel(k)] + ')' : c > 0 ? '   ' + Eco.TL(c) : '');
        p.Add(label, () => GameManager.I.BuyKind(i, kk), sel ? Menu.Grey : Menu.Green, !sel && lvOk && G.CanPay(c));
      }
    if (!r.IsSuite && i + 1 < G.rooms.length && RoomKinds.SameSection(i, i + 1) && !G.rooms[i + 1].IsSuite) {
      const sc = RoomKinds.SuiteCost(i);
      const ok = G.CanSuite(i);
      p.Add('Başkanlık Süiti: Oda ' + G.rooms[i + 1].Number + ' ile birleştir   ' + (ok ? Eco.TL(sc) : '(ikisi de boş Kral Dairesi olmalı)'),
        () => GameManager.I.MakeSuite(i), Menu.Gold, ok && G.CanPay(sc));
    }
    p.Add('Kapat', null, C(0.95, 0.45, 0.4, 1));
  }

  ThemeChooser(i) {
    const G = this.G;
    const r = G.rooms[i];
    const p = Popups.Show('Oda ' + r.Number + ' teması',
      'Tema her misafiri biraz mutlu eder, uygun misafiri çok daha fazla. Resepsiyon misafiri ona uygun temalı boş odaya yerleştirir.', 'ODA TEMASI');
    for (let t = 0; t < Themes.Names.length; t++) {
      const th = t;
      const owned = (r.themeOwned & (1 << t)) !== 0;
      const sel = r.theme === t;
      const c = Themes.Cost(i, t);
      const label = Themes.Names[t] + ' · ' + Menu.ThemeFans[t] + (sel ? '   (seçili)' : owned ? '' : '   ' + Eco.TL(c));
      p.Add(label, () => GameManager.I.BuyTheme(i, th), sel ? Menu.Grey : owned ? C(0.55, 0.75, 0.95, 1) : Menu.Green, !sel && (owned || G.CanPay(c)));
    }
    p.Add('Kapat', null, C(0.95, 0.45, 0.4, 1));
  }

  AreaRow(row, name, desc, open, cost, buy, s) {
    const G = this.G;
    GUI.Panel(row, open ? C(0.3, 0.6, 0.4, 0.25) : Menu.Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 520 * s, 44 * s), name, this.title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 330 * s, 56 * s), desc, this.sub);
    const br = new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s);
    if (open) this.Button(br, 'Açık ✓', Menu.Grey, false);
    else if (this.Button(br, 'Aç  ' + Eco.TL(cost), Menu.Green, G.CanPay(cost))) buy();
  }

  // ---------------- DEKOR ----------------
  DecorTab(b, s) {
    if (this.narrow) { this.DecorTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub, btn = this.btn;
    const Gold = Menu.Gold, Green = Menu.Green;
    const rh = 150 * s;
    const view = new Rect(0, 0, b.width - 30 * s, rh * Decor.Slots.length + 90 * s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, 0, view.width - 20 * s, 70 * s),
      'Lobiyi süsle! Varsayılandan farklı her seçim misafir memnuniyetini artırır. Şu an bonus: +' + Mathf.RoundToInt(Decor.Bonus * 100) + '%', sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    let y = 76 * s;
    for (let si = 0; si < Decor.Slots.length; si++) {
      const d = Decor.Slots[si];
      const row = new Rect(0, y, view.width, rh - 12 * s);
      GUI.Panel(row, Menu.Card);
      title.normal.textColor = Col.white;
      GUI.Label(new Rect(row.x + 22 * s, row.y + 6 * s, 600 * s, 40 * s), d.name, title);
      const n = d.opts.length;
      const bw = (row.width - 44 * s - (n - 1) * 10 * s) / n;
      for (let o = 0; o < n; o++) {
        const br = new Rect(row.x + 22 * s + o * (bw + 10 * s), row.y + 52 * s, bw, 80 * s);
        const sel = d.sel === o, own = d.Owns(o);
        const label = d.opts[o] + '\n' + (sel ? 'Seçili ✓' : own ? 'Kullan' : Eco.TL(d.costs[o]));
        const c = sel ? Gold : own ? C(0.55, 0.75, 0.95, 1) : Green;
        const can = !sel && (own || G.CanPay(d.costs[o]));
        if (sel) {
          GUI.Panel(br, Gold);
          btn.normal.textColor = C(0.12, 0.1, 0.08);
          GUI.Label(br, label, btn);
        }
        else if (this.Button(br, label, c, can)) G.BuyDecor(si, o);
      }
      y += rh;
    }
    GUI.EndScrollView();
  }

  // dar ekran: seçenekler iki sütun
  DecorTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub, btn = this.btn;
    const Gold = Menu.Gold, Green = Menu.Green;
    const view = this.NView('decor', b, s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    sub.normal.textColor = C(1, 0.86, 0.5);
    let y = this.Para(10 * s, 0, view.width - 20 * s,
      'Lobiyi süsle! Varsayılandan farklı her seçim misafir memnuniyetini artırır. Şu an bonus: +' + Mathf.RoundToInt(Decor.Bonus * 100) + '%', sub) + 8 * s;
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    for (let si = 0; si < Decor.Slots.length; si++) {
      const d = Decor.Slots[si];
      const n = d.opts.length, lines = Math.ceil(n / 2);
      title.normal.textColor = Col.white;
      y += this.NRow(0, y, view.width, Menu.Card, d.name, null, lines * 90 * s - 10 * s, s);
      const bw = (this.cw - 10 * s) / 2;
      for (let o = 0; o < n; o++) {
        const br = new Rect(this.cx + (o % 2) * (bw + 10 * s), this.cy + Math.floor(o / 2) * 90 * s, bw, 80 * s);
        const sel = d.sel === o, own = d.Owns(o);
        const label = d.opts[o] + '\n' + (sel ? 'Seçili ✓' : own ? 'Kullan' : Eco.TL(d.costs[o]));
        const c = sel ? Gold : own ? C(0.55, 0.75, 0.95, 1) : Green;
        const can = !sel && (own || G.CanPay(d.costs[o]));
        if (sel) {
          GUI.Panel(br, Gold);
          btn.normal.textColor = C(0.12, 0.1, 0.08);
          GUI.Label(br, label, btn);
        }
        else if (this.Button(br, label, c, can)) G.BuyDecor(si, o);
      }
    }
    this._vh.decor = y + 20 * s;
    GUI.EndScrollView();
  }

  // ---------------- PERSONEL ----------------
  StaffTab(b, s) {
    if (this.narrow) { this.StaffTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub;
    const rh = 158 * s;
    const rows = 4 + G.cleaners.length + (G.CanHireCleaner ? 1 : 0) + 1;
    const view = new Rect(0, 0, b.width - 30 * s, rh * rows + 60 * s);
    this.staffScroll = GUI.BeginScrollView(b, this.staffScroll, view);
    let y = 0;

    // Resepsiyonist
    if (G.reception.HasStaff)
      this.recepEdit = this.StaffRow(new Rect(0, y, view.width, rh - 12 * s), 'Resepsiyonist', G.reception.stats, this.recepEdit, n => G.reception.Rename(n), 'Misafirleri senin yerine odalara yerleştirir.', s, 'recepName');
    else
      this.HireRow(new Rect(0, y, view.width, rh - 12 * s), 'Resepsiyonist', 'Misafirleri senin yerine odalara yerleştirir. Resepsiyonda beklemene gerek kalmaz.',
        Eco.ReceptionistCost, true, () => { G.HireReceptionist(); this.recepEdit = G.reception.staffName; }, s);
    y += rh;

    // Temizlikciler
    for (let i = 0; i < G.cleaners.length; i++) {
      if (this.cleanerEdit[i] == null) this.cleanerEdit[i] = G.cleaners[i].staffName;
      const idx = i;
      this.cleanerEdit[i] = this.StaffRow(new Rect(0, y, view.width, rh - 12 * s), 'Temizlikçi ' + (i + 1), G.cleaners[i].stats, this.cleanerEdit[i], n => G.cleaners[idx].Rename(n),
        'Odaları temizler, isteklere koşar.', s, 'cleanerName' + i);
      y += rh;
    }
    if (G.CanHireCleaner) {
      const c = Eco.CleanerCost[G.cleaners.length];
      this.HireRow(new Rect(0, y, view.width, rh - 12 * s), 'Yeni Temizlikçi (' + (G.cleaners.length + 1) + '/' + Eco.CleanerCost.length + ')',
        'Kirli odaları kendiliğinden temizler, sen paraya odaklanırsın.', c, true,
        () => { G.HireCleaner(); this.cleanerEdit[G.cleaners.length - 1] = G.cleaners[G.cleaners.length - 1].staffName; }, s);
      y += rh;
    }
    // Barista
    if (G.cafe.HasBarista)
      this.baristaEdit = this.StaffRow(new Rect(0, y, view.width, rh - 12 * s), 'Barista', G.cafe.stats, this.baristaEdit, n => G.cafe.Rename(n), 'Kafede kahveleri o hazırlar.', s, 'baristaName');
    else
      this.HireRow(new Rect(0, y, view.width, rh - 12 * s), 'Barista', G.cafe.Open ? 'Kafede kahveleri senin yerine hazırlar.' : 'Önce Otel sekmesinden kafeyi aç.',
        Eco.BaristaCost, G.cafe.Open, () => { G.HireBarista(); this.baristaEdit = G.cafe.baristaName; }, s);
    y += rh;

    // Garson
    if (G.restaurant.HasWaiter)
      this.waiterEdit = this.StaffRow(new Rect(0, y, view.width, rh - 12 * s), 'Garson', G.restaurant.stats, this.waiterEdit, n => G.restaurant.Rename(n), 'Restoranda tabakları masalara o götürür.', s, 'waiterName');
    else
      this.HireRow(new Rect(0, y, view.width, rh - 12 * s), 'Garson', G.restaurant.Open ? 'Mutfaktan tabakları alıp masalara senin yerine götürür.' : 'Önce Otel sekmesinden restoranı aç.',
        Eco.WaiterCost, G.restaurant.Open, () => { G.HireWaiter(); this.waiterEdit = G.restaurant.waiterName; }, s);
    y += rh;

    // Terapist
    if (G.spa.HasTherapist)
      this.therapistEdit = this.StaffRow(new Rect(0, y, view.width, rh - 12 * s), 'Terapist', G.spa.stats, this.therapistEdit, n => G.spa.Rename(n), 'Spada masaj ve manikürü o yapar.', s, 'therapistName');
    else
      this.HireRow(new Rect(0, y, view.width, rh - 12 * s), 'Terapist', G.spa.Open ? 'Spada bekleyen misafirlere senin yerine masaj ve manikür yapar.' : 'Önce Otel sekmesinden spayı aç.',
        Eco.TherapistCost, G.spa.Open, () => { G.HireTherapist(); this.therapistEdit = G.spa.therapistName; }, s);
    y += rh;

    // Dinlenme odasi
    const row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, G.restRoom ? C(0.3, 0.6, 0.4, 0.25) : Menu.Card);
    title.normal.textColor = Col.white;
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Personel Dinlenme Odası', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 90 * s), 'Molalar iki kat hızlı biter, morali her gün daha yavaş düşer. Maaşlar her sabah gün sonu raporunda ödenir.', sub);
    const br = new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s);
    if (G.restRoom) this.Button(br, 'Açık ✓', Menu.Grey, false);
    else if (this.Button(br, 'Aç  ' + Eco.TL(Eco.RestRoomCost), Menu.Green, G.CanPay(Eco.RestRoomCost))) G.BuyRestRoom();
    y += rh;

    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, y + 4 * s, view.width, 50 * s), 'İsimleri değiştirmek için kutuya dokunup yaz. Mutlu ve deneyimli çalışan daha hızlı çalışır.', sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    GUI.EndScrollView();
  }

  // dar ekran: isim kutusu ve düğmeler açıklamanın altında
  StaffTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub;
    const view = this.NView('staff', b, s);
    this.staffScroll = GUI.BeginScrollView(b, this.staffScroll, view);
    const W = view.width;
    let y = 0;
    const hire = (name, desc, cost, can, fn) => {
      title.normal.textColor = Col.white;
      y += this.NRow(0, y, W, Menu.Card, name, desc, 60 * s, s);
      if (this.Button(new Rect(this.cx, this.cy, this.cw, 60 * s), 'İşe al  ' + Eco.TL(cost), Menu.Green, can && G.CanPay(cost))) fn();
    };
    const staff = (role, st, edit, rename, desc, key) => {
      title.normal.textColor = Col.white;
      sub.normal.textColor = C(0.8, 0.83, 0.9);
      y += this.NRow(0, y, W, st.resting ? C(0.6, 0.5, 0.3, 0.2) : Menu.Card, role + (st.resting ? '  ·  molada' : ''), desc + '  Maaş: ' + Eco.TL(st.Wage) + '/gün', 50 * s + 128 * s, s);
      this.StaffStats(this.cx, this.cy, st, s);
      const cy = this.cy + 50 * s;
      edit = this.DrawNameField(new Rect(this.cx, cy, this.cw, 56 * s), edit, rename, key);
      const full = st.morale >= 0.99;
      if (this.Button(new Rect(this.cx, cy + 66 * s, this.cw, 60 * s), full ? 'Morali tam' : 'İkramiye ver  ' + Eco.TL(st.BonusCost), Menu.Gold, !full && G.CanPay(st.BonusCost)))
        G.StaffBonus(st);
      return edit;
    };

    if (G.reception.HasStaff)
      this.recepEdit = staff('Resepsiyonist', G.reception.stats, this.recepEdit, n => G.reception.Rename(n), 'Misafirleri senin yerine odalara yerleştirir.', 'recepName');
    else
      hire('Resepsiyonist', 'Misafirleri senin yerine odalara yerleştirir. Resepsiyonda beklemene gerek kalmaz.',
        Eco.ReceptionistCost, true, () => { G.HireReceptionist(); this.recepEdit = G.reception.staffName; });

    for (let i = 0; i < G.cleaners.length; i++) {
      if (this.cleanerEdit[i] == null) this.cleanerEdit[i] = G.cleaners[i].staffName;
      const idx = i;
      this.cleanerEdit[i] = staff('Temizlikçi ' + (i + 1), G.cleaners[i].stats, this.cleanerEdit[i], n => G.cleaners[idx].Rename(n), 'Odaları temizler, isteklere koşar.', 'cleanerName' + i);
    }
    if (G.CanHireCleaner) {
      const c = Eco.CleanerCost[G.cleaners.length];
      hire('Yeni Temizlikçi (' + (G.cleaners.length + 1) + '/' + Eco.CleanerCost.length + ')', 'Kirli odaları kendiliğinden temizler, sen paraya odaklanırsın.', c, true,
        () => { G.HireCleaner(); this.cleanerEdit[G.cleaners.length - 1] = G.cleaners[G.cleaners.length - 1].staffName; });
    }
    if (G.cafe.HasBarista)
      this.baristaEdit = staff('Barista', G.cafe.stats, this.baristaEdit, n => G.cafe.Rename(n), 'Kafede kahveleri o hazırlar.', 'baristaName');
    else
      hire('Barista', G.cafe.Open ? 'Kafede kahveleri senin yerine hazırlar.' : 'Önce Otel sekmesinden kafeyi aç.',
        Eco.BaristaCost, G.cafe.Open, () => { G.HireBarista(); this.baristaEdit = G.cafe.baristaName; });
    if (G.restaurant.HasWaiter)
      this.waiterEdit = staff('Garson', G.restaurant.stats, this.waiterEdit, n => G.restaurant.Rename(n), 'Restoranda tabakları masalara o götürür.', 'waiterName');
    else
      hire('Garson', G.restaurant.Open ? 'Mutfaktan tabakları alıp masalara senin yerine götürür.' : 'Önce Otel sekmesinden restoranı aç.',
        Eco.WaiterCost, G.restaurant.Open, () => { G.HireWaiter(); this.waiterEdit = G.restaurant.waiterName; });
    if (G.spa.HasTherapist)
      this.therapistEdit = staff('Terapist', G.spa.stats, this.therapistEdit, n => G.spa.Rename(n), 'Spada masaj ve manikürü o yapar.', 'therapistName');
    else
      hire('Terapist', G.spa.Open ? 'Spada bekleyen misafirlere senin yerine masaj ve manikür yapar.' : 'Önce Otel sekmesinden spayı aç.',
        Eco.TherapistCost, G.spa.Open, () => { G.HireTherapist(); this.therapistEdit = G.spa.therapistName; });

    // Dinlenme odasi
    title.normal.textColor = Col.white;
    y += this.NRow(0, y, W, G.restRoom ? C(0.3, 0.6, 0.4, 0.25) : Menu.Card, 'Personel Dinlenme Odası',
      'Molalar iki kat hızlı biter, morali her gün daha yavaş düşer. Maaşlar her sabah gün sonu raporunda ödenir.', 60 * s, s);
    const br = new Rect(this.cx, this.cy, this.cw, 60 * s);
    if (G.restRoom) this.Button(br, 'Açık ✓', Menu.Grey, false);
    else if (this.Button(br, 'Aç  ' + Eco.TL(Eco.RestRoomCost), Menu.Green, G.CanPay(Eco.RestRoomCost))) G.BuyRestRoom();

    sub.normal.textColor = C(1, 0.86, 0.5);
    y += 4 * s + this.Para(10 * s, y + 4 * s, W - 20 * s, 'İsimleri değiştirmek için kutuya dokunup yaz. Mutlu ve deneyimli çalışan daha hızlı çalışır.', sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    this._vh.staff = y + 20 * s;
    GUI.EndScrollView();
  }

  HireRow(row, name, desc, cost, can, hire, s) {
    const G = this.G;
    GUI.Panel(row, Menu.Card);
    this.title.normal.textColor = Col.white;
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), name, this.title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 90 * s), desc, this.sub);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s), 'İşe al  ' + Eco.TL(cost), Menu.Green, can && G.CanPay(cost))) hire();
  }

  // C#'ta "ref string edit": güncel değeri döndürür. key: yazı alanının benzersiz anahtarı
  StaffRow(row, role, st, edit, rename, desc, s, key) {
    const G = this.G, title = this.title, sub = this.sub, small = this.small;
    GUI.Panel(row, st.resting ? C(0.6, 0.5, 0.3, 0.2) : Menu.Card);
    title.normal.textColor = Col.white;
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), role + (st.resting ? '  ·  molada' : ''), title);
    // seviye, enerji, moral
    this.StaffStats(row.x + 22 * s, row.y + 56 * s, st, s);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 100 * s, row.width - 480 * s, 50 * s), desc + '  Maaş: ' + Eco.TL(st.Wage) + '/gün', sub);

    edit = this.DrawNameField(new Rect(row.xMax - 440 * s, row.y + 14 * s, 420 * s, 56 * s), edit, rename, key);
    const full = st.morale >= 0.99;
    if (this.Button(new Rect(row.xMax - 440 * s, row.y + 80 * s, 420 * s, 56 * s), full ? 'Morali tam' : 'İkramiye ver  ' + Eco.TL(st.BonusCost), Menu.Gold, !full && G.CanPay(st.BonusCost)))
      G.StaffBonus(st);
    return edit;
  }

  // seviye, enerji, moral (x, y: sol üst)
  StaffStats(x, y, st, s) {
    const small = this.small;
    small.fontSize = Mathf.RoundToInt(19 * s);
    small.normal.textColor = C(1, 0.86, 0.42);
    small.alignment = TextAnchor.MiddleLeft;
    GUI.Label(new Rect(x, y, 120 * s, 26 * s), 'Seviye ' + st.Level, small);
    this.BarC(new Rect(x, y + 28 * s, 100 * s, 10 * s), st.LevelProgress, Menu.Gold);
    x += 135 * s;
    small.normal.textColor = Col.white;
    GUI.Label(new Rect(x, y, 160 * s, 26 * s), 'Enerji', small);
    this.BarC(new Rect(x, y + 28 * s, 150 * s, 10 * s), st.energy, st.energy > 0.3 ? C(0.45, 0.85, 1, 1) : C(1, 0.55, 0.4, 1));
    x += 170 * s;
    GUI.Label(new Rect(x, y, 200 * s, 26 * s), 'Moral: ' + st.MoodWord, small);
    this.BarC(new Rect(x, y + 28 * s, 150 * s, 10 * s), st.morale, st.morale > 0.45 ? Menu.Green : st.morale > 0.25 ? Menu.Gold : C(1, 0.45, 0.4, 1));
    small.alignment = TextAnchor.MiddleCenter;
  }

  BarC(r, t, c) {
    GUI.color = C(1, 1, 1, 0.15);
    GUI.DrawTexture(r, 'white');
    t = Mathf.Clamp01(t);
    GUI.color = c;
    if (t > 0.01) GUI.DrawTexture(new Rect(r.x, r.y, r.width * t, r.height), 'white');
    GUI.color = Col.white;
  }

  // C#'ta "ref string val": güncel değeri döndürür
  DrawNameField(r, val, apply, key) {
    GUI.color = C(1, 1, 1, 0.95);
    const nv = GUI.TextField(r, val ?? '', 16, key);
    GUI.color = Col.white;
    if (nv !== val) {
      val = nv;
      if (nv != null && nv.trim() !== '') apply(nv.trim());
    }
    return val;
  }

  // ---------------- GELISTIRMELER ----------------
  UpgradeTab(b, s) {
    if (this.narrow) { this.UpgradeTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub;
    const rh = 118 * s;
    const view = new Rect(0, 0, b.width - 30 * s, rh * Eco.Ups.length + 10 * s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    for (let i = 0; i < Eco.Ups.length; i++) {
      const d = Eco.Ups[i];
      const lv = G.UpLevel(d.id);
      const row = new Rect(0, i * rh, view.width, rh - 12 * s);
      GUI.Panel(row, Menu.Card);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 520 * s, 44 * s), d.name, title);

      // seviye noktalari
      for (let k = 0; k < d.max; k++) {
        GUI.color = k < lv ? Menu.Gold : C(1, 1, 1, 0.2);
        GUI.DrawTexture(new Rect(row.x + 330 * s + k * 30 * s, row.y + 20 * s, 22 * s, 22 * s), 'circle');
      }
      GUI.color = Col.white;

      const eff = Eco.Effect(d.id, lv) + (lv < d.max ? '  →  ' + Eco.Effect(d.id, lv + 1) : '');
      sub.normal.textColor = C(0.8, 0.83, 0.9);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width - 340 * s, 60 * s), d.desc + '\n' + eff, sub);

      const br = new Rect(row.xMax - 290 * s, row.y + 24 * s, 270 * s, 64 * s);
      if (lv >= d.max) this.Button(br, 'Tamamlandı', Menu.Grey, false);
      else {
        const c = Eco.UpCost(d.id, lv);
        if (this.Button(br, (lv === 0 ? 'Satın al  ' : 'Geliştir  ') + Eco.TL(c), Menu.Gold, G.CanPay(c))) G.BuyUpgrade(d.id);
      }
    }
    GUI.EndScrollView();
  }

  // dar ekran: seviye noktaları başlığın sağında, düğme açıklamanın altında
  UpgradeTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub;
    const view = this.NView('up', b, s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    let y = 0;
    for (let i = 0; i < Eco.Ups.length; i++) {
      const d = Eco.Ups[i];
      const lv = G.UpLevel(d.id);
      const eff = Eco.Effect(d.id, lv) + (lv < d.max ? '  →  ' + Eco.Effect(d.id, lv + 1) : '');
      title.normal.textColor = Col.white;
      sub.normal.textColor = C(0.8, 0.83, 0.9);
      const y0 = y;
      y += this.NRow(0, y, view.width, Menu.Card, d.name, d.desc + '\n' + eff, 60 * s, s, d.max * 30 * s + 10 * s);
      for (let k = 0; k < d.max; k++) {
        GUI.color = k < lv ? Menu.Gold : C(1, 1, 1, 0.2);
        GUI.DrawTexture(new Rect(view.width - 22 * s - (d.max - k) * 30 * s + 8 * s, y0 + 19 * s, 22 * s, 22 * s), 'circle');
      }
      GUI.color = Col.white;
      const br = new Rect(this.cx, this.cy, this.cw, 60 * s);
      if (lv >= d.max) this.Button(br, 'Tamamlandı', Menu.Grey, false);
      else {
        const c = Eco.UpCost(d.id, lv);
        if (this.Button(br, (lv === 0 ? 'Satın al  ' : 'Geliştir  ') + Eco.TL(c), Menu.Gold, G.CanPay(c))) G.BuyUpgrade(d.id);
      }
    }
    this._vh.up = y + 10 * s;
    GUI.EndScrollView();
  }

  // ---------------- GOREVLER ----------------
  QuestTab(b, s) {
    if (this.narrow) { this.QuestTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub, small = this.small;
    const Gold = Menu.Gold, Grey = Menu.Grey, Card = Menu.Card;
    const reqs = StarExam.official < 5 ? StarExam.Requirements(StarExam.Target) : [];
    const examH = 150 * s + reqs.length * 34 * s;
    const h = examH + 20 * s + 160 * s + 44 * s + Quests.daily.length * 120 * s + 60 * s + Regulars.All.length * 92 * s + 40 * s;
    const view = new Rect(0, 0, b.width - 30 * s, h);
    this.questScroll = GUI.BeginScrollView(b, this.questScroll, view);
    let y = 0;

    // Yildiz sinavi
    let row = new Rect(0, y, view.width, examH);
    GUI.Panel(row, C(0.55, 0.45, 1, 0.14));
    title.normal.textColor = C(1, 0.86, 0.42);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), 'Resmi yıldız belgesi: ' + '★'.repeat(Math.max(0, StarExam.official)) + '☆'.repeat(Math.max(0, 5 - StarExam.official)), title);
    sub.normal.textColor = C(0.85, 0.85, 1);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 340 * s, 60 * s),
      (StarExam.official < 5 ? StarExam.Target + ' yıldız için şartlar. Sınavda gizli bir müfettiş gelir, memnun ayrılırsa belge alırsın (fiyatlar +%5).' : '') + '\n' + StarExam.Status, sub);
    let ry = row.y + 116 * s;
    for (const rq of reqs) {
      sub.normal.textColor = rq.ok ? C(0.55, 0.95, 0.55) : C(1, 0.7, 0.6);
      GUI.Label(new Rect(row.x + 34 * s, ry, row.width - 380 * s, 32 * s), (rq.ok ? '✓  ' : '✗  ') + rq.text, sub);
      ry += 34 * s;
    }
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    if (StarExam.official < 5) {
      const br = new Rect(row.xMax - 290 * s, row.y + 30 * s, 270 * s, 64 * s);
      if (this.Button(br, 'Sınava başvur', Gold, StarExam.CanApply)) { StarExam.Apply(); this.Toggle(); }
      small.fontSize = Mathf.RoundToInt(18 * s);
      small.normal.textColor = C(1, 0.86, 0.5);
      GUI.Label(new Rect(br.x, br.yMax + 4 * s, br.width, 30 * s), 'Ödül: ' + Eco.TL(StarExam.Rewards[StarExam.Target]), small);
    }
    y += examH + 20 * s;

    // Ana gorev
    const q = Quests.Current;
    row = new Rect(0, y, view.width, 140 * s);
    GUI.Panel(row, C(1, 0.78, 0.25, 0.12));
    title.normal.textColor = C(1, 0.86, 0.42);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 40 * s), 'Ana görev ' + Mathf.Min(Quests.storyIndex + 1, Quests.Line.length) + '/' + Quests.Line.length, title);
    title.normal.textColor = Col.white;
    if (q != null) {
      GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width - 340 * s, 40 * s), q.text, title);
      this.Bar(new Rect(row.x + 22 * s, row.y + 100 * s, row.width - 360 * s, 18 * s), q.cur() / q.target, s);
      const br = new Rect(row.xMax - 290 * s, row.y + 38 * s, 270 * s, 64 * s);
      if (Quests.CurrentDone) { if (this.Button(br, 'Ödülü al  ' + Eco.TL(q.reward), Gold)) Quests.ClaimStory(); }
      else this.Button(br, 'Ödül  ' + Eco.TL(q.reward), Grey, false);
    }
    else GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width, 40 * s), 'Tüm ana görevler tamamlandı!', title);
    y += 160 * s;

    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, y, view.width, 40 * s), 'GÜNÜN HEDEFLERİ · Gün ' + G.dayNight.day + " (her sabah 06:00'da yenilenir)", sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    y += 44 * s;
    for (const d of Quests.daily) {
      row = new Rect(0, y, view.width, 108 * s);
      GUI.Panel(row, d.claimed ? C(0.3, 0.6, 0.4, 0.2) : Card);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), d.Text, title);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, 300 * s, 30 * s), d.Cur + ' / ' + d.target, sub);
      this.Bar(new Rect(row.x + 22 * s, row.y + 80 * s, row.width - 360 * s, 14 * s), d.Cur / d.target, s);
      const br = new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s);
      if (d.claimed) this.Button(br, 'Alındı ✓', Grey, false);
      else if (d.Done) { if (this.Button(br, 'Ödülü al  ' + Eco.TL(d.reward), Gold)) Quests.ClaimDaily(d); }
      else this.Button(br, 'Ödül  ' + Eco.TL(d.reward), Grey, false);
      y += 120 * s;
    }

    // Mudavimler
    y += 10 * s;
    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, y, view.width, 40 * s), 'MÜDAVİM MİSAFİRLER · Memnun ayrılırlarsa hikayeleri ilerler', sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    y += 46 * s;
    for (let i = 0; i < Regulars.All.length; i++) {
      const d = Regulars.All[i];
      const v = Regulars.visits[i];
      row = new Rect(0, y, view.width, 80 * s);
      GUI.Panel(row, v >= 3 ? C(0.3, 0.6, 0.4, 0.22) : Card);
      title.normal.textColor = Col.white;
      GUI.Label(new Rect(row.x + 22 * s, row.y + 4 * s, 500 * s, 40 * s), v > 0 ? d.name : '???', title);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 42 * s, row.width - 300 * s, 34 * s), v > 0 ? d.title : 'Henüz tanışmadın', sub);
      small.fontSize = Mathf.RoundToInt(30 * s);
      small.normal.textColor = C(1, 0.45, 0.6);
      GUI.Label(new Rect(row.xMax - 280 * s, row.y + 6 * s, 260 * s, 44 * s), '♥'.repeat(Math.max(0, v)) + '♡'.repeat(Math.max(0, 3 - v)), small);
      small.fontSize = Mathf.RoundToInt(18 * s);
      small.normal.textColor = C(1, 0.86, 0.5);
      GUI.Label(new Rect(row.xMax - 280 * s, row.y + 46 * s, 260 * s, 30 * s), v >= 3 ? 'Hikaye tamam' : 'Ziyaret ' + v + '/3', small);
      y += 92 * s;
    }
    GUI.EndScrollView();
  }

  QuestTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub, small = this.small;
    const Gold = Menu.Gold, Grey = Menu.Grey, Card = Menu.Card;
    const reqs = StarExam.official < 5 ? StarExam.Requirements(StarExam.Target) : [];
    const view = this.NView('quest', b, s);
    this.questScroll = GUI.BeginScrollView(b, this.questScroll, view);
    const W = view.width, tw = W - 44 * s;
    let y = 0;

    // Yildiz sinavi: şartlar ve düğme açıklamanın altında
    const rqw = tw - 12 * s;
    let reqH = 0;
    const rqText = rq => (rq.ok ? '✓  ' : '✗  ') + rq.text;
    for (const rq of reqs) reqH += this.TH(rqText(rq), sub, rqw) + 2 * s;
    title.normal.textColor = C(1, 0.86, 0.42);
    sub.normal.textColor = C(0.85, 0.85, 1);
    y += this.NRow(0, y, W, C(0.55, 0.45, 1, 0.14), 'Resmi yıldız belgesi: ' + '★'.repeat(Math.max(0, StarExam.official)) + '☆'.repeat(Math.max(0, 5 - StarExam.official)),
      (StarExam.official < 5 ? StarExam.Target + ' yıldız için şartlar. Sınavda gizli bir müfettiş gelir, memnun ayrılırsa belge alırsın (fiyatlar +%5).' : '') + '\n' + StarExam.Status,
      reqH + (StarExam.official < 5 ? 8 * s + 60 * s + 32 * s : 0), s);
    let ry = this.cy;
    for (const rq of reqs) {
      sub.normal.textColor = rq.ok ? C(0.55, 0.95, 0.55) : C(1, 0.7, 0.6);
      ry += this.Para(this.cx + 12 * s, ry, rqw, rqText(rq), sub) + 2 * s;
    }
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    if (StarExam.official < 5) {
      const br = new Rect(this.cx, ry + 8 * s, this.cw, 60 * s);
      if (this.Button(br, 'Sınava başvur', Gold, StarExam.CanApply)) { StarExam.Apply(); this.Toggle(); }
      small.fontSize = Mathf.RoundToInt(18 * s);
      small.normal.textColor = C(1, 0.86, 0.5);
      GUI.Label(new Rect(br.x, br.yMax + 2 * s, br.width, 30 * s), 'Ödül: ' + Eco.TL(StarExam.Rewards[StarExam.Target]), small);
    }
    y += 8 * s;

    // Ana gorev
    const q = Quests.Current;
    title.normal.textColor = C(1, 0.86, 0.42);
    const qh = q != null ? this.TH(q.text, title, tw) : this.TH('Tüm ana görevler tamamlandı!', title, tw);
    y += this.NRow(0, y, W, C(1, 0.78, 0.25, 0.12), 'Ana görev ' + Mathf.Min(Quests.storyIndex + 1, Quests.Line.length) + '/' + Quests.Line.length, null,
      qh + (q != null ? 6 * s + 18 * s + 12 * s + 60 * s : 0), s);
    title.normal.textColor = Col.white;
    if (q != null) {
      let cy = this.cy + this.Para(this.cx, this.cy, tw, q.text, title) + 6 * s;
      this.Bar(new Rect(this.cx, cy, tw, 18 * s), q.cur() / q.target, s);
      const br = new Rect(this.cx, cy + 30 * s, tw, 60 * s);
      if (Quests.CurrentDone) { if (this.Button(br, 'Ödülü al  ' + Eco.TL(q.reward), Gold)) Quests.ClaimStory(); }
      else this.Button(br, 'Ödül  ' + Eco.TL(q.reward), Grey, false);
    }
    else this.Para(this.cx, this.cy, tw, 'Tüm ana görevler tamamlandı!', title);
    y += 8 * s;

    sub.normal.textColor = C(1, 0.86, 0.5);
    y += this.Para(10 * s, y, W - 20 * s, 'GÜNÜN HEDEFLERİ · Gün ' + G.dayNight.day + " (her sabah 06:00'da yenilenir)", sub) + 6 * s;
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    for (const d of Quests.daily) {
      title.normal.textColor = Col.white;
      y += this.NRow(0, y, W, d.claimed ? C(0.3, 0.6, 0.4, 0.2) : Card, d.Text, d.Cur + ' / ' + d.target, 14 * s + 12 * s + 60 * s, s);
      this.Bar(new Rect(this.cx, this.cy, this.cw, 14 * s), d.Cur / d.target, s);
      const br = new Rect(this.cx, this.cy + 26 * s, this.cw, 60 * s);
      if (d.claimed) this.Button(br, 'Alındı ✓', Grey, false);
      else if (d.Done) { if (this.Button(br, 'Ödülü al  ' + Eco.TL(d.reward), Gold)) Quests.ClaimDaily(d); }
      else this.Button(br, 'Ödül  ' + Eco.TL(d.reward), Grey, false);
    }

    // Mudavimler
    y += 10 * s;
    sub.normal.textColor = C(1, 0.86, 0.5);
    y += this.Para(10 * s, y, W - 20 * s, 'MÜDAVİM MİSAFİRLER · Memnun ayrılırlarsa hikayeleri ilerler', sub) + 6 * s;
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    for (let i = 0; i < Regulars.All.length; i++) {
      const d = Regulars.All[i];
      const v = Regulars.visits[i];
      title.normal.textColor = Col.white;
      const y0 = y;
      y += this.NRow(0, y, W, v >= 3 ? C(0.3, 0.6, 0.4, 0.22) : Card, v > 0 ? d.name : '???', v > 0 ? d.title : 'Henüz tanışmadın', 0, s, 190 * s);
      small.fontSize = Mathf.RoundToInt(30 * s);
      small.normal.textColor = C(1, 0.45, 0.6);
      GUI.Label(new Rect(W - 200 * s, y0 + 3 * s, 180 * s, 30 * s), '♥'.repeat(Math.max(0, v)) + '♡'.repeat(Math.max(0, 3 - v)), small);
      small.fontSize = Mathf.RoundToInt(18 * s);
      small.normal.textColor = C(1, 0.86, 0.5);
      GUI.Label(new Rect(W - 200 * s, y0 + 31 * s, 180 * s, 22 * s), v >= 3 ? 'Hikaye tamam' : 'Ziyaret ' + v + '/3', small);
    }
    this._vh.quest = y + 30 * s;
    GUI.EndScrollView();
  }

  Bar(r, t, s) {
    GUI.Panel(r, C(1, 1, 1, 0.12));
    t = Mathf.Clamp01(t);
    if (t > 0.02) GUI.Panel(new Rect(r.x, r.y, r.width * t, r.height), C(0.45, 0.9, 0.5, 1));
  }

  // ---------------- HIKAYE VE ZINCIR ----------------
  StoryTab(b, s) {
    if (this.narrow) { this.StoryTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub;
    const Gold = Menu.Gold, Green = Menu.Green, Grey = Menu.Grey;
    const goals = Story.Goals();
    const storyH = !Story.started || Story.Finished ? 190 * s : 200 * s + goals.length * 70 * s + (Story.chapter === 1 ? 76 * s : 0);
    const chainH = 56 * s + Chain.Cities.length * 182 * s;
    const view = new Rect(0, 0, b.width - 30 * s, storyH + 24 * s + chainH);
    this.storyScroll = GUI.BeginScrollView(b, this.storyScroll, view);
    let y = 0;
    let switchTo = -1;

    let row = new Rect(0, y, view.width, storyH);
    GUI.Panel(row, C(1, 0.6, 0.75, 0.13));
    title.normal.textColor = C(1, 0.75, 0.85);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), "ELİF'İN OTELİ · Hikâye modu", title);
    sub.normal.textColor = C(0.9, 0.88, 0.95);
    if (!Story.started) {
      GUI.Label(new Rect(row.x + 22 * s, row.y + 56 * s, row.width - 340 * s, 120 * s),
        "Anneanne Saadet'in otelini yeniden canlandır, rakibin Kaan Bey'e karşı yarış, Bodrum ve Kapadokya'da yeni oteller aç. 8 bölüm, her bölümde ödül. Hedefler otelinin büyüklüğüne göre ayarlanır.", sub);
      if (this.Button(new Rect(row.xMax - 290 * s, row.y + 60 * s, 270 * s, 64 * s), 'Hikâyeyi başlat', Gold)) Story.Begin();
    }
    else if (Story.Finished) {
      GUI.Label(new Rect(row.x + 22 * s, row.y + 56 * s, row.width - 44 * s, 120 * s),
        'Hikâye tamamlandı! Otel İmparatoriçesi ' + Story.Ad + '. Anneanne Saadet gurur duyardı. Otellerin seni bekliyor.', sub);
    }
    else {
      const ch = Story.chapter;
      title.normal.textColor = Col.white;
      GUI.Label(new Rect(row.x + 22 * s, row.y + 52 * s, row.width - 340 * s, 40 * s), 'Bölüm ' + (ch + 1) + '/' + Story.Count + ' · ' + Story.Titles[ch], title);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 96 * s, row.width - 340 * s, 90 * s), Story.Summaries[ch], sub);
      let gy = row.y + 190 * s;
      for (const g of goals) {
        const cur = Mathf.Min(g.cur(), g.target);
        sub.normal.textColor = g.Done ? C(0.55, 0.95, 0.55) : C(0.9, 0.9, 0.95);
        GUI.Label(new Rect(row.x + 34 * s, gy, row.width - 360 * s, 32 * s), (g.Done ? '✓  ' : '•  ') + g.text + '   ' + cur + ' / ' + g.target, sub);
        this.Bar(new Rect(row.x + 34 * s, gy + 36 * s, row.width - 380 * s, 14 * s), cur / g.target, s);
        gy += 70 * s;
      }
      if (ch === 1 && !Story.debtPaid) {
        if (this.Button(new Rect(row.x + 34 * s, gy, 360 * s, 60 * s), 'Borcu öde  ' + Eco.TL(Story.Debt), Gold, G.CanPay(Story.Debt))) Story.PayDebt();
      }
      const cb = new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s);
      if (this.Button(cb, Story.Ready ? 'Bölümü bitir\n+' + Eco.TL(Story.Reward) : 'Ödül ' + Eco.TL(Story.Reward), Story.Ready ? Gold : Grey, Story.Ready)) Story.Complete();
    }
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    y += storyH + 24 * s;

    // Otel zinciri
    sub.normal.textColor = C(1, 0.86, 0.5);
    GUI.Label(new Rect(10 * s, y, view.width, 44 * s), 'OTEL ZİNCİRİ · ' + Chain.Count + ' otel' + (Chain.Count > 1 ? ' · tüm otellerde fiyatlar +%' + (5 * (Chain.Count - 1)) : ' · her yeni otel tüm otellerde fiyatları %5 artırır'), sub);
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    y += 56 * s;
    for (let i = 0; i < Chain.Cities.length; i++) {
      const ci = i;
      row = new Rect(0, y, view.width, 170 * s);
      const own = Chain.Owns(i), here = i === Chain.cur;
      GUI.Panel(row, here ? C(0.3, 0.6, 0.4, 0.25) : Menu.Card);
      title.normal.textColor = Col.white;
      GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, row.width - 340 * s, 40 * s), Chain.Cities[i] + (own ? ' · ' + Chain.HotelName(i) : '') + (here ? '   (buradasın)' : ''), title);
      if (own) {
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 100 * s),
          'Gün ' + Chain.Day(i) + ' · ' + Chain.Rooms(i) + ' oda · Kasa ' + Eco.TL(Chain.Money(i)) + '\n' + Chain.CityDesc[i], sub);
        if (!here) {
          if (this.Button(new Rect(row.xMax - 290 * s, row.y + 18 * s, 270 * s, 60 * s), 'Bu otele git', Green)) switchTo = ci;
          const amt = Mathf.Max(100, Mathf.RoundToInt(G.money * 0.1 / 100) * 100);
          if (this.Button(new Rect(row.xMax - 290 * s, row.y + 90 * s, 270 * s, 60 * s), 'Para gönder  ' + Eco.TL(amt), C(0.55, 0.75, 0.95, 1), G.money >= amt)) Chain.Send(ci, amt);
        }
        else this.Button(new Rect(row.xMax - 290 * s, row.y + 18 * s, 270 * s, 60 * s), 'Şu an burada', Grey, false);
      }
      else {
        const req = Chain.Requirement(i);
        GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 110 * s), Chain.CityDesc[i] + (req != null ? '\nŞart: ' + req : ''), sub);
        if (this.Button(new Rect(row.xMax - 290 * s, row.y + 40 * s, 270 * s, 64 * s), 'Aç  ' + Eco.TL(Chain.Cost[i]), Green, Chain.CanBuy(i))) Chain.Buy(ci);
      }
      y += 182 * s;
    }
    GUI.EndScrollView();
    if (switchTo >= 0) Chain.Switch(switchTo);
  }

  StoryTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub;
    const Gold = Menu.Gold, Green = Menu.Green, Grey = Menu.Grey;
    const goals = Story.Goals();
    const view = this.NView('story', b, s);
    this.storyScroll = GUI.BeginScrollView(b, this.storyScroll, view);
    const W = view.width, tw = W - 44 * s;
    let y = 0;
    let switchTo = -1;

    title.normal.textColor = C(1, 0.75, 0.85);
    sub.normal.textColor = C(0.9, 0.88, 0.95);
    const pink = C(1, 0.6, 0.75, 0.13), head = "ELİF'İN OTELİ · Hikâye modu";
    if (!Story.started) {
      y += this.NRow(0, y, W, pink, head,
        "Anneanne Saadet'in otelini yeniden canlandır, rakibin Kaan Bey'e karşı yarış, Bodrum ve Kapadokya'da yeni oteller aç. 8 bölüm, her bölümde ödül. Hedefler otelinin büyüklüğüne göre ayarlanır.", 64 * s, s);
      if (this.Button(new Rect(this.cx, this.cy, this.cw, 64 * s), 'Hikâyeyi başlat', Gold)) Story.Begin();
    }
    else if (Story.Finished) {
      y += this.NRow(0, y, W, pink, head, 'Hikâye tamamlandı! Otel İmparatoriçesi ' + Story.Ad + '. Anneanne Saadet gurur duyardı. Otellerin seni bekliyor.', 0, s);
    }
    else {
      const ch = Story.chapter;
      const chTitle = 'Bölüm ' + (ch + 1) + '/' + Story.Count + ' · ' + Story.Titles[ch];
      const gText = g => (g.Done ? '✓  ' : '•  ') + g.text + '   ' + Mathf.Min(g.cur(), g.target) + ' / ' + g.target;
      const gw = tw - 12 * s;
      let ctrl = this.TH(chTitle, title, tw) + 4 * s + this.TH(Story.Summaries[ch], sub, tw) + 10 * s;
      for (const g of goals) ctrl += this.TH(gText(g), sub, gw) + 30 * s;
      if (ch === 1 && !Story.debtPaid) ctrl += 70 * s;
      ctrl += 64 * s;
      y += this.NRow(0, y, W, pink, head, null, ctrl, s);
      let cy = this.cy;
      title.normal.textColor = Col.white;
      cy += this.Para(this.cx, cy, tw, chTitle, title) + 4 * s;
      cy += this.Para(this.cx, cy, tw, Story.Summaries[ch], sub) + 10 * s;
      for (const g of goals) {
        const cur = Mathf.Min(g.cur(), g.target);
        sub.normal.textColor = g.Done ? C(0.55, 0.95, 0.55) : C(0.9, 0.9, 0.95);
        cy += this.Para(this.cx + 12 * s, cy, gw, gText(g), sub) + 4 * s;
        this.Bar(new Rect(this.cx + 12 * s, cy, gw, 14 * s), cur / g.target, s);
        cy += 26 * s;
      }
      if (ch === 1 && !Story.debtPaid) {
        if (this.Button(new Rect(this.cx, cy, tw, 60 * s), 'Borcu öde  ' + Eco.TL(Story.Debt), Gold, G.CanPay(Story.Debt))) Story.PayDebt();
        cy += 70 * s;
      }
      if (this.Button(new Rect(this.cx, cy, tw, 64 * s), Story.Ready ? 'Bölümü bitir\n+' + Eco.TL(Story.Reward) : 'Ödül ' + Eco.TL(Story.Reward), Story.Ready ? Gold : Grey, Story.Ready)) Story.Complete();
    }
    y += 12 * s;

    // Otel zinciri
    sub.normal.textColor = C(1, 0.86, 0.5);
    y += this.Para(10 * s, y, W - 20 * s, 'OTEL ZİNCİRİ · ' + Chain.Count + ' otel' + (Chain.Count > 1 ? ' · tüm otellerde fiyatlar +%' + (5 * (Chain.Count - 1)) : ' · her yeni otel tüm otellerde fiyatları %5 artırır'), sub) + 8 * s;
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    for (let i = 0; i < Chain.Cities.length; i++) {
      const ci = i;
      const own = Chain.Owns(i), here = i === Chain.cur;
      title.normal.textColor = Col.white;
      const name = Chain.Cities[i] + (own ? ' · ' + Chain.HotelName(i) : '') + (here ? '   (buradasın)' : '');
      const panel = here ? C(0.3, 0.6, 0.4, 0.25) : Menu.Card;
      if (own) {
        y += this.NRow(0, y, W, panel, name, 'Gün ' + Chain.Day(i) + ' · ' + Chain.Rooms(i) + ' oda · Kasa ' + Eco.TL(Chain.Money(i)) + '\n' + Chain.CityDesc[i], here ? 60 * s : 130 * s, s);
        if (!here) {
          if (this.Button(new Rect(this.cx, this.cy, this.cw, 60 * s), 'Bu otele git', Green)) switchTo = ci;
          const amt = Mathf.Max(100, Mathf.RoundToInt(G.money * 0.1 / 100) * 100);
          if (this.Button(new Rect(this.cx, this.cy + 70 * s, this.cw, 60 * s), 'Para gönder  ' + Eco.TL(amt), C(0.55, 0.75, 0.95, 1), G.money >= amt)) Chain.Send(ci, amt);
        }
        else this.Button(new Rect(this.cx, this.cy, this.cw, 60 * s), 'Şu an burada', Grey, false);
      }
      else {
        const req = Chain.Requirement(i);
        y += this.NRow(0, y, W, panel, name, Chain.CityDesc[i] + (req != null ? '\nŞart: ' + req : ''), 60 * s, s);
        if (this.Button(new Rect(this.cx, this.cy, this.cw, 60 * s), 'Aç  ' + Eco.TL(Chain.Cost[i]), Green, Chain.CanBuy(i))) Chain.Buy(ci);
      }
    }
    this._vh.story = y + 20 * s;
    GUI.EndScrollView();
    if (switchTo >= 0) Chain.Switch(switchTo);
  }

  // ---------------- AYARLAR ----------------
  SettingsTab(b, s) {
    if (this.narrow) { this.SettingsTabN(b, s); return; }
    const G = this.G, title = this.title, sub = this.sub, small = this.small;
    const Gold = Menu.Gold, Green = Menu.Green, Grey = Menu.Grey, Card = Menu.Card;
    const rh = 112 * s;
    const view = new Rect(0, 0, b.width - 30 * s, rh * 11 + 40 * s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    let y = 0;
    sub.normal.textColor = C(0.8, 0.83, 0.9);

    let row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Otelin adı', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), 'Girişteki tabelada ve ekranın sol üstünde görünür.', sub);
    this.hotelEdit = this.DrawNameField(new Rect(row.xMax - 560 * s, row.y + 22 * s, 540 * s, 64 * s), this.hotelEdit, n => G.SetHotelName(n), 'hotelName');
    y += rh;

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Müdürün adı', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), 'Senin karakterinin başında görünür.', sub);
    this.managerEdit = this.DrawNameField(new Rect(row.xMax - 560 * s, row.y + 22 * s, 540 * s, 64 * s), this.managerEdit, n => G.SetManager(G.managerVariant, n), 'managerName');
    y += rh;

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Müdürün görünüşü', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), '12 farklı karakterden birini seç.', sub);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 80 * s, 64 * s), '◀', Gold)) { G.SetManager(G.managerVariant - 1, G.managerName); G.Save(); }
    small.normal.textColor = Col.white;
    small.fontSize = Mathf.RoundToInt(24 * s);
    GUI.Label(new Rect(row.xMax - 205 * s, row.y + 22 * s, 100 * s, 64 * s), (G.managerVariant + 1) + ' / 12', small);
    if (this.Button(new Rect(row.xMax - 100 * s, row.y + 22 * s, 80 * s, 64 * s), '▶', Gold)) { G.SetManager(G.managerVariant + 1, G.managerName); G.Save(); }
    y += rh;

    // Iki kisilik oyun
    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, G.coop ? C(0.3, 0.5, 0.8, 0.25) : Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'İki kişilik oyun', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 50 * s), 'Aynı bilgisayarda: 1. oyuncu WASD, 2. oyuncu ok tuşları. Kamera ikinizi birden gösterir.', sub);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), G.coop ? 'Açık' : 'Kapalı', G.coop ? Green : Grey, true)) { G.SetCoop(!G.coop); G.Save(); }
    y += rh;
    if (G.coop) {
      row = new Rect(0, y, view.width, rh - 12 * s);
      GUI.Panel(row, Card);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), '2. oyuncunun adı', title);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), 'Mavi halkalı karakterin başında görünür.', sub);
      this.p2Edit = this.DrawNameField(new Rect(row.xMax - 560 * s, row.y + 22 * s, 540 * s, 64 * s), this.p2Edit, n => G.SetPlayer2(G.p2Variant, n), 'p2Name');
      y += rh;

      row = new Rect(0, y, view.width, rh - 12 * s);
      GUI.Panel(row, Card);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), '2. oyuncunun görünüşü', title);
      GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, 420 * s, 50 * s), '12 farklı karakterden birini seç.', sub);
      if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 80 * s, 64 * s), '◀', Gold)) { G.SetPlayer2(G.p2Variant - 1, G.p2Name); G.Save(); }
      small.normal.textColor = Col.white;
      small.fontSize = Mathf.RoundToInt(24 * s);
      GUI.Label(new Rect(row.xMax - 205 * s, row.y + 22 * s, 100 * s, 64 * s), (G.p2Variant + 1) + ' / 12', small);
      if (this.Button(new Rect(row.xMax - 100 * s, row.y + 22 * s, 80 * s, 64 * s), '▶', Gold)) { G.SetPlayer2(G.p2Variant + 1, G.p2Name); G.Save(); }
      y += rh;
    }

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 30 * s, 600 * s, 44 * s), 'Müzik', title);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), G.music ? 'Açık' : 'Kapalı', G.music ? Green : Grey, true)) { G.SetMusic(!G.music); G.Save(); }
    y += rh;

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 30 * s, 600 * s, 44 * s), 'Ses efektleri', title);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), G.sound ? 'Açık' : 'Kapalı', G.sound ? Green : Grey, true)) { G.SetSound(!G.sound); G.Save(); }
    y += rh;

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Grafik kalitesi', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 50 * s), 'Yavaşlarsa Düşük seç. Oyun takılırsa kendiliğinden düşürür.', sub);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), Quality.names[Quality.level], Gold, true)) Quality.Set((Quality.level + 1) % 3, true);
    y += rh;

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Tablolardaki fotoğraflar', title);
    const pc = Photos.All.length;
    // Tarayıcıda klasör yerine fotoğraf seçilir; tablolara yeniden açılışta yerleşir
    GUI.Label(new Rect(row.x + 22 * s, row.y + 50 * s, row.width - 620 * s, 56 * s),
      (pc > 0 ? pc + ' fotoğraf kullanılıyor.' : 'Henüz fotoğraf yok.') + ' Otelin tablolarında senin fotoğrafların görünür.', sub);
    if (this.Button(new Rect(row.xMax - 580 * s, row.y + 22 * s, 270 * s, 64 * s), 'Fotoğraf ekle', Green, true)) Menu.PickPhotos();
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), 'Temizle', Grey, pc > 0)) { Photos.Clear(); G.Save(); location.reload(); }
    y += rh;

    row = new Rect(0, y, view.width, rh - 12 * s);
    GUI.Panel(row, Card);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 8 * s, 600 * s, 44 * s), 'Yeni oyun', title);
    GUI.Label(new Rect(row.x + 22 * s, row.y + 54 * s, row.width - 340 * s, 50 * s), 'Tüm ilerleme silinir ve otel baştan başlar.', sub);
    if (this.Button(new Rect(row.xMax - 290 * s, row.y + 22 * s, 270 * s, 64 * s), this.resetConfirm > 0 ? 'Emin misin?' : 'Baştan başla', C(0.95, 0.45, 0.4), true)) {
      if (this.resetConfirm > 0) G.ResetGame();
      else this.resetConfirm = 3;
    }
    GUI.EndScrollView();
  }

  // dar ekran: denetimler açıklamanın altında
  SettingsTabN(b, s) {
    const G = this.G, title = this.title, sub = this.sub, small = this.small;
    const Gold = Menu.Gold, Green = Menu.Green, Grey = Menu.Grey, Card = Menu.Card;
    const view = this.NView('set', b, s);
    this.scroll = GUI.BeginScrollView(b, this.scroll, view);
    const W = view.width;
    let y = 0;
    title.normal.textColor = Col.white;
    sub.normal.textColor = C(0.8, 0.83, 0.9);
    const field = (name, desc, val, apply, key) => {
      y += this.NRow(0, y, W, Card, name, desc, 64 * s, s);
      return this.DrawNameField(new Rect(this.cx, this.cy, this.cw, 64 * s), val, apply, key);
    };
    const look = (name, variant, set) => {
      y += this.NRow(0, y, W, Card, name, '12 farklı karakterden birini seç.', 64 * s, s);
      if (this.Button(new Rect(this.cx, this.cy, 80 * s, 64 * s), '◀', Gold)) { set(variant - 1); G.Save(); }
      small.normal.textColor = Col.white;
      small.fontSize = Mathf.RoundToInt(24 * s);
      GUI.Label(new Rect(this.cx + 90 * s, this.cy, 100 * s, 64 * s), (variant + 1) + ' / 12', small);
      if (this.Button(new Rect(this.cx + 200 * s, this.cy, 80 * s, 64 * s), '▶', Gold)) { set(variant + 1); G.Save(); }
    };
    const toggle = (name, desc, on, panel) => {
      y += this.NRow(0, y, W, panel, name, desc, 64 * s, s);
      return this.Button(new Rect(this.cx, this.cy, this.cw, 64 * s), on ? 'Açık' : 'Kapalı', on ? Green : Grey, true);
    };

    this.hotelEdit = field('Otelin adı', 'Girişteki tabelada ve ekranın sol üstünde görünür.', this.hotelEdit, n => G.SetHotelName(n), 'hotelName');
    this.managerEdit = field('Müdürün adı', 'Senin karakterinin başında görünür.', this.managerEdit, n => G.SetManager(G.managerVariant, n), 'managerName');
    look('Müdürün görünüşü', G.managerVariant, v => G.SetManager(v, G.managerName));

    // Iki kisilik oyun
    if (toggle('İki kişilik oyun', 'Aynı bilgisayarda: 1. oyuncu WASD, 2. oyuncu ok tuşları. Kamera ikinizi birden gösterir.', G.coop, G.coop ? C(0.3, 0.5, 0.8, 0.25) : Card)) { G.SetCoop(!G.coop); G.Save(); }
    if (G.coop) {
      this.p2Edit = field('2. oyuncunun adı', 'Mavi halkalı karakterin başında görünür.', this.p2Edit, n => G.SetPlayer2(G.p2Variant, n), 'p2Name');
      look('2. oyuncunun görünüşü', G.p2Variant, v => G.SetPlayer2(v, G.p2Name));
    }

    if (toggle('Müzik', null, G.music, Card)) { G.SetMusic(!G.music); G.Save(); }
    if (toggle('Ses efektleri', null, G.sound, Card)) { G.SetSound(!G.sound); G.Save(); }

    y += this.NRow(0, y, W, Card, 'Grafik kalitesi', 'Yavaşlarsa Düşük seç. Oyun takılırsa kendiliğinden düşürür.', 64 * s, s);
    if (this.Button(new Rect(this.cx, this.cy, this.cw, 64 * s), Quality.names[Quality.level], Gold, true)) Quality.Set((Quality.level + 1) % 3, true);

    const pc = Photos.All.length;
    // Tarayıcıda klasör yerine fotoğraf seçilir; tablolara yeniden açılışta yerleşir
    y += this.NRow(0, y, W, Card, 'Tablolardaki fotoğraflar',
      (pc > 0 ? pc + ' fotoğraf kullanılıyor.' : 'Henüz fotoğraf yok.') + ' Otelin tablolarında senin fotoğrafların görünür.', 64 * s, s);
    const hw = (this.cw - 12 * s) / 2;
    if (this.Button(new Rect(this.cx, this.cy, hw, 64 * s), 'Fotoğraf ekle', Green, true)) Menu.PickPhotos();
    if (this.Button(new Rect(this.cx + hw + 12 * s, this.cy, hw, 64 * s), 'Temizle', Grey, pc > 0)) { Photos.Clear(); G.Save(); location.reload(); }

    y += this.NRow(0, y, W, Card, 'Yeni oyun', 'Tüm ilerleme silinir ve otel baştan başlar.', 64 * s, s);
    if (this.Button(new Rect(this.cx, this.cy, this.cw, 64 * s), this.resetConfirm > 0 ? 'Emin misin?' : 'Baştan başla', C(0.95, 0.45, 0.4), true)) {
      if (this.resetConfirm > 0) G.ResetGame();
      else this.resetConfirm = 3;
    }
    this._vh.set = y + 20 * s;
    GUI.EndScrollView();
  }
}
