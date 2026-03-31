const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runMigrations() {
  try {
    console.log('🔄 Ejecutando migraciones de base de datos...');
    
    // Ejecutar prisma db push
    await execPromise('npx prisma db push --accept-data-loss');
    console.log('✅ Migraciones completadas');
    
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
