// Checkout page - place order (Firebase Compat API)
// Firebase is initialized via firebase.js (db is global)

const produkId = localStorage.getItem("produkId");
let produk = null;

async function loadProduk() {
    if (!produkId) {
        document.getElementById("checkoutData").innerHTML = '<p class="muted">Tidak ada produk dipilih.</p>';
        return;
    }

    try {
        if (db) {
            const snap = await db.collection("products").doc(produkId).get();
            if (snap.exists) {
                produk = snap.data();
                renderCheckoutProduk();
                return;
            }
        }
    } catch (e) {
        console.error('Error loading product from Firestore:', e);
    }

    try {
        const stored = localStorage.getItem('sharedProductsData') || localStorage.getItem('sellerProductsBackup') || '[]';
        const parsed = JSON.parse(stored);
        const found = Array.isArray(parsed) ? parsed.find((item) => String(item.id || item.docId || '') === String(produkId)) : null;
        if (found) {
            produk = {
                id: found.id || found.docId || produkId,
                nama: found.nama || found.name || 'Produk',
                harga: Number(found.harga ?? found.price ?? 0),
                stok: Number(found.stok ?? found.stock ?? 0),
                kategori: found.kategori || found.category || 'makanan',
                gambar: found.gambar || found.image || ''
            };
            renderCheckoutProduk();
            return;
        }
    } catch (e) {
        console.error('Error loading product from storage:', e);
    }

    document.getElementById("checkoutData").innerHTML = '<p class="muted">Produk tidak ditemukan.</p>';
}

function renderCheckoutProduk() {
    if (!produk) return;
    document.getElementById("checkoutData").innerHTML = `
        <h3>${produk.nama}</h3>
        <p>Rp ${Number(produk.harga).toLocaleString('id-ID')}</p>
        <p>Stok: ${produk.stok || '-'}</p>
        <div class="field-group">
            <label for="qty">Jumlah</label>
            <input id="qty" type="number" value="1" min="1" />
        </div>
    `;
}

loadProduk();

// Handle checkout
const checkoutBtn = document.getElementById('checkoutBtn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async function () {
        if (!produk) {
            alert('Produk tidak ditemukan.');
            return;
        }

        const qty = Number(document.getElementById("qty").value) || 1;
        let buyerName = localStorage.getItem("buyerName") || "Pembeli";
        let buyerWhatsapp = localStorage.getItem("buyerWhatsapp") || "-";
        // Baca dari 'buyerInfo' (format penyimpanan login yang sebenarnya dipakai)
        try {
            const buyerInfo = JSON.parse(localStorage.getItem('buyerInfo') || '{}');
            if (buyerInfo.name) buyerName = buyerInfo.name;
            if (buyerInfo.whatsapp) buyerWhatsapp = buyerInfo.whatsapp;
        } catch (e) {
            // abaikan
        }

        // Generate nomor antrian berdasarkan waktu pemesanan (jam:menit:detik)
        let queue = 'A-' + new Date().toTimeString().slice(0, 8).replace(/:/g, '');
        try {
            if (typeof generateQueueNumberFromTime === 'function') {
                queue = generateQueueNumberFromTime(new Date());
            }
        } catch (e) {
            console.warn('Gagal generate antrian:', e);
        }

        const total = produk.harga * qty;

        // Simpan ke Firestore jika tersedia (opsional, tidak menghalangi kirim WhatsApp)
        if (db) {
            try {
                await db.collection("orders").add({
                    buyerEmail: "",
                    buyerName: buyerName,
                    buyerWhatsapp: buyerWhatsapp,
                    productId: produkId,
                    productName: produk.nama,
                    price: produk.harga,
                    qty: qty,
                    total: total,
                    status: "menunggu pembayaran",
                    paymentStatus: "belum dibayarkan",
                    queueNumber: queue,
                    notes: "",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.warn('Gagal simpan order ke Firestore:', e);
            }
        }

        // Kirim pesanan ke WhatsApp penjual (6287727114562) — SELALU dijalankan
        const lines = [
            '🛒 *PESANAN BARU - CHOMMELL FARM*',
            '============================',
            `👤 Nama: ${buyerName}`,
            `📱 WA: ${buyerWhatsapp}`,
            '',
            '*Detail Pesanan:*',
            `• ${qty}x ${produk.nama} — Rp ${Number(total).toLocaleString('id-ID')}`,
            '',
            `💰 *Total: Rp ${Number(total).toLocaleString('id-ID')}*`,
            `🔢 Nomor Antrian: ${queue}`,
            '',
            'Terima kasih 🙏'
        ];
        const waUrl = 'https://api.whatsapp.com/send/?phone=6287727114562&text=' + encodeURIComponent(lines.join('\n'));
        try {
            const waWin = window.open(waUrl, '_blank');
            if (!waWin) window.location.href = waUrl;
        } catch (e) {
            window.location.href = waUrl;
        }

        alert("✅ Pesanan berhasil dibuat & dikirim ke WhatsApp.");
        localStorage.removeItem('produkId');
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
    });
}

