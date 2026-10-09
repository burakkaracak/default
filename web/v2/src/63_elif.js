// Elif'e özel dokunuşlar: özel günler (gerçek tarih), otel defterinden notlar ve kişisel içerik yuvası.
// KİŞİSEL İÇERİK YUVASI (ElifData): doğum günü, yıldönümü ve Burak'ın yazdığı notlar yalnız bu nesneye yazılır.
// Ayarlar ekranında bu bilgi için alan YOK (sürpriz bozulmasın); Burak tarihleri ve notları sohbette iletir.
const ElifData = {
  birthday: null,     // [gün, ay] örn. [14, 6]
  anniversary: null,  // [gün, ay]
  birthdayMsg: null,  // özel mesaj (boşsa varsayılan)
  anniversaryMsg: null,
  // Burak'ın notları: { id, when: {...}, text, from }
  personal: [],
};

const Special = {
  // Sabit tarihli özel günler. Dini bayramlar her yıl kaydığı için dahil değil.
  Days: [
    { id: 'yilbasi', d: 1, m: 1, icon: '🎆', name: 'Yılbaşı', msg: 'Yeni yılın otele ve sana mutluluk getirmesini dileriz!', col: [C(0.95, 0.3, 0.35), C(1, 0.85, 0.3), C(1, 1, 1)] },
    { id: 'sevgililer', d: 14, m: 2, icon: '💝', name: 'Sevgililer Günü', msg: 'Bugün otel pembe kalplerle süslendi. Misafirler çok romantik!', col: [C(1, 0.45, 0.65), C(1, 0.75, 0.85), C(0.95, 0.25, 0.4)] },
    { id: 'kadinlar', d: 8, m: 3, icon: '🌷', name: 'Dünya Kadınlar Günü', msg: 'Kadınlar Günün kutlu olsun! Otelin lobisi laleyle doldu.', col: [C(0.85, 0.45, 0.8), C(1, 0.7, 0.85), C(0.7, 0.55, 0.95)] },
    { id: 'nisan23', d: 23, m: 4, icon: '🎈', name: '23 Nisan', msg: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun! Çocuklar için balonlar asıldı.', col: [C(0.9, 0.2, 0.25), C(1, 1, 1), C(0.3, 0.6, 0.95)] },
    { id: 'anneler', special: 'anneler', icon: '💐', name: 'Anneler Günü', msg: 'Anneler Günün kutlu olsun! Lobiye çiçekler kondu.', col: [C(1, 0.6, 0.75), C(1, 0.85, 0.5), C(0.8, 0.65, 1)] },
    { id: 'mayis19', d: 19, m: 5, icon: '🏅', name: '19 Mayıs', msg: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı kutlu olsun!', col: [C(0.9, 0.2, 0.25), C(1, 1, 1), C(0.3, 0.6, 0.95)] },
    { id: 'ekim29', d: 29, m: 10, icon: '🎉', name: 'Cumhuriyet Bayramı', msg: 'Cumhuriyet Bayramı kutlu olsun! Otel kırmızı beyaz balonlarla süslendi.', col: [C(0.9, 0.2, 0.25), C(1, 1, 1), C(0.9, 0.2, 0.25)] },
  ],
  deco: null, decoId: null, t: 3, checkT: 0,

  Now() { return window.__today ? new Date(window.__today + 'T12:00:00') : new Date(); },
  // Anneler Günü: Mayıs ayının ikinci pazarı
  MothersDay(y) { const d = new Date(y, 4, 1); const first = (7 - d.getDay()) % 7 + 1; return first + 7; },
  Match(now) {
    const day = now.getDate(), mon = now.getMonth() + 1, y = now.getFullYear();
    for (const s of this.Days) { if (s.special === 'anneler' ? (mon === 5 && day === this.MothersDay(y)) : (s.d === day && s.m === mon)) return s; }
    const b = ElifData.birthday; if (b && b[0] === day && b[1] === mon) return { id: 'dogum', icon: '🎂', name: 'Doğum günü', msg: ElifData.birthdayMsg || 'Doğum günün kutlu olsun! Otel bugün senin için süslendi.', col: [C(1, 0.5, 0.7), C(1, 0.85, 0.3), C(0.6, 0.8, 1)], big: true };
    const a = ElifData.anniversary; if (a && a[0] === day && a[1] === mon) return { id: 'yildonumu', icon: '💞', name: 'Yıldönümü', msg: ElifData.anniversaryMsg || 'Mutlu yıllar! Bugün otel sizin için kalplerle süslendi.', col: [C(1, 0.4, 0.55), C(1, 0.75, 0.85), C(1, 0.85, 0.4)], big: true };
    return null;
  },
  Today() { return this.Match(this.Now()); },

  // lobiye balonlar: tek birleşik ağ
  Decorate(s) {
    if (this.deco) { Destroy(this.deco); this.deco = null; } this.decoId = s ? s.id : null; if (!s) return;
    const parts = [], rnd = new SysRandom(s.id.length * 7 + 3);
    const spots = [[-6, -5.2], [-3.2, -5.9], [3.2, -5.9], [6, -5.2], [-9.5, 6], [9.5, 6], [-1.6, 6.2], [1.6, 6.2], [-10.6, -4], [10.6, -4]];
    spots.forEach(([x, z], i) => { const c = s.col[i % s.col.length], h = 2.4 + rnd.NextDouble() * 0.7; parts.push({ geo: 'Sphere', pos: V(x, h, z), scale: V(0.55, 0.65, 0.55), c }, { geo: 'Cylinder', pos: V(x, h / 2 - 0.3, z), scale: V(0.025, h - 0.6, 0.025), c: C(0.9, 0.9, 0.9) }); });
    this.deco = U.Merge('OzelGunSusu', Hotel.groups[0] || W, parts); if (this.deco) this.deco.castShadow = false;
  },
  Celebrate(s) {
    const st = Game.st; st.celebrated = st.celebrated || {}; const key = s.id + Special.Now().getFullYear();
    if (st.celebrated[key]) return false; st.celebrated[key] = World.day;
    const mgr = st.manager || 'Müdür', gift = (s.big ? 1500 : 400) + 100 * Game.Stars * (s.big ? 2 : 1);
    st.money += gift; Sfx.Play('unlock', 0.9);
    U.Burst(Vec.add(Game.player.go.position, V(0, 2, 0)), s.col[0], s.col[1], s.big ? 220 : 120, 7);
    Album.Memory(s.icon, s.name); Social.Share('{otel}: ' + s.name + ' kutlu olsun! Lobi baştan başa süslendi ' + s.icon, 1, false);
    UI.Dialog({ tag: 'ÖZEL GÜN ' + s.icon, title: s.name + ', ' + mgr + '!', html: `<div class="big">${s.icon}</div><p>${UI.esc(s.msg)}</p><div class="stat"><span>Otelden hediye</span><b>${UI.fmt(gift)}</b></div>`, buttons: [{ text: 'Teşekkürler!', cls: 'gold' }] });
    Game.Save(); return true;
  },

  // ---------------- otel defterinden notlar ----------------
  Notes: [
    { id: 'n1', when: { day: 2 }, text: 'Küçük bir otel, büyük bir hayal. Her misafir odasına yalnız bir yatak değil, bir hikâye de getirir. Hoş geldin!' },
    { id: 'n2', when: { served: 5 }, text: 'Beş misafir ağırladın bile! En güzel şey, bir misafirin "iyi ki buradaymışım" dediğini duymak.' },
    { id: 'n3', when: { stars: 2 }, text: 'İkinci yıldız! Küçük ilgiler büyük fark yaratır: bir çay, bir gülümseme, zamanında gelen havlu.' },
    { id: 'n4', when: { facs: 1 }, text: 'İlk tesis açıldı. Artık misafirler yalnız kalmıyor, vakit de geçiriyor. Kahve kokusu otelin kalbidir.' },
    { id: 'n5', when: { day: 10 }, text: 'On gün oldu. Bugünlerin yorgunluğu bir gün güzel bir anıya dönüşecek. Kendine de bir çay ısmarla.' },
    { id: 'n6', when: { followers: 150 }, text: 'Otelgram\'da herkes seni konuşuyor! Yorumların arkasındaki insanlara gösterdiğin ilgi, otelin gerçek reklamı.' },
    { id: 'n7', when: { stars: 3 }, text: 'Üçüncü yıldız. Otel artık bir koy hikâyesi. Misafirler yalnız oda için değil, burada hissettikleri için geliyor.' },
    { id: 'n8', when: { weddings: 1 }, text: 'Bir düğüne ev sahipliği yaptın. Bugün biri hayatının en güzel gününü senin otelinde yaşadı.' },
    { id: 'n9', when: { stars: 5 }, text: 'Beş yıldız! Lavanta Koyu\'nun en sevilen oteli sensin. Bu kadar güzel bir iş çıkardığın için tebrikler.' },
  ],
  NoteReady(n) { const w = n.when, st = Game.st; return (w.day == null || World.day >= w.day) && (w.served == null || st.served >= w.served) && (w.stars == null || Game.Stars >= w.stars) && (w.facs == null || Ach.Facs() >= w.facs) && (w.followers == null || st.followers >= w.followers) && (w.weddings == null || (st.weddings || 0) >= w.weddings); },
  All() { return [...this.Notes, ...(ElifData.personal || [])]; },
  Pending() { const st = Game.st, read = st.notesRead || []; return this.All().find(n => !read.includes(n.id) && this.NoteReady(n)) || null; },
  Read(n) {
    const st = Game.st; st.notesRead = st.notesRead || []; if (st.notesRead.includes(n.id)) return;
    st.notesRead.push(n.id); st.noteLog = st.noteLog || []; st.noteLog.unshift({ id: n.id, day: World.day, text: n.text, from: n.from || 'Otelin defteri' }); while (st.noteLog.length > 30) st.noteLog.pop();
    Sfx.Play('heart', 0.8); Game.Save();
    UI.Dialog({ tag: '💌 NOT', title: n.from || 'Otelin defteri', html: `<p style="font-size:16px">${UI.esc(n.text)}</p>`, buttons: [{ text: 'Sakla ♥', cls: 'pink' }] });
  },

  // ---------------- döngü ----------------
  Tick(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 2;
    const s = this.Today(); if (!s ? this.decoId : this.decoId !== s.id) this.Decorate(s);
    if (s && !UI.Blocking && !Decor.active && !(Game.st.celebrated || {})[s.id + this.Now().getFullYear()]) this.Celebrate(s);
    if (this.deco) this.deco.visible = Hotel.view === 0;
  },
  Frame() {
    if (UI.Blocking || Decor.active || Hotel.view !== 0) return;
    const n = this.Pending(); if (!n) return;
    UI.Label('not', V(-1.8, 1.9, -2.6), '💌 Defterde bir not var', 'need', () => this.Read(n));
  },
};
if (typeof window !== 'undefined') { window.__Special = Special; window.__ElifData = ElifData; }
