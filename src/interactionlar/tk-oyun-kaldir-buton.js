const Token = require("../models/Token");
const { selfbotBilgi, rpcOzelAyarla } = require("../utils/selfbot-manager");
const { emoji } = require("../utils/emojiler");
const {
  secilenMap,
  getFiltreliTokenler,
  sayfaOlustur,
} = require("../utils/tokenkontrol-sayfa");

function parseCustomId(id) {
  const rest = id.replace("tk_oyun_kaldir_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  const guildId = parts.join("_");
  return { guildId, sayfa, panelMsgId };
}

module.exports = {
  name: "tk_oyun_kaldir_",
  async execute(interaction, client) {
    const { guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);

    const secilenIds = [...(secilenMap.get(panelMsgId) || [])];
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
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

    let islenen = 0;
    for (const t of secilenTokenler) {
      // Oyunu tamamen bırak: appId'nin yanında oyundan gelen isim/tür/ikonu da
      // temizle — sadece appId silinseydi hesap oyunun adını düz aktivite
      // olarak göstermeye devam ederdi. Boş değerler global aktiviteye düşer.
      const r = await rpcOzelAyarla(t.token, {
        appId: "",
        isim: "",
        tur: "",
        buyukResim: "",
        buyukResimYazi: "",
      });
      if (r.ok) islenen++;
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
        `${emoji("basarili")} **Oyun Kaldırıldı**\n` +
        `**İşlenen:** ${islenen} hesap — hesaplar global aktiviteye döndü.\n` +
        `-# Spotify açıksa dinlemeye devam eder, ona dokunulmadı.`,
    });
  },
};
