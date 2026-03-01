const prisma = require('../prisma/client');

async function getAllSuppliers({ page = 1, limit = 10, search = '' }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { rut: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    suppliers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getSupplierById(id) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: BigInt(id) },
  });

  if (!supplier) {
    throw new Error('Proveedor no encontrado');
  }

  return supplier;
}

async function createSupplier(data) {
  const { name, rut, email, phone, address, contactPerson } = data;

  const existingSupplier = await prisma.supplier.findUnique({
    where: { rut },
  });

  if (existingSupplier) {
    throw new Error('Ya existe un proveedor con ese RUT');
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      rut,
      email,
      phone,
      address,
      contactPerson,
    },
  });

  return supplier;
}

async function updateSupplier(id, data) {
  const { name, email, phone, address, contactPerson } = data;

  const supplier = await prisma.supplier.update({
    where: { id: BigInt(id) },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(contactPerson && { contactPerson }),
    },
  });

  return supplier;
}

async function deleteSupplier(id) {
  await prisma.supplier.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Proveedor eliminado exitosamente' };
}

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
