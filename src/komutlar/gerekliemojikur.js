const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { ownerId, renk } = require("../config");
const { populerOyunlar, ikonUrl, emojiAdiUret } = require("../utils/oyun-listesi");
const { emoji } = require("../utils/emojiler");

function durumKutusu(baslik, aksan = renk) {
  return new ContainerBuilder()
    .setAccentColor(aksan)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(baslik));
}

module.exports = {
  name: "gerekliemojikur",
  async execute(message) {
    // Yalnızca owner: bu komut botun application emoji'lerine yazar.
    if (message.author.id !== ownerId) {
      return message.reply("❌ Bu komutu sadece bot sahibi kullanabilir.");
    }

    const app = message.client.application;
    if (!app) {
      return message.reply("❌ Uygulama (application) bilgisi henüz hazır değil.");
    }

    const durumMsg = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        durumKutusu(
          `${emoji("yukleniyor")} **Oyun logoları hazırlanıyor...**\nMevcut emojiler ve oyun listesi alınıyor.`,
        ),
      ],
    });

    // Mevcut application emojilerini çek (isimle eşleştirmek için).
    let mevcutAdlar = new Set();
    try {
      const hepsi = await app.emojis.fetch();
      mevcutAdlar = new Set(hepsi.map((e) => e.name));
    } catch (e) {
      console.error("[gerekliemojikur] emoji fetch hatası:", e?.message || e);
    }

    const oyunlar = await populerOyunlar(200);
    const hedefler = oyunlar.filter((g) => ikonUrl(g)); // ikonu olanlar

    let olusturulan = 0;
    let atlanan = 0;
    let hata = 0;
    const hatalar = [];

    const guncelle = async (ekstra = "") => {
      await durumMsg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [
            durumKutusu(
              `${emoji("yukleniyor")} **Emojiler kuruluyor...**\n` +
                `> ✅ Oluşturulan: **${olusturulan}**\n` +
                `> ⏭️ Zaten var: **${atlanan}**\n` +
                `> ❌ Hata: **${hata}**\n` +
                `-# ${olusturulan + atlanan + hata}/${hedefler.length}${ekstra ? "\n" + ekstra : ""}`,
            ),
          ],
        })
        .catch(() => {});
    };

    for (let i = 0; i < hedefler.length; i++) {
      const g = hedefler[i];
      const ad = emojiAdiUret(g.name);

      if (mevcutAdlar.has(ad)) {
        atlanan++;
      } else {
        try {
          // İkonu indir → Buffer olarak yükle (URL'in otomatik fetch'ine güvenme).
          const res = await fetch(ikonUrl(g, 128));
          if (!res.ok) throw new Error(`ikon indirilemedi (${res.status})`);
          const buf = Buffer.from(await res.arrayBuffer());
          await app.emojis.create({ attachment: buf, name: ad });
          mevcutAdlar.add(ad);
          olusturulan++;
          // Rate limit'e nazik ol (discord.js zaten 429'ları yönetir).
          await new Promise((r) => setTimeout(r, 750));
        } catch (e) {
          hata++;
          if (hatalar.length < 5) hatalar.push(`${g.name}: ${e?.message || e}`);
        }
      }

      // Her 10 işlemde bir durum güncelle.
      if ((i + 1) % 10 === 0) await guncelle();
    }

    const ozet =
      `${emoji("basarili")} **Oyun Logoları Kuruldu!**\n` +
      `> ✅ Yeni oluşturulan: **${olusturulan}**\n` +
      `> ⏭️ Zaten mevcuttu: **${atlanan}**\n` +
      `> ❌ Başarısız: **${hata}**\n` +
      `-# Toplam ${hedefler.length} oyun • Artık **Hazır Oyun Ekle** menüsünde logolar otomatik çıkacak.` +
      (hatalar.length
        ? `\n-# Örnek hatalar: ${hatalar.join(" | ").slice(0, 400)}`
        : "");

    await durumMsg
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [durumKutusu(ozet, hata ? 0xfaa61a : 0x57f287)],
      })
      .catch(() => {});
  },
};
