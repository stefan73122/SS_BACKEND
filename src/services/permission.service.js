const prisma = require('../prisma/client');

async function getAllPermissions({ page = 1, limit = 10, search = '', module = null }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(module && { module }),
  };

  const [permissions, total] = await Promise.all([
    prisma.permission.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.permission.count({ where }),
  ]);

  return {
    permissions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getPermissionById(id) {
  const permission = await prisma.permission.findUnique({
    where: { id: BigInt(id) },
    include: {
      rolePermissions: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!permission) {
    throw new Error('Permiso no encontrado');
  }

  return permission;
}

async function createPermission({ code, description, module }) {
  const existing = await prisma.permission.findUnique({
    where: { code },
  });

  if (existing) {
    throw new Error('Ya existe un permiso con ese código');
  }

  const permission = await prisma.permission.create({
    data: {
      code,
      description,
      module,
    },
  });

  return permission;
}

async function updatePermission(id, { code, description, module }) {
  const permission = await prisma.permission.findUnique({
    where: { id: BigInt(id) },
  });

  if (!permission) {
    throw new Error('Permiso no encontrado');
  }

  if (code && code !== permission.code) {
    const existing = await prisma.permission.findUnique({
      where: { code },
    });

    if (existing) {
      throw new Error('Ya existe un permiso con ese código');
    }
  }

  const updated = await prisma.permission.update({
    where: { id: BigInt(id) },
    data: {
      ...(code && { code }),
      ...(description !== undefined && { description }),
      ...(module !== undefined && { module }),
    },
  });

  return updated;
}

async function deletePermission(id) {
  const permission = await prisma.permission.findUnique({
    where: { id: BigInt(id) },
    include: {
      rolePermissions: true,
    },
  });

  if (!permission) {
    throw new Error('Permiso no encontrado');
  }

  if (permission.rolePermissions.length > 0) {
    throw new Error('No se puede eliminar un permiso que está asignado a roles');
  }

  await prisma.permission.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Permiso eliminado exitosamente' };
}

async function getPermissionsByModule() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  });

  const grouped = permissions.reduce((acc, permission) => {
    const module = permission.module || 'Sin módulo';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {});

  return grouped;
}

async function createBulkPermissions(permissions) {
  const created = await Promise.all(
    permissions.map(async (perm) => {
      const existing = await prisma.permission.findUnique({
        where: { code: perm.code },
      });

      if (existing) {
        return existing;
      }

      return prisma.permission.create({
        data: {
          code: perm.code,
          description: perm.description,
          module: perm.module,
        },
      });
    })
  );

  return created;
}

module.exports = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionsByModule,
  createBulkPermissions,
};
