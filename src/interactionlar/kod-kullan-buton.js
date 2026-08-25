const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

/**
 * Panel butonu → kod giriş modalı.
 *
 * Modal kullanılıyor çünkü kodu kanala yazdırmak, başkasının kopyalayıp
 * önce kullanmasına yol açardı. Modal içeriğini yalnızca gönderen görür.
 */
module.exports = {
  name: "kod_kullan_ac",
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("kod_kullan_modal")
      .setTitle("Paket Kodu")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("kod_input")
            .setLabel("Kodunu gir")
            .setPlaceholder("AURA-XXXX-XXXX-XXXX")
            .setStyle(TextInputStyle.Short)
            .setMinLength(8)
            .setMaxLength(40)
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);
  },
};
