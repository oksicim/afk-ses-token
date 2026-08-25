const { ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { emoji } = require("../utils/emojiler");

// Aktarım modunda AÇIK olan panelin HER ekranında (sunucu listesi, hesap
// listesi, sayfalama, geri dönüşler...) aynı hatırlatıcı üstte görünür —
// kullanıcı hangi ekranda olursa olsun kimin için token seçtiğini unutmasın.
function aktarBanner(hedefUserId) {
  return new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${emoji("marka")} Token Aktar — <@${hedefUserId}>'a\n` +
          "Sunucu ve hesap seç, sonra **Hesapları Aktar** butonuna bas.",
      ),
    );
}

module.exports = { aktarBanner };
