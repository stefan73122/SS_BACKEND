require('dotenv').config();
const prisma = require('../src/prisma/client');

async function resetDatabase() {
  try {
    console.log('🗑️  Iniciando limpieza de base de datos...\n');

    // Eliminar todos los datos en orden (respetando foreign keys)
    console.log('📝 Eliminando datos...');
    
    await prisma.auditLog.deleteMany();
    await prisma.reportsLog.deleteMany();
    await prisma.entityCustomField.deleteMany();
    await prisma.serviceOrderLabor.deleteMany();
    await prisma.serviceOrderMaterial.deleteMany();
    await prisma.serviceOrderTask.deleteMany();
    await prisma.projectQuote.deleteMany();
    await prisma.projectService.deleteMany();
    await prisma.serviceOrder.deleteMany();
    await prisma.project.deleteMany();
    await prisma.quoteItemStockCheck.deleteMany();
    await prisma.quoteItemHiddenCost.deleteMany();
    await prisma.quoteItemDetail.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.kitItem.deleteMany();
    await prisma.kit.deleteMany();
    await prisma.inventoryMovementItem.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.warehouseStock.deleteMany();
    await prisma.product.deleteMany();
    await prisma.productCategory.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.client.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.companySettings.deleteMany();
    await prisma.modulesRegistry.deleteMany();

    console.log('   ✅ Todos los datos eliminados\n');

    // Resetear las secuencias de autoincrement
    console.log('🔄 Reseteando secuencias de IDs...');
    
    const tables = [
      'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
      'clients', 'suppliers', 'product_categories', 'units', 'products',
      'warehouses', 'warehouse_stock', 'inventory_movements', 'inventory_movement_items',
      'kits', 'kit_items', 'quotes', 'quote_items', 'quote_item_details',
      'quote_item_hidden_costs', 'quote_item_stock_checks', 'projects',
      'service_orders', 'project_services', 'project_quotes', 'service_order_tasks',
      'service_order_materials', 'service_order_labor', 'company_settings',
      'modules_registry', 'entity_custom_fields', 'audit_log', 'reports_log'
    ];

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS ${table}_id_seq RESTART WITH 1;`);
    }

    console.log('   ✅ Secuencias reseteadas\n');

    console.log('='.repeat(60));
    console.log('✅ BASE DE DATOS LIMPIADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n💡 Ahora puedes ejecutar: npm run seed\n');

  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .then(() => {
    console.log('✅ Proceso finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
