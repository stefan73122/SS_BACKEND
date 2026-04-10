const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../prisma/client');
const { createLowStockNotification } = require('../services/notification.service');

// Endpoint temporal para generar notificaciones de stock bajo
router.post('/generate-low-stock-notifications', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Verificando productos con stock bajo...');

    // Obtener todos los productos con su stock total
    const products = await prisma.product.findMany({
      include: {
        warehouseStocks: true,
      },
    });

    let lowStockCount = 0;
    let notificationsCreated = 0;
    const results = [];

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
          results.push({
            product: product.name,
            stock: totalStock,
            minStock,
            status: 'created',
          });
          console.log(`   ✅ Notificación creada`);
        } catch (error) {
          results.push({
            product: product.name,
            stock: totalStock,
            minStock,
            status: 'error',
            error: error.message,
          });
          console.log(`   ❌ Error al crear notificación: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Total productos: ${products.length}`);
    console.log(`   Productos con stock bajo: ${lowStockCount}`);
    console.log(`   Notificaciones creadas: ${notificationsCreated}`);

    res.json({
      success: true,
      summary: {
        totalProducts: products.length,
        lowStockProducts: lowStockCount,
        notificationsCreated,
      },
      details: results,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
