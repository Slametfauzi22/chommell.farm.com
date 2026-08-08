// Buyer page - displaying products and handling purchases (Firebase Compat API)
// Firebase is initialized via firebase.js (db is global)

// Note: REGISTERED_BUYERS_KEY, getRegisteredBuyers(), saveRegisteredBuyer()
// are already defined in script.js (loaded before this file)

// Check if current user is a buyer
const currentRole = localStorage.getItem('currentUserRole');
const buyerInfo = JSON.parse(localStorage.getItem('buyerInfo') || '{}');

if (currentRole === 'seller') {
    alert("Anda bukanlah pembeli");
    window.location.href = "seller.html";
}

// Auto-register buyer to seller's buyer list
if (buyerInfo.name && buyerInfo.whatsapp) {
    saveRegisteredBuyer(buyerInfo.name, buyerInfo.whatsapp);
    // Sinkronkan juga ke Firestore (registeredBuyers) agar pembeli langsung
    // tampil real-time di halaman penjual, bukan hanya di localStorage.
    if (typeof saveRegisteredBuyerToFirestore === 'function') {
        saveRegisteredBuyerToFirestore(buyerInfo.name, buyerInfo.whatsapp);
    }
}

// Display buyer info
const buyerInfoDiv = document.getElementById('buyerInfo');
if (buyerInfoDiv && buyerInfo.name) {
    buyerInfoDiv.innerHTML = `<p>Selamat datang, <strong>${buyerInfo.name}</strong> (${buyerInfo.whatsapp || '-'})</p>`;
} else if (buyerInfoDiv) {
    buyerInfoDiv.innerHTML = `<p class="muted">Silakan login terlebih dahulu di halaman utama.</p>`;
}

// Populate buyer phone display field if it exists
const buyerPhoneDisplay = document.getElementById('buyerPhoneDisplay');
if (buyerPhoneDisplay && buyerInfo.whatsapp) {
    buyerPhoneDisplay.value = buyerInfo.whatsapp;
}

// Populate customer name field (customerName is already declared in script.js)
if (typeof customerName !== 'undefined' && customerName && buyerInfo.name) {
    customerName.value = buyerInfo.name;
} else if (buyerInfo.name) {
    const nameInput = document.getElementById('customerName');
    if (nameInput) nameInput.value = buyerInfo.name;
}

// ===== FORMAT RUPIAH =====
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

function normalizeBuyerCategory(value) {
    const raw = String(value || '').trim().toLowerCase();
    const map = {
        'makanan & minuman': 'makanan',
        'makanan': 'makanan',
        'ikan hias & akuarium': 'ikan',
        'ikan': 'ikan',
        'unggas & aksesorisnya': 'unggas',
        'unggas': 'unggas',
        'aksesoris pribadi': 'pribadi',
        'pribadi': 'pribadi',
        'aksesoris kamar tidur': 'kamar',
        'kamar': 'kamar',
        'bibit sayuran': 'lainnya',
        'lainnya': 'lainnya'
    };
    return map[raw] || raw || 'makanan';
}

// ===== VARIABEL FILTER KATEGORI =====
let currentCategoryFilter = 'all';

// Label tampilan untuk kategori
const BUYER_CATEGORY_LABELS = {
    'all': 'Semua',
    'makanan': 'Makanan & Minuman',
    'ikan': 'Ikan Hias & Akuarium',
    'unggas': 'Unggas & Aksesorisnya',
    'pribadi': 'Aksesoris Pribadi',
    'kamar': 'Aksesoris Kamar Tidur',
    'lainnya': 'Bibit Sayuran'
};

function getBuyerCategoryLabel(kategori) {
    if (BUYER_CATEGORY_LABELS[kategori]) return BUYER_CATEGORY_LABELS[kategori];
    // Kategori kustom: ubah "sayur-dan-buah" -> "Sayur Dan Buah"
    return String(kategori || 'Lainnya')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

// ===== RENDER TAB KATEGORI DINAMIS (mendukung kategori tak terbatas) =====
function renderBuyerCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    // Kumpulkan semua kategori unik dari produk
    const kategoriSet = new Set();
    buyerProductsCache.forEach((p) => {
        kategoriSet.add(normalizeBuyerCategory(p.kategori || p.category || 'makanan'));
    });
    const kategoriList = ['all', ...Array.from(kategoriSet).sort()];

    tabsContainer.innerHTML = kategoriList.map((kategori) => `
        <button class="category-tab ${kategori === currentCategoryFilter ? 'active' : ''}" data-filter="${kategori}">
            ${getBuyerCategoryLabel(kategori)}
        </button>
    `).join('');

    // Bind event klik
    tabsContainer.querySelectorAll('.category-tab').forEach((tab) => {
        tab.addEventListener('click', () => filterProdukByKategori(tab.dataset.filter));
    });
}

// ===== FUNGSI FILTER PRODUK BERDASARKAN KATEGORI =====
function filterProdukByKategori(kategori) {
    currentCategoryFilter = kategori;
    renderBuyerProductGrid();
}

// ===== LOAD PRODUK DARI FIRESTORE (REALTIME) =====
let buyerProductsCache = [];
// Deklarasikan dulu (sebelum dipakai di render) agar tidak error ReferenceError
const productSearchBuyer = document.getElementById("productSearchBuyer");
loadBuyerProductsFromStorage();
onSnapshotProduk();

function renderBuyerProductGrid() {
    const produkList = document.getElementById("listproduk");
    if (!produkList) return;

    const keyword = productSearchBuyer ? productSearchBuyer.value.trim().toLowerCase() : '';
    let filtered = buyerProductsCache;
    if (keyword) {
        filtered = filtered.filter(p =>
            (p.nama || '').toLowerCase().includes(keyword) ||
            (p.kategori || '').toLowerCase().includes(keyword));
    }
    // Terapkan filter kategori
    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(p => normalizeBuyerCategory(p.kategori || p.category || 'makanan') === currentCategoryFilter);
    }

    if (!filtered.length) {
        produkList.innerHTML = '<div class="product-empty">' +
            (keyword ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Tidak ada produk dalam kategori ini.') +
            '</div>';
        return;
    }

    produkList.innerHTML = filtered.map((p) => {
        const docId = p.id;
        const gambarUrl = p.gambar && (p.gambar.startsWith('http') || p.gambar.startsWith('data:image'))
            ? p.gambar
            : 'https://via.placeholder.com/300x200.png?text=Produk';
        const kategori = normalizeBuyerCategory(p.kategori || p.category || 'makanan');
        const rawStok = p.stok ?? p.stock;
        // Unlimited jika stok kosong/0 atau memakai nilai default 999999
        const isUnlimited = rawStok === null || rawStok === undefined || rawStok === '' || String(rawStok).toLowerCase() === 'unlimited' || Number(rawStok) >= 999999 || Number(rawStok) <= 0;
        const stok = Number(rawStok) || 0;
        const badgeStok = isUnlimited
            ? '<span class="product-badge badge-stok-unlimited">♾️ Stok Unlimited</span>'
            : `<span class="product-badge badge-stok-ada">🟢 Stok: ${stok}</span>`;
        const variations = (Array.isArray(p.variations) && p.variations.length)
            ? p.variations
            : (typeof p.variasi === 'string' && p.variasi.trim() ? p.variasi.split(',').map(s => s.trim()).filter(Boolean) : []);
        return `
            <div class="product-card-2" id="buyer-product-${docId}" data-kategori="${kategori}" data-nama="${(p.nama || '').toLowerCase()}" data-stok="${stok}">
                <div class="product-thumb">
                    <img src="${gambarUrl}" alt="${p.nama}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200.png?text=Produk'" />
                    ${badgeStok}
                </div>
                <div class="product-body">
                    <div class="product-name">${p.nama}</div>
                    <div class="product-cat">${kategori}</div>
                    <div class="product-price">${formatRupiah(Number(p.harga || 0))}</div>
                    <div class="product-stock">${isUnlimited ? 'Stok: <strong>♾️ Unlimited</strong>' : `Stok: <strong>${stok}</strong>`}</div>
                    ${variations.length ? `<div class="product-variations"><small class="muted">Varian: ${variations.join(', ')}</small></div>` : ''}
                    <div class="product-actions">
                        <button class="beli-btn" onclick="beli('${docId}')">🛒 Beli</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

if (productSearchBuyer) {
    productSearchBuyer.addEventListener('input', renderBuyerProductGrid);
}

function loadBuyerProductsFromStorage() {
    try {
        const stored = localStorage.getItem('sharedProductsData') || localStorage.getItem('sellerProductsBackup') || '[]';
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            buyerProductsCache = parsed.map((p) => ({
                id: p.id || p.docId || null,
                ...p,
                nama: p.nama || p.name || '',
                harga: Number(p.harga ?? p.price ?? 0),
                stok: Number(p.stok ?? p.stock ?? 0),
                kategori: p.kategori || p.category || 'makanan',
                gambar: p.gambar || p.image || 'https://via.placeholder.com/300x200.png?text=Produk',
            }));
            renderBuyerCategoryTabs();
            renderBuyerProductGrid();
        }
    } catch (err) {
        console.warn('Gagal memuat produk dari storage buyer:', err);
    }
}

function onSnapshotProduk() {
    if (!db) {
        console.error('Firestore tidak terinisialisasi');
        loadBuyerProductsFromStorage();
        const produkList = document.getElementById("listproduk");
        if (produkList && !produkList.innerHTML.trim()) {
            produkList.innerHTML = '<p class="muted">Gagal terhubung ke database, namun produk lokal tetap tersedia.</p>';
        }
        return;
    }

    db.collection("products")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            const freshProducts = [];
            snapshot.forEach((doc) => {
                freshProducts.push({ id: doc.id, ...doc.data() });
            });

            if (freshProducts.length) {
                // Firestore punya data → pakai sebagai sumber utama & backup ke lokal.
                buyerProductsCache = freshProducts;
                localStorage.setItem('sharedProductsData', JSON.stringify(buyerProductsCache));
            } else {
                // Firestore kosong → JANGAN timpa produk lokal dengan array kosong.
                loadBuyerProductsFromStorage();
            }
            renderBuyerCategoryTabs();
            renderBuyerProductGrid();
        }, (error) => {
            console.error('Error loading products:', error);
            loadBuyerProductsFromStorage();
            const produkList = document.getElementById("listproduk");
            if (produkList && !produkList.innerHTML.trim()) {
                produkList.innerHTML = '<div class="product-empty">Gagal memuat produk dari server, tetapi data lokal tetap tersedia.</div>';
            }
        });
}

window.addEventListener('products-updated', loadBuyerProductsFromStorage);
window.addEventListener('storage', (event) => {
    if (!event.key || !['sharedProductsData', 'sellerProductsBackup'].includes(event.key)) return;
    loadBuyerProductsFromStorage();
});

// ===== PRODUK DIPILIH (Tanpa Keranjang) =====
let selectedProductId = null;

function getBuyerInfoData() {
    try {
        return JSON.parse(localStorage.getItem('buyerInfo') || '{}');
    } catch (e) {
        return {};
    }
}

function updateSelectedProductUI() {
    // Sorot kartu produk yang sedang dipilih
    document.querySelectorAll('.product-card-2').forEach((card) => {
        const idVal = card.id.replace('buyer-product-', '');
        if (String(idVal) === String(selectedProductId)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    const summaryEl = document.getElementById('summary');
    const queueNumberEl = document.getElementById('queueNumber');
    const notesGroup = document.getElementById('notesGroup');
    const deliveryGroup = document.getElementById('deliveryGroup');

    if (selectedProductId) {
        const p = buyerProductsCache.find((item) => String(item.id) === String(selectedProductId));
        if (p) {
            const harga = Number(p.harga ?? p.price ?? 0);
            summaryEl.innerHTML = `
                <p><strong>Produk Dipilih:</strong></p>
                <ul>
                    <li>${p.nama || p.name || 'Produk'} — ${formatRupiah(harga)}</li>
                </ul>
                <p><strong>Total:</strong> ${formatRupiah(harga)}</p>
            `;
            if (notesGroup) notesGroup.classList.remove('hidden');
            if (deliveryGroup) deliveryGroup.classList.remove('hidden');
        }
    } else {
        summaryEl.innerHTML = '<p class="muted">Belum ada produk dipilih. Klik tombol 🛒 Beli pada produk yang diinginkan.</p>';
        if (notesGroup) notesGroup.classList.add('hidden');
        if (deliveryGroup) deliveryGroup.classList.add('hidden');
    }
}

// ===== FUNGSI PILIH PRODUK =====
window.beli = function (id) {
    const buyerInfo = getBuyerInfoData();
    if (!buyerInfo.name || !buyerInfo.whatsapp) {
        alert('Silakan login terlebih dahulu.');
        window.location.href = 'index.html';
        return;
    }

    const p = buyerProductsCache.find((item) => String(item.id) === String(id));
    if (!p) {
        alert('Produk tidak ditemukan.');
        return;
    }

    // Toggle pilihan (klik lagi untuk batalkan)
    if (String(selectedProductId) === String(id)) {
        selectedProductId = null;
    } else {
        selectedProductId = id;
    }
    updateSelectedProductUI();
};

// ===== BUAT PESANAN & KIRIM WHATSAPP =====
function activateBuyerOrderBtn() {
    const orderBtn = document.getElementById('orderBtn');
    if (!orderBtn) return;

    // Hapus handler lama dari script.js (yang mengharapkan checkbox pada menu-item)
    // serta pastikan tidak dobel-bind jika fungsi ini dipanggil lebih dari sekali.
    const parent = orderBtn.parentNode;
    if (parent) {
        orderBtn.dataset.buyerBound = 'pending';
        const fresh = orderBtn.cloneNode(true);
        parent.replaceChild(fresh, orderBtn);
    }

    const newBtn = document.getElementById('orderBtn');
    if (!newBtn) return;
    if (newBtn.dataset.buyerBound === 'true') return; // sudah terpasang
    newBtn.dataset.buyerBound = 'true';

    newBtn.addEventListener('click', async function () {
        const buyerInfo = getBuyerInfoData();
        if (!buyerInfo.name || !buyerInfo.whatsapp) {
            alert('Silakan login terlebih dahulu.');
            window.location.href = 'index.html';
            return;
        }

        if (!selectedProductId) {
            alert('Pilih minimal satu produk terlebih dahulu (klik 🛒 Beli pada produk).');
            return;
        }

        const p = buyerProductsCache.find((item) => String(item.id) === String(selectedProductId));
        if (!p) {
            alert('Produk tidak ditemukan.');
            return;
        }

        const items = [{
            name: p.nama || p.name || 'Produk',
            price: Number(p.harga ?? p.price ?? 0),
            quantity: 1,
            category: p.kategori || p.category || 'Umum',
        }];

        const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

        // Generate nomor antrian berdasarkan waktu pemesanan (jam:menit:detik)
        let queue = 'A-000000';
        try {
            if (typeof generateQueueNumberFromTime === 'function') {
                queue = generateQueueNumberFromTime();
            } else if (typeof generateQueueNumberFirestore === 'function') {
                queue = await generateQueueNumberFirestore();
            } else {
                let c = Number(localStorage.getItem('queueCounter') || '0') + 1;
                localStorage.setItem('queueCounter', String(c));
                queue = 'A-' + String(c).padStart(3, '0');
            }
        } catch (e) {
            console.warn('Gagal generate antrian:', e);
        }

        const notesEl = document.getElementById('notes');
        const notes = notesEl ? notesEl.value.trim() : '';
        const deliveryEl = document.getElementById('deliveryAddress');
        const deliveryAddress = deliveryEl ? deliveryEl.value.trim() : '';

        const productNames = items.map((it) => `${it.quantity}x ${it.name}`).join(', ');

        const buyerOrderData = {
            name: buyerInfo.name,
            whatsapp: buyerInfo.whatsapp,
            items,
            total,
            queue,
            notes,
            deliveryAddress,
        };

        // Set global orderData (dipakai tombol "Bayar via Dana" & "QRIS" dari script.js)
        if (typeof orderData !== 'undefined') {
            orderData = buyerOrderData;
        }
        window.__buyerOrderData = buyerOrderData;

        // Simpan ke Firestore orders
        if (db) {
            try {
                await db.collection('orders').add({
                    buyerName: buyerInfo.name,
                    buyerWhatsapp: buyerInfo.whatsapp,
                    namaPemesan: buyerInfo.name,
                    nomorWA: buyerInfo.whatsapp,
                    productName: productNames,
                    nama: productNames,
                    harga: total,
                    qty: items.reduce((sum, it) => sum + it.quantity, 0),
                    total,
                    status: 'pending',
                    paymentStatus: 'belum dibayarkan',
                    queueNumber: queue,
                    notes,
                    deliveryAddress,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } catch (e) {
                console.warn('Gagal simpan order ke Firestore:', e);
            }
        }

        // Simpan transaksi lokal (backup) & antrian
        try {
            let savedTs = null;
            if (typeof saveTransaction === 'function') {
                savedTs = saveTransaction(orderData);
            }
            if (savedTs !== null && savedTs !== undefined && typeof orderData !== 'undefined') {
                orderData._ts = savedTs;
            }
            const q = JSON.parse(localStorage.getItem('queueNames') || '[]');
            q.push({ queue, name: buyerInfo.name, items: productNames });
            localStorage.setItem('queueNames', JSON.stringify(q));
        } catch (e) {
            console.warn('Gagal simpan transaksi lokal:', e);
        }

        // Update status UI
        const queueNumberEl = document.getElementById('queueNumber');
        if (queueNumberEl) queueNumberEl.textContent = queue;
        const statusTextEl = document.getElementById('statusText');
        if (statusTextEl) {
            statusTextEl.textContent = 'Pesanan diterima, silakan tunggu.';
            statusTextEl.style.color = '#1d7c3f';
        }
        const payBtnEl = document.getElementById('payBtn');
        if (payBtnEl) payBtnEl.disabled = false;

        // Kirim WhatsApp
        if (typeof openWhatsApp === 'function') {
            openWhatsApp(orderData);
        } else {
            const lines = [
                '🛒 *PESANAN BARU - CHOMMELL FARM*',
                '============================',
                `👤 Nama: ${buyerInfo.name}`,
                `📱 WA: ${buyerInfo.whatsapp}`,
                '',
                '*Detail Pesanan:*',
                ...items.map((it) => `• ${it.quantity}x ${it.name} — ${formatRupiah(it.price * it.quantity)}`),
                '',
                `💰 *Total: ${formatRupiah(total)}*`,
                `🔢 Nomor Antrian: ${queue}`,
            ];
            if (notes) lines.push(`📝 Catatan: ${notes}`);
            if (deliveryAddress) lines.push(`📍 Alamat: ${deliveryAddress}`);
            lines.push('', 'Terima kasih 🙏');
            const url = 'https://api.whatsapp.com/send?phone=6287727114562&text=' + encodeURIComponent(lines.join('\n'));
            window.open(url, '_blank');
        }

        // Reset pilihan produk
        selectedProductId = null;
        updateSelectedProductUI();
        alert('✅ Pesanan berhasil dibuat & dikirim ke WhatsApp.');
    });
}

// Aktifkan tombol pesanan setelah DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateBuyerOrderBtn);
} else {
    activateBuyerOrderBtn();
}

