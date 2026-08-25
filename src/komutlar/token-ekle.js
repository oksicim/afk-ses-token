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
const { ownerId, renk } = require("../config");
const Setup = require("../models/Setup");
const { emoji } = require("../utils/emojiler");
const { sinirlamaMetni } = require("../utils/sinir-listesi");
const {
  kanalIdCoz,
  forumKanalGetir,
  forumKonusuAc,
} = require("../utils/forum-panel");

// Panel bir forum kanalına atıldığında konunun adı bu olur — üye forumda
// "afk ses" diye aratınca sistemi bulabilsin diye sistemin adının kendisi.
const SISTEM_ADI = "AFK SES SISTEMI";

// Foruma etiket olarak eklenecek anahtar kelimeler (en fazla 5, her biri
// 20 karakter — Discord sınırı). Etiketler forumda filtre olarak da çıkar.
const ANAHTAR_ETIKETLER = [
  "AFK SES",
  "TOKEN",
  "7/24 SES",
  "AKTİFLİK",
  "SES SİSTEMİ",
];

// Etiketler tıklanarak bulunur, bunlar ise YAZARAK aranınca bulunur:
// konunun dibinde küçük punto ile durur.
const ANAHTAR_KELIMELER = [
  "afk ses sistemi",
  "afk ses botu",
  "token ekle",
  "ses aktifliği",
  "7/24 seste kalma",
  "hesabı sese sokma",
  "afk bot",
  "onliner",
];

// Emoji CDN linkleri İMZASIZ (?ex/is/hm yok) — süresiz yaşarlar. Panel kanalda
// kalıcı durduğu için görselleri buradan çekiyoruz; imzalı bir attachment
// linki koyulsaydı 24 saat sonra panelin ortası kırık kareye dönerdi.
const gorsel = (id, uzanti = "gif") =>
  `https://cdn.discordapp.com/emojis/${id}.${uzanti}`;

const ayrac = () =>
  new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

/** Başlık+metin solda, görsel sağda duran bölüm. */
const bolum = (metin, gorselUrl) =>
  new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(metin))
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(gorselUrl));

module.exports = {
  name: "token-ekle",
  // .token-ekle                       → paneli bulunduğun kanala atar
  // .token-ekle <forum kanal ID>      → o forumda "AFK SES SISTEMI" konusu açar
  // .token-ekle <forum kanal ID> <ad> → konu başlığını sen belirlersin
  async execute(message, args = []) {
    if (message.author.id !== ownerId) return;

    // İlk argüman varsa forum modundayız. ID hatalıysa sessiz geçmek yerine
    // kullanımı gösteriyoruz — yanlış yazılan ID'nin panelin normal kanala
    // düşmesine sebep olması kafa karıştırıcı olurdu.
    let forum = null;
    if (args[0]) {
      const forumId = kanalIdCoz(args[0]);
      if (!forumId) {
        return message.channel.send(
          "❌ Kullanım: `.token-ekle <forum kanal ID>` *(veya #kanal)*",
        );
      }
      try {
        forum = await forumKanalGetir(message.client, forumId);
      } catch (err) {
        return message.channel.send(err.message);
      }
    }

    // Sınırlamalar bölümündeki roller, panelin DURACAĞI sunucuya ait olmalı —
    // forum başka bir sunucuda olabilir.
    const setup = await Setup.findOne({
      guildId: forum ? forum.guild.id : message.guild.id,
    });

    const butonlar = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tek_token_ekle")
        .setLabel("1 Token Ekle")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("1477617566150164640"),
      new ButtonBuilder()
        .setCustomId("cok_token_ekle")
        .setLabel("Birden Fazla Ekle")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("1477602702216396875"),
      new ButtonBuilder()
        .setCustomId("token_kaldir")
        .setLabel("Token Kaldır")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("1477617714209226812"),
    );

    // Roller + `.paket-setup` ile ROLÜ OLAN paketler, limite göre
    // büyükten küçüğe sıralı (bkz. utils/sinir-listesi.js).
    const sinirText = sinirlamaMetni(forum ? forum.guild.id : message.guild.id, setup);

    const container = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### **${emoji("marka")}  Auranest V2**`,
        ),
      )
      .addSeparatorComponents(ayrac())

      // "Sistem ne işe yarar?" en çok sorulan soru — cevabı en başa, en yalın
      // haliyle koyuyoruz.
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

    const govde = {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      // Sınırlamalar kısmında roller <@&id> ile yazılıyor. Bu olmadan panel
      // her atıldığında o rollerdeki herkese bildirim gidiyordu; rol adı
      // yine renkli görünür ama kimse etiketlenmez.
      allowedMentions: { parse: [] },
    };

    // Normal kanal: eskisi gibi düz mesaj.
    if (!forum) return message.channel.send(govde);

    // Forum: aranınca çıkması için anahtar kelimeler panelin dibine küçük
    // punto ile eklenir, ardından konu açılır.
    container
      .addSeparatorComponents(ayrac())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# 🔎 ${ANAHTAR_KELIMELER.join(" • ")}`,
        ),
      );

    const baslik = args.slice(1).join(" ").trim() || SISTEM_ADI;

    try {
      const konu = await forumKonusuAc(forum, {
        baslik,
        anahtarKelimeler: ANAHTAR_ETIKETLER,
        mesaj: govde,
      });
      await message.channel.send(
        `✅ Panel foruma açıldı: ${konu} — **${baslik}**`,
      );
    } catch (err) {
      console.error("[token-ekle] forum konusu açılamadı:", err);
      await message.channel.send(
        `❌ Forum konusu açılamadı: \`${err.message}\``,
      );
    }
  },
};
