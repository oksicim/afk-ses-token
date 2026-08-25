const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const { selfbotBilgi, spotifyCalan } = require("./selfbot-manager");
const kuyruk = require("./token-kuyrugu");
const { renk } = require("../config");
const aktarHedefMap = require("./token-aktar-hedef");
const { aktarBanner } = require("./token-aktar-banner");
const { emoji } = require("../utils/emojiler");

const SAYFA_BOYUTU = 25;
const GIF_URL =
  "https://cdn.discordapp.com/attachments/1352986110002987058/1446706265211404328/Cizgi.gif?ex=69c9ef34&is=69c89db4&hm=87e20ee63d37e44a4ba1d9e1498858ee58a8b7d420eca1f61cc86411a2071732&";

const secilenMap = new Map();

// Bir tokenin HÂLÂ başlatılmakta olup olmadığını söyler — token bazında.
// Artık "bot tamamen hazır mı" diye bakılmaz: kuyrukta sırası gelmemiş ya da
// login edilmekte olan tokenler yükleniyor sayılır, geri kalan her hesap
// (kuyruğun ne kadarı bittiğinden bağımsız olarak) normal kullanılabilir.
function tokenYukleniyorMu(tokenStr) {
  const v = selfbotBilgi(tokenStr);
  if (v) {
    // Canlı kaydı varsa kuyruk ne derse desin başlatılmıştır (ör. kullanıcı
    // kuyruktaki bir hesabı elle "Yeniden Başlat" ile açmış olabilir).
    if (v.durum === "hata") return false; // hatalı token "yükleniyor" değildir
    // Sese girmiş (aktif) ya da kanalsız da olsa bağlanmış (bos) → hazır.
    // "bekliyor" (login oldu ama ready daha işlenmedi) → hâlâ yükleniyor.
    return !(v.client && (v.durum === "aktif" || v.durum === "bos"));
  }
  // Kaydı yok: kuyrukta sırasını bekliyor ya da login ediliyorsa yükleniyor,
  // değilse gerçekten bağlı değil.
  return kuyruk.yukleniyorMu(tokenStr);
}

// Basit ilerleme çubuğu: "▰▰▰▱▱▱▱▱▱▱" (10 kademe)
function ilerlemeCubugu(yuklenen, toplam) {
  if (!toplam) return "▱".repeat(10);
  const oran = Math.max(0, Math.min(1, yuklenen / toplam));
  const dolu = Math.round(oran * 10);
  return "▰".repeat(dolu) + "▱".repeat(10 - dolu);
}

// Tek bir token seçili ve o token hâlâ başlatılıyorsa; hazır olana kadar
// paneli izler ve token açıldığı an AYNI mesajı yerinde günceller (yeni
// mesaj atmaz). Her mesaj için tek izleyici tutulur; seçim değişince durur.
const izleyiciler = new Map(); // msgId -> { interval, tokenId }

async function tokenPanelIzle(interaction, client, guildId, sayfa, secilenIds, userId) {
  const msg = interaction.message;
  if (!msg) return;
  const msgId = msg.id;

  // Bu mesaj için önceki izleyici varsa durdur (seçim/sayfa değişmiş olabilir).
  const eski = izleyiciler.get(msgId);
  if (eski) {
    clearInterval(eski.interval);
    izleyiciler.delete(msgId);
  }

  // Sadece tek token seçiliyken izleriz.
  if (!Array.isArray(secilenIds) || secilenIds.length !== 1) return;
  const tokenId = String(secilenIds[0]);

  const t = await Token.findById(tokenId).catch(() => null);
  if (!t || !tokenYukleniyorMu(t.token)) return; // zaten hazır/hatalı → gerek yok

  const baslangic = Date.now();
  const interval = setInterval(async () => {
    try {
      // Kullanıcı başka token/sunucuya geçtiyse ya da seçimi bıraktıysa dur.
      const guncelSecim = secilenMap.get(msgId);
      const halaSecili =
        guncelSecim && guncelSecim.size === 1 && guncelSecim.has(tokenId);
      const zamanAsimi = Date.now() - baslangic > 180000; // 3 dk güvenlik sınırı

      if (!halaSecili || zamanAsimi) {
        clearInterval(interval);
        izleyiciler.delete(msgId);
        return;
      }

      if (!tokenYukleniyorMu(t.token)) {
        // Token hazır (ya da hata düştü / bot tamamen hazır) → paneli yerinde
        // yenile ki kontroller aktifleşsin.
        clearInterval(interval);
        izleyiciler.delete(msgId);
        const payload = await sayfaOlustur(client, guildId, sayfa, [tokenId], userId);
        await msg.edit(payload).catch(() => {});
      }
    } catch (_) {
      clearInterval(interval);
      izleyiciler.delete(msgId);
    }
  }, 2500);

  izleyiciler.set(msgId, { interval, tokenId });
}

function getGuildIcon(client, tumTokenler, guildId) {
  if (guildId === "bos" || guildId === "bulk") return null;
  const g = client.guilds.cache.get(guildId);
  if (g) return g.iconURL({ forceStatic: false, size: 256 });
  for (const t of tumTokenler) {
    const v = selfbotBilgi(t.token);
    if (v && v.client && v.client.guilds.cache.has(guildId)) {
      return v.client.guilds.cache
        .get(guildId)
        .iconURL({ forceStatic: false, size: 256 });
    }
  }
  return null;
}

function getGuildName(client, tumTokenler, guildId) {
  if (guildId === "bos") return "Boş Tokenler (Kanalsız)";
  if (guildId === "bulk") return "Tüm Sunucular";
  if (client) {
    const g = client.guilds.cache.get(guildId);
    if (g) return g.name;
  }
  for (const t of tumTokenler) {
    const v = selfbotBilgi(t.token);
    // v.client, girişi başarısız olan tokenlerde null'dur — kontrol şart.
    if (v && v.client && v.client.guilds.cache.has(guildId)) {
      return v.client.guilds.cache.get(guildId).name;
    }
  }
  return `Bilinmeyen Sunucu (${guildId})`;
}

/**
 * Sunucuya göre filtrelenmiş token listesi.
 *
 * `onceden` verilirse yeniden sorgulamaz — `sayfaOlustur` zaten aynı listeyi
 * çekiyor ve eskiden buraya girince İKİNCİ bir tam sorgu daha atılıyordu.
 * Owner modunda (`userId` null) bu, her panel etkileşiminde iki tam
 * koleksiyon taraması demekti.
 *
 * ⚠️ `.lean()`: bu yolda hiçbir yerde belge metodu (`save`, `getDecryptedToken`)
 * kullanılmıyor, düz nesne yeterli ve çok daha ucuz.
 */
async function getFiltreliTokenler(client, guildId, userId = null, onceden = null) {
  const tumTokenler = onceden ?? (await Token.find(userId ? { userId } : {}).lean());
  if (guildId === "bulk") return tumTokenler;
  if (guildId === "bos") {
    return tumTokenler.filter((t) => {
      const v = selfbotBilgi(t.token);
      let gId = t.guildId;
      if (v && v.guildId) {
        gId = v.guildId;
      } else {
        const kanal = client.channels.cache.get(t.kanalId);
        if (kanal && kanal.guild) gId = kanal.guild.id;
      }
      return gId === "bos";
    });
  }
  return tumTokenler.filter((t) => {
    const v = selfbotBilgi(t.token);
    let gId = t.guildId;
    if (v && v.guildId) {
      gId = v.guildId;
    } else {
      const kanal = client.channels.cache.get(t.kanalId);
      if (kanal && kanal.guild) gId = kanal.guild.id;
    }
    return gId === guildId;
  });
}

async function sayfaOlustur(client, guildId, sayfa, secilenIds = [], userId = null, panelMsgId = null) {
  // TEK sorgu; filtreleme aşağıda aynı liste üzerinden yapılıyor.
  const tumTokenler = await Token.find(userId ? { userId } : {}).lean();

  // Kullanıcı panelini açtı → kendi hesapları kuyruğun başına alınır. Böylece
  // binlerce tokenlik kuyrukta bile kendi hesapları sırayı beklemez, saniyeler
  // içinde açılır. Zaten yüklenmiş olanlar etkilenmez (idempotent).
  if (tumTokenler.length) {
    kuyruk.oncelikVer(tumTokenler.map((t) => t.token));
  }

  const tokenler = await getFiltreliTokenler(client, guildId, userId, tumTokenler);
  // Bu sunucuda (artık) gösterilecek hesap kalmadıysa (ör. son hesap kapatıldı/
  // silindi) ölü uçlu "Bu Sunucuda Hesap Yok" kartı yerine ana menüye (sunucu
  // listesine) dön — kullanıcı `.tokenkontrol` ile tekrar başlamak zorunda kalmasın.
  if (tokenler.length === 0) return anaMenuOlustur(client, userId, panelMsgId);

  const toplamSayfa = Math.max(1, Math.ceil(tokenler.length / SAYFA_BOYUTU));
  const sayfaTokenler = tokenler.slice(
    sayfa * SAYFA_BOYUTU,
    (sayfa + 1) * SAYFA_BOYUTU,
  );

  const guildIcon = getGuildIcon(client, tumTokenler, guildId);
  const sunucuAdi = getGuildName(client, tumTokenler, guildId);
  const botAvatar = client.user.displayAvatarURL({
    extension: "png",
    size: 256,
  });

  const secilenSet = new Set(secilenIds.map(String));
  const secilenTokenler = tokenler.filter((t) =>
    secilenSet.has(t._id.toString()),
  );

  // Tek token seçili ve o token hâlâ başlatılıyorsa: o tokenin kontrol
  // menüleri/butonları pasif kalır; hazır olunca tokenPanelIzle paneli yeniler.
  const tekTokenYukleniyor =
    secilenIds.length === 1 &&
    !!secilenTokenler[0] &&
    tokenYukleniyorMu(secilenTokenler[0].token);

  let topluMicLabel = "Mikrofon Kapat";
  let topluMicEmoji = "1487771408061694132";
  let topluDeafLabel = "Kulaklık Kapat";
  let topluDeafEmoji = "1487771573766066266";

  const container = new ContainerBuilder().setAccentColor(renk);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${emoji("marka")} Token Kontrol Paneli \`(Toplam: ${tokenler.length} Hesap)\``,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`tk_yeniden_basla_${guildId}_${sayfa}`)
          .setLabel("Yeniden Başlat")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("1441467958055669833")
          // Manuel kapatılmış (kapatildi) tek hesap seçiliyken devre dışı:
          // yeniden başlatma "Aç" akışıyla karışıp `kapatildi` bayrağını DB'de
          // güncellemeden hesabı canlandırmasın — tek giriş noktası "Hesabı Aç" olmalı.
          .setDisabled(
            secilenIds.length === 0 ||
              tekTokenYukleniyor ||
              (secilenIds.length === 1 && !!secilenTokenler[0]?.kapatildi),
          ),
      ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small),
  );

  if (secilenIds.length === 0) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${emoji("guncelleme")} ${sunucuAdi}\n` +
              `${emoji("nokta")} **Sunucu ID:** \`${guildId}\`\n` +
              `${emoji("kullanici")}  **Hesap Sayısı:** ${tokenler.length}\n` +
              `**Sayfa:** ${sayfa + 1}/${toplamSayfa}\n\n` +
              `*İşlem yapmak istediğiniz hesabı seçin.*`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(guildIcon || botAvatar),
        ),
    );
  } else if (secilenIds.length === 1 && secilenTokenler[0] && secilenTokenler[0].kapatildi) {
    const t = secilenTokenler[0];
    const ad = t.hesapGorunenAd || t.hesapAdi || "Bilinmeyen Hesap";
    const userAvatar = t.hesapAvatar || guildIcon || botAvatar;
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ⏸️ ${ad} — Kapalı (Manuel)\n` +
              `${emoji("simsek")} **Ses Kanalı:** <#${t.kanalId}>\n` +
              `-# Bu hesabı **Kapat/Aç** butonuyla kapattın, token silinmedi.\n` +
              `-# Tekrar açmak için aşağıdaki **Hesabı Aç** butonuna bas.`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar)),
    );
  } else if (secilenIds.length === 1 && secilenTokenler[0] && tekTokenYukleniyor) {
    const t = secilenTokenler[0];
    const { toplam: top, biten: y } = kuyruk.ilerleme();
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${emoji("yukleniyor")} Token Başlatılıyor...\n` +
              `${emoji("simsek")} **Ses Kanalı:** <#${t.kanalId}>\n` +
              `${ilerlemeCubugu(y, top)} \`${y}/${top}\`\n` +
              `-# Bu hesap **sıranın başına alındı**, birkaç saniye içinde açılır.\n` +
              `-# Hazır olunca panel **otomatik** aktifleşecek — beklemene gerek yok.`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(guildIcon || botAvatar),
        ),
    );
  } else if (secilenIds.length === 1 && secilenTokenler[0]) {
    const t = secilenTokenler[0];
    const v = selfbotBilgi(t.token);
    const ad =
      v && v.client
        ? (v.client.user.tag ?? v.client.user.username)
        : v && v.durum === "hata"
          ? "❌ Hatalı Token"
          : "Bağlı Değil";
    const mic =
      v && v.client
        ? v.selfMute
          ? `${emoji("mikrofonKapali")} Kapalı`
          : `${emoji("mikrofonAcik")} Açık`
        : "❓";
    const deaf =
      v && v.client
        ? v.selfDeaf
          ? `${emoji("kulaklikKapali")} Kapalı`
          : `${emoji("kulaklikAcik")} Açık`
        : "❓";
    const sesM =
      v && v.client
        ? v.sesAktif
          ? `${emoji("basarili")} Açık`
          : `${emoji("hata")} Kapalı`
        : "❓";
    const userAvatar =
      v && v.client
        ? v.client.user.displayAvatarURL({ forceStatic: false, size: 256 })
        : guildIcon || botAvatar;

    // Spotify modu açıksa o an çalan şarkıyı göster.
    const calan = spotifyCalan(t.token);
    const spotifySatir = calan
      ? `\n${emoji("nokta")} **Spotify:** ${calan.ad} — *${calan.sanatci}*`
      : "";

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${emoji("profil")} ${ad}\n` +
              `${emoji("simsek")}**Ses Kanalı:** <#${t.kanalId}>\n` +
              `${emoji("mikrofonAcik")} **Mikrofon:** ${mic}\n` +
              `${emoji("kulaklikAcik")} **Kulaklık:** ${deaf}\n` +
              `${emoji("ilerlemeBar")} **Ses Modu:** ${sesM}` +
              spotifySatir,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar)),
    );
  } else {
    const anyMicOpen = secilenTokenler.some((t) => {
      const v = selfbotBilgi(t.token);
      return v && !v.selfMute;
    });
    const anyDeafOpen = secilenTokenler.some((t) => {
      const v = selfbotBilgi(t.token);
      return v && !v.selfDeaf;
    });
    topluMicLabel = anyMicOpen ? "Mikrofon Kapat" : "Mikrofon Aç";
    topluMicEmoji = anyMicOpen ? "1487771408061694132" : "1487771362646036652";
    topluDeafLabel = anyDeafOpen ? "Kulaklık Kapat" : "Kulaklık Aç";
    topluDeafEmoji = anyDeafOpen
      ? "1487771573766066266"
      : "1487771512416112650";

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${emoji("bilgi")} Toplu İşlem Modu\n` +
              `${emoji("kullanici")}  **Seçilen Hesap Sayısı:** ${secilenIds.length}/${tokenler.length}\n` +
              `${emoji("istatistik")}  **Durum:** Toplu kontroller yayında!`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            "https://cdn.discordapp.com/emojis/1473203679762055192.webp?size=96&animated=true",
          ),
        ),
    );
  }

  if (sayfaTokenler.length > 0) {
    const secenekler = sayfaTokenler.map((t) => {
      const v = selfbotBilgi(t.token);
      let emoji, ad;
      if (t.kapatildi) {
        emoji = "⏸️";
        ad = t.hesapGorunenAd || t.hesapAdi || "Kapalı (Manuel)";
      } else if (!v) {
        // Kaydı yoksa: hâlâ kuyruktaysa "başlatılıyor", değilse bağlı değil.
        if (kuyruk.yukleniyorMu(t.token)) {
          emoji = "⏳";
          ad = "Başlatılıyor...";
        } else {
          emoji = "🔴";
          ad = "Bağlı Değil";
        }
      } else if (v.durum === "hata") {
        emoji = "❌";
        ad = "Hatalı Token";
      } else if (v.durum === "bos") {
        emoji = "🟡";
        ad = v.client
          ? (v.client.user.tag ?? v.client.user.username)
          : "Boş Token";
      } else if (v.durum === "aktif") {
        emoji = "🟢";
        ad = v.client ? (v.client.user.tag ?? v.client.user.username) : "Aktif";
      } else {
        emoji = "🔴";
        ad = v.client
          ? (v.client.user.tag ?? v.client.user.username)
          : "Bağlı Değil";
      }
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${emoji} ${ad}`)
        .setDescription(`Kanal: ${t.kanalId}`)
        .setValue(t._id.toString())
        .setDefault(secilenSet.has(t._id.toString()));
    });

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`tk_hesap_${guildId}_${sayfa}`)
          .setPlaceholder("Hesap seçin...")
          .setMinValues(0)
          .setMaxValues(sayfaTokenler.length)
          .addOptions(secenekler),
      ),
    );
  }

  // `.tokenaktar <kullanıcı>` ile açılan panellerde akış tamamen farklıdır:
  // Ayarlar menüsü (Ses Modu/Kanal Düzenle/.../Tokeni Kaldır) hiç gösterilmez,
  // hesap seçildikten sonra direkt "Hesapları Aktar" onayına geçilir.
  const aktarModu = !!(panelMsgId && aktarHedefMap.has(panelMsgId));

  if (secilenIds.length > 0 && !aktarModu) {
    // Tokeni silmeden hesabı sistemden kapatma/açma — tek seçimde o hesabın
    // kendi durumunu, toplu seçimde çoğunluk yönünü (herhangi biri açıksa
    // "Kapat") yansıtır. Bkz. tk-ayarlar-menu.js "kapat_ac" dalı.
    let kapatAcLabel;
    let kapatAcEmoji;
    if (secilenIds.length === 1 && secilenTokenler[0]) {
      kapatAcLabel = secilenTokenler[0].kapatildi ? "Hesabı Aç" : "Hesabı Kapat";
      kapatAcEmoji = secilenTokenler[0].kapatildi
        ? "1477601697940504682"
        : "1477602467309948938";
    } else {
      const herhangiAcik = secilenTokenler.some((t) => !t.kapatildi);
      kapatAcLabel = herhangiAcik ? "Hesapları Kapat" : "Hesapları Aç";
      kapatAcEmoji = herhangiAcik
        ? "1477602467309948938"
        : "1477601697940504682";
    }

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`tk_ayarlar_${guildId}_${sayfa}`)
          .setPlaceholder("Ayarlar")
          .setDisabled(tekTokenYukleniyor)
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Ses Modu")
              .setDescription("Seçili hesapların ses kanalı bağlantısını yönet")
              .setValue("ses_modu")
              .setEmoji("1441468991184048362"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Kanalı Düzenle")
              .setDescription("Seçili hesapların ses kanalını güncelle")
              .setValue("kanal_duzenle")
              .setEmoji("1477617753950261343"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Guild Tag Al")
              .setDescription("Seçili hesaplara bir sunucunun etiketini (guild tag) tak")
              .setValue("guild_tag")
              .setEmoji("1477602610554077298"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Presence Ayarla")
              .setDescription("Durum, aktivite bilgisi, görseller ve butonları tek/toplu tam kontrolle ayarla")
              .setValue("presence")
              .setEmoji("1477602610554077298"),
            new StringSelectMenuOptionBuilder()
              .setLabel(kapatAcLabel)
              .setDescription("Tokeni silmeden hesabı sistemden kapat/aç")
              .setValue("kapat_ac")
              .setEmoji(kapatAcEmoji),
            new StringSelectMenuOptionBuilder()
              .setLabel("Tokeni Kaldır")
              .setDescription("Seçili hesapları sistemden sil")
              .setValue("token_kaldir")
              .setEmoji("1477602056637513788"),
          ),
      ),
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tk_geri_${guildId}_${sayfa}`)
        .setEmoji("1487776830206378196")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(sayfa === 0),
      new ButtonBuilder()
        .setCustomId(`tk_ileri_${guildId}_${sayfa}`)
        .setEmoji("1487776787919274135")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(sayfa >= toplamSayfa - 1),
      new ButtonBuilder()
        .setCustomId(`tk_tumunu_${guildId}_${sayfa}`)
        .setLabel("Tümünü Seç")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("1477602705517051968")
        .setDisabled(tokenler.length === 0),
      new ButtonBuilder()
        .setCustomId(`tk_sayfayi_${guildId}_${sayfa}`)
        .setLabel("Sayfayı Seç")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("1441471651165503550")
        .setDisabled(sayfaTokenler.length === 0),
    ),
  );

  if (secilenIds.length > 0 && aktarModu) {
    // Aktarım modunda tek amaç bu — mic/kulaklık/kapat-aç/ayarlar hiç
    // gösterilmez, direkt onaya geçilir (bkz. tk-aktar-baslat-buton.js).
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tk_aktar_baslat_${guildId}_${sayfa}`)
          .setLabel(`${secilenIds.length} Hesabı Aktar`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji("1477602705517051968")
          .setDisabled(tekTokenYukleniyor),
        new ButtonBuilder()
          .setCustomId(`tk_panel_kapat_${guildId}`)
          .setLabel("Paneli Kapat")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("1477602617226956912"),
      ),
    );
  } else if (secilenIds.length > 0) {
    let micLabel;
    let micEmoji;
    let deafLabel;
    let deafEmoji;

    if (secilenIds.length === 1 && secilenTokenler[0]) {
      const v = selfbotBilgi(secilenTokenler[0].token);
      if (v) {
        micLabel = v.selfMute ? "Mikrofon Aç" : "Mikrofon Kapat";
        micEmoji = v.selfMute ? "1487771362646036652" : "1487771408061694132";
        deafLabel = v.selfDeaf ? "Kulaklık Aç" : "Kulaklık Kapat";
        deafEmoji = v.selfDeaf ? "1487771512416112650" : "1487771573766066266";
      } else {
        micLabel = topluMicLabel;
        micEmoji = topluMicEmoji;
        deafLabel = topluDeafLabel;
        deafEmoji = topluDeafEmoji;
      }
    } else {
      micLabel = topluMicLabel;
      micEmoji = topluMicEmoji;
      deafLabel = topluDeafLabel;
      deafEmoji = topluDeafEmoji;
    }

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tk_mic_secili_${guildId}_${sayfa}`)
          .setLabel(micLabel)
          .setEmoji(micEmoji)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(tekTokenYukleniyor),
        new ButtonBuilder()
          .setCustomId(`tk_deaf_secili_${guildId}_${sayfa}`)
          .setLabel(deafLabel)
          .setEmoji(deafEmoji)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(tekTokenYukleniyor),
        new ButtonBuilder()
          .setCustomId(`tk_panel_kapat_${guildId}`)
          .setLabel("Paneli Kapat")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("1477602617226956912"),
      ),
    );
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(GIF_URL),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# Copyright © by Auranest 2026 Developed by Oxy",
      ),
    );

  const components = aktarModu
    ? [aktarBanner(aktarHedefMap.get(panelMsgId)), container]
    : [container];
  return { flags: MessageFlags.IsComponentsV2, components };
}

// `.tokenkontrol`'ün ana menüsü: sunucu listesi + sistem menüsü. Hem komutun
// ilk çalıştırılışında (komutlar/tokenkontrol.js) hem bir panel içi filtre
// (belirli bir sunucu görünümü) artık hesap göstermediğinde (ör. son hesap
// kapatıldı/silindi) AYNI kod yolundan üretilir — böylece ölü uçlu "Bu
// Sunucuda Hesap Yok" yerine kullanıcı hep kullanılabilir bir menüye döner.
// `userId` null verilirse TÜM kullanıcıların tokenleri (owner "hepsi/all" modu).
async function anaMenuOlustur(client, userId = null, panelMsgId = null) {
  const tumTokenler = await Token.find(userId ? { userId } : {}).lean();

  if (tumTokenler.length === 0) {
    const bosContainer = new ContainerBuilder()
      .setAccentColor(0xed4245)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "❌ **Kayıtlı Token Bulunamadı**\nSisteme henüz hiç token eklenmemiş.",
        ),
      );
    const bosComponents =
      panelMsgId && aktarHedefMap.has(panelMsgId)
        ? [aktarBanner(aktarHedefMap.get(panelMsgId)), bosContainer]
        : [bosContainer];
    return { flags: MessageFlags.IsComponentsV2, components: bosComponents };
  }

  const sunucuMap = new Map();
  let hataCount = 0;
  for (const t of tumTokenler) {
    const v = selfbotBilgi(t.token);
    let gId = t.guildId;
    if (v && v.durum === "hata") {
      gId = "hata";
      hataCount++;
    } else if (v && v.guildId) {
      gId = v.guildId;
    } else {
      const kanal = client.channels.cache.get(t.kanalId);
      if (kanal && kanal.guild) gId = kanal.guild.id;
    }
    if (!sunucuMap.has(gId)) sunucuMap.set(gId, 0);
    sunucuMap.set(gId, sunucuMap.get(gId) + 1);
  }

  const secenekler = [];
  for (const [guildId, adet] of sunucuMap.entries()) {
    if (guildId === "hata") {
      continue;
    } else if (guildId === "bos") {
      secenekler.push(
        new StringSelectMenuOptionBuilder()
          .setLabel("Boş Tokenler")
          .setDescription(`${adet} hesap kanalsız veya geçersiz kanalda`)
          .setValue("bos")
          .setEmoji("1477602531143188615"),
      );
    } else {
      let sunucuAdi = null;
      const localGuild = client.guilds.cache.get(guildId);
      if (localGuild) {
        sunucuAdi = localGuild.name;
      } else {
        const r = tumTokenler.find((tok) => {
          const sv = selfbotBilgi(tok.token);
          return (sv && sv.guildId === guildId) || tok.guildId === guildId;
        });
        if (r) {
          const sv = selfbotBilgi(r.token);
          if (sv && sv.client && sv.client.guilds.cache.has(guildId)) {
            sunucuAdi = sv.client.guilds.cache.get(guildId).name;
          }
        }
      }
      secenekler.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(sunucuAdi || `Bilinmeyen Sunucu (${guildId})`)
          .setDescription(`${adet} kayıtlı hesap`)
          .setValue(guildId)
          .setEmoji("1477602531143188615"),
      );
    }
  }

  const sunucuMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("tk_sunucu")
      .setPlaceholder("Kontrol etmek istediğiniz sunucuyu seçin...")
      .addOptions(secenekler.slice(0, 25)),
  );

  const sistemMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("tk_sistem")
      .setPlaceholder("Sistem İşlemleri")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Tüm Sunucular")
          .setDescription("Tüm sunuculardaki tokenleri tek panelde gör ve yönet")
          .setValue("bulk")
          .setEmoji("1477602527678697473"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Hata Bildir")
          .setDescription("Sistem hakkında bir hata bildirin")
          .setValue("hataBildir")
          .setEmoji("1477602699649355807"),
      ),
  );

  const gercekSunucuSayisi = [...sunucuMap.keys()].filter(
    (k) => k !== "hata" && k !== "bos",
  ).length;

  const container = new ContainerBuilder()
    .setAccentColor(renk)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${emoji("marka")} Token Kontrol Paneli \`(Toplam: ${gercekSunucuSayisi} sunucu)\``,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${emoji("simsek")} Hoş Geldiniz!\n${emoji("okSari")} **Tokenlerinizi** kolayca yönetin\n${emoji("istatistik")} Tüm kontroller elinizin altında!`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(
            "https://cdn.discordapp.com/emojis/1441476492176396358.webp?animated=true",
          ),
        ),
    );

  const askidaQuery = userId ? { userId, askida: true } : { askida: true };
  const kapatildiQuery = userId ? { userId, kapatildi: true } : { kapatildi: true };
  const askidaCount = await Token.countDocuments(askidaQuery);
  const kapatildiCount = await Token.countDocuments(kapatildiQuery);

  if (hataCount > 0) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji("uyari")} **Uyarı!** \`${hataCount}\` adet giriş yapamayan tokenin bulunuyor.\n-# \`.hatalitoken\` yazarak kontrol edebilirsin.`,
        ),
      );
  }

  if (askidaCount > 0) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏸️ **Askıda!** \`${askidaCount}\` adet askıya alınmış tokenin bulunuyor.\n-# \`.tokenkurtar\` yazarak kurtarabilirsin.`,
        ),
      );
  }

  if (kapatildiCount > 0) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏸️ **Kapalı!** \`${kapatildiCount}\` adet manuel kapattığın hesabın var.\n-# İlgili sunucudan hesabı seçip **Hesabı Aç**'a basarak açabilirsin.`,
        ),
      );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small),
  );

  if (secenekler.length > 0) {
    container.addActionRowComponents(sunucuMenu);
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "⚠️ **Aktif sunucu bulunamadı.** Tüm tokenler hatalı durumda.",
      ),
    );
  }

  container
    .addActionRowComponents(sistemMenu)
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(GIF_URL),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# Copyright © by Auranest 2026 Developed by oxy",
      ),
    );

  const components =
    panelMsgId && aktarHedefMap.has(panelMsgId)
      ? [aktarBanner(aktarHedefMap.get(panelMsgId)), container]
      : [container];
  return { flags: MessageFlags.IsComponentsV2, components };
}

module.exports = {
  SAYFA_BOYUTU,
  secilenMap,
  getFiltreliTokenler,
  sayfaOlustur,
  tokenPanelIzle,
  tokenYukleniyorMu,
  anaMenuOlustur,
};
