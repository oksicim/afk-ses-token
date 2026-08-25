const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
} = require("discord.js");
const { renk } = require("../config");
const { emoji } = require("../utils/emojiler");

// Not: Panelde roller <@&id> ile gösterildiği için bu container'ı gönderen
// her yer `allowedMentions: { parse: [] }` vermeli — yoksa panel her
// yenilendiğinde o rollerdeki herkese bildirim gider.
function setupSayfaOlustur(setup) {
    const gerekliRolText = setup?.gerekliRolId ? `<@&${setup.gerekliRolId}>` : "`-`";
    const boosterRolText = setup?.boosterRolId ? `<@&${setup.boosterRolId}>` : "`-`";
    const logKanalText = setup?.logKanalId ? `<#${setup.logKanalId}>` : "`-`";
    const ekleLogText = setup?.tokenEkleLogKanalId ? `<#${setup.tokenEkleLogKanalId}>` : "`-`";
    const cikarLogText = setup?.tokenCikarLogKanalId ? `<#${setup.tokenCikarLogKanalId}>` : "`-`";
    const sikayetKanalText = setup?.sikayetKanalId ? `<#${setup.sikayetKanalId}>` : "`-`";
    const normalSinir = setup?.normalSinir ?? 3;
    const boosterSinir = setup?.boosterSinir ?? 7;

    const container = new ContainerBuilder()
        .setAccentColor(renk)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${emoji("marka")} Kurulum Paneli`),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `🛡️ **Gerekli Rol:** ${gerekliRolText}\n💎 **Booster Rolü:** ${boosterRolText}`,
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("setup_gereklirol")
                    .setPlaceholder("🛡️ Gerekli Rol")
                    .setMaxValues(1),
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("setup_boosterrol")
                    .setPlaceholder("💎 Booster Rolü")
                    .setMaxValues(1),
            ),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `📋 **Askıya Alma Log:** ${logKanalText}\n📥 **Token Ekleme Log:** ${ekleLogText}\n📤 **Token Çıkarma Log:** ${cikarLogText}\n📝 **Şikayet Kanalı:** ${sikayetKanalText}`,
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("setup_logkanal")
                    .setPlaceholder("📋 Askıya Alma Log Kanalı")
                    .setChannelTypes(ChannelType.GuildText)
                    .setMaxValues(1),
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("setup_eklelogkanal")
                    .setPlaceholder("📥 Token Ekleme Log Kanalı")
                    .setChannelTypes(ChannelType.GuildText)
                    .setMaxValues(1),
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("setup_cikarlogkanal")
                    .setPlaceholder("📤 Token Çıkarma Log Kanalı")
                    .setChannelTypes(ChannelType.GuildText)
                    .setMaxValues(1),
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("setup_sikayetkanal")
                    .setPlaceholder("📝 Şikayet Log Kanalı")
                    .setChannelTypes(ChannelType.GuildText)
                    .setMaxValues(1),
            ),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `🔢 **Normal Sınır:** \`${normalSinir}\` | 💎 **Booster Sınır:** \`${boosterSinir}\``,
            ),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_sinir")
                    .setLabel(`Normal Sınır: ${normalSinir}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🔢"),
                new ButtonBuilder()
                    .setCustomId("setup_boostersinir")
                    .setLabel(`Booster Sınır: ${boosterSinir}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("💎"),
            ),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# Copyright © by Auranest 2026 Developed by oxy"),
        );

    return container;
}

module.exports = { setupSayfaOlustur };
