const { spawnSync } = require("child_process");
const path = require("path");

const testModu = process.argv.includes("--test");
const kok = path.resolve(__dirname, "..");

function uygulamaIdOku() {
  if (testModu) return "123456789012345678";

  const config = require(path.join(kok, "config.js"));
  return String(config.rpcAppId || "");
}

const uygulamaId = uygulamaIdOku();
if (!/^\d{17,20}$/.test(uygulamaId)) {
  console.error("[HATA] Bot davet bağlantısı için geçerli Application ID bulunamadı.");
  process.exit(1);
}

const davetLinki =
  `https://discord.com/oauth2/authorize?client_id=${uygulamaId}` +
  "&permissions=8&scope=bot%20applications.commands";

if (testModu) {
  console.log("[OK] Kurulum sonu davet bağlantısı ve Windows mesajı hazır.");
  process.exit(0);
}

const baslik = "Ses AFK Token - Kurulum Tamamlandı";
const mesaj = [
  "KURULUM TAMAMLANDI! 🎉",
  "",
  "Bot davet bağlantısı panoya kopyalandı.",
  "",
  "Tamam'a bastığında Discord davet sayfası açılacak:",
  "1. Botu eklemek istediğin sunucuyu seç.",
  "2. Yetkilendir / Davet Et adımını tamamla.",
  "3. Ardından BASLAT.bat dosyasına çift tıkla.",
].join("\r\n");

const powershellKomutu = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName PresentationFramework",
  "Set-Clipboard -Value $env:SES_AFK_DAVET_LINKI",
  "[System.Windows.MessageBox]::Show($env:SES_AFK_KURULUM_MESAJI, $env:SES_AFK_KURULUM_BASLIK, [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information) | Out-Null",
  "Start-Process -FilePath $env:SES_AFK_DAVET_LINKI",
].join("; ");

const sonuc = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", powershellKomutu],
  {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      SES_AFK_DAVET_LINKI: davetLinki,
      SES_AFK_KURULUM_MESAJI: mesaj,
      SES_AFK_KURULUM_BASLIK: baslik,
    },
  },
);

if (sonuc.status !== 0) {
  console.log("⚠️ Windows bilgi penceresi açılamadı. Bot davet bağlantısı:");
  console.log(davetLinki);
  process.exit(0);
}

console.log("✅ Bot davet bağlantısı panoya kopyalandı ve tarayıcıda açıldı.");
