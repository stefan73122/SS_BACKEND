const prisma = require('../prisma/client');

async function getAllWarehouses() {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      warehouseStocks: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return warehouses;
}

async function getWarehouseById(id) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: BigInt(id) },
    include: {
      warehouseStocks: {
        include: {
          product: {
            include: {
              category: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!warehouse) {
    throw new Error('Almacén no encontrado');
  }

  return warehouse;
}

async function createMovement(data) {
  const { productId, warehouseId, type, reason, quantity, notes, referenceId } = data;

  const product = await prisma.product.findUnique({
    where: { id: BigInt(productId) },
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  const stock = await prisma.warehouseStock.findUnique({
    where: {
      productId_warehouseId: {
        productId: BigInt(productId),
        warehouseId: BigInt(warehouseId),
      },
    },
  });

  let newQuantity = quantity;
  if (type === 'EGRESO') {
    if (!stock || stock.quantity < quantity) {
      throw new Error('Stock insuficiente para realizar el egreso');
    }
    newQuantity = -quantity;
  }

  const movement = await prisma.$transaction(async (tx) => {
    const mov = await tx.inventoryMovement.create({
      data: {
        productId: BigInt(productId),
        warehouseId: BigInt(warehouseId),
        type,
        reason,
        quantity: newQuantity,
        notes,
        referenceId: referenceId ? BigInt(referenceId) : null,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    await tx.warehouseStock.upsert({
      where: {
        productId_warehouseId: {
          productId: BigInt(productId),
          warehouseId: BigInt(warehouseId),
        },
      },
      update: {
        quantity: {
          increment: newQuantity,
        },
      },
      create: {
        productId: BigInt(productId),
        warehouseId: BigInt(warehouseId),
        quantity: Math.max(0, newQuantity),
      },
    });

    return mov;
  });

  return movement;
}

async function getMovements({ page = 1, limit = 10, productId = null, warehouseId = null, type = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(type && { type }),
    ...(warehouseId && {
      OR: [
        { warehouseFromId: BigInt(warehouseId) },
        { warehouseToId: BigInt(warehouseId) },
      ],
    }),
    ...(productId && {
      items: { some: { productId: BigInt(productId) } },
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
            product: { include: { category: true, unit: true } },
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

async function getInventory({ page = 1, limit = 10, search = '', categoryId = null, warehouseId = null, lowStockOnly = false }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(categoryId && { categoryId: BigInt(categoryId) }),
    // Filtrar solo productos que tengan stock en el almacén indicado
    ...(warehouseId && {
      warehouseStocks: { some: { warehouseId: BigInt(warehouseId) } },
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        category: true,
        supplier: true,
        unit: true,
        warehouseStocks: {
          include: { warehouse: true },
          ...(warehouseId && {
            where: { warehouseId: BigInt(warehouseId) },
          }),
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  // Calcular totales y formatear datos
  const inventory = products.map(product => {
    const totalStock = product.warehouseStocks.reduce((sum, s) => sum + parseFloat(s.quantity), 0);
    const stockByWarehouse = product.warehouseStocks.map(ws => ({
      warehouseId: ws.warehouseId.toString(),
      warehouseCode: ws.warehouse.code,
      warehouseName: ws.warehouse.name,
      quantity: parseFloat(ws.quantity),
    }));

    return {
      ...product,
      costPrice: product.costPrice || 0,
      salePrice: product.salePrice || 0,
      totalStock,
      stockByWarehouse,
      isLowStock: product.minStockGlobal ? totalStock <= product.minStockGlobal : false,
    };
  });

  // Filtrar por stock bajo si se solicita
  const filteredInventory = lowStockOnly 
    ? inventory.filter(item => item.isLowStock)
    : inventory;

  return {
    inventory: filteredInventory,
    pagination: {
      total: lowStockOnly ? filteredInventory.length : total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((lowStockOnly ? filteredInventory.length : total) / limitNum),
    },
  };
}

async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    include: {
      warehouseStocks: {
        include: {
          warehouse: true,
        },
      },
      category: true,
      unit: true,
    },
  });

  const lowStock = products.filter((product) => {
    const totalStock = product.warehouseStocks.reduce((sum, s) => sum + s.quantity, 0);
    return product.minStockGlobal && totalStock <= product.minStockGlobal;
  });

  return lowStock;
}

async function transferStock(data) {
  const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = data;

  if (fromWarehouseId === toWarehouseId) {
    throw new Error('Los almacenes de origen y destino no pueden ser iguales');
  }

  const fromStock = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_productId: {
        productId: BigInt(productId),
        warehouseId: BigInt(fromWarehouseId),
      },
    },
  });

  if (!fromStock || fromStock.quantity < quantity) {
    throw new Error('Stock insuficiente en el almacén de origen');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.create({
      data: {
        type: 'TRANSFERENCIA',
        reason: 'AJUSTE_MANUAL',
        note: notes || 'Transferencia entre almacenes',
        warehouseFromId: BigInt(fromWarehouseId),
        warehouseToId: BigInt(toWarehouseId),
        createdBy: BigInt(data.userId || 1),
        items: {
          create: {
            productId: BigInt(productId),
            quantity: quantity,
          },
        },
      },
    });

    await tx.warehouseStock.update({
      where: {
        warehouseId_productId: {
          productId: BigInt(productId),
          warehouseId: BigInt(fromWarehouseId),
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    await tx.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          productId: BigInt(productId),
          warehouseId: BigInt(toWarehouseId),
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        productId: BigInt(productId),
        warehouseId: BigInt(toWarehouseId),
        quantity: quantity,
      },
    });

    return { message: 'Transferencia realizada exitosamente' };
  });

  return result;
}

module.exports = {
  getAllWarehouses,
  getWarehouseById,
  createMovement,
  getMovements,
  getInventory,
  getLowStockProducts,
  transferStock,
};
