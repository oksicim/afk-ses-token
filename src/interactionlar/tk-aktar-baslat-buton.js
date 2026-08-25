const { ModalBuilder, LabelBuilder, RadioGroupBuilder } = require("discord.js");
const { secilenMap } = require("../utils/tokenkontrol-sayfa");
const aktarHedefMap = require("../utils/token-aktar-hedef");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tk_aktar_baslat_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const parts = id.replace("tk_aktar_baslat_", "").split("_");
    const guildId = parts[0];
    const sayfa = parseInt(parts[1]);
    const secilenIds = [...(secilenMap.get(msgId) || [])];

    const hedefUserId = aktarHedefMap.get(msgId);
    if (!hedefUserId) {
      return interaction.reply({
        content:
          `${emoji("hata")} Bu panel bir aktarım için açılmadı. \`.tokenaktar <kullanıcı>\` ile tekrar başlat.`,
        ephemeral: true,
      });
    }
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    const hedefUser = await client.users.fetch(hedefUserId).catch(() => null);
    const hedefAd = hedefUser ? hedefUser.globalName || hedefUser.username : hedefUserId;

    const modal = new ModalBuilder()
      .setCustomId(`tk_modal_token_aktar_${guildId}_${sayfa}`)
      .setTitle(`${secilenIds.length} Hesabı Aktar`)
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Emin misin?")
          .setDescription(
            `Seçtiğin ${secilenIds.length} hesap ${hedefAd} kullanıcısına kalıcı olarak devredilecek.`,
          )
          .setRadioGroupComponent(
            new RadioGroupBuilder()
              .setCustomId("token_aktar_onay")
              .addOptions(
                { label: "Evet, aktar", value: "evet" },
                { label: "Hayır, iptal et", value: "hayir", default: true },
              ),
          ),
      );

    return interaction.showModal(modal);
  },
};
