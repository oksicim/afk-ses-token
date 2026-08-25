const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { ownerId } = require("../config");
const { guncellemeContainer } = require("../utils/guncelleme-icerik");
const panelSahipleri = require("./panel-sahipleri");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "guncelleme_yayinla_",
  async execute(interaction, client) {
    // panel-sahipleri zaten mesaj sahibini kilitliyor ama duyuru geri
    // alınamadığı için owner kontrolünü burada da yapıyoruz.
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: `${emoji("hata")} Bu butonu sadece owner kullanabilir.`,
        ephemeral: true,
      });
    }

    // guncelleme_yayinla_{hedefKanalId}_{onizlemeMsgId}
    const [kanalId, onizlemeId] = interaction.customId
      .replace("guncelleme_yayinla_", "")
      .split("_");
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (!kanal || !kanal.isTextBased()) {
      return interaction.reply({
        content: `${emoji("hata")} Hedef kanal bulunamadı.`,
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    let gonderildi;
    try {
      gonderildi = await kanal.send({
        flags: MessageFlags.IsComponentsV2,
        components: [guncellemeContainer()],
        // @everyone'ı bot ATMAZ — pingi kendin, ayrı bir mesajla atarsın.
        // Kaza ile 4000 kişiye bildirim gitmesin diye bilerek kapalı.
        allowedMentions: { parse: [] },
      });
    } catch (e) {
      return interaction.followUp({
        content: `${emoji("hata")} Gönderilemedi: ${e?.message || e}`,
        ephemeral: true,
      });
    }

    panelSahipleri.delete(interaction.message.id);

    // Önizleme kopyasını sil — kanalda duyurunun ikinci bir nüshası kalmasın.
    await interaction.channel.messages
      .fetch(onizlemeId)
      .then((m) => m.delete())
      .catch(() => {});

    // Kontrol panelini sonuç bilgisine çevir.
    const sonuc = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji("basarili")} **Duyuru yayınlandı** → <#${kanal.id}>\n` +
          `-# [Mesaja git](${gonderildi.url})`,
      ),
    );
    await interaction
      .editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [sonuc],
      })
      .catch(() => {});
  },
};
