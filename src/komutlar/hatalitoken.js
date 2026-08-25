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
const { ownerId } = require("../config");
const panelSahipleri = require("../interactionlar/panel-sahipleri");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "hatalitoken",
  async execute(message, args) {
    // Owner bir kullanıcıyı hedef gösterebilir: ID veya @mention (<@id>/<@!id>).
    const hamArg =
      message.author.id === ownerId && args && args[0] ? args[0] : null;
    const hedefUserId = hamArg ? hamArg.replace(/[<@!>]/g, "") : null;
    const userId = hedefUserId || message.author.id;

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
            hedefUserId
              ? `${emoji("basarili")} **<@${hedefUserId}> için Hatalı Token Bulunmuyor**\nTüm tokenleri başarıyla giriş yapmış!`
              : `${emoji("basarili")} **Hatalı Token Bulunmuyor**\nTüm tokenler başarıyla giriş yapmış!`,
          ),
        );
      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [c],
      });
    }

    const buton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hatalitoken_gor_${userId}`)
        .setLabel(`${hatalilar.length} Hatalı Tokeni Gör`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("1477602617226956912"),
    );

    const c = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${emoji("uyari")} Hatalı Token Uyarısı${hedefUserId ? ` — <@${hedefUserId}>` : ""}\n${emoji("nokta")} **Hatalı Token Sayısı:** \`${hatalilar.length}\`\n\nBu tokenler sisteme giriş yapamıyor. Token geçersiz veya hesap kısıtlanmış olabilir.`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addActionRowComponents(buton)
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# Copyright © by Auranest 2026 Developed by oxy",
        ),
      );

    const gonderilen = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [c],
    });
    panelSahipleri.set(gonderilen.id, message.author.id);
  },
};
