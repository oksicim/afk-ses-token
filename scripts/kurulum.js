const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline/promises");

const kok = path.resolve(__dirname, "..");
const configYolu = path.join(kok, "config.js");
const yerelMongoKullan = process.argv.includes("--local-mongo");
const discordOtomatik = process.argv.includes("--auto-discord");
const sadeceConfigKontrol = process.argv.includes("--config-kontrol");
const yerelMongoUri = "mongodb://127.0.0.1:27017/tokenonline";

function bosVeyaOrnek(deger) {
  if (typeof deger !== "string" || !deger.trim()) return true;
  return /(BURAYA|TOKENI|KULLANICI_ID|UYGULAMA_ID|OTOMATIK|change-this|your-)/i.test(deger);
}

function ayarlariDogrula(config) {
  const hatalar = [];

  if (bosVeyaOrnek(config.botToken)) hatalar.push("Discord bot tokeni eksik");
  if (
    bosVeyaOrnek(config.mongoUri) ||
    !/^mongodb(?:\+srv)?:\/\//i.test(config.mongoUri)
  ) {
    hatalar.push("MongoDB bağlantı adresi geçersiz");
  }
  if (!/^\d{17,20}$/.test(String(config.ownerId || ""))) {
    hatalar.push("Bot sahibi kullanıcı ID'si geçersiz");
  }
  if (!/^\d{17,20}$/.test(String(config.rpcAppId || ""))) {
    hatalar.push("Discord uygulama ID'si geçersiz");
  }
  if (bosVeyaOrnek(config.encryptionKey) || config.encryptionKey.length < 32) {
    hatalar.push("Şifreleme anahtarı eksik veya çok kısa");
  }

  return hatalar;
}

function mevcutConfigOku() {
  if (!fs.existsSync(configYolu)) return null;

  try {
    delete require.cache[require.resolve(configYolu)];
    return require(configYolu);
  } catch (error) {
    return { __okumaHatasi: error.message };
  }
}

function bottanUygulamaId(token) {
  try {
    const id = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
    return /^\d{17,20}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

async function sor(rl, metin, kontrol, hataMetni, varsayilan = "") {
  while (true) {
    const ek = varsayilan ? ` [${varsayilan}]` : "";
    const cevap = (await rl.question(`${metin}${ek}: `)).trim() || varsayilan;
    if (kontrol(cevap)) return cevap;
    console.log(`  ❌ ${hataMetni}`);
  }
}

async function evetHayir(rl, metin, varsayilan = false) {
  const ipucu = varsayilan ? "E/h" : "e/H";
  const cevap = (await rl.question(`${metin} [${ipucu}]: `)).trim().toLocaleLowerCase("tr-TR");
  if (!cevap) return varsayilan;
  return cevap === "e" || cevap === "evet";
}

function configMetniOlustur(ayarlar) {
  const yaz = (deger) => JSON.stringify(deger);

  return `// Bu dosya kurulum sihirbazı tarafından oluşturuldu.
// Gizli bilgi içerir; paylaşma ve Git'e ekleme.
module.exports = {
  botToken: ${yaz(ayarlar.botToken)},
  mongoUri: ${yaz(ayarlar.mongoUri)},
  prefix: ${yaz(ayarlar.prefix)},
  renk: 0x5865f2,
  ownerId: ${yaz(ayarlar.ownerId)},
  rpcAppId: ${yaz(ayarlar.rpcAppId)},
  encryptionKey: ${yaz(ayarlar.encryptionKey)},
  esZamanliGiris: 25,
  girisBeklemeMin: 250,
  girisBeklemeMax: 750,
  spotifyClientId: ${yaz(ayarlar.spotifyClientId)},
  spotifyClientSecret: ${yaz(ayarlar.spotifyClientSecret)},
};
`;
}

async function main() {
  const mevcut = mevcutConfigOku();
  if (sadeceConfigKontrol) {
    const gecerli =
      mevcut && !mevcut.__okumaHatasi && ayarlariDogrula(mevcut).length === 0;
    if (!gecerli) process.exitCode = 2;
    return;
  }

  console.log("\n========================================");
  console.log(" Ses AFK Token - Ayar Sihirbazı");
  console.log("========================================\n");

  if (mevcut && !mevcut.__okumaHatasi) {
    const hatalar = ayarlariDogrula(mevcut);
    if (hatalar.length === 0) {
      console.log("✅ Geçerli config.js bulundu; mevcut ayarlara dokunulmadı.");
      return;
    }

    console.log("⚠️ config.js bulundu fakat tamamlanmamış:");
    hatalar.forEach((hata) => console.log(`   - ${hata}`));
  } else if (mevcut?.__okumaHatasi) {
    console.log("⚠️ config.js okunamadı; yeni ayarlar oluşturulacak.");
  }

  if (discordOtomatik) {
    console.log("Discord uygulaması, intentler ve bot tokeni otomatik hazırlanacak.\n");
  } else {
    console.log("Aşağıdaki bilgileri yapıştır. Yazdıkların yalnızca bu bilgisayarda saklanır.\n");
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on("SIGINT", () => {
    console.log("\nKurulum iptal edildi.");
    rl.close();
    process.exit(130);
  });

  try {
    let botToken;
    let ownerId;
    let rpcAppId;

    if (discordOtomatik) {
      const { discordUygulamasiOlustur } = require("./discord-uygulama-kur");
      const discord = await discordUygulamasiOlustur({ botAdi: "Ses AFK Token" });
      botToken = discord.botToken;
      ownerId = discord.ownerId;
      rpcAppId = discord.appId;
    } else {
      botToken = await sor(
        rl,
        "Discord bot tokeni",
        (v) => v.length >= 20 && !bosVeyaOrnek(v),
        "Developer Portal'daki Bot > Reset Token alanından aldığın tokeni gir.",
      );
    }

    let mongoUri = yerelMongoUri;
    if (yerelMongoKullan) {
      console.log(`✅ Yerel MongoDB otomatik ayarlandı: ${yerelMongoUri}`);
    } else {
      mongoUri = await sor(
        rl,
        "MongoDB bağlantı adresi",
        (v) => /^mongodb(?:\+srv)?:\/\//i.test(v),
        "Adres mongodb:// veya mongodb+srv:// ile başlamalıdır.",
      );
    }
    if (!/^\d{17,20}$/.test(String(ownerId || ""))) {
      ownerId = await sor(
        rl,
        "Senin Discord kullanıcı ID'n",
        (v) => /^\d{17,20}$/.test(v),
        "Discord ID yalnızca 17-20 rakamdan oluşur.",
      );
    }

    if (!rpcAppId) {
      const bulunanId = bottanUygulamaId(botToken);
      rpcAppId = await sor(
        rl,
        "Discord uygulama ID'si",
        (v) => /^\d{17,20}$/.test(v),
        "Developer Portal > General Information > Application ID değerini gir.",
        bulunanId,
      );
    }

    let prefix = ".";
    if (!discordOtomatik) {
      prefix = await sor(
        rl,
        "Komut işareti",
        (v) => v.length >= 1 && v.length <= 5 && !/\s/.test(v),
        "1-5 karakter arasında ve boşluksuz olmalı.",
        ".",
      );
    }

    let spotifyClientId = "";
    let spotifyClientSecret = "";
    if (!discordOtomatik && await evetHayir(rl, "Spotify API anahtarlarını şimdi eklemek ister misin?")) {
      spotifyClientId = await sor(rl, "Spotify Client ID", (v) => v.length > 5, "Client ID boş olamaz.");
      spotifyClientSecret = await sor(
        rl,
        "Spotify Client Secret",
        (v) => v.length > 5,
        "Client Secret boş olamaz.",
      );
    }

    if (fs.existsSync(configYolu)) {
      const tarih = new Date().toISOString().replace(/[:.]/g, "-");
      const yedekKlasoru = path.join(os.homedir(), "Desktop", "SesAfkToken-Yedekler");
      fs.mkdirSync(yedekKlasoru, { recursive: true });
      const yedek = path.join(yedekKlasoru, `config.js.backup-${tarih}`);
      fs.copyFileSync(configYolu, yedek);
      console.log(`ℹ️ Eski ayarlar masaüstüne yedeklendi: ${yedek}`);
    }

    const ayarlar = {
      botToken,
      mongoUri,
      ownerId,
      rpcAppId,
      prefix,
      encryptionKey: crypto.randomBytes(32).toString("hex"),
      spotifyClientId,
      spotifyClientSecret,
    };

    fs.writeFileSync(configYolu, configMetniOlustur(ayarlar), {
      encoding: "utf8",
      mode: 0o600,
    });

    console.log("\n✅ config.js oluşturuldu.");
    if (discordOtomatik) console.log("🤖 Discord uygulaması ve bot ayarları otomatik oluşturuldu.");
    console.log("🔐 Token şifreleme anahtarı otomatik üretildi.");
    console.log("⚠️ config.js dosyasını ve şifreleme anahtarını kimseyle paylaşma.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\n❌ Ayar sihirbazı tamamlanamadı:", error.message);
  process.exit(1);
});
