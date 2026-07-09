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
const productPriceInput = document.getElementById('productPrice');
const productImageInput = document.getElementById('productImage');
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
let editingProductIndex = null;
const queueCounterKey = 'queueCounter';
const productsStorageKey = 'sellerProducts';
const queueNamesKey = 'queueNames';
const queuePrefix = 'A-';
const selectedVariations = {};

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
  if (buyerNamePreviewText) {
    buyerNamePreviewText.innerHTML = `<strong>Nama pembeli:</strong> ${buyerName}`;
  }
}

function resetProductForm() {
  productNameInput.value = '';
  productPriceInput.value = '';
  productImageInput.value = '';
  if (productImageFileInput) productImageFileInput.value = '';
  productCategoryInput.value = 'makanan';
  productVariationsInput.value = '';
  editingProductIndex = null;
  addProductBtn.textContent = 'Tambah Produk';
  addProductBtn.disabled = false;
  if (saveProductBtn) saveProductBtn.classList.add('hidden');
}

function saveProductsToStorage() {
  localStorage.setItem(productsStorageKey, JSON.stringify(products));
}

function loadProductsFromStorage(defaultProducts) {
  try {
    const stored = localStorage.getItem(productsStorageKey);
    if (!stored) return defaultProducts;
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (err) {
    console.warn('Gagal memuat data produk dari storage:', err);
  }
  return defaultProducts;
}

const products = loadProductsFromStorage([
  {
    name: 'Roti Bakar Aneka Rasa',
    price: 2000,
    category: 'makanan',
    image: 'https://via.placeholder.com/180x180.png?text=Roti+Bakar',
  },
  {
    name: 'Mie Ayam',
    price: 15000,
    category: 'makanan',
    image: 'https://via.placeholder.com/180x180.png?text=Mie+Ayam',
  },
  {
    name: 'Ikan Guppy',
    price: 25000,
    category: 'ikan',
    image: 'https://via.placeholder.com/180x180.png?text=Guppy',
  },
  {
    name: 'Paket Akuarium Mini',
    price: 120000,
    category: 'ikan',
    image: 'https://via.placeholder.com/180x180.png?text=Akuarium',
  },
  {
    name: 'Ayam Kampung',
    price: 35000,
    category: 'unggas',
    image: 'https://via.placeholder.com/180x180.png?text=Ayam+Kampung',
  },
  {
    name: 'Aksesoris Kandang',
    price: 40000,
    category: 'unggas',
    image: 'https://via.placeholder.com/180x180.png?text=Kandang',
  },
  {
    name: 'Kalung Cantik',
    price: 45000,
    category: 'pribadi',
    image: 'https://via.placeholder.com/180x180.png?text=Kalung',
  },
  {
    name: 'Gelang Lucu',
    price: 25000,
    category: 'pribadi',
    image: 'https://via.placeholder.com/180x180.png?text=Gelang',
  },
  {
    name: 'Lampu Tidur',
    price: 75000,
    category: 'kamar',
    image: 'https://via.placeholder.com/180x180.png?text=Lampu+Tidur',
  },
  {
    name: 'Bantal Lucu',
    price: 60000,
    category: 'kamar',
    image: 'https://via.placeholder.com/180x180.png?text=Bantal+Lucu',
  },
]);

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function renderProducts() {
  categoryBlocks.forEach((block) => {
    const categoryKey = block.dataset.categoryGroup;
    const list = block.querySelector('.menu-list');
    const items = products.filter((product) => product.category === categoryKey);

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
      notesEl.value = 'Mohon chat live untuk konfirmasi varian/ketentuan karena ada item dengan jumlah > 1.';
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
  sellerProductsList.innerHTML = products
    .map(
      (p, i) => `
      <div class="seller-product">
        <div class="product-image"><img src="${p.image}" alt="${p.name}"/></div>
        <div class="seller-product-info">
          <div class="seller-product-name">${p.name}</div>
          <div class="seller-product-cat">${p.category}</div>
          <div class="seller-product-price">${formatCurrency(p.price)}</div>
        </div>
        <div class="seller-product-actions">
          <button class="edit-btn" data-index="${i}">Edit</button>
          <button class="delete-btn" data-index="${i}">Hapus</button>
        </div>
      </div>
    `
    )
    .join('');

  // wire up actions
  sellerProductsList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.dataset.index);
      if (confirm('Hapus produk ini?')) {
        products.splice(idx, 1);
        saveProductsToStorage();
        if (editingProductIndex === idx) {
          resetProductForm();
        } else if (editingProductIndex !== null && editingProductIndex > idx) {
          editingProductIndex -= 1;
        }
        renderProducts();
        renderSellerProducts();
      }
    });
  });

  sellerProductsList.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.dataset.index);
      const p = products[idx];
      productNameInput.value = p.name;
      productCategoryInput.value = p.category;
      productPriceInput.value = p.price;
      productImageInput.value = p.image && /^https?:\/\//.test(p.image) ? p.image : '';
      if (productImageFileInput) productImageFileInput.value = '';
      productVariationsInput.value = p.variations ? p.variations.join(', ') : '';
      editingProductIndex = idx;
      addProductBtn.disabled = true;
      if (saveProductBtn) saveProductBtn.classList.remove('hidden');
      productNameInput.focus();
    });
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
  summaryBox.innerHTML = `<p><strong>Transaksi (30 hari):</strong> ${count}</p>`;
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
  categoryBlocks.forEach((block) => {
    const matches = filter === 'all' || block.dataset.categoryGroup === filter;
    block.classList.toggle('is-hidden', !matches);
  });

  categoryTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
}

function openWhatsApp(order) {
  const lines = [
    'Halo, saya ingin memesan:',
    '',
    `Nama: ${order.name}`,
    ...order.items.map((item) => {
      const variationText = item.variation ? ` (${item.variation})` : '';
      return `- ${item.quantity}x ${item.name}${variationText}: ${formatCurrency(item.price * item.quantity)}`;
    }),
    `Total: ${formatCurrency(order.total)}`,
    `Nomor antrean: ${order.queue}`,
  ];

  if (order.notes) {
    lines.push(`Catatan: ${order.notes}`);
  }

  const message = encodeURIComponent(lines.join('\n'));
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
  const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  if (!newWindow) {
    window.location.href = whatsappUrl;
  }
}

buyerLoginBtn.addEventListener('click', () => {
  currentUserRole = 'buyer';
  localStorage.setItem('currentUserRole', 'buyer');
  sellerPanel.classList.add('hidden');
  loginScreen.classList.add('hidden');
  appMain.classList.remove('hidden');
  renderProducts();
  renderSellerProducts();
  // ensure ordering controls visible for buyer
  if (orderControls) orderControls.classList.remove('hidden');
  // show queue and QRIS UI for buyer
  if (queueNumber) queueNumber.style.display = '';
  const queueBox = queueNumber ? queueNumber.closest('.queue-box') : null;
  if (queueBox) queueBox.style.display = '';
  const qrisBtnEl = document.getElementById('qrisBtn');
  if (qrisBtnEl) qrisBtnEl.style.display = '';
  const qrisImg = document.querySelector('.qris-image');
  if (qrisImg) qrisImg.style.display = '';
  // enable Dana pay button for buyers and show payment info
  if (payBtn) payBtn.disabled = false;
  if (paymentInfo) paymentInfo.innerHTML = `Bayar langsung via Dana ke <strong>087727114562</strong> (opsional: masukkan jumlah di aplikasi Dana).`;
  // ensure buyer summary visible again
  const resultCard = document.querySelector('.result-card');
  if (resultCard) resultCard.classList.remove('hidden');
});

sellerStepBtn.addEventListener('click', () => {
  sellerForm.classList.remove('hidden');
});

adminLoginBtn.addEventListener('click', () => {
  const email = adminEmail.value.trim().toLowerCase();
  if (email === adminEmailAllowed) {
    currentUserRole = 'seller';
    localStorage.setItem('currentUserRole', 'seller');
    sellerForm.classList.add('hidden');
    sellerPanel.classList.remove('hidden');
    loginScreen.classList.add('hidden');
    appMain.classList.remove('hidden');
    renderProducts();
    renderSellerProducts();
    // hide ordering controls for seller
    if (orderControls) orderControls.classList.add('hidden');
    updateQueuePreviewText();
    updateBuyerNamePreview();
    // update stats and charts for seller
    updateTransactionStats();
    buildSellerCharts();
    // if seller previously selected a section, restore it; otherwise show only nav buttons
    const saved = localStorage.getItem(sellerPageStateKey);
    // auto-open seller Menu Produk by default (or restore last saved)
    showSellerSection(saved || 'menu');
    // schedule daily check while seller is active; export will run once per year (in January)
    if (!window._annualExportInterval) {
      window._annualExportInterval = setInterval(() => {
        if (currentUserRole === 'seller') autoExportAnnualIfNeeded();
      }, 24 * 60 * 60 * 1000);
    }
    // hide queue box and QRIS UI on seller page
    if (queueNumber) queueNumber.style.display = 'none';
    const queueBox = queueNumber ? queueNumber.closest('.queue-box') : null;
    if (queueBox) queueBox.style.display = 'none';
    const qrisBtnEl = document.getElementById('qrisBtn');
    if (qrisBtnEl) qrisBtnEl.style.display = 'none';
    const qrisImg = document.querySelector('.qris-image');
    if (qrisImg) qrisImg.style.display = 'none';
    // check and auto-export QRIS-year if needed
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

categoryTabs.forEach((tab) => {
  tab.addEventListener('click', () => showCategory(tab.dataset.filter));
});

if (refreshQueueBtn) {
  refreshQueueBtn.addEventListener('click', () => {
    if (!confirm('Reset nomor antrean ke 001?')) return;
    // reset counter in localStorage so all tabs see the change
    localStorage.setItem(queueCounterKey, '0');
    // also clear last buyer name and queue names list
    localStorage.setItem('lastBuyerName', '');
    localStorage.setItem(queueNamesKey, JSON.stringify([]));
    // update preview text in this tab
    updateQueuePreviewText();
    updateBuyerNamePreview();
    renderQueueList();
    if (queueNumber) queueNumber.textContent = getNextQueuePreview();
  });
}

function showSellerSection(section) {
  // allow a 'none' state which hides all content sections and shows only nav
  if (section === 'none') {
    if (sellerMenuSection) sellerMenuSection.classList.add('hidden');
    if (sellerQrisSection) sellerQrisSection.classList.add('hidden');
    if (sellerTopSection) sellerTopSection.classList.add('hidden');
    if (sellerAnalyticsSection) sellerAnalyticsSection.classList.add('hidden');
  } else {
    if (sellerMenuSection) sellerMenuSection.classList.toggle('hidden', section !== 'menu');
    if (sellerQrisSection) sellerQrisSection.classList.toggle('hidden', section !== 'qris');
    if (sellerTopSection) sellerTopSection.classList.toggle('hidden', section !== 'top');
    if (sellerAnalyticsSection) sellerAnalyticsSection.classList.toggle('hidden', section !== 'analytics');
  }
  currentSellerSection = section;
  if (sellerNavMenuBtn) sellerNavMenuBtn.classList.toggle('active-nav', section === 'menu');
  if (sellerNavQrisBtn) sellerNavQrisBtn.classList.toggle('active-nav', section === 'qris');
  if (sellerNavTopBtn) sellerNavTopBtn.classList.toggle('active-nav', section === 'top');
  localStorage.setItem(sellerPageStateKey, section);
}

function restoreSellerSession() {
  const role = localStorage.getItem('currentUserRole');
  const section = localStorage.getItem(sellerPageStateKey) || 'menu';
  if (role === 'seller') {
    currentUserRole = 'seller';
    sellerForm.classList.add('hidden');
    sellerPanel.classList.remove('hidden');
    loginScreen.classList.add('hidden');
    appMain.classList.remove('hidden');
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

renderProducts();
renderSellerProducts();
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

addProductBtn.addEventListener('click', async () => {
  if (editingProductIndex !== null) {
    alert('Sedang mengedit produk. Klik tombol Simpan Perubahan untuk menyimpan perubahan.');
    return;
  }

  const name = productNameInput.value.trim();
  const category = productCategoryInput.value;
  const price = Number(productPriceInput.value);
  const imageUrl = productImageInput.value.trim();
  const file = productImageFileInput && productImageFileInput.files && productImageFileInput.files[0];
  const variationsRaw = productVariationsInput ? productVariationsInput.value.trim() : '';
  const variations = variationsRaw ? variationsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

  if (!name || !price || price <= 0) {
    alert('Mohon isi nama produk dan harga yang valid.');
    return;
  }

  const placeholderImage = 'https://via.placeholder.com/180x180.png?text=Produk';
  const image = imageUrl || placeholderImage;
  const targetIndex = products.length;

  products.push({ name, price, category, image, variations });

  if (file) {
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      products[targetIndex].image = dataUrl;
    } catch (err) {
      console.error('Gagal membaca gambar:', err);
    }
  }

  saveProductsToStorage();
  resetProductForm();
  renderProducts();
  renderSellerProducts();
  alert('Produk berhasil ditambahkan.');
});

if (saveProductBtn) {
  saveProductBtn.addEventListener('click', async () => {
    if (editingProductIndex === null) return;

    const name = productNameInput.value.trim();
    const category = productCategoryInput.value;
    const price = Number(productPriceInput.value);
    const imageUrl = productImageInput.value.trim();
    const file = productImageFileInput && productImageFileInput.files && productImageFileInput.files[0];
    const variationsRaw = productVariationsInput ? productVariationsInput.value.trim() : '';
    const variations = variationsRaw ? variationsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

    if (!name || !price || price <= 0) {
      alert('Mohon isi nama produk dan harga yang valid.');
      return;
    }

    const placeholderImage = 'https://via.placeholder.com/180x180.png?text=Produk';
    const existing = products[editingProductIndex] || {};
    const image = imageUrl || existing.image || placeholderImage;

    products[editingProductIndex] = {
      ...existing,
      name,
      price,
      category,
      image,
      variations,
    };

    if (file) {
      try {
        const dataUrl = await readImageFileAsDataUrl(file);
        products[editingProductIndex].image = dataUrl;
      } catch (err) {
        console.error('Gagal membaca gambar:', err);
      }
    }

    saveProductsToStorage();
    resetProductForm();
    renderProducts();
    renderSellerProducts();
    alert('Produk berhasil diperbarui.');
  });
}

orderBtn.addEventListener('click', () => {
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
  // sequential queue number (001, 002, ... no upper bound)
  let counter = Number(localStorage.getItem(queueCounterKey) || '0');
  counter += 1;
  localStorage.setItem(queueCounterKey, String(counter));
  const queue = `${queuePrefix}${String(counter).padStart(3, '0')}`;

  orderData = {
    name,
    items,
    total,
    queue,
    notes: notes.value.trim(),
    deliveryAddress: deliveryAddressInput ? deliveryAddressInput.value.trim() : '',
  };
  // simpan transaksi dan catat timestamp pada orderData
  const savedTs = saveTransaction(orderData);
  orderData._ts = savedTs;
  // only update seller-facing stats/charts
  if (currentUserRole === 'seller') {
    updateTransactionStats();
    buildSellerCharts();
  }

  // notify other tabs (seller) about new order for real-time refresh
  try {
    if (bc) bc.postMessage({ type: 'new-order', order: orderData });
    // also update local queueNames storage so storage event fires across tabs
    const q = JSON.parse(localStorage.getItem(queueNamesKey) || '[]');
    localStorage.setItem(queueNamesKey, JSON.stringify(q));
  } catch (e) {
    console.warn('Gagal meng-broadcast order:', e);
  }

  queueNumber.textContent = queue;
  // if buyer on handset, request fullscreen to show the queue prominently
  try {
    const el = document.documentElement;
    if (el.requestFullscreen && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      el.requestFullscreen().catch(() => {});
    }
  } catch (e) {
    // ignore fullscreen errors
  }
  statusText.textContent = 'Pesanan diterima, silakan tunggu.';
  statusText.style.color = '#1d7c3f';
  payBtn.disabled = false;
  paymentInfo.textContent = 'Pesanan dikirim ke WhatsApp Anda.';
  openWhatsApp(orderData);
});

payBtn.addEventListener('click', () => {
  const danaNumber = '087727114562';
  const targetUrl = `https://www.dana.id/${danaNumber}`;
  const textAmount = orderData ? formatCurrency(orderData.total) : '';
  const message = orderData
    ? `Konfirmasi pembayaran Dana ${textAmount} ke ${danaNumber}?`
    : `Bayar via Dana ke ${danaNumber}?`;

  if (!confirm(message)) {
    return;
  }

  if (orderData) {
    paymentInfo.innerHTML = `
      Pembayaran ${textAmount} via Dana ke <strong>${danaNumber}</strong> telah dikonfirmasi.<br />
      Terima kasih. Tunjukkan bukti jika diminta.
    `;

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
    statusText.textContent = 'Terbayar via Dana';
    statusText.style.color = '#2f7a3e';
  } else {
    paymentInfo.innerHTML = `Bayar langsung via Dana ke <strong>${danaNumber}</strong>.`;
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
});

// mark QRIS payment when QRIS button is clicked
const qrisBtn = document.getElementById('qrisBtn');
if (qrisBtn) {
  qrisBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!orderData || !orderData._ts) {
      // open link anyway
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

    // open the qris link
    window.open(e.currentTarget.href, '_blank', 'noopener,noreferrer');
    if (currentUserRole === 'seller') buildSellerCharts();
  });
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
      data: { labels: prodLabels, datasets: [{ data: prodValues, backgroundColor: [ '#ff6384','#36a2eb','#ffce56','#4caf50','#9966ff','#ff9f40','#c9cbcf','#8e5ea2' ] }] },
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
    const names = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    labels = names;
    const counts = [0,0,0,0,0,0,0];
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
      const key = d.toISOString().slice(0,10);
      labels.push(key);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const end = start + 24*60*60*1000;
      const c = tx.filter((t) => t.ts >= start && t.ts < end).length;
      counts.push(c);
    }
    data = counts;
  } else if (agg === 'monthly') {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    labels = months;
    data = months.map((m) => {
      const [y, mo] = m.split('-').map(Number);
      const start = new Date(y, mo-1, 1).getTime();
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
      const start = new Date(y,0,1).getTime();
      const end = new Date(y+1,0,1).getTime();
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

// Export transactions from last 12 months to Excel (.xlsx)
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
    const fn = `struk_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.xlsx`;
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
