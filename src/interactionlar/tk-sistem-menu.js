const { secilenMap, sayfaOlustur } = require("../utils/tokenkontrol-sayfa");
const panelHedefMap = require("../utils/panel-hedef");

module.exports = {
  name: "tk_sistem",
  async execute(interaction, client) {
    const secenek = interaction.values[0];
    if (secenek === "bulk") {
      const msgId = interaction.message?.id;
      const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;
      if (msgId) secilenMap.delete(msgId);
      return interaction.update(
        await sayfaOlustur(client, "bulk", 0, [], userId, msgId),
      );
    }

    if (secenek === "hataBildir") {
      const { Routes } = require("discord.js");
      await interaction.client.rest.post(
        Routes.interactionCallback(interaction.id, interaction.token),
        {
          body: {
            type: 9,
            data: {
              custom_id: "hata_bildir_modal",
              title: "Hata Bildir!",
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 4, // Text Input
                      custom_id: "hata_aciklama",
                      label: "Hata / Şikayet Detayı",
                      style: 2, // Paragraph
                      required: true,
                      min_length: 5,
                      max_length: 1000,
                      placeholder: "Karşılaştığınız hatayı detaylıca anlatın..."
                    }
                  ]
                },
                {
                  type: 18, // Label
                  label: "imagebuilder",
                  description: "Varsa, hatayı gösteren bir ekran görüntüsü yükleyin.",
                  component: {
                    type: 19, // File Upload
                    custom_id: "hata_gorsel",
                    min_values: 0,
                    max_values: 1,
                    required: false
                  }
                }
              ]
            }
          }
        }
      );
      return;
    }
  },
};
