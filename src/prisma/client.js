const { PrismaClient } = require('../../generated/prisma');

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=1&pool_timeout=10',
      },
    },
  });

  // Manejar desconexiones y reconexiones automáticas
  global.prisma.$connect().catch((err) => {
    console.error('Error conectando a la base de datos:', err);
  });

  // Cerrar conexiones al terminar el proceso
  process.on('beforeExit', async () => {
    await global.prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    await global.prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await global.prisma.$disconnect();
    process.exit(0);
  });
}

const prisma = global.prisma;

module.exports = prisma;
