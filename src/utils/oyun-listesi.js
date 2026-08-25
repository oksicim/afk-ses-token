// Discord'un HALKA AÇIK "algılanabilir oyunlar" (detectable) listesinden
// popüler oyunları çeker. Bu liste her oyunun GERÇEK application ID'sini ve
// ikon hash'ini içerir; gerçek app ID kullanıldığında hesapta "X oynuyor"
// yazısının altında oyunun ikonu doğru şekilde çıkar.
//
// Endpoint büyük (~birkaç yüz KB) olduğu için sonuç bellekte cache'lenir.

const DETECTABLE_URL = "https://discord.com/api/v9/applications/detectable";
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 saat

// Panelde gösterilecek popüler oyunlar. İsimler Discord'un listesindeki
// gerçek adlarla eşleştirilir (birebir bulunamazsa gevşek eşleşme denenir).
// Discord select menüsü en fazla 25 seçenek aldığı için liste 25'i geçmemeli.
const POPULER_OYUNLAR = [
  "VALORANT",
  "League of Legends",
  "Counter-Strike 2",
  "Grand Theft Auto V",
  "Fortnite",
  "Minecraft",
  "Apex Legends",
  "Rocket League",
  "Rainbow Six Siege",
  "Call of Duty: Warzone",
  "Roblox",
  "Dota 2",
  "Overwatch 2",
  "PUBG: BATTLEGROUNDS",
  "EA SPORTS FC 25",
  "osu!",
  "Dead by Daylight",
  "Genshin Impact",
  "Marvel Rivals",
  "Elden Ring",
  "Team Fortress 2",
  "World of Warcraft",
  "Phasmophobia",
  "Wuthering Waves",
  "Honkai: Star Rail",
  "Path of Exile 2",
  "Path of Exile",
  "Warframe",
  "Destiny 2",
  "THE FINALS",
  "Escape from Tarkov",
  "Rust",
  "Terraria",
  "Stardew Valley",
  "Hades",
  "Cyberpunk 2077",
  "The Witcher 3: Wild Hunt",
  "Red Dead Redemption 2",
  "Sea of Thieves",
  "Fall Guys",
  "Among Us",
  "Brawlhalla",
  "SMITE",
  "Paladins",
  "War Thunder",
  "World of Tanks",
  "Lost Ark",
  "New World",
  "FINAL FANTASY XIV",
  "Guild Wars 2",
  "Old School RuneScape",
  "RuneScape",
  "Deadlock",
  "Palworld",
  "HELLDIVERS 2",
  "Baldur's Gate III",
  "Monster Hunter: World",
  "Monster Hunter Rise",
  "Halo Infinite",
  "Forza Horizon 5",
  "Left 4 Dead 2",
  "Garry's Mod",
  "Unturned",
  "Valheim",
  "The Elder Scrolls V: Skyrim",
  "Fallout 4",
  "DayZ",
  "Squad",
  "Hell Let Loose",
  "Insurgency: Sandstorm",
  "NARAKA: BLADEPOINT",
  "Splitgate",
  "Overwatch",
  "Once Human",
  "Delta Force",
  "PUBG: BATTLEGROUNDS Mobile",
  "Dead by Daylight Mobile",
  "Grand Theft Auto: San Andreas",
  "ARK: Survival Ascended",
  "The First Descendant",
  "Enshrouded",
  "Content Warning",
  "Lethal Company",
  "God of War",
  "Marvel's Spider-Man Remastered",
  "Assassin's Creed Valhalla",
  "Assassin's Creed Mirage",
  "Sekiro: Shadows Die Twice",
  "DARK SOULS III",
  "Devil May Cry 5",
  "Street Fighter 6",
  "TEKKEN 8",
  "Mortal Kombat 1",
  "Borderlands 3",
  "Deep Rock Galactic",
  "Risk of Rain 2",
  "Vampire Survivors",
  "Balatro",
  "Dead Cells",
  "Dying Light 2",
  "The Forest",
  "Sons Of The Forest",
  "Raft",
  "Grounded",
  "Satisfactory",
  "Factorio",
  "RimWorld",
  "Project Zomboid",
  "7 Days to Die",
  "Conan Exiles",
  "V Rising",
  "Don't Starve Together",
  "Sid Meier's Civilization VI",
  "Age of Empires IV",
  "Total War: WARHAMMER III",
  "Warhammer 40,000: Darktide",
  "Warhammer: Vermintide 2",
  "For Honor",
  "Need for Speed",
  "Cult of the Lamb",
  "Slay the Spire",
  "Cities: Skylines II",
  "EA SPORTS FC 24",
  "NBA 2K25",
  "Farming Simulator 25",
  "The Crew Motorfest",
  "Manor Lords",
];

// --- OYUN LOGOLARI (özel emoji) ---
// Her oyunun yanında logo göstermek istersen buraya ekle. Select menüsü
// GERÇEK RESİM/URL kabul etmez; sadece Discord özel emojisi kabul eder.
// Bu yüzden logoyu bir sunucuya emoji olarak yükle (BOTUN o sunucuda olması
// şart), sonra değeri şu biçimlerden biriyle yaz:
//   "<:valorant:123456789012345678>"      → özel emoji (tam biçim, en sağlamı)
//   "<a:valorant:123456789012345678>"     → animasyonlu özel emoji
//   "123456789012345678"                  → sadece emoji ID'si (isim otomatik)
//   "🎮"                                    → normal (unicode) emoji
// Anahtar, oyunun tam adıyla eşleşir (büyük/küçük harf ve boşluk fark etmez).
const OYUN_EMOJI = {
  // "VALORANT": "<:valorant:123456789012345678>",
  // "League of Legends": "<:lol:123456789012345678>",
  // "Counter-Strike 2": "🔫",
};

let cache = null;
let cacheZaman = 0;

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’´`]/g, "'")
    .trim();
}

// OYUN_EMOJI anahtarlarını normalize ederek hızlı arama haritası.
const emojiHarita = new Map();
for (const [ad, emoji] of Object.entries(OYUN_EMOJI)) {
  if (emoji) emojiHarita.set(normalize(ad), emoji);
}

// Kullanıcının verdiği emoji değerini setEmoji için güvenli biçime çevirir.
function emojiCoz(v) {
  if (!v) return null;
  v = String(v).trim();
  if (!v) return null;
  if (v.startsWith("<")) return v; // <:name:id> / <a:name:id>
  if (/^\w{2,}:\d{15,25}$/.test(v)) return `<:${v}>`; // name:id
  if (/^\d{15,25}$/.test(v)) return `<:oyun:${v}>`; // sadece id → 2+ harfli isim uydur
  return v; // unicode emoji
}

// Detectable listesindeki bir öğeyi {id, name, icon} biçimine indirger.
// Discord bazı sürümlerde uygulamayı `application` altında sarmalayabilir.
function coz(item) {
  const app = item && (item.application || item);
  if (!app || !app.id || !app.name) return null;
  // Detectable listesinde ikon alanı `icon_hash` adıyla gelir (bazı yerlerde `icon`).
  const icon = app.icon_hash || app.icon || null;
  return { id: app.id, name: app.name, icon };
}

async function detectableGetir() {
  if (cache && Date.now() - cacheZaman < CACHE_MS) return cache;
  const res = await fetch(DETECTABLE_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`detectable ${res.status}`);
  const data = await res.json();
  cache = Array.isArray(data) ? data : [];
  cacheZaman = Date.now();
  return cache;
}

/** Popüler oyunları [{id, name, icon, emoji}] olarak döndürür (en fazla `limit`). */
async function populerOyunlar(limit = 125) {
  let liste;
  try {
    liste = await detectableGetir();
  } catch (e) {
    console.error("[oyun-listesi] detectable alınamadı:", e?.message || e);
    return [];
  }

  const byName = new Map();
  for (const item of liste) {
    const g = coz(item);
    if (!g) continue;
    const n = normalize(g.name);
    if (!byName.has(n)) byName.set(n, g);
  }

  const sonuc = [];
  const eklenenId = new Set();
  for (const istenen of POPULER_OYUNLAR) {
    const key = normalize(istenen);
    let g = byName.get(key);
    if (!g) {
      // Gevşek eşleşme: adı istenen terimle başlayan/içeren adaylardan
      // adı EN KISA olanı seç — böylece "- Test Server", "PTS", DLC gibi
      // uzun varyantlar yerine ana oyun gelir.
      let adaylar = [];
      for (const [n, v] of byName) {
        if (n.startsWith(key)) adaylar.push({ v, n, oncelik: 0 });
        else if (n.includes(key)) adaylar.push({ v, n, oncelik: 1 });
      }
      adaylar.sort(
        (a, b) => a.oncelik - b.oncelik || a.n.length - b.n.length,
      );
      if (adaylar.length) g = adaylar[0].v;
    }
    if (g && !eklenenId.has(g.id)) {
      eklenenId.add(g.id);
      // Kullanıcının tanımladığı logo (özel emoji) varsa iliştir.
      const emoji = emojiCoz(emojiHarita.get(key));
      sonuc.push({ ...g, emoji: emoji || null });
    }
    if (sonuc.length >= limit) break;
  }
  return sonuc;
}

/** appId'ye göre oyunu {id, name, icon} olarak bulur (cache'ten). */
async function oyunBul(appId) {
  let liste;
  try {
    liste = await detectableGetir();
  } catch (e) {
    return null;
  }
  for (const item of liste) {
    const g = coz(item);
    if (g && g.id === appId) return g;
  }
  return null;
}

/** Oyunun ikon URL'i (varsa) — RPC büyük resmi / emoji görseli olarak kullanılır. */
function ikonUrl(g, size = 256) {
  return g && g.id && g.icon
    ? `https://cdn.discordapp.com/app-icons/${g.id}/${g.icon}.png?size=${size}`
    : null;
}

/**
 * Oyun adından geçerli bir application-emoji adı üretir (a-z0-9_, 2-32 karakter).
 * `.gerekliemojikur` bu adla emoji oluşturur; menü de aynı adla emojiyi bulur.
 */
function emojiAdiUret(oyunAdi) {
  let s = String(oyunAdi || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (s.length < 2) s = "oyun_" + s;
  return s.slice(0, 32).replace(/_+$/g, "") || "oyun";
}

module.exports = { populerOyunlar, oyunBul, ikonUrl, emojiAdiUret };
