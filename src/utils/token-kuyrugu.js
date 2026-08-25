// Açılışta tokenleri arka planda başlatan öncelikli kuyruk.
//
// Neden var: eskiden ready.js tüm tokenleri TEK TEK, aralarında 1.5-3 sn
// bekleyerek başlatıyordu ve bitene kadar `global.botHazir` false kalıp
// BÜTÜN botu kilitliyordu. 4000 tokende bu saatler sürer ve o süre boyunca
// kimse hiçbir komutu kullanamaz.
//
// Yeni mantık:
//   • Bot açılır açılmaz kullanılabilir; kilit yok.
//   • Tokenler paralel işçilerle (ES_ZAMANLI) yüklenir.
//   • Kullanıcı panelini açtığında KENDİ tokenleri kuyruğun başına alınır
//     (oncelikVer) — yani sırayı beklemez, saniyeler içinde açılır.
//   • Her tokenin durumu tek tek bilinir; sadece o token "başlatılıyor"
//     görünür, diğerleri normal çalışır.

const { selfbotBaslat, selfbotBilgi, selfbotDurdur } = require("./selfbot-manager");
const config = require("../config");

// Aynı anda kaç token başlatılsın + girişler arası bekleme. config.js'den
// ayarlanır; tek tek yükleme yerine bu kadar token PARALEL açılır.
// Kaba hız: ES_ZAMANLI / (giriş süresi + bekleme) token/sn.
// 25 işçi ≈ 10 token/sn ≈ 4000 token ~7 dk (eskiden ~2.5 saatti).
const ES_ZAMANLI = Math.max(1, config.esZamanliGiris ?? 25);
const BEKLE_MIN = config.girisBeklemeMin ?? 250;
const BEKLE_MAX = config.girisBeklemeMax ?? 750;

// token -> "kuyrukta" | "basliyor" | "bitti"
const durumlar = new Map();
// token -> { token, kanalId, selfMute, selfDeaf }
const bekleyenler = new Map();
// İşlenme sırası (token stringleri). Öncelik verilince baştan eklenir.
let sira = [];

let calisanIsci = 0;
let toplam = 0;
let biten = 0;

function girisGecikmesi() {
  return BEKLE_MIN + Math.floor(Math.random() * Math.max(1, BEKLE_MAX - BEKLE_MIN));
}

function bekle(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Tokeni kuyruğa alır. Zaten kuyrukta / başlatılmış olanlar tekrar eklenmez.
 * `oncelikli` verilirse sıranın başına konur.
 */
function kuyrugaEkle(kayit, oncelikli = false) {
  const token = kayit.token;
  if (durumlar.has(token)) {
    // Zaten biliniyor: sadece hâlâ bekliyorsa öne alabiliriz.
    if (oncelikli && durumlar.get(token) === "kuyrukta") oneAl(token);
    return;
  }
  durumlar.set(token, "kuyrukta");
  bekleyenler.set(token, kayit);
  toplam++;
  if (oncelikli) sira.unshift(token);
  else sira.push(token);
  isciBaslat();
}

function oneAl(token) {
  const i = sira.indexOf(token);
  if (i > 0) {
    sira.splice(i, 1);
    sira.unshift(token);
  }
}

/**
 * Verilen tokenleri kuyruğun başına alır (kullanıcı panelini açtığında
 * kendi hesapları sıranın sonunu beklemesin diye).
 */
function oncelikVer(tokenlar) {
  let tasinan = 0;
  // Sondan başa doğru ekle ki verilen dizideki sıra korunsun.
  for (let i = tokenlar.length - 1; i >= 0; i--) {
    const t = tokenlar[i];
    if (durumlar.get(t) === "kuyrukta") {
      oneAl(t);
      tasinan++;
    }
  }
  if (tasinan) isciBaslat();
  return tasinan;
}

async function isci() {
  try {
    while (sira.length > 0) {
      const token = sira.shift();
      const kayit = bekleyenler.get(token);
      bekleyenler.delete(token);
      if (!kayit) continue;

      durumlar.set(token, "basliyor");
      try {
        await selfbotBaslat(
          kayit.token,
          kayit.kanalId,
          kayit.selfMute ?? false,
          kayit.selfDeaf ?? false,
        );
      } catch (err) {
        console.error("[Kuyruk] Token başlatılamadı:", err?.message || err);
      }
      durumlar.set(token, "bitti");
      biten++;

      /**
       * ⚠️ "bitti" işareti KALICI DEĞİL.
       *
       * `durumlar` sadece "bu token hâlâ yükleniyor mu?" sorusuna cevap
       * veriyor (bkz. `yukleniyorMu`); iş bitince kaydın orada durmasının
       * hiçbir faydası yok. Eskiden hiç silinmiyordu ve Map, bot açık
       * kaldıkça eklenen/silinen her tokenle birlikte sonsuza kadar
       * büyüyordu — uzun çalışan süreçte sessiz bir bellek sızıntısı.
       *
       * Kısa bir gecikmeyle siliniyor çünkü panel, token başlatıldıktan
       * hemen sonra durumu bir kez daha soruyor; anında silmek "yükleniyor"
       * göstergesinin takılı kalmasına yol açardı.
       */
      const bitenToken = token;
      setTimeout(() => durumlar.delete(bitenToken), 30000).unref?.();

      await bekle(girisGecikmesi());
    }
  } finally {
    calisanIsci--;

    /**
     * Kuyruk tamamen boşaldığında sayaçlar SIFIRLANIR.
     *
     * `toplam`/`biten` yalnızca ilerleme çubuğu için var. Sıfırlanmazsa
     * açılıştaki 4000 token sayaçta kalıcı olarak duruyor ve sonradan tek
     * token ekleyen kullanıcıya "4000/4001" gibi anlamsız bir çubuk
     * gösteriliyordu. Sıfırlanınca aynı kullanıcı "0/1 → 1/1" görüyor.
     */
    if (sira.length === 0 && calisanIsci === 0) {
      toplam = 0;
      biten = 0;
    }
  }
}

function isciBaslat() {
  while (calisanIsci < ES_ZAMANLI && sira.length > 0) {
    calisanIsci++;
    isci();
  }
}

/** Token hâlâ başlatılma sürecinde mi (sırada ya da login ediliyor)? */
function yukleniyorMu(token) {
  const d = durumlar.get(token);
  return d === "kuyrukta" || d === "basliyor";
}

/** Panelde ilerleme çubuğu için: { toplam, biten, kalan }. */
function ilerleme() {
  return { toplam, biten, kalan: toplam - biten };
}

/** Kuyrukta bekleyen kalmadı mı? */
function bittiMi() {
  return sira.length === 0 && calisanIsci === 0;
}

/**
 * İlk turda "hata" düşen tokenleri bir kez daha dener. Bunların bir kısmı
 * gerçekten ölü değil, sadece rate-limit yemiştir.
 */
async function hatalilariYenidenDene(tokenler) {
  const hatalilar = tokenler.filter((t) => {
    const v = selfbotBilgi(t.token);
    return v && v.durum === "hata";
  });
  if (hatalilar.length === 0) return 0;

  console.log(`🔁 ${hatalilar.length} token hata aldı, yeniden deneniyor...`);
  await bekle(10000); // rate-limit soğuması

  // Kuyruğa geri koy: aynı paralel işçi havuzunu kullanır, tek tek beklemez.
  for (const t of hatalilar) {
    try {
      await selfbotDurdur(t.token); // map'ten çıkar ki tekrar denenebilsin
    } catch (err) {
      console.error("[Kuyruk] Durdurulamadı:", err?.message || err);
    }
    durumlar.delete(t.token); // "bitti" işaretini kaldır ki tekrar kuyruğa girsin
    kuyrugaEkle({
      token: t.token,
      kanalId: t.kanalId,
      selfMute: t.selfMute ?? false,
      selfDeaf: t.selfDeaf ?? false,
    });
  }
  return hatalilar.length;
}

module.exports = {
  ES_ZAMANLI,
  kuyrugaEkle,
  oncelikVer,
  yukleniyorMu,
  ilerleme,
  bittiMi,
  hatalilariYenidenDene,
};
