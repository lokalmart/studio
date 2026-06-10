# Asisten Lokalmart Studio

Asisten Lokalmart Studio adalah modul read-first untuk membaca keadaan Odoo Lokalmart, melakukan audit awal, lalu menghasilkan bahan konteks untuk ChatGPT.

## Prinsip

```txt
Read → Analyze → Recommend → Generate Patch → Validate → User Import
```

Asisten tidak langsung menulis ke Odoo. Semua perubahan tetap dibuat sebagai patch XLSX dan diimport oleh admin lewat Studio.

## Mode

### 1. Scan Struktur

Membaca:

- `ir.model`
- `ir.model.fields`
- custom model `x_*`
- custom field `x_*`
- risky many2one required + ondelete tidak aman
- ringkasan jumlah record model penting

### 2. Audit Data

Mengecek:

- produk tanpa barcode
- barcode duplikat
- produk tanpa default_code
- produk tanpa kategori teknis
- produk harga nol
- vendor tanpa kontak
- task tanpa project
- task tanpa PIC
- task tanpa deadline
- custom Many2one required yang rawan error

### 3. Export Konteks

Menghasilkan JSON atau XLSX yang bisa diupload ke ChatGPT.

Model yang dibaca awal:

- `product.template`
- `product.category`
- `product.public.category`
- `product.tag`
- `res.partner`
- `project.project`
- `project.task`
- `website.page`
- `ir.model.data`

## Endpoint

POST `/api/odoo`

```json
{
  "action": "ai_data_audit",
  "target": {
    "url": "https://example.odoo.com",
    "db": "example",
    "username": "admin@example.com",
    "password": "api-key"
  },
  "payload": {
    "limit": 1000
  }
}
```

## Output ChatGPT yang diharapkan

Setelah upload export ke ChatGPT, minta:

- diagnosis struktur
- daftar prioritas pembersihan
- patch XLSX migration-safe
- urutan import aman
- pemisahan field/ACL/data/QWeb/foto
