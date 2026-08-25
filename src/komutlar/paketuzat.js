const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
} = require("discord.js");
const { ownerId, renk } = require("../config");
const { paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");

module.exports = {
    name: "paketuzat",
    async execute(message, args) {
        if (message.author.id !== ownerId) return;

        const hedefId = args[0]?.replace(/[<@!>]/g, "");
        const gun = parseInt(args[1]);

        if (!hedefId || !gun || gun < 1 || gun > 365) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "❌ **Kullanım:** `.paketuzat <kullanıcı> <gün>`\n-# Gün 1 ile 365 arasında olmalıdır.",
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

        const secenekler = aktifPaketler.map(ap => {
            const paketInfo = paketler.find(p => p.id === ap.paketAdi);
            const kalanGun = Math.ceil((ap.bitis - Date.now()) / (1000 * 60 * 60 * 24));
            return new StringSelectMenuOptionBuilder()
                .setLabel(paketInfo?.ad || ap.paketAdi)
                .setDescription(`${ap.sinir} limit | ${kalanGun} gün kaldı → +${gun} gün`)
                .setValue(`paketuzat_${hedefId}_${ap._id}_${gun}`)
                .setEmoji("1477602531143188615");
        });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("paket_uzat_sec")
                .setPlaceholder("📦 Süresini uzatmak istediğiniz paketi seçin...")
                .addOptions(secenekler.slice(0, 25)),
        );

        const container = new ContainerBuilder()
            .setAccentColor(renk)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ⏳ Paket Süre Uzatma\n**Kullanıcı:** <@${hedefId}>\n**Eklenecek Süre:** \`${gun}\` gün\n\nSüresini uzatmak istediğiniz paketi seçin:`,
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addActionRowComponents(menu)
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("-# Copyright © by Auranest 2026 Developed by oxy"),
            );

        await message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    },
};
