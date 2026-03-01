const { PrismaClient } = require('../../generated/prisma');

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: ['error'],
  });
}

const prisma = global.prisma;

module.exports = prisma;
