const { prefix } = require("../config");
const { sihirbazMesajiIsle } = require("../utils/emoji-sihirbaz");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message, client) {
    if (message.author.bot) return;

    // Emoji sihirbazı AÇIKSA mesaj önce ona gider: sahip emojiyi düz
    // gönderiyor, yani prefix'siz. Sihirbaz mesajı tükettiyse (emoji ya da
    // "atla"/"iptal") komut yönlendiricisine hiç düşmez.
    try {
      if (await sihirbazMesajiIsle(message)) return;
    } catch (err) {
      console.error("[EmojiSihirbaz] Mesaj işlenemedi:", err?.message || err);
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const komutAdi = args.shift().toLowerCase();

    const komut = client.komutlar.get(komutAdi);
    if (!komut) return;

    // Not: Açılışta komut kilidi YOKTUR. Tokenler arka planda yüklenirken bot
    // normal çalışır; yüklenmiş hesaplar hemen yönetilebilir. Henüz sırası
    // gelmemiş bir hesap seçilirse panel sadece O hesap için "başlatılıyor"
    // gösterir ve o hesabı kuyruğun başına alır (bkz. utils/token-kuyrugu.js).
    try {
      await komut.execute(message, args);
    } catch (err) {
      console.error(`[Komut Hatası] ${komutAdi}:`, err);
      message.channel.send("❌ Komut çalıştırılırken hata oluştu.");
    }
  },
};
