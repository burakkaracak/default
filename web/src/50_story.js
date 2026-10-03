// Hikaye modu "Elif'in Oteli": 8 bolum. Hikaye tum oteller icin ortaktir.
// Hedefler bolum basinda otelin buyuklugune gore olceklenir, boylece buyuk bir otelde de anlamli kalir.
// (Story.cs'den taşındı)
class Story {
  static P = 'o4_story_';
  static started = false;
  static chapter = 0;          // 0..7, 8 = hikaye bitti
  static scale = 1;
  static followersBase = 0;
  static officialBase = 0;
  static debtPaid = false;
  static prog = new Map();
  static notified = false;

  static Count = 8;
  static get Finished() { return Story.started && Story.chapter >= Story.Count; }
  static get Active() { return Story.started && Story.chapter < Story.Count; }

  static get G() { return GameManager.I; }

  static get Ad() {
    const G = Story.G;
    const n = G ? G.managerName : '';
    return (n == null || String(n).trim() === '') || n === 'Müdür' ? 'Elif' : n;
  }

  static Titles = [
    'Anneannenin Mektubu', 'Bankanın Mektubu', 'Karşıdaki Rakip', 'Sadık Müşteriler',
    "Kaan Bey'in Oyunu", 'Resmi Yıldız', "Bodrum'a Yelken", 'Kapadokya Rüyası',
  ];

  static Summaries = [
    'Anneanne Saadet otelini sana bıraktı. Misafirleri mutlu ederek otelin adını yeniden duyur.',
    'Bankada eski bir borç çıktı. Borcu öde, oteli temiz ve düzenli tut.',
    "Kaan Bey karşıya Kaan Palas'ı açtı ve oteli satın almak istiyor. Misafirlerini mutlu et, Otelgram'da büyü.",
    'Telefonlar susmuyor. Rezervasyonları ağırla, yükseltme isteklerini karşıla, istekleri yerine getir.',
    "Kaan Bey Otelgram'da kötü yorumlarla otelini karalıyor. En iyi cevap: kusursuz hizmet.",
    'Bakanlık seni yıldız sınavına davet ediyor. Belgeni yükselt ve odalarına kimlik kazandır.',
    "Anneannenin gençken pansiyon işlettiği Bodrum'da bir otel satılık. Zincirini büyüt.",
    'Anneannenin son hayali: peri bacalarının arasında, balonların altında bir otel.',
  ];

  // Hedef: { text, cur: () => int, target, Done }
  static Goal = class {
    constructor(o) { this.text = o.text; this.cur = o.cur; this.target = o.target; }
    get Done() { return this.cur() >= this.target; }
  };

  static Get(k) { return Story.prog.has(k) ? Story.prog.get(k) : 0; }

  static get Debt() { return 2500 * Story.scale; }
  static get Reward() { return Story.chapter >= Story.Count ? 0 : [500, 300, 800, 1000, 1500, 2000, 3000, 10000][Story.chapter] * Story.scale; }

  static Kinds() {
    let n = 0;
    for (const r of Story.G.rooms) if (r.Unlocked && r.kind !== RoomKinds.Klasik) n++;
    return n;
  }

  static Goals() {
    const l = [];
    const G = Story.G;
    if (!Story.Active || !G) return l;
    const S = Story.scale;
    const Goal = Story.Goal, Get = Story.Get;
    switch (Story.chapter) {
      case 0:
        l.push(new Goal({ text: 'Misafir ağırla', cur: () => Get('guest'), target: 10 + 3 * S }));
        l.push(new Goal({ text: 'Puan ortalaması 4,0 (x10)', cur: () => Mathf.RoundToInt(G.Stars * 10), target: 40 }));
        break;
      case 1:
        l.push(new Goal({ text: 'Bankaya borcu öde (' + Eco.TL(Story.Debt) + ')', cur: () => Story.debtPaid ? 1 : 0, target: 1 }));
        l.push(new Goal({ text: 'Oda temizle', cur: () => Get('cleaned'), target: 8 + 2 * S }));
        break;
      case 2:
        l.push(new Goal({ text: '♥♥ ile ayrılan misafir (4,5+)', cur: () => Get('happy'), target: 6 + S }));
        l.push(new Goal({ text: "Otelgram'da yeni takipçi", cur: () => Mathf.Max(0, Social.followers - Story.followersBase), target: 100 + 20 * S }));
        break;
      case 3:
        l.push(new Goal({ text: 'Rezervasyonlu misafiri yerleştir', cur: () => Get('reservation'), target: 3 }));
        l.push(new Goal({ text: 'Oda yükseltme isteğini kabul et', cur: () => Get('upgrade'), target: 2 }));
        l.push(new Goal({ text: 'Misafir isteğini yerine getir', cur: () => Get('requests'), target: 5 + S }));
        break;
      case 4:
        l.push(new Goal({ text: '4+ puanla ayrılan misafir', cur: () => Get('good'), target: 15 + 3 * S }));
        l.push(new Goal({ text: 'Puan ortalaması 4,5 (x10)', cur: () => Mathf.RoundToInt(G.Stars * 10), target: 45 }));
        break;
      case 5:
        if (Story.officialBase < 5)
          l.push(new Goal({ text: 'Resmi yıldız belgesi ' + (Story.officialBase + 1) + '★', cur: () => StarExam.official, target: Story.officialBase + 1 }));
        else
          l.push(new Goal({ text: 'VIP misafir ağırla', cur: () => Get('vipguest'), target: 4 + Math.floor(S / 2) }));
        l.push(new Goal({ text: 'Özel tipli oda (Menü > Otel > Tip)', cur: () => Story.Kinds(), target: 2 }));
        break;
      case 6:
        l.push(new Goal({ text: 'Bodrum otelini aç (Hikâye sekmesi)', cur: () => Chain.Owns(1) ? 1 : 0, target: 1 }));
        l.push(new Goal({ text: "Bodrum'da misafir ağırla", cur: () => Get('guest_c1'), target: 15 }));
        break;
      case 7:
        l.push(new Goal({ text: 'Kapadokya otelini aç', cur: () => Chain.Owns(2) ? 1 : 0, target: 1 }));
        l.push(new Goal({ text: "Kapadokya'da misafir ağırla", cur: () => Get('guest_c2'), target: 15 }));
        l.push(new Goal({ text: 'Başkanlık Süiti kur (herhangi bir otelde)', cur: () => Get('suite'), target: 1 }));
        break;
    }
    return l;
  }

  static get Ready() {
    if (!Story.Active) return false;
    const g = Story.Goals();
    if (g.length === 0) return false;
    for (const x of g) if (!x.Done) return false;
    return true;
  }

  // ---- Ilerleme ----
  static Track(k, n = 1) {
    if (!Story.Active) return;
    Story.prog.set(k, Story.Get(k) + n);
  }

  static OnGuest(c, sat) {
    if (!Story.Active) return;
    Story.Track('guest');
    if (Chain.cur > 0) Story.Track('guest_c' + Chain.cur);
    if (sat >= 4.5) Story.Track('happy');
    if (sat >= 4) Story.Track('good');
    if (c.vip) Story.Track('vipguest');
  }

  // Saniyede bir: bolum bittiyse haber ver
  static Tick() {
    const G = Story.G;
    if (!Story.Active || Story.notified || !G) return;
    if (Story.Ready) {
      Story.notified = true;
      G.Notify('Hikâye bölümü tamamlandı! Menü > Hikâye');
      Sfx.Play('unlock', 0.6);
    }
  }

  // ---- Bolumler ----
  static Begin() {
    if (Story.started) return;
    Story.started = true;
    Story.StartChapter(0);
  }

  static ComputeScale() {
    let sum = 0;
    for (const r of Story.G.rooms) if (r.Unlocked && !r.IsSuitePart) sum += r.Price;
    return Mathf.Clamp(Mathf.RoundToInt(sum / 400), 1, 12);
  }

  static StartChapter(c) {
    Story.chapter = c;
    Story.prog.clear();
    Story.notified = false;
    Story.scale = Story.ComputeScale();
    Story.followersBase = Social.followers;
    Story.officialBase = StarExam.official;
    Story.debtPaid = false;
    Story.Save();
    Story.Intro(c);
  }

  static PayDebt() {
    const G = Story.G;
    if (!Story.Active || Story.chapter !== 1 || Story.debtPaid || !G.CanPay(Story.Debt)) return;
    G.money -= Story.Debt;
    Report.Other(Story.Debt);
    Story.debtPaid = true;
    Sfx.Play('coin');
    Popups.Show('Borç kapandı!', 'Banka Müdürü Necati Bey: "Tebrikler ' + Story.Ad + ' Hanım, otelin tapusu artık tamamen sizin. Anneanneniz bu günü görse çok sevinirdi."', 'BANKA')
      .Add('Çok şükür!', null, Popups.Gold);
    Story.Save();
  }

  static Complete() {
    if (!Story.Ready) return;
    const G = Story.G;
    const reward = Story.Reward;
    G.money += reward;
    Report.Bonus(reward);
    Sfx.Play('coin');
    const done = Story.chapter;
    Story.Outro(done, reward);
    if (done + 1 >= Story.Count) {
      Story.chapter = Story.Count;
      Story.Save();
      return;
    }
    Story.StartChapter(done + 1);
  }

  static Say(tag, title, body, btn, c) {
    const p = Popups.Show(title, body, tag);
    p.accent = c;
    p.Add(btn, null, c);
    return p;
  }

  static Rose = C(1, 0.6, 0.75, 1);
  static Sea = C(0.45, 0.75, 1, 1);
  static Rival = C(0.95, 0.45, 0.4, 1);

  static Intro(c) {
    const G = Story.G, Say = Story.Say, Ad = Story.Ad;
    const tag = 'BÖLÜM ' + (c + 1) + ' · ' + Eco.Upper(Story.Titles[c]);
    switch (c) {
      case 0:
        Say(tag, 'Sevgili ' + Ad + ',',
          'Bu mektubu okuyorsan, otelim artık senin. Bu duvarlar kırk yıl boyunca misafirlerin kahkahalarıyla doldu. Biraz yorgun görünüyor, biliyorum. Ama sen ona yeniden hayat verebilirsin.\n\nKalbinin sesini dinle, misafirlerine ailen gibi bak.\n\nSeni çok seven anneannen Saadet',
          'Söz veriyorum anneanne', Story.Rose);
        Say(tag, "Elif'in Oteli", 'Hikâye başladı! Her bölümün hedefleri Menü > Hikâye sekmesinde. Hedefler tamamlanınca bölüm ödülünü alıp sonraki bölüme geçersin.', 'Hadi başlayalım!', Popups.Gold);
        break;
      case 1:
        Say(tag, 'Banka Müdürü Necati Bey',
          '"Merhaba ' + Ad + ' Hanım. Anneannenizin bankamıza eski bir borcu var: ' + Eco.TL(Story.Debt) + '. Ödenene kadar otelin tapusu bizde rehinli. Acele etmeyin ama unutmayın, bu borcun kapanması gerek."',
          'Ödeyeceğim', Popups.Blue);
        break;
      case 2:
        Say(tag, 'Kapıda biri var: Kaan Bey',
          '"Demek anneannenin oteline artık sen bakıyorsun. Karşıya Kaan Palas\'ı açtım. Misafirlerinin hepsi bana gelecek, göreceksin. Bu eski binayı bana satmaya ne dersin?"',
          'Asla satmam!', Story.Rival);
        break;
      case 3:
        Say(tag, 'Telefonlar susmuyor!',
          'Otelin adı duyuldu. Misafirler artık önceden arayıp oda ayırtıyor, bazıları da gelince daha iyi bir oda istiyor.\n\nRezervasyonları kabul et, istekleri karşıla: sadık müşteri böyle kazanılır.',
          'Hazırım', Popups.Gold);
        break;
      case 4:
        Social.Add('@kaanpalas_hayrani', G.hotelName + ' çok eski ve sıkıcı. Karşıdaki Kaan Palas çok daha iyi!', Random.RangeInt(60, 100), true, 0);
        Social.Add('@kaanpalas_hayrani', 'Bence kimse ' + G.hotelName + "'e gitmesin, hizmet berbat.", Random.RangeInt(60, 100), true, 0);
        Say(tag, "Otelgram'da garip yorumlar",
          "Aynı hesaptan art arda kötü yorumlar geliyor: @kaanpalas_hayrani. Kaan Bey'in oyunu belli!\n\nOna en iyi cevap: misafirlerini öyle mutlu et ki, iyi yorumlar kötüleri gölgede bıraksın.",
          'Kusursuz hizmet!', Story.Rival);
        break;
      case 5:
        Say(tag, 'Bakanlıktan bir mektup',
          "Turizm Bakanlığı otelini resmi yıldız sınavına davet ediyor. Kaan Palas'ın belgesi 4 yıldız.\n\nŞartları tamamla, sınava başvur (Menü > Görevler) ve odalarına kimlik kazandır: Aile, Balayı, İş ya da Ekonomik oda.",
          'Başvuracağım', Popups.Gold);
        break;
      case 6:
        Say(tag, "Bodrum'dan bir telefon",
          'Kaptan Yusuf: "Anneannen gençken Bodrum\'da küçük bir pansiyon işletirdi, bilir misin? O bina satılık! Beyaz duvarlar, deniz, palmiyeler... Zincirini büyütmek için tam zamanı."\n\nBodrum otelini Menü > Hikâye sekmesinden açabilirsin.',
          'Yelkenler fora!', Story.Sea);
        break;
      case 7:
        Say(tag, 'Anneannenin son hayali',
          'Balon pilotu Ayşe Hanım yazdı: "Anneanneniz yıllar önce buraya geldiğinde, peri bacalarının arasında bir otel açmayı hayal etmişti. Sabahları balonlar penceresinin önünden geçecekti. Bu hayali siz gerçekleştirin."',
          'Gerçekleştireceğim', Story.Rose);
        break;
    }
  }

  static Outro(c, reward) {
    const G = Story.G, Say = Story.Say, Ad = Story.Ad;
    const tag = 'BÖLÜM ' + (c + 1) + ' TAMAMLANDI';
    const r = '\n\nÖdül: ' + Eco.TL(reward);
    switch (c) {
      case 0: Say(tag, 'Otel yeniden canlandı', 'Lobide yine kahkahalar var. Komşular "Saadet Hanım\'ın oteli yeniden açılmış!" diye konuşuyor.' + r, 'Devam', Popups.Gold); break;
      case 1: Say(tag, 'Tapu artık senin', 'Borç kapandı, otel tamamen senin. Şimdi büyüme zamanı.' + r, 'Devam', Popups.Gold); break;
      case 2: Say(tag, 'Kaan Bey bozuldu', 'Misafirlerin seni seçti. Kaan Bey karşıdan pencereden bakıp söyleniyor.' + r, 'Devam', Popups.Gold); break;
      case 3: Say(tag, 'Sadık müşteriler', 'Misafirler artık seni arayıp yer ayırtıyor. Güven kazandın.' + r, 'Devam', Popups.Gold); break;
      case 4: Say(tag, 'Gerçek ortaya çıktı', "Otelgram'da herkes kötü yorumların sahte olduğunu anladı. @kaanpalas_hayrani hesabı kapandı!" + r, 'Devam', Popups.Gold); break;
      case 5: Say(tag, 'Resmi olarak tescilli', 'Otelin artık resmi olarak daha yıldızlı ve odaların her misafire göre.' + r, 'Devam', Popups.Gold); break;
      case 6: Say(tag, "Bodrum'da güneş", 'Bodrum otelin denize karşı ilk misafirlerini ağırladı. Kaptan Yusuf gururla el sallıyor.' + r, 'Devam', Story.Sea); break;
      case 7:
        Say(tag, "Kaan Bey'den bir ziyaret",
          '"Kabul ediyorum ' + Ad + ", sen benden iyisin. Üç şehirde üç otel... Artık rakip değil, dostuz. Bir gün Kaan Palas'ı da sana devretsem şaşırma.\"",
          'Dostluğa!', Story.Rival);
        Say('HİKÂYENİN SONU', 'Otel İmparatoriçesi ' + Ad,
          "Anneanne Saadet'in eski mektubunun arkasında bir not daha varmış:\n\n\"Biliyordum. Kalbinin sesini dinleyeceğini biliyordum.\"\n\nHikâye bitti ama otellerin seni bekliyor!" + r,
          '♥', Story.Rose);
        if (G) G.Celebrate('Otel İmparatoriçesi ' + Ad + '!', "Elif'in Oteli hikâyesi tamamlandı. Üç şehirde üç otel!");
        break;
    }
  }

  // Test icin: sayac hedeflerini doldur
  static TestFill() {
    for (const k of ['guest', 'cleaned', 'happy', 'good', 'reservation', 'upgrade', 'requests', 'vipguest', 'guest_c1', 'guest_c2', 'suite'])
      Story.prog.set(k, 999);
    Story.followersBase = -100000;
    for (let i = 0; i < 20; i++) Story.G.AddRating(5);
  }

  // ---- Kayit (tum oteller icin ortak) ----
  static Save() {
    const P = Story.P;
    Store.SetInt(P + 'on', Story.started ? 1 : 0);
    Store.SetInt(P + 'ch', Story.chapter);
    Store.SetInt(P + 'scale', Story.scale);
    Store.SetInt(P + 'fol', Story.followersBase);
    Store.SetInt(P + 'off', Story.officialBase);
    Store.SetInt(P + 'debt', Story.debtPaid ? 1 : 0);
    const parts = [];
    for (const [k, v] of Story.prog) parts.push(k + '=' + v);
    Store.SetString(P + 'prog', parts.join(';'));
  }

  static Load() {
    const P = Story.P;
    Story.started = Store.GetInt(P + 'on', 0) === 1;
    Story.chapter = Store.GetInt(P + 'ch', 0);
    Story.scale = Mathf.Max(1, Store.GetInt(P + 'scale', 1));
    Story.followersBase = Store.GetInt(P + 'fol', 0);
    Story.officialBase = Store.GetInt(P + 'off', 1);
    Story.debtPaid = Store.GetInt(P + 'debt', 0) === 1;
    Story.prog.clear();
    Story.notified = false;
    for (const part of Store.GetString(P + 'prog', '').split(';')) {
      const kv = part.split('=');
      if (kv.length === 2 && /^\s*[-+]?\d+\s*$/.test(kv[1])) Story.prog.set(kv[0], parseInt(kv[1], 10));
    }
  }
}
