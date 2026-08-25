const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");
const Setup = require("../models/Setup");
const { setupSayfaOlustur } = require("../utils/setup-sayfa");
const { ownerId } = require("../config");

module.exports = {
  name: "setup_",
  async execute(interaction, client) {
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "❌ Bu işlem sadece bot sahibi tarafından yapılabilir.",
        ephemeral: true,
      });
    }

    const id = interaction.customId;

    if (id === "setup_gereklirol") {
      const rolId = interaction.values[0];
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { gerekliRolId: rolId },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_logkanal") {
      const kanalId = interaction.values[0];
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { logKanalId: kanalId },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_boosterrol") {
      const rolId = interaction.values[0];
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { boosterRolId: rolId },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_eklelogkanal") {
      const kanalId = interaction.values[0];
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { tokenEkleLogKanalId: kanalId },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_cikarlogkanal") {
      const kanalId = interaction.values[0];
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { tokenCikarLogKanalId: kanalId },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_sikayetkanal") {
      const kanalId = interaction.values[0];
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { sikayetKanalId: kanalId },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_sinir") {
      const modal = new ModalBuilder()
        .setCustomId("setup_sinir_modal")
        .setTitle("Normal Token Sınırı");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("sinir_input")
            .setLabel("Token sınırını girin (sayı)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Örn: 3")
            .setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }

    if (id === "setup_sinir_modal") {
      const deger = parseInt(
        interaction.fields.getTextInputValue("sinir_input"),
      );
      if (isNaN(deger) || deger < 1) {
        return interaction.reply({
          content: "❌ Geçerli bir sayı girin.",
          ephemeral: true,
        });
      }
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { normalSinir: deger },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      await interaction.deferUpdate();
      return interaction.message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }

    if (id === "setup_boostersinir") {
      const modal = new ModalBuilder()
        .setCustomId("setup_boostersinir_modal")
        .setTitle("Booster Token Sınırı");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("bsinir_input")
            .setLabel("Booster token sınırını girin (sayı)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Örn: 7")
            .setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }

    if (id === "setup_boostersinir_modal") {
      const deger = parseInt(
        interaction.fields.getTextInputValue("bsinir_input"),
      );
      if (isNaN(deger) || deger < 1) {
        return interaction.reply({
          content: "❌ Geçerli bir sayı girin.",
          ephemeral: true,
        });
      }
      await Setup.findOneAndUpdate(
        { guildId: interaction.guildId },
        { boosterSinir: deger },
        { upsert: true, new: true },
      );
      const setup = await Setup.findOne({ guildId: interaction.guildId });
      await interaction.deferUpdate();
      return interaction.message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [setupSayfaOlustur(setup)],
        allowedMentions: { parse: [] },
      });
    }
  },
};
