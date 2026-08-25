const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { emoji } = require("../utils/emojiler");
const { ayarKaydet, ayarGetir } = require("../utils/paket-ayar");
const { paketBul } = require("../utils/paket-config");
const { paketSetupPaneli } = require("../utils/paket-setup-sayfa");

function kutu(icerik, aksan) {
  return new ContainerBuilder()
    .setAccentColor(aksan)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(icerik));
}

/**
 * Paket ayarını kaydeder.
 *
 * customId: `paketsetup_modal_<paketId>` — interactionCreate önek eşleşmesi
 * bu handler'a yönlendiriyor, paket id'sini oradan çıkarıyoruz.
 */
module.exports = {
  name: "paketsetup_modal_",
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return;

    const paketId = interaction.customId.replace("paketsetup_modal_", "");
    const tanim = paketBul(paketId);

    if (!tanim) {
      return interaction
        .reply({ content: `${emoji("hata")} Paket bulunamadı.`, ephemeral: true })
        .catch(() => {});
    }

    // ── Limit ────────────────────────────────────────────────────────────
    const ham = interaction.fields.getTextInputValue("sinir").trim();
    let sinir = null;

    if (ham.length > 0) {
      const sayi = Number.parseInt(ham, 10);
      // ⚠️ Doğrulama şart: metin kutusu her şeyi kabul ediyor ve geçersiz
      // bir limit sessizce NaN olarak kaydedilseydi o paketi alan herkesin
      // limiti bozulurdu.
      if (!Number.isInteger(sayi) || sayi < 0 || sayi > 10000) {
        return interaction
          .reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              kutu(
                `${emoji("hata")} **Geçersiz limit:** \`${ham}\`\n` +
                  `-# 0 ile 10000 arasında bir tam sayı gir, ya da varsayılana dönmek için boş bırak.`,
                0xed4245,
              ),
            ],
            ephemeral: true,
          })
          .catch(() => {});
      }
      sinir = sayi;
    }

    // ── Rol ──────────────────────────────────────────────────────────────
    const rolId = [...(interaction.fields.getSelectedRoles("rol")?.keys() ?? [])][0] ?? null;

    /**
     * ⚠️ ROL HİYERARŞİSİ KONTROLÜ.
     *
     * Bot kendi en yüksek rolünün ÜSTÜNDEKİ bir rolü veremez. Bunu şimdi
     * söylemezsek hata gece yarısı, kod kullanan müşterinin karşısında
     * ortaya çıkar ve o kişi rolünü hiç alamaz.
     */
    if (rolId) {
      const rol = guild.roles.cache.get(rolId);
      const ben = guild.members.me;

      if (rol && ben && rol.position >= ben.roles.highest.position) {
        return interaction
          .reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              kutu(
                `${emoji("uyari")} <@&${rolId}> rolü **botun rolünden yüksek**, veremem.\n` +
                  `-# Sunucu ayarlarından botun rolünü bu rolün üstüne taşı, sonra tekrar dene.`,
                0xfaa61a,
              ),
            ],
            ephemeral: true,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      }

      if (rol && rol.managed) {
        return interaction
          .reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              kutu(
                `${emoji("uyari")} <@&${rolId}> bir **entegrasyon rolü** (bot/boost rolü), elle verilemez.`,
                0xfaa61a,
              ),
            ],
            ephemeral: true,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      }
    }

    await ayarKaydet(guild.id, paketId, {
      sinir,
      rolId,
      guncelleyen: interaction.user.id,
    });

    const yeni = ayarGetir(guild.id, paketId);

    // Paneli yerinde tazele ki değişiklik anında görünsün.
    await interaction
      .update({
        flags: MessageFlags.IsComponentsV2,
        components: [paketSetupPaneli(guild.id)],
        allowedMentions: { parse: [] },
      })
      .catch(() => {});

    await interaction
      .followUp({
        flags: MessageFlags.IsComponentsV2,
        components: [
          kutu(
            `${emoji("basarili")} **${yeni.ad}** güncellendi\n` +
              `${emoji("nokta")} **Limit:** \`${yeni.sinir}\`${yeni.ozelSinir ? "" : " _(varsayılan)_"}\n` +
              `${emoji("nokta")} **Rol:** ${yeni.rolId ? `<@&${yeni.rolId}>` : "_yok_"}\n` +
              `-# Limit değişikliği bu paketi olan herkese anında yansır.`,
            0x57f287,
          ),
        ],
        ephemeral: true,
        allowedMentions: { parse: [] },
      })
      .catch(() => {});
  },
};
