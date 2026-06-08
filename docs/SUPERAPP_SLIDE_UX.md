# Lokalmart Importer Studio v1.4.0 — SuperApp Slide UX

Perubahan UX utama:

1. Halaman pertama adalah launcher fitur:
   - Import XLSX
   - Input Barcode dengan scanner
   - Modul web app lain sebagai slot future fitur

2. Target Odoo dipindah dari flow awal ke Settings.
   - Bisa menyimpan banyak target di browser.
   - Target aktif ditampilkan di header.
   - Form target tidak mengganggu flow import.

3. Setiap layar adalah satu slide horizontal penuh.
   - Tidak ada scroll vertikal di body utama.
   - Scroll hanya aktif di list record, log, guide, direktori, dan detail field.

4. Flow Import XLSX otomatis:
   - Pilih/drop XLSX
   - Browser membaca file untuk editor
   - Preview otomatis dipanggil
   - Slide otomatis bergeser ke Meja Kurasi

5. Editor record:
   - Direktori sheet/model
   - Search dan sort
   - Klik record membuka detail
   - Edit nama, harga, vendor, area, published, deskripsi, dan semua raw field
   - Upload foto utama/galeri menjadi `photo_import_queue` dengan `image_base64`

6. Barcode scanner:
   - Menggunakan BarcodeDetector API bila tersedia
   - Fallback input manual barcode
   - Nanti bisa disambungkan ke pencarian record/produk

Catatan keamanan:
Target Odoo disimpan di localStorage browser. Ini cocok untuk perangkat admin internal, bukan komputer umum.
