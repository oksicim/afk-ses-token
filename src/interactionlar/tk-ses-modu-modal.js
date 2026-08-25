const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { selfbotBilgi, toggleSesModu } = require("../utils/selfbot-manager");
const { renk } = require("../config");
const { secilenMap, getFiltreliTokenler } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tk_modal_ses_modu_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const rest = id.replace("tk_modal_ses_modu_", "");
    const lastUnd = rest.lastIndexOf("_");
    const guildId = rest.substring(0, lastUnd);

    let secim = null;
    if (interaction.components) {
      for (const label of interaction.components) {
        if (label.type === 18 && label.component) {
          if (label.component.customId === "ses_modu_secim") {
            secim = label.component.values?.[0];
            break;
          }
        }
      }
    }

    if (!secim) {
      return interaction.reply({
        content: "❌ Bir seçim yapmalısınız.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const secilenIds = [
      ...(secilenMap.get(interaction.message?.reference?.messageId || msgId) ||
        []),
    ];
    const tokenler = await getFiltreliTokenler(interaction.client, guildId, userId);

    let islenen = 0;
    for (const t of tokenler) {
      if (!secilenIds.includes(t._id.toString())) continue;
      const v = selfbotBilgi(t.token);
      if (!v) continue;
      if (secim === "ses_ac" && !v.sesAktif) {
        toggleSesModu(t.token);
        islenen++;
      }
      if (secim === "ses_kapat" && v.sesAktif) {
        toggleSesModu(t.token);
        islenen++;
      }
    }

    const durum =
      secim === "ses_ac"
        ? `${emoji("acik")} Açık`
        : `${emoji("kapali")} Kapalı`;
    const c = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("ilerlemeBar")} **Ses Modu Güncellendi**\n**Durum:** ${durum}\n**İşlenen:** ${islenen} hesap`,
        ),
      );
    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
