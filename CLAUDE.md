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
  - Testler (başsız Chromium): `python3 test_boot.py çıktı.png 1280 800 saniye "js"`, `test_smoke.py` (tüm sistemler + menü sekmeleri), `test_click.py çıktı 390 844 1` (telefon dokunma).
    Hata ayıklama: `window.__game` (GameManager, Popups, Store...), `window.__sub = 8` mantığı hızlandırır.
- `eski-oyun-fikirleri.md`: Silinen eski web oyunundan fikirler.

## Yayın
- Artifact: https://claude.ai/artifact/FwXmtN8maAGCFSH5GXt1hu — hep aynı adres: `Artifact` publish, file_path `web/dist/index.html`,
  files `{"game.js": "dist/game.js", "models.json": "dist/models.json"}` (çalışma dizini web/ iken), url ile güncelle.
- Kayıt tarayıcının localStorage'ında (`otel_ustasi_kayit_v1`); cihazlar arası ortak değil.
