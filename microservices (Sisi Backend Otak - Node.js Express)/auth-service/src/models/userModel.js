const { Pool } = require('pg');

// Hubungkan ke PostgreSQL internal network docker nanti
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secret@postgres-sql:5432/escrow_db'
});

const UserModel = {
    // 1. Fungsi mencari user berdasarkan email (Untuk cek duplikat & proses login)
    findByEmail: async (email) => {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },

    // 2. Fungsi mendaftarkan user baru + otomatis membuatkan dompet saldo kosongnya
    create: async (name, email, passwordHash, role) => {
        // Kita gunakan sistem ACID Transaction database agar jika salah satu gagal, semua dibatalkan otomatis
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Masukkan data ke tabel users
            const userResult = await client.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
                [name, email, passwordHash, role]
            );
            const newUser = userResult.rows[0];

            // Detik itu juga, buatkan brankas saldonya di tabel balances (Saldo awal Rp0)
            await client.query(
                'INSERT INTO balances (user_id, balance_active, balance_locked) VALUES ($1, 0.00, 0.00)',
                [newUser.id]
            );

            await client.query('COMMIT');
            return newUser;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = UserModel;