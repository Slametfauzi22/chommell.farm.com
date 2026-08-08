// Seller page - manage products and view orders (Firebase Compat API)
// Firebase sudah diinisialisasi via firebase.js - global db variable from there

// ===== GERBANG PASSWORD PENJUAL (Keamanan) =====
const SELLER_PASSWORD = 'chommell';
const SELLER_LOCK_KEY = 'sellerUnlocked';

function isSellerUnlocked() {
    try {
        return sessionStorage.getItem(SELLER_LOCK_KEY) === 'true';
    } catch (e) {
        return false;
    }
}

function unlockSellerPage() {
    try {
        sessionStorage.setItem(SELLER_LOCK_KEY, 'true');
    } catch (e) { }
    document.body.classList.add('seller-unlocked');
    const lockScreen = document.getElementById('sellerLockScreen');
    if (lockScreen) lockScreen.style.display = 'none';
}

function lockSellerPage() {
    document.body.classList.remove('seller-unlocked');
    const lockScreen = document.getElementById('sellerLockScreen');
    if (lockScreen) lockScreen.style.display = '';
}

function initSellerLock() {
    const lockScreen = document.getElementById('sellerLockScreen');
    const passwordInput = document.getElementById('sellerLockPassword');
    const lockBtn = document.getElementById('sellerLockBtn');
    const backBtn = document.getElementById('sellerLockBackBtn');
    const errorEl = document.getElementById('sellerLockError');

    // Coba buka otomatis jika sudah terverifikasi di sesi ini
    if (isSellerUnlocked()) {
        unlockSellerPage();
        passwordInput && passwordInput.focus();
        return;
    }

    if (!lockScreen) return;

    // Pastikan konten terkunci saat pertama kali dimuat
    lockSellerPage();

    function attemptUnlock() {
        const value = passwordInput ? passwordInput.value.trim() : '';
        if (value === SELLER_PASSWORD) {
            if (errorEl) errorEl.classList.add('hidden');
            unlockSellerPage();
            alert('✅ Selamat datang, halaman penjual terbuka.');
        } else {
            if (errorEl) errorEl.classList.remove('hidden');
            passwordInput && passwordInput.focus();
            passwordInput && passwordInput.select();
        }
    }

    if (lockBtn) lockBtn.addEventListener('click', attemptUnlock);
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') attemptUnlock();
        });
    }
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// Jalankan proteksi password segera
initSellerLock();

let editingProductId = null; // untuk track sedang edit atau tidak
let previousOrdersCount = 0; // untuk deteksi pesanan baru
let notifikasiSuaraEnabled = true;

function normalizeSellerCategory(value) {
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

function normalizeSellerProduct(product = {}) {
    const name = product.nama || product.name || '';
    const category = normalizeSellerCategory(product.kategori || product.category);
    const price = Number(product.harga ?? product.price ?? 0);
    const stock = Number(product.stok ?? product.stock ?? 0);
    return {
        ...product,
        id: product.id || null,
        nama: name,
        name,
        harga: price,
        price,
        stok: stock,
        stock,
        kategori: category,
        category,
        gambar: product.gambar || product.image || 'https://via.placeholder.com/180x180.png?text=Produk',
        image: product.gambar || product.image || 'https://via.placeholder.com/180x180.png?text=Produk',
        variasi: product.variasi || (Array.isArray(product.variations) ? product.variations.join(', ') : ''),
        variations: Array.isArray(product.variations)
            ? product.variations
            : (typeof product.variasi === 'string' && product.variasi.trim()
                ? product.variasi.split(',').map((s) => s.trim()).filter(Boolean)
                : [])
    };
}

// ===== NOTIFIKASI SUARA (Web Audio API) =====
function playNotifikasiSuara() {
    if (!notifikasiSuaraEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Nada 1
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.frequency.value = 880; // A5
        osc1.type = 'sine';
        gain1.gain.value = 0.3;
        osc1.start();
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc1.stop(audioCtx.currentTime + 0.15);

        // Nada 2 (lebih tinggi)
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.frequency.value = 1108.73; // C#6
            osc2.type = 'sine';
            gain2.gain.value = 0.3;
            osc2.start();
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            osc2.stop(audioCtx.currentTime + 0.2);
        }, 180);
    } catch (e) {
        console.warn('Gagal memutar notifikasi suara:', e);
    }
}

// ===== BADGE PESANAN BARU =====
function updateOrderBadge(jumlahBaru) {
    let badge = document.getElementById('orderBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'orderBadge';
        badge.style.cssText = 'position:fixed;top:64px;right:12px;background:#ff4444;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;z-index:9999;box-shadow:0 4px 12px rgba(255,0,0,0.3);border:2px solid white;';
        document.body.appendChild(badge);
    }
    badge.textContent = jumlahBaru > 99 ? '99+' : jumlahBaru;
    badge.style.display = jumlahBaru > 0 ? 'flex' : 'none';
}

// ===== FLASH ANIMASI SAAT ORDER BARU =====
function flashOrderNotification() {
    const ordersEl = document.getElementById('orders');
    if (!ordersEl) return;
    ordersEl.style.transition = 'background 0.3s ease';
    ordersEl.style.background = '#fff3cd';
    setTimeout(() => {
        ordersEl.style.background = '';
    }, 1500);
}

// ===== RESET FORM PRODUK =====
function resetFormProdukSeller() {
    document.getElementById("nama").value = '';
    document.getElementById("harga").value = '';
    document.getElementById("stok").value = '';
    document.getElementById("gambar").value = '';
    document.getElementById("kategori").value = 'makanan';
    document.getElementById("variasi").value = '';
    const fileInput = document.getElementById("gambarFile");
    if (fileInput) fileInput.value = '';
    editingProductId = null;
    document.getElementById('tambahProdukBtn').textContent = 'Tambah Produk';
    document.getElementById('tambahProdukBtn').style.display = '';
    const batalBtn = document.getElementById('batalEditBtnSeller');
    if (batalBtn) batalBtn.classList.add('hidden');
    const tambahBtn = document.getElementById('tambahProdukBtn');
    if (tambahBtn) {
        tambahBtn.disabled = false;
        tambahBtn.removeAttribute('disabled');
    }
}

// ===== READ FILE AS DATA URL =====
function readImageFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });
}

// ===== KOMPRESI GAMBAR (agar ukuran dokumen Firestore aman & produk tampil di semua perangkat) =====
function kompresGambar(file, maxWidth = 500, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Jika gambar asli lebih kecil dari maxWidth, gunakan PNG original (hindari quality loss)
                let dataUrl;
                if (img.width <= maxWidth && file.type === 'image/png') {
                    dataUrl = canvas.toDataURL('image/png');
                } else {
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(dataUrl);
            };
            img.onerror = (e) => reject(e);
            img.src = fr.result;
        };
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });
}

// ===== TOMBOL TOGGLE FORM TAMBAH PRODUK =====
const toggleAddProductBtn = document.getElementById('toggleAddProductBtn');
const sellerFormBox = document.querySelector('.seller-form-box');

if (toggleAddProductBtn && sellerFormBox) {
    toggleAddProductBtn.addEventListener('click', function () {
        const isHidden = sellerFormBox.classList.contains('hidden');
        if (isHidden) {
            sellerFormBox.classList.remove('hidden');
            toggleAddProductBtn.textContent = '✖️ Tutup Formulir Tambah Produk';
        } else {
            sellerFormBox.classList.add('hidden');
            toggleAddProductBtn.textContent = '➕ Tambah Produk';
        }
    });
}

// ===== TAMBAH PRODUK =====
const tambahProdukBtn = document.getElementById('tambahProdukBtn');
const batalEditBtnSeller = document.getElementById('batalEditBtnSeller');

if (tambahProdukBtn) {
    tambahProdukBtn.addEventListener('click', async function () {
        if (editingProductId !== null) {
            editingProductId = null;
        }

        const nama = document.getElementById("nama").value.trim();
        const kategori = document.getElementById("kategori").value;
        const hargaInput = document.getElementById("harga").value.trim();
        const stokInput = document.getElementById("stok").value.trim();
        const harga = Number(hargaInput || 0);
        // Stok 0/kosong = unlimited (999999)
        const stokRaw = stokInput === '' ? 999999 : Number(stokInput);
        const stok = Number.isFinite(stokRaw) && stokRaw >= 0 ? stokRaw : 999999;
        const gambarUrl = document.getElementById("gambar").value.trim();
        const fileInput = document.getElementById("gambarFile");
        const variasiInput = document.getElementById("variasi");
        const variasi = variasiInput ? variasiInput.value.trim() : '';

        if (!nama) {
            alert('Mohon isi nama produk.');
            return;
        }
        const safeHarga = Number.isFinite(harga) && harga >= 0 ? harga : 0;

        // Proses gambar: prioritas file > URL > placeholder
        // File dikompresi agar ukuran dokumen Firestore aman (< 1MB) dan tampil di semua perangkat.
        let gambar = 'https://via.placeholder.com/180x180.png?text=Produk';
        if (fileInput && fileInput.files && fileInput.files[0]) {
            try {
                gambar = await kompresGambar(fileInput.files[0]);
            } catch (e) {
                console.warn('Gagal kompres gambar:', e);
                try {
                    gambar = await readImageFileAsDataUrl(fileInput.files[0]);
                } catch (e2) {
                    console.warn('Gagal baca file:', e2);
                }
            }
        } else if (gambarUrl) {
            gambar = gambarUrl;
        }

        try {
            if (!db) {
                throw new Error('Firebase tidak tersedia');
            }
            const createdAtValue = firebase && firebase.firestore && firebase.firestore.FieldValue
                ? firebase.firestore.FieldValue.serverTimestamp()
                : Date.now();
            const docRef = await db.collection("products").add({
                nama: nama,
                harga: safeHarga,
                stok: stok,
                kategori: kategori,
                gambar: gambar,
                variasi: variasi,
                createdAt: createdAtValue
            });
            const newProduct = normalizeSellerProduct({
                id: docRef.id,
                nama: nama,
                harga: safeHarga,
                stok: stok,
                kategori: kategori,
                gambar: gambar,
                variasi: variasi,
                createdAt: Date.now()
            });
            sellerProductsCache.unshift(newProduct);
            localStorage.setItem('sellerProductsBackup', JSON.stringify(sellerProductsCache));
            localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
            }
            renderSellerProductGrid();
            alert("✅ Produk berhasil ditambahkan");
            resetFormProdukSeller();
        } catch (error) {
            const fallbackProduct = normalizeSellerProduct({
                id: `local-${Date.now()}`,
                nama: nama,
                harga: safeHarga,
                stok: stok,
                kategori: kategori,
                gambar: gambar,
                variasi: variasi,
                createdAt: Date.now()
            });
            sellerProductsCache.unshift(fallbackProduct);
            localStorage.setItem('sellerProductsBackup', JSON.stringify(sellerProductsCache));
            localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
            }
            renderSellerProductGrid();
            console.error('Error adding product:', error);
            alert('✅ Produk disimpan lokal dan akan tampil di daftar.');
            resetFormProdukSeller();
        }
    });
}

// Tombol Batal Edit (seller.html)
if (batalEditBtnSeller) {
    batalEditBtnSeller.addEventListener('click', function () {
        if (confirm('Serius mau batalin edit produk mas?')) {
            resetFormProdukSeller();
        }
    });
}

// ===== LOAD & TAMPILKAN PRODUK (REALTIME) =====
const listProduk = document.getElementById("listproduk");
const productSearchSeller = document.getElementById("productSearchSeller");
let sellerProductsCache = [];

function hydrateSellerProductsFromStorage() {
    try {
        const stored = localStorage.getItem('sharedProductsData') || localStorage.getItem('sellerProductsBackup') || '[]';
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
            sellerProductsCache = parsed.map((p) => normalizeSellerProduct(p));
            localStorage.setItem('sellerProductsBackup', JSON.stringify(sellerProductsCache));
            localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
            renderSellerProductGrid();
        }
    } catch (err) {
        console.warn('Gagal memuat produk seller dari storage:', err);
    }
}

function renderSellerProductGrid() {
    if (!listProduk) return;
    const keyword = productSearchSeller ? productSearchSeller.value.trim().toLowerCase() : '';
    const filtered = keyword
        ? sellerProductsCache.filter(p =>
            (p.nama || '').toLowerCase().includes(keyword) ||
            normalizeSellerCategory(p.kategori || p.category || '').toLowerCase().includes(keyword))
        : sellerProductsCache;

    if (!filtered.length) {
        listProduk.innerHTML = '<div class="product-empty">' +
            (keyword ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Belum ada produk. Tambahkan produk baru di atas.') +
            '</div>';
        return;
    }

    listProduk.innerHTML = filtered.map((produk) => {
        const docId = produk.id;
        const gambarUrl = produk.gambar && (produk.gambar.startsWith('http') || produk.gambar.startsWith('data:image'))
            ? produk.gambar
            : 'https://via.placeholder.com/300x200.png?text=Produk';
        const harga = Number(produk.harga || 0);
        const stok = Number(produk.stok || 0);
        // Stok 0/kosong/999999 = unlimited
        const isUnlimited = !(stok > 0) || stok >= 999999;
        const badge = isUnlimited
            ? '<span class="product-badge badge-stok-unlimited">♾️ Stok Unlimited</span>'
            : `<span class="product-badge badge-stok-ada">🟢 Stok: ${stok}</span>`;
        return `
            <div class="product-card-2" id="product-${docId}" data-nama="${(produk.nama || '').toLowerCase()}">
                <div class="product-thumb">
                    <img src="${gambarUrl}" alt="${produk.nama}" onerror="this.src='https://via.placeholder.com/300x200.png?text=Produk'" />
                    ${badge}
                </div>
                <div class="product-body">
                    <div class="product-name">${produk.nama}</div>
                    <div class="product-cat">${produk.kategori || '-'}</div>
<div class="product-price">${formatRupiah(harga)}</div>
                    <div class="product-stock">${isUnlimited ? 'Stok: <strong>♾️ Unlimited</strong>' : `Stok: <strong>${stok}</strong>`}</div>
                    <div class="product-actions">
                        <button class="edit-btn" onclick="editProduk('${docId}')">✏️ Edit</button>
                        <button class="delete-btn" onclick="hapusProduk('${docId}')">🗑️ Hapus</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

hydrateSellerProductsFromStorage();

if (productSearchSeller) {
    productSearchSeller.addEventListener('input', renderSellerProductGrid);
}

if (listProduk) {
    try {
        if (!db) {
            throw new Error('Firebase tidak tersedia');
        }
        db.collection("products")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const freshProducts = [];
                snapshot.forEach((doc) => {
                    freshProducts.push(normalizeSellerProduct({ id: doc.id, ...doc.data() }));
                });

                if (freshProducts.length) {
                    // Firestore punya data → pakai sebagai sumber utama & backup ke lokal.
                    sellerProductsCache = freshProducts;
                } else {
                    // Firestore kosong → JANGAN timpa produk lokal dengan array kosong.
                    const storedProducts = JSON.parse(localStorage.getItem('sellerProductsBackup') || '[]');
                    sellerProductsCache = Array.isArray(storedProducts) && storedProducts.length
                        ? storedProducts.map((p) => normalizeSellerProduct(p))
                        : (sellerProductsCache && sellerProductsCache.length ? sellerProductsCache : []);
                }
                localStorage.setItem('sellerProductsBackup', JSON.stringify(sellerProductsCache));
                localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
                }
                renderSellerProductGrid();
            }, (error) => {
                console.error('Error loading products:', error);
                const storedProducts = JSON.parse(localStorage.getItem('sellerProductsBackup') || '[]');
                sellerProductsCache = Array.isArray(storedProducts) && storedProducts.length
                    ? storedProducts.map((p) => normalizeSellerProduct(p))
                    : (sellerProductsCache && sellerProductsCache.length ? sellerProductsCache : []);
                localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
                }
                renderSellerProductGrid();
            });
    } catch (error) {
        const storedProducts = JSON.parse(localStorage.getItem('sellerProductsBackup') || '[]');
        sellerProductsCache = Array.isArray(storedProducts) ? storedProducts.map((p) => normalizeSellerProduct(p)) : [];
        localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
        }
        renderSellerProductGrid();
    }
}

// ===== FORMAT RUPIAH =====
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

// ===== EDIT PRODUK (Modal Inline - Menampilkan Semua Detail) =====
window.editProduk = function (id) {
    // Ambil data produk dari cache (lebih lengkap daripada dari card)
    const produk = sellerProductsCache.find(p => String(p.id || '') === String(id));
    const produkCard = document.getElementById(`product-${id}`);
    if (!produkCard && !produk) {
        alert('Produk tidak ditemukan.');
        return;
    }

    const currentNama = (produk && (produk.nama || produk.name)) || (produkCard ? produkCard.querySelector('.product-name')?.textContent : '') || '';
    const currentKategori = (produk && normalizeSellerCategory(produk.kategori || produk.category)) || 'makanan';
    const currentHarga = (produk && Number(produk.harga ?? produk.price ?? 0)) || 0;
    const currentGambar = (produk && (produk.gambar || produk.image)) || 'https://via.placeholder.com/180x180.png?text=Produk';
    const currentVariasi = (produk && (produk.variasi || (Array.isArray(produk.variations) ? produk.variations.join(', ') : ''))) || '';

    // Stok: 0/kosong/999999 dianggap unlimited
    const rawStok = produk ? Number(produk.stok ?? produk.stock ?? 0) : 0;
    const isUnlimited = !(rawStok > 0) || rawStok >= 999999;
    const currentStok = isUnlimited ? '' : rawStok;

    // Pilihan kategori (dukung semua kategori unik dari produk + 6 kategori standar)
    const kategoriOptions = ['makanan', 'ikan', 'unggas', 'pribadi', 'kamar', 'lainnya'];
    const kategoriLabels = ['Makanan & Minuman', 'Ikan Hias & Akuarium', 'Unggas & Aksesorisnya', 'Aksesoris Pribadi', 'Aksesoris Kamar Tidur', 'Bibit Sayuran'];
    const kategoriHtml = kategoriOptions.map((val, i) =>
        `<option value="${val}">${kategoriLabels[i]}</option>`
    ).join('');
    const customKategoriSet = new Set();
    sellerProductsCache.forEach((p) => {
        const kat = normalizeSellerCategory(p.kategori || p.category || '');
        if (kat && !kategoriOptions.includes(kat)) customKategoriSet.add(kat);
    });
    const customKategoriHtml = Array.from(customKategoriSet)
        .map((kat) => `<option value="${kat}">${kat}</option>`)
        .join('');

    const stokHelp = isUnlimited
        ? '<small style="color:#1d7c3f;font-weight:600;">♾️ Produk ini unlimited (stok kosong = tak terbatas). Isi angka untuk membatasi stok.</small>'
        : '<small class="muted">Kosongkan untuk menjadikan stok unlimited (♾️).</small>';

    // Buat modal edit (menampilkan SEMUA detail produk)
    const formHtml = `
        <div class="edit-modal-overlay" id="editModal-${id}" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;">
            <div class="edit-modal" style="background:white;padding:24px;border-radius:12px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto;">
                <h3 style="margin-bottom:16px;">✏️ Edit Produk</h3>

                <!-- Preview Gambar -->
                <div style="text-align:center;margin-bottom:16px;">
                    <img id="editPreview-${id}" src="${currentGambar.replace(/"/g, '"')}" alt="Preview" style="width:180px;height:180px;object-fit:cover;border-radius:12px;border:1px solid #ddd;background:#fafafa;" onerror="this.src='https://via.placeholder.com/180x180.png?text=Produk'" />
                </div>

                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Nama Produk</label>
                    <input id="editNama-${id}" type="text" value="${currentNama.replace(/"/g, '"')}" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                </div>
                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Kategori</label>
                    <input id="editKategori-${id}" type="text" list="editKategoriList-${id}" value="${currentKategori.replace(/"/g, '"')}" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                    <datalist id="editKategoriList-${id}">
                        ${kategoriHtml}
                        ${customKategoriHtml}
                    </datalist>
                </div>
                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Harga (Rp)</label>
                    <input id="editHarga-${id}" type="number" min="0" value="${Number(currentHarga)}" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                </div>
                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Stok (kosongkan = unlimited ♾️)</label>
                    <input id="editStok-${id}" type="number" min="0" value="${currentStok}" placeholder="Kosongkan untuk unlimited" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                    ${stokHelp}
                </div>
                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">URL Gambar</label>
                    <input id="editGambar-${id}" type="text" value="${currentGambar.startsWith('data:') ? '' : currentGambar.replace(/"/g, '"')}" placeholder="https://contoh.com/gambar.jpg" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                </div>
                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Atau upload dari galeri</label>
                    <input id="editGambarFile-${id}" type="file" accept="image/*" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                </div>
                <div class="field-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:600;">Variasi produk (pisah dengan koma)</label>
                    <input id="editVariasi-${id}" type="text" value="${currentVariasi.replace(/"/g, '"')}" placeholder="Contoh: merah,biru,hijau" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
                </div>
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button id="editSimpanBtn-${id}" style="flex:1;padding:10px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">💾 Simpan Perubahan</button>
                    <button id="editBatalBtn-${id}" style="flex:1;padding:10px;background:#f5f5f5;color:#333;border:1px solid #ddd;border-radius:8px;cursor:pointer;">Batal</button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = formHtml;
    document.body.appendChild(modalContainer);

    // Preview gambar saat memilih file
    const fileInput = document.getElementById(`editGambarFile-${id}`);
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById(`editPreview-${id}`);
                    if (preview) preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
    // Preview gambar saat mengetik URL
    const urlInput = document.getElementById(`editGambar-${id}`);
    if (urlInput) {
        urlInput.addEventListener('input', function () {
            if (this.value.trim()) {
                const preview = document.getElementById(`editPreview-${id}`);
                if (preview) preview.src = this.value.trim();
            }
        });
    }

    // Set mode edit di form utama
    editingProductId = id;
    document.getElementById('tambahProdukBtn').textContent = 'Mengedit...';
    document.getElementById('tambahProdukBtn').disabled = false;
    if (batalEditBtnSeller) batalEditBtnSeller.classList.remove('hidden');

    // Handler simpan
    document.getElementById(`editSimpanBtn-${id}`).addEventListener('click', async function () {
        const newNama = document.getElementById(`editNama-${id}`).value.trim();
        const newKategori = document.getElementById(`editKategori-${id}`).value;
        const newHarga = document.getElementById(`editHarga-${id}`).value.trim();
        const newGambarUrl = document.getElementById(`editGambar-${id}`).value.trim();
        const newFile = document.getElementById(`editGambarFile-${id}`).files && document.getElementById(`editGambarFile-${id}`).files[0];
        const newVariasi = document.getElementById(`editVariasi-${id}`).value.trim();

        // Stok: kosong = unlimited (999999)
        const stokInput = document.getElementById(`editStok-${id}`).value.trim();
        const newStok = stokInput === '' ? 999999 : Number(stokInput);

        if (!newNama || !newHarga) {
            alert('Mohon isi nama dan harga produk.');
            return;
        }

        // Proses gambar: file > URL > gambar lama
        let newGambar = currentGambar;
        if (newFile) {
            try {
                newGambar = await kompresGambar(newFile);
            } catch (e) {
                console.warn('Gagal kompres gambar:', e);
                try {
                    newGambar = await readImageFileAsDataUrl(newFile);
                } catch (e2) {
                    console.warn('Gagal baca file:', e2);
                }
            }
        } else if (newGambarUrl) {
            newGambar = newGambarUrl;
        }

        // SELALU perbarui cache lokal & localStorage agar edit berfungsi unlimited
        const idx = sellerProductsCache.findIndex(p => String(p.id || '') === String(id));
        if (idx !== -1) {
            sellerProductsCache[idx] = normalizeSellerProduct({
                ...sellerProductsCache[idx],
                id: id,
                nama: newNama,
                kategori: newKategori,
                harga: Number(newHarga),
                stok: newStok,
                gambar: newGambar,
                variasi: newVariasi
            });
        } else {
            const updated = normalizeSellerProduct({
                id: id,
                nama: newNama,
                kategori: newKategori,
                harga: Number(newHarga),
                stok: newStok,
                gambar: newGambar,
                variasi: newVariasi
            });
            sellerProductsCache = [updated, ...sellerProductsCache];
        }
        localStorage.setItem('sellerProductsBackup', JSON.stringify(sellerProductsCache));
        localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
        }
        renderSellerProductGrid();
        modalContainer.remove();
        resetFormProdukSeller();
        alert("✅ Data berhasil diperbarui!");

        // Jika Firestore tersedia, perbarui cloud juga
        if (db) {
            db.collection("products").doc(id).update({
                nama: newNama,
                kategori: newKategori,
                harga: Number(newHarga),
                stok: newStok,
                gambar: newGambar,
                variasi: newVariasi
            }).then(() => {
                // onSnapshot akan update UI
            }).catch((error) => {
                console.warn('Gagal update di Firestore (disimpan lokal):', error.message);
            });
        }
    });

    // Handler batal
    document.getElementById(`editBatalBtn-${id}`).addEventListener('click', function () {
        modalContainer.remove();
        resetFormProdukSeller();
    });

    // Tutup modal jika klik overlay
    modalContainer.querySelector('.edit-modal-overlay').addEventListener('click', function (e) {
        if (e.target === this) {
            modalContainer.remove();
            resetFormProdukSeller();
        }
    });
};

// ===== HAPUS PRODUK =====

function getSellerRegisteredBuyers() {
    try {
        return JSON.parse(localStorage.getItem('registeredBuyers') || '[]');
    } catch (e) {
        return [];
    }
}

function sellerSaveBuyersLocal(buyers) {
    try {
        localStorage.setItem('registeredBuyers', JSON.stringify(buyers));
    } catch (e) { }
}

function renderSellerBuyersList(buyers) {
    const listEl = document.getElementById('buyersList');
    if (!listEl) return;
    if (!buyers || !buyers.length) {
        listEl.innerHTML = '<div class="muted">Belum ada pembeli yang mendaftar.</div>';
        return;
    }
    listEl.innerHTML = buyers.map((b, idx) => `
        <div class="seller-product" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:#fffdf9;flex-wrap:wrap;">
            <div class="seller-product-info" style="flex:1;min-width:180px;">
                <div class="seller-product-name">${String(b.name || '-').replace(/[<>&]/g, '')}</div>
                <div class="seller-product-cat">WA: ${String(b.whatsapp || '-').replace(/[<>&]/g, '')}</div>
            </div>
            <div class="seller-product-info">
                <div class="seller-product-price" style="font-size:0.8rem;color:var(--muted);">Login: ${b.loginDate || '-'}</div>
            </div>
            <div class="seller-product-actions">
                <button class="edit-btn" onclick="sellerCopyBuyer('${String(b.whatsapp || '').replace(/'/g, '')}')" title="Salin nomor WA">Salin WA</button>
            </div>
        </div>
    `).join('');
}

window.sellerCopyBuyer = function (whatsapp) {
    if (!whatsapp) { alert('Nomor WhatsApp kosong.'); return; }
    navigator.clipboard.writeText(whatsapp).then(() => {
        alert('Nomor WhatsApp disalin: ' + whatsapp);
    }).catch(() => {
        alert('Gagal menyalin. Salin manual: ' + whatsapp);
    });
};

function setupSellerBuyersRealtime() {
    const listEl = document.getElementById('buyersList');
    // Render dari localStorage dulu (backup)
    renderSellerBuyersList(getSellerRegisteredBuyers());

    if (!listEl) return;
    if (!db) {
        // Jika Firestore tidak tersedia, pakai data lokal + listener storage
        window.addEventListener('storage', function buyerLocalListener(ev) {
            if (ev.key === 'registeredBuyers') {
                renderSellerBuyersList(getSellerRegisteredBuyers());
            }
        });
        return;
    }

    try {
        db.collection("registeredBuyers")
            .orderBy("loginAt", "desc")
            .onSnapshot((snapshot) => {
                const buyers = [];
                snapshot.forEach((doc) => {
                    buyers.push({ id: doc.id, ...doc.data() });
                });
                sellerSaveBuyersLocal(buyers);
                renderSellerBuyersList(buyers);
            }, (error) => {
                console.error('Error loading registeredBuyers:', error);
                renderSellerBuyersList(getSellerRegisteredBuyers());
            });
    } catch (e) {
        console.warn('Gagal setup realtime buyers:', e);
        renderSellerBuyersList(getSellerRegisteredBuyers());
    }
}

// Jalankan realtime daftar pembeli saat halaman penjual siap
(function initSellerBuyers() {
    const run = () => setupSellerBuyersRealtime();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

window.hapusProduk = function (id) {
    if (!document.getElementById(`product-${id}`)) {
        alert('Produk tidak ditemukan.');
        return;
    }
    if (!confirm('Yakin ingin menghapus produk ini mas?')) return;

    // SELALU hapus dari cache lokal & localStorage terlebih dahulu agar berfungsi unlimited
    const idx = sellerProductsCache.findIndex(p => String(p.id || '') === String(id));
    if (idx !== -1) {
        sellerProductsCache.splice(idx, 1);
    } else if (sellerProductsCache.length) {
        sellerProductsCache.splice(0, 1);
    }
    localStorage.setItem('sellerProductsBackup', JSON.stringify(sellerProductsCache));
    localStorage.setItem('sharedProductsData', JSON.stringify(sellerProductsCache));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('products-updated', { detail: sellerProductsCache }));
    }
    renderSellerProductGrid();
    if (editingProductId === id) resetFormProdukSeller();
    alert("✅ Produk berhasil dihapus dan selamat tinggal!");

    // Jika Firestore tersedia, hapus dari cloud juga
    if (db) {
        db.collection("products").doc(id).delete().catch((error) => {
            console.warn('Gagal hapus di Firestore (produk sudah dihapus lokal):', error.message);
        });
    }
};

// ===== LOAD PESANAN (REALTIME) =====
const ordersDiv = document.getElementById("orders");
if (ordersDiv) {
    db.collection("orders")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            let html = "";
            let totalOrders = 0;
            let pendingOrders = 0;
            snapshot.forEach((doc) => {
                const o = doc.data();
                const docId = doc.id;
                totalOrders++;
                const statusClass = o.status === 'selesai' ? 'status-selesai' :
                    o.status === 'dibatalkan' ? 'status-dibatalkan' :
                        o.status === 'dibayar' ? 'status-dibayar' : 'status-pending';

                // Hitung pesanan pending (belum dibayar, belum selesai/dibatalkan)
                if (o.paymentStatus !== 'sudah dibayarkan' && o.status !== 'selesai' && o.status !== 'dibatalkan' && o.status !== 'dibayar') {
                    pendingOrders++;
                }

                html += `
                    <div class="order-card" id="order-${docId}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:#fffdf9;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                            <h3 style="margin:0;">${o.productName || o.nama || '-'}</h3>
                            <span style="padding:4px 10px;border-radius:999px;font-size:0.8rem;font-weight:600;${statusClass === 'status-selesai' ? 'background:#c8e6c9;color:#2e7d32' : statusClass === 'status-dibatalkan' ? 'background:#ffcdd2;color:#c62828' : statusClass === 'status-dibayar' ? 'background:#bbdefb;color:#1565c0' : 'background:#fff9c4;color:#f57f17'}">${o.status === 'selesai' ? 'Selesai' : o.status === 'dibatalkan' ? 'Dibatalkan' : o.status === 'dibayar' ? 'Dibayar' : o.paymentStatus === 'sudah dibayarkan' ? 'Sudah Dibayar' : 'Pending'}</span>
                        </div>
                        <p style="margin:4px 0;"><strong>Pembeli:</strong> ${o.buyerName || o.namaPemesan || '-'} (${o.buyerWhatsapp || o.nomorWA || '-'})</p>
                        <p style="margin:4px 0;"><strong>Jumlah:</strong> ${o.qty || 1}</p>
                        <p style="margin:4px 0;"><strong>Total:</strong> ${formatRupiah(Number(o.total || 0))}</p>
                        <p style="margin:4px 0;"><strong>Status Pembayaran:</strong> ${o.paymentStatus || 'Belum Dibayar'}</p>
                        <p style="margin:4px 0;"><strong>Antrian:</strong> ${o.queueNumber || '-'}</p>
                        <p style="margin:4px 0;"><strong>Catatan:</strong> ${o.notes || '-'}</p>
                        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                            <button onclick="printOrderReceipt('${docId}')" style="padding:8px 14px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">🖨️ Cetak Struk</button>
                            ${o.paymentStatus !== 'sudah dibayarkan' && o.status !== 'selesai' && o.status !== 'dibatalkan' ? `
                                <button onclick="tandaiDibayarkan('${docId}')" style="padding:8px 14px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">✅ Telah Dibayarkan</button>
                            ` : ''}
                            ${o.status !== 'selesai' && o.status !== 'dibatalkan' ? `
                                <button onclick="selesaiPesanan('${docId}')" style="padding:8px 14px;background:#2196F3;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Selesai</button>
                                <button onclick="batalkanPesanan('${docId}')" style="padding:8px 14px;background:#f44336;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Batalkan</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            // Deteksi pesanan baru untuk notifikasi
            if (previousOrdersCount > 0 && totalOrders > previousOrdersCount) {
                playNotifikasiSuara();
                flashOrderNotification();
            }
            previousOrdersCount = totalOrders;

            // Update badge dengan jumlah pesanan pending
            updateOrderBadge(pendingOrders);

            ordersDiv.innerHTML = html || '<p class="muted">Belum ada pesanan masuk.</p>';
        }, (error) => {
            console.error('Error loading orders:', error);
            ordersDiv.innerHTML = '<p class="muted">Gagal memuat pesanan.</p>';
        });
}

// ===== FUNGSI AKSI PESANAN (Global) =====

// Tandai sudah dibayarkan
window.tandaiDibayarkan = function (id) {
    if (!confirm('Tandai pesanan ini sudah dibayarkan?')) return;
    db.collection("orders").doc(id).update({
        paymentStatus: "sudah dibayarkan",
        status: "dibayar"
    }).then(() => {
        alert('✅ Pesanan ditandai sudah dibayarkan');
    }).catch((error) => {
        console.error('Error:', error);
        alert('❌ Gagal: ' + error.message);
    });
};

// Selesai pesanan
window.selesaiPesanan = function (id) {
    if (!confirm('Tandai pesanan ini sebagai selesai?')) return;
    db.collection("orders").doc(id).update({
        status: "selesai"
    }).then(() => {
        alert('✅ Pesanan selesai');
    }).catch((error) => {
        console.error('Error:', error);
        alert('❌ Gagal: ' + error.message);
    });
};

// Batalkan pesanan
window.batalkanPesanan = function (id) {
    if (!confirm('Batalkan pesanan ini?')) return;
    db.collection("orders").doc(id).update({
        status: "dibatalkan"
    }).then(() => {
        alert('✅ Pesanan dibatalkan');
    }).catch((error) => {
        console.error('Error:', error);
        alert('❌ Gagal: ' + error.message);
    });
};

// ===== DATA KEUANGAN =====
let chartFinance = null;
let financeOrdersData = [];

function loadFinanceData() {
    const periode = document.getElementById('financePeriod')?.value || 'all';
    if (!db) {
        try {
            const stored = JSON.parse(localStorage.getItem('transactions') || '[]');
            financeOrdersData = (stored || []).map((t, index) => {
                const order = t.order || {};
                const items = Array.isArray(order.items) ? order.items : [];
                return {
                    id: t.id || `tx-${index}`,
                    buyerName: order.name || '-',
                    buyerWhatsapp: order.whatsapp || '-',
                    productName: items.map((it) => `${it.quantity || 1}x ${it.name || '-'}`).join(', '),
                    qty: items.reduce((sum, it) => sum + Number(it.quantity || 1), 0),
                    total: Number(order.total || 0),
                    paymentStatus: t.paidViaQris ? 'sudah dibayarkan' : (t.paid ? 'sudah dibayarkan' : 'Belum Dibayar'),
                    status: t.paidViaQris ? 'dibayar' : (t.paid ? 'selesai' : 'pending'),
                    notes: order.notes || '',
                    queueNumber: order.queue || '-',
                    createdAtTime: Number(t.ts || Date.now())
                };
            });
        } catch (e) {
            financeOrdersData = [];
        }
        renderFinanceData(periode);
        return;
    }

    // Ambil semua orders dari Firestore (real-time via onSnapshot)
    db.collection("orders")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            financeOrdersData = [];
            // idx dipakai untuk fallback urutan jika createdAt tidak tersedia
            let index = snapshot.size;
            snapshot.forEach((doc) => {
                const o = doc.data();
                financeOrdersData.push({
                    id: doc.id,
                    ...o,
                    createdAtTime: getOrderCreatedAtMs(o, index)
                });
                index--;
            });
            renderFinanceData(periode);
        }, (error) => {
            console.error('Error loading finance orders:', error);
            const listEl = document.getElementById('financeTransactionList');
            if (listEl) listEl.innerHTML = '<p class="muted">Gagal memuat data keuangan.</p>';
        });
}

// Membaca waktu pembuatan order dengan aman, baik berupa Timestamp Firestore,
// angka (Number), string tanggal, atau pun tidak ada sama sekali.
function getOrderCreatedAtMs(o, fallbackIndex) {
    const ts = o && o.createdAt;
    if (ts && typeof ts.toMillis === 'function') {
        return Number(ts.toMillis());
    }
    if (ts && typeof ts.toDate === 'function') {
        return Number(ts.toDate().getTime());
    }
    if (typeof ts === 'number' && Number.isFinite(ts)) {
        return ts;
    }
    if (typeof ts === 'string' && ts.trim()) {
        const parsed = new Date(ts).getTime();
        if (Number.isFinite(parsed)) return parsed;
    }
    // Fallback: turunkan dari indeks agar urutan tetap masuk akal
    return Date.now() - (Number.isFinite(fallbackIndex) ? fallbackIndex : 0);
}

function renderFinanceData(periode) {
    const now = new Date();
    let filtered = financeOrdersData;

    // Filter by period
    if (periode === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const end = start + 24 * 60 * 60 * 1000;
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    } else if (periode === 'week') {
        const dayOfWeek = now.getDay();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
        const end = start + 7 * 24 * 60 * 60 * 1000;
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    } else if (periode === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    } else if (periode === 'year') {
        const start = new Date(now.getFullYear(), 0, 1).getTime();
        const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    }

    // Calculate totals
    let totalPendapatan = 0;
    let totalQris = 0;
    let totalDana = 0;

    filtered.forEach(o => {
        const amount = Number(o.total || (o.harga * (o.qty || 1)) || 0);
        // Hitung hanya yang sudah dibayar
        if (o.paymentStatus === 'sudah dibayarkan' || o.status === 'dibayar' || o.status === 'selesai') {
            totalPendapatan += amount;
            // QRIS = payment via QRIS (status 'dibayar'), Dana = payment via transfer (status 'selesai')
            if (o.status === 'dibayar') {
                totalQris += amount;
            } else if (o.status === 'selesai') {
                totalDana += amount;
            }
        }
    });

    // Update ringkasan kartu
    document.getElementById('financeTotalIncome').textContent = formatRupiah(totalPendapatan);
    document.getElementById('financeQrisIncome').textContent = formatRupiah(totalQris);
    document.getElementById('financeDanaIncome').textContent = formatRupiah(totalDana);
    document.getElementById('financeTotalOrders').textContent = filtered.length;

    // Render daftar transaksi
    renderFinanceTransactions(filtered);

    // Render grafik
    renderFinanceChart(filtered);
}

function renderFinanceTransactions(orders) {
    const listEl = document.getElementById('financeTransactionList');
    if (!orders.length) {
        listEl.innerHTML = '<p class="muted">Tidak ada transaksi untuk periode ini.</p>';
        return;
    }

    listEl.innerHTML = orders.map((o, i) => {
        const amount = Number(o.total || (o.harga * (o.qty || 1)) || 0);
        const date = o.createdAt ? new Date(o.createdAtTime).toLocaleString('id-ID') : '-';
        const buyer = o.buyerName || o.namaPemesan || '-';
        const wa = o.buyerWhatsapp || o.nomorWA || '-';
        const product = o.productName || o.nama || '-';
        const queue = o.queueNumber || '-';
        const paymentStatus = o.paymentStatus || 'Belum Dibayar';
        const statusOrder = o.status || 'pending';
        const isUnpaid = paymentStatus !== 'sudah dibayarkan' && statusOrder !== 'selesai' && statusOrder !== 'dibatalkan' && statusOrder !== 'dibayar';

        return `<div class="finance-transaction-item" style="padding:10px 12px;border-bottom:1px solid #f1dec8;">
            <div class="finance-tx-header" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong>#${i + 1}</strong> — ${buyer} (${wa})
                <span class="finance-tx-date" style="font-size:0.8rem;color:var(--muted);">${date}</span>
            </div>
            <div class="finance-tx-detail" style="margin-top:4px;font-size:0.85rem;color:#555;line-height:1.4;">
                Produk: ${product} (${o.qty || 1}x)<br>
                Total: ${formatRupiah(amount)} | 
                Status: ${paymentStatus === 'sudah dibayarkan' ? '✅ Dibayar' : '⏳ ' + paymentStatus} | 
                Antrian: ${queue}
                ${isUnpaid ? `<br><button class="tandai-dibayar-btn" data-order-id="${o.id}" style="margin-top:6px;padding:6px 12px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">✅ Tandai Dibayar</button>` : ''}
            </div>
        </div>`;
    }).join('');

    // Event delegation for Tandai Dibayar buttons
    listEl.querySelectorAll('.tandai-dibayar-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const orderId = this.dataset.orderId;
            tandaiDibayarFinance(orderId);
        });
    });
}

function renderFinanceChart(orders) {
    const ctx = document.getElementById('chartFinance');
    if (!ctx) return;
    if (chartFinance) chartFinance.destroy();

    // Group by date
    const dateGroups = {};
    orders.forEach(o => {
        if (o.paymentStatus !== 'sudah dibayarkan' && o.status !== 'dibayar' && o.status !== 'selesai') return;
        const d = new Date(o.createdAtTime).toISOString().slice(0, 10);
        const amount = Number(o.total || (o.harga * (o.qty || 1)) || 0);
        dateGroups[d] = (dateGroups[d] || 0) + amount;
    });

    const labels = Object.keys(dateGroups).sort();
    const data = labels.map(l => dateGroups[l]);

    chartFinance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Tidak ada data'],
            datasets: [{
                label: 'Pendapatan (IDR)',
                data: labels.length ? data : [0],
                backgroundColor: '#4caf50',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) { return 'Rp ' + value.toLocaleString('id-ID'); }
                    }
                }
            }
        }
    });
}

// ===== TANDAI DIBAYAR (dari Rincian Keuangan) =====
function tandaiDibayarFinance(orderId) {
    if (!confirm('Tandai pesanan ini sebagai sudah dibayarkan?')) return;
    db.collection("orders").doc(orderId).update({
        paymentStatus: "sudah dibayarkan",
        status: "dibayar"
    }).then(() => {
        alert('✅ Pesanan ditandai sudah dibayarkan');
        // Data akan otomatis diperbarui via onSnapshot
    }).catch((error) => {
        console.error('Error:', error);
        alert('❌ Gagal: ' + error.message);
    });
}

// ===== EKSPOR KE EXCEL =====
function exportFinanceToExcel() {
    if (!financeOrdersData.length) {
        alert('Tidak ada data keuangan untuk diekspor.');
        return;
    }

    const periode = document.getElementById('financePeriod')?.value || 'all';
    let filtered = financeOrdersData;
    const now = new Date();

    if (periode === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const end = start + 24 * 60 * 60 * 1000;
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    } else if (periode === 'week') {
        const dayOfWeek = now.getDay();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
        const end = start + 7 * 24 * 60 * 60 * 1000;
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    } else if (periode === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    } else if (periode === 'year') {
        const start = new Date(now.getFullYear(), 0, 1).getTime();
        const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
        filtered = financeOrdersData.filter(o => o.createdAtTime >= start && o.createdAtTime < end);
    }

    if (!filtered.length) {
        alert('Tidak ada data untuk periode ini.');
        return;
    }

    const rows = filtered.map(o => {
        const amount = Number(o.total || (o.harga * (o.qty || 1)) || 0);
        const paymentStatus = o.paymentStatus || 'Belum Dibayar';
        const isPaid = paymentStatus === 'sudah dibayarkan' || o.status === 'dibayar' || o.status === 'selesai';
        const paymentMethod = o.status === 'dibayar' ? 'QRIS' : (o.status === 'selesai' ? 'Dana' : (isPaid ? 'Dana' : 'Belum Dibayar'));

        return {
            tanggal: o.createdAt ? new Date(o.createdAtTime).toLocaleString('id-ID') : '-',
            nama_pembeli: o.buyerName || o.namaPemesan || '-',
            nomor_wa: o.buyerWhatsapp || o.nomorWA || '-',
            produk: o.productName || o.nama || '-',
            jumlah: o.qty || 1,
            total: amount,
            status_pembayaran: isPaid ? 'Sudah Dibayar' : paymentStatus,
            metode_pembayaran: paymentMethod,
            nomor_antrian: o.queueNumber || '-',
            catatan: o.notes || '-'
        };
    });

    try {
        if (typeof XLSX === 'undefined') {
            alert('Library XLSX tidak tersedia. Periksa koneksi internet.');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Keuangan');
        XLSX.writeFile(wb, `data_keuangan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
        console.error('Gagal mengekspor ke Excel:', e);
        alert('❌ Gagal mengekspor: ' + e.message);
    }
}

// ===== RESET SEMUA DATA =====
function resetFinanceData() {
    if (!confirm('⚠️ PERINGATAN: Ini akan menghapus SEMUA data transaksi (orders) di database! Tindakan ini tidak dapat dibatalkan! Lanjutkan?')) return;
    if (!confirm('Ketik "RESET" di prompt berikut untuk konfirmasi penghapusan semua data.')) return;
    const confirmation = prompt('Ketik "RESET" (tanpa tanda petik) untuk mengkonfirmasi:');
    if (confirmation !== 'RESET') {
        alert('Konfirmasi gagal. Data tidak dihapus.');
        return;
    }

    // Hapus semua orders dari Firestore
    db.collection("orders").get().then((snapshot) => {
        const batch = db.batch();
        let count = 0;
        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });
        return batch.commit().then(() => {
            alert(`✅ ${count} data pesanan berhasil dihapus dari database.`);
            // Data akan otomatis diperbarui via onSnapshot
        });
    }).catch((error) => {
        console.error('Error resetting data:', error);
        alert('❌ Gagal mereset data: ' + error.message);
    });
}

// ===== TOMBOL AKSI BAWAH (TerimaPembayaran, Selesai, Batalkan) =====
const terimaPembayaranBtn = document.getElementById('terimaPembayaranBtn');
const selesaiPesananBtn = document.getElementById('selesaiPesananBtn');
const batalkanPesananBtn = document.getElementById('batalkanPesananBtn');

const financePeriodEl = document.getElementById('financePeriod');
if (financePeriodEl) {
    financePeriodEl.addEventListener('change', () => loadFinanceData());
}

const resetFinanceBtnEl = document.getElementById('resetFinanceBtn');
if (resetFinanceBtnEl) {
    resetFinanceBtnEl.addEventListener('click', resetFinanceData);
}

const exportFinanceExcelBtnEl = document.getElementById('exportFinanceExcelBtn');
if (exportFinanceExcelBtnEl) {
    exportFinanceExcelBtnEl.addEventListener('click', exportFinanceToExcel);
}

if (document.getElementById('financeTransactionList')) {
    loadFinanceData();
}

// Fungsi bantu untuk mencari order aktif berdasarkan tombol yang ada
function cariOrderAktif(selectorTombol) {
    const allOrderCards = document.querySelectorAll('.order-card');
    const orders = [];
    for (const card of allOrderCards) {
        const btn = card.querySelector(selectorTombol);
        if (btn && card.id) {
            const orderId = card.id.replace('order-', '');
            const nameEl = card.querySelector('h3');
            orders.push({ id: orderId, name: nameEl ? nameEl.textContent : 'Unknown' });
        }
    }
    return orders;
}

// Fungsi bantu untuk memilih order jika lebih dari 1
function pilihOrder(orders, aksi) {
    if (orders.length === 0) return null;
    let targetId = orders[0].id;
    if (orders.length > 1) {
        const pilihan = orders.map((o, i) => `${i + 1}. ${o.name} (${o.id})`).join('\n');
        const input = prompt(`Pilih pesanan yang akan ${aksi}:\n${pilihan}\n\nMasukkan nomor (1-${orders.length}):`, '1');
        if (!input) return null;
        const idx = parseInt(input) - 1;
        if (idx >= 0 && idx < orders.length) {
            targetId = orders[idx].id;
        } else {
            alert('Pilihan tidak valid.');
            return null;
        }
    }
    return targetId;
}

if (terimaPembayaranBtn) {
    terimaPembayaranBtn.addEventListener('click', async function () {
        // Cari order pertama yang belum dibayar dan belum selesai/dibatalkan
        const allOrderCards = document.querySelectorAll('.order-card');
        let targetId = null;
        for (const card of allOrderCards) {
            // Cari tombol "Telah Dibayarkan" — jika ada, berarti belum dibayar
            const payBtnInCard = card.querySelector('button[onclick*="tandaiDibayarkan"]');
            if (payBtnInCard && card.id) {
                targetId = card.id.replace('order-', '');
                break;
            }
        }

        if (!targetId) {
            alert('Tidak ada pesanan yang perlu ditandai dibayar.\nSemua pesanan sudah dibayar/selesai/dibatalkan.');
            return;
        }

        if (!confirm('Tandai pesanan terbaru yang belum dibayar?')) return;
        try {
            await db.collection("orders").doc(targetId).update({
                paymentStatus: "sudah dibayarkan",
                status: "dibayar"
            });
            alert('✅ Pesanan ditandai sudah dibayarkan');
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Gagal: ' + error.message);
        }
    });
}

if (selesaiPesananBtn) {
    selesaiPesananBtn.addEventListener('click', async function () {
        const allOrderCards = document.querySelectorAll('.order-card');
        let targetId = null;
        for (const card of allOrderCards) {
            const selesaiBtn = card.querySelector('button[onclick*="selesaiPesanan"]');
            if (selesaiBtn && card.id) {
                targetId = card.id.replace('order-', '');
                break;
            }
        }

        if (!targetId) {
            alert('Tidak ada pesanan aktif yang bisa ditandai selesai.');
            return;
        }

        if (!confirm('Tandai pesanan ini sebagai selesai?')) return;
        try {
            await db.collection("orders").doc(targetId).update({ status: "selesai" });
            alert('✅ Pesanan selesai');
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Gagal: ' + error.message);
        }
    });
}

if (batalkanPesananBtn) {
    batalkanPesananBtn.addEventListener('click', async function () {
        const allOrderCards = document.querySelectorAll('.order-card');
        let targetId = null;
        for (const card of allOrderCards) {
            const batalkanBtn = card.querySelector('button[onclick*="batalkanPesanan"]');
            if (batalkanBtn && card.id) {
                targetId = card.id.replace('order-', '');
                break;
            }
        }

        if (!targetId) {
            alert('Tidak ada pesanan aktif yang bisa dibatalkan.');
            return;
        }

        if (!confirm('Batalkan pesanan ini?')) return;
        try {
            await db.collection("orders").doc(targetId).update({ status: "dibatalkan" });
            alert('✅ Pesanan dibatalkan');
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Gagal: ' + error.message);
        }
    });
}

// ===== CETAK STRUK (Receipt) =====
const printReceiptBtn = document.getElementById('printReceiptBtn');

function ensureSellerButtons() {
    if (terimaPembayaranBtn) {
        terimaPembayaranBtn.disabled = false;
        terimaPembayaranBtn.removeAttribute('disabled');
    }
    if (selesaiPesananBtn) {
        selesaiPesananBtn.disabled = false;
        selesaiPesananBtn.removeAttribute('disabled');
    }
    if (batalkanPesananBtn) {
        batalkanPesananBtn.disabled = false;
        batalkanPesananBtn.removeAttribute('disabled');
    }
    if (printReceiptBtn) {
        printReceiptBtn.disabled = false;
        printReceiptBtn.removeAttribute('disabled');
    }
}

function createReceiptImage(headerText, productText, totalPrice) {
    const padding = 24;
    const lineHeight = 28;
    const lines = String(productText).split('\n');
    const width = 680;
    const contentHeight = padding * 2 + 60 + lines.length * lineHeight + 60;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = contentHeight;
    const ctx = canvas.getContext('2d');

    // background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // header
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Times New Roman", serif';
    ctx.fillText(headerText, canvas.width / 2, padding + 18);

    // product lines
    ctx.textAlign = 'left';
    ctx.font = '16px sans-serif';
    let y = padding + 60;
    lines.forEach((ln) => {
        ctx.fillText(ln, padding, y);
        y += lineHeight;
    });

    // total
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Total: ' + formatRupiah(totalPrice), padding, y + 6);

    // footer
    ctx.textAlign = 'center';
    ctx.font = '16px "Times New Roman", serif';
    ctx.fillText('Terimakasih telah memilih kami', canvas.width / 2, canvas.height - padding);

    // convert to blob jpeg and trigger download
    canvas.toBlob((blob) => {
        if (!blob) {
            alert('Gagal membuat gambar struk.');
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'struk_' + Date.now() + '.jpg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.92);
}

// ===== CETAK STRUK UNTUK SATU PESANAN TERTENTU =====
// Fungsi ini dipanggil tombol "🖨️ Cetak Struk" pada masing-masing kartu pesanan.
// Mengambil data pesanan spesifik dari Firestore lalu membuat struk yang
// menampilkan nama produk, jumlah (qty), dan total harga.
window.printOrderReceipt = async function (orderId) {
    if (!orderId) {
        alert('ID pesanan tidak ditemukan.');
        return;
    }
    if (!db) {
        alert('Database tidak terhubung. Tidak dapat mencetak struk.');
        return;
    }

    let order = null;
    // 1) Coba ambil dari cache keuangan (financeOrdersData) jika sudah dimuat.
    if (Array.isArray(financeOrdersData) && financeOrdersData.length) {
        const cached = financeOrdersData.find((o) => String(o.id) === String(orderId));
        if (cached) order = cached;
    }

    // 2) Jika belum ada di cache, ambil langsung dari Firestore.
    if (!order) {
        try {
            const snap = await db.collection("orders").doc(orderId).get();
            if (snap.exists) {
                order = { id: snap.id, ...snap.data() };
            }
        } catch (e) {
            console.error('Gagal mengambil pesanan untuk struk:', e);
        }
    }

    if (!order) {
        alert('Pesanan tidak ditemukan di database.');
        return;
    }

    // Susun isi struk: nama produk, jumlah, & total harga.
    const buyer = order.buyerName || order.namaPemesan || '-';
    const queue = order.queueNumber || '-';
    const notes = order.notes || '';

    let productText = '';
    // Multi-item: gunakan daftar items bila tersedia.
    const rawItems = order.items;
    if (Array.isArray(rawItems) && rawItems.length) {
        rawItems.forEach((it) => {
            const itName = it.name || it.nama || '-';
            const itQty = Number(it.quantity ?? it.qty ?? 1);
            const itPrice = Number(it.price ?? it.harga ?? 0);
            productText += `${itQty}x ${itName} — ${formatRupiah(itPrice * itQty)}\n`;
        });
    } else {
        // Single product: pakai productName/nama + qty.
        const productName = order.productName || order.nama || '-';
        const qty = Number(order.qty || 1);
        productText += `${qty}x ${productName}\n`;
    }

    productText += '------------------------\n';
    productText += 'Pembeli: ' + buyer + '\n';
    productText += 'Antrian: ' + queue + '\n';
    if (notes) productText += 'Catatan: ' + notes + '\n';

    const total = Number(order.total || 0);

    createReceiptImage('Chommell farm kendaldoyong', productText, total);
};

if (printReceiptBtn) {
    printReceiptBtn.addEventListener('click', function () {
        // Try to get the most recent completed order from Firestore orders loaded in financeOrdersData
        let lastOrder = null;
        if (window.financeOrdersData && financeOrdersData.length > 0) {
            // Find latest completed/paid order
            for (let i = 0; i < financeOrdersData.length; i++) {
                const o = financeOrdersData[i];
                if (o.paymentStatus === 'sudah dibayarkan' || o.status === 'selesai' || o.status === 'dibayar') {
                    lastOrder = o;
                    break;
                }
            }
            // If no completed order found, use the latest order
            if (!lastOrder) {
                lastOrder = financeOrdersData[0];
            }
        }

        let productText = '';
        let total = 0;

        if (lastOrder) {
            const productName = lastOrder.productName || lastOrder.nama || '-';
            const qty = lastOrder.qty || 1;
            const buyer = lastOrder.buyerName || lastOrder.namaPemesan || '-';
            const queue = lastOrder.queueNumber || '-';
            productText = 'Pembeli: ' + buyer + '\n';
            productText += 'Antrian: ' + queue + '\n';
            productText += 'Produk: ' + productName + ' (' + qty + 'x)\n';
            if (lastOrder.notes) {
                productText += 'Catatan: ' + lastOrder.notes + '\n';
            }
            total = Number(lastOrder.total || 0);
        }

        if (!productText || productText === 'Pembeli: -\nAntrian: -\nProduk: - (1x)\n') {
            // Fallback: prompt user
            const nama = prompt('Masukkan nama produk untuk dicetak di struk:');
            const t = prompt('Masukkan total harga (angka):');
            productText = nama || '-';
            total = Number(t) || 0;
        }

        createReceiptImage('Chommell farm kendaldoyong', productText, total);
    });
}

// Pastikan semua tombol aksi penjual aktif & bisa diklik
ensureSellerButtons();
