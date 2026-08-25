const Token = require("../models/Token");
const { selfbotBilgi, kanalGuncelle } = require("../utils/selfbot-manager");
const { secilenMap, sayfaOlustur } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tk_modal_kanal_duzenle_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const rest = id.replace("tk_modal_kanal_duzenle_", "");
    const lastUnd = rest.lastIndexOf("_");
    const guildId = rest.substring(0, lastUnd);
    const sayfa = parseInt(rest.substring(lastUnd + 1));

    const yeniKanalId = interaction.fields
      .getTextInputValue("kanal_duzenle_input")
      .trim();

    const secilenIds = [...(secilenMap.get(msgId) || [])];
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    for (const tokenId of secilenIds) {
      const t = await Token.findById(tokenId).catch(() => null);
      if (!t) continue;
      await Token.updateOne({ _id: t._id }, { $set: { kanalId: yeniKanalId } });
      await kanalGuncelle(t.token, yeniKanalId);
    }

    const v = selfbotBilgi(
      (await Token.findById(secilenIds[0]).catch(() => null))?.token,
    );
    const donusGuild = v && v.guildId ? v.guildId : guildId;

    return interaction.editReply(
      await sayfaOlustur(client, donusGuild, sayfa, secilenIds, userId, msgId)
    );
  },
};
