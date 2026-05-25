const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel'); // Pastikan path model-nya benar

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_RAHASIA_PT_ABANG_123';

const authController = {
    // LOGIKA PENDAFTARAN AKUN
    register: async (req, res) => {
        try {
            const { name, email, password, role } = req.body;

            // Validasi input wajib
            if (!name || !email || !password || !role) {
                return res.status(400).json({ message: "Semua data wajib diisi, bang!" });
            }

            // Cek apakah email sudah terdaftar sebelumnya
            const userExists = await UserModel.findByEmail(email);
            if (userExists) {
                return res.status(400).json({ message: "Email ini sudah dipakai orang lain." });
            }

            // Enkripsi password menggunakan Bcrypt (10 rounds hash)
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Simpan ke database via model
            const newUser = await UserModel.create(name, email, passwordHash, role);

            return res.status(201).json({
                status: "SUCCESS",
                message: "Akun berhasil dibuat dan brankas saldo diaktifkan!",
                data: newUser
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Gagal server error pas register." });
        }
    },

    // LOGIKA MASUK AKUN (LOGIN)
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email dan password jangan dikosongin." });
            }

            // Cari user di database
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(400).json({ message: "Email atau password abang salah." });
            }

            // Cocokkan matematika hash password yang diketik vs database
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ message: "Email atau password abang salah." });
            }

            // Bikin token JWT untuk akses masuk berdurasi 1 hari
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

            // Kunci token ke dalam HttpOnly Cookie agar kebal dari pencurian script hacker (XSS)
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Aktifkan https kalau sudah dideploy
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 hari kadaluarsa
            });

            return res.status(200).json({
                status: "SUCCESS",
                message: "Login sukses, selamat datang kembali!",
                user: { id: user.id, name: user.name, role: user.role }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Gagal server error pas login." });
        }
    }
};

module.exports = authController;