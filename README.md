# Lokalmart Importer Studio v1.4.0

Mobile-first internal admin superapp untuk import XLSX Odoo/Lokalmart.

## Fitur utama

- Launcher fitur di halaman pembuka:
  - Import XLSX
  - Input Barcode / Barcode Scanner
  - Slot fitur web app berikutnya
- Horizontal slide navigation seperti superapp.
- Target Odoo pindah ke Settings dan tersimpan di browser.
- Bisa menyimpan banyak target Odoo.
- Upload XLSX, preview, preflight, import data, import foto.
- Record editor sebelum import:
  - Edit nama, harga, vendor, area, published, deskripsi, dan raw fields.
  - Upload foto utama dan galeri per produk.
  - Foto lokal dikonversi ke `photo_import_queue` memakai `image_base64`.
- Mode import:
  - Super Cepat / native-like `load()`.
  - Aman / row-by-row.
- Import foto saja / retry foto.

## Catatan penting

Target Odoo disimpan di `localStorage` browser. Gunakan hanya pada perangkat admin internal Lokalmart, bukan komputer umum.

## Deploy

```bash
npm install
vercel --prod
```

## Dokumentasi tambahan

- `docs/CHATGPT_XLSX_GUIDE.txt`
- `docs/RECORD_EDITOR_FLOW.md`
- `docs/SUPERAPP_SLIDE_UX.md`
- `docs/TROUBLESHOOTING.md`
