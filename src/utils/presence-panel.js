const { emoji } = require("../utils/emojiler");
const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

// Presence Ayarla akışının TEK giriş noktası: kategori seçim ekranı. Hem ilk
// açılışta (tk-ayarlar-menu.js) hem her "◀ Kategorilere Dön" basışında
// (tk-modal-presence.js, tk-modal-hazir-oyun.js, tk-modal-spotify.js,
// tk-presence-geri-buton.js) AYNI kod yolundan üretilir — tek bir mesaj
// `update`/`deferUpdate` ile yerinde düzenlenerek gezinir, yeni ephemeral
// mesaj yığılmaz. (Hazır oyun seçimi/kaldırma artık kendi modalinde yapılıyor,
// bkz. tk-presence-kategori-menu.js "hazir_oyun" dalı.)
function kategoriPaneliOlustur(secilenIds, guildId, sayfa, panelMsgId) {
  const kategoriMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`tk_presence_kat_${guildId}_${sayfa}_${panelMsgId}`)
      .setPlaceholder("Ayarlamak istediğin kategoriyi seç...")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Durum & Özel Durum")
          .setDescription("Çevrimiçi durumu ve özel durum (metin/emoji) ayarla")
          .setValue("durum")
          .setEmoji("1477601697940504682"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Aktivite Bilgisi")
          .setDescription("Aktivite adı, türü, detayı, alt metni ve linki")
          .setValue("bilgi")
          .setEmoji("1441471814957006858"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Görseller")
          .setDescription("Büyük/küçük resim yükle ve üstüne gelince görünen yazıyı ayarla")
          .setValue("gorsel")
          .setEmoji("1477602610554077298"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Butonlar")
          .setDescription("Aktivitenin altındaki 2 butonun yazısını ve linkini ayarla")
          .setValue("buton")
          .setEmoji("1477602705517051968"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Hazır Oyun Ekle")
          .setDescription("Popüler oyunlardan seç, hesap 'oynuyor' görünsün (gerçek ikonla)")
          .setValue("hazir_oyun")
          .setEmoji("1477602705517051968"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Spotify Dinle")
          .setDescription("Playlist linki ver, hesap şarkıları sırayla dinliyor görünsün")
          .setValue("spotify")
          .setEmoji("1441471814957006858"),
      ),
  );

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${emoji("marka")} Presence Ayarla \`(${secilenIds.length} Hesap)\`\n` +
          "Aşağıdan bir kategori seç, ilgili ayar penceresi açılacak. Her kategoriyi ayrı ayrı düzenleyebilirsin; boş bıraktığın alanlar dokunulmadan kalır.",
      ),
    )
    .addActionRowComponents(kategoriMenu);

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container],
  };
}

/** Alt ekranlara (oyun listesi, modal sonucu) eklenen "kategorilere dön" satırı. */
function geriButonu(customIdEk) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tk_presence_geri_${customIdEk}`)
      .setLabel("Kategorilere Dön")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("1487776830206378196"),
  );
}

module.exports = { kategoriPaneliOlustur, geriButonu };
