const XLSX = require('xlsx');

const DEFAULT_LIMIT = 300;
const HARD_LIMIT = 1500;

const CORE_MODELS = [
  'product.template',
  'product.category',
  'product.public.category',
  'product.tag',
  'res.partner',
  'project.project',
  'project.task',
  'sale.order',
  'sale.order.line',
  'stock.quant',
  'stock.picking',
  'website.page',
  'ir.ui.view',
  'ir.model',
  'ir.model.fields',
  'ir.model.access',
  'ir.model.data',
];

const CONTEXT_MODELS = [
  {
    model: 'product.template',
    label: 'Produk',
    domain: [],
    fields: [
      'id',
      'name',
      'default_code',
      'barcode',
      'list_price',
      'standard_price',
      'categ_id',
      'public_categ_ids',
      'sale_ok',
      'purchase_ok',
      'active',
      'website_published',
      'type',
      'detailed_type',
      'uom_id',
      'uom_po_id',
      'create_date',
      'write_date',
    ],
  },
  {
    model: 'product.category',
    label: 'Kategori Teknis Produk',
    domain: [],
    fields: ['id', 'name', 'parent_id', 'complete_name', 'parent_path', 'create_date', 'write_date'],
  },
  {
    model: 'product.public.category',
    label: 'Kategori Ecommerce',
    domain: [],
    fields: ['id', 'name', 'parent_id', 'website_id', 'sequence', 'create_date', 'write_date'],
  },
  {
    model: 'product.tag',
    label: 'Tag Produk',
    domain: [],
    fields: ['id', 'name', 'color', 'create_date', 'write_date'],
  },
  {
    model: 'res.partner',
    label: 'Partner / Vendor / Customer',
    domain: [],
    fields: [
      'id',
      'name',
      'display_name',
      'email',
      'phone',
      'mobile',
      'street',
      'city',
      'zip',
      'country_id',
      'state_id',
      'supplier_rank',
      'customer_rank',
      'category_id',
      'is_company',
      'parent_id',
      'active',
      'create_date',
      'write_date',
    ],
  },
  {
    model: 'project.project',
    label: 'Project',
    domain: [],
    fields: ['id', 'name', 'partner_id', 'user_id', 'active', 'stage_id', 'date_start', 'date', 'create_date', 'write_date'],
  },
  {
    model: 'project.task',
    label: 'Task',
    domain: [],
    fields: ['id', 'name', 'project_id', 'stage_id', 'user_ids', 'partner_id', 'priority', 'date_deadline', 'active', 'create_date', 'write_date'],
  },
  {
    model: 'website.page',
    label: 'Website Page',
    domain: [],
    fields: ['id', 'name', 'url', 'website_id', 'view_id', 'is_published', 'create_date', 'write_date'],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function clampLimit(value, fallback = DEFAULT_LIMIT) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.max(1, Math.floor(n)), HARD_LIMIT);
}

function safeText(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(v => (Array.isArray(v) ? v.join(':') : String(v))).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function normalizeError(err) {
  return String((err && (err.message || err)) || 'Unknown error')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

async function safeFieldsGet(odoo, model) {
  try {
    return await odoo.fieldsGet(model);
  } catch (err) {
    return null;
  }
}

function existingFields(modelFields, wanted) {
  if (!modelFields) return ['id'];
  const out = [];
  for (const field of wanted) {
    if (modelFields[field] || field === 'id') out.push(field);
  }
  if (!out.includes('id')) out.unshift('id');
  return out;
}

async function safeSearchRead(odoo, model, domain = [], fields = ['id'], limit = DEFAULT_LIMIT, order = '') {
  const modelFields = await safeFieldsGet(odoo, model);
  if (!modelFields) {
    return {
      ok: false,
      model,
      error: `Model tidak bisa dibaca atau tidak tersedia: ${model}`,
      records: [],
      fields: [],
      modelFields: null,
    };
  }

  const useFields = existingFields(modelFields, fields);
  const kwargs = { fields: useFields };
  if (limit) kwargs.limit = clampLimit(limit);
  if (order) kwargs.order = order;

  try {
    const records = await odoo.execute(model, 'search_read', [domain], kwargs);
    return {
      ok: true,
      model,
      records: Array.isArray(records) ? records : [],
      fields: useFields,
      modelFields,
    };
  } catch (err) {
    return {
      ok: false,
      model,
      error: normalizeError(err),
      records: [],
      fields: useFields,
      modelFields,
    };
  }
}

async function safeSearchCount(odoo, model, domain = []) {
  try {
    return await odoo.execute(model, 'search_count', [domain], {});
  } catch (err) {
    return null;
  }
}

async function modelExists(odoo, model) {
  const count = await safeSearchCount(odoo, 'ir.model', [['model', '=', model]]);
  return Number(count || 0) > 0;
}

async function buildAssistantHealth(odoo, payload = {}) {
  const version = await odoo.version().catch(() => null);
  const modelChecks = [];

  for (const model of ['product.template', 'res.partner', 'project.task', 'website.page', 'ir.model.fields']) {
    modelChecks.push({
      model,
      available: await modelExists(odoo, model),
      count: await safeSearchCount(odoo, model, []),
    });
  }

  return {
    generated_at: nowIso(),
    mode: 'read_first',
    version,
    uid: odoo.uid,
    model_checks: modelChecks,
    next_actions: ['ai_schema_scan', 'ai_context_export', 'ai_data_audit', 'ai_export_xlsx'],
  };
}

async function buildSchemaScan(odoo, payload = {}) {
  const limit = clampLimit(payload.limit, 500);
  const fieldLimit = clampLimit(payload.fieldLimit, 1000);

  const modelsRes = await safeSearchRead(
    odoo,
    'ir.model',
    [],
    ['id', 'model', 'name', 'state', 'modules', 'transient', 'info'],
    limit,
    'model asc',
  );

  const customModels = (modelsRes.records || []).filter(m => String(m.model || '').startsWith('x_'));
  const coreModels = (modelsRes.records || []).filter(m => CORE_MODELS.includes(m.model));
  const scanModels = CORE_MODELS.concat(customModels.map(m => m.model)).filter(Boolean);

  const fieldDomain = ['|', ['name', 'ilike', 'x_'], ['model', 'in', scanModels]];
  const fieldsRes = await safeSearchRead(
    odoo,
    'ir.model.fields',
    fieldDomain,
    [
      'id',
      'name',
      'field_description',
      'model',
      'ttype',
      'relation',
      'required',
      'readonly',
      'store',
      'state',
      'on_delete',
      'ondelete',
      'modules',
      'copied',
      'index',
    ],
    fieldLimit,
    'model asc,name asc',
  );

  const riskyFields = (fieldsRes.records || []).filter(field => {
    const ondelete = String(field.on_delete || field.ondelete || '').toLowerCase();
    return field.ttype === 'many2one' && field.required === true && (!ondelete || ondelete === 'set null' || ondelete === 'set_null');
  });

  const counts = [];
  for (const model of scanModels.slice(0, 40)) {
    counts.push({ model, count: await safeSearchCount(odoo, model, []) });
  }

  return {
    generated_at: nowIso(),
    limits: { model_limit: limit, field_limit: fieldLimit },
    summary: {
      total_models_seen: modelsRes.records.length,
      custom_models_seen: customModels.length,
      core_models_seen: coreModels.length,
      fields_seen: fieldsRes.records.length,
      risky_required_many2one: riskyFields.length,
    },
    core_models: coreModels,
    custom_models: customModels,
    fields: fieldsRes.records,
    risky_fields: riskyFields,
    counts,
    warnings: [
      ...(modelsRes.ok ? [] : [{ area: 'ir.model', message: modelsRes.error }]),
      ...(fieldsRes.ok ? [] : [{ area: 'ir.model.fields', message: fieldsRes.error }]),
    ],
  };
}

async function buildContextExport(odoo, payload = {}) {
  const limit = clampLimit(payload.limit, DEFAULT_LIMIT);
  const externalIdLimit = clampLimit(payload.externalIdLimit, 1000);
  const version = await odoo.version().catch(() => null);
  const schema = payload.includeSchema === false ? null : await buildSchemaScan(odoo, { limit: 500, fieldLimit: 1000 });
  const datasets = {};
  const warnings = [];

  for (const spec of CONTEXT_MODELS) {
    const res = await safeSearchRead(odoo, spec.model, spec.domain, spec.fields, limit, 'write_date desc');
    datasets[spec.model] = {
      label: spec.label,
      count_seen: res.records.length,
      fields: res.fields,
      records: res.records,
    };
    if (!res.ok) warnings.push({ model: spec.model, message: res.error });
  }

  const externalIds = await safeSearchRead(
    odoo,
    'ir.model.data',
    [['model', 'in', CONTEXT_MODELS.map(item => item.model)]],
    ['id', 'module', 'name', 'model', 'res_id', 'noupdate', 'date_init', 'date_update'],
    externalIdLimit,
    'date_update desc',
  );

  return {
    generated_at: nowIso(),
    app: 'Lokalmart Studio AI Assistant',
    mode: 'read_first_context_export',
    version,
    limits: { per_model_limit: limit, external_id_limit: externalIdLimit },
    schema,
    datasets,
    external_ids: externalIds.records,
    warnings,
  };
}

function addIssue(issues, severity, area, model, record, message, recommendation = '') {
  issues.push({
    severity,
    area,
    model,
    id: record && record.id,
    name: record && (record.name || record.display_name || record.url || ''),
    message,
    recommendation,
  });
}

async function buildDataAudit(odoo, payload = {}) {
  const limit = clampLimit(payload.limit, 1000);
  const issues = [];
  const warnings = [];

  const products = await safeSearchRead(
    odoo,
    'product.template',
    [],
    [
      'id',
      'name',
      'default_code',
      'barcode',
      'list_price',
      'standard_price',
      'categ_id',
      'public_categ_ids',
      'sale_ok',
      'purchase_ok',
      'active',
      'website_published',
      'type',
      'detailed_type',
      'write_date',
    ],
    limit,
    'write_date desc',
  );

  if (!products.ok) warnings.push({ area: 'products', message: products.error });

  const barcodeMap = new Map();
  for (const product of products.records) {
    if (!product.name) addIssue(issues, 'critical', 'produk', 'product.template', product, 'Produk tanpa nama.', 'Isi name sebelum publish/import ulang.');
    if (!product.default_code) addIssue(issues, 'medium', 'produk', 'product.template', product, 'Internal reference/default_code kosong.', 'Buat kode stabil untuk migration-safe dan scan gudang.');
    if (!product.barcode) addIssue(issues, 'medium', 'produk', 'product.template', product, 'Barcode kosong.', 'Isi barcode jika produk akan discan atau dilacak.');
    if (!product.categ_id) addIssue(issues, 'high', 'produk', 'product.template', product, 'Kategori teknis produk kosong.', 'Pisahkan product.category teknis dari ecommerce category.');
    if (Number(product.list_price || 0) <= 0 && product.sale_ok !== false) addIssue(issues, 'medium', 'produk', 'product.template', product, 'Harga jual 0 atau kosong.', 'Cek apakah produk memang katalog non-jual atau perlu harga.');

    const barcode = String(product.barcode || '').trim();
    if (barcode) {
      if (!barcodeMap.has(barcode)) barcodeMap.set(barcode, []);
      barcodeMap.get(barcode).push(product);
    }
  }

  for (const [barcode, rows] of barcodeMap.entries()) {
    if (rows.length > 1) {
      for (const product of rows) {
        addIssue(issues, 'critical', 'produk', 'product.template', product, `Barcode duplikat: ${barcode}.`, 'Satu barcode hanya boleh untuk satu produk/variant yang benar.');
      }
    }
  }

  const categories = await safeSearchRead(odoo, 'product.category', [], ['id', 'name', 'parent_id', 'complete_name'], limit, 'complete_name asc');
  if (!categories.ok) warnings.push({ area: 'product.category', message: categories.error });

  const publicCategories = await safeSearchRead(odoo, 'product.public.category', [], ['id', 'name', 'parent_id', 'website_id'], limit, 'name asc');
  if (!publicCategories.ok) warnings.push({ area: 'product.public.category', message: publicCategories.error });

  const partners = await safeSearchRead(
    odoo,
    'res.partner',
    [],
    ['id', 'name', 'display_name', 'email', 'phone', 'mobile', 'street', 'city', 'supplier_rank', 'customer_rank', 'is_company', 'active', 'write_date'],
    limit,
    'write_date desc',
  );
  if (!partners.ok) warnings.push({ area: 'partners', message: partners.error });

  for (const partner of partners.records) {
    if (!partner.name && !partner.display_name) addIssue(issues, 'high', 'partner', 'res.partner', partner, 'Partner tanpa nama.', 'Isi nama partner/vendor/customer.');
    const isSupplier = Number(partner.supplier_rank || 0) > 0;
    if (isSupplier && !partner.phone && !partner.mobile && !partner.email) {
      addIssue(issues, 'medium', 'partner', 'res.partner', partner, 'Vendor/supplier tanpa kontak.', 'Isi minimal WhatsApp/phone/email untuk operasional pembelian.');
    }
  }

  const tasks = await safeSearchRead(
    odoo,
    'project.task',
    [],
    ['id', 'name', 'project_id', 'stage_id', 'user_ids', 'partner_id', 'priority', 'date_deadline', 'active', 'write_date'],
    limit,
    'write_date desc',
  );
  if (!tasks.ok) warnings.push({ area: 'tasks', message: tasks.error });

  for (const task of tasks.records) {
    if (!task.project_id) addIssue(issues, 'high', 'project', 'project.task', task, 'Task tidak punya project.', 'Masukkan ke Ground Zero, Pilot Cirebon, atau Operasional Berjalan.');
    if (!task.user_ids || !task.user_ids.length) addIssue(issues, 'medium', 'project', 'project.task', task, 'Task belum punya PIC/user.', 'Tentukan PIC agar task bisa ditindaklanjuti.');
    if (!task.date_deadline) addIssue(issues, 'low', 'project', 'project.task', task, 'Task tanpa deadline.', 'Isi deadline untuk task operasional penting.');
  }

  const fields = await safeSearchRead(
    odoo,
    'ir.model.fields',
    [['name', 'ilike', 'x_']],
    ['id', 'name', 'field_description', 'model', 'ttype', 'relation', 'required', 'on_delete', 'ondelete', 'state', 'store'],
    limit,
    'model asc,name asc',
  );
  if (!fields.ok) warnings.push({ area: 'fields', message: fields.error });

  for (const field of fields.records) {
    const ondelete = String(field.on_delete || field.ondelete || '').toLowerCase();
    if (field.ttype === 'many2one' && field.required === true && (!ondelete || ondelete === 'set null' || ondelete === 'set_null')) {
      addIssue(
        issues,
        'critical',
        'field',
        'ir.model.fields',
        field,
        `Custom Many2one required berisiko: ${field.model}.${field.name}.`,
        'Gunakan required=False saat create field, lalu validasi data lewat workflow; jika wajib, ondelete harus restrict/cascade.',
      );
    }
  }

  const counts = {
    products_seen: products.records.length,
    technical_categories_seen: categories.records.length,
    ecommerce_categories_seen: publicCategories.records.length,
    partners_seen: partners.records.length,
    tasks_seen: tasks.records.length,
    custom_fields_seen: fields.records.length,
    issues_total: issues.length,
    critical: issues.filter(issue => issue.severity === 'critical').length,
    high: issues.filter(issue => issue.severity === 'high').length,
    medium: issues.filter(issue => issue.severity === 'medium').length,
    low: issues.filter(issue => issue.severity === 'low').length,
  };

  const recommendations = [];
  if (counts.critical) recommendations.push('Selesaikan issue critical terlebih dahulu sebelum import besar atau migrasi database.');
  if (issues.some(issue => issue.message.includes('Barcode duplikat'))) recommendations.push('Buat patch khusus barcode-safe sebelum import produk/foto berikutnya.');
  if (issues.some(issue => issue.message.includes('Kategori teknis'))) recommendations.push('Rapikan product.category teknis Lokalmart terpisah dari product.public.category ecommerce.');
  if (issues.some(issue => issue.area === 'project')) recommendations.push('Konsolidasikan task ke tiga project utama: Ground Zero, Pilot Cirebon, Operasional/Pengembangan Berjalan.');

  return {
    generated_at: nowIso(),
    limit,
    counts,
    issues,
    warnings,
    recommendations,
    sample: {
      products: products.records.slice(0, 20),
      categories: categories.records.slice(0, 20),
      public_categories: publicCategories.records.slice(0, 20),
      partners: partners.records.slice(0, 20),
      tasks: tasks.records.slice(0, 20),
      custom_fields: fields.records.slice(0, 20),
    },
  };
}

function flattenRecord(record = {}) {
  const out = {};

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && value.length === 2 && typeof value[0] !== 'object') {
      out[`${key}_id`] = value[0];
      out[`${key}_name`] = value[1];
    } else if (Array.isArray(value)) {
      out[key] = value.map(item => (Array.isArray(item) ? item.join(':') : String(item))).join(', ');
    } else if (typeof value === 'object' && value !== null) {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = value;
    }
  }

  return out;
}

function addSheet(workbook, name, rows) {
  const cleanRows = (rows && rows.length ? rows : [{ info: 'empty' }]).map(flattenRecord);
  const worksheet = XLSX.utils.json_to_sheet(cleanRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, String(name).slice(0, 31));
}

async function buildAssistantXlsxExport(odoo, payload = {}) {
  const scan = await buildSchemaScan(odoo, { limit: 500, fieldLimit: 1000 });
  const audit = await buildDataAudit(odoo, { limit: clampLimit(payload.limit, 1000) });
  const context = await buildContextExport(odoo, {
    includeSchema: false,
    limit: clampLimit(payload.contextLimit, 300),
    externalIdLimit: 1000,
  });

  const workbook = XLSX.utils.book_new();

  addSheet(workbook, 'README', [
    { key: 'app', value: 'Lokalmart Studio AI Assistant' },
    { key: 'generated_at', value: nowIso() },
    { key: 'mode', value: 'read-first export for ChatGPT analysis' },
    { key: 'how_to_use', value: 'Upload file XLSX/JSON ini ke chat agar AI membuat audit dan patch import aman.' },
  ]);
  addSheet(workbook, 'MODEL_COUNTS', scan.counts || []);
  addSheet(workbook, 'CUSTOM_MODELS', scan.custom_models || []);
  addSheet(workbook, 'CUSTOM_FIELDS', scan.fields || []);
  addSheet(workbook, 'RISKY_FIELDS', scan.risky_fields || []);
  addSheet(workbook, 'AUDIT_ISSUES', audit.issues || []);
  addSheet(workbook, 'AUDIT_RECOMMENDATIONS', (audit.recommendations || []).map((message, index) => ({ index: index + 1, message })));

  const datasets = context.datasets || {};
  for (const [model, data] of Object.entries(datasets)) {
    const sheetName = model.replace(/\./g, '_').slice(0, 31);
    addSheet(workbook, sheetName, data.records || []);
  }
  addSheet(workbook, 'EXTERNAL_IDS', context.external_ids || []);

  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  return {
    filename: `lokalmart_studio_ai_context_${new Date().toISOString().slice(0, 10)}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64,
    summary: {
      model_counts: (scan.counts || []).length,
      custom_fields: (scan.fields || []).length,
      audit_issues: (audit.issues || []).length,
      context_models: Object.keys(datasets).length,
    },
  };
}

async function readOnlyRpc(odoo, payload = {}) {
  const allowedMethods = new Set(['search_read', 'fields_get', 'search_count', 'read', 'search', 'name_search']);
  const model = String(payload.model || '').trim();
  const method = String(payload.method || '').trim();

  if (!model) throw new Error('payload.model wajib diisi.');
  if (!allowedMethods.has(method)) throw new Error(`Method tidak diizinkan untuk AI read RPC: ${method}`);

  const args = Array.isArray(payload.args) ? payload.args : [];
  const kwargs = payload.kwargs && typeof payload.kwargs === 'object' ? payload.kwargs : {};
  if (kwargs.limit) kwargs.limit = clampLimit(kwargs.limit);

  return await odoo.execute(model, method, args, kwargs);
}

module.exports = {
  buildAssistantHealth,
  buildSchemaScan,
  buildContextExport,
  buildDataAudit,
  buildAssistantXlsxExport,
  readOnlyRpc,
};
