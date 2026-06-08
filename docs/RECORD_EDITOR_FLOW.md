# Lokalmart Importer Studio v1.1.0 — Record Editor Flow

## Tujuan

Record Editor dipakai untuk mengkalibrasi data sebelum import ke Odoo. Admin bisa membuka file XLSX, melihat record per sheet/model, mencari produk, mengedit nama/harga/deskripsi/vendor/area, mengupload foto utama, menambah foto galeri eCommerce, lalu membangun XLSX hasil edit untuk import.

## Alur kerja

1. Upload XLSX.
2. App membaca workbook di browser dan membuat direktori sheet/model.
3. Admin memilih sheet, misalnya `product.template`.
4. Admin mencari/sortir record.
5. Admin klik satu record untuk membuka detail.
6. Admin mengedit kolom penting atau kolom mentah.
7. Admin upload foto:
   - Foto utama produk: ditulis ke `photo_import_queue` target `product.template`.
   - Foto galeri: app membuat record `product.image`, lalu membuat `photo_import_queue` target `product.image`.
8. Klik `Gunakan Hasil Editor untuk Import`.
9. App membuat XLSX baru di browser, lalu memakai file hasil editor untuk Preview/Preflight/Import.
10. Import berjalan seperti biasa.

## Upload Foto Lokal

Foto upload lokal tidak membutuhkan URL publik. App menyimpan gambar sebagai base64 di sheet `photo_import_queue` dengan kolom:

- `image_base64`
- `image_mime`
- `record_external_id`
- `model`
- `image_field`

Backend `photoImporter.js` v1.1.0 sudah mendukung `image_base64`. Jika `image_base64` ada, backend tidak melakukan download URL, tetapi langsung menulis base64 ke field `image_1920`.

## Format photo_import_queue lokal

```text
__action
_external_id
_model
model
record_external_id
image_base64
image_mime
image_field
image_alt
image_note
priority
source_filename
```

Contoh:

```text
__action: upsert
_external_id: lokalmart.photo_manual_product_001_abc123
_model: photo_import_queue
model: product.template
record_external_id: lokalmart.product_001_nasi_jamblang_paket_ayam
image_field: image_1920
image_base64: /9j/4AAQSkZJRgABAQ...
image_mime: image/jpeg
```

## Kalibrasi Massal

Admin bisa memilih beberapa record lalu:

- menaikkan/menurunkan harga jual persentase;
- mengisi vendor label;
- mengisi area;
- mengubah `website_published` ke draft/published.

## Catatan Risiko

- Foto base64 membuat ukuran XLSX lebih besar. Gunakan foto yang sudah dikompres, idealnya di bawah 1 MB per foto.
- Untuk banyak foto, import dengan batch foto kecil, misalnya 3–5.
- Jika memakai mode Super Cepat, data field boolean tetap aman karena app mengubah boolean ke bentuk teks native Odoo.
