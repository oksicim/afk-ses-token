const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  name: "tk_kanal_degis_",
  async execute(interaction, client) {
    const tokenId = interaction.customId.replace("tk_kanal_degis_", "");
    const modal = new ModalBuilder()
      .setCustomId(`mdl_kanal_${tokenId}`)
      .setTitle("Kanalı Düzenle");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("kanal_degis_input")
          .setLabel("Yeni Ses Kanalı ID'si")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  },
};
