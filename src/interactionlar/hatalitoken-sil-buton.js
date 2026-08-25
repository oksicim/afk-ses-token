const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotBilgi, selfbotDurdur } = require("../utils/selfbot-manager");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "hatalitoken_sil_",
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const userId = interaction.customId.replace("hatalitoken_sil_", "");
    const tumTokenler = await Token.find({ userId });
    const hatalilar = tumTokenler.filter((t) => {
      const v = selfbotBilgi(t.token);
      return v && v.durum === "hata";
    });

    let silinen = 0;
    for (const t of hatalilar) {
      await Token.deleteOne({ _id: t._id });
      await selfbotDurdur(t.token);
      silinen++;
    }

    const c = new ContainerBuilder()
      .setAccentColor(0x57f287)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("basarili")} **${silinen} Hatalı Token Silindi**\nBu tokenler sistemden kalıcı olarak kaldırıldı.`,
        ),
      );

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
