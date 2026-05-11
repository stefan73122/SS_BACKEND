const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function dropLegacyTriggers() {
  const prisma = require('./prisma/client');
  try {
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS auto_create_payment_terms ON quotes`;
    await prisma.$executeRaw`DROP FUNCTION IF EXISTS create_credit_payment_terms()`;
    console.log('✅ Triggers legacy eliminados');
  } catch (err) {
    console.warn('⚠️  No se pudieron eliminar triggers legacy:', err.message);
  }
}

async function runMigrations() {
  try {
    console.log('🔄 Ejecutando migraciones de base de datos...');

    // Ejecutar prisma db push
    await execPromise('npx prisma db push --accept-data-loss');
    console.log('✅ Migraciones completadas');

    // Eliminar triggers de DB que conflictúan con la lógica de la app
    await dropLegacyTriggers();

    // Ejecutar seeder
    console.log('🌱 Ejecutando seeder...');
    await execPromise('node scripts/seed-initial-data.js');
    console.log('✅ Seeder completado');

    return true;
  } catch (error) {
    console.error('❌ Error en migraciones:', error.message);
    // No lanzar error para que el servidor inicie de todos modos
    return false;
  }
}

module.exports = runMigrations;
