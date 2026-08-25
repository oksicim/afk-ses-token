const mongoose = require("mongoose");

/**
 * PAKET KODU
 *
 * itemsatis vb. yerlerde satılan kodlar. Kullanıcı `.kod-kullan-menu`
 * panelindeki butona basıp kodu giriyor, karşılığında paketi (yani token
 * limitini) alıyor.
 *
 * Kod tek kullanımlıktır: `kullanildi` alanı atomik olarak işaretlenir
 * (bkz. utils/kod-uygula.js), yani aynı kodu aynı anda giren iki kişiden
 * yalnızca biri alır.
 */
const kodSchema = new mongoose.Schema({
  // Her zaman BÜYÜK HARF ve tire'siz saklanır (bkz. kodNormalize).
  kod: { type: String, required: true, unique: true },

  // `utils/paket-config.js` içindeki paket id'si.
  paketId: { type: String, required: true },

  // Paketin kaç gün süreceği. Kod üretilirken belirlenir.
  gun: { type: Number, default: 30 },

  olusturan: { type: String, required: true },
  olusturmaTarihi: { type: Date, default: Date.now },

  // Sipariş numarası gibi serbest not — hangi satışa ait olduğunu izlemek için.
  not: { type: String, default: null },

  kullanildi: { type: Boolean, default: false },
  kullanan: { type: String, default: null },
  kullanimTarihi: { type: Date, default: null },
  kullanildigiGuild: { type: String, default: null },
});

// ── İndeksler ──────────────────────────────────────────────────────────────

// `kod` alanındaki `unique: true` zaten indeks kuruyor; kullanılmamış
// kodları paket bazında saymak (`.kod-liste`) için ayrı bir indeks gerekiyor.
kodSchema.index({ paketId: 1, kullanildi: 1 });

// "Bu kullanıcı hangi kodları kullandı?" sorgusu.
kodSchema.index({ kullanan: 1 });

module.exports = mongoose.model("Kod", kodSchema);
