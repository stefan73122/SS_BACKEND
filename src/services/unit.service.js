const prisma = require('../prisma/client');

async function getAllUnits() {
  const units = await prisma.unit.findMany({
    orderBy: { name: 'asc' },
  });

  return units;
}

async function getUnitById(id) {
  const unit = await prisma.unit.findUnique({
    where: { id: BigInt(id) },
  });

  if (!unit) {
    throw new Error('Unidad no encontrada');
  }

  return unit;
}

module.exports = {
  getAllUnits,
  getUnitById,
};
