const Paket = require("../models/Paket");
const { paketRolu } = require("./paket-ayar");

/**
 * PAKET ROLLERİ
 *
 * `.paket-setup` ile bir pakete rol atanmışsa, kod kullanıldığında rol
 * verilir; paket bitince ya da kaldırılınca geri alınır.
 */

/** Bot bu rolü verebilir mi? Veremiyorsa sebebini döner. */
function rolVerilebilirMi(guild, rolId) {
  const rol = guild.roles.cache.get(rolId);
  if (!rol) return { olur: false, sebep: "rol silinmiş" };
  if (rol.managed) return { olur: false, sebep: "entegrasyon rolü" };

  const ben = guild.members.me;
  if (!ben) return { olur: false, sebep: "bot üyesi bulunamadı" };
  if (!ben.permissions.has("ManageRoles")) return { olur: false, sebep: "botta rol yönetme yetkisi yok" };
  if (rol.position >= ben.roles.highest.position) {
    return { olur: false, sebep: "rol botun rolünden yüksek" };
  }

  return { olur: true, rol };
}

/**
 * Paketin rolünü verir.
 *
 * ⚠️ Hata FIRLATMAZ. Rol verilemezse (silinmiş, hiyerarşi, yetki) paketin
 * kendisi yine de geçerli olmalı — müşteri parasını ödedi, rol veremedik
 * diye limiti de kaybetmesi saçma olurdu. Sonuç çağırana bildiriliyor,
 * o da kullanıcıya uyarı gösterebiliyor.
 */
async function paketRolunuVer(guild, userId, paketId) {
  if (!guild) return { verildi: false };

  const rolId = paketRolu(guild.id, paketId);
  if (!rolId) return { verildi: false };

  const kontrol = rolVerilebilirMi(guild, rolId);
  if (!kontrol.olur) {
    console.warn(`[PaketRol] ${paketId} rolü verilemedi (${guild.id}): ${kontrol.sebep}`);
    return { verildi: false, rolId, hata: kontrol.sebep };
  }

  const uye = await guild.members.fetch(userId).catch(() => null);
  if (!uye) return { verildi: false, rolId, hata: "üye sunucuda değil" };

  if (uye.roles.cache.has(rolId)) return { verildi: false, rolId, zatenVar: true };

  try {
    await uye.roles.add(rolId, `Paket alındı: ${paketId}`);
    return { verildi: true, rolId };
  } catch (err) {
    console.warn(`[PaketRol] ${paketId} rolü eklenemedi:`, err?.message || err);
    return { verildi: false, rolId, hata: err?.message || "bilinmeyen hata" };
  }
}

/**
 * Paketin rolünü geri alır.
 *
 * ⚠️ AYNI ROLÜ VEREN BAŞKA AKTİF PAKET VARSA ROL ALINMAZ. İki farklı paket
 * aynı role bağlanmış olabilir; biri bitince diğerinin hakkını da silmek
 * yanlış olurdu.
 */
async function paketRolunuAl(guild, userId, paketId) {
  if (!guild) return { alindi: false };

  const rolId = paketRolu(guild.id, paketId);
  if (!rolId) return { alindi: false };

  // Kullanıcının kalan aktif paketlerinden herhangi biri aynı rolü veriyor mu?
  const kalanlar = await Paket.find(
    { userId, guildId: guild.id, aktif: true },
    { paketAdi: 1 },
  ).lean();

  const baskasiVeriyor = kalanlar.some(
    (p) => p.paketAdi !== paketId && paketRolu(guild.id, p.paketAdi) === rolId,
  );
  if (baskasiVeriyor) return { alindi: false, rolId, korundu: true };

  const uye = await guild.members.fetch(userId).catch(() => null);
  if (!uye || !uye.roles.cache.has(rolId)) return { alindi: false, rolId };

  try {
    await uye.roles.remove(rolId, `Paket bitti: ${paketId}`);
    return { alindi: true, rolId };
  } catch (err) {
    console.warn(`[PaketRol] ${paketId} rolü alınamadı:`, err?.message || err);
    return { alindi: false, rolId, hata: err?.message || "bilinmeyen hata" };
  }
}

module.exports = { paketRolunuVer, paketRolunuAl, rolVerilebilirMi };
