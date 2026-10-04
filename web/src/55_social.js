// "Otelgram": misafirlerin otel hakkindaki paylasimlari. Takipci arttikca reklam etkisi artar.
// (Social.cs'den taşındı)
// Post: { author, text, likes, bad, kind } — kind: 0 misafir, 1 sevindirici, 2 basin/unlu
class Social {
  static feed = [];
  static followers = 50;
  static unread = 0;
  static open = false;
  static scroll = { x: 0, y: 0 };

  static get AdsBonus() { return Mathf.Min(0.6, Social.followers / 4000); }

  static First = ['ayse', 'mehmet', 'zeynep', 'can', 'elif', 'emre', 'selin', 'murat', 'deniz', 'burcu', 'kerem', 'ece', 'oguz', 'melis', 'arda', 'nehir', 'tolga', 'irem', 'baris', 'derya'];
  static Suffix = ['_gezgin', '.travels', '_tatilde', '61', '_istanbul', '.foto', '_yolda', '34', '_kahve', '.blog'];

  static Handle() { return '@' + Social.First[Random.RangeInt(0, Social.First.length)] + Social.Suffix[Random.RangeInt(0, Social.Suffix.length)]; }

  static Good = [
    '{otel} gerçekten harika! Oda {oda} tertemizdi, yatak bulut gibi.',
    "Personel çok güler yüzlü. {otel}'e kesinlikle tekrar geleceğim!",
    'Hafta sonu kaçamağı için {otel} birebir. Kahvaltıya bayıldım.',
    'Bu otelin havası başka. Lobide saatlerce oturabilirim.',
    'Resepsiyonda hiç beklemedim, odam hazırdı. Bravo {otel}!',
    'Oda {oda} manzarası ve dekorasyonu çok şık. 10/10',
  ];
  static Bad = [
    "{otel}'de saatlerce bekledim, kimse ilgilenmedi.",
    'Oda {oda} tozluydu, beklentimin altında kaldı.',
    'Fiyatına göre biraz pahalı geldi açıkçası.',
    'İsteğim unutuldu, kimse gelmedi. Hayal kırıklığı.',
  ];
  static PoolPosts = ["Havuz keyfi! {otel}'in havuzu çok temiz.", 'Güneş, havuz ve kitap. Tatil tam olarak bu.'];
  static CafePosts = ['{otel} kafesinin kahvesi şehrin en iyisi olabilir.', 'Kafede pasta ve kahve molası. Mutluluk!'];

  static Fill(t, r) {
    const hotel = GameManager.I ? GameManager.I.hotelName : 'Otel';
    return t.split('{otel}').join(hotel).split('{oda}').join(r != null ? String(r.Number) : '101');
  }

  // Misafir ayrilirken paylasim yapabilir
  static OnCheckout(c, sat, r) {
    const celeb = c.celebrity || (c.regular != null && c.regular.id === 'selin');
    if (celeb) {
      Social.Add(c.regular != null ? '@selin.gezer' : '@unlu.sanatci', Social.Fill(sat >= 3.5 ? "Bu gece {otel}'de kaldım. Herkese tavsiye ederim, çok özel bir yer!" : '{otel}... daha iyisini beklerdim.', r),
        sat >= 3.5 ? Random.RangeInt(800, 1600) : Random.RangeInt(300, 700), sat < 3.5, 2);
      return;
    }
    if (sat >= 4.2 && Random.value < 0.4) {
      let l = Social.Good;
      const k = Random.value;
      if (GameManager.I.pool.Open && k < 0.15) l = Social.PoolPosts;
      else if (GameManager.I.cafe.Open && k < 0.3) l = Social.CafePosts;
      Social.Add(Social.Handle(), Social.Fill(l[Random.RangeInt(0, l.length)], r), Social.Likes(1), false, 0);
    }
    else if (sat <= 2.2 && Random.value < 0.5)
      Social.Add(Social.Handle(), Social.Fill(Social.Bad[Random.RangeInt(0, Social.Bad.length)], r), Social.Likes(0.7), true, 0);
  }

  static Likes(k) { return Mathf.RoundToInt((Random.RangeInt(8, 30) + Social.followers * Random.Range(0.03, 0.09)) * k); }

  // Olaylardan gelen paylasim. kind 1 = sevindirici, 2 = basin
  static Share(text, kind, bad) {
    const likes = kind === 2 ? Random.RangeInt(400, 900) : kind === 1 ? Social.Likes(2.5) : Social.Likes(1);
    Social.Add(kind === 2 ? '@seyahat.dergisi' : Social.Handle(), text, likes, bad, kind);
  }

  static Add(author, text, likes, bad, kind) {
    const p = { author, text, likes, bad, kind };
    Social.feed.unshift(p);
    while (Social.feed.length > 25) Social.feed.splice(Social.feed.length - 1, 1);
    Social.unread++;
    const gm = GameManager.I;
    if (!bad) {
      const gain = Mathf.Max(1, Math.trunc(likes / 6));
      Social.followers += gain;
      if (gm) gm.Notify('Otelgram: yeni paylaşım, +' + gain + ' takipçi');
    } else {
      const loss = Mathf.Max(1, Math.trunc(likes / 8));
      Social.followers = Mathf.Max(10, Social.followers - loss);
      if (likes > 120) {
        Events.SpawnBuff(0.75, 90);
        if (gm) gm.Notify('Kötü bir yorum yayıldı! Misafir sayısı geçici olarak düştü');
      }
      else if (gm) gm.Notify('Otelgram: olumsuz bir yorum geldi');
    }
  }

  // ---- Ekran ----
  static head = null;
  static txt = null;
  static small = null;

  // GUIStyle.CalcHeight karşılığı (motorda yok): GUI._text ile aynı sarma kuralı
  static CalcHeight(st, text, width) {
    const ctx = GUI.ctx, fs = Math.max(1, st.fontSize || 14);
    const pad = st.padding || { left: 0, right: 0, top: 0, bottom: 0 };
    const w = width - pad.left - pad.right;
    let n = 0;
    if (ctx) {
      ctx.save();
      ctx.font = `${st.fontStyle === FontStyle.Bold ? '800' : '600'} ${fs}px ${UI_FONT}`;
      for (const para of String(text).split('\n')) {
        if (!st.wordWrap) { n++; continue; }
        let cur = '';
        for (const wd of para.split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { n++; cur = wd; } else cur = t; }
        n++;
      }
      ctx.restore();
    } else n = String(text).split('\n').length;
    return fs * 1.2 * n + pad.top + pad.bottom;
  }

  static Button(s) { return new Rect(Screen.width - 210 * s, 104 * s, 190 * s, 58 * s); }

  static DrawButton(G, s, btn) {
    const r = Social.Button(s);
    GUI.Panel(r, C(0.85, 0.35, 0.6, 0.95));
    btn.fontSize = Mathf.RoundToInt(22 * s);
    btn.normal.textColor = Col.white;
    if (GUI.Button(r, 'Otelgram', btn)) { Social.open = !Social.open; Social.unread = 0; Social.scroll = { x: 0, y: 0 }; Sfx.Play('pop', 0.5); }
    if (Social.unread > 0) {
      const badge = new Rect(r.x - 12 * s, r.y - 8 * s, 36 * s, 36 * s);
      GUI.color = C(0.9, 0.25, 0.25);
      GUI.DrawTexture(badge, 'circle');
      GUI.color = Col.white;
      if (Social.small == null) Social.small = new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold });
      Social.small.fontSize = Mathf.RoundToInt(18 * s);
      Social.small.normal.textColor = Col.white;
      GUI.Label(badge, String(Mathf.Min(Social.unread, 9)), Social.small);
    }
  }

  static DrawFeed(G, s) {
    if (!Social.open) return;
    if (Social.head == null) {
      Social.head = new GUIStyle(GUI.skin.label, { fontStyle: FontStyle.Bold, alignment: TextAnchor.MiddleLeft });
      Social.txt = new GUIStyle(GUI.skin.label, { wordWrap: true, alignment: TextAnchor.UpperLeft });
    }
    const head = Social.head, txt = Social.txt, feed = Social.feed;
    // dikey telefonda panel tam genişlikte, para kutusunun altından başlar
    const narrow = Screen.width < Screen.height;
    const w = narrow ? Screen.width - 40 * s : 470 * s, top = narrow ? 284 * s : 175 * s;
    const h = Mathf.Min(Screen.height - top - 25 * s, 760 * s);
    const r = new Rect(Screen.width - w - 20 * s, top, w, h);
    GUI.Panel(r, C(0.98, 0.97, 0.99, 0.98));
    GUI.Panel(new Rect(r.x, r.y, r.width, 78 * s), C(0.85, 0.35, 0.6, 1));
    head.fontSize = Mathf.RoundToInt(28 * s);
    head.normal.textColor = Col.white;
    GUI.Label(new Rect(r.x + 22 * s, r.y + 4 * s, r.width, 40 * s), 'Otelgram', head);
    head.fontSize = Mathf.RoundToInt(18 * s);
    GUI.Label(new Rect(r.x + 22 * s, r.y + 40 * s, r.width, 30 * s), nfmt(Social.followers) + ' takipçi  ·  Reklam etkisi +' + Mathf.RoundToInt(Social.AdsBonus * 100) + '%', head);
    if (GUI.Button(new Rect(r.xMax - 70 * s, r.y + 14 * s, 50 * s, 50 * s), '✕', head)) Social.open = false;

    txt.fontSize = Mathf.RoundToInt(19 * s);
    const iw = r.width - 60 * s;
    let total = 0;
    head.fontSize = Mathf.RoundToInt(18 * s);
    const replyH = p => p.reply ? Social.CalcHeight(txt, '↳ ' + p.reply, iw - 20 * s) + (p.react ? Social.CalcHeight(txt, p.react, iw - 20 * s) : 0) + 16 * s : 0;
    for (const p of feed) total += Social.CalcHeight(txt, p.text, iw) + 74 * s + replyH(p);
    const area = new Rect(r.x + 10 * s, r.y + 88 * s, r.width - 20 * s, r.height - 98 * s);
    const view = new Rect(0, 0, area.width - 20 * s, Mathf.Max(total, area.height));
    Social.scroll = GUI.BeginScrollView(area, Social.scroll, view);
    let y = 0;
    if (feed.length === 0) {
      txt.normal.textColor = C(0.4, 0.4, 0.45);
      GUI.Label(new Rect(14 * s, 10 * s, iw, 80 * s), 'Henüz paylaşım yok. Misafirlerin çok memnun kalırsa otelini paylaşırlar!', txt);
    }
    for (const p of feed) {
      const th = Social.CalcHeight(txt, p.text, iw), rh = replyH(p);
      const card = new Rect(4 * s, y, view.width - 8 * s, th + 64 * s + rh);
      GUI.Panel(card, p.bad ? C(1, 0.9, 0.9, 1) : p.kind === 2 ? C(1, 0.95, 0.8, 1) : C(0.93, 0.94, 0.98, 1));
      head.fontSize = Mathf.RoundToInt(18 * s);
      head.normal.textColor = p.kind === 2 ? C(0.75, 0.5, 0.05) : C(0.55, 0.25, 0.5);
      GUI.Label(new Rect(card.x + 14 * s, card.y + 4 * s, card.width, 28 * s), p.author, head);
      txt.normal.textColor = C(0.15, 0.15, 0.2);
      GUI.Label(new Rect(card.x + 14 * s, card.y + 30 * s, iw, th), p.text, txt);
      head.normal.textColor = p.bad ? C(0.75, 0.3, 0.3) : C(0.85, 0.3, 0.45);
      GUI.Label(new Rect(card.x + 14 * s, card.y + 34 * s + th, card.width, 28 * s), (p.bad ? '♡ ' : '♥ ') + p.likes + ' beğeni', head);
      if (p.reply) {
        // otelin yanıtı ve yorumu yazanın karşılığı
        let ry = card.y + 66 * s + th;
        const h1 = Social.CalcHeight(txt, '↳ ' + p.reply, iw - 20 * s);
        GUI.Panel(new Rect(card.x + 20 * s, ry - 4 * s, card.width - 34 * s, rh - 8 * s), C(1, 1, 1, 0.7));
        txt.normal.textColor = C(0.55, 0.25, 0.5);
        GUI.Label(new Rect(card.x + 30 * s, ry, iw - 20 * s, h1), '↳ ' + p.reply, txt);
        if (p.react) { txt.normal.textColor = C(0.3, 0.3, 0.38); GUI.Label(new Rect(card.x + 30 * s, ry + h1, iw - 20 * s, rh - h1), p.react, txt); }
      } else if (p.author.startsWith('@')) {
        const rb = new Rect(card.xMax - 130 * s, card.y + 30 * s + th, 116 * s, 32 * s);
        GUI.Panel(rb, C(0.85, 0.35, 0.6, 1));
        head.normal.textColor = Col.white; head.alignment = TextAnchor.MiddleCenter;
        if (GUI.Button(rb, 'Yanıtla', head)) Chat.StartPost(p);
        head.alignment = TextAnchor.MiddleLeft;
      }
      y += card.height + 10 * s;
    }
    GUI.EndScrollView();
  }

  // ---- Kayit ----
  static Save(K) {
    Store.SetInt(K + 'soc_f', Social.followers);
    const parts = [];
    for (let i = 0; i < Social.feed.length && i < 15; i++) {
      const p = Social.feed[i];
      parts.push(Social.Esc(p.author) + '\u001f' + Social.Esc(p.text) + '\u001f' + p.likes + '\u001f' + (p.bad ? 1 : 0) + '\u001f' + p.kind + '\u001f' + Social.Esc(p.reply || '') + '\u001f' + Social.Esc(p.react || ''));
    }
    Store.SetString(K + 'soc_p', parts.join('\u001e'));
  }

  static Esc(s) { return s.split('\u001e').join(' ').split('\u001f').join(' '); }

  static Load(K) {
    Social.feed.length = 0;
    Social.unread = 0;
    Social.open = false;
    Social.followers = Store.GetInt(K + 'soc_f', 50);
    const s = Store.GetString(K + 'soc_p', '');
    if (!s) return;
    const TI = v => /^\s*[-+]?\d+\s*$/.test(v) ? parseInt(v, 10) : 0;
    for (const part of s.split('\u001e')) {
      const f = part.split('\u001f');
      if (f.length < 5) continue;
      Social.feed.push({ author: f[0], text: f[1], likes: TI(f[2]), bad: f[3] === '1', kind: TI(f[4]), reply: f[5] || '', react: f[6] || '' });
    }
  }
}
