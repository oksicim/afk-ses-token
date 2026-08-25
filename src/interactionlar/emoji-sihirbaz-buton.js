const { atla, bitir } = require("../utils/emoji-sihirbaz");

/**
 * Sihirbaz butonları. `emw_` ile başlayan tüm customId'leri yakalar
 * (interactionCreate önek eşleşmesi yapıyor).
 *
 * ⚠️ Oturum KANAL + KULLANICI çiftine bağlı. Oturumu olmayan biri tıklarsa
 * `atla`/`bitir` false döner; o durumda etkileşimi CEVAPSIZ bırakmamak
 * gerekiyor, yoksa Discord "Bu etkileşim başarısız oldu" gösterir.
 */
module.exports = {
  name: "emw_",
  async execute(interaction) {
    const islendi =
      interaction.customId === "emw_atla"
        ? await atla(interaction)
        : interaction.customId === "emw_bitir"
          ? await bitir(interaction)
          : false;

    if (!islendi && interaction.isRepliable()) {
      await interaction
        .reply({
          content: "❌ Bu sihirbaz oturumu artık açık değil. `.emojikurmavakti` ile yeniden başlat.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  },
};
