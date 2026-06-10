# Lokalmart Studio · Full Export Feature

Fitur ini menambahkan halaman `/full-export.html` dan API `/api/full-export` untuk membaca kondisi database Odoo Lokalmart, membuat audit export, dan menyiapkan bahan backup/migrasi.

## Tujuan

1. Mengetahui keadaan database Lokalmart saat ini.
2. Membuat konteks yang bisa dikirim ke ChatGPT untuk analisis struktur project, produk, partner, Knowledge, website, dan schema.
3. Membuat paket backup aplikasi berisi JSON per model dan XLSX audit.
4. Menjadi bahan restore bertahap ketika membuka database Odoo baru.

## File yang ditambahkan

- `api/full-export.js`
- `public/full-export.html`
- `docs/FULL_EXPORT_FEATURE.md`

## Perubahan yang disarankan untuk `vercel.json`

Tambahkan fungsi `api/full-export.js` agar durasi serverless sama dengan API import utama:

```json
{
  "version": 2,
  "functions": {
    "api/odoo.js": { "maxDuration": 60, "memory": 1024 },
    "api/full-export.js": { "maxDuration": 60, "memory": 1024 }
  },
  "rewrites": [
    { "source": "/", "destination": "/public/index.html" },
    { "source": "/full-export", "destination": "/public/full-export.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" }
      ]
    }
  ]
}
```

## Cara akses

Setelah deploy:

- `/full-export.html`
- atau `/full-export` jika rewrite di atas ditambahkan.

## Profil export

1. `project_context`  
   Project, task, stage, milestone, Knowledge, dan external ID. Cocok untuk restrukturisasi 3 project.

2. `migration_safe_core`  
   Master data inti untuk database baru: partner, produk, kategori, project, Knowledge, website, view, external ID.

3. `full_business`  
   Data bisnis lebih luas: partner, produk, project, Knowledge, website, eLearning, sale order, invoice, payment.

4. `technical_autopsy`  
   Struktur teknis: `ir.model`, `ir.model.fields`, `ir.model.access`, `ir.ui.view`, `ir.ui.menu`, action, external ID.

## Isi paket ZIP

- `manifest.json`
- `context_summary.json`
- `schema_fields.json`
- `model_reports.json`
- `errors_warnings.json`
- `json/<model>.json`
- `xlsx/lokalmart_full_export_audit.xlsx`
- `README_RESTORE.md`

## Catatan restore

Ini bukan PostgreSQL dump. Ini adalah application-level export melalui XML-RPC. Untuk database baru, proses yang aman adalah:

1. Install modul yang sama.
2. Buat custom model dan custom field dulu.
3. Import external ID/schema penting.
4. Import master data: partner, kategori, produk, Knowledge, project.
5. Import data transaksi hanya setelah tervalidasi.
6. Buat patch XLSX migration-safe dari hasil export ini.

## UI/UX flow

1. Target Odoo
2. Pilih jenis export
3. Scan database
4. Export bertahap per model dan batch
5. Download ZIP + XLSX audit

Flow ini sengaja bertahap agar admin paham apa yang sedang dibaca dan mengurangi risiko timeout Vercel.
