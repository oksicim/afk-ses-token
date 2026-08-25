const Token = require("../models/Token");
const { selfbotBilgi, guildTagAyarla } = require("../utils/selfbot-manager");
const { secilenMap, sayfaOlustur } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tk_modal_guild_tag_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const rest = id.replace("tk_modal_guild_tag_", "");
    const lastUnd = rest.lastIndexOf("_");
    const guildId = rest.substring(0, lastUnd);
    const sayfa = parseInt(rest.substring(lastUnd + 1));

    const tagGuildId = interaction.fields
      .getTextInputValue("guild_tag_input")
      .trim();

    const secilenIds = [...(secilenMap.get(msgId) || [])];
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    let basarili = 0;
    let hatali = 0;
    for (const tokenId of secilenIds) {
      const t = await Token.findById(tokenId).catch(() => null);
      if (!t) continue;
      const sonuc = await guildTagAyarla(t.token, tagGuildId);
      if (sonuc.ok) basarili++;
      else hatali++;
    }

    const v = selfbotBilgi(
      (await Token.findById(secilenIds[0]).catch(() => null))?.token,
    );
    const donusGuild = v && v.guildId ? v.guildId : guildId;

    await interaction.editReply(
      await sayfaOlustur(client, donusGuild, sayfa, secilenIds, userId, msgId),
    );

    return interaction
      .followUp({
        content: tagGuildId
          ? `${emoji("basarili")} Guild tag ayarlandı — Başarılı: ${basarili}, Hatalı: ${hatali}`
          : `${emoji("basarili")} Guild tag kaldırıldı — Başarılı: ${basarili}, Hatalı: ${hatali}`,
        ephemeral: true,
      })
      .catch(() => {});
  },
};
