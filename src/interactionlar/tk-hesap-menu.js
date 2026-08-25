const { secilenMap, sayfaOlustur, tokenPanelIzle } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_hesap_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_hesap_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]);
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const secilenIds = interaction.values;
    if (msgId) secilenMap.set(msgId, new Set(secilenIds));
    await interaction.update(
      await sayfaOlustur(client, guildId, sayfa, secilenIds, userId, msgId),
    );
    // Tek token seçildiyse ve hâlâ başlatılıyorsa: hazır olduğunda paneli
    // yeni mesaj atmadan yerinde güncelle (kontroller aktifleşir).
    await tokenPanelIzle(interaction, client, guildId, sayfa, secilenIds, userId);
  },
};
