const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { renk } = require("../config");
const { emoji, sahipMi, EMOJI_ADLARI } = require("../utils/emojiler");
const { klasoruTara, eksikleriYukle, emojileriYukle } = require("../utils/emoji-sync");

function kutu(icerik, aksan = renk) {
  return new ContainerBuilder()
    .setAccentColor(aksan)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(icerik));
}

/**
 * EMOJİ KURULUMU
 *
 * Bot açılışta `emojiler/` klasöründeki YENİ emojileri kendiliğinden yükler
 * (bkz. `acilistaEsitle`). Bu komut durum ekranını gösterir ve yüklemeyi
 * elle tetikler.
 *
 *   .emojikur         → durum: ne eksik, ne fazla
 *   .emojikur uygula  → klasördeki eksikleri yükler
 */
module.exports = {
  name: "emojikur",
  async execute(message) {
    if (!sahipMi(message.author.id)) {
      return message.reply(`${emoji("hata")} Bu komutu sadece bot sahibi kullanabilir.`);
    }

    const app = message.client.application;
    if (!app) {
      return message.reply(`${emoji("hata")} Uygulama bilgisi henüz hazır değil.`);
    }

    const islem = (message.content.split(/\s+/)[1] || "").toLowerCase();

    const durumMsg = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [kutu(`${emoji("yukleniyor")} **Emojiler taranıyor...**`)],
    });

    const { dosyalar, reddedilen, kaynakSorunlari } = await klasoruTara();
    const denetim = await emojileriYukle(message.client);

    // ── Durum ekranı ────────────────────────────────────────────────────────
    if (islem !== "uygula") {
      const klasorAdlari = new Set(dosyalar.map((d) => d.ad));
      const yuklenecek = dosyalar.filter((d) => denetim.eksik.includes(d.ad));
      // Katalogda var, Discord'da yok VE klasörde de görseli yok → elle
      // eklenmesi gereken gerçek boşluk.
      const gorselsiz = denetim.eksik.filter((ad) => !klasorAdlari.has(ad));

      let metin =
        `${emoji("istatistik")} **Emoji Durumu**\n` +
        `> Katalogdaki emoji: **${EMOJI_ADLARI.length}**\n` +
        `> Uygulamaya yüklü: **${denetim.toplam}**\n` +
        `> Klasörde görsel: **${dosyalar.length}**\n` +
        `> Yüklenmeyi bekleyen: **${yuklenecek.length}**\n`;

      if (gorselsiz.length > 0) {
        metin +=
          `\n${emoji("uyari")} **Görseli olmayan ${gorselsiz.length} emoji** (unicode yedeği kullanılıyor):\n` +
          `\`${gorselsiz.join("`, `").slice(0, 800)}\`\n` +
          `-# \`emojiler/\` klasörüne \`ad.png\` koy, sonra \`.emojikur uygula\`.`;
      }

      if (denetim.kullanilmayan.length > 0) {
        metin +=
          `\n\n-# Kodda kullanılmayan ${denetim.kullanilmayan.length} yüklü emoji var ` +
          `(zararsız): ${denetim.kullanilmayan.slice(0, 15).join(", ")}`;
      }

      if (reddedilen.length > 0) {
        metin +=
          `\n\n${emoji("uyari")} **Atlanan dosyalar:**\n` +
          reddedilen.slice(0, 5).map((r) => `-# ${r.dosya} — ${r.sebep}`).join("\n");
      }

      if (kaynakSorunlari.length > 0) {
        metin += `\n\n${emoji("hata")} Klasör okunamadı: ${kaynakSorunlari[0].sebep}`;
      }

      if (yuklenecek.length > 0) {
        metin += `\n\n-# Yüklemek için: \`.emojikur uygula\``;
      }

      return durumMsg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(metin, gorselsiz.length || kaynakSorunlari.length ? 0xfaa61a : 0x57f287)],
        })
        .catch(() => {});
    }

    // ── Uygula ──────────────────────────────────────────────────────────────
    const ilerleme = async (biten, toplam) => {
      await durumMsg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(`${emoji("yukleniyor")} **Emojiler yükleniyor...**\n-# ${biten}/${toplam}`)],
        })
        .catch(() => {});
    };

    const sonuc = await eksikleriYukle(message.client, ilerleme);

    if (sonuc.durduruldu) {
      return durumMsg
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [
            kutu(
              `${emoji("hata")} **Yükleme yapılmadı.**\n` +
                (sonuc.kaynakSorunlari.length
                  ? `Klasör okunamadı: ${sonuc.kaynakSorunlari[0].sebep}`
                  : sonuc.hatalar.join("\n")),
              0xed4245,
            ),
          ],
        })
        .catch(() => {});
    }

    // Yeni emojiler belleğe girmeden `emoji()` unicode yedeğini döner.
    const yeniDenetim = await emojileriYukle(message.client);

    const ozet =
      `${emoji("basarili")} **Emojiler Kuruldu**\n` +
      `> Yeni yüklenen: **${sonuc.yuklenen}**\n` +
      `> Zaten vardı: **${sonuc.atlanan}**\n` +
      `> Hatalı: **${sonuc.hatali}**\n` +
      `-# Uygulamada toplam ${yeniDenetim.toplam} emoji` +
      (yeniDenetim.eksik.length
        ? ` • ${yeniDenetim.eksik.length} emoji hâlâ eksik (görseli yok)`
        : " • katalog tam") +
      (sonuc.hatalar.length ? `\n-# Hatalar: ${sonuc.hatalar.join(" | ").slice(0, 400)}` : "");

    return durumMsg
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [kutu(ozet, sonuc.hatali ? 0xfaa61a : 0x57f287)],
      })
      .catch(() => {});
  },
};
