const prisma = require('../prisma/client');

async function getAllUnits() {
  const units = await prisma.unit.findMany({
    orderBy: { name: 'asc' },
  });

  // Convertir BigInt a string para serialización JSON
  return units.map(unit => ({
    ...unit,
    id: unit.id.toString(),
  }));
}

async function getUnitById(id) {
  const unit = await prisma.unit.findUnique({
    where: { id: BigInt(id) },
  });

  if (!unit) {
    throw new Error('Unidad no encontrada');
  }

  // Convertir BigInt a string para serialización JSON
  return {
    ...unit,
    id: unit.id.toString(),
  };
}

module.exports = {
  getAllUnits,
  getUnitById,
};
