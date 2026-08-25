const PaketAyar = require("../models/PaketAyar");
const { paketBul, paketler } = require("./paket-config");

/**
 * PAKET AYARI ÖNBELLEĞİ
 *
 * ⚠️ NEDEN ÖNBELLEK: limit hesabı `reduce` döngülerinin İÇİNDE, senkron
 * olarak yapılıyor (bkz. paket-config.js/toplamSinir). Her paket için ayrı
 * bir `await` atmak, token limiti kontrol edilen her yerde — yani her token
 * eklemede, her panel açılışında, 5 dakikalık her paket turunda — onlarca
 * ek sorgu demekti.
 *
 * Ayarlar açılışta bir kez yükleniyor ve panelden değiştirildiğinde
 * güncelleniyor. Kayıt sayısı sunucu × paket kadar, yani avuç içi.
 */

// `${guildId}:${paketId}` → { sinir, rolId }
const onbellek = new Map();
let yuklendi = false;

function anahtar(guildId, paketId) {
  return `${guildId}:${paketId}`;
}

/** Tüm ayarları veritabanından belleğe alır. `ready` içinde çağrılır. */
async function ayarlariYukle() {
  const kayitlar = await PaketAyar.find({}, { guildId: 1, paketId: 1, sinir: 1, rolId: 1 }).lean();

  onbellek.clear();
  for (const k of kayitlar) {
    onbellek.set(anahtar(k.guildId, k.paketId), { sinir: k.sinir, rolId: k.rolId });
  }
  yuklendi = true;

  return kayitlar.length;
}

/**
 * Bir paketin bu sunucudaki geçerli ayarı.
 * Ayar yoksa `paket-config.js` varsayılanına düşer.
 */
function ayarGetir(guildId, paketId) {
  const tanim = paketBul(paketId);
  const ozel = onbellek.get(anahtar(guildId, paketId));

  return {
    id: paketId,
    ad: tanim ? tanim.ad : paketId,
    emoji: tanim ? tanim.emoji : "",
    // Panelde ayarlanmışsa o, değilse varsayılan.
    sinir: ozel && ozel.sinir != null ? ozel.sinir : tanim ? tanim.sinir : 0,
    rolId: ozel ? ozel.rolId : null,
    // Varsayılandan farklı mı — panelde göstermek için.
    ozelSinir: Boolean(ozel && ozel.sinir != null),
  };
}

/** Bu sunucudaki tüm paketlerin geçerli ayarları, katalog sırasında. */
function tumAyarlar(guildId) {
  return paketler.map((p) => ayarGetir(guildId, p.id));
}

/**
 * Ayarı kaydeder ve önbelleği günceller.
 *
 * ⚠️ Önbellek DB yazımından SONRA güncelleniyor: yazma patlarsa bellekte
 * gerçekte var olmayan bir ayar kalmasın.
 */
async function ayarKaydet(guildId, paketId, { sinir, rolId, guncelleyen }) {
  await PaketAyar.findOneAndUpdate(
    { guildId, paketId },
    {
      $set: {
        sinir: sinir ?? null,
        rolId: rolId ?? null,
        guncelleyen: guncelleyen ?? null,
        guncellemeTarihi: new Date(),
      },
    },
    { upsert: true },
  );

  onbellek.set(anahtar(guildId, paketId), { sinir: sinir ?? null, rolId: rolId ?? null });
}

/** Sadece limiti okur — `paket-config.js` bunu senkron kullanıyor. */
function ozelSinir(guildId, paketId) {
  const ozel = onbellek.get(anahtar(guildId, paketId));
  return ozel && ozel.sinir != null ? ozel.sinir : null;
}

/** Sadece rolü okur. */
function paketRolu(guildId, paketId) {
  const ozel = onbellek.get(anahtar(guildId, paketId));
  return ozel ? ozel.rolId : null;
}

function onbellekHazirMi() {
  return yuklendi;
}

module.exports = {
  ayarlariYukle,
  ayarGetir,
  tumAyarlar,
  ayarKaydet,
  ozelSinir,
  paketRolu,
  onbellekHazirMi,
};
