const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require("discord.js");
const Setup = require("../models/Setup");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "hata_bildir_modal",
  async execute(interaction, client) {
    if (!interaction.isModalSubmit()) return;
    await interaction.deferReply({ ephemeral: true });

    let aciklama = "Belirtilmedi.";
    try {
      aciklama =
        interaction.fields.getTextInputValue("hata_aciklama") || aciklama;
    } catch {
      // DJS fallback
      if (interaction.components) {
        for (const r of interaction.components) {
          for (const c of r.components) {
            if (c.customId === "hata_aciklama" && c.value) {
              aciklama = c.value;
            }
          }
        }
      }
    }

    const setup = await Setup.findOne({ guildId: interaction.guildId });
    if (!setup || !setup.sikayetKanalId) {
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .setAccentColor(0xed4245)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${emoji("hata")} Bu mesajı oxy'e göster ve 1 aylık premium kazan!`,
              ),
            ),
        ],
      });
    }

    const logKanal = interaction.client.channels.cache.get(
      setup.sikayetKanalId,
    );
    if (!logKanal) {
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .setAccentColor(0xed4245)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${emoji("hata")} Bu mesajı oxy'e göster ve 1 aylık paket kazan!`,
              ),
            ),
        ],
      });
    }

    // Modal içindeki resim bağlantısını Event üzerinden kaydedilen ham veriden çek (eventler/raw.js)
    let imageUrl = null;
    if (client.rawModals && client.rawModals.has(interaction.id)) {
      const rawData = client.rawModals.get(interaction.id);
      if (rawData.data?.resolved?.attachments) {
        const at = Object.values(rawData.data.resolved.attachments)[0];
        if (at && at.url) imageUrl = at.url;
      }
      client.rawModals.delete(interaction.id); // Temizle
    }

    // Log Kanalına Container V2 Gönderimi
    const logContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${emoji("uyari")} Hata / Şikayet Bildirimi`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${emoji("profil")} Bildiren:** <@${interaction.user.id}> (${interaction.user.id})\n**${emoji("pano")}Açıklama:**\n\`\`\` ${aciklama} \`\`\``,
        ),
      );

    if (imageUrl) {
      logContainer
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl),
          ),
        );
    }

    await logKanal.send({
      flags: MessageFlags.IsComponentsV2,
      components: [logContainer],
    });

    const successContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji("onay")} **Hata bildiriminiz yetkililere iletildi.** Desteğiniz için teşekkürler!`,
      ),
    );

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [successContainer],
    });
  },
};
