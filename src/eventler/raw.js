module.exports = {
  name: "raw",
  once: false,
  execute(packet, ...rest) {
    // index.js, son argüman olarak client'i geçiriyor (args uzunluğuna bağlı değil)
    const client = rest[rest.length - 1];

    if (!client.rawModals) client.rawModals = new Map();

    // 5 = MODAL_SUBMIT
    if (packet.t === "INTERACTION_CREATE" && packet.d && packet.d.type === 5) {
      client.rawModals.set(packet.d.id, packet.d);
      // Olası sızıntıları önlemek için 2 dakika sonra temizle
      setTimeout(() => client.rawModals.delete(packet.d.id), 120000);
    }
  },
};
