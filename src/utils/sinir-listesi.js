const { emoji } = require("./emojiler");
const { tumAyarlar } = require("./paket-ayar");

/**
 * SINIRLAMALAR LİSTESİ
 *
 * Kullanıcının hangi rolle kaç token açabileceğini tek yerde toplar:
 *
 *   • `.setup` ile ayarlanan gerekli rol + booster rolü
 *   • `.paket-setup` ile ROLÜ OLAN paketler
 *
 * ⚠️ Rolü olmayan paketler LİSTEDE ÇIKMAZ. Bu bölüm "şu role sahipsen şu
 * kadar hakkın var" diyor; rolü olmayan bir paket kod girilerek alınıyor,
 * yani buraya yazmak kullanıcıya sahip olamayacağı bir rol vaat etmek olurdu.
 *
 * Liste limite göre BÜYÜKTEN KÜÇÜĞE sıralanır — en cazip hak en üstte.
 */
function sinirlamaListesi(guildId, setup) {
  const girdiler = [];

  if (setup?.gerekliRolId) {
    girdiler.push({
      rolId: setup.gerekliRolId,
      limit: setup.normalSinir ?? 0,
      kaynak: "rol",
    });
  }

  if (setup?.boosterRolId) {
    girdiler.push({
      rolId: setup.boosterRolId,
      limit: setup.boosterSinir ?? 0,
      kaynak: "rol",
    });
  }

  for (const p of tumAyarlar(guildId)) {
    if (!p.rolId) continue;
    girdiler.push({ rolId: p.rolId, limit: p.sinir, ad: p.ad, kaynak: "paket" });
  }

  /**
   * Aynı rol birden fazla kez geçebilir (ör. booster rolü bir pakete de
   * bağlanmışsa). Kullanıcı o rolle EN YÜKSEK hakkı alacağı için tekilleştirip
   * en büyüğünü tutuyoruz — yoksa panelde aynı rol iki farklı sayıyla
   * görünür ve hangisinin geçerli olduğu belirsiz kalırdı.
   */
  const enIyi = new Map();
  for (const g of girdiler) {
    const mevcut = enIyi.get(g.rolId);
    if (!mevcut || g.limit > mevcut.limit) enIyi.set(g.rolId, g);
  }

  return [...enIyi.values()].sort((a, b) => b.limit - a.limit);
}

/** Panelde gösterilecek metni üretir. */
function sinirlamaMetni(guildId, setup) {
  const liste = sinirlamaListesi(guildId, setup);

  if (liste.length === 0) {
    return "**Sınırlamalar**\n▸ Henüz ayarlanmadı";
  }

  const satirlar = liste.map(
    (g) => `${emoji("asagi")} <@&${g.rolId}> - \`${g.limit}\` limit`,
  );

  return `**Sınırlamalar**\n${satirlar.join("\n")}`;
}

module.exports = { sinirlamaListesi, sinirlamaMetni };
