const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-core");

const PORTAL_URL = "https://discord.com/developers/applications";
const GIRIS_BEKLEME_MS = 10 * 60 * 1000;

function profilKlasoru(tarayici) {
  const localAppData =
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");

  const profiller = {
    brave: path.join(localAppData, "BraveSoftware", "Brave-Browser", "User Data"),
  };

  return profiller[tarayici.kimlik];
}

function tarayiciBul() {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData =
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");

  // Otomasyon yalnizca Brave ile destekleniyor: Chrome, portal sayfasini
  // otomasyona kullandirmadigi icin kapsam disinda tutuldu.
  const adaylar = [
    {
      ad: "Brave",
      kimlik: "brave",
      yollar: [
        path.join(programFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        path.join(programFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        path.join(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      ],
    },
  ];

  for (const aday of adaylar) {
    const executablePath = aday.yollar.find((yol) => fs.existsSync(yol));
    if (executablePath) {
      return {
        ad: aday.ad,
        kimlik: aday.kimlik,
        executablePath,
      };
    }
  }

  throw new Error("Brave bulunamadı. KURULUM.bat dosyasını yeniden aç.");
}

async function tarayiciAc(profil, tarayici) {
  try {
    const context = await chromium.launchPersistentContext(profil, {
      executablePath: tarayici.executablePath,
      headless: false,
      viewport: null,
      args: ["--start-maximized"],
      ignoreDefaultArgs: ["--enable-automation"],
    });
    return { context, tarayiciAdi: tarayici.ad };
  } catch (hata) {
    if (
      /processsingleton|profile directory|existing browser session|profile.*in use|target page, context or browser has been closed|mevcut taray/i.test(
        hata.message,
      )
    ) {
      throw new Error(
        `${tarayici.ad} arka planda açık kaldı. Bütün ${tarayici.ad} işlemlerini kapatıp tekrar dene.`,
      );
    }
    throw new Error(`${tarayici.ad} açılamadı: ${hata.message}`);
  }
}

async function portalHazirBekle(page) {
  const son = Date.now() + GIRIS_BEKLEME_MS;
  let girisMesajiYazildi = false;
  let hazirBaslangici = 0;

  while (Date.now() < son) {
    if (page.isClosed()) throw new Error("Tarayıcı giriş tamamlanmadan kapatıldı.");

    const adres = page.url();
    const portalda = adres.startsWith(PORTAL_URL);
    const sayfaHazir = portalda
      ? await page
          .evaluate(
            () =>
              document.readyState === "complete" &&
              Array.isArray(window.webpackChunkdiscord_developers),
          )
          .catch(() => false)
      : false;

    if (portalda && sayfaHazir) {
      if (!hazirBaslangici) hazirBaslangici = Date.now();
      if (Date.now() - hazirBaslangici >= 3000) return;
    } else {
      hazirBaslangici = 0;
    }

    if (!girisMesajiYazildi) {
      console.log("🌐 Discord hesabına giriş yap. Giriş tamamlanınca kurulum otomatik devam eder.");
      console.log("   Captcha veya 2FA çıkarsa açık tarayıcıda tamamla.");
      girisMesajiYazildi = true;
    }

    await page.waitForTimeout(1000);
  }

  throw new Error("Discord girişi için 10 dakikalık bekleme süresi doldu.");
}

async function discordUygulamasiOlustur({ botAdi = "Ses AFK Token" } = {}) {
  if (typeof botAdi !== "string" || botAdi.trim().length < 2 || botAdi.trim().length > 32) {
    throw new Error("Discord uygulama adı 2-32 karakter arasında olmalıdır.");
  }

  const tarayici = tarayiciBul();
  const profil = profilKlasoru(tarayici);
  fs.mkdirSync(profil, { recursive: true });

  console.log(`🌐 Normal ${tarayici.ad} profilin açılıyor...`);
  console.log(`   Mevcut tarayıcı oturumun kullanılacak: ${profil}`);

  const { context, tarayiciAdi } = await tarayiciAc(profil, tarayici);
  let contextKapandi = false;
  let basarili = false;
  context.once("close", () => {
    contextKapandi = true;
  });
  console.log(`   Kullanılan tarayıcı: ${tarayiciAdi}`);

  try {
    const page = await context.newPage();
    await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await portalHazirBekle(page);

    console.log("✅ Discord Developer Portal sayfası yüklendi.");
    console.log("🔐 Discord oturumu doğrulanıyor...");

    let sonuc;
    let oturumBeklemeMesajiYazildi = false;
    const oturumBeklemeSonu = Date.now() + GIRIS_BEKLEME_MS;

    while (Date.now() < oturumBeklemeSonu) {
      const portalCalisiyor =
        page.url().startsWith(PORTAL_URL) &&
        (await page
          .evaluate(() => Array.isArray(window.webpackChunkdiscord_developers))
          .catch(() => false));
      if (!portalCalisiyor) await portalHazirBekle(page);

      try {
        sonuc = await page.evaluate(async ({ uygulamaAdi }) => {
      const hataMetni = (hata) => {
        if (typeof hata === "string") return hata;

        const parcalar = [];
        if (hata?.message) parcalar.push(String(hata.message));
        if (hata?.status) parcalar.push(`HTTP ${hata.status}`);
        if (hata?.code) parcalar.push(`kod: ${hata.code}`);

        if (hata?.body !== undefined) {
          try {
            parcalar.push(`yanıt: ${JSON.stringify(hata.body)}`);
          } catch {
            parcalar.push("yanıt okunamadı");
          }
        }

        if (parcalar.length === 0) {
          try {
            parcalar.push(JSON.stringify(hata));
          } catch {
            parcalar.push(String(hata));
          }
        }

        return parcalar.join(" | ").slice(0, 2000) || "Bilinmeyen Discord API hatası";
      };

      const adim = async (ad, islem) => {
        try {
          return await islem();
        } catch (hata) {
          throw new Error(`${ad}: ${hataMetni(hata)}`);
        }
      };

      try {
        const wpRequire = window.webpackChunkdiscord_developers.push([
          [Symbol()],
          {},
          (r) => r,
        ]);
        window.webpackChunkdiscord_developers.pop();

        const moduller = Object.values(wpRequire.c);
        const dispatcherModulu = moduller.find(
          (x) => x?.exports?.A?.__proto__?.flushWaitQueue,
        );
        const apiModulu = moduller.find(
          (x) => x?.exports?.Bo?.get && x?.exports?.Bo?.post && x?.exports?.Bo?.patch,
        );

        const dispatcher = dispatcherModulu?.exports?.A;
        const api = apiModulu?.exports?.Bo;
        if (!api) throw new Error("Discord Developer Portal API modülü bulunamadı.");

        let ownerId = null;
        for (const modul of moduller) {
          const kok = modul?.exports;
          if (!kok) continue;

          let adaylar = [kok];
          try {
            adaylar = adaylar.concat(Object.values(kok));
          } catch {
            // Bazı webpack modüllerindeki getter'lar okunamayabilir.
          }

          for (const aday of adaylar) {
            try {
              if (typeof aday?.getCurrentUser === "function") {
                const kullanici = aday.getCurrentUser();
                if (kullanici?.id) {
                  ownerId = kullanici.id;
                  break;
                }
              }
            } catch {
              // Uygun olmayan modül; sıradakine bak.
            }
          }
          if (ownerId) break;
        }

        const uygulamalarRes = await adim("Uygulama listesi alınamadı", () =>
          api.get({ url: "/applications" }),
        );
        const uygulamalar = Array.isArray(uygulamalarRes?.body)
          ? uygulamalarRes.body
          : Array.isArray(uygulamalarRes?.body?.applications)
            ? uygulamalarRes.body.applications
            : [];

        let uygulama = [...uygulamalar]
          .reverse()
          .find((aday) => aday?.name === uygulamaAdi && aday?.id);
        const yenidenKullanildi = Boolean(uygulama);

        if (!uygulama) {
          const appRes = await adim("Uygulama oluşturulamadı", () =>
            api.post({
              url: "/applications",
              body: { name: uygulamaAdi, team_id: null },
            }),
          );
          uygulama = appRes?.body;
          if (!uygulama?.id) throw new Error("Discord uygulama kimliği döndürmedi.");

          dispatcher?.dispatch({
            type: "APPLICATION_CREATE_SUCCESS",
            application: uygulama,
          });
        }

        const appId = uygulama.id;
        ownerId = ownerId || uygulama?.owner?.id || uygulama?.owner_id || null;

        const PRESENCE_LIMITED = 1 << 13;
        const GUILD_MEMBERS_LIMITED = 1 << 15;
        const MESSAGE_CONTENT_LIMITED = 1 << 19;
        await adim("Bot intentleri açılamadı", () =>
          api.patch({
            url: `/applications/${appId}`,
            body: {
              flags: PRESENCE_LIMITED | GUILD_MEMBERS_LIMITED | MESSAGE_CONTENT_LIMITED,
            },
          }),
        );

        const botTokenRes = await adim("Bot tokeni alınamadı", () =>
          api.post({ url: `/applications/${appId}/bot/reset` }),
        );
        const botToken = botTokenRes?.body?.token;
        if (!botToken) throw new Error("Bot tokeni alınamadı: Discord token döndürmedi.");

        return {
          tamam: true,
          sonuc: { botToken, appId, ownerId, yenidenKullanildi },
        };
      } catch (hata) {
        return { tamam: false, hata: hataMetni(hata) };
      }
        }, { uygulamaAdi: botAdi.trim() });
      } catch (hata) {
        if (page.isClosed()) throw new Error("Tarayıcı işlem sırasında kapatıldı.");

        if (/execution context|navigation|navigating/i.test(hata.message)) {
          await page.waitForTimeout(1500);
          continue;
        }
        throw hata;
      }

      if (sonuc?.tamam) break;

      if (/webpackChunkdiscord_developers|reading ['"]?push/i.test(String(sonuc?.hata || ""))) {
        await page.waitForTimeout(1500);
        continue;
      }

      const yetkisiz = /\b401\b|unauthorized/i.test(String(sonuc?.hata || ""));
      if (!yetkisiz) break;

      if (!oturumBeklemeMesajiYazildi) {
        console.log("⏳ Discord oturumu henüz hazır değil; tarayıcı açık bırakıldı.");
        console.log("   Açılan sayfada giriş yap. Captcha veya 2FA varsa tamamla.");
        console.log("   Giriş algılanınca işlem kendiliğinden devam edecek.");
        oturumBeklemeMesajiYazildi = true;
      }

      await page.bringToFront().catch(() => {});
      await page.waitForTimeout(3000);
    }

    if (!sonuc?.tamam && /\b401\b|unauthorized/i.test(String(sonuc?.hata || ""))) {
      throw new Error("Discord girişi 10 dakika içinde doğrulanamadı (401 Unauthorized).");
    }

    if (!sonuc?.tamam) {
      throw new Error(sonuc?.hata || "Discord otomasyonu bilinmeyen bir hata verdi.");
    }

    const bilgiler = sonuc.sonuc;
    if (!bilgiler?.botToken || !/^\d{17,20}$/.test(String(bilgiler.appId || ""))) {
      throw new Error("Discord geçerli bot bilgisi döndürmedi.");
    }

    console.log("✅ Discord Developer Portal oturumu doğrulandı.");
    console.log(`🤖 ${botAdi} uygulaması ve botu hazırlandı.`);
    console.log(
      bilgiler.yenidenKullanildi
        ? "✅ Var olan Discord uygulaması bulundu ve yeniden kullanıldı."
        : "✅ Discord uygulaması oluşturuldu.",
    );
    console.log("✅ Server Members, Message Content ve Presence intentleri açıldı.");
    console.log("🔐 Bot tokeni güvenli biçimde ayarlara aktarılacak; ekrana yazılmadı.");

    basarili = true;
    return bilgiler;
  } catch (hata) {
    console.error(`\n❌ Tarayıcı otomasyonu durdu: ${hata.message}`);

    if (!contextKapandi) {
      console.log("🔎 Tarayıcı incelemen için açık bırakıldı.");
      console.log("   İncelemen bitince tarayıcı penceresini kendin kapat.");
      await new Promise((resolve) => context.once("close", resolve));
    }

    throw hata;
  } finally {
    if (basarili && !contextKapandi) await context.close().catch(() => {});
  }
}

module.exports = { discordUygulamasiOlustur, profilKlasoru, tarayiciBul };

if (require.main === module) {
  const debugModu = process.argv.includes("--debug");
  const secenekler = debugModu ? { botAdi: "Ses AFK Token Debug" } : {};

  discordUygulamasiOlustur(secenekler)
    .then((sonuc) => {
      console.log(`Uygulama hazır. Application ID: ${sonuc.appId}`);
      console.log("Bot tokeni güvenlik nedeniyle konsola yazdırılmadı.");
    })
    .catch((error) => {
      console.error("Discord uygulaması oluşturulamadı:", error.message);
      process.exit(1);
    });
}
