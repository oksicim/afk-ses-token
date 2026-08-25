const { hatalitokenSayfaOlustur } = require("./hatalitoken-gor-buton");

module.exports = {
  name: "ht_sayfa_",
  async execute(interaction, client) {
    const rest = interaction.customId.replace("ht_sayfa_", "");
    const parts = rest.split("_");
    const userId = parts.pop();
    const sayfaNo = parseInt(parts.pop());
    const payload = await hatalitokenSayfaOlustur(sayfaNo, userId);
    return interaction.update(payload);
  },
};
