// `.guncellemeat` duyurusunun İÇERİĞİ.
//
// Önizleme (komutlar/guncellemeat.js) ile gerçekten yayınlanan mesaj
// (interactionlar/guncelleme-yayinla-buton.js) AYNI fonksiyondan üretilir —
// böylece "önizlemede başka, kanalda başka" durumu imkânsızdır.

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require("discord.js");
const { renk } = require("../config");
const { emoji } = require("../utils/emojiler");

// DİKKAT: Bu link imzalı bir Discord CDN linki (?ex=...&is=...&hm=...) ve
// imzası ~24 saatte doluyor. Duyuru kalıcı olsun istiyorsan gif'i GitHub'a
// atıp raw linkini (https://raw.githubusercontent.com/.../x.gif) buraya yaz.
const GIF_URL =
  "https://cdn.discordapp.com/attachments/1526305148270411919/1527439831926575347/ezgif-25af05b40ed6a115.gif?ex=6a5aaab2&is=6a595932&hm=3fd9d546078e179526998afcbea66c1faac727feca9dcad1ad3c745b5f75c386&";

// Emoji CDN linkleri imzasız — bunlar süresiz yaşar, değiştirmene gerek yok.
const emojiGorsel = (id, uzanti = "webp") =>
  `https://cdn.discordapp.com/emojis/${id}.${uzanti}?size=128`;

const buyukAyrac = () =>
  new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const kucukAyrac = () =>
  new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

/** Bir başlık + metin + sağda emoji görseli olan bölüm. */
const bolum = (metin, gorselUrl) =>
  new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(metin))
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(gorselUrl));

/** Duyurunun tamamını kurar. */
function guncellemeContainer() {
  return new ContainerBuilder()
    .setAccentColor(renk)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${emoji("simsek")} Büyük Güncelleme\n` +
          `-# Hesaplarınız artık çok daha gerçekçi, canlı ve hızlı. Hepsi aşağıda ${emoji("marka")}`,
      ),
    )
    .addSeparatorComponents(buyukAyrac())

    .addSectionComponents(
      bolum(
        `## ${emoji("hediye")} Oyun Modu\n` +
          "Hesaplarınız artık **gerçekten oyun oynuyor** görünebilir. Uydurma bir yazı değil — " +
          "Discord'a gerçek oyun verisi gider.\n" +
          `${emoji("nokta")} Valorant, LoL, CS2, Fortnite ve **100'den fazla** popüler oyun\n` +
          `${emoji("nokta")} Her oyun kendi **gerçek logosuyla** tertemiz görünür\n` +
          `${emoji("nokta")} Tek tıkla seç, anında aktif — vazgeçersen aynı ekrandan kaldır`,
        emojiGorsel("1477602705517051968"),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addSectionComponents(
      bolum(
        `## ${emoji("marka")} Spotify Dinleme Modu\n` +
          "Hesaplarınız gerçekten müzik dinliyor görünür — tıpkı kendi profilinizdeki gibi.\n" +
          `${emoji("nokta")} Şarkının **gerçek albüm kapağı** ve ilerleme çubuğu\n` +
          `${emoji("nokta")} Şarkı bitince otomatik sıradakine geçer, 7/24 döner\n` +
          `${emoji("nokta")} Her hesap **farklı bir şarkıdan** başlar — hepsi aynı anda aynı şarkıda takılmaz\n` +
          `${emoji("nokta")} Oyun oynarken bile dinleyebilir, **ikisi aynı anda** görünür\n` +
          `${emoji("basarili")} \`YENİ\` Artık tek işaretle kapatılıyor — linki silmekle uğraşmak yok`,
        emojiGorsel("1495887901458694205", "gif"),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addSectionComponents(
      bolum(
        `## ${emoji("kapali")} Hesabını Kapat / Aç\n` +
          "Bir hesabını geçici olarak kullanmayacaksan silmene gerek yok. Tek tıkla **kapat**, " +
          "dilediğin an **aç** — sunucun, aktiviten, her ayarın olduğu gibi seni bekler.",
        emojiGorsel("1477602467309948938"),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addSectionComponents(
      bolum(
        `## ${emoji("basarili")} Token Aktarımı\n` +
          "Hesaplarını başka bir kullanıcıya saniyeler içinde devredebilirsin. " +
          "Sunucunu seç, hesaplarını işaretle, onayla — bu kadar.",
        emojiGorsel("1477602624592285909", "gif"),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addSectionComponents(
      bolum(
        `## ${emoji("nokta")} Presence Ayarları Sadeleşti\n` +
          "Durum, özel durum, aktivite bilgisi, görseller ve butonlar artık **tek ve akıcı** bir " +
          "pencerede. Gereksiz adım yok, kaybolmak yok — istediğin an bir önceki adıma dönebilirsin.",
        emojiGorsel("1477602610554077298"),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addSectionComponents(
      bolum(
        `## ${emoji("istatistik")} Artık Beklemek Yok\n` +
          "Bot açılırken karşınıza çıkan **\"lütfen bekleyin\"** ekranı tamamen kaldırıldı.\n" +
          `${emoji("nokta")} Bot açılır açılmaz bütün komutlar çalışıyor\n` +
          `${emoji("nokta")} \`.tokenkontrol\` yazdığın an **senin hesapların sıranın başına** alınıyor\n` +
          `${emoji("nokta")} Hesaplar eskisine göre kat kat hızlı açılıyor`,
        emojiGorsel("1441471814957006858", "gif"),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${emoji("uyari")} Düzeltmeler\n` +
          `${emoji("nokta")} Sunucu seçerken çıkan hatalar giderildi\n` +
          `${emoji("nokta")} Panelde durduk yere açılan garip ekran kaldırıldı\n` +
          `${emoji("nokta")} Mikrofon/kulaklık butonlarındaki çökme sorunu çözüldü\n` +
          `${emoji("nokta")} Panelin dört bir yanında onlarca küçük pürüz giderildi`,
      ),
    )
    .addSeparatorComponents(buyukAyrac())

    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(GIF_URL),
      ),
    )
    .addSeparatorComponents(kucukAyrac())

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji("okSari")} **Nasıl kullanılır?**\n` +
          "`.tokenkontrol` → sunucunu seç → hesabını seç → **Ayarlar** → dilediğin özelliği aç.\n\n" +
          "-# Bu güncelleme sizden gelen talepler doğrultusunda şekillendi ve şekillenmeye devam edecek. " +
          "Bir sorun ya da öneriniz varsa panel üzerindeki **Hata Bildir** ile bize her zaman ulaşabilirsiniz. 💙",
      ),
    )
    .addSeparatorComponents(kucukAyrac())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# Copyright © by Auranest 2026 Developed by oxy",
      ),
    );
}

module.exports = { guncellemeContainer, GIF_URL };
