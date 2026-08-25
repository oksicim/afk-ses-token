const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");
const { ownerId, renk } = require("../config");
const { paketBul, paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");
const { toplamSinir: paketToplamSinir } = require("../utils/paket-config");
const Token = require("../models/Token");
const { selfbotDurdur } = require("../utils/selfbot-manager");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "paket_tanimla_sec",
  async execute(interaction, client) {
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "❌ Yetkiniz yok.",
        ephemeral: true,
      });
    }

    const [, hedefId, paketId] =
      interaction.values[0].split("_").length === 3
        ? interaction.values[0].match(/pakettanimla_(\d+)_(.+)/).slice(0, 3)
        : [null, null, null];

    if (!hedefId || !paketId) {
      return interaction.reply({
        content: "❌ Geçersiz seçim.",
        ephemeral: true,
      });
    }

    const paketInfo = paketBul(paketId);
    if (!paketInfo) {
      return interaction.reply({
        content: "❌ Paket bulunamadı.",
        ephemeral: true,
      });
    }

    const zatenVar = await Paket.findOne({
      userId: hedefId,
      guildId: interaction.guild.id,
      paketAdi: paketId,
      aktif: true,
    });

    if (zatenVar) {
      const c = new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `❌ **<@${hedefId}> zaten bu pakete sahip!**`,
          ),
        );
      return interaction.update({ components: [c] });
    }

    const bitis = new Date();
    bitis.setDate(bitis.getDate() + 30);

    await Paket.create({
      userId: hedefId,
      guildId: interaction.guild.id,
      paketAdi: paketId,
      sinir: paketInfo.sinir,
      baslangic: new Date(),
      bitis,
      aktif: true,
      tanimlayan: interaction.user.id,
    });

    const bitisTarih = bitis.toLocaleDateString("tr-TR");

    const aktifPaketler = await Paket.find({
      userId: hedefId,
      guildId: interaction.guild.id,
      aktif: true,
    });
    const toplamSinir = paketToplamSinir(aktifPaketler, interaction.guild.id);

    const askidaTokenler = await Token.find({ userId: hedefId, askida: true });
    let kurtarilanAdet = 0;

    if (askidaTokenler.length > 0) {
      const aktifTokenSayi = await Token.countDocuments({
        userId: hedefId,
        askida: { $ne: true },
      });
      const kurtarilabilir = Math.min(
        askidaTokenler.length,
        toplamSinir - aktifTokenSayi,
      );

      if (kurtarilabilir > 0) {
        const { selfbotBaslat } = require("../utils/selfbot-manager");
        for (let i = 0; i < kurtarilabilir; i++) {
          const t = askidaTokenler[i];
          t.askida = false;
          await t.save();
          await selfbotBaslat(
            t.token,
            t.kanalId,
            t.selfMute ?? false,
            t.selfDeaf ?? false,
          );
          kurtarilanAdet++;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    let kurtarmaText = "";
    if (kurtarilanAdet > 0) {
      kurtarmaText = `\n\n⏩ **${kurtarilanAdet}** askıdaki token otomatik olarak kurtarıldı!`;
    } else if (askidaTokenler.length > 0) {
      kurtarmaText = `\n\n⏸️ **${askidaTokenler.length}** askıda token mevcut (limit yeterli değil).`;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x57f287)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${emoji("onay")} Paket Tanımlandı!\n\n` +
            `**Kullanıcı:** <@${hedefId}>\n` +
            `**Paket:** ${paketInfo.emoji} **${paketInfo.ad}**\n` +
            `**Token Limiti:** \`${paketInfo.sinir}\`\n` +
            `**Toplam Limit:** \`${toplamSinir}\`\n` +
            `**Süre:** \`30 gün\`\n` +
            `**Bitiş:** \`${bitisTarih}\`\n` +
            `**Tanımlayan:** <@${interaction.user.id}>${kurtarmaText}`,
        ),
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });

    const bitisTimestamp = Math.floor(bitis.getTime() / 1000);
    const paketSeviye = paketler.findIndex((p) => p.id === paketId) + 1;

    try {
      const hedefUser = await client.users.fetch(hedefId);
      if (hedefUser) {
        const dmContainer = new ContainerBuilder()
          .setAccentColor(renk)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${emoji("marka")} **Paketiniz Tanımlandı!**\n` +
                `Merhaba <@${hedefId}>, **${paketInfo.ad} Pack** paketiniz başarıyla tanımlandı!`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Paket Detayları:**\n` +
                `> ${paketInfo.emoji} **Paket Adı:** ${paketInfo.ad} Pack\n` +
                `> ${paketInfo.emoji} **Paket Seviyesi:** ${paketSeviye}\n` +
                `> ${paketInfo.emoji} **Paket Süresi:** 1 Aylık\n` +
                `> ${paketInfo.emoji} **Bitiş Tarihi:** <t:${bitisTimestamp}:R>`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Paket Özellikleri:**\n` +
                `> ${paketInfo.emoji} **Voice Token:** ${paketInfo.sinir} limit`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${emoji("marka")} **Yönetim ve Destek:**\n` +
                `Paketinizi yükseltmek isterseniz, destek kanalımızdan bizimle iletişime geçebilirsiniz.\n\n` +
                `**Not:** Bu paket otomatik olarak süre sonunda geri alınacaktır.`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder()
              .setDivider(true)
              .setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "-# Copyright © by Auranest 2026 Developed by oxy",
            ),
          );

        await hedefUser
          .send({
            flags: MessageFlags.IsComponentsV2,
            components: [dmContainer],
          })
          .catch(() => {});
      }
    } catch {}

    tokenLogGonder(client, interaction.guild.id, {
      tur: "eklendi",
      kullanici: hedefId,
      adet: paketInfo.sinir,
      detay: `📦 **${paketInfo.ad}** paketi tanımlandı (30 gün) | Tanımlayan: <@${interaction.user.id}>`,
    });
  },
};
