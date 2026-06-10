const XLSX = require('xlsx');
const { sendJson, readJsonBody } = require('../lib/http');
const { OdooClient } = require('../lib/odooClient');
const { simplifyError } = require('../lib/errors');

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 300;
const PACKAGE_BODY_LIMIT = 100 * 1024 * 1024;

const PROFILES = {
  project_context: {
    label: 'Project Context',
    description: 'Project, task, stage, milestone, Knowledge, dan external ID. Cocok untuk restrukturisasi 3 project.',
    models: [
      'project.project', 'project.task', 'project.task.type', 'project.milestone', 'project.tags',
      'knowledge.article', 'ir.model.data'
    ]
  },
  migration_safe_core: {
    label: 'Migration Safe Core',
    description: 'Master data bisnis yang biasanya dibutuhkan saat membuka database baru.',
    models: [
      'res.partner', 'product.category', 'product.public.category', 'product.template', 'product.product',
      'product.pricelist', 'product.supplierinfo', 'project.project', 'project.task', 'project.task.type',
      'project.milestone', 'knowledge.article', 'website.page', 'ir.ui.view', 'ir.model.data'
    ]
  },
  full_business: {
    label: 'Full Business Export',
    description: 'Data bisnis lebih luas: produk, partner, project, website, Knowledge, eLearning, sale, invoice.',
    models: [
      'res.partner', 'res.users', 'res.groups',
      'product.category', 'product.public.category', 'product.template', 'product.product', 'product.pricelist',
      'product.supplierinfo', 'product.image',
      'project.project', 'project.task', 'project.task.type', 'project.milestone', 'project.tags',
      'knowledge.article', 'website.page', 'ir.ui.view',
      'slide.channel', 'slide.slide',
      'sale.order', 'sale.order.line', 'account.move', 'account.move.line',
      'payment.provider', 'payment.transaction', 'ir.model.data'
    ]
  },
  technical_autopsy: {
    label: 'Technical Autopsy',
    description: 'Struktur teknis: model, field, ACL, view, menu, action, external ID. Cocok untuk schema-aware import.',
    models: [
      'ir.model', 'ir.model.fields', 'ir.model.access', 'ir.model.data',
      'ir.ui.view', 'ir.ui.menu', 'ir.actions.act_window',
      'project.project', 'project.task', 'product.template', 'res.partner', 'knowledge.article'
    ]
  }
};

const FIELD_PRESETS = {
  'ir.model.data': ['id', 'module', 'name', 'model', 'res_id', 'noupdate', 'date_init', 'date_update'],
  'ir.model': ['id', 'name', 'model', 'state', 'modules', 'transient', 'info'],
  'ir.model.fields': ['id', 'name', 'model', 'field_description', 'ttype', 'relation', 'required', 'readonly', 'store', 'state', 'on_delete', 'ondelete', 'help'],
  'res.partner': ['id', 'name', 'display_name', 'company_type', 'parent_id', 'is_company', 'email', 'phone', 'mobile', 'street', 'street2', 'city', 'zip', 'state_id', 'country_id', 'category_id', 'active', 'supplier_rank', 'customer_rank', 'create_date', 'write_date'],
  'product.template': ['id', 'name', 'display_name', 'default_code', 'barcode', 'categ_id', 'public_categ_ids', 'list_price', 'standard_price', 'uom_id', 'uom_po_id', 'sale_ok', 'purchase_ok', 'is_published', 'active', 'description', 'description_sale', 'website_description', 'create_date', 'write_date'],
  'product.product': ['id', 'name', 'display_name', 'product_tmpl_id', 'default_code', 'barcode', 'lst_price', 'standard_price', 'active', 'create_date', 'write_date'],
  'product.image': ['id', 'name', 'product_tmpl_id', 'product_variant_id', 'video_url', 'can_image_1024_be_zoomed', 'create_date', 'write_date'],
  'project.project': ['id', 'name', 'display_name', 'active', 'description', 'partner_id', 'user_id', 'privacy_visibility', 'allow_milestones', 'date_start', 'date', 'create_date', 'write_date'],
  'project.task': ['id', 'name', 'display_name', 'project_id', 'parent_id', 'stage_id', 'milestone_id', 'user_ids', 'partner_id', 'tag_ids', 'description', 'sequence', 'date_deadline', 'priority', 'active', 'create_date', 'write_date'],
  'project.task.type': ['id', 'name', 'sequence', 'fold', 'project_ids', 'user_id', 'mail_template_id', 'create_date', 'write_date'],
  'project.milestone': ['id', 'name', 'project_id', 'deadline', 'is_reached', 'create_date', 'write_date'],
  'knowledge.article': ['id', 'name', 'parent_id', 'body', 'active', 'is_article_visible_by_everyone', 'create_date', 'write_date'],
  'website.page': ['id', 'name', 'url', 'view_id', 'website_id', 'is_published', 'create_date', 'write_date'],
  'ir.ui.view': ['id', 'name', 'type', 'key', 'model', 'inherit_id', 'arch_db', 'active', 'priority', 'create_date', 'write_date'],
  'slide.channel': ['id', 'name', 'description', 'channel_type', 'is_published', 'visibility', 'active', 'create_date', 'write_date'],
  'slide.slide': ['id', 'name', 'channel_id', 'slide_type', 'is_published', 'sequence', 'description', 'html_content', 'active', 'create_date', 'write_date'],
  'sale.order': ['id', 'name', 'partner_id', 'user_id', 'state', 'date_order', 'amount_total', 'amount_untaxed', 'currency_id', 'invoice_status', 'origin', 'client_order_ref', 'create_date', 'write_date'],
  'sale.order.line': ['id', 'order_id', 'product_id', 'name', 'product_uom_qty', 'price_unit', 'discount', 'price_subtotal', 'price_total', 'create_date', 'write_date'],
  'account.move': ['id', 'name', 'move_type', 'partner_id', 'state', 'invoice_date', 'amount_total', 'amount_residual', 'currency_id', 'payment_state', 'invoice_origin', 'create_date', 'write_date'],
  'account.move.line': ['id', 'move_id', 'product_id', 'name', 'quantity', 'price_unit', 'price_subtotal', 'price_total', 'account_id', 'partner_id', 'create_date', 'write_date']
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Gunakan POST.' });
  }

  try {
    const body = await readJsonBody(req, PACKAGE_BODY_LIMIT);
    const action = body.action;
    const target = body.target || {};
    const payload = body.payload || {};

    if (action === 'profiles') {
      return sendJson(res, 200, { ok: true, profiles: PROFILES });
    }

    if (action === 'inspect') {
      const odoo = new OdooClient(target);
      const uid = await odoo.authenticate();
      let version = null;
      try { version = await odoo.version(); } catch (_) {}
      const profile = normalizeProfile(payload.profile);
      const requestedModels = normalizeModelList(payload.models && payload.models.length ? payload.models : profile.models);
      const includeBinary = !!payload.includeBinary;
      const modelReports = [];
      for (const model of requestedModels) {
        modelReports.push(await inspectModel(odoo, model, { includeBinary }));
      }
      return sendJson(res, 200, {
        ok: true,
        uid,
        version,
        profile: profile.label,
        generated_at: new Date().toISOString(),
        models: modelReports
      });
    }

    if (action === 'fetch_model') {
      const odoo = new OdooClient(target);
      await odoo.authenticate();
      const model = payload.model;
      const fields = Array.isArray(payload.fields) ? payload.fields : [];
      const domain = Array.isArray(payload.domain) ? payload.domain : [];
      const offset = Number(payload.offset || 0);
      const limit = Math.max(1, Math.min(Number(payload.limit || DEFAULT_LIMIT), MAX_LIMIT));
      const safeFields = await safeFieldList(odoo, model, fields, { includeBinary: !!payload.includeBinary });
      const rows = await odoo.execute(model, 'search_read', [domain], {
        fields: safeFields,
        offset,
        limit,
        order: 'id asc'
      });
      return sendJson(res, 200, {
        ok: true,
        model,
        offset,
        limit,
        count: rows.length,
        next_offset: offset + rows.length,
        done: rows.length < limit,
        fields: safeFields,
        rows: rows.map(sanitizeRecord)
      });
    }

    if (action === 'make_package') {
      const pack = makePackage(payload || {});
      return sendJson(res, 200, { ok: true, ...pack });
    }

    return sendJson(res, 400, { ok: false, error: `Action tidak dikenal: ${action}` });
  } catch (err) {
    const simple = simplifyError(err);
    return sendJson(res, 500, { ok: false, error: simple.message, detail: simple.detail });
  }
};

function normalizeProfile(name) {
  return PROFILES[name] || PROFILES.migration_safe_core;
}

function normalizeModelList(models) {
  return [...new Set((models || []).map(v => String(v || '').trim()).filter(Boolean))];
}

async function inspectModel(odoo, model, options = {}) {
  try {
    const fieldsGet = await odoo.fieldsGet(model);
    let count = 0;
    try { count = await odoo.execute(model, 'search_count', [[]], {}); } catch (_) {}
    const exportFields = pickExportFields(model, fieldsGet, options);
    return {
      model,
      ok: true,
      count,
      field_count: Object.keys(fieldsGet).length,
      fields: exportFields,
      schema: fieldsGet,
      warning: exportFields.length ? '' : 'Tidak ada field aman untuk export.'
    };
  } catch (err) {
    const simple = simplifyError(err);
    return { model, ok: false, count: 0, fields: [], schema: {}, error: simple.message, detail: simple.detail };
  }
}

async function safeFieldList(odoo, model, requestedFields, options = {}) {
  const schema = await odoo.fieldsGet(model);
  const picked = requestedFields && requestedFields.length ? requestedFields : pickExportFields(model, schema, options);
  return picked.filter(f => schema[f] && isSafeField(schema[f], options));
}

function pickExportFields(model, schema, options = {}) {
  const preset = FIELD_PRESETS[model];
  if (preset) return preset.filter(f => schema[f] && isSafeField(schema[f], options));
  return Object.keys(schema)
    .filter(f => isSafeField(schema[f], options))
    .sort((a, b) => (a === 'id' ? -1 : b === 'id' ? 1 : a.localeCompare(b)))
    .slice(0, 80);
}

function isSafeField(meta = {}, options = {}) {
  if (!options.includeBinary && meta.type === 'binary') return false;
  // Odoo computed non-stored fields can be slow and may fail in bulk.
  if (meta.store === false && !['id', 'display_name', 'name'].includes(meta.name)) return false;
  return true;
}

function sanitizeRecord(record) {
  const out = {};
  for (const [k, v] of Object.entries(record || {})) {
    out[k] = sanitizeValue(v);
  }
  return out;
}

function sanitizeValue(v) {
  if (v === undefined) return null;
  if (typeof v === 'string') return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (Array.isArray(v)) return v.map(sanitizeValue);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitizeValue(val);
    return o;
  }
  return v;
}

function makePackage(payload) {
  const generatedAt = new Date().toISOString();
  const exportId = payload.export_id || `lokalmart_full_export_${generatedAt.replace(/[-:.]/g, '').slice(0, 15)}`;
  const dataByModel = payload.dataByModel || {};
  const schemaByModel = payload.schemaByModel || {};
  const modelReports = payload.modelReports || [];
  const targetInfo = payload.targetInfo || {};
  const warnings = payload.warnings || [];

  const files = [];
  const manifest = {
    export_id: exportId,
    generated_at: generatedAt,
    app: 'Lokalmart Importer Studio Full Export',
    profile: payload.profile || '',
    target: {
      url: targetInfo.url || '',
      db: targetInfo.db || '',
      username: targetInfo.username || ''
    },
    model_count: Object.keys(dataByModel).length,
    total_records: Object.values(dataByModel).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0),
    models: Object.keys(dataByModel).map(model => ({ model, records: (dataByModel[model] || []).length })),
    warnings
  };

  const contextSummary = buildContextSummary(dataByModel, modelReports, warnings);
  files.push({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });
  files.push({ name: 'context_summary.json', data: JSON.stringify(contextSummary, null, 2) });
  files.push({ name: 'schema_fields.json', data: JSON.stringify(schemaByModel, null, 2) });
  files.push({ name: 'model_reports.json', data: JSON.stringify(modelReports, null, 2) });
  files.push({ name: 'errors_warnings.json', data: JSON.stringify(warnings, null, 2) });
  files.push({ name: 'README_RESTORE.md', data: restoreReadme(exportId) });

  for (const [model, rows] of Object.entries(dataByModel)) {
    const safeName = model.replace(/[^a-zA-Z0-9_.-]+/g, '_');
    files.push({ name: `json/${safeName}.json`, data: JSON.stringify(rows || [], null, 2) });
  }

  const workbookBuffer = buildWorkbookBuffer(dataByModel, manifest, contextSummary);
  files.push({ name: 'xlsx/lokalmart_full_export_audit.xlsx', data: workbookBuffer });

  const zipBuffer = zipFiles(files);
  return {
    export_id: exportId,
    filename: `${exportId}.zip`,
    mime: 'application/zip',
    size_bytes: zipBuffer.length,
    zip_base64: zipBuffer.toString('base64'),
    manifest
  };
}

function buildContextSummary(dataByModel, modelReports, warnings) {
  const summary = {
    generated_at: new Date().toISOString(),
    counts: {},
    project_names: [],
    product_sample: [],
    partner_sample: [],
    warnings: warnings || []
  };
  for (const [model, rows] of Object.entries(dataByModel || {})) {
    summary.counts[model] = Array.isArray(rows) ? rows.length : 0;
  }
  summary.project_names = (dataByModel['project.project'] || []).map(r => r.name || r.display_name).filter(Boolean).slice(0, 100);
  summary.product_sample = (dataByModel['product.template'] || []).slice(0, 50).map(r => ({ id: r.id, name: r.name, barcode: r.barcode, list_price: r.list_price }));
  summary.partner_sample = (dataByModel['res.partner'] || []).slice(0, 50).map(r => ({ id: r.id, name: r.name, phone: r.phone || r.mobile, email: r.email }));
  summary.model_health = (modelReports || []).map(r => ({ model: r.model, ok: r.ok, count: r.count, error: r.error || '' }));
  return summary;
}

function buildWorkbookBuffer(dataByModel, manifest, contextSummary) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([manifest]), '_manifest');
  const countsRows = Object.entries(contextSummary.counts || {}).map(([model, count]) => ({ model, count }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(countsRows), '_counts');
  const used = new Set(['_manifest', '_counts']);
  for (const [model, rows] of Object.entries(dataByModel || {})) {
    const sheetName = uniqueSheetName(model, used);
    const flatRows = (rows || []).map(flattenForXlsx);
    const ws = XLSX.utils.json_to_sheet(flatRows.length ? flatRows : [{ note: 'Tidak ada record.' }]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
}

function flattenForXlsx(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    if (Array.isArray(v) || (v && typeof v === 'object')) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

function uniqueSheetName(model, used) {
  let base = model.replace(/[^a-zA-Z0-9_]+/g, '_').slice(0, 31) || 'sheet';
  let name = base;
  let i = 1;
  while (used.has(name)) {
    const suffix = `_${i++}`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name);
  return name;
}

function restoreReadme(exportId) {
  return `# ${exportId}\n\nPaket ini adalah application-level export dari Odoo Lokalmart melalui XML-RPC.\n\nIsi utama:\n- manifest.json: identitas export dan ringkasan jumlah record.\n- context_summary.json: ringkasan untuk ChatGPT/analisis.\n- schema_fields.json: field yang tersedia saat export.\n- json/*.json: data per model.\n- xlsx/lokalmart_full_export_audit.xlsx: workbook audit manusia.\n\nCatatan restore:\n1. Ini bukan dump PostgreSQL penuh.\n2. Database baru harus memiliki modul Odoo yang sama atau setara.\n3. Custom model dan custom field perlu dibuat dulu sebelum data bisnis diimpor.\n4. Data transaksi akuntansi/sales perlu validasi manual sebelum restore.\n5. Gunakan external ID dari ir.model.data sebagai pegangan relasi.\n6. Untuk migration-safe restore, buat patch XLSX bertahap: schema -> master data -> project/produk/partner -> transaksi.\n`;
}

function zipFiles(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(String(file.data || ''), 'utf8');
    const crc = crc32(dataBuf);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // store, no compression
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, dataBuf);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(dataBuf.length, 20);
    central.writeUInt32LE(dataBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + dataBuf.length;
  }
  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDir, end]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}
