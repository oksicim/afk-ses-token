const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { ownerId } = require("../config");
const { paketler } = require("../utils/paket-config");
const Paket = require("../models/Paket");
const Token = require("../models/Token");
const { selfbotDurdur } = require("../utils/selfbot-manager");
const { tokenLogGonder } = require("../utils/token-log");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "paketsifirla_",
  async execute(interaction, client) {
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "❌ Yetkiniz yok.",
        ephemeral: true,
      });
    }

    const id = interaction.customId;

    if (id === "paketsifirla_iptal") {
      const c = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji("onay")} **İşlem iptal edildi.**`,
          ),
        );
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [c],
      });
    }

    const match = id.match(/paketsifirla_onayla_(\d+)/);
    if (!match) return;

    const hedefId = match[1];

    const aktifPaketler = await Paket.find({
      userId: hedefId,
      guildId: interaction.guild.id,
      aktif: true,
    });

    let kaldirilanAdet = 0;
    for (const p of aktifPaketler) {
      p.aktif = false;
      await p.save();
      kaldirilanAdet++;
    }

    const aktifTokenler = await Token.find({
      userId: hedefId,
      askida: { $ne: true },
    });
    let askiyaAlinan = 0;

    for (const t of aktifTokenler) {
      t.askida = true;
      await t.save();
      await selfbotDurdur(t.token);
      askiyaAlinan++;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xed4245)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🗑️ Paketler Sıfırlandı!\n\n` +
            `**Kullanıcı:** <@${hedefId}>\n` +
            `**Kaldırılan Paket:** \`${kaldirilanAdet}\`\n` +
            `**Askıya Alınan Token:** \`${askiyaAlinan}\`\n` +
            `**İşlemi Yapan:** <@${interaction.user.id}>`,
        ),
      );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });

    tokenLogGonder(client, interaction.guild.id, {
      tur: "kaldirildi",
      kullanici: hedefId,
      adet: askiyaAlinan,
      detay: `📦 Tüm paketler sıfırlandı (${kaldirilanAdet} paket) | ${askiyaAlinan} token askıya alındı | Yapan: <@${interaction.user.id}>`,
    });
  },
};
