const mongoose = require("mongoose");

// Tüm tokenlerin kullandığı GLOBAL aktivite (RichPresence). Tek belge (_id=global).
// Sadece owner panelden değiştirir; yeniden başlatınca DB'den yüklenir.
const aktiviteSchema = new mongoose.Schema({
  _id: { type: String, default: "global" },
  aktif: { type: Boolean, default: true },
  tur: { type: String, default: "PLAYING" }, // PLAYING|STREAMING|LISTENING|WATCHING
  isim: { type: String, default: "DISCORD.GG/NPM" },
  detay: { type: String, default: "24/7 Seste Aktif | by oxy" },
  durum: { type: String, default: "" }, // state
  url: { type: String, default: "" },
  buyukResim: { type: String, default: "" },
  kucukResim: { type: String, default: "" },
  buton1Ad: { type: String, default: "" },
  buton1Url: { type: String, default: "" },
  buton2Ad: { type: String, default: "" },
  buton2Url: { type: String, default: "" },
});

module.exports = mongoose.model("Aktivite", aktiviteSchema);
