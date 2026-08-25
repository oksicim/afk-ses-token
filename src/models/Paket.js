const mongoose = require("mongoose");

const paketSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    paketAdi: { type: String, required: true },
    sinir: { type: Number, required: true },
    rolId: { type: String, default: null },
    baslangic: { type: Date, default: Date.now },
    bitis: { type: Date, required: true },
    aktif: { type: Boolean, default: true },
    tanimlayan: { type: String, required: true },
});

// ── İndeksler ──────────────────────────────────────────────────────────────
// Paket koleksiyonunda HİÇ indeks yoktu; aşağıdaki desenlerin hepsi tüm
// koleksiyonu tarıyordu.

// En sık desen: `{ userId, guildId, aktif }` — limit kontrolü, paket
// tanımlama/kaldırma/uzatma ve paket bilgisi hepsi bunu kullanıyor.
paketSchema.index({ userId: 1, guildId: 1, aktif: 1 });

// `.paketler` komutu: sunucudaki tüm aktif paketler, bitişe göre sıralı.
// `bitis` indekse dahil çünkü sıralama da indeksten karşılansın.
paketSchema.index({ guildId: 1, aktif: 1, bitis: 1 });

// Süresi dolan paketleri bulan 5 dakikalık tur (`paket-kontrol.js`).
paketSchema.index({ aktif: 1, bitis: 1 });

module.exports = mongoose.model("Paket", paketSchema);
