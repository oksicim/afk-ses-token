const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require("discord.js");
const { ownerId } = require("../config");
const { paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");

module.exports = {
    name: "paket_uzat_sec",
    async execute(interaction) {
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: "❌ Yetkiniz yok.", ephemeral: true });
        }

        const deger = interaction.values[0];
        const match = deger.match(/paketuzat_(\d+)_(.+)_(\d+)/);
        if (!match) {
            return interaction.reply({ content: "❌ Geçersiz seçim.", ephemeral: true });
        }

        const hedefId = match[1];
        const paketDocId = match[2];
        const gun = parseInt(match[3]);

        const paketDoc = await Paket.findById(paketDocId);
        if (!paketDoc || !paketDoc.aktif) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("❌ **Bu paket artık aktif değil!**"),
                );
            return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        const eskiBitis = new Date(paketDoc.bitis);
        const yeniBitis = new Date(eskiBitis.getTime() + gun * 24 * 60 * 60 * 1000);
        paketDoc.bitis = yeniBitis;
        await paketDoc.save();

        const paketInfo = paketler.find(p => p.id === paketDoc.paketAdi);
        const kalanGun = Math.ceil((yeniBitis - Date.now()) / (1000 * 60 * 60 * 24));

        const container = new ContainerBuilder()
            .setAccentColor(0x57f287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ⏳ Paket Süresi Uzatıldı!\n\n` +
                    `**Kullanıcı:** <@${hedefId}>\n` +
                    `**Paket:** ${paketInfo?.emoji || "📦"} **${paketInfo?.ad || paketDoc.paketAdi}**\n` +
                    `**Eklenen Süre:** \`+${gun}\` gün\n` +
                    `**Eski Bitiş:** \`${eskiBitis.toLocaleDateString("tr-TR")}\`\n` +
                    `**Yeni Bitiş:** \`${yeniBitis.toLocaleDateString("tr-TR")}\`\n` +
                    `**Kalan Gün:** \`${kalanGun}\`\n` +
                    `**Uzatan:** <@${interaction.user.id}>`,
                ),
            );

        await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [container] });
    },
};
