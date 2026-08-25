const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotBilgi } = require("../utils/selfbot-manager");
const { emoji } = require("../utils/emojiler");

const SAYFA_BOYUTU = 10;

async function hatalitokenSayfaOlustur(sayfaNo, userId) {
  const tumTokenler = await Token.find({ userId });
  const hatalilar = tumTokenler.filter((t) => {
    const v = selfbotBilgi(t.token);
    return v && v.durum === "hata";
  });

  if (hatalilar.length === 0) {
    const c = new ContainerBuilder()
      .setAccentColor(0x57f287)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("basarili")} Artık hatalı token bulunmuyor!`
        )
      );

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [c],
      ephemeral: true,
    };
  }

  const toplamSayfa = Math.max(1, Math.ceil(hatalilar.length / SAYFA_BOYUTU));

  if (sayfaNo >= toplamSayfa) sayfaNo = toplamSayfa - 1;
  if (sayfaNo < 0) sayfaNo = 0;

  const baslangic = sayfaNo * SAYFA_BOYUTU;
  const bitis = Math.min(baslangic + SAYFA_BOYUTU, hatalilar.length);
  const sayfaTokenler = hatalilar.slice(baslangic, bitis);

  const tokenListesi = sayfaTokenler
    .map((t, i) => {
      const basi = t.token.split(".")[0];
      return `**${baslangic + i + 1}.** \`${basi}.\``;
    })
    .join("\n");

  const butonlar = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ht_sayfa_${sayfaNo - 1}_${userId}`)
      .setEmoji("1487776830206378196")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(sayfaNo === 0),
    new ButtonBuilder()
      .setCustomId(`ht_sayfa_${sayfaNo + 1}_${userId}`)
      .setEmoji("1487776787919274135")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(sayfaNo >= toplamSayfa - 1),
    new ButtonBuilder()
      .setCustomId(`hatalitoken_sil_${userId}`)
      .setLabel(`${hatalilar.length} Tokeni Sil`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1477617714209226812"),
  );

  const c = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${emoji("uyari")} Hatalı Token Listesi \`(Sayfa: ${sayfaNo + 1}/${toplamSayfa} | Toplam: ${hatalilar.length})\`\n\n${tokenListesi}`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents(butonlar);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [c],
    ephemeral: true,
  };
}

module.exports = {
  name: "hatalitoken_gor_",
  hatalitokenSayfaOlustur,
  async execute(interaction, client) {
    const userId = interaction.customId.replace("hatalitoken_gor_", "");
    const payload = await hatalitokenSayfaOlustur(0, userId);
    return interaction.reply(payload);
  },
};
