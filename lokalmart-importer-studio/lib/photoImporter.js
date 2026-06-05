const { simplifyError } = require('./errors');

function photoItemsFromRows(rows) {
  const out = [];
  for (const row of rows) {
    const imageUrl = row.image_url || row.photo_url || row.image_1920_url || row.product_image_url || row.main_image_url;
    const recordExternalId = row.record_external_id || row.product_tmpl_id_external_id || row.target_external_id || row._target_external_id;
    if (!imageUrl && !recordExternalId) continue;
    out.push({
      rownum: row.__rownum,
      queue_external_id: row._external_id || '',
      model: row.model || row.target_model || 'product.template',
      record_external_id: recordExternalId,
      image_url: imageUrl,
      image_field: row.image_field || 'image_1920',
      image_alt: row.image_alt || '',
      image_note: row.image_note || row.note || ''
    });
  }
  return out;
}

async function importPhotoBatch({ odoo, sheet, rows, options = {} }) {
  const items = photoItemsFromRows(rows);
  const report = {
    sheet,
    model: 'photo_import_queue',
    rows: rows.length,
    queued: items.length,
    processed: 0,
    done: 0,
    failed: 0,
    skipped: 0,
    target_found: 0,
    target_missing: 0,
    download_failed: 0,
    write_failed: 0,
    results: []
  };

  for (const item of items) {
    const result = { row: item.rownum, product: item.record_external_id, image_url: item.image_url, status: 'WAITING' };
    try {
      if (!item.record_external_id) {
        result.status = 'SKIPPED';
        result.message = 'record_external_id kosong.';
        report.skipped++;
        report.results.push(result);
        continue;
      }
      if (!item.image_url) {
        result.status = 'SKIPPED';
        result.message = 'image_url kosong.';
        report.skipped++;
        report.results.push(result);
        continue;
      }

      result.status = 'TARGET_CHECKING';
      const target = await odoo.findExternalId(item.record_external_id);
      if (!target) {
        result.status = 'TARGET_NOT_FOUND';
        result.message = `Produk tidak ditemukan: ${item.record_external_id}`;
        report.target_missing++;
        report.failed++;
        report.results.push(result);
        continue;
      }
      report.target_found++;

      result.status = 'DOWNLOADING';
      const imageBuffer = await downloadImage(item.image_url, options);

      result.status = 'WRITING';
      const base64 = imageBuffer.toString('base64');
      await odoo.write(item.model || target.model || 'product.template', [Number(target.res_id)], {
        [item.image_field || 'image_1920']: base64
      });

      result.status = 'DONE';
      result.message = `${item.image_field || 'image_1920'} updated`;
      report.done++;
    } catch (err) {
      const simple = simplifyError(err);
      result.status = /download|fetch|HTTP|image/i.test(simple.message + ' ' + simple.detail) ? 'DOWNLOAD_FAILED' : 'ERROR';
      result.message = simple.message;
      result.detail = simple.detail;
      if (result.status === 'DOWNLOAD_FAILED') report.download_failed++;
      else report.write_failed++;
      report.failed++;
      if (!options.continueOnError) {
        report.results.push(result);
        break;
      }
    }
    report.processed++;
    report.results.push(result);
  }

  return report;
}

async function downloadImage(url, options = {}) {
  const timeoutMs = Number(options.imageTimeoutMs || 15000);
  const maxBytes = Number(options.maxImageBytes || 5 * 1024 * 1024);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'LokalmartImporterStudio/1.0' }
    });
    if (!res.ok) throw new Error(`Gagal download image_url: HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !/^image\//i.test(contentType)) {
      throw new Error(`URL bukan image content-type: ${contentType}`);
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > maxBytes) throw new Error(`Ukuran gambar terlalu besar: ${ab.byteLength} bytes`);
    return Buffer.from(ab);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { importPhotoBatch, photoItemsFromRows };
