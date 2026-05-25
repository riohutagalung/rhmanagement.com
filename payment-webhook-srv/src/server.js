const express = require('express');
const { Pool } = require('pg');
const verifyXendit = require('./middlewares/verifyXendit');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secret@postgres-sql:5432/escrow_db'
});

// ENDPOINT RAHASIA: Tempat Xendit mengirim laporan uang masuk
app.post('/api/payment/webhook', verifyXendit, async (req, res) => {
    try {
        const { external_id, amount, status, status: paymentStatus } = req.body;

        // Kita hanya proses transaksi yang statusnya COMPLETED atau PAID (Uang sudah masuk)
        if (status === 'PAID' || status === 'COMPLETED') {
            
            // Ambil data user_id berdasarkan invoice ID (external_id) dari database
            // Note: Di real-case, external_id biasanya berisi ID user atau invoice referensi
            const user_id = external_id.split('-')[1]; // Contoh format external_id: "INV-10" -> kita ambil angka 10

            if (!user_id) {
                return res.status(400).json({ message: "Format ID Invoice tidak valid." });
            }

            // Tambahkan nominal uang ke saldo aktif user tersebut secara otomatis
            await pool.query(
                'UPDATE balances SET balance_active = balance_active + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
                [amount, user_id]
            );

            // Catat riwayat uang masuk ke tabel transaksi untuk audit PT
            await pool.query(
                `INSERT INTO transactions (user_id, amount, type, description) 
                 VALUES ($1, $2, 'DEPOSIT', $3)`,
                [user_id, amount, `Setoran dana via Xendit sebesar Rp${amount} otomatis masuk ke saldo aktif.`]
            );

            console.log(`[PAYMENT-SUCCESS] Saldo User ID ${user_id} berhasil bertambah sebesar Rp${amount}`);
        }

        // Xendit mewajibkan kita mengirim balik respon status 200 sebagai tanda laporan sudah diterima
        return res.status(200).json({ status: "ACKNOWLEDGED" });

    } catch (error) {
        console.error("[WEBHOOK-ERROR]", error);
        return res.status(500).json({ message: "Internal server error pas dengerin webhook." });
    }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`[PAYMENT-WEBHOOK-SRV] Siap menangkap duit di port ${PORT}`);
});