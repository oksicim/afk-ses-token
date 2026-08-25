const { secilenMap, sayfaOlustur, tokenPanelIzle } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_sunucu",
  async execute(interaction, client) {
    const guildId = interaction.values[0];
    const msgId = interaction.message?.id;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    if (msgId) secilenMap.delete(msgId);
    await interaction.update(await sayfaOlustur(client, guildId, 0, [], userId, msgId));
    await tokenPanelIzle(interaction, client, guildId, 0, [], userId);
  },
};
