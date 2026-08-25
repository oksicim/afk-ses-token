const Token = require("../models/Token");
const { selfbotBilgi, rpcOzelAyarla } = require("../utils/selfbot-manager");
const { oyunBul, ikonUrl } = require("../utils/oyun-listesi");
const { emoji } = require("../utils/emojiler");
const {
  secilenMap,
  getFiltreliTokenler,
  sayfaOlustur,
} = require("../utils/tokenkontrol-sayfa");

function parseCustomId(id) {
  const rest = id.replace("tk_hazir_oyun_sec_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  parts.shift(); // blok numarası — menüleri benzersiz yapmak için, işlevsel değil
  const guildId = parts.join("_");
  return { guildId, sayfa, panelMsgId };
}

module.exports = {
  name: "tk_hazir_oyun_sec_",
  async execute(interaction, client) {
    const { guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);
    const appId = interaction.values?.[0];

    const secilenIds = [...(secilenMap.get(panelMsgId) || [])];
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    const oyun = await oyunBul(appId);
    if (!oyun) {
      return interaction.reply({
        content: `${emoji("hata")} Oyun bulunamadı, tekrar dene.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const tokenler = await getFiltreliTokenler(
      interaction.client,
      guildId,
      interaction.user.id,
    );
    const secilenTokenler = tokenler.filter((t) =>
      secilenIds.includes(t._id.toString()),
    );

    const ikon = ikonUrl(oyun) || "";
    let islenen = 0;
    for (const t of secilenTokenler) {
      // Not: Spotify'a dokunulmaz — hesap aynı anda hem oyun oynayıp hem
      // müzik dinliyor görünebilir (Discord'un normal davranışı).
      // Gerçek app ID + oyun adı + oyunun kendi ikonu → hesap "... oynuyor"
      // (logolu) görünür. Detay/state/URL/buton gibi global artıklar oyun
      // modunda otomatik devre dışı kalır (bkz. selfbot-manager rpcAyarla).
      await rpcOzelAyarla(t.token, {
        appId: oyun.id,
        isim: oyun.name,
        tur: "PLAYING",
        buyukResim: ikon,
      });
      islenen++;
    }

    const v = selfbotBilgi(
      (await Token.findById(secilenIds[0]).catch(() => null))?.token,
    );
    const donusGuild = v && v.guildId ? v.guildId : guildId;

    const panelMsg = await interaction.channel.messages
      .fetch(panelMsgId)
      .catch(() => null);
    if (panelMsg) {
      await panelMsg
        .edit(
          await sayfaOlustur(
            client,
            donusGuild,
            sayfa,
            secilenIds,
            interaction.user.id,
          ),
        )
        .catch(() => {});
    }

    return interaction.editReply({
      content:
        `${emoji("basarili")} **Oyun Ayarlandı: ${oyun.name}**\n` +
        `**İşlenen:** ${islenen} hesap — artık "${oyun.name} oynuyor" görünecek.`,
    });
  },
};
