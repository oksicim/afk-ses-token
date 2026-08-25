// Demo panellerinin ("panel-demo" komutu) mesajlarını tutar.
// Anahtar: panel mesajının ID'si → Değer: butona basınca gönderilecek metin.
//
// KALICI: veriler diske (data/panel-demo-data.json) yazılır. Böylece bot yeniden
// başladığında eski demo panellerinin butonları da çalışmaya devam eder.
const fs = require("fs");
const path = require("path");

const DOSYA = path.join(__dirname, "..", "..", "data", "panel-demo-data.json");

// Açılışta diskten yükle (bozuk/eksik dosyada boş başla).
function yukle() {
  try {
    const ham = fs.readFileSync(DOSYA, "utf8");
    const obj = JSON.parse(ham);
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

const veri = yukle();

function kaydet() {
  try {
    fs.mkdirSync(path.dirname(DOSYA), { recursive: true });
    fs.writeFileSync(DOSYA, JSON.stringify(Object.fromEntries(veri)), "utf8");
  } catch (err) {
    console.error("[panel-demo] Kayıt hatası:", err.message);
  }
}

module.exports = {
  get: (id) => veri.get(id),
  has: (id) => veri.has(id),
  set(id, mesaj) {
    veri.set(id, mesaj);
    kaydet();
    return this;
  },
  delete(id) {
    const vardi = veri.delete(id);
    if (vardi) kaydet();
    return vardi;
  },
};
