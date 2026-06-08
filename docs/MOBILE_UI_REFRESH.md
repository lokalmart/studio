# Lokalmart Importer Studio v1.2.0 - Mobile UI Refresh

Tujuan versi ini adalah membuat Importer Studio terasa seperti aplikasi admin mobile, bukan dashboard desktop yang dipaksa mengecil.

## Prinsip UX

1. Satu layar harus selalu menjawab: saya sedang di tahap apa?
2. Aksi utama harus dekat dengan jempol pengguna.
3. Record harus bisa dicari, diklik, diedit, dan diberi foto tanpa membuka Excel.
4. Detail record harus muncul jelas setelah baris diklik.
5. Progress import dan foto harus bisa dicek cepat dari bottom navigation.

## Perubahan UI

- Mobile top bar menampilkan brand dan fase aktif.
- Bottom navigation: Editor, Preview, Progres, Foto, Log.
- Floating action buttons: gunakan hasil editor dan mulai import.
- Record table berubah menjadi card list pada layar kecil.
- Directory sheet berubah menjadi horizontal scrollable chips.
- Input, select, dan button minimal 48px tinggi agar nyaman disentuh.
- Quick tiles: jumlah record, dirty record, foto lokal, dan progress.

## Flow mobile yang disarankan

1. Isi koneksi Odoo.
2. Upload XLSX.
3. Masuk tab Editor untuk kalibrasi record.
4. Klik record, cek detail, ubah nama/harga/deskripsi.
5. Upload foto utama atau galeri.
6. Gunakan hasil editor untuk import.
7. Cek Preview dan Preflight.
8. Jalankan import.
9. Cek Progres, Foto, dan Log dari bottom navigation.

## Batasan

- UI ini tetap ditujukan untuk admin internal, bukan kasir mitra publik.
- Untuk kasir mitra, gunakan API gateway khusus yang lebih sempit dan aman.
