const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { renk, ownerId } = require("../config");
const panelSahipleri = require("../interactionlar/panel-sahipleri");
const panelHedefMap = require("../utils/panel-hedef");
const { anaMenuOlustur } = require("../utils/tokenkontrol-sayfa");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tokenkontrol",
  async execute(message, args) {
    // Owner bir kullanıcıyı hedef gösterebilir: ID, @mention (<@id>/<@!id>)
    // veya "all"/"hepsi" (tüm kullanıcılar). Mention biçimi temizlenmezse
    // (`<@123...>` ham haliyle DB'de aranırsa) hiç sonuç bulunamıyordu.
    const hamArg =
      message.author.id === ownerId && args && args[0] ? args[0] : null;
    const hedefUserId = hamArg ? hamArg.replace(/[<@!>]/g, "") : null;
    const hepsiMi = hedefUserId === "all" || hedefUserId === "hepsi";
    const userId = hepsiMi ? null : hedefUserId || message.author.id;

    const yukleniyorContainer = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          hedefUserId && !hepsiMi
            ? `${emoji("indir")} **<@${hedefUserId}> kullanıcısının tokenleri aranıyor...**\nLütfen bekleyin.`
            : `${emoji("indir")} **Tokenleriniz Aranıyor...**\nLütfen bekleyin.`,
        ),
      );

    const yukleniyorMesaj = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [yukleniyorContainer],
    });
    panelSahipleri.set(yukleniyorMesaj.id, message.author.id);
    // Bu panelde bundan sonraki HER tıklama (sunucu seç, sayfala, mic/deaf,
    // ayarlar...) `interaction.user.id` olarak owner'ı verir — gerçek hedef
    // (ya da "hepsi" modunda null) burada kaydedilmezse panel owner'ın kendi
    // (çoğu zaman boş) tokenlerine döner.
    panelHedefMap.set(yukleniyorMesaj.id, userId);

    const payload = await anaMenuOlustur(message.client, userId);
    await yukleniyorMesaj.edit(payload);
  },
};
