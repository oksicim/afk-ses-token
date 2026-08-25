const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");
const { ownerId, renk } = require("../config");
const { paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");
const { toplamSinir: paketToplamSinir } = require("../utils/paket-config");
const Token = require("../models/Token");

module.exports = {
  name: "paketbilgi",
  async execute(message, args) {
    if (message.author.id !== ownerId) return;

    const hedefId = args[0]?.replace(/[<@!>]/g, "");
    if (!hedefId) {
      const c = new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "❌ **Kullanım:** `.paketbilgi <kullanıcı>`\n-# Kullanıcı ID'si veya mention girin.",
          ),
        );
      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [c],
      });
    }

    const aktifPaketler = await Paket.find({
      userId: hedefId,
      guildId: message.guild.id,
      aktif: true,
    });
    const gecmisPaketler = await Paket.find({
      userId: hedefId,
      guildId: message.guild.id,
      aktif: false,
    })
      .sort({ bitis: -1 })
      .limit(5);

    const aktifTokenSayi = await Token.countDocuments({
      userId: hedefId,
      askida: { $ne: true },
    });
    const askidaTokenSayi = await Token.countDocuments({
      userId: hedefId,
      askida: true,
    });
    const toplamSinir = paketToplamSinir(aktifPaketler, message.guild.id);

    let aktifText = "";
    if (aktifPaketler.length > 0) {
      for (const ap of aktifPaketler) {
        const paketInfo = paketler.find((p) => p.id === ap.paketAdi);
        const kalanGun = Math.ceil(
          (ap.bitis - Date.now()) / (1000 * 60 * 60 * 24),
        );
        const baslangicTarih = new Date(ap.baslangic).toLocaleDateString(
          "tr-TR",
        );
        const bitisTarih = new Date(ap.bitis).toLocaleDateString("tr-TR");
        const durumEmoji = kalanGun <= 3 ? "🔴" : kalanGun <= 7 ? "🟡" : "🟢";

        aktifText += `> ${paketInfo?.emoji || "📦"} **${paketInfo?.ad || ap.paketAdi}**\n`;
        aktifText += `> Limit: \`${ap.sinir}\` | ${durumEmoji} Kalan: \`${kalanGun}\` gün\n`;
        aktifText += `> Başlangıç: \`${baslangicTarih}\` → Bitiş: \`${bitisTarih}\`\n`;
        aktifText += `> Tanımlayan: <@${ap.tanimlayan}>\n\n`;
      }
    } else {
      aktifText = "> Aktif paket bulunmuyor.\n";
    }

    let gecmisText = "";
    if (gecmisPaketler.length > 0) {
      for (const gp of gecmisPaketler) {
        const paketInfo = paketler.find((p) => p.id === gp.paketAdi);
        const bitisTarih = new Date(gp.bitis).toLocaleDateString("tr-TR");
        gecmisText += `> ~~${paketInfo?.ad || gp.paketAdi}~~ — \`${gp.sinir}\` limit — \`${bitisTarih}\`\n`;
      }
    } else {
      gecmisText = "> Geçmiş paket bulunmuyor.\n";
    }

    const container = new ContainerBuilder()
      .setAccentColor(renk)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 📋 Paket Bilgisi\n**Kullanıcı:** <@${hedefId}>`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📊 **Token Durumu**\n> Aktif: \`${aktifTokenSayi}\` / \`${toplamSinir}\` (limit)\n> Askıda: \`${askidaTokenSayi}\`\n> Kalan Hak: \`${Math.max(0, toplamSinir - aktifTokenSayi)}\``,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          ` **Aktif Paketler** (\`${aktifPaketler.length}\`)\n${aktifText.trim()}`,
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📜 **Geçmiş Paketler** (son 5)\n${gecmisText.trim()}`,
        ),
      )
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

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
