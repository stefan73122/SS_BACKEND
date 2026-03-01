const prisma = require('../prisma/client');

async function getMovements({ page = 1, limit = 10, search = '', productId = null, warehouseId = null, type = null, reason = null, startDate = null, endDate = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(type && { type }),
    ...(reason && { reason }),
    ...(warehouseId && {
      OR: [
        { warehouseFromId: BigInt(warehouseId) },
        { warehouseToId: BigInt(warehouseId) },
      ],
    }),
    ...(productId && {
      items: { some: { productId: BigInt(productId) } },
    }),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    } : {}),
    ...(search && {
      OR: [
        { note: { contains: search, mode: 'insensitive' } },
        { warehouseFrom: { name: { contains: search, mode: 'insensitive' } } },
        { warehouseTo: { name: { contains: search, mode: 'insensitive' } } },
        { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
      ],
    }),
  };

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        warehouseFrom: true,
        warehouseTo: true,
        supplier: true,
        creator: { select: { id: true, username: true, fullName: true } },
        items: {
          include: {
            product: {
              include: { category: true, unit: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  return {
    movements,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getMovementById(id) {
  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: BigInt(id) },
    include: {
      warehouseFrom: true,
      warehouseTo: true,
      supplier: true,
      creator: { select: { id: true, username: true, fullName: true } },
      items: {
        include: {
          product: {
            include: { category: true, unit: true },
          },
        },
      },
    },
  });

  if (!movement) {
    throw new Error('Movimiento no encontrado');
  }

  return movement;
}

async function createMovement(data) {
  const { productId, warehouseId, type, reason, quantity, notes, supplierId } = data;
  const userId = data.userId;

  const product = await prisma.product.findUnique({ where: { id: BigInt(productId) } });
  if (!product) throw new Error('Producto no encontrado');

  const warehouse = await prisma.warehouse.findUnique({ where: { id: BigInt(warehouseId) } });
  if (!warehouse) throw new Error('Almacén no encontrado');

  const qty = parseFloat(quantity);

  if (type === 'EGRESO') {
    const stock = await prisma.warehouseStock.findUnique({
      where: { productId_warehouseId: { productId: BigInt(productId), warehouseId: BigInt(warehouseId) } },
    });
    if (!stock || stock.quantity < qty) {
      throw new Error(`Stock insuficiente. Stock actual: ${stock?.quantity || 0}`);
    }
  }

  const movement = await prisma.$transaction(async (tx) => {
    const mov = await tx.inventoryMovement.create({
      data: {
        type,
        reason,
        note: notes || null,
        createdBy: BigInt(userId),
        ...(type === 'EGRESO' && { warehouseFromId: BigInt(warehouseId) }),
        ...(type === 'INGRESO' && { warehouseToId: BigInt(warehouseId) }),
        ...(type === 'AJUSTE' && { warehouseFromId: BigInt(warehouseId) }),
        ...(supplierId && { supplierId: BigInt(supplierId) }),
        items: {
          create: {
            productId: BigInt(productId),
            quantity: qty,
          },
        },
      },
      include: {
        warehouseFrom: true,
        warehouseTo: true,
        items: { include: { product: true } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
    });

    const stockDelta = type === 'EGRESO' ? -qty : qty;
    await tx.warehouseStock.upsert({
      where: { productId_warehouseId: { productId: BigInt(productId), warehouseId: BigInt(warehouseId) } },
      update: { quantity: { increment: stockDelta } },
      create: { productId: BigInt(productId), warehouseId: BigInt(warehouseId), quantity: Math.max(0, stockDelta) },
    });

    return mov;
  });

  return movement;
}

async function getMovementsSummary({ startDate = null, endDate = null, warehouseId = null }) {
  const where = {
    ...(warehouseId && {
      OR: [
        { warehouseFromId: BigInt(warehouseId) },
        { warehouseToId: BigInt(warehouseId) },
      ],
    }),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    } : {}),
  };

  const [totalIngresos, totalEgresos, totalTransferencias, totalAjustes, recentMovements] = await Promise.all([
    prisma.inventoryMovement.count({ where: { ...where, type: 'INGRESO' } }),
    prisma.inventoryMovement.count({ where: { ...where, type: 'EGRESO' } }),
    prisma.inventoryMovement.count({ where: { ...where, type: 'TRANSFERENCIA' } }),
    prisma.inventoryMovement.count({ where: { ...where, type: 'AJUSTE' } }),
    prisma.inventoryMovement.findMany({
      where,
      take: 5,
      include: {
        warehouseFrom: true,
        warehouseTo: true,
        items: { include: { product: { select: { sku: true, name: true } } } },
        creator: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    summary: {
      ingresos: { count: totalIngresos },
      egresos: { count: totalEgresos },
      transferencias: { count: totalTransferencias },
      ajustes: { count: totalAjustes },
    },
    recentMovements,
  };
}

module.exports = {
  getMovements,
  getMovementById,
  createMovement,
  getMovementsSummary,
};
