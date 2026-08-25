const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require("discord.js");
const Paket = require("../models/Paket");
const Token = require("../models/Token");
const { paketler, toplamSinir } = require("./paket-config");
const { selfbotDurdur } = require("./selfbot-manager");

async function suresiDolanPaketleriKontrolEt(client) {
    const simdi = new Date();
    // `.lean()`: artık `p.save()` kullanılmıyor (toplu `updateMany` var),
    // yani mongoose belgesine gerek yok.
    const dolanPaketler = await Paket.find(
        { aktif: true, bitis: { $lte: simdi } },
        { userId: 1, guildId: 1, paketAdi: 1, sinir: 1 },
    ).lean();

    if (dolanPaketler.length === 0) return;

    const kullaniciGruplari = new Map();
    for (const p of dolanPaketler) {
        const key = `${p.userId}_${p.guildId}`;
        if (!kullaniciGruplari.has(key)) kullaniciGruplari.set(key, []);
        kullaniciGruplari.get(key).push(p);
    }

    for (const [key, paketListesi] of kullaniciGruplari) {
        const userId = paketListesi[0].userId;
        const guildId = paketListesi[0].guildId;

        // Tek yazımda hepsi — eskiden paket başına ayrı `save()` gidiyordu.
        await Paket.updateMany(
            { _id: { $in: paketListesi.map((p) => p._id) } },
            { $set: { aktif: false } },
        );

        // ⚠️ `paketAdi` projeksiyonda ŞART: `toplamSinir()` limiti
        // paket-config'ten okuyor ve bunun için id'ye ihtiyacı var. Alan
        // gelmezse sessizce kayıttaki eski değere düşer.
        const kalanAktifPaketler = await Paket.find(
            { userId, guildId, aktif: true },
            { paketAdi: 1, sinir: 1 },
        ).lean();
        const yeniToplamSinir = toplamSinir(kalanAktifPaketler, guildId);

        // Askıya alınacakları seçmek için sadece `token` lazım.
        const aktifTokenler = await Token.find(
            { userId, askida: { $ne: true } },
            { token: 1 },
        ).lean();
        let askiyaAlinan = 0;

        if (aktifTokenler.length > yeniToplamSinir) {
            const fazla = aktifTokenler.length - yeniToplamSinir;
            const askiyaAlinacaklar = aktifTokenler.slice(aktifTokenler.length - fazla);

            // İşaretleme tek yazımda; eskiden token başına ayrı `save()` gidiyordu.
            await Token.updateMany(
                { _id: { $in: askiyaAlinacaklar.map((t) => t._id) } },
                { $set: { askida: true } },
            );

            // Selfbot durdurma tek tek olmak zorunda (her biri ayrı bağlantı).
            for (const t of askiyaAlinacaklar) {
                try {
                    await selfbotDurdur(t.token);
                } catch (err) {
                    console.error("[PaketKontrol] Selfbot durdurulamadı:", err?.message || err);
                }
                askiyaAlinan++;
            }
        }

        /**
         * Süresi dolan paketlerin rollerini geri al.
         *
         * ⚠️ `paketRolunuAl` aynı rolü veren BAŞKA aktif paket varsa
         * dokunmuyor — paketler yukarıda zaten `aktif: false` yapıldığı
         * için bu kontrol doğru sonucu veriyor.
         */
        const guildNesnesi = client.guilds.cache.get(guildId);
        if (guildNesnesi) {
            const { paketRolunuAl } = require("./paket-rol");
            for (const p of paketListesi) {
                await paketRolunuAl(guildNesnesi, userId, p.paketAdi).catch((err) =>
                    console.warn("[PaketKontrol] Rol alınamadı:", err?.message || err),
                );
            }
        }

        const dolanAdlar = paketListesi.map(p => {
            const info = paketler.find(pp => pp.id === p.paketAdi);
            return info?.ad || p.paketAdi;
        }).join(", ");

        const Setup = require("../models/Setup");
        const setup = await Setup.findOne({ guildId });
        if (setup?.logKanalId) {
            const guild = client.guilds.cache.get(guildId);
            const logKanal = guild?.channels.cache.get(setup.logKanalId);
            if (logKanal) {
                const c = new ContainerBuilder()
                    .setAccentColor(0xffa500)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### ⏰ Paket Süresi Doldu!\n\n` +
                            `**Kullanıcı:** <@${userId}>\n` +
                            `**Biten Paketler:** ${dolanAdlar}\n` +
                            `**Yeni Limit:** \`${yeniToplamSinir}\`\n` +
                            (askiyaAlinan > 0
                                ? `**Askıya Alınan:** \`${askiyaAlinan}\` token`
                                : `**Token askıya alınmadı.**`),
                        ),
                    );
                logKanal.send({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(() => {});
            }
        }

        console.log(`[PaketKontrol] ${userId} → ${paketListesi.length} paket süresi doldu, ${askiyaAlinan} token askıya alındı`);
    }
}

let kontrolInterval = null;
let calisiyor = false;

/**
 * Turu ÇAKIŞMADAN çalıştırır.
 *
 * ⚠️ Guard olmadan gerçek bir hata vardı: tur, süresi dolan her paket için
 * `p.save()` ve askıya alınan her token için `t.save()` + `selfbotDurdur()`
 * çağırıyor. Çok sayıda paket aynı anda dolduğunda bu 5 dakikayı aşabilir;
 * aşınca interval bir sonraki turu başlatıyor ve İKİ tur aynı paketleri
 * görüyordu. İkinci tur, birincinin henüz `aktif: false` yapmadığı paketleri
 * tekrar işleyip aynı kullanıcının fazladan tokenini askıya alabilirdi.
 *
 * Ayrıca `setInterval` içindeki async fonksiyonun reddi hiçbir yerde
 * yakalanmıyordu — sessizce `unhandledRejection`'a düşüyordu.
 */
async function turuCalistir(client) {
    if (calisiyor) {
        console.warn("[PaketKontrol] Önceki tur hâlâ sürüyor, bu tur atlandı.");
        return;
    }
    calisiyor = true;

    try {
        await suresiDolanPaketleriKontrolEt(client);
    } catch (err) {
        console.error("[PaketKontrol] Tur hatası:", err?.message || err);
    } finally {
        calisiyor = false;
    }
}

function paketKontrolBaslat(client) {
    turuCalistir(client);
    kontrolInterval = setInterval(() => {
        turuCalistir(client);
    }, 5 * 60 * 1000);
    if (kontrolInterval.unref) kontrolInterval.unref();
    console.log("[PaketKontrol] Otomatik paket süre kontrolü başlatıldı (5dk aralık)");
}

function paketKontrolDurdur() {
    if (kontrolInterval) {
        clearInterval(kontrolInterval);
        kontrolInterval = null;
    }
}

module.exports = { paketKontrolBaslat, paketKontrolDurdur, suresiDolanPaketleriKontrolEt };
