const { emoji } = require("./emojiler");

/**
 * PAKETLER
 *
 * Limit değiştirmek için tek yapman gereken `sinir` sayısını değiştirmek.
 * Değişiklik ANINDA herkese yansır (bkz. paketSiniri).
 *
 * `emojiAdi` katalogdaki ad (bkz. utils/emojiler.js). Emojinin kendisi
 * aşağıda GETTER olarak ekleniyor — sebebi için `tanimla`ya bak.
 */
const TANIMLAR = [
  {
    id: "bot_musteri",
    ad: "Bot Müşteri",
    sinir: 25,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "beginner",
    ad: "Auranest Beginner",
    sinir: 20,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "experienced",
    ad: "Auranest Experienced",
    sinir: 25,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "expert",
    ad: "Auranest Expert",
    sinir: 35,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "professional",
    ad: "Auranest Professional",
    sinir: 40,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "platinum",
    ad: "Auranest Platinum",
    sinir: 45,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "diamond",
    ad: "Auranest Diamond",
    sinir: 50,
    emojiAdi: "noktaTuruncu",
  },
  {
    id: "exclusive",
    ad: "Auranest Exclusive",
    sinir: 50,
    emojiAdi: "noktaTuruncu",
  },
];

/**
 * ⚠️ `emoji` SABİT DEĞİL, GETTER.
 *
 * Eskiden burada doğrudan `emoji: emoji("noktaTuruncu")` yazıyordu ve bu
 * gerçek bir hataydı: bu dosya modül olarak YÜKLENİRKEN çalışıyor, uygulama
 * emojileri ise `ready` olayında çözülüyor (bkz. utils/emoji-sync.js).
 * Yani `emoji()` henüz hiçbir şey çözülmemişken çağrılıyor, unicode yedeğini
 * (🔸) döndürüyor ve o değer dizide KALICI olarak donuyordu. Emojiyi
 * yükledikten sonra bile paneller 🔸 göstermeye devam ediyordu.
 *
 * Getter her okumada yeniden çözdüğü için bu sorun tamamen ortadan kalkıyor:
 * emoji yüklüyse custom hâli, değilse unicode yedeği gelir.
 */
function tanimla(t) {
  return {
    id: t.id,
    ad: t.ad,
    sinir: t.sinir,
    emojiAdi: t.emojiAdi,
    get emoji() {
      return emoji(t.emojiAdi);
    },
  };
}

const paketler = TANIMLAR.map(tanimla);

function paketBul(id) {
  return paketler.find((p) => p.id === id) || null;
}

/**
 * Bir paket kaydının GEÇERLİ limiti.
 *
 * ⚠️ NEDEN KAYITTAKİ `sinir` DOĞRUDAN KULLANILMIYOR:
 * Paket oluşturulurken `sinir` değeri bu dosyadan kopyalanıp veritabanına
 * yazılıyor. Bu yüzden buradaki sayıyı değiştirmek yalnızca YENİ paketleri
 * etkiliyordu; mevcut müşteriler paketleri bitene kadar eski limitte
 * kalıyordu. "Diamond'ı 60 yaptım ama kimsenin limiti değişmedi" tam olarak
 * bu yüzden oluyordu.
 *
 * Artık config kaynak kabul ediliyor: burayı değiştir, herkese ANINDA yansır.
 *
 * ⚠️ Yedek olarak kayıttaki değer duruyor: bir paket id'si bu listeden
 * tamamen silinirse o pakete sahip müşteriler limitlerini kaybetmesin.
 *
 * ⚠️ ÖNCELİK SIRASI:
 *   1. `.paket-setup` ile bu sunucuya özel ayarlanan limit
 *   2. Bu dosyadaki varsayılan
 *   3. Kayıttaki eski değer (paket listeden silinmişse)
 */
function paketSiniri(paketKaydi, guildId = null) {
  if (!paketKaydi) return 0;

  const paketId = paketKaydi.paketAdi;

  /**
   * ⚠️ TEMBEL `require`.
   *
   * `paket-ayar.js` bu dosyayı zaten yüklüyor; tepede karşılıklı require
   * yazmak döngü oluşturur ve biri diğerini yarım görürdü. İçeride
   * çağırınca Node'un modül önbelleği devreye giriyor, maliyeti yok.
   */
  if (guildId) {
    const { ozelSinir } = require("./paket-ayar");
    const ozel = ozelSinir(guildId, paketId);
    if (ozel != null) return ozel;
  }

  const tanim = paketBul(paketId);
  return tanim ? tanim.sinir : (paketKaydi.sinir ?? 0);
}

/**
 * Aktif paket listesinin toplam limiti.
 *
 * `guildId` verilmezse sunucuya özel ayarlar YOK SAYILIR ve varsayılanlar
 * kullanılır — çağıranların hepsi zaten guildId'yi biliyor, vermeleri şart.
 */
function toplamSinir(paketKayitlari, guildId = null) {
  return (paketKayitlari ?? []).reduce((t, p) => t + paketSiniri(p, guildId), 0);
}

module.exports = { paketler, paketBul, paketSiniri, toplamSinir };
