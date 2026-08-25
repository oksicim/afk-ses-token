const panelSahipleri = require("./panel-sahipleri");

module.exports = {
  name: "guncelleme_iptal_",
  async execute(interaction) {
    const onizlemeId = interaction.customId.replace("guncelleme_iptal_", "");

    panelSahipleri.delete(interaction.message.id);
    // Önizleme ve kontrol paneli ayrı mesajlar — ikisini de temizle.
    await interaction.channel.messages
      .fetch(onizlemeId)
      .then((m) => m.delete())
      .catch(() => {});
    await interaction.message.delete().catch(() => {});
  },
};
