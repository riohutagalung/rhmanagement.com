const { Pool } = require('pg');

// Hubungkan ke PostgreSQL internal network Docker
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secret@postgres-sql:5432/escrow_db'
});

const escrowController = {
    // 1. ALUR LOCK DANA (Duit Brand Dikunci Saat Project Mulai)
    lockFunds: async (req, res) => {
        const client = await pool.connect();
        try {
            const { brand_id, title, description, total_budget, invoice_id } = req.body;

            if (!brand_id || !total_budget || !invoice_id) {
                return res.status(400).json({ message: "Data lock dana kurang lengkap, bang!" });
            }

            // Memulai transaksi database (Mulai mengunci baris data)
            await client.query('BEGIN');

            // Cek saldo aktif Brand cukup atau tidak
            const balanceCheck = await client.query(
                'SELECT balance_active FROM balances WHERE user_id = $1 FOR UPDATE', 
                [brand_id]
            );
            
            if (balanceCheck.rows.length === 0 || Number(balanceCheck.rows[0].balance_active) < Number(total_budget)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: "Saldo aktif Brand kagak cukup untuk lock project ini." });
            }

            // Potong saldo aktif Brand dan pindahkan ke saldo terkunci (Escrow)
            await client.query(
                'UPDATE balances SET balance_active = balance_active - $1, balance_locked = balance_locked + $1 WHERE user_id = $2',
                [total_budget, brand_id]
            );

            // Bikin baris campaign baru dengan status ESCROW_LOCKED
            const campaignResult = await client.query(
                `INSERT INTO campaigns (brand_id, title, description, total_budget, invoice_id, status) 
                 VALUES ($1, $2, $3, $4, $5, 'ESCROW_LOCKED') RETURNING id, title, status`,
                [brand_id, title, description, total_budget, invoice_id]
            );

            // Catat log mutasi keuangan di tabel transaksi biar bisa diaudit PT abang
            await client.query(
                `INSERT INTO transactions (user_id, campaign_id, amount, type, description) 
                 VALUES ($1, $2, $3, 'ESCROW_HOLD', $4)`,
                [brand_id, campaignResult.rows[0].id, total_budget, `Dana proyek "${title}" berhasil dikunci di sistem rekber.`]
            );

            // Jika semua lancar, kunci data secara permanen ke database
            await client.query('COMMIT');

            return res.status(200).json({
                status: "SUCCESS",
                message: "Dana Brand berhasil dikunci dengan aman di sistem rekber!",
                data: campaignResult.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK'); // Batalkan semua perubahan jika ada error sistem
            console.error(error);
            return res.status(500).json({ message: "Gagal memproses penguncian dana (Server Error)." });
        } finally {
            client.release(); // Kembalikan slot koneksi ke database pool
        }
    },

    // 2. ALUR RELEASE DANA (Duit Ditransfer ke Dompet Digital KOL)
    releaseFunds: async (req, res) => {
        const client = await pool.connect();
        try {
            const { campaign_id, admin_or_brand_id } = req.body;

            if (!campaign_id) {
                return res.status(400).json({ message: "ID Campaign wajib diisi, bang!" });
            }

            await client.query('BEGIN');

            // Ambil data campaign yang mau dicairkan
            const campaignCheck = await client.query(
                'SELECT * FROM campaigns WHERE id = $1 FOR UPDATE',
                [campaign_id]
            );

            if (campaignCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: "Proyek rekber tidak ditemukan." });
            }

            const campaign = campaignCheck.rows[0];

            // Proteksi: Uang hanya bisa cair kalau statusnya belum beres/belum rilis
            if (campaign.status === 'FUNDS_RELEASED' || campaign.status === 'COMPLETED') {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: "Uang untuk proyek ini sudah dicairkan sebelumnya." });
            }

            const total_funds = campaign.total_budget;
            const brand_id = campaign.brand_id;
            const kol_id = campaign.kol_id;

            if (!kol_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: "Proyek ini belum diambil atau diklaim oleh KOL mana pun." });
            }

            // Kurangi saldo terkunci (balance_locked) milik Brand
            await client.query(
                'UPDATE balances SET balance_locked = balance_locked - $1 WHERE user_id = $2',
                [total_funds, brand_id]
            );

            // Masukkan uang tersebut ke saldo aktif (balance_active) milik KOL agar bisa dicairkan ke ATM
            await client.query(
                'UPDATE balances SET balance_active = balance_active + $1 WHERE user_id = $2',
                [total_funds, kol_id]
            );

            // Ubah status proyek menjadi FUNDS_RELEASED
            await client.query(
                "UPDATE campaigns SET status = 'FUNDS_RELEASED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [campaign_id]
            );

            // Catat log transaksi sukses untuk KOL
            await client.query(
                `INSERT INTO transactions (user_id, campaign_id, amount, type, description) 
                 VALUES ($1, $2, $3, 'ESCROW_RELEASE', $4)`,
                [kol_id, campaign_id, total_funds, `Menerima pencairan dana dari proyek "${campaign.title}".`]
            );

            await client.query('COMMIT');

            return res.status(200).json({
                status: "SUCCESS",
                message: "Dana rekber resmi dirilis! Sekarang saldo sudah masuk ke dompet utama KOL.",
                campaign_id: campaign_id
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(error);
            return res.status(500).json({ message: "Gagal merilis dana rekber (Server Error)." });
        } finally {
            client.release();
        }
    }
};

module.exports = escrowController;