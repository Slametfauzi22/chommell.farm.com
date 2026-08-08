const orderBtn = document.getElementById('orderBtn');
const payBtn = document.getElementById('payBtn');
const summary = document.getElementById('summary');
const queueNumber = document.getElementById('queueNumber');
const statusText = document.getElementById('statusText');
const paymentInfo = document.getElementById('paymentInfo');
const customerName = document.getElementById('customerName');
const notes = document.getElementById('notes');
const categoryTabs = document.querySelectorAll('.category-tab');
const categoryBlocks = document.querySelectorAll('.category-block');
const loginScreen = document.getElementById('loginScreen');
const appMain = document.getElementById('appMain');
const buyerLoginBtn = document.getElementById('buyerLoginBtn');
const sellerStepBtn = document.getElementById('sellerStepBtn');
const sellerForm = document.getElementById('sellerForm');
const adminEmail = document.getElementById('adminEmail');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const sellerPanel = document.getElementById('sellerPanel');
const refreshQueueBtn = document.getElementById('refreshQueueBtn');
const queuePreviewText = document.getElementById('queuePreviewText');
const buyerNamePreviewText = document.getElementById('buyerNamePreviewText');
const productNameInput = document.getElementById('productName');
const productCategoryInput = document.getElementById('productCategory');
const saveProductBtn = document.getElementById('saveProductBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const productPriceInput = document.getElementById('productPrice');
const productStockInput = document.getElementById('productStock');
const productImageInput = document.getElementById('productImage') || document.createElement('input');
const productImageFileInput = document.getElementById('productImageFile');
const productVariationsInput = document.getElementById('productVariations');
const addProductBtn = document.getElementById('addProductBtn');
const sellerProductsList = document.getElementById('sellerProductsList');
const orderControls = document.getElementById('orderControls');
const deliveryGroup = document.getElementById('deliveryGroup');
const deliveryAddressInput = document.getElementById('deliveryAddress');
const notesGroup = document.getElementById('notesGroup');

const whatsappNumber = '6287727114562';
const adminEmailAllowed = 'slametfauzi2003@gmail.com';
let orderData = null;
let currentUserRole = null;
let editingProductId = null; // Changed from index to Firestore doc ID
const queueCounterKey = 'queueCounter';
const queuePrefix = 'A-';
const selectedVariations = {};
let products = [];
let productsUnsubscribe = null;
const queueNamesKey = 'queueNames';
const productsStorageKey = 'sellerProductsBackup';
const sharedProductsStorageKey = 'sharedProductsData';
const legacyProductsStorageKey = 'sellerProductsBackup';

function normalizeProductList(productList) {
  if (!Array.isArray(productList)) return [];
  return productList
    .filter(Boolean)
    .map((product, index) => normalizeProductForUi({
      ...product,
      id: product.id || product.docId || `local-${index + 1}`,
    }));
}

function getProductsFromStorage() {
  const keys = [sharedProductsStorageKey, productsStorageKey, legacyProductsStorageKey];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return normalizeProductList(parsed);
      }
    } catch (err) {
      console.warn('Gagal membaca produk dari storage:', err);
    }
  }
  return [];
}

function persistProductsToStorage(productList = products) {
  const normalized = normalizeProductList(productList);
  const payload = JSON.stringify(normalized);
  localStorage.setItem(sharedProductsStorageKey, payload);
  localStorage.setItem(productsStorageKey, payload);
  localStorage.setItem(legacyProductsStorageKey, payload);
  return normalized;
}

async function refreshProductsFromFirestore() {
  if (!db) {
    const storedProducts = getProductsFromStorage();
    if (storedProducts.length) {
      products = storedProducts;
      persistProductsToStorage(products);
    }
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
    return;
  }

  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    const freshProducts = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      freshProducts.push(normalizeProductForUi({
        id: doc.id,
        name: data.nama,
        price: data.harga,
        stock: data.stok !== undefined ? Number(data.stok) : 999999,
        category: data.kategori,
        image: data.gambar,
        variations: data.variasi,
      }));
    });

    if (freshProducts.length) {
      // Firestore punya data → pakai sebagai sumber utama & backup ke lokal.
      products = persistProductsToStorage(freshProducts);
    } else {
      // Firestore kosong / belum ada data → PERTAHANKAN produk lokal yang
      // ditambahkan user agar tidak hilang saat halaman di-refresh.
      // TIDAK menyuntikkan produk contoh (seed AI).
      const storedProducts = getProductsFromStorage();
      if (storedProducts.length) {
        products = persistProductsToStorage(storedProducts);
      } else {
        products = [];
        persistProductsToStorage(products);
      }
    }
    window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
  } catch (error) {
    console.warn('Gagal memuat produk dari Firestore:', error);
    const storedProducts = getProductsFromStorage();
    if (storedProducts.length) {
      products = storedProducts;
      persistProductsToStorage(products);
    } else {
      products = [];
      persistProductsToStorage(products);
    }
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
  }
}

function syncProductsFromStorage() {
  const storedProducts = getProductsFromStorage();
  if (storedProducts.length) {
    products = storedProducts;
    persistProductsToStorage(products);
  }
  renderProducts();
  if (typeof renderSellerProducts === 'function') renderSellerProducts();
  if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
}

function bootstrapProducts() {
  syncProductsFromStorage();
  refreshProductsFromFirestore();
}

window.addEventListener('storage', (event) => {
  if (!event.key || ![sharedProductsStorageKey, productsStorageKey, legacyProductsStorageKey].includes(event.key)) return;
  const storedProducts = getProductsFromStorage();
  if (storedProducts.length || event.newValue === null) {
    products = storedProducts;
    persistProductsToStorage(products);
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
  }
});

window.addEventListener('products-updated', () => {
  const storedProducts = getProductsFromStorage();
  if (storedProducts.length) {
    products = storedProducts;
    persistProductsToStorage(products);
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
  }
});

window.addEventListener('focus', () => {
  refreshProductsFromFirestore();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshProductsFromFirestore();
  }
});

function normalizeCategory(value) {
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

function normalizeProductForUi(product = {}) {
  const name = product.name || product.nama || '';
  const category = normalizeCategory(product.category || product.kategori);
  const price = Number(product.price ?? product.harga ?? 0);
  const stock = Number(product.stock ?? product.stok ?? 0);
  const variations = Array.isArray(product.variations)
    ? product.variations
    : (typeof product.variations === 'string' && product.variations.trim()
      ? product.variations.split(',').map((s) => s.trim()).filter(Boolean)
      : []);

  return {
    ...product,
    id: product.id || null,
    name,
    price,
    stock,
    category,
    image: product.image || product.gambar || 'https://via.placeholder.com/180x180.png?text=Produk',
    variations,
  };
}

// ===== FIRESTORE is already initialized in firebase.js (global db variable) =====
// Using global 'db' from firebase.js (null fallback if unavailable)

// ===== FIRESTORE REAL-TIME LISTENER for PRODUCTS (Single Source of Truth) =====
let productsUnsubscriber = null;

function setupProductsRealtimeListener() {
  if (!db) {
    const storedProducts = getProductsFromStorage();
    if (storedProducts.length) {
      products = storedProducts;
    }
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    return;
  }

  // Unsubscribe previous listener if exists
  if (productsUnsubscriber) {
    productsUnsubscriber();
  }

  productsUnsubscriber = db.collection("products")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      const freshProducts = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        freshProducts.push(normalizeProductForUi({
          id: doc.id,
          name: data.nama,
          price: data.harga,
          stock: data.stok !== undefined ? Number(data.stok) : 999999,
          category: data.kategori,
          image: data.gambar,
          variations: data.variasi
        }));
      });

      if (freshProducts.length) {
        // Firestore punya data → pakai sebagai sumber utama & backup ke lokal.
        products = persistProductsToStorage(freshProducts);
      } else {
        // Firestore kosong → JANGAN timpa produk lokal dengan array kosong.
        // TIDAK menyuntikkan produk contoh (seed AI).
        const storedProducts = getProductsFromStorage();
        if (storedProducts.length) {
          products = persistProductsToStorage(storedProducts);
        } else {
          products = [];
          persistProductsToStorage(products);
        }
      }

      // Render UI
      renderProducts();
      if (typeof renderSellerProducts === 'function') renderSellerProducts();
      if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
    }, (error) => {
      console.warn('Gagal listen produk dari Firestore:', error);
      const storedProducts = getProductsFromStorage();
      if (storedProducts.length) {
        products = storedProducts;
      } else {
        products = [];
        persistProductsToStorage(products);
      }
      persistProductsToStorage(products);
      renderProducts();
      if (typeof renderSellerProducts === 'function') renderSellerProducts();
      if (typeof renderBuyerProductGrid === 'function') renderBuyerProductGrid();
    });
}

async function addProductToFirestore(product) {
  if (!db) {
    const nextProducts = [...products, normalizeProductForUi(product)];
    products = nextProducts;
    persistProductsToStorage(products);
    window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    return null;
  }
  try {
    const normalizedProduct = normalizeProductForUi(product);
    const data = {
      nama: normalizedProduct.name,
      harga: Number(normalizedProduct.price),
      stok: Number(normalizedProduct.stock) || 0,
      kategori: normalizedProduct.category || 'makanan',
      variasi: normalizedProduct.variations && normalizedProduct.variations.length ? normalizedProduct.variations.join(', ') : '',
      gambar: normalizedProduct.image || 'https://via.placeholder.com/180x180.png?text=Produk',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection("products").add(data);
    normalizedProduct.id = docRef.id;
    products = [normalizedProduct, ...products.filter((item) => String(item.id || '') !== String(docRef.id))];
    persistProductsToStorage(products);
    window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    return docRef.id;
  } catch (e) {
    console.error('Gagal tambah produk ke Firestore:', e);
    // Fallback to localStorage
    const nextProducts = [...products, normalizeProductForUi(product)];
    products = nextProducts;
    persistProductsToStorage(products);
    window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
    return null;
  }
}

async function updateProductInFirestore(docId, product) {
  // SELALU perbarui array & storage lokal terlebih dahulu agar edit berfungsi unlimited
  const updatedProduct = normalizeProductForUi({ ...product, id: docId });
  const idx = products.findIndex(p => String(p.id || '') === String(docId));
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...updatedProduct, id: docId };
  } else if (docId) {
    // Jika produk belum ada di array (mis. dari Firestore), sinkronkan
    products = [updatedProduct, ...products];
  } else {
    // Tidak ada ID: perbarui produk pertama yang cocok / tambahkan
    if (products.length) {
      products[0] = { ...products[0], ...updatedProduct };
    }
  }
  persistProductsToStorage(products);
  window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
  renderProducts();
  if (typeof renderSellerProducts === 'function') renderSellerProducts();

  // Jika Firestore tersedia & docId valid, perbarui cloud juga
  if (!db || !docId) return;
  try {
    const data = {
      nama: updatedProduct.name,
      harga: Number(updatedProduct.price),
      stok: updatedProduct.stock !== undefined ? Number(updatedProduct.stock) : 0,
      kategori: updatedProduct.category || 'makanan',
      variasi: updatedProduct.variations && updatedProduct.variations.length ? updatedProduct.variations.join(', ') : '',
      gambar: updatedProduct.image || 'https://via.placeholder.com/180x180.png?text=Produk'
    };
    await db.collection("products").doc(docId).update(data);
    // onSnapshot will automatically update UI
  } catch (e) {
    console.warn('Gagal update produk di Firestore:', e);
  }
}

async function deleteProductFromFirestore(docId) {
  // SELALU hapus dari array & storage lokal terlebih dahulu agar berfungsi unlimited
  const idx = products.findIndex(p => String(p.id || '') === String(docId));
  if (idx !== -1) {
    products.splice(idx, 1);
    persistProductsToStorage(products);
    window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
  } else if (!docId && products.length) {
    // Produk tanpa ID: hapus produk terakhir (fallback)
    products.pop();
    persistProductsToStorage(products);
    window.dispatchEvent(new CustomEvent('products-updated', { detail: products }));
    renderProducts();
    if (typeof renderSellerProducts === 'function') renderSellerProducts();
  }
  // Jika Firestore tersedia & docId valid, hapus dari cloud juga
  if (!db || !docId) return;
  try {
    await db.collection("products").doc(docId).delete();
    // onSnapshot will automatically update UI
  } catch (e) {
    console.warn('Gagal hapus dari Firestore:', e);
  }
}

// ===== FIRESTORE QUEUE COUNTER (cross-device) =====
async function generateQueueNumberFirestore() {
  if (!db) {
    // Fallback: localStorage counter
    let counter = Number(localStorage.getItem(queueCounterKey) || '0');
    counter += 1;
    localStorage.setItem(queueCounterKey, String(counter));
    return `${queuePrefix}${String(counter).padStart(3, '0')}`;
  }

  try {
    const counterRef = db.collection("counters").doc("queue");
    // Use transaction for atomic increment
    let last = 0;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(counterRef);
      if (snap.exists) {
        last = snap.data().lastNumber || 0;
      }
      last++;
      transaction.set(counterRef, { lastNumber: last }, { merge: true });
    });
    localStorage.setItem(queueCounterKey, String(last));
    return `${queuePrefix}${String(last).padStart(3, '0')}`;
  } catch (e) {
    console.warn('Gagal generate queue dari Firestore:', e);
    // Fallback: localStorage
    let counter = Number(localStorage.getItem(queueCounterKey) || '0');
    counter += 1;
    localStorage.setItem(queueCounterKey, String(counter));
    return `${queuePrefix}${String(counter).padStart(3, '0')}`;
  }
}

// ===== FIRESTORE REGISTERED BUYERS =====
async function saveRegisteredBuyerToFirestore(name, whatsapp) {
  if (!db) {
    // Fallback: localStorage
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
      // Update login timestamp
      query.forEach(async (doc) => {
        await db.collection("registeredBuyers").doc(doc.id).update({
          loginAt: Date.now(),
          loginDate: new Date().toLocaleString('id-ID')
        });
      });
    }
  } catch (e) {
    console.warn('Gagal simpan buyer ke Firestore:', e);
    // Fallback: localStorage
    saveRegisteredBuyerLocal(name, whatsapp);
  }

  // Also save locally for backup
  saveRegisteredBuyerLocal(name, whatsapp);
}

async function loadRegisteredBuyersFromFirestore() {
  if (!db) {
    // Fallback: localStorage
    return getRegisteredBuyersLocal();
  }

  try {
    const snapshot = await db.collection("registeredBuyers")
      .orderBy("loginAt", "desc")
      .get();

    const buyers = [];
    snapshot.forEach((doc) => {
      buyers.push({ id: doc.id, ...doc.data() });
    });

    // Backup to localStorage
    localStorage.setItem(REGISTERED_BUYERS_KEY, JSON.stringify(buyers));
    return buyers;
  } catch (e) {
    console.warn('Gagal load buyers dari Firestore:', e);
    return getRegisteredBuyersLocal();
  }
}

// ===== LOCAL STORAGE BUYERS (backup) =====
function saveRegisteredBuyerLocal(name, whatsapp) {
  const buyers = getRegisteredBuyersLocal();
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

function getRegisteredBuyersLocal() {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_BUYERS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

const queueListEl = document.getElementById('queueList');
const openQueuePageBtn = document.getElementById('openQueuePageBtn');
const closeQueuePageBtn = document.getElementById('closeQueuePageBtn');
const sellerQueuePage = document.getElementById('sellerQueuePage');
const sellerBackBtn = document.getElementById('sellerBackBtn');
const sellerNavMenuBtn = document.getElementById('sellerNavMenuBtn');
const sellerNavQrisBtn = document.getElementById('sellerNavQrisBtn');
const sellerNavTopBtn = document.getElementById('sellerNavTopBtn');
const sellerMenuSection = document.getElementById('sellerMenuSection');
const sellerQrisSection = document.getElementById('sellerQrisSection');
const sellerTopSection = document.getElementById('sellerTopSection');
const sellerAnalyticsSection = document.getElementById('sellerAnalyticsSection');
const sellerPageStateKey = 'sellerPageState';
let currentSellerSection = 'menu';
let sellerMenuBackup = null;
let heroBackup = null;
let resultCardBackup = null;
// don't remove payment-card innerHTML (keeps event listeners); just hide/show it

// ===== FIRESTORE REAL-TIME LISTENER for REGISTERED BUYERS =====
let registeredBuyersUnsubscriber = null;

function setupRegisteredBuyersRealtimeListener() {
  if (!db) {
    renderBuyersList();
    return;
  }
  if (registeredBuyersUnsubscriber) {
    registeredBuyersUnsubscriber();
  }
  registeredBuyersUnsubscriber = db.collection("registeredBuyers")
    .orderBy("loginAt", "desc")
    .onSnapshot((snapshot) => {
      const buyers = [];
      snapshot.forEach((doc) => {
        buyers.push({ id: doc.id, ...doc.data() });
      });
      // Backup to localStorage
      localStorage.setItem(REGISTERED_BUYERS_KEY, JSON.stringify(buyers));
      // Update UI if buyers page is visible
      renderBuyersList();
    }, (error) => {
      console.warn('Gagal listen registeredBuyers:', error);
      renderBuyersList();
    });
}

const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('orders') : null;

if (bc) {
  bc.onmessage = (ev) => {
    try {
      if (ev && ev.data && ev.data.type === 'new-order') {
        updateQueuePreviewText();
        updateBuyerNamePreview();
        renderQueueList();
      }
    } catch (e) {
      console.warn('BroadcastChannel message handler error:', e);
    }
  };
}

function updateQueuePreviewText() {
  if (queuePreviewText) {
    queuePreviewText.textContent = `Nomor antrean selanjutnya: ${getNextQueuePreview()}`;
  }
}

function updateBuyerNamePreview() {
  const buyerName = localStorage.getItem('lastBuyerName') || '-';
  const buyerInfo = getBuyerInfo ? getBuyerInfo() : null;
  const waText = buyerInfo && buyerInfo.whatsapp ? ` (WA: ${buyerInfo.whatsapp})` : '';
  if (buyerNamePreviewText) {
    buyerNamePreviewText.innerHTML = `<strong>Nama pembeli:</strong> ${buyerName}${waText}`;
  }
}

function resetProductForm() {
  if (productNameInput) productNameInput.value = '';
  if (productPriceInput) productPriceInput.value = '';
  if (productStockInput) productStockInput.value = '';
  if (productImageInput) productImageInput.value = '';
  if (productImageFileInput) productImageFileInput.value = '';
  if (productCategoryInput) productCategoryInput.value = 'makanan';
  if (productVariationsInput) productVariationsInput.value = '';
  editingProductId = null;
  if (addProductBtn) {
    addProductBtn.textContent = 'Tambah Produk';
    addProductBtn.disabled = false;
    addProductBtn.removeAttribute('disabled');
  }
  if (saveProductBtn) {
    saveProductBtn.classList.add('hidden');
    saveProductBtn.disabled = false;
    saveProductBtn.removeAttribute('disabled');
  }
  if (cancelEditBtn) {
    cancelEditBtn.classList.add('hidden');
    cancelEditBtn.disabled = false;
    cancelEditBtn.removeAttribute('disabled');
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function renderProducts() {
  // Kumpulkan kategori yang sedang dipakai produk (termasuk kategori kustom)
  const usedCategories = new Set();
  products.forEach((product) => {
    usedCategories.add(normalizeCategory(product.category));
  });

  // Hapus blok kategori kustom lama (agar tidak dobel saat re-render)
  document.querySelectorAll('.category-block[data-custom="true"]').forEach((el) => el.remove());

  // Blok kategori standar: tampilkan hanya jika ada produk (atau selalu tampil untuk ke-6)
  categoryBlocks.forEach((block) => {
    const categoryKey = block.dataset.categoryGroup;
    const list = block.querySelector('.menu-list');
    const items = products.filter((product) => normalizeCategory(product.category) === categoryKey);

    list.innerHTML = items
      .map(
        (product, index) => `
          <label class="menu-item product-card">
            <div class="product-image">
              <img src="${product.image}" alt="${product.name}" />
            </div>
            <div class="menu-main">
              <input type="checkbox" value="${product.name}" data-price="${product.price}" data-category="${product.category}" />
              <span>
                <strong>${product.name}</strong>
                <small>${formatCurrency(product.price)}</small>
              </span>
            </div>
            <div class="qty-control">
              <label class="qty-label" for="qty-${categoryKey}-${index}">Jumlah</label>
              <input id="qty-${categoryKey}-${index}" class="qty-input" type="number" min="1" max="10" value="1" />
            </div>
          </label>
        `
      )
      .join('');
  });

  // Buat blok kategori kustom secara dinamis (mendukung kategori tak terbatas)
  const standardKeys = Array.from(categoryBlocks).map((block) => block.dataset.categoryGroup);
  const paymentCard = document.querySelector('.payment-card');
  const orderControlsEl = document.getElementById('orderControls');
  const customKeys = Array.from(usedCategories).filter((cat) => cat && !standardKeys.includes(cat));
  customKeys.sort().forEach((catKey) => {
    const items = products.filter((product) => normalizeCategory(product.category) === catKey);
    if (!items.length) return;
    const block = document.createElement('div');
    block.className = 'category-block';
    block.dataset.categoryGroup = catKey;
    block.dataset.custom = 'true';
    block.innerHTML = `<h3>${catKey.charAt(0).toUpperCase() + catKey.slice(1)}</h3><div class="menu-list"></div>`;
    if (orderControlsEl && orderControlsEl.parentNode) {
      orderControlsEl.parentNode.insertBefore(block, orderControlsEl);
    } else if (paymentCard) {
      paymentCard.appendChild(block);
    }
    const list = block.querySelector('.menu-list');
    list.innerHTML = items
      .map(
        (product, index) => `
          <label class="menu-item product-card">
            <div class="product-image">
              <img src="${product.image}" alt="${product.name}" />
            </div>
            <div class="menu-main">
              <input type="checkbox" value="${product.name}" data-price="${product.price}" data-category="${product.category}" />
              <span>
                <strong>${product.name}</strong>
                <small>${formatCurrency(product.price)}</small>
              </span>
            </div>
            <div class="qty-control">
              <label class="qty-label" for="qty-${catKey}-${index}">Jumlah</label>
              <input id="qty-${catKey}-${index}" class="qty-input" type="number" min="1" max="10" value="1" />
            </div>
          </label>
        `
      )
      .join('');
  });

  // wire up selection listeners after rendering
  attachSelectionListeners();
  // update summary preview
  updateSummaryFromSelection();
}

function getNextQueuePreview() {
  const counter = Number(localStorage.getItem(queueCounterKey) || '0');
  return `${queuePrefix}${String(counter + 1).padStart(3, '0')}`;
}

function updateSummaryFromSelection() {
  const selectedItems = Array.from(document.querySelectorAll('.menu-item input[type="checkbox"]:checked'));
  if (selectedItems.length === 0) {
    summary.innerHTML = `<p class="muted">Belum ada pesanan.</p>`;
    queueNumber.textContent = '-';
    // hide notes and delivery when nothing selected
    if (notesGroup) notesGroup.classList.add('hidden');
    if (deliveryGroup) deliveryGroup.classList.add('hidden');
    return;
  }

  // show notes and delivery options when items selected
  if (notesGroup) notesGroup.classList.remove('hidden');
  if (deliveryGroup) deliveryGroup.classList.remove('hidden');

  const items = selectedItems.map((checkbox) => {
    const quantityInput = checkbox.closest('.menu-item').querySelector('.qty-input');
    const quantity = Math.max(1, Number(quantityInput.value) || 1);
    return {
      name: checkbox.value,
      price: Number(checkbox.dataset.price),
      quantity,
      category: checkbox.dataset.category || 'Umum',
    };
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // build list with variation selects if available
  summary.innerHTML = `
    <p><strong>Preview Pesanan</strong></p>
    <ul>
      ${items
      .map((item, idx) => {
        const prod = products.find((p) => p.name === item.name) || {};
        const hasVariations = prod.variations && prod.variations.length;
        if (hasVariations && item.quantity === 1) {
          const selectId = `var-select-${idx}`;
          const options = prod.variations.map((v) => `<option value="${v}">${v}</option>`).join('');
          return `<li>${item.quantity}x ${item.name} (${item.category}) — ${formatCurrency(item.price * item.quantity)}<br/><select data-product-name="${item.name}" id="${selectId}" class="selected-variation">${options}</select></li>`;
        }

        const variationNote = hasVariations
          ? '<br/><small class="muted">Varian dimatikan untuk qty > 1. Silakan chat live untuk detail varian.</small>'
          : '';

        return `<li>${item.quantity}x ${item.name} (${item.category}) — ${formatCurrency(item.price * item.quantity)}${variationNote}</li>`;
      })
      .join('')}
    </ul>
    <p><strong>Total:</strong> ${formatCurrency(total)}</p>
  `;

  // attach variation listeners
  document.querySelectorAll('.selected-variation').forEach((sel) => {
    const productName = sel.dataset.productName;
    if (!selectedVariations[productName]) selectedVariations[productName] = sel.value;
    sel.value = selectedVariations[productName];
    sel.addEventListener('change', (e) => {
      selectedVariations[productName] = e.target.value;
    });
  });

  // show next queue preview
  queueNumber.textContent = getNextQueuePreview();

  // if any item quantity > 1, suggest live chat: prefill notes and show chat button
  const hasBulk = items.some((it) => it.quantity > 1);
  const notesEl = document.getElementById('notes');
  if (hasBulk) {
    if (notesGroup) notesGroup.classList.remove('hidden');
    if (notesEl && !notesEl.value) {
      notesEl.value = 'Mohon chat live untuk konfirmasi varian/ketentuan karena ada item dengan jumlah lebih dari 1.';
    }
    // create chat live button if not present
    let chatBtn = document.getElementById('chatLiveBtn');
    if (!chatBtn && notesGroup) {
      chatBtn = document.createElement('button');
      chatBtn.id = 'chatLiveBtn';
      chatBtn.type = 'button';
      chatBtn.className = 'secondary-btn';
      chatBtn.style.marginTop = '6px';
      chatBtn.textContent = 'Chat Live via WhatsApp (konfirmasi varian)';
      chatBtn.addEventListener('click', () => {
        const name = customerName.value.trim() || '-';
        const orderPreview = {
          name,
          items,
          total: items.reduce((s, it) => s + it.price * it.quantity, 0),
          queue: getNextQueuePreview(),
          notes: notesEl ? notesEl.value : '',
        };
        openWhatsApp(orderPreview);
      });
      notesGroup.appendChild(chatBtn);
    }
  } else {
    // remove chat button if exists
    const existing = document.getElementById('chatLiveBtn');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }
}

function attachSelectionListeners() {
  // checkboxes
  document.querySelectorAll('.menu-item input[type="checkbox"]').forEach((cb) => {
    cb.removeEventListener('change', updateSummaryFromSelection);
    cb.addEventListener('change', updateSummaryFromSelection);
  });
  // qty inputs
  document.querySelectorAll('.menu-item .qty-input').forEach((qi) => {
    qi.removeEventListener('input', updateSummaryFromSelection);
    qi.addEventListener('input', updateSummaryFromSelection);
  });
}

function renderSellerProducts() {
  if (!sellerProductsList) return; // guard agar tidak error di halaman pembeli
  sellerProductsList.innerHTML = products
    .map(
      (p) => `
      <div class="seller-product">
        <div class="product-image"><img src="${p.image}" alt="${p.name}"/></div>
        <div class="seller-product-info">
          <div class="seller-product-name">${p.name}</div>
          <div class="seller-product-cat">${p.category}</div>
          <div class="seller-product-price">${formatCurrency(p.price)}</div>
        </div>
        <div class="seller-product-actions">
          <button class="edit-btn" data-id="${p.id || ''}">Edit</button>
          <button class="delete-btn" data-id="${p.id || ''}">Hapus</button>
        </div>
      </div>
    `
    )
    .join('');
}

// Event delegation for Edit & Delete buttons using data-id (Firestore doc ID)
if (sellerProductsList) {
  sellerProductsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (btn) {
      const docId = btn.dataset.id;
      if (!docId) {
        alert('Produk tidak memiliki ID. Hapus gagal.');
        return;
      }
      if (!confirm('Hapus produk ini?')) return;
      // Hapus dari Firestore dulu - onSnapshot akan update UI otomatis
      deleteProductFromFirestore(docId);
      if (editingProductId === docId) resetProductForm();
      alert('✅ Produk berhasil dihapus.');
      return;
    }
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const docId = editBtn.dataset.id;
      if (!docId) {
        alert('Produk tidak memiliki ID. Edit gagal.');
        return;
      }
      const p = products.find(prod => prod.id === docId);
      if (!p) {
        alert('Produk tidak ditemukan.');
        return;
      }
      productNameInput.value = p.name;
      productCategoryInput.value = p.category;
      productPriceInput.value = p.price;
      if (productStockInput) productStockInput.value = p.stock !== undefined ? p.stock : '';
      productImageInput.value = p.image && /^https?:\/\//.test(p.image) ? p.image : '';
      if (productImageFileInput) productImageFileInput.value = '';
      productVariationsInput.value = p.variations ? p.variations.join(', ') : '';
      editingProductId = p.id || null;
      addProductBtn.disabled = false;
      if (saveProductBtn) saveProductBtn.classList.remove('hidden');
      if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
      productNameInput.focus();
    }
  });
}

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

function saveTransaction(order) {
  const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
  const ts = Date.now();
  tx.push({ order, ts, paid: false, paidViaQris: false });
  localStorage.setItem('transactions', JSON.stringify(tx));
  localStorage.setItem('lastBuyerName', order.name);
  // push order summary into queueNames for seller list (include selected products)
  try {
    const q = JSON.parse(localStorage.getItem(queueNamesKey) || '[]');
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsText = items
      .map((it) => {
        const qty = it.quantity || 1;
        const variation = qty > 1 ? 'chat live' : it.variation || '-';
        return `${qty}x ${it.name}${qty > 1 ? '' : ` (${variation})`}`;
      })
      .join('\n');
    q.push({ queue: order.queue || getNextQueuePreview(), name: order.name || '', items: itemsText });
    localStorage.setItem(queueNamesKey, JSON.stringify(q));
  } catch (e) {
    console.warn('Gagal menyimpan queueNames:', e);
  }
  return ts;
}

function countTransactionsLast30Days() {
  const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
  if (!Array.isArray(tx)) return 0;
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
  return tx.filter((t) => typeof t.ts === 'number' && t.ts >= cutoff).length;
}

function updateTransactionStats() {
  const count = countTransactionsLast30Days();
  const summaryBox = document.getElementById('summary');
  if (summaryBox) {
    summaryBox.innerHTML = `<p><strong>Transaksi (30 hari):</strong> ${count}</p>`;
  }
}

function renderQueueList() {
  if (!queueListEl) return;
  try {
    const names = JSON.parse(localStorage.getItem(queueNamesKey) || '[]');
    queueListEl.innerHTML = '';
    if (!Array.isArray(names) || names.length === 0) {
      queueListEl.innerHTML = '<li class="muted">Belum ada antrean.</li>';
      return;
    }
    names.forEach((entry, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      const li = document.createElement('li');
      // entry may be string (legacy) or object {queue, name, items}
      let buyer = '';
      let items = '';
      let savedQueue = `${queuePrefix}${num}`;
      if (entry && typeof entry === 'object') {
        buyer = entry.name || '-';
        items = entry.items || '';
        if (entry.queue) savedQueue = entry.queue;
      } else {
        buyer = String(entry || '-');
      }
      li.innerHTML = `<strong>${savedQueue}</strong> — <span class="queue-buyer">${buyer}</span> <button class="secondary-btn queue-down-btn" data-idx="${idx}" aria-label="Tandai selesai">Selesai</button><br/><small class="muted">Produk: ${items.replace(/\n/g, '<br/>')}</small>`;
      queueListEl.appendChild(li);
    });
  } catch (e) {
    console.warn('Gagal merender queue list:', e);
  }
}

// handle marking an entry as completed (remove from queueNames)
if (queueListEl) {
  queueListEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.queue-down-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (Number.isNaN(idx)) return;
    if (!confirm('Tandai pesanan ini sebagai selesai?')) return;
    try {
      const arr = JSON.parse(localStorage.getItem(queueNamesKey) || '[]');
      if (!Array.isArray(arr)) return;
      arr.splice(idx, 1);
      localStorage.setItem(queueNamesKey, JSON.stringify(arr));
      renderQueueList();
    } catch (e) {
      console.error('Gagal menghapus entri antrean:', e);
    }
  });
}

function showCategory(filter) {
  // Termasuk blok kategori kustom yang dibuat dinamis
  document.querySelectorAll('.category-block').forEach((block) => {
    const matches = filter === 'all' || block.dataset.categoryGroup === filter;
    block.classList.toggle('is-hidden', !matches);
  });

  categoryTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
}


function openWhatsApp(order) {
  const lines = [
    '🛒 *PESANAN BARU - CHOMMELL FARM*',
    '============================',
    `👤 Nama: ${order.name}`,
  ];

  if (order.whatsapp) {
    lines.push(`📱 WA: ${order.whatsapp}`);
  }

  lines.push('', '*Detail Pesanan:*');
  order.items.forEach((item) => {
    const variationText = item.variation ? ` (${item.variation})` : '';
    lines.push(`• ${item.quantity}x ${item.name}${variationText} — ${formatCurrency(item.price * item.quantity)}`);
  });
  lines.push('', `💰 *Total: ${formatCurrency(order.total)}*`, `🔢 Nomor Antrian: ${order.queue}`);

  if (order.notes) {
    lines.push(`📝 Catatan: ${order.notes}`);
  }

  const message = encodeURIComponent(lines.join('\n'));
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`;
  try {
    const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = whatsappUrl;
    }
  } catch (e) {
    window.location.href = whatsappUrl;
  }
}

// ===== BUYER LOGIN WITH NAME & WHATSAPP =====
const BUYER_INFO_KEY = 'buyerInfo';

function getBuyerInfo() {
  try {
    const data = localStorage.getItem(BUYER_INFO_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function saveBuyerInfo(name, whatsapp) {
  localStorage.setItem(BUYER_INFO_KEY, JSON.stringify({ name, whatsapp }));
}

// === REGISTERED BUYERS (Daftar Nama Pembeli) ===
const REGISTERED_BUYERS_KEY = 'registeredBuyers';

function getRegisteredBuyers() {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_BUYERS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveRegisteredBuyer(name, whatsapp) {
  const buyers = getRegisteredBuyers();
  // Cek apakah sudah ada (by whatsapp)
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
    // Update timestamp login terbaru
    exists.loginAt = Date.now();
    exists.loginDate = new Date().toLocaleString('id-ID');
    localStorage.setItem(REGISTERED_BUYERS_KEY, JSON.stringify(buyers));
  }
}

function renderBuyersList() {
  const buyersList = document.getElementById('buyersList');
  if (!buyersList) return;
  const buyers = getRegisteredBuyers();
  if (!buyers.length) {
    buyersList.innerHTML = '<div class="muted">Belum ada pembeli yang login.</div>';
    return;
  }
  buyersList.innerHTML = buyers.map((b, idx) => `
    <div class="seller-product">
      <div class="seller-product-info">
        <div class="seller-product-name">${b.name}</div>
        <div class="seller-product-cat">WA: ${b.whatsapp}</div>
        <div class="seller-product-price" style="font-size:0.85rem;color:var(--muted);">Login: ${b.loginDate || '-'}</div>
      </div>
      <div class="seller-product-actions">
        <button class="edit-btn" onclick="copyBuyerWhatsapp('${b.whatsapp}')" title="Salin nomor WA">Salin WA</button>
      </div>
    </div>
  `).join('');
}

window.copyBuyerWhatsapp = function (whatsapp) {
  navigator.clipboard.writeText(whatsapp).then(() => {
    alert('Nomor WhatsApp disalin: ' + whatsapp);
  }).catch(() => {
    alert('Gagal menyalin. Salin manual: ' + whatsapp);
  });
};

// ===== ANIMASI LOGIN MENGE MBANG (EXPAND) =====
function playExpandAnimation(el) {
  if (!el) return;
  el.classList.remove('login-expand-done');
  el.classList.remove('login-expand');
  // Force reflow agar animasi bisa diputar ulang setiap klik
  void el.offsetWidth;
  el.classList.add('login-expand');
  // Setelah animasi selesai, hapus animasi agar elemen tampil normal
  el.addEventListener('animationend', function handler() {
    el.classList.remove('login-expand');
    el.classList.add('login-expand-done');
    el.removeEventListener('animationend', handler);
  });
}

function bindPrimaryPageHandlers() {
  if (buyerLoginBtn && !buyerLoginBtn.dataset.bound) {
    buyerLoginBtn.dataset.bound = 'true';
    buyerLoginBtn.addEventListener('click', () => {
      const buyerForm = document.getElementById('buyerForm');
      if (buyerForm) {
        const sellerFormEl = document.getElementById('sellerForm');
        if (sellerFormEl) {
          sellerFormEl.classList.add('hidden');
          sellerFormEl.style.display = 'none';
        }
        buyerForm.classList.remove('hidden');
        buyerForm.style.display = '';
        playExpandAnimation(buyerForm);
        const existing = getBuyerInfo();
        const buyerNameInput = document.getElementById('buyerNameInput');
        const buyerWhatsappInput = document.getElementById('buyerWhatsappInput');
        if (existing) {
          if (buyerNameInput) buyerNameInput.value = existing.name || '';
          if (buyerWhatsappInput) buyerWhatsappInput.value = existing.whatsapp || '';
        }
        if (buyerNameInput) buyerNameInput.focus();
      }
    });
  }

  const buyerConfirmBtn = document.getElementById('buyerConfirmBtn');
  if (buyerConfirmBtn && !buyerConfirmBtn.dataset.bound) {
    buyerConfirmBtn.dataset.bound = 'true';
    buyerConfirmBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('buyerNameInput');
      const whatsappInput = document.getElementById('buyerWhatsappInput');
      const name = nameInput ? nameInput.value.trim() : '';
      const whatsapp = whatsappInput ? whatsappInput.value.trim() : '';

      if (!name) {
        alert('Silakan isi nama lengkap Anda.');
        if (nameInput) nameInput.focus();
        return;
      }
      if (!whatsapp) {
        alert('Silakan isi nomor WhatsApp Anda.');
        if (whatsappInput) whatsappInput.focus();
        return;
      }
      const phoneDigits = whatsapp.replace(/[^0-9]/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        alert('Nomor WhatsApp tidak valid. Masukkan 10-15 digit angka.');
        if (whatsappInput) whatsappInput.focus();
        return;
      }

      saveBuyerInfo(name, whatsapp);
      saveRegisteredBuyer(name, whatsapp);
      saveRegisteredBuyerToFirestore(name, whatsapp);
      currentUserRole = 'buyer';
      localStorage.setItem('currentUserRole', 'buyer');

      if (customerName) customerName.value = name;

      const buyerForm = document.getElementById('buyerForm');
      if (buyerForm) buyerForm.classList.add('hidden');
      if (sellerPanel) sellerPanel.classList.add('hidden');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appMain) appMain.classList.remove('hidden');
      renderProducts();
      renderSellerProducts();

      if (orderControls) orderControls.classList.remove('hidden');
      if (queueNumber) queueNumber.style.display = '';
      const queueBox = queueNumber ? queueNumber.closest('.queue-box') : null;
      if (queueBox) queueBox.style.display = '';
      const qrisBtnEl = document.getElementById('qrisBtn');
      if (qrisBtnEl) qrisBtnEl.style.display = '';
      const qrisImg = document.querySelector('.qris-image');
      if (qrisImg) qrisImg.style.display = '';
      if (payBtn) payBtn.disabled = false;
      if (paymentInfo) paymentInfo.innerHTML = `Bayar langsung via Dana ke <strong>087727114562</strong> (opsional: masukkan jumlah di aplikasi Dana).`;
      const resultCard = document.querySelector('.result-card');
      if (resultCard) resultCard.classList.remove('hidden');
    });
  }

  if (sellerStepBtn && !sellerStepBtn.dataset.bound) {
    sellerStepBtn.dataset.bound = 'true';
    sellerStepBtn.addEventListener('click', () => {
      const buyerFormEl = document.getElementById('buyerForm');
      if (buyerFormEl) {
        buyerFormEl.classList.add('hidden');
        buyerFormEl.style.display = 'none';
      }
      if (sellerForm) {
        sellerForm.classList.remove('hidden');
        sellerForm.style.display = '';
        playExpandAnimation(sellerForm);
      }
    });
  }

  if (adminLoginBtn && !adminLoginBtn.dataset.bound) {
    adminLoginBtn.dataset.bound = 'true';
    adminLoginBtn.addEventListener('click', () => {
      const email = adminEmail.value.trim().toLowerCase();
      if (email === adminEmailAllowed) {
        currentUserRole = 'seller';
        localStorage.setItem('currentUserRole', 'seller');
        if (sellerForm) sellerForm.classList.add('hidden');
        if (sellerPanel) sellerPanel.classList.remove('hidden');
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appMain) appMain.classList.remove('hidden');
        renderProducts();
        renderSellerProducts();
        if (orderControls) orderControls.classList.add('hidden');
        updateQueuePreviewText();
        updateBuyerNamePreview();
        updateTransactionStats();
        buildSellerCharts();
        const saved = localStorage.getItem(sellerPageStateKey);
        showSellerSection(saved || 'menu');
        if (!window._annualExportInterval) {
          window._annualExportInterval = setInterval(() => {
            if (currentUserRole === 'seller') autoExportAnnualIfNeeded();
          }, 24 * 60 * 60 * 1000);
        }
        if (queueNumber) queueNumber.style.display = 'none';
        const queueBox = queueNumber ? queueNumber.closest('.queue-box') : null;
        if (queueBox) queueBox.style.display = 'none';
        const qrisBtnEl = document.getElementById('qrisBtn');
        if (qrisBtnEl) qrisBtnEl.style.display = 'none';
        const qrisImg = document.querySelector('.qris-image');
        if (qrisImg) qrisImg.style.display = 'none';
        autoExportQrisIfNeeded();
        if (!window._qrisExportInterval) {
          window._qrisExportInterval = setInterval(() => {
            if (currentUserRole === 'seller') autoExportQrisIfNeeded();
          }, 24 * 60 * 60 * 1000);
        }
      } else {
        alert('Email admin salah. Masukkan email penjual yang valid.');
        adminEmail.focus();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindPrimaryPageHandlers);
} else {
  bindPrimaryPageHandlers();
}

categoryTabs.forEach((tab) => {
  tab.addEventListener('click', () => showCategory(tab.dataset.filter));
});

if (refreshQueueBtn) {
  refreshQueueBtn.addEventListener('click', () => {
    if (!confirm('Perbarui Nomor Antrian? Ini akan mereset seluruh daftar antrian dan nomor antrian akan dimulai dari awal. Lanjutkan?')) return;

    // Reset queue: clear all queue names and reset counter
    localStorage.setItem(queueNamesKey, '[]');
    localStorage.setItem(queueCounterKey, '0');
    localStorage.removeItem('lastBuyerName');

    // Reset previews
    updateQueuePreviewText();
    updateBuyerNamePreview();
    renderQueueList();
    if (queueNumber) queueNumber.textContent = getNextQueuePreview();

    // Update the buyer name preview
    if (buyerNamePreviewText) {
      buyerNamePreviewText.innerHTML = `<strong>Nama pembeli:</strong> -`;
    }

    // Show success feedback
    alert('✅ Antrian berhasil direset. Nomor antrian akan dimulai dari A-001 kembali.');
  });
}

function showSellerSection(section) {
  // allow a 'none' state which hides all content sections and shows only nav
  if (section === 'none') {
    if (sellerMenuSection) sellerMenuSection.classList.add('hidden');
    if (sellerQrisSection) sellerQrisSection.classList.add('hidden');
    if (sellerTopSection) sellerTopSection.classList.add('hidden');
    if (sellerAnalyticsSection) sellerAnalyticsSection.classList.add('hidden');
    if (sellerFinanceSection) sellerFinanceSection.classList.add('hidden');
  } else {
    if (sellerMenuSection) sellerMenuSection.classList.toggle('hidden', section !== 'menu');
    if (sellerQrisSection) sellerQrisSection.classList.toggle('hidden', section !== 'qris');
    if (sellerTopSection) sellerTopSection.classList.toggle('hidden', section !== 'top');
    if (sellerAnalyticsSection) sellerAnalyticsSection.classList.toggle('hidden', section !== 'analytics');
    if (sellerFinanceSection) sellerFinanceSection.classList.toggle('hidden', section !== 'finance');
  }
  currentSellerSection = section;
  if (sellerNavMenuBtn) sellerNavMenuBtn.classList.toggle('active-nav', section === 'menu');
  if (sellerNavQrisBtn) sellerNavQrisBtn.classList.toggle('active-nav', section === 'qris');
  if (sellerNavTopBtn) sellerNavTopBtn.classList.toggle('active-nav', section === 'top');
  if (sellerNavFinanceBtn) sellerNavFinanceBtn.classList.toggle('active-nav', section === 'finance');
  localStorage.setItem(sellerPageStateKey, section);
}

function restoreSellerSession() {
  const role = localStorage.getItem('currentUserRole');
  const section = localStorage.getItem(sellerPageStateKey) || 'menu';
  if (role === 'seller') {
    currentUserRole = 'seller';
    if (sellerForm) sellerForm.classList.add('hidden');
    if (sellerPanel) sellerPanel.classList.remove('hidden');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appMain) appMain.classList.remove('hidden');
    renderProducts();
    renderSellerProducts();
    if (orderControls) orderControls.classList.add('hidden');
    if (queueNumber) queueNumber.style.display = 'none';
    const queueBox = queueNumber ? queueNumber.closest('.queue-box') : null;
    if (queueBox) queueBox.style.display = 'none';
    const qrisBtnEl = document.getElementById('qrisBtn');
    if (qrisBtnEl) qrisBtnEl.style.display = 'none';
    const qrisImg = document.querySelector('.qris-image');
    if (qrisImg) qrisImg.style.display = 'none';
    updateQueuePreviewText();
    updateBuyerNamePreview();
    updateTransactionStats();
    buildSellerCharts();
    showSellerSection(section);
    // hide buyer-only summary card when seller is active
    const resultCard = document.querySelector('.result-card');
    if (resultCard) resultCard.classList.add('hidden');
  }
}

function openSellerQueuePage() {
  if (sellerPanel) sellerPanel.classList.add('hidden');
  if (sellerQueuePage) sellerQueuePage.classList.remove('hidden');
  // remove/hide Menu Produk, hero header, and result summary while viewing the queue
  if (sellerMenuSection) {
    try {
      sellerMenuBackup = sellerMenuSection.innerHTML;
      sellerMenuSection.innerHTML = '';
      sellerMenuSection.classList.add('hidden');
    } catch (e) {
      console.warn('Gagal mengosongkan sellerMenuSection:', e);
    }
  }
  const hero = document.querySelector('.hero');
  if (hero) {
    try {
      heroBackup = hero.innerHTML;
      hero.innerHTML = '';
      hero.classList.add('hidden');
    } catch (e) {
      console.warn('Gagal mengosongkan hero header:', e);
    }
  }
  const resultCard = document.querySelector('.result-card');
  if (resultCard) {
    try {
      resultCardBackup = resultCard.innerHTML;
      resultCard.innerHTML = '';
      resultCard.classList.add('hidden');
    } catch (e) {
      console.warn('Gagal mengosongkan result-card:', e);
    }
  }
  // also hide the main Menu Produk/payment card while viewing queue (keep innerHTML)
  const paymentCard = document.querySelector('.payment-card');
  if (paymentCard) paymentCard.classList.add('hidden');
  renderQueueList();
}

if (openQueuePageBtn) {
  openQueuePageBtn.addEventListener('click', openSellerQueuePage);
}

if (closeQueuePageBtn) {
  closeQueuePageBtn.addEventListener('click', () => {
    if (sellerQueuePage) sellerQueuePage.classList.add('hidden');
    if (sellerPanel) sellerPanel.classList.remove('hidden');
    // restore Menu Produk content when returning from queue page
    if (sellerMenuSection) {
      try {
        if (sellerMenuBackup !== null) {
          sellerMenuSection.innerHTML = sellerMenuBackup;
          sellerMenuBackup = null;
        }
        sellerMenuSection.classList.remove('hidden');
      } catch (e) {
        console.warn('Gagal mengembalikan sellerMenuSection:', e);
      }
    }
    // restore hero header
    try {
      const hero = document.querySelector('.hero');
      if (hero && heroBackup !== null) {
        hero.innerHTML = heroBackup;
        heroBackup = null;
        hero.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('Gagal mengembalikan hero header:', e);
    }
    // restore result card
    try {
      const resultCard = document.querySelector('.result-card');
      if (resultCard && resultCardBackup !== null) {
        resultCard.innerHTML = resultCardBackup;
        resultCardBackup = null;
        resultCard.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('Gagal mengembalikan result-card:', e);
    }
    // show payment card again
    try {
      const paymentCard = document.querySelector('.payment-card');
      if (paymentCard) paymentCard.classList.remove('hidden');
    } catch (e) {
      console.warn('Gagal menampilkan payment-card:', e);
    }
    // ensure seller products are rendered after restore
    renderSellerProducts();
  });
}

if (sellerBackBtn) {
  sellerBackBtn.addEventListener('click', () => {
    currentUserRole = null;
    localStorage.removeItem('currentUserRole');
    if (sellerPanel) sellerPanel.classList.add('hidden');
    if (sellerQueuePage) sellerQueuePage.classList.add('hidden');
    if (sellerMenuSection) sellerMenuSection.classList.add('hidden');
    if (sellerQrisSection) sellerQrisSection.classList.add('hidden');
    if (sellerTopSection) sellerTopSection.classList.add('hidden');
    if (sellerAnalyticsSection) sellerAnalyticsSection.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });
}

if (sellerNavMenuBtn) {
  sellerNavMenuBtn.addEventListener('click', () => {
    showSellerSection('menu');
    // ensure products list is up-to-date when entering menu
    renderSellerProducts();
  });
}

if (sellerNavQrisBtn) {
  sellerNavQrisBtn.addEventListener('click', () => {
    showSellerSection('qris');
    // rebuild QRIS chart when opening
    buildSellerCharts();
  });
}

if (sellerNavTopBtn) {
  sellerNavTopBtn.addEventListener('click', () => {
    showSellerSection('top');
    // rebuild top products chart when opening
    buildSellerCharts();
  });
}

// === ANALYTICS TRANSACTIONS NAV ===
const sellerNavAnalyticsBtn = document.getElementById('sellerNavAnalyticsBtn');
if (sellerNavAnalyticsBtn) {
  sellerNavAnalyticsBtn.addEventListener('click', () => {
    showSellerSection('analytics');
    // rebuild analytics chart when opening
    buildSellerCharts();
  });
}

// === FINANCE NAV (Data Keuangan) ===
const sellerNavFinanceBtn = document.getElementById('sellerNavFinanceBtn');
const sellerFinanceSection = document.getElementById('sellerFinanceSection');

if (sellerNavFinanceBtn) {
  sellerNavFinanceBtn.addEventListener('click', () => {
    showSellerSection('finance');
    buildFinanceData();
  });
}

// === HAMBURGER MENU LOGIC ===
const hamburgerToggle = document.getElementById('hamburgerToggle');
const hamburgerDropdown = document.getElementById('hamburgerDropdown');

if (hamburgerToggle && hamburgerDropdown) {
  hamburgerToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburgerDropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburgerToggle.contains(e.target) && !hamburgerDropdown.contains(e.target)) {
      hamburgerDropdown.classList.add('hidden');
    }
  });
}

// Hamburger menu item handlers
function setupHamburgerItems() {
  const map = {
    'hamburgerAddProduct': () => {
      showSellerSection('menu');
      document.querySelector('.seller-form-box')?.scrollIntoView({ behavior: 'smooth' });
      productNameInput?.focus();
    },
    'hamburgerMenuProduk': () => showSellerSection('menu'),
    'hamburgerQueue': () => openSellerQueuePage(),
    'hamburgerBuyers': () => {
      if (sellerBuyersListBtn) sellerBuyersListBtn.click();
    },
    'hamburgerFinance': () => {
      showSellerSection('finance');
      buildFinanceData();
    },
    'hamburgerQris': () => {
      showSellerSection('qris');
      buildSellerCharts();
    },
    'hamburgerTop': () => {
      showSellerSection('top');
      buildSellerCharts();
    },
    'hamburgerAnalytics': () => {
      showSellerSection('analytics');
      buildSellerCharts();
    },
    'hamburgerReceipt': () => {
      if (printReceiptBtn) printReceiptBtn.click();
    },
  };

  Object.entries(map).forEach(([id, handler]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        hamburgerDropdown?.classList.add('hidden');
        handler();
      });
    }
  });
}
setupHamburgerItems();

// === BUYERS LIST (Daftar Nama Pembeli) ===
const sellerBuyersListBtn = document.getElementById('sellerBuyersListBtn');
const sellerBuyersPage = document.getElementById('sellerBuyersPage');
const closeBuyersPageBtn = document.getElementById('closeBuyersPageBtn');

if (sellerBuyersListBtn) {
  sellerBuyersListBtn.addEventListener('click', () => {
    if (sellerPanel) sellerPanel.classList.add('hidden');
    if (sellerBuyersPage) {
      sellerBuyersPage.classList.remove('hidden');
      renderBuyersList();
    }
    // hide other sections
    if (sellerMenuSection) {
      try {
        sellerMenuBackup = sellerMenuSection.innerHTML;
        sellerMenuSection.innerHTML = '';
        sellerMenuSection.classList.add('hidden');
      } catch (e) { }
    }
    const hero = document.querySelector('.hero');
    if (hero) {
      try {
        heroBackup = hero.innerHTML;
        hero.innerHTML = '';
        hero.classList.add('hidden');
      } catch (e) { }
    }
    const resultCard = document.querySelector('.result-card');
    if (resultCard) {
      try {
        resultCardBackup = resultCard.innerHTML;
        resultCard.innerHTML = '';
        resultCard.classList.add('hidden');
      } catch (e) { }
    }
    const paymentCard = document.querySelector('.payment-card');
    if (paymentCard) paymentCard.classList.add('hidden');
  });
}

if (closeBuyersPageBtn) {
  closeBuyersPageBtn.addEventListener('click', () => {
    if (sellerBuyersPage) sellerBuyersPage.classList.add('hidden');
    if (sellerPanel) sellerPanel.classList.remove('hidden');
    if (sellerMenuSection) {
      try {
        if (sellerMenuBackup !== null) {
          sellerMenuSection.innerHTML = sellerMenuBackup;
          sellerMenuBackup = null;
        }
        sellerMenuSection.classList.remove('hidden');
      } catch (e) { }
    }
    try {
      const hero = document.querySelector('.hero');
      if (hero && heroBackup !== null) {
        hero.innerHTML = heroBackup;
        heroBackup = null;
        hero.classList.remove('hidden');
      }
    } catch (e) { }
    try {
      const resultCard = document.querySelector('.result-card');
      if (resultCard && resultCardBackup !== null) {
        resultCard.innerHTML = resultCardBackup;
        resultCardBackup = null;
        resultCard.classList.remove('hidden');
      }
    } catch (e) { }
    try {
      const paymentCard = document.querySelector('.payment-card');
      if (paymentCard) paymentCard.classList.remove('hidden');
    } catch (e) { }
    renderSellerProducts();
  });
}

// === AUTO-LOGIN: Deteksi jika buyerInfo sudah ada di localStorage ===
function autoLoginBuyerIfExists() {
  const buyerInfo = getBuyerInfo();
  const role = localStorage.getItem('currentUserRole');
  if (buyerInfo && role !== 'seller' && role !== 'buyer') {
    // Auto login as buyer without showing form
    const name = buyerInfo.name || '';
    const whatsapp = buyerInfo.whatsapp || '';
    if (name && whatsapp) {
      saveRegisteredBuyer(name, whatsapp);
      currentUserRole = 'buyer';
      localStorage.setItem('currentUserRole', 'buyer');
      if (customerName) customerName.value = name;
      if (sellerPanel) sellerPanel.classList.add('hidden');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appMain) appMain.classList.remove('hidden');
      renderProducts();
      renderSellerProducts();
      if (orderControls) orderControls.classList.remove('hidden');
      if (queueNumber) queueNumber.style.display = '';
      const queueBox = queueNumber ? queueNumber.closest('.queue-box') : null;
      if (queueBox) queueBox.style.display = '';
      const qrisBtnEl = document.getElementById('qrisBtn');
      if (qrisBtnEl) qrisBtnEl.style.display = '';
      const qrisImg = document.querySelector('.qris-image');
      if (qrisImg) qrisImg.style.display = '';
      if (payBtn) payBtn.disabled = false;
      if (paymentInfo) paymentInfo.innerHTML = `Bayar langsung via Dana ke <strong>087727114562</strong>.`;
      const resultCard = document.querySelector('.result-card');
      if (resultCard) resultCard.classList.remove('hidden');
      return true;
    }
  }
  return false;
}

// Auto login buyer if previously logged in
autoLoginBuyerIfExists();

// Setup real-time product listener from Firestore (Single Source of Truth)
setupProductsRealtimeListener();
bootstrapProducts();

// Setup real-time registered buyers listener from Firestore
setupRegisteredBuyersRealtimeListener();

updateBuyerNamePreview();
renderQueueList();
restoreSellerSession();

window.addEventListener('storage', (event) => {
  // when transactions changed in other tab, update seller views
  if (event.key === 'transactions') {
    try {
      buildSellerCharts();
      renderQueueList();
    } catch (e) {
      console.warn('Gagal memperbarui tampilan seller setelah perubahan transaksi:', e);
    }
  }
  if (event.key === productsStorageKey) {
    try {
      const stored = JSON.parse(event.newValue || '[]');
      if (Array.isArray(stored)) {
        products.length = 0;
        stored.forEach((item) => products.push(item));
        renderProducts();
        renderSellerProducts();
      }
    } catch (err) {
      console.warn('Gagal menyinkronkan produk dari storage:', err);
    }
  }
  if (event.key === queueNamesKey) {
    try {
      const stored = JSON.parse(event.newValue || '[]');
      if (Array.isArray(stored)) {
        renderQueueList();
      }
    } catch (err) {
      console.warn('Gagal menyinkronkan queueNames dari storage:', err);
    }
  }
  if (event.key === 'lastBuyerName' || event.key === queueCounterKey) {
    updateBuyerNamePreview();
    updateQueuePreviewText();
    if (queueNumber) queueNumber.textContent = getNextQueuePreview();
  }
});

function bindActionHandlers() {
  if (addProductBtn && !addProductBtn.dataset.bound) {
    addProductBtn.dataset.bound = 'true';
    addProductBtn.addEventListener('click', async () => {
      if (editingProductId !== null) {
        editingProductId = null;
      }
      addProductBtn.disabled = false;
      addProductBtn.removeAttribute('disabled');

      const name = productNameInput ? productNameInput.value.trim() : '';
      const category = productCategoryInput ? productCategoryInput.value : 'makanan';
      const price = Number(productPriceInput ? productPriceInput.value : 0);
      // Stok kosong/0 = unlimited (999999)
      const stockRaw = productStockInput ? productStockInput.value.trim() : '';
      const stock = stockRaw === '' ? 999999 : (Number.isFinite(Number(stockRaw)) && Number(stockRaw) >= 0 ? Number(stockRaw) : 999999);
      const imageUrl = productImageInput ? productImageInput.value.trim() : '';
      const file = productImageFileInput && productImageFileInput.files && productImageFileInput.files[0];
      const variationsRaw = productVariationsInput ? productVariationsInput.value.trim() : '';
      const variations = variationsRaw ? variationsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

      if (!name) {
        alert('Mohon isi nama produk.');
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        alert('Harga produk tidak valid.');
        return;
      }

      const placeholderImage = 'https://via.placeholder.com/180x180.png?text=Produk';
      let image = imageUrl || placeholderImage;
      if (file) {
        try {
          image = await kompresGambar(file);
        } catch (err) {
          console.warn('Gagal kompres gambar:', err);
          try {
            image = await readImageFileAsDataUrl(file);
          } catch (err2) {
            console.warn('Gagal baca file gambar:', err2);
          }
        }
      }

      const product = { name, price, stock, category, image, variations };
      const docId = await addProductToFirestore(product);
      if (docId) {
        product.id = docId;
      }
      resetProductForm();
      alert('✅ Produk berhasil ditambahkan dan tersimpan di database.');
    });
  }

  if (cancelEditBtn && !cancelEditBtn.dataset.bound) {
    cancelEditBtn.dataset.bound = 'true';
    cancelEditBtn.addEventListener('click', () => {
      resetProductForm();
    });
  }

  if (saveProductBtn && !saveProductBtn.dataset.bound) {
    saveProductBtn.dataset.bound = 'true';
    saveProductBtn.addEventListener('click', async () => {
      if (editingProductId === null) {
        alert('Tidak ada produk yang sedang diedit.');
        return;
      }

      const name = productNameInput ? productNameInput.value.trim() : '';
      const category = productCategoryInput ? productCategoryInput.value : 'makanan';
      const price = Number(productPriceInput ? productPriceInput.value : 0);
      // Stok kosong/0 = unlimited (999999)
      const stockRaw = productStockInput ? productStockInput.value.trim() : '';
      const stock = stockRaw === '' ? 999999 : (Number.isFinite(Number(stockRaw)) && Number(stockRaw) >= 0 ? Number(stockRaw) : 999999);
      const imageUrl = productImageInput ? productImageInput.value.trim() : '';
      const file = productImageFileInput && productImageFileInput.files && productImageFileInput.files[0];
      const variationsRaw = productVariationsInput ? productVariationsInput.value.trim() : '';
      const variations = variationsRaw ? variationsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

      if (!name || !price || price <= 0) {
        alert('Mohon isi nama produk dan harga yang valid.');
        return;
      }

      const placeholderImage = 'https://via.placeholder.com/180x180.png?text=Produk';
      const existing = products.find(p => p.id === editingProductId) || {};
      let image = imageUrl || existing.image || placeholderImage;
      if (file) {
        try {
          image = await kompresGambar(file);
        } catch (err) {
          console.warn('Gagal kompres gambar:', err);
          try {
            image = await readImageFileAsDataUrl(file);
          } catch (err2) {
            console.warn('Gagal baca file gambar:', err2);
          }
        }
      }

      const updatedProduct = { name, price, stock, category, image, variations };
      await updateProductInFirestore(editingProductId, updatedProduct);
      resetProductForm();
      alert('✅ Produk berhasil diperbarui.');
    });
  }

  if (orderBtn && !orderBtn.dataset.bound) {
    orderBtn.dataset.bound = 'true';
    orderBtn.addEventListener('click', async () => {
      // Guard: handler ini hanya untuk halaman index yang punya menu checkbox.
      // Di halaman pembeli (buyer.html), tombol order ditangani oleh buyer.js.
      const menuCheckboxes = document.querySelectorAll('.menu-item input[type="checkbox"]');
      if (menuCheckboxes.length === 0) {
        return;
      }
      const selectedItems = Array.from(document.querySelectorAll('.menu-item input[type="checkbox"]:checked'));
      const name = customerName.value.trim();

      if (!name) {
        alert('Silakan isi nama pemesan terlebih dahulu.');
        return;
      }

      if (selectedItems.length === 0) {
        alert('Pilih minimal satu menu.');
        return;
      }

      const items = selectedItems.map((checkbox) => {
        const quantityInput = checkbox.closest('.menu-item').querySelector('.qty-input');
        const quantity = Math.max(1, Number(quantityInput.value) || 1);

        return {
          name: checkbox.value,
          price: Number(checkbox.dataset.price),
          quantity,
          category: checkbox.dataset.category || 'Umum',
          variation: selectedVariations[checkbox.value] || null,
        };
      });

      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      let queue;
      try {
        // Nomor antrian berdasarkan waktu pemesanan (jam:menit:detik)
        if (typeof generateQueueNumberFromTime === 'function') {
          queue = generateQueueNumberFromTime();
        } else {
          queue = await generateQueueNumberFirestore();
        }
      } catch (e) {
        let counter = Number(localStorage.getItem(queueCounterKey) || '0');
        counter += 1;
        localStorage.setItem(queueCounterKey, String(counter));
        queue = `${queuePrefix}${String(counter).padStart(3, '0')}`;
      }

      const buyerInfoData = getBuyerInfo ? getBuyerInfo() : null;
      const buyerName = buyerInfoData?.name || name;
      const buyerWhatsapp = buyerInfoData?.whatsapp || '-';
      const productNames = items.map(item => `${item.quantity}x ${item.name}`).join(', ');

      orderData = {
        name,
        whatsapp: buyerWhatsapp,
        items,
        total,
        queue,
        notes: notes.value.trim(),
        deliveryAddress: deliveryAddressInput ? deliveryAddressInput.value.trim() : '',
      };

      if (db) {
        try {
          const orderPayload = {
            buyerName,
            buyerWhatsapp,
            namaPemesan: name,
            nomorWA: buyerWhatsapp,
            productName: productNames,
            nama: productNames,
            items: items.map(it => it.name).join(', '),
            harga: total,
            qty: items.reduce((sum, it) => sum + it.quantity, 0),
            total,
            status: 'pending',
            paymentStatus: 'belum dibayarkan',
            queueNumber: queue,
            notes: notes.value.trim(),
            deliveryAddress: deliveryAddressInput ? deliveryAddressInput.value.trim() : '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await db.collection('orders').add(orderPayload);
        } catch (err) {
          console.warn('Gagal simpan order ke Firestore:', err);
        }
      }

      const savedTs = saveTransaction(orderData);
      orderData._ts = savedTs;
      if (currentUserRole === 'seller') {
        updateTransactionStats();
        buildSellerCharts();
      }

      try {
        if (bc) bc.postMessage({ type: 'new-order', order: orderData });
        const q = JSON.parse(localStorage.getItem(queueNamesKey) || '[]');
        q.push({ queue, name: buyerName, items: productNames });
        localStorage.setItem(queueNamesKey, JSON.stringify(q));
      } catch (e) {
        console.warn('Gagal meng-broadcast order:', e);
      }

      if (queueNumber) queueNumber.textContent = queue;
      if (statusText) {
        statusText.textContent = 'Pesanan diterima, silakan tunggu.';
        statusText.style.color = '#1d7c3f';
      }
      if (payBtn) payBtn.disabled = false;
      if (paymentInfo) paymentInfo.textContent = 'Pesanan dikirim ke WhatsApp Anda.';
      openWhatsApp(orderData);
    });
  }

  if (payBtn && !payBtn.dataset.bound) {
    payBtn.dataset.bound = 'true';
    payBtn.addEventListener('click', () => {
      const danaNumber = '087727114562';
      const targetUrl = `https://www.dana.id/${danaNumber}`;
      const textAmount = orderData ? formatCurrency(orderData.total) : '';
      const message = orderData ? `Konfirmasi pembayaran Dana ${textAmount} ke ${danaNumber}?` : `Bayar via Dana ke ${danaNumber}?`;

      if (!confirm(message)) {
        return;
      }

      if (orderData) {
        if (paymentInfo) {
          paymentInfo.innerHTML = `Pembayaran ${textAmount} via Dana ke <strong>${danaNumber}</strong> telah dikonfirmasi.<br />Terima kasih. Tunjukkan bukti jika diminta.`;
        }

        try {
          const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
          const idx = tx.findIndex((t) => t.ts === orderData._ts);
          if (idx !== -1) {
            tx[idx].paid = true;
            tx[idx].paidViaQris = false;
            localStorage.setItem('transactions', JSON.stringify(tx));
            if (currentUserRole === 'seller') buildSellerCharts();
          }
        } catch (e) {
          console.error('Gagal menandai transaksi terbayar:', e);
        }
        if (statusText) {
          statusText.textContent = 'Terbayar via Dana';
          statusText.style.color = '#2f7a3e';
        }
      } else if (paymentInfo) {
        paymentInfo.innerHTML = `Bayar langsung via Dana ke <strong>${danaNumber}</strong>.`;
      }

      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    });
  }

  const qrisBtn = document.getElementById('qrisBtn');
  if (qrisBtn && !qrisBtn.dataset.bound) {
    qrisBtn.dataset.bound = 'true';
    qrisBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!orderData || !orderData._ts) {
        window.open(e.currentTarget.href, '_blank', 'noopener,noreferrer');
        return;
      }

      try {
        const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
        const idx = tx.findIndex((t) => t.ts === orderData._ts);
        if (idx !== -1) {
          tx[idx].paid = true;
          tx[idx].paidViaQris = true;
          localStorage.setItem('transactions', JSON.stringify(tx));
        }
      } catch (err) {
        console.error('Gagal menandai pembayaran QRIS:', err);
      }

      window.open(e.currentTarget.href, '_blank', 'noopener,noreferrer');
      if (currentUserRole === 'seller') buildSellerCharts();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindActionHandlers);
} else {
  bindActionHandlers();
}

// Charts
let chartIncomeQris = null;
let chartTopProducts = null;
let chartTransactions = null;
const txnAggSelect = document.getElementById('txnAggSelect');

function buildSellerCharts() {
  // prepare last 12 months labels
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
  // income via QRIS aggregated by month
  const incomeByMonth = Object.fromEntries(months.map((m) => [m, 0]));
  const yearAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
  tx.forEach((t) => {
    if (!t.paidViaQris) return;
    if (t.ts < yearAgo) return;
    const d = new Date(t.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (incomeByMonth[key] !== undefined) {
      incomeByMonth[key] += (t.order && t.order.total) || 0;
    }
  });

  const incomeData = months.map((m) => incomeByMonth[m] || 0);

  const ctxIncome = document.getElementById('chartIncomeQris');
  if (ctxIncome) {
    if (chartIncomeQris) chartIncomeQris.destroy();
    chartIncomeQris = new Chart(ctxIncome.getContext('2d'), {
      type: 'bar',
      data: { labels: months, datasets: [{ label: 'Pemasukan QRIS (IDR)', data: incomeData, backgroundColor: '#4caf50' }] },
      options: { responsive: true, maintainAspectRatio: false },
    });
    // try to export chart as image and show image instead of canvas
    try {
      const imgEl = document.getElementById('chartIncomeQrisImg');
      if (imgEl && chartIncomeQris && typeof chartIncomeQris.toBase64Image === 'function') {
        imgEl.src = chartIncomeQris.toBase64Image();
        imgEl.classList.remove('hidden');
        ctxIncome.classList.add('hidden');
      } else if (imgEl) {
        imgEl.classList.add('hidden');
        ctxIncome.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Gagal membuat image QRIS chart:', err);
    }
  }

  // top-selling products in last 12 months
  const sales = {};
  tx.forEach((t) => {
    if (t.ts < yearAgo) return;
    if (!t.order || !t.order.items) return;
    t.order.items.forEach((it) => {
      sales[it.name] = (sales[it.name] || 0) + (it.quantity || 0);
    });
  });

  const top = Object.entries(sales).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const prodLabels = top.map((r) => r[0]);
  const prodValues = top.map((r) => r[1]);

  const ctxTop = document.getElementById('chartTopProducts');
  if (ctxTop) {
    if (chartTopProducts) chartTopProducts.destroy();
    chartTopProducts = new Chart(ctxTop.getContext('2d'), {
      type: 'pie',
      data: { labels: prodLabels, datasets: [{ data: prodValues, backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4caf50', '#9966ff', '#ff9f40', '#c9cbcf', '#8e5ea2'] }] },
      options: { responsive: true, maintainAspectRatio: false },
    });
    try {
      const imgEl = document.getElementById('chartTopProductsImg');
      if (imgEl && chartTopProducts && typeof chartTopProducts.toBase64Image === 'function') {
        imgEl.src = chartTopProducts.toBase64Image();
        imgEl.classList.remove('hidden');
        ctxTop.classList.add('hidden');
      } else if (imgEl) {
        imgEl.classList.add('hidden');
        ctxTop.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Gagal membuat image TopProducts chart:', err);
    }
  }

  // build transactions chart according to selected aggregation
  const agg = (txnAggSelect && txnAggSelect.value) || 'daily';
  buildTransactionsChart(agg);
}

function getTransactions() {
  return JSON.parse(localStorage.getItem('transactions') || '[]');
}

function buildTransactionsChart(agg) {
  const tx = getTransactions();
  const now = new Date();
  let labels = [];
  let data = [];

  if (agg === 'dayOfWeek') {
    const names = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    labels = names;
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const yearAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
    tx.forEach((t) => {
      if (t.ts < yearAgo) return;
      const d = new Date(t.ts);
      counts[d.getDay()]++;
    });
    data = counts;
  } else if (agg === 'daily') {
    const days = 30;
    labels = [];
    const counts = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const c = tx.filter((t) => t.ts >= start && t.ts < end).length;
      counts.push(c);
    }
    data = counts;
  } else if (agg === 'monthly') {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    labels = months;
    data = months.map((m) => {
      const [y, mo] = m.split('-').map(Number);
      const start = new Date(y, mo - 1, 1).getTime();
      const end = new Date(y, mo, 1).getTime();
      return tx.filter((t) => t.ts >= start && t.ts < end).length;
    });
  } else if (agg === 'yearly') {
    const years = tx.map((t) => new Date(t.ts).getFullYear());
    const min = years.length ? Math.min(...years) : now.getFullYear();
    const max = years.length ? Math.max(...years) : now.getFullYear();
    labels = [];
    data = [];
    for (let y = min; y <= max; y++) {
      labels.push(String(y));
      const start = new Date(y, 0, 1).getTime();
      const end = new Date(y + 1, 0, 1).getTime();
      data.push(tx.filter((t) => t.ts >= start && t.ts < end).length);
    }
  }

  const ctx = document.getElementById('chartTransactions');
  if (!ctx) return;
  if (chartTransactions) chartTransactions.destroy();
  chartTransactions = new Chart(ctx.getContext('2d'), {
    type: agg === 'daily' ? 'line' : 'bar',
    data: { labels, datasets: [{ label: 'Jumlah Transaksi', data, backgroundColor: '#36a2eb' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

if (txnAggSelect) {
  txnAggSelect.addEventListener('change', () => buildTransactionsChart(txnAggSelect.value));
}

// === FUNGSI TANDAI DIBAYAR DARI RINCIAN TRANSAKSI ===
window.tandaiDibayarFinance = function (index) {
  const tx = getTransactions();
  if (!tx[index]) {
    alert('Transaksi tidak ditemukan.');
    return;
  }
  if (tx[index].paid || tx[index].paidViaQris) {
    alert('Transaksi ini sudah dibayar.');
    return;
  }
  if (!confirm('Tandai transaksi ini sebagai sudah dibayar?')) return;
  tx[index].paid = true;
  tx[index].paidViaQris = false;
  localStorage.setItem('transactions', JSON.stringify(tx));
  buildFinanceData();
  buildSellerCharts();
  alert('✅ Transaksi ditandai sudah dibayar.');
};

// === FINANCE DATA (Data Keuangan) ===
let chartFinance = null;

function buildFinanceData() {
  const tx = getTransactions();
  const period = document.getElementById('financePeriod')?.value || 'all';
  const now = new Date();

  let filtered = tx;
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    filtered = tx.filter(t => t.ts >= start && t.ts < end);
  } else if (period === 'week') {
    const dayOfWeek = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    const end = start + 7 * 24 * 60 * 60 * 1000;
    filtered = tx.filter(t => t.ts >= start && t.ts < end);
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    filtered = tx.filter(t => t.ts >= start && t.ts < end);
  } else if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1).getTime();
    const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
    filtered = tx.filter(t => t.ts >= start && t.ts < end);
  }

  // Calculate totals
  let totalIncome = 0;
  let qrisIncome = 0;
  let danaIncome = 0;

  filtered.forEach(t => {
    const amount = (t.order && t.order.total) || 0;
    totalIncome += amount;
    if (t.paidViaQris) qrisIncome += amount;
    if (t.paid && !t.paidViaQris) danaIncome += amount;
  });

  // Update UI
  document.getElementById('financeTotalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('financeQrisIncome').textContent = formatCurrency(qrisIncome);
  document.getElementById('financeDanaIncome').textContent = formatCurrency(danaIncome);
  document.getElementById('financeTotalOrders').textContent = filtered.length;

  // Build transaction list
  const listEl = document.getElementById('financeTransactionList');
  if (!filtered.length) {
    listEl.innerHTML = '<p class="muted">Tidak ada transaksi untuk periode ini.</p>';
  } else {
    listEl.innerHTML = filtered.map((t, i) => {
      const order = t.order || {};
      const items = (order.items || []).map(it => `${it.quantity}x ${it.name}`).join(', ');
      const date = new Date(t.ts).toLocaleString('id-ID');
      const paymentMethod = t.paidViaQris ? 'QRIS' : (t.paid ? 'Dana' : 'Belum Dibayar');
      const isUnpaid = !t.paid && !t.paidViaQris;
      return `<div class="finance-transaction-item">
        <div class="finance-tx-header">
          <strong>#${i + 1}</strong> — ${order.name || '-'} 
          <span class="finance-tx-date">${date}</span>
        </div>
        <div class="finance-tx-detail">
          ${items ? `Produk: ${items}<br>` : ''}
          Total: ${formatCurrency(order.total || 0)} | 
          Pembayaran: ${paymentMethod} | 
          Antrian: ${order.queue || '-'}
          ${isUnpaid ? `<br><button class="secondary-btn" onclick="tandaiDibayarFinance(${i})" style="margin-top:6px;background:#4CAF50;color:white;padding:6px 12px;border:none;border-radius:8px;cursor:pointer;">✅ Tandai Dibayar</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // Build finance chart
  const ctx = document.getElementById('chartFinance');
  if (!ctx) return;
  if (chartFinance) chartFinance.destroy();

  // Group by date for chart
  const dateGroups = {};
  filtered.forEach(t => {
    const d = new Date(t.ts).toISOString().slice(0, 10);
    dateGroups[d] = (dateGroups[d] || 0) + (t.order?.total || 0);
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
        backgroundColor: '#4caf50'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// Finance period change listener
const financePeriod = document.getElementById('financePeriod');
if (financePeriod) {
  financePeriod.addEventListener('change', () => buildFinanceData());
}

// Reset finance data
const resetFinanceBtn = document.getElementById('resetFinanceBtn');
if (resetFinanceBtn) {
  resetFinanceBtn.addEventListener('click', () => {
    if (!confirm('⚠️ PERINGATAN: Ini akan menghapus SEMUA data transaksi, keuangan, dan antrian. Tindakan ini tidak dapat dibatalkan! Lanjutkan?')) return;
    if (!confirm('Ketik "RESET" untuk konfirmasi penghapusan semua data.')) return;
    localStorage.setItem('transactions', '[]');
    localStorage.setItem(queueNamesKey, '[]');
    localStorage.setItem(queueCounterKey, '0');
    buildFinanceData();
    renderQueueList();
    updateQueuePreviewText();
    alert('✅ Semua data keuangan dan transaksi telah direset.');
  });
}

// Export finance data to Excel
const exportFinanceExcelBtn = document.getElementById('exportFinanceExcelBtn');
if (exportFinanceExcelBtn) {
  exportFinanceExcelBtn.addEventListener('click', () => {
    const tx = getTransactions();
    if (!tx.length) {
      alert('Tidak ada data keuangan untuk diekspor.');
      return;
    }
    const rows = tx.map(t => {
      const order = t.order || {};
      const items = (order.items || []).map(it => `${it.quantity}x ${it.name}`).join('; ');
      return {
        tanggal: new Date(t.ts).toLocaleString('id-ID'),
        nama_pemesan: order.name || '',
        nomor_antrian: order.queue || '',
        total: order.total || 0,
        metode_pembayaran: t.paidViaQris ? 'QRIS' : (t.paid ? 'Dana' : 'Belum Dibayar'),
        catatan: order.notes || '',
        alamat: order.deliveryAddress || '',
        items
      };
    });
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Keuangan');
      XLSX.writeFile(wb, `keuangan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Gagal mengekspor keuangan:', e);
      alert('Gagal mengekspor: ' + e.message);
    }
  });
}
function exportTransactionsLastYearToExcel() {
  const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
  const yearAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
  const recent = tx.filter((t) => t.ts >= yearAgo);

  if (!recent.length) {
    alert('Tidak ada struk dalam 1 tahun terakhir.');
    return;
  }

  // map to rows
  const rows = recent.map((t) => {
    const order = t.order || {};
    const items = (order.items || [])
      .map((it) => `${it.quantity}x ${it.name} (${formatCurrency(it.price)})`)
      .join('; ');
    return {
      timestamp: new Date(t.ts).toISOString(),
      nama_pemesan: order.name || '',
      nomor_antrian: order.queue || '',
      total: order.total || 0,
      dibayar: !!t.paid,
      dibayar_via_qris: !!t.paidViaQris,
      catatan: order.notes || '',
      alamat_pengiriman: order.deliveryAddress || '',
      items,
    };
  });

  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Struk');
    const now = new Date();
    const fn = `struk_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, fn);
  } catch (e) {
    console.error('Gagal mengekspor ke Excel:', e);
    alert('Terjadi kesalahan saat mengekspor. Cek konsol untuk detail.');
  }
}

// wire export button
const exportExcelBtn = document.getElementById('exportExcelBtn');
if (exportExcelBtn) {
  exportExcelBtn.addEventListener('click', () => exportTransactionsLastYearToExcel());
}

// Export transactions for a specific year (calendar year)
function exportTransactionsForYear(year) {
  const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const rowsTx = tx.filter((t) => t.ts >= start && t.ts < end);

  // Map rows
  const rows = rowsTx.map((t) => {
    const order = t.order || {};
    const items = (order.items || [])
      .map((it) => `${it.quantity}x ${it.name} (${formatCurrency(it.price)})`)
      .join('; ');
    return {
      timestamp: new Date(t.ts).toISOString(),
      nama_pemesan: order.name || '',
      nomor_antrian: order.queue || '',
      total: order.total || 0,
      dibayar: !!t.paid,
      dibayar_via_qris: !!t.paidViaQris,
      catatan: order.notes || '',
      alamat_pengiriman: order.deliveryAddress || '',
      items,
    };
  });

  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Struk_${year}`);
    const fn = `struk_${year}.xlsx`;
    XLSX.writeFile(wb, fn);
    return rowsTx.length;
  } catch (e) {
    console.error('Gagal mengekspor ke Excel:', e);
    return 0;
  }
}

// Automatic annual export: export previous calendar year once when seller logs in (or on daily check)
function autoExportAnnualIfNeeded() {
  // Only run in January so export happens once per year
  const today = new Date();
  if (today.getMonth() !== 0) return; // month 0 = January

  const prevYear = today.getFullYear() - 1;
  const flagKey = `lastAnnualExport_${prevYear}`;
  if (localStorage.getItem(flagKey)) return; // already exported

  // Only run for seller page
  if (currentUserRole !== 'seller') return;

  const exportedCount = exportTransactionsForYear(prevYear);
  // mark as done regardless of whether rows existed to avoid repeated exports
  localStorage.setItem(flagKey, JSON.stringify({ exportedAt: Date.now(), count: exportedCount }));
}

// Auto-export QRIS usage for last 12 months when data spans >= 1 year (start from 2026)
function autoExportQrisIfNeeded() {
  const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
  const qrisTx = tx.filter((t) => t.paidViaQris && t.ts && t.ts >= new Date(2026, 0, 1).getTime());
  if (!qrisTx.length) return;

  const times = qrisTx.map((t) => t.ts).sort((a, b) => a - b);
  const earliest = times[0];
  const latest = times[times.length - 1];
  const oneYear = 1000 * 60 * 60 * 24 * 365;

  if (latest - earliest >= oneYear) {
    // determine year range covering last 12 months (ending at latest)
    const endDate = new Date(latest);
    const startDate = new Date(endDate.getTime() - oneYear + 1);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const flagKey = `qrisAutoExport_${startYear}_${endYear}`;
    if (localStorage.getItem(flagKey)) return; // already exported

    // build rows with only day and month
    const rows = qrisTx
      .filter((t) => t.ts >= startDate.getTime() && t.ts <= endDate.getTime())
      .map((t) => {
        const d = new Date(t.ts);
        return { day: d.getDate(), month: d.getMonth() + 1 };
      });

    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `QRIS_${startYear}_${endYear}`);
      const fn = `qris_usage_${startYear}_${endYear}.xlsx`;
      XLSX.writeFile(wb, fn);
      localStorage.setItem(flagKey, JSON.stringify({ exportedAt: Date.now(), count: rows.length }));
    } catch (e) {
      console.error('Gagal mengekspor QRIS otomatis:', e);
    }
  }
}

// Receipt (JPG) generation for seller: draw a simple receipt on canvas and download as JPG
const printReceiptBtn = document.getElementById('printReceiptBtn');

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
  ctx.fillText(`Total: ${formatCurrency(totalPrice)}`, padding, y + 6);

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
    a.download = `struk_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.92);
}

if (printReceiptBtn) {
  printReceiptBtn.addEventListener('click', () => {
    // Try to use last saved transaction; fallback to prompting seller
    let last = null;
    try {
      const tx = JSON.parse(localStorage.getItem('transactions') || '[]');
      if (Array.isArray(tx) && tx.length) last = tx[tx.length - 1];
    } catch (e) {
      console.warn('Gagal membaca transaksi terakhir:', e);
    }

    let productText = '';
    let total = 0;

    if (last && last.order) {
      const items = Array.isArray(last.order.items) ? last.order.items : [];
      if (items.length) {
        productText = items.map((it) => `${it.quantity || 1}x ${it.name} — ${formatCurrency((it.price || 0) * (it.quantity || 1))}`).join('\n');
        total = last.order.total || items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
      } else {
        productText = last.order.items ? String(last.order.items) : last.order.name || '-';
        total = last.order.total || 0;
      }
    }

    if (!productText) {
      const nama = prompt('Masukkan nama produk untuk dicetak di struk:');
      const t = prompt('Masukkan total harga (angka):');
      productText = nama || '-';
      total = Number(t) || 0;
    }

    createReceiptImage('Chommell farm kendaldoyong', productText, total);
  });
}
