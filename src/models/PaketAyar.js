const mongoose = require("mongoose");

/**
 * PAKET AYARI — sunucuya özel paket düzenlemesi.
 *
 * `utils/paket-config.js` paketlerin VARSAYILANINI tutuyor (id, ad, emoji,
 * varsayılan limit). Bu koleksiyon ise sunucu bazında o varsayılanları
 * ezmeye yarıyor: `.paket-setup` panelinden limit ve rol seçiliyor.
 *
 * ⚠️ Kayıt olmayan paket = varsayılan geçerli. Yani bir paketi hiç
 * ayarlamazsan `paket-config.js`'teki değer kullanılmaya devam eder;
 * panel sadece FARKLI olanı saklıyor.
 */
const paketAyarSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  paketId: { type: String, required: true },

  // null → paket-config.js'teki varsayılan limit kullanılır.
  sinir: { type: Number, default: null },

  // Kod kullanılınca verilecek, paket bitince alınacak rol. null → rol yok.
  rolId: { type: String, default: null },

  guncelleyen: { type: String, default: null },
  guncellemeTarihi: { type: Date, default: Date.now },
});

// Sunucu + paket çifti tekil olmalı; `ayarKaydet` bu indekse dayanan
// bir upsert yapıyor.
paketAyarSchema.index({ guildId: 1, paketId: 1 }, { unique: true });

module.exports = mongoose.model("PaketAyar", paketAyarSchema);
