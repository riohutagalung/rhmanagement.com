const express = require('express');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const app = express();
app.use(express.json());

// HTTP Server Ringan sebagai pemicu (Trigger) internal
const PORT = process.env.PORT || 5005;
const server = app.listen(PORT, () => {
    console.log(`[WEBSOCKET-STREAM] Engine menyala mantap di port ${PORT}`);
});

// Pasang Engine WebSocket Server di atas HTTP Server tadi
const wss = new WebSocketServer({ server });

// Tempat menyimpan daftar user yang sedang online/konek ke web kita
const onlineUsers = new Map();

wss.on('connection', (ws, req) => {
    console.log('[WEBSOCKET] Ada user baru berhasil tersambung via browser!');

    // Mendengarkan pesan dari browser (Misal pas pertama konek, user kirim ID mereka)
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'REGISTER_IDENTIFICATION') {
                // Kunci ID User ke dalam memory map biar kita tahu koneksi ini milik siapa
                onlineUsers.set(data.user_id, ws);
                console.log(`[WEBSOCKET] User ID ${data.user_id} sekarang statusnya: ONLINE`);
            }
        } catch (err) {
            console.error("Format pesan websocket salah.");
        }
    });

    // Jika user menutup tab browser atau putus koneksi internet
    ws.on('close', () => {
        for (let [user_id, client] of onlineUsers.entries()) {
            if (client === ws) {
                onlineUsers.delete(user_id);
                console.log(`[WEBSOCKET] User ID ${user_id} sekarang statusnya: OFFLINE`);
                break;
            }
        }
    });
});

// ENDPOINT INTERNAL: Digunakan oleh service lain (seperti escrow-service) untuk kirim sinyal real-time
app.post('/api/stream/broadcast', (req, res) => {
    const { target_user_id, event_name, payload } = req.body;

    // Cari tahu apakah user yang mau dikirimin notifikasi lagi online atau tidak
    const targetSocket = onlineUsers.get(target_user_id);

    if (targetSocket && targetSocket.readyState === targetSocket.OPEN) {
        // Tembak data langsung ke layar browser user detik itu juga!
        targetSocket.send(JSON.stringify({
            event: event_name,
            data: payload
        }));
        return res.status(200).json({ status: "BROADCASTED", message: "Sinyal real-time sukses ditembak!" });
    }

    return res.status(200).json({ status: "SKIPPED", message: "User sedang offline, sinyal di-skip." });
});