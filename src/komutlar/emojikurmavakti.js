const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { renk, prefix } = require("../config");
const { EMOJI_KATALOG, EMOJI_ADLARI, emoji, sahipMi } = require("../utils/emojiler");
const { eslesmeleriAyristir, emojiKur } = require("../utils/emoji-install");
const { emojileriYukle } = require("../utils/emoji-sync");
const { sihirbazBaslat } = require("../utils/emoji-sihirbaz");

function kutu(icerik, aksan = renk) {
  return new ContainerBuilder()
    .setAccentColor(aksan)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(icerik));
}

/**
 * EMOJİ KURMA VAKTİ
 *
 * Emojileri tek tek indirip klasöre atmak yerine: komutun altına
 * `ad <:emoji:id>` çiftlerini yapıştırıyorsun, bot indirip uygulamaya
 * yüklüyor ve aynı anda kullanmaya başlıyor.
 *
 *   .emojikurmavakti              → sihirbaz (bot sırayla sorar)
 *   .emojikurmavakti hepsi        → yüklü olanları da sorar
 *   .emojikurmavakti liste        → katalog + şu anki görünümler
 *   .emojikurmavakti <yapıştır>   → toplu kurulum
 *
 * Emojinin ham metnini almak için Discord'da önüne ters bölü koy:
 * `\:onay:` gönderince `<:onay:123456789>` olarak gider.
 */
module.exports = {
  name: "emojikurmavakti",
  async execute(message) {
    if (!sahipMi(message.author.id)) {
      return message.reply(`${emoji("hata")} Bu komutu sadece bot sahibi kullanabilir.`);
    }

    if (!message.client.application) {
      return message.reply(`${emoji("hata")} Uygulama bilgisi henüz hazır değil.`);
    }

    // ⚠️ Ham içerik şart: komut yönlendiricisi argümanları boşluktan bölüyor
    // ve satır sonlarını kaybediyor. Bu komutun tüm değeri ALT ALTA onlarca
    // çifti tek mesajda yapıştırabilmekten geliyor.
    const govde = hamGovde(message);

    // ── Sihirbaz ──────────────────────────────────────────────────────────
    if (!govde || /^(hepsi|all)$/i.test(govde)) {
      const basladi = await sihirbazBaslat(message, Boolean(govde));

      if (!basladi) {
        return message.reply(
          `${emoji("basarili")} Katalogdaki tüm emojiler zaten yüklü. ` +
            `Hepsini yeniden kurmak için: \`${prefix}emojikurmavakti hepsi\``,
        );
      }
      return;
    }

    // ── Katalog listesi ───────────────────────────────────────────────────
    if (/^(liste|list)$/i.test(govde)) {
      return listeGoster(message);
    }

    // ── Toplu kurulum ─────────────────────────────────────────────────────
    const { istekler, bilinmeyen } = eslesmeleriAyristir(govde);

    if (istekler.length === 0) {
      return message.reply(
        `${emoji("hata")} Kurulacak bir şey bulamadım.\n` +
          `-# Biçim: \`ad <:emoji:id>\` — örnek: \`basarili <:tik:1477602703952576665>\`` +
          (bilinmeyen.length
            ? `\n-# Katalogda olmayan adlar: \`${bilinmeyen.join("`, `")}\``
            : ""),
      );
    }

    const durumMsg = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        kutu(`${emoji("yukleniyor")} **${istekler.length} emoji kuruluyor...**`),
      ],
    });

    const sonuclar = [];
    for (const istek of istekler) {
      sonuclar.push(await emojiKur(message.client, istek));
    }

    // Bellek tazelenmeden `emoji()` hâlâ eski/unicode sürümü döner.
    const denetim = await emojileriYukle(message.client);

    const basarili = sonuclar.filter((s) => s.ok);
    const basarisiz = sonuclar.filter((s) => !s.ok);

    let metin =
      `${emoji("basarili")} **Emojiler Kuruldu**\n` +
      basarili
        .map((s) => `> ${emoji(s.ad)} \`${s.ad}\`${s.degistirildi ? " — değiştirildi" : ""}`)
        .join("\n");

    if (basarisiz.length > 0) {
      metin +=
        `\n\n${emoji("hata")} **Kurulamayan:**\n` +
        basarisiz.map((s) => `> \`${s.ad}\` — ${s.sebep || ""}`).join("\n");
    }

    if (bilinmeyen.length > 0) {
      metin += `\n\n-# Katalogda olmayan adlar atlandı: \`${bilinmeyen.join("`, `")}\``;
    }

    metin += `\n-# Uygulamada toplam ${denetim.toplam} emoji`;
    if (denetim.eksik.length > 0) {
      metin += ` • ${denetim.eksik.length} tanesi hâlâ eksik`;
    }

    return durumMsg
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [kutu(metin, basarisiz.length ? 0xfaa61a : 0x57f287)],
      })
      .catch(() => {});
  },
};

/** Katalogdaki tüm adlar + şu anki görünümleri. */
async function listeGoster(message) {
  const denetim = await emojileriYukle(message.client);
  const eksikSet = new Set(denetim.eksik);

  const satirlar = EMOJI_ADLARI.map(
    (ad) =>
      `${eksikSet.has(ad) ? emoji("kapali") : emoji("acik")} \`${ad}\` ${emoji(ad)}` +
      (eksikSet.has(ad) ? ` -# (yedek: ${EMOJI_KATALOG[ad]})` : ""),
  );

  // Tek mesajda 30+ satır 4000 karakter bütçesini zorlayabilir; ikiye böl.
  const yari = Math.ceil(satirlar.length / 2);

  await message.channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [
      kutu(
        `${emoji("pano")} **Emoji Kataloğu** (${EMOJI_ADLARI.length} ad)\n` +
          `-# Kurmak için: \`${prefix}emojikurmavakti ad <:emoji:id>\`\n\n` +
          satirlar.slice(0, yari).join("\n"),
      ),
    ],
  });

  await message.channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [
      kutu(
        satirlar.slice(yari).join("\n") +
          `\n\n-# Eksik: **${denetim.eksik.length}** • Yüklü: **${denetim.toplam}**`,
      ),
    ],
  });
}

/** Mesaj içeriğinden komut adından SONRAKİ her şeyi, satır sonlarıyla alır. */
function hamGovde(message) {
  const prefixsiz = message.content.slice(prefix.length).trimStart();
  const ilkBosluk = prefixsiz.search(/\s/);
  if (ilkBosluk === -1) return null;

  const govde = prefixsiz.slice(ilkBosluk + 1).trim();
  return govde.length > 0 ? govde : null;
}
