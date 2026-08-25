const { writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { EMOJI_KATALOG } = require("./emojiler");
const { EMOJI_KLASOR, MAX_BOYUT } = require("./emoji-sync");

/**
 * EMOJİYİ YERİNE KOYMA
 *
 * `emojiler/` klasörüne dosya atıp botu yeniden başlatmak yerine, Discord'dan
 * yapıştırılan bir emojiyi indirip DOĞRUDAN uygulamaya yükler ve belleği
 * tazeler — komut aynı saniye içinde yeni emojiyi kullanmaya başlar.
 *
 * ⚠️ DISCORD EMOJİ GÖRSELİNİ DEĞİŞTİRMEYE İZİN VERMEZ. Aynı adda bir emoji
 * zaten yüklüyse tek yol SİLİP yeniden yüklemek; bu fonksiyon onu yapıyor.
 * Silme başarısız olursa yükleme de yapılmaz, yoksa "ad zaten kullanımda"
 * hatası alınırdı.
 */

/**
 * `<a:ad:123>` biçiminde emoji arar; `ad: <:x:1>` yazımını da anlar.
 *
 * Kaynak emojinin adı `[^:\s]` ile geçiliyor çünkü o adı KULLANMIYORUZ,
 * yalnızca kimlik lazım. Dar bir `\w` kalıbı, listede `nokta~2` gibi görünen
 * (aynı adın ikinci kopyası) emojileri sessizce atlardı.
 */
const ESLESME = /(\w{2,32})\s*[:=]?\s*<(a)?:[^:\s]{1,32}:(\d{17,20})>/g;

/**
 * Serbest metinden `ad <emoji>` çiftlerini çıkarır.
 * Tek satırda da, alt alta onlarca satırda da çalışır.
 */
function eslesmeleriAyristir(metin) {
  const istekler = [];
  const bilinmeyen = [];
  const gorulen = new Set();

  ESLESME.lastIndex = 0;
  let m;

  while ((m = ESLESME.exec(metin)) !== null) {
    const ad = m[1];

    if (!(ad in EMOJI_KATALOG)) {
      bilinmeyen.push(ad);
      continue;
    }

    // Aynı ad iki kez yazıldıysa SONUNCUSU geçerli olsun: kullanıcı
    // muhtemelen fikrini değiştirip alta yenisini yapıştırdı.
    if (gorulen.has(ad)) {
      const i = istekler.findIndex((istek) => istek.ad === ad);
      if (i !== -1) istekler.splice(i, 1);
    }

    gorulen.add(ad);
    istekler.push({ ad, id: m[3], animasyonlu: m[2] === "a" });
  }

  return { istekler, bilinmeyen };
}

/** Emojiyi indirir, klasöre yazar ve uygulamaya yükler. */
async function emojiKur(client, istek) {
  const uzanti = istek.animasyonlu ? "gif" : "png";

  // 128 piksel yeterli: Discord emojiyi küçük gösteriyor ve uygulama emojisi
  // başına 256 KiB sınırı var.
  const url = `https://cdn.discordapp.com/emojis/${istek.id}.${uzanti}?size=128&quality=lossless`;

  const cevap = await fetch(url).catch(() => null);

  if (!cevap || !cevap.ok) {
    return { ad: istek.ad, ok: false, sebep: `indirilemedi (HTTP ${cevap?.status ?? "—"})` };
  }

  const bytes = Buffer.from(await cevap.arrayBuffer());

  if (bytes.byteLength > MAX_BOYUT) {
    return {
      ad: istek.ad,
      ok: false,
      sebep: `çok büyük (${Math.round(bytes.byteLength / 1024)} KB)`,
    };
  }

  // Diske de yazıyoruz: uygulama emojileri bir gün silinirse ya da bot yeni
  // bir uygulamaya taşınırsa açılıştaki otomatik yükleme bunları geri koyar.
  // Kaynak dosya olmadan emoji tek kopya olurdu.
  await writeFile(join(EMOJI_KLASOR, `${istek.ad}.${uzanti}`), bytes).catch((err) => {
    console.warn(`[EmojiKur] "${istek.ad}" dosyaya yazılamadı:`, err?.message || err);
  });

  const yonetici = client.application.emojis;
  let degistirildi = false;

  try {
    const mevcut = (await yonetici.fetch()).find((e) => e.name === istek.ad);

    if (mevcut) {
      await yonetici.delete(mevcut.id);
      degistirildi = true;
    }

    await yonetici.create({ attachment: bytes, name: istek.ad });
  } catch (err) {
    return { ad: istek.ad, ok: false, sebep: err?.message || String(err) };
  }

  console.log(`[EmojiKur] "${istek.ad}" ${degistirildi ? "değiştirildi" : "yüklendi"}.`);

  return { ad: istek.ad, ok: true, degistirildi };
}

module.exports = { eslesmeleriAyristir, emojiKur };
