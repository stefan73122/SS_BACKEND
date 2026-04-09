const { PrismaClient } = require('../generated/prisma');
const { createLowStockNotification } = require('../src/services/notification.service');

const prisma = new PrismaClient();

async function checkLowStock() {
  console.log('🔍 Verificando productos con stock bajo...\n');

  try {
    // Obtener todos los productos con su stock total
    const products = await prisma.product.findMany({
      include: {
        warehouseStocks: true,
      },
    });

    let lowStockCount = 0;
    let notificationsCreated = 0;

    for (const product of products) {
      // Calcular stock total
      const totalStock = product.warehouseStocks.reduce(
        (sum, stock) => sum + Number(stock.quantity),
        0
      );

      const minStock = Number(product.minStockGlobal) || 0;

      // Si el stock está bajo el mínimo
      if (totalStock <= minStock && totalStock > 0) {
        lowStockCount++;
        console.log(`⚠️  ${product.name} - Stock: ${totalStock}/${minStock}`);

        try {
          await createLowStockNotification(
            product.id.toString(),
            product.name,
            totalStock,
            minStock
          );
          notificationsCreated++;
          console.log(`   ✅ Notificación creada`);
        } catch (error) {
          console.log(`   ❌ Error al crear notificación: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Total productos: ${products.length}`);
    console.log(`   Productos con stock bajo: ${lowStockCount}`);
    console.log(`   Notificaciones creadas: ${notificationsCreated}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLowStock();
