// Eski encryption key ile şifrelenmiş tokenleri yeni key ile yeniden şifreler
const mongoose = require('mongoose');
const crypto = require('crypto');
const { mongoUri } = require('../config');

// Anahtarlar kaynak koda yazılmaz. PowerShell örneği:
//   $env:OLD_ENCRYPTION_KEY = "eski-anahtar"
//   $env:NEW_ENCRYPTION_KEY = "yeni-anahtar"
//   npm run change-key
const OLD_KEY = process.env.OLD_ENCRYPTION_KEY;
const NEW_KEY = process.env.NEW_ENCRYPTION_KEY;

if (!OLD_KEY || !NEW_KEY) {
    console.error('❌ OLD_ENCRYPTION_KEY ve NEW_ENCRYPTION_KEY ortam değişkenleri zorunludur.');
    console.error('Ayrıntılı kullanım için README.md içindeki Güvenlik bölümüne bak.');
    process.exit(1);
}

if (OLD_KEY === NEW_KEY) {
    console.error('❌ Eski ve yeni şifreleme anahtarı aynı olamaz.');
    process.exit(1);
}

if (OLD_KEY.length < 32 || NEW_KEY.length < 32) {
    console.error('❌ Eski ve yeni şifreleme anahtarı en az 32 karakter olmalıdır.');
    process.exit(1);
}

const IV_LENGTH = 16;

// Eski key ile decrypt
function decryptOld(text) {
    if (!text) return null;
    try {
        const key = crypto.createHash('sha256').update(OLD_KEY).digest();
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[Decrypt Old] Hata:', error.message);
        return null;
    }
}

// Yeni key ile encrypt
function encryptNew(text) {
    if (!text) return null;

    const key = crypto.createHash('sha256').update(NEW_KEY).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Yeni anahtara göre parmak izi.
 *
 * crypto-helper.js'deki türetmenin BİREBİR aynısı olmak zorunda — orası
 * config'teki (yani hâlâ ESKİ) anahtarı okuduğu için burada elle kuruluyor.
 */
function parmakIziYeni(duzMetin) {
    if (!duzMetin) return null;
    const key = crypto.createHash('sha256').update(NEW_KEY).digest();
    const hashKey = crypto.createHmac('sha256', key).update('token-parmak-izi').digest();
    return crypto.createHmac('sha256', hashKey).update(String(duzMetin).trim()).digest('hex');
}

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

async function changeEncryptionKey() {
    try {
        await mongoose.connect(mongoUri);
        console.log('[Key Change] MongoDB bağlantısı kuruldu');

        const tokens = await Token.find({});
        console.log(`[Key Change] ${tokens.length} token bulundu`);

        let basarili = 0;
        let hatali = 0;

        for (const tokenDoc of tokens) {
            try {
                // Eski key ile decrypt et
                const decrypted = decryptOld(tokenDoc.token);

                if (!decrypted) {
                    console.error(`[Key Change] Token decrypt edilemedi: ${tokenDoc._id}`);
                    hatali++;
                    continue;
                }

                // Yeni key ile encrypt et
                const reEncrypted = encryptNew(decrypted);

                // ⚠️ Parmak izi de YENİLENMELİ. `tokenHash` şifreleme
                // anahtarından türetilen bir HMAC anahtarıyla üretiliyor
                // (bkz. crypto-helper.js); anahtar değişince eski özetler
                // artık hiçbir şeyle eşleşmez ve mükerrer kontrolü sessizce
                // çalışmaz hâle gelirdi.
                const yeniHash = parmakIziYeni(decrypted);

                // Güncelle
                await Token.updateOne(
                    { _id: tokenDoc._id },
                    { $set: { token: reEncrypted, tokenHash: yeniHash } }
                );

                basarili++;
                console.log(`[Key Change] Token yeniden şifrelendi: ${tokenDoc._id}`);
            } catch (error) {
                console.error(`[Key Change] Token işlenirken hata (${tokenDoc._id}):`, error.message);
                hatali++;
            }
        }

        console.log('\n[Key Change] Tamamlandı!');
        console.log(`✓ Başarılı: ${basarili}`);
        console.log(`✗ Hatalı: ${hatali}`);

        if (basarili > 0) {
            console.log('\n⚠️  ÖNEMLİ: Şimdi config.js dosyasındaki encryptionKey değerini yeni key ile değiştir!');
            console.log(`Yeni key: ${NEW_KEY}`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('[Key Change] Hata:', error);
        process.exit(1);
    }
}

changeEncryptionKey();
