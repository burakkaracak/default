# Otel Ustası

Kullanıcı Türkçe konuşur, kod bilmez; sade Türkçe ile kısa cevap ver. Oyun eşine hediye, mağazaya çıkmayacak.

## Yapı
- `unity/`: Asıl Unity projesi (Assets/Scripts altında 35 C# dosyası). Kaynak/başvuru olarak durur, burada düzenlenmez.
- `web/`: Unity oyununun tarayıcı sürümü (three.js). Kullanıcının oynadığı sürüm bu.
  - `web/src/00_engine.js`: Unity yardımcılarının karşılıkları (U, Mathf, Random, Time, Store, GUI=IMGUI taklidi, Rig, Sfx).
    Bütün oyun nesneleri `W` grubunda; W'nin z ölçeği -1, böylece Unity sayıları (konum/döndürme) aynen geçerli.
  - `web/src/NN_*.js`: C# dosyalarının satır satır çevirisi (aynı sınıf ve üye adları). Kurallar: `web/PORTING.md`.
  - `web/models/*.glb`: Kenney karakter/mobilya modelleri (FBX'ten çevrildi; mobilyalar assimp ile, karakterler three FBXLoader ile).
  - Derleme: `cd web && npm i && node build.mjs` → `dist/index.html` (artifact sayfası), `dist/game.js`, `dist/models.json`, `dist/play.html` (yerel deneme).
  - Testler (başsız Chromium): `python3 test_boot.py çıktı.png 1280 800 saniye "js"`, `test_smoke.py` (tüm sistemler + menü sekmeleri), `test_click.py çıktı 390 844 1` (telefon dokunma), `test_text.py` (yazı taşması; 4 ekran boyutu, 0 olmalı).
    Her değişiklikten sonra `python3 test_iphone.py` çalıştır (iPhone 14 Pro taklidi: hata, taşan yazı, binen üst kutular, soluk renk; ekran görüntülerine de bak). Kullanıcı iPhone 14 Pro'da Safari ile oynuyor.
    Hata ayıklama: `window.__game` (GameManager, Popups, Store...), `window.__sub = 8` mantığı hızlandırır.
- Unity'de olmayan, sonradan eklenenler: restoran + garson (`web/src/64_restaurant.js`), yeni misafir türleri Köpekli/Fenomen/Emekli/Öğrenci/Sporcu (`33_customer.js`, köpek: `Dog`).
  Elif için: spa + terapist (`66_spa.js`, restoranın doğusu), bahçede düğün organizasyonu (`67_wedding.js`, 3. günden sonra teklif gelir),
  fotoğraf modu (`68_photo.js`, `downloads` yeteneğiyle kaydeder). Dışarısı yürünebilir, trafik hareketli (`65_outside.js`).
  Grafik kalitesi Düşük/Orta/Yüksek (`97_quality.js`, FPS<40 olursa kendiliğinden düşer; Ayarlar'da seçilebilir).
  Otel zinciri (`56_chain.js`): resepsiyonisti olan diğer oteller sen başka oteldeyken de kazanır (`Chain.TickBackground`, dakikalık oran `idleRate`).
  Hırsız olayı İSTENMİYOR (Elif sevmedi).
- `eski-oyun-fikirleri.md`: Silinen eski web oyunundan fikirler (kalanlar: spor salonu, çatı barı, yeni şehirler, etkinlikler, başarımlar, albüm).

## Yayın
- Artifact: https://claude.ai/artifact/FwXmtN8maAGCFSH5GXt1hu — hep aynı adres: `Artifact` publish, file_path `web/dist/index.html`,
  files `{"game.js": "dist/game.js", "models.json": "dist/models.json"}` (çalışma dizini web/ iken), url ile güncelle.
- capabilities `{db:{}, user:{}, downloads:true}` korunsun (redeploy'da capabilities verme ya da aynısını ver).
- Kayıt: localStorage (`otel_ustasi_kayit_v1`) + bulut (`web/src/98_cloud.js`, db `data/users/<id>/kayit`, kişiye özel).
  Açılışta yeni olan (`__savedAt`) kullanılır, 15 sn'de bir ve sayfa gizlenince buluta yazılır. Test: `test_cloud.py`.
  Eşi kendi kaydına yazabilsin diye paylaşımda en az Contributor (Katkıda bulunan) yetkisi gerekir.
