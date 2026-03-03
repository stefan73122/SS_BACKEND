const { PrismaClient } = require('../../generated/prisma');

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Manejar desconexiones y reconexiones automáticas
  global.prisma.$connect().catch((err) => {
    console.error('Error conectando a la base de datos:', err);
  });
}

const prisma = global.prisma;

// Reconectar automáticamente si la conexión se cierra
prisma.$on('beforeExit', async () => {
  console.log('Prisma desconectándose...');
});

module.exports = prisma;
