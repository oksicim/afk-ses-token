<div align="center">

<img src="./docs/images/ses-afk-token-banner.png" alt="Ses AFK Token — Son Sürüm Virüssüz İndir" width="100%">

<br>

![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows11&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.19-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Haz%C4%B1r-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Kurulum](https://img.shields.io/badge/Kurulum-Tek%20BAT-00C853?style=for-the-badge)
![Audit](https://img.shields.io/badge/npm%20audit-0%20a%C3%A7%C4%B1k-brightgreen?style=for-the-badge&logo=npm)

# Ses AFK Token Sistemi

**Discord ses, token, paket ve kullanıcı panellerini tek yerden yöneten; Windows'ta tek `.bat` ile kurulan sistem.**

[⚡ Hemen Kur](#-sıfır-bilgiyle-kurulum) · [🤖 Discord Otomatik Kurulum](#-discord-otomatik-kurulum) · [🎮 Komutlar](#-komut-kataloğu) · [🧯 Hata Çözümü](#-sorun-giderme)

</div>

## 🤔 Gerçekten sıfır bilgiyle çalışır mı?

**Kod veya terminal bilgisi gerekmiyor.** ZIP'i çıkartıp `.bat` dosyasına çift tıklıyorsun. Kurulum geri kalan teknik işleri kendi yapıyor.

Node.js, npm paketleri, Discord uygulaması, bot, intentler, `config.js` ve MongoDB otomatik hazırlanır. Token veya ID kopyalayıp yapıştırman gerekmez.

| Kurulumda olan | Senin yapacağın |
| --- | --- |
| Güvenli Chrome, Brave veya Opera penceresi açılır | Discord'a giriş yapmamışsan giriş yap |
| Oturum zaten açıksa | Hiçbir şey; kurulum otomatik devam eder |
| Captcha veya 2FA çıkarsa | Açık tarayıcıda tamamla |
| Bot oluşturulunca | Token otomatik olarak `config.js` içine yazılır |

Kurulum bilgisayarındaki normal tarayıcı profilini kullanır. Discord oturumun kendi tarayıcında kalır; bot tokeni konsola veya panoya yazılmaz.

## ✨ Neler var?

<table>
<tr>
<td width="50%">

### 🎙️ Ses yönetimi

- Hesapları ses kanalına bağlama
- Mikrofon ve kulaklık aç/kapat
- Kanalı toplu değiştirme
- Tekli ve çoklu hesap seçimi
- Sayfalı token yönetim paneli

</td>
<td width="50%">

### 🪪 Token yönetimi

- Tekli veya toplu token ekleme
- Hatalı tokenleri görüntüleme
- Token aktarımı ve kaldırma
- Askıya alınan tokenleri kurtarma
- Kuyruklu ve kontrollü giriş sistemi

</td>
</tr>
<tr>
<td width="50%">

### 📦 Paket sistemi

- Kullanıcıya paket tanımlama
- Paket süresi uzatma/kaldırma
- Sunucuya özel rol ve limit ayarı
- Tek kullanımlık paket kodları
- Süresi dolan paketleri otomatik kontrol

</td>
<td width="50%">

### 🎨 Profil ve panel

- Özel durum ve Rich Presence
- Hazır oyun seçenekleri
- Spotify playlist desteği
- Uygulama emoji sihirbazı
- MongoDB üzerinde şifreli saklama

</td>
</tr>
</table>

## ⚡ Sıfır bilgiyle kurulum

```mermaid
flowchart LR
    A[ZIP'i indir] --> B[Klasöre çıkart]
    B --> C[KURULUM.bat]
    C --> D[Node.js ve npm]
    D --> E[Discord'a giriş yap]
    E --> F[Bot, token ve ayarlar]
    F --> G[MongoDB]
    G --> H[Davet linki panoya kopyalanır]
    H --> I[Botu sunucuya ekle]
    I --> J[BASLAT.bat 🎉]
```

### 1. Projeyi indir

GitHub sayfasının üst tarafındaki yeşil **Code** butonuna bas, ardından **Download ZIP** seçeneğini seç.

### 2. ZIP dosyasını çıkart

İndirdiğin ZIP'e sağ tıkla ve **Tümünü Ayıkla** seçeneğine bas. Kurulum dosyasını ZIP'in içinden açma.

### 3. Tek dosyayı çalıştır

Çıkarttığın klasördeki [`KURULUM.bat`](./KURULUM.bat) dosyasına çift tıkla. Windows yönetici izni istediğinde **Evet** seç.

### 4. Discord girişini tamamla

Kurulum bilgisayardaki Google Chrome, Brave veya Opera tarayıcılarından birinin normal kullanıcı profilini açar. Discord oturumun zaten açıksa yeniden giriş yapmazsın. Tarayıcı profilinin aynı anda iki işlemde açılmaması için kurulumdan önce açık tarayıcı pencerelerini tamamen kapat. Girişten sonra uygulama, bot, intentler, token ve kullanıcı ID otomatik alınır.

### 5. Başlat

Bütün kontroller yeşil tik olduğunda kurulum tamamlanır. Pencereyi kapatıp [`BASLAT.bat`](./BASLAT.bat) dosyasına çift tıkla. Bot çevrimiçi olur ve pencere açık kaldığı sürece çalışır.

Sonraki çalıştırmalarda yalnızca `BASLAT.bat` dosyasını aç. `KURULUM.bat` yalnızca ilk kurulum ve onarım içindir.

## 🤖 Kurulum dosyası ne yapıyor?

| İşlem | Otomatik mi? |
| --- | :---: |
| Node.js sürümünü kontrol eder | ✅ |
| Node.js yoksa `winget` ile LTS sürümünü kurar | ✅ |
| npm'in kurulu olduğunu kontrol eder | ✅ |
| npm paketlerini temiz biçimde yükler | ✅ |
| Chrome, Brave ve Opera'yı kontrol eder; hiçbiri yoksa Chrome'u kurar | ✅ |
| Gizli `config.js` dosyasını oluşturur | ✅ |
| 64 karakterlik şifreleme anahtarı üretir | ✅ |
| Discord uygulamasını ve botu oluşturur | ✅ |
| Gerekli privileged intentleri açar | ✅ |
| Bot tokenini doğrudan ayarlara aktarır | ✅ |
| Discord kullanıcı ID'ni oturumdan alır | ✅ |
| MongoDB Server'ı eksikse `winget` ile kurar | ✅ |
| MongoDB Windows servisini oluşturur ve başlatır | ✅ |
| Yerel veritabanı adresini otomatik ayarlar | ✅ |
| Discord bot tokenini doğrular | ✅ |
| MongoDB bağlantısını test eder | ✅ |
| Kurulum sonunda tüm bağlantıları test eder | ✅ |
| Tarayıcı girişini sonraki kurulumlar için hatırlar | ✅ |
| Bot davet linkini panoya kopyalayıp tarayıcıda açar | ✅ |

## 🤖 Discord otomatik kurulum

İlk temiz kurulumda süreç şöyledir:

1. `KURULUM.bat`, bilgisayarındaki normal Chrome/Brave/Opera profilini açar.
2. Discord oturumu yoksa giriş ekranında seni bekler.
3. Giriş tamamlanınca **Ses AFK Token** uygulamasını oluşturur.
4. Botu oluşturup Presence, Server Members ve Message Content intentlerini açar.
5. Bot tokenini ve Application ID'yi doğrudan kurulum işlemine döndürür.
6. Giriş yapan hesabın kullanıcı ID'sini `ownerId` olarak ayarlar.
7. Tokeni ekrana göstermeden `config.js` dosyasına yazar.

Kurulum ayrı ve boş bir “otomasyon tarayıcısı” oluşturmaz; seçilen tarayıcının bilgisayarındaki mevcut kullanıcı profilini kullanır. Bu nedenle çalıştırmadan önce seçilecek tarayıcıyı tamamen kapatmalısın. Oturum bilgileri normal tarayıcı profilinde kalır ve GitHub projesinin içine girmez.

Tarayıcı görünür pencere kapandıktan sonra arka planda çalışmaya devam ediyorsa `.bat` dosyası bunu algılar. Açık form veya indirmelerini kaydetmen için uyarır ve yalnızca onay verirsen kalan tarayıcı işlemlerini kapatıp normal profilini yeniden açar. Developer Portal mevcut sekmelerinin yerine geçmez; yeni sekmede açılır.

Discord intentlerinin neden gerektiği için [Discord Gateway ve Privileged Intents belgelerine](https://docs.discord.com/developers/events/gateway#privileged-intents) bakabilirsin.

## ☁️ İsteğe bağlı: MongoDB Atlas kullanmak

Normal kurulumda bu bölümü yapmana gerek yoktur; `KURULUM.bat` yerel MongoDB'yi kendi kurar. Veritabanını başka bir sunucuda tutmak istiyorsan:

1. [MongoDB Atlas](https://www.mongodb.com/atlas/database) üzerinde bir proje ve veritabanı oluştur.
2. Bir **database user** oluştur; Atlas hesabın ile database user aynı şey değildir.
3. **Network Access / IP Access List** bölümüne sistemi çalıştıracağın bilgisayarın IP adresini ekle.
4. Veritabanında **Connect → Drivers** yolunu aç.
5. `mongodb+srv://` ile başlayan bağlantı adresini kopyala.
6. Adresteki `<password>` bölümünü oluşturduğun database user şifresiyle değiştir.
7. Kurulumdan sonra `config.js` içindeki `mongoUri` değerini bu adresle değiştir.

Örnek biçim:

```text
mongodb+srv://kullanici:SIFRE@cluster.example.mongodb.net/tokenonline
```

Şifrede `@`, `:`, `/`, `?` veya `#` bulunuyorsa bu karakterleri URL uyumlu hâle getirmen gerekir. MongoDB, mümkün olduğunda `mongodb+srv://` biçiminin kullanılmasını önerir. Ayrıntı: [Atlas bağlantı rehberi](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/) ve [connection string biçimleri](https://www.mongodb.com/docs/manual/reference/connection-string/).

## 🔌 Entegrasyonlar ve API'ler

| Servis | Durum | Ne için kullanılıyor? | Ayar |
| --- | :---: | --- | --- |
| Discord Gateway API | Zorunlu | Mesaj, üye, sunucu ve ses olayları | `botToken` |
| Discord REST API | Zorunlu | Bot doğrulama, panel ve uygulama emojileri | `botToken`, `rpcAppId` |
| MongoDB | Zorunlu | Token, paket, kurulum ve aktivite verileri | `mongoUri` |
| Spotify Web API | İsteğe bağlı | 100'den uzun playlistlerin tamamını alma | `spotifyClientId`, `spotifyClientSecret` |
| Discord medya/proxy | Dahili | Rich Presence görsellerini işleme | `rpcAppId` |

Spotify anahtarlarını boş bırakırsan sistem çalışmaya devam eder; playlist tarafında anahtarsız yöntem kullanılır ve liste başına en fazla 100 şarkı alınır.

Botu sunucuya ekleme mantığı için Discord'un resmi [OAuth2 ve izinler](https://docs.discord.com/developers/platform/oauth2-and-permissions) belgesine bakabilirsin.

## 🏗️ Sistem nasıl çalışıyor?

```mermaid
flowchart TB
    U[Kullanıcı] -->|Nokta komutlar ve paneller| B[Discord Bot]
    B <-->|Gateway + REST| D[Discord API]
    B <-->|Kayıtlar| M[(MongoDB)]
    B --> Q[Token Giriş Kuyruğu]
    Q --> S[Selfbot Yöneticisi]
    S --> V[Ses Kanalları]
    B -. İsteğe bağlı .-> P[Spotify Web API]
```

- Tokenler veritabanına yazılmadan önce AES-256-CBC ile şifrelenir.
- Aynı tokenin tekrar eklenmesini önlemek için anahtarlı parmak izi tutulur.
- Toplu girişler tek seferde yüklenmek yerine kontrollü bir kuyruktan geçirilir.
- PM2 yapılandırması aynı tokenlerin iki kez giriş yapmaması için tek işlem kullanır.

## 🎮 Discord içindeki ilk ayar

Bot çevrimiçi olduktan sonra kendi sunucunda şu sırayı izle:

1. `.setup` — gerekli rol, kanal ve normal/booster limitlerini ayarla.
2. `.paket-setup` — paket limitlerini ve paket rollerini düzenle.
3. `.emojikur uygula` — klasördeki eksik uygulama emojilerini yükle.
4. `.token-ekle` — kullanıcıların token ekleyeceği paneli gönder.
5. `.tokenkontrol` — token yönetim panelini test et.

Komut işaretini kurulum sırasında değiştirdiysen `.` yerine seçtiğin işareti kullan.

## 🧾 Komut kataloğu

### Kurulum ve panel

| Komut | Açıklama |
| --- | --- |
| `.setup` | Sunucu, rol, kanal ve token limitlerini ayarlar. |
| `.paket-setup` | Paket limitlerini ve rollerini ayarlar. |
| `.token-ekle` | Token ekleme panelini gönderir. |
| `.tokenkontrol` | Token ve ses yönetim panelini açar. |
| `.emojikur` | Uygulama emojilerinin durumunu gösterir. |
| `.emojikur uygula` | Eksik uygulama emojilerini yükler. |

### Token işlemleri

| Komut | Açıklama |
| --- | --- |
| `.tokenaktar @kullanıcı` | Seçilen tokenleri başka kullanıcıya aktarır. |
| `.tokenkurtar` | Limit nedeniyle askıya alınan tokenleri geri açar. |
| `.hatalitoken` | Giriş yapamayan tokenleri gösterir. |

### Paket ve kod işlemleri

| Komut | Açıklama |
| --- | --- |
| `.pakettanimla @kullanıcı` | Kullanıcıya paket tanımlar. |
| `.paketuzat @kullanıcı gün` | Aktif paketin süresini uzatır. |
| `.paketbilgi @kullanıcı` | Paket ve token durumunu gösterir. |
| `.paketkaldir @kullanıcı` | Kullanıcıdan seçilen paketi kaldırır. |
| `.paketsifirla @kullanıcı` | Kullanıcının tüm aktif paketlerini kaldırır. |
| `.paketler` | Sunucudaki aktif paketleri listeler. |
| `.kod` | Paket kodu üretme ve yönetme yardımını açar. |
| `.kod-kullan-menu` | Herkesin paket kodu girebileceği paneli gönderir. |

Yönetim komutlarının çoğunu yalnızca `config.js` içindeki `ownerId` kullanabilir.

## 🔄 Günlük kullanım

Botu açmak için her seferinde:

```text
BASLAT.bat dosyasına çift tıkla
```

Terminal kullanmak istersen:

```powershell
npm run check
npm start
```

## 🖥️ 7/24 çalıştırma

Projede tek işlem için hazırlanmış [`config/ecosystem.config.js`](./config/ecosystem.config.js) bulunur:

```powershell
npm install --global pm2
pm2 start config/ecosystem.config.js
pm2 logs tokenonline
```

**Aynı `config.js` ve aynı tokenlerle birden fazla kopya çalıştırma.** Aynı hesaplar tekrar tekrar giriş yapar, oturumlar birbirini düşürür ve rate-limit oluşabilir.

## 🔐 Güvenlik

- `config.js`, yedekleri, loglar, `node_modules` ve çalışma verileri `.gitignore` içindedir.
- Bot tokenini, kullanıcı tokenlerini, MongoDB adresini ve `encryptionKey` değerini paylaşma.
- `encryptionKey` değerinin güvenli yedeğini al; anahtar kaybolursa şifreli tokenler çözülemez.
- Sistemi yalnızca kontrol ettiğin bilgisayar veya sunucuda çalıştır.
- Şüpheli durumda Discord bot tokenini ve MongoDB şifresini hemen yenile.
- Selfbot kullanımı Discord hesaplarının kısıtlanmasına veya kapatılmasına yol açabilir; yalnızca sahibi olduğun hesaplarda kullan.

Paylaşılabilir ayar biçimi için [`config.example.js`](./config.example.js) dosyasına bak. Gerçek `config.js` dosyasını `git add -f` ile zorla ekleme.

Git kontrolü:

```powershell
git check-ignore config.js
```

Çıktı `config.js` olmalıdır. Gizli bilgiler daha önce herhangi bir repoya gönderildiyse yalnızca dosyayı silmek yetmez; bot tokenini ve MongoDB şifresini de yenile.

## 🧯 Sorun giderme

<details>
<summary><strong>Node.js kurulamadı</strong></summary>

[Node.js](https://nodejs.org/) sitesinden güncel LTS sürümünü kur, bilgisayarı yeniden başlat ve `.bat` dosyasını yeniden aç. En az Node.js `20.19.0` gerekir.

</details>

<details>
<summary><strong>Discord tarayıcı otomasyonu tamamlanamadı</strong></summary>

- Açılan Chrome, Brave veya Opera penceresini kurulum bitmeden kapatma.
- `Tarayıcı şu anda açık` hatası çıkarsa bütün tarayıcı pencerelerini kapat; Görev Yöneticisi'nde arka planda kalan işlemler de kapanınca `.bat` dosyasını tekrar aç.
- Discord girişini, captcha ve varsa 2FA işlemini açık pencerede tamamla.
- Kurulum penceresinin en fazla 10 dakika beklediğini unutma.
- Tarayıcı kapanırsa `KURULUM.bat` dosyasını yeniden aç.
- Discord Developer Portal arayüzü değiştiyse otomasyon güncellemesi gerekebilir.

</details>

<details>
<summary><strong>MongoDB kurulamadı veya bağlantı kurulamadı</strong></summary>

- `KURULUM.bat` dosyasını tekrar aç ve yönetici iznine **Evet** de.
- Windows Hizmetler uygulamasında `MongoDB` servisinin çalıştığını kontrol et.
- Yerel kurulumun varsayılan adresi `mongodb://127.0.0.1:27017/tokenonline` değeridir.
- Atlas kullanıyorsan IP Access List, database user ve bağlantı adresini kontrol et.

</details>

<details>
<summary><strong>Bot çevrimiçi ama komutlara cevap vermiyor</strong></summary>

- **Message Content Intent** ve **Server Members Intent** seçeneklerini aç.
- `ownerId` alanında kendi Discord kullanıcı ID'nin bulunduğunu kontrol et.
- Botun kanalı görme, mesaj gönderme ve mesaj geçmişini okuma izinlerini kontrol et.
- Komut işaretinin varsayılan olarak `.` olduğunu unutma.

</details>

<details>
<summary><strong>npm deprecated uyarısı görüyorum</strong></summary>

Projede kullanılan selfbot paketi npm üzerinde artık desteklenmiyor olarak işaretlenmiştir. Bu sarı mesaj kurulumun başarısız olduğu anlamına gelmez. Kurulumun sonunda kırmızı hata yoksa işlem devam eder.

</details>

<details>
<summary><strong>Tokenler yeniden başlatınca açılamıyor</strong></summary>

`config.js` içindeki `encryptionKey` değişmiş olabilir. İlk kurulumdaki anahtarı geri yükle. Anahtar kaybolduysa şifrelenmiş tokenleri çözmek mümkün değildir.

</details>

## 📁 Proje yapısı

```text
tokenonline/
├─ KURULUM.bat             # Node.js, npm ve MongoDB tam kurulumu
├─ BASLAT.bat              # Hazır sistemi çalıştırır
├─ docs/images/            # README görselleri
├─ config/                 # PM2 gibi ileri seviye çalışma ayarları
├─ scripts/                # Ayar sihirbazı ve bağlantı kontrolü
│  └─ discord-uygulama-kur.js # Developer Portal tarayıcı otomasyonu
├─ src/                    # Uygulamanın bütün kaynak kodu
│  ├─ komutlar/           # Mesaj komutları
│  ├─ interactionlar/     # Buton, menü ve form işlemleri
│  ├─ eventler/           # Discord olayları
│  ├─ models/             # MongoDB modelleri
│  ├─ utils/              # Token, paket, emoji ve şifreleme araçları
│  └─ emojiler/           # Yerel emoji görselleri
├─ config.example.js       # Paylaşılabilir ayar örneği
└─ index.js                # Uygulamanın giriş noktası
```

## 📜 Lisans

Bu proje özel **AFK Ses Token Source-Available License 1.0** ile paylaşılır:

- Kendi kişisel, eğitim, kurum içi veya daha büyük projelerinde kullanabilir ve değiştirebilirsin.
- Yazılımın kendisini, esaslı bir kopyasını veya benzer türevini satamaz; ücretli erişime koyamazsın.
- Paylaşım, fork veya türev projede `Original project by oksicim — https://github.com/oksicim` atfını görünür biçimde bulundurmalısın.
- Ayrıntılı ve bağlayıcı koşullar için [`LICENSE`](./LICENSE) dosyasını oku.

## ✅ Teslim kontrolü

- [x] Tek `KURULUM.bat` ile Node.js, npm ve MongoDB kurulumu
- [x] Ayrı `BASLAT.bat` ile günlük çalıştırma
- [x] Node.js sürüm kontrolü ve otomatik LTS kurulumu
- [x] Etkileşimli ayar sihirbazı
- [x] Oturum algılayan Discord uygulama/bot otomasyonu
- [x] Bot tokenini göstermeden doğrudan ayarlara aktarma
- [x] Discord ve MongoDB canlı bağlantı testi
- [x] Otomatik şifreleme anahtarı
- [x] Gizli dosyalar Git dışında
- [x] JavaScript sözdizimi ve modül yükleme kontrolü
- [x] `npm audit`: 0 bilinen açık

<div align="center">

**ZIP → BAT → Bilgileri yapıştır → Çalıştır. Olay bu.**

Made with ☕, gereksiz neon ve biraz da `😂`

</div>
