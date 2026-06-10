# Patch Lokalmart Studio Full Export v1.1

Copy file berikut ke repo `lokalmart/studio`:

```text
api/full-export.js          -> /api/full-export.js
public/full-export.html     -> /public/full-export.html
docs/FULL_EXPORT_FEATURE.md -> /docs/FULL_EXPORT_FEATURE.md
```

Lalu update `vercel.json` memakai isi `PATCH_vercel.json`, atau minimal tambahkan:

```json
"api/full-export.js": { "maxDuration": 60, "memory": 1024 }
```

Opsional: tambahkan kartu launcher dari `PATCH_index_launcher_snippet.html` ke halaman home Studio.

Tidak perlu dependency baru. Fitur ini memakai dependency yang sudah ada di repo: `xmlrpc` dan `xlsx`.
