module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    const id = interaction.customId;

    // Not: Açılışta etkileşim kilidi YOKTUR. Tokenler arka planda yüklenirken
    // tüm paneller çalışır; yalnızca henüz sırası gelmemiş hesabın kendi
    // kontrolleri pasif kalır (bkz. utils/token-kuyrugu.js).
    if (!id) return;

    const panelSahipleri = require("../interactionlar/panel-sahipleri");
    const msgId = interaction.message?.id;
    if (msgId && panelSahipleri.has(msgId)) {
      if (interaction.user.id !== panelSahipleri.get(msgId)) {
        if (interaction.isRepliable()) {
          return interaction.reply({
            content: "❌ **Bu paneli veya işlemi sadece komutu yazan kişi kullanabilir.**",
            ephemeral: true,
          }).catch(() => {});
        }
        return;
      }
    }


    let handler = client.interactionlar.get(id);

    if (!handler) {
      for (const [key, h] of client.interactionlar) {
        if (id.startsWith(key)) {
          handler = h;
          break;
        }
      }
    }

    if (handler) {
      try {
        await handler.execute(interaction, client);
      } catch (err) {
        console.error(`[Interaction Hatası] ${id}:`, err);
      }
    }
  },
};
