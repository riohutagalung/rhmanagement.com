// Konfigurasi Pintu Gerbang API (Saat lokal pakai Port 5001, nanti saat di VPS akan otomatis lewat Nginx Gateway)
const AUTH_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api/auth'
    : 'https://api.rhmanagement.com/api/auth'; // URL API Production nanti

const RHAuth = {
    // 1. FUNGSI PENDAFTARAN AKUN (REGISTER)
    register: async (username, email, password, role) => {
        try {
            const response = await fetch(`${AUTH_API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Gagal mendaftarkan akun.');
            }

            alert('🎉 Registrasi Berhasil! Silakan masuk ke akun Anda.');
            return data;
        } catch (error) {
            console.error('[AUTH_ERROR]:', error.message);
            alert(error.message);
        }
    },

    // 2. FUNGSI MASUK AKUN (LOGIN) + PENGALIHAN PORTAL OTOMATIS
    login: async (email, password) => {
        try {
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Email atau Password salah.');
            }

            // Simpan Token Keamanan & Data User di browser agar tidak hilang pas refresh
            localStorage.setItem('rh_token', data.token);
            localStorage.setItem('rh_user_role', data.user.role);
            localStorage.setItem('rh_user_name', data.user.username);

            alert(`👋 Selamat datang kembali, ${data.user.username}!`);

            // PENGALIHAN PORTAL OTOMATIS BERDASARKAN ROLE USER (Ala Shopee Ecosystem)
            if (data.user.role === 'ADMIN') {
                window.location.href = 'dashboard-admin.html';
            } else if (data.user.role === 'KOL') {
                window.location.href = 'dashboard-kol.html';
            } else if (data.user.role === 'BRAND') {
                window.location.href = 'dashboard-brand.html';
            } else {
                window.location.href = 'index.html';
            }

            return data;
        } catch (error) {
            console.error('[AUTH_ERROR]:', error.message);
            alert(error.message);
        }
    },

    // 3. FUNGSI LOGOUT (PEMBERSIH TOKEN)
    logout: () => {
        localStorage.removeItem('rh_token');
        localStorage.removeItem('rh_user_role');
        localStorage.removeItem('rh_user_name');
        alert('Keluar akun berhasil. Sampai jumpa!');
        window.location.href = 'index.html';
    },

    // 4. SATPAM PELINDUNG DASHBOARD (Cek user punya akses atau tidak)
    checkProtection: (requiredRole) => {
        const token = localStorage.getItem('rh_token');
        const role = localStorage.getItem('rh_user_role');

        if (!token || role !== requiredRole) {
            alert('🚫 Akses Ditolak! Anda tidak memiliki izin untuk melihat halaman ini.');
            window.location.href = 'index.html';
        }
    }
};