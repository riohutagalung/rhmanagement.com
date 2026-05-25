const notificationController = {
    // 1. Kirim Notifikasi ke Brand (Misal: Pengingat kerjaan KOL beres)
    sendToBrand: async (req, res) => {
        try {
            const { brand_email, campaign_title, message } = req.body;

            console.log(`[EMAIL-SIMULATION] Mengirim email ke Brand (${brand_email})...`);
            console.log(`Subject: Proyek [${campaign_title}] Ada Update Baru!`);
            console.log(`Isi Pesan: ${message}`);

            return res.status(200).json({ status: "SENT", message: "Notifikasi ke Brand sukses terkirim (Simulasi)." });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Gagal memproses notifikasi Brand." });
        }
    },

    // 2. Kirim Notifikasi ke KOL (Misal: Kabar gembira duit rekber sudah cair)
    sendToKOL: async (req, res) => {
        try {
            const { kol_email, amount, message } = req.body;

            console.log(`[EMAIL-SIMULATION] Mengirim email ke KOL (${kol_email})...`);
            console.log(`Subject: 💰 Hore! Dana Cair Rp${amount}`);
            console.log(`Isi Pesan: ${message}`);

            return res.status(200).json({ status: "SENT", message: "Notifikasi ke KOL sukses terkirim (Simulasi)." });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Gagal memproses notifikasi KOL." });
        }
    }
};

module.exports = notificationController;