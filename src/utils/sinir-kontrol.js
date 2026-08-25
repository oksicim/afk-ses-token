const Setup = require("../models/Setup");
const Token = require("../models/Token");
const Paket = require("../models/Paket");
const { toplamSinir } = require("./paket-config");

async function kullaniciBilgi(member, guildId) {
    const setup = await Setup.findOne({ guildId });

    const aktifPaketler = await Paket.find({
        userId: member.id,
        guildId,
        aktif: true,
        bitis: { $gt: new Date() },
    });

    const paketSinir = toplamSinir(aktifPaketler, guildId);

    if (paketSinir > 0) {
        const aktifSayi = await Token.countDocuments({ userId: member.id, askida: { $ne: true } });
        const kalanHak = Math.max(0, paketSinir - aktifSayi);

        return {
            sinir: paketSinir,
            kalanHak,
            setup,
            rolVar: true,
            boosterMi: false,
            aktifSayi,
            paketli: true,
            paketler: aktifPaketler,
        };
    }

    if (!setup || (!setup.gerekliRolId && !setup.boosterRolId)) {
        return { sinir: null, kalanHak: null, setup: null, rolVar: true };
    }

    const boosterMi = setup.boosterRolId && member.roles.cache.has(setup.boosterRolId);

    let sinir = 0;
    let rolVar = false;

    if (boosterMi) {
        sinir = setup.boosterSinir;
        rolVar = true;
    } else if (setup.gerekliRolId && member.roles.cache.has(setup.gerekliRolId)) {
        sinir = setup.normalSinir;
        rolVar = true;
    }

    if (!rolVar) {
        return { sinir: 0, kalanHak: 0, setup, rolVar: false, boosterMi: false, aktifSayi: 0, paketli: false };
    }

    const aktifSayi = await Token.countDocuments({ userId: member.id, askida: { $ne: true } });
    const kalanHak = Math.max(0, sinir - aktifSayi);

    return { sinir, kalanHak, setup, rolVar: true, boosterMi, aktifSayi, paketli: false };
}

module.exports = { kullaniciBilgi };
