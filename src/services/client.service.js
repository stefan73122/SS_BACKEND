const prisma = require('../prisma/client');

async function getAllClients({ page = 1, limit = 10, search = '', clientType = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { documentNum: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(clientType && { clientType }),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    clients,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getClientById(id) {
  const client = await prisma.client.findUnique({
    where: { id: BigInt(id) },
    include: {
      quotes: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      projects: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!client) {
    throw new Error('Cliente no encontrado');
  }

  return client;
}

async function createClient(data) {
  const { 
    name, 
    documentType, 
    documentNum, 
    email, 
    phone, 
    address, 
    city,
    country,
    clientType = 'REGULAR',
    discountPercent = 0,
    creditEnabled = false,
    creditDays = 60,
    creditMarkupPercent = 15.00,
    isActive = true
  } = data;

  if (!name) {
    throw new Error('El nombre del cliente es requerido');
  }

  // Validar si ya existe un cliente con el mismo documento
  if (documentNum) {
    const existingClient = await prisma.client.findFirst({
      where: { 
        documentNum,
        documentType
      },
    });

    if (existingClient) {
      throw new Error('Ya existe un cliente con ese número de documento');
    }
  }

  const client = await prisma.client.create({
    data: {
      name,
      documentType,
      documentNum,
      email,
      phone,
      address,
      city,
      country,
      clientType,
      discountPercent,
      creditEnabled,
      creditDays,
      creditMarkupPercent,
      isActive,
    },
  });

  return client;
}

async function updateClient(id, data) {
  const { 
    name, 
    documentType,
    documentNum,
    email, 
    phone, 
    address, 
    city,
    country,
    clientType,
    discountPercent,
    creditEnabled,
    creditDays,
    creditMarkupPercent,
    isActive
  } = data;

  const existingClient = await prisma.client.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingClient) {
    throw new Error('Cliente no encontrado');
  }

  // Validar si el documento ya existe en otro cliente
  if (documentNum && (documentNum !== existingClient.documentNum || documentType !== existingClient.documentType)) {
    const documentConflict = await prisma.client.findFirst({
      where: { 
        documentNum,
        documentType,
        id: { not: BigInt(id) }
      },
    });

    if (documentConflict) {
      throw new Error('Ya existe otro cliente con ese número de documento');
    }
  }

  const client = await prisma.client.update({
    where: { id: BigInt(id) },
    data: {
      ...(name && { name }),
      ...(documentType !== undefined && { documentType }),
      ...(documentNum !== undefined && { documentNum }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(clientType && { clientType }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(creditEnabled !== undefined && { creditEnabled }),
      ...(creditDays !== undefined && { creditDays }),
      ...(creditMarkupPercent !== undefined && { creditMarkupPercent }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return client;
}

async function deleteClient(id) {
  await prisma.client.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Cliente eliminado exitosamente' };
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
