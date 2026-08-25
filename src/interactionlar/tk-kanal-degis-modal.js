const Token = require("../models/Token");
const { selfbotBilgi, kanalGuncelle } = require("../utils/selfbot-manager");
const { sayfaOlustur } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "mdl_kanal_",
  async execute(interaction, client) {
    const msgId = interaction.message?.id;
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
    const tokenId = interaction.customId.replace("mdl_kanal_", "");
    const kanalId = interaction.fields
      .getTextInputValue("kanal_degis_input")
      .trim();
    const t = await Token.findById(tokenId);
    if (!t)
      return interaction.reply({
        content: `${emoji("hata")} Token bulunamadı.`,
        ephemeral: true,
      });
    await Token.updateOne({ _id: t._id }, { $set: { kanalId } });
    t.kanalId = kanalId;
    await kanalGuncelle(t.token, kanalId);
    const v = selfbotBilgi(t.token);
    const donusGuild = v && v.guildId ? v.guildId : t.guildId;
    return interaction.update(
      await sayfaOlustur(client, donusGuild, 0, [], userId, msgId)
    );
  },
};
