const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  RadioGroupBuilder,
  FileUploadBuilder,
  CheckboxBuilder,
} = require("discord.js");
const Token = require("../models/Token");
const { secilenMap } = require("../utils/tokenkontrol-sayfa");
const { populerOyunlar, emojiAdiUret } = require("../utils/oyun-listesi");
const { emoji } = require("../utils/emojiler");

function parseCustomId(id) {
  const rest = id.replace("tk_presence_kat_", "");
  const parts = rest.split("_");
  const panelMsgId = parts.pop();
  const sayfa = parseInt(parts.pop());
  const guildId = parts.join("_");
  return { guildId, sayfa, panelMsgId };
}

module.exports = {
  name: "tk_presence_kat_",
  async execute(interaction, client) {
    const { guildId, sayfa, panelMsgId } = parseCustomId(interaction.customId);
    const kategori = interaction.values[0];
    const secilenIds = [...(secilenMap.get(panelMsgId) || [])];

    if (secilenIds.length === 0) {
      return interaction.reply({
        content: `${emoji("hata")} Seçili hesap bulunamadı.`,
        ephemeral: true,
      });
    }

    const tekMi = secilenIds.length === 1;
    const ilkToken = tekMi ? await Token.findById(secilenIds[0]).catch(() => null) : null;
    const baslikEk = tekMi ? "" : ` (${secilenIds.length} Hesap)`;
    const customIdEk = `${guildId}_${sayfa}_${panelMsgId}`;

    if (kategori === "hazir_oyun") {
      // 4 blok x 25 oyun = 100 seçenek + 1 "Oyunu Kaldır" checkbox'ı: modalde
      // toplam 5 üst-seviye bileşen (Aktivite Bilgisi modaliyle aynı, kanıtlı
      // sınır), bu yüzden 125 yerine 100.
      const oyunlar = await populerOyunlar(100);
      if (!oyunlar.length) {
        return interaction.reply({
          content:
            `${emoji("hata")} Oyun listesi şu an alınamadı. Biraz sonra tekrar dene.`,
          ephemeral: true,
        });
      }

      // Botun application emojilerini (`.gerekliemojikur` ile yüklenenler) çek —
      // oyun adından üretilen emoji adıyla eşleştirip logoyu opsiyona koyacağız.
      let appEmojiler = null;
      try {
        if (client.application) {
          if (client.application.emojis.cache.size === 0) {
            await client.application.emojis.fetch();
          }
          appEmojiler = client.application.emojis.cache;
        }
      } catch (_) {}

      const modal = new ModalBuilder()
        .setCustomId(`tk_modal_hazir_oyun_${customIdEk}`)
        .setTitle(`Hazır Oyun Ekle${baslikEk}`);

      // Discord select menüsü en fazla 25 seçenek alır. Oyunları 25'erli
      // parçalara bölüp en fazla 4 (opsiyonel, min_values 0) select koyuyoruz —
      // sadece BİRİNDEN seçim yapman yeterli, diğerlerini boş bırakabilirsin.
      for (let blok = 0; blok * 25 < oyunlar.length && blok < 4; blok++) {
        const grup = oyunlar.slice(blok * 25, blok * 25 + 25);
        modal.addLabelComponents(
          new LabelBuilder()
            .setLabel(`Oyun Seç (${blok * 25 + 1}-${blok * 25 + grup.length})`)
            .setDescription("Bu oyunu 'oynuyor' olarak göster. Seçmek istemiyorsan boş bırak.")
            .setStringSelectMenuComponent(
              new StringSelectMenuBuilder()
                .setCustomId(`hazir_oyun_blok_${blok}`)
                .setMinValues(0)
                .setMaxValues(1)
                .setRequired(false)
                .addOptions(
                  grup.map((g) => {
                    const opt = new StringSelectMenuOptionBuilder()
                      .setLabel(g.name.slice(0, 100))
                      .setValue(g.id);
                    // Logo önceliği: 1) elle tanımlı OYUN_EMOJI, 2) `.gerekliemojikur`
                    // ile yüklenen application emojisi (oyun adından eşleşir).
                    let emoji = g.emoji;
                    if (!emoji && appEmojiler) {
                      const ae = appEmojiler.find(
                        (e) => e.name === emojiAdiUret(g.name),
                      );
                      if (ae) {
                        emoji = { id: ae.id, name: ae.name, animated: ae.animated };
                      }
                    }
                    if (emoji) {
                      try {
                        opt.setEmoji(emoji);
                      } catch (_) {}
                    }
                    return opt;
                  }),
                ),
            ),
        );
      }

      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel("Oyunu Kaldır")
          .setDescription(
            "İşaretlersen seçimler yok sayılır, aktif oyun kapatılır (kendi aktiviten varsa ona döner).",
          )
          .setCheckboxComponent(
            new CheckboxBuilder().setCustomId("hazir_oyun_kaldir").setDefault(false),
          ),
      );

      return interaction.showModal(modal);
    }

    if (kategori === "spotify") {
      const modal = new ModalBuilder()
        .setCustomId(`tk_modal_spotify_${customIdEk}`)
        .setTitle(`Spotify Dinle${baslikEk}`)
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("spotify_url")
              .setLabel("Playlist Linki")
              .setStyle(TextInputStyle.Short)
              .setValue(
                ilkToken?.spotifyPlaylistId
                  ? `https://open.spotify.com/playlist/${ilkToken.spotifyPlaylistId}`
                  : "",
              )
              .setPlaceholder("https://open.spotify.com/playlist/...")
              .setRequired(false)
              .setMaxLength(200),
          ),
        )
        .addLabelComponents(
          // Hazır oyundaki "Oyunu Kaldır" ile aynı mantık: işaretlenirse linke
          // bakılmaz, Spotify kapatılır. (Eskiden linki elle silmek gerekiyordu
          // ama alan mevcut playlist ile dolu geldiği için bu fark edilmiyordu.)
          new LabelBuilder()
            .setLabel("Spotify'ı Kapat")
            .setDescription(
              "İşaretlersen link yok sayılır, dinleme kapatılır (hesap normal aktivitesine döner).",
            )
            .setCheckboxComponent(
              new CheckboxBuilder().setCustomId("spotify_kapat").setDefault(false),
            ),
        );
      return interaction.showModal(modal);
    }

    if (kategori === "durum") {
      const mevcutDurum = ilkToken?.onlineDurum || "online";
      const modal = new ModalBuilder()
        .setCustomId(`tk_modal_presence_durum_${customIdEk}`)
        .setTitle(`Durum & Özel Durum${baslikEk}`)
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Çevrimiçi Durumu")
            .setDescription("Hesabın görünecek çevrimiçi durumunu seçin.")
            .setRadioGroupComponent(
              new RadioGroupBuilder()
                .setCustomId("presence_durum")
                .addOptions(
                  { label: "Çevrimiçi", value: "online", default: mevcutDurum === "online" },
                  { label: "Boşta", value: "idle", default: mevcutDurum === "idle" },
                  { label: "Rahatsız Etmeyin", value: "dnd", default: mevcutDurum === "dnd" },
                  { label: "Görünmez", value: "invisible", default: mevcutDurum === "invisible" },
                ),
            ),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_metin")
              .setLabel("Özel Durum Metni (boş = kaldır)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.ozelDurumMetin || "")
              .setPlaceholder("Örn: 24/7 Seste Aktif")
              .setRequired(false)
              .setMaxLength(128),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_emoji")
              .setLabel("Özel Durum Emojisi (boş = kaldır)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.ozelDurumEmoji || "")
              .setPlaceholder("Örn: 🎧")
              .setRequired(false)
              .setMaxLength(32),
          ),
        );
      return interaction.showModal(modal);
    }

    if (kategori === "bilgi") {
      const mevcutTur = ilkToken?.rpcTur || "global";
      const modal = new ModalBuilder()
        .setCustomId(`tk_modal_presence_bilgi_${customIdEk}`)
        .setTitle(`Aktivite Bilgisi${baslikEk}`)
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Aktivite Türü")
            .setDescription("Boş bırakırsan/global seçersen owner'ın global aktivitesi kullanılır.")
            .setRadioGroupComponent(
              new RadioGroupBuilder()
                .setCustomId("presence_tur")
                .addOptions(
                  { label: "Global Varsayılanı Kullan", value: "global", default: mevcutTur === "global" },
                  { label: "Oynuyor (Playing)", value: "PLAYING", default: mevcutTur === "PLAYING" },
                  { label: "Yayın Yapıyor (Streaming)", value: "STREAMING", default: mevcutTur === "STREAMING" },
                  { label: "Dinliyor (Listening)", value: "LISTENING", default: mevcutTur === "LISTENING" },
                  { label: "İzliyor (Watching)", value: "WATCHING", default: mevcutTur === "WATCHING" },
                  { label: "Yarışıyor (Competing)", value: "COMPETING", default: mevcutTur === "COMPETING" },
                ),
            ),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_isim")
              .setLabel("Aktivite Adı (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcIsim || "")
              .setPlaceholder("Örn: DISCORD.GG/NPM")
              .setRequired(false)
              .setMaxLength(128),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_detay")
              .setLabel("Detay (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcDetay || "")
              .setPlaceholder("Örn: 24/7 Seste Aktif")
              .setRequired(false)
              .setMaxLength(128),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_state")
              .setLabel("Alt Durum Metni / State (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcDurum || "")
              .setPlaceholder("Örn: by oxy")
              .setRequired(false)
              .setMaxLength(128),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_url")
              .setLabel("Bağlantı / Stream URL (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcUrl || "")
              .setPlaceholder("https://...")
              .setRequired(false)
              .setMaxLength(256),
          ),
        );
      return interaction.showModal(modal);
    }

    if (kategori === "gorsel") {
      const modal = new ModalBuilder()
        .setCustomId(`tk_modal_presence_gorsel_${customIdEk}`)
        .setTitle(`Aktivite Görselleri${baslikEk}`)
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Büyük Resim")
            .setDescription("Boş bırakılırsa mevcut büyük resim değişmez.")
            .setFileUploadComponent(
              new FileUploadBuilder()
                .setCustomId("presence_buyuk")
                .setMinValues(0)
                .setMaxValues(1)
                .setRequired(false),
            ),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_buyuk_yazi")
              .setLabel("Büyük Resim Yazısı (üzerine gelince)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcBuyukResimYazi || "")
              .setPlaceholder("Örn: 24/7 Seste Aktif")
              .setRequired(false)
              .setMaxLength(128),
          ),
        )
        .addLabelComponents(
          new LabelBuilder()
            .setLabel("Küçük Resim")
            .setDescription("Büyük resmin köşesindeki rozet. Boş bırakılırsa mevcut resim değişmez.")
            .setFileUploadComponent(
              new FileUploadBuilder()
                .setCustomId("presence_kucuk")
                .setMinValues(0)
                .setMaxValues(1)
                .setRequired(false),
            ),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_kucuk_yazi")
              .setLabel("Küçük Resim Yazısı (üzerine gelince)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcKucukResimYazi || "")
              .setPlaceholder("Örn: by oxy")
              .setRequired(false)
              .setMaxLength(128),
          ),
        );
      return interaction.showModal(modal);
    }

    if (kategori === "buton") {
      const modal = new ModalBuilder()
        .setCustomId(`tk_modal_presence_buton_${customIdEk}`)
        .setTitle(`Aktivite Butonları${baslikEk}`)
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_buton1_ad")
              .setLabel("1. Buton Yazısı (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcButon1Ad || "")
              .setPlaceholder("Örn: Discord Sunucumuz")
              .setRequired(false)
              .setMaxLength(32),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_buton1_url")
              .setLabel("1. Buton Linki (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcButon1Url || "")
              .setPlaceholder("https://discord.gg/...")
              .setRequired(false)
              .setMaxLength(256),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_buton2_ad")
              .setLabel("2. Buton Yazısı (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcButon2Ad || "")
              .setPlaceholder("Örn: Web Sitemiz")
              .setRequired(false)
              .setMaxLength(32),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("presence_buton2_url")
              .setLabel("2. Buton Linki (boş = global)")
              .setStyle(TextInputStyle.Short)
              .setValue(ilkToken?.rpcButon2Url || "")
              .setPlaceholder("https://...")
              .setRequired(false)
              .setMaxLength(256),
          ),
        );
      return interaction.showModal(modal);
    }
  },
};
