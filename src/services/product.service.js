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
      minStockGlobal: minStock || 0,
    },
    include: {
      category: true,
      unit: true,
    },
  });

  return product;
}

async function updateProduct(id, data) {
  const { name, description, categoryId, unitId, costPrice, salePrice, minStock } = data;

  const updateData = {
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(costPrice !== undefined && { costPrice }),
    ...(salePrice !== undefined && { salePrice }),
    ...(minStock !== undefined && { minStockGlobal: minStock }),
  };

  // Actualizar relaciones usando connect
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
