const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  name: "cok_token_ekle",
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId("modal_cok_token")
      .setTitle("Birden Fazla Token Ekle");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("tokenlar_input")
          .setLabel("Tokenler (her satıra bir token)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("TOKEN1\nTOKEN2\nTOKEN3")
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("kanallar_input")
          .setLabel("Kanal IDleri (her satıra bir kanal ID)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("KANALID1\nKANALID2\nKANALID3")
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  },
};
