require('dotenv').config();
const prisma = require('../src/prisma/client');

async function checkWarehouseStock() {
  try {
    console.log('🔍 Verificando estado de almacenes y stock...\n');

    // 1. Listar todos los almacenes
    const warehouses = await prisma.warehouse.findMany({
      select: { id: true, code: true, name: true },
    });
    
    console.log('📦 ALMACENES EN BASE DE DATOS:');
    warehouses.forEach(w => {
      console.log(`   - ID: ${w.id}, Código: ${w.code}, Nombre: ${w.name}`);
    });
    console.log('');

    // 2. Contar productos
    const productCount = await prisma.product.count();
    console.log(`📊 Total de productos: ${productCount}\n`);

    // 3. Verificar stock por almacén
    console.log('📋 STOCK POR ALMACÉN:');
    for (const warehouse of warehouses) {
      const stocks = await prisma.warehouseStock.findMany({
        where: { warehouseId: warehouse.id },
        include: { product: { select: { sku: true, name: true } } },
      });
      
      console.log(`\n   ${warehouse.name} (ID: ${warehouse.id}):`);
      if (stocks.length === 0) {
        console.log('      ❌ Sin stock');
      } else {
        console.log(`      ✅ ${stocks.length} productos con stock`);
        stocks.slice(0, 5).forEach(s => {
          console.log(`         - ${s.product.sku}: ${s.product.name} (Qty: ${s.quantity})`);
        });
        if (stocks.length > 5) {
          console.log(`         ... y ${stocks.length - 5} productos más`);
        }
      }
    }

    // 4. Verificar productos sin stock asignado
    const productsWithoutStock = await prisma.product.findMany({
      where: {
        warehouseStocks: { none: {} },
      },
      select: { id: true, sku: true, name: true },
    });

    console.log(`\n\n⚠️  PRODUCTOS SIN STOCK ASIGNADO: ${productsWithoutStock.length}`);
    if (productsWithoutStock.length > 0) {
      productsWithoutStock.slice(0, 10).forEach(p => {
        console.log(`   - ${p.sku}: ${p.name}`);
      });
      if (productsWithoutStock.length > 10) {
        console.log(`   ... y ${productsWithoutStock.length - 10} productos más`);
      }
    }

    // 5. Verificar todos los registros de stock
    const allStocks = await prisma.warehouseStock.findMany({
      include: {
        warehouse: { select: { code: true, name: true } },
        product: { select: { sku: true, name: true } },
      },
    });

    console.log(`\n\n📊 TOTAL DE REGISTROS EN WAREHOUSE_STOCK: ${allStocks.length}`);
    if (allStocks.length > 0) {
      console.log('\nPrimeros 10 registros:');
      allStocks.slice(0, 10).forEach(s => {
        console.log(`   - Almacén: ${s.warehouse.name}, Producto: ${s.product.sku}, Cantidad: ${s.quantity}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkWarehouseStock()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
