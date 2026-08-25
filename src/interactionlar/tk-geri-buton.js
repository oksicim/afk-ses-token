const { secilenMap, sayfaOlustur, tokenPanelIzle } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_geri_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_geri_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]);
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const secilenIds = [...(secilenMap.get(msgId) || [])];
    await interaction.update(
      await sayfaOlustur(client, guildId, sayfa - 1, secilenIds, userId, msgId)
    );
    await tokenPanelIzle(interaction, client, guildId, sayfa - 1, secilenIds, userId);
  },
};
