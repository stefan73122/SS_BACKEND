const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');

async function getAllUsers({ page = 1, limit = 10, search = '' }) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(search && {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return user;
}

async function createUser(data) {
  const { username, email, password, fullName, isActive = true, warehouseId } = data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new Error('Ya existe un usuario con ese nombre de usuario');
    }
    if (existingUser.email === email) {
      throw new Error('Ya existe un usuario con ese email');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: hashedPassword,
      fullName,
      isActive,
      ...(warehouseId && { warehouseId: BigInt(warehouseId) }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      isActive: true,
      warehouseId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

async function updateUser(id, data) {
  const { username, email, password, fullName, isActive, warehouseId } = data;

  const existingUser = await prisma.user.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingUser) {
    throw new Error('Usuario no encontrado');
  }

  if (username || email) {
    const conflictUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: BigInt(id) } },
          {
            OR: [
              ...(username ? [{ username }] : []),
              ...(email ? [{ email }] : []),
            ],
          },
        ],
      },
    });

    if (conflictUser) {
      if (conflictUser.username === username) {
        throw new Error('Ya existe un usuario con ese nombre de usuario');
      }
      if (conflictUser.email === email) {
        throw new Error('Ya existe un usuario con ese email');
      }
    }
  }

  const updateData = {
    ...(username && { username }),
    ...(email && { email }),
    ...(fullName !== undefined && { fullName }),
    ...(isActive !== undefined && { isActive }),
    ...(warehouseId !== undefined && { warehouseId: warehouseId ? BigInt(warehouseId) : null }),
  };

  // Si se proporciona una nueva contraseña, hashearla
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: BigInt(id) },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      isActive: true,
      warehouseId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

async function deleteUser(id) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(id) },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  await prisma.user.delete({
    where: { id: BigInt(id) },
  });

  return { message: 'Usuario eliminado exitosamente' };
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

  const existing = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: BigInt(userId),
        roleId: BigInt(roleId),
      },
    },
  });

  if (existing) {
    throw new Error('El usuario ya tiene este rol asignado');
  }

  await prisma.userRole.create({
    data: {
      userId: BigInt(userId),
      roleId: BigInt(roleId),
    },
  });

  return { message: 'Rol asignado exitosamente' };
}

async function removeRoleFromUser(userId, roleId) {
  const userRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: BigInt(userId),
        roleId: BigInt(roleId),
      },
    },
  });

  if (!userRole) {
    throw new Error('El usuario no tiene este rol asignado');
  }

  await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId: BigInt(userId),
        roleId: BigInt(roleId),
      },
    },
  });

  return { message: 'Rol removido exitosamente' };
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignRoleToUser,
  removeRoleFromUser,
};
