const { secilenMap, sayfaOlustur, getFiltreliTokenler, tokenPanelIzle } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_tumunu_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_tumunu_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]);
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const tokenler = await getFiltreliTokenler(client, guildId, userId);
    const secilenIds = tokenler.map((t) => t._id.toString());
    if (msgId) secilenMap.set(msgId, new Set(secilenIds));
    await interaction.update(
      await sayfaOlustur(client, guildId, sayfa, Array.from(secilenIds), userId, msgId)
    );
    await tokenPanelIzle(interaction, client, guildId, sayfa, Array.from(secilenIds), userId);
  },
};
