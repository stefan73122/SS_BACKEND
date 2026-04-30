const prisma = require('../prisma/client');

async function getAllSuppliers({ page = 1, limit = 10, search = '' }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { documentNum: { contains: search, mode: 'insensitive' } },
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
  const { name, documentType, documentNum, rut, nit, ci, email, phone, address, city, country, contactPerson } = data;
  const resolvedDocumentNum = documentNum || nit || rut || ci || null;
  const resolvedDocumentType = documentType || (nit ? 'NIT' : rut ? 'NIT' : ci ? 'CI' : null);

  if (resolvedDocumentNum) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: { documentNum: resolvedDocumentNum },
    });
    if (existingSupplier) {
      throw new Error('Ya existe un proveedor con ese número de documento');
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      ...(resolvedDocumentType && { documentType: resolvedDocumentType }),
      ...(resolvedDocumentNum && { documentNum: resolvedDocumentNum }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(city && { city }),
      ...(country && { country }),
      ...(contactPerson && { contactPerson }),
    },
  });

  return supplier;
}

async function updateSupplier(id, data) {
  const { name, documentType, documentNum, rut, nit, ci, email, phone, address, city, country, contactPerson } = data;
  const resolvedDocumentNum = documentNum !== undefined ? documentNum : (nit || rut || ci);
  const resolvedDocumentType = documentType !== undefined ? documentType : (nit ? 'NIT' : rut ? 'NIT' : ci ? 'CI' : undefined);

  const supplier = await prisma.supplier.update({
    where: { id: BigInt(id) },
    data: {
      ...(name && { name }),
      ...(resolvedDocumentType !== undefined && { documentType: resolvedDocumentType }),
      ...(resolvedDocumentNum !== undefined && { documentNum: resolvedDocumentNum }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(contactPerson !== undefined && { contactPerson }),
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
