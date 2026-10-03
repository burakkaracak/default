// Gun sonu raporu: gunun geliri, giderleri (maas, elektrik, bakim, camasir) ve son 7 gunun kari
// (Unity: Report.cs)

class ReportCosts {
  constructor() { this.wages = 0; this.power = 0; this.upkeep = 0; this.laundry = 0; this.other = 0; }
  get Total() { return this.wages + this.power + this.upkeep + this.laundry + this.other; }
}

// int.TryParse karşılığı (başarısızsa 0 / null)
function _repTryInt(s) { s = String(s ?? '').trim(); return /^[+-]?\d+$/.test(s) ? parseInt(s, 10) : null; }

class Report {
  static income = 0; static bonus = 0; static guests = 0; static angry = 0; static other = 0;
  static ratingSum = 0;
  static ratingN = 0;
  static history = [];
  static Costs = ReportCosts;

  static Income(a) { Report.income += a; }
  static Bonus(a) { Report.bonus += a; }
  static Other(a) { Report.other += a; }
  static Guest(rating) { Report.guests++; Report.ratingSum += rating; Report.ratingN++; }
  static Angry() { Report.angry++; Report.ratingSum += 1; Report.ratingN++; }

  static get G() { return GameManager.I; }

  static Today() {
    const G = Report.G;
    const c = new ReportCosts();
    if (G.reception.HasStaff) c.wages += G.reception.stats.Wage;
    for (const cl of G.cleaners) c.wages += cl.stats.Wage;
    if (G.cafe.HasBarista) c.wages += G.cafe.stats.Wage;
    if (G.restaurant.HasWaiter) c.wages += G.restaurant.stats.Wage;
    let rooms = 0, levels = 0;
    for (const r of G.rooms) if (r.Unlocked) { rooms++; levels += r.level; }
    c.power = 8 * rooms + (G.cafe.Open ? 25 : 0) + (G.pool.Open ? 45 : 0) + (G.restaurant.Open ? 40 : 0) + (G.wingOpen ? 20 : 0) + (G.floor2Open ? 35 : 0);
    c.upkeep = 4 * levels + Decor.OwnedCount() * 3;
    c.laundry = Laundry.I ? Laundry.I.washesToday * 4 : 0;
    c.other = Report.other;
    return c;
  }

  // Saat 06:00'da cagrilir: dunun raporu
  static EndOfDay(finishedDay) {
    const G = Report.G;
    const c = Report.Today();
    const fixedCosts = c.Total - c.other; // diger giderler zaten odendi
    const paid = Mathf.Min(G.money, fixedCosts);
    G.money -= paid;
    const shortPay = paid < fixedCosts;
    if (shortPay) G.StaffMoraleAll(-0.2);

    const profit = Report.income + Report.bonus - c.Total;
    Report.history.push(profit);
    while (Report.history.length > 7) Report.history.splice(0, 1);
    const avg = Report.ratingN > 0 ? Report.ratingSum / Report.ratingN : 0;

    const weatherShown = Events.WNames[Events.weather | 0];
    const incomeShown = Report.income, bonusShown = Report.bonus, guestsShown = Report.guests, angryShown = Report.angry;
    const p = Popups.Show('Gün ' + finishedDay + ' raporu', null, 'GÜN SONU');
    p.customH = 470;
    p.custom = (r, s) => Report.DrawReport(r, s, incomeShown, bonusShown, c, profit, guestsShown, angryShown, avg, shortPay, weatherShown);
    p.Add('Yeni güne başla!', null, Popups.Gold);

    Report.income = Report.bonus = Report.guests = Report.angry = Report.other = 0;
    Report.ratingSum = 0;
    Report.ratingN = 0;
    if (Laundry.I) Laundry.I.washesToday = 0;
  }

  static l = null; static rgt = null; static hd = null;

  static DrawReport(r, s, inc, bon, c, profit, guests, angry, avg, shortPay, weather) {
    if (Report.l == null) {
      Report.l = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleLeft });
      Report.rgt = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleRight, fontStyle: FontStyle.Bold });
      Report.hd = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleLeft, fontStyle: FontStyle.Bold });
    }
    const l = Report.l, rgt = Report.rgt, hd = Report.hd;
    l.fontSize = rgt.fontSize = Mathf.RoundToInt(21 * s);
    hd.fontSize = Mathf.RoundToInt(22 * s);
    const lh = 30 * s;
    const half = r.width / 2 - 14 * s;
    // Sol: gelir-gider
    let y = r.y;
    const green = C(0.55, 0.95, 0.55), red = C(1, 0.6, 0.55), white = Col.white;
    hd.normal.textColor = C(1, 0.86, 0.42);
    GUI.Label(new Rect(r.x, y, half, lh), 'GELİR', hd); y += lh;
    y = Report.Row(r.x, y, half, lh, 'Konaklama ve satışlar', '+' + Eco.TL(inc), green);
    y = Report.Row(r.x, y, half, lh, 'Ödüller', '+' + Eco.TL(bon), green);
    y += 8 * s;
    GUI.Label(new Rect(r.x, y, half, lh), 'GİDER', hd); y += lh;
    y = Report.Row(r.x, y, half, lh, 'Maaşlar', '-' + Eco.TL(c.wages), red);
    y = Report.Row(r.x, y, half, lh, 'Elektrik ve su', '-' + Eco.TL(c.power), red);
    y = Report.Row(r.x, y, half, lh, 'Bakım', '-' + Eco.TL(c.upkeep), red);
    y = Report.Row(r.x, y, half, lh, 'Çamaşır (deterjan)', '-' + Eco.TL(c.laundry), red);
    if (c.other > 0) y = Report.Row(r.x, y, half, lh, 'Diğer (olaylar)', '-' + Eco.TL(c.other), red);
    y += 6 * s;
    Report.Line(new Rect(r.x, y, half, 2 * s), C(1, 1, 1, 0.3));
    y += 10 * s;
    hd.normal.textColor = profit >= 0 ? green : red;
    GUI.Label(new Rect(r.x, y, half, lh + 6 * s), 'NET KÂR', hd);
    rgt.fontSize = Mathf.RoundToInt(26 * s);
    rgt.normal.textColor = profit >= 0 ? green : red;
    GUI.Label(new Rect(r.x, y, half, lh + 6 * s), (profit >= 0 ? '+' : '-') + Eco.TL(Mathf.Abs(profit)), rgt);
    rgt.fontSize = Mathf.RoundToInt(21 * s);
    y += lh + 14 * s;
    if (shortPay) {
      l.normal.textColor = red;
      l.wordWrap = true;
      GUI.Label(new Rect(r.x, y, half, 2 * lh), 'Kasada yeterli para yoktu, maaşlar eksik ödendi. Personelin morali düştü!', l);
      l.wordWrap = false;
    }

    // Sag: misafir ozeti ve 7 gunluk grafik
    const x = r.x + r.width / 2 + 14 * s;
    y = r.y;
    hd.normal.textColor = C(1, 0.86, 0.42);
    GUI.Label(new Rect(x, y, half, lh), 'MİSAFİRLER', hd); y += lh;
    y = Report.Row(x, y, half, lh, 'Ağırlanan misafir', String(guests), white);
    y = Report.Row(x, y, half, lh, 'Beklemekten bıkıp giden', String(angry), white);
    y = Report.Row(x, y, half, lh, 'Ortalama puan', avg > 0 ? fmt1(avg) + ' ★' : '-', white);
    y = Report.Row(x, y, half, lh, 'Hava', weather, white);
    y += 12 * s;
    GUI.Label(new Rect(x, y, half, lh), 'SON 7 GÜN (net kâr)', hd); y += lh + 6 * s;
    const chart = new Rect(x, y, half, r.yMax - y - 6 * s);
    GUI.Panel(chart, C(1, 1, 1, 0.06));
    const history = Report.history;
    let max = 1;
    for (const v of history) max = Mathf.Max(max, Mathf.Abs(v));
    const n = history.length;
    if (n > 0) {
      const bw = (chart.width - 20 * s) / 7;
      const mid = chart.y + chart.height * 0.62;
      const up = mid - chart.y - 10 * s, down = chart.yMax - mid - 10 * s;
      for (let i = 0; i < n; i++) {
        const v = history[i];
        const hh = v >= 0 ? up * v / max : down * -v / max;
        const bar = v >= 0 ? new Rect(chart.x + 10 * s + i * bw + 4 * s, mid - hh, bw - 8 * s, Mathf.Max(2 * s, hh))
          : new Rect(chart.x + 10 * s + i * bw + 4 * s, mid, bw - 8 * s, Mathf.Max(2 * s, hh));
        Report.Line(bar, i === n - 1 ? C(1, 0.78, 0.25, 1) : v >= 0 ? C(0.45, 0.85, 0.5, 1) : C(0.95, 0.5, 0.45, 1));
      }
      Report.Line(new Rect(chart.x + 6 * s, mid, chart.width - 12 * s, 2 * s), C(1, 1, 1, 0.35));
    }
  }

  static Line(r, c) {
    GUI.color = c;
    GUI.DrawTexture(r, 'white');
    GUI.color = Col.white;
  }

  // C#'ta "ref float y": yeni y değerini döndürür
  static Row(x, y, w, lh, a, b, col) {
    Report.l.normal.textColor = C(0.85, 0.88, 0.95);
    Report.rgt.normal.textColor = col;
    GUI.Label(new Rect(x, y, w, lh), a, Report.l);
    GUI.Label(new Rect(x, y, w, lh), b, Report.rgt);
    return y + lh;
  }

  static Save(K) {
    Store.SetString(K + 'rep_today', Report.income + ';' + Report.bonus + ';' + Report.guests + ';' + Report.angry + ';' + Report.other + ';' +
      String(Report.ratingSum) + ';' + Report.ratingN);
    Store.SetString(K + 'rep_hist', Report.history.join(';'));
  }

  static Load(K) {
    Report.income = Report.bonus = Report.guests = Report.angry = Report.other = 0;
    Report.ratingSum = 0;
    Report.ratingN = 0;
    Report.history.length = 0;
    const t = Store.GetString(K + 'rep_today', '').split(';');
    if (t.length >= 7) {
      Report.income = _repTryInt(t[0]) ?? 0;
      Report.bonus = _repTryInt(t[1]) ?? 0;
      Report.guests = _repTryInt(t[2]) ?? 0;
      Report.angry = _repTryInt(t[3]) ?? 0;
      Report.other = _repTryInt(t[4]) ?? 0;
      const f = parseFloat(t[5]);
      Report.ratingSum = isNaN(f) ? 0 : f;
      Report.ratingN = _repTryInt(t[6]) ?? 0;
    }
    for (const v of Store.GetString(K + 'rep_hist', '').split(';')) {
      const x = _repTryInt(v);
      if (x !== null) Report.history.push(x);
    }
  }
}
