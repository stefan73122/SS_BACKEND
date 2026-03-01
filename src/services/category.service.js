const prisma = require('../prisma/client');

async function getAllCategories({ page = 1, limit = 10, search = '' }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [categories, total] = await Promise.all([
    prisma.productCategory.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
    prisma.productCategory.count({ where }),
  ]);

  return {
    categories,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getCategoryById(id) {
  const category = await prisma.productCategory.findUnique({
    where: { id: BigInt(id) },
    include: {
      products: {
        take: 10,
        orderBy: { name: 'asc' },
      },
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new Error('Categoría no encontrada');
  }

  return category;
}

async function createCategory(data) {
  const { name, description } = data;

  if (!name) {
    throw new Error('El nombre de la categoría es requerido');
  }

  const existingCategory = await prisma.productCategory.findUnique({
    where: { name },
  });

  if (existingCategory) {
    throw new Error('Ya existe una categoría con ese nombre');
  }

  const category = await prisma.productCategory.create({
    data: {
      name,
      description,
    },
  });

  return category;
}

async function updateCategory(id, data) {
  const { name, description } = data;

  const existingCategory = await prisma.productCategory.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingCategory) {
    throw new Error('Categoría no encontrada');
  }

  if (name && name !== existingCategory.name) {
    const nameConflict = await prisma.productCategory.findUnique({
      where: { name },
    });

    if (nameConflict) {
      throw new Error('Ya existe una categoría con ese nombre');
    }
  }

  const category = await prisma.productCategory.update({
    where: { id: BigInt(id) },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    },
  });

  return category;
}

async function deleteCategory(id) {
  const category = await prisma.productCategory.findUnique({
    where: { id: BigInt(id) },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new Error('Categoría no encontrada');
  }

  if (category._count.products > 0) {
    throw new Error(`No se puede eliminar la categoría porque tiene ${category._count.products} producto(s) asociado(s)`);
  }

  await prisma.productCategory.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Categoría eliminada exitosamente' };
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
