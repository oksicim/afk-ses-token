const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");
const { renk } = require("../config");
const { emoji, sahipMi } = require("../utils/emojiler");
const { paketler, paketBul } = require("../utils/paket-config");
const { kodlariUret, kodBicimle, kodNormalize } = require("../utils/kod-uygula");
const Kod = require("../models/Kod");

function kutu(icerik, aksan = renk) {
  return new ContainerBuilder()
    .setAccentColor(aksan)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(icerik));
}

function yardim() {
  const paketListesi = paketler
    .map((p) => `\`${p.id}\` — ${p.ad} (+${p.sinir})`)
    .join("\n");

  return (
    `${emoji("bilgi")} **Kod Komutları**\n\n` +
    `\`.kod uret <paketId> <adet> [gün] [not]\`\n` +
    `-# Örnek: \`.kod uret diamond 5 30 itemsatis-ocak\`\n\n` +
    `\`.kod liste\` — paket başına kalan kod sayısı\n` +
    `\`.kod bilgi <kod>\` — kod kimde, ne zaman kullanılmış\n` +
    `\`.kod sil <kod>\` — kullanılmamış kodu iptal eder\n\n` +
    `${emoji("nokta")} **Paketler**\n${paketListesi}`
  );
}

module.exports = {
  name: "kod",
  async execute(message, args) {
    if (!sahipMi(message.author.id)) return;

    const altKomut = (args[0] || "").toLowerCase();

    // ── Üret ────────────────────────────────────────────────────────────
    if (altKomut === "uret" || altKomut === "üret") {
      const paketId = args[1];
      const adet = Number.parseInt(args[2] ?? "1", 10);
      const gun = Number.parseInt(args[3] ?? "30", 10);
      const not = args.slice(4).join(" ") || null;

      if (!paketId || !paketBul(paketId)) {
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            kutu(
              `${emoji("hata")} Geçersiz paket.\n\n` +
                paketler.map((p) => `\`${p.id}\` — ${p.ad} (+${p.sinir})`).join("\n"),
              0xed4245,
            ),
          ],
        });
      }

      const sonuc = await kodlariUret({
        paketId,
        adet: Number.isNaN(adet) ? 1 : adet,
        gun: Number.isNaN(gun) ? 30 : gun,
        olusturan: message.author.id,
        not,
      });

      if (!sonuc.ok) {
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(`${emoji("hata")} ${sonuc.hata}`, 0xed4245)],
        });
      }

      const liste = sonuc.kodlar.map((k) => kodBicimle(k)).join("\n");

      /**
       * ⚠️ Kodlar DM'e gider, kanala DEĞİL.
       *
       * Kod = para. Kanala yazılırsa yetkili silmeden önce gören herkes
       * kopyalayabilir ve ilk kullanan alır. DM başarısız olursa (kapalı
       * DM) kodlar zaten üretildi, kanala düşürmek yerine uyarı veriyoruz;
       * `.kod liste` ile durumu görüp gerekirse yeniden üretebilirsin.
       */
      const dmGonderildi = await message.author
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            kutu(
              `${emoji("hediye")} **${sonuc.kodlar.length} kod üretildi**\n` +
                `**Paket:** ${sonuc.paket.ad} (+${sonuc.paket.sinir})\n` +
                `**Süre:** ${sonuc.gun} gün` +
                (not ? `\n**Not:** ${not}` : "") +
                `\n\`\`\`\n${liste}\n\`\`\``,
            ),
          ],
        })
        .then(() => true)
        .catch(() => false);

      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          kutu(
            dmGonderildi
              ? `${emoji("basarili")} **${sonuc.kodlar.length}** kod üretildi ve DM'den gönderildi.\n` +
                  `-# ${sonuc.paket.ad} • ${sonuc.gun} gün`
              : `${emoji("uyari")} **${sonuc.kodlar.length}** kod üretildi ama **DM'in kapalı**.\n` +
                  `-# DM'i açıp \`.kod liste\` ile kontrol et; kodlar veritabanında duruyor.`,
            dmGonderildi ? 0x57f287 : 0xfaa61a,
          ),
        ],
      });
    }

    // ── Liste ───────────────────────────────────────────────────────────
    if (altKomut === "liste") {
      const sayimlar = await Kod.aggregate([
        { $group: { _id: { paketId: "$paketId", kullanildi: "$kullanildi" }, adet: { $sum: 1 } } },
      ]);

      const harita = new Map();
      for (const s of sayimlar) {
        const mevcut = harita.get(s._id.paketId) || { bos: 0, kullanilmis: 0 };
        if (s._id.kullanildi) mevcut.kullanilmis += s.adet;
        else mevcut.bos += s.adet;
        harita.set(s._id.paketId, mevcut);
      }

      if (harita.size === 0) {
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(`${emoji("bilgi")} Henüz hiç kod üretilmemiş.`)],
        });
      }

      const satirlar = [...harita.entries()].map(([paketId, s]) => {
        const p = paketBul(paketId);
        return (
          `${p ? p.emoji : emoji("nokta")} **${p ? p.ad : paketId}**\n` +
          `-# Kullanılmamış: \`${s.bos}\` • Kullanılmış: \`${s.kullanilmis}\``
        );
      });

      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          kutu(`${emoji("istatistik")} **Kod Durumu**\n\n${satirlar.join("\n")}`),
        ],
      });
    }

    // ── Bilgi ───────────────────────────────────────────────────────────
    if (altKomut === "bilgi") {
      const kod = kodNormalize(args[1]);
      if (!kod) {
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(`${emoji("hata")} Kullanım: \`.kod bilgi <kod>\``, 0xed4245)],
        });
      }

      const kayit = await Kod.findOne({ kod }).lean();
      if (!kayit) {
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(`${emoji("hata")} Böyle bir kod yok.`, 0xed4245)],
        });
      }

      const p = paketBul(kayit.paketId);
      const olusturma = Math.floor(new Date(kayit.olusturmaTarihi).getTime() / 1000);

      let govde =
        `${emoji("pano")} **Kod Bilgisi**\n` +
        `**Kod:** \`${kodBicimle(kayit.kod)}\`\n` +
        `**Paket:** ${p ? p.ad : kayit.paketId} (+${p ? p.sinir : "?"})\n` +
        `**Süre:** ${kayit.gun} gün\n` +
        `**Üretilme:** <t:${olusturma}:f>` +
        (kayit.not ? `\n**Not:** ${kayit.not}` : "");

      if (kayit.kullanildi) {
        const kullanim = Math.floor(new Date(kayit.kullanimTarihi).getTime() / 1000);
        govde +=
          `\n\n${emoji("basarili")} **Kullanılmış**\n` +
          `**Kullanan:** <@${kayit.kullanan}> (\`${kayit.kullanan}\`)\n` +
          `**Tarih:** <t:${kullanim}:f> (<t:${kullanim}:R>)`;
      } else {
        govde += `\n\n${emoji("acik")} **Henüz kullanılmamış**`;
      }

      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [kutu(govde, kayit.kullanildi ? 0xfaa61a : 0x57f287)],
      });
    }

    // ── Sil ─────────────────────────────────────────────────────────────
    if (altKomut === "sil") {
      const kod = kodNormalize(args[1]);
      if (!kod) {
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [kutu(`${emoji("hata")} Kullanım: \`.kod sil <kod>\``, 0xed4245)],
        });
      }

      // ⚠️ Yalnızca KULLANILMAMIŞ kod silinir. Kullanılmış kodu silmek,
      // "bu paket nereden geldi?" sorusunun cevabını yok eder.
      const silinen = await Kod.findOneAndDelete({ kod, kullanildi: false });

      if (!silinen) {
        const varMi = await Kod.exists({ kod });
        return message.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            kutu(
              varMi
                ? `${emoji("hata")} Bu kod **kullanılmış**, silinemez.\n-# Geçmişi korumak için kullanılmış kodlar silinmiyor.`
                : `${emoji("hata")} Böyle bir kod yok.`,
              0xed4245,
            ),
          ],
        });
      }

      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          kutu(`${emoji("basarili")} \`${kodBicimle(silinen.kod)}\` iptal edildi.`, 0x57f287),
        ],
      });
    }

    // ── Yardım ──────────────────────────────────────────────────────────
    return message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .setAccentColor(renk)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(yardim()))
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# Kullanım panelini kanala göndermek için: \`.kod-kullan-menu\``,
            ),
          ),
      ],
    });
  },
};
