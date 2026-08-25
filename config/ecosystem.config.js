/**
 * PM2 yapılandırması.
 *
 * Çalıştırma:
 *   pm2 start config/ecosystem.config.js
 *   pm2 logs tokenonline
 *   pm2 restart tokenonline
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "tokenonline",
      script: "index.js",
      cwd: path.resolve(__dirname, ".."),

      /**
       * ⚠️ TEK KOPYA. Cluster modu KULLANILAMAZ.
       *
       * Her selfbot hesabı belleğe bağlı bir WebSocket bağlantısı taşıyor
       * (`selfbotIstemciler` Map'i). İkinci bir kopya açmak aynı tokenlerle
       * ikinci kez giriş yapmak demek: Discord bunu çakışan oturum sayar,
       * hesaplar sürekli birbirini düşürür ve rate-limit yersin.
       */
      instances: 1,
      exec_mode: "fork",

      /**
       * V8 heap tavanı.
       *
       * 1700 token için ölçülen gerçekçi kullanım ~700 MB – 1 GB RSS
       * (cache politikası açıkken, hesap başına 1 sunucu varsayımıyla).
       * 3 GB tavan rahat pay bırakıyor; verilmezse V8 kendi kararını verir
       * ve makinenin toplam belleğine göre beklenmedik bir değer seçebilir.
       *
       * Hesaplar birden fazla sunucudaysa her ek sunucu ~235 MB getirir —
       * o durumda burayı ve VDS'i büyüt.
       */
      node_args: "--max-old-space-size=3072",

      autorestart: true,

      /**
       * ⚠️ Bellek sınırı BİLEREK YÜKSEK.
       *
       * Yeniden başlatmak ucuz değil: 1700 token yeniden giriş yapar,
       * ~3 dakika sürer ve aynı IP'den toplu giriş rate-limit'e takılıp
       * bir kısmının "hata" düşmesine yol açar. Bu yüzden burası rutin bir
       * temizlik aracı değil, gerçek bir kaçak varsa devreye giren son
       * çare. Normal çalışmada asla tetiklenmemeli.
       */
      max_memory_restart: "2500M",

      /**
       * Çökme döngüsünde Discord'u dövmemek için artan gecikme.
       * Sabit `restart_delay` ile bot, örneğin bozuk bir DB yüzünden
       * saniyede bir yeniden başlayıp 1700 girişi tekrar tekrar denerdi.
       */
      exp_backoff_restart_delay: 5000,
      min_uptime: "60s",
      max_restarts: 10,

      /**
       * Kapanışa süre tanı: 1700 WebSocket'in düzgün kapanması gerekiyor,
       * yoksa Discord tarafında oturumlar bir süre daha açık görünür.
       */
      kill_timeout: 15000,

      env: {
        NODE_ENV: "production",
      },

      // Loglar
      time: true,
      merge_logs: true,
      out_file: "logs/out.log",
      error_file: "logs/error.log",

      /**
       * ⚠️ İzleme KAPALI. Açık olsaydı `src/emojiler/` klasörüne yazılan her
       * emoji (bkz. src/utils/emoji-install.js) botu yeniden başlatırdı.
       */
      watch: false,
    },
  ],
};
