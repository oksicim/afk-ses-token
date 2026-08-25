const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const {
  selfbotBilgi,
  durumAyarla,
  ozelDurumAyarla,
  rpcOzelAyarla,
} = require("../utils/selfbot-manager");
const {
  secilenMap,
  getFiltreliTokenler,
  sayfaOlustur,
} = require("../utils/tokenkontrol-sayfa");
const { geriButonu } = require("../utils/presence-panel");
const panelHedefMap = require("../utils/panel-hedef");
const { emoji } = require("../utils/emojiler");

function parseCustomId(id) {
  const rest = id.replace("tk_modal_presence_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  const kategori = parts.shift();
  const guildId = parts.join("_");
  return { kategori, guildId, sayfa, panelMsgId };
}

// Bir dosya (FileUpload) alanının seçilmiş değerini okur. Kullanıcı hiç dosya
// seçmediyse `undefined` döner (rpcOzelAyarla için "dokunma" anlamına gelir);
// bir dosya varsa URL'ini döner.
function dosyaUrlOku(interaction, customId) {
  const dosyalar = interaction.fields.getUploadedFiles(customId);
  return dosyalar && dosyalar.length ? dosyalar[0].url : undefined;
}

module.exports = {
  name: "tk_modal_presence_",
  async execute(interaction, client) {
    const { kategori, guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);

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
    const userId = panelHedefMap.has(panelMsgId) ? panelHedefMap.get(panelMsgId) : interaction.user.id;
    const tokenler = await getFiltreliTokenler(interaction.client, guildId, userId);
    const secilenTokenler = tokenler.filter((t) => secilenIds.includes(t._id.toString()));

    let islenen = 0;
    let ozet = "";

    if (kategori === "durum") {
      const durum = interaction.fields.getRadioGroup("presence_durum");
      const metin = interaction.fields.getTextInputValue("presence_metin") || "";
      const emoji = interaction.fields.getTextInputValue("presence_emoji") || "";
      for (const t of secilenTokenler) {
        if (durum) await durumAyarla(t.token, durum);
        await ozelDurumAyarla(t.token, metin, emoji);
        islenen++;
      }
      ozet = `${emoji("basarili")} **Durum & Özel Durum Güncellendi**\n**İşlenen:** ${islenen} hesap`;
    } else if (kategori === "bilgi") {
      const turDeger = interaction.fields.getRadioGroup("presence_tur");
      const tur = turDeger === "global" ? "" : turDeger || "";
      const isim = interaction.fields.getTextInputValue("presence_isim") || "";
      const detay = interaction.fields.getTextInputValue("presence_detay") || "";
      const state = interaction.fields.getTextInputValue("presence_state") || "";
      const url = interaction.fields.getTextInputValue("presence_url") || "";
      for (const t of secilenTokenler) {
        // Not: Hazır Oyun artık ayrı alanlarda yaşıyor (hazirOyunAyarla/Kaldir),
        // bu yüzden burada appId'ye hiç dokunmaya gerek yok.
        await rpcOzelAyarla(t.token, { tur, isim, detay, durum: state, url });
        islenen++;
      }
      ozet = `${emoji("basarili")} **Aktivite Bilgisi Güncellendi**\n**İşlenen:** ${islenen} hesap`;
    } else if (kategori === "gorsel") {
      const buyukUrl = dosyaUrlOku(interaction, "presence_buyuk"); // undefined => dokunma
      const kucukUrl = dosyaUrlOku(interaction, "presence_kucuk"); // undefined => dokunma
      const buyukYazi = interaction.fields.getTextInputValue("presence_buyuk_yazi") || "";
      const kucukYazi = interaction.fields.getTextInputValue("presence_kucuk_yazi") || "";
      for (const t of secilenTokenler) {
        await rpcOzelAyarla(t.token, {
          buyukResim: buyukUrl,
          kucukResim: kucukUrl,
          buyukResimYazi: buyukYazi,
          kucukResimYazi: kucukYazi,
        });
        islenen++;
      }
      const guncellenenler = [
        buyukUrl !== undefined ? "büyük" : null,
        kucukUrl !== undefined ? "küçük" : null,
      ].filter(Boolean);
      ozet = `${emoji("basarili")} **Görseller Güncellendi**\n**İşlenen:** ${islenen} hesap`;
      if (guncellenenler.length > 0) {
        ozet += `\n**Yüklenen resim:** ${guncellenenler.join(" ve ")}`;
      }
    } else if (kategori === "buton") {
      const buton1Ad = interaction.fields.getTextInputValue("presence_buton1_ad") || "";
      const buton1Url = interaction.fields.getTextInputValue("presence_buton1_url") || "";
      const buton2Ad = interaction.fields.getTextInputValue("presence_buton2_ad") || "";
      const buton2Url = interaction.fields.getTextInputValue("presence_buton2_url") || "";
      for (const t of secilenTokenler) {
        await rpcOzelAyarla(t.token, { buton1Ad, buton1Url, buton2Ad, buton2Url });
        islenen++;
      }
      ozet = `${emoji("basarili")} **Butonlar Güncellendi**\n**İşlenen:** ${islenen} hesap`;
    } else {
      const hataContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent("❌ Geçersiz kategori."),
      );
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [hataContainer],
      });
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
