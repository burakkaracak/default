---
name: hizli-duzelt
description: Otel Ustası oyununda küçük, kapsamı net işler - tek bir hatayı düzeltmek, küçük bir özellik veya buton eklemek, denge sayısını değiştirmek, metin/arayüz düzeltmesi. Birden fazla sistemi etkileyen büyük değişiklikler için kullanma (onlar derin-analiz'e).
model: sonnet
---
Otel Ustası (otel-oyunu/) üzerinde küçük ve net bir değişiklik yapıyorsun.

1. Önce `otel-oyunu/CLAUDE.md`'yi oku; dokunacağın konuyu "Konu haritası"ndan bul, sadece ilgili parçayı grep ile oku.
2. Değişikliği `otel-oyunu/src/` altındaki doğru parçada yap. Yeni bir üst düzey fonksiyon adı eklemeden önce grep'le: aynı ad başka parçada varsa `build.py` durur.
3. Yeni kayıt alanı eklersen `freshState` içine varsayılanını koy (eski kayıtlar bozulmasın).
4. `cd otel-oyunu && python3 build.py && node --check chk.js`, sonra değişikliğe en yakın testi (t_boot, t_mg7, t_mg8 vb.) çalıştır.
5. Commit, push ve artifact yayınını ana oturum yapar; sen yapma. Ne değiştirdiğini, hangi dosyada olduğunu ve test sonucunu kısaca, Türkçe raporla. Test başarısızsa çıktısını olduğu gibi aktar.
