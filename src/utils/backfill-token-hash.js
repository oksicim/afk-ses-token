// Mevcut tokenlere `tokenHash` parmak izini geriye dönük yazar.
//
// NEDEN GEREKLİ: mükerrer token kontrolü artık `tokenHash` indeksi üzerinden
// yapılıyor. Bu alan olmayan eski kayıtlar sorguda görünmez, yani backfill
// çalıştırılmadan "bu token zaten kayıtlı" uyarısı eski tokenler için
// verilmez ve aynı token ikinci kez eklenebilir.
//
// Çalıştırma:  npm run backfill-hash
//
// İdempotenttir: zaten parmak izi olan kayıtlara dokunmaz, istediğin kadar
// çalıştırabilirsin.

const mongoose = require("mongoose");
const { mongoUri } = require("../config");
const { decrypt, tokenParmakIzi } = require("./crypto-helper");
const Token = require("../models/Token");

// Tek seferde kaç güncelleme toplanıp yazılsın.
const YIGIN = 500;

async function backfill() {
  await mongoose.connect(mongoUri);
  console.log("[Backfill] MongoDB bağlantısı kuruldu.");

  const eksikSayi = await Token.countDocuments({
    $or: [{ tokenHash: null }, { tokenHash: { $exists: false } }],
  });

  if (eksikSayi === 0) {
    console.log("[Backfill] Parmak izi eksik token yok — yapılacak bir şey yok.");
    await mongoose.disconnect();
    return;
  }

  console.log(`[Backfill] ${eksikSayi} tokenin parmak izi üretilecek...`);

  let islenen = 0;
  let cozulemeyen = 0;
  let cakisan = 0;
  let yigin = [];

  const yiginYaz = async () => {
    if (yigin.length === 0) return;
    try {
      // `ordered: false`: bir belge benzersizlik çakışması verirse kalanlar
      // yine de yazılır. Çakışma = aynı token iki kez kayıtlı demek, bu
      // gerçek bir veri sorunu ve aşağıda ayrıca raporlanıyor.
      await Token.bulkWrite(yigin, { ordered: false });
    } catch (err) {
      const yazilamayan = err?.writeErrors?.length ?? 0;
      cakisan += yazilamayan;
      if (yazilamayan === 0) throw err;
    }
    yigin = [];
  };

  // `cursor()`: tüm koleksiyonu belleğe almadan akış hâlinde okur.
  const imlec = Token.find(
    { $or: [{ tokenHash: null }, { tokenHash: { $exists: false } }] },
    { token: 1 },
  )
    .lean()
    .cursor();

  for await (const belge of imlec) {
    const duz = decrypt(belge.token);

    if (!duz) {
      // Anahtar değişmiş ya da kayıt bozuk — parmak izi üretilemez.
      cozulemeyen++;
      continue;
    }

    yigin.push({
      updateOne: {
        filter: { _id: belge._id },
        update: { $set: { tokenHash: tokenParmakIzi(duz) } },
      },
    });

    islenen++;
    if (yigin.length >= YIGIN) {
      await yiginYaz();
      console.log(`[Backfill] ${islenen}/${eksikSayi}...`);
    }
  }

  await yiginYaz();

  console.log("\n[Backfill] Tamamlandı.");
  console.log(`  ✓ Parmak izi yazılan : ${islenen - cakisan}`);
  if (cakisan > 0) {
    console.log(`  ⚠ Mükerrer (çakışan) : ${cakisan} — aynı token birden fazla kayıtlı, elle temizle.`);
  }
  if (cozulemeyen > 0) {
    console.log(`  ✗ Çözülemeyen        : ${cozulemeyen} — yanlış encryptionKey ya da bozuk kayıt.`);
  }

  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("[Backfill] Hata:", err);
  process.exit(1);
});
