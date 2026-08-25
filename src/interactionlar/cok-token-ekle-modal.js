const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { tokenParmakIzi } = require("../utils/crypto-helper");
const { selfbotBaslat } = require("../utils/selfbot-manager");
const { kullaniciBilgi } = require("../utils/sinir-kontrol");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "modal_cok_token",
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const tokenSatirlari = interaction.fields
      .getTextInputValue("tokenlar_input")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const kanalSatirlari = interaction.fields
      .getTextInputValue("kanallar_input")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (tokenSatirlari.length !== kanalSatirlari.length) {
      return interaction.editReply({
        content: `${emoji("hata")} Token sayısı (${tokenSatirlari.length}) ile Kanal ID sayısı (${kanalSatirlari.length}) eşleşmiyor!`,
      });
    }

    const bilgi = await kullaniciBilgi(interaction.member, interaction.guildId);

    if (bilgi.sinir !== null && !bilgi.rolVar) {
      return interaction.editReply({
        content:
          `${emoji("hata")} Gerekli role veya booster rolüne sahip değilsin!`,
      });
    }

    if (bilgi.sinir !== null && bilgi.kalanHak <= 0) {
      return interaction.editReply({
        content: `${emoji("hata")} Token sınırına ulaştın! (Sınır: \`${bilgi.sinir}\` | Aktif: \`${bilgi.aktifSayi}\`)`,
      });
    }

    let eklendi = 0;
    let zatenVar = 0;
    let hata = 0;
    let sinirAsimi = 0;

    /**
     * Mükerrer kontrolü — TEK indeksli sorgu.
     *
     * Eskiden burada `Token.find({})` ile TÜM koleksiyon belleğe alınıp her
     * belge tek tek decrypt ediliyordu. 4000 tokenlik bir kurulumda tek bir
     * toplu ekleme 4000 AES çözme + tüm tokenlerin belleğe kopyalanması
     * demekti. Artık sadece YAPIŞTIRILAN tokenlerin parmak izleri sorgulanıyor.
     */
    const parmakIzleri = tokenSatirlari.map((t) => tokenParmakIzi(t));
    const mevcutKayitlar = await Token.find(
      { tokenHash: { $in: parmakIzleri } },
      { tokenHash: 1 },
    ).lean();
    const mevcutHashSet = new Set(mevcutKayitlar.map((k) => k.tokenHash));

    // Aynı mesajda aynı token iki kez yapıştırılmış olabilir; ikincisi
    // "zaten var" sayılmalı, yoksa benzersizlik indeksi hata fırlatırdı.
    const buSeferEklenen = new Set();

    /**
     * Aktif token sayısı döngü İÇİNDE değil, bir kez okunuyor.
     *
     * Eskiden her tur `countDocuments` çağrılıyordu — 50 tokenlik bir
     * yapıştırmada 50 ayrı sayım sorgusu. Sayaç yerelde artırılıyor; tek
     * kullanıcının kendi eklemesi olduğu için değer doğru kalıyor.
     */
    let aktifSayac = bilgi.aktifSayi ?? 0;

    for (let i = 0; i < tokenSatirlari.length; i++) {
      const token = tokenSatirlari[i];
      const kanalId = kanalSatirlari[i];

      if (bilgi.sinir !== null && aktifSayac >= bilgi.sinir) {
        sinirAsimi += tokenSatirlari.length - i;
        break;
      }

      try {
        const izi = parmakIzleri[i];
        if (mevcutHashSet.has(izi) || buSeferEklenen.has(izi)) {
          zatenVar++;
          continue;
        }
        buSeferEklenen.add(izi);

        const yeniToken = await Token.create({
          userId: interaction.user.id,
          guildId: interaction.guildId,
          token,
          kanalId,
        });
        selfbotBaslat(yeniToken.token, kanalId);
        eklendi++;
        aktifSayac++;
      } catch (err) {
        console.error(`[CokToken] Hata (${i + 1}. token):`, err.message);
        hata++;
      }
    }

    let sonuc =
      `${emoji("basarili")} **Toplu Token Ekleme Tamamlandı**\n` +
      `${emoji("onay")} **Eklendi:** ${eklendi}\n` +
      `${emoji("uyari")} **Zaten Var:** ${zatenVar}\n` +
      `${emoji("hata")} **Hata:** ${hata}`;

    if (sinirAsimi > 0) {
      sonuc += `\n${emoji("engelli")} **Sınır Aşımı:** ${sinirAsimi} token eklenemedi (limit dolu)`;
    }

    if (eklendi > 0) {
      tokenLogGonder(client, interaction.guildId, {
        tur: "eklendi",
        kullanici: interaction.user.id,
        adet: eklendi,
      });
    }

    const c = new ContainerBuilder()
      .setAccentColor(0x57f287)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(sonuc));

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
  },
};
