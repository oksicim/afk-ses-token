const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { ownerId } = require("../config");
const { guncellemeContainer } = require("../utils/guncelleme-icerik");
const panelSahipleri = require("../interactionlar/panel-sahipleri");
const { emoji } = require("../utils/emojiler");

/**
 * Güncelleme duyurusunu ÖNCE önizler, ancak "Yayınla"ya basılınca gönderir.
 * Duyuru @everyone'a gittiği ve geri alınamadığı için doğrudan atmıyoruz.
 *
 * Kullanım:
 *   .guncellemeat          → önizler, onaylarsan BU kanala atar
 *   .guncellemeat #duyuru  → önizler, onaylarsan #duyuru kanalına atar
 *   .guncellemeat 12345    → kanal ID'si ile de olur
 */
module.exports = {
  name: "guncellemeat",
  async execute(message, args) {
    if (message.author.id !== ownerId) return;

    // Hedef kanal: etiket > ID > komutun yazıldığı kanal
    let hedef = message.mentions.channels.first() || null;
    if (!hedef && args[0] && /^[0-9]{17,20}$/.test(args[0])) {
      hedef = await message.client.channels.fetch(args[0]).catch(() => null);
      if (!hedef) {
        return message.reply(
          `${emoji("hata")} O ID'de bir kanal bulamadım.`,
        );
      }
    }
    if (!hedef) hedef = message.channel;

    if (!hedef.isTextBased() || !hedef.send) {
      return message.reply(
        `${emoji("hata")} Hedef bir yazı kanalı olmalı.`,
      );
    }

    // Duyuru ve kontrol paneli AYRI mesajlar: duyurunun kendisi zaten 35
    // komponent tutuyor, üstüne başlık+butonları eklersek Discord'un mesaj
    // başına 40 komponent sınırına dayanıyoruz (ölçtüm: tam 40/40). Ayırınca
    // hem sınırdan uzaklaşıyoruz hem de önizleme, yayınlanacak mesajın
    // BİREBİR kendisi oluyor — başlık kutusu görüntüyü bozmuyor.
    const onizleme = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [guncellemeContainer()],
      allowedMentions: { parse: [] },
    });

    const butonlar = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guncelleme_yayinla_${hedef.id}_${onizleme.id}`)
        .setLabel("Yayınla")
        .setEmoji("🚀")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`guncelleme_iptal_${onizleme.id}`)
        .setLabel("İptal")
        .setStyle(ButtonStyle.Secondary),
    );

    const baslik = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## 👀 Yukarısı önizleme — henüz kimseye gitmedi\n" +
          `**Yayınla**'ya basarsan <#${hedef.id}> kanalına aynen böyle gidecek.\n` +
          "-# Bu önizleme kimseye bildirim göndermedi. Bot @everyone atmaz — pingi sonra kendin atarsın.",
      ),
    );

    const kontrol = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [baslik, butonlar],
      allowedMentions: { parse: [] },
    });

    // Butonlara sadece komutu yazan (owner) dokunabilsin.
    panelSahipleri.set(kontrol.id, message.author.id);
  },
};
