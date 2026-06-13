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
  'project.milestone',
  'project.update',
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
      'id', 'name', 'default_code', 'barcode', 'list_price', 'standard_price', 'categ_id', 'public_categ_ids',
      'sale_ok', 'purchase_ok', 'active', 'website_published', 'type', 'detailed_type', 'uom_id', 'uom_po_id',
      'create_date', 'write_date',
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
      'id', 'name', 'display_name', 'email', 'phone', 'mobile', 'street', 'city', 'zip', 'country_id', 'state_id',
      'supplier_rank', 'customer_rank', 'category_id', 'is_company', 'parent_id', 'active', 'create_date', 'write_date',
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
    fields: ['id', 'name', 'project_id', 'parent_id', 'stage_id', 'user_ids', 'partner_id', 'priority', 'date_deadline', 'active', 'create_date', 'write_date'],
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

function trimText(value, max = 6000) {
  const text = safeText(value).replace(/\s+/g, ' ').trim();
  if (!max || text.length <= max) return text;
  return text.slice(0, max) + ' …[truncated]';
}

function normalizeError(err) {
  return String((err && (err.message || err)) || 'Unknown error').replace(/\s+/g, ' ').trim().slice(0, 800);
}

function relationId(value) {
  if (Array.isArray(value) && value.length >= 1) return value[0];
  if (Number.isFinite(Number(value))) return Number(value);
  return null;
}

function relationName(value) {
  if (Array.isArray(value) && value.length >= 2) return value[1];
  return '';
}

function uniqNumbers(values) {
  return [...new Set((values || []).map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0))];
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
  for (const field of wanted || []) {
    if (field === 'id' || modelFields[field]) out.push(field);
  }
  if (!out.includes('id')) out.unshift('id');
  return out;
}

function customFields(modelFields) {
  if (!modelFields) return [];
  return Object.keys(modelFields).filter(name => name.startsWith('x_')).sort();
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

async function safeRead(odoo, model, ids, fields = ['id']) {
  const modelFields = await safeFieldsGet(odoo, model);
  if (!modelFields) return { ok: false, model, error: `Model tidak bisa dibaca atau tidak tersedia: ${model}`, records: [], fields: [], modelFields: null };
  const useFields = existingFields(modelFields, fields);
  try {
    const records = await odoo.execute(model, 'read', [uniqNumbers(ids)], { fields: useFields });
    return { ok: true, model, records: Array.isArray(records) ? records : [], fields: useFields, modelFields };
  } catch (err) {
    return { ok: false, model, error: normalizeError(err), records: [], fields: useFields, modelFields };
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

function addWarning(warnings, area, message, detail = null) {
  warnings.push({ area, message, detail });
}

async function buildAssistantHealth(odoo, payload = {}) {
  const version = await odoo.version().catch(() => null);
  const modelChecks = [];
  for (const model of ['product.template', 'res.partner', 'project.project', 'project.task', 'project.milestone', 'website.page', 'ir.model.fields']) {
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
    next_actions: [
      'ai_schema_scan',
      'ai_context_export',
      'ai_data_audit',
      'ai_project_list',
      'ai_project_context_export',
      'ai_project_xlsx_export',
      'ai_export_xlsx',
    ],
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
      'id', 'name', 'field_description', 'model', 'ttype', 'relation', 'required', 'readonly', 'store', 'state',
      'on_delete', 'ondelete', 'modules', 'copied', 'index',
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
      'id', 'name', 'default_code', 'barcode', 'list_price', 'standard_price', 'categ_id', 'public_categ_ids',
      'sale_ok', 'purchase_ok', 'active', 'website_published', 'type', 'detailed_type', 'write_date',
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
      for (const product of rows) addIssue(issues, 'critical', 'produk', 'product.template', product, `Barcode duplikat: ${barcode}.`, 'Satu barcode hanya boleh untuk satu produk/variant yang benar.');
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
    if (isSupplier && !partner.phone && !partner.mobile && !partner.email) addIssue(issues, 'medium', 'partner', 'res.partner', partner, 'Vendor/supplier tanpa kontak.', 'Isi minimal WhatsApp/phone/email untuk operasional pembelian.');
  }

  const tasks = await safeSearchRead(
    odoo,
    'project.task',
    [],
    ['id', 'name', 'project_id', 'parent_id', 'stage_id', 'user_ids', 'partner_id', 'priority', 'date_deadline', 'active', 'write_date'],
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

function makeProjectDomain(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  return [['name', 'ilike', q]];
}

async function listProjectsForAssistant(odoo, payload = {}) {
  const limit = clampLimit(payload.limit, 80);
  const query = String(payload.query || '').trim();
  const fields = [
    'id', 'name', 'display_name', 'active', 'stage_id', 'partner_id', 'user_id', 'date_start', 'date', 'create_date', 'write_date',
  ];
  const res = await safeSearchRead(odoo, 'project.project', makeProjectDomain(query), fields, limit, 'write_date desc');
  const warnings = [];
  if (!res.ok) warnings.push({ area: 'project.project', message: res.error });
  const projects = [];
  for (const project of res.records) {
    const id = Number(project.id);
    let taskCount = null;
    let milestoneCount = null;
    if (payload.includeCounts !== false) {
      taskCount = await safeSearchCount(odoo, 'project.task', [['project_id', '=', id]]);
      milestoneCount = await safeSearchCount(odoo, 'project.milestone', [['project_id', '=', id]]);
    }
    projects.push({
      id,
      name: project.name || project.display_name || `Project ${id}`,
      display_name: project.display_name || project.name || '',
      active: project.active,
      stage_id: project.stage_id || null,
      stage_name: relationName(project.stage_id),
      partner_id: project.partner_id || null,
      partner_name: relationName(project.partner_id),
      user_id: project.user_id || null,
      user_name: relationName(project.user_id),
      date_start: project.date_start || null,
      date: project.date || null,
      create_date: project.create_date || null,
      write_date: project.write_date || null,
      task_count: taskCount,
      milestone_count: milestoneCount,
    });
  }
  return {
    generated_at: nowIso(),
    query,
    limit,
    count_seen: projects.length,
    projects,
    warnings,
  };
}

function buildTaskHierarchy(tasks) {
  const byId = new Map();
  const roots = [];
  for (const task of tasks || []) {
    byId.set(Number(task.id), { ...task, children: [] });
  }
  for (const node of byId.values()) {
    const pid = relationId(node.parent_id);
    if (pid && byId.has(Number(pid)) && pid !== Number(node.id)) {
      byId.get(Number(pid)).children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a, b) => {
    const seqA = Number(a.sequence || 0);
    const seqB = Number(b.sequence || 0);
    if (seqA !== seqB) return seqA - seqB;
    return String(a.name || '').localeCompare(String(b.name || ''));
  };
  function sortNode(node, level = 0, path = '') {
    node.level = level;
    node.path = path ? `${path} / ${node.name || node.id}` : (node.name || String(node.id));
    node.children.sort(sortFn);
    node.children.forEach(child => sortNode(child, level + 1, node.path));
    return node;
  }
  roots.sort(sortFn).forEach(root => sortNode(root, 0, ''));
  return roots;
}

function flattenTaskHierarchy(nodes, rows = []) {
  for (const node of nodes || []) {
    const copy = { ...node };
    delete copy.children;
    rows.push(copy);
    flattenTaskHierarchy(node.children, rows);
  }
  return rows;
}

function makeProjectSummary(project, tasks, milestones, updates, messages) {
  const stages = {};
  for (const task of tasks || []) {
    const stage = relationName(task.stage_id) || 'Tanpa Stage';
    stages[stage] = (stages[stage] || 0) + 1;
  }
  const rootCount = (tasks || []).filter(t => !relationId(t.parent_id)).length;
  const childCount = (tasks || []).length - rootCount;
  const doneLike = Object.entries(stages)
    .filter(([name]) => /done|selesai|closed|selesai|arsip|validated|validasi selesai/i.test(name))
    .reduce((sum, [, count]) => sum + count, 0);
  return {
    project_id: project && project.id,
    project_name: project && (project.name || project.display_name),
    write_date: project && project.write_date,
    total_tasks: (tasks || []).length,
    root_tasks: rootCount,
    subtasks: childCount,
    milestones: (milestones || []).length,
    updates: (updates || []).length,
    chatter_messages: (messages || []).length,
    tasks_by_stage: stages,
    done_like_tasks: doneLike,
    open_like_tasks: Math.max(0, (tasks || []).length - doneLike),
  };
}

function compactMessage(message) {
  return {
    id: message.id,
    model: message.model,
    res_id: message.res_id,
    date: message.date,
    author_id: message.author_id,
    author_name: relationName(message.author_id),
    message_type: message.message_type,
    subtype_id: message.subtype_id,
    subject: message.subject || '',
    body_text: trimText(String(message.body || '').replace(/<[^>]+>/g, ' '), 3000),
  };
}

async function buildProjectContextExport(odoo, payload = {}) {
  const projectId = Number(payload.projectId || payload.id || 0);
  if (!projectId) throw new Error('Pilih project terlebih dahulu. payload.projectId wajib diisi.');
  const taskLimit = clampLimit(payload.taskLimit, 1200);
  const messageLimit = clampLimit(payload.messageLimit, 160);
  const includeMessages = payload.includeMessages !== false;
  const includeUpdates = payload.includeUpdates !== false;
  const includeSchema = payload.includeSchema !== false;
  const warnings = [];

  const projectFieldsBase = [
    'id', 'name', 'display_name', 'active', 'stage_id', 'partner_id', 'user_id', 'company_id', 'allow_timesheets',
    'privacy_visibility', 'date_start', 'date', 'label_tasks', 'description', 'create_date', 'write_date',
  ];
  const projectModelFields = await safeFieldsGet(odoo, 'project.project');
  const projectFields = existingFields(projectModelFields, projectFieldsBase.concat(customFields(projectModelFields)));
  const projectRes = await safeRead(odoo, 'project.project', [projectId], projectFields);
  if (!projectRes.ok || !projectRes.records.length) {
    throw new Error(projectRes.error || `Project dengan id ${projectId} tidak ditemukan atau tidak bisa dibaca.`);
  }
  const project = projectRes.records[0];

  const taskModelFields = await safeFieldsGet(odoo, 'project.task');
  const taskFieldsBase = [
    'id', 'name', 'display_name', 'project_id', 'parent_id', 'child_ids', 'stage_id', 'user_ids', 'partner_id', 'company_id',
    'milestone_id', 'sequence', 'priority', 'kanban_state', 'active', 'date_assign', 'date_deadline', 'planned_date_begin',
    'planned_date_end', 'allocated_hours', 'effective_hours', 'remaining_hours', 'progress', 'description', 'create_date', 'write_date',
  ];
  const taskFields = existingFields(taskModelFields, taskFieldsBase.concat(customFields(taskModelFields)));
  const tasksRes = await safeSearchRead(odoo, 'project.task', [['project_id', '=', projectId]], taskFields, taskLimit, 'sequence asc,id asc');
  if (!tasksRes.ok) addWarning(warnings, 'project.task', tasksRes.error);
  const tasks = tasksRes.records || [];
  const taskIds = tasks.map(t => Number(t.id));
  const hierarchy = buildTaskHierarchy(tasks);
  const flatHierarchy = flattenTaskHierarchy(hierarchy, []);

  let milestones = [];
  if (await modelExists(odoo, 'project.milestone')) {
    const milestoneFieldsModel = await safeFieldsGet(odoo, 'project.milestone');
    const milestoneFields = existingFields(milestoneFieldsModel, [
      'id', 'name', 'project_id', 'deadline', 'is_reached', 'reached_date', 'sequence', 'create_date', 'write_date',
    ].concat(customFields(milestoneFieldsModel)));
    const milestoneRes = await safeSearchRead(odoo, 'project.milestone', [['project_id', '=', projectId]], milestoneFields, 300, 'sequence asc,id asc');
    milestones = milestoneRes.records || [];
    if (!milestoneRes.ok) addWarning(warnings, 'project.milestone', milestoneRes.error);
  }

  let updates = [];
  if (includeUpdates && await modelExists(odoo, 'project.update')) {
    const updateFieldsModel = await safeFieldsGet(odoo, 'project.update');
    const updateFields = existingFields(updateFieldsModel, [
      'id', 'name', 'project_id', 'status', 'progress', 'description', 'user_id', 'date', 'create_date', 'write_date',
    ].concat(customFields(updateFieldsModel)));
    const updateRes = await safeSearchRead(odoo, 'project.update', [['project_id', '=', projectId]], updateFields, 120, 'write_date desc');
    updates = updateRes.records || [];
    if (!updateRes.ok) addWarning(warnings, 'project.update', updateRes.error);
  }

  let messages = [];
  if (includeMessages && await modelExists(odoo, 'mail.message')) {
    const msgDomains = [
      ['model', '=', 'project.project'], ['res_id', '=', projectId],
    ];
    const projectMsg = await safeSearchRead(
      odoo,
      'mail.message',
      msgDomains,
      ['id', 'model', 'res_id', 'subject', 'body', 'author_id', 'date', 'message_type', 'subtype_id'],
      Math.ceil(messageLimit / 2),
      'date desc',
    );
    if (!projectMsg.ok) addWarning(warnings, 'mail.message.project', projectMsg.error);

    let taskMsgRecords = [];
    const readTaskIds = taskIds.slice(0, 250);
    if (readTaskIds.length) {
      const taskMsg = await safeSearchRead(
        odoo,
        'mail.message',
        [['model', '=', 'project.task'], ['res_id', 'in', readTaskIds]],
        ['id', 'model', 'res_id', 'subject', 'body', 'author_id', 'date', 'message_type', 'subtype_id'],
        Math.ceil(messageLimit / 2),
        'date desc',
      );
      if (!taskMsg.ok) addWarning(warnings, 'mail.message.task', taskMsg.error);
      taskMsgRecords = taskMsg.records || [];
    }
    messages = (projectMsg.records || []).concat(taskMsgRecords).slice(0, messageLimit).map(compactMessage);
  }

  const externalDomain = ['|',
    '&', ['model', '=', 'project.project'], ['res_id', '=', projectId],
    '&', ['model', 'in', ['project.task', 'project.milestone', 'project.update']], ['res_id', 'in', taskIds.concat(milestones.map(m => m.id), updates.map(u => u.id)).filter(Boolean)],
  ];
  const externalIdsRes = await safeSearchRead(
    odoo,
    'ir.model.data',
    externalDomain,
    ['id', 'module', 'name', 'model', 'res_id', 'noupdate', 'date_init', 'date_update'],
    1000,
    'model asc,res_id asc',
  );
  if (!externalIdsRes.ok) addWarning(warnings, 'ir.model.data', externalIdsRes.error);

  const schema = includeSchema ? {
    project_project_fields: (projectFields || []).map(name => ({ name, meta: projectModelFields && projectModelFields[name] ? projectModelFields[name] : null })),
    project_task_fields: (taskFields || []).map(name => ({ name, meta: taskModelFields && taskModelFields[name] ? taskModelFields[name] : null })),
  } : null;

  const summary = makeProjectSummary(project, tasks, milestones, updates, messages);

  return {
    generated_at: nowIso(),
    app: 'Lokalmart Studio AI Assistant',
    mode: 'single_project_context_export_for_chatgpt',
    instruction_for_chatgpt: [
      'Baca export ini sebagai keadaan terakhir satu project Odoo Lokalmart.',
      'Pahami struktur project, task, subtask, stage, milestone, update, chatter, dan external ID.',
      'Kembangkan isi project agar selaras dengan diskusi Lokalmart terbaru tanpa membuat task liar tanpa parent.',
      'Jika membuat XLSX import, gunakan aturan Lokalmart: __action, _external_id, _model, many2one _external_id, many2many _external_ids, dan jangan merusak record lama.',
    ],
    limits: { task_limit: taskLimit, message_limit: messageLimit },
    summary,
    project,
    task_hierarchy: hierarchy,
    tasks_flat: flatHierarchy,
    milestones,
    updates,
    messages,
    external_ids: externalIdsRes.records || [],
    schema,
    warnings,
  };
}

function flattenRecord(record = {}) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'children') continue;
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

async function buildProjectXlsxExport(odoo, payload = {}) {
  const context = await buildProjectContextExport(odoo, payload);
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, 'README', [
    { key: 'app', value: 'Lokalmart Studio AI Assistant' },
    { key: 'generated_at', value: context.generated_at },
    { key: 'mode', value: context.mode },
    { key: 'project_id', value: context.summary.project_id },
    { key: 'project_name', value: context.summary.project_name },
    { key: 'how_to_use', value: 'Upload XLSX ini ke ChatGPT agar AI memahami perkembangan terakhir satu project Odoo Lokalmart dan membuat patch pengembangan yang aman.' },
  ]);
  addSheet(workbook, 'SUMMARY', [context.summary || {}]);
  addSheet(workbook, 'PROJECT', context.project ? [context.project] : []);
  addSheet(workbook, 'TASKS_FLAT', context.tasks_flat || []);
  addSheet(workbook, 'TASK_HIERARCHY_JSON', [{ json: JSON.stringify(context.task_hierarchy || [], null, 2) }]);
  addSheet(workbook, 'MILESTONES', context.milestones || []);
  addSheet(workbook, 'UPDATES', context.updates || []);
  addSheet(workbook, 'CHATTER', context.messages || []);
  addSheet(workbook, 'EXTERNAL_IDS', context.external_ids || []);
  addSheet(workbook, 'WARNINGS', context.warnings || []);

  const safeName = String(context.summary.project_name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'project';
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  return {
    filename: `lokalmart_project_context_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64,
    summary: context.summary,
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
  listProjectsForAssistant,
  buildProjectContextExport,
  buildProjectXlsxExport,
  readOnlyRpc,
};
