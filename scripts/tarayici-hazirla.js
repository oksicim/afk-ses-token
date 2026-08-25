const path = require("path");
const { execFileSync } = require("child_process");
const readline = require("readline/promises");
const { tarayiciBul } = require("./discord-uygulama-kur");

function bekle(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calisiyorMu(islemAdi) {
  try {
    const cikti = execFileSync(
      "tasklist.exe",
      ["/FI", `IMAGENAME eq ${islemAdi}`, "/NH"],
      { encoding: "utf8", windowsHide: true },
    );
    return cikti.toLocaleLowerCase("tr-TR").includes(islemAdi.toLocaleLowerCase("tr-TR"));
  } catch {
    return false;
  }
}

function islemleriKapat(islemAdi, zorla = false) {
  const argumanlar = ["/IM", islemAdi, "/T"];
  if (zorla) argumanlar.unshift("/F");

  try {
    execFileSync("taskkill.exe", argumanlar, { stdio: "ignore", windowsHide: true });
  } catch {
    // Bazı alt işlemler daha önce kapanmış olabilir; aşağıda tekrar kontrol edilir.
  }
}

async function main() {
  const tarayici = tarayiciBul();
  const islemAdi = path.basename(tarayici.executablePath);
  if (!calisiyorMu(islemAdi)) {
    console.log(`✅ ${tarayici.ad} tamamen kapalı; normal profil açılmaya hazır.`);
    return;
  }

  console.log(`\n⚠️ ${tarayici.ad} şu anda açık veya arka planda çalışıyor.`);
  console.log("   Otomasyon normal profilinde yeni sekme açacağı için önce tarayıcı kapanmalı.");
  console.log("   Açık form veya indirme varsa önce kendin kaydet.");

  if (!process.stdin.isTTY) {
    throw new Error(`${tarayici.ad} açık. Bütün pencereleri kapatıp tekrar dene.`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const cevap = (
    await rl.question(`   ${tarayici.ad} pencereleri ve arka plan işlemleri kapatılsın mı? [E/h]: `)
  )
    .trim()
    .toLocaleLowerCase("tr-TR");
  rl.close();

  if (cevap && cevap !== "e" && cevap !== "evet") {
    throw new Error("Tarayıcı kapatma işlemi kullanıcı tarafından iptal edildi.");
  }

  islemleriKapat(islemAdi);
  await bekle(2000);

  if (calisiyorMu(islemAdi)) {
    console.log("   Arka plan işlemleri kapanmadı; onayın kapsamında zorla kapatılıyor...");
    islemleriKapat(islemAdi, true);
    await bekle(2000);
  }

  if (calisiyorMu(islemAdi)) {
    throw new Error(`${tarayici.ad} işlemleri kapatılamadı. Görev Yöneticisi'nden kapatıp tekrar dene.`);
  }

  console.log(`✅ ${tarayici.ad} tamamen kapatıldı; normal profil şimdi yeniden açılacak.`);
}

main().catch((hata) => {
  console.error(`❌ ${hata.message}`);
  process.exit(1);
});
