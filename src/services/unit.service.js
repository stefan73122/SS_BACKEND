const prisma = require('../prisma/client');

async function getAllUnits() {
  const units = await prisma.unit.findMany({
    orderBy: { name: 'asc' },
  });

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

  return {
    ...unit,
    id: unit.id.toString(),
  };
}

async function createUnit(data) {
  const { code, name } = data;

  if (!code || !name) {
    throw new Error('El código y el nombre son obligatorios');
  }

  const existing = await prisma.unit.findUnique({ where: { code } });
  if (existing) {
    throw new Error('Ya existe una unidad con ese código');
  }

  const unit = await prisma.unit.create({
    data: { code, name },
  });

  return { ...unit, id: unit.id.toString() };
}

async function updateUnit(id, data) {
  const { code, name } = data;

  const existing = await prisma.unit.findUnique({ where: { id: BigInt(id) } });
  if (!existing) {
    throw new Error('Unidad no encontrada');
  }

  if (code && code !== existing.code) {
    const codeInUse = await prisma.unit.findUnique({ where: { code } });
    if (codeInUse) {
      throw new Error('Ya existe una unidad con ese código');
    }
  }

  const unit = await prisma.unit.update({
    where: { id: BigInt(id) },
    data: {
      ...(code && { code }),
      ...(name && { name }),
    },
  });

  return { ...unit, id: unit.id.toString() };
}

async function deleteUnit(id) {
  const existing = await prisma.unit.findUnique({
    where: { id: BigInt(id) },
    include: { _count: { select: { products: true } } },
  });

  if (!existing) {
    throw new Error('Unidad no encontrada');
  }

  if (existing._count.products > 0) {
    throw new Error(
      `No se puede eliminar: ${existing._count.products} producto(s) usan esta unidad`
    );
  }

  await prisma.unit.delete({ where: { id: BigInt(id) } });

  return { message: 'Unidad eliminada exitosamente' };
}

module.exports = {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
};
