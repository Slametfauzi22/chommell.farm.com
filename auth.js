// Auth functions for Chommell Farm
// Simple email-based authentication
// Firebase is initialized via firebase.js (db is global)

const adminEmailAllowed = 'slametfauzi2003@gmail.com';

// --- Fungsi Registered Buyers (sync ke Firestore & localStorage) ---
const REGISTERED_BUYERS_KEY = 'registeredBuyers';

function getRegisteredBuyers() {
    try {
        return JSON.parse(localStorage.getItem(REGISTERED_BUYERS_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function saveRegisteredBuyerLocal(name, whatsapp) {
    const buyers = getRegisteredBuyers();
    const exists = buyers.find(b => b.whatsapp === whatsapp);
    if (!exists) {
        buyers.push({
            name,
            whatsapp,
            loginAt: Date.now(),
            loginDate: new Date().toLocaleString('id-ID')
        });
        localStorage.setItem(REGISTERED_BUYERS_KEY, JSON.stringify(buyers));
    } else {
        exists.loginAt = Date.now();
        exists.loginDate = new Date().toLocaleString('id-ID');
        localStorage.setItem(REGISTERED_BUYERS_KEY, JSON.stringify(buyers));
    }
}

async function saveRegisteredBuyerToFirestore(name, whatsapp) {
    if (!db) {
        saveRegisteredBuyerLocal(name, whatsapp);
        return;
    }
    try {
        const query = await db.collection("registeredBuyers")
            .where("whatsapp", "==", whatsapp)
            .get();
        if (query.empty) {
            await db.collection("registeredBuyers").add({
                name: name,
                whatsapp: whatsapp,
                loginAt: Date.now(),
                loginDate: new Date().toLocaleString('id-ID')
            });
        } else {
            query.forEach(async (doc) => {
                await db.collection("registeredBuyers").doc(doc.id).update({
                    loginAt: Date.now(),
                    loginDate: new Date().toLocaleString('id-ID')
                });
            });
        }
    } catch (e) {
        console.warn('Gagal simpan buyer ke Firestore:', e);
    }
    saveRegisteredBuyerLocal(name, whatsapp);
}

window.login = function login() {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Silakan isi email dan password.');
        return;
    }

    if (email === adminEmailAllowed) {
        localStorage.setItem('currentUserRole', 'seller');
        window.location.href = 'seller.html';
    } else {
        const name = email.split('@')[0] || 'Pembeli';
        const whatsapp = '-';
        saveRegisteredBuyerToFirestore(name, whatsapp);
        localStorage.setItem('buyerInfo', JSON.stringify({ name, whatsapp }));
        localStorage.setItem('currentUserRole', 'buyer');
        window.location.href = 'buyer.html';
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const loginBtn = document.getElementById('buyerLoginConfirmBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', window.buyerLogin);
    }
});

window.buyerLogin = function buyerLogin() {
    const name = document.getElementById('buyerName').value.trim();
    const whatsapp = document.getElementById('buyerWhatsapp').value.trim();

    if (!name) {
        alert('Silakan isi nama lengkap Anda.');
        return;
    }
    if (!whatsapp) {
        alert('Silakan isi nomor WhatsApp Anda.');
        return;
    }

    // Save to Firestore & localStorage (cross-device)
    saveRegisteredBuyerToFirestore(name, whatsapp);
    localStorage.setItem('buyerInfo', JSON.stringify({ name, whatsapp }));
    localStorage.setItem('currentUserRole', 'buyer');
    window.location.href = 'index.html';
};

