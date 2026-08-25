const path = require("path");

const kok = path.resolve(__dirname, "..");
const cevrimdisi = process.argv.includes("--offline");
let hataSayisi = 0;

function basarili(metin) {
  console.log(`✅ ${metin}`);
}

function hatali(metin) {
  hataSayisi += 1;
  console.error(`❌ ${metin}`);
}

function guvenliHata(error, config = {}) {
  let metin = String(error?.message || error || "Bilinmeyen hata");
  for (const gizli of [config.botToken, config.mongoUri]) {
    if (gizli) metin = metin.split(gizli).join("[GİZLENDİ]");
  }
  return metin.slice(0, 350);
}

function temelKontroller(config) {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major > 20 || (major === 20 && minor >= 19)) {
    basarili(`Node.js ${process.versions.node}`);
  } else {
    hatali("Node.js 20.19.0 veya daha yeni bir sürüm gerekli.");
  }

  for (const paket of ["discord.js", "discord.js-selfbot-v13", "mongoose"]) {
    try {
      require.resolve(paket, { paths: [kok] });
      basarili(`${paket} yüklü`);
    } catch {
      hatali(`${paket} yüklü değil`);
    }
  }

  if (!config.botToken || config.botToken.length < 20) hatali("Bot tokeni eksik.");
  else basarili("Bot tokeni ayarlanmış");

  if (!/^mongodb(?:\+srv)?:\/\//i.test(config.mongoUri || "")) {
    hatali("MongoDB bağlantı adresi geçersiz.");
  } else {
    basarili("MongoDB adresi ayarlanmış");
  }

  if (!/^\d{17,20}$/.test(String(config.ownerId || ""))) hatali("Bot sahibi ID'si geçersiz.");
  else basarili("Bot sahibi ID'si ayarlanmış");

  if (!config.encryptionKey || config.encryptionKey.length < 32) hatali("Şifreleme anahtarı geçersiz.");
  else basarili("Şifreleme anahtarı hazır");
}

async function discordKontrol(config) {
  try {
    const cevap = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${config.botToken}` },
      signal: AbortSignal.timeout(12_000),
    });

    if (cevap.ok) {
      const bot = await cevap.json();
      basarili(`Discord bağlantısı: ${bot.username}`);
      return;
    }

    if (cevap.status === 401) hatali("Discord bot tokeni geçersiz.");
    else hatali(`Discord bağlantısı reddedildi. HTTP ${cevap.status}`);
  } catch (error) {
    hatali(`Discord'a ulaşılamadı: ${guvenliHata(error, config)}`);
  }
}

async function mongoKontrol(config) {
  let mongoose;
  try {
    mongoose = require("mongoose");
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 12_000,
      connectTimeoutMS: 12_000,
    });
    await mongoose.connection.db.admin().ping();
    basarili("MongoDB bağlantısı kuruldu");
  } catch (error) {
    hatali(`MongoDB bağlantısı kurulamadı: ${guvenliHata(error, config)}`);
  } finally {
    if (mongoose?.connection?.readyState) await mongoose.disconnect().catch(() => {});
  }
}

async function main() {
  console.log("\n========================================");
  console.log(" Ses AFK Token - Sistem Kontrolü");
  console.log("========================================\n");

  let config;
  try {
    config = require(path.join(kok, "config.js"));
  } catch (error) {
    hatali(`config.js okunamadı: ${guvenliHata(error)}`);
    process.exitCode = 1;
    return;
  }

  temelKontroller(config);

  if (!cevrimdisi && hataSayisi === 0) {
    await Promise.all([discordKontrol(config), mongoKontrol(config)]);
  } else if (cevrimdisi) {
    console.log("ℹ️ Çevrimdışı kontrol: Discord ve MongoDB bağlantıları denenmedi.");
  }

  console.log("");
  if (hataSayisi === 0) {
    console.log("🎉 Tüm kontroller başarılı.");
  } else {
    console.error(`⚠️ ${hataSayisi} kontrol başarısız. README.md içindeki Sorun Giderme bölümüne bak.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("❌ Kontrol sırasında beklenmeyen hata:", guvenliHata(error));
  process.exit(1);
});
