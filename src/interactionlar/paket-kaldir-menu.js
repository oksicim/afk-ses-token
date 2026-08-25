const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require("discord.js");
const { ownerId, renk } = require("../config");
const { paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");
const { toplamSinir: paketToplamSinir } = require("../utils/paket-config");
const Token = require("../models/Token");
const { selfbotDurdur } = require("../utils/selfbot-manager");
const { tokenLogGonder } = require("../utils/token-log");

module.exports = {
    name: "paket_kaldir_sec",
    async execute(interaction, client) {
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: "❌ Yetkiniz yok.", ephemeral: true });
        }

        const deger = interaction.values[0];
        const match = deger.match(/paketkaldir_(\d+)_(.+)/);
        if (!match) {
            return interaction.reply({ content: "❌ Geçersiz seçim.", ephemeral: true });
        }

        const hedefId = match[1];
        const paketDocId = match[2];

        const paketDoc = await Paket.findById(paketDocId);
        if (!paketDoc || !paketDoc.aktif) {
            const c = new ContainerBuilder()
                .setAccentColor(0xed4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("❌ **Bu paket zaten aktif değil!**"),
                );
            return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [c] });
        }

        paketDoc.aktif = false;
        await paketDoc.save();

        const paketInfo = paketler.find(p => p.id === paketDoc.paketAdi);

        const kalanAktifPaketler = await Paket.find({
            userId: hedefId,
            guildId: interaction.guild.id,
            aktif: true,
        });
        const yeniToplamSinir = paketToplamSinir(kalanAktifPaketler, interaction.guild.id);

        const aktifTokenler = await Token.find({ userId: hedefId, askida: { $ne: true } });
        let askiyaAlinan = 0;

        if (aktifTokenler.length > yeniToplamSinir) {
            const fazla = aktifTokenler.length - yeniToplamSinir;
            const askiyaAlinacaklar = aktifTokenler.slice(aktifTokenler.length - fazla);

            for (const t of askiyaAlinacaklar) {
                t.askida = true;
                await t.save();
                await selfbotDurdur(t.token);
                askiyaAlinan++;
            }
        }

        let askiyaText = "";
        if (askiyaAlinan > 0) {
            askiyaText = `\n\n⏸️ **${askiyaAlinan}** token limit aşımı nedeniyle askıya alındı!`;
        }

        const container = new ContainerBuilder()
            .setAccentColor(0xed4245)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 🗑️ Paket Kaldırıldı!\n\n` +
                    `**Kullanıcı:** <@${hedefId}>\n` +
                    `**Kaldırılan Paket:** ${paketInfo?.emoji || "📦"} **${paketInfo?.ad || paketDoc.paketAdi}**\n` +
                    `**Eski Limit:** \`${paketDoc.sinir}\`\n` +
                    `**Yeni Toplam Limit:** \`${yeniToplamSinir}\`\n` +
                    `**Kaldıran:** <@${interaction.user.id}>${askiyaText}`,
                ),
            );

        await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [container] });

        tokenLogGonder(client, interaction.guild.id, {
            tur: "kaldirildi",
            kullanici: hedefId,
            adet: paketDoc.sinir,
            detay: `📦 **${paketInfo?.ad || paketDoc.paketAdi}** paketi kaldırıldı | ${askiyaAlinan > 0 ? `${askiyaAlinan} token askıya alındı` : "Token askıya alınmadı"} | Kaldıran: <@${interaction.user.id}>`,
        });
    },
};
