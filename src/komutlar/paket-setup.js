const { MessageFlags } = require("discord.js");
const { emoji, sahipMi } = require("../utils/emojiler");
const { paketSetupPaneli } = require("../utils/paket-setup-sayfa");

/**
 * PAKET AYAR PANELİ
 *
 * Her paketin bu sunucudaki token limitini ve kod kullanılınca verilecek
 * rolü ayarlar. Ayar yapılmayan paketler `utils/paket-config.js`
 * varsayılanıyla çalışmaya devam eder.
 */
module.exports = {
  name: "paket-setup",
  async execute(message) {
    if (!sahipMi(message.author.id)) {
      return message.reply(`${emoji("hata")} Bu komutu sadece bot sahibi kullanabilir.`);
    }
    if (!message.guild) return;

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [paketSetupPaneli(message.guild.id)],
      // Panelde roller <@&id> ile gösteriliyor — etiketlenmesinler.
      allowedMentions: { parse: [] },
    });
  },
};
