const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { tokenParmakIzi } = require("../utils/crypto-helper");
const { selfbotBaslat } = require("../utils/selfbot-manager");
const { kullaniciBilgi } = require("../utils/sinir-kontrol");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "modal_tek_token",
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const token = interaction.fields.getTextInputValue("token_input").trim();
    const kanalId = interaction.fields.getTextInputValue("kanal_input").trim();

    // Token zaten var mı? Tek indeksli sorgu.
    //
    // Eskiden burada TÜM tokenler çekilip tek tek decrypt ediliyordu; 4000
    // tokenlik bir kurulumda her ekleme 4000 AES çözme + tüm koleksiyonun
    // belleğe alınması demekti (bkz. crypto-helper.js/tokenParmakIzi).
    const varMi = await Token.exists({ tokenHash: tokenParmakIzi(token) });
    if (varMi) {
      return interaction.editReply({
        content: `${emoji("hata")} Bu token zaten kayıtlı!`,
      });
    }

    const bilgi = await kullaniciBilgi(interaction.member, interaction.guildId);

    if (bilgi.sinir !== null && !bilgi.rolVar) {
      return interaction.editReply({
        content: "❌ Gerekli role veya booster rolüne sahip değilsin!",
      });
    }

    if (bilgi.sinir !== null && bilgi.kalanHak <= 0) {
      return interaction.editReply({
        content: `❌ Token sınırına ulaştın! (Sınır: \`${bilgi.sinir}\` | Aktif: \`${bilgi.aktifSayi}\`)`,
      });
    }

    const yeniToken = await Token.create({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      token,
      kanalId,
    });
    await selfbotBaslat(yeniToken.token, kanalId);
    tokenLogGonder(client, interaction.guildId, { tur: "eklendi", kullanici: interaction.user.id, adet: 1, detay: `Kanal: \`${kanalId}\`` });

    const c = new ContainerBuilder()
      .setAccentColor(0x57f287)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("basarili")} **Token Eklendi**\n**Kanal ID:** \`${kanalId}\`\n\`.tokenkontrol\` ile tokenini yönetebilirsin.`,
        ),
      );
    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
