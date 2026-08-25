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
    name: "paketler",
    async execute(message, args) {
        if (message.author.id !== ownerId) return;

        const aktifPaketler = await Paket.find({ guildId: message.guild.id, aktif: true }).sort({ bitis: 1 });

        if (aktifPaketler.length === 0) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "❌ **Bu sunucuda aktif paket bulunmuyor!**",
                    ),
                );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const kullaniciMap = new Map();
        for (const p of aktifPaketler) {
            if (!kullaniciMap.has(p.userId)) kullaniciMap.set(p.userId, []);
            kullaniciMap.get(p.userId).push(p);
        }

        let liste = "";
        let sira = 1;
        for (const [userId, userPaketler] of kullaniciMap) {
            const tokenSayi = await Token.countDocuments({ userId, askida: { $ne: true } });
            const toplamSinir = paketToplamSinir(userPaketler, message.guild.id);
            const askidaSayi = await Token.countDocuments({ userId, askida: true });

            liste += `**${sira}.** <@${userId}>\n`;

            for (const up of userPaketler) {
                const paketInfo = paketler.find(pp => pp.id === up.paketAdi);
                const kalanGun = Math.ceil((up.bitis - Date.now()) / (1000 * 60 * 60 * 24));
                const bitisTarih = new Date(up.bitis).toLocaleDateString("tr-TR");
                const durumEmoji = kalanGun <= 3 ? "🔴" : kalanGun <= 7 ? "🟡" : "🟢";
                liste += `> ${paketInfo?.emoji || "📦"} **${paketInfo?.ad || up.paketAdi}** — \`${up.sinir}\` limit — ${durumEmoji} \`${kalanGun}\` gün (\`${bitisTarih}\`)\n`;
            }

            liste += `> 📊 Token: \`${tokenSayi}/${toplamSinir}\``;
            if (askidaSayi > 0) liste += ` | ⏸️ Askıda: \`${askidaSayi}\``;
            liste += "\n\n";
            sira++;
        }

        const container = new ContainerBuilder()
            .setAccentColor(renk)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📦 Aktif Paket Listesi\n**Toplam:** \`${aktifPaketler.length}\` paket — \`${kullaniciMap.size}\` kullanıcı`,
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(liste.trim()),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "-# 🟢 7+ gün | 🟡 3-7 gün | 🔴 3 günden az\n-# Copyright © by Auranest 2026 Developed by oxy",
                ),
            );

        await message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    },
};
