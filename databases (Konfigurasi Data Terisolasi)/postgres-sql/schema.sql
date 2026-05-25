-- 1. Membuat Tipe Data Enum Khusus agar status data tidak bisa diisi sembarangan teks
CREATE TYPE user_role AS ENUM ('ADMIN', 'BRAND', 'KOL');
CREATE TYPE campaign_status AS ENUM ('PENDING_PAYMENT', 'ESCROW_LOCKED', 'WORK_SUBMITTED', 'DISPUTED', 'FUNDS_RELEASED', 'COMPLETED');
CREATE TYPE tx_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ESCROW_HOLD', 'ESCROW_RELEASE');

-- 2. TABEL UTAMA: USER (Akun Pengguna)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    bank_name VARCHAR(50),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL UTAMA: BALANCES (Brankas Saldo Digital Terisolasi)
CREATE TABLE balances (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance_active NUMERIC(15, 2) DEFAULT 0.00 CHECK (balance_active >= 0),
    balance_locked NUMERIC(15, 2) DEFAULT 0.00 CHECK (balance_locked >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL UTAMA: CAMPAIGNS (Data Transaksi Rekber Proyek)
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    brand_id INT REFERENCES users(id),
    kol_id INT REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_budget NUMERIC(15, 2) NOT NULL CHECK (total_budget > 0),
    status campaign_status DEFAULT 'PENDING_PAYMENT',
    invoice_id VARCHAR(100) UNIQUE, -- ID Unik dari Xendit/Midtrans nanti
    proof_link TEXT, -- Tempat KOL naro link video TikTok/IG kalau sudah beres
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL UTAMA: TRANSACTIONS (Log Audit Mutasi Uang - ANTI MANIPULASI)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    campaign_id INT REFERENCES campaigns(id),
    amount NUMERIC(15, 2) NOT NULL,
    type tx_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. INDEXING: Biar sistem database super kencang saat mencari data invoice dari Xendit (Skala Enterprise)
CREATE INDEX idx_campaigns_invoice ON campaigns(invoice_id);