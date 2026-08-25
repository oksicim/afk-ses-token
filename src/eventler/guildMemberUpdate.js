const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require("discord.js");
const Token = require("../models/Token");
const Setup = require("../models/Setup");
const Paket = require("../models/Paket");
const { selfbotDurdur } = require("../utils/selfbot-manager");
const { emoji } = require("../utils/emojiler");

module.exports = {
    name: "guildMemberUpdate",
    once: false,
    async execute(oldMember, newMember, client) {
        /**
         * ⚠️ ESKİ ÜYE EKSİKSE ÇIK.
         *
         * `oldMember` partial olduğunda `roles.cache` gerçeği yansıtmaz —
         * boş görünür. O hâlde "rol kaybedildi" sonucuna varmak, hiçbir şey
         * yapmamış bir kullanıcının TÜM tokenlerini askıya alır. Emin
         * olamıyorsak dokunmamak doğrusu.
         */
        if (oldMember.partial) return;

        /**
         * ⚠️ ROL DEĞİŞMEDİYSE HİÇ SORGU ATMA.
         *
         * Bu olay her üye güncellemesinde tetikleniyor: takma ad değişimi,
         * avatar, sunucu profili, timeout... Eskiden bunların HEPSİ için
         * önce `Setup.findOne` sonra `Paket.find` çalışıyordu. Aktif bir
         * sunucuda bu, hiçbir işe yaramayan binlerce sorgu demek.
         *
         * Rol karşılaştırması bellekte ve bedava; sorgular ancak gerçekten
         * rol değiştiyse başlıyor.
         */
        const eskiRoller = oldMember.roles.cache;
        const yeniRoller = newMember.roles.cache;
        if (
            eskiRoller.size === yeniRoller.size &&
            eskiRoller.every((rol) => yeniRoller.has(rol.id))
        ) {
            return;
        }

        const setup = await Setup.findOne({ guildId: newMember.guild.id });
        if (!setup) return;

        // Bu sunucuda hiç rol kurulmamışsa askıya alma mantığı zaten çalışmaz.
        if (!setup.boosterRolId && !setup.gerekliRolId) return;

        const eskiBooster = setup.boosterRolId && oldMember.roles.cache.has(setup.boosterRolId);
        const yeniBooster = setup.boosterRolId && newMember.roles.cache.has(setup.boosterRolId);
        const eskiGerekli = setup.gerekliRolId && oldMember.roles.cache.has(setup.gerekliRolId);
        const yeniGerekli = setup.gerekliRolId && newMember.roles.cache.has(setup.gerekliRolId);

        const eskiRolVardi = eskiBooster || eskiGerekli;
        const yeniRolVar = yeniBooster || yeniGerekli;

        if (!eskiRolVardi || yeniRolVar === eskiRolVardi) {
            if (eskiBooster && !yeniBooster && yeniGerekli) {
            } else {
                return;
            }
        }

        /**
         * Paket kontrolü BURAYA taşındı.
         *
         * Eskiden fonksiyonun başındaydı, yani rolü hiç değişmemiş herkes
         * için de çalışıyordu. Sonuç aynı (aktif paketi olan askıya
         * alınmaz), sadece sorgu gerçekten gerektiğinde atılıyor.
         */
        const aktifPaketler = await Paket.find({
            userId: newMember.id,
            guildId: newMember.guild.id,
            aktif: true,
            bitis: { $gt: new Date() },
        }, { _id: 1 }).lean();

        if (aktifPaketler.length > 0) return;

        const aktifTokenler = await Token.find(
            { userId: newMember.id, askida: { $ne: true } },
            { token: 1 },
        ).lean();
        if (aktifTokenler.length === 0) return;

        // İşaretleme tek yazımda — eskiden token başına ayrı `save()` gidiyordu.
        await Token.updateMany(
            { _id: { $in: aktifTokenler.map((t) => t._id) } },
            { $set: { askida: true } },
        );

        let askiyaAlinan = 0;
        for (const t of aktifTokenler) {
            try {
                await selfbotDurdur(t.token);
                askiyaAlinan++;
            } catch (err) {
                console.error("[GuildMemberUpdate] Selfbot durdurulamadı:", err.message);
            }
        }

        if (setup.logKanalId) {
            const logKanal = newMember.guild.channels.cache.get(setup.logKanalId);
            if (logKanal) {
                let sebep = "";
                if (eskiBooster && !yeniBooster && yeniGerekli) {
                    sebep = `Booster rolü kaybedildi (gerekli rol hâlâ var → \`.tokenkurtar\` ile ${setup.normalSinir} token kurtarabilir)`;
                } else if (eskiBooster && !yeniBooster && !yeniGerekli) {
                    sebep = "Booster rolü ve gerekli rol kaybedildi";
                } else if (eskiGerekli && !yeniGerekli && !yeniBooster) {
                    sebep = "Gerekli rol kaybedildi";
                } else {
                    sebep = "Rol değişikliği tespit edildi";
                }

                const c = new ContainerBuilder()
                    .setAccentColor(0xed4245)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${emoji("uyari")} **Token Askıya Alma**\n**Kullanıcı:** <@${newMember.id}>\n**Askıya Alınan:** \`${askiyaAlinan}\` token\n**Sebep:** ${sebep}`,
                        ),
                    );

                logKanal.send({ flags: MessageFlags.IsComponentsV2, components: [c] }).catch(() => {});
            }
        }

        console.log(`[GuildMemberUpdate] ${newMember.user.tag} → ${askiyaAlinan} token askıya alındı`);
    },
};
