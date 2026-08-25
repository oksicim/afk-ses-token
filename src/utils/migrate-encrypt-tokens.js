// Mevcut veritabanındaki şifrelenmemiş tokenleri şifreler
const mongoose = require('mongoose');
const { mongoUri } = require('../config');
const { encrypt, tokenParmakIzi } = require('./crypto-helper');

const tokenSchema = new mongoose.Schema({
    userId: String,
    guildId: String,
    token: String,
    tokenHash: String,
    hesapAdi: String,
    hesapGorunenAd: String,
    kanalId: String,
    selfMute: Boolean,
    selfDeaf: Boolean,
    askida: Boolean,
    eklenmeZamani: Date,
});

const Token = mongoose.model('Token', tokenSchema);

async function migrateTokens() {
    try {
        await mongoose.connect(mongoUri);
        console.log('[Migration] MongoDB bağlantısı kuruldu');

        const tokens = await Token.find({});
        console.log(`[Migration] ${tokens.length} token bulundu`);

        let sifreli = 0;
        let zatenSifreli = 0;

        for (const tokenDoc of tokens) {
            // Eğer token zaten şifrelenmiş ise (: içeriyorsa) atla
            if (tokenDoc.token.includes(':')) {
                zatenSifreli++;
                continue;
            }

            // Parmak izi DÜZ METİNDEN alınır, şifrelemeden önce. Mükerrer
            // kontrolü artık bu alan üzerinden yapılıyor; yazılmazsa eski
            // kayıtlar mükerrer sorgusunda hiç görünmez.
            const hash = tokenParmakIzi(tokenDoc.token);

            // Token'ı şifrele
            const encryptedToken = encrypt(tokenDoc.token);

            // Güncelle
            await Token.updateOne(
                { _id: tokenDoc._id },
                { $set: { token: encryptedToken, tokenHash: hash } }
            );

            sifreli++;
            console.log(`[Migration] Token şifrelendi: ${tokenDoc._id}`);
        }

        console.log('\n[Migration] Tamamlandı!');
        console.log(`✓ Şifrelenen: ${sifreli}`);
        console.log(`- Zaten şifreli: ${zatenSifreli}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Hata:', error);
        process.exit(1);
    }
}

migrateTokens();
