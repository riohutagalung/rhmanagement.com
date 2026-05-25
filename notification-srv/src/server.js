const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const notificationController = require('./controllers/notificationController');

// ROUTING RESMI NOTIFIKASI INTER-SERVICE
app.post('/api/notification/brand', notificationController.sendToBrand);
app.post('/api/notification/kol', notificationController.sendToKOL);

// Health Check
app.get('/api/notification/health', (req, res) => {
    res.status(200).json({ status: "OK", message: "Notification Service is alive and listening." });
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
    console.log(`[NOTIFICATION-SRV] Siap mengirim kabar di port ${PORT}`);
});