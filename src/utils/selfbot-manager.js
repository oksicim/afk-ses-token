const {
  Client,
  Options,
  RichPresence,
  CustomStatus,
  SpotifyRPC,
} = require("discord.js-selfbot-v13");
const Token = require("../models/Token");
const Aktivite = require("../models/Aktivite");
const { decrypt } = require("./crypto-helper");
const { playlistGetir, parcaKapak } = require("./spotify-listesi");
const { resimCoz, resimleriHazirla } = require("./rpc-resim");
const { rpcAppId } = require("../config");

const selfbotIstemciler = new Map();

/**
 * SELFBOT CACHE POLİTİKASI — 1700 hesapta en büyük bellek kalemi.
 *
 * Kütüphanenin varsayılanı KANAL BAŞINA 200 MESAJ tutmak, üye/kullanıcı/
 * presence cache'lerini ise SINIRSIZ bırakmaktır. Her hesap kendi
 * client'ını taşıdığı için bu maliyet 1700 ile çarpılıyor: hesapların
 * gördüğü her kanalda mesajlar birikiyor ve bellek zamanla sürekli
 * büyüyor.
 *
 * Oysa selfbot client'larından bu kodun okuduğu TEK şey `guilds` ve
 * `channels` cache'i (sunucu adı/ikonu, ses kanalı listesi, `shard.send`
 * ile op 4). Mesaj, üye, kullanıcı, presence, emoji, reaksiyon, thread
 * cache'lerine hiçbir yerde bakılmıyor — hepsi ana bot client'ında
 * kullanılıyor ve ANA BOT BU POLİTİKADAN ETKİLENMEZ.
 *
 * ⚠️ Dokunulmayanlar ve sebepleri:
 *   • GuildManager / ChannelManager / GuildChannelManager / RoleManager
 *     → kütüphane bunları sınırlamayı "işlevi bozar" diye uyarıyor,
 *       ayrıca kodun gerçekten ihtiyacı olan cache'ler bunlar.
 *   • VoiceStateManager → sesten atılma tespiti (`voiceStateUpdate`) ve
 *     geri bağlanma buna dayanıyor; zaten yalnızca seste duranları tutar.
 *
 * ⚠️ `UserManager: 0` `client.user`'ı BOZMAZ: READY işleyicisi
 * `client.user = new ClientUser(...)` diye doğrudan atıyor, users
 * cache'inden geçmiyor.
 */
const SELFBOT_CACHE = Options.cacheWithLimits({
  MessageManager: 0,
  GuildMemberManager: 0,
  UserManager: 0,
  PresenceManager: 0,
  GuildEmojiManager: 0,
  BaseGuildEmojiManager: 0,
  ReactionManager: 0,
  ReactionUserManager: 0,
  GuildBanManager: 0,
  GuildInviteManager: 0,
  GuildStickerManager: 0,
  StageInstanceManager: 0,
  ThreadManager: 0,
  ThreadMemberManager: 0,
  GuildScheduledEventManager: 0,
  ApplicationCommandManager: 0,
});

// Tüm tokenlerin kullandığı global aktivite (owner panelden değişir, DB'de saklanır)
let globalAktivite = {
  aktif: true,
  tur: "PLAYING",
  isim: "discord.gg/auranest",
  detay: "24/7 Seste Aktif | by oxy",
  // {kullanici} → o an online olan hesap sayısı (bkz. metinCoz). Yer tutucuyu
  // istediğin yere koyabilirsin, detay alanında da çalışır.
  durum: "{kullanici} kullanıcı ile beraber",
  url: "https://discord.gg/auranest",
  buyukResim: "https://cdn.discordapp.com/attachments/1406285925146693642/1537155323075497984/a_a117a58ed41a8fe219425e0426ffc2cc.gif?ex=6a7e02f3&is=6a7cb173&hm=5ad06b4fbe2fc1995e244f80d15a5a8d83bb4384598a521087bccd451b865be0&",
  kucukResim: "https://cdn.discordapp.com/avatars/980449798207438908/d58887cbae9720b170070fc7e399842f.webp?size=4096",
  buton1Ad: "Muawh'ı Sunucuna Ekle",
  buton1Url: "https://discord.com/oauth2/authorize?client_id=1375944113446322338&permissions=8&scope=bot%20applications.commands",
  buton2Ad: "Copyrighted © By Oxy",
  buton2Url: "https://discord.gg/auranest",
};

async function aktiviteYukle() {
  try {
    const d = await Aktivite.findById("global");
    if (d) globalAktivite = { ...globalAktivite, ...d.toObject() };
  } catch (_) {}
  return globalAktivite;
}

function aktiviteGetir() {
  return globalAktivite;
}

/** Global aktiviteyi günceller, DB'ye yazar ve TÜM aktif clientlara uygular. */
async function aktiviteAyarla(yeni) {
  const izinli = [
    "aktif", "tur", "isim", "detay", "durum", "url",
    "buyukResim", "kucukResim", "buton1Ad", "buton1Url", "buton2Ad", "buton2Url",
  ];
  for (const k of izinli) {
    if (yeni[k] !== undefined) globalAktivite[k] = yeni[k];
  }
  try {
    await Aktivite.findByIdAndUpdate(
      "global",
      { $set: globalAktivite },
      { upsert: true },
    );
  } catch (_) {}

  // Yeni resim harici bir URL ise, hesaplara uygulamadan önce bir kez kalıcı
  // proxy yoluna çevir — yoksa ilk turda resim boş görünür.
  const ilkClient = [...selfbotIstemciler.values()].find(
    (v) => v.client && v.client.user,
  );
  if (ilkClient) {
    await resimleriHazirla(ilkClient.client, [
      globalAktivite.buyukResim,
      globalAktivite.kucukResim,
    ]).catch(() => {});
  }

  for (const [, veri] of selfbotIstemciler) {
    if (veri.client && veri.client.user) {
      presansUygula(veri);
    }
  }
  return globalAktivite;
}

/**
 * Bir kullanıcının avatar URL'ini sağlam şekilde çözer.
 * selfbot-v13'te displayAvatarURL bazen boş döndüğü için elle de kurar.
 */
function avatarUrlCoz(user) {
  if (!user) return null;
  try {
    if (typeof user.displayAvatarURL === "function") {
      const url = user.displayAvatarURL({ dynamic: true });
      if (url) return url;
    }
    if (typeof user.avatarURL === "function") {
      const url = user.avatarURL({ dynamic: true });
      if (url) return url;
    }
    if (user.avatar && user.id) {
      const ext = String(user.avatar).startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
    }
    if (user.id) {
      const idx = Number((BigInt(user.id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }
  } catch (e) {
    console.error("[avatar] çözülemedi:", e?.message || e);
  }
  return null;
}

function sesDurumGonder(veri) {
  // Girişi başarısız olan tokenlerde client null'dur (durum: "hata", guildId:
  // "hata"). Bu kontrol olmadan böyle bir hesaba mikrofon/kulaklık basılınca
  // null hatası fırlar ve uncaughtException ile tüm bot çöker.
  if (!veri || !veri.client || !veri.guildId) return;
  const guild = veri.client.guilds.cache.get(veri.guildId);
  if (!guild) return;
  guild.shard.send({
    op: 4,
    d: {
      guild_id: veri.guildId,
      channel_id: veri.sesAktif ? veri.kanalId : null,
      self_mute: veri.selfMute,
      self_deaf: veri.selfDeaf,
    },
  });
}

/**
 * O an gerçekten Discord'a bağlı olan hesap sayısı. Girişi başarısız olanların
 * `client`'ı null, henüz ready olmayanların `client.user`'ı boştur — ikisi de
 * sayılmaz, yani bu rakam "seste duran canlı hesap" demektir.
 */
function onlineSayisi() {
  let n = 0;
  for (const [, veri] of selfbotIstemciler) {
    if (veri.client && veri.client.user) n++;
  }
  return n;
}

/**
 * Aktivite metinlerindeki yer tutucuları canlı değerlerle değiştirir.
 * Şimdilik tek yer tutucu: {kullanici} → o anki online hesap sayısı.
 * Metin 5 dakikada bir (presansTicker) yeniden kurulduğu için sayı kendiliğinden tazelenir.
 */
function metinCoz(metin) {
  if (!metin || !metin.includes("{")) return metin;
  return metin.replace(/\{kullanici\}/gi, () => String(onlineSayisi()));
}

function rpcAyarla(client, opts = {}) {
  // Client yok edilmiş ya da henüz hazır değilse hiçbir şey yapma.
  // (Aksi halde yok edilmiş client üzerinde çalışınca null hatası fırlatıp
  //  uncaughtException ile tüm botu çökertir.)
  if (!client || !client.user) return;

  const { durum, ozelDurum, rpcOzel, spotify, hazirOyun } = opts;
  const aktiviteler = [];

  // Kullanıcının panelden ayarladığı özel durum (emoji + metin)
  if (ozelDurum && (ozelDurum.metin || ozelDurum.emoji)) {
    const cs = new CustomStatus(client);
    if (ozelDurum.metin) cs.setState(ozelDurum.metin);
    if (ozelDurum.emoji) {
      try {
        cs.setEmoji(ozelDurum.emoji);
      } catch (_) {}
    }
    aktiviteler.push(cs);
  }

  const ro = rpcOzel || {};

  // --- SPOTIFY DİNLEME MODU ---
  // Playlist ayarlıysa hesap "Spotify dinliyor" görünür. Oyun modu gibi bu da
  // TERTEMİZdir: global aktivitenin detay/state/buton/resim artıklarına düşmez.
  // Şarkı ilerlemesi gerçek görünsün diye zaman damgaları verilir; şarkı bitince
  // spotifyTicker sıradakine geçirir.
  //
  // Spotify AYRI BİR KATMANDIR: gerçek bir kullanıcı aynı anda hem oyun oynayıp
  // hem Spotify dinleyebildiği için oyun/normal aktiviteyi kapatmaz, üstüne biner.
  const sAktif = spotify && spotify.parcalar && spotify.parcalar.length;
  if (sAktif) {
    try {
      const parca = spotify.parcalar[spotify.index % spotify.parcalar.length];
      if (parca) {
        const bas = spotify.baslangic || Date.now();
        const sp = new SpotifyRPC(client)
          .setSongId(parca.id)
          .setStartTimestamp(bas)
          .setEndTimestamp(bas + (parca.sure || 180000));
        sp.setDetails(parca.ad || "Bilinmeyen Şarkı");
        sp.setState(parca.sanatci || "Bilinmeyen Sanatçı");
        if (parca.kapak) {
          try {
            sp.setAssetsLargeImage(parca.kapak);
            sp.setAssetsLargeText(parca.albumAd || spotify.ad || "Spotify");
          } catch (_) {}
        }
        if (parca.sanatciIds && parca.sanatciIds.length) {
          sp.setArtistIds(parca.sanatciIds);
        }
        // setAlbumId, context_uri'yi albüme çevirir — bu yüzden önce onu çağırıp
        // ardından context_uri'yi gerçek kaynağa (playlist) sabitliyoruz.
        if (parca.albumId) sp.setAlbumId(parca.albumId);
        if (spotify.playlistId) {
          sp.metadata.context_uri = `spotify:playlist:${spotify.playlistId}`;
        }
        aktiviteler.push(sp);
      }
    } catch (e) {
      console.error("[SelfBot] Spotify presence kurulamadı:", e?.message || e);
    }
  }

  // --- HAZIR OYUN MODU ---
  // `hazirOyun` (appId/isim/ikon) kullanıcının kendi rpcOzel'inden TAMAMEN
  // bağımsız bir alan — bu yüzden burada kurulan TERTEMİZ oyun presence'i
  // rpcOzel'e hiç dokunmaz/onu ezmez. Global aktivitenin detay/state/URL/
  // buton/resim alanlarına da HİÇ düşülmez — böylece "24/7 by oxy", butonlar ve
  // bozuk "?" resim gibi artıklar oyunun üstünde görünmez, gerçek oyun gibi durur.
  // Spotify açıksa da kurulur — ikisi aynı anda görünebilir (Discord buna izin verir).
  if (hazirOyun && hazirOyun.appId) {
    try {
      const pr = new RichPresence(client)
        .setApplicationId(hazirOyun.appId)
        .setType("PLAYING")
        .setName(hazirOyun.isim || "Game");
      // Oyunun kendi ikonu (varsa) — hem logoyu gösterir hem de aktivitenin
      // kesin render olmasını sağlar (asset'siz presence bazen görünmüyor).
      if (hazirOyun.ikon) {
        try {
          pr.setAssetsLargeImage(hazirOyun.ikon);
          pr.setAssetsLargeText(hazirOyun.isim || "Game");
        } catch (_) {}
      }
      aktiviteler.push(pr);
    } catch (e) {
      console.error("[SelfBot] Oyun presence kurulamadı:", e?.message || e);
    }
  }

  // --- NORMAL AKTİVİTE ---
  // Hazır oyun aktif değilse: hesaba özel alanları (rpcOzel — kullanıcının
  // "Aktivite Bilgisi/Görseller/Butonlar" ile kendi ayarladığı özel aktivite)
  // kullan, boş bırakılanlar için global aktiviteye (owner panelden ayarlanır)
  // düş. Spotify bunu da kapatmaz — böylece Spotify açıkken bile global
  // tanıtım aktivitesi görünmeye devam eder.
  const isim = ro.isim || globalAktivite.isim;
  if (!(hazirOyun && hazirOyun.appId) && globalAktivite.aktif && isim) {
    try {
      const pr = new RichPresence(client)
        .setApplicationId(rpcAppId)
        .setType(ro.tur || globalAktivite.tur || "PLAYING")
        .setName(isim);
      // {kullanici} yer tutucusu detay ve durumun ikisinde de çalışır.
      const detay = metinCoz(ro.detay || globalAktivite.detay);
      if (detay) pr.setDetails(detay);
      const durumMetni = metinCoz(ro.durum || globalAktivite.durum);
      if (durumMetni) pr.setState(durumMetni);
      const url = ro.url || globalAktivite.url;
      if (url) pr.setURL(url);

      // resimCoz: harici (Discord dışı) URL'leri önbellekten kalıcı
      // "mp:external/..." yoluna çevirir — bkz. utils/rpc-resim.js.
      const buyukResim = resimCoz(ro.buyukResim || globalAktivite.buyukResim);
      if (buyukResim) {
        try {
          pr.setAssetsLargeImage(buyukResim);
        } catch (e) {
          // Eskiden burası sessizdi ve resim sebebi anlaşılmadan kayboluyordu.
          console.error(`[SelfBot] Büyük resim reddedildi (${buyukResim}):`, e?.message || e);
        }
      }
      if (ro.buyukResimYazi) {
        try {
          pr.setAssetsLargeText(ro.buyukResimYazi);
        } catch (_) {}
      }
      const kucukResim = resimCoz(ro.kucukResim || globalAktivite.kucukResim);
      if (kucukResim) {
        try {
          pr.setAssetsSmallImage(kucukResim);
        } catch (e) {
          console.error(`[SelfBot] Küçük resim reddedildi (${kucukResim}):`, e?.message || e);
        }
      }
      if (ro.kucukResimYazi) {
        try {
          pr.setAssetsSmallText(ro.kucukResimYazi);
        } catch (_) {}
      }

      const buton1Ad = ro.buton1Ad || globalAktivite.buton1Ad;
      const buton1Url = ro.buton1Url || globalAktivite.buton1Url;
      if (buton1Ad && buton1Url) pr.addButton(buton1Ad, buton1Url);
      const buton2Ad = ro.buton2Ad || globalAktivite.buton2Ad;
      const buton2Url = ro.buton2Url || globalAktivite.buton2Url;
      if (buton2Ad && buton2Url) pr.addButton(buton2Ad, buton2Url);

      aktiviteler.push(pr);
    } catch (e) {
      console.error("[SelfBot] RichPresence kurulamadı:", e?.message || e);
    }
  }

  try {
    client.user.setPresence({
      status: durum || "online",
      activities: aktiviteler,
    });
  } catch (e) {
    console.error("[SelfBot] setPresence hatası:", e?.message || e);
  }
}

// rpcAyarla'yı asla hata fırlatmayacak şekilde sarmalar (interval içinde
// kullanılır; orada fırlayan hata uncaughtException olur).
function rpcAyarlaGuvenli(client, opts) {
  try {
    rpcAyarla(client, opts);
  } catch (e) {
    console.error("[SelfBot] RPC yenileme hatası:", e?.message || e);
  }
}

/**
 * TÜM aktif hesapların presence'ini yeniden kurar.
 *
 * Açılışta her hesap kendi ready'sinde presence'ini kurar, yani {kullanici}
 * sayısı O ANDA kaç hesap bağlıysa ona donar: 3. hesap "3" yazıp kalır.
 * Kuyruk bitince bu çağrılır ve hepsi gerçek toplamı gösterir.
 *
 * Rate-limit riski yok: her hesap KENDİ websocket'inden tek bir presence op'u
 * gönderir (limit bağlantı başına ~5/60sn), yani hesap sayısı ne olursa olsun
 * hesap başına düşen 1 güncellemedir.
 */
function tumPresansTazele() {
  let n = 0;
  for (const [, veri] of selfbotIstemciler) {
    if (veri.client && veri.client.user) {
      presansUygula(veri);
      n++;
    }
  }
  return n;
}

/** Bir hesabın güncel durum/aktivite/Spotify state'ini Discord'a uygular. */
function presansUygula(veri) {
  if (!veri || !veri.client) return;
  rpcAyarlaGuvenli(veri.client, {
    durum: veri.onlineDurum,
    ozelDurum: veri.ozelDurum,
    rpcOzel: veri.rpcOzel,
    spotify: veri.spotify,
    hazirOyun: veri.hazirOyun,
  });
}

async function selfbotBaslat(token, kanalId, baslangicMute = false, baslangicDeaf = false) {
  // Token şifreli ise çöz
  const decryptedToken = token.includes(':') ? decrypt(token) : token;

  if (selfbotIstemciler.has(token)) return;

  const client = new Client({ checkUpdate: false, makeCache: SELFBOT_CACHE });

  const veri = {
    client,
    kanalId,
    guildId: null,
    selfMute: baslangicMute,
    selfDeaf: baslangicDeaf,
    sesAktif: true,
    durum: "bekliyor",
    rpcInterval: null,
    onlineDurum: "online",
    ozelDurum: null,
    rpcOzel: null,
    // { appId, isim, ikon } — kullanıcının rpcOzel'inden tamamen bağımsız
    hazirOyun: null,
    // { playlistId, ad, parcalar[], index, baslangic } — spotifyTicker ilerletir
    spotify: null,
  };

  client.once("ready", async () => {
    console.log(`[SelfBot] ${client.user.tag} bağlandı`);
    try {
      const avatarUrl = avatarUrlCoz(client.user);
      console.log(`[SelfBot] ${client.user.tag} avatar: ${avatarUrl || "YOK"}`);
      // Kaydedilmiş tercihleri (durum/özel durum) al + isim/avatar'ı güncelle
      const pref = await Token.findOneAndUpdate(
        { token },
        { $set: {
          hesapAdi: client.user.username || client.user.tag,
          hesapGorunenAd: client.user.globalName || client.user.displayName || client.user.username,
          hesapAvatar: avatarUrl,
        }},
        { new: false },
      );
      if (pref) {
        veri.onlineDurum = pref.onlineDurum || "online";
        if (pref.ozelDurumMetin || pref.ozelDurumEmoji) {
          veri.ozelDurum = {
            metin: pref.ozelDurumMetin || "",
            emoji: pref.ozelDurumEmoji || null,
          };
        }
        const rpcAlanlari = [
          "rpcIsim", "rpcTur", "rpcDetay", "rpcDurum", "rpcUrl",
          "rpcBuyukResim", "rpcBuyukResimYazi", "rpcKucukResim", "rpcKucukResimYazi",
          "rpcButon1Ad", "rpcButon1Url", "rpcButon2Ad", "rpcButon2Url",
        ];
        if (rpcAlanlari.some((k) => pref[k])) {
          veri.rpcOzel = {
            isim: pref.rpcIsim || null,
            tur: pref.rpcTur || null,
            detay: pref.rpcDetay || null,
            durum: pref.rpcDurum || null,
            url: pref.rpcUrl || null,
            buyukResim: pref.rpcBuyukResim || null,
            buyukResimYazi: pref.rpcBuyukResimYazi || null,
            kucukResim: pref.rpcKucukResim || null,
            kucukResimYazi: pref.rpcKucukResimYazi || null,
            buton1Ad: pref.rpcButon1Ad || null,
            buton1Url: pref.rpcButon1Url || null,
            buton2Ad: pref.rpcButon2Ad || null,
            buton2Url: pref.rpcButon2Url || null,
          };
        }

        if (pref.hazirOyunAppId) {
          veri.hazirOyun = {
            appId: pref.hazirOyunAppId,
            isim: pref.hazirOyunIsim || "Game",
            ikon: pref.hazirOyunIkon || null,
          };
        } else if (pref.rpcAppId) {
          // Tek seferlik migration: eski sistemde hazır oyun, kullanıcının özel
          // aktivite alanlarını (rpcIsim/rpcTur/rpcBuyukResim) eziyordu — yani
          // appId doluysa buradaki isim/tür/resim oyunun kalıntısıdır, gerçek
          // bir özel aktivite değil. Yeni alanlara taşı, eskilerini temizle.
          veri.hazirOyun = {
            appId: pref.rpcAppId,
            isim: pref.rpcIsim || "Game",
            ikon: pref.rpcBuyukResim || null,
          };
          veri.rpcOzel = null;
          await Token.updateOne(
            { token },
            {
              $set: {
                hazirOyunAppId: pref.rpcAppId,
                hazirOyunIsim: pref.rpcIsim || null,
                hazirOyunIkon: pref.rpcBuyukResim || null,
              },
              $unset: {
                rpcAppId: "",
                rpcIsim: "",
                rpcTur: "",
                rpcBuyukResim: "",
                rpcBuyukResimYazi: "",
              },
            },
          ).catch(() => {});
        }
        // Kaydedilmiş Spotify playlist'i varsa geri yükle (bot yeniden
        // başlasa da hesap dinlemeye kaldığı yerden devam etsin).
        if (pref.spotifyPlaylistId) {
          try {
            await spotifyDurumKur(veri, pref.spotifyPlaylistId);
          } catch (e) {
            console.error("[Spotify] playlist geri yüklenemedi:", e?.message || e);
          }
        }
      }
    } catch (_) {}

    // Harici resimleri presence'ten ÖNCE kalıcı proxy yoluna çevir. Önbellek
    // paylaşıldığı için bu sadece ilk hesapta API'ye gider; kalan yüzlerce
    // hesap hazır sonucu kullanır.
    await resimleriHazirla(client, [
      globalAktivite.buyukResim,
      globalAktivite.kucukResim,
      veri.rpcOzel && veri.rpcOzel.buyukResim,
      veri.rpcOzel && veri.rpcOzel.kucukResim,
    ]).catch(() => {});

    presansUygula(veri);
    // Presans tazeleme artık HESAP BAŞINA timer ile değil, tek merkezi
    // ticker ile yapılıyor (bkz. presansTickerBaslat). Sadece "bu hesabı
    // tazele" işaretini koyuyoruz.
    veri.presansTazele = true;
    presansTickerBaslat();

    try {
      const kanal = await client.channels.fetch(kanalId).catch(() => null);
      if (kanal && (kanal.type === "GUILD_VOICE" || kanal.type === 2)) {
        veri.guildId = kanal.guild.id;
        veri.durum = "aktif";
        sesDurumGonder(veri);
        console.log(
          `[SelfBot] ${client.user.tag} → #${kanal.name} ses kanalına girdi`,
        );
      } else {
        console.warn(
          `[SelfBot] ${kanalId} bir ses kanalı değil ya da bulunamadı`,
        );
        veri.durum = "bos";
        veri.guildId = "bos";
      }
      // `Token.guildId` DB alanı sadece token EKLENİRKEN yazılan (kontrol
      // sunucusu) değeri taşıyordu, hesabın GERÇEKTE bağlandığı sunucuyu hiç
      // yansıtmıyordu. Burada gerçek değeri kalıcı hale getiriyoruz ki hesap
      // kapatılınca/hata alınca bile doğru sunucu altında görünmeye devam etsin.
      await Token.updateOne({ token }, { $set: { guildId: veri.guildId } }).catch(() => {});
    } catch (err) {
      console.error(`[SelfBot] Ses kanalına girilirken hata: ${err.message}`);
      veri.durum = "bos";
      veri.guildId = "bos";
    }
  });

  client.on("error", (err) => console.error(`[SelfBot] Hata: ${err.message}`));
  client.on("disconnect", () =>
    console.warn(`[SelfBot] ${token.slice(0, 20)}... bağlantısı kesildi`),
  );

  // Oto yeniden-bağlan: hesap sesten atılır/taşınırsa kendi kanalına geri girer
  client.on("voiceStateUpdate", (oldState, newState) => {
    try {
      if (!newState || !client.user || newState.id !== client.user.id) return;
      if (!veri.sesAktif || !veri.kanalId) return;
      if (!veri.guildId || veri.guildId === "bos" || veri.guildId === "hata") return;
      if (newState.channelId !== veri.kanalId) {
        setTimeout(() => {
          if (veri.sesAktif && veri.client) sesDurumGonder(veri);
        }, 2500);
      }
    } catch (_) {}
  });

  try {
    await client.login(decryptedToken);
    selfbotIstemciler.set(token, veri);
  } catch (err) {
    console.error(`[SelfBot] Giriş hatası: ${err.message}`);
    selfbotIstemciler.set(token, {
      client: null,
      kanalId,
      guildId: "hata",
      selfMute: false,
      selfDeaf: false,
      sesAktif: false,
      durum: "hata",
    });
  }
}

async function selfbotDurdur(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri) return;

  // Tazeleme işaretini kaldır — merkezi ticker artık bu hesaba dokunmasın.
  // (Eski hesap-başına `rpcInterval`'in yaptığı iş: client yok edildikten
  // sonra çalışıp yok edilmiş client üzerinde hata fırlatması botun çökme
  // sebebiydi. Ticker `client.user` kontrolü yapıyor ama işareti burada da
  // temizlemek durdurmayı anlık yapıyor.)
  veri.presansTazele = false;

  // Eski sürümden kalan bir interval varsa (bot güncellenmeden önce
  // başlatılmış hesaplar) yine de temizle.
  if (veri.rpcInterval) {
    clearInterval(veri.rpcInterval);
    veri.rpcInterval = null;
  }
  if (veri.client) {
    try {
      await veri.client.destroy();
    } catch (_) {}
  }
  selfbotIstemciler.delete(token);
}

function selfbotBilgi(token) {
  return selfbotIstemciler.get(token) ?? null;
}

function tumSelfbotlar() {
  return selfbotIstemciler;
}

async function toggleMikrofon(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.guildId) return null;
  veri.selfMute = !veri.selfMute;
  sesDurumGonder(veri);
  await Token.updateOne({ token }, { $set: { selfMute: veri.selfMute } }).catch(() => {});
  return veri.selfMute;
}

async function toggleKulaklik(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.guildId) return null;
  veri.selfDeaf = !veri.selfDeaf;
  sesDurumGonder(veri);
  await Token.updateOne({ token }, { $set: { selfDeaf: veri.selfDeaf } }).catch(() => {});
  return veri.selfDeaf;
}

function toggleSesModu(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.guildId) return null;
  veri.sesAktif = !veri.sesAktif;
  sesDurumGonder(veri);
  return veri.sesAktif;
}

async function kanalGuncelle(token, yeniKanalId) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client) return false; // hatalı/bağlanmamış token
  veri.kanalId = yeniKanalId;
  try {
    const kanal = await veri.client.channels
      .fetch(yeniKanalId)
      .catch(() => null);
    if (kanal && (kanal.type === "GUILD_VOICE" || kanal.type === 2)) {
      veri.guildId = kanal.guild.id;
      veri.durum = "aktif";
      sesDurumGonder(veri);
      // Gerçek sunucuyu DB'ye de yaz — ready() içindeki aynı gerekçeyle
      // (bkz. yukarısı), hesap kapatılınca/hata alınca doğru sunucu kaybolmasın.
      await Token.updateOne(
        { token },
        { $set: { guildId: veri.guildId, kanalId: yeniKanalId } },
      ).catch(() => {});
      return true;
    }
  } catch (err) {}
  veri.durum = "bos";
  veri.guildId = "bos";
  await Token.updateOne(
    { token },
    { $set: { guildId: "bos", kanalId: yeniKanalId } },
  ).catch(() => {});
  veri.client.guilds.cache.forEach((g) => {
    g.shard.send({
      op: 4,
      d: {
        guild_id: g.id,
        channel_id: null,
        self_mute: false,
        self_deaf: false,
      },
    });
  });
  return false;
}

/** Hesabın güncel profil fotoğrafı URL'i (canlı client'tan). */
function hesapAvatarUrl(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) return null;
  return avatarUrlCoz(veri.client.user);
}

/** Bir kanal ID'sinin ismini canlı client'tan çözer. */
function kanalAdiGetir(token, kanalId) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !kanalId) return null;
  const k = veri.client.channels.cache.get(kanalId);
  return k ? k.name : null;
}

/** Hesabın üye olduğu sunucular [{id, name}]. */
function hesapSunuculari(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client) return [];
  return [...veri.client.guilds.cache.values()].map((g) => ({
    id: g.id,
    name: g.name,
  }));
}

/**
 * Hesabın bir sunucuda girebildiği ses kanalları [{id, name}].
 * CONNECT izni olanları önceliklendirir; izin çözümlenemezse hepsini döner.
 */
function hesapSesKanallari(token, guildId) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client) return [];
  const g = veri.client.guilds.cache.get(guildId);
  if (!g) return [];

  const me = g.members?.me || g.members?.cache?.get(veri.client.user.id) || null;

  return [...g.channels.cache.values()]
    .filter((c) => c.type === "GUILD_VOICE" || c.type === 2)
    .filter((c) => {
      if (!me) return true;
      try {
        const perms = c.permissionsFor(me);
        return !perms || perms.has("Connect") || perms.has("CONNECT");
      } catch (_) {
        return true;
      }
    })
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
    .map((c) => ({ id: c.id, name: c.name }));
}

/** Online durumu ayarla: online | idle | dnd | invisible */
async function durumAyarla(token, durum) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  const gecerli = ["online", "idle", "dnd", "invisible"];
  if (!gecerli.includes(durum)) return { ok: false, hata: "Geçersiz durum." };
  veri.onlineDurum = durum;
  presansUygula(veri);
  Token.updateOne({ token }, { $set: { onlineDurum: durum } }).catch(() => {});
  return { ok: true };
}

/** Özel durum (custom status): emoji + metin */
async function ozelDurumAyarla(token, metin, emoji) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  veri.ozelDurum =
    metin || emoji ? { metin: metin || "", emoji: emoji || null } : null;
  presansUygula(veri);
  Token.updateOne(
    { token },
    { $set: { ozelDurumMetin: metin || null, ozelDurumEmoji: emoji || null } },
  ).catch(() => {});
  return { ok: true };
}

/** HypeSquad rozeti: bravery | brilliance | balance */
async function hypeSquadAyarla(token, ev) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  const harita = {
    bravery: "HOUSE_BRAVERY",
    brilliance: "HOUSE_BRILLIANCE",
    balance: "HOUSE_BALANCE",
  };
  // "none"/"kaldir" → rozeti kaldır (setHypeSquad(0))
  let deger;
  if (ev === "none" || ev === "kaldir" || ev === "0") {
    deger = 0;
  } else {
    deger = harita[ev] || ev;
  }
  try {
    await veri.client.user.setHypeSquad(deger);
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e?.message || "HypeSquad ayarlanamadı." };
  }
}

/** Bir sunucudaki takma adı (nickname) değiştir */
async function takmaAdAyarla(token, guildId, nick) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client) return { ok: false, hata: "Hesap aktif değil." };
  const g = veri.client.guilds.cache.get(guildId);
  if (!g) return { ok: false, hata: "Sunucu bulunamadı." };

  /**
   * ⚠️ ÜYE CACHE'TEN OKUNMAZ, FETCH EDİLİR.
   *
   * `GuildMemberManager` politika gereği kapalı (bkz. SELFBOT_CACHE), yani
   * `g.members.me` her zaman null döner ve bu fonksiyon "Üye bilgisi
   * bulunamadı" diye patlardı. Takma ad değiştirmek nadir ve kullanıcının
   * elle tetiklediği bir işlem — hesap başına sürekli üye önbelleği
   * tutmaktansa burada tek bir istek atmak çok daha ucuz.
   */
  const me =
    g.members?.me ||
    g.me ||
    (await g.members.fetch(veri.client.user.id).catch(() => null));
  if (!me) return { ok: false, hata: "Üye bilgisi bulunamadı." };
  try {
    await me.setNickname(nick || null);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e?.message || "Takma ad değiştirilemedi (yetki olmayabilir).",
    };
  }
}

/**
 * Hesabın "sunucu etiketi" (guild tag / clan identity) ayarını değiştirir.
 * guildId verilirse o sunucunun etiketini takar; boş verilirse etiketi kaldırır.
 * Hesabın o sunucuya üye olması ve sunucunun tag özelliğinin açık olması gerekir.
 */
async function guildTagAyarla(token, guildId) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  try {
    const data = guildId
      ? { identity_guild_id: guildId, identity_enabled: true }
      : { identity_guild_id: null, identity_enabled: false };
    await veri.client.api.users("@me").clan.put({ data });
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e?.message || "Guild tag ayarlanamadı." };
  }
}

// ----------------------------------------------------------------- SPOTIFY

/**
 * Hesabın Spotify state'ini kurar: playlist'i çeker, RASTGELE bir şarkıdan
 * başlatır (her hesap aynı anda aynı şarkıyı çalmasın, gerçekçi dursun) ve
 * o şarkının kapağını çözer.
 */
async function spotifyDurumKur(veri, playlistUrl) {
  const p = await playlistGetir(playlistUrl);
  veri.spotify = {
    playlistId: p.id,
    ad: p.ad,
    parcalar: p.parcalar,
    index: Math.floor(Math.random() * p.parcalar.length),
    baslangic: Date.now(),
  };
  await spotifyKapakCoz(veri.spotify);
  spotifyTickerBaslat();
  return p;
}

/**
 * Sıradaki şarkının kapağını (gerekirse) çözer. API kaynağında kapak zaten
 * gelir; embed kaynağında şarkı başına ayrı istek gerekir, o yüzden burada
 * çözülüp parça nesnesine yazılır (aynı playlist tüm hesaplarca paylaşıldığı
 * için bir kez çözülmesi yeter).
 */
async function spotifyKapakCoz(s) {
  if (!s || !s.parcalar || !s.parcalar.length) return;
  const parca = s.parcalar[s.index % s.parcalar.length];
  if (!parca || parca.kapak) return;
  parca.kapak = await parcaKapak(parca.id);
}

/**
 * Şarkıları ilerleten tek merkezi zamanlayıcı. Hesap başına ayrı timer
 * kurmak yerine (binlerce hesapta sızıntı/yük olur) 10 saniyede bir tüm
 * Spotify modundaki hesaplara bakar; şarkısı biten varsa sıradakine geçirir.
 */
/**
 * PRESANS TAZELEME — tek merkezi zamanlayıcı.
 *
 * ⚠️ Eskiden her hesap için ayrı `setInterval(..., 300000)` kuruluyordu.
 * 4000 tokende bu 4000 ayrı timer demekti:
 *   • Her timer kendi closure'ını canlı tutuyordu (bellek).
 *   • Hepsi açılış patlamasında kurulduğu için aynı saniyelere kümeleniyor,
 *     event loop'ta ani yükler oluşturuyordu.
 *   • Hesap durdurulduğunda temizlenmezse yok edilmiş client üzerinde
 *     çalışıp botu çökertiyordu.
 *
 * Tek ticker bunların hepsini çözüyor. Ayrıca hesaplar DİLİMLERE bölünüyor:
 * her turda hepsi birden değil, sırayla bir kısmı tazeleniyor — böylece
 * 5 dakikalık pencere içinde herkes bir kez güncellenirken hiçbir an
 * event loop tıkanmıyor.
 */
const PRESANS_PERIYOT_MS = 300000; // her hesap 5 dakikada bir tazelenir
const PRESANS_TICK_MS = 10000; // ticker 10 saniyede bir çalışır
const PRESANS_DILIM = Math.ceil(PRESANS_PERIYOT_MS / PRESANS_TICK_MS); // 30 dilim

let presansTicker = null;
let presansDilim = 0;

function presansTickerBaslat() {
  if (presansTicker) return;

  presansTicker = setInterval(() => {
    presansDilim = (presansDilim + 1) % PRESANS_DILIM;

    let sira = 0;
    for (const [, veri] of selfbotIstemciler) {
      if (!veri.presansTazele || !veri.client || !veri.client.user) continue;

      // Hesap kendi dilimine geldiyse tazele. Sıra numarası Map'in doğal
      // sırasından geliyor; hesap eklenip çıktıkça kayabilir ama bu zararsız:
      // önemli olan yükün zamana yayılması, hangi hesabın hangi saniyede
      // tazelendiği değil.
      if (sira % PRESANS_DILIM === presansDilim) {
        try {
          presansUygula(veri);
        } catch (err) {
          console.error("[Presans] Tazeleme hatası:", err?.message || err);
        }
      }
      sira++;
    }
  }, PRESANS_TICK_MS);

  if (presansTicker.unref) presansTicker.unref();
}

/** Test/teşhis için: ticker'ı durdurur. */
function presansTickerDurdur() {
  if (presansTicker) {
    clearInterval(presansTicker);
    presansTicker = null;
  }
}

let spotifyTicker = null;
function spotifyTickerBaslat() {
  if (spotifyTicker) return;
  spotifyTicker = setInterval(async () => {
    const simdi = Date.now();
    for (const [, veri] of selfbotIstemciler) {
      const s = veri.spotify;
      if (!s || !veri.client || !veri.client.user) continue;
      const parca = s.parcalar[s.index % s.parcalar.length];
      if (!parca) continue;
      if (simdi < s.baslangic + (parca.sure || 180000)) continue; // hâlâ çalıyor

      s.index = (s.index + 1) % s.parcalar.length;
      s.baslangic = simdi;
      try {
        await spotifyKapakCoz(s);
      } catch (_) {}
      presansUygula(veri);
    }
  }, 10000);
  if (spotifyTicker.unref) spotifyTicker.unref();
}

/** Hesabı verilen playlist'i dinliyor gösterir. */
async function spotifyAyarla(token, playlistUrl) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  let p;
  try {
    p = await spotifyDurumKur(veri, playlistUrl);
  } catch (e) {
    return { ok: false, hata: e?.message || "Playlist alınamadı." };
  }
  spotifyTickerBaslat();
  presansUygula(veri);
  await Token.updateOne(
    { token },
    { $set: { spotifyPlaylistId: p.id, spotifyPlaylistAd: p.ad } },
  ).catch(() => {});
  return { ok: true, playlist: p };
}

/** Spotify dinleme modunu kapatır (hesap normal aktivitesine döner). */
async function spotifyKapat(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri) return { ok: false, hata: "Hesap aktif değil." };
  veri.spotify = null;
  presansUygula(veri);
  await Token.updateOne(
    { token },
    { $set: { spotifyPlaylistId: null, spotifyPlaylistAd: null } },
  ).catch(() => {});
  return { ok: true };
}

/** Hesabın o an çaldığı şarkı (panelde göstermek için). */
function spotifyCalan(token) {
  const veri = selfbotIstemciler.get(token);
  const s = veri && veri.spotify;
  if (!s || !s.parcalar?.length) return null;
  const parca = s.parcalar[s.index % s.parcalar.length];
  return parca ? { ...parca, playlistAd: s.ad, playlistId: s.playlistId } : null;
}

// Hesaba özel RPC alanları ile Token şemasındaki rpc* kolonları arasındaki eşleştirme.
// Not: "appId" burada YOK — Hazır Oyun artık ayrı hazirOyun* alanlarında yaşıyor
// (bkz. hazirOyunAyarla/hazirOyunKaldir), bu yüzden bu fonksiyon onu bir daha ezemez.
const RPC_OZEL_ALANLAR = [
  "isim", "tur", "detay", "durum", "url",
  "buyukResim", "buyukResimYazi", "kucukResim", "kucukResimYazi",
  "buton1Ad", "buton1Url", "buton2Ad", "buton2Url",
];

/**
 * Hesabın Rich Presence (aktivite) alanlarını tek tek ya da toplu ayarlar:
 * isim, tur, detay, durum (state), url, büyük/küçük resim + yazıları, butonlar.
 * `degisiklikler` içinde `undefined` olan alanlara dokunulmaz (mevcut değer korunur);
 * boş string ("") verilen alan temizlenir (global aktiviteye geri düşer).
 */
async function rpcOzelAyarla(token, degisiklikler = {}) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }

  const mevcut = veri.rpcOzel || {};
  const yeni = { ...mevcut };
  const dbSet = {};
  for (const alan of RPC_OZEL_ALANLAR) {
    if (degisiklikler[alan] === undefined) continue;
    const deger = degisiklikler[alan] || null;
    yeni[alan] = deger;
    const dbAlan = "rpc" + alan.charAt(0).toUpperCase() + alan.slice(1);
    dbSet[dbAlan] = deger;
  }

  veri.rpcOzel = RPC_OZEL_ALANLAR.some((a) => yeni[a]) ? yeni : null;
  presansUygula(veri);

  if (Object.keys(dbSet).length > 0) {
    await Token.updateOne({ token }, { $set: dbSet }).catch(() => {});
  }
  return { ok: true };
}

/**
 * Hazır oyunu ayarlar. `rpcOzel`'e (kullanıcının kendi özel aktivitesine)
 * HİÇ dokunmaz — bu yüzden oyun kaldırılınca kullanıcının kendi aktivitesi
 * (varsa) sağlam kalır, yoksa zaten global'e düşer.
 */
async function hazirOyunAyarla(token, { appId, isim, ikon }) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  veri.hazirOyun = { appId, isim: isim || null, ikon: ikon || null };
  presansUygula(veri);
  await Token.updateOne(
    { token },
    { $set: { hazirOyunAppId: appId, hazirOyunIsim: isim || null, hazirOyunIkon: ikon || null } },
  ).catch(() => {});
  return { ok: true };
}

/** Hazır oyunu kaldırır — kullanıcının kendi rpcOzel'ine dokunmadan. */
async function hazirOyunKaldir(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) {
    return { ok: false, hata: "Hesap aktif değil." };
  }
  veri.hazirOyun = null;
  presansUygula(veri);
  await Token.updateOne(
    { token },
    { $set: { hazirOyunAppId: null, hazirOyunIsim: null, hazirOyunIkon: null } },
  ).catch(() => {});
  return { ok: true };
}

/**
 * Hesabı tokeni SİLMEDEN sistemden kapatır: selfbot bağlantısı kesilir,
 * DB kaydı (ve tüm presence/kanal ayarları) korunur. `hesapAc` ile geri açılır.
 */
async function hesapKapat(token) {
  // selfbotDurdur canlı kaydı (dolayısıyla bilinen son guildId'yi) siliyor —
  // önce anlık gerçek sunucuyu yakala ki hesap kapalıyken de doğru sunucu
  // altında görünmeye devam etsin (bkz. ready()'deki aynı gerekçe).
  const veri = selfbotIstemciler.get(token);
  const dbSet = { kapatildi: true };
  if (veri && veri.guildId && veri.guildId !== "hata") {
    dbSet.guildId = veri.guildId;
  }
  await selfbotDurdur(token);
  await Token.updateOne({ token }, { $set: dbSet }).catch(() => {});
  return { ok: true };
}

/** Manuel kapatılmış bir hesabı tekrar açar. */
async function hesapAc(token, kanalId, selfMute = false, selfDeaf = false) {
  await Token.updateOne({ token }, { $set: { kapatildi: false } }).catch(() => {});
  await selfbotBaslat(token, kanalId, selfMute, selfDeaf);
  return { ok: true };
}

// --- Toplu işlemler için açık-değer setter'ları (toggle değil) ---
async function mikrofonAyarla(token, mute) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.guildId) return false;
  veri.selfMute = !!mute;
  sesDurumGonder(veri);
  await Token.updateOne({ token }, { $set: { selfMute: veri.selfMute } }).catch(() => {});
  return true;
}

async function kulaklikAyarla(token, deaf) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.guildId) return false;
  veri.selfDeaf = !!deaf;
  sesDurumGonder(veri);
  await Token.updateOne({ token }, { $set: { selfDeaf: veri.selfDeaf } }).catch(() => {});
  return true;
}

function sesModuAyarla(token, aktif) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.guildId) return false;
  veri.sesAktif = !!aktif;
  sesDurumGonder(veri);
  return true;
}

/** Hesabın profil/güvenlik detayları (bilgi paneli için). */
function hesapDetay(token) {
  const veri = selfbotIstemciler.get(token);
  if (!veri || !veri.client || !veri.client.user) return null;
  const u = veri.client.user;
  let bayraklar = [];
  try {
    bayraklar = u.flags ? u.flags.toArray() : [];
  } catch (_) {}

  let arkadasSayisi = null;
  try {
    const rel = veri.client.relationships;
    if (rel && rel.friendCache) arkadasSayisi = rel.friendCache.size;
    else if (rel && rel.cache) arkadasSayisi = rel.cache.size;
  } catch (_) {}

  let ping = null;
  try {
    ping = Math.round(veri.client.ws.ping);
  } catch (_) {}

  return {
    id: u.id,
    tag: u.tag,
    username: u.username,
    globalName: u.globalName || u.displayName || null,
    avatar: avatarUrlCoz(u),
    olusturmaZamani: u.createdTimestamp || null,
    premiumType: typeof u.premiumType === "number" ? u.premiumType : 0,
    bayraklar,
    emailDogrulandi: !!u.verified,
    mfa: !!u.mfaEnabled,
    telefonVar: !!u.phone,
    sunucuSayisi: veri.client.guilds?.cache?.size ?? null,
    arkadasSayisi,
    ping,
  };
}

module.exports = {
  selfbotBaslat,
  selfbotDurdur,
  selfbotBilgi,
  tumSelfbotlar,
  toggleMikrofon,
  toggleKulaklik,
  toggleSesModu,
  kanalGuncelle,
  hesapAvatarUrl,
  kanalAdiGetir,
  hesapSunuculari,
  hesapSesKanallari,
  durumAyarla,
  ozelDurumAyarla,
  hypeSquadAyarla,
  takmaAdAyarla,
  guildTagAyarla,
  rpcOzelAyarla,
  hazirOyunAyarla,
  hazirOyunKaldir,
  hesapKapat,
  hesapAc,
  spotifyAyarla,
  spotifyKapat,
  spotifyCalan,
  mikrofonAyarla,
  kulaklikAyarla,
  sesModuAyarla,
  hesapDetay,
  aktiviteYukle,
  aktiviteGetir,
  aktiviteAyarla,
  tumPresansTazele,
  presansTickerDurdur,
};
