// Ekranin ortasinda acilan karar/bilgi pencereleri (olaylar, raporlar, hikayeler).
// Pencere acikken oyun durur. Menunun de ustunde cizilir.
// (Unity: Popups.cs → statik sınıf + PopupHost)

class PopupChoice {
  constructor(text, act, color, enabled = true) {
    this.text = text;
    this.act = act || null;
    this.color = color;
    this.enabled = enabled;
  }
}

class PopupP {
  constructor(title, body, tag) {
    this.title = title;
    this.body = body;
    this.tag = tag ?? null;
    this.accent = C(1, 0.78, 0.25, 1);
    this.choices = [];
    this.custom = null;   // (rect, s) => {}
    this.customH = 0;
  }
  // C#'taki uzanti metodu: p.Add(text, act, color, enabled)
  Add(text, act = null, c = null, enabled = true) {
    this.choices.push(new PopupChoice(text, act, c ?? Popups.Gold, enabled));
    return this;
  }
}

class Popups {
  static Choice = PopupChoice;
  static P = PopupP;

  static queue = [];
  static get Open() { return Popups.queue.length > 0; }
  static get Current() { return Popups.queue.length > 0 ? Popups.queue[0] : null; }

  static Gold = C(1, 0.78, 0.25, 1);
  static Green = C(0.35, 0.8, 0.45, 1);
  static Blue = C(0.45, 0.7, 1, 1);
  static Red = C(0.95, 0.45, 0.4, 1);
  static Grey = C(0.45, 0.47, 0.52, 1);

  static Show(title, body, tag = null) {
    const p = new PopupP(title, body, tag);
    Popups.queue.push(p);
    Sfx.Play('pop', 0.6);
    return p;
  }

  // Uzanti metodunun statik hali (Popups.Add(p, ...))
  static Add(p, text, act = null, c = null, enabled = true) { return p.Add(text, act, c, enabled); }

  static Clear() { Popups.queue.length = 0; }

  static title = null; static body = null; static btn = null; static tagSt = null;

  static Styles(s) {
    if (Popups.title == null) {
      Popups.title = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold, wordWrap: true });
      Popups.body = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.UpperCenter, wordWrap: true });
      Popups.btn = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold, wordWrap: true });
      Popups.tagSt = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
    }
    Popups.title.fontSize = Mathf.RoundToInt(36 * s);
    Popups.title.normal.textColor = C(1, 0.86, 0.42);
    Popups.body.fontSize = Mathf.RoundToInt(24 * s);
    Popups.body.normal.textColor = C(0.92, 0.94, 1);
    Popups.btn.fontSize = Mathf.RoundToInt(22 * s);
    Popups.tagSt.fontSize = Mathf.RoundToInt(18 * s);
  }

  // GUIStyle.CalcHeight karşılığı: motorun GUI._text satır kaydırmasıyla aynı hesap
  static CalcHeight(st, text, width) {
    if (text == null) return 0;
    const ctx = GUI.ctx, fs = Math.max(1, st.fontSize || 14);
    const pad = st.padding || { left: 0, right: 0, top: 0, bottom: 0 };
    const w = width - pad.left - pad.right;
    let n = 0;
    if (ctx) ctx.font = `${st.fontStyle === FontStyle.Bold ? '800' : '600'} ${fs}px ${UI_FONT}`;
    for (const para of String(text).split('\n')) {
      if (!st.wordWrap || !ctx) { n++; continue; }
      const words = para.split(' '); let cur = '';
      for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { n++; cur = wd; } else cur = t; }
      n++;
    }
    return fs * 1.2 * n + pad.top + pad.bottom;
  }

  static Draw(G) {
    const p = Popups.Current;
    if (p == null) return;
    const s = G.UIScale;
    Popups.Styles(s);
    const body = Popups.body, title = Popups.title, btn = Popups.btn, tagSt = Popups.tagSt;

    // pencere disindaki tiklamalar alttaki menuye gecmesin
    GUI.Block();

    GUI.color = C(0, 0, 0, 0.55);
    GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), 'white');
    GUI.color = Col.white;

    const w = Mathf.Min(Screen.width - 40 * s, 820 * s);
    const inner = w - 70 * s;
    const bodyH = !p.body ? 0 : Popups.CalcHeight(body, p.body, inner);
    const n = Mathf.Max(1, p.choices.length);
    const stack = n > 2;
    const btnH = 66 * s;
    const btnsH = stack ? n * (btnH + 10 * s) : btnH + 10 * s;
    let h = 40 * s + (p.tag != null ? 34 * s : 0) + 60 * s + 16 * s + bodyH + (p.custom != null ? p.customH * s + 16 * s : 0) + 24 * s + btnsH + 20 * s;
    h = Mathf.Min(h, Screen.height - 40 * s);
    const r = new Rect((Screen.width - w) / 2, (Screen.height - h) / 2, w, h);
    GUI.Panel(r, C(0.11, 0.13, 0.22, 0.98));
    GUI.Panel(new Rect(r.x + 12 * s, r.y + 12 * s, r.width - 24 * s, 8 * s), p.accent);

    let y = r.y + 32 * s;
    if (p.tag != null) {
      tagSt.normal.textColor = p.accent;
      GUI.Label(new Rect(r.x, y, r.width, 30 * s), p.tag, tagSt);
      y += 34 * s;
    }
    GUI.Label(new Rect(r.x + 30 * s, y, r.width - 60 * s, 60 * s), p.title, title);
    y += 76 * s;
    if (bodyH > 0) {
      body.alignment = p.body.includes('•') ? TextAnchor.UpperLeft : TextAnchor.UpperCenter;
      GUI.Label(new Rect(r.x + 35 * s, y, inner, bodyH), p.body, body);
      y += bodyH + 16 * s;
    }
    if (p.custom != null) {
      p.custom(new Rect(r.x + 35 * s, y, inner, p.customH * s), s);
      y += p.customH * s + 16 * s;
    }
    y += 8 * s;

    if (p.choices.length === 0) p.Add('Tamam');
    for (let i = 0; i < p.choices.length; i++) {
      const c = p.choices[i];
      let br;
      if (stack) br = new Rect(r.x + 40 * s, y + i * (btnH + 10 * s), r.width - 80 * s, btnH);
      else {
        const bw = (r.width - 80 * s - (n - 1) * 16 * s) / n;
        br = new Rect(r.x + 40 * s + i * (bw + 16 * s), y, bw, btnH);
      }
      GUI.Panel(br, c.enabled ? c.color : Popups.Grey);
      btn.normal.textColor = c.enabled ? C(0.14, 0.1, 0.06) : C(0.85, 0.85, 0.88);
      if (GUI.Button(br, c.text, btn) && c.enabled) {
        Sfx.Play('pop', 0.5);
        arrRemove(Popups.queue, p);
        if (c.act) c.act();
        return; // GUIUtility.ExitGUI()
      }
    }
  }
}

// Pencereleri menunun de ustunde cizen yardimci
class PopupHost extends Behaviour {
  constructor() {
    super();
    RegisterGUI(-10, () => this.OnGUI());
  }
  OnGUI() {
    if (!Popups.Open || !GameManager.I) return;
    GUI.depth = -10;
    Popups.Draw(GameManager.I);
  }
}
