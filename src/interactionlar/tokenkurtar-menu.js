const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotBaslat } = require("../utils/selfbot-manager");
const { kullaniciBilgi } = require("../utils/sinir-kontrol");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tokenkurtar_sec_",
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const userId = interaction.customId.replace("tokenkurtar_sec_", "");

    // Kota/rol kontrolü hep HEDEF kullanıcının kendi üyeliğine göre yapılır
    // (owner başkası adına kurtarıyor olabilir, bkz. komutlar/tokenkurtar.js).
    let hedefMember = interaction.member;
    if (userId !== interaction.user.id) {
      hedefMember = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!hedefMember) {
        return interaction.followUp({
          content: `${emoji("hata")} Kullanıcı bu sunucuda bulunamadı.`,
          ephemeral: true,
        });
      }
    }

    const bilgi = await kullaniciBilgi(hedefMember, interaction.guildId);

    if (!bilgi.rolVar || bilgi.kalanHak <= 0) {
      return interaction.followUp({
        content:
          `${emoji("hata")} Token kurtarma hakkı kalmadı veya gerekli role sahip değil.`,
        ephemeral: true,
      });
    }

    const secilen = interaction.values;
    const kurtarilacak = secilen.slice(0, bilgi.kalanHak);

    let basarili = 0;
    let hata = 0;

    for (const tokenId of kurtarilacak) {
      try {
        const tokenDoc = await Token.findById(tokenId);
        if (!tokenDoc || tokenDoc.userId !== userId) continue;

        tokenDoc.askida = false;
        await tokenDoc.save();
        await selfbotBaslat(
          tokenDoc.token,
          tokenDoc.kanalId,
          tokenDoc.selfMute,
          tokenDoc.selfDeaf,
        );
        basarili++;
      } catch (err) {
        console.error("[TokenKurtar] Hata:", err.message);
        hata++;
      }
    }

    const renk = hata > 0 ? 0xfee75c : 0x57f287;

    if (basarili > 0) {
      tokenLogGonder(client, interaction.guildId, {
        tur: "kurtarildi",
        kullanici: userId,
        adet: basarili,
      });
    }
    const c = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("basarili")} **Token Kurtarma Tamamlandı**\n${emoji("onay")} **Kurtarılan:** ${basarili}\n${hata > 0 ? `${emoji("hata")} **Hata:** ${hata}` : ""}`,
        ),
      );

    await interaction.message.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
