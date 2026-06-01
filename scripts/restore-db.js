require('dotenv').config();
const prisma = require('../src/prisma/client');
const fs = require('fs');
const path = require('path');

// ── Campos BigInt por tabla ───────────────────────────────────────────────────
// Se usan para convertir strings del JSON de vuelta a BigInt antes de insertar
const BIGINT_FIELDS = {
  company_settings:          ['id'],
  modules_registry:          ['id'],
  permissions:               ['id'],
  roles:                     ['id'],
  role_permissions:          ['id', 'roleId', 'permissionId'],
  units:                     ['id'],
  product_categories:        ['id'],
  warehouses:                ['id', 'parentId'],
  suppliers:                 ['id'],
  clients:                   ['id'],
  services:                  ['id'],
  users:                     ['id', 'warehouseId'],
  user_roles:                ['id', 'userId', 'roleId'],
  products:                  ['id', 'categoryId', 'supplierId', 'unitId', 'createdBy', 'deletedBy'],
  warehouse_stock:           ['id', 'warehouseId', 'productId'],
  kits:                      ['id', 'createdBy'],
  kit_items:                 ['id', 'kitId', 'productId'],
  inventory_movements:       ['id', 'warehouseFromId', 'warehouseToId', 'relatedId', 'supplierId', 'createdBy'],
  inventory_movement_items:  ['id', 'inventoryMovementId', 'productId'],
  quotes:                    ['id', 'clientId', 'createdBy', 'warehouseId'],
  quote_items:               ['id', 'quoteId', 'productId', 'kitId'],
  quote_item_details:        ['id', 'quoteItemId'],
  quote_item_hidden_costs:   ['id', 'quoteItemId'],
  quote_payment_terms:       ['id', 'quoteId'],
  projects:                  ['id', 'clientId', 'assignedTo', 'createdBy'],
  project_quotes:            ['id', 'projectId', 'quoteId'],
  service_orders:            ['id', 'clientId', 'projectId', 'quoteId', 'assignedTo', 'createdBy'],
  project_services:          ['id', 'projectId', 'serviceOrderId'],
  service_order_tasks:       ['id', 'serviceOrderId', 'performedBy'],
  service_order_materials:   ['id', 'serviceOrderId', 'productId', 'warehouseId', 'inventoryMovementId'],
  service_order_labor:       ['id', 'serviceOrderId', 'userId'],
  entity_custom_fields:      ['id', 'entityId'],
};

function convertRow(row, bigintFields) {
  const out = { ...row };
  for (const field of bigintFields) {
    if (out[field] != null) out[field] = BigInt(out[field]);
  }
  return out;
}

function load(tableKey, backupDir) {
  const filePath = path.join(backupDir, `${tableKey}.json`);
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const fields = BIGINT_FIELDS[tableKey] || ['id'];
  return raw.map(row => convertRow(row, fields));
}

async function insert(label, records, fn) {
  if (!records.length) {
    console.log(`   ⏭️  ${label.padEnd(35)} (sin datos)`);
    return;
  }
  await fn(records);
  console.log(`   ✅ ${label.padEnd(35)} ${records.length} registros`);
}

// Resetea cada secuencia de autoincrement al valor máximo actual del id
async function resetSequences() {
  const tables = [
    'company_settings', 'modules_registry', 'permissions', 'roles', 'role_permissions',
    'units', 'product_categories', 'warehouses', 'suppliers', 'clients', 'services',
    'users', 'user_roles', 'products', 'warehouse_stock', 'kits', 'kit_items',
    'inventory_movements', 'inventory_movement_items',
    'quotes', 'quote_items', 'quote_item_details', 'quote_item_hidden_costs', 'quote_payment_terms',
    'projects', 'project_quotes', 'service_orders', 'project_services',
    'service_order_tasks', 'service_order_materials', 'service_order_labor',
    'entity_custom_fields',
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"${table}"', 'id'),
        COALESCE((SELECT MAX(id) FROM "${table}"), 1)
      );
    `);
  }
}

async function restoreDatabase(backupDir) {
  try {
    console.log(`\n📦 Restaurando base de datos...`);
    console.log(`📁 Carpeta: ${backupDir}\n`);

    const metaPath = path.join(backupDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      console.log(`📅 Backup creado el: ${new Date(meta.createdAt).toLocaleString()}\n`);
    }

    // ── 1. Sin dependencias ──────────────────────────────────────────────────
    console.log('⚙️  Configuración y maestros...');
    await insert('company_settings',   load('company_settings', backupDir),   r => prisma.companySettings.createMany({ data: r, skipDuplicates: true }));
    await insert('modules_registry',   load('modules_registry', backupDir),   r => prisma.modulesRegistry.createMany({ data: r, skipDuplicates: true }));
    await insert('permissions',        load('permissions', backupDir),        r => prisma.permission.createMany({ data: r, skipDuplicates: true }));
    await insert('roles',              load('roles', backupDir),              r => prisma.role.createMany({ data: r, skipDuplicates: true }));
    await insert('role_permissions',   load('role_permissions', backupDir),   r => prisma.rolePermission.createMany({ data: r, skipDuplicates: true }));
    await insert('units',              load('units', backupDir),              r => prisma.unit.createMany({ data: r, skipDuplicates: true }));
    await insert('product_categories', load('product_categories', backupDir), r => prisma.productCategory.createMany({ data: r, skipDuplicates: true }));
    await insert('suppliers',          load('suppliers', backupDir),          r => prisma.supplier.createMany({ data: r, skipDuplicates: true }));
    await insert('clients',            load('clients', backupDir),            r => prisma.client.createMany({ data: r, skipDuplicates: true }));
    await insert('services',           load('services', backupDir),           r => prisma.service.createMany({ data: r, skipDuplicates: true }));

    // ── 2. Almacenes (self-referencing: insertar sin parentId, luego actualizar) ──
    console.log('\n🏭 Almacenes...');
    const warehouses = load('warehouses', backupDir);
    const withParent = warehouses.filter(w => w.parentId != null);
    await insert('warehouses',
      warehouses.map(w => ({ ...w, parentId: null })),
      r => prisma.warehouse.createMany({ data: r, skipDuplicates: true })
    );
    for (const w of withParent) {
      await prisma.warehouse.updateMany({ where: { id: w.id }, data: { parentId: w.parentId } });
    }
    if (withParent.length) console.log(`   ✅ ${'warehouses (parentId)'.padEnd(35)} ${withParent.length} actualizados`);

    // ── 3. Usuarios ───────────────────────────────────────────────────────────
    console.log('\n👤 Usuarios...');
    await insert('users',      load('users', backupDir),      r => prisma.user.createMany({ data: r, skipDuplicates: true }));
    await insert('user_roles', load('user_roles', backupDir), r => prisma.userRole.createMany({ data: r, skipDuplicates: true }));

    // ── 4. Productos e inventario ─────────────────────────────────────────────
    console.log('\n📦 Productos e inventario...');
    await insert('products',                 load('products', backupDir),                 r => prisma.product.createMany({ data: r, skipDuplicates: true }));
    await insert('warehouse_stock',          load('warehouse_stock', backupDir),          r => prisma.warehouseStock.createMany({ data: r, skipDuplicates: true }));
    await insert('kits',                     load('kits', backupDir),                     r => prisma.kit.createMany({ data: r, skipDuplicates: true }));
    await insert('kit_items',                load('kit_items', backupDir),                r => prisma.kitItem.createMany({ data: r, skipDuplicates: true }));
    await insert('inventory_movements',      load('inventory_movements', backupDir),      r => prisma.inventoryMovement.createMany({ data: r, skipDuplicates: true }));
    await insert('inventory_movement_items', load('inventory_movement_items', backupDir), r => prisma.inventoryMovementItem.createMany({ data: r, skipDuplicates: true }));

    // ── 5. Cotizaciones ───────────────────────────────────────────────────────
    console.log('\n📋 Cotizaciones...');
    await insert('quotes',                    load('quotes', backupDir),                    r => prisma.quote.createMany({ data: r, skipDuplicates: true }));
    await insert('quote_items',               load('quote_items', backupDir),               r => prisma.quoteItem.createMany({ data: r, skipDuplicates: true }));
    await insert('quote_item_details',        load('quote_item_details', backupDir),        r => prisma.quoteItemDetail.createMany({ data: r, skipDuplicates: true }));
    await insert('quote_item_hidden_costs',   load('quote_item_hidden_costs', backupDir),   r => prisma.quoteItemHiddenCost.createMany({ data: r, skipDuplicates: true }));
    await insert('quote_payment_terms',       load('quote_payment_terms', backupDir),       r => prisma.quotePaymentTerm.createMany({ data: r, skipDuplicates: true }));

    // ── 6. Proyectos y órdenes de servicio ────────────────────────────────────
    console.log('\n🏗️  Proyectos y servicios...');
    await insert('projects',                load('projects', backupDir),                r => prisma.project.createMany({ data: r, skipDuplicates: true }));
    await insert('project_quotes',          load('project_quotes', backupDir),          r => prisma.projectQuote.createMany({ data: r, skipDuplicates: true }));
    await insert('service_orders',          load('service_orders', backupDir),          r => prisma.serviceOrder.createMany({ data: r, skipDuplicates: true }));
    await insert('project_services',        load('project_services', backupDir),        r => prisma.projectService.createMany({ data: r, skipDuplicates: true }));
    await insert('service_order_tasks',     load('service_order_tasks', backupDir),     r => prisma.serviceOrderTask.createMany({ data: r, skipDuplicates: true }));
    await insert('service_order_materials', load('service_order_materials', backupDir), r => prisma.serviceOrderMaterial.createMany({ data: r, skipDuplicates: true }));
    await insert('service_order_labor',     load('service_order_labor', backupDir),     r => prisma.serviceOrderLabor.createMany({ data: r, skipDuplicates: true }));

    // ── 7. Campos personalizados ──────────────────────────────────────────────
    console.log('\n🔧 Campos personalizados...');
    await insert('entity_custom_fields', load('entity_custom_fields', backupDir), r => prisma.entityCustomField.createMany({ data: r, skipDuplicates: true }));

    // ── 8. Resetear secuencias ────────────────────────────────────────────────
    console.log('\n🔄 Reseteando secuencias de IDs...');
    await resetSequences();
    console.log('   ✅ Secuencias actualizadas al último ID insertado');

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE');
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error en restauración:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ── Determinar la carpeta de backup ──────────────────────────────────────────
function getBackupDir() {
  const arg = process.argv[2];
  if (arg) {
    const p = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
    if (!fs.existsSync(p)) throw new Error(`Carpeta no encontrada: ${p}`);
    return p;
  }

  const base = path.join(__dirname, 'backup');
  if (!fs.existsSync(base)) {
    throw new Error('No existe la carpeta scripts/backup. Ejecuta "npm run backup" primero.');
  }

  const backups = fs.readdirSync(base)
    .filter(d => fs.statSync(path.join(base, d)).isDirectory())
    .sort()
    .reverse();

  if (!backups.length) throw new Error('No hay backups disponibles en scripts/backup/');

  console.log(`📅 Usando backup más reciente: ${backups[0]}`);
  return path.join(base, backups[0]);
}

restoreDatabase(getBackupDir())
  .then(() => console.log('✅ Proceso finalizado'))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exitCode = 1;
  });
