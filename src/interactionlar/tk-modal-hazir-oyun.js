const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotBilgi, hazirOyunAyarla, hazirOyunKaldir } = require("../utils/selfbot-manager");
const { oyunBul, ikonUrl } = require("../utils/oyun-listesi");
const {
  secilenMap,
  getFiltreliTokenler,
  sayfaOlustur,
} = require("../utils/tokenkontrol-sayfa");
const { geriButonu } = require("../utils/presence-panel");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

function parseCustomId(id) {
  const rest = id.replace("tk_modal_hazir_oyun_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  const guildId = parts.join("_");
  return { guildId, sayfa, panelMsgId };
}

// 4 bloktan (her biri opsiyonel, en fazla 1 seçim) ilk dolu olanın değerini
// döner — kullanıcı sadece BİRİNDEN seçim yapar, diğerleri boş kalır.
function secilenAppIdBul(interaction) {
  for (let blok = 0; blok < 4; blok++) {
    const degerler = interaction.fields.getStringSelectValues(`hazir_oyun_blok_${blok}`);
    if (degerler && degerler.length) return degerler[0];
  }
  return null;
}

module.exports = {
  name: "tk_modal_hazir_oyun_",
  async execute(interaction, client) {
    const { guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);
    const secilenIds = [...(secilenMap.get(panelMsgId) || [])];
    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    const kaldir = interaction.fields.getCheckbox("hazir_oyun_kaldir");
    const appId = kaldir ? null : secilenAppIdBul(interaction);

    if (!kaldir && !appId) {
      // Ne bir oyun seçilmiş ne de "Oyunu Kaldır" işaretlenmiş → yapacak bir şey yok.
      await interaction.deferUpdate();
      const sonucContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji("hata")} Hiçbir oyun seçmedin ve **Oyunu Kaldır**'ı da işaretlemedin — değişiklik yapılmadı.`,
          ),
        )
        .addActionRowComponents(geriButonu(`${guildId}_${sayfa}_${panelMsgId}`));
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [sonucContainer],
      });
    }

    let oyun = null;
    if (!kaldir) {
      oyun = await oyunBul(appId);
      if (!oyun) {
        return interaction.reply({
          content: `${emoji("hata")} Oyun bulunamadı, tekrar dene.`,
          ephemeral: true,
        });
      }
    }

    // Modal, kategori mesajındaki bir select'ten açıldığı için `deferUpdate`
    // AYNI ephemeral mesajı düzenler — yeni mesaj atmaz.
    await interaction.deferUpdate();
    const userId = panelHedefMap.has(panelMsgId) ? panelHedefMap.get(panelMsgId) : interaction.user.id;
    const tokenler = await getFiltreliTokenler(interaction.client, guildId, userId);
    const secilenTokenler = tokenler.filter((t) => secilenIds.includes(t._id.toString()));

    let islenen = 0;
    let ozet;

    if (kaldir) {
      for (const t of secilenTokenler) {
        // Sadece hazırOyun alanlarını temizler — kullanıcının kendi rpcOzel
        // aktivitesine (varsa) hiç dokunmaz, bu yüzden hesap oyunun altında
        // kaybolmuş olan KENDİ aktivitesine döner (yoksa zaten global'e düşer).
        const r = await hazirOyunKaldir(t.token);
        if (r.ok) islenen++;
      }
      ozet =
        `${emoji("basarili")} **Oyun Kaldırıldı**\n` +
        `**İşlenen:** ${islenen} hesap — kendi ayarladığın aktivite varsa ona, yoksa global aktiviteye döndü.\n` +
        `-# Spotify açıksa dinlemeye devam eder, ona dokunulmadı.`;
    } else {
      const ikon = ikonUrl(oyun) || "";
      for (const t of secilenTokenler) {
        // Not: Spotify'a dokunulmaz, kullanıcının kendi rpcOzel aktivitesine de
        // dokunulmaz — hazırOyun tamamen ayrı bir alan.
        await hazirOyunAyarla(t.token, { appId: oyun.id, isim: oyun.name, ikon });
        islenen++;
      }
      ozet =
        `${emoji("basarili")} **Oyun Ayarlandı: ${oyun.name}**\n` +
        `**İşlenen:** ${islenen} hesap — artık "${oyun.name} oynuyor" görünecek.`;
    }

    const v = selfbotBilgi(
      (await Token.findById(secilenIds[0]).catch(() => null))?.token,
    );
    const donusGuild = v && v.guildId ? v.guildId : guildId;

    const panelMsg = await interaction.channel.messages.fetch(panelMsgId).catch(() => null);
    if (panelMsg) {
      await panelMsg
        .edit(await sayfaOlustur(client, donusGuild, sayfa, secilenIds, userId, panelMsgId))
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
