const { selfbotDurdur, selfbotBaslat } = require("../utils/selfbot-manager");
const { secilenMap, sayfaOlustur, getFiltreliTokenler } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_yeniden_basla_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_yeniden_basla_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]) || 0;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    await interaction.deferUpdate();
    const secilenIds = [...(secilenMap.get(msgId) || [])];
    if (secilenIds.length > 0) {
      const tokenler = await getFiltreliTokenler(client, guildId, userId);
      const secilenTokenler = tokenler.filter((t) => secilenIds.includes(t._id.toString()));
      for (const t of secilenTokenler) {
        try { await selfbotDurdur(t.token); } catch (_) {}
        try { await selfbotBaslat(t.token, t.kanalId); } catch (_) {}
      }
    }
    return interaction.editReply(
      await sayfaOlustur(client, guildId, sayfa, secilenIds, userId, msgId),
    );
  },
};
