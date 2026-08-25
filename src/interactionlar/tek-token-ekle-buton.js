const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  name: "tek_token_ekle",
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId("modal_tek_token")
      .setTitle("1 Token Ekle");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("token_input")
          .setLabel("Tokeninizi girin")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Token buraya...")
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("kanal_input")
          .setLabel("Kanal ID si")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ses kanalı ID...")
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  },
};
