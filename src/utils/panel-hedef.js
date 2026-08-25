// panelMsgId -> hangi kullanıcının tokenlerinin gösterildiği/işlendiği.
// `.tokenkontrol` normalde komutu çalıştıranın kendi tokenlerini gösterir —
// bu durumda map'e hiç ihtiyaç yok, `interaction.user.id` zaten doğrudur.
// Ama owner `.tokenkontrol <kişi>` ile BAŞKASININ panelini açtığında, panel
// üzerindeki HER tıklama (sunucu seç, sayfala, mic/deaf, ayarlar...) owner'a
// ait olduğu için `interaction.user.id` hep owner'ı verir — bu map o zaman
// devreye girip gerçek hedefi (ya da "hepsi" modunda null) hatırlatır.
//
// Kullanım: `panelHedefMap.has(msgId) ? panelHedefMap.get(msgId) : interaction.user.id`
module.exports = new Map();
