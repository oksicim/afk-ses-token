const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const panelSahipleri = require("../interactionlar/panel-sahipleri");
const aktarHedefMap = require("../utils/token-aktar-hedef");
const { aktarBanner } = require("../utils/token-aktar-banner");
const { anaMenuOlustur } = require("../utils/tokenkontrol-sayfa");

module.exports = {
  name: "tokenaktar",
  async execute(message, args) {
    const hataGoster = (metin) => {
      const c = new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(metin));
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
    };

    const hamArg = args && args[0];
    if (!hamArg) {
      return hataGoster(
        "❌ **Kullanım:** `.tokenaktar <kullanıcı>`\nTokenlerini devretmek istediğin kullanıcıyı mention'la veya ID'sini yaz.",
      );
    }

    const hedefUserId = hamArg.replace(/[<@!>]/g, "");
    if (hedefUserId === message.author.id) {
      return hataGoster("❌ **Kendine token aktaramazsın.**");
    }

    const hedefMember = await message.guild.members.fetch(hedefUserId).catch(() => null);
    if (!hedefMember) {
      return hataGoster("❌ **Kullanıcı bu sunucuda bulunamadı.**\nAktarım için alıcının bu sunucuda üye olması gerekiyor.");
    }
    if (hedefMember.user.bot) {
      return hataGoster("❌ **Bir bota token aktaramazsın.**");
    }

    const menuPayload = await anaMenuOlustur(message.client, message.author.id);
    menuPayload.components = [aktarBanner(hedefUserId), ...menuPayload.components];

    const msg = await message.channel.send(menuPayload);
    panelSahipleri.set(msg.id, message.author.id);
    aktarHedefMap.set(msg.id, hedefUserId);
  },
};
