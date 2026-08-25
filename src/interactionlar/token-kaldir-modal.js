const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotDurdur } = require("../utils/selfbot-manager");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "modal_token_kaldir",
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const tokenlarRaw = interaction.fields.getTextInputValue(
      "kaldir_tokenlar_input",
    );
    const liste = tokenlarRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    let kaldirildi = 0,
      bulunamadi = 0;

    for (const plainToken of liste) {
      // Kullanıcının tüm tokenlerini çek
      const kullaniciTokenleri = await Token.find({
        userId: interaction.user.id,
        guildId: interaction.guildId,
      });

      // Decrypt ederek eşleşeni bul
      let bulundu = false;
      for (const tokenDoc of kullaniciTokenleri) {
        const decrypted = tokenDoc.getDecryptedToken();
        if (decrypted === plainToken) {
          await selfbotDurdur(tokenDoc.token);
          await Token.findByIdAndDelete(tokenDoc._id);
          kaldirildi++;
          bulundu = true;
          break;
        }
      }

      if (!bulundu) bulunamadi++;
    }

    if (kaldirildi > 0) {
      tokenLogGonder(client, interaction.guildId, { tur: "kaldirildi", kullanici: interaction.user.id, adet: kaldirildi });
    }
    const c = new ContainerBuilder()
      .setAccentColor(0xed4245)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("cop")} **Token Kaldırma**\n${emoji("basarili")} Kaldırıldı: **${kaldirildi}**\n${emoji("hata")} Bulunamadı: **${bulunamadi}**`,
        ),
      );
    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
