require('dotenv').config();
const prisma = require('../src/prisma/client');
const fs = require('fs');
const path = require('path');

// BigInt y Decimal se convierten a string para JSON
function serialize(data) {
  return JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
}

async function dump(label, records, dir) {
  fs.writeFileSync(path.join(dir, `${label}.json`), serialize(records));
  console.log(`   ✅ ${label.padEnd(35)} ${records.length} registros`);
}

async function backupDatabase() {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(__dirname, 'backup', ts);
    fs.mkdirSync(backupDir, { recursive: true });

    console.log('\n📦 Iniciando backup de base de datos...');
    console.log(`📁 Carpeta: ${backupDir}\n`);

    // ── Configuración ────────────────────────────────────────────────────────
    await dump('company_settings',          await prisma.companySettings.findMany(),          backupDir);
    await dump('modules_registry',          await prisma.modulesRegistry.findMany(),          backupDir);

    // ── Acceso y permisos ────────────────────────────────────────────────────
    await dump('permissions',               await prisma.permission.findMany(),               backupDir);
    await dump('roles',                     await prisma.role.findMany(),                     backupDir);
    await dump('role_permissions',          await prisma.rolePermission.findMany(),           backupDir);

    // ── Tablas maestras ──────────────────────────────────────────────────────
    await dump('units',                     await prisma.unit.findMany(),                     backupDir);
    await dump('product_categories',        await prisma.productCategory.findMany(),          backupDir);
    await dump('warehouses',                await prisma.warehouse.findMany(),                backupDir);
    await dump('suppliers',                 await prisma.supplier.findMany(),                 backupDir);
    await dump('clients',                   await prisma.client.findMany(),                   backupDir);
    await dump('services',                  await prisma.service.findMany(),                  backupDir);

    // ── Usuarios ─────────────────────────────────────────────────────────────
    await dump('users',                     await prisma.user.findMany(),                     backupDir);
    await dump('user_roles',                await prisma.userRole.findMany(),                 backupDir);

    // ── Productos e inventario ────────────────────────────────────────────────
    await dump('products',                  await prisma.product.findMany(),                  backupDir);
    await dump('warehouse_stock',           await prisma.warehouseStock.findMany(),           backupDir);
    await dump('kits',                      await prisma.kit.findMany(),                      backupDir);
    await dump('kit_items',                 await prisma.kitItem.findMany(),                  backupDir);
    await dump('inventory_movements',       await prisma.inventoryMovement.findMany(),        backupDir);
    await dump('inventory_movement_items',  await prisma.inventoryMovementItem.findMany(),    backupDir);

    // ── Cotizaciones ──────────────────────────────────────────────────────────
    await dump('quotes',                    await prisma.quote.findMany(),                    backupDir);
    await dump('quote_items',               await prisma.quoteItem.findMany(),                backupDir);
    await dump('quote_item_details',        await prisma.quoteItemDetail.findMany(),          backupDir);
    await dump('quote_item_hidden_costs',   await prisma.quoteItemHiddenCost.findMany(),      backupDir);
    await dump('quote_payment_terms',       await prisma.quotePaymentTerm.findMany(),         backupDir);

    // ── Proyectos y órdenes de servicio ───────────────────────────────────────
    await dump('projects',                  await prisma.project.findMany(),                  backupDir);
    await dump('project_quotes',            await prisma.projectQuote.findMany(),             backupDir);
    await dump('service_orders',            await prisma.serviceOrder.findMany(),             backupDir);
    await dump('project_services',          await prisma.projectService.findMany(),           backupDir);
    await dump('service_order_tasks',       await prisma.serviceOrderTask.findMany(),         backupDir);
    await dump('service_order_materials',   await prisma.serviceOrderMaterial.findMany(),     backupDir);
    await dump('service_order_labor',       await prisma.serviceOrderLabor.findMany(),        backupDir);

    // ── Campos personalizados ─────────────────────────────────────────────────
    await dump('entity_custom_fields',      await prisma.entityCustomField.findMany(),        backupDir);

    // Metadata del backup
    const meta = {
      createdAt: new Date().toISOString(),
      nodeVersion: process.version,
      tables: fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json') && f !== 'meta.json')
        .map(f => f.replace('.json', '')),
    };
    fs.writeFileSync(path.join(backupDir, 'meta.json'), JSON.stringify(meta, null, 2));

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ BACKUP COMPLETADO EXITOSAMENTE');
    console.log(`📁 ${backupDir}`);
    console.log(`${'='.repeat(60)}\n`);
    console.log('💡 Para restaurar: npm run restore');
    console.log('   o con carpeta específica: npm run restore -- scripts/backup/<timestamp>\n');

  } catch (error) {
    console.error('❌ Error en backup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase()
  .then(() => console.log('✅ Proceso finalizado'))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exitCode = 1;
  });
