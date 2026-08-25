const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const {
  selfbotBilgi,
  spotifyAyarla,
  spotifyKapat,
} = require("../utils/selfbot-manager");
const { playlistGetir, apiAktif, EMBED_SINIR } = require("../utils/spotify-listesi");
const {
  secilenMap,
  getFiltreliTokenler,
  sayfaOlustur,
} = require("../utils/tokenkontrol-sayfa");
const { geriButonu } = require("../utils/presence-panel");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

function parseCustomId(id) {
  const rest = id.replace("tk_modal_spotify_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  const guildId = parts.join("_");
  return { guildId, sayfa, panelMsgId };
}

module.exports = {
  name: "tk_modal_spotify_",
  async execute(interaction, client) {
    const { guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);
    const kapat = interaction.fields.getCheckbox("spotify_kapat");
    // Kutu işaretliyse link tamamen yok sayılır (hazır oyundaki "Oyunu Kaldır"
    // ile aynı davranış) — alan mevcut playlist ile dolu geldiği için kullanıcı
    // linki silmeden de kapatabilsin.
    const url = kapat ? "" : interaction.fields.getTextInputValue("spotify_url").trim();

    const secilenIds = [...(secilenMap.get(panelMsgId) || [])];
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    // Modal, kategori mesajındaki bir select'ten açıldığı için `deferUpdate`
    // AYNI ephemeral mesajı düzenler — yeni mesaj atmaz.
    await interaction.deferUpdate();

    if (!kapat && !url) {
      // Ne link yazılmış ne de "Spotify'ı Kapat" işaretlenmiş → yapacak bir şey yok.
      const bosContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji("hata")} Link yazmadın ve **Spotify'ı Kapat**'ı da işaretlemedin — değişiklik yapılmadı.`,
          ),
        )
        .addActionRowComponents(geriButonu(`${guildId}_${sayfa}_${panelMsgId}`));
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [bosContainer],
      });
    }

    const userId = panelHedefMap.has(panelMsgId) ? panelHedefMap.get(panelMsgId) : interaction.user.id;
    const tokenler = await getFiltreliTokenler(
      interaction.client,
      guildId,
      userId,
    );
    const secilenTokenler = tokenler.filter((t) =>
      secilenIds.includes(t._id.toString()),
    );

    let ozet;

    if (kapat) {
      let islenen = 0;
      for (const t of secilenTokenler) {
        const r = await spotifyKapat(t.token);
        if (r.ok) islenen++;
      }
      ozet =
        `${emoji("basarili")} **Spotify Kapatıldı**\n` +
        `**İşlenen:** ${islenen} hesap — hesaplar normal aktivitesine döndü.`;
    } else {
      // Playlist'i bir kez çekip doğrula (hepsi aynı playlist'i kullanacağı için
      // cache sayesinde hesap başına tekrar istek atılmaz).
      let p;
      try {
        p = await playlistGetir(url);
      } catch (e) {
        const hataContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${emoji("hata")} **Playlist alınamadı:** ${e?.message || e}\n` +
                "-# Bağlantının `https://open.spotify.com/playlist/...` biçiminde ve playlist'in **herkese açık** olduğundan emin ol.",
            ),
          )
          .addActionRowComponents(geriButonu(`${guildId}_${sayfa}_${panelMsgId}`));
        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [hataContainer],
        });
      }

      let islenen = 0;
      let basarisiz = 0;
      for (const t of secilenTokenler) {
        const r = await spotifyAyarla(t.token, url);
        if (r.ok) islenen++;
        else basarisiz++;
      }

      ozet =
        `${emoji("basarili")} **Spotify Dinleniyor: ${p.ad}**\n` +
        `**İşlenen:** ${islenen} hesap — \`${p.parcalar.length}\` şarkı sırayla çalınacak.\n` +
        (basarisiz ? `**Atlanan:** ${basarisiz} hesap (aktif değil)\n` : "") +
        `-# Her hesap **rastgele bir şarkıdan** başlar ve şarkı bitince sıradakine geçer.`;

      if (p.kesildi) {
        ozet +=
          `\n-# ${emoji("uyari")} Playlist'in **ilk ${EMBED_SINIR} şarkısı** alındı` +
          (apiAktif()
            ? "."
            : " (anahtarsız yöntemin sınırı). Tamamı için config'e Spotify anahtarı ekleyebilirsin.");
      }
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
            userId,
            panelMsgId,
          ),
        )
        .catch(() => {});
    }

    const sonucContainer = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(ozet))
      .addActionRowComponents(geriButonu(`${guildId}_${sayfa}_${panelMsgId}`));

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [sonucContainer],
    });
  },
};
