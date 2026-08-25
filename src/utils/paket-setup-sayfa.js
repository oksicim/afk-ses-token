const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { renk } = require("../config");
const { emoji } = require("./emojiler");
const { tumAyarlar, ayarGetir } = require("./paket-ayar");
const { paketBul } = require("./paket-config");

/**
 * PAKET AYAR PANELİ
 *
 * Her paketin bu sunucudaki limitini ve verilecek rolünü gösterir.
 * Menüden paket seçilince ayar modalı açılır.
 */
function paketSetupPaneli(guildId) {
  const ayarlar = tumAyarlar(guildId);

  const satirlar = ayarlar.map((a) => {
    const rol = a.rolId ? `<@&${a.rolId}>` : "_rol yok_";
    // Varsayılandan farklı limitleri işaretle ki hangisini elle
    // ayarladığın bir bakışta görünsün.
    const limit = a.ozelSinir ? `**${a.sinir}**` : `${a.sinir}`;
    return `${a.emoji} **${a.ad}**\n-# Limit: ${limit} · Rol: ${rol}`;
  });

  return new ContainerBuilder()
    .setAccentColor(renk)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${emoji("istatistik")}  Paket Ayarları\n` +
          `Aşağıdan bir paket seç; limitini ve verilecek rolü ayarla.`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(satirlar.join("\n")))
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# **Kalın** limit = bu sunucuya özel ayarlandı. Diğerleri \`paket-config.js\` varsayılanı.\n` +
          `-# Rol, kod kullanılınca otomatik verilir; paket bitince geri alınır.`,
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("paketsetup_sec")
          .setPlaceholder("Ayarlanacak paketi seç")
          .addOptions(
            ayarlar.map((a) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(a.ad)
                .setDescription(`Limit: ${a.sinir}${a.rolId ? " · rol ayarlı" : " · rol yok"}`)
                .setValue(a.id),
            ),
          ),
      ),
    );
}

/**
 * Seçilen paketin ayar modalı: rol seçici + limit kutusu.
 *
 * ⚠️ Limit alanı BOŞ BIRAKILABİLİR — boş bırakmak "varsayılana dön"
 * demektir. Zorunlu yapsaydım varsayılana geri dönmenin hiçbir yolu
 * kalmazdı.
 */
function paketAyarModal(guildId, paketId) {
  const a = ayarGetir(guildId, paketId);
  const tanim = paketBul(paketId);
  const varsayilan = tanim ? tanim.sinir : 0;

  return new ModalBuilder()
    .setCustomId(`paketsetup_modal_${paketId}`)
    .setTitle(a.ad.slice(0, 45))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Token limiti")
        .setDescription(`Boş bırakırsan varsayılan (${varsayilan}) kullanılır.`)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("sinir")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(String(varsayilan))
            .setRequired(false)
            .setMaxLength(5)
            .setValue(a.ozelSinir ? String(a.sinir) : ""),
        ),
      new LabelBuilder()
        .setLabel("Verilecek rol")
        .setDescription("Kod kullanılınca verilir, paket bitince alınır. Boş = rol yok.")
        .setRoleSelectMenuComponent(
          new RoleSelectMenuBuilder()
            .setCustomId("rol")
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(1)
            .setDefaultRoles(a.rolId ? [a.rolId] : []),
        ),
    );
}

module.exports = { paketSetupPaneli, paketAyarModal };
