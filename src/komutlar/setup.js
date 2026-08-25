const { MessageFlags } = require("discord.js");
const Setup = require("../models/Setup");
const { setupSayfaOlustur } = require("../utils/setup-sayfa");
const { ownerId } = require("../config");

module.exports = {
  name: "setup",
  async execute(message) {
    if (message.author.id !== ownerId) return;

    const setup = await Setup.findOne({ guildId: message.guildId });

    const container = setupSayfaOlustur(setup);

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      // Panelde gerekli/booster rolleri <@&id> ile gösteriliyor — etiketlenmesinler.
      allowedMentions: { parse: [] },
    });
  },
};
