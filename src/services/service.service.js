const prisma = require('../prisma/client');

async function getAllServices({ page = 1, limit = 10, search = '', isActive } = {}) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
  };

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getServiceById(id) {
  const service = await prisma.service.findUnique({
    where: { id: BigInt(id) },
  });
  if (!service) throw new Error('Servicio no encontrado');
  return service;
}

async function createService({ sku, description, unitPrice, isActive }) {
  if (!description) throw new Error('La descripción es requerida');
  if (unitPrice === undefined || unitPrice === null) throw new Error('El precio unitario es requerido');

  return prisma.service.create({
    data: {
      sku: sku || null,
      description,
      unitPrice: parseFloat(unitPrice),
      isActive: isActive !== undefined ? isActive : true,
    },
  });
}

async function updateService(id, { sku, description, unitPrice, isActive }) {
  await getServiceById(id);

  return prisma.service.update({
    where: { id: BigInt(id) },
    data: {
      ...(sku !== undefined && { sku }),
      ...(description !== undefined && { description }),
      ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

async function deleteService(id) {
  await getServiceById(id);
  await prisma.service.delete({ where: { id: BigInt(id) } });
  return { message: 'Servicio eliminado correctamente' };
}

module.exports = { getAllServices, getServiceById, createService, updateService, deleteService };
