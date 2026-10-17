# TODO - Perbaikan Sistem Chommell Farm

## Tujuan
Memperbaiki semua bug agar seluruh fungsi sistem berjalan dengan baik:
- Halaman pembeli (buyer)
- Halaman penjual (seller)
- Pemesanan, antrian, pembayaran
- Data keuangan & grafik
- Checkout & orders

## Permintaan Pengguna #7 (saat ini)
1. Memastikan user yang mendaftar sebagai pembeli langsung masuk ke data di halaman penjual secara real-time.
2. Memastikan cetak struk berfungsi dengan baik dengan nama produk, jumlah produk, dan total harga.

### 1. SINKRONISASI PEMBELI REAL-TIME KE HALAMAN PENJUAL
- [x] buyer.js: tambahkan sinkronisasi ke Firestore (registeredBuyers) pada auto-register, agar pembeli yang langsung ke buyer.html juga tampil real-time di penjual.

### 2. CETAK STRUK PER PESANAN (DENGAN NAMA, JUMLAH, TOTAL)
- [x] seller.js: tambahkan tombol "Cetak Struk" di setiap kartu pesanan.
- [x] seller.js: tambahkan fungsi `printOrderReceipt(id)` yang mengambil pesanan spesifik dari Firestore dan mencetak struk dengan nama produk, jumlah, dan total harga.

### 3. VERIFIKASI
- [x] Jalankan `node --check buyer.js seller.js` untuk memastikan sintaks JS valid.
- [ ] Uji manual alur pembeli → penjual (real-time) dan cetak struk.

---
## Riwayat Permintaan Sebelumnya
- #6: Memperbaiki URL WhatsApp checkout.js, buyer.js, script.js (format wa.me -> api.whatsapp.com).
- #5: Menyembunyikan form tambah produk di halaman penjual (toggle) & sinkronisasi produk antar browser.

