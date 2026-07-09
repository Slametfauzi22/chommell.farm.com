# Chommell Farm Website Deployment

This workspace contains a static website (`index.html`, `styles.css`, `script.js`) for Chommell Farm.

## Publish publicly with GitHub Pages

1. Create a new GitHub repository and push this folder as the repository root.
2. In the repository settings, enable GitHub Pages from the `main` branch and the `/ (root)` folder.
3. Add a file named `CNAME` in the root of the repository containing your custom domain.

Example `CNAME` content:
```
chommell-farm-kendaldoyong.com
```

> Important: the domain `chommell_farm_kendaldoyong.com` contains underscores and is not valid for DNS hostnames. Use a valid domain such as `chommell-farm-kendaldoyong.com` or `chommellfarmkendaldoyong.com`.

4. Configure your DNS provider:
   - Create a CNAME record for `www` pointing to `USERNAME.github.io`.
   - If you want the root domain, use an ALIAS/ANAME record for `@` to `USERNAME.github.io` if your DNS provider supports it.

5. Wait for DNS propagation, then open:
   - `https://chommell-farm-kendaldoyong.com`
   - or `https://www.chommell-farm-kendaldoyong.com`

## Alternative: Deploy with Netlify or Vercel

If you prefer a faster setup, you can deploy to Netlify or Vercel and connect your custom domain there. Both services support static sites and custom domain binding.

## Notes

- I cannot register the domain or configure DNS from here. You must own the domain and set the DNS records.
- Once deployed, the public site URL will depend on your domain and hosting provider.
- The requested domain with underscores (`chommell_farm_kendaldoyong.com`) is invalid, so please use a valid hostname without underscores.

## Memperbarui Situs dengan URL yang Sama

Jika Anda ingin mengubah isi situs tetapi tetap menggunakan link yang sama, ikuti langkah ini:

1. Pastikan situs sudah diterbitkan di GitHub Pages atau layanan serupa.
2. Jika menggunakan domain khusus, buat file `CNAME` di root repositori dengan nama domain yang benar.
3. Setiap kali Anda mengubah file (`index.html`, `styles.css`, `script.js`), lakukan:
   - `git add .`
   - `git commit -m "Perbarui situs"`
   - `git push`
4. GitHub Pages akan mengaktifkan ulang publikasi dari branch yang sama, sehingga link lama tetap tetap.
5. Jika menggunakan domain khusus, pastikan DNS tetap mengarah ke `USERNAME.github.io` atau layanan hosting Anda; tidak perlu mengganti URL untuk perubahan konten selanjutnya.
