const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");
const { emoji } = require("../utils/emojiler");
const { koduKullan, kodBicimle } = require("../utils/kod-uygula");
const Setup = require("../models/Setup");

function kutu(icerik, aksan) {
  return new ContainerBuilder()
    .setAccentColor(aksan)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(icerik));
}

module.exports = {
  name: "kod_kullan_modal",
  async execute(interaction, client) {
    // Kod kullanımı DB yazıyor ve askıdaki tokenleri kuyruğa alıyor —
    // 3 saniyelik etkileşim penceresini aşabilir.
    await interaction.deferReply({ ephemeral: true });

    const hamKod = interaction.fields.getTextInputValue("kod_input");

    const sonuc = await koduKullan({
      hamKod,
      userId: interaction.user.id,
      guildId: interaction.guildId,
      guild: interaction.guild,
    });

    if (!sonuc.ok) {
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          kutu(
            `${emoji("hata")} **Kod kullanılamadı**\n${sonuc.hata}`,
            sonuc.kullanilmis ? 0xfaa61a : 0xed4245,
          ),
        ],
      });
    }

    // ── Başarı ──────────────────────────────────────────────────────────
    const bitisDamga = Math.floor(sonuc.bitis.getTime() / 1000);

    let govde =
      `${emoji("basarili")} **Paketin Aktif!**\n` +
      `${sonuc.paket.emoji} **${sonuc.paket.ad}**\n\n` +
      `${emoji("nokta")} **Token limitin:** \`${sonuc.toplamSinir}\`\n` +
      `${emoji("nokta")} **Süre:** ${sonuc.gun} gün — <t:${bitisDamga}:D> (<t:${bitisDamga}:R>)`;

    if (sonuc.uzatildi) {
      govde += `\n-# Bu pakete zaten sahiptin, süresi uzatıldı.`;
    }

    if (sonuc.kurtarilan > 0) {
      govde +=
        `\n\n${emoji("simsek")} **${sonuc.kurtarilan}** askıdaki tokenin geri açılıyor.` +
        `\n-# Birkaç saniye içinde sese girerler.`;
    }
    if (sonuc.kalanAskida > 0) {
      govde += `\n\n${emoji("uyari")} **${sonuc.kalanAskida}** token hâlâ askıda — limitin yetmiyor.`;
    }

    const kart = new ContainerBuilder()
      .setAccentColor(0x57f287)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(govde))
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# Tokenlerini \`.tokenkontrol\` ile yönetebilirsin.`,
        ),
      );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [kart],
      // Metinde <@&id> geçiyor — rol etiketlenmesin.
      allowedMentions: { parse: [] },
    });

    // ── Log ─────────────────────────────────────────────────────────────
    // Sahip hangi kodun kime gittiğini görsün. Log kanalı kurulu değilse
    // sessizce geçilir — kullanıcı paketini zaten aldı, log yüzünden
    // akış bozulmamalı.
    try {
      const setup = await Setup.findOne(
        { guildId: interaction.guildId },
        { logKanalId: 1 },
      ).lean();
      if (!setup?.logKanalId) return;

      const kanal = interaction.guild?.channels.cache.get(setup.logKanalId);
      if (!kanal) return;

      await kanal
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            kutu(
              `${emoji("hediye")} **Kod Kullanıldı**\n` +
                `**Kullanıcı:** <@${interaction.user.id}> (\`${interaction.user.id}\`)\n` +
                `**Kod:** \`${kodBicimle(sonuc.kod)}\`\n` +
                `**Paket:** ${sonuc.paket.ad} (+${sonuc.paket.sinir})\n` +
                `**Yeni limit:** \`${sonuc.toplamSinir}\`\n` +
                `**Bitiş:** <t:${bitisDamga}:D>` +
                (sonuc.uzatildi ? `\n-# Mevcut paketin süresi uzatıldı.` : "") +
                (sonuc.kurtarilan ? `\n-# ${sonuc.kurtarilan} token kurtarıldı.` : ""),
              0x57f287,
            ),
          ],
          allowedMentions: { parse: [] },
        })
        .catch(() => {});
    } catch (err) {
      console.error("[Kod] Log gönderilemedi:", err?.message || err);
    }
  },
};
