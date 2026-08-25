const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { botToken, mongoUri } = require("./config");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

// --- Global güvenlik ağı ---
// Selfbot kütüphanesi (discord.js-selfbot-v13) zaman zaman yakalanmamış
// hata/rejection fırlatır. Bunlar yakalanmazsa TÜM bot çöker ve process
// manager yeniden başlatır; bu da tokenlerin toplu yeniden girişine ve
// rate-limit yüzünden "hata" düşmesine yol açar. Aşağıdaki yakalayıcılar
// botun tek bir selfbot hatası yüzünden komple çökmesini engeller.
process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
});

client.on("error", (err) => console.error("[Ana Bot Hatası]", err?.message || err));
client.on("shardError", (err) => console.error("[Shard Hatası]", err?.message || err));

client.komutlar = new Collection();
client.interactionlar = new Collection();

const komutKlasor = path.join(__dirname, "src", "komutlar");
for (const dosya of fs.readdirSync(komutKlasor).filter(f => f.endsWith(".js"))) {
    const komut = require(path.join(komutKlasor, dosya));
    client.komutlar.set(komut.name, komut);
}

const interactionKlasor = path.join(__dirname, "src", "interactionlar");
for (const dosya of fs.readdirSync(interactionKlasor).filter(f => f.endsWith(".js"))) {
    const handler = require(path.join(interactionKlasor, dosya));
    if (handler.name) client.interactionlar.set(handler.name, handler);
}

const eventKlasor = path.join(__dirname, "src", "eventler");
for (const dosya of fs.readdirSync(eventKlasor).filter(f => f.endsWith(".js"))) {
    const event = require(path.join(eventKlasor, dosya));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

mongoose.connect(mongoUri)
    .then(() => {
        console.log("✅ MongoDB bağlantısı kuruldu");
        return client.login(botToken);
    })
    .catch(err => {
        console.error("❌ Başlangıç hatası:", err);
        process.exit(1);
    });
