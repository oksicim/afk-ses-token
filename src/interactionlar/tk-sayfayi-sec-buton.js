const { SAYFA_BOYUTU, secilenMap, sayfaOlustur, getFiltreliTokenler, tokenPanelIzle } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_sayfayi_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_sayfayi_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]);
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const tokenler = await getFiltreliTokenler(client, guildId, userId);
    const sayfaTokenler = tokenler.slice(sayfa * SAYFA_BOYUTU, (sayfa + 1) * SAYFA_BOYUTU);
    const eskiSecili = secilenMap.get(msgId) || new Set();
    const yeniSecili = new Set([...eskiSecili, ...sayfaTokenler.map((t) => t._id.toString())]);
    if (msgId) secilenMap.set(msgId, yeniSecili);
    await interaction.update(
      await sayfaOlustur(client, guildId, sayfa, Array.from(yeniSecili), userId, msgId),
    );
    await tokenPanelIzle(interaction, client, guildId, sayfa, Array.from(yeniSecili), userId);
  },
};
