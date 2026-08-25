const { ActivityType } = require("discord.js");
const { aktiviteYukle, tumPresansTazele } = require("../utils/selfbot-manager");
const Token = require("../models/Token");
const { paketKontrolBaslat } = require("../utils/paket-kontrol");
const kuyruk = require("../utils/token-kuyrugu");
const { acilistaEsitle } = require("../utils/emoji-sync");
const { ayarlariYukle } = require("../utils/paket-ayar");

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);

        // Botun kendi durumu: mor "Yayınlıyor" (Streaming) etiketi.
        // NOT: "Yayınlıyor" etiketinin görünmesi için type Streaming olmalı
        // VE geçerli bir Twitch/YouTube URL'si verilmeli. Aşağıdaki metni ve
        // URL'yi istediğin gibi değiştirebilirsin.
        client.user.setPresence({
            status: "online",
            activities: [
                {
                    name: "oksi was here",
                    type: ActivityType.Streaming,
                    url: "https://www.twitch.tv/discord",
                },
            ],
        });

        // Emojiler tokenlerden ÖNCE çözülür: aksi halde açılış sırasında
        // gönderilen mesajlar unicode yedeğiyle çıkardı.
        await acilistaEsitle(client).catch((e) =>
            console.error("[Emoji] Eşitleme hatası:", e?.message || e),
        );

        // Paket ayarları (limit + rol) belleğe alınır. Limit hesabı senkron
        // yapıldığı için bu önbellek şart (bkz. utils/paket-ayar.js).
        const ayarSayisi = await ayarlariYukle().catch((e) => {
            console.error("[PaketAyar] Yüklenemedi:", e?.message || e);
            return 0;
        });
        console.log(`[PaketAyar] ${ayarSayisi} paket ayarı yüklendi.`);

        await aktiviteYukle(); // global aktiviteyi tokenlerden önce yükle

        /**
         * ⚠️ `.select().lean()` ŞART.
         *
         * Eskiden bu sorgu her tokeni tam bir mongoose belgesi olarak
         * getiriyordu: 40+ alan, değişiklik takibi, getter/setter'lar. Oysa
         * kuyruğun ihtiyacı yalnızca 4 alan. 4000 tokende aradaki fark on
         * megabaytlarla ölçülüyor ve bu dizi `hatalilariYenidenDene` için
         * yükleme boyunca (dakikalarca) canlı tutuluyor.
         */
        const tumTokenler = await Token.find(
            { askida: { $ne: true }, kapatildi: { $ne: true } },
            { token: 1, kanalId: 1, selfMute: 1, selfDeaf: 1 },
        ).lean();

        // Tokenler arka planda, paralel işçilerle yüklenir. Bot BEKLEMEZ:
        // komutlar ve paneller ilk saniyeden itibaren çalışır. Bir kullanıcı
        // panelini açtığında kendi tokenleri kuyruğun başına alınır, yani
        // 4000 tokenlik kuyruğun sonunu beklemez (bkz. token-kuyrugu.js).
        console.log(
            `🔄 ${tumTokenler.length} token arka planda yükleniyor ` +
            `(${kuyruk.ES_ZAMANLI} paralel) — bot şimdiden kullanılabilir.`,
        );

        for (const t of tumTokenler) {
            kuyruk.kuyrugaEkle({
                token: t.token,
                kanalId: t.kanalId,
                selfMute: t.selfMute ?? false,
                selfDeaf: t.selfDeaf ?? false,
            });
        }

        // Paket kontrolü tokenleri beklemez.
        paketKontrolBaslat(client);

        // Kuyruk boşalınca hatalı düşenleri bir tur daha dene.
        const basladi = Date.now();
        (async () => {
            while (!kuyruk.bittiMi()) {
                await new Promise((r) => setTimeout(r, 5000));
            }
            const sn = Math.round((Date.now() - basladi) / 1000);
            console.log(`🚀 ${tumTokenler.length} token yüklendi (${sn} sn).`);
            await kuyruk.hatalilariYenidenDene(tumTokenler);

            // Artık kaç hesabın gerçekten online olduğu belli — herkesin
            // aktivitesini bir kez tazele ki {kullanici} sayısı, açılış
            // sırasında dondurduğu düşük değer yerine gerçek toplamı göstersin.
            const tazelenen = tumPresansTazele();
            console.log(`🔁 ${tazelenen} hesabın aktivitesi tazelendi (kullanıcı sayısı güncellendi).`);
        })();
    },
};
