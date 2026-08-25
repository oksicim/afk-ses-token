const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { ownerId, renk, prefix } = require("../config");
const Setup = require("../models/Setup");
const demoMesajlar = require("../utils/panel-demo-store");
const { emoji } = require("../utils/emojiler");
const { sinirlamaMetni } = require("../utils/sinir-listesi");

// Emoji CDN linkleri İMZASIZ (?ex/is/hm yok) — süresiz yaşarlar.
const gorsel = (id, uzanti = "gif") =>
  `https://cdn.discordapp.com/emojis/${id}.${uzanti}`;

const ayrac = () =>
  new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

const bolum = (metin, gorselUrl) =>
  new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(metin))
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(gorselUrl));

module.exports = {
  name: "to-demo",
  // .to-demo <mesaj>
  // Gerçek `token-ekle` panelinin BİREBİR AYNISINI atar; tek farkı butonlar
  // gerçek işlemi yapmaz, tıklayınca verdiğin <mesaj> ile cevap verir.
  async execute(message) {
    // Demo paneli de yalnızca yapılandırmadaki bot sahibi kullanabilir.
    if (message.author.id !== ownerId) return;

    // Komut kelimesinden sonraki HER ŞEY (satır sonları/boşluklar korunur).
    const mesaj = message.content
      .slice(require("../config").prefix.length)
      .replace(/^\S+\s*/, "")
      .trim();

    if (!mesaj) {
      return message.channel.send(
        "❌ Kullanım: `.to-demo <butona basınca gönderilecek mesaj>`",
      );
    }

    const setup = await Setup.findOne({ guildId: message.guild.id });

    // token-ekle ile AYNI butonlar; sadece customId'ler `paneldemo_` önekli —
    // böylece gerçek token-ekleme handler'larını tetiklemezler.
    const butonlar = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("paneldemo_tek")
        .setLabel("1 Token Ekle")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("1477617566150164640"),
      new ButtonBuilder()
        .setCustomId("paneldemo_cok")
        .setLabel("Birden Fazla Ekle")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("1477602702216396875"),
      new ButtonBuilder()
        .setCustomId("paneldemo_kaldir")
        .setLabel("Token Kaldır")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("1477617714209226812"),
    );

    // Roller + `.paket-setup` ile ROLÜ OLAN paketler, limite göre
    // büyükten küçüğe sıralı (bkz. utils/sinir-listesi.js).
    const sinirText = sinirlamaMetni(message.guild.id, setup);

    const container = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### **${emoji("marka")}  Auranest V2**`,
        ),
      )
      .addSeparatorComponents(ayrac())
      .addSectionComponents(
        bolum(
          "**Bu sistem ne yapıyor?**\n" +
            "- Hesabını bir ses kanalına sokar\n" +
            "- Ve orada **7/24 tutar** — çıkmaz\n" +
            "- Sen bilgisayarını kapatsan bile hesabın seste kalır",
          gorsel("1467826878508306557"),
        ),
      )
      .addSeparatorComponents(ayrac())
      .addSectionComponents(
        bolum(
          "**Ne işe yarar?**\n" +
            "- Ses aktifliğin uyurken bile artar\n" +
            "- Sunucuda sürekli aktif görünürsün\n" +
            "- Aktiflik arayan yetkilerde öne geçersin",
          gorsel("1233130900833959996", "webp"),
        ),
      )
      .addSeparatorComponents(ayrac())
      .addSectionComponents(
        bolum(
          "**Nasıl Çalışır?**\n" +
            "- `1` Aşağıdaki butona tıkla\n" +
            "- `2` Token ve ses kanalı ID'sini gir\n" +
            "- `3` Hesabın saniyeler içinde seste",
          gorsel("1288586608030777365", "webp"),
        ),
      )
      .addSeparatorComponents(ayrac())
      .addSectionComponents(
        bolum(
          "**Neye ihtiyacın var?**\n" +
            "- Sese sokmak istediğin hesabın **tokeni**\n" +
            "- Girmesini istediğin **ses kanalının ID'si**\n" +
            "-# Kanal ID'si: kanala sağ tık → Kimliği Kopyala",
          gorsel("1355970317553631466", "webp"),
        ),
      )
      .addSeparatorComponents(ayrac())
      .addSectionComponents(
        bolum(
          "**Merak ettiklerin**\n" +
            "- **Bilgisayarımı kapatabilir miyim?** Evet, bot 7/24 açık\n" +
            "- **Mikrofonum açık mı?** Hayır, sessiz durur\n" +
            "- **Vazgeçersem?** `Token Kaldır` ile anında çıkar",
          gorsel("1393667361114034277", "webp"),
        ),
      )
      .addSeparatorComponents(ayrac())
      .addSectionComponents(
        bolum(
          "**Güvenlik**\n" +
            "▸ Tokenlar **AES ile şifrelenerek** saklanır\n" +
            "▸ Kimseyle paylaşılmaz\n" +
            "▸ İstediğin an tek tıkla silebilirsin",
          gorsel("1088249358673256579", "webp"),
        ),
      )
      .addSeparatorComponents(ayrac())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(sinirText.trim()),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      )
      .addActionRowComponents(butonlar)
      .addSeparatorComponents(ayrac())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# Copyright © by Auranest | Developed by oxy 2026",
        ),
      );

    const gonderilen = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions: { parse: [] },
    });

    // Bu panelin butonlarına basılınca gönderilecek metni sakla.
    demoMesajlar.set(gonderilen.id, mesaj);
  },
};
