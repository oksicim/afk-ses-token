const crypto = require("crypto");
const Kod = require("../models/Kod");
const Paket = require("../models/Paket");
const Token = require("../models/Token");
const { paketBul, toplamSinir: paketToplamSinir } = require("./paket-config");

/**
 * KOD ÜRETME VE KULLANMA
 *
 * Kodun tek işi bir paket vermek; paketin tek işi de `sinir` alanıyla
 * kullanıcının token limitini artırmak (bkz. utils/sinir-kontrol.js —
 * aktif paketlerin `sinir` değerleri toplanıyor).
 */

/**
 * Kod alfabesi.
 *
 * Kod elle yazılıyor ve destek talebi açtıran en sık sebep "kodum çalışmıyor"
 * diyen ama aslında O yerine 0 yazan kullanıcı. Bu yüzden birbirine benzeyen
 * karakter çiftlerinin HER ZAMAN biri dışarıda:
 *
 *   0 / O   → ikisi de yok
 *   1 / I / L → ikisi de yok
 *   5 / S   → ikisi de yok
 *   8 / B   → B yok, 8 var
 *   2 / Z   → Z yok, 2 var
 *   6 / G   → G yok, 6 var
 *
 * Kalan 26 karakter × 12 hane ≈ 9.5e16 kombinasyon — kaba kuvvet denemesi
 * anlamsız kalacak kadar geniş.
 */
const ALFABE = "ACDEFHJKMNPQRTUVWXY2346789";

/** Kod bölüm sayısı ve bölüm uzunluğu → AURA-XXXX-XXXX-XXXX */
const ONEK = "AURA";
const BOLUM = 3;
const BOLUM_UZUNLUK = 4;

/**
 * Kodu karşılaştırmaya hazır hâle getirir.
 *
 * Kullanıcı kodu kopyalarken tire, boşluk, küçük harf... her türlü varyasyonu
 * gönderiyor. Hepsini tek biçime indirip öyle arıyoruz, yoksa geçerli bir kod
 * "bulunamadı" diye reddedilirdi.
 */
function kodNormalize(ham) {
  return String(ham || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Görüntüleme biçimi: AURAABCD1234EFGH → AURA-ABCD-1234-EFGH */
function kodBicimle(kod) {
  const n = kodNormalize(kod);
  const govde = n.startsWith(ONEK) ? n.slice(ONEK.length) : n;
  const parcalar = govde.match(/.{1,4}/g) || [];
  return [ONEK, ...parcalar].join("-");
}

/**
 * Tek bir rastgele kod üretir.
 *
 * ⚠️ `crypto.randomInt` kullanılıyor, `Math.random` değil: kodlar para
 * karşılığı satılıyor, tahmin edilebilir olmamalı.
 */
function kodUret() {
  let govde = "";
  for (let i = 0; i < BOLUM * BOLUM_UZUNLUK; i++) {
    govde += ALFABE[crypto.randomInt(ALFABE.length)];
  }
  return ONEK + govde;
}

/**
 * `adet` kadar benzersiz kod üretip kaydeder.
 *
 * Çakışma ihtimali astronomik olarak düşük (28^12) ama yine de
 * `insertMany({ordered:false})` + benzersizlik indeksi ile yakalanıyor;
 * çakışan varsa yerine yenisi üretiliyor.
 */
async function kodlariUret({ paketId, adet, gun = 30, olusturan, not = null }) {
  const paket = paketBul(paketId);
  if (!paket) return { ok: false, hata: "Böyle bir paket yok." };
  if (!Number.isInteger(adet) || adet < 1 || adet > 100) {
    return { ok: false, hata: "Adet 1-100 arasında olmalı." };
  }
  if (!Number.isInteger(gun) || gun < 1 || gun > 3650) {
    return { ok: false, hata: "Gün 1-3650 arasında olmalı." };
  }

  const uretilen = [];

  // En fazla birkaç tur döner; çakışma pratikte hiç olmuyor.
  for (let tur = 0; tur < 5 && uretilen.length < adet; tur++) {
    const kalan = adet - uretilen.length;
    const adaylar = Array.from({ length: kalan }, () => ({
      kod: kodUret(),
      paketId,
      gun,
      olusturan,
      not,
    }));

    try {
      const sonuc = await Kod.insertMany(adaylar, { ordered: false });
      uretilen.push(...sonuc.map((k) => k.kod));
    } catch (err) {
      // `ordered: false` → başarılı olanlar yine yazıldı, sadece
      // çakışanlar düştü. Yazılanları sonuçtan topla.
      const yazilan = err?.insertedDocs ?? [];
      uretilen.push(...yazilan.map((k) => k.kod));

      /**
       * ⚠️ Yalnızca ÇAKIŞMA hatası yutulur.
       *
       * Bağlantı koptuysa ya da şema doğrulaması patladıysa döngüyü
       * sürdürmek anlamsız: her tur aynı hatayı alır ve sonunda
       * "kod üretilemedi" deyip gerçek sebebi gizlerdik.
       */
      const cakisma = err?.code === 11000 || err?.writeErrors?.some((e) => e?.err?.code === 11000);
      if (!cakisma) {
        console.error("[Kod] Üretim hatası:", err?.message || err);
        if (uretilen.length === 0) {
          return { ok: false, hata: "Kod veritabanına yazılamadı." };
        }
        break;
      }
    }
  }

  if (uretilen.length === 0) {
    return { ok: false, hata: "Kod üretilemedi." };
  }

  return { ok: true, kodlar: uretilen, paket, gun };
}

/**
 * Askıdaki tokenleri yeni limite kadar geri açar.
 *
 * Kullanıcı limiti dolduğu için askıya alınmış tokenlere sahip olabilir;
 * paket alınca bunların otomatik geri gelmesi beklenen davranış.
 */
async function askidakileriKurtar(userId, toplamSinir) {
  const askidakiler = await Token.find(
    { userId, askida: true },
    { token: 1, kanalId: 1, selfMute: 1, selfDeaf: 1 },
  ).lean();

  if (askidakiler.length === 0) return { kurtarilan: 0, kalanAskida: 0 };

  const aktifSayi = await Token.countDocuments({ userId, askida: { $ne: true } });
  const kurtarilabilir = Math.min(askidakiler.length, toplamSinir - aktifSayi);

  if (kurtarilabilir <= 0) {
    return { kurtarilan: 0, kalanAskida: askidakiler.length };
  }

  const secilenler = askidakiler.slice(0, kurtarilabilir);

  // Önce tek yazımda işareti kaldır — selfbot başlatma yavaş, DB'yi
  // onun hızına bağlamanın anlamı yok.
  await Token.updateMany(
    { _id: { $in: secilenler.map((t) => t._id) } },
    { $set: { askida: false } },
  );

  // Kuyruğa ver: doğrudan `selfbotBaslat` çağırmak yerine kuyruk kullanmak,
  // aynı anda onlarca hesabın giriş yapıp rate-limit yemesini engelliyor.
  const kuyruk = require("./token-kuyrugu");
  for (const t of secilenler) {
    kuyruk.kuyrugaEkle(
      {
        token: t.token,
        kanalId: t.kanalId,
        selfMute: t.selfMute ?? false,
        selfDeaf: t.selfDeaf ?? false,
      },
      true, // öncelikli: kullanıcı az önce para verdi, beklemesin
    );
  }

  return {
    kurtarilan: secilenler.length,
    kalanAskida: askidakiler.length - secilenler.length,
  };
}

/**
 * Kodu kullanır ve paketi uygular.
 *
 * ⚠️ DEVRALMA ATOMİK. Kodu önce okuyup sonra işaretlemek yerine tek bir
 * `findOneAndUpdate` ile `kullanildi: false` şartıyla devralınıyor. İki kişi
 * aynı kodu aynı anda girerse yalnızca biri kazanır; sıralı okuma-yazma
 * yapsaydık ikisi de paketi alabilirdi.
 *
 * ⚠️ Paket oluşturma BAŞARISIZ olursa kod geri açılıyor — yoksa kullanıcı
 * hem kodunu hem paketini kaybederdi.
 */
async function koduKullan({ hamKod, userId, guildId, guild = null }) {
  const kod = kodNormalize(hamKod);

  if (kod.length < 8) {
    return { ok: false, hata: "Geçersiz kod biçimi." };
  }

  const devralinan = await Kod.findOneAndUpdate(
    { kod, kullanildi: false },
    {
      $set: {
        kullanildi: true,
        kullanan: userId,
        kullanimTarihi: new Date(),
        kullanildigiGuild: guildId,
      },
    },
    { new: true },
  );

  if (!devralinan) {
    // Ayrım önemli: "yanlış yazdım" ile "bu kod zaten kullanılmış" farklı
    // sorunlar ve kullanıcıya farklı şey söylemek gerekiyor.
    const mevcut = await Kod.findOne({ kod }, { kullanildi: 1, kullanimTarihi: 1 }).lean();
    if (mevcut && mevcut.kullanildi) {
      return { ok: false, hata: "Bu kod daha önce kullanılmış.", kullanilmis: true };
    }
    return { ok: false, hata: "Böyle bir kod yok. Kodu kontrol edip tekrar dene." };
  }

  const paket = paketBul(devralinan.paketId);

  if (!paket) {
    // Paket config'den kaldırılmışsa kodu geri aç, kullanıcı mağdur olmasın.
    await Kod.updateOne(
      { _id: devralinan._id },
      { $set: { kullanildi: false, kullanan: null, kullanimTarihi: null, kullanildigiGuild: null } },
    );
    return { ok: false, hata: "Bu kodun paketi artık tanımlı değil. Yetkiliye bildir." };
  }

  try {
    const simdi = new Date();
    const mevcutPaket = await Paket.findOne({
      userId,
      guildId,
      paketAdi: paket.id,
      aktif: true,
    });

    let bitis;
    let uzatildi = false;

    if (mevcutPaket) {
      /**
       * Aynı pakete zaten sahipse SÜRE UZATILIR, kod reddedilmez.
       *
       * `.pakettanimla` yolu "zaten bu pakete sahip" diye reddediyor ama
       * orada yetkili elle veriyor. Burada kullanıcı parasını ödemiş; aynı
       * paketi ikinci kez alması "iki ay kullanacağım" demek.
       */
      const taban = mevcutPaket.bitis > simdi ? mevcutPaket.bitis : simdi;
      bitis = new Date(taban.getTime() + devralinan.gun * 86400000);
      mevcutPaket.bitis = bitis;
      await mevcutPaket.save();
      uzatildi = true;
    } else {
      bitis = new Date(simdi.getTime() + devralinan.gun * 86400000);
      await Paket.create({
        userId,
        guildId,
        paketAdi: paket.id,
        sinir: paket.sinir,
        baslangic: simdi,
        bitis,
        aktif: true,
        tanimlayan: `kod:${devralinan.kod}`,
      });
    }

    const aktifPaketler = await Paket.find(
      { userId, guildId, aktif: true },
      // `paketAdi` şart: limit paket-config'ten okunuyor (bkz. paketSiniri).
      { paketAdi: 1, sinir: 1 },
    ).lean();
    const toplam = paketToplamSinir(aktifPaketler, guildId);

    const kurtarma = await askidakileriKurtar(userId, toplam);

    // `.paket-setup` ile bu pakete rol atanmışsa ver. Rol verilemezse
    // (hiyerarşi/yetki) paket yine geçerli — sonucu çağırana bildiriyoruz.
    const { paketRolunuVer } = require("./paket-rol");
    const rolSonuc = await paketRolunuVer(guild, userId, paket.id);

    return {
      ok: true,
      rol: rolSonuc,
      paket,
      gun: devralinan.gun,
      bitis,
      uzatildi,
      toplamSinir: toplam,
      ...kurtarma,
      kod: devralinan.kod,
    };
  } catch (err) {
    // Paket yazılamadı → kodu geri aç ki kullanıcı tekrar deneyebilsin.
    await Kod.updateOne(
      { _id: devralinan._id },
      { $set: { kullanildi: false, kullanan: null, kullanimTarihi: null, kullanildigiGuild: null } },
    ).catch(() => {});

    console.error("[Kod] Paket uygulanamadı:", err?.message || err);
    return { ok: false, hata: "Paket verilirken bir hata oldu. Kodun hâlâ geçerli, tekrar dene." };
  }
}

module.exports = {
  ALFABE,
  kodNormalize,
  kodBicimle,
  kodUret,
  kodlariUret,
  koduKullan,
  askidakileriKurtar,
};
