// Paneli bir FORUM kanalına "konu" olarak açar.
//
// Neden: panel normal kanala atıldığında mesaj akışta kayboluyor. Forumda ise
// konu başlığı sistemin adı olur, etiketler eklenir ve üye forumun arama
// kutusuna "afk ses" yazıp paneli kendisi bulabilir.
const { ChannelType, PermissionFlagsBits } = require("discord.js");

// Discord tarafındaki sert limitler — aşılırsa API 400 döner.
const MAKS_KONU_ETIKETI = 5; // bir konuya uygulanabilecek etiket
const MAKS_FORUM_ETIKETI = 20; // bir forumda tanımlı olabilecek etiket
const MAKS_ETIKET_UZUNLUK = 20; // etiket adı karakter sınırı

/** `<#123>` veya ham ID kabul eder; ikisi de değilse null. */
function kanalIdCoz(girdi) {
  if (!girdi) return null;
  const eslesme = String(girdi).match(/^<#(\d{17,20})>$/) ||
    String(girdi).match(/^(\d{17,20})$/);
  return eslesme ? eslesme[1] : null;
}

/**
 * ID'den forum kanalını getirir. Bulunamama/yetki durumlarında kullanıcıya
 * doğrudan gösterilebilecek Türkçe bir hata fırlatır.
 */
async function forumKanalGetir(client, kanalId) {
  const kanal = await client.channels.fetch(kanalId).catch(() => null);
  if (!kanal) {
    throw new Error(
      "❌ Kanal bulunamadı. ID yanlış olabilir ya da bot o sunucuda değil.",
    );
  }

  if (
    kanal.type !== ChannelType.GuildForum &&
    kanal.type !== ChannelType.GuildMedia
  ) {
    throw new Error("❌ Verdiğin ID bir **forum kanalı** değil.");
  }

  // members.me önbellekte olmayabilir (bot yeni eklendiyse). Yetki kontrolü
  // buna dayandığı için bir kez çekiyoruz; fetchMe sonucu önbelleğe yazar,
  // böylece etiket kısmındaki kontrol de çalışır.
  const ben =
    kanal.guild.members.me ??
    (await kanal.guild.members.fetchMe().catch(() => null));
  if (!ben) throw new Error("❌ Botun o sunucudaki yetkileri okunamadı.");

  const izin = kanal.permissionsFor(ben);
  const gerekli = [
    [PermissionFlagsBits.ViewChannel, "Kanalı Görüntüle"],
    [PermissionFlagsBits.SendMessages, "Konu Oluştur"],
    [PermissionFlagsBits.SendMessagesInThreads, "Konularda Mesaj Gönder"],
  ];
  const eksik = gerekli.filter(([bayrak]) => !izin?.has(bayrak));
  if (eksik.length) {
    throw new Error(
      `❌ Botun o forumda şu yetkileri eksik: **${eksik
        .map(([, ad]) => ad)
        .join(", ")}**`,
    );
  }

  return kanal;
}

/**
 * Anahtar kelimeleri forum etiketine çevirir. Var olanı ID'siyle kullanır,
 * olmayanı (yetki varsa) foruma ekler. Yetki yoksa sessizce sadece mevcut
 * etiketlerle devam eder — panel yine de açılsın, etiket bonus.
 */
async function etiketleriHazirla(forum, kelimeler) {
  const istenen = kelimeler
    .map((k) => k.trim())
    .filter(Boolean)
    .filter((k) => k.length <= MAKS_ETIKET_UZUNLUK)
    .slice(0, MAKS_KONU_ETIKETI);
  if (!istenen.length) return [];

  let kanal = forum;
  const bul = (ad) =>
    kanal.availableTags.find(
      (t) => t.name.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"),
    );

  const eksik = istenen.filter((ad) => !bul(ad));
  const yerVar = kanal.availableTags.length + eksik.length <= MAKS_FORUM_ETIKETI;
  const yetkiVar = kanal
    .permissionsFor(kanal.guild.members.me)
    ?.has(PermissionFlagsBits.ManageChannels);

  if (eksik.length && yerVar && yetkiVar) {
    // Mevcut etiketler aynen korunur; sadece eksik olanlar sona eklenir.
    const guncel = await kanal
      .setAvailableTags(
        [
          ...kanal.availableTags.map((t) => ({
            id: t.id,
            name: t.name,
            moderated: t.moderated,
            emoji: t.emoji,
          })),
          ...eksik.map((ad) => ({ name: ad, moderated: false, emoji: null })),
        ],
        "Panel konusu için anahtar kelime etiketleri",
      )
      .catch(() => null); // etiket eklenemezse panel yine açılsın
    if (guncel) kanal = guncel;
  }

  return istenen.map((ad) => bul(ad)?.id).filter(Boolean);
}

/**
 * Forumda paneli içeren bir konu açar.
 *
 * @param {import("discord.js").ForumChannel} forum
 * @param {object} secenekler
 * @param {string} secenekler.baslik Konu başlığı (sistemin adı)
 * @param {string[]} [secenekler.anahtarKelimeler] Etikete çevrilecek kelimeler
 * @param {object} secenekler.mesaj Konunun ilk mesajı (send payload'ı)
 * @returns {Promise<import("discord.js").ThreadChannel>}
 */
async function forumKonusuAc(forum, { baslik, anahtarKelimeler = [], mesaj }) {
  const etiketler = await etiketleriHazirla(forum, anahtarKelimeler);

  const konu = await forum.threads.create({
    name: baslik.slice(0, 100),
    appliedTags: etiketler,
    message: mesaj,
    reason: "Sistem paneli",
  });

  // Panelin listenin dibine düşmemesi için konuyu sabitlemeyi dener;
  // yetki yoksa veya forumda sabit konu doluysa sessizce geçer.
  await konu.pin().catch(() => null);

  return konu;
}

module.exports = { kanalIdCoz, forumKanalGetir, forumKonusuAc };
