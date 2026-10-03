// Isimli sadik misafirler: her biri 3 ziyaretlik bir hikayeye sahip.
// Memnun ayrilirlarsa hikaye ilerler, son ziyarette kalici bir hediye birakirlar.
// (Regulars.cs'den taşındı)
// Def: { id, name, title, look, partner, type (Customer.G), arrive[], success[], request[], fail, minLevel[], reward[] }
// Not: type değerleri Customer.G sayılarıdır (Normal 0, Is 1, Turist 2, Balayi 3, Aile 4); dosya sırası nedeniyle
// burada sayı olarak yazıldı.
class Regulars {
  static All = [
    {
      id: 'nermin', name: 'Nermin Hanım', title: 'Yazar', look: 'character-female-c', partner: null, type: 0 /* Customer.G.Normal */,
      arrive: [
        '"Merhaba! Ben Nermin, yazarım. Yeni romanımı bitirmek için sessiz bir oda arıyorum. Umarım burası doğru yer."',
        '"Yine ben! Geçen sefer burada çok güzel yazdım. Bu kez de kahvemi eksik etmeyin lütfen."',
        '"Son bölümü yazmaya geldim. Kitabın sonu burada, bu otelde bitecek."',
      ],
      success: [
        'Nermin Hanım çok memnun ayrıldı: "Tam 20 sayfa yazdım! Yine geleceğim."',
        '"Kahveler, sessizlik, her şey mükemmeldi. Kitabım şekilleniyor."',
        'Nermin Hanım kitabını bitirdi ve otelinize ithaf etti! Kitap çıkınca binlerce okur oteli merak etti. (+800 Otelgram takipçisi)',
      ],
      fail: 'Nermin Hanım biraz hayal kırıklığıyla ayrıldı. Belki bir dahaki sefere...',
      request: ['Sessizlik lütfen!', 'Kahve lütfen!', 'Kahve lütfen!'],
      minLevel: [1, 2, 2], reward: [300, 600, 2000],
    },
    {
      id: 'kemal', name: 'Kemal ve Saadet', title: 'Emekli çift', look: 'character-male-a', partner: 'character-female-a', type: 3 /* Customer.G.Balayi */,
      arrive: [
        '"Kırk yıllık evliliğimizin yıldönümü! Bize güzel bir oda verir misiniz evladım?"',
        '"Geçen yıl burada çok mutlu olduk. Bu sefer torunlarımızın fotoğraflarını getirdik, size de göstereceğiz!"',
        '"Bu otel artık bizim ikinci evimiz. Bu sefer size bir sürprizimiz var."',
      ],
      success: [
        '"Bize gençliğimizi hatırlattınız!" Kemal Bey seni kocaman kucakladı.',
        'Saadet Hanım el örgüsü bir şal hediye etti. Lobide çok güzel duruyor.',
        'Çift oteli tüm arkadaşlarına anlattı. Artık misafirler daha cömert bahşiş bırakıyor! (Bahşişler kalıcı olarak +%10)',
      ],
      fail: 'Çift biraz üzgün ayrıldı. Yıldönümleri için daha güzel bir oda bekliyorlardı.',
      request: ['Çiçek lütfen!', 'Çay getirir misin?', 'Pasta lütfen!'],
      minLevel: [2, 2, 3], reward: [400, 700, 2500],
    },
    {
      id: 'mert', name: 'Mert', title: 'Genç girişimci', look: 'character-male-d', partner: null, type: 1 /* Customer.G.Is */,
      arrive: [
        '"Merhaba, ben Mert. Şirketim için yatırımcı toplantım var. Hızlı internet ve sessiz bir oda şart!"',
        '"Yatırımı aldık! Şimdi ekibimle şehirdeyim, yine burayı seçtim."',
        '"Şirket büyüdü! Tüm iş seyahatlerimizi size yönlendirmek istiyorum. Son bir kez bakalım."',
      ],
      success: [
        '"Toplantı harika geçti, bana şans getirdiniz!"',
        'Mert ekibine oteli övdü. İş dünyasında adın duyulmaya başladı.',
        "Mert'in şirketiyle anlaşma yapıldı: İş insanları artık daha sık gelecek ve %10 daha fazla ödeyecek!",
      ],
      fail: 'Mert aceleyle ayrıldı: "Bu sefer olmadı, işlerim aksadı."',
      request: ['İnternet şifresi?', 'Kahve lütfen!', 'Ütü lazım!'],
      minLevel: [1, 2, 3], reward: [350, 700, 2500],
    },
    {
      id: 'selin', name: 'Selin', title: 'Gezgin fotoğrafçı', look: 'character-female-b', partner: null, type: 2 /* Customer.G.Turist */,
      arrive: [
        '"Selam! Ben Selin, seyahat fotoğrafları çekiyorum. Otelinizi takipçilerime göstermek istiyorum!"',
        '"Geçen paylaşımım çok tuttu! Bu sefer havuzu ve kafeyi de çekeceğim."',
        '"Büyük bir dergi için ülkenin en güzel otellerini çekiyorum. Listede sizin oteliniz de var!"',
      ],
      success: [
        "Selin'in paylaşımı yüzlerce beğeni aldı!",
        '"Takipçilerim otelinize bayıldı, mesaj yağıyor!"',
        'Dergi kapağı oldunuz! Otel ülke çapında tanındı. (+1500 Otelgram takipçisi)',
      ],
      fail: 'Selin fotoğraf çekecek güzel bir köşe bulamadı. Bir dahaki sefere...',
      request: ['Şehir haritası?', 'Havlu lütfen!', 'Su getirir misin?'],
      minLevel: [1, 2, 2], reward: [300, 600, 2200],
    },
    {
      id: 'huseyin', name: 'Hüseyin Usta', title: 'Emekli otelci', look: 'character-male-c', partner: null, type: 0 /* Customer.G.Normal */,
      arrive: [
        '"Ben 40 yıl otel işlettim evlat. Bakalım sen nasıl iş çıkarıyorsun?"',
        '"Yine geldim. Geçen sefer iyiydin ama otelcilik detaydadır!"',
        '"Son kez geliyorum, artık yaşlandım. Ama gitmeden sana bir hediyem var."',
      ],
      success: [
        '"Fena değil! Bir tavsiye: Çarşaf stoğunu hiç bitirme, temiz oda her şeydir."',
        '"Aferin! Personelini mutlu tut. Onlar mutluysa misafir de mutludur."',
        'Hüseyin Usta en mütevazı odanı kendi ustalarıyla bir seviye yükseltti! "Bu otel emin ellerde."',
      ],
      fail: 'Hüseyin Usta başını salladı: "Daha çok çalışman lazım evlat."',
      request: ['Gazete var mı?', 'Çay lütfen!', 'Çay lütfen!'],
      minLevel: [1, 2, 3], reward: [300, 700, 2000],
    },
  ];

  static visits = [0, 0, 0, 0, 0];
  static pending = -1;
  static spawnAt = -1;
  static inHotel = [false, false, false, false, false];

  static Idx(id) {
    for (let i = 0; i < Regulars.All.length; i++) if (Regulars.All[i].id === id) return i;
    return -1;
  }

  static Done(id) { const i = Regulars.Idx(id); return i >= 0 && Regulars.visits[i] >= 3; }
  static get TipPerk() { return Regulars.Done('kemal') ? 0.1 : 0; }
  static get BusinessPerk() { return Regulars.Done('mert'); }

  static Cfg(d) { return { type: d.type, vip: false, celebrity: false, inspector: false, regular: d, reservation: null }; }

  static NewDay(day) {
    Regulars.spawnAt = -1;
    Regulars.pending = -1;
    if (Quests.Total('served') < 12 || Random.value > 0.65) return;
    const cands = [];
    for (let i = 0; i < Regulars.All.length; i++) if (Regulars.visits[i] < 3 && !Regulars.inHotel[i]) cands.push(i);
    if (cands.length === 0) return;
    Regulars.pending = cands[Random.RangeInt(0, cands.length)];
    Regulars.spawnAt = Random.Range(0.33, 0.72);
  }

  static Tick() {
    const G = GameManager.I;
    if (Regulars.pending < 0 || Regulars.spawnAt < 0 || G.dayNight.time < Regulars.spawnAt || G.dayNight.time > 0.9) return;
    Regulars.inHotel[Regulars.pending] = true;
    G.QueueSpawn(Regulars.Cfg(Regulars.All[Regulars.pending]));
    Regulars.pending = -1;
    Regulars.spawnAt = -1;
  }

  // Test icin: hemen bir mudavim gonder
  static SpawnNow() {
    for (let i = 0; i < Regulars.All.length; i++)
      if (Regulars.visits[i] < 3 && !Regulars.inHotel[i]) {
        Regulars.inHotel[i] = true;
        GameManager.I.QueueSpawn(Regulars.Cfg(Regulars.All[i]));
        return;
      }
  }

  static Chapter(d) { return Mathf.Clamp(Regulars.visits[Regulars.Idx(d.id)], 0, 2); }

  static OnCheckIn(c, r) {
    const d = c.regular;
    const ch = Regulars.Chapter(d);
    const extra = r.level < d.minLevel[ch] ? '\n\n(Bu ziyaret için en az ' + Eco.LevelNames[d.minLevel[ch]] + ' oda istiyor. Şu anki odası daha basit, memnun kalmayabilir.)' : '';
    Popups.Show(d.name + ' geldi!', d.arrive[ch] + extra, 'MÜDAVİM · ' + trUpper(d.title) + ' · ZİYARET ' + (ch + 1) + '/3')
      .Add('Hoş geldiniz!', null, Popups.Gold);
  }

  static OnLeave(c, sat, r, angry) {
    const d = c.regular;
    const i = Regulars.Idx(d.id);
    Regulars.inHotel[i] = false;
    const ch = Regulars.Chapter(d);
    const ok = !angry && sat >= 3.6 && r != null && r.level >= d.minLevel[ch];
    const G = GameManager.I;
    if (!ok) {
      Popups.Show(d.name, d.fail, 'MÜDAVİM').Add('Bir dahaki sefere!', null, Popups.Grey);
      return;
    }
    Regulars.visits[i] = ch + 1;
    const reward = Mathf.RoundToInt(d.reward[ch] * (1 + G.Unlocked() * 0.15) / 10) * 10;
    G.money += reward;
    Report.Bonus(reward);
    if (ch === 2) Regulars.ApplyPerk(d);
    Social.Share(d.name + ' yine ' + G.hotelName + "'de! " + (ch === 2 ? 'Bu otelin hikayemde çok özel bir yeri var.' : 'Burası artık favorim.'), 1, false);
    Popups.Show(ch === 2 ? d.name + ': hikaye tamamlandı!' : d.name + ' çok memnun!', d.success[ch] + '\n\nÖdül: ' + Eco.TL(reward),
      'MÜDAVİM · ZİYARET ' + (ch + 1) + '/3')
      .Add('Harika!', null, Popups.Gold);
    Sfx.Play('unlock');
  }

  static ApplyPerk(d) {
    const G = GameManager.I;
    switch (d.id) {
      case 'nermin': Social.followers += 800; break;
      case 'selin': Social.followers += 1500; break;
      case 'huseyin': {
        let low = null;
        for (const r of G.rooms) if (r.Unlocked && r.level < 3 && (low == null || r.level < low.level)) low = r;
        if (low != null) low.ApplyLevel(low.level + 1, true);
        break;
      }
    }
  }

  static Save(K) {
    for (let i = 0; i < Regulars.All.length; i++) Store.SetInt(K + 'reg_' + Regulars.All[i].id, Regulars.visits[i]);
  }

  static Load(K) {
    for (let i = 0; i < Regulars.All.length; i++) {
      Regulars.visits[i] = Store.GetInt(K + 'reg_' + Regulars.All[i].id, 0);
      Regulars.inHotel[i] = false;
    }
    Regulars.pending = -1;
    Regulars.spawnAt = -1;
  }
}
