# Lavanta Koyu

Kullanıcı Türkçe konuşur, kod bilmez; sade Türkçe ile kısa cevap ver. Oyun eşine (Elif) hediye, mağazaya çıkmayacak.
Tasarım belgesi: `TASARIM.md` (fazlar). Hırsız olayı İSTENMİYOR (Elif sevmedi).

## Yapı
- `web/v2/`: **Lavanta Koyu** (tek oyun; klasör adı `v2` eski kalıntıdır, kayıt ve bulut anahtarları `otel2_kayit_v1`, `kayit2`, `yedek2` değişmez). three.js + HTML arayüz. Kayıt `otel2_kayit_v1` (localStorage) + bulut `kayit2`/`yedek2`.
  - `src/00_engine.js`: motor (Mathf, Random, Vec, Col, Store, Behaviour, U: malzeme/geometri/model/Merge, TextMesh, Particles, ProgressPad, Rig, Tween, Sfx, Input).
    Koordinat: düz three.js uzayı (x doğu, y yukarı, z güney); `W` kök grup. Modeller `U.Model/U.Furn/U.City` (taban pos.y, orta pos.x/z).
    Performans: dokusuz mobilya modelleri `U.mergedModel` ile tek ağa birleşir (köşe rengi, `vertexMat`); oda duvarları oda başına tek `U.Merge`; bakılmayan kattaki karakterler çizilmez; `Quality.PixelRatio` toplam pikseli sınırlar. Karakter modeli yaw 0'da +z'ye bakar (`Rig.CharYaw=0`), Kenney mobilyası -z'ye (katalogda `yaw:180`).
  - `05_ui.js` DOM arayüz (Hud, Floors, Toast, Label=3B noktaya bağlı etiket, Sheet=alt sayfa, Dialog=oyunu durduran pencere).
  - `10_data.js` veriler · `20_world.js` kasaba/deniz/gündüz-gece/lambalar · `25_hotel.js` katlı otel (odalar, lobi, çatı, kesit, yürünebilirlik, `Path` asansörlü yol)
  - `30_camera.js` kamera + dokunma hareketleri (sürükle=joystick, dokun=git/seç, iki parmak=yakınlaş/döndür, sağ fare=döndür, Q/E)
  - `35_player.js` · `40_guest.js` (Guest/Follower) · `45_staff.js` (resepsiyonist, temizlikçi, kat görevlisi) · `60_game.js` (durum, kayıt, görevler, öğretici, menüler)
  - `58_life.js` (Life): yıldız şartları (`st.stars`, düşmez) ve misafir puanı (`st.recent` son 20), mevsimler (7 gün), hava + yağmur/kar efekti, günlük olaylar (`st.event`), oda arızası (`state 'broken'`).
  - `57_talks.js` (TalkData: sohbet metinleri, eski oyundan taşındı) · `59_social.js` (Social: Otelgram akışı `st.feed`, takipçi, mektuplar `st.letters` ve küçük hikâyeler `st.arcs`; Chat: tam ekran sohbet penceresi, `UI.overlay` ile oyunu durdurur). Serbest yazışma `sample` yeteneğiyle (yoksa düğme gizli); gizli misafirler (`disguise`) sıradan tür gibi konuşur. Yazarken oyun tuşları kapalı (30_camera keydown). Test: `test_social.py`.
  - `70_cloud.js` bulut · `80_quality.js` grafik + fotoğraf · `99_main.js` açılış/döngü.
  - Modeller `models/*.glb` (Kenney karakter 12, mobilya 30, kasaba paketi 15, bulut/bayrak) + ham dokular `characters.rgba.json`, `city.rgba.json`
    (`python3 ../tools_png2rgba.py png çıktı.json [--noflip]`; kasaba dokusu --noflip). build.mjs GLB'lerden doku başvurularını çıkarır, çalışırken DataTexture takılır.
  - Derleme: `cd web/v2 && node build.mjs` (`--dev` küçültmez) → `dist/index.html`, `dist/game.js`, `dist/models.json`, `dist/play.html`.
  - Testler: `python3 test_boot.py çıktı.png [en boy sn js] [--touch]`, `test_flow.py` (tam oyun akışı), `test_iphone.py` (iPhone 14 Pro: hata, binişme, taşma, renk), `test_cloud.py` (7 senaryo).
    Hızlandırma: `window.__sub = 6` (mantık adımı), `window.__noRender = 1` (çizim seyreltir). Başsız Chromium'da fps çok düşük; testlerde `Quality.Set(0)`.
    Her değişiklikten sonra test_flow + test_iphone çalıştır; ekran görüntülerine de bak.

## Yayın
- Oyun (Lavanta Koyu): https://claude.ai/artifact/S2QERxjzjMcvqwaBP7W4Xy (url ile güncelle). `Artifact` publish: file_path `web/v2/dist/index.html`, files `{"game.js": "web/v2/dist/game.js", "models.json": "web/v2/dist/models.json"}` (çalışma dizini repo kökü iken), capabilities `{db:{}, user:{}, downloads:true, sample:{}}` (sample: serbest sohbet; eksik bırakılırsa yetenek iptal olur, hep tam seti ver).
- Kullanıcı iPhone 14 Pro (Safari) ve M2 MacBook Air'de oynuyor. Eşi kendi kaydına yazabilsin diye paylaşımda en az Contributor yetkisi gerekir.
