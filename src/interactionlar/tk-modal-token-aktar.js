const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const Token = require("../models/Token");
const { kullaniciBilgi } = require("../utils/sinir-kontrol");
const { secilenMap, sayfaOlustur } = require("../utils/tokenkontrol-sayfa");
const aktarHedefMap = require("../utils/token-aktar-hedef");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

function parseCustomId(id) {
  const rest = id.replace("tk_modal_token_aktar_", "");
  const lastUnd = rest.lastIndexOf("_");
  const guildId = rest.substring(0, lastUnd);
  const sayfa = parseInt(rest.substring(lastUnd + 1));
  return { guildId, sayfa };
}

module.exports = {
  name: "tk_modal_token_aktar_",
  async execute(interaction, client) {
    const { guildId, sayfa } = parseCustomId(interaction.customId);
    const msgId = interaction.message?.id;
    const onay = interaction.fields.getRadioGroup("token_aktar_onay");
    const secilenIds = [...(secilenMap.get(msgId) || [])];
    const hedefUserId = aktarHedefMap.get(msgId);

    if (onay !== "evet") {
      return interaction.reply({
        content: `${emoji("hata")} Aktarım iptal edildi.`,
        ephemeral: true,
      });
    }

    if (!hedefUserId) {
      return interaction.reply({
        content: `${emoji("hata")} Aktarım bilgisi bulunamadı. \`.tokenaktar <kullanıcı>\` ile tekrar başlat.`,
        ephemeral: true,
      });
    }

    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    const hedefMember = await interaction.guild.members.fetch(hedefUserId).catch(() => null);
    if (!hedefMember) {
      return interaction.followUp({
        content: `${emoji("hata")} <@${hedefUserId}> bu sunucuda bulunamadı, aktarım yapılamadı.`,
        ephemeral: true,
      });
    }

    // Alıcının kalan hakkı, aktarılacak hesap sayısına yetmiyorsa aktarım
    // tamamen reddedilir (kullanıcının tercihi: kısmi aktarım / askıya alma yok).
    const bilgi = await kullaniciBilgi(hedefMember, interaction.guildId);
    // `sinir === null` → sistem hiç yapılandırılmamış (`.setup` ile rol/paket
    // ayarlanmamış) demek, yani limit YOK — bu durumda aktarım SERBEST.
    // Sadece sistem yapılandırılmış AMA alıcı gerekli role sahip değilse (`rolVar: false`) engellenir.
    if (!bilgi.rolVar) {
      return interaction.followUp({
        content: `${emoji("hata")} **Aktarım engellendi:** <@${hedefUserId}> gerekli role veya pakete sahip değil.`,
        ephemeral: true,
      });
    }
    if (bilgi.sinir !== null && secilenIds.length > bilgi.kalanHak) {
      return interaction.followUp({
        content:
          `${emoji("hata")} **Aktarım engellendi:** <@${hedefUserId}>'ın kalan hakkı yetersiz ` +
          `(\`${bilgi.kalanHak}\`/\`${bilgi.sinir}\`), \`${secilenIds.length}\` hesap aktarılmaya çalışıldı.`,
        ephemeral: true,
      });
    }

    // Not: askida/kapatildi bayraklarına dokunulmaz — devredilen hesap askıdaysa
    // alıcı kendi `.tokenkurtar`'ı ile, kapalıysa Kapat/Aç butonuyla açabilir.
    let aktarilan = 0;
    for (const tokenId of secilenIds) {
      const r = await Token.updateOne({ _id: tokenId }, { $set: { userId: hedefUserId } });
      if (r.modifiedCount) aktarilan++;
    }

    secilenMap.delete(msgId);
    aktarHedefMap.delete(msgId);

    if (aktarilan > 0) {
      tokenLogGonder(client, interaction.guildId, {
        tur: "aktarildi",
        kullanici: hedefUserId,
        adet: aktarilan,
      });
    }

    // Panel artık devredilmiş hesapları göstermemeli — yerinde yenile (seçim
    // sıfırlanmış olarak; devredilenler bu görünümden zaten kaybolacak).
    await interaction.editReply(
      await sayfaOlustur(client, guildId, sayfa, [], interaction.user.id, msgId),
    );

    return interaction
      .followUp({
        content: `${emoji("basarili")} **Aktarım Tamamlandı**\n**${aktarilan}** hesap <@${hedefUserId}>'a devredildi.`,
        ephemeral: true,
      })
      .catch(() => {});
  },
};
