const {
  ContainerBuilder,
  TextDisplayBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");
const { renk } = require("../config");
const { EMOJI_KATALOG, EMOJI_ADLARI, emoji } = require("./emojiler");
const { emojiKur } = require("./emoji-install");
const { emojileriYukle } = require("./emoji-sync");

/**
 * EMOJİ KURULUM SİHİRBAZI
 *
 * Bot sırayla soruyor ("basarili: ✅"), sen o emojiyi kanala gönderiyorsun,
 * bot indirip yerine koyuyor ve BİR SONRAKİNİ soruyor. 30 emoji için 30 kez
 * ad yazmak zorunda kalmıyorsun.
 *
 * ⚠️ OTURUM BELLEKTE. Bot yeniden başlarsa oturum düşer — kurulan emojiler
 * zaten uygulamaya yüklendiği için kayıp olmaz, sadece sihirbazı yeniden
 * başlatırsın. Kalanlar otomatik hesaplandığı için kaldığın yerden devam
 * etmiş olursun.
 *
 * ⚠️ Oturum KANAL + KULLANICI çiftine bağlı. Aynı kanalda başkasının
 * gönderdiği emoji oturumu ilerletmez.
 */

/** Boş beklerse oturum kendini kapatır. */
const BOSTA_ZAMAN_ASIMI = 10 * 60 * 1000;

const oturumlar = new Map();

function anahtar(kanalId, userId) {
  return `${kanalId}:${userId}`;
}

/** Süresi dolan oturumları düşürür. */
function temizle() {
  const simdi = Date.now();
  for (const [id, o] of oturumlar) {
    if (simdi - o.dokunma > BOSTA_ZAMAN_ASIMI) oturumlar.delete(id);
  }
}

const temizleyici = setInterval(temizle, 60_000);
if (temizleyici.unref) temizleyici.unref();

// ───────────────────────────────────────────────────────────────────── ekran

function soruKarti(oturum) {
  const ad = oturum.kuyruk[oturum.index];

  if (!ad) {
    return {
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .setAccentColor(0x57f287)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${emoji("basarili")} **Emoji Sihirbazı Bitti**\n` +
                `> Kurulan: **${oturum.kurulan}**\n` +
                `> Atlanan: **${oturum.atlanan}**`,
            ),
          ),
      ],
    };
  }

  // Butonlar container'ın İÇİNDE — projenin geri kalanı (setup-sayfa.js,
  // tokenkontrol-sayfa.js) bu düzeni kullanıyor.
  const kutu = new ContainerBuilder()
    .setAccentColor(renk)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji("istatistik")} **Emoji Kurma Vakti** — ${oturum.index + 1}/${oturum.kuyruk.length}\n` +
          `> Sıradaki: \`${ad}\` → şu an: ${emoji(ad)}\n\n` +
          `Bu emojinin yerine koymak istediğin emojiyi **bu kanala gönder**.\n` +
          `-# Ham metni almak için Discord'da önüne ters bölü koy: \`\\:onay:\`\n` +
          `-# Yazarak da olur: \`atla\` · \`iptal\``,
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("emw_atla")
          .setLabel("Atla")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("emw_bitir")
          .setLabel("Bitir")
          .setStyle(ButtonStyle.Danger),
      ),
    );

  return { flags: MessageFlags.IsComponentsV2, components: [kutu] };
}

/** Soruyu yerinde günceller; mesaj silinmişse yenisini gönderir. */
async function soruyuGoster(kanal, oturum) {
  const yuk = soruKarti(oturum);

  if (oturum.soruId) {
    const mevcut = await kanal.messages.fetch(oturum.soruId).catch(() => null);
    if (mevcut) {
      await mevcut.edit(yuk).catch(() => {});
      return;
    }
  }

  const gonderilen = await kanal.send(yuk).catch(() => null);
  oturum.soruId = gonderilen?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────── oturum

/**
 * Sihirbazı başlatır. Sorulacak bir şey yoksa `false` döner.
 * `hepsi` false ise SADECE eksikler sorulur.
 */
async function sihirbazBaslat(message, hepsi = false) {
  const denetim = await emojileriYukle(message.client);
  const yuklu = new Set(EMOJI_ADLARI.filter((ad) => !denetim.eksik.includes(ad)));

  const kuyruk = EMOJI_ADLARI.filter((ad) => hepsi || !yuklu.has(ad));
  if (kuyruk.length === 0) return false;

  const oturum = {
    userId: message.author.id,
    kanalId: message.channelId,
    kuyruk,
    index: 0,
    soruId: null,
    kurulan: 0,
    atlanan: 0,
    dokunma: Date.now(),
  };

  oturumlar.set(anahtar(message.channelId, message.author.id), oturum);
  await soruyuGoster(message.channel, oturum);

  return true;
}

/** Sırayı bir ileri alır; bittiyse oturumu kapatır. */
function ilerle(oturum) {
  oturum.index++;
  oturum.dokunma = Date.now();

  if (oturum.index >= oturum.kuyruk.length) {
    oturumlar.delete(anahtar(oturum.kanalId, oturum.userId));
  }
}

const METINDE_EMOJI = /<(a)?:[^:\s]{1,32}:(\d{17,20})>/;

/**
 * Mesajı sihirbaz adına değerlendirir.
 *
 * @returns Mesaj sihirbaz tarafından TÜKETİLDİYSE `true` — çağıran taraf o
 *          mesajı komut olarak işlemeyi bırakır.
 */
async function sihirbazMesajiIsle(message) {
  const oturum = oturumlar.get(anahtar(message.channelId, message.author.id));
  if (!oturum) return false;

  const ad = oturum.kuyruk[oturum.index];
  if (!ad) {
    oturumlar.delete(anahtar(message.channelId, message.author.id));
    return false;
  }

  const icerik = message.content.trim();

  // ── Kontrol kelimeleri ────────────────────────────────────────────────
  if (/^(iptal|bitir|dur|stop|cancel)$/i.test(icerik)) {
    oturumlar.delete(anahtar(message.channelId, message.author.id));
    oturum.index = oturum.kuyruk.length;
    await soruyuGoster(message.channel, oturum);
    await message.delete().catch(() => {});
    return true;
  }

  if (/^(atla|skip|gec|geç)$/i.test(icerik)) {
    oturum.atlanan++;
    ilerle(oturum);
    await soruyuGoster(message.channel, oturum);
    await message.delete().catch(() => {});
    return true;
  }

  const m = METINDE_EMOJI.exec(icerik);

  // Emoji değilse mesajı TÜKETME: sihirbaz açıkken sohbet edilebilmeli.
  if (!m) return false;

  const sonuc = await emojiKur(message.client, {
    ad,
    id: m[2],
    animasyonlu: m[1] === "a",
  });

  if (sonuc.ok) {
    oturum.kurulan++;
    // Bellek tazelenmeden bir sonraki sorunun önizlemesi eski kalır.
    await emojileriYukle(message.client).catch(() => {});
  } else {
    console.warn(`[EmojiSihirbaz] "${ad}" kurulamadı: ${sonuc.sebep || ""}`);
  }

  ilerle(oturum);

  await soruyuGoster(message.channel, oturum);
  // Kanal temiz kalsın — gönderilen emoji mesajı artık gereksiz.
  await message.delete().catch(() => {});

  return true;
}

/** Butondan gelen "atla". */
async function atla(interaction) {
  const oturum = oturumlar.get(anahtar(interaction.channelId, interaction.user.id));
  if (!oturum) return false;

  oturum.atlanan++;
  ilerle(oturum);
  await interaction.update(soruKarti(oturum)).catch(() => {});
  return true;
}

/** Butondan gelen "bitir". */
async function bitir(interaction) {
  const anah = anahtar(interaction.channelId, interaction.user.id);
  const oturum = oturumlar.get(anah);
  if (!oturum) return false;

  oturumlar.delete(anah);
  oturum.index = oturum.kuyruk.length;
  await interaction.update(soruKarti(oturum)).catch(() => {});
  return true;
}

/** Sihirbaz kaç emoji soracak? */
function bekleyenSayisi(denetim, hepsi) {
  return hepsi ? EMOJI_ADLARI.length : denetim.eksik.length;
}

/** Katalogdaki yedek karakter — komutun liste ekranı için. */
function yedekKarakter(ad) {
  return EMOJI_KATALOG[ad];
}

module.exports = {
  sihirbazBaslat,
  sihirbazMesajiIsle,
  atla,
  bitir,
  bekleyenSayisi,
  yedekKarakter,
};
