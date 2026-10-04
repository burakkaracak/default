# Konteyner: Live & Feel

Tarayıcıda çalışan, sevimli low-poly 3B bir mobilya üretim ve ihracat simülasyonu.
İstanbul'daki aile şirketi Karaçak Mobilya'da ihracat bölge müdürü **Burak Karaçak**'ı oynarsın:
Bostancı mağazasında mail ve teklif, Tuzla fabrikasında üretim, konteyner yükleme, fuarlar,
rakipler, kur ve hammadde, aile içi onay zinciri.

## Çalıştırma

```
npm install
npm run dev      # geliştirme sunucusu (http://localhost:5173)
npm run build    # dist/konteyner.html  (tek dosya; çift tıklayınca tarayıcıda açılır)
```

`dist/konteyner.html` sunucusuz çalışır: bütün kod, stil ve veri içine gömülüdür (Three.js dahil).
Montserrat yazı tipi internet varsa Google Fonts'tan gelir, yoksa sistem yazı tipi kullanılır.
Proje kendi klasöründe bağımsızdır, mutlak yol kullanmaz; istediğin klasöre taşıyabilirsin.

Testler (isteğe bağlı, başsız Chromium + playwright-core gerekir):
`node tests/run.mjs <senaryo> [genişlik] [yükseklik]` — senaryolar `tests/scenarios.mjs` içinde
(boot, flow, ship, crm, panels, life, walk, phone, phone2).

## Nasıl oynanır

**Kontroller**
- Masaüstü: WASD / oklar ile yürü, **E** veya **Boşluk** ile etkileşim.
- Telefon: ekranın boş bir yerine dokunup sürükle (joystick), sağ alttaki altın düğmeyle etkileşim.
- Üst bar: kasa, saat, hız (duraklat / 1x / 2x / 3x), "Bünyamin şu an nerede?", Özgüven ve Analiz.
- Alt bar: Gelen Kutusu, Siparişler, Fabrika, Dünya, Kadro, Finans, Menü (kaydet, dışa aktar, ayarlar).

**Zaman:** 1 oyun günü ≈ 4 dakika (08:00–20:00). Hafta 5 gün, ay 2 hafta, sezon/çeyrek 3 ay.
Gün sonunda rapor, ay sonunda gelir-gider raporu ve maaşlar, çeyrek sonunda YK toplantısı.
Her sabah Bostancı'da masanda başlarsın ve Büşra Hanım'ın notlarıyla günü planlarsın.

**Temel döngü**
1. **Müşteri bul:** Dünya haritası → ülke → firma → masanda ilk temas mailini parçalardan kur.
   Kısa, doğal, firmaya uygun mailler cevap alır; uzun, şablon ve abartılı mailler almaz.
2. **İlişkiyi ilerlet:** Soğuk → İlgili (katalog) → Numune istedi → İlk sipariş → Düzenli → Stratejik ortak.
3. **Teklif ve pazarlık:** indirim, teslim süresi, ödeme (peşin / %30 avans / vadeli) ve teslim şekli (EXW/FOB/CIF).
   Ek iskonto ve vade kararı **Davut Bey**'de; maliyet, fiyat ve termin için **Serkan Bey** (telefonda tahmini,
   fabrikada kesin); malzeme için **İbrahim Bey**; Bünyamin'le istişare edebilirsin.
4. **Sipariş akışı:** proforma → avans (Harun Bey takip eder) → **ERP formu** (eksik/hatalı alanları bul, Semanur Hanım'a mail ile gönder)
   → üretim → sevkiyat → teslim → bakiye.
5. **Fabrika:** istasyonların önündeki halkada durursan tezgahı sen çalıştırır, çıkan ürünleri sonraki istasyona taşırsın.
   Usta, depocu, kalite kontrolcü, tasarımcı ve satış asistanı işe alınca işler kendiliğinden yürür.
6. **Sevkiyat:** fabrikada konteyneri kendin yükle (3B mini oyun: döndür, yan yatır, yerleştir) ya da depocuya bırak.
   Doluluk yüksekse koli başı navlun düşer; "Tam dolu 40'" başarımı bekler.
7. **Harun'un "bitti" huyu:** panoda "tamamlandı" görünen sipariş gerçekten bitmemiş olabilir.
   Fabrikaya gidip sipariş panosuna ya da sevkiyat alanına kendi gözünle bak; müşteriyi önceden bilgilendir.

**Şirket yapısı ve iletişim kuralları**
- **Davut Bey** patrondur; talimatı her şeyden önce gelir (HUD'da ⭐ ile gösterilir). Ek iskonto, vade, yatırım ve fuar kararlarını o verir.
  Burak, Bünyamin ve Büşra doğrudan ona bağlıdır.
- **Harun Bey** üretimden ve finans-muhasebeden sorumludur: satışları ve tahsilatı takip eder, ödeme alır ve yapar. İskontoda söz hakkı yoktur.
- **İbrahim Bey** satın almadan sorumludur; maili pek kullanmaz, telefonla ya da yüz yüze konuşmayı sever.
- **Serkan Bey** ve **Semanur Hanım** Harun Bey'e bağlıdır ama bütün patronlar onlara iş verir.
  Serkan Bey üretimin bel kemiğidir: maliyet, fiyatlandırma ve termin için en çok ona danışılır (telefonda yaklaşık, fabrikada kesin).
  Semanur Hanım ERP yöneticisidir: sipariş açılış onayı ondan gelir, sipariş/stok durumu ona sorulur. **Onunla sadece mail ile görüşülür.**
- Günlük konularda Burak ve Bünyamin istişare eder; karar gerekiyorsa Davut Bey'e gidilir.
- **Mailde** herkes "Bey/Hanım" ile hitap eder; üst kadro (Davut, Harun, İbrahim) ilk isimle yazar.
- **WhatsApp'ta** Bünyamin Burak'a "abi", Burak Bünyamin'e "reis" der; Büşra ile "kuzen" denir. (Gelen Kutusu → WhatsApp sekmesi)

**Özgüven ve Analiz Döngüsü:** Karar ekranlarında (mail, teklif, ERP) uzun beklemek Analiz'i doldurur,
iç sesler "Biraz daha düzelteyim mi?" der. Karar vermek, sonuç mükemmel olmasa bile Özgüven'i artırır.
Özgüven 25: Davut Bey'den %3'e kadar ön iskonto yetkisi · 45: bölgesel fuarı kendin ayarla · 65: Bünyamin'e bölge stratejisi öner · 85: sakin zihin.

**Hikaye:** 1 İlk Konteyner (Bakü, eğitim) · 2 Komşu Pazarlar · 3 Avrupa'ya Giriş · 4 Asya Rotası · 5 Global Marka.
Bölüm sonunda Davut Bey toplantı odasında kutlama yapar. **Serbest Mod**: bölüm yok, bütün pazarlar açık.
İflas yok: kasa eksiye düşerse kurtarma kredisi (güven yüksekse Davut Bey bir kez destek verir).

**Kayıt:** 3 yuva, 30 saniyede bir ve gün sonunda otomatik kayıt, JSON dışa/içe aktarma (Menü → Kayıtlar).
Oyuna geri dönünce fabrika senin yokluğunda da çalışmış olur (en fazla 8 oyun saati) ve özet rapor gösterilir.

## Veri dosyaları (`src/data`) — kod değiştirmeden genişletme

Değişiklikten sonra `npm run build` ile yeniden derle.

| Dosya | İçerik |
|---|---|
| `balance.json` | Denge değerleri (aşağıya bak) |
| `products.json` | Ürün aileleri, reçeteler (istasyon + dakika), koli ölçüleri, kumaşlar, renkler, ölçüler, hammaddeler |
| `cities.json` | Şehirler/pazarlar, bölgeler, taşıma modları, konteyner boyutları, Incoterm'ler |
| `customers.json` | Firma tipleri ve firmalar |
| `characters.json` | Kadro: görünüm, rutin, güven, diyalog havuzu, aile bilgisi, çalışan görünümleri |
| `locations.json` | Lokasyonlar, yol süreleri, mağaza katları, fabrika istasyonları, genişleme alanları, şubeler |
| `chapters.json` | Bölümler, hedefler, açılan pazarlar |
| `tasks.json` | Toplantı görevleri ve karakter yan görevleri |
| `mailparts.json` | İlk temas maili parçaları |
| `events.json` | Rastgele olaylar ve sezon trendleri |
| `fairs.json` | Fuarlar, stand boyutları, temalar |
| `competitors.json` | Rakip firmalar |
| `research.json` | Tasarım stüdyosu araştırma ağacı |
| `achievements.json` | Başarımlar |
| `map.json` | Stilize harita kara/deniz çokgenleri |

**Yeni ürün:** `products.json → families` listesine bir öğe ekle:
`{ "id": "puf", "name": "Puf", "open": false, "priceUSD": 150, "box": [60, 60, 45], "materials": { "kereste": 0.01, "sunger": 3, "kumas": 2, "metal": 0, "cila": 0 }, "stations": [["kumas", 10], ["doseme", 25], ["paket", 6]], "styles": ["bohem"], "model": "armchair" }`.
`open: true` ise baştan açıktır; değilse `research.json`'a `{ "unlock": { "family": "puf" } }` olan bir araştırma ekle.
`model`: sofa, armchair, corner, bed, table, chair, coffee, tv, console.

**Yeni şehir:** `cities.json → list` içine aynı yapıyla ekle (`lon/lat` haritadaki yer, `chapter` hangi bölümde açılacağı,
`logistics` kullanılabilir taşıma modları `[gün, USD]`). Bünyamin'in hesabıysa `"owner": "bunyamin"`.
İstersen `chapters.json`'daki ilgili bölümün `unlock` listesine de yaz.

**Yeni müşteri:** `customers.json → firms` içine `{ "city": "...", "name": "...", "type": "magaza", "size": 2, "style": "modern", "priceSens": 0.5, "comm": "samimi", "contact": "Ad Soyad" }`.
(Yeni oyunda görünür; eski kayıtlar o anki listeyi saklar.)

**Yeni karakter:** `characters.json → list` içine `look`, `routine` (`[saat, lokasyon, nokta]`), `lines`, `trust`, `family` ile ekle;
noktayı `spots` altında tanımla (`{ "floor": 3, "pos": [x, z], "face": 0 }`).

**Yeni lokasyon/genişleme:** `locations.json → factory.expansions` (alan ve maliyet), `store.floors` (teşhir yuvaları),
`branches` (şube) ve `travel` (yol süreleri). Tamamen yeni bir sahne türü için `src/locations` altında bir modül gerekir.

## Dengeyi ayarlamak için en önemli 10 değer (`balance.json` ve ürün/şehir verisi)

1. `time.realSecondsPerDay` (240) — bir oyun gününün gerçek saniyesi; oyunun temposu.
2. `startCashTL` (2.500.000) — başlangıç kasası; zorluk.
3. `products.json → families[].priceUSD` — liste fiyatları; kâr marjının ana kaynağı.
4. `products.json → families[].stations` dakikaları — üretim hızı ve termin.
5. `salaries` — aylık maaşlar; sabit gider baskısı.
6. `autoTransferMinutes` (45) / `depocuTransferMinutes` (8) — forklift ve depocu taşıma süresi; depocunun değeri.
7. `discountBase` (0,07) — Davut Bey'in genelde onayladığı ek iskonto tavanı (güven yükseldikçe artar).
8. `harunFakeDoneChance` (0,22) — Harun'un siparişi erken "tamamlandı" işaretleme sıklığı.
9. `fxDailyDrift` / `fxDailyVolatility` — kurun yönü ve oynaklığı.
10. `cities.json → priceLevel`, `payRel` ve `logistics` — pazarın fiyat seviyesi, ödeme güvenilirliği ve navlun.

Ek olarak: `customers.json → types[].replyBase` (mail cevap oranı), `loanRateMonthly`, `offlineMaxHours`, `playerSpeed`, `carryCapacity`.

## Klasör yapısı

```
src/core       oyun döngüsü, zaman, kayıt, hikaye, özgüven, olaylar, YK toplantısı
src/locations  3B sahneler: Bostancı mağaza (4 kat), fabrika, şubeler, sahne yöneticisi
src/factory    üretim simülasyonu, tasarım stüdyosu
src/world      harita, lojistik, konteyner mini oyunu, fuarlar
src/crm        gelen kutusu, müşteriler, mail, pazarlık, ERP, siparişler, pazarlama
src/economy    para, kur, fiyatlama, finans paneli, rakipler
src/characters karakter modelleri, portreler, rutinler, onay zinciri, kadro paneli
src/ui         HUD, paneller, menü, raporlar, grafikler
src/data       bütün JSON verisi
```
