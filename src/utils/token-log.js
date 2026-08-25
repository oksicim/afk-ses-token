const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require("discord.js");
const Setup = require("../models/Setup");
const { emoji } = require("../utils/emojiler");

async function tokenLogGonder(client, guildId, { tur, kullanici, adet, detay }) {
    const setup = await Setup.findOne({ guildId });
    if (!setup) return;

    let kanalId = null;
    if (tur === "eklendi" || tur === "kurtarildi" || tur === "aktarildi") kanalId = setup.tokenEkleLogKanalId;
    if (tur === "kaldirildi") kanalId = setup.tokenCikarLogKanalId;

    if (!kanalId) return;

    const kanal = client.guilds.cache.get(guildId)?.channels.cache.get(kanalId);
    if (!kanal) return;

    const renkler = {
        eklendi: 0x57f287,
        kaldirildi: 0xed4245,
        kurtarildi: 0x5865f2,
        aktarildi: 0x5865f2,
    };

    const emojiler = {
        eklendi: emoji("basarili"),
        kaldirildi: emoji("cop"),
        kurtarildi: "⏩",
        aktarildi: "🔁",
    };

    const basliklar = {
        eklendi: "Token Eklendi",
        kaldirildi: "Token Kaldırıldı",
        kurtarildi: "Token Kurtarıldı",
        aktarildi: "Token Aktarıldı",
    };

    const c = new ContainerBuilder()
        .setAccentColor(renkler[tur] || 0x5865f2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${emojiler[tur]} **${basliklar[tur]}**\n` +
                `**Kullanıcı:** <@${kullanici}>\n` +
                `**Adet:** \`${adet}\`\n` +
                (detay ? `**Detay:** ${detay}` : ""),
            ),
        );

    kanal.send({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(() => {});
}

module.exports = { tokenLogGonder };
