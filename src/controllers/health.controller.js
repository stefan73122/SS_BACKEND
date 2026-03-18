const prisma = require('../prisma/client');

async function checkDatabase(req, res) {
  try {
    // Verificar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;
    
    // Verificar si la tabla units existe y tiene datos
    const units = await prisma.unit.findMany();
    
    // Verificar otras tablas importantes
    const permissions = await prisma.permission.count();
    const roles = await prisma.role.count();
    
    res.json({
      status: 'ok',
      database: 'connected',
      tables: {
        units: {
          exists: true,
          count: units.length,
          data: units
        },
        permissions: {
          count: permissions
        },
        roles: {
          count: roles
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}

module.exports = {
  checkDatabase
};
