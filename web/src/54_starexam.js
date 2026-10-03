// Resmi yildiz belgesi: sartlari saglayinca sinava basvurulur.
// Gizli bir mufettis misafir gibi gelir; memnun ayrilirsa otel bir ust yildiza cikar.
// (StarExam.cs'den taşındı)
class StarExam {
  static official = 1;
  static scheduled = false;
  static inspectorIn = false;
  static cooldownDay = 0;
  static spawnTimer = -1;

  static Rewards = [0, 0, 800, 2500, 6000, 15000];
  static get PriceMul() { return 1 + 0.05 * (StarExam.official - 1); }
  static get Target() { return Mathf.Min(5, StarExam.official + 1); }

  // Req: { text, ok }
  static get G() { return GameManager.I; }

  static CountLevel(l) { let n = 0; for (const r of StarExam.G.rooms) if (r.level >= l) n++; return n; }

  static Requirements(t) {
    const G = StarExam.G, Add = StarExam.Add, P = StarExam.P, CountLevel = StarExam.CountLevel;
    const l = [];
    let rooms = 0;
    for (const r of G.rooms) if (r.Unlocked) rooms++;
    switch (t) {
      case 2:
        Add(l, 'En az 3 oda açık (' + rooms + ')', rooms >= 3);
        Add(l, 'Puan ortalaması ' + P(3) + ' ve üzeri (' + P(G.Stars) + ')', G.Stars >= 3);
        break;
      case 3:
        Add(l, 'En az 6 oda açık (' + rooms + ')', rooms >= 6);
        Add(l, 'Kafe açık', G.cafe.Open);
        Add(l, 'Resepsiyonist var', G.reception.HasStaff);
        Add(l, 'En az 2 Konfor oda (' + CountLevel(2) + ')', CountLevel(2) >= 2);
        Add(l, 'Puan ortalaması ' + P(3.5) + ' ve üzeri (' + P(G.Stars) + ')', G.Stars >= 3.5);
        break;
      case 4:
        Add(l, 'En az 8 oda açık (' + rooms + ')', rooms >= 8);
        Add(l, 'Havuz açık', G.pool.Open);
        Add(l, 'En az 3 Kral Dairesi (' + CountLevel(3) + ')', CountLevel(3) >= 3);
        Add(l, 'En az 2 temizlikçi (' + G.cleaners.length + ')', G.cleaners.length >= 2);
        Add(l, 'Lobi dekoru en az %20 (' + Mathf.RoundToInt(Decor.Bonus * 100) + '%)', Decor.Bonus >= 0.19);
        Add(l, 'Puan ortalaması ' + P(4) + ' ve üzeri (' + P(G.Stars) + ')', G.Stars >= 4);
        break;
      default:
        Add(l, '2. kat açık', G.floor2Open);
        Add(l, 'En az 12 oda açık (' + rooms + ')', rooms >= 12);
        Add(l, 'En az 6 Kral Dairesi (' + CountLevel(3) + ')', CountLevel(3) >= 6);
        Add(l, '3 temizlikçi (' + G.cleaners.length + ')', G.cleaners.length >= 3);
        Add(l, '1.000 Otelgram takipçisi (' + Social.followers + ')', Social.followers >= 1000);
        Add(l, 'Puan ortalaması ' + P(4.5) + ' ve üzeri (' + P(G.Stars) + ')', G.Stars >= 4.5);
        break;
    }
    return l;
  }

  static Add(l, s, ok) { l.push({ text: s, ok: !!ok }); }
  static P(v) { return fmt1(v); }

  static get ReqsMet() {
    if (StarExam.official >= 5) return false;
    for (const r of StarExam.Requirements(StarExam.Target)) if (!r.ok) return false;
    return true;
  }

  static get Status() {
    if (StarExam.official >= 5) return 'Otelin en üst seviyede: 5 yıldız!';
    if (StarExam.scheduled || StarExam.inspectorIn) return 'Müfettiş bugün gelecek ya da şu an otelde. Kim olduğunu bilmiyorsun!';
    if (StarExam.G.dayNight.day < StarExam.cooldownDay) return 'Son sınav başarısız oldu. Yarın tekrar başvurabilirsin.';
    return StarExam.ReqsMet ? 'Tüm şartlar tamam, sınava başvurabilirsin!' : 'Şartları tamamlayınca sınava başvurabilirsin.';
  }

  static get CanApply() { return StarExam.ReqsMet && !StarExam.scheduled && !StarExam.inspectorIn && StarExam.G.dayNight.day >= StarExam.cooldownDay; }

  static Apply() {
    if (!StarExam.CanApply) return;
    StarExam.scheduled = true;
    StarExam.spawnTimer = Random.Range(20, 60);
    Popups.Show('Başvurun alındı!', 'Gizli bir müfettiş bugün otele gelecek. Normal bir misafir gibi davranacak, kim olduğunu bilmeyeceksin.\n\nHerkese en iyi hizmeti ver: hızlı karşıla, isteklerini yerine getir, iyi bir odaya yerleştir.', 'YILDIZ SINAVI')
      .Add('Hazırız!', null, Popups.Gold);
  }

  static Tick(dt) {
    if (!StarExam.scheduled || StarExam.spawnTimer < 0) return;
    StarExam.spawnTimer -= dt;
    if (StarExam.spawnTimer > 0) return;
    StarExam.spawnTimer = -1;
    StarExam.scheduled = false;
    StarExam.inspectorIn = true;
    StarExam.G.QueueSpawn({ type: Customer.G.Normal, vip: false, celebrity: false, inspector: true, regular: null, reservation: null });
    StarExam.G.Notify('Gizli müfettiş otelde olabilir...');
  }

  static Result(score) {
    const G = StarExam.G;
    StarExam.inspectorIn = false;
    const t = StarExam.Target;
    if (score >= 4) {
      StarExam.official = t;
      const reward = StarExam.Rewards[t];
      G.money += reward;
      Report.Bonus(reward);
      Social.Share(G.hotelName + ' resmi olarak ' + t + ' yıldızlı otel oldu! Tebrikler!', 2, false);
      Popups.Show('Tebrikler! Artık ' + t + ' yıldızlı resmi bir otelsin!',
        'Müfettiş çok memnun kaldı (puanı ' + fmt1(score) + ').\n\nOda fiyatların kalıcı olarak %5 arttı.\nÖdül: ' + Eco.TL(reward),
        'YILDIZ SINAVI · ' + '★'.repeat(t))
        .Add('Muhteşem!', null, Popups.Gold);
      U.Burst(V(0, 3, -12.5), C(1, 0.85, 0.3), C(1, 0.5, 0.7), 160, 8);
      Sfx.Play('unlock');
    } else {
      StarExam.cooldownDay = G.dayNight.day + 1;
      Popups.Show('Sınav bu sefer olmadı', 'Müfettiş gizlice not aldı ve ayrıldı (puanı ' + fmt1(score) + ', en az 4,0 gerekiyordu).\n\nİpucu: Bekleme süresini kısa tut, isteklere hızlı koş, ona iyi bir oda ver. Yarın tekrar başvurabilirsin.', 'YILDIZ SINAVI')
        .Add('Yarın tekrar deneriz', null, Popups.Grey);
    }
    G.Save();
  }

  static Save(K) {
    Store.SetInt(K + 'official', StarExam.official);
    Store.SetInt(K + 'exam_cd', StarExam.cooldownDay);
  }

  static Load(K, stars) {
    StarExam.official = Store.GetInt(K + 'official', -1);
    if (StarExam.official < 1) StarExam.official = Mathf.Clamp(Mathf.FloorToInt(stars), 1, 3);
    StarExam.cooldownDay = Store.GetInt(K + 'exam_cd', 0);
    StarExam.scheduled = false;
    StarExam.inspectorIn = false;
    StarExam.spawnTimer = -1;
  }
}
