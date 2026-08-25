const crypto = require('crypto');
const config = require('../config');

// Şifreleme anahtarı - config.js'den alınır
const ENCRYPTION_KEY = config.encryptionKey || 'your-32-character-secret-key!!';
const IV_LENGTH = 16; // AES için initialization vector uzunluğu

// Anahtar türetme bir kez yapılır. Eskiden her encrypt/decrypt çağrısında
// yeniden sha256'lanıyordu; açılışta binlerce token çözülürken bu tamamen
// boşa giden CPU demekti.
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

// Parmak izi anahtarı şifreleme anahtarından TÜRETİLİR ama aynısı değildir.
// Aynı anahtarı iki farklı amaçla (şifreleme + MAC) kullanmak kriptografide
// kaçınılan bir şey; ayrı bir etiketle türetmek bunu bedavaya çözüyor.
const HASH_KEY = crypto.createHmac('sha256', KEY).update('token-parmak-izi').digest();

/**
 * Düz metin tokenin DETERMİNİSTİK parmak izi.
 *
 * Neden var: `encrypt()` her çağrıda rastgele IV ürettiği için aynı token
 * her kaydedilişinde farklı şifreli metne dönüşüyor — yani şifreli metin
 * üzerinden "bu token zaten kayıtlı mı?" sorusu cevaplanamıyor. Kod bunu
 * tüm tokenleri çekip tek tek çözerek yapıyordu (N token = N AES çözme).
 * Bu özet aynı girdi için hep aynı çıktıyı verdiğinden tek indeksli sorgu
 * yetiyor.
 *
 * Düz SHA-256 yerine HMAC: token'lar yüksek entropili olsa da, anahtarsız
 * özet DB'yi ele geçiren birinin özet karşılaştırmasıyla doğrulama
 * yapmasına izin verirdi.
 */
function tokenParmakIzi(duzMetin) {
    if (!duzMetin) return null;
    return crypto.createHmac('sha256', HASH_KEY).update(String(duzMetin).trim()).digest('hex');
}

/**
 * Token'ı şifreler
 * @param {string} text - Şifrelenecek token
 * @returns {string} - Şifrelenmiş token (iv:encrypted formatında)
 */
function encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // IV'yi başa ekle (decrypt için gerekli)
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Token'ı çözer
 * @param {string} text - Şifrelenmiş token (iv:encrypted formatında)
 * @returns {string} - Orijinal token
 */
function decrypt(text) {
    if (!text) return null;

    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[Crypto] Şifre çözme hatası:', error.message);
        return null;
    }
}

module.exports = { encrypt, decrypt, tokenParmakIzi };
