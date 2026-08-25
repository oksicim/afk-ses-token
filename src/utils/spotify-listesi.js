// Spotify playlist'inden şarkı listesi çeker (hesaplar "Spotify dinliyor"
// görünsün diye). İki kaynak destekler:
//
//   1) RESMİ API — config.js'de spotifyClientId + spotifyClientSecret varsa.
//      Playlist'in TAMAMINI (sayfalama ile) çeker; albüm kapağı, albüm ID'si
//      ve sanatçı ID'leri tek istekte gelir. Sağlam ve sınırsız.
//
//   2) EMBED (anahtarsız) — anahtar yoksa otomatik buna düşer.
//      https://open.spotify.com/embed/playlist/{id} sayfasındaki __NEXT_DATA__
//      JSON'unu okur. Kurulum istemez AMA playlist başına EN FAZLA 100 şarkı
//      verir ve albüm kapağı için şarkı başına ek istek gerekir (cache'lenir).
//
// Not: Spotify sayfa yapısını değiştirirse (2) bozulabilir; (1) bozulmaz.

const config = require("../config");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Embed'in tek seferde verdiği azami şarkı sayısı (Spotify'ın sınırı).
const EMBED_SINIR = 100;

const PLAYLIST_CACHE_MS = 30 * 60 * 1000; // 30 dk
const playlistCache = new Map(); // playlistId -> { zaman, veri }
const kapakCache = new Map(); // trackId -> "spotify:<imageId>" | null

/** Playlist URL / URI / ham ID → playlist ID. Geçersizse null. */
function playlistIdCoz(girdi) {
  if (!girdi) return null;
  const s = String(girdi).trim();

  // spotify:playlist:ID
  let m = s.match(/^spotify:playlist:([A-Za-z0-9]+)$/);
  if (m) return m[1];

  // https://open.spotify.com/playlist/ID?si=... (araya /intl-tr/ gibi ekler girebiliyor)
  m = s.match(/open\.spotify\.com\/(?:[a-z-]+\/)?playlist\/([A-Za-z0-9]+)/);
  if (m) return m[1];

  // Ham ID (Spotify ID'leri base62, 22 karakter)
  if (/^[A-Za-z0-9]{16,40}$/.test(s)) return s;

  return null;
}

/**
 * Spotify kapak URL'inden Discord'un beklediği asset id'sini çıkarır.
 * Discord presence'ında büyük resim "spotify:<imageId>" biçiminde verilir.
 * Boyut önekini 640px sürümüne (ab67616d0000b273) sabitleriz.
 */
function kapakIdCoz(url) {
  if (!url) return null;
  const m = String(url).match(/\/image\/([A-Za-z0-9]+)/);
  if (!m) return null;
  const id = m[1].replace(/^ab67616d(00001e02|00004851)/, "ab67616d0000b273");
  return `spotify:${id}`;
}

// ---------------------------------------------------------------- RESMİ API

let apiToken = null;
let apiTokenBitis = 0;

function apiAktif() {
  return !!(config.spotifyClientId && config.spotifyClientSecret);
}

async function apiTokenAl() {
  if (apiToken && Date.now() < apiTokenBitis) return apiToken;
  const kimlik = Buffer.from(
    `${config.spotifyClientId}:${config.spotifyClientSecret}`,
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${kimlik}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token alınamadı (${res.status})`);
  const j = await res.json();
  apiToken = j.access_token;
  apiTokenBitis = Date.now() + (j.expires_in ?? 3600) * 1000 - 60000;
  return apiToken;
}

async function apiPlaylist(playlistId) {
  const token = await apiTokenAl();
  const bas = { Authorization: `Bearer ${token}` };

  const meta = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name`,
    { headers: bas },
  );
  if (!meta.ok) throw new Error(`Playlist alınamadı (${meta.status})`);
  const ad = (await meta.json()).name || "Playlist";

  const parcalar = [];
  let url =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks` +
    `?limit=100&fields=next,items(track(id,name,duration_ms,artists(id,name),album(id,name,images)))`;

  while (url) {
    const res = await fetch(url, { headers: bas });
    if (!res.ok) throw new Error(`Parçalar alınamadı (${res.status})`);
    const j = await res.json();
    for (const it of j.items || []) {
      const t = it && it.track;
      if (!t || !t.id) continue; // yerel/kaldırılmış parçalar
      parcalar.push({
        id: t.id,
        ad: t.name,
        sanatci: (t.artists || []).map((a) => a.name).join(", "),
        sure: t.duration_ms || 0,
        albumAd: t.album?.name || null,
        albumId: t.album?.id || null,
        sanatciIds: (t.artists || []).map((a) => a.id).filter(Boolean),
        kapak: kapakIdCoz(t.album?.images?.[0]?.url),
      });
    }
    url = j.next;
  }

  return { id: playlistId, ad, parcalar, kaynak: "api", kesildi: false };
}

// -------------------------------------------------------------------- EMBED

async function nextData(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  const html = await res.text();
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) throw new Error("Spotify sayfası okunamadı");
  return JSON.parse(m[1]);
}

async function embedPlaylist(playlistId) {
  const data = await nextData(
    `https://open.spotify.com/embed/playlist/${playlistId}`,
  );
  const ent = data?.props?.pageProps?.state?.data?.entity;
  const liste = ent?.trackList;
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new Error("Playlist boş ya da herkese açık değil");
  }

  const parcalar = [];
  for (const t of liste) {
    const id = String(t.uri || "").split(":").pop();
    if (!id || t.isPlayable === false) continue;
    parcalar.push({
      id,
      ad: t.title,
      sanatci: t.subtitle || "",
      sure: t.duration || 0,
      albumAd: null,
      albumId: null,
      sanatciIds: [],
      kapak: null, // parça bazında sonradan çözülür (parcaKapak)
    });
  }

  return {
    id: playlistId,
    ad: ent?.name || "Playlist",
    parcalar,
    kaynak: "embed",
    // Embed 100'de kesiyor; tam liste için config'e API anahtarı gerekir.
    kesildi: liste.length >= EMBED_SINIR,
  };
}

/**
 * Bir şarkının albüm kapağını çözer ("spotify:<imageId>"), cache'ler.
 * Sadece embed kaynağı için gerekir — API zaten kapağı veriyor.
 */
async function parcaKapak(trackId) {
  if (kapakCache.has(trackId)) return kapakCache.get(trackId);
  let sonuc = null;
  try {
    const data = await nextData(
      `https://open.spotify.com/embed/track/${trackId}`,
    );
    const ent = data?.props?.pageProps?.state?.data?.entity;
    const gorseller = ent?.visualIdentity?.image;
    if (Array.isArray(gorseller) && gorseller.length) {
      // En büyük sürümü seç.
      const enBuyuk = gorseller.reduce((a, b) =>
        (b.maxWidth ?? 0) > (a.maxWidth ?? 0) ? b : a,
      );
      sonuc = kapakIdCoz(enBuyuk.url);
    }
  } catch (e) {
    console.error("[spotify] kapak alınamadı:", e?.message || e);
  }
  kapakCache.set(trackId, sonuc);
  return sonuc;
}

// ------------------------------------------------------------------ GENEL

/**
 * Playlist URL'inden şarkı listesini döndürür.
 * @returns {Promise<{id, ad, parcalar, kaynak, kesildi}>}
 */
async function playlistGetir(urlVeyaId) {
  const id = playlistIdCoz(urlVeyaId);
  if (!id) throw new Error("Geçersiz playlist bağlantısı");

  const c = playlistCache.get(id);
  if (c && Date.now() - c.zaman < PLAYLIST_CACHE_MS) return c.veri;

  let veri;
  if (apiAktif()) {
    try {
      veri = await apiPlaylist(id);
    } catch (e) {
      // API anahtarı hatalıysa/limit yediyse sessizce embed'e düş.
      console.error("[spotify] API başarısız, embed'e düşülüyor:", e?.message || e);
      veri = await embedPlaylist(id);
    }
  } else {
    veri = await embedPlaylist(id);
  }

  if (!veri.parcalar.length) throw new Error("Playlist'te çalınabilir şarkı yok");
  playlistCache.set(id, { zaman: Date.now(), veri });
  return veri;
}

module.exports = {
  EMBED_SINIR,
  playlistIdCoz,
  playlistGetir,
  parcaKapak,
  apiAktif,
};
