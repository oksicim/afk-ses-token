const { paketAyarModal } = require("../utils/paket-setup-sayfa");
const { paketBul } = require("../utils/paket-config");

/** Panelden paket seçimi → ayar modalı. */
module.exports = {
  name: "paketsetup_sec",
  async execute(interaction) {
    const paketId = interaction.values[0];

    if (!paketBul(paketId)) {
      return interaction.reply({ content: "❌ Paket bulunamadı.", ephemeral: true }).catch(() => {});
    }

    await interaction.showModal(paketAyarModal(interaction.guild.id, paketId));
  },
};
