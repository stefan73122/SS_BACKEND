require('dotenv').config();
const prisma = require('../src/prisma/client');

async function addWarehouseColumn() {
  try {
    console.log('✅ Conectado a la base de datos');

    // Verificar si la columna ya existe
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'warehouse_id';
    `;

    if (checkColumn.length > 0) {
      console.log('⚠️  La columna warehouse_id ya existe');
      return;
    }

    console.log('📝 Agregando columna warehouse_id a la tabla users...');

    // Agregar columna warehouse_id
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN "warehouse_id" BIGINT;
    `;
    console.log('✅ Columna warehouse_id agregada');

    // Agregar foreign key
    await prisma.$executeRaw`
      ALTER TABLE "users" 
      ADD CONSTRAINT "users_warehouse_id_fkey" 
      FOREIGN KEY ("warehouse_id") 
      REFERENCES "warehouses"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `;
    console.log('✅ Foreign key agregada');

    console.log('\n🎉 Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addWarehouseColumn()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
