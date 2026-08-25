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
    name: "pakettanimla",
    async execute(message, args) {
        if (message.author.id !== ownerId) return;

        const hedefId = args[0]?.replace(/[<@!>]/g, "");
        if (!hedefId) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "❌ **Kullanım:** `.pakettanimla <kullanıcı>`\n-# Kullanıcı ID'si veya mention girin.",
                    ),
                );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        let hedef;
        try {
            hedef = await message.guild.members.fetch(hedefId);
        } catch {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("❌ **Kullanıcı bulunamadı!**"),
                );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const mevcutPaketler = await Paket.find({ userId: hedefId, guildId: message.guild.id, aktif: true });
        const mevcutIds = mevcutPaketler.map(p => p.paketAdi);

        const uygunPaketler = paketler.filter(p => !mevcutIds.includes(p.id));

        if (uygunPaketler.length === 0) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `❌ **<@${hedefId}> zaten tüm paketlere sahip!**`,
                    ),
                );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const secenekler = uygunPaketler.map(p =>
            new StringSelectMenuOptionBuilder()
                .setLabel(p.ad)
                .setDescription(`${p.sinir} token limiti | 1 Aylık`)
                .setValue(`pakettanimla_${hedefId}_${p.id}`)
                .setEmoji("1477602531143188615"),
        );

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("paket_tanimla_sec")
                .setPlaceholder("📦 Tanımlamak istediğiniz paketi seçin...")
                .addOptions(secenekler.slice(0, 25)),
        );

        let paketListesi = "";
        if (mevcutPaketler.length > 0) {
            paketListesi = "\n\n**Mevcut Aktif Paketleri:**\n";
            for (const mp of mevcutPaketler) {
                const paketInfo = paketler.find(p => p.id === mp.paketAdi);
                const kalanGun = Math.ceil((mp.bitis - Date.now()) / (1000 * 60 * 60 * 24));
                paketListesi += `> ${paketInfo?.emoji || "📦"} **${paketInfo?.ad || mp.paketAdi}** — \`${kalanGun}\` gün kaldı\n`;
            }
        }

        const container = new ContainerBuilder()
            .setAccentColor(renk)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📦 Paket Tanımlama\n**Kullanıcı:** <@${hedefId}>\n**Süre:** 1 Ay (30 gün)${paketListesi}\n\nAşağıdan tanımlamak istediğiniz paketi seçin:`,
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
