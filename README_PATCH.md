# Lokalmart Studio AI Assistant Home Patch v1.5.1

Patch ini melanjutkan v1.5.0. Perubahan utamanya: **Asisten Lokalmart muncul sebagai kartu fitur di Home Studio**, sejajar dengan:

- Import XLSX
- Input Barcode
- Asisten Lokalmart

Kartu lama **Modul Berikutnya / Coming Soon** diganti menjadi **Asisten Lokalmart**. Saat diklik, user masuk ke route `/assistant`.

## File utama

- `api/odoo.js` — endpoint utama tetap satu Vercel Function.
- `lib/aiStudio.js` — logic scan struktur, audit data, context export, XLSX export, read-only RPC.
- `public/assistant.html` — UI modul Asisten Lokalmart.
- `vercel.json` — tambah route `/assistant` dan `/ai`.
- `tools/apply-home-launcher.js` — patch otomatis untuk `public/index.html` agar kartu Asisten tampil di Home.
- `patches/public-index-home-launcher.diff` — diff manual kalau ingin edit lewat GitHub web editor.
- `PATCH_index_launcher_snippet.html` — snippet manual jika tidak ingin menjalankan script.

## Cara pasang cepat

Copy semua isi patch ke root repo `lokalmart/studio`, overwrite file yang sama.

Lalu dari root repo jalankan:

```bash
node tools/apply-home-launcher.js
```

Commit perubahan:

```bash
git add api lib public vercel.json docs tools patches README_PATCH.md PATCH_index_launcher_snippet.html
git commit -m "Add Asisten Lokalmart module to Studio home launcher"
git push
```

Setelah Vercel redeploy, buka homepage Studio. Kartu fitur harus menjadi:

```txt
Import XLSX | Input Barcode | Asisten Lokalmart
```

Klik **Asisten Lokalmart** akan membuka:

```txt
/assistant
```

## Edit manual jika lewat GitHub web editor

Di `public/index.html`, cari kartu ini:

```html
<div class="featureCard disabled"><div><div class="featureIcon"></div><h2>Modul Berikutnya</h2><p>Kasir mitra, katalog vendor, kurir, surveyor, dan dashboard koloni akan masuk sebagai fitur superapp berikutnya.</p></div><span class="pill warn">Coming Soon</span></div>
```

Ganti dengan:

```html
<div class="featureCard" data-feature="assistant"><div><div class="featureIcon">🤖</div><h2>Asisten Lokalmart</h2><p>Scan struktur Odoo, audit data, dan export konteks untuk ChatGPT sebelum membuat patch XLSX.</p></div><button class="secondary">Masuk Asisten</button></div>
```

Lalu di `function wire()`, cari handler:

```js
document.querySelectorAll('[data-feature="import"]').forEach(el=>el.onclick=()=>goSlide(1));document.querySelectorAll('[data-feature="barcode"]').forEach(el=>el.onclick=()=>goSlide(5));const dz=$('dropZone');
```

Ganti menjadi:

```js
document.querySelectorAll('[data-feature="import"]').forEach(el=>el.onclick=()=>goSlide(1));document.querySelectorAll('[data-feature="barcode"]').forEach(el=>el.onclick=()=>goSlide(5));document.querySelectorAll('[data-feature="assistant"]').forEach(el=>el.onclick=()=>{location.href='/assistant'});const dz=$('dropZone');
```

## Catatan

Route `/assistant` sudah ditambahkan di `vercel.json`:

```json
{ "source": "/assistant", "destination": "/public/assistant.html" }
```

Jadi bila setelah deploy klik masih 404, cek apakah `vercel.json` sudah ikut ter-commit dan Vercel sudah redeploy.
