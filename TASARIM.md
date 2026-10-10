# Lavanta Koyu — Tasarım

Elif için hediye: sıcak, renkli, derin bir otel kurma oyunu. iPhone 14 Pro (Safari) ve M2 MacBook Air'de akıcı çalışır.
Eski oyun depodan kaldırıldı; kayıtlar sıfırdan başlar.

## 1. Dünya: Lavanta Koyu
- Sahil kasabası. Ortada otel arsası; etrafta Kenney kasaba binaları, yollar, lamba direkleri, çeşmeli meydan, ağaçlar; güneyde kumsal ve deniz (dalgalı), arkada tepeler.
- Otel **katlı** büyür: zemin kat (lobi, resepsiyon, bekleme, kafe), oda katları (her katta 6 oda), çatı (çatı barı, havuz, bahçe). Yeni kat satın alınır.
- Kamera: parmakla/fareyle **döndürülür** (4 yön), yakınlaşır; kat seçince üst katlar kesitte kaybolur (tycoon görünümü).
- Gece-gündüz, mevsimler, hava (güneş, bulut, yağmur, kar, fırtına). Gece kasaba ışıkları yanar.
- Kasaba otelle birlikte gelişir: yıldız arttıkça yeni dükkânlar açılır, sokakta turistler, arabalar, kuşlar.

## 2. Temel döngü
Misafir gelir → resepsiyonda karşılanır → odaya yerleşir → konaklarken istekleri olur (havlu, temizlik, oda servisi, arıza, kahve) → çıkar → oda temizlenir → para + bahşiş + ün.
Oyuncu kendi karakteriyle koşar (sürükle/WASD) ya da **dokunarak** hedef gösterir; büyüdükçe işi personele bırakır.

## 3. İnşa ve dekorasyon
- Kat planında boş yuvaya oda kurma; oda tipi: Standart / Deluxe / Suit; temalar (Deniz, Bahçe, Lavanta, Modern, Romantik).
- **Mobilya kataloğu**: odaya ve lobiye ızgarada serbest yerleştirme, döndürme, kaldırma; duvar ve zemin rengi seçimi. Dekor memnuniyeti ve fiyatı artırır.
- Tesisler: kafe, restoran, spa, havuz, çatı barı, bahçe, spor salonu, depo.

## 4. Personel
Resepsiyonist, temizlikçi, kat görevlisi, barista, aşçı, garson, terapist, cankurtaran.
Seviye, moral, kişilik (titiz, neşeli, tembel…), eğitim, vardiya, ikramiye, dinlenme odası.

## 5. İlerleme
- Ün puanı → yıldız (1–5), her yıldızın şartı var (oda sayısı, tesis, memnuniyet).
- Günlük hedefler, haftalık etkinlik, 48 başarım, anı albümü.
- Yeni şehirler: Bodrum, Kapadokya (zincir; diğer oteller arka planda kazanır).

## 6. Misafirler
Turist, öğrenci, iş insanı, aile, emekli, sporcu, köpekli, balayı çifti, fenomen, huysuz, gizli milyoner, spor takımı; VIP, ünlü, film ekibi, müfettiş. Her türün isteği, sabrı, ödemesi farklı.
Otelgram (yorumlar, takipçi, yanıtlama) ve misafirle sohbet (hazır cevaplar + Claude ile serbest yazışma).

## 7. Olaylar
Festivaller, düğün, konser, film ekibi, bayramlar, fırtına, sıcak dalgası, arıza, zam, rakip kampanyası. **Hırsız yok.**

## 8. Elif dokunuşları
Gizli notlar, özel günlerde kutlama, fotoğraf modu ve albüm, kedi, müdür kıyafetleri, Elif'in fotoğrafları tablolarda.

## 9. Görünüm
Yumuşak gölgeler, ortam gölgelemesi, gece parlaması, vinyet, renk düzeltme; yumuşak animasyonlar (zıplama, sallanma), parçacıklar (yaprak, kar, konfeti), kuşlar, dalgalar.
Arayüz HTML/CSS: kartlar, ikonlar, akıcı geçişler; telefonda tam uyumlu.

## 10. Teknik
- `web/v2/`: yeni oyun. Motor (`engine.js`) eski oyundan alınıp geliştirildi; arayüz DOM; kayıt v2 (`otel2_`), bulut aynı.
- Modeller: Kenney karakterler (12), mobilya (30), kasaba paketi (15), platform paketi (bulut, bayrak…); gerisi prosedürel (modüler bina, bitki, dekor).
- Testler: `test_iphone.py`, `test_smoke.py`, `test_cloud.py` v2'ye uyarlanır.

## Fazlar
1. Dünya + temel döngü + arayüz + kayıt (oynanabilir, yayınlanır)
2. İnşa ve dekorasyon + tesisler + personel
3. Derinlik: ün/yıldız, misafir türleri, Otelgram/sohbet, olaylar, hikâye, başarımlar, zincir
4. Cila ve Elif dokunuşları; eski oyun kaldırılır
