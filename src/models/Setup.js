const mongoose = require("mongoose");

const setupSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    gerekliRolId: { type: String, default: null },
    boosterRolId: { type: String, default: null },
    logKanalId: { type: String, default: null },
    tokenEkleLogKanalId: { type: String, default: null },
    tokenCikarLogKanalId: { type: String, default: null },
    sikayetKanalId: { type: String, default: null },
    normalSinir: { type: Number, default: 3 },
    boosterSinir: { type: Number, default: 7 },
});

module.exports = mongoose.model("Setup", setupSchema);
