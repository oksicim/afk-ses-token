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
const { ownerId, renk } = require("../config");
const { paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");
const { toplamSinir: paketToplamSinir } = require("../utils/paket-config");
const Token = require("../models/Token");
const { selfbotDurdur } = require("../utils/selfbot-manager");

module.exports = {
    name: "paketsifirla",
    async execute(message, args) {
        if (message.author.id !== ownerId) return;

        const hedefId = args[0]?.replace(/[<@!>]/g, "");
        if (!hedefId) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "❌ **Kullanım:** `.paketsifirla <kullanıcı>`\n-# Bu komut kullanıcının TÜM aktif paketlerini kaldırır!",
                    ),
                );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const aktifPaketler = await Paket.find({ userId: hedefId, guildId: message.guild.id, aktif: true });

        if (aktifPaketler.length === 0) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `❌ **<@${hedefId}> kullanıcısının aktif paketi bulunmuyor!**`,
                    ),
                );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`paketsifirla_onayla_${hedefId}`)
                .setLabel("Evet, Tümünü Kaldır")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🗑️"),
            new ButtonBuilder()
                .setCustomId("paketsifirla_iptal")
                .setLabel("İptal")
                .setStyle(ButtonStyle.Secondary),
        );

        let paketListesi = "";
        for (const ap of aktifPaketler) {
            const paketInfo = paketler.find(p => p.id === ap.paketAdi);
            const kalanGun = Math.ceil((ap.bitis - Date.now()) / (1000 * 60 * 60 * 24));
            paketListesi += `> ${paketInfo?.emoji || "📦"} **${paketInfo?.ad || ap.paketAdi}** — \`${ap.sinir}\` limit — \`${kalanGun}\` gün kaldı\n`;
        }

        const toplamSinir = paketToplamSinir(aktifPaketler, message.guild.id);
        const aktifTokenSayi = await Token.countDocuments({ userId: hedefId, askida: { $ne: true } });

        const container = new ContainerBuilder()
            .setAccentColor(0xed4245)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ⚠️ Paket Sıfırlama Onayı\n\n` +
                    `**Kullanıcı:** <@${hedefId}>\n` +
                    `**Kaldırılacak Paketler:**\n${paketListesi}\n` +
                    `**Toplam Limit:** \`${toplamSinir}\` → \`0\`\n` +
                    `**Aktif Token:** \`${aktifTokenSayi}\` ${aktifTokenSayi > 0 ? "(tümü askıya alınacak!)" : ""}\n\n` +
                    `**Bu işlem geri alınamaz! Emin misiniz?**`,
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addActionRowComponents(butonlar);

        await message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    },
};
