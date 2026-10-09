// İpuçları: her yeni özellikle ilk karşılaşmada bir kez, oyunu durdurmayan küçük bir ipucu gösterir (Dialog değil).
// Gösterilenler kayıtta (st.hints) tutulur; aynı ipucu bir daha çıkmaz. İki ipucu arası en az 75 sn.
const Hints = {
  List: [
    { id: 'foto', when: () => Game.st.served >= 3, text: '📷 Sağ üstteki kamerayla fotoğraf çek: albüme eklenir, lobideki tablolarda asılır.' },
    { id: 'dekor', when: () => Game.OpenRooms().length >= 2 && Game.st.money >= 150, text: '🎨 Bir odaya yaklaşıp dokun: "Dekore et" ile konforu ve gecelik fiyatı artır.' },
    { id: 'otelgram', when: () => (Game.st.feed || []).length >= 1, text: '📱 Otelgram\'da yeni yorum var! Düğmeye bas, "Yanıtla" ile cevap ver: takipçi kazanırsın.' },
    { id: 'sohbet', when: () => Game.guests.some(g => Chat.Can(g)) && Game.st.served >= 2, text: '💬 Üstünde 💬 olan misafire dokun: sohbet et, memnuniyeti ve bahşişi artır.' },
    { id: 'tesis', when: () => Game.Stars >= 2 && Ach.Facs() === 0 && Game.st.money >= 1300, text: '☕ İnşa → Tesisler\'den kafe aç: misafirler çıkışta oraya uğrar.' },
    { id: 'resepsiyon', when: () => Hotel.floors >= 2, text: '🛎 Pembe resepsiyon düğmesi seni hangi kattan olursan ol bankoya götürür.' },
    { id: 'kedi', when: () => Game.st.served >= 4, text: '🐱 Lobide otelin kedisi dolaşıyor. Ona dokunursan sevilir!' },
    { id: 'zincir', when: () => Game.Stars >= 3 && Game.st.money >= 26000, text: '🏙 Menü → Zincir: Bodrum\'da şube aç, arka planda kendiliğinden kazansın.' },
    { id: 'kiyafet', when: () => World.day >= 3, text: '👗 Menü → Ayarlar\'dan kıyafetini ve şapkanı seçebilirsin.' },
    { id: 'basarim', when: () => Ach.Count() >= 3, text: '🏆 Menü → Başarım: ödüllü hedeflerini buradan görebilirsin.' },
  ],
  t: 8, last: -999,
  Tick(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 4;
    if (UI.Blocking || UI.SheetOpen || Decor.active || Game.st.tutorial < 4) return;
    if (Time.unscaledTime - this.last < 75) return;
    const st = Game.st; st.hints = st.hints || {};
    for (const h of this.List) if (!st.hints[h.id] && h.when()) { st.hints[h.id] = World.day; this.last = Time.unscaledTime; UI.Hint(h.text, 8); Game.Save(); return; }
  },
};
if (typeof window !== 'undefined') window.__Hints = Hints;
