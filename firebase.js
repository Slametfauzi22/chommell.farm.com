// Firebase initialization - Compat SDK (for use with <script> tags)
const firebaseConfig = {
    apiKey: "AIzaSyA3sa5N6pM_o39XV7YSwcK89iw4w22h_nE",
    authDomain: "chommell-farm-kendaldoyong.firebaseapp.com",
    projectId: "chommell-farm-kendaldoyong",
    storageBucket: "chommell-farm-kendaldoyong.firebasestorage.app",
    messagingSenderId: "384381412093",
    appId: "1:384381412093:web:0a4286df0c888adee85494",
    measurementId: "G-P45PEHYTD0"
};

let db = null;
let auth = null;

try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== 'undefined') {
        db = firebase.firestore();
        auth = firebase.auth ? firebase.auth() : null;
        console.log('🔥 Firebase Firestore + Auth terinisialisasi (Project:', firebaseConfig.projectId + ')');
    }
} catch (e) {
    console.warn('⚠️ Firebase initialization error:', e);
}

function isFirebaseAvailable() {
    return db !== null;
}

function getFirebaseAuth() {
    return auth;
}

function isFirebaseAuthConfigMissingError(error) {
    const code = (error && (error.code || error.message || '')) || '';
    return code.includes('configuration-not-found') || code.includes('auth/configuration-not-found');
}

async function signInWithEmailPassword(email, password) {
    if (!auth || typeof auth.signInWithEmailAndPassword !== 'function') {
        return { ok: false, message: 'Firebase Auth tidak tersedia pada halaman ini.' };
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { ok: true, user: userCredential.user };
    } catch (error) {
        if (isFirebaseAuthConfigMissingError(error)) {
            console.warn('⚠️ Firebase Authentication belum aktif di Firebase Console. Fallback lokal tetap dipakai.');
            return {
                ok: false,
                message: 'Firebase Authentication belum aktif di console. Gunakan password lokal penjual.',
                configMissing: true
            };
        }

        console.error('Firebase Auth sign-in error:', error);
        return {
            ok: false,
            message: error && error.message ? error.message : 'Login gagal.'
        };
    }
}

async function signOutCurrentUser() {
    if (!auth || typeof auth.signOut !== 'function') return;
    try {
        await auth.signOut();
        localStorage.removeItem('firebaseAuthCurrentUser');
    } catch (error) {
        console.warn('Gagal sign-out Firebase:', error);
    }
}

function getCurrentFirebaseUser() {
    return auth ? auth.currentUser : null;
}

if (auth && typeof auth.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged((user) => {
        try {
            localStorage.setItem('firebaseAuthCurrentUser', JSON.stringify(user ? { uid: user.uid, email: user.email } : null));
        } catch (error) {
            console.warn('Gagal menyimpan status auth:', error);
        }
    });
}

// ===== NOMOR ANTRIAN BERDASARKAN WAKTU PEMESANAN =====
// Membuat nomor antrian dari waktu pemesanan (jam:menit:detik + milidetik).
// Contoh: pesanan pada pukul 14:30:25.123 → "A-143025123".
// Fungsi global ini dipakai di buyer.js, script.js, dan checkout.js.
function generateQueueNumberFromTime(dateObj) {
    const d = dateObj instanceof Date && !isNaN(dateObj) ? dateObj : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    // Tambahkan milidetik agar setiap pesanan di detik yang sama tetap unik
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return 'A-' + timeStr + ms;
}

// Fallback: jika ingin tetap memakai antrian berurutan (dipakai bila fungsi waktu tidak tersedia)
function generateQueueNumberFirestoreFallback() {
    let c = Number(localStorage.getItem('queueCounter') || '0') + 1;
    localStorage.setItem('queueCounter', String(c));
    return 'A-' + String(c).padStart(3, '0');
}

