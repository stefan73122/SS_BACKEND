const prisma = require('../prisma/client');

async function getAllWarehouses({ page = 1, limit = 10, search = '' }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [warehouses, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.warehouse.count({ where }),
  ]);

  return {
    warehouses,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getWarehouseById(id) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: BigInt(id) },
    include: {
      warehouseStocks: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!warehouse) {
    throw new Error('Almacén no encontrado');
  }

  return warehouse;
}

async function createWarehouse(data) {
  const { code, name, description, type = 'PRINCIPAL', parentId, isActive = true } = data;

  if (!code) {
    throw new Error('El código del almacén es requerido');
  }

  const existingWarehouse = await prisma.warehouse.findUnique({
    where: { code },
  });

  if (existingWarehouse) {
    throw new Error('Ya existe un almacén con ese código');
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      code,
      name,
      description,
      type,
      ...(parentId && { parentId: BigInt(parentId) }),
      isActive,
    },
  });

  return warehouse;
}

async function updateWarehouse(id, data) {
  const { code, name, description, type, parentId, isActive } = data;

  const existingWarehouse = await prisma.warehouse.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingWarehouse) {
    throw new Error('Almacén no encontrado');
  }

  if (code && code !== existingWarehouse.code) {
    const codeConflict = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (codeConflict) {
      throw new Error('Ya existe un almacén con ese código');
    }
  }

  const warehouse = await prisma.warehouse.update({
    where: { id: BigInt(id) },
    data: {
      ...(code && { code }),
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(type && { type }),
      ...(parentId !== undefined && { parentId: parentId ? BigInt(parentId) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return warehouse;
}

async function deleteWarehouse(id) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: BigInt(id) },
  });

  if (!warehouse) {
    throw new Error('Almacén no encontrado');
  }

  const hasStock = await prisma.warehouseStock.findFirst({
    where: { warehouseId: BigInt(id) },
  });

  if (hasStock) {
    throw new Error('No se puede eliminar un almacén que tiene stock registrado');
  }

  await prisma.warehouse.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Almacén eliminado exitosamente' };
}

async function getWarehouseStock(id) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: BigInt(id) },
  });

  if (!warehouse) {
    throw new Error('Almacén no encontrado');
  }

  const stocks = await prisma.warehouseStock.findMany({
    where: { warehouseId: BigInt(id) },
    include: {
      product: true,
    },
    orderBy: { product: { name: 'asc' } },
  });

  return {
    warehouse,
    stocks,
    totalProducts: stocks.length,
    totalQuantity: stocks.reduce((sum, stock) => sum + stock.quantity, 0),
  };
}

module.exports = {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStock,
};
