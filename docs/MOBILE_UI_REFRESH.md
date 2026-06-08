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

## v1.3.0 — SuperApp Horizontal Slides

Perubahan desain:

- Seluruh modul utama tampil sebagai satu slide horizontal penuh.
- Perpindahan modul memakai tombol kanan/kiri, chips langkah, gesture swipe kiri/kanan, dan tombol panah keyboard.
- Body aplikasi tidak memakai scroll vertikal.
- Scroll vertikal hanya dipakai di area data: daftar record, tabel preview, log, panduan, dan detail/raw field.
- Pada mobile, detail record tampil sebagai drawer full-screen yang bergeser dari kanan.
- Navigasi bawah lama disembunyikan dan diganti slide controls agar terasa seperti aplikasi admin internal/superapp.

Urutan slide:

1. Koneksi
2. Upload
3. Strategi
4. Editor
5. Preview
6. Progress
7. Foto
8. Panduan
9. Log

Catatan UX:

- Admin tidak perlu scroll halaman panjang.
- Admin fokus pada satu konteks kerja per layar.
- Editor data tetap bisa discroll karena daftar record bisa sangat panjang.
- Tombol `← Kembali ke List` muncul di drawer detail record pada mobile.
