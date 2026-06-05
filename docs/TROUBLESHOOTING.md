# Troubleshooting

## Foto tidak berjalan

Penyebab umum:

- `product.template` belum berhasil created/updated.
- Sheet `photo_import_queue` tidak ada.
- `record_external_id` berisi external ID antrean foto, bukan external ID produk.
- URL foto tidak publik.

## Error Changing the type of a field is not yet supported

Artinya field custom sudah ada di Odoo dengan tipe berbeda. Solusi:

- Lewati field tersebut.
- Buat nama field baru, misalnya `x_lm_delivery_label`.
- Atau hapus field lama manual di Odoo Studio jika aman.

## External ID relasi tidak ditemukan

Pastikan record induk sudah diimport lebih dulu dan urutan `00_import_order` benar.
