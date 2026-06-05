# Photo Import Flow

Flow foto otomatis:

1. User mencentang **Import foto setelah produk terbuat**.
2. Importer menjalankan schema, master data, dan `product.template`.
3. Frontend menghitung hasil `product.template`.
4. Jika `created + updated > 0`, frontend memulai fase foto.
5. Backend membaca `photo_import_queue` per batch.
6. Untuk setiap row:
   - cari produk berdasarkan `record_external_id`
   - download `image_url`
   - convert buffer ke base64
   - tulis ke `image_1920`

Status foto:

- `TARGET_CHECKING`
- `TARGET_NOT_FOUND`
- `DOWNLOADING`
- `WRITING`
- `DONE`
- `DOWNLOAD_FAILED`
- `ERROR`
- `SKIPPED`
