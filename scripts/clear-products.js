require('dotenv').config();
const prisma = require('../src/prisma/client');

async function clearProducts() {
  try {
    console.log('🗑️  Eliminando todos los productos y datos relacionados...\n');

    // Eliminar en orden correcto para respetar las relaciones de foreign keys
    console.log('Eliminando datos relacionados con productos...');
    
    // Eliminar stock checks de cotizaciones
    await prisma.quoteItemStockCheck.deleteMany({});
    console.log('   ✅ QuoteItemStockCheck eliminados');
    
    // Eliminar materiales de órdenes de servicio
    await prisma.serviceOrderMaterial.deleteMany({});
    console.log('   ✅ ServiceOrderMaterial eliminados');
    
    // Eliminar items de kits
    await prisma.kitItem.deleteMany({});
    console.log('   ✅ KitItem eliminados');
    
    // Eliminar items de movimientos de inventario
    await prisma.inventoryMovementItem.deleteMany({});
    console.log('   ✅ InventoryMovementItem eliminados');
    
    // Eliminar movimientos de inventario
    await prisma.inventoryMovement.deleteMany({});
    console.log('   ✅ InventoryMovement eliminados');
    
    // Eliminar items de cotizaciones
    await prisma.quoteItem.deleteMany({});
    console.log('   ✅ QuoteItem eliminados');
    
    // Eliminar stock de almacenes
    await prisma.warehouseStock.deleteMany({});
    console.log('   ✅ WarehouseStock eliminados');
    
    // Finalmente, eliminar productos
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`   ✅ ${deletedProducts.count} Productos eliminados`);
    
    // Eliminar unidades huérfanas (opcional)
    await prisma.unit.deleteMany({});
    console.log('   ✅ Units eliminadas');
    
    // Eliminar categorías huérfanas (opcional)
    await prisma.productCategory.deleteMany({});
    console.log('   ✅ ProductCategory eliminadas');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRODUCTOS ELIMINADOS EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\n✅ Total de productos eliminados: ${deletedProducts.count}`);
    console.log('⚠️  Se eliminaron también:');
    console.log('   - Stock de almacenes');
    console.log('   - Movimientos de inventario');
    console.log('   - Items de cotizaciones');
    console.log('   - Items de kits');
    console.log('   - Categorías y unidades\n');

  } catch (error) {
    console.error('❌ Error eliminando productos:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearProducts()
  .then(() => {
    console.log('✅ Proceso de eliminación completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
