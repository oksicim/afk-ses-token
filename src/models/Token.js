const mongoose = require("mongoose");
const { encrypt, decrypt, tokenParmakIzi } = require("../utils/crypto-helper");

const tokenSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    // NOT: buradaki `unique` bilerek KALDIRILDI — rastgele IV yüzünden hiçbir
    // zaman çalışmıyordu ve çalışıyor sanmak yanıltıcıydı. Gerçek benzersizlik
    // aşağıdaki `tokenHash` indeksinde.
    token: { type: String, required: true },
    // Düz metnin anahtarlı özeti; mükerrer kontrolü bunun üzerinden yapılır.
    tokenHash: { type: String, default: null },
    hesapAdi: { type: String, default: null },
    hesapGorunenAd: { type: String, default: null },
    hesapAvatar: { type: String, default: null },
    kanalId: { type: String, required: true },
    selfMute: { type: Boolean, default: false },
    selfDeaf: { type: Boolean, default: false },
    askida: { type: Boolean, default: false },
    onlineDurum: { type: String, default: "online" }, // online|idle|dnd|invisible
    ozelDurumMetin: { type: String, default: null },
    ozelDurumEmoji: { type: String, default: null },
    // Hesaba özel Rich Presence (RPC) ayarları — boş olan alanlar global aktiviteden miras alır.
    // Bunlar SADECE kullanıcının "Aktivite Bilgisi/Görseller/Butonlar" ile kendi
    // ayarladığı özel aktiviteyi tutar — Hazır Oyun artık ayrı alanlarda yaşıyor
    // (aşağıya bkz.), böylece biri diğerini ezmiyor.
    rpcIsim: { type: String, default: null },
    rpcAppId: { type: String, default: null }, // DEPRECATED: eski hazır oyun alanı, sadece tek seferlik migration için okunur
    rpcTur: { type: String, default: null }, // PLAYING|STREAMING|LISTENING|WATCHING|COMPETING
    rpcDetay: { type: String, default: null },
    rpcDurum: { type: String, default: null }, // RPC state satırı
    rpcUrl: { type: String, default: null },
    rpcBuyukResim: { type: String, default: null },
    rpcBuyukResimYazi: { type: String, default: null },
    rpcKucukResim: { type: String, default: null },
    rpcKucukResimYazi: { type: String, default: null },
    rpcButon1Ad: { type: String, default: null },
    rpcButon1Url: { type: String, default: null },
    rpcButon2Ad: { type: String, default: null },
    rpcButon2Url: { type: String, default: null },
    // Hazır Oyun — kullanıcının kendi özel aktivitesinden (yukarıdaki rpc*
    // alanları) TAMAMEN bağımsız. Oyun kaldırılınca sadece bu 3 alan temizlenir,
    // kullanıcının kendi rpcIsim/rpcDetay/... alanlarına dokunulmaz.
    hazirOyunAppId: { type: String, default: null },
    hazirOyunIsim: { type: String, default: null },
    hazirOyunIkon: { type: String, default: null },
    // Kullanıcının "Kapat" butonuyla bilerek pasife aldığı hesaplar (token
    // silinmez, selfbot bağlantısı kesilir ve açılışta otomatik başlatılmaz).
    // `askida` alanından bilerek AYRI tutulur — o paket-limit sisteminin
    // otomatik askıya alması için, bu ise kullanıcının kendi manuel tercihi.
    kapatildi: { type: Boolean, default: false },
    // Spotify "dinliyor" modu: playlist ayarlıysa hesap sürekli bu playlist'i
    // çalıyormuş gibi görünür (şarkı bitince sıradakine geçer).
    spotifyPlaylistId: { type: String, default: null },
    spotifyPlaylistAd: { type: String, default: null },
    eklenmeZamani: { type: Date, default: Date.now },
});

// ── İndeksler ──────────────────────────────────────────────────────────────
//
// Bunlar olmadan aşağıdaki sorguların HEPSİ tüm koleksiyonu tarıyordu
// (COLLSCAN). Birkaç yüz tokende fark edilmez ama binlerce tokende her
// panel açılışı, her limit kontrolü ve her paket turu tüm koleksiyonu
// okur — yüksek kullanımdaki en büyük kalem buydu.

// `kullaniciBilgi()` her token ekleme/panel açılışında çağırıyor; ayrıca
// paket-kontrol ve guildMemberUpdate aynı deseni kullanıyor.
tokenSchema.index({ userId: 1, askida: 1 });

// Panelde sunucu bazlı listeleme.
tokenSchema.index({ guildId: 1 });

// Açılışta yüklenecek tokenlerin seçimi (`askida` ve `kapatildi` değil).
tokenSchema.index({ askida: 1, kapatildi: 1 });

/**
 * TOKEN PARMAK İZİ — mükerrer kontrolü için.
 *
 * ⚠️ `token` alanındaki `unique: true` HİÇBİR ZAMAN ÇALIŞMIYOR: `encrypt()`
 * her çağrıda rastgele IV üretiyor, yani aynı token her kaydedilişinde
 * FARKLI bir şifreli metne dönüşüyor ve benzersizlik indeksi hiç tetiklenmiyor.
 * Kod da bunu bildiği için mükerrer kontrolünü "tüm tokenleri çek ve tek tek
 * decrypt et" diye yapıyordu — 4000 tokende her ekleme 4000 AES çözme demek.
 *
 * `tokenHash` düz metnin anahtarlı SHA-256 özeti: aynı token → aynı özet,
 * yani tek indeksli sorguyla mükerrer bulunur. Özet geri çevrilemez, düz
 * anahtarlı olmadığı için de sözlük saldırısına açık değil.
 *
 * `sparse`: eski kayıtlar backfill edilene kadar alanı olmayan belgeler
 * indekste yer almaz, yoksa hepsi `null` sayılıp benzersizlik çakışırdı.
 */
tokenSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });

// Token kaydedilmeden önce şifrele
tokenSchema.pre('save', async function() {
    if (this.isModified('token') && this.token) {
        // Eğer token zaten şifrelenmiş değilse (: içermiyorsa) şifrele
        if (!this.token.includes(':')) {
            // Parmak izi DÜZ METİNDEN, şifrelemeden ÖNCE alınır — şifreli
            // metnin özeti her seferinde değişeceği için işe yaramazdı.
            this.tokenHash = tokenParmakIzi(this.token);
            this.token = encrypt(this.token);
        } else if (!this.tokenHash) {
            // Zaten şifreli gelen (migration/anahtar değişimi) kayıtlarda
            // parmak izini çözüp üretebiliyorsak üret.
            const duz = decrypt(this.token);
            if (duz) this.tokenHash = tokenParmakIzi(duz);
        }
    }
});

// Token okunduğunda otomatik çöz
tokenSchema.methods.getDecryptedToken = function() {
    return decrypt(this.token);
};

module.exports = mongoose.model("Token", tokenSchema);
