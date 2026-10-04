// Sohbet: konaklayan misafirlerle konuşma ve Otelgram yorumlarına yanıt verme.
// Misafirin yanına gidince "💬 Sohbet" düğmesi çıkar. Cevaplar hazır seçeneklerden seçilir;
// Claude açıksa (sample yeteneği) "kendin yaz" ile serbest yazışma da olur. İyi sohbet memnuniyeti ve bahşişi artırır.
const Chat = {
  open: false, mode: 'guest', who: null, post: null,
  msgs: [], choices: [], round: 0, mood: 0, typed: 0, busy: false, done: false,
  sample: null, scroll: { x: 0, y: 0 }, btn: Rect.zero, target: null, mark: null, input: '', st: null,
  wantBottom: false,

  Female: ['Ayşe', 'Zeynep', 'Elif', 'Selin', 'Deniz', 'Ece', 'Melis', 'İrem', 'Derya', 'Nehir', 'Burcu', 'Defne', 'Ceren', 'Yasemin', 'Gül'],
  Male: ['Mehmet', 'Can', 'Emre', 'Murat', 'Kerem', 'Oğuz', 'Arda', 'Tolga', 'Barış', 'Ali', 'Kaan', 'Efe', 'Mert', 'Selim', 'Hakan'],

  Init() {
    RegisterGUI(8, () => this.HudGUI());
    RegisterGUI(-9, () => this.OnGUI());
    try { if (window.claude && window.claude.use) window.claude.use('sample').then(s => { this.sample = s; }).catch(() => { }); } catch (e) { }
  },

  NameOf(c) {
    if (c.chatName) return c.chatName;
    if (c.regular != null) return (c.chatName = c.regular.name);
    if (c.reservation != null) return (c.chatName = c.reservation.name.split(' ')[0]);
    const look = c.look || '';
    const l = /female/.test(look) || (!/male/.test(look) && Random.value < 0.5) ? this.Female : this.Male;
    return (c.chatName = l[Random.RangeInt(0, l.length)]);
  },

  // ---------------- Misafir seçimi ve düğme ----------------
  Candidate() {
    const gm = GameManager.I;
    if (!gm || !gm.player || gm.MenuOpen || Popups.Open || this.open) return null;
    const pp = gm.player.transform.position;
    let best = null, bd = 2.6;
    for (const c of gm.customers) {
      if (!c || c.chatted || c.s === Customer.S.Leaving || !c.go || !c.go.visible) continue;
      const p = c.transform.position, d = Math.hypot(p.x - pp.x, p.z - pp.z);
      if (Math.abs(p.y - pp.y) < 2 && d < bd) { bd = d; best = c; }
    }
    return best;
  },

  HudGUI() {
    const gm = GameManager.I;
    this.btn = Rect.zero;
    const c = this.Candidate();
    this.target = c;
    if (!this.mark) { this.mark = U.Text(null, V(), '💬', 0.16, Col.white, true); }
    if (!c) { SetActive(this.mark.gameObject, false); return; }
    const p = c.transform.position;
    SetActive(this.mark.gameObject, true);
    this.mark.transform.position.set(p.x, p.y + 3.1 + Math.sin(Time.unscaledTime * 4) * 0.08, p.z);
    const s = gm.UIScale;
    this.btn = new Rect(Screen.width - 210 * s, Screen.height - 128 * s, 190 * s, 92 * s);
    GUI.Panel(this.btn, C(0.3, 0.72, 0.62, 0.96));
    const st = gm.btnStyle;
    st.fontSize = Mathf.RoundToInt(23 * s); st.normal.textColor = Col.white;
    if (GUI.Button(this.btn, '💬 Sohbet\n' + this.NameOf(c), st)) this.StartGuest(c);
  },

  // ---------------- Konuşma içerikleri ----------------
  // [misafirin sözü, [[cevap, misafirin tepkisi, puan], ...]]
  Talks: {
    0: [["Merhaba! Otel çok şirin görünüyor. Siz mi işletiyorsunuz?", [["Evet, her köşesiyle biz ilgileniyoruz. Hoş geldiniz!", "Ne güzel, insan bunu hissediyor. Teşekkürler!", 2], ["Evet, bir şeye ihtiyacınız olursa bana söyleyin.", "Çok naziksiniz, aklımda tutacağım.", 1], ["Evet. Başka bir şey var mı?", "Ah... yok, yok. Peki.", -1]]],
        ["Buralarda yürüyüş yapılacak güzel bir yer var mı?", [["Otelin batısındaki bahçe akşamüstü harika olur, mutlaka gidin!", "Harika, gün batımında giderim!", 2], ["Caddenin sonunda küçük bir park var.", "Tamam, bakarım, teşekkürler.", 1], ["Bilmiyorum, hiç gitmedim.", "Hmm, anladım.", -1]]]],
    1: [["Hızlı Wi-Fi şifresi var mı? Bir saat sonra toplantım var.", [["Tabii! Şifre odanızdaki kartta. Sessiz bir masa da ayarlayabilirim.", "Süper, tam ihtiyacım olan şey. Teşekkürler!", 2], ["Resepsiyonda yazıyor.", "Peki, oradan alırım.", 1], ["İnternet bazen gidiyor, kusura bakmayın.", "Eyvah... bu hiç iyi olmadı.", -1]]],
        ["Yarın sabah çok erken çıkacağım, kahvaltı kaçta başlıyor?", [["Sizin için 6'da hafif bir kahvaltı hazırlatırım.", "Vay, bu çok düşünceli. Sağ olun!", 2], ["Yedide başlıyor.", "Biraz geç ama idare ederim.", 1], ["Erken çıkacaksanız yolda bir şey yersiniz.", "Haklısınız... sanırım.", -1]]]],
    2: [["İlk kez geliyorum! Mutlaka görmem gereken bir yer var mı?", [["Eski çarşıyı gezin, dönüşte otelin kafesinde kahve molası verin!", "Not aldım, çok teşekkürler!", 2], ["Haritada işaretli yerler var, resepsiyondan alabilirsiniz.", "Tamam, alırım.", 1], ["Her yer aynı, pek bir şey yok.", "Öyle mi... biraz hevesim kaçtı.", -1]]],
        ["Fotoğraf çekmek için otelde güzel bir köşe var mı?", [["Lobideki büyük kırmızı halının önü ve bahçedeki çiçekli ağaçlar tam fotoğraflık!", "Hemen çekiyorum, teşekkürler!", 2], ["Bahçe güzeldir.", "Tamam, bakarım.", 1], ["Pek yok açıkçası.", "Hmm, peki.", -1]]]],
    3: [["Balayımızdayız! Bu akşam eşime sürpriz yapmak istiyorum, bir fikriniz var mı?", [["Odanıza çiçek ve küçük bir pasta gönderelim, kimseye söylemem!", "Harikasınız! Çok sevinecek ♥", 2], ["Restoranda güzel bir masa ayırabilirim.", "Güzel fikir, teşekkürler!", 1], ["Bilmem, siz bilirsiniz.", "Hmm... kendim bir şey düşüneyim.", -1]]],
        ["Burası çok romantik! Kaç yıldır bu otel var?", [["Bu otel aileden kaldı, her köşesine sevgiyle bakıyoruz.", "Ne kadar güzel bir hikâye! ♥", 2], ["Epey oldu, sürekli yeniliyoruz.", "Belli oluyor, çok şık.", 1], ["Hatırlamıyorum.", "Öyle mi... peki.", 0]]]],
    4: [["Çocuklar çok enerjik, oyalanacak bir şey var mı?", [["Havuz ve bahçe tam onlara göre! Kafede çocuklara sıcak çikolata da var.", "Kurtardınız bizi, teşekkürler!", 2], ["Bahçede koşabilirler.", "Tamam, oraya çıkarırız.", 1], ["Lütfen lobide koşmasınlar.", "Peki... kusura bakmayın.", -1]]],
        ["Odamıza fazladan bir battaniye alabilir miyiz?", [["Hemen göndereyim, bir de yastık ekleyeyim mi?", "Çok iyi olur, çok teşekkürler!", 2], ["Tabii, temizlik ekibine söylerim.", "Teşekkürler.", 1], ["Dolaptakiler yetmiyor mu?", "Yetmiyor ki istedik...", -1]]]],
    5: [["Köpeğim Pamuk otelinize bayıldı! Yakında yürüyüş yapabileceğimiz yer var mı?", [["Bahçe tam ona göre! Su kabı da koyduk, Pamuk'a selamlar 🐾", "Ne kadar tatlısınız! Pamuk da teşekkür ediyor 🐾", 2], ["Bahçeye çıkarabilirsiniz.", "Tamam, teşekkürler.", 1], ["Köpeği lobide tasmalı tutun lütfen.", "Tabii... zaten tutuyorum.", -1]]],
        ["Odada köpeğim için bir minder olabilir mi?", [["Hemen yumuşak bir minder ve mama kabı gönderiyorum!", "Harika, çok düşünceli!", 2], ["Bakarım, varsa gönderirim.", "Teşekkürler.", 1], ["Köpekler yerde yatabilir.", "Hmm...", -1]]]],
    6: [["Takipçilerime otelinizi göstereceğim! Bir cümleyle anlatsanız?", [["Burada herkes misafir değil, ailemizin bir parçası ♥", "Bu çok güzel! Hemen paylaşıyorum ✨", 2], ["Temiz, rahat ve güler yüzlü bir otel.", "Kısa ve net, beğendim!", 1], ["Ne yazarsanız yazın.", "Peki... bakalım ne yazacağım.", -1]]],
        ["Odanın ışığı fotoğraf için biraz loş, ne yapabiliriz?", [["Size halka ışık getirebilirim, bir de pencere kenarında çekmeyi deneyin!", "Süpersiniz! Paylaşımda sizi etiketleyeceğim ✨", 2], ["Perdeyi açarsanız güzel olur.", "Deneyeceğim.", 1], ["Lamba bu kadar.", "Hmm, anladım.", -1]]]],
    7: [["Gençken bu şehre sık gelirdim. Çok değişmiş her yer!", [["Bize o zamanları anlatır mısınız? Çayınızı da ben ısmarlayayım.", "Ah, ne tatlı evladım! Seve seve anlatırım.", 2], ["Evet, çok değişti gerçekten.", "Öyle, öyle...", 1], ["Şimdi biraz işim var.", "Tabii, tabii, kusura bakma.", -1]]],
        ["Asansör nerede evladım? Merdiven biraz zor geliyor.", [["Gelin, birlikte gidelim, koluma girin.", "Allah razı olsun, ne iyi insansın!", 2], ["Lobinin sağında.", "Sağ ol.", 1], ["Tabelalarda yazıyor.", "Göremedim ama...", -1]]]],
    8: [["Biraz bütçem kısıtlı, yakında uygun yemek yiyebileceğim bir yer var mı?", [["Kafemizde öğrencilere indirim var, bir de akşam çorba ikramımız olur!", "Süpersiniz, çok teşekkürler!", 2], ["Caddenin köşesinde ucuz bir dürümcü var.", "Tamam, giderim.", 1], ["Burası pahalı bir yer değil zaten.", "Hmm, peki.", -1]]],
        ["Sınavım var, çalışabileceğim sessiz bir yer var mı?", [["Bekleme salonu sabahları çok sessiz, size bir de çay getireyim.", "Harika, tam ihtiyacım olan şey!", 2], ["Odanızda çalışabilirsiniz.", "Tamam, teşekkürler.", 1], ["Burası kütüphane değil.", "Haklısınız...", -1]]]],
    9: [["Sabah koşusu için güzel bir rota önerir misiniz?", [["Otelin önünden bahçeye, oradan caddenin sonuna kadar: tam 3 kilometre!", "Mükemmel, yarın deniyorum!", 2], ["Bahçede koşabilirsiniz.", "Tamam.", 1], ["Koşmayı pek bilmem.", "Peki.", 0]]],
        ["Havuz sabah kaçta açılıyor? Antrenman yapacağım.", [["Sizin için erkenden açtırırım, havlunuzu da hazır ederiz!", "Çok iyisiniz, teşekkürler!", 2], ["Sekizde açılıyor.", "Tamam, olur.", 1], ["Saatlerde değişiklik yapamayız.", "Hmm, anladım.", -1]]]],
  },
  Waiting: ["Sıra biraz uzun galiba, ne kadar bekleriz?", [["Çok özür dilerim, sizi hemen alacağız. Bu arada size bir içecek ikram edeyim mi?", "Ah, ne kadar naziksiniz, teşekkürler!", 2], ["Birkaç dakika sürer.", "Peki, bekleyelim.", 1], ["Herkes bekliyor.", "Hmm... tamam.", -1]]],
  Second() {
    const gm = GameManager.I, l = [
      ["Bu arada, otelin en sevdiğiniz köşesi neresi?", [["Lobi! Misafirleri karşılamayı çok seviyorum ♥", "Belli oluyor, çok sıcak karşılıyorsunuz!", 1], ["Bahçe, akşamları ışıklar yanınca çok güzel.", "Akşam bir bakayım o zaman!", 1], ["Hepsi aynı benim için.", "Öyle mi...", 0]]],
      ["Personeliniz çok ilgili, nasıl başarıyorsunuz?", [["Hepimiz bir aileyiz, birbirimize iyi bakıyoruz.", "Bu her halinizden belli ♥", 1], ["Herkes işini seviyor.", "Ne güzel!", 1], ["Maaşlarını veriyorum işte.", "Hmm... peki.", -1]]],
    ];
    if (gm.restaurant && gm.restaurant.Open) l.push(["Akşam yemeği için bir öneriniz var mı?", [["Restoranımızın tatlısını mutlaka deneyin, şefimizin imzası!", "Tatlıya hayır demem, gidiyorum!", 1], ["Restoranımız açık.", "Tamam, bakarım.", 1], ["Dışarıda bir şeyler bulursunuz.", "Peki...", -1]]]);
    if (gm.spa && gm.spa.Open) l.push(["Çok yoruldum, dinlenmek için ne önerirsiniz?", [["Spamızda masaj ve jakuzi var, size en iyi saati ayırayım!", "Harika, tam ihtiyacım olan şey!", 1], ["Odanızda dinlenebilirsiniz.", "Olur.", 0], ["Erken yatın.", "Hmm.", -1]]]);
    return l[Random.RangeInt(0, l.length)];
  },

  // ---------------- Başlat ----------------
  StartGuest(c) {
    const T = this.Talks[c.type] || this.Talks[0];
    const waiting = c.s === Customer.S.Queue || c.s === Customer.S.Seat;
    const talk = waiting && Random.value < 0.6 ? this.Waiting : T[Random.RangeInt(0, T.length)];
    this.Reset('guest');
    this.who = c; c.chatted = true;
    this.Say(false, talk[0]);
    this.choices = talk[1];
    Sfx.Play('pop', 0.6);
  },

  StartPost(p) {
    this.Reset('post');
    this.post = p;
    this.Say(false, p.text);
    this.choices = p.bad ? [
      ['Yaşadıklarınız için çok üzgünüz. Bir dahaki konaklamanızda sizi en güzel odamızda ağırlamak isteriz.', 'Bu ilgi için teşekkürler, bir şans daha vereceğim.', 2],
      ['Geri bildiriminiz için teşekkürler, ekibimizle ilgileniyoruz.', 'Umarım düzelir.', 1],
      ['Bence biraz abartıyorsunuz.', 'Bu cevaptan sonra hiç gelmem!', -2],
    ] : [
      ['Çok teşekkür ederiz! Sizi yine ağırlamak için sabırsızlanıyoruz ♥', 'Ben de tekrar gelmek için sabırsızlanıyorum! ♥', 2],
      ['Teşekkürler, yine bekleriz!', 'Mutlaka! 😊', 1],
      ['Tamam.', '...', 0],
    ];
    Sfx.Play('pop', 0.6);
  },

  Reset(mode) {
    this.open = true; this.mode = mode; this.who = null; this.post = null;
    this.msgs = []; this.choices = []; this.round = 0; this.mood = 0; this.typed = 0; this.busy = false; this.done = false;
    this.scroll = { x: 0, y: 0 }; this.input = '';
    const el = GUI.textFields.get('chatIn'); if (el) { el.value = ''; delete el.dataset.edited; }
  },

  Say(me, text) { this.msgs.push({ me, text }); this.wantBottom = true; },

  Pick(i) {
    const ch = this.choices[i];
    this.Say(true, ch[0]);
    this.choices = [];
    this.busy = true;
    setTimeout(() => {
      this.busy = false;
      if (!this.open) return;
      this.Say(false, ch[1]);
      this.mood += ch[2];
      this.round++;
      this.Next();
    }, 650);
  },

  Next() {
    if (this.mode === 'guest' && this.round === 1 && this.mood >= 0) {
      const t = this.Second();
      setTimeout(() => { if (!this.open) return; this.Say(false, t[0]); this.choices = t[1]; }, 500);
      return;
    }
    this.Finish();
  },

  // ---------------- Kendin yaz (Claude) ----------------
  async SendTyped(text) {
    text = String(text || '').trim();
    if (!text || this.busy || !this.sample) return;
    this.Say(true, text);
    this.choices = [];
    this.busy = true; this.typed++;
    const el = GUI.textFields.get('chatIn'); if (el) { el.value = ''; delete el.dataset.edited; }
    const gm = GameManager.I;
    const hist = this.msgs.map(m => (m.me ? 'Otel müdürü: ' : (this.mode === 'post' ? 'Yorumu yazan: ' : 'Misafir: ')) + m.text).join('\n');
    let prompt;
    if (this.mode === 'guest') {
      const c = this.who, tn = Customer.TypeNames[c.type] || 'misafir';
      prompt = 'Sevimli, aile dostu bir otel işletme oyunundasın ("' + gm.hotelName + '"). Bir misafiri canlandırıyorsun: adı ' + this.NameOf(c) + ', türü: ' + (tn || 'sıradan misafir') +
        (c.room ? ', Oda ' + c.room.Number : '') + '. Otel müdürüyle kısa bir sohbettesiniz.\n\nKonuşma:\n' + hist +
        '\n\nMisafir olarak müdürün son mesajına Türkçe, samimi, en fazla 2 kısa cümleyle cevap ver. Oyunun dünyasında kal, gerçek kişi ya da yer bilgisi verme. ' +
        'Müdürün mesajı seni ne kadar memnun etti: -1 (kaba), 0 (sıradan), 1 (iyi), 2 (çok nazik/yardımsever). ' +
        (this.typed >= 3 ? 'Bu son mesaj, sohbeti nazikçe bitir. ' : '') +
        'Sadece şu JSON ile cevap ver: {"reply": "...", "mood": sayı}';
    } else {
      prompt = 'Sevimli bir otel işletme oyununda ("' + gm.hotelName + '"), Otelgram adlı sosyal medyada ' + this.post.author + ' kullanıcısı otel hakkında şu yorumu yazdı:\n"' + this.post.text + '"\n\n' +
        'Otel müdürü şöyle yanıt verdi:\n"' + text + '"\n\nYorumu yazan kişi olarak müdürün yanıtına Türkçe, en fazla 2 kısa cümleyle karşılık ver. ' +
        'Yanıt seni ne kadar memnun etti: -2 (kaba), -1 (soğuk), 0 (sıradan), 1 (iyi), 2 (çok ilgili ve kibar). Sadece şu JSON ile cevap ver: {"reply": "...", "mood": sayı}';
    }
    try {
      const r = await this.sample.json(prompt, { modelTier: 'quick', cache: false });
      if (!this.open) return;
      const mood = Mathf.Clamp(Math.round(+r.mood || 0), -2, 2);
      this.Say(false, String(r.reply || '😊').slice(0, 220));
      this.mood += mood;
      this.busy = false;
      if (this.mode === 'post' || this.typed >= 3) this.Finish();
    } catch (e) {
      this.busy = false;
      if (e && e.code === 'not_granted') { this.sample = null; this.Say(false, '(Serbest yazışma için Claude izni verilmedi. Hazır cevaplardan seçebilirsin.)'); }
      else this.Say(false, '(Şu an cevap gelmedi, birazdan tekrar dene ya da hazır cevaplardan seç.)');
      if (this.mode === 'post' || !this.choices.length) this.Finish();
    }
  },

  // ---------------- Sonuç ----------------
  Finish() {
    this.done = true; this.choices = [];
    const gm = GameManager.I, m = this.mood;
    if (this.mode === 'guest' && this.who) {
      const c = this.who;
      c.satAdj = (c.satAdj || 0) + Mathf.Clamp(m * 0.25, -0.5, 1);
      const pos = Vec.add(c.transform.position, V(0, 2.8, 0));
      if (m >= 3) {
        const tip = Mathf.RoundToInt(Mathf.Clamp(15 + gm.Unlocked() * 4, 15, 120));
        gm.money += tip; Sfx.Play('coin');
        gm.FloatText(pos, '♥♥ +' + Eco.TL(tip), C(1, 0.5, 0.75), 0.14);
        this.result = this.NameOf(c) + ' sohbetten çok hoşlandı! ' + Eco.TL(tip) + ' bahşiş bıraktı.';
      } else if (m >= 1) { gm.FloatText(pos, '♥', C(1, 0.5, 0.75), 0.14); this.result = this.NameOf(c) + ' sohbetten memnun kaldı.'; }
      else if (m < 0) { gm.FloatText(pos, '☹', C(0.7, 0.7, 0.75), 0.14); this.result = this.NameOf(c) + ' pek hoşlanmadı.'; }
      else this.result = 'Kısa bir sohbet oldu.';
    } else if (this.mode === 'post' && this.post) {
      const p = this.post;
      p.reply = this.msgs.filter(x => x.me).map(x => x.text).pop() || '';
      p.react = this.msgs.length > 2 ? this.msgs[this.msgs.length - 1].text : '';
      const gain = m >= 2 ? Mathf.Max(3, Math.trunc(p.likes / (p.bad ? 6 : 10))) : m >= 1 ? Mathf.Max(1, Math.trunc(p.likes / 15)) : m < 0 ? -Mathf.Max(2, Math.trunc(p.likes / 8)) : 0;
      Social.followers = Mathf.Max(10, Social.followers + gain);
      if (p.bad && m >= 2) p.bad = false;
      this.result = gain > 0 ? 'Yanıtın beğenildi: +' + gain + ' takipçi' : gain < 0 ? 'Yanıtın tepki çekti: ' + gain + ' takipçi' : 'Yanıt yayımlandı.';
      gm.Save();
    }
    Sfx.Play(m >= 2 ? 'ding' : 'pop', 0.6);
  },

  Close() {
    // yarıda kapatılırsa da o ana kadarki sohbet sayılır
    if (!this.done && this.msgs.some(m => m.me)) this.Finish();
    this.open = false;
    const el = GUI.textFields.get('chatIn'); if (el) { el.value = ''; el.blur(); el.style.display = 'none'; }
    if (this.result && GameManager.I) GameManager.I.Notify(this.result);
    this.result = null;
  },

  // ---------------- Pencere ----------------
  OnGUI() {
    if (!this.open || !GameManager.I) return;
    const gm = GameManager.I, s = gm.UIScale, SW = Screen.width, SH = Screen.height;
    if (!this.st) {
      this.st = {
        head: new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleLeft, fontStyle: FontStyle.Bold, wordWrap: false }),
        sub: new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleLeft, wordWrap: false }),
        msg: new GUIStyle(GUI.skin.label, { alignment: TextAnchor.UpperLeft, wordWrap: true }),
        btn: new GUIStyle(GUI.skin.label, { alignment: TextAnchor.MiddleCenter, fontStyle: FontStyle.Bold, wordWrap: true }),
      };
    }
    const st = this.st;
    GUI.Block();
    GUI.color = C(0, 0, 0, 0.5); GUI.DrawTexture(new Rect(0, 0, SW, SH), 'white'); GUI.color = Col.white;

    const w = Mathf.Min(SW - 32 * s, 780 * s), h = Mathf.Min(SH - 60 * s, 980 * s);
    const r = new Rect((SW - w) / 2, (SH - h) / 2, w, h);
    GUI.Panel(r, C(0.11, 0.13, 0.22, 0.98));
    const accent = this.mode === 'post' ? C(0.85, 0.35, 0.6, 1) : C(0.3, 0.72, 0.62, 1);
    GUI.Panel(new Rect(r.x, r.y, r.width, 96 * s), accent);

    // başlık
    st.head.fontSize = Mathf.RoundToInt(30 * s); st.head.normal.textColor = Col.white;
    st.sub.fontSize = Mathf.RoundToInt(19 * s); st.sub.normal.textColor = C(1, 1, 1, 0.9);
    let title, sub;
    if (this.mode === 'guest') {
      const c = this.who;
      title = '💬 ' + this.NameOf(c);
      sub = (Customer.TypeNames[c.type] || 'Misafir') + (c.room ? ' · Oda ' + c.room.Number : '') + (c.vip ? ' · VIP' : '');
    } else { title = 'Otelgram yanıtı'; sub = this.post.author; }
    GUI.Label(new Rect(r.x + 24 * s, r.y + 8 * s, r.width - 120 * s, 46 * s), title, st.head);
    GUI.Label(new Rect(r.x + 24 * s, r.y + 54 * s, r.width - 120 * s, 32 * s), sub, st.sub);
    st.btn.fontSize = Mathf.RoundToInt(28 * s); st.btn.normal.textColor = Col.white;
    if (GUI.Button(new Rect(r.xMax - 80 * s, r.y + 18 * s, 60 * s, 60 * s), '✕', st.btn)) { this.Close(); return; }

    // alt bölüm: seçenekler / yazma / kapat
    const pad = 22 * s, iw = r.width - 2 * pad;
    st.btn.fontSize = Mathf.RoundToInt(21 * s);
    const optH = this.choices.map(ch => Mathf.Max(60 * s, Popups.CalcHeight(st.btn, ch[0], iw - 30 * s) + 22 * s));
    const canType = !!this.sample && !this.done && (this.mode === 'post' ? this.typed === 0 : this.typed < 3);
    let bottomH = 0;
    const canEnd = !this.busy && !this.choices.length && this.typed > 0;
    if (this.done) bottomH = 70 * s + 40 * s;
    else { for (const x of optH) bottomH += x + 10 * s; if (canType) bottomH += 74 * s; if (this.busy) bottomH += 40 * s; if (canEnd) bottomH += 70 * s; }
    bottomH += 16 * s;

    // mesajlar
    const area = new Rect(r.x + 12 * s, r.y + 106 * s, r.width - 24 * s, r.height - 106 * s - bottomH);
    st.msg.fontSize = Mathf.RoundToInt(22 * s);
    const bw = area.width * 0.78, inner = bw - 32 * s;
    const heights = this.msgs.map(m => Popups.CalcHeight(st.msg, m.text, inner) + 24 * s);
    let total = 10 * s; for (const x of heights) total += x + 12 * s;
    const view = new Rect(0, 0, area.width - 14 * s, Mathf.Max(total, area.height));
    if (this.wantBottom) { this.scroll = { x: 0, y: Mathf.Max(0, total - area.height) }; this.wantBottom = false; }
    this.scroll = GUI.BeginScrollView(area, this.scroll, view);
    let y = 10 * s;
    for (let i = 0; i < this.msgs.length; i++) {
      const m = this.msgs[i], bh = heights[i];
      const br = new Rect(m.me ? view.width - bw - 6 * s : 6 * s, y, bw, bh);
      GUI.Panel(br, m.me ? C(1, 0.82, 0.4, 1) : C(0.93, 0.94, 0.98, 1));
      st.msg.normal.textColor = C(0.13, 0.13, 0.18);
      GUI.Label(new Rect(br.x + 16 * s, br.y + 12 * s, inner, bh - 20 * s), m.text, st.msg);
      y += bh + 12 * s;
    }
    GUI.EndScrollView();

    let by = r.yMax - bottomH + 4 * s;
    if (this.done) {
      st.sub.fontSize = Mathf.RoundToInt(20 * s); st.sub.normal.textColor = C(1, 0.86, 0.42);
      st.sub.alignment = TextAnchor.MiddleCenter;
      GUI.Label(new Rect(r.x + pad, by, iw, 36 * s), this.result || '', st.sub);
      st.sub.alignment = TextAnchor.MiddleLeft;
      const cb = new Rect(r.x + pad, by + 40 * s, iw, 62 * s);
      GUI.Panel(cb, Popups.Gold);
      st.btn.normal.textColor = C(0.14, 0.1, 0.06); st.btn.fontSize = Mathf.RoundToInt(24 * s);
      if (GUI.Button(cb, this.mode === 'post' ? 'Tamam' : 'Görüşürüz 👋', st.btn)) this.Close();
      return;
    }
    if (this.busy) {
      st.sub.fontSize = Mathf.RoundToInt(20 * s); st.sub.normal.textColor = C(0.8, 0.83, 0.9);
      GUI.Label(new Rect(r.x + pad, by, iw, 34 * s), (this.mode === 'post' ? this.post.author : this.NameOf(this.who)) + ' yazıyor' + '.'.repeat(1 + Math.floor(Time.unscaledTime * 3) % 3), st.sub);
      by += 40 * s;
    }
    for (let i = 0; i < this.choices.length; i++) {
      const ch = this.choices[i], br = new Rect(r.x + pad, by, iw, optH[i]);
      GUI.Panel(br, C(0.55, 0.75, 0.95, 1));
      st.btn.normal.textColor = C(0.1, 0.12, 0.2); st.btn.fontSize = Mathf.RoundToInt(21 * s);
      if (GUI.Button(br, ch[0], st.btn) && !this.busy) { Sfx.Play('pop', 0.5); this.Pick(i); return; }
      by += optH[i] + 10 * s;
    }
    if (canEnd) {
      const eb = new Rect(r.x + pad, by, iw, 60 * s);
      GUI.Panel(eb, Popups.Gold);
      st.btn.normal.textColor = C(0.14, 0.1, 0.06); st.btn.fontSize = Mathf.RoundToInt(22 * s);
      if (GUI.Button(eb, 'Sohbeti bitir 👋', st.btn)) { this.Finish(); return; }
      by += 70 * s;
    }
    if (canType) {
      const sendW = 150 * s, fr = new Rect(r.x + pad, by, iw - sendW - 10 * s, 62 * s);
      this.input = GUI.TextField(fr, this.input, 160, 'chatIn');
      const el = GUI.textFields.get('chatIn');
      if (el) {
        el.placeholder = this.choices.length ? 'ya da kendin yaz…' : 'Kendin yaz…';
        if (!el.dataset.enter) { el.dataset.enter = '1'; el.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = el.value; Chat.input = ''; Chat.SendTyped(v); } }); }
      }
      const sb = new Rect(fr.xMax + 10 * s, by, sendW, 62 * s);
      GUI.Panel(sb, this.busy ? Popups.Grey : Popups.Green);
      st.btn.normal.textColor = C(0.1, 0.15, 0.1); st.btn.fontSize = Mathf.RoundToInt(22 * s);
      if (GUI.Button(sb, 'Gönder', st.btn) && !this.busy) { const v = el ? el.value : this.input; this.input = ''; this.SendTyped(v); }
    }
  },
};
