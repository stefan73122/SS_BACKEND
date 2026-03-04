require('dotenv').config();
const prisma = require('../src/prisma/client');

async function clearAllData() {
  try {
    console.log('🗑️  Iniciando eliminación de todos los datos...\n');

    // Eliminar en orden correcto para respetar las relaciones de foreign keys
    console.log('Eliminando datos de tablas relacionadas...');
    
    await prisma.reportsLog.deleteMany({});
    console.log('   ✅ ReportsLog eliminados');
    
    await prisma.auditLog.deleteMany({});
    console.log('   ✅ AuditLog eliminados');
    
    await prisma.entityCustomField.deleteMany({});
    console.log('   ✅ EntityCustomField eliminados');
    
    await prisma.serviceOrderLabor.deleteMany({});
    console.log('   ✅ ServiceOrderLabor eliminados');
    
    await prisma.serviceOrderMaterial.deleteMany({});
    console.log('   ✅ ServiceOrderMaterial eliminados');
    
    await prisma.serviceOrderTask.deleteMany({});
    console.log('   ✅ ServiceOrderTask eliminados');
    
    await prisma.projectQuote.deleteMany({});
    console.log('   ✅ ProjectQuote eliminados');
    
    await prisma.projectService.deleteMany({});
    console.log('   ✅ ProjectService eliminados');
    
    await prisma.serviceOrder.deleteMany({});
    console.log('   ✅ ServiceOrder eliminados');
    
    await prisma.project.deleteMany({});
    console.log('   ✅ Project eliminados');
    
    await prisma.quoteItemStockCheck.deleteMany({});
    console.log('   ✅ QuoteItemStockCheck eliminados');
    
    await prisma.quoteItemHiddenCost.deleteMany({});
    console.log('   ✅ QuoteItemHiddenCost eliminados');
    
    await prisma.quoteItemDetail.deleteMany({});
    console.log('   ✅ QuoteItemDetail eliminados');
    
    await prisma.quoteItem.deleteMany({});
    console.log('   ✅ QuoteItem eliminados');
    
    await prisma.quote.deleteMany({});
    console.log('   ✅ Quote eliminados');
    
    await prisma.kitItem.deleteMany({});
    console.log('   ✅ KitItem eliminados');
    
    await prisma.kit.deleteMany({});
    console.log('   ✅ Kit eliminados');
    
    await prisma.inventoryMovementItem.deleteMany({});
    console.log('   ✅ InventoryMovementItem eliminados');
    
    await prisma.inventoryMovement.deleteMany({});
    console.log('   ✅ InventoryMovement eliminados');
    
    await prisma.warehouseStock.deleteMany({});
    console.log('   ✅ WarehouseStock eliminados');
    
    await prisma.warehouse.deleteMany({});
    console.log('   ✅ Warehouse eliminados');
    
    await prisma.product.deleteMany({});
    console.log('   ✅ Product eliminados');
    
    await prisma.unit.deleteMany({});
    console.log('   ✅ Unit eliminados');
    
    await prisma.productCategory.deleteMany({});
    console.log('   ✅ ProductCategory eliminados');
    
    await prisma.supplier.deleteMany({});
    console.log('   ✅ Supplier eliminados');
    
    await prisma.client.deleteMany({});
    console.log('   ✅ Client eliminados');
    
    await prisma.userRole.deleteMany({});
    console.log('   ✅ UserRole eliminados');
    
    await prisma.user.deleteMany({});
    console.log('   ✅ User eliminados');
    
    await prisma.rolePermission.deleteMany({});
    console.log('   ✅ RolePermission eliminados');
    
    await prisma.role.deleteMany({});
    console.log('   ✅ Role eliminados');
    
    await prisma.permission.deleteMany({});
    console.log('   ✅ Permission eliminados');
    
    await prisma.modulesRegistry.deleteMany({});
    console.log('   ✅ ModulesRegistry eliminados');
    
    await prisma.companySettings.deleteMany({});
    console.log('   ✅ CompanySettings eliminados');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TODOS LOS DATOS HAN SIDO ELIMINADOS');
    console.log('='.repeat(60));
    console.log('\n⚠️  La base de datos está completamente vacía.');
    console.log('💡 Ejecuta los seeders para volver a crear datos iniciales:\n');
    console.log('   node scripts/seed-initial-data.js');
    console.log('   node scripts/seed-warehouses.js\n');

  } catch (error) {
    console.error('❌ Error eliminando datos:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData()
  .then(() => {
    console.log('✅ Proceso de eliminación completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
