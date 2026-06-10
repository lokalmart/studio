#!/usr/bin/env node
/**
 * Lokalmart Studio v1.5.1 - Home Launcher Patch
 *
 * Jalankan dari root repo lokalmart/studio:
 *   node tools/apply-home-launcher.js
 *
 * Script ini hanya mengubah public/index.html agar kartu "Asisten Lokalmart"
 * muncul di Home Studio, sejajar dengan Import XLSX dan Input Barcode.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'public', 'index.html');
if (!fs.existsSync(file)) {
  console.error('Gagal: public/index.html tidak ditemukan. Jalankan dari root repo lokalmart/studio.');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');
const original = html;

const assistantCard = '<div class="featureCard" data-feature="assistant"><div><div class="featureIcon">🤖</div><h2>Asisten Lokalmart</h2><p>Scan struktur Odoo, audit data, dan export konteks untuk ChatGPT sebelum membuat patch XLSX.</p></div><button class="secondary">Masuk Asisten</button></div>';

if (!html.includes('data-feature="assistant"')) {
  const oldCardExact = '<div class="featureCard disabled"><div><div class="featureIcon"></div><h2>Modul Berikutnya</h2><p>Kasir mitra, katalog vendor, kurir, surveyor, dan dashboard koloni akan masuk sebagai fitur superapp berikutnya.</p></div><span class="pill warn">Coming Soon</span></div>';

  if (html.includes(oldCardExact)) {
    html = html.replace(oldCardExact, assistantCard);
  } else {
    // Fallback yang lebih longgar jika teks kartu berubah sedikit.
    const cardPattern = /<div class="featureCard disabled"><div><div class="featureIcon">[\s\S]*?<\/div><h2>Modul Berikutnya<\/h2>[\s\S]*?Coming Soon[\s\S]*?<\/div>/;
    if (cardPattern.test(html)) {
      html = html.replace(cardPattern, assistantCard);
    } else {
      console.error('Gagal: kartu "Modul Berikutnya" tidak ditemukan. Tambahkan snippet manual dari PATCH_index_launcher_snippet.html.');
      process.exit(1);
    }
  }
}

const assistantHandler = 'document.querySelectorAll(\'[data-feature="assistant"]\').forEach(el=>el.onclick=()=>{location.href=\'/assistant\'});';
if (!html.includes('[data-feature="assistant"]')) {
  // Seharusnya tidak masuk karena kartu sudah ditambahkan, tapi dibiarkan sebagai safety.
  console.error('Gagal: kartu assistant belum berhasil ditambahkan.');
  process.exit(1);
}
if (!html.includes("location.href='/assistant'")) {
  const marker = "document.querySelectorAll('[data-feature=\"barcode\"]').forEach(el=>el.onclick=()=>goSlide(5));";
  if (html.includes(marker)) {
    html = html.replace(marker, marker + assistantHandler);
  } else {
    const dzMarker = "const dz=$('dropZone');";
    if (html.includes(dzMarker)) {
      html = html.replace(dzMarker, assistantHandler + dzMarker);
    } else {
      console.error('Gagal: lokasi handler fitur tidak ditemukan. Tambahkan JS handler manual dari README_PATCH.md.');
      process.exit(1);
    }
  }
}

if (html === original) {
  console.log('Tidak ada perubahan: Home launcher sudah memiliki Asisten Lokalmart.');
} else {
  fs.writeFileSync(file, html);
  console.log('Berhasil: public/index.html diperbarui. Asisten Lokalmart kini muncul di Home Studio dan klik menuju /assistant.');
}
