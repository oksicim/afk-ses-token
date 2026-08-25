const { ownerId } = require("../config");

/**
 * EMOJİ KATALOĞU
 *
 * Botun kullandığı TÜM emoji adları burada tanımlıdır. Değer, custom emoji
 * bulunamazsa kullanılacak unicode yedeğidir.
 *
 * NEDEN VAR: emoji ID'leri koda dağılmış hâldeyken üç şey oluyordu —
 *   1. Bot başka bir uygulamaya taşınınca 170 kullanımın hepsi bozuluyor
 *      ve Discord'da ham metin olarak (`<:tik:1477...>`) görünüyordu.
 *   2. Aynı ad iki farklı ID'ye (`dotblue`, `red`), aynı ID iki farklı ada
 *      (`dotblue`/`bewrqturuncu`) bağlanmıştı — hangisinin doğru olduğu
 *      belli değildi ve düzeltmek 170 yeri elle taramak demekti.
 *   3. Bir emoji silinince nerede kullanıldığını bulmanın yolu yoktu;
 *      artık `.emojikur` eksikleri tek ekranda listeliyor.
 *
 * Bu katalog iki işi birden yapar: emoji yüklü değilse bot bozuk görünmez
 * (unicode'a düşer) ve `.emojikur` bu listeyi yüklü emojilerle karşılaştırıp
 * "kodda kullanılıyor ama böyle bir emoji yok" uyarısı verir.
 *
 * YENİ EMOJİ EKLEME:
 *   1. Buraya `adi: 'unicode_yedegi'` satırı ekle
 *   2. `emojiler/` klasörüne `adi.png` (veya .gif) koy
 *   3. `.emojikur` çalıştır
 */
const EMOJI_KATALOG = {
  // --- Durum ---
  basarili: "✅",
  hata: "❌",
  uyari: "⚠️",
  bilgi: "ℹ️",
  yukleniyor: "⏳",
  onay: "☑️",
  engelli: "🚫",

  // --- İşaretler ---
  nokta: "🔹",
  noktaTuruncu: "🔸",
  cizgi: "➖",
  asagi: "⬇️",
  okSari: "➡️",
  simsek: "⚡",

  // --- Ses / hesap ---
  mikrofonAcik: "🎤",
  mikrofonKapali: "🔇",
  kulaklikAcik: "🎧",
  kulaklikKapali: "🔕",
  acik: "🟢",
  kapali: "⚫",

  // --- Panel ---
  istatistik: "📊",
  kullanici: "👤",
  profil: "🪪",
  pano: "📋",
  cop: "🗑️",
  indir: "📥",
  guncelleme: "🔄",
  hediye: "🎁",
  marka: "✨",
  ilerlemeBar: "▰",
};

const EMOJI_ADLARI = Object.keys(EMOJI_KATALOG);

/** Ad → `<:ad:id>` biçiminde çözülmüş custom emojiler. */
const cozulmus = new Map();
let yuklendi = false;

/**
 * Emojiyi getirir. Custom yüklüyse onu, değilse unicode yedeğini döner.
 *
 * ⚠️ Katalogda olmayan bir ad istenirse SESSİZ KALMAZ: geliştirici hatası
 * anında görünsün diye konsola yazar ve soru işareti döner. Yoksa yazım
 * hatası olan bir emoji adı üretimde sessizce boş string basardı.
 */
function emoji(ad) {
  const cozum = cozulmus.get(ad);
  if (cozum) return cozum;

  if (!(ad in EMOJI_KATALOG)) {
    console.warn(`[Emoji] Katalogda olmayan emoji istendi: "${ad}"`);
    return "❔";
  }

  return EMOJI_KATALOG[ad];
}

/**
 * Uygulama emojilerini belleğe alır ve denetim raporu döner.
 *
 * `client.application.emojis.fetch()` giriş gerektirir, o yüzden `ready`
 * olayından SONRA çağrılır.
 */
function emojileriCoz(emojiKoleksiyonu) {
  cozulmus.clear();

  for (const e of emojiKoleksiyonu.values()) {
    cozulmus.set(e.name, `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`);
  }
  yuklendi = true;

  const eksik = EMOJI_ADLARI.filter((ad) => !cozulmus.has(ad));
  const kullanilmayan = [...cozulmus.keys()].filter((ad) => !(ad in EMOJI_KATALOG));

  return { toplam: cozulmus.size, eksik, kullanilmayan };
}

function emojilerYuklendiMi() {
  return yuklendi;
}

/** Sadece bot sahibi mi? Emoji kurma komutları için. */
function sahipMi(userId) {
  return userId === ownerId;
}

module.exports = {
  EMOJI_KATALOG,
  EMOJI_ADLARI,
  emoji,
  emojileriCoz,
  emojilerYuklendiMi,
  sahipMi,
};
