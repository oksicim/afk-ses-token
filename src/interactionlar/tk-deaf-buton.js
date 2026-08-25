const { toggleKulaklik } = require("../utils/selfbot-manager");
const { secilenMap, sayfaOlustur, getFiltreliTokenler } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_deaf_secili_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_deaf_secili_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]);
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const secilenIds = [...(secilenMap.get(msgId) || [])];
    const tokenler = await getFiltreliTokenler(client, guildId, userId);
    for (const t of tokenler) {
      if (secilenIds.includes(t._id.toString())) toggleKulaklik(t.token);
    }
    return interaction.update(
      await sayfaOlustur(client, guildId, sayfa, secilenIds, userId, msgId),
    );
  },
};
