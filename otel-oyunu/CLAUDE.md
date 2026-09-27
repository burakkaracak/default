# Otel Ustası (My Perfect Hotel tarzı 3D otel oyunu)

Kullanıcı Türkçe konuşur; kısa, Türkçe cevap ver. Token tasarrufu önemli: sadece ilgili parçayı oku (grep ile bul), tüm dosyaları okuma.

## Yapı
Tek HTML oyun, three.js r128 (cdnjs). Kaynak `src/` altında parçalar, `build.py` sırayla birleştirir:
p0_head.html (CSS+HUD) → p1_core (veri, GTYPES, UPG, yıldız, ses, SAVE_KEY) → p2_render (renderer, prosedürel doku) → p26_gfx (env map, post: SAO/bloom/grade, kalite) → p3_world (yerleşim, odalar, kafe, bahçe) → p4_nav (A*, 4 kat, ROOF=3) → p5_chars (karakter modelleri) → p6_ents (misafir/personel/asansör) → p7_systems (görev, olay, maaş) → p75_extras (kriz, kedi, özelleştirme) → p76_features (çatı, helikopter, FP modu, temalar, AI sohbet) → p77_polish (lüks, log, kamera, yardım, export) → p78_mega (sandbox admin, XP/seviye, combo, 48 başarım, hava, mevsim) → p79_mega2 (spa, çamaşırhane, etkinlik rezervasyonu/festival, personel enerjisi, oda temaları) → p80_depth (fiyat, rakip otel, tedarik, sadık misafir, kredi) → p81_depth2 (yetenek ağacı, zincir müdürleri, personel kariyeri, haftalık görev, ödül yolu, kupa, x2 hız, kasa asistanı) → p82_events (hikâye misafirleri, fırtına/sıcak/zam, şehir festivali, hırsız/kayıp çocuk, temizlik kalitesi, tamir mini oyunu) → p83_gfx2 (havai fişek, LED cephe, sis, su birikintisi, yüz ifadeleri, sinematik kamera, TV ışığı, kelebek/kar/ağustos böceği) → p84_ai2 (oda tasarımcısı, konuşan personel, sabah gazetesi, bulut kayıt: db+user) → p8_ui (HUD, menüler, input, ana döngü, boot).
`src/p9_debug.js` sadece test/demo içindir, sürüme ASLA girmez.

## Komutlar
- `python3 build.py` → `src/game.html` (sürüm) + `test2.html` (mock THREE) + `chk.js`; sonra `node --check chk.js`.
- `python3 build.py --bot` bot.js ekler (t_sim için). Testler: `python3 t_boot.py`, t_hire, t_new, t_admin, t_x, t_f, t_staff*, t_tech2, t_idle; `python3 t_sim.py 25` denge simülasyonu (hedef: 3★~gün9, 4★~14-18, 5★~20-23). mock testlerinde "ERR_TUNNEL_CONNECTION_FAILED" CDN hatası normaldir.
- Gerçek WebGL görsel: bir kez `git clone --depth 1 --filter=blob:none --sparse -b r128 https://github.com/mrdoob/three.js t3 && git -C t3 sparse-checkout set examples/js`; sonra `python3 mkvis.py && python3 t_vis.py 'wait:3000' 'shot:x.png'` (VW/VH env ile boyut).

## Yayın kuralları
- Artifact: https://claude.ai/artifact/95QP8PCqhQZs5NMpWdDsF8 — hep AYNI url ile güncelle (Artifact publish, url=...), capabilities `{sample:{}, downloads:true, db:{}, user:{}}` korunsun (belirtilmezse korunur; db+user bulut kayıt için).
- Kayıt anahtarı `otel_ustasi_v2` (+`_bak`, sandbox `otel_ustasi_v2_sandbox`) — eski kayıtlarla uyumluluğu bozma; yeni alanlara varsayılan ver.
- Post-process scriptleri jsdelivr `npm/three@0.128.0/examples/js/` altından lazy yüklenir.
- Mevcut sürüm: v29 (artifact). Şehirler 6 (İstanbul→Dubai, sonra tur); yapay zekâ özellikleri p76'da (sohbet, yorum, olay, danışman, müfettiş raporu), yapay zekâ yoksa şablona düşer.
