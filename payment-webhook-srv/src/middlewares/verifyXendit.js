// Middleware penjamin bahwa yang ngirim data beneran server resmi Xendit
const verifyXenditToken = (req, res, next) => {
    const xenditXToken = req.headers['x-callback-token'];
    const WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN || 'TOKEN_RAHASIA_DARI_DASHBOARD_XENDIT';

    // Jika token yang dikirim Xendit tidak cocok dengan yang ada di server kita, BLOKIR!
    if (xenditXToken !== WEBHOOK_TOKEN) {
        console.error(`[WARNING] Ada percobaan hit webhook palsu dari IP: ${req.ip}`);
        return res.status(401).json({ message: "Dilarang masuk! Token webhook salah." });
    }

    next(); // Jika cocok, silakan lanjut ke proses pengisian saldo
};

module.exports = verifyXenditToken;