const { readWorkbook, inferModelFromSheet, technicalSheetToModel, getImportOrder } = require('./xlsxParser');

function preflightWorkbook(fileBase64) {
  const { sheets } = readWorkbook(fileBase64);
  const order = getImportOrder(sheets);
  const sheetMap = Object.fromEntries(sheets.map(s => [s.name, s]));
  const errors = [];
  const warnings = [];
  const info = [];
  const productIds = new Set();

  for (const s of sheets) {
    if (inferModelFromSheet(s.name, s.rows) === 'product.template') {
      for (const row of s.rows) if (row._external_id) productIds.add(String(row._external_id).trim());
    }
  }

  for (const sheetName of order) {
    const s = sheetMap[sheetName];
    if (!s) continue;
    const model = inferModelFromSheet(s.name, s.rows);
    if (!technicalSheetToModel(s.name)) continue;
    if (!s.rows.length) {
      warnings.push({ sheet: s.name, message: 'Sheet kosong.' });
      continue;
    }
    if (model !== 'photo_import_queue') {
      const headers = Object.keys(s.rows[0] || {});
      for (const required of ['__action', '_external_id', '_model']) {
        if (!headers.includes(required)) errors.push({ sheet: s.name, message: `Kolom wajib hilang: ${required}` });
      }
    }

    if (model === 'product.template') {
      for (const row of s.rows) {
        if (!row.name) errors.push({ sheet: s.name, row: row.__rownum, message: 'product.template wajib punya name.' });
        if (!row._external_id) errors.push({ sheet: s.name, row: row.__rownum, message: 'product.template wajib punya _external_id.' });
      }
    }

    if (model === 'ir.model.fields') {
      for (const row of s.rows) {
        if (!row.model) errors.push({ sheet: s.name, row: row.__rownum, message: 'ir.model.fields wajib punya model.' });
        if (!row.name) errors.push({ sheet: s.name, row: row.__rownum, message: 'ir.model.fields wajib punya name.' });
        if (row.name && !String(row.name).startsWith('x_')) warnings.push({ sheet: s.name, row: row.__rownum, message: 'Custom field Odoo Online sebaiknya prefix x_.' });
        if (row.ttype === 'many2one' && !row.relation) errors.push({ sheet: s.name, row: row.__rownum, message: 'Many2one wajib punya relation.' });
      }
    }

    if (model === 'photo_import_queue') {
      for (const row of s.rows) {
        const target = row.record_external_id || row.product_tmpl_id_external_id || row.target_external_id;
        const image = row.image_url || row.photo_url || row.image_1920_url || row.product_image_url || row.main_image_url;
        if (!target) errors.push({ sheet: s.name, row: row.__rownum, message: 'photo_import_queue wajib punya record_external_id.' });
        if (!image) errors.push({ sheet: s.name, row: row.__rownum, message: 'photo_import_queue wajib punya image_url.' });
        if (target && !productIds.has(String(target).trim())) warnings.push({ sheet: s.name, row: row.__rownum, message: `Target produk belum ada di workbook product.template: ${target}` });
      }
    }
  }

  info.push({ message: `${productIds.size} external ID product.template ditemukan di workbook.` });
  return { ok: errors.length === 0, errors, warnings, info };
}

module.exports = { preflightWorkbook };
