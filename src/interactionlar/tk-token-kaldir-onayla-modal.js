const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotDurdur } = require("../utils/selfbot-manager");
const { secilenMap, getFiltreliTokenler } = require("../utils/tokenkontrol-sayfa");
const { tokenLogGonder } = require("../utils/token-log");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tk_modal_token_kaldir_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const rest = id.replace("tk_modal_token_kaldir_", "");
    const lastUnd = rest.lastIndexOf("_");
    const guildId = rest.substring(0, lastUnd);

    let secim = null;
    if (interaction.components) {
      for (const label of interaction.components) {
        if (label.type === 18 && label.component) {
          if (label.component.customId === "kaldir_onay_secim") {
            secim = label.component.values?.[0];
            break;
          }
        }
      }
    }

    if (!secim || secim === "hayir") {
      return interaction.reply({
        content: `${emoji("hata")} İşlem iptal edildi.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const secilenIds = [
      ...(secilenMap.get(interaction.message?.reference?.messageId || msgId) ||
        []),
    ];
    const tokenler = await getFiltreliTokenler(interaction.client, guildId, userId);

    let kaldirildi = 0;
    for (const t of tokenler) {
      if (!secilenIds.includes(t._id.toString())) continue;
      try {
        await selfbotDurdur(t.token);
        await Token.findByIdAndDelete(t._id);
        kaldirildi++;
      } catch (_) {}
    }

    if (msgId) secilenMap.delete(msgId);

    if (kaldirildi > 0) {
      tokenLogGonder(client, interaction.guildId, { tur: "kaldirildi", kullanici: userId, adet: kaldirildi });
    }

    const c = new ContainerBuilder()
      .setAccentColor(0xed4245)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("cop")} **Token Kaldırma Tamamlandı**\n${emoji("basarili")} **${kaldirildi}** hesap başarıyla silindi.`,
        ),
      );
    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
