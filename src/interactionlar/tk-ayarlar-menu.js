const { secilenMap, sayfaOlustur, getFiltreliTokenler } = require("../utils/tokenkontrol-sayfa");
const { kategoriPaneliOlustur } = require("../utils/presence-panel");
const { hesapKapat, hesapAc } = require("../utils/selfbot-manager");
const panelHedefMap = require("../utils/panel-hedef");
const Token = require("../models/Token");
const { emoji } = require("../utils/emojiler");

module.exports = {
  name: "tk_ayarlar_",
  async execute(interaction, client) {
    const id = interaction.customId;
    const msgId = interaction.message?.id;
    const rest = id.replace("tk_ayarlar_", "");
    const lastUnd = rest.lastIndexOf("_");
    const guildId = rest.substring(0, lastUnd);
    const sayfa = parseInt(rest.substring(lastUnd + 1));
    const secenek = interaction.values[0];
    const secilenIds = [...(secilenMap.get(msgId) || [])];
    const userId = panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id;

    if (secenek === "kapat_ac") {
      const tokenler = await getFiltreliTokenler(client, guildId, userId);
      const secilenTokenler = tokenler.filter((t) => secilenIds.includes(t._id.toString()));
      const herhangiAcik = secilenTokenler.some((t) => !t.kapatildi);

      for (const t of secilenTokenler) {
        if (herhangiAcik) {
          if (!t.kapatildi) await hesapKapat(t.token);
        } else if (t.kapatildi) {
          await hesapAc(t.token, t.kanalId, t.selfMute, t.selfDeaf);
        }
      }

      return interaction.update(
        await sayfaOlustur(client, guildId, sayfa, secilenIds, userId, msgId),
      );
    }

    if (secenek === "ses_modu") {
      const response = {
        type: 9,
        data: {
          custom_id: `tk_modal_ses_modu_${guildId}_${sayfa}`,
          title: "Ses Modu",
          components: [
            {
              type: 18,
              label: "Ses Modu Ayarı",
              description: `${secilenIds.length} hesap için ses modunu seçin. Açıksa kanala bağlanır, kapalıysa ayrılır ama aktif kalır.`,
              component: {
                type: 3,
                custom_id: "ses_modu_secim",
                placeholder: "Ses modunu seçin...",
                options: [
                  {
                    label: "Açık",
                    description: "Hesap ses kanalına bağlanır",
                    value: "ses_ac",
                    emoji: { id: "1477601697940504682", name: "acik" },
                  },
                  {
                    label: "Kapalı",
                    description: "Hesap kanaldan ayrılır ama aktif kalır",
                    value: "ses_kapat",
                    emoji: { id: "1477602467309948938", name: "kapali" },
                  },
                ],
                min_values: 1,
                max_values: 1,
              },
            },
          ],
        },
      };

      const res = await fetch(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        },
      );
      if (!res.ok) {
        console.error("Modal gonderim hatasi (ses_modu):", await res.json());
      }
      return;
    }

    if (secenek === "kanal_duzenle") {
      let mevcutKanalId = "";
      if (secilenIds.length > 0) {
        const ilkToken = await Token.findById(secilenIds[0]).catch(() => null);
        if (ilkToken) mevcutKanalId = ilkToken.kanalId;
      }

      const response = {
        type: 9,
        data: {
          custom_id: `tk_modal_kanal_duzenle_${guildId}_${sayfa}`,
          title: secilenIds.length === 1 ? "Kanalı Düzenle" : `Kanalı Düzenle (${secilenIds.length} Hesap)`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "kanal_duzenle_input",
                  label: secilenIds.length === 1 ? "Yeni Ses Kanalı ID'si" : "Tüm seçili hesaplar için Kanal ID",
                  style: 1,
                  value: mevcutKanalId,
                  placeholder: "Ses kanalı ID'sini girin...",
                  required: true,
                },
              ],
            },
          ],
        },
      };

      const res = await fetch(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        },
      );
      if (!res.ok) {
        console.error("Modal gonderim hatasi (kanal_duzenle):", await res.json());
      }
      return;
    }

    if (secenek === "guild_tag") {
      const response = {
        type: 9,
        data: {
          custom_id: `tk_modal_guild_tag_${guildId}_${sayfa}`,
          title:
            secilenIds.length === 1
              ? "Guild Tag Al"
              : `Guild Tag Al (${secilenIds.length} Hesap)`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "guild_tag_input",
                  label: "Sunucu ID (boş = etiketi kaldır)",
                  style: 1,
                  placeholder: "Etiketini almak istediğin sunucunun ID'si...",
                  required: false,
                },
              ],
            },
          ],
        },
      };

      const res = await fetch(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        },
      );
      if (!res.ok) {
        console.error("Modal gonderim hatasi (guild_tag):", await res.json());
      }
      return;
    }

    if (secenek === "presence") {
      if (secilenIds.length === 0) {
        return interaction.reply({
          content: `${emoji("hata")} Seçili hesap bulunamadı.`,
          ephemeral: true,
        });
      }

      return interaction.reply(
        kategoriPaneliOlustur(secilenIds, guildId, sayfa, msgId),
      );
    }

    if (secenek === "token_kaldir") {
      const response = {
        type: 9,
        data: {
          custom_id: `tk_modal_token_kaldir_${guildId}_${sayfa}`,
          title: "Tokeni Kaldır",
          components: [
            {
              type: 18,
              label: "Emin misin?",
              description: `${secilenIds.length} hesap kalıcı olarak silinecek. Bu işlem geri alınamaz!`,
              component: {
                type: 3,
                custom_id: "kaldir_onay_secim",
                placeholder: "Seçim yapın...",
                options: [
                  {
                    label: "Evet",
                    description: "Seçili hesapları sil",
                    value: "evet",
                    emoji: { id: "1441438195823939675", name: "onay" },
                  },
                  {
                    label: "Hayır",
                    description: "İptal et, silme",
                    value: "hayir",
                    emoji: { id: "1441467588772102286", name: "red" },
                  },
                ],
                min_values: 1,
                max_values: 1,
              },
            },
          ],
        },
      };

      const res = await fetch(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        },
      );
      if (!res.ok) {
        console.error(
          "Modal gonderim hatasi (token_kaldir):",
          await res.json(),
        );
      }
      return;
    }
  },
};
