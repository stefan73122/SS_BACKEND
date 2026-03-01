const prisma = require('../prisma/client');

async function getAllRoles({ page = 1, limit = 10, search = '' }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.role.count({ where }),
  ]);

  return {
    roles,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getRoleById(id) {
  const role = await prisma.role.findUnique({
    where: { id: BigInt(id) },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      userRoles: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!role) {
    throw new Error('Rol no encontrado');
  }

  return role;
}

async function createRole({ name, description }) {
  const existing = await prisma.role.findUnique({
    where: { name },
  });

  if (existing) {
    throw new Error('Ya existe un rol con ese nombre');
  }

  const role = await prisma.role.create({
    data: {
      name,
      description,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return role;
}

async function updateRole(id, { name, description }) {
  const role = await prisma.role.findUnique({
    where: { id: BigInt(id) },
  });

  if (!role) {
    throw new Error('Rol no encontrado');
  }

  if (name && name !== role.name) {
    const existing = await prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      throw new Error('Ya existe un rol con ese nombre');
    }
  }

  const updated = await prisma.role.update({
    where: { id: BigInt(id) },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return updated;
}

async function deleteRole(id) {
  const role = await prisma.role.findUnique({
    where: { id: BigInt(id) },
    include: {
      userRoles: true,
    },
  });

  if (!role) {
    throw new Error('Rol no encontrado');
  }

  if (role.userRoles.length > 0) {
    throw new Error('No se puede eliminar un rol que tiene usuarios asignados');
  }

  await prisma.role.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Rol eliminado exitosamente' };
}

async function assignPermissionsToRole(roleId, permissionIds) {
  const role = await prisma.role.findUnique({
    where: { id: BigInt(roleId) },
  });

  if (!role) {
    throw new Error('Rol no encontrado');
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: BigInt(roleId) },
  });

  const rolePermissions = await Promise.all(
    permissionIds.map((permissionId) =>
      prisma.rolePermission.create({
        data: {
          roleId: BigInt(roleId),
          permissionId: BigInt(permissionId),
        },
        include: {
          permission: true,
        },
      })
    )
  );

  return rolePermissions;
}

async function removePermissionFromRole(roleId, permissionId) {
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId: BigInt(roleId),
      permissionId: BigInt(permissionId),
    },
  });

  if (!rolePermission) {
    throw new Error('El rol no tiene ese permiso asignado');
  }

  await prisma.rolePermission.delete({
    where: { id: rolePermission.id },
  });

  return { message: 'Permiso removido del rol exitosamente' };
}

async function assignRoleToUser(userId, roleId) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const role = await prisma.role.findUnique({
    where: { id: BigInt(roleId) },
  });

  if (!role) {
    throw new Error('Rol no encontrado');
  }

  const existing = await prisma.userRole.findFirst({
    where: {
      userId: BigInt(userId),
      roleId: BigInt(roleId),
    },
  });

  if (existing) {
    throw new Error('El usuario ya tiene ese rol asignado');
  }

  const userRole = await prisma.userRole.create({
    data: {
      userId: BigInt(userId),
      roleId: BigInt(roleId),
    },
    include: {
      role: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  return userRole;
}

async function removeRoleFromUser(userId, roleId) {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId: BigInt(userId),
      roleId: BigInt(roleId),
    },
  });

  if (!userRole) {
    throw new Error('El usuario no tiene ese rol asignado');
  }

  await prisma.userRole.delete({
    where: { id: userRole.id },
  });

  return { message: 'Rol removido del usuario exitosamente' };
}

async function getUserRoles(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId: BigInt(userId) },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return userRoles;
}

async function getUserPermissions(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId: BigInt(userId) },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissions = new Set();
  userRoles.forEach((userRole) => {
    userRole.role.rolePermissions.forEach((rp) => {
      permissions.add(JSON.stringify({
        id: rp.permission.id.toString(),
        code: rp.permission.code,
        description: rp.permission.description,
        module: rp.permission.module,
      }));
    });
  });

  return Array.from(permissions).map((p) => JSON.parse(p));
}

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  removePermissionFromRole,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserPermissions,
};
