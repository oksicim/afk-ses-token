const { readdir, readFile } = require("node:fs/promises");
const { basename, extname, join } = require("node:path");
const { EMOJI_KATALOG, EMOJI_ADLARI, emojileriCoz } = require("./emojiler");

/** Emoji görsellerinin bulunduğu klasör (proje kökü). */
const EMOJI_KLASOR = join(process.cwd(), "src", "emojiler");

/** Discord'un kabul ettiği formatlar. */
const IZINLI_UZANTILAR = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

/** Discord sınırı: emoji başına 256 KiB. */
const MAX_BOYUT = 256 * 1024;

/** Discord sınırı: uygulama başına 2000 emoji. */
const MAX_EMOJI = 2000;

/** Geçerli emoji adı: 2-32 karakter, harf/rakam/alt çizgi. */
const AD_DESENI = /^\w{2,32}$/;

/**
 * `emojiler/` klasörünü özyinelemeli tarar.
 *
 * ⚠️ Okunamayan klasör "boş klasör" SAYILMAZ, ayrı raporlanır. Yoksa geçici
 * bir dosya sistemi hatası, "klasörde hiç emoji yok" diye yorumlanıp yükleme
 * adımının hiçbir şey yapmamasına yol açardı.
 */
async function klasoruTara(klasor = EMOJI_KLASOR) {
  const dosyalar = [];
  const reddedilen = [];
  const kaynakSorunlari = [];
  const gorulen = new Map();

  async function yuru(mevcut) {
    let girdiler;
    try {
      girdiler = await readdir(mevcut, { withFileTypes: true });
    } catch (err) {
      kaynakSorunlari.push({ hedef: mevcut, sebep: err?.message || String(err) });
      return;
    }

    for (const girdi of girdiler) {
      const tamYol = join(mevcut, girdi.name);

      if (girdi.isDirectory()) {
        await yuru(tamYol);
        continue;
      }

      const uzanti = extname(girdi.name).toLowerCase();
      if (!IZINLI_UZANTILAR.has(uzanti)) {
        if (uzanti !== ".md" && girdi.name !== ".gitkeep") {
          reddedilen.push({
            dosya: girdi.name,
            sebep: `desteklenmeyen format (${uzanti || "uzantısız"})`,
          });
        }
        continue;
      }

      const ad = basename(girdi.name, uzanti);

      if (!AD_DESENI.test(ad)) {
        reddedilen.push({
          dosya: girdi.name,
          sebep: "geçersiz ad — 2-32 karakter, sadece harf/rakam/alt çizgi",
        });
        continue;
      }

      const kopya = gorulen.get(ad);
      if (kopya) {
        reddedilen.push({ dosya: girdi.name, sebep: `aynı ad zaten var (${kopya})` });
        continue;
      }

      let icerik;
      try {
        icerik = await readFile(tamYol);
      } catch (err) {
        kaynakSorunlari.push({ hedef: tamYol, sebep: err?.message || String(err) });
        continue;
      }

      if (icerik.length > MAX_BOYUT) {
        reddedilen.push({
          dosya: girdi.name,
          sebep: `çok büyük (${Math.round(icerik.length / 1024)} KB > 256 KB)`,
        });
        continue;
      }

      gorulen.set(ad, girdi.name);
      dosyalar.push({ ad, icerik, boyut: icerik.length });
    }
  }

  await yuru(klasor);
  return { dosyalar, reddedilen, kaynakSorunlari };
}

/**
 * Uygulamaya yüklü emojileri belleğe alır ve denetim raporu döner.
 * `ready` içinde ve her yüklemeden sonra çağrılır.
 */
async function emojileriYukle(client) {
  const app = client.application;
  if (!app) return { toplam: 0, eksik: EMOJI_ADLARI, kullanilmayan: [] };

  const hepsi = await app.emojis.fetch();
  return emojileriCoz(hepsi);
}

/**
 * Klasördeki emojilerden uygulamada OLMAYANLARI yükler.
 *
 * ⚠️ HİÇBİR ŞEY SİLMEZ. Otomatik silme, klasörü geçici olarak okunamayan bir
 * makinede tüm emojileri yok edebilirdi; silme bilinçli bir işlem olmalı.
 *
 * `ilerleme` verilirse her N emojide bir çağrılır (panel güncellemek için).
 */
async function eksikleriYukle(client, ilerleme = null) {
  const app = client.application;
  if (!app) throw new Error("Uygulama bilgisi hazır değil.");

  const { dosyalar, reddedilen, kaynakSorunlari } = await klasoruTara();

  // Kaynak eksik okunduysa yükleme yapma — eksik listeyle çalışmak
  // "zaten var" sanılan emojilerin atlanmasına yol açar.
  if (kaynakSorunlari.length > 0) {
    return {
      yuklenen: 0,
      atlanan: 0,
      hatali: 0,
      hatalar: [],
      reddedilen,
      kaynakSorunlari,
      durduruldu: true,
    };
  }

  const mevcut = await app.emojis.fetch();
  const mevcutAdlar = new Set(mevcut.map((e) => e.name));

  const yuklenecekler = dosyalar.filter((d) => !mevcutAdlar.has(d.ad));

  if (mevcut.size + yuklenecekler.length > MAX_EMOJI) {
    return {
      yuklenen: 0,
      atlanan: 0,
      hatali: 0,
      hatalar: [`Uygulama emoji sınırı aşılır (${mevcut.size} + ${yuklenecekler.length} > ${MAX_EMOJI}).`],
      reddedilen,
      kaynakSorunlari,
      durduruldu: true,
    };
  }

  let yuklenen = 0;
  let hatali = 0;
  const hatalar = [];

  for (let i = 0; i < yuklenecekler.length; i++) {
    const d = yuklenecekler[i];
    try {
      await app.emojis.create({ attachment: d.icerik, name: d.ad });
      yuklenen++;
    } catch (err) {
      hatali++;
      if (hatalar.length < 5) hatalar.push(`${d.ad}: ${err?.message || err}`);
    }

    if (ilerleme && (i + 1) % 10 === 0) {
      await ilerleme(i + 1, yuklenecekler.length);
    }
  }

  return {
    yuklenen,
    atlanan: dosyalar.length - yuklenecekler.length,
    hatali,
    hatalar,
    reddedilen,
    kaynakSorunlari,
    durduruldu: false,
  };
}

/**
 * Açılışta çağrılır: emojileri belleğe alır, eksikleri sessizce yükler ve
 * katalogda olup Discord'da bulunmayanları uyarı olarak yazar.
 */
async function acilistaEsitle(client) {
  let denetim = await emojileriYukle(client);

  // Klasörde olup uygulamada olmayan varsa bir kez yükle, sonra tazele.
  if (denetim.eksik.length > 0) {
    try {
      const sonuc = await eksikleriYukle(client);
      if (sonuc.yuklenen > 0) {
        console.log(`[Emoji] ${sonuc.yuklenen} yeni emoji yüklendi.`);
        denetim = await emojileriYukle(client);
      }
      if (sonuc.kaynakSorunlari.length > 0) {
        console.warn(
          `[Emoji] emojiler/ klasörü okunamadı: ${sonuc.kaynakSorunlari[0].sebep}`,
        );
      }
    } catch (err) {
      console.error("[Emoji] Otomatik yükleme hatası:", err?.message || err);
    }
  }

  console.log(`[Emoji] ${denetim.toplam} uygulama emojisi yüklendi.`);

  if (denetim.eksik.length > 0) {
    console.warn(
      `[Emoji] Kodda kullanılan ${denetim.eksik.length} emoji uygulamada YOK ` +
        `(unicode yedeğine düşülüyor): ${denetim.eksik.join(", ")}`,
    );
    console.warn("[Emoji] Yüklemek için: emojiler/ klasörüne görselleri koy, .emojikur çalıştır.");
  }

  return denetim;
}

module.exports = {
  EMOJI_KLASOR,
  MAX_BOYUT,
  MAX_EMOJI,
  klasoruTara,
  emojileriYukle,
  eksikleriYukle,
  acilistaEsitle,
};
