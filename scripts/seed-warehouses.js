require('dotenv').config();
const prisma = require('../src/prisma/client');

async function seedWarehouses() {
  try {
    console.log('🏭 Creando almacenes de ejemplo...\n');

    const warehouses = [
      {
        code: 'ALM-001',
        name: 'Almacén Principal',
        description: 'Bodega Central - Piso 1',
        type: 'PRINCIPAL',
        isActive: true,
      },
      {
        code: 'ALM-002',
        name: 'Almacén Herramientas',
        description: 'Bodega de Herramientas',
        type: 'HERRAMIENTAS',
        isActive: true,
      },
      {
        code: 'ALM-003',
        name: 'Almacén Eléctrico',
        description: 'Bodega de Material Eléctrico',
        type: 'ELECTRICO',
        isActive: true,
      },
    ];

    let created = 0;
    let existing = 0;

    for (const warehouseData of warehouses) {
      const existingWarehouse = await prisma.warehouse.findUnique({
        where: { code: warehouseData.code },
      });

      if (existingWarehouse) {
        console.log(`   ⚠️  Almacén ${warehouseData.code} ya existe`);
        existing++;
      } else {
        await prisma.warehouse.create({ data: warehouseData });
        console.log(`   ✅ Almacén ${warehouseData.code} - ${warehouseData.name} creado`);
        created++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALMACENES CREADOS EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\n✅ Almacenes creados: ${created}`);
    console.log(`⚠️  Almacenes existentes: ${existing}`);
    console.log(`📦 Total de almacenes: ${created + existing}\n`);

  } catch (error) {
    console.error('❌ Error creando almacenes:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedWarehouses()
  .then(() => {
    console.log('✅ Seeder de almacenes finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
