const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware dasar untuk membaca JSON dan Cookie dari browser
app.use(express.json());
app.use(cookieParser());

// Routing Test (Pastikan service nyala)
// Daftarkan endpoint URL resmi untuk publik akses register dan login
const authController = require('./controllers/authController');
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/health', (req, res) => {
    res.status(200).json({ status: "OK", message: "Auth Service running clean." });
});

// Port internal sesuai spesifikasi arsitektur enterprise kita
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`[AUTH-SERVICE] Berjalan mantap di port ${PORT}`);
});