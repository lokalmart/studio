# Super Fast Native-like Import

Mode super cepat memakai method Odoo `load(fields, data)` melalui XML-RPC `execute_kw`.

Tujuan:

- Mengurangi ribuan request create/write.
- Mengirim banyak row dalam satu batch.
- Memakai mekanisme import native Odoo untuk validasi field dan external ID.

Mapping kolom:

| Standar Lokalmart | Native Odoo load |
|---|---|
| `_external_id` | `id` |
| `categ_id_external_id` | `categ_id/id` |
| `public_categ_ids_external_ids` | `public_categ_ids/id` |
| `seller_ids_external_ids` | `seller_ids/id` |

Catatan:

- `ir.model.fields` tetap diproses khusus, bukan native load murni, agar konflik field existing tidak menghentikan seluruh workbook.
- Foto tetap diproses sebagai fase khusus, karena gambar harus didownload lalu ditulis ke binary field `image_1920`.
