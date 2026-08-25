# emojiler/

Bot açılışta bu klasördeki emojileri **uygulama emojisi** olarak yükler.

- Dosya adı = emoji adı. `basarili.png` → `emoji("basarili")`
- Desteklenen: `.png` `.jpg` `.gif` `.webp` — en fazla **256 KB**
- Ad kuralı: 2-32 karakter, sadece harf/rakam/alt çizgi
- Alt klasör kullanabilirsin, Discord'a düz gider (Discord'da kategori yok)

Katalog `utils/emojiler.js` içinde. Oraya eklemediğin bir ad `emoji()` ile
istenirse konsola uyarı düşer.

Otomatik yükleme **hiçbir şey silmez**. Durum için `.emojikur`, yüklemek için
`.emojikur uygula`.
