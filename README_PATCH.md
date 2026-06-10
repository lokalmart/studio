# Lokalmart Studio AI Assistant Patch v1.5.0

Patch ini mengembangkan `https://github.com/lokalmart/studio` menjadi Studio + Asisten Lokalmart.

## Tujuan

Menambahkan fitur read-first untuk membantu ChatGPT memahami kondisi Odoo Lokalmart tanpa langsung menulis/mengacak database.

Alur kerja:

1. Target Odoo tetap disimpan di browser lewat `lm_targets_v1`.
2. Buka `/assistant`.
3. Jalankan Scan Struktur / Audit Data / Export Konteks.
4. Download JSON/XLSX.
5. Upload file export ke ChatGPT.
6. ChatGPT membuat rekomendasi dan patch XLSX yang aman.
7. Import patch melalui Studio seperti biasa.

## File yang ditambahkan/diubah

- `api/odoo.js` — replacement endpoint utama, tetap satu Vercel Function.
- `lib/aiStudio.js` — logic scan, audit, context export, XLSX export, read-only RPC.
- `public/assistant.html` — UI mobile-first untuk Asisten Lokalmart.
- `vercel.json` — tambah route `/assistant` dan `/ai`.
- `PATCH_index_launcher_snippet.html` — kartu opsional untuk ditambahkan ke launcher Home Studio.

## Action API baru

Semua tetap POST ke `/api/odoo`:

- `ai_health`
- `ai_schema_scan`
- `ai_context_export`
- `ai_data_audit`
- `ai_export_xlsx`
- `ai_read_rpc`

`ai_read_rpc` hanya mengizinkan method baca:

- `search_read`
- `fields_get`
- `search_count`
- `read`
- `search`
- `name_search`

Tidak ada `create`, `write`, `unlink`, atau import otomatis dari AI.

## Cara pasang

Copy isi folder patch ke root repo `lokalmart/studio`, overwrite file yang sama.

Struktur setelah dipasang:

```txt
api/odoo.js
lib/aiStudio.js
public/assistant.html
vercel.json
```

Lalu jalankan:

```bash
npm install
npm run lint
vercel --prod
```

Atau jika lewat GitHub web editor:

1. buka repo `lokalmart/studio`
2. upload/timpa file sesuai path
3. commit ke main
4. Vercel auto redeploy
5. buka `https://NAMA-PROJECT.vercel.app/assistant`

## Catatan keamanan

Patch ini masih mengikuti model Studio lama: target Odoo disimpan di browser admin internal.
Gunakan hanya di perangkat pribadi/admin, bukan komputer umum.
