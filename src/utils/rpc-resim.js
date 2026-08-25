// Aktivite (RichPresence) resimlerini KALICI hale getirir.
//
// SORUN: Discord CDN linkleri artık imzalı geliyor (?ex=...&is=...&hm=...) ve
// imza ~24 saatte ölüyor. Bu yüzden global aktiviteye elle yapıştırılan
// cdn.discordapp.com linki ertesi gün "silinmiş" gibi kayboluyordu.
//
// ÇÖZÜM: Resmi Discord'un medya proxy'sine bir kez kopyalatmak.
// `RichPresence.getExternal` verilen URL'i Discord'a çektirip
// "external/{hash}/https/..." yolunu döndürür — bu yol İMZASIZ ve kalıcıdır.
// Proxy resmi kendi tarafında sakladığı için kaynak site (GitHub/catbox vb.)
// her presence yenilemesinde ziyaret edilmez, sadece ilk çözümlemede.
//
// AYRICA: Kütüphane (Presence.js:546) sadece cdn.discordapp.com /
// media.discordapp.net kabul edip diğer her host için INVALID_URL fırlatıyor.
// selfbot-manager'daki `try/catch(_) {}` bunu yuttuğu için GitHub/imgur linki
// yazınca resim sessizce hiç görünmüyordu. Buradan geçen URL'ler proxy yoluna
// çevrildiği için artık HER host çalışıyor.

const { RichPresence } = require("discord.js-selfbot-v13");
const { rpcAppId } = require("../config");

// url -> "mp:external/..." (çözüldü) | null (Discord resmi çekemedi, tekrar deneme)
const onbellek = new Map();
// Aynı URL için eşzamanlı çift istek atılmasın — açılışta yüzlerce hesap aynı
// anda ready olup aynı global resmi çözmeye kalkıyor.
const bekleyen = new Map();

const DISCORD_CDN = /^https?:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//i;

function urlMu(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

/** Kalıcılaştırılması gereken (Discord dışı) bir resim URL'i mi? */
function hariciMi(v) {
  return urlMu(v) && !DISCORD_CDN.test(v);
}

/**
 * Bir resim değerini presence'e konulacak SON hale çevirir. ASENKRON İŞ YAPMAZ —
 * `rpcAyarla` senkron olduğu ve 5 dakikada bir interval'den çağrıldığı için
 * burada API'ye gidilmez; sadece önbelleğe bakılır.
 *
 * Harici bir URL henüz çözülmemişse `null` döner (resim konmaz). Yanlış/bozuk
 * resim göstermektense hiç göstermemek daha iyi; `resimleriHazirla` çözünce
 * bir sonraki yenilemede kendiliğinden görünür.
 */
function resimCoz(deger) {
  if (!deger) return null;
  if (!hariciMi(deger)) return deger; // asset ID / mp: / cdn.discordapp / spotify: ...
  const yol = onbellek.get(deger);
  if (yol) return yol;
  if (!onbellek.has(deger)) {
    console.warn(`[rpc-resim] Henüz çözülmedi, bu turda atlandı: ${deger}`);
  }
  return null;
}

async function grupCoz(client, grup) {
  const anahtar = grup.join("|");
  if (bekleyen.has(anahtar)) return bekleyen.get(anahtar);

  const is = (async () => {
    try {
      // getExternal çağrı başına EN FAZLA 2 resim kabul eder (Presence.js:974).
      const sonuc = await RichPresence.getExternal(client, rpcAppId, ...grup);
      // Yanıtı SIRAYA göre eşliyoruz — dönen nesnedeki `url` alanı Discord
      // tarafında normalize edilmiş olabiliyor, gönderdiğimizle birebir
      // eşleşeceğine güvenmiyoruz.
      (sonuc || []).forEach((r, i) => {
        const url = grup[i];
        if (r && r.external_asset_path) {
          onbellek.set(url, `mp:${r.external_asset_path}`);
          console.log(`[rpc-resim] Kalıcılaştırıldı: ${url}`);
        }
      });
      for (const url of grup) {
        if (!onbellek.has(url)) {
          onbellek.set(url, null); // kalıcı başarısızlık — sürekli denemeyelim
          console.error(
            `[rpc-resim] Discord bu resmi çekemedi (link herkese açık ve doğrudan resim mi?): ${url}`,
          );
        }
      }
    } catch (e) {
      // Geçici hata (rate-limit/ağ) olabilir — önbelleğe null YAZMIYORUZ ki
      // sonraki çağrıda tekrar denensin.
      console.error(`[rpc-resim] getExternal hatası: ${e?.message || e}`);
    } finally {
      bekleyen.delete(anahtar);
    }
  })();

  bekleyen.set(anahtar, is);
  return is;
}

/**
 * Verilen resim URL'lerini (harici olanları) çözüp önbelleğe alır.
 * Zaten çözülmüş olanlar için hiç istek atmaz, bu yüzden her hesabın ready'sinde
 * güvenle çağrılabilir. Presence uygulanmadan ÖNCE await edilmeli.
 */
async function resimleriHazirla(client, degerler = []) {
  if (!client || !client.token || !client.api) return;
  const hedefler = [...new Set(degerler.filter(hariciMi))].filter(
    (u) => !onbellek.has(u) && !bekleyen.has(u),
  );
  if (!hedefler.length) return;

  const isler = [];
  for (let i = 0; i < hedefler.length; i += 2) {
    isler.push(grupCoz(client, hedefler.slice(i, i + 2)));
  }
  await Promise.all(isler);
}

/** Bir URL'in önbelleğini düşürür — panelden aynı linke yeni resim konursa. */
function onbellekTemizle(url) {
  if (url) onbellek.delete(url);
  else onbellek.clear();
}

module.exports = { resimCoz, resimleriHazirla, onbellekTemizle, hariciMi };
