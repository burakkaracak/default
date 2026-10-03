# Eski web oyunundan fikirler (Otel Ustası v59)

Eski tarayıcı sürümü 2026-10-03'te silindi. Kodu git geçmişinde duruyor (`otel-oyunu/` klasörü, silinmeden önceki son commit). Bu not, yeni oyuna alınabilecek fikirleri ve sayıları kodsuz olarak saklar.

## Temel döngü (My Perfect Hotel tarzı)
- Oyuncu karakterini yürütür: misafiri resepsiyonda karşılar, odaya yerleştirir, misafir çıkınca odayı temizler, bırakılan parayı ve bahşişi toplar.
- Yerdeki "satın alma alanlarına" para yatırılarak yeni oda ve tesis açılır (açılış sırası sabit, ilk oda 30 ₺, ikincisi 60 ₺).
- Bir oyun günü 160 gerçek saniye; misafirin bir gecesi 21 saniye. 4 gün = 1 mevsim.
- Misafir isteği: tuvalet kâğıdı (8 ₺ bahşiş), havlu (10 ₺), oda servisi (26 ₺). Depodaki raftan alınıp odaya götürülür.

## Odalar
| Tür | Gece ücreti | Yükseltme |
|---|---|---|
| Ekonomi | 30 | - |
| Deluxe | 60 | 420 |
| Suit | 110 | 1250 |

- Üst katlar daha pahalı: kat çarpanı 1 / 1,7 / 2,6.
- Dekor (memnuniyet artırır): tablo 90, bitki 60, minibar 150 (+gelir), aroma mumu 80, karşılama paketi 140 (+gelir).
- Fiyat ayarı: %80 / %90 / %100 / %120 / %150 (yüksek fiyat daha az misafir, daha çok gelir).

## Misafir türleri
Sabır (pat) düşükse sırada çabuk sinirlenir; "ister" 0-2 arası istek sayısı; bazıları belirli tesisi sever.

| Misafir | Görünme yıldızı | Ödeme çarpanı | Not |
|---|---|---|---|
| Turist | 1★ | 1 | En yaygın |
| Öğrenci | 1★ | 0,8 | Çok sabırlı, az bahşiş |
| Huysuz | 1★ | 1,1 | Sabırsız ama bahşişi yüksek (2,2) |
| İş insanı | 2★ | 1,45 | Tek gece, sabırsız |
| Aile | 2★ | 1,25 | 2-3 gece, havuzu sever |
| Emekli | 2★ | 1,15 | Çok sabırlı, restoranı sever |
| Sporcu | 2★ | 1,2 | Spor salonunu sever |
| Köpekli | 2★ | 1,35 | Köpek kuralı ayarı var |
| Balayı çifti | 3★ | 1,9 | Çatıyı sever |
| Fenomen | 3★ | 1,6 | Mutlu kalırsa çok ün getirir |
| Spor takımı | 3★ | 1,3 | Grup halinde gelir |
| Gizli milyoner | 3★ | - | Turist kılığında; iyi ağırlanırsa büyük ödül |
| Ünlü | 4★ | 2,8 | Yüksek bahşiş ve ün |
| Film ekibi | 4★ | 3 | Çatıda çekim yapar |
| Müfettiş | özel | - | Gizlice gelir, rapor yazar |

## Personel
| Personel | İşe alma | Günlük maaş | Görev |
|---|---|---|---|
| Resepsiyonist (1) | 300 | 40 | Sen yokken misafir karşılar |
| Temizlikçi (4'e kadar) | 200 → 700 | 30 | Kirli odaları temizler |
| Kat görevlisi (3) | 350 → 800 | 35 | İstekleri depodan odaya taşır |
| Teknisyen (2) | 400 / 750 | 45 | Arızaları onarır |
| Spa terapisti | 900 | 55 | Spa gelirini %60 artırır |
| Çamaşırcı | 600 | 40 | Çarşaf yıkar (gelir) |
| Aşçı | 700 | 45 | Oda servisini hızlandırır |

- Personel seviyesi: 250 / 650 / 1500 / 3200, hız ×1 → ×2,5.
- Sonradan eklenenler: moral, prim, izin, grev, gece vardiyası, kişilik özellikleri, işe alımda aday seçme.

## Oyuncu geliştirmeleri
Hız, taşıma kapasitesi (2 → 12 eşya), para mıknatısı, temizlik hızı, tamircilik, karşılama hızı, güler yüz (+%15 bahşiş), pazarlık (+%5 oda geliri), şöhret, liderlik (personel +%10), sakinlik (sıra sabrı +%12), süper mıknatıs (parayı kendiliğinden toplar).

## Yıldız sistemi
- Ün puanı her 20'de bir yıldız; ama yıldız için şart da gerekir:
  - 3★: 8 oda ve 2 Deluxe
  - 4★: restoran + havuz, 16 oda, 2 Suit
  - 5★: havuz + spor salonu + spa, 28 oda, 8 Suit
- Yıldız gelir çarpanı: ×0,9 / 1 / 1,1 / 1,2 / 1,3.
- Ün "son 3 günün performansı"na göre değişir (sürekli iyi hizmet gerekir).

## Tesisler
Kafe (kahve 6 ₺), restoran (14), havuz (7), spor salonu (9), çatı barı (22), spa (20), çamaşırhane, mutfak, depo, helikopter pisti, mescit.

## Şehirler ve taşınma
İstanbul (×1) → Antalya (×1,9) → Kapadokya (×3,4) → Bodrum (×5,6) → Paris (×8,8) → Dubai (×14). Her şehirde cephe rengi, zemin ve çevre farklı. Taşınırken kazanılan anahtarlarla kalıcı miras alınır: başlangıç sermayesi, hızlı adımlar, mıknatıslı eller, tanınmış marka (+8 ün), zincir geliri (+%5).

## Olaylar ve canlılık
- Mevsimler ve hava (güneş, bulut, yağmur, kar); havuz kötü havada ve gece kapalı.
- Krizler: fırtına, sıcak dalgası, zam, arızalar (tamir mini oyunu), hırsız (kasaya gider, parayı alıp kaçar, yakalanırsa geri gelir), kayıp çocuk.
- Takvim: ramazan, iftar/sahur, bayram, şehir festivali (+%15 gelir), haberler talebi değiştirir.
- Rakip otel: fiyat savaşı, reklam kampanyası.
- Etkinlikler: düğün, konferans, havuz konseri, otel partisi, havai fişek.
- Kedi, köpekli misafirler, kelebek/kar/ağustos böceği efektleri.

## Hikâye modu
6 şehir × 3 perde. 3★, 4★ ve 5★'da bir hikâye anı açılır, oyuncu iki seçenekten birini seçer (para / ün / moral etkisi). Personelin kişiliğine göre yan hikâyeler, günlük (diary).

## Eşe özel dokunuşlar (fikir)
- LODA Gallery ve gerçek Loda koltuk modeli (Loda süiti: oda fiyatı ×1,25).
- Misafir albümü, başarımlar (48 adet), haftalık lig, sabah gazetesi.

## İlk sürüm için en önemli 5 şey (öneri)
1. Misafir karşıla → odaya yerleştir → temizle → para topla döngüsü
2. Yeni oda açma ve oda yükseltme
3. Personel işe alma (temizlikçi, resepsiyonist)
4. Yıldız sistemi
5. Bir tesis (havuz veya restoran)
