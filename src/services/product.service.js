const prisma = require('../prisma/client');

async function getAllProducts({ page = 1, limit = 10, search = '', categoryId = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = {
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

  return {
    products,
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

  return product;
}

async function createProduct(data) {
  const { name, sku, description, categoryId, unitId, costPrice, salePrice, minStock } = data;

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
      minStock: minStock || 0,
    },
    include: {
      category: true,
      unit: true,
    },
  });

  return product;
}

async function updateProduct(id, data) {
  // Destructure all known fields explicitly — categoryId must never be passed
  // directly to Prisma as a scalar field; it must go through the relation syntax.
  const { name, description, categoryId, unitId, costPrice, salePrice, minStock } = data;

  const updateData = {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(costPrice !== undefined && { costPrice }),
    ...(salePrice !== undefined && { salePrice }),
    ...(minStock !== undefined && { minStock }),
  };

  // Ensure categoryId is never present as a direct scalar field on updateData.
  // Prisma requires relationship updates to use connect/disconnect syntax.
  delete updateData.categoryId;

  // Actualizar relaciones usando connect
  if (categoryId !== undefined) {
    // Treat the string "null" (from form submissions) the same as actual null
    const resolvedCategoryId = categoryId === 'null' ? null : categoryId;
    if (resolvedCategoryId === null) {
      updateData.category = { disconnect: true };
    } else {
      updateData.category = { connect: { id: BigInt(resolvedCategoryId) } };
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

  return product;
}

async function deleteProduct(id) {
  await prisma.product.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Producto eliminado exitosamente' };
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
