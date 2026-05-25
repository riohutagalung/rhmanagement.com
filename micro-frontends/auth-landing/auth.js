// ==========================================================================
// 🌐 KONFIGURASI PINTU GERBANG API OTOMATIS (DYNAMIC ROUTING)
// ==========================================================================
// Jika diakses dari localhost, dia tembak port 5001. 
// Jika diakses dari Vercel/Internet, dia otomatis pakai IP VPS atau Domain Production abang.
const AUTH_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api/auth'
    : 'http://103.x.x.x:5001/api/auth'; // 💡 GANTI '103.x.x.x' dengan IP Publik VPS abang (atau domain kalau sudah pasang Nginx SSL)

console.log(`[RH-AUTH-GATEWAY]: Terhubung ke API di -> ${AUTH_API_URL}`);

const RHAuth = {
    // ==========================================================================
    // 📝 1. FUNGSI PENDAFTARAN AKUN (REGISTER)
    // ==========================================================================
    register: async (username, email, password, role) => {
        try {
            // Validasi input dasar di frontend sebelum menembak server
            if (!username || !email || !password || !role) {
                alert('⚠️ Mohon isi semua field data dengan lengkap!');
                return false;
            }

            const response = await fetch(`${AUTH_API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Gagal mendaftarkan akun.');
            }

            alert('🎉 Registrasi Berhasil! Akun Anda sudah terdaftar di database RH Management. Silakan masuk (Login).');
            return true;
        } catch (error) {
            console.error('[AUTH_REGISTER_ERROR]:', error.message);
            alert(`❌ Gagal Daftar: ${error.message}\n\n(Pastikan microservice backend di port 5001 sudah menyala & CORS di-allow)`);
            return false;
        }
    },

    // ==========================================================================
    // 🔑 2. FUNGSI MASUK AKUN (LOGIN) + REDIRECT PORTAL OTOMATIS
    // ==========================================================================
    login: async (email, password) => {
        try {
            if (!email || !password) {
                alert('⚠️ Email dan Password tidak boleh kosong!');
                return false;
            }

            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Email atau Password salah.');
            }

            // Amankan Token JWT & Meta Data User ke LocalStorage Browser
            localStorage.setItem('rh_token', data.token);
            localStorage.setItem('rh_user_role', data.user.role);
            localStorage.setItem('rh_user_name', data.user.username);

            alert(`👋 Selamat datang kembali di Portal, ${data.user.username}!`);

            // PENGALIHAN LOGIKAL DASHBOARD SESUAI HAK AKSES (ROLE)
            const userRole = data.user.role.toUpperCase();
            if (userRole === 'ADMIN') {
                window.location.href = 'dashboard-admin.html';
            } else if (userRole === 'KOL' || userRole === 'TALENT') {
                window.location.href = 'dashboard-kol.html';
            } else if (userRole === 'BRAND' || userRole === 'CLIENT') {
                window.location.href = 'dashboard-brand.html';
            } else {
                window.location.href = 'index.html';
            }

            return data;
        } catch (error) {
            console.error('[AUTH_LOGIN_ERROR]:', error.message);
            alert(`❌ Gagal Masuk: ${error.message}`);
            return false;
        }
    },

    // ==========================================================================
    // 🚪 3. FUNGSI LOGOUT (WIPE OUT DATA SATELLITE)
    // ==========================================================================
    logout: () => {
        localStorage.removeItem('rh_token');
        localStorage.removeItem('rh_user_role');
        localStorage.removeItem('rh_user_name');
        alert('Keluar dari sistem sukses. Sampai jumpa kembali!');
        window.location.href = 'index.html';
    },

    // ==========================================================================
    // 🛡️ 4. SATPAM PROTECTION (Ditaruh di halaman dashboard agar tidak bisa ditembus lewat URL)
    // ==========================================================================
    checkProtection: (requiredRole) => {
        const token = localStorage.getItem('rh_token');
        const role = localStorage.getItem('rh_user_role');

        if (!token || role?.toUpperCase() !== requiredRole.toUpperCase()) {
            alert('🚫 Akses Ditolak! Anda tidak memiliki otoritas atau sesi Anda telah berakhir.');
            window.location.href = 'index.html';
        }
    }
};