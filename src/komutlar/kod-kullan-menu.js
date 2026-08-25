const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { renk } = require("../config");
const { emoji, sahipMi } = require("../utils/emojiler");
const { tumAyarlar } = require("../utils/paket-ayar");

/**
 * KOD KULLANMA PANELİ
 *
 * Sahip bu komutla paneli bir kanala gönderir; panel kalıcıdır ve herkes
 * butona basıp satın aldığı kodu girebilir.
 *
 * ⚠️ Panel `panel-sahipleri` kaydına GİRMEZ. O kayıt "paneli sadece komutu
 * yazan kullanabilir" kuralını uyguluyor; burada tam tersi isteniyor —
 * panel herkese açık olmalı.
 */
module.exports = {
  name: "kod-kullan-menu",
  async execute(message) {
    if (!sahipMi(message.author.id)) {
      return message.reply(`${emoji("hata")} Bu komutu sadece bot sahibi kullanabilir.`);
    }

    // Paket listesini panelde göster ki kullanıcı ne aldığını görsün.
    const paketler = await tumAyarlar(message.guild.id);
    const paketListesi = paketler
      .map((p) => `${p.emoji} **${p.ad}** — \`${p.sinir}\` token limiti`)
      .join("\n");

    const panel = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${emoji("hediye")}  Paket Kodu Kullan\n` +
            `Satın aldığın kodu buraya girerek paketini anında aktifleştirebilirsin.`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("nokta")} **Paketler**\n${paketListesi}`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("bilgi")} Paket **token limitini artırır**. Limitin dolduğu için ` +
            `askıya alınmış tokenlerin varsa, paket aktifleşince otomatik geri açılır.\n` +
            `-# Kodun çalışmıyorsa yetkiliye başvur. Kod tek kullanımlıktır.`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("kod_kullan_ac")
            .setLabel("Kodu Gir")
            .setEmoji(emoji("hediye"))
            .setStyle(ButtonStyle.Success),
        ),
      );

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [panel],
      // Panelde roller <@&id> ile gösteriliyor — etiketlenmesinler.
      allowedMentions: { parse: [] },
    });

    // Komut mesajını temizle ki kanalda sadece panel kalsın.
    await message.delete().catch(() => {});
  },
};
