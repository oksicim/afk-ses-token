const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { secilenMap } = require("../utils/tokenkontrol-sayfa");
const { kategoriPaneliOlustur } = require("../utils/presence-panel");
const { emoji } = require("../utils/emojiler");

function parseCustomId(id) {
  const rest = id.replace("tk_presence_geri_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  const guildId = parts.join("_");
  return { guildId, sayfa, panelMsgId };
}

module.exports = {
  name: "tk_presence_geri_",
  async execute(interaction, client) {
    const { guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);
    const secilenIds = [...(secilenMap.get(panelMsgId) || [])];

    if (secilenIds.length === 0) {
      const c = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("hata")} Seçili hesap bulunamadı.`,
        ),
      );
      return interaction.update({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [c],
      });
    }

    return interaction.update(
      kategoriPaneliOlustur(secilenIds, guildId, sayfa, panelMsgId),
    );
  },
};
