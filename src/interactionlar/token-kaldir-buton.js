const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  name: "token_kaldir",
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId("modal_token_kaldir")
      .setTitle("Token Kaldır");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("kaldir_tokenlar_input")
          .setLabel("Kaldırılacak tokenler (her satıra bir token)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("token1\ntoken2\n...")
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  },
};
