const demoMesajlar = require("../utils/panel-demo-store");

module.exports = {
  // `paneldemo_` ile başlayan tüm buton customId'lerini yakalar (prefix eşleşme).
  name: "paneldemo_",
  async execute(interaction) {
    const mesaj = demoMesajlar.get(interaction.message.id);

    if (!mesaj) {
      return interaction
        .reply({
          content:
            "⚠️ Bu demo panelinin mesajı bulunamadı (bot yeniden başlamış olabilir). Paneli `.panel-demo` ile tekrar oluştur.",
          ephemeral: true,
        })
        .catch(() => {});
    }

    return interaction
      .reply({
        content: mesaj,
        // Sadece butona basan kişi görür (ephemeral).
        ephemeral: true,
        // Metinde etiket olsa bile kimse pinglenmesin.
        allowedMentions: { parse: [] },
      })
      .catch(() => {});
  },
};
