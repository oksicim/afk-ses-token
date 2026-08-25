const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { kullaniciBilgi } = require("../utils/sinir-kontrol");
const { renk, ownerId } = require("../config");
const panelSahipleri = require("../interactionlar/panel-sahipleri");
const { emoji } = require("../utils/emojiler");

module.exports = {
    name: "tokenkurtar",
    async execute(message, args) {
        // Owner bir kullanıcıyı hedef gösterebilir: ID veya @mention (<@id>/<@!id>).
        // Kota/rol kontrolü HEP hedef kullanıcının kendi rolüne/paketine göre
        // yapılır — owner'ın kendi rolü değil (bkz. kullaniciBilgi çağrısı).
        const hamArg =
            message.author.id === ownerId && args && args[0] ? args[0] : null;
        const hedefUserId = hamArg ? hamArg.replace(/[<@!>]/g, "") : null;
        const userId = hedefUserId || message.author.id;

        let hedefMember = message.member;
        if (hedefUserId) {
            hedefMember = await message.guild.members.fetch(hedefUserId).catch(() => null);
            if (!hedefMember) {
                const c = new ContainerBuilder().setAccentColor(0xed4245).addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("❌ **Kullanıcı bu sunucuda bulunamadı.**"),
                );
                return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
            }
        }

        const bilgi = await kullaniciBilgi(hedefMember, message.guildId);

        if (bilgi.sinir === null) {
            const c = new ContainerBuilder().setAccentColor(0xed4245).addTextDisplayComponents(
                new TextDisplayBuilder().setContent("❌ **Sistem henüz yapılandırılmamış.**\nYönetici `.setup` komutunu kullanmalıdır."),
            );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        if (!bilgi.rolVar) {
            const c = new ContainerBuilder().setAccentColor(0xed4245).addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    hedefUserId
                        ? `❌ **<@${hedefUserId}> gerekli role sahip değil.**\nToken kurtarabilmek için gerekli role veya booster rolüne sahip olmalı.`
                        : "❌ **Gerekli role sahip değilsin.**\nToken kurtarabilmek için gerekli role veya booster rolüne sahip olmalısın.",
                ),
            );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const askidaTokenler = await Token.find({ userId, askida: true });

        if (askidaTokenler.length === 0) {
            const c = new ContainerBuilder().setAccentColor(0x57f287).addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    hedefUserId
                        ? `${emoji("basarili")} **<@${hedefUserId}> için askıda token bulunmuyor.**\nTüm tokenleri aktif durumda!`
                        : `${emoji("basarili")} **Askıda tokenin bulunmuyor.**\nTüm tokenlerin aktif durumda!`,
                ),
            );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        if (bilgi.kalanHak <= 0) {
            const c = new ContainerBuilder().setAccentColor(0xed4245).addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`❌ **Token sınırı dolu!**\nMevcut sınır: \`${bilgi.sinir}\` | Aktif token: \`${bilgi.aktifSayi}\`\nÖnce aktif bir token kaldırılması gerekiyor.`),
            );
            return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const secenekler = askidaTokenler.slice(0, 25).map((t, i) => {
            const tarih = t.eklenmeZamani ? new Date(t.eklenmeZamani).toLocaleDateString("tr-TR") : "Bilinmiyor";
            const gorunenAd = t.hesapGorunenAd || t.hesapAdi || `Token #${i + 1}`;
            const kullaniciAdi = t.hesapAdi || "Bilinmiyor";
            const label = t.hesapGorunenAd ? `${gorunenAd} | ${kullaniciAdi}` : gorunenAd;
            return new StringSelectMenuOptionBuilder()
                .setLabel(label.slice(0, 100))
                .setDescription(`Kanal: ${t.kanalId} | Tarih: ${tarih}`)
                .setValue(t._id.toString());
        });

        const maxSec = Math.min(bilgi.kalanHak, askidaTokenler.length);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`tokenkurtar_sec_${userId}`)
                .setPlaceholder(`Kurtarmak istediğin tokenleri seç (max: ${maxSec})`)
                .setMinValues(1)
                .setMaxValues(maxSec)
                .addOptions(secenekler),
        );

        const container = new ContainerBuilder()
            .setAccentColor(renk)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${emoji("marka")} Token Kurtarma${hedefUserId ? ` — <@${hedefUserId}>` : ""}`,
                ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Askıdaki Tokenler:** \`${askidaTokenler.length}\`\n**Kalan Hak:** \`${bilgi.kalanHak}\` / \`${bilgi.sinir}\`\n**Aktif Token:** \`${bilgi.aktifSayi}\``,
                        ),
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL("https://cdn.discordapp.com/emojis/1477602694993547277.gif"),
                    ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Aşağıdan en fazla \`${maxSec}\` token kurtarabilirsin.`),
            )
            .addActionRowComponents(menu)
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("-# Copyright © by Auranest 2026 Developed by oxy"),
            );

        const msg = await message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        panelSahipleri.set(msg.id, message.author.id);
    },
};
