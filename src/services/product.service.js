const prisma = require('../prisma/client');

async function getAllProducts({ page = 1, limit = 10, search = '', categoryId = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(categoryId && { categoryId: BigInt(categoryId) }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        category: true,
        unit: true,
        warehouseStocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  // Transformar productos para compatibilidad con frontend
  const transformedProducts = products.map(product => ({
    ...product,
    id: product.id.toString(),
    categoryId: product.categoryId ? product.categoryId.toString() : null,
    unitId: product.unitId.toString(),
    minStock: product.minStockGlobal, // Mapear minStockGlobal a minStock
  }));

  return {
    products: transformedProducts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id: BigInt(id) },
    include: {
      category: true,
      unit: true,
      warehouseStocks: {
        include: {
          warehouse: true,
        },
      },
      inventoryMovementItems: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          inventoryMovement: {
            select: {
              id: true,
              type: true,
              reason: true,
              note: true,
              movementDate: true,
              warehouseToId: true,
              warehouseFromId: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  // Transformar para compatibilidad con frontend
  return {
    ...product,
    id: product.id.toString(),
    categoryId: product.categoryId ? product.categoryId.toString() : null,
    unitId: product.unitId.toString(),
    minStock: product.minStockGlobal, // Mapear minStockGlobal a minStock
  };
}

async function createProduct(data, userId = null) {
  const { name, sku, description, categoryId, unitId, costPrice, salePrice, minStock, supplierId } = data;
  const brand = data.brand || data.marca || undefined;
  const origin = data.origin || data.origen || undefined;
  const manufacturerCode = data.manufacturerCode || data.manufacturer_code || data.codigoFabricante || data.codigo_fabricante || undefined;
  const initialQuantity = data.quantity != null ? parseFloat(data.quantity) : null;
  const initialWarehouseId = data.warehouseId || null;

  if (!unitId) {
    throw new Error('La unidad es obligatoria para crear un producto');
  }

  const existingProduct = await prisma.product.findUnique({
    where: { sku },
  });

  if (existingProduct) {
    throw new Error('Ya existe un producto con ese SKU');
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      description,
      categoryId: categoryId ? BigInt(categoryId) : null,
      unitId: BigInt(unitId),
      costPrice,
      salePrice,
      minStockGlobal: minStock || 0,
      ...(brand !== undefined && { brand }),
      ...(origin !== undefined && { origin }),
      ...(manufacturerCode !== undefined && { manufacturerCode }),
      ...(supplierId ? { supplierId: BigInt(supplierId) } : {}),
      ...(userId ? { createdBy: BigInt(userId) } : {}),
    },
    include: {
      category: true,
      unit: true,
    },
  });

  // Si viene stock inicial con almacén, crear WarehouseStock + movimiento INGRESO
  if (initialWarehouseId && initialQuantity != null && initialQuantity > 0) {
    const whId = BigInt(initialWarehouseId);
    const createdByBig = userId ? BigInt(userId) : BigInt(1);
    await prisma.$transaction(async (tx) => {
      await tx.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: whId, productId: product.id } },
        create: { productId: product.id, warehouseId: whId, quantity: initialQuantity },
        update: { quantity: { increment: initialQuantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          type: 'INGRESO',
          reason: 'COMPRA',
          note: 'Stock inicial al crear producto',
          createdBy: createdByBig,
          warehouseToId: whId,
          items: { create: { productId: product.id, quantity: initialQuantity } },
        },
      });
    });
  }

  // Registrar en AuditLog
  await prisma.auditLog.create({
    data: {
      userId: userId ? BigInt(userId) : null,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      newValues: JSON.stringify({ sku: product.sku, name: product.name }),
    },
  }).catch(() => {});

  return product;
}

async function updateProduct(id, data) {
  const { name, description, categoryId, unitId, costPrice, salePrice, minStock, supplierId } = data;
  const brand = data.brand !== undefined ? data.brand : data.marca;
  const origin = data.origin !== undefined ? data.origin : data.origen;
  const manufacturerCode = data.manufacturerCode !== undefined ? data.manufacturerCode
    : data.manufacturer_code !== undefined ? data.manufacturer_code
    : data.codigoFabricante !== undefined ? data.codigoFabricante
    : data.codigo_fabricante;

  const updateData = {
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(costPrice !== undefined && { costPrice }),
    ...(salePrice !== undefined && { salePrice }),
    ...(minStock !== undefined && { minStockGlobal: minStock }),
    ...(brand !== undefined && { brand }),
    ...(origin !== undefined && { origin }),
    ...(manufacturerCode !== undefined && { manufacturerCode }),
  };

  // Actualizar relaciones usando connect
  if (supplierId !== undefined) {
    updateData.supplier = supplierId ? { connect: { id: BigInt(supplierId) } } : { disconnect: true };
  }

  if (categoryId !== undefined) {
    if (categoryId === null) {
      updateData.category = { disconnect: true };
    } else {
      updateData.category = { connect: { id: BigInt(categoryId) } };
    }
  }

  if (unitId) {
    updateData.unit = { connect: { id: BigInt(unitId) } };
  }

  const product = await prisma.product.update({
    where: { id: BigInt(id) },
    data: updateData,
    include: {
      category: true,
      unit: true,
    },
  });

  // Transformar para compatibilidad con frontend
  return {
    ...product,
    id: product.id.toString(),
    categoryId: product.categoryId ? product.categoryId.toString() : null,
    unitId: product.unitId.toString(),
    minStock: product.minStockGlobal, // Mapear minStockGlobal a minStock
  };
}

async function deleteProduct(id, userId = null) {
  const product = await prisma.product.findUnique({
    where: { id: BigInt(id) },
    include: {
      warehouseStocks: {
        where: { quantity: { gt: 0 } },
        include: { warehouse: { select: { id: true, name: true } } },
      },
    },
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  const deletedAt = new Date();
  const createdByBig = userId ? BigInt(userId) : BigInt(1);

  await prisma.$transaction(async (tx) => {
    // Soft delete del producto
    await tx.product.update({
      where: { id: BigInt(id) },
      data: {
        isActive: false,
        deletedAt,
        ...(userId ? { deletedBy: BigInt(userId) } : {}),
      },
    });

    // Crear movimiento EGRESO por cada almacén con stock
    for (const stock of product.warehouseStocks) {
      const qty = parseFloat(stock.quantity);
      if (qty > 0) {
        await tx.inventoryMovement.create({
          data: {
            type: 'EGRESO',
            reason: 'AJUSTE_MANUAL',
            note: `Baja de producto: ${product.name} (SKU: ${product.sku})`,
            createdBy: createdByBig,
            warehouseFromId: stock.warehouseId,
            items: { create: { productId: product.id, quantity: qty } },
          },
        });
      }
    }

    // Registrar en AuditLog
    await tx.auditLog.create({
      data: {
        userId: userId ? BigInt(userId) : null,
        action: 'DELETE',
        entityType: 'Product',
        entityId: product.id,
        oldValues: JSON.stringify({ sku: product.sku, name: product.name, isActive: true }),
        newValues: JSON.stringify({ isActive: false, deletedAt }),
      },
    });
  });

  return { message: 'Producto desactivado exitosamente' };
}

async function getProductStock(id) {
  const stock = await prisma.warehouseStock.findMany({
    where: { productId: BigInt(id) },
    include: {
      warehouse: true,
      product: { select: { id: true, name: true, sku: true } },
    },
  });

  return stock.map(s => ({
    ...s,
    quantity: parseFloat(s.quantity),
  }));
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStock,
};
